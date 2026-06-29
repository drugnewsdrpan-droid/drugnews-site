import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const backgroundSource = process.argv[2];

if (!backgroundSource || !fs.existsSync(backgroundSource)) {
  throw new Error("Usage: node scripts/render_lilly_vaccine_en_assets.mjs /path/to/gpt-background.png");
}

const slug = "lilly-vaccine-acquisitions-prevention-medicine-en";
const contentDir = path.join(repoRoot, "content", "published", slug, "images");
const assetDir = path.join(repoRoot, "assets", "articles", slug);
const tempDir = path.join("/private/tmp", "drugnews-lilly-vaccine-en-assets");
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

fs.mkdirSync(contentDir, { recursive: true });
fs.mkdirSync(assetDir, { recursive: true });
fs.mkdirSync(tempDir, { recursive: true });

const backgroundWorkspace = path.join(assetDir, "gpt-lilly-vaccine-background.png");
fs.copyFileSync(backgroundSource, backgroundWorkspace);

const cards = [
  {
    file: "cover",
    kicker: "DRUGNEWS ENGLISH",
    title: "Why Lilly Is Buying Prevention",
    subtitle: "The obesity-drug cash-flow cycle is giving Lilly room to buy vaccine optionality before the next decade of pharma competition arrives.",
    chips: ["Eli Lilly", "Vaccines", "US$3.8B", "Prevention"],
    panels: [
      ["Cash-flow engine", "Mounjaro and Zepbound create strategic firepower."],
      ["Portfolio logic", "Vaccines diversify Lilly beyond one dominant growth engine."],
      ["Investor read", "The question is how current obesity strength becomes future resilience."]
    ],
    callout: "The move is not a retreat from obesity. It is capital allocation from strength."
  },
  {
    file: "figure-01",
    kicker: "FIGURE 01",
    title: "Beyond Obesity",
    subtitle: "The market knows Lilly as a GLP-1 leader. The strategic question is what the company builds next.",
    chips: ["GLP-1 profits", "M&A optionality", "Long-term growth"],
    panels: [
      ["Today's engine", "Metabolic medicine is driving exceptional revenue growth."],
      ["Tomorrow's risk", "Obesity will become more crowded, price-sensitive, and competitive."],
      ["Strategic move", "Use the current profit cycle to buy platforms before the market forces a pivot."]
    ],
    callout: "Great franchises create cash. Great companies decide where that cash compounds."
  },
  {
    file: "figure-02",
    kicker: "FIGURE 02",
    title: "Why Vaccines?",
    subtitle: "Prevention medicine offers a different kind of pharma durability from chronic obesity treatment.",
    chips: ["Population scale", "Public health", "Manufacturing", "Durability"],
    panels: [
      ["Different revenue logic", "Vaccines can build population-scale franchises and public-health relevance."],
      ["Different capability", "Manufacturing, supply, and immunology know-how become strategic assets."],
      ["Different optionality", "A vaccine platform can open multiple disease-area paths over time."]
    ],
    callout: "Prevention is not a side bet when science, demand, and infrastructure align."
  },
  {
    file: "figure-03",
    kicker: "FIGURE 03",
    title: "Capital Allocation Lesson",
    subtitle: "For investors, the deeper point is how cash flow changes strategic behavior.",
    chips: ["M&A", "Platform knowledge", "Disease optionality", "Resilience"],
    panels: [
      ["Before dominance", "Companies must protect cash and concentrate on fewer shots."],
      ["After dominance", "A powerful franchise lets management buy earlier and broader."],
      ["Lilly's test", "Can the GLP-1 winner become a broader healthcare empire?"]
    ],
    callout: "The test: can one huge cycle become many durable franchises?"
  }
];

