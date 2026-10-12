#!/usr/bin/env python3
"""
Drugnews 產業報告頁面產生器 build_report_page.py
用法：
  python3 scripts/build_report_page.py <package_dir> [--write-index] [--register]

package_dir 內容：
  report.md          報告母稿（見下方格式）
  figures/*.png      圖檔（檔名需與 report.md 內引用一致）

report.md 格式（開頭為 key: value 的前言區，以 --- 結束）：
  title: 核藥的下一道門檻：從工廠到病人的可交付劑量
  subtitle: PSMA 診斷與治療產業研究
  slug: radiopharma-delivery-2026
  asset_id: radiopharma-20261011
  content_id: Drugnews_RADIOPHARMA_20261011
  lock_version: RADIOPHARMA-20261011-R6-TW1
  date: 2026-10-11
  description: 一段 60–120 字摘要（也作 meta description）
  scope: 資料截止 2026 年 10 月 11 日。核准用途以美國為主……
  index_blurb: 給 reports/index.html 卡片的一段話
  ---
  （正文 Markdown）
  ## 摘要與核心判斷            ← 必須是第一個 ##，會放進 .summary
  …
  ## 01 章標題                  ← 每個 ## 變成 <section class="report-section">
  段落…
  ![圖說 alt](figures/figure1.png)
  圖1｜圖說文字                 ← 緊接圖片的下一行若以「圖」開頭即為 caption
  ## 來源與資料日期             ← 最後一個 ##，每一項為「- S01｜標題｜URL｜發布日期；期間；備註｜查閱位置」
  ## 更新與更正                 ← 可選，每項「- 2026-10-11｜首次公開完整報告」

輸出：
  reports/<slug>.html
  assets/reports/<asset_id>/figures/*.png（複製）
  --write-index  在 reports/index.html 卡片區最前面插入一張卡
  --register     在 content/report-reader-assets.json 追加一筆（含 SHA-256）
不碰 git、不部署。
"""
import sys, os, re, json, shutil, hashlib, html
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

STYLE_1 = '*{box-sizing:border-box}body{margin:0;color:#20333b;background:#f3f6f6;font-family:"PingFang TC","Noto Sans TC",sans-serif;line-height:1.85}.sheet{max-width:920px;margin:32px auto;padding:48px;background:white}.report-header{border-bottom:3px solid #246b70;padding-bottom:24px}.report-header small{color:#246b70;font-weight:700}h1{font-size:38px;line-height:1.35;margin:12px 0}h2{font-size:25px;line-height:1.45;margin:32px 0 16px}h3{font-size:20px}p,li{overflow-wrap:anywhere}.meta{color:#586b73;font-size:14px}.preview{padding:14px;background:#fff3d9;border:1px solid #e9ce91;font-weight:700}.summary{padding:24px;background:#edf5f5;margin-top:24px}.figure{break-inside:avoid;margin:28px 0}.figure img{max-width:100%;height:auto}.figure-space{border:2px dashed #a9babc;min-height:180px;display:grid;place-items:center;color:#5c757b}.caption{font-size:14px;color:#4e666f;margin:8px 0}.sources{font-size:14px;border-top:1px solid #d4dee0;padding-top:16px}a{color:#246b70}footer{font-size:12px;color:#5c6d73;border-top:1px solid #d4dee0;padding-top:16px;margin-top:32px}\ndl.figure-data{display:grid;grid-template-columns:5em minmax(0,1fr);gap:4px 12px;font-size:14px}dl.figure-data dd{margin:0;min-width:0;overflow-wrap:anywhere}.figure-data{font-size:14px}.report-share{display:flex;flex-wrap:wrap;gap:10px;margin:16px 0;font-size:14px}.report-share button{font:inherit;padding:8px 12px;background:#edf5f5;border:1px solid #a9babc;border-radius:4px;color:#246b70}.report-share output,.report-share input{max-width:100%;overflow-wrap:anywhere}.report-share input{flex-basis:100%;width:100%}.corrections{font-size:14px}\n@media(max-width:600px){.sheet{margin:0;padding:24px 20px}h1{font-size:28px}h2{font-size:23px}}\n@page{size:A4;margin:18mm 17mm}@media print{body{background:white;font-size:10.5pt}.sheet{max-width:none;margin:0;padding:0}h1{font-size:26pt}h2{font-size:17pt;break-after:avoid}.report-section{break-before:page}.summary,h1,footer{break-inside:avoid}.preview{font-size:9pt}.report-share{display:none}.figure-space{height:58mm;min-height:58mm}a{color:inherit;text-decoration:none}}'

