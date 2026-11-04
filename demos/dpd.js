// DPD of A-B di-block copolymers
DEMOS.dpd = {
  title: "Di-block copolymers in DPD",
  text: "A-B di-block chains in dissipative particle dynamics. The blocks repel each other but are bonded together, so instead of separating completely, they form stripes (lamellae) or domains. The block ratio changes the pattern.",
  details: "32 chains of 8 beads, harmonic bonds k = 4, a<sub>AA</sub> = a<sub>BB</sub> = 25, kT = 1, &rho; &asymp; 3, &gamma; = 4.5, dt = 0.03",
  make() {
    const LX = 12, LY = 7, LEN = 8, M = 32, N = LEN * M, gamma = 4.5, sigma = 3, dt = 0.03, kb = 4;
    const p = { aAB: 60, nA: 4 };
    let x, y, vx, vy, fx, fy, type, t;
    function forces() {
      fx.fill(0); fy.fill(0);
      const noise = sigma / Math.sqrt(dt);
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        let dx = x[i] - x[j], dy = y[i] - y[j];
        dx -= LX * Math.round(dx / LX); dy -= LY * Math.round(dy / LY);
        const r2 = dx * dx + dy * dy;
        if (j === i + 1 && (j % LEN) !== 0) {
          fx[i] -= kb * dx; fy[i] -= kb * dy; fx[j] += kb * dx; fy[j] += kb * dy;
        }
        if (r2 >= 1 || r2 === 0) continue;
        const r = Math.sqrt(r2), ex = dx / r, ey = dy / r, w = 1 - r;
        const a = type[i] === type[j] ? 25 : p.aAB;
        const dv = ex * (vx[i] - vx[j]) + ey * (vy[i] - vy[j]);
        const f = a * w - gamma * w * w * dv + noise * w * gauss();
        fx[i] += f * ex; fy[i] += f * ey; fx[j] -= f * ex; fy[j] -= f * ey;
      }
    }
    return {
      perFrame: 3,
      params: [
        { key: "aAB", label: "a_AB", min: 25, max: 80, step: 1, value: 60 },
        { key: "nA", label: "A beads per chain", min: 1, max: 7, step: 1, value: 4 }
      ],
      set(k, v) { p[k] = v; if (k === "nA") this.reset(); },
      reset() {
        x = new Float64Array(N); y = new Float64Array(N); vx = new Float64Array(N); vy = new Float64Array(N);
        fx = new Float64Array(N); fy = new Float64Array(N); type = new Uint8Array(N);
        for (let c = 0; c < M; c++) {
          let cx = rand() * LX, cy = rand() * LY;
          for (let k = 0; k < LEN; k++) {
            const i = c * LEN + k;
            cx = (cx + 0.5 * gauss() + LX) % LX; cy = (cy + 0.5 * gauss() + LY) % LY;
            x[i] = cx; y[i] = cy; vx[i] = gauss(); vy[i] = gauss();
            type[i] = k < p.nA ? 0 : 1;
          }
        }
        t = 0; forces();
      },
      step() {
        for (let i = 0; i < N; i++) {
          vx[i] += 0.5 * dt * fx[i]; vy[i] += 0.5 * dt * fy[i];
          x[i] = (x[i] + dt * vx[i] + LX) % LX; y[i] = (y[i] + dt * vy[i] + LY) % LY;
        }
        forces();
        for (let i = 0; i < N; i++) { vx[i] += 0.5 * dt * fx[i]; vy[i] += 0.5 * dt * fy[i]; }
        t += dt;
      },
      draw(ctx, w, h, col) {
        const s = w / LX;
        ctx.lineWidth = Math.max(3, s * 0.12); ctx.lineCap = "round";
        ctx.strokeStyle = col.ink;
        ctx.beginPath();
        for (let i = 0; i < N - 1; i++) {
          if ((i + 1) % LEN === 0) continue;
          if (Math.abs(x[i] - x[i + 1]) > LX / 2 || Math.abs(y[i] - y[i + 1]) > LY / 2) continue;
          ctx.moveTo(x[i] * s, y[i] * s); ctx.lineTo(x[i + 1] * s, y[i + 1] * s);
        }
        ctx.stroke();
        for (let i = 0; i < N; i++) { ctx.fillStyle = type[i] ? col.b : col.a; dot(ctx, x[i] * s, y[i] * s, s * 0.27); }
      },
      info() { return `t = ${t.toFixed(1)}   A${p.nA}B${LEN - p.nA}   N = ${N}`; }
    };
  }
};
