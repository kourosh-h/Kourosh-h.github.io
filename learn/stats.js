// Learn: statistics and PCA

DEMOS["st-pca"] = {
  title: "Principal component analysis",
  text: "Principal component analysis on 2D data, which finds the directions of the largest spread.",
  hint: "Click to add points and watch the axes turn.",
  details: "PCA = eigenvectors of the covariance matrix. Axis lengths are 2 standard deviations along each component. Thin lines: projection of each point onto PC1",
  make() {
    const p = { corr: 0.8, n: 80 };
    let pts;
    function pca() {
      const n = pts.length, mx = pts.reduce((s, q) => s + q[0], 0) / n, my = pts.reduce((s, q) => s + q[1], 0) / n;
      let a = 0, b = 0, c = 0;
      for (const [x, y] of pts) { a += (x - mx) ** 2; b += (x - mx) * (y - my); c += (y - my) ** 2; }
      a /= n - 1; b /= n - 1; c /= n - 1;
      const tr = a + c, det = a * c - b * b, l1 = tr / 2 + Math.sqrt(tr * tr / 4 - det), l2 = tr / 2 - Math.sqrt(tr * tr / 4 - det);
      const v = Math.abs(b) > 1e-12 ? [l1 - c, b] : (a >= c ? [1, 0] : [0, 1]), nv = Math.hypot(v[0], v[1]);
      return { mx, my, l1, l2, e1: [v[0] / nv, v[1] / nv], e2: [-v[1] / nv, v[0] / nv] };
    }
    return {
      perFrame: 1,
      params: [
        { key: "corr", label: "correlation", min: -0.95, max: 0.95, step: 0.05, value: 0.8 },
        { key: "n", label: "points", min: 10, max: 300, step: 10, value: 80 }
      ],
      set(k, v) { p[k] = v; this.reset(); },
      reset() {
        const r = p.corr;
        pts = Array.from({ length: p.n }, () => { const u = gauss(), v = gauss(); return [u * 1.4, (r * u + Math.sqrt(1 - r * r) * v) * 1.4]; });
      },
      click(px, py, w, h) { const s = h / 10; pts.push([(px - w / 2) / s, -(py - h / 2) / s]); },
      step() {},
      draw(ctx, w, h, col) {
        const s = h / 10, X = v => w / 2 + v * s, Y = v => h / 2 - v * s, q = pca();
        ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
        for (const [x, y] of pts) {
          const t = (x - q.mx) * q.e1[0] + (y - q.my) * q.e1[1];
          ctx.beginPath(); ctx.moveTo(X(x), Y(y)); ctx.lineTo(X(q.mx + t * q.e1[0]), Y(q.my + t * q.e1[1])); ctx.stroke();
        }
        ctx.fillStyle = col.a; for (const [x, y] of pts) dot(ctx, X(x), Y(y), 3);
        for (const [e, l, c] of [[q.e1, q.l1, col.b], [q.e2, q.l2, col.ink]]) {
          const L = 2 * Math.sqrt(Math.max(l, 0));
          ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.beginPath();
          ctx.moveTo(X(q.mx - e[0] * L), Y(q.my - e[1] * L)); ctx.lineTo(X(q.mx + e[0] * L), Y(q.my + e[1] * L)); ctx.stroke();
        }
        this.q = q;
      },
      info() { const q = this.q; return q ? `PC1 explains ${(100 * q.l1 / (q.l1 + q.l2)).toFixed(0)}% of the variance   n = ${pts.length}` : ""; }
    };
  }
};

