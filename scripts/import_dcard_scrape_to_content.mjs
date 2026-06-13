import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const PUBLISHED = path.join(ROOT, "content", "published");
const FACEBOOK_URL = "https://www.facebook.com/profile.php?id=61568446257142";
const DISCLAIMER = "本文僅供產業研究與知識分享，不構成投資、醫療、募資或個股建議。";

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node scripts/import_dcard_scrape_to_content.mjs /path/to/dcard-posts.json");
  process.exit(1);
}

function postId(url) {
  return String(url || "").match(/\/post\/(\d+)/)?.[1] || "";
}

function slugify(title, fallback) {
  const ascii = String(title || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
  if (!ascii || ascii.length < 8 || ["ai", "bd", "fda"].includes(ascii)) return fallback;
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
    .replace(/\s*-\s*藥時事 Drugnews \(@drugnews\).*$/u, "")
    .replace(/\s*\|\s*$/u, "")
    .trim();
}

function isChromeLine(line, title) {
  if (!line) return true;
  if (line === title) return true;
  if (line === "藥時事 Drugnews") return true;
  if (line === "追蹤") return true;
  if (/^\(?已編輯\)?$/.test(line)) return true;
  if (/^\d+\s*月\s*\d+\s*日\s*\d{2}:\d{2}$/.test(line)) return true;
  if (/^(今天|昨天)\s*\d{1,2}:\d{2}$/.test(line)) return true;
  if (/^所有看板$|^即時熱門看板$|^創作者排行榜$|^下載 App$|^註冊 \/ 登入$/.test(line)) return true;
  return false;
}

function normalizeLines(text, title) {
  const lines = String(text || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\u00a0/g, " ").trim())
    .filter((line) => !isChromeLine(line, title));

  const out = [];
  for (const line of lines) {
    if (/^email$/i.test(line)) continue;
    if (/^https?:\/\/\S+$/.test(line)) {
      out.push(line);
      continue;
    }
    const numbered = line.match(/^【(\d{1,2})[｜|](.+)】$/);
    if (numbered) {
      out.push(`## ${numbered[1].padStart(2, "0")}｜${numbered[2].trim()}`);
      continue;
    }
    const bracketHeading = line.match(/^【([^】]{4,80})】$/);
    if (bracketHeading) {
      out.push(`## ${bracketHeading[1].trim()}`);
      continue;
    }
    out.push(line);
  }
  return out;
}

function summaryFrom(lines) {
  const first = lines.find((line) =>
    line &&
    !line.startsWith("#") &&
    !line.startsWith("http") &&
    !/^[-–—]+$/.test(line) &&
    line.length > 30
  );
  return String(first || "").replace(/^📌\s*/, "").slice(0, 140);
}

function tagsFor(title, lines) {
  const text = `${title}\n${lines.slice(0, 16).join("\n")}`;
  const rules = [
    ["AI", /AI|人工智慧|Nvidia|Amazon|AWS|Google/i],
    ["GLP-1", /GLP-1|瘦瘦針|減肥|肥胖|猛健樂|口服藥/],
    ["自體免疫", /自體免疫|免疫|發炎|CDC|CAR-T/],
    ["BD", /BD|授權|併購|交易|平台型|藥廠/],
    ["臨床數據", /臨床|試驗|PDUFA|終點|FDA|CRL/],
    ["生技投資", /投資|估值|市場|資本|Biotech/],
    ["製藥巨頭", /禮來|默沙東|輝瑞|嬌生|大藥廠|Merck|Lilly|Pfizer|Johnson/]
  ];
  const tags = ["商業分析系列", "免費文章"];
  for (const [tag, re] of rules) {
    if (re.test(text) && !tags.includes(tag)) tags.push(tag);
  }
  return tags.slice(0, 7);
}

