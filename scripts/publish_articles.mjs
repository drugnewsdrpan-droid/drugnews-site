import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const BASE_URL = "https://drugnewsdrpan-droid.github.io/drugnews-site";
const INBOX = path.join(ROOT, "content", "inbox");
const PUBLISHED = path.join(ROOT, "content", "published");
const EXTERNAL_ARTICLES = path.join(ROOT, "content", "external-articles.json");
const ARTICLES = path.join(ROOT, "articles");
const ASSETS = path.join(ROOT, "assets", "articles");
const ERRORS_FILE = path.join(ROOT, "content", "publish-errors.json");
const FORCE = process.argv.includes("--force");
const nowArg = process.argv.find((arg) => arg.startsWith("--now="));
const NOW = nowArg ? new Date(nowArg.slice("--now=".length)) : new Date();
const PAID_COLUMN_URL = "https://vocus.cc/user/@Drugnews";
const PHARMA_GIANTS_URL = "https://vocus.cc/salon/Drugnews/room/pharmagiants";
const FACEBOOK_URL = "https://www.facebook.com/profile.php?id=61568446257142";
const DCARD_URL = "https://www.dcard.tw/@drugnews";
const CMONEY_URL = "https://www.cmoney.tw/app/expert/drugnews?ca=1";

const LEGACY_TOPICS = new Map([
  ["生技估值", "biotech-valuation"],
  ["公司研究", "company-research"],
  ["BD / 授權", "bd-licensing"],
  ["臨床與 CMC", "clinical-cmc"],
  ["IR 與資本市場", "ir-capital-markets"],
  ["活動紀錄", "events"]
]);

const SERIES = new Map([
  ["商業分析系列", "business-analysis"],
  ["基本面系列", "fundamental-analysis"],
  ["醫學大會", "medical-conference"],
  ["付費深度商業分析文章系列", "paid-deep-analysis"],
  ["製藥巨頭系列", "big-pharma"]
]);

const ACCESS_TYPES = new Map([
  ["免費文章", "free"],
  ["付費文章", "paid"]
]);

const DISCLAIMER = "本文僅供產業研究與知識分享，不構成投資、醫療、募資或個股建議。";
const ENGLISH_DISCLAIMER = "This article is intended for industry research and knowledge sharing only. It does not constitute investment, medical, fundraising, or individual stock advice.";
const HIDDEN_DISPLAY_TAGS = /^(Dcard|Facebook|FB|方格子|免費文章|付費文章|商業分析系列|基本面系列|醫學大會|付費深度商業分析文章系列|製藥巨頭系列)$/i;

