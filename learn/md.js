// Learn: MD basics

DEMOS["md-integrator"] = {
  title: "Euler vs velocity Verlet",
  text: "",
  details: "harmonic oscillator, m = k = 1, exact orbit is the dashed circle",
  make() {
    const p = { dt: 0.1 };
    let e, v, t, trailE, trailV;
    const energy = ([x, u]) => 0.5 * (x * x + u * u);
    return {
      perFrame: 1,
      params: [{ key: "dt", label: "time step dt", min: 0.01, max: 0.6, step: 0.01, value: 0.1 }],
      set(k, val) { p[k] = val; this.reset(); },
      reset() { e = [1, 0]; v = [1, 0]; t = 0; trailE = [[...e]]; trailV = [[...v]]; },
      step() {
        if (t > 60) return;
        const dt = p.dt;
        e = [e[0] + dt * e[1], e[1] - dt * e[0]];
        const vh = v[1] - 0.5 * dt * v[0], xn = v[0] + dt * vh;
        v = [xn, vh - 0.5 * dt * xn];
        t += dt;
        trailE.push([...e]); trailV.push([...v]);
      },
      draw(ctx, w, h, col) {
        const half = w / 2, r = Math.min(half, h) * 0.32;
        [[trailE, col.b, "Euler", e], [trailV, col.a, "velocity Verlet", v]].forEach(([tr, c, name, s], k) => {
          const ox = half * k + half / 2, oy = h / 2;
          ctx.strokeStyle = col.rule; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(ox, oy, r, 0, 2 * Math.PI); ctx.stroke(); ctx.setLineDash([]);
          ctx.strokeStyle = c; ctx.lineWidth = 1.5; ctx.beginPath();
          tr.forEach(([a, b], i) => { const px = ox + a * r, py = oy - b * r; if (Math.abs(a) > 3) return; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
          ctx.stroke();
          ctx.fillStyle = c; if (Math.abs(s[0]) < 3) dot(ctx, ox + s[0] * r, oy - s[1] * r, 4);
          ctx.fillStyle = col.muted; ctx.font = "11px monospace";
          ctx.fillText(name, ox - r, 16);
          ctx.fillText(`E/E0 = ${(energy(s) / 0.5).toFixed(3)}`, ox - r, 30);
          ctx.fillText("x", ox + r + 4, oy + 4); ctx.fillText("v", ox - 3, oy - r - 6);
        });
      },
      info() { return `t = ${t.toFixed(1)}`; }
    };
  }
};

DEMOS["md-pbc"] = {
  title: "Periodic boundaries and the minimum image",
  text: "",
  hint: "Click a particle to select it. Lines go to every neighbor inside the cutoff, using the nearest image.",
  details: "the faded copies are images of the central box",
  make() {
    const L = 6, N = 22;
    const p = { rc: 2 };
    let x, y, vx, vy, sel;
    return {
      perFrame: 1,
      params: [{ key: "rc", label: "cutoff r_c", min: 0.5, max: 3, step: 0.1, value: 2 }],
      set(k, v) { p[k] = v; },
      reset() {
        x = Array.from({ length: N }, () => rand() * L); y = Array.from({ length: N }, () => rand() * L);
        vx = x.map(() => 0.02 * gauss()); vy = x.map(() => 0.02 * gauss()); sel = 0;
      },
      click(px, py, w, h) {
        const s = h / (L * 1.6), ox = w / 2 - L * s / 2, oy = h / 2 - L * s / 2;
        let best = 0, bd = Infinity;
        for (let i = 0; i < N; i++) { const d = (ox + x[i] * s - px) ** 2 + (oy + y[i] * s - py) ** 2; if (d < bd) { bd = d; best = i; } }
        sel = best;
      },
      step() { for (let i = 0; i < N; i++) { x[i] = (x[i] + vx[i] + L) % L; y[i] = (y[i] + vy[i] + L) % L; } },
      draw(ctx, w, h, col) {
        const s = h / (L * 1.6), ox = w / 2 - L * s / 2, oy = h / 2 - L * s / 2;
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
          ctx.globalAlpha = a || b ? 0.25 : 1;
          ctx.fillStyle = col.a;
          for (let i = 0; i < N; i++) dot(ctx, ox + (x[i] + a * L) * s, oy + (y[i] + b * L) * s, 4);
        }
        ctx.globalAlpha = 1;
        ctx.strokeStyle = col.ink; ctx.lineWidth = 1.5; ctx.strokeRect(ox, oy, L * s, L * s);
        let count = 0;
        ctx.strokeStyle = col.b; ctx.lineWidth = 1.5;
        for (let j = 0; j < N; j++) {
          if (j === sel) continue;
          let dx = x[j] - x[sel], dy = y[j] - y[sel];
          dx -= L * Math.round(dx / L); dy -= L * Math.round(dy / L);
          if (dx * dx + dy * dy > p.rc * p.rc) continue;
          count++;
          ctx.beginPath(); ctx.moveTo(ox + x[sel] * s, oy + y[sel] * s); ctx.lineTo(ox + (x[sel] + dx) * s, oy + (y[sel] + dy) * s); ctx.stroke();
        }
        ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(ox + x[sel] * s, oy + y[sel] * s, p.rc * s, 0, 2 * Math.PI); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = col.b; dot(ctx, ox + x[sel] * s, oy + y[sel] * s, 6);
        this.count = count;
      },
      info() { return `neighbors inside cutoff = ${this.count ?? 0}   box L = ${L}`; }
    };
  }
};

DEMOS["md-thermostat"] = {
  title: "Thermostats",
  text: "If you heat the crystal until it melts, you can compare how different thermostats hold the temperature.",
  details: "80 LJ particles, target T* = 1 then changed by the slider, trace of the instantaneous temperature",
  make() {
    const kinds = ["none", "berendsen", "langevin"];
    const p = { kind: 1, T: 1 };
    let sys, trace;
    return {
      perFrame: 4,
      params: [
        { key: "kind", label: "0 none, 1 Berendsen, 2 Langevin", min: 0, max: 2, step: 1, value: 1 },
        { key: "T", label: "target T*", min: 0.3, max: 2, step: 0.05, value: 1 }
      ],
      set(k, v) { p[k] = v; sys.thermostat = kinds[p.kind]; sys.T = p.T; },
      reset() { sys = new LJBox({ N: 80, LX: 16, LY: 16 * 0.55, T: p.T, thermostat: kinds[p.kind], dt: 0.004 }); trace = []; },
      step() { sys.step(); if (Math.round(sys.t / sys.dt) % 4 === 0) { trace.push(sys.Tnow); if (trace.length > 300) trace.shift(); } },
      draw(ctx, w, h, col) {
        const bw = w * 0.5;
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, bw, h); ctx.clip();
        const s = bw / sys.LX, oy = (h - sys.LY * s) / 2;
        ctx.fillStyle = col.a;
        for (let i = 0; i < sys.N; i++) dot(ctx, sys.x[i] * s, oy + sys.y[i] * s, s * 0.45);
        ctx.strokeStyle = col.rule; ctx.strokeRect(0.5, oy, bw - 1, sys.LY * s);
        ctx.restore();
        const P = plotBox(ctx, [bw + 30, 20, w - bw - 44, h - 50], [0, 300], [0, 2.5], col, "time", "T*");
        P.hline(p.T, col.b);
        P.line(trace.map((v, i) => [i, v]), col.a, 1.5);
      },
      info() { return `thermostat: ${kinds[p.kind]}   T* now = ${(sys.Tnow || 0).toFixed(2)}`; }
    };
  }
};

