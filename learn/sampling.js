// Learn: free energy and enhanced sampling. All demos use the same 1D double well.

const DW = {
  U: (x, h) => h * (x * x - 1) ** 2,
  F: (x, h) => -4 * h * x * (x * x - 1),
  xr: [-1.8, 1.8]
};

DEMOS["es-hist"] = {
  title: "Free energy from a histogram",
  text: "",
  details: "one Langevin walker, U(x) = h(x<sup>2</sup> &minus; 1)<sup>2</sup> with barrier h = 5 kT at kT = 1, F(x) = &minus;kT ln P(x) shifted so its minimum is zero",
  make() {
    const bins = 60, dt = 1e-3, h = 5;
    const p = { kT: 1 };
    let x, hist, crossings, last, steps;
    return {
      perFrame: 1,
      params: [{ key: "kT", label: "kT", min: 0.4, max: 3, step: 0.05, value: 1 }],
      set(k, v) { p[k] = v; this.reset(); },
      reset() { x = -1; hist = new Float64Array(bins); crossings = 0; last = -1; steps = 0; },
      step() {
        const s = Math.sqrt(2 * p.kT * dt);
        for (let k = 0; k < 200; k++) {
          x += DW.F(x, h) * dt + s * gauss();
          const b = Math.floor((x - DW.xr[0]) / (DW.xr[1] - DW.xr[0]) * bins);
          if (b >= 0 && b < bins) hist[b]++;
          if (Math.sign(x) !== last && Math.abs(x) > 0.8) { if (steps) crossings++; last = Math.sign(x); }
          steps++;
        }
      },
      draw(ctx, w, h0, col) {
        const P = plotBox(ctx, [34, 14, w - 50, h0 - 42], DW.xr, [-0.5, 9], col, "x", "F (kT units of 1)");
        const tr = []; for (let k = 0; k <= 200; k++) { const xx = DW.xr[0] + 3.6 * k / 200; tr.push([xx, DW.U(xx, h)]); }
        P.line(tr, col.muted, 2, [4, 3]);
        const tot = hist.reduce((a, b) => a + b, 0), dx = 3.6 / bins;
        const F = Array.from(hist, (c, k) => [DW.xr[0] + (k + 0.5) * dx, c ? -p.kT * Math.log(c / (tot * dx)) : NaN]);
        const fmin = Math.min(...F.map(q => q[1]).filter(isFinite));
        P.line(F.map(([a, b]) => [a, b - fmin]), col.a, 2.5);
        ctx.fillStyle = col.b; dot(ctx, P.X(x), P.Y(DW.U(x, h)), 5);
      },
      info() { return `steps ${steps}   barrier crossings ${crossings}`; }
    };
  }
};

