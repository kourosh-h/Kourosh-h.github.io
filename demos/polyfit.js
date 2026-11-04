// Polynomial fit: underfitting and overfitting
DEMOS.polyfit = {
  title: "Overfitting a polynomial",
  text: "A polynomial fitted to 14 noisy points from a sine curve. A low degree misses the shape, and a high degree chases the noise. The training error keeps falling, while the test error goes back up.",
  details: "least squares with a tiny ridge term, test error on 200 fresh points from the same curve",
  make() {
    const p = { deg: 3, noise: 0.25 };
    let xs, ys, coef, trainErr, testErr;
    const f = x => Math.sin(Math.PI * x);
    const evalPoly = (c, x) => c.reduce((s, a, k) => s + a * x ** k, 0);
    function solve(A, b) {
      const n = b.length;
      for (let i = 0; i < n; i++) {
        let m = i;
        for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[m][i])) m = r;
        [A[i], A[m]] = [A[m], A[i]]; [b[i], b[m]] = [b[m], b[i]];
        for (let r = i + 1; r < n; r++) {
          const k = A[r][i] / A[i][i];
          for (let c = i; c < n; c++) A[r][c] -= k * A[i][c];
          b[r] -= k * b[i];
        }
      }
      const x = new Array(n).fill(0);
      for (let i = n - 1; i >= 0; i--) {
        let s = b[i];
        for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c];
        x[i] = s / A[i][i];
      }
      return x;
    }
    function fit() {
      const n = p.deg + 1;
      const A = Array.from({ length: n }, () => new Array(n).fill(0)), b = new Array(n).fill(0);
      for (let k = 0; k < xs.length; k++) for (let i = 0; i < n; i++) {
        b[i] += ys[k] * xs[k] ** i;
        for (let j = 0; j < n; j++) A[i][j] += xs[k] ** (i + j);
      }
      for (let i = 0; i < n; i++) A[i][i] += 1e-9;
      coef = solve(A, b);
      trainErr = Math.sqrt(xs.reduce((s, x, k) => s + (evalPoly(coef, x) - ys[k]) ** 2, 0) / xs.length);
      let e = 0;
      for (let k = 0; k < 200; k++) { const x = -1 + 2 * rand(); e += (evalPoly(coef, x) - f(x) - p.noise * gauss()) ** 2; }
      testErr = Math.sqrt(e / 200);
    }
    return {
      perFrame: 1,
      params: [
        { key: "deg", label: "degree", min: 0, max: 13, step: 1, value: 3 },
        { key: "noise", label: "noise", min: 0, max: 0.6, step: 0.01, value: 0.25 }
      ],
      set(k, v) { p[k] = v; if (k === "noise") this.reset(); else fit(); },
      reset() {
        xs = Array.from({ length: 14 }, (_, k) => -1 + 2 * (k + 0.5) / 14 + 0.05 * gauss());
        ys = xs.map(x => f(x) + p.noise * gauss());
        fit();
      },
      step() {},
      draw(ctx, w, h, col) {
        const X = x => (x + 1.1) / 2.2 * w, Y = y => h / 2 - y * h * 0.32;
        ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, Y(0)); ctx.lineTo(w, Y(0)); ctx.stroke();
        ctx.setLineDash([4, 4]); ctx.strokeStyle = col.muted; ctx.beginPath();
        for (let k = 0; k <= 200; k++) { const x = -1.1 + 2.2 * k / 200; k ? ctx.lineTo(X(x), Y(f(x))) : ctx.moveTo(X(x), Y(f(x))); }
        ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = col.a; ctx.lineWidth = 2.5; ctx.beginPath();
        for (let k = 0; k <= 300; k++) {
          const x = -1.05 + 2.1 * k / 300, y = Math.max(-1.6, Math.min(1.6, evalPoly(coef, x)));
          k ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y));
        }
        ctx.stroke();
        ctx.fillStyle = col.b;
        xs.forEach((x, k) => dot(ctx, X(x), Y(ys[k]), 4.5));
      },
      info() { return `degree ${p.deg}   train RMSE ${trainErr.toFixed(3)}   test RMSE ${testErr.toFixed(3)}`; }
    };
  }
};
