// Learn: dissipative particle dynamics

DEMOS["dpd-forces"] = {
  title: "The three DPD forces",
  text: "",
  details: "left: force shapes vs distance, right: DPD energy U = (a/2)(1 &minus; r)<sup>2</sup> next to a Lennard-Jones curve of similar size",
  make() {
    const p = { a: 25, gamma: 4.5 };
    return {
      perFrame: 1,
      params: [
        { key: "a", label: "repulsion a", min: 5, max: 80, step: 1, value: 25 },
        { key: "gamma", label: "friction γ", min: 0.5, max: 10, step: 0.1, value: 4.5 }
      ],
      set(k, v) { p[k] = v; },
      reset() {}, step() {},
      draw(ctx, w, h, col) {
        const half = w / 2;
        const A = plotBox(ctx, [34, 14, half - 50, h - 42], [0, 1.4], [0, 80], col, "r / r_c", "force");
        const fc = [], fd = [], fr = [];
        for (let k = 0; k <= 140; k++) {
          const r = 1.4 * k / 140, wR = Math.max(0, 1 - r);
          fc.push([r, p.a * wR]); fd.push([r, p.gamma * wR * wR * 4]); fr.push([r, Math.sqrt(2 * p.gamma) * wR * 6]);
        }
        A.line(fc, col.a, 2.5); A.line(fd, col.b, 2); A.line(fr, col.muted, 2, [4, 3]);
        ctx.font = "10px monospace";
        ctx.fillStyle = col.a; ctx.fillText("conservative a(1 - r)", 44, 30);
        ctx.fillStyle = col.b; ctx.fillText("dissipative γ(1 - r)² (×4)", 44, 44);
        ctx.fillStyle = col.muted; ctx.fillText("random σ(1 - r) (×6)", 44, 58);
        const B = plotBox(ctx, [half + 34, 14, half - 50, h - 42], [0, 2], [-2, 14], col, "r", "energy");
        B.hline(0, col.rule);
        const ud = [], lj = [];
        for (let k = 0; k <= 200; k++) {
          const r = 2 * k / 200;
          ud.push([r, r < 1 ? p.a / 2 * (1 - r) ** 2 : 0]);
          const q = r / 0.75; lj.push([r, r > 0.6 ? 4 * (q ** -12 - q ** -6) : NaN]);
        }
        B.line(lj, col.muted, 2, [4, 3]); B.line(ud, col.a, 2.5);
        ctx.fillStyle = col.muted; ctx.fillText("dashed: LJ", half + 44, 30); ctx.fillStyle = col.a; ctx.fillText("DPD, finite at r = 0", half + 44, 44);
      },
      info() { return `a = ${p.a}   γ = ${p.gamma}   σ = √(2γkT) = ${Math.sqrt(2 * p.gamma).toFixed(2)}`; }
    };
  }
};

