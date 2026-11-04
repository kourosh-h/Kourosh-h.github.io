// Simulated annealing on a traveling salesman problem
DEMOS.anneal = {
  title: "Simulated annealing",
  text: "The goal is a short route through random cities, found by reversing pieces of the route (2-opt moves). Worse routes are sometimes accepted with the probability exp(&minus;&Delta;L/T), and T is slowly lowered. This is Metropolis Monte Carlo used as an optimizer.",
  details: "2-opt moves, geometric cooling, 300 trial moves per frame",
  make() {
    const p = { n: 60, cool: 0.995 };
    let cx, cy, tour, T, len, best, frames;
    const d = (a, b) => Math.hypot(cx[a] - cx[b], cy[a] - cy[b]);
    const total = () => tour.reduce((s, c, i) => s + d(c, tour[(i + 1) % tour.length]), 0);
    return {
      perFrame: 1,
      params: [
        { key: "n", label: "cities", min: 10, max: 150, step: 5, value: 60 },
        { key: "cool", label: "cooling factor", min: 0.98, max: 0.999, step: 0.001, value: 0.995 }
      ],
      set(k, v) { p[k] = v; if (k === "n") this.reset(); },
      reset() {
        cx = Array.from({ length: p.n }, () => rand() * 12); cy = Array.from({ length: p.n }, () => rand() * 7);
        tour = [...Array(p.n).keys()]; T = 2; len = total(); best = len; frames = 0;
      },
      step() {
        const n = tour.length;
        for (let m = 0; m < 300; m++) {
          let i = 1 + ((rand() * (n - 1)) | 0), j = 1 + ((rand() * (n - 1)) | 0);
          if (i === j) continue;
          if (i > j) [i, j] = [j, i];
          const a = tour[i - 1], b = tour[i], c = tour[j], e = tour[(j + 1) % n];
          const dL = d(a, c) + d(b, e) - d(a, b) - d(c, e);
          if (dL < 0 || rand() < Math.exp(-dL / T)) {
            for (let l = i, r = j; l < r; l++, r--) [tour[l], tour[r]] = [tour[r], tour[l]];
            len += dL;
          }
        }
        best = Math.min(best, len);
        T = Math.max(1e-3, T * p.cool); frames++;
      },
      draw(ctx, w, h, col) {
        const s = Math.min(w / 12.4, h / 7.4), ox = (w - 12 * s) / 2, oy = (h - 7 * s) / 2;
        ctx.strokeStyle = col.a; ctx.lineWidth = 1.8; ctx.beginPath();
        tour.forEach((c, i) => { const x = ox + cx[c] * s, y = oy + cy[c] * s; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
        ctx.closePath(); ctx.stroke();
        ctx.fillStyle = col.b;
        for (let c = 0; c < cx.length; c++) dot(ctx, ox + cx[c] * s, oy + cy[c] * s, 3.5);
      },
      info() { return `T = ${T.toFixed(3)}   length = ${len.toFixed(2)}   best = ${best.toFixed(2)}`; }
    };
  }
};