DEMOS["md-cutoff"] = {
  title: "Cutting off the potential",
  text: "",
  details: "Lennard-Jones in reduced units. Plain cut: energy jumps at r<sub>c</sub>. Shifted: U(r) &minus; U(r<sub>c</sub>), continuous energy but the force still jumps. Force-shifted: both go smoothly to zero",
  make() {
    const p = { rc: 2.5, kind: 1 };
    const lj = r => 4 * (r ** -12 - r ** -6), f = r => 24 * (2 * r ** -13 - r ** -7);
    return {
      perFrame: 1,
      params: [
        { key: "rc", label: "cutoff r_c", min: 1.2, max: 3.5, step: 0.05, value: 2.5 },
        { key: "kind", label: "0 cut, 1 shifted, 2 force-shifted", min: 0, max: 2, step: 1, value: 1 }
      ],
      set(k, v) { p[k] = v; },
      reset() {}, step() {},
      draw(ctx, w, h, col) {
        const half = w / 2, rc = p.rc;
        const U = r => r > rc ? 0 : p.kind === 0 ? lj(r) : p.kind === 1 ? lj(r) - lj(rc) : lj(r) - lj(rc) + (r - rc) * f(rc);
        const F = r => r > rc ? 0 : p.kind === 2 ? f(r) - f(rc) : f(r);
        const A = plotBox(ctx, [34, 14, half - 50, h - 42], [0.9, 3.6], [-1.2, 1], col, "r", "U");
        const B = plotBox(ctx, [half + 34, 14, half - 50, h - 42], [0.9, 3.6], [-3, 3], col, "r", "F");
        A.hline(0, col.rule); B.hline(0, col.rule);
        const full = [], fu = [], ff = [], fb = [];
        for (let k = 0; k <= 300; k++) { const r = 0.9 + 2.7 * k / 300; full.push([r, lj(r)]); fu.push([r, U(r)]); fb.push([r, f(r)]); ff.push([r, F(r)]); }
        A.line(full, col.muted, 1.5, [4, 3]); A.line(fu, col.a, 2.5);
        B.line(fb, col.muted, 1.5, [4, 3]); B.line(ff, col.b, 2.5);
      },
      info() { return `U(r_c) of the full potential = ${(4 * (p.rc ** -12 - p.rc ** -6)).toFixed(4)}`; }
    };
  }
};