function visibleDisplayTags(tags = []) {
  return tags.filter((tag) => !HIDDEN_DISPLAY_TAGS.test(tag));
}

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
  await fs.mkdir(path.join(ARTICLES, "type"), { recursive: true });
  await fs.mkdir(path.join(ARTICLES, "archive"), { recursive: true });
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

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function absoluteUrl(relativeUrl) {
  if (/^https?:\/\//i.test(String(relativeUrl))) return String(relativeUrl);
  return `${BASE_URL}/${String(relativeUrl).replace(/^\.\.\//, "").replace(/^\//, "")}`;
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
  return SERIES.get(category) || LEGACY_TOPICS.get(category) || slugify(category, "uncategorized");
}

function accessSlug(access) {
  return ACCESS_TYPES.get(access) || "free";
}

function accessLabel(item) {
  return item.access || "免費文章";
}

function isEnglish(item = {}) {
  return /^en\b/i.test(item.lang || item.locale || "");
}

function languageTag(item = {}) {
  return isEnglish(item) ? "en" : "zh-Hant";
}

function ogLocale(item = {}) {
  return isEnglish(item) ? "en_US" : "zh_TW";
}

function disclaimerFor(item = {}) {
  return isEnglish(item) ? ENGLISH_DISCLAIMER : DISCLAIMER;
}

function articleUi(meta = {}) {
  if (!isEnglish(meta)) {
    return {
      home: "首頁",
      articles: "文章",
      freeArticle: "免費文章",
      byline: "作者：",
      author: "Drugnews 編輯部｜潘若凡博士、林詮盛博士團隊",
      originalHeading: "社群原文",
      originalDcard: "原 Dcard 貼文",
      originalFb: "原 FB 貼文",
      facebook: "Facebook 粉專",
      cmoney: "股市爆料同學會",
      paidHeading: "延伸深度研究",
      paidCopy: "想持續追蹤更多公司研究、產業脈絡與資本市場觀察，可在方格子訂閱 Drugnews 付費專欄。",
      paidCta: "了解付費專欄",
      sidebarEyebrow: "付費專欄",
      sidebarTitle: "方格子付費專欄",
      sidebarCopy: "深度研究、公司追蹤與生技醫藥資本市場筆記，適合想長期追蹤的讀者。",
      sidebarCta: "了解訂閱",
      followTitle: "持續追蹤 Drugnews",
      followCopy: "最新貼文、付費長文與投資社群討論，會持續更新在各平台。",
      related: "延伸閱讀"
    };
  }
  return {
    home: "Home",
    articles: "Articles",
    freeArticle: "Free Article",
    byline: "By ",
    author: "Drugnews Editorial Team",
    originalHeading: "Original Article",
    originalDcard: "Original Dcard Post",
    originalFb: "Original Facebook Post",
    facebook: "Facebook Page",
    cmoney: "CMoney Community",
    paidHeading: "Further Research",
    paidCopy: "For deeper company research, industry context, and biotech capital-market notes, follow Drugnews paid research on Vocus.",
    paidCta: "Explore Paid Research",
    sidebarEyebrow: "Paid Research",
    sidebarTitle: "Drugnews Paid Research",
    sidebarCopy: "In-depth company research, industry tracking, and biotech capital-market notes for long-term readers.",
    sidebarCta: "Explore Subscription",
    followTitle: "Follow Drugnews",
    followCopy: "Latest posts, long-form research, and biotech market discussions are updated across our channels.",
    related: "Related Reading"
  };
}

function displaySeriesLabel(series, item = {}) {
  if (!isEnglish(item)) return series;
  return {
    "商業分析系列": "Business Analysis",
    "基本面系列": "Fundamental Analysis",
    "醫學大會": "Medical Conference",
    "付費深度商業分析文章系列": "Paid Deep-Dive Analysis",
    "製藥巨頭系列": "Big Pharma"
  }[series] || series;
}

function displayAccessLabel(item = {}) {
  const access = accessLabel(item);
  if (!isEnglish(item)) return access;
  return {
    "免費文章": "Free Article",
    "付費文章": "Paid Article"
  }[access] || access;
}

function inferSeries(input = {}) {
  if (SERIES.has(input.series)) return input.series;
  if (SERIES.has(input.category)) return input.category;

  const access = accessLabel(input);
  const source = input.source || input.source_platform || platformLabel(input);
  const title = input.title || "";
  const tags = Array.isArray(input.tags) ? input.tags.join(" ") : "";
  const haystack = `${title} ${tags}`;

  if (/ASCO|ESMO|AACR|EHA|AHA|ADA|ASH|醫學大會|年會|大會整理/i.test(haystack)) {
    return "醫學大會";
  }

  if (access === "免費文章" && /Dcard|Facebook|網站|方格子/i.test(source)) {
    return "商業分析系列";
  }

  if (/方格子/.test(source) && access === "付費文章") {
    if (/基本面|會員研究包|合理估值|財報|營收|EPS|PDUFA/.test(haystack)) {
      return "基本面系列";
    }
    if (/製藥巨頭發展史|製藥巨頭系列/i.test(haystack)) {
      return "製藥巨頭系列";
    }
    return "付費深度商業分析文章系列";
  }

  return "商業分析系列";
}

function platformLabel(meta) {
  if (meta.source_platform) return meta.source_platform;
  const platforms = [];
  if (meta.dcard_url) platforms.push("Dcard");
  if (meta.facebook_url) platforms.push("Facebook");
  return platforms.length ? platforms.join(" / ") : "網站";
}

function formatDate(date) {
  return new Intl.DateTimeFormat("zh-Hant-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Taipei"
  }).format(new Date(`${date}T00:00:00+08:00`));
}

function displayDate(date, meta = {}) {
  if (!isEnglish(meta)) return formatDate(date);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "Asia/Taipei"
  }).format(new Date(`${date}T00:00:00+08:00`));
}

