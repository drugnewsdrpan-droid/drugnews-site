import fs from "node:fs";
import fsp from "node:fs/promises";

const STATUS_FILE = process.env.DRUGNEWS_DAILY_STATUS_FILE || "/private/tmp/drugnews-codex-daily-status.json";
const PM_FILE = process.env.DRUGNEWS_DAILY_PM_FILE || "/private/tmp/drugnews-codex-pm-health.json";
const FB_DIAGNOSTICS = "/private/tmp/drugnews-facebook-latest.json.diagnostics.json";
const DCARD_DIAGNOSTICS = "/private/tmp/drugnews-dcard-latest.json.diagnostics.json";
const SEARCH_INDEX = "search-index.json";
const REPORT_FILE = process.env.DRUGNEWS_DAILY_REPORT_FILE || "/private/tmp/drugnews-codex-daily-report.md";
const CHECKPOINT_HOURS = process.env.DRUGNEWS_CHECKPOINT_HOURS || "12";

async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await fsp.readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function firstFacebookCandidate(diagnostics) {
  const candidate = Array.isArray(diagnostics?.candidates) ? diagnostics.candidates[0] : null;
  if (!candidate) return null;
  return {
    title: candidate.title || "",
    url: candidate.url || "",
    preview: candidate.preview || "",
    textLength: candidate.text_length || 0,
    images: candidate.images || 0,
    reasons: candidate.reasons || []
  };
}

function dcardSummary(diagnostics) {
  const profile = diagnostics?.profile || {};
  const body = profile.bodyPreview || "";
  const humanVerification = /需要確認您的連線是安全|驗證請求是真實的人類|you have been blocked|unable to access dcard/i.test(body);
  const appShell = /註冊 \/ 登入|下載 App/.test(body);
  return {
    url: profile.url || "",
    articleCount: profile.articleCount ?? "unknown",
    anchorCount: profile.anchorCount ?? "unknown",
    links: Array.isArray(diagnostics?.links) ? diagnostics.links.length : 0,
    shell: humanVerification || appShell,
    humanVerification,
    appShell
  };
}

function latestFromSearchIndex(records = []) {
  return [...records]
    .filter((item) => item && !item.external && item.fileName && /^zh/i.test(item.lang || "zh"))
    .sort((a, b) => new Date(b.publishAt || b.date) - new Date(a.publishAt || a.date))[0] || null;
}

function warningLines(pm) {
  return (pm?.checks || [])
    .filter((check) => check.status !== "ok")
    .map((check) => `- ${check.name}: ${check.detail}`);
}

function pmCheck(pm, name) {
  return (pm?.checks || []).find((check) => check.name === name) || null;
}

function statusOk(pm, name) {
  return pmCheck(pm, name)?.status === "ok";
}