DEMOS["es-umbrella"] = {
  title: "Umbrella sampling and WHAM",
  text: "",
  details: "barrier h = 8 kT. Each window adds a spring (k/2)(x &minus; c)<sup>2</sup>. WHAM solves P(x) = &Sigma;n<sub>i</sub>(x) / &Sigma;N<sub>i</sub>e<sup>(f<sub>i</sub> &minus; w<sub>i</sub>(x))/kT</sup> with e<sup>&minus;f<sub>i</sub>/kT</sup> = &Sigma;<sub>x</sub>P(x)e<sup>&minus;w<sub>i</sub>(x)/kT</sup>",
  make() {
    const bins = 72, dt = 1e-3, h = 8, kT = 1, dx = 3.6 / bins;
    const p = { nw: 9, k: 30 };
    let cs, xs, hists, Ns, f, P;
    const bias = (x, i) => 0.5 * p.k * (x - cs[i]) ** 2;
    const xc = b => DW.xr[0] + (b + 0.5) * dx;
    function wham() {
      for (let it = 0; it < 20; it++) {
        P = new Float64Array(bins);
        for (let b = 0; b < bins; b++) {
          let num = 0, den = 0;
          for (let i = 0; i < p.nw; i++) { num += hists[i][b]; den += Ns[i] * Math.exp((f[i] - bias(xc(b), i)) / kT); }
          P[b] = den ? num / den : 0;
        }
        for (let i = 0; i < p.nw; i++) {
          let z = 0; for (let b = 0; b < bins; b++) z += P[b] * Math.exp(-bias(xc(b), i) / kT);
          f[i] = z ? -kT * Math.log(z) : 0;
        }
      }
    }
    return {
      perFrame: 1,
      params: [
        { key: "nw", label: "windows", min: 3, max: 15, step: 1, value: 9 },
        { key: "k", label: "spring k", min: 5, max: 100, step: 1, value: 30 }
      ],
      set(key, v) { p[key] = v; this.reset(); },
      reset() {
        cs = Array.from({ length: p.nw }, (_, i) => -1.4 + 2.8 * i / (p.nw - 1));
        xs = cs.slice(); hists = cs.map(() => new Float64Array(bins)); Ns = new Float64Array(p.nw); f = new Float64Array(p.nw); P = null;
      },
      step() {
        const s = Math.sqrt(2 * kT * dt);
        for (let i = 0; i < p.nw; i++) for (let k = 0; k < 60; k++) {
          xs[i] += (DW.F(xs[i], h) - p.k * (xs[i] - cs[i])) * dt + s * gauss();
          const b = Math.floor((xs[i] - DW.xr[0]) / dx);
          if (b >= 0 && b < bins) { hists[i][b]++; Ns[i]++; }
        }
        wham();
      },
      draw(ctx, w, h0, col) {
        const top = h0 * 0.36;
        const maxH = Math.max(1, ...hists.map(hh => Math.max(...hh)));
        const X = x => 34 + (x - DW.xr[0]) / 3.6 * (w - 50);
        hists.forEach((hh, i) => {
          ctx.strokeStyle = CLUSTER_COLORS[i % 8]; ctx.lineWidth = 1.5; ctx.beginPath();
          hh.forEach((c, b) => { const px = X(xc(b)), py = 10 + top - c / maxH * top; b ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
          ctx.stroke();
        });
        const Pl = plotBox(ctx, [34, top + 24, w - 50, h0 - top - 50], DW.xr, [-0.5, 12], col, "x", "F");
        const tr = []; for (let k = 0; k <= 200; k++) { const xx = DW.xr[0] + 3.6 * k / 200; tr.push([xx, DW.U(xx, h)]); }
        Pl.line(tr, col.muted, 2, [4, 3]);
        if (P) {
          const F = Array.from(P, (q, b) => [xc(b), q > 0 ? -kT * Math.log(q) : NaN]);
          const m = Math.min(...F.map(q => q[1]).filter(isFinite));
          Pl.line(F.map(([a, b]) => [a, b - m]), col.a, 2.5);
        }
      },
      info() { return `samples per window ${Ns[0] | 0}`; }
    };
  }
};

DEMOS["es-metad"] = {
  title: "Metadynamics",
  text: "",
  details: "barrier h = 8 kT. Every 200 steps a Gaussian of height H and width w is added at the current x. The negative of the bias estimates F(x)",
  make() {
    const dt = 1e-3, h = 8, kT = 1, G = 180;
    const p = { H: 0.3, w: 0.15 };
    let x, Vb, steps, n;
    const gx = g => DW.xr[0] + 3.6 * g / G;
    const biasAt = xx => { const f = (xx - DW.xr[0]) / 3.6 * G, g = Math.max(0, Math.min(G - 1, Math.floor(f))), t = f - g; return Vb[g] * (1 - t) + Vb[g + 1] * t; };
    return {
      perFrame: 1,
      params: [
        { key: "H", label: "hill height", min: 0.05, max: 1, step: 0.05, value: 0.3 },
        { key: "w", label: "hill width", min: 0.05, max: 0.4, step: 0.01, value: 0.15 }
      ],
      set(k, v) { p[k] = v; },
      reset() { x = -1; Vb = new Float64Array(G + 1); steps = 0; n = 0; },
      step() {
        const s = Math.sqrt(2 * kT * dt), e = 1e-3;
        for (let k = 0; k < 200; k++) {
          const fb = -(biasAt(x + e) - biasAt(x - e)) / (2 * e);
          x += (DW.F(x, h) + fb) * dt + s * gauss();
          x = Math.max(DW.xr[0] + 0.01, Math.min(DW.xr[1] - 0.01, x));
          steps++;
        }
        for (let g = 0; g <= G; g++) Vb[g] += p.H * Math.exp(-((gx(g) - x) ** 2) / (2 * p.w * p.w));
        n++;
      },
      draw(ctx, w, h0, col) {
        const P = plotBox(ctx, [34, 14, w - 50, h0 - 42], DW.xr, [-0.5, 14], col, "x", "energy");
        const tr = [], tot = [], est = [];
        const vmax = Math.max(...Vb);
        for (let g = 0; g <= G; g++) { const xx = gx(g); tr.push([xx, DW.U(xx, h)]); tot.push([xx, DW.U(xx, h) + Vb[g]]); est.push([xx, vmax - Vb[g]]); }
        P.line(tr, col.muted, 2, [4, 3]);
        P.line(tot, col.b, 1.5);
        P.line(est, col.a, 2.5);
        ctx.fillStyle = col.ink; dot(ctx, P.X(x), P.Y(DW.U(x, h) + biasAt(x)), 5);
        ctx.font = "10px monospace";
        ctx.fillStyle = col.b; ctx.fillText("U + bias", 44, 28); ctx.fillStyle = col.a; ctx.fillText("-bias (shifted) ≈ F", 44, 42);
      },
      info() { return `hills ${n}`; }
    };
  }
};

DEMOS["es-remd"] = {
  title: "Replica exchange",
  text: "",
  details: "4 copies of the double well (h = 8) at kT = 1, 1.6, 2.6, 4.2. Every 100 steps neighbors try to swap with probability min(1, exp[(&beta;<sub>i</sub> &minus; &beta;<sub>j</sub>)(U<sub>i</sub> &minus; U<sub>j</sub>)])",
  make() {
    const T = [1, 1.6, 2.6, 4.2], dt = 1e-3, h = 8;
    const p = { swap: 1 };
    let xs, trace, swaps, tries, crossCold, lastCold;
    return {
      perFrame: 1,
      params: [{ key: "swap", label: "0 no swaps, 1 swaps on", min: 0, max: 1, step: 1, value: 1 }],
      set(k, v) { p[k] = v; this.reset(); },
      reset() { xs = [-1, -1, -1, -1]; trace = []; swaps = 0; tries = 0; crossCold = 0; lastCold = -1; },
      step() {
        for (let k = 0; k < 100; k++) for (let i = 0; i < 4; i++) xs[i] += DW.F(xs[i], h) * dt + Math.sqrt(2 * T[i] * dt) * gauss();
        if (p.swap) {
          const i = (rand() * 3) | 0, j = i + 1;
          const d = (1 / T[i] - 1 / T[j]) * (DW.U(xs[i], h) - DW.U(xs[j], h));
          tries++;
          if (d >= 0 || rand() < Math.exp(d)) { [xs[i], xs[j]] = [xs[j], xs[i]]; swaps++; }
        }
        if (Math.sign(xs[0]) !== lastCold && Math.abs(xs[0]) > 0.8) { crossCold++; lastCold = Math.sign(xs[0]); }
        trace.push(xs.slice()); if (trace.length > 400) trace.shift();
      },
      draw(ctx, w, h0, col) {
        const rowH = (h0 - 20) / 4;
        T.forEach((t, i) => {
          const y0 = 8 + i * rowH, Y = v => y0 + rowH / 2 - v / 1.9 * (rowH / 2 - 4);
          ctx.strokeStyle = col.rule; ctx.beginPath(); ctx.moveTo(60, Y(0)); ctx.lineTo(w - 10, Y(0)); ctx.stroke();
          ctx.strokeStyle = i ? col.muted : col.a; ctx.lineWidth = i ? 1 : 2; ctx.beginPath();
          trace.forEach((q, k) => { const px = 60 + k / 400 * (w - 70); k ? ctx.lineTo(px, Y(q[i])) : ctx.moveTo(px, Y(q[i])); });
          ctx.stroke();
          ctx.fillStyle = col.muted; ctx.font = "10px monospace"; ctx.fillText(`kT=${t}`, 6, Y(0) + 4);
        });
      },
      info() { return `coldest replica crossings ${crossCold}   swaps accepted ${tries ? (100 * swaps / tries).toFixed(0) : 0}%`; }
    };
  }
};

DEMOS["es-jarzynski"] = {
  title: "Steered MD and the Jarzynski equality",
  text: "",
  details: "a spring (k = 50) is pulled from x = &minus;1 to x = +1 over the double well (h = 5, kT = 1). True &Delta;F = 0 between the minima. Jarzynski: &Delta;F = &minus;kT ln &lang;e<sup>&minus;W/kT</sup>&rang;",
  make() {
    const h = 5, kT = 1, ks = 50, dt = 1e-3;
    const p = { speed: 2 };
    let Ws, cur, x, lam, Wrun, path;
    return {
      perFrame: 1,
      params: [{ key: "speed", label: "pulling speed", min: 0.2, max: 8, step: 0.1, value: 2 }],
      set(k, v) { p[k] = v; this.reset(); },
      reset() { Ws = []; this.start(); },
      start() { x = -1; lam = -1; Wrun = 0; path = []; },
      step() {
        for (let k = 0; k < 40; k++) {
          const dl = p.speed * dt;
          Wrun += ks * (lam - x) * dl;
          lam += dl;
          x += (DW.F(x, h) - ks * (x - lam)) * dt + Math.sqrt(2 * kT * dt) * gauss();
          if (lam >= 1) { Ws.push(Wrun); this.start(); break; }
        }
        path.push([lam, x]);
      },
      draw(ctx, w, h0, col) {
        const half = w / 2;
        const A = plotBox(ctx, [34, 14, half - 50, h0 - 42], DW.xr, [-0.5, 8], col, "x", "U");
        const tr = []; for (let k = 0; k <= 200; k++) { const xx = DW.xr[0] + 3.6 * k / 200; tr.push([xx, DW.U(xx, h)]); }
        A.line(tr, col.muted, 2);
        ctx.strokeStyle = col.b; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(A.X(lam), A.Y(-0.4)); ctx.lineTo(A.X(x), A.Y(DW.U(x, h))); ctx.stroke();
        ctx.fillStyle = col.a; dot(ctx, A.X(x), A.Y(DW.U(x, h)), 5);
        ctx.fillStyle = col.b; ctx.fillRect(A.X(lam) - 3, A.Y(-0.4) - 3, 6, 6);
        const B = plotBox(ctx, [half + 34, 14, half - 50, h0 - 42], [-4, 16], [0, 1], col, "work W", "count");
        if (Ws.length) {
          const bins = 30, hst = new Array(bins).fill(0);
          for (const W of Ws) { const b = Math.floor((W + 4) / 20 * bins); if (b >= 0 && b < bins) hst[b]++; }
          const mx = Math.max(...hst);
          ctx.fillStyle = col.a;
          hst.forEach((c, b) => { const x0 = B.X(-4 + b * 20 / bins), x1 = B.X(-4 + (b + 1) * 20 / bins); ctx.fillRect(x0 + 1, B.Y(c / mx), x1 - x0 - 2, B.Y(0) - B.Y(c / mx)); });
          const J = this.jar(), mean = Ws.reduce((a, b) => a + b, 0) / Ws.length;
          ctx.strokeStyle = col.b; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(B.X(J), B.Y(0)); ctx.lineTo(B.X(J), B.Y(1)); ctx.stroke();
          ctx.strokeStyle = col.muted; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(B.X(mean), B.Y(0)); ctx.lineTo(B.X(mean), B.Y(1)); ctx.stroke(); ctx.setLineDash([]);
          ctx.font = "10px monospace"; ctx.fillStyle = col.b; ctx.fillText("Jarzynski", B.X(J) + 3, B.Y(0.95)); ctx.fillStyle = col.muted; ctx.fillText("mean W", B.X(mean) + 3, B.Y(0.85));
        }
      },
      jar() { const m = Math.min(...Ws); return m - kT * Math.log(Ws.reduce((s, W) => s + Math.exp(-(W - m) / kT), 0) / Ws.length); },
      info() {
        if (!Ws.length) return "pulling...";
        const mean = Ws.reduce((a, b) => a + b, 0) / Ws.length;
        return `pulls ${Ws.length}   mean W = ${mean.toFixed(2)}   Jarzynski ΔF = ${this.jar().toFixed(2)}`;
      }
    };
  }
};

DEMOS["es-metad2d"] = {
  title: "Metadynamics in two dimensions",
  text: "Metadynamics fills the basins of a 2D energy landscape with hills until the walker can visit all of them.",
  hint: "Click to restart the walker from another point.",
  details: "one overdamped Langevin walker on the Muller-Brown surface, kT = 10, a Gaussian hill (width 0.1) every 50 steps on a 90 &times; 60 grid. Orange shading = bias collected so far",
  make() {
    const GX = 90, GY = 60, dt = 5e-5, every = 50;
    const p = { H: 6, wt: 0 };
    const kT = 10, wsig = 0.1, gdx = (MB.xmax - MB.xmin) / (GX - 1), gdy = (MB.ymax - MB.ymin) / (GY - 1);
    let x, y, bias, hills, nstep, trail, visited;
    const B = (xx, yy) => {
      const fx = (xx - MB.xmin) / gdx, fy = (yy - MB.ymin) / gdy;
      const i = Math.max(0, Math.min(GX - 2, Math.floor(fx))), j = Math.max(0, Math.min(GY - 2, Math.floor(fy)));
      const u = fx - i, v = fy - j;
      return (1 - u) * (1 - v) * bias[j * GX + i] + u * (1 - v) * bias[j * GX + i + 1] + (1 - u) * v * bias[(j + 1) * GX + i] + u * v * bias[(j + 1) * GX + i + 1];
    };
    const basin = () => y > 1.0 ? 0 : (x > 0.3 && y < 0.3 ? 2 : 1);
    return {
      perFrame: 2,
      params: [
        { key: "H", label: "hill height", min: 0, max: 20, step: 0.5, value: 6 },
        { key: "wt", label: "well-tempered (0 off, 1 on)", min: 0, max: 1, step: 1, value: 0 }
      ],
      set(k, v) { p[k] = v; },
      reset() { x = -0.558; y = 1.442; bias = new Float64Array(GX * GY); hills = 0; nstep = 0; trail = []; visited = [1, 0, 0]; },
      click(px, py, w, h) { [x, y] = MB.fromScreen(px, py, w, h); trail = []; },
      step() {
        const s = Math.sqrt(2 * kT * dt);
        for (let k = 0; k < 100; k++) {
          const [gx, gy] = MB.grad(x, y), e = 1e-3;
          const bx = (B(x + e, y) - B(x - e, y)) / (2 * e), by = (B(x, y + e) - B(x, y - e)) / (2 * e);
          x += -(gx + bx) * dt + s * gauss(); y += -(gy + by) * dt + s * gauss();
          x = Math.min(MB.xmax, Math.max(MB.xmin, x)); y = Math.min(MB.ymax, Math.max(MB.ymin, y));
          if (++nstep % every) continue;
          // deposit a hill; well-tempered hills shrink where bias is already high
          const Hh = p.wt ? p.H * Math.exp(-B(x, y) / (4 * kT)) : p.H;
          for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) {
            const dx = MB.xmin + i * gdx - x, dy = MB.ymin + j * gdy - y;
            const d2 = (dx * dx + dy * dy) / (2 * wsig * wsig);
            if (d2 < 9) bias[j * GX + i] += Hh * Math.exp(-d2);
          }
          hills++;
          visited[basin()] = 1;
          trail.push([x, y]); if (trail.length > 300) trail.shift();
        }
      },
      draw(ctx, w, h, col) {
        MB.drawContours(ctx, w, h, col);
        const max = Math.max(1, ...bias);
        const off = document.createElement("canvas"); off.width = GX; off.height = GY;
        const octx = off.getContext("2d"), img = octx.createImageData(GX, GY), [r, g, b] = hexToRgb(col.b);
        for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) {
          const o = ((GY - 1 - j) * GX + i) * 4;
          img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = b; img.data[o + 3] = 170 * bias[j * GX + i] / max;
        }
        octx.putImageData(img, 0, 0);
        ctx.imageSmoothingEnabled = true; ctx.drawImage(off, 0, 0, w, h);
        ctx.strokeStyle = col.ink; ctx.globalAlpha = 0.5; ctx.lineWidth = 1; ctx.beginPath();
        trail.forEach(([a, c], k) => { const [sx, sy] = MB.toScreen(a, c, w, h); k ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); });
        ctx.stroke(); ctx.globalAlpha = 1;
        const [sx, sy] = MB.toScreen(x, y, w, h);
        ctx.fillStyle = col.a; dot(ctx, sx, sy, 5);
      },
      info() { return `hills ${hills}   max bias ${Math.max(...bias).toFixed(0)}   basins visited ${visited.reduce((a, c) => a + c, 0)} of 3`; }
    };
  }
};
