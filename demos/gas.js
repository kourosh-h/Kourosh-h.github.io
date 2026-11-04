// Hard-disk gas and the Maxwell-Boltzmann distribution
DEMOS.gas = {
  title: "From equal speeds to Maxwell-Boltzmann",
  text: "Hard disks in a box all start with the same speed. Elastic collisions spread the speeds out, and the histogram settles on the 2D Maxwell-Boltzmann curve.",
  details: "elastic collisions, reflecting walls, curve: f(v) = (v/&sigma;<sup>2</sup>) exp(&minus;v<sup>2</sup>/2&sigma;<sup>2</sup>) with the same mean energy",
  make() {
    const LX = 12, LY = 7, dt = 0.004;
    const p = { N: 160, R: 0.11 };
    let x, y, vx, vy, t;
    return {
      perFrame: 4,
      params: [
        { key: "N", label: "disks", min: 40, max: 300, step: 10, value: 160 },
        { key: "R", label: "disk radius", min: 0.05, max: 0.2, step: 0.01, value: 0.11 }
      ],
      set(k, v) { p[k] = v; this.reset(); },
      reset() {
        const N = p.N;
        x = new Float64Array(N); y = new Float64Array(N); vx = new Float64Array(N); vy = new Float64Array(N);
        const cols = Math.ceil(Math.sqrt(N * LX * 0.62 / LY));
        for (let i = 0; i < N; i++) {
          x[i] = ((i % cols) + 0.5) * (LX * 0.62) / cols; y[i] = (Math.floor(i / cols) + 0.5) * LY / Math.ceil(N / cols);
          const a = rand() * 2 * Math.PI; vx[i] = Math.cos(a); vy[i] = Math.sin(a);
        }
        t = 0;
      },
      step() {
        const N = p.N, R = p.R, d2 = 4 * R * R;
        for (let i = 0; i < N; i++) {
          x[i] += vx[i] * dt; y[i] += vy[i] * dt;
          if (x[i] < R && vx[i] < 0 || x[i] > LX * 0.62 - R && vx[i] > 0) vx[i] = -vx[i];
          if (y[i] < R && vy[i] < 0 || y[i] > LY - R && vy[i] > 0) vy[i] = -vy[i];
        }
        for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
          const dx = x[i] - x[j], dy = y[i] - y[j], r2 = dx * dx + dy * dy;
          if (r2 >= d2) continue;
          const dvx = vx[i] - vx[j], dvy = vy[i] - vy[j], dot = dx * dvx + dy * dvy;
          if (dot >= 0) continue;
          const k = dot / r2;
          vx[i] -= k * dx; vy[i] -= k * dy; vx[j] += k * dx; vy[j] += k * dy;
        }
        t += dt;
      },
      draw(ctx, w, h, col) {
        const s = w / LX, N = p.N, bw = LX * 0.62 * s;
        ctx.strokeStyle = col.rule; ctx.strokeRect(0.5, 0.5, bw, h - 1);
        for (let i = 0; i < N; i++) {
          const v = Math.hypot(vx[i], vy[i]);
          ctx.fillStyle = v > 1.4 ? col.b : col.a;
          dot(ctx, x[i] * s, y[i] * s, Math.max(1.5, p.R * s));
        }
        // histogram
        const hx = bw + 16, hw = w - hx - 8, hy = 18, hh = h - 46, bins = 16, vmax = 3.2;
        const counts = new Array(bins).fill(0);
        for (let i = 0; i < N; i++) { const b = Math.floor(Math.hypot(vx[i], vy[i]) / vmax * bins); if (b < bins) counts[b]++; }
        const dv = vmax / bins, sig2 = 0.5, peak = Math.max(...counts, N * dv * Math.exp(-0.5) / Math.sqrt(sig2));
        ctx.fillStyle = col.a;
        counts.forEach((c, b) => { const bh = c / peak * hh; ctx.fillRect(hx + b * hw / bins + 1, hy + hh - bh, hw / bins - 2, bh); });
        ctx.strokeStyle = col.b; ctx.lineWidth = 2; ctx.beginPath();
        for (let k = 0; k <= 60; k++) {
          const v = k / 60 * vmax, f = N * dv * (v / sig2) * Math.exp(-v * v / (2 * sig2));
          const px = hx + v / vmax * hw, py = hy + hh - f / peak * hh;
          k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.stroke();
        ctx.fillStyle = col.muted; ctx.font = "10px monospace";
        ctx.fillText("speed", hx, h - 14); ctx.fillText("count", hx, 12);
      },
      info() { return `t = ${t.toFixed(1)}   N = ${p.N}`; }
    };
  }
};
