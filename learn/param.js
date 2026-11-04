// Learn: force field parameterization

DEMOS["pa-bond"] = {
  title: "Fitting a bond from a QM scan",
  text: "",
  details: "scan points from a Morse curve for a Si-C like bond (r<sub>0</sub> = 1.87 &Aring;) plus small noise, fit V = K(r &minus; r<sub>0</sub>)<sup>2</sup> + c to the points inside the window",
  make() {
    const De = 88, a = 1.25, r0 = 1.87;
    const morse = r => De * (1 - Math.exp(-a * (r - r0))) ** 2;
    const p = { win: 0.12 };
    let rs, es, K, rFit, c;
    function fit() {
      const sel = rs.map((r, i) => [r, es[i]]).filter(([r]) => Math.abs(r - r0) <= p.win + 1e-9);
      const co = leastSquares(sel.map(q => q[0]), sel.map(q => q[1]), [() => 1, r => r, r => r * r], 1e-9);
      K = co[2]; rFit = -co[1] / (2 * co[2]); c = co[0] - K * rFit * rFit;
      this_sel = sel.length;
    }
    let this_sel = 0;
    return {
      perFrame: 1,
      params: [{ key: "win", label: "fit window ± (Å)", min: 0.03, max: 0.4, step: 0.01, value: 0.12 }],
      set(k, v) { p[k] = v; fit(); },
      reset() { rs = []; es = []; for (let r = 1.55; r <= 2.31; r += 0.03) { rs.push(r); es.push(morse(r) + 0.15 * gauss()); } fit(); },
      step() {},
      draw(ctx, w, h, col) {
        const P = plotBox(ctx, [40, 14, w - 56, h - 42], [1.55, 2.3], [-2, 40], col, "r (Å)", "E (kcal/mol)");
        ctx.fillStyle = col.paper; ctx.globalAlpha = 0.6; ctx.fillRect(P.X(r0 - p.win), 14, P.X(r0 + p.win) - P.X(r0 - p.win), h - 42); ctx.globalAlpha = 1;
        ctx.strokeStyle = col.rule; ctx.strokeRect(P.X(r0 - p.win), 14, P.X(r0 + p.win) - P.X(r0 - p.win), h - 42);
        const fitc = []; for (let k = 0; k <= 150; k++) { const r = 1.55 + 0.75 * k / 150; fitc.push([r, K * (r - rFit) ** 2 + c]); }
        P.line(fitc, col.a, 2.5);
        P.dots(rs.map((r, i) => [r, es[i]]), col.b, 3.5);
      },
      info() { return `K = ${K.toFixed(0)} kcal/mol/Å²   r0 = ${rFit.toFixed(3)} Å   from ${this_sel} points`; }
    };
  }
};

DEMOS["pa-torsion"] = {
  title: "Fitting a torsion profile",
  text: "",
  details: "scan every 10&deg;, fit E(&phi;) = c + &Sigma;<sub>n</sub> K<sub>n</sub>[1 + cos(n&phi; &minus; &delta;<sub>n</sub>)] by least squares on cos(n&phi;) and sin(n&phi;)",
  make() {
    const p = { M: 3 };
    let ph, es, co;
    const ref = f => 1.2 * (1 + Math.cos(f)) + 0.5 * (1 + Math.cos(2 * f - Math.PI)) + 0.8 * (1 + Math.cos(3 * f));
    function basis() {
      const b = [() => 1];
      for (let n = 1; n <= p.M; n++) { b.push(f => Math.cos(n * f)); b.push(f => Math.sin(n * f)); }
      return b;
    }
    const model = f => basis().reduce((s, fn, k) => s + co[k] * fn(f), 0);
    return {
      perFrame: 1,
      params: [{ key: "M", label: "number of terms n", min: 1, max: 6, step: 1, value: 3 }],
      set(k, v) { p[k] = v; co = leastSquares(ph, es, basis(), 1e-9); },
      reset() {
        ph = []; es = [];
        for (let d = -180; d <= 180; d += 10) { const f = d * Math.PI / 180; ph.push(f); es.push(ref(f) + 0.08 * gauss()); }
        co = leastSquares(ph, es, basis(), 1e-9);
      },
      step() {},
      draw(ctx, w, h, col) {
        const P = plotBox(ctx, [40, 14, w - 56, h - 42], [-Math.PI, Math.PI], [-0.5, 6], col, "φ", "E (kcal/mol)");
        const c = []; for (let k = 0; k <= 200; k++) { const f = -Math.PI + 2 * Math.PI * k / 200; c.push([f, model(f)]); }
        P.line(c, col.a, 2.5);
        P.dots(ph.map((f, i) => [f, es[i]]), col.b, 3.5);
        ctx.fillStyle = col.muted; ctx.font = "10px monospace";
        for (let n = 1; n <= p.M; n++) {
          const A = co[2 * n - 1], B = co[2 * n], K = Math.hypot(A, B), dl = Math.atan2(-B, -A) * 180 / Math.PI + 180;
          ctx.fillText(`n=${n}  K=${K.toFixed(2)}  δ=${dl.toFixed(0)}°`, w - 190, 26 + 14 * n);
        }
      },
      info() { let e = 0; ph.forEach((f, i) => { e += (model(f) - es[i]) ** 2; }); return `RMS residual = ${Math.sqrt(e / ph.length).toFixed(3)} kcal/mol`; }
    };
  }
};

