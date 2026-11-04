// Toy example: finding a good recipe with and without a simulation pre-screen
DEMOS.screen = {
  title: "Simulate first, then test",
  text: "A toy design space with two recipe variables. The left map shows recipes tested in the lab at random. The right map shows a cheap and imperfect simulation run over the whole space first, after which the most promising recipes are tested in the lab in order. The curve shows the best result found against the number of lab tests.",
  details: "a toy landscape, not real data, where the simulation is the true performance plus a smooth systematic error and noise, both set by the accuracy slider",
  make() {
    const G = 24;
    const p = { acc: 0.7 };
    let truth, sim, randOrder, simOrder, n, seed;
    const f = (a, b) => 0.9 * Math.exp(-((a - 0.68) ** 2 + (b - 0.35) ** 2) / 0.02) + 0.55 * Math.exp(-((a - 0.25) ** 2 + (b - 0.7) ** 2) / 0.04) + 0.15 * Math.sin(5 * a) * Math.cos(4 * b);
    const best = (order) => { let m = -Infinity; const out = []; for (let k = 0; k < order.length; k++) { m = Math.max(m, truth[order[k]]); out.push(m); } return out; };
    return {
      perFrame: 1,
      params: [{ key: "acc", label: "simulation accuracy", min: 0, max: 1, step: 0.05, value: 0.7 }],
      set(k, v) { p[k] = v; this.reset(true); },
      reset(keep) {
        if (!keep) seed = rand() * 10;
        truth = new Float64Array(G * G); sim = new Float64Array(G * G);
        const err = 1 - p.acc;
        for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) {
          const a = (i + 0.5) / G, b = (j + 0.5) / G, k = j * G + i;
          truth[k] = f(a, b);
          sim[k] = truth[k] + err * (0.5 * Math.sin(7 * a + seed) * Math.cos(6 * b - seed) + 0.25 * gauss());
        }
        randOrder = [...truth.keys()].sort(() => rand() - 0.5);
        simOrder = [...sim.keys()].sort((x, y) => sim[y] - sim[x]);
        n = 0;
      },
      step() { if (n < 40 && (this.tick = (this.tick || 0) + 1) % 12 === 0) n++; },
      draw(ctx, w, h, col) {
        const size = Math.min(w * 0.28, h - 60), cell = size / G;
        const [ar, ag, ab] = hexToRgb(col.a), [br, bg, bb] = hexToRgb(col.b);
        const map = (ox, vals, tests, label) => {
          for (let k = 0; k < G * G; k++) {
            const v = Math.max(0, Math.min(1, vals ? vals[k] : 0));
            ctx.fillStyle = vals ? `rgba(${ar},${ag},${ab},${0.08 + 0.8 * v})` : col.paper;
            ctx.fillRect(ox + (k % G) * cell, 20 + Math.floor(k / G) * cell, cell + 0.5, cell + 0.5);
          }
          ctx.strokeStyle = col.rule; ctx.strokeRect(ox, 20, size, size);
          ctx.fillStyle = `rgb(${br},${bg},${bb})`;
          for (const k of tests) dot(ctx, ox + (k % G + 0.5) * cell, 20 + (Math.floor(k / G) + 0.5) * cell, Math.max(2.5, cell * 0.35));
          ctx.fillStyle = col.muted; ctx.font = "10px monospace"; ctx.fillText(label, ox, 12);
        };
        map(4, null, randOrder.slice(0, n), "lab only, random");
        map(size + 18, sim, simOrder.slice(0, n), "simulation map + lab");
        const px = 2 * size + 60;
        const top = Math.max(...truth);
        const P = plotBox(ctx, [px, 20, w - px - 12, h - 56], [0, 40], [0, top * 1.05], col, "lab tests", "best found");
        P.hline(top, col.rule);
        P.line(best(randOrder.slice(0, Math.max(n, 1))).map((v, k) => [k + 1, v]), col.muted, 2);
        P.line(best(simOrder.slice(0, Math.max(n, 1))).map((v, k) => [k + 1, v]), col.b, 2.5);
      },
      info() {
        const top = Math.max(...truth), need = o => { const b = best(o); const k = b.findIndex(v => v >= 0.95 * top); return k < 0 ? "> " + b.length : k + 1; };
        return `lab tests to reach 95% of the best recipe: random ${need(randOrder.slice(0, 200))}, simulation-guided ${need(simOrder.slice(0, 200))}`;
      }
    };
  }
};
