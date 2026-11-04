// k-means
DEMOS.kmeans = {
  title: "k-means clustering",
  text: "Lloyd's algorithm, one step at a time. Each point is assigned to its nearest center, and then each center moves to the mean of its points. Try a k that does not match the data.",
  hint: "Click to add points and watch the centers react.",
  details: "300 points from 4 Gaussian blobs, random initial centers, inertia = sum of squared distances to the centers",
  make() {
    let P = 300;
    const LX = 12, LY = 7;
    const p = { k: 4, spread: 0.8 };
    let pts, lab, cen, iter, inertia, tick, moved;
    function makeData() {
      const centers = Array.from({ length: 4 }, () => [1.5 + rand() * (LX - 3), 1.2 + rand() * (LY - 2.4)]);
      pts = Array.from({ length: P }, (_, n) => {
        const c = centers[n % 4];
        return [c[0] + gauss() * p.spread, c[1] + gauss() * p.spread];
      });
    }
    function initCenters() {
      cen = Array.from({ length: p.k }, () => [...pts[(rand() * P) | 0]]);
      lab = new Int8Array(P).fill(-1); iter = 0; tick = 0; inertia = 0; moved = true;
    }
    return {
      perFrame: 1,
      params: [
        { key: "k", label: "k", min: 2, max: 8, step: 1, value: 4 },
        { key: "spread", label: "blob spread", min: 0.2, max: 1.6, step: 0.05, value: 0.8 }
      ],
      set(key, v) { p[key] = v; if (key === "spread") { P = 300; makeData(); } initCenters(); },
      reset() { P = 300; makeData(); initCenters(); },
      click(px, py, w, h) {
        for (let k = 0; k < 6; k++) pts.push([px / w * LX + 0.15 * gauss(), py / h * LY + 0.15 * gauss()]);
        P = pts.length; lab = Int8Array.from([...lab, -1, -1, -1, -1, -1, -1]); moved = true;
      },
      step() {
        if (++tick % 25 !== 0 || !moved) return;
        inertia = 0;
        for (let n = 0; n < P; n++) {
          let best = 0, bd = Infinity;
          for (let c = 0; c < cen.length; c++) {
            const d = (pts[n][0] - cen[c][0]) ** 2 + (pts[n][1] - cen[c][1]) ** 2;
            if (d < bd) { bd = d; best = c; }
          }
          lab[n] = best; inertia += bd;
        }
        moved = false;
        for (let c = 0; c < cen.length; c++) {
          let sx = 0, sy = 0, m = 0;
          for (let n = 0; n < P; n++) if (lab[n] === c) { sx += pts[n][0]; sy += pts[n][1]; m++; }
          if (m) {
            const nx = sx / m, ny = sy / m;
            if (Math.abs(nx - cen[c][0]) + Math.abs(ny - cen[c][1]) > 1e-6) moved = true;
            cen[c] = [nx, ny];
          }
        }
        iter++;
      },
      draw(ctx, w, h, col) {
        const s = w / LX;
        for (let n = 0; n < P; n++) {
          ctx.fillStyle = lab[n] < 0 ? col.muted : CLUSTER_COLORS[lab[n]];
          dot(ctx, pts[n][0] * s, pts[n][1] * s, 3);
        }
        ctx.lineWidth = 2.5;
        for (let c = 0; c < cen.length; c++) {
          const cx = cen[c][0] * s, cy = cen[c][1] * s;
          ctx.strokeStyle = col.ink;
          ctx.beginPath(); ctx.moveTo(cx - 7, cy - 7); ctx.lineTo(cx + 7, cy + 7); ctx.moveTo(cx + 7, cy - 7); ctx.lineTo(cx - 7, cy + 7); ctx.stroke();
        }
      },
      info() { return `iteration ${iter}   inertia ${inertia.toFixed(0)}${moved ? "" : "   converged"}`; }
    };
  }
};