function cxoScorecard(status, pm) {
  const imported = Array.isArray(status?.imported_posts) ? status.imported_posts : [];
  const rows = [
    {
      label: "每日文章更新",
      weight: 20,
      ok: Boolean(imported.length) || statusOk(pm, "latest_article_recent"),
      note: imported.length ? `新匯入 ${imported.length} 篇` : pmCheck(pm, "latest_article_recent")?.detail || "最新文章狀態未知"
    },
    {
      label: "閱讀體驗",
      weight: 20,
      ok: statusOk(pm, "reader_related_latest_30") && statusOk(pm, "reading_product_tasks"),
      note: [pmCheck(pm, "reader_related_latest_30")?.detail, pmCheck(pm, "reading_product_tasks")?.detail].filter(Boolean).join("；")
    },
    {
      label: "搜尋與 AI 可讀性",
      weight: 20,
      ok: statusOk(pm, "sitemap_public_entrypoints") &&
        statusOk(pm, "article_collection_schema") &&
        statusOk(pm, "clean_article_topic_metadata_latest_30") &&
        statusOk(pm, "sitemap_ai_index") &&
        statusOk(pm, "llms_query_routing") &&
        statusOk(pm, "search_intents_exists") &&
        statusOk(pm, "indexnow_ready") &&
        statusOk(pm, "news_media_organization_schema"),
      note: [pmCheck(pm, "sitemap_public_entrypoints")?.detail, pmCheck(pm, "article_collection_schema")?.detail, pmCheck(pm, "llms_query_routing")?.detail, pmCheck(pm, "search_intents_exists")?.detail, pmCheck(pm, "indexnow_ready")?.detail, pmCheck(pm, "clean_article_topic_metadata_latest_30")?.detail, pmCheck(pm, "news_media_organization_schema")?.detail].filter(Boolean).join("；")
    },
    {
      label: "成長追蹤",
      weight: 15,
      ok: statusOk(pm, "ga4_configured") && statusOk(pm, "search_console_configured"),
      note: [pmCheck(pm, "analytics_business_events_ready")?.detail, pmCheck(pm, "ga4_configured")?.detail, pmCheck(pm, "search_console_configured")?.detail].filter(Boolean).join("；")
    },
    {
      label: "商業轉換",
      weight: 10,
      ok: statusOk(pm, "paid_offer_catalog_zh") && statusOk(pm, "paid_offer_catalog_en"),
      note: [pmCheck(pm, "paid_offer_catalog_zh")?.detail, pmCheck(pm, "paid_offer_catalog_en")?.detail].filter(Boolean).join("；")
    },
    {
      label: "社群自動抓取",
      weight: 15,
      ok: statusOk(pm, "facebook_capture_ready") && statusOk(pm, "dcard_capture_ready"),
      note: [pmCheck(pm, "facebook_capture_ready")?.detail, pmCheck(pm, "dcard_capture_ready")?.detail].filter(Boolean).join("；")
    }
  ];
  const score = rows.reduce((sum, row) => sum + (row.ok ? row.weight : 0), 0);
  const deductions = rows.filter((row) => !row.ok).map((row) => `- ${row.label}：-${row.weight}｜${row.note || "尚未通過"}`);
  return { score, rows, deductions };
}

function nextAction(status, pm, fbCandidate, dcard) {
  if (Array.isArray(status?.imported_posts) && status.imported_posts.length) {
    return "檢查新文章頁、圖片、手機版、搜尋索引與 sitemap，確認後提交部署。";
  }
  if (status?.platform_state?.facebook === "already_current_limited_capture" && dcard?.shell) {
    if (dcard.humanVerification) {
      return "FB 可見預覽已對上官網最新文章；Dcard 目前要求真人安全驗證，沒有文章 DOM。請在社群擷取 Chrome 完成人工驗證後重跑每日檢查，或直接提供 Dcard 貼文網址 / 全文＋圖片。";
    }
    return "FB 可見預覽已對上官網最新文章；Dcard 作者頁目前只回傳登入 / App 外殼，沒有單篇文章連結。若 Dcard 今天有新文，請在社群擷取 Chrome 直接打開最新 Dcard 單篇貼文；每日流程會自動偵測該分頁，也可執行：/bin/zsh scripts/codex_daily_start.sh --dcard-current。";
  }
  if (fbCandidate?.title) {
    return `FB 今天可見新文標題是「${fbCandidate.title}」，但目前只取得 ${fbCandidate.textLength} 字預覽。需要登入後完整貼文正文與圖片 URL，或請提供貼文全文＋圖片。`;
  }
  if (dcard?.shell) {
    if (dcard.humanVerification) {
      return "Dcard 目前要求真人安全驗證，沒有文章 DOM。請在社群擷取 Chrome 完成人工驗證後重跑每日檢查，或提供 Dcard 貼文網址 / 全文＋圖片。";
    }
    return "Dcard 目前只回傳登入 / App 外殼，沒有文章連結。請在社群擷取 Chrome 直接打開最新 Dcard 單篇貼文；每日流程會自動偵測該分頁，也可執行：/bin/zsh scripts/codex_daily_start.sh --dcard-current；或提供貼文全文＋圖片。";
  }
  return pm?.next_actions?.[0] || status?.next_step || "若今天有新文，請提供最新貼文網址或全文＋圖片。";
}

