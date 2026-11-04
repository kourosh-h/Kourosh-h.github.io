// Optimizers on a potential energy surface
DEMOS.gd = {
  title: "Optimizers on an energy surface",
  text: "Plain gradient descent, momentum, and Adam, started from the same point on the Muller-Brown surface.",
  hint: "Click anywhere on the surface to start all three optimizers from there.",
  details: "gradient descent in gray, momentum (&beta; = 0.9) in blue, and Adam in orange, 600 steps each",
  make() {
    const p = { eta: 1 };
    let start = [-0.2, 1.0], runs, n;
    function init() {
      runs = ["gd", "mom", "adam"].map(kind => ({ kind, x: start[0], y: start[1], vx: 0, vy: 0, mx: 0, my: 0, sx: 0, sy: 0, path: [[...start]] }));
      n = 0;
    }
    return {
      perFrame: 2,
      params: [{ key: "eta", label: "step size", min: 0.2, max: 3, step: 0.1, value: 1 }],
      set(k, v) { p[k] = v; init(); },
      reset() { init(); },
      click(px, py, w, h) { start = MB.fromScreen(px, py, w, h); init(); },
      step() {
        if (n >= 600) return;
        for (const r of runs) {
          const [gx, gy] = MB.grad(r.x, r.y);
          if (r.kind === "gd") { r.x -= 2e-4 * p.eta * gx; r.y -= 2e-4 * p.eta * gy; }
          if (r.kind === "mom") {
            r.vx = 0.9 * r.vx - 2e-4 * p.eta * gx; r.vy = 0.9 * r.vy - 2e-4 * p.eta * gy;
            r.x += r.vx; r.y += r.vy;
          }
          if (r.kind === "adam") {
            const t = n + 1;
            r.mx = 0.9 * r.mx + 0.1 * gx; r.my = 0.9 * r.my + 0.1 * gy;
            r.sx = 0.999 * r.sx + 0.001 * gx * gx; r.sy = 0.999 * r.sy + 0.001 * gy * gy;
            const c1 = 1 - 0.9 ** t, c2 = 1 - 0.999 ** t;
            r.x -= 0.01 * p.eta * (r.mx / c1) / (Math.sqrt(r.sx / c2) + 1e-8);
            r.y -= 0.01 * p.eta * (r.my / c1) / (Math.sqrt(r.sy / c2) + 1e-8);
          }
          r.x = Math.min(MB.xmax, Math.max(MB.xmin, r.x)); r.y = Math.min(MB.ymax, Math.max(MB.ymin, r.y));
          r.path.push([r.x, r.y]);
        }
        n++;
      },
      draw(ctx, w, h, col) {
        MB.drawContours(ctx, w, h, col);
        const colors = { gd: col.muted, mom: col.a, adam: col.b };
        ctx.lineWidth = 2;
        for (const r of runs) {
          ctx.strokeStyle = colors[r.kind];
          ctx.beginPath();
          r.path.forEach(([x, y], i) => { const [sx, sy] = MB.toScreen(x, y, w, h); i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); });
          ctx.stroke();
          ctx.fillStyle = colors[r.kind];
          const [sx, sy] = MB.toScreen(r.x, r.y, w, h); dot(ctx, sx, sy, 4);
        }
        ctx.fillStyle = col.ink;
        const [sx, sy] = MB.toScreen(start[0], start[1], w, h);
        ctx.fillRect(sx - 3, sy - 3, 6, 6);
      },
      info() {
        return `step ${n}   V: ` + runs.map(r => MB.V(r.x, r.y).toFixed(0)).join(" / ");
      }
    };
  }
};
