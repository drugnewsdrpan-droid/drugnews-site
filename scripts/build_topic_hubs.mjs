import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const BASE_URL = "https://drugnews.com.tw";
const SEARCH_INDEX_PATH = path.join(ROOT, "search-index.json");
const TOPICS_DIR = path.join(ROOT, "topics");
const SITEMAP_PATH = path.join(ROOT, "sitemap.xml");

const topics = [
  {
    slug: "biotech-investing",
    title: "生技投資",
    eyebrow: "熱門搜尋主題",
    description:
      "生技投資不能只看題材，而要把臨床證據、法規節點、現金水位、授權交易與資本市場定價放在同一張地圖上判斷。",
    keywords: ["生技投資", "投資", "資本市場", "估值", "現金", "市值", "股價", "商業判斷"],
    terms: ["臨床證據", "現金水位", "授權交易", "資本市場定價"]
  },
  {
    slug: "biotech-valuation",
    title: "生技估值",
    eyebrow: "估值框架",
    description:
      "從 rNPV、SOTP、管線價值、峰值銷售與臨床成功率出發，拆解一家生技公司究竟是在重估價值，還是只是在重複敘事。",
    keywords: ["估值", "rNPV", "SOTP", "峰值銷售", "市值", "價值", "重估", "管線"],
    terms: ["rNPV", "SOTP", "峰值銷售", "成功率"]
  },
  {
    slug: "bd-licensing",
    title: "BD 授權",
    eyebrow: "交易與授權",
    description:
      "BD 授權不是只看 headline value，而要拆成 upfront、milestone、royalty、option、區域權利與資料包完整性。",
    keywords: ["BD", "授權", "交易", "upfront", "milestone", "royalty", "併購", "合作", "license"],
    terms: ["upfront", "milestone", "royalty", "併購"]
  },
  {
    slug: "clinical-data",
    title: "臨床數據",
    eyebrow: "臨床判讀",
    description:
      "臨床數據要看 endpoint、族群、對照組、安全性與統計意義；投資判斷更要問數據能否改變醫師使用與商業化位置。",
    keywords: ["臨床", "數據", "endpoint", "PFS", "OS", "ORR", "Phase", "試驗", "安全性"],
    terms: ["ORR", "PFS", "OS", "安全性"]
  },
  {
    slug: "cmc",
    title: "CMC 與製造風險",
    eyebrow: "製程與上市",
    description:
      "CMC 決定產品能不能穩定生產、放大、通過審查與真正上市；它常常不是最吸睛，卻會決定商業化能否落地。",
    keywords: ["CMC", "製造", "產能", "CDMO", "製程", "放大", "品質", "供應鏈"],
    terms: ["製程放大", "CDMO", "品質系統", "供應鏈"]
  },
  {
    slug: "drug-development",
    title: "新藥開發",
    eyebrow: "研發策略",
    description:
      "新藥開發的核心不只是找到靶點，而是判斷機制、適應症、臨床路徑、競爭者與商業化窗口能否互相對齊。",
    keywords: ["新藥", "研發", "藥物開發", "靶點", "管線", "適應症", "Phase", "AI 製藥"],
    terms: ["靶點選擇", "適應症策略", "臨床路徑", "競爭格局"]
  },
  {
    slug: "big-pharma",
    title: "製藥巨頭",
    eyebrow: "全球藥廠策略",
    description:
      "大型藥廠的併購、專利懸崖、管線取捨與平台布局，往往是判斷全球生技產業資本流向的關鍵線索。",
    keywords: ["製藥巨頭", "大型藥廠", "Big Pharma", "Lilly", "Novo", "Merck", "GSK", "BMS", "Pfizer", "併購"],
    terms: ["專利懸崖", "併購", "管線取捨", "全球競爭"]
  },
  {
    slug: "glp1",
    title: "GLP-1 與代謝藥物",
    eyebrow: "代謝市場",
    description:
      "GLP-1 已經從降血糖與減重延伸到心腎代謝、口服化、多靶點與長期管理，是未來十年最重要的藥物市場之一。",
    keywords: ["GLP-1", "減重", "肥胖", "代謝", "tirzepatide", "semaglutide", "retatrutide", "Novo", "Lilly"],
    terms: ["減重藥", "代謝疾病", "口服 GLP-1", "多靶點"]
  }
];

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const stripHtml = (value = "") => String(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const cleanImage = (image = "") => {
  if (!image) return "";
  return image.replace(/^\.\.\//, "");
};

const articleUrl = (article) => {
  const url = article.url || `articles/${article.fileName || ""}`;
  if (/^https?:\/\//.test(url)) return url;
  return `../${url.replace(/^\.\.\//, "")}`;
};

const articleAbsUrl = (article) => {
  const url = article.url || `articles/${article.fileName || ""}`;
  if (/^https?:\/\//.test(url)) return url;
  return `${BASE_URL}/${url.replace(/^\.\.\//, "").replace(/^\//, "")}`;
};

const readable = (value = "") => stripHtml(value).slice(0, 168);

const sortByDate = (items) =>
  [...items].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0) || String(a.title).localeCompare(String(b.title), "zh-Hant"));

const latestDate = (items) =>
  items
    .map((item) => item.date)
    .filter(Boolean)
    .sort()
    .at(-1) || new Date().toISOString().slice(0, 10);

const relevanceScore = (article, topic) => {
  const haystack = [
    article.title,
    article.category,
    article.topic,
    article.access,
    article.source,
    article.summary,
    article.text,
    ...(article.tags || [])
  ].join(" ").toLowerCase();

  return topic.keywords.reduce((score, keyword) => {
    const needle = keyword.toLowerCase();
    if (!needle) return score;
    const titleHit = String(article.title || "").toLowerCase().includes(needle) ? 8 : 0;
    const tagHit = (article.tags || []).some((tag) => String(tag).toLowerCase().includes(needle)) ? 5 : 0;
    const bodyHit = haystack.includes(needle) ? 2 : 0;
    return score + titleHit + tagHit + bodyHit;
  }, 0);
};

const pickArticles = (records, topic) =>
  records
    .filter((article) => article.lang !== "en")
    .map((article) => ({ ...article, score: relevanceScore(article, topic) }))
    .filter((article) => article.score > 0)
    .sort((a, b) => b.score - a.score || new Date(b.date || 0) - new Date(a.date || 0));

const tagsHtml = (article) =>
  (article.tags || [])
    .filter((tag) => !/^(Dcard|Facebook|FB|方格子|免費文章|付費文章|商業分析系列|基本面系列|醫學大會|付費深度商業分析文章系列|製藥巨頭系列)$/i.test(String(tag)))
    .slice(0, 5)
    .map((tag) => `<span>${escapeHtml(tag)}</span>`)
    .join("");

const articleCard = (article) => {
  const image = cleanImage(article.image);
  const external = /^https?:\/\//.test(articleUrl(article));
  return `<a class="topic-hub-article${image ? "" : " no-image"}" href="${escapeHtml(articleUrl(article))}"${external ? ' target="_blank" rel="noopener"' : ""}>
    ${image ? `<img src="../${escapeHtml(image)}" alt="${escapeHtml(article.imageAlt || article.title)}" loading="lazy">` : ""}
    <div>
      <p class="meta">${escapeHtml(article.date || "")}　${escapeHtml(article.category || "")}　${escapeHtml(article.access || "")}</p>
      <h3>${escapeHtml(article.title)}</h3>
      <p>${escapeHtml(readable(article.summary || article.text))}</p>
      <div class="tags">${tagsHtml(article)}</div>
    </div>
  </a>`;
};

const compactArticleLink = (article, label = "") => {
  if (!article) return "";
  const external = /^https?:\/\//.test(articleUrl(article));
  return `<a class="curated-link" href="${escapeHtml(articleUrl(article))}"${external ? ' target="_blank" rel="noopener"' : ""}>
    ${label ? `<span>${escapeHtml(label)}</span>` : ""}
    <strong>${escapeHtml(article.title)}</strong>
    <small>${escapeHtml(article.date || "")} · ${escapeHtml(article.category || "")}</small>
  </a>`;
};

const topicPaths = (articles) => {
  const byScore = [...articles].sort((a, b) => b.score - a.score || new Date(b.date || 0) - new Date(a.date || 0));
  const latest = sortByDate(articles);
  const textOf = (article) => [article.title, article.summary, article.text, ...(article.tags || [])].join(" ");
  const beginner = byScore.filter((article) => /指南|估值|怎麼看|入門|框架|基本|什麼|101|001|重點/i.test(textOf(article)));
  const advanced = byScore.filter((article) => /BD|授權|rNPV|SOTP|Phase|臨床|CMC|併購|交易|機制|策略|風險|pipeline/i.test(textOf(article)));
  const used = new Set();
  const pick = (pool, fallback) => {
    const item = [...pool, ...fallback].find((candidate) => candidate && !used.has(candidate.slug));
    if (item) used.add(item.slug);
    return item;
  };
  return {
    starter: byScore.slice(0, 3),
    beginner: pick(beginner, byScore),
    advanced: pick(advanced, byScore),
    latest: pick(latest, byScore)
  };
};

const head = ({ title, description, canonical }) => `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}｜藥時事 Drugnews</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <link rel="icon" href="../favicon.svg">
  <link rel="stylesheet" href="../styles.css">
  <meta property="og:title" content="${escapeHtml(title)}｜藥時事 Drugnews">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:site_name" content="Drugnews｜藥時事">
  <meta name="twitter:card" content="summary">
`;

const header = `<body>
  <header class="site-header">
    <div class="container nav">
      <a class="brand" href="../index.html"><img src="../favicon.svg" alt=""><span>Drugnews｜藥時事</span></a>
      <input class="nav-toggle" id="site-nav-toggle" type="checkbox" aria-hidden="true">
      <label class="nav-menu-button" for="site-nav-toggle">選單</label>
      <nav class="nav-links" aria-label="Main navigation">
        <a href="../index.html">首頁</a>
        <a href="../articles/">文章</a>
        <a href="./" aria-current="page">主題</a>
        <a href="../guides/">指南</a>
        <a href="../subscribe.html">付費專欄</a>
        <a href="../services.html">公司合作</a>
      </nav>
    </div>
  </header>`;

const footer = `  <footer class="site-footer">
    <div class="container">
      <strong>Drugnews｜藥時事</strong>
      <p>生技醫藥商業分析文章媒體。本文僅供產業研究與知識分享，不構成投資、醫療或個股建議。</p>
    </div>
  </footer>
</body>
</html>
`;

const topicPage = (topic, articles) => {
  const canonical = `${BASE_URL}/topics/${topic.slug}.html`;
  const paths = topicPaths(articles);
  const itemList = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${topic.title}｜藥時事 Drugnews`,
    url: canonical,
    description: topic.description,
    isPartOf: { "@type": "WebSite", name: "藥時事 Drugnews", url: BASE_URL },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: articles.slice(0, 10).map((article, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: articleAbsUrl(article),
        name: article.title
      }))
    }
  };

  return `${head({ title: topic.title, description: topic.description, canonical })}
  <script type="application/ld+json">${JSON.stringify(itemList)}</script>
</head>
${header}
  <main>
    <section class="topic-hub-hero">
      <div class="container topic-hub-hero-inner">
        <div>
          <p class="eyebrow">${escapeHtml(topic.eyebrow)}</p>
          <h1>${escapeHtml(topic.title)}</h1>
          <p>${escapeHtml(topic.description)}</p>
        </div>
        <div class="topic-hub-terms" aria-label="常見關鍵字">
          ${topic.terms.map((term) => `<span>${escapeHtml(term)}</span>`).join("")}
        </div>
      </div>
    </section>
    <section class="section compact">
      <div class="container curated-topic-block">
        <div class="curated-topic-intro">
          <p class="eyebrow">先讀這 3 篇</p>
          <h2>${escapeHtml(topic.title)}起手式</h2>
          <p>先讀最能建立判斷框架的文章，再往案例與最新事件延伸。</p>
        </div>
        <div class="curated-link-grid">
          ${paths.starter.map((article, index) => compactArticleLink(article, `0${index + 1}`)).join("") || '<p class="notice">這個主題正在整理中。</p>'}
        </div>
      </div>
      <div class="container reading-paths">
        ${compactArticleLink(paths.beginner, "初階")}
        ${compactArticleLink(paths.advanced, "進階")}
        ${compactArticleLink(paths.latest, "最新")}
      </div>
    </section>
    <section class="section">
      <div class="container section-head">
        <div>
          <p class="eyebrow">精選文章</p>
          <h2>${escapeHtml(topic.title)}文章庫（${articles.length} 篇）</h2>
        </div>
        <p>這些文章會隨著網站內容更新而重新整理，讓讀者能從同一個問題一路讀到相關案例。</p>
      </div>
      <div class="container topic-hub-list">
        ${articles.map(articleCard).join("\n") || '<p class="notice">這個主題正在整理中。</p>'}
      </div>
    </section>
  </main>
${footer}`;
};

const topicIndexPage = (recordsByTopic) => {
  const canonical = `${BASE_URL}/topics/`;
  const description = "藥時事 Drugnews 熱門搜尋主題頁，整理生技投資、估值、BD 授權、臨床數據、CMC、製藥巨頭與 GLP-1 等文章入口。";
  const itemList = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "藥時事熱門搜尋主題",
    url: canonical,
    description,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: topics.map((topic, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${BASE_URL}/topics/${topic.slug}.html`,
        name: topic.title
      }))
    }
  };
  const cards = topics
    .map((topic) => {
      const count = recordsByTopic.get(topic.slug)?.length || 0;
      return `<a class="topic-hub-card" href="${topic.slug}.html">
        <span>${escapeHtml(topic.eyebrow)}</span>
        <h2>${escapeHtml(topic.title)}</h2>
        <p>${escapeHtml(topic.description)}</p>
        <strong>${count} 篇相關文章</strong>
      </a>`;
    })
    .join("");

  return `${head({ title: "熱門搜尋主題", description, canonical })}
  <script type="application/ld+json">${JSON.stringify(itemList)}</script>
</head>
${header}
  <main>
    <section class="topic-hub-hero">
      <div class="container topic-hub-hero-inner">
        <div>
          <p class="eyebrow">Topic Hubs</p>
          <h1>熱門搜尋主題</h1>
          <p>${description}</p>
        </div>
      </div>
    </section>
    <section class="section">
      <div class="container topic-hub-grid">
        ${cards}
      </div>
    </section>
  </main>
${footer}`;
};

