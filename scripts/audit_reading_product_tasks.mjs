import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const strict = process.argv.includes("--strict");

async function read(relativePath) {
  return fs.readFile(path.join(ROOT, relativePath), "utf8");
}

function pass(name, detail) {
  return { name, status: "ok", detail };
}

function warn(name, detail) {
  return { name, status: "warning", detail };
}

function articleFilesFromSearchIndex(records, limit = 30) {
  return records
    .filter((item) => !item.external && item.fileName && item.lang !== "en")
    .sort((a, b) => new Date(b.publishAt || b.date) - new Date(a.publishAt || a.date))
    .slice(0, limit)
    .map((item) => item.fileName);
}

function firstParagraphBeforeFold(html) {
  const heroEnd = html.indexOf("</section>");
  const bodyStart = html.indexOf('<article class="article-body">');
  const firstParagraph = html.indexOf("<p>", bodyStart);
  const firstShare = html.indexOf('<div class="article-share"', bodyStart);
  return {
    hasBody: bodyStart > -1,
    shareAfterFirstParagraph: firstParagraph > -1 && firstShare > firstParagraph,
    heroBeforeBody: heroEnd > -1 && heroEnd < bodyStart
  };
}

function heroTagCount(html) {
  const heroStart = html.indexOf('<section class="article-hero">');
  const heroEnd = html.indexOf("</section>", heroStart);
  if (heroStart === -1 || heroEnd === -1) return 0;
  const hero = html.slice(heroStart, heroEnd);
  const tagRow = hero.match(/<div class="tag-row[^"]*">([\s\S]*?)<\/div>/);
  if (!tagRow) return 0;
  const firstLine = tagRow[1].split("<details")[0];
  return (firstLine.match(/<span class="tag">/g) || []).length;
}

async function main() {
  const [
    styles,
    searchJs,
    articlesIndex,
    topicIndex,
    searchIndexRaw
  ] = await Promise.all([
    read("styles.css"),
    read("search.js"),
    read("articles/index.html"),
    read("topics/index.html"),
    read("search-index.json")
  ]);
  const records = JSON.parse(searchIndexRaw);
  const checks = [];

  const mobileNavOk =
    /\.nav-toggle\s*~\s*\.nav-links\s*{\s*display:\s*none;/m.test(styles) &&
    /\.nav-toggle:checked\s*~\s*\.nav-links\s*{\s*display:\s*grid;/m.test(styles) &&
    /@media\s*\(max-width:\s*520px\)[\s\S]*?\.nav-menu-button\s*{[\s\S]*?position:\s*(?:static|absolute);[\s\S]*?font-size:\s*0\.86rem;/m.test(styles);
  checks.push(mobileNavOk
    ? pass("mobile_nav_collapsed", "手機導覽有選單按鈕，預設收合。")
    : warn("mobile_nav_collapsed", "手機導覽收合樣式可能遺失。"));

  const mobileArticleOk =
    /@media\s*\(max-width:\s*520px\)[\s\S]*?\.article-hero\s*{[\s\S]*?padding:\s*10px 0 8px;/m.test(styles) &&
    /@media\s*\(max-width:\s*520px\)[\s\S]*?\.article-deck\s*{[\s\S]*?-webkit-line-clamp:\s*1;/m.test(styles) &&
    /@media\s*\(max-width:\s*520px\)[\s\S]*?\.article-byline\s*{[\s\S]*?display:\s*none;/m.test(styles);
  checks.push(mobileArticleOk
    ? pass("mobile_article_first_screen", "手機文章標題區已壓縮，摘要一行、作者列隱藏。")
    : warn("mobile_article_first_screen", "手機文章首屏壓縮樣式可能遺失。"));

  const sampleArticleFiles = articleFilesFromSearchIndex(records);
  const articleHtml = await Promise.all(sampleArticleFiles.map((file) => read(`articles/${file}`)));
  const shareResults = articleHtml.map(firstParagraphBeforeFold);
  const sharePassCount = shareResults.filter((item) => item.hasBody && item.shareAfterFirstParagraph && item.heroBeforeBody).length;
  checks.push(sharePassCount === articleHtml.length
    ? pass("share_after_first_paragraph", `最新 ${articleHtml.length} 篇文章的分享框都在正文第一段後。`)
    : warn("share_after_first_paragraph", `最新 ${articleHtml.length} 篇中 ${articleHtml.length - sharePassCount} 篇分享框位置需要檢查。`));

  const tagCollapsePassCount = articleHtml.filter((html) => heroTagCount(html) <= 4).length;
  checks.push(tagCollapsePassCount === articleHtml.length
    ? pass("hero_tags_collapsed", `最新 ${articleHtml.length} 篇文章標籤首列未超過 4 個。`)
    : warn("hero_tags_collapsed", `最新 ${articleHtml.length} 篇中 ${articleHtml.length - tagCollapsePassCount} 篇標籤首列可能過長。`));

  const searchUiOk =
    articlesIndex.includes("data-search-status") &&
    articlesIndex.includes("data-search-clear") &&
    /搜尋「\$\{query\}」：直接相關 \$\{count\} 筆，延伸提及 \$\{mentionCount\} 筆/.test(searchJs) &&
    searchJs.includes("沒有直接相關結果") &&
    searchJs.includes("沒有延伸提及") &&
    searchJs.includes("沒有找到") &&
    ["BD", "GLP-1", "臨床數據", "估值"].every((term) => searchJs.includes(term));
  checks.push(searchUiOk
    ? pass("search_states", "搜尋結果數、清除按鈕、無結果熱門入口都有保留。")
    : warn("search_states", "搜尋狀態 UI 或無結果入口可能遺失。"));

  const topicFiles = [
    "topics/biotech-investing.html",
    "topics/biotech-valuation.html",
    "topics/bd-licensing.html",
    "topics/clinical-data.html",
    "topics/cmc.html",
    "topics/drug-development.html",
    "topics/big-pharma.html",
    "topics/glp1.html"
  ];
  const topicHtml = await Promise.all(topicFiles.map(read));
  const topicCuratedCount = topicHtml.filter((html) =>
    html.includes("先讀這 3 篇") &&
    html.includes("初階") &&
    html.includes("進階") &&
    (html.includes("最新") || html.includes("案例")) &&
    /篇相關文章/.test(html)
  ).length;
  checks.push(topicCuratedCount === topicHtml.length
    ? pass("topic_hubs_curated", `${topicHtml.length} 個主題頁都有起手式、閱讀路徑與真實篇數。`)
    : warn("topic_hubs_curated", `${topicHtml.length - topicCuratedCount} 個主題頁策展區需要檢查。`));

  const failed = checks.filter((item) => item.status !== "ok");
  const report = {
    status: failed.length ? "warning" : "ok",
    checked_at: new Date().toISOString(),
    checks,
    failed
  };

  console.log(JSON.stringify(report, null, 2));
  if (strict && failed.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