DEMOS["md-eom"] = {
  title: "Six equations of motion, one system",
  text: "The same liquid, moved by Euler, Verlet, Langevin, Brownian, DPD, and Nos&eacute;-Hoover dynamics, side by side.",
  details: "36 LJ particles, &rho; = 0.73, the same start (T = 1.6) copied six times. Euler and velocity Verlet are plain Newton (NVE). Langevin, Brownian (overdamped, no velocities), DPD (pairwise friction and noise, r<sub>c</sub> = 1.5) and Nos&eacute;-Hoover hold the target T. Energy plot: change in total energy per particle (for Nos&eacute;-Hoover, including the thermostat's own energy)",
  make() {
    const N = 36, L = 7;
    const names = ["Euler", "velocity Verlet", "Langevin", "Brownian", "DPD", "Nosé-Hoover"];
    const p = { dt: 0.005, T: 1, gamma: 1 };
    let sys, hist, t;
    const forces = s => {
      s.fx.fill(0); s.fy.fill(0); let pe = 0;
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        let dx = s.x[i] - s.x[j], dy = s.y[i] - s.y[j];
        dx -= L * Math.round(dx / L); dy -= L * Math.round(dy / L);
        const r2 = dx * dx + dy * dy; if (r2 > 6.25) continue;
        const i2 = 1 / Math.max(r2, 0.6), i6 = i2 * i2 * i2, f = 24 * i2 * i6 * (2 * i6 - 1);
        pe += 4 * i6 * (i6 - 1) + 0.0163;
        s.fx[i] += f * dx; s.fy[i] += f * dy; s.fx[j] -= f * dx; s.fy[j] -= f * dy;
      }
      s.pe = pe;
    };
    // DPD pair friction and noise, added to the conservative forces
    const dpd = (s, dt) => {
      const g = p.gamma * 4, sg = Math.sqrt(2 * g * p.T / dt);
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        let dx = s.x[i] - s.x[j], dy = s.y[i] - s.y[j];
        dx -= L * Math.round(dx / L); dy -= L * Math.round(dy / L);
        const r = Math.hypot(dx, dy); if (r > 1.5) continue;
        const wr = 1 - r / 1.5, ex = dx / r, ey = dy / r;
        const vr = (s.vx[i] - s.vx[j]) * ex + (s.vy[i] - s.vy[j]) * ey;
        const f = -g * wr * wr * vr + sg * wr * gauss();
        s.fx[i] += f * ex; s.fy[i] += f * ey; s.fx[j] -= f * ex; s.fy[j] -= f * ey;
      }
    };
    const ke = s => { let k = 0; for (let i = 0; i < N; i++) k += s.vx[i] ** 2 + s.vy[i] ** 2; return 0.5 * k; };
    const wrap = (s, i) => { s.x[i] = (s.x[i] + L) % L; s.y[i] = (s.y[i] + L) % L; };
    const move = {
      0(s, dt) { // Euler: positions and velocities both from the old state
        for (let i = 0; i < N; i++) { s.x[i] += s.vx[i] * dt; s.y[i] += s.vy[i] * dt; s.vx[i] += s.fx[i] * dt; s.vy[i] += s.fy[i] * dt; wrap(s, i); }
        forces(s);
      },
      1(s, dt) { // velocity Verlet
        for (let i = 0; i < N; i++) { s.vx[i] += 0.5 * dt * s.fx[i]; s.vy[i] += 0.5 * dt * s.fy[i]; s.x[i] += s.vx[i] * dt; s.y[i] += s.vy[i] * dt; wrap(s, i); }
        forces(s);
        for (let i = 0; i < N; i++) { s.vx[i] += 0.5 * dt * s.fx[i]; s.vy[i] += 0.5 * dt * s.fy[i]; }
      },
      2(s, dt) { // Langevin: Verlet plus friction and random kicks on velocities
        move[1](s, dt);
        const c1 = Math.exp(-p.gamma * dt), c2 = Math.sqrt((1 - c1 * c1) * p.T);
        for (let i = 0; i < N; i++) { s.vx[i] = c1 * s.vx[i] + c2 * gauss(); s.vy[i] = c1 * s.vy[i] + c2 * gauss(); }
      },
      3(s, dt) { // Brownian: no inertia, position moves with the force plus noise
        const D = p.T / p.gamma, sd = Math.sqrt(2 * D * dt);
        for (let i = 0; i < N; i++) { s.x[i] += s.fx[i] * dt / p.gamma + sd * gauss(); s.y[i] += s.fy[i] * dt / p.gamma + sd * gauss(); wrap(s, i); }
        forces(s);
      },
      4(s, dt) { // DPD thermostat inside velocity Verlet
        for (let i = 0; i < N; i++) { s.vx[i] += 0.5 * dt * s.fx[i]; s.vy[i] += 0.5 * dt * s.fy[i]; s.x[i] += s.vx[i] * dt; s.y[i] += s.vy[i] * dt; wrap(s, i); }
        forces(s); dpd(s, dt);
        for (let i = 0; i < N; i++) { s.vx[i] += 0.5 * dt * s.fx[i]; s.vy[i] += 0.5 * dt * s.fy[i]; }
      },
      5(s, dt) { // Nose-Hoover: a friction xi that itself follows the temperature error
        const Q = 0.5, g = 2 * N;
        const half = () => {
          s.xi += 0.25 * dt * (2 * ke(s) - g * p.T) / Q;
          const sc = Math.exp(-s.xi * dt / 2);
          for (let i = 0; i < N; i++) { s.vx[i] *= sc; s.vy[i] *= sc; }
          s.eta += s.xi * dt / 2;
          s.xi += 0.25 * dt * (2 * ke(s) - g * p.T) / Q;
        };
        half(); move[1](s, dt); half();
        s.extra = 0.5 * Q * s.xi * s.xi + g * p.T * s.eta;
      }
    };
    const energy = s => s.pe + ke(s) + (s.extra || 0);
    return {
      perFrame: 3,
      params: [
        { key: "dt", label: "time step dt", min: 0.001, max: 0.02, step: 0.001, value: 0.005 },
        { key: "T", label: "target T*", min: 0.4, max: 2.5, step: 0.05, value: 1 },
        { key: "gamma", label: "friction γ", min: 0.2, max: 5, step: 0.1, value: 1 }
      ],
      set(k, v) { p[k] = v; },
      reset() {
        const x0 = [], y0 = [], vx0 = [], vy0 = [];
        for (let i = 0; i < N; i++) { x0.push((i % 6 + 0.5) * L / 6); y0.push((Math.floor(i / 6) + 0.5) * L / 6); vx0.push(gauss() * 1.26); vy0.push(gauss() * 1.26); }
        sys = names.map(() => {
          const s = { x: Float64Array.from(x0), y: Float64Array.from(y0), vx: Float64Array.from(vx0), vy: Float64Array.from(vy0), fx: new Float64Array(N), fy: new Float64Array(N), xi: 0, eta: 0, extra: 0, dead: false };
          forces(s); s.E0 = energy(s); return s;
        });
        hist = names.map(() => ({ T: [], E: [] })); t = 0;
      },
      step() {
        for (let k = 0; k < 4; k++) {
          sys.forEach((s, m) => {
            if (s.dead) return;
            move[m](s, p.dt);
            if (!isFinite(s.pe) || ke(s) / N > 100) s.dead = true;
          });
          t += p.dt;
        }
        sys.forEach((s, m) => {
          const h = hist[m];
          h.T.push(m === 3 || s.dead ? NaN : ke(s) / N);
          h.E.push(m === 0 || m === 1 || m === 5 ? (s.dead ? NaN : (energy(s) - s.E0) / N) : NaN);
          if (h.T.length > 300) { h.T.shift(); h.E.shift(); }
        });
      },
      draw(ctx, w, h, col) {
        const cs = CLUSTER_COLORS, gw = w * 0.5, cell = Math.min(gw / 3, (h - 10) / 2), s = (cell - 8) / L;
        sys.forEach((sy, m) => {
          const ox = (m % 3) * cell + 4, oy = Math.floor(m / 3) * cell + 4;
          ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.strokeRect(ox, oy, L * s, L * s);
          ctx.fillStyle = cs[m];
          if (!sy.dead) for (let i = 0; i < N; i++) dot(ctx, ox + sy.x[i] * s, oy + sy.y[i] * s, s * 0.42);
          ctx.fillStyle = col.ink; ctx.font = "10px monospace";
          ctx.fillText(sy.dead ? names[m] + ": blew up" : names[m], ox + 3, oy + 11);
        });
        const px = 3 * cell + 40, pw = w - px - 12, ph = (h - 70) / 2;
        const A = plotBox(ctx, [px, 12, pw, ph], [0, 300], [0, 3], col, "", "T");
        A.hline(p.T, col.rule);
        hist.forEach((hh, m) => A.line(hh.T.map((v, k) => [k, v]), cs[m], 1.5));
        const B = plotBox(ctx, [px, ph + 38, pw, ph], [0, 300], [-0.5, 0.5], col, "time", "ΔE / N");
        B.hline(0, col.rule);
        hist.forEach((hh, m) => B.line(hh.E.map((v, k) => [k, v]), cs[m], 1.5));
      },
      info() {
        const T = m => sys[m].dead ? "-" : (ke(sys[m]) / N).toFixed(2);
        return `t = ${t.toFixed(1)}   T: Verlet ${T(1)}, Langevin ${T(2)}, DPD ${T(4)}, NH ${T(5)}`;
      }
    };
  }
};
