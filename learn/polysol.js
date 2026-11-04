// Learn: polymers in solution

DEMOS["po-solvent"] = {
  title: "One chain in good, theta, and poor solvent",
  text: "A single chain in an implicit solvent. If you make the beads sticky, the swollen coil collapses into a globule.",
  details: "bead-spring chain, harmonic bonds, LJ between non-bonded beads with depth &epsilon; (implicit solvent), Brownian dynamics at kT = 1. Small &epsilon;: good solvent, large &epsilon;: poor solvent",
  make() {
    const dt = 4e-4;
    const p = { eps: 0.2, N: 40 };
    let x, y, t, rgs;
    const rg = () => {
      let cx = 0, cy = 0; for (let i = 0; i < p.N; i++) { cx += x[i]; cy += y[i]; }
      cx /= p.N; cy /= p.N;
      let s = 0; for (let i = 0; i < p.N; i++) s += (x[i] - cx) ** 2 + (y[i] - cy) ** 2;
      return Math.sqrt(s / p.N);
    };
    return {
      perFrame: 1,
      params: [
        { key: "eps", label: "bead attraction ε (solvent quality)", min: 0, max: 2, step: 0.05, value: 0.2 },
        { key: "N", label: "beads", min: 10, max: 60, step: 2, value: 40 }
      ],
      set(k, v) { p[k] = v; if (k === "N") this.reset(); else rgs = []; },
      reset() {
        x = new Float64Array(p.N); y = new Float64Array(p.N);
        for (let i = 0; i < p.N; i++) { x[i] = i - p.N / 2; y[i] = 0.3 * Math.sin(i); }
        t = 0; rgs = [];
      },
      step() {
        const N = p.N, fx = new Float64Array(N), fy = new Float64Array(N), s = Math.sqrt(2 * dt);
        for (let it = 0; it < 150; it++) {
          fx.fill(0); fy.fill(0);
          for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
            const dx = x[i] - x[j], dy = y[i] - y[j], r2 = dx * dx + dy * dy;
            let f = 0;
            if (j === i + 1) { const r = Math.sqrt(r2); f = -200 * (r - 1) / r; }
            else if (r2 < 6.25) {
              const i2 = 1 / Math.max(r2, 0.7), i6 = i2 * i2 * i2, lj = 24 * i2 * i6 * (2 * i6 - 1);
              // full repulsion inside the LJ minimum, attraction outside scaled by eps
              f = r2 < 1.26 ? lj : p.eps * lj;
            }
            fx[i] += f * dx; fy[i] += f * dy; fx[j] -= f * dx; fy[j] -= f * dy;
          }
          for (let i = 0; i < N; i++) { x[i] += fx[i] * dt + s * gauss(); y[i] += fy[i] * dt + s * gauss(); }
          t += dt;
        }
        rgs.push(rg()); if (rgs.length > 400) rgs.shift();
      },
      draw(ctx, w, h, col) {
        const bw = w * 0.5, N = p.N;
        let cx = 0, cy = 0; for (let i = 0; i < N; i++) { cx += x[i]; cy += y[i]; }
        cx /= N; cy /= N;
        const s = Math.min(bw, h) / 26, ox = bw / 2, oy = h / 2;
        ctx.fillStyle = col.a;
        for (let i = 0; i < N; i++) dot(ctx, ox + (x[i] - cx) * s, oy + (y[i] - cy) * s, s * 0.42);
        ctx.strokeStyle = col.ink; ctx.lineWidth = Math.max(1.5, s * 0.14); ctx.beginPath();
        for (let i = 0; i < N; i++) { const a = ox + (x[i] - cx) * s, b = oy + (y[i] - cy) * s; i ? ctx.lineTo(a, b) : ctx.moveTo(a, b); }
        ctx.stroke();
        ctx.fillStyle = col.b; dot(ctx, ox + (x[0] - cx) * s, oy + (y[0] - cy) * s, s * 0.42);
        const P = plotBox(ctx, [bw + 34, 14, w - bw - 46, h - 42], [0, 400], [0, 1.2 * Math.pow(p.N, 0.75)], col, "time", "Rg");
        P.line(rgs.map((v, k) => [k, v]), col.a, 1.5);
        P.hline(0.45 * Math.pow(p.N, 0.75), col.muted);
        P.hline(0.55 * Math.pow(p.N, 0.5), col.muted);
        ctx.fillStyle = col.muted; ctx.font = "10px monospace";
        ctx.fillText("~ N^3/4 (good)", P.X(10), P.Y(0.45 * Math.pow(p.N, 0.75)) - 4);
        ctx.fillText("~ N^1/2 (collapsed)", P.X(10), P.Y(0.55 * Math.pow(p.N, 0.5)) - 4);
      },
      info() {
        const m = rgs.length ? rgs.slice(-100).reduce((a, b) => a + b, 0) / Math.min(100, rgs.length) : 0;
        const state = p.eps < 0.35 ? "good solvent" : p.eps < 0.7 ? "near theta" : "poor solvent";
        return `mean Rg = ${m.toFixed(2)}   ${state}`;
      }
    };
  }
};

