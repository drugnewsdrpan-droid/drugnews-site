import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const backgroundSource = process.argv[2];

if (!backgroundSource || !fs.existsSync(backgroundSource)) {
  throw new Error("Usage: node scripts/render_ecnoglutide_wegovy_en_assets.mjs /path/to/gpt-background.png");
}

const slug = "glp1-head-to-head-ecnoglutide-wegovy-en";
const contentDir = path.join(repoRoot, "content", "published", slug, "images");
const assetDir = path.join(repoRoot, "assets", "articles", slug);
const tempDir = path.join("/private/tmp", "drugnews-ecnoglutide-wegovy-en-assets");
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

fs.mkdirSync(contentDir, { recursive: true });
fs.mkdirSync(assetDir, { recursive: true });
fs.mkdirSync(tempDir, { recursive: true });

const backgroundWorkspace = path.join(assetDir, "gpt-glp1-head-to-head-background.png");
fs.copyFileSync(backgroundSource, backgroundWorkspace);

const cards = [
  {
    file: "cover",
    kicker: "DRUGNEWS ENGLISH",
    title: "A Strong Signal Is Not a New King",
    subtitle: "Ecnoglutide beat Wegovy at 20 weeks, but the GLP-1 race is decided by much more than one interim readout.",
    chips: ["Ecnoglutide", "Wegovy", "Phase 2", "GLP-1"],
    panels: [
      ["The headline", "12.8% weight loss versus 9.5% for semaglutide at 20 weeks."],
      ["The caution", "Open-label, interim Phase 2 data are not a final commercial verdict."],
      ["Investor read", "The next GLP-1 winner must prove durability, safety, labels, and access."]
    ],
    callout: "A better early curve can open the conversation. It does not rewrite the ending."
  },
  {
    file: "figure-01",
    kicker: "FIGURE 01",
    title: "Head-to-head Signal",
    subtitle: "The result is meaningful, but trial design determines how much confidence investors should assign.",
    chips: ["20 weeks", "Open-label", "163 patients", "Interim analysis"],
    panels: [
      ["What looks good", "Ecnoglutide showed stronger average weight loss in the interim dataset."],
      ["What limits it", "Open-label design can affect behavior, adherence, and reporting."],
      ["What comes next", "Larger and longer Phase 3 trials are needed before the market changes its hierarchy."]
    ],
    callout: "Treat the signal seriously, but do not confuse it with a definitive label-changing dataset."
  },
  {
    file: "figure-02",
    kicker: "FIGURE 02",
    title: "What Really Matters",
    subtitle: "The obesity-drug market is moving beyond a single weight-loss percentage.",
    chips: ["Durability", "Lean mass", "CV outcomes", "Adherence"],
    panels: [
      ["Beyond weight", "Can the effect last after longer treatment and discontinuation?"],
      ["Beyond efficacy", "What happens to tolerability, lean mass, liver disease, sleep apnea, and CV risk?"],
      ["Beyond trial data", "Can physicians, payers, and patients support long-term use?"]
    ],
    callout: "The next market phase rewards complete evidence, not just the fastest early curve."
  },
  {
    file: "figure-03",
    kicker: "FIGURE 03",
    title: "Wegovy's Moat Is an Evidence Network",
    subtitle: "Novo's advantage is not only semaglutide. It is the system around semaglutide.",
    chips: ["Labels", "Supply", "Real-world use", "Physician trust"],
    panels: [
      ["Evidence", "Cardiovascular-risk reduction and broader clinical experience reinforce the franchise."],
      ["Infrastructure", "Global supply, regulatory labels, and physician familiarity matter commercially."],
      ["Strategic question", "Can ecnoglutide build enough proof to challenge the network, not only the molecule?"]
    ],
    callout: "To beat Wegovy, a challenger must beat more than Wegovy's weight-loss number."
  }
];

