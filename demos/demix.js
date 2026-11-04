// Two kinds of DPD beads: demixing in bulk, and a film forming on a surface

// shared DPD pair loop for beads of two types; aij(ti, tj) gives the repulsion
function dpdPairs(n, x, y, vx, vy, fx, fy, type, LX, LY, aij, dt, periodicY) {
  const gamma = 4.5, noise = 3 / Math.sqrt(dt);
  fx.fill(0); fy.fill(0);
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    let dx = x[i] - x[j], dy = y[i] - y[j];
    dx -= LX * Math.round(dx / LX);
    if (periodicY) dy -= LY * Math.round(dy / LY);
    const r2 = dx * dx + dy * dy;
    if (r2 >= 1 || r2 === 0) continue;
    const r = Math.sqrt(r2), ex = dx / r, ey = dy / r, w = 1 - r;
    const dv = ex * (vx[i] - vx[j]) + ey * (vy[i] - vy[j]);
    const f = aij(type[i], type[j]) * w - gamma * w * w * dv + noise * w * gauss();
    fx[i] += f * ex; fy[i] += f * ey; fx[j] -= f * ex; fy[j] -= f * ey;
  }
}

DEMOS.demix = {
  title: "Two liquids that do not mix",
  text: "Two kinds of beads in dissipative particle dynamics. When unlike beads repel more than like ones, the mixture separates into domains that slowly grow. Below a critical repulsion, they stay mixed.",
  details: "300 beads, a<sub>AA</sub> = a<sub>BB</sub> = 25, kT = 1, &gamma; = 4.5, dt = 0.03, periodic box",
  make() {
    const LX = 12, LY = 7, N = 300, dt = 0.03;
    const p = { aAB: 45, fA: 0.5 };
    let x, y, vx, vy, fx, fy, type, t;
    const aij = (a, b) => a === b ? 25 : p.aAB;
    return {
      perFrame: 3,
      params: [
        { key: "aAB", label: "a_AB", min: 25, max: 70, step: 1, value: 45 },
        { key: "fA", label: "fraction of A", min: 0.1, max: 0.9, step: 0.05, value: 0.5 }
      ],
      set(k, v) { p[k] = v; if (k === "fA") this.reset(); },
      reset() {
        x = new Float64Array(N).map(() => rand() * LX); y = new Float64Array(N).map(() => rand() * LY);
        vx = new Float64Array(N).map(() => gauss()); vy = new Float64Array(N).map(() => gauss());
        fx = new Float64Array(N); fy = new Float64Array(N);
        type = new Uint8Array(N).map(() => rand() < p.fA ? 0 : 1);
        t = 0; dpdPairs(N, x, y, vx, vy, fx, fy, type, LX, LY, aij, dt, true);
      },
      step() {
        for (let i = 0; i < N; i++) {
          vx[i] += 0.5 * dt * fx[i]; vy[i] += 0.5 * dt * fy[i];
          x[i] = (x[i] + dt * vx[i] + LX) % LX; y[i] = (y[i] + dt * vy[i] + LY) % LY;
        }
        dpdPairs(N, x, y, vx, vy, fx, fy, type, LX, LY, aij, dt, true);
        for (let i = 0; i < N; i++) { vx[i] += 0.5 * dt * fx[i]; vy[i] += 0.5 * dt * fy[i]; }
        t += dt;
      },
      draw(ctx, w, h, col) {
        const s = w / LX;
        for (let i = 0; i < N; i++) { ctx.fillStyle = type[i] ? col.b : col.a; dot(ctx, x[i] * s, y[i] * s, s * 0.3); }
      },
      info() {
        // fraction of close neighbors that are the same type
        let same = 0, all = 0;
        for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
          let dx = x[i] - x[j], dy = y[i] - y[j];
          dx -= LX * Math.round(dx / LX); dy -= LY * Math.round(dy / LY);
          if (dx * dx + dy * dy < 1) { all++; if (type[i] === type[j]) same++; }
        }
        return `t = ${t.toFixed(1)}   like neighbors ${(100 * same / Math.max(all, 1)).toFixed(0)}%`;
      }
    };
  }
};