function alternateLinks(meta, url) {
  const alternates = new Map([[languageTag(meta), url]]);
  for (const [lang, href] of Object.entries(meta.translations || {})) {
    alternates.set(lang, /^https?:\/\//i.test(href) ? href : `${BASE_URL}/articles/${href}`);
  }
  if (alternates.has("zh-Hant")) alternates.set("x-default", alternates.get("zh-Hant"));
  return [...alternates.entries()]
    .map(([lang, href]) => `<link rel="alternate" hreflang="${escapeHtml(lang)}" href="${escapeHtml(href)}">`)
    .join("\n  ");
}

function monthKey(date) {
  return String(date).slice(0, 7);
}

function formatMonth(key) {
  const [year, month] = key.split("-");
  return `${year} 年 ${Number(month)} 月`;
}

function parseMeta(raw, folderName) {
  const meta = JSON.parse(raw);
  const required = ["title", "date", "publish_at", "category", "tags", "summary"];
  const missing = required.filter((field) => meta[field] === undefined || meta[field] === "");
  if (missing.length) throw new Error(`meta.json missing required fields: ${missing.join(", ")}`);
  if (!Array.isArray(meta.tags)) throw new Error("meta.json field `tags` must be an array");
  if (!LEGACY_TOPICS.has(meta.category) && !SERIES.has(meta.category)) {
    throw new Error(`Unsupported category "${meta.category}". Use one of: ${[...LEGACY_TOPICS.keys(), ...SERIES.keys()].join(", ")}`);
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
  if (article.meta.cover_image && !/^https?:\/\//i.test(article.meta.cover_image)) {
    const coverPath = path.join(article.folderPath, article.meta.cover_image);
    if (!(await exists(coverPath))) errors.push(`cover_image not found: ${article.meta.cover_image}`);
  }
  return errors;
}

async function copyImages(article) {
  const imageMap = new Map();
  const targetDir = path.join(ASSETS, article.meta.slug);
  await fs.mkdir(targetDir, { recursive: true });
  if (article.meta.cover_image && !/^https?:\/\//i.test(article.meta.cover_image)) {
    const fileName = path.basename(article.meta.cover_image);
    const source = path.join(article.folderPath, article.meta.cover_image);
    const target = path.join(targetDir, fileName);
    await fs.copyFile(source, target);
    imageMap.set(article.meta.cover_image, `../assets/articles/${article.meta.slug}/${encodeURIComponent(fileName)}`);
  } else if (article.meta.cover_image) {
    imageMap.set(article.meta.cover_image, article.meta.cover_image);
  }
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

function coverImage(article, markdownImages = findMarkdownImages(article.markdown)) {
  const { meta } = article;
  if (meta.cover_image) {
    return {
      src: article.imageMap.get(meta.cover_image) || meta.cover_image,
      alt: meta.cover_image_alt || meta.title
    };
  }
  const firstImage = markdownImages[0];
  return firstImage
    ? { src: article.imageMap.get(firstImage.src) || firstImage.src, alt: firstImage.alt || meta.title }
    : { src: "", alt: meta.title };
}

function inlineMarkdown(text) {
  let html = escapeHtml(text);
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,，。！？;:：；]|$)/g, "$1<em>$2</em>");
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
      out.push(`<figure><img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy"></figure>`);
      continue;
    }
    if (/^-{3,}$/.test(trimmed)) {
      flushParagraph(paragraph, out);
      flushList();
      flushQuote();
      out.push("<hr>");
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

function headerHtml(current, meta = {}) {
  const english = isEnglish(meta);
  const labels = english
    ? {
        home: "Home",
        articles: "Articles",
        guides: "Guides",
        subscribe: "Paid Research",
        services: "Company Services",
        team: "Team",
        language: "中文"
      }
    : {
        home: "首頁",
        articles: "文章",
        guides: "指南",
        subscribe: "付費專欄",
        services: "公司合作",
        team: "團隊",
        language: "English"
      };
  const hrefs = english
    ? {
        home: "../en/index.html",
        articles: "../en/articles/",
        guides: "../en/guides/",
        subscribe: "../en/subscribe.html",
        services: "../en/services.html",
        team: "../en/team.html",
        language: "../index.html"
      }
    : {
        home: "../index.html",
        articles: "index.html",
        guides: "../guides/",
        subscribe: "../subscribe.html",
        services: "../services.html",
        team: "../team.html",
        language: "../en/index.html"
      };
  const link = (href, label, key) => `<a href="${href}"${current === key ? ' aria-current="page"' : ""}>${label}</a>`;
  return `<header class="site-header">
  <div class="container nav">
    <a class="brand" href="${hrefs.home}"><img src="../favicon.svg" alt=""><span>Drugnews｜藥時事</span></a>
    <nav class="nav-links" aria-label="Main navigation">
      ${link(hrefs.home, labels.home, "home")}
      ${link(hrefs.articles, labels.articles, "articles")}
      ${link(hrefs.guides, labels.guides, "guides")}
      ${link(hrefs.subscribe, labels.subscribe, "subscribe")}
      ${link(hrefs.services, labels.services, "services")}
      ${link(hrefs.team, labels.team, "team")}
      ${link(hrefs.language, labels.language, "language")}
    </nav>
  </div>
</header>`;
}

function footerHtml(meta = {}) {
  return `<footer class="site-footer"><div class="container">© 2026 Drugnews. ${disclaimerFor(meta)}</div></footer>`;
}

function articlePage(article, bodyHtml, related) {
  const { meta } = article;
  const ui = articleUi(meta);
  const fileName = `${meta.date}-${meta.slug}.html`;
  const url = `${BASE_URL}/articles/${fileName}`;
  const series = inferSeries(meta);
  const articleCover = coverImage(article);
  const articleImage = articleCover.src;
  const articleImageUrl = articleImage ? absoluteUrl(articleImage) : "";
  const seriesLabel = displaySeriesLabel(series, meta);
  const accessDisplay = displayAccessLabel(meta);
  const localLinks = isEnglish(meta)
    ? { articles: "../en/articles/", subscribe: "../en/subscribe.html", freeType: "../en/articles/" }
    : { articles: "index.html", subscribe: "../subscribe.html", freeType: "type/free.html" };
  const relatedHtml = related.length
    ? `<div class="card"><h3>${ui.related}</h3><div class="article-list">${related.map((item) => articleCardHtml(item, item.external ? item.url : item.fileName)).join("")}</div></div>`
    : "";
  const sourceLinks = [
    meta.dcard_url ? `<a class="tag" href="${escapeHtml(meta.dcard_url)}" target="_blank" rel="noopener">${ui.originalDcard}</a>` : "",
    meta.facebook_url ? `<a class="tag" href="${escapeHtml(meta.facebook_url)}" target="_blank" rel="noopener">${ui.originalFb}</a>` : "",
    !isEnglish(meta) ? `<a class="tag" href="${escapeHtml(FACEBOOK_URL)}" target="_blank" rel="noopener">${ui.facebook}</a>` : "",
    !isEnglish(meta) ? `<a class="tag" href="${escapeHtml(CMONEY_URL)}" target="_blank" rel="noopener">${ui.cmoney}</a>` : ""
  ].filter(Boolean).join("");
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: meta.title,
    datePublished: meta.date,
    dateModified: meta.updated_at || meta.date,
    description: meta.summary,
    mainEntityOfPage: url,
    author: {
      "@type": "Organization",
      name: isEnglish(meta) ? "Drugnews Editorial Team" : "Drugnews 編輯部",
      url: `${BASE_URL}/team.html`
    },
    publisher: {
      "@type": "Organization",
      name: "Drugnews",
      logo: { "@type": "ImageObject", url: `${BASE_URL}/favicon.svg` },
      sameAs: [FACEBOOK_URL, DCARD_URL, PAID_COLUMN_URL, CMONEY_URL, "https://www.instagram.com/drugnews.com.tw/"]
    },
    isAccessibleForFree: true,
    about: meta.tags.map((tag) => ({ "@type": "Thing", name: tag })),
    isPartOf: {
      "@type": "WebSite",
      name: "Drugnews｜藥時事",
      url: `${BASE_URL}/`
    },
    articleSection: seriesLabel,
    keywords: meta.tags.join(", "),
    inLanguage: languageTag(meta)
  };
  if (articleImageUrl) articleSchema.image = [articleImageUrl];
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: ui.home, item: `${BASE_URL}/` },
      { "@type": "ListItem", position: 2, name: ui.articles, item: `${BASE_URL}/articles/` },
      { "@type": "ListItem", position: 3, name: ui.freeArticle, item: `${BASE_URL}/articles/type/free.html` },
      { "@type": "ListItem", position: 4, name: meta.title, item: url }
    ]
  };
  return `<!doctype html>
<html lang="${languageTag(meta)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(meta.title)}｜Drugnews</title>
  <meta name="description" content="${escapeHtml(meta.summary)}">
  <link rel="canonical" href="${url}">
  ${alternateLinks(meta, url)}
  <link rel="icon" href="../favicon.svg">
  <link rel="stylesheet" href="../styles.css">
  <link rel="alternate" type="application/rss+xml" title="Drugnews RSS" href="${BASE_URL}/feed.xml">
  <meta property="og:title" content="${escapeHtml(meta.title)}｜Drugnews">
  <meta property="og:description" content="${escapeHtml(meta.summary)}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${url}">
  <meta property="og:site_name" content="Drugnews｜藥時事">
  <meta property="og:locale" content="${ogLocale(meta)}">
  ${articleImageUrl ? `<meta property="og:image" content="${articleImageUrl}">` : ""}
  <meta name="twitter:card" content="${articleImageUrl ? "summary_large_image" : "summary"}">
  <meta name="twitter:title" content="${escapeHtml(meta.title)}｜Drugnews">
  <meta name="twitter:description" content="${escapeHtml(meta.summary)}">
  ${articleImageUrl ? `<meta name="twitter:image" content="${articleImageUrl}">` : ""}
  <script type="application/ld+json">${JSON.stringify(articleSchema)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>
</head>
<body>
${headerHtml("articles", meta)}
<main>
  <section class="article-hero">
    <div class="container article-hero-inner">
      <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${isEnglish(meta) ? "../en/index.html" : "../index.html"}">${ui.home}</a><span>/</span><a href="${localLinks.articles}">${ui.articles}</a><span>/</span><a href="${localLinks.freeType}">${ui.freeArticle}</a></nav>
      <div class="meta"><span>${displayDate(meta.date, meta)}</span><span>${escapeHtml(accessDisplay)}</span><span>${escapeHtml(seriesLabel)}</span></div>
      <h1>${escapeHtml(meta.title)}</h1>
      <p class="article-deck">${escapeHtml(meta.summary)}</p>
      <p class="article-byline">${ui.byline}<a href="../team.html">${ui.author}</a></p>
      <div class="tag-row">${visibleDisplayTags(meta.tags).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
    </div>
  </section>
  <section class="section article-section">
    <div class="container article-layout">
      <article class="article-body">
      ${bodyHtml}
      <div class="notice">${disclaimerFor(meta)}</div>
      ${sourceLinks ? `<h2>${ui.originalHeading}</h2><div class="tag-row">${sourceLinks}</div>` : ""}
      <div class="paid-note">
        <h2>${ui.paidHeading}</h2>
        <p>${ui.paidCopy}</p>
        <div class="actions"><a class="button primary" href="${localLinks.subscribe}">${ui.paidCta}</a></div>
      </div>
      </article>
      <aside class="sidebar">
      <div class="card paid-card">
        <p class="eyebrow">${ui.sidebarEyebrow}</p>
        <h3>${ui.sidebarTitle}</h3>
        <p>${ui.sidebarCopy}</p>
        <div class="actions"><a class="button primary" href="${localLinks.subscribe}">${ui.sidebarCta}</a></div>
      </div>
      <div class="card">
        <h3>${ui.followTitle}</h3>
        <p>${ui.followCopy}</p>
        <div class="actions">
          <a class="button secondary" href="${FACEBOOK_URL}" target="_blank" rel="noopener">Facebook</a>
          <a class="button secondary" href="${DCARD_URL}" target="_blank" rel="noopener">Dcard</a>
          <a class="button secondary" href="${PAID_COLUMN_URL}" target="_blank" rel="noopener">${isEnglish(meta) ? "Vocus" : "方格子"}</a>
          <a class="button secondary" href="${CMONEY_URL}" target="_blank" rel="noopener">${ui.cmoney}</a>
        </div>
      </div>
      ${relatedHtml}
      </aside>
    </div>
  </section>
</main>
${footerHtml(meta)}
</body>
</html>`;
}

