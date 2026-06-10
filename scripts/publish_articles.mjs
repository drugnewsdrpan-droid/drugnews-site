import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const BASE_URL = "https://drugnewsdrpan-droid.github.io/drugnews-site";
const INBOX = path.join(ROOT, "content", "inbox");
const PUBLISHED = path.join(ROOT, "content", "published");
const ARTICLES = path.join(ROOT, "articles");
const ASSETS = path.join(ROOT, "assets", "articles");
const ERRORS_FILE = path.join(ROOT, "content", "publish-errors.json");
const FORCE = process.argv.includes("--force");
const nowArg = process.argv.find((arg) => arg.startsWith("--now="));
const NOW = nowArg ? new Date(nowArg.slice("--now=".length)) : new Date();
const NEWSLETTER_URL = "https://forms.gle/rvDm93vkUx3E7Rci7";
const PAID_COLUMN_URL = "https://vocus.cc/user/@Drugnews";

const CATEGORIES = new Map([
  ["生技估值", "biotech-valuation"],
  ["公司研究", "company-research"],
  ["BD / 授權", "bd-licensing"],
  ["臨床與 CMC", "clinical-cmc"],
  ["IR 與資本市場", "ir-capital-markets"],
  ["活動紀錄", "events"]
]);

const DISCLAIMER = "本文僅供產業研究與知識分享，不構成投資、醫療、募資或個股建議。";

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDirs() {
  await fs.mkdir(INBOX, { recursive: true });
  await fs.mkdir(PUBLISHED, { recursive: true });
  await fs.mkdir(ARTICLES, { recursive: true });
  await fs.mkdir(path.join(ARTICLES, "category"), { recursive: true });
  await fs.mkdir(ASSETS, { recursive: true });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function stripMarkdown(markdown) {
  return markdown
    .replace(/!\[[^\]]*]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/[`*_>#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(input, fallback) {
  const slug = String(input || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || fallback;
}

function categorySlug(category) {
  return CATEGORIES.get(category) || slugify(category, "uncategorized");
}

function formatDate(date) {
  return new Intl.DateTimeFormat("zh-Hant-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Taipei"
  }).format(new Date(`${date}T00:00:00+08:00`));
}

function parseMeta(raw, folderName) {
  const meta = JSON.parse(raw);
  const required = ["title", "date", "publish_at", "category", "tags", "summary"];
  const missing = required.filter((field) => meta[field] === undefined || meta[field] === "");
  if (missing.length) throw new Error(`meta.json missing required fields: ${missing.join(", ")}`);
  if (!Array.isArray(meta.tags)) throw new Error("meta.json field `tags` must be an array");
  if (!CATEGORIES.has(meta.category)) {
    throw new Error(`Unsupported category "${meta.category}". Use one of: ${[...CATEGORIES.keys()].join(", ")}`);
  }
  const publishAt = new Date(meta.publish_at);
  if (Number.isNaN(publishAt.getTime())) throw new Error("meta.json field `publish_at` is not a valid date");
  const slug = slugify(meta.slug || meta.title, folderName);
  return { ...meta, slug, publishAt };
}

async function readArticleFolder(folderPath) {
  const folderName = path.basename(folderPath);
  const metaPath = path.join(folderPath, "meta.json");
  const articlePath = path.join(folderPath, "article.md");
  if (!(await exists(metaPath))) throw new Error("meta.json not found");
  if (!(await exists(articlePath))) throw new Error("article.md not found");
  const meta = parseMeta(await fs.readFile(metaPath, "utf8"), folderName);
  const markdown = await fs.readFile(articlePath, "utf8");
  return { folderPath, folderName, meta, markdown };
}

function findMarkdownImages(markdown) {
  const images = [];
  const re = /!\[([^\]]*)]\(([^)]+)\)/g;
  let match;
  while ((match = re.exec(markdown))) {
    images.push({ alt: match[1], src: match[2] });
  }
  return images;
}

async function validateArticle(article, knownSlugs) {
  const errors = [];
  if (!FORCE && article.meta.publishAt > NOW) {
    errors.push(`publish_at is in the future: ${article.meta.publish_at}`);
  }
  if (knownSlugs.has(article.meta.slug)) {
    errors.push(`slug duplicates another inbox article: ${article.meta.slug}`);
  }
  knownSlugs.add(article.meta.slug);
  const plain = stripMarkdown(article.markdown);
  if (!plain.includes("不構成") || (!plain.includes("投資") && !plain.includes("醫療"))) {
    errors.push("article.md must include an investment / medical disclaimer sentence");
  }
  for (const image of findMarkdownImages(article.markdown)) {
    if (/^https?:\/\//i.test(image.src)) continue;
    const imagePath = path.join(article.folderPath, image.src);
    if (!(await exists(imagePath))) errors.push(`image not found: ${image.src}`);
  }
  return errors;
}

async function copyImages(article) {
  const imageMap = new Map();
  const targetDir = path.join(ASSETS, article.meta.slug);
  await fs.mkdir(targetDir, { recursive: true });
  for (const image of findMarkdownImages(article.markdown)) {
    if (/^https?:\/\//i.test(image.src)) {
      imageMap.set(image.src, image.src);
      continue;
    }
    const source = path.join(article.folderPath, image.src);
    const fileName = path.basename(image.src);
    const target = path.join(targetDir, fileName);
    await fs.copyFile(source, target);
    imageMap.set(image.src, `../assets/articles/${article.meta.slug}/${encodeURIComponent(fileName)}`);
  }
  return imageMap;
}

function inlineMarkdown(text) {
  let html = escapeHtml(text);
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\[([^\]]+)]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  html = html.replace(/\[([^\]]+)]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return html;
}

function flushParagraph(paragraph, out) {
  if (!paragraph.length) return;
  out.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
  paragraph.length = 0;
}

function markdownToHtml(markdown, imageMap) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  const paragraph = [];
  let list = [];
  let quote = [];
  let inCode = false;
  let code = [];

  function flushList() {
    if (!list.length) return;
    out.push(`<ul>${list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
    list = [];
  }

  function flushQuote() {
    if (!quote.length) return;
    out.push(`<blockquote>${quote.map((item) => `<p>${inlineMarkdown(item)}</p>`).join("")}</blockquote>`);
    quote = [];
  }

  function flushCode() {
    if (!code.length) return;
    out.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
    code = [];
  }

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      if (inCode) {
        flushCode();
        inCode = false;
      } else {
        flushParagraph(paragraph, out);
        flushList();
        flushQuote();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      code.push(line);
      continue;
    }

    const trimmed = line.trim();
    const image = trimmed.match(/^!\[([^\]]*)]\(([^)]+)\)$/);
    if (!trimmed) {
      flushParagraph(paragraph, out);
      flushList();
      flushQuote();
      continue;
    }
    if (image) {
      flushParagraph(paragraph, out);
      flushList();
      flushQuote();
      const alt = image[1];
      const src = imageMap.get(image[2]) || image[2];
      out.push(`<figure><img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy"><figcaption>${inlineMarkdown(alt)}</figcaption></figure>`);
      continue;
    }
    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph(paragraph, out);
      flushList();
      flushQuote();
      const level = heading[1].length + 1;
      out.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }
    const item = trimmed.match(/^[-*]\s+(.+)$/);
    if (item) {
      flushParagraph(paragraph, out);
      flushQuote();
      list.push(item[1]);
      continue;
    }
    const q = trimmed.match(/^>\s?(.+)$/);
    if (q) {
      flushParagraph(paragraph, out);
      flushList();
      quote.push(q[1]);
      continue;
    }
    flushList();
    flushQuote();
    paragraph.push(trimmed);
  }
  flushParagraph(paragraph, out);
  flushList();
  flushQuote();
  flushCode();
  return out.join("\n");
}

