// Demos for the research page: small versions of the systems in my papers.
// They are toy models in 2D that show the mechanism, not the published numbers.

// ---------------------------------------------------------------- Publication I
// Di-block copolymers A_k B_l (k + l = 7) in water settle on a hydrophilic substrate.
// Bead types and repulsions follow the DPD model of the paper: A starch-like, B hydrophobic, C substrate, D water.
DEMOS["rs-film"] = {
  title: "How the block ratio shapes the film",
  text: "The bead model from the paper in a small 2D box. Copolymers of seven beads, with k hydrophilic beads (blue) and 7 &minus; k hydrophobic beads (orange), adsorb from water onto a hydrophilic substrate. The hydrophilic blocks cover the substrate and the hydrophobic blocks gather above them, so a layered film starts to form. Each bead is drawn as wide as a bond is long, so bonded beads touch. The box is much smaller and the run much shorter than in the published 3D simulations, so the figure shows the process rather than the final structures. The top of the box acts like more water, so nothing sticks there.",
  details: "2D DPD with the bulk repulsions from the paper, a<sub>AB</sub> = 56.15, a<sub>BD</sub> = 107, a<sub>AD</sub> = a<sub>CD</sub> = 35, and 25 for all other pairs. The substrate is made more selective than in the paper, a<sub>AC</sub> = 5 and a<sub>BC</sub> = 107, so the film forms within a short run, with K<sub>b</sub> = 80, r<sub>0</sub> = 1, &rho; = 3, and dt = 0.04. The plot on the right shows the bead density against the distance from the substrate, with A in blue and B in orange",
  make() {
    const LX = 10, LY = 14, H0 = 1.2, dt = 0.04, bins = 22, half = LY - H0;
    // the substrate (C) attracts the hydrophilic A beads and repels the hydrophobic B beads as strongly as water does
    const A = [[25, 56.15, 5, 35], [56.15, 25, 107, 107], [5, 107, 25, 35], [35, 107, 35, 25]];
    const p = { k: 4, frac: 34 };
    let sim, nPoly, nSub, hA, hB;
    // the top of the box pushes every bead the way water would, so it attracts nothing
    const topWall = d => {
      for (let i = 0; i < d.n; i++) {
        const g = LY - d.y[i];
        if (g < 1 && !d.frozen[i]) d.fy[i] -= A[d.type[i]][3] * (1 - g);
      }
    };
    return {
      perFrame: 8,
      params: [
        { key: "k", label: "hydrophilic beads k", min: 1, max: 6, step: 1, value: 4 },
        { key: "frac", label: "copolymer %", min: 6, max: 44, step: 2, value: 34 }
      ],
      set(key, v) { p[key] = v; this.reset(); },
      reset() {
        const fluid = Math.round(3 * LX * (LY - H0)), chains = Math.round(fluid * p.frac / 100 / 7);
        nSub = Math.round(3.5 * LX * H0); nPoly = chains * 7;
        const n = fluid + nSub;
        const x = new Float64Array(n), y = new Float64Array(n), type = new Uint8Array(n), frozen = new Uint8Array(n), bonds = [];
        let i = 0;
        for (let c = 0; c < chains; c++) {
          let cx = rand() * LX, cy = H0 + 1 + rand() * 0.6 * (LY - H0 - 2);
          for (let b = 0; b < 7; b++, i++) {
            cx = (cx + 0.5 * gauss() + LX) % LX; cy = Math.min(LY - 0.3, Math.max(H0 + 0.3, cy + 0.5 * gauss()));
            x[i] = cx; y[i] = cy; type[i] = b < p.k ? 0 : 1;
            if (b) bonds.push(i - 1, i);
          }
        }
        for (; i < fluid; i++) { x[i] = rand() * LX; y[i] = H0 + rand() * (LY - H0); type[i] = 3; }
        for (let s = 0; s < nSub; s++, i++) { x[i] = rand() * LX; y[i] = rand() * H0; type[i] = 2; frozen[i] = 1; }
        sim = new DPD2D({ LX, LY, periodicY: false, ylo: H0, yhi: LY, aij: A, dt, kb: 80, r0: 1, extra: topWall });
        sim.load(x, y, type, frozen, bonds);
        hA = new Float64Array(bins); hB = new Float64Array(bins);
      },
      step() {
        sim.step();
        // profiles with a slowly fading memory, so they follow the film as it forms
        if (Math.round(sim.t / dt) % 10) return;
        for (let b = 0; b < bins; b++) { hA[b] *= 0.97; hB[b] *= 0.97; }
        for (let i = 0; i < nPoly; i++) {
          const b = Math.floor((sim.y[i] - H0) / half * bins);
          if (b >= 0 && b < bins) (sim.type[i] ? hB : hA)[b]++;
        }
      },
      overlap() {
        let sa = 0, sb = 0, o = 0;
        for (let b = 0; b < bins; b++) { sa += hA[b]; sb += hB[b]; }
        if (!sa || !sb) return NaN;
        for (let b = 0; b < bins; b++) o += Math.min(hA[b] / sa, hB[b] / sb);
        return o;
      },
      draw(ctx, w, h, col) {
        const pw = Math.min(w * 0.34, 230), bw = w - pw - 16, s = Math.min(bw / LX, (h - 6) / LY);
        const base = (h + LY * s) / 2, X = v => v * s, Y = v => base - v * s;
        ctx.fillStyle = col.rule; ctx.fillRect(0, Y(H0), LX * s, H0 * s);
        ctx.fillStyle = col.muted; ctx.font = "10px monospace"; ctx.fillText("substrate", 4, Y(0) - 4);
        ctx.fillStyle = col.muted; ctx.globalAlpha = 0.28;
        for (let i = nPoly; i < sim.n - nSub; i++) dot(ctx, X(sim.x[i]), Y(sim.y[i]), Math.max(1, s * 0.08));
        ctx.globalAlpha = 1;
        // beads as wide as the bond length r0 = 1, so bonded beads touch and no bond lines are needed
        for (let i = 0; i < nPoly; i++) { ctx.fillStyle = sim.type[i] ? col.b : col.a; bead(ctx, X(sim.x[i]), Y(sim.y[i]), s * 0.5, col); }
        let sa = 0, sb = 0, top = 0;
        for (let b = 0; b < bins; b++) { sa += hA[b]; sb += hB[b]; }
        const pa = [], pb = [];
        for (let b = 0; b < bins; b++) {
          const d = (b + 0.5) / bins * half;
          pa.push([d, sa ? hA[b] / sa : 0]); pb.push([d, sb ? hB[b] / sb : 0]);
          top = Math.max(top, pa[b][1], pb[b][1]);
        }
        const P = plotBox(ctx, [bw + 34, 14, pw - 40, h - 44], [0, half], [0, Math.max(0.2, top * 1.1)], col, "distance from substrate", "P");
        P.line(pa, col.a, 2); P.line(pb, col.b, 2);
      },
      contact() {
        // share of the polymer beads touching the substrate that are hydrophilic
        let a = 0, all = 0;
        for (let i = 0; i < nPoly; i++) if (sim.y[i] < H0 + 0.8) { all++; if (!sim.type[i]) a++; }
        return all ? a / all : NaN;
      },
      info() {
        const o = this.overlap(), c = this.contact();
        return `A${p.k}B${7 - p.k}   t = ${sim.t.toFixed(0)}   on the substrate: ${isFinite(c) ? (100 * c).toFixed(0) + "% blue" : "nothing yet"}   A/B overlap ${isFinite(o) ? o.toFixed(2) : "-"}`;
      }
    };
  }
};

