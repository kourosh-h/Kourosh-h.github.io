// A tiny neural network training live
DEMOS.nn = {
  title: "A neural network learning",
  text: "A network with one hidden layer (tanh, with a sigmoid output), trained with Adam on two noisy half moons. With too few hidden units, it can only draw a nearly straight boundary.",
  hint: "Click to add a point. The brush slider picks its class (0 = blue, 1 = orange).",
  details: "full-batch Adam with backprop written by hand, binary cross-entropy loss, 200 points",
  make() {
    let P = 200;
    const p = { H: 8, lr: 0.03, noise: 0.15, brush: 1 };
    let X, Y, W1, b1, W2, b2, opt, epoch, loss, acc, field;
    const view = { xmin: -1.6, xmax: 1.6, ymin: -0.93, ymax: 0.93 };
    function makeData() {
      X = []; Y = [];
      for (let n = 0; n < P; n++) {
        const c = n % 2, th = rand() * Math.PI;
        let x = c ? 1 - Math.cos(th) : Math.cos(th), y = c ? 0.5 - Math.sin(th) : Math.sin(th);
        x = (x - 0.5) / 1.25 + p.noise * gauss() * 0.8; y = (y - 0.25) / 1.25 + p.noise * gauss() * 0.8;
        X.push([x, y]); Y.push(c);
      }
    }
    function initNet() {
      const H = p.H;
      W1 = Array.from({ length: H }, () => [gauss(), gauss()]);
      b1 = new Array(H).fill(0);
      W2 = Array.from({ length: H }, () => gauss() / Math.sqrt(H));
      b2 = 0;
      opt = { t: 0, m: {}, v: {} };
      epoch = 0; loss = 0; acc = 0;
    }
    function forward(x) {
      const h = W1.map((w, k) => Math.tanh(w[0] * x[0] + w[1] * x[1] + b1[k]));
      let z = b2;
      for (let k = 0; k < h.length; k++) z += W2[k] * h[k];
      return { h, out: 1 / (1 + Math.exp(-z)) };
    }
    function adam(name, params, grads) {
      const b1m = 0.9, b2m = 0.999;
      if (!opt.m[name]) { opt.m[name] = grads.map(() => 0); opt.v[name] = grads.map(() => 0); }
      const m = opt.m[name], v = opt.v[name];
      for (let i = 0; i < grads.length; i++) {
        m[i] = b1m * m[i] + (1 - b1m) * grads[i];
        v[i] = b2m * v[i] + (1 - b2m) * grads[i] * grads[i];
        const mh = m[i] / (1 - b1m ** opt.t), vh = v[i] / (1 - b2m ** opt.t);
        params[i] -= p.lr * mh / (Math.sqrt(vh) + 1e-8);
      }
    }
    return {
      perFrame: 4,
      params: [
        { key: "H", label: "hidden units", min: 1, max: 32, step: 1, value: 8 },
        { key: "lr", label: "learning rate", min: 0.002, max: 0.1, step: 0.002, value: 0.03 },
        { key: "noise", label: "noise", min: 0, max: 0.4, step: 0.01, value: 0.15 },
        { key: "brush", label: "brush class", min: 0, max: 1, step: 1, value: 1 }
      ],
      set(k, v) {
        p[k] = v;
        if (k === "H") initNet();
        if (k === "noise") { P = 200; makeData(); initNet(); }
      },
      reset() { P = 200; makeData(); initNet(); },
      click(px, py, w, h) {
        X.push([view.xmin + px / w * (view.xmax - view.xmin), view.ymax - py / h * (view.ymax - view.ymin)]);
        Y.push(p.brush); P = X.length;
      },
      step() {
        const H = p.H;
        const gW1 = new Array(2 * H).fill(0), gb1 = new Array(H).fill(0), gW2 = new Array(H).fill(0);
        let gb2 = 0, L = 0, correct = 0;
        for (let n = 0; n < P; n++) {
          const { h, out } = forward(X[n]);
          const y = Y[n];
          L -= y * Math.log(out + 1e-9) + (1 - y) * Math.log(1 - out + 1e-9);
          if ((out > 0.5) === (y === 1)) correct++;
          const dz = (out - y) / P;
          gb2 += dz;
          for (let k = 0; k < H; k++) {
            gW2[k] += dz * h[k];
            const dh = dz * W2[k] * (1 - h[k] * h[k]);
            gb1[k] += dh; gW1[2 * k] += dh * X[n][0]; gW1[2 * k + 1] += dh * X[n][1];
          }
        }
        opt.t++;
        const flat = W1.flat();
        adam("W1", flat, gW1);
        for (let k = 0; k < H; k++) { W1[k][0] = flat[2 * k]; W1[k][1] = flat[2 * k + 1]; }
        adam("b1", b1, gb1); adam("W2", W2, gW2);
        const bb = [b2]; adam("b2", bb, [gb2]); b2 = bb[0];
        loss = L / P; acc = correct / P; epoch++;
      },
      draw(ctx, w, h, col) {
        const toS = (x, y) => [(x - view.xmin) / (view.xmax - view.xmin) * w, (1 - (y - view.ymin) / (view.ymax - view.ymin)) * h];
        const nx = 64, ny = 37;
        if (!field) { field = document.createElement("canvas"); field.width = nx; field.height = ny; }
        const fctx = field.getContext("2d"), img = fctx.createImageData(nx, ny);
        const ca = hexToRgb(col.a), cb = hexToRgb(col.b);
        for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
          const x = view.xmin + (i + 0.5) / nx * (view.xmax - view.xmin), y = view.ymax - (j + 0.5) / ny * (view.ymax - view.ymin);
          const o = forward([x, y]).out, c = o > 0.5 ? cb : ca, k = 4 * (j * nx + i);
          img.data[k] = c[0]; img.data[k + 1] = c[1]; img.data[k + 2] = c[2]; img.data[k + 3] = Math.abs(o - 0.5) * 2 * 110;
        }
        fctx.putImageData(img, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(field, 0, 0, w, h);
        for (let n = 0; n < P; n++) {
          const [sx, sy] = toS(X[n][0], X[n][1]);
          ctx.fillStyle = col.paper; dot(ctx, sx, sy, 4.2);
          ctx.fillStyle = Y[n] ? col.b : col.a; dot(ctx, sx, sy, 3);
        }
      },
      info() { return `epoch ${epoch}   loss ${loss.toFixed(3)}   accuracy ${(acc * 100).toFixed(0)}%`; }
    };
  }
};
