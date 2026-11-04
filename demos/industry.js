// Demos for the industry page: one small model per kind of question.
// They are toys that show the mechanism; each caption says what a real study would use.

// ---------------------------------------------------------------- plastics: filler flakes that stack or disperse
// Stiff flakes in a 2D DPD polymer melt. The flake-polymer repulsion stands for the surface treatment.
DEMOS["ind-flakes"] = {
  narrowAspect: "4 / 5",
  title: "Filler flakes in a plastic",
  text: "Eight graphene-like flakes in a polymer melt (gray chains). Without a surface treatment, the polymer does not wet the flakes, so they find each other and stack (orange), and most of their surface is lost. A treatment that makes the polymer like the flake surface keeps them apart (blue). The chart counts the separate stacks, and 8 means that every flake is on its own.",
  details: "2D DPD in a 16 &times; 10 box at &rho; = 3, with 8 flakes of 8 beads, kept straight by springs, and 69 chains of 6 beads. Like beads repel with a = 25, and the flake-polymer a goes from 40 (no treatment) to 20 (full treatment). Two flakes count as stacked when at least four of their bead pairs are closer than 0.75. Faint lines are your earlier runs",
  make() {
    const LX = 16, LY = 10, NF = 8, FL = 8, GAP = 0.5, KF = 200, NM = 6, dt = 0.04, TMAX = 200;
    const nflake = NF * FL, nchain = Math.round((3 * LX * LY - nflake) / NM);
    const p = { treat: 0 };
    let sim, group = new Int32Array(NF), nstack = NF, cur = [], runs = [], lastTreat = 0;
    const wrap = (d, L) => d - L * Math.round(d / L);
    // springs between flake beads 1 to 4 apart keep each flake straight
    const flakeSprings = s => {
      for (let f = 0; f < NF; f++) for (let k = 0; k < FL - 1; k++) for (let d = 1; d <= 4 && k + d < FL; d++) {
        const a = f * FL + k, b = a + d, dx = wrap(s.x[a] - s.x[b], LX), dy = wrap(s.y[a] - s.y[b], LY);
        const r = Math.sqrt(dx * dx + dy * dy) || 1e-6, ff = -KF * (r - d * GAP) / r;
        s.fx[a] += ff * dx; s.fy[a] += ff * dy; s.fx[b] -= ff * dx; s.fy[b] -= ff * dy;
      }
    };
    // flakes that share at least four close bead pairs belong to the same stack
    const findStacks = () => {
      const par = [...Array(NF).keys()], root = q => par[q] === q ? q : (par[q] = root(par[q]));
      for (let f = 0; f < NF; f++) for (let g = f + 1; g < NF; g++) {
        let c = 0;
        for (let a = f * FL; a < (f + 1) * FL; a++) for (let b = g * FL; b < (g + 1) * FL; b++) {
          const dx = wrap(sim.x[a] - sim.x[b], LX), dy = wrap(sim.y[a] - sim.y[b], LY);
          if (dx * dx + dy * dy < 0.5625) c++;
        }
        if (c >= 4) par[root(f)] = root(g);
      }
      const size = new Int32Array(NF);
      for (let f = 0; f < NF; f++) size[root(f)]++;
      nstack = 0;
      for (let f = 0; f < NF; f++) { if (size[f]) nstack++; group[f] = size[root(f)]; }
    };
    return {
      perFrame: 6,
      params: [{ key: "treat", label: "surface treatment %", min: 0, max: 100, step: 25, value: 0 }],
      set(k, v) { p[k] = v; this.reset(); },
      reset() {
        if (cur.length > 8) { runs.push({ tr: lastTreat, pts: cur }); if (runs.length > 4) runs.shift(); }
        lastTreat = p.treat;
        const x = [], y = [], type = [], bonds = [], cen = [];
        // flake centers at least 3 apart, so the run starts with every flake on its own
        for (let tries = 0; cen.length < NF && tries < 5000; tries++) {
          const c = [rand() * LX, rand() * LY];
          if (cen.every(d => wrap(c[0] - d[0], LX) ** 2 + wrap(c[1] - d[1], LY) ** 2 > 9)) cen.push(c);
        }
        while (cen.length < NF) cen.push([rand() * LX, rand() * LY]);
        for (const [cx, cy] of cen) {
          const th = rand() * Math.PI;
          for (let k = 0; k < FL; k++) {
            const u = (k - (FL - 1) / 2) * GAP;
            x.push((cx + u * Math.cos(th) + LX) % LX); y.push((cy + u * Math.sin(th) + LY) % LY); type.push(1);
          }
        }
        for (let c = 0, i = nflake; c < nchain; c++) {
          let cx = rand() * LX, cy = rand() * LY, ang = rand() * 6.283;
          for (let b = 0; b < NM; b++, i++) {
            ang += (rand() - 0.5) * 1.6;
            cx = (cx + 0.7 * Math.cos(ang) + LX) % LX; cy = (cy + 0.7 * Math.sin(ang) + LY) % LY;
            x.push(cx); y.push(cy); type.push(0);
            if (b) bonds.push(i - 1, i);
          }
        }
        const afp = 40 - 0.2 * p.treat;
        sim = new DPD2D({ LX, LY, aij: [[25, afp], [afp, 25]], dt, kb: 80, r0: 0.75, extra: flakeSprings });
        sim.load(Float64Array.from(x), Float64Array.from(y), Uint8Array.from(type), null, bonds);
        findStacks();
        cur = [[0, nstack]];
      },
      step() {
        sim.step();
        if (Math.round(sim.t / dt) % 25 === 0) { findStacks(); if (sim.t <= TMAX) cur.push([sim.t, nstack]); }
      },
      draw(ctx, w, h, col) {
        const narrow = w < 560;
        const s = narrow ? (w - 20) / LX : Math.min((w * 0.6 - 20) / LX, (h - 20) / LY);
        const ox = 10, oy = narrow ? 10 : (h - LY * s) / 2, X = v => ox + v * s, Y = v => oy + v * s;
        ctx.fillStyle = col.paper; ctx.fillRect(ox, oy, LX * s, LY * s);
        ctx.save(); ctx.beginPath(); ctx.rect(ox, oy, LX * s, LY * s); ctx.clip();
        // polymer chains, quiet but with their bonds visible
        ctx.globalAlpha = 0.6;
        sim.drawBonds(ctx, X, Y, Math.max(1.5, s * 0.1), col.muted);
        ctx.fillStyle = col.muted;
        for (let i = nflake; i < sim.n; i++) dot(ctx, X(sim.x[i]), Y(sim.y[i]), s * 0.2);
        ctx.globalAlpha = 1;
        // flakes: a thick bonded line of beads, orange when stacked with another flake
        for (let f = 0; f < NF; f++) {
          const c = group[f] > 1 ? col.b : col.a;
          ctx.strokeStyle = c; ctx.lineWidth = Math.max(3, s * 0.26); ctx.lineCap = "round";
          ctx.beginPath();
          for (let k = 0; k < FL; k++) {
            const i = f * FL + k;
            if (k && (Math.abs(sim.x[i] - sim.x[i - 1]) > LX / 2 || Math.abs(sim.y[i] - sim.y[i - 1]) > LY / 2)) ctx.moveTo(X(sim.x[i]), Y(sim.y[i]));
            else if (k) ctx.lineTo(X(sim.x[i]), Y(sim.y[i])); else ctx.moveTo(X(sim.x[i]), Y(sim.y[i]));
          }
          ctx.stroke(); ctx.lineCap = "butt";
          ctx.fillStyle = c;
          for (let k = 0; k < FL; k++) dot(ctx, X(sim.x[f * FL + k]), Y(sim.y[f * FL + k]), s * 0.22);
        }
        ctx.restore();
        // chart of separate stacks against time
        const box = narrow ? [44, oy + LY * s + 34, w - 58, h - (oy + LY * s + 34) - 34] : [ox + LX * s + 50, 24, w - (ox + LX * s + 50) - 12, h - 62];
        const P = plotBox(ctx, box, [0, TMAX], [0, NF + 0.5], col, "", "");
        yTicks(ctx, P, box[0], [0, 2, 4, 6, 8], col);
        xTicks(ctx, P, box[1] + box[3], [0, 100, 200], col);
        ctx.fillStyle = col.muted; ctx.font = "10px monospace"; ctx.textAlign = "right";
        ctx.fillText("time (DPD units)", box[0] + box[2], box[1] + box[3] + 26);
        ctx.textAlign = "left"; ctx.fillText("separate stacks", box[0] + 4, box[1] - 6);
        for (const r of runs) {
          ctx.globalAlpha = 0.45; P.line(r.pts, col.muted, 1.5); ctx.globalAlpha = 1;
          const [lt, lv] = r.pts[r.pts.length - 1];
          ctx.fillStyle = col.muted; ctx.fillText(`${r.tr}%`, Math.min(P.X(lt) + 4, box[0] + box[2] - 26), P.Y(lv) - 4);
        }
        P.line(cur, col.ink, 2);
      },
      info() { return `t = ${sim.t.toFixed(0)}   ${nstack} separate stacks of ${NF} flakes`; }
    };
  }
};

