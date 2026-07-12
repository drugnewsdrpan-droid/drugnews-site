import { readFile, stat } from "node:fs/promises";

const html = await readFile("index.html", "utf8");
const references = new Set();
for (const tag of html.match(/<(?:link|img|source)\b[^>]*>/g) || []) {
  if (!/fetchpriority="high"|rel="preload"/.test(tag)) continue;
  for (const match of tag.matchAll(/(?:href|src|srcset|imagesrcset)="([^"]+)"/g)) {
    for (const candidate of match[1].split(",")) {
      const url = candidate.trim().split(/\s+/)[0];
      if (url && !/^https?:/.test(url)) references.add(url);
    }
  }
}
const rows = [];
for (const file of references) {
  const bytes = (await stat(file)).size;
  const budget = file.includes("-720.") ? 200000 : 500000;
  rows.push({ file, bytes, budget, pass: bytes <= budget });
}
const failures = rows.filter((row) => !row.pass);
console.log(JSON.stringify({ rows, failures }, null, 2));
if (failures.length) process.exitCode = 1;
