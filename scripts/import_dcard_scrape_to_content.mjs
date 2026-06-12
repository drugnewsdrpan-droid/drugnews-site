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
  return ascii || fallback;
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
  const slug = slugify(title, fallback);
  const folder = path.join(PUBLISHED, slug);
  const imageDir = path.join(folder, "images");
  const lines = normalizeLines(post.articleText, title);
  const summary = summaryFrom(lines);
  const imageFiles = await downloadImages(post.images || [], imageDir);
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
    publish_at: `${date}T10:30:00+08:00`,
    category: "商業分析系列",
    series: "商業分析系列",
    access: "免費文章",
    tags: tagsFor(title, lines),
    summary,
    cover_image: imageFiles[0] ? `images/${imageFiles[0]}` : "",
    cover_image_alt: imageFiles[0] ? `Dcard 原圖：${title}` : "",
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
