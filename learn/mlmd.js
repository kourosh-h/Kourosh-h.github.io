// Learn: machine learning in MD

DEMOS["ml-descriptor"] = {
  title: "Describing an atom's surroundings",
  text: "",
  hint: "Drag the neighbors around. Turning the whole group leaves the descriptor unchanged.",
  details: "radial symmetry functions G(R<sub>s</sub>) = &Sigma;<sub>j</sub> exp(&minus;&eta;(r<sub>ij</sub> &minus; R<sub>s</sub>)<sup>2</sup>) f<sub>c</sub>(r<sub>ij</sub>), &eta; = 4 &Aring;<sup>&minus;2</sup>, cutoff 5 &Aring; with f<sub>c</sub> = &frac12;[cos(&pi;r/r<sub>c</sub>) + 1]",
  make() {
    const rc = 5, eta = 4, Rs = Array.from({ length: 10 }, (_, k) => 0.8 + k * 0.45);
    const p = { rot: 0 };
    let nb, held = -1;
    const rotated = () => nb.map(([x, y]) => { const a = p.rot * Math.PI / 180; return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]; });
    return {
      perFrame: 1,
      params: [{ key: "rot", label: "turn all neighbors (deg)", min: 0, max: 360, step: 1, value: 0 }],
      set(k, v) { p[k] = v; },
      reset() { nb = [[1.5, 0.3], [-1.2, 1.1], [0.2, -1.7], [2.8, 1.9], [-2.6, -1.4], [3.9, -0.8]]; },
      drag(px, py, w, h, down) {
        const s = h / (2 * rc + 1), ox = w * 0.27, oy = h / 2;
        if (!down) { held = -1; return; }
        const pos = rotated();
        if (held < 0) {
          let bd = Infinity;
          pos.forEach(([x, y], i) => { const d = (ox + x * s - px) ** 2 + (oy - y * s - py) ** 2; if (d < bd) { bd = d; held = i; } });
        }
        const a = -p.rot * Math.PI / 180, X = (px - ox) / s, Y = -(py - oy) / s;
        nb[held] = [X * Math.cos(a) - Y * Math.sin(a), X * Math.sin(a) + Y * Math.cos(a)];
      },
      step() {},
      draw(ctx, w, h, col) {
        const s = h / (2 * rc + 1), ox = w * 0.27, oy = h / 2, pos = rotated();
        ctx.strokeStyle = col.rule; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(ox, oy, rc * s, 0, 2 * Math.PI); ctx.stroke(); ctx.setLineDash([]);
        for (const [x, y] of pos) {
          const r = Math.hypot(x, y);
          ctx.strokeStyle = r < rc ? col.muted : col.rule; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + x * s, oy - y * s); ctx.stroke();
          ctx.fillStyle = r < rc ? col.b : col.rule; dot(ctx, ox + x * s, oy - y * s, s * 0.35);
        }
        ctx.fillStyle = col.a; dot(ctx, ox, oy, s * 0.45);
        const G = Rs.map(R => pos.reduce((acc, [x, y]) => { const r = Math.hypot(x, y); return r < rc ? acc + Math.exp(-eta * (r - R) ** 2) * 0.5 * (Math.cos(Math.PI * r / rc) + 1) : acc; }, 0));
        this.G = G;
        const P = plotBox(ctx, [w * 0.56, 14, w * 0.42, h - 42], [0, Rs.length], [0, 1.6], col, "R_s", "G");
        ctx.fillStyle = col.a;
        G.forEach((g, k) => { const x0 = P.X(k + 0.15), x1 = P.X(k + 0.85); ctx.fillRect(x0, P.Y(Math.min(g, 1.6)), x1 - x0, P.Y(0) - P.Y(Math.min(g, 1.6))); });
      },
      info() { return this.G ? `descriptor = [${this.G.map(g => g.toFixed(2)).join(", ")}]` : ""; }
    };
  }
};

