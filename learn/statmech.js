// Learn: statistical mechanics behind MD

DEMOS["sm-boltzmann"] = {
  title: "The Boltzmann distribution",
  text: "Particles moving with random thermal kicks in a double well settle into the Boltzmann distribution.",
  details: "400 independent overdamped Langevin particles, U(x) = h (x&sup2; &minus; 1)&sup2; + 0.3 t x, dt = 0.002. Dashed: exp(&minus;U/kT)/Z",
  make() {
    const N = 400, dt = 0.002, bins = 50, xr = 2.2;
    const p = { kT: 1, h: 2, tilt: 0 };
    let x, hist, nsamp, t;
    const U = v => p.h * (v * v - 1) ** 2 + 0.3 * p.tilt * v;
    const dU = v => 4 * p.h * v * (v * v - 1) + 0.3 * p.tilt;
    return {
      perFrame: 10,
      params: [
        { key: "kT", label: "kT", min: 0.2, max: 3, step: 0.05, value: 1 },
        { key: "h", label: "barrier h", min: 0, max: 5, step: 0.1, value: 2 },
        { key: "tilt", label: "tilt", min: -3, max: 3, step: 0.1, value: 0 }
      ],
      set(k, v) { p[k] = v; hist = new Float64Array(bins); nsamp = 0; },
      reset() { x = new Float64Array(N).map(() => -1 + 0.1 * gauss()); hist = new Float64Array(bins); nsamp = 0; t = 0; },
      step() {
        const s = Math.sqrt(2 * p.kT * dt);
        for (let i = 0; i < N; i++) {
          x[i] += -dU(x[i]) * dt + s * gauss();
          if (x[i] > xr) x[i] = 2 * xr - x[i];
          if (x[i] < -xr) x[i] = -2 * xr - x[i];
        }
        t += dt;
        if (t > 0.5) { for (let i = 0; i < N; i++) { const b = Math.floor((x[i] + xr) / (2 * xr) * bins); if (b >= 0 && b < bins) hist[b]++; } nsamp++; }
      },
      exact() {
        const pts = []; let z = 0;
        for (let k = 0; k <= 200; k++) { const v = -xr + 2 * xr * k / 200; const e = Math.exp(-U(v) / p.kT); pts.push([v, e]); z += e * 2 * xr / 200; }
        return pts.map(([a, b]) => [a, b / z]);
      },
      draw(ctx, w, h, col) {
        const bw = w * 0.46;
        let umax = Math.max(U(-xr), U(xr)), umin = Infinity;
        for (let k = 0; k <= 100; k++) umin = Math.min(umin, U(-xr + 2 * xr * k / 100));
        umax = Math.min(umax, umin + 3 * p.h + 6);
        const P = plotBox(ctx, [30, 14, bw - 40, h - 42], [-xr, xr], [umin - 0.3, umax], col, "x", "U(x)");
        const cur = []; for (let k = 0; k <= 120; k++) { const v = -xr + 2 * xr * k / 120; cur.push([v, U(v)]); }
        P.line(cur, col.muted, 1.5);
        ctx.fillStyle = col.a; ctx.globalAlpha = 0.5;
        for (let i = 0; i < N; i++) dot(ctx, P.X(x[i]), P.Y(U(x[i])) - 3 - (i % 7) * 2.2, 2.2);
        ctx.globalAlpha = 1;
        const ex = this.exact(), top = Math.max(...ex.map(q => q[1])) * 1.2, dx = 2 * xr / bins;
        const Q = plotBox(ctx, [bw + 26, 14, w - bw - 38, h - 42], [-xr, xr], [0, top], col, "x", "P(x)");
        if (nsamp) {
          ctx.fillStyle = col.b; ctx.globalAlpha = 0.75;
          for (let b = 0; b < bins; b++) {
            const v = hist[b] / (nsamp * N * dx), x0 = Q.X(-xr + b * dx), x1 = Q.X(-xr + (b + 1) * dx);
            ctx.fillRect(x0, Q.Y(Math.min(v, top)), x1 - x0 - 1, Q.Y(0) - Q.Y(Math.min(v, top)));
          }
          ctx.globalAlpha = 1;
        }
        Q.line(ex, col.ink, 1.3, [4, 4]);
      },
      info() {
        let r = 0; for (let i = 0; i < N; i++) if (x[i] > 0) r++;
        let a = 0, b = 0; for (const [v, e] of this.exact()) { if (v > 0) a += e; else b += e; }
        return `right well now ${(100 * r / N).toFixed(0)}%   Boltzmann says ${(100 * a / (a + b)).toFixed(0)}%`;
      }
    };
  }
};

