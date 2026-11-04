// Learn: drug delivery and docking

DEMOS["dr-dock"] = {
  title: "Docking a ligand into a pocket",
  text: "You can move a small molecule into a binding pocket and watch the docking score, or let Monte Carlo search for the pose.",
  hint: "Drag the ligand. Turn the search on to let Monte Carlo find a pose.",
  details: "rigid 5-atom ligand, receptor atoms fixed. Score = LJ (vdW) + q<sub>i</sub>q<sub>j</sub>/(4r) (Coulomb with a distance-dependent dielectric), lower is better",
  make() {
    // receptor: a wall with a U-shaped pocket, some charged atoms
    const R = [];
    for (let k = 0; k < 24; k++) { const x = k * 1.1 - 12.6; if (Math.abs(x) > 2.8) R.push([x, -2.2, 0]); }
    const pocket = [[-2.8, -1.1], [-2.8, 0.1], [-2.6, 1.2], [-1.6, -2.3], [-0.5, -2.6], [0.6, -2.6], [1.7, -2.3], [2.8, -1.1], [2.8, 0.1], [2.6, 1.2]];
    const pq = [0, 0, 0, -0.6, 0, 0, 0, 0.7, 0, 0];
    pocket.forEach(([x, y], k) => R.push([x, y + 0.6, pq[k]]));
    for (let k = 0; k < 24; k++) { const x = k * 1.1 - 12.6; R.push([x, -3.3, 0]); }
    // ligand in its own frame: positive end, negative end, neutral middle
    const L = [[-1.1, 0, 0.6], [0, 0, 0], [1.1, 0, -0.6], [0, 0.95, 0], [-0.55, -0.9, 0]];
    const p = { rot: 120, search: 0, qscale: 1 };
    let pose, best, T, tries;
    const atoms = ps => { const c = Math.cos(ps.a), s = Math.sin(ps.a); return L.map(([x, y, q]) => [ps.x + c * x - s * y, ps.y + s * x + c * y, q]); };
    const score = ps => {
      let vdw = 0, el = 0;
      for (const [x, y, q] of atoms(ps)) for (const [X, Y, Q] of R) {
        const r = Math.max(Math.hypot(x - X, y - Y), 0.7);
        if (r < 3.5) { const i6 = (1 / r) ** 6; vdw += 4 * 0.6 * (i6 * i6 - i6); }
        el += p.qscale * 30 * q * Q / (4 * r * r);
      }
      return { vdw, el, tot: vdw + el };
    };
    const view = (w, h) => ({ s: w * 0.62 / 22, ox: w * 0.31, oy: h * 0.62 });
    return {
      perFrame: 1,
      params: [
        { key: "rot", label: "turn ligand (deg)", min: 0, max: 360, step: 1, value: 120 },
        { key: "search", label: "Monte Carlo search (0 off, 1 on)", min: 0, max: 1, step: 1, value: 0 },
        { key: "qscale", label: "charge weight", min: 0, max: 2, step: 0.1, value: 1 }
      ],
      set(k, v) { p[k] = v; if (k === "rot") pose.a = v * Math.PI / 180; if (k === "search" && v) { T = 3; tries = 0; } best = null; },
      reset() { pose = { x: 6, y: 4.5, a: p.rot * Math.PI / 180 }; best = null; T = 3; tries = 0; },
      drag(px, py, w, h, down) { if (!down) return; const { s, ox, oy } = view(w, h); pose.x = (px - ox) / s; pose.y = (oy - py) / s; },
      step() {
        if (!p.search) return;
        // simulated annealing over (x, y, angle)
        for (let k = 0; k < 40; k++) {
          const trial = { x: pose.x + 0.3 * gauss(), y: pose.y + 0.3 * gauss(), a: pose.a + 0.2 * gauss() };
          trial.y = Math.min(8, Math.max(-1.5, trial.y)); trial.x = Math.min(10, Math.max(-10, trial.x));
          const d = score(trial).tot - score(pose).tot;
          if (d < 0 || rand() < Math.exp(-d / T)) pose = trial;
          const sc = score(pose).tot;
          if (!best || sc < best.sc) best = { ...pose, sc };
          tries++;
        }
        T = Math.max(0.05, T * 0.995);
        p.rot = ((pose.a * 180 / Math.PI) % 360 + 360) % 360;
      },
      draw(ctx, w, h, col) {
        const { s, ox, oy } = view(w, h), S = (x, y) => [ox + x * s, oy - y * s];
        const qc = q => q > 0 ? col.b : q < 0 ? col.a : col.muted;
        for (const [x, y, q] of R) { ctx.fillStyle = q ? qc(q) : col.rule; const [a, b] = S(x, y); dot(ctx, a, b, s * 0.5); }
        if (best && p.search) { ctx.globalAlpha = 0.35; for (const [x, y, q] of atoms(best)) { ctx.fillStyle = qc(q); const [a, b] = S(x, y); dot(ctx, a, b, s * 0.45); } ctx.globalAlpha = 1; }
        const at = atoms(pose);
        ctx.strokeStyle = col.ink; ctx.lineWidth = Math.max(2, s * 0.18); ctx.beginPath();
        for (const k of [0, 3, 4]) { const [a, b] = S(at[1][0], at[1][1]), [c, d] = S(at[k][0], at[k][1]); ctx.moveTo(a, b); ctx.lineTo(c, d); }
        { const [a, b] = S(at[1][0], at[1][1]), [c, d] = S(at[2][0], at[2][1]); ctx.moveTo(a, b); ctx.lineTo(c, d); }
        ctx.stroke();
        for (const [x, y, q] of at) { ctx.fillStyle = qc(q); const [a, b] = S(x, y); dot(ctx, a, b, s * 0.42); }
        // score history panel
        const sc = score(pose);
        const px = w * 0.66, bw = w * 0.3, bar = (v, y, label) => {
          const L = Math.max(-1, Math.min(1, v / 20)) * bw / 2;
          ctx.fillStyle = col.rule; ctx.fillRect(px + bw / 2 - 0.5, y - 2, 1, 18);
          ctx.fillStyle = v < 0 ? col.a : col.b; ctx.fillRect(px + bw / 2, y, L, 14);
          ctx.fillStyle = col.muted; ctx.font = "11px monospace"; ctx.fillText(`${label} ${v.toFixed(1)}`, px, y - 6);
        };
                bar(sc.vdw, 36, "vdW"); bar(sc.el, 80, "electrostatic"); bar(sc.tot, 124, "total score");
        if (best && p.search) { ctx.fillStyle = col.ink; ctx.fillText(`best so far ${best.sc.toFixed(1)}`, px, 172); }
      },
      info() { return p.search ? `Monte Carlo moves ${tries}   temperature ${T.toFixed(2)}` : "drag the ligand, turn it, or switch on the search"; }
    };
  }
};

