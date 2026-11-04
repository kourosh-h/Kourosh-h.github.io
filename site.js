// Fills in the parts of each page from data.js, then starts the demos.

const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const $ = id => document.getElementById(id);
const statusText = { "done": "done", "ready": "built, not on GitHub yet", "in-progress": "in progress", "planned": "planned" };
const page = location.pathname.split("/").pop() || "index.html";

// navigation and footer
const navItems = [["research.html", "research"], ["industry.html", "industry"], ["teaching.html", "teaching"], ["learn.html", "learn"], ["projects.html", "projects"], ["cv.html", "cv"], ["playground.html", "playground"]];
const phasePages = PHASES.map(ph => ph.page);
if ($("nav")) {
  $("nav").innerHTML = `<a class="home" href="index.html">Kourosh Hasheminejad</a>
    <ul>${navItems.map(([href, label]) => {
      const current = href === page || (label === "projects" && phasePages.includes(page)) || (label === "learn" && page.startsWith("learn-")) || (label === "playground" && page.startsWith("play-"));
      return `<li><a href="${href}"${current ? ' aria-current="page"' : ""}>${label}</a></li>`;
    }).join("")}</ul>`;
}
if ($("footer")) {
  const listOf = pairs => pairs.map(([href, label]) => `<li><a href="${href}">${label}</a></li>`).join("");
  $("footer").innerHTML = `
    <div><b>Kourosh Hasheminejad</b><p>Molecular simulation of materials. Most figures on this site are small simulations that run in your browser.</p></div>
    <nav aria-label="All pages"><ul>${listOf([["index.html", "home"], ...navItems])}</ul></nav>
    <ul>${listOf([[LINKS.github, "github"], [LINKS.linkedin, "linkedin"], [LINKS.scholar, "scholar"], [LINKS.orcid, "orcid"]])}</ul>`;
}

// a skip link for keyboard users, pointing at the first block after the navigation
const firstBlock = $("nav") && $("nav").nextElementSibling;
if (firstBlock) {
  if (!firstBlock.id) firstBlock.id = "main";
  firstBlock.tabIndex = -1;
  // the full address keeps the link on this page even when a <base> tag is set (as on the 404 page)
  document.body.insertAdjacentHTML("afterbegin", `<a class="skip" href="${location.href.split("#")[0]}#${firstBlock.id}">skip to content</a>`);
}
if ($("links")) {
  $("links").innerHTML = [["github", LINKS.github], ["linkedin", LINKS.linkedin], ["scholar", LINKS.scholar], ["orcid", LINKS.orcid], ["cv.pdf", LINKS.cv]]
    .map(([label, href]) => `<li><a href="${href}">${label}</a></li>`).join("");
}
document.querySelectorAll("a[data-link]").forEach(a => { a.href = LINKS[a.dataset.link]; });

// anchor for a project row: n13 for numbered projects, t3 or s5 for labeled ones, else the repository name
const projectId = p => p.n ? `n${p.n}` : p.label ? p.label.toLowerCase() : p.repo ? p.repo.split("/").pop() : "";
function projectRow(p) {
  return `
    <li class="row ${p.status}" id="${projectId(p)}">
      <span class="step">${p.label || (p.n ? String(p.n).padStart(2, "0") : "+")}</span>
      <i class="bead ${p.status}" title="${statusText[p.status]}"></i>
      <div>
        <h4>${esc(p.title)}</h4>
        <p>${esc(p.blurb)}</p>
        ${p.result ? `<p class="res">${esc(p.result)}</p>` : ""}
        <div class="tags">${p.tags.map(esc).join(" · ")}</div>
      </div>
      <div class="go">${p.status === "done" ? `${p.repo ? `<a href="${esc(p.repo)}">code</a>` : ""}${p.demo ? `<a href="${esc(p.demo)}">demo</a>` : ""}` : p.status === "ready" ? `<span class="soon">not pushed yet</span>` : ""}</div>
    </li>`;
}

// home: progress and list of phases
// the note that projects go up on GitHub one at a time, for a list with projects not there yet
const uploadNote = ps => UPLOAD_NOTE && ps.some(p => p.status !== "done")
  ? `<div class="upload" role="note"><p class="lbl">note</p><p>${esc(UPLOAD_NOTE)}</p></div>` : "";
