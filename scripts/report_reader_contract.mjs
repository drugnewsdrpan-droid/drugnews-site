import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const techFile=/\.(?:json|csv|tsv|txt|md|svg|py|mjs|xlsx?|zip)(?:$|[?#])/i;
const producerLanguage=/\b(?:CONTENT_PASS_LOCKED|REVIEW_BINDING|P0\s*[=:]|P1\s*[=:]|HTTP\s*403|independent\s+QA|editorial\s+draft|this\s+(?:round|iteration)|R[123]\s+(?:Excel|CSV|JSON))\b|本輪|圖文整合稿|獨立\s*QA|原文讀回|擷取文字第\d|ADC-\d{8}-R\d/i;
const textOnly=html=>String(html).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const attr=(tag,name)=>tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`,'i'))?.[1]||'';
const links=html=>[...html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'').matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/gi)].map(m=>({tag:m[0],href:attr(m[0],'href'),label:textOnly(m[0])}));
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const safe=rel=>{if(!rel||path.isAbsolute(rel)||rel.includes('\\')||rel.split('/').some(p=>!p||p==='.'||p==='..'))throw Error('REPORT_READER_PATH_INVALID');return rel;};

export function reportReaderErrors(html,language,canonical) {
  const errors=[],visible=textOnly(html),allLinks=links(html);
  if(producerLanguage.test(visible))errors.push('READER_INTERNAL_PRODUCTION_LANGUAGE');
  if(allLinks.some(a=>techFile.test(a.href)||/^(?:SVG|PNG|manifest|[\w.-]+\.(?:json|csv|txt|md))$/i.test(a.label)))errors.push('READER_TECHNICAL_DOWNLOAD_ENTRY');
  if((html.match(/<h1(?:\s|>)/gi)||[]).length!==1)errors.push('READER_ONE_H1_REQUIRED');
  const documentLanguage=attr(html.match(/<html\b[^>]*>/i)?.[0]||'','lang');
  if(language==='en'?!documentLanguage.startsWith('en'):!documentLanguage.startsWith('zh'))errors.push('READER_LANGUAGE_MISMATCH');
  const switchLinks=allLinks.filter(a=>/data-report-language-switch/.test(a.tag));
  if(switchLinks.length!==1||!switchLinks[0].href.includes('/reports/'))errors.push('READER_SINGLE_LANGUAGE_SWITCH_REQUIRED');
  const images=[...html.matchAll(/<img\b[^>]*>/gi)].map(m=>m[0]);
  if(images.some(img=>!attr(img,'alt').trim()))errors.push('READER_FIGURE_ALT_REQUIRED');
  const evidence=allLinks.filter(a=>/^https:\/\//.test(a.href)&&!a.href.startsWith('https://drugnews.com.tw/')&&a.label&&!techFile.test(a.href));
  if(!evidence.length)errors.push('READER_NAMED_EXTERNAL_REFERENCES_REQUIRED');
  const shares=[...html.matchAll(/<button\b[^>]*data-report-(?:copy|share)\b[^>]*>/gi)].map(m=>m[0]);
  if(shares.length<2||shares.some(tag=>!attr(tag,'data-share-url').startsWith(canonical)))errors.push('READER_CANONICAL_SHARE_CONTROLS_REQUIRED');
  for(const tag of shares){const url=attr(tag,'data-share-url'),hash=url.includes('#')?url.split('#')[1]:'';if(hash&&!new RegExp(`\\bid=["']${hash.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}["']`).test(html))errors.push('READER_SHARE_ANCHOR_MISSING');}
  return [...new Set(errors)];
}
export function collectionLanguageErrors(html,language) {
  const cards=[...html.matchAll(/<article\b[^>]*class=["'][^"']*product-path[^"']*["'][^>]*>([\s\S]*?)<\/article>/gi)].map(m=>m[1]);
  const reports=cards.flatMap(links).filter(a=>/\/reports\/[^/]+\.html/.test(a.href));
  return reports.some(a=>language==='en'?!/-en\.html$/.test(a.href):/-en\.html$/.test(a.href))?['READER_COLLECTION_MIXED_LANGUAGE']:[];
}
async function registry(file){const value=JSON.parse(await fs.readFile(file,'utf8'));if(value.schema!=='drugnews-report-reader-assets/v1'||!Array.isArray(value.reports))throw Error('REPORT_READER_REGISTRY_INVALID');return value;}
async function files(root,rel=''){const out=[];for(const e of await fs.readdir(path.join(root,rel),{withFileTypes:true})){const name=path.posix.join(rel,e.name);if(e.isDirectory())out.push(...await files(root,name));else if(e.isFile())out.push(name);else throw Error('REPORT_READER_NON_REGULAR_ASSET');}return out;}
export async function prepareReportReaderAssets(root,registryFile) {
  const stat=await fs.lstat(root),realRoot=await fs.realpath(root);
  if(path.basename(root)!=='_site'||!stat.isDirectory()||stat.isSymbolicLink())throw Error('REPORT_READER_COPIED_ARTIFACT_REQUIRED');
  const cfg=await registry(registryFile);let retained=0,excluded=0;
  for(const report of cfg.reports){
    const assetRoot=safe(report.asset_root),allowed=new Map(report.reader_assets.map(a=>[safe(a.path),a]));
    if(!assetRoot.startsWith('assets/reports/')||!allowed.size)throw Error('REPORT_READER_ASSET_SCOPE_INVALID');
    if(!(await fs.realpath(path.join(root,assetRoot))).startsWith(realRoot+path.sep))throw Error('REPORT_READER_ASSET_OUTSIDE_COPY');
    for(const rel of await files(path.join(root,assetRoot))){
      const file=path.join(root,assetRoot,rel),entry=allowed.get(rel);
      if(!entry){await fs.unlink(file);excluded++;continue;}
      const b=await fs.readFile(file);if(b.length!==entry.bytes||digest(b)!==entry.sha256)throw Error('REPORT_READER_ORIGINAL_ASSET_MISMATCH');retained++;
    }
    for(const rel of allowed.keys())await fs.access(path.join(root,assetRoot,rel));
  }
  return {reader_assets_retained:retained,internal_artifacts_excluded_from_copied_site:excluded,source_checkout_unchanged:true};
}
export async function auditReportReaders(root,registryFile) {
  const cfg=await registry(registryFile),errors=[];let pages=0;
  for(const report of cfg.reports){
    for(const rel of report.pages){const html=await fs.readFile(path.join(root,safe(rel)),'utf8'),english=/-en\.html$/.test(rel);errors.push(...reportReaderErrors(html,english?'en':'zh-Hant','https://drugnews.com.tw/'+rel).map(reason=>({path:rel,reason})));pages++;}
    const allowed=new Map(report.reader_assets.map(a=>[safe(a.path),a]));
    for(const rel of await files(path.join(root,safe(report.asset_root)))){
      const row=allowed.get(rel);if(!row){errors.push({path:report.asset_root+'/'+rel,reason:'READER_INTERNAL_ARTIFACT_PUBLIC'});continue;}
      const b=await fs.readFile(path.join(root,report.asset_root,rel));if(digest(b)!==row.sha256||b.length!==row.bytes)errors.push({path:report.asset_root+'/'+rel,reason:'READER_ORIGINAL_FIGURE_CHANGED'});
    }
  }
  for(const [rel,lang]of [['reports/index.html','zh-Hant'],['en/reports/index.html','en']]){
    const html=await fs.readFile(path.join(root,rel),'utf8');errors.push(...collectionLanguageErrors(html,lang).map(reason=>({path:rel,reason})));
  }
  const enHome=await fs.readFile(path.join(root,'en/index.html'),'utf8');
  if(!links(enHome).some(a=>/^(?:\.\/)?reports\/$|^\/en\/reports\/$|^https:\/\/drugnews\.com\.tw\/en\/reports\/$/.test(a.href)))errors.push({path:'en/index.html',reason:'READER_ENGLISH_REPORTS_ENTRY_REQUIRED'});
  if(errors.length)throw Object.assign(Error('REPORT_READER_PRODUCT_GATE_FAILED'),{failures:errors});
  return {status:'pass',report_pages:pages,scope:'Readerlanguage/technical-entry/producer-language/citation/figure/sharecontracts only; notarticle orimage AI Feel orhuman visualQA.'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const option=name=>process.argv.find(v=>v.startsWith(name+'='))?.slice(name.length+1);
  const root=path.resolve(option('--root')||'_site'),file=path.resolve(option('--registry')||'content/report-reader-assets.json');
  (process.argv[2]==='prepare'?prepareReportReaderAssets(root,file):auditReportReaders(root,file)).then(r=>console.log(JSON.stringify(r))).catch(e=>{console.error(JSON.stringify({status:'fail',reason:e.message,failures:e.failures||[]}));process.exitCode=1;});
}
