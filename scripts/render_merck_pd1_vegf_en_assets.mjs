import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const backgroundSource = process.argv[2];

if (!backgroundSource || !fs.existsSync(backgroundSource)) {
  throw new Error("Usage: node scripts/render_merck_pd1_vegf_en_assets.mjs /path/to/gpt-background.png");
}

const slug = "merck-pd1-vegf-mk2010-keytruda-en";
const contentDir = path.join(repoRoot, "content", "published", slug, "images");
const assetDir = path.join(repoRoot, "assets", "articles", slug);
const tempDir = path.join("/private/tmp", "drugnews-merck-pd1-vegf-en-assets");
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

fs.mkdirSync(contentDir, { recursive: true });
fs.mkdirSync(assetDir, { recursive: true });
fs.mkdirSync(tempDir, { recursive: true });

const backgroundWorkspace = path.join(assetDir, "gpt-pd1-vegf-oncology-background.png");
fs.copyFileSync(backgroundSource, backgroundWorkspace);

const cards = [
  {
    file: "cover",
    kicker: "DRUGNEWS ENGLISH",
    title: "Merck's PD-1/VEGF Pivot",
    subtitle: "Keytruda still defines immuno-oncology, but MK-2010 shows Merck is preparing for the next backbone.",
    chips: ["Keytruda", "MK-2010", "PD-1/VEGF", "NSCLC"],
    panels: [
      ["Old defense", "Question whether PFS gains can become survival benefit."],
      ["New posture", "Ask where the dual-mechanism class fits inside Merck's oncology package."],
      ["Investor read", "The throne is intact, but the next backbone is becoming visible."]
    ],
    callout: "This is not a Keytruda replacement story yet. It is an option-value story."
  },
  {
    file: "figure-01",
    kicker: "FIGURE 01",
    title: "Why MK-2010 Matters",
    subtitle: "One molecule links checkpoint inhibition with anti-angiogenesis.",
    chips: ["PD-1", "VEGF", "Bispecific", "Combination-ready"],
    panels: [
      ["PD-1 side", "Releases immune inhibition and keeps the checkpoint narrative alive."],
      ["VEGF side", "Targets the tumor vasculature and microenvironment pressure point."],
      ["Strategic value", "Gives Merck a bridge from Keytruda into next-generation IO combinations."]
    ],
    callout: "The asset matters because it keeps Merck inside the mechanism debate."
  },
  {
    file: "figure-02",
    kicker: "FIGURE 02",
    title: "HARMONi-6 Changed the Tone",
    subtitle: "The class became harder to dismiss once survival entered the conversation.",
    chips: ["PFS", "OS", "China data", "Global validation"],
    panels: [
      ["Before", "The class could be treated as a watch item if only PFS improved."],
      ["After", "A survival signal forces large oncology players to take the class more seriously."],
      ["Remaining risk", "Global extrapolation, comorbid patients, and safety still need proof."]
    ],
    callout: "The debate moved from whether PD-1/VEGF matters to where it should be used."
  },
  {
    file: "figure-03",
    kicker: "FIGURE 03",
    title: "The Next IO Package",
    subtitle: "Merck's future may be a set of combinations rather than one successor to Keytruda.",
    chips: ["Keytruda", "PD-1/VEGF", "TROP2 ADC", "Targeted therapy"],
    panels: [
      ["Backbone", "Keytruda remains the reference point for Merck's oncology franchise."],
      ["Add-ons", "MK-2010 and ADCs create new ways to build combination packages."],
      ["Market question", "Can Merck defend the present while buying options on the next IO cycle?"]
    ],
    callout: "The post-Keytruda strategy is portfolio architecture, not a single magic bullet."
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
      radial-gradient(circle at 72% 23%, rgba(216, 115, 37, .09), transparent 22%),
      radial-gradient(circle at 18% 44%, rgba(18, 138, 149, .15), transparent 28%),
      linear-gradient(90deg, rgba(255,255,255,.985) 0%, rgba(255,255,255,.955) 51%, rgba(255,255,255,.76) 79%, rgba(255,255,255,.42) 100%),
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
  .network {
    position: absolute;
    right: 88px;
    top: 122px;
    width: 426px;
    height: 384px;
    opacity: .92;
  }
  .network::before,
  .network::after {
    content: "";
    position: absolute;
    border-radius: 999px;
    border: 8px solid rgba(18, 138, 149, .25);
    transform: rotate(-22deg);
  }
  .network::before { inset: 58px 12px 112px 12px; }
  .network::after { inset: 130px -22px 118px 58px; border-color: rgba(216, 115, 37, .32); transform: rotate(18deg); }
  .node {
    position: absolute;
    width: 92px;
    height: 92px;
    border-radius: 50%;
    background: rgba(255,255,255,.82);
    border: 5px solid rgba(18, 138, 149, .58);
    box-shadow: 0 18px 36px rgba(18, 70, 83, .10);
  }
  .node.orange { border-color: rgba(216, 115, 37, .62); }
  .node.a { right: 296px; top: 188px; }
  .node.b { right: 150px; top: 80px; }
  .node.c { right: 34px; top: 252px; }
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
    font-size: ${card.file === "cover" ? 72 : 64}px;
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
    background: rgba(255, 255, 255, .90);
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
    <div class="network"></div>
    <div class="node a"></div>
    <div class="node b orange"></div>
    <div class="node c"></div>
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
