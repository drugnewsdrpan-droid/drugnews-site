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
  const title = cleanTitle(post.title);
  const id = postId(post.url);
  const date = localDate(post.published);
  const fallback = `fb-${id || date}`;
  const slug = post.slug || slugify(title, fallback);
  const folder = path.join(PUBLISHED, slug);
  const imageDir = path.join(folder, "images");
  const lines = normalizeLines(post.articleText, title);
  const imageFiles = await downloadImages(post.images || [], imageDir);
  const bodyLines = preserveParagraphBreaks(distributeImages(lines, imageFiles, title));
  const summary = summaryFrom(lines);
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
    cover_image: post.cover_image || "",
    cover_image_alt: post.cover_image_alt || `${title} 專題封面`,
    source_platform: "Facebook",
    facebook_url: post.url
  };

  await fs.mkdir(folder, { recursive: true });
  await fs.writeFile(path.join(folder, "meta.json"), `${JSON.stringify(meta, null, 2)}\n`, "utf8");
  await fs.writeFile(path.join(folder, "article.md"), `${markdown.trim()}\n`, "utf8");
  imported.push({ date, title, slug, images: imageFiles.length, url: post.url });
}

console.log(JSON.stringify({ imported: imported.length, posts: imported }, null, 2));
