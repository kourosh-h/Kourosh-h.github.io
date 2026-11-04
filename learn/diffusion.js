// Learn: diffusion

DEMOS["df-walk"] = {
  title: "From random walks to Fick's law",
  text: "Thousands of random walkers spread out into the Gaussian profile that Fick's law predicts.",
  details: "3000 walkers start on the line x = 0, each step x += &radic;(2D dt) &xi;. Dashed: c(x, t) = exp(&minus;x<sup>2</sup>/4Dt) / &radic;(4&pi;Dt)",
  make() {
    const N = 3000, dt = 0.01, L = 16, bins = 64;
    const p = { D: 1 };
    let x, y, t;
    return {
      perFrame: 2,
      params: [{ key: "D", label: "D", min: 0.1, max: 3, step: 0.05, value: 1 }],
      set(k, v) { p[k] = v; this.reset(); },
      reset() { x = new Float64Array(N); y = new Float64Array(N).map(() => rand()); t = 0; },
      step() {
        if (t > 8) return;
        const s = Math.sqrt(2 * p.D * dt);
        for (let i = 0; i < N; i++) x[i] += s * gauss();
        t += dt;
      },
      draw(ctx, w, h, col) {
        const bw = w * 0.4, X = v => bw / 2 + v / L * bw;
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, bw, h); ctx.clip();
        ctx.fillStyle = col.a; ctx.globalAlpha = 0.45;
        for (let i = 0; i < N; i++) ctx.fillRect(X(x[i]), 12 + y[i] * (h - 30), 1.6, 1.6);
        ctx.restore();
        const hist = new Float64Array(bins), dx = L / bins;
        for (let i = 0; i < N; i++) { const b = Math.floor((x[i] + L / 2) / dx); if (b >= 0 && b < bins) hist[b]++; }
        const c = Array.from(hist, (v, k) => [-L / 2 + (k + 0.5) * dx, v / (N * dx)]);
        const th = []; for (let k = 0; k <= 120; k++) { const xx = -L / 2 + L * k / 120; th.push([xx, t ? Math.exp(-xx * xx / (4 * p.D * t)) / Math.sqrt(4 * Math.PI * p.D * t) : NaN]); }
        const top = Math.max(0.12, ...c.map(q => q[1])) * 1.15;
        const P = plotBox(ctx, [bw + 34, 14, w - bw - 46, h - 42], [-L / 2, L / 2], [0, top], col, "x", "c(x, t)");
        P.line(c, col.b, 2);
        P.line(th, col.ink, 1.2, [4, 4]);
      },
      info() {
        let m = 0; for (let i = 0; i < N; i++) m += x[i] * x[i];
        return `t = ${t.toFixed(2)}   <x²> = ${(m / N).toFixed(2)}   2Dt = ${(2 * p.D * t).toFixed(2)}`;
      }
    };
  }
};

