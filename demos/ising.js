// 2D Ising model
DEMOS.ising = {
  title: "Ising model",
  text: "Spins on a lattice, flipped with Metropolis Monte Carlo. Below T<sub>c</sub> &asymp; 2.269, large domains win, and above it, the lattice is disordered. Near T<sub>c</sub>, you see domains of every size.",
  hint: "Drag on the lattice to paint spins up and see whether the island survives.",
  details: "120 &times; 70 lattice, periodic, J = 1, 2 sweeps per frame",
  make() {
    const W = 120, H = 70, S = new Int8Array(W * H);
    const p = { T: 2.27 };
    let sweeps, img, off;
    return {
      perFrame: 2,
      params: [{ key: "T", label: "T", min: 1.5, max: 3.5, step: 0.01, value: 2.27 }],
      set(k, v) { p[k] = v; },
      drag(px, py, w, h, down) {
        if (!down) return;
        const ci = Math.round(px / w * W), cj = Math.round(py / h * H);
        for (let j = -4; j <= 4; j++) for (let i = -4; i <= 4; i++) if (i * i + j * j <= 16) S[((cj + j + H) % H) * W + (ci + i + W) % W] = 1;
      },
      reset() { for (let i = 0; i < W * H; i++) S[i] = rand() < 0.5 ? 1 : -1; sweeps = 0; },
      step() {
        const e4 = Math.exp(-4 / p.T), e8 = Math.exp(-8 / p.T);
        for (let n = 0; n < W * H; n++) {
          const i = (rand() * W) | 0, j = (rand() * H) | 0, k = j * W + i;
          const nb = S[j * W + (i + 1) % W] + S[j * W + (i + W - 1) % W] + S[((j + 1) % H) * W + i] + S[((j + H - 1) % H) * W + i];
          const dE = 2 * S[k] * nb;
          if (dE <= 0 || (dE === 4 && rand() < e4) || (dE === 8 && rand() < e8)) S[k] = -S[k];
        }
        sweeps++;
      },
      draw(ctx, w, h, col) {
        if (!off) { off = document.createElement("canvas"); off.width = W; off.height = H; img = off.getContext("2d").createImageData(W, H); }
        const up = hexToRgb(col.a), down = hexToRgb(col.paper);
        for (let k = 0; k < W * H; k++) {
          const c = S[k] > 0 ? up : down;
          img.data[4 * k] = c[0]; img.data[4 * k + 1] = c[1]; img.data[4 * k + 2] = c[2]; img.data[4 * k + 3] = 255;
        }
        off.getContext("2d").putImageData(img, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(off, 0, 0, w, h);
      },
      info() {
        let m = 0;
        for (let k = 0; k < W * H; k++) m += S[k];
        return `sweeps = ${sweeps}   |m| = ${Math.abs(m / (W * H)).toFixed(2)}`;
      }
    };
  }
};