DEMOS["ml-potential"] = {
  title: "A neural network potential for a dimer",
  text: "",
  details: "reference: Morse curve. Network: 1 input (r), 16 tanh units, 1 output (E), Adam. The force is the negative derivative of the network output",
  make() {
    const H = 16, De = 1, a = 1.8, r0 = 1.2;
    const ref = r => De * (1 - Math.exp(-a * (r - r0))) ** 2 - De;
    const p = { n: 10, hi: 2.2 };
    let X, Y, W1, b1, W2, b2, m, v, t, loss;
    const fwd = r => { const z = (r - 1.6) / 0.6; const hdn = W1.map((w, k) => Math.tanh(w * z + b1[k])); return { hdn, z, out: hdn.reduce((s, q, k) => s + W2[k] * q, b2) }; };
    function init() {
      W1 = Array.from({ length: H }, () => 2 * gauss()); b1 = Array.from({ length: H }, () => gauss());
      W2 = Array.from({ length: H }, () => 0.3 * gauss()); b2 = 0;
      m = new Float64Array(3 * H + 1); v = new Float64Array(3 * H + 1); t = 0; loss = 0;
    }
    function data() { X = Array.from({ length: p.n }, (_, k) => 0.95 + (p.hi - 0.95) * (p.n > 1 ? k / (p.n - 1) : 0.5)); Y = X.map(ref); }
    return {
      perFrame: 10,
      params: [
        { key: "n", label: "training points", min: 2, max: 30, step: 1, value: 10 },
        { key: "hi", label: "largest r in data", min: 1.4, max: 3.5, step: 0.05, value: 2.2 }
      ],
      set(k, val) { p[k] = val; data(); init(); },
      reset() { data(); init(); },
      step() {
        const g = new Float64Array(3 * H + 1);
        let L = 0;
        X.forEach((r, i) => {
          const { hdn, z, out } = fwd(r), d = 2 * (out - Y[i]) / X.length;
          L += (out - Y[i]) ** 2;
          for (let k = 0; k < H; k++) {
            g[2 * H + k] += d * hdn[k];
            const dh = d * W2[k] * (1 - hdn[k] ** 2);
            g[k] += dh * z; g[H + k] += dh;
          }
          g[3 * H] += d;
        });
        loss = L / X.length; t++;
        const params = [...W1, ...b1, ...W2, b2];
        for (let i = 0; i < params.length; i++) {
          m[i] = 0.9 * m[i] + 0.1 * g[i]; v[i] = 0.999 * v[i] + 0.001 * g[i] ** 2;
          params[i] -= 0.01 * (m[i] / (1 - 0.9 ** t)) / (Math.sqrt(v[i] / (1 - 0.999 ** t)) + 1e-8);
        }
        W1 = params.slice(0, H); b1 = params.slice(H, 2 * H); W2 = params.slice(2 * H, 3 * H); b2 = params[3 * H];
      },
      draw(ctx, w, h, col) {
        const P = plotBox(ctx, [40, 14, w - 56, h - 42], [0.85, 3.6], [-1.3, 1.5], col, "r", "E");
        ctx.fillStyle = col.paper; ctx.fillRect(P.X(0.95), 14, P.X(p.hi) - P.X(0.95), h - 42);
        P.hline(0, col.rule);
        const rc = [], nc = [];
        for (let k = 0; k <= 200; k++) { const r = 0.85 + 2.75 * k / 200; rc.push([r, ref(r)]); nc.push([r, fwd(r).out]); }
        P.line(rc, col.muted, 2, [4, 3]); P.line(nc, col.a, 2.5);
        P.dots(X.map((r, i) => [r, Y[i]]), col.b, 4);
        ctx.fillStyle = col.muted; ctx.font = "10px monospace"; ctx.fillText("shaded: where the training data is", P.X(0.97), 28);
      },
      info() { return `step ${t}   training loss ${loss.toExponential(1)}`; }
    };
  }
};

DEMOS["ml-active"] = {
  title: "Active learning: ask where you are unsure",
  text: "",
  details: "Gaussian process on a 1D energy curve. Every second a new reference calculation is added, either where the model's uncertainty is largest or at a random point",
  make() {
    const ell = 0.35, sn = 0.02;
    const ref = x => 2 * (x * x - 1) ** 2 + 0.6 * Math.sin(3 * x) + 0.3 * x;
    const p = { strategy: 1 };
    let X, Y, mean, sd, tick;
    const kf = (a, b) => Math.exp(-((a - b) ** 2) / (2 * ell * ell));
    function compute() {
      const n = X.length, K = X.map(a => X.map(b => kf(a, b)));
      for (let i = 0; i < n; i++) K[i][i] += sn * sn;
      const ym = Y.reduce((s, q) => s + q, 0) / n;
      const alpha = solveLinear(K, Y.map(q => q - ym));
      mean = []; sd = [];
      for (let g = 0; g <= 120; g++) {
        const x = -1.8 + 3.6 * g / 120, ks = X.map(a => kf(a, x));
        mean.push(ym + ks.reduce((s, q, i) => s + q * alpha[i], 0));
        const vk = solveLinear(K, ks);
        sd.push(Math.sqrt(Math.max(1e-9, 1 - ks.reduce((s, q, i) => s + q * vk[i], 0))));
      }
    }
    return {
      perFrame: 1,
      params: [{ key: "strategy", label: "0 random, 1 most uncertain", min: 0, max: 1, step: 1, value: 1 }],
      set(k, v) { p[k] = v; this.reset(); },
      reset() { X = [-1.2, 0.1, 1.3]; Y = X.map(ref); tick = 0; compute(); },
      step() {
        if (++tick % 60 || X.length >= 16) return;
        let x;
        if (p.strategy) { const g = sd.indexOf(Math.max(...sd)); x = -1.8 + 3.6 * g / 120; } else x = -1.8 + 3.6 * rand();
        X.push(x); Y.push(ref(x)); compute();
        if (X.length >= 16) tick = -240;
      },
      draw(ctx, w, h, col) {
        if (X.length >= 16 && tick === -1) this.reset();
        const P = plotBox(ctx, [34, 14, w - 50, h - 42], [-1.8, 1.8], [-1.5, 6], col, "x", "E");
        const G = mean.length - 1, xs = g => -1.8 + 3.6 * g / G;
        ctx.fillStyle = col.a; ctx.globalAlpha = 0.15; ctx.beginPath();
        for (let g = 0; g <= G; g++) ctx.lineTo(P.X(xs(g)), P.Y(mean[g] + 2 * sd[g]));
        for (let g = G; g >= 0; g--) ctx.lineTo(P.X(xs(g)), P.Y(mean[g] - 2 * sd[g]));
        ctx.fill(); ctx.globalAlpha = 1;
        const r = []; for (let k = 0; k <= 200; k++) { const x = -1.8 + 3.6 * k / 200; r.push([x, ref(x)]); }
        P.line(r, col.muted, 1.5, [4, 3]);
        P.line(mean.map((m, g) => [xs(g), m]), col.a, 2.5);
        P.dots(X.map((x, i) => [x, Y[i]]), col.b, 4.5);
      },
      info() {
        let e = 0; for (let g = 0; g < mean.length; g++) e = Math.max(e, Math.abs(mean[g] - ref(-1.8 + 3.6 * g / (mean.length - 1))));
        return `${X.length} reference points   largest error = ${e.toFixed(2)}`;
      }
    };
  }
};