// ---------------------------------------------------------------- pharma: passive permeation through a membrane
// Brownian particles in a 1D free energy profile across a bilayer, drawn in 2D.
// The left side is kept at a fixed dose and the right wall takes molecules away, like blood flow.
DEMOS["ind-perm"] = {
  narrowAspect: "4 / 5",
  title: "A drug crossing a membrane",
  text: "Drug molecules (orange) are kept at a fixed dose on the left and diffuse into a lipid bilayer. The ones that reach the right wall are removed, as blood flow would do, and counted. The curve under the box is the free energy of one molecule across the membrane. A polar molecule meets a high barrier in the oily core and rarely gets through. A greasier one drops into the core and crosses faster. However, a very greasy one is held in the membrane, and the count falls again. This is why drug designers aim for a middle log P.",
  details: "A toy model in nm and kT, with the barriers scaled down so that you can watch. Brownian dynamics with D = 1, a core term of &minus;1.5 (log P &minus; 0.5) kT, a head group barrier of 1.2 kT, and 30 molecules kept on the left. P in the corner is the steady-state solubility-diffusion result, 1/P = &int; exp(G/kT) / D dz across the membrane. The same route is used with free energy profiles from umbrella sampling. A greasy molecule takes a long time to fill the membrane before the steady flow sets in. Faint lines are your earlier runs",
  make() {
    const NMAX = 240, ND = 30, XL = 6, H = 4.2, ZM = 2.8, dt = 0.005, TMAX = 200, M = 1201;
    const p = { logp: 1 };
    const x = new Float64Array(NMAX), y = new Float64Array(NMAX), on = new Uint8Array(NMAX), force = new Float64Array(M);
    let t, taken, cur = [], runs = [], lastLogp = 1, ymax = 40;
    const G = z => -1.5 * (p.logp - 0.5) * Math.exp(-((z / 1.1) ** 2)) + 1.2 * Math.exp(-(((Math.abs(z) - 2) / 0.45) ** 2));
    const perm = () => {
      let s = 0;
      for (let k = 0; k <= 600; k++) { const z = -ZM + 2 * ZM * k / 600; s += Math.exp(G(z)) * 2 * ZM / 600; }
      return 1 / s;
    };
    const count = (lo, hi) => { let c = 0; for (let i = 0; i < NMAX; i++) if (on[i] && x[i] >= lo && x[i] < hi) c++; return c; };
    // top up the left side to ND molecules, at random places in it
    const dose = () => {
      for (let need = ND - count(-XL, -ZM), i = 0; need > 0 && i < NMAX; i++) {
        if (on[i]) continue;
        on[i] = 1; x[i] = -XL + rand() * (XL - ZM); y[i] = rand() * H; need--;
      }
    };
    return {
      perFrame: 40,
      params: [{ key: "logp", label: "log P", min: -2, max: 3, step: 0.5, value: 1 }],
      set(k, v) { p[k] = v; this.reset(); },
      reset() {
        if (cur.length > 8) { runs.push({ lp: lastLogp, pts: cur }); if (runs.length > 4) runs.shift(); }
        lastLogp = p.logp;
        for (let k = 0; k < M; k++) { const z = -XL + 2 * XL * k / (M - 1); force[k] = -(G(z + 1e-3) - G(z - 1e-3)) / 2e-3; }
        on.fill(0); dose();
        t = 0; taken = 0; cur = [[0, 0]];
      },
      step() {
        const s2 = Math.sqrt(2 * dt);
        for (let i = 0; i < NMAX; i++) {
          if (!on[i]) continue;
          const k = Math.round((x[i] + XL) / (2 * XL) * (M - 1));
          x[i] += force[Math.max(0, Math.min(M - 1, k))] * dt + s2 * gauss();
          y[i] = (y[i] + s2 * gauss() + H) % H;
          if (x[i] < -XL) x[i] = -2 * XL - x[i];
          else if (x[i] >= XL) { on[i] = 0; taken++; }
        }
        dose();
        t += dt;
        if (t <= TMAX && Math.round(t / dt) % 200 === 0) cur.push([t, taken]);
      },
      draw(ctx, w, h, col) {
        const narrow = w < 560, bw = narrow ? w - 20 : w * 0.6 - 20, s = bw / (2 * XL);
        const bh = H * s, ox = 10, oy = 18, X = v => ox + (v + XL) * s, Y = v => oy + v * s;
        ctx.fillStyle = col.paper; ctx.fillRect(ox, oy, bw, bh);
        ctx.strokeStyle = col.rule; ctx.strokeRect(ox + 0.5, oy + 0.5, bw, bh);
        // the right wall takes molecules away
        ctx.fillStyle = col.b; ctx.globalAlpha = 0.25; ctx.fillRect(ox + bw - 4, oy, 4, bh); ctx.globalAlpha = 1;
        ctx.fillStyle = col.muted; ctx.font = "10px monospace";
        ctx.fillText("fixed dose", ox + 4, oy - 6); ctx.textAlign = "right"; ctx.fillText("removed", ox + bw - 4, oy - 6); ctx.textAlign = "left";
        // lipids: a head bead and a tail of touching beads on each side, each bead as wide as a bond
        const nl = Math.round(H / 0.5), d = 0.34;
        for (let k = 0; k < nl; k++) {
          const yy = Y((k + 0.5) * H / nl);
          for (const sgn of [-1, 1]) {
            ctx.fillStyle = col.muted; ctx.globalAlpha = 0.5;
            for (let b = 1; b <= 5; b++) dot(ctx, X(sgn * (2 - b * d)), yy, s * d / 2);
            ctx.globalAlpha = 1; ctx.fillStyle = col.a;
            dot(ctx, X(sgn * 2), yy, s * d / 2);
          }
        }
        ctx.fillStyle = col.b;
        for (let i = 0; i < NMAX; i++) if (on[i]) dot(ctx, X(x[i]), Y(y[i]), Math.max(2.5, s * 0.12));
        // free energy profile under the box, on the same x axis
        const py = oy + bh + 14, ph = narrow ? 70 : Math.max(70, h - py - 34);
        const Pg = plotBox(ctx, [ox, py, bw, ph], [-XL, XL], [-4.5, 4.5], col, "", "");
        Pg.hline(0, col.rule);
        const pts = [];
        for (let k = 0; k <= 240; k++) { const z = -XL + 2 * XL * k / 240; pts.push([z, G(z)]); }
        Pg.line(pts, col.b, 2);
        ctx.fillStyle = col.muted; ctx.font = "10px monospace"; ctx.fillText("G(z), kT", ox + 4, py + 10);
        ctx.textAlign = "right"; ctx.fillText(`P = ${perm().toFixed(3)}`, ox + bw - 4, py + 10); ctx.textAlign = "left";
        // chart: molecules removed against time
        for (const r of runs) ymax = Math.max(ymax, r.pts[r.pts.length - 1][1]);
        ymax = Math.max(ymax, taken);
        const top = Math.ceil(ymax / 20) * 20;
        const box = narrow ? [44, py + ph + 36, w - 58, h - (py + ph + 36) - 30] : [ox + bw + 48, 24, w - (ox + bw + 48) - 12, h - 60];
        const P = plotBox(ctx, box, [0, TMAX], [0, top], col, "", "");
        yTicks(ctx, P, box[0], [0, top / 2, top], col);
        xTicks(ctx, P, box[1] + box[3], [0, 100, 200], col);
        ctx.fillStyle = col.muted; ctx.textAlign = "right"; ctx.fillText("time", box[0] + box[2], box[1] + box[3] + 26);
        ctx.textAlign = "left"; ctx.fillText("removed", box[0] + 4, box[1] - 6);
        for (const r of runs) {
          ctx.globalAlpha = 0.45; P.line(r.pts, col.muted, 1.5); ctx.globalAlpha = 1;
          const [lt, lv] = r.pts[r.pts.length - 1];
          ctx.fillStyle = col.muted; ctx.fillText(`${r.lp}`, Math.min(P.X(lt) + 4, box[0] + box[2] - 20), P.Y(lv) + 3);
        }
        P.line(cur, col.ink, 2);
      },
      info() { return `t = ${t.toFixed(0)}   in the membrane ${count(-ZM, ZM)}   removed ${taken}`; }
    };
  }
};

