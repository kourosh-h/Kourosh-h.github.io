// Titration of a weak acid
DEMOS.titration = {
  title: "Titrating a weak acid",
  text: "NaOH is added to 25 mL of a weak acid, and the pH is found by solving the charge balance exactly. Halfway to the equivalence point, pH = pK<sub>a</sub>, which is how pK<sub>a</sub> values are measured.",
  details: "charge balance [H<sup>+</sup>] + [Na<sup>+</sup>] = [OH<sup>&minus;</sup>] + [A<sup>&minus;</sup>], solved by bisection, K<sub>w</sub> = 10<sup>&minus;14</sup>, 0.1 M NaOH",
  make() {
    const Va = 25, Cb = 0.1, Vmax = 50;
    const p = { pKa: 4.76, Ca: 0.1 };
    let V, curve;
    function pH(vb) {
      const Ka = 10 ** -p.pKa, Vt = Va + vb, Ct = p.Ca * Va / Vt, Na = Cb * vb / Vt;
      let lo = 0, hi = 14;
      for (let k = 0; k < 60; k++) {
        const mid = (lo + hi) / 2, H = 10 ** -mid;
        const bal = H + Na - 1e-14 / H - Ct * Ka / (Ka + H);
        if (bal > 0) lo = mid; else hi = mid;
      }
      return (lo + hi) / 2;
    }
    return {
      perFrame: 1,
      params: [
        { key: "pKa", label: "pKa", min: 2, max: 10, step: 0.05, value: 4.76 },
        { key: "Ca", label: "acid conc. (M)", min: 0.02, max: 0.15, step: 0.005, value: 0.1 }
      ],
      set(k, v) { p[k] = v; this.reset(); },
      reset() { V = 0; curve = []; },
      step() { if (V < Vmax) { V = Math.min(Vmax, V + 0.12); curve.push([V, pH(V)]); } },
      draw(ctx, w, h, col) {
        const X = v => 30 + v / Vmax * (w - 40), Y = q => 10 + (1 - q / 14) * (h - 36);
        const Veq = p.Ca * Va / Cb;
        ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(30, 10); ctx.lineTo(30, Y(0)); ctx.lineTo(w - 10, Y(0)); ctx.stroke();
        ctx.setLineDash([3, 4]);
        ctx.beginPath(); ctx.moveTo(X(Veq), 10); ctx.lineTo(X(Veq), Y(0)); ctx.moveTo(30, Y(p.pKa)); ctx.lineTo(X(Veq / 2), Y(p.pKa)); ctx.lineTo(X(Veq / 2), Y(0)); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = col.muted; ctx.font = "10px monospace";
        for (const q of [0, 7, 14]) ctx.fillText(String(q), 12, Y(q) + 4);
        ctx.fillText("pH", 36, 20); ctx.fillText("mL NaOH", w - 60, h - 8);
        if (Veq <= Vmax) ctx.fillText("equivalence", X(Veq) + 4, Y(1));
        ctx.fillText("pH = pKa", 36, Y(p.pKa) - 4);
        ctx.strokeStyle = col.a; ctx.lineWidth = 2.5; ctx.beginPath();
        curve.forEach(([v, q], i) => i ? ctx.lineTo(X(v), Y(q)) : ctx.moveTo(X(v), Y(q)));
        ctx.stroke();
        if (curve.length) { const [v, q] = curve[curve.length - 1]; ctx.fillStyle = col.b; dot(ctx, X(v), Y(q), 4.5); }
      },
      info() { return curve.length ? `added ${V.toFixed(1)} mL   pH ${curve[curve.length - 1][1].toFixed(2)}` : "ready"; }
    };
  }
};