DEMOS["dr-release"] = {
  title: "Drug release from a carrier",
  text: "Drug molecules leave a carrier through its shell. The permeability of the shell switches the release from a square-root law to an exponential one.",
  details: "300 drug molecules start inside a carrier of radius R and diffuse (D = 1). A molecule hitting the shell gets through with probability p. Far edges absorb, so outside is a perfect sink. Dashed: early-time &radic;t trend fitted to the first 10%",
  make() {
    const N = 300, R = 3, Rout = 9, dt = 0.004;
    const p = { perm: 1, D: 1 };
    let x, y, out, t, curve;
    return {
      perFrame: 2,
      params: [
        { key: "perm", label: "shell permeability p", min: 0.002, max: 1, step: 0.002, value: 1 },
        { key: "D", label: "drug D inside", min: 0.1, max: 2, step: 0.05, value: 1 }
      ],
      set(k, v) { p[k] = v; this.reset(); },
      reset() {
        x = new Float64Array(N); y = new Float64Array(N); out = new Uint8Array(N);
        for (let i = 0; i < N; i++) { const r = R * Math.sqrt(rand()) * 0.95, a = rand() * 2 * Math.PI; x[i] = r * Math.cos(a); y[i] = r * Math.sin(a); }
        t = 0; curve = [[0, 0]];
      },
      step() {
        if (t > 80 || curve[curve.length - 1][1] > 0.995) return;
        for (let k = 0; k < 10; k++) {
          for (let i = 0; i < N; i++) {
            if (out[i] === 2) continue;
            const D = out[i] ? 1 : p.D, s = Math.sqrt(2 * D * dt);
            const nx = x[i] + s * gauss(), ny = y[i] + s * gauss();
            const r0 = Math.hypot(x[i], y[i]), r1 = Math.hypot(nx, ny);
            if ((r0 < R) !== (r1 < R) && rand() > p.perm) continue;
            x[i] = nx; y[i] = ny;
            out[i] = r1 > Rout ? 2 : r1 > R ? 1 : 0;
          }
          t += dt;
        }
        let n = 0; for (let i = 0; i < N; i++) if (out[i]) n++;
        curve.push([t, n / N]);
      },
      draw(ctx, w, h, col) {
        const bw = Math.min(w * 0.45, h - 10), s = bw / (2 * Rout), cx = bw / 2 + 4, cy = h / 2 - 8;
        ctx.strokeStyle = col.rule; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(cx, cy, Rout * s, 0, 7); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = col.b; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, R * s, 0, 7); ctx.stroke(); ctx.lineWidth = 1;
        ctx.fillStyle = col.a;
        for (let i = 0; i < N; i++) if (out[i] < 2) dot(ctx, cx + x[i] * s, cy + y[i] * s, 2.2);
        const tmax = Math.max(10, t);
        const P = plotBox(ctx, [bw + 40, 14, w - bw - 54, h - 42], [0, tmax], [0, 1], col, "t", "fraction released");
        P.line(curve, col.b, 2);
        // early sqrt(t) fit
        const early = curve.filter(c => c[1] > 0 && c[1] < 0.1);
        if (early.length > 5) {
          let a = 0, b = 0; for (const [tt, f] of early) { a += f * Math.sqrt(tt); b += tt; }
          const k = a / b, pts = []; for (let j = 0; j <= 60; j++) { const tt = tmax * j / 60; pts.push([tt, Math.min(1.05, k * Math.sqrt(tt))]); }
          P.line(pts, col.muted, 1, [4, 4]);
        }
      },
      info() {
        const half = curve.find(c => c[1] >= 0.5);
        return `t = ${t.toFixed(1)}   released ${(100 * curve[curve.length - 1][1]).toFixed(0)}%   t½ = ${half ? half[0].toFixed(1) : "-"}`;
      }
    };
  }
};

