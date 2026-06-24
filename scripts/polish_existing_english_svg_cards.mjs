import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const ASSETS = path.join(ROOT, "assets/articles");

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function decodeXml(value) {
  return String(value ?? "")
    .replaceAll("&apos;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&amp;", "&");
}

function wrapText(text, max = 31) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function textLines(lines, x, y, lineHeight, className, anchor = "start") {
  return lines.map((line, index) => (
    `<text x="${x}" y="${y + index * lineHeight}" class="${className}" text-anchor="${anchor}">${escapeXml(line)}</text>`
  )).join("\n");
}

function extractTexts(svg, className) {
  const regex = new RegExp(`<text[^>]*class="${className}"[^>]*>([\\s\\S]*?)<\\/text>`, "g");
  return [...svg.matchAll(regex)].map((match) => decodeXml(match[1].replace(/<[^>]+>/g, "").trim())).filter(Boolean);
}

function extractCard(svg) {
  const title = extractTexts(svg, "title").join(" ").replace(/\s+/g, " ").trim();
  const subtitle = extractTexts(svg, "subtitle").join(" ").replace(/\s+/g, " ").trim();
  const points = extractTexts(svg, "point").map((point) => point.replace(/\s+/g, " ").trim()).filter(Boolean);
  const label = extractTexts(svg, "label")[0] || "Drugnews English";
  const aria = decodeXml(svg.match(/aria-label="([^"]+)"/)?.[1] || "");
  return {
    label,
    title: title || aria || "Drugnews English",
    subtitle,
    points
  };
}

function iconForTheme(haystack) {
  const text = haystack.toLowerCase();
  if (/car-t|cell therapy|asco|oncology|cancer|ras|pd-1|vegf|lung|tumor|keytruda|merck|gsk|nuvalent|pdac|daraxonrasib/.test(text)) return "oncology";
  if (/radio|nuclear|isotope|radiopharma|curium|lantheus/.test(text)) return "radiopharma";
  if (/glp|obesity|metabolic|weight|wegovy|lilly|novo|tirzepatide|ecnoglutide/.test(text)) return "metabolic";
  if (/vaccine|prevention|immune|immunology/.test(text)) return "vaccine";
  if (/capital|financ|cash|market|treasury|runway|investor|valuation|bd|deal/.test(text)) return "capital";
  if (/ai|model|pipeline|algorithm|clinical asset engine/.test(text)) return "ai";
  return "biotech";
}

function molecule(x, y, accent, scale = 1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <line x1="30" y1="44" x2="92" y2="80" stroke="${accent}" stroke-width="6" opacity=".8"/>
    <line x1="92" y1="80" x2="160" y2="42" stroke="${accent}" stroke-width="6" opacity=".8"/>
    <line x1="92" y1="80" x2="124" y2="154" stroke="${accent}" stroke-width="6" opacity=".8"/>
    <circle cx="30" cy="44" r="22" fill="#fff" stroke="${accent}" stroke-width="7"/>
    <circle cx="92" cy="80" r="28" fill="${accent}" opacity=".22" stroke="${accent}" stroke-width="7"/>
    <circle cx="160" cy="42" r="20" fill="#fff" stroke="${accent}" stroke-width="7"/>
    <circle cx="124" cy="154" r="22" fill="#fff" stroke="${accent}" stroke-width="7"/>
  </g>`;
}

function vial(x, y, accent, scale = 1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <rect x="34" y="0" width="76" height="24" rx="8" fill="#b8cbd3" stroke="#7e99a7" stroke-width="4"/>
    <path d="M44 24 v34 c-18 19-26 47-26 86v106c0 18 14 32 32 32h94c18 0 32-14 32-32v-106c0-39-8-67-26-86V24z" fill="#fff" stroke="${accent}" stroke-width="7"/>
    <path d="M24 180 c38 30 104 32 146 2v67c0 12-9 21-21 21h-104c-12 0-21-9-21-21z" fill="${accent}" opacity=".18"/>
    <path d="M52 84 c36-22 74-20 104 0" fill="none" stroke="#d4e3e8" stroke-width="8" stroke-linecap="round"/>
  </g>`;
}

function syringe(x, y, accent, scale = 1) {
  return `<g transform="translate(${x} ${y}) rotate(-22 150 80) scale(${scale})">
    <rect x="66" y="48" width="160" height="54" rx="16" fill="#fff" stroke="${accent}" stroke-width="7"/>
    <path d="M226 75 h70" stroke="${accent}" stroke-width="8" stroke-linecap="round"/>
    <path d="M292 75 h70" stroke="#738892" stroke-width="4" stroke-linecap="round"/>
    <path d="M54 48 v54M34 40 h30M34 110 h30" stroke="${accent}" stroke-width="8" stroke-linecap="round"/>
    <path d="M104 48 v54M142 48 v54M180 48 v54" stroke="${accent}" stroke-width="4" opacity=".35"/>
  </g>`;
}

