// Block copolymer coating forming on a substrate as the solvent dries
DEMOS.coating = {
  title: "A coating that assembles itself",
  text: "Di-block copolymers in water above a hydrophilic substrate, simulated with DPD. Water is removed from the top as it evaporates, and the box shrinks with it. The hydrophilic blocks (orange) stick to the substrate, and the hydrophobic blocks (blue) gather above them, so a layered film forms on its own.",
  details: "18 chains of 8 beads, bonds k = 4, a<sub>AW</sub> = 80, a<sub>AB</sub> = 50, a<sub>BW</sub> = 26, a<sub>SB</sub> = 15, a<sub>SA</sub> = 60, other pairs 25, kT = 1, &rho; = 3",
  make() {
    const LX = 16, LEN = 8, M = 18, NS = 32, dt = 0.03, gamma = 4.5, sigma = 3, kb = 4;
    // types: 0 = A hydrophobic, 1 = B hydrophilic, 2 = water, 3 = substrate
    const A = [[25, 50, 80, 60], [50, 25, 26, 15], [80, 26, 25, 25], [60, 15, 25, 25]];
    const p = { rate: 3, nA: 4 };
    let x, y, vx, vy, fx, fy, type, chainEnd, n, top, t, removed;
    function forces() {
      fx.fill(0); fy.fill(0);
      const noise = sigma / Math.sqrt(dt);
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        let dx = x[i] - x[j];
        const dy = y[i] - y[j];
        dx -= LX * Math.round(dx / LX);
        if (j === i + 1 && !chainEnd[i]) { fx[i] -= kb * dx; fy[i] -= kb * dy; fx[j] += kb * dx; fy[j] += kb * dy; }
        const r2 = dx * dx + dy * dy;
        if (r2 >= 1 || r2 === 0) continue;
        const r = Math.sqrt(r2), ex = dx / r, ey = dy / r, w = 1 - r;
        const dv = ex * (vx[i] - vx[j]) + ey * (vy[i] - vy[j]);
        const f = A[type[i]][type[j]] * w - gamma * w * w * dv + noise * w * gauss();
        fx[i] += f * ex; fy[i] += f * ey; fx[j] -= f * ex; fy[j] -= f * ey;
      }
      // the top of the box is neutral: it pushes every bead like water would, so no block prefers it
      for (let i = 0; i < n - NS; i++) {
        const d = top - y[i];
        if (d < 1) fy[i] -= 1.5 * A[type[i]][2] * (1 - Math.max(d, 0));
      }
    }
    return {
      perFrame: 2,
      params: [
        { key: "rate", label: "evaporation", min: 0, max: 10, step: 1, value: 3 },
        { key: "nA", label: "hydrophobic beads per chain", min: 1, max: 7, step: 1, value: 4 }
      ],
      set(k, v) { p[k] = v; if (k === "nA") this.reset(); },
      reset() {
        top = 10;
        const nFluid = Math.round(3 * LX * (top - 0.5));
        n = nFluid + NS;
        x = new Float64Array(n); y = new Float64Array(n); vx = new Float64Array(n); vy = new Float64Array(n);
        fx = new Float64Array(n); fy = new Float64Array(n); type = new Uint8Array(n); chainEnd = new Uint8Array(n);
        let i = 0;
        for (let c = 0; c < M; c++) {
          let cx = rand() * LX, cy = 2 + rand() * (top - 3);
          for (let k = 0; k < LEN; k++, i++) {
            cx = (cx + 0.4 * gauss() + LX) % LX; cy = Math.min(top - 0.3, Math.max(0.8, cy + 0.4 * gauss()));
            x[i] = cx; y[i] = cy; type[i] = k < p.nA ? 0 : 1; chainEnd[i] = k === LEN - 1 ? 1 : 0;
          }
        }
        for (; i < nFluid; i++) { x[i] = rand() * LX; y[i] = 0.6 + rand() * (top - 0.9); type[i] = 2; chainEnd[i] = 1; }
        for (let k = 0; k < NS; k++, i++) { x[i] = (k + 0.5) * LX / NS; y[i] = 0.25; type[i] = 3; chainEnd[i] = 1; }
        for (let k = 0; k < nFluid; k++) { vx[k] = gauss(); vy[k] = gauss(); }
        t = 0; removed = 0; forces();
      },
      step() {
        const nFluid = n - NS;
        for (let i = 0; i < nFluid; i++) {
          vx[i] += 0.5 * dt * fx[i]; vy[i] += 0.5 * dt * fy[i];
          x[i] = (x[i] + dt * vx[i] + LX) % LX; y[i] += dt * vy[i];
          if (y[i] < 0.5) { y[i] = 1 - y[i]; vy[i] = Math.abs(vy[i]); }
          if (y[i] > top) { y[i] = 2 * top - y[i]; vy[i] = -Math.abs(vy[i]); }
        }
        forces();
        for (let i = 0; i < nFluid; i++) { vx[i] += 0.5 * dt * fx[i]; vy[i] += 0.5 * dt * fy[i]; }
        t += dt;
        // evaporation: take the highest water bead out now and then
        if (p.rate && Math.round(t / dt) % Math.round(40 / p.rate) === 0) {
          let best = -1;
          for (let i = 0; i < n - NS; i++) if (type[i] === 2 && y[i] > top - 1.5 && (best < 0 || y[i] > y[best])) best = i;
          if (best >= 0) {
            const last = n - NS - 1;
            for (const arr of [x, y, vx, vy, fx, fy]) { arr[best] = arr[last]; }
            type[best] = type[last]; chainEnd[best] = chainEnd[last];
            for (let k = last; k < n - 1; k++) { for (const arr of [x, y, vx, vy, fx, fy]) arr[k] = arr[k + 1]; type[k] = type[k + 1]; chainEnd[k] = chainEnd[k + 1]; }
            n--; removed++;
            top = Math.max(2.2, 0.5 + (n - NS) / (3 * LX));
          }
        }
      },
      draw(ctx, w, h, col) {
        const s = Math.min(w / LX, h / 10.6), ox = (w - LX * s) / 2, base = h - 10;
        const X = v => ox + v * s, Y = v => base - v * s;
        ctx.fillStyle = col.ink; ctx.fillRect(0, base - 0.1 * s, w, h);
        ctx.strokeStyle = col.rule; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(0, Y(top)); ctx.lineTo(w, Y(top)); ctx.stroke(); ctx.setLineDash([]);
        for (let i = 0; i < n - NS; i++) if (type[i] === 2) { ctx.fillStyle = col.rule; dot(ctx, X(x[i]), Y(y[i]), s * 0.12); }
        ctx.strokeStyle = col.ink; ctx.lineWidth = Math.max(3, s * 0.16); ctx.lineCap = "round"; ctx.beginPath();
        for (let i = 0; i < n - NS - 1; i++) {
          if (chainEnd[i] || type[i] > 1 || type[i + 1] > 1) continue;
          if (Math.abs(x[i] - x[i + 1]) > LX / 2) continue;
          ctx.moveTo(X(x[i]), Y(y[i])); ctx.lineTo(X(x[i + 1]), Y(y[i + 1]));
        }
        ctx.stroke();
        for (let i = 0; i < n - NS; i++) if (type[i] < 2) { ctx.fillStyle = type[i] ? col.b : col.a; dot(ctx, X(x[i]), Y(y[i]), s * 0.32); }
      },
      info() {
        const water = (n - NS) - M * LEN;
        return `water beads left = ${water}   evaporated = ${removed}`;
      }
    };
  }
};