DEMOS["st-clt"] = {
  title: "The central limit theorem",
  text: "",
  details: "left: the distribution samples come from. Right: histogram of sample means of size n, against the normal curve with mean &mu; and standard deviation &sigma;/&radic;n",
  make() {
    const p = { n: 5, dist: 1 };
    let means;
    const draws = [() => rand(), () => -Math.log(rand() + 1e-12) / 2, () => (rand() < 0.5 ? 0.15 : 0.85) + 0.07 * gauss()];
    const stats = [[0.5, Math.sqrt(1 / 12)], [0.5, 0.5], [0.5, Math.sqrt(0.35 ** 2 + 0.07 ** 2)]];
    return {
      perFrame: 1,
      params: [
        { key: "n", label: "sample size n", min: 1, max: 50, step: 1, value: 5 },
        { key: "dist", label: "0 uniform, 1 exponential, 2 two peaks", min: 0, max: 2, step: 1, value: 1 }
      ],
      set(k, v) { p[k] = v; means = []; },
      reset() { means = []; },
      step() {
        if (means.length > 6000) return;
        for (let k = 0; k < 40; k++) { let s = 0; for (let i = 0; i < p.n; i++) s += draws[p.dist](); means.push(s / p.n); }
      },
      draw(ctx, w, h, col) {
        const half = w * 0.38, bins = 40;
        const src = new Array(bins).fill(0);
        for (let k = 0; k < 3000; k++) { const v = draws[p.dist](); const b = Math.floor(v / 1.5 * bins); if (b >= 0 && b < bins) src[b]++; }
        const A = plotBox(ctx, [20, 14, half - 30, h - 42], [0, 1.5], [0, 1], col, "x", "source");
        const ms = Math.max(...src); ctx.fillStyle = col.muted;
        src.forEach((c, b) => { const x0 = A.X(b * 1.5 / bins), x1 = A.X((b + 1) * 1.5 / bins); ctx.fillRect(x0, A.Y(c / ms), x1 - x0 - 1, A.Y(0) - A.Y(c / ms)); });
        const [mu, sd] = stats[p.dist], se = sd / Math.sqrt(p.n);
        const lo = Math.max(0, mu - 4.5 * se), hi = mu + 4.5 * se, hst = new Array(bins).fill(0);
        for (const m of means) { const b = Math.floor((m - lo) / (hi - lo) * bins); if (b >= 0 && b < bins) hst[b]++; }
        const dx = (hi - lo) / bins, peak = means.length * dx / (se * Math.sqrt(2 * Math.PI));
        const B = plotBox(ctx, [half + 20, 14, w - half - 34, h - 42], [lo, hi], [0, peak * 1.25 || 1], col, "sample mean", "count");
        ctx.fillStyle = col.a;
        hst.forEach((c, b) => { const x0 = B.X(lo + b * dx), x1 = B.X(lo + (b + 1) * dx); ctx.fillRect(x0, B.Y(c), x1 - x0 - 1, B.Y(0) - B.Y(c)); });
        const curve = []; for (let k = 0; k <= 100; k++) { const x = lo + (hi - lo) * k / 100; curve.push([x, peak * Math.exp(-((x - mu) ** 2) / (2 * se * se))]); }
        B.line(curve, col.b, 2.5);
      },
      info() { return `${means.length} sample means   standard error σ/√n = ${(stats[p.dist][1] / Math.sqrt(p.n)).toFixed(3)}`; }
    };
  }
};

