// DPD of A-B di-block copolymers
DEMOS.dpd = {
  title: "Di-block copolymers in DPD",
  text: "A-B di-block chains in dissipative particle dynamics. The blocks repel each other but are bonded together, so instead of separating completely, they form stripes (lamellae) or domains. The block ratio changes the pattern. The bonds are short and stiff, so every chain keeps its length, and bonded beads just touch.",
  details: "32 chains of 8 beads, harmonic bonds K = 400 and r<sub>0</sub> = 0.5, a<sub>AA</sub> = a<sub>BB</sub> = 25, kT = 1, &rho; &asymp; 3, &gamma; = 4.5, dt = 0.03",
  make() {
    const LX = 12, LY = 7, LEN = 8, M = 32, N = LEN * M, dt = 0.03, KB = 400, R0 = 0.5;
    const p = { aAB: 60, nA: 4 };
    let sim;
    return {
      perFrame: 4,
      params: [
        { key: "aAB", label: "a_AB", min: 25, max: 80, step: 1, value: 60 },
        { key: "nA", label: "A beads per chain", min: 1, max: 7, step: 1, value: 4 }
      ],
      set(k, v) {
        p[k] = v;
        if (k === "nA") this.reset();
        else sim.aij = [[25, v], [v, 25]];
      },
      reset() {
        const x = new Float64Array(N), y = new Float64Array(N), type = new Uint8Array(N), bonds = [];
        for (let c = 0; c < M; c++) {
          // each chain starts as a random walk with steps of one bond length
          let cx = rand() * LX, cy = rand() * LY;
          for (let k = 0; k < LEN; k++) {
            const i = c * LEN + k, angle = 2 * Math.PI * rand();
            if (k) { cx = (cx + R0 * Math.cos(angle) + LX) % LX; cy = (cy + R0 * Math.sin(angle) + LY) % LY; bonds.push(i - 1, i); }
            x[i] = cx; y[i] = cy; type[i] = k < p.nA ? 0 : 1;
          }
        }
        sim = new DPD2D({ LX, LY, aij: [[25, p.aAB], [p.aAB, 25]], dt, kb: KB, r0: R0 });
        sim.load(x, y, type, null, bonds);
      },
      step() { sim.step(); },
      draw(ctx, w, h, col) {
        const s = w / LX, r = 0.5 * R0 * s;
        // the bead diameter is the bond length, so bonded beads touch and no bond lines are needed.
        // The box is periodic, so a bead near an edge is drawn again on the other side.
        for (let i = 0; i < N; i++) {
          ctx.fillStyle = sim.type[i] ? col.b : col.a;
          for (const sx of [-LX, 0, LX]) for (const sy of [-LY, 0, LY]) {
            const px = (sim.x[i] + sx) * s, py = (sim.y[i] + sy) * s;
            if (px > -r && px < w + r && py > -r && py < h + r) dot(ctx, px, py, r);
          }
        }
      },
      info() { return `t = ${sim.t.toFixed(1)}   A${p.nA}B${LEN - p.nA}   N = ${N}`; }
    };
  }
};
