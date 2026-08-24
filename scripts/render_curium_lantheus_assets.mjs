import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const W = 1672;
const H = 941;
const root = process.cwd();
const zhDir = path.join(root, "content/published/curium-lantheus-definitive-merger/images");
const enDir = path.join(root, "content/published/curium-lantheus-definitive-merger-en/images");

const esc = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const text = (x, y, value, size, weight = 500, fill = "#17324d", anchor = "start") =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" font-weight="${weight}" fill="${fill}">${esc(value)}</text>`;

const lines = (x, y, values, size, gap, weight = 500, fill = "#49677a", anchor = "start") =>
  values.map((value, index) => text(x, y + index * gap, value, size, weight, fill, anchor)).join("");

const shell = (body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f8fbfd"/><stop offset="1" stop-color="#edf7f6"/></linearGradient>
    <linearGradient id="teal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#087f83"/><stop offset="1" stop-color="#4fc6b5"/></linearGradient>
    <linearGradient id="navy" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#17324d"/><stop offset="1" stop-color="#2d5470"/></linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#17324d" flood-opacity="0.11"/></filter>
    <marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><path d="M0,0 L12,6 L0,12 Z" fill="#087f83"/></marker>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <circle cx="1540" cy="80" r="230" fill="#087f83" opacity="0.05"/><circle cx="100" cy="895" r="260" fill="#ef8354" opacity="0.06"/>
  <style>text{font-family:Inter,Arial,Helvetica,sans-serif}</style>
  ${body}
</svg>`;

const card = (x, y, width, height, fill = "#ffffff", stroke = "#d2e1e7", radius = 28) =>
  `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="2" filter="url(#shadow)"/>`;

const pill = (x, y, width, label, fill = "#e6f6f4", color = "#087f83") =>
  `<rect x="${x}" y="${y}" width="${width}" height="48" rx="24" fill="${fill}"/>${text(x + width / 2, y + 33, label, 22, 750, color, "middle")}`;

const header = (eyebrow, titleValue, subtitle) => `
  ${text(76, 86, eyebrow, 24, 800, "#087f83")}
  ${text(76, 156, titleValue, 52, 800, "#17324d")}
  ${text(76, 207, subtitle, 26, 520, "#557386")}`;

const iconFactory = (cx, cy) => `<g transform="translate(${cx} ${cy})">
  <circle cx="0" cy="0" r="68" fill="#087f83" opacity="0.10"/>
  <circle cx="0" cy="0" r="44" fill="#ffffff" stroke="#087f83" stroke-width="6"/>
  <circle cx="-14" cy="-8" r="9" fill="#ef8354"/><circle cx="15" cy="12" r="12" fill="#087f83"/>
  <path d="M-48 48 C-10 86 42 79 64 28" fill="none" stroke="#17324d" stroke-width="7" stroke-linecap="round"/>
</g>`;

const iconScanner = (cx, cy) => `<g transform="translate(${cx} ${cy})">
  <rect x="-78" y="-50" width="156" height="100" rx="24" fill="#e7f4f3" stroke="#087f83" stroke-width="5"/>
  <circle cx="0" cy="0" r="38" fill="#ffffff" stroke="#17324d" stroke-width="7"/>
  <path d="M-12 0 H95" stroke="#ef8354" stroke-width="9" stroke-linecap="round"/>
</g>`;

const figure1 = shell(`
  ${header("DEAL LOGIC | AUGUST 3, 2026", "Two complementary systems, one radiopharma stack", "A definitive agreement worth up to $8B — signed, but not yet closed")}
  ${card(76, 270, 624, 475)}
  ${pill(112, 304, 154, "CURIUM")}
  ${iconFactory(202, 453)}
  ${text(308, 390, "UPSTREAM + THERAPY", 24, 800, "#087f83")}
  ${lines(308, 438, ["Isotope sourcing", "GMP manufacturing", "Timed distribution", "Therapy portfolio"], 28, 47, 650)}
  ${pill(113, 651, 166, "GLOBAL REACH", "#edf3f7", "#345b74")}
  ${text(302, 683, "70+ countries", 28, 750, "#17324d")}
  <path d="M730 507 H936" stroke="#087f83" stroke-width="12" stroke-linecap="round" marker-end="url(#arrow)"/>
  ${text(835, 463, "+", 76, 800, "#ef8354", "middle")}
  ${card(972, 270, 624, 475)}
  ${pill(1008, 304, 174, "LANTHEUS", "#fff0ea", "#ce623c")}
  ${iconScanner(1096, 455)}
  ${text(1202, 390, "DIAGNOSTICS + ACCESS", 24, 800, "#ce623c")}
  ${lines(1202, 438, ["PYLARIFY", "DEFINITY", "Neuraceq", "U.S. hospital network"], 28, 47, 650)}
  ${pill(1009, 651, 196, "PATIENT ENDPOINT", "#edf3f7", "#345b74")}
  ${text(1230, 683, "Find → Fight → Follow", 27, 750, "#17324d")}
  <rect x="76" y="788" width="1520" height="93" rx="24" fill="url(#navy)"/>
  ${text(122, 846, "$102.50 cash", 30, 800, "#ffffff")}
  ${text(425, 846, "+ up to $12.00 CVR per share", 30, 650, "#d9f5f1")}
  ${text(1518, 846, "Up to $8B", 32, 800, "#71d6c8", "end")}
`);

const chainStep = (x, n, titleValue, subValues, accent) => `
  ${card(x, 318, 258, 326)}
  <circle cx="${x + 52}" cy="370" r="29" fill="${accent}"/>${text(x + 52, 380, n, 27, 800, "#ffffff", "middle")}
  ${text(x + 33, 442, titleValue, 27, 800, "#17324d")}
  ${lines(x + 33, 493, subValues, 22, 34, 520)}
`;

const figure2 = shell(`
  ${header("HALF-LIFE ECONOMICS", "Radiopharma is a synchronized delivery business", "The product clock keeps running from isotope production to patient administration")}
  ${chainStep(76, "1", "Isotope", ["Secure supply", "Match decay profile"], "#087f83")}
  ${chainStep(338, "2", "Label + GMP", ["Manufacture", "on schedule"], "#159e97")}
  ${chainStep(600, "3", "QC + release", ["Test quickly", "without shortcuts"], "#43b8a8")}
  ${chainStep(862, "4", "Shielded delivery", ["Coordinate route", "and handoff"], "#e6a451")}
  ${chainStep(1124, "5", "Hospital slot", ["Align staff", "scanner and dose"], "#ef8354")}
  ${chainStep(1386, "6", "Patient use", ["Right patient", "right time"], "#d85b45")}
  <path d="M302 482 H328 M564 482 H590 M826 482 H852 M1088 482 H1114 M1350 482 H1376" stroke="#087f83" stroke-width="7" stroke-linecap="round"/>
  <rect x="76" y="714" width="1520" height="157" rx="28" fill="#17324d"/>
  <circle cx="152" cy="793" r="48" fill="none" stroke="#71d6c8" stroke-width="7"/><path d="M152 793 L152 758 M152 793 L182 810" stroke="#71d6c8" stroke-width="7" stroke-linecap="round"/>
  ${text(232, 780, "One missed handoff can erase a dose's value", 34, 800, "#ffffff")}
  ${text(232, 825, "Supply density, routing and hospital scheduling are strategic assets — not back-office details.", 25, 520, "#d6e5ed")}
`);

const loopNode = (cx, cy, label, titleValue, subValues, color) => `
  <circle cx="${cx}" cy="${cy}" r="126" fill="#ffffff" stroke="${color}" stroke-width="8" filter="url(#shadow)"/>
  <circle cx="${cx}" cy="${cy - 58}" r="30" fill="${color}"/>
  ${text(cx, cy - 49, label, 24, 800, "#ffffff", "middle")}
  ${text(cx, cy + 10, titleValue, 36, 800, "#17324d", "middle")}
  ${lines(cx, cy + 51, subValues, 20, 29, 520, "#557386", "middle")}
`;

const figure3 = shell(`
  ${header("THERANOSTICS", "Find → Fight → Follow", "The same biological target can connect diagnosis, treatment and longitudinal evidence")}
  <path d="M452 485 C575 265 933 262 1070 474" fill="none" stroke="#b9dcd8" stroke-width="28" stroke-linecap="round"/>
  <path d="M1108 550 C1000 763 644 766 492 570" fill="none" stroke="#c7d9e4" stroke-width="28" stroke-linecap="round"/>
  <path d="M545 360 C642 280 821 261 937 319" fill="none" stroke="#087f83" stroke-width="8" marker-end="url(#arrow)"/>
  <path d="M1008 671 C878 748 696 730 594 646" fill="none" stroke="#087f83" stroke-width="8" marker-end="url(#arrow)"/>
  ${loopNode(330, 525, "1", "FIND", ["PSMA PET", "Select the patient"], "#087f83")}
  ${loopNode(836, 393, "2", "FIGHT", ["Targeted radioligand", "Deliver therapy"], "#ef8354")}
  ${loopNode(1342, 525, "3", "FOLLOW", ["Imaging + biomarkers", "Track response"], "#4e7da3")}
  <rect x="310" y="771" width="1052" height="94" rx="47" fill="url(#navy)"/>
  ${text(836, 830, "One target • one patient journey • repeated clinical touchpoints", 29, 750, "#ffffff", "middle")}
`);

const layer = (y, width, label, subValue, fill, color = "#ffffff") => {
  const x = 756 + (840 - width) / 2;
  return `<rect x="${x}" y="${y}" width="${width}" height="78" rx="22" fill="${fill}" filter="url(#shadow)"/>${text(x + 35, y + 34, label, 25, 800, color)}${text(x + width - 35, y + 52, subValue, 21, 560, color, "end")}`;
};

const figure4 = shell(`
  ${header("THE NEW M&A PLAYBOOK", "From pipeline deals to full-chain integration", "Curium–Lantheus links infrastructure, products and patient access in one operating system")}
  ${card(76, 270, 500, 504)}
  ${pill(112, 306, 202, "EARLIER WAVE", "#edf3f7", "#345b74")}
  ${text(112, 397, "Pipeline + platform", 34, 800, "#17324d")}
  ${lines(112, 455, ["Lilly → POINT", "BMS → RayzeBio", "AstraZeneca → Fusion"], 28, 50, 650)}
  <path d="M112 634 H522" stroke="#d2e1e7" stroke-width="2"/>
  ${text(112, 682, "Strategic question", 22, 800, "#087f83")}
  ${lines(112, 724, ["Which asset can add", "clinical value?"], 26, 34, 650)}
  <path d="M615 519 H720" stroke="#087f83" stroke-width="12" stroke-linecap="round" marker-end="url(#arrow)"/>
  ${text(666, 472, "→", 64, 800, "#ef8354", "middle")}
  ${card(756, 270, 840, 504)}
  ${pill(792, 306, 286, "FULL-STACK WAVE", "#e6f6f4", "#087f83")}
  ${layer(383, 696, "ISOTOPE SUPPLY", "availability", "#17324d")}
  ${layer(471, 628, "MANUFACTURING", "scale + quality", "#28536d")}
  ${layer(559, 560, "DISTRIBUTION", "half-life logistics", "#087f83")}
  ${layer(647, 492, "DIAGNOSIS → THERAPY", "hospital access", "#43b8a8", "#17324d")}
  <rect x="76" y="816" width="1520" height="64" rx="20" fill="#fff0ea"/>
  ${text(836, 858, "Competitive advantage now comes from making every layer arrive at the same patient on time.", 27, 700, "#b95234", "middle")}
`);

async function writeWebp(svg, destination) {
  await sharp(Buffer.from(svg)).resize({ width: 1400 }).webp({ quality: 82, effort: 5 }).toFile(destination);
}

async function writeCoverVariants(dir) {
  const source = path.join(dir, "cover.png");
  await sharp(source).resize({ width: 720, withoutEnlargement: true }).webp({ quality: 74, effort: 5 }).toFile(path.join(dir, "cover-720.webp"));
  await sharp(source).resize({ width: 1400, withoutEnlargement: true }).webp({ quality: 80, effort: 5 }).toFile(path.join(dir, "cover-1400.webp"));
}

await mkdir(zhDir, { recursive: true });
await mkdir(enDir, { recursive: true });
await writeCoverVariants(zhDir);
await writeCoverVariants(enDir);

for (let index = 1; index <= 4; index += 1) {
  const number = String(index).padStart(2, "0");
  await sharp(path.join(zhDir, `figure-${number}.jpg`))
    .resize({ width: 1400, withoutEnlargement: true })
    .webp({ quality: 82, effort: 5 })
    .toFile(path.join(zhDir, `figure-${number}.webp`));
}

for (const [index, svg] of [figure1, figure2, figure3, figure4].entries()) {
  const number = String(index + 1).padStart(2, "0");
  await writeWebp(svg, path.join(enDir, `figure-${number}.webp`));
}

console.log(JSON.stringify({ zhDir, enDir, coverVariants: 4, zhFigures: 4, enFigures: 4, dimensions: `${W}x${H}` }, null, 2));
