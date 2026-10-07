import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {reportURL, reportHead, reportShareControls, reportShareScript} from './report_interface.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const binding = rows => sha(rows.toSorted((a,b)=>a.relative_path < b.relative_path ? -1 : a.relative_path > b.relative_path ? 1 : 0).map(f=>f.relative_path+'\t'+f.sha256+'\n').join(''));
const evidenceNames = new Set(['source_evidence.json','source_evidence.csv','coverage.json','coverage.csv','coverage.md','claim_locations.json']);
const interfaceCSS = '.report-share{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:14px 0 22px;font-size:14px;line-height:1.6}.report-share button{font:inherit;color:var(--teal);background:#fff;border:1px solid var(--line);border-radius:5px;padding:8px 12px;cursor:pointer}.report-share button:focus-visible{outline:3px solid #bd812c;outline-offset:3px}.report-share output{flex-basis:100%;color:var(--muted)}.report-share input{width:100%;min-width:0;font:inherit;padding:8px}.publisher-release{font-size:14px;color:var(--muted);margin:14px 0}.publisher-links{display:flex;gap:18px;flex-wrap:wrap;font-size:14px;margin:18px 0}';

async function verifiedRecord(record) {
  const bytes = await fs.readFile(record.path);
  if (bytes.length !== record.bytes || sha(bytes) !== record.sha256) throw Error('Source bytes/hash mismatch: '+record.path);
  return bytes;
}

export function validateQualifiedReportGate(qa, publicationDate) {
  const date=new Date(publicationDate+'T00:00:00+08:00');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(publicationDate) || !Number.isFinite(date.getTime())) throw Error('Actual first-publication day required');
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date).map(p=>[p.type,p.value]));
  if (`${parts.year}-${parts.month}-${parts.day}` !== publicationDate) throw Error('Invalid Taipei calendar day');
  if (qa.status !== 'COMPLETED_INDEPENDENT_QA' || qa.verdict !== 'PASS_FULL_ZH_EN_REPORT_CONTENT_GATE' || qa.whole_report_PASS_not_only_local_cell !== true || qa.P0 !== 0 || qa.P1 !== 0 || !Number.isFinite(qa.overall_quality_score_per_language) || qa.overall_quality_score_per_language < 95 || qa.overall_quality_score_per_language > 100 || qa.article_and_image_AI_feel_max?.all_within20 !== true || qa.reviewer?.author_or_integrator !== false) throw Error('Genuine same-version independent full-report gate required');
}

