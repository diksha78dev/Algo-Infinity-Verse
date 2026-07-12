/* ============================================================
   SLIDING WINDOW — Minimum Window Substring visualizer
   Algo Infinity Verse · pages/visualizers/sliding-window

   A generator function drives the pure algorithm logic, yielding
   one of three distinct phases per step — 'expand', 'valid', or
   'contract' — which a separate DOM driver consumes to animate an
   elastic window, dual pointers, and a live frequency-map
   dashboard. No backtracking: both pointers only ever move
   forward, giving true O(N) behaviour.
   ============================================================ */

/* ------------------------------------------------------------
   1. GENERATOR-DRIVEN ALGORITHM (pure — no DOM access)
   ------------------------------------------------------------
   Yields, in order:
     { type:'expand',   right, char, inWindow, windowCount, needCount, useful, formed, required }
     { type:'valid',    left, right, windowLen, isNewBest, bestLeft, bestRight, bestLen }
     { type:'contract', left, char, inWindow, windowCountAfter, needCount, reopened, formed, required }
     { type:'done',     found, bestLeft, bestRight, bestLen, rightMoves, leftMoves }
------------------------------------------------------------- */

function* minWindowGenerator(s, t) {
  const need = new Map();
  for (const c of t) need.set(c, (need.get(c) || 0) + 1);
  const required = need.size;

  const window = new Map();
  let formed = 0;
  let left = 0;
  let bestLen = Infinity, bestLeft = -1, bestRight = -1;
  let rightMoves = 0, leftMoves = 0;

  if (required === 0 || s.length === 0) {
    yield { type: "done", found: false, bestLeft: -1, bestRight: -1, bestLen: 0, rightMoves: 0, leftMoves: 0 };
    return;
  }

  for (let right = 0; right < s.length; right++) {
    const c = s[right];
    rightMoves++;
    const inWindow = need.has(c);
    const prevCount = window.get(c) || 0;
    const newCount = prevCount + 1;
    window.set(c, newCount);

    const needCount = need.get(c) || 0;
    const useful = inWindow && newCount <= needCount;
    if (inWindow && newCount === needCount) formed++;

    yield {
      type: "expand", right, char: c, inWindow,
      windowCount: newCount, needCount, useful, formed, required,
    };

    while (formed === required) {
      const windowLen = right - left + 1;
      let isNewBest = false;
      if (windowLen < bestLen) {
        bestLen = windowLen; bestLeft = left; bestRight = right; isNewBest = true;
      }

      yield { type: "valid", left, right, windowLen, isNewBest, bestLeft, bestRight, bestLen };

      const lc = s[left];
      const lcInWindow = need.has(lc);
      const lcNeedCount = need.get(lc) || 0;
      const lcCountBefore = window.get(lc) || 0;
      window.set(lc, lcCountBefore - 1);
      leftMoves++;

      const reopened = lcInWindow && lcCountBefore === lcNeedCount; // was exactly satisfied, now short by one
      if (lcInWindow && window.get(lc) < lcNeedCount) formed--;

      yield {
        type: "contract", left, char: lc, inWindow: lcInWindow,
        windowCountAfter: window.get(lc), needCount: lcNeedCount, reopened, formed, required,
      };

      left++;
    }
  }

  yield {
    type: "done",
    found: bestLeft !== -1,
    bestLeft, bestRight,
    bestLen: bestLen === Infinity ? 0 : bestLen,
    rightMoves, leftMoves,
  };
}

/* ------------------------------------------------------------
   2. STATE
------------------------------------------------------------- */

const el = (id) => document.getElementById(id);

const state = {
  s: "",
  t: "",
  need: new Map(),
  iterator: null,
  finished: false,
  playing: false,
  speedMs: 450,
  accumMs: 0,
  lastFrameTime: performance.now(),

  left: 0,
  right: -1,
  formed: 0,
  required: 0,
  rightMoves: 0,
  leftMoves: 0,
  bestLeft: -1,
  bestRight: -1,
  bestLen: Infinity,

  blockW: 45, // px, block width (42) + margin (3), kept in sync with CSS
};

