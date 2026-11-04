// Site percolation
DEMOS.percolation = {
  title: "Percolation",
  text: "Each site of a square lattice is filled with probability p. The largest connected cluster is shown in orange, and it turns blue once it connects left to right. Near p<sub>c</sub> &asymp; 0.593, a cluster suddenly spans the whole box. The same idea explains conductivity in composites and gelation in polymers.",
  details: "120 &times; 70 lattice, 4-neighbor connectivity, union-find",
  make() {
    const W = 120, H = 70, n = W * H;
    const p = { p: 0.59 };
    let r, lab, big, spans, frac, off, img, dirty;
    function find(par, a) { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; }
    function compute() {
      const par = new Int32Array(n);
      for (let k = 0; k < n; k++) par[k] = k;
      const on = k => r[k] < p.p;
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
        const k = j * W + i;
        if (!on(k)) continue;
        if (i + 1 < W && on(k + 1)) par[find(par, k)] = find(par, k + 1);
        if (j + 1 < H && on(k + W)) par[find(par, k)] = find(par, k + W);
      }
      const size = new Int32Array(n);
      lab = new Int32Array(n).fill(-1);
      for (let k = 0; k < n; k++) if (on(k)) { lab[k] = find(par, k); size[lab[k]]++; }
      big = -1; let bs = 0;
      for (let k = 0; k < n; k++) if (size[k] > bs) { bs = size[k]; big = k; }
      let left = false, right = false;
      for (let j = 0; j < H; j++) { if (lab[j * W] === big) left = true; if (lab[j * W + W - 1] === big) right = true; }
      spans = left && right && big >= 0; frac = bs / n; dirty = true;
    }
    return {
      perFrame: 1,
      params: [{ key: "p", label: "fill probability p", min: 0.3, max: 0.9, step: 0.005, value: 0.59 }],
      set(k, v) { p[k] = v; compute(); },
      reset() { r = new Float32Array(n).map(() => rand()); compute(); },
      step() {},
      draw(ctx, w, h, col) {
        if (!off) { off = document.createElement("canvas"); off.width = W; off.height = H; img = off.getContext("2d").createImageData(W, H); dirty = true; }
        const cb = hexToRgb(col.paper), cr = hexToRgb(col.rule), ca = spans ? hexToRgb(col.a) : hexToRgb(col.b);
        for (let k = 0; k < n; k++) {
          const c = lab[k] < 0 ? cb : lab[k] === big ? ca : cr;
          img.data[4 * k] = c[0]; img.data[4 * k + 1] = c[1]; img.data[4 * k + 2] = c[2]; img.data[4 * k + 3] = 255;
        }
        off.getContext("2d").putImageData(img, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(off, 0, 0, w, h);
      },
      info() { return `largest cluster = ${(frac * 100).toFixed(1)}% of sites   ${spans ? "spans the box" : "does not span"}`; }
    };
  }
};