// ---------------------------------------------------------------- shared sketch helpers
// A seeded random generator, so sketches look the same on every frame and only jiggle a little.
function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// fills a shape (given by inside(u, v) on the unit square of the box) with beads of one color
function sketchBeads(ctx, box, inside, color, density, seed, phase, r) {
  const [bx, by, bw, bh] = box, R = seeded(seed), n = Math.round(bw * bh * density / 1000);
  ctx.fillStyle = color;
  for (let k = 0; k < n; k++) {
    const u = R(), v = R(), j = R() * 6.283;
    if (!inside(u, v)) continue;
    dot(ctx, bx + u * bw + 1.2 * Math.sin(phase + j), by + (1 - v) * bh + 1.2 * Math.cos(1.3 * phase + j), r);
  }
}
function substrate(ctx, box, col, name) {
  const [bx, by, bw, bh] = box;
  ctx.fillStyle = col.rule; ctx.fillRect(bx, by + bh, bw, 12);
  ctx.fillStyle = col.muted; ctx.font = "10px monospace"; ctx.textAlign = "left";
  ctx.fillText(name || "hydrophilic substrate", bx + 4, by + bh + 10);
}
// a row of colored dots with names, wrapped onto a new line when it runs past maxX; returns the last baseline
function beadLegend(ctx, x, y, maxX, items, col) {
  ctx.font = "10px monospace"; ctx.textAlign = "left";
  let cx = x;
  for (const [color, name] of items) {
    const wd = 14 + ctx.measureText(name).width;
    if (cx > x && cx + wd > maxX) { cx = x; y += 15; }
    ctx.fillStyle = color; dot(ctx, cx + 4, y - 3.5, 3.5);
    ctx.fillStyle = col.muted; ctx.fillText(name, cx + 12, y);
    cx += wd + 14;
  }
  return y;
}
// tick labels for plotBox axes
function yTicks(ctx, P, x0, vals, col, fmt) {
  ctx.fillStyle = col.muted; ctx.font = "10px monospace"; ctx.textAlign = "right";
  for (const v of vals) { const y = P.Y(v); ctx.fillRect(x0 - 3, y - 0.5, 3, 1); ctx.fillText(fmt ? fmt(v) : String(v), x0 - 6, y + 3.5); }
  ctx.textAlign = "left";
}
function xTicks(ctx, P, y0, vals, col, fmt) {
  ctx.fillStyle = col.muted; ctx.font = "10px monospace"; ctx.textAlign = "center";
  for (const v of vals) { const x = P.X(v); ctx.fillRect(x - 0.5, y0, 1, 3); ctx.fillText(fmt ? fmt(v) : String(v), x, y0 + 13); }
  ctx.textAlign = "left";
}
const COAT_LEGEND = col => [[col.a, "starch block"], [col.b, "hydrophobic block"], [col.ink, "B19 homopolymer"]];
// faint water beads wherever the sketch has no polymer (busy(u, v) is true inside the polymer)
function sketchWater(ctx, box, busy, col, phase) {
  ctx.globalAlpha = 0.35;
  sketchBeads(ctx, box, (u, v) => !busy(u, v), col.muted, 2.6, 97, phase, 1.2);
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- Publications I and II: block ratio
DEMOS["rs-ratio"] = {
  still: true,
  narrowAspect: "4 / 5",
  title: "Block ratio and coating structure",
  text: "Pick the block ratio of the copolymer A<sub>i</sub>B<sub>j</sub>, where i + j = 7. The figure shows the chain, the shape that it packs like, and a sketch of the coating that formed in the simulations of the paper, when the copolymer was mixed with a hydrophobic homopolymer, B<sub>19</sub>.",
  details: "These are sketches of the published results of paper 2 (11.25% copolymer and 10% B<sub>19</sub>), not a live simulation. For the copolymer alone (paper 1, 11.25%), 6:1 gives a mixed film, 5:2 puts B in the middle of the film, and 4:3 gives clean A|B|A layers",
  make() {
    const p = { i: 4 };
    let phase = 0;
    const outcome = i => i === 6 || i === 1 ? "droplets" : i === 5 ? "wets" : i === 2 ? "curved" : "lamellar";
    const words = {
      droplets: "droplets with the hydrophobic polymer in their cores",
      wets: "copolymer wets the substrate, hydrophobic layer broken",
      curved: "curved aggregates, the substrate is not fully covered",
      lamellar: "lamellar coating, hydrophobic layer continuous"
    };
    // the chain, head (A) on top, as a zigzag of beads
    const chain = (ctx, cx, top, step, i, col) => {
      const pts = [];
      for (let k = 0; k < 7; k++) pts.push([cx + (k % 2 ? 7 : -7) + 1.5 * Math.sin(phase + k), top + k * step]);
      ctx.strokeStyle = col.ink; ctx.lineWidth = 3; ctx.beginPath();
      pts.forEach(([a, b], k) => k ? ctx.lineTo(a, b) : ctx.moveTo(a, b)); ctx.stroke();
      pts.forEach(([a, b], k) => { ctx.fillStyle = k < i ? col.a : col.b; dot(ctx, a, b, 6.5); });
    };
    // the shape it packs like: width of the head part against width of the tail part
    const shape = (ctx, cx, sy, sh, i, col) => {
      const j = 7 - i, wt = 14 + 9 * i, wb = 14 + 9 * j;
      ctx.strokeStyle = col.muted; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]); ctx.beginPath();
      ctx.moveTo(cx - wt / 2, sy); ctx.lineTo(cx + wt / 2, sy); ctx.lineTo(cx + wb / 2, sy + sh); ctx.lineTo(cx - wb / 2, sy + sh); ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
      const d = i - j;
      return Math.abs(d) <= 1 ? "cylinder: flat layers" : d === 3 ? "slight cone" : d === -3 ? "slight inverted cone" : d > 0 ? "cone: strongly curved" : "inverted cone: strongly curved";
    };
    return {
      perFrame: 1,
      params: [{ key: "i", label: "hydrophilic beads i", min: 1, max: 6, step: 1, value: 4 }],
      set(k, v) { p[k] = v; },
      reset() { phase = 0; },
      step() { phase += 0.03; },
      draw(ctx, w, h, col) {
        const i = p.i, j = 7 - i, narrow = w < 560;
        ctx.font = "11px monospace"; ctx.fillStyle = col.muted; ctx.textAlign = "center";
        let box, legendY;
        if (narrow) {
          ctx.fillText(`A${i}B${j}`, 50, 14);
          chain(ctx, 50, 32, 15, i, col);
          const label = shape(ctx, Math.min(200, w * 0.55), 30, 92, i, col);
          ctx.fillStyle = col.muted; ctx.fillText(label, Math.min(200, w * 0.55), 142);
          legendY = 172; box = [10, 196, w - 20, h - 230];
        } else {
          const lw = Math.min(w * 0.3, 200), cx = lw / 2, top = 34, step = Math.min(18, (h * 0.5) / 7);
          ctx.fillText(`A${i}B${j}`, cx, 14);
          chain(ctx, cx, top, step, i, col);
          const sy = top + 6 * step + 34;
          const label = shape(ctx, cx, sy, h - sy - 30, i, col);
          ctx.fillStyle = col.muted; ctx.fillText(label, cx, h - 12);
          legendY = 16; box = [lw + 20, 40, w - lw - 30, h - 72];
        }
        ctx.textAlign = "left";
        const [bx, by, bw, bh] = box;
        const ly = beadLegend(ctx, bx, legendY, bx + bw, COAT_LEGEND(col), col);
        ctx.fillStyle = col.muted; ctx.textAlign = "right"; ctx.fillText("water", bx + bw, ly + 18); ctx.textAlign = "left";
        substrate(ctx, box, col);
        const o = outcome(i), r = narrow ? 2.6 : 3.2;
        const film = (lo, hi) => (u, v) => v >= lo && v < hi;
        const drops = (n, rad, core) => (u, v) => { for (let d = 0; d < n; d++) { const c = (d + 0.5) / n, ry = rad * bw / bh; if (((u - c) / rad) ** 2 + (v / ry) ** 2 < (core ? 0.45 : 1)) return true; } return false; };
        const busy = {
          droplets: drops(3, 0.11, false),
          wets: (u, v) => v < 0.2 || [0.22, 0.62].some(q => ((u - q) / 0.13) ** 2 + ((v - 0.22) / 0.12) ** 2 < 1),
          curved: (u, v) => [0.18, 0.5, 0.82].some(c => ((u - c) / 0.1) ** 2 + (v / 0.3) ** 2 < 1),
          lamellar: (u, v) => v < 0.5
        }[o];
        sketchWater(ctx, box, busy, col, phase);
        if (o === "droplets") {
          const n = 3, rad = 0.11;
          const shell = (u, v) => drops(n, rad, false)(u, v) && !drops(n, rad, true)(u, v);
          sketchBeads(ctx, box, shell, i === 6 ? col.a : col.b, 9, 11, phase, r);
          sketchBeads(ctx, box, shell, i === 6 ? col.b : col.a, 3, 12, phase, r);
          sketchBeads(ctx, box, drops(n, rad, true), col.ink, 10, 13, phase, r * 0.9);
        } else if (o === "wets") {
          sketchBeads(ctx, box, film(0, 0.16), col.a, 9, 21, phase, r);
          sketchBeads(ctx, box, film(0.04, 0.14), col.b, 3, 22, phase, r);
          const lens = (u, v) => [0.22, 0.62].some(q => ((u - q) / 0.13) ** 2 + ((v - 0.22) / 0.12) ** 2 < 1);
          const lensCore = (u, v) => [0.22, 0.62].some(q => ((u - q) / 0.09) ** 2 + ((v - 0.22) / 0.07) ** 2 < 1);
          sketchBeads(ctx, box, (u, v) => lens(u, v) && !lensCore(u, v), col.b, 9, 23, phase, r);
          sketchBeads(ctx, box, lensCore, col.ink, 10, 24, phase, r * 0.9);
          sketchBeads(ctx, box, (u, v) => v >= 0.16 && v < 0.2 && !lens(u, v), col.a, 7, 25, phase, r);
        } else if (o === "curved") {
          const dome = (u, v) => [0.18, 0.5, 0.82].some(c => ((u - c) / 0.1) ** 2 + (v / 0.3) ** 2 < 1);
          const core = (u, v) => [0.18, 0.5, 0.82].some(c => ((u - c) / 0.06) ** 2 + (v / 0.19) ** 2 < 1);
          sketchBeads(ctx, box, (u, v) => dome(u, v) && !core(u, v), col.b, 9, 31, phase, r);
          sketchBeads(ctx, box, (u, v) => dome(u, v) && !core(u, v) && v > 0.18, col.a, 4, 32, phase, r);
          sketchBeads(ctx, box, core, col.ink, 10, 33, phase, r * 0.9);
        } else {
          sketchBeads(ctx, box, film(0, 0.1), col.a, 9, 41, phase, r);
          sketchBeads(ctx, box, film(0.1, 0.17), col.b, 9, 42, phase, r);
          sketchBeads(ctx, box, film(0.17, 0.33), col.ink, 10, 43, phase, r * 0.9);
          sketchBeads(ctx, box, film(0.33, 0.4), col.b, 9, 44, phase, r);
          sketchBeads(ctx, box, film(0.4, 0.5), col.a, 9, 45, phase, r);
        }
      },
      info() { return `A${p.i}B${7 - p.i} with B19: ${words[outcome(p.i)]}`; }
    };
  }
};