function articleRecord(article) {
  const { meta } = article;
  const fileName = `${meta.date}-${meta.slug}.html`;
  const markdownImages = findMarkdownImages(article.markdown);
  const articleCover = coverImage(article, markdownImages);
  return {
    title: meta.title,
    date: meta.date,
    category: inferSeries(meta),
    categorySlug: categorySlug(inferSeries(meta)),
    topic: meta.category,
    access: accessLabel(meta),
    accessSlug: accessSlug(accessLabel(meta)),
    source: platformLabel(meta),
    lang: languageTag(meta),
    translations: meta.translations || {},
    tags: meta.tags,
    summary: meta.summary,
    image: articleCover.src,
    imageAlt: articleCover.alt,
    publishAt: meta.publish_at,
    slug: meta.slug,
    fileName,
    url: `articles/${fileName}`,
    text: [stripMarkdown(article.markdown), meta.category, inferSeries(meta), languageTag(meta)].join(" ")
  };
}

async function loadExternalArticleRecords() {
  if (!(await exists(EXTERNAL_ARTICLES))) return [];
  const raw = JSON.parse(await fs.readFile(EXTERNAL_ARTICLES, "utf8"));
  if (!Array.isArray(raw)) throw new Error("content/external-articles.json must be an array");
  return raw.map((item, index) => {
    const topic = item.category || "公司研究";
    if (!LEGACY_TOPICS.has(topic) && !SERIES.has(topic)) {
      throw new Error(`External article ${index + 1} has unsupported category "${topic}"`);
    }
    const title = item.title || "";
    const date = item.date || "";
    const url = item.url || "";
    if (!title || !date || !url) throw new Error(`External article ${index + 1} requires title, date and url`);
    const tags = Array.isArray(item.tags) ? item.tags : [];
    const summary = item.summary || "";
    const image = item.image && !item.image.includes("/static/og_img/vocus_og_2025.jpg") ? item.image : "";
    return {
      external: true,
      source: item.source || "方格子",
      access: item.access || "外部文章",
      title,
      date,
      category: inferSeries({ ...item, source: item.source || "方格子" }),
      categorySlug: categorySlug(inferSeries({ ...item, source: item.source || "方格子" })),
      topic,
      accessSlug: accessSlug(item.access || "免費文章"),
      lang: item.lang || "zh-Hant",
      translations: item.translations || {},
      tags,
      summary,
      image,
      imageAlt: item.imageAlt || title,
      publishAt: item.publish_at || `${date}T10:30:00+08:00`,
      slug: slugify(item.slug || title, `external-${index + 1}`),
      fileName: "",
      url,
      text: [title, summary, topic, inferSeries({ ...item, source: item.source || "方格子" }), tags.join(" "), item.source || "方格子", item.access || ""].join(" ")
    };
  });
}

