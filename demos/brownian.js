// Brownian motion and MSD
DEMOS.brownian = {
  title: "Diffusion and the MSD",
  text: "Particles released from one point do a random walk. In 2D, the mean squared displacement grows as 4Dt, so a straight-line fit gives D back.",
  details: "N = 400 walkers, dt = 0.01, fit of MSD = 4Dt through the origin",
  make() {
    const N = 400, dt = 0.01, LX = 24, LY = 14;
    const p = { D: 1 };
    let x, y, t, n, pts;
    return {
      perFrame: 1,
      params: [{ key: "D", label: "D", min: 0.2, max: 2, step: 0.1, value: 1 }],
      set(k, v) { p[k] = v; this.reset(); },
      reset() { x = new Float64Array(N); y = new Float64Array(N); t = 0; n = 0; pts = []; },
      step() {
        const s = Math.sqrt(2 * p.D * dt);
        let msd = 0;
        for (let i = 0; i < N; i++) { x[i] += s * gauss(); y[i] += s * gauss(); msd += x[i] * x[i] + y[i] * y[i]; }
        t += dt; n++;
        if (n % 5 === 0) pts.push([t, msd / N]);
        if (t > 8) this.reset();
      },
      fitD() {
        let a = 0, b = 0;
        for (const [tt, m] of pts) { a += tt * m; b += tt * tt; }
        return b ? a / (4 * b) : 0;
      },
      draw(ctx, w, h, col) {
        const s = w / LX;
        ctx.fillStyle = col.a;
        for (let i = 0; i < N; i++) dot(ctx, w / 2 + x[i] * s, h / 2 + y[i] * s, 2.2);
        // MSD inset
        const pw = Math.min(170, w * 0.36), ph = pw * 0.62, px = w - pw - 10, py = 10;
        ctx.fillStyle = col.paper; ctx.fillRect(px, py, pw, ph);
        ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.strokeRect(px + 0.5, py + 0.5, pw, ph);
        const tmax = 8, mmax = 4 * 2 * tmax * 1.1;
        const X = tt => px + 6 + (tt / tmax) * (pw - 12), Y = m => py + ph - 6 - (m / mmax) * (ph - 20);
        ctx.strokeStyle = col.muted; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(tmax), Y(4 * p.D * tmax)); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = col.b;
        for (const [tt, m] of pts) dot(ctx, X(tt), Y(m), 1.6);
        ctx.fillStyle = col.muted; ctx.font = "10px " + getComputedStyle(document.body).getPropertyValue("--mono");
        ctx.fillText("MSD vs t", px + 6, py + 12);
      },
      info() { return `t = ${t.toFixed(2)}   D fit = ${this.fitD().toFixed(2)}   D true = ${p.D.toFixed(2)}`; }
    };
  }
};
