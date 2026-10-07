const text = v => typeof v === 'string' && v.trim().length > 0;
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const idOK = v => typeof v === 'string' && /^[a-z][a-z0-9_-]*$/.test(v);
export const placeholderAuthor = v => !text(v) || /待(?:原)?作者|待交稿|待確認|待提供|author\s+pending|^(?:tbd|todo|unknown|pending|placeholder)$/i.test(v.trim());
export const sectionId = (section, index) => section.id || 'report-section-' + (index + 1);
export const figureSources = figure => [...new Set([figure.source_url, ...(figure.source_urls || [])].filter(Boolean))];
export function reportURL(value) {
  const url = new URL(value);
  if (url.origin !== 'https://drugnews.com.tw' || !/^\/reports\/(?!index\.html$)[a-z0-9][a-z0-9_-]*\.html$/.test(url.pathname) || url.search || url.hash || url.username || url.password) throw new Error('One real canonical report URL is required');
  return url.href;
}
export function checkReportInterfaces(payload, qa, schemaHash) {
  if (placeholderAuthor(payload.author) || qa.author_attribution_verified !== true) throw new Error('Verified real editorial or institutional author is required');
  reportURL(payload.canonical_url);
  const schema = payload.original_report_schema;
  const authorNames = [schema?.author].flat().filter(Boolean).map(a => typeof a === 'string' ? a : a.name).join('、');
  const entityURL = typeof schema?.mainEntityOfPage === 'string' ? schema.mainEntityOfPage : schema?.mainEntityOfPage?.['@id'] || schema?.mainEntityOfPage?.url || schema?.url;
  if (!schema || ![schema['@type']].flat().includes('Report') || qa.original_report_schema_sha256 !== schemaHash || schema.headline !== payload.title || authorNames !== payload.author || entityURL !== payload.canonical_url || typeof schema.datePublished !== 'string' || !/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(schema.datePublished) || !Number.isFinite(Date.parse(schema.datePublished)) || !String(schema.inLanguage || '').startsWith(payload.language) || schema.isAccessibleForFree !== true) throw new Error('Same-source existing Report schema with real author, canonical and publication binding is required');
  const ids = payload.sections.flatMap(s => [s.id, ...(s.aliases || [])]);
  if (ids.some(id => !idOK(id) || id === 'report-revisions') || new Set(ids).size !== ids.length) throw new Error('Explicit unique stable chapter IDs are required');
  if ((payload.published_anchor_ids || []).some(id => !idOK(id) || !ids.includes(id))) throw new Error('Previously published chapter anchors must be preserved');
  const keys = payload.sections.map(s => s.key || s.id);
  if (keys.some(key => !idOK(key)) || new Set(keys).size !== keys.length) throw new Error('Stable section identities must be unique');
  for (const [anchor, key] of Object.entries(payload.published_anchor_map || {})) {
    const section = payload.sections.find(s => s.id === anchor || (s.aliases || []).includes(anchor));
    if (!idOK(anchor) || !section || (section.key || section.id) !== key) throw new Error('Published anchors must keep their original section identity');
  }
  if (!Array.isArray(payload.revisions) || !payload.revisions.length || payload.revisions.some(r => !text(r.version) || !text(r.date) || !text(r.summary)) || payload.revisions.at(-1).version !== payload.version) throw new Error('Actual current-version revision record is required');
  const references = new Set(payload.references.map(r => new URL(r.url).href));
  for (const f of payload.figures || []) {
    const sources = figureSources(f);
    if (!sources.length || sources.some(url => !references.has(new URL(url).href) || new URL(url).protocol !== 'https:')) throw new Error('Each figure needs dated original source links bound to references');
    if (f.kind === 'quantitative') {
      if (['key_info', 'unit', 'period', 'population'].some(k => !text(f[k]))) throw new Error('Quantitative figures need key information, units, period and population');
    } else if (f.kind === 'mechanism') {
      if (!Array.isArray(f.steps) || !f.steps.length || f.steps.some(s => !text(s)) || !text(f.evidence_scope)) throw new Error('Mechanism figures need actual steps and evidence scope');
    } else throw new Error('Actual figure kind must be quantitative or mechanism');
  }
  if ((payload.figures || []).length && !payload.og_image) throw new Error('Illustrated report requires an actual accepted OG image binding');
  if (payload.og_image && (!(payload.figures || []).some(f => f.src === payload.og_image.src) || !text(payload.og_image.alt) || !Number.isInteger(payload.og_image.width) || payload.og_image.width < 1 || !Number.isInteger(payload.og_image.height) || payload.og_image.height < 1)) throw new Error('OG image must bind an accepted original figure and its real dimensions');
}
export function reportFigureInfo(figure, english) {
  const label = english ? ['Key information','Units','Period','Population','Steps','Evidence scope'] : ['關鍵資訊','單位','期間','對象','機制步驟','證據範圍'];
  if (figure.kind === 'quantitative') return '<dl class="figure-data">' + ['key_info','unit','period','population'].map((key,i) => '<dt>'+label[i]+'</dt><dd>'+esc(figure[key])+'</dd>').join('') + '</dl>';
  if (figure.kind === 'mechanism') return '<div class="figure-data"><strong>'+label[4]+'</strong><ol>'+figure.steps.map(s => '<li>'+esc(s)+'</li>').join('')+'</ol><p><strong>'+label[5]+'：</strong>'+esc(figure.evidence_scope)+'</p></div>';
  return '';
}
export function reportHead(payload, preview) {
  if (preview || !payload.canonical_url) return '';
  const url = reportURL(payload.canonical_url), image = payload.og_image;
  const fields = {'og:type':'article','og:title':payload.title,'og:description':payload.summary,'og:url':url,'og:locale':payload.language === 'en' ? 'en_US' : 'zh_TW'};
  if (image) Object.assign(fields, {'og:image':new URL(image.src,url).href,'og:image:alt':image.alt,'og:image:width':image.width,'og:image:height':image.height});
  const originalSchema = JSON.stringify(payload.original_report_schema).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
  return '<link rel="canonical" href="'+esc(url)+'"><meta name="description" content="'+esc(payload.summary)+'">' + Object.entries(fields).map(([key,value])=>'<meta property="'+key+'" content="'+esc(value)+'">').join('') + '<script type="application/ld+json">'+originalSchema+'</script>';
}
export function reportShareControls(url, title, english, chapter = false) {
  const label = english ? (chapter ? 'Share this section' : 'Share report') : (chapter ? '分享本章' : '分享報告');
  return '<div class="report-share" data-report-sharing><button type="button" data-report-share data-share-url="'+esc(url)+'" data-share-title="'+esc(title)+'">'+label+'</button><button type="button" data-report-copy data-share-url="'+esc(url)+'">'+(english?'Copy link':'複製連結')+'</button><a href="'+esc(url)+'">'+(english?'Permalink':'固定連結')+'</a><output role="status" aria-live="polite"></output><input hidden readonly aria-label="'+(english?'URL for manual copy':'供手動複製的網址')+'" value="'+esc(url)+'"></div>';
}
// Report-only adaptation of the original article data-copy-url/clipboard flow.
export function reportShareScript() {
  return '<script>(' + function () {
    const english = document.documentElement.lang === 'en';
    document.querySelectorAll('[data-report-sharing]').forEach(region => {
      const status = region.querySelector('output'), manual = region.querySelector('input');
      const copy = async url => {
        try {
          if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
          await navigator.clipboard.writeText(url);
          manual.hidden = true; status.textContent = english ? 'Link copied' : '連結已複製';
        } catch {
          manual.value = url; manual.hidden = false;
          status.textContent = english ? 'Select this URL to copy manually.' : '請選取下方固定網址手動複製。';
        }
      };
      region.querySelector('[data-report-copy]').addEventListener('click', event => copy(event.currentTarget.dataset.shareUrl));
      region.querySelector('[data-report-share]').addEventListener('click', async event => {
        const button = event.currentTarget, data = {title:button.dataset.shareTitle,url:button.dataset.shareUrl};
        let native = typeof navigator.share === 'function';
        try { if (typeof navigator.canShare === 'function') native = native && navigator.canShare(data); } catch { native = false; }
        if (native) {
          try { await navigator.share(data); status.textContent = english ? 'Handed to the device share menu' : '已交給裝置分享功能'; return; }
          catch (error) { if (error.name === 'AbortError') {status.textContent = english ? 'Share cancelled or unavailable' : '分享已取消或無可用分享目標'; return;} }
        }
        await copy(data.url);
      });
    });
  }.toString() + ')();</script>';
}
