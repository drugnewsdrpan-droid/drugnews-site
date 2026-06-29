import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const backgroundSource = process.argv[2];

if (!backgroundSource || !fs.existsSync(backgroundSource)) {
  throw new Error("Usage: node scripts/render_ai_zasocitinib_en_assets.mjs /path/to/gpt-background.png");
}

const slug = "ai-zasocitinib-sotyktu-en";
const contentDir = path.join(repoRoot, "content", "published", slug, "images");
const assetDir = path.join(repoRoot, "assets", "articles", slug);
const tempDir = path.join("/private/tmp", "drugnews-ai-zasocitinib-en-assets");
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

fs.mkdirSync(contentDir, { recursive: true });
fs.mkdirSync(assetDir, { recursive: true });
fs.mkdirSync(tempDir, { recursive: true });

const backgroundWorkspace = path.join(assetDir, "gpt-ai-drug-discovery-background.png");
fs.copyFileSync(backgroundSource, backgroundWorkspace);

const cards = [
  {
    file: "cover",
    kicker: "DRUGNEWS ENGLISH",
    title: "AI Drug Discovery Faces the Clinic",
    subtitle: "Takeda's zasocitinib turns AI-enabled design into a real head-to-head commercial test.",
    chips: ["Zasocitinib", "Sotyktu", "TYK2", "Psoriasis", "AI Drug Discovery"],
    panels: [
      ["Clinical exam", "A direct Phase 3 comparison gives investors more than an AI story."],
      ["Commercial exam", "The asset still has to beat a mature psoriasis market."]
    ],
    callout: "AI only matters when it changes clinical probability and product positioning."
  },
  {
    file: "figure-01",
    kicker: "FIGURE 01",
    title: "The Psoriasis Bar Has Moved",
    subtitle: "Oral convenience is useful, but deeper clearance now sets the competitive standard.",
    chips: ["PASI 75", "PASI 90", "PASI 100", "Durability"],
    panels: [
      ["Old bar", "PASI 75 once defined meaningful improvement."],
      ["New bar", "Biologics pushed expectations toward clear or almost clear skin."],
      ["Investor read", "An oral drug needs efficacy, safety, access, and switching logic."]
    ],
    callout: "Convenience alone is not enough in a market already trained by high-performing biologics."
  },
  {
    file: "figure-02",
    kicker: "FIGURE 02",
    title: "What Makes the AI Claim Matter",
    subtitle: "The question is not whether software was used. It is whether the molecule is better.",
    chips: ["Modeling", "Potency", "Selectivity", "Clinical Asset"],
    panels: [
      ["Design input", "Computational discovery can improve candidate selection."],
      ["Clinical proof", "Head-to-head data tests whether design translated into performance."],
      ["Market proof", "Differentiation must survive payer and physician scrutiny."]
    ],
    callout: "AI becomes valuable when it produces a drug that wins under normal biotech rules."
  },
  {
    file: "figure-03",
    kicker: "FIGURE 03",
    title: "TYK2 Is the Narrow Gate",
    subtitle: "The category promises oral immune modulation without the same perception burden as broad JAK inhibition.",
    chips: ["TYK2", "JAK Risk", "Oral Therapy", "Immune Signaling"],
    panels: [
      ["Strategic opening", "A more targeted pathway can improve the safety narrative."],
      ["Market risk", "Safety perception still matters even when labels differ."],
      ["Competitive test", "Sotyktu proved the category; zasocitinib must improve the package."]
    ],
    callout: "The winner will be the product that gives clinicians a simple reason to prescribe."
  },
  {
    file: "figure-04",
    kicker: "FIGURE 04",
    title: "The Commercial Exam",
    subtitle: "Winning the headline is not the same as building a durable franchise.",
    chips: ["Efficacy", "Safety", "Access", "Expansion"],
    panels: [
      ["Clinical", "Can the efficacy signal stay strong and durable?"],
      ["Commercial", "Can payers and physicians see a clear switching rationale?"],
      ["Platform", "Can the first label support expansion into other immune diseases?"]
    ],
    callout: "The investable question is whether one clinical win can become a franchise path."
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
      radial-gradient(circle at 71% 25%, rgba(216, 115, 37, .10), transparent 22%),
      radial-gradient(circle at 17% 34%, rgba(18, 138, 149, .16), transparent 28%),
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
  .network {
    position: absolute;
    right: 102px;
    top: 134px;
    width: 398px;
    height: 336px;
    opacity: .92;
  }
  .network::before {
    content: "";
    position: absolute;
    left: 64px;
    top: 146px;
    width: 270px;
    height: 16px;
    background: linear-gradient(90deg, rgba(18,138,149,.2), rgba(216,115,37,.35), rgba(18,138,149,.2));
    border-radius: 999px;
    transform: rotate(-18deg);
  }
  .node {
    position: absolute;
    width: 82px;
    height: 82px;
    border-radius: 50%;
    background: rgba(236, 249, 249, .92);
    border: 4px solid rgba(18, 138, 149, .52);
    box-shadow: 0 18px 36px rgba(18, 70, 83, .10);
  }
  .node.orange { border-color: rgba(216, 115, 37, .65); background: rgba(255, 246, 235, .92); }
  .node.a { right: 20px; top: 12px; }
  .node.b { right: 190px; top: 76px; }
  .node.c { right: 80px; top: 224px; }
  .node.d { right: 272px; top: 212px; }
  .kicker {
    color: #d87325;
    font-size: 30px;
    font-weight: 800;
    letter-spacing: .18em;
    text-transform: uppercase;
    margin-bottom: 22px;
  }
  h1 {
    max-width: 1060px;
    margin: 0;
    font-size: ${card.file === "cover" ? 70 : 64}px;
    line-height: 1.05;
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
    <div class="network"><div class="node a"></div><div class="node orange b"></div><div class="node c"></div><div class="node orange d"></div></div>
    <div class="kicker">${card.kicker}</div>
    <h1>${card.title}</h1>
    <div class="subtitle">${card.subtitle}</div>
    <div class="chips">${card.chips.map((chip) => `<span class="chip">${chip}</span>`).join("")}</div>
    <section class="panels">
      ${card.panels.map(([title, body]) => `<article class="panel"><b>${title}</b><span>${body}</span></article>`).join("")}
    </section>
    <div class="callout">${card.callout}</div>
    <div class="mini-label">Clinical Validation</div>
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
