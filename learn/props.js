// Learn: from fluctuations to measurable properties

DEMOS["pr-fdt"] = {
  title: "Friction and noise belong together",
  text: "Particles in a harmonic trap with a Langevin thermostat. The random kicks must match the friction, or the temperature comes out wrong.",
  details: "300 particles in 2D, U = r&sup2;/2, m = 1, target kT = 1. Kick size = s &radic;(2&gamma;kT dt), so the measured kT is s&sup2;. Dashed: Gaussian at kT = 1",
  make() {
    const N = 300, dt = 0.01;
    const p = { gamma: 1, s: 1 };
    let x, y, vx, vy, hist, nh, t;
    const bins = 40, xr = 4;
    return {
      perFrame: 4,
      params: [
        { key: "gamma", label: "friction γ", min: 0.05, max: 10, step: 0.05, value: 1 },
        { key: "s", label: "noise scale s", min: 0, max: 2, step: 0.05, value: 1 }
      ],
      set(k, v) { p[k] = v; hist = new Float64Array(bins); nh = 0; },
      reset() {
        x = new Float64Array(N).map(() => 3 * (rand() - 0.5)); y = new Float64Array(N).map(() => 3 * (rand() - 0.5));
        vx = new Float64Array(N); vy = new Float64Array(N); hist = new Float64Array(bins); nh = 0; t = 0;
      },
      step() {
        const c1 = Math.exp(-p.gamma * dt), c2 = p.s * Math.sqrt(1 - c1 * c1);
        for (let i = 0; i < N; i++) {
          vx[i] -= 0.5 * dt * x[i]; vy[i] -= 0.5 * dt * y[i];
          x[i] += dt * vx[i]; y[i] += dt * vy[i];
          vx[i] -= 0.5 * dt * x[i]; vy[i] -= 0.5 * dt * y[i];
          vx[i] = c1 * vx[i] + c2 * gauss(); vy[i] = c1 * vy[i] + c2 * gauss();
        }
        t += dt;
        if (Math.round(t / dt) % 5 === 0) { for (let i = 0; i < N; i++) { const b = Math.floor((x[i] + xr) / (2 * xr) * bins); if (b >= 0 && b < bins) hist[b]++; } nh++; }
      },
      draw(ctx, w, h, col) {
        const bw = w * 0.42, cx = bw / 2, cy = h / 2 - 6, sc = (h - 30) / (2 * xr);
        ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
        for (const r of [1, 2, 3]) { ctx.beginPath(); ctx.arc(cx, cy, r * sc, 0, 2 * Math.PI); ctx.stroke(); }
        ctx.fillStyle = col.a; ctx.globalAlpha = 0.7;
        for (let i = 0; i < N; i++) dot(ctx, cx + x[i] * sc, cy + y[i] * sc, 2.4);
        ctx.globalAlpha = 1;
        const dx = 2 * xr / bins;
        const P = plotBox(ctx, [bw + 30, 14, w - bw - 42, h - 42], [-xr, xr], [0, 0.6], col, "x", "P(x)");
        if (nh) {
          ctx.fillStyle = col.b; ctx.globalAlpha = 0.75;
          for (let b = 0; b < bins; b++) {
            const v = Math.min(0.6, hist[b] / (nh * N * dx));
            ctx.fillRect(P.X(-xr + b * dx), P.Y(v), P.X(dx) - P.X(0) - 1, P.Y(0) - P.Y(v));
          }
          ctx.globalAlpha = 1;
        }
        const g = []; for (let k = 0; k <= 100; k++) { const v = -xr + 2 * xr * k / 100; g.push([v, Math.exp(-v * v / 2) / Math.sqrt(2 * Math.PI)]); }
        P.line(g, col.ink, 1.3, [4, 4]);
      },
      info() {
        let kx = 0, kv = 0; for (let i = 0; i < N; i++) { kx += x[i] ** 2 + y[i] ** 2; kv += vx[i] ** 2 + vy[i] ** 2; }
        return `t = ${t.toFixed(1)}   kT from positions ${(kx / (2 * N)).toFixed(2)}, from velocities ${(kv / (2 * N)).toFixed(2)}   target 1`;
      }
    };
  }
};

