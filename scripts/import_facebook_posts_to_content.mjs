import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const PUBLISHED = path.join(ROOT, "content", "published");
const DISCLAIMER = "本文僅供產業研究與知識分享，不構成投資、醫療、募資或個股建議。";

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node scripts/import_facebook_posts_to_content.mjs /path/to/facebook-posts.json");
  process.exit(1);
}

const PUBLIC_IMPORT_BLOCKLIST = [
  ["使用者", /使用者/u],
  ["內部工作語", /內部(?:素材|備註|線索|草稿|使用|文件|流程|PM|SOP|排程|溝通|操作)/u],
  ["Prompt", /prompt/i],
  ["【圖片插入】", /【圖片插入/u],
  ["待最後確認", /待最後確認/u],
  ["QA", /(?:^|\n)\s*(?:#{1,6}\s*)?QA\b|品質檢查|檢查清單/iu],
  ["送出前", /送出前/u],
  ["raw markdown", /raw\s*markdown/i],
  ["code fence", /```/],
  ["mp.weixin.qq.com", /mp\.weixin\.qq\.com/i],
  ["三平台發文包章節", /(?:^|\n)\s*[A-G]\s*[｜|]\s*(?:FB|Dcard|CMoney|方格子|圖片|QA|排程|Checklist|檢查)/iu],
  ["排程備註", /排程|已排程|發文時間|送出時間/u],
  ["CMoney checklist", /CMoney[\s\S]{0,80}(?:checklist|檢查清單)|(?:checklist|檢查清單)[\s\S]{0,80}CMoney/iu]
];

function assertPublicArticlePayload(post, platform) {
  const payload = [
    post.title || "",
    post.articleText || "",
    post.summary || "",
    post.notes || ""
  ].join("\n");
  const hits = PUBLIC_IMPORT_BLOCKLIST
    .filter(([, re]) => re.test(payload))
    .map(([label]) => label);
  if (!hits.length) return;
  const title = cleanTitle(post.title || "(untitled)");
  throw new Error([
    `${platform} import blocked before publishing: ${title}`,
    `Matched non-public production markers: ${hits.join(", ")}`,
    "Route this item back to PM and provide only the public long-form article, public images, references, and disclaimer."
  ].join("\n"));
}

function postId(url) {
  const value = String(url || "");
  return value.match(/[?&]story_fbid=([^&]+)/)?.[1] ||
    value.match(/[?&]set=pcb\.([^&]+)/)?.[1] ||
    value.match(/[?&]fbid=([^&]+)/)?.[1] ||
    "";
}

function slugify(title, fallback) {
  const ascii = String(title || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/glp\s*[-–]\s*1/gi, "glp-1")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  if (!ascii || ascii.length < 8 || /^[0-9-]+$/.test(ascii)) return fallback;
  return ascii;
}

function localDate(iso) {
  const date = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Taipei"
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function cleanTitle(title) {
  return String(title || "")
    .replace(/\s*\|\s*Drugnews.*$/iu, "")
    .replace(/\s*\|\s*藥時事.*$/u, "")
    .trim();
}

function isBadTitle(title) {
  const text = String(title || "").trim();
  if (!text) return true;
  if (/^[-–—_\s]{5,}$/.test(text)) return true;
  if (/^[-–—_\s]{5,}/.test(text)) return true;
  if (/^(Facebook|藥時事|Drugnews Facebook post)$/i.test(text)) return true;
  return false;
}

function inferTitleFromLines(lines) {
  const heading = lines
    .map((line) => String(line || "").trim())
    .find((line) => /^##\s+/.test(line) && line.replace(/^##\s+/, "").length >= 10);
  if (heading) return heading.replace(/^##\s+/, "").trim();
  return lines.find((line) =>
    line.length >= 12 &&
    line.length <= 90 &&
    !/^[-–—_\s]{5,}$/.test(line) &&
    !/^https?:\/\//i.test(line) &&
    !/^參考資料/.test(line)
  ) || "";
}

function sameLooseTitle(a, b) {
  const clean = (value) => String(value || "")
    .replace(/^#{1,6}\s+/, "")
    .replace(/\s+/g, "")
    .replace(/[，,。！？!?:：；;｜|「」『』]/g, "");
  return clean(a) && clean(a) === clean(b);
}

function dropLeadingTitleHeading(lines, title) {
  const out = [...lines];
  while (out.length && /^[-–—_\s]{5,}$/.test(out[0])) out.shift();
  if (out.length && /^##\s+/.test(out[0]) && sameLooseTitle(out[0], title)) out.shift();
  return out;
}

function isAdminOrChromeLine(line, title) {
  if (!line) return true;
  if (line === title) return true;
  if (line === "Facebook") return true;
  if (line === "藥時事") return true;
  if (line === "藥時事 已驗證帳號") return true;
  if (line === "分享對象：所有人") return true;
  if (line === "顯示較少") return true;
  if (line === "查看更多") return true;
  if (line === "查看洞察報告") return true;
  if (line === "刊登廣告") return true;
  if (line === "留言") return true;
  if (line === "傳達心情") return true;
  if (/^以藥時事的身分留言$/.test(line)) return true;
  if (/^[A-Za-z0-9]$/.test(line)) return true;
  if (/^\d+$/.test(line)) return true;
  if (/^[-–—]{5,}$/.test(line)) return true;
  if (/^·$/.test(line)) return true;
  if (/^(今天|昨天)?\s*\d+\s*(分鐘|小時)$/.test(line)) return true;
  if (/^\d+\s*月\s*\d+\s*日(?:\s*[·・]\s*)?$/.test(line)) return true;
  return false;
}

function normalizeLines(text, title) {
  const raw = String(text || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\u00a0/g, " ").trim());

  const titleIndex = raw.findIndex((line) => line.includes(title));
  const sliced = titleIndex >= 0 ? raw.slice(titleIndex + 1) : raw;
  const out = [];
  for (const line of sliced) {
    if (/^所有心情/.test(line) || /^\d+\s*次分享$/.test(line)) break;
    if (/^查看洞察報告$/.test(line) || /^以藥時事的身分留言$/.test(line)) break;
    if (isAdminOrChromeLine(line, title)) continue;
    const cleanLine = line.replace(/\s*顯示較少\s*$/u, "").trim();
    if (!cleanLine) continue;
    const numbered = cleanLine.match(/^【(\d{1,2})[｜|](.+)】$/);
    if (numbered) {
      out.push(`## ${numbered[1].padStart(2, "0")}｜${numbered[2].trim()}`);
      continue;
    }
    const conclusion = cleanLine.match(/^【結語[｜|](.+)】$/);
    if (conclusion) {
      out.push(`## 結語｜${conclusion[1].trim()}`);
      continue;
    }
    const bracketHeading = cleanLine.match(/^【([^】]{4,80})】$/);
    if (bracketHeading) {
      out.push(`## ${bracketHeading[1].trim()}`);
      continue;
    }
    out.push(cleanLine);
  }
  return out;
}

function summaryFrom(lines) {
  const first = lines.find((line) =>
    line &&
    !line.startsWith("#") &&
    !line.startsWith("http") &&
    !/^參考資料/.test(line) &&
    line.length > 30
  );
  return boundedSummary(first || "");
}

function boundedSummary(value, max = 150) {
  const text = String(value || "")
    .replace(/^📌\s*/, "")
    .replace(/\s+/g, " ")
    .replace(/(\p{Script=Han})\s+(\p{Script=Han})/gu, "$1$2")
    .trim();
  if (text.length <= max) return text;
  const slice = text.slice(0, max + 1);
  const punct = [...slice.matchAll(/[。！？.!?]/g)]
    .map((match) => match.index)
    .filter((index) => index >= 45)
    .at(-1);
  if (punct !== undefined) return slice.slice(0, punct + 1);
  return `${slice.slice(0, max).replace(/[，,、：:；;而與和及的了在把被為是]+$/u, "")}…`;
}

function tagsFor(title, lines) {
  const text = `${title}\n${lines.slice(0, 24).join("\n")}`;
  const rules = [
    ["AI", /AI|人工智慧|Nvidia|Amazon|AWS|Google/i],
    ["GLP-1", /GLP-1|減肥|肥胖|Mounjaro|Zepbound|tirzepatide|猛健樂/i],
    ["疫苗", /疫苗|vaccine|Curevo|LimmaTech|EBV|帶狀疱疹|抗藥性/i],
    ["感染症", /感染症|細菌感染|抗藥性|EBV|mRNA|BARDA/i],
    ["BD", /BD|授權|併購|交易|收購|大藥廠|買下/i],
    ["臨床數據", /臨床|試驗|Phase|第二期|第一期|FDA|安全性/i],
    ["生技投資", /投資|估值|市場|資本|現金流|Biotech/i],
    ["製藥巨頭", /禮來|默沙東|輝瑞|嬌生|大藥廠|Eli Lilly|Lilly|Pfizer|Merck/i]
  ];
  const tags = ["商業分析系列", "免費文章"];
  for (const [tag, re] of rules) {
    if (re.test(text) && !tags.includes(tag)) tags.push(tag);
  }
  return tags.slice(0, 9);
}

function imageExt(url, type) {
  if (/webp/i.test(type) || /\.webp($|\?)/i.test(url)) return ".webp";
  if (/png/i.test(type) || /\.png($|\?)/i.test(url)) return ".png";
  return ".jpg";
}

async function downloadImages(urls, imageDir) {
  await fs.mkdir(imageDir, { recursive: true });
  const files = [];
  const manifest = [];
  for (const [index, url] of urls.entries()) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Image download failed ${res.status}: ${url}`);
    const type = res.headers.get("content-type") || "";
    const file = `facebook-${String(index + 1).padStart(2, "0")}${imageExt(url, type)}`;
    await fs.writeFile(path.join(imageDir, file), Buffer.from(await res.arrayBuffer()));
    files.push(file);
    manifest.push({ url, file });
  }
  await fs.writeFile(path.join(imageDir, "image-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return files;
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function titleLines(title) {
  const text = String(title || "").trim();
  const chunks = [];
  let current = "";
  for (const char of text) {
    current += char;
    if (current.length >= 16 && /[：，、, ]/.test(char)) {
      chunks.push(current.trim());
      current = "";
    }
    if (chunks.length >= 2) break;
  }
  if (current && chunks.length < 3) chunks.push(current.trim());
  return chunks.length ? chunks.slice(0, 3) : [text];
}

async function coverFileFor(imageDir, title, summary) {
  for (const file of ["cover.png", "cover.webp", "cover.jpg", "cover.jpeg", "cover.svg"]) {
    if (await exists(path.join(imageDir, file))) return file;
  }
  const lines = titleLines(title);
  const titleSvg = lines
    .map((line, index) => `<text x="92" y="${250 + index * 78}" class="title">${escapeXml(line)}</text>`)
    .join("\n");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#f8fbfb"/>
      <stop offset=".58" stop-color="#eef8f8"/>
      <stop offset="1" stop-color="#dff1f2"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="24" stdDeviation="24" flood-color="#0b2d38" flood-opacity=".15"/>
    </filter>
  </defs>
  <rect width="1600" height="900" fill="url(#bg)"/>
  <path d="M0 690 C280 580 410 750 680 625 C910 520 1030 320 1600 438" fill="none" stroke="#0f8c99" stroke-width="4" opacity=".18"/>
  <path d="M-40 208 C240 120 466 170 704 274 C1015 411 1160 275 1640 184" fill="none" stroke="#d9792a" stroke-width="5" opacity=".18"/>
  <g transform="translate(930 142)" filter="url(#shadow)">
    <rect x="0" y="0" width="520" height="520" rx="82" fill="#ffffff" opacity=".86" stroke="#c7dde2" stroke-width="3"/>
    <circle cx="258" cy="258" r="148" fill="#e8f7f6" stroke="#128a95" stroke-width="8"/>
    <circle cx="205" cy="220" r="35" fill="#128a95"/>
    <circle cx="303" cy="214" r="39" fill="#128a95"/>
    <circle cx="260" cy="306" r="48" fill="#e07728" opacity=".9"/>
    <path d="M205 220 L260 306 L303 214" fill="none" stroke="#102d38" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M110 390 C205 450 315 455 424 389" fill="none" stroke="#d9792a" stroke-width="12" stroke-linecap="round"/>
    <g fill="#ffffff" stroke="#128a95" stroke-width="5">
      <rect x="-42" y="190" width="166" height="88" rx="30"/>
      <rect x="388" y="190" width="166" height="88" rx="30"/>
      <rect x="78" y="466" width="366" height="70" rx="28"/>
    </g>
  </g>
  <g transform="translate(92 92)">
    <text x="0" y="0" class="eyebrow">DRUGNEWS BIOTECH BUSINESS ANALYSIS</text>
    ${titleSvg}
    <text x="0" y="558" class="summary">${escapeXml(boundedSummary(summary, 58))}</text>
  </g>
  <style>
    .eyebrow{font:700 26px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:7px;fill:#d9792a}
    .title{font:800 58px -apple-system,BlinkMacSystemFont,"Noto Sans TC","Segoe UI",sans-serif;fill:#111820}
    .summary{font:600 34px -apple-system,BlinkMacSystemFont,"Noto Sans TC","Segoe UI",sans-serif;fill:#5e707a}
  </style>
</svg>`;
  await fs.writeFile(path.join(imageDir, "cover.svg"), svg, "utf8");
  return "cover.svg";
}

async function existingSlugForFacebookUrl(url) {
  const target = String(url || "").trim();
  if (!target) return "";
  let entries = [];
  try {
    entries = await fs.readdir(PUBLISHED, { withFileTypes: true });
  } catch {
    return "";
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const metaPath = path.join(PUBLISHED, entry.name, "meta.json");
    try {
      const meta = JSON.parse(await fs.readFile(metaPath, "utf8"));
      if (String(meta.facebook_url || "").trim() === target) return meta.slug || entry.name;
    } catch {
      // Ignore malformed folders; the publisher will report them separately.
    }
  }
  return "";
}

function distributeImages(lines, imageFiles, title) {
  if (!imageFiles.length) return lines;
  const result = [];
  let imageIndex = 0;
  for (const line of lines) {
    result.push(line);
    if (/^##\s+/.test(line) && imageIndex < imageFiles.length) {
      result.push("");
      result.push(`![Facebook 原圖：${title}（圖 ${imageIndex + 1}）](images/${imageFiles[imageIndex]})`);
      result.push("");
      imageIndex += 1;
    }
  }
  while (imageIndex < imageFiles.length) {
    result.push("");
    result.push(`![Facebook 原圖：${title}（圖 ${imageIndex + 1}）](images/${imageFiles[imageIndex]})`);
    imageIndex += 1;
  }
  return result;
}

function isParagraphLine(line) {
  const trimmed = String(line || "").trim();
  if (!trimmed) return false;
  if (/^#{1,6}\s+/.test(trimmed)) return false;
  if (/^!\[[^\]]*]\([^)]+\)$/.test(trimmed)) return false;
  if (/^[-*]\s+/.test(trimmed)) return false;
  if (/^---+$/.test(trimmed)) return false;
  return true;
}

