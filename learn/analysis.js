// Learn: analysis of trajectories

DEMOS["an-rdf"] = {
  title: "Radial distribution function",
  text: "The radial distribution function of a liquid, built up live from the pair distances.",
  hint: "Click a particle to see the shell around it that is being counted.",
  details: "120 LJ particles, &rho;* = 0.8, histogram of pair distances divided by the ideal-gas count 2&pi;r dr &rho;",
  make() {
    const N = 120, LX = 16, LY = N / 0.8 / 16, bins = 60, rmax = Math.min(LX, LY) / 2, dr = rmax / bins;
    const p = { T: 1 };
    let sys, hist, samples, sel = 0, shell = 0;
    return {
      perFrame: 4,
      params: [{ key: "T", label: "T*", min: 0.4, max: 2.5, step: 0.05, value: 1 }],
      set(k, v) { p[k] = v; sys.T = v; hist.fill(0); samples = 0; },
      reset() { sys = new LJBox({ N, LX, LY, T: p.T, dt: 0.004 }); hist = new Float64Array(bins); samples = 0; },
      click(px, py, w, h) {
        const s = (w * 0.48) / LX;
        let best = 0, bd = Infinity;
        for (let i = 0; i < N; i++) { const d = (sys.x[i] * s - px) ** 2 + (sys.y[i] * s - py) ** 2; if (d < bd) { bd = d; best = i; } }
        sel = best;
      },
      step() {
        sys.step();
        if (Math.round(sys.t / sys.dt) % 10 !== 0) return;
        for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
          let dx = sys.x[i] - sys.x[j], dy = sys.y[i] - sys.y[j];
          dx -= LX * Math.round(dx / LX); dy -= LY * Math.round(dy / LY);
          const r = Math.sqrt(dx * dx + dy * dy);
          if (r < rmax) hist[Math.floor(r / dr)] += 2;
        }
        samples++;
        shell = (shell + 1) % bins;
      },
      draw(ctx, w, h, col) {
        const bw = w * 0.48, s = bw / LX;
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, bw, LY * s); ctx.clip();
        ctx.fillStyle = col.a;
        for (let i = 0; i < N; i++) dot(ctx, sys.x[i] * s, sys.y[i] * s, s * 0.45);
        const r1 = 1.0 + (shell % 20) * 0.1;
        ctx.strokeStyle = col.b; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(sys.x[sel] * s, sys.y[sel] * s, r1 * s, 0, 2 * Math.PI); ctx.stroke();
        ctx.beginPath(); ctx.arc(sys.x[sel] * s, sys.y[sel] * s, (r1 + dr * 3) * s, 0, 2 * Math.PI); ctx.stroke();
        ctx.fillStyle = col.b; dot(ctx, sys.x[sel] * s, sys.y[sel] * s, s * 0.45);
        ctx.restore();
        const rho = N / (LX * LY);
        const g = Array.from(hist, (c, k) => [(k + 0.5) * dr, samples ? c / (samples * N * rho * 2 * Math.PI * (k + 0.5) * dr * dr) : 0]);
        const P = plotBox(ctx, [bw + 34, 16, w - bw - 46, h - 44], [0, rmax], [0, 3.5], col, "r / σ", "g(r)");
        P.hline(1, col.rule);
        P.line(g, col.a, 2);
      },
      info() { return `samples = ${samples}   T* = ${(sys.Tnow || 0).toFixed(2)}`; }
    };
  }
};

DEMOS["an-msd"] = {
  title: "Mean squared displacement",
  text: "",
  details: "200 free Langevin particles with mass, log-log axes, dashed: exact MSD = (4kT/m&gamma;)[t &minus; (1 &minus; e<sup>&minus;&gamma;t</sup>)/&gamma;]",
  make() {
    const N = 200, kT = 1, dt = 0.01;
    const p = { gamma: 1 };
    let x, y, vx, vy, t, pts;
    const theory = s => 4 * kT / p.gamma * (s - (1 - Math.exp(-p.gamma * s)) / p.gamma);
    return {
      perFrame: 3,
      params: [{ key: "gamma", label: "friction &gamma;", min: 0.1, max: 10, step: 0.1, value: 1 }],
      set(k, v) { p[k] = v; this.reset(); },
      reset() {
        x = new Float64Array(N); y = new Float64Array(N);
        vx = new Float64Array(N).map(() => gauss()); vy = new Float64Array(N).map(() => gauss());
        t = 0; pts = [];
      },
      step() {
        if (t > 100) return;
        const c1 = Math.exp(-p.gamma * dt), c2 = Math.sqrt(1 - c1 * c1);
        let m = 0;
        for (let i = 0; i < N; i++) {
          x[i] += vx[i] * dt; y[i] += vy[i] * dt;
          vx[i] = c1 * vx[i] + c2 * gauss(); vy[i] = c1 * vy[i] + c2 * gauss();
          m += x[i] * x[i] + y[i] * y[i];
        }
        t += dt;
        const k = Math.round(t / dt);
        if (k < 20 || k % Math.ceil(k / 20) === 0) pts.push([Math.log10(t), Math.log10(m / N)]);
      },
      draw(ctx, w, h, col) {
        const bw = w * 0.42, s = bw / 60;
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, bw, h); ctx.clip();
        ctx.fillStyle = col.a;
        for (let i = 0; i < N; i++) dot(ctx, bw / 2 + x[i] * s, h / 2 + y[i] * s, 1.8);
        ctx.restore();
        const P = plotBox(ctx, [bw + 34, 14, w - bw - 46, h - 42], [-2, 2], [-4, 3], col, "log t", "log MSD");
        const th = []; for (let k = 0; k <= 80; k++) { const lt = -2 + 4 * k / 80; th.push([lt, Math.log10(theory(10 ** lt))]); }
        P.line(th, col.muted, 1.5, [4, 4]);
        P.dots(pts, col.b, 2.2);
        ctx.fillStyle = col.muted; ctx.font = "10px monospace";
        ctx.fillText("slope 2: ballistic", P.X(-1.9), P.Y(-3.4));
        ctx.fillText("slope 1: diffusive", P.X(0.3), P.Y(2.6));
      },
      info() { return `t = ${t.toFixed(2)}   crossover near t = 1/γ = ${(1 / p.gamma).toFixed(2)}`; }
    };
  }
};

