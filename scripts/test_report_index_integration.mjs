// Synthetic public-output fixtures only. This is not ADC content or publication QA.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildSearchReady, schemasOf, reportPublicationIsFuture } from './build_search_ready.mjs';
import { renderProductTemplate, payloadHash } from './render_product_template.mjs';

const root=await fs.mkdtemp(path.join(os.tmpdir(),'drugnews-report-index-test-'));
assert.equal(reportPublicationIsFuture('2026-10-08','2026-10-07T19:00:00Z'),false);
assert.equal(reportPublicationIsFuture('2026-10-09','2026-10-07T19:00:00Z'),true);
assert.equal(reportPublicationIsFuture('2026-10-08T08:00:00+08:00','2026-10-07T19:00:00Z'),true);
assert.equal(reportPublicationIsFuture('2026-10-08T02:00:00+08:00','2026-10-07T19:00:00Z'),false);
try {
 const cfg=JSON.parse(await fs.readFile(new URL('./search-ready/config.json',import.meta.url),'utf8')),origin=cfg.origin;
 const articleURL=origin+'/articles/synthetic-only.html',reportURL=origin+'/reports/synthetic-only.html';
 const originalAI={schema_version:'1.0',citation_guidance:'Synthetic original guidance, unchanged',latest_articles:[{title:'Synthetic original article',url:articleURL,canonical_url:articleURL}]};
 const put=async(route,data)=>{const file=path.join(root,route);await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,data);};
 const html=(url,nodes=[],extra='')=>'<html lang="zh-Hant"><head><link rel="canonical" href="'+url+'"><script type="application/ld+json">'+JSON.stringify({'@context':'https://schema.org','@graph':nodes})+'</script>'+extra+'</head><body><h1>SYNTHETIC TEST ONLY</h1></body></html>';
 const baseArticle={'@type':'NewsArticle',headline:'Synthetic article, not a real story',description:'Unit test only',datePublished:'2026-10-07',inLanguage:'zh-Hant',author:{name:'Synthetic fixture editorial'},image:origin+'/assets/synthetic.png',url:articleURL};
 await put('index.html',html(origin+'/',[{'@type':'Organization',name:'Synthetic fixture',url:origin+'/'},{'@type':'WebSite',name:'Synthetic fixture',url:origin+'/'}]));
 await put('articles/synthetic-only.html',html(articleURL,[baseArticle]));
 await put('assets/synthetic.png','synthetic file-access fixture only; not image visual QA');
 await put('robots.txt','User-agent: *\nAllow: /\n');
 await put('feed.json',JSON.stringify({items:[{url:articleURL}]}));
 await put('ai-index.json',JSON.stringify(originalAI));
 const baseURLs=[origin+'/',articleURL,origin+'/reports/',...cfg.categories.map(c=>c.url)];
 for(const category of cfg.categories)await put(new URL(category.url).pathname.slice(1),html(category.url));
 await put('sitemap.xml','<urlset>'+baseURLs.map(url=>'<url><loc>'+url+'</loc></url>').join('')+'</urlset>');
 const collection=linked=>'<html><head><link rel="canonical" href="'+origin+'/reports/"></head><body>'+(linked?'<a href="synthetic-only.html">Synthetic report fixture</a>':'<p>No published report in this fixture</p>')+'</body></html>';
 await put('reports/index.html',collection(false));
 const now='2026-10-07T12:00:00Z';
 const zero=await buildSearchReady({root,out:path.join(root,'output-zero'),mode:'preview',now});
 assert.equal(zero.citationIndex.articles.filter(a=>a.url===reportURL).length,0);
 assert.deepEqual(JSON.parse(await fs.readFile(path.join(root,'ai-index.json'),'utf8')),originalAI);
 assert.equal(await fs.stat(path.join(root,'output-zero','ai-index.json')).then(()=>true,()=>false),false);
 const sourceSchema={...baseArticle,'@context':'https://schema.org','@type':'Report',headline:'Synthetic report fixture',url:reportURL,isAccessibleForFree:true,citation:['https://example.com/']};
 const payload={title:sourceSchema.headline,author:sourceSchema.author.name,version:'synthetic-test',updated_at:'2026-10-07',source_owner:'synthetic fixture only',language:'zh-Hant',coverage:'full',summary:'Synthetic interface test only',sections:[{id:'synthetic-section',heading:'Synthetic section',body:'Synthetic fixture only'}],references:[{title:'Synthetic source fixture',url:'https://example.com/',date:'2026-10-07'}],revisions:[{version:'synthetic-test',date:'2026-10-07',summary:'Synthetic original version, not publication'}],canonical_url:reportURL,original_report_schema:sourceSchema};
 const qaFor=p=>({independent:true,author_id:'fixture author',reviewer_id:'fixture reviewer',score:100,p0:0,p1:0,article_ai_feel:10,image_ai_feel:[],author_attribution_verified:true,original_report_schema_sha256:payloadHash(p.original_report_schema),payload_sha256:payloadHash(p)});
 const actualRendered=await renderProductTemplate('report',payload,{preview:false,acceptance:qaFor(payload)});
 assert.deepEqual(schemasOf(actualRendered),[sourceSchema]);
 await put('reports/synthetic-only.html',actualRendered);
 await put('reports/index.html',collection(true));
 const realFixture=await buildSearchReady({root,out:path.join(root,'output-actual-fixture'),mode:'preview',now});
 assert.equal(realFixture.citationIndex.articles.filter(a=>a.url===reportURL).length,1);
 const merged=JSON.parse(await fs.readFile(path.join(root,'output-actual-fixture','ai-index.json'),'utf8'));
 assert.equal(merged.latest_articles.filter(a=>a.canonical_url===reportURL).length,1);
 assert.deepEqual(merged.latest_articles.find(a=>a.url===articleURL),originalAI.latest_articles[0]);
 assert.equal(merged.citation_guidance,originalAI.citation_guidance);
 for(const [label,node,extra] of [
   ['future',{...sourceSchema,datePublished:'2026-10-08'},''],
   ['placeholder-author',{...sourceSchema,author:{name:'待原作者交稿'}},''],
   ['noindex',sourceSchema,'<meta name="robots" content="noindex">']
 ]) {
   await put('reports/synthetic-only.html',html(reportURL,[node],extra));
   const result=await buildSearchReady({root,out:path.join(root,'output-'+label),mode:'preview',now});
   assert.equal(result.citationIndex.articles.filter(a=>a.url===reportURL).length,0,label);
   assert.equal(await fs.stat(path.join(root,'output-'+label,'ai-index.json')).then(()=>true,()=>false),false,label);
 }
 console.log('Existing builder integration: actual linked canonical Report enters original AI/citation index once; zero, future, author-placeholder and noindex reports stay out; original article and citation guidance preserved PASS.');
} finally { await fs.rm(root,{recursive:true,force:true}); }