DEMOS["dr-micelle"] = {
  title: "Loading a drug into micelles",
  text: "Head-tail molecules gather into micelles and pick up hydrophobic drug molecules along the way.",
  details: "40 head-tail amphiphiles (head orange, tail blue, bonds drawn as lines) and 14 drug molecules (green) in implicit water, Brownian dynamics, kT = 1. Soft repulsion between all beads, a cosine attraction of depth &epsilon; between tails and between tails and drug",
  make() {
    const NA = 40, ND = 14, N = 2 * NA + ND, LX = 22, LY = 22 * 7 / 12, dt = 0.002;
    const p = { eps: 2.5 };
    let x, y, type, t;
    const att = (a, b) => a > 0 && b > 0;
    return {
      perFrame: 2,
      params: [{ key: "eps", label: "hydrophobic attraction ε", min: 0, max: 4, step: 0.1, value: 2.5 }],
      set(k, v) { p[k] = v; },
      reset() {
        x = new Float64Array(N); y = new Float64Array(N); type = new Uint8Array(N);
        for (let m = 0; m < NA; m++) {
          const cx = rand() * LX, cy = rand() * LY, a = rand() * 2 * Math.PI;
          x[2 * m] = cx; y[2 * m] = cy; type[2 * m] = 0;
          x[2 * m + 1] = (cx + 0.9 * Math.cos(a) + LX) % LX; y[2 * m + 1] = (cy + 0.9 * Math.sin(a) + LY) % LY; type[2 * m + 1] = 1;
        }
        for (let i = 2 * NA; i < N; i++) { x[i] = rand() * LX; y[i] = rand() * LY; type[i] = 2; }
        t = 0;
      },
      step() {
        const fx = new Float64Array(N), fy = new Float64Array(N), s = Math.sqrt(2 * dt);
        for (let it = 0; it < 15; it++) {
          fx.fill(0); fy.fill(0);
          for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
            let dx = x[i] - x[j], dy = y[i] - y[j];
            dx -= LX * Math.round(dx / LX); dy -= LY * Math.round(dy / LY);
            const r = Math.hypot(dx, dy); if (r > 1.6 || r < 1e-6) continue;
            let f = r < 1 ? 40 * (1 - r) : 0;
            if (att(type[i], type[j]) && r > 1) f -= p.eps * Math.PI / 1.2 * Math.sin(Math.PI * (r - 1) / 0.6);
            fx[i] += f * dx / r; fy[i] += f * dy / r; fx[j] -= f * dx / r; fy[j] -= f * dy / r;
          }
          for (let m = 0; m < NA; m++) {
            const i = 2 * m, j = i + 1;
            let dx = x[i] - x[j], dy = y[i] - y[j];
            dx -= LX * Math.round(dx / LX); dy -= LY * Math.round(dy / LY);
            const r = Math.hypot(dx, dy), f = -60 * (r - 0.9) / r;
            fx[i] += f * dx; fy[i] += f * dy; fx[j] -= f * dx; fy[j] -= f * dy;
          }
          for (let i = 0; i < N; i++) {
            x[i] = (x[i] + fx[i] * dt + s * gauss() + LX) % LX;
            y[i] = (y[i] + fy[i] * dt + s * gauss() + LY) % LY;
          }
          t += dt;
        }
      },
      loaded() {
        let n = 0;
        for (let i = 2 * NA; i < N; i++) {
          let c = 0;
          for (let m = 0; m < NA; m++) {
            let dx = x[i] - x[2 * m + 1], dy = y[i] - y[2 * m + 1];
            dx -= LX * Math.round(dx / LX); dy -= LY * Math.round(dy / LY);
            if (dx * dx + dy * dy < 2.25) c++;
          }
          if (c >= 3) n++;
        }
        return n;
      },
      draw(ctx, w, h, col) {
        const s = Math.min(w / LX, h / LY);
        for (let m = 0; m < NA; m++) {
          ctx.fillStyle = col.b; dot(ctx, x[2 * m] * s, y[2 * m] * s, s * 0.5);
          ctx.fillStyle = col.a; dot(ctx, x[2 * m + 1] * s, y[2 * m + 1] * s, s * 0.4);
        }
        ctx.strokeStyle = col.ink; ctx.lineWidth = Math.max(2, s * 0.14); ctx.beginPath();
        for (let m = 0; m < NA; m++) {
          const i = 2 * m, j = i + 1;
          if (Math.abs(x[i] - x[j]) > LX / 2 || Math.abs(y[i] - y[j]) > LY / 2) continue;
          ctx.moveTo(x[i] * s, y[i] * s); ctx.lineTo(x[j] * s, y[j] * s);
        }
        ctx.stroke();
        ctx.fillStyle = CLUSTER_COLORS[2];
        for (let i = 2 * NA; i < N; i++) dot(ctx, x[i] * s, y[i] * s, s * 0.42);
      },
      info() { return `t = ${t.toFixed(1)}   drug inside micelles: ${this.loaded()} of ${ND}`; }
    };
  }
};