DEMOS["an-density"] = {
  title: "Density profile near a wall",
  text: "",
  details: "110 LJ particles between two 9-3 walls, histogram of y positions in thin slabs, divided by slab area",
  make() {
    const N = 110, LX = 12, LY = 9, bins = 90;
    const p = { eps: 2, T: 0.9 };
    let sys, hist, samples;
    return {
      perFrame: 4,
      params: [
        { key: "eps", label: "wall attraction", min: 0.2, max: 5, step: 0.1, value: 2 },
        { key: "T", label: "T*", min: 0.5, max: 2, step: 0.05, value: 0.9 }
      ],
      set(k, v) { p[k] = v; sys.wallEps = p.eps; sys.T = p.T; hist.fill(0); samples = 0; },
      reset() { sys = new LJBox({ N, LX, LY, T: p.T, walls: true, wallEps: p.eps, dt: 0.004 }); hist = new Float64Array(bins); samples = 0; },
      step() {
        sys.step();
        if (Math.round(sys.t / sys.dt) % 5) return;
        for (let i = 0; i < N; i++) { const b = Math.floor(sys.y[i] / LY * bins); if (b >= 0 && b < bins) hist[b]++; }
        samples++;
      },
      draw(ctx, w, h, col) {
        const s = (h - 10) / LY, bw = LX * s, oy = 5;
        ctx.fillStyle = col.ink; ctx.fillRect(0, oy - 3, bw, 3); ctx.fillRect(0, oy + LY * s, bw, 3);
        ctx.fillStyle = col.a;
        for (let i = 0; i < N; i++) dot(ctx, sys.x[i] * s, oy + sys.y[i] * s, s * 0.45);
        const px = bw + 30, pw = w - px - 14, dy = LY / bins;
        const rho = Array.from(hist, c => samples ? c / (samples * LX * dy) : 0);
        const max = Math.max(2, ...rho);
        ctx.strokeStyle = col.rule; ctx.beginPath(); ctx.moveTo(px, oy); ctx.lineTo(px, oy + LY * s); ctx.stroke();
        ctx.strokeStyle = col.b; ctx.lineWidth = 2; ctx.beginPath();
        rho.forEach((r, k) => { const X = px + r / max * pw, Y = oy + (k + 0.5) * dy * s; k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
        ctx.stroke();
        const bulk = N / (LX * LY);
        ctx.strokeStyle = col.muted; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(px + bulk / max * pw, oy); ctx.lineTo(px + bulk / max * pw, oy + LY * s); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = col.muted; ctx.font = "10px monospace"; ctx.fillText("ρ(y)", px + 4, oy + 12); ctx.fillText("mean", px + bulk / max * pw + 3, oy + LY * s - 4);
      },
      info() { return `samples = ${samples}   mean density = ${(N / (LX * LY)).toFixed(2)}`; }
    };
  }
};

DEMOS["an-hbond"] = {
  title: "Is this a hydrogen bond?",
  text: "",
  hint: "Drag the right-hand water molecule. The slider turns it.",
  details: "O-H = 0.96 &Aring;, H-O-H = 104.5&deg;, criterion: r(O&middot;&middot;&middot;O) &lt; cutoff and angle H-O<sub>d</sub>&middot;&middot;&middot;O<sub>a</sub> &lt; limit",
  make() {
    const p = { rot: 200, rmax: 3.5, amax: 30 };
    let o2, result;
    const water = (o, ang) => {
      const a1 = ang + 52.25 * Math.PI / 180, a2 = ang - 52.25 * Math.PI / 180;
      return [o, [o[0] + 0.96 * Math.cos(a1), o[1] + 0.96 * Math.sin(a1)], [o[0] + 0.96 * Math.cos(a2), o[1] + 0.96 * Math.sin(a2)]];
    };
    return {
      perFrame: 1,
      params: [
        { key: "rot", label: "turn molecule 2 (deg)", min: 0, max: 360, step: 1, value: 200 },
        { key: "rmax", label: "O-O cutoff (Å)", min: 2.5, max: 4, step: 0.05, value: 3.5 },
        { key: "amax", label: "angle limit (deg)", min: 10, max: 60, step: 1, value: 30 }
      ],
      set(k, v) { p[k] = v; },
      reset() { o2 = [2.9, 0.2]; },
      drag(px, py, w, h, down) { if (down) { const s = h / 6; o2 = [(px - w * 0.3) / s, -(py - h / 2) / s]; } },
      step() {},
      draw(ctx, w, h, col) {
        const s = h / 6, ox = w * 0.3, oy = h / 2;
        const S = ([a, b]) => [ox + a * s, oy - b * s];
        const m1 = water([0, 0], 0), m2 = water(o2, p.rot * Math.PI / 180);
        const roo = Math.hypot(o2[0], o2[1]);
        let best = null;
        for (const [don, acc] of [[m1, m2], [m2, m1]]) for (const H of [don[1], don[2]]) {
          const ux = H[0] - don[0][0], uy = H[1] - don[0][1], vx = acc[0][0] - don[0][0], vy = acc[0][1] - don[0][1];
          const ang = Math.acos((ux * vx + uy * vy) / (Math.hypot(ux, uy) * Math.hypot(vx, vy))) * 180 / Math.PI;
          if (!best || ang < best.ang) best = { ang, H, acc: acc[0] };
        }
        result = { roo, ang: best.ang, ok: roo < p.rmax && best.ang < p.amax };
        ctx.strokeStyle = col.rule; ctx.setLineDash([3, 4]);
        ctx.beginPath(); ctx.arc(ox, oy, p.rmax * s, 0, 2 * Math.PI); ctx.stroke(); ctx.setLineDash([]);
        const [hx, hy] = S(best.H), [ax, ay] = S(best.acc);
        ctx.strokeStyle = result.ok ? col.a : col.b; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(ax, ay); ctx.stroke(); ctx.setLineDash([]);
        for (const m of [m1, m2]) {
          const [x0, y0] = S(m[0]);
          ctx.strokeStyle = col.muted; ctx.lineWidth = 4;
          for (const H of [m[1], m[2]]) { const [x1, y1] = S(H); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
          ctx.fillStyle = col.b; dot(ctx, x0, y0, s * 0.3);
          ctx.fillStyle = col.paper; ctx.strokeStyle = col.ink; ctx.lineWidth = 1.5;
          for (const H of [m[1], m[2]]) { const [x1, y1] = S(H); dot(ctx, x1, y1, s * 0.16); ctx.beginPath(); ctx.arc(x1, y1, s * 0.16, 0, 7); ctx.stroke(); }
        }
        ctx.fillStyle = result.ok ? col.a : col.b; ctx.font = "13px monospace";
        ctx.fillText(result.ok ? "hydrogen bond" : "no hydrogen bond", 12, 20);
      },
      info() { return result ? `r(O···O) = ${result.roo.toFixed(2)} Å   angle = ${result.ang.toFixed(0)}°` : ""; }
    };
  }
};

DEMOS["an-chain"] = {
  title: "How big is a polymer?",
  text: "Self-avoiding random walks as model polymers, and the power law that links their size to their length.",
  details: "random walks on a square lattice, &lang;R<sub>ee</sub><sup>2</sup>&rang; averaged over many chains for each length N, fit of R ~ N<sup>&nu;</sup>",
  make() {
    const Ns = [8, 12, 16, 24, 32, 48, 64];
    const p = { saw: 1 };
    let sum, cnt, last;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    function walk(N) {
      for (;;) {
        const pts = [[0, 0]], seen = new Set(["0,0"]);
        let ok = true;
        for (let k = 1; k <= N; k++) {
          const [cx, cy] = pts[pts.length - 1];
          let opts = dirs.map(([a, b]) => [cx + a, cy + b]);
          if (p.saw) opts = opts.filter(([a, b]) => !seen.has(a + "," + b));
          if (!opts.length) { ok = false; break; }
          const q = opts[(rand() * opts.length) | 0];
          pts.push(q); seen.add(q[0] + "," + q[1]);
        }
        if (ok) return pts;
      }
    }
    return {
      perFrame: 1,
      params: [{ key: "saw", label: "0 ideal, 1 self-avoiding", min: 0, max: 1, step: 1, value: 1 }],
      set(k, v) { p[k] = v; this.reset(); },
      reset() { sum = Ns.map(() => 0); cnt = Ns.map(() => 0); last = walk(64); },
      step() {
        for (let r = 0; r < 6; r++) {
          const k = (rand() * Ns.length) | 0, c = walk(Ns[k]), e = c[c.length - 1];
          sum[k] += e[0] * e[0] + e[1] * e[1]; cnt[k]++;
        }
        if (rand() < 0.05) last = walk(64);
      },
      fit() {
        const pts = Ns.map((n, k) => [Math.log(n), Math.log(Math.sqrt(sum[k] / Math.max(cnt[k], 1)))]);
        const mx = pts.reduce((s, q) => s + q[0], 0) / pts.length, my = pts.reduce((s, q) => s + q[1], 0) / pts.length;
        let a = 0, b = 0;
        for (const [u, v] of pts) { a += (u - mx) * (v - my); b += (u - mx) ** 2; }
        return a / b;
      },
      draw(ctx, w, h, col) {
        const bw = w * 0.45;
        // fit the chain inside the left half
        let x0 = 0, x1 = 0, y0 = 0, y1 = 0;
        for (const [a, b] of last) { x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, b); y1 = Math.max(y1, b); }
        const s = Math.min(16, (bw - 30) / Math.max(x1 - x0, 1), (h - 30) / Math.max(y1 - y0, 1));
        const ox = bw / 2 - (x0 + x1) / 2 * s, oy = h / 2 - (y0 + y1) / 2 * s;
        ctx.strokeStyle = col.a; ctx.lineWidth = 2; ctx.beginPath();
        last.forEach(([a, b], i) => i ? ctx.lineTo(ox + a * s, oy + b * s) : ctx.moveTo(ox + a * s, oy + b * s));
        ctx.stroke();
        ctx.fillStyle = col.b; dot(ctx, ox, oy, 4); const e = last[last.length - 1]; dot(ctx, ox + e[0] * s, oy + e[1] * s, 4);
        ctx.strokeStyle = col.b; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + e[0] * s, oy + e[1] * s); ctx.stroke(); ctx.setLineDash([]);
        const P = plotBox(ctx, [bw + 30, 14, w - bw - 42, h - 42], [Math.log(6), Math.log(80)], [0.5, Math.log(40)], col, "log N", "log R");
        const ref = nu => [[Math.log(6), Math.log(6) * nu + 0.1], [Math.log(80), Math.log(80) * nu + 0.1]];
        P.line(ref(0.5), col.muted, 1, [4, 4]); P.line(ref(0.75), col.muted, 1, [1, 3]);
        P.dots(Ns.map((n, k) => [Math.log(n), Math.log(Math.sqrt(sum[k] / Math.max(cnt[k], 1)))]).filter((q, k) => cnt[k]), col.b, 4);
        ctx.fillStyle = col.muted; ctx.font = "10px monospace";
        ctx.fillText("ν = 1/2 dashed, 3/4 dotted", bw + 36, h - 32);
      },
      info() { return `chains sampled = ${cnt.reduce((a, b) => a + b, 0)}   fitted ν = ${this.fit().toFixed(2)}`; }
    };
  }
};

DEMOS["an-order"] = {
  title: "Nematic order parameter",
  text: "",
  details: "rods on a 24 &times; 14 lattice, E = &minus;&Sigma; cos<sup>2</sup>(&theta;<sub>i</sub> &minus; &theta;<sub>j</sub>) over neighbors, Metropolis rotations, S = |&lang;e<sup>2i&theta;</sup>&rang;|",
  make() {
    const W = 24, H = 14, n = W * H;
    const p = { T: 0.3 };
    let th, S, dir;
    const nb = k => { const i = k % W, j = (k / W) | 0; return [j * W + (i + 1) % W, j * W + (i + W - 1) % W, ((j + 1) % H) * W + i, ((j + H - 1) % H) * W + i]; };
    return {
      perFrame: 1,
      params: [{ key: "T", label: "temperature", min: 0.05, max: 1.2, step: 0.01, value: 0.3 }],
      set(k, v) { p[k] = v; },
      reset() { th = new Float64Array(n).map(() => rand() * Math.PI); S = 0; dir = 0; },
      step() {
        for (let m = 0; m < n * 2; m++) {
          const k = (rand() * n) | 0, nt = th[k] + (rand() - 0.5) * 0.8;
          let dE = 0;
          for (const q of nb(k)) dE += -(Math.cos(nt - th[q]) ** 2) + Math.cos(th[k] - th[q]) ** 2;
          if (dE <= 0 || rand() < Math.exp(-dE / p.T)) th[k] = nt;
        }
        let c = 0, s = 0;
        for (let k = 0; k < n; k++) { c += Math.cos(2 * th[k]); s += Math.sin(2 * th[k]); }
        S = Math.hypot(c, s) / n; dir = 0.5 * Math.atan2(s, c);
      },
      draw(ctx, w, h, col) {
        const cs = Math.min(w / W, h / H), ox = (w - W * cs) / 2, oy = (h - H * cs) / 2;
        ctx.lineWidth = Math.max(2, cs * 0.2); ctx.lineCap = "round";
        for (let k = 0; k < n; k++) {
          const cx = ox + (k % W + 0.5) * cs, cy = oy + (((k / W) | 0) + 0.5) * cs, a = th[k];
          ctx.strokeStyle = Math.abs(Math.cos(a - dir)) > 0.85 ? col.a : col.b;
          ctx.beginPath(); ctx.moveTo(cx - Math.cos(a) * cs * 0.4, cy - Math.sin(a) * cs * 0.4); ctx.lineTo(cx + Math.cos(a) * cs * 0.4, cy + Math.sin(a) * cs * 0.4); ctx.stroke();
        }
        ctx.lineCap = "butt";
      },
      info() { return `S = ${S.toFixed(2)}   (0 = isotropic, 1 = perfectly aligned)`; }
    };
  }
};

DEMOS["an-classify"] = {
  title: "Classifying atoms: crystal or liquid?",
  text: "",
  details: "Morse crystal, Langevin thermostat whose temperature rises from right to left. Features per atom: neighbor count n and bond order &psi;<sub>6</sub> = |&Sigma; e<sup>6i&theta;</sup>| / n. k-means with k = 2 on (n/6, &psi;<sub>6</sub>)",
  make() {
    const NX = 16, NY = 12, N = NX * NY, LX = NX, LY = NY * Math.sqrt(3) / 2, dt = 0.005;
    const p = { Thot: 0.6 };
    let x, y, vx, vy, fx, fy, feat, lab, cen;
    function forces() {
      fx.fill(0); fy.fill(0);
      const nb = Array.from({ length: N }, () => []);
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        let dx = x[i] - x[j], dy = y[i] - y[j];
        dx -= LX * Math.round(dx / LX); dy -= LY * Math.round(dy / LY);
        const r2 = dx * dx + dy * dy;
        if (r2 > 4) continue;
        const r = Math.sqrt(r2), e = Math.exp(-3 * (r - 1)), f = 6 * (e * e - e) / r;
        fx[i] += f * dx; fy[i] += f * dy; fx[j] -= f * dx; fy[j] -= f * dy;
        if (r < 1.35) { nb[i].push([dx, dy]); nb[j].push([-dx, -dy]); }
      }
      feat = nb.map(l => {
        let c = 0, s = 0;
        for (const [a, b] of l) { const t = Math.atan2(b, a); c += Math.cos(6 * t); s += Math.sin(6 * t); }
        return [l.length / 6, l.length ? Math.hypot(c, s) / l.length : 0];
      });
    }
    return {
      perFrame: 5,
      params: [{ key: "Thot", label: "hot side temperature", min: 0.1, max: 1.5, step: 0.05, value: 0.6 }],
      set(k, v) { p[k] = v; },
      reset() {
        x = new Float64Array(N); y = new Float64Array(N); vx = new Float64Array(N); vy = new Float64Array(N);
        fx = new Float64Array(N); fy = new Float64Array(N);
        for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const k = j * NX + i; x[k] = i + 0.5 * (j % 2) + 0.25; y[k] = (j + 0.5) * Math.sqrt(3) / 2; }
        cen = [[1, 1], [0.7, 0.4]]; lab = new Uint8Array(N);
        forces();
      },
      step() {
        for (let i = 0; i < N; i++) { vx[i] += 0.5 * dt * fx[i]; vy[i] += 0.5 * dt * fy[i]; x[i] = (x[i] + dt * vx[i] + LX) % LX; y[i] = (y[i] + dt * vy[i] + LY) % LY; }
        forces();
        for (let i = 0; i < N; i++) {
          vx[i] += 0.5 * dt * fx[i]; vy[i] += 0.5 * dt * fy[i];
          const T = 0.05 + (p.Thot - 0.05) * Math.max(0, 1 - x[i] / (LX * 0.7));
          const c1 = Math.exp(-2 * dt), c2 = Math.sqrt((1 - c1 * c1) * T);
          vx[i] = c1 * vx[i] + c2 * gauss(); vy[i] = c1 * vy[i] + c2 * gauss();
        }
        // one k-means step on the features
        for (let i = 0; i < N; i++) {
          const d0 = (feat[i][0] - cen[0][0]) ** 2 + (feat[i][1] - cen[0][1]) ** 2, d1 = (feat[i][0] - cen[1][0]) ** 2 + (feat[i][1] - cen[1][1]) ** 2;
          lab[i] = d0 <= d1 ? 0 : 1;
        }
        for (let c = 0; c < 2; c++) {
          let a = 0, b = 0, m = 0;
          for (let i = 0; i < N; i++) if (lab[i] === c) { a += feat[i][0]; b += feat[i][1]; m++; }
          if (m) cen[c] = [a / m, b / m];
        }
        if (cen[0][1] < cen[1][1]) { cen.reverse(); for (let i = 0; i < N; i++) lab[i] = 1 - lab[i]; }
      },
      draw(ctx, w, h, col) {
        const bw = w * 0.55, s = Math.min(bw / LX, h / LY), oy = (h - LY * s) / 2;
        for (let i = 0; i < N; i++) { ctx.fillStyle = lab[i] ? col.b : col.a; dot(ctx, x[i] * s, oy + y[i] * s, s * 0.42); }
        const P = plotBox(ctx, [bw + 30, 14, w - bw - 40, h - 42], [0.2, 1.25], [0, 1.05], col, "n / 6", "ψ6");
        for (let i = 0; i < N; i++) { ctx.fillStyle = lab[i] ? col.b : col.a; dot(ctx, P.X(feat[i][0] + 0.03 * (rand() - 0.5)), P.Y(feat[i][1]), 2.2); }
        ctx.strokeStyle = col.ink; ctx.lineWidth = 2;
        for (const [a, b] of cen) { const X = P.X(a), Y = P.Y(b); ctx.beginPath(); ctx.moveTo(X - 5, Y - 5); ctx.lineTo(X + 5, Y + 5); ctx.moveTo(X + 5, Y - 5); ctx.lineTo(X - 5, Y + 5); ctx.stroke(); }
      },
      info() {
        let c = 0; for (let i = 0; i < N; i++) if (!lab[i]) c++;
        return `crystal-like = ${(100 * c / N).toFixed(0)}%   liquid-like = ${(100 - 100 * c / N).toFixed(0)}%`;
      }
    };
  }
};