/* ------------------------------------------------------------
   3. STRIP / DASHBOARD CONSTRUCTION
------------------------------------------------------------- */

function buildStrip(s) {
  const row = el("charRow");
  row.innerHTML = "";
  for (let i = 0; i < s.length; i++) {
    const block = document.createElement("div");
    block.className = "char-block";
    block.id = "block-" + i;
    block.innerHTML = `${escapeHtml(s[i])}<span class="idx">${i}</span>`;
    row.appendChild(block);
  }
  const stripWrap = el("stripWrap");
  stripWrap.style.width = (s.length * state.blockW) + "px";
}

function escapeHtml(ch) {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return map[ch] || ch;
}

function buildFreqDashboard(need) {
  const dash = el("freqDashboard");
  dash.innerHTML = "";
  for (const [ch, count] of need.entries()) {
    const row = document.createElement("div");
    row.className = "freq-row";
    row.id = "freq-" + ch.charCodeAt(0);
    row.dataset.char = ch;
    row.dataset.need = count;
    row.dataset.have = 0;

    let pips = "";
    for (let i = 0; i < count; i++) pips += `<span class="need-pip"></span>`;

    row.innerHTML = `
      <span class="char">${escapeHtml(ch)}</span>
      <span class="need-track">${pips}</span>
      <span class="remaining">${count}</span>
    `;
    dash.appendChild(row);
  }
}

function markNeedChars() {
  document.querySelectorAll(".char-block").forEach((b) => b.classList.remove("in-need"));
  for (let i = 0; i < state.s.length; i++) {
    if (state.need.has(state.s[i])) {
      const b = el("block-" + i);
      if (b) b.classList.add("in-need");
    }
  }
}

/* ------------------------------------------------------------
   4. VISUAL DRIVER — applies one generator step to the DOM
------------------------------------------------------------- */

function setPhase(phase) {
  const badge = el("phaseBadge");
  badge.className = "phase-badge phase-" + phase;
  const labels = { expand: "Expanding", valid: "Validating ✓", contract: "Contracting", done: "Done" };
  badge.textContent = labels[phase] || phase;
}

function updateElasticWindow() {
  const w = el("elasticWindow");
  if (state.right < state.left) {
    w.style.width = "0px";
    return;
  }
  const count = state.right - state.left + 1;
  w.style.transform = `translateX(${state.left * state.blockW}px)`;
  w.style.width = (count * state.blockW - 3) + "px";
}

function updatePointers() {
  const lp = el("leftPointer");
  const rp = el("rightPointer");
  lp.style.transform = `translateX(${state.left * state.blockW + state.blockW / 2 - 7}px)`;
  const rIdx = Math.max(state.right, 0);
  rp.style.transform = `translateX(${rIdx * state.blockW + state.blockW / 2 - 7}px)`;
  rp.style.opacity = state.right < 0 ? "0" : "1";
}

function updateBestMarker() {
  const marker = el("bestWindowMarker");
  if (state.bestLeft === -1) {
    marker.classList.remove("visible");
    return;
  }
  const count = state.bestRight - state.bestLeft + 1;
  marker.style.transform = `translateX(${state.bestLeft * state.blockW}px)`;
  marker.style.width = (count * state.blockW - 3) + "px";
  marker.classList.add("visible");
}

function updateChips() {
  el("chipWindow").textContent = `[${state.left}, ${state.right}]`;
  el("chipLen").textContent = state.right >= state.left ? String(state.right - state.left + 1) : "0";
  el("chipBest").textContent = state.bestLen === Infinity ? "∞" : String(state.bestLen);
  el("statFormed").textContent = `${state.formed} / ${state.required}`;
  el("statMoves").textContent = `${state.rightMoves} / ${state.leftMoves}`;
  el("cxRight").textContent = `${state.rightMoves} ≤ N (${state.s.length})`;
  el("cxLeft").textContent = `${state.leftMoves} ≤ N (${state.s.length})`;
}

function flashBlock(index, kind) {
  const b = el("block-" + index);
  if (!b) return;
  const cls = kind === "in" ? "pulse-in" : "pulse-out";
  b.classList.remove("pulse-in", "pulse-out");
  void b.offsetWidth; // restart animation
  b.classList.add(cls);
}

