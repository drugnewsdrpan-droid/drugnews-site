import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const backgroundSource = process.argv[2];

if (!backgroundSource || !fs.existsSync(backgroundSource)) {
  throw new Error("Usage: node scripts/render_tirzepatide_immunometabolism_en_assets.mjs /path/to/gpt-background.png");
}

const slug = "tirzepatide-autoimmune-immunometabolism-en";
const contentDir = path.join(repoRoot, "content", "published", slug, "images");
const assetDir = path.join(repoRoot, "assets", "articles", slug);
const tempDir = path.join("/private/tmp", "drugnews-tirzepatide-immunometabolism-en-assets");
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

fs.mkdirSync(contentDir, { recursive: true });
fs.mkdirSync(assetDir, { recursive: true });
fs.mkdirSync(tempDir, { recursive: true });

const backgroundWorkspace = path.join(assetDir, "gpt-immunometabolism-background.png");
fs.copyFileSync(backgroundSource, backgroundWorkspace);

const cards = [
  {
    file: "cover",
    kicker: "DRUGNEWS ENGLISH",
    title: "Tirzepatide Enters Immunometabolism",
    subtitle: "Lilly is testing whether an obesity drug can become a broader platform in immune disease.",
    chips: ["Zepbound", "Taltz", "Omvoh", "Autoimmune", "Portfolio Logic"],
    panels: [
      ["Strategic question", "Can metabolic therapy help control immune-inflammatory disease?"],
      ["Investor read", "The upside is not one trial. It is a broader chronic-care architecture."]
    ],
    callout: "The story moves from weight loss to multi-system portfolio value."
  },
  {
    file: "figure-01",
    kicker: "FIGURE 01",
    title: "From Obesity Drug to Immune Lever",
    subtitle: "Zepbound is being tested as a metabolic input inside inflammatory-disease care.",
    chips: ["GLP-1/GIP", "Obesity", "Inflammation", "Chronic Care"],
    panels: [
      ["Old frame", "A weight-loss and diabetes asset."],
      ["New test", "A therapy that may reduce metabolic stress around immune disease."],
      ["Commercial shift", "A larger role if the benefit extends beyond body weight."]
    ],
    callout: "The key question is whether metabolic change creates immune-disease value."
  },
  {
    file: "figure-02",
    kicker: "FIGURE 02",
    title: "Zepbound + Taltz Trial Logic",
    subtitle: "The study asks whether metabolic intervention can improve skin, joint, weight, and inflammatory outcomes.",
    chips: ["Psoriatic Arthritis", "Skin", "Joint", "Weight", "Inflammation"],
    panels: [
      ["Backbone", "Taltz remains the immune-disease anchor."],
      ["Add-on lever", "Zepbound adds a metabolic intervention."],
      ["Signal to watch", "Does the combination improve more than weight?"]
    ],
    callout: "If the endpoints line up, Lilly can tell a portfolio story competitors cannot easily copy."
  },
  {
    file: "figure-03",
    kicker: "FIGURE 03",
    title: "The Immunometabolism Loop",
    subtitle: "Metabolism and immune signaling can reinforce each other in chronic inflammatory disease.",
    chips: ["Fat Tissue", "Insulin Resistance", "Immune Activation", "Feedback Loop"],
    panels: [
      ["Metabolic load", "Obesity can worsen inflammatory status."],
      ["Immune burden", "Chronic inflammation can complicate disease control."],
      ["Therapy thesis", "Interrupting the loop may improve the treatment architecture."]
    ],
    callout: "This is why the category matters: it connects biology, endpoints, and payer logic."
  },
  {
    file: "figure-04",
    kicker: "FIGURE 04",
    title: "Why the Portfolio Matters",
    subtitle: "Lilly's advantage is not only Zepbound. It is the ability to connect obesity, skin, joint, and gut assets.",
    chips: ["Zepbound", "Taltz", "Omvoh", "Payer Story"],
    panels: [
      ["Patient system", "Chronic disease keeps patients inside care pathways for years."],
      ["Portfolio system", "Multiple products can create a coherent treatment narrative."],
      ["Valuation system", "Integrated logic can support a stronger platform multiple."]
    ],
    callout: "The investable story is the system, not only the molecule."
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
      radial-gradient(circle at 72% 24%, rgba(216, 115, 37, .10), transparent 20%),
      radial-gradient(circle at 18% 32%, rgba(18, 138, 149, .16), transparent 26%),
      linear-gradient(90deg, rgba(255,255,255,.98) 0%, rgba(255,255,255,.94) 50%, rgba(255,255,255,.70) 78%, rgba(255,255,255,.34) 100%),
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
  .axis {
    position: absolute;
    right: 98px;
    top: 142px;
    width: 390px;
    height: 320px;
    opacity: .9;
  }
  .ring {
    position: absolute;
    border-radius: 50%;
    border: 14px solid rgba(18, 138, 149, .15);
  }
  .ring.one { width: 260px; height: 260px; right: 42px; top: 22px; }
  .ring.two { width: 168px; height: 168px; right: 88px; top: 68px; border-color: rgba(216, 115, 37, .20); }
  .dot {
    position: absolute;
    width: 76px;
    height: 76px;
    border-radius: 50%;
    background: rgba(236, 249, 249, .92);
    border: 4px solid rgba(18, 138, 149, .52);
    box-shadow: 0 18px 36px rgba(18, 70, 83, .10);
  }
  .dot.orange { border-color: rgba(216, 115, 37, .65); background: rgba(255, 246, 235, .92); }
  .dot.a { right: 10px; top: 18px; }
  .dot.b { right: 248px; top: 72px; }
  .dot.c { right: 96px; top: 226px; }
  .kicker {
    color: #d87325;
    font-size: 30px;
    font-weight: 800;
    letter-spacing: .18em;
    text-transform: uppercase;
    margin-bottom: 22px;
  }
  h1 {
    max-width: 1040px;
    margin: 0;
    font-size: ${card.file === "cover" ? 70 : 64}px;
    line-height: 1.05;
    letter-spacing: 0;
    color: #111820;
  }
  .subtitle {
    max-width: 1040px;
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
    max-width: 1120px;
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
    right: 126px;
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
    <div class="axis">
      <div class="ring one"></div><div class="ring two"></div>
      <div class="dot a"></div><div class="dot orange b"></div><div class="dot c"></div>
    </div>
    <div class="kicker">${card.kicker}</div>
    <h1>${card.title}</h1>
    <div class="subtitle">${card.subtitle}</div>
    <div class="chips">${card.chips.map((chip) => `<span class="chip">${chip}</span>`).join("")}</div>
    <section class="panels">
      ${card.panels.map(([title, body]) => `<article class="panel"><b>${title}</b><span>${body}</span></article>`).join("")}
    </section>
    <div class="callout">${card.callout}</div>
    <div class="mini-label">Immunometabolism</div>
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
