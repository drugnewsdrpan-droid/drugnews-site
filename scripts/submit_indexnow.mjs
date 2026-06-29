import fsp from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const BASE_URL = "https://drugnews.com.tw";
const HOST = "drugnews.com.tw";
const KEY_PATH = path.join(ROOT, "indexnow-key.txt");
const DEFAULT_BRIEF = process.env.DRUGNEWS_GROWTH_BRIEF_JSON || "/private/tmp/drugnews-growth-brief.json";
const ENDPOINT = process.env.INDEXNOW_ENDPOINT || "https://api.indexnow.org/indexnow";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run") || process.env.INDEXNOW_DRY_RUN === "1";
const briefPath = args.find((arg) => arg.startsWith("--brief="))?.slice("--brief=".length) || DEFAULT_BRIEF;
const explicitUrls = args
  .filter((arg) => arg.startsWith("--url="))
  .map((arg) => arg.slice("--url=".length));

async function readText(filePath, fallback = "") {
  try {
    return await fsp.readFile(filePath, "utf8");
  } catch {
    return fallback;
  }
}

async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await fsp.readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function normalizeUrl(value = "") {
  const url = String(value || "").trim();
  if (!url) return "";
  if (url.startsWith("/")) return `${BASE_URL}${url}`;
  return url;
}

function uniqueDrugnewsUrls(values = []) {
  return [...new Set(values.map(normalizeUrl))]
    .filter((url) => /^https:\/\/drugnews\.com\.tw\//i.test(url))
    .slice(0, 10000);
}

async function urlsFromBrief(filePath) {
  const brief = await readJson(filePath, {});
  const urls = [
    ...(Array.isArray(brief.search_submission_urls) ? brief.search_submission_urls : []),
    brief.latest_article?.url
  ];
  return uniqueDrugnewsUrls(urls);
}

async function main() {
  const key = (await readText(KEY_PATH)).trim();
  if (!key) throw new Error(`Missing IndexNow key file: ${path.relative(ROOT, KEY_PATH)}`);

  const urlList = uniqueDrugnewsUrls(explicitUrls.length ? explicitUrls : await urlsFromBrief(briefPath));
  if (!urlList.length) throw new Error("No drugnews.com.tw URLs found for IndexNow submission.");

  const payload = {
    host: HOST,
    key,
    keyLocation: `${BASE_URL}/indexnow-key.txt`,
    urlList
  };

  if (dryRun) {
    console.log(JSON.stringify({
      status: "dry_run",
      endpoint: ENDPOINT,
      url_count: urlList.length,
      payload
    }, null, 2));
    return;
  }

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload)
  });
  const body = await response.text();
  console.log(JSON.stringify({
    status: response.ok ? "submitted" : "failed",
    endpoint: ENDPOINT,
    http_status: response.status,
    url_count: urlList.length,
    response: body.trim()
  }, null, 2));
  if (!response.ok && response.status !== 202) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
