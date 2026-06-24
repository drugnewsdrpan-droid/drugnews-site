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

function wrapText(text, maxChars) {
  const words = String(text).split(/\s+/).filter(Boolean);
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

function textBlock(lines, x, y, size, fill = "#122f3a", weight = 700, anchor = "start", lineHeight = size * 1.24) {
  return lines.map((line, index) => (
    `<text x="${x}" y="${y + index * lineHeight}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${escapeXml(line)}</text>`
  )).join("\n");
}

function panel(x, y, width, height, fill = "#fff", stroke = "none", opacity = 1, rx = 2) {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${rx}" fill="${fill}" stroke="${stroke}" opacity="${opacity}"/>`;
}

function sourceFrame({ file, width, height, body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">
  <image href="${file}" x="0" y="0" width="${width}" height="${height}"/>
  ${body}
</svg>
`;
}

function figure01() {
  const w = 494;
  const h = 347;
  return sourceFrame({
    file: "facebook-01.png",
    width: w,
    height: h,
    body: `
  ${panel(0, 0, 494, 32)}
  ${textBlock(["Fig. 1 | Duopoly battle:", "injections, oral drugs, multi-targets"], 10, 14, 12, "#102a43", 800, "start", 14)}

  ${panel(146, 49, 186, 93, "#fff", "none", 1, 4)}
  ${textBlock(["Portfolio showdown"], 239, 71, 13, "#102a43", 800, "middle")}
  ${textBlock(["From single-product rivalry", "to a metabolic", "ecosystem race"], 239, 88, 8, "#102a43", 700, "middle", 10)}

  ${panel(9, 87, 142, 18, "#2b83b8", "none", 1, 3)}
  ${textBlock(["semaglutide family"], 80, 101, 12, "#fff", 800, "middle")}
  ${panel(332, 87, 145, 18, "#c84f4a", "none", 1, 3)}
  ${textBlock(["tirzepatide family"], 404, 101, 12, "#fff", 800, "middle")}

  ${panel(39, 105, 108, 164, "#f8fbfb", "none", 1, 4)}
  ${textBlock(["Ozempic (injection)", "Wegovy (injection)", "Rybelsus (oral)", "Wegovy pill (oral)"], 70, 136, 8, "#172b35", 700, "start", 19)}

  ${panel(334, 105, 146, 173, "#fff8f6", "none", 1, 4)}
  ${textBlock(["Mounjaro (injection)", "Zepbound (injection)", "retatrutide", "(GIP / GLP-1 / glucagon)", "orforglipron", "(oral small molecule)"], 346, 134, 8, "#172b35", 700, "start", 16)}

  ${panel(9, 281, 201, 49, "#eaf6fb", "#b9d4df", .98, 4)}
  ${textBlock(["Brand recognition + physician familiarity", "Global supply chain", "Injection franchise extends into oral therapy"], 109, 296, 9, "#1f4c5f", 700, "middle", 13)}

  ${panel(292, 281, 192, 49, "#fdeae5", "#e4bdb5", .98, 4)}
  ${textBlock(["Stronger efficacy + next-gen depth", "Multi-target biology", "Oralization advances together"], 388, 296, 9, "#5f2a24", 700, "middle", 13)}
  `
  });
}

function figure02() {
  return sourceFrame({
    file: "facebook-02.png",
    width: 542,
    height: 349,
    body: `
  ${panel(0, 0, 542, 36)}
  ${textBlock(["Fig. 2 | MNC obesity strategies: differentiated routes to third place"], 12, 23, 15, "#102a43", 800)}

  ${panel(4, 79, 105, 197, "#f8fbfb", "#bdd3dc", .99, 4)}
  ${textBlock(["Berobenatide"], 65, 108, 10, "#183848", 800, "middle")}
  ${textBlock(["Long-acting", "GLP-1 analog"], 65, 126, 8, "#183848", 700, "middle", 10)}
  ${textBlock(["Monthly", "injection", "window"], 65, 203, 9, "#183848", 800, "middle", 12)}

  ${panel(112, 79, 104, 197, "#fbf8ff", "#d8cce9", .99, 4)}
  ${textBlock(["Petrelintide"], 165, 106, 9, "#2d2a55", 800, "middle")}
  ${textBlock(["Long-acting", "amylin analog"], 165, 122, 8, "#2d2a55", 700, "middle", 10)}
  ${textBlock(["Enicepatide"], 165, 168, 9, "#2d2a55", 800, "middle")}
  ${textBlock(["GLP-1/GIP", "dual agonist"], 165, 184, 8, "#2d2a55", 700, "middle", 10)}
  ${textBlock(["Tolerability", "+ efficacy"], 165, 232, 9, "#2d2a55", 800, "middle", 12)}

  ${panel(220, 79, 104, 197, "#fff9ec", "#ead7a4", .99, 4)}
  ${textBlock(["Ecnoglutide"], 264, 107, 10, "#5d4521", 800, "middle")}
  ${textBlock(["Oral small-", "molecule GLP-1"], 264, 127, 8, "#5d4521", 700, "middle", 10)}
  ${textBlock(["CRM", "integration"], 264, 232, 9, "#5d4521", 800, "middle", 12)}

  ${panel(328, 79, 95, 197, "#f2fbf3", "#b9dabd", .99, 4)}
  ${textBlock(["Trevogrumab"], 363, 107, 10, "#25472c", 800, "middle")}
  ${textBlock(["Anti-myostatin", "antibody"], 363, 126, 8, "#25472c", 700, "middle", 10)}
  ${textBlock(["Preserve", "muscle quality"], 363, 232, 9, "#25472c", 800, "middle", 12)}

  ${panel(426, 79, 105, 197, "#f0faf9", "#bddad8", .99, 4)}
  ${panel(424, 32, 112, 47, "#fff", "none", 1, 0)}
  ${textBlock(["Asia / China", "innovation"], 480, 53, 10, "#1f4e52", 800, "middle", 12)}
  ${textBlock(["Mazdutide", "Rybubatide", "Ecnoglutide"], 472, 105, 9, "#1f4e52", 800, "middle", 13)}
  ${textBlock(["Multi-target", "and oral routes"], 472, 164, 8, "#1f4e52", 700, "middle", 10)}
  ${textBlock(["Local speed", "+ global ambition"], 472, 232, 9, "#1f4e52", 800, "middle", 12)}

  ${panel(4, 276, 106, 62, "#edf6fb", "#bfd4df", 1, 4)}
  ${textBlock(["Lower treatment burden"], 57, 302, 8, "#244a5a", 700, "middle")}
  ${panel(116, 276, 94, 62, "#f3effb", "#d8cce9", 1, 4)}
  ${textBlock(["Combination optionality"], 163, 302, 8, "#3d3560", 700, "middle")}
  ${panel(218, 276, 88, 62, "#fff7e8", "#ead7a4", 1, 4)}
  ${textBlock(["Ecosystem fit"], 262, 302, 8, "#5d4521", 700, "middle")}
  ${panel(318, 276, 92, 62, "#edf8ef", "#b9dabd", 1, 4)}
  ${textBlock(["Healthier weight loss"], 364, 302, 8, "#25472c", 700, "middle")}
  ${panel(418, 276, 118, 62, "#edf8f8", "#bddad8", 1, 4)}
  ${textBlock(["Clinical speed", "and global ambition"], 477, 298, 8, "#1f4e52", 700, "middle", 10)}
  ${panel(4, 336, 532, 9, "#fff", "none", 1, 0)}
  `
  });
}

function figure03() {
  return sourceFrame({
    file: "facebook-03.png",
    width: 496,
    height: 337,
    body: `
  ${panel(0, 0, 496, 36)}
  ${textBlock(["Fig. 3 | Multi-target mechanisms: from GLP-1 to metabolic control"], 12, 23, 15, "#102a43", 800)}
  ${panel(0, 36, 496, 19, "#fff", "none", 1, 0)}
  ${panel(13, 54, 104, 244, "#f8fbfb", "none", 1, 4)}
  ${panel(13, 39, 104, 24, "#fff", "none", 1, 0)}
  ${textBlock(["GLP-1"], 65, 56, 12, "#2e8fac", 800, "middle")}
  ${textBlock(["Appetite control", "Glucose response", "Insulin support"], 65, 258, 8, "#254b58", 700, "middle", 11)}
  ${panel(119, 54, 104, 244, "#fbf8ff", "none", 1, 4)}
  ${panel(119, 39, 104, 24, "#fff", "none", 1, 0)}
  ${textBlock(["GIP"], 171, 56, 12, "#725fb0", 800, "middle")}
  ${textBlock(["Incretin synergy", "Glucose control", "Metabolic support"], 171, 258, 8, "#3f3567", 700, "middle", 11)}
  ${panel(225, 54, 104, 244, "#fff8f1", "none", 1, 4)}
  ${panel(225, 39, 104, 24, "#fff", "none", 1, 0)}
  ${textBlock(["Glucagon"], 277, 56, 12, "#aa6237", 800, "middle")}
  ${textBlock(["Energy use", "Lipolysis", "Liver metabolism"], 277, 258, 8, "#654028", 700, "middle", 11)}
  ${panel(331, 54, 84, 244, "#fff7ef", "none", 1, 4)}
  ${panel(331, 39, 84, 24, "#fff", "none", 1, 0)}
  ${textBlock(["Amylin"], 373, 56, 12, "#d07b2f", 800, "middle")}
  ${textBlock(["Gastric emptying", "Appetite control", "Satiety"], 373, 258, 8, "#6a4322", 700, "middle", 11)}
  ${panel(418, 39, 72, 258, "#f4fbf9", "#bddad3", 1, 4)}
  ${textBlock(["Combo", "therapy"], 454, 98, 10, "#23535a", 800, "middle", 12)}
  ${textBlock(["GLP-1/GIP", "GLP-1/glucagon", "Triple agonist", "GLP-1 + amylin"], 454, 203, 7, "#23535a", 700, "middle", 10)}
  ${panel(18, 296, 456, 32, "#eaf4f7", "#bfd8df", 1, 4)}
  ${textBlock(["From one mechanism to multi-target coordination: efficacy, tolerability, broader patient fit"], 246, 321, 9, "#244a5a", 800, "middle")}
  `
  });
}

function figure04() {
  return sourceFrame({
    file: "facebook-04.png",
    width: 543,
    height: 337,
    body: `
  ${panel(0, 0, 543, 36)}
  ${textBlock(["Fig. 4 | Next obesity battleground: from weight loss to health quality"], 12, 23, 15, "#102a43", 800)}
  ${panel(88, 58, 140, 210, "#fff", "#cfdbe0", 1, 5)}
  ${textBlock(["Past: weight-loss", "magnitude"], 158, 84, 10, "#102a43", 800, "middle", 12)}
  ${textBlock(["Which patient loses more?", "Body-weight percentage", "Speed of weight loss", "Market-share race"], 105, 122, 8, "#263f49", 700, "start", 18)}
  ${panel(263, 58, 204, 210, "#f6fbf3", "#c8dfbd", 1, 5)}
  ${textBlock(["Future: health quality"], 365, 84, 11, "#25472c", 800, "middle")}
  ${textBlock(["Less vomiting?", "Better tolerability?", "Preserve muscle?", "Improve fatty liver?", "Lower CV-metabolic risk?", "Long-term adherence?"], 287, 116, 9, "#25472c", 700, "start", 18)}
  ${panel(33, 300, 479, 27, "#eaf4f7", "#bfd8df", .97, 4)}
  ${textBlock(["Third place is not about copying the leaders. It is about solving unsolved problems."], 272, 318, 10, "#244a5a", 800, "middle")}
  `
  });
}

await fs.mkdir(OUT, { recursive: true });
await fs.writeFile(path.join(OUT, "figure-01-en.svg"), figure01().replace(/[ \t]+$/gm, ""));
await fs.writeFile(path.join(OUT, "figure-02-en.svg"), figure02().replace(/[ \t]+$/gm, ""));
await fs.writeFile(path.join(OUT, "figure-03-en.svg"), figure03().replace(/[ \t]+$/gm, ""));
await fs.writeFile(path.join(OUT, "figure-04-en.svg"), figure04().replace(/[ \t]+$/gm, ""));
console.log("Rebuilt obesity figures as direct English translations over the original Chinese image layouts.");
