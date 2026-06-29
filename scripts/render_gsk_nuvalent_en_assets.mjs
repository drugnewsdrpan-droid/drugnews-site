import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const backgroundSource = process.argv[2];

if (!backgroundSource || !fs.existsSync(backgroundSource)) {
  throw new Error("Usage: node scripts/render_gsk_nuvalent_en_assets.mjs /path/to/gpt-background.png");
}

const slug = "gsk-nuvalent-lung-cancer-resistance-brain-metastasis-en";
const contentDir = path.join(repoRoot, "content", "published", slug, "images");
const assetDir = path.join(repoRoot, "assets", "articles", slug);
const tempDir = path.join("/private/tmp", "drugnews-gsk-nuvalent-en-assets");
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

fs.mkdirSync(contentDir, { recursive: true });
fs.mkdirSync(assetDir, { recursive: true });
fs.mkdirSync(tempDir, { recursive: true });

const backgroundWorkspace = path.join(assetDir, "gpt-precision-oncology-background.png");
fs.copyFileSync(backgroundSource, backgroundWorkspace);

const cards = [
  {
    file: "cover",
    kicker: "DRUGNEWS ENGLISH",
    title: "GSK's Nuvalent Bet",
    subtitle: "The US$10.6B deal is really about resistance, brain metastases, and next-generation precision oncology.",
    chips: ["GSK", "Nuvalent", "Lung cancer", "Resistance", "CNS activity"],
    panels: [
      ["Surface story", "A large acquisition of lung-cancer pipeline assets."],
      ["Real thesis", "Cleaner kinase inhibition plus resistance and brain-activity coverage."],
      ["Investor read", "BD value is created by solving the second problem, not the first."]
    ],
    callout: "GSK is buying a precision-oncology position, not just a set of molecules."
  },
  {
    file: "figure-01",
    kicker: "FIGURE 01",
    title: "What GSK Bought",
    subtitle: "Modern targeted therapy is judged by what happens after the first response.",
    chips: ["Driver mutation", "Resistance", "Brain metastases", "Sequencing"],
    panels: [
      ["Primary driver", "Targeted therapy first reshaped molecular lung-cancer markets."],
      ["Next problem", "Resistance mutations and CNS disease define the harder commercial test."],
      ["Asset logic", "Nuvalent's appeal is coverage, selectivity, and fit inside treatment sequence."]
    ],
    callout: "The next generation is not newer on a slide. It solves what current drugs leave behind."
  },
  {
    file: "figure-02",
    kicker: "FIGURE 02",
    title: "Precision Oncology Moat",
    subtitle: "The strongest assets can defend value inside narrow but high-need molecular segments.",
    chips: ["Best-in-class", "Tolerability", "CNS penetration", "Chronic use"],
    panels: [
      ["Clinical moat", "Work after resistance and maintain activity in the brain."],
      ["Commercial moat", "Earn a place in crowded sequencing decisions."],
      ["Portfolio moat", "Give GSK a clearer oncology lane after mixed historical positioning."]
    ],
    callout: "In precision oncology, the narrowest segments can still carry large strategic value."
  },
  {
    file: "figure-03",
    kicker: "FIGURE 03",
    title: "The BD Logic",
    subtitle: "Big Pharma pays when an asset can become a durable franchise, not just a clinical headline.",
    chips: ["BD", "Franchise", "Differentiation", "Treatment sequence"],
    panels: [
      ["Why pay", "Defined molecular markets can support high value if differentiation is real."],
      ["What matters", "Resistance, CNS activity, tolerability, and fit with existing options."],
      ["Investor discipline", "Ask whether the asset changes treatment sequencing in practice."]
    ],
    callout: "The deal price reflects a bet on a more advanced precision-oncology thesis."
  }
];

function htmlFor(card) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0;width:1600px;height:900px;overflow:hidden}
body{font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#102f3a;background:#fbfdfd}
.canvas{position:relative;width:1600px;height:900px;padding:72px 82px;background-image:radial-gradient(circle at 73% 23%,rgba(216,115,37,.09),transparent 22%),radial-gradient(circle at 18% 44%,rgba(18,138,149,.15),transparent 28%),linear-gradient(90deg,rgba(255,255,255,.985) 0%,rgba(255,255,255,.955) 51%,rgba(255,255,255,.74) 79%,rgba(255,255,255,.42) 100%),url("${backgroundWorkspace}");background-size:cover;background-position:center}
.frame{position:absolute;inset:34px;border:2px solid rgba(24,92,112,.18);border-radius:34px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.86)}
.pathway{position:absolute;right:92px;top:128px;width:452px;height:392px;opacity:.92}
.pathway:before{content:"";position:absolute;left:34px;right:16px;top:190px;height:12px;border-radius:999px;background:linear-gradient(90deg,rgba(18,138,149,.18),rgba(18,138,149,.42),rgba(216,115,37,.52));transform:rotate(-18deg)}
.ring{position:absolute;border-radius:50%;background:rgba(255,255,255,.84);border:5px solid rgba(18,138,149,.58);box-shadow:0 18px 36px rgba(18,70,83,.10)}
.ring.a{right:348px;top:252px;width:86px;height:86px}.ring.b{right:202px;top:144px;width:104px;height:104px;border-color:rgba(216,115,37,.62)}.ring.c{right:64px;top:296px;width:92px;height:92px}
.kicker{color:#d87325;font-size:30px;font-weight:850;letter-spacing:.18em;text-transform:uppercase;margin-bottom:22px}
h1{max-width:1080px;margin:0;font-size:64px;line-height:1.04;letter-spacing:0;color:#111820}.cover h1{font-size:72px}
.subtitle{max-width:1080px;margin-top:24px;font-size:31px;line-height:1.32;color:#5f7078;font-weight:650}
.chips{display:flex;gap:14px;flex-wrap:wrap;margin-top:32px;max-width:1140px}
.chip{border:2px solid rgba(19,139,151,.25);background:rgba(236,249,249,.94);color:#126a79;border-radius:999px;padding:12px 22px;font-size:23px;font-weight:820}
.panels{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:26px;max-width:1310px;margin-top:48px}
.panel{min-height:184px;padding:26px 30px;border-radius:28px;border:2px solid rgba(24,92,112,.18);background:rgba(255,255,255,.90);box-shadow:0 20px 46px rgba(18,70,83,.08)}
.panel b{display:block;color:#102f3a;font-size:30px;line-height:1.08;margin-bottom:15px}
.panel span{display:block;color:#5f7078;font-size:22px;line-height:1.25;font-weight:680}
.callout{position:absolute;left:82px;right:150px;bottom:72px;padding:24px 34px;border-radius:999px;border:4px solid #128a95;background:rgba(236,249,249,.92);color:#102f3a;font-size:30px;line-height:1.18;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
</style></head><body><div class="canvas ${card.file === "cover" ? "cover" : ""}">
<div class="frame"></div><div class="pathway"></div><div class="ring a"></div><div class="ring b"></div><div class="ring c"></div>
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
