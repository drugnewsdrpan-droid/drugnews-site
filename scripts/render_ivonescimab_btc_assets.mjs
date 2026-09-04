import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const W = 1672;
const H = 941;
const out = path.join(process.cwd(), "content/published/ivonescimab-biliary-tract-cancer-harmoni-gi1-en/images");
const zhOut = path.join(process.cwd(), "content/published/ivonescimab-biliary-tract-cancer-harmoni-gi1/images");

const responsiveWidths = [
  ["720", 720, 74],
  ["1400", 1400, 80]
];

const C = {
  navy: "#15374A",
  navy2: "#28566B",
  teal: "#0C8B91",
  aqua: "#65C9C3",
  coral: "#D8674D",
  gold: "#D8A13E",
  ink: "#183746",
  muted: "#5B7480",
  pale: "#EFF8F7",
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

const card = (x, y, width, height, fill = C.white, stroke = "#D6E7E8", radius = 28) =>
  `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="2" filter="url(#shadow)"/>`;

const defs = `
  <defs>
    <linearGradient id="page" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="${C.pale}"/></linearGradient>
    <linearGradient id="hero" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.navy}"/><stop offset="1" stop-color="${C.navy2}"/></linearGradient>
    <linearGradient id="warm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF8EC"/><stop offset="1" stop-color="#FBE8DC"/></linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#15374A" flood-opacity="0.12"/></filter>
    <marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><path d="M0,0 L12,6 L0,12 Z" fill="${C.teal}"/></marker>
  </defs>
  <style>text{font-family:Inter,Helvetica,Arial,sans-serif}</style>`;

const base = (body, background = "url(#page)", brand = C.navy) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">
  ${defs}
  <rect width="100%" height="100%" fill="${background}"/>
  <circle cx="1540" cy="86" r="270" fill="${C.teal}" opacity="0.055"/>
  <circle cx="70" cy="900" r="245" fill="${C.coral}" opacity="0.05"/>
  ${body}
  ${text(1588, 895, "DRUGNEWS", 24, 800, brand, "end")}
</svg>`;

const antibody = (x, y, scale = 1, color = C.aqua) => `<g transform="translate(${x} ${y}) scale(${scale})" fill="none" stroke="${color}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round">
  <path d="M0 0 L62 64 L124 0 M62 64 L62 154"/>
  <circle cx="0" cy="0" r="16" fill="${color}" stroke="none"/>
  <circle cx="124" cy="0" r="16" fill="${color}" stroke="none"/>
</g>`;

const cover = base(`
  <rect width="1672" height="941" fill="url(#hero)"/>
  <circle cx="836" cy="448" r="292" fill="#FFFFFF" opacity="0.07"/>
  <circle cx="836" cy="448" r="208" fill="#FFFFFF" opacity="0.08"/>
  <g transform="translate(112 180)">
    <path d="M250 32 C145 35 72 130 70 266 C67 395 136 528 273 566 C333 583 360 528 350 440 C340 342 365 278 422 208 C472 146 420 38 328 30 C303 28 277 29 250 32Z" fill="#6EC9C3" opacity="0.86"/>
    <path d="M238 80 C216 190 212 314 244 506" fill="none" stroke="#D9F5F2" stroke-width="16" stroke-linecap="round"/>
    <path d="M244 224 L156 162 M246 298 L153 342 M248 388 L321 322" fill="none" stroke="#D9F5F2" stroke-width="11" stroke-linecap="round"/>
    ${text(246, 622, "LUNG CANCER", 24, 800, "#DDF4F2", "middle")}
  </g>
  <g transform="translate(1152 185)">
    <path d="M60 164 C126 78 302 42 420 96 C492 129 503 222 451 290 C392 368 276 380 188 346 C117 319 50 260 60 164Z" fill="#E8B35B" opacity="0.92"/>
    <path d="M258 336 C272 382 253 436 209 457 C168 476 128 450 129 405 C130 365 168 331 222 322" fill="#65C9C3" opacity="0.95"/>
    <path d="M247 106 C231 190 224 260 228 327" fill="none" stroke="#FFF3D8" stroke-width="14" stroke-linecap="round"/>
    ${text(265, 622, "BILIARY TRACT CANCER", 24, 800, "#FFF0D5", "middle")}
  </g>
  ${antibody(718, 330, 1.85, "#FFFFFF")}
  <rect x="666" y="586" width="340" height="92" rx="46" fill="#FFFFFF" opacity="0.96"/>
  ${text(836, 643, "PD-1  ×  VEGF", 31, 850, C.navy, "middle")}
  <path d="M560 444 H677 M995 444 H1112" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round" marker-end="url(#arrow)" opacity="0.72"/>
  ${text(84, 88, "DRUGNEWS | ONCOLOGY", 23, 800, "#7BDBD3")}
  ${text(84, 842, "A BISPECIFIC PLATFORM MOVES BEYOND LUNG CANCER", 28, 750, "#D9F0F1")}
`, "url(#hero)", C.white);

const evidence = base(`
  ${text(76, 82, "FIGURE 2 | HARMONi-GI1 TOPLINE", 22, 800, C.teal)}
  ${text(76, 151, "A Head-to-Head Win—With the Size of the Win Still Hidden", 49, 800, C.navy)}
  ${text(76, 201, "The Phase 3 interim analysis cleared three endpoints; the full clinical profile is not yet public.", 26, 560, C.muted)}
  ${card(76, 278, 566, 332, C.white, C.teal)}
  ${text(359, 337, "IVONESCIMAB + CHEMOTHERAPY", 25, 850, C.navy, "middle")}
  ${antibody(286, 401, 1.18, C.teal)}
  ${lines(359, 566, ["PD-1 × VEGF bispecific", "First-line advanced BTC"], 23, 34, 650, C.muted, "middle")}
  ${card(1030, 278, 566, 332, C.white, C.gold)}
  ${text(1313, 337, "DURVALUMAB + CHEMOTHERAPY", 25, 850, C.navy, "middle")}
  <g transform="translate(1241 395)"><circle cx="72" cy="72" r="69" fill="#FFF4DE" stroke="${C.gold}" stroke-width="8"/>${text(72, 84, "PD-L1", 28, 850, C.navy, "middle")}</g>
  ${lines(1313, 566, ["Established immunotherapy standard", "Active comparator"], 23, 34, 650, C.muted, "middle")}
  <path d="M676 444 H996" stroke="${C.teal}" stroke-width="10" marker-end="url(#arrow)"/>
  <rect x="704" y="374" width="264" height="140" rx="30" fill="${C.navy}"/>
  ${text(836, 419, "OS SUPERIOR", 28, 850, C.white, "middle")}
  ${text(836, 461, "PFS + ORR MET", 24, 750, "#8DE0D8", "middle")}
  ${text(836, 495, "interim analysis", 20, 600, "#CEE6EA", "middle")}
  ${card(76, 675, 1520, 162, "#F8FBFB", "#D5E5E7")}
  ${text(112, 722, "FIVE DATA GAPS", 21, 850, C.coral)}
  ${lines(112, 769, ["OS hazard ratio  •  median OS  •  survival curves", "full safety profile  •  intrahepatic / extrahepatic / gallbladder subgroups"], 27, 39, 720, C.navy)}
`);

const mechanism = base(`
  ${text(76, 82, "FIGURE 3 | ONE MOLECULE, TWO PATHWAYS", 22, 800, C.teal)}
  ${text(76, 151, "Immune Release and Vascular Remodeling in the Same Tumor Space", 47, 800, C.navy)}
  ${text(76, 201, "Mechanistic intent is plausible; clinical advantage must still be proven by complete efficacy and safety data.", 25, 560, C.muted)}
  ${card(76, 280, 590, 448, "#F2FAF9", C.teal)}
  <circle cx="258" cy="474" r="112" fill="#DDF4F2" stroke="${C.teal}" stroke-width="7"/>
  <circle cx="224" cy="443" r="16" fill="${C.teal}"/><circle cx="294" cy="443" r="16" fill="${C.teal}"/>
  <path d="M211 520 C239 548 281 548 309 520" fill="none" stroke="${C.teal}" stroke-width="9" stroke-linecap="round"/>
  ${text(258, 628, "ACTIVATED T CELL", 24, 850, C.navy, "middle")}
  <rect x="478" y="386" width="132" height="70" rx="35" fill="${C.white}" stroke="${C.coral}" stroke-width="6"/>
  ${text(544, 431, "PD-1", 25, 850, C.coral, "middle")}
  ${lines(371, 790, ["Block the immune brake", "Restore antitumor activity"], 24, 36, 680, C.muted, "middle")}
  ${card(1006, 280, 590, 448, "url(#warm)", C.gold)}
  <path d="M1100 570 C1180 372 1304 672 1502 410" fill="none" stroke="${C.coral}" stroke-width="34" stroke-linecap="round" opacity="0.82"/>
  <path d="M1134 486 C1242 575 1340 424 1474 527" fill="none" stroke="${C.gold}" stroke-width="18" stroke-linecap="round"/>
  <circle cx="1190" cy="406" r="37" fill="#FFFFFF" stroke="${C.gold}" stroke-width="6"/>${text(1190, 416, "VEGF", 18, 850, C.navy, "middle")}
  <circle cx="1411" cy="365" r="37" fill="#FFFFFF" stroke="${C.gold}" stroke-width="6"/>${text(1411, 375, "VEGF", 18, 850, C.navy, "middle")}
  ${text(1301, 628, "ABNORMAL TUMOR VESSELS", 24, 850, C.navy, "middle")}
  ${lines(1301, 790, ["Suppress angiogenic signaling", "Improve the tumor microenvironment"], 24, 36, 680, C.muted, "middle")}
  ${antibody(744, 392, 1.55, C.navy)}
  <rect x="690" y="598" width="292" height="84" rx="42" fill="${C.navy}"/>
  ${text(836, 651, "IVONESCIMAB", 27, 850, C.white, "middle")}
  <path d="M674 478 H713 M959 478 H998" stroke="${C.teal}" stroke-width="9" marker-end="url(#arrow)"/>
`);

const translation = base(`
  ${text(76, 82, "FIGURE 4 | FROM TOPLINE TO STANDARD OF CARE", 22, 800, C.teal)}
  ${text(76, 151, "A Phase 3 Win Opens the Door. It Does Not Move the Market In.", 48, 800, C.navy)}
  ${text(76, 201, "Five gates separate a China-only interim readout from durable global clinical and commercial value.", 26, 560, C.muted)}
  ${[
    ["1", "FULL DATA", ["Hazard ratio", "curves + safety"], C.teal],
    ["2", "REGULATORY PATH", ["filing package", "quality + CMC"], C.gold],
    ["3", "GLOBAL EVIDENCE", ["multiregional", "replication"], C.coral],
    ["4", "CLINICAL UPTAKE", ["patient selection", "workflow"], C.navy2],
    ["5", "COMMERCIAL SCALE", ["pricing + access", "supply"], C.teal]
  ].map(([n, title, body, color], i) => {
    const x = 66 + i * 316;
    return `${card(x, 312, 284, 356, C.white, color)}<circle cx="${x + 52}" cy="364" r="28" fill="${color}"/>${text(x + 52, 373, n, 22, 850, C.white, "middle")}${text(x + 30, 445, title, 22, 850, C.navy)}${lines(x + 30, 507, body, 23, 38, 650, C.muted)}${i < 4 ? `<path d="M${x + 290} 490 H${x + 310}" stroke="${C.teal}" stroke-width="8" marker-end="url(#arrow)"/>` : ""}`;
  }).join("")}
  <rect x="146" y="746" width="1380" height="102" rx="28" fill="${C.navy}"/>
  ${text(836, 789, "TODAY'S ACCURATE CONCLUSION", 21, 800, "#7DDDD4", "middle")}
  ${text(836, 827, "Ivonescimab won the OS endpoint. The size, durability and transferability of the win remain open.", 27, 750, C.white, "middle")}
`);

await mkdir(out, { recursive: true });
for (const [name, svg] of [
  ["cover.png", cover],
  ["figure-02.png", evidence],
  ["figure-03.png", mechanism],
  ["figure-04.png", translation]
]) {
  const source = Buffer.from(svg);
  const stem = path.parse(name).name;
  await sharp(source).png({ compressionLevel: 9 }).toFile(path.join(out, name));
  for (const [suffix, width, quality] of responsiveWidths) {
    await sharp(source)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality, effort: 5 })
      .toFile(path.join(out, `${stem}-${suffix}.webp`));
  }
}

for (const name of [
  "facebook-01.png",
  "facebook-02.png",
  "facebook-03.png",
  "facebook-04.png"
]) {
  const source = path.join(zhOut, name);
  const stem = path.parse(name).name;
  for (const [suffix, width, quality] of responsiveWidths) {
    await sharp(source)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality, effort: 5 })
      .toFile(path.join(zhOut, `${stem}-${suffix}.webp`));
  }
}

console.log(JSON.stringify({
  status: "ok",
  output: out,
  files: ["cover", "figure-02", "figure-03", "figure-04"],
  responsiveWidths: responsiveWidths.map(([suffix]) => suffix)
}, null, 2));