// A periodic LJ fluid with a solid slab across the middle of the box.
class SlabBox extends LJBox {
  constructor(o) { super(Object.assign({ walls: false }, o)); }
  init() {
    super.init();
    this.yc = this.LY / 2; this.half = 0.5;
    // put particles on a grid, keeping them out of the slab
    const free = this.LY - 2 * this.half - 1.4;
    const cols = Math.ceil(Math.sqrt(this.N * this.LX / free)), rows = Math.ceil(this.N / cols);
    for (let i = 0; i < this.N; i++) {
      const u = (Math.floor(i / cols) + 0.5) / rows * free;
      this.x[i] = (i % cols + 0.5) * this.LX / cols;
      this.y[i] = (this.yc + this.half + 0.7 + u) % this.LY;
    }
    this.forces();
  }
  // distance from the nearest slab surface
  z(i) { return Math.abs(this.y[i] - this.yc) - this.half; }
  forces() {
    super.forces();
    for (let i = 0; i < this.N; i++) {
      const d = this.y[i] - this.yc, z = Math.max(Math.abs(d) - this.half, 0.6);
      this.fy[i] += Math.sign(d) * this.wallEps * (1.2 / z ** 10 - 3 / z ** 4);
    }
  }
  drawSlab(ctx, s, col) {
    ctx.fillStyle = col.ink;
    ctx.fillRect(0, (this.yc - this.half) * s, this.LX * s, 2 * this.half * s);
  }
}