// ---------------------------------------------------------------- Publication II: composition window
DEMOS["rs-window"] = {
  still: true,
  narrowAspect: "4 / 5",
  title: "The composition window",
  text: "Click or drag on the map to choose how much copolymer (A<sub>3</sub>B<sub>4</sub>) and hydrophobic homopolymer (B<sub>19</sub>) the coating mixture contains. Too little copolymer leaves islands, and too much copolymer pierces the hydrophobic layer with hydrophilic channels. In between, extra B<sub>19</sub> only makes the film thicker.",
  hint: "Click or drag on the map.",
  details: "The regions are drawn from the assembly diagram of paper 2. The coating is incomplete at 9% copolymer for 7 to 15% B<sub>19</sub>, complete at 10 and 11.25% copolymer when B<sub>19</sub> is above 8%, and cracked at 12.5 to 15% copolymer. The boundaries between the simulated points are approximate",
  make() {
    const p = { c: 10.6, b: 12 };
    let phase = 0;
    const region = (c, b) => c < 9.5 ? "incomplete" : c < 11.9 ? (b > 8 ? "complete" : "incomplete") : "cracked";
    const mapBox = (w, h) => w < 560 ? [40, 14, w - 56, h * 0.5 - 46] : [40, 14, Math.min(w * 0.42, 300), h - 46];
    return {
      perFrame: 1,
      reset() { phase = 0; },
      step() { phase += 0.03; },
      set(k, v) { p[k] = v; },
      drag(px, py, w, h, down) {
        if (!down) return;
        const [bx, by, bw, bh] = mapBox(w, h);
        if (py > by + bh + 20) return;
        p.c = Math.min(15.5, Math.max(8.2, 8 + (px - bx) / bw * 8));
        p.b = Math.min(15.8, Math.max(6.2, 6 + (1 - (py - by) / bh) * 10));
      },
      draw(ctx, w, h, col) {
        const narrow = w < 560, mb = mapBox(w, h), [bx, by, bw, bh] = mb;
        const P = plotBox(ctx, mb, [8, 16], [6, 16], col, "", "");
        const fill = (c0, c1, b0, b1, color, a) => { ctx.fillStyle = color; ctx.globalAlpha = a; ctx.fillRect(P.X(c0), P.Y(b1), P.X(c1) - P.X(c0), P.Y(b0) - P.Y(b1)); ctx.globalAlpha = 1; };
        fill(8, 9.5, 6, 16, col.b, 0.16); fill(9.5, 11.9, 6, 8, col.b, 0.16);
        fill(9.5, 11.9, 8, 16, col.a, 0.22); fill(11.9, 16, 6, 16, col.muted, 0.2);
        ctx.fillStyle = col.ink; ctx.font = "11px monospace";
        ctx.save(); ctx.translate(P.X(8.85), P.Y(11)); ctx.rotate(-Math.PI / 2); ctx.textAlign = "center"; ctx.fillText("incomplete", 0, 0); ctx.restore();
        ctx.textAlign = "center"; ctx.fillText("complete", P.X(10.7), P.Y(14.8)); ctx.fillText("cracked", P.X(13.9), P.Y(14.8)); ctx.textAlign = "left";
        yTicks(ctx, P, bx, [6, 8, 10, 12, 14, 16], col);
        xTicks(ctx, P, by + bh, [9, 10, 11.25, 12.5, 15], col);
        ctx.fillStyle = col.muted; ctx.font = "10px monospace";
        ctx.textAlign = "right"; ctx.fillText("A3B4 copolymer %", bx + bw, by + bh + 28); ctx.textAlign = "left";
        ctx.save(); ctx.translate(12, by + bh / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = "center"; ctx.fillText("B19 %", 0, 0); ctx.restore();
        ctx.strokeStyle = col.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(P.X(p.c), P.Y(p.b), 7, 0, 2 * Math.PI); ctx.stroke();
        // cross-section sketch
        const box = narrow ? [10, h * 0.5 + 36, w - 20, h * 0.5 - 62] : [bx + bw + 40, 40, w - bx - bw - 50, h - 72], r = narrow ? 2.6 : 3;
        beadLegend(ctx, box[0], box[1] - 20, box[0] + box[2], COAT_LEGEND(col), col);
        substrate(ctx, box, col);
        const reg = region(p.c, p.b), film = (lo, hi) => (u, v) => v >= lo && v < hi;
        const top = reg === "complete" ? 0.4 + 0.016 * (p.b - 8) : 0.46;
        const islands = (u, v) => [0.2, 0.68].some(c => ((u - c) / 0.16) ** 2 + (v / 0.26) ** 2 < 1);
        sketchWater(ctx, box, reg === "incomplete" ? islands : (u, v) => v < top, col, phase);
        if (reg === "complete") {
          const t = 0.08 + 0.016 * (p.b - 8);
          sketchBeads(ctx, box, film(0, 0.1), col.a, 9, 51, phase, r);
          sketchBeads(ctx, box, film(0.1, 0.16), col.b, 9, 52, phase, r);
          sketchBeads(ctx, box, film(0.16, 0.16 + t), col.ink, 10, 53, phase, r * 0.9);
          sketchBeads(ctx, box, film(0.16 + t, 0.22 + t), col.b, 9, 54, phase, r);
          sketchBeads(ctx, box, film(0.22 + t, 0.32 + t), col.a, 9, 55, phase, r);
        } else if (reg === "cracked") {
          const nch = Math.round(1 + (p.c - 11.9) * 1.2), chan = (u, v) => { for (let k = 0; k < nch; k++) if (Math.abs(u - (k + 0.5) / nch) < 0.035) return true; return false; };
          sketchBeads(ctx, box, film(0, 0.1), col.a, 9, 61, phase, r);
          sketchBeads(ctx, box, (u, v) => v >= 0.1 && v < 0.16 && !chan(u, v), col.b, 9, 62, phase, r);
          sketchBeads(ctx, box, (u, v) => v >= 0.16 && v < 0.3 && !chan(u, v), col.ink, 10, 63, phase, r * 0.9);
          sketchBeads(ctx, box, (u, v) => v >= 0.3 && v < 0.36 && !chan(u, v), col.b, 9, 64, phase, r);
          sketchBeads(ctx, box, (u, v) => v >= 0.1 && v < 0.36 && chan(u, v), col.a, 12, 65, phase, r);
          sketchBeads(ctx, box, film(0.36, 0.46), col.a, 9, 66, phase, r);
        } else {
          const isl = (u, v) => [0.2, 0.68].some(c => ((u - c) / 0.16) ** 2 + (v / 0.26) ** 2 < 1);
          const core = (u, v) => [0.2, 0.68].some(c => ((u - c) / 0.1) ** 2 + (v / 0.16) ** 2 < 1);
          sketchBeads(ctx, box, (u, v) => isl(u, v) && !core(u, v), col.a, 7, 71, phase, r);
          sketchBeads(ctx, box, (u, v) => isl(u, v) && !core(u, v), col.b, 5, 72, phase, r);
          sketchBeads(ctx, box, core, col.ink, 10, 73, phase, r * 0.9);
        }
      },
      info() {
        const reg = region(p.c, p.b);
        const say = { incomplete: "incomplete coverage, islands", complete: "complete, a continuous hydrophobic layer", cracked: "cracked, channels through the hydrophobic layer" }[reg];
        return `A3B4 ${p.c.toFixed(1)}%, B19 ${p.b.toFixed(1)}%: ${say}`;
      }
    };
  }
};

// ---------------------------------------------------------------- Publication III: water in the hydrophobic layer
DEMOS["rs-water"] = {
  still: true,
  narrowAspect: "4 / 5",
  title: "Water uptake before and after stretching",
  text: "Results from atomistic simulations of four copolymer assemblies, all with the same starch block but with different hydrophobic blocks. The bars show the published number of water molecules per nm&sup2; that entered the hydrophobic layer, without stretching and after 10% biaxial stretching. The sketch holds the same number of water molecules for the selected polymer.",
  hint: "Click a pair of bars to pick a polymer.",
  details: "Data from Table 4.1 of the thesis and paper 3 (mean &plusmn; error), with OPLS-AA, TIP3P, 298 K, 1 atm, and 40 ns of analysis per system. The number of water molecules drawn is the count times the box area of that system (the stretched area for 10%)",
  make() {
    const D = [
      { name: "P(S-BA)-b-St", w: [1.18, 1.93], e: [0.14, 0.22], r: [2.18, 2.02], A: 6.08 * 6.16, rough: [1, 0.8] },
      { name: "P(S-EHA)-b-St", w: [0.33, 0.92], e: [0.07, 0.13], r: [2.12, 1.98], A: 6.61 * 6.61, rough: [1, 0.8] },
      { name: "P(iBM-BA)-b-St", w: [0.38, 2.0], e: [0.08, 0.2], r: [2.29, 2.14], A: 6.49 * 6.14, rough: [1, 1.6] },
      { name: "P(MMA-BA)-b-St", w: [1.27, 1.92], e: [0.17, 0.24], r: [2.08, 1.89], A: 6.08 * 6.07, rough: [1, 1.4] }
    ];
    const p = { sel: 1, strain: 0 };
    let phase = 0;
    const chartBox = (w, h) => {
      if (w < 560) return [40, 16, w - 54, h * 0.5 - 44];
      const x0 = Math.min(w * 0.42, 290) + 48; return [x0, 16, w - x0 - 14, h - 50];
    };
    return {
      perFrame: 1,
      params: [{ key: "strain", label: "biaxial stretch %", min: 0, max: 10, step: 10, value: 0 }],
      set(k, v) { p[k] = v; },
      reset() { phase = 0; },
      step() { phase += 0.04; },
      click(px, py, w, h) {
        const [bx, by, bw, bh] = chartBox(w, h), g = Math.floor((px - bx) / (bw / 4));
        if (py < by + bh + 24 && g >= 0 && g < 4) p.sel = g;
      },
      draw(ctx, w, h, col) {
        const d = D[p.sel], s = p.strain ? 1 : 0, narrow = w < 560;
        // sketch: water / starch / hydrophobic core / starch / water, side view
        const [cx0, sy, cw, sh] = narrow ? [8, h * 0.5 + 6, w - 16, h * 0.5 - 14] : [8, 24, Math.min(w * 0.42, 290) - 8, h - 48];
        const mid = sy + sh / 2, core = sh * 0.21 * d.r[s] / 2.2, starch = sh * 0.14;
        ctx.fillStyle = col.a; ctx.globalAlpha = 0.25;
        ctx.fillRect(cx0, mid - core - starch, cw, starch); ctx.fillRect(cx0, mid + core, cw, starch); ctx.globalAlpha = 1;
        ctx.fillStyle = col.b; ctx.globalAlpha = 0.22; ctx.fillRect(cx0, mid - core, cw, 2 * core); ctx.globalAlpha = 1;
        // interfaces, rougher where the paper found more roughness after stretching
        const amp = 2.5 * d.rough[s];
        ctx.strokeStyle = col.b; ctx.lineWidth = 1.5;
        for (const sgn of [-1, 1]) {
          ctx.beginPath();
          for (let k = 0; k <= 60; k++) { const xx = cx0 + cw * k / 60, yy = mid + sgn * core + amp * Math.sin(k * 0.9 + sgn * 2 + 0.3 * phase) * Math.sin(k * 0.37 + 1); k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
          ctx.stroke();
        }
        ctx.fillStyle = col.muted; ctx.font = "10px monospace";
        ctx.fillText("water", cx0 + 4, mid - core - starch - 6); ctx.fillText("starch", cx0 + 4, mid - core - 8);
        ctx.fillText("hydrophobic layer", cx0 + 4, mid + 4);
        // water molecules inside the layer, mostly close to the two interfaces
        const n = Math.round(d.w[s] * d.A * (s ? 1.21 : 1)), R = seeded(7 + p.sel);
        ctx.fillStyle = col.ink;
        for (let k = 0; k < n; k++) {
          const side = R() < 0.5 ? -1 : 1, depth = Math.pow(R(), 2.2) * core * 0.9;
          const xx = cx0 + 6 + R() * (cw - 12) + 1.5 * Math.sin(phase + k), yy = mid + side * (core - depth) + 1.2 * Math.cos(phase * 1.3 + k);
          dot(ctx, xx, yy, 2.3);
        }
        ctx.fillStyle = col.muted; ctx.textAlign = "right"; ctx.fillText(`${n} water molecules`, cx0 + cw - 4, mid + core + starch + 14); ctx.textAlign = "left";
        // bar chart of the published counts
        const cb = chartBox(w, h), [bx, by, bw, bh] = cb;
        const P = plotBox(ctx, cb, [0, 4], [0, 2.4], col, "", "");
        yTicks(ctx, P, bx, [0, 0.5, 1, 1.5, 2], col);
        ctx.fillStyle = col.muted; ctx.font = "10px monospace"; ctx.fillText("water / nm² in the layer", bx + 6, by + 8);
        const gw = bw / 4;
        D.forEach((q, g) => {
          for (let k = 0; k < 2; k++) {
            const x0 = bx + g * gw + gw * (0.18 + 0.34 * k), bwid = gw * 0.28;
            ctx.fillStyle = k ? col.b : col.a; ctx.globalAlpha = g === p.sel ? (k === s ? 1 : 0.55) : 0.25;
            ctx.fillRect(x0, P.Y(q.w[k]), bwid, P.Y(0) - P.Y(q.w[k]));
            ctx.globalAlpha = g === p.sel ? 1 : 0.4; ctx.strokeStyle = col.ink; ctx.lineWidth = 1; ctx.beginPath();
            ctx.moveTo(x0 + bwid / 2, P.Y(q.w[k] - q.e[k])); ctx.lineTo(x0 + bwid / 2, P.Y(q.w[k] + q.e[k])); ctx.stroke();
            ctx.globalAlpha = 1;
          }
          ctx.fillStyle = g === p.sel ? col.ink : col.muted; ctx.font = "10px monospace"; ctx.textAlign = "center";
          ctx.fillText(q.name.replace("-b-St", "").replace("P(", "").replace(")", ""), bx + (g + 0.5) * gw, by + bh + 14);
          ctx.textAlign = "left";
        });
        const lx = bx + bw - 96;
        ctx.fillStyle = col.a; ctx.fillRect(lx, by + 22, 8, 8); ctx.fillStyle = col.b; ctx.fillRect(lx + 48, by + 22, 8, 8);
        ctx.fillStyle = col.muted; ctx.fillText("0%", lx + 12, by + 30); ctx.fillText("10%", lx + 60, by + 30);
      },
      info() {
        const d = D[p.sel], s = p.strain ? 1 : 0;
        return `${d.name}, ${p.strain}% stretched: ${d.w[s].toFixed(2)} ± ${d.e[s].toFixed(2)} water/nm² in the hydrophobic layer, end-to-end ${d.r[s].toFixed(2)} nm`;
      }
    };
  }
};

// ---------------------------------------------------------------- M.Sc. papers: the shape memory cycle
// A free-standing piece of polymer network in 2D taken through the cycle of the papers:
// heat, stretch, hold, cool, unload, reheat. Brownian dynamics; the glass is a mobility that drops on cooling.
// an equilibrated starting shape of the network at the hot temperature (x y per bead), made with the same model
const SHAPE_START = `
-13.46 -7.74 -9.48 -9.51 -3.25 -7.02 0.43 -7.49 6.20 -10.19 9.90 -8.44 14.75 -7.40 -15.12 -2.62 -10.63 -4.48
-5.44 -0.78 -1.00 -2.27 5.10 -3.91 10.35 -2.29 17.06 -2.52 -17.15 3.50 -11.52 2.09 -5.49 4.74 -0.39 2.16 5.33
2.14 10.96 3.85 17.39 3.31 -15.61 8.49 -8.89 5.55 -6.41 9.49 -2.22 8.43 3.18 8.12 10.11 9.59 17.18 8.25 -12.75
-7.73 -12.66 -6.88 -11.85 -6.39 -11.84 -7.21 -11.85 -7.78 -11.68 -8.47 -11.30 -9.20 -11.38 -9.95 -10.38 -9.88
-14.18 -7.19 -14.94 -7.26 -15.00 -6.35 -16.03 -6.43 -16.50 -5.64 -16.91 -5.10 -16.61 -4.50 -15.82 -4.23 -15.70
-3.25 -8.35 -9.58 -7.76 -9.09 -7.52 -8.31 -6.61 -8.63 -6.71 -7.67 -5.92 -7.36 -5.75 -6.49 -4.76 -6.88 -4.05
-6.42 -10.03 -8.84 -9.59 -8.08 -8.66 -8.25 -8.74 -7.15 -9.11 -6.53 -8.62 -5.89 -8.66 -5.12 -9.48 -5.28 -10.05
-5.00 -3.53 -7.53 -3.45 -8.55 -3.24 -9.27 -2.44 -8.65 -2.40 -9.29 -1.57 -8.81 -0.96 -8.32 -0.14 -8.85 0.31 -8.19
-3.14 -6.21 -2.63 -5.68 -2.36 -4.71 -3.35 -4.71 -3.97 -4.59 -4.47 -4.02 -4.32 -2.95 -4.97 -2.39 -5.32 -1.50 1.17
-7.47 1.29 -8.22 1.92 -8.07 2.58 -8.53 3.26 -9.17 3.63 -10.02 4.19 -10.87 4.94 -11.08 5.37 -10.37 -0.13 -7.16
0.29 -6.48 0.06 -5.57 -0.58 -5.42 -1.01 -4.75 -1.09 -3.94 -1.28 -3.16 -1.89 -2.09 -1.45 -1.44 6.08 -11.27 5.82
-12.15 6.70 -11.99 7.46 -12.00 8.19 -11.55 8.66 -10.74 8.32 -10.04 8.66 -9.55 9.56 -9.27 6.18 -9.30 6.34 -8.51
6.80 -7.86 6.78 -7.25 6.62 -6.64 6.20 -5.94 5.63 -6.27 5.12 -5.47 5.34 -4.55 10.70 -8.60 11.53 -8.61 11.70 -9.34
12.32 -9.72 12.99 -9.80 13.72 -9.19 13.41 -8.45 13.94 -7.92 14.60 -8.04 9.54 -7.78 9.16 -7.08 9.89 -6.84 10.14
-6.11 10.65 -5.69 11.19 -5.18 11.46 -4.31 10.73 -4.20 10.43 -3.54 15.11 -6.77 16.02 -6.27 16.82 -6.09 17.36
-5.33 18.14 -5.01 17.82 -4.16 18.44 -3.56 18.11 -2.87 17.37 -3.35 -14.33 -2.42 -13.70 -2.91 -14.38 -3.35 -14.09
-4.26 -13.31 -4.45 -12.95 -5.26 -12.57 -5.03 -12.05 -5.47 -11.30 -5.31 -15.55 -1.87 -14.94 -1.37 -15.05 -0.63
-15.73 -0.43 -15.79 0.52 -16.73 0.70 -16.35 1.52 -17.17 1.92 -17.42 2.74 -9.97 -3.90 -9.16 -3.24 -8.46 -3.65
-7.99 -2.72 -8.01 -1.78 -7.18 -1.62 -7.08 -2.34 -6.30 -1.95 -6.27 -0.89 -11.07 -3.92 -11.21 -3.04 -11.97 -2.37
-11.45 -1.62 -11.01 -0.93 -11.53 -0.21 -11.92 0.43 -12.25 1.25 -12.39 1.88 -4.65 -0.35 -4.55 0.61 -3.63 0.85
-3.04 0.56 -2.46 -0.31 -2.25 -0.95 -2.88 -1.44 -2.80 -2.04 -2.24 -2.85 -5.83 0.05 -6.82 -0.05 -6.85 0.75 -6.15
0.96 -5.71 1.60 -5.66 2.42 -6.55 2.66 -6.49 3.47 -5.99 4.17 -0.36 -2.66 0.17 -2.53 0.94 -2.31 1.75 -2.30 2.37
-2.78 2.62 -3.65 3.11 -4.51 3.89 -4.29 4.44 -4.67 -0.26 -1.69 -0.56 -0.90 -1.04 -0.64 -1.34 -0.07 -0.41 0.17
0.33 0.10 0.67 0.65 0.21 1.19 -0.43 1.42 5.92 -3.65 5.87 -2.79 6.68 -2.48 6.78 -3.29 7.05 -3.87 7.67 -3.09 8.30
-2.70 8.80 -2.80 9.62 -2.45 4.75 -3.24 4.06 -2.62 4.58 -2.13 4.52 -1.38 5.27 -1.58 5.46 -0.81 5.98 -0.22 5.89
0.53 5.98 1.48 11.09 -2.38 11.79 -1.89 12.57 -2.28 12.95 -1.75 13.84 -2.14 14.30 -2.77 15.19 -2.71 15.53 -3.38
16.31 -3.07 10.70 -1.55 11.12 -0.84 11.87 -0.52 11.90 0.05 12.33 0.24 11.90 1.23 12.15 2.07 11.89 2.86 11.34
3.12 17.56 -1.93 16.76 -1.57 17.65 -0.99 18.53 -0.41 17.81 -0.07 17.59 0.91 16.52 0.61 16.76 1.45 16.89 2.39
-16.35 2.82 -15.65 2.29 -15.42 1.47 -14.67 1.84 -14.31 2.72 -13.81 3.24 -12.99 3.19 -12.57 2.79 -11.82 2.66
-16.57 4.00 -16.50 4.77 -16.66 5.32 -17.25 5.84 -17.55 6.81 -17.65 7.70 -16.70 7.32 -16.59 8.10 -16.35 8.91
-10.66 1.77 -10.17 2.10 -9.95 2.82 -9.25 2.34 -9.00 3.18 -8.05 3.76 -7.25 3.97 -7.33 4.77 -6.50 5.05 -11.34 1.11
-10.73 0.51 -9.77 0.90 -9.21 0.91 -8.73 1.44 -8.42 2.24 -8.15 2.87 -8.98 4.02 -9.04 4.81 -4.63 4.59 -4.11 3.81
-3.74 4.37 -2.96 4.47 -2.66 3.86 -2.11 3.54 -2.47 2.43 -1.98 1.90 -1.11 2.20 -5.61 5.55 -4.77 5.63 -4.12 6.03
-3.87 6.72 -4.82 6.61 -5.70 6.45 -6.47 7.16 -6.50 8.08 -6.74 8.73 0.25 2.64 0.81 2.18 1.11 2.89 1.81 3.28 2.75
3.16 3.49 2.78 3.76 1.94 3.83 1.36 4.84 1.46 -0.62 2.98 -0.16 3.41 -0.10 4.05 -0.12 4.82 -0.72 5.68 -0.79 6.43
-1.26 6.97 -2.26 6.87 -2.40 7.64 6.06 2.50 6.69 2.81 5.96 3.40 6.65 3.73 7.56 4.00 7.99 3.32 8.71 3.19 9.63 3.44
10.40 3.26 4.63 2.35 5.10 3.22 5.03 4.06 4.35 4.57 3.99 5.34 3.84 5.75 3.10 5.79 2.82 6.59 2.60 7.38 11.63 3.98
12.31 3.80 12.81 2.80 12.99 1.96 13.88 1.72 14.27 2.39 14.95 2.79 15.68 3.35 16.57 3.23 10.90 4.58 10.19 4.63
9.40 5.00 9.16 5.82 8.89 6.74 9.50 7.05 10.08 7.47 10.10 8.31 9.97 8.82 17.77 4.04 17.54 4.77 17.29 5.66 17.61
6.44 18.31 6.74 17.92 7.50 18.46 8.13 18.16 8.63 17.31 9.06 -14.91 8.27 -13.87 7.67 -13.15 7.76 -12.49 7.35
-11.85 6.80 -12.21 6.05 -11.31 5.79 -10.58 5.34 -9.78 5.33 -8.44 6.06 -9.08 6.57 -10.08 6.53 -9.78 7.37 -8.99
7.70 -8.80 8.57 -8.34 9.19 -7.83 9.43 -7.22 9.91 -6.23 10.18 -5.53 9.81 -5.30 10.55 -4.55 10.34 -3.76 10.62
-3.26 11.25 -2.41 11.04 -2.35 10.07 -2.48 9.16 -1.48 8.91 -1.11 8.17 -0.48 7.47 -0.25 8.03 0.39 8.20 1.11 8.27
1.57 9.20 2.30 9.38 2.64 8.91 3.76 7.42 4.40 8.06 4.92 7.59 5.73 7.98 6.63 8.55 7.29 8.07 8.02 8.47 8.98 8.62
9.25 9.26 10.89 9.16 11.81 8.95 12.27 8.24 12.70 7.43 13.53 7.08 14.16 7.66 15.19 7.22 15.48 8.07 16.12 8.60`;
DEMOS["rs-shape"] = {
  narrowAspect: "1 / 1",
  title: "A shape memory cycle",
  text: "A small piece of polymer network is heated, stretched by the two clamps, cooled while it is held, released, and heated again. When it is cold, the chains can hardly move, so the piece keeps its stretched shape (fixity). When it is hot, a stretched strand has far fewer shapes available than a coiled one, so entropy pulls the piece back (recovery). If you set the cold temperature close to the glass transition, the temporary shape slowly creeps away before the piece is heated again.",
  details: "A toy 2D model in reduced units, with 28 crosslinks joined by strands of 10 bonds, purely repulsive Lennard-Jones beads so that strands cannot cross, and Langevin dynamics. Cooling slows every motion by the same shift factor, a<sub>T</sub> = exp[&minus;2(1/T &minus; 1)], in the same way as all relaxation times of a polymer scale together near the glass transition. The dotted line marks motion 100 times slower than when hot. Fixity is R<sub>f</sub> = &epsilon;<sub>u</sub> / &epsilon;<sub>m</sub>, and recovery is R<sub>r</sub> = (&epsilon;<sub>m</sub> &minus; &epsilon;<sub>p</sub>) / &epsilon;<sub>m</sub>, as in the papers, which simulated atomistic PDLLA instead",
  make() {
    const NX = 7, NY = 4, A0 = 3.4, M = 9, dt = 0.006, KB = 60, B0 = 0.8, SIG2 = 0.85 * 0.85, TH = 1, EACT = 2, CELL = 1, GAMMA = 0.2;
    const PLAN = [["heat", 6], ["stretch", 10], ["hold", 3], ["cool", 10], ["unload", 12], ["reheat", 30]];
    const TG = 1 / (1 + Math.log(100) / EACT);
    const p = { Tlow: 0.2, strain: 50 };
    let n, x, y, vx, vy, fx, fy, nbr, bonds, node, gripL, gripR, held, gv, next, head;
    let stage, tStage, t, T, L0, Lm, Lu, Lp, hist, done;
    const build = () => {
      const X = [], Y = [], B = [], isNode = [];
      for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { X.push(i * A0); Y.push(j * A0); isNode.push(1); }
      // strands start as zigzags so the bonds begin near their rest length
      const strand = (a, b) => {
        const ux = (X[b] - X[a]) / A0, uy = (Y[b] - Y[a]) / A0, hz = 0.5 * Math.sqrt(Math.max(0, B0 * B0 - (A0 / (M + 1)) ** 2));
        let prev = a;
        for (let k = 1; k <= M; k++) {
          const f = k / (M + 1), off = k % 2 ? hz : -hz;
          X.push(X[a] + f * (X[b] - X[a]) - uy * off); Y.push(Y[a] + f * (Y[b] - Y[a]) + ux * off); isNode.push(0);
          B.push(prev, X.length - 1); prev = X.length - 1;
        }
        B.push(prev, b);
      };
      for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
        if (i < NX - 1) strand(j * NX + i, j * NX + i + 1);
        if (j < NY - 1) strand(j * NX + i, (j + 1) * NX + i);
      }
      n = X.length; x = Float64Array.from(X); y = Float64Array.from(Y); node = Uint8Array.from(isNode); bonds = B;
      const xy = SHAPE_START.trim().split(/\s+/).map(Number);
      if (xy.length === 2 * n) for (let i = 0; i < n; i++) { x[i] = xy[2 * i]; y[i] = xy[2 * i + 1]; }
      fx = new Float64Array(n); fy = new Float64Array(n); next = new Int32Array(n);
      vx = new Float64Array(n).map(() => gauss()); vy = new Float64Array(n).map(() => gauss());
      nbr = new Int32Array(4 * n).fill(-1);
      for (let k = 0; k < B.length; k += 2) for (const [a, b] of [[B[k], B[k + 1]], [B[k + 1], B[k]]]) { let s = 4 * a; while (nbr[s] >= 0) s++; nbr[s] = b; }
      gripL = []; gripR = [];
      for (let j = 0; j < NY; j++) { gripL.push(j * NX); gripR.push(j * NX + NX - 1); }
      held = new Uint8Array(n); gv = 0;
    };
    // repulsion (WCA, so strands cannot pass through each other) on a cell grid that covers the sample, plus the bonds
    const forces = () => {
      fx.fill(0); fy.fill(0);
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (let i = 0; i < n; i++) { x0 = Math.min(x0, x[i]); x1 = Math.max(x1, x[i]); y0 = Math.min(y0, y[i]); y1 = Math.max(y1, y[i]); }
      const ncx = Math.floor((x1 - x0) / CELL) + 1, ncy = Math.floor((y1 - y0) / CELL) + 1;
      if (!head || head.length < ncx * ncy) head = new Int32Array(ncx * ncy * 2);
      head.fill(-1, 0, ncx * ncy);
      for (let i = 0; i < n; i++) { const c = Math.floor((y[i] - y0) / CELL) * ncx + Math.floor((x[i] - x0) / CELL); next[i] = head[c]; head[c] = i; }
      for (let cy = 0; cy < ncy; cy++) for (let cx = 0; cx < ncx; cx++) {
        const c = cy * ncx + cx;
        for (let k = 0; k < 5; k++) {
          const qx = cx + (k === 1 || k === 4 ? 1 : k === 2 ? -1 : 0), qy = cy + (k >= 2 ? 1 : 0);
          if (qx < 0 || qx >= ncx || qy >= ncy) continue;
          const q = qy * ncx + qx;
          for (let i = head[c]; i >= 0; i = next[i]) {
            const xi = x[i], yi = y[i], s = 4 * i, n0 = nbr[s], n1 = nbr[s + 1], n2 = nbr[s + 2], n3 = nbr[s + 3];
            for (let j = q === c ? next[i] : head[q]; j >= 0; j = next[j]) {
              const dx = xi - x[j], dy = yi - y[j], r2 = dx * dx + dy * dy;
              if (r2 >= 1.2599 * SIG2 || j === n0 || j === n1 || j === n2 || j === n3) continue;
              const q2 = SIG2 / Math.max(r2, 0.5 * SIG2), q6 = q2 * q2 * q2, f = 24 * q6 * (2 * q6 - 1) / Math.max(r2, 0.5 * SIG2);
              fx[i] += f * dx; fy[i] += f * dy; fx[j] -= f * dx; fy[j] -= f * dy;
            }
          }
        }
      }
      for (let k = 0; k < bonds.length; k += 2) {
        const i = bonds[k], j = bonds[k + 1], dx = x[i] - x[j], dy = y[i] - y[j], r = Math.sqrt(dx * dx + dy * dy) || 1e-6, f = -KB * (r - B0) / r;
        fx[i] += f * dx; fy[i] += f * dy; fx[j] -= f * dx; fy[j] -= f * dy;
      }
    };
    const centroid = ids => { let a = 0, b = 0; for (const i of ids) { a += x[i]; b += y[i]; } return [a / ids.length, b / ids.length]; };
    const length = () => { const [a, b] = centroid(gripL), [c, d] = centroid(gripR); return Math.hypot(c - a, d - b); };
    const grip = (on, v) => { for (const i of gripL.concat(gripR)) held[i] = on; gv = v; };
    const strainNow = () => L0 ? (length() - L0) / L0 : 0;
    const advance = () => {
      const name = PLAN[stage][0];
      if (name === "heat") { L0 = length(); grip(1, (p.strain / 100) * L0 / 2 / PLAN[1][1]); }
      else if (name === "stretch") grip(1, 0);
      else if (name === "hold") Lm = length();
      else if (name === "cool") grip(0, 0);
      else if (name === "unload") Lu = length();
      else if (name === "reheat") { Lp = length(); done = true; }
      stage = Math.min(stage + 1, PLAN.length - 1); tStage = 0;
    };
    return {
      perFrame: 30,
      params: [
        { key: "Tlow", label: "cold temperature", min: 0.1, max: 0.8, step: 0.05, value: 0.2 },
        { key: "strain", label: "stretch %", min: 20, max: 80, step: 10, value: 50 }
      ],
      set(k, v) { p[k] = v; this.reset(); },
      reset() { build(); forces(); stage = 0; tStage = 0; t = 0; T = TH; L0 = Lm = Lu = Lp = 0; done = false; hist = []; },
      step() {
        if (done) return;
        const name = PLAN[stage][0], dur = PLAN[stage][1];
        T = name === "cool" ? TH + (p.Tlow - TH) * Math.min(1, tStage / dur) : name === "unload" ? p.Tlow
          : name === "reheat" ? p.Tlow + (TH - p.Tlow) * Math.min(1, tStage / 4) : TH;
        // the clock of the chains runs slower when cold; the clamps move in real time
        const h = dt * Math.exp(-EACT * (1 / T - 1 / TH)), c1 = Math.exp(-GAMMA * h), c2 = Math.sqrt((1 - c1 * c1) * T);
        for (let i = 0; i < n; i++) {
          if (held[i]) { x[i] += (gripL.includes(i) ? -gv : gv) * dt; continue; }
          vx[i] += 0.5 * h * fx[i]; vy[i] += 0.5 * h * fy[i];
          x[i] += h * vx[i]; y[i] += h * vy[i];
        }
        forces();
        for (let i = 0; i < n; i++) {
          if (held[i]) continue;
          vx[i] = c1 * (vx[i] + 0.5 * h * fx[i]) + c2 * gauss(); vy[i] = c1 * (vy[i] + 0.5 * h * fy[i]) + c2 * gauss();
        }
        t += dt; tStage += dt;
        if (Math.round(t / dt) % 50 === 0 && L0) hist.push([t, 100 * strainNow(), T]);
        if (tStage >= dur) advance();
      },
      results() {
        const em = (Lm - L0) / L0, eu = (Lu - L0) / L0, ep = (Lp - L0) / L0;
        return { rf: eu / em, rr: (em - ep) / em };
      },
      draw(ctx, w, h, col) {
        const total = PLAN.reduce((a, q) => a + q[1], 0);
        // the sample, centered on its middle
        const ph = h * 0.58, s = Math.min(w / 62, ph / 28);
        let cx = 0, cy = 0;
        for (let i = 0; i < n; i++) { cx += x[i] / n; cy += y[i] / n; }
        const X = v => w / 2 + (v - cx) * s, Y = v => ph / 2 + 6 - (v - cy) * s;
        if (held[gripL[0]]) {
          ctx.fillStyle = col.rule;
          for (const g of [gripL, gripR]) {
            let lo = 1e9, hi = -1e9, gx = 0;
            for (const i of g) { lo = Math.min(lo, y[i]); hi = Math.max(hi, y[i]); gx += x[i] / g.length; }
            ctx.fillRect(X(gx) - 0.7 * s, Y(hi) - 1.2 * s, 1.4 * s, (hi - lo + 2.4) * s);
          }
        }
        ctx.strokeStyle = col.ink; ctx.lineWidth = Math.max(1.4, s * 0.2); ctx.lineCap = "round"; ctx.beginPath();
        for (let k = 0; k < bonds.length; k += 2) { const i = bonds[k], j = bonds[k + 1]; ctx.moveTo(X(x[i]), Y(y[i])); ctx.lineTo(X(x[j]), Y(y[j])); }
        ctx.stroke(); ctx.lineCap = "butt";
        for (let i = 0; i < n; i++) { ctx.fillStyle = node[i] ? col.b : col.a; dot(ctx, X(x[i]), Y(y[i]), s * (node[i] ? 0.42 : 0.3)); }
        ctx.fillStyle = col.muted; ctx.font = "11px monospace";
        ctx.fillText(done ? "cycle done" : PLAN[stage][0], 8, 16);
        ctx.fillText(`T = ${T.toFixed(2)}`, 8, 31);
        // strain and temperature against time
        const P = plotBox(ctx, [40, ph + 22, w - 56, h - ph - 48], [0, total], [-15, 90], col, "time", "");
        yTicks(ctx, P, 40, [0, 25, 50, 75], col, v => v + "%");
        let tt = 0;
        ctx.font = "10px monospace"; ctx.textAlign = "center";
        for (const [nm, d] of PLAN) {
          ctx.fillStyle = PLAN[stage][0] === nm && !done ? col.ink : col.muted;
          if (w > 420 || d > 10) ctx.fillText(nm, P.X(tt + d / 2), ph + 16);
          if (tt) { ctx.fillStyle = col.rule; ctx.fillRect(P.X(tt), ph + 22, 1, h - ph - 48); }
          tt += d;
        }
        ctx.textAlign = "left";
        P.line([[0, -15 + 100 * TG], [total, -15 + 100 * TG]], col.muted, 1, [1, 3]);
        P.line(hist.map(q => [q[0], -15 + q[2] * 100]), col.b, 1.5, [4, 3]);
        P.line(hist.map(q => [q[0], q[1]]), col.a, 2);
        ctx.textAlign = "right"; ctx.font = "11px monospace";
        ctx.fillStyle = col.a; ctx.fillText("strain", w - 8, 16); ctx.fillStyle = col.b; ctx.fillText("temperature", w - 8, 31);
        ctx.textAlign = "left";
      },
      info() {
        if (!done) return `${PLAN[stage][0]}   strain ${(100 * strainNow()).toFixed(0)}%   T = ${T.toFixed(2)}`;
        const r = this.results();
        return `fixity ${(100 * r.rf).toFixed(0)}%   recovery ${(100 * r.rr).toFixed(0)}%   (cold T = ${p.Tlow})`;
      }
    };
  }
};

// ---------------------------------------------------------------- M.Sc. papers: shape memory numbers
// Two bar charts, fixity and recovery, for one set of published values. Clicking a group selects it.
function shapeMemoryBars(d) {
  const p = { sel: 1 };
  const boxes = (w, h) => w < 560
    ? [[44, 22, w - 58, h / 2 - 58], [44, h / 2 + 22, w - 58, h / 2 - 58]]
    : [[44, 22, w / 2 - 66, h - 64], [w / 2 + 34, 22, w / 2 - 48, h - 64]];
  const hasExp = d.xf.length > 0;
  return {
    perFrame: 1,
    reset() {},
    step() {},
    click(px, py, w, h) {
      for (const [bx, by, bw, bh] of boxes(w, h)) {
        if (px < bx || px > bx + bw || py < by || py > by + bh + 30) continue;
        p.sel = Math.max(0, Math.min(d.cats.length - 1, Math.floor((px - bx) / (bw / d.cats.length))));
      }
    },
    draw(ctx, w, h, col) {
      const nc = d.cats.length;
      [["fixity %", d.rf, d.xf], ["recovery %", d.rr, d.xr]].forEach(([name, md, ex], panel) => {
        const box = boxes(w, h)[panel], [bx, by, bw, bh] = box;
        const P = plotBox(ctx, box, [0, nc], [0, 100], col, "", "");
        yTicks(ctx, P, bx, [0, 25, 50, 75, 100], col);
        ctx.fillStyle = col.ink; ctx.font = "11px monospace"; ctx.fillText(name, bx + 4, by - 8);
        const gw = bw / nc;
        for (let g = 0; g < nc; g++) {
          const both = ex[g] != null, bwid = gw * (both ? 0.32 : 0.5), x0 = bx + g * gw + gw * (both ? 0.16 : 0.25);
          ctx.globalAlpha = g === p.sel ? 1 : 0.45;
          ctx.fillStyle = panel ? col.b : col.a; ctx.fillRect(x0, P.Y(md[g]), bwid, P.Y(0) - P.Y(md[g]));
          if (both) { ctx.strokeStyle = panel ? col.b : col.a; ctx.lineWidth = 1.5; ctx.strokeRect(x0 + bwid + 3, P.Y(ex[g]), bwid, P.Y(0) - P.Y(ex[g])); }
          ctx.globalAlpha = 1;
          ctx.fillStyle = g === p.sel ? col.ink : col.muted; ctx.font = "10px monospace"; ctx.textAlign = "center";
          const lab = d.cats[g].split(" ");
          ctx.fillText(lab[0], bx + (g + 0.5) * gw, by + bh + 13);
          if (lab[1]) ctx.fillText(lab[1], bx + (g + 0.5) * gw, by + bh + 25);
          ctx.textAlign = "left";
        }
      });
      if (hasExp) {
        const [bx, by, bw, bh] = boxes(w, h)[1], narrow = w < 560;
        ctx.fillStyle = col.muted; ctx.font = "10px monospace"; ctx.textAlign = "right";
        ctx.fillText("solid MD, outlined experiment", bx + bw, narrow ? by - 8 : by + bh + 40); ctx.textAlign = "left";
      }
    },
    info() {
      const g = p.sel, exp = d.xf[g] != null ? `, experiment ${d.xf[g]}% and ${d.xr[g]}%` : "";
      return `${(d.names || d.cats)[g]}: MD fixity ${d.rf[g]}%, recovery ${d.rr[g]}%${exp}`;
    }
  };
}

DEMOS["rs-sm2020"] = {
  still: true,
  narrowAspect: "4 / 5",
  title: "Fixity and recovery, simulated and measured",
  text: "PDLLA with 0 to 5 wt% graphene, where the same shape memory cycle was run in MD and measured in the lab. More graphene holds the temporary shape better. However, the recovery is best at 1 wt%, and it drops when there is more graphene or when the sheets clump together.",
  hint: "Click a pair of bars for the numbers.",
  details: "Published values from paper 7. Solid bars are MD, and outlined bars are experiments (DMA). Clumped means agglomerated graphene, which was simulated in MD only",
  make() {
    return shapeMemoryBars({ cats: ["0 wt%", "1 wt%", "3 wt%", "5 wt%", "3 clump", "5 clump"],
      names: ["0 wt%", "1 wt%", "3 wt%", "5 wt%", "3 wt% clumped", "5 wt% clumped"],
      rf: [92, 93, 98, 100, 94, 96], rr: [76, 80, 50, 50, 40, 32],
      xf: [92, 94, 97, 99, null, null], xr: [81, 84, 60, 55, null, null] });
  }
};

DEMOS["rs-sm2022"] = {
  still: true,
  narrowAspect: "4 / 5",
  title: "How surface groups change shape memory",
  text: "PDLLA with 1 wt% graphene, where the graphene surface carries different groups. Every treatment raises the fixity. Hydroxyl groups also help the recovery a little, while bulkier groups and grafted chains hold the polymer back, so it recovers less and more slowly.",
  hint: "Click a pair of bars for the numbers.",
  details: "Published MD values from paper 8, with groups at 5% coverage and grafted PDLLA chains at 0.011 per &Aring;&sup2;. Recovering 40% of the strain took 1.65 ns without treatment, 2.23 ns with CH<sub>3</sub>, 3.20 ns with NH<sub>2</sub>, and 6.18 ns with grafted chains (at 0.0076 per &Aring;&sup2;)",
  make() {
    return shapeMemoryBars({ cats: ["none", "OH", "CH3", "NH2", "grafted"],
      names: ["untreated", "hydroxyl (OH)", "methyl (CH3)", "amine (NH2)", "grafted chains"],
      rf: [93, 95, 98, 98, 100], rr: [80, 84, 72, 69, 39], xf: [], xr: [] });
  }
};

// ---------------------------------------------------------------- M.Sc. papers: graphene in PLA, shared sketch
// matrix chains as seeded random walks; disp(x, y) moves each bead (used to show what the pulled sheet drags along)
function sketchChains(ctx, box, nChains, len, seed, color, disp) {
  const [bx, by, bw, bh] = box, R = seeded(seed), step = Math.min(bw, bh) / 26;
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.6;
  for (let c = 0; c < nChains; c++) {
    let px = bx + R() * bw, py = by + R() * bh, ang = R() * 6.283;
    const pts = [];
    for (let k = 0; k < len; k++) {
      ang += (R() - 0.5) * 2.2;
      let nx = px + step * Math.cos(ang), ny = py + step * Math.sin(ang);
      // turn back at the walls of the box instead of running along them
      if (nx < bx || nx > bx + bw) { ang = Math.PI - ang; nx = px + step * Math.cos(ang); }
      if (ny < by || ny > by + bh) { ang = -ang; ny = py + step * Math.sin(ang); }
      px = nx; py = ny;
      pts.push(disp ? disp(px, py) : [px, py]);
    }
    ctx.beginPath(); pts.forEach(([a, b], k) => k ? ctx.lineTo(a, b) : ctx.moveTo(a, b)); ctx.stroke();
    for (const [a, b] of pts) dot(ctx, a, b, 1.9);
  }
}
// a graphene sheet seen edge-on, as a row of small beads
function sheetEdge(ctx, x0, x1, y, col) {
  ctx.strokeStyle = col.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
  ctx.fillStyle = col.ink;
  for (let x = x0; x <= x1; x += 6) dot(ctx, x, y, 2.2);
}

DEMOS["rs-pullout"] = {
  still: true,
  narrowAspect: "4 / 5",
  title: "Pulling treated graphene out of PLA",
  text: "Pick a surface treatment and watch the sheet being pulled out of the polymer. Small groups make the surface rough and catch on the chains. Grafted PLA chains reach into the polymer and drag it along, so more energy is needed to pull the sheet out. The bars show the published gains in interfacial fracture toughness over untreated graphene.",
  details: "Data from paper 5, from all-atom MD pull-out tests (CVFF for PLA, AIREBO for graphene, LAMMPS, 100 K, 0.001 &Aring;/fs). Untreated graphene has a shear strength of 110 MPa and a fracture toughness of 0.181 J/m&sup2;. The sketch is a drawing, not the simulation",
  make() {
    const C = [
      { name: "untreated", gain: 0, iss: "110 MPa", kind: "none" },
      { name: "CH3 5%", gain: 154, kind: "small", n: 10, size: 4 },
      { name: "NH2 5%", gain: 146, kind: "small", n: 10, size: 3 },
      { name: "OH 5%", gain: 120, kind: "small", n: 10, size: 2 },
      { name: "COOH 5%", gain: 237, iss: "+405%", kind: "small", n: 10, size: 4 },
      { name: "OH 10%", gain: 220, iss: "+368%", kind: "small", n: 20, size: 2 },
      { name: "PLA 0.0024", gain: 193, kind: "grafted", n: 2 },
      { name: "PLA 0.0072", gain: 271, iss: "+410%", kind: "grafted", n: 5 }
    ];
    const p = { c: 7 };
    let phase = 0;
    return {
      perFrame: 1,
      params: [{ key: "c", label: "surface treatment", min: 0, max: 7, step: 1, value: 7 }],
      set(k, v) { p[k] = v; },
      reset() { phase = 0; },
      step() { phase += 1 / 60; },
      draw(ctx, w, h, col) {
        const c = C[p.c], narrow = w < 560;
        const sk = narrow ? [10, 10, w - 20, h * 0.5 - 20] : [10, 10, w * 0.55 - 20, h - 20];
        const [sx, sy, sw, sh] = sk, mid = sy + sh / 2;
        // pulled distance cycles: pull, hold, back to the start
        const cyc = phase % 6, d = Math.min(1, cyc / 4) * sw * 0.3;
        const grip = c.kind === "none" ? 0.08 : c.kind === "small" ? 0.2 + 0.0012 * c.gain : 0.45;
        const disp = (x, y) => { const dist = Math.abs(y - mid); const over = x > sx + 0.12 * sw && x < sx + 0.75 * sw + d ? 1 : 0.3; return [x + d * grip * over * Math.exp(-dist / (sh * 0.12)), y]; };
        ctx.fillStyle = col.rule; ctx.fillRect(sx, sy, sw, 6); ctx.fillRect(sx, sy + sh - 6, sw, 6);
        sketchChains(ctx, [sx + 4, sy + 12, sw - 8, sh / 2 - 22], 16, 34, 101, col.muted, disp);
        sketchChains(ctx, [sx + 4, mid + 10, sw - 8, sh / 2 - 22], 16, 34, 202, col.muted, disp);
        const x0 = sx + 0.12 * sw + d, x1 = sx + 0.75 * sw + d;
        // groups or grafted chains on both faces, moving with the sheet
        const R = seeded(300 + p.c);
        if (c.kind === "small") {
          ctx.fillStyle = col.b;
          for (let k = 0; k < c.n; k++) {
            const gx = x0 + 6 + R() * (x1 - x0 - 12), side = k % 2 ? 1 : -1;
            for (let b = 0; b < c.size; b++) dot(ctx, gx + (b % 2 ? 3 : -3) * (b > 1 ? 1 : 0), mid + side * (5 + 4 * Math.min(b, 2)), b ? 2.2 : 2.8);
          }
        } else if (c.kind === "grafted") {
          for (let k = 0; k < c.n * 2; k++) {
            const gx = x0 + 10 + R() * (x1 - x0 - 20), side = k % 2 ? 1 : -1;
            const pts = [[gx, mid]];
            let ang = side * Math.PI / 2 + (R() - 0.5);
            for (let b = 0; b < 7; b++) { ang += (R() - 0.5) * 1.2; const [lx, ly] = pts[pts.length - 1]; pts.push([lx + 5.5 * Math.cos(ang) - (b > 3 ? d * 0.03 * b : 0), ly + 5.5 * Math.sin(ang)]); }
            ctx.strokeStyle = col.b; ctx.lineWidth = 2; ctx.beginPath(); pts.forEach(([a, b], q) => q ? ctx.lineTo(a, b) : ctx.moveTo(a, b)); ctx.stroke();
            ctx.fillStyle = col.b; for (const [a, b] of pts.slice(1)) dot(ctx, a, b, 2.4);
          }
        }
        sheetEdge(ctx, x0, x1, mid, col);
        ctx.strokeStyle = col.b; ctx.fillStyle = col.b; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x1 + 6, mid); ctx.lineTo(x1 + 26, mid); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x1 + 31, mid); ctx.lineTo(x1 + 24, mid - 4); ctx.lineTo(x1 + 24, mid + 4); ctx.fill();
        ctx.fillStyle = col.muted; ctx.font = "10px monospace"; ctx.fillText("graphene", x0, mid - 8);
        // bars: toughness gain
        const box = narrow ? [44, h * 0.5 + 24, w - 58, h * 0.5 - 70] : [w * 0.55 + 40, 24, w * 0.45 - 54, h - 76];
        const [bx, by, bw, bh] = box;
        const P = plotBox(ctx, box, [0, C.length], [0, 300], col, "", "");
        yTicks(ctx, P, bx, [0, 100, 200, 300], col, v => "+" + v + "%");
        ctx.fillStyle = col.ink; ctx.font = "11px monospace"; ctx.fillText("fracture toughness gain", bx + 4, by - 8);
        const gw = bw / C.length;
        C.forEach((q, g) => {
          ctx.globalAlpha = g === p.c ? 1 : 0.4;
          ctx.fillStyle = q.kind === "grafted" ? col.b : col.a;
          ctx.fillRect(bx + g * gw + gw * 0.2, P.Y(q.gain), gw * 0.6, P.Y(0) - P.Y(q.gain));
          ctx.globalAlpha = 1;
          ctx.save(); ctx.translate(bx + (g + 0.5) * gw + 3, by + bh + 6); ctx.rotate(-Math.PI / 4);
          ctx.fillStyle = g === p.c ? col.ink : col.muted; ctx.font = "10px monospace"; ctx.textAlign = "right"; ctx.fillText(q.name, 0, 0); ctx.restore();
        });
        ctx.textAlign = "left";
      },
      info() {
        const c = C[p.c];
        const extra = c.iss ? `, shear strength ${c.iss}` : "";
        return c.gain ? `${c.name}: fracture toughness +${c.gain}%${extra}` : `untreated graphene: shear strength 110 MPa, toughness 0.181 J/m²`;
      }
    };
  }
};

