"""
[DEPRECATED] AUTUS v3.0 - Legacy Main File

This file contains the original v3.0 implementation and is kept for historical reference only.
Current implementation uses main.py with FastAPI and evolved modules.

Status: ARCHIVED (Not used in production)
Reason: Replaced by main.py with new architecture
Migration: All endpoints have been migrated to main.py

To use this file, rename it back to main.py (after backing up current main.py)
"""

from fastapi import FastAPI, WebSocket, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import sqlite3, hashlib, json, uuid, random, asyncio, base64, os

SECRET_KEY = "autus-2024"
DB_PATH = "autus.db"
security = HTTPBearer(auto_error=False)
auto_generate = False
ws_clients = []

NAMES = ["Kim", "Lee", "Park", "Choi", "John", "Maria", "Aarav", "Sita"]
STAGES = ["applied", "screening", "interview", "selected", "training", "visa_processing", "employed", "retention_risk"]
SLACK_WEBHOOK = os.getenv("SLACK_WEBHOOK", "")

def gid(p=""): return f"{p}{uuid.uuid4().hex[:12]}"
def hpw(pw): return hashlib.sha256((pw + SECRET_KEY).encode()).hexdigest()
def ctk(d): return base64.b64encode(json.dumps({**d, "exp": (datetime.utcnow() + timedelta(hours=24)).isoformat()}).encode()).decode()
def vtk(t):
    try:
        p = json.loads(base64.b64decode(t).decode())
        return p if datetime.fromisoformat(p["exp"]) > datetime.utcnow() else None
    except: return None

def get_db():
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row
    return c

def init_db():
    c = sqlite3.connect(DB_PATH)
    x = c.cursor()
    x.execute("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE, pw TEXT, role TEXT)")
    x.execute("CREATE TABLE IF NOT EXISTS twins (id TEXT PRIMARY KEY, type TEXT, name TEXT, data TEXT, version INTEGER)")
    x.execute("CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, type TEXT, entity_id TEXT, data TEXT, timestamp TEXT)")
    x.execute("CREATE TABLE IF NOT EXISTS packs (id TEXT PRIMARY KEY, name TEXT, type TEXT, config TEXT)")
    x.execute("CREATE TABLE IF NOT EXISTS pack_logs (id TEXT PRIMARY KEY, pack_id TEXT, entity_id TEXT, result TEXT, timestamp TEXT)")
    x.execute("CREATE TABLE IF NOT EXISTS webhooks (id TEXT PRIMARY KEY, url TEXT, events TEXT, active INTEGER DEFAULT 1)")
    x.execute("CREATE TABLE IF NOT EXISTS sovereign (id TEXT PRIMARY KEY, twin_id TEXT, zero_id TEXT, consents TEXT, status TEXT)")
    
    if not x.execute("SELECT 1 FROM users WHERE username=?", ("admin",)).fetchone():
        x.execute("INSERT INTO users VALUES (?,?,?,?)", (gid("u-"), "admin", hpw("admin123"), "admin"))
    
    if not x.execute("SELECT 1 FROM packs").fetchone():
        packs = [
            ("pack-selection", "Selection Pack", "selection", json.dumps({"min_score": 70})),
            ("pack-training", "Training Pack", "training", json.dumps({"duration_weeks": 8})),
            ("pack-visa", "Visa Pack", "visa", json.dumps({"processing_days": 30})),
            ("pack-matching", "Matching Pack", "matching", json.dumps({"threshold": 0.7})),
            ("pack-retention", "Retention Pack", "retention", json.dumps({"risk_threshold": 0.5})),
        ]
        for p in packs:
            x.execute("INSERT INTO packs VALUES (?,?,?,?)", p)
    
    if not x.execute("SELECT 1 FROM twins").fetchone():
        for i, emp in enumerate(["TechCorp", "Samsung", "Naver", "Kakao", "Grab", "Shopee"]):
            x.execute("INSERT INTO twins VALUES (?,?,?,?,1)", (f"employer-E{i+1:03d}", "employer", emp, json.dumps({"industry": random.choice(["IT", "Finance", "BPO"])})))
        for i in range(1, 101):
            stage = random.choice(STAGES)
            sat = random.randint(35, 95)
            x.execute("INSERT INTO twins VALUES (?,?,?,?,1)", (f"talent-T{i:03d}", "talent", f"{random.choice(NAMES)} {i}", json.dumps({"stage": stage, "satisfaction": sat, "salary": random.randint(30000, 80000) if stage == "employed" else 0})))
            x.execute("INSERT INTO sovereign VALUES (?,?,?,?,?)", (f"sov-{i:04d}", f"talent-T{i:03d}", hashlib.sha256(f"t{i}".encode()).hexdigest()[:16], "[]", "active"))
    c.commit()
    c.close()

