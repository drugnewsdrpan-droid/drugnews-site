/** Read-only live endpoint verification. Run AFTER a reviewed deployment. */
import {canonicalOf,robotsOf,schemasOf,allows} from './build_search_ready.mjs';
const ORIGIN='https://drugnews.com.tw';
const paths=['/','/robots.txt','/sitemap-search.xml','/llms.txt','/search-citation-index.json'];
const results=[],bodies={};
for(const p of paths){
 try{
  const r=await fetch(ORIGIN+p,{signal:AbortSignal.timeout(20000),headers:{'User-Agent':'Drugnews-Search-Ready-Readback/1.0'},redirect:'follow'});
  const content=await r.text();bodies[p]=content;
  results.push({path:p,status:r.status,url:r.url,passed:r.status===200&&new URL(r.url).origin===ORIGIN});
 }catch(e){results.push({path:p,passed:false,error:e.message});}
}
function check(name,ok){results.push({name,passed:Boolean(ok)});}
const home=bodies['/']||'',robots=bodies['/robots.txt']||'';
check('Live homepage canonical',canonicalOf(home)===ORIGIN+'/');
check('Live homepage not noindex',!robotsOf(home).includes('noindex'));
check('Live homepage is new native template',home.includes('search-ready.css')&&!/<iframe\b/.test(home));
check('Live robots allows Googlebot',allows(robots,'Googlebot','/'));
check('Live robots allows OAI-SearchBot',allows(robots,'OAI-SearchBot','/'));
try{check('Live structured data parses',schemasOf(home).length>0);}catch{check('Live structured data parses',false);}
try{check('Live citation index parses',Array.isArray(JSON.parse(bodies['/search-citation-index.json']).articles));}catch{check('Live citation index parses',false);}
console.log(JSON.stringify({scope:'Public HTTP endpoint readback, NOT a verified Googlebot visit, Google indexing status or a ranking report',total:results.length,passed:results.filter(r=>r.passed).length,results},null,2));
if(results.some(r=>!r.passed))process.exitCode=1;
