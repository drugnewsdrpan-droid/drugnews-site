import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const PUBLISHED = path.join(ROOT, "content", "published");

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

function formatMarkdown(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let inCode = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trimEnd();
    const next = (lines[i + 1] || "").trimEnd();
    out.push(line);

    if (line.trim().startsWith("```")) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;

    if (isParagraphLine(line) && isParagraphLine(next)) {
      out.push("");
    }
  }

  return `${out.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
}

const changed = [];

for (const folder of await fs.readdir(PUBLISHED)) {
  const dir = path.join(PUBLISHED, folder);
  const metaPath = path.join(dir, "meta.json");
  const articlePath = path.join(dir, "article.md");
  try {
    const meta = JSON.parse(await fs.readFile(metaPath, "utf8"));
    if (meta.source_platform !== "Dcard" && !meta.dcard_url) continue;
    const before = await fs.readFile(articlePath, "utf8");
    const after = formatMarkdown(before);
    if (after !== before) {
      await fs.writeFile(articlePath, after, "utf8");
      changed.push(`${meta.date} ${meta.title}`);
    }
  } catch {
    // Ignore non-article folders.
  }
}

console.log(JSON.stringify({ changed: changed.length, articles: changed }, null, 2));
