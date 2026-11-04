// Helpers shared by the learn pages: a tiny plotting function and a small Lennard-Jones engine.

// Draws axes in a box and returns functions that map data to pixels.
function plotBox(ctx, box, xr, yr, col, xlabel, ylabel) {
  const [bx, by, bw, bh] = box;
  const X = v => bx + (v - xr[0]) / (xr[1] - xr[0]) * bw;
  const Y = v => by + bh - (v - yr[0]) / (yr[1] - yr[0]) * bh;
  ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.stroke();
  ctx.fillStyle = col.muted; ctx.font = "10px monospace";
  if (xlabel) ctx.fillText(xlabel, bx + bw - ctx.measureText(xlabel).width, by + bh + 12);
  if (ylabel) ctx.fillText(ylabel, bx + 4, by + 10);
  const line = (pts, color, width = 2, dash) => {
    ctx.save(); ctx.beginPath(); ctx.rect(bx - 2, by - 2, bw + 4, bh + 4); ctx.clip();
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash || []);
    ctx.beginPath();
    let started = false;
    for (const [a, b] of pts) {
      if (!isFinite(b)) { started = false; continue; }
      const py = Math.max(by - 1e4, Math.min(by + bh + 1e4, Y(b)));
      started ? ctx.lineTo(X(a), py) : ctx.moveTo(X(a), py);
      started = true;
    }
    ctx.stroke(); ctx.setLineDash([]); ctx.restore();
  };
  const dots = (pts, color, r = 3) => { ctx.fillStyle = color; for (const [a, b] of pts) dot(ctx, X(a), Y(b), r); };
  const hline = (v, color) => { ctx.strokeStyle = color; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(bx, Y(v)); ctx.lineTo(bx + bw, Y(v)); ctx.stroke(); ctx.setLineDash([]); };
  return { X, Y, line, dots, hline };
}

// 2D Lennard-Jones particles, periodic in x, and in y unless walls are on.
class LJBox {
  constructor(o) {
    Object.assign(this, { N: 100, LX: 14, LY: 14 * 7 / 12, T: 1, dt: 0.005, rc: 2.5, walls: false, wallEps: 1, thermostat: "berendsen" }, o);
    this.init();
  }
  init() {
    const { N, LX, LY } = this;
    this.x = new Float64Array(N); this.y = new Float64Array(N);
    this.vx = new Float64Array(N); this.vy = new Float64Array(N);
    this.fx = new Float64Array(N); this.fy = new Float64Array(N);
    const cols = Math.ceil(Math.sqrt(N * LX / LY)), rows = Math.ceil(N / cols);
    for (let i = 0; i < N; i++) {
      this.x[i] = (i % cols + 0.5) * LX / cols;
      this.y[i] = (Math.floor(i / cols) + 0.5) * LY / rows;
      this.vx[i] = gauss() * Math.sqrt(this.T); this.vy[i] = gauss() * Math.sqrt(this.T);
    }
    this.t = 0;
    this.forces();
  }
  forces() {
    const { N, LX, LY, x, y, fx, fy } = this, rc2 = this.rc * this.rc;
    fx.fill(0); fy.fill(0);
    let pe = 0;
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      let dx = x[i] - x[j], dy = y[i] - y[j];
      dx -= LX * Math.round(dx / LX);
      if (!this.walls) dy -= LY * Math.round(dy / LY);
      const r2 = dx * dx + dy * dy;
      if (r2 >= rc2) continue;
      const inv2 = 1 / Math.max(r2, 0.6), inv6 = inv2 * inv2 * inv2;
      const f = 24 * inv2 * inv6 * (2 * inv6 - 1);
      pe += 4 * inv6 * (inv6 - 1);
      fx[i] += f * dx; fy[i] += f * dy; fx[j] -= f * dx; fy[j] -= f * dy;
    }
    if (this.walls) {
      // 9-3 walls at y = 0 and y = LY: U(z) = eps (2/15 z^-9 - z^-3)
      for (let i = 0; i < N; i++) {
        const fz = z => { z = Math.max(z, 0.6); return this.wallEps * (1.2 / z ** 10 - 3 / z ** 4); };
        fy[i] += fz(y[i]) - fz(LY - y[i]);
      }
    }
    this.pe = pe;
  }
  step() {
    const { N, LX, LY, x, y, vx, vy, fx, fy, dt } = this;
    for (let i = 0; i < N; i++) {
      vx[i] += 0.5 * dt * fx[i]; vy[i] += 0.5 * dt * fy[i];
      x[i] = (x[i] + dt * vx[i] + LX) % LX;
      y[i] += dt * vy[i];
      if (this.walls) y[i] = Math.min(LY - 0.3, Math.max(0.3, y[i])); else y[i] = (y[i] + LY) % LY;
    }
    this.forces();
    let ke = 0;
    for (let i = 0; i < N; i++) { vx[i] += 0.5 * dt * fx[i]; vy[i] += 0.5 * dt * fy[i]; ke += vx[i] * vx[i] + vy[i] * vy[i]; }
    this.ke = 0.5 * ke;
    const Tnow = ke / (2 * N);
    if (this.thermostat === "berendsen") {
      const lam = Math.sqrt(1 + (dt / 0.1) * (this.T / Math.max(Tnow, 1e-6) - 1));
      for (let i = 0; i < N; i++) { vx[i] *= lam; vy[i] *= lam; }
    } else if (this.thermostat === "langevin") {
      const g = 1, c1 = Math.exp(-g * dt), c2 = Math.sqrt((1 - c1 * c1) * this.T);
      for (let i = 0; i < N; i++) { vx[i] = c1 * vx[i] + c2 * gauss(); vy[i] = c1 * vy[i] + c2 * gauss(); }
    }
    this.Tnow = Tnow;
    this.t += dt;
  }
  draw(ctx, w, h, col, color, radius = 0.5) {
    const s = w / this.LX;
    ctx.fillStyle = color || col.a;
    for (let i = 0; i < this.N; i++) dot(ctx, this.x[i] * s, this.y[i] * s, s * radius);
  }
}
