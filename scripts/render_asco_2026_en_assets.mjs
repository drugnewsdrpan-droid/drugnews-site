import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const backgroundSource = process.argv[2];

if (!backgroundSource || !fs.existsSync(backgroundSource)) {
  throw new Error("Usage: node scripts/render_asco_2026_en_assets.mjs /path/to/gpt-background.png");
}

const slug = "2026-asco-car-t-en";
const contentDir = path.join(repoRoot, "content", "published", slug, "images");
const assetDir = path.join(repoRoot, "assets", "articles", slug);
const tempDir = path.join("/private/tmp", "drugnews-asco-2026-en-assets");
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

fs.mkdirSync(contentDir, { recursive: true });
fs.mkdirSync(assetDir, { recursive: true });
fs.mkdirSync(tempDir, { recursive: true });

const backgroundWorkspace = path.join(assetDir, "gpt-asco-2026-background.png");
fs.copyFileSync(backgroundSource, backgroundWorkspace);

const cards = [
  {
    file: "cover",
    kicker: "DRUGNEWS ENGLISH",
    title: "ASCO 2026: Oncology Enters a Platform Cycle",
    subtitle: "RAS targeting, ADCs, PD-1/VEGF bispecifics, and in vivo CAR-T point to a market where data quality and platform execution matter more than single-mechanism hype.",
    chips: ["ASCO", "RAS", "ADCs", "In vivo CAR-T"],
    panels: [
      ["The signal", "Multiple hard oncology problems are becoming clinically testable."],
      ["Investor read", "Markets will reward evidence quality, not conference heat alone."],
      ["Business logic", "Durable value comes from platform execution and clinical design."]
    ],
    callout: "The next oncology cycle is not one technology. It is a platform competition."
  },
  {
    file: "figure-01",
    kicker: "FIGURE 01",
    title: "The ASCO Signal",
    subtitle: "Cancer therapy is moving from isolated mechanisms toward overlapping platform strategies.",
    chips: ["Target biology", "Drug engineering", "Combination design"],
    panels: [
      ["RAS targeting", "Previously hard targets are moving from concept into survival data."],
      ["ADCs and bispecifics", "Payload, target, and immune biology are being recombined."],
      ["Cell engineering", "In vivo CAR-T hints at a simpler delivery model for cell therapy."]
    ],
    callout: "ASCO 2026 is a map of where oncology capital may concentrate next."
  },
  {
    file: "figure-02",
    kicker: "FIGURE 02",
    title: "Practice-changing Data",
    subtitle: "The strongest data do more than improve a product story. They can reprice an entire modality.",
    chips: ["Overall survival", "Control arm", "Follow-up", "Safety"],
    panels: [
      ["Hard endpoint", "Survival data in pancreatic cancer carries more weight than softer response signals."],
      ["Market implication", "If RAS moves toward standard of care, platform valuations can reset."],
      ["Due diligence", "Investors must read endpoint hardness, sample size, and regulatory relevance."]
    ],
    callout: "Conference buzz fades. Practice-changing datasets can change capital-market memory."
  },
  {
    file: "figure-03",
    kicker: "FIGURE 03",
    title: "Platform Competition",
    subtitle: "The winners will combine science, manufacturing, capital allocation, and commercialization.",
    chips: ["RAS", "ADC", "PD-1/VEGF", "CAR-T"],
    panels: [
      ["Not one winner", "Oncology is advancing through several modalities at the same time."],
      ["Execution stack", "Target biology, clinical design, CMC, and global registration all matter."],
      ["Asia lesson", "Data quality and translational credibility decide whether a story travels globally."]
    ],
    callout: "The investable question is not only what works, but who can turn it into a durable franchise."
  }
];

function htmlFor(card) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0;width:1600px;height:900px;overflow:hidden}
body{font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#102f3a;background:#fbfdfd}
.canvas{position:relative;width:1600px;height:900px;padding:72px 82px;background-image:linear-gradient(90deg,#fbfdfd 0%,#fbfdfd 54%,rgba(255,255,255,.90) 66%,rgba(255,255,255,.30) 100%),url("${backgroundWorkspace}");background-size:cover;background-position:center}
.frame{position:absolute;inset:34px;border:2px solid rgba(24,92,112,.18);border-radius:34px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.86)}
.network{position:absolute;right:84px;top:118px;width:502px;height:478px}
.network:before{content:"";position:absolute;left:22px;right:22px;top:214px;height:10px;border-radius:999px;background:linear-gradient(90deg,rgba(18,138,149,.38),rgba(147,79,181,.40),rgba(216,115,37,.55));transform:rotate(-18deg);box-shadow:0 20px 42px rgba(18,70,83,.12)}
.network:after{content:"";position:absolute;left:124px;right:74px;top:144px;height:10px;border-radius:999px;background:rgba(97,157,219,.38);transform:rotate(22deg)}
.orb{position:absolute;border-radius:50%;background:rgba(255,255,255,.84);border:5px solid rgba(18,138,149,.58);box-shadow:0 18px 36px rgba(18,70,83,.11)}
.orb.a{right:390px;top:320px;width:84px;height:84px}.orb.b{right:266px;top:186px;width:104px;height:104px;border-color:rgba(147,79,181,.60)}.orb.c{right:116px;top:350px;width:96px;height:96px;border-color:rgba(216,115,37,.66)}
.cell{position:absolute;right:130px;bottom:86px;width:170px;height:170px;border-radius:50%;background:radial-gradient(circle at 40% 38%,#8ddae5,#245c8e 62%,#143c64);box-shadow:0 24px 58px rgba(20,74,116,.26)}
.cell:before,.cell:after{content:"";position:absolute;border-radius:50%;background:#d95c9f;box-shadow:56px 26px 0 #7e62d9,-42px 54px 0 #59c4ca,22px 92px 0 #e78532}
.cell:before{width:24px;height:24px;left:38px;top:42px}.cell:after{width:18px;height:18px;left:94px;top:52px}
.kicker{color:#d87325;font-size:30px;font-weight:850;letter-spacing:.18em;text-transform:uppercase;margin-bottom:22px}
h1{max-width:1080px;margin:0;font-size:62px;line-height:1.04;letter-spacing:0;color:#111820}.cover h1{font-size:68px}
.subtitle{max-width:1060px;margin-top:24px;font-size:30px;line-height:1.32;color:#5f7078;font-weight:650}
.chips{display:flex;gap:14px;flex-wrap:wrap;margin-top:32px;max-width:1120px}
.chip{border:2px solid rgba(19,139,151,.25);background:rgba(236,249,249,.94);color:#126a79;border-radius:999px;padding:12px 22px;font-size:23px;font-weight:820}
.panels{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:26px;max-width:1310px;margin-top:48px}
.panel{min-height:184px;padding:26px 30px;border-radius:28px;border:2px solid rgba(24,92,112,.18);background:rgba(255,255,255,.91);box-shadow:0 20px 46px rgba(18,70,83,.08)}
.panel b{display:block;color:#102f3a;font-size:30px;line-height:1.08;margin-bottom:15px}
.panel span{display:block;color:#5f7078;font-size:22px;line-height:1.25;font-weight:680}
.callout{position:absolute;left:82px;right:150px;bottom:72px;padding:24px 34px;border-radius:999px;border:4px solid #128a95;background:rgba(236,249,249,.92);color:#102f3a;font-size:29px;line-height:1.18;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
</style></head><body><div class="canvas ${card.file === "cover" ? "cover" : ""}">
<div class="frame"></div><div class="network"></div><div class="orb a"></div><div class="orb b"></div><div class="orb c"></div><div class="cell"></div>
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