ANALYTICS = '''<!-- Drugnews analytics:start -->
  <link rel="stylesheet" href="/privacy-consent.css?v=20260726-2">
  <script>
    window.drugnewsAnalyticsConfig = {
      measurementId: 'G-X7VTN5K93C',
      consentVersion: '2026-07-26'
    };
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function(){window.dataLayer.push(arguments);};
    window.gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    window.gtag('set', 'ads_data_redaction', true);
  </script>
  <script defer src="/privacy-consent.js?v=20260726-2"></script>
  <!-- Drugnews analytics:end -->'''

STYLE_2 = 'html{scroll-behavior:smooth}body{font-family:"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif}.sheet{width:100%;min-width:0}.publisher-links{display:flex;flex-wrap:wrap;gap:18px;font-size:15px;margin-bottom:24px}.table-wrap{max-width:100%;overflow-x:auto;overscroll-behavior-x:contain;margin:18px 0 12px;border:1px solid #cbdadc;border-radius:4px}.table-wrap:focus-visible{outline:3px solid #bd812c;outline-offset:3px}table{width:100%;min-width:780px;border-collapse:collapse;font-size:15px;line-height:1.65;text-align:left}th,td{padding:13px 15px;border-bottom:1px solid #d6e1e3;vertical-align:top}thead th{background:#e2eeee;color:#174b51}tbody th{width:23%;font-weight:600;background:#f2f7f7}.table-title{font-weight:700;font-size:18px;margin-top:30px}.table-note,.source-list p{font-size:14px;color:#52656c;line-height:1.8}.source-list li{margin:20px 0}.source-list li:target{background:#fff4d9;outline:2px solid #deb35f}.citation{font-size:.9em;white-space:nowrap}.report-section,.source-list li{scroll-margin-top:22px}.research-scope,.publication-date{font-size:15px;color:#52656c}.figure .caption{font-size:16px;line-height:1.8}.figure img{display:block;width:100%;height:auto}.figure-data{line-height:1.8}.model-formula{font-variant-numeric:tabular-nums}.table-wrap::-webkit-scrollbar{height:10px}.table-wrap::-webkit-scrollbar-thumb{background:#8daaad;border-radius:5px}@media(max-width:600px){body{font-size:17px}.sheet{padding:26px 18px}h1{font-size:29px}table{min-width:740px}tbody th{min-width:150px}.table-note,.source-list p{font-size:15px}.summary{padding:18px}.report-share{gap:8px}.report-share button{min-height:44px}.contents ol{padding-left:1.5em}}@media print{.table-wrap{overflow:visible}table{min-width:0;font-size:8pt}.table-wrap{break-inside:auto}thead{display:table-header-group}tr{break-inside:avoid}.publisher-links{display:none}}'

SHARE_SCRIPT = '''<script>(function () {
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
  })();</script>'''

E = html.escape

def inline(md: str) -> str:
    s = E(md)
    s = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)
    s = re.sub(r'\[([^\]]+)\]\((https?://[^)]+)\)', r'<a href="\2">\1</a>', s)
    s = re.sub(r'\[(S\d{2}|E\d{2})\]', r'<a class="citation" href="#source-\1">[\1]</a>', s)
    return s

def slugify(text: str, n: int) -> str:
    t = re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')
    return t or f'section-{n:02d}'

