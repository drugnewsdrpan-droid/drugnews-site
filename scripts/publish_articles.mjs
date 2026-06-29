import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const BASE_URL = "https://drugnews.com.tw";
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

const SERIES_DISPLAY = new Map([
  ["商業分析系列", "商業分析"],
  ["基本面系列", "基本面"],
  ["醫學大會", "醫學大會"],
  ["付費深度商業分析文章系列", "深度商業分析"],
  ["製藥巨頭系列", "製藥巨頭"]
]);

const ACCESS_TYPES = new Map([
  ["免費文章", "free"],
  ["付費文章", "paid"]
]);

const DISCLAIMER = "本文僅供產業研究與知識分享，不構成投資、醫療、募資或個股建議。";
const ENGLISH_DISCLAIMER = "This article is intended for industry research and knowledge sharing only. It does not constitute investment, medical, fundraising, or individual stock advice.";
const HIDDEN_DISPLAY_TAGS = /^(Dcard|Facebook|FB|方格子|免費文章|付費文章|商業分析系列|基本面系列|醫學大會|付費深度商業分析文章系列|製藥巨頭系列)$/i;
const RELATED_TOPIC_FAMILIES = [
  ["ras", "kras", "胰臟癌", "pancreatic", "prmt5", "mat2a", "腫瘤", "oncology", "cancer", "精準治療"],
  ["glp-1", "glp1", "tirzepatide", "semaglutide", "retatrutide", "肥胖", "減重", "代謝"],
  ["bd", "授權", "upfront", "milestone", "royalty", "併購", "licensing", "deal"],
  ["估值", "rnpv", "sotp", "峰值銷售", "市值", "valuation", "capital"],
  ["cmc", "製造", "產能", "cdmo", "製程", "供應鏈"],
  ["ai", "ai 製藥", "人工智慧", "zasocitinib", "protac", "臨床資產生成引擎"],
  ["car-t", "細胞治療", "自體免疫", "autoimmune"],
  ["製藥巨頭", "big pharma", "lilly", "novo", "merck", "gsk", "bms", "pfizer", "roche", "takeda"]
];

function visibleDisplayTags(tags = []) {
  return tags.filter((tag) => !HIDDEN_DISPLAY_TAGS.test(tag));
}

function topicTags(tags = []) {
  return visibleDisplayTags(tags)
    .map((tag) => String(tag).trim())
    .filter(Boolean);
}

function relatedTopicFamilyScore(sourceText, candidateText) {
  let score = 0;
  for (const family of RELATED_TOPIC_FAMILIES) {
    const sourceHits = family.filter((term) => sourceText.includes(term.toLowerCase()));
    if (!sourceHits.length) continue;
    const candidateHits = family.filter((term) => candidateText.includes(term.toLowerCase()));
    if (!candidateHits.length) continue;
    score += Math.min(18, sourceHits.length * candidateHits.length * 3);
  }
  return score;
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

function campaignUrl(url, content) {
  const next = new URL(url);
  next.searchParams.set("utm_source", "drugnews_site");
  next.searchParams.set("utm_medium", "referral");
  next.searchParams.set("utm_campaign", "paid_research");
  if (content) next.searchParams.set("utm_content", content);
  return next.toString();
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

function recordUrl(item, prefix = "") {
  if (item.external) return item.url;
  return absoluteUrl(`${prefix}${item.fileName || String(item.url || "").replace(/^articles\//, "")}`);
}

function cleanBreadcrumbName(name) {
  return String(name || "文章").replace(/^Drugnews\s*/i, "").trim() || "文章";
}

function collectionBreadcrumbSchema(url, name) {
  const itemListElement = [
    { "@type": "ListItem", position: 1, name: "首頁", item: `${BASE_URL}/` }
  ];

  if (String(url).includes("/articles/")) {
    itemListElement.push({ "@type": "ListItem", position: 2, name: "文章", item: `${BASE_URL}/articles/` });
    if (url !== `${BASE_URL}/articles/`) {
      itemListElement.push({ "@type": "ListItem", position: 3, name: cleanBreadcrumbName(name), item: url });
    }
  } else {
    itemListElement.push({ "@type": "ListItem", position: 2, name: cleanBreadcrumbName(name), item: url });
  }

  return {
    "@type": "BreadcrumbList",
    itemListElement
  };
}

function collectionPageSchema({ url, name, description, records, prefix = "", limit = 30 }) {
  const items = records.slice(0, limit).map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    url: recordUrl(item, prefix),
    name: item.title,
    description: item.summary || undefined,
    image: item.image ? absoluteUrl(item.image) : undefined
  }));
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name,
        url,
        description,
        isPartOf: { "@type": "WebSite", name: "Drugnews｜藥時事", url: `${BASE_URL}/` },
        publisher: { "@type": "Organization", name: "Drugnews", url: `${BASE_URL}/` },
        mainEntity: { "@id": `${url}#item-list` }
      },
      {
        "@type": "ItemList",
        "@id": `${url}#item-list`,
        name,
        numberOfItems: records.length,
        itemListOrder: "https://schema.org/ItemListOrderDescending",
        itemListElement: items
      },
      collectionBreadcrumbSchema(url, name)
    ]
  };
}

function stripMarkdown(markdown) {
  return markdown
    .replace(/!\[[^\]]*]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/^\|\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|$/gm, "")
    .replace(/\|/g, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/[`*_>#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripReferenceSection(markdown) {
  return String(markdown || "").replace(
    /(^|\n)\s*(參考資料[:：]?|References:?)\s*\n[\s\S]*?(?=\n---|\n#{1,3}\s|$)/i,
    "$1"
  );
}

function referenceSection(markdown) {
  const match = String(markdown || "").match(/(^|\n)\s*(參考資料[:：]?|References:?)\s*\n([\s\S]*?)(?=\n---|\n#{1,3}\s|$)/i);
  return match ? match[3].trim() : "";
}

function extractCitations(markdown) {
  const section = referenceSection(markdown);
  if (!section) return [];
  const citations = [];
  const seen = new Set();
  for (const line of section.split("\n").map((item) => item.trim()).filter(Boolean)) {
    const markdownLinks = [...line.matchAll(/\[([^\]]+)]\((https?:\/\/[^)]+)\)/g)];
    for (const link of markdownLinks) {
      const label = link[1].replace(/\s+/g, " ").trim();
      const url = link[2].trim();
      if (seen.has(url)) continue;
      seen.add(url);
      citations.push({ "@type": "CreativeWork", name: label || url, url });
    }
    const bareUrls = [...line.matchAll(/https?:\/\/[^\s)]+/g)].map((match) => match[0]);
    for (const url of bareUrls) {
      if (seen.has(url)) continue;
      seen.add(url);
      const label = line
        .replace(url, "")
        .replace(/^\[\d+]\s*/, "")
        .replace(/[｜|:：\-–—]+$/u, "")
        .replace(/\s+/g, " ")
        .trim();
      citations.push({ "@type": "CreativeWork", name: label || url, url });
    }
  }
  return citations.slice(0, 12);
}

function articleWordCount(markdown) {
  const text = stripMarkdown(stripReferenceSection(markdown));
  const cjk = text.match(/[\u4e00-\u9fff]/g)?.length || 0;
  const latin = text.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g)?.length || 0;
  return cjk + latin;
}

function readingTimeIso(markdown) {
  const words = articleWordCount(markdown);
  const minutes = Math.max(1, Math.ceil(words / 450));
  return `PT${minutes}M`;
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
      shareTitle: "分享這篇分析",
      shareCopy: "把這篇文章轉給關注生技醫藥、公司研究或資本市場的朋友。",
      shareFacebook: "Facebook",
      shareLine: "LINE",
      shareLinkedIn: "LinkedIn",
      copyLink: "複製連結",
      copied: "已複製",
      citationTitle: "引用本文",
      citationCopy: "若在簡報、報告或社群討論引用，建議附上 Drugnews 原文連結。",
      nextReading: "讀完這篇，下一步看",
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
    shareTitle: "Share this analysis",
    shareCopy: "Send this article to readers who follow biotech, company strategy, and capital-market signals.",
    shareFacebook: "Facebook",
    shareLine: "LINE",
    shareLinkedIn: "LinkedIn",
    copyLink: "Copy link",
    copied: "Copied",
    citationTitle: "Cite this article",
    citationCopy: "For decks, research notes, or media references, cite Drugnews with the canonical article URL.",
    nextReading: "Read This Next",
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

function seriesDisplayName(series) {
  return SERIES_DISPLAY.get(series) || series;
}

function seriesSwitchHtml(records, activeCategory = "", basePath = "category/") {
  return `<nav class="series-switch" aria-label="內容系列切換">${[...SERIES.keys()].map((category) => {
    const count = records.filter((item) => item.category === category).length;
    const href = `${basePath}${categorySlug(category)}.html`;
    return `<a href="${escapeHtml(href)}"${category === activeCategory ? ' aria-current="page"' : ""}><span>${escapeHtml(seriesDisplayName(category))}</span><strong>${count}</strong></a>`;
  }).join("")}</nav>`;
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

function validateSocialCoverPolicy(article) {
  const errors = [];
  if (/^facebook$/i.test(article.meta.source_platform || "")) {
    if (!article.meta.cover_image) {
      errors.push("Facebook article cover_image must be set to a generated website cover");
    } else if (/(^|\/)facebook-\d{2}\./i.test(article.meta.cover_image)) {
      errors.push("Facebook article cover_image must be a generated website cover, not an original facebook-XX body image");
    }
  }
  return errors;
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
  errors.push(...validateSocialCoverPolicy(article));
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
  let orderedList = [];
  let quote = [];
  let table = [];
  let inCode = false;
  let code = [];

  function flushList() {
    if (!list.length) return;
    out.push(`<ul>${list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
    list = [];
  }

  function flushOrderedList() {
    if (!orderedList.length) return;
    out.push(`<ol>${orderedList.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ol>`);
    orderedList = [];
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

  function isTableRow(value) {
    return /^\|.+\|$/.test(value);
  }

  function isTableSeparator(value) {
    return /^\|\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|$/.test(value);
  }

  function splitTableRow(value) {
    return value
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim());
  }

  function flushTable() {
    if (!table.length) return;
    if (table.length >= 2 && isTableSeparator(table[1])) {
      const headers = splitTableRow(table[0]);
      const rows = table.slice(2).map(splitTableRow);
      out.push(
        `<div class="table-scroll"><table><thead><tr>${headers
          .map((cell) => `<th>${inlineMarkdown(cell)}</th>`)
          .join("")}</tr></thead><tbody>${rows
          .map((row) => `<tr>${headers.map((_, index) => `<td>${inlineMarkdown(row[index] || "")}</td>`).join("")}</tr>`)
          .join("")}</tbody></table></div>`
      );
    } else {
      out.push(...table.map((row) => `<p>${inlineMarkdown(row)}</p>`));
    }
    table = [];
  }

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      if (inCode) {
        flushCode();
        inCode = false;
      } else {
        flushParagraph(paragraph, out);
        flushList();
        flushOrderedList();
        flushQuote();
        flushTable();
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
      flushOrderedList();
      flushQuote();
      flushTable();
      continue;
    }
    if (isTableRow(trimmed)) {
      flushParagraph(paragraph, out);
      flushList();
      flushOrderedList();
      flushQuote();
      table.push(trimmed);
      continue;
    }
    flushTable();
    if (image) {
      flushParagraph(paragraph, out);
      flushList();
      flushOrderedList();
      flushQuote();
      const alt = image[1];
      const src = imageMap.get(image[2]) || image[2];
      out.push(`<figure><img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy"></figure>`);
      continue;
    }
    if (/^-{3,}$/.test(trimmed)) {
      flushParagraph(paragraph, out);
      flushList();
      flushOrderedList();
      flushQuote();
      out.push("<hr>");
      continue;
    }
    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph(paragraph, out);
      flushList();
      flushOrderedList();
      flushQuote();
      const level = heading[1].length + 1;
      out.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }
    const item = trimmed.match(/^[-*]\s+(.+)$/);
    if (item) {
      flushParagraph(paragraph, out);
      flushOrderedList();
      flushQuote();
      list.push(item[1]);
      continue;
    }
    const orderedItem = trimmed.match(/^\d+\.\s+(.+)$/);
    if (orderedItem) {
      flushParagraph(paragraph, out);
      flushList();
      flushQuote();
      orderedList.push(orderedItem[1]);
      continue;
    }
    const q = trimmed.match(/^>\s?(.+)$/);
    if (q) {
      flushParagraph(paragraph, out);
      flushList();
      flushOrderedList();
      quote.push(q[1]);
      continue;
    }
    flushList();
    flushOrderedList();
    flushQuote();
    paragraph.push(trimmed);
  }
  flushParagraph(paragraph, out);
  flushList();
  flushOrderedList();
  flushQuote();
  flushTable();
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
        language: "中文"
      }
    : {
        home: "首頁",
        articles: "文章",
        topics: "主題",
        guides: "指南",
        subscribe: "付費專欄",
        services: "公司合作",
        language: "English"
      };
  const hrefs = english
    ? {
        home: "../en/index.html",
        articles: "../en/articles/",
        guides: "../en/guides/",
        subscribe: "../en/subscribe.html",
        services: "../en/services.html",
        language: "../index.html"
      }
    : {
        home: "../index.html",
        articles: "index.html",
        topics: "../topics/",
        guides: "../guides/",
        subscribe: "../subscribe.html",
        services: "../services.html",
        language: "../en/index.html"
      };
  const link = (href, label, key) => `<a href="${href}"${current === key ? ' aria-current="page"' : ""}>${label}</a>`;
  return `<header class="site-header">
  <div class="container nav">
    <a class="brand" href="${hrefs.home}"><img src="../favicon.svg" alt=""><span>Drugnews｜藥時事</span></a>
    <input class="nav-toggle" id="site-nav-toggle" type="checkbox" aria-hidden="true">
    <label class="nav-menu-button" for="site-nav-toggle">${english ? "Menu" : "選單"}</label>
    <nav class="nav-links" id="site-nav-links" aria-label="Main navigation">
      ${link(hrefs.home, labels.home, "home")}
      ${link(hrefs.articles, labels.articles, "articles")}
      ${!english ? link(hrefs.topics, labels.topics, "topics") : ""}
      ${link(hrefs.guides, labels.guides, "guides")}
      ${link(hrefs.subscribe, labels.subscribe, "subscribe")}
      ${link(hrefs.services, labels.services, "services")}
      ${link(hrefs.language, labels.language, "language")}
    </nav>
  </div>
</header>`;
}

