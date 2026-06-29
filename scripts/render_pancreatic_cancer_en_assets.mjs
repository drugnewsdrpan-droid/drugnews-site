import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const backgroundSource = process.argv[2];

if (!backgroundSource || !fs.existsSync(backgroundSource)) {
  throw new Error("Usage: node scripts/render_pancreatic_cancer_en_assets.mjs /path/to/gpt-background.png");
}

const slug = "pancreatic-cancer-ras-prmt5-mat2a-combination-en";
const contentDir = path.join(repoRoot, "content", "published", slug, "images");
const assetDir = path.join(repoRoot, "assets", "articles", slug);
const tempDir = path.join("/private/tmp", "drugnews-pancreatic-cancer-en-assets");
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

fs.mkdirSync(contentDir, { recursive: true });
fs.mkdirSync(assetDir, { recursive: true });
fs.mkdirSync(tempDir, { recursive: true });

const backgroundWorkspace = path.join(assetDir, "gpt-oncology-combination-background.png");
fs.copyFileSync(backgroundSource, backgroundWorkspace);

const cards = [
  {
    file: "cover",
    kicker: "DRUGNEWS ENGLISH",
    title: "Pancreatic Cancer's Next Layer",
    subtitle: "After RAS inhibition, PRMT5 and MAT2A combinations may reshape precision oncology.",
    chips: ["RAS", "PRMT5", "MAT2A", "MTAP", "Synthetic Lethality"],
    panels: [
      ["Clinical signal", "Early combination data suggest RAS may become a backbone, not only a single drug."],
      ["Investor question", "The value moves from one asset to a larger precision-combination platform."]
    ],
    callout: "The next upside may come from how mechanisms fit together."
  },
  {
    file: "figure-01",
    kicker: "FIGURE 01",
    title: "Why the Combo Matters",
    subtitle: "RAS inhibition plus MTAP-selective PRMT5 targeting attacks two survival routes.",
    chips: ["Daraxonrasib", "Vopimetostat", "MTAP Loss", "92% ORR"],
    panels: [
      ["Driver block", "Daraxonrasib suppresses the core RAS growth signal."],
      ["Vulnerability hit", "Vopimetostat exploits the weakness created by MTAP deletion."],
      ["Market read", "A small dataset can still change how the field is framed."]
    ],
    callout: "The key is not only response rate. It is whether RAS becomes a combination backbone."
  },
  {
    file: "figure-02",
    kicker: "FIGURE 02",
    title: "Safety Is the Next Gate",
    subtitle: "Beautiful early efficacy still has to survive dose, toxicity, and durability questions.",
    chips: ["Dose Window", "Rash", "Diarrhea", "Grade 3+"],
    panels: [
      ["Early comfort", "Most reported events were grade 1 or 2 in the initial combination dataset."],
      ["Real test", "Larger studies must show whether severe toxicity stays controlled."],
      ["Valuation impact", "A wider window supports longer treatment and stronger combination optionality."]
    ],
    callout: "In pancreatic cancer, the bar is not just activity. It is activity patients can stay on."
  },
  {
    file: "figure-03",
    kicker: "FIGURE 03",
    title: "PRMT5 Becomes a Selectivity Battle",
    subtitle: "IDEAYA's IDE892 pushes the field from mechanism validation toward best-in-class competition.",
    chips: ["IDE892", "MTA-Cooperative", "Selectivity", "Therapeutic Window"],
    panels: [
      ["Biology", "MTAP loss creates MTA accumulation and a PRMT5 dependency."],
      ["Differentiation", "Selectivity may reduce normal-cell PRMT5 pressure."],
      ["BD logic", "The winner may be the asset that combines best, not the asset that arrives first."]
    ],
    callout: "PRMT5 is becoming less a single-target story and more a dosing-window story."
  },
  {
    file: "figure-04",
    kicker: "FIGURE 04",
    title: "MAT2A Adds the Third Piece",
    subtitle: "A triplet strategy may sharpen PRMT5 inhibition while keeping RAS as the growth-driver anchor.",
    chips: ["IDE397", "SAM Reduction", "Triplet Logic", "Precision Combo"],
    panels: [
      ["RAS", "Cut the main growth circuit."],
      ["PRMT5", "Attack the MTAP-linked survival switch."],
      ["MAT2A", "Lower SAM and make the PRMT5 strategy sharper."]
    ],
    callout: "The future setup may be RAS mutation + MTAP deletion + metabolic vulnerability."
  }
];

