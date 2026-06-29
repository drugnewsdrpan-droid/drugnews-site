import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const backgroundSource = process.argv[2];

if (!backgroundSource || !fs.existsSync(backgroundSource)) {
  throw new Error("Usage: node scripts/render_obesity_third_place_en_assets.mjs /path/to/gpt-background.png");
}

const slug = "obesity-drug-third-place-competition-en";
const contentDir = path.join(repoRoot, "content", "published", slug, "images");
const assetDir = path.join(repoRoot, "assets", "articles", slug);
const tempDir = path.join("/private/tmp", "drugnews-obesity-third-place-en-assets");
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

fs.mkdirSync(contentDir, { recursive: true });
fs.mkdirSync(assetDir, { recursive: true });
fs.mkdirSync(tempDir, { recursive: true });

const backgroundWorkspace = path.join(assetDir, "gpt-obesity-third-place-background.png");
fs.copyFileSync(backgroundSource, backgroundWorkspace);

const cards = [
  {
    file: "figure-01",
    kicker: "FIGURE 01",
    title: "The Duopoly Has Become an Ecosystem War",
    subtitle: "Lilly and Novo are no longer fighting with single products. They are building metabolic-medicine platforms.",
    chips: ["Injectables", "Oral GLP-1", "Multi-target", "Comorbidities"],
    panels: [
      ["Novo's moat", "Semaglutide, Wegovy, Rybelsus, brand familiarity, and global supply."],
      ["Lilly's ceiling", "Tirzepatide, orforglipron, retatrutide, and stronger efficacy narratives."],
      ["Investor read", "A third player must solve a problem the leaders have not fully solved."]
    ],
    callout: "The next race is not one drug versus one drug. It is ecosystem versus ecosystem."
  },
  {
    file: "figure-02",
    kicker: "FIGURE 02",
    title: "A Third Player Needs Asymmetry",
    subtitle: "The winner will not be a weaker Lilly or Novo. It needs a differentiated wedge.",
    chips: ["Monthly dosing", "Tolerability", "CRM fit", "Muscle preservation", "Asia data"],
    panels: [
      ["Pfizer", "Fewer injections and long-acting convenience."],
      ["Roche", "Two-axis portfolio: tolerability plus efficacy."],
      ["Regeneron / Asia", "Body composition, fatty liver, oral strategies, and clinical speed."]
    ],
    callout: "Third place belongs to the company that changes the question investors ask."
  },
  {
    file: "figure-03",
    kicker: "FIGURE 03",
    title: "Multi-target Biology Raises the Ceiling",
    subtitle: "GLP-1 is becoming one layer inside broader metabolic control.",
    chips: ["GLP-1", "GIP", "Glucagon", "Amylin", "Combination therapy"],
    panels: [
      ["Appetite", "GLP-1 and amylin strengthen satiety and adherence logic."],
      ["Metabolism", "GIP and glucagon may add energy-use and liver-fat angles."],
      ["Portfolio logic", "The strongest company may combine mechanisms, not only chase a single curve."]
    ],
    callout: "The investable story shifts from weight-loss percentage to durable metabolic positioning."
  },
  {
    file: "figure-04",
    kicker: "FIGURE 04",
    title: "The Next Battleground Is Quality of Weight Loss",
    subtitle: "As efficacy rises, investors will ask what kind of weight is being lost and whether patients can stay on therapy.",
    chips: ["Lean mass", "GI tolerability", "Adherence", "Payer value"],
    panels: [
      ["Old question", "Who produces the largest weight-loss number?"],
      ["New question", "Who improves tolerability, muscle quality, fatty liver, and long-term persistence?"],
      ["Market read", "A durable third player must own an unsolved clinical and commercial need."]
    ],
    callout: "The third obesity-drug giant will be built around unmet needs, not imitation."
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
    background: #fbfdfd;
  }
  .canvas {
    position: relative;
    width: 1600px;
    height: 900px;
    padding: 72px 82px;
    background-image:
      radial-gradient(circle at 68% 22%, rgba(216, 115, 37, .09), transparent 22%),
      radial-gradient(circle at 19% 42%, rgba(18, 138, 149, .15), transparent 28%),
      linear-gradient(90deg, rgba(255,255,255,.98) 0%, rgba(255,255,255,.94) 52%, rgba(255,255,255,.72) 78%, rgba(255,255,255,.36) 100%),
      url("${backgroundWorkspace}");
    background-size: cover;
    background-position: center;
  }
  .frame {
    position: absolute;
    inset: 34px;
    border: 2px solid rgba(24, 92, 112, .18);
    border-radius: 34px;
    box-shadow: inset 0 0 0 1px rgba(255,255,255,.86);
  }
  .orbit {
    position: absolute;
    right: 112px;
    top: 126px;
    width: 398px;
    height: 398px;
    border-radius: 50%;
    border: 10px solid rgba(18, 138, 149, .13);
  }
  .orbit::before,
  .orbit::after {
    content: "";
    position: absolute;
    border-radius: 999px;
    border: 7px solid rgba(216, 115, 37, .34);
    transform: rotate(-18deg);
  }
  .orbit::before { inset: 54px -28px 78px -28px; }
  .orbit::after { inset: 126px 42px 126px 42px; border-color: rgba(18, 138, 149, .28); transform: rotate(22deg); }
  .dot {
    position: absolute;
    width: 86px;
    height: 86px;
    border-radius: 50%;
    background: rgba(255,255,255,.82);
    border: 5px solid rgba(18, 138, 149, .58);
    box-shadow: 0 18px 36px rgba(18, 70, 83, .10);
  }
  .dot.orange { border-color: rgba(216, 115, 37, .62); }
  .dot.a { right: 292px; top: 170px; }
  .dot.b { right: 134px; top: 76px; }
  .dot.c { right: 18px; top: 234px; }
  .kicker {
    color: #d87325;
    font-size: 30px;
    font-weight: 850;
    letter-spacing: .18em;
    text-transform: uppercase;
    margin-bottom: 22px;
  }
  h1 {
    max-width: 1080px;
    margin: 0;
    font-size: 64px;
    line-height: 1.04;
    letter-spacing: 0;
    color: #111820;
  }
  .subtitle {
    max-width: 1080px;
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
    max-width: 1140px;
  }
  .chip {
    border: 2px solid rgba(19, 139, 151, .25);
    background: rgba(236, 249, 249, .94);
    color: #126a79;
    border-radius: 999px;
    padding: 12px 22px;
    font-size: 23px;
    font-weight: 820;
  }
  .panels {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 26px;
    max-width: 1310px;
    margin-top: 48px;
  }
  .panel {
    min-height: 184px;
    padding: 26px 30px;
    border-radius: 28px;
    border: 2px solid rgba(24, 92, 112, .18);
    background: rgba(255, 255, 255, .89);
    box-shadow: 0 20px 46px rgba(18, 70, 83, .08);
  }
  .panel b {
    display: block;
    color: #102f3a;
    font-size: 30px;
    line-height: 1.08;
    margin-bottom: 15px;
  }
  .panel span {
    display: block;
    color: #5f7078;
    font-size: 22px;
    line-height: 1.25;
    font-weight: 680;
  }
  .callout {
    position: absolute;
    left: 82px;
    right: 150px;
    bottom: 72px;
    padding: 24px 34px;
    border-radius: 999px;
    border: 4px solid #128a95;
    background: rgba(236, 249, 249, .92);
    color: #102f3a;
    font-size: 30px;
    line-height: 1.18;
    font-weight: 850;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
</head>
<body>
  <div class="canvas">
    <div class="frame"></div>
    <div class="orbit"></div>
    <div class="dot a"></div>
    <div class="dot b orange"></div>
    <div class="dot c"></div>
    <div class="kicker">${card.kicker}</div>
    <h1>${card.title}</h1>
    <div class="subtitle">${card.subtitle}</div>
    <div class="chips">${card.chips.map((chip) => `<span class="chip">${chip}</span>`).join("")}</div>
    <div class="panels">
      ${card.panels.map(([title, text]) => `<div class="panel"><b>${title}</b><span>${text}</span></div>`).join("")}
    </div>
    <div class="callout">${card.callout}</div>
  </div>
</body>
</html>`;
}

for (const card of cards) {
  const htmlPath = path.join(tempDir, `${card.file}.html`);
  const pngPath = path.join(tempDir, `${card.file}.png`);
  fs.writeFileSync(htmlPath, htmlFor(card));
  const result = spawnSync(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    `--screenshot=${pngPath}`,
    "--window-size=1600,900",
    `file://${htmlPath}`
  ], { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`Chrome failed for ${card.file}`);
  }
  fs.copyFileSync(pngPath, path.join(contentDir, `${card.file}.png`));
  fs.copyFileSync(pngPath, path.join(assetDir, `${card.file}.png`));
}

console.log(`Rendered ${cards.length} GPT-background English PNG cards for ${slug}.`);