if ($("beads")) {
  $("beads").insertAdjacentHTML("beforebegin", uploadNote(PROJECTS));
  $("beads").innerHTML = PROJECTS.map(p => `<i class="bead ${p.status}" title="${p.n ? p.n + ". " : ""}${esc(p.title)} (${statusText[p.status]})"></i>`).join("");
  const nDone = PROJECTS.filter(p => p.status === "done").length, nReady = PROJECTS.filter(p => p.status === "ready").length;
  $("progress").textContent = `${PROJECTS.length} projects · ${nReady} built · ${nDone} on GitHub`;
}
if ($("phases")) {
  $("phases").innerHTML = PHASES.map(ph => {
    const ps = PROJECTS.filter(p => p.phase === ph.name);
    const built = ps.filter(p => p.status === "done" || p.status === "ready").length, nums = ps.filter(p => p.n).map(p => p.n);
    const labels = ps.filter(p => p.label).map(p => p.label);
    const range = nums.length > 1 ? `${nums[0]}–${nums[nums.length - 1]}` : nums.length ? `${nums[0]}` : labels.length ? `${labels[0]}–${labels[labels.length - 1]}` : "";
    return `<li><a href="${ph.page}">${esc(ph.title || ph.name)}</a><p>${esc(ph.text)}</p><span class="count">${range ? range + " · " : ""}${built}/${ps.length} built</span></li>`;
  }).join("");
}
if ($("repos")) {
  // the lead entry (apadana) gets a box with its command-line example
  $("repos").innerHTML = RESEARCH_CODE.map(r => r.lead ? `
    <li class="lead"><p class="lbl">${esc(r.lead)}</p><a href="${r.url}">${esc(r.name)}</a><p>${esc(r.text)}</p>
      <pre><code>${esc(r.cli).split(" --").map((part, i) => `<span>${i ? "--" : ""}${part}</span>`).join(" ")}</code></pre><p class="cli">${esc(r.cliText)}</p></li>`
    : `<li><a href="${r.url}">${esc(r.name)}</a><p>${esc(r.text)}</p></li>`).join("");
}

// projects page: every project, grouped as on the phase pages, with a group filter and a search box
const groupId = ph => ph.page.replace(".html", "");
if ($("plist")) {
  $("plist").innerHTML = PHASES.map(ph => `
    <section class="pgroup" id="${groupId(ph)}" data-group="${groupId(ph)}">
      <div class="head"><h2>${esc(ph.title || ph.name)}</h2><p><a href="${ph.page}">page with a live demo</a></p></div>
      <p class="intro">${esc(ph.text)}</p>
      <ol class="log">${PROJECTS.filter(p => p.phase === ph.name).map(projectRow).join("")}</ol>
    </section>`).join("");
  $("pchips").innerHTML = [["all", "all"], ...PHASES.map(ph => [groupId(ph), ph.short || ph.name])]
    .map(([value, label], i) => `<label><input type="radio" name="pgroup" value="${value}"${i ? "" : " checked"}><span>${esc(label)}</span></label>`).join("");
  const filter = () => {
    const group = document.querySelector("input[name=pgroup]:checked").value;
    const words = $("psearch").value.toLowerCase().split(/\s+/).filter(Boolean);
    let shown = 0;
    for (const section of document.querySelectorAll(".pgroup")) {
      let n = 0;
      for (const row of section.querySelectorAll(".row")) {
        const text = row.textContent.toLowerCase();
        const ok = (group === "all" || section.dataset.group === group) && words.every(w => text.includes(w));
        row.hidden = !ok;
        if (ok) n++;
      }
      section.hidden = !n;
      shown += n;
    }
    $("pfound").textContent = shown === PROJECTS.length ? `showing all ${shown} projects` : `showing ${shown} of ${PROJECTS.length} projects`;
  };
  $("pchips").addEventListener("change", filter);
  $("psearch").addEventListener("input", filter);
  filter();
  // links such as projects.html#n13 or projects.html#continuum land on that row or group
  const target = location.hash && document.getElementById(location.hash.slice(1));
  if (target) {
    target.scrollIntoView();
    target.classList.add("hit");
  }
}

