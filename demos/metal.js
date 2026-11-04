// Melting a 2D metal crystal
DEMOS.metal = {
  title: "Melting a metal crystal",
  text: "A close-packed 2D crystal with a Morse potential, which is a common simple model for metals. Atoms with 6 neighbors are in the crystal (blue), and the rest are defects or liquid (orange). Heat it up and watch it melt from the surface and from the defects.",
  details: "Morse potential, D = 1, a = 3, r<sub>0</sub> = 1, 180 atoms with a free surface, velocity rescaling thermostat",
  make() {
    const NX = 15, NY = 12, N = NX * NY, D = 1, A = 3, r0 = 1, rc = 2, dt = 0.005;
    const p = { T: 0.15 };
    let x, y, vx, vy, fx, fy, nb, t, Tnow;
    const LX = 26, LY = LX * 7 / 12;
    function forces() {
      fx.fill(0); fy.fill(0); nb.fill(0);
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        const dx = x[i] - x[j], dy = y[i] - y[j], r2 = dx * dx + dy * dy;
        if (r2 > rc * rc) continue;
        const r = Math.sqrt(r2), e = Math.exp(-A * (r - r0));
        const f = 2 * A * D * (e * e - e) / r;
        fx[i] += f * dx; fy[i] += f * dy; fx[j] -= f * dx; fy[j] -= f * dy;
        if (r < 1.3) { nb[i]++; nb[j]++; }
      }
      for (let i = 0; i < N; i++) {
        if (x[i] < 0.5) fx[i] += 20 * (0.5 - x[i]); if (x[i] > LX - 0.5) fx[i] -= 20 * (x[i] - LX + 0.5);
        if (y[i] < 0.5) fy[i] += 20 * (0.5 - y[i]); if (y[i] > LY - 0.5) fy[i] -= 20 * (y[i] - LY + 0.5);
      }
    }
    return {
      perFrame: 6,
      params: [{ key: "T", label: "temperature", min: 0.02, max: 0.8, step: 0.01, value: 0.15 }],
      set(k, v) { p[k] = v; },
      reset() {
        x = new Float64Array(N); y = new Float64Array(N); vx = new Float64Array(N); vy = new Float64Array(N);
        fx = new Float64Array(N); fy = new Float64Array(N); nb = new Uint8Array(N);
        const ox = (LX - NX) / 2, oy = (LY - NY * 0.866) / 2;
        for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
          const k = j * NX + i;
          x[k] = ox + i + (j % 2) * 0.5; y[k] = oy + j * 0.866;
          vx[k] = gauss() * Math.sqrt(p.T); vy[k] = gauss() * Math.sqrt(p.T);
        }
        t = 0; Tnow = p.T; forces();
      },
      step() {
        for (let i = 0; i < N; i++) {
          vx[i] += 0.5 * dt * fx[i]; vy[i] += 0.5 * dt * fy[i];
          x[i] += dt * vx[i]; y[i] += dt * vy[i];
        }
        forces();
        let ke = 0;
        for (let i = 0; i < N; i++) { vx[i] += 0.5 * dt * fx[i]; vy[i] += 0.5 * dt * fy[i]; ke += vx[i] * vx[i] + vy[i] * vy[i]; }
        Tnow = ke / (2 * N);
        const lam = Math.sqrt(1 + (dt / 0.2) * (p.T / Math.max(Tnow, 1e-6) - 1));
        for (let i = 0; i < N; i++) { vx[i] *= lam; vy[i] *= lam; }
        t += dt;
      },
      draw(ctx, w, h, col) {
        const s = w / LX;
        for (let i = 0; i < N; i++) { ctx.fillStyle = nb[i] === 6 ? col.a : col.b; dot(ctx, x[i] * s, y[i] * s, s * 0.45); }
      },
      info() {
        let c = 0;
        for (let i = 0; i < N; i++) if (nb[i] === 6) c++;
        return `T = ${Tnow.toFixed(2)}   crystalline = ${(100 * c / N).toFixed(0)}%`;
      }
    };
  }
};
