// Learn: coarse-graining

// small dense linear solver used by the fitting demos
function solveLinear(A, b) {
  const n = b.length;
  A = A.map(r => r.slice()); b = b.slice();
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

// least squares fit of y ~ sum_k c_k phi_k(x), with a small ridge term
function leastSquares(xs, ys, basis, ridge = 1e-6) {
  const m = basis.length;
  const A = Array.from({ length: m }, () => new Array(m).fill(0)), b = new Array(m).fill(0);
  for (let n = 0; n < xs.length; n++) {
    const phi = basis.map(f => f(xs[n]));
    for (let i = 0; i < m; i++) { b[i] += phi[i] * ys[n]; for (let j = 0; j < m; j++) A[i][j] += phi[i] * phi[j]; }
  }
  for (let i = 0; i < m; i++) A[i][i] += ridge;
  return solveLinear(A, b);
}

DEMOS["cg-mapping"] = {
  title: "Mapping atoms to beads",
  text: "",
  details: "a 24-atom chain, each bead sits at the center of mass of its group of atoms",
  make() {
    const L = 24, dt = 0.01;
    const p = { m: 4 };
    let x, y, vx, vy;
    function forces() {
      const fx = new Float64Array(L), fy = new Float64Array(L);
      for (let i = 0; i < L - 1; i++) {
        const dx = x[i + 1] - x[i], dy = y[i + 1] - y[i], r = Math.hypot(dx, dy), f = 300 * (r - 1) / r;
        fx[i] += f * dx; fy[i] += f * dy; fx[i + 1] -= f * dx; fy[i + 1] -= f * dy;
      }
      for (let i = 0; i < L - 2; i++) {
        const dx = x[i + 2] - x[i], dy = y[i + 2] - y[i], r = Math.hypot(dx, dy), f = 30 * (r - 1.64) / r;
        fx[i] += f * dx; fy[i] += f * dy; fx[i + 2] -= f * dx; fy[i + 2] -= f * dy;
      }
      return [fx, fy];
    }
    return {
      perFrame: 4,
      params: [{ key: "m", label: "atoms per bead", min: 1, max: 6, step: 1, value: 4 }],
      set(k, v) { p[k] = v; },
      reset() {
        x = Array.from({ length: L }, (_, i) => i * 0.82 - L * 0.41); y = Array.from({ length: L }, (_, i) => (i % 2) * 0.57);
        vx = new Array(L).fill(0); vy = new Array(L).fill(0);
      },
      step() {
        const [fx, fy] = forces();
        const c1 = Math.exp(-2 * dt), c2 = Math.sqrt((1 - c1 * c1) * 0.6);
        for (let i = 0; i < L; i++) {
          vx[i] = c1 * (vx[i] + dt * fx[i]) + c2 * gauss(); vy[i] = c1 * (vy[i] + dt * fy[i]) + c2 * gauss();
          x[i] += dt * vx[i]; y[i] += dt * vy[i];
        }
        let cx = 0, cy = 0; for (let i = 0; i < L; i++) { cx += x[i]; cy += y[i]; }
        for (let i = 0; i < L; i++) { x[i] -= cx / L; y[i] -= cy / L; }
      },
      draw(ctx, w, h, col) {
        const s = Math.min(w / 24, h / 10), ox = w / 2, oy = h / 2;
        const beads = [];
        for (let g = 0; g < L; g += p.m) {
          let bx = 0, by = 0, n = 0;
          for (let i = g; i < Math.min(L, g + p.m); i++) { bx += x[i]; by += y[i]; n++; }
          beads.push([bx / n, by / n, n]);
        }
        ctx.globalAlpha = 0.25;
        beads.forEach(([bx, by, n], k) => { ctx.fillStyle = k % 2 ? col.b : col.a; dot(ctx, ox + bx * s, oy + by * s, s * (0.45 + 0.3 * Math.sqrt(n))); });
        ctx.globalAlpha = 1;
        ctx.strokeStyle = col.muted; ctx.lineWidth = 1.5; ctx.beginPath();
        for (let i = 0; i < L; i++) i ? ctx.lineTo(ox + x[i] * s, oy + y[i] * s) : ctx.moveTo(ox + x[i] * s, oy + y[i] * s);
        ctx.stroke();
        ctx.fillStyle = col.ink; for (let i = 0; i < L; i++) dot(ctx, ox + x[i] * s, oy + y[i] * s, s * 0.14);
        ctx.strokeStyle = col.ink; ctx.lineWidth = 2.5; ctx.beginPath();
        beads.forEach(([bx, by], k) => k ? ctx.lineTo(ox + bx * s, oy + by * s) : ctx.moveTo(ox + bx * s, oy + by * s));
        ctx.stroke();
        beads.forEach(([bx, by], k) => { ctx.fillStyle = k % 2 ? col.b : col.a; dot(ctx, ox + bx * s, oy + by * s, s * 0.22); });
      },
      info() { const nb = Math.ceil(L / p.m); return `atoms ${L} → beads ${nb}   coordinates ${2 * L} → ${2 * nb}`; }
    };
  }
};

DEMOS["cg-ibi"] = {
  title: "Iterative Boltzmann inversion",
  text: "",
  details: "64 particles, Monte Carlo. Target g(r) from a reference potential with a soft shoulder. Start: V<sub>0</sub> = &minus;kT ln g<sub>target</sub>. Update: V<sub>i+1</sub> = V<sub>i</sub> + &alpha; kT ln(g<sub>i</sub>/g<sub>target</sub>)",
  make() {
    const N = 64, L = Math.sqrt(N / 0.55), kT = 1, rmin = 0.6, rmax = 3, nb = 48, dr = (rmax - rmin) / nb;
    const p = { alpha: 0.5 };
    const vTrue = r => 4 * (r ** -12 - r ** -6) + 1.2 * Math.exp(-(((r - 1.55) / 0.18) ** 2));
    let x, y, target, V, g, hist, samples, sweeps, iter, err;
    const rc = k => rmin + (k + 0.5) * dr;
    function pot(r) {
      if (r >= rmax) return 0;
      if (r < rmin + dr / 2) return V[0] + 40 * (rmin + dr / 2 - r);
      const f = (r - rmin) / dr - 0.5, k = Math.floor(f), t = f - k;
      return V[k] * (1 - t) + V[Math.min(k + 1, nb - 1)] * t;
    }
    function energyOf(i, xi, yi, fn) {
      let e = 0;
      for (let j = 0; j < N; j++) {
        if (j === i) continue;
        let dx = xi - x[j], dy = yi - y[j];
        dx -= L * Math.round(dx / L); dy -= L * Math.round(dy / L);
        const r = Math.sqrt(dx * dx + dy * dy);
        if (r < rmax) e += fn(r);
      }
      return e;
    }
    function sweep(fn) {
      for (let m = 0; m < N; m++) {
        const i = (rand() * N) | 0, nx = (x[i] + 0.3 * (rand() - 0.5) + L) % L, ny = (y[i] + 0.3 * (rand() - 0.5) + L) % L;
        const dE = energyOf(i, nx, ny, fn) - energyOf(i, x[i], y[i], fn);
        if (dE <= 0 || rand() < Math.exp(-dE / kT)) { x[i] = nx; y[i] = ny; }
      }
    }
    function sample(h) {
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        let dx = x[i] - x[j], dy = y[i] - y[j];
        dx -= L * Math.round(dx / L); dy -= L * Math.round(dy / L);
        const r = Math.sqrt(dx * dx + dy * dy);
        if (r >= rmin && r < rmax) h[Math.floor((r - rmin) / dr)] += 2;
      }
    }
    const toG = (h, n) => Array.from(h, (c, k) => c / (n * N * (N / (L * L)) * 2 * Math.PI * rc(k) * dr));
    return {
      perFrame: 1,
      params: [{ key: "alpha", label: "update strength α", min: 0.1, max: 1, step: 0.05, value: 0.5 }],
      set(k, v) { p[k] = v; },
      reset() {
        const side = Math.ceil(Math.sqrt(N));
        x = Array.from({ length: N }, (_, i) => (i % side + 0.5) * L / side); y = Array.from({ length: N }, (_, i) => (Math.floor(i / side) + 0.5) * L / side);
        for (let s = 0; s < 150; s++) sweep(r => r < rmax ? vTrue(Math.max(r, 0.7)) : 0);
        const h = new Float64Array(nb);
        for (let s = 0; s < 600; s++) { sweep(r => vTrue(Math.max(r, 0.7))); if (s % 3 === 0) sample(h); }
        target = toG(h, 200).map(v => Math.max(v, 1e-3));
        V = target.map(v => -kT * Math.log(v));
        for (let k = 0; k < nb; k++) if (target[k] < 0.02) V[k] = Math.max(V[k], 8);
        V = V.map(v => Math.min(v, 8));
        g = new Array(nb).fill(0); hist = new Float64Array(nb); samples = 0; sweeps = 0; iter = 0; err = 0;
      },
      step() {
        for (let s = 0; s < 6; s++) { sweep(pot); sweeps++; if (sweeps % 3 === 0) { sample(hist); samples++; } }
        if (sweeps >= 240) {
          g = toG(hist, samples);
          err = 0;
          for (let k = 0; k < nb; k++) {
            err += (g[k] - target[k]) ** 2;
            if (target[k] > 0.02 && g[k] > 0.02) V[k] = Math.min(8, V[k] + p.alpha * kT * Math.log(g[k] / target[k]));
          }
          err = Math.sqrt(err / nb);
          hist.fill(0); samples = 0; sweeps = 0; iter++;
        }
      },
      draw(ctx, w, h, col) {
        const half = w / 2;
        const A = plotBox(ctx, [34, 14, half - 50, h - 42], [rmin, rmax], [0, 3], col, "r", "g(r)");
        A.line(target.map((v, k) => [rc(k), v]), col.muted, 2, [4, 3]);
        if (iter) A.line(g.map((v, k) => [rc(k), v]), col.a, 2);
        const B = plotBox(ctx, [half + 34, 14, half - 50, h - 42], [rmin, rmax], [-1.5, 3], col, "r", "V(r)");
        B.hline(0, col.rule);
        const tr = []; for (let k = 0; k <= 100; k++) { const r = 0.85 + (rmax - 0.85) * k / 100; tr.push([r, vTrue(r)]); }
        B.line(tr, col.muted, 2, [4, 3]);
        B.line(V.map((v, k) => [rc(k), v]), col.b, 2);
        ctx.fillStyle = col.muted; ctx.font = "10px monospace";
        ctx.fillText("dashed: target / true", 40, h - 30);
      },
      info() { return `iteration ${iter}   RMS error in g(r) = ${iter ? err.toFixed(3) : "-"}`; }
    };
  }
};

