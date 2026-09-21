import { createRequire } from "node:module";
import { copyFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

export async function buildResponsiveCover(source, destination, { onlyMissing = false } = {}) {
  // A derivative can never stand in for a missing approved original.
  await stat(source);
  await mkdir(path.dirname(destination), { recursive: true });
  const report = [];
  for (const [suffix, width, quality, budget] of [
    ["720", 720, 74, 200_000],
    ["1400", 1400, 80, 500_000]
  ]) {
    const output = `${destination}-${suffix}.webp`;
    const existing = onlyMissing && await stat(output).catch((error) => {
      if (error.code !== "ENOENT") throw error;
      return null;
    });
    if (!existing) {
      await require("sharp")(source)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality, effort: 5 })
        .toFile(output);
    }
    const bytes = (await stat(output)).size;
    report.push({ kind: "cover", output, bytes, budget, pass: bytes <= budget });
  }
  return report;
}

async function main() {
const sharp = require("sharp");
const operations = process.argv.slice(2);

if (!operations.length || operations.length % 3 !== 0) {
  console.error("Usage: node scripts/build_article_media.mjs <cover|figure> <source> <destination> [...]");
  process.exit(1);
}

const report = [];

for (let index = 0; index < operations.length; index += 3) {
  const [kind, source, destination] = operations.slice(index, index + 3);
  await mkdir(path.dirname(destination), { recursive: true });

  if (kind === "cover") {
    const png = `${destination}.png`;
    await copyFile(source, png);

    report.push(...await buildResponsiveCover(source, destination));
    continue;
  }

  if (kind === "figure") {
    await sharp(source)
      .resize({ width: 1400, withoutEnlargement: true })
      .webp({ quality: 82, effort: 5 })
      .toFile(destination);
    const bytes = (await stat(destination)).size;
    report.push({ kind, output: destination, bytes, budget: 500_000, pass: bytes <= 500_000 });
    continue;
  }

  throw new Error(`Unsupported media kind: ${kind}`);
}

const failures = report.filter((item) => !item.pass);
console.log(JSON.stringify({ count: report.length, failures }, null, 2));
if (failures.length) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
