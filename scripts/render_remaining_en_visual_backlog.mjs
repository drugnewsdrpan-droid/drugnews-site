import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const tempDir = path.join("/private/tmp", "drugnews-remaining-en-visual-backlog");

const sources = {
  sinphar: process.argv[2],
  curium: process.argv[3]
};

if (!sources.sinphar || !fs.existsSync(sources.sinphar) || !sources.curium || !fs.existsSync(sources.curium)) {
  throw new Error("Usage: node scripts/render_remaining_en_visual_backlog.mjs /path/to/sinphar-background.png /path/to/curium-background.png");
}

fs.mkdirSync(tempDir, { recursive: true });

const articleSets = [
  {
    slug: "sinphar-cx5461-ras-pancreatic-cancer-en",
    background: sources.sinphar,
    backgroundName: "gpt-ras-pancreatic-background.png",
    theme: "oncology",
    cards: [
      {
        file: "cover",
        kicker: "DRUGNEWS ENGLISH",
        title: "RAS Opens the Door in Pancreatic Cancer",
        subtitle: "Senhwa's CX-5461 matters if it can become a rational partner in the next resistance-management war.",
        chips: ["RAS", "CX-5461", "Pancreatic cancer", "Resistance"],
        panels: [
          ["Clinical opening", "Daraxonrasib shows that RAS-targeted therapy can change the pancreatic-cancer discussion."],
          ["Next problem", "Cancer cells may escape through MYC, KEAP1/NRF2, YAP/TAZ/TEAD, and immune evasion."],
          ["Asset question", "CX-5461 must prove whether ribosome stress, DNA damage, and immune activation translate clinically."]
        ],
        callout: "The value question moves from RAS inhibition to post-RAS resistance management."
      },
      {
        file: "figure-01",
        kicker: "FIGURE 01",
        title: "RAS Targeting Creates a New Window",
        subtitle: "Pancreatic cancer is moving from chemotherapy-dominated thinking toward targeted combination logic.",
        chips: ["RAS(ON)", "Survival signal", "Combination era"],
        panels: [
          ["Before", "Late diagnosis, rapid progression, and chemotherapy limits kept pancreatic cancer hard to treat."],
          ["Turning point", "RAS-directed survival data gives clinicians a more concrete target to build around."],
          ["After the opening", "The next battle is not only response, but durability and escape control."]
        ],
        callout: "A new target era creates a new resistance-management problem."
      },
      {
        file: "figure-02",
        kicker: "FIGURE 02",
        title: "Where Cancer Cells May Escape",
        subtitle: "After RAS pressure, resistant clones can move through transcriptional, oxidative-stress, and immune routes.",
        chips: ["MYC", "KEAP1/NRF2", "YAP/TAZ/TEAD", "Immune escape"],
        panels: [
          ["MYC axis", "Growth and protein-production pressure can help aggressive cells keep proliferating."],
          ["Stress survival", "KEAP1/NRF2 may help tumors tolerate oxidative and metabolic stress."],
          ["Plasticity", "YAP/TAZ/TEAD and immune evasion can reshape the tumor state."]
        ],
        callout: "The escape routes are biologically important, but difficult to drug directly."
      },
      {
        file: "figure-03",
        kicker: "FIGURE 03",
        title: "How CX-5461 Could Fit",
        subtitle: "The point is not replacing RAS inhibitors. The point is creating pressure that resistant cells cannot easily route around.",
        chips: ["Ribosome stress", "DNA damage", "Innate immunity"],
        panels: [
          ["Ribosome stress", "CX-5461 may disrupt a production system fast-growing cancer cells depend on."],
          ["DNA stress", "Replication stress and DNA damage can expose vulnerabilities in tumor cells."],
          ["Immune priming", "A colder tumor microenvironment may become more visible to immune attack."]
        ],
        callout: "CX-5461 is most interesting as a combination and sensitization asset."
      },
      {
        file: "figure-04",
        kicker: "FIGURE 04",
        title: "What Investors Should Track",
        subtitle: "The investment case depends on whether mechanism becomes reproducible clinical signal.",
        chips: ["Trial start", "Safety", "Synergy", "Biomarkers"],
        panels: [
          ["Execution", "Can the CX-5461 plus PD-1 trial launch and recruit the right KRAS-positive patients?"],
          ["Signal", "Does the combination show controllable safety, immune activation, and disease control?"],
          ["Translation", "Can biomarkers make the story legible to global pharma partners?"]
        ],
        callout: "The market should follow data durability, not only the mechanism story."
      }
    ]
  },
  {
    slug: "curium-lantheus-radiopharma-acquisition-en",
    background: sources.curium,
    backgroundName: "gpt-radiopharma-platform-background.png",
    theme: "radiopharma",
    cards: [
      {
        file: "cover",
        kicker: "DRUGNEWS ENGLISH",
        title: "Radiopharma M&A Is Becoming a Platform Race",
        subtitle: "Curium's reported interest in Lantheus is best read as a bid for isotope supply, PET imaging workflow, hospital access, and commercial infrastructure.",
        chips: ["Radiopharma", "M&A", "PET imaging", "Supply chain"],
        panels: [
          ["Not only a product", "Lantheus brings a hospital-facing PSMA PET franchise and diagnostic workflow."],
          ["Not only a buyer", "Curium brings isotope supply, manufacturing, distribution, and global nuclear-medicine experience."],
          ["Real prize", "The platform that connects diagnosis, manufacturing, delivery, and treatment earns the premium."]
        ],
        callout: "The value is not just the molecule. It is the nuclear-medicine operating system."
      },
      {
        file: "figure-01",
        kicker: "FIGURE 01",
        title: "Radiopharma Is a Platform Game",
        subtitle: "The winning company must connect science, manufacturing, logistics, hospital workflow, and payer reality.",
        chips: ["Isotopes", "GMP", "Hospitals", "Workflow"],
        panels: [
          ["Science layer", "Targets, linkers, radionuclides, imaging, and treatment logic must work together."],
          ["Industrial layer", "Half-life, sterile production, radiation safety, and regional distribution shape the business model."],
          ["Commercial layer", "Hospital adoption, scheduling, reimbursement, and scan-to-treat workflow create the moat."]
        ],
        callout: "Radiopharma valuation increasingly rewards infrastructure, not only pipeline count."
      }
    ]
  }
];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function htmlFor(article, card, backgroundWorkspace) {
  const accent = article.theme === "radiopharma" ? "#f0a95b" : "#e17c2d";
  const cyan = article.theme === "radiopharma" ? "#64dde2" : "#54d8dc";
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0;width:1600px;height:900px;overflow:hidden}
body{font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#0d2e38;background:#061923}
.canvas{position:relative;width:1600px;height:900px;padding:66px 78px;background-image:linear-gradient(90deg,rgba(5,22,31,.94) 0%,rgba(7,31,40,.88) 36%,rgba(7,31,40,.50) 70%,rgba(7,31,40,.20) 100%),url("${backgroundWorkspace}");background-size:cover;background-position:center}
.frame{position:absolute;inset:32px;border:2px solid rgba(151,230,231,.36);border-radius:34px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.18),0 22px 70px rgba(0,0,0,.18)}
.halo{position:absolute;right:110px;top:94px;width:480px;height:480px;border-radius:50%;border:3px solid rgba(105,220,224,.34);background:radial-gradient(circle at 36% 34%,rgba(241,255,255,.22),rgba(21,153,162,.08) 45%,rgba(0,0,0,0) 70%)}
.arc{position:absolute;right:126px;top:326px;width:540px;height:15px;border-radius:999px;background:linear-gradient(90deg,rgba(83,216,220,.10),${cyan},${accent});transform:rotate(-20deg);box-shadow:0 0 34px rgba(83,216,220,.22)}
.arc:after{content:"";position:absolute;right:-8px;top:-17px;border-left:46px solid ${cyan};border-top:25px solid transparent;border-bottom:25px solid transparent}
.node{position:absolute;border-radius:50%;background:rgba(236,252,252,.95);border:3px solid rgba(100,221,226,.68);box-shadow:0 18px 42px rgba(0,0,0,.18)}
.n1{right:448px;bottom:155px;width:76px;height:76px}.n2{right:318px;bottom:206px;width:54px;height:54px;background:${accent}}.n3{right:200px;bottom:146px;width:86px;height:86px}
.kicker{position:relative;color:${accent};font-size:29px;font-weight:850;letter-spacing:.18em;text-transform:uppercase;margin-bottom:20px}
h1{position:relative;max-width:1070px;margin:0;font-size:63px;line-height:1.05;letter-spacing:0;color:#f7fbfb}.cover h1{font-size:68px;max-width:1120px}
.subtitle{position:relative;max-width:1070px;margin-top:23px;font-size:29px;line-height:1.34;color:#c6d7dc;font-weight:650}
.chips{position:relative;display:flex;gap:14px;flex-wrap:wrap;margin-top:28px;max-width:1130px}
.chip{border:2px solid rgba(91,222,226,.34);background:rgba(7,74,84,.72);color:#dffafb;border-radius:999px;padding:11px 21px;font-size:22px;font-weight:820}
.panels{position:relative;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:23px;max-width:1294px;margin-top:43px}
.panel{min-height:200px;padding:25px 29px;border-radius:28px;border:2px solid rgba(132,219,222,.28);background:rgba(247,253,253,.94);box-shadow:0 24px 54px rgba(0,0,0,.18)}
.panel b{display:block;color:#102f3a;font-size:29px;line-height:1.08;margin-bottom:14px}
.panel span{display:block;color:#5e7078;font-size:21px;line-height:1.25;font-weight:690}
.callout{position:absolute;left:78px;right:148px;bottom:68px;padding:24px 34px;border-radius:999px;border:4px solid ${cyan};background:rgba(236,250,250,.94);color:#102f3a;font-size:28px;line-height:1.18;font-weight:860;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@media(max-width:900px){.canvas{transform:scale(.5);transform-origin:top left}}
</style></head><body><div class="canvas ${card.file === "cover" ? "cover" : ""}">
<div class="frame"></div><div class="halo"></div><div class="arc"></div><i class="node n1"></i><i class="node n2"></i><i class="node n3"></i>
<div class="kicker">${escapeHtml(card.kicker)}</div><h1>${escapeHtml(card.title)}</h1><div class="subtitle">${escapeHtml(card.subtitle)}</div>
<div class="chips">${card.chips.map((chip) => `<span class="chip">${escapeHtml(chip)}</span>`).join("")}</div>
<div class="panels">${card.panels.map(([title, text]) => `<div class="panel"><b>${escapeHtml(title)}</b><span>${escapeHtml(text)}</span></div>`).join("")}</div>
<div class="callout">${escapeHtml(card.callout)}</div></div></body></html>`;
}

for (const article of articleSets) {
  const contentDir = path.join(repoRoot, "content", "published", article.slug, "images");
  const assetDir = path.join(repoRoot, "assets", "articles", article.slug);
  fs.mkdirSync(contentDir, { recursive: true });
  fs.mkdirSync(assetDir, { recursive: true });
  const backgroundWorkspace = path.join(assetDir, article.backgroundName);
  fs.copyFileSync(article.background, backgroundWorkspace);

  for (const card of article.cards) {
    const htmlPath = path.join(tempDir, `${article.slug}-${card.file}.html`);
    const pngPath = path.join(tempDir, `${article.slug}-${card.file}.png`);
    fs.writeFileSync(htmlPath, htmlFor(article, card, backgroundWorkspace));
    const result = spawnSync(chromePath, [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      `--screenshot=${pngPath}`,
      "--window-size=1600,900",
      `file://${htmlPath}`
    ], { stdio: "inherit" });
    if (result.status !== 0) throw new Error(`Chrome failed for ${article.slug} ${card.file}`);
    fs.copyFileSync(pngPath, path.join(contentDir, `${card.file}.png`));
    fs.copyFileSync(pngPath, path.join(assetDir, `${card.file}.png`));
  }
}

console.log(`Rendered ${articleSets.reduce((sum, article) => sum + article.cards.length, 0)} English PNG assets for remaining visual backlog.`);