DEMOS["st-regression"] = {
  title: "Least squares",
  text: "",
  hint: "Click to add a point. An outlier far from the line pulls it a lot, because errors are squared.",
  details: "the line minimizes the total area of the squares, &Sigma;(y<sub>i</sub> &minus; a &minus; bx<sub>i</sub>)<sup>2</sup>. R<sup>2</sup> = 1 &minus; SS<sub>res</sub>/SS<sub>tot</sub>",
  make() {
    const p = { noise: 0.8 };
    let pts, a, b, r2;
    function fit() {
      const n = pts.length, mx = pts.reduce((s, q) => s + q[0], 0) / n, my = pts.reduce((s, q) => s + q[1], 0) / n;
      let sxy = 0, sxx = 0, st = 0, sr = 0;
      for (const [x, y] of pts) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; }
      b = sxy / sxx; a = my - b * mx;
      for (const [x, y] of pts) { st += (y - my) ** 2; sr += (y - a - b * x) ** 2; }
      r2 = 1 - sr / st;
    }
    return {
      perFrame: 1,
      params: [{ key: "noise", label: "noise", min: 0, max: 2.5, step: 0.05, value: 0.8 }],
      set(k, v) { p[k] = v; this.reset(); },
      reset() { pts = Array.from({ length: 12 }, () => { const x = 1 + rand() * 10; return [x, 1 + 0.5 * x + p.noise * gauss()]; }); fit(); },
      click(px, py, w, h) { const s = Math.min(w / 12, h / 8); pts.push([px / s, (h - py) / s]); fit(); },
      step() {},
      draw(ctx, w, h, col) {
        const s = Math.min(w / 12, h / 8), X = v => v * s, Y = v => h - v * s;
        ctx.fillStyle = col.b; ctx.globalAlpha = 0.18; ctx.strokeStyle = col.b;
        for (const [x, y] of pts) { const yh = a + b * x, d = (y - yh) * s; ctx.fillRect(X(x), Math.min(Y(y), Y(yh)), Math.abs(d), Math.abs(d)); }
        ctx.globalAlpha = 1;
        ctx.strokeStyle = col.a; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, Y(a)); ctx.lineTo(w, Y(a + b * w / s)); ctx.stroke();
        ctx.fillStyle = col.ink; for (const [x, y] of pts) dot(ctx, X(x), Y(y), 4);
      },
      info() { return `y = ${a.toFixed(2)} + ${b.toFixed(2)}x   R² = ${r2.toFixed(3)}   n = ${pts.length}`; }
    };
  }
};

DEMOS["st-bootstrap"] = {
  title: "Bootstrap error bars",
  text: "",
  details: "one skewed data set of size n. Each bootstrap sample draws n values from it with replacement. The middle 95% of the bootstrap means gives the interval",
  make() {
    const p = { n: 25 };
    let data, boots;
    const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
    return {
      perFrame: 1,
      params: [{ key: "n", label: "data size n", min: 5, max: 200, step: 5, value: 25 }],
      set(k, v) { p[k] = v; this.reset(); },
      reset() { data = Array.from({ length: p.n }, () => Math.exp(0.6 * gauss())); boots = []; },
      step() {
        if (boots.length > 4000) return;
        for (let k = 0; k < 30; k++) { let s = 0; for (let i = 0; i < p.n; i++) s += data[(rand() * p.n) | 0]; boots.push(s / p.n); }
      },
      ci() { const s = boots.slice().sort((x, y) => x - y); return [s[Math.floor(0.025 * s.length)], s[Math.floor(0.975 * s.length)]]; },
      draw(ctx, w, h, col) {
        const top = 40;
        const X = v => 30 + v / 4 * (w - 50);
        ctx.fillStyle = col.ink; for (const v of data) dot(ctx, X(Math.min(v, 4)), 22, 3);
        ctx.fillStyle = col.muted; ctx.font = "10px monospace"; ctx.fillText("data", 4, 26);
        const lo = 0, hi = 4, bins = 80, hst = new Array(bins).fill(0);
        for (const m of boots) { const b = Math.floor((m - lo) / (hi - lo) * bins); if (b >= 0 && b < bins) hst[b]++; }
        const mx = Math.max(1, ...hst), base = h - 28;
        ctx.fillStyle = col.a;
        hst.forEach((c, b) => { const x0 = X(lo + b * (hi - lo) / bins), x1 = X(lo + (b + 1) * (hi - lo) / bins); ctx.fillRect(x0, base - c / mx * (base - top - 10), x1 - x0 - 1, c / mx * (base - top - 10)); });
        ctx.strokeStyle = col.rule; ctx.beginPath(); ctx.moveTo(X(0), base); ctx.lineTo(X(4), base); ctx.stroke();
        if (boots.length > 50) {
          const [l, u] = this.ci();
          ctx.strokeStyle = col.b; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X(l), base + 8); ctx.lineTo(X(u), base + 8); ctx.stroke();
          ctx.fillStyle = col.b; ctx.fillText("95% interval", X(u) + 6, base + 11);
        }
        ctx.fillStyle = col.muted; for (let v = 0; v <= 4; v++) ctx.fillText(String(v), X(v) - 3, h - 4);
      },
      info() {
        if (boots.length < 50) return "resampling...";
        const [l, u] = this.ci(), m = mean(data), sd = Math.sqrt(data.reduce((s, v) => s + (v - m) ** 2, 0) / (p.n - 1));
        return `mean ${m.toFixed(2)}   bootstrap 95%: ${l.toFixed(2)} to ${u.toFixed(2)}   ±1.96 s/√n: ${(m - 1.96 * sd / Math.sqrt(p.n)).toFixed(2)} to ${(m + 1.96 * sd / Math.sqrt(p.n)).toFixed(2)}`;
      }
    };
  }
};