DEMOS["sm-maxwell"] = {
  title: "Speeds and equipartition",
  text: "Every particle starts with the same speed. Collisions alone spread the speeds into the Maxwell-Boltzmann distribution.",
  details: "2D Lennard-Jones, 120 particles, NVE, density 0.4. Dashed: 2D Maxwell-Boltzmann P(v) = (v/kT) exp(&minus;v&sup2;/2kT) with kT from the kinetic energy",
  make() {
    const N = 120, bins = 30, vmax = 5;
    const p = { v0: 1.5 };
    let box, hist, frames;
    return {
      perFrame: 4,
      params: [{ key: "v0", label: "starting speed", min: 0.5, max: 2.5, step: 0.1, value: 1.5 }],
      set(k, v) { p[k] = v; this.reset(); },
      reset() {
        const LX = Math.sqrt(12 * N / (7 * 0.4));
        box = new LJBox({ N, LX, LY: LX * 7 / 12, T: 1, thermostat: "none", dt: 0.004 });
        for (let i = 0; i < N; i++) { const a = rand() * 2 * Math.PI; box.vx[i] = p.v0 * Math.cos(a); box.vy[i] = p.v0 * Math.sin(a); }
        hist = []; frames = 0;
      },
      step() {
        box.step(); frames++;
        if (frames % 4) return;
        const hh = new Float64Array(bins);
        for (let i = 0; i < N; i++) { const b = Math.floor(Math.hypot(box.vx[i], box.vy[i]) / vmax * bins); if (b < bins) hh[b]++; }
        hist.push(hh); if (hist.length > 25) hist.shift();
      },
      kT() { let k = 0; for (let i = 0; i < N; i++) k += box.vx[i] ** 2 + box.vy[i] ** 2; return k / (2 * N); },
      draw(ctx, w, h, col) {
        const bw = w * 0.46, s = bw / box.LX;
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, bw, box.LY * s); ctx.clip();
        for (let i = 0; i < N; i++) {
          const v = Math.hypot(box.vx[i], box.vy[i]);
          ctx.fillStyle = v > p.v0 * 1.2 ? col.b : col.a;
          dot(ctx, box.x[i] * s, box.y[i] * s, s * 0.45);
        }
        ctx.restore();
        ctx.strokeStyle = col.rule; ctx.strokeRect(0.5, 0.5, bw, box.LY * s);
        const kT = this.kT(), dv = vmax / bins;
        const sum = new Float64Array(bins); for (const hh of hist) for (let b = 0; b < bins; b++) sum[b] += hh[b];
        const top = Math.max(1 / Math.sqrt(kT) * 0.7, 0.3) * 1.5;
        const P = plotBox(ctx, [bw + 30, 14, w - bw - 42, h - 42], [0, vmax], [0, top], col, "speed v", "P(v)");
        if (hist.length) {
          ctx.fillStyle = col.b; ctx.globalAlpha = 0.75;
          for (let b = 0; b < bins; b++) {
            const v = Math.min(top, sum[b] / (hist.length * N * dv));
            ctx.fillRect(P.X(b * dv), P.Y(v), P.X(dv) - P.X(0) - 1, P.Y(0) - P.Y(v));
          }
          ctx.globalAlpha = 1;
        }
        const th = []; for (let k = 0; k <= 100; k++) { const v = vmax * k / 100; th.push([v, v / kT * Math.exp(-v * v / (2 * kT))]); }
        P.line(th, col.ink, 1.3, [4, 4]);
      },
      info() {
        let ax = 0, ay = 0; for (let i = 0; i < N; i++) { ax += box.vx[i] ** 2; ay += box.vy[i] ** 2; }
        return `t = ${box.t.toFixed(1)}   kT = ${this.kT().toFixed(2)}   <vx²>/2 = ${(ax / (2 * N)).toFixed(2)}   <vy²>/2 = ${(ay / (2 * N)).toFixed(2)}`;
      }
    };
  }
};

