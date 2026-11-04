// Buckminsterfullerene, drag to rotate
DEMOS.c60 = {
  title: "C60, built from symmetry",
  text: "The 60 carbon atoms of buckminsterfullerene come from the even permutations of three coordinate patterns based on the golden ratio. The bonds connect every pair of atoms at the edge length.",
  hint: "Drag to rotate the molecule.",
  details: "coordinates (0, &plusmn;1, &plusmn;3&phi;), (&plusmn;1, &plusmn;(2+&phi;), &plusmn;2&phi;), (&plusmn;&phi;, &plusmn;2, &plusmn;(2&phi;+1)) and cyclic permutations, 90 bonds",
  make() {
    const phi = (1 + Math.sqrt(5)) / 2;
    const atoms = [];
    const patterns = [[0, 1, 3 * phi], [1, 2 + phi, 2 * phi], [phi, 2, 2 * phi + 1]];
    for (const pat of patterns) for (let sx = -1; sx <= 1; sx += 2) for (let sy = -1; sy <= 1; sy += 2) for (let sz = -1; sz <= 1; sz += 2) {
      const v = [pat[0] * sx, pat[1] * sy, pat[2] * sz];
      for (let r = 0; r < 3; r++) {
        const q = [v[r % 3], v[(r + 1) % 3], v[(r + 2) % 3]];
        if (!atoms.some(a => Math.hypot(a[0] - q[0], a[1] - q[1], a[2] - q[2]) < 1e-6)) atoms.push(q);
      }
    }
    const bonds = [];
    for (let i = 0; i < atoms.length; i++) for (let j = i + 1; j < atoms.length; j++) {
      const d = Math.hypot(atoms[i][0] - atoms[j][0], atoms[i][1] - atoms[j][1], atoms[i][2] - atoms[j][2]);
      if (Math.abs(d - 2) < 0.01) bonds.push([i, j]);
    }
    const p = { spin: 0.4 };
    let ax, ay, last = null, dragging = false;
    return {
      perFrame: 1,
      params: [{ key: "spin", label: "spin speed", min: 0, max: 2, step: 0.05, value: 0.4 }],
      set(k, v) { p[k] = v; },
      reset() { ax = 0.4; ay = 0; },
      drag(px, py, w, h, down) {
        if (!down) { last = null; dragging = false; return; }
        dragging = true;
        if (last) { ay += (px - last[0]) * 0.01; ax += (py - last[1]) * 0.01; }
        last = [px, py];
      },
      step() { if (!dragging) ay += 0.01 * p.spin; },
      draw(ctx, w, h, col) {
        const s = h * 0.085, ox = w / 2, oy = h / 2;
        const ca = Math.cos(ax), sa = Math.sin(ax), cb = Math.cos(ay), sb = Math.sin(ay);
        const pr = atoms.map(([x, y, z]) => {
          const x1 = cb * x + sb * z, z1 = -sb * x + cb * z;
          const y2 = ca * y - sa * z1, z2 = sa * y + ca * z1;
          return [ox + x1 * s, oy + y2 * s, z2];
        });
        ctx.strokeStyle = col.muted; ctx.lineWidth = 2;
        for (const [i, j] of bonds) {
          ctx.globalAlpha = 0.35 + 0.65 * ((pr[i][2] + pr[j][2]) / 2 + 5) / 10;
          ctx.beginPath(); ctx.moveTo(pr[i][0], pr[i][1]); ctx.lineTo(pr[j][0], pr[j][1]); ctx.stroke();
        }
        const order = pr.map((q, i) => i).sort((a, b) => pr[a][2] - pr[b][2]);
        for (const i of order) {
          const depth = (pr[i][2] + 5) / 10;
          ctx.globalAlpha = 0.4 + 0.6 * depth;
          ctx.fillStyle = col.a; dot(ctx, pr[i][0], pr[i][1], s * (0.22 + 0.12 * depth));
        }
        ctx.globalAlpha = 1;
      },
      info() { return `${atoms.length} atoms   ${bonds.length} bonds   drag to rotate`; }
    };
  }
};