DEMOS["an-wall-rdf"] = {
  title: "Layers and g(r) next to a surface",
  text: "A liquid next to a solid slab forms layers. Here, you can compare the structure in the first layer with the structure of the liquid far from the surface.",
  details: "150 LJ particles, periodic box with a 9-3 slab in the middle. Top: &rho;(z) vs distance from the surface. Bottom: g(r) inside the first layer (orange) and far from the surface (blue)",
  make() {
    const N = 115, LX = 16, LY = 13, zmax = 5.5, zb = 80, rmax = 4, rb = 50, dz = zmax / zb, dr = rmax / rb;
    const p = { eps: 2.5, T: 1 };
    let sys, rho, gL, gB, nL, nB, samples;
    const clear = () => { rho = new Float64Array(zb); gL = new Float64Array(rb); gB = new Float64Array(rb); nL = 0; nB = 0; samples = 0; };
    return {
      perFrame: 4,
      params: [
        { key: "eps", label: "surface attraction", min: 0.2, max: 6, step: 0.1, value: 2.5 },
        { key: "T", label: "T*", min: 0.6, max: 2, step: 0.05, value: 1 }
      ],
      set(k, v) { p[k] = v; sys.wallEps = p.eps; sys.T = p.T; clear(); },
      reset() { sys = new SlabBox({ N, LX, LY, T: p.T, wallEps: p.eps, dt: 0.004 }); clear(); },
      step() {
        sys.step();
        if (Math.round(sys.t / sys.dt) % 10 || sys.t < 2) return;
        const z = Array.from({ length: N }, (_, i) => sys.z(i));
        for (let i = 0; i < N; i++) { const b = Math.floor(z[i] / dz); if (b >= 0 && b < zb) rho[b]++; }
        for (let i = 0; i < N; i++) {
          const layer = z[i] < 1.2, far = z[i] > 3.2;
          if (!layer && !far) continue;
          layer ? nL++ : nB++;
          for (let j = 0; j < N; j++) {
            if (i === j) continue;
            let dx = sys.x[i] - sys.x[j], dy = sys.y[i] - sys.y[j];
            dx -= LX * Math.round(dx / LX); dy -= LY * Math.round(dy / LY);
            const r = Math.hypot(dx, dy);
            if (r >= rmax) continue;
            if (layer) { if (z[j] < 1.2 && Math.sign(sys.y[i] - sys.yc) === Math.sign(sys.y[j] - sys.yc)) gL[Math.floor(r / dr)]++; }
            else gB[Math.floor(r / dr)]++;
          }
        }
        samples++;
      },
      draw(ctx, w, h, col) {
        const s = Math.min(w * 0.42 / LX, h / LY), bw = LX * s;
        ctx.fillStyle = col.a;
        for (let i = 0; i < N; i++) { ctx.fillStyle = sys.z(i) < 1.2 ? col.b : col.a; dot(ctx, sys.x[i] * s, sys.y[i] * s, s * 0.45); }
        sys.drawSlab(ctx, s, col);
        const px = bw + 34, pw = w - px - 12, ph = (h - 84) / 2;
        // density profile, both sides of the slab added together
        const prof = Array.from(rho, (c, k) => [(k + 0.5) * dz, samples ? c / (samples * 2 * LX * dz) : 0]);
        const top = Math.max(1.5, ...prof.map(q => q[1])) * 1.1;
        const P1 = plotBox(ctx, [px, 12, pw, ph], [0, zmax], [0, top], col, "z from surface", "ρ(z)");
        P1.line(prof, col.b, 2);
        // layer g(r): the first layer is a line here, so normalize by a 1D density
        const lineRho = nL && samples ? (nL / samples) / (2 * LX) : 1;
        const bulkRho = N / (LX * LY);
        const g1 = Array.from(gL, (c, k) => [(k + 0.5) * dr, nL ? c / (nL * lineRho * 2 * dr) : 0]);
        const g2 = Array.from(gB, (c, k) => [(k + 0.5) * dr, nB ? c / (nB * bulkRho * 2 * Math.PI * (k + 0.5) * dr * dr) : 0]);
        const P2 = plotBox(ctx, [px, ph + 40, pw, ph], [0, rmax], [0, 4], col, "r / σ", "g(r)");
        P2.hline(1, col.rule);
        P2.line(g2, col.a, 2);
        P2.line(g1, col.b, 2);
      },
      info() { return `samples = ${samples}   first layer: ${nL && samples ? (nL / samples).toFixed(1) : "-"} particles`; }
    };
  }
};

