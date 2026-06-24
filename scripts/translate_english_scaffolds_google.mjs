import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const PUBLISHED = path.join(ROOT, "content", "published");
const REPORT = path.join(ROOT, "content", "english-scaffold-report.json");
const GOOGLE_URL = "https://translate.googleapis.com/translate_a/single";
const MAX_SEGMENT_CHARS = 1200;
const PAUSE_MS = 120;

const glossary = [
  [/Drugtime/g, "Drugnews"],
  [/Drug News/g, "Drugnews"],
  [/Drug Current Affairs/g, "Drugnews"],
  [/Drug current affairs/g, "Drugnews"],
  [/Medical Current Affairs/g, "Drugnews"],
  [/Medical current affairs/g, "Drugnews"],
  [/Pharmaceutical Current Affairs/g, "Drugnews"],
  [/Pharmaceutical current affairs/g, "Drugnews"],
  [/pharmaceutical current affairs team/g, "Drugnews team"],
  [/Drugnews team team/g, "Drugnews team"],
  [/Pharmaceutical News/g, "Drugnews"],
  [/Pharmaceutical Times/g, "Drugnews"],
  [/Drug Times/g, "Drugnews"],
  [/CMoney Quan Yao Finance/g, "CMoney"],
  [/CMoney CMoney/g, "CMoney"],
  [/Quan Yao Finance/g, "CMoney"],
  [/Quanyao Finance/g, "CMoney"],
  [/obesity drug/g, "weight-loss drug"],
  [/weight loss drug/g, "weight-loss drug"],
  [/new drug/g, "drug"],
  [/Big Pharmaceutical Factory/g, "Big Pharma"],
  [/large pharmaceutical factory/g, "Big Pharma"],
  [/pharmaceutical factory/g, "drugmaker"],
  [/license negotiations/g, "licensing negotiations"],
  [/authorization/g, "licensing"],
  [/three phases/g, "Phase 3"],
  [/Phase III/g, "Phase 3"],
  [/Phase II/g, "Phase 2"],
  [/Phase I/g, "Phase 1"],
  [/biotechnology circle/g, "biotech sector"],
  [/biotechnology stocks/g, "biotech stocks"],
  [/Deloitte \(Deloitte\)/g, "Deloitte"],
  [/Novo Nordisk \(Novo Nordisk\)/g, "Novo Nordisk"],
  [/Eli Lilly \(Eli Lilly\)/g, "Eli Lilly"],
  [/semaglutide, semaglutide/g, "semaglutide"],
  [/tirzepatide, tirzepatide/g, "tirzepatide"],
  [/Kangpei/g, "Caliway"],
  [/Baorui/g, "Bora Pharmaceuticals"],
  [/BioResearch/g, "Bora Pharmaceuticals"],
  [/Taiyao/g, "TTY Biopharm"],
  [/Yaohua Pharmaceutical/g, "PharmaEssentia"]
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function applyGlossary(text) {
  let out = text;
  for (const [pattern, replacement] of glossary) {
    out = out.replace(pattern, replacement);
  }
  return out
    .replace(/\]\s+\(/g, "](")
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/\( /g, "(")
    .replace(/ \)/g, ")");
}

function cjkCount(text) {
  return (text.match(/[\u3400-\u9fff]/g) || []).length;
}

function maskMarkdown(text) {
  const tokens = [];
  const add = (value) => {
    const token = `__DN_TOKEN_${tokens.length}__`;
    tokens.push([token, value]);
    return token;
  };
  let masked = text
    .replace(/`[^`]*`/g, add)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, url) => `[${label}](${add(url)})`)
    .replace(/https?:\/\/\S+/g, add);
  return { masked, tokens };
}

function unmaskMarkdown(text, tokens) {
  let out = text;
  for (const [token, value] of tokens) {
    out = out.replaceAll(token, value);
    out = out.replaceAll(token.toLowerCase(), value);
    out = out.replaceAll(token.replaceAll("_", " "), value);
  }
  return out;
}

async function translateText(text, retries = 4) {
  if (!text.trim()) return text;
  const { masked, tokens } = maskMarkdown(text);
  const params = new URLSearchParams({
    client: "gtx",
    sl: "zh-TW",
    tl: "en",
    dt: "t",
    q: masked
  });

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${GOOGLE_URL}?${params.toString()}`, {
        headers: {
          "User-Agent": "Drugnews editorial translation script"
        }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      const translated = Array.isArray(json?.[0])
        ? json[0].map((part) => part?.[0] || "").join("")
        : "";
      if (!translated.trim()) throw new Error("empty translation");
      if (cjkCount(masked) > 12 && cjkCount(translated) > Math.max(8, cjkCount(masked) * 0.2)) {
        throw new Error("translation retained too much CJK text");
      }
      await sleep(PAUSE_MS);
      return applyGlossary(unmaskMarkdown(translated, tokens));
    } catch (error) {
      if (attempt === retries) throw error;
      await sleep(600 * attempt);
    }
  }
  return text;
}