// ---------------------------------------------------------------- semiconductors: directed self-assembly
// Ohta-Kawasaki model of a lamellar block copolymer, seen from above, with chemical guide stripes.
// in-place radix-2 FFT of re, im (length a power of 2); inv = true for the inverse (unscaled)
function fft1(re, im, inv) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (inv ? 2 : -2) * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang), half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < half; k++) {
        const a = i + k, b = a + half;
        const br = re[b] * cr - im[b] * ci, bi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - br; im[b] = im[a] - bi; re[a] += br; im[a] += bi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}
// 2D FFT of row-major arrays with nx columns and ny rows; the inverse is scaled by 1/(nx ny)
function fft2(re, im, nx, ny, inv) {
  const rr = new Float64Array(nx), ri = new Float64Array(nx), cr = new Float64Array(ny), ci = new Float64Array(ny);
  for (let y = 0; y < ny; y++) {
    for (let x = 0; x < nx; x++) { rr[x] = re[y * nx + x]; ri[x] = im[y * nx + x]; }
    fft1(rr, ri, inv);
    for (let x = 0; x < nx; x++) { re[y * nx + x] = rr[x]; im[y * nx + x] = ri[x]; }
  }
  for (let x = 0; x < nx; x++) {
    for (let y = 0; y < ny; y++) { cr[y] = re[y * nx + x]; ci[y] = im[y * nx + x]; }
    fft1(cr, ci, inv);
    for (let y = 0; y < ny; y++) { re[y * nx + x] = cr[y]; im[y * nx + x] = ci[y]; }
  }
  if (inv) { const s = 1 / (nx * ny); for (let i = 0; i < nx * ny; i++) { re[i] *= s; im[i] *= s; } }
}

