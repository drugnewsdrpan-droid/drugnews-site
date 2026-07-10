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
  const canvas = document.getElementById("endpointCanvas");
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

  if (endpointLab && canvas && tabs.length && canvas.getContext) {
    const context = canvas.getContext("2d");
    let width = 0;
    let height = 0;
    let dpr = 1;
    let mode = "orr";
    let modeStartedAt = performance.now();
    let visible = true;
    let lastFrame = 0;

    function resizeCanvas() {
      const rect = panel.getBoundingClientRect();
      width = Math.max(280, Math.round(rect.width));
      height = Math.max(320, Math.round(rect.height));
      dpr = Math.min(1.5, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(performance.now(), true);
    }

    function easeOutCubic(value) {
      return 1 - (1 - value) ** 3;
    }

    function progress(time, duration = 1100) {
      if (reducedMotion.matches) return 1;
      return easeOutCubic(Math.min(1, (time - modeStartedAt) / duration));
    }

    function label(text, x, y, options = {}) {
      context.fillStyle = options.color || "#526b70";
      context.font = `${options.weight || 700} ${options.size || 12}px system-ui, -apple-system, sans-serif`;
      context.textAlign = options.align || "left";
      context.fillText(text, x, y);
    }

    function drawAxis(x, y, axisWidth, axisHeight) {
      context.beginPath();
      context.moveTo(x, y - axisHeight);
      context.lineTo(x, y);
      context.lineTo(x + axisWidth, y);
      context.strokeStyle = "rgba(54, 91, 98, 0.36)";
      context.lineWidth = 1;
      context.stroke();
    }

    function drawORR(time) {
      const animated = progress(time);
      const compact = width < 520;
      const startX = compact ? 42 : 72;
      const endX = width - (compact ? 38 : 66);
      const rows = compact ? 4 : 5;
      const top = compact ? 104 : 118;
      const gap = compact ? 49 : 52;
      label("治療前", startX, top - 34, { size: 11, color: "#60787d" });
      label("影像評估", endX, top - 34, { size: 11, color: "#60787d", align: "right" });

      for (let index = 0; index < rows; index += 1) {
        const y = top + index * gap;
        const initialRadius = compact ? 14 + (index % 2) * 3 : 17 + (index % 2) * 4;
        const responseRatio = [0.34, 0.58, 0.92, 0.46, 0.78][index];
        const finalRadius = initialRadius * (1 - responseRatio * animated * 0.72);
        context.beginPath();
        context.arc(startX + 18, y, initialRadius, 0, Math.PI * 2);
        context.fillStyle = "rgba(49, 95, 139, 0.2)";
        context.strokeStyle = "rgba(49, 95, 139, 0.66)";
        context.fill();
        context.stroke();

        context.beginPath();
        context.moveTo(startX + 48, y);
        context.lineTo(endX - 50, y);
        context.strokeStyle = "rgba(23, 111, 123, 0.25)";
        context.setLineDash([3, 7]);
        context.stroke();
        context.setLineDash([]);

        const signalX = startX + 48 + (endX - startX - 98) * ((time * 0.00016 + index * 0.16) % 1);
        context.beginPath();
        context.arc(signalX, y, 3, 0, Math.PI * 2);
        context.fillStyle = "#a0522f";
        context.shadowBlur = 9;
        context.shadowColor = "#a0522f";
        context.fill();
        context.shadowBlur = 0;

        context.beginPath();
        context.arc(endX - 18, y, finalRadius, 0, Math.PI * 2);
        context.fillStyle = "rgba(53, 123, 105, 0.22)";
        context.strokeStyle = "#357b69";
        context.fill();
        context.stroke();
      }
      label("每一列代表一位示意病人的腫瘤量測變化", startX, Math.min(height - 26, top + rows * gap + 8), { size: 11, color: "#60787d" });
    }

    function drawPFS(time) {
      const animated = progress(time);
      const left = width < 520 ? 42 : 72;
      const right = width - (width < 520 ? 28 : 54);
      const top = 126;
      const laneGap = 82;
      label("治療開始", left, top - 40, { size: 11 });
      label("追蹤時間", right, top - 40, { size: 11, align: "right" });

      [0, 1, 2].forEach((lane) => {
        const y = top + lane * laneGap;
        const ratio = [0.83, 0.58, 0.72][lane] * animated;
        context.beginPath();
        context.moveTo(left, y);
        context.lineTo(right, y);
        context.strokeStyle = "rgba(64, 101, 108, 0.22)";
        context.lineWidth = 5;
        context.stroke();

        context.beginPath();
        context.moveTo(left, y);
        context.lineTo(left + (right - left) * ratio, y);
        context.strokeStyle = lane === 1 ? "#a0522f" : "#176f7b";
        context.lineWidth = 5;
        context.stroke();

        const eventX = left + (right - left) * ratio;
        context.beginPath();
        context.moveTo(eventX - 7, y - 7);
        context.lineTo(eventX + 7, y + 7);
        context.moveTo(eventX + 7, y - 7);
        context.lineTo(eventX - 7, y + 7);
        context.strokeStyle = lane === 1 ? "#a0522f" : "#176f7b";
        context.lineWidth = 2;
        context.stroke();
        label(`病人 ${lane + 1}`, left, y - 16, { size: 11, color: "#536d72" });
      });
      label("× 代表疾病惡化或死亡事件；線段長度代表無事件時間", left, Math.min(height - 28, top + laneGap * 3 + 12), { size: 11, color: "#60787d" });
    }

    function drawSurvivalCurve(time, highlightHR = false) {
      const animated = progress(time, 1250);
      const left = width < 520 ? 44 : 72;
      const right = width - (width < 520 ? 28 : 50);
      const bottom = height - 56;
      const top = 92;
      drawAxis(left, bottom, right - left, bottom - top);
      label("時間", right, bottom + 28, { size: 11, align: "right" });
      label(highlightHR ? "事件風險" : "存活比例", left - 4, top - 14, { size: 11 });

      const curves = highlightHR
        ? [[1, 0.92, 0.83, 0.7, 0.56, 0.44], [1, 0.84, 0.69, 0.52, 0.36, 0.24]]
        : [[1, 0.96, 0.86, 0.78, 0.7, 0.64], [1, 0.9, 0.74, 0.61, 0.49, 0.4]];
      const colors = ["#176f7b", "#a0522f"];

      curves.forEach((curve, curveIndex) => {
        context.beginPath();
        curve.forEach((value, index) => {
          const pointProgress = index / (curve.length - 1);
          if (pointProgress > animated) return;
          const x = left + (right - left) * pointProgress;
          const y = bottom - (bottom - top) * value;
          if (index === 0) context.moveTo(x, y);
          else {
            const previousX = left + (right - left) * ((index - 1) / (curve.length - 1));
            const previousY = bottom - (bottom - top) * curve[index - 1];
            context.lineTo(x, previousY);
            context.lineTo(x, y);
          }
        });
        context.strokeStyle = colors[curveIndex];
        context.lineWidth = curveIndex === 0 ? 3 : 2.4;
        context.shadowBlur = curveIndex === 0 ? 8 : 0;
        context.shadowColor = colors[curveIndex];
        context.stroke();
        context.shadowBlur = 0;
      });

      label("治療組（示意）", right, top + 24, { size: 11, color: colors[0], align: "right" });
      label("對照組（示意）", right, top + 44, { size: 11, color: colors[1], align: "right" });
      if (highlightHR) {
        context.fillStyle = "rgba(23, 111, 123, 0.08)";
        context.fillRect(left + (right - left) * 0.34, top + 68, (right - left) * 0.42, bottom - top - 98);
        label("HR 比較的是整段追蹤中的相對事件風險", left + 14, bottom - 16, { size: 11, color: "#526b70" });
      }
    }

    function draw(time, force = false) {
      if (!force && (!visible || document.hidden)) return;
      context.clearRect(0, 0, width, height);
      if (mode === "orr") drawORR(time);
      if (mode === "pfs") drawPFS(time);
      if (mode === "os") drawSurvivalCurve(time, false);
      if (mode === "hr") drawSurvivalCurve(time, true);
      canvas.dataset.endpointReady = "true";
    }

    function activate(tab, focusPanel = false) {
      mode = tab.dataset.endpoint || "orr";
      modeStartedAt = performance.now();
      const content = endpointContent[mode];
      endpointLab.dataset.endpoint = mode;
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
      draw(modeStartedAt, true);
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

    function animate(time) {
      requestAnimationFrame(animate);
      if (time - lastFrame < 33) return;
      lastFrame = time;
      draw(time);
    }

    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
    }, { threshold: 0.02 }).observe(endpointLab);
    new ResizeObserver(resizeCanvas).observe(panel);
    activate(tabs[0]);
    resizeCanvas();
    if (!reducedMotion.matches) requestAnimationFrame(animate);
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
