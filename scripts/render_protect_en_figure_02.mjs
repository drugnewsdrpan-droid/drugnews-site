import { createRequire } from "node:module";
import { copyFile } from "node:fs/promises";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("/Users/jojo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const ROOT = process.cwd();
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT_ASSET = path.join(ROOT, "assets/articles/protect-pet-medical-roche-platform-en/figure-02-en.png");
const OUT_PUBLISHED = path.join(ROOT, "content/published/protect-pet-medical-roche-platform-en/images/figure-02-en.png");

const html = String.raw`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
*{box-sizing:border-box}
body{margin:0;width:1792px;height:1024px;background:#f8fdff;font-family:-apple-system,BlinkMacSystemFont,"Inter","Segoe UI",Arial,sans-serif;color:#12313d;overflow:hidden}
.canvas{position:relative;width:1792px;height:1024px;background:radial-gradient(circle at 58% 42%,#fff 0,#fff 30%,#edf8fa 62%,#e5f3f8 100%)}
.wave{position:absolute;inset:auto -40px -70px -40px;height:260px;background:linear-gradient(175deg,transparent 0 31%,rgba(19,148,158,.13) 32% 57%,rgba(16,115,137,.28) 58% 100%);border-radius:45% 45% 0 0}
.dna{position:absolute;left:-40px;bottom:10px;width:260px;height:360px;border-left:12px solid rgba(19,148,158,.22);border-radius:50%;transform:rotate(-18deg)}
.molecule{position:absolute;right:64px;top:64px;width:190px;height:120px;opacity:.34}
.molecule span{position:absolute;width:22px;height:22px;background:#91d4dc;border-radius:50%;box-shadow:0 0 0 6px rgba(145,212,220,.16)}
.molecule i{position:absolute;height:3px;background:#91d4dc;transform-origin:left center}
.title{position:absolute;left:236px;top:40px;width:1320px;text-align:center;z-index:4}
.title h1{margin:0;font-size:50px;line-height:1.04;font-weight:850;letter-spacing:0}
.title p{margin:16px 0 0;font-size:24px;line-height:1.35;color:#526a73;font-weight:650}
.panel{position:absolute;border:2px solid #b9d9e0;border-radius:28px;background:rgba(255,255,255,.91);box-shadow:0 18px 36px rgba(22,82,96,.08);overflow:hidden;z-index:3}
.panel h2{margin:0 0 11px;font-size:31px;line-height:1.08;font-weight:850}
.panel p{margin:0;font-size:21px;line-height:1.35;color:#526a73;font-weight:680}
.market{left:62px;top:145px;width:512px;height:232px;padding:34px}
.market strong{font-size:41px;color:#078995}
.market small{display:block;margin-top:8px;font-size:19px;color:#5c737c;font-weight:700}
.chart{left:62px;top:415px;width:512px;height:306px;padding:28px}
.axis{position:absolute;left:62px;right:52px;bottom:58px;height:180px;border-left:3px solid #c9e2e8;border-bottom:3px solid #c9e2e8}
.axis:after{content:"";position:absolute;left:18px;bottom:24px;width:350px;height:110px;border:8px solid #088b96;border-left:0;border-bottom:0;border-radius:0 100% 0 0;transform:skewX(-10deg)}
.axis b{position:absolute;width:14px;height:14px;border-radius:50%;background:#fff;border:5px solid #088b96}
.axis b:nth-child(1){left:28px;bottom:22px}.axis b:nth-child(2){left:112px;bottom:45px}.axis b:nth-child(3){left:205px;bottom:84px}.axis b:nth-child(4){left:310px;bottom:132px}
.arrow{position:absolute;left:594px;top:488px;width:190px;height:86px;background:linear-gradient(90deg,#31bbc0,#0a5376);clip-path:polygon(0 22%,70% 22%,70% 0,100% 50%,70% 100%,70% 78%,0 78%);opacity:.8;z-index:1}
.arrow.right{left:1012px}
.center{position:absolute;left:730px;top:260px;width:360px;height:360px;border:9px solid rgba(9,136,146,.75);border-radius:50%;background:rgba(255,255,255,.68);box-shadow:inset 0 0 0 18px rgba(19,148,158,.08);z-index:2}
.center:before{content:"";position:absolute;inset:42px;border:4px dashed rgba(8,137,148,.28);border-radius:50%}
.pet{position:absolute;left:120px;top:92px;width:72px;height:135px;background:#096d7c;border-radius:44% 44% 22% 22%;box-shadow:68px 48px 0 -8px #69bac0}
.pet:before{content:"";position:absolute;left:8px;top:-38px;width:64px;height:56px;background:#096d7c;border-radius:50% 48% 44% 50%}
.pet:after{content:"";position:absolute;left:84px;top:22px;width:58px;height:48px;background:#69bac0;border-radius:50%}
.logic{left:658px;top:646px;width:502px;height:128px;padding:29px;text-align:center}
.logic h2{font-size:30px}
.scenario{right:82px;width:520px;height:134px;padding:27px 32px}
.s2025{top:292px}.s2034{top:502px}.investor{top:726px;height:150px}
.badge{position:absolute;width:98px;height:98px;border-radius:50%;background:#fff;border:5px solid #b8dde3;display:flex;align-items:center;justify-content:center;font-size:52px;color:#088b96;box-shadow:0 10px 20px rgba(13,88,105,.10);z-index:2}
.b1{left:105px;top:418px}.b2{left:833px;top:198px}.b3{left:1165px;top:202px}.b4{right:570px;top:355px}.b5{right:570px;top:566px}.b6{left:614px;bottom:84px}.b7{left:1085px;bottom:98px}
.mini{position:absolute;left:70px;bottom:91px;display:flex;gap:20px;z-index:2}
.mini div{width:160px;height:128px;border:2px solid #c6e2e8;border-radius:18px;background:#fff;display:flex;align-items:center;justify-content:center}
.donut{width:84px;height:84px;border-radius:50%;background:conic-gradient(#f58220 0 27%,#078995 27% 100%);position:relative}
.donut:after{content:"";position:absolute;inset:23px;background:#fff;border-radius:50%}
.bars span{display:inline-block;width:22px;margin:0 5px;background:#1ba6aa;vertical-align:bottom}
.bars span:nth-child(1){height:38px}.bars span:nth-child(2){height:61px}.bars span:nth-child(3){height:86px}.bars span:nth-child(4){height:109px}
.ring{display:none}
.r1{right:82px;top:145px;width:520px;height:120px}.r2{right:82px;top:433px;width:520px;height:124px;border-color:rgba(9,136,146,.25)}.r3{right:82px;top:643px;width:520px;height:124px;border-color:rgba(245,130,32,.28)}
.sil{position:absolute;bottom:72px;left:780px;width:115px;height:175px;background:#0b7180;border-radius:50% 50% 35% 35%;filter:drop-shadow(0 10px 12px rgba(4,66,78,.16));z-index:2}
.sil:before{content:"";position:absolute;left:19px;top:-46px;width:78px;height:68px;background:#0b7180;border-radius:50% 48% 46% 52%}
.sil.cat{left:887px;width:74px;height:118px;background:#62bbc1}.sil.cat:before{left:12px;top:-32px;width:56px;height:48px;background:#62bbc1}
.question{color:#e67927}
.brandline{position:absolute;right:48px;bottom:34px;font-size:17px;color:#78909a;font-weight:700;letter-spacing:.04em;z-index:3}
.footerline{position:absolute;left:62px;right:62px;bottom:28px;height:2px;background:linear-gradient(90deg,rgba(7,137,149,.45),rgba(245,130,32,.5),rgba(7,137,149,.1));z-index:3}
</style>
</head>
<body>
<div class="canvas">
  <div class="molecule"><span style="left:12px;top:48px"></span><span style="left:86px;top:18px"></span><span style="left:142px;top:74px"></span><i style="left:30px;top:58px;width:72px;transform:rotate(-22deg)"></i><i style="left:104px;top:37px;width:76px;transform:rotate(42deg)"></i></div>
  <div class="title"><h1>From Pet Medicine Market Growth<br>to Platform Valuation</h1><p>A pet-medicine platform is valued by market size, share, execution, and strategic scarcity.</p></div>
  <section class="panel market"><h2>2025 Market Base</h2><strong>$25.9B</strong><small>global companion-animal medicine market</small></section>
  <section class="panel chart"><h2>Market Expansion</h2><p>Expected to reach <b>$67.0B</b> by 2034</p><div class="axis"><b></b><b></b><b></b><b></b></div></section>
  <div class="arrow"></div><div class="center"><div class="pet"></div></div>
  <section class="panel logic"><h2>Platform Logic</h2><p>Diagnostics + drugs + clinics + data</p></section>
  <div class="arrow right"></div><div class="ring r1"></div>
  <section class="panel scenario s2025"><h2>2025 Scenario</h2><p>3-5% share x 7x P/S = <b>$5.4-9.1B</b></p></section>
  <div class="ring r2"></div>
  <section class="panel scenario s2034"><h2>2034 Scenario</h2><p>3-5% share x 7x P/S = <b>$14.1-23.4B</b></p></section>
  <div class="ring r3"></div>
  <section class="panel scenario investor"><h2 class="question">Investor Question</h2><p>Can Protect move from product company<br>to platform company?</p></section>
  <div class="badge b1">⌁</div><div class="badge b2">⚕</div><div class="badge b3">▣</div><div class="badge b4">↗</div><div class="badge b5 question">↗</div><div class="badge b6">⌂</div><div class="badge b7">▥</div>
  <div class="mini"><div><span class="donut"></span></div><div class="bars"><span></span><span></span><span></span><span></span></div><div><span class="donut"></span></div></div>
  <div class="sil"></div><div class="sil cat"></div><div class="dna"></div><div class="wave"></div><div class="footerline"></div><div class="brandline">Drugnews framework</div>
</div>
</body>
</html>`;

const browser = await chromium.launch({
  headless: true,
  executablePath: CHROME
});
const page = await browser.newPage({
  viewport: { width: 1792, height: 1024 },
  deviceScaleFactor: 1
});
await page.setContent(html, { waitUntil: "networkidle" });
await page.screenshot({ path: OUT_ASSET, fullPage: false });
await browser.close();
await copyFile(OUT_ASSET, OUT_PUBLISHED);
console.log(`Wrote ${OUT_ASSET}`);
console.log(`Wrote ${OUT_PUBLISHED}`);
