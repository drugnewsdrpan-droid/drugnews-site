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

function injectionPen(x, y, accent) {
  return `<g transform="translate(${x} ${y}) rotate(-32 24 12)">
    <rect x="2" y="5" width="54" height="18" rx="9" fill="#fff" stroke="${accent}" stroke-width="3"/>
    <rect x="35" y="5" width="19" height="18" rx="9" fill="${accent}" opacity=".28"/>
    <line x1="55" y1="14" x2="69" y2="14" stroke="${accent}" stroke-width="3" stroke-linecap="round"/>
  </g>`;
}

function pillIcon(x, y, accent) {
  return `<g transform="translate(${x} ${y}) rotate(-24 24 14)">
    <rect x="4" y="4" width="58" height="26" rx="13" fill="#fff" stroke="${accent}" stroke-width="3"/>
    <path d="M33 5 v24" stroke="${accent}" stroke-width="2" opacity=".55"/>
    <path d="M34 5 h15 a13 13 0 0 1 0 26 h-15z" fill="${accent}" opacity=".22"/>
  </g>`;
}

function vialIcon(x, y, accent, scale = 1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <rect x="18" y="0" width="42" height="14" rx="5" fill="#b7c9d1" stroke="#7d96a3"/>
    <path d="M25 14 v16 c-10 9-15 27-15 54 v72 c0 10 8 18 18 18h58c10 0 18-8 18-18v-72c0-27-5-45-15-54V14z" fill="#f8fcfd" stroke="${accent}" stroke-width="4"/>
    <path d="M16 112 c25 18 55 20 82 2v42c0 6-5 11-11 11h-60c-6 0-11-5-11-11z" fill="${accent}" opacity=".18"/>
    <path d="M31 48 c8-10 37-14 56 1" fill="none" stroke="#d7e5ea" stroke-width="5" stroke-linecap="round"/>
  </g>`;
}

function moleculeMotif(x, y, accent, scale = 1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})" opacity=".55">
    <line x1="18" y1="22" x2="58" y2="48" stroke="${accent}" stroke-width="4"/>
    <line x1="58" y1="48" x2="98" y2="26" stroke="${accent}" stroke-width="4"/>
    <line x1="58" y1="48" x2="76" y2="92" stroke="${accent}" stroke-width="4"/>
    <circle cx="18" cy="22" r="12" fill="#fff" stroke="${accent}" stroke-width="4"/>
    <circle cx="58" cy="48" r="15" fill="${accent}" opacity=".28" stroke="${accent}" stroke-width="4"/>
    <circle cx="98" cy="26" r="11" fill="#fff" stroke="${accent}" stroke-width="4"/>
    <circle cx="76" cy="92" r="12" fill="#fff" stroke="${accent}" stroke-width="4"/>
  </g>`;
}

function strategyIcon(kind, accent) {
  if (kind === "calendar") {
    return `<g><rect x="54" y="42" width="86" height="84" rx="12" fill="#fff" stroke="${accent}" stroke-width="5"/><path d="M54 68h86" stroke="${accent}" stroke-width="5"/><path d="M75 31v26M119 31v26" stroke="${accent}" stroke-width="8" stroke-linecap="round"/><circle cx="78" cy="91" r="5" fill="${accent}"/><circle cx="99" cy="91" r="5" fill="${accent}"/><circle cx="120" cy="91" r="5" fill="${accent}"/></g>`;
  }
  if (kind === "stomach") {
    return `<g><path d="M96 39 c35 20 35 78 0 104 c-28-16-44-37-36-67 c5-19 20-29 36-37z" fill="#fff" stroke="${accent}" stroke-width="6"/><path d="M95 42 c-12 24 15 40 5 67" fill="none" stroke="${accent}" stroke-width="5" opacity=".45"/></g>`;
  }
  if (kind === "heart") {
    return `<g><path d="M96 130 c-39-33-54-55-46-78 c8-22 34-23 46-4 c12-19 38-18 46 4 c8 23-7 45-46 78z" fill="#fff" stroke="${accent}" stroke-width="6"/><path d="M46 92 h29 l11-22 22 45 12-23 h28" fill="none" stroke="${accent}" stroke-width="5" stroke-linejoin="round"/></g>`;
  }
  if (kind === "muscle") {
    return `<g><path d="M47 108 c23-56 57-77 98-52 c-18 8-26 21-23 39 c-18-15-35-12-49 10 c-11 17-16 24-26 3z" fill="#fff" stroke="${accent}" stroke-width="6"/><path d="M85 72 c20 3 31 10 39 23" fill="none" stroke="${accent}" stroke-width="5" opacity=".55"/></g>`;
  }
  return `<g><circle cx="96" cy="86" r="48" fill="#fff" stroke="${accent}" stroke-width="6"/><path d="M52 86h88M96 38c22 25 22 72 0 96M96 38c-22 25-22 72 0 96" fill="none" stroke="${accent}" stroke-width="5"/></g>`;
}