function chart(x, y, accent, scale = 1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <rect x="10" y="24" width="260" height="180" rx="24" fill="#fff" stroke="#cadbe2" stroke-width="5"/>
    <path d="M48 156 h34v28H48zM104 126h34v58h-34zM160 92h34v92h-34z" fill="${accent}" opacity=".28" stroke="${accent}" stroke-width="4"/>
    <path d="M44 76 c54 28 93 20 146-34" fill="none" stroke="${accent}" stroke-width="9" stroke-linecap="round"/>
    <path d="M184 42 h42v42" fill="none" stroke="${accent}" stroke-width="9" stroke-linecap="round"/>
  </g>`;
}

function tumor(x, y, accent, scale = 1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <circle cx="132" cy="132" r="78" fill="${accent}" opacity=".16"/>
    ${[0, 1, 2, 3, 4, 5, 6].map((i) => {
      const angle = i * Math.PI * 2 / 7;
      const cx = 132 + Math.cos(angle) * 62;
      const cy = 132 + Math.sin(angle) * 54;
      return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${25 + (i % 3) * 5}" fill="#fff" stroke="${accent}" stroke-width="6" opacity=".95"/>`;
    }).join("\n")}
    <circle cx="132" cy="132" r="48" fill="${accent}" opacity=".38" stroke="${accent}" stroke-width="6"/>
    <path d="M42 208 c72-42 131-42 190 0" fill="none" stroke="${accent}" stroke-width="8" opacity=".45" stroke-linecap="round"/>
  </g>`;
}

function atom(x, y, accent, scale = 1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <circle cx="132" cy="132" r="20" fill="${accent}"/>
    <ellipse cx="132" cy="132" rx="106" ry="40" fill="none" stroke="${accent}" stroke-width="7"/>
    <ellipse cx="132" cy="132" rx="106" ry="40" fill="none" stroke="${accent}" stroke-width="7" transform="rotate(60 132 132)"/>
    <ellipse cx="132" cy="132" rx="106" ry="40" fill="none" stroke="${accent}" stroke-width="7" transform="rotate(-60 132 132)"/>
    <circle cx="226" cy="132" r="13" fill="#fff" stroke="${accent}" stroke-width="5"/>
  </g>`;
}

function aiCircuit(x, y, accent, scale = 1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <rect x="52" y="52" width="160" height="160" rx="28" fill="#fff" stroke="${accent}" stroke-width="7"/>
    <path d="M92 132 h80M132 92 v80M82 82 l-42-42M182 82 l42-42M82 182 l-42 42M182 182 l42 42" stroke="${accent}" stroke-width="7" stroke-linecap="round"/>
    <circle cx="132" cy="132" r="34" fill="${accent}" opacity=".20" stroke="${accent}" stroke-width="6"/>
    <circle cx="40" cy="40" r="12" fill="#fff" stroke="${accent}" stroke-width="5"/>
    <circle cx="224" cy="40" r="12" fill="#fff" stroke="${accent}" stroke-width="5"/>
    <circle cx="40" cy="224" r="12" fill="#fff" stroke="${accent}" stroke-width="5"/>
    <circle cx="224" cy="224" r="12" fill="#fff" stroke="${accent}" stroke-width="5"/>
  </g>`;
}

function metabolic(x, y, accent, scale = 1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <path d="M94 54 c-48 34-55 116-8 152 c32 24 79 8 75-36 c-3-31-40-31-49-9 c-10 25 20 44 48 34 c50-18 50-103 3-139" fill="none" stroke="${accent}" stroke-width="10" stroke-linecap="round"/>
    <circle cx="140" cy="96" r="58" fill="${accent}" opacity=".12"/>
    <path d="M210 198 c14-28 45-44 84-45" stroke="#d3752c" stroke-width="10" stroke-linecap="round" fill="none"/>
    <rect x="220" y="56" width="82" height="32" rx="16" fill="#fff" stroke="#d3752c" stroke-width="6" transform="rotate(-28 261 72)"/>
  </g>`;
}