function checkpointVerdict(status, pm) {
  const imported = Array.isArray(status?.imported_posts) ? status.imported_posts : [];
  const blockingWarnings = (pm?.checks || []).filter((check) =>
    check.status !== "ok" &&
    /capture|ga4|search_console/i.test(check.name || "")
  );
  if (imported.length) {
    return "本輪有新文章匯入，請首席體驗官優先檢查：正文分段、圖片位置、首頁頭版、英文版與手機首屏。";
  }
  if (blockingWarnings.length) {
    return "本輪網站核心閱讀體驗通過，但社群抓文或成長追蹤仍有阻塞；請確認是否提供登入頁面、貼文全文 / 圖片，或 GA4 / Search Console token。";
  }
  return "本輪沒有新文章需要匯入，網站健康狀態可交付檢查；下一步聚焦內容成長、搜尋曝光與下一篇文章同步。";
}

async function main() {
  const status = await readJson(STATUS_FILE, {});
  const pm = await readJson(PM_FILE, {});
  const fbDiagnostics = await readJson(FB_DIAGNOSTICS, {});
  const dcardDiagnostics = await readJson(DCARD_DIAGNOSTICS, {});
  const searchIndex = await readJson(SEARCH_INDEX, []);
  const fbCandidate = firstFacebookCandidate(fbDiagnostics);
  const dcard = dcardSummary(dcardDiagnostics);
  const imported = Array.isArray(status.imported_posts) ? status.imported_posts : [];
  const latest = latestFromSearchIndex(searchIndex) || pm.latest_article || status.latest_site_article || null;
  const warnings = warningLines(pm);
  const scorecard = cxoScorecard(status, pm);
  const platformState = pm?.social_status?.platform_state || status.platform_state || {};
  const reportStatus = pm?.social_status?.status || status.status || pm.status || "unknown";

  const report = `# Drugnews 每日官網更新暨首席體驗官檢查點

時間：${new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false })}
檢查節點：每完成 ${CHECKPOINT_HOURS} 小時工作量，暫停回傳給首席體驗官檢查

## 建議評分

- 建議分數：${scorecard.score} / 100
- 評分構成：
${scorecard.rows.map((row) => `  - ${row.ok ? "通過" : "待補"}｜${row.label}（${row.weight} 分）：${row.note || "無補充"}`).join("\n")}
${scorecard.deductions.length ? `\n扣分原因：\n${scorecard.deductions.join("\n")}` : "\n扣分原因：無"}

## 今日同步狀態

- 狀態：${reportStatus}
- 新匯入文章：${imported.length ? imported.map((item) => item.title).join("、") : "0 篇"}
- 官網最新文章：${latest ? `${latest.date || ""}｜${latest.title || ""}` : "尚未取得"}
- 平台狀態：FB ${platformState.facebook || "unknown"}；Dcard ${platformState.dcard || "unknown"}

## 平台抓取診斷

- Facebook：${fbCandidate ? `可見候選「${fbCandidate.title}」，${fbCandidate.images} 張圖，正文只露出 ${fbCandidate.textLength} 字；原因：${fbCandidate.reasons.join(" / ")}` : "沒有可見長文候選"}
- Dcard：${dcard.url || "未解析頁面"}；文章 DOM：${dcard.articleCount}；可見連結：${dcard.links}；${dcard.humanVerification ? "目前要求真人安全驗證" : dcard.appShell ? "目前是登入 / App 外殼" : "未偵測到登入外殼"}

## 網站 QA

${warnings.length ? warnings.join("\n") : "- 全部 PM health checks 通過"}

## 首席體驗官檢查重點

${checkpointVerdict(status, pm)}

請首席體驗官抽查三件事：
1. 首頁頭版是否是今天最值得讀者點進去的免費文章。
2. 手機版文章首屏是否能快速看到正文，而不是被導覽與雜訊推太下面。
3. 文章是否清楚導向方格子付費專欄、Facebook / Dcard 追蹤與公司合作頁。

## 下一步

${nextAction(status, pm, fbCandidate, dcard)}
`;

  await fsp.writeFile(REPORT_FILE, report, "utf8");
  console.log(report);
  console.log(`Daily human report: ${REPORT_FILE}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