const updateSitemap = async (recordsByTopic) => {
  let sitemap = await readFile(SITEMAP_PATH, "utf8");
  const topicIndexDate = latestDate([...recordsByTopic.values()].flat());
  const topicUrls = [
    `  <url><loc>${BASE_URL}/topics/</loc><lastmod>${topicIndexDate}</lastmod><priority>0.85</priority></url>`,
    ...topics.map((topic) => {
      const articles = recordsByTopic.get(topic.slug) || [];
      return `  <url><loc>${BASE_URL}/topics/${topic.slug}.html</loc><lastmod>${latestDate(articles)}</lastmod><priority>0.85</priority></url>`;
    })
  ];
  const lines = sitemap.split("\n").filter((line) => !line.includes(`${BASE_URL}/topics/`));
  const endIndex = lines.findIndex((line) => line.includes("</urlset>"));
  if (endIndex === -1) throw new Error("sitemap.xml is missing </urlset>");
  lines.splice(endIndex, 0, ...topicUrls);
  sitemap = lines.join("\n").replace(/\n{3,}/g, "\n\n");
  await writeFile(SITEMAP_PATH, sitemap);
};

const main = async () => {
  const records = JSON.parse(await readFile(SEARCH_INDEX_PATH, "utf8"));
  await mkdir(TOPICS_DIR, { recursive: true });

  const recordsByTopic = new Map();
  for (const topic of topics) {
    const articles = pickArticles(records, topic);
    recordsByTopic.set(topic.slug, articles);
    await writeFile(path.join(TOPICS_DIR, `${topic.slug}.html`), topicPage(topic, articles));
  }

  await writeFile(path.join(TOPICS_DIR, "index.html"), topicIndexPage(recordsByTopic));
  await updateSitemap(recordsByTopic);

  console.log(`Built ${topics.length + 1} topic hub pages.`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