function htmlFor(card) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0;width:1600px;height:900px;overflow:hidden}
body{font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#102f3a;background:#fbfdfd}
.canvas{position:relative;width:1600px;height:900px;padding:72px 82px;background-image:radial-gradient(circle at 72% 23%,rgba(216,115,37,.09),transparent 22%),radial-gradient(circle at 18% 44%,rgba(18,138,149,.15),transparent 28%),linear-gradient(90deg,rgba(255,255,255,.985) 0%,rgba(255,255,255,.955) 51%,rgba(255,255,255,.76) 79%,rgba(255,255,255,.42) 100%),url("${backgroundWorkspace}");background-size:cover;background-position:center}
.frame{position:absolute;inset:34px;border:2px solid rgba(24,92,112,.18);border-radius:34px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.86)}
.curve{position:absolute;right:94px;top:130px;width:456px;height:382px;opacity:.92}
.curve:before{content:"";position:absolute;left:18px;right:18px;bottom:104px;height:12px;border-radius:999px;background:linear-gradient(90deg,rgba(18,138,149,.22),rgba(216,115,37,.42),rgba(18,138,149,.24));transform:rotate(-20deg)}
.curve:after{content:"";position:absolute;left:70px;right:32px;top:118px;height:10px;border-radius:999px;background:rgba(18,138,149,.28);transform:rotate(19deg)}
.node{position:absolute;border-radius:50%;background:rgba(255,255,255,.84);border:5px solid rgba(18,138,149,.58);box-shadow:0 18px 36px rgba(18,70,83,.10)}
.node.a{right:344px;top:252px;width:86px;height:86px}.node.b{right:204px;top:142px;width:104px;height:104px;border-color:rgba(216,115,37,.62)}.node.c{right:68px;top:294px;width:92px;height:92px}
.kicker{color:#d87325;font-size:30px;font-weight:850;letter-spacing:.18em;text-transform:uppercase;margin-bottom:22px}
h1{max-width:1090px;margin:0;font-size:64px;line-height:1.04;letter-spacing:0;color:#111820}.cover h1{font-size:70px}
.subtitle{max-width:1080px;margin-top:24px;font-size:31px;line-height:1.32;color:#5f7078;font-weight:650}
.chips{display:flex;gap:14px;flex-wrap:wrap;margin-top:32px;max-width:1140px}
.chip{border:2px solid rgba(19,139,151,.25);background:rgba(236,249,249,.94);color:#126a79;border-radius:999px;padding:12px 22px;font-size:23px;font-weight:820}
.panels{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:26px;max-width:1310px;margin-top:48px}
.panel{min-height:184px;padding:26px 30px;border-radius:28px;border:2px solid rgba(24,92,112,.18);background:rgba(255,255,255,.90);box-shadow:0 20px 46px rgba(18,70,83,.08)}
.panel b{display:block;color:#102f3a;font-size:30px;line-height:1.08;margin-bottom:15px}
.panel span{display:block;color:#5f7078;font-size:22px;line-height:1.25;font-weight:680}
.callout{position:absolute;left:82px;right:150px;bottom:72px;padding:24px 34px;border-radius:999px;border:4px solid #128a95;background:rgba(236,249,249,.92);color:#102f3a;font-size:30px;line-height:1.18;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
</style></head><body><div class="canvas ${card.file === "cover" ? "cover" : ""}">
<div class="frame"></div><div class="curve"></div><div class="node a"></div><div class="node b"></div><div class="node c"></div>
<div class="kicker">${card.kicker}</div><h1>${card.title}</h1><div class="subtitle">${card.subtitle}</div>
<div class="chips">${card.chips.map((chip) => `<span class="chip">${chip}</span>`).join("")}</div>
<div class="panels">${card.panels.map(([title, text]) => `<div class="panel"><b>${title}</b><span>${text}</span></div>`).join("")}</div>
<div class="callout">${card.callout}</div></div></body></html>`;
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
  if (result.status !== 0) throw new Error(`Chrome failed for ${card.file}`);
  fs.copyFileSync(pngPath, path.join(contentDir, `${card.file}.png`));
  fs.copyFileSync(pngPath, path.join(assetDir, `${card.file}.png`));
}

console.log(`Rendered ${cards.length} GPT-background English PNG cards for ${slug}.`);