function nestedHeaderHtml(current = "articles", prefix = "../../") {
  const links = [
    [prefix + "index.html", "首頁", "home"],
    [prefix + "articles/index.html", "文章", "articles"],
    [prefix + "topics/", "主題", "topics"],
    [prefix + "guides/", "指南", "guides"],
    [prefix + "subscribe.html", "付費專欄", "subscribe"],
    [prefix + "services.html", "公司合作", "services"],
    [prefix + "en/index.html", "English", "language"]
  ];
  const nav = links
    .map(([href, label, key]) => `<a href="${href}"${current === key ? ' aria-current="page"' : ""}>${label}</a>`)
    .join("");
  return `<header class="site-header">
  <div class="container nav">
    <a class="brand" href="${prefix}index.html"><img src="${prefix}favicon.svg" alt=""><span>Drugnews｜藥時事</span></a>
    <input class="nav-toggle" id="site-nav-toggle" type="checkbox" aria-hidden="true">
    <label class="nav-menu-button" for="site-nav-toggle">選單</label>
    <nav class="nav-links" aria-label="Main navigation">${nav}</nav>
  </div>
</header>`;
}

function footerHtml(meta = {}) {
  return `<footer class="site-footer"><div class="container">© 2026 Drugnews. ${disclaimerFor(meta)}</div></footer>`;
}

function citationText(meta, url) {
  const dateText = displayDate(meta.date, meta);
  if (isEnglish(meta)) {
    return `Drugnews Editorial Team. "${meta.title}." Drugnews, ${dateText}. ${url}`;
  }
  return `Drugnews 編輯部，〈${meta.title}〉，Drugnews｜藥時事，${dateText}，${url}`;
}

function sharePanelHtml(meta, url) {
  const ui = articleUi(meta);
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(meta.title);
  return `<div class="article-share" aria-label="${escapeHtml(ui.shareTitle)}">
    <div>
      <h2>${escapeHtml(ui.shareTitle)}</h2>
      <p>${escapeHtml(ui.shareCopy)}</p>
    </div>
    <div class="share-actions">
      <a class="button secondary" href="https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}" target="_blank" rel="noopener">${escapeHtml(ui.shareFacebook)}</a>
      <a class="button secondary" href="https://social-plugins.line.me/lineit/share?url=${encodedUrl}" target="_blank" rel="noopener">${escapeHtml(ui.shareLine)}</a>
      <a class="button secondary" href="https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}&title=${encodedTitle}" target="_blank" rel="noopener">${escapeHtml(ui.shareLinkedIn)}</a>
      <button class="button ghost copy-link" type="button" data-copy-url="${escapeHtml(url)}" data-label="${escapeHtml(ui.copyLink)}" data-copied="${escapeHtml(ui.copied)}">${escapeHtml(ui.copyLink)}</button>
    </div>
  </div>`;
}

function tagRowHtml(tags = []) {
  const visible = visibleDisplayTags(tags);
  const first = visible.slice(0, 4);
  const rest = visible.slice(4);
  const firstHtml = first.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
  if (!rest.length) return `<div class="tag-row">${firstHtml}</div>`;
  return `<div class="tag-row tag-row-collapsed">${firstHtml}<details class="tag-more"><summary>+${rest.length}</summary><div>${rest.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div></details></div>`;
}

function injectAfterFirstParagraph(bodyHtml, insertHtml) {
  const index = bodyHtml.indexOf("</p>");
  if (index === -1) return `${insertHtml}\n${bodyHtml}`;
  return `${bodyHtml.slice(0, index + 4)}\n${insertHtml}\n${bodyHtml.slice(index + 4)}`;
}

function citationBoxHtml(meta, url) {
  const ui = articleUi(meta);
  const citation = citationText(meta, url);
  return `<div class="citation-box">
    <h2>${escapeHtml(ui.citationTitle)}</h2>
    <p>${escapeHtml(ui.citationCopy)}</p>
    <blockquote>${escapeHtml(citation)}</blockquote>
  </div>`;
}

function copyLinkScript(meta = {}) {
  const ui = articleUi(meta);
  return `<script>
  document.querySelectorAll(".copy-link").forEach((button) => {
    button.addEventListener("click", async () => {
      const url = button.dataset.copyUrl || location.href;
      try {
        await navigator.clipboard.writeText(url);
        button.textContent = button.dataset.copied || ${JSON.stringify(ui.copied)};
        setTimeout(() => { button.textContent = button.dataset.label || ${JSON.stringify(ui.copyLink)}; }, 1800);
      } catch (error) {
        location.href = url;
      }
    });
  });
</script>`;
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
  const citations = extractCitations(article.markdown);
  const wordCount = articleWordCount(article.markdown);
  const seriesLabel = displaySeriesLabel(series, meta);
  const accessDisplay = displayAccessLabel(meta);
  const seoTags = topicTags(meta.tags);
  const localLinks = isEnglish(meta)
    ? { articles: "../en/articles/", subscribe: "../en/subscribe.html", freeType: "../en/articles/" }
    : { articles: "index.html", subscribe: "../subscribe.html", freeType: "type/free.html" };
  const shareHtml = sharePanelHtml(meta, url);
  const bodyWithShare = injectAfterFirstParagraph(bodyHtml, shareHtml);
  const relatedHtml = relatedModuleHtml(meta, related, sourceRecordFromMeta(article));
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
    about: seoTags.map((tag) => ({ "@type": "Thing", name: tag })),
    isPartOf: {
      "@type": "WebSite",
      name: "Drugnews｜藥時事",
      url: `${BASE_URL}/`
    },
    articleSection: seriesLabel,
    keywords: seoTags.join(", "),
    inLanguage: languageTag(meta),
    wordCount,
    timeRequired: readingTimeIso(article.markdown)
  };
  if (articleImageUrl) articleSchema.image = [articleImageUrl];
  if (citations.length) articleSchema.citation = citations;
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
  <link rel="alternate" type="application/feed+json" title="Drugnews JSON Feed" href="${BASE_URL}/feed.json">
  <link rel="search" type="application/opensearchdescription+xml" title="Drugnews Search" href="${BASE_URL}/opensearch.xml">
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
      ${tagRowHtml(meta.tags)}
    </div>
  </section>
  <section class="section article-section">
    <div class="container article-layout">
      <article class="article-body">
      ${bodyWithShare}
      ${citationBoxHtml(meta, url)}
      <div class="notice">${disclaimerFor(meta)}</div>
      ${sourceLinks ? `<h2>${ui.originalHeading}</h2><div class="tag-row">${sourceLinks}</div>` : ""}
      <div class="paid-note">
        <h2>${ui.paidHeading}</h2>
        <p>${ui.paidCopy}</p>
        <div class="actions"><a class="button primary" href="${localLinks.subscribe}">${ui.paidCta}</a></div>
      </div>
      ${relatedHtml}
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
          <a class="button secondary" href="${escapeHtml(campaignUrl(PAID_COLUMN_URL, isEnglish(meta) ? "english_article_sidebar" : "article_sidebar"))}" target="_blank" rel="noopener">${isEnglish(meta) ? "Vocus" : "方格子"}</a>
          <a class="button secondary" href="${CMONEY_URL}" target="_blank" rel="noopener">${ui.cmoney}</a>
        </div>
      </div>
      </aside>
    </div>
  </section>