function splitLongParagraph(text) {
  if (text.length <= MAX_SEGMENT_CHARS) return [text];
  const parts = [];
  let current = "";
  const sentences = text.split(/(?<=[。！？；])/u);
  for (const sentence of sentences) {
    if ((current + sentence).length > MAX_SEGMENT_CHARS && current.trim()) {
      parts.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts.flatMap((part) => {
    if (part.length <= MAX_SEGMENT_CHARS) return [part];
    const chunks = [];
    for (let i = 0; i < part.length; i += MAX_SEGMENT_CHARS) {
      chunks.push(part.slice(i, i + MAX_SEGMENT_CHARS));
    }
    return chunks;
  });
}

function splitMarkdownBlocks(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let current = [];

  const flush = () => {
    if (current.length) {
      blocks.push({ type: "text", text: current.join("\n") });
      current = [];
    }
  };

  for (const line of lines) {
    if (!line.trim()) {
      flush();
      blocks.push({ type: "blank", text: "" });
      continue;
    }
    if (/^!\[[^\]]*\]\([^)]+\)/.test(line.trim())) {
      flush();
      blocks.push({ type: "image", text: line });
      continue;
    }
    current.push(line);
  }
  flush();
  return blocks;
}

async function translateMarkdown(markdown) {
  const blocks = splitMarkdownBlocks(markdown);
  const out = [];
  let index = 0;
  for (const block of blocks) {
    index += 1;
    if (block.type === "blank") {
      out.push("");
      continue;
    }
    if (block.type === "image") {
      const match = block.text.match(/^!\[([^\]]*)\]\(([^)]+)\)(.*)$/);
      if (!match) {
        out.push(block.text);
        continue;
      }
      const alt = match[1].trim() ? await translateText(match[1]) : "";
      out.push(`![${alt}](${match[2]})${match[3] || ""}`);
      continue;
    }
    const segments = splitLongParagraph(block.text);
    const translatedSegments = [];
    for (const segment of segments) {
      try {
        translatedSegments.push(await translateText(segment));
      } catch (error) {
        const smaller = segment.split(/(?<=[。！？；])/u).filter(Boolean);
        if (smaller.length <= 1) throw error;
        const retried = [];
        for (const small of smaller) {
          retried.push(await translateText(small));
        }
        translatedSegments.push(retried.join(" "));
      }
    }
    out.push(translatedSegments.join(" "));
    if (index % 20 === 0) {
      process.stderr.write(".");
    }
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

async function copyImages(sourceSlug, targetSlug) {
  const sourceImages = path.join(PUBLISHED, sourceSlug, "images");
  const targetImages = path.join(PUBLISHED, targetSlug, "images");
  try {
    await fs.access(sourceImages);
  } catch {
    return false;
  }
  await fs.rm(targetImages, { recursive: true, force: true });
  await fs.cp(sourceImages, targetImages, { recursive: true });
  return true;
}

async function loadJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function main() {
  const report = await loadJson(REPORT);
  const created = report.created || [];
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : created.length;
  const startArg = process.argv.find((arg) => arg.startsWith("--start="));
  const start = startArg ? Number(startArg.split("=")[1]) : 0;
  const items = created.slice(start, start + limit);
  const results = [];

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const sourceArticle = path.join(PUBLISHED, item.source, "article.md");
    const targetArticle = path.join(PUBLISHED, item.target, "article.md");
    const targetMeta = path.join(PUBLISHED, item.target, "meta.json");
    const meta = await loadJson(targetMeta);
    const sourceMarkdown = await fs.readFile(sourceArticle, "utf8");

    process.stderr.write(`\n[${start + i + 1}/${created.length}] ${item.source} -> ${item.target} `);
    const translated = await translateMarkdown(sourceMarkdown);
    const imagesCopied = await copyImages(item.source, item.target);
    const body = `# ${meta.title}\n\n${translated}`;
    meta.editorial_note = "Full English translation generated from the Chinese edition with Google Translate batch workflow; structure, links, and image positions preserved by Drugnews editorial tooling.";
    meta.translation_status = "full_google_translate_pass";
    meta.translation_updated_at = new Date().toISOString();
    await fs.writeFile(targetArticle, body);
    await fs.writeFile(targetMeta, `${JSON.stringify(meta, null, 2)}\n`);
    results.push({ source: item.source, target: item.target, imagesCopied });
    process.stderr.write(" done\n");
  }

  const outputPath = path.join(ROOT, "content", "english-full-translation-report.json");
  const existing = await fs.readFile(outputPath, "utf8").then(JSON.parse).catch(() => ({ translated: [] }));
  const translated = [...(existing.translated || []).filter((old) => !results.some((r) => r.target === old.target)), ...results];
  await fs.writeFile(outputPath, `${JSON.stringify({
    updated_at: new Date().toISOString(),
    mode: "google_translate_full_markdown",
    translated_count: translated.length,
    translated
  }, null, 2)}\n`);
  console.log(`Translated ${results.length} articles in this run. Total recorded: ${translated.length}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
