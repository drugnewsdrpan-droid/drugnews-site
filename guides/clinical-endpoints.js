(() => {
  const header = document.querySelector(".site-header");
  const navToggle = document.getElementById("site-nav-toggle");
  const navButton = document.querySelector(".nav-menu-button");
  const readingProgress = document.getElementById("lessonReadingProgress");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function updatePageChrome() {
    header?.classList.toggle("preview-condensed", window.scrollY > 20);
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    if (readingProgress) readingProgress.style.width = `${scrollable > 0 ? Math.min(100, window.scrollY / scrollable * 100) : 0}%`;
  }

  function syncMenuState() {
    navButton?.setAttribute("aria-expanded", String(Boolean(navToggle?.checked)));
  }

  window.addEventListener("scroll", updatePageChrome, { passive: true });
  navToggle?.addEventListener("change", syncMenuState);
  navButton?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    navToggle.checked = !navToggle.checked;
    syncMenuState();
  });
  updatePageChrome();
  syncMenuState();

  const endpointLab = document.querySelector(".endpoint-lab");
  const endpointVisual = document.getElementById("endpointVisual");
  const tabs = [...document.querySelectorAll(".endpoint-controls [data-endpoint]")];
  const panel = document.getElementById("endpointPanel");
  const visualTitle = document.getElementById("endpointVisualTitle");
  const kicker = document.getElementById("endpointKicker");
  const title = document.getElementById("endpointTitle");
  const copy = document.getElementById("endpointCopy");
  const question = document.getElementById("endpointQuestion");
  const limit = document.getElementById("endpointLimit");
  const modeCaption = document.getElementById("endpointModeCaption");
  const compactVisual = window.matchMedia("(max-width: 680px)");

  const endpointContent = {
    orr: {
      visual: "腫瘤有沒有縮小",
      kicker: "Objective Response Rate",
      title: "ORR 看見藥物活性，但還沒看見存活",
      copy: "ORR 通常指達到完全或部分反應的病人比例。它適合在早期試驗快速觀察訊號，但還要看反應維持多久、安全性如何，以及試驗有沒有可靠的比較基準。",
      question: "反應維持多久？",
      limit: "病人一定活得更久"
    },
    pfs: {
      visual: "疾病多久不惡化",
      kicker: "Progression-Free Survival",
      title: "PFS 看的是控制時間，不只是某個反應瞬間",
      copy: "PFS 從隨機或治療開始，追蹤到疾病惡化或死亡。它能呈現疾病控制是否延長，但必須搭配對照組、治療線別、影像評估方式與完整曲線。",
      question: "曲線何時分開、是否維持？",
      limit: "已經證明整體存活改善"
    },
    os: {
      visual: "病人是否活得更久",
      kicker: "Overall Survival",
      title: "OS 最直接，也最需要時間與成熟資料",
      copy: "OS 追蹤從試驗起點到死亡的時間，通常最具說服力。但後續治療、交叉用藥、資料成熟度與追蹤時間，都會影響能否下結論。",
      question: "事件數與追蹤是否成熟？",
      limit: "趨勢良好就等於統計顯著"
    },
    hr: {
      visual: "整段時間的事件風險",
      kicker: "Hazard Ratio",
      title: "HR 比較事件風險，不是直接告訴你多活幾個月",
      copy: "HR 小於 1 通常表示治療組事件風險較低，但它不是絕對風險差，也不等於中位存活差。解讀時要看信賴區間、曲線與比例風險是否合理。",
      question: "信賴區間有沒有跨過 1？",
      limit: "HR 0.7 就等於多活 30%"
    }
  };

  if (endpointLab && endpointVisual && tabs.length) {
    const endpointImages = {
      orr: "clinical-endpoint-orr-v1",
      pfs: "clinical-endpoint-pfs-v1",
      os: "clinical-endpoint-os-v1",
      hr: "clinical-endpoint-hr-v1"
    };
    const endpointImageAlt = {
      orr: "ORR：腫瘤有沒有縮小。看藥物活性，不等於看存活。",
      pfs: "PFS：疾病多久不惡化。看疾病控制時間，不等於已證明活更久。",
      os: "OS：病人是否活得更久。最硬的終點，也最需要時間。",
      hr: "HR：整段時間的事件風險。不是多活幾個月，而是相對 hazard。"
    };
    const hrStats = { hr: 0.70, low: 0.58, high: 0.84 };
    const hrX = (value) => 96 + ((value - 0.5) / 1) * 584;

    const visualTemplates = {
      orr: `<title id="endpointVisualSvgTitle">ORR 臨床終點概念圖</title><desc id="endpointVisualSvgDescription">以四位示意病人的治療前與影像評估結果，說明客觀反應率如何觀察腫瘤縮小。</desc>
        <g class="endpoint-labels"><text x="80" y="112">治療前腫瘤量測</text><text x="650" y="112" text-anchor="end">影像評估</text></g>
        <g class="endpoint-row endpoint-delay-1"><circle class="endpoint-baseline" cx="104" cy="160" r="25"/><line x1="150" y1="160" x2="600" y2="160"/><circle class="endpoint-signal" cx="420" cy="160" r="5"/><circle class="endpoint-response" cx="626" cy="160" r="5"/><g class="endpoint-badge endpoint-badge-good"><rect x="314" y="140" width="92" height="40" rx="3"/><text x="360" y="165" text-anchor="middle">CR 完全反應</text></g></g>
        <g class="endpoint-row endpoint-delay-2"><circle class="endpoint-baseline" cx="104" cy="224" r="31"/><line x1="150" y1="224" x2="600" y2="224"/><circle class="endpoint-signal" cx="470" cy="224" r="5"/><circle class="endpoint-response" cx="626" cy="224" r="16"/><g class="endpoint-badge endpoint-badge-good"><rect x="314" y="204" width="92" height="40" rx="3"/><text x="360" y="229" text-anchor="middle">PR 部分反應</text></g></g>
        <g class="endpoint-row endpoint-delay-3"><circle class="endpoint-baseline" cx="104" cy="288" r="27"/><line x1="150" y1="288" x2="600" y2="288"/><circle class="endpoint-signal" cx="510" cy="288" r="5"/><circle class="endpoint-response endpoint-neutral" cx="626" cy="288" r="25"/><g class="endpoint-badge endpoint-badge-neutral"><rect x="314" y="268" width="92" height="40" rx="3"/><text x="360" y="293" text-anchor="middle">SD 疾病穩定</text></g></g>
        <g class="endpoint-row endpoint-delay-4"><circle class="endpoint-baseline" cx="104" cy="352" r="23"/><line x1="150" y1="352" x2="600" y2="352"/><circle class="endpoint-signal" cx="550" cy="352" r="5"/><circle class="endpoint-response endpoint-worse" cx="626" cy="352" r="31"/><g class="endpoint-badge endpoint-badge-worse"><rect x="314" y="332" width="92" height="40" rx="3"/><text x="360" y="357" text-anchor="middle">PD 疾病惡化</text></g></g>
        <g class="endpoint-formula"><rect x="664" y="142" width="70" height="228" rx="3"/><text x="699" y="172" text-anchor="middle">ORR</text><text x="699" y="208" text-anchor="middle">=</text><text x="699" y="248" text-anchor="middle">CR</text><text x="699" y="276" text-anchor="middle">+</text><text x="699" y="316" text-anchor="middle">PR</text><line x1="680" y1="334" x2="718" y2="334"/><text x="699" y="352" text-anchor="middle">預先定義</text><text x="699" y="366" text-anchor="middle">分析族群</text></g>`,
      pfs: `<title id="endpointVisualSvgTitle">PFS 臨床終點概念圖</title><desc id="endpointVisualSvgDescription">以三位示意病人的追蹤時間線，說明無惡化存活期計算到疾病惡化或死亡事件。</desc>
        <g class="endpoint-labels"><text x="82" y="105">治療開始</text><text x="682" y="105" text-anchor="end">追蹤時間（月）</text></g>
        <g class="endpoint-axis-labels"><line x1="170" y1="352" x2="680" y2="352"/><text x="170" y="376" text-anchor="middle">0</text><text x="340" y="376" text-anchor="middle">3</text><text x="510" y="376" text-anchor="middle">6</text><text x="680" y="376" text-anchor="middle">9</text></g>
        <g class="endpoint-legend endpoint-censor"><circle cx="438" cy="106" r="5"/><text x="452" y="111">惡化</text><path class="endpoint-alert" d="M500 100L512 112M512 100L500 112"/><text x="522" y="111">死亡</text><line x1="586" y1="96" x2="586" y2="116"/><text x="598" y="111">截尾</text></g>
        <g class="endpoint-timeline endpoint-delay-1"><text x="82" y="158">病人 01</text><line class="endpoint-track" x1="170" y1="154" x2="680" y2="154"/><line class="endpoint-live" x1="170" y1="154" x2="610" y2="154"/><circle cx="610" cy="154" r="9"/><path d="M604 148L616 160M616 148L604 160"/></g>
        <g class="endpoint-timeline endpoint-delay-2"><text x="82" y="226">病人 02</text><line class="endpoint-track" x1="170" y1="222" x2="680" y2="222"/><line class="endpoint-live endpoint-alert" x1="170" y1="222" x2="474" y2="222"/><circle class="endpoint-alert" cx="474" cy="222" r="9"/></g>
        <g class="endpoint-timeline endpoint-delay-3"><text x="82" y="294">病人 03</text><line class="endpoint-track" x1="170" y1="290" x2="680" y2="290"/><line class="endpoint-live" x1="170" y1="290" x2="548" y2="290"/><line class="endpoint-censor" x1="548" y1="276" x2="548" y2="304"/></g>
        <g class="endpoint-note"><rect x="82" y="380" width="598" height="34" rx="3"/><text x="105" y="402">PFS 的事件規則、影像評估與截尾處理，會影響曲線可信度。</text></g>`,
      os: `<title id="endpointVisualSvgTitle">OS 臨床終點概念圖</title><desc id="endpointVisualSvgDescription">以兩條示意存活曲線，說明整體存活要比較完整曲線、事件數與追蹤成熟度。</desc>
        <g class="endpoint-chart-grid"><line x1="96" y1="128" x2="96" y2="354"/><line x1="96" y1="354" x2="686" y2="354"/><line x1="96" y1="282" x2="686" y2="282"/><line x1="96" y1="210" x2="686" y2="210"/><line x1="96" y1="138" x2="686" y2="138"/></g>
        <g class="endpoint-labels"><text x="92" y="106">存活比例（%）</text><text x="686" y="385" text-anchor="end">追蹤時間（月）</text></g>
        <g class="endpoint-axis-labels"><text x="78" y="142" text-anchor="end">100</text><text x="78" y="214" text-anchor="end">75</text><text x="78" y="286" text-anchor="end">50</text><text x="96" y="378" text-anchor="middle">0</text><text x="292" y="378" text-anchor="middle">6</text><text x="488" y="378" text-anchor="middle">12</text><text x="686" y="378" text-anchor="middle">18</text></g>
        <path class="endpoint-curve endpoint-curve-primary" d="M96 138H190V154H282V178H382V210H488V238H588V258H686"/>
        <path class="endpoint-curve endpoint-curve-control" d="M96 138H178V174H270V218H366V258H468V294H570V324H686"/>
        <g class="endpoint-censor"><line x1="333" y1="188" x2="333" y2="208"/><line x1="612" y1="248" x2="612" y2="268"/><line x1="514" y1="286" x2="514" y2="306"/></g>
        <g class="endpoint-legend"><circle cx="500" cy="112" r="5"/><text x="514" y="117">治療組（示意）</text><circle class="endpoint-control-dot" cx="610" cy="112" r="5"/><text x="624" y="117">對照組</text></g>
        <g class="endpoint-at-risk"><text x="116" y="326">Number at risk（示意）：治療組 80→58→36；對照組 80→42→20</text></g>
        <g class="endpoint-note"><rect x="116" y="334" width="372" height="40" rx="3"/><text x="136" y="360">OS 要看事件數、追蹤成熟度與後續治療干擾。</text></g>`,
      hr: `<title id="endpointVisualSvgTitle">Hazard Ratio 概念圖</title><desc id="endpointVisualSvgDescription">用風險比尺度與信賴區間示意，說明 HR 小於一通常有利治療組，但仍須確認信賴區間是否跨一。</desc>
        <g class="endpoint-hr-head"><text x="92" y="136">相對 hazard</text><text x="92" y="183">${hrStats.hr.toFixed(2)}</text><text x="212" y="181">95% CI ${hrStats.low.toFixed(2)}–${hrStats.high.toFixed(2)}</text></g>
        <g class="endpoint-hr-scale"><line x1="96" y1="268" x2="680" y2="268"/><line x1="96" y1="256" x2="96" y2="280"/><line x1="388" y1="246" x2="388" y2="290"/><line x1="680" y1="256" x2="680" y2="280"/><text x="96" y="308" text-anchor="middle">0.5</text><text x="388" y="308" text-anchor="middle">1.0</text><text x="680" y="308" text-anchor="middle">1.5</text><text x="196" y="344" text-anchor="middle">有利治療組</text><text x="580" y="344" text-anchor="middle">有利對照組</text></g>
        <g class="endpoint-ci"><line x1="${hrX(hrStats.low).toFixed(1)}" y1="268" x2="${hrX(hrStats.high).toFixed(1)}" y2="268"/><line x1="${hrX(hrStats.low).toFixed(1)}" y1="256" x2="${hrX(hrStats.low).toFixed(1)}" y2="280"/><line x1="${hrX(hrStats.high).toFixed(1)}" y1="256" x2="${hrX(hrStats.high).toFixed(1)}" y2="280"/><circle cx="${hrX(hrStats.hr).toFixed(1)}" cy="268" r="12"/></g>
        <g class="endpoint-note"><rect x="96" y="366" width="584" height="36" rx="3"/><text x="116" y="389">先看點估計，再看 95% CI 是否跨 1；HR 是相對 hazard，不是「多活幾個月」。</text></g>`
    };

    const compactVisualTemplates = {
      orr: `<title id="endpointVisualSvgTitle">ORR 臨床終點概念圖</title><desc id="endpointVisualSvgDescription">以預先定義分析族群中的 CR 與 PR 病人計算客觀反應率。</desc>
        <g class="endpoint-labels"><text x="24" y="42">治療前</text><text x="366" y="42" text-anchor="end">影像評估</text></g>
        <g class="endpoint-row"><circle class="endpoint-baseline" cx="58" cy="90" r="21"/><line x1="92" y1="90" x2="316" y2="90"/><circle class="endpoint-response" cx="340" cy="90" r="6"/><g class="endpoint-badge endpoint-badge-good"><rect x="158" y="70" width="100" height="40" rx="4"/><text x="208" y="95" text-anchor="middle">CR 完全反應</text></g></g>
        <g class="endpoint-row"><circle class="endpoint-baseline" cx="58" cy="152" r="27"/><line x1="92" y1="152" x2="316" y2="152"/><circle class="endpoint-response" cx="340" cy="152" r="15"/><g class="endpoint-badge endpoint-badge-good"><rect x="158" y="132" width="100" height="40" rx="4"/><text x="208" y="157" text-anchor="middle">PR 部分反應</text></g></g>
        <g class="endpoint-row"><circle class="endpoint-baseline" cx="58" cy="214" r="24"/><line x1="92" y1="214" x2="316" y2="214"/><circle class="endpoint-response endpoint-neutral" cx="340" cy="214" r="22"/><g class="endpoint-badge endpoint-badge-neutral"><rect x="158" y="194" width="100" height="40" rx="4"/><text x="208" y="219" text-anchor="middle">SD 疾病穩定</text></g></g>
        <g class="endpoint-row"><circle class="endpoint-baseline" cx="58" cy="276" r="20"/><line x1="92" y1="276" x2="316" y2="276"/><circle class="endpoint-response endpoint-worse" cx="340" cy="276" r="28"/><g class="endpoint-badge endpoint-badge-worse"><rect x="158" y="256" width="100" height="40" rx="4"/><text x="208" y="281" text-anchor="middle">PD 疾病惡化</text></g></g>
        <g class="endpoint-note"><rect x="26" y="326" width="338" height="54" rx="5"/><text x="44" y="350">ORR = CR + PR；分母依 protocol / estimand</text><text x="44" y="370">使用預先定義分析族群，不能任意排除缺失評估。</text></g>`,
      pfs: `<title id="endpointVisualSvgTitle">PFS 臨床終點概念圖</title><desc id="endpointVisualSvgDescription">以三位病人的追蹤時間線示意，區分疾病惡化、死亡與截尾。</desc>
        <g class="endpoint-labels"><text x="28" y="48">治療開始</text><text x="360" y="48" text-anchor="end">追蹤月份</text></g>
        <g class="endpoint-axis-labels"><line x1="96" y1="300" x2="352" y2="300"/><text x="96" y="324" text-anchor="middle">0</text><text x="181" y="324" text-anchor="middle">3</text><text x="266" y="324" text-anchor="middle">6</text><text x="352" y="324" text-anchor="middle">9</text></g>
        <g class="endpoint-legend"><circle cx="82" cy="78" r="5"/><text x="96" y="83">惡化</text><path class="endpoint-alert" d="M156 72L168 84M168 72L156 84"/><text x="180" y="83">死亡</text><line class="endpoint-censor" x1="248" y1="68" x2="248" y2="88"/><text x="260" y="83">截尾</text></g>
        <g class="endpoint-timeline"><text x="28" y="126">病人 01</text><line class="endpoint-track" x1="96" y1="122" x2="352" y2="122"/><line class="endpoint-live" x1="96" y1="122" x2="318" y2="122"/><path d="M312 116L324 128M324 116L312 128"/></g>
        <g class="endpoint-timeline"><text x="28" y="184">病人 02</text><line class="endpoint-track" x1="96" y1="180" x2="352" y2="180"/><line class="endpoint-live endpoint-alert" x1="96" y1="180" x2="240" y2="180"/><circle class="endpoint-alert" cx="240" cy="180" r="8"/></g>
        <g class="endpoint-timeline"><text x="28" y="242">病人 03</text><line class="endpoint-track" x1="96" y1="238" x2="352" y2="238"/><line class="endpoint-live" x1="96" y1="238" x2="280" y2="238"/><line class="endpoint-censor" x1="280" y1="224" x2="280" y2="252"/></g>
        <g class="endpoint-note"><rect x="26" y="344" width="338" height="42" rx="5"/><text x="44" y="370">PFS 必須看事件規則、影像評估與截尾處理。</text></g>`,
      os: `<title id="endpointVisualSvgTitle">OS 臨床終點概念圖</title><desc id="endpointVisualSvgDescription">以 Kaplan-Meier 概念曲線示意整體存活百分比與追蹤月份。</desc>
        <g class="endpoint-chart-grid"><line x1="64" y1="72" x2="64" y2="292"/><line x1="64" y1="292" x2="358" y2="292"/><line x1="64" y1="224" x2="358" y2="224"/><line x1="64" y1="156" x2="358" y2="156"/><line x1="64" y1="88" x2="358" y2="88"/></g>
        <g class="endpoint-labels"><text x="58" y="46">存活比例（%）</text><text x="358" y="330" text-anchor="end">月份</text></g>
        <g class="endpoint-axis-labels"><text x="46" y="92" text-anchor="end">100</text><text x="46" y="160" text-anchor="end">75</text><text x="46" y="228" text-anchor="end">50</text><text x="64" y="316" text-anchor="middle">0</text><text x="162" y="316" text-anchor="middle">6</text><text x="260" y="316" text-anchor="middle">12</text><text x="358" y="316" text-anchor="middle">18</text></g>
        <path class="endpoint-curve endpoint-curve-primary" d="M64 88H112V106H164V132H216V166H270V198H318V220H358"/>
        <path class="endpoint-curve endpoint-curve-control" d="M64 88H106V124H154V170H205V212H254V250H310V276H358"/>
        <g class="endpoint-censor"><line x1="188" y1="124" x2="188" y2="144"/><line x1="292" y1="190" x2="292" y2="210"/><line x1="278" y1="242" x2="278" y2="262"/></g>
        <g class="endpoint-legend"><circle cx="102" cy="354" r="5"/><text x="116" y="359">治療組</text><circle class="endpoint-control-dot" cx="206" cy="354" r="5"/><text x="220" y="359">對照組</text></g>
        <g class="endpoint-note"><rect x="24" y="374" width="342" height="36" rx="5"/><text x="42" y="397">OS 要看事件數、追蹤成熟度與後續治療干擾。</text></g>`,
      hr: `<title id="endpointVisualSvgTitle">Hazard Ratio 概念圖</title><desc id="endpointVisualSvgDescription">用同一組 HR 與 95% 信賴區間生成數字與座標。</desc>
        <g class="endpoint-hr-head"><text x="28" y="60">相對 hazard</text><text x="28" y="114">${hrStats.hr.toFixed(2)}</text><text x="172" y="108">95% CI ${hrStats.low.toFixed(2)}–${hrStats.high.toFixed(2)}</text></g>
        <g class="endpoint-hr-scale"><line x1="46" y1="210" x2="346" y2="210"/><line x1="46" y1="198" x2="46" y2="222"/><line x1="196" y1="188" x2="196" y2="236"/><line x1="346" y1="198" x2="346" y2="222"/><text x="46" y="246" text-anchor="middle">0.5</text><text x="196" y="246" text-anchor="middle">1.0</text><text x="346" y="246" text-anchor="middle">1.5</text><text x="112" y="286" text-anchor="middle">有利治療組</text><text x="286" y="286" text-anchor="middle">有利對照組</text></g>
        <g class="endpoint-ci"><line x1="${(46 + ((hrStats.low - 0.5) / 1) * 300).toFixed(1)}" y1="210" x2="${(46 + ((hrStats.high - 0.5) / 1) * 300).toFixed(1)}" y2="210"/><line x1="${(46 + ((hrStats.low - 0.5) / 1) * 300).toFixed(1)}" y1="198" x2="${(46 + ((hrStats.low - 0.5) / 1) * 300).toFixed(1)}" y2="222"/><line x1="${(46 + ((hrStats.high - 0.5) / 1) * 300).toFixed(1)}" y1="198" x2="${(46 + ((hrStats.high - 0.5) / 1) * 300).toFixed(1)}" y2="222"/><circle cx="${(46 + ((hrStats.hr - 0.5) / 1) * 300).toFixed(1)}" cy="210" r="12"/></g>
        <g class="endpoint-note"><rect x="24" y="326" width="342" height="54" rx="5"/><text x="42" y="350">先看點估計，再看 95% CI 是否跨 1。</text><text x="42" y="370">HR 是相對 hazard，不是「多活幾個月」。</text></g>`
    };

    const endpointPicture = document.getElementById("endpointPicture");
    const endpointSource = endpointPicture?.querySelector("source");
    const mobileViewport = window.matchMedia("(max-width: 680px)");
    let visualRequestId = 0;
    const imageUrl = (base, size) => `../assets/guides/webp/${base}-${size}.webp`;
    function preloadAdjacent(endpoint) {
      const keys = Object.keys(endpointImages);
      const index = keys.indexOf(endpoint);
      [index - 1, index + 1].filter((next) => keys[next]).forEach((next) => {
        const preload = new Image();
        preload.src = imageUrl(endpointImages[keys[next]], mobileViewport.matches ? 720 : 1200);
      });
    }
    async function renderVisual(endpoint) {
      endpointLab.classList.add("uses-generated-endpoint-image");
      endpointLab.classList.remove("is-compact-visual");
      endpointVisual.removeAttribute("viewBox");
      const requestId = ++visualRequestId;
      const mobileUrl = imageUrl(endpointImages[endpoint], 720);
      const desktopUrl = imageUrl(endpointImages[endpoint], 1200);
      const next = new Image();
      next.src = mobileViewport.matches ? mobileUrl : desktopUrl;
      try { await next.decode(); } catch { return; }
      if (requestId !== visualRequestId) return;
      if (endpointSource) endpointSource.srcset = mobileUrl;
      endpointVisual.src = desktopUrl;
      endpointVisual.alt = endpointImageAlt[endpoint];
      endpointVisual.dataset.zoomSrc = desktopUrl;
      endpointVisual.dataset.endpointReady = "true";
      panel.querySelector(".guide-image-zoom")?.setAttribute("aria-label", `放大 ${endpoint.toUpperCase()} 圖解`);
      preloadAdjacent(endpoint);
    }

    function activate(tab, focusPanel = false) {
      const endpoint = tab.dataset.endpoint || "orr";
      const content = endpointContent[endpoint];
      endpointLab.dataset.endpoint = endpoint;
      tabs.forEach((item) => {
        item.setAttribute("aria-selected", String(item === tab));
        item.tabIndex = item === tab ? 0 : -1;
      });
      panel.setAttribute("aria-labelledby", tab.id);
      visualTitle.textContent = content.visual;
      kicker.textContent = content.kicker;
      title.textContent = content.title;
      copy.textContent = content.copy;
      question.textContent = content.question;
      limit.textContent = content.limit;
      if (modeCaption) modeCaption.textContent = "教學示意數據，非特定臨床試驗結果；判讀實際研究須回到 protocol、SAP 與完整資料。";
      renderVisual(endpoint);
      if (focusPanel) panel.focus?.();
    }

    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => activate(tab));
      tab.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        let nextIndex = index;
        if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
        if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
        if (event.key === "Home") nextIndex = 0;
        if (event.key === "End") nextIndex = tabs.length - 1;
        tabs[nextIndex].focus();
        activate(tabs[nextIndex]);
      });
    });

    endpointVisual.dataset.zoomSrc = imageUrl(endpointImages.orr, 1200);
    activate(tabs[0]);
    compactVisual.addEventListener("change", () => {
      const active = tabs.find((item) => item.getAttribute("aria-selected") === "true") || tabs[0];
      activate(active);
    });
  }

  const revealButton = document.getElementById("practiceReveal");
  const practiceAnswer = document.getElementById("practiceAnswer");
  revealButton?.addEventListener("click", () => {
    const selected = document.querySelector('input[name="practice"]:checked');
    practiceAnswer.hidden = false;
    practiceAnswer.classList.remove("is-correct", "is-incomplete");
    if (!selected) {
      practiceAnswer.classList.add("is-incomplete");
      practiceAnswer.textContent = "先選一個判斷，再查看分析。";
      return;
    }
    const correct = selected.value === "b";
    practiceAnswer.classList.add(correct ? "is-correct" : "is-incomplete");
    practiceAnswer.textContent = correct
      ? "正確。ORR 60% 是值得追蹤的初步活性訊號，但只有 20 人、單臂且追蹤 4 個月，尚不足以證明優於標準治療，更不能直接外推 OS。下一步應看反應持續時間、病人基線、比較資料、安全性與擴大樣本後是否維持。"
      : "這個結論超過目前證據。ORR 是反應率，不等於存活改善；單臂、20 人與短追蹤也不足以證明優於標準治療。較合理的判斷是：有初步活性訊號，但需要持續性、比較基準與更多病人確認。";
  });

  const lessonComplete = document.getElementById("lessonComplete");
  const progressKey = "drugnews-guide-progress-v1";
  function readSavedProgress() {
    try { return JSON.parse(localStorage.getItem(progressKey) || "[]"); }
    catch { return []; }
  }
  function saveLessonProgress(completed) {
    const saved = new Set(readSavedProgress());
    if (completed) saved.add("clinical-endpoints");
    else saved.delete("clinical-endpoints");
    try { localStorage.setItem(progressKey, JSON.stringify([...saved])); }
    catch { /* The lesson remains usable when storage is unavailable. */ }
  }
  if (lessonComplete) {
    lessonComplete.checked = new Set(readSavedProgress()).has("clinical-endpoints");
    lessonComplete.addEventListener("change", () => saveLessonProgress(lessonComplete.checked));
  }
})();
