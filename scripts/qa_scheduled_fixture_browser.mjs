import crypto from "node:crypto";
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("/Users/jojo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

function options(argv) {
  return Object.fromEntries(argv.filter((arg) => arg.startsWith("--")).map((arg) => {
    const [key, ...value] = arg.slice(2).split("=");
    return [key, value.join("=")];
  }));
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

const args = options(process.argv.slice(2));
if (!args.root || !args.article || !args.output) throw new Error("Usage: qa_scheduled_fixture_browser.mjs --root=... --article=... --output=...");
const root = await fs.realpath(path.resolve(args.root));
const article = String(args.article).replaceAll("\\", "/").replace(/^\/+/, "");
if (!article || article.split("/").includes("..") || !article.endsWith(".html")) throw new Error("ARTICLE_PATH_INVALID");
const output = path.resolve(args.output);
await fs.mkdir(output, { recursive: true });

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"], [".html", "text/html; charset=utf-8"], [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"], [".png", "image/png"], [".svg", "image/svg+xml"], [".webp", "image/webp"]
]);
const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname).replace(/^\/+/, "") || "index.html";
    const file = path.resolve(root, pathname);
    if (file !== root && !file.startsWith(`${root}${path.sep}`)) throw new Error("PATH_OUTSIDE_ROOT");
    const data = await fs.readFile(file);
    response.writeHead(200, { "content-type": mimeTypes.get(path.extname(file)) || "application/octet-stream" });
    response.end(data);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("not found");
  }
});
await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, channel: "chrome", timeout: 60_000 });
const results = [];

try {
  for (const width of [390, 768, 1440]) {
    const height = width === 390 ? 844 : 1000;
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    page.setDefaultTimeout(15_000);
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    const response = await page.goto(`${baseUrl}/${article}`, { waitUntil: "load" });
    const inspection = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll(".article-body figure img"));
      const h1 = document.querySelector("h1");
      const body = document.querySelector(".article-body");
      return {
        status_title: document.title,
        h1_visible: Boolean(h1 && h1.getBoundingClientRect().width > 0 && h1.getBoundingClientRect().height > 0),
        body_characters: (body?.innerText || "").replace(/\s+/g, " ").trim().length,
        horizontal_overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        images: images.map((image) => ({ src: image.getAttribute("src"), alt: image.getAttribute("alt"), complete: image.complete, natural_width: image.naturalWidth, natural_height: image.naturalHeight }))
      };
    });
    const expectedOrder = ["cover.png", "figure-02.png", "figure-03.png", "figure-04.png"];
    const checks = {
      http_200: response?.status() === 200,
      h1_visible: inspection.h1_visible,
      body_present: inspection.body_characters >= 80,
      no_horizontal_overflow: !inspection.horizontal_overflow,
      four_images: inspection.images.length === 4,
      image_order: inspection.images.map((image) => path.posix.basename(image.src || "")).join("|") === expectedOrder.join("|"),
      image_alt_text: inspection.images.every((image) => Boolean(String(image.alt || "").trim())),
      images_loaded: inspection.images.every((image) => image.complete && image.natural_width > 0 && image.natural_height > 0),
      no_page_errors: pageErrors.length === 0
    };
    const screenshot = path.join(output, `scheduled-article-${width}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    results.push({ width, height, checks, inspection, page_errors: pageErrors, screenshot, screenshot_sha256: sha256(await fs.readFile(screenshot)) });
    await context.close();
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

const report = {
  ok: results.every((result) => Object.values(result.checks).every(Boolean)),
  fixture_root: root,
  article,
  results
};
const reportPath = path.join(output, "scheduled-browser-qa.json");
await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ ok: report.ok, report: reportPath, widths: results.map((result) => ({ width: result.width, checks: result.checks, screenshot_sha256: result.screenshot_sha256 })) }, null, 2));
if (!report.ok) process.exitCode = 1;