DEMOS["cg-landscape"] = {
  title: "Why coarse-grained models are faster",
  text: "",
  details: "overdamped Langevin, 40 walkers each, U(x) = x<sup>4</sup> &minus; 2x<sup>2</sup> plus A sin(25x) for the detailed model, kT = 0.35",
  make() {
    const n = 40, dt = 2e-4, kT = 0.35;
    const p = { A: 0.3 };
    let fine, coarse, crossF, crossC, t;
    const U = (x, a) => x ** 4 - 2 * x * x + a * Math.sin(25 * x);
    const F = (x, a) => -(4 * x ** 3 - 4 * x + 25 * a * Math.cos(25 * x));
    return {
      perFrame: 30,
      params: [{ key: "A", label: "roughness A", min: 0, max: 0.6, step: 0.02, value: 0.3 }],
      set(k, v) { p[k] = v; this.reset(); },
      reset() { fine = new Float64Array(n).fill(-1); coarse = new Float64Array(n).fill(-1); crossF = 0; crossC = 0; t = 0; },
      step() {
        const s = Math.sqrt(2 * kT * dt);
        for (let i = 0; i < n; i++) {
          const a = fine[i], b = coarse[i];
          fine[i] += F(a, p.A) * dt + s * gauss();
          coarse[i] += F(b, 0) * dt + s * gauss();
          if (Math.sign(a) !== Math.sign(fine[i]) && Math.abs(fine[i]) > 0) crossF++;
          if (Math.sign(b) !== Math.sign(coarse[i])) crossC++;
          fine[i] = Math.max(-1.8, Math.min(1.8, fine[i])); coarse[i] = Math.max(-1.8, Math.min(1.8, coarse[i]));
        }
        t += dt;
      },
      draw(ctx, w, h, col) {
        const half = h / 2;
        [[fine, p.A, col.b, "detailed"], [coarse, 0, col.a, "coarse-grained"]].forEach(([ws, a, c, name], k) => {
          const P = plotBox(ctx, [30, 8 + k * half, w - 44, half - 24], [-1.8, 1.8], [-1.6, 2.5], col, k ? "x" : "", "U");
          const curve = []; for (let q = 0; q <= 400; q++) { const x = -1.8 + 3.6 * q / 400; curve.push([x, U(x, a)]); }
          P.line(curve, col.muted, 1.2);
          ctx.fillStyle = c; ctx.globalAlpha = 0.6;
          for (const x of ws) dot(ctx, P.X(x), P.Y(U(x, a)) - 4, 4);
          ctx.globalAlpha = 1;
          ctx.fillStyle = c; ctx.font = "11px monospace"; ctx.fillText(name, w - 140, 20 + k * half);
        });
      },
      info() { return `barrier crossings: detailed ${crossF}, coarse-grained ${crossC}`; }
    };
  }
};

