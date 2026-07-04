import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const repoRoot = process.cwd();
const backgroundSource = process.argv[2];

if (!backgroundSource || !fs.existsSync(backgroundSource)) {
  throw new Error("Usage: node scripts/render_hhs_trialblazer_assets.mjs /path/to/gpt-background.png");
}

const zhSlug = "hhs-operation-trialblazer-clinical-trials";
const enSlug = "hhs-operation-trialblazer-clinical-trials-en";

const paths = {
  zhContent: path.join(repoRoot, "content", "published", zhSlug, "images"),
  enContent: path.join(repoRoot, "content", "published", enSlug, "images"),
  zhAssets: path.join(repoRoot, "assets", "articles", zhSlug),
  enAssets: path.join(repoRoot, "assets", "articles", enSlug)
};

for (const dir of Object.values(paths)) fs.mkdirSync(dir, { recursive: true });

const cards = [
  {
    file: "figure-01",
    kicker: "FIGURE 01",
    title: "IND to First Patient",
    subtitle: "Operation TrialBlazer targets the slowest early-development choke point: moving from preclinical confidence to the first human dose.",
    chips: ["Phase 1 IND", "CMC", "IRB", "Site Activation", "6-12 Months"],
    panels: [
      ["What slows biotech", "CMC packages, toxicology, protocol design, IRB review, and site startup can consume scarce runway."],
      ["What HHS wants", "Clearer phase-appropriate requirements, rolling IND mechanics, and faster study-start infrastructure."],
      ["Investor read", "A shorter path to human data can raise rNPV by reducing time, cash burn, and financing risk."]
    ],
    callout: "The target is not weaker science. It is less dead time before a drug reaches patients."
  },
  {
    file: "figure-02",
    kicker: "FIGURE 02",
    title: "First-in-Human Dose Selection",
    subtitle: "The FDA is moving QSP, MABEL, and NAMs from specialist language toward mainstream regulatory development.",
    chips: ["QSP", "MABEL", "NAMs", "Organoids", "AI Models"],
    panels: [
      ["Old bottleneck", "Animal toxicology does not always predict human biology, especially for advanced modalities."],
      ["New toolkit", "QSP, human-relevant models, and weight-of-evidence packages support better dose logic."],
      ["Biotech implication", "Winners explain human risk with higher-quality evidence, not simply more animal studies."]
    ],
    callout: "Better models matter because the first dose sets both safety posture and development velocity."
  },
  {
    file: "figure-03",
    kicker: "FIGURE 03",
    title: "Late-Stage Evidence Reset",
    subtitle: "One adequate trial plus strong confirmatory evidence may matter more in rare disease, precision oncology, and cell or gene therapy.",
    chips: ["Substantial Evidence", "Rare Disease", "Precision Oncology", "External Data"],
    panels: [
      ["Old template", "Two large repeated pivotal trials are not realistic for every small or biologically defined group."],
      ["New question", "Can effect size, mechanism, natural history, external controls, and real-world data support credibility?"],
      ["Capital effect", "If the registration path shortens, development cost falls and valuation can rise."]
    ],
    callout: "This is not a free pass. It shifts from rigid duplication toward fit-for-purpose evidence."
  },
  {
    file: "figure-04",
    kicker: "FIGURE 04",
    title: "Clinical Trials as National Competition",
    subtitle: "Operation TrialBlazer is also competitiveness policy: the U.S. wants clinical research, data, talent, and investment back onshore.",
    chips: ["HHS", "FDA", "NIH", "NCI", "ARPA-H", "ONC"],
    panels: [
      ["The anxiety", "Clinical research has been moving to faster systems abroad, including China and Australia."],
      ["The policy signal", "Trial efficiency is now industrial strength, not only a technical FDA issue."],
      ["Execution risk", "Guidance matters only if reviewers have the people, methods, and culture to apply it."]
    ],
    callout: "The next biotech edge may belong to teams that combine strong biology with regulatory fluency."
  }
];

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function wrapWords(text, maxChars) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function textBlock(text, x, y, opts = {}) {
  const {
    maxChars = 40,
    fontSize = 28,
    lineHeight = 1.24,
    weight = 650,
    fill = "#102f3a",
    family = "Inter, Helvetica Neue, Arial, sans-serif",
    anchor = "start",
    letterSpacing = 0
  } = opts;
  const lines = wrapWords(text, maxChars);
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${family}" font-size="${fontSize}" font-weight="${weight}" letter-spacing="${letterSpacing}" fill="${fill}">
${lines.map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : fontSize * lineHeight}">${escapeXml(line)}</tspan>`).join("")}
</text>`;
}

function chip(label, x, y) {
  const width = Math.max(112, label.length * 13 + 38);
  return `<g>
<rect x="${x}" y="${y}" width="${width}" height="48" rx="24" fill="#ecf9f9" stroke="#9bd0d5" stroke-width="2"/>
<text x="${x + width / 2}" y="${y + 31}" text-anchor="middle" font-family="Inter, Helvetica Neue, Arial, sans-serif" font-size="21" font-weight="820" fill="#126a79">${escapeXml(label)}</text>
</g>`;
}

function panel([title, body], x, y, width) {
  return `<g>
<rect x="${x}" y="${y}" width="${width}" height="190" rx="24" fill="rgba(255,255,255,.93)" stroke="#d6e2e5" stroke-width="2"/>
${textBlock(title, x + 28, y + 48, { maxChars: 20, fontSize: 27, lineHeight: 1.12, weight: 850, fill: "#102f3a" })}
${textBlock(body, x + 28, y + 93, { maxChars: 32, fontSize: 20, lineHeight: 1.22, weight: 650, fill: "#5f7078" })}
</g>`;
}

function overlaySvg(card) {
  const titleLines = wrapWords(card.title, 30).length;
  const subtitleY = titleLines > 1 ? 326 : 278;
  const subtitleLines = wrapWords(card.subtitle, 82).length;
  const chipsY = subtitleY + (subtitleLines - 1) * 35 + 22;
  const panelsY = Math.max(430, chipsY + 68);
  let chipX = 82;
  const chips = card.chips.map((item) => {
    const node = chip(item, chipX, chipsY);
    chipX += Math.max(112, item.length * 13 + 38) + 14;
    return node;
  }).join("");

  const panelWidth = 410;
  const panels = card.panels.map((item, index) => panel(item, 82 + index * (panelWidth + 26), panelsY, panelWidth)).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
<defs>
  <linearGradient id="wash" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#ffffff" stop-opacity=".99"/>
    <stop offset="50%" stop-color="#ffffff" stop-opacity=".96"/>
    <stop offset="78%" stop-color="#ffffff" stop-opacity=".74"/>
    <stop offset="100%" stop-color="#ffffff" stop-opacity=".36"/>
  </linearGradient>
  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="20" stdDeviation="18" flood-color="#12313c" flood-opacity=".10"/>
  </filter>
</defs>
<rect width="1600" height="900" fill="url(#wash)"/>
<rect x="34" y="34" width="1532" height="832" rx="34" fill="none" stroke="#d8e4e7" stroke-width="2"/>
<circle cx="1294" cy="328" r="210" fill="none" stroke="#bde0e3" stroke-width="16" opacity=".46"/>
<path d="M1110 468 C1198 338 1302 374 1436 244" fill="none" stroke="#128a95" stroke-width="12" stroke-linecap="round" opacity=".42"/>
<path d="M1134 486 C1238 398 1340 364 1452 202" fill="none" stroke="#d87325" stroke-width="9" stroke-linecap="round" opacity=".78"/>
<circle cx="1124" cy="468" r="40" fill="#ffffff" stroke="#80c7cd" stroke-width="5" filter="url(#shadow)"/>
<circle cx="1244" cy="362" r="54" fill="#ffffff" stroke="#e3a160" stroke-width="5" filter="url(#shadow)"/>
<circle cx="1392" cy="250" r="44" fill="#ffffff" stroke="#80c7cd" stroke-width="5" filter="url(#shadow)"/>
${textBlock(card.kicker, 82, 110, { maxChars: 20, fontSize: 29, lineHeight: 1, weight: 850, fill: "#d87325", letterSpacing: 4 })}
${textBlock(card.title, 82, 186, { maxChars: 30, fontSize: 64, lineHeight: 1.08, weight: 850, fill: "#111820" })}
${textBlock(card.subtitle, 82, subtitleY, { maxChars: 82, fontSize: 28, lineHeight: 1.25, weight: 650, fill: "#5f7078" })}
${chips}
${panels}
<rect x="82" y="768" width="1320" height="92" rx="46" fill="#ecf9f9" stroke="#128a95" stroke-width="4"/>
${textBlock(card.callout, 116, 807, { maxChars: 82, fontSize: 25, lineHeight: 1.2, weight: 850, fill: "#102f3a" })}
</svg>`;
}

async function baseCover() {
  const png = await sharp(backgroundSource)
    .resize(1600, 900, { fit: "cover", position: "center" })
    .png()
    .toBuffer();

  for (const dir of [paths.zhContent, paths.zhAssets, paths.enContent, paths.enAssets]) {
    fs.writeFileSync(path.join(dir, "cover.png"), png);
  }
}

async function renderCard(card) {
  const overlay = Buffer.from(overlaySvg(card));
  const png = await sharp(backgroundSource)
    .resize(1600, 900, { fit: "cover", position: "center" })
    .composite([{ input: overlay, left: 0, top: 0 }])
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(paths.enContent, `${card.file}.png`), png);
  fs.writeFileSync(path.join(paths.enAssets, `${card.file}.png`), png);
}

await baseCover();
for (const card of cards) await renderCard(card);

console.log(`Rendered HHS TrialBlazer cover and ${cards.length} English figure PNGs.`);