DEMOS["rs-pulloff"] = {
  still: true,
  narrowAspect: "4 / 5",
  title: "Pulling graphene off PLA",
  text: "The sheet is pulled straight off the polymer, while the far side of the polymer is held. With no or few grafted chains, the polymer itself tears and stays stuck to the sheet. With many grafted chains, the chains cover the sheet, and the polymer cannot touch it. Then, the two come apart cleanly at the interface with much less work. The chart shows the published interaction energy.",
  details: "Data from paper 6, from all-atom MD pull-off tests of PLLA on graphene with grafted PLLA chains of 6 monomers, at 100 K and 0.0001 &Aring;/fs, with the top 10% of the polymer held fixed. In a brush, the grafted chains stretch into the polymer, and in a mushroom, they lie flat on the sheet. The sketch is a drawing, not the simulation",
  make() {
    const C = [
      { name: "no grafting", gd: 0, dE: 719.9, fail: "polymer", say: "normal strength 421.5 MPa; the polymer tears, the interface holds" },
      { name: "0.002", gd: 0.002, dE: 822.5, fail: "polymer", say: "optimum: interaction +14%, normal strength 484.8 MPa, ductile" },
      { name: "0.004 mushroom", gd: 0.004, fail: "mixed", mush: 1, say: "past the optimum, adhesion starts to drop" },
      { name: "0.004 brush", gd: 0.004, fail: "polymer", brush: 1, say: "same chains stretched into the polymer: work of adhesion +90% over mushroom" },
      { name: "0.006", gd: 0.006, dE: 528.7, fail: "interface", mush: 1, say: "work of adhesion about 40% lower, brittle debonding at the interface" },
      { name: "0.008", gd: 0.008, dE: 515.8, fail: "interface", mush: 1, say: "work of adhesion about 40% lower, brittle debonding at the interface" },
      { name: "0.016 brush", gd: 0.016, fail: "interface", brush: 1, say: "dense brush, no contact left: work of adhesion 58% below no grafting" }
    ];
    const p = { c: 1 };
    let phase = 0;
    return {
      perFrame: 1,
      params: [{ key: "c", label: "grafted chains (per Å²)", min: 0, max: 6, step: 1, value: 1 }],
      set(k, v) { p[k] = v; },
      reset() { phase = 0; },
      step() { phase += 1 / 60; },
      draw(ctx, w, h, col) {
        const c = C[p.c], narrow = w < 560;
        const [sx, sy, sw, sh] = narrow ? [10, 10, w - 20, h * 0.5 - 16] : [10, 10, w * 0.55 - 20, h - 20];
        const cyc = phase % 6, d = Math.min(1, cyc / 4) * sh * 0.22;
        const base = sy + sh * 0.72, top = sy + 8;
        // where it breaks: inside the polymer a little above the sheet, or right at the interface (above the grafted layer)
        const graftH = c.brush ? sh * 0.16 : c.mush ? sh * 0.05 : 0;
        const crack = c.fail === "polymer" ? base - sh * 0.24 : base - graftH - 2;
        const open = c.fail === "mixed" ? 0.5 : 1;
        ctx.fillStyle = col.rule; ctx.fillRect(sx, top - 8, sw, 8);
        ctx.fillStyle = col.muted; ctx.font = "10px monospace"; ctx.fillText("polymer held here", sx + 4, top + 6);
        // polymer above the crack stays, polymer below it moves down with the sheet
        const disp = (x, y) => [x, y > crack ? y + d * open : y];
        sketchChains(ctx, [sx, top + 10, sw, base - top - 14 - graftH], 16, 34, 404, col.muted, disp);
        const R = seeded(500 + p.c), n = Math.round(c.gd * 2500);
        for (let k = 0; k < n; k++) {
          const gx = sx + 8 + (k + 0.5) / n * (sw - 16) + (R() - 0.5) * 6;
          const pts = [[gx, base + d]];
          let ang = c.brush ? -Math.PI / 2 : (R() < 0.5 ? -0.25 : -2.9);
          for (let b = 0; b < 6; b++) {
            ang += (R() - 0.5) * (c.brush ? 0.5 : 1.0);
            if (!c.brush) ang = Math.max(-2.95, Math.min(-0.15, ang));
            const [lx, ly] = pts[pts.length - 1], stepLen = c.brush ? graftH / 6 : 7;
            pts.push([lx + stepLen * Math.cos(ang), Math.max(base + d - graftH - 4, ly + stepLen * Math.sin(ang))]);
          }
          ctx.strokeStyle = col.b; ctx.lineWidth = 2; ctx.beginPath(); pts.forEach(([a, b], q) => q ? ctx.lineTo(a, b) : ctx.moveTo(a, b)); ctx.stroke();
          ctx.fillStyle = col.b; for (const [a, b] of pts.slice(1)) dot(ctx, a, b, 2.3);
        }
        sheetEdge(ctx, sx + 4, sx + sw - 4, base + d + 3, col);
        ctx.fillStyle = col.muted; ctx.fillText("graphene, pulled down", sx + 4, base + d + 18);
        if (d > 4) { ctx.fillStyle = col.b; ctx.fillText(c.fail === "polymer" ? "tears inside the polymer" : c.fail === "mixed" ? "partly at the interface" : "comes off at the interface", sx + sw - 170, crack + d * open / 2 + 4); }
        // chart: interaction energy against grafting density, where the paper gives it
        const box = narrow ? [52, h * 0.5 + 26, w - 66, h * 0.5 - 62] : [w * 0.55 + 48, 26, w * 0.45 - 62, h - 66];
        const [bx, by, bw, bh] = box;
        const P = plotBox(ctx, box, [0, 0.009], [0, 900], col, "", "");
        yTicks(ctx, P, bx, [0, 300, 600, 900], col);
        xTicks(ctx, P, by + bh, [0, 0.002, 0.004, 0.006, 0.008], col, v => v ? String(v).replace("0.", ".") : "0");
        ctx.fillStyle = col.ink; ctx.font = "11px monospace"; ctx.fillText("|interaction energy|, kcal/mol", bx + 4, by - 10);
        ctx.fillStyle = col.muted; ctx.font = "10px monospace"; ctx.textAlign = "right"; ctx.fillText("grafted chains per Å²", bx + bw, by + bh + 28); ctx.textAlign = "left";
        const pts = C.filter(q => q.dE).map(q => [q.gd, q.dE]);
        P.line(pts, col.a, 1.5); P.dots(pts, col.a, 4);
        if (c.dE) { ctx.strokeStyle = col.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(P.X(c.gd), P.Y(c.dE), 8, 0, 2 * Math.PI); ctx.stroke(); }
        else if (c.gd <= 0.009) { ctx.strokeStyle = col.muted; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(P.X(c.gd), by); ctx.lineTo(P.X(c.gd), by + bh); ctx.stroke(); ctx.setLineDash([]); }
      },
      info() { const c = C[p.c]; return `${c.name}: ${c.say}`; }
    };
  }
};

