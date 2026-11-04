// Bayesian A/B test
DEMOS.abtest = {
  title: "A Bayesian A/B test",
  text: "Visitors arrive and are split between two versions. The conversion rate of each version gets a Beta posterior, which narrows as the data comes in. The probability that B beats A is estimated by sampling from both posteriors.",
  details: "Beta(1, 1) priors, 20 visitors per frame, 4000 posterior samples, stops at 20 000 visitors",
  make() {
    const p = { pa: 5, pb: 6 };
    let sa, na, sb, nb, probB;
    function gammaSample(k) {
      if (k < 1) return gammaSample(k + 1) * rand() ** (1 / k);
      const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
      for (;;) {
        let z, v;
        do { z = gauss(); v = 1 + c * z; } while (v <= 0);
        v = v * v * v;
        const u = rand();
        if (Math.log(u) < 0.5 * z * z + d - d * v + d * Math.log(v)) return d * v;
      }
    }
    const betaSample = (a, b) => { const x = gammaSample(a); return x / (x + gammaSample(b)); };
    function updateProb() {
      let wins = 0;
      for (let k = 0; k < 4000; k++) if (betaSample(1 + sb, 1 + nb - sb) > betaSample(1 + sa, 1 + na - sa)) wins++;
      probB = wins / 4000;
    }
    return {
      perFrame: 1,
      params: [
        { key: "pa", label: "true rate A (%)", min: 1, max: 20, step: 0.5, value: 5 },
        { key: "pb", label: "true rate B (%)", min: 1, max: 20, step: 0.5, value: 6 }
      ],
      set(k, v) { p[k] = v; this.reset(); },
      reset() { sa = na = sb = nb = 0; probB = 0.5; },
      step() {
        if (na + nb >= 20000) return;
        for (let k = 0; k < 10; k++) {
          na++; if (rand() < p.pa / 100) sa++;
          nb++; if (rand() < p.pb / 100) sb++;
        }
        if ((na + nb) % 200 === 0) updateProb();
      },
      draw(ctx, w, h, col) {
        const xmax = Math.max(p.pa, p.pb) / 100 * 2.2, G = 300;
        const curve = (s, n) => {
          const a = 1 + s, b = 1 + n - s, ys = [];
          for (let g = 1; g < G; g++) { const q = g / G * xmax; ys.push((a - 1) * Math.log(q) + (b - 1) * Math.log(1 - q)); }
          const m = Math.max(...ys); const e = ys.map(v => Math.exp(v - m)); const tot = e.reduce((s2, v) => s2 + v, 0);
          return e.map(v => v / tot);
        };
        const ca = curve(sa, na), cb = curve(sb, nb), top = Math.max(...ca, ...cb);
        const base = h - 46;
        for (const [c, color] of [[ca, col.a], [cb, col.b]]) {
          ctx.fillStyle = color; ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.moveTo(0, base);
          c.forEach((v, g) => ctx.lineTo((g + 1) / G * w, base - v / top * (base - 20)));
          ctx.lineTo(w, base); ctx.fill(); ctx.globalAlpha = 1;
          ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath();
          c.forEach((v, g) => { const px = (g + 1) / G * w, py = base - v / top * (base - 20); g ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
          ctx.stroke();
        }
        ctx.strokeStyle = col.rule; ctx.beginPath(); ctx.moveTo(0, base + 0.5); ctx.lineTo(w, base + 0.5); ctx.stroke();
        ctx.fillStyle = col.muted; ctx.font = "10px monospace";
        for (let k = 0; k <= 4; k++) { const q = k / 4 * xmax; ctx.fillText(`${(q * 100).toFixed(1)}%`, k / 4 * (w - 36) + 2, base + 14); }
        ctx.fillStyle = col.a; ctx.fillText("A", 8, 14); ctx.fillStyle = col.b; ctx.fillText("B", 22, 14);
      },
      info() { return `visitors ${na + nb}   A ${sa}/${na}   B ${sb}/${nb}   P(B > A) = ${probB.toFixed(2)}`; }
    };
  }
};