function flashWindowValid() {
  const w = el("elasticWindow");
  w.classList.remove("contracting");
  w.classList.add("flash-valid");
  setTimeout(() => w.classList.remove("flash-valid"), 320);
}

function markWindowContracting(on) {
  const w = el("elasticWindow");
  w.classList.toggle("contracting", on);
}

function updateFreqRow(ch, haveDelta, reopened) {
  const row = el("freq-" + ch.charCodeAt(0));
  if (!row) return;
  const need = parseInt(row.dataset.need, 10);
  let have = parseInt(row.dataset.have, 10) + haveDelta;
  have = Math.max(0, have);
  row.dataset.have = have;

  const remaining = Math.max(need - Math.min(have, need), 0);
  row.querySelector(".remaining").textContent = remaining;

  const pips = row.querySelectorAll(".need-pip");
  pips.forEach((pip, i) => pip.classList.toggle("filled", i < Math.min(have, need)));

  row.classList.toggle("satisfied", remaining === 0);
  if (reopened) {
    row.classList.remove("reopened");
    void row.offsetWidth;
    row.classList.add("reopened");
  }
}

function flyParticle(fromEl, toEl) {
  if (!fromEl || !toEl) return;
  const fromRect = fromEl.getBoundingClientRect();
  const toRect = toEl.getBoundingClientRect();
  const particle = document.createElement("div");
  particle.className = "particle";
  const startX = fromRect.left + fromRect.width / 2 - 4.5;
  const startY = fromRect.top + fromRect.height / 2 - 4.5;
  particle.style.left = startX + "px";
  particle.style.top = startY + "px";
  document.body.appendChild(particle);

  const dx = (toRect.left + 14) - startX;
  const dy = (toRect.top + toRect.height / 2 - 4.5) - startY;

  requestAnimationFrame(() => {
    particle.style.transform = `translate(${dx}px, ${dy}px) scale(0.4)`;
    particle.style.opacity = "0.15";
  });
  setTimeout(() => particle.remove(), 600);
}

/* ------------------------------------------------------------
   5. STEP APPLICATION
------------------------------------------------------------- */

function applyStep(step) {
  if (step.type === "expand") {
    state.right = step.right;
    state.formed = step.formed;
    state.required = step.required;
    state.rightMoves++;

    setPhase("expand");
    flashBlock(step.right, "in");
    updateElasticWindow();
    updatePointers();
    markWindowContracting(false);

    if (step.inWindow) {
      if (step.useful) {
        updateFreqRow(step.char, 1, false);
        const dashRow = el("freq-" + step.char.charCodeAt(0));
        flyParticle(el("block-" + step.right), dashRow);
      } else {
        updateFreqRow(step.char, 0, false); // overflow occurrence, no requirement change
      }
    }
    updateChips();
  }

  else if (step.type === "valid") {
    state.left = step.left;
    state.right = step.right;
    state.bestLeft = step.bestLeft;
    state.bestRight = step.bestRight;
    state.bestLen = step.bestLen;

    setPhase("valid");
    flashWindowValid();
    updateElasticWindow();
    if (step.isNewBest) updateBestMarker();
    updateChips();
  }

  else if (step.type === "contract") {
    setPhase("contract");
    markWindowContracting(true);
    flashBlock(step.left, "out");

    if (step.inWindow) {
      updateFreqRow(step.char, -1, step.reopened);
    }

    state.left = step.left + 1;
    state.formed = step.formed;
    state.leftMoves++;

    updateElasticWindow();
    updatePointers();
    updateChips();
  }

  else if (step.type === "done") {
    state.finished = true;
    state.playing = false;
    el("playBtn").textContent = "▶ Play";
    setPhase("done");

    if (step.found) {
      state.bestLeft = step.bestLeft;
      state.bestRight = step.bestRight;
      state.bestLen = step.bestLen;
      updateBestMarker();
      showResult(step);
    } else {
      showNoResult();
    }
    updateChips();
  }
}

