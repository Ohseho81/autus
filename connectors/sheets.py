"""
AUTUS Google Sheets Connector
필리핀 석사+취업 프로젝트용
"""

from typing import Dict, List, Any, Optional
import os
import json

# 선택적 import (gspread가 없어도 동작)
try:
    import gspread
    from google.oauth2.service_account import Credentials
    GSPREAD_AVAILABLE = True
except ImportError:
    gspread = None
    Credentials = None
    GSPREAD_AVAILABLE = False
    print("[Sheets] gspread 미설치 - 데모 모드로 동작")

SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets.readonly'
]


class SheetsConnector:
    """Google Sheets 데이터 연동"""
    
    def __init__(self):
        self.connected = False
        self.client = None
        self.sheet = None
        
        # gspread 미설치 시 데모 모드
        if not GSPREAD_AVAILABLE:
            print("[Sheets] gspread 미설치 - 데모 모드")
            return
        
        # 환경변수에서 설정 읽기
        creds_path = os.getenv("GOOGLE_CREDENTIALS_PATH", "credentials.json")
        creds_json = os.getenv("GOOGLE_CREDENTIALS_JSON")  # Railway용 (JSON 문자열)
        sheet_id = os.getenv("GOOGLE_SHEET_ID")
        
        if not sheet_id:
            print("[Sheets] GOOGLE_SHEET_ID 환경변수 없음 - 데모 모드")
            return
        
        try:
            # Railway: JSON 문자열로 인증
            if creds_json:
                creds_dict = json.loads(creds_json)
                creds = Credentials.from_service_account_info(creds_dict, scopes=SCOPES)
            # 로컬: 파일로 인증
            elif os.path.exists(creds_path):
                creds = Credentials.from_service_account_file(creds_path, scopes=SCOPES)
            else:
                print(f"[Sheets] 인증 정보 없음: {creds_path}")
                return
            
            self.client = gspread.authorize(creds)
            self.sheet = self.client.open_by_key(sheet_id)
            self.connected = True
            print(f"[Sheets] 연결 성공: {self.sheet.title}")
            
        except Exception as e:
            print(f"[Sheets] 연결 실패: {e}")
            self.connected = False
    
    def get_worksheet(self, name: str) -> Optional[gspread.Worksheet]:
        """시트 가져오기"""
        if not self.connected:
            return None
        try:
            return self.sheet.worksheet(name)
        except Exception as e:
            print(f"[Sheets] '{name}' 시트 없음: {e}")
            return None
    
    # ─────────────────────────────────────────────────────────
    # 데이터 조회
    # ─────────────────────────────────────────────────────────
    
    def get_persons(self) -> List[Dict]:
        """인력 목록"""
        ws = self.get_worksheet("인력")
        if not ws:
            return []
        try:
            return ws.get_all_records()
        except:
            return []
    
    def get_finance(self) -> List[Dict]:
        """재정 내역"""
        ws = self.get_worksheet("재정")
        if not ws:
            return []
        try:
            return ws.get_all_records()
        except:
            return []
    
    def get_partners(self) -> List[Dict]:
        """파트너 목록"""
        ws = self.get_worksheet("파트너")
        if not ws:
            return []
        try:
            return ws.get_all_records()
        except:
            return []
    
    def get_issues(self) -> List[Dict]:
        """이슈 목록"""
        ws = self.get_worksheet("이슈")
        if not ws:
            return []
        try:
            return ws.get_all_records()
        except:
            return []
    
    # ─────────────────────────────────────────────────────────
    # 통계 계산
    # ─────────────────────────────────────────────────────────
    
    def get_person_stats(self) -> Dict:
        """인력 통계"""
        persons = self.get_persons()
        
        stats = {
            "total": len(persons),
            "active": 0,      # 재학중
            "intern": 0,      # 인턴중
            "employed": 0,    # 취업
            "dropout": 0,     # 이탈
            "waiting": 0,     # 대기
            "graduated": 0    # 졸업
        }
        
        for p in persons:
            status = str(p.get("상태", "")).strip()
            if status == "재학중":
                stats["active"] += 1
            elif status == "인턴중":
                stats["intern"] += 1
            elif status == "취업":
                stats["employed"] += 1
            elif status == "이탈":
                stats["dropout"] += 1
            elif status == "대기":
                stats["waiting"] += 1
            elif status == "졸업":
                stats["graduated"] += 1
        
        return stats
    
    def get_finance_stats(self) -> Dict:
        """재정 통계"""
        finance = self.get_finance()
        
        income = 0
        expense = 0
        
        for f in finance:
            amount = f.get("금액", 0)
            if isinstance(amount, str):
                # "₩1,000,000" 또는 "1000000" 형식 처리
                amount = amount.replace(",", "").replace("₩", "").replace(" ", "")
                try:
                    amount = int(amount)
                except:
                    amount = 0
            
            category = str(f.get("구분", "")).strip()
            if category == "수입":
                income += amount
            elif category == "지출":
                expense -= abs(amount)  # 지출은 음수로
        
        return {
            "income": income,
            "expense": expense,
            "balance": income + expense
        }
    
    def get_partner_stats(self) -> Dict:
        """파트너 통계"""
        partners = self.get_partners()
        
        stats = {
            "total": len(partners),
            "universities": 0,
            "companies": 0,
            "government": 0,
            "active": 0,
            "negotiating": 0
        }
        
        for p in partners:
            ptype = str(p.get("유형", "")).strip()
            status = str(p.get("상태", "")).strip()
            
            if ptype == "대학":
                stats["universities"] += 1
            elif ptype == "기업":
                stats["companies"] += 1
            elif ptype == "정부":
                stats["government"] += 1
            
            if status == "활성":
                stats["active"] += 1
            elif status == "협의중":
                stats["negotiating"] += 1
        
        return stats
    
    def get_issue_stats(self) -> Dict:
        """이슈 통계"""
        issues = self.get_issues()
        
        stats = {
            "total": len(issues),
            "resolved": 0,
            "in_progress": 0,
            "unresolved": 0,
            "new": 0
        }
        
        for i in issues:
            status = str(i.get("상태", "")).strip()
            if status == "해결":
                stats["resolved"] += 1
            elif status == "진행중":
                stats["in_progress"] += 1
            elif status == "미해결":
                stats["unresolved"] += 1
            elif status == "신규":
                stats["new"] += 1
        
        return stats
    
    # ─────────────────────────────────────────────────────────
    # AUTUS 물리량 계산
    # ─────────────────────────────────────────────────────────
    
    def calculate_planets(self) -> Dict:
        """9 Planets 물리량 계산"""
        
        person_stats = self.get_person_stats()
        finance_stats = self.get_finance_stats()
        partner_stats = self.get_partner_stats()
        issue_stats = self.get_issue_stats()
        
        # 물리량 계산 (단위: 원)
        output = person_stats["active"] * 5_000_000      # 재학생 × ₩500만
        quality = person_stats["employed"] * 1_000_000   # 취업자 × ₩100만
        shock = person_stats["dropout"] * 20_000_000     # 이탈자 × ₩2,000만
        
        friction_count = issue_stats["unresolved"] + issue_stats["in_progress"] + issue_stats["new"]
        friction = friction_count * 500_000               # 미해결이슈 × ₩50만
        
        cohesion = partner_stats["active"] * 10_000_000  # 활성파트너 × ₩1,000만
        stability = finance_stats["balance"]              # 현금 잔액
        
        # COST: 총 지출
        cost = abs(finance_stats["expense"])
        
        # TIME: 일정 지연 (별도 데이터 필요, 기본 0)
        time_delay = 0
        
        # RECOVERY: 이슈 해결률 기반
        if issue_stats["total"] > 0:
            recovery = (issue_stats["resolved"] / issue_stats["total"]) * 100
        else:
            recovery = 100
        
        # ─────────────────────────────────────────────────────
        # 파생값 계산
        # ─────────────────────────────────────────────────────
        
        total_positive = max(output + cohesion + quality, 1)
        total_negative = shock + friction
        
        # Risk % 계산
        risk_percent = min((total_negative / total_positive) * 100, 100)
        
        # Entropy 계산 (불확실성)
        entropy = (friction_count / max(person_stats["total"], 1)) * 100
        
        # Pressure 계산 (재정 압박)
        if stability < 0:
            pressure = min(abs(stability) / 10_000_000 * 100, 100)
        else:
            pressure = 0
        
        # Flow 계산 (진행률)
        if person_stats["total"] > 0:
            flow = ((person_stats["active"] + person_stats["employed"]) / person_stats["total"]) * 100
        else:
            flow = 0
        
        # GATE 결정
        if risk_percent < 30 and shock == 0:
            gate = "GREEN"
        elif risk_percent < 60:
            gate = "AMBER"
        else:
            gate = "RED"
        
        # ─────────────────────────────────────────────────────
        # Impact 계산 (RECOVER 시 효과)
        # ─────────────────────────────────────────────────────
        
        potential_save = shock + friction  # 방지 가능 손실
        impact_percent = -round((potential_save / max(total_positive, 1)) * 100)
        
        return {
            # 9 Planets (원 단위)
            "output": output,
            "quality": quality,
            "time": time_delay,
            "cost": cost,
            "friction": friction,
            "shock": shock,
            "cohesion": cohesion,
            "recovery": recovery,
            "stability": stability,
            
            # 파생값 (% 단위)
            "risk": round(risk_percent, 1),
            "entropy": round(entropy, 1),
            "pressure": round(pressure, 1),
            "flow": round(flow, 1),
            
            # 상태
            "gate": gate,
            "impact_percent": impact_percent,
            
            # 통계 원본
            "stats": {
                "persons": person_stats,
                "finance": finance_stats,
                "partners": partner_stats,
                "issues": issue_stats
            }
        }