function stripLeadingTitle(markdown, title) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  if (lines[0]?.trim() === `# ${title}`) {
    return lines.slice(1).join("\n").trim();
  }
  return markdown.trim();
}

function headerHtml(current) {
  const link = (href, label, key) => `<a href="${href}"${current === key ? ' aria-current="page"' : ""}>${label}</a>`;
  return `<header class="site-header">
  <div class="container nav">
    <a class="brand" href="../index.html"><img src="../favicon.svg" alt="">Drugnews</a>
    <nav class="nav-links" aria-label="Main navigation">
      ${link("../index.html", "首頁", "home")}
      ${link("index.html", "文章", "articles")}
      ${link("../subscribe.html", "付費專欄", "subscribe")}
      ${link("../services.html", "公司合作", "services")}
      ${link("../team.html", "團隊", "team")}
    </nav>
  </div>
</header>`;
}

function footerHtml() {
  return `<footer class="site-footer"><div class="container">© 2026 Drugnews. ${DISCLAIMER}</div></footer>`;
}

function articlePage(article, bodyHtml, related) {
  const { meta } = article;
  const fileName = `${meta.date}-${meta.slug}.html`;
  const url = `${BASE_URL}/articles/${fileName}`;
  const relatedHtml = related.length
    ? `<div class="card"><h3>延伸閱讀</h3><div class="article-list">${related.map((item) => `<a class="article-card" href="${item.fileName}"><div class="meta"><span>${item.date}</span><span>${item.category}</span></div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.summary)}</p></a>`).join("")}</div></div>`
    : "";
  const sourceLinks = [
    meta.facebook_url ? `<a class="tag" href="${escapeHtml(meta.facebook_url)}" target="_blank" rel="noopener">原 FB 貼文</a>` : "",
    meta.dcard_url ? `<a class="tag" href="${escapeHtml(meta.dcard_url)}" target="_blank" rel="noopener">原 Dcard 貼文</a>` : ""
  ].filter(Boolean).join("");
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: meta.title,
    datePublished: meta.date,
    dateModified: meta.updated_at || meta.date,
    description: meta.summary,
    mainEntityOfPage: url,
    author: { "@type": "Organization", name: "Drugnews" },
    publisher: {
      "@type": "Organization",
      name: "Drugnews",
      logo: { "@type": "ImageObject", url: `${BASE_URL}/favicon.svg` }
    }
  };
  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(meta.title)}｜Drugnews</title>
  <meta name="description" content="${escapeHtml(meta.summary)}">
  <link rel="canonical" href="${url}">
  <link rel="icon" href="../favicon.svg">
  <link rel="stylesheet" href="../styles.css">
  <meta property="og:title" content="${escapeHtml(meta.title)}｜Drugnews">
  <meta property="og:description" content="${escapeHtml(meta.summary)}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${url}">
  <script type="application/ld+json">${JSON.stringify(schema)}</script>