function showResult(step) {
  const box = el("resultBox");
  box.classList.add("show");
  el("resultVal").textContent = state.s.substring(step.bestLeft, step.bestRight + 1);
  el("resultMeta").textContent =
    `indices [${step.bestLeft}, ${step.bestRight}] · length ${step.bestLen} · ` +
    `${step.rightMoves} right-moves + ${step.leftMoves} left-moves = O(N)`;
}

function showNoResult() {
  const box = el("resultBox");
  box.classList.add("show");
  el("resultVal").textContent = "No valid window";
  el("resultMeta").textContent = "Target string's characters never fully appear together in the source.";
}

/* ------------------------------------------------------------
   6. PLAYBACK CONTROL
------------------------------------------------------------- */

function stepOnce() {
  if (!state.iterator || state.finished) return;
  const { value, done } = state.iterator.next();
  if (done) return;
  applyStep(value);
}

function resetRun() {
  const sVal = el("sourceInput").value;
  const tVal = el("targetInput").value;
  const err = validateInputs(sVal, tVal);
  el("inputError").textContent = err || "";
  if (err) return false;

  state.s = sVal;
  state.t = tVal;
  state.need = new Map();
  for (const c of tVal) state.need.set(c, (state.need.get(c) || 0) + 1);

  state.iterator = minWindowGenerator(sVal, tVal);
  state.finished = false;
  state.playing = false;
  state.accumMs = 0;
  state.left = 0;
  state.right = -1;
  state.formed = 0;
  state.required = state.need.size;
  state.rightMoves = 0;
  state.leftMoves = 0;
  state.bestLeft = -1;
  state.bestRight = -1;
  state.bestLen = Infinity;

  el("playBtn").textContent = "▶ Play";
  el("resultBox").classList.remove("show");

  buildStrip(sVal);
  buildFreqDashboard(state.need);
  markNeedChars();
  updateElasticWindow();
  updatePointers();
  updateBestMarker();
  updateChips();
  setPhase("expand");
  return true;
}

function validateInputs(s, t) {
  if (!s || !s.trim()) return "Source string can't be empty.";
  if (!t || !t.trim()) return "Target string can't be empty.";
  if (s.length > 40) return "Keep the source string under 40 characters for a readable strip.";
  if (t.length > 12) return "Keep the target string under 12 characters.";
  return null;
}

/* ------------------------------------------------------------
   7. UI WIRING
------------------------------------------------------------- */

el("applyBtn").addEventListener("click", () => resetRun());
el("stepBackBtn").addEventListener("click", () => resetRun());
el("stepNextBtn").addEventListener("click", () => { state.playing = false; el("playBtn").textContent = "▶ Play"; stepOnce(); });

el("playBtn").addEventListener("click", () => {
  if (state.finished) { resetRun(); }
  state.playing = !state.playing;
  el("playBtn").textContent = state.playing ? "⏸ Pause" : "▶ Play";
});

el("pauseBtn").addEventListener("click", () => {
  state.playing = !state.playing;
  el("pauseBtn").textContent = state.playing ? "⏸" : "▶";
  el("playBtn").textContent = state.playing ? "⏸ Pause" : "▶ Play";
});

el("speedSlider").addEventListener("input", (e) => {
  state.speedMs = parseInt(e.target.value, 10);
  el("speedVal").textContent = `${state.speedMs}ms/step`;
});

[el("sourceInput"), el("targetInput")].forEach((input) => {
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") resetRun();
  });
});

window.addEventListener("resize", () => {
  updateElasticWindow();
  updatePointers();
  updateBestMarker();
});

/* ------------------------------------------------------------
   8. ANIMATION LOOP
------------------------------------------------------------- */

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = now - state.lastFrameTime;
  state.lastFrameTime = now;

  if (state.playing && !state.finished) {
    state.accumMs += dt;
    if (state.accumMs >= state.speedMs) {
      state.accumMs = 0;
      stepOnce();
    }
  }
}

/* ------------------------------------------------------------
   9. BOOT
------------------------------------------------------------- */

function boot() {
  el("speedVal").textContent = `${state.speedMs}ms/step`;
  resetRun();
  animate();

  requestAnimationFrame(() => {
    setTimeout(() => el("loadingVeil").classList.add("hidden"), 350);
  });
}

boot();