DEMOS["ml-states"] = {
  title: "Finding states in a trajectory",
  text: "",
  details: "one long Langevin trajectory on the Muller-Brown surface, k-means on the visited positions, then transitions are counted between consecutive frames",
  make() {
    const dt = 1e-4;
    const p = { k: 3, kT: 15 };
    let x, y, pts, cen, lab, counts;
    function kmeans() {
      if (pts.length < p.k) return;
      if (!cen || cen.length !== p.k) cen = Array.from({ length: p.k }, (_, i) => [...pts[Math.floor(i * pts.length / p.k)]]);
      for (let it = 0; it < 5; it++) {
        lab = pts.map(([a, b]) => { let best = 0, bd = Infinity; cen.forEach(([c, d], j) => { const q = (a - c) ** 2 + (b - d) ** 2; if (q < bd) { bd = q; best = j; } }); return best; });
        cen = cen.map((c, j) => { let a = 0, b = 0, m = 0; pts.forEach((q, i) => { if (lab[i] === j) { a += q[0]; b += q[1]; m++; } }); return m ? [a / m, b / m] : c; });
      }
      counts = Array.from({ length: p.k }, () => new Array(p.k).fill(0));
      for (let i = 1; i < lab.length; i++) counts[lab[i - 1]][lab[i]]++;
    }
    return {
      perFrame: 1,
      params: [
        { key: "k", label: "number of states k", min: 2, max: 5, step: 1, value: 3 },
        { key: "kT", label: "kT", min: 6, max: 30, step: 0.5, value: 15 }
      ],
      set(key, v) { p[key] = v; if (key === "k") { cen = null; kmeans(); } },
      reset() { x = -0.558; y = 1.442; pts = []; cen = null; lab = []; counts = null; },
      step() {
        const s = Math.sqrt(2 * p.kT * dt);
        for (let k = 0; k < 40; k++) {
          const [gx, gy] = MB.grad(x, y);
          x = Math.min(MB.xmax, Math.max(MB.xmin, x - gx * dt + s * gauss()));
          y = Math.min(MB.ymax, Math.max(MB.ymin, y - gy * dt + s * gauss()));
        }
        pts.push([x, y]); if (pts.length > 1500) pts.shift();
        if (pts.length % 20 === 0) kmeans();
      },
      draw(ctx, w, h, col) {
        MB.drawContours(ctx, w, h, col);
        pts.forEach(([a, b], i) => { const [sx, sy] = MB.toScreen(a, b, w, h); ctx.fillStyle = lab && lab[i] !== undefined ? CLUSTER_COLORS[lab[i]] : col.muted; dot(ctx, sx, sy, 1.8); });
        if (cen) cen.forEach(([a, b]) => { const [sx, sy] = MB.toScreen(a, b, w, h); ctx.strokeStyle = col.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx - 6, sy - 6); ctx.lineTo(sx + 6, sy + 6); ctx.moveTo(sx + 6, sy - 6); ctx.lineTo(sx - 6, sy + 6); ctx.stroke(); });
        if (counts) {
          ctx.font = "10px monospace"; ctx.fillStyle = col.muted; ctx.fillText("transitions from row to column", w - 200, 16);
          counts.forEach((row, i) => row.forEach((c, j) => { ctx.fillStyle = i === j ? col.muted : col.ink; ctx.fillText(String(c).padStart(5), w - 200 + j * 40, 32 + i * 14); }));
        }
      },
      info() { return `${pts.length} frames stored`; }
    };
  }
};