function organGraphic(kind, accent) {
  if (kind === "gut") {
    return `<g>
      <path d="M74 42 c-30 22-34 72-4 94 c20 15 49 5 47-22 c-1-20-24-20-30-7 c-7 16 12 28 30 22 c31-11 31-64 2-86" fill="none" stroke="${accent}" stroke-width="8" stroke-linecap="round"/>
      <circle cx="93" cy="94" r="48" fill="${accent}" opacity=".12"/>
    </g>`;
  }
  if (kind === "pancreas") {
    return `<g>
      <path d="M43 103 c34-54 98-50 120-10 c-37 13-72 35-120 10z" fill="#fff" stroke="${accent}" stroke-width="7" stroke-linejoin="round"/>
      <circle cx="122" cy="86" r="26" fill="${accent}" opacity=".18"/>
      <path d="M59 101 c31-12 62-13 91-4" fill="none" stroke="${accent}" stroke-width="5" opacity=".45"/>
    </g>`;
  }
  if (kind === "liver") {
    return `<g>
      <path d="M42 105 c8-52 43-72 91-60 c39 10 50 42 24 73 c-29 33-79 25-115-13z" fill="#fff" stroke="${accent}" stroke-width="7"/>
      <circle cx="132" cy="112" r="22" fill="${accent}" opacity=".18"/>
      <path d="M83 72 c25 7 45 22 62 45" fill="none" stroke="${accent}" stroke-width="5" opacity=".45"/>
    </g>`;
  }
  if (kind === "brain") {
    return `<g>
      <path d="M67 90 c-12-31 11-53 34-42 c15-22 49-8 47 17 c23 5 26 40 2 51 c-5 27-42 32-55 10 c-23 11-49-10-28-36z" fill="#fff" stroke="${accent}" stroke-width="7" stroke-linejoin="round"/>
      <path d="M101 49 c-5 31 6 52 36 65M76 88 c22-3 42 7 54 27" fill="none" stroke="${accent}" stroke-width="5" opacity=".45"/>
    </g>`;
  }
  return `<g>
    <rect x="46" y="52" width="54" height="54" rx="13" fill="#2f91b7" opacity=".72"/>
    <rect x="88" y="72" width="54" height="54" rx="13" fill="#7d65b5" opacity=".72"/>
    <rect x="32" y="112" width="54" height="54" rx="13" fill="#d98933" opacity=".72"/>
    <rect x="88" y="144" width="54" height="54" rx="13" fill="#5ba36c" opacity=".72"/>
  </g>`;
}

