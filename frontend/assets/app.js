const API_KEY="autus-secure-key-2024";
const pageEl=document.getElementById("page");
const footEl=document.getElementById("footStatus");

// History for charts
let entropyHistory = [];
let gravityHistory = [];
let pressureHistory = [];
const MAX_HISTORY = 60;

async function getJSON(p){const r=await fetch(p,{cache:"no-store"});return r.ok?await r.json():null;}
async function postJSON(p,b){return await fetch(p,{method:"POST",headers:{"Content-Type":"application/json","X-AUTUS-KEY":API_KEY},body:JSON.stringify(b)}).then(r=>r.json());}
function route(){return(location.hash||"#/instrument").replace("#","");}
function card(t,h){return "<section class=card><div class=h1>"+t+"</div>"+h+"</section>";}

// SVG Gauge Component
function gauge(id, value, max, label, color) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const angle = (pct / 100) * 180;
  const rad = (angle - 90) * Math.PI / 180;
  const x = 50 + 35 * Math.cos(rad);
  const y = 50 + 35 * Math.sin(rad);
  return `
    <div class="gauge-container">
      <svg viewBox="0 0 100 60" class="gauge-svg">
        <path d="M 15 50 A 35 35 0 0 1 85 50" fill="none" stroke="#222" stroke-width="8" stroke-linecap="round"/>
        <path d="M 15 50 A 35 35 0 0 1 85 50" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round" 
              stroke-dasharray="${pct * 1.1} 110" class="gauge-fill"/>
        <circle cx="${x}" cy="${y}" r="4" fill="${color}"/>
        <text x="50" y="45" text-anchor="middle" fill="#fff" font-size="12" font-weight="bold">${value.toFixed(2)}</text>
        <text x="50" y="58" text-anchor="middle" fill="#888" font-size="6">${label}</text>
      </svg>
    </div>
  `;
}

// Mini Chart Component
function miniChart(data, color, height = 40) {
  if (data.length < 2) return '<div class="mini-chart-empty">—</div>';
  const max = Math.max(...data, 0.01);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 100;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  return `
    <svg viewBox="0 0 ${w} ${height}" class="mini-chart">
      <polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5"/>
    </svg>
  `;
}

async function renderInstrument(){
  const s=await getJSON("/status");if(!s)return;
  const sig=s.signals,out=s.output;
  
  // Update history
  entropyHistory.push(sig.entropy);
  gravityHistory.push(sig.gravity);
  pressureHistory.push(sig.pressure);
  if(entropyHistory.length > MAX_HISTORY) entropyHistory.shift();
  if(gravityHistory.length > MAX_HISTORY) gravityHistory.shift();
  if(pressureHistory.length > MAX_HISTORY) pressureHistory.shift();
  
  const statusColor = out.status === 'GREEN' ? '#00ff88' : out.status === 'YELLOW' ? '#ffaa00' : '#ff4444';
  
  pageEl.innerHTML = card("INSTRUMENT", `
    <div class="instrument-grid">
      <div class="gauges-row">
        ${gauge('pressure', sig.pressure, 3, 'PRESSURE', '#ff6644')}
        ${gauge('release', sig.release, 3, 'RELEASE', '#00ff88')}
        ${gauge('decision', sig.decision, 1, 'DECISION', '#00d4ff')}
        ${gauge('entropy', sig.entropy, 1, 'ENTROPY', '#ffaa00')}
        ${gauge('gravity', sig.gravity, 1, 'GRAVITY', '#aa88ff')}
      </div>
      
      <div class="status-panel">
        <div class="status-main" style="color:${statusColor}">${out.status}</div>
        <div class="status-sub">FAILURE IN ${out.failure_in_ticks || '—'} TICKS</div>
        <div class="status-action">${out.bottleneck !== 'NONE' ? out.bottleneck : ''}</div>
      </div>
      
      <div class="charts-row">
        <div class="chart-box">
          <div class="chart-label">ENTROPY</div>
          ${miniChart(entropyHistory, '#ffaa00')}
        </div>
        <div class="chart-box">
          <div class="chart-label">GRAVITY</div>
          ${miniChart(gravityHistory, '#aa88ff')}
        </div>
        <div class="chart-box">
          <div class="chart-label">PRESSURE</div>
          ${miniChart(pressureHistory, '#ff6644')}
        </div>
      </div>
      
      <div class="execute-row">
        <button class="btn-execute ${out.status}" id="exBtn" ${out.status==='GREEN'?'disabled':''}>EXECUTE</button>
      </div>
    </div>
  `);
  
  document.getElementById("exBtn").onclick=async()=>{
    await postJSON("/execute",{action:"AUTO_STABILIZE",actor_id:"UI"});
    renderInstrument();
  };
  footEl.textContent="tick "+s.tick+" | cycle "+s.cycle;
}