def parse(package: Path):
    md = (package / 'report.md').read_text(encoding='utf-8')
    head, body = md.split('\n---\n', 1)
    meta = {}
    for line in head.splitlines():
        if ':' in line:
            k, v = line.split(':', 1); meta[k.strip()] = v.strip()
    need = ['title', 'slug', 'asset_id', 'date', 'description']
    missing = [k for k in need if not meta.get(k)]
    if missing:
        sys.exit(f'report.md 前言缺少：{missing}')
    meta.setdefault('subtitle', '')
    meta.setdefault('scope', f"資料截止 {meta['date']}。")
    meta.setdefault('content_id', f"Drugnews_{meta['asset_id'].upper().replace('-', '_')}")
    meta.setdefault('lock_version', f"{meta['asset_id'].upper()}-R1")
    meta.setdefault('index_blurb', meta['description'])
    sections = []
    cur = None
    for line in body.splitlines():
        if line.startswith('## '):
            cur = {'title': line[3:].strip(), 'lines': []}; sections.append(cur)
        elif cur is not None:
            cur['lines'].append(line)
    return meta, sections

def render_block_lines(lines, asset_id, figures_used):
    out, i, para = [], 0, []
    def flush():
        if para:
            out.append(f'<p>{inline(" ".join(para))}</p>'); para.clear()
    while i < len(lines):
        ln = lines[i].rstrip()
        m = re.match(r'!\[(.*?)\]\((?:figures/)?([^)]+)\)', ln.strip())
        if m:
            flush()
            alt, fn = m.group(1), m.group(2)
            cap = ''
            if i + 1 < len(lines) and lines[i + 1].strip().startswith('圖'):
                cap = lines[i + 1].strip(); i += 1
            figures_used.append(fn)
            out.append(f'<figure class="figure"><img src="/assets/reports/{asset_id}/figures/{E(fn)}" alt="{E(alt)}" loading="lazy">'
                       f'<figcaption class="caption">{inline(cap or alt)}</figcaption></figure>')
        elif ln.strip().startswith('### '):
            flush(); out.append(f'<h3>{inline(ln.strip()[4:])}</h3>')
        elif ln.strip().startswith('|'):
            flush(); rows = []
            while i < len(lines) and lines[i].strip().startswith('|'):
                rows.append([c.strip() for c in lines[i].strip().strip('|').split('|')]); i += 1
            i -= 1
            rows = [r for r in rows if not all(re.match(r'^:?-+:?$', c) for c in r)]
            thead = ''.join(f'<th>{inline(c)}</th>' for c in rows[0])
            tbody = ''.join('<tr>' + ''.join(f'<td>{inline(c)}</td>' for c in r) + '</tr>' for r in rows[1:])
            out.append(f'<div class="table-wrap" tabindex="0"><table><thead><tr>{thead}</tr></thead><tbody>{tbody}</tbody></table></div>')
        elif ln.strip().startswith('- '):
            flush(); items = []
            while i < len(lines) and lines[i].strip().startswith('- '):
                items.append(lines[i].strip()[2:]); i += 1
            i -= 1
            out.append('<ul>' + ''.join(f'<li>{inline(x)}</li>' for x in items) + '</ul>')
        elif re.match(r'^\d+\. ', ln.strip()):
            flush(); items = []
            while i < len(lines) and re.match(r'^\d+\. ', lines[i].strip()):
                items.append(re.sub(r'^\d+\. ', '', lines[i].strip())); i += 1
            i -= 1
            out.append('<ol>' + ''.join(f'<li>{inline(x)}</li>' for x in items) + '</ol>')
        elif ln.strip() == '':
            flush()
        else:
            para.append(ln.strip())
        i += 1
    flush()
    return '\n'.join(out)

def render_sources(lines):
    items = []
    for ln in lines:
        ln = ln.strip()
        if not ln.startswith('- '):
            continue
        parts = [p.strip() for p in ln[2:].split('｜')]
        # 期待：S01｜標題｜URL｜日期說明｜查閱位置
        sid = parts[0] if parts else ''
        title = parts[1] if len(parts) > 1 else ''
        url = parts[2] if len(parts) > 2 else ''
        dates = parts[3] if len(parts) > 3 else ''
        where = parts[4] if len(parts) > 4 else ''
        inner = f'<a href="{E(url)}">{E(sid)}｜{E(title)}</a>' if url else f'{E(sid)}｜{E(title)}'
        extra = (f'<p>{E(dates)}</p>' if dates else '') + (f'<p>查閱位置：{E(where)}</p>' if where else '')
        items.append(f'<li id="source-{E(sid)}">{inner}{extra}</li>')
    return '<ol class="source-list">' + ''.join(items) + '</ol>'