function productRows(rows, x, y, accent) {
  return rows.map((row, index) => {
    const lines = Array.isArray(row) ? row : [row];
    const yy = y + index * 68;
    const text = lines.join(" ").toLowerCase();
    const icon = text.includes("oral") || text.includes("pill")
      ? pillIcon(x - 8, yy - 32, accent)
      : injectionPen(x - 8, yy - 31, accent);
    return `<g>
      ${icon}
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
    <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#12313c" flood-opacity=".10"/>
    </filter>
    <radialGradient id="softBlue" cx="50%" cy="45%" r="70%">
      <stop offset="0%" stop-color="#dff3f7"/>
      <stop offset="100%" stop-color="#f8fcfd"/>
    </radialGradient>
    <radialGradient id="softCoral" cx="50%" cy="45%" r="70%">
      <stop offset="0%" stop-color="#ffe4df"/>
      <stop offset="100%" stop-color="#fff8f5"/>
    </radialGradient>
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
    .caption{font:800 14px Inter,Arial,sans-serif;letter-spacing:.08em;fill:#8aa0aa;text-transform:uppercase}
  </style>
  <rect width="1200" height="760" fill="#eef5f4"/>
  <path d="M58 646 C245 565 338 610 505 654 C693 704 833 607 1140 652" fill="none" stroke="#cde5e8" stroke-width="5" opacity=".7"/>
  <path d="M66 130 C224 62 353 87 477 126" fill="none" stroke="#e7f1f2" stroke-width="4" opacity=".9"/>
  <circle cx="1010" cy="110" r="80" fill="#eef7f3" opacity=".8"/>
  <rect x="34" y="34" width="1132" height="692" rx="24" fill="url(#sheet)" stroke="#cddbe0" stroke-width="2" filter="url(#softShadow)"/>
  <text x="64" y="86" class="title">${escapeXml(title)}</text>
  ${inner}
</svg>
`;
}

function figure01() {
  return figureFrame("Figure 1 | The Duopoly Battle Moves Beyond Single Products", `
  <g transform="translate(70 128)">
    <rect x="0" y="0" width="455" height="496" rx="24" fill="url(#softBlue)" stroke="#b9d4df" filter="url(#cardShadow)"/>
    ${moleculeMotif(284, 250, "#2d85b7", .8)}
    <text x="228" y="54" class="brand" text-anchor="middle">Novo Nordisk</text>
    <rect x="55" y="78" width="345" height="50" rx="14" fill="#2d85b7"/>
    <text x="228" y="111" class="label" text-anchor="middle" fill="#fff">semaglutide family</text>
    ${productRows(["Ozempic (injection)", "Wegovy (injection)", "Rybelsus (oral)", "Wegovy pill (oral)"], 82, 170, "#2d85b7")}
    <rect x="42" y="400" width="370" height="84" rx="16" fill="#e4f2fa" stroke="#b7d4df"/>
    ${tspanLines(["Brand + physician familiarity", "Global supply chain", "Injection franchise extends into oral therapy"], 227, 426, 25, "small", "middle")}
  </g>

  <g transform="translate(675 128)">
    <rect x="0" y="0" width="455" height="496" rx="24" fill="url(#softCoral)" stroke="#e4c4bd" filter="url(#cardShadow)"/>
    ${moleculeMotif(290, 250, "#d95a55", .78)}
    <text x="228" y="54" class="brand" text-anchor="middle" fill="#c83f3a">Lilly</text>
    <rect x="55" y="78" width="345" height="50" rx="14" fill="#d95a55"/>
    <text x="228" y="111" class="label" text-anchor="middle" fill="#fff">tirzepatide family</text>
    ${productRows(["Mounjaro (injection)", "Zepbound (injection)", ["retatrutide", "(GIP / GLP-1 / glucagon)"], ["orforglipron", "(oral small molecule)"]], 82, 170, "#d95a55")}
    <rect x="42" y="400" width="370" height="84" rx="16" fill="#fde7e0" stroke="#e4c4bd"/>
    ${tspanLines(["Stronger efficacy", "Deeper next-generation pipeline", "Multi-target biology and oralization"], 227, 426, 25, "small", "middle")}
  </g>

  <g transform="translate(506 236)">
    <rect x="0" y="0" width="188" height="218" rx="30" fill="#fff" stroke="#cddbe0" filter="url(#cardShadow)"/>
    ${vialIcon(22, 32, "#2d85b7", .58)}
    ${vialIcon(96, 32, "#d95a55", .58)}
    <text x="94" y="172" class="brand" text-anchor="middle">VS.</text>
    <text x="94" y="198" class="caption" text-anchor="middle">Portfolio race</text>
  </g>`);
}

function figure02() {
  const columns = [
    { brand: "Pfizer", color: "#2b75bb", icon: "calendar", asset: "Berobenatide", route: "Long-acting GLP-1 analog", bet: "Monthly injection window", edge: "Lower treatment burden" },
    { brand: "Roche", color: "#6b5fb5", icon: "stomach", asset: "Petrelintide + Enicepatide", route: "Amylin analog + GLP-1/GIP dual agonist", bet: "Tolerability plus efficacy", edge: "Combination optionality" },
    { brand: "AstraZeneca", color: "#d59d35", icon: "heart", asset: "Ecnoglutide", route: "Oral small-molecule GLP-1", bet: "CRM integration", edge: "Ecosystem fit" },
    { brand: "Regeneron", color: "#3c8f62", icon: "muscle", asset: "Trevogrumab", route: "Anti-myostatin antibody", bet: "Preserve muscle and improve weight quality", edge: "Healthier weight loss" },
    { brand: "Asia / China", color: "#2d8c95", icon: "globe", asset: "Mazdutide / Rybubatide / Ecnoglutide", route: "Multi-target and oral routes", bet: "Faster clinical iteration", edge: "Local speed + global ambition" }
  ];
  const cards = columns.map((col, index) => {
    const x = 64 + index * 218;
    return `<g transform="translate(${x} 152)">
      <rect x="0" y="0" width="194" height="470" rx="22" fill="#fff" stroke="#d2dde2" filter="url(#cardShadow)"/>
      <text x="97" y="45" class="brand" text-anchor="middle" fill="${col.color}">${escapeXml(col.brand)}</text>
      <rect x="18" y="74" width="158" height="88" rx="14" fill="${col.color}" opacity=".13" stroke="${col.color}"/>
      ${tspanLines(wrapWords(col.asset, 15).slice(0, 3), 97, 104, 23, "body", "middle")}
      <text x="97" y="192" class="eyebrow" text-anchor="middle">ROUTE</text>
      ${tspanLines(wrapWords(col.route, 17).slice(0, 3), 97, 222, 21, "note", "middle")}
      <g transform="translate(44 254) scale(.55)">
        <circle cx="96" cy="158" r="82" fill="${col.color}" opacity=".12"/>
        ${strategyIcon(col.icon, col.color)}
      </g>
      ${tspanLines(wrapWords(col.bet, 18).slice(0, 2), 97, 398, 24, "body", "middle")}
      ${tspanLines(wrapWords(col.edge, 20).slice(0, 2), 97, 446, 22, "small", "middle")}
    </g>`;
  }).join("\n");
  return figureFrame("Figure 2 | Each MNC Is Choosing a Different Route to Third Place", cards);
}

function mechanismCard({ x, title, receptor, organ, color, points, icon }) {
  return `<g transform="translate(${x} 150)">
    <rect x="0" y="0" width="190" height="390" rx="22" fill="#fff" stroke="#d2dde2" filter="url(#cardShadow)"/>
    <text x="95" y="44" class="brand" text-anchor="middle" fill="${color}">${escapeXml(title)}</text>
    <g transform="translate(7 48) scale(.78)">
      ${organGraphic(icon, color)}
    </g>
    <rect x="49" y="158" width="92" height="34" rx="17" fill="${color}" opacity=".14" stroke="${color}"/>
    <text x="95" y="181" class="axis" text-anchor="middle" fill="${color}">${escapeXml(receptor)}</text>
    <text x="95" y="222" class="body" text-anchor="middle">${escapeXml(organ)}</text>
    <line x1="36" y1="251" x2="154" y2="251" stroke="#d9e3e7"/>
    ${tspanLines(points, 95, 288, 31, "note", "middle")}
  </g>`;
}

function figure03() {
  return figureFrame("Figure 3 | From GLP-1 Alone to Multi-Target Metabolic Control", `
  ${mechanismCard({ x: 70, title: "GLP-1", receptor: "GLP-1R", organ: "Gut / pancreas", color: "#2f91b7", icon: "gut", points: ["Lower appetite", "Increase satiety", "Improve insulin response"] })}
  ${mechanismCard({ x: 306, title: "GIP", receptor: "GIPR", organ: "Pancreas", color: "#7d65b5", icon: "pancreas", points: ["Amplify incretin synergy", "Support glucose control", "Improve metabolism"] })}
  ${mechanismCard({ x: 542, title: "Glucagon", receptor: "GCGR", organ: "Liver / fat", color: "#b0653c", icon: "liver", points: ["Raise energy use", "Promote lipolysis", "Improve liver metabolism"] })}
  ${mechanismCard({ x: 778, title: "Amylin", receptor: "AMYR", organ: "Brain", color: "#d98933", icon: "brain", points: ["Slow gastric emptying", "Suppress appetite", "Increase satiety"] })}
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