function shield(x, y, accent, scale = 1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <path d="M132 30 l92 32 v78 c0 62-35 108-92 132 c-57-24-92-70-92-132V62z" fill="#fff" stroke="${accent}" stroke-width="8"/>
    <path d="M84 136 l34 34 l66-78" fill="none" stroke="${accent}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="132" cy="132" r="98" fill="${accent}" opacity=".10"/>
  </g>`;
}

function themeArt(theme, accent) {
  if (theme === "metabolic") return metabolic(770, 184, accent, 1);
  if (theme === "vaccine") return `${syringe(738, 185, accent, .86)}${shield(845, 262, "#265f73", .74)}`;
  if (theme === "capital") return `${chart(765, 182, accent, 1.03)}${vial(928, 300, "#265f73", .62)}`;
  if (theme === "ai") return aiCircuit(808, 205, accent, 1.02);
  if (theme === "radiopharma") return atom(816, 190, accent, 1.02);
  if (theme === "oncology") return `${tumor(790, 190, accent, .9)}${molecule(890, 86, "#265f73", .62)}`;
  return `${vial(790, 168, accent, .86)}${molecule(910, 280, "#265f73", .76)}`;
}

function polishedCard({ label, title, subtitle, points, theme, accent }) {
  const titleLines = wrapText(title, 29).slice(0, 3);
  const subtitleLines = wrapText(subtitle, 54).slice(0, 2);
  const pointList = points.slice(0, 4);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675" role="img" aria-label="${escapeXml(title)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fbfefe"/>
      <stop offset="58%" stop-color="#edf7f7"/>
      <stop offset="100%" stop-color="#fff8ef"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="16" flood-color="#12313c" flood-opacity="0.12"/>
    </filter>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="9" flood-color="#12313c" flood-opacity="0.10"/>
    </filter>
  </defs>
  <style>
    .label{font:800 20px Inter,Arial,sans-serif;letter-spacing:.16em;text-transform:uppercase;fill:#a45f2b}
    .title{font:850 43px Inter,Arial,sans-serif;fill:#14191d}
    .subtitle{font:650 22px Inter,Arial,sans-serif;fill:#536671}
    .point{font:800 24px Inter,Arial,sans-serif;fill:#173843}
    .small{font:750 17px Inter,Arial,sans-serif;fill:#6d7a83}
  </style>
  <rect width="1200" height="675" fill="url(#bg)"/>
  <path d="M55 555 C237 464 382 524 535 568 C734 626 891 508 1140 550" fill="none" stroke="#cfe7ea" stroke-width="5" opacity=".85"/>
  <path d="M765 86 C918 28 1065 72 1126 216 C1195 376 1064 566 886 547 C736 531 667 405 697 269 C716 181 741 117 765 86Z" fill="${accent}" opacity=".08"/>
  <g filter="url(#shadow)">
    <rect x="48" y="46" width="650" height="580" rx="28" fill="#fff" opacity=".96"/>
  </g>
  <text x="76" y="102" class="label">${escapeXml(label || "Drugnews English")}</text>
  ${textLines(titleLines, 76, 154, 49, "title")}
  ${textLines(subtitleLines, 76, 318, 30, "subtitle")}
  <g filter="url(#soft)">
    <rect x="76" y="388" width="552" height="${Math.max(112, 48 + pointList.length * 42)}" rx="24" fill="#f5faf9" stroke="#d8e5e8"/>
  </g>
  ${pointList.map((point, index) => {
    const y = 435 + index * 42;
    return `<g>
      <circle cx="104" cy="${y - 8}" r="10" fill="${accent}"/>
      <path d="M99 ${y - 8} l4 5 l9 -13" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="128" y="${y}" class="point">${escapeXml(point)}</text>
    </g>`;
  }).join("\n")}
  <text x="76" y="600" class="small">Drugnews | Biotech business analysis</text>
  <g filter="url(#soft)">
    ${themeArt(theme, accent)}
  </g>
</svg>
`;
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    if (entry.isFile()) files.push(full);
  }
  return files;
}

const files = (await walk(ASSETS))
  .filter((file) => /-en\/(?:cover-en|figure-\d+-en)\.svg$/.test(file))
  .filter((file) => !file.includes("obesity-drug-third-place-competition-en"));

let updated = 0;
for (const file of files) {
  const svg = await fs.readFile(file, "utf8");
  if (!svg.includes('class="title"')) continue;
  const card = extractCard(svg);
  const haystack = `${card.title} ${card.subtitle} ${card.points.join(" ")} ${file}`;
  const theme = iconForTheme(haystack);
  const accent = /figure-0?2|cover/.test(path.basename(file)) ? "#265f73" : "#d3752c";
  await fs.writeFile(file, polishedCard({ ...card, theme, accent }).replace(/[ \t]+$/gm, ""));
  updated += 1;
}

console.log(`Polished ${updated} existing English SVG card(s).`);
