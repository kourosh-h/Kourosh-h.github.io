// Self-assembled monolayer on a surface
DEMOS.sam = {
  title: "Self-assembled monolayer",
  text: "Coarse-grained alkyl chains grafted to a flat surface, seen from the side. At a high grafting density, the chains pack, stand up, and share a common tilt. At a low density, they lie down and lose their order. Heat also melts the order.",
  details: "24 chains of 10 beads, harmonic bonds and angles, LJ between chains, head bead fixed to the surface, Langevin dynamics",
  make() {
    const M = 24, L = 10, N = M * L, dt = 0.004, gamma = 2, kb = 400, ka = 25;
    const p = { spacing: 1.1, T: 0.4 };
    let x, y, vx, vy, fx, fy, t, LX;
    const LY = 14;
    function forces() {
      fx.fill(0); fy.fill(0);
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        let dx = x[i] - x[j], dy = y[i] - y[j];
        dx -= LX * Math.round(dx / LX);
        const r2 = dx * dx + dy * dy;
        const same = Math.floor(i / L) === Math.floor(j / L);
        let f = 0;
        if (same && j === i + 1) { const r = Math.sqrt(r2); f = -kb * (r - 1) / r; }
        else if (!(same && j - i < 3) && r2 < 6.25) {
          const inv2 = 1 / Math.max(r2, 0.6), inv6 = inv2 * inv2 * inv2;
          f = 24 * inv2 * inv6 * (2 * inv6 - 1);
        }
        f = Math.max(-300, Math.min(300, f));
        fx[i] += f * dx; fy[i] += f * dy; fx[j] -= f * dx; fy[j] -= f * dy;
      }
      // angle stiffness: push i and i+2 toward distance 2 (straight chain)
      for (let c = 0; c < M; c++) for (let k = 0; k < L - 2; k++) {
        const i = c * L + k, j = i + 2;
        let dx = x[i] - x[j], dy = y[i] - y[j];
        dx -= LX * Math.round(dx / LX);
        const r = Math.sqrt(dx * dx + dy * dy) || 1, f = -ka * (r - 2) / r;
        fx[i] += f * dx; fy[i] += f * dy; fx[j] -= f * dx; fy[j] -= f * dy;
      }
      // surface: wall at y = 0 pushes every bead up
      for (let i = 0; i < N; i++) if (y[i] < 1) fy[i] += 40 * (1 - y[i]);
    }
    return {
      perFrame: 6,
      params: [
        { key: "spacing", label: "graft spacing", min: 0.9, max: 2.4, step: 0.05, value: 1.1 },
        { key: "T", label: "temperature", min: 0.1, max: 2, step: 0.05, value: 0.4 }
      ],
      set(k, v) { p[k] = v; if (k === "spacing") this.reset(); },
      reset() {
        LX = M * p.spacing;
        x = new Float64Array(N); y = new Float64Array(N); vx = new Float64Array(N); vy = new Float64Array(N);
        fx = new Float64Array(N); fy = new Float64Array(N);
        for (let c = 0; c < M; c++) for (let k = 0; k < L; k++) {
          const i = c * L + k;
          x[i] = (c + 0.5) * p.spacing; y[i] = 0.6 + k;
        }
        t = 0; forces();
      },
      step() {
        const kick = Math.sqrt(2 * gamma * p.T * dt);
        for (let i = 0; i < N; i++) {
          if (i % L === 0) continue;
          vx[i] += dt * fx[i] - gamma * vx[i] * dt + kick * gauss();
          vy[i] += dt * fy[i] - gamma * vy[i] * dt + kick * gauss();
          x[i] = (x[i] + dt * vx[i] + LX) % LX; y[i] += dt * vy[i];
        }
        forces();
        t += dt;
      },
      draw(ctx, w, h, col) {
        const s = Math.min(w / LX, h / LY), ox = (w - LX * s) / 2, base = h - 14;
        ctx.fillStyle = col.rule; ctx.fillRect(0, base, w, h - base);
        ctx.fillStyle = col.muted; ctx.font = "10px monospace"; ctx.fillText("SiO2", 6, h - 3);
        const X = v => ox + v * s, Y = v => base - v * s;
        ctx.lineWidth = Math.max(1.5, s * 0.25);
        for (let c = 0; c < M; c++) {
          ctx.strokeStyle = col.a;
          ctx.beginPath();
          for (let k = 0; k < L; k++) {
            const i = c * L + k;
            if (k && Math.abs(x[i] - x[i - 1]) > LX / 2) ctx.moveTo(X(x[i]), Y(y[i])); else if (k) ctx.lineTo(X(x[i]), Y(y[i])); else ctx.moveTo(X(x[i]), Y(y[i]));
          }
          ctx.stroke();
          ctx.fillStyle = col.b; dot(ctx, X(x[c * L]), Y(y[c * L]), s * 0.32);
        }
      },
      info() {
        let tilt = 0;
        for (let c = 0; c < M; c++) {
          let dx = x[c * L + L - 1] - x[c * L], dy = y[c * L + L - 1] - y[c * L];
          dx -= LX * Math.round(dx / LX);
          tilt += Math.atan2(Math.abs(dx), dy) * 180 / Math.PI;
        }
        return `mean tilt from normal = ${(tilt / M).toFixed(0)}°`;
      }
    };
  }
};
