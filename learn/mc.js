// Learn: Monte Carlo sampling

DEMOS["mc-metropolis"] = {
  title: "Metropolis Monte Carlo",
  text: "A random walk that accepts or rejects each trial move so that it visits states with the Boltzmann weight.",
  details: "U(x) = 2 (x&sup2; &minus; 1)&sup2;, kT = 1, trial move x' = x + &delta;(2u &minus; 1), accept with min(1, e<sup>&minus;&Delta;U/kT</sup>). &tau; = integrated autocorrelation time in steps",
  make() {
    const M = 3000, bins = 40, xr = 2;
    const p = { delta: 0.5 };
    let x, chain, hist, nacc, ntry;
    const U = v => 2 * (v * v - 1) ** 2;
    return {
      perFrame: 20,
      params: [{ key: "delta", label: "step size δ", min: 0.02, max: 5, step: 0.02, value: 0.5 }],
      set(k, v) { p[k] = v; chain = []; hist = new Float64Array(bins); nacc = ntry = 0; },
      reset() { x = -1; chain = []; hist = new Float64Array(bins); nacc = ntry = 0; },
      step() {
        const xn = x + p.delta * (2 * rand() - 1);
        ntry++;
        if (rand() < Math.exp(-(U(xn) - U(x)))) { x = xn; nacc++; }
        chain.push(x); if (chain.length > M) chain.shift();
        const b = Math.floor((x + xr) / (2 * xr) * bins); if (b >= 0 && b < bins) hist[b]++;
      },
      tau() {
        const n = chain.length; if (n < 500) return NaN;
        let m = 0; for (const v of chain) m += v; m /= n;
        let c0 = 0; for (const v of chain) c0 += (v - m) ** 2; c0 /= n;
        let tau = 1;
        for (let k = 1; k < n / 3; k++) {
          let c = 0; for (let i = 0; i + k < n; i++) c += (chain[i] - m) * (chain[i + k] - m);
          const r = c / (n - k) / c0; if (r < 0.05) break; tau += 2 * r;
        }
        return tau;
      },
      draw(ctx, w, h, col) {
        const bw = w * 0.55;
        const P = plotBox(ctx, [34, 14, bw - 44, h - 42], [0, M], [-xr, xr], col, "MC step", "x");
        P.line(chain.map((v, k) => [k, v]), col.a, 1);
        const dx = 2 * xr / bins; let tot = 0; for (const v of hist) tot += v;
        const ex = []; let z = 0;
        for (let k = 0; k <= 100; k++) { const v = -xr + 2 * xr * k / 100, e = Math.exp(-U(v)); ex.push([v, e]); z += e * 2 * xr / 100; }
        const Q = plotBox(ctx, [bw + 24, 14, w - bw - 36, h - 42], [-xr, xr], [0, 1.1], col, "x", "P(x)");
        if (tot) {
          ctx.fillStyle = col.b; ctx.globalAlpha = 0.75;
          for (let b = 0; b < bins; b++) { const v = Math.min(1.1, hist[b] / (tot * dx)); ctx.fillRect(Q.X(-xr + b * dx), Q.Y(v), Q.X(dx) - Q.X(0) - 1, Q.Y(0) - Q.Y(v)); }
          ctx.globalAlpha = 1;
        }
        Q.line(ex.map(([a, b]) => [a, b / z]), col.ink, 1.3, [4, 4]);
      },
      info() {
        const t = this.tau();
        return `acceptance ${ntry ? (100 * nacc / ntry).toFixed(0) : 0}%   autocorrelation τ = ${isFinite(t) ? t.toFixed(0) : "-"} steps`;
      }
    };
  }
};

DEMOS["mc-vs-md"] = {
  title: "Monte Carlo and MD give the same averages",
  text: "The same Lennard-Jones fluid, sampled in two ways. MD follows real trajectories, while MC makes random moves with no time at all. The averages agree.",
  details: "2D Lennard-Jones, 64 particles, density 0.5, kT = 1, r<sub>c</sub> = 2.5. Left: Metropolis single-particle moves, &delta; = 0.3, one sweep per frame. Right: Langevin MD, dt = 0.005, 5 steps per frame",
  make() {
    const N = 64, L = Math.sqrt(N / 0.5), kT = 1, d = 0.3;
    let md, mx, my, su, sm, n, nacc, ntry;
    const pairE = (i, xi, yi) => {
      let e = 0;
      for (let j = 0; j < N; j++) {
        if (j === i) continue;
        let dx = xi - mx[j], dy = yi - my[j];
        dx -= L * Math.round(dx / L); dy -= L * Math.round(dy / L);
        const r2 = dx * dx + dy * dy; if (r2 >= 6.25) continue;
        const inv6 = 1 / Math.max(r2, 0.6) ** 3; e += 4 * inv6 * (inv6 - 1);
      }
      return e;
    };
    const totalMC = () => { let e = 0; for (let i = 0; i < N; i++) e += pairE(i, mx[i], my[i]); return e / 2; };
    return {
      perFrame: 1,
      reset() {
        md = new LJBox({ N, LX: L, LY: L, T: kT, thermostat: "langevin", dt: 0.005 });
        mx = Float64Array.from(md.x); my = Float64Array.from(md.y);
        su = sm = n = nacc = ntry = 0;
      },
      step() {
        for (let k = 0; k < N; k++) {
          const i = (rand() * N) | 0, xn = (mx[i] + d * (2 * rand() - 1) + L) % L, yn = (my[i] + d * (2 * rand() - 1) + L) % L;
          const dE = pairE(i, xn, yn) - pairE(i, mx[i], my[i]); ntry++;
          if (dE <= 0 || rand() < Math.exp(-dE / kT)) { mx[i] = xn; my[i] = yn; nacc++; }
        }
        for (let k = 0; k < 5; k++) md.step();
        n++;
        if (n > 150) { su += totalMC() / N; sm += md.pe / N; }
      },
      draw(ctx, w, h, col) {
        const side = Math.min(w / 2 - 16, h - 24), s = side / L, ox = w / 2 + 8;
        ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
        ctx.strokeRect(0.5, 0.5, side, side); ctx.strokeRect(ox + 0.5, 0.5, side, side);
        ctx.fillStyle = col.b; for (let i = 0; i < N; i++) dot(ctx, mx[i] * s, my[i] * s, s * 0.45);
        ctx.fillStyle = col.a; for (let i = 0; i < N; i++) dot(ctx, ox + md.x[i] * s, md.y[i] * s, s * 0.45);
        ctx.fillStyle = col.muted; ctx.font = "10px monospace";
        ctx.fillText("Monte Carlo", 4, side + 14); ctx.fillText("molecular dynamics", ox + 4, side + 14);
      },
      info() {
        const m = n - 150;
        if (m < 1) return "equilibrating";
        return `<U>/N: MC ${(su / m).toFixed(3)}   MD ${(sm / m).toFixed(3)}   MC acceptance ${(100 * nacc / ntry).toFixed(0)}%`;
      }
    };
  }
};