</main>
${footerHtml(meta)}
${copyLinkScript(meta)}
</body>
</html>
`;
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
    tags: topicTags(meta.tags),
    summary: meta.summary,
    image: articleCover.src,
    imageAlt: articleCover.alt,
    publishAt: meta.publish_at,
    slug: meta.slug,
    fileName,
    url: `articles/${fileName}`,
    text: [stripMarkdown(stripReferenceSection(article.markdown)), meta.category, inferSeries(meta), languageTag(meta)].join(" ")
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
      tags: topicTags(tags),
      summary,
      image,
      imageAlt: item.imageAlt || title,
      publishAt: item.publish_at || `${date}T10:30:00+08:00`,
      slug: slugify(item.slug || title, `external-${index + 1}`),
      fileName: "",
      url,
      text: [title, summary, topic, inferSeries({ ...item, source: item.source || "方格子" }), topicTags(tags).join(" "), item.source || "方格子", item.access || ""].join(" ")
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
    const bTime = new Date(b.publishAt || `${b.date}T00:00:00+08:00`).getTime();
    const aTime = new Date(a.publishAt || `${a.date}T00:00:00+08:00`).getTime();
    const time = bTime - aTime;
    if (time) return time;
    const rank = readerFirstRank(a) - readerFirstRank(b);
    if (rank) return rank;
    return b.title.localeCompare(a.title, "zh-Hant");
  });
}

function relatedScore(source, candidate) {
  if (!source || !candidate || source.slug === candidate.slug) return 0;
  const sourceTags = new Set((source.tags || []).map((tag) => String(tag).toLowerCase()));
  const candidateTags = (candidate.tags || []).map((tag) => String(tag).toLowerCase());
  let score = 0;
  for (const tag of candidateTags) {
    if (sourceTags.has(tag)) score += 10;
  }
  if (candidate.category === source.category) score += 5;
  if ((candidate.topic || "") && candidate.topic === source.topic) score += 4;
  const sourceText = [source.title, source.summary, source.text, ...(source.tags || [])].join(" ").toLowerCase();
  const candidateText = [candidate.title, candidate.summary, candidate.text, ...(candidate.tags || [])].join(" ").toLowerCase();
  score += relatedTopicFamilyScore(sourceText, candidateText);
  for (const token of sourceText.match(/[A-Za-z0-9-]{3,}|[\u4e00-\u9fff]{2,}/g) || []) {
    if (candidateText.includes(token)) score += /ras|prmt5|mat2a|胰臟癌|臨床|oncology|cancer|glp-1|bd|估值/i.test(token) ? 3 : 0.35;
  }
  const recency = Math.max(0, 45 - Math.abs((new Date(source.date) - new Date(candidate.date)) / 86400000)) / 45;
  return score + recency;
}

function sharedVisibleTags(source, candidate) {
  const sourceTags = new Set(visibleDisplayTags(source.tags || []).map((tag) => String(tag).toLowerCase()));
  return visibleDisplayTags(candidate.tags || []).filter((tag) => sourceTags.has(String(tag).toLowerCase()));
}

function hasTopicFamilyOverlap(source, candidate) {
  const sourceText = [source.title, source.summary, source.text, ...(source.tags || [])].join(" ").toLowerCase();
  const candidateText = [candidate.title, candidate.summary, candidate.text, ...(candidate.tags || [])].join(" ").toLowerCase();
  return relatedTopicFamilyScore(sourceText, candidateText) > 0;
}

function hasRelatedSignal(source, candidate) {
  return Boolean(
    sharedVisibleTags(source, candidate).length ||
      (candidate.category && candidate.category === source.category) ||
      (candidate.topic && candidate.topic === source.topic) ||
      hasTopicFamilyOverlap(source, candidate)
  );
}

function pickRelatedArticles(record, allRecords) {
  const sameLanguage = allRecords.filter((item) => item.slug !== record.slug && (item.lang || "zh-Hant") === (record.lang || "zh-Hant"));
  const fallbackPool = sameLanguage.length ? sameLanguage : allRecords.filter((item) => item.slug !== record.slug);
  const scored = fallbackPool
    .map((item) => ({ ...item, _relatedScore: relatedScore(record, item) }))
    .filter((item) => item._relatedScore > 0)
    .sort((a, b) => b._relatedScore - a._relatedScore || new Date(b.publishAt || b.date) - new Date(a.publishAt || a.date));
  const stronglyRelated = scored.filter((item) => hasRelatedSignal(record, item));
  const related = stronglyRelated.slice(0, 3);
  if (related.length >= 3) return related;
  const used = new Set(related.map((item) => item.slug));
  return [
    ...related,
    ...scored.filter((item) => !used.has(item.slug)).slice(0, 3 - related.length),
    ...readerFirstSort(fallbackPool.filter((item) => !used.has(item.slug))).slice(0, 3 - related.length)
  ].slice(0, 3);
}

function relatedDiagnostics(record, related) {
  return related.map((item) => ({
    title: item.title,
    sharedTags: sharedVisibleTags(record, item),
    sameCategory: item.category === record.category,
    sameTopic: Boolean(item.topic && item.topic === record.topic),
    familyOverlap: hasTopicFamilyOverlap(record, item)
  }));
}

function relatedSignalBadges(record, related) {
  const signals = related
    .flatMap((item) => {
      const diag = relatedDiagnostics(record, [item])[0];
      if (diag.sharedTags.length) return diag.sharedTags.slice(0, 2);
      if (diag.familyOverlap) return ["同主題"];
      if (diag.sameCategory) return [item.category];
      return [];
    })
    .filter(Boolean);
  return [...new Set(signals)].slice(0, 4);
}

function relatedSignalHtml(record, related) {
  const badges = relatedSignalBadges(record, related);
  if (!badges.length) return "";
  return `<div class="related-signal-row" aria-label="推薦依據">${badges.map((badge) => `<span>${escapeHtml(badge)}</span>`).join("")}</div>`;
}

function relatedDiagnosticScript(record, related) {
  const data = relatedDiagnostics(record, related);
  return `<script type="application/json" class="related-diagnostics">${JSON.stringify(data)}</script>`;
}

function relatedModuleHtml(meta, related, record) {
  const ui = articleUi(meta);
  if (!related.length) return "";
  const description = isEnglish(meta)
    ? "Continue with the most relevant Drugnews analysis on the same theme."
    : "這三篇會優先依主題、標籤與產業脈絡推薦，幫你把同一個問題讀得更完整。";
  return `<div class="article-next-reading next-reading">
    <h2>${ui.nextReading}</h2>
    <p>${description}</p>
    ${relatedSignalHtml(record, related)}
    <div class="article-list">${related.map((item) => articleCardHtml(item, item.external ? item.url : item.fileName)).join("")}</div>
    ${relatedDiagnosticScript(record, related)}
  </div>`;
}

function sourceRecordFromMeta(article) {
  const { meta } = article;
  return {
    ...meta,
    category: inferSeries(meta),
    topic: meta.topic || meta.category || inferSeries(meta),
    lang: meta.lang || "zh-Hant",
    tags: topicTags(meta.tags),
    text: [meta.title, meta.summary, article.markdown, ...topicTags(meta.tags)].join(" ")
  };
}

function articleIndexPage(records) {
  const displayRecords = readerFirstSort(records);
  const lead = displayRecords[0];
  const pageDescription = "Drugnews 文章中心提供生技醫藥公司研究、估值框架、BD 授權與資本市場判讀，協助讀者形成可驗證的商業判斷。";
  const pageSchema = collectionPageSchema({
    url: `${BASE_URL}/articles/`,
    name: "Drugnews 文章中心",
    description: pageDescription,
    records: displayRecords,
    prefix: "articles/"
  });
  const typeLinks = [...ACCESS_TYPES.keys()]
    .filter((access) => records.some((item) => accessLabel(item) === access))
    .map((access) => `<a href="type/${accessSlug(access)}.html">${escapeHtml(access)}</a>`)
    .join("");
  const entityLink = `<a href="../companies.html">公司與管線索引</a>`;
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
  <meta name="description" content="${escapeHtml(pageDescription)}">
  <link rel="canonical" href="${BASE_URL}/articles/">
  <link rel="icon" href="../favicon.svg">
  <link rel="stylesheet" href="../styles.css">
  <link rel="alternate" type="application/rss+xml" title="Drugnews RSS" href="${BASE_URL}/feed.xml">
  <link rel="alternate" type="application/feed+json" title="Drugnews JSON Feed" href="${BASE_URL}/feed.json">
  <link rel="search" type="application/opensearchdescription+xml" title="Drugnews Search" href="${BASE_URL}/opensearch.xml">
  <meta property="og:title" content="Drugnews｜文章中心">
  <meta property="og:description" content="生技醫藥公司研究、臨床開發、BD 授權、估值框架與資本市場判讀。">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${BASE_URL}/articles/">
  <meta property="og:site_name" content="Drugnews｜藥時事">
  ${lead?.image ? `<meta property="og:image" content="${absoluteUrl(lead.image)}">` : ""}
  <meta name="twitter:card" content="${lead?.image ? "summary_large_image" : "summary"}">
  <script type="application/ld+json">${JSON.stringify(pageSchema)}</script>
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
      ${seriesSwitchHtml(records)}
      <div class="library-links muted" aria-label="文章類型、公司索引與月份歸檔">${entityLink}${typeLinks}${monthLinks}</div>
      <div class="search-panel">
        <input class="search-box" data-search-input type="search" placeholder="搜尋公司、主題、估值、BD、IR...">
        <button class="button ghost search-clear" data-search-clear type="button" hidden>清除搜尋</button>
      </div>
      <div class="search-status" data-search-status aria-live="polite"></div>
      <div class="article-list" data-search-results style="margin-top:20px">${cards}</div>
    </div>
  </section>
</main>
${footerHtml()}
<script src="../search.js?v=20260628-reader-paths"></script>
</body>
</html>`;
}

