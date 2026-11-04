// Learn: proteins and biomolecules

DEMOS["bio-hp"] = {
  title: "Folding a lattice protein",
  text: "A chain of hydrophobic (H) and polar (P) beads on a square lattice. When two H beads touch, the energy goes down, so at a low temperature, the chain folds with the H beads in its core.",
  details: "HP model, 20 beads HPHPPHHPHPPHPHHPPHPH, E = &minus;1 per non-bonded H-H contact, lowest known E = &minus;9. Metropolis with end, corner and pivot moves, 400 tries per frame",
  make() {
    const SEQ = "HPHPPHHPHPPHPHHPPHPH", n = SEQ.length, H = [...SEQ].map(c => c === "H");
    const p = { T: 0.4 };
    let px, py, E, best, bestTrace, trace;
    const key = (a, b) => a * 1000 + b;
    const energy = (xs, ys) => {
      const occ = new Map(); for (let i = 0; i < n; i++) occ.set(key(xs[i], ys[i]), i);
      let e = 0;
      for (let i = 0; i < n; i++) {
        if (!H[i]) continue;
        for (const [dx, dy] of [[1, 0], [0, 1]]) {
          const j = occ.get(key(xs[i] + dx, ys[i] + dy));
          if (j !== undefined && H[j] && Math.abs(i - j) > 1) e--;
        }
      }
      return e;
    };
    const free = (xs, ys) => { const s = new Set(); for (let i = 0; i < n; i++) { const k = key(xs[i], ys[i]); if (s.has(k)) return false; s.add(k); } return true; };
    return {
      perFrame: 1,
      params: [{ key: "T", label: "temperature", min: 0.1, max: 2, step: 0.05, value: 0.4 }],
      set(k, v) { p[k] = v; },
      reset() {
        px = Array.from({ length: n }, (_, i) => i); py = new Array(n).fill(0);
        E = 0; best = 0; trace = [];
      },
      trial() {
        const xs = px.slice(), ys = py.slice(), i = (rand() * n) | 0;
        if (rand() < 0.3) {
          // pivot the part after (or before) bead i by 90, 180 or 270 degrees
          const r = 1 + ((rand() * 3) | 0), after = rand() < 0.5;
          for (let k = 0; k < n; k++) {
            if (after ? k <= i : k >= i) continue;
            let dx = xs[k] - px[i], dy = ys[k] - py[i];
            for (let q = 0; q < r; q++) { const t = dx; dx = -dy; dy = t; }
            xs[k] = px[i] + dx; ys[k] = py[i] + dy;
          }
        } else if (i === 0 || i === n - 1) {
          const j = i === 0 ? 1 : n - 2, d = [[1, 0], [-1, 0], [0, 1], [0, -1]][(rand() * 4) | 0];
          xs[i] = px[j] + d[0]; ys[i] = py[j] + d[1];
        } else {
          if (px[i - 1] === px[i + 1] || py[i - 1] === py[i + 1]) return;
          xs[i] = px[i - 1] + px[i + 1] - px[i]; ys[i] = py[i - 1] + py[i + 1] - py[i];
        }
        if (!free(xs, ys)) return;
        const En = energy(xs, ys);
        if (En <= E || rand() < Math.exp(-(En - E) / p.T)) { px = xs; py = ys; E = En; best = Math.min(best, E); }
      },
      step() { for (let k = 0; k < 400; k++) this.trial(); trace.push(E); if (trace.length > 400) trace.shift(); },
      draw(ctx, w, h, col) {
        const bw = w * 0.55;
        let mx = 0, my = 0; for (let i = 0; i < n; i++) { mx += px[i]; my += py[i]; } mx /= n; my /= n;
        let ext = 4; for (let i = 0; i < n; i++) ext = Math.max(ext, Math.abs(px[i] - mx) + 1, Math.abs(py[i] - my) + 1);
        const s = Math.min(bw, h - 10) / (2 * ext), cx = bw / 2, cy = (h - 10) / 2;
        const X = i => cx + (px[i] - mx) * s, Y = i => cy + (py[i] - my) * s;
        const occ = new Map(); for (let i = 0; i < n; i++) occ.set(key(px[i], py[i]), i);
        ctx.strokeStyle = col.b; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
        for (let i = 0; i < n; i++) {
          if (!H[i]) continue;
          for (const [dx, dy] of [[1, 0], [0, 1]]) {
            const j = occ.get(key(px[i] + dx, py[i] + dy));
            if (j !== undefined && H[j] && Math.abs(i - j) > 1) { ctx.beginPath(); ctx.moveTo(X(i), Y(i)); ctx.lineTo(X(j), Y(j)); ctx.stroke(); }
          }
        }
        ctx.setLineDash([]);
        ctx.strokeStyle = col.ink; ctx.lineWidth = Math.max(3, s * 0.18); ctx.lineCap = "round";
        ctx.beginPath(); for (let i = 0; i < n; i++) i ? ctx.lineTo(X(i), Y(i)) : ctx.moveTo(X(i), Y(i)); ctx.stroke();
        ctx.lineCap = "butt";
        for (let i = 0; i < n; i++) { ctx.fillStyle = H[i] ? col.b : col.a; dot(ctx, X(i), Y(i), s * 0.32); }
        const P = plotBox(ctx, [bw + 30, 14, w - bw - 42, h - 42], [0, 400], [-10, 0.5], col, "frames", "E");
        P.hline(-9, col.muted);
        P.line(trace.map((v, k) => [k, v]), col.b, 1.5);
      },
      info() { return `E = ${E}   lowest seen ${best}   known minimum -9   orange = H, blue = P`; }
    };
  }
};

