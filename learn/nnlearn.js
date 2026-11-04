// Learn: neural networks from the ground up

const ACT = [
  { name: "sigmoid", f: z => 1 / (1 + Math.exp(-z)) },
  { name: "tanh", f: z => Math.tanh(z) },
  { name: "ReLU", f: z => Math.max(0, z) }
];

DEMOS["nn-neuron"] = {
  title: "One neuron",
  text: "",
  details: "y = f(w x + b), with f = sigmoid, tanh or ReLU",
  make() {
    const p = { w: 1.5, b: 0, act: 0 };
    return {
      perFrame: 1,
      params: [
        { key: "w", label: "weight w", min: -4, max: 4, step: 0.1, value: 1.5 },
        { key: "b", label: "bias b", min: -4, max: 4, step: 0.1, value: 0 },
        { key: "act", label: "activation (0 sigmoid, 1 tanh, 2 ReLU)", min: 0, max: 2, step: 1, value: 0 }
      ],
      set(k, v) { p[k] = v; },
      reset() {},
      step() {},
      draw(ctx, w, h, col) {
        const A = ACT[p.act], bw = w * 0.42, cy = h / 2 - 10;
        // little diagram: x -> (w) -> sum + b -> f -> y
        ctx.font = "13px monospace"; ctx.textAlign = "center";
        const node = (x, label, c) => { ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, cy, 20, 0, 2 * Math.PI); ctx.stroke(); ctx.fillStyle = col.ink; ctx.fillText(label, x, cy + 4); };
        const arrow = (x0, x1, label) => {
          ctx.strokeStyle = col.muted; ctx.lineWidth = 1 + Math.min(4, Math.abs(p.w)); ctx.beginPath(); ctx.moveTo(x0, cy); ctx.lineTo(x1, cy); ctx.stroke();
          ctx.lineWidth = 1; ctx.fillStyle = col.muted; ctx.fillText(label, (x0 + x1) / 2, cy - 30);
        };
        const x1 = bw * 0.12, x2 = bw * 0.5, x3 = bw * 0.88;
        arrow(x1 + 20, x2 - 20, `w = ${p.w.toFixed(1)}`);
        ctx.lineWidth = 1;
        ctx.strokeStyle = col.muted; ctx.beginPath(); ctx.moveTo(x2 + 20, cy); ctx.lineTo(x3 - 20, cy); ctx.stroke();
        ctx.fillStyle = col.muted; ctx.fillText(A.name, (x2 + x3) / 2, cy - 30);
        node(x1, "x", col.a); node(x2, "Σ", col.b); node(x3, "y", col.a);
        ctx.fillStyle = col.muted; ctx.fillText(`+ b = ${p.b.toFixed(1)}`, x2, cy + 42);
        ctx.textAlign = "start";
        const yr = p.act === 2 ? [-0.5, 4] : p.act === 1 ? [-1.2, 1.2] : [-0.1, 1.1];
        const P = plotBox(ctx, [bw + 36, 14, w - bw - 50, h - 42], [-4, 4], yr, col, "x", "y");
        P.hline(0, col.rule);
        const pts = []; for (let k = 0; k <= 160; k++) { const x = -4 + 8 * k / 160; pts.push([x, A.f(p.w * x + p.b)]); }
        P.line(pts, col.b, 2.5);
        if (p.w) { const xm = -p.b / p.w; if (xm > -4 && xm < 4) { ctx.strokeStyle = col.a; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(P.X(xm), 14); ctx.lineTo(P.X(xm), h - 28); ctx.stroke(); ctx.setLineDash([]); } }
      },
      info() { return `switch point x = -b/w = ${p.w ? (-p.b / p.w).toFixed(2) : "none"}   steepness set by |w|`; }
    };
  }
};

