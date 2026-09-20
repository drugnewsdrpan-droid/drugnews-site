/**
 * Drugnews search-ready homepage adapter. Node >= 20, no dependencies.
 * Runs AFTER the existing publisher. Reads only the generated public sitemap,
 * public JSON feed, and their canonical HTML; never opens unpublished content.
 * Does not publish, call indexing APIs, or relax existing crawler restrictions.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const htmlEscape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const jsonSafe = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const unescape = s => String(s ?? '').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
const plain = s => unescape(String(s ?? '').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim());
export function attrs(tag) {
  const out = {};
  for (const m of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) out[m[1].toLowerCase()] = unescape(m[2] ?? m[3] ?? m[4]);
  return out;
}
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map(m=>attrs(m[0]));
export const canonicalOf = html => tags(html,'link').find(a=>(a.rel || '').toLowerCase()==='canonical')?.href;
export const robotsOf = html => tags(html,'meta').filter(a=>['robots','googlebot'].includes((a.name||'').toLowerCase())).map(a=>a.content || '').join(',').toLowerCase();
export function schemasOf(html) {
  const out=[];
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if ((attrs(m[1]).type || '').toLowerCase() !== 'application/ld+json') continue;
    const doc=JSON.parse(m[2]);
    if (Array.isArray(doc)) out.push(...doc);
    else if (Array.isArray(doc['@graph'])) out.push(...doc['@graph']);
    else out.push(doc);
  }
  return out;
}
const hasType=(o,t)=>[o?.['@type']].flat().includes(t);
const isArticle=o=>['Article','NewsArticle','BlogPosting','Report','ScholarlyArticle'].some(t=>hasType(o,t));
const urlOf=value=>typeof value==='string'?value:value?.['@id'] || value?.url;
const validDate=s=>typeof s==='string' && /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(s) && Number.isFinite(Date.parse(s));
const dayOf=s=>validDate(s)?s.slice(0,10):'';
const isBlocked=r=>/(?:^|[,\s])(noindex|none)(?:$|[,\s])/.test(r);
const noExcerpt=r=>isBlocked(r)||/(?:^|[,\s])nosnippet(?:$|[,\s])|max-snippet\s*:\s*0(?:$|[,\s])/.test(r);
function safeHttp(u) { try {return ['https:','http:'].includes(new URL(u).protocol);} catch {return false;} }

/** Evaluate RFC-style robots path rules, including wildcard/$, without changing policy. */
export function allows(robots, agent, requestPath) {
  const groups=[];let group=null,seenRules=false;
  for(const raw of robots.split(/\r?\n/)) {
    const line=raw.replace(/#.*/,'').trim(),m=line.match(/^([^:]+):\s*(.*)$/);
    if(!m)continue;const key=m[1].trim().toLowerCase(),val=m[2].trim();
    if(key==='user-agent') { if(!group||seenRules){group={agents:[],rules:[]};groups.push(group);seenRules=false;}group.agents.push(val.toLowerCase()); }
    else if(group&&['allow','disallow'].includes(key)){seenRules=true;if(val)group.rules.push({allow:key==='allow',pattern:val});}
  }
  const score=g=>Math.max(-1,...g.agents.map(a=>a==='*'?0:agent.toLowerCase().includes(a)?a.length:-1));
  const best=Math.max(-1,...groups.map(score));if(best<0)return true;
  const matches=[];
  for(const g of groups.filter(g=>score(g)===best))for(const r of g.rules){
    const expression='^'+r.pattern.split('*').map(x=>x.replace(/[.+?^${}()|[\]\\]/g,'\\$&')).join('.*').replace(/\\\$$/,'$');
    if(new RegExp(expression).test(requestPath))matches.push({...r,length:r.pattern.replace(/\*/g,'').length});
  }
  matches.sort((a,b)=>b.length-a.length||Number(b.allow)-Number(a.allow));return matches[0]?.allow ?? true;
}

async function localFile(root,origin,url) {
  const u=new URL(url,origin);
  if(u.origin!==origin||u.search||u.hash) throw new Error(`Non-canonical/local URL: ${url}`);
  let p=decodeURIComponent(u.pathname);if(p.endsWith('/'))p+='index.html';
  if(/(^|\/)(content|scripts|node_modules|\.git|previews?)(\/|$)/i.test(p)) throw new Error(`Non-public path: ${url}`);
  const f=path.resolve(root,'.'+p);if(!f.startsWith(root+path.sep))throw new Error('Path escapes root');
  const real=await fs.realpath(f);if(!real.startsWith(root+path.sep))throw new Error('Symlink escapes root');return f;
}
async function exists(p){try{await fs.access(p);return true;}catch{return false;}}
async function write(root,p,body){const f=path.join(root,p);await fs.mkdir(path.dirname(f),{recursive:true});await fs.writeFile(f,body);}
async function publishedHomepageMedia(html,leadUrl,root,origin) {
  for(const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const link=attrs(match[1]);
    if(link.id!=='lead-story' || !link.href || new URL(link.href,origin+'/').href!==leadUrl)continue;
    const img=tags(match[2],'img')[0];
    if(!img?.src)throw new Error('Published homepage lead image is missing.');
    const src=new URL(img.src,origin+'/').href;await localFile(root,origin,src);
    const sources=[];
    for(const source of tags(match[2],'source')) {
      if(!source.srcset)continue;
      const entries=[];
      for(const entry of source.srcset.split(',')) {
        const part=entry.trim().match(/^(\S+)(?:\s+(\d+(?:\.\d+)?[wx]))?$/);
        if(!part)throw new Error('Invalid published homepage image srcset.');
        const url=new URL(part[1],origin+'/').href;await localFile(root,origin,url);
        entries.push(url+(part[2]?' '+part[2]:''));
      }
      sources.push({...source,srcset:entries.join(', ')});
    }
    return {src,alt:img.alt,sources};
  }
  return null;
}
async function existingPublicResources(root,origin,robots,publicUrls) {
  let text;try{text=await fs.readFile(path.join(root,'llms.txt'),'utf8');}catch(error){if(error.code==='ENOENT')return [];throw error;}
  const resources=[];
  for(const raw of new Set(text.match(/https?:\/\/[^\s<>()[\]"'`]+/g)||[])) {
    try {
      const url=new URL(raw.replace(/[.,;]+$/,''));
      if(url.origin!==origin || !allows(robots,'Googlebot',url.pathname) || !allows(robots,'OAI-SearchBot',url.pathname))continue;
      if(/\/$|\.html$/i.test(url.pathname) && !publicUrls.has(url.href))continue;
      await localFile(root,origin,url.href);
      resources.push(url.href);
    }catch{}
  }
  return resources;
}
const arrow='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export async function buildSearchReady({root,out,mode='preview',now=new Date().toISOString(),moduleDir=HERE}={}) {
  if(!root||!out)throw new Error('Provide source root and output directory explicitly.');
  if(!['preview','production'].includes(mode))throw new Error('Invalid build mode');
  if(!Number.isFinite(Date.parse(now)))throw new Error('Invalid build clock');
  root=await fs.realpath(path.resolve(root));out=path.resolve(out);
  const config=JSON.parse(await fs.readFile(path.join(moduleDir,'search-ready/config.json'),'utf8'));
  const origin=config.origin;
  const sourceHome=await fs.readFile(path.join(root,'index.html'),'utf8');
  if(canonicalOf(sourceHome)!==origin+'/')throw new Error('Source must be the canonical Drugnews homepage, not an offline preview.');
  // Only replace explicitly unrestricted directives; retain policy by failing closed otherwise.
  const sourceDirectives=robotsOf(sourceHome).replace(/\s*:\s*/g,':').split(/[,\s]+/).filter(Boolean);
  const unrestricted=new Set(['all','index','follow','max-image-preview:large','max-snippet:-1','max-video-preview:-1']);
  const restricted=sourceDirectives.filter(d=>!unrestricted.has(d));
  if(restricted.length)throw new Error(`Source homepage has restrictive or unsupported robots directives: ${restricted.join(', ')}. Refusing to silently relax indexing policy.`);
  if(/<iframe\b/i.test(sourceHome))throw new Error('Do not use the comparison preview as a production input.');
  const robots=await fs.readFile(path.join(root,'robots.txt'),'utf8');
  if(!allows(robots,'Googlebot','/'))throw new Error('Googlebot blocked at root; review existing robots policy first.');
  const feed=JSON.parse(await fs.readFile(path.join(root,'feed.json'),'utf8'));
  if(!Array.isArray(feed.items))throw new Error('feed.json.items must be an array.');
  const siteMap=await fs.readFile(path.join(root,'sitemap.xml'),'utf8');
  if(!/<urlset\b/.test(siteMap))throw new Error('Expected the existing sitemap.xml URL set. Sitemap index requires a reviewed adapter.');
  const candidates=new Set([origin+'/',...feed.items.map(x=>x.url).filter(Boolean),...[...siteMap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>unescape(m[1]))]);
  const feedUrls=new Set(feed.items.map(x=>x.url));
  const pages=[],skipped=[],warnings=[];
  for(const u of candidates){
    try {
      const parsed=new URL(u);if(parsed.origin!==origin||!(/\/$|\.html$/.test(parsed.pathname))||parsed.search||parsed.hash)continue;
      const file=await localFile(root,origin,u),html=await fs.readFile(file,'utf8');
      if(canonicalOf(html)!==u){skipped.push({url:u,reason:'Canonical mismatch/missing'});continue;}
      const directives=robotsOf(html);if(isBlocked(directives)){skipped.push({url:u,reason:'noindex'});continue;}
      if(!allows(robots,'Googlebot',parsed.pathname)){skipped.push({url:u,reason:'Googlebot disallowed'});continue;}
      const nodes=schemasOf(html),article=nodes.find(isArticle);
      if(article){
        if(!validDate(article.datePublished)){skipped.push({url:u,reason:'Missing/invalid publication date'});continue;}
        if(Date.parse(article.datePublished)>Date.parse(now)){skipped.push({url:u,reason:'Future publication'});continue;}
        const entityUrl=urlOf(article.mainEntityOfPage)||article.url;
        if(entityUrl&&entityUrl!==u){skipped.push({url:u,reason:'Article URL mismatch'});continue;}
        if(!article.headline){skipped.push({url:u,reason:'Missing headline'});continue;}
      }
      const page={url:u,file,html,directives,nodes,article,alternates:tags(html,'link').filter(a=>a.hreflang&&a.href)};
      pages.push(page);
    }catch(error){skipped.push({url:u,reason:error.message});}
  }
  const publicUrls=new Set(pages.map(p=>p.url));
  const articles=pages.filter(p=>p.article).sort((a,b)=>Date.parse(b.article.datePublished)-Date.parse(a.article.datePublished)||a.url.localeCompare(b.url));
  const latest=articles.filter(p=>!noExcerpt(p.directives)&&feedUrls.has(p.url)&&!(/-en\.html$/.test(p.url))&&!/^en/i.test(p.article.inLanguage||'')).slice(0,5);
  if(!latest.length)throw new Error('No published canonical Chinese articles in the public feed; refusing an empty or stale fallback homepage.');
  for(const item of config.categories)if(!publicUrls.has(item.url))throw new Error(`Category target is not a canonical indexable public page: ${item.url}`);
  const topicPaths=config.topics.filter(x=>publicUrls.has(x.url));
  for(const x of config.topics)if(!publicUrls.has(x.url))warnings.push(`Topic omitted until validated: ${x.url}`);
  const lead=latest[0],a=lead.article;
  const homepageMedia=await publishedHomepageMedia(sourceHome,lead.url,root,origin);
  let heroImg=homepageMedia?.src || [a.image].flat().map(urlOf).find(safeHttp);
  if(!heroImg)throw new Error('Lead article lacks an existing public image.');
  if(new URL(heroImg).origin!==origin)throw new Error('Lead image must belong to the original site.');
  let heroLocal=await localFile(root,origin,heroImg);
  // Reuse responsive WebP files only when they already exist; no regenerated artwork.
  let small=heroImg,large=heroImg;
  if(!homepageMedia && /cover(?:-\d+)?\.(png|webp|jpe?g)$/i.test(heroImg)){
    const prefix=heroImg.replace(/cover(?:-\d+)?\.(png|webp|jpe?g)$/i,'');
    for(const [size,name] of [[720,'small'],[1400,'large']]){
      const url=prefix+`cover-${size}.webp`;
      try{await localFile(root,origin,url);if(name==='small')small=url;else large=url;}catch{}
    }
  }
  const heroAttrs=tags(lead.html,'img').find(x=>x.alt && /cover(?:-\d+)?\.(?:webp|png|jpe?g)/i.test(x.src||''))||{};
  const imgAlt=homepageMedia?.alt ?? (heroAttrs.alt||a.headline+'｜文章封面');
  const imageSources=homepageMedia
    ? homepageMedia.sources.map(s=>`<source${s.media?` media="${htmlEscape(s.media)}"`:''}${s.type?` type="${htmlEscape(s.type)}"`:''} srcset="${htmlEscape(s.srcset)}">`).join('')
    : `<source media="(max-width: 700px)" srcset="${htmlEscape(small)}">`;
  const title=String(a.headline),opening=title.match(/^([A-Za-z][A-Za-z0-9-]{2,35})\s+([\s\S]+)$/);
  const titleHTML=opening?`<span class="drugname" lang="en">${htmlEscape(opening[1])}</span><span class="title-text">${htmlEscape(opening[2])}</span>`:htmlEscape(title);
  const excerpt=String(a.description||feed.items.find(x=>x.url===lead.url)?.summary||'');
  const articleHref=url=>htmlEscape(new URL(url).pathname.slice(1));
  const leadUrl=articleHref(lead.url),heroDate=dayOf(a.datePublished);
  const feature=`<article id="feature"><a class="lead-feature" id="lead-story" href="${leadUrl}" aria-label="閱讀：${htmlEscape(title)}"><div class="feature-art"><div class="art-topline"><span>DRUGNEWS · 精選分析</span><time datetime="${htmlEscape(a.datePublished)}">${heroDate.replaceAll('-','.')}</time></div><picture>${imageSources}<img class="feature-image" src="${htmlEscape(large)}" width="1672" height="941" alt="${htmlEscape(imgAlt)}" fetchpriority="high" decoding="async" loading="eager"></picture><div class="art-bottomline"><span>原創商業分析</span><span class="art-open">${arrow}</span></div></div><div class="feature-copy"><div class="feature-meta"><span class="tag">商業分析</span><span>精選文章</span></div><h2>${titleHTML}</h2><p class="lede">${htmlEscape(excerpt)}</p><div class="feature-actions"><span class="read-button">閱讀全文 ${arrow}</span><span class="section-wordmark">Drugnews Analysis</span></div></div></a></article>`;
  const recent=latest.slice(1).map((p,i)=>`<a class="news-card" href="${articleHref(p.url)}"><div class="news-meta"><time datetime="${htmlEscape(p.article.datePublished)}">${dayOf(p.article.datePublished).replaceAll('-','.')}</time><span class="news-number" aria-hidden="true">${String(i+1).padStart(2,'0')}</span></div><h3>${htmlEscape(p.article.headline)}</h3><span class="news-cta">閱讀文章 <span class="arrow">${arrow}</span></span></a>`).join('\n');
  // All five category descriptions and real links exist in source HTML, not a JS string.
  const series=`<div class="series-tabs" role="tablist" aria-label="內容系列" aria-orientation="vertical">${config.categories.map((c,i)=>`<button class="series-tab${i===0?' is-active':''}" role="tab" id="series-tab-${i}" aria-controls="series-panel-${i}" aria-selected="${i===0}" tabindex="${i===0?'0':'-1'}" data-series="${i}"><span class="series-index">${htmlEscape(c.number)}</span><span class="series-name">${htmlEscape(c.title)}</span><span class="circle-arrow">${arrow}</span></button>`).join('')}</div><div class="series-panels">${config.categories.map((c,i)=>`<section class="series-panel" id="series-panel-${i}" role="tabpanel" aria-labelledby="series-tab-${i}" tabindex="0"><span class="panel-number" aria-hidden="true">${htmlEscape(c.number)}</span><p class="eyebrow">Drugnews · 閱讀路徑</p><h3>${htmlEscape(c.title)}</h3><p class="description">${htmlEscape(c.description)}</p><a class="series-link" href="${htmlEscape(c.url)}">進入${htmlEscape(c.title)} ${arrow}</a></section>`).join('')}</div>`;
  const topicHtml=topicPaths.map(t=>`<a class="topic-path" href="${htmlEscape(t.url)}"><h3>${htmlEscape(t.title)} ↗</h3><p>${htmlEscape(t.description)}</p></a>`).join('');

  const originalNodes=schemasOf(sourceHome);
  const org=originalNodes.find(o=>hasType(o,'Organization')||hasType(o,'NewsMediaOrganization'));
  const website=originalNodes.find(o=>hasType(o,'WebSite'));
  if(!org||!website)throw new Error('Expected original brand and website JSON-LD; refusing to invent a publisher.');
  const graph=originalNodes.filter(o=>!hasType(o,'ItemList')&&!hasType(o,'WebPage')&&!hasType(o,'CollectionPage'));
  const listId=origin+'/#latest-analysis',pageId=origin+'/#webpage';
  graph.push({'@type':'CollectionPage','@id':pageId,url:origin+'/',name:config.title,description:config.description,inLanguage:'zh-Hant-TW',isPartOf:{'@id':website['@id']||origin+'/#website'},publisher:{'@id':org['@id']||origin+'/#organization'},mainEntity:{'@id':listId},about:config.topics.map(t=>({'@type':'Thing',name:t.title}))});
  graph.push({'@type':'ItemList','@id':listId,name:'藥時事最新分析',numberOfItems:latest.length,itemListElement:latest.map((p,i)=>({'@type':'ListItem',position:i+1,url:p.url,name:p.article.headline}))});
  let oldHead=(sourceHome.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)||[])[1]||'';
  oldHead=oldHead.replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi,'').replace(/<script\b([^>]*)>[\s\S]*?<\/script>/gi,(tag,attr)=>attrs(attr).type==='application/ld+json'?'':tag);
  oldHead=oldHead.replace(/<meta\b[^>]*>/gi,tag=>{const x=attrs(tag),n=(x.name||'').toLowerCase(),p=x.property||'';return x.charset||['viewport','description','robots','keywords','referrer'].includes(n)||n.startsWith('twitter:')||p.startsWith('og:')?'':tag;});
  oldHead=oldHead.replace(/<link\b[^>]*>/gi,tag=>{const x=attrs(tag);return x.rel==='canonical'||x.rel==='preload'||(x.rel==='stylesheet'&&/(?:^|\/)(?:styles|science-media|search-ready)\.css/.test(x.href||''))||(x.type==='application/json'&&/search-citation-index/.test(x.href||''))?'':tag;});
  const directives=mode==='production'?'index,follow,max-image-preview:large':'noindex,nofollow';
  let head=`<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${htmlEscape(config.title)}</title><meta name="description" content="${htmlEscape(config.description)}"><meta name="robots" content="${directives}"><meta name="referrer" content="strict-origin-when-cross-origin"><link rel="canonical" href="${origin}/">${oldHead}<meta property="og:type" content="website"><meta property="og:site_name" content="Drugnews｜藥時事"><meta property="og:locale" content="zh_TW"><meta property="og:title" content="${htmlEscape(config.title)}"><meta property="og:description" content="${htmlEscape(config.description)}"><meta property="og:url" content="${origin}/"><meta property="og:image" content="${htmlEscape(large)}"><meta property="og:image:alt" content="${htmlEscape(imgAlt)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${htmlEscape(config.title)}"><meta name="twitter:description" content="${htmlEscape(config.description)}"><meta name="twitter:image" content="${htmlEscape(large)}"><link rel="stylesheet" href="/assets/site/search-ready.css"><link rel="alternate" type="application/json" title="Drugnews public citation index" href="${origin}/search-citation-index.json"><script type="application/ld+json">${jsonSafe({'@context':'https://schema.org','@graph':graph})}</script>`;
  // Existing tag restrictions on Googlebot are never removed or relaxed.
  if(/noindex|nosnippet/.test(robotsOf(head))) {if(mode==='production')throw new Error('Restrictive bot directive retained from original head; review before production.');}
  let scripts='<script defer src="/assets/site/search-ready.js"></script>';
  let template=await fs.readFile(path.join(moduleDir,'search-ready/home-template.html'),'utf8');
  const slots={HEAD:head,BRAND_INTRO:htmlEscape(config.brandIntro),FEATURE:feature,RECENT:recent,SERIES:series,TOPIC_PATHS:topicHtml,SCRIPTS:scripts};
  for(const [key,value] of Object.entries(slots))template=template.replaceAll(`@@${key}@@`,value);
  if(/@@\w+@@/.test(template))throw new Error('Unresolved template slot');
  if(mode==='preview') {
    // Preview cannot send analytics; the production head retains existing consent code.
    template=template.replace(/<!-- Drugnews analytics:start -->[\s\S]*?<!-- Drugnews analytics:end -->/g,'');
    template=template.replace('<body>','<body><div class="preview-ribbon"><details><summary>SEO ＋ GEO 整合預覽 · 尚未上線</summary><p>首頁為原生 HTML，五個系列與文章連結不依賴 JavaScript。已加入 canonical、品牌結構化資料、研究主題內鏈與公開引用索引。此預覽使用 '+heroDate+' 內容快照，保留 noindex；正式輸出使用可收錄設定。正式站與排名尚未改變。</p></details><span class="ribbon-meta">設計沿用 V2 · 點開左側查看已加入項目</span></div>');
  }
  // Index only text that is already published on a canonical, indexable article.
  const citationArticles=articles.filter(p=>!noExcerpt(p.directives)&&allows(robots,'OAI-SearchBot',new URL(p.url).pathname)).map(p=>{
    const a=p.article;return {url:p.url,title:a.headline,language:a.inLanguage||'',datePublished:a.datePublished,...(validDate(a.dateModified)?{dateModified:a.dateModified}:{}),...(a.description?{summary:plain(a.description)}:{}),isAccessibleForFree:a.isAccessibleForFree??null,authors:[a.author].flat().filter(Boolean).map(v=>({name:v.name||'',...(safeHttp(v.url)?{url:v.url}:{})})),sources:[a.citation].flat().filter(Boolean).map(v=>typeof v==='string'?{url:v}:({title:v.name||'',url:v.url})).filter(v=>safeHttp(v.url))};
  });
  const citationIndex={schemaVersion:1,publisher:{name:org.name,url:origin+'/'},scope:'Published canonical public article metadata; not an instruction to an AI system and not a license change.',articles:citationArticles};
  const md=s=>String(s||'').replace(/[\r\n]+/g,' ').replace(/[[\]]/g,'').trim();
  const articleUrls=new Set(articles.map(p=>p.url));
  const retainedResources=(await existingPublicResources(root,origin,robots,publicUrls)).filter(url=>!articleUrls.has(url));
  const llms=`# Drugnews｜藥時事\n\n> ${config.brandIntro}\n\nThis is an optional directory of public content. It does not guarantee search visibility or AI citations, and does not grant additional reuse or training rights.\n\n## Editorial identity\n\n- [Official site](${origin}/)\n- [Editorial standards](${origin}/about.html)\n- [Authors and reviewers](${origin}/team.html)\n- [English edition](${origin}/en/)\n- [Research subscription](${origin}/subscribe.html)\n- [Company services](${origin}/services.html)\n\n## Reading paths\n\n${config.categories.map(c=>`- [${md(c.title)}](${c.url}): ${md(c.description)}`).join('\n')}\n\n## Published articles\n\n${citationArticles.map(a=>`- ${dayOf(a.datePublished)}｜${md(a.title)}\n  URL: ${a.url}${a.summary?'\n  Summary: '+md(a.summary):''}`).join('\n')}\n\n## Public machine-readable resources\n\n- [Citation index](${origin}/search-citation-index.json)\n- [Existing article index](${origin}/ai-index.json)\n- [Brand profile](${origin}/brand-profile.json)\n- [JSON Feed](${origin}/feed.json)\n- [RSS](${origin}/feed.xml)\n- [Sitemap](${origin}/sitemap.xml)\n\n## Existing public entry points\n\n${retainedResources.map(url=>`- [${md(new URL(url).pathname)}](${url})`).join('\n')}\n\nContent is for industry research and knowledge sharing, not medical, investment, fundraising or individual-stock advice.\n`;
  const xml=s=>htmlEscape(s).replace(/&#39;/g,'&apos;');
  const mapPages=pages.filter(p=>new URL(p.url).pathname!=='/search.html'&&!/\/search\.html$/.test(p.url));
  const supplemental='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'+mapPages.map(p=>{
    const date=p.article?.dateModified||p.article?.datePublished;
    const alts=p.alternates.filter(a=>publicUrls.has(a.href));
    return '  <url><loc>'+xml(p.url)+'</loc>'+(validDate(date)?'<lastmod>'+xml(date)+'</lastmod>':'')+alts.map(a=>'<xhtml:link rel="alternate" hreflang="'+xml(a.hreflang)+'" href="'+xml(a.href)+'"/>').join('')+'</url>';
  }).join('\n')+'\n</urlset>\n';
  const sitemapLine=`Sitemap: ${origin}/sitemap-search.xml`;
  let nextRobots=robots.endsWith('\n')?robots:robots+'\n';if(!nextRobots.includes(sitemapLine))nextRobots+='\n# Supplementary verified canonical public URLs\n'+sitemapLine+'\n';
  if(!allows(robots,'OAI-SearchBot','/'))warnings.push('OAI-SearchBot is blocked by existing policy. Review policy; the adapter did not override it.');
  const elapsed=(Date.parse(now)-Date.parse(a.datePublished))/86400000;
  if(elapsed>7)warnings.push(`Most recent source article is ${Math.floor(elapsed)} days old. Check scheduled publishing; no fabricated freshness was added.`);
  for(const p of articles){
    if(!p.article.author)warnings.push(`Article author missing: ${p.url}`);
    if(!p.article.description)warnings.push(`Article description missing: ${p.url}`);
    if(![p.article.citation].flat().filter(Boolean).length)warnings.push(`Structured references absent; verify visible source links: ${p.url}`);
  }
  await fs.mkdir(out,{recursive:true});
  await write(out,'index.html',template);
  await write(out,'search-citation-index.json',JSON.stringify(citationIndex,null,2)+'\n');
  await write(out,'llms.txt',llms);
  await write(out,'sitemap-search.xml',supplemental);
  await write(out,'robots.txt',nextRobots);
  const assetRoot=path.resolve(moduleDir,'../assets/site');
  for(const filename of ['search-ready.css','search-ready.js'])await write(out,'assets/site/'+filename,await fs.readFile(path.join(assetRoot,filename)));
  const report={mode,generatedAt:now,sourceRoot:root,outputRoot:out,homepageLead:lead.url,renderedArticles:latest.length,canonicalPagesExamined:pages.length,articleMetadataEntries:citationArticles.length,sitemapEntries:mapPages.length,originalArticleFilesModified:0,originalSitemapModified:false,trainingCrawlerPolicyChanged:false,productionDeployed:false,liveIndexingVerified:false,searchConsoleRead:false,bingWebmasterRead:false,warnings,skipped};
  return {html:template,report,citationIndex};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const arg=name=>process.argv.find(x=>x.startsWith(name+'='))?.slice(name.length+1);
  const root=path.resolve(arg('--root')||process.cwd());
  const out=arg('--out')||(process.argv.includes('--write')?root:null);
  if(!out){console.error('Usage: node scripts/build_search_ready.mjs --production --write [--root=...] OR --out=...');process.exitCode=1;}
  else try{
    const result=await buildSearchReady({root,out,mode:process.argv.includes('--production')?'production':'preview',now:arg('--now')||process.env.DRUGNEWS_NOW||new Date().toISOString()});
    if(arg('--report'))await fs.writeFile(arg('--report'),JSON.stringify(result.report,null,2)+'\n');
    console.log(JSON.stringify(result.report,null,2));
  }catch(error){console.error('Search-ready build failed:',error.message);process.exitCode=1;}
}