DEMOS["df-fit"] = {
  title: "Getting D from the MSD",
  text: "",
  hint: "Move the fit window. If you fit too early, you catch the ballistic part, and if you fit too late, you fit the noise.",
  details: "Langevin particles with mass 1 and kT = 1, so the true D = kT/&gamma;. MSD averaged over particles and over all time origins, straight line fitted inside the window, D = slope / 4",
  make() {
    const dt = 0.01, every = 10, frames = 250, tf = every * dt;
    const p = { gamma: 2, N: 40, t0: 1, t1: 8 };
    let x, y, vx, vy, trx, try_, acc, cnt, nstep;
    const fit = () => {
      // least squares MSD = a + b t inside the window
      let n = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
      for (let k = 1; k < frames; k++) {
        const t = k * tf; if (t < p.t0 || t > p.t1 || !cnt[k]) continue;
        const m = acc[k] / cnt[k]; n++; sx += t; sy += m; sxx += t * t; sxy += t * m;
      }
      if (n < 3) return null;
      const b = (n * sxy - sx * sy) / (n * sxx - sx * sx);
      return { a: (sy - b * sx) / n, b };
    };
    return {
      perFrame: 4,
      params: [
        { key: "gamma", label: "friction γ", min: 0.5, max: 5, step: 0.1, value: 2 },
        { key: "N", label: "particles", min: 5, max: 200, step: 5, value: 40 },
        { key: "t0", label: "fit from t", min: 0, max: 10, step: 0.1, value: 1 },
        { key: "t1", label: "fit to t", min: 1, max: 25, step: 0.5, value: 8 }
      ],
      set(k, v) { p[k] = v; if (k === "gamma" || k === "N") this.reset(); },
      reset() {
        const N = p.N, s = Math.sqrt(1);
        x = new Float64Array(N); y = new Float64Array(N);
        vx = new Float64Array(N).map(() => s * gauss()); vy = new Float64Array(N).map(() => s * gauss());
        trx = []; try_ = []; acc = new Float64Array(frames); cnt = new Float64Array(frames); nstep = 0;
      },
      step() {
        if (trx.length >= 4 * frames) return;
        const c1 = Math.exp(-p.gamma * dt), c2 = Math.sqrt(1 - c1 * c1);
        for (let i = 0; i < p.N; i++) {
          x[i] += vx[i] * dt; y[i] += vy[i] * dt;
          vx[i] = c1 * vx[i] + c2 * gauss(); vy[i] = c1 * vy[i] + c2 * gauss();
        }
        if (++nstep % every) return;
        trx.push(Float64Array.from(x)); try_.push(Float64Array.from(y));
        // add this frame to every lag it completes
        const now = trx.length - 1;
        for (let k = 1; k < frames && k <= now; k++) {
          const ox = trx[now - k], oy = try_[now - k];
          let m = 0;
          for (let i = 0; i < p.N; i++) m += (x[i] - ox[i]) ** 2 + (y[i] - oy[i]) ** 2;
          acc[k] += m / p.N; cnt[k]++;
        }
      },
      draw(ctx, w, h, col) {
        const pts = [];
        for (let k = 1; k < frames; k++) if (cnt[k]) pts.push([k * tf, acc[k] / cnt[k]]);
        const top = Math.max(1, ...pts.map(q => q[1])) * 1.1;
        const P = plotBox(ctx, [44, 14, w - 60, h - 42], [0, frames * tf], [0, top], col, "lag time t", "MSD");
        ctx.fillStyle = col.a; ctx.globalAlpha = 0.12;
        ctx.fillRect(P.X(p.t0), 14, P.X(Math.max(p.t0, p.t1)) - P.X(p.t0), h - 42);
        ctx.globalAlpha = 1;
        P.dots(pts, col.a, 2);
        P.line([[0, 0], [frames * tf, 4 / p.gamma * frames * tf]], col.muted, 1.2, [4, 4]);
        const f = fit();
        if (f) P.line([[0, f.a], [frames * tf, f.a + f.b * frames * tf]], col.b, 2);
        ctx.fillStyle = col.muted; ctx.font = "10px monospace";
        ctx.fillText("dashed: exact 4Dt", P.X(0.5), P.Y(top * 0.92));
      },
      info() {
        const f = fit();
        return `true D = ${(1 / p.gamma).toFixed(3)}   fitted D = ${f ? (f.b / 4).toFixed(3) : "-"}   frames = ${trx.length}`;
      }
    };
  }
};

