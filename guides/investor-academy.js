(() => {
  const header = document.querySelector(".site-header");
  const navToggle = document.getElementById("site-nav-toggle");
  const navButton = document.querySelector(".nav-menu-button");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function updateHeader() {
    header?.classList.toggle("preview-condensed", window.scrollY > 20);
  }

  function syncMenuState() {
    navButton?.setAttribute("aria-expanded", String(Boolean(navToggle?.checked)));
  }

  window.addEventListener("scroll", updateHeader, { passive: true });
  navToggle?.addEventListener("change", syncMenuState);
  navButton?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    navToggle.checked = !navToggle.checked;
    syncMenuState();
  });
  updateHeader();
  syncMenuState();

  const journey = document.getElementById("academyJourney");
  const journeyCanvas = document.getElementById("academyJourneyCanvas");
  const journeyStages = [...document.querySelectorAll(".journey-stage")];
  const stageNumber = document.getElementById("journeyStageNumber");
  const stageTitle = document.getElementById("journeyStageTitle");
  const stageCopy = document.getElementById("journeyStageCopy");
  const stageLink = document.getElementById("journeyStageLink");

  if (journey && journeyCanvas && journeyStages.length && journeyCanvas.getContext) {
    const context = journeyCanvas.getContext("2d");
    const colors = ["#176f7b", "#315f8b", "#357b69", "#a0522f", "#274f70"];
    let width = 0;
    let height = 0;
    let dpr = 1;
    let activeStage = 0;
    let visible = true;
    let lastFrame = 0;

    function resizeJourney() {
      const rect = journey.getBoundingClientRect();
      width = Math.max(280, Math.round(rect.width));
      height = Math.max(440, Math.round(rect.height));
      dpr = Math.min(1.5, window.devicePixelRatio || 1);
      journeyCanvas.width = Math.round(width * dpr);
      journeyCanvas.height = Math.round(height * dpr);
      journeyCanvas.style.width = `${width}px`;
      journeyCanvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawJourney(reducedMotion.matches ? 0 : performance.now(), true);
    }

    function stagePoints() {
      const mobile = width < 680;
      const y = mobile ? 142 : height * 0.48;
      const margins = mobile ? [0.1, 0.3, 0.5, 0.7, 0.9] : [0.09, 0.29, 0.49, 0.69, 0.9];
      return margins.map((ratio, index) => ({
        x: width * ratio,
        y: y + Math.sin(index * 1.3) * (mobile ? 8 : 27)
      }));
    }

    function pathPoint(points, progress) {
      const segmentProgress = progress * (points.length - 1);
      const segment = Math.min(points.length - 2, Math.floor(segmentProgress));
      const local = segmentProgress - segment;
      const start = points[segment];
      const end = points[segment + 1];
      return {
        x: start.x + (end.x - start.x) * local,
        y: start.y + (end.y - start.y) * local + Math.sin(local * Math.PI) * (segment % 2 === 0 ? -18 : 18)
      };
    }

    function drawBasePath(points) {
      context.beginPath();
      points.forEach((point, index) => {
        if (index === 0) context.moveTo(point.x, point.y);
        else {
          const previous = points[index - 1];
          const middleX = (previous.x + point.x) / 2;
          context.bezierCurveTo(middleX, previous.y, middleX, point.y, point.x, point.y);
        }
      });
      context.strokeStyle = "rgba(20, 91, 100, 0.34)";
      context.lineWidth = 2;
      context.setLineDash([4, 8]);
      context.stroke();
      context.setLineDash([]);
    }

    function drawJourney(time, force = false) {
      if (!force && (!visible || document.hidden)) return;
      context.clearRect(0, 0, width, height);
      const points = stagePoints();
      drawBasePath(points);

      points.forEach((point, index) => {
        const active = index === activeStage;
        const completed = index <= activeStage;
        context.beginPath();
        context.arc(point.x, point.y, active ? 17 : 10, 0, Math.PI * 2);
        context.fillStyle = completed ? `${colors[index]}e6` : "rgba(248, 252, 251, 0.78)";
        context.strokeStyle = active ? colors[index] : "rgba(38, 100, 107, 0.54)";
        context.lineWidth = active ? 3 : 1.3;
        context.shadowBlur = active ? 22 : 8;
        context.shadowColor = colors[index];
        context.fill();
        context.stroke();
        context.shadowBlur = 0;

        if (active && !reducedMotion.matches) {
          const pulse = 24 + ((time * 0.02) % 14);
          context.beginPath();
          context.arc(point.x, point.y, pulse, 0, Math.PI * 2);
          context.strokeStyle = `rgba(23, 111, 123, ${Math.max(0, 0.38 - (pulse - 24) * 0.025)})`;
          context.lineWidth = 1;
          context.stroke();
        }
      });

      const signalCount = reducedMotion.matches ? 2 : 7;
      for (let index = 0; index < signalCount; index += 1) {
        const progress = reducedMotion.matches ? (index + 1) / (signalCount + 1) : (time * 0.00009 + index / signalCount) % 1;
        const point = pathPoint(points, progress);
        const colorIndex = Math.min(colors.length - 1, Math.floor(progress * colors.length));
        context.beginPath();
        context.arc(point.x, point.y, index % 3 === 0 ? 4.5 : 2.7, 0, Math.PI * 2);
        context.fillStyle = colors[colorIndex];
        context.shadowBlur = 14;
        context.shadowColor = colors[colorIndex];
        context.fill();
        context.shadowBlur = 0;
      }

      journeyCanvas.dataset.journeyReady = "true";
    }

    function activateStage(stage, index) {
      activeStage = index;
      journey.dataset.activeStage = stage.dataset.stage || "foundation";
      journeyStages.forEach((item, itemIndex) => item.classList.toggle("is-active", itemIndex === index));
      stageNumber.textContent = stage.dataset.number || `PATH 0${index + 1}`;
      stageTitle.textContent = stage.dataset.title || stage.querySelector("strong")?.textContent || "學習路徑";
      stageCopy.textContent = stage.dataset.copy || "";
      stageLink.href = stage.href;
      drawJourney(reducedMotion.matches ? 0 : performance.now(), true);
    }

    journeyStages.forEach((stage, index) => {
      stage.addEventListener("pointerenter", () => activateStage(stage, index));
      stage.addEventListener("focus", () => activateStage(stage, index));
    });

    function animateJourney(time) {
      requestAnimationFrame(animateJourney);
      if (time - lastFrame < 33) return;
      lastFrame = time;
      drawJourney(time);
    }

    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
    }, { threshold: 0.02 }).observe(journey);
    new ResizeObserver(resizeJourney).observe(journey);
    activateStage(journeyStages[0], 0);
    resizeJourney();
    if (!reducedMotion.matches) requestAnimationFrame(animateJourney);
  }

  const progressInputs = [...document.querySelectorAll("[data-progress-id]")];
  const progressLabel = document.getElementById("learningProgressLabel");
  const progressBar = document.getElementById("learningProgressBar");
  const progressKey = "drugnews-guide-progress-v1";

  function readProgress() {
    try {
      return JSON.parse(localStorage.getItem(progressKey) || "[]");
    } catch {
      return [];
    }
  }

  function writeProgress(ids) {
    try {
      localStorage.setItem(progressKey, JSON.stringify(ids));
    } catch {
      // The preview still works when private browsing blocks storage.
    }
  }

  function updateProgress() {
    const completed = progressInputs.filter((input) => input.checked).map((input) => input.dataset.progressId);
    progressInputs.forEach((input) => {
      input.closest("li")?.classList.toggle("is-complete", input.checked);
    });
    if (progressLabel) progressLabel.textContent = `${completed.length} / ${progressInputs.length}`;
    if (progressBar) progressBar.style.width = `${progressInputs.length ? completed.length / progressInputs.length * 100 : 0}%`;
    writeProgress(completed);
  }

  const savedProgress = new Set(readProgress());
  progressInputs.forEach((input) => {
    input.checked = savedProgress.has(input.dataset.progressId);
    input.addEventListener("change", updateProgress);
  });
  updateProgress();

  const search = document.getElementById("curriculumSearch");
  const filterButtons = [...document.querySelectorAll("[data-track-filter]")];
  const tracks = [...document.querySelectorAll(".curriculum-track")];
  const modules = [...document.querySelectorAll("[data-module]")];
  const result = document.getElementById("curriculumResult");
  const planPanel = document.getElementById("curriculumPlanPanel");
  const planKicker = document.getElementById("curriculumPlanKicker");
  const planTitle = document.getElementById("curriculumPlanTitle");
  const planCopy = document.getElementById("curriculumPlanCopy");
  const planLinks = document.getElementById("curriculumPlanLinks");
  let activeFilter = "all";

  const planLinkMap = {
    foundation: [
      ["看臨床階段比較", "#phaseMatrix"],
      ["查台股案例資料庫", "taiwan-biotech-clinical-trials.html"],
      ["先走 8 堂入門", "#startPath"]
    ],
    evidence: [
      ["臨床終點教材", "clinical-endpoints.html"],
      ["Phase I / II / III 比較", "#phaseMatrix"],
      ["台股臨床案例", "taiwan-biotech-clinical-trials.html"]
    ],
    execution: [
      ["FDA 法規節點", "regulatory-milestones.html"],
      ["安全性與 CMC", "safety-cmc-risk.html"],
      ["台股臨床案例", "taiwan-biotech-clinical-trials.html"]
    ],
    commercial: [
      ["市場規模教材", "market-sizing.html"],
      ["BD 授權條款", "bd-licensing-terms.html"],
      ["專利與競爭週期", "patent-competition.html"]
    ],
    capital: [
      ["生技估值教材", "biotech-valuation.html"],
      ["現金跑道教材", "cash-runway.html"],
      ["台股案例資料庫", "taiwan-biotech-clinical-trials.html"]
    ]
  };

  function normalize(value) {
    return value.toLocaleLowerCase("zh-Hant").trim();
  }

  function showPlan(module) {
    if (!planPanel || !planTitle || !planCopy || !planLinks) return;
    const track = module.closest(".curriculum-track");
    const trackName = track?.querySelector("header h2")?.textContent?.trim() || "課程藍圖";
    const trackId = track?.dataset.track || "foundation";
    const title = module.querySelector("h3")?.textContent?.trim() || "課程藍圖";
    const copy = module.querySelector("p")?.textContent?.trim() || "";
    if (planKicker) planKicker.textContent = trackName;
    planTitle.textContent = title;
    planCopy.textContent = `這堂課會補齊「${copy}」這個判讀能力。完整教材尚未上線；你可以先讀下面幾個已完成入口，先建立同一條閱讀路徑。`;
    planLinks.replaceChildren();
    (planLinkMap[trackId] || planLinkMap.foundation).forEach(([label, href]) => {
      const link = document.createElement("a");
      link.href = href;
      link.textContent = label;
      planLinks.append(link);
    });
    planPanel.hidden = false;
    planPanel.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "center" });
  }

  modules.forEach((module) => {
    if (module.matches("a")) return;
    module.setAttribute("role", "button");
    module.setAttribute("tabindex", "0");
    module.querySelector("em")?.replaceChildren(document.createTextNode("查看路徑"));
    module.addEventListener("click", () => showPlan(module));
    module.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      showPlan(module);
    });
  });

  function filterCurriculum() {
    const query = normalize(search?.value || "");
    let visibleCount = 0;

    tracks.forEach((track) => {
      const matchesTrack = activeFilter === "all" || track.dataset.track === activeFilter;
      let trackCount = 0;
      track.querySelectorAll("[data-module]").forEach((module) => {
        const searchText = normalize(`${module.dataset.search || ""} ${module.textContent || ""}`);
        const matchesQuery = !query || searchText.includes(query);
        const show = matchesTrack && matchesQuery;
        module.hidden = !show;
        if (show) {
          visibleCount += 1;
          trackCount += 1;
        }
      });
      track.hidden = trackCount === 0;
    });

    if (result) {
      result.textContent = visibleCount === 0 ? "沒有符合的主題，請換一個關鍵字。" : `顯示 ${visibleCount} 個核心主題`;
    }
  }

  search?.addEventListener("input", filterCurriculum);
  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.trackFilter || "all";
      filterButtons.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      filterCurriculum();
    });
  });
  filterCurriculum();

  if (!reducedMotion.matches) {
    const revealTargets = [...document.querySelectorAll(".curriculum-track, .starter-path li")];
    revealTargets.forEach((target) => target.classList.add("reveal-pending"));
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.06, rootMargin: "0px 0px -36px" });
    revealTargets.forEach((target) => revealObserver.observe(target));
  }
})();
