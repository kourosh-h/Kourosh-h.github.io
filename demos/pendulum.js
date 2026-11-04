// Double pendulum and chaos
DEMOS.pendulum = {
  title: "Chaos in a double pendulum",
  text: "Two double pendulums that start almost identically, differing by a tiny angle. For small swings, they stay together. For large swings, the difference grows exponentially, and they soon move in completely different ways.",
  details: "equal masses and lengths, g = 9.81, RK4 with dt = 0.002",
  make() {
    const g = 9.81, dt = 0.002;
    const p = { angle: 120, gap: -3 };
    let A, B, t, trailA, trailB;
    function deriv([a1, a2, w1, w2]) {
      const d = a1 - a2, den = 3 - Math.cos(2 * d);
      const dw1 = (-3 * g * Math.sin(a1) - g * Math.sin(a1 - 2 * a2) - 2 * Math.sin(d) * (w2 * w2 + w1 * w1 * Math.cos(d))) / den;
      const dw2 = (2 * Math.sin(d) * (2 * w1 * w1 + 2 * g * Math.cos(a1) + w2 * w2 * Math.cos(d))) / den;
      return [w1, w2, dw1, dw2];
    }
    function rk4(s) {
      const k1 = deriv(s), k2 = deriv(s.map((v, i) => v + 0.5 * dt * k1[i]));
      const k3 = deriv(s.map((v, i) => v + 0.5 * dt * k2[i])), k4 = deriv(s.map((v, i) => v + dt * k3[i]));
      return s.map((v, i) => v + dt / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
    }
    const tip = s => [Math.sin(s[0]) + Math.sin(s[1]), Math.cos(s[0]) + Math.cos(s[1])];
    return {
      perFrame: 8,
      params: [
        { key: "angle", label: "start angle (deg)", min: 10, max: 175, step: 1, value: 120 },
        { key: "gap", label: "difference (log10 rad)", min: -8, max: -1, step: 1, value: -3 }
      ],
      set(k, v) { p[k] = v; this.reset(); },
      reset() {
        const a = p.angle * Math.PI / 180;
        A = [a, a, 0, 0]; B = [a + 10 ** p.gap, a, 0, 0]; t = 0; trailA = []; trailB = [];
      },
      step() {
        A = rk4(A); B = rk4(B); t += dt;
        if (Math.round(t / dt) % 4 === 0) {
          trailA.push(tip(A)); trailB.push(tip(B));
          if (trailA.length > 400) { trailA.shift(); trailB.shift(); }
        }
      },
      draw(ctx, w, h, col) {
        const s = h * 0.23, ox = w / 2, oy = h / 2;
        const P = ([px, py]) => [ox + px * s, oy + py * s];
        for (const [st, trail, c] of [[A, trailA, col.a], [B, trailB, col.b]]) {
          ctx.strokeStyle = c; ctx.globalAlpha = 0.35; ctx.lineWidth = 1.5;
          ctx.beginPath(); trail.forEach((q, i) => { const [sx, sy] = P(q); i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); }); ctx.stroke();
          ctx.globalAlpha = 1; ctx.lineWidth = 2.5;
          const m1 = [Math.sin(st[0]), Math.cos(st[0])], m2 = tip(st);
          const [x1, y1] = P(m1), [x2, y2] = P(m2);
          ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          ctx.fillStyle = c; dot(ctx, x1, y1, 6); dot(ctx, x2, y2, 6);
        }
        ctx.fillStyle = col.ink; dot(ctx, ox, oy, 3);
      },
      info() {
        const d = Math.hypot(A[0] - B[0], A[1] - B[1]);
        return `t = ${t.toFixed(1)} s   difference = ${d.toExponential(1)} rad`;
      }
    };
  }
};