function articleCardHtml(item, href, imageSrc = item.image) {
  const image = imageSrc
    ? `<div class="thumb-wrap"><img class="card-thumb" src="${escapeHtml(imageSrc)}" alt="${escapeHtml(item.imageAlt || item.title)}" loading="lazy"></div>`
    : "";
  const finalHref = item.external ? item.url : href;
  const target = item.external ? ' target="_blank" rel="noopener"' : "";
  const visibleTags = visibleDisplayTags(item.tags);
  const categoryDisplay = displaySeriesLabel(item.category, item);
  const accessDisplay = displayAccessLabel(item);
  return `<a class="article-card${image ? " with-image" : ""}${item.external ? " external-card" : ""}" href="${escapeHtml(finalHref)}"${target}>${image ? `
    ${image}` : ""}
    <div class="article-card-body">
      <div class="meta"><span>${displayDate(item.date, item)}</span><span>${escapeHtml(categoryDisplay)}</span><span>${escapeHtml(accessDisplay)}</span></div>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.summary)}</p>
      <div class="tag-row">${visibleTags.slice(0, 5).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
    </div>
  </a>`;
}

function readerFirstRank(item) {
  if (accessLabel(item) !== "免費文章") return 4;
  if (!item.external && /Dcard/i.test(item.source || "")) return 0;
  if (!item.external && /Facebook/i.test(item.source || "")) return 1;
  if (!item.external) return 2;
  return 3;
}

function readerFirstSort(items) {
  return [...items].sort((a, b) => {
    const rank = readerFirstRank(a) - readerFirstRank(b);
    if (rank) return rank;
    const bTime = new Date(b.publishAt || `${b.date}T00:00:00+08:00`).getTime();
    const aTime = new Date(a.publishAt || `${a.date}T00:00:00+08:00`).getTime();
    return bTime - aTime || b.title.localeCompare(a.title, "zh-Hant");
  });
}

