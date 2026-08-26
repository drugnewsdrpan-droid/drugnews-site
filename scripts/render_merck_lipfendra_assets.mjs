import { createRequire } from "node:module";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const W = 1672;
const H = 941;
const root = process.cwd();
const zhDir = path.join(root, "content/published/merck-lipfendra-oral-pcsk9/images");
const enDir = path.join(root, "content/published/merck-lipfendra-oral-pcsk9-en/images");

const navy = "#173A5E";
const teal = "#087F8C";
const coral = "#D8604C";
const gold = "#C98C1E";
const ink = "#18324B";
const pale = "#F3F9FA";

const esc = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const text = (x, y, value, size, weight = 600, fill = ink, anchor = "start") =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" font-weight="${weight}" fill="${fill}">${esc(value)}</text>`;

const lines = (x, y, values, size, gap, weight = 600, fill = ink, anchor = "start") =>
  values.map((value, index) => text(x, y + index * gap, value, size, weight, fill, anchor)).join("");

const card = (x, y, width, height, stroke = "#D6E4E9", fill = "#FFFFFF", radius = 28) =>
  `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="2" filter="url(#shadow)"/>`;

const base = (body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="${pale}"/></linearGradient>
    <linearGradient id="hero" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${navy}"/><stop offset="1" stop-color="#245A72"/></linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="11" stdDeviation="13" flood-color="#173A5E" flood-opacity="0.12"/></filter>
    <marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><path d="M0,0 L12,6 L0,12 Z" fill="${teal}"/></marker>
  </defs>
  <style>text{font-family:Inter,Arial,Helvetica,sans-serif}</style>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <circle cx="1570" cy="80" r="250" fill="${teal}" opacity="0.05"/>
  <circle cx="80" cy="900" r="250" fill="${coral}" opacity="0.05"/>
  ${body}
  ${text(1588, 895, "DRUGNEWS", 24, 800, navy, "end")}
</svg>`;

const header = (eyebrow, titleValue, subtitle) => `
  ${text(76, 82, eyebrow, 22, 800, teal)}
  ${text(76, 151, titleValue, 52, 800, navy)}
  ${text(76, 202, subtitle, 26, 520, "#557386")}`;

const coverSvg = base(`
  <rect x="0" y="0" width="1672" height="941" fill="url(#hero)"/>
  <circle cx="1425" cy="185" r="300" fill="#66D3C4" opacity="0.13"/>
  <circle cx="1450" cy="700" r="350" fill="#FFFFFF" opacity="0.05"/>
  ${text(82, 92, "DRUGNEWS | CARDIOVASCULAR MARKET RESET", 23, 800, "#78D8CC")}
  ${lines(82, 210, ["A Pill Enters the", "PCSK9 Market"], 76, 88, 800, "#FFFFFF")}
  ${lines(82, 418, ["Lipfendra is the first FDA-approved oral PCSK9 inhibitor.", "Oral convenience does not make injections obsolete."], 30, 45, 560, "#D9EEF2")}
  <g transform="translate(1080 256)">
    <rect x="0" y="0" width="420" height="210" rx="105" fill="#FFFFFF" filter="url(#shadow)"/>
    <path d="M210 0 A105 105 0 0 1 210 210 Z" fill="${coral}"/>
    <path d="M210 0 A105 105 0 0 0 210 210 Z" fill="#E8F6F5"/>
    <circle cx="105" cy="105" r="20" fill="${teal}" opacity="0.35"/>
    <circle cx="315" cy="105" r="20" fill="#FFFFFF" opacity="0.75"/>
  </g>
  <g transform="translate(1070 575)">
    <rect x="0" y="0" width="330" height="62" rx="31" fill="#E8F6F5"/>
    <rect x="262" y="13" width="170" height="36" rx="18" fill="#FFFFFF" stroke="${teal}" stroke-width="5"/>
    <path d="M432 31 H505" stroke="#FFFFFF" stroke-width="10" stroke-linecap="round"/>
    <path d="M505 31 l34 -18 v36 Z" fill="${coral}"/>
  </g>
  <rect x="82" y="704" width="820" height="118" rx="28" fill="#FFFFFF" opacity="0.96"/>
  ${text(120, 752, "THE REAL CONTEST", 21, 800, teal)}
  ${text(120, 800, "Outcomes • adherence • access • reimbursement", 30, 700, navy)}
  ${text(1588, 895, "DRUGNEWS", 24, 800, "#FFFFFF", "end")}
`);

const mechanismSvg = base(`
  ${header("MECHANISM | FIGURE 2", "How Oral PCSK9 Preserves LDL Receptors", "Blocking PCSK9 leaves more receptors on hepatocytes to clear circulating LDL-C")}
  ${card(76, 272, 470, 470, navy)}
  ${text(311, 330, "1 | PCSK9 APPROACHES", 22, 800, navy, "middle")}
  <rect x="135" y="430" width="350" height="18" rx="9" fill="#BFD5DC"/>
  <path d="M248 430 v95 M308 430 v95 M368 430 v95" stroke="${teal}" stroke-width="14" stroke-linecap="round"/>
  <circle cx="307" cy="365" r="54" fill="${coral}" opacity="0.9"/>
  ${text(307, 375, "PCSK9", 20, 800, "#FFFFFF", "middle")}
  ${lines(311, 617, ["Without inhibition, PCSK9 can", "promote receptor degradation."], 23, 34, 560, "#557386", "middle")}
  <path d="M565 507 H682" stroke="${teal}" stroke-width="10" marker-end="url(#arrow)"/>
  ${card(708, 272, 470, 470, coral)}
  ${text(943, 330, "2 | LIPFENDRA BLOCKS", 22, 800, coral, "middle")}
  <circle cx="943" cy="445" r="72" fill="#FFF0EC" stroke="${coral}" stroke-width="8"/>
  <circle cx="943" cy="445" r="35" fill="${coral}" opacity="0.88"/>
  <path d="M855 538 L1030 363 M1030 538 L855 363" stroke="${navy}" stroke-width="14" stroke-linecap="round"/>
  ${lines(943, 617, ["The macrocyclic peptide prevents", "PCSK9-receptor binding."], 23, 34, 560, "#557386", "middle")}
  <path d="M1197 507 H1314" stroke="${teal}" stroke-width="10" marker-end="url(#arrow)"/>
  ${card(1340, 272, 256, 470, teal)}
  ${text(1468, 330, "3 | CLEAR LDL", 22, 800, teal, "middle")}
  <rect x="1388" y="430" width="160" height="18" rx="9" fill="#BFD5DC"/>
  <path d="M1425 430 v95 M1470 430 v95 M1515 430 v95" stroke="${teal}" stroke-width="14" stroke-linecap="round"/>
  <circle cx="1405" cy="580" r="24" fill="${gold}"/><circle cx="1470" cy="620" r="24" fill="${gold}"/><circle cx="1535" cy="575" r="24" fill="${gold}"/>
  ${text(1468, 680, "More surface receptors", 21, 700, navy, "middle")}
  <rect x="150" y="795" width="1372" height="82" rx="24" fill="${navy}"/>
  ${text(836, 846, "Mechanism and LDL-C lowering do not yet prove fewer heart attacks or deaths.", 28, 700, "#FFFFFF", "middle")}
`);

const lane = (x, color, label, titleValue, items) => `
  ${card(x, 280, 470, 492, color)}
  <circle cx="${x + 62}" cy="342" r="30" fill="${color}"/>
  ${text(x + 62, 351, label, 23, 800, "#FFFFFF", "middle")}
  ${text(x + 112, 351, titleValue, 26, 800, navy)}
  ${lines(x + 44, 455, items, 28, 64, 650, ink)}
`;

const routinesSvg = base(`
  ${header("ADHERENCE | FIGURE 3", "Convenience Is a System, Not a Dosage Form", "The key question: does the patient or the healthcare system own the schedule?")}
  ${lane(76, teal, "A", "LIPFENDRA", ["Daily oral tablet", "Morning fasting routine", "Wait 30 minutes before food"])}
  ${lane(601, navy, "B", "LEQVIO", ["Provider-administered", "Initiation + Month 3", "Then every 6 months"])}
  ${lane(1126, coral, "C", "PCSK9 ANTIBODIES", ["Injectable therapy", "Established CV outcomes", "Different access pathway"])}
  <rect x="232" y="824" width="1208" height="62" rx="31" fill="#E6F4F3"/>
  ${text(836, 864, "No single routine wins for every patient.", 29, 800, navy, "middle")}
`);

const gate = (x, n, titleValue, subValues, color) => `
  ${card(x, 328, 344, 388, color)}
  <circle cx="${x + 58}" cy="385" r="31" fill="${color}"/>
  ${text(x + 58, 395, n, 24, 800, "#FFFFFF", "middle")}
  ${text(x + 42, 480, titleValue, 27, 800, navy)}
  ${lines(x + 42, 548, subValues, 23, 38, 560, "#557386")}
  <path d="M${x + 50} 674 H${x + 294}" stroke="${color}" stroke-width="7" stroke-linecap="round"/>
`;

const gatesSvg = base(`
  ${header("MARKET ACCESS | FIGURE 4", "Oral PCSK9 Must Pass Four Separate Gates", "FDA approval is the start; outcomes, access and local reimbursement define market size")}
  ${gate(76, "1", "LDL-C lowering", ["56% and 59%", "at Week 24"], teal)}
  ${gate(470, "2", "CV outcomes", ["CORALreef Outcomes", "still ongoing"], navy)}
  ${gate(864, "3", "Access", ["Physicians, payers", "and adherence"], coral)}
  ${gate(1258, "4", "Taiwan", ["TFDA approval", "and NHI coverage"], gold)}
  <rect x="174" y="786" width="1324" height="94" rx="26" fill="${navy}"/>
  ${text(836, 844, "U.S. approval does not mean Lipfendra is available or reimbursed in Taiwan.", 28, 700, "#FFFFFF", "middle")}
`);

async function writePng(svg, destination) {
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(destination);
}

async function variants(source, stem) {
  for (const [suffix, width, quality] of [["720", 720, 74], ["1400", 1400, 80]]) {
    await sharp(source).resize({ width, withoutEnlargement: true }).webp({ quality, effort: 5 }).toFile(`${stem}-${suffix}.webp`);
  }
}

await mkdir(zhDir, { recursive: true });
await mkdir(enDir, { recursive: true });

for (const name of ["cover", "figure-01", "figure-02", "figure-03", "figure-04"]) {
  const source = path.join(zhDir, `${name}.png`);
  await variants(source, path.join(zhDir, name));
}

const english = [
  ["cover", coverSvg],
  ["figure-01", coverSvg],
  ["figure-02", mechanismSvg],
  ["figure-03", routinesSvg],
  ["figure-04", gatesSvg]
];

for (const [name, svg] of english) {
  const png = path.join(enDir, `${name}.png`);
  await writePng(svg, png);
  await variants(png, path.join(enDir, name));
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
