import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SEARCH_INDEX = path.join(ROOT, "search-index.json");
const ARTICLES_DIR = path.join(ROOT, "articles");
const DEFAULT_LIMIT = 30;

function argValue(name, fallback) {
  const arg = process.argv.find((item) => item.startsWith(`--${name}=`));
  return arg ? arg.slice(name.length + 3) : fallback;
}

function isGoodRelatedSignal(item) {
  return Boolean(
    item?.sharedTags?.length ||
      item?.sameCategory ||
      item?.sameTopic ||
      item?.familyOverlap
  );
}

function extractRelatedDiagnostics(html) {
  const match = html.match(/<script type="application\/json" class="related-diagnostics">([\s\S]*?)<\/script>/);
  if (!match) return [];
  try {
    return JSON.parse(match[1]);
  } catch {
    return [];
  }
}

async function main() {
  const limit = Number(argValue("limit", DEFAULT_LIMIT));
  const records = JSON.parse(await fs.readFile(SEARCH_INDEX, "utf8"));
  const latestLocalArticles = records
    .filter((item) => !item.external && item.fileName)
    .sort((a, b) => new Date(b.publishAt || b.date) - new Date(a.publishAt || a.date))
    .slice(0, limit);

  const results = [];
  for (const article of latestLocalArticles) {
    const filePath = path.join(ARTICLES_DIR, article.fileName);
    const html = await fs.readFile(filePath, "utf8");
    const diagnostics = extractRelatedDiagnostics(html);
    const relatedCount = diagnostics.length;
    const goodCount = diagnostics.filter(isGoodRelatedSignal).length;
    results.push({
      title: article.title,
      fileName: article.fileName,
      relatedCount,
      goodCount,
      pass: relatedCount >= 3 && goodCount >= 2
    });
  }

  const failed = results.filter((item) => !item.pass);
  const report = {
    checked_articles: results.length,
    passed_articles: results.length - failed.length,
    failed_articles: failed.length,
    status: failed.length ? "warning" : "ok",
    failed: failed.slice(0, 10)
  };

  console.log(JSON.stringify(report, null, 2));
  if (process.argv.includes("--strict") && failed.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
