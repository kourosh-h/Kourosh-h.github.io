// Langevin walkers on Muller-Brown
DEMOS.mb = {
  title: "Rare events on the Muller-Brown surface",
  text: "Overdamped Langevin walkers on a classic 2D test potential. They start in the deepest basin, and you can watch them hop over the barriers. Diffusion models generate samples with a learned version of the same equation.",
  details: "200 walkers, dx = &minus;&nabla;V dt + &radic;(2kT dt) &xi;, dt = 10<sup>&minus;4</sup>",
  make() {
    const N = 200, dt = 1e-4;
    const p = { kT: 12 };
    let x, y, t;
    return {
      perFrame: 10,
      params: [{ key: "kT", label: "kT", min: 3, max: 30, step: 0.5, value: 12 }],
      set(k, v) { p[k] = v; },
      reset() {
        x = new Float64Array(N).fill(-0.558); y = new Float64Array(N).fill(1.442); t = 0;
      },
      step() {
        const s = Math.sqrt(2 * p.kT * dt);
        for (let i = 0; i < N; i++) {
          const [gx, gy] = MB.grad(x[i], y[i]);
          x[i] += -gx * dt + s * gauss(); y[i] += -gy * dt + s * gauss();
          x[i] = Math.min(MB.xmax, Math.max(MB.xmin, x[i])); y[i] = Math.min(MB.ymax, Math.max(MB.ymin, y[i]));
        }
        t += dt;
      },
      draw(ctx, w, h, col) {
        MB.drawContours(ctx, w, h, col);
        ctx.fillStyle = col.b;
        for (let i = 0; i < N; i++) { const [sx, sy] = MB.toScreen(x[i], y[i], w, h); dot(ctx, sx, sy, 2.4); }
      },
      info() {
        let A = 0, B = 0, C = 0;
        for (let i = 0; i < N; i++) {
          if (y[i] > 1.0) A++; else if (x[i] > 0.3 && y[i] < 0.3) C++; else B++;
        }
        return `t = ${t.toFixed(3)}   basins: ${A} / ${B} / ${C}`;
      }
    };
  }
};
