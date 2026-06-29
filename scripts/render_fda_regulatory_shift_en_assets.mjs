import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const backgroundSource = process.argv[2];

if (!backgroundSource || !fs.existsSync(backgroundSource)) {
  throw new Error("Usage: node scripts/render_fda_regulatory_shift_en_assets.mjs /path/to/gpt-background.png");
}

const slug = "fda-regulatory-shift-biotech-rebound-en";
const contentDir = path.join(repoRoot, "content", "published", slug, "images");
const assetDir = path.join(repoRoot, "assets", "articles", slug);
const tempDir = path.join("/private/tmp", "drugnews-fda-regulatory-shift-en-assets");
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

fs.mkdirSync(contentDir, { recursive: true });
fs.mkdirSync(assetDir, { recursive: true });
fs.mkdirSync(tempDir, { recursive: true });

const backgroundWorkspace = path.join(assetDir, "gpt-regulatory-rebound-background.png");
fs.copyFileSync(backgroundSource, backgroundWorkspace);

const cards = [
  {
    file: "cover",
    kicker: "DRUGNEWS ENGLISH",
    title: "FDA Tone Shift",
    subtitle: "Why biotech’s rebound is starting at the regulatory layer",
    chips: ["FDA", "Rare Disease", "Gene Therapy", "mRNA", "M&A"],
    panels: [
      ["Regulatory path", "A clearer review route can change the rNPV of the same pipeline."],
      ["Capital signal", "Investors return first to assets with real data and a credible path."]
    ],
    callout: "Biotech capital is repricing evidence, not slogans."
  },
  {
    file: "figure-01",
    kicker: "FIGURE 01",
    title: "Operation TrialBlazer",
    subtitle: "The FDA is signaling that review efficiency matters again.",
    chips: ["Faster Review", "Smarter Trials", "Digital Tools", "rNPV Upside"],
    panels: [
      ["Timeline", "Can filing move earlier?"],
      ["Evidence", "Can existing data support review?"],
      ["Risk", "Can complete-response risk fall?"]
    ],
    callout: "A shorter path to market can lift the same asset’s risk-adjusted value."
  },
  {
    file: "figure-02",
    kicker: "FIGURE 02",
    title: "Moderna mRNA Flu",
    subtitle: "The same platform can look different when benefit-risk is received differently.",
    chips: ["9–0 Vote", "mRNA Flu", "Platform Confidence", "Benefit–Risk"],
    panels: [
      ["Before", "Questions on trial design and review standards."],
      ["After", "Advisory committee support reframed the platform signal."],
      ["Investor read", "Innovation still needs evidence, but it may not stay stuck."]
    ],
    callout: "The issue was not hype. It was whether the evidence package could clear the bar."
  },
  {
    file: "figure-03",
    kicker: "FIGURE 03",
    title: "uniQure AMT-130",
    subtitle: "Rare-disease gene therapy may have a path beyond the conventional Phase 3 template.",
    chips: ["Huntington’s", "Natural History", "BLA Path", "Accelerated Approval"],
    panels: [
      ["Clinical reality", "Small populations and slow progression make classic trials difficult."],
      ["Regulatory signal", "Long-term Phase 1/2 data may support a planned BLA."],
      ["Market impact", "A viable path changes development time, cost, and valuation."]
    ],
    callout: "This is not leniency. It is matching evidence standards to rare-disease reality."
  },
  {
    file: "figure-04",
    kicker: "FIGURE 04",
    title: "REGENXBIO Navsunli",
    subtitle: "A rare-disease review case that acts like a barometer for regulatory tone.",
    chips: ["Hunter Syndrome", "No New Trial", "Resubmit BLA", "Review Signal"],
    panels: [
      ["Old concern", "More data requests made the asset look blocked."],
      ["New signal", "The FDA supported resubmission without another trial."],
      ["Sector read", "Repeated cases can reprice rare-disease and gene-therapy assets."]
    ],
    callout: "When review paths become clearer, catalysts become investable again."
  }
];

function htmlFor(card) {
  const panelClass = card.panels.length === 2 ? "two" : "three";
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
      linear-gradient(90deg, rgba(255,255,255,.97) 0%, rgba(255,255,255,.91) 46%, rgba(255,255,255,.58) 72%, rgba(255,255,255,.25) 100%),
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
  .kicker {
    color: #d87325;
    font-size: 30px;
    font-weight: 800;
    letter-spacing: .18em;
    text-transform: uppercase;
    margin-bottom: 22px;
  }
  h1 {
    max-width: 990px;
    margin: 0;
    font-size: ${card.file === "cover" ? 86 : 72}px;
    line-height: 1.04;
    letter-spacing: 0;
    color: #111820;
  }
  .subtitle {
    max-width: 1050px;
    margin-top: 26px;
    font-size: 32px;
    line-height: 1.32;
    color: #5f7078;
    font-weight: 650;
  }
  .chips {
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
    margin-top: 34px;
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
    margin-top: 54px;
  }
  .panel {
    min-height: ${card.panels.length === 2 ? "156px" : "178px"};
    padding: 26px 30px;
    border-radius: 28px;
    border: 2px solid rgba(24, 92, 112, .18);
    background: rgba(255, 255, 255, .86);
    box-shadow: 0 20px 46px rgba(18, 70, 83, .08);
  }
  .panel b {
    display: block;
    color: #102f3a;
    font-size: 31px;
    line-height: 1.1;
    margin-bottom: 15px;
  }
  .panel span {
    display: block;
    color: #5d6e75;
    font-size: 24px;
    line-height: 1.22;
    font-weight: 650;
  }
  .callout {
    position: absolute;
    left: 82px;
    bottom: 64px;
    width: 1120px;
    padding: 22px 30px;
    border-radius: 24px;
    color: #102f3a;
    background: rgba(239, 250, 249, .94);
    border: 4px solid #108a95;
    font-size: 27px;
    line-height: 1.22;
    font-weight: 850;
    white-space: normal;
  }
  .accent {
    position: absolute;
    right: 82px;
    bottom: 66px;
    width: 210px;
    height: 210px;
    border-radius: 50%;
    border: 18px solid rgba(16, 138, 149, .18);
  }
  .accent::before {
    content: "";
    position: absolute;
    inset: 33px;
    border-radius: 50%;
    border: 14px solid rgba(216, 115, 37, .22);
  }
</style>
</head>
<body>
  <main class="canvas">
    <div class="frame"></div>
    <div class="kicker">${card.kicker}</div>
    <h1>${card.title}</h1>
    <div class="subtitle">${card.subtitle}</div>
    <div class="chips">${card.chips.map((chip) => `<span class="chip">${chip}</span>`).join("")}</div>
    <section class="panels ${panelClass}">
      ${card.panels.map(([title, body]) => `<article class="panel"><b>${title}</b><span>${body}</span></article>`).join("")}
    </section>
    <div class="callout">${card.callout}</div>
    <div class="accent"></div>
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

console.log(`Rendered ${cards.length} GPT-background English PNG assets for ${slug}.`);