// ---------------------------------------------------------------- SAM paper (under review): what odd and even mean
DEMOS["rs-sam"] = {
  still: true,
  narrowAspect: "4 / 5",
  title: "Odd and even chains",
  text: "An alkylsilane chain grafted to silica, drawn in the all-trans form. Each carbon adds a bond that zigzags the other way, so the last bond of the chain flips between two directions as the chain grows by one carbon. This is where odd-even effects at a surface come from. The dots show the systems of the study, one dot per system.",
  details: "Geometry only, with a C-C-C angle of 112&deg; and the chain axis tilted from the surface normal by the tilt slider. Which parity points up depends on how the first bond leaves the surface. The study covers chain lengths 4 to 8 and eleven coverages from 0 to 3.9 chains/nm&sup2;, each dry and in water (all-atom MD, GROMACS). Its results are not shown while the paper is in review",
  make() {
    const p = { n: 7, tilt: 20 };
    const COV = [0, 0.08, 0.45, 0.77, 1.2, 1.65, 2, 2.4, 2.92, 3.45, 3.9];
    return {
      perFrame: 1,
      params: [
        { key: "n", label: "carbons", min: 4, max: 8, step: 1, value: 7 },
        { key: "tilt", label: "tilt (degrees)", min: 0, max: 40, step: 5, value: 20 }
      ],
      set(k, v) { p[k] = v; },
      reset() {},
      step() {},
      terminal() {
        const half = (180 - 112) / 2, dir = p.tilt + (p.n % 2 ? -half : half);
        return Math.abs(dir);
      },
      draw(ctx, w, h, col) {
        const narrow = w < 560, lw = narrow ? w : w * 0.5, ch = narrow ? h * 0.55 : h;
        // surface
        const gy = ch - 40;
        ctx.fillStyle = col.rule; ctx.fillRect(10, gy, lw - 20, 14);
        ctx.fillStyle = col.muted; ctx.font = "10px monospace"; ctx.fillText("hydroxylated silica", 14, gy + 26);
        for (let x = 24; x < lw - 20; x += 22) { ctx.fillStyle = col.muted; dot(ctx, x, gy - 3, 2.2); }
        // chain: Si then n carbons, bonds alternate +-34 degrees around the tilted axis
        const half = (180 - 112) / 2 * Math.PI / 180, axis = p.tilt * Math.PI / 180, L = Math.min(34, (ch - 80) / (p.n + 1) / 0.83);
        const pts = [[lw / 2 - 30, gy - 6]];
        for (let k = 1; k <= p.n; k++) {
          const a = axis + (k % 2 ? -half : half), [x0, y0] = pts[k - 1];
          pts.push([x0 + L * Math.sin(a), y0 - L * Math.cos(a)]);
        }
        ctx.lineCap = "round";
        for (let k = 1; k <= p.n; k++) {
          ctx.strokeStyle = k === p.n ? col.b : col.ink; ctx.lineWidth = k === p.n ? 5 : 3.5;
          ctx.beginPath(); ctx.moveTo(...pts[k - 1]); ctx.lineTo(...pts[k]); ctx.stroke();
        }
        ctx.lineCap = "butt";
        ctx.fillStyle = col.muted; dot(ctx, pts[0][0], pts[0][1], 7);
        ctx.fillStyle = col.ink; ctx.font = "9px monospace"; ctx.textAlign = "center"; ctx.fillText("Si", pts[0][0], pts[0][1] + 3);
        for (let k = 1; k <= p.n; k++) { ctx.fillStyle = col.a; dot(ctx, pts[k][0], pts[k][1], 6); }
        // surface normal and the angle of the last bond
        const [ex, ey] = pts[p.n];
        ctx.strokeStyle = col.muted; ctx.setLineDash([3, 3]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex, ey - 40); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = col.b; ctx.font = "11px monospace"; ctx.textAlign = "left";
        ctx.fillText(`last bond ${this.terminal().toFixed(0)}° from the normal`, 14, 18);
        ctx.fillStyle = col.muted; ctx.fillText(`${p.n % 2 ? "odd" : "even"} chain, C${p.n}`, 14, 34);
        // the study grid: chain length by coverage, dry and wet
        const gb = narrow ? [52, h * 0.55 + 22, w - 70, h * 0.45 - 70] : [w * 0.5 + 52, 30, w * 0.5 - 70, h - 90];
        const [bx, by, bw, bh] = gb;
        ctx.fillStyle = col.ink; ctx.font = "11px monospace"; ctx.fillText("the systems studied", bx - 40, by - 16);
        ctx.fillStyle = col.muted; ctx.font = "10px monospace"; ctx.textAlign = "right"; ctx.fillText("per nm²", bx - 8, by - 2); ctx.textAlign = "left";
        for (let L4 = 4; L4 <= 8; L4++) for (let k = 0; k < COV.length; k++) for (const wet of [0, 1]) {
          const cx = bx + (L4 - 4 + 0.5) / 5 * bw + (wet ? 6 : -6), cy = by + bh - (k + 0.5) / COV.length * bh;
          ctx.fillStyle = wet ? col.a : col.muted; ctx.globalAlpha = L4 === p.n ? 1 : 0.35;
          dot(ctx, cx, cy, 3.6);
        }
        ctx.globalAlpha = 1;
        ctx.font = "10px monospace"; ctx.fillStyle = col.muted; ctx.textAlign = "center";
        for (let L4 = 4; L4 <= 8; L4++) ctx.fillText(`C${L4}`, bx + (L4 - 3.5) / 5 * bw, by + bh + 14);
        ctx.textAlign = "right";
        for (const k of [0, 4, 7, 10]) ctx.fillText(String(COV[k]), bx - 12, by + bh - (k + 0.5) / COV.length * bh + 3);
        ctx.fillText("chain length", bx + bw, by + bh + 30);
        ctx.textAlign = "left";
        ctx.fillStyle = col.muted; dot(ctx, bx + 4, by + bh + 42, 3.6); ctx.fillText("dry", bx + 12, by + bh + 46);
        ctx.fillStyle = col.a; dot(ctx, bx + 52, by + bh + 42, 3.6); ctx.fillStyle = col.muted; ctx.fillText("in water", bx + 60, by + bh + 46);
      },
      info() { return `C${p.n} (${p.n % 2 ? "odd" : "even"}), tilt ${p.tilt}°: last C-C bond ${this.terminal().toFixed(0)}° from the surface normal`; }
    };
  }
};

