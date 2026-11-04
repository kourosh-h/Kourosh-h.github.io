// Gray-Scott reaction-diffusion
DEMOS.grayscott = {
  title: "Gray-Scott reaction-diffusion",
  text: "Two chemicals that react and diffuse at different rates. Small changes in the feed rate F and the kill rate k give spots, stripes, worms, or self-replicating blobs.",
  hint: "Drag on the dish to add chemical V and start new patterns.",
  details: "U + 2V &rarr; 3V, V &rarr; P, D<sub>U</sub> = 1, D<sub>V</sub> = 0.5, 160 &times; 93 grid",
  make() {
    const W = 160, H = 93;
    const p = { F: 0.035, k: 0.065 };
    let u, v, u2, v2, steps, off, img;
    return {
      perFrame: 16,
      params: [
        { key: "F", label: "feed F", min: 0.01, max: 0.08, step: 0.001, value: 0.035 },
        { key: "k", label: "kill k", min: 0.045, max: 0.07, step: 0.0005, value: 0.065 }
      ],
      set(key, val) { p[key] = val; },
      drag(px, py, w, h, down) {
        if (!down) return;
        const ci = Math.round(px / w * W), cj = Math.round(py / h * H);
        for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) {
          const a = (ci + i + W) % W, b = (cj + j + H) % H;
          u[b * W + a] = 0.5; v[b * W + a] = 0.25;
        }
      },
      reset() {
        u = new Float32Array(W * H).fill(1); v = new Float32Array(W * H);
        u2 = new Float32Array(W * H); v2 = new Float32Array(W * H);
        for (let s = 0; s < 12; s++) {
          const ci = (rand() * (W - 10)) | 0, cj = (rand() * (H - 10)) | 0;
          for (let j = cj; j < cj + 6; j++) for (let i = ci; i < ci + 6; i++) { u[j * W + i] = 0.5; v[j * W + i] = 0.25; }
        }
        steps = 0;
      },
      step() {
        for (let j = 0; j < H; j++) {
          const jm = ((j + H - 1) % H) * W, jp = ((j + 1) % H) * W, j0 = j * W;
          for (let i = 0; i < W; i++) {
            const im = (i + W - 1) % W, ip = (i + 1) % W, k = j0 + i;
            const lu = 0.2 * (u[j0 + im] + u[j0 + ip] + u[jm + i] + u[jp + i]) + 0.05 * (u[jm + im] + u[jm + ip] + u[jp + im] + u[jp + ip]) - u[k];
            const lv = 0.2 * (v[j0 + im] + v[j0 + ip] + v[jm + i] + v[jp + i]) + 0.05 * (v[jm + im] + v[jm + ip] + v[jp + im] + v[jp + ip]) - v[k];
            const uvv = u[k] * v[k] * v[k];
            u2[k] = u[k] + lu - uvv + p.F * (1 - u[k]);
            v2[k] = v[k] + 0.5 * lv + uvv - (p.F + p.k) * v[k];
          }
        }
        [u, u2] = [u2, u]; [v, v2] = [v2, v];
        steps++;
      },
      draw(ctx, w, h, col) {
        if (!off) { off = document.createElement("canvas"); off.width = W; off.height = H; img = off.getContext("2d").createImageData(W, H); }
        const c0 = hexToRgb(col.paper), c1 = hexToRgb(col.a);
        for (let k = 0; k < W * H; k++) {
          const f = Math.min(1, v[k] * 3);
          img.data[4 * k] = c0[0] + (c1[0] - c0[0]) * f;
          img.data[4 * k + 1] = c0[1] + (c1[1] - c0[1]) * f;
          img.data[4 * k + 2] = c0[2] + (c1[2] - c0[2]) * f;
          img.data[4 * k + 3] = 255;
        }
        off.getContext("2d").putImageData(img, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(off, 0, 0, w, h);
      },
      info() { return `steps = ${steps}`; }
    };
  }
};
