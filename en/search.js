(async function () {
  const input = document.querySelector('[data-search-input]');
  const list = document.querySelector('[data-search-results]');
  const status = document.querySelector('[data-search-status]');
  const clear = document.querySelector('[data-search-clear]');
  if (!input || !list) return;
  const esc = (v = '') => String(v).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
  const normalize = (v = '') => String(v).toLowerCase().replace(/[\u2010-\u2015]/g, '-').replace(/\s+/g, ' ').trim();
  const aliases = { 'glp-1': ['glp 1', 'glp1', 'tirzepatide', 'semaglutide'], 'bd': ['business development', 'licensing'] };
  let records = [];
  try { records = await (await fetch(document.body.dataset.searchIndex || 'search-index.json', { cache: 'no-store' })).json(); }
  catch (_) { list.innerHTML = '<p class="notice">The search index could not load. Please try again shortly.</p>'; return; }
  function terms(query) { const q = normalize(query); return [...new Set([q, ...(aliases[q] || [])])]; }
  function score(item, query) {
    const fields = [['title', 400], ['tags', 160], ['summary', 50], ['text', 8]];
    let value = 0; const reasons = [];
    for (const term of terms(query)) for (const [field, weight] of fields) {
      const content = Array.isArray(item[field]) ? item[field].join(' ') : item[field] || '';
      if (normalize(content).includes(term)) { value += weight; if (field !== 'text') reasons.push(`${field === 'title' ? 'Title' : field === 'tags' ? 'Tag' : 'Summary'} match: ${term}`); }
    }
    return { item, value, reasons: [...new Set(reasons)] };
  }
  function card({ item, reasons }, rank) { const image = item.image || ''; return `<a class="article-card${image ? ' with-image' : ''}" href="${esc(item.url)}">${image ? `<div class="thumb-wrap"><img class="card-thumb" src="${esc(image)}" alt="${esc(item.imageAlt || item.title)}" loading="lazy"></div>` : ''}<div class="article-card-body"><div class="meta"><span>#${rank + 1}</span><span>${esc(item.date)}</span><span>${esc(item.category || 'Analysis')}</span></div><h3>${esc(item.title)}</h3><p>${esc(item.summary || '')}</p>${reasons.length ? `<div class="reason-row">${reasons.slice(0, 3).map((reason) => `<span>${esc(reason)}</span>`).join('')}</div>` : ''}</div></a>`; }
  function sync(query, mode = 'replace') { const url = new URL(location.href); query ? url.searchParams.set('q', query) : url.searchParams.delete('q'); history[mode === 'push' ? 'pushState' : 'replaceState']({}, '', url); }
  function apply(options = {}) { const query = input.value.trim(); if (!query) { status.hidden = true; clear.hidden = true; list.innerHTML = '<div class="search-idle"><p class="eyebrow">Start a search</p><h3>Search a company, an asset, or a biotech business question.</h3><p>For example: Roche, GLP-1, licensing, or clinical data.</p></div>'; if (options.sync !== false) sync('', options.mode); return; } const ranked = records.map((item) => score(item, query)).filter((entry) => entry.value).sort((a, b) => b.value - a.value || String(b.item.date).localeCompare(String(a.item.date))); status.hidden = false; status.textContent = `${ranked.length} result${ranked.length === 1 ? '' : 's'} for “${query}”`; clear.hidden = false; list.innerHTML = ranked.length ? ranked.slice(0, 12).map(card).join('') : `<div class="search-empty"><h3>No results for “${esc(query)}”</h3><p>Try a company name, drug, therapeutic area, or topic.</p></div>`; if (options.sync !== false) sync(query, options.mode); }
  const initial = new URLSearchParams(location.search).get('q'); if (initial) input.value = initial;
  input.addEventListener('input', () => apply({ sync: false })); input.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); apply({ mode: 'push' }); } }); document.querySelector('[data-search-submit]')?.addEventListener('click', () => apply({ mode: 'push' })); clear?.addEventListener('click', () => { input.value = ''; input.focus(); apply({ mode: 'push' }); }); document.querySelectorAll('[data-query]').forEach((button) => button.addEventListener('click', () => { input.value = button.dataset.query || ''; apply({ mode: 'push' }); })); window.addEventListener('popstate', () => { input.value = new URLSearchParams(location.search).get('q') || ''; apply({ sync: false }); }); apply({ sync: false });
})();
