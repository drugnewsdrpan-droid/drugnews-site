import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const BASE_URL = "https://drugnews.com.tw";
const SEARCH_INDEX = path.join(ROOT, "search-index.json");
const OUT = path.join(ROOT, "companies.html");
const SITEMAP = path.join(ROOT, "sitemap.xml");

const ENTITY_GROUPS = [
  {
    title: "台灣與亞洲生技公司",
    description: "台股、亞洲新藥與平台型公司，適合追蹤基本面、臨床里程碑與資本市場重估。",
    entities: [
      ["藥華藥 PharmaEssentia", ["藥華藥", "PharmaEssentia", "Besremi", "6446"]],
      ["生華科 Senhwa", ["生華科", "Senhwa", "CX-5461", "Pidnarulex"]],
      ["寶泰生醫 Protect Biotech", ["寶泰生醫", "Protect Biotech", "Protect", "寵物醫療"]],
      ["台康生技 EirGenix", ["台康生技", "EirGenix", "CDMO", "Herwenda"]],
      ["安宏生醫 AnHorn", ["安宏生醫", "AnHorn", "AnHorn Medicines"]],
      ["智新生物 Intellegene", ["智新生物", "Intellegene"]],
      ["圓祥生技 Forward Therapeutics", ["圓祥", "Forward Therapeutics", "信達", "Innovent"]]
    ]
  },
  {
    title: "全球大型藥廠",
    description: "大型藥廠併購、授權與管線重組，是判讀 BD、估值與產業資本流向的核心。",
    entities: [
      ["Eli Lilly 禮來", ["Eli Lilly", "Lilly", "禮來", "Mounjaro", "Zepbound", "tirzepatide", "Retatrutide"]],
      ["Novo Nordisk 諾和諾德", ["Novo Nordisk", "諾和諾德", "Ozempic", "Wegovy", "semaglutide"]],
      ["Merck 默沙東", ["Merck", "默沙東", "Keytruda", "MK-2010"]],
      ["GSK", ["GSK", "Nuvalent", "肺癌"]],
      ["Pfizer 輝瑞", ["Pfizer", "輝瑞", "Vepdegestrant"]],
      ["Johnson & Johnson 嬌生", ["Johnson", "J&J", "嬌生", "Stelara", "CAR-T"]],
      ["BMS 百時美施貴寶", ["BMS", "百時美", "Bristol", "恒瑞"]],
      ["Roche 羅氏", ["Roche", "羅氏"]],
      ["AstraZeneca 阿斯特捷利康", ["AstraZeneca", "阿斯特捷利康"]],
      ["Daiichi Sankyo 第一三共", ["Daiichi", "第一三共", "ADC"]]
    ]
  },
  {
    title: "熱門管線與投資主題",
    description: "投資人常用來查找文章的疾病、靶點、技術與估值框架。",
    entities: [
      ["GLP-1 / 肥胖藥", ["GLP-1", "肥胖", "減重", "減肥藥", "瘦瘦針", "tirzepatide", "semaglutide"]],
      ["RAS / 胰臟癌", ["RAS", "KRAS", "胰臟癌", "daraxonrasib", "PRMT5", "MAT2A"]],
      ["AI 製藥", ["AI", "人工智慧", "AI 製藥", "PROTAC", "foundation model"]],
      ["ADC", ["ADC", "抗體藥物複合體", "Daiichi"]],
      ["CAR-T / 細胞治療", ["CAR-T", "細胞治療", "自體免疫"]],
      ["BD 授權交易", ["BD", "授權", "upfront", "milestone", "royalty", "併購", "收購"]],
      ["生技估值", ["估值", "rNPV", "SOTP", "峰值銷售", "管線估值"]],
      ["FDA / CRL / 法規", ["FDA", "CRL", "PDUFA", "法規", "藥證"]]
    ]
  }
];

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function haystack(article) {
  return `${article.title || ""}\n${article.summary || ""}\n${(article.tags || []).join(" ")}\n${article.category || ""}`;
}

function articleUrl(article) {
  if (article.external) return article.url;
  return article.url || `articles/${article.fileName || ""}`;
}

function matchArticles(articles, aliases) {
  const regexes = aliases.map((alias) => {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const isShortAscii = /^[A-Za-z0-9+-]{1,4}$/.test(alias);
    return new RegExp(isShortAscii ? `(^|[^A-Za-z0-9])${escaped}([^A-Za-z0-9]|$)` : escaped, "i");
  });
  return articles
    .filter((article) => regexes.some((re) => re.test(haystack(article))))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(a.title).localeCompare(String(b.title), "zh-Hant"))
    .slice(0, 6);
}

function entityCard([name, aliases], articles) {
  const matched = matchArticles(articles, aliases);
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
