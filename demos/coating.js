// Block copolymer coating forming on a substrate as the water dries
DEMOS.coating = {
  title: "A coating that assembles itself",
  text: "Di-block copolymers in water above a hydrophilic substrate, simulated in 2D with standard DPD, the model of Groot and Warren, which has soft repulsions between beads and uses friction and random forces to keep the temperature. Each chain has a hydrophilic block (blue) and a hydrophobic block (orange). Evaporation is kept simple. Now and then, the highest water bead is taken out, and the top of the box moves down, so the density stays the same. There is no vapor phase, so no many-body DPD is needed. The hydrophilic blocks stick to the substrate, and the hydrophobic blocks gather above them, so a layered film forms on its own. The bonds are short and stiff, so every chain keeps its length, and bonded beads just touch.",
  details: "standard DPD (Groot and Warren 1997) in 2D, conservative force a<sub>ij</sub>(1 &minus; r), &gamma; = 4.5, cutoff 1, modified velocity Verlet with &lambda; = 0.5; one water bead leaves every 150/rate steps; 18 chains of 8 beads, bonds K = 400 and r<sub>0</sub> = 0.5, a<sub>PS</sub> = 10, a<sub>WS</sub> = 30, a<sub>HS</sub> = 70, a<sub>HW</sub> = 70, a<sub>PH</sub> = 50, other pairs 25 (P hydrophilic, H hydrophobic, W water, S substrate), kT = 1, &rho; = 3, dt = 0.03",
  make() {
    const LX = 17, LY = 10, H0 = 1, LEN = 8, M = 18, dt = 0.03, KB = 400, R0 = 0.5;
    // types: 0 = hydrophilic bead, 1 = hydrophobic bead, 2 = water, 3 = substrate
    const A = [[25, 50, 25, 10], [50, 25, 70, 70], [25, 70, 25, 30], [10, 70, 30, 25]];
    const p = { rate: 3, nH: 4 };
    let sim, nChain, nSub, removed;
    // the top of the box pushes all beads in the same way, so no block prefers it
    const topWall = d => {
      for (let i = 0; i < d.n; i++) {
        const g = d.yhi - d.y[i];
        if (g < 1 && !d.frozen[i]) d.fy[i] -= 25 * (1 - Math.max(g, 0));
      }
    };
    return {
      perFrame: 6,
      params: [
        { key: "rate", label: "evaporation", min: 0, max: 10, step: 1, value: 3 },
        { key: "nH", label: "hydrophobic beads per chain", min: 1, max: 7, step: 1, value: 4 }
      ],
      set(key, v) { p[key] = v; if (key === "nH") this.reset(); },
      reset() {
        nChain = M * LEN; nSub = Math.round(3 * LX * H0);
        const n = nSub + Math.round(3 * LX * (LY - H0));
        const x = new Float64Array(n), y = new Float64Array(n), type = new Uint8Array(n), frozen = new Uint8Array(n), bonds = [];
        let i = 0;
        // chains first, then the substrate, then water, so evaporation can always take beads from the end
        for (let c = 0; c < M; c++) {
          let cx = rand() * LX, cy = H0 + 1.5 + rand() * (LY - H0 - 3);
          for (let k = 0; k < LEN; k++, i++) {
            // each chain starts as a random walk with steps of one bond length
            const angle = 2 * Math.PI * rand();
            if (k) { cx = (cx + R0 * Math.cos(angle) + LX) % LX; cy = Math.min(LY - 0.2, Math.max(H0 + 0.2, cy + R0 * Math.sin(angle))); }
            x[i] = cx; y[i] = cy; type[i] = k < p.nH ? 1 : 0;
            if (k) bonds.push(i - 1, i);
          }
        }
        for (let k = 0; k < nSub; k++, i++) { x[i] = rand() * LX; y[i] = rand() * H0; type[i] = 3; frozen[i] = 1; }
        for (; i < n; i++) { x[i] = rand() * LX; y[i] = H0 + rand() * (LY - H0); type[i] = 2; }
        sim = new DPD2D({ LX, LY, periodicY: false, ylo: H0, yhi: LY, aij: A, dt, kb: KB, r0: R0, extra: topWall });
        sim.load(x, y, type, frozen, bonds);
        removed = 0;
      },
      step() {
        sim.step();
        // evaporation: now and then the highest water bead leaves, and the top comes down so the density stays at 3
        if (!p.rate || Math.round(sim.t / dt) % Math.round(150 / p.rate)) return;
        let best = -1;
        for (let i = nChain + nSub; i < sim.n; i++) if (best < 0 || sim.y[i] > sim.y[best]) best = i;
        if (best < 0) return;
        const last = sim.n - 1;
        for (const arr of [sim.x, sim.y, sim.vx, sim.vy, sim.fx, sim.fy]) arr[best] = arr[last];
        sim.n--; removed++;
        sim.yhi = H0 + (sim.n - nSub) / (3 * LX);
      },
      draw(ctx, w, h, col) {
        const s = Math.min(w / LX, h / LY), ox = (w - LX * s) / 2, base = (h + LY * s) / 2, r = 0.5 * R0 * s;
        const X = v => ox + v * s, Y = v => base - v * s;
        ctx.save();
        ctx.beginPath(); ctx.rect(ox, 0, LX * s, h); ctx.clip();
        ctx.fillStyle = col.ink; ctx.fillRect(ox, Y(H0), LX * s, H0 * s);
        ctx.fillStyle = col.paper; ctx.font = "10px monospace"; ctx.fillText("hydrophilic substrate", ox + 4, Y(0) - 4);
        ctx.strokeStyle = col.rule; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(ox, Y(sim.yhi)); ctx.lineTo(ox + LX * s, Y(sim.yhi)); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = col.rule;
        for (let i = nChain + nSub; i < sim.n; i++) dot(ctx, X(sim.x[i]), Y(sim.y[i]), Math.max(1, s * 0.09));
        // the bead diameter is the bond length, so bonded beads touch and no bond lines are needed
        for (let i = 0; i < nChain; i++) {
          const px = X(sim.x[i]), py = Y(sim.y[i]);
          ctx.fillStyle = sim.type[i] ? col.b : col.a;
          dot(ctx, px, py, r);
          // the box is periodic in x, so a bead on one edge also shows on the other
          if (sim.x[i] < 0.5 * R0) dot(ctx, px + LX * s, py, r);
          else if (sim.x[i] > LX - 0.5 * R0) dot(ctx, px - LX * s, py, r);
        }
        ctx.restore();
      },
      // share of the chain beads next to the substrate that are hydrophilic
      contact() {
        let philic = 0, all = 0;
        for (let i = 0; i < nChain; i++) if (sim.y[i] < H0 + 0.7) { all++; if (!sim.type[i]) philic++; }
        return all ? philic / all : NaN;
      },
      info() {
        const c = this.contact(), water = sim.n - nChain - nSub;
        return `water left ${water}   next to the substrate: ${isFinite(c) ? (100 * c).toFixed(0) + "% hydrophilic" : "no chains yet"}`;
      }
    };
  }
};
