import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const PUBLISHED = path.join(ROOT, "content", "published");

function needsRepair(summary = "") {
  const value = String(summary || "").trim();
  return Boolean(
    value &&
    (
      /[，,、：:；;而與和及的了在把被為是]$/u.test(value) ||
      /\d\.$/.test(value) ||
      /^【[^】]{4,90}】$/u.test(value) ||
      (value.length >= 138 && !/[。！？.!?…]$/u.test(value))
    )
  );
}

function boundedSummary(value, max = 150) {
  const text = String(value || "")
    .replace(/^#+\s*/, "")
    .replace(/^📌\s*/, "")
    .replace(/\s+/g, " ")
    .replace(/(\p{Script=Han})\s+(\p{Script=Han})/gu, "$1$2")
    .trim();
  if (!text) return "";
  if (text.length <= max) return text;
  const slice = text.slice(0, max + 1);
  const punct = [...slice.matchAll(/[。！？.!?]/g)]
    .map((match) => match.index)
    .filter((index) => {
      if (index < 45) return false;
      const mark = slice[index];
      if (mark === "." && /\d/.test(slice[index - 1] || "") && /\d/.test(slice[index + 1] || "")) return false;
      if (mark === "." && /\d/.test(slice[index - 1] || "") && !slice[index + 1]) return false;
      return true;
    })
    .at(-1);
  if (punct !== undefined) return slice.slice(0, punct + 1);
  return `${slice.slice(0, max).replace(/[，,、：:；;而與和及的了在把被為是]+$/u, "")}…`;
}

function candidateLines(markdown = "", title = "") {
  return String(markdown || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line !== `# ${title}`)
    .filter((line) => !/^#{1,6}\s+/.test(line))
    .filter((line) => !/^【[^】]{4,90}】$/u.test(line))
    .filter((line) => !/^!\[[^\]]*]\([^)]+\)$/.test(line))
    .filter((line) => !/^[-–—]{3,}$/.test(line))
    .filter((line) => !/^本文僅供產業研究/.test(line))
    .filter((line) => !/^This article is for/.test(line))
    .filter((line) => !/^https?:\/\//.test(line))
    .filter((line) => line.length > 30);
}

async function main() {
  const folders = await fs.readdir(PUBLISHED, { withFileTypes: true });
  const repaired = [];
  for (const folder of folders) {
    if (!folder.isDirectory()) continue;
    const dir = path.join(PUBLISHED, folder.name);
    const metaPath = path.join(dir, "meta.json");
    const articlePath = path.join(dir, "article.md");
    let meta;
    let markdown;
    try {
      meta = JSON.parse(await fs.readFile(metaPath, "utf8"));
      markdown = await fs.readFile(articlePath, "utf8");
    } catch {
      continue;
    }
    if (!needsRepair(meta.summary)) continue;
    const first = candidateLines(markdown, meta.title)[0] || meta.summary || meta.title;
    const next = boundedSummary(first);
    if (!next || next === meta.summary) continue;
    const before = meta.summary;
    meta.summary = next;
    await fs.writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`, "utf8");
    repaired.push({ slug: folder.name, date: meta.date, title: meta.title, before, after: next });
  }
  console.log(JSON.stringify({ repaired: repaired.length, articles: repaired }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