// ---------------------------------------------------------------- the map at the top of the page
// Where each paper sits in system size and simulated time, on log axes. Positions are rough.
DEMOS["rs-map"] = {
  still: true,
  aspect: "3 / 2",
  narrowAspect: "4 / 5",
  title: "Length and time scales of my work",
  text: "Each gray oval is a family of methods, placed by the system sizes and times that it can reach. Each number is one paper on this page, placed where its simulations sit, and a dashed ring means that the paper is in review. Most of my work is all-atom MD at nanometers and nanoseconds. The coating papers use DPD to reach a whole film, and for the monolayer work, I used quantum chemistry to get the parameters of one bond.",
  details: "The positions are rough, after Fig. 3.1 of my thesis. In DPD, the size and time of a bead depend on how many molecules it stands for, so those two points could move by a factor of ten",
  make() {
    const PAPERS = [
      { n: "1", L: -7.25, t: -5.4, g: "c", say: "1, J. Colloid Interface Sci. 2023: DPD, a 40 x 40 x 40 box in bead diameters, a million steps" },
      { n: "2", L: -6.85, t: -4.75, g: "c", say: "2, Appl. Surf. Sci. 2023: the same DPD model with a hydrophobic polymer added" },
      { n: "3", L: -7.95, t: -7.0, g: "c", say: "3, Comput. Mater. Sci. 2025: all-atom MD, boxes of about 6 x 6 x 23 nm, 100 ns each" },
      { n: "4", L: -8.35, t: -7.45, g: "s", say: "4, in review: all-atom MD, 7.9 x 7.7 nm silica slabs, 100 ns per system" },
      { n: "5", L: -8.8, t: -9.45, g: "m", say: "5, Appl. Surf. Sci. 2020: all-atom MD, a graphene sheet pulled out of PLA" },
      { n: "6", L: -8.25, t: -9.9, g: "m", say: "6, Eur. Polym. J. 2021: all-atom MD, 3.4 x 5.4 x 3.8 nm, graphene pulled off PLLA" },
      { n: "7", L: -8.55, t: -8.5, g: "m", say: "7, Composites Part A 2020: all-atom MD shape memory cycles in a 4.7 nm box, next to lab tests" },
      { n: "8", L: -8.95, t: -8.0, g: "m", say: "8, Smart Mater. Struct. 2022: the same MD cycle with treated graphene" },
      { n: "QM", L: -9.45, t: -13.6, g: "q", say: "quantum chemistry (ORCA): the Si-C bond at the grafting point of paper 4, code on GitHub" }
    ];
    // ovals in decades: center (log length, log time) and half-widths
    const OVALS = [
      { name: "QM", c: [-9.45, -13.6], r: [0.55, 1.4], at: [-9.45, -14.6], align: "center" },
      { name: "all-atom MD", c: [-8.6, -10.8], r: [1.25, 4.6], at: [-9.62, -11.45] },
      { name: "CG and DPD", c: [-6.55, -6.0], r: [1.3, 3.6], at: [-7.35, -3.15] },
      { name: "continuum", c: [-4.6, -4.0], r: [1.8, 4.6], at: [-5.8, -0.9] }
    ];
    const XT = [[-10, "1 Å"], [-9, "1 nm"], [-8, "10 nm"], [-7, "0.1 µm"], [-6, "1 µm"], [-5, "10 µm"], [-4, "0.1 mm"]];
    const YT = [[-15, "1 fs"], [-12, "1 ps"], [-9, "1 ns"], [-6, "1 µs"], [-3, "1 ms"], [0, "1 s"]];
    let sel = -1;
    const layout = (w, h) => {
      const narrow = w < 560, ml = narrow ? 44 : 52, mt = narrow ? 44 : 34, mb = 38;
      const bx = ml, by = mt, bw = w - ml - 10, bh = h - mt - mb;
      return { narrow, bx, by, bw, bh, r: narrow ? 9 : w < 700 ? 10 : 11,
        X: v => bx + (v + 10) / 6 * bw, Y: v => by + bh - (v + 15) / 15 * bh };
    };
    return {
      perFrame: 1,
      reset() {},
      step() {},
      click(px, py, w, h) {
        const g = layout(w, h);
        sel = -1;
        PAPERS.forEach((p, k) => { if (Math.hypot(px - g.X(p.L), py - g.Y(p.t)) < g.r + 7) sel = k; });
      },
      draw(ctx, w, h, col) {
        const g = layout(w, h), { bx, by, bw, bh, X, Y, r } = g;
        const color = { c: col.b, s: col.a, m: col.ink, q: col.a };
        // grid and ticks
        ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.globalAlpha = 0.6;
        ctx.beginPath();
        for (const [v] of XT) { ctx.moveTo(X(v) + 0.5, by); ctx.lineTo(X(v) + 0.5, by + bh); }
        for (const [v] of YT) { ctx.moveTo(bx, Y(v) + 0.5); ctx.lineTo(bx + bw, Y(v) + 0.5); }
        ctx.stroke(); ctx.globalAlpha = 1;
        ctx.fillStyle = col.muted; ctx.font = "10px monospace"; ctx.textAlign = "center";
        XT.forEach(([v, s], k) => { if (!g.narrow || k % 2 === 0 || w > 420) ctx.fillText(s, Math.min(X(v), bx + bw - 18), by + bh + 14); });
        ctx.textAlign = "right";
        for (const [v, s] of YT) ctx.fillText(s, bx - 6, Y(v) + 3.5);
        ctx.fillText("system size", bx + bw, by + bh + 30);
        ctx.textAlign = "left";
        ctx.fillText("simulated time", bx + 6, by + 14);
        // method ovals, clipped to the plot
        ctx.save(); ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip();
        for (const o of OVALS) {
          ctx.beginPath();
          ctx.ellipse(X(o.c[0]), Y(o.c[1]), o.r[0] * bw / 6, o.r[1] * bh / 15, 0, 0, 2 * Math.PI);
          ctx.fillStyle = col.ink; ctx.globalAlpha = 0.05; ctx.fill();
          ctx.strokeStyle = col.muted; ctx.globalAlpha = 0.55; ctx.lineWidth = 1; ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = col.muted; ctx.font = "10px monospace";
        for (const o of OVALS) { ctx.textAlign = o.align || "left"; ctx.fillText(o.name, X(o.at[0]), Y(o.at[1])); }
        ctx.textAlign = "left";
        // the thesis outlook: hand DPD and MD results to continuum models
        const [ax, ay, ex, ey] = [X(-6.62) + 8, Y(-4.5) - 8, X(-5.55), Y(-2.9)];
        ctx.strokeStyle = col.muted; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]);
        const ang = Math.atan2(ey - ay, ex - ax);
        ctx.beginPath(); ctx.moveTo(ex, ey);
        ctx.lineTo(ex - 7 * Math.cos(ang - 0.45), ey - 7 * Math.sin(ang - 0.45));
        ctx.lineTo(ex - 7 * Math.cos(ang + 0.45), ey - 7 * Math.sin(ang + 0.45)); ctx.closePath();
        ctx.fillStyle = col.muted; ctx.fill();
        ctx.fillText("next", ex + 4, ey + 10);
        ctx.restore();
        // papers
        PAPERS.forEach((p, k) => {
          const x = X(p.L), y = Y(p.t), c = color[p.g], on = k === sel;
          if (p.g === "q") {
            ctx.beginPath(); ctx.moveTo(x, y - 7); ctx.lineTo(x + 7, y); ctx.lineTo(x, y + 7); ctx.lineTo(x - 7, y); ctx.closePath();
            ctx.fillStyle = on ? c : col.paper; ctx.fill(); ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = c; ctx.font = "10px monospace"; ctx.fillText("Si-C", x + 11, y + 3.5);
            return;
          }
          ctx.fillStyle = on ? c : col.paper; dot(ctx, x, y, r);
          ctx.strokeStyle = c; ctx.lineWidth = 2; if (p.n === "4") ctx.setLineDash([3, 2.4]);
          ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.stroke(); ctx.setLineDash([]);
          ctx.fillStyle = on ? col.paper : c; ctx.font = `bold ${r > 9 ? 11 : 10}px monospace`; ctx.textAlign = "center";
          ctx.fillText(p.n, x, y + 3.8); ctx.textAlign = "left";
        });
        // legend
        beadLegend(ctx, bx, g.narrow ? 14 : 18, w - 8, [[col.b, "coatings"], [col.a, "monolayers"], [col.ink, "graphene composites"]], col);
      },
      info() { return sel < 0 ? "click a number for what that paper simulated" : PAPERS[sel].say; }
    };
  }
};
