from fastapi import FastAPI, WebSocket, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Dict
from datetime import datetime, timedelta
import sqlite3, hashlib, json, uuid, random, asyncio, base64

SECRET_KEY = "autus-2024"
DB_PATH = "autus.db"
security = HTTPBearer(auto_error=False)
auto_generate = False
ws_clients = []

NAMES = ["Kim", "Lee", "John", "Maria"]
STAGES = ["applied", "screening", "interview", "selected", "training", "employed", "retention_risk"]

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
    x.execute("CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, type TEXT, entity_id TEXT, timestamp TEXT)")
    x.execute("CREATE TABLE IF NOT EXISTS packs (id TEXT PRIMARY KEY, name TEXT, type TEXT)")
    
    if not x.execute("SELECT 1 FROM users WHERE username=?", ("admin",)).fetchone():
        x.execute("INSERT INTO users VALUES (?,?,?,?)", (gid("u-"), "admin", hpw("admin123"), "admin"))
    
    if not x.execute("SELECT 1 FROM packs").fetchone():
        for p in [("pack-selection","Selection","selection"),("pack-training","Training","training"),("pack-retention","Retention","retention")]:
            x.execute("INSERT INTO packs VALUES (?,?,?)", p)
    
    if not x.execute("SELECT 1 FROM twins").fetchone():
        for i, emp in enumerate(["TechCorp","Samsung","Naver","Kakao"]):
            x.execute("INSERT INTO twins VALUES (?,?,?,?,1)", (f"employer-E{i+1:03d}", "employer", emp, "{}"))
        for i in range(1, 101):
            stage = random.choice(STAGES)
            x.execute("INSERT INTO twins VALUES (?,?,?,?,1)", (f"talent-T{i:03d}", "talent", f"{random.choice(NAMES)} {i}", json.dumps({"stage":stage,"satisfaction":random.randint(35,95)})))
    c.commit()
    c.close()

init_db()

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

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

@app.get("/twin")
def twins(type: str = None, limit: int = 100):
    c = get_db()
    if type:
        r = c.execute("SELECT * FROM twins WHERE type=? LIMIT ?", (type, limit)).fetchall()
    else:
        r = c.execute("SELECT * FROM twins LIMIT ?", (limit,)).fetchall()
    c.close()
    return [dict(x) | {"data": json.loads(x["data"]) if x["data"] else {}} for x in r]

@app.get("/pack")
def packs():
    c = get_db()
    r = c.execute("SELECT * FROM packs").fetchall()
    c.close()
    return [dict(x) for x in r]

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
        res.append({"name": x["name"], "risk": round(r, 2), "level": lv})
    return {"predictions": res}

@app.get("/analytics/overview")
def analytics():
    c = get_db()
    stages = {}
    for row in c.execute("SELECT data FROM twins WHERE type=?", ("talent",)).fetchall():
        d = json.loads(row["data"]) if row["data"] else {}
        s = d.get("stage", "unknown")
        stages[s] = stages.get(s, 0) + 1
    c.close()
    return {"by_stage": stages}

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

@app.post("/generate/talent")
async def gen_talent(count: int = 10):
    c = get_db()
    mx = c.execute("SELECT id FROM twins WHERE type=? ORDER BY id DESC LIMIT 1", ("talent",)).fetchone()
    mx_id = int(mx["id"].split("-T")[1]) if mx else 0
    for i in range(count):
        tid = mx_id + i + 1
        c.execute("INSERT INTO twins VALUES (?,?,?,?,1)", (f"talent-T{tid:03d}", "talent", f"{random.choice(NAMES)} {tid}", json.dumps({"stage":random.choice(STAGES),"satisfaction":random.randint(35,95)})))
    c.commit()
    c.close()
    await bc({"type": "gen"})
    return {"created": count}

@app.post("/generate/events")
async def gen_events(count: int = 10):
    c = get_db()
    ts = c.execute("SELECT id, data FROM twins WHERE type=?", ("talent",)).fetchall()
    for _ in range(count):
        t = random.choice(ts)
        d = json.loads(t["data"]) if t["data"] else {}
        d["satisfaction"] = max(30, min(100, d.get("satisfaction", 70) + random.randint(-15, 15)))
        c.execute("UPDATE twins SET data=? WHERE id=?", (json.dumps(d), t["id"]))
        c.execute("INSERT INTO events VALUES (?,?,?,?)", (gid("ev-"), "change", t["id"], datetime.now().isoformat()))
    c.commit()
    c.close()
    await bc({"type": "events"})
    return {"generated": count}

@app.get("/stats")
def stats():
    c = get_db()
    s = {"talents": c.execute("SELECT COUNT(*) FROM twins WHERE type=?", ("talent",)).fetchone()[0], "events": c.execute("SELECT COUNT(*) FROM events").fetchone()[0]}
    c.close()
    return s

@app.get("/events")
def events(limit: int = 20):
    c = get_db()
    r = c.execute("SELECT * FROM events ORDER BY timestamp DESC LIMIT ?", (limit,)).fetchall()
    c.close()
    return [dict(x) for x in r]

@app.get("/auto/status")
def auto_status(): return {"running": auto_generate}

@app.post("/auto/start")
async def auto_start():
    global auto_generate
    auto_generate = True
    return {"status": "started"}

@app.post("/auto/stop")
async def auto_stop():
    global auto_generate
    auto_generate = False
    return {"status": "stopped"}

@app.get("/")
def root(): return {"name": "AUTUS v3.0", "ui": "/ui"}