DEMOS["ind-dsa"] = {
  title: "Block copolymer lines for chips",
  text: "A thin film of a lamella-forming block copolymer, seen from above. On a plain surface, the lamellae form a fingerprint pattern. Chemical guide stripes on the wafer (ticks at the edges) pull them straight. The guide can be sparser than the lines, and this is how the method makes lines finer than the lithography that drew the guide. However, the guide pitch has to be a whole number of natural periods. For example, 9 stripes give straight lines, while 7 or 5 leave defects.",
  details: "Ohta-Kawasaki model on a 128 &times; 64 grid with semi-implicit spectral steps, &part;&psi;/&part;t = &nabla;&sup2;(&psi;&sup3; &minus; &psi; &minus; 0.3&nabla;&sup2;&psi; &minus; h) &minus; 0.1&psi;. The natural period is 7.1 cells, taken as 28 nm (a PS-b-PMMA-like period). The guide stripes are a field h = 0.2 that favors the blue block. Aligned is the share of the pattern's power in lines along the guide",
  make() {
    const NX = 128, NY = 64, n = NX * NY, dt = 0.5, S = 2, XI2 = 0.3, B = 0.1, HG = 0.2, L0 = 128 / 18;
    const p = { stripes: 9 };
    const psi = new Float64Array(n), re = new Float64Array(n), im = new Float64Array(n), pr = new Float64Array(n), pi = new Float64Array(n);
    const k2 = new Float64Array(n), hf = new Float64Array(n);
    for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) {
      k2[y * NX + x] = 4 - 2 * Math.cos(2 * Math.PI * x / NX) - 2 * Math.cos(2 * Math.PI * y / NY);
    }
    let steps = 0, aligned = 0, img = null, off = null;
    return {
      perFrame: 4,
      params: [{ key: "stripes", label: "guide stripes", min: 0, max: 18, step: 1, value: 9 }],
      set(k, v) { p[k] = v; this.reset(); },
      reset() {
        for (let i = 0; i < n; i++) psi[i] = 0.1 * (rand() - 0.5);
        hf.fill(0);
        if (p.stripes) {
          const L = NX / p.stripes;
          for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) {
            let d = x % L; d = Math.min(d, L - d);
            hf[y * NX + x] = HG * Math.exp(-((d / 1.6) ** 2));
          }
        }
        steps = 0; aligned = 0;
      },
      step() {
        for (let i = 0; i < n; i++) { const v = psi[i]; re[i] = v * v * v - v - hf[i] - S * v; im[i] = 0; pr[i] = v; pi[i] = 0; }
        fft2(re, im, NX, NY, false);
        fft2(pr, pi, NX, NY, false);
        let tot = 0, al = 0;
        for (let i = 0; i < n; i++) {
          const den = 1 + dt * (S * k2[i] + XI2 * k2[i] * k2[i] + B);
          pr[i] = (pr[i] - dt * k2[i] * re[i]) / den; pi[i] = (pi[i] - dt * k2[i] * im[i]) / den;
          if (i) { const P = pr[i] * pr[i] + pi[i] * pi[i]; tot += P; if (i < NX) al += P; }
        }
        aligned = al / tot;
        fft2(pr, pi, NX, NY, true);
        psi.set(pr);
        steps++;
      },
      draw(ctx, w, h, col) {
        if (!off) { off = document.createElement("canvas"); off.width = NX; off.height = NY; img = off.getContext("2d").createImageData(NX, NY); }
        const ca = hexToRgb(col.a), cb = hexToRgb(col.b);
        for (let i = 0; i < n; i++) {
          const u = 0.5 + 0.5 * Math.tanh(2.5 * psi[i]);
          img.data[4 * i] = cb[0] + (ca[0] - cb[0]) * u; img.data[4 * i + 1] = cb[1] + (ca[1] - cb[1]) * u;
          img.data[4 * i + 2] = cb[2] + (ca[2] - cb[2]) * u; img.data[4 * i + 3] = 255;
        }
        off.getContext("2d").putImageData(img, 0, 0);
        const bw = w - 20, bh = Math.min(bw / 2, h - 44), ox = 10, oy = 18;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(off, ox, oy, bw, bh);
        // guide stripes as ticks above and below the film
        if (p.stripes) {
          ctx.fillStyle = col.ink;
          for (let k = 0; k < p.stripes; k++) {
            const gx = ox + k * bw / p.stripes;
            ctx.fillRect(gx - 1.5, oy - 9, 3, 7); ctx.fillRect(gx - 1.5, oy + bh + 2, 3, 7);
          }
        }
        ctx.fillStyle = col.muted; ctx.font = "10px monospace";
        const nm = (NX / p.stripes) * 28 / L0;
        ctx.fillText(p.stripes ? `guide pitch ${nm.toFixed(0)} nm = ${(NX / p.stripes / L0).toFixed(2)} natural periods` : "no guide", ox, oy + bh + 24);
        ctx.textAlign = "right"; ctx.fillText(`${Math.round(NX * 28 / L0)} nm wide`, ox + bw, oy + bh + 24); ctx.textAlign = "left";
      },
      info() { return `aligned ${(100 * aligned).toFixed(0)}%   step ${steps}`; }
    };
  }
};