DEMOS["po-flory"] = {
  title: "Flory-Huggins: will they mix?",
  text: "The free energy of mixing two polymers, and the phase diagram that follows from it. Long chains hardly ever mix.",
  hint: "Move the composition and &chi;, and watch the point cross the curves.",
  details: "&Delta;G<sub>mix</sub>/kT per site = (&phi;/N) ln &phi; + ((1&minus;&phi;)/N) ln(1&minus;&phi;) + &chi;&phi;(1&minus;&phi;), both polymers of length N. Spinodal: second derivative zero. Binodal: common tangent, here the two minima",
  make() {
    const p = { chi: 0.06, N: 50, phi: 0.3 };
    const G = (f, chi) => f / p.N * Math.log(f) + (1 - f) / p.N * Math.log(1 - f) + chi * f * (1 - f);
    const spin = f => 1 / (2 * p.N) * (1 / f + 1 / (1 - f));
    // binodal for the symmetric case: dG/dphi = 0 away from 1/2
    const binodal = f => Math.log(f / (1 - f)) / (p.N * (2 * f - 1));
    return {
      perFrame: 1,
      params: [
        { key: "chi", label: "χ", min: 0, max: 0.15, step: 0.001, value: 0.06 },
        { key: "N", label: "chain length N", min: 1, max: 200, step: 1, value: 50 },
        { key: "phi", label: "composition φ", min: 0.02, max: 0.98, step: 0.01, value: 0.3 }
      ],
      set(k, v) { p[k] = v; },
      reset() {},
      step() {},
      draw(ctx, w, h, col) {
        const half = w / 2;
        const pts = []; let lo = Infinity, hi = -Infinity;
        for (let k = 1; k < 200; k++) { const f = k / 200, g = G(f, p.chi); pts.push([f, g]); lo = Math.min(lo, g); hi = Math.max(hi, g); }
        const pad = (hi - lo) * 0.1 || 0.01;
        const A = plotBox(ctx, [34, 14, half - 50, h - 42], [0, 1], [lo - pad, hi + pad], col, "φ", "ΔG_mix / kT");
        A.line(pts, col.a, 2);
        A.dots([[p.phi, G(p.phi, p.chi)]], col.b, 5);
        const chic = 2 / p.N, cmax = Math.max(0.15, chic * 3);
        const B = plotBox(ctx, [half + 34, 14, half - 50, h - 42], [0, 1], [0, cmax], col, "φ", "χ");
        const sp = [], bi = [];
        for (let k = 1; k < 200; k++) { const f = k / 200; sp.push([f, spin(f)]); if (Math.abs(f - 0.5) > 0.002) bi.push([f, binodal(f)]); }
        ctx.fillStyle = col.b; ctx.globalAlpha = 0.12; ctx.beginPath();
        sp.forEach(([f, c], k) => k ? ctx.lineTo(B.X(f), B.Y(Math.min(c, cmax))) : ctx.moveTo(B.X(f), B.Y(Math.min(c, cmax))));
        ctx.lineTo(B.X(0.995), B.Y(cmax)); ctx.lineTo(B.X(0.005), B.Y(cmax)); ctx.fill(); ctx.globalAlpha = 1;
        B.line(bi, col.ink, 1.5);
        B.line(sp, col.b, 1.5, [4, 4]);
        B.hline(chic, col.rule);
        B.dots([[p.phi, p.chi]], col.b, 5);
        ctx.fillStyle = col.muted; ctx.font = "10px monospace";
        ctx.fillText("χ_c = 2/N", B.X(0.02), B.Y(chic) - 4);
        ctx.fillText("solid: binodal, dashed: spinodal", half + 40, h - 34);
      },
      info() {
        const s = 1 / (2 * p.N) * (1 / p.phi + 1 / (1 - p.phi));
        const b = Math.abs(p.phi - 0.5) < 0.01 ? 2 / p.N : Math.log(p.phi / (1 - p.phi)) / (p.N * (2 * p.phi - 1));
        const state = p.chi > s ? "unstable: separates by spinodal decomposition" : p.chi > b ? "metastable: separates by nucleation" : "mixed";
        return `χN = ${(p.chi * p.N).toFixed(1)}   ${state}`;
      }
    };
  }
};
