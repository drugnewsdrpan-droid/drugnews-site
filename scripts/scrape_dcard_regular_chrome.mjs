import fs from "node:fs/promises";
import { spawnSync } from "node:child_process";

const mode = process.argv[2] || "current";
const out = process.argv[3] || "/private/tmp/drugnews-dcard-latest.json";

async function executeChromeJs(jsCode) {
  const jsFile = `/private/tmp/drugnews-dcard-regular-${process.pid}.js`;
  await fs.writeFile(jsFile, jsCode, "utf8");
  const command = [
    "/usr/bin/osascript",
    "-e 'on run argv'",
    "-e 'set jsPath to item 1 of argv'",
    "-e 'set jsCode to do shell script \"cat \" & quoted form of jsPath'",
    "-e 'tell application \"Google Chrome\" to execute active tab of front window javascript jsCode'",
    "-e 'end run'",
    "--",
    jsFile
  ].join(" ");
  const result = spawnSync("/bin/zsh", ["-lc", command], { encoding: "utf8", maxBuffer: 1024 * 1024 * 8 });

  try {
    if (result.status !== 0) {
      const detail = String(result.stderr || result.stdout || "").trim();
      const disabled = /AppleScript.*JavaScript|執行 JavaScript 的功能已關閉|Apple 事件的 JavaScript|Allow JavaScript from Apple Events|功能已關閉/i.test(detail);
      throw new Error(disabled
        ? `Regular Chrome cannot be read because "Allow JavaScript from Apple Events" is disabled. Enable it once in Chrome: View / 顯示方式 -> Developer / 開發人員選項 -> Allow JavaScript from Apple Events / 允許 Apple 事件的 JavaScript. If the item is disabled, use the social-capture Chrome fallback or provide the full post text plus images.\n${detail}`
        : `Regular Chrome Dcard scrape failed.\n${detail}`);
    }
    return String(result.stdout || "").trim();
  } finally {
    await fs.unlink(jsFile).catch(() => {});
  }
}

function normalizeTitle(title = "") {
  return String(title)
    .replace(/\s*-\s*藥時事 Drugnews \(@drugnews\).*$/u, "")
    .replace(/\s*\|\s*Dcard.*$/u, "")
    .trim();
}

function postId(url = "") {
  return String(url).match(/\/(?:post|p)\/(\d+)/)?.[1] || "";
}

function parsePublished(text = "") {
  const value = String(text);
  const now = new Date();
  const year = now.getFullYear();
  const exact = value.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日\s*(\d{1,2}):(\d{2})/);
  if (exact) {
    const [, month, day, hour, minute] = exact;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.padStart(2, "0")}:${minute}:00+08:00`;
  }
  const daysAgo = value.match(/(\d+)\s*天/);
  if (daysAgo) {
    const date = new Date(now.getTime() - Number(daysAgo[1]) * 24 * 60 * 60 * 1000);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T10:30:00+08:00`;
  }
  return new Date().toISOString();
}

function upgradeImage(url = "") {
  return String(url).replace(/\/160\.(webp|jpe?g|png)(\?.*)?$/i, "/1280.$1");
}

function uniq(values) {
  return [...new Set(values.filter(Boolean))];
}

function isImportablePost(post) {
  return Boolean(postId(post?.url || "") && String(post?.articleText || "").length >= 300);
}

if (mode !== "current") {
  console.error("Usage: node scripts/scrape_dcard_regular_chrome.mjs current [/private/tmp/drugnews-dcard-latest.json]");
  process.exit(2);
}

const js = `(() => {
  const articleNodes = [...document.querySelectorAll('article')]
    .sort((a, b) => (b.innerText || '').length - (a.innerText || '').length);
  const main = document.querySelector('main') || document.body;
  const article = articleNodes[0] || main;
  const title = (article.querySelector('h1')?.innerText || document.title || '').trim();
  const images = [...article.querySelectorAll('img')]
    .map((img) => {
      const rect = img.getBoundingClientRect();
      return {
        src: img.currentSrc || img.src || '',
        alt: img.alt || '',
        width: img.naturalWidth || rect.width || 0,
        height: img.naturalHeight || rect.height || 0,
        boxWidth: rect.width || 0,
        boxHeight: rect.height || 0
      };
    })
    .filter((img) => /megapx-assets\\.dcard\\.tw/.test(img.src))
    .filter((img) => img.boxWidth > 160 || img.width > 240)
    .map((img) => img.src);
  return JSON.stringify({
    title,
    url: location.href.split('?')[0],
    pageTitle: document.title,
    articleText: article.innerText || '',
    images
  });
})()`;

let raw;
try {
  raw = JSON.parse(await executeChromeJs(js));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const post = {
  title: normalizeTitle(raw.title),
  published: parsePublished(raw.articleText),
  url: raw.url,
  articleText: raw.articleText,
  images: uniq((raw.images || []).map(upgradeImage))
};

const posts = isImportablePost(post) ? [post] : [];
const diagnostics = {
  generated_at: new Date().toISOString(),
  source: "regular Chrome Dcard current tab",
  selected_url: post?.url || "",
  page_title: raw.pageTitle || "",
  text_length: String(post.articleText || "").length,
  image_count: post.images.length,
  rejected_reason: posts.length ? "" : "Current regular Chrome Dcard tab is not a readable single post, the post URL has no post id, or the post body is too short."
};

await fs.writeFile(out, `${JSON.stringify(posts, null, 2)}\n`, "utf8");
await fs.writeFile(`${out}.diagnostics.json`, `${JSON.stringify(diagnostics, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  out,
  diagnostics: `${out}.diagnostics.json`,
  importable_posts: posts.length,
  selected: posts.map((item) => ({
    title: item.title,
    url: item.url,
    published: item.published,
    images: item.images.length,
    text_length: item.articleText.length
  })),
  rejected_reason: diagnostics.rejected_reason
}, null, 2));
