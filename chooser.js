// Method chooser on the industry page. Pick a question and a size, and the answer comes from a small table.

const CHOOSER_Q = [
  ["why", "why something happens"],
  ["form", "what structure forms"],
  ["prop", "a number for a property"],
  ["rank", "which of many to test first"],
  ["param", "inputs for a bigger model"]
];
const CHOOSER_S = [
  ["atoms", "atoms and bonds, under 10 nm"],
  ["chains", "chains and assemblies, 10 to 100 nm"],
  ["films", "films, droplets, and parts above 100 nm"]
];
const chProject = n => [`project ${n}`, `projects.html#n${n}`];
const chPaper = n => [`paper ${n}`, `research.html#p${n}`];
const CHOOSER_A = {
  "why atoms": { m: "All-atom MD, with DFT where bonds form or break", get: "The interactions behind a trend, such as which groups touch, which hydrogen bonds form, how water orders at a surface, and how a molecule sits on it.", tools: "GROMACS, LAMMPS, OpenMM, ORCA", see: [chPaper(4), chPaper(3), ["analyzing trajectories", "learn-analysis.html"]] },
  "why chains": { m: "Coarse-grained MD or DPD", get: "How the chains arrange, and why one recipe orders while another does not, over times that all-atom runs cannot reach.", tools: "HOOMD-blue, LAMMPS, GROMACS with Martini", see: [chPaper(1), chPaper(2), ["DPD explained", "learn-dpd.html"]] },
  "why films": { m: "A continuum model fed with molecular numbers", get: "How a mechanism plays out across a whole film or part, for example a water front, the stress around a defect, or growing domains.", tools: "finite differences, spectral solvers, FEniCSx", see: [chProject(22), chProject(23), chProject(24)] },
  "form atoms": { m: "All-atom MD of the assembly", get: "The packing, tilt, thickness, density profiles, and defects of monolayers and other thin layers.", tools: "GROMACS, my builder apadana-v4, MDAnalysis", see: [chPaper(4), ["analysis tools", "analysis-tools.html"]] },
  "form chains": { m: "DPD or Martini over a range of compositions", get: "A map of which structure forms at each composition, such as films, micelles, lamellae, or islands, and where these structures break.", tools: "DPD in HOOMD-blue or LAMMPS, Martini 3 in GROMACS", see: [chPaper(1), chPaper(2), chProject(17)] },
  "form films": { m: "Phase-field and other field models", get: "Domain patterns and how they coarsen over hundreds of nanometers to microns.", tools: "spectral solvers in NumPy or PyTorch", see: [chProject(23), ["the chip figure above", "#chips"]] },
  "prop atoms": { m: "MD with free energy and transport methods", get: "Permeability, solubility, binding, diffusion, viscosity, and adhesion energy, each with an error bar.", tools: "umbrella sampling, alchemical methods, Green-Kubo", see: [chProject(31), chProject(18), chPaper(3)] },
  "prop chains": { m: "Calibrated coarse-grained models and virtual tests", get: "Trends in water uptake, cracking, pull-off strength, or stiffness across many recipes.", tools: "DPD, coarse-grained MD, deformation and pull-off runs", see: [chPaper(2), chPaper(6), chPaper(7)] },
  "prop films": { m: "Continuum models with molecular inputs", get: "How a whole coating works as a barrier, the stress around a defect, or the flow in a channel.", tools: "finite differences, FEniCSx, CFD", see: [chProject(22), chProject(24), chProject(25)] },
  "rank atoms": { m: "Automated MD or ML potentials, then ML on the results", get: "A ranked shortlist with error bars, so that the lab can start at the top of the list.", tools: "scripted Slurm campaigns, MACE, scikit-learn, PyTorch", see: [chProject(27), chProject(10), chProject(1)] },
  "rank chains": { m: "Coarse-grained runs plus a surrogate model", get: "The recipes worth testing first, picked by a model that learns from every new simulation.", tools: "DPD, Gaussian processes, Bayesian optimization", see: [chProject(13), ["the screening figure below", "#screen"]] },
  "rank films": { m: "Design of experiments with a surrogate model", get: "A smaller and better test plan for the lab, built from the data you already have.", tools: "DOE, Gaussian processes, statistics", see: [chProject(5), chProject(16)] },
  "param atoms": { m: "Force fields fitted to quantum chemistry, or ML potentials", get: "Parameters that reproduce your chemistry, checked against data before anything is built on them.", tools: "ORCA, PySCF, MACE, GAP", see: [["Si-C bond parameters", "https://github.com/Kourosh-h/Si-C_bond_parameterization_for_CHARMM"], ["Si-C force field checks", "https://github.com/Kourosh-h/Si-C_force_field_validation"], ["MACE for ethanol", "mlip.html"], chProject(32)] },
  "param chains": { m: "Coarse-graining from all-atom runs", get: "A coarse model that keeps the structure and thermodynamics that matter, for systems a hundred times larger.", tools: "Boltzmann inversion, force matching, chi parameters from MD", see: [chProject(12), chProject(13), ["coarse-graining explained", "learn-cg.html"]] },
  "param films": { m: "A bridge from MD to the continuum", get: "Diffusion coefficients, viscosities, and elastic constants passed from molecules to a continuum model, with a check of where this hand-off fails.", tools: "Green-Kubo, Einstein relations, FEM", see: [chProject(26), chProject(24)] }
};

if (document.getElementById("chooser")) {
  const box = document.getElementById("chooser");
  const group = (name, title, items, first) => `
    <fieldset><legend>${title}</legend><div class="opts">${items.map(([v, label]) => `
      <label><input type="radio" name="${name}" value="${v}"${v === first ? " checked" : ""}><span>${label}</span></label>`).join("")}
    </div></fieldset>`;
  box.innerHTML = `<div>${group("ch-q", "I want to know", CHOOSER_Q, "why")}${group("ch-s", "The size that matters", CHOOSER_S, "chains")}</div>
    <div class="answer" id="ch-a" aria-live="polite"></div>`;
  const show = () => {
    const q = box.querySelector("input[name=ch-q]:checked").value, s = box.querySelector("input[name=ch-s]:checked").value;
    const a = CHOOSER_A[`${q} ${s}`];
    box.querySelector("#ch-a").innerHTML = `
      <p class="lbl">start with</p>
      <h3>${a.m}</h3>
      <p>${a.get}</p>
      <p class="tools">${a.tools}</p>
      <p class="see">see ${a.see.map(([t, href]) => `<a href="${href}">${t}</a>`).join(", ")}</p>`;
  };
  box.addEventListener("change", show);
  show();
}