@app.websocket("/ws")
async def ws(w: WebSocket):
    await w.accept()
    ws_clients.append(w)
    try:
        while True: await w.receive_text()
    except: ws_clients.remove(w) if w in ws_clients else None

@app.get("/ui", response_class=HTMLResponse)
def ui():
    html = """<!DOCTYPE html><html><head><title>AUTUS</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui;background:#0a0a0a;color:#fff;padding:20px}
h1{color:#00ff88;margin-bottom:20px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:15px}
.card{background:#111;border:1px solid #222;border-radius:10px;padding:15px}
.card h2{font-size:0.8rem;color:#666;margin-bottom:12px}
.stat{font-size:2rem;font-weight:bold;color:#00ff88}
.item{padding:8px;background:#1a1a1a;border-radius:6px;margin-bottom:5px;font-size:0.8rem}
.badge{padding:2px 8px;border-radius:10px;font-size:0.65rem;float:right}
.critical{background:#ff000033;color:#ff4444}
.high{background:#ff660033;color:#ff8844}
.btn{background:#00ff88;color:#000;border:none;padding:8px 16px;border-radius:5px;cursor:pointer;font-weight:600;margin:5px}
.scroll{max-height:300px;overflow-y:auto}
.input{background:#1a1a1a;border:1px solid #333;color:#fff;padding:8px;border-radius:5px;margin:5px;width:100%}
.login-box{max-width:300px;margin:50px auto;padding:30px;background:#111;border-radius:12px;text-align:center}
.login-box h2{color:#00ff88;margin-bottom:20px}
</style></head><body>
<div id="login" class="login-box">
<h2>AUTUS Login</h2>
<input id="user" class="input" value="admin" placeholder="Username">
<input id="pass" class="input" type="password" value="admin123" placeholder="Password">
<button class="btn" onclick="doLogin()">Login</button>
</div>
<div id="main" style="display:none">
<h1>AUTUS v3.0</h1>
<button class="btn" onclick="doLogout()" style="float:right">Logout</button>
<div class="grid">
<div class="card"><h2>SYSTEM</h2><div id="stats"></div></div>
<div class="card"><h2>STAGES</h2><div id="stages" class="scroll"></div></div>
<div class="card"><h2>RISK</h2><div id="risk"></div></div>
<div class="card"><h2>TALENTS</h2><div id="talents" class="scroll"></div></div>
<div class="card"><h2>PREDICTIONS</h2><div id="preds" class="scroll"></div></div>
<div class="card"><h2>GENERATE</h2>
<button class="btn" onclick="genT(10)">+10</button>
<button class="btn" onclick="genT(100)">+100</button>
<button class="btn" onclick="genE(50)">+50 Events</button>
</div>
</div>
</div>
<script>
var token = localStorage.getItem("tk");

function doLogin() {
    var u = document.getElementById("user").value;
    var p = document.getElementById("pass").value;
    fetch("/auth/login", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({username: u, password: p})
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        token = d.access_token;
        localStorage.setItem("tk", token);
        showMain();
    })
    .catch(function(e) { alert("Login failed"); });
}

function doLogout() {
    token = null;
    localStorage.removeItem("tk");
    location.reload();
}

function showMain() {
    document.getElementById("login").style.display = "none";
    document.getElementById("main").style.display = "block";
    loadData();
}

function loadData() {
    fetch("/stats").then(function(r){return r.json();}).then(function(s){
        document.getElementById("stats").innerHTML = "<div class='stat'>" + s.talents + "</div>Talents | " + s.events + " Events";
    });
    fetch("/analytics/overview").then(function(r){return r.json();}).then(function(a){
        var html = "";
        for (var k in a.by_stage) {
            html += "<div class='item'>" + k + "<span style='float:right'>" + a.by_stage[k] + "</span></div>";
        }
        document.getElementById("stages").innerHTML = html;
    });
    fetch("/analytics/risk").then(function(r){return r.json();}).then(function(rk){
        document.getElementById("risk").innerHTML = "<span style='color:#ff4444'>" + rk.summary.critical + " Critical</span> | <span style='color:#ff8844'>" + rk.summary.high + " High</span>";
    });
    fetch("/twin?type=talent&limit=20").then(function(r){return r.json();}).then(function(t){
        var html = "";
        for (var i = 0; i < t.length; i++) {
            html += "<div class='item'>" + t[i].name + "</div>";
        }
        document.getElementById("talents").innerHTML = html;
    });
    fetch("/predict/all").then(function(r){return r.json();}).then(function(pr){
        var html = "";
        var list = pr.predictions.filter(function(x){return x.level !== "LOW";}).slice(0,15);
        for (var i = 0; i < list.length; i++) {
            var x = list[i];
            html += "<div class='item'>" + x.name + "<span class='badge " + x.level.toLowerCase() + "'>" + x.level + "</span></div>";
        }
        document.getElementById("preds").innerHTML = html;
    });
}

function genT(c) {
    fetch("/generate/talent?count=" + c, {method: "POST"}).then(function(){loadData();});
}

function genE(c) {
    fetch("/generate/events?count=" + c, {method: "POST"}).then(function(){loadData();});
}

if (token) {
    fetch("/auth/me", {headers: {"Authorization": "Bearer " + token}})
    .then(function(r) { if (r.ok) showMain(); })
    .catch(function() {});
}

setInterval(loadData, 10000);
</script>
</body></html>"""
    return html
