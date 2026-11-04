// Bead-spring polymers
DEMOS.polymer = {
  title: "Polymer coil to globule",
  text: "Coarse-grained bead-spring chains in an implicit solvent. If you make the bead attraction stronger (a poorer solvent), the coils collapse into globules.",
  details: "8 chains &times; 16 beads, harmonic bonds, LJ between non-bonded beads, Langevin dynamics, kT = 1",
  make() {
    const M = 8, L = 16, N = M * L, LX = 30, LY = LX * 7 / 12, dt = 0.005, gamma = 1, kb = 200;
    const p = { eps: 1.0 };
    let x, y, vx, vy, fx, fy, t;
    function forces() {
      fx.fill(0); fy.fill(0);
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        let dx = x[i] - x[j], dy = y[i] - y[j];
        dx -= LX * Math.round(dx / LX); dy -= LY * Math.round(dy / LY);
        const r2 = dx * dx + dy * dy;
        let f = 0;
        const bonded = j === i + 1 && Math.floor(i / L) === Math.floor(j / L);
        if (bonded) {
          const r = Math.sqrt(r2);
          f = -kb * (r - 1) / r;
        } else if (r2 < 6.25) {
          const inv2 = 1 / Math.max(r2, 0.6), inv6 = inv2 * inv2 * inv2;
          // repulsive part always, attractive part scaled by eps
          f = 24 * inv2 * inv6 * (2 * inv6 - p.eps);
        }
        f = Math.max(-300, Math.min(300, f));
        fx[i] += f * dx; fy[i] += f * dy; fx[j] -= f * dx; fy[j] -= f * dy;
      }
    }
    return {
      perFrame: 6,
      params: [{ key: "eps", label: "attraction &epsilon;", min: 0, max: 1.6, step: 0.05, value: 1.0 }],
      set(k, v) { p[k] = v; },
      reset() {
        x = new Float64Array(N); y = new Float64Array(N); vx = new Float64Array(N); vy = new Float64Array(N);
        fx = new Float64Array(N); fy = new Float64Array(N);
        for (let c = 0; c < M; c++) for (let k = 0; k < L; k++) {
          const i = c * L + k;
          x[i] = 7 + k; y[i] = 1 + c * 2.1; vx[i] = gauss(); vy[i] = gauss();
        }
        t = 0; forces();
      },
      step() {
        const kick = Math.sqrt(2 * gamma * dt);
        for (let i = 0; i < N; i++) {
          vx[i] += dt * fx[i] - gamma * vx[i] * dt + kick * gauss();
          vy[i] += dt * fy[i] - gamma * vy[i] * dt + kick * gauss();
          x[i] = (x[i] + dt * vx[i] + LX) % LX; y[i] = (y[i] + dt * vy[i] + LY) % LY;
        }
        forces();
        t += dt;
      },
      draw(ctx, w, h, col) {
        const s = w / LX;
        for (let c = 0; c < M; c++) {
          ctx.fillStyle = c % 2 ? col.b : col.a;
          for (let k = 0; k < L; k++) dot(ctx, x[c * L + k] * s, y[c * L + k] * s, s * 0.3);
        }
        // bonds on top of the beads so they stay visible
        ctx.strokeStyle = col.ink; ctx.lineWidth = Math.max(1.5, s * 0.1); ctx.beginPath();
        for (let c = 0; c < M; c++) for (let k = 0; k < L - 1; k++) {
          const i = c * L + k;
          if (Math.abs(x[i] - x[i + 1]) < LX / 2 && Math.abs(y[i] - y[i + 1]) < LY / 2) { ctx.moveTo(x[i] * s, y[i] * s); ctx.lineTo(x[i + 1] * s, y[i + 1] * s); }
        }
        ctx.stroke();
      },
      info() {
        let rg = 0;
        for (let c = 0; c < M; c++) {
          let cx = 0, cy = 0, x0 = x[c * L], y0 = y[c * L];
          const ux = [], uy = [];
          for (let k = 0; k < L; k++) {
            let dx = x[c * L + k] - x0, dy = y[c * L + k] - y0;
            dx -= LX * Math.round(dx / LX); dy -= LY * Math.round(dy / LY);
            ux.push(dx); uy.push(dy); cx += dx; cy += dy;
          }
          cx /= L; cy /= L;
          let s2 = 0;
          for (let k = 0; k < L; k++) s2 += (ux[k] - cx) ** 2 + (uy[k] - cy) ** 2;
          rg += Math.sqrt(s2 / L);
        }
        return `t = ${t.toFixed(1)}   mean Rg = ${(rg / M).toFixed(2)}`;
      }
    };
  }
};