DEMOS["an-wall-msd"] = {
  title: "Diffusion along and across a surface",
  text: "",
  details: "Same slab system. Particles are grouped by where they are at each time origin. Solid: lateral MSD (x), dashed: normal MSD (y). Orange: start in the first layer, blue: start far from it. Averaged over many time origins",
  make() {
    const N = 115, LX = 16, LY = 13, lags = 80, every = 25;
    const p = { eps: 2.5, T: 1 };
    let sys, ux, uy, origins, acc, cnt, nstep;
    return {
      perFrame: 5,
      params: [
        { key: "eps", label: "surface attraction", min: 0.2, max: 6, step: 0.1, value: 2.5 },
        { key: "T", label: "T*", min: 0.6, max: 2, step: 0.05, value: 1 }
      ],
      set(k, v) { p[k] = v; sys.wallEps = p.eps; sys.T = p.T; origins = []; acc = [0, 1, 2, 3].map(() => new Float64Array(lags)); cnt = [new Float64Array(lags), new Float64Array(lags)]; },
      reset() {
        sys = new SlabBox({ N, LX, LY, T: p.T, wallEps: p.eps, dt: 0.004 });
        ux = Float64Array.from(sys.x); uy = Float64Array.from(sys.y);
        origins = []; nstep = 0;
        acc = [0, 1, 2, 3].map(() => new Float64Array(lags)); cnt = [new Float64Array(lags), new Float64Array(lags)];
      },
      step() {
        const ox = Float64Array.from(sys.x), oy = Float64Array.from(sys.y);
        sys.step(); nstep++;
        for (let i = 0; i < N; i++) {
          let dx = sys.x[i] - ox[i], dy = sys.y[i] - oy[i];
          dx -= LX * Math.round(dx / LX); dy -= LY * Math.round(dy / LY);
          ux[i] += dx; uy[i] += dy;
        }
        if (nstep % every || sys.t < 2) return;
        // new time origin
        const grp = Array.from({ length: N }, (_, i) => { const z = sys.z(i); return z < 1.2 ? 0 : z > 3.2 ? 1 : -1; });
        origins.push({ x: Float64Array.from(ux), y: Float64Array.from(uy), grp, k: 0 });
        for (const o of origins) {
          for (let i = 0; i < N; i++) {
            const g = o.grp[i]; if (g < 0) continue;
            acc[2 * g][o.k] += (ux[i] - o.x[i]) ** 2;
            acc[2 * g + 1][o.k] += (uy[i] - o.y[i]) ** 2;
            cnt[g][o.k]++;
          }
          o.k++;
        }
        origins = origins.filter(o => o.k < lags);
      },
      draw(ctx, w, h, col) {
        const s = Math.min(w * 0.42 / LX, h / LY), bw = LX * s;
        for (let i = 0; i < N; i++) { ctx.fillStyle = sys.z(i) < 1.2 ? col.b : col.a; dot(ctx, sys.x[i] * s, sys.y[i] * s, s * 0.45); }
        sys.drawSlab(ctx, s, col);
        const tl = every * sys.dt;
        const curve = (a, g) => Array.from(acc[a], (v, k) => [k * tl, cnt[g][k] ? v / cnt[g][k] : NaN]);
        const cs = [curve(2, 1), curve(3, 1), curve(0, 0), curve(1, 0)];
        const top = Math.max(0.2, ...cs.flat().map(q => q[1]).filter(isFinite)) * 1.1;
        const P = plotBox(ctx, [bw + 34, 14, w - bw - 46, h - 64], [0, lags * tl], [0, top], col, "t", "MSD per direction");
        P.line(cs[0], col.a, 2); P.line(cs[1], col.a, 2, [5, 4]);
        P.line(cs[2], col.b, 2); P.line(cs[3], col.b, 2, [5, 4]);
      },
      info() {
        const k = lags - 1, t = k * every * sys.dt;
        if (!cnt[0][k] || !cnt[1][k]) return "collecting time origins...";
        const D = (a, g) => (acc[a][k] / cnt[g][k] / (2 * t)).toFixed(3);
        return `D along: layer ${D(0, 0)}, far ${D(2, 1)}   across: layer ${D(1, 0)}, far ${D(3, 1)}`;
      }
    };
  }
};

