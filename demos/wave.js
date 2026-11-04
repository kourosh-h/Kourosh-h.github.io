// Double-slit with the 2D wave equation
DEMOS.wave = {
  title: "Waves through a double slit",
  text: "The 2D wave equation, solved on a grid. A plane wave hits a wall with two slits, and the two new wavefronts interfere. If you change the wavelength or the slit gap, the fringes move.",
  hint: "Click on the water to drop a pulse.",
  details: "160 &times; 93 grid, leapfrog finite differences, absorbing edges",
  make() {
    const W = 160, H = 93, wall = 40;
    const p = { lambda: 10, gap: 20 };
    let u, uo, mask, damp, t, off, img;
    function build() {
      mask = new Uint8Array(W * H); damp = new Float32Array(W * H);
      const c = H / 2, half = p.gap / 2;
      for (let j = 0; j < H; j++) {
        const open = Math.abs(j - (c - half)) < 2.5 || Math.abs(j - (c + half)) < 2.5;
        if (!open) { mask[j * W + wall] = 1; mask[j * W + wall + 1] = 1; }
      }
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
        const e = Math.min(i, W - 1 - i, j, H - 1 - j);
        damp[j * W + i] = e < 12 ? 1 - 0.04 * (1 - e / 12) ** 2 * 3 : 1;
      }
    }
    return {
      perFrame: 3,
      params: [
        { key: "lambda", label: "wavelength", min: 5, max: 20, step: 0.5, value: 10 },
        { key: "gap", label: "slit gap", min: 6, max: 50, step: 1, value: 20 }
      ],
      set(k, v) { p[k] = v; build(); },
      reset() { u = new Float32Array(W * H); uo = new Float32Array(W * H); build(); t = 0; },
      click(px, py, w, h) {
        const ci = Math.round(px / w * W), cj = Math.round(py / h * H);
        for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) {
          const a = ci + i, b = cj + j;
          if (a > 0 && a < W - 1 && b > 0 && b < H - 1) u[b * W + a] += 2 * Math.exp(-(i * i + j * j) / 4);
        }
      },
      step() {
        const c2 = 0.25, un = uo;
        for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) {
          const k = j * W + i;
          if (mask[k]) { un[k] = 0; continue; }
          const lap = u[k - 1] + u[k + 1] + u[k - W] + u[k + W] - 4 * u[k];
          un[k] = (2 * u[k] - uo[k] + c2 * lap) * damp[k];
        }
        uo = u; u = un;
        t += 1;
        const src = Math.sin(2 * Math.PI * t * 0.5 / p.lambda);
        for (let j = 1; j < H - 1; j++) u[j * W + 14] = src;
      },
      draw(ctx, w, h, col) {
        if (!off) { off = document.createElement("canvas"); off.width = W; off.height = H; img = off.getContext("2d").createImageData(W, H); }
        const c0 = hexToRgb(col.paper), cp = hexToRgb(col.a), cn = hexToRgb(col.b), cw = hexToRgb(col.ink);
        for (let k = 0; k < W * H; k++) {
          let c = c0, f = 0;
          if (mask[k]) { c = cw; f = 1; } else { f = Math.min(1, Math.abs(u[k])); c = u[k] > 0 ? cp : cn; }
          img.data[4 * k] = c0[0] + (c[0] - c0[0]) * f;
          img.data[4 * k + 1] = c0[1] + (c[1] - c0[1]) * f;
          img.data[4 * k + 2] = c0[2] + (c[2] - c0[2]) * f;
          img.data[4 * k + 3] = 255;
        }
        off.getContext("2d").putImageData(img, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(off, 0, 0, w, h);
      },
      info() { return `steps = ${t}`; }
    };
  }
};
