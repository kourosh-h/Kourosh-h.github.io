// Learn: drug discovery

DEMOS["dd-binding"] = {
  title: "Binding free energy and Kd",
  text: "Receptors bind and release a ligand. The binding free energy sets the dissociation constant, and the ligand concentration then decides how many receptors are occupied.",
  details: "T = 298 K, K<sub>d</sub> = exp(&Delta;G/RT) in mol/L, occupancy &theta; = [L]/([L] + K<sub>d</sub>). 60 receptors, each re-equilibrates with a small chance every frame",
  make() {
    const R = 60, RT = 0.5925;
    const p = { dG: -10, logL: -7 };
    let bound;
    const Kd = () => Math.exp(p.dG / RT);
    const theta = () => { const L = 10 ** p.logL; return L / (L + Kd()); };
    return {
      perFrame: 1,
      params: [
        { key: "dG", label: "ΔG bind (kcal/mol)", min: -15, max: -3, step: 0.1, value: -10 },
        { key: "logL", label: "log10 [ligand] (M)", min: -12, max: -2, step: 0.1, value: -7 }
      ],
      set(k, v) { p[k] = v; },
      reset() { bound = new Uint8Array(R); },
      step() { const th = theta(); for (let i = 0; i < R; i++) if (rand() < 0.04) bound[i] = rand() < th ? 1 : 0; },
      draw(ctx, w, h, col) {
        const bw = w * 0.4, nc = 10, cw = bw / nc, rows = R / nc, ch = (h - 20) / rows, r = Math.min(cw, ch) * 0.3;
        for (let i = 0; i < R; i++) {
          const cx = (i % nc + 0.5) * cw, cy = 10 + (Math.floor(i / nc) + 0.6) * ch;
          ctx.strokeStyle = col.a; ctx.lineWidth = 3; ctx.lineCap = "round";
          ctx.beginPath(); ctx.arc(cx, cy, r, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
          ctx.lineCap = "butt";
          if (bound[i]) { ctx.fillStyle = col.b; dot(ctx, cx, cy + r * 0.35, r * 0.55); }
        }
        const P = plotBox(ctx, [bw + 34, 14, w - bw - 46, h - 42], [-12, -2], [0, 1.05], col, "log10 [L]", "occupancy θ");
        const c = []; for (let k = 0; k <= 200; k++) { const lg = -12 + 10 * k / 200, L = 10 ** lg; c.push([lg, L / (L + Kd())]); }
        P.line(c, col.b, 2);
        const lk = Math.log10(Kd());
        if (lk > -12 && lk < -2) P.line([[lk, 0], [lk, 0.5]], col.muted, 1, [3, 4]);
        let nb = 0; for (let i = 0; i < R; i++) nb += bound[i];
        P.dots([[p.logL, nb / R]], col.ink, 5);
      },
      info() {
        const k = Kd(), unit = k < 1e-6 ? `${(k * 1e9).toPrecision(3)} nM` : k < 1e-3 ? `${(k * 1e6).toPrecision(3)} µM` : `${(k * 1e3).toPrecision(3)} mM`;
        return `Kd = ${unit}   θ = ${theta().toFixed(2)}   1.36 kcal/mol = 10x in Kd`;
      }
    };
  }
};

DEMOS["dd-screen"] = {
  title: "Virtual screening and enrichment",
  text: "A library of compounds with a few real binders, ranked by an imperfect score. The number of binders that end up at the top of the list depends on how good the score is.",
  details: "toy library of 3000 compounds, true pK<sub>d</sub> ~ N(5, 1), binders have pK<sub>d</sub> &gt; 7 (about 2%). Score = r &middot; truth + &radic;(1 &minus; r&sup2;) &middot; noise. EF = binders found in the top x% / binders expected at random",
  make() {
    const N = 3000;
    const p = { r: 0.5, top: 5 };
    let truth, noise, score, order, nAct;
    const rescore = () => {
      score = new Float64Array(N);
      for (let i = 0; i < N; i++) score[i] = p.r * (truth[i] - 5) + Math.sqrt(1 - p.r * p.r) * noise[i];
      order = [...score.keys()].sort((a, b) => score[b] - score[a]);
    };
    return {
      perFrame: 1,
      params: [
        { key: "r", label: "score quality r", min: 0, max: 1, step: 0.05, value: 0.5 },
        { key: "top", label: "test top x%", min: 0.5, max: 30, step: 0.5, value: 5 }
      ],
      set(k, v) { p[k] = v; rescore(); },
      reset() {
        truth = new Float64Array(N).map(() => 5 + gauss()); noise = new Float64Array(N).map(() => gauss());
        nAct = 0; for (const t of truth) if (t > 7) nAct++;
        rescore();
      },
      step() {},
      stats() {
        const n = Math.round(N * p.top / 100); let found = 0;
        for (let k = 0; k < n; k++) if (truth[order[k]] > 7) found++;
        return { n, found, ef: found / Math.max(1, nAct * n / N) };
      },
      draw(ctx, w, h, col) {
        const bw = w * 0.5;
        const sorted = Array.from(score).sort((a, b) => b - a), cut = sorted[Math.max(0, Math.round(N * p.top / 100) - 1)];
        const P = plotBox(ctx, [36, 14, bw - 46, h - 42], [-4, 4], [1.5, 9], col, "score", "true pKd");
        ctx.fillStyle = col.a; ctx.globalAlpha = 0.12;
        ctx.fillRect(P.X(cut), 14, P.X(4) - P.X(cut), h - 42); ctx.globalAlpha = 1;
        for (let i = 0; i < N; i++) {
          const act = truth[i] > 7;
          ctx.fillStyle = act ? col.b : col.muted; ctx.globalAlpha = act ? 1 : 0.35;
          dot(ctx, P.X(score[i]), P.Y(truth[i]), act ? 2.4 : 1.3);
        }
        ctx.globalAlpha = 1;
        P.hline(7, col.rule);
        // enrichment curve: fraction of binders found vs fraction of library tested
        const Q = plotBox(ctx, [bw + 30, 14, w - bw - 42, h - 42], [0, 100], [0, 1], col, "% of library tested", "binders found");
        const c = [[0, 0]]; let f = 0;
        for (let k = 0; k < N; k++) { if (truth[order[k]] > 7) f++; if (k % 15 === 0 || k === N - 1) c.push([100 * (k + 1) / N, f / nAct]); }
        Q.line([[0, 0], [100, 1]], col.muted, 1, [4, 4]);
        Q.line(c, col.b, 2);
        Q.line([[p.top, 0], [p.top, 1]], col.a, 1, [2, 3]);
      },
      info() {
        const s = this.stats();
        return `top ${p.top}%: ${s.found} of ${nAct} binders found   enrichment ${s.ef.toFixed(1)}`;
      }
    };
  }
};

DEMOS["dd-mpo"] = {
  title: "Potency is not enough",
  text: "Candidate molecules, plotted by potency and solubility. A greasier molecule often has a higher potency and a lower solubility, so the best candidates sit on a trade-off front.",
  hint: "Click a point to pick a candidate.",
  details: "toy set of 250 candidates, both properties driven by a hidden lipophilicity plus noise. Pareto front: no other candidate is better in both. Score = w &middot; pIC50 + (1 &minus; w) &middot; logS, both scaled 0 to 1",
  make() {
    const N = 250;
    const p = { w: 0.5, minS: -6 };
    let pot, sol, front, pick;
    return {
      perFrame: 1,
      params: [
        { key: "w", label: "weight on potency w", min: 0, max: 1, step: 0.05, value: 0.5 },
        { key: "minS", label: "minimum logS", min: -8, max: -2, step: 0.1, value: -6 }
      ],
      set(k, v) { p[k] = v; },
      reset() {
        pot = new Float64Array(N); sol = new Float64Array(N);
        for (let i = 0; i < N; i++) { const lip = rand() * 5; pot[i] = 5 + 0.6 * lip + 0.7 * gauss(); sol[i] = -1.5 - 1.1 * lip + 0.6 * gauss(); }
        front = [];
        for (let i = 0; i < N; i++) {
          let dom = false;
          for (let j = 0; j < N && !dom; j++) if (pot[j] >= pot[i] && sol[j] >= sol[i] && (pot[j] > pot[i] || sol[j] > sol[i])) dom = true;
          if (!dom) front.push(i);
        }
        front.sort((a, b) => pot[a] - pot[b]); pick = -1;
      },
      step() {},
      best() {
        let b = -1, bs = -Infinity;
        for (let i = 0; i < N; i++) {
          if (sol[i] < p.minS) continue;
          const s = p.w * (pot[i] - 4) / 6 + (1 - p.w) * (sol[i] + 9) / 8;
          if (s > bs) { bs = s; b = i; }
        }
        return b;
      },
      box(w, h) { return [44, 14, w - 60, h - 42]; },
      click(px, py, w, h) {
        const [bx, by, bwid, bh] = this.box(w, h);
        let b = -1, bd = 1e9;
        for (let i = 0; i < N; i++) {
          const X = bx + (pot[i] - 3) / 8 * bwid, Y = by + bh - (sol[i] + 10) / 11 * bh, d = (X - px) ** 2 + (Y - py) ** 2;
          if (d < bd) { bd = d; b = i; }
        }
        pick = bd < 400 ? b : -1;
      },
      draw(ctx, w, h, col) {
        const P = plotBox(ctx, this.box(w, h), [3, 11], [-10, 1], col, "potency pIC50", "solubility logS");
        ctx.fillStyle = col.rule; ctx.globalAlpha = 0.5;
        ctx.fillRect(P.X(3), P.Y(p.minS), P.X(11) - P.X(3), P.Y(-10) - P.Y(p.minS)); ctx.globalAlpha = 1;
        P.dots(Array.from(pot, (v, i) => [v, sol[i]]), col.a, 2.4);
        P.line(front.map(i => [pot[i], sol[i]]), col.b, 1.5);
        P.dots(front.map(i => [pot[i], sol[i]]), col.b, 3.5);
        const b = this.best();
        if (b >= 0) { ctx.strokeStyle = col.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(P.X(pot[b]), P.Y(sol[b]), 8, 0, 2 * Math.PI); ctx.stroke(); }
        if (pick >= 0) { ctx.strokeStyle = col.b; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(P.X(pot[pick]), P.Y(sol[pick]), 11, 0, 2 * Math.PI); ctx.stroke(); ctx.setLineDash([]); }
      },
      info() {
        const b = pick >= 0 ? pick : this.best();
        if (b < 0) return "no candidate passes the solubility limit";
        const onFront = front.includes(b) ? "on the front" : "not on the front";
        return `${pick >= 0 ? "picked" : "best score"}: pIC50 ${pot[b].toFixed(1)}, logS ${sol[b].toFixed(1)}, ${onFront} (${front.length} of ${N})`;
      }
    };
  }
};
