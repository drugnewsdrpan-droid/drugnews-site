import { readFile, writeFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile("guides/concept-lab.js", "utf8");
const start = source.indexOf("const guideData = ") + "const guideData = ".length;
const end = source.indexOf("\n\n  const params", start);
if (start < 18 || end < 0) throw new Error("Unable to locate guideData");
const guideData = vm.runInNewContext(`(${source.slice(start, end).replace(/;\s*$/, "")})`);

const files = {
  regulatory: "guides/regulatory-milestones.html",
  "safety-cmc": "guides/safety-cmc-risk.html",
  "market-sizing": "guides/market-sizing.html",
  "bd-licensing": "guides/bd-licensing-terms.html",
  "patent-cycle": "guides/patent-competition.html",
  valuation: "guides/biotech-valuation.html",
  "cash-runway": "guides/cash-runway.html"
};
const sequence = [
  ["clinical", "clinical-endpoints.html", "臨床終點怎麼看"],
  ["regulatory", "regulatory-milestones.html", "FDA 法規節點怎麼看"],
  ["safety-cmc", "safety-cmc-risk.html", "安全性與 CMC 風險怎麼看"],
  ["market-sizing", "market-sizing.html", "市場規模怎麼看"],
  ["bd-licensing", "bd-licensing-terms.html", "BD 授權條款怎麼讀"],
  ["patent-cycle", "patent-competition.html", "專利與競爭週期怎麼看"],
  ["valuation", "biotech-valuation.html", "生技估值怎麼做"],
  ["cash-runway", "cash-runway.html", "現金跑道與稀釋怎麼看"]
];

const escape = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");
function elementBounds(html, attributePattern) {
  const openPattern = new RegExp(`<([a-z][a-z0-9-]*)\\b[^>]*${attributePattern}[^>]*>`, "i");
  const open = openPattern.exec(html);
  if (!open) throw new Error(`Element not found: ${attributePattern}`);
  const tag = open[1];
  const tagPattern = new RegExp(`<\\/?${tag}\\b[^>]*>`, "ig");
  tagPattern.lastIndex = open.index;
  let depth = 0;
  let match;
  while ((match = tagPattern.exec(html))) {
    const closing = match[0].startsWith("</");
    const selfClosing = match[0].endsWith("/>");
    if (closing) depth -= 1;
    else if (!selfClosing) depth += 1;
    if (depth === 0) {
      return {
        outerStart: open.index,
        innerStart: open.index + open[0].length,
        innerEnd: match.index,
        outerEnd: match.index + match[0].length
      };
    }
  }
  throw new Error(`Unclosed element: ${attributePattern}`);
}
function replaceInner(html, id, inner) {
  const bounds = elementBounds(html, `id=["']${id}["']`);
  return `${html.slice(0, bounds.innerStart)}${inner}${html.slice(bounds.innerEnd)}`;
}
function replaceText(html, id, text) {
  return replaceInner(html, id, escape(text));
}
function removeByClass(html, className) {
  const classPattern = `class=["'][^"']*\\b${className}\\b[^"']*["']`;
  try {
    const bounds = elementBounds(html, classPattern);
    return `${html.slice(0, bounds.outerStart)}${html.slice(bounds.outerEnd)}`;
  } catch {
    return html;
  }
}

for (const [key, file] of Object.entries(files)) {
  const guide = guideData[key];
  const first = guide.modes[0];
  let html = await readFile(file, "utf8");
  html = replaceText(html, "breadcrumbCurrent", guide.title);
  html = replaceText(html, "lessonPath", guide.path);
  html = replaceText(html, "lessonTitle", guide.title);
  html = replaceText(html, "lessonDeck", guide.deck);
  html = replaceText(html, "lessonNumber", guide.number);
  html = replaceText(html, "labHeading", guide.labHeading);
  html = replaceText(html, "labIntro", guide.labIntro);
  html = replaceText(html, "lessonLead", guide.lead);
  html = replaceText(html, "conceptVisualTitle", first.visual);
  html = replaceText(html, "conceptKicker", first.kicker);
  html = replaceText(html, "conceptTitle", first.title);
  html = replaceText(html, "conceptCopy", first.copy);
  html = replaceText(html, "conceptQuestion", first.question);
  html = replaceText(html, "conceptLimit", first.limit);
  html = replaceText(html, "conceptModeCaption", first.caption || "教學示意圖，非特定公司、產品、試驗結果或通用定量規格；實際判讀須回到原始資料。");
  html = replaceInner(html, "lessonObjectives", guide.objectives.map((item) => `<li>${escape(item)}</li>`).join(""));
  html = replaceInner(html, "conceptTabs", guide.modes.map((item, index) => `<button id="concept-tab-${escape(item.id)}" type="button" role="tab" aria-selected="${index === 0}" aria-controls="conceptPanel" data-mode-index="${index}" tabindex="${index === 0 ? 0 : -1}">${escape(item.label)}<span>${escape(item.sub)}</span></button>`).join(""));
  html = replaceInner(html, "lessonSections", guide.sections.map((section, index) => `<section id="${escape(section.id)}"><p class="lesson-section-number">0${index + 1}</p><h2>${escape(section.title)}</h2><p>${escape(section.body)}</p>${section.example ? `<div class="lesson-example"><strong>投資人應用</strong>${escape(section.example)}</div>` : ""}</section>`).join(""));
  html = replaceInner(html, "lessonSectionNav", guide.sections.map((section) => `<a href="#${escape(section.id)}">${escape(section.title.replace(/：.*/, ""))}</a>`).join(""));
  html = replaceInner(html, "investorChecklist", guide.checklist.map((item, index) => `<li><span>0${index + 1}</span><div><strong>${escape(item)}</strong></div></li>`).join(""));
  html = replaceInner(html, "conceptTerms", guide.terms.map(([term, definition]) => `<div class="concept-term"><strong>${escape(term)}</strong><p>${escape(definition)}</p></div>`).join(""));

  const sourcePanel = `<section class="concept-source-panel" aria-labelledby="guide-source-title"><p class="eyebrow">Source Check</p><h2 id="guide-source-title">參考來源／延伸核對</h2><ul>${guide.sources.map(([name, url, purpose]) => `<li><a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(name)}</a><p>${escape(purpose)}</p></li>`).join("")}</ul></section>`;
  html = removeByClass(html, "concept-source-panel");
  const termsSectionBounds = elementBounds(html, `class=["'][^"']*\\bconcept-terms\\b[^"']*["']`);
  html = `${html.slice(0, termsSectionBounds.outerEnd)}${sourcePanel}${html.slice(termsSectionBounds.outerEnd)}`;

  const index = sequence.findIndex(([courseKey]) => courseKey === key);
  const previous = sequence[index - 1] || ["center", "index.html", "生技投資學習資料庫"];
  const next = sequence[index + 1] || ["database", "taiwan-biotech-clinical-trials.html", "台灣生技臨床資料庫"];
  const pager = `<nav class="course-pager" aria-label="課程前後導覽"><a href="${previous[1]}"><span>上一課</span><strong>${escape(previous[2])}</strong></a><a href="${next[1]}"><span>下一課</span><strong>${escape(next[2])}</strong></a></nav>`;
  html = removeByClass(html, "course-pager");
  const noticeBounds = elementBounds(html, `class=["'][^"']*\\blesson-notice\\b[^"']*["']`);
  html = `${html.slice(0, noticeBounds.outerStart)}${pager}${html.slice(noticeBounds.outerStart)}`;
  await writeFile(file, html);
}

console.log(JSON.stringify({ rendered: Object.values(files) }, null, 2));