function htmlFor(card) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0;width:1600px;height:900px;overflow:hidden}
body{font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#102f3a;background:#fbfdfd}
.canvas{position:relative;width:1600px;height:900px;padding:72px 82px;background-image:linear-gradient(90deg,#fbfdfd 0%,#fbfdfd 58%,rgba(255,255,255,.88) 70%,rgba(255,255,255,.38) 100%),url("${backgroundWorkspace}");background-size:cover;background-position:center}
.frame{position:absolute;inset:34px;border:2px solid rgba(24,92,112,.18);border-radius:34px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.86)}
.arc{position:absolute;right:104px;top:132px;width:460px;height:500px;opacity:.95}
.arc:before{content:"";position:absolute;left:14px;right:18px;top:188px;height:12px;border-radius:999px;background:linear-gradient(90deg,rgba(18,138,149,.30),rgba(216,115,37,.58));transform:rotate(-22deg);box-shadow:0 18px 42px rgba(18,138,149,.12)}
.arc:after{content:"";position:absolute;right:36px;top:96px;width:16px;height:278px;border-radius:999px;background:#d87325;transform:rotate(-28deg)}
.node{position:absolute;border-radius:50%;background:rgba(255,255,255,.87);border:5px solid rgba(18,138,149,.58);box-shadow:0 18px 36px rgba(18,70,83,.10)}
.node.a{right:356px;top:324px;width:92px;height:92px}.node.b{right:230px;top:206px;width:108px;height:108px;border-color:rgba(216,115,37,.62)}.node.c{right:96px;top:362px;width:98px;height:98px}
.vial{position:absolute;right:190px;bottom:86px;width:118px;height:202px;border-radius:26px 26px 16px 16px;border:4px solid rgba(18,138,149,.32);background:linear-gradient(180deg,rgba(255,255,255,.9),rgba(185,232,235,.50));box-shadow:0 22px 46px rgba(18,70,83,.12)}
.vial:before{content:"";position:absolute;left:22px;right:22px;top:-24px;height:30px;border-radius:12px;background:#cbd6da;border:3px solid rgba(16,47,58,.16)}
.vial:after{content:"VACCINE";position:absolute;left:11px;right:11px;top:86px;padding:8px 0;border-top:3px solid #128a95;border-bottom:3px solid #128a95;text-align:center;color:#102f3a;font-size:18px;font-weight:900;letter-spacing:.07em}
.kicker{color:#d87325;font-size:30px;font-weight:850;letter-spacing:.18em;text-transform:uppercase;margin-bottom:22px}
h1{max-width:1090px;margin:0;font-size:64px;line-height:1.04;letter-spacing:0;color:#111820}.cover h1{font-size:72px}
.subtitle{max-width:1060px;margin-top:24px;font-size:31px;line-height:1.32;color:#5f7078;font-weight:650}
.chips{display:flex;gap:14px;flex-wrap:wrap;margin-top:32px;max-width:1120px}
.chip{border:2px solid rgba(19,139,151,.25);background:rgba(236,249,249,.94);color:#126a79;border-radius:999px;padding:12px 22px;font-size:23px;font-weight:820}
.panels{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:26px;max-width:1310px;margin-top:48px}
.panel{min-height:184px;padding:26px 30px;border-radius:28px;border:2px solid rgba(24,92,112,.18);background:rgba(255,255,255,.91);box-shadow:0 20px 46px rgba(18,70,83,.08)}
.panel b{display:block;color:#102f3a;font-size:30px;line-height:1.08;margin-bottom:15px}
.panel span{display:block;color:#5f7078;font-size:22px;line-height:1.25;font-weight:680}
.callout{position:absolute;left:82px;right:150px;bottom:72px;padding:24px 34px;border-radius:999px;border:4px solid #128a95;background:rgba(236,249,249,.92);color:#102f3a;font-size:30px;line-height:1.18;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
</style></head><body><div class="canvas ${card.file === "cover" ? "cover" : ""}">
<div class="frame"></div><div class="arc"></div><div class="node a"></div><div class="node b"></div><div class="node c"></div><div class="vial"></div>
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