DEMOS["bio-melt"] = {
  title: "Melting curves and cooperativity",
  text: "Helix-coil chains, heated slowly. Each unit can be a helix or a coil, and each boundary between the two costs extra energy. With a large boundary cost, whole chains switch together, and the melting curve becomes sharp.",
  details: "200 chains of 20 units, Metropolis flips. Helical unit: &Delta;g = &minus;1 + T (so T<sub>m</sub> &asymp; 1 for long chains), each helix/coil boundary costs J. T ramps from 0.4 to 1.6 and back",
  make() {
    const C = 200, L = 20, bins = 24;
    const p = { J: 1.5 };
    let s, T, dir, acc, cnt;
    const dE = (c, i) => {
      // energy change for flipping unit i of chain c
      const o = c * L, cur = s[o + i], nw = 1 - cur;
      let d = (nw - cur) * (-1 + T);
      for (const j of [i - 1, i + 1]) {
        if (j < 0 || j >= L) continue;
        d += p.J * ((nw !== s[o + j]) - (cur !== s[o + j]));
      }
      return d;
    };
    return {
      perFrame: 1,
      params: [{ key: "J", label: "boundary cost J", min: 0, max: 4, step: 0.1, value: 1.5 }],
      set(k, v) { p[k] = v; acc = new Float64Array(bins); cnt = new Float64Array(bins); },
      reset() { s = new Uint8Array(C * L).fill(1); T = 0.4; dir = 1; acc = new Float64Array(bins); cnt = new Float64Array(bins); },
      step() {
        for (let k = 0; k < C * L; k++) {
          const c = (rand() * C) | 0, i = (rand() * L) | 0, d = dE(c, i);
          if (d <= 0 || rand() < Math.exp(-d / T)) s[c * L + i] ^= 1;
        }
        T += dir * 0.0015; if (T > 1.6) dir = -1; if (T < 0.4) dir = 1;
        let f = 0; for (let k = 0; k < C * L; k++) f += s[k];
        const b = Math.min(bins - 1, Math.floor((T - 0.4) / 1.2 * bins));
        acc[b] += f / (C * L); cnt[b]++;
      },
      draw(ctx, w, h, col) {
        const bw = w * 0.4, rows = 50, ch = (h - 12) / rows, cw = bw / L;
        for (let c = 0; c < rows; c++) for (let i = 0; i < L; i++) {
          ctx.fillStyle = s[c * L + i] ? col.b : col.rule;
          ctx.fillRect(i * cw, 6 + c * ch, cw - 1, Math.max(1, ch - 1));
        }
        const P = plotBox(ctx, [bw + 34, 14, w - bw - 46, h - 42], [0.4, 1.6], [0, 1.05], col, "temperature", "fraction helical");
        const pts = []; for (let b = 0; b < bins; b++) if (cnt[b]) pts.push([0.4 + (b + 0.5) * 1.2 / bins, acc[b] / cnt[b]]);
        P.line(pts, col.b, 2); P.dots(pts, col.b, 3);
        P.line([[T, 0], [T, 1.05]], col.muted, 1, [3, 4]);
      },
      info() {
        let f = 0; for (let k = 0; k < C * L; k++) f += s[k];
        return `T = ${T.toFixed(2)} ${dir > 0 ? "heating" : "cooling"}   helical ${(100 * f / (C * L)).toFixed(0)}%`;
      }
    };
  }
};

