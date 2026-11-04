// A small 2D DPD engine shared by several demos: soft repulsion, the DPD thermostat,
// harmonic bonds and cell lists, so a few hundred beads run smoothly in the browser.
// x is always periodic. y is periodic, or closed by walls at ylo and yhi that reflect beads.
// slab: [lo, hi] marks a solid band (made of frozen beads) that moving beads bounce off, from either side.

class DPD2D {
  constructor(o) {
    Object.assign(this, { LX: 16, LY: 10, periodicY: true, ylo: 0, yhi: 10, gamma: 4.5, kT: 1, dt: 0.04, kb: 80, r0: 1 }, o);
    this.sigma = Math.sqrt(2 * this.gamma * this.kT);
    this.t = 0;
  }

  // types: Uint8Array, frozen: Uint8Array (1 = never moves), bonds: flat array [i0, j0, i1, j1, ...]
  load(x, y, type, frozen, bonds) {
    const n = x.length;
    Object.assign(this, { n, x, y, type, frozen: frozen || new Uint8Array(n), bonds: bonds || [] });
    this.vx = new Float64Array(n); this.vy = new Float64Array(n);
    for (let i = 0; i < n; i++) if (!this.frozen[i]) { this.vx[i] = gauss() * Math.sqrt(this.kT); this.vy[i] = gauss() * Math.sqrt(this.kT); }
    this.fx = new Float64Array(n); this.fy = new Float64Array(n);
    this.ncx = Math.max(3, Math.floor(this.LX));
    this.ncy = Math.max(3, Math.floor(this.LY));
    this.head = new Int32Array(this.ncx * this.ncy); this.next = new Int32Array(n);
    this.forces();
  }

  cellOf(i) {
    let cx = Math.floor(this.x[i] / this.LX * this.ncx), cy = Math.floor(this.y[i] / this.LY * this.ncy);
    cx = Math.min(this.ncx - 1, Math.max(0, cx)); cy = Math.min(this.ncy - 1, Math.max(0, cy));
    return cy * this.ncx + cx;
  }

  forces() {
    const { n, ncx, ncy, head, next, fx, fy, x, y, vx, vy, type, frozen, aij, LX, LY, gamma } = this;
    const pY = this.periodicY, noise = this.sigma / Math.sqrt(this.dt) * 3.4641016;
    fx.fill(0); fy.fill(0);
    head.fill(-1);
    for (let i = 0; i < n; i++) { const c = this.cellOf(i); next[i] = head[c]; head[c] = i; }
    // each cell with itself and four of its neighbors, so every pair is visited once.
    // The random force uses uniform numbers with unit variance, as Groot and Warren did.
    for (let cy = 0; cy < ncy; cy++) for (let cx = 0; cx < ncx; cx++) {
      const c = cy * ncx + cx;
      for (let k = 0; k < 5; k++) {
        let qx = cx + (k === 1 || k === 4 ? 1 : k === 2 ? -1 : 0), qy = cy + (k >= 2 ? 1 : 0);
        if (qx < 0) qx += ncx; else if (qx >= ncx) qx -= ncx;
        if (qy >= ncy) { if (!pY) continue; qy -= ncy; }
        const q = qy * ncx + qx;
        for (let i = head[c]; i >= 0; i = next[i]) {
          const xi = x[i], yi = y[i], ai = aij[type[i]];
          for (let j = q === c ? next[i] : head[q]; j >= 0; j = next[j]) {
            let dx = xi - x[j], dy = yi - y[j];
            if (dx > 0.5 * LX) dx -= LX; else if (dx < -0.5 * LX) dx += LX;
            if (pY) { if (dy > 0.5 * LY) dy -= LY; else if (dy < -0.5 * LY) dy += LY; }
            const r2 = dx * dx + dy * dy;
            if (r2 >= 1 || r2 < 1e-12 || (frozen[i] && frozen[j])) continue;
            const r = Math.sqrt(r2), ex = dx / r, ey = dy / r, w = 1 - r;
            const dv = ex * (vx[i] - vx[j]) + ey * (vy[i] - vy[j]);
            const f = ai[type[j]] * w - gamma * w * w * dv + noise * w * (rand() - 0.5);
            fx[i] += f * ex; fy[i] += f * ey; fx[j] -= f * ex; fy[j] -= f * ey;
          }
        }
      }
    }
    const b = this.bonds;
    for (let k = 0; k < b.length; k += 2) {
      const i = b[k], j = b[k + 1];
      let dx = this.x[i] - this.x[j], dy = this.y[i] - this.y[j];
      dx -= this.LX * Math.round(dx / this.LX);
      if (this.periodicY) dy -= this.LY * Math.round(dy / this.LY);
      const r = Math.sqrt(dx * dx + dy * dy) || 1e-6, f = -this.kb * (r - this.r0) / r;
      fx[i] += f * dx; fy[i] += f * dy; fx[j] -= f * dx; fy[j] -= f * dy;
    }
    if (this.extra) this.extra(this);
  }

  step() {
    const { n, dt, x, y, vx, vy, fx, fy, frozen, LX, LY } = this;
    for (let i = 0; i < n; i++) {
      if (frozen[i]) continue;
      vx[i] += 0.5 * dt * fx[i]; vy[i] += 0.5 * dt * fy[i];
      x[i] += dt * vx[i]; y[i] += dt * vy[i];
      if (x[i] < 0) x[i] += LX; else if (x[i] >= LX) x[i] -= LX;
      if (this.periodicY) {
        if (y[i] < 0) y[i] += LY; else if (y[i] >= LY) y[i] -= LY;
        if (this.slab && y[i] < this.slab[1] && y[i] > this.slab[0]) {
          const [lo, hi] = this.slab;
          if (y[i] > 0.5 * (lo + hi)) { y[i] = 2 * hi - y[i]; vy[i] = Math.abs(vy[i]); }
          else { y[i] = 2 * lo - y[i]; vy[i] = -Math.abs(vy[i]); if (y[i] < 0) y[i] += LY; }
        }
      }
      else {
        if (y[i] < this.ylo) { y[i] = 2 * this.ylo - y[i]; vy[i] = Math.abs(vy[i]); }
        if (y[i] > this.yhi) { y[i] = 2 * this.yhi - y[i]; vy[i] = -Math.abs(vy[i]); }
      }
    }
    this.forces();
    for (let i = 0; i < n; i++) { if (frozen[i]) continue; vx[i] += 0.5 * dt * fx[i]; vy[i] += 0.5 * dt * fy[i]; }
    this.t += dt;
  }

  // draws bonds as thick ink lines (skipping ones that cross the box edge)
  drawBonds(ctx, X, Y, width, color) {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = "round"; ctx.beginPath();
    for (let k = 0; k < this.bonds.length; k += 2) {
      const i = this.bonds[k], j = this.bonds[k + 1];
      if (Math.abs(this.x[i] - this.x[j]) > this.LX / 2 || Math.abs(this.y[i] - this.y[j]) > this.LY / 2) continue;
      ctx.moveTo(X(this.x[i]), Y(this.y[i])); ctx.lineTo(X(this.x[j]), Y(this.y[j]));
    }
    ctx.stroke(); ctx.lineCap = "butt";
  }
}