DEMOS["cg-forcematch"] = {
  title: "Force matching",
  text: "",
  details: "300 noisy reference forces between two CG sites, fit with a sum of Gaussian basis functions by linear least squares",
  make() {
    const p = { m: 8, noise: 2 };
    let rs, fs, coef, centers, width;
    const fTrue = r => 24 * (2 / r ** 13 - 1 / r ** 7) * 0.6 + 2 * Math.exp(-(((r - 1.7) / 0.25) ** 2)) * (r - 1.7) * -8;
    function fit() {
      centers = Array.from({ length: p.m }, (_, k) => 0.95 + (2.6 - 0.95) * k / (p.m - 1));
      width = (2.6 - 0.95) / (p.m - 1);
      const basis = centers.map(c => r => Math.exp(-(((r - c) / width) ** 2)));
      coef = leastSquares(rs, fs, basis, 1e-3);
    }
    const model = r => centers.reduce((s, c, k) => s + coef[k] * Math.exp(-(((r - c) / width) ** 2)), 0);
    return {
      perFrame: 1,
      params: [
        { key: "m", label: "basis functions", min: 3, max: 30, step: 1, value: 8 },
        { key: "noise", label: "noise in forces", min: 0, max: 6, step: 0.1, value: 2 }
      ],
      set(k, v) { p[k] = v; if (k === "noise") this.reset(); else fit(); },
      reset() {
        rs = Array.from({ length: 300 }, () => 0.95 + rand() * 1.65);
        fs = rs.map(r => fTrue(r) + p.noise * gauss());
        fit();
      },
      step() {},
      draw(ctx, w, h, col) {
        const P = plotBox(ctx, [34, 14, w - 50, h - 42], [0.9, 2.65], [-6, 12], col, "r", "F(r)");
        P.hline(0, col.rule);
        P.dots(rs.map((r, i) => [r, Math.max(-6, Math.min(12, fs[i]))]), col.rule, 2);
        const tr = [], md = [];
        for (let k = 0; k <= 200; k++) { const r = 0.95 + 1.65 * k / 200; tr.push([r, fTrue(r)]); md.push([r, model(r)]); }
        P.line(tr, col.muted, 2, [4, 3]);
        P.line(md, col.a, 2.5);
      },
      info() {
        let e = 0; for (let k = 0; k <= 100; k++) { const r = 0.95 + 1.65 * k / 100; e += (model(r) - fTrue(r)) ** 2; }
        return `${p.m} basis functions   RMS error vs true force = ${Math.sqrt(e / 101).toFixed(2)}`;
      }
    };
  }
};
