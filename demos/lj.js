// Lennard-Jones fluid
DEMOS.lj = {
  title: "Lennard-Jones condensation",
  text: "A 2D Lennard-Jones fluid with a thermostat. Below about T* = 0.45, it condenses into liquid droplets, and above that, it stays a gas.",
  hint: "Drag on the box to stir the fluid with your finger.",
  details: "N = 120, &rho;* = 0.3, r<sub>c</sub> = 2.5&sigma;, dt = 0.005, Berendsen thermostat",
  make() {
    const N = 120, LX = 26, LY = LX * 7 / 12, dt = 0.005, rc2 = 6.25;
    const p = { T: 0.4 };
    let x, y, vx, vy, fx, fy, t, Tnow, finger = null;
    function forces() {
      fx.fill(0); fy.fill(0);
      if (finger) for (let i = 0; i < N; i++) {
        const dx = x[i] - finger[0], dy = y[i] - finger[1], r2 = dx * dx + dy * dy;
        if (r2 < 9) { const f = 60 * (1 - Math.sqrt(r2) / 3) / Math.sqrt(r2 + 0.01); fx[i] += f * dx; fy[i] += f * dy; }
      }
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        let dx = x[i] - x[j], dy = y[i] - y[j];
        dx -= LX * Math.round(dx / LX); dy -= LY * Math.round(dy / LY);
        const r2 = dx * dx + dy * dy;
        if (r2 >= rc2) continue;
        const inv2 = 1 / Math.max(r2, 0.6), inv6 = inv2 * inv2 * inv2;
        const f = 24 * inv2 * inv6 * (2 * inv6 - 1);
        fx[i] += f * dx; fy[i] += f * dy; fx[j] -= f * dx; fy[j] -= f * dy;
      }
    }
    return {
      perFrame: 8,
      params: [{ key: "T", label: "T*", min: 0.25, max: 1.2, step: 0.01, value: 0.4 }],
      set(k, v) { p[k] = v; },
      drag(px, py, w, h, down) { finger = down ? [px / w * LX, py / h * LY] : null; },
      reset() {
        x = new Float64Array(N); y = new Float64Array(N); vx = new Float64Array(N); vy = new Float64Array(N);
        fx = new Float64Array(N); fy = new Float64Array(N);
        for (let i = 0; i < N; i++) {
          x[i] = (i % 12 + 0.5) * LX / 12; y[i] = (Math.floor(i / 12) + 0.5) * LY / 10;
          vx[i] = gauss() * Math.sqrt(p.T); vy[i] = gauss() * Math.sqrt(p.T);
        }
        t = 0; Tnow = p.T; forces();
      },
      step() {
        for (let i = 0; i < N; i++) {
          vx[i] += 0.5 * dt * fx[i]; vy[i] += 0.5 * dt * fy[i];
          x[i] = (x[i] + dt * vx[i] + LX) % LX; y[i] = (y[i] + dt * vy[i] + LY) % LY;
        }
        forces();
        let ke = 0;
        for (let i = 0; i < N; i++) {
          vx[i] += 0.5 * dt * fx[i]; vy[i] += 0.5 * dt * fy[i];
          ke += vx[i] * vx[i] + vy[i] * vy[i];
        }
        Tnow = ke / (2 * N);
        const lam = Math.sqrt(1 + (dt / 0.1) * (p.T / Tnow - 1));
        for (let i = 0; i < N; i++) { vx[i] *= lam; vy[i] *= lam; }
        t += dt;
      },
      draw(ctx, w, h, col) {
        const s = w / LX;
        ctx.fillStyle = col.a;
        for (let i = 0; i < N; i++) dot(ctx, x[i] * s, y[i] * s, s * 0.5);
        if (finger) { ctx.strokeStyle = col.b; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(finger[0] * s, finger[1] * s, 3 * s, 0, 2 * Math.PI); ctx.stroke(); }
      },
      info() { return `t* = ${t.toFixed(1)}   T* now = ${Tnow.toFixed(2)}`; }
    };
  }
};