// phase pages
const phaseName = document.body.dataset.phase;
if (phaseName) {
  const i = PHASES.findIndex(ph => ph.name === phaseName), ph = PHASES[i];
  document.title = `${ph.title || ph.name} · Kourosh Hasheminejad`;
  $("phase-title").textContent = ph.title || ph.name;
  $("phase-text").textContent = ph.text;
  $("tabs").innerHTML = PHASES.map(q => `<li><a href="${q.page}"${q === ph ? ' aria-current="page"' : ""}>${esc(q.title || q.name)}</a></li>`).join("");
  $("phase-demo").dataset.demo = ph.demo;
  $("log").innerHTML = PROJECTS.filter(p => p.phase === phaseName).map(projectRow).join("");
  $("log").insertAdjacentHTML("beforebegin", uploadNote(PROJECTS.filter(p => p.phase === phaseName)));
  if ($("allp")) $("allp").href = `projects.html#${groupId(ph)}`;
  const prev = PHASES[i - 1], next = PHASES[i + 1];
  $("pager").innerHTML = `<span>${prev ? `<a href="${prev.page}">&larr; ${esc(prev.title || prev.name)}</a>` : ""}</span>
    <span>${next ? `<a href="${next.page}">${esc(next.title || next.name)} &rarr;</a>` : `<a href="playground.html">playground &rarr;</a>`}</span>`;
}

// learn pages
if ($("learn-list")) {
  $("learn-list").innerHTML = LEARN_TRACKS.map((t, i) => `
    <div class="track">
      <h3><span>${i + 1}</span>${esc(t.name)}</h3>
      <p>${esc(t.text)}</p>
      <ul class="phases">${LEARN.filter(l => l.track === t.name).map(l => `<li><a href="${l.page}">${esc(l.title)}</a><p>${esc(l.text)}</p><span class="count"></span></li>`).join("")}</ul>
    </div>`).join("");
}
if (document.body.dataset.learn) {
  const i = LEARN.findIndex(l => l.page === document.body.dataset.learn);
  const prev = LEARN[i - 1], next = LEARN[i + 1];
  if ($("pager")) $("pager").innerHTML = `<span>${prev ? `<a href="${prev.page}">&larr; ${esc(prev.title)}</a>` : `<a href="learn.html">&larr; all topics</a>`}</span>
    <span>${next ? `<a href="${next.page}">${esc(next.title)} &rarr;</a>` : `<a href="learn.html">all topics &rarr;</a>`}</span>`;
  if ($("toc")) $("toc").innerHTML = [...document.querySelectorAll(".lesson h2")].map(h2 => `<li><a href="#${h2.parentElement.parentElement.id}">${h2.textContent}</a></li>`).join("");
}

// research page: the full list of papers, each linked to its explanation above
if ($("refs")) {
  $("refs").innerHTML = PUBLICATIONS.slice().sort((a, b) => b.year - a.year).map(p => {
    // a paper in review has nothing to link to yet
    const href = p.doi ? `https://doi.org/${p.doi}` : p.type === "review" ? "" : `https://scholar.google.com/scholar?q=${encodeURIComponent(p.title)}`;
    const no = p.page ? `<span class="ring ${p.grp}">${p.page.slice(1)}</span>` : "";
    return `<li>${no}<div>
      <div class="t">${href ? `<a href="${href}">${esc(p.title)}</a>` : esc(p.title)}</div>
      <div class="v">${esc(p.authors).replace(esc(ME), `<span class="me">${esc(ME)}</span>`)}. <i>${esc(p.venue)}</i> (${p.year}).${p.type === "review" ? ` <span class="st">in review</span>` : ""}${p.page ? ` <a class="see" href="#${p.page}">explained above</a>` : ""}</div>
    </div></li>`;
  }).join("");
}
if ($("talks")) {
  $("talks").innerHTML = TALKS.map(t => `<div class="item"><span class="w">${t.year} · ${t.kind.toLowerCase()}</span><div><b>${esc(t.title)}</b><div class="n">${esc(t.event)}</div></div></div>`).join("");
}

// CV page
const cvList = items => items.map(x => `
  <div class="item"><span class="w">${esc(x.when)}</span>
  <div><b>${esc(x.what)}</b><br>${esc(x.where)}${x.note ? `<div class="n">${esc(x.note)}</div>` : ""}</div></div>`).join("");
const pairList = items => items.map(([k, v]) => `<div class="item"><span class="w">${esc(k)}</span><div>${esc(v)}</div></div>`).join("");
if ($("edu")) $("edu").innerHTML = cvList(EDUCATION);
if ($("exp")) $("exp").innerHTML = cvList(EXPERIENCE);
if ($("skills")) $("skills").innerHTML = pairList(SKILLS);
if ($("teaching")) $("teaching").innerHTML = pairList(TEACHING);
if ($("cvpdf")) $("cvpdf").href = LINKS.cv;

if (typeof mountAllDemos === "function") mountAllDemos();