function articleIndexPage(records) {
  const displayRecords = readerFirstSort(records);
  const lead = displayRecords[0];
  const categoryLinks = [...SERIES.keys()]
    .map((category) => `<a href="category/${categorySlug(category)}.html">${escapeHtml(category)}</a>`)
    .join("");
  const typeLinks = [...ACCESS_TYPES.keys()]
    .filter((access) => records.some((item) => accessLabel(item) === access))
    .map((access) => `<a href="type/${accessSlug(access)}.html">${escapeHtml(access)}</a>`)
    .join("");
  const monthLinks = [...new Set(records.map((item) => monthKey(item.date)))]
    .slice(0, 4)
    .map((key) => `<a href="archive/${key}.html">${formatMonth(key)}</a>`)
    .join("");
  const cards = displayRecords.map((item) => articleCardHtml(item, item.external ? item.url : item.fileName)).join("");
  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Drugnews｜文章中心</title>
  <meta name="description" content="Drugnews 文章中心提供生技醫藥公司研究、估值框架、BD 授權與資本市場判讀，協助讀者形成可驗證的商業判斷。">
  <link rel="canonical" href="${BASE_URL}/articles/">
  <link rel="icon" href="../favicon.svg">
  <link rel="stylesheet" href="../styles.css">
  <link rel="alternate" type="application/rss+xml" title="Drugnews RSS" href="${BASE_URL}/feed.xml">
  <meta property="og:title" content="Drugnews｜文章中心">
  <meta property="og:description" content="生技醫藥公司研究、臨床開發、BD 授權、估值框架與資本市場判讀。">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${BASE_URL}/articles/">
  <meta property="og:site_name" content="Drugnews｜藥時事">
  ${lead?.image ? `<meta property="og:image" content="${absoluteUrl(lead.image)}">` : ""}
  <meta name="twitter:card" content="${lead?.image ? "summary_large_image" : "summary"}">
</head>
<body>
${headerHtml("articles")}
<main>
  <section class="page-title insights-title"><div class="container"><p class="eyebrow">分析文章</p><h1>研究文章庫</h1><p>生技醫藥公司研究、臨床開發、BD 授權、估值框架與資本市場觀察，重點不是蒐集資料，而是形成可驗證的商業判斷。</p></div></section>
  <section class="section article-library">
    <div class="container">
      <div class="article-library-head">
        <div>
          <p class="eyebrow">完整索引</p>
          <h2>搜尋與分類</h2>
          <p>用公司、藥物、技術、疾病、BD 或估值關鍵字，直接回到具體案例。</p>
        </div>
        <div class="library-stats">
          <strong>${records.length}</strong>
          <span>篇文章與外部專欄連結</span>
        </div>
      </div>
      <div class="library-links library-links-large" aria-label="內容系列">${categoryLinks}</div>
      <div class="library-links muted" aria-label="文章類型與月份歸檔">${typeLinks}${monthLinks}</div>
      <input class="search-box" data-search-input type="search" placeholder="搜尋公司、主題、估值、BD、IR...">
      <div class="article-list" data-search-results style="margin-top:20px">${cards}</div>
    </div>
  </section>
</main>
${footerHtml()}
<script src="../search.js?v=20260613-cover-tags"></script>
</body>
</html>`;
}

function archivePage(key, records) {
  const cards = records.map((item) => articleCardHtml(
    item,
    item.external ? item.url : `../${item.fileName}`,
    item.image.replace(/^\.\.\//, "../../")
  )).join("");
  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${formatMonth(key)}文章｜Drugnews</title>
  <meta name="description" content="Drugnews ${formatMonth(key)}生技醫藥商業分析文章歸檔。">
  <link rel="canonical" href="${BASE_URL}/articles/archive/${key}.html">
  <link rel="icon" href="../../favicon.svg">
  <link rel="stylesheet" href="../../styles.css">
  <link rel="alternate" type="application/rss+xml" title="Drugnews RSS" href="${BASE_URL}/feed.xml">
</head>
<body>
<header class="site-header"><div class="container nav"><a class="brand" href="../../index.html"><img src="../../favicon.svg" alt=""><span>Drugnews｜藥時事</span></a><nav class="nav-links" aria-label="Main navigation"><a href="../../index.html">首頁</a><a href="../index.html" aria-current="page">文章</a><a href="../../guides/">指南</a><a href="../../subscribe.html">付費專欄</a><a href="../../services.html">公司合作</a><a href="../../team.html">團隊</a><a href="../../en/index.html">English</a></nav></div></header>
<main>
  <section class="page-title"><div class="container"><p class="eyebrow">文章歸檔</p><h1>${formatMonth(key)}文章</h1><p>本月共 ${records.length} 篇 Drugnews 分析，依時間倒序呈現。</p></div></section>
  <section class="section"><div class="container article-list">${cards || '<p class="notice">尚無文章。</p>'}</div></section>
</main>
${footerHtml()}
</body>
</html>`;
}

function categoryDescription(category) {
  const descriptions = {
    "商業分析系列": "FB、Dcard 與網站免費文章整理，從公開事件拆解公司策略、臨床數據、交易訊號與資本市場判斷。",
    "基本面系列": "方格子付費專欄中的公司基本面追蹤，重點放在估值、營收、臨床里程碑與可驗證的商業假設。",
    "醫學大會": "ASCO、ESMO、AACR 等醫學大會與重要學會資料整理，協助讀者快速理解臨床數據與產業意義。",
    "付費深度商業分析文章系列": "方格子付費深度文，聚焦 BD、授權、產業策略、平台價值與資本市場重新定價。",
    "製藥巨頭系列": "大型藥廠發展史、併購路徑、管線取捨與全球競爭格局的系列分析。"
  };
  return descriptions[category] || "Drugnews 內容系列文章。";
}