DEMOS["pa-lj"] = {
  title: "Combining rules for unlike atoms",
  text: "",
  details: "Lorentz-Berthelot: &sigma;<sub>AB</sub> = (&sigma;<sub>A</sub> + &sigma;<sub>B</sub>)/2, &epsilon;<sub>AB</sub> = &radic;(&epsilon;<sub>A</sub>&epsilon;<sub>B</sub>). Geometric: both as geometric means",
  make() {
    const p = { sA: 3.4, eA: 0.24, sB: 2.6, eB: 0.07, rule: 0 };
    const lj = (r, s, e) => 4 * e * ((s / r) ** 12 - (s / r) ** 6);
    return {
      perFrame: 1,
      params: [
        { key: "sA", label: "σ_A (Å)", min: 2, max: 4.5, step: 0.05, value: 3.4 },
        { key: "eA", label: "ε_A (kcal/mol)", min: 0.02, max: 0.4, step: 0.01, value: 0.24 },
        { key: "sB", label: "σ_B (Å)", min: 2, max: 4.5, step: 0.05, value: 2.6 },
        { key: "eB", label: "ε_B (kcal/mol)", min: 0.02, max: 0.4, step: 0.01, value: 0.07 },
        { key: "rule", label: "0 Lorentz-Berthelot, 1 geometric", min: 0, max: 1, step: 1, value: 0 }
      ],
      set(k, v) { p[k] = v; },
      reset() {}, step() {},
      draw(ctx, w, h, col) {
        const sAB = p.rule ? Math.sqrt(p.sA * p.sB) : (p.sA + p.sB) / 2, eAB = Math.sqrt(p.eA * p.eB);
        this.ab = [sAB, eAB];
        const P = plotBox(ctx, [44, 14, w - 60, h - 42], [1.8, 8], [-0.45, 0.5], col, "r (Å)", "U (kcal/mol)");
        P.hline(0, col.rule);
        for (const [s, e, c, d] of [[p.sA, p.eA, col.a, []], [p.sB, p.eB, col.b, []], [sAB, eAB, col.ink, [5, 3]]]) {
          const pts = []; for (let k = 0; k <= 300; k++) { const r = 1.8 + 6.2 * k / 300; pts.push([r, lj(r, s, e)]); }
          P.line(pts, c, 2.2, d);
        }
        ctx.font = "10px monospace";
        ctx.fillStyle = col.a; ctx.fillText("A-A", w - 70, 30); ctx.fillStyle = col.b; ctx.fillText("B-B", w - 70, 44); ctx.fillStyle = col.ink; ctx.fillText("A-B", w - 70, 58);
      },
      info() { const [s, e] = this.ab || [0, 0]; return `σ_AB = ${s.toFixed(2)} Å   ε_AB = ${e.toFixed(3)} kcal/mol`; }
    };
  }
};