</head>
<body>
${headerHtml("articles")}
<main class="section">
  <div class="container article-layout">
    <article class="article-body">
      <div class="meta"><span>${formatDate(meta.date)}</span><span>${escapeHtml(meta.category)}</span></div>
      <h1>${escapeHtml(meta.title)}</h1>
      <p>${escapeHtml(meta.summary)}</p>
      <div class="tag-row">${meta.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
      ${bodyHtml}
      <div class="notice">${DISCLAIMER}</div>
      ${sourceLinks ? `<h2>社群原文</h2><div class="tag-row">${sourceLinks}</div>` : ""}
      <div class="paid-note">
        <h2>延伸深度研究</h2>
        <p>想持續追蹤更多公司研究、產業脈絡與資本市場觀察，可在方格子訂閱 Drugnews 付費專欄。</p>
        <div class="actions"><a class="button primary" href="../subscribe.html">了解付費專欄</a></div>
      </div>
    </article>
    <aside class="sidebar">
      <div class="card paid-card">
        <p class="eyebrow">Paid column</p>
        <h3>方格子付費專欄</h3>
        <p>深度研究、公司追蹤與生技醫藥資本市場筆記，適合想長期追蹤的讀者。</p>
        <div class="actions"><a class="button primary" href="../subscribe.html">了解訂閱</a></div>
      </div>
      <div class="card">
        <h3>訂閱長文更新</h3>
        <p>每週收到生技醫藥基本面、估值框架與資本市場觀察。</p>
        <div class="actions"><a class="button secondary" href="${NEWSLETTER_URL}" target="_blank" rel="noopener">免費訂閱</a></div>
      </div>
      ${relatedHtml}
    </aside>
  </div>
</main>
${footerHtml()}
</body>
</html>`;
}

function articleRecord(article) {
  const { meta } = article;
  const fileName = `${meta.date}-${meta.slug}.html`;
  const firstImage = findMarkdownImages(article.markdown)[0];
  const image = firstImage ? article.imageMap.get(firstImage.src) || firstImage.src : "";
  return {
    title: meta.title,
    date: meta.date,
    category: meta.category,
    categorySlug: categorySlug(meta.category),
    tags: meta.tags,
    summary: meta.summary,
    image,
    imageAlt: firstImage?.alt || meta.title,
    publishAt: meta.publish_at,
    slug: meta.slug,
    fileName,
    url: `articles/${fileName}`,
    text: stripMarkdown(article.markdown)
  };
}

function articleIndexPage(records) {
  const lead = records[0];
  const latest = records.slice(1, 5);
  const categoryLinks = [...CATEGORIES.keys()].map((category) => {
    const count = records.filter((item) => item.category === category).length;
    if (!count) return "";
    return `<a href="category/${categorySlug(category)}.html"><span>${escapeHtml(category)}</span><strong>${count}</strong></a>`;
  }).filter(Boolean).join("");
  const leadImage = lead?.image ? `<img src="${escapeHtml(lead.image)}" alt="${escapeHtml(lead.imageAlt)}" loading="lazy">` : "";
  const leadHtml = lead ? `<a class="featured-article" href="${lead.fileName}">
    ${leadImage}
    <div class="featured-copy">
      <div class="meta"><span>${lead.date}</span><span>${escapeHtml(lead.category)}</span></div>
      <h2>${escapeHtml(lead.title)}</h2>
      <p>${escapeHtml(lead.summary)}</p>
      <div class="tag-row">${lead.tags.slice(0, 5).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
      <span class="text-link">閱讀主打分析</span>
    </div>
  </a>` : "";
  const latestHtml = latest.map((item) => `<a class="latest-link" href="${item.fileName}">
    <span>${item.date}</span>
    <strong>${escapeHtml(item.title)}</strong>
  </a>`).join("");
  const cards = records.map((item) => `<a class="article-card" href="${item.fileName}">
    <div class="meta"><span>${item.date}</span><span>${escapeHtml(item.category)}</span></div>
    <h3>${escapeHtml(item.title)}</h3>
    <p>${escapeHtml(item.summary)}</p>
    <div class="tag-row">${item.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
  </a>`).join("");
  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Drugnews｜文章中心</title>
  <meta name="description" content="Drugnews 生技醫藥長文、公司研究、估值框架、BD 授權與 IR 資本市場文章。">
  <link rel="canonical" href="${BASE_URL}/articles/">
  <link rel="icon" href="../favicon.svg">
  <link rel="stylesheet" href="../styles.css">
</head>
<body>
${headerHtml("articles")}
<main>
  <section class="page-title insights-title"><div class="container"><p class="eyebrow">Drugnews articles</p><h1>文章中心</h1><p>把 FB / Dcard 的觸及，沉澱成可搜尋、可分類、可長期閱讀的 Drugnews 內容主站。</p></div></section>
  <section class="section white">
    <div class="container insights-grid">
      ${leadHtml}
      <aside class="latest-panel">
        <p class="eyebrow">Latest</p>
        <h2>最新更新</h2>
        <div>${latestHtml}</div>
      </aside>
    </div>
  </section>
  <section class="section compact white">
    <div class="container category-rail">
      ${categoryLinks}
    </div>
  </section>
  <section class="section white">
    <div class="container newsletter compact">
      <div>
        <p class="eyebrow">Paid column</p>
        <h2>訂閱方格子付費專欄</h2>
        <p>網站收錄可搜尋的長文；方格子提供更完整的深度研究、公司追蹤與產業筆記。</p>
      </div>
      <div class="actions"><a class="button primary" href="../subscribe.html">了解付費專欄</a></div>
    </div>
  </section>
  <section class="section">
    <div class="container">
      <div class="section-head">
        <div>
          <h2>全部文章</h2>
          <p>用公司、藥物、技術、疾病、BD 或估值關鍵字搜尋。</p>
        </div>
      </div>
      <input class="search-box" data-search-input type="search" placeholder="搜尋公司、主題、估值、BD、IR...">
      <div class="article-list" data-search-results style="margin-top:20px">${cards}</div>
    </div>
  </section>
</main>
${footerHtml()}
<script src="../search.js"></script>
</body>
</html>`;
}

function categoryPage(category, records) {
  const slug = categorySlug(category);
  const cards = records.map((item) => `<a class="article-card" href="../${item.fileName}">
    <div class="meta"><span>${item.date}</span><span>${escapeHtml(item.category)}</span></div>
    <h3>${escapeHtml(item.title)}</h3>
    <p>${escapeHtml(item.summary)}</p>
  </a>`).join("");
  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(category)}｜Drugnews</title>
  <meta name="description" content="Drugnews ${escapeHtml(category)}分類文章。">
  <link rel="canonical" href="${BASE_URL}/articles/category/${slug}.html">
  <link rel="icon" href="../../favicon.svg">
  <link rel="stylesheet" href="../../styles.css">
</head>
<body>
<header class="site-header"><div class="container nav"><a class="brand" href="../../index.html"><img src="../../favicon.svg" alt="">Drugnews</a><nav class="nav-links" aria-label="Main navigation"><a href="../../index.html">首頁</a><a href="../index.html" aria-current="page">文章</a><a href="../../subscribe.html">付費專欄</a><a href="../../services.html">公司合作</a><a href="../../team.html">團隊</a></nav></div></header>
<main><section class="page-title"><div class="container"><h1>${escapeHtml(category)}</h1><p>此分類收錄 Drugnews 的相關長文與研究框架。</p></div></section><section class="section"><div class="container article-list">${cards || '<p class="notice">尚無文章。</p>'}</div></section></main>
${footerHtml()}
</body>
</html>`;
}

function sitemap(records) {
  const staticUrls = [
    ["", "1.0"],
    ["index.html", "0.9"],
    ["articles/", "0.9"],
    ["subscribe.html", "0.8"],
    ["services.html", "0.8"],
    ["team.html", "0.7"]
  ];
  const urls = staticUrls.map(([loc, priority]) => `  <url><loc>${BASE_URL}/${loc}</loc><priority>${priority}</priority></url>`);
  for (const category of CATEGORIES.keys()) {
    urls.push(`  <url><loc>${BASE_URL}/articles/category/${categorySlug(category)}.html</loc><priority>0.6</priority></url>`);
  }
  for (const item of records) {
    urls.push(`  <url><loc>${BASE_URL}/${item.url}</loc><lastmod>${item.date}</lastmod><priority>0.8</priority></url>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

async function writeAtomic(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temp = `${filePath}.tmp`;
  await fs.writeFile(temp, content);
  await fs.rename(temp, filePath);
}

async function loadPublishedArticles() {
  if (!(await exists(PUBLISHED))) return [];
  const entries = await fs.readdir(PUBLISHED, { withFileTypes: true });
  const articles = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      articles.push(await readArticleFolder(path.join(PUBLISHED, entry.name)));
    } catch (error) {
      console.warn(`Skipping published/${entry.name}: ${error.message}`);
    }
  }
  return articles;
}

