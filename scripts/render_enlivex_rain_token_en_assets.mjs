import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const backgroundSource = process.argv[2];

if (!backgroundSource || !fs.existsSync(backgroundSource)) {
  throw new Error("Usage: node scripts/render_enlivex_rain_token_en_assets.mjs /path/to/gpt-background.png");
}

const slug = "enlivex-rain-token-biotech-treasury-en";
const contentDir = path.join(repoRoot, "content", "published", slug, "images");
const assetDir = path.join(repoRoot, "assets", "articles", slug);
const tempDir = path.join("/private/tmp", "drugnews-enlivex-rain-token-en-assets");
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

fs.mkdirSync(contentDir, { recursive: true });
fs.mkdirSync(assetDir, { recursive: true });
fs.mkdirSync(tempDir, { recursive: true });

const backgroundWorkspace = path.join(assetDir, "gpt-biotech-treasury-background.png");
fs.copyFileSync(backgroundSource, backgroundWorkspace);

const cards = [
  {
    file: "cover",
    kicker: "DRUGNEWS ENGLISH",
    title: "When Biotech Meets Treasury Strategy",
    subtitle: "Enlivex's RAIN token gain is a balance-sheet story, not proof of pipeline value.",
    chips: ["RAIN token", "Treasury", "Runway", "Clinical value"],
    panels: [
      ["Paper gain", "A large mark-to-market number can reshape market attention."],
      ["Operating reality", "Biotech value still depends on clinical, regulatory, and commercial execution."],
      ["Investor read", "Separate financing optics from durable drug-development progress."]
    ],
    callout: "A stronger balance sheet can buy time. It cannot replace clinical evidence."
  },
  {
    file: "figure-01",
    kicker: "FIGURE 01",
    title: "Biotech Treasury Shock",
    subtitle: "A token-linked paper gain can change the market narrative before product revenue appears.",
    chips: ["Accounting optics", "Liquidity", "Runway", "Investor psychology"],
    panels: [
      ["What changes", "The company may look financially stronger on paper."],
      ["What does not", "The drug pipeline is not validated by token exposure."],
      ["Key question", "Can the asset be converted into usable cash when trials need funding?"]
    ],
    callout: "Cash matters because it funds trials, not because it creates biology."
  },
  {
    file: "figure-02",
    kicker: "FIGURE 02",
    title: "Why the Story Matters",
    subtitle: "Difficult financing markets push small biotechs to search for unusual value sources.",
    chips: ["Financing market", "Alternative capital", "Volatility", "Governance"],
    panels: [
      ["Normal tools", "Partnerships, debt, royalties, asset sales, or equity financing."],
      ["Unusual tools", "Treasury-linked instruments can attract attention but add volatility."],
      ["Governance risk", "Investors need rules for custody, liquidity, and capital allocation."]
    ],
    callout: "A creative treasury story can extend runway, but it also changes the risk profile."
  },
  {
    file: "figure-03",
    kicker: "FIGURE 03",
    title: "The Real Test",
    subtitle: "The long-term question is whether Enlivex can turn science into clinical and commercial value.",
    chips: ["Clinical data", "Regulatory path", "Partnerships", "Products"],
    panels: [
      ["Short-term signal", "Treasury gains can buy time and visibility."],
      ["Long-term value", "Durable value comes from evidence, approvals, and marketable products."],
      ["Investor discipline", "Ask whether the market is pricing a pipeline or a financial instrument."]
    ],
    callout: "Do not confuse a spectacular balance-sheet number with product-market proof."
  }
];

function htmlFor(card) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0;width:1600px;height:900px;overflow:hidden}
body{font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#102f3a;background:#fbfdfd}
.canvas{position:relative;width:1600px;height:900px;padding:72px 82px;background-image:radial-gradient(circle at 72% 23%,rgba(216,115,37,.09),transparent 22%),radial-gradient(circle at 18% 44%,rgba(18,138,149,.15),transparent 28%),linear-gradient(90deg,rgba(255,255,255,.985) 0%,rgba(255,255,255,.955) 51%,rgba(255,255,255,.76) 79%,rgba(255,255,255,.42) 100%),url("${backgroundWorkspace}");background-size:cover;background-position:center}
.frame{position:absolute;inset:34px;border:2px solid rgba(24,92,112,.18);border-radius:34px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.86)}
.chart{position:absolute;right:104px;top:146px;width:430px;height:330px;opacity:.9}
.chart:before{content:"";position:absolute;left:18px;right:20px;bottom:70px;height:12px;border-radius:999px;background:linear-gradient(90deg,rgba(18,138,149,.22),rgba(216,115,37,.55),rgba(18,138,149,.28));transform:rotate(-12deg)}
.coin{position:absolute;border-radius:50%;background:rgba(255,255,255,.84);border:5px solid rgba(18,138,149,.58);box-shadow:0 18px 36px rgba(18,70,83,.10)}
.coin.a{right:350px;top:250px;width:86px;height:86px}.coin.b{right:210px;top:148px;width:104px;height:104px;border-color:rgba(216,115,37,.62)}.coin.c{right:84px;top:292px;width:92px;height:92px}
.kicker{color:#d87325;font-size:30px;font-weight:850;letter-spacing:.18em;text-transform:uppercase;margin-bottom:22px}
h1{max-width:1080px;margin:0;font-size:64px;line-height:1.04;letter-spacing:0;color:#111820}
.cover h1{font-size:70px}
.subtitle{max-width:1080px;margin-top:24px;font-size:31px;line-height:1.32;color:#5f7078;font-weight:650}
.chips{display:flex;gap:14px;flex-wrap:wrap;margin-top:32px;max-width:1140px}
.chip{border:2px solid rgba(19,139,151,.25);background:rgba(236,249,249,.94);color:#126a79;border-radius:999px;padding:12px 22px;font-size:23px;font-weight:820}
.panels{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:26px;max-width:1310px;margin-top:48px}
.panel{min-height:184px;padding:26px 30px;border-radius:28px;border:2px solid rgba(24,92,112,.18);background:rgba(255,255,255,.90);box-shadow:0 20px 46px rgba(18,70,83,.08)}
.panel b{display:block;color:#102f3a;font-size:30px;line-height:1.08;margin-bottom:15px}
.panel span{display:block;color:#5f7078;font-size:22px;line-height:1.25;font-weight:680}
.callout{position:absolute;left:82px;right:150px;bottom:72px;padding:24px 34px;border-radius:999px;border:4px solid #128a95;background:rgba(236,249,249,.92);color:#102f3a;font-size:30px;line-height:1.18;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
</style></head><body><div class="canvas ${card.file === "cover" ? "cover" : ""}">
<div class="frame"></div><div class="chart"></div><div class="coin a"></div><div class="coin b"></div><div class="coin c"></div>
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
