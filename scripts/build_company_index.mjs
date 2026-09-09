import fs from "node:fs/promises";
import path from "node:path";
import { ENTITY_GROUPS, matchCompanyArticles } from "./company_index_contract.mjs";

const ROOT = process.cwd();
const BASE_URL = "https://drugnews.com.tw";
const SEARCH_INDEX = path.join(ROOT, "search-index.json");
const OUT = path.join(ROOT, "companies.html");
const SITEMAP = path.join(ROOT, "sitemap.xml");



function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function articleUrl(article) {
  if (article.external) return article.url;
  return article.url || `articles/${article.fileName || ""}`;
}

function entityCard([name, aliases], articles) {
  const matched = matchCompanyArticles(articles, aliases);
  const links = matched.map((article) => {
    const href = articleUrl(article);
    const target = article.external ? ' target="_blank" rel="noopener"' : "";
    return `<a href="${escapeHtml(href)}"${target}><span>${escapeHtml(article.date || "")}</span>${escapeHtml(article.title)}</a>`;
  }).join("");
  const searchQuery = encodeURIComponent(aliases[0]);
  return `<article class="company-card">
    <div>
      <h3>${escapeHtml(name)}</h3>
      <p>${escapeHtml(aliases.slice(0, 5).join(" / "))}</p>
    </div>
    <div class="company-card-links">
      ${links || `<a href="articles/?q=${searchQuery}"><span>搜尋</span>查看相關文章</a>`}
    </div>
  </article>`;
}

function groupSection(group, articles) {
  const cards = group.entities.map((entity) => entityCard(entity, articles)).join("");
  return `<section class="section company-section">
    <div class="container">
      <div class="section-head split">
        <div>
          <p class="eyebrow">Entity Index</p>
          <h2>${escapeHtml(group.title)}</h2>
        </div>
        <p>${escapeHtml(group.description)}</p>
      </div>
      <div class="company-grid">${cards}</div>
    </div>
  </section>`;
}

function page(articles) {
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Drugnews 公司與管線索引",
    url: `${BASE_URL}/companies.html`,
    description: "依公司、藥物、靶點與投資主題整理 Drugnews 生技醫藥商業分析文章。",
    isPartOf: { "@type": "WebSite", name: "Drugnews｜藥時事", url: `${BASE_URL}/` }
  };
  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>公司與管線索引｜Drugnews 藥時事</title>
  <meta name="description" content="Drugnews 公司與管線索引，整理台灣生技、全球大型藥廠、GLP-1、RAS、ADC、CAR-T、BD 授權與生技估值文章。">
  <link rel="canonical" href="${BASE_URL}/companies.html">
  <link rel="icon" href="favicon.svg">
  <link rel="stylesheet" href="styles.css">
  <link rel="alternate" type="application/rss+xml" title="Drugnews RSS" href="${BASE_URL}/feed.xml">
  <link rel="search" type="application/opensearchdescription+xml" title="Drugnews Search" href="${BASE_URL}/opensearch.xml">
  <meta property="og:title" content="公司與管線索引｜Drugnews 藥時事">
  <meta property="og:description" content="用公司、藥物、靶點與投資主題回到 Drugnews 的生技醫藥商業分析。">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${BASE_URL}/companies.html">
  <meta property="og:site_name" content="Drugnews｜藥時事">
  <script type="application/ld+json">${JSON.stringify(collectionSchema)}</script>
</head>
<body>
<header class="site-header">
  <div class="container nav">
    <a class="brand" href="index.html"><img src="favicon.svg" alt=""><span>Drugnews｜藥時事</span></a>
    <input class="nav-toggle" type="checkbox" id="site-nav-toggle" aria-label="切換選單">
    <label class="nav-menu-button" for="site-nav-toggle">選單</label>
    <nav class="nav-links" aria-label="Main navigation">
      <a href="index.html">首頁</a>
      <a href="articles/">文章</a>
      <a href="subscribe.html">深度分析</a>
      <a href="search.html">搜尋</a>
      <a href="topics/">主題</a>
      <a href="guides/">指南</a>
      <a href="team.html">團隊</a>
      <a href="services.html">公司合作</a>
      <a href="en/index.html">English</a>
    </nav>
  </div>
</header>
<main>
  <section class="page-title insights-title">
    <div class="container">
      <p class="eyebrow">公司與管線索引</p>
      <h1>從公司、藥物與靶點回到商業判斷</h1>
      <p>這裡把 Drugnews 文章中的台灣生技、全球大型藥廠、熱門管線與投資主題整理成入口。讀者可以從公司名稱、藥名、靶點或交易主題，快速找到相關分析。</p>
    </div>
  </section>
  ${ENTITY_GROUPS.map((group) => groupSection(group, articles)).join("\n")}
</main>
<footer class="site-footer"><div class="container footer-grid"><div><strong>Drugnews｜藥時事</strong><p>生技醫藥商業分析文章媒體。</p></div><div><a href="about.html">關於 / 編輯標準</a><a href="articles/">文章</a><a href="companies.html">公司索引</a><a href="subscribe.html">深度分析</a><a href="services.html">公司合作</a></div></div></footer>
</body>
</html>`;
}

async function updateSitemap() {
  let sitemap = await fs.readFile(SITEMAP, "utf8").catch(() => "");
  if (!sitemap) return;
  const articles = JSON.parse(await fs.readFile(SEARCH_INDEX, "utf8"));
  const latest = articles.map((item) => item.date).filter(Boolean).sort().at(-1) || "";
  const entry = `  <url><loc>${BASE_URL}/companies.html</loc>${latest ? `<lastmod>${latest}</lastmod>` : ""}<priority>0.75</priority></url>`;
  if (sitemap.includes(`<loc>${BASE_URL}/companies.html</loc>`)) return;
  sitemap = sitemap.split("\n").filter((line) => !line.includes(`${BASE_URL}/companies.html`)).join("\n");
  const endIndex = sitemap.lastIndexOf("</urlset>");
  if (endIndex === -1) return;
  sitemap = `${sitemap.slice(0, endIndex).trimEnd()}\n${entry}\n${sitemap.slice(endIndex)}`;
  await fs.writeFile(SITEMAP, sitemap, "utf8");
}

const articles = JSON.parse(await fs.readFile(SEARCH_INDEX, "utf8"));
await fs.writeFile(OUT, page(articles), "utf8");
await updateSitemap();
console.log(`Built company index with ${articles.length} searchable records.`);