// ---------------------------------------------------------------- carbon capture: adsorption in a porous framework
// Lattice grand canonical Monte Carlo for a CO2/N2 mixture, cycled between 1 bar and 0.1 bar
// the way a pressure swing adsorption unit loads and regenerates its sorbent.
DEMOS["ind-gcmc"] = {
  narrowAspect: "3 / 4",
  title: "Capturing CO2 with a porous sorbent",
  text: "A porous framework in contact with flue gas, which is mostly N<sub>2</sub> (blue) with some CO<sub>2</sub> (orange). Molecules are added and removed as in grand canonical Monte Carlo. The pressure swings between 1 bar, where the sorbent loads up, and 0.1 bar, where it should let the CO<sub>2</sub> go again. Strong sites at the pore corners (small diamonds) make the sorbent pick CO<sub>2</sub> over N<sub>2</sub>. However, if the sites are too strong, the CO<sub>2</sub> stays in the pores at 0.1 bar, and the working capacity drops. The best sorbent sits in between.",
  details: "Lattice GCMC at room temperature, with energies in kT. For CO<sub>2</sub>, the site energy is the slider value at pore corners, &minus;2.5 next to a wall, and 0 in the open pore. For N<sub>2</sub>, it is 0.3 times the corner value, &minus;1, and 0. Neighboring molecules attract with &minus;0.5, and the activity is the partial pressure divided by 40 bar. The curves average 160 sweeps at each pressure and are recomputed when you move a slider. Selectivity is (CO<sub>2</sub>/N<sub>2</sub> adsorbed) / (CO<sub>2</sub>/N<sub>2</sub> in the gas) at 1 bar. Working capacity is the CO<sub>2</sub> at 1 bar minus the CO<sub>2</sub> at 0.1 bar, which is the amount one cycle can capture",
  make() {
    const PX = 3, PY = 2, CW = 7, CH = 8, NX = PX * CW, NY = PY * CH, NPORE = PX * PY, PSAT = 40, J = 0.5;
    const HI = 1, LO = 0.1, PHASE = 45, PRESS = [0.02, 0.05, 0.1, 0.2, 0.3, 0.45, 0.6, 0.8, 1, 1.2];
    const p = { eps: 6, y: 15 };
    // framework walls on a CW x CH grid; pore sites are 2 = corner (strong), 1 = next to a wall, 0 = open
    const frame = new Uint8Array(NX * NY), site = new Uint8Array(NX * NY), occ = new Uint8Array(NX * NY), ang = new Float64Array(NX * NY);
    for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) if (x % CW === 0 || y % CH === 0) frame[y * NX + x] = 1;
    const nb = i => { const x = i % NX, y = (i - x) / NX; return [y * NX + (x + 1) % NX, y * NX + (x + NX - 1) % NX, ((y + 1) % NY) * NX + x, ((y + NY - 1) % NY) * NX + x]; };
    const pores = [];
    for (let i = 0; i < NX * NY; i++) {
      if (frame[i]) continue;
      pores.push(i);
      let walls = 0;
      for (const j of nb(i)) walls += frame[j];
      site[i] = walls >= 2 ? 2 : walls;
    }
    const energy = (gas, i) => gas === 1 ? [0, -2.5, -p.eps][site[i]] : [0, -1, -0.3 * p.eps][site[i]];
    // one Monte Carlo sweep: occ is 0 empty, 1 CO2, 2 N2; z1 and z2 are the activities of the two gases
    const sweep = (o, P) => {
      const z1 = P * p.y / 100 / PSAT, z2 = P * (1 - p.y / 100) / PSAT;
      for (let k = 0; k < pores.length; k++) {
        const i = pores[Math.floor(rand() * pores.length)];
        let nn = 0;
        for (const j of nb(i)) if (o[j]) nn++;
        if (!o[i]) {
          const gas = rand() < z1 / (z1 + z2) ? 1 : 2;
          if (rand() < (z1 + z2) * Math.exp(-(energy(gas, i) - J * nn))) { o[i] = gas; ang[i] = rand() * Math.PI; }
        } else if (rand() < Math.exp(energy(o[i], i) - J * nn) / (z1 + z2)) o[i] = 0;
      }
    };
    const count = o => { let a = 0, b = 0; for (const i of pores) { if (o[i] === 1) a++; else if (o[i] === 2) b++; } return [a, b]; };
    let iso = [], sel = 0, wc = 0, at01 = 0, at1 = 0, tick = 0, sweeps = 0, live = 0;
    // uptake per pore against pressure for the current gas and sites
    const isotherm = () => {
      iso = [];
      for (const P of PRESS) {
        const o = new Uint8Array(NX * NY);
        let a = 0, b = 0;
        for (let s = 0; s < 260; s++) { sweep(o, P); if (s >= 100) { const [ca, cb] = count(o); a += ca; b += cb; } }
        iso.push([P, a / 160 / NPORE, b / 160 / NPORE]);
      }
      const r01 = iso[PRESS.indexOf(LO)], r1 = iso[PRESS.indexOf(HI)], yy = p.y / 100;
      at01 = r01[1]; at1 = r1[1]; wc = at1 - at01;
      sel = r1[2] > 0.01 ? (r1[1] / r1[2]) / (yy / (1 - yy)) : Infinity;
    };
    return {
      perFrame: 1,
      params: [
        { key: "eps", label: "strong sites, kT", min: 2, max: 10, step: 0.5, value: 6 },
        { key: "y", label: "CO2 share %", min: 5, max: 50, step: 5, value: 15 }
      ],
      set(k, v) { p[k] = v; isotherm(); },
      reset() { occ.fill(0); isotherm(); tick = 0; sweeps = 0; live = 0; },
      step() {
        if (++tick % 2) return;
        sweep(occ, Math.floor(sweeps / PHASE) % 2 ? LO : HI);
        sweeps++;
        live = count(occ)[0] / NPORE;
      },
      draw(ctx, w, h, col) {
        const narrow = w < 560, loading = Math.floor(sweeps / PHASE) % 2 === 0;
        const s = narrow ? (w - 20) / (NX + 1) : Math.min((w * 0.56 - 20) / (NX + 1), (h - 40) / (NY + 1));
        const ox = 10, oy = narrow ? 22 : Math.max(22, (h - (NY + 1) * s) / 2), C = v => v * s + s / 2;
        ctx.fillStyle = col.paper; ctx.fillRect(ox, oy, (NX + 1) * s, (NY + 1) * s);
        // framework: walls as bars, nodes where they cross
        ctx.fillStyle = col.muted; ctx.globalAlpha = 0.45;
        for (let x = 0; x <= NX; x += CW) ctx.fillRect(ox + C(x) - 0.22 * s, oy, 0.44 * s, (NY + 1) * s);
        for (let y = 0; y <= NY; y += CH) ctx.fillRect(ox, oy + C(y) - 0.22 * s, (NX + 1) * s, 0.44 * s);
        ctx.globalAlpha = 1;
        for (let x = 0; x <= NX; x += CW) for (let y = 0; y <= NY; y += CH) ctx.fillRect(ox + C(x) - 0.38 * s, oy + C(y) - 0.38 * s, 0.76 * s, 0.76 * s);
        // strong sites, then the molecules: CO2 as three beads on a line, N2 as two
        for (const i of pores) {
          const x = i % NX, y = (i - x) / NX, cx = ox + C(x), cy = oy + C(y);
          if (site[i] === 2 && !occ[i]) {
            ctx.strokeStyle = col.muted; ctx.lineWidth = 1; ctx.beginPath();
            ctx.moveTo(cx, cy - 0.2 * s); ctx.lineTo(cx + 0.2 * s, cy); ctx.lineTo(cx, cy + 0.2 * s); ctx.lineTo(cx - 0.2 * s, cy); ctx.closePath(); ctx.stroke();
          }
          if (!occ[i]) continue;
          const c = occ[i] === 1 ? col.b : col.a, half = occ[i] === 1 ? 0.34 * s : 0.2 * s;
          const ux = Math.cos(ang[i]) * half, uy = Math.sin(ang[i]) * half;
          ctx.strokeStyle = c; ctx.lineWidth = Math.max(1.5, 0.09 * s);
          ctx.beginPath(); ctx.moveTo(cx - ux, cy - uy); ctx.lineTo(cx + ux, cy + uy); ctx.stroke();
          ctx.fillStyle = c;
          if (occ[i] === 1) { dot(ctx, cx, cy, 0.14 * s); dot(ctx, cx - ux, cy - uy, 0.11 * s); dot(ctx, cx + ux, cy + uy, 0.11 * s); }
          else { dot(ctx, cx - ux, cy - uy, 0.13 * s); dot(ctx, cx + ux, cy + uy, 0.13 * s); }
        }
        ctx.fillStyle = col.muted; ctx.font = "10px monospace";
        ctx.fillText(loading ? `loading at ${HI} bar` : `releasing at ${LO} bar`, ox, oy - 7);
        ctx.textAlign = "right"; ctx.fillText(`${p.y}% CO2 in the gas`, ox + (NX + 1) * s, oy - 7); ctx.textAlign = "left";
        // isotherms with the working capacity between 0.1 and 1 bar
        const top = narrow ? oy + (NY + 1) * s + 34 : 30;
        const box = narrow ? [44, top, w - 58, h - top - 34] : [ox + (NX + 1) * s + 48, top, w - (ox + (NX + 1) * s + 48) - 12, h - 68];
        const big = Math.max(...iso.map(r => Math.max(r[1], r[2])), live);
        const stepY = big > 12 ? 5 : big > 5 ? 2 : 1, ymax = Math.ceil(big * 1.08 / stepY) * stepY;
        const P = plotBox(ctx, box, [0, 1.25], [0, ymax], col, "", "");
        const ticks = []; for (let v = 0; v <= ymax; v += stepY * (ymax / stepY > 5 ? 2 : 1)) ticks.push(v);
        yTicks(ctx, P, box[0], ticks, col);
        xTicks(ctx, P, box[1] + box[3], [0, 0.5, 1], col);
        ctx.fillStyle = col.muted; ctx.font = "10px monospace"; ctx.textAlign = "right";
        ctx.fillText("pressure, bar", box[0] + box[2], box[1] + box[3] + 26); ctx.textAlign = "left";
        ctx.fillText("molecules per pore", box[0] + 4, box[1] - 8);
        ctx.fillStyle = col.b; ctx.globalAlpha = 0.22;
        ctx.fillRect(P.X(HI) - 5, P.Y(at1), 10, P.Y(at01) - P.Y(at1)); ctx.globalAlpha = 1;
        ctx.strokeStyle = col.b; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(P.X(LO), P.Y(at01)); ctx.lineTo(P.X(HI) + 5, P.Y(at01)); ctx.stroke(); ctx.setLineDash([]);
        P.line(iso.map(r => [r[0], r[2]]), col.a, 2);
        P.line(iso.map(r => [r[0], r[1]]), col.b, 2);
        P.dots([[LO, at01], [HI, at1]], col.b, 3.5);
        const ly = (P.Y(at1) + P.Y(at01)) / 2;
        ctx.fillStyle = col.paper; ctx.globalAlpha = 0.85; ctx.fillRect(P.X(HI) - 66, ly - 12, 58, 26); ctx.globalAlpha = 1;
        ctx.fillStyle = col.muted; ctx.textAlign = "right";
        ctx.fillText("working", P.X(HI) - 9, ly - 2); ctx.fillText("capacity", P.X(HI) - 9, ly + 10); ctx.textAlign = "left";
        // the live sorbent, moving between the two pressures
        ctx.strokeStyle = col.ink; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(P.X(loading ? HI : LO), P.Y(live), 5, 0, 2 * Math.PI); ctx.stroke();
        beadLegend(ctx, box[0] + 10, box[1] + 12, box[0] + box[2], [[col.b, "CO2"], [col.a, "N2"], [col.ink, "now"]], col);
      },
      info() { return `selectivity ${isFinite(sel) ? sel.toFixed(0) : "very high"}   working capacity ${wc.toFixed(1)} per pore`; }
    };
  }
};
