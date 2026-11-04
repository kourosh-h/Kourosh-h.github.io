// Shared helpers for the demos. Each demo file adds one entry to DEMOS.
// A demo's make() returns an object with reset(), step(), draw(), info(), and optional params, set(), click().

const rand = Math.random;
const gauss = () => Math.sqrt(-2 * Math.log(rand() + 1e-12)) * Math.cos(2 * Math.PI * rand());

function themeColors() {
  const s = getComputedStyle(document.documentElement);
  const get = name => s.getPropertyValue(name).trim();
  return { a: get("--a"), b: get("--b"), ink: get("--ink"), muted: get("--muted"), rule: get("--rule"), paper: get("--paper") };
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// colors for clusters and series: bright ones on the black page, darker ones on the gray page
const CLUSTER_DARK = ["#7f9cff", "#efa458", "#6cc28a", "#e5737f", "#b08ae0", "#5cc4d1", "#d4b45a", "#9aa3ad"];
const CLUSTER_LIGHT = ["#2c4cc0", "#8f4c08", "#2b7d47", "#b03a49", "#7048b0", "#1d7685", "#7a6510", "#5b636c"];
const CLUSTER_COLORS = [];
function setClusterColors() {
  const [r, g, b] = hexToRgb(themeColors().paper);
  CLUSTER_COLORS.splice(0, CLUSTER_COLORS.length, ...(r + g + b < 384 ? CLUSTER_DARK : CLUSTER_LIGHT));
}
setClusterColors();
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", setClusterColors);
new MutationObserver(setClusterColors).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

function dot(ctx, x, y, r) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill();
}

// Muller-Brown potential, used by two demos
const MB = {
  A: [-200, -100, -170, 15], a: [-1, -1, -6.5, 0.7], b: [0, 0, 11, 0.6], c: [-10, -10, -6.5, 0.7],
  x0: [1, 0, -0.5, -1], y0: [0, 0.5, 1.5, 1],
  xmin: -2.1, xmax: 1.5, ymin: -0.3, ymax: 1.8,
  V(x, y) {
    let v = 0;
    for (let k = 0; k < 4; k++) {
      const dx = x - this.x0[k], dy = y - this.y0[k];
      v += this.A[k] * Math.exp(this.a[k] * dx * dx + this.b[k] * dx * dy + this.c[k] * dy * dy);
    }
    return v;
  },
  grad(x, y) {
    let gx = 0, gy = 0;
    for (let k = 0; k < 4; k++) {
      const dx = x - this.x0[k], dy = y - this.y0[k];
      const e = this.A[k] * Math.exp(this.a[k] * dx * dx + this.b[k] * dx * dy + this.c[k] * dy * dy);
      gx += e * (2 * this.a[k] * dx + this.b[k] * dy);
      gy += e * (this.b[k] * dx + 2 * this.c[k] * dy);
    }
    return [gx, gy];
  },
  toScreen(x, y, w, h) {
    return [(x - this.xmin) / (this.xmax - this.xmin) * w, (1 - (y - this.ymin) / (this.ymax - this.ymin)) * h];
  },
  fromScreen(px, py, w, h) {
    return [this.xmin + px / w * (this.xmax - this.xmin), this.ymin + (1 - py / h) * (this.ymax - this.ymin)];
  },
  cache: null,
  drawContours(ctx, w, h, col) {
    const key = `${w}x${h}${col.rule}`;
    if (!this.cache || this.cache.key !== key) {
      const off = document.createElement("canvas");
      off.width = w; off.height = h;
      const octx = off.getContext("2d");
      const img = octx.createImageData(w, h);
      const level = new Int16Array(w * h);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const [x, y] = this.fromScreen(i, j, w, h);
        const v = this.V(x, y);
        level[j * w + i] = v > 60 ? 99 : Math.floor((v + 160) / 16);
      }
      const [r, g, b] = hexToRgb(col.rule);
      for (let j = 0; j < h - 1; j++) for (let i = 0; i < w - 1; i++) {
        const l = level[j * w + i];
        if (l !== 99 && (l !== level[j * w + i + 1] || l !== level[(j + 1) * w + i])) {
          const p = 4 * (j * w + i);
          img.data[p] = r; img.data[p + 1] = g; img.data[p + 2] = b; img.data[p + 3] = 255;
        }
      }
      octx.putImageData(img, 0, 0);
      this.cache = { key, canvas: off };
    }
    ctx.drawImage(this.cache.canvas, 0, 0, w, h);
  }
};

const DEMOS = {};

