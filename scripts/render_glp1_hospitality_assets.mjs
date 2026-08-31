import { createRequire } from "node:module";
import { copyFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const W = 1672;
const H = 941;
const root = process.cwd();
const sourceRoot = "/Users/jojo/Documents/藥時事/GLP1_逼瘋五星級酒店_20260824/images";
const zhDir = path.join(root, "content/published/glp1-luxury-hospitality-spending-shift/images");
const enDir = path.join(root, "content/published/glp1-luxury-hospitality-spending-shift-en/images");

const C = {
  navy: "#16384A",
  navy2: "#245469",
  teal: "#0D8A8F",
  aqua: "#63C8C0",
  coral: "#D7644B",
  gold: "#D59A34",
  ink: "#193748",
  muted: "#59717D",
  pale: "#F1F8F7",
  cream: "#FFF8EC",
  white: "#FFFFFF"
};

const esc = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const text = (x, y, value, size, weight = 600, fill = C.ink, anchor = "start") =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" font-weight="${weight}" fill="${fill}">${esc(value)}</text>`;

const lines = (x, y, values, size, gap, weight = 600, fill = C.ink, anchor = "start") =>
  values.map((value, index) => text(x, y + index * gap, value, size, weight, fill, anchor)).join("");

const rounded = (x, y, width, height, fill = C.white, stroke = "#D7E7E9", radius = 28) =>
  `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="2" filter="url(#shadow)"/>`;

const defs = `
  <defs>
    <linearGradient id="page" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="${C.pale}"/></linearGradient>
    <linearGradient id="hero" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.navy}"/><stop offset="1" stop-color="${C.navy2}"/></linearGradient>
    <linearGradient id="goldGlass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFEBC4"/><stop offset="1" stop-color="${C.gold}"/></linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#16384A" flood-opacity="0.12"/></filter>
    <marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><path d="M0,0 L12,6 L0,12 Z" fill="${C.teal}"/></marker>
  </defs>
  <style>text{font-family:Inter,"PingFang TC","Noto Sans CJK TC",Arial,sans-serif}</style>`;

const base = (body, background = "url(#page)", brandFill = C.navy) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">
  ${defs}
  <rect width="100%" height="100%" fill="${background}"/>
  <circle cx="1540" cy="94" r="270" fill="${C.teal}" opacity="0.055"/>
  <circle cx="80" cy="890" r="250" fill="${C.coral}" opacity="0.05"/>
  ${body}
  ${text(1588, 895, "DRUGNEWS", 24, 800, brandFill, "end")}
</svg>`;

const hotelScene = `
  <g transform="translate(1035 145)">
    <rect x="0" y="0" width="475" height="560" rx="44" fill="#FFFFFF" opacity="0.1"/>
    <rect x="52" y="92" width="365" height="14" rx="7" fill="#FFFFFF" opacity="0.52"/>
    <rect x="92" y="138" width="285" height="14" rx="7" fill="#FFFFFF" opacity="0.28"/>
    <ellipse cx="238" cy="348" rx="184" ry="56" fill="#FFFFFF" opacity="0.95"/>
    <ellipse cx="238" cy="336" rx="116" ry="31" fill="#E8F3F1"/>
    <path d="M172 333 C205 284 255 284 304 333 C267 366 205 366 172 333Z" fill="${C.aqua}" opacity="0.9"/>
    <circle cx="236" cy="315" r="22" fill="${C.coral}"/>
    <path d="M78 228 h74 l-14 96 h-46 Z" fill="url(#goldGlass)" opacity="0.92"/>
    <path d="M115 324 v80 M78 404 h74" stroke="#FFFFFF" stroke-width="10" stroke-linecap="round"/>
    <g transform="translate(330 238) rotate(-12)">
      <rect x="0" y="0" width="48" height="186" rx="24" fill="#F4FAFA" stroke="${C.aqua}" stroke-width="7"/>
      <rect x="8" y="22" width="32" height="82" rx="16" fill="${C.teal}" opacity="0.2"/>
      <path d="M24 184 v52" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round"/>
    </g>
    <path d="M108 495 C178 454 293 454 368 495" fill="none" stroke="#FFFFFF" stroke-width="12" stroke-linecap="round" opacity="0.35"/>
  </g>`;

const zhCover = base(`
  <rect width="1672" height="941" fill="url(#hero)"/>
  <circle cx="1410" cy="165" r="330" fill="${C.aqua}" opacity="0.13"/>
  ${text(82, 90, "DRUGNEWS｜GLP-1 商業外溢", 24, 800, "#7AD9D1")}
  ${lines(82, 218, ["減重針逼瘋", "五星級飯店？"], 80, 94, 800, C.white)}
  ${lines(82, 459, ["客人吃少了，飯店靠什麼賺？", "真正的題目，是把『量』改寫成『價值』。"], 32, 48, 600, "#D8EFF0")}
  <rect x="82" y="660" width="830" height="124" rx="28" fill="#FFFFFF" opacity="0.96"/>
  ${text(120, 708, "早期訊號", 23, 800, C.coral)}
  ${text(120, 758, "GLP-1 正在改變支出與服務設計，但還不是全產業定局。", 29, 750, C.navy)}
  ${hotelScene}
`, "url(#hero)", C.white);

const enCover = base(`
  <rect width="1672" height="941" fill="url(#hero)"/>
  <circle cx="1410" cy="165" r="330" fill="${C.aqua}" opacity="0.13"/>
  ${text(82, 90, "DRUGNEWS | GLP-1 BUSINESS SPILLOVER", 24, 800, "#7AD9D1")}
  ${lines(82, 218, ["When Luxury Guests", "Start Eating Less"], 74, 88, 800, C.white)}
  ${lines(82, 447, ["How do five-star hotels protect value when appetite shrinks?", "The answer is service design—not simply smaller plates."], 29, 44, 600, "#D8EFF0")}
  <rect x="82" y="660" width="830" height="124" rx="28" fill="#FFFFFF" opacity="0.96"/>
  ${text(120, 708, "EARLY SIGNAL", 22, 800, C.coral)}
  ${text(120, 758, "Spending is shifting. An industry-wide verdict has not arrived.", 24, 750, C.navy)}
  ${hotelScene}
`, "url(#hero)", C.white);

const enFigure1 = base(`
  ${text(76, 82, "FIGURE 1 | THE EARLY WARNING", 22, 800, C.teal)}
  ${text(76, 151, "GLP-1 Is Reaching the Consumer Bill", 52, 800, C.navy)}
  ${text(76, 202, "A biological signal is beginning to show up in household transactions.", 27, 560, C.muted)}
  ${rounded(76, 276, 442, 412, C.white, C.teal)}
  ${text(297, 333, "GLP-1 therapy", 25, 800, C.navy, "middle")}
  <g transform="translate(235 385)"><rect x="0" y="0" width="64" height="206" rx="32" fill="#E6F5F4" stroke="${C.teal}" stroke-width="8"/><rect x="13" y="30" width="38" height="92" rx="18" fill="${C.aqua}" opacity="0.48"/><path d="M32 205v55" stroke="${C.teal}" stroke-width="10" stroke-linecap="round"/></g>
  ${lines(297, 632, ["Appetite and satiety", "signals can change"], 25, 36, 650, C.muted, "middle")}
  <path d="M540 485 H650" stroke="${C.teal}" stroke-width="10" marker-end="url(#arrow)"/>
  ${rounded(682, 276, 432, 412, C.white, C.gold)}
  ${text(898, 333, "Observed at 6 months", 25, 800, C.navy, "middle")}
  ${text(898, 445, "−5.3%", 76, 850, C.coral, "middle")}
  ${text(898, 490, "grocery spending", 24, 750, C.navy, "middle")}
  ${text(898, 586, "−8.2%", 60, 850, C.coral, "middle")}
  ${text(898, 627, "higher-income households", 22, 650, C.muted, "middle")}
  <path d="M1138 485 H1248" stroke="${C.teal}" stroke-width="10" marker-end="url(#arrow)"/>
  ${rounded(1280, 276, 316, 412, C.white, C.coral)}
  ${text(1438, 333, "Dining signal", 25, 800, C.navy, "middle")}
  ${text(1438, 456, "−8.0%", 72, 850, C.coral, "middle")}
  ${lines(1438, 521, ["limited-service", "restaurants"], 25, 34, 700, C.navy, "middle")}
  ${lines(1438, 626, ["Not hotel revenue.", "Not a causal trial."], 22, 32, 650, C.muted, "middle")}
  <rect x="158" y="762" width="1356" height="98" rx="26" fill="${C.navy}"/>
  ${text(836, 822, "The data are an early warning for hospitality—not a forecast of global five-star revenue.", 29, 700, C.white, "middle")}
`);

const lever = (x, y, label, titleValue, body, color) => `
  ${rounded(x, y, 286, 290, C.white, color)}
  <circle cx="${x + 50}" cy="${y + 52}" r="29" fill="${color}"/>
  ${text(x + 50, y + 62, label, 22, 800, C.white, "middle")}
  ${text(x + 36, y + 126, titleValue, 25, 800, C.navy)}
  ${lines(x + 36, y + 178, body, 21, 31, 600, C.muted)}
`;

const enFigure2 = base(`
  ${text(76, 82, "FIGURE 2 | SERVICE REDESIGN", 22, 800, C.teal)}
  ${text(76, 151, "Less Food Does Not Have to Mean Less Value", 50, 800, C.navy)}
  ${text(76, 202, "Luxury shifts from abundance on the table to precision in the guest experience.", 27, 560, C.muted)}
  ${lever(76, 300, "1", "Portion choice", ["Smaller plates", "without looking", "like cost-cutting"], C.teal)}
  ${lever(390, 300, "2", "Zero-proof", ["Keep aroma, ritual", "and social value", "without alcohol"], C.gold)}
  ${lever(704, 300, "3", "Room design", ["Flexible minibar,", "cold storage and", "right-sized options"], C.coral)}
  ${lever(1018, 300, "4", "Personalization", ["Ask preferences", "without turning", "service into diagnosis"], C.navy2)}
  ${lever(1332, 300, "5", "Nutrition + strength", ["Protein density", "plus resistance", "training—not hype"], C.teal)}
  <rect x="154" y="742" width="1364" height="112" rx="28" fill="#E7F5F4" stroke="${C.teal}" stroke-width="3"/>
  ${text(836, 791, "THE OPERATOR QUESTION", 21, 800, C.teal, "middle")}
  ${text(836, 833, "Can the hotel make 'less' feel more intentional, more personal and still worth paying for?", 29, 800, C.navy, "middle")}
`);

const enFigure3 = base(`
  ${text(76, 82, "FIGURE 3 | FROM PRESSURE TO NEW REVENUE", 22, 800, C.teal)}
  ${text(76, 151, "GLP-1 Does Not Remove Desire. It Redirects It.", 50, 800, C.navy)}
  ${text(76, 202, "The value pool may move from food volume toward precision, wellness and experience.", 27, 560, C.muted)}
  <g transform="translate(85 340)">
    <rect x="0" y="0" width="260" height="196" rx="30" fill="#FFF0EC" stroke="${C.coral}" stroke-width="3"/>
    ${text(130, 58, "Lower volume", 26, 800, C.navy, "middle")}
    ${lines(130, 108, ["fewer add-ons", "less alcohol", "more leftovers"], 22, 34, 650, C.muted, "middle")}
    <path d="M285 98 H380" stroke="${C.teal}" stroke-width="10" marker-end="url(#arrow)"/>
    <rect x="414" y="0" width="260" height="196" rx="30" fill="#EDF8F7" stroke="${C.teal}" stroke-width="3"/>
    ${text(544, 58, "Service reset", 26, 800, C.navy, "middle")}
    ${lines(544, 108, ["portion design", "zero-proof ritual", "preference data"], 22, 34, 650, C.muted, "middle")}
    <path d="M699 98 H794" stroke="${C.teal}" stroke-width="10" marker-end="url(#arrow)"/>
    <rect x="828" y="0" width="260" height="196" rx="30" fill="#FFF8E9" stroke="${C.gold}" stroke-width="3"/>
    ${text(958, 58, "New value", 26, 800, C.navy, "middle")}
    ${lines(958, 108, ["nutrition", "strength", "recovery"], 22, 34, 650, C.muted, "middle")}
    <path d="M1113 98 H1208" stroke="${C.teal}" stroke-width="10" marker-end="url(#arrow)"/>
    <rect x="1242" y="0" width="260" height="196" rx="30" fill="#EDF0F6" stroke="${C.navy2}" stroke-width="3"/>
    ${text(1372, 58, "Revenue pools", 26, 800, C.navy, "middle")}
    ${lines(1372, 108, ["higher unit value", "bundled stays", "repeat purchase"], 22, 34, 650, C.muted, "middle")}
  </g>
  ${rounded(92, 626, 716, 190, C.white, C.navy)}
  ${text(128, 679, "What to measure", 25, 800, C.teal)}
  ${lines(128, 727, ["Small-portion take rate  •  zero-proof check", "waste reduction  •  wellness repeat purchase"], 25, 40, 700, C.navy)}
  ${rounded(864, 626, 716, 190, C.white, C.coral)}
  ${text(900, 679, "What not to claim", 25, 800, C.coral)}
  ${lines(900, 727, ["Early hotel cases ≠ industry standard", "commercial wellness ≠ proven medical benefit"], 25, 40, 700, C.navy)}
`);

const enFigure4 = base(`
  ${text(76, 82, "FIGURE 4 | THE OPERATOR SCORECARD", 22, 800, C.teal)}
  ${text(76, 151, "Four Metrics Before Calling It a Hotel Revolution", 50, 800, C.navy)}
  ${text(76, 202, "For Taiwan operators, measurement should come before a branded GLP-1 package.", 27, 560, C.muted)}
  ${rounded(76, 285, 350, 424, C.white, C.teal)}
  ${text(116, 346, "01", 25, 850, C.teal)}
  ${text(116, 405, "SMALL-PORTION", 25, 850, C.navy)}
  ${text(116, 443, "TAKE RATE", 25, 850, C.navy)}
  ${lines(116, 535, ["Are guests actively", "choosing flexibility—", "or merely eating less?"], 24, 37, 600, C.muted)}
  ${rounded(466, 285, 350, 424, C.white, C.gold)}
  ${text(506, 346, "02", 25, 850, C.gold)}
  ${text(506, 405, "ZERO-PROOF", 25, 850, C.navy)}
  ${text(506, 443, "CHECK VALUE", 25, 850, C.navy)}
  ${lines(506, 535, ["Does non-alcoholic", "ritual protect the", "beverage check?"], 24, 37, 600, C.muted)}
  ${rounded(856, 285, 350, 424, C.white, C.coral)}
  ${text(896, 346, "03", 25, 850, C.coral)}
  ${text(896, 405, "WELLNESS", 25, 850, C.navy)}
  ${text(896, 443, "REPEAT PURCHASE", 25, 850, C.navy)}
  ${lines(896, 535, ["Do nutrition and", "recovery services", "bring guests back?"], 24, 37, 600, C.muted)}
  ${rounded(1246, 285, 350, 424, C.white, C.navy2)}
  ${text(1286, 346, "04", 25, 850, C.navy2)}
  ${text(1286, 405, "FOOD WASTE", 25, 850, C.navy)}
  ${text(1286, 443, "PER OCCUPIED ROOM", 25, 850, C.navy)}
  ${lines(1286, 535, ["Can smaller formats", "cut waste without", "damaging value?"], 24, 37, 600, C.muted)}
  <rect x="168" y="766" width="1336" height="92" rx="26" fill="${C.navy}"/>
  ${text(836, 823, "A trend reaches the P&L only when service design changes price, cost or repeat behavior.", 29, 750, C.white, "middle")}
`);

async function png(svg, destination) {
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(destination);
}

async function variants(source, stem) {
  for (const [suffix, width, quality] of [["720", 720, 76], ["1400", 1400, 82]]) {
    await sharp(source).resize({ width, withoutEnlargement: true }).webp({ quality, effort: 5 }).toFile(`${stem}-${suffix}.webp`);
  }
}

await mkdir(zhDir, { recursive: true });
await mkdir(enDir, { recursive: true });

const zhSources = [
  "01_封面_GLP1逼瘋五星飯店.png",
  "02_證據鏈_GLP1到消費帳單.png",
  "03_服務重設_奢華從堆滿到拿捏.png",
  "04_商業鏈_GLP1外溢與四指標.png"
];

await png(zhCover, path.join(zhDir, "cover.png"));
for (const [index, sourceName] of zhSources.entries()) {
  await copyFile(path.join(sourceRoot, sourceName), path.join(zhDir, `figure-0${index + 1}.png`));
}

const englishSvgs = [enCover, enFigure1, enFigure2, enFigure3, enFigure4];
for (const [index, svg] of englishSvgs.entries()) {
  const name = index === 0 ? "cover" : `figure-0${index}`;
  await png(svg, path.join(enDir, `${name}.png`));
}

for (const dir of [zhDir, enDir]) {
  for (const name of ["cover", "figure-01", "figure-02", "figure-03", "figure-04"]) {
    await variants(path.join(dir, `${name}.png`), path.join(dir, name));
  }
}

const outputs = [];
for (const dir of [zhDir, enDir]) {
  for (const name of ["cover", "figure-01", "figure-02", "figure-03", "figure-04"]) {
    for (const suffix of ["png", "720.webp", "1400.webp"]) {
      const file = path.join(dir, `${name}.${suffix}`.replace(".720", "-720").replace(".1400", "-1400"));
      outputs.push({ file: path.relative(root, file), bytes: (await stat(file)).size });
    }
  }
}

console.log(JSON.stringify({ dimensions: `${W}x${H}`, outputs }, null, 2));
