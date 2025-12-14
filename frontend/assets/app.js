const API_KEY="autus-secure-key-2024";
const pageEl=document.getElementById("page");
const footEl=document.getElementById("footStatus");
async function getJSON(p){const r=await fetch(p,{cache:"no-store"});return r.ok?await r.json():null;}
async function postJSON(p,b){return await fetch(p,{method:"POST",headers:{"Content-Type":"application/json","X-AUTUS-KEY":API_KEY},body:JSON.stringify(b)}).then(r=>r.json());}
function route(){return(location.hash||"#/instrument").replace("#","");}
function card(t,h){return "<section class=card><div class=h1>"+t+"</div>"+h+"</section>";}
async function renderInstrument(){
  const s=await getJSON("/status");if(!s)return;
  const sig=s.signals,out=s.output;
  pageEl.innerHTML=card("INSTRUMENT","<div class=row><div class=box><div class=k>PRESSURE</div><div class=v>"+sig.pressure.toFixed(2)+"</div></div><div class=box><div class=k>RELEASE</div><div class=v>"+sig.release.toFixed(2)+"</div></div><div class=box><div class=k>DECISION</div><div class=v>"+sig.decision.toFixed(2)+"</div></div><div class=box><div class=k>ENTROPY</div><div class=v>"+sig.entropy.toFixed(3)+"</div></div><div class=box><div class=k>GRAVITY</div><div class=v>"+sig.gravity.toFixed(3)+"</div></div></div><div class=box style=margin-top:12px><div class=k>STATUS</div><div class='v status-"+out.status+"' style=font-size:28px>"+out.status+"</div><div class=k style=margin-top:8px>FAILURE IN</div><div class=v>"+(out.failure_in_ticks||"-")+" TICKS</div></div><div style=margin-top:12px><button class=btn id=exBtn "+(out.status==="GREEN"?"disabled":"")+">EXECUTE</button></div>");
  document.getElementById("exBtn").onclick=async()=>{await postJSON("/execute",{action:"AUTO_STABILIZE",actor_id:"UI"});renderInstrument();};
  footEl.textContent="tick "+s.tick+" | cycle "+s.cycle;
}
async function renderAudit(){
  const a=await getJSON("/audit?n=20");
  const rows=a.tail.map(e=>"<tr><td>"+new Date(e.ts*1000).toLocaleTimeString()+"</td><td>"+e.event+"</td><td>"+(e.actor_id||"-")+"</td><td>"+JSON.stringify(e.data)+"</td></tr>").join("");
  pageEl.innerHTML=card("AUDIT","<table><tr><th>TIME</th><th>EVENT</th><th>ACTOR</th><th>DATA</th></tr>"+rows+"</table>");
  footEl.textContent="audit loaded";
}
async function renderAdmin(){
  pageEl.innerHTML=card("OPS ADMIN","<div class=row><div class=box><div class=k>KILL SWITCH</div><button class=btn>DISABLE</button></div><div class=box><div class=k>THRESHOLDS</div><div class=v>Entropy: 0.45/0.70</div></div><div class=box><div class=k>API KEY</div><div class=v style=font-size:11px>****-2024</div></div></div>");
  footEl.textContent="admin ready";
}
async function renderActors(){
  const a=await getJSON("/actors?limit=20");
  const rows=a.actors.map(x=>"<tr><td>"+x.actor_id+"</td><td>"+x.total_pressure.toFixed(1)+"</td><td>"+x.total_release.toFixed(1)+"</td><td>"+x.risk_score.toFixed(2)+"</td></tr>").join("");
  pageEl.innerHTML=card("ACTORS","<table><tr><th>ID</th><th>PRESSURE</th><th>RELEASE</th><th>RISK</th></tr>"+(rows||"<tr><td colspan=4>No actors</td></tr>")+"</table>");
  footEl.textContent="actors loaded";
}
async function renderPacks(){
  pageEl.innerHTML=card("PACKS","<table><tr><th>ID</th><th>NAME</th><th>STATUS</th></tr><tr><td>PH_EXPORT</td><td>Philippines Export</td><td>ACTIVE</td></tr><tr><td>EDU</td><td>Education</td><td>DRAFT</td></tr></table>");
  footEl.textContent="packs loaded";
}
async function renderBilling(){
  pageEl.innerHTML=card("BILLING","<div class=row><div class=box><div class=k>SLA</div><div class=v>State Assurance</div></div><div class=box><div class=k>CONTRACTS</div><div class=v>0</div></div><div class=box><div class=k>PROOF PACKS</div><div class=v>0</div></div></div>");
  footEl.textContent="billing ready";
}
async function render(){
  const r=route();
  if(r==="/instrument")return renderInstrument();
  if(r==="/audit")return renderAudit();
  if(r==="/admin")return renderAdmin();
  if(r==="/actors")return renderActors();
  if(r==="/packs")return renderPacks();
  if(r==="/billing")return renderBilling();
  location.hash="#/instrument";
}
window.addEventListener("hashchange",render);
setInterval(()=>{if(route()==="/instrument")renderInstrument();},2000);
render();