DEMOS["sm-fluct"] = {
  title: "Energy fluctuations and heat capacity",
  text: "Oscillators in contact with a heat bath. The total energy fluctuates, and the size of the fluctuations gives the heat capacity.",
  details: "N independent 2D harmonic oscillators, m = k = 1, Langevin bath with &gamma; = 1. Exact: &lt;E&gt; = 2NkT, C<sub>V</sub> = 2Nk, &sigma;<sub>E</sub>/&lt;E&gt; = 1/&radic;(2N)",
  make() {
    const dt = 0.02;
    const p = { N: 20, kT: 1, bath: 1 };
    let x, y, vx, vy, trace, s1, s2, ns, t;
    const energy = () => { let e = 0; for (let i = 0; i < p.N; i++) e += 0.5 * (x[i] ** 2 + y[i] ** 2 + vx[i] ** 2 + vy[i] ** 2); return e; };
    return {
      perFrame: 5,
      params: [
        { key: "N", label: "oscillators N", min: 1, max: 200, step: 1, value: 20 },
        { key: "kT", label: "bath kT", min: 0.2, max: 2, step: 0.05, value: 1 },
        { key: "bath", label: "bath off 0 / on 1", min: 0, max: 1, step: 1, value: 1 }
      ],
      set(k, v) { p[k] = v; if (k === "N") this.reset(); else { trace = []; s1 = s2 = ns = 0; } },
      reset() {
        const N = p.N, s = Math.sqrt(p.kT);
        x = new Float64Array(N).map(() => s * gauss()); y = new Float64Array(N).map(() => s * gauss());
        vx = new Float64Array(N).map(() => s * gauss()); vy = new Float64Array(N).map(() => s * gauss());
        trace = []; s1 = s2 = ns = 0; t = 0;
      },
      step() {
        const c1 = Math.exp(-dt), c2 = Math.sqrt((1 - c1 * c1) * p.kT);
        for (let i = 0; i < p.N; i++) {
          vx[i] -= 0.5 * dt * x[i]; vy[i] -= 0.5 * dt * y[i];
          x[i] += dt * vx[i]; y[i] += dt * vy[i];
          vx[i] -= 0.5 * dt * x[i]; vy[i] -= 0.5 * dt * y[i];
          if (p.bath) { vx[i] = c1 * vx[i] + c2 * gauss(); vy[i] = c1 * vy[i] + c2 * gauss(); }
        }
        t += dt;
        const e = energy() / p.N;
        trace.push(e); if (trace.length > 600) trace.shift();
        s1 += e; s2 += e * e; ns++;
      },
      draw(ctx, w, h, col) {
        const bw = w * 0.36, n = Math.ceil(Math.sqrt(p.N * 1.4)), rows = Math.ceil(p.N / n);
        const cw = bw / n, ch = (h - 20) / Math.max(rows, 1), r = Math.min(cw, ch) * 0.5, sc = r / (3 * Math.sqrt(2));
        for (let i = 0; i < p.N; i++) {
          const cx = (i % n + 0.5) * cw, cy = 10 + (Math.floor(i / n) + 0.5) * ch;
          ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + x[i] * sc, cy + y[i] * sc); ctx.stroke();
          ctx.fillStyle = col.a; dot(ctx, cx + x[i] * sc, cy + y[i] * sc, Math.max(1.5, r * 0.22));
        }
        const top = 2 * p.kT * 2.5;
        const P = plotBox(ctx, [bw + 34, 14, w - bw - 46, h - 42], [0, 600], [0, top], col, "time", "E / N");
        P.hline(2 * p.kT, col.muted);
        P.line(trace.map((v, k) => [k, v]), col.b, 1.5);
      },
      info() {
        if (ns < 50) return "collecting";
        const m = s1 / ns, v = s2 / ns - m * m;
        const cv = p.N * p.N * v / (p.kT * p.kT);
        return `<E>/N = ${m.toFixed(2)} (2kT = ${(2 * p.kT).toFixed(2)})   Cv from fluctuations = ${cv.toFixed(1)}  (exact ${2 * p.N})`;
      }
    };
  }
};