// ---------- mounting ----------
function mountDemo(fig) {
  const spec = DEMOS[fig.dataset.demo];
  const demo = spec.make();
  const showText = fig.dataset.text !== "off";
  const controls = (demo.params || []).map(pr => `
    <label class="ctl"><span>${pr.label}</span>
      <input type="range" id="${fig.dataset.demo}-${pr.key}" min="${pr.min}" max="${pr.max}" step="${pr.step}" value="${pr.value}">
      <output>${pr.value}</output></label>`).join("");
  fig.innerHTML = `
    <div class="sim"><canvas role="img" aria-label="${spec.title.replace(/<[^>]+>/g, "").replace(/"/g, "&quot;")}"></canvas>
      <div class="simbar"><span class="info"></span>${spec.still ? "" : `<span class="btns"><button type="button" class="pause">pause</button><button type="button" class="reset">reset</button></span>`}</div></div>
    ${spec.hint ? `<p class="hint">${spec.hint}</p>` : ""}
    ${controls ? `<div class="ctls">${controls}</div>` : ""}
    ${showText ? `<figcaption><b>${spec.title}.</b> ${spec.text} <span class="mono">${spec.details}</span></figcaption>` : ""}`;
  const canvas = fig.querySelector("canvas"), ctx = canvas.getContext("2d"), info = fig.querySelector(".info");
  // some explainer graphics stack their panels on narrow screens and need a taller canvas there
  if (spec.narrowAspect || spec.aspect) {
    const fit = () => { canvas.style.aspectRatio = fig.clientWidth < 560 && spec.narrowAspect ? spec.narrowAspect : spec.aspect || ""; };
    fit();
    window.addEventListener("resize", fit);
  }
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let visible = true, raf = 0, paused = false;

  function draw() {
    const w = canvas.clientWidth, h = canvas.clientHeight, dpr = window.devicePixelRatio || 1;
    if (!w) return;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    demo.draw(ctx, w, h, themeColors());
    info.textContent = demo.info();
  }
  function frame() {
    for (let k = 0; k < demo.perFrame; k++) demo.step();
    draw();
    raf = visible && !paused ? requestAnimationFrame(frame) : 0;
  }
  // with reduced motion we jump ahead instead of animating, in small slices so sliders stay responsive
  let jump = 0;
  function play() {
    if (still) {
      const id = ++jump;
      let left = demo.perFrame * 300;
      const slice = () => {
        if (id !== jump) return;
        const t0 = performance.now();
        while (left > 0 && performance.now() - t0 < 12) { demo.step(); left--; }
        draw();
        if (left > 0) setTimeout(slice, 0);
      };
      slice();
      return;
    }
    if (!raf && !paused) raf = requestAnimationFrame(frame);
  }

  fig.querySelectorAll("input[type=range]").forEach(input => {
    const key = input.id.slice(fig.dataset.demo.length + 1);
    input.addEventListener("input", () => {
      input.nextElementSibling.textContent = input.value;
      demo.set(key, Number(input.value));
      if (still) play();
    });
  });
  // explainer graphics (spec.still) have no pause or reset buttons
  const resetBtn = fig.querySelector(".reset"), pauseBtn = fig.querySelector(".pause");
  if (resetBtn) resetBtn.addEventListener("click", () => { demo.reset(); draw(); play(); });
  if (pauseBtn) pauseBtn.addEventListener("click", () => {
    paused = !paused;
    pauseBtn.textContent = paused ? "play" : "pause";
    if (!paused) play();
  });
  if (demo.click || demo.drag) {
    canvas.style.cursor = "crosshair";
    canvas.style.touchAction = "none";
    let down = false;
    const pos = e => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top, r.width, r.height]; };
    canvas.addEventListener("pointerdown", e => {
      down = true;
      canvas.setPointerCapture(e.pointerId);
      if (demo.click) demo.click(...pos(e));
      if (demo.drag) demo.drag(...pos(e), true);
      draw(); play();
    });
    canvas.addEventListener("pointermove", e => { if (down && demo.drag) demo.drag(...pos(e), true); });
    const up = e => { if (down && demo.drag) demo.drag(...pos(e), false); down = false; };
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
  }
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) play();
  }).observe(fig);
  window.addEventListener("resize", draw);
  demo.reset();
  draw();
}

// Build a demo only when it first comes near the screen, and run it only while visible.
function mountAllDemos() {
  const waiting = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (e.isIntersecting) { waiting.unobserve(e.target); mountDemo(e.target); }
    }
  }, { rootMargin: "200px" });
  document.querySelectorAll("figure[data-demo]").forEach(fig => {
    if (!DEMOS[fig.dataset.demo]) { fig.remove(); return; }
    waiting.observe(fig);
  });
}
