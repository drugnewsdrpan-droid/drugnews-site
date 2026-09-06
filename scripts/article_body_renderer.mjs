// Extracted verbatim from the verified production publisher.
// Shared by page generation and full-body integrity verification.
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isEnglish(item = {}) {
  return /^en\b/i.test(item.lang || item.locale || "");
}

function inlineMarkdown(text) {
  let html = escapeHtml(text);
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,，。！？;:：；]|$)/g, "$1<em>$2</em>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\[([^\]]+)]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  html = html.replace(/\[([^\]]+)]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  const anchors = [];
  html = html.replace(/<a\b[^>]*>.*?<\/a>/g, (anchor) => `@@DRUGNEWS_ANCHOR_${anchors.push(anchor) - 1}@@`);
  html = html.replace(/https?:\/\/[^\s<]+/g, (url) => `<a href="${url}" target="_blank" rel="noopener">${url}</a>`);
  html = html.replace(/@@DRUGNEWS_ANCHOR_(\d+)@@/g, (_, index) => anchors[Number(index)] || "");
  return html;
}

function flushParagraph(paragraph, out) {
  if (!paragraph.length) return;
  out.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
  paragraph.length = 0;
}

function markdownToHtml(markdown, imageMap, options = {}) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  const paragraph = [];
  let list = [];
  let orderedList = [];
  let quote = [];
  let table = [];
  let inCode = false;
  let code = [];

  function flushList() {
    if (!list.length) return;
    out.push(`<ul>${list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
    list = [];
  }

  function flushOrderedList() {
    if (!orderedList.length) return;
    out.push(`<ol>${orderedList.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ol>`);
    orderedList = [];
  }

  function flushQuote() {
    if (!quote.length) return;
    out.push(`<blockquote>${quote.map((item) => `<p>${inlineMarkdown(item)}</p>`).join("")}</blockquote>`);
    quote = [];
  }

  function flushCode() {
    if (!code.length) return;
    out.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
    code = [];
  }

  function isTableRow(value) {
    return /^\|.+\|$/.test(value);
  }

  function isTableSeparator(value) {
    return /^\|\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|$/.test(value);
  }

  function splitTableRow(value) {
    return value
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim());
  }

  function flushTable() {
    if (!table.length) return;
    if (table.length >= 2 && isTableSeparator(table[1])) {
      const headers = splitTableRow(table[0]);
      const rows = table.slice(2).map(splitTableRow);
      out.push(
        `<div class="table-scroll"><table><thead><tr>${headers
          .map((cell) => `<th>${inlineMarkdown(cell)}</th>`)
          .join("")}</tr></thead><tbody>${rows
          .map((row) => `<tr>${headers.map((_, index) => `<td>${inlineMarkdown(row[index] || "")}</td>`).join("")}</tr>`)
          .join("")}</tbody></table></div>`
      );
    } else {
      out.push(...table.map((row) => `<p>${inlineMarkdown(row)}</p>`));
    }
    table = [];
  }

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      if (inCode) {
        flushCode();
        inCode = false;
      } else {
        flushParagraph(paragraph, out);
        flushList();
        flushOrderedList();
        flushQuote();
        flushTable();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      code.push(line);
      continue;
    }

    const trimmed = line.trim();
    const image = trimmed.match(/^!\[([^\]]*)]\(([^)]+)\)$/);
    if (!trimmed) {
      flushParagraph(paragraph, out);
      flushList();
      flushOrderedList();
      flushQuote();
      flushTable();
      continue;
    }
    if (isTableRow(trimmed)) {
      flushParagraph(paragraph, out);
      flushList();
      flushOrderedList();
      flushQuote();
      table.push(trimmed);
      continue;
    }
    flushTable();
    if (image) {
      flushParagraph(paragraph, out);
      flushList();
      flushOrderedList();
      flushQuote();
      const alt = image[1];
      const src = imageMap.get(image[2]) || image[2];
      const imageWidth = Number(options.inline_image_width);
      const imageHeight = Number(options.inline_image_height);
      const hasIntrinsicSize = Number.isFinite(imageWidth) && imageWidth > 0
        && Number.isFinite(imageHeight) && imageHeight > 0;
      const dimensionAttributes = hasIntrinsicSize
        ? ` width="${imageWidth}" height="${imageHeight}"`
        : "";
      const expandable = options.inline_image_viewer === true;
      const figureClass = expandable ? ` class="article-figure article-figure-expandable"` : "";
      const zoomLabel = isEnglish(options)
        ? `Open full-size figure: ${alt}`
        : `放大圖解：${alt}`;
      const zoomButton = expandable
        ? `<button class="article-image-zoom" type="button" aria-label="${escapeHtml(zoomLabel)}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.4-3.4M8 11h6M11 8v6"></path></svg><span>${isEnglish(options) ? "View full size" : "放大閱讀"}</span></button>`
        : "";
      const legacyResponsiveMatch = src.match(/^(.*\/fasedienol-cns-en\/figure-0[1-4])\.png$/);
      const responsiveStem = options.responsive_inline_images === true && /\.png$/i.test(src)
        ? src.replace(/\.png$/i, "")
        : legacyResponsiveMatch?.[1];
      if (responsiveStem) {
        const responsiveWidth = hasIntrinsicSize ? imageWidth : 1672;
        const responsiveHeight = hasIntrinsicSize ? imageHeight : 941;
        out.push(`<figure${figureClass}><picture><source type="image/webp" srcset="${escapeHtml(`${responsiveStem}-720.webp`)} 720w, ${escapeHtml(`${responsiveStem}-1400.webp`)} 1400w" sizes="(max-width: 680px) 100vw, 760px"><img src="${escapeHtml(`${responsiveStem}-1400.webp`)}" alt="${escapeHtml(alt)}" width="${responsiveWidth}" height="${responsiveHeight}" loading="lazy" decoding="async"></picture>${zoomButton}</figure>`);
      } else {
        out.push(`<figure${figureClass}><img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"${dimensionAttributes} loading="lazy" decoding="async">${zoomButton}</figure>`);
      }
      continue;
    }
    if (/^-{3,}$/.test(trimmed)) {
      flushParagraph(paragraph, out);
      flushList();
      flushOrderedList();
      flushQuote();
      out.push("<hr>");
      continue;
    }
    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph(paragraph, out);
      flushList();
      flushOrderedList();
      flushQuote();
      const level = heading[1].length + 1;
      out.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }
    const item = trimmed.match(/^[-*]\s+(.+)$/);
    if (item) {
      flushParagraph(paragraph, out);
      flushOrderedList();
      flushQuote();
      list.push(item[1]);
      continue;
    }
    const orderedItem = trimmed.match(/^\d+\.\s+(.+)$/);
    if (orderedItem) {
      flushParagraph(paragraph, out);
      flushList();
      flushQuote();
      orderedList.push(orderedItem[1]);
      continue;
    }
    const q = trimmed.match(/^>\s?(.+)$/);
    if (q) {
      flushParagraph(paragraph, out);
      flushList();
      flushOrderedList();
      quote.push(q[1]);
      continue;
    }
    flushList();
    flushOrderedList();
    flushQuote();
    paragraph.push(trimmed);
  }
  flushParagraph(paragraph, out);
  flushList();
  flushOrderedList();
  flushQuote();
  flushTable();
  flushCode();
  return out.join("\n").replace(/<\/ol>\s*<ol>/g, "");
}