function categoryPage(category, records) {
  const slug = categorySlug(category);
  const cards = readerFirstSort(records).map((item) => articleCardHtml(
    item,
    item.external ? item.url : `../${item.fileName}`,
    item.image.replace(/^\.\.\//, "../../")
  )).join("");
  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(category)}｜Drugnews</title>
  <meta name="description" content="${escapeHtml(categoryDescription(category))}">
  <link rel="canonical" href="${BASE_URL}/articles/category/${slug}.html">
  <link rel="icon" href="../../favicon.svg">
  <link rel="stylesheet" href="../../styles.css">
  <link rel="alternate" type="application/rss+xml" title="Drugnews RSS" href="${BASE_URL}/feed.xml">
</head>
<body>
<header class="site-header"><div class="container nav"><a class="brand" href="../../index.html"><img src="../../favicon.svg" alt=""><span>Drugnews｜藥時事</span></a><nav class="nav-links" aria-label="Main navigation"><a href="../../index.html">首頁</a><a href="../index.html" aria-current="page">文章</a><a href="../../guides/">指南</a><a href="../../subscribe.html">付費專欄</a><a href="../../services.html">公司合作</a><a href="../../team.html">團隊</a><a href="../../en/index.html">English</a></nav></div></header>
<main><section class="page-title"><div class="container"><p class="eyebrow">內容系列</p><h1>${escapeHtml(category)}</h1><p>${escapeHtml(categoryDescription(category))}</p></div></section><section class="section"><div class="container article-list">${cards || '<p class="notice">尚無文章。</p>'}</div></section></main>
${footerHtml()}
</body>
</html>`;
}

function typePage(access, records) {
  const slug = accessSlug(access);
  const cards = records.map((item) => articleCardHtml(
    item,
    item.external ? item.url : `../${item.fileName}`,
    item.image.replace(/^\.\.\//, "../../")
  )).join("");
  const description = access === "付費文章"
    ? "方格子付費專欄文章整理，適合想深入追蹤公司研究、產業判斷與資本市場筆記的讀者。"
    : "Dcard、Facebook 與網站可免費閱讀的 Drugnews 長文。";
  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(access)}｜Drugnews</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${BASE_URL}/articles/type/${slug}.html">
  <link rel="icon" href="../../favicon.svg">
  <link rel="stylesheet" href="../../styles.css">
  <link rel="alternate" type="application/rss+xml" title="Drugnews RSS" href="${BASE_URL}/feed.xml">
</head>
<body>
<header class="site-header"><div class="container nav"><a class="brand" href="../../index.html"><img src="../../favicon.svg" alt=""><span>Drugnews｜藥時事</span></a><nav class="nav-links" aria-label="Main navigation"><a href="../../index.html">首頁</a><a href="../index.html" aria-current="page">文章</a><a href="../../guides/">指南</a><a href="../../subscribe.html">付費專欄</a><a href="../../services.html">公司合作</a><a href="../../team.html">團隊</a><a href="../../en/index.html">English</a></nav></div></header>
<main><section class="page-title"><div class="container"><p class="eyebrow">文章類型</p><h1>${escapeHtml(access)}</h1><p>${escapeHtml(description)}</p></div></section><section class="section"><div class="container article-list">${cards || '<p class="notice">尚無文章。</p>'}</div></section></main>
${footerHtml()}
</body>
</html>`;
}