DEMOS["pr-virial"] = {
  title: "Pressure from the virial",
  text: "The pressure of a Lennard-Jones fluid is the sum of an ideal gas part, which comes from the momenta, and a virial part, which comes from the forces.",
  hint: "Change the density a few times. Each density leaves a point on the equation of state.",
  details: "2D Lennard-Jones, 100 particles, r<sub>c</sub> = 2.5, Berendsen thermostat. P = (NkT + &frac12;&Sigma; r<sub>ij</sub>&middot;f<sub>ij</sub>) / A. Dashed: ideal gas P = &rho;kT",
  make() {
    const N = 100;
    const p = { rho: 0.3, T: 1.0 };
    let box, acc, pts, n;
    const virial = () => {
      let w = 0; const { x, y, LX, LY } = box;
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        let dx = x[i] - x[j], dy = y[i] - y[j];
        dx -= LX * Math.round(dx / LX); dy -= LY * Math.round(dy / LY);
        const r2 = dx * dx + dy * dy; if (r2 >= 6.25) continue;
        const inv2 = 1 / Math.max(r2, 0.6), inv6 = inv2 * inv2 * inv2;
        w += 24 * inv6 * (2 * inv6 - 1);
      }
      return w;
    };
    return {
      perFrame: 4,
      params: [
        { key: "rho", label: "density ρ", min: 0.05, max: 0.85, step: 0.05, value: 0.3 },
        { key: "T", label: "kT", min: 0.45, max: 2, step: 0.05, value: 1 }
      ],
      set(k, v) { p[k] = v; if (k === "T") pts = []; this.build(); },
      build() {
        const LX = Math.sqrt(12 * N / (7 * p.rho));
        box = new LJBox({ N, LX, LY: LX * 7 / 12, T: p.T, dt: 0.004 });
        acc = { id: 0, vir: 0 }; n = 0;
      },
      reset() { pts = []; this.build(); },
      step() {
        box.step(); n++;
        if (n > 300 && n % 5 === 0) {
          const A = box.LX * box.LY;
          acc.id += N * box.Tnow / A; acc.vir += 0.5 * virial() / A; acc.n = (acc.n || 0) + 1;
          const key = p.rho.toFixed(2);
          const P = (acc.id + acc.vir) / acc.n;
          const old = pts.find(q => q.key === key);
          if (old) old.P = P; else pts.push({ key, rho: p.rho, P });
        }
      },
      draw(ctx, w, h, col) {
        const bw = w * 0.42, s = Math.min(bw / box.LX, (h - 10) / box.LY);
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, box.LX * s, box.LY * s); ctx.clip();
        box.draw(ctx, box.LX * s, box.LY * s, col, col.a, 0.5);
        ctx.restore();
        ctx.strokeStyle = col.rule; ctx.strokeRect(0.5, 0.5, box.LX * s, box.LY * s);
        const top = Math.max(1.2, 0.9 * p.T, ...pts.map(q => q.P)) * 1.15, bot = Math.min(-0.3, ...pts.map(q => q.P)) * 1.15;
        const P = plotBox(ctx, [bw + 36, 14, w - bw - 48, h - 42], [0, 0.9], [bot, top], col, "density ρ", "P");
        P.hline(0, col.rule);
        P.line([[0, 0], [0.9, 0.9 * p.T]], col.muted, 1.3, [4, 4]);
        const sorted = pts.slice().sort((a, b) => a.rho - b.rho);
        P.line(sorted.map(q => [q.rho, q.P]), col.b, 1.2);
        P.dots(sorted.map(q => [q.rho, q.P]), col.b, 4);
      },
      info() {
        if (!acc.n) return "equilibrating";
        return `ideal part ${(acc.id / acc.n).toFixed(2)}   virial part ${(acc.vir / acc.n).toFixed(2)}   P = ${((acc.id + acc.vir) / acc.n).toFixed(2)}`;
      }
    };
  }
};

DEMOS["pr-vacf"] = {
  title: "Velocity autocorrelation and Green-Kubo",
  text: "This shows how long a particle remembers its velocity. The integral of this memory gives the diffusion coefficient.",
  details: "2D Lennard-Jones, 100 particles, NVE at kT &asymp; 1, averaged over all particles and time origins. D = &frac12; &int; &lt;v(0)&middot;v(t)&gt; dt",
  make() {
    const N = 100, every = 5, lags = 100, dt = 0.004, tf = every * dt;
    const p = { rho: 0.3 };
    let box, hist, acc, cnt, n;
    return {
      perFrame: 6,
      params: [{ key: "rho", label: "density ρ", min: 0.05, max: 0.8, step: 0.05, value: 0.3 }],
      set(k, v) { p[k] = v; this.reset(); },
      reset() {
        const LX = Math.sqrt(12 * N / (7 * p.rho));
        box = new LJBox({ N, LX, LY: LX * 7 / 12, T: 1, dt, thermostat: "berendsen" });
        hist = []; acc = new Float64Array(lags); cnt = new Float64Array(lags); n = 0;
      },
      step() {
        n++;
        if (n === 400) box.thermostat = "none";
        box.step();
        if (n < 500 || n % every) return;
        hist.push([Float64Array.from(box.vx), Float64Array.from(box.vy)]);
        if (hist.length > lags) hist.shift();
        const now = hist.length - 1, [ux, uy] = hist[now];
        for (let k = 0; k <= now; k++) {
          const [ox, oy] = hist[now - k];
          let c = 0; for (let i = 0; i < N; i++) c += ox[i] * ux[i] + oy[i] * uy[i];
          acc[k] += c / N; cnt[k]++;
        }
      },
      curve() { const c = []; for (let k = 0; k < lags; k++) if (cnt[k]) c.push([k * tf, acc[k] / cnt[k]]); return c; },
      D() {
        const c = this.curve(); let d = 0;
        for (let k = 1; k < c.length; k++) d += 0.5 * (c[k][1] + c[k - 1][1]) * tf;
        return d / 2;
      },
      draw(ctx, w, h, col) {
        const bw = w * 0.4, s = Math.min(bw / box.LX, (h - 10) / box.LY);
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, box.LX * s, box.LY * s); ctx.clip();
        box.draw(ctx, box.LX * s, box.LY * s, col, col.a, 0.5);
        ctx.restore();
        ctx.strokeStyle = col.rule; ctx.strokeRect(0.5, 0.5, box.LX * s, box.LY * s);
        const c = this.curve(), c0 = c.length ? c[0][1] : 1;
        const P = plotBox(ctx, [bw + 36, 14, w - bw - 48, h - 42], [0, lags * tf], [-0.25, 1.05], col, "time t", "C(t) / C(0)");
        P.hline(0, col.rule);
        P.line(c.map(([a, b]) => [a, b / c0]), col.b, 2);
      },
      info() {
        if (!cnt[0]) return "equilibrating";
        return `Green-Kubo D (up to t = ${(lags * tf).toFixed(1)}) = ${this.D().toFixed(3)}   origins ${cnt[0]}`;
      }
    };
  }
};