DEMOS["bio-bilayer"] = {
  title: "Lipids assembling into a membrane",
  text: "Lipid-like molecules in DPD water, each with one water-loving head bead and two oily tail beads. The tails hide from the water, and the molecules gather into bilayer sheets and micelles.",
  details: "2D DPD, box 15 &times; 8.75, 380 beads (water drawn faint), &rho; &asymp; 2.9, a = 25 between like beads, a<sub>HT</sub> = 50, a<sub>TW</sub> set by the slider, bonds k = 400, r<sub>0</sub> = 0.45 (beads drawn as wide as a bond), kT = 1, dt = 0.03",
  make() {
    const LX = 15, LY = 8.75, NT = 380, dt = 0.03, gamma = 4.5, noise = 3 / Math.sqrt(dt);
    const p = { aTW: 75, lip: 50 };
    let x, y, vx, vy, fx, fy, type, nl, t;
    // types: 0 water, 1 head, 2 tail
    const A = (a, b) => { if (a === b) return 25; if (a + b === 2 && a !== 1) return p.aTW; if (a + b === 3) return 50; return 25; };
    const forces = () => {
      fx.fill(0); fy.fill(0);
      for (let i = 0; i < NT; i++) for (let j = i + 1; j < NT; j++) {
        let dx = x[i] - x[j], dy = y[i] - y[j];
        dx -= LX * Math.round(dx / LX); dy -= LY * Math.round(dy / LY);
        const r2 = dx * dx + dy * dy; if (r2 >= 1 || r2 === 0) continue;
        const r = Math.sqrt(r2), ex = dx / r, ey = dy / r, w = 1 - r;
        const dv = ex * (vx[i] - vx[j]) + ey * (vy[i] - vy[j]);
        const f = A(type[i], type[j]) * w - gamma * w * w * dv + noise * w * gauss();
        fx[i] += f * ex; fy[i] += f * ey; fx[j] -= f * ex; fy[j] -= f * ey;
      }
      for (let m = 0; m < nl; m++) for (let k = 0; k < 2; k++) {
        const i = 3 * m + k, j = i + 1;
        let dx = x[i] - x[j], dy = y[i] - y[j];
        dx -= LX * Math.round(dx / LX); dy -= LY * Math.round(dy / LY);
        const r = Math.hypot(dx, dy) || 1e-6, f = -400 * (r - 0.45);
        fx[i] += f * dx / r; fy[i] += f * dy / r; fx[j] -= f * dx / r; fy[j] -= f * dy / r;
      }
    };
    return {
      perFrame: 3,
      params: [
        { key: "aTW", label: "tail-water repulsion", min: 25, max: 100, step: 1, value: 75 },
        { key: "lip", label: "lipids", min: 10, max: 80, step: 1, value: 50 }
      ],
      set(k, v) { p[k] = v; if (k === "lip") this.reset(); },
      reset() {
        nl = p.lip;
        x = new Float64Array(NT); y = new Float64Array(NT); vx = new Float64Array(NT); vy = new Float64Array(NT);
        fx = new Float64Array(NT); fy = new Float64Array(NT); type = new Uint8Array(NT);
        for (let m = 0; m < nl; m++) {
          const x0 = rand() * LX, y0 = rand() * LY, a = rand() * 2 * Math.PI;
          for (let k = 0; k < 3; k++) { const i = 3 * m + k; x[i] = (x0 + 0.45 * k * Math.cos(a) + LX) % LX; y[i] = (y0 + 0.45 * k * Math.sin(a) + LY) % LY; type[i] = k ? 2 : 1; }
        }
        for (let i = 3 * nl; i < NT; i++) { x[i] = rand() * LX; y[i] = rand() * LY; }
        for (let i = 0; i < NT; i++) { vx[i] = gauss(); vy[i] = gauss(); }
        t = 0; forces();
      },
      step() {
        for (let i = 0; i < NT; i++) {
          vx[i] += 0.5 * dt * fx[i]; vy[i] += 0.5 * dt * fy[i];
          x[i] = (x[i] + dt * vx[i] + LX) % LX; y[i] = (y[i] + dt * vy[i] + LY) % LY;
        }
        forces();
        for (let i = 0; i < NT; i++) { vx[i] += 0.5 * dt * fx[i]; vy[i] += 0.5 * dt * fy[i]; }
        t += dt;
      },
      draw(ctx, w, h, col) {
        const s = Math.min(w / LX, h / LY);
        ctx.fillStyle = col.muted; ctx.globalAlpha = 0.25;
        for (let i = 3 * nl; i < NT; i++) dot(ctx, x[i] * s, y[i] * s, s * 0.12);
        ctx.globalAlpha = 1;
        // lipid beads as wide as the bond length 0.45, so bonded beads touch
        for (let i = 0; i < 3 * nl; i++) { ctx.fillStyle = type[i] === 1 ? col.a : col.b; dot(ctx, x[i] * s, y[i] * s, s * 0.225); }
      },
      info() {
        // fraction of tail beads with no water bead inside r = 1
        let buried = 0, tails = 0;
        for (let i = 0; i < 3 * nl; i++) {
          if (type[i] !== 2) continue; tails++;
          let wet = false;
          for (let j = 3 * nl; j < NT && !wet; j++) {
            let dx = x[i] - x[j], dy = y[i] - y[j];
            dx -= LX * Math.round(dx / LX); dy -= LY * Math.round(dy / LY);
            if (dx * dx + dy * dy < 0.64) wet = true;
          }
          if (!wet) buried++;
        }
        return `t = ${t.toFixed(0)}   tails shielded from water ${(100 * buried / Math.max(tails, 1)).toFixed(0)}%   blue = head, orange = tail`;
      }
    };
  }
};

