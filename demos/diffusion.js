// Sampling like a diffusion model
DEMOS.diffusion = {
  title: "How a diffusion model samples",
  text: "The sampler starts from pure noise and steps backward through decreasing noise levels, following the score (the gradient of the log probability). The points end up on the target shape. Here, the score is known exactly, while a real diffusion model learns it with a neural network.",
  details: "variance-exploding reverse SDE, Euler-Maruyama, &sigma; from 4 down to 0.01, target = ring of Gaussians with width 0.08",
  make() {
    const N = 600, sig0 = 0.08;
    const p = { modes: 8, steps: 200 };
    let x, y, level, hold, centers, sigmas;
    function setup() {
      centers = Array.from({ length: p.modes }, (_, k) => [Math.cos(2 * Math.PI * k / p.modes), Math.sin(2 * Math.PI * k / p.modes)]);
      sigmas = Array.from({ length: p.steps + 1 }, (_, i) => 4 * (0.01 / 4) ** (i / p.steps));
      x = new Float64Array(N).map(() => 4 * gauss()); y = new Float64Array(N).map(() => 4 * gauss());
      level = 0; hold = 0;
    }
    function score(px, py, s) {
      const v = sig0 * sig0 + s * s;
      let wsum = 0, gx = 0, gy = 0, lmax = -Infinity;
      const logs = centers.map(([cx, cy]) => -((px - cx) ** 2 + (py - cy) ** 2) / (2 * v));
      for (const l of logs) lmax = Math.max(lmax, l);
      centers.forEach(([cx, cy], k) => { const wk = Math.exp(logs[k] - lmax); wsum += wk; gx += wk * (cx - px); gy += wk * (cy - py); });
      return [gx / (wsum * v), gy / (wsum * v)];
    }
    return {
      perFrame: 1,
      params: [
        { key: "modes", label: "target modes", min: 2, max: 12, step: 1, value: 8 },
        { key: "steps", label: "noise levels", min: 10, max: 400, step: 10, value: 200 }
      ],
      set(k, v) { p[k] = v; setup(); },
      reset() { setup(); },
      step() {
        if (level >= p.steps) { if (++hold > 90) setup(); return; }
        const s = sigmas[level], s2 = sigmas[level + 1], ds2 = s * s - s2 * s2;
        for (let i = 0; i < N; i++) {
          const [gx, gy] = score(x[i], y[i], s);
          x[i] += ds2 * gx + Math.sqrt(ds2) * gauss();
          y[i] += ds2 * gy + Math.sqrt(ds2) * gauss();
        }
        level++;
      },
      draw(ctx, w, h, col) {
        const s = h * 0.32, ox = w / 2, oy = h / 2;
        ctx.strokeStyle = col.rule; ctx.beginPath(); ctx.arc(ox, oy, s, 0, 2 * Math.PI); ctx.stroke();
        ctx.fillStyle = col.a;
        for (let i = 0; i < N; i++) dot(ctx, ox + x[i] * s, oy - y[i] * s, 2);
      },
      info() { return `noise level ${level} / ${p.steps}   σ = ${sigmas[Math.min(level, p.steps)].toFixed(3)}`; }
    };
  }
};
