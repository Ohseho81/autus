const API_KEY="autus-secure-key-2024";
const pageEl=document.getElementById("page");
const footEl=document.getElementById("footStatus");

let entropyHistory=[], gravityHistory=[], pressureHistory=[];
const MAX_HISTORY=60;

async function getJSON(p){const r=await fetch(p,{cache:"no-store"});return r.ok?await r.json():null;}
async function postJSON(p,b){return await fetch(p,{method:"POST",headers:{"Content-Type":"application/json","X-AUTUS-KEY":API_KEY},body:JSON.stringify(b)}).then(r=>r.json());}
function route(){return(location.hash||"#/instrument").replace("#","");}
function card(t,h){return "<section class=card><div class=h1>"+t+"</div>"+h+"</section>";}

function calcBeacon(sig,out){
  const e=sig.entropy,p=sig.pressure,f=out.failure_in_ticks;
  if(e>0.4||(f&&f<5))return{state:'RED',icon:'■',msg:'EXECUTE BLOCKED',action:'disabled'};
  if(p<0.2||p>0.6||e>0.25)return{state:'YELLOW',icon:'▲',msg:'CAUTION REQUIRED',action:'longpress'};
  return{state:'GREEN',icon:'●',msg:'SAFE TO EXECUTE',action:'enabled'};
}

function miniChart(data,color,h=40){
  if(data.length<2)return'<div class="mini-chart-empty">—</div>';
  const max=Math.max(...data,0.01),min=Math.min(...data,0),range=max-min||1,w=100;
  const pts=data.map((v,i)=>`${(i/(data.length-1))*w},${h-((v-min)/range)*(h-4)-2}`).join(' ');
  return`<svg viewBox="0 0 ${w} ${h}" class="mini-chart"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5"/></svg>`;
}

async function renderInstrument(){
  const s=await getJSON("/status");if(!s)return;
  const sig=s.signals,out=s.output;
  entropyHistory.push(sig.entropy);gravityHistory.push(sig.gravity);pressureHistory.push(sig.pressure);
  if(entropyHistory.length>MAX_HISTORY)entropyHistory.shift();
  if(gravityHistory.length>MAX_HISTORY)gravityHistory.shift();
  if(pressureHistory.length>MAX_HISTORY)pressureHistory.shift();
  
  const b=calcBeacon(sig,out);
  pageEl.innerHTML=`
    <section class="card beacon-card">
      <div class="beacon-zone beacon-${b.state}">
        <div class="beacon-icon">${b.icon}</div>
        <div class="beacon-state">${b.state}</div>
        <div class="beacon-msg">${b.msg}</div>
      </div>
      <div class="execute-zone">
        <button class="btn-execute btn-${b.state}" id="exBtn" ${b.action==='disabled'?'disabled':''} data-action="${b.action}">
          ${b.action==='disabled'?'BLOCKED':b.action==='longpress'?'HOLD TO EXECUTE':'EXECUTE'}
        </button>
        ${b.state==='RED'?`<div class="block-reason">Entropy: ${sig.entropy.toFixed(3)} | Failure: ${out.failure_in_ticks||'N/A'}</div>`:''}
      </div>
      <details class="instrument-details">
        <summary>INSTRUMENT PANEL</summary>
        <div class="gauges-mini">
          <div class="gauge-item"><span class="gauge-label">PRESSURE</span><span class="gauge-val">${sig.pressure.toFixed(2)}</span></div>
          <div class="gauge-item"><span class="gauge-label">RELEASE</span><span class="gauge-val">${sig.release.toFixed(2)}</span></div>
          <div class="gauge-item"><span class="gauge-label">DECISION</span><span class="gauge-val">${sig.decision.toFixed(2)}</span></div>
          <div class="gauge-item"><span class="gauge-label">ENTROPY</span><span class="gauge-val">${sig.entropy.toFixed(3)}</span></div>
          <div class="gauge-item"><span class="gauge-label">GRAVITY</span><span class="gauge-val">${sig.gravity.toFixed(3)}</span></div>
        </div>
        <div class="charts-row">
          <div class="chart-box"><div class="chart-label">ENTROPY</div>${miniChart(entropyHistory,'#ffaa00')}</div>
          <div class="chart-box"><div class="chart-label">GRAVITY</div>${miniChart(gravityHistory,'#aa88ff')}</div>
          <div class="chart-box"><div class="chart-label">PRESSURE</div>${miniChart(pressureHistory,'#ff6644')}</div>
        </div>
        <div class="status-detail">
          <span>Status: <strong class="status-${out.status}">${out.status}</strong></span>
          <span>Bottleneck: ${out.bottleneck}</span>
          <span>Failure: ${out.failure_in_ticks||'—'} ticks</span>
        </div>
      </details>
    </section>`;
  
  const btn=document.getElementById("exBtn");
  if(b.action==='longpress'){
    let t;
    btn.onmousedown=()=>{t=setTimeout(async()=>{await postJSON("/execute",{action:"AUTO_STABILIZE",actor_id:"UI"});renderInstrument();},1000);};
    btn.onmouseup=()=>clearTimeout(t);
    btn.onmouseleave=()=>clearTimeout(t);
  }else if(b.action==='enabled'){
    btn.onclick=async()=>{await postJSON("/execute",{action:"AUTO_STABILIZE",actor_id:"UI"});renderInstrument();};
  }
  footEl.textContent="tick "+s.tick+" | cycle "+s.cycle;
}