function htmlFor(card) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; width: 1600px; height: 900px; overflow: hidden; }
  body {
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    color: #102f3a;
    background: #f9fbfb;
  }
  .canvas {
    position: relative;
    width: 1600px;
    height: 900px;
    padding: 72px 82px;
    background-image:
      radial-gradient(circle at 16% 28%, rgba(18, 138, 149, .14), transparent 24%),
      linear-gradient(90deg, rgba(255,255,255,.98) 0%, rgba(255,255,255,.93) 48%, rgba(255,255,255,.68) 74%, rgba(255,255,255,.34) 100%),
      url("${backgroundWorkspace}");
    background-size: cover;
    background-position: center;
  }
  .frame {
    position: absolute;
    inset: 34px;
    border: 2px solid rgba(24, 92, 112, .18);
    border-radius: 34px;
    box-shadow: inset 0 0 0 1px rgba(255,255,255,.85);
  }
  .pathway {
    position: absolute;
    right: 96px;
    top: 130px;
    width: 360px;
    height: 360px;
    opacity: .88;
  }
  .node {
    position: absolute;
    width: 86px;
    height: 86px;
    border-radius: 50%;
    background: rgba(236, 249, 249, .9);
    border: 4px solid rgba(18, 138, 149, .52);
    box-shadow: 0 20px 40px rgba(18, 70, 83, .10);
  }
  .node.orange { border-color: rgba(216, 115, 37, .62); background: rgba(255, 246, 235, .9); }
  .node:nth-child(1) { left: 124px; top: 0; }
  .node:nth-child(2) { right: 10px; top: 126px; }
  .node:nth-child(3) { left: 124px; bottom: 0; }
  .node:nth-child(4) { left: 0; top: 126px; }
  .pathway::before {
    content: "";
    position: absolute;
    inset: 42px;
    border: 14px solid rgba(18, 138, 149, .18);
    border-radius: 50%;
  }
  .kicker {
    color: #d87325;
    font-size: 30px;
    font-weight: 800;
    letter-spacing: .18em;
    text-transform: uppercase;
    margin-bottom: 22px;
  }
  h1 {
    max-width: 1030px;
    margin: 0;
    font-size: ${card.file === "cover" ? 72 : 64}px;
    line-height: 1.04;
    letter-spacing: 0;
    color: #111820;
  }
  .subtitle {
    max-width: 1050px;
    margin-top: 24px;
    font-size: 31px;
    line-height: 1.32;
    color: #5f7078;
    font-weight: 650;
  }
  .chips {
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
    margin-top: 32px;
    max-width: 1110px;
  }
  .chip {
    border: 2px solid rgba(19, 139, 151, .25);
    background: rgba(236, 249, 249, .92);
    color: #126a79;
    border-radius: 999px;
    padding: 12px 22px;
    font-size: 23px;
    font-weight: 800;
  }
  .panels {
    display: grid;
    grid-template-columns: repeat(${card.panels.length}, minmax(0, 1fr));
    gap: 26px;
    max-width: ${card.panels.length === 2 ? "1120px" : "1300px"};
    margin-top: 52px;
  }
  .panel {
    min-height: ${card.panels.length === 2 ? "162px" : "186px"};
    padding: 26px 30px;
    border-radius: 28px;
    border: 2px solid rgba(24, 92, 112, .18);
    background: rgba(255, 255, 255, .88);
    box-shadow: 0 20px 46px rgba(18, 70, 83, .08);
  }
  .panel b {
    display: block;
    color: #102f3a;
    font-size: 30px;
    line-height: 1.1;
    margin-bottom: 15px;
  }
  .panel span {
    display: block;
    color: #5d6e75;
    font-size: 23px;
    line-height: 1.22;
    font-weight: 650;
  }
  .callout {
    position: absolute;
    left: 82px;
    bottom: 64px;
    width: 1080px;
    padding: 22px 30px;
    border-radius: 24px;
    color: #102f3a;
    background: rgba(239, 250, 249, .94);
    border: 4px solid #108a95;
    font-size: 26px;
    line-height: 1.22;
    font-weight: 850;
  }
  .mini-label {
    position: absolute;
    right: 132px;
    bottom: 116px;
    padding: 16px 24px;
    border-radius: 999px;
    background: rgba(255, 246, 235, .92);
    border: 3px solid rgba(216, 115, 37, .42);
    color: #a75c1e;
    font-size: 24px;
    font-weight: 900;
  }
</style>
</head>
<body>
  <main class="canvas">
    <div class="frame"></div>
    <div class="pathway"><div class="node"></div><div class="node orange"></div><div class="node"></div><div class="node orange"></div></div>
    <div class="kicker">${card.kicker}</div>
    <h1>${card.title}</h1>
    <div class="subtitle">${card.subtitle}</div>
    <div class="chips">${card.chips.map((chip) => `<span class="chip">${chip}</span>`).join("")}</div>
    <section class="panels">
      ${card.panels.map(([title, body]) => `<article class="panel"><b>${title}</b><span>${body}</span></article>`).join("")}
    </section>
    <div class="callout">${card.callout}</div>
    <div class="mini-label">Precision Oncology</div>
  </main>
</body>
</html>`;
}

for (const card of cards) {
  const htmlPath = path.join(tempDir, `${card.file}.html`);
  const pngPath = path.join(contentDir, `${card.file}.png`);
  fs.writeFileSync(htmlPath, htmlFor(card));

  const result = spawnSync(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--no-first-run",
    "--hide-scrollbars",
    "--window-size=1600,900",
    `--screenshot=${pngPath}`,
    `file://${htmlPath}`
  ], { encoding: "utf8" });

  if (result.status !== 0) {
    throw new Error(`Chrome render failed for ${card.file}: ${result.stderr || result.stdout}`);
  }

  fs.copyFileSync(pngPath, path.join(assetDir, `${card.file}.png`));
}

console.log(`Rendered ${cards.length} English PNG assets for ${slug}.`);