function rootRelativeUrl(url = "") {
  return String(url).replace(/^\.\.\//, "");
}

function homePage(records) {
  const primaryItems = readerFirstSort(records.filter((item) => !item.external && accessLabel(item) === "免費文章" && /(Dcard|Facebook|FB)/i.test(item.source || "")));
  const fallbackItems = readerFirstSort(records.filter((item) => accessLabel(item) === "免費文章" && !primaryItems.some((picked) => picked.slug === item.slug)));
  const freeItems = [...primaryItems, ...fallbackItems];
  const lead = freeItems[0] || readerFirstSort(records)[0];
  const briefing = freeItems.filter((item) => !lead || item.slug !== lead.slug).slice(0, 4);
  const leadHref = lead?.external ? lead.url : lead?.url || "articles/";
  const leadImage = lead?.image ? rootRelativeUrl(lead.image) : "";
  const leadImageUrl = leadImage ? absoluteUrl(leadImage) : "";
  const leadCategory = lead?.category || "商業分析系列";
  const leadSummary = lead?.summary || "閱讀藥時事 Drugnews 的生技醫藥公司研究、估值框架、BD 授權、臨床開發與資本市場判讀。";
  const briefingHtml = briefing.map((item) => {
    const href = item.external ? item.url : item.url;
    const target = item.external ? ' target="_blank" rel="noopener"' : "";
    return `<a class="briefing-link" href="${escapeHtml(href)}"${target}><span>${escapeHtml(item.date)}</span><strong>${escapeHtml(item.title)}</strong></a>`;
  }).join("");
  const organizationSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${BASE_URL}/#organization`,
        name: "藥時事 Drugnews",
        alternateName: ["Drugnews", "藥時事", "藥時事官方網站"],
        url: `${BASE_URL}/`,
        logo: { "@type": "ImageObject", url: `${BASE_URL}/favicon.svg` },
        description: "藥時事 Drugnews 官方網站，專注生技醫藥商業分析、公司研究、授權交易、估值框架與資本市場判讀。",
        sameAs: [PAID_COLUMN_URL, FACEBOOK_URL, CMONEY_URL, DCARD_URL, "https://www.instagram.com/drugnews.com.tw/"],
        email: "drugnews.dr.pan@gmail.com",
        knowsAbout: [
          "生技醫藥商業分析",
          "biotech business analysis",
          "pharmaceutical business analysis",
          "clinical data interpretation",
          "biotech valuation",
          "BD licensing",
          "capital markets",
          "CMC risk",
          "drug development"
        ],
        founder: { "@type": "Person", name: "Dr. Jo-Fan Pan", jobTitle: "Founder" }
      },
      {
        "@type": "WebSite",
        "@id": `${BASE_URL}/#website`,
        name: "藥時事 Drugnews 官方網站",
        alternateName: ["Drugnews｜藥時事", "Drugnews", "藥時事"],
        url: `${BASE_URL}/`,
        inLanguage: "zh-Hant-TW",
        description: "藥時事 Drugnews 的生技醫藥商業分析主站。",
        publisher: { "@id": `${BASE_URL}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: `${BASE_URL}/articles/?q={search_term_string}`,
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@type": "ItemList",
        name: "Drugnews 最新免費文章",
        itemListElement: freeItems.slice(0, 5).map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: item.external ? item.url : `${BASE_URL}/${item.url}`,
          name: item.title
        }))
      }
    ]
  };

  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>藥時事 Drugnews 官方網站｜生技醫藥商業分析文章媒體</title>
  <meta name="description" content="藥時事 Drugnews 官方網站，專注生技醫藥商業分析、公司研究、估值框架、授權交易與資本市場判讀，協助讀者形成可驗證的商業判斷。">
  <meta name="keywords" content="藥時事, Drugnews, 生技醫藥, 生技投資, 生技估值, 公司研究, BD 授權, 臨床數據, CMC, IR, 資本市場">
  <link rel="canonical" href="${BASE_URL}/">
  <link rel="alternate" hreflang="zh-Hant" href="${BASE_URL}/">
  <link rel="alternate" hreflang="en" href="${BASE_URL}/en/">
  <link rel="alternate" hreflang="x-default" href="${BASE_URL}/">
  <link rel="icon" href="favicon.svg">
  <link rel="stylesheet" href="styles.css">
  <link rel="alternate" type="application/rss+xml" title="Drugnews RSS" href="${BASE_URL}/feed.xml">
  <link rel="alternate" type="application/feed+json" title="Drugnews JSON Feed" href="${BASE_URL}/feed.json">
  <link rel="search" type="application/opensearchdescription+xml" title="Drugnews Search" href="${BASE_URL}/opensearch.xml">
  <meta property="og:title" content="藥時事 Drugnews 官方網站｜生技醫藥商業分析文章媒體">
  <meta property="og:description" content="藥時事 Drugnews 專注生技醫藥商業分析、公司研究、估值框架、授權交易與資本市場判讀，協助讀者形成可驗證的商業判斷。">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${BASE_URL}/">
  <meta property="og:site_name" content="Drugnews｜藥時事">
  ${leadImageUrl ? `<meta property="og:image" content="${leadImageUrl}">` : ""}
  <meta name="twitter:card" content="${leadImageUrl ? "summary_large_image" : "summary"}">
  <script type="application/ld+json">${JSON.stringify(organizationSchema)}</script>
</head>
<body>
  <header class="site-header">
    <div class="container nav">
      <a class="brand" href="index.html"><img src="favicon.svg" alt=""><span>Drugnews｜藥時事</span></a>
      <input class="nav-toggle" id="site-nav-toggle" type="checkbox" aria-hidden="true">
      <label class="nav-menu-button" for="site-nav-toggle">選單</label>
      <nav class="nav-links" aria-label="Main navigation">
        <a href="index.html" aria-current="page">首頁</a>
        <a href="articles/">文章</a>
        <a href="topics/">主題</a>
        <a href="guides/">指南</a>
        <a href="subscribe.html">付費專欄</a>
        <a href="services.html">公司合作</a>
        <a href="en/">English</a>
      </nav>
    </div>
  </header>

  <main>
    <section class="home-hero">
      <div class="container masthead">
        <div>
          <p class="eyebrow">官方網站</p>
          <h1><span class="hero-title-unit">藥時事 Drugnews｜</span><span class="hero-title-unit">生技醫藥商業分析媒體</span></h1>
        </div>
        <div>
          <p>Drugnews｜藥時事從臨床數據、公司策略、授權交易與資本市場訊號中，拆解生技公司的商業判斷：哪些證據會改變價值，哪些里程碑值得追蹤，哪些敘事只是市場雜音。</p>
          <div class="audience-proof">
            <strong>37,000+</strong>
            <span>Facebook 粉絲，台灣生技商業分析社群中最受關注的媒體之一。</span>
          </div>
        </div>
      </div>
      <div class="container issue-bar" aria-label="閱讀入口">
        <a href="articles/">最新文章</a>
        <a href="articles/category/business-analysis.html">商業分析系列</a>
        <a href="topics/">熱門搜尋主題</a>
        <a href="guides/">研究指南</a>
        <a href="subscribe.html">付費專欄</a>
        <a href="services.html">公司合作</a>
      </div>
      <div class="container home-hero-grid">
        <a class="lead-story" id="lead-story" href="${escapeHtml(leadHref)}"${lead?.external ? ' target="_blank" rel="noopener"' : ""}>
          ${leadImage ? `<div class="featured-image"><img src="${escapeHtml(leadImage)}" alt="${escapeHtml(lead.imageAlt || lead.title)}" loading="eager"></div>` : ""}
          <div class="lead-story-body">
            <div class="meta"><span>本日主題</span><span>${escapeHtml(leadCategory)}</span></div>
            <h2>${escapeHtml(lead?.title || "最新文章")}</h2>
            <p>${escapeHtml(leadSummary)}</p>
            <span class="text-link">閱讀全文</span>
          </div>
        </a>
        <aside class="homepage-briefing" aria-label="最新文章快訊">
          <p class="eyebrow">近期閱讀</p>
          <h2>近期文章</h2>
          <div id="briefing-articles">${briefingHtml}</div>
          <a class="text-link" href="articles/">進入文章中心</a>
        </aside>
        <div class="editorial-note">
          <p class="eyebrow">分析範圍</p>
          <h2>從科學到市場，建立可驗證的商業判斷。</h2>
          <p class="coverage-copy">我們關注公司研究、臨床與 CMC、BD 授權、估值與資本市場訊號；重點不是把資料放在一起，而是判斷臨床證據能否轉化為商業價值、交易條款反映什麼產業競爭、資本市場為何重新定價一家公司。</p>
        </div>
      </div>
    </section>

    <section class="section" id="topics">
      <div class="container section-head">
        <div><h2>內容系列</h2></div>
      </div>
      <div class="container topic-guide">
        <div class="topic-guide-main">
          <a class="topic-row" href="articles/category/business-analysis.html"><span>01</span><div><h3>商業分析</h3><p>FB、Dcard 與網站免費文章，從公開事件拆解公司策略、臨床數據、交易訊號與資本市場判斷。</p></div></a>
          <a class="topic-row" href="articles/category/fundamental-analysis.html"><span>02</span><div><h3>基本面</h3><p>方格子付費專欄中的公司基本面追蹤，重點放在估值、營收、臨床里程碑與可驗證假設。</p></div></a>
          <a class="topic-row" href="articles/category/medical-conference.html"><span>03</span><div><h3>醫學大會</h3><p>ASCO、ESMO、AACR 等重要學會資料整理，協助讀者快速理解臨床數據與產業意義。</p></div></a>
          <a class="topic-row" href="articles/category/paid-deep-analysis.html"><span>04</span><div><h3>深度商業分析</h3><p>聚焦 BD、授權、產業策略、平台價值與資本市場重新定價，適合想深入追蹤的讀者。</p></div></a>
          <a class="topic-row" href="articles/category/big-pharma.html"><span>05</span><div><h3>製藥巨頭</h3><p>整理大型藥廠的管線取捨、併購邏輯、專利懸崖與全球競爭格局。</p></div></a>
        </div>
        <aside class="topic-guide-aside">
          <p class="eyebrow">閱讀路徑</p>
          <h3>先選系列，再回到問題。</h3>
          <p>免費文章適合跟上公開事件；付費系列則更適合系統追蹤公司基本面、產業策略與大型藥廠決策。每一篇文章都會標注所屬系列，方便回頭查找。</p>
          <div class="actions">
            <a class="button secondary" href="guides/">閱讀研究指南</a>
            <a class="button ghost" href="articles/">看全部文章</a>
          </div>
        </aside>
      </div>
    </section>

    <section class="section white">
      <div class="container section-head">
        <div>
          <p class="eyebrow">Topic Hubs</p>
          <h2>熱門搜尋主題</h2>
        </div>
        <p>把讀者最常搜尋的生技投資問題整理成入口頁，方便從一個關鍵字一路讀到相關案例。</p>
      </div>
      <div class="container topic-hub-grid compact">
        <a class="topic-hub-card" href="topics/biotech-investing.html"><span>投資框架</span><h2>生技投資</h2><p>從臨床證據、現金水位、授權交易到資本市場定價。</p></a>
        <a class="topic-hub-card" href="topics/biotech-valuation.html"><span>估值框架</span><h2>生技估值</h2><p>用 rNPV、SOTP、峰值銷售與成功率重建價值假設。</p></a>
        <a class="topic-hub-card" href="topics/bd-licensing.html"><span>交易判讀</span><h2>BD 授權</h2><p>拆解 upfront、milestone、royalty 與商業權利分配。</p></a>
        <a class="topic-hub-card" href="topics/clinical-data.html"><span>臨床判讀</span><h2>臨床數據</h2><p>理解 endpoint、對照組、安全性與資料是否足以改變價值。</p></a>
      </div>
    </section>

    <section class="section white">
      <div class="container newsletter">
        <div>
          <p class="eyebrow">付費專欄</p>
          <h2>在方格子訂閱 Drugnews 付費專欄</h2>
          <p>免費文章是理解公開事件的入口；真正完整的公司追蹤、估值框架與產業判斷，會整理在方格子付費專欄。訂閱後，你可以用更系統化的方式跟上生技醫藥資本市場的變化。</p>
        </div>
        <div class="actions">
          <a class="button primary" href="subscribe.html">了解付費專欄</a>
          <a class="button secondary" href="${FACEBOOK_URL}" target="_blank" rel="noopener">追蹤 Facebook</a>
          <a class="button secondary" href="${DCARD_URL}" target="_blank" rel="noopener">追蹤 Dcard</a>
          <a class="button secondary" href="${CMONEY_URL}" target="_blank" rel="noopener">股市爆料同學會</a>
        </div>
      </div>
    </section>

    <section class="section service-strip">
      <div class="container service-strip-inner">
        <div>
          <p class="eyebrow">公司合作</p>
          <h2>公司合作與 IR 內容服務</h2>
        </div>
        <p>若上市櫃、生醫新創、藥廠、CDMO 或醫療科技公司需要把研發、臨床、授權與商業化故事轉成清楚的資本市場判斷，可到合作分頁了解服務與案例。</p>
        <a class="button secondary" href="services.html">查看公司合作</a>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="container">© 2026 Drugnews. 內容僅供產業研究與知識分享，不構成投資、醫療、募資或個股建議。</div>
  </footer>

  <script>
    fetch("search-index.json", { cache: "no-store" }).then(r => r.json()).then(items => {
      const lead = document.getElementById("lead-story");
      const briefing = document.getElementById("briefing-articles");
      if (!items.length) return;
      const isSocialFree = (item) => !item.external && item.access === "免費文章" && /(Dcard|Facebook|FB)/i.test(item.source || "");
      const isReadableFree = (item) => item.access === "免費文章";
      const primaryItems = items.filter(isSocialFree);
      const freeItems = [
        ...primaryItems,
        ...items.filter((item) => isReadableFree(item) && !primaryItems.some((picked) => picked.slug === item.slug))
      ];
      const first = freeItems[0];
      if (lead && first) {
        const image = first.image ? first.image.replace(/^\\.\\.\\//, "") : "";
        lead.href = first.url;
        if (first.external) {
          lead.setAttribute("target", "_blank");
          lead.setAttribute("rel", "noopener");
        } else {
          lead.removeAttribute("target");
          lead.removeAttribute("rel");
        }
        lead.innerHTML = \`\${image ? \`<div class="featured-image"><img src="\${image}" alt="\${first.imageAlt || first.title}"></div>\` : ""}<div class="lead-story-body"><div class="meta"><span>本日主題</span><span>\${first.category}</span></div><h2>\${first.title}</h2><p>\${first.summary}</p><span class="text-link">閱讀全文</span></div>\`;
      }
      if (briefing) {
        briefing.innerHTML = freeItems.filter((item) => !first || item.slug !== first.slug).slice(0, 4).map(item => \`<a class="briefing-link" href="\${item.url}"\${item.external ? ' target="_blank" rel="noopener"' : ""}><span>\${item.date}</span><strong>\${item.title}</strong></a>\`).join("");
      }
    }).catch(() => {});
  </script>
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
  <link rel="alternate" type="application/feed+json" title="Drugnews JSON Feed" href="${BASE_URL}/feed.json">
  <link rel="search" type="application/opensearchdescription+xml" title="Drugnews Search" href="${BASE_URL}/opensearch.xml">
</head>
<body>
${nestedHeaderHtml("articles")}
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

function categoryPage(category, records, allRecords = records) {
  const slug = categorySlug(category);
  const sortedRecords = readerFirstSort(records);
  const cards = sortedRecords.map((item) => articleCardHtml(
    item,
    item.external ? item.url : `../${item.fileName}`,
    item.image.replace(/^\.\.\//, "../../")
  )).join("");
  const displayName = seriesDisplayName(category);
  const description = categoryDescription(category);
  const countLabel = `${records.length} 篇${category === "商業分析系列" ? "免費長文" : "文章"}`;
  const pageUrl = `${BASE_URL}/articles/category/${slug}.html`;
  const pageSchema = collectionPageSchema({
    url: pageUrl,
    name: `Drugnews ${displayName}`,
    description,
    records: sortedRecords,
    prefix: "articles/"
  });
  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(displayName)}｜Drugnews</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${pageUrl}">
  <link rel="icon" href="../../favicon.svg">
  <link rel="stylesheet" href="../../styles.css">
  <link rel="alternate" type="application/rss+xml" title="Drugnews RSS" href="${BASE_URL}/feed.xml">
  <link rel="alternate" type="application/feed+json" title="Drugnews JSON Feed" href="${BASE_URL}/feed.json">
  <link rel="search" type="application/opensearchdescription+xml" title="Drugnews Search" href="${BASE_URL}/opensearch.xml">
  <script type="application/ld+json">${JSON.stringify(pageSchema)}</script>
</head>
<body>
${nestedHeaderHtml("articles")}
<main>
  <section class="page-title series-title">
    <div class="container">
      <p class="eyebrow">內容系列</p>
      <h1>${escapeHtml(displayName)}</h1>
      <p>${escapeHtml(categoryDescription(category))}</p>
    </div>
  </section>
  <section class="section article-library series-page">
    <div class="container">
      ${seriesSwitchHtml(allRecords, category, "")}
      <div class="series-page-head">
        <div>
          <p class="eyebrow">${escapeHtml(countLabel)}</p>
          <h2>全部文章</h2>
        </div>
        <a class="text-link" href="../index.html">回文章中心</a>
      </div>
      <div class="article-list">${cards || '<p class="notice">尚無文章。</p>'}</div>
    </div>
  </section>
</main>
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
  <link rel="alternate" type="application/feed+json" title="Drugnews JSON Feed" href="${BASE_URL}/feed.json">
  <link rel="search" type="application/opensearchdescription+xml" title="Drugnews Search" href="${BASE_URL}/opensearch.xml">
</head>
<body>
${nestedHeaderHtml("articles")}
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

function latestRecordDate(records) {
  return records
    .map((item) => item.date)
    .filter(Boolean)
    .sort()
    .at(-1) || TODAY;
}

function sitemapEntry(loc, priority, lastmod = "") {
  return `  <url><loc>${BASE_URL}/${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}<priority>${priority}</priority></url>`;
}

function sitemap(records) {
  const latest = latestRecordDate(records);
  const staticUrls = [
    ["", "1.0", latest],
    ["articles/", "0.9", latest],
    ["en/", "0.85", latest],
    ["en/articles/", "0.75", latest],
    ["en/guides/", "0.7", latest],
    ["en/guides/clinical-endpoints.html", "0.7", latest],
    ["en/guides/regulatory-milestones.html", "0.7", latest],
    ["en/guides/biotech-valuation.html", "0.7", latest],
    ["en/guides/bd-licensing-terms.html", "0.7", latest],
    ["en/guides/safety-cmc-risk.html", "0.7", latest],
    ["en/guides/market-sizing.html", "0.7", latest],
    ["en/guides/patent-competition.html", "0.7", latest],
    ["en/guides/cash-runway.html", "0.7", latest],
    ["en/services.html", "0.65", latest],
    ["en/subscribe.html", "0.65", latest],
    ["en/team.html", "0.65", latest],
    ["topics/", "0.85", latest],
    ["topics/biotech-investing.html", "0.75", latest],
    ["topics/biotech-valuation.html", "0.75", latest],
    ["topics/bd-licensing.html", "0.75", latest],
    ["topics/clinical-data.html", "0.75", latest],
    ["topics/cmc.html", "0.75", latest],
    ["topics/drug-development.html", "0.75", latest],
    ["topics/big-pharma.html", "0.75", latest],
    ["topics/glp1.html", "0.75", latest],
    ["market-radar.html", "0.85", latest],
    ["market-radar.json", "0.5", latest],
    ["brand-profile.json", "0.5", latest],
    ["companies.html", "0.75", latest],
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
    ["team.html", "0.7"],
    ["llms.txt", "0.5", latest],
    ["ai-index.json", "0.5", latest],
    ["feed.json", "0.5", latest],
    ["knowledge-graph.json", "0.5", latest],
    ["opensearch.xml", "0.4"]
  ];
  const urls = staticUrls.map(([loc, priority, lastmod]) => sitemapEntry(loc, priority, lastmod));
  for (const access of ACCESS_TYPES.keys()) {
    if (!records.some((item) => accessLabel(item) === access)) continue;
    const accessDate = latestRecordDate(records.filter((item) => accessLabel(item) === access));
    urls.push(sitemapEntry(`articles/type/${accessSlug(access)}.html`, "0.7", accessDate));
  }
  for (const category of SERIES.keys()) {
    const categoryDate = latestRecordDate(records.filter((item) => item.category === category));
    urls.push(sitemapEntry(`articles/category/${categorySlug(category)}.html`, "0.6", categoryDate));
  }
  for (const key of new Set(records.map((item) => monthKey(item.date)))) {
    const archiveDate = latestRecordDate(records.filter((item) => monthKey(item.date) === key));
    urls.push(sitemapEntry(`articles/archive/${key}.html`, "0.7", archiveDate));
  }
  for (const item of records.filter((record) => !record.external)) {
    const alternates = sitemapAlternates(item);
    urls.push(`  <url><loc>${BASE_URL}/${item.url}</loc><lastmod>${item.date}</lastmod><priority>0.8</priority>${alternates}</url>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join("\n")}\n</urlset>\n`;
}

function newsLanguage(item) {
  return isEnglish(item) ? "en" : "zh-tw";
}

function newsPublicationDate(item) {
  const value = item.publishAt || `${item.date}T08:00:00+08:00`;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function newsSitemap(records) {
  const now = new Date();
  const cutoff = now.getTime() - (48 * 60 * 60 * 1000);
  const items = records
    .filter((item) => !item.external)
    .map((item) => ({ item, published: new Date(item.publishAt || `${item.date}T08:00:00+08:00`) }))
    .filter(({ published }) => !Number.isNaN(published.getTime()))
    .filter(({ published }) => published.getTime() >= cutoff && published.getTime() <= now.getTime() + (60 * 60 * 1000))
    .sort((a, b) => b.published.getTime() - a.published.getTime())
    .slice(0, 100)
    .map(({ item }) => `  <url>
    <loc>${escapeXml(`${BASE_URL}/${item.url}`)}</loc>
    <news:news>
      <news:publication>
        <news:name>Drugnews｜藥時事</news:name>
        <news:language>${newsLanguage(item)}</news:language>
      </news:publication>
      <news:publication_date>${newsPublicationDate(item)}</news:publication_date>
      <news:title>${escapeXml(item.title)}</news:title>
    </news:news>
  </url>`);

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n${items.join("\n")}\n</urlset>\n`;
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

function jsonFeed(records) {
  const items = records.slice(0, 50).map((item) => {
    const url = item.external ? item.url : `${BASE_URL}/${item.url}`;
    const imageUrl = item.image ? absoluteUrl(item.image) : "";
    return {
      id: url,
      url,
      external_url: item.external ? item.url : undefined,
      title: item.title,
      summary: item.summary || "",
      content_text: stripMarkdown(item.text || item.summary || "").slice(0, 4000),
      image: imageUrl || undefined,
      banner_image: imageUrl || undefined,
      date_published: new Date(item.publishAt || `${item.date}T00:00:00+08:00`).toISOString(),
      tags: visibleDisplayTags(item.tags || []).slice(0, 10),
      language: item.lang || "zh-Hant",
      authors: [{
        name: isEnglish(item) ? "Drugnews Editorial Team" : "Drugnews 編輯部",
        url: `${BASE_URL}/team.html`
      }]
    };
  });
  return `${JSON.stringify({
    version: "https://jsonfeed.org/version/1.1",
    title: "Drugnews｜藥時事",
    home_page_url: `${BASE_URL}/`,
    feed_url: `${BASE_URL}/feed.json`,
    description: "生技醫藥公司研究、臨床開發、BD 授權、估值框架與資本市場觀察。",
    language: "zh-Hant-TW",
    icon: `${BASE_URL}/favicon.svg`,
    favicon: `${BASE_URL}/favicon.svg`,
    authors: [{ name: "Drugnews｜藥時事", url: `${BASE_URL}/team.html` }],
    items
  }, null, 2)}\n`;
}

function llmsText(records) {
  const latest = records
    .filter((item) => !item.external)
    .slice(0, 14)
    .map((item) => {
      const tags = (item.tags || []).slice(0, 5).join(", ");
      const url = `${BASE_URL}/${item.url}`;
      const summary = String(item.summary || "").replace(/\s+/g, " ").trim();
      return `- ${item.date}｜${item.title}\n  URL: ${url}\n  Topics: ${tags || item.category}\n  Summary: ${summary}`;
    })
    .join("\n");

  return `# Drugnews｜藥時事

Drugnews is a Taiwan-based biotech and pharmaceutical business-analysis media platform. The site publishes Traditional Chinese and English long-form analysis on clinical data, company strategy, drug development, licensing, valuation, CMC, and biotech capital-market signals.

## Primary Audience

- Biotech and pharmaceutical investors
- Biotech executives and IR teams
- Business-development and licensing professionals
- Readers who need structured interpretation of clinical, commercial, and capital-market signals

## Core Editorial Positioning

Drugnews focuses on business judgment, not headline aggregation. Articles connect science, clinical evidence, regulatory risk, manufacturing, commercial strategy, licensing terms, valuation logic, and investor perception.

## Official Identity And AI-Readable Feeds

- Official website: ${BASE_URL}/
- Facebook page: ${FACEBOOK_URL}
- Dcard profile: ${DCARD_URL}
- Paid research on Vocus: ${PAID_COLUMN_URL}
- CMoney profile: ${CMONEY_URL}
- Brand profile: ${BASE_URL}/brand-profile.json
- AI index: ${BASE_URL}/ai-index.json
- Knowledge graph: ${BASE_URL}/knowledge-graph.json
- Capital-market radar: ${BASE_URL}/market-radar.json
- RSS feed: ${BASE_URL}/feed.xml
- JSON feed: ${BASE_URL}/feed.json
- Sitemap: ${BASE_URL}/sitemap.xml

## Latest Canonical Articles For Citation

${latest}

## Key Site Sections

- Home: ${BASE_URL}/
- Articles: ${BASE_URL}/articles/
- English edition: ${BASE_URL}/en/
- Investor guides: ${BASE_URL}/guides/
- Paid research: ${BASE_URL}/subscribe.html
- Company services: ${BASE_URL}/services.html
- Team: ${BASE_URL}/team.html
- Sitemap: ${BASE_URL}/sitemap.xml
- RSS feed: ${BASE_URL}/feed.xml
- JSON feed: ${BASE_URL}/feed.json
- AI index: ${BASE_URL}/ai-index.json
- Knowledge graph: ${BASE_URL}/knowledge-graph.json
- Brand profile: ${BASE_URL}/brand-profile.json
- Capital-market radar: ${BASE_URL}/market-radar.html

## Topic Hubs

- Biotech Investing: ${BASE_URL}/topics/biotech-investing.html
- Biotech Valuation: ${BASE_URL}/topics/biotech-valuation.html
- Clinical Data: ${BASE_URL}/topics/clinical-data.html
- BD / Licensing: ${BASE_URL}/topics/bd-licensing.html
- CMC: ${BASE_URL}/topics/cmc.html
- Drug Development: ${BASE_URL}/topics/drug-development.html
- GLP-1: ${BASE_URL}/topics/glp1.html
- Big Pharma: ${BASE_URL}/topics/big-pharma.html

## Paid Research And Company Services

- Paid research subscription: ${BASE_URL}/subscribe.html
- Company IR and content services: ${BASE_URL}/services.html
- Business collaboration contact: drugnews.dr.pan@gmail.com

Drugnews' free articles explain public events and market signals. Paid research and company services go deeper into company follow-up, valuation logic, licensing interpretation, investor education, and biotech IR content strategy.

## Source And Citation Guidance

When referencing Drugnews content, cite the article title, Drugnews｜藥時事, publication date, and canonical URL. Articles are for industry research and knowledge sharing only and do not constitute investment, medical, fundraising, or individual stock advice.
`;
}

function aiIndex(records) {
  const latest = records.slice(0, 50).map((item) => ({
    title: item.title,
    date: item.date,
    language: item.lang || "zh-Hant",
    url: item.external ? item.url : `${BASE_URL}/${item.url}`,
    canonical_url: item.external ? item.url : `${BASE_URL}/${item.url}`,
    source: item.source || "Website",
    access: accessLabel(item),
    category: item.category,
    tags: visibleDisplayTags(item.tags || []).slice(0, 10),
    summary: item.summary || "",
    image: item.image ? absoluteUrl(item.image) : "",
    is_accessible_for_free: accessLabel(item) === "免費文章",
    is_external: Boolean(item.external),
    alternate_language_versions: item.translations || {}
  }));

  const topicHubs = [
    ["Biotech Investing", "biotech-investing"],
    ["Biotech Valuation", "biotech-valuation"],
    ["Clinical Data", "clinical-data"],
    ["BD / Licensing", "bd-licensing"],
    ["CMC", "cmc"],
    ["Drug Development", "drug-development"],
    ["GLP-1", "glp1"],
    ["Big Pharma", "big-pharma"]
  ].map(([name, slug]) => ({
    name,
    url: `${BASE_URL}/topics/${slug}.html`
  }));

  const payload = {
    schema_version: "1.0",
    name: "Drugnews｜藥時事",
    url: `${BASE_URL}/`,
    language: ["zh-Hant", "en"],
    description: "Taiwan-based biotech and pharmaceutical business-analysis media covering clinical data, company strategy, drug development, BD/licensing, valuation, CMC, and biotech capital-market signals.",
    editorial_positioning: "Drugnews focuses on business judgment rather than headline aggregation, connecting science, clinical evidence, regulatory risk, manufacturing, commercial strategy, licensing terms, valuation logic, and investor perception.",
    audience: [
      "biotech and pharmaceutical investors",
      "biotech executives and IR teams",
      "business-development and licensing professionals",
      "readers learning how to interpret biotech commercial and capital-market signals"
    ],
    key_sections: [
      { name: "Home", url: `${BASE_URL}/` },
      { name: "Articles", url: `${BASE_URL}/articles/` },
      { name: "Capital-market radar", url: `${BASE_URL}/market-radar.html` },
      { name: "English edition", url: `${BASE_URL}/en/` },
      { name: "Investor guides", url: `${BASE_URL}/guides/` },
      { name: "Paid research", url: `${BASE_URL}/subscribe.html` },
      { name: "Company services", url: `${BASE_URL}/services.html` },
      { name: "Team", url: `${BASE_URL}/team.html` },
      { name: "Company index", url: `${BASE_URL}/companies.html` }
    ],
    topic_hubs: topicHubs,
    feeds: {
      sitemap: `${BASE_URL}/sitemap.xml`,
      news_sitemap: `${BASE_URL}/news-sitemap.xml`,
      rss: `${BASE_URL}/feed.xml`,
      json_feed: `${BASE_URL}/feed.json`,
      llms_txt: `${BASE_URL}/llms.txt`,
      knowledge_graph: `${BASE_URL}/knowledge-graph.json`,
      market_radar: `${BASE_URL}/market-radar.json`,
      brand_profile: `${BASE_URL}/brand-profile.json`
    },
    citation_guidance: "When referencing Drugnews content, cite the article title, Drugnews｜藥時事, publication date, and canonical URL. Articles are for industry research and knowledge sharing only and do not constitute investment, medical, fundraising, or individual stock advice.",
    latest_articles: latest
  };

  return `${JSON.stringify(payload, null, 2)}\n`;
}

function brandProfileJson(records) {
  const latest = latestRecordDate(records);
  const payload = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${BASE_URL}/#organization`,
    schema_version: "1.0",
    generated_at: new Date().toISOString(),
    name: "藥時事 Drugnews",
    alternateName: [
      "Drugnews",
      "Drugnews｜藥時事",
      "藥時事",
      "藥時事官方網站"
    ],
    url: `${BASE_URL}/`,
    logo: `${BASE_URL}/favicon.svg`,
    foundingLocation: "Taiwan",
    areaServed: ["Taiwan", "Global biotech and pharmaceutical capital markets"],
    inLanguage: ["zh-Hant-TW", "en"],
    description: "藥時事 Drugnews 是台灣生技醫藥商業分析文章媒體，專注臨床數據、公司策略、BD 授權、估值、CMC、製藥巨頭策略與資本市場訊號。",
    positioning: "Drugnews does not only aggregate biotech news. It interprets whether clinical evidence can become commercial value, how licensing terms reflect industry competition, and why capital markets reprice biotech companies.",
    slogan: "生技醫藥商業分析媒體",
    publishingPrinciples: `${BASE_URL}/about.html`,
    audience: [
      "生技醫藥投資人",
      "biotech and pharmaceutical investors",
      "上市櫃生醫公司經營與 IR 團隊",
      "BD/licensing professionals",
      "readers learning biotech business analysis"
    ],
    knowsAbout: [
      "生技醫藥商業分析",
      "biotech business analysis",
      "clinical data interpretation",
      "biotech valuation",
      "BD licensing",
      "CMC risk",
      "capital markets",
      "drug development",
      "big-pharma strategy"
    ],
    founder: {
      "@type": "Person",
      name: "Dr. Jo-Fan Pan",
      jobTitle: "Founder"
    },
    sameAs: [FACEBOOK_URL, DCARD_URL, PAID_COLUMN_URL, CMONEY_URL, "https://www.instagram.com/drugnews.com.tw/"],
    contactPoint: {
      "@type": "ContactPoint",
      email: "drugnews.dr.pan@gmail.com",
      contactType: "business collaboration"
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Drugnews paid research and biotech IR services",
      itemListElement: [
        {
          "@type": "Offer",
          name: "Drugnews paid research subscription",
          url: `${BASE_URL}/subscribe.html`,
          category: "Paid biotech and pharmaceutical business analysis"
        },
        {
          "@type": "Offer",
          name: "Biotech IR content and capital-market narrative service",
          url: `${BASE_URL}/services.html`,
          category: "Company IR content service"
        },
        {
          "@type": "Offer",
          name: "Pipeline valuation and licensing-term interpretation",
          url: `${BASE_URL}/subscribe.html`,
          category: "Biotech valuation research"
        }
      ]
    },
    potentialAction: [
      {
        "@type": "SubscribeAction",
        target: `${BASE_URL}/subscribe.html`,
        name: "Subscribe to Drugnews paid research"
      },
      {
        "@type": "CommunicateAction",
        target: `mailto:drugnews.dr.pan@gmail.com`,
        name: "Contact Drugnews for company collaboration"
      },
      {
        "@type": "SearchAction",
        target: `${BASE_URL}/articles/?q={search_term_string}`,
        "query-input": "required name=search_term_string"
      }
    ],
    mainEntityOfPage: `${BASE_URL}/`,
    latestArticleDate: latest,
    officialFeeds: {
      articles: `${BASE_URL}/articles/`,
      ai_index: `${BASE_URL}/ai-index.json`,
      knowledge_graph: `${BASE_URL}/knowledge-graph.json`,
      market_radar: `${BASE_URL}/market-radar.json`,
      rss: `${BASE_URL}/feed.xml`,
      sitemap: `${BASE_URL}/sitemap.xml`,
      news_sitemap: `${BASE_URL}/news-sitemap.xml`,
      llms_txt: `${BASE_URL}/llms.txt`
    },
    citationGuidance: "When citing Drugnews, use the canonical URL, article title, publication date, and publisher name Drugnews｜藥時事. Content is for industry research and knowledge sharing only."
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}

function classifyEntity(name = "") {
  const value = String(name).toLowerCase();
  if (/ras|kras|prmt5|mat2a|glp-?1|pd-?1|vegf|jak|car-?t|adc|protac|bcr|abl|ox2r|a[a]?td|lp\(a\)|cmc|rnpv|sotp/.test(value)) return "biotech_concept_or_target";
  if (/lilly|novo|merck|gsk|bms|pfizer|roche|takeda|amgen|biogen|novartis|sanofi|revolution|senhwa|寶泰|安宏|麗寶|生華|智新|環球|protect|anhorn/.test(value)) return "company";
  if (/臨床|clinical|phase|fda|pdufa|crl|bd|授權|估值|valuation|capital|生技投資|商業|製藥巨頭|big pharma/.test(value)) return "market_topic";
  return "topic";
}

function entityIndex(records) {
  const entities = new Map();
  for (const item of records.filter((record) => !record.external).slice(0, 120)) {
    const names = visibleDisplayTags(item.tags || []);
    for (const name of names) {
      const key = String(name).trim();
      if (!key || key.length > 48) continue;
      const current = entities.get(key) || {
        name: key,
        type: classifyEntity(key),
        mentions: 0,
        latest_date: item.date,
        latest_articles: []
      };
      current.mentions += 1;
      if (String(item.date) > String(current.latest_date)) current.latest_date = item.date;
      if (current.latest_articles.length < 5) {
        current.latest_articles.push({
          title: item.title,
          date: item.date,
          url: `${BASE_URL}/${item.url}`,
          language: item.lang || "zh-Hant"
        });
      }
      entities.set(key, current);
    }
  }
  return [...entities.values()]
    .sort((a, b) => b.mentions - a.mentions || String(b.latest_date).localeCompare(String(a.latest_date)) || a.name.localeCompare(b.name, "zh-Hant"))
    .slice(0, 80);
}

function marketSignals(records) {
  const signalPattern = /BD|授權|併購|估值|rNPV|SOTP|臨床數據|Phase|FDA|PDUFA|CRL|CMC|GLP-1|RAS|PRMT5|MAT2A|AI|製藥巨頭|Big Pharma|capital|valuation|licensing/i;
  return records
    .filter((item) => !item.external)
    .filter((item) => signalPattern.test(`${item.title} ${item.summary} ${(item.tags || []).join(" ")}`))
    .slice(0, 30)
    .map((item) => ({
      title: item.title,
      date: item.date,
      url: `${BASE_URL}/${item.url}`,
      language: item.lang || "zh-Hant",
      category: item.category,
      access: accessLabel(item),
      tags: visibleDisplayTags(item.tags || []).slice(0, 8),
      summary: item.summary || ""
    }));
}

function signalBucket(item) {
  const haystack = `${item.title} ${item.summary} ${(item.tags || []).join(" ")}`;
  if (/GLP-?1|肥胖|減重|tirzepatide|semaglutide|retatrutide/i.test(haystack)) return "GLP-1 與代謝賽道";
  if (/RAS|KRAS|PRMT5|MAT2A|腫瘤|oncology|cancer/i.test(haystack)) return "腫瘤精準治療";
  if (/AI|人工智慧|PROTAC|Zasocitinib/i.test(haystack)) return "AI 製藥與新技術";
  if (/CMC|製造|產能|CDMO|供應鏈|commercial/i.test(haystack)) return "CMC / 商業化風險";
  if (/BD|授權|licensing|upfront|milestone|royalty|併購|M&A/i.test(haystack)) return "BD / 授權與併購";
  if (/估值|valuation|rNPV|SOTP|峰值銷售|capital|市值|資本市場/i.test(haystack)) return "估值與資本市場";
  if (/臨床|clinical|Phase|ORR|PFS|OS|FDA|PDUFA|CRL|安全性|safety/i.test(haystack)) return "臨床與法規催化";
  if (/製藥巨頭|Big Pharma|Merck|GSK|Lilly|Novo|Pfizer|Roche|BMS|Takeda/i.test(haystack)) return "製藥巨頭策略";
  return "其他市場訊號";
}

function groupedMarketSignals(records) {
  const buckets = new Map();
  for (const item of marketSignals(records)) {
    const bucket = signalBucket(item);
    if (!buckets.has(bucket)) buckets.set(bucket, []);
    buckets.get(bucket).push(item);
  }
  return buckets;
}

function marketRadarJson(records) {
  const buckets = groupedMarketSignals(records);
  return `${JSON.stringify({
    schema_version: "1.0",
    generated_at: new Date().toISOString(),
    name: "Drugnews Biotech Capital-Market Radar",
    url: `${BASE_URL}/market-radar.html`,
    description: "Latest Drugnews articles grouped by biotech capital-market signals such as BD/licensing, valuation, clinical catalysts, CMC risk, GLP-1, oncology precision medicine, AI drug development, and big-pharma strategy.",
    buckets: [...buckets.entries()].map(([name, items]) => ({ name, count: items.length, articles: items }))
  }, null, 2)}\n`;
}

function localHrefFromAbsolute(url = "") {
  return String(url).startsWith(`${BASE_URL}/`) ? String(url).slice(BASE_URL.length + 1) : url;
}

function rootHeaderHtml(current = "") {
  const links = [
    ["index.html", "首頁", "home"],
    ["articles/", "文章", "articles"],
    ["topics/", "主題", "topics"],
    ["guides/", "指南", "guides"],
    ["subscribe.html", "付費專欄", "subscribe"],
    ["services.html", "公司合作", "services"],
    ["en/", "English", "language"]
  ];
  const nav = links
    .map(([href, label, key]) => `<a href="${href}"${current === key ? ' aria-current="page"' : ""}>${label}</a>`)
    .join("");
  return `<header class="site-header">
  <div class="container nav">
    <a class="brand" href="index.html"><img src="favicon.svg" alt=""><span>Drugnews｜藥時事</span></a>
    <input class="nav-toggle" id="site-nav-toggle" type="checkbox" aria-hidden="true">
    <label class="nav-menu-button" for="site-nav-toggle">選單</label>
    <nav class="nav-links" aria-label="Main navigation">${nav}</nav>
  </div>
</header>`;
}

function marketRadarPage(records) {
  const buckets = groupedMarketSignals(records);
  const signals = marketSignals(records);
  const bucketHtml = [...buckets.entries()].map(([name, items]) => {
    const links = items.slice(0, 6).map((item) => `<a class="radar-item" href="${escapeHtml(localHrefFromAbsolute(item.url))}">
      <span>${escapeHtml(item.date)} · ${escapeHtml(item.category)}</span>
      <strong>${escapeHtml(item.title)}</strong>
      <p>${escapeHtml(item.summary)}</p>
      <div class="tag-row">${(item.tags || []).slice(0, 5).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
    </a>`).join("");
    return `<section class="radar-bucket">
      <div class="radar-bucket-head"><h2>${escapeHtml(name)}</h2><span>${items.length} 篇</span></div>
      <div class="radar-list">${links}</div>
    </section>`;
  }).join("");
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Drugnews 資本市場雷達",
    url: `${BASE_URL}/market-radar.html`,
    description: "藥時事把最新生技醫藥文章整理成 BD、估值、臨床、CMC、GLP-1、腫瘤精準治療、AI 製藥與製藥巨頭策略等資本市場訊號。",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: signals.slice(0, 20).map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: item.url,
        name: item.title
      }))
    }
  };
  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>資本市場雷達｜Drugnews 藥時事</title>
  <meta name="description" content="藥時事資本市場雷達把最新生技醫藥文章整理成 BD、估值、臨床、CMC、GLP-1、腫瘤精準治療、AI 製藥與製藥巨頭策略等市場訊號。">
  <link rel="canonical" href="${BASE_URL}/market-radar.html">
  <link rel="icon" href="favicon.svg">
  <link rel="stylesheet" href="styles.css">
  <link rel="alternate" type="application/rss+xml" title="Drugnews RSS" href="${BASE_URL}/feed.xml">
  <link rel="alternate" type="application/feed+json" title="Drugnews JSON Feed" href="${BASE_URL}/feed.json">
  <link rel="search" type="application/opensearchdescription+xml" title="Drugnews Search" href="${BASE_URL}/opensearch.xml">
  <script type="application/ld+json">${JSON.stringify(schema)}</script>
