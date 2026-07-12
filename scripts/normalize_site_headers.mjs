import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const ABOUT_NAV = `<nav class="nav-links" id="site-nav-links" aria-label="Main navigation">
        <a href="index.html">首頁</a>
        <a href="articles/">文章</a>
        <a href="subscribe.html">深度分析</a>
        <a href="search.html">搜尋</a>
        <a href="topics/">主題</a>
        <a href="guides/">指南</a>
        <a href="team.html">團隊</a>
        <a href="services.html">公司合作</a>
        <a href="en/about.html">English</a>
      </nav>`;

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if ([".git", "node_modules", "output"].includes(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(full));
    else if (entry.name.endsWith(".html")) files.push(full);
  }
  return files;
}

let changed = 0;
for (const file of await htmlFiles(ROOT)) {
  let html = await readFile(file, "utf8");
  if (!html.includes("site-header")) continue;
  const relative = path.relative(ROOT, file);
  const depth = relative.split(path.sep).length - 1;
  const prefix = "../".repeat(depth);
  const before = html;
  html = html
    .replace(/<label class="nav-menu-button"[^>]*>([\s\S]*?)<\/label>/g, '<button class="nav-menu-button" type="button" aria-controls="site-nav-links" aria-expanded="false">$1</button>')
    .replace(/id="preview-primary-nav"/g, 'id="site-nav-links"')
    .replace(/id="site-primary-nav"/g, 'id="site-nav-links"')
    .replace(/<nav class="nav-links"(?![^>]*\sid=)/g, '<nav class="nav-links" id="site-nav-links"')
    .replace(/href="\.\.\/en\/guides(?:\/|\/[^"#?]*)?"([^>]*)>English<\/a>/g, 'href="../en/"$1>English</a>');
  if (relative === "about.html") {
    html = html.replace(/<nav class="nav-links" id="site-nav-links" aria-label="Main navigation">[\s\S]*?<\/nav>/, ABOUT_NAV);
  }
  if (!html.includes("site-nav.js")) html = html.replace("</body>", `  <script src="${prefix}site-nav.js?v=20260712-1"></script>\n</body>`);
  if (html !== before) {
    await writeFile(file, html);
    changed += 1;
  }
}

console.log(`Normalized ${changed} site header(s).`);
