import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const W = 1672;
const H = 941;
const root = process.cwd();
const zhDir = path.join(root, "content/published/pelacarsen-lpa-horizon/images");
const enDir = path.join(root, "content/published/pelacarsen-lpa-horizon-en/images");

const esc = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const text = (x, y, value, size, weight = 500, fill = "#15314f", anchor = "start") =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" font-weight="${weight}" fill="${fill}">${esc(value)}</text>`;

const lines = (x, y, values, size, gap, weight = 500, fill = "#15314f", anchor = "start") =>
  values.map((value, index) => text(x, y + index * gap, value, size, weight, fill, anchor)).join("");

const shell = (body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f8fbfd"/><stop offset="1" stop-color="#edf7f5"/></linearGradient>
    <linearGradient id="teal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0e8b8e"/><stop offset="1" stop-color="#56c5b8"/></linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#17324d" flood-opacity="0.12"/></filter>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <style>text{font-family:Inter,Arial,"PingFang TC","Noto Sans CJK TC",sans-serif}</style>
  ${body}
</svg>`;

const card = (x, y, width, height, fill = "#ffffff", stroke = "#cfe0e6") =>
  `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="28" fill="${fill}" stroke="${stroke}" stroke-width="2" filter="url(#shadow)"/>`;

const particle = (cx, cy, r) => `<g>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="#f4a261" opacity="0.18"/>
  <circle cx="${cx}" cy="${cy}" r="${r * 0.72}" fill="#ffffff" stroke="#f4a261" stroke-width="8"/>
  <circle cx="${cx - 26}" cy="${cy - 18}" r="18" fill="#0e8b8e"/><circle cx="${cx + 25}" cy="${cy + 16}" r="24" fill="#ec7b4d"/>
  <path d="M ${cx - 70} ${cy + 68} C ${cx - 25} ${cy + 125}, ${cx + 70} ${cy + 118}, ${cx + 112} ${cy + 45}" fill="none" stroke="#15314f" stroke-width="14" stroke-linecap="round"/>
</g>`;

const heart = (cx, cy, s = 1) => `<path d="M ${cx} ${cy + 78*s} C ${cx - 165*s} ${cy - 18*s}, ${cx - 128*s} ${cy - 155*s}, ${cx - 42*s} ${cy - 112*s} C ${cx} ${cy - 90*s}, ${cx} ${cy - 50*s}, ${cx} ${cy - 50*s} C ${cx} ${cy - 50*s}, ${cx} ${cy - 90*s}, ${cx + 42*s} ${cy - 112*s} C ${cx + 128*s} ${cy - 155*s}, ${cx + 165*s} ${cy - 18*s}, ${cx} ${cy + 78*s} Z" fill="#e96f5f" opacity="0.92"/>`;

const cover = (lang) => {
  const isEn = lang === "en";
  return shell(`
    <circle cx="1480" cy="86" r="250" fill="#0e8b8e" opacity="0.06"/><circle cx="165" cy="885" r="290" fill="#f4a261" opacity="0.08"/>
    ${text(92, 106, "DRUGNEWS | CARDIOVASCULAR OUTCOMES", 26, 700, "#0e8b8e")}
    ${text(92, 230, "Lp(a) HORIZON", 84, 800, "#15314f")}
    ${lines(92, 306, isEn ? ["From biomarker reduction", "to cardiovascular outcomes"] : ["從降低生物標記", "到減少心血管事件"], 50, 62, 650, "#36536a")}
    ${particle(1170, 385, 132)}
    <path d="M 1325 385 H 1450" stroke="#0e8b8e" stroke-width="12" stroke-linecap="round" stroke-dasharray="18 18"/>
    ${text(1388, 338, "?", 80, 800, "#ec7b4d", "middle")}
    ${heart(1518, 385, 0.72)}
    ${card(92, 635, 1488, 185, "#ffffff", "#d8e7ec")}
    ${text(144, 700, isEn ? "STATUS" : "資料狀態", 22, 800, "#0e8b8e")}
    ${text(144, 760, isEn ? "No phase 3 results as of July 19, 2026" : "截至 2026/07/19，第三期結果尚未公布", 36, 750, "#15314f")}
    ${text(144, 804, isEn ? "Novartis: H2 2026, event-driven" : "Novartis：H2 2026，事件驅動讀出", 27, 550, "#567184")}
  `);
};

const homepageCover = shell(`
  <circle cx="150" cy="90" r="260" fill="#0e8b8e" opacity="0.07"/>
  <circle cx="1515" cy="850" r="320" fill="#f4a261" opacity="0.09"/>
  <path d="M 350 470 H 1315" stroke="#d7e8eb" stroke-width="72" stroke-linecap="round"/>
  ${particle(625, 470, 170)}
  <path d="M 825 470 H 980" stroke="#0e8b8e" stroke-width="16" stroke-linecap="round" stroke-dasharray="24 22"/>
  ${text(902, 415, "?", 112, 800, "#ec7b4d", "middle")}
  ${heart(1125, 470, 1.05)}
  <circle cx="385" cy="215" r="28" fill="#0e8b8e" opacity="0.7"/>
  <circle cx="1320" cy="265" r="38" fill="#ec7b4d" opacity="0.72"/>
  <circle cx="1365" cy="690" r="24" fill="#6a8fc6" opacity="0.7"/>
`);

const figure1 = shell(`
  ${text(76, 95, "WHAT HORIZON MUST PROVE", 26, 800, "#0e8b8e")}
  ${text(76, 176, "Lower Lp(a) does not yet mean fewer events", 54, 800)}
  ${card(82, 260, 520, 440)}${particle(342, 445, 110)}${text(342, 615, "Lp(a) reduction", 34, 750, "#15314f", "middle")}
  <path d="M 655 477 H 1008" stroke="#0e8b8e" stroke-width="13" stroke-linecap="round" stroke-dasharray="22 18"/>
  ${text(830, 430, "?", 104, 800, "#ec7b4d", "middle")}
  ${card(1068, 260, 520, 440)}${heart(1328, 448, 0.9)}${text(1328, 615, "Cardiovascular events", 34, 750, "#15314f", "middle")}
  <rect x="82" y="758" width="1506" height="104" rx="24" fill="#15314f"/>
  ${text(124, 824, "No results as of July 19, 2026  |  Novartis: H2 2026, event-driven", 31, 650, "#ffffff")}
`);

const stepCard = (x, titleValue, subValue, color) => `${card(x, 300, 325, 270)}<circle cx="${x+54}" cy="354" r="24" fill="${color}"/>${text(x+95, 365, titleValue, 31, 800)}${lines(x+36, 432, subValue, 24, 34, 520, "#567184")}`;
const figure2 = shell(`
  ${text(76, 92, "FROM LIVER TARGET TO CLINICAL EVENTS", 26, 800, "#0e8b8e")}
  ${text(76, 174, "Biomarker proof is not outcomes proof", 56, 800)}
  ${stepCard(76, "LPA mRNA", ["Pelacarsen", "antisense therapy"], "#0e8b8e")}
  ${stepCard(475, "apo(a) production ↓", ["Hepatic synthesis", "is reduced"], "#43b7a8")}
  ${stepCard(874, "Lp(a) ↓", ["Phase 2:", "~35% to 80%"], "#f4a261")}
  ${stepCard(1273, "MACE ?", ["Must be proven", "in HORIZON"], "#ec7b4d")}
  <path d="M 401 438 H 461 M 800 438 H 860 M 1199 438 H 1259" stroke="#8aa7b7" stroke-width="8" stroke-linecap="round"/>
  ${card(76, 650, 1522, 180, "#15314f", "#15314f")}
  ${text(126, 714, "HORIZON DESIGN", 22, 800, "#66d5c7")}
  ${text(126, 776, "8,323 participants  |  80 mg monthly SC  |  Event-driven: 993 events", 34, 700, "#ffffff")}
`);

const mini = (x, y, n, titleValue, subValues, accent) => `${card(x,y,460,226)}<circle cx="${x+58}" cy="${y+57}" r="30" fill="${accent}"/>${text(x+58,y+67,String(n),28,800,"#ffffff","middle")}${text(x+108,y+66,titleValue,30,800)}${lines(x+38,y+126,subValues,22,31,520,"#567184")}`;
const figure3 = shell(`
  ${text(76, 92, "HOW TO READ HORIZON", 26, 800, "#0e8b8e")}
  ${text(76, 168, "Do not stop at “met” or “missed”", 54, 800)}
  ${mini(76,236,1,"Prespecified tests",["Overall population", "vs Lp(a) ≥90 mg/dL"],"#0e8b8e")}
  ${mini(606,236,2,"Effect size",["Hazard ratio | 95% CI", "Absolute event difference"],"#43b7a8")}
  ${mini(1136,236,3,"Event composition",["Death | MI | stroke", "Urgent revascularization"],"#f4a261")}
  ${mini(340,520,4,"Biomarker linkage",["How much did Lp(a) fall?", "Did outcomes move with it?"],"#6a8fc6")}
  ${mini(870,520,5,"Long-term burden",["Safety | discontinuation", "Monthly injection persistence"],"#ec7b4d")}
  ${text(836, 848, "A statistically positive headline is only the first layer of the answer.", 30, 650, "#15314f", "middle")}
`);

const check = (y, n, titleValue, subValue, accent) => `<circle cx="130" cy="${y}" r="34" fill="${accent}"/>${text(130,y+11,String(n),31,800,"#ffffff","middle")}${text(198,y-4,titleValue,35,800)}${text(198,y+39,subValue,24,500,"#567184")}`;
const figure4 = shell(`
  ${text(76, 92, "FOUR CHECKS FOR TAIWAN READERS", 26, 800, "#0e8b8e")}
  ${text(76, 168, "Read the endpoint before pricing the market", 54, 800)}
  ${card(76,228,1015,600)}
  ${check(330,1,"Secondary-prevention population","Do not extrapolate directly to healthy adults.","#0e8b8e")}
  ${check(458,2,"Keep the original measurement unit","mg/dL and nmol/L are not linked by one universal ratio.","#43b7a8")}
  ${check(586,3,"Global success is not immediate Taiwan access","Label, testing, specialist pathways, reimbursement and price still matter.","#f4a261")}
  ${check(714,4,"Do not force a Taiwan stock narrative","No primary evidence means no direct-beneficiary claim.","#ec7b4d")}
  ${card(1150,228,438,600,"#15314f","#15314f")}
  <path d="M 1370 352 C 1300 330, 1250 390, 1278 452 C 1234 500, 1275 560, 1334 552 C 1356 620, 1440 644, 1480 581 C 1542 562, 1547 485, 1494 451 C 1514 386, 1440 326, 1370 352 Z" fill="#66d5c7" opacity="0.9"/>
  ${text(1369,674,"Taiwan",38,800,"#ffffff","middle")}
  ${lines(1369,730,["Evidence first", "Narrative second"],27,38,650,"#dff8f4","middle")}
`);

async function writePng(svg, destination) {
  await sharp(Buffer.from(svg)).png().toFile(destination);
}

async function writeCover(svg, dir) {
  const source = path.join(dir, "cover.png");
  await writePng(svg, source);
  await sharp(source).resize({ width: 720 }).webp({ quality: 76, effort: 5 }).toFile(path.join(dir, "cover-720.webp"));
  await sharp(source).resize({ width: 1400 }).webp({ quality: 82, effort: 5 }).toFile(path.join(dir, "cover-1400.webp"));
}

async function writeHomepageCover(svg, dir) {
  const source = path.join(dir, "homepage-cover.png");
  await writePng(svg, source);
  await sharp(source).resize({ width: 720 }).webp({ quality: 76, effort: 5 }).toFile(path.join(dir, "homepage-cover-720.webp"));
  await sharp(source).resize({ width: 1400 }).webp({ quality: 82, effort: 5 }).toFile(path.join(dir, "homepage-cover-1400.webp"));
}

await mkdir(zhDir, { recursive: true });
await mkdir(enDir, { recursive: true });
await writeCover(cover("zh"), zhDir);
await writeCover(cover("en"), enDir);
await writeHomepageCover(homepageCover, zhDir);
await writeHomepageCover(homepageCover, enDir);

for (let index = 1; index <= 4; index += 1) {
  const zhSource = path.join(zhDir, `facebook-0${index}.png`);
  await sharp(zhSource).resize({ width: 1400, withoutEnlargement: true }).webp({ quality: 82, effort: 5 }).toFile(path.join(zhDir, `facebook-0${index}.webp`));
}

for (const [index, svg] of [figure1, figure2, figure3, figure4].entries()) {
  const number = String(index + 1).padStart(2, "0");
  const source = path.join(enDir, `figure-${number}-source.png`);
  await writePng(svg, source);
  await sharp(source).resize({ width: 1400 }).webp({ quality: 82, effort: 5 }).toFile(path.join(enDir, `figure-${number}.webp`));
}

console.log(JSON.stringify({ zhDir, enDir, dimensions: `${W}x${H}`, englishFigures: 4 }, null, 2));