DEMOS["nn-train"] = {
  title: "Training a small network",
  text: "A small network fits a curve by backpropagation. Each faint line is one hidden neuron.",
  hint: "Click on the right plot to add a data point.",
  details: "1 input, H tanh hidden units, 1 linear output. Full-batch gradient descent on the mean squared error, gradients by backpropagation written out by hand",
  make() {
    const p = { H: 6, lr: 0.05 };
    let W1, b1, W2, b2, data, losses, epoch;
    const forward = x => {
      const a = new Float64Array(p.H);
      let y = b2;
      for (let j = 0; j < p.H; j++) { a[j] = Math.tanh(W1[j] * x + b1[j]); y += W2[j] * a[j]; }
      return { a, y };
    };
    const box = (w, h) => [w * 0.42 + 30, 14, w * 0.58 - 44, (h - 70) * 0.62];
    return {
      perFrame: 1,
      params: [
        { key: "H", label: "hidden units", min: 1, max: 12, step: 1, value: 6 },
        { key: "lr", label: "learning rate", min: 0.005, max: 0.3, step: 0.005, value: 0.05 }
      ],
      set(k, v) { p[k] = v; if (k === "H") this.reset(); },
      reset() {
        W1 = Float64Array.from({ length: p.H }, () => gauss() * 1.5); b1 = Float64Array.from({ length: p.H }, () => gauss());
        W2 = Float64Array.from({ length: p.H }, () => gauss() * 0.3); b2 = 0;
        data = []; for (let k = 0; k < 24; k++) { const x = -3 + 6 * rand(); data.push([x, Math.sin(1.4 * x) + 0.3 * x + 0.12 * gauss()]); }
        losses = []; epoch = 0;
      },
      click(px, py, w, h) {
        const [bx, by, bw, bh] = box(w, h);
        if (px < bx || px > bx + bw || py < by || py > by + bh) return;
        data.push([-3.5 + (px - bx) / bw * 7, 2.5 - (py - by) / bh * 5]);
      },
      step() {
        for (let it = 0; it < 20; it++) {
          const gW1 = new Float64Array(p.H), gb1 = new Float64Array(p.H), gW2 = new Float64Array(p.H);
          let gb2 = 0, L = 0;
          for (const [x, t] of data) {
            const { a, y } = forward(x), e = y - t;
            L += e * e;
            // backpropagation: output error flows back through W2 and tanh'
            gb2 += e;
            for (let j = 0; j < p.H; j++) {
              gW2[j] += e * a[j];
              const d = e * W2[j] * (1 - a[j] * a[j]);
              gW1[j] += d * x; gb1[j] += d;
            }
          }
          const n = data.length;
          for (let j = 0; j < p.H; j++) { W1[j] -= p.lr * gW1[j] / n; b1[j] -= p.lr * gb1[j] / n; W2[j] -= p.lr * gW2[j] / n; }
          b2 -= p.lr * gb2 / n;
          epoch++;
          if (epoch % 20 === 0) { losses.push(L / n); if (losses.length > 400) losses.shift(); }
        }
      },
      draw(ctx, w, h, col) {
        // network diagram, edge width = |weight|, color = sign
        const dw = w * 0.42, hy = j => 20 + (j + 0.5) * (h - 50) / p.H;
        const xi = dw * 0.12, xh = dw * 0.5, xo = dw * 0.88, ym = (h - 30) / 2 + 5;
        const edge = (x0, y0, x1, y1, v) => { ctx.strokeStyle = v > 0 ? col.a : col.b; ctx.globalAlpha = 0.85; ctx.lineWidth = Math.min(6, 0.5 + Math.abs(v) * 1.5); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.globalAlpha = 1; };
        for (let j = 0; j < p.H; j++) { edge(xi, ym, xh, hy(j), W1[j]); edge(xh, hy(j), xo, ym, W2[j]); }
        ctx.fillStyle = col.ink;
        dot(ctx, xi, ym, 8); dot(ctx, xo, ym, 8);
        for (let j = 0; j < p.H; j++) { ctx.fillStyle = col.paper; dot(ctx, xh, hy(j), 7); ctx.strokeStyle = col.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(xh, hy(j), 7, 0, 7); ctx.stroke(); }
        ctx.fillStyle = col.muted; ctx.font = "10px monospace"; ctx.fillText("x", xi - 3, ym + 22); ctx.fillText("y", xo - 3, ym + 22); ctx.fillText("tanh", xh - 12, h - 14);
        // fit with each hidden unit's share in faint lines
        const P = plotBox(ctx, box(w, h), [-3.5, 3.5], [-2.5, 2.5], col, "x", "y");
        for (let j = 0; j < p.H; j++) {
          const pts = []; for (let k = 0; k <= 60; k++) { const x = -3.5 + 7 * k / 60; pts.push([x, W2[j] * Math.tanh(W1[j] * x + b1[j])]); }
          P.line(pts, col.rule, 1);
        }
        P.dots(data, col.a, 3.5);
        const fit = []; for (let k = 0; k <= 120; k++) { const x = -3.5 + 7 * k / 120; fit.push([x, forward(x).y]); }
        P.line(fit, col.b, 2.5);
        const [bx, by, bw, bh] = box(w, h);
        if (losses.length > 1) {
          const lmin = Math.log10(Math.min(...losses)) - 0.1, lmax = Math.log10(Math.max(...losses)) + 0.1;
          const Q = plotBox(ctx, [bx, by + bh + 26, bw, h - bh - 70], [0, losses.length], [lmin, lmax], col, "epochs", "log loss");
          Q.line(losses.map((l, k) => [k, Math.log10(l)]), col.a, 1.5);
        }
      },
      info() { return `epoch ${epoch}   loss ${losses.length ? losses[losses.length - 1].toExponential(2) : "-"}   ${data.length} points`; }
    };
  }
};