# ─────────────────────────────────────────────────────────
# 싱글톤 인스턴스
# ─────────────────────────────────────────────────────────

_connector: Optional[SheetsConnector] = None


def get_sheets_connector() -> Optional[SheetsConnector]:
    """Sheets 커넥터 싱글톤"""
    global _connector
    if _connector is None:
        try:
            _connector = SheetsConnector()
        except Exception as e:
            print(f"[Sheets] 초기화 실패: {e}")
            return None
    return _connector


def get_demo_planets() -> Dict:
    """데모용 기본값 (Sheets 연결 안 됐을 때)"""
    return {
        "output": 25_000_000,
        "quality": 5_000_000,
        "time": 0,
        "cost": 15_000_000,
        "friction": 2_500_000,
        "shock": 0,
        "cohesion": 30_000_000,
        "recovery": 75,
        "stability": 10_000_000,
        "risk": 8.3,
        "entropy": 10.0,
        "pressure": 0,
        "flow": 60.0,
        "gate": "GREEN",
        "impact_percent": -8,
        "stats": {
            "persons": {"total": 5, "active": 3, "employed": 1, "dropout": 0},
            "finance": {"income": 25_000_000, "expense": -15_000_000, "balance": 10_000_000},
            "partners": {"total": 3, "active": 3, "universities": 1, "companies": 2},
            "issues": {"total": 5, "resolved": 3, "in_progress": 1, "unresolved": 1}
        }
    }