function imageExt(url, type) {
  if (/webp/i.test(type) || /\.webp($|\?)/i.test(url)) return ".webp";
  if (/png/i.test(type) || /\.png($|\?)/i.test(url)) return ".png";
  return ".jpg";
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function coverFileFor(imageDir, title) {
  const preferred = [
    "cover-ai-drug-survival.png",
    "cover-generated.png",
    "cover-generated.webp",
    "cover-ai.png",
    "cover-ai.webp",
    "cover.png",
    "cover.webp",
    "cover.jpg",
    "cover.jpeg"
  ];

  for (const file of preferred) {
    if (await fileExists(path.join(imageDir, file))) return file;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" role="img">
  <title>${escapeXml(title)} 專題封面</title>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f7fbfc"/>
      <stop offset="0.55" stop-color="#eef8fb"/>
      <stop offset="1" stop-color="#f8fbff"/>
    </linearGradient>
    <linearGradient id="wave" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#0f766e"/>
      <stop offset="0.48" stop-color="#00a6b4"/>
      <stop offset="1" stop-color="#12356b"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#60efff" stop-opacity=".95"/>
      <stop offset=".45" stop-color="#23b8cf" stop-opacity=".32"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft" x="-25%" y="-25%" width="150%" height="150%">
      <feGaussianBlur stdDeviation="18"/>
    </filter>
  </defs>
  <rect width="1600" height="900" fill="url(#bg)"/>
  <circle cx="360" cy="430" r="300" fill="url(#glow)" filter="url(#soft)"/>
  <circle cx="1240" cy="470" r="260" fill="#d8f5fb" opacity=".45" filter="url(#soft)"/>
  <path d="M-40 675 C260 520 470 725 760 560 S1220 270 1660 385 L1660 900 L-40 900 Z" fill="url(#wave)" opacity=".92"/>
  <path d="M-30 650 C280 500 470 690 760 535 S1225 245 1655 360" fill="none" stroke="#ffffff" stroke-width="9" opacity=".8"/>
  <g fill="none" stroke="#19a9b8" stroke-width="3" opacity=".28">
    <path d="M80 210 C210 250 270 345 420 330 S650 235 790 295"/>
    <path d="M95 285 C245 345 345 420 510 390 S725 335 900 435"/>
    <path d="M975 225 C1090 315 1235 315 1375 250"/>
  </g>
  <g stroke="#0e3f68" stroke-width="13" stroke-linecap="round">
    <line x1="412" y1="332" x2="530" y2="260"/>
    <line x1="412" y1="332" x2="520" y2="432"/>
    <line x1="530" y1="260" x2="650" y2="330"/>
    <line x1="520" y1="432" x2="650" y2="330"/>
    <line x1="650" y1="330" x2="760" y2="252"/>
  </g>
  <g fill="#ffffff" stroke="#0f766e" stroke-width="8">
    <circle cx="412" cy="332" r="43"/>
    <circle cx="530" cy="260" r="35"/>
    <circle cx="520" cy="432" r="39"/>
    <circle cx="650" cy="330" r="48"/>
    <circle cx="760" cy="252" r="34"/>
  </g>
  <g fill="#0aa6b4" opacity=".95">
    <circle cx="184" cy="230" r="8"/>
    <circle cx="255" cy="286" r="6"/>
    <circle cx="318" cy="208" r="7"/>
    <circle cx="842" cy="352" r="7"/>
    <circle cx="1064" cy="282" r="8"/>
    <circle cx="1268" cy="228" r="7"/>
    <circle cx="1385" cy="300" r="6"/>
  </g>
  <g opacity=".72">
    <rect x="880" y="330" width="300" height="190" rx="48" fill="#ffffff" stroke="#99edf2" stroke-width="5"/>
    <path d="M935 430 H990 L1024 378 L1070 482 L1118 415 H1150" fill="none" stroke="#12356b" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="1310" cy="505" r="118" fill="#ffffff" opacity=".78" stroke="#9deff3" stroke-width="5"/>
    <path d="M1310 395 C1365 448 1370 536 1310 615 C1250 536 1255 448 1310 395 Z" fill="#0f766e" opacity=".17"/>
    <path d="M1262 510 C1300 550 1324 550 1358 510" fill="none" stroke="#0f766e" stroke-width="8" stroke-linecap="round"/>
  </g>
</svg>`;

  const coverFile = "cover.svg";
  await fs.writeFile(path.join(imageDir, coverFile), svg, "utf8");
  return coverFile;
}

function distributeImages(lines, imageFiles, title) {
  if (!imageFiles.length) return lines;
  const result = [];
  let imageIndex = 0;
  const interval = Math.max(5, Math.ceil(lines.length / (imageFiles.length + 1)));

  for (let i = 0; i < lines.length; i += 1) {
    result.push(lines[i]);
    const next = lines[i + 1] || "";
    const canInsert = imageIndex < imageFiles.length &&
      i > 1 &&
      (lines[i].length > 20 || lines[i].startsWith("## ")) &&
      !next.startsWith("http") &&
      ((i + 1) % interval === 0 || lines[i].startsWith("## "));
    if (canInsert) {
      result.push("");
      result.push(`![Dcard 原圖：${title}（圖 ${imageIndex + 1}）](images/${imageFiles[imageIndex]})`);
      result.push("");
      imageIndex += 1;
    }
  }

  while (imageIndex < imageFiles.length) {
    result.push("");
    result.push(`![Dcard 原圖：${title}（圖 ${imageIndex + 1}）](images/${imageFiles[imageIndex]})`);
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
  if (/^>\s?/.test(trimmed)) return false;
  if (/^---+$/.test(trimmed)) return false;
  if (/^```/.test(trimmed)) return false;
  return true;
}

function preserveDcardParagraphBreaks(lines) {
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const next = lines[i + 1] || "";
    out.push(line);
    if (isParagraphLine(line) && isParagraphLine(next)) {
      out.push("");
    }
  }
  return out;
}