DEMOS["sm-entropy"] = {
  title: "Entropy and the arrow of time",
  text: "A gas released from one half of a box spreads out, and its coarse-grained entropy rises. If you reverse every velocity, the gas goes back.",
  hint: "Click the box to reverse every velocity.",
  details: "non-interacting particles with hard walls, coarse-grained entropy S = &minus;&Sigma; p ln p over an 8 &times; 4 grid of cells, maximum ln 32 = 3.47",
  make() {
    const LX = 12, LY = 7, dt = 0.01, nx = 8, ny = 4;
    const p = { N: 300 };
    let x, y, vx, vy, trace, t;
    const S = () => {
      const c = new Float64Array(nx * ny);
      for (let i = 0; i < p.N; i++) c[Math.min(ny - 1, Math.floor(y[i] / LY * ny)) * nx + Math.min(nx - 1, Math.floor(x[i] / LX * nx))]++;
      let s = 0; for (const n of c) if (n) s -= n / p.N * Math.log(n / p.N);
      return s;
    };
    return {
      perFrame: 2,
      params: [{ key: "N", label: "particles", min: 10, max: 1000, step: 10, value: 300 }],
      set(k, v) { p[k] = v; this.reset(); },
      reset() {
        const N = p.N;
        x = new Float64Array(N).map(() => rand() * LX / 4); y = new Float64Array(N).map(() => rand() * LY);
        vx = new Float64Array(N); vy = new Float64Array(N);
        for (let i = 0; i < N; i++) { const a = rand() * 2 * Math.PI, v = 1.5 + 0.5 * gauss(); vx[i] = v * Math.cos(a); vy[i] = v * Math.sin(a); }
        trace = [S()]; t = 0;
      },
      click() { for (let i = 0; i < p.N; i++) { vx[i] = -vx[i]; vy[i] = -vy[i]; } },
      step() {
        for (let i = 0; i < p.N; i++) {
          x[i] += vx[i] * dt; y[i] += vy[i] * dt;
          if (x[i] < 0) { x[i] = -x[i]; vx[i] = -vx[i]; } if (x[i] > LX) { x[i] = 2 * LX - x[i]; vx[i] = -vx[i]; }
          if (y[i] < 0) { y[i] = -y[i]; vy[i] = -vy[i]; } if (y[i] > LY) { y[i] = 2 * LY - y[i]; vy[i] = -vy[i]; }
        }
        t += dt;
        if (Math.round(t / dt) % 5 === 0) { trace.push(S()); if (trace.length > 500) trace.shift(); }
      },
      draw(ctx, w, h, col) {
        const bw = w * 0.5, s = Math.min(bw / LX, (h - 8) / LY);
        ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
        for (let k = 1; k < nx; k++) { ctx.beginPath(); ctx.moveTo(k * LX / nx * s, 0); ctx.lineTo(k * LX / nx * s, LY * s); ctx.stroke(); }
        for (let k = 1; k < ny; k++) { ctx.beginPath(); ctx.moveTo(0, k * LY / ny * s); ctx.lineTo(LX * s, k * LY / ny * s); ctx.stroke(); }
        ctx.strokeRect(0.5, 0.5, LX * s, LY * s);
        ctx.fillStyle = col.a;
        for (let i = 0; i < p.N; i++) dot(ctx, x[i] * s, y[i] * s, 2.2);
        const P = plotBox(ctx, [bw + 34, 14, w - bw - 46, h - 42], [0, 500], [0, 3.8], col, "time", "S / k");
        P.hline(Math.log(nx * ny), col.muted);
        P.line(trace.map((v, k) => [k, v]), col.b, 1.8);
      },
      info() { return `t = ${t.toFixed(1)}   S = ${S().toFixed(2)}   max ${Math.log(nx * ny).toFixed(2)}`; }
    };
  }
};

DEMOS["sm-ergodic"] = {
  title: "Time average vs ensemble average",
  text: "One particle in a symmetric double well. The ensemble average of x is zero, but the time average only gets there if the particle crosses the barrier often enough.",
  details: "overdamped Langevin, U(x) = h (x&sup2; &minus; 1)&sup2;, kT = 1, dt = 0.002. Kramers: crossing time grows like e<sup>h/kT</sup>",
  make() {
    const dt = 0.002;
    const p = { h: 3 };
    let x, trace, sum, n, cross, side, t;
    return {
      perFrame: 40,
      params: [{ key: "h", label: "barrier h / kT", min: 0, max: 10, step: 0.25, value: 3 }],
      set(k, v) { p[k] = v; this.reset(); },
      reset() { x = -1; trace = []; sum = 0; n = 0; cross = 0; side = -1; t = 0; },
      step() {
        x += -4 * p.h * x * (x * x - 1) * dt + Math.sqrt(2 * dt) * gauss();
        t += dt; sum += x; n++;
        if (x > 0.7 && side < 0) { side = 1; cross++; } else if (x < -0.7 && side > 0) { side = -1; cross++; }
        if (n % 20 === 0) { trace.push([x, sum / n]); if (trace.length > 800) trace.shift(); }
      },
      draw(ctx, w, h, col) {
        const P = plotBox(ctx, [44, 14, w - 60, h - 42], [0, 800], [-2, 2], col, "time", "x");
        P.hline(0, col.rule);
        P.line(trace.map((q, k) => [k, q[0]]), col.a, 1.2);
        P.line(trace.map((q, k) => [k, q[1]]), col.b, 2.5);
        ctx.fillStyle = col.b; ctx.font = "10px monospace"; ctx.fillText("running time average", 52, h - 34);
      },
      info() { return `t = ${t.toFixed(0)}   crossings ${cross}   time average <x> = ${(n ? sum / n : 0).toFixed(2)}   ensemble average 0`; }
    };
  }
};