function sitemapAlternates(item) {
  const alternates = new Map([[item.lang || "zh-Hant", `${BASE_URL}/${item.url}`]]);
  for (const [lang, href] of Object.entries(item.translations || {})) {
    alternates.set(lang, /^https?:\/\//i.test(href) ? href : `${BASE_URL}/articles/${href}`);
  }
  if (alternates.has("zh-Hant")) alternates.set("x-default", alternates.get("zh-Hant"));
  return [...alternates.entries()]
    .map(([lang, href]) => `<xhtml:link rel="alternate" hreflang="${escapeXml(lang)}" href="${escapeXml(href)}"/>`)
    .join("");
}

function sitemap(records) {
  const staticUrls = [
    ["", "1.0", "2026-06-10"],
    ["articles/", "0.9"],
    ["guides/", "0.8"],
    ["guides/clinical-endpoints.html", "0.7"],
    ["guides/regulatory-milestones.html", "0.7"],
    ["guides/biotech-valuation.html", "0.7"],
    ["guides/bd-licensing-terms.html", "0.7"],
    ["guides/safety-cmc-risk.html", "0.7"],
    ["guides/market-sizing.html", "0.7"],
    ["guides/patent-competition.html", "0.7"],
    ["guides/cash-runway.html", "0.7"],
    ["subscribe.html", "0.8"],
    ["services.html", "0.8"],
    ["team.html", "0.7"]
  ];
  const urls = staticUrls.map(([loc, priority, lastmod]) => `  <url><loc>${BASE_URL}/${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}<priority>${priority}</priority></url>`);
  for (const access of ACCESS_TYPES.keys()) {
    if (!records.some((item) => accessLabel(item) === access)) continue;
    urls.push(`  <url><loc>${BASE_URL}/articles/type/${accessSlug(access)}.html</loc><priority>0.7</priority></url>`);
  }
  for (const category of SERIES.keys()) {
    urls.push(`  <url><loc>${BASE_URL}/articles/category/${categorySlug(category)}.html</loc><priority>0.6</priority></url>`);
  }
  for (const key of new Set(records.map((item) => monthKey(item.date)))) {
    urls.push(`  <url><loc>${BASE_URL}/articles/archive/${key}.html</loc><priority>0.7</priority></url>`);
  }
  for (const item of records.filter((record) => !record.external)) {
    const alternates = sitemapAlternates(item);
    urls.push(`  <url><loc>${BASE_URL}/${item.url}</loc><lastmod>${item.date}</lastmod><priority>0.8</priority>${alternates}</url>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join("\n")}\n</urlset>\n`;
}

function rssFeed(records) {
  const items = records.slice(0, 25).map((item) => {
    const link = item.external ? item.url : `${BASE_URL}/${item.url}`;
    const imageUrl = item.image ? absoluteUrl(item.image) : "";
    const description = imageUrl
      ? `<p><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item.imageAlt || item.title)}"></p><p>${escapeHtml(item.summary)}</p>`
      : `<p>${escapeHtml(item.summary)}</p>`;
    return `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${new Date(item.publishAt || `${item.date}T00:00:00+08:00`).toUTCString()}</pubDate>
      <category>${escapeXml(item.category)}</category>
      <description><![CDATA[${description}]]></description>
    </item>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Drugnews｜藥時事</title>
    <link>${BASE_URL}/</link>
    <atom:link href="${BASE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
    <description>生技醫藥公司研究、臨床開發、BD 授權、估值框架與資本市場觀察。</description>
    <language>zh-TW</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}

function publicSearchRecords(records) {
  return records.map(({ publishAt, ...item }) => item);
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
  const externalRecords = await loadExternalArticleRecords();
  const allRecords = [...records, ...externalRecords].sort((a, b) => {
    const bTime = new Date(b.publishAt || `${b.date}T00:00:00+08:00`).getTime();
    const aTime = new Date(a.publishAt || `${a.date}T00:00:00+08:00`).getTime();
    return bTime - aTime || b.title.localeCompare(a.title, "zh-Hant");
  });
  const zhRecords = allRecords.filter((item) => !isEnglish(item));

  for (const article of withImages) {
    const record = articleRecord(article);
    const sameLanguageRelated = allRecords
      .filter((item) => item.slug !== record.slug && (item.lang || "zh-Hant") === (record.lang || "zh-Hant"))
      .filter((item) => item.category === record.category || item.tags.some((tag) => record.tags.includes(tag)));
    const fallbackRelated = allRecords
      .filter((item) => item.slug !== record.slug)
      .filter((item) => item.category === record.category || item.tags.some((tag) => record.tags.includes(tag)));
    const related = (sameLanguageRelated.length ? sameLanguageRelated : fallbackRelated).slice(0, 3);
    const bodyMarkdown = stripLeadingTitle(article.markdown.replace(DISCLAIMER, "").trim(), article.meta.title);
    const body = markdownToHtml(bodyMarkdown, article.imageMap);
    await writeAtomic(path.join(ARTICLES, record.fileName), articlePage(article, body, related));
  }

  await writeAtomic(path.join(ARTICLES, "index.html"), articleIndexPage(zhRecords));
  for (const category of SERIES.keys()) {
    const categoryRecords = zhRecords.filter((item) => item.category === category);
    const categoryFile = path.join(ARTICLES, "category", `${categorySlug(category)}.html`);
    await writeAtomic(categoryFile, categoryPage(category, categoryRecords));
  }
  for (const access of ACCESS_TYPES.keys()) {
    const typeRecords = zhRecords.filter((item) => accessLabel(item) === access);
    const typeFile = path.join(ARTICLES, "type", `${accessSlug(access)}.html`);
    if (!typeRecords.length) {
      if (await exists(typeFile)) await fs.unlink(typeFile);
      continue;
    }
    await writeAtomic(typeFile, typePage(access, typeRecords));
  }
  for (const key of new Set(zhRecords.map((item) => monthKey(item.date)))) {
    await writeAtomic(path.join(ARTICLES, "archive", `${key}.html`), archivePage(key, zhRecords.filter((item) => monthKey(item.date) === key)));
  }
  await writeAtomic(path.join(ROOT, "search-index.json"), JSON.stringify(publicSearchRecords(zhRecords), null, 2));
  await writeAtomic(path.join(ROOT, "sitemap.xml"), sitemap(allRecords));
  await writeAtomic(path.join(ROOT, "feed.xml"), rssFeed(zhRecords));
  await writeAtomic(ERRORS_FILE, JSON.stringify({ generated_at: new Date().toISOString(), errors: [] }, null, 2));

  console.log(`Published ${due.length} inbox article(s). Total articles: ${allRecords.length}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
