const API = ""; // same-origin (127.0.0.1)

let personId = localStorage.getItem("autus_person_id") || "";
let lastT = 0;

const pidEl = document.getElementById("pid");
const cuEl = document.getElementById("cu");
const tEl  = document.getElementById("t");

// E/F/R
const Efill = document.getElementById("Efill");
const Ffill = document.getElementById("Ffill");
const Rfill = document.getElementById("Rfill");
const Eval  = document.getElementById("Eval");
const Fval  = document.getElementById("Fval");
const Rval  = document.getElementById("Rval");

// Panel DP/OS/OR
const DPfill = document.getElementById("DPfill");
const OSfill = document.getElementById("OSfill");
const ORfill = document.getElementById("ORfill");
const DPnum  = document.getElementById("DPnum");
const OSnum  = document.getElementById("OSnum");
const ORnum  = document.getElementById("ORnum");
const DPtrend = document.getElementById("DPtrend");
const OStrend = document.getElementById("OStrend");
const ORtrend = document.getElementById("ORtrend");

// Preview subtitles
const holdSub  = document.getElementById("holdSub");
const pushSub  = document.getElementById("pushSub");
const driftSub = document.getElementById("driftSub");

// Layers
const layerSensory = document.getElementById("layerSensory");
const layerPhysics = document.getElementById("layerPhysics");
const layerFeedback = document.getElementById("layerFeedback");
const fbBody = document.getElementById("fbBody");

function arrow(t) {
  if (t === "UP") return "↑";
  if (t === "DOWN") return "↓";
  return "→";
}

function setMeta() {
  pidEl.textContent = `person: ${personId || "none"}`;
  tEl.textContent = `t: ${lastT}`;
}

async function api(path, opts) {
  const res = await fetch(`${API}${path}`, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

function setFill(el, v) {
  const pct = Math.max(0, Math.min(1, v)) * 100;
  el.style.width = `${pct.toFixed(1)}%`;
}

function setEFR(efr) {
  setFill(Efill, efr.E); setFill(Ffill, efr.F); setFill(Rfill, efr.R);
  Eval.textContent = efr.E.toFixed(3);
  Fval.textContent = efr.F.toFixed(3);
  Rval.textContent = efr.R.toFixed(3);
}

function setPanel(panel, trend) {
  setFill(DPfill, panel.DP); setFill(OSfill, panel.OS); setFill(ORfill, panel.OR);
  DPnum.textContent = panel.DP.toFixed(3);
  OSnum.textContent = panel.OS.toFixed(3);
  ORnum.textContent = panel.OR.toFixed(3);
  DPtrend.textContent = arrow(trend.DP);
  OStrend.textContent = arrow(trend.OS);
  ORtrend.textContent = arrow(trend.OR);
}

function setPreview(preview) {
  // "추천"이 아니라 "다음 상태의 E/F/R 변화" 표시
  const h = preview["HOLD"], p = preview["PUSH"], d = preview["DRIFT"];
  holdSub.textContent  = `E ${h.E.toFixed(2)} · F ${h.F.toFixed(2)} · R ${h.R.toFixed(2)}`;
  pushSub.textContent  = `E ${p.E.toFixed(2)} · F ${p.F.toFixed(2)} · R ${p.R.toFixed(2)}`;
  driftSub.textContent = `E ${d.E.toFixed(2)} · F ${d.F.toFixed(2)} · R ${d.R.toFixed(2)}`;
}

async function refreshAll() {
  if (!personId) {
    cuEl.textContent = "CU: 0";
    lastT = 0;
    setMeta();
    setEFR({E:0.5,F:0.5,R:0.5});
    setPanel({DP:0.5,OS:0.5,OR:0.5},{DP:"FLAT",OS:"FLAT",OR:"FLAT"});
    setPreview({
      HOLD:{E:0.5,F:0.5,R:0.5},
      PUSH:{E:0.5,F:0.5,R:0.5},
      DRIFT:{E:0.5,F:0.5,R:0.5},
    });
    return;
  }

  const cu = await api(`/person/${personId}/cu`);
  cuEl.textContent = `CU: ${Number(cu.balance || 0).toFixed(3)}`;

  const nft = await api(`/person/${personId}/nft/latest`);
  if (nft && nft.t) lastT = nft.t;

  const m = await api(`/person/${personId}/metrics`);
  setEFR(m.efr);
  setPanel(m.panel, m.trend);
  setPreview(m.preview);

  // Feedback layer content: minimal (no interpretation)
  fbBody.textContent = `ΔState/ε (local summary only)\nDP:${m.panel.DP.toFixed(3)} OS:${m.panel.OS.toFixed(3)} OR:${m.panel.OR.toFixed(3)}`;

  setMeta();
}

async function createPerson() {
  const data = await api("/person", { method: "POST" });
  personId = data.person_id;
  localStorage.setItem("autus_person_id", personId);
  lastT = 0;
  setMeta();
  await refreshAll();
}

async function step(action) {
  if (!personId) return;
  const body = { action, focus: 1.0, commit: 1.0, option_loss: 0.5 };
  const out = await api(`/person/${personId}/step`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  lastT = out.t;
  cuEl.textContent = `CU: ${Number(out.cu_balance || 0).toFixed(3)}`;
  setMeta();
  await refreshAll(); // update metrics+preview after state change
}

// Buttons
document.getElementById("create").addEventListener("click", () => createPerson());
document.getElementById("refresh").addEventListener("click", () => refreshAll());
document.getElementById("hold").addEventListener("click", () => step("HOLD"));
document.getElementById("push").addEventListener("click", () => step("PUSH"));
document.getElementById("drift").addEventListener("click", () => step("DRIFT"));

// Swipe gestures (one screen overlays)
const screen = document.getElementById("screen");
let x0 = null, y0 = null, t0 = null;

function hideAllLayers() {
  layerSensory.classList.remove("show");
  layerPhysics.classList.remove("show");
  layerFeedback.classList.remove("show");
}
function showLayer(which) {
  hideAllLayers();
  which.classList.add("show");
  // auto-hide after short time (no persistent page)
  setTimeout(() => which.classList.remove("show"), 900);
}

screen.addEventListener("touchstart", (e) => {
  const t = e.touches[0];
  x0 = t.clientX; y0 = t.clientY; t0 = Date.now();
}, {passive:true});

screen.addEventListener("touchend", (e) => {
  if (x0 === null || y0 === null) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - x0;
  const dy = t.clientY - y0;
  const dt = Date.now() - (t0 || Date.now());

  x0 = y0 = t0 = null;

  // require a clear gesture
  if (dt > 600) return;
  if (Math.abs(dx) < 40 && Math.abs(dy) < 40) return;

  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx < 0) showLayer(layerPhysics); // swipe left
  } else {
    if (dy < 0) showLayer(layerSensory); // swipe up
    else showLayer(layerFeedback);       // swipe down
  }
}, {passive:true});

// init
setMeta();
refreshAll().catch(() => {});