</head>
<body>
${rootHeaderHtml("market-radar")}
<main>
  <section class="page-title insights-title"><div class="container"><p class="eyebrow">Market Radar</p><h1>資本市場雷達</h1><p>把最新文章重新整理成投資人最常追蹤的市場訊號：BD、估值、臨床催化、CMC、GLP-1、腫瘤精準治療、AI 製藥與製藥巨頭策略。</p></div></section>
  <section class="section article-library"><div class="container radar-grid">${bucketHtml}</div></section>
</main>
${footerHtml()}
</body>
</html>`;
}

function knowledgeGraph(records) {
  const latestRecords = records.filter((item) => !item.external).slice(0, 30);
  const payload = {
    schema_version: "1.0",
    generated_at: new Date().toISOString(),
    site: {
      name: "Drugnews｜藥時事",
      url: `${BASE_URL}/`,
      languages: ["zh-Hant", "en"],
      description: "Taiwan biotech and pharmaceutical business-analysis media focused on clinical data, company strategy, BD/licensing, valuation, CMC, and capital-market judgment.",
      same_as: [FACEBOOK_URL, DCARD_URL, PAID_COLUMN_URL, CMONEY_URL],
      contact: "drugnews.dr.pan@gmail.com"
    },
    editorial_focus: [
      "biotech business analysis",
      "clinical data interpretation",
      "biotech valuation and capital-market signals",
      "BD and licensing strategy",
      "CMC and manufacturing risk",
      "big-pharma strategy and M&A",
      "Taiwan biotech company research"
    ],
    audience: [
      "biotech investors",
      "pharmaceutical business-development teams",
      "listed-company IR and management teams",
      "readers learning biotech investing fundamentals",
      "AI search and answer engines that need citable biotech business context"
    ],
    citation_guidance: "Use the canonical article URL, title, publication date, and Drugnews｜藥時事 as source. Content is for industry research and knowledge sharing only and is not investment, medical, fundraising, or individual stock advice.",
    feeds: {
      sitemap: `${BASE_URL}/sitemap.xml`,
      news_sitemap: `${BASE_URL}/news-sitemap.xml`,
      rss: `${BASE_URL}/feed.xml`,
      json_feed: `${BASE_URL}/feed.json`,
      llms_txt: `${BASE_URL}/llms.txt`,
      ai_index: `${BASE_URL}/ai-index.json`,
      market_radar: `${BASE_URL}/market-radar.json`,
      brand_profile: `${BASE_URL}/brand-profile.json`
    },
    latest_articles: latestRecords.map((item) => ({
      title: item.title,
      date: item.date,
      language: item.lang || "zh-Hant",
      url: `${BASE_URL}/${item.url}`,
      category: item.category,
      access: accessLabel(item),
      tags: visibleDisplayTags(item.tags || []).slice(0, 10),
      summary: item.summary || "",
      alternate_language_versions: item.translations || {}
    })),
    entities: entityIndex(records),
    market_attention_signals: marketSignals(records)
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
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
  const publishedErrors = published.flatMap((article) => {
    const articleErrors = validateSocialCoverPolicy(article);
    return articleErrors.length ? [{ folder: article.folderName, errors: articleErrors }] : [];
  });
  if (publishedErrors.length) {
    await writeAtomic(ERRORS_FILE, JSON.stringify({ generated_at: new Date().toISOString(), errors: publishedErrors }, null, 2));
    console.error(`Publishing stopped. See ${path.relative(ROOT, ERRORS_FILE)}`);
    process.exitCode = 1;
    return;
  }

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
    const related = pickRelatedArticles(record, allRecords);
    const bodyMarkdown = stripLeadingTitle(article.markdown.replace(DISCLAIMER, "").trim(), article.meta.title);
    const body = markdownToHtml(bodyMarkdown, article.imageMap);
    await writeAtomic(path.join(ARTICLES, record.fileName), articlePage(article, body, related));
  }

  await writeAtomic(path.join(ARTICLES, "index.html"), articleIndexPage(zhRecords));
  await writeAtomic(path.join(ROOT, "index.html"), homePage(zhRecords));
  for (const category of SERIES.keys()) {
    const categoryRecords = zhRecords.filter((item) => item.category === category);
    const categoryFile = path.join(ARTICLES, "category", `${categorySlug(category)}.html`);
    await writeAtomic(categoryFile, categoryPage(category, categoryRecords, zhRecords));
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
  await writeAtomic(path.join(ROOT, "market-radar.html"), marketRadarPage(allRecords));
  await writeAtomic(path.join(ROOT, "market-radar.json"), marketRadarJson(allRecords));
  await writeAtomic(path.join(ROOT, "brand-profile.json"), brandProfileJson(allRecords));
  await writeAtomic(path.join(ROOT, "sitemap.xml"), sitemap(allRecords));
  await writeAtomic(path.join(ROOT, "news-sitemap.xml"), newsSitemap(allRecords));
  await writeAtomic(path.join(ROOT, "feed.xml"), rssFeed(zhRecords));
  await writeAtomic(path.join(ROOT, "feed.json"), jsonFeed(zhRecords));
  await writeAtomic(path.join(ROOT, "llms.txt"), llmsText(allRecords));
  await writeAtomic(path.join(ROOT, "ai-index.json"), aiIndex(allRecords));
  await writeAtomic(path.join(ROOT, "knowledge-graph.json"), knowledgeGraph(allRecords));
  await writeAtomic(ERRORS_FILE, JSON.stringify({ generated_at: new Date().toISOString(), errors: [] }, null, 2));

  console.log(`Published ${due.length} inbox article(s). Total articles: ${allRecords.length}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