async function downloadImages(urls, imageDir) {
  await fs.mkdir(imageDir, { recursive: true });
  const files = [];
  const manifest = [];
  for (const [index, url] of urls.entries()) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Image download failed ${res.status}: ${url}`);
    const type = res.headers.get("content-type") || "";
    const file = `dcard-${String(index + 1).padStart(2, "0")}${imageExt(url, type)}`;
    await fs.writeFile(path.join(imageDir, file), Buffer.from(await res.arrayBuffer()));
    files.push(file);
    manifest.push({ url, file });
  }
  await fs.writeFile(path.join(imageDir, "image-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return files;
}

const posts = JSON.parse(await fs.readFile(inputPath, "utf8"));
const imported = [];

for (const post of posts) {
  const title = cleanTitle(post.title);
  const id = postId(post.url);
  const date = localDate(post.published);
  const fallback = `dcard-${id || date}`;
  let slug = slugify(title, fallback);
  let folder = path.join(PUBLISHED, slug);
  const existingMetaPath = path.join(folder, "meta.json");
  try {
    const existingMeta = JSON.parse(await fs.readFile(existingMetaPath, "utf8"));
    if (existingMeta.dcard_url && existingMeta.dcard_url !== post.url) {
      slug = fallback;
      folder = path.join(PUBLISHED, slug);
    }
  } catch {}
  const imageDir = path.join(folder, "images");
  const lines = normalizeLines(post.articleText, title);
  const summary = summaryFrom(lines);
  const imageFiles = await downloadImages(post.images || [], imageDir);
  const coverFile = await coverFileFor(imageDir, title);
  const bodyLines = preserveDcardParagraphBreaks(distributeImages(lines, imageFiles, title));
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
    tags: tagsFor(title, lines),
    summary,
    cover_image: `images/${coverFile}`,
    cover_image_alt: `${title} 專題封面`,
    source_platform: "Dcard",
    dcard_url: post.url,
    facebook_url: FACEBOOK_URL
  };

  await fs.mkdir(folder, { recursive: true });
  await fs.writeFile(path.join(folder, "meta.json"), `${JSON.stringify(meta, null, 2)}\n`, "utf8");
  await fs.writeFile(path.join(folder, "article.md"), `${markdown.trim()}\n`, "utf8");
  imported.push({ date, title, slug, images: imageFiles.length, url: post.url });
}

console.log(JSON.stringify({ imported: imported.length, posts: imported }, null, 2));
