/** Local output audit. This is NOT Google's Rich Results Test or a ranking score. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {attrs,canonicalOf,robotsOf,schemasOf,allows} from './build_search_ready.mjs';
export async function auditSearchReady(root,mode='production'){
 const html=await fs.readFile(path.join(root,'index.html'),'utf8');
 const robots=await fs.readFile(path.join(root,'robots.txt'),'utf8');
 const index=JSON.parse(await fs.readFile(path.join(root,'search-citation-index.json'),'utf8'));
 const map=await fs.readFile(path.join(root,'sitemap-search.xml'),'utf8');
 const llms=await fs.readFile(path.join(root,'llms.txt'),'utf8');
 const cfg=JSON.parse(await fs.readFile(new URL('./search-ready/config.json',import.meta.url),'utf8'));
 const results=[];const check=(name,ok,detail='')=>results.push({name,passed:Boolean(ok),detail});
 const met=(name,kind='name')=>[...html.matchAll(/<meta\b[^>]*>/gi)].map(x=>attrs(x[0])).find(x=>x[kind]===name)?.content;
 let nodes=[];try{nodes=schemasOf(html);check('JSON-LD parses',true);}catch(e){check('JSON-LD parses',false,e.message);}
 const types=t=>nodes.filter(o=>[o['@type']].flat().includes(t));
 const links=[...html.matchAll(/<a\b[^>]*>/gi)].map(m=>attrs(m[0]).href);
 const resolvedLinks=links.filter(Boolean).map(href=>new URL(href,cfg.origin+'/').href);
 check('Native HTML, no iframe or srcdoc',!/<iframe\b|\bsrcdoc\s*=/i.test(html));
 check('One canonical homepage URL',canonicalOf(html)===cfg.origin+'/'&&[...html.matchAll(/<link\b[^>]*>/gi)].map(m=>attrs(m[0])).filter(x=>x.rel==='canonical').length===1);
 check('Descriptive title',html.includes('<title>'+cfg.title+'</title>'));
 check('Meta description',met('description')===cfg.description);
 check('Responsive viewport',Boolean(met('viewport')?.includes('device-width')));
 check('One visible page H1',(html.match(/<h1\b/gi)||[]).length===1&&html.includes('生技醫藥商業分析'));
 check('Production/preview robots separated',mode==='production'?!/noindex|nofollow/.test(robotsOf(html)):/noindex/.test(robotsOf(html)));
 check('Large image preview permitted only in production',mode!=='production'||robotsOf(html).includes('max-image-preview:large'));
 check('Original publisher retained',types('Organization').length+types('NewsMediaOrganization').length>=1);
 check('Original website retained',types('WebSite').length===1);
 check('Homepage collection schema',types('CollectionPage').length===1);
 const list=types('ItemList')[0];
 check('List count matches rendered items',list?.numberOfItems===list?.itemListElement?.length&&list.numberOfItems>0);
 check('Schema article URLs also occur as links',list?.itemListElement?.every(x=>resolvedLinks.includes(x.url)));
 check('Native homepage entrypoint is one real relative link per article',list?.itemListElement?.every(x=>links.filter(href=>href===new URL(x.url).pathname.slice(1)).length===1&&resolvedLinks.filter(href=>href===x.url).length===1));
 check('Native llms entrypoint is one URL record per public article',index.articles.every(a=>llms.split('\n').filter(line=>line.trim()==='URL: '+a.url).length===1));
 check('All five original categories have HTML links',cfg.categories.every(c=>links.includes(c.url)));
 check('All five descriptions in HTML',cfg.categories.every(c=>html.includes(c.description)));
 check('Author/editorial routes present',links.includes(cfg.origin+'/team.html')&&links.includes(cfg.origin+'/about.html'));
 check('Search works as a link without JavaScript',links.includes(cfg.origin+'/search.html'));
 check('Open Graph canonical URL',met('og:url','property')===cfg.origin+'/');
 check('Open Graph image is absolute HTTPS',/^https:\/\//.test(met('og:image','property')||''));
 check('Twitter card configured',met('twitter:card')==='summary_large_image');
 check('Image has alt/dimensions/priority',/<img\b[^>]*class="feature-image"[^>]*alt="[^"]+"[^>]*fetchpriority="high"/i.test(html));
 check('Hreflang retained',html.includes('hreflang="zh-Hant"')&&html.includes('hreflang="en"'));
 check('Supplemental sitemap is declared',robots.includes('Sitemap: '+cfg.origin+'/sitemap-search.xml'));
 check('Googlebot root allowed',allows(robots,'Googlebot','/'));
 check('Optional citation index uses canonical HTTPS URLs',index.articles.every(a=>a.url.startsWith(cfg.origin+'/articles/')));
 check('Citation index has publication provenance',index.articles.every(a=>a.title&&a.datePublished));
 check('Sitemap contains homepage',map.includes('<loc>'+cfg.origin+'/</loc>'));
 check('No fabricated rating/review schema',types('Review').length===0&&!html.includes('aggregateRating'));
 check('No unresolved template slots',!/@{2}[A-Z_]+@{2}/.test(html));
 for(const file of ['assets/site/search-ready.css','assets/site/search-ready.js']){try{await fs.access(path.join(root,file));check('Asset exists: '+file,true);}catch{check('Asset exists: '+file,false);}}
 return {kind:'Local output contract checks, not search-engine validation',mode,total:results.length,passed:results.filter(x=>x.passed).length,failed:results.filter(x=>!x.passed).length,results,liveIndexingVerified:false,rankingMeasured:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const arg=n=>process.argv.find(x=>x.startsWith(n+'='))?.slice(n.length+1);
 try{const result=await auditSearchReady(path.resolve(arg('--root')||process.cwd()),process.argv.includes('--preview')?'preview':'production');if(arg('--report'))await fs.writeFile(arg('--report'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(result.failed)process.exitCode=1;}catch(e){console.error(e.message);process.exitCode=1;}
}