init_db()

app = FastAPI(title="AUTUS v3.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Webhook trigger
async def trigger_webhooks(event_type: str, data: dict):
    c = get_db()
    hooks = c.execute("SELECT * FROM webhooks WHERE active=1").fetchall()
    c.close()
    for h in hooks:
        events = json.loads(h["events"]) if h["events"] else ["*"]
        if "*" in events or event_type in events:
            try:
                import urllib.request
                req = urllib.request.Request(h["url"], data=json.dumps({"event": event_type, "data": data}).encode(), headers={"Content-Type": "application/json"})
                urllib.request.urlopen(req, timeout=5)
            except: pass

# Slack notification
async def send_slack(message: str):
    if not SLACK_WEBHOOK: return
    try:
        import urllib.request
        req = urllib.request.Request(SLACK_WEBHOOK, data=json.dumps({"text": message}).encode(), headers={"Content-Type": "application/json"})
        urllib.request.urlopen(req, timeout=5)
    except: pass

async def bc(m):
    for w in ws_clients[:]:
        try: await w.send_json(m)
        except: ws_clients.remove(w)

async def req_auth(c: HTTPAuthorizationCredentials = Depends(security)):
    if not c: raise HTTPException(401)
    u = vtk(c.credentials)
    if not u: raise HTTPException(401)
    return u

class Login(BaseModel):
    username: str
    password: str

@app.post("/auth/login")
def login(r: Login):
    c = get_db()
    u = c.execute("SELECT * FROM users WHERE username=?", (r.username,)).fetchone()
    c.close()
    if not u or hpw(r.password) != u["pw"]: raise HTTPException(401)
    return {"access_token": ctk({"username": u["username"], "role": u["role"]}), "user": {"username": u["username"]}}

@app.get("/auth/me")
def me(u=Depends(req_auth)): return u

# Twin CRUD
@app.get("/twin")
def twins(type: str = None, limit: int = 100):
    c = get_db()
    if type:
        r = c.execute("SELECT * FROM twins WHERE type=? LIMIT ?", (type, limit)).fetchall()
    else:
        r = c.execute("SELECT * FROM twins LIMIT ?", (limit,)).fetchall()
    c.close()
    return [dict(x) | {"data": json.loads(x["data"]) if x["data"] else {}} for x in r]

@app.get("/twin/{tid}")
def get_twin(tid: str):
    c = get_db()
    r = c.execute("SELECT * FROM twins WHERE id=?", (tid,)).fetchone()
    c.close()
    if not r: raise HTTPException(404)
    return dict(r) | {"data": json.loads(r["data"]) if r["data"] else {}}

class TwinUpdate(BaseModel):
    data: Dict

@app.put("/twin/{tid}")
async def update_twin(tid: str, u: TwinUpdate):
    c = get_db()
    r = c.execute("SELECT * FROM twins WHERE id=?", (tid,)).fetchone()
    if not r: c.close(); raise HTTPException(404)
    d = json.loads(r["data"]) if r["data"] else {}
    old = d.copy()
    d.update(u.data)
    c.execute("UPDATE twins SET data=?, version=? WHERE id=?", (json.dumps(d), r["version"] + 1, tid))
    c.execute("INSERT INTO events VALUES (?,?,?,?,?)", (gid("ev-"), "twin_updated", tid, json.dumps({"old": old, "new": d}), datetime.now().isoformat()))
    c.commit()
    c.close()
    await bc({"type": "updated", "id": tid})
    await trigger_webhooks("twin.updated", {"id": tid, "changes": u.data})
    return {"success": True}

# Packs
@app.get("/pack")
def packs():
    c = get_db()
    r = c.execute("SELECT * FROM packs").fetchall()
    c.close()
    return [dict(x) | {"config": json.loads(x["config"]) if x["config"] else {}} for x in r]

class PackExec(BaseModel):
    pack_id: str
    entity_id: str

@app.post("/pack/execute")
async def exec_pack(r: PackExec):
    c = get_db()
    pack = c.execute("SELECT * FROM packs WHERE id=?", (r.pack_id,)).fetchone()
    entity = c.execute("SELECT * FROM twins WHERE id=?", (r.entity_id,)).fetchone()
    if not pack or not entity: c.close(); raise HTTPException(404)
    
    d = json.loads(entity["data"]) if entity["data"] else {}
    cfg = json.loads(pack["config"]) if pack["config"] else {}
    ptype = pack["type"]
    result = {"success": True, "action": None}
    
    if ptype == "selection":
        passed = d.get("satisfaction", 70) >= cfg.get("min_score", 70)
        result = {"passed": passed, "score": d.get("satisfaction", 70)}
        if passed: d["stage"] = "selected"
    elif ptype == "training":
        d["stage"] = "training"
        result = {"enrolled": True, "duration": cfg.get("duration_weeks", 8)}
    elif ptype == "visa":
        approved = random.random() > 0.1
        result = {"approved": approved}
        if approved: d["stage"] = "visa_processing"
    elif ptype == "matching":
        matched = random.random() > 0.3
        result = {"matched": matched, "score": round(random.random(), 2)}
        if matched: d["stage"] = "employed"; d["salary"] = random.randint(40000, 80000)
    elif ptype == "retention":
        at_risk = d.get("satisfaction", 70) < 60
        result = {"at_risk": at_risk, "satisfaction": d.get("satisfaction", 70)}
        if at_risk: d["stage"] = "retention_risk"
    
    c.execute("UPDATE twins SET data=? WHERE id=?", (json.dumps(d), r.entity_id))
    c.execute("INSERT INTO pack_logs VALUES (?,?,?,?,?)", (gid("pl-"), r.pack_id, r.entity_id, json.dumps(result), datetime.now().isoformat()))
    c.execute("INSERT INTO events VALUES (?,?,?,?,?)", (gid("ev-"), f"pack_{ptype}", r.entity_id, json.dumps(result), datetime.now().isoformat()))
    c.commit()
    c.close()
    
    await bc({"type": "pack_executed"})
    await trigger_webhooks("pack.executed", {"pack": r.pack_id, "entity": r.entity_id, "result": result})
    if result.get("at_risk"):
        await send_slack(f"⚠️ AUTUS Alert: {r.entity_id} is at retention risk!")
    
    return {"pack": pack["name"], "entity": r.entity_id, "result": result}

@app.get("/pack/logs/{entity_id}")
def pack_logs(entity_id: str):
    c = get_db()
    r = c.execute("SELECT * FROM pack_logs WHERE entity_id=? ORDER BY timestamp DESC LIMIT 20", (entity_id,)).fetchall()
    c.close()
    return [dict(x) | {"result": json.loads(x["result"]) if x["result"] else {}} for x in r]

# Webhooks
class WebhookCreate(BaseModel):
    url: str
    events: List[str] = ["*"]

@app.post("/webhook")
async def create_webhook(w: WebhookCreate):
    c = get_db()
    wid = gid("wh-")
    c.execute("INSERT INTO webhooks VALUES (?,?,?,1)", (wid, w.url, json.dumps(w.events)))
    c.commit()
    c.close()
    return {"id": wid, "url": w.url}

@app.get("/webhook")
def list_webhooks():
    c = get_db()
    r = c.execute("SELECT * FROM webhooks WHERE active=1").fetchall()
    c.close()
    return [dict(x) | {"events": json.loads(x["events"]) if x["events"] else []} for x in r]

@app.delete("/webhook/{wid}")
async def delete_webhook(wid: str):
    c = get_db()
    c.execute("UPDATE webhooks SET active=0 WHERE id=?", (wid,))
    c.commit()
    c.close()
    return {"deleted": True}

# Sovereign
@app.get("/sovereign/{twin_id}")
def get_sovereign(twin_id: str):
    c = get_db()
    r = c.execute("SELECT * FROM sovereign WHERE twin_id=?", (twin_id,)).fetchone()
    c.close()
    if not r: raise HTTPException(404)
    return dict(r) | {"consents": json.loads(r["consents"]) if r["consents"] else []}

class ConsentGrant(BaseModel):
    consumer: str
    purpose: str
    duration_days: int = 365

@app.post("/sovereign/{twin_id}/consent")
async def grant_consent(twin_id: str, cg: ConsentGrant):
    c = get_db()
    r = c.execute("SELECT * FROM sovereign WHERE twin_id=?", (twin_id,)).fetchone()
    if not r: c.close(); raise HTTPException(404)
    consents = json.loads(r["consents"]) if r["consents"] else []
    consents.append({"id": gid("con-"), "consumer": cg.consumer, "purpose": cg.purpose, "granted": datetime.now().isoformat(), "expires": (datetime.now() + timedelta(days=cg.duration_days)).isoformat()})
    c.execute("UPDATE sovereign SET consents=? WHERE twin_id=?", (json.dumps(consents), twin_id))
    c.commit()
    c.close()
    await trigger_webhooks("consent.granted", {"twin_id": twin_id, "consumer": cg.consumer})
    return {"success": True, "total_consents": len(consents)}

# Analytics
def calc_risk(d):
    r = 0
    if d.get("satisfaction", 70) < 50: r += 0.5
    elif d.get("satisfaction", 70) < 65: r += 0.3
    if d.get("stage") == "retention_risk": r += 0.3
    return min(r, 1.0)

@app.get("/predict/all")
def predict_all():
    c = get_db()
    rows = c.execute("SELECT * FROM twins WHERE type=?", ("talent",)).fetchall()
    c.close()
    res = []
    for x in rows:
        d = json.loads(x["data"]) if x["data"] else {}
        r = calc_risk(d)
        lv = "CRITICAL" if r > 0.7 else "HIGH" if r > 0.5 else "MEDIUM" if r > 0.25 else "LOW"
        res.append({"id": x["id"], "name": x["name"], "risk": round(r, 2), "level": lv, "satisfaction": d.get("satisfaction", 0)})
    return {"predictions": res, "summary": {"critical": len([x for x in res if x["level"] == "CRITICAL"]), "high": len([x for x in res if x["level"] == "HIGH"])}}

@app.get("/analytics/overview")
def analytics():
    c = get_db()
    stages = {}
    for row in c.execute("SELECT data FROM twins WHERE type=?", ("talent",)).fetchall():
        d = json.loads(row["data"]) if row["data"] else {}
        s = d.get("stage", "unknown")
        stages[s] = stages.get(s, 0) + 1
    total = c.execute("SELECT COUNT(*) FROM twins WHERE type=?", ("talent",)).fetchone()[0]
    c.close()
    return {"total": total, "by_stage": stages}

@app.get("/analytics/risk")
def risk_analytics():
    c = get_db()
    rows = c.execute("SELECT data FROM twins WHERE type=?", ("talent",)).fetchall()
    c.close()
    s = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for x in rows:
        r = calc_risk(json.loads(x["data"]) if x["data"] else {})
        if r > 0.7: s["critical"] += 1
        elif r > 0.5: s["high"] += 1
        elif r > 0.25: s["medium"] += 1
        else: s["low"] += 1
    return {"summary": s}

# Generate
@app.post("/generate/talent")
async def gen_talent(count: int = 10):
    c = get_db()
    mx = c.execute("SELECT id FROM twins WHERE type=? ORDER BY id DESC LIMIT 1", ("talent",)).fetchone()
    mx_id = int(mx["id"].split("-T")[1]) if mx else 0
    for i in range(count):
        tid = mx_id + i + 1
        stage = random.choice(STAGES)
        sat = random.randint(35, 95)
        c.execute("INSERT INTO twins VALUES (?,?,?,?,1)", (f"talent-T{tid:03d}", "talent", f"{random.choice(NAMES)} {tid}", json.dumps({"stage": stage, "satisfaction": sat, "salary": random.randint(30000, 80000) if stage == "employed" else 0})))
        c.execute("INSERT INTO sovereign VALUES (?,?,?,?,?)", (f"sov-{tid:04d}", f"talent-T{tid:03d}", hashlib.sha256(f"t{tid}".encode()).hexdigest()[:16], "[]", "active"))
    c.commit()
    c.close()
    await bc({"type": "generated", "count": count})
    await trigger_webhooks("talent.generated", {"count": count})
    return {"created": count}

@app.post("/generate/events")
async def gen_events(count: int = 10):
    c = get_db()
    ts = c.execute("SELECT id, data FROM twins WHERE type=?", ("talent",)).fetchall()
    alerts = []
    for _ in range(count):
        t = random.choice(ts)
        d = json.loads(t["data"]) if t["data"] else {}
        old_sat = d.get("satisfaction", 70)
        d["satisfaction"] = max(30, min(100, old_sat + random.randint(-15, 15)))
        if d["satisfaction"] < 50 and old_sat >= 50:
            alerts.append(t["id"])
        c.execute("UPDATE twins SET data=? WHERE id=?", (json.dumps(d), t["id"]))
        c.execute("INSERT INTO events VALUES (?,?,?,?,?)", (gid("ev-"), "satisfaction_change", t["id"], json.dumps({"old": old_sat, "new": d["satisfaction"]}), datetime.now().isoformat()))
    c.commit()
    c.close()
    await bc({"type": "events", "count": count})
    for aid in alerts:
        await send_slack(f"⚠️ AUTUS: {aid} satisfaction dropped below 50!")
    return {"generated": count, "alerts": len(alerts)}

# Auto generate
async def auto_loop():
    global auto_generate
    while auto_generate:
        try:
            c = get_db()
            ts = c.execute("SELECT id, data FROM twins WHERE type=?", ("talent",)).fetchall()
            if ts:
                t = random.choice(ts)
                d = json.loads(t["data"]) if t["data"] else {}
                change_type = random.choice(["satisfaction", "stage"])
                if change_type == "satisfaction":
                    old = d.get("satisfaction", 70)
                    d["satisfaction"] = max(30, min(100, old + random.randint(-10, 10)))
                    if d["satisfaction"] < 50 and old >= 50:
                        await send_slack(f"⚠️ Auto Alert: {t['id']} satisfaction dropped to {d['satisfaction']}!")
                else:
                    old = d.get("stage", "applied")
                    stages_order = ["applied", "screening", "interview", "selected", "training", "visa_processing", "employed"]
                    if old in stages_order:
                        idx = stages_order.index(old)
                        if idx < len(stages_order) - 1:
                            d["stage"] = stages_order[idx + 1]
                c.execute("UPDATE twins SET data=? WHERE id=?", (json.dumps(d), t["id"]))
                c.execute("INSERT INTO events VALUES (?,?,?,?,?)", (gid("ev-"), f"auto_{change_type}", t["id"], "{}", datetime.now().isoformat()))
                c.commit()
                await bc({"type": "auto"})
            c.close()
        except: pass
        await asyncio.sleep(5)

@app.post("/auto/start")
async def auto_start():
    global auto_generate
    if not auto_generate:
        auto_generate = True
        asyncio.create_task(auto_loop())
    return {"status": "started"}

@app.post("/auto/stop")
async def auto_stop():
    global auto_generate
    auto_generate = False
    return {"status": "stopped"}

@app.get("/auto/status")
def auto_status(): return {"running": auto_generate}

# Stats & Events
@app.get("/stats")
def stats():
    c = get_db()
    s = {
        "talents": c.execute("SELECT COUNT(*) FROM twins WHERE type=?", ("talent",)).fetchone()[0],
        "employers": c.execute("SELECT COUNT(*) FROM twins WHERE type=?", ("employer",)).fetchone()[0],
        "events": c.execute("SELECT COUNT(*) FROM events").fetchone()[0],
        "webhooks": c.execute("SELECT COUNT(*) FROM webhooks WHERE active=1").fetchone()[0],
        "packs": c.execute("SELECT COUNT(*) FROM packs").fetchone()[0],
    }
    c.close()
    return s

@app.get("/events")
def events(limit: int = 30):
    c = get_db()
    r = c.execute("SELECT * FROM events ORDER BY timestamp DESC LIMIT ?", (limit,)).fetchall()
    c.close()
    return [dict(x) for x in r]

@app.get("/")
def root(): return {"name": "AUTUS v3.0", "version": "3.0.0", "features": ["jwt", "twin", "pack", "webhook", "slack", "sovereign", "prediction"], "ui": "/ui"}

@app.websocket("/ws")
async def ws(w: WebSocket):
    await w.accept()
    ws_clients.append(w)
    try:
        while True: await w.receive_text()
    except: ws_clients.remove(w) if w in ws_clients else None

@app.get("/ui", response_class=HTMLResponse)
def ui():
    html = """<!DOCTYPE html><html><head><title>AUTUS v3.0</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui;background:#0a0a0a;color:#fff;padding:20px}
h1{color:#00ff88;margin-bottom:5px}
.sub{color:#666;font-size:0.9rem;margin-bottom:20px}
.tabs{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap}
.tab{padding:8px 16px;background:#222;border:none;color:#fff;border-radius:6px;cursor:pointer}
.tab.active{background:#00ff88;color:#000}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:15px}
.card{background:#111;border:1px solid #222;border-radius:10px;padding:15px}
.card h2{font-size:0.8rem;color:#666;margin-bottom:12px;text-transform:uppercase}
.stat{font-size:2rem;font-weight:bold;color:#00ff88}
.stat-row{display:flex;gap:20px;flex-wrap:wrap}
.stat-item{text-align:center}
.stat-item .num{font-size:1.5rem;font-weight:bold;color:#00ff88}
.stat-item .label{font-size:0.7rem;color:#666}
.item{padding:10px;background:#1a1a1a;border-radius:6px;margin-bottom:6px;font-size:0.85rem}
.badge{padding:3px 10px;border-radius:12px;font-size:0.7rem;font-weight:600;float:right}
.critical{background:#ff000033;color:#ff4444}
.high{background:#ff660033;color:#ff8844}
.medium{background:#ffaa0033;color:#ffaa00}
.low{background:#00ff8833;color:#00ff88}
.btn{background:#00ff88;color:#000;border:none;padding:8px 16px;border-radius:5px;cursor:pointer;font-weight:600;margin:4px}
.btn:hover{background:#00cc6a}
.btn.danger{background:#ff4444;color:#fff}
.btn.secondary{background:#333;color:#fff}
.scroll{max-height:350px;overflow-y:auto}
.input{background:#1a1a1a;border:1px solid #333;color:#fff;padding:8px 12px;border-radius:5px;margin:4px;font-size:0.9rem}
.select{background:#1a1a1a;border:1px solid #333;color:#fff;padding:8px 12px;border-radius:5px;margin:4px}
.login-box{max-width:320px;margin:80px auto;padding:40px;background:#111;border-radius:16px;text-align:center}
.login-box h2{color:#00ff88;margin-bottom:25px;font-size:1.5rem}
.login-box input{width:100%;margin-bottom:12px}
.login-box button{width:100%;padding:12px}
.section{display:none}
.section.active{display:block}
.auto-status{padding:8px 12px;border-radius:6px;display:inline-block;margin-bottom:10px}
.auto-on{background:#00ff8833;color:#00ff88}
.auto-off{background:#ff444433;color:#ff4444}
</style></head><body>
<div id="login" class="login-box">
<h2>🚀 AUTUS v3.0</h2>
<input id="user" class="input" value="admin" placeholder="Username">
<input id="pass" class="input" type="password" value="admin123" placeholder="Password">
<button class="btn" onclick="doLogin()">Login</button>
<p style="margin-top:20px;color:#666;font-size:0.8rem">Digital Twin + Sovereign + Pack OS</p>
</div>
<div id="main" style="display:none">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
<div><h1>AUTUS v3.0</h1><p class="sub">Digital Twin + Sovereign + Pack OS</p></div>
<button class="btn danger" onclick="doLogout()">Logout</button>
</div>
<div class="tabs">
<button class="tab active" onclick="showTab('overview')">Overview</button>
<button class="tab" onclick="showTab('twins')">Twins</button>
<button class="tab" onclick="showTab('packs')">Packs</button>
<button class="tab" onclick="showTab('predictions')">Predictions</button>
<button class="tab" onclick="showTab('webhooks')">Webhooks</button>
<button class="tab" onclick="showTab('generate')">Generate</button>
</div>
<div id="overview" class="section active">
<div class="grid">
<div class="card"><h2>System Stats</h2><div id="stats"></div></div>
<div class="card"><h2>Stage Distribution</h2><div id="stages" class="scroll"></div></div>
<div class="card"><h2>Risk Overview</h2><div id="risk"></div></div>
<div class="card"><h2>Recent Events</h2><div id="events" class="scroll"></div></div>
</div>
</div>
<div id="twins" class="section">
<div class="grid">
<div class="card"><h2>Talents</h2><div id="talents" class="scroll"></div></div>
<div class="card"><h2>Employers</h2><div id="employers" class="scroll"></div></div>
</div>
</div>
<div id="packs" class="section">
<div class="grid">
<div class="card"><h2>Available Packs</h2><div id="packlist"></div></div>
<div class="card"><h2>Execute Pack</h2>
<select id="pack-select" class="select" style="width:100%"></select>
<input id="entity-id" class="input" style="width:100%" placeholder="Entity ID (e.g. talent-T001)">
<button class="btn" onclick="execPack()" style="width:100%">Execute Pack</button>
<div id="pack-result" style="margin-top:10px"></div>
</div>
</div>
</div>
<div id="predictions" class="section">
<div class="card"><h2>Retention Risk Predictions</h2><div id="preds" class="scroll"></div></div>
</div>
<div id="webhooks" class="section">
<div class="grid">
<div class="card"><h2>Active Webhooks</h2><div id="hooklist"></div></div>
<div class="card"><h2>Add Webhook</h2>
<input id="hook-url" class="input" style="width:100%" placeholder="https://your-webhook-url.com">
<button class="btn" onclick="addHook()" style="width:100%">Add Webhook</button>
</div>
</div>
</div>
<div id="generate" class="section">
<div class="grid">
<div class="card"><h2>Auto Generate</h2>
<div id="auto-st"></div>
<button class="btn" onclick="autoStart()">Start Auto</button>
<button class="btn danger" onclick="autoStop()">Stop Auto</button>
<p style="margin-top:10px;color:#666;font-size:0.8rem">Auto generates events every 5 seconds</p>
</div>
<div class="card"><h2>Manual Generate</h2>
<button class="btn" onclick="genT(10)">+10 Talents</button>
<button class="btn" onclick="genT(100)">+100 Talents</button>
<button class="btn" onclick="genT(500)">+500 Talents</button>
<br><br>
<button class="btn secondary" onclick="genE(20)">+20 Events</button>
<button class="btn secondary" onclick="genE(100)">+100 Events</button>
</div>
</div>
</div>
</div>
<script>
var token = localStorage.getItem("tk");
var currentTab = "overview";

function doLogin() {
    fetch("/auth/login", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({username: document.getElementById("user").value, password: document.getElementById("pass").value})
    })
    .then(function(r) { if (!r.ok) throw new Error(); return r.json(); })
    .then(function(d) { token = d.access_token; localStorage.setItem("tk", token); showMain(); })
    .catch(function() { alert("Login failed"); });
}

function doLogout() { token = null; localStorage.removeItem("tk"); location.reload(); }

function showMain() {
    document.getElementById("login").style.display = "none";
    document.getElementById("main").style.display = "block";
    loadData();
}

function showTab(name) {
    currentTab = name;
    document.querySelectorAll(".section").forEach(function(s) { s.classList.remove("active"); });
    document.querySelectorAll(".tab").forEach(function(t) { t.classList.remove("active"); });
    document.getElementById(name).classList.add("active");
    event.target.classList.add("active");
    loadData();
}

function loadData() {
    fetch("/stats").then(function(r){return r.json();}).then(function(s){
        document.getElementById("stats").innerHTML = "<div class='stat-row'><div class='stat-item'><div class='num'>" + s.talents + "</div><div class='label'>Talents</div></div><div class='stat-item'><div class='num'>" + s.employers + "</div><div class='label'>Employers</div></div><div class='stat-item'><div class='num'>" + s.events + "</div><div class='label'>Events</div></div><div class='stat-item'><div class='num'>" + s.webhooks + "</div><div class='label'>Webhooks</div></div><div class='stat-item'><div class='num'>" + s.packs + "</div><div class='label'>Packs</div></div></div>";
    });
    fetch("/analytics/overview").then(function(r){return r.json();}).then(function(a){
        var html = "";
        var stages = Object.entries(a.by_stage || {}).sort(function(x,y){return y[1]-x[1];});
        for (var i = 0; i < stages.length; i++) {
            html += "<div class='item'>" + stages[i][0] + "<span style='float:right;color:#00ff88'>" + stages[i][1] + "</span></div>";
        }
        document.getElementById("stages").innerHTML = html;
    });
    fetch("/analytics/risk").then(function(r){return r.json();}).then(function(rk){
        document.getElementById("risk").innerHTML = "<div class='stat-row'><div class='stat-item'><div class='num' style='color:#ff4444'>" + rk.summary.critical + "</div><div class='label'>Critical</div></div><div class='stat-item'><div class='num' style='color:#ff8844'>" + rk.summary.high + "</div><div class='label'>High</div></div><div class='stat-item'><div class='num' style='color:#ffaa00'>" + rk.summary.medium + "</div><div class='label'>Medium</div></div><div class='stat-item'><div class='num' style='color:#00ff88'>" + rk.summary.low + "</div><div class='label'>Low</div></div></div>";
    });
    fetch("/events?limit=15").then(function(r){return r.json();}).then(function(ev){
        var html = "";
        for (var i = 0; i < ev.length; i++) {
            var e = ev[i];
            html += "<div class='item'><span style='color:#666'>" + (e.timestamp ? e.timestamp.slice(11,19) : "") + "</span> " + e.type + " <span style='color:#00ff88'>" + (e.entity_id ? e.entity_id.slice(-8) : "") + "</span></div>";
        }
        document.getElementById("events").innerHTML = html || "<div class='item'>No events yet</div>";
    });
    fetch("/twin?type=talent&limit=30").then(function(r){return r.json();}).then(function(t){
        var html = "";
        for (var i = 0; i < t.length; i++) {
            var x = t[i];
            html += "<div class='item'><b>" + x.name + "</b><br><small style='color:#666'>" + (x.data.stage || "?") + " | Sat: " + (x.data.satisfaction || 0) + "</small></div>";
        }
        document.getElementById("talents").innerHTML = html;
    });
    fetch("/twin?type=employer").then(function(r){return r.json();}).then(function(e){
        var html = "";
        for (var i = 0; i < e.length; i++) {
            html += "<div class='item'><b>" + e[i].name + "</b><br><small style='color:#666'>" + (e[i].data.industry || "?") + "</small></div>";
        }
        document.getElementById("employers").innerHTML = html;
    });
    fetch("/pack").then(function(r){return r.json();}).then(function(p){
        var html = "";
        var opts = "";
        for (var i = 0; i < p.length; i++) {
            html += "<div class='item'><b>" + p[i].name + "</b><br><small style='color:#666'>" + p[i].type + "</small></div>";
            opts += "<option value='" + p[i].id + "'>" + p[i].name + "</option>";
        }
        document.getElementById("packlist").innerHTML = html;
        document.getElementById("pack-select").innerHTML = opts;
    });
    fetch("/predict/all").then(function(r){return r.json();}).then(function(pr){
        var html = "";
        var list = pr.predictions.filter(function(x){return x.level !== "LOW";}).slice(0,30);
        for (var i = 0; i < list.length; i++) {
            var x = list[i];
            html += "<div class='item'>" + x.name + " <small style='color:#666'>(Sat: " + x.satisfaction + ")</small><span class='badge " + x.level.toLowerCase() + "'>" + x.level + "</span></div>";
        }
        document.getElementById("preds").innerHTML = html || "<div class='item'>No high-risk talents</div>";
    });
    fetch("/webhook").then(function(r){return r.json();}).then(function(h){
        var html = "";
        for (var i = 0; i < h.length; i++) {
            html += "<div class='item'>" + h[i].url.slice(0,40) + "...<button class='btn danger' style='float:right;padding:4px 8px;font-size:0.7rem' onclick='delHook("" + h[i].id + "")'>Delete</button></div>";
        }
        document.getElementById("hooklist").innerHTML = html || "<div class='item'>No webhooks configured</div>";
    });
    fetch("/auto/status").then(function(r){return r.json();}).then(function(a){
        document.getElementById("auto-st").innerHTML = "<div class='auto-status " + (a.running ? "auto-on" : "auto-off") + "'>" + (a.running ? "● Running" : "○ Stopped") + "</div>";
    });
}

function execPack() {
    var pack = document.getElementById("pack-select").value;
    var entity = document.getElementById("entity-id").value;
    if (!entity) { alert("Enter entity ID"); return; }
    fetch("/pack/execute", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({pack_id: pack, entity_id: entity})
    })
    .then(function(r){return r.json();})
    .then(function(d){
        document.getElementById("pack-result").innerHTML = "<div class='item' style='background:#00ff8822;color:#00ff88'>" + d.pack + ": " + JSON.stringify(d.result) + "</div>";
        loadData();
    })
    .catch(function(){
        document.getElementById("pack-result").innerHTML = "<div class='item' style='background:#ff444422;color:#ff4444'>Execution failed</div>";
    });
}

function addHook() {
    var url = document.getElementById("hook-url").value;
    if (!url) { alert("Enter webhook URL"); return; }
    fetch("/webhook", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({url: url, events: ["*"]})
    }).then(function(){loadData();});
}

function delHook(id) {
    fetch("/webhook/" + id, {method: "DELETE"}).then(function(){loadData();});
}

function genT(c) { fetch("/generate/talent?count=" + c, {method: "POST"}).then(function(){loadData();}); }
function genE(c) { fetch("/generate/events?count=" + c, {method: "POST"}).then(function(){loadData();}); }
function autoStart() { fetch("/auto/start", {method: "POST"}).then(function(){loadData();}); }
function autoStop() { fetch("/auto/stop", {method: "POST"}).then(function(){loadData();}); }

if (token) {
    fetch("/auth/me", {headers: {"Authorization": "Bearer " + token}})
    .then(function(r) { if (r.ok) showMain(); })
    .catch(function() {});
}

setInterval(loadData, 8000);
var ws = new WebSocket("ws://" + location.host + "/ws");
ws.onmessage = function() { loadData(); };
ws.onclose = function() { setTimeout(function(){ location.reload(); }, 3000); };
</script>
</body></html>"""
    return html
