import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const PUBLISHED = path.join(ROOT, "content", "published");

function wrapText(text, max = 34) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function svgCard({ label = "Drugnews English", title, subtitle = "", points = [], accent = "#d3752c" }) {
  const titleLines = wrapText(title, 28).slice(0, 3);
  const subtitleLines = wrapText(subtitle, 54).slice(0, 2);
  const pointList = points.slice(0, 4);
  const titleSvg = titleLines.map((line, index) => (
    `<text x="70" y="${142 + index * 48}" class="title">${escapeXml(line)}</text>`
  )).join("\n");
  const subtitleSvg = subtitleLines.map((line, index) => (
    `<text x="70" y="${308 + index * 28}" class="subtitle">${escapeXml(line)}</text>`
  )).join("\n");
  const pointSvg = pointList.map((point, index) => {
    const y = 418 + index * 52;
    return `<g>
      <circle cx="82" cy="${y - 8}" r="8" fill="${accent}"/>
      <text x="104" y="${y}" class="point">${escapeXml(point)}</text>
    </g>`;
  }).join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675" role="img" aria-label="${escapeXml(title)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f8fbfb"/>
      <stop offset="60%" stop-color="#eef7f7"/>
      <stop offset="100%" stop-color="#fff7ef"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#12313c" flood-opacity="0.12"/>
    </filter>
  </defs>
  <style>
    .label{font:800 22px Inter,Arial,sans-serif;letter-spacing:.16em;text-transform:uppercase;fill:#a45f2b}
    .title{font:800 42px Inter,Arial,sans-serif;fill:#14191d}
    .subtitle{font:500 21px Inter,Arial,sans-serif;fill:#52616b}
    .point{font:750 25px Inter,Arial,sans-serif;fill:#173843}
    .small{font:700 18px Inter,Arial,sans-serif;fill:#6d7a83}
  </style>
  <rect width="1200" height="675" fill="url(#bg)"/>
  <path d="M770 80 C930 50 1040 120 1110 250 C1170 360 1110 530 970 585 C820 646 678 555 640 416 C602 276 634 122 770 80Z" fill="#12313c" opacity="0.08"/>
  <path d="M760 482 C854 372 942 340 1064 362" fill="none" stroke="${accent}" stroke-width="12" stroke-linecap="round" opacity=".9"/>
  <path d="M780 225 C870 178 972 188 1064 252" fill="none" stroke="#265f73" stroke-width="10" stroke-linecap="round" opacity=".75"/>
  <g filter="url(#shadow)">
    <rect x="46" y="48" width="640" height="578" rx="26" fill="#fff" opacity=".95"/>
  </g>
  <text x="70" y="104" class="label">${escapeXml(label)}</text>
  ${titleSvg}
  ${subtitleSvg}
  ${pointSvg}
  <text x="70" y="602" class="small">Drugnews | Biotech business analysis</text>
</svg>
`;
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function writeJson(file, value) {
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

function zhFileName(meta) {
  return `${meta.date}-${meta.slug}.html`;
}

function enFileName(meta) {
  return `${meta.date}-${meta.slug}-en.html`;
}

function disclaimer() {
  return "This article is intended for industry research and knowledge sharing only. It does not constitute investment, medical, fundraising, or individual stock advice.";
}

const upgrades = [
  {
    source: "revolution-medicines",
    title: "Revolution Medicines: Why Biotech Winners Need Capital Strategy, Not Just Good Science",
    summary: "Revolution Medicines shows why next-generation biotech companies need to convert clinical momentum into capital momentum if they want to finish expensive global drug-development races.",
    category: "商業分析系列",
    tags: ["RAS", "Revolution Medicines", "Daraxonrasib", "Biotech financing", "Pancreatic cancer", "Capital markets"],
    figures: [
      ["RAS value creation", "Clinical proof only matters if the company has enough capital to finish the race.", ["Daraxonrasib doubled OS in PDAC", "Four global Phase 3 programs", "Cash runway becomes strategy"]],
      ["Financing rhythm", "The best biotech financings happen after value-changing catalysts, not when cash is almost gone.", ["Raise after data", "Use converts and royalty capital", "Protect strategic optionality"]],
      ["Science x capital", "The Revolution case is a compound effect of science, evidence, financing, and execution.", ["RAS(ON) platform", "Late-stage trials", "Independent commercialization option"]]
    ],
    body: `# Revolution Medicines: Why Biotech Winners Need Capital Strategy, Not Just Good Science

Revolution Medicines is one of the most important biotech stories of 2026 because it sits at the intersection of two forces: a hard scientific problem and an even harder capital-markets problem.

The scientific story is RAS-addicted cancer. For decades, RAS was treated as one of oncology's most difficult drug targets. Revolution Medicines has pushed that idea into a different phase with its RAS(ON) inhibitor platform, especially daraxonrasib, also known as RMC-6236.

In previously treated metastatic pancreatic ductal adenocarcinoma, the Phase 3 RASolute-302 study showed median overall survival of 13.2 months for daraxonrasib versus 6.7 months for standard chemotherapy. In pancreatic cancer, that is not a small improvement. It is the type of data that can change how investors, physicians, and potential partners think about an entire modality.

![RAS value creation](images/figure-01-en.svg)

But the Revolution Medicines case is not only about one strong clinical readout. It is also a case study in how biotech companies turn scientific momentum into financial runway.

Innovative drug development consumes cash at a brutal pace. Revolution Medicines reported a first-quarter 2026 net loss of roughly US$454 million, with R&D spending rising sharply as daraxonrasib, zoldonrasib, elironrasib, and related RAS programs moved forward. That level of spending would be dangerous for a company without capital-market access. For Revolution, it became part of the strategy.

The company has repeatedly raised money when the market was willing to pay for the next stage of the story. It did not wait until the cash balance became an emergency. After clinical catalysts and share-price re-rating, it converted investor confidence into cash. That is the difference between defensive financing and offensive financing.

![Financing rhythm](images/figure-02-en.svg)

The EQRx transaction was especially instructive. In a weak biotech market, Revolution used an all-stock acquisition to bring in a large cash position and support the RAS(ON) portfolio. Later, it added equity offerings, convertible notes, and a Royalty Pharma flexible funding agreement. The point was not simply to "raise money." The point was to preserve control.

For a late-stage oncology biotech, cash is not just a resource. It is negotiating leverage. A company with enough capital can keep running global trials, prepare commercialization, and decide whether to partner, sell, or remain independent from a position of strength.

That is why Revolution Medicines matters for investors beyond the RAS story. Many biotech companies can describe a large opportunity. Fewer can build the clinical, financial, and organizational structure needed to reach the opportunity without being forced into a weak transaction.

![Science x capital](images/figure-03-en.svg)

The lesson for biotech readers is clear. Science creates the opening. Clinical data creates evidence. Capital creates time. Execution connects the three. Revolution Medicines is compelling because those forces reinforce each other.

The company is not valuable merely because it can raise money, and it is not valuable merely because it has a RAS story. Its real strength is that every clinical catalyst can become capital-market momentum, and every financing can buy more time for clinical execution.

For Taiwan biotech companies, this is a useful reminder. The market window does not stay open forever. Mature biotech strategy means planning financing around value inflection points, not waiting until the runway is almost gone.

${disclaimer()}`
  },
  {
    source: "2026-asco-car-t",
    title: "ASCO 2026: RAS, ADCs, Bispecifics, and In Vivo CAR-T Point to a New Oncology Cycle",
    summary: "ASCO 2026 showed that oncology is moving from single-mechanism breakthroughs toward platform combinations across RAS targeting, ADCs, PD-1/VEGF bispecifics, and in vivo CAR-T.",
    category: "醫學大會",
    tags: ["ASCO", "Oncology", "RAS", "ADC", "PD-1 VEGF", "In vivo CAR-T"],
    figures: [
      ["ASCO signal", "The meeting was less about one winner and more about the next oncology platform cycle.", ["RAS can change hard cancers", "ADC plus immunotherapy expands", "In vivo CAR-T changes manufacturing"]],
      ["Practice-changing data", "Daraxonrasib made pancreatic cancer look clinically addressable in a new way.", ["OS: 13.2 vs 6.7 months", "RAS(ON) biology", "Pancreatic cancer re-rating"]],
      ["Platform competition", "The next oncology winners will combine biology, engineering, global trials, and capital.", ["PD-1/VEGF", "TROP2 ADC", "Cell therapy delivery"]]
    ],
    body: `# ASCO 2026: RAS, ADCs, Bispecifics, and In Vivo CAR-T Point to a New Oncology Cycle

The most important winner at ASCO 2026 was not a single drugmaker. It was the idea that several impossible-looking oncology problems are becoming clinically testable.

The meeting showed a broader shift in cancer therapy. Oncology is no longer advancing through one mechanism at a time. RAS inhibitors, antibody-drug conjugates, PD-1/VEGF bispecific antibodies, in vivo cell engineering, and new combination strategies are all moving at once. For investors, that means the competitive map is becoming more complex and more platform-driven.

![ASCO signal](images/figure-01-en.svg)

The most striking data came from Revolution Medicines. Daraxonrasib, an oral RAS(ON) multi-selective inhibitor, produced median overall survival of 13.2 months versus 6.7 months for chemotherapy in previously treated metastatic pancreatic ductal adenocarcinoma. Pancreatic cancer has long been one of oncology's hardest diseases. A survival result of this scale does not just improve a product story. It can reprice an entire modality.

This matters because RAS has historically been viewed as a difficult or even undruggable target. If daraxonrasib can move from proof-of-concept into a new standard of care, the market will stop valuing RAS companies as speculative target stories and start valuing them as late-stage oncology franchises.

![Practice-changing data](images/figure-02-en.svg)

Merck's position was also important. Keytruda remains one of the most powerful oncology platforms in the world, but Merck cannot depend on Keytruda alone forever. The company is building around ADCs, next-generation combinations, and assets such as sacituzumab tirumotecan. The post-Keytruda era will not be solved by one replacement drug. It will likely be solved by layers of immunotherapy, ADCs, bispecifics, and disease-specific combinations.

PD-1/VEGF bispecifics were another major theme. Ivonescimab's HARMONi-6 data strengthened the idea that dual blockade of immune checkpoint and angiogenesis biology can translate into clinically meaningful benefit. But the next question is global reproducibility. Strong China data are not enough by themselves. The market will ask whether efficacy, safety, and regulatory confidence can be reproduced across broader populations.

In vivo CAR-T created the most futuristic signal. Kelonia's KLN-1010 suggested that CAR-T engineering may eventually move inside the patient rather than requiring ex vivo cell collection, manufacturing, expansion, and reinfusion. It is early, but the implication is enormous: if cell therapy can become easier to manufacture and deliver, the business model of CAR-T could change.

![Platform competition](images/figure-03-en.svg)

For Taiwan and Asia biotech readers, the key lesson is not simply "ASCO is important." The lesson is that data quality matters. A conference presentation is not enough. The market cares about endpoint hardness, control arm, sample size, follow-up duration, safety, global regulatory relevance, and whether the data can change clinical practice.

The 2026 oncology cycle is not about one technology winning. It is about companies that can combine target biology, drug engineering, clinical design, manufacturing, capital allocation, and commercialization. Those are the companies that can turn scientific possibility into durable business value.

${disclaimer()}`
  },
  {
    source: "lilly-vaccine-acquisitions-prevention-medicine",
    title: "Why Would Lilly, the Obesity-Drug Giant, Spend US$3.8 Billion on Vaccine Companies?",
    summary: "Lilly's vaccine acquisitions show that the company is using obesity-drug cash flow to widen its long-term disease-prevention and immunology strategy.",
    category: "商業分析系列",
    tags: ["Eli Lilly", "Vaccines", "M&A", "Prevention medicine", "Obesity medicine"],
    figures: [
      ["Beyond obesity", "Lilly is using today's obesity-drug cash flow to buy optionality in tomorrow's prevention market.", ["Mounjaro and Zepbound cash engine", "Vaccine platform optionality", "Portfolio diversification"]],
      ["Why vaccines?", "Prevention can create durable franchises when science, manufacturing, and public-health demand align.", ["Repeat demand", "Population scale", "Strategic resilience"]],
      ["Capital allocation", "The question is not whether Lilly is leaving obesity, but how it redeploys obesity profits.", ["Buy platforms", "Extend disease areas", "Reduce single-franchise risk"]]
    ],
    body: `# Why Would Lilly, the Obesity-Drug Giant, Spend US$3.8 Billion on Vaccine Companies?

Eli Lilly is known today as one of the two dominant forces in obesity medicine. Mounjaro and Zepbound have turned incretin biology into one of the most important growth engines in global pharma. That is exactly why Lilly's vaccine acquisitions deserve attention.

At first glance, vaccines look far away from obesity drugs. But from a capital-allocation perspective, the logic is clearer. A company with massive cash flow from metabolic medicine can use that position to buy optionality in areas that may matter for the next decade.

![Beyond obesity](images/figure-01-en.svg)

The strategic question is not whether Lilly is abandoning obesity. It clearly is not. The better question is how Lilly wants to use the obesity-drug profit cycle before the market becomes more crowded, more price-sensitive, and more competitive.

Vaccines and prevention medicine can offer something different from chronic obesity treatment. They can create population-scale franchises, support public-health relevance, and diversify the company's long-term growth base. For a large pharmaceutical company, prevention is not a side topic. It can become a durable strategic pillar when science, manufacturing, and demand align.

![Why vaccines?](images/figure-02-en.svg)

The business logic also reflects a broader pharma pattern. When a company has one exceptionally strong franchise, investors eventually ask what comes next. Lilly's answer cannot be only "more GLP-1." The obesity market is enormous, but it will attract every major company. Novo Nordisk, Roche, Pfizer, AstraZeneca, Regeneron, Amgen, and many Asian companies are all trying to find differentiated angles.

That means Lilly needs to convert current strength into future resilience. Acquiring vaccine companies is a way to buy platform knowledge, disease-area optionality, manufacturing capabilities, and a stronger position in prevention.

![Capital allocation](images/figure-03-en.svg)

For biotech investors, the lesson is that cash flow changes strategy. A company with a dominant product can become more aggressive in M&A because it can afford to buy earlier, broader, and more strategically. Lilly's vaccine moves are not random. They are part of the transition from a company winning one huge drug category to a company trying to build a broader long-term healthcare empire.

The obesity-drug cycle made Lilly stronger. The next question is whether Lilly can use that strength to build durable franchises beyond obesity.

${disclaimer()}`
  },
  {
    source: "glp1-head-to-head-ecnoglutide-wegovy",
    title: "Ecnoglutide Versus Wegovy: A 20-Week Head-to-Head Signal Is Not the Same as a New GLP-1 King",
    summary: "Ecnoglutide's head-to-head weight-loss data versus semaglutide are interesting, but the GLP-1 race will be decided by long-term outcomes, tolerability, labels, supply, and global evidence.",
    category: "商業分析系列",
    tags: ["GLP-1", "Ecnoglutide", "Wegovy", "Pfizer", "Novo Nordisk", "Obesity medicine"],
    figures: [
      ["Head-to-head signal", "Ecnoglutide looked stronger at 20 weeks, but the study is still early.", ["12.8% vs 9.5% weight loss", "Phase 2 interim data", "Open-label design"]],
      ["What really matters", "The next GLP-1 phase is about metabolic outcomes, not just body-weight percentage.", ["CV outcomes", "MASH and kidney labels", "Durability and adherence"]],
      ["Wegovy moat", "Novo's advantage is an evidence network, not only semaglutide as a molecule.", ["Global experience", "Regulatory labels", "Product matrix"]]
    ],
    body: `# Ecnoglutide Versus Wegovy: A 20-Week Head-to-Head Signal Is Not the Same as a New GLP-1 King

ADA 2026 gave the GLP-1 market another headline: ecnoglutide showed stronger 20-week weight loss than Wegovy in an interim Phase 2 head-to-head study.

That is a meaningful signal. In the SLIMMER-UP-SWITCH study, ecnoglutide produced average weight loss of 12.8% at 20 weeks versus 9.5% for semaglutide. Both were given weekly at a 2.4 mg maintenance dose. A higher share of ecnoglutide patients also reached at least 10% weight loss.

![Head-to-head signal](images/figure-01-en.svg)

The data are interesting, but they are not enough to declare a new GLP-1 winner. This was a Phase 2, open-label, interim analysis with 163 participants. In obesity trials, open-label design can affect behavior, adherence, reporting, and expectations. The result should be taken seriously, but it should not be treated as a final commercial verdict.

The first stage of the obesity-drug market was dominated by a simple question: how much weight can the drug reduce? The next stage will ask harder questions. Can weight loss be maintained? What happens after discontinuation? How much lean mass is lost? Can the drug reduce cardiovascular events, liver disease, kidney deterioration, sleep apnea, inflammation, or long-term mortality risk?

![What really matters](images/figure-02-en.svg)

This is where Wegovy's moat is often underestimated. Novo Nordisk's advantage is not only semaglutide. It is the evidence network around semaglutide: cardiovascular-risk reduction, global physician experience, regulatory labels, supply infrastructure, real-world use, and a broader product matrix.

Ecnoglutide's scientific story is still important. As a biased GLP-1 receptor agonist, it may eventually show a useful balance between efficacy, receptor activity, and tolerability. If larger and longer studies confirm better weight loss with acceptable gastrointestinal safety and persistence, Pfizer could have a serious asset, especially in China and potentially in broader markets.

![Wegovy moat](images/figure-03-en.svg)

But the market should not confuse a strong early signal with a changed throne. Novo is not standing still. Higher-dose semaglutide, oral formulations, MASH labels, cardiovascular data, and global commercial depth all make the semaglutide franchise more than one injectable product.

The real GLP-1 battle will be decided in 2027 and 2028, when larger Phase 3 trials, oral small molecules, dual and triple agonists, body-composition data, and long-term outcomes become clearer. Ecnoglutide has entered the conversation. It has not yet rewritten the ending.

${disclaimer()}`
  },
  {
    source: "gsk-nuvalent-lung-cancer-resistance-brain-metastasis",
    title: "GSK's US$10.6 Billion Nuvalent Deal Is Really a Bet on Resistance and Brain Metastases",
    summary: "GSK is not merely buying three lung-cancer pipelines. It is buying a next-generation precision-oncology strategy around resistance, CNS activity, and cleaner kinase inhibition.",
    category: "商業分析系列",
    tags: ["GSK", "Nuvalent", "Lung cancer", "Precision oncology", "Resistance", "Brain metastases"],
    figures: [
      ["What GSK bought", "The deal is less about pipeline count and more about next-generation lung-cancer positioning.", ["ALK, ROS1, HER2 programs", "Resistance mutations", "CNS penetration"]],
      ["Precision oncology moat", "In lung cancer, the value is in solving what first-generation drugs leave behind.", ["Acquired resistance", "Brain metastases", "Safety and selectivity"]],
      ["BD logic", "Big Pharma is paying for assets that can extend targeted-therapy franchises.", ["Cleaner kinase design", "Global trials", "Commercial fit"]]
    ],
    body: `# GSK's US$10.6 Billion Nuvalent Deal Is Really a Bet on Resistance and Brain Metastases

GSK's agreement to acquire Nuvalent for roughly US$10.6 billion should not be read as simply buying three lung-cancer pipelines. The deeper logic is more specific: GSK is buying a position in the next phase of precision oncology.

Lung cancer has already been transformed by targeted therapies. EGFR, ALK, ROS1, MET, RET, NTRK, and other drivers have turned subsets of non-small cell lung cancer into molecularly defined markets. But targeted therapy creates its own next problem. Patients respond, then resistance emerges. Many also develop or already have brain metastases, which require drugs that can work in the central nervous system.

![What GSK bought](images/figure-01-en.svg)

That is why Nuvalent is strategically attractive. The company's programs are designed around cleaner kinase inhibition, resistance coverage, and CNS activity. In modern lung cancer, a drug is not judged only by whether it hits the primary driver. It is judged by whether it can cover resistance mutations, reduce off-target toxicity, maintain activity in the brain, and fit into a treatment sequence that is already crowded.

This is the business meaning of "next generation." It does not mean a newer molecule on a slide. It means a molecule that solves problems left by existing products.

![Precision oncology moat](images/figure-02-en.svg)

For GSK, the deal also reflects a broader portfolio strategy. The company has been trying to strengthen oncology after years of mixed positioning. Nuvalent gives GSK a clearer way to participate in precision lung cancer, an area where commercial value can be high if the asset becomes best-in-class or meaningfully differentiated.

The price is large, but the logic is understandable. Big Pharma is willing to pay for assets that can become durable franchises in well-defined molecular segments. The most valuable assets are not always the broadest. Sometimes they are the ones that answer the hardest treatment-sequencing questions.

![BD logic](images/figure-03-en.svg)

For biotech investors, the Nuvalent deal is a reminder that BD value is often created by solving the second problem, not the first. The first problem was making targeted therapy work. The second is making it work after resistance, in the brain, and with tolerability good enough for chronic use.

That is what GSK is paying for. Not just pipelines, but a more advanced precision-oncology thesis.

${disclaimer()}`
  },
  {
    source: "enlivex-rain-token-biotech-treasury",
    title: "Enlivex's RAIN Token Windfall: When a Biotech Balance Sheet Starts Looking Like Crypto Treasury Strategy",
    summary: "Enlivex's paper gain from RAIN tokens shows how fragile biotech business models can create unusual treasury stories when operating revenue is absent and capital markets are difficult.",
    category: "商業分析系列",
    tags: ["Enlivex", "RAIN token", "Biotech treasury", "Crypto", "Capital markets"],
    figures: [
      ["Biotech treasury shock", "A company without product revenue suddenly reported a major paper gain from crypto exposure.", ["No commercial drug revenue", "RAIN token mark-to-market", "Balance-sheet optics"]],
      ["Why it matters", "The case shows how capital scarcity can push biotech narratives beyond drug development.", ["Runway pressure", "Investor attention", "Governance questions"]],
      ["The real test", "Paper gains do not replace clinical value creation.", ["Liquidity risk", "Token volatility", "Drug pipeline execution"]]
    ],
    body: `# Enlivex's RAIN Token Windfall: When a Biotech Balance Sheet Starts Looking Like Crypto Treasury Strategy

Enlivex is an unusual biotech case because the headline is not mainly about clinical data. It is about a paper gain linked to RAIN tokens.

For a biotech company without meaningful product revenue, a sudden treasury-related gain can attract attention quickly. It changes the balance-sheet discussion, affects investor psychology, and can make the company look financially stronger than its operating business would otherwise suggest.

![Biotech treasury shock](images/figure-01-en.svg)

But investors need to separate accounting optics from business fundamentals. A biotech company ultimately creates durable value through clinical evidence, regulatory progress, partnership potential, and commercial products. Token exposure can affect liquidity and reported value, but it does not by itself validate the drug pipeline.

That distinction matters because biotech is a capital-intensive industry. When financing markets are difficult, companies look for ways to extend runway, attract market attention, or create alternative sources of value. Some use royalty financing, debt facilities, partnerships, or asset sales. Others may create more unusual treasury stories.

![Why it matters](images/figure-02-en.svg)

The Enlivex case is important not because every biotech will copy it, but because it shows how far capital-market narratives can stretch when the core business has not yet produced revenue. A paper gain can buy time and attention. It cannot replace clinical execution.

The key questions are practical. Can the token position be converted into usable cash? How volatile is the asset? What governance rules control treasury decisions? Does the company still have enough focus and capital to advance its drug programs? Are investors valuing a pipeline or a financial instrument?

![The real test](images/figure-03-en.svg)

For Drugnews readers, the lesson is to avoid being distracted by a spectacular balance-sheet number. In biotech, cash matters because it funds trials. But the quality of the underlying asset still matters more.

Enlivex may benefit from a strong treasury headline, but the long-term investment question remains the same: can the company turn science into clinical, regulatory, and commercial value?

${disclaimer()}`
  },
  {
    source: "merck-pd1-vegf-mk2010-keytruda",
    title: "Merck's Shift on PD-1/VEGF Bispecifics: Keytruda Still Rules, but the Next IO Backbone Is Getting Closer",
    summary: "Merck's more serious positioning of MK-2010 suggests that PD-1/VEGF bispecifics are moving from a watch item to a strategic option in the post-Keytruda oncology landscape.",
    category: "商業分析系列",
    tags: ["Merck", "Keytruda", "PD-1 VEGF", "MK-2010", "Oncology", "Bispecific antibodies"],
    figures: [
      ["Why MK-2010 matters", "Merck cannot ignore a mechanism that may become the next immuno-oncology backbone.", ["PD-1 plus VEGF", "Early NSCLC signal", "Post-Keytruda positioning"]],
      ["HARMONi-6 changed tone", "Overall survival data made the class harder for Big Pharma to dismiss.", ["OS hazard ratio signal", "PFS and OS alignment", "Global extrapolation questions"]],
      ["Next oncology package", "Merck may combine PD-1/VEGF, ADCs, and Keytruda-era assets into a new platform.", ["MK-2010", "TROP2 ADC", "Combination strategy"]]
    ],
    body: `# Merck's Shift on PD-1/VEGF Bispecifics: Keytruda Still Rules, but the Next IO Backbone Is Getting Closer

Few companies understand PD-1 biology better than Merck. Keytruda has defined the modern immuno-oncology era and remains the foundation of Merck's oncology business.

That is exactly why Merck's attitude toward PD-1/VEGF bispecific antibodies matters. For a long time, the company's tone was cautious. The core question was whether the class could turn progression-free-survival improvement into overall-survival benefit. If not, Keytruda's position would remain largely protected.

After ASCO 2026, the tone looks different.

![Why MK-2010 matters](images/figure-01-en.svg)

Merck has given MK-2010, formerly LM-299 from LaNova, a clearer place in its oncology narrative. The asset blocks both PD-1 and VEGF, combining checkpoint inhibition and anti-angiogenesis in one molecule. Early human data remain limited, but Merck described preliminary activity in non-small cell lung cancer and continued exploration as both monotherapy and in combinations.

The class became harder to dismiss after HARMONi-6. Ivonescimab plus chemotherapy showed an overall-survival advantage versus tislelizumab plus chemotherapy in first-line advanced squamous NSCLC. For a PD-1/VEGF bispecific, the key point was not only PFS. It was the possibility that dual-mechanism biology could produce survival benefit.

![HARMONi-6 changed tone](images/figure-02-en.svg)

Merck still has reasonable questions. Can China data be extrapolated globally? Will elderly and comorbid patients tolerate the mechanism? Are safety risks such as hypertension, bleeding, proteinuria, thrombosis, and immune-related adverse events manageable at scale? Which tumor types and combinations are the right sweet spots?

Those questions matter. But the strategic shift is that Merck appears to be asking where and how to use the mechanism, not whether the mechanism deserves attention at all.

The other layer is Merck's broader post-Keytruda package. The company is not relying only on MK-2010. It also has sacituzumab tirumotecan, a TROP2 ADC, and other oncology assets that could be paired with immunotherapy backbones. The future may not be one successor to Keytruda, but a set of combinations: PD-1/VEGF bispecifics, ADCs, Keytruda, and other targeted or immune-modulating agents.

![Next oncology package](images/figure-03-en.svg)

For investors, Merck's dilemma is simple. Keytruda is too successful to abandon, but the company cannot risk missing the next immuno-oncology backbone. MK-2010 is not yet the answer, but it has become an option Merck can no longer ignore.

That is the real meaning of Merck's shift. The Keytruda throne is still standing, but the shape of the next oncology throne is becoming visible.

${disclaimer()}`
  }
];

const obesityFigures = [
  ["Product-portfolio battle", "The obesity race has moved from single drugs to full metabolic ecosystems.", ["Novo: semaglutide family", "Lilly: tirzepatide family", "Oral drugs and multi-target biology"]],
  ["A third player needs asymmetry", "A challenger cannot simply become a weaker Lilly or Novo.", ["Convenience", "Tolerability", "Muscle preservation", "Cardio-renal-metabolic integration"]],
  ["Pfizer's opening", "Berobenatide is a bet on lower treatment burden and monthly dosing.", ["Long-acting injection", "Adherence advantage", "Phase 3 proof still needed"]],
  ["Roche's two-axis strategy", "Roche is pairing tolerability with stronger efficacy in obesity medicine.", ["Petrelintide: tolerability", "Enicepatide: efficacy", "Combination optionality"]]
];

const existingEnglishFigureUpgrades = [
  {
    slug: "curium-lantheus-radiopharma-acquisition-en",
    title: "The Real Prize in Radiopharma M&A",
    subtitle: "Curium and Lantheus are not only a product story. The deeper value is distribution, isotope supply, and hospital access.",
    summary: "Curium's rumored interest in Lantheus is best read as a bid for nuclear-medicine infrastructure: isotope access, hospital channels, imaging workflow, and radiopharma commercialization depth.",
    figures: [
      ["Radiopharma Is a Platform Game", "Products matter, but hospitals, isotopes, logistics, and nuclear-medicine workflow create the moat.", ["Hospital channel access", "Isotope supply chain", "Theranostic expansion"]],
      ["Why Lantheus Matters", "The acquisition logic is about becoming a stronger nuclear-medicine platform, not only buying revenue.", ["Imaging leadership", "Commercial network", "Pipeline leverage"]],
      ["Investor Lens", "In radiopharma, valuation comes from operating complexity and distribution scarcity.", ["Manufacturing matters", "Regulatory handling", "Network effects"]]
    ]
  },
  {
    slug: "sinphar-cx5461-ras-pancreatic-cancer-en",
    title: "RAS Resistance Management: Where CX-5461 Could Matter",
    subtitle: "Senhwa's CX-5461 should be read as a potential combination partner in the post-RAS-inhibitor era.",
    summary: "Daraxonrasib opens a new pancreatic-cancer window, but the next value question is resistance management. Senhwa's CX-5461 matters if it can become a rational combination partner.",
    figures: [
      ["RAS Opens the Door", "Daraxonrasib changed the pancreatic-cancer discussion, but resistance remains the next strategic problem.", ["RAS(ON) inhibition", "PDAC survival signal", "Combination need"]],
      ["Escape Pathways", "Cancer cells can route around RAS pressure through parallel survival and immune-escape programs.", ["MYC and YAP/TAZ", "KEAP1/NRF2", "Tumor microenvironment"]],
      ["CX-5461 Positioning", "The value question is not replacement. It is whether CX-5461 can become a rational partner.", ["Ribosome stress", "DNA-damage stress", "Immune activation"]],
      ["What to Track", "Investors should follow trial start, biomarker logic, and whether combination data can emerge.", ["KRAS-positive signal", "HRD/PARP resistance", "Clinical sequencing"]]
    ]
  },
  {
    slug: "glp1-biotech-capital-reshuffle-en",
    title: "GLP-1 Is Reshaping Biotech Capital",
    subtitle: "Obesity medicine is pulling capital, BD attention, and valuation imagination away from many traditional biotech stories.",
    summary: "GLP-1 is no longer only a weight-loss topic. It is redirecting biotech capital, BD urgency, manufacturing attention, and valuation imagination across global pharma.",
    figures: [
      ["Capital Is Moving", "GLP-1 assets are redirecting investor attention toward metabolic medicine and away from weaker oncology stories.", ["Obesity demand", "Large pharma urgency", "Pipeline re-rating"]],
      ["From Drug to Ecosystem", "The GLP-1 race now includes formulations, combinations, outcomes, manufacturing, and payer strategy.", ["Oral drugs", "Multi-target biology", "Comorbidity labels"]],
      ["BD Repricing", "Large pharma will pay for differentiated assets that expand the metabolic-disease ecosystem.", ["Upfront competition", "Manufacturing scarcity", "Global commercialization"]],
      ["Investor Question", "The key is not who has a GLP-1 headline, but who has durable evidence and commercial fit.", ["Durability", "Safety", "Supply and access"]]
    ]
  }
];

async function writeUpgrade(item) {
  const sourceDir = path.join(PUBLISHED, item.source);
  const sourceMetaPath = path.join(sourceDir, "meta.json");
  const sourceMeta = await readJson(sourceMetaPath);
  const targetSlug = `${sourceMeta.slug || item.source}-en`;
  const targetDir = path.join(PUBLISHED, targetSlug);
  const imageDir = path.join(targetDir, "images");
  await ensureDir(imageDir);

  for (const [index, figure] of item.figures.entries()) {
    const [title, subtitle, points] = figure;
    await fs.writeFile(
      path.join(imageDir, `figure-${String(index + 1).padStart(2, "0")}-en.svg`),
      svgCard({ title, subtitle, points, accent: index % 2 ? "#265f73" : "#d3752c" })
    );
  }
  await fs.writeFile(
    path.join(imageDir, "cover-en.svg"),
    svgCard({
      label: "Drugnews English",
      title: item.title,
      subtitle: item.summary,
      points: item.tags.slice(0, 4),
      accent: "#a45f2b"
    })
  );

  const meta = {
    title: item.title,
    slug: targetSlug,
    date: sourceMeta.date,
    publish_at: sourceMeta.publish_at,
    category: item.category,
    series: item.category,
    access: sourceMeta.access || "免費文章",
    lang: "en",
    translations: {
      "zh-Hant": zhFileName({ ...sourceMeta, slug: sourceMeta.slug || item.source })
    },
    tags: item.tags,
    summary: item.summary,
    cover_image: "images/cover-en.svg",
    cover_image_alt: item.title,
    source_platform: "Website",
    dcard_url: sourceMeta.dcard_url,
    facebook_url: sourceMeta.facebook_url
  };

  await writeJson(path.join(targetDir, "meta.json"), meta);
  await fs.writeFile(path.join(targetDir, "article.md"), `${item.body.trim()}\n`);

  sourceMeta.lang = sourceMeta.lang || "zh-Hant";
  sourceMeta.slug = sourceMeta.slug || item.source;
  sourceMeta.translations = {
    ...(sourceMeta.translations || {}),
    en: enFileName({ ...sourceMeta, slug: sourceMeta.slug || item.source })
  };
  await writeJson(sourceMetaPath, sourceMeta);
  return targetSlug;
}

async function replaceExistingEnglishImages(item) {
  const dir = path.join(PUBLISHED, item.slug);
  const articlePath = path.join(dir, "article.md");
  const metaPath = path.join(dir, "meta.json");
  const imageDir = path.join(dir, "images");
  await ensureDir(imageDir);

  for (const [index, figure] of item.figures.entries()) {
    const [title, subtitle, points] = figure;
    await fs.writeFile(
      path.join(imageDir, `figure-${String(index + 1).padStart(2, "0")}-en.svg`),
      svgCard({ title, subtitle, points, accent: index % 2 ? "#265f73" : "#d3752c" })
    );
  }
  await fs.writeFile(
    path.join(imageDir, "cover-en.svg"),
    svgCard({
      label: "Drugnews English",
      title: item.title,
      subtitle: item.subtitle,
      points: item.figures.map(([title]) => title).slice(0, 4),
      accent: "#a45f2b"
    })
  );

  let article = await fs.readFile(articlePath, "utf8");
  let imageIndex = 0;
  article = article.replace(/!\[[^\]]*\]\(images\/(?:dcard|facebook)-\d+\.(?:png|jpg|jpeg|webp)\)/giu, () => {
    imageIndex += 1;
    const figure = item.figures[imageIndex - 1] || item.figures[item.figures.length - 1];
    const fileIndex = Math.min(imageIndex, item.figures.length);
    return `![${figure[0]}](images/figure-${String(fileIndex).padStart(2, "0")}-en.svg)`;
  });
  await fs.writeFile(articlePath, article);

  const meta = await readJson(metaPath);
  meta.cover_image = "images/cover-en.svg";
  meta.cover_image_alt = item.title;
  meta.summary = item.summary;
  meta.visual_status = "english_reader_cards";
  meta.visual_updated_at = new Date().toISOString();
  await writeJson(metaPath, meta);

  return `${item.slug}: ${imageIndex} image reference(s) replaced`;
}

async function upgradeObesityFigures() {
  const slug = "obesity-drug-third-place-competition-en";
  const dir = path.join(PUBLISHED, slug);
  const imageDir = path.join(dir, "images");
  await ensureDir(imageDir);
  for (const [index, figure] of obesityFigures.entries()) {
    const [title, subtitle, points] = figure;
    await fs.writeFile(
      path.join(imageDir, `figure-${String(index + 1).padStart(2, "0")}-en.svg`),
      svgCard({ title, subtitle, points, accent: index % 2 ? "#265f73" : "#d3752c" })
    );
  }
  const articlePath = path.join(dir, "article.md");
  let article = await fs.readFile(articlePath, "utf8");
  for (let i = 1; i <= 4; i += 1) {
    const old = new RegExp(`!\\[[^\\]]*\\]\\(images/facebook-0${i}\\.png\\)`, "u");
    const labels = [
      "Product-portfolio battle",
      "A third player needs asymmetry",
      "Pfizer's opening",
      "Roche's two-axis strategy"
    ];
    article = article.replace(old, `![${labels[i - 1]}](images/figure-0${i}-en.svg)`);
  }
  await fs.writeFile(articlePath, article);
}

async function main() {
  const created = [];
  for (const item of upgrades) {
    created.push(await writeUpgrade(item));
  }
  const replaced = [];
  for (const item of existingEnglishFigureUpgrades) {
    replaced.push(await replaceExistingEnglishImages(item));
  }
  await upgradeObesityFigures();
  console.log(`Upgraded English June reader experience for ${created.length} missing article(s).`);
  console.log(created.join("\n"));
  console.log("Localized existing English figures:");
  console.log(replaced.join("\n"));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