def render_corrections(lines, date):
    items = []
    for ln in lines:
        ln = ln.strip()
        if ln.startswith('- '):
            d, _, txt = ln[2:].partition('｜')
            items.append(f'<li><time>{E(d.strip())}</time><p>{inline(txt.strip())}</p></li>')
    if not items:
        items.append(f'<li><time>{E(date)}</time><p>首次公開完整報告；資料截至 {E(date)}。</p></li>')
    return '<ol>' + ''.join(items) + '</ol>'

def build(package: Path, write_index: bool, register: bool):
    meta, sections = parse(package)
    slug, asset_id, date = meta['slug'], meta['asset_id'], meta['date']
    url = f'https://drugnews.com.tw/reports/{slug}.html'
    figures_used = []
    summary_html = ''
    body_sections, toc = [], []
    sources_html, corrections_html = '', ''
    n = 0
    for s in sections:
        t = s['title']
        if t.startswith('摘要'):
            summary_html = render_block_lines(s['lines'], asset_id, figures_used)
        elif t.startswith('來源'):
            sources_html = render_sources(s['lines'])
        elif t.startswith('更新'):
            corrections_html = render_corrections(s['lines'], date)
        else:
            n += 1
            sid = slugify(re.sub(r'^\d+\s*', '', t), n)
            toc.append(f'<li><a href="#{sid}">{E(t)}</a></li>')
            body_sections.append(f'<section class="report-section" id="{sid}"><h2>{E(t)}</h2>\n{render_block_lines(s["lines"], asset_id, figures_used)}</section>')
    if not summary_html:
        sys.exit('report.md 需要「## 摘要與核心判斷」作為第一節')
    if not sources_html:
        sys.exit('report.md 需要「## 來源與資料日期」')
    if not corrections_html:
        corrections_html = render_corrections([], date)

    # figures
    fig_src = package / 'figures'
    dst = ROOT / 'assets' / 'reports' / asset_id / 'figures'
    dst.mkdir(parents=True, exist_ok=True)
    assets = []
    og_image, og_alt = '', ''
    for fn in figures_used:
        src = fig_src / fn
        if not src.exists():
            sys.exit(f'缺圖：{src}')
        shutil.copy2(src, dst / fn)
        data = (dst / fn).read_bytes()
        assets.append({'path': f'figures/{fn}', 'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)})
        if not og_image:
            og_image = f'https://drugnews.com.tw/assets/reports/{asset_id}/figures/{fn}'
    if og_image:
        m = re.search(r'<img src="[^"]+" alt="([^"]*)"', summary_html + ''.join(body_sections))
        og_alt = html.unescape(m.group(1)) if m else meta['title']

    citations = re.findall(r'href="(https?://[^"]+)"', sources_html)
    ld = {"@context": "https://schema.org", "@type": "Report", "headline": meta['title'], "description": meta['description'],
          "author": {"@type": "Organization", "name": "Drugnews 藥時事"}, "publisher": {"@type": "Organization", "name": "Drugnews 藥時事"},
          "url": url, "datePublished": date, "dateModified": date, "inLanguage": "zh-Hant", "isAccessibleForFree": True,
          "temporalCoverage": date, "citation": citations[:40]}
    og = ''
    if og_image:
        og = f'<meta property="og:image" content="{E(og_image)}"><meta property="og:image:alt" content="{E(og_alt)}">'
    page = (
        '<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n'
        f'<title>{E(meta["title"])}｜Drugnews</title><link rel="canonical" href="{url}"><meta name="description" content="{E(meta["description"])}">'
        f'<meta property="og:type" content="article"><meta property="og:title" content="{E(meta["title"])}"><meta property="og:description" content="{E(meta["description"])}">'
        f'<meta property="og:url" content="{url}"><meta property="og:locale" content="zh_TW">{og}'
        f'<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script><style>\n{STYLE_1}\n</style>{ANALYTICS}'
        f'<link rel="icon" href="/favicon.svg"><meta name="evidence-as-of" content="{date}"><style>{STYLE_2}</style></head><body><main class="sheet">'
        f'<header class="report-header"><nav class="publisher-links" aria-label="網站導覽"><a href="/">藥時事首頁</a><a data-report-language-switch href="/reports/">研究報告目錄</a></nav>'
        f'<small>Drugnews｜產業研究與報告解析</small><h1>{E(meta["title"])}</h1><p>繁體中文完整報告</p>'
        + (f'<p>{E(meta["subtitle"])}</p>' if meta['subtitle'] else '') +
        f'<p class="meta">研究作者：Drugnews 藥時事 · 資料日：{date}</p>'
        f'<div class="report-share" data-report-sharing><button type="button" data-report-share data-share-url="{url}" data-share-title="{E(meta["title"])}">分享報告</button>'
        f'<button type="button" data-report-copy data-share-url="{url}">複製連結</button><a href="{url}">固定連結</a><output role="status" aria-live="polite"></output>'
        f'<input hidden readonly aria-label="供手動複製的網址" value="{url}"></div>'
        f'<p class="research-scope">{E(meta["scope"])}</p><p class="publication-date">網站首次發布：<time datetime="{date}">{date}</time> · 免費完整閱讀</p></header>'
        f'<section class="summary"><h2>摘要與核心判斷</h2>{summary_html}</section>'
        f'<nav class="contents" aria-label="報告目錄"><h2>目錄</h2><ol>{"".join(toc)}</ol></nav>'
        + '\n'.join(body_sections) +
        f'<section class="sources"><h2>來源與資料日期</h2>{sources_html}</section>'
        f'<section class="corrections" id="report-revisions"><h2>更新與更正</h2>{corrections_html}</section>'
        '<footer>Drugnews｜藥時事 · 產業研究與知識分享。來源與資料日期見本文。</footer></main>' + SHARE_SCRIPT + '</body></html>'
    )
    out = ROOT / 'reports' / f'{slug}.html'
    out.write_text(page, encoding='utf-8')
    print(f'寫出 {out.relative_to(ROOT)}（{len(page):,} bytes，{len(body_sections)} 節，{len(figures_used)} 圖）')

    if write_index:
        idx = ROOT / 'reports' / 'index.html'
        h = idx.read_text(encoding='utf-8')
        if url in h:
            print('index 已有此報告，略過')
        else:
            card = (f'<article class="product-path"><span class="product-label">完整產業報告 · 免費閱讀</span><p><time datetime="{date}">{date}</time></p>'
                    f'<h2>{E(meta["title"])}</h2><p>{E(meta["index_blurb"])}</p><a class="button primary" href="{url}" lang="zh-Hant">閱讀繁體中文完整報告</a></article>')
            anchor = '<div class="container product-paths">'
            if anchor not in h:
                sys.exit('reports/index.html 找不到卡片容器')
            h = h.replace(anchor, anchor + card, 1)
            idx.write_text(h, encoding='utf-8')
            print('已插入 reports/index.html 卡片')

    if register:
        reg_path = ROOT / 'content' / 'report-reader-assets.json'
        reg = json.loads(reg_path.read_text(encoding='utf-8'))
        css = ROOT / 'assets' / 'report.css'
        entry = {"content_id": meta['content_id'], "original_content_lock_version": meta['lock_version'],
                 "asset_root": f"assets/reports/{asset_id}", "pages": [f"reports/{slug}.html"], "reader_assets": []}
        if css.exists():
            b = css.read_bytes(); entry['reader_assets'].append({"path": "assets/report.css", "sha256": hashlib.sha256(b).hexdigest(), "bytes": len(b)})
        entry['reader_assets'] += assets
        reg['reports'] = [r for r in reg['reports'] if r.get('content_id') != meta['content_id']] + [entry]
        reg_path.write_text(json.dumps(reg, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print('已登記 content/report-reader-assets.json')

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(1)
    build(Path(sys.argv[1]).resolve(), '--write-index' in sys.argv, '--register' in sys.argv)
