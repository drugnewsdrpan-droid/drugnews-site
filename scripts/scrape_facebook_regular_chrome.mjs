import fs from "node:fs/promises";
import { spawnSync } from "node:child_process";

const mode = process.argv[2] || "current";
const out = process.argv[3] || "/private/tmp/drugnews-facebook-latest.json";

function executeChromeJs(jsCode) {
  const run = (target) => spawnSync("/usr/bin/osascript", [
    "-e", "on run argv",
    "-e", "set jsCode to item 1 of argv",
    "-e", `tell application ${target} to execute active tab of front window javascript jsCode`,
    "-e", "end run",
    jsCode
  ], { encoding: "utf8", maxBuffer: 1024 * 1024 * 8 });

  let result = run('id "com.google.Chrome"');
  if (result.status !== 0 && /無法取得|Can’t get|Can't get|application id/i.test(String(result.stderr || result.stdout || ""))) {
    result = run('"Google Chrome"');
  }

  if (result.status !== 0) {
    const detail = String(result.stderr || result.stdout || "").trim();
    const disabled = /AppleScript.*JavaScript|執行 JavaScript 的功能已關閉|Apple 事件的 JavaScript|Allow JavaScript from Apple Events|功能已關閉/i.test(detail);
    throw new Error(disabled
      ? `Regular Chrome cannot be read because "Allow JavaScript from Apple Events" is disabled. Enable it once in Chrome: View -> Developer -> Allow JavaScript from Apple Events.\n${detail}`
      : `Regular Chrome scrape failed.\n${detail}`);
  }
  return String(result.stdout || "").trim();
}

function lineClean(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\u00a0/g, " ").trim())
    .filter(Boolean)
    .filter((line) => !/^[A-Za-z0-9]$/.test(line))
    .filter((line) => !/^[-–—]{5,}$/.test(line))
    .filter((line) => !/^(讚|留言|分享|傳送|追蹤|通知|管理粉絲專頁|專業主控板|刊登廣告|查看洞察報告)$/.test(line));
}

function plausibleTitle(lines) {
  const skipped = /^(藥時事|Facebook|分享對象|顯示較少|查看更多|今天|昨天|\d+\s*(分鐘|小時)|\d+\s*月\s*\d+\s*日)/;
  return lines.find((line) =>
    line.length >= 12 &&
    line.length <= 90 &&
    !skipped.test(line) &&
    !/^[-–—]{5,}$/.test(line) &&
    !/^https?:\/\//.test(line) &&
    !/^(DRUGNEWS\.COM\.TW|CMY\.TW|VOCUS\.CC)/i.test(line)
  ) || "";
}

function postScore(candidate) {
  const text = candidate.articleText || "";
  let score = 0;
  const reasons = [];
  if (/permalink\.php\?story_fbid=|\/posts\//.test(candidate.url)) {
    score += 3;
    reasons.push("permalink");
  }
  if (text.length > 900) {
    score += 3;
    reasons.push("long_text");
  }
  if (/【\d{1,2}[｜|]|##|臨床|FDA|BD|授權|估值|Biotech|生技|藥廠|臨床數據/.test(text)) {
    score += 3;
    reasons.push("analysis_terms");
  }
  if ((candidate.images || []).length) {
    score += 1;
    reasons.push("images");
  }
  if (text.length < 600 || /查看更多/.test(text)) {
    score -= 4;
    reasons.push("truncated_or_short");
  }
  if (/報名|早鳥|課程|獲利班|立即報名|cmy\.tw|官網終於上線|DRUGNEWS\.COM\.TW/i.test(text)) {
    score -= 6;
    reasons.push("promo_or_announcement");
  }
  if (/未讀|notif_id=|comment_id=|reply_comment_id=/.test(candidate.url + text.slice(0, 160))) {
    score -= 5;
    reasons.push("notification_or_comment");
  }
  return { score, reasons };
}

function normalizeCandidate(raw) {
  const lines = lineClean(raw.articleText);
  const title = plausibleTitle(lines) || raw.title || "Drugnews Facebook post";
  const articleText = lines.join("\n");
  const scored = postScore({ ...raw, title, articleText });
  return {
    title,
    slug: raw.slug || "",
    published: raw.published || new Date().toISOString(),
    url: raw.url,
    articleText,
    images: raw.images || [],
    cover_image: "",
    cover_image_alt: `${title} 專題封面`,
    score: scored.score,
    reasons: scored.reasons
  };
}

function isImportableCurrentPost(post) {
  const url = String(post?.url || "");
  const text = String(post?.articleText || "");
  return Boolean(text.length >= 600 && /facebook\.com/.test(url) && /permalink\.php|story_fbid=|\/posts\//.test(url));
}

if (mode !== "current") {
  console.error("Usage: node scripts/scrape_facebook_regular_chrome.mjs current [/private/tmp/drugnews-facebook-latest.json]");
  process.exit(2);
}

const js = `(() => {
  const cleanUrl = (url) => String(url || '').split('&__cft__')[0].split('&__tn__')[0];
  const uniq = (arr) => [...new Set(arr.filter(Boolean))];
  const main = document.querySelector('[role="main"]') || document.body;
  const articles = [...main.querySelectorAll('[role="article"], article')];
  const candidates = articles.length ? articles : [...main.querySelectorAll('div')].filter((node) => {
    const text = node.innerText || '';
    return text.length > 600 && text.length < 30000;
  });
  const best = candidates.sort((a, b) => (b.innerText || '').length - (a.innerText || '').length)[0] || main;
  const links = [...best.querySelectorAll('a[href]')].map((a) => a.href);
  const permalink = links.find((href) => /permalink\\.php\\?story_fbid=|\\/posts\\//.test(href) && !/notif_id=|comment_id=|reply_comment_id=/.test(href)) || location.href;
  const images = uniq([...best.querySelectorAll('img')].map((img) => img.currentSrc || img.src || '').filter((src) =>
    /scontent|fbcdn|xx\\.fbcdn/.test(src) &&
    !/emoji|static|safe_image|profile|p40x40|s40x40/.test(src)
  ));
  return JSON.stringify({
    url: cleanUrl(permalink),
    pageUrl: location.href,
    title: document.title,
    published: '',
    articleText: best.innerText || '',
    images
  });
})()`;

let raw;
try {
  raw = JSON.parse(executeChromeJs(js));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const post = normalizeCandidate(raw);
const data = {
  generated_at: new Date().toISOString(),
  source: "regular Chrome Facebook current tab",
  selected_url: post.url || "",
  selected: isImportableCurrentPost(post) ? [post] : [],
  candidates: [{
    title: post.title,
    url: post.url,
    page_url: raw.pageUrl || "",
    score: post.score,
    reasons: post.reasons,
    text_length: String(post.articleText || "").length,
    images: post.images?.length || 0,
    preview: String(post.articleText || "").slice(0, 220)
  }],
  rejected_reason: isImportableCurrentPost(post) ? "" : "Current regular Chrome Facebook tab is not a readable single post, the post body is too short, or Chrome is on a dashboard/profile page without a usable permalink."
};

await fs.writeFile(out, `${JSON.stringify(data.selected, null, 2)}\n`, "utf8");
await fs.writeFile(`${out}.diagnostics.json`, `${JSON.stringify(data, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  out,
  diagnostics: `${out}.diagnostics.json`,
  importable_posts: data.selected.length,
  selected: data.selected.map((item) => ({ title: item.title, url: item.url, score: item.score, images: item.images.length })),
  rejected_reason: data.rejected_reason
}, null, 2));