DEMOS["dpd-momentum"] = {
  title: "Momentum conservation and flow",
  text: "",
  details: "300 beads, a = 25, initial flow v<sub>x</sub> = 1.5 sin(2&pi;y/L). DPD: pairwise friction and noise. Langevin: friction on each bead against a fixed background",
  make() {
    const LX = 12, LY = 8, N = Math.round(3 * LX * LY / 1.15), dt = 0.03, gamma = 4.5, sigma = 3, bins = 16;
    const p = { mode: 0 };
    let x, y, vx, vy, fx, fy, t, amp;
    function forces() {
      fx.fill(0); fy.fill(0);
      const noise = sigma / Math.sqrt(dt), pair = p.mode === 0;
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        let dx = x[i] - x[j], dy = y[i] - y[j];
        dx -= LX * Math.round(dx / LX); dy -= LY * Math.round(dy / LY);
        const r2 = dx * dx + dy * dy;
        if (r2 >= 1 || r2 === 0) continue;
        const r = Math.sqrt(r2), ex = dx / r, ey = dy / r, w = 1 - r;
        let f = 25 * w;
        if (pair) f += -gamma * w * w * (ex * (vx[i] - vx[j]) + ey * (vy[i] - vy[j])) + noise * w * gauss();
        fx[i] += f * ex; fy[i] += f * ey; fx[j] -= f * ex; fy[j] -= f * ey;
      }
      if (!pair) {
        const g = 1.5;
        for (let i = 0; i < N; i++) { fx[i] += -g * vx[i] + Math.sqrt(2 * g / dt) * gauss(); fy[i] += -g * vy[i] + Math.sqrt(2 * g / dt) * gauss(); }
      }
    }
    const profile = () => {
      const s = new Float64Array(bins), c = new Float64Array(bins);
      for (let i = 0; i < N; i++) { const b = Math.floor(y[i] / LY * bins) % bins; s[b] += vx[i]; c[b]++; }
      return Array.from(s, (v, k) => v / Math.max(c[k], 1));
    };
    return {
      perFrame: 2,
      params: [{ key: "mode", label: "0 DPD, 1 Langevin", min: 0, max: 1, step: 1, value: 0 }],
      set(k, v) { p[k] = v; this.reset(); },
      reset() {
        x = new Float64Array(N); y = new Float64Array(N); vx = new Float64Array(N); vy = new Float64Array(N);
        fx = new Float64Array(N); fy = new Float64Array(N);
        for (let i = 0; i < N; i++) { x[i] = rand() * LX; y[i] = rand() * LY; vx[i] = gauss() + 1.5 * Math.sin(2 * Math.PI * y[i] / LY); vy[i] = gauss(); }
        t = 0; amp = []; forces();
      },
      step() {
        for (let i = 0; i < N; i++) {
          vx[i] += 0.5 * dt * fx[i]; vy[i] += 0.5 * dt * fy[i];
          x[i] = (x[i] + dt * vx[i] + LX) % LX; y[i] = (y[i] + dt * vy[i] + LY) % LY;
        }
        forces();
        for (let i = 0; i < N; i++) { vx[i] += 0.5 * dt * fx[i]; vy[i] += 0.5 * dt * fy[i]; }
        t += dt;
        if (Math.round(t / dt) % 4 === 0 && t < 30) {
          let a = 0; for (let i = 0; i < N; i++) a += vx[i] * Math.sin(2 * Math.PI * y[i] / LY);
          amp.push([t, 2 * a / N]);
        }
      },
      draw(ctx, w, h, col) {
        const third = w / 3;
        const pr = profile();
        const A = plotBox(ctx, [30, 14, third - 40, h - 42], [-2.2, 2.2], [0, LY], col, "vx", "y");
        A.line(pr.map((v, k) => [v, (k + 0.5) * LY / bins]), col.a, 2.5);
        const B = plotBox(ctx, [third + 30, 14, 2 * third - 44, h - 42], [0, 30], [-0.3, 1.8], col, "time", "flow amplitude");
        B.hline(0, col.rule);
        B.line(amp, p.mode ? col.b : col.a, 2);
      },
      info() {
        let px = 0; for (let i = 0; i < N; i++) px += vx[i];
        return `t = ${t.toFixed(1)}   total momentum px = ${px.toFixed(1)}`;
      }
    };
  }
};

DEMOS["dpd-chi"] = {
  title: "From Flory-Huggins &chi; to a<sub>ij</sub>",
  text: "",
  details: "single-bead A and B fluid, &rho; = 3, a<sub>ii</sub> = 25, a<sub>AB</sub> = 25 + 3.27 &chi; (Groot and Warren). Order: fraction of unlike neighbors, 0.5 when mixed",
  make() {
    const LX = 12, LY = 7, N = 3 * LX * LY, gamma = 4.5, sigma = 3, dt = 0.03;
    const p = { chi: 6 };
    let x, y, vx, vy, fx, fy, type, unlike;
    function forces() {
      fx.fill(0); fy.fill(0);
      const noise = sigma / Math.sqrt(dt), aAB = 25 + 3.27 * p.chi;
      let u = 0, c = 0;
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        let dx = x[i] - x[j], dy = y[i] - y[j];
        dx -= LX * Math.round(dx / LX); dy -= LY * Math.round(dy / LY);
        const r2 = dx * dx + dy * dy;
        if (r2 >= 1 || r2 === 0) continue;
        const r = Math.sqrt(r2), ex = dx / r, ey = dy / r, w = 1 - r;
        const diff = type[i] !== type[j];
        if (r < 0.7) { c++; if (diff) u++; }
        const f = (diff ? aAB : 25) * w - gamma * w * w * (ex * (vx[i] - vx[j]) + ey * (vy[i] - vy[j])) + noise * w * gauss();
        fx[i] += f * ex; fy[i] += f * ey; fx[j] -= f * ex; fy[j] -= f * ey;
      }
      unlike = c ? u / c : 0;
    }
    return {
      perFrame: 2,
      params: [{ key: "chi", label: "χ", min: 0, max: 15, step: 0.25, value: 6 }],
      set(k, v) { p[k] = v; },
      reset() {
        x = new Float64Array(N); y = new Float64Array(N); vx = new Float64Array(N); vy = new Float64Array(N);
        fx = new Float64Array(N); fy = new Float64Array(N); type = new Uint8Array(N);
        for (let i = 0; i < N; i++) { x[i] = rand() * LX; y[i] = rand() * LY; vx[i] = gauss(); vy[i] = gauss(); type[i] = i % 2; }
        forces();
      },
      step() {
        for (let i = 0; i < N; i++) { vx[i] += 0.5 * dt * fx[i]; vy[i] += 0.5 * dt * fy[i]; x[i] = (x[i] + dt * vx[i] + LX) % LX; y[i] = (y[i] + dt * vy[i] + LY) % LY; }
        forces();
        for (let i = 0; i < N; i++) { vx[i] += 0.5 * dt * fx[i]; vy[i] += 0.5 * dt * fy[i]; }
      },
      draw(ctx, w, h, col) {
        const s = w / LX;
        for (let i = 0; i < N; i++) { ctx.fillStyle = type[i] ? col.b : col.a; dot(ctx, x[i] * s, y[i] * s, s * 0.2); }
      },
      info() { return `χ = ${p.chi}   a_AB = ${(25 + 3.27 * p.chi).toFixed(1)}   unlike neighbors = ${(unlike || 0).toFixed(2)}`; }
    };
  }
};