DEMOS.film = {
  title: "A film assembling on a surface",
  text: "The same two kinds of beads above a solid surface. The surface prefers the blue beads, so they spread over it in a layer while the two kinds separate, and the orange ones end up on top. If you move the slider to make the surface prefer orange instead, the beads are mixed again, and a new film forms with orange at the bottom. The top of the box is neutral and treats both kinds in the same way.",
  details: "300 beads, a<sub>AA</sub> = a<sub>BB</sub> = 25, surface: a<sub>S,blue</sub> = 32 &minus; 30p, a<sub>S,orange</sub> = 32 + 30p, p = surface preference, neutral top wall, kT = 1, dt = 0.03",
  make() {
    const LX = 14, LY = 7.4, NS = 126, NF = 300, N = NF + NS, dt = 0.03;
    const p = { aAB: 45, pref: 1, fA: 0.5 };
    let x, y, vx, vy, fx, fy, type, t;
    // types: 0 = A (likes the surface), 1 = B, 2 = surface
    const aij = (a, b) => {
      // the surface slider moves both surface repulsions in opposite directions
      if (a === 2 || b === 2) { const o = a === 2 ? b : a; return o === 2 ? 25 : o === 0 ? 32 - 30 * p.pref : 32 + 30 * p.pref; }
      return a === b ? 25 : p.aAB;
    };
    return {
      perFrame: 3,
      params: [
        { key: "aAB", label: "a_AB (demixing)", min: 25, max: 70, step: 1, value: 45 },
        { key: "pref", label: "surface likes orange -1, blue +1", min: -1, max: 1, step: 0.1, value: 1 },
        { key: "fA", label: "fraction of blue", min: 0.1, max: 0.9, step: 0.05, value: 0.5 }
      ],
      // a new surface preference starts again from a mixed state, so the new film forms quickly
      set(k, v) { p[k] = v; if (k === "fA" || k === "pref") this.reset(); },
      reset() {
        x = new Float64Array(N); y = new Float64Array(N); vx = new Float64Array(N); vy = new Float64Array(N);
        fx = new Float64Array(N); fy = new Float64Array(N); type = new Uint8Array(N);
        for (let i = 0; i < NF; i++) { x[i] = rand() * LX; y[i] = 0.6 + rand() * (LY - 0.9); vx[i] = gauss(); vy[i] = gauss(); type[i] = rand() < p.fA ? 0 : 1; }
        // three rows of fixed surface beads
        for (let k = 0; k < NS; k++) { const i = NF + k, row = Math.floor(k / 42); x[i] = ((k % 42) + 0.33 * row) * LX / 42; y[i] = 0.05 + 0.25 * row; type[i] = 2; }
        t = 0; this.forces();
      },
      forces() {
        dpdPairs(N, x, y, vx, vy, fx, fy, type, LX, LY, aij, dt, false);
        // neutral top wall: the same soft push for both kinds
        for (let i = 0; i < NF; i++) { const d = LY - y[i]; if (d < 1) fy[i] -= 30 * (1 - Math.max(d, 0)); }
      },
      step() {
        for (let i = 0; i < NF; i++) {
          vx[i] += 0.5 * dt * fx[i]; vy[i] += 0.5 * dt * fy[i];
          x[i] = (x[i] + dt * vx[i] + LX) % LX; y[i] += dt * vy[i];
          if (y[i] < 0.6) { y[i] = 1.2 - y[i]; vy[i] = Math.abs(vy[i]); }
          if (y[i] > LY) { y[i] = 2 * LY - y[i]; vy[i] = -Math.abs(vy[i]); }
        }
        this.forces();
        for (let i = 0; i < NF; i++) { vx[i] += 0.5 * dt * fx[i]; vy[i] += 0.5 * dt * fy[i]; }
        t += dt;
      },
      draw(ctx, w, h, col) {
        const s = w / LX;
        const base = h - 6, sy = (h - 10) / (LY + 0.3), X = v => v * s, YY = v => base - (v + 0.3) * sy;
        ctx.fillStyle = col.ink; ctx.fillRect(0, YY(0.3), w, h);
        for (let i = 0; i < NF; i++) { ctx.fillStyle = type[i] ? col.b : col.a; dot(ctx, X(x[i]), YY(y[i]), Math.min(s, sy) * 0.3); }
      },
      info() {
        let a = 0, n = 0;
        for (let i = 0; i < NF; i++) if (y[i] < 1.6) { n++; if (type[i] === 0) a++; }
        return `t = ${t.toFixed(1)}   next to the surface: ${(100 * a / Math.max(n, 1)).toFixed(0)}% blue, ${(100 - 100 * a / Math.max(n, 1)).toFixed(0)}% orange`;
      }
    };
  }
};
