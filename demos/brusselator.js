// Brusselator chemical oscillator
DEMOS.brusselator = {
  title: "A chemical clock",
  text: "The Brusselator is a model of oscillating reactions, such as the Belousov-Zhabotinsky reaction. When B is larger than 1 + A<sup>2</sup>, the steady state becomes unstable, and the concentrations settle on a limit cycle. The left plot shows the concentrations over time, and the right plot shows the same trajectory in the x-y plane.",
  details: "dx/dt = A + x<sup>2</sup>y &minus; (B + 1)x, dy/dt = Bx &minus; x<sup>2</sup>y, RK4, dt = 0.01",
  make() {
    const dt = 0.01, keep = 1500;
    const p = { A: 1, B: 3 };
    let s, hist, t;
    const f = ([x, y]) => [p.A + x * x * y - (p.B + 1) * x, p.B * x - x * x * y];
    function rk4(q) {
      const k1 = f(q), k2 = f(q.map((v, i) => v + 0.5 * dt * k1[i])), k3 = f(q.map((v, i) => v + 0.5 * dt * k2[i])), k4 = f(q.map((v, i) => v + dt * k3[i]));
      return q.map((v, i) => v + dt / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
    }
    return {
      perFrame: 4,
      params: [
        { key: "A", label: "A", min: 0.5, max: 2, step: 0.05, value: 1 },
        { key: "B", label: "B", min: 0.5, max: 5, step: 0.05, value: 3 }
      ],
      set(k, v) { p[k] = v; },
      reset() { s = [1.2, 2.5]; hist = []; t = 0; },
      step() {
        s = rk4(s).map(v => Math.min(Math.max(v, 0), 20)); t += dt;
        hist.push(s); if (hist.length > keep) hist.shift();
      },
      draw(ctx, w, h, col) {
        const split = w * 0.62, ymax = 6;
        const Y = v => h - 10 - Math.min(v, ymax) / ymax * (h - 20);
        for (const [i, c] of [[0, col.a], [1, col.b]]) {
          ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.beginPath();
          hist.forEach((q, k) => { const px = k / keep * (split - 10); k ? ctx.lineTo(px, Y(q[i])) : ctx.moveTo(px, Y(q[i])); });
          ctx.stroke();
        }
        ctx.strokeStyle = col.rule; ctx.beginPath(); ctx.moveTo(split + 0.5, 6); ctx.lineTo(split + 0.5, h - 6); ctx.stroke();
        const pw = w - split - 20, px = v => split + 10 + Math.min(v, 4) / 4 * pw, py = v => h - 10 - Math.min(v, ymax) / ymax * (h - 20);
        ctx.strokeStyle = col.ink; ctx.lineWidth = 1.2; ctx.beginPath();
        hist.forEach((q, k) => k ? ctx.lineTo(px(q[0]), py(q[1])) : ctx.moveTo(px(q[0]), py(q[1])));
        ctx.stroke();
        ctx.fillStyle = col.b; dot(ctx, px(s[0]), py(s[1]), 4);
        ctx.fillStyle = col.muted; ctx.font = "10px monospace";
        ctx.fillText("x", 8, 14); ctx.fillStyle = col.a; ctx.fillRect(20, 8, 10, 3); ctx.fillStyle = col.muted;
        ctx.fillText("y", 38, 14); ctx.fillStyle = col.b; ctx.fillRect(50, 8, 10, 3);
      },
      info() { return `x = ${s[0].toFixed(2)}   y = ${s[1].toFixed(2)}   ${p.B > 1 + p.A * p.A ? "oscillating" : "steady state"}`; }
    };
  }
};
