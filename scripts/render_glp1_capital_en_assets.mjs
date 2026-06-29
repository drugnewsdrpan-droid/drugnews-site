import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const backgroundSource = process.argv[2];

if (!backgroundSource || !fs.existsSync(backgroundSource)) {
  throw new Error("Usage: node scripts/render_glp1_capital_en_assets.mjs /path/to/gpt-background.png");
}

const slug = "glp1-biotech-capital-reshuffle-en";
const contentDir = path.join(repoRoot, "content", "published", slug, "images");
const assetDir = path.join(repoRoot, "assets", "articles", slug);
const tempDir = path.join("/private/tmp", "drugnews-glp1-capital-en-assets");
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

fs.mkdirSync(contentDir, { recursive: true });
fs.mkdirSync(assetDir, { recursive: true });
fs.mkdirSync(tempDir, { recursive: true });

const backgroundWorkspace = path.join(assetDir, "gpt-glp1-capital-background.png");
fs.copyFileSync(backgroundSource, backgroundWorkspace);

const cards = [
  {
    file: "cover",
    kicker: "DRUGNEWS ENGLISH",
    title: "GLP-1 Is Repricing Biotech Capital",
    subtitle: "Obesity medicine is no longer a narrow weight-loss story; it is redirecting R&D budgets, BD urgency, manufacturing investment, and valuation imagination.",
    chips: ["GLP-1", "Obesity", "Capital markets", "BD"],
    panels: [
      ["Capital flow", "Money is moving toward larger, more certain chronic-disease platforms."],
      ["New benchmark", "Ordinary oncology assets must now prove sharper differentiation."],
      ["Investor lens", "The question is no longer only whether GLP-1 is hot, but whose capital it absorbs."]
    ],
    callout: "The GLP-1 era is rewriting how biotech assets are valued."
  },
  {
    file: "figure-01",
    kicker: "FIGURE 01",
    title: "Capital Is Moving",
    subtitle: "GLP-1 is creating a drainage effect across biotech capital allocation.",
    chips: ["Obesity value", "Late-stage returns", "Oncology pressure"],
    panels: [
      ["Before", "Cancer pipelines attracted capital because pricing, unmet need, and BD appetite were strong."],
      ["Now", "Metabolic assets pull capital because the addressable market and payer logic are clearer."],
      ["Result", "Me-too oncology pipelines face tougher valuation and financing discussions."]
    ],
    callout: "Capital has not disappeared. It is becoming more selective."
  },
  {
    file: "figure-02",
    kicker: "FIGURE 02",
    title: "From Drug to Ecosystem",
    subtitle: "GLP-1 is expanding from obesity into cardiovascular, sleep apnea, liver, kidney, and chronic-care economics.",
    chips: ["Cardiometabolic", "OSA", "MASH/NASH", "Chronic care"],
    panels: [
      ["More than weight loss", "Semaglutide and tirzepatide are shifting from body-weight drugs toward risk-management platforms."],
      ["System effect", "A broad chronic-disease platform can reshape medical spending, not only one drug class."],
      ["Strategic test", "Adjacent assets must explain whether they complement GLP-1 or are replaced by it."]
    ],
    callout: "The strongest GLP-1 stories behave like healthcare infrastructure."
  },
  {
    file: "figure-03",
    kicker: "FIGURE 03",
    title: "BD Repricing",
    subtitle: "Big Pharma is moving from buying stories toward buying capacity, platforms, and certainty.",
    chips: ["Licensing", "Manufacturing", "Supply chain", "Certainty"],
    panels: [
      ["Old logic", "Early oncology stories could win optionality capital if the target looked promising."],
      ["New logic", "BD teams compare every asset against GLP-1 capacity, platform depth, and revenue-gap urgency."],
      ["Market impact", "Differentiated oncology still matters. Ordinary pipelines get discounted first."]
    ],
    callout: "In this cycle, capital rewards assets that can survive tougher strategic comparison."
  },
  {
    file: "figure-04",
    kicker: "FIGURE 04",
    title: "Investor Question",
    subtitle: "The real question is what value remains after GLP-1 pulls capital, attention, and manufacturing resources away.",
    chips: ["Complement", "Supply chain", "Differentiation", "Platform fit"],
    panels: [
      ["Next to GLP-1", "Opportunities may emerge in body-shaping, maintenance, CDMO, peptide supply, and complementary care."],
      ["Not enough", "A company cannot rely on a theme label. It must show its position in the new value chain."],
      ["What to ask", "Does this asset become more useful in the GLP-1 era, or less visible because of it?"]
    ],
    callout: "Investors should follow the capital displacement, not only the headline theme."
  }
];

