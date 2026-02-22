"""
═══════════════════════════════════════════════════════════════════════════
AUTUS 2.0 - 11개 뷰 API 라우터
조종석, 지도, 날씨, 레이더, 스코어, 조류, 심전도, 현미경, 네트워크, 퍼널, 수정구
═══════════════════════════════════════════════════════════════════════════
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional, List, Dict, Any
from datetime import datetime, date, timedelta
import os
from supabase import create_client, Client

router = APIRouter(prefix="/api/v1", tags=["Views API"])

# Supabase 클라이언트
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

def get_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    return create_client(SUPABASE_URL, SUPABASE_KEY)

# ═══════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def format_time_ago(iso_time: str) -> str:
    try:
        dt = datetime.fromisoformat(iso_time.replace("Z", "+00:00"))
        now = datetime.now(dt.tzinfo) if dt.tzinfo else datetime.now()
        diff = now - dt
        if diff.days > 0: return f"{diff.days}일 전"
        elif diff.seconds > 3600: return f"{diff.seconds // 3600}시간 전"
        elif diff.seconds > 60: return f"{diff.seconds // 60}분 전"
        else: return "방금 전"
    except: return "알 수 없음"

def calculate_tenure(enrolled_at: str) -> int:
    if not enrolled_at: return 0
    try:
        dt = datetime.fromisoformat(enrolled_at.replace("Z", "+00:00"))
        now = datetime.now(dt.tzinfo) if dt.tzinfo else datetime.now()
        return max(0, (now.year - dt.year) * 12 + (now.month - dt.month))
    except: return 0

def generate_recommendation(temp_data: dict, sigma_factors: list) -> dict:
    zone = temp_data.get("zone", "normal")
    if zone == "critical":
        if any("비용" in f.get("factor_name", "") for f in sigma_factors):
            return {"strategyName": "가치 재인식 상담", "reasoning": "비용 민감도 높음", 
                    "tips": ["가격 대비 가치 강조", "성과 데이터 제시"], 
                    "expectedEffect": {"temperatureChange": 15, "churnReduction": 0.15}}
        return {"strategyName": "긴급 관계 회복", "reasoning": "위험 온도", 
                "tips": ["즉시 상담 예약", "불만 사항 청취"], 
                "expectedEffect": {"temperatureChange": 20, "churnReduction": 0.20}}
    elif zone == "warning":
        return {"strategyName": "선제적 케어", "reasoning": "주의 단계", 
                "tips": ["정기 체크인", "피드백 수집"], 
                "expectedEffect": {"temperatureChange": 10, "churnReduction": 0.10}}
    return {"strategyName": "관계 강화", "reasoning": "양호한 상태", 
            "tips": ["감사 표현", "VIP 혜택"], 
            "expectedEffect": {"temperatureChange": 5, "churnReduction": 0.05}}

# ═══════════════════════════════════════════════════════════════════════════
# 1. COCKPIT API (조종석)
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/cockpit/summary")
async def get_cockpit_summary(org_id: str = Query(...), db: Client = Depends(get_supabase)):
    """조종석 전체 요약"""
    stats = db.table("organization_stats").select("*").eq("org_id", org_id).single().execute()
    alerts = db.table("alerts").select("*").eq("org_id", org_id).eq("status", "active").order("created_at", desc=True).limit(5).execute()
    actions = db.table("actions").select("*, users!assignee_id(name)").eq("org_id", org_id).eq("status", "pending").order("priority").limit(5).execute()
    events = db.table("external_events").select("*").eq("org_id", org_id).gte("event_date", date.today().isoformat()).limit(1).execute()
    sentiments = db.table("external_sentiments").select("*").eq("org_id", org_id).eq("trend", "rising").limit(1).execute()
    
    s = stats.data or {}
    return {
        "status": {"level": s.get("status_level", "green"), "label": s.get("status_label", "양호")},
        "internal": {
            "customerCount": s.get("total_customers", 0),
            "avgTemperature": float(s.get("avg_temperature", 50)),
            "riskCount": s.get("risk_customers", 0),
            "warningCount": s.get("warning_customers", 0),
            "healthyCount": s.get("healthy_customers", 0)
        },
        "external": {
            "sigma": float(s.get("sigma_external", 1.0)),
            "weatherLabel": events.data[0]["event_name"] if events.data else "맑음",
            "threatCount": len([a for a in (alerts.data or []) if a.get("level") in ["critical", "warning"]]),
            "opportunityCount": len([a for a in (alerts.data or []) if a.get("level") == "opportunity"]),
            "heartbeatKeyword": sentiments.data[0]["keyword"] if sentiments.data else None
        },
        "alerts": [{"id": a["id"], "level": a["level"], "title": a["title"], "time": format_time_ago(a["created_at"])} for a in (alerts.data or [])],
        "actions": [{"id": a["id"], "priority": a["priority"], "title": a["title"], "context": a.get("context", ""), "assignee": a.get("users", {}).get("name", "미배정") if a.get("users") else "미배정", "studentId": a.get("customer_id")} for a in (actions.data or [])]
    }

# ═══════════════════════════════════════════════════════════════════════════
# 2. MAP API (지도)
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/map/customers")
async def get_map_customers(org_id: str = Query(...), db: Client = Depends(get_supabase)):
    """고객 위치 분포 (customer_temperatures 없으면 기본값 50/normal 반환)"""
    try:
        result = db.table("customers").select("id, name, location, customer_temperatures(temperature, zone)").eq("org_id", org_id).execute()
    except Exception:
        try:
            result = db.table("customers").select("id, name, location").eq("org_id", org_id).execute()
        except Exception:
            return []
    customers = []
    for c in (result.data or []):
        loc = c.get("location", {}) or {}
        temp = c.get("customer_temperatures", [{}])[0] if c.get("customer_temperatures") else {}
        if loc.get("lat") and loc.get("lng"):
            customers.append({"id": c["id"], "name": c["name"], "lat": loc["lat"], "lng": loc["lng"], "temp": float(temp.get("temperature", 50)), "zone": temp.get("zone", "normal")})
    return customers

@router.get("/map/competitors")
async def get_map_competitors(org_id: str = Query(...), db: Client = Depends(get_supabase)):
    """경쟁사 위치"""
    result = db.table("competitors").select("*").eq("org_id", org_id).execute()
    return [{"id": c["id"], "name": c["name"], "lat": c.get("location", {}).get("lat"), "lng": c.get("location", {}).get("lng"), "threat": c.get("threat_level", "medium")} for c in (result.data or []) if c.get("location", {}).get("lat")]

# ═══════════════════════════════════════════════════════════════════════════
# 3. WEATHER API (날씨)
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/weather/forecast")
async def get_weather_forecast(org_id: str = Query(...), days: int = Query(7), db: Client = Depends(get_supabase)):
    """7일 예보"""
    today = date.today()
    events = db.table("external_events").select("*").eq("org_id", org_id).gte("event_date", today.isoformat()).lte("event_date", (today + timedelta(days=days)).isoformat()).execute()
    event_map = {e["event_date"]: e for e in (events.data or [])}
    
    forecast = []
    day_names = ['월', '화', '수', '목', '금', '토', '일']
    for i in range(days):
        d = today + timedelta(days=i)
        event = event_map.get(d.isoformat())
        sigma = 1.0 + (event.get("sigma_impact", 0) if event else 0)
        weather = "storm" if sigma < 0.7 else "rainy" if sigma < 0.85 else "cloudy" if sigma < 0.95 else "sunny"
        forecast.append({"date": d.strftime("%m/%d"), "day": day_names[d.weekday()], "weather": weather, "sigma": round(sigma, 2), "event": event["event_name"] if event else None})
    return forecast

# ═══════════════════════════════════════════════════════════════════════════
# 4. RADAR API (레이더)
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/radar/threats")
async def get_radar_threats(org_id: str = Query(...), db: Client = Depends(get_supabase)):
    """위협 목록"""
    alerts = db.table("alerts").select("*").eq("org_id", org_id).in_("level", ["critical", "warning"]).eq("status", "active").execute()
    return [{"id": a["id"], "name": a["title"], "severity": a["level"], "eta": 3, "impact": -0.15 if a["level"] == "critical" else -0.1} for a in (alerts.data or [])]

@router.get("/radar/opportunities")
async def get_radar_opportunities(org_id: str = Query(...), db: Client = Depends(get_supabase)):
    """기회 목록"""
    alerts = db.table("alerts").select("*").eq("org_id", org_id).eq("level", "opportunity").eq("status", "active").execute()
    return [{"id": a["id"], "name": a["title"], "potential": "high", "eta": 7, "impact": 0.1} for a in (alerts.data or [])]

# ═══════════════════════════════════════════════════════════════════════════
# 5. SCOREBOARD API (스코어보드)
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/score/competitors")
async def get_score_competitors(org_id: str = Query(...), db: Client = Depends(get_supabase)):
    """경쟁사 비교"""
    stats = db.table("organization_stats").select("*").eq("org_id", org_id).single().execute()
    competitors = db.table("competitors").select("*").eq("org_id", org_id).execute()
    our = stats.data or {}
    return [{"name": c["name"], "comparison": {"students": {"ours": our.get("total_customers", 0), "theirs": c.get("metrics", {}).get("students", 0), "win": our.get("total_customers", 0) > c.get("metrics", {}).get("students", 0)}}} for c in (competitors.data or [])]

@router.get("/score/goals")
async def get_score_goals(org_id: str = Query(...), db: Client = Depends(get_supabase)):
    """목표 대비 현황"""
    stats = db.table("organization_stats").select("*").eq("org_id", org_id).single().execute()
    s = stats.data or {}
    return [
        {"name": "재원수", "current": s.get("total_customers", 0), "target": 150, "progress": min(100, int(s.get("total_customers", 0) / 150 * 100))},
        {"name": "이탈률", "current": s.get("risk_customers", 0), "target": 3, "progress": max(0, 100 - s.get("risk_customers", 0) * 10)}
    ]

# ═══════════════════════════════════════════════════════════════════════════
# 6. TIDE API (조류)
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/tide/market")
async def get_tide_market(org_id: str = Query(...), db: Client = Depends(get_supabase)):
    """시장 트렌드"""
    sentiments = db.table("external_sentiments").select("*").eq("org_id", org_id).execute()
    if sentiments.data:
        avg = sum(s.get("sentiment", 0) for s in sentiments.data) / len(sentiments.data)
        return {"trend": "밀물" if avg > 0.1 else "썰물" if avg < -0.1 else "정체", "change": round(avg * 100, 1)}
    return {"trend": "정체", "change": 0}

@router.get("/tide/internal")
async def get_tide_internal(org_id: str = Query(...), db: Client = Depends(get_supabase)):
    """내부 트렌드"""
    stats = db.table("organization_stats").select("avg_temperature").eq("org_id", org_id).single().execute()
    avg_temp = float((stats.data or {}).get("avg_temperature", 50))
    return {"trend": "상승" if avg_temp > 60 else "하락" if avg_temp < 50 else "유지", "change": round(avg_temp - 50, 1)}

# ═══════════════════════════════════════════════════════════════════════════
# 7. HEARTBEAT API (심전도)
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/heartbeat/external")
async def get_heartbeat_external(org_id: str = Query(...), db: Client = Depends(get_supabase)):
    """외부 여론 키워드"""
    result = db.table("external_sentiments").select("*").eq("org_id", org_id).order("mention_count", desc=True).limit(10).execute()
    return [{"word": s["keyword"], "count": s["mention_count"], "trend": s["trend"]} for s in (result.data or [])]

@router.get("/heartbeat/voice")
async def get_heartbeat_voice(org_id: str = Query(...), db: Client = Depends(get_supabase)):
    """내부 Voice 키워드"""
    voices = db.table("voices").select("keywords").eq("org_id", org_id).execute()
    keyword_counts = {}
    for v in (voices.data or []):
        for kw in (v.get("keywords") or []):
            keyword_counts[kw] = keyword_counts.get(kw, 0) + 1
    sorted_kw = sorted(keyword_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    return [{"word": kw, "count": count, "trend": "stable"} for kw, count in sorted_kw]

@router.get("/heartbeat/resonance")
async def get_heartbeat_resonance(org_id: str = Query(...), db: Client = Depends(get_supabase)):
    """공명 분석"""
    external = await get_heartbeat_external(org_id, db)
    internal = await get_heartbeat_voice(org_id, db)
    ext_words = {e["word"].lower() for e in external}
    int_words = {i["word"].lower() for i in internal}
    common = ext_words & int_words
    if common:
        word = list(common)[0]
        return {"detected": True, "external": word, "internal": word, "correlation": 0.85}
    return {"detected": False, "correlation": 0}

# ═══════════════════════════════════════════════════════════════════════════
# 8. MICROSCOPE API (현미경)
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/microscope/{customer_id}")
async def get_microscope_detail(customer_id: str, db: Client = Depends(get_supabase)):
    """고객 상세 정보 (customer_temperatures 없으면 기본값 반환)"""
    customer = db.table("customers").select("*, users!executor_id(id, name), payer:users!payer_id(id, name, phone)").eq("id", customer_id).single().execute()
    if not customer.data:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    c = customer.data
    try:
        temp = db.table("customer_temperatures").select("*").eq("customer_id", customer_id).single().execute()
    except Exception:
        temp = type("Result", (), {"data": None})()
    tsel_factors = db.table("tsel_factors").select("*").eq("customer_id", customer_id).execute()
    sigma_factors = db.table("sigma_factors").select("*").eq("customer_id", customer_id).execute()
    voices = db.table("voices").select("*").eq("customer_id", customer_id).order("created_at", desc=True).limit(5).execute()
    history = db.table("temperature_history").select("*").eq("customer_id", customer_id).order("recorded_at", desc=True).limit(10).execute()
    
    t = temp.data or {}
    tsel_grouped = {"T": [], "S": [], "E": [], "L": []}
    for f in (tsel_factors.data or []):
        tsel_grouped[f["dimension"]].append(f)
    
    return {
        "id": c["id"], "name": c["name"], "grade": c.get("grade", ""), "class": c.get("class", ""),
        "tenure": calculate_tenure(c.get("enrolled_at")),
        "executor": c.get("users", {"name": "미배정"}) or {"name": "미배정"},
        "payer": c.get("payer", {}),
        "temperature": {"current": float(t.get("temperature", 50)), "zone": t.get("zone", "normal"), "trend": t.get("trend", "stable"), "trendValue": float(t.get("trend_value", 0))},
        "churnPrediction": {"probability": float(t.get("churn_probability", 0)), "predictedDate": t.get("churn_predicted_date")},
        "tsel": {
            "trust": {"score": float(t.get("trust_score", 50)), "factors": tsel_grouped["T"]},
            "satisfaction": {"score": float(t.get("satisfaction_score", 50)), "factors": tsel_grouped["S"]},
            "engagement": {"score": float(t.get("engagement_score", 50)), "factors": tsel_grouped["E"]},
            "loyalty": {"score": float(t.get("loyalty_score", 50)), "factors": tsel_grouped["L"]}
        },
        "sigma": {
            "total": float(t.get("sigma_total", 1.0)),
            "breakdown": {"internal": float(t.get("sigma_internal", 1.0)), "voice": float(t.get("sigma_voice", 1.0)), "external": float(t.get("sigma_external", 1.0))},
            "factors": [{"name": f["factor_name"], "impact": float(f["impact"])} for f in (sigma_factors.data or [])]
        },
        "voices": [{"id": v["id"], "date": v["created_at"][:10], "stage": v["stage"], "content": v["content"], "status": v["status"]} for v in (voices.data or [])],
        "history": [{"date": h["recorded_at"][:10], "type": h.get("event_type", ""), "description": h.get("event_description", ""), "tempChange": float(h.get("temp_change", 0))} for h in (history.data or [])],
        "recommendation": generate_recommendation(t, sigma_factors.data or [])
    }

# ═══════════════════════════════════════════════════════════════════════════
# 9. NETWORK API (네트워크)
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/network/graph")
async def get_network_graph(org_id: str = Query(...), db: Client = Depends(get_supabase)):
    """관계망 그래프 (customer_temperatures 없으면 기본값 50/normal)"""
    try:
        customers = db.table("customers").select("id, name, customer_temperatures(temperature, zone)").eq("org_id", org_id).execute()
    except Exception:
        try:
            cust_res = db.table("customers").select("id, name").eq("org_id", org_id).execute()
            customers = type("Res", (), {"data": [{"id": x["id"], "name": x["name"], "customer_temperatures": None} for x in (cust_res.data or [])]})()
        except Exception:
            return {"nodes": [], "edges": []}
    relationships = db.table("customer_relationships").select("*").eq("org_id", org_id).execute()
    
    nodes = [{"id": c["id"], "name": c["name"], "temp": float(c.get("customer_temperatures", [{}])[0].get("temperature", 50)) if c.get("customer_temperatures") else 50, "zone": c.get("customer_temperatures", [{}])[0].get("zone", "normal") if c.get("customer_temperatures") else "normal"} for c in (customers.data or [])]
    edges = [{"from": r["from_customer_id"], "to": r["to_customer_id"], "type": r["relationship_type"], "strength": float(r.get("strength", 0.5))} for r in (relationships.data or [])]
    return {"nodes": nodes, "edges": edges}

@router.get("/network/influencers")
async def get_network_influencers(org_id: str = Query(...), db: Client = Depends(get_supabase)):
    """영향력자"""
    relationships = db.table("customer_relationships").select("from_customer_id").eq("org_id", org_id).eq("relationship_type", "referral").execute()
    counts = {}
    for r in (relationships.data or []):
        fid = r["from_customer_id"]
        counts[fid] = counts.get(fid, 0) + 1
    sorted_inf = sorted(counts.items(), key=lambda x: x[1], reverse=True)[:5]
    return [{"id": k, "referrals": v} for k, v in sorted_inf]

# ═══════════════════════════════════════════════════════════════════════════
# 10. FUNNEL API (퍼널)
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/funnel/stages")
async def get_funnel_stages(org_id: str = Query(...), db: Client = Depends(get_supabase)):
    """퍼널 단계별"""
    leads = db.table("leads").select("stage").eq("org_id", org_id).execute()
    customers = db.table("customers").select("stage").eq("org_id", org_id).execute()
    
    counts = {"awareness": 0, "interest": 0, "trial": 0, "registration": 0, "3month": 0, "6month": 0}
    for l in (leads.data or []):
        if l.get("stage") in counts: counts[l["stage"]] += 1
    for c in (customers.data or []):
        stage = c.get("stage", "new")
        if stage == "new": counts["registration"] += 1
        elif stage in counts: counts[stage] += 1
    
    total = counts["awareness"] or 1
    return [{"name": n, "count": counts[k], "rate": round(counts[k] / total * 100, 1)} for k, n in [("awareness", "인지"), ("interest", "관심"), ("trial", "체험"), ("registration", "등록"), ("3month", "3개월"), ("6month", "6개월")]]

# ═══════════════════════════════════════════════════════════════════════════
# 11. CRYSTAL API (수정구)
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/crystal/scenarios")
async def get_crystal_scenarios(org_id: str = Query(...), db: Client = Depends(get_supabase)):
    """시나리오 목록"""
    result = db.table("scenarios").select("*").eq("org_id", org_id).execute()
    if result.data:
        return [{"id": s["id"], "name": s["name"], "customers": s["predicted_customers"], "revenue": s["predicted_revenue"], "churn": s["predicted_churn_rate"], "recommended": s.get("is_recommended", False)} for s in result.data]
    return [
        {"id": "default-1", "name": "현상 유지", "customers": 127, "revenue": 5080, "churn": 8.0, "recommended": False},
        {"id": "default-2", "name": "적극 방어", "customers": 140, "revenue": 5600, "churn": 4.0, "recommended": True},
        {"id": "default-3", "name": "확장 공격", "customers": 160, "revenue": 6400, "churn": 6.0, "recommended": False}
    ]

@router.post("/crystal/simulate")
async def simulate_scenario(org_id: str = Query(...), scenario_id: str = Query(...), db: Client = Depends(get_supabase)):
    """시뮬레이션 실행"""
    return {"status": "simulated", "scenario_id": scenario_id}

# ═══════════════════════════════════════════════════════════════════════════
# HEALTH CHECK
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/health")
async def health_check():
    return {"status": "healthy", "version": "2.0.0", "views": 11}
