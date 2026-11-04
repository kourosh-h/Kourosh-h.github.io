// Gaussian process regression
DEMOS.gp = {
  title: "Gaussian process regression",
  text: "A Gaussian process with an RBF kernel. It gives a mean prediction and an uncertainty band that widens away from the data. This is the kind of surrogate used to decide which simulation to run next.",
  hint: "Click anywhere on the plot to add a measurement.",
  details: "k(x, x') = exp(&minus;(x &minus; x')<sup>2</sup> / 2&ell;<sup>2</sup>), band = mean &plusmn; 2 standard deviations, Cholesky solve",
  make() {
    const p = { ell: 0.15, sn: 0.05 };
    let X, Y, mean, sd, dirty = true;
    const k = (a, b) => Math.exp(-((a - b) ** 2) / (2 * p.ell * p.ell));
    function cholesky(A) {
      const n = A.length, L = A.map(() => new Array(n).fill(0));
      for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) {
        let s = A[i][j];
        for (let m = 0; m < j; m++) s -= L[i][m] * L[j][m];
        L[i][j] = i === j ? Math.sqrt(Math.max(s, 1e-12)) : s / L[j][j];
      }
      return L;
    }
    const fwd = (L, b) => { const y = []; for (let i = 0; i < b.length; i++) { let s = b[i]; for (let m = 0; m < i; m++) s -= L[i][m] * y[m]; y.push(s / L[i][i]); } return y; };
    const bwd = (L, y) => { const n = y.length, x = new Array(n); for (let i = n - 1; i >= 0; i--) { let s = y[i]; for (let m = i + 1; m < n; m++) s -= L[m][i] * x[m]; x[i] = s / L[i][i]; } return x; };
    function compute() {
      const n = X.length, G = 160;
      mean = []; sd = [];
      if (!n) { for (let g = 0; g <= G; g++) { mean.push(0); sd.push(1); } dirty = false; return; }
      const K = X.map(a => X.map(b => k(a, b)));
      for (let i = 0; i < n; i++) K[i][i] += p.sn * p.sn;
      const L = cholesky(K), alpha = bwd(L, fwd(L, Y));
      for (let g = 0; g <= G; g++) {
        const xs = g / G, ks = X.map(a => k(a, xs));
        mean.push(ks.reduce((s, v, i) => s + v * alpha[i], 0));
        const v = fwd(L, ks);
        sd.push(Math.sqrt(Math.max(1e-9, 1 - v.reduce((s, q) => s + q * q, 0))));
      }
      dirty = false;
    }
    return {
      perFrame: 1,
      params: [
        { key: "ell", label: "length scale &ell;", min: 0.03, max: 0.5, step: 0.01, value: 0.15 },
        { key: "sn", label: "noise", min: 0.01, max: 0.4, step: 0.01, value: 0.05 }
      ],
      set(key, v) { p[key] = v; dirty = true; },
      reset() { X = [0.1, 0.3, 0.55, 0.8]; Y = [0.2, 0.9, -0.4, 0.5]; dirty = true; },
      click(px, py, w, h) { X.push(px / w); Y.push((h / 2 - py) / (h * 0.35)); dirty = true; },
      step() { if (dirty) compute(); },
      draw(ctx, w, h, col) {
        if (dirty) compute();
        const G = mean.length - 1, Xs = g => g / G * w, Ys = y => h / 2 - y * h * 0.35;
        ctx.fillStyle = col.a; ctx.globalAlpha = 0.15; ctx.beginPath();
        for (let g = 0; g <= G; g++) ctx.lineTo(Xs(g), Ys(mean[g] + 2 * sd[g]));
        for (let g = G; g >= 0; g--) ctx.lineTo(Xs(g), Ys(mean[g] - 2 * sd[g]));
        ctx.fill(); ctx.globalAlpha = 1;
        ctx.strokeStyle = col.a; ctx.lineWidth = 2.5; ctx.beginPath();
        for (let g = 0; g <= G; g++) g ? ctx.lineTo(Xs(g), Ys(mean[g])) : ctx.moveTo(Xs(g), Ys(mean[g]));
        ctx.stroke();
        ctx.fillStyle = col.b;
        X.forEach((x, i) => dot(ctx, x * w, Ys(Y[i]), 5));
      },
      info() {
        if (dirty) compute();
        const m = sd.indexOf(Math.max(...sd));
        return `${X.length} points   most uncertain at x = ${(m / (sd.length - 1)).toFixed(2)}`;
      }
    };
  }
};
