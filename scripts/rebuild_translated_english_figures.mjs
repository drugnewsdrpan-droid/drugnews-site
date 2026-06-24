import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "assets/articles/obesity-drug-third-place-competition-en");

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function wrapWords(text, max = 18) {
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

function tspanLines(lines, x, y, lineHeight, className, anchor = "start") {
  return lines.map((line, index) => (
    `<text x="${x}" y="${y + index * lineHeight}" class="${className}" text-anchor="${anchor}">${escapeXml(line)}</text>`
  )).join("\n");
}

function productRows(rows, x, y, accent) {
  return rows.map((row, index) => {
    const lines = Array.isArray(row) ? row : [row];
    const yy = y + index * 68;
    return `<g>
      <rect x="${x}" y="${yy - 28}" width="44" height="18" rx="9" fill="#f7faf9" stroke="${accent}" stroke-width="3" transform="rotate(-35 ${x + 22} ${yy - 19})"/>
      ${tspanLines(lines, x + 64, yy - (lines.length - 1) * 13, 26, "body")}
    </g>`;
  }).join("\n");
}

function figureFrame(title, inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760" viewBox="0 0 1200 760" role="img" aria-label="${escapeXml(title)}">
  <defs>
    <linearGradient id="sheet" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="54%" stop-color="#f8fbfb"/>
      <stop offset="100%" stop-color="#fff8f1"/>
    </linearGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#12313c" flood-opacity=".12"/>
    </filter>
  </defs>
  <style>
    .title{font:800 34px Inter,Arial,sans-serif;fill:#122f3a}
    .eyebrow{font:800 18px Inter,Arial,sans-serif;letter-spacing:.12em;fill:#9e5b28;text-transform:uppercase}
    .label{font:800 25px Inter,Arial,sans-serif;fill:#12313c}
    .body{font:700 22px Inter,Arial,sans-serif;fill:#243943}
    .note{font:700 17px Inter,Arial,sans-serif;fill:#58707b}
    .small{font:700 16px Inter,Arial,sans-serif;fill:#607680}
    .axis{font:800 20px Inter,Arial,sans-serif;fill:#265f73}
    .brand{font:900 31px Inter,Arial,sans-serif;fill:#12313c}
  </style>
  <rect width="1200" height="760" fill="#eef5f4"/>
  <rect x="34" y="34" width="1132" height="692" rx="24" fill="url(#sheet)" stroke="#cddbe0" stroke-width="2" filter="url(#softShadow)"/>
  <text x="64" y="86" class="title">${escapeXml(title)}</text>
  ${inner}
</svg>
`;
}

function figure01() {
  return figureFrame("Figure 1 | The Duopoly Battle Moves Beyond Single Products", `
  <g transform="translate(70 128)">
    <rect x="0" y="0" width="455" height="496" rx="18" fill="#f2f8fb" stroke="#b9d4df"/>
    <text x="228" y="54" class="brand" text-anchor="middle">Novo Nordisk</text>
    <rect x="55" y="78" width="345" height="50" rx="14" fill="#2d85b7"/>
    <text x="228" y="111" class="label" text-anchor="middle" fill="#fff">semaglutide family</text>
    ${productRows(["Ozempic (injection)", "Wegovy (injection)", "Rybelsus (oral)", "Wegovy pill (oral)"], 82, 170, "#2d85b7")}
    <rect x="42" y="400" width="370" height="84" rx="16" fill="#e4f2fa" stroke="#b7d4df"/>
    ${tspanLines(["Brand + physician familiarity", "Global supply chain", "Injection franchise extends into oral therapy"], 227, 426, 25, "small", "middle")}
  </g>

  <g transform="translate(675 128)">
    <rect x="0" y="0" width="455" height="496" rx="18" fill="#fff4f1" stroke="#e4c4bd"/>
    <text x="228" y="54" class="brand" text-anchor="middle" fill="#c83f3a">Lilly</text>
    <rect x="55" y="78" width="345" height="50" rx="14" fill="#d95a55"/>
    <text x="228" y="111" class="label" text-anchor="middle" fill="#fff">tirzepatide family</text>
    ${productRows(["Mounjaro (injection)", "Zepbound (injection)", ["retatrutide", "(GIP / GLP-1 / glucagon)"], ["orforglipron", "(oral small molecule)"]], 82, 170, "#d95a55")}
    <rect x="42" y="400" width="370" height="84" rx="16" fill="#fde7e0" stroke="#e4c4bd"/>
    ${tspanLines(["Stronger efficacy", "Deeper next-generation pipeline", "Multi-target biology and oralization"], 227, 426, 25, "small", "middle")}
  </g>

  <g transform="translate(525 254)">
    <rect x="0" y="0" width="150" height="176" rx="22" fill="#fff" stroke="#cddbe0"/>
    <path d="M44 44 h62 v70 h-62z" fill="#eef3f5" stroke="#9cb1ba"/>
    <path d="M56 44 v-16 h38 v16" fill="none" stroke="#9cb1ba" stroke-width="7" stroke-linecap="round"/>
    <text x="75" y="142" class="brand" text-anchor="middle">VS.</text>
  </g>`);
}

function figure02() {
  const columns = [
    { brand: "Pfizer", color: "#2b75bb", asset: "Berobenatide", route: "Long-acting GLP-1 analog", bet: "Monthly injection window", edge: "Lower treatment burden" },
    { brand: "Roche", color: "#6b5fb5", asset: "Petrelintide + Enicepatide", route: "Amylin analog + GLP-1/GIP dual agonist", bet: "Tolerability plus efficacy", edge: "Combination optionality" },
    { brand: "AstraZeneca", color: "#d59d35", asset: "Ecnoglutide", route: "Oral small-molecule GLP-1", bet: "CRM integration", edge: "Ecosystem fit" },
    { brand: "Regeneron", color: "#3c8f62", asset: "Trevogrumab", route: "Anti-myostatin antibody", bet: "Preserve muscle and improve weight quality", edge: "Healthier weight loss" },
    { brand: "Asia / China", color: "#2d8c95", asset: "Mazdutide / Rybubatide / Ecnoglutide", route: "Multi-target and oral routes", bet: "Faster clinical iteration", edge: "Local speed + global ambition" }
  ];
  const cards = columns.map((col, index) => {
    const x = 64 + index * 218;
    return `<g transform="translate(${x} 152)">
      <rect x="0" y="0" width="194" height="470" rx="18" fill="#fff" stroke="#d2dde2"/>
      <text x="97" y="45" class="brand" text-anchor="middle" fill="${col.color}">${escapeXml(col.brand)}</text>
      <rect x="18" y="74" width="158" height="88" rx="14" fill="${col.color}" opacity=".13" stroke="${col.color}"/>
      ${tspanLines(wrapWords(col.asset, 15).slice(0, 3), 97, 104, 23, "body", "middle")}
      <text x="97" y="204" class="eyebrow" text-anchor="middle">ROUTE</text>
      ${tspanLines(wrapWords(col.route, 17).slice(0, 3), 97, 236, 23, "note", "middle")}
      <circle cx="97" cy="324" r="38" fill="${col.color}" opacity=".15"/>
      <path d="M70 335 C88 300 108 300 126 335" fill="none" stroke="${col.color}" stroke-width="7" stroke-linecap="round"/>
      ${tspanLines(wrapWords(col.bet, 18).slice(0, 2), 97, 390, 24, "body", "middle")}
      ${tspanLines(wrapWords(col.edge, 20).slice(0, 2), 97, 446, 22, "small", "middle")}
    </g>`;
  }).join("\n");
  return figureFrame("Figure 2 | Each MNC Is Choosing a Different Route to Third Place", cards);
}

function mechanismCard({ x, title, receptor, organ, color, points }) {
  return `<g transform="translate(${x} 150)">
    <rect x="0" y="0" width="190" height="390" rx="18" fill="#fff" stroke="#d2dde2"/>
    <text x="95" y="44" class="brand" text-anchor="middle" fill="${color}">${escapeXml(title)}</text>
    <circle cx="95" cy="120" r="43" fill="${color}" opacity=".14"/>
    <text x="95" y="128" class="axis" text-anchor="middle" fill="${color}">${escapeXml(receptor)}</text>
    <text x="95" y="197" class="body" text-anchor="middle">${escapeXml(organ)}</text>
    <line x1="36" y1="230" x2="154" y2="230" stroke="#d9e3e7"/>
    ${tspanLines(points, 95, 270, 31, "note", "middle")}
  </g>`;
}

function figure03() {
  return figureFrame("Figure 3 | From GLP-1 Alone to Multi-Target Metabolic Control", `
  ${mechanismCard({ x: 70, title: "GLP-1", receptor: "GLP-1R", organ: "Gut / pancreas", color: "#2f91b7", points: ["Lower appetite", "Increase satiety", "Improve insulin response"] })}
  ${mechanismCard({ x: 306, title: "GIP", receptor: "GIPR", organ: "Pancreas", color: "#7d65b5", points: ["Amplify incretin synergy", "Support glucose control", "Improve metabolism"] })}
  ${mechanismCard({ x: 542, title: "Glucagon", receptor: "GCGR", organ: "Liver / fat", color: "#b0653c", points: ["Raise energy use", "Promote lipolysis", "Improve liver metabolism"] })}
  ${mechanismCard({ x: 778, title: "Amylin", receptor: "AMYR", organ: "Brain", color: "#d98933", points: ["Slow gastric emptying", "Suppress appetite", "Increase satiety"] })}
  <g transform="translate(988 150)">
    <rect x="0" y="0" width="120" height="390" rx="18" fill="#eef8f4" stroke="#bbd8cf"/>
    <text x="60" y="52" class="axis" text-anchor="middle">Combo</text>
    <rect x="32" y="104" width="56" height="56" rx="12" fill="#2f91b7" opacity=".72"/>
    <rect x="56" y="128" width="56" height="56" rx="12" fill="#7d65b5" opacity=".72"/>
    <rect x="20" y="164" width="56" height="56" rx="12" fill="#d98933" opacity=".72"/>
    <rect x="56" y="202" width="56" height="56" rx="12" fill="#5ba36c" opacity=".72"/>
    ${tspanLines(["GLP-1/GIP", "GLP-1/glucagon", "GLP-1/GIP/glucagon", "GLP-1 + amylin"], 60, 308, 24, "small", "middle")}
  </g>
  <rect x="112" y="596" width="976" height="62" rx="14" fill="#eaf3f6" stroke="#cadde4"/>
  ${tspanLines(["A single mechanism becomes a coordinated metabolic network:", "efficacy, tolerability, and broader patient fit."], 600, 623, 26, "body", "middle")}`);
}

function figure04() {
  return figureFrame("Figure 4 | The Next Battleground: From Weight Loss to Health Quality", `
  <g transform="translate(74 146)">
    <circle cx="110" cy="164" r="80" fill="#b8c5cb" opacity=".65"/>
    <rect x="74" y="235" width="72" height="148" rx="36" fill="#b8c5cb" opacity=".65"/>
    <rect x="250" y="18" width="280" height="430" rx="20" fill="#fff" stroke="#d2dde2"/>
    <text x="390" y="68" class="brand" text-anchor="middle">Past</text>
    ${tspanLines(["The question was mostly", "how much weight was lost."], 390, 112, 28, "note", "middle")}
    ${tspanLines(["Which patient loses more?", "Body-weight percentage", "Speed of weight loss", "Market-share race"], 292, 190, 42, "body")}
  </g>
  <path d="M608 378 h50" stroke="#2d85b7" stroke-width="20" stroke-linecap="round"/>
  <path d="M650 344 l58 34 -58 34z" fill="#2d85b7"/>
  <g transform="translate(690 146)">
    <circle cx="386" cy="164" r="80" fill="#7abf67" opacity=".72"/>
    <rect x="350" y="235" width="72" height="148" rx="36" fill="#7abf67" opacity=".72"/>
    <rect x="0" y="18" width="318" height="430" rx="20" fill="#f5fbf2" stroke="#c8dfbd"/>
    <text x="159" y="68" class="brand" text-anchor="middle">Future</text>
    ${tspanLines(["Health quality and long-term", "metabolic management."], 159, 112, 28, "note", "middle")}
    ${tspanLines(["Less vomiting?", "Better tolerability?", "Preserve muscle?", "Improve fatty liver?", "Lower CV-metabolic risk?", "Can patients stay on therapy?"], 40, 180, 40, "body")}
  </g>
  <rect x="116" y="616" width="968" height="54" rx="16" fill="#eaf3f6" stroke="#cadde4"/>
  <text x="600" y="650" class="body" text-anchor="middle">The third-place opportunity is not to copy the leaders. It is to solve the problems they have not solved.</text>`);
}

await fs.mkdir(OUT, { recursive: true });
await fs.writeFile(path.join(OUT, "figure-01-en.svg"), figure01().replace(/[ \t]+$/gm, ""));
await fs.writeFile(path.join(OUT, "figure-02-en.svg"), figure02().replace(/[ \t]+$/gm, ""));
await fs.writeFile(path.join(OUT, "figure-03-en.svg"), figure03().replace(/[ \t]+$/gm, ""));
await fs.writeFile(path.join(OUT, "figure-04-en.svg"), figure04().replace(/[ \t]+$/gm, ""));
console.log("Rebuilt translated English obesity figures from the original Chinese infographic structure.");