DEMOS["an-hydration"] = {
  title: "Hydration shell from the RDF",
  text: "A solute in a liquid, its first solvation shell, and the coordination number read off the RDF.",
  details: "one fixed solute in 90 LJ solvent particles, solute-solvent LJ with &sigma; = (&sigma;<sub>s</sub> + 1)/2. Blue: g(r) around the solute, orange: running coordination number n(r) = &rho; &int; g(r') 2&pi;r' dr'",
  make() {
    const N = 90, LX = 14, LY = 14 * 7 / 12, rmax = 4, bins = 50, dr = rmax / bins;
    const p = { size: 1.6, eps: 2, T: 1 };
    let sys, hist, samples;
    const sx = LX / 2, sy = LY / 2;
    const sig = () => (p.size + 1) / 2;
    const solute = sysx => {
      const f0 = sysx.forces.bind(sysx);
      sysx.forces = () => {
        f0();
        const s = sig(), rc2 = (2.5 * s) ** 2;
        for (let i = 0; i < N; i++) {
          let dx = sysx.x[i] - sx, dy = sysx.y[i] - sy;
          dx -= LX * Math.round(dx / LX); dy -= LY * Math.round(dy / LY);
          const r2 = dx * dx + dy * dy; if (r2 > rc2) continue;
          const i2 = s * s / Math.max(r2, 0.64 * s * s), i6 = i2 * i2 * i2;
          const f = 24 * p.eps * i6 * (2 * i6 - 1) / Math.max(r2, 0.64 * s * s);
          sysx.fx[i] += f * dx; sysx.fy[i] += f * dy;
        }
      };
      // move solvent out of the solute
      for (let i = 0; i < N; i++) {
        let dx = sysx.x[i] - sx, dy = sysx.y[i] - sy;
        if (Math.hypot(dx, dy) < sig() * 1.1) { const a = rand() * 2 * Math.PI; sysx.x[i] = sx + Math.cos(a) * sig() * 1.3; sysx.y[i] = sy + Math.sin(a) * sig() * 1.3; }
      }
      sysx.forces();
      return sysx;
    };
    const g = () => Array.from(hist, (c, k) => samples ? c / (samples * (N / (LX * LY)) * 2 * Math.PI * (k + 0.5) * dr * dr) : 0);
    const shell = () => {
      const gg = g(); let peak = 0;
      for (let k = 1; k < bins; k++) if (gg[k] > gg[peak]) peak = k;
      for (let k = peak + 1; k < bins - 1; k++) {
        const m = (gg[k - 1] + gg[k] + gg[k + 1]) / 3;
        if (m <= (gg[k] + gg[k + 1] + gg[k + 2]) / 3 && gg[k] < gg[peak] * 0.8) return k;
      }
      return bins - 1;
    };
    const cn = k => { let c = 0; for (let j = 0; j <= k; j++) c += hist[j]; return samples ? c / samples : 0; };
    return {
      perFrame: 4,
      params: [
        { key: "size", label: "solute size σ_s", min: 0.8, max: 3, step: 0.05, value: 1.6 },
        { key: "eps", label: "solute attraction", min: 0.2, max: 5, step: 0.1, value: 2 },
        { key: "T", label: "T*", min: 0.6, max: 2, step: 0.05, value: 1 }
      ],
      set(k, v) { p[k] = v; sys.T = p.T; if (k === "size") this.reset(); else { hist.fill(0); samples = 0; } },
      reset() { sys = solute(new LJBox({ N, LX, LY, T: p.T, dt: 0.004 })); hist = new Float64Array(bins); samples = 0; },
      step() {
        sys.step();
        if (Math.round(sys.t / sys.dt) % 5 || sys.t < 1) return;
        for (let i = 0; i < N; i++) {
          let dx = sys.x[i] - sx, dy = sys.y[i] - sy;
          dx -= LX * Math.round(dx / LX); dy -= LY * Math.round(dy / LY);
          const r = Math.hypot(dx, dy); if (r < rmax) hist[Math.floor(r / dr)]++;
        }
        samples++;
      },
      draw(ctx, w, h, col) {
        const bw = w * 0.46, s = bw / LX;
        const k = shell(), rs = (k + 0.5) * dr;
        ctx.strokeStyle = col.b; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(sx * s, sy * s, rs * s, 0, 2 * Math.PI); ctx.stroke(); ctx.setLineDash([]);
        for (let i = 0; i < N; i++) {
          let dx = sys.x[i] - sx, dy = sys.y[i] - sy;
          dx -= LX * Math.round(dx / LX); dy -= LY * Math.round(dy / LY);
          ctx.fillStyle = samples > 20 && Math.hypot(dx, dy) < rs ? col.b : col.a;
          dot(ctx, sys.x[i] * s, sys.y[i] * s, s * 0.45);
        }
        ctx.fillStyle = col.ink; dot(ctx, sx * s, sy * s, s * p.size / 2);
        const P = plotBox(ctx, [bw + 36, 14, w - bw - 74, h - 42], [0, rmax], [0, 5], col, "r", "g(r)");
        P.hline(1, col.rule);
        P.line(g().map((v, j) => [(j + 0.5) * dr, v]), col.a, 2);
        const nmax = Math.max(4, cn(bins - 1));
        P.line(Array.from(hist, (_, j) => [(j + 1) * dr, cn(j) / nmax * 5]), col.b, 1.5);
        ctx.strokeStyle = col.b; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(P.X(rs), 14); ctx.lineTo(P.X(rs), h - 28); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = col.b; ctx.font = "10px monospace";
        ctx.fillText(`n = ${Math.round(nmax)}`, w - 70, 12);
        ctx.fillText("first min", P.X(rs) + 3, 26);
      },
      info() {
        if (samples < 20) return "sampling...";
        const k = shell();
        return `first minimum r = ${((k + 0.5) * dr).toFixed(2)}   coordination number = ${cn(k).toFixed(1)}`;
      }
    };
  }
};