DEMOS["mc-widom"] = {
  title: "Chemical potential by test-particle insertion",
  text: "Ghost particles are dropped at random into a fluid, and the Boltzmann factor of each one is averaged. This average gives the excess chemical potential.",
  details: "2D Lennard-Jones, 100 particles, Langevin thermostat, 200 ghost insertions per frame. &mu;<sub>ex</sub> = &minus;kT ln &lt;e<sup>&minus;&Delta;U/kT</sup>&gt;. Bright ghosts carry e<sup>&minus;&Delta;U/kT</sup> &gt; 0.1",
  make() {
    const N = 100, M = 200;
    const p = { rho: 0.3, T: 1 };
    let box, sum, cnt, ghosts, n, hits, trace;
    return {
      perFrame: 3,
      params: [
        { key: "rho", label: "density ρ", min: 0.05, max: 0.8, step: 0.05, value: 0.3 },
        { key: "T", label: "kT", min: 0.6, max: 2, step: 0.05, value: 1 }
      ],
      set(k, v) { p[k] = v; this.reset(); },
      reset() {
        const LX = Math.sqrt(12 * N / (7 * p.rho));
        box = new LJBox({ N, LX, LY: LX * 7 / 12, T: p.T, thermostat: "langevin", dt: 0.005 });
        sum = 0; cnt = 0; ghosts = []; n = 0; hits = 0; trace = [];
      },
      step() {
        box.step(); n++;
        if (n < 200 || n % 3) return;
        const { x, y, LX, LY } = box; ghosts = [];
        for (let g = 0; g < M; g++) {
          const gx = rand() * LX, gy = rand() * LY; let e = 0;
          for (let i = 0; i < N; i++) {
            let dx = gx - x[i], dy = gy - y[i];
            dx -= LX * Math.round(dx / LX); dy -= LY * Math.round(dy / LY);
            const r2 = dx * dx + dy * dy; if (r2 >= 6.25) continue;
            if (r2 < 0.5) { e = Infinity; break; }
            const inv6 = 1 / (r2 * r2 * r2); e += 4 * inv6 * (inv6 - 1);
          }
          const b = Math.exp(-e / p.T);
          sum += b; cnt++; if (b > 0.1) hits++;
          ghosts.push([gx, gy, b]);
        }
        if (sum > 0) trace.push(-p.T * Math.log(sum / cnt)); if (trace.length > 300) trace.shift();
      },
      draw(ctx, w, h, col) {
        const bw = w * 0.45, s = Math.min(bw / box.LX, (h - 10) / box.LY);
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, box.LX * s, box.LY * s); ctx.clip();
        box.draw(ctx, box.LX * s, box.LY * s, col, col.a, 0.5);
        for (const [gx, gy, b] of ghosts) { ctx.fillStyle = b > 0.1 ? col.b : col.muted; ctx.globalAlpha = b > 0.1 ? 1 : 0.35; dot(ctx, gx * s, gy * s, b > 0.1 ? 2.6 : 1.4); }
        ctx.globalAlpha = 1; ctx.restore();
        ctx.strokeStyle = col.rule; ctx.strokeRect(0.5, 0.5, box.LX * s, box.LY * s);
        const P = plotBox(ctx, [bw + 36, 14, w - bw - 48, h - 42], [0, 300], [-4, 4], col, "frames", "μ_ex running");
        P.hline(0, col.rule);
        P.line(trace.map((v, k) => [k, v]), col.b, 2);
      },
      info() {
        if (!cnt) return "equilibrating";
        if (!sum) return `no ghost has fit in yet, ${cnt} tries`;
        return `μ_ex = ${(-p.T * Math.log(sum / cnt)).toFixed(2)} kT units   useful insertions ${(100 * hits / cnt).toFixed(1)}%   of ${cnt}`;
      }
    };
  }
};
