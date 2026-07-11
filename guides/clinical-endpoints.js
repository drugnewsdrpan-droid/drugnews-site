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
    const visualTemplates = {
      orr: `<title id="endpointVisualSvgTitle">ORR 臨床終點概念圖</title><desc id="endpointVisualSvgDescription">以四位示意病人的治療前與影像評估結果，說明客觀反應率如何觀察腫瘤縮小。</desc>
        <g class="endpoint-labels"><text x="80" y="112">治療前腫瘤量測</text><text x="650" y="112" text-anchor="end">影像評估</text></g>
        <g class="endpoint-row endpoint-delay-1"><circle class="endpoint-baseline" cx="104" cy="160" r="25"/><line x1="150" y1="160" x2="600" y2="160"/><circle class="endpoint-signal" cx="420" cy="160" r="5"/><circle class="endpoint-response" cx="626" cy="160" r="5"/><g class="endpoint-badge endpoint-badge-good"><rect x="314" y="140" width="92" height="40" rx="3"/><text x="360" y="165" text-anchor="middle">CR 完全反應</text></g></g>
        <g class="endpoint-row endpoint-delay-2"><circle class="endpoint-baseline" cx="104" cy="224" r="31"/><line x1="150" y1="224" x2="600" y2="224"/><circle class="endpoint-signal" cx="470" cy="224" r="5"/><circle class="endpoint-response" cx="626" cy="224" r="16"/><g class="endpoint-badge endpoint-badge-good"><rect x="314" y="204" width="92" height="40" rx="3"/><text x="360" y="229" text-anchor="middle">PR 部分反應</text></g></g>
        <g class="endpoint-row endpoint-delay-3"><circle class="endpoint-baseline" cx="104" cy="288" r="27"/><line x1="150" y1="288" x2="600" y2="288"/><circle class="endpoint-signal" cx="510" cy="288" r="5"/><circle class="endpoint-response endpoint-neutral" cx="626" cy="288" r="25"/><g class="endpoint-badge endpoint-badge-neutral"><rect x="314" y="268" width="92" height="40" rx="3"/><text x="360" y="293" text-anchor="middle">SD 疾病穩定</text></g></g>
        <g class="endpoint-row endpoint-delay-4"><circle class="endpoint-baseline" cx="104" cy="352" r="23"/><line x1="150" y1="352" x2="600" y2="352"/><circle class="endpoint-signal" cx="550" cy="352" r="5"/><circle class="endpoint-response endpoint-worse" cx="626" cy="352" r="31"/><g class="endpoint-badge endpoint-badge-worse"><rect x="314" y="332" width="92" height="40" rx="3"/><text x="360" y="357" text-anchor="middle">PD 疾病惡化</text></g></g>
        <g class="endpoint-formula"><rect x="664" y="142" width="70" height="228" rx="3"/><text x="699" y="172" text-anchor="middle">ORR</text><text x="699" y="208" text-anchor="middle">=</text><text x="699" y="248" text-anchor="middle">CR</text><text x="699" y="276" text-anchor="middle">+</text><text x="699" y="316" text-anchor="middle">PR</text><line x1="680" y1="334" x2="718" y2="334"/><text x="699" y="356" text-anchor="middle">可評估人數</text></g>`,
      pfs: `<title id="endpointVisualSvgTitle">PFS 臨床終點概念圖</title><desc id="endpointVisualSvgDescription">以三位示意病人的追蹤時間線，說明無惡化存活期計算到疾病惡化或死亡事件。</desc>
        <g class="endpoint-labels"><text x="82" y="116">治療開始</text><text x="682" y="116" text-anchor="end">持續追蹤</text></g>
        <g class="endpoint-timeline endpoint-delay-1"><text x="82" y="164">病人 01</text><line class="endpoint-track" x1="170" y1="160" x2="680" y2="160"/><line class="endpoint-live" x1="170" y1="160" x2="610" y2="160"/><circle cx="610" cy="160" r="9"/><path d="M604 154L616 166M616 154L604 166"/></g>
        <g class="endpoint-timeline endpoint-delay-2"><text x="82" y="238">病人 02</text><line class="endpoint-track" x1="170" y1="234" x2="680" y2="234"/><line class="endpoint-live endpoint-alert" x1="170" y1="234" x2="474" y2="234"/><circle class="endpoint-alert" cx="474" cy="234" r="9"/><path class="endpoint-alert" d="M468 228L480 240M480 228L468 240"/></g>
        <g class="endpoint-timeline endpoint-delay-3"><text x="82" y="312">病人 03</text><line class="endpoint-track" x1="170" y1="308" x2="680" y2="308"/><line class="endpoint-live" x1="170" y1="308" x2="548" y2="308"/><circle cx="548" cy="308" r="9"/><path d="M542 302L554 314M554 302L542 314"/></g>
        <g class="endpoint-note"><rect x="82" y="350" width="598" height="42" rx="3"/><text x="105" y="376">PFS 記錄從起點到疾病惡化或死亡的時間，仍要和對照組比較。</text></g>`,
      os: `<title id="endpointVisualSvgTitle">OS 臨床終點概念圖</title><desc id="endpointVisualSvgDescription">以兩條示意存活曲線，說明整體存活要比較完整曲線、事件數與追蹤成熟度。</desc>
        <g class="endpoint-chart-grid"><line x1="96" y1="128" x2="96" y2="354"/><line x1="96" y1="354" x2="686" y2="354"/><line x1="96" y1="282" x2="686" y2="282"/><line x1="96" y1="210" x2="686" y2="210"/><line x1="96" y1="138" x2="686" y2="138"/></g>
        <g class="endpoint-labels"><text x="92" y="116">存活比例</text><text x="686" y="385" text-anchor="end">追蹤時間</text></g>
        <path class="endpoint-curve endpoint-curve-primary" d="M96 138H190V154H282V178H382V210H488V238H588V258H686"/>
        <path class="endpoint-curve endpoint-curve-control" d="M96 138H178V174H270V218H366V258H468V294H570V324H686"/>
        <g class="endpoint-legend"><circle cx="500" cy="112" r="5"/><text x="514" y="117">治療組（示意）</text><circle class="endpoint-control-dot" cx="610" cy="112" r="5"/><text x="624" y="117">對照組</text></g>
        <g class="endpoint-note"><rect x="116" y="300" width="310" height="40" rx="3"/><text x="136" y="326">曲線何時分開、是否維持，比單一中位數更重要。</text></g>`,
      hr: `<title id="endpointVisualSvgTitle">Hazard Ratio 概念圖</title><desc id="endpointVisualSvgDescription">用風險比尺度與信賴區間示意，說明 HR 小於一通常有利治療組，但仍須確認信賴區間是否跨一。</desc>
        <g class="endpoint-hr-head"><text x="92" y="136">相對事件風險</text><text x="92" y="183">0.70</text><text x="212" y="181">示意值</text></g>
        <g class="endpoint-hr-scale"><line x1="96" y1="268" x2="680" y2="268"/><line x1="96" y1="256" x2="96" y2="280"/><line x1="388" y1="246" x2="388" y2="290"/><line x1="680" y1="256" x2="680" y2="280"/><text x="96" y="308" text-anchor="middle">0.5</text><text x="388" y="308" text-anchor="middle">1.0</text><text x="680" y="308" text-anchor="middle">1.5</text><text x="196" y="344" text-anchor="middle">有利治療組</text><text x="580" y="344" text-anchor="middle">有利對照組</text></g>
        <g class="endpoint-ci"><line x1="184" y1="268" x2="348" y2="268"/><line x1="184" y1="256" x2="184" y2="280"/><line x1="348" y1="256" x2="348" y2="280"/><circle cx="266" cy="268" r="12"/></g>
        <g class="endpoint-note"><rect x="96" y="366" width="584" height="36" rx="3"/><text x="116" y="389">先看點估計，再看信賴區間是否跨過 1；HR 不是「多活幾個月」。</text></g>`
    };

    function renderVisual(endpoint) {
      endpointVisual.innerHTML = visualTemplates[endpoint];
      endpointVisual.dataset.endpointReady = "true";
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

    activate(tabs[0]);
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
