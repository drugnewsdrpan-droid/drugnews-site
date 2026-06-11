import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE = path.join(ROOT, "content", "external-articles.json");
const ASSET_DIR = path.join(ROOT, "assets", "articles", "external-vocus");
const PUBLIC_PREFIX = "../assets/articles/external-vocus";
const DEFAULT_VOCUS_OG = "/static/og_img/vocus_og_2025.jpg";

function slugPart(value, fallback) {
  return String(value || fallback)
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 80) || fallback;
}

function xml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function wrapText(input, max = 15, maxLines = 3) {
  const chars = [...String(input).replace(/\s+/g, " ").trim()];
  const lines = [];
  let line = "";
  for (const char of chars) {
    const next = `${line}${char}`;
    if (next.length > max && line) {
      lines.push(line);
      line = char;
    } else {
      line = next;
    }
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (chars.length > lines.join("").length && lines.length) lines[lines.length - 1] = `${lines[lines.length - 1].replace(/。$/, "")}…`;
  return lines;
}

function coverSvg(item) {
  const titleLines = wrapText(item.title, 16, 3);
  const colors = {
    "生技估值": ["#12313c", "#d77a24"],
    "公司研究": ["#173f4c", "#2d8da0"],
    "BD / 授權": ["#17313f", "#b9783f"],
    "臨床與 CMC": ["#163943", "#1b8a8f"],
    "IR 與資本市場": ["#183340", "#b06c2a"]
  };
  const [ink, accent] = colors[item.category] || colors["公司研究"];
  const lines = titleLines.map((line, index) => `<text x="70" y="${214 + index * 58}" class="title">${xml(line)}</text>`).join("\n    ");
  const badge = `${item.source || "方格子"}・${item.access || "外部文章"}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${xml(item.title)}">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#f0f6f7"/>
    </linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="18"/>
    </filter>
    <style>
      .eyebrow{font:800 26px Arial,'Noto Sans TC',sans-serif;letter-spacing:.16em;fill:${accent};text-transform:uppercase}
      .title{font:800 48px Arial,'Noto Sans TC',sans-serif;fill:${ink};letter-spacing:0}
      .meta{font:700 24px Arial,'Noto Sans TC',sans-serif;fill:#5f6d74}
      .brand{font:800 30px Arial,'Noto Sans TC',sans-serif;fill:${ink}}
    </style>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <path d="M0 445 C210 375 350 535 560 462 S915 405 1200 470" fill="none" stroke="#d9e8eb" stroke-width="6"/>
  <circle cx="948" cy="148" r="110" fill="#e8f3f5" filter="url(#soft)"/>
  <g transform="translate(780 176)">
    <circle cx="115" cy="115" r="98" fill="#eef8f7" stroke="${accent}" stroke-width="8"/>
    <path d="M60 120h110M115 65v110" stroke="${ink}" stroke-width="16" stroke-linecap="round"/>
    <circle cx="74" cy="83" r="18" fill="${accent}"/>
    <circle cx="156" cy="148" r="22" fill="#2b8fa2"/>
    <circle cx="105" cy="173" r="16" fill="${accent}"/>
  </g>
  <rect x="56" y="54" width="210" height="48" rx="24" fill="#ffffff" stroke="#d4dde1" stroke-width="2"/>
  <text x="76" y="87" class="meta">${xml(item.category)}</text>
  <text x="70" y="154" class="eyebrow">Drugnews Article</text>
  ${lines}
  <text x="70" y="520" class="meta">${xml(badge)}</text>
  <text x="70" y="574" class="brand">Drugnews｜藥時事</text>
  <rect x="0" y="0" width="1200" height="630" fill="none" stroke="#d8e1e5" stroke-width="2"/>
</svg>`;
}

function extensionFromUrl(url) {
  try {
    const ext = path.extname(new URL(url).pathname).toLowerCase();
    if ([".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext)) return ext;
  } catch {}
  return ".jpg";
}

async function downloadImage(url, filePath) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 Drugnews image materializer",
      "accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
    }
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const type = response.headers.get("content-type") || "";
  if (!type.startsWith("image/")) throw new Error(`unexpected content type ${type}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(filePath, bytes);
}

async function main() {
  await fs.mkdir(ASSET_DIR, { recursive: true });
  const items = JSON.parse(await fs.readFile(SOURCE, "utf8"));
  let downloaded = 0;
  let generated = 0;

  for (const item of items) {
    const id = slugPart(item.slug || item.title, `external-${generated + downloaded + 1}`);
    if (item.image && item.image.startsWith(PUBLIC_PREFIX)) continue;
    const remote = item.image && /^https?:\/\//i.test(item.image) && !item.image.includes(DEFAULT_VOCUS_OG)
      ? item.image
      : "";
    if (remote) {
      const ext = extensionFromUrl(remote);
      const fileName = `${id}-source${ext}`;
      const filePath = path.join(ASSET_DIR, fileName);
      try {
        await downloadImage(remote, filePath);
        item.image = `${PUBLIC_PREFIX}/${fileName}`;
        downloaded += 1;
        continue;
      } catch (error) {
        console.warn(`Could not download ${item.title}: ${error.message}`);
      }
    }

    const fileName = `${id}-cover.svg`;
    await fs.writeFile(path.join(ASSET_DIR, fileName), coverSvg(item));
    item.image = `${PUBLIC_PREFIX}/${fileName}`;
    generated += 1;
  }

  await fs.writeFile(SOURCE, `${JSON.stringify(items, null, 2)}\n`);
  console.log(`External images materialized. Downloaded: ${downloaded}. Generated: ${generated}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