DEMOS["st-block"] = {
  title: "Block averaging for correlated data",
  text: "",
  details: "an AR(1) series x<sub>t</sub> = &phi;x<sub>t&minus;1</sub> + noise, like an observable from an MD run, with correlation time &tau; = &minus;1/ln &phi;. The error of the mean from blocks of size B levels off once B is longer than &tau;",
  make() {
    const p = { tau: 20 };
    let xs, cur;
    return {
      perFrame: 1,
      params: [{ key: "tau", label: "correlation time τ", min: 1, max: 200, step: 1, value: 20 }],
      set(k, v) { p[k] = v; this.reset(); },
      reset() { xs = []; cur = 0; },
      step() {
        if (xs.length >= 40000) return;
        const phi = Math.exp(-1 / p.tau), s = Math.sqrt(1 - phi * phi);
        for (let k = 0; k < 200; k++) { cur = phi * cur + s * gauss(); xs.push(cur); }
      },
      blocks() {
        const out = [];
        for (let B = 1; B <= xs.length / 8; B *= 2) {
          const nb = Math.floor(xs.length / B), m = [];
          for (let k = 0; k < nb; k++) { let s = 0; for (let i = 0; i < B; i++) s += xs[k * B + i]; m.push(s / B); }
          const mm = m.reduce((a, b) => a + b, 0) / nb, v = m.reduce((a, b) => a + (b - mm) ** 2, 0) / (nb - 1);
          out.push([B, Math.sqrt(v / nb)]);
        }
        return out;
      },
      draw(ctx, w, h, col) {
        const top = h * 0.32;
        ctx.strokeStyle = col.a; ctx.lineWidth = 1; ctx.beginPath();
        const show = xs.slice(-600);
        show.forEach((v, i) => { const px = 10 + i / 600 * (w - 20), py = top / 2 + 4 - v * top / 7; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
        ctx.stroke();
        const bl = this.blocks();
        if (!bl.length) return;
        const exact = Math.sqrt((1 + Math.exp(-1 / p.tau)) / (1 - Math.exp(-1 / p.tau)) / xs.length);
        const ymax = Math.max(exact * 1.6, ...bl.map(q => q[1]));
        const P = plotBox(ctx, [40, top + 16, w - 56, h - top - 44], [0, Math.log2(bl[bl.length - 1][0]) + 1], [0, ymax], col, "log2 block size", "error of mean");
        P.hline(exact, col.muted);
        P.line(bl.map(([B, e]) => [Math.log2(B), e]), col.b, 2);
        P.dots(bl.map(([B, e]) => [Math.log2(B), e]), col.b, 3);
        ctx.fillStyle = col.muted; ctx.font = "10px monospace"; ctx.fillText("dashed: true error", P.X(0.2), P.Y(exact) - 4);
      },
      info() {
        if (!xs.length) return "";
        const bl = this.blocks();
        return bl.length ? `N = ${xs.length}   naive error ${bl[0][1].toExponential(1)}   plateau ${bl[bl.length - 1][1].toExponential(1)}` : `N = ${xs.length}`;
      }
    };
  }
};
