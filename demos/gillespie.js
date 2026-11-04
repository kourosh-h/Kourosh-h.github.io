// Stochastic kinetics with the Gillespie algorithm
DEMOS.gillespie = {
  title: "Noise in small reaction volumes",
  text: "The reaction A &rlarr; B, simulated molecule by molecule with the Gillespie algorithm, with five runs at once, against the smooth answer of the rate equation. With few molecules, the runs are noisy, and with many, they follow the curve.",
  details: "k<sub>f</sub> = 1, k<sub>b</sub> = 0.5, all molecules start as A, noise scales as 1/&radic;N",
  make() {
    const kf = 1, kb = 0.5, tmax = 6, R = 5;
    const p = { N: 50 };
    let runs, t, hold;
    const ode = s => (kb + kf * Math.exp(-(kf + kb) * s)) / (kf + kb);
    return {
      perFrame: 1,
      params: [{ key: "N", label: "molecules N", min: 5, max: 2000, step: 5, value: 50 }],
      set(k, v) { p[k] = v; this.reset(); },
      reset() { runs = Array.from({ length: R }, () => ({ a: p.N, t: 0, path: [[0, 1]] })); t = 0; hold = 0; },
      step() {
        if (t >= tmax) { if (++hold > 80) this.reset(); return; }
        t += 0.03;
        for (const r of runs) {
          while (r.t < t) {
            const rf = kf * r.a, rb = kb * (p.N - r.a), tot = rf + rb;
            r.t += -Math.log(rand() + 1e-12) / tot;
            if (rand() * tot < rf) r.a--; else r.a++;
            r.path.push([r.t, r.a / p.N]);
          }
        }
      },
      draw(ctx, w, h, col) {
        const X = s => 30 + s / tmax * (w - 40), Y = f => 12 + (1 - f) * (h - 40);
        ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(30, 12); ctx.lineTo(30, Y(0)); ctx.lineTo(w - 10, Y(0)); ctx.stroke();
        ctx.fillStyle = col.muted; ctx.font = "10px monospace";
        ctx.fillText("1", 18, Y(1) + 4); ctx.fillText("0", 18, Y(0) + 4); ctx.fillText("fraction A", 36, 22); ctx.fillText("time", w - 40, h - 10);
        ctx.lineWidth = 1.4; ctx.strokeStyle = col.a; ctx.globalAlpha = 0.7;
        for (const r of runs) {
          ctx.beginPath();
          let last = 1;
          r.path.forEach(([s, f], i) => { if (s > t) return; const px = X(s); i ? (ctx.lineTo(px, Y(last)), ctx.lineTo(px, Y(f))) : ctx.moveTo(px, Y(f)); last = f; });
          ctx.lineTo(X(Math.min(t, tmax)), Y(last));
          ctx.stroke();
        }
        ctx.globalAlpha = 1; ctx.strokeStyle = col.b; ctx.lineWidth = 2.5; ctx.beginPath();
        for (let k = 0; k <= 200; k++) { const s = k / 200 * Math.min(t, tmax); k ? ctx.lineTo(X(s), Y(ode(s))) : ctx.moveTo(X(s), Y(ode(s))); }
        ctx.stroke();
      },
      info() { return `t = ${Math.min(t, tmax).toFixed(2)}   N = ${p.N}   equilibrium A = ${(kb / (kf + kb)).toFixed(2)}`; }
    };
  }
};