async function renderAudit(){const a=await getJSON("/audit?n=30");const rows=a.tail.map(e=>`<tr><td>${new Date(e.ts*1000).toLocaleTimeString()}</td><td class="ev-${e.event}">${e.event}</td><td>${e.actor_id||'-'}</td><td>${JSON.stringify(e.data)}</td></tr>`).join('');pageEl.innerHTML=card("AUDIT","<table><tr><th>TIME</th><th>EVENT</th><th>ACTOR</th><th>DATA</th></tr>"+rows+"</table>");footEl.textContent="audit";}
async function renderAdmin(){const s=await getJSON("/status");pageEl.innerHTML=card("OPS ADMIN",`<div class="admin-grid"><div class="admin-box"><div class="k">KILL SWITCH</div><button class="btn btn-danger">DISABLE</button></div><div class="admin-box"><div class="k">THRESHOLDS</div><div class="thr"><span>E RED</span><span>0.40</span></div><div class="thr"><span>E YLW</span><span>0.25</span></div></div><div class="admin-box"><div class="k">SYSTEM</div><div class="thr"><span>Status</span><span class="status-${s.output.status}">${s.output.status}</span></div><div class="thr"><span>Tick</span><span>${s.tick}</span></div></div></div>`);}
async function renderActors(){const a=await getJSON("/actors?limit=20");const rows=a.actors.map(x=>`<tr><td>${x.actor_id}</td><td>${x.total_pressure.toFixed(1)}</td><td>${x.total_release.toFixed(1)}</td><td>${x.risk_score.toFixed(2)}</td></tr>`).join('');pageEl.innerHTML=card("ACTORS","<table><tr><th>ID</th><th>P</th><th>R</th><th>RISK</th></tr>"+(rows||"<tr><td colspan=4>No actors</td></tr>")+"</table>");}
async function renderPacks(){pageEl.innerHTML=card("PACKS",`<div class="packs-grid"><div class="pack-card active"><div class="pack-status">ACTIVE</div><div class="pack-name">Philippines Export</div></div><div class="pack-card"><div class="pack-status draft">DRAFT</div><div class="pack-name">Education</div></div></div>`);}
async function renderBilling(){pageEl.innerHTML=card("BILLING",`<div class="billing-grid"><div class="billing-box"><div class="k">SLA</div><div class="v">State Assurance</div></div><div class="billing-box"><div class="k">CONTRACTS</div><div class="v large">0</div></div></div>`);}

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
