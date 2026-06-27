import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SEARCH_INDEX = path.join(ROOT, "search-index.json");
const DEFAULT_LIMIT = 30;
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.slice("--limit=".length)) : DEFAULT_LIMIT;
const strict = process.argv.includes("--strict");

const TRUNCATED_URL = /https?:\/\/[^\s<>"')\]]*(?:\.{3,}|……)[^\s<>"')\]]*/i;
const REFERENCE_HEADING = /(參考資料|References?|資料來源)/i;

function stripHtml(value = "") {
  return String(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function linesWithTruncatedUrls(html = "") {
  return String(html)
    .split("\n")
    .map((line, index) => ({ line: index + 1, text: stripHtml(line) }))
    .filter((item) => TRUNCATED_URL.test(item.text));
}

function hasReferenceSectionNear(html = "", lineNumber = 0) {
  const lines = String(html).split("\n");
  const start = Math.max(0, lineNumber - 24);
  const slice = lines.slice(start, lineNumber).join("\n");
  return REFERENCE_HEADING.test(slice);
}

const records = JSON.parse(await fs.readFile(SEARCH_INDEX, "utf8"))
  .filter((item) => item.lang !== "en" && !item.external && item.url)
  .sort((a, b) => new Date(b.publishAt || b.date) - new Date(a.publishAt || a.date))
  .slice(0, Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_LIMIT);

const findings = [];

for (const record of records) {
  const articlePath = path.join(ROOT, record.url);
  let html;
  try {
    html = await fs.readFile(articlePath, "utf8");
  } catch {
    continue;
  }
  const hits = linesWithTruncatedUrls(html);
  if (!hits.length) continue;
  findings.push({
    title: record.title,
    date: record.date,
    url: record.url,
    likely_reference_issue: hits.some((hit) => hasReferenceSectionNear(html, hit.line)),
    hits: hits.map((hit) => ({
      line: hit.line,
      text: hit.text.slice(0, 240)
    }))
  });
}

const output = {
  checked_articles: records.length,
  truncated_url_articles: findings.length,
  findings
};

console.log(JSON.stringify(output, null, 2));

if (strict && findings.length) {
  process.exitCode = 1;
}
