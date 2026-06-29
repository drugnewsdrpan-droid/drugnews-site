import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const backgroundSource = process.argv[2];

if (!backgroundSource || !fs.existsSync(backgroundSource)) {
  throw new Error("Usage: node scripts/render_revolution_medicines_en_assets.mjs /path/to/gpt-background.png");
}

const slug = "revolution-medicines-en";
const contentDir = path.join(repoRoot, "content", "published", slug, "images");
const assetDir = path.join(repoRoot, "assets", "articles", slug);
const tempDir = path.join("/private/tmp", "drugnews-revolution-medicines-en-assets");
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

fs.mkdirSync(contentDir, { recursive: true });
fs.mkdirSync(assetDir, { recursive: true });
fs.mkdirSync(tempDir, { recursive: true });

const backgroundWorkspace = path.join(assetDir, "gpt-revolution-medicines-background.png");
fs.copyFileSync(backgroundSource, backgroundWorkspace);

const cards = [
  {
    file: "cover",
    kicker: "DRUGNEWS ENGLISH",
    title: "Biotech Winners Need Capital Strategy",
    subtitle: "Revolution Medicines shows why strong science is not enough. Clinical momentum must be converted into financing runway.",
    chips: ["RAS", "Daraxonrasib", "Financing", "Pancreatic cancer"],
    panels: [
      ["Clinical catalyst", "RASolute-302 turned RAS into a survival-data story."],
      ["Capital window", "Strong data opened the door to offensive financing."],
      ["Investor lesson", "Cash is runway, and also negotiating leverage."]
    ],
    callout: "Science creates the opening. Capital creates the time to finish the race."
  },
  {
    file: "figure-01",
    kicker: "FIGURE 01",
    title: "RAS Value Creation",
    subtitle: "Daraxonrasib shifted RAS from hard-to-drug theory toward late-stage oncology franchise logic.",
    chips: ["RAS(ON)", "PDAC", "13.2 months OS", "Modality reset"],
    panels: [
      ["Hard target", "RAS was historically treated as one of oncology's most difficult drug targets."],
      ["Hard endpoint", "Overall survival in pancreatic cancer can change how a modality is valued."],
      ["Market effect", "A survival readout can reprice platform credibility, not only one product."]
    ],
    callout: "A strong clinical endpoint can turn target biology into capital-market conviction."
  },
  {
    file: "figure-02",
    kicker: "FIGURE 02",
    title: "Financing Rhythm",
    subtitle: "Revolution did not wait for a cash emergency. It financed around value inflection points.",
    chips: ["EQRx", "Equity", "Convertible notes", "Royalty Pharma"],
    panels: [
      ["Before pressure", "Raise when the market is paying for the next stage of the story."],
      ["After catalysts", "Convert share-price confidence into cash while the window is open."],
      ["Strategic result", "More runway means more options: partner, sell, or remain independent."]
    ],
    callout: "Offensive financing is different from survival financing."
  },
  {
    file: "figure-03",
    kicker: "FIGURE 03",
    title: "Science x Capital",
    subtitle: "Execution connects clinical evidence, financing capacity, and strategic control.",
    chips: ["Data", "Runway", "Global trials", "BD leverage"],
    panels: [
      ["Science", "The RAS platform creates the opportunity."],
      ["Capital", "Cash supports global trials, CMC, and commercialization preparation."],
      ["Control", "A funded company can negotiate from strength instead of urgency."]
    ],
    callout: "The best biotech stories make clinical catalysts and capital strategy reinforce each other."
  }
];

function htmlFor(card) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0;width:1600px;height:900px;overflow:hidden}
body{font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#102f3a;background:#fbfdfd}
.canvas{position:relative;width:1600px;height:900px;padding:72px 82px;background-image:linear-gradient(90deg,rgba(255,255,255,.985) 0%,rgba(255,255,255,.96) 50%,rgba(255,255,255,.72) 76%,rgba(255,255,255,.28) 100%),url("${backgroundWorkspace}");background-size:cover;background-position:center}
.frame{position:absolute;inset:34px;border:2px solid rgba(24,92,112,.18);border-radius:34px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.86)}
.market{position:absolute;right:72px;top:118px;width:514px;height:480px}
.market:before{content:"";position:absolute;left:44px;right:18px;bottom:114px;height:12px;border-radius:999px;background:linear-gradient(90deg,rgba(18,138,149,.38),rgba(216,115,37,.68));transform:rotate(-24deg);box-shadow:0 18px 44px rgba(18,70,83,.12)}
.market:after{content:"";position:absolute;right:74px;top:76px;width:18px;height:330px;border-radius:999px;background:#d87325;transform:rotate(-28deg)}
.node{position:absolute;border-radius:50%;background:rgba(255,255,255,.84);border:5px solid rgba(18,138,149,.58);box-shadow:0 18px 36px rgba(18,70,83,.10)}
.node.a{right:376px;top:326px;width:86px;height:86px}.node.b{right:248px;top:194px;width:108px;height:108px;border-color:rgba(216,115,37,.62)}.node.c{right:104px;top:356px;width:96px;height:96px}
.bars{position:absolute;right:124px;bottom:98px;width:250px;height:168px;display:flex;align-items:flex-end;gap:18px;opacity:.88}
.bar{width:34px;border-radius:10px 10px 0 0;background:linear-gradient(180deg,#56c3cb,#0d7786)}
.bar:nth-child(1){height:58px}.bar:nth-child(2){height:84px}.bar:nth-child(3){height:118px}.bar:nth-child(4){height:154px;background:linear-gradient(180deg,#f0a25e,#d87325)}
.kicker{color:#d87325;font-size:30px;font-weight:850;letter-spacing:.18em;text-transform:uppercase;margin-bottom:22px}
h1{max-width:1090px;margin:0;font-size:64px;line-height:1.04;letter-spacing:0;color:#111820}.cover h1{font-size:70px}
.subtitle{max-width:1060px;margin-top:24px;font-size:31px;line-height:1.32;color:#5f7078;font-weight:650}
.chips{display:flex;gap:14px;flex-wrap:wrap;margin-top:32px;max-width:1120px}
.chip{border:2px solid rgba(19,139,151,.25);background:rgba(236,249,249,.94);color:#126a79;border-radius:999px;padding:12px 22px;font-size:23px;font-weight:820}
.panels{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:26px;max-width:1310px;margin-top:48px}
.panel{min-height:184px;padding:26px 30px;border-radius:28px;border:2px solid rgba(24,92,112,.18);background:rgba(255,255,255,.91);box-shadow:0 20px 46px rgba(18,70,83,.08)}
.panel b{display:block;color:#102f3a;font-size:30px;line-height:1.08;margin-bottom:15px}
.panel span{display:block;color:#5f7078;font-size:22px;line-height:1.25;font-weight:680}
.callout{position:absolute;left:82px;right:150px;bottom:72px;padding:24px 34px;border-radius:999px;border:4px solid #128a95;background:rgba(236,249,249,.92);color:#102f3a;font-size:29px;line-height:1.18;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
</style></head><body><div class="canvas ${card.file === "cover" ? "cover" : ""}">
<div class="frame"></div><div class="market"></div><div class="node a"></div><div class="node b"></div><div class="node c"></div><div class="bars"><i class="bar"></i><i class="bar"></i><i class="bar"></i><i class="bar"></i></div>
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