DEMOS["bio-enzyme"] = {
  title: "Enzyme kinetics, one molecule at a time",
  text: "Enzymes bind a substrate, turn it into a product, and let it go. If you count the products made at each substrate level, you trace out the Michaelis-Menten curve. A competitive inhibitor blocks the active site and shifts the curve to the right.",
  hint: "Move the substrate slider a few times. Each level leaves a measured point.",
  details: "Gillespie simulation, 20 enzymes, substrate and inhibitor held constant. k<sub>1</sub> = 0.01, k<sub>&minus;1</sub> = 1, k<sub>cat</sub> = 2, K<sub>m</sub> = 300, V<sub>max</sub> = 40, inhibitor K<sub>i</sub> = 100. Lines: v = V<sub>max</sub>[S] / (K<sub>m</sub>(1 + [I]/K<sub>i</sub>) + [S])",
  make() {
    const E0 = 20, k1 = 0.01, km1 = 1, kc = 2, ki = 0.01, kmi = 1;
    const p = { S: 300, I: 0 };
    let st, prod, time, pts, flash;
    // st[e]: 0 free, 1 with substrate, 2 with inhibitor
    return {
      perFrame: 1,
      params: [
        { key: "S", label: "substrate [S]", min: 10, max: 2000, step: 10, value: 300 },
        { key: "I", label: "inhibitor [I]", min: 0, max: 500, step: 10, value: 0 }
      ],
      set(k, v) { p[k] = v; prod = 0; time = 0; if (k === "I") pts = []; },
      reset() { st = new Uint8Array(E0); prod = 0; time = 0; pts = []; flash = new Float64Array(E0); },
      step() {
        const tEnd = time + 0.4;
        while (true) {
          let rates = [], tot = 0;
          for (let e = 0; e < E0; e++) {
            const r = st[e] === 0 ? [k1 * p.S, ki * p.I] : st[e] === 1 ? [km1, kc] : [kmi];
            rates.push(r); for (const v of r) tot += v;
          }
          const dtau = -Math.log(rand() + 1e-12) / tot;
          if (time + dtau > tEnd) { time = tEnd; break; }
          time += dtau;
          let u = rand() * tot;
          for (let e = 0; e < E0; e++) {
            let done = false;
            for (let k = 0; k < rates[e].length; k++) {
              u -= rates[e][k];
              if (u < 0) {
                if (st[e] === 0) st[e] = k === 0 ? 1 : 2;
                else if (st[e] === 1) { st[e] = 0; if (k === 1) { prod++; flash[e] = 1; } }
                else st[e] = 0;
                done = true; break;
              }
            }
            if (done) break;
          }
        }
        for (let e = 0; e < E0; e++) flash[e] *= 0.8;
        if (time > 20) {
          const key = p.S, old = pts.find(q => q[0] === key), v = prod / time;
          if (old) old[1] = v; else pts.push([key, v]);
        }
      },
      draw(ctx, w, h, col) {
        const bw = w * 0.36, nc = 4, cw = bw / nc, ch = (h - 20) / 5, r = Math.min(cw, ch) * 0.3;
        for (let e = 0; e < E0; e++) {
          const cx = (e % nc + 0.5) * cw, cy = 10 + (Math.floor(e / nc) + 0.5) * ch;
          ctx.fillStyle = col.a; ctx.beginPath(); ctx.arc(cx, cy, r, 0.25 * Math.PI, 1.75 * Math.PI); ctx.lineTo(cx, cy); ctx.fill();
          if (st[e] === 1) { ctx.fillStyle = col.b; dot(ctx, cx + r * 0.55, cy, r * 0.35); }
          if (st[e] === 2) { ctx.fillStyle = col.muted; ctx.fillRect(cx + r * 0.2, cy - r * 0.3, r * 0.7, r * 0.6); }
          if (flash[e] > 0.1) { ctx.fillStyle = col.ink; ctx.globalAlpha = flash[e]; dot(ctx, cx + r * 1.4, cy - r * 0.6, r * 0.22); ctx.globalAlpha = 1; }
        }
        const P = plotBox(ctx, [bw + 36, 14, w - bw - 48, h - 42], [0, 2000], [0, 44], col, "[S]", "rate v");
        const c0 = [], c1 = [];
        for (let k = 0; k <= 100; k++) { const S = 20 * k; c0.push([S, 40 * S / (300 + S)]); c1.push([S, 40 * S / (300 * (1 + p.I / 100) + S)]); }
        P.line(c0, col.muted, 1.2, [4, 4]);
        if (p.I) P.line(c1, col.b, 1.5);
        P.hline(40, col.rule);
        P.dots(pts, col.ink, 4);
      },
      info() {
        const free = st.reduce((a, v) => a + (v === 0), 0), busy = st.reduce((a, v) => a + (v === 1), 0);
        return `measured v = ${time ? (prod / time).toFixed(1) : "-"}   expected ${(40 * p.S / (300 * (1 + p.I / 100) + p.S)).toFixed(1)}   enzymes busy ${busy}, free ${free}`;
      }
    };
  }
};