function preserveParagraphBreaks(lines) {
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const next = lines[i + 1] || "";
    if (/^#{1,6}\s+/.test(line) && out.length && out.at(-1) !== "") out.push("");
    out.push(line);
    if (isParagraphLine(line) && isParagraphLine(next)) out.push("");
  }
  return out;
}

const posts = JSON.parse(await fs.readFile(inputPath, "utf8"));
const imported = [];

for (const post of posts) {
  assertPublicArticlePayload(post, "Facebook");
  const id = postId(post.url);
  const date = localDate(post.published);
  const fallback = `fb-${id || date}`;
  const rawTitle = cleanTitle(post.title);
  const lines = normalizeLines(post.articleText, rawTitle);
  const title = isBadTitle(rawTitle) ? cleanTitle(inferTitleFromLines(lines)) : rawTitle;
  if (isBadTitle(title)) {
    console.error(`Skipped Facebook post with no usable article title: ${post.url || "(missing url)"}`);
    continue;
  }
  const slug = await existingSlugForFacebookUrl(post.url) || post.slug || slugify(title, fallback);
  const folder = path.join(PUBLISHED, slug);
  const imageDir = path.join(folder, "images");
  const imageFiles = await downloadImages(post.images || [], imageDir);
  const contentLines = dropLeadingTitleHeading(lines, title);
  const bodyLines = preserveParagraphBreaks(distributeImages(contentLines, imageFiles, title));
  const summary = summaryFrom(contentLines);
  const coverImage = post.cover_image || `images/${await coverFileFor(imageDir, title, summary)}`;
  const markdown = [
    `# ${title}`,
    "",
    ...bodyLines,
    "",
    "---",
    "",
    DISCLAIMER
  ].join("\n").replace(/\n{4,}/g, "\n\n\n");

  const meta = {
    title,
    slug,
    date,
    publish_at: post.published || `${date}T10:30:00+08:00`,
    category: "商業分析系列",
    series: "商業分析系列",
    access: "免費文章",
    tags: tagsFor(title, contentLines),
    summary,
    cover_image: coverImage,
    cover_image_alt: isBadTitle(post.cover_image_alt) ? `${title} 專題封面` : post.cover_image_alt || `${title} 專題封面`,
    source_platform: "Facebook",
    facebook_url: post.url
  };

  await fs.mkdir(folder, { recursive: true });
  await fs.writeFile(path.join(folder, "meta.json"), `${JSON.stringify(meta, null, 2)}\n`, "utf8");
  await fs.writeFile(path.join(folder, "article.md"), `${markdown.trim()}\n`, "utf8");
  imported.push({ date, title, slug, images: imageFiles.length, url: post.url });
}

console.log(JSON.stringify({ imported: imported.length, posts: imported }, null, 2));
