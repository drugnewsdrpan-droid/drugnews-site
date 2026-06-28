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
  return {
    url: profile.url || "",
    articleCount: profile.articleCount ?? "unknown",
    anchorCount: profile.anchorCount ?? "unknown",
    links: Array.isArray(diagnostics?.links) ? diagnostics.links.length : 0,
    shell: /註冊 \/ 登入|下載 App/.test(profile.bodyPreview || "")
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

function nextAction(status, pm, fbCandidate, dcard) {
  if (Array.isArray(status?.imported_posts) && status.imported_posts.length) {
    return "檢查新文章頁、圖片、手機版、搜尋索引與 sitemap，確認後提交部署。";
  }
  if (status?.platform_state?.facebook === "already_current_limited_capture" && dcard?.shell) {
    return "FB 可見預覽已對上官網最新文章；Dcard 仍只回傳登入 / App 外殼。若 Dcard 今天有新文，需要已登入瀏覽器可讀到文章，或提供 Dcard 貼文網址 / 全文＋圖片。";
  }
  if (fbCandidate?.title) {
    return `FB 今天可見新文標題是「${fbCandidate.title}」，但目前只取得 ${fbCandidate.textLength} 字預覽。需要登入後完整貼文正文與圖片 URL，或請提供貼文全文＋圖片。`;
  }
  if (dcard?.shell) {
    return "Dcard 目前只回傳登入 / App 外殼，沒有文章連結。需要已登入瀏覽器可讀到文章，或提供 Dcard 貼文網址 / 全文＋圖片。";
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

  const report = `# Drugnews 每日官網更新暨首席體驗官檢查點

時間：${new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false })}
檢查節點：每完成 ${CHECKPOINT_HOURS} 小時工作量，暫停回傳給首席體驗官檢查

## 今日同步狀態

- 狀態：${status.status || pm.status || "unknown"}
- 新匯入文章：${imported.length ? imported.map((item) => item.title).join("、") : "0 篇"}
- 官網最新文章：${latest ? `${latest.date || ""}｜${latest.title || ""}` : "尚未取得"}
- 平台狀態：FB ${status.platform_state?.facebook || "unknown"}；Dcard ${status.platform_state?.dcard || "unknown"}

## 平台抓取診斷

- Facebook：${fbCandidate ? `可見候選「${fbCandidate.title}」，${fbCandidate.images} 張圖，正文只露出 ${fbCandidate.textLength} 字；原因：${fbCandidate.reasons.join(" / ")}` : "沒有可見長文候選"}
- Dcard：${dcard.url || "未解析頁面"}；文章 DOM：${dcard.articleCount}；可見連結：${dcard.links}；${dcard.shell ? "目前是登入 / App 外殼" : "未偵測到登入外殼"}

## 網站 QA

${warnings.length ? warnings.join("\n") : "- 全部 PM health checks 通過"}

## 首席體驗官檢查重點

${checkpointVerdict(status, pm)}

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