DEMOS["dpd-units"] = {
  title: "What one DPD bead means",
  text: "",
  details: "&rho; = 3 beads per r<sub>c</sub><sup>3</sup>, water volume 30 &Aring;<sup>3</sup>, r<sub>c</sub> = 3.107 (&rho;N<sub>m</sub>)<sup>1/3</sup> &Aring;, a<sub>ii</sub> = (16N<sub>m</sub> &minus; 1)/(0.2&rho;) kT from the compressibility of water",
  make() {
    const p = { Nm: 3 };
    let seeds;
    return {
      perFrame: 1,
      params: [{ key: "Nm", label: "water molecules per bead N_m", min: 1, max: 10, step: 1, value: 3 }],
      set(k, v) { p[k] = v; },
      reset() { seeds = Array.from({ length: 10 }, () => [rand(), rand()]); },
      step() {},
      draw(ctx, w, h, col) {
        const R = h * 0.36, ox = w * 0.28, oy = h / 2;
        ctx.fillStyle = col.a; ctx.globalAlpha = 0.18; dot(ctx, ox, oy, R); ctx.globalAlpha = 1;
        ctx.strokeStyle = col.a; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ox, oy, R, 0, 2 * Math.PI); ctx.stroke();
        for (let k = 0; k < p.Nm; k++) {
          const ang = 2 * Math.PI * k / p.Nm + seeds[k][0], rr = p.Nm === 1 ? 0 : R * (0.35 + 0.3 * seeds[k][1]);
          const cx = ox + rr * Math.cos(ang), cy = oy + rr * Math.sin(ang), s = R * 0.13;
          ctx.fillStyle = col.b; dot(ctx, cx, cy, s);
          ctx.fillStyle = col.paper; ctx.strokeStyle = col.ink; ctx.lineWidth = 1;
          for (const a of [ang + 0.9, ang - 0.9]) { const hx = cx + s * 1.3 * Math.cos(a), hy = cy + s * 1.3 * Math.sin(a); dot(ctx, hx, hy, s * 0.55); ctx.beginPath(); ctx.arc(hx, hy, s * 0.55, 0, 7); ctx.stroke(); }
        }
        const rc = 3.107 * Math.cbrt(3 * p.Nm), a = (16 * p.Nm - 1) / (0.2 * 3);
        const rows = [["r_c", `${rc.toFixed(2)} Å`], ["bead volume", `${(30 * p.Nm).toFixed(0)} Å³`], ["bead mass", `${18 * p.Nm} g/mol`], ["a_ii", `${a.toFixed(1)} kT`]];
        ctx.font = "13px monospace";
        rows.forEach(([k, v], i) => { ctx.fillStyle = col.muted; ctx.fillText(k, w * 0.58, h * 0.3 + i * 26); ctx.fillStyle = col.ink; ctx.fillText(v, w * 0.78, h * 0.3 + i * 26); });
      },
      info() { return `N_m = ${p.Nm}`; }
    };
  }
};