DEMOS["df-ions"] = {
  title: "Ions in an electric field",
  text: "Cations and anions drift in an electric field. A strong attraction pairs them up and lowers the current.",
  details: "30 cations and 30 anions, Brownian dynamics in implicit water, kT = 1, soft repulsion plus screened Coulomb with Debye length 3. D<sub>+</sub> = 1.3, D<sub>&minus;</sub> = 2.0. Dashed: ideal drift v = D q E / kT",
  make() {
    const N = 60, LX = 20, LY = 20 * 7 / 12, dt = 0.002, lam = 3, rc = 7;
    const p = { E: 1, lB: 1 };
    let x, y, ux, q, D, t;
    return {
      perFrame: 4,
      params: [
        { key: "E", label: "field E", min: 0, max: 3, step: 0.1, value: 1 },
        { key: "lB", label: "Coulomb strength", min: 0, max: 8, step: 0.1, value: 1 }
      ],
      set(k, v) { p[k] = v; ux = new Float64Array(N); t = 0; },
      reset() {
        x = new Float64Array(N).map(() => rand() * LX); y = new Float64Array(N).map(() => rand() * LY);
        q = new Float64Array(N).map((_, i) => i < N / 2 ? 1 : -1);
        D = new Float64Array(N).map((_, i) => i < N / 2 ? 1.3 : 2.0);
        ux = new Float64Array(N); t = 0;
      },
      step() {
        for (let s = 0; s < 10; s++) {
          const fx = new Float64Array(N), fy = new Float64Array(N);
          for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
            let dx = x[i] - x[j], dy = y[i] - y[j];
            dx -= LX * Math.round(dx / LX); dy -= LY * Math.round(dy / LY);
            const r = Math.hypot(dx, dy);
            if (r > rc) continue;
            const rr = Math.max(r, 0.7);
            let f = r < 1 ? 40 * (1 - r) : 0;
            f += p.lB * q[i] * q[j] * Math.exp(-rr / lam) * (1 / (rr * rr) + 1 / (rr * lam));
            fx[i] += f * dx / r; fy[i] += f * dy / r; fx[j] -= f * dx / r; fy[j] -= f * dy / r;
          }
          for (let i = 0; i < N; i++) {
            const s2 = Math.sqrt(2 * D[i] * dt);
            const ddx = D[i] * (fx[i] + q[i] * p.E) * dt + s2 * gauss();
            x[i] = (x[i] + ddx + LX) % LX; ux[i] += ddx;
            y[i] = (y[i] + D[i] * fy[i] * dt + s2 * gauss() + LY) % LY;
          }
          t += dt;
        }
      },
      drift(sign) {
        let m = 0, n = 0;
        for (let i = 0; i < N; i++) if (q[i] === sign) { m += ux[i]; n++; }
        return t ? m / n / t : 0;
      },
      draw(ctx, w, h, col) {
        const bw = w * 0.5, s = bw / LX;
        ctx.strokeStyle = col.rule; ctx.strokeRect(0.5, 0.5, bw, LY * s);
        for (let i = 0; i < N; i++) {
          ctx.fillStyle = q[i] > 0 ? col.b : col.a;
          const r = q[i] > 0 ? s * 0.32 : s * 0.42;
          dot(ctx, x[i] * s, y[i] * s, r);
          ctx.strokeStyle = col.paper; ctx.lineWidth = 1.5; ctx.beginPath();
          ctx.moveTo(x[i] * s - r * 0.5, y[i] * s); ctx.lineTo(x[i] * s + r * 0.5, y[i] * s);
          if (q[i] > 0) { ctx.moveTo(x[i] * s, y[i] * s - r * 0.5); ctx.lineTo(x[i] * s, y[i] * s + r * 0.5); }
          ctx.stroke();
        }
        ctx.fillStyle = col.muted; ctx.font = "10px monospace"; ctx.fillText("E →", bw - 30, LY * s + 14);
        const vmax = 2.0 * 3 * 1.1;
        const P = plotBox(ctx, [bw + 40, 14, w - bw - 54, h - 42], [0, 3], [-vmax, vmax], col, "E", "drift v");
        P.hline(0, col.rule);
        P.line([[0, 0], [3, 1.3 * 3]], col.b, 1, [4, 4]);
        P.line([[0, 0], [3, -2.0 * 3]], col.a, 1, [4, 4]);
        P.dots([[p.E, this.drift(1)]], col.b, 5);
        P.dots([[p.E, this.drift(-1)]], col.a, 5);
      },
      info() {
        if (!p.E || t < 0.5) return `t = ${t.toFixed(1)}   set a field to see drift`;
        const r1 = this.drift(1) / (1.3 * p.E), r2 = -this.drift(-1) / (2.0 * p.E);
        return `t = ${t.toFixed(1)}   drift / ideal: cations ${r1.toFixed(2)}, anions ${r2.toFixed(2)}`;
      }
    };
  }
};
