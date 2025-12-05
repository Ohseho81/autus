from fastapi import FastAPI, WebSocket, HTTPException, Header, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
import sqlite3
import hashlib
import secrets
import json
import uuid
import random
import asyncio

# 자동 생성 플래그
auto_generate = False
auto_task = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    global auto_generate
    auto_generate = False

app = FastAPI(title="AUTUS v3.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

DB_PATH = "autus.db"

KOREAN_NAMES = ["김민준", "이서윤", "박도윤", "최서아", "정하준", "강지우", "조은우", "윤서준", "장하은", "임지호",
                "한수아", "신예준", "오지민", "서유진", "권시우", "황다은", "안지훈", "송민서", "전서현", "홍승우",
                "류지원", "남도현", "배수빈", "곽민서", "문하늘", "양서진", "손예린", "노태양", "하지안", "구민재"]
NEPALI_NAMES = ["Aarav Sharma", "Sita Thapa", "Bijay Gurung", "Anita Rai", "Sunil Magar", "Gita Tamang", 
                "Ramesh KC", "Sunita Shrestha", "Prakash Limbu", "Maya Poudel", "Anil Bhandari", "Kabita Adhikari"]
FILIPINO_NAMES = ["Juan Santos", "Maria Garcia", "Jose Cruz", "Ana Reyes", "Pedro Ramos", "Rosa Torres",
                  "Carlos Mendoza", "Lucia Aquino", "Miguel Bautista", "Elena Villanueva", "Rico Dela Cruz", "Sofia Manalo"]
GLOBAL_NAMES = ["John Smith", "Emma Wilson", "Michael Brown", "Sarah Davis", "James Miller", "Emily Johnson",
                "David Lee", "Jessica Wang", "Robert Chen", "Amanda Kim", "William Park", "Jennifer Liu"]

SKILLS = ["python", "javascript", "react", "node", "java", "kotlin", "swift", "go", "rust", "sql",
          "mongodb", "aws", "gcp", "kubernetes", "docker", "ml", "tensorflow", "pytorch", "data_analysis",
          "figma", "product_management", "agile", "devops", "security", "blockchain"]

STAGES = ["applied", "screening", "interview", "selected", "training", "visa_processing", "employed", "retention_risk"]
INDUSTRIES = ["IT", "BPO", "Finance", "Healthcare", "Manufacturing", "Retail", "Logistics", "Education", "Energy", "Media"]

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute('''CREATE TABLE IF NOT EXISTS twins (
        id TEXT PRIMARY KEY, type TEXT NOT NULL, name TEXT,
        state TEXT DEFAULT 'active', data TEXT, version INTEGER DEFAULT 1,
        created_at TEXT, updated_at TEXT
    )''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS twin_history (
        id TEXT PRIMARY KEY, twin_id TEXT, version INTEGER,
        changes TEXT, changed_by TEXT, timestamp TEXT
    )''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS twin_relations (
        id TEXT PRIMARY KEY, source_id TEXT, target_id TEXT,
        relation_type TEXT, weight REAL DEFAULT 1.0, data TEXT, created_at TEXT
    )''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS sovereign_identities (
        id TEXT PRIMARY KEY, zero_id TEXT UNIQUE, twin_id TEXT,
        public_key TEXT, jurisdiction TEXT, status TEXT DEFAULT 'active', created_at TEXT
    )''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS sovereign_consents (
        id TEXT PRIMARY KEY, identity_id TEXT, consumer_id TEXT, consumer_type TEXT,
        purpose TEXT, asset_types TEXT, conditions TEXT,
        granted_at TEXT, expires_at TEXT, revoked_at TEXT, status TEXT DEFAULT 'active'
    )''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS sovereign_audit (
        id TEXT PRIMARY KEY, identity_id TEXT, actor_id TEXT, actor_type TEXT,
        action TEXT, resource TEXT, decision TEXT, reason TEXT, ip_address TEXT, timestamp TEXT
    )''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY, type TEXT, entity_id TEXT, data TEXT, timestamp TEXT
    )''')
    
    c.execute("SELECT COUNT(*) FROM twins")
    if c.fetchone()[0] == 0:
        seed_large_data(c)
    
    conn.commit()
    conn.close()

def seed_large_data(c):
    now = datetime.now().isoformat()
    
    # 도시 12개
    cities = [
        ("city-seoul", "Seoul", "KR", 500, 52000),
        ("city-busan", "Busan", "KR", 180, 45000),
        ("city-incheon", "Incheon", "KR", 120, 48000),
        ("city-clark", "Clark", "PH", 150, 28000),
        ("city-manila", "Manila", "PH", 220, 32000),
        ("city-cebu", "Cebu", "PH", 90, 26000),
        ("city-kathmandu", "Kathmandu", "NP", 80, 15000),
        ("city-pokhara", "Pokhara", "NP", 30, 12000),
        ("city-dubai", "Dubai", "AE", 50, 65000),
        ("city-singapore", "Singapore", "SG", 120, 72000),
        ("city-tokyo", "Tokyo", "JP", 90, 68000),
        ("city-osaka", "Osaka", "JP", 60, 62000),
    ]
    for cid, name, country, talent_count, avg_salary in cities:
        data = json.dumps({"country": country, "talent_count": talent_count, "avg_salary": avg_salary, "employers": random.randint(20, 100)})
        c.execute("INSERT INTO twins VALUES (?,?,?,?,?,1,?,?)", (cid, "city", name, "active", data, now, now))
    
    # 기업 30개
    company_names = ["TechCorp", "GlobalHire", "FinTech", "Samsung SDS", "Accenture", "DBS Bank", "Rakuten", "Grab",
                     "Converge", "LG CNS", "Teleperformance", "F1Soft", "CloudWalk", "Emirates NBD", "POSCO",
                     "Naver", "Kakao", "LINE", "Sea Group", "Gojek", "Shopee", "Lazada", "Toss", "Coupang",
                     "Hyundai", "SK Telecom", "KT", "CJ", "Lotte", "Hanwha"]
    
    city_list = [c[0] for c in cities]
    for i, name in enumerate(company_names):
        eid = f"employer-E{i+1:03d}"
        city = random.choice(city_list)
        industry = random.choice(INDUSTRIES)
        hired = random.randint(20, 150)
        demand = hired + random.randint(10, 50)
        salary = random.randint(25000, 80000)
        
        data = json.dumps({
            "city": city, "industry": industry, "hired": hired, "demand": demand,
            "avg_salary": salary, "retention_rate": round(random.uniform(0.7, 0.95), 2),
            "growth_rate": round(random.uniform(-0.1, 0.3), 2)
        })
        c.execute("INSERT INTO twins VALUES (?,?,?,?,?,1,?,?)", (eid, "employer", name, "active", data, now, now))
    
    employer_list = [f"employer-E{i+1:03d}" for i in range(len(company_names))]
    
    # 인재 200명
    all_names = KOREAN_NAMES + NEPALI_NAMES + FILIPINO_NAMES + GLOBAL_NAMES
    
    for talent_id in range(1, 201):
        city = random.choice(city_list)
        name = random.choice(all_names) + f" {talent_id}"
        
        stage = random.choices(STAGES, weights=[15, 15, 12, 8, 15, 8, 20, 7])[0]
        employer = random.choice(employer_list) if stage in ["employed", "retention_risk"] else None
        salary = random.randint(20000, 85000) if employer else 0
        satisfaction = random.randint(35, 95) if employer else random.randint(60, 90)
        
        skills = random.sample(SKILLS, random.randint(2, 6))
        tenure = random.randint(1, 48) if employer else 0
        
        tid = f"talent-T{talent_id:03d}"
        data = json.dumps({
            "stage": stage, "city": city, "employer": employer,
            "score": round(random.uniform(55, 98), 1),
            "satisfaction": satisfaction, "salary": salary,
            "skills": skills, "tenure_months": tenure,
            "education": random.choice(["bachelor", "master", "phd", "diploma"]),
            "experience_years": random.randint(0, 15),
            "language": random.sample(["korean", "english", "japanese", "chinese", "nepali", "tagalog"], random.randint(1, 3))
        })
        c.execute("INSERT INTO twins VALUES (?,?,?,?,?,1,?,?)", (tid, "talent", name, "active", data, now, now))
        
        # Sovereign Identity
        zero_id = hashlib.sha256(f"{tid}-{secrets.token_hex(8)}".encode()).hexdigest()[:16]
        sid = f"sov-{talent_id:04d}"
        c.execute("INSERT INTO sovereign_identities VALUES (?,?,?,?,?,?,?)",
                 (sid, zero_id, tid, secrets.token_hex(32), "XX", "active", now))
        
        # 랜덤 동의
        if random.random() > 0.4:
            con_id = f"con-{talent_id:04d}"
            consumer = random.choice(employer_list + city_list)
            consumer_type = "employer" if consumer.startswith("employer") else "city"
            purpose = random.choice(["recruitment", "display", "analytics", "training"])
            assets = random.sample(["profile", "skills", "resume", "contact", "education"], random.randint(1, 4))
            expires = (datetime.now() + timedelta(days=random.randint(30, 365))).isoformat()
            c.execute("INSERT INTO sovereign_consents VALUES (?,?,?,?,?,?,?,?,?,NULL,?)",
                     (con_id, sid, consumer, consumer_type, purpose, json.dumps(assets), "{}", now, expires, "active"))

init_db()

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def gen_id(prefix=""):
    return f"{prefix}{uuid.uuid4().hex[:12]}"

ws_clients: List[WebSocket] = []

async def broadcast(msg: Dict):
    for ws in ws_clients[:]:
        try: await ws.send_json(msg)
        except: 
            if ws in ws_clients: ws_clients.remove(ws)

# ============ 자동 생성 ============

async def auto_generate_loop():
    global auto_generate
    while auto_generate:
        try:
            conn = get_db()
            now = datetime.now()
            
            talents = conn.execute("SELECT id, data FROM twins WHERE type='talent'").fetchall()
            if talents:
                talent = random.choice(talents)
                tid = talent["id"]
                data = json.loads(talent["data"]) if talent["data"] else {}
                
                event_type = random.choice(["satisfaction_change", "stage_change", "salary_change"])
                
                if event_type == "satisfaction_change":
                    old_val = data.get("satisfaction", 70)
                    new_val = max(30, min(100, old_val + random.randint(-10, 10)))
                    delta = {"satisfaction": {"old": old_val, "new": new_val}}
                    data["satisfaction"] = new_val
                elif event_type == "stage_change":
                    old_val = data.get("stage", "applied")
                    idx = STAGES.index(old_val) if old_val in STAGES else 0
                    new_idx = min(len(STAGES)-1, idx + random.choice([0, 1, 1]))
                    new_val = STAGES[new_idx]
                    delta = {"stage": {"old": old_val, "new": new_val}}
                    data["stage"] = new_val
                else:
                    old_val = data.get("salary", 0)
                    new_val = max(0, old_val + random.randint(-2000, 5000))
                    delta = {"salary": {"old": old_val, "new": new_val}}
                    data["salary"] = new_val
                
                conn.execute("UPDATE twins SET data=?, updated_at=? WHERE id=?", 
                           (json.dumps(data), now.isoformat(), tid))
                
                evt_id = gen_id("evt-")
                conn.execute("INSERT INTO events VALUES (?,?,?,?,?)",
                           (evt_id, event_type, tid, json.dumps(delta), now.isoformat()))
                
                conn.commit()
                await broadcast({"type": "auto_event", "event": event_type, "entity": tid, "delta": delta})
            
            conn.close()
        except Exception as e:
            print(f"Auto-gen error: {e}")
        
        await asyncio.sleep(5)

@app.post("/auto/start")
async def start_auto():
    global auto_generate, auto_task
    if not auto_generate:
        auto_generate = True
        auto_task = asyncio.create_task(auto_generate_loop())
    return {"status": "started", "interval": "5s"}

@app.post("/auto/stop")
async def stop_auto():
    global auto_generate
    auto_generate = False
    return {"status": "stopped"}

@app.get("/auto/status")
def auto_status():
    return {"running": auto_generate}

# ============ 데이터 생성 API ============

@app.post("/generate/talent")
async def generate_talent(count: int = 1):
    conn = get_db()
    now = datetime.now().isoformat()
    
    max_row = conn.execute("SELECT id FROM twins WHERE type='talent' ORDER BY id DESC LIMIT 1").fetchone()
    max_id = int(max_row["id"].split("-T")[1]) if max_row else 0
    
    city_list = [r["id"] for r in conn.execute("SELECT id FROM twins WHERE type='city'").fetchall()]
    employer_list = [r["id"] for r in conn.execute("SELECT id FROM twins WHERE type='employer'").fetchall()]
    all_names = KOREAN_NAMES + NEPALI_NAMES + FILIPINO_NAMES + GLOBAL_NAMES
    
    created = []
    for i in range(count):
        talent_id = max_id + i + 1
        city = random.choice(city_list)
        stage = random.choice(STAGES)
        employer = random.choice(employer_list) if stage in ["employed", "retention_risk"] else None
        salary = random.randint(20000, 80000) if employer else 0
        satisfaction = random.randint(35, 95) if employer else random.randint(60, 90)
        
        tid = f"talent-T{talent_id:03d}"
        name = random.choice(all_names) + f" {talent_id}"
        
        data = json.dumps({
            "stage": stage, "city": city, "employer": employer,
            "score": round(random.uniform(55, 98), 1),
            "satisfaction": satisfaction, "salary": salary,
            "skills": random.sample(SKILLS, random.randint(2, 5)),
            "tenure_months": random.randint(0, 36) if employer else 0
        })
        
        conn.execute("INSERT INTO twins VALUES (?,?,?,?,?,1,?,?)", (tid, "talent", name, "active", data, now, now))
        
        zero_id = hashlib.sha256(f"{tid}-{secrets.token_hex(8)}".encode()).hexdigest()[:16]
        sid = f"sov-{talent_id:04d}"
        conn.execute("INSERT INTO sovereign_identities VALUES (?,?,?,?,?,?,?)",
                    (sid, zero_id, tid, secrets.token_hex(32), "XX", "active", now))
        
        created.append({"id": tid, "name": name, "stage": stage})
    
    conn.commit()
    conn.close()
    
    await broadcast({"type": "talents_generated", "count": count})
    return {"created": count, "talents": created[:10]}

@app.post("/generate/employer")
async def generate_employer(count: int = 1):
    conn = get_db()
    now = datetime.now().isoformat()
    
    max_row = conn.execute("SELECT id FROM twins WHERE type='employer' ORDER BY id DESC LIMIT 1").fetchone()
    max_id = int(max_row["id"].split("-E")[1]) if max_row else 0
    
    city_list = [r["id"] for r in conn.execute("SELECT id FROM twins WHERE type='city'").fetchall()]
    companies = ["NextGen", "DataFlow", "CloudNine", "AIVentures", "CodeCraft", "DevOps Inc", 
                 "FinNext", "HealthTech", "EduSmart", "LogiCore", "RetailPro", "ManuTech", "BioTech", "GreenEnergy"]
    
    created = []
    for i in range(count):
        eid = f"employer-E{max_id + i + 1:03d}"
        name = random.choice(companies) + f" {max_id + i + 1}"
        city = random.choice(city_list)
        industry = random.choice(INDUSTRIES)
        
        data = json.dumps({
            "city": city, "industry": industry,
            "hired": random.randint(10, 100), "demand": random.randint(20, 150),
            "avg_salary": random.randint(25000, 80000),
            "retention_rate": round(random.uniform(0.7, 0.95), 2)
        })
        
        conn.execute("INSERT INTO twins VALUES (?,?,?,?,?,1,?,?)", (eid, "employer", name, "active", data, now, now))
        created.append({"id": eid, "name": name, "industry": industry})
    
    conn.commit()
    conn.close()
    
    await broadcast({"type": "employers_generated", "count": count})
    return {"created": count, "employers": created}

@app.post("/generate/events")
async def generate_events(count: int = 10):
    conn = get_db()
    now = datetime.now()
    
    talents = conn.execute("SELECT id, data FROM twins WHERE type='talent'").fetchall()
    events = []
    
    for _ in range(count):
        talent = random.choice(talents)
        tid = talent["id"]
        data = json.loads(talent["data"]) if talent["data"] else {}
        
        event_type = random.choice(["satisfaction_change", "stage_change", "salary_change"])
        
        if event_type == "satisfaction_change":
            old_val = data.get("satisfaction", 70)
            new_val = max(30, min(100, old_val + random.randint(-15, 15)))
            delta = {"satisfaction": {"old": old_val, "new": new_val}}
            data["satisfaction"] = new_val
        elif event_type == "stage_change":
            old_val = data.get("stage", "applied")
            new_val = random.choice(STAGES)
            delta = {"stage": {"old": old_val, "new": new_val}}
            data["stage"] = new_val
        else:
            old_val = data.get("salary", 0)
            new_val = max(0, old_val + random.randint(-3000, 8000))
            delta = {"salary": {"old": old_val, "new": new_val}}
            data["salary"] = new_val
        
        timestamp = (now - timedelta(minutes=random.randint(0, 1440))).isoformat()
        conn.execute("UPDATE twins SET data=?, updated_at=? WHERE id=?", (json.dumps(data), timestamp, tid))
        
        evt_id = gen_id("evt-")
        conn.execute("INSERT INTO events VALUES (?,?,?,?,?)", (evt_id, event_type, tid, json.dumps(delta), timestamp))
        events.append({"event_id": evt_id, "type": event_type, "entity": tid})
    
    conn.commit()
    conn.close()
    
    await broadcast({"type": "events_generated", "count": count})
    return {"generated": count, "events": events[:5]}

# ============ 고급 분석 API ============

@app.get("/analytics/overview")
def analytics_overview():
    conn = get_db()
    
    total = conn.execute("SELECT COUNT(*) FROM twins WHERE type='talent'").fetchone()[0]
    
    stages = {}
    for row in conn.execute("SELECT json_extract(data, '$.stage') as s, COUNT(*) as c FROM twins WHERE type='talent' GROUP BY s"):
        stages[row["s"]] = row["c"]
    
    cities = {}
    for row in conn.execute("SELECT json_extract(data, '$.city') as c, COUNT(*) as cnt FROM twins WHERE type='talent' GROUP BY c"):
        city_name = row["c"].replace("city-", "") if row["c"] else "unknown"
        cities[city_name] = row["cnt"]
    
    avg_satisfaction = conn.execute("SELECT AVG(json_extract(data, '$.satisfaction')) FROM twins WHERE type='talent'").fetchone()[0]
    avg_salary = conn.execute("SELECT AVG(json_extract(data, '$.salary')) FROM twins WHERE type='talent' AND json_extract(data, '$.salary') > 0").fetchone()[0]
    
    conn.close()
    
    return {
        "total_talents": total,
        "by_stage": stages,
        "by_city": cities,
        "avg_satisfaction": round(avg_satisfaction or 0, 1),
        "avg_salary": round(avg_salary or 0, 0)
    }

@app.get("/analytics/risk")
def analytics_risk():
    conn = get_db()
    rows = conn.execute("SELECT * FROM twins WHERE type='talent'").fetchall()
    conn.close()
    
    critical, high, medium, low = [], [], [], []
    
    for row in rows:
        data = json.loads(row["data"]) if row["data"] else {}
        risk = 0.0
        
        sat = data.get("satisfaction", 70)
        if sat < 50: risk += 0.5
        elif sat < 65: risk += 0.3
        
        if data.get("stage") == "retention_risk": risk += 0.3
        
        tenure = data.get("tenure_months", 0)
        if 18 < tenure < 30: risk += 0.15
        
        risk = min(risk, 1.0)
        item = {"id": row["id"], "name": row["name"], "risk": round(risk, 2), "satisfaction": sat}
        
        if risk > 0.7: critical.append(item)
        elif risk > 0.5: high.append(item)
        elif risk > 0.25: medium.append(item)
        else: low.append(item)
    
    return {
        "summary": {"critical": len(critical), "high": len(high), "medium": len(medium), "low": len(low)},
        "critical_list": sorted(critical, key=lambda x: -x["risk"])[:20],
        "high_list": sorted(high, key=lambda x: -x["risk"])[:20]
    }

@app.get("/analytics/city/{city_id}")
def analytics_city(city_id: str):
    conn = get_db()
    
    city = conn.execute("SELECT * FROM twins WHERE id=?", (city_id,)).fetchone()
    if not city:
        conn.close()
        raise HTTPException(404, "City not found")
    
    talents = conn.execute("SELECT * FROM twins WHERE type='talent' AND json_extract(data, '$.city')=?", (city_id,)).fetchall()
    employers = conn.execute("SELECT * FROM twins WHERE type='employer' AND json_extract(data, '$.city')=?", (city_id,)).fetchall()
    
    stages = {}
    total_salary = 0
    salary_count = 0
    total_satisfaction = 0
    
    for t in talents:
        data = json.loads(t["data"]) if t["data"] else {}
        stage = data.get("stage", "unknown")
        stages[stage] = stages.get(stage, 0) + 1
        if data.get("salary", 0) > 0:
            total_salary += data["salary"]
            salary_count += 1
        total_satisfaction += data.get("satisfaction", 0)
    
    conn.close()
    
    return {
        "city": dict(city),
        "talent_count": len(talents),
        "employer_count": len(employers),
        "by_stage": stages,
        "avg_salary": round(total_salary / salary_count, 0) if salary_count > 0 else 0,
        "avg_satisfaction": round(total_satisfaction / len(talents), 1) if talents else 0
    }

@app.get("/analytics/employer/{employer_id}")
def analytics_employer(employer_id: str):
    conn = get_db()
    
    employer = conn.execute("SELECT * FROM twins WHERE id=?", (employer_id,)).fetchone()
    if not employer:
        conn.close()
        raise HTTPException(404, "Employer not found")
    
    talents = conn.execute("SELECT * FROM twins WHERE type='talent' AND json_extract(data, '$.employer')=?", (employer_id,)).fetchall()
    
    stages = {}
    skills = {}
    total_satisfaction = 0
    risk_count = 0
    
    for t in talents:
        data = json.loads(t["data"]) if t["data"] else {}
        stage = data.get("stage", "unknown")
        stages[stage] = stages.get(stage, 0) + 1
        total_satisfaction += data.get("satisfaction", 0)
        if data.get("satisfaction", 100) < 60:
            risk_count += 1
        for skill in data.get("skills", []):
            skills[skill] = skills.get(skill, 0) + 1
    
    conn.close()
    
    top_skills = sorted(skills.items(), key=lambda x: -x[1])[:10]
    
    return {
        "employer": dict(employer),
        "employee_count": len(talents),
        "by_stage": stages,
        "avg_satisfaction": round(total_satisfaction / len(talents), 1) if talents else 0,
        "at_risk_count": risk_count,
        "top_skills": dict(top_skills)
    }

# ============ 기존 API (Twin, Sovereign, Predict, Simulate) ============

@app.get("/twin")
def list_twins(type: str = None, limit: int = 100):
    conn = get_db()
    if type:
        rows = conn.execute("SELECT * FROM twins WHERE type=? LIMIT ?", (type, limit)).fetchall()
    else:
        rows = conn.execute("SELECT * FROM twins LIMIT ?", (limit,)).fetchall()
    conn.close()
    return [dict(r) | {"data": json.loads(r["data"]) if r["data"] else {}} for r in rows]

@app.get("/twin/{twin_id}")
def get_twin(twin_id: str):
    conn = get_db()
    row = conn.execute("SELECT * FROM twins WHERE id=?", (twin_id,)).fetchone()
    conn.close()
    if not row: raise HTTPException(404, "Twin not found")
    return dict(row) | {"data": json.loads(row["data"]) if row["data"] else {}}

class TwinUpdate(BaseModel):
    data: Dict
    reason: str = ""

@app.put("/twin/{twin_id}")
async def update_twin(twin_id: str, update: TwinUpdate, x_actor: str = Header(default="system")):
    conn = get_db()
    row = conn.execute("SELECT * FROM twins WHERE id=?", (twin_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "Twin not found")
    
    current_data = json.loads(row["data"]) if row["data"] else {}
    new_version = row["version"] + 1
    now = datetime.now().isoformat()
    
    delta = {k: {"old": current_data.get(k), "new": v} for k, v in update.data.items() if current_data.get(k) != v}
    if not delta:
        conn.close()
        return {"changed": False}
    
    for k, v in update.data.items():
        current_data[k] = v
    
    conn.execute("UPDATE twins SET data=?, version=?, updated_at=? WHERE id=?", (json.dumps(current_data), new_version, now, twin_id))
    conn.execute("INSERT INTO twin_history VALUES (?,?,?,?,?,?)", (gen_id("hist-"), twin_id, new_version, json.dumps(delta), x_actor, now))
    conn.commit()
    conn.close()
    
    await broadcast({"type": "twin_updated", "twin_id": twin_id, "delta": delta})
    return {"changed": True, "version": new_version, "delta": delta}

@app.get("/twin/{twin_id}/history")
def get_twin_history(twin_id: str):
    conn = get_db()
    rows = conn.execute("SELECT * FROM twin_history WHERE twin_id=? ORDER BY timestamp DESC LIMIT 50", (twin_id,)).fetchall()
    conn.close()
    return [dict(r) | {"changes": json.loads(r["changes"]) if r["changes"] else {}} for r in rows]

@app.get("/sovereign/identity")
def list_identities(limit: int = 100):
    conn = get_db()
    rows = conn.execute("SELECT si.*, t.name as twin_name FROM sovereign_identities si LEFT JOIN twins t ON si.twin_id = t.id LIMIT ?", (limit,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get("/sovereign/identity/{identity_id}")
def get_identity(identity_id: str):
    conn = get_db()
    row = conn.execute("SELECT * FROM sovereign_identities WHERE id=?", (identity_id,)).fetchone()
    conn.close()
    if not row: raise HTTPException(404, "Identity not found")
    return dict(row)

class ConsentRequest(BaseModel):
    consumer_id: str
    consumer_type: str
    purpose: str
    asset_types: List[str]
    duration_days: int = 365

@app.post("/sovereign/consent/{identity_id}")
async def grant_consent(identity_id: str, req: ConsentRequest):
    conn = get_db()
    if not conn.execute("SELECT 1 FROM sovereign_identities WHERE id=?", (identity_id,)).fetchone():
        conn.close()
        raise HTTPException(404, "Identity not found")
    
    now = datetime.now()
    consent_id = gen_id("con-")
    expires = (now + timedelta(days=req.duration_days)).isoformat()
    
    conn.execute("INSERT INTO sovereign_consents VALUES (?,?,?,?,?,?,?,?,?,NULL,?)",
                (consent_id, identity_id, req.consumer_id, req.consumer_type, req.purpose,
                 json.dumps(req.asset_types), "{}", now.isoformat(), expires, "active"))
    conn.execute("INSERT INTO sovereign_audit VALUES (?,?,?,?,?,?,?,?,?,?)",
                (gen_id("aud-"), identity_id, identity_id, "owner", "consent_granted", f"consent:{consent_id}", "allowed", f"Granted to {req.consumer_id}", "", now.isoformat()))
    conn.commit()
    conn.close()
    
    await broadcast({"type": "consent_granted", "consent_id": consent_id})
    return {"consent_id": consent_id, "expires_at": expires}

@app.delete("/sovereign/consent/{consent_id}")
async def revoke_consent(consent_id: str):
    conn = get_db()
    row = conn.execute("SELECT * FROM sovereign_consents WHERE id=?", (consent_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "Consent not found")
    
    now = datetime.now().isoformat()
    conn.execute("UPDATE sovereign_consents SET revoked_at=?, status='revoked' WHERE id=?", (now, consent_id))
    conn.execute("INSERT INTO sovereign_audit VALUES (?,?,?,?,?,?,?,?,?,?)",
                (gen_id("aud-"), row["identity_id"], "owner", "owner", "consent_revoked", f"consent:{consent_id}", "executed", "Revoked", "", now))
    conn.commit()
    conn.close()
    
    await broadcast({"type": "consent_revoked", "consent_id": consent_id})
    return {"revoked": True}

@app.get("/sovereign/consent/{identity_id}/list")
def list_consents(identity_id: str):
    conn = get_db()
    rows = conn.execute("SELECT * FROM sovereign_consents WHERE identity_id=?", (identity_id,)).fetchall()
    conn.close()
    return [dict(r) | {"asset_types": json.loads(r["asset_types"]) if r["asset_types"] else []} for r in rows]

class AccessRequest(BaseModel):
    identity_id: str
    consumer_id: str
    consumer_type: str
    purpose: str
    asset_type: str

@app.post("/sovereign/access/check")
async def check_access(req: AccessRequest):
    conn = get_db()
    now = datetime.now()
    
    consent = conn.execute("SELECT * FROM sovereign_consents WHERE identity_id=? AND consumer_id=? AND consumer_type=? AND purpose=? AND status='active' AND expires_at > ?",
        (req.identity_id, req.consumer_id, req.consumer_type, req.purpose, now.isoformat())).fetchone()
    
    decision, reason = "denied", "No valid consent"
    if consent:
        assets = json.loads(consent["asset_types"]) if consent["asset_types"] else []
        if req.asset_type in assets or "*" in assets:
            decision, reason = "allowed", "Valid consent"
        else:
            reason = f"Asset '{req.asset_type}' not in consent"
    
    conn.execute("INSERT INTO sovereign_audit VALUES (?,?,?,?,?,?,?,?,?,?)",
                (gen_id("aud-"), req.identity_id, req.consumer_id, req.consumer_type, "access_check", req.asset_type, decision, reason, "", now.isoformat()))
    conn.commit()
    conn.close()
    
    return {"allowed": decision == "allowed", "decision": decision, "reason": reason}

@app.get("/sovereign/audit/{identity_id}")
def get_audit_log(identity_id: str):
    conn = get_db()
    rows = conn.execute("SELECT * FROM sovereign_audit WHERE identity_id=? ORDER BY timestamp DESC LIMIT 50", (identity_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def calc_risk(data: Dict) -> tuple:
    risk, factors = 0.0, []
    sat = data.get("satisfaction", 70)
    if sat < 50: risk += 0.5; factors.append("very_low_satisfaction")
    elif sat < 65: risk += 0.3; factors.append("low_satisfaction")
    if data.get("stage") == "retention_risk": risk += 0.3; factors.append("retention_risk_stage")
    if 18 < data.get("tenure_months", 0) < 30: risk += 0.15; factors.append("2_year_itch")
    return min(risk, 1.0), factors

@app.get("/predict/retention/{twin_id}")
def predict_retention(twin_id: str):
    conn = get_db()
    row = conn.execute("SELECT * FROM twins WHERE id=? AND type='talent'", (twin_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "Talent not found")
    data = json.loads(row["data"]) if row["data"] else {}
    risk, factors = calc_risk(data)
    level = "CRITICAL" if risk > 0.7 else "HIGH" if risk > 0.5 else "MEDIUM" if risk > 0.25 else "LOW"
    conn.close()
    return {"twin_id": twin_id, "name": row["name"], "risk_score": round(risk, 3), "risk_level": level, "factors": factors}

@app.get("/predict/all")
def predict_all():
    conn = get_db()
    rows = conn.execute("SELECT * FROM twins WHERE type='talent'").fetchall()
    conn.close()
    results = []
    for row in rows:
        data = json.loads(row["data"]) if row["data"] else {}
        risk, factors = calc_risk(data)
        level = "CRITICAL" if risk > 0.7 else "HIGH" if risk > 0.5 else "MEDIUM" if risk > 0.25 else "LOW"
        results.append({"twin_id": row["id"], "name": row["name"], "risk": round(risk, 3), "level": level, "factors": factors})
    critical = len([r for r in results if r["level"] == "CRITICAL"])
    high = len([r for r in results if r["level"] == "HIGH"])
    return {"total": len(results), "critical": critical, "high": high, "predictions": results}

class SimScenario(BaseModel):
    twin_id: str
    changes: Dict

@app.post("/simulate/what-if")
def simulate(scenario: SimScenario):
    conn = get_db()
    row = conn.execute("SELECT * FROM twins WHERE id=?", (scenario.twin_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "Twin not found")
    data = json.loads(row["data"]) if row["data"] else {}
    baseline, _ = calc_risk(data)
    for k, v in scenario.changes.items():
        data[k] = v
    result, _ = calc_risk(data)
    conn.close()
    return {"baseline": round(baseline, 3), "result": round(result, 3), "impact": round(baseline - result, 3), "recommendation": "PROCEED" if baseline - result > 0.1 else "NEUTRAL"}

@app.get("/stats")
def get_stats():
    conn = get_db()
    stats = {
        "twins": {
            "total": conn.execute("SELECT COUNT(*) FROM twins").fetchone()[0],
            "talents": conn.execute("SELECT COUNT(*) FROM twins WHERE type='talent'").fetchone()[0],
            "employers": conn.execute("SELECT COUNT(*) FROM twins WHERE type='employer'").fetchone()[0],
            "cities": conn.execute("SELECT COUNT(*) FROM twins WHERE type='city'").fetchone()[0]
        },
        "sovereign": {
            "identities": conn.execute("SELECT COUNT(*) FROM sovereign_identities").fetchone()[0],
            "active_consents": conn.execute("SELECT COUNT(*) FROM sovereign_consents WHERE status='active'").fetchone()[0]
        },
        "events": conn.execute("SELECT COUNT(*) FROM events").fetchone()[0],
        "talent_stages": {r["stage"]: r["cnt"] for r in conn.execute("SELECT json_extract(data, '$.stage') as stage, COUNT(*) as cnt FROM twins WHERE type='talent' GROUP BY stage")}
    }
    conn.close()
    return stats

@app.get("/events")
def get_events(limit: int = 50):
    conn = get_db()
    rows = conn.execute("SELECT * FROM events ORDER BY timestamp DESC LIMIT ?", (limit,)).fetchall()
    conn.close()
    return [dict(r) | {"data": json.loads(r["data"]) if r["data"] else {}} for r in rows]

@app.get("/")
def root():
    return {"name": "AUTUS v3.0", "status": "PRODUCTION", "features": ["digital_twin", "sovereign", "prediction", "simulation", "auto_generate", "analytics"], "docs": "/docs", "ui": "/ui"}

@app.get("/health")
def health():
    conn = get_db()
    h = {"status": "healthy", "twins": conn.execute("SELECT COUNT(*) FROM twins").fetchone()[0], "identities": conn.execute("SELECT COUNT(*) FROM sovereign_identities").fetchone()[0], "auto_generate": auto_generate}
    conn.close()
    return h

@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()
    ws_clients.append(ws)
    await ws.send_json({"type": "connected"})
    try:
        while True:
            await ws.receive_text()
    except:
        if ws in ws_clients: ws_clients.remove(ws)

@app.get("/ui", response_class=HTMLResponse)
def ui():
    return '''<!DOCTYPE html>
<html><head><title>AUTUS v3.0</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui;background:#0a0a0a;color:#fff;padding:20px}
h1{color:#00ff88;margin-bottom:5px}
.subtitle{color:#666;margin-bottom:20px}
.tabs{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap}
.tab{padding:8px 16px;background:#222;border:none;color:#fff;border-radius:6px;cursor:pointer;font-size:0.9rem}
.tab.active{background:#00ff88;color:#000}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:15px}
.card{background:#111;border:1px solid #222;border-radius:10px;padding:15px}
.card h2{font-size:0.8rem;color:#666;text-transform:uppercase;margin-bottom:12px}
.stat-row{display:flex;gap:15px;flex-wrap:wrap}
.stat-item{text-align:center;min-width:60px}
.stat-item .num{font-size:1.8rem;font-weight:bold;color:#00ff88}
.stat-item .label{font-size:0.7rem;color:#666}
.item{padding:10px;background:#1a1a1a;border-radius:6px;margin-bottom:6px;font-size:0.85rem}
.badge{padding:3px 8px;border-radius:12px;font-size:0.7rem;font-weight:600;float:right}
.critical{background:#ff000033;color:#ff4444}
.high{background:#ff660033;color:#ff8844}
.medium{background:#ffaa0033;color:#ffaa00}
.low{background:#00ff8833;color:#00ff88}
.btn{background:#00ff88;color:#000;border:none;padding:8px 14px;border-radius:6px;cursor:pointer;font-weight:600;margin:4px;font-size:0.85rem}
.btn:hover{background:#00cc6a}
.btn.danger{background:#ff4444}
.btn.danger:hover{background:#cc3333}
.log{font-family:monospace;font-size:0.75rem;padding:5px;background:#1a1a1a;margin-bottom:3px;border-radius:4px}
.section{display:none}
.section.active{display:block}
.scroll{max-height:350px;overflow-y:auto}
.auto-status{padding:8px 12px;border-radius:6px;display:inline-block;margin-bottom:10px}
.auto-on{background:#00ff8833;color:#00ff88}
.auto-off{background:#ff444433;color:#ff4444}
.chart-bar{height:20px;background:#00ff8855;border-radius:3px;margin:3px 0;position:relative}
.chart-bar span{position:absolute;right:5px;font-size:0.7rem}
</style></head><body>
<h1>AUTUS v3.0</h1>
<p class="subtitle">Digital Twin + Sovereign + Analytics</p>

<div class="tabs">
<button class="tab active" onclick="showTab('overview')">Overview</button>
<button class="tab" onclick="showTab('analytics')">Analytics</button>
<button class="tab" onclick="showTab('twins')">Twins</button>
<button class="tab" onclick="showTab('sovereign')">Sovereign</button>
<button class="tab" onclick="showTab('predictions')">Predictions</button>
<button class="tab" onclick="showTab('generate')">Generate</button>
</div>

<div id="overview" class="section active">
<div class="grid">
<div class="card"><h2>System</h2><div id="stats"></div></div>
<div class="card"><h2>Stage Distribution</h2><div id="stages"></div></div>
<div class="card"><h2>Recent Events</h2><div id="events" class="scroll"></div></div>
<div class="card"><h2>Risk Summary</h2><div id="risk-overview"></div></div>
</div>
</div>

<div id="analytics" class="section">
<div class="grid">
<div class="card"><h2>Talent Overview</h2><div id="talent-analytics"></div></div>
<div class="card"><h2>By City</h2><div id="city-analytics" class="scroll"></div></div>
<div class="card"><h2>Risk Distribution</h2><div id="risk-analytics"></div></div>
</div>
</div>

<div id="twins" class="section">
<div class="grid">
<div class="card"><h2>Talents</h2><div id="talents" class="scroll"></div></div>
<div class="card"><h2>Employers</h2><div id="employers" class="scroll"></div></div>
<div class="card"><h2>Cities</h2><div id="cities" class="scroll"></div></div>
</div>
</div>

<div id="sovereign" class="section">
<div class="grid">
<div class="card"><h2>Identities</h2><div id="identities" class="scroll"></div></div>
<div class="card"><h2>Audit Log</h2><div id="audit" class="scroll"></div></div>
</div>
</div>

<div id="predictions" class="section">
<div class="card">
<h2>Retention Risk</h2>
<div class="stat-row" id="risk-summary"></div>
<div id="pred-list" class="scroll" style="margin-top:15px"></div>
</div>
</div>

<div id="generate" class="section">
<div class="grid">
<div class="card">
<h2>Auto Generate</h2>
<div id="auto-status"></div>
<button class="btn" onclick="autoStart()">Start Auto</button>
<button class="btn danger" onclick="autoStop()">Stop Auto</button>
<p style="color:#666;margin-top:10px;font-size:0.8rem">Auto generates events every 5 seconds</p>
</div>
<div class="card">
<h2>Manual Generate</h2>
<button class="btn" onclick="gen('talent',10)">+10 Talents</button>
<button class="btn" onclick="gen('talent',50)">+50 Talents</button>
<button class="btn" onclick="gen('employer',5)">+5 Employers</button>
<button class="btn" onclick="genEvents(20)">+20 Events</button>
<button class="btn" onclick="genEvents(100)">+100 Events</button>
<div id="gen-result" style="margin-top:10px"></div>
</div>
</div>
</div>

<script>
let ws;
function showTab(name){
document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
document.getElementById(name).classList.add('active');
event.target.classList.add('active');
}

async function load(){
const s=await(await fetch('/stats')).json();
document.getElementById('stats').innerHTML=`
<div class="stat-row">
<div class="stat-item"><div class="num">${s.twins.talents}</div><div class="label">Talents</div></div>
<div class="stat-item"><div class="num">${s.twins.employers}</div><div class="label">Employers</div></div>
<div class="stat-item"><div class="num">${s.twins.cities}</div><div class="label">Cities</div></div>
<div class="stat-item"><div class="num">${s.sovereign.identities}</div><div class="label">Identities</div></div>
<div class="stat-item"><div class="num">${s.events}</div><div class="label">Events</div></div>
</div>`;

const maxStage=Math.max(...Object.values(s.talent_stages||{}));
document.getElementById('stages').innerHTML=Object.entries(s.talent_stages||{}).sort((a,b)=>b[1]-a[1]).map(([k,v])=>
`<div style="margin-bottom:5px"><small>${k}</small><div class="chart-bar" style="width:${v/maxStage*100}%"><span>${v}</span></div></div>`).join('');

const ev=await(await fetch('/events?limit=15')).json();
document.getElementById('events').innerHTML=ev.map(e=>
`<div class="log">${e.timestamp?.slice(11,19)||''} <span style="color:#00ff88">${e.type}</span> ${e.entity_id?.slice(-6)||''}</div>`).join('')||'No events';

const p=await(await fetch('/predict/all')).json();
document.getElementById('risk-overview').innerHTML=`
<div class="stat-row">
<div class="stat-item"><div class="num" style="color:#ff4444">${p.critical}</div><div class="label">Critical</div></div>
<div class="stat-item"><div class="num" style="color:#ff8844">${p.high}</div><div class="label">High</div></div>
<div class="stat-item"><div class="num">${p.total}</div><div class="label">Total</div></div>
</div>`;

document.getElementById('risk-summary').innerHTML=document.getElementById('risk-overview').innerHTML;
document.getElementById('pred-list').innerHTML=p.predictions.filter(x=>x.level!=='LOW').slice(0,30).map(x=>
`<div class="item">${x.name}<span class="badge ${x.level.toLowerCase()}">${x.level} (${x.risk})</span></div>`).join('');

const an=await(await fetch('/analytics/overview')).json();
document.getElementById('talent-analytics').innerHTML=`
<div class="stat-row">
<div class="stat-item"><div class="num">${an.total_talents}</div><div class="label">Total</div></div>
<div class="stat-item"><div class="num">${an.avg_satisfaction}</div><div class="label">Avg Sat</div></div>
<div class="stat-item"><div class="num">$${Math.round(an.avg_salary/1000)}k</div><div class="label">Avg Salary</div></div>
</div>`;

const maxCity=Math.max(...Object.values(an.by_city||{}));
document.getElementById('city-analytics').innerHTML=Object.entries(an.by_city||{}).sort((a,b)=>b[1]-a[1]).map(([k,v])=>
`<div style="margin-bottom:5px"><small>${k}</small><div class="chart-bar" style="width:${v/maxCity*100}%"><span>${v}</span></div></div>`).join('');

const risk=await(await fetch('/analytics/risk')).json();
document.getElementById('risk-analytics').innerHTML=`
<div class="stat-row">
<div class="stat-item"><div class="num" style="color:#ff4444">${risk.summary.critical}</div><div class="label">Critical</div></div>
<div class="stat-item"><div class="num" style="color:#ff8844">${risk.summary.high}</div><div class="label">High</div></div>
<div class="stat-item"><div class="num" style="color:#ffaa00">${risk.summary.medium}</div><div class="label">Medium</div></div>
<div class="stat-item"><div class="num" style="color:#00ff88">${risk.summary.low}</div><div class="label">Low</div></div>
</div>`;

const t=await(await fetch('/twin?type=talent&limit=50')).json();
document.getElementById('talents').innerHTML=t.map(x=>
`<div class="item"><b>${x.name}</b><br><small>${x.data?.stage} | sat:${x.data?.satisfaction}</small></div>`).join('');

const e=await(await fetch('/twin?type=employer')).json();
document.getElementById('employers').innerHTML=e.map(x=>
`<div class="item"><b>${x.name}</b><br><small>${x.data?.industry} | ${x.data?.hired}/${x.data?.demand}</small></div>`).join('');

const c=await(await fetch('/twin?type=city')).json();
document.getElementById('cities').innerHTML=c.map(x=>
`<div class="item"><b>${x.name}</b><br><small>${x.data?.country} | ${x.data?.talent_count} talents</small></div>`).join('');

const i=await(await fetch('/sovereign/identity?limit=30')).json();
document.getElementById('identities').innerHTML=i.map(x=>
`<div class="item"><b>${x.twin_name||'?'}</b><br><small>Zero: ${x.zero_id}</small></div>`).join('');

if(i.length>0){
const a=await(await fetch('/sovereign/audit/'+i[0].id)).json();
document.getElementById('audit').innerHTML=a.slice(0,15).map(x=>
`<div class="log">${x.timestamp?.slice(11,19)||''} ${x.action} <span style="color:${x.decision==='allowed'?'#00ff88':'#ff4444'}">${x.decision}</span></div>`).join('')||'No logs';
}

const auto=await(await fetch('/auto/status')).json();
document.getElementById('auto-status').innerHTML=`<span class="auto-status ${auto.running?'auto-on':'auto-off'}">${auto.running?'● Running':'○ Stopped'}</span>`;
}

async function gen(type,count){
const r=await(await fetch('/generate/'+type+'?count='+count,{method:'POST'})).json();
document.getElementById('gen-result').innerHTML=`<p style="color:#00ff88">✓ Created ${r.created} ${type}(s)</p>`;
load();
}
async function genEvents(count){
const r=await(await fetch('/generate/events?count='+count,{method:'POST'})).json();
document.getElementById('gen-result').innerHTML=`<p style="color:#00ff88">✓ Generated ${r.generated} events</p>`;
load();
}
async function autoStart(){
await fetch('/auto/start',{method:'POST'});
load();
}
async function autoStop(){
await fetch('/auto/stop',{method:'POST'});
load();
}

function connectWS(){
ws=new WebSocket('ws://'+location.host+'/ws');
ws.onmessage=()=>load();
ws.onclose=()=>setTimeout(connectWS,2000);
}

load();
connectWS();
setInterval(load,10000);
</script></body></html>'''