/** Adapt a qualified complete source HTML without reconstructing its report body. */
export async function integrateQualifiedReport({handoffPath, root, publicationDate, receiverThreadId}) {
  root = path.resolve(root);
  const handoff = JSON.parse(await fs.readFile(handoffPath,'utf8'));
  if (handoff.receiver_thread_id !== receiverThreadId || handoff.content_id !== 'Drugnews_ADC_20261007') throw Error('Original publisher/content binding required');
  const lock = JSON.parse(await verifiedRecord(handoff.LOCK));
  const qa = JSON.parse(await verifiedRecord(handoff.independent_QA));
  await verifiedRecord(handoff.payload_manifest);
  validateQualifiedReportGate(qa, publicationDate);
  if (lock.state !== 'CONTENT_PASS_LOCKED') throw Error('Accepted original LOCK required');
  const rows = lock.files, payload = path.resolve(handoff.payload_root);
  if (rows.length !== 98 || lock.version !== qa.version || lock.version !== handoff.version) throw Error('Qualified original version required');
  for (const record of rows) {
    if (path.resolve(payload,record.relative_path) !== record.path || record.relative_path.startsWith('../')) throw Error('Unsafe source path');
    await verifiedRecord(record);
  }
  const reviewBinding = binding(rows), evidenceBinding = binding(rows.filter(r=>r.relative_path.startsWith('evidence/') || evidenceNames.has(r.relative_path)));
  if ([lock,qa,handoff].some(x=>x.REVIEW_BINDING !== reviewBinding || x.EVIDENCE_BINDING !== evidenceBinding)) throw Error('Same-source report/evidence binding mismatch');

  const base = '/assets/reports/adc-20261007/';
  const urls = {ZH:reportURL('https://drugnews.com.tw/reports/adc-industry-2026.html'),EN:reportURL('https://drugnews.com.tw/reports/adc-industry-2026-en.html')};
  const privateFiles = new Set(['Drugnews_ADC_R2_ZH.html','Drugnews_ADC_R2_EN.html','README.md','author_self_check.md','publication_metadata.json','verify_delta.json','claim_locations.json','coverage.json','coverage.csv','data/clinical_accessibility.json','data/research_delta.json','data/source_evidence_dispositions.json']);
  const publicFiles = rows.filter(r=>!privateFiles.has(r.relative_path));
  const oldChanges=JSON.parse(await fs.readFile(path.join(payload,'changes.json'),'utf8'));
  const sourceEvidence=JSON.parse(await fs.readFile(path.join(payload,'source_evidence.json'),'utf8'));
  const sourceURLs=new Map(sourceEvidence.sources.map(s=>[s.source_id,s.original_url]));
  const sourceZH=await fs.readFile(path.join(payload,'Drugnews_ADC_R2_ZH.html'),'utf8');
  for (const item of sourceZH.matchAll(/<article class="source-item" id="([^"]+)">[\s\S]*?<h4>[\s\S]*?<a href="([^"]+)"/g)) sourceURLs.set(item[1],item[2].replaceAll('&amp;','&'));
  const scientificChanges=oldChanges.body_and_reader_note_changes.filter(c=>c.source_ids?.length).map(c=>({language:c.language,chapter:c.section,table_or_source:c.html_anchor||c.subsection||null,before:c.before,after:c.after,reason:c.reason,source_ids:c.source_ids,source_urls:c.source_ids.map(id=>sourceURLs.get(id)).filter(Boolean)}));
  const finalDateCorrection={source_ids:['D15','D16','D17'],source_urls:['D15','D16','D17'].map(id=>sourceURLs.get(id)).filter(Boolean),ZH:'F08 的 Gilead/Tubulis 公告日期未經本次來源核實，已撤下該精確日期；保留 2026-05-21 完成日期，並分開列示現金對價、或有里程碑與淨會計口徑。',EN:'The precise Gilead/Tubulis announcement date in F08 was not verified within the source scope and has been removed. The May 21, 2026 completion date is retained; cash consideration, contingent milestones and net accounting remain distinct.'};
  const readerChanges={content_version:lock.version,research_as_of:lock.research_as_of,publication_date:publicationDate,scientific_corrections:scientificChanges,current_date_scope_correction:finalDateCorrection};
  const readerChangeMD='# 內容更正與版本 / Content corrections and version\n\n'+lock.version+' · '+publicationDate+' · 研究資料截至 / Research as of '+lock.research_as_of+'\n\n'+finalDateCorrection.ZH+'\n\n'+finalDateCorrection.EN+'\n\n'+scientificChanges.map(c=>'## '+c.language+' · '+c.chapter+'\n\n'+c.reason+'\n\n'+c.source_ids.map((id,i)=>'['+id+']('+c.source_urls[i]+')').join(' · ')+'\n\n**修正前 / Before**\n\n'+c.before+'\n\n**修正後 / After**\n\n'+c.after).join('\n\n')+'\n';
  const coverageMD='# 來源取得範圍與缺口 / Source scope and gaps\n\n研究資料截至 / Research as of '+lock.research_as_of+'。本索引列出本次來源補正涉及的 '+sourceEvidence.sources.length+' 個來源；其餘來源的取得範圍保留於完整報告來源章。 / This index covers the '+sourceEvidence.sources.length+' sources in the source supplement. Other source scopes remain in the complete report.\n\n'+sourceEvidence.sources.map(s=>'## '+s.source_id+'\n\n[原始來源 / Original source]('+s.original_url+')\n\n'+['source_date','data_date','read_level','access_result','precise_gap','current_disposition'].filter(k=>s[k]!=null).map(k=>'- '+k+': '+(s[k]===''?'未明示 / Not specified':typeof s[k]==='string'?s[k]:JSON.stringify(s[k]))).join('\n')).join('\n\n')+'\n';
  const captions=(await fs.readFile(path.join(payload,'figure_captions.md'),'utf8')).split('\n').filter(line=>!line.startsWith('**檢查範圍 / Review scope：**')).join('\n');
  const figureSources=JSON.parse(await fs.readFile(path.join(payload,'figure_sources.json'),'utf8'));
  delete figureSources.scope.review_statement;delete figureSources.scope.generation_scope;
  const derived=new Map([['changes.json',JSON.stringify(readerChanges,null,2)+'\n'],['changes.md',readerChangeMD],['coverage.md',coverageMD],['figure_captions.md',captions],['figure_sources.json',JSON.stringify(figureSources,null,2)+'\n']]);
  for (const lang of ['ZH','EN']) {
    let md=await fs.readFile(path.join(payload,`Drugnews_ADC_R2_${lang}.md`),'utf8');
    for (const other of ['ZH','EN']) md=md.replaceAll(`Drugnews_ADC_R2_${other}.html`,urls[other]);
    derived.set(`Drugnews_ADC_R2_${lang}.md`,md);
  }
  const publishedAssets=[];
  for (const record of publicFiles) {
    const dest = path.join(root,base,record.relative_path);
    await fs.mkdir(path.dirname(dest),{recursive:true});
    if (derived.has(record.relative_path)) await fs.writeFile(dest,derived.get(record.relative_path));
    else await fs.copyFile(record.path,dest);
    const bytes=await fs.readFile(dest);
    publishedAssets.push({path:base+record.relative_path,bytes:bytes.length,sha256:sha(bytes),original_source_sha256:record.sha256,reader_support_derived:derived.has(record.relative_path)});
  }
  // Only remove this adapter's own unpublished copied files; immutable inputs remain untouched.
  for (const name of privateFiles) {const dest=path.join(root,base,name);try{await fs.unlink(dest);}catch(error){if(error.code!=='ENOENT')throw error;}}
  const publicManifest = {schema:'drugnews-public-report-resources/v1',content_id:handoff.content_id,content_lock_version:lock.version,research_as_of:lock.research_as_of,first_publication_date:publicationDate,source_scope:'Source dates, reading scopes and limitations remain in the report and source index; no claim of complete full-text reading of every primary source.',files:publishedAssets};
  await fs.writeFile(path.join(root,base,'manifest.json'),JSON.stringify(publicManifest,null,2)+'\n');

  const pages=[];
  for (const lang of ['ZH','EN']) {
    const english = lang === 'EN', originalPath = path.join(payload,`Drugnews_ADC_R2_${lang}.html`);
    const source = await fs.readFile(originalPath,'utf8');
    const schemas = [...source.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    if (schemas.length !== 1) throw Error('One unchanged original article schema required');
    const originalSchema = JSON.parse(schemas[0][1]);
    if (originalSchema['@type'] !== 'Article' || originalSchema.author?.name !== 'Drugnews 藥時事' || originalSchema.isAccessibleForFree !== true || originalSchema.inLanguage !== (english?'en':'zh-Hant') || !Array.isArray(originalSchema.citation) || originalSchema.citation.length < 80 || originalSchema.temporalCoverage !== lock.research_as_of || originalSchema.datePublished || originalSchema.url || originalSchema.mainEntityOfPage) throw Error('Original unmodified author/schema attribution required');
    const chapterHeading=/<section\b(?=[^>]*\bclass="chapter(?: [^"]*)?")(?=[^>]*\bid="([^"]+)")[^>]*>\s*<h2>([\s\S]*?)<\/h2>/g;
    const chapters=[...source.matchAll(chapterHeading)];
    if (chapters.length !== 19 || (source.match(/<table\b/g)||[]).length !== 15) throw Error('Complete original nineteen chapters/fifteen tables required');
    const imagePath = `figures/P01_${lang}.png`, png = await fs.readFile(path.join(payload,imagePath));
    if (png.subarray(0,8).toString('hex') !== '89504e470d0a1a0a') throw Error('Original accepted PNG required');
    const alt = source.match(new RegExp('<img[^>]*src="'+imagePath+'"[^>]*alt="([^"]*)"'))?.[1];
    if (!alt) throw Error('Original image alt required');
    const schema = {...originalSchema,url:urls[lang],mainEntityOfPage:{'@type':'WebPage','@id':urls[lang]},datePublished:publicationDate};
    const head = reportHead({canonical_url:urls[lang],title:originalSchema.headline,summary:originalSchema.description,language:english?'en':'zh',original_report_schema:schema,og_image:{src:base+imagePath,alt,width:png.readUInt32BE(16),height:png.readUInt32BE(20)}},false);
    let html = source.replace(schemas[0][0],'').replace(/<meta name="description" content="[^"]*">/,'');
    html = html.replace(/\b(href|src)="([^"#]+)"/g,(whole,attr,value)=>{
      if (/^(?:https?:|mailto:|data:|\/)/.test(value)) return whole;
      if (value === 'Drugnews_ADC_R2_ZH.html') return attr+'="'+urls.ZH+'"';
      if (value === 'Drugnews_ADC_R2_EN.html') return attr+'="'+urls.EN+'"';
      if (!rows.some(r=>r.relative_path===value) && value !== 'manifest.json') throw Error('Unbound public resource: '+value);
      if (privateFiles.has(value)) throw Error('Private production resource linked publicly: '+value);
      return attr+'="'+base+value+'"';
    });
    const other = english?'ZH':'EN';
    html = html.replace('</head>',head+'<link rel="alternate" hreflang="'+(english?'zh-Hant':'en')+'" href="'+urls[other]+'"><link rel="alternate" hreflang="'+(english?'en':'zh-Hant')+'" href="'+urls[lang]+'"><meta name="content-lock-version" content="'+esc(lock.version)+'"><style data-publisher-interface>'+interfaceCSS+'</style></head>');
    const note = english ? 'First published on the website: '+publicationDate+'. Research as of '+lock.research_as_of+'. Current accepted content: '+lock.version+'.' : '網站首次發布：'+publicationDate+'；研究資料截至 '+lock.research_as_of+'。本次合格內容版：'+lock.version+'。';
    const top = '<div data-publisher-interface><nav class="publisher-links" aria-label="'+(english?'Website navigation':'網站導覽')+'"><a href="'+(english?'/en/':'/')+'">'+(english?'Drugnews home':'藥時事首頁')+'</a><a href="/reports/">'+(english?'Industry research':'產業研究')+'</a></nav><p class="publisher-release">'+esc(note)+'</p>'+reportShareControls(urls[lang],originalSchema.headline,english)+'</div>';
    html = html.replace('<nav class="reading-paths"',top+'<nav class="reading-paths"');
    html = html.replace(chapterHeading,(whole,id,title)=>whole+'<div data-publisher-interface>'+reportShareControls(urls[lang]+'#'+id,title.replace(/<[^>]+>/g,''),english,true)+'</div>');
    const publicationNote = english ? 'Read the complete report here for free. Each chapter has a permanent share link. Original figure files, data and source scopes are linked alongside the report. Research dates and evidence limits remain stated in the text. Website analytics follows the existing privacy and consent settings.' : '本報告可於官網免費完整閱讀，各章皆有固定分享連結。原圖、資料與來源取得範圍可沿文中連結查看；研究日期及證據限制保留於正文。網站分析沿既有隱私與同意設定。';
    html = html.replace(/<p class="publication-note">[\s\S]*?<\/p>/,'<p class="publication-note" data-publisher-interface>'+publicationNote+'</p>');
    html = html.replace('</body>',reportShareScript().replace('<script>','<script data-publisher-interface>')+'</body>');
    await fs.mkdir(path.join(root,'reports'),{recursive:true});
    const relativePath = new URL(urls[lang]).pathname.slice(1);
    await fs.writeFile(path.join(root,relativePath),html);
    pages.push({language:lang,url:urls[lang],relative_path:relativePath,source_html_sha256:sha(source),original_schema_sha256:sha(JSON.stringify(originalSchema)),published_schema_sha256:sha(JSON.stringify(schema)),allowed_schema_additions:['url','mainEntityOfPage','datePublished'],sha256:sha(html),bytes:Buffer.byteLength(html),chapters:chapters.map(c=>c[1]),tables:15,original_png_count:4,publication_note_replaced:true});
  }
  return {schema:'drugnews-complete-qualified-HTML-integration/v1',observed_at:new Date().toISOString(),receiver:receiverThreadId,content_id:handoff.content_id,content_lock_version:lock.version,REVIEW_BINDING:reviewBinding,EVIDENCE_BINDING:evidenceBinding,publication_date:publicationDate,public_assets:publicManifest.files,excluded_private_production_files:[...privateFiles],original_schema_type_preserved:'Article',pages,content_QA_reused:true,formal_deployment:false,public_E4:false};
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const args=Object.fromEntries(process.argv.slice(2).map(x=>{const i=x.indexOf('=');return [x.slice(2,i),x.slice(i+1)];}));
  const result=await integrateQualifiedReport({handoffPath:args.handoff,root:args.root,publicationDate:args.date,receiverThreadId:args.receiver});
  if (!args.receipt) throw Error('A private integration receipt path is required');
  await fs.writeFile(args.receipt,JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({pages:result.pages.map(p=>p.url),source_files_verified:98,public_assets:result.public_assets.length,receipt:args.receipt}));
}