async function moveToPublished(article) {
  const target = path.join(PUBLISHED, article.meta.slug);
  await fs.mkdir(target, { recursive: true });
  await fs.cp(article.folderPath, target, { recursive: true, force: true });
  await fs.rm(article.folderPath, { recursive: true, force: true });
}

async function main() {
  await ensureDirs();
  const errors = [];
  const due = [];
  const knownSlugs = new Set();

  const inboxEntries = await fs.readdir(INBOX, { withFileTypes: true });
  for (const entry of inboxEntries) {
    if (!entry.isDirectory()) continue;
    const folderPath = path.join(INBOX, entry.name);
    try {
      const article = await readArticleFolder(folderPath);
      const articleErrors = await validateArticle(article, knownSlugs);
      if (articleErrors.length) {
        errors.push({ folder: entry.name, errors: articleErrors });
      } else {
        due.push(article);
      }
    } catch (error) {
      errors.push({ folder: entry.name, errors: [error.message] });
    }
  }

  if (errors.length) {
    await writeAtomic(ERRORS_FILE, JSON.stringify({ generated_at: new Date().toISOString(), errors }, null, 2));
    console.error(`Publishing stopped. See ${path.relative(ROOT, ERRORS_FILE)}`);
    process.exitCode = 1;
    return;
  }

  for (const article of due) await moveToPublished(article);

  const published = await loadPublishedArticles();
  const withImages = [];
  for (const article of published) {
    const imageMap = await copyImages(article);
    withImages.push({ ...article, imageMap });
  }
  withImages.sort((a, b) => {
    const bTime = new Date(b.meta.publish_at || `${b.meta.date}T00:00:00+08:00`).getTime();
    const aTime = new Date(a.meta.publish_at || `${a.meta.date}T00:00:00+08:00`).getTime();
    return bTime - aTime || b.meta.title.localeCompare(a.meta.title, "zh-Hant");
  });
  const records = withImages.map(articleRecord);

  for (const article of withImages) {
    const record = articleRecord(article);
    const related = records
      .filter((item) => item.slug !== record.slug && (item.category === record.category || item.tags.some((tag) => record.tags.includes(tag))))
      .slice(0, 3);
    const bodyMarkdown = stripLeadingTitle(article.markdown.replace(DISCLAIMER, "").trim(), article.meta.title);
    const body = markdownToHtml(bodyMarkdown, article.imageMap);
    await writeAtomic(path.join(ARTICLES, record.fileName), articlePage(article, body, related));
  }

  await writeAtomic(path.join(ARTICLES, "index.html"), articleIndexPage(records));
  for (const category of CATEGORIES.keys()) {
    await writeAtomic(path.join(ARTICLES, "category", `${categorySlug(category)}.html`), categoryPage(category, records.filter((item) => item.category === category)));
  }
  await writeAtomic(path.join(ROOT, "search-index.json"), JSON.stringify(records, null, 2));
  await writeAtomic(path.join(ROOT, "sitemap.xml"), sitemap(records));
  await writeAtomic(ERRORS_FILE, JSON.stringify({ generated_at: new Date().toISOString(), errors: [] }, null, 2));

  console.log(`Published ${due.length} inbox article(s). Total articles: ${records.length}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
