(() => {
  const header = document.querySelector(".site-header");
  const navToggle = document.getElementById("site-nav-toggle");
  const navButton = document.querySelector(".nav-menu-button");
  const menuButton = document.querySelector("[data-menu-button]");
  const menuNav = document.querySelector("[data-nav-links]");
  const atlas = document.getElementById("topicAtlas");
  const canvas = document.getElementById("topicCanvas");
  const centerNode = document.getElementById("topicCenter");
  const centerKicker = document.getElementById("topicKicker");
  const centerLabel = document.getElementById("topicLabel");
  const centerDescription = document.getElementById("topicDescription");
  const centerLink = document.getElementById("topicLink");
  const topicLinks = [...document.querySelectorAll("[data-atlas-topic]")];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function updateHeader() {
    header?.classList.toggle("science-condensed", window.scrollY > 20);
  }

  function syncMenuState() {
    navButton?.setAttribute("aria-expanded", String(Boolean(navToggle?.checked)));
  }

  function initMenuButton() {
    if (!menuButton || !menuNav) return;
    let lastFocus = null;
    function setOpen(open) {
      menuNav.classList.toggle("is-open", open);
      menuButton.setAttribute("aria-expanded", String(open));
      if (!open && lastFocus) lastFocus.focus();
    }
    menuButton.addEventListener("click", () => {
      const open = menuButton.getAttribute("aria-expanded") !== "true";
      lastFocus = document.activeElement;
      setOpen(open);
      if (open) menuNav.querySelector("a,button")?.focus();
    });
    menuButton.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      menuButton.click();
    });
    menuNav.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setOpen(false);
    });
    menuNav.addEventListener("click", (event) => {
      if (event.target.closest("a")) setOpen(false);
    });
  }

  const evidenceStates = {
    discovery: {
      kicker: "01 Target",
      title: "先確認靶點與病人分層，故事才有估值資格。",
      description: "讀者看到的是分子如何對上疾病生物學，以及哪些病人最可能產生可重現訊號。",
      link: "topics/drug-development.html",
      article: "看藥物開發主題",
      metric: "Target fit",
      className: "state-discovery"
    },
    trial: {
      kicker: "02 Trial",
      title: "終點、對照組與效果量，決定新聞能不能變成證據。",
      description: "圖解用 CI 與零線示意 treatment / placebo 的差異是否足以改寫成功率；不是實際試驗數據。",
      link: "topics/clinical-data.html",
      article: "看臨床數據主題",
      metric: "Delta + CI",
      className: "state-trial"
    },
    regulatory: {
      kicker: "03 FDA / CMC",
      title: "FDA / CMC 不是後勤，是商業化能否成立的閘門。",
      description: "Data、CMC、site inspection 與 label 只要有一格卡住，上市時間與估值可信度都會被重算。",
      link: "articles/2026-07-10-fda-nasp.html",
      article: "讀 NASP / CMC 案例",
      metric: "Approval gate",
      className: "state-regulatory"
    },
    bd: {
      kicker: "04 BD",
      title: "授權條款真正揭露的是：誰先付錢，誰接走風險。",
      description: "Upfront 是今天的現金，milestone 是未來風險，royalty 才是長期分潤；headline value 不能直接當估值。",
      link: "topics/bd-licensing.html",
      article: "看 BD 授權主題",
      metric: "Risk transfer",
      className: "state-bd"
    },
    market: {
      kicker: "05 Valuation",
      title: "最後回到估值：哪一個參數真的被改寫？",
      description: "同一則新聞可能改變 PoS、peak sales、上市時間或折現率；Drugnews 的價值是指出哪一格真的變了。",
      link: "topics/biotech-valuation.html",
      article: "看估值框架",
      metric: "rNPV shift",
      className: "state-market"
    }
  };

  function initEvidenceScene() {
    const scene = document.querySelector("[data-evidence-scene]");
    if (!scene) return;
    const nodes = Array.from(scene.querySelectorAll("[data-evidence-node]"));
    const readout = {
      kicker: scene.querySelector("[data-scene-kicker]"),
      title: scene.querySelector("[data-scene-title]"),
      description: scene.querySelector("[data-scene-description]"),
      link: scene.querySelector("[data-scene-link]"),
      metric: scene.querySelector("[data-scene-metric]")
    };
    const order = ["discovery", "trial", "regulatory", "bd", "market"];
    let active = "discovery";
    let animationTimer = 0;

    function playSemanticAnimation() {
      if (reducedMotion.matches) return;
      window.clearTimeout(animationTimer);
      scene.classList.remove("is-animating");
      void scene.offsetWidth;
      scene.classList.add("is-animating");
      animationTimer = window.setTimeout(() => {
        scene.classList.remove("is-animating");
      }, 680);
    }

    function setActive(id, options = {}) {
      const state = evidenceStates[id];
      if (!state) return;
      active = id;
      scene.dataset.state = id;
      scene.classList.remove(...Object.values(evidenceStates).map((item) => item.className));
      scene.classList.add(state.className);
      nodes.forEach((node) => {
        const selected = node.dataset.evidenceNode === id;
        node.classList.toggle("is-active", selected);
        node.setAttribute("aria-pressed", String(selected));
        node.tabIndex = selected ? 0 : -1;
      });
      if (readout.kicker) readout.kicker.textContent = state.kicker;
      if (readout.title) readout.title.textContent = state.title;
      if (readout.description) readout.description.textContent = state.description;
      if (readout.link) {
        readout.link.href = state.link;
        readout.link.textContent = state.article;
      }
      if (readout.metric) readout.metric.textContent = state.metric;
      if (options.animate) playSemanticAnimation();
    }

    function moveBy(delta) {
      const index = order.indexOf(active);
      const next = order[(index + delta + order.length) % order.length];
      setActive(next, { animate: true });
      nodes.find((node) => node.dataset.evidenceNode === next)?.focus();
    }

    nodes.forEach((node, index) => {
      node.setAttribute("aria-pressed", "false");
      node.addEventListener("click", () => setActive(node.dataset.evidenceNode, { animate: true }));
      node.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setActive(node.dataset.evidenceNode, { animate: true });
        } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          event.preventDefault();
          moveBy(1);
        } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          event.preventDefault();
          moveBy(-1);
        } else if (event.key === "Home") {
          event.preventDefault();
          setActive(order[0], { animate: true });
          nodes[0]?.focus();
        } else if (event.key === "End") {
          event.preventDefault();
          setActive(order[order.length - 1], { animate: true });
          nodes[order.length - 1]?.focus();
        }
      });
      node.tabIndex = index === 0 ? 0 : -1;
    });

    setActive(active);
  }

  window.addEventListener("scroll", updateHeader, { passive: true });
  navToggle?.addEventListener("change", syncMenuState);
  if (navToggle && navButton && !menuButton) {
    navButton.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      navToggle.checked = !navToggle.checked;
      syncMenuState();
    });
  }
  initMenuButton();
  initEvidenceScene();
  updateHeader();
  syncMenuState();

  if (!atlas || !canvas || !centerNode || !topicLinks.length || !canvas.getContext) return;

  const context = canvas.getContext("2d");
  const topicColors = ["#167984", "#257c9b", "#3b8875", "#a45531", "#315f8b", "#7b5b87"];
  const dust = [];
  let width = 0;
  let height = 0;
  let dpr = 1;
  let center = { x: 0, y: 0 };
  let targets = [];
  let activeIndex = 0;
  let visible = true;
  let lastFrame = 0;
  let pointerX = 0;
  let pointerY = 0;
  let seed = 1707;

  function random() {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  }

  for (let index = 0; index < 64; index += 1) {
    dust.push({
      x: random(),
      y: random(),
      radius: 0.55 + random() * 1.35,
      speed: 0.22 + random() * 0.52,
      phase: random() * Math.PI * 2,
      copper: random() > 0.88
    });
  }

  function elementCenter(element, rootRect) {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left - rootRect.left + rect.width / 2,
      y: rect.top - rootRect.top + rect.height / 2
    };
  }

  function resize() {
    const rect = atlas.getBoundingClientRect();
    width = Math.max(280, Math.round(rect.width));
    height = Math.max(420, Math.round(rect.height));
    dpr = Math.min(1.5, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    center = elementCenter(centerNode, rect);
    targets = topicLinks.map((link) => elementCenter(link, rect));
    draw(reducedMotion.matches ? 0 : performance.now(), true);
  }

  function cubicPoint(start, controlA, controlB, end, progress) {
    const inverse = 1 - progress;
    return {
      x: inverse ** 3 * start.x + 3 * inverse ** 2 * progress * controlA.x + 3 * inverse * progress ** 2 * controlB.x + progress ** 3 * end.x,
      y: inverse ** 3 * start.y + 3 * inverse ** 2 * progress * controlA.y + 3 * inverse * progress ** 2 * controlB.y + progress ** 3 * end.y
    };
  }

  function drawField(time) {
    const mobile = width < 520;
    const fieldHeight = mobile ? 178 : height;
    const points = dust.map((particle) => ({
      x: particle.x * width + Math.sin(time * 0.00016 * particle.speed + particle.phase) * 10 + pointerX * particle.speed,
      y: particle.y * fieldHeight + Math.cos(time * 0.00013 * particle.speed + particle.phase) * 8 + pointerY * particle.speed,
      particle
    }));
    const bondDistance = mobile ? 58 : 112;

    for (let first = 0; first < points.length; first += 1) {
      for (let second = first + 1; second < points.length; second += 1) {
        const deltaX = points[first].x - points[second].x;
        const deltaY = points[first].y - points[second].y;
        const distance = Math.hypot(deltaX, deltaY);
        if (distance >= bondDistance) continue;
        context.beginPath();
        context.moveTo(points[first].x, points[first].y);
        context.lineTo(points[second].x, points[second].y);
        context.strokeStyle = `rgba(25, 111, 121, ${0.105 * (1 - distance / bondDistance)})`;
        context.lineWidth = 0.65;
        context.stroke();
      }
    }

    points.forEach(({ x, y, particle }) => {
      context.beginPath();
      context.arc(x, y, particle.radius, 0, Math.PI * 2);
      context.fillStyle = particle.copper ? "rgba(164, 85, 49, 0.5)" : "rgba(22, 121, 132, 0.34)";
      context.fill();
    });
  }

  function drawEvidenceRibbon(time) {
    if (width < 520) return;
    const startX = width * 0.09;
    const endX = width * 0.91;
    const amplitude = Math.min(56, height * 0.09);
    const baseline = center.y;

    [0, Math.PI].forEach((offset, ribbonIndex) => {
      context.beginPath();
      for (let step = 0; step <= 100; step += 1) {
        const progress = step / 100;
        const x = startX + (endX - startX) * progress;
        const y = baseline + Math.sin(progress * Math.PI * 4 + offset + time * 0.00034) * amplitude;
        if (step === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.strokeStyle = ribbonIndex === 0 ? "rgba(22, 121, 132, 0.2)" : "rgba(164, 85, 49, 0.16)";
      context.lineWidth = 1.2;
      context.stroke();
    });

    for (let rung = 0; rung < 14; rung += 1) {
      const progress = rung / 13;
      const x = startX + (endX - startX) * progress;
      const phase = progress * Math.PI * 4 + time * 0.00034;
      const yA = baseline + Math.sin(phase) * amplitude;
      const yB = baseline + Math.sin(phase + Math.PI) * amplitude;
      context.beginPath();
      context.moveTo(x, yA);
      context.lineTo(x, yB);
      context.strokeStyle = "rgba(31, 105, 113, 0.1)";
      context.lineWidth = 0.8;
      context.stroke();
    }
  }

  function drawConnections(time) {
    if (width < 520) return;
    targets.forEach((target, index) => {
      const color = topicColors[index % topicColors.length];
      const active = activeIndex === index;
      const side = target.x < center.x ? -1 : 1;
      const vertical = target.y - center.y;
      const controlA = {
        x: center.x + side * Math.min(150, Math.abs(target.x - center.x) * 0.45),
        y: center.y + vertical * 0.1
      };
      const controlB = {
        x: target.x - side * Math.min(110, Math.abs(target.x - center.x) * 0.34),
        y: target.y - vertical * 0.16
      };

      context.beginPath();
      context.moveTo(center.x, center.y);
      context.bezierCurveTo(controlA.x, controlA.y, controlB.x, controlB.y, target.x, target.y);
      context.setLineDash(active ? [] : [3, 8]);
      context.lineDashOffset = reducedMotion.matches ? 0 : -time * 0.014;
      context.strokeStyle = active ? `${color}d9` : "rgba(33, 102, 110, 0.3)";
      context.lineWidth = active ? 2.2 : 1;
      context.shadowBlur = active ? 14 : 0;
      context.shadowColor = color;
      context.stroke();
      context.setLineDash([]);
      context.shadowBlur = 0;

      const signalCount = active ? 4 : 2;
      for (let signalIndex = 0; signalIndex < signalCount; signalIndex += 1) {
        const progress = reducedMotion.matches ? (signalIndex + 1) / (signalCount + 1) : (time * (active ? 0.00024 : 0.00013) + index * 0.17 + signalIndex / signalCount) % 1;
        const signal = cubicPoint(center, controlA, controlB, target, progress);
        context.beginPath();
        context.arc(signal.x, signal.y, active ? 4.4 : 2.6, 0, Math.PI * 2);
        context.fillStyle = active ? color : "rgba(30, 117, 126, 0.54)";
        context.shadowBlur = active ? 16 : 8;
        context.shadowColor = color;
        context.fill();
        context.shadowBlur = 0;
      }
    });
  }

  function drawCore(time) {
    if (width < 520) return;
    const radius = Math.min(centerNode.offsetWidth, centerNode.offsetHeight) * 0.62;
    for (let ring = 0; ring < 3; ring += 1) {
      const ringRadius = radius + ring * 19;
      const start = time * 0.00018 * (ring % 2 ? -1 : 1) + ring;
      context.beginPath();
      context.arc(center.x, center.y, ringRadius, start, start + Math.PI * (0.82 + ring * 0.18));
      context.strokeStyle = ring === 1 ? "rgba(164, 85, 49, 0.32)" : "rgba(23, 111, 123, 0.26)";
      context.lineWidth = ring === 0 ? 1.4 : 0.9;
      context.stroke();
    }
  }

  function draw(time, force = false) {
    if (!force && (!visible || document.hidden)) return;
    context.clearRect(0, 0, width, height);
    drawField(time);
    drawEvidenceRibbon(time);
    drawConnections(time);
    drawCore(time);
    canvas.dataset.atlasReady = "true";
  }

  function animate(time) {
    requestAnimationFrame(animate);
    if (time - lastFrame < 33) return;
    lastFrame = time;
    draw(time);
  }

  function activateTopic(link, index) {
    activeIndex = index;
    atlas.dataset.activeTopic = link.dataset.atlasTopic || "investing";
    topicLinks.forEach((item, itemIndex) => item.classList.toggle("is-active", itemIndex === index));
    centerKicker.textContent = link.dataset.kicker || "研究主題";
    centerLabel.textContent = link.dataset.title || link.querySelector("strong")?.textContent || "研究主題";
    centerDescription.textContent = link.dataset.description || "";
    centerLink.href = link.href;
    draw(reducedMotion.matches ? 0 : performance.now(), true);
  }

  topicLinks.forEach((link, index) => {
    link.addEventListener("pointerenter", () => activateTopic(link, index));
    link.addEventListener("focus", () => activateTopic(link, index));
  });

  atlas.addEventListener("pointermove", (event) => {
    if (reducedMotion.matches || width < 520) return;
    const rect = atlas.getBoundingClientRect();
    pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 12;
    pointerY = ((event.clientY - rect.top) / rect.height - 0.5) * 8;
  }, { passive: true });

  atlas.addEventListener("pointerleave", () => {
    pointerX = 0;
    pointerY = 0;
  });

  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
  }, { threshold: 0.02 }).observe(atlas);

  new ResizeObserver(resize).observe(atlas);
  activateTopic(topicLinks[0], 0);
  resize();
  if (!reducedMotion.matches) requestAnimationFrame(animate);
})();
