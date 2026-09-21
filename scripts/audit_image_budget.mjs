import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = await realpath(process.cwd());
const rootUrl = pathToFileURL(root + path.sep);
function withinRoot(file) {
  const relative = path.relative(root, file);
  if (relative === ".." || relative.startsWith(".." + path.sep) || path.isAbsolute(relative)) {
    throw new Error("IMAGE_BUDGET_PATH_OUTSIDE_ROOT");
  }
  return file;
}
async function localImagePath(reference) {
  if (/^[a-z][a-z0-9+.-]*:|^\/\//i.test(reference) || reference.includes("\\")) {
    throw new Error("IMAGE_BUDGET_URL_INVALID");
  }
  const url = new URL(reference.startsWith("/") ? "." + reference : reference, rootUrl);
  // fileURLToPath decodes once and ignores URL query/fragment, not filename bytes.
  const file = withinRoot(fileURLToPath(url));
  return { file: withinRoot(await realpath(file)), name: path.basename(file) };
}

const html = await readFile("index.html", "utf8");
const references = new Set();
for (const tag of html.match(/<(?:link|img|source)\b[^>]*>/g) || []) {
  if (!/fetchpriority="high"|rel="preload"/.test(tag)) continue;
  for (const match of tag.matchAll(/(href|src|srcset|imagesrcset)="([^"]+)"/g)) {
    const isSrcset = match[1].endsWith("srcset");
    for (const candidate of isSrcset ? match[2].split(",") : [match[2]]) {
      const url = isSrcset ? candidate.trim().replace(/\s+\d+(?:\.\d+)?[wx]$/, "") : candidate.trim();
      if (url && !/^https?:/.test(url)) references.add(url);
    }
  }
}
const rows = [];
for (const file of references) {
  const local = await localImagePath(file);
  const bytes = (await stat(local.file)).size;
  const budget = local.name.includes("-720.") ? 200000 : 500000;
  rows.push({ file, bytes, budget, pass: bytes <= budget });
}
const failures = rows.filter((row) => !row.pass);
console.log(JSON.stringify({ rows, failures }, null, 2));
if (failures.length) process.exitCode = 1;