function htmlFor(card) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0;width:1600px;height:900px;overflow:hidden}
body{font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#0d2e38;background:#061923}
.canvas{position:relative;width:1600px;height:900px;padding:70px 82px;background-image:linear-gradient(90deg,rgba(5,22,31,.94) 0%,rgba(7,32,42,.88) 42%,rgba(7,32,42,.56) 68%,rgba(7,32,42,.18) 100%),url("${backgroundWorkspace}");background-size:cover;background-position:center}
.frame{position:absolute;inset:34px;border:2px solid rgba(151,230,231,.38);border-radius:34px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.18),0 22px 70px rgba(0,0,0,.18)}
.orb{position:absolute;right:92px;top:98px;width:470px;height:470px;border-radius:50%;border:3px solid rgba(102,217,220,.36);background:radial-gradient(circle at 35% 35%,rgba(236,255,255,.24),rgba(21,153,162,.10) 42%,rgba(0,0,0,0) 70%)}
.flow{position:absolute;right:142px;top:308px;width:520px;height:14px;border-radius:999px;background:linear-gradient(90deg,rgba(97,222,228,.2),rgba(97,222,228,.95),rgba(223,123,40,.88));transform:rotate(-22deg);box-shadow:0 0 36px rgba(97,222,228,.24)}
.flow:after{content:"";position:absolute;right:-7px;top:-18px;border-left:46px solid rgba(97,222,228,.9);border-top:25px solid transparent;border-bottom:25px solid transparent}
.bars{position:absolute;right:112px;bottom:118px;width:310px;height:210px;display:flex;align-items:flex-end;gap:20px;opacity:.95}
.bar{width:42px;border-radius:12px 12px 0 0;background:linear-gradient(180deg,#70e0df,#0b8992);box-shadow:0 12px 28px rgba(0,0,0,.24)}
.bar:nth-child(1){height:76px}.bar:nth-child(2){height:108px}.bar:nth-child(3){height:142px}.bar:nth-child(4){height:184px;background:linear-gradient(180deg,#f5b36b,#dd772a)}
.kicker{position:relative;color:#f0a05a;font-size:30px;font-weight:850;letter-spacing:.18em;text-transform:uppercase;margin-bottom:22px}
h1{position:relative;max-width:1060px;margin:0;font-size:64px;line-height:1.04;letter-spacing:0;color:#f7fbfb}.cover h1{font-size:70px}
.subtitle{position:relative;max-width:1030px;margin-top:24px;font-size:30px;line-height:1.34;color:#c5d6dc;font-weight:650}
.chips{position:relative;display:flex;gap:14px;flex-wrap:wrap;margin-top:30px;max-width:1120px}
.chip{border:2px solid rgba(91,222,226,.34);background:rgba(7,74,84,.72);color:#dffafb;border-radius:999px;padding:12px 22px;font-size:23px;font-weight:820}
.panels{position:relative;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;max-width:1280px;margin-top:46px}
.panel{min-height:194px;padding:26px 30px;border-radius:28px;border:2px solid rgba(132,219,222,.26);background:rgba(246,253,253,.92);box-shadow:0 24px 54px rgba(0,0,0,.18)}
.panel b{display:block;color:#102f3a;font-size:30px;line-height:1.08;margin-bottom:15px}
.panel span{display:block;color:#5d7078;font-size:22px;line-height:1.25;font-weight:690}
.callout{position:absolute;left:82px;right:150px;bottom:72px;padding:24px 34px;border-radius:999px;border:4px solid #48d8dd;background:rgba(236,250,250,.94);color:#102f3a;font-size:29px;line-height:1.18;font-weight:860;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
</style></head><body><div class="canvas ${card.file === "cover" ? "cover" : ""}">
<div class="frame"></div><div class="orb"></div><div class="flow"></div><div class="bars"><i class="bar"></i><i class="bar"></i><i class="bar"></i><i class="bar"></i></div>
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