async function renderAudit(){
  const a=await getJSON("/audit?n=30");
  const rows=a.tail.map(e=>`<tr><td>${new Date(e.ts*1000).toLocaleTimeString()}</td><td class="event-${e.event}">${e.event}</td><td>${e.actor_id||'-'}</td><td>${JSON.stringify(e.data)}</td></tr>`).join('');
  pageEl.innerHTML=card("AUDIT","<table><tr><th>TIME</th><th>EVENT</th><th>ACTOR</th><th>DATA</th></tr>"+rows+"</table><div class='btn-row'><button class='btn' onclick='window.print()'>EXPORT REPORT</button></div>");
  footEl.textContent="audit loaded";
}

async function renderAdmin(){
  const s=await getJSON("/status");
  pageEl.innerHTML=card("OPS ADMIN",`
    <div class="admin-grid">
      <div class="admin-box">
        <div class="k">KILL SWITCH</div>
        <button class="btn btn-danger" id="killBtn">DISABLE EXECUTE</button>
        <div class="admin-note">Emergency system shutdown</div>
      </div>
      <div class="admin-box">
        <div class="k">THRESHOLDS</div>
        <div class="threshold-row"><span>Entropy RED</span><span>0.70</span></div>
        <div class="threshold-row"><span>Entropy YELLOW</span><span>0.45</span></div>
        <div class="threshold-row"><span>Gravity LOW</span><span>0.30</span></div>
      </div>
      <div class="admin-box">
        <div class="k">API KEY</div>
        <div class="v" style="font-size:11px;opacity:.5">****-2024</div>
        <button class="btn">ROTATE KEY</button>
      </div>
      <div class="admin-box">
        <div class="k">SYSTEM</div>
        <div class="threshold-row"><span>Status</span><span class="status-${s.output.status}">${s.output.status}</span></div>
        <div class="threshold-row"><span>Tick</span><span>${s.tick}</span></div>
        <div class="threshold-row"><span>Cycle</span><span>${s.cycle}</span></div>
      </div>
    </div>
  `);
  footEl.textContent="admin ready";
}

async function renderActors(){
  const a=await getJSON("/actors?limit=20");
  const rows=a.actors.map(x=>`<tr class="${x.risk_score>0.5?'high-risk':''}"><td>${x.actor_id}</td><td>${x.total_pressure.toFixed(1)}</td><td>${x.total_release.toFixed(1)}</td><td>${x.total_decisions}</td><td class="risk-${x.risk_score>0.5?'high':'low'}">${x.risk_score.toFixed(2)}</td></tr>`).join('');
  pageEl.innerHTML=card("ACTORS","<table><tr><th>ID</th><th>PRESSURE</th><th>RELEASE</th><th>DECISIONS</th><th>RISK</th></tr>"+(rows||"<tr><td colspan=5>No actors</td></tr>")+"</table>");
  footEl.textContent=`${a.actors.length} actors loaded`;
}

async function renderPacks(){
  pageEl.innerHTML=card("PACKS",`
    <div class="packs-grid">
      <div class="pack-card active">
        <div class="pack-status">ACTIVE</div>
        <div class="pack-name">Philippines Export</div>
        <div class="pack-id">PH_EXPORT</div>
        <button class="btn">CONFIGURE</button>
      </div>
      <div class="pack-card">
        <div class="pack-status draft">DRAFT</div>
        <div class="pack-name">Education</div>
        <div class="pack-id">EDU</div>
        <button class="btn">ACTIVATE</button>
      </div>
      <div class="pack-card">
        <div class="pack-status draft">DRAFT</div>
        <div class="pack-name">Facility Management</div>
        <div class="pack-id">FACILITY</div>
        <button class="btn">ACTIVATE</button>
      </div>
    </div>
  `);
  footEl.textContent="packs loaded";
}

async function renderBilling(){
  pageEl.innerHTML=card("BILLING",`
    <div class="billing-grid">
      <div class="billing-box">
        <div class="k">SLA TEMPLATE</div>
        <div class="v">State Assurance</div>
        <div class="billing-detail">Scope: System stability guarantee</div>
        <div class="billing-detail">Deliverable: Proof Pack</div>
        <div class="billing-detail">Pricing: Outcome-based</div>
      </div>
      <div class="billing-box">
        <div class="k">CONTRACTS</div>
        <div class="v large">0</div>
        <button class="btn btn-primary">CREATE CONTRACT</button>
      </div>
      <div class="billing-box">
        <div class="k">PROOF PACKS</div>
        <div class="v large">0</div>
        <button class="btn">GENERATE</button>
      </div>
      <div class="billing-box">
        <div class="k">REVENUE</div>
        <div class="v large">$0</div>
        <div class="billing-detail">This month</div>
      </div>
    </div>
  `);
  footEl.textContent="billing ready";
}

async function render(){
  const r=route();
  document.querySelectorAll('.nav a').forEach(a=>a.classList.toggle('active',a.hash===location.hash));
  if(r==="/instrument")return renderInstrument();
  if(r==="/audit")return renderAudit();
  if(r==="/admin")return renderAdmin();
  if(r==="/actors")return renderActors();
  if(r==="/packs")return renderPacks();
  if(r==="/billing")return renderBilling();
  location.hash="#/instrument";
}

window.addEventListener("hashchange",render);
setInterval(()=>{if(route()==="/instrument")renderInstrument();},1000);
render();