function normalizeReferenceLists(html) {
  const headingPattern = /(<(?:p|h[23])\b[^>]*>\s*(?:(?:主要)?參考資料|(?:主要)?參考來源|References|Primary Sources)[:：]?\s*<\/(?:p|h[23])>)([\s\S]*?)(?=<h[23]\b|<hr>|<div class="citation-box"|$)/gi;
  return html.replace(headingPattern, (match, heading, section) => {
    if (/<ol\b/i.test(section)) {
      const normalized = section.replace(/<ol(?![^>]*\bclass=)/i, '<ol class="article-reference-list"');
      return `${heading}${normalized}`;
    }
    const paragraphs = [...section.matchAll(/<p>([\s\S]*?)<\/p>/gi)].map((item) => item[1].trim()).filter(Boolean);
    if (!paragraphs.length) return match;
    const groups = [];
    for (const paragraph of paragraphs) {
      if (/^\[?\d+\]?[.:：]?/u.test(paragraph) || !groups.length) groups.push([paragraph]);
      else groups.at(-1).push(paragraph);
    }
    return `${heading}<ol class="article-reference-list">${groups.map((group) => `<li>${group.join(" ")}</li>`).join("")}</ol>\n`;
  });
}

function stripLeadingTitle(markdown, title) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  if (lines[0]?.trim() === `# ${title}`) {
    return lines.slice(1).join("\n").trim();
  }
  return markdown.trim();
}

export { markdownToHtml, normalizeReferenceLists, stripLeadingTitle };

export function renderApprovedBody(markdown, title) {
  const disclaimer = "本文僅供產業研究與知識分享，不構成投資、醫療、募資或個股建議。";
  const body = stripLeadingTitle(String(markdown || "").replace(disclaimer, "").trim(), title);
  return normalizeReferenceLists(markdownToHtml(body, new Map()));
}
