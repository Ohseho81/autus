#!/usr/bin/env python3
"""
AUTUS v1.0 Google Sheets Connector
==================================
구글 시트 실시간 연동 + 데이터 동기화

Setup:
1. Google Cloud Console에서 서비스 계정 생성
2. JSON 키 다운로드 → ./credentials/service_account.json
3. 시트에 서비스 계정 이메일 공유 권한 부여

Usage:
    from sheet_connector import SheetConnector
    connector = SheetConnector(sheet_id="YOUR_SHEET_ID")
    data = connector.get_all_entities()
"""

import json
import os
from datetime import datetime
from typing import Dict, List, Optional
from pathlib import Path

# ═══════════════════════════════════════════════════════════════════════════════
# MOCK MODE (gspread 미설치 시)
# ═══════════════════════════════════════════════════════════════════════════════

MOCK_MODE = False

try:
    import gspread
    from google.oauth2.service_account import Credentials
except ImportError:
    MOCK_MODE = True
    print("⚠️ gspread 미설치 - Mock 모드 활성화")


# ═══════════════════════════════════════════════════════════════════════════════
# SHEET CONNECTOR
# ═══════════════════════════════════════════════════════════════════════════════

class SheetConnector:
    """Google Sheets 연결기"""
    
    SCOPES = [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
    ]
    
    # 시트 탭 이름
    TAB_FOUNDER = "파운더"
    TAB_JINHO = "김진호"
    TAB_JONGHO = "김종호"
    TAB_CLARK = "클락허브"
    TAB_TRANSACTIONS = "거래내역"
    
    def __init__(
        self,
        sheet_id: str = None,
        credentials_path: str = "./credentials/service_account.json"
    ):
        self.sheet_id = sheet_id or os.environ.get("AUTUS_SHEET_ID", "")
        self.credentials_path = credentials_path
        self.client = None
        self.spreadsheet = None
        
        if not MOCK_MODE and self.sheet_id:
            self._connect()
    
    def _connect(self):
        """시트 연결"""
        try:
            creds = Credentials.from_service_account_file(
                self.credentials_path,
                scopes=self.SCOPES
            )
            self.client = gspread.authorize(creds)
            self.spreadsheet = self.client.open_by_key(self.sheet_id)
            print(f"✅ Google Sheets 연결 완료: {self.spreadsheet.title}")
        except Exception as e:
            print(f"❌ 연결 실패: {e}")
            self.client = None
    
    def _get_worksheet(self, tab_name: str):
        """워크시트 가져오기"""
        if not self.spreadsheet:
            return None
        try:
            return self.spreadsheet.worksheet(tab_name)
        except:
            return None
    
    # ═══════════════════════════════════════════════════════════════════════════
    # DATA GETTERS
    # ═══════════════════════════════════════════════════════════════════════════
    
    def get_founder_data(self) -> Dict:
        """파운더 데이터"""
        if MOCK_MODE or not self.spreadsheet:
            return self._mock_founder()
        
        ws = self._get_worksheet(self.TAB_FOUNDER)
        if not ws:
            return self._mock_founder()
        
        try:
            records = ws.get_all_records()
            if records:
                r = records[0]
                return {
                    "assets": float(r.get("자산", 200)),
                    "debt": float(r.get("부채", 180)),
                    "revenue": float(r.get("매출", 30)),
                    "expense": float(r.get("지출", 40)),
                    "profit": float(r.get("수익", -10)),
                    "debt_interest_rate": float(r.get("이자율", 0.05)),
                    "jeju_monthly_revenue": float(r.get("제주월매출", 1.0)),
                    "last_updated": datetime.now().isoformat()
                }
        except Exception as e:
            print(f"❌ 파운더 데이터 오류: {e}")
        
        return self._mock_founder()
    
    def get_jinho_data(self) -> Dict:
        """김진호 데이터"""
        if MOCK_MODE or not self.spreadsheet:
            return self._mock_jinho()
        
        ws = self._get_worksheet(self.TAB_JINHO)
        if not ws:
            return self._mock_jinho()
        
        try:
            records = ws.get_all_records()
            if records:
                r = records[0]
                return {
                    "revenue": float(r.get("매출", 50)),
                    "profit": float(r.get("수익", 10)),
                    "expense": float(r.get("지출", 40)),
                    "business": r.get("사업유형", "F&B"),
                    "last_updated": datetime.now().isoformat()
                }
        except Exception as e:
            print(f"❌ 김진호 데이터 오류: {e}")
        
        return self._mock_jinho()
    
    def get_jongho_data(self) -> Dict:
        """김종호 데이터 (6개 법인)"""
        if MOCK_MODE or not self.spreadsheet:
            return self._mock_jongho()
        
        ws = self._get_worksheet(self.TAB_JONGHO)
        if not ws:
            return self._mock_jongho()
        
        try:
            records = ws.get_all_records()
            corporations = []
            total_revenue = 0
            total_profit = 0
            
            for r in records:
                corp = {
                    "name": r.get("법인명", ""),
                    "revenue": float(r.get("매출", 0)),
                    "profit": float(r.get("수익", 0))
                }
                corporations.append(corp)
                total_revenue += corp["revenue"]
                total_profit += corp["profit"]
            
            return {
                "corporations": corporations,
                "total_revenue": total_revenue,
                "total_profit": total_profit,
                "total_expense": total_revenue - total_profit,
                "last_updated": datetime.now().isoformat()
            }
        except Exception as e:
            print(f"❌ 김종호 데이터 오류: {e}")
        
        return self._mock_jongho()
    
    def get_clark_data(self) -> Dict:
        """클락 허브 데이터"""
        if MOCK_MODE or not self.spreadsheet:
            return self._mock_clark()
        
        ws = self._get_worksheet(self.TAB_CLARK)
        if not ws:
            return self._mock_clark()
        
        try:
            records = ws.get_all_records()
            if records:
                r = records[0]
                return {
                    "accumulated": float(r.get("적립금", 0)),
                    "tax_saved": float(r.get("절세누계", 0)),
                    "transfer_rate": float(r.get("이전율", 0.15)),
                    "last_updated": datetime.now().isoformat()
                }
        except Exception as e:
            print(f"❌ 클락 데이터 오류: {e}")
        
        return self._mock_clark()
    
    def get_all_entities(self) -> Dict:
        """전체 엔티티 데이터"""
        return {
            "founder": self.get_founder_data(),
            "jinho": self.get_jinho_data(),
            "jongho": self.get_jongho_data(),
            "clark": self.get_clark_data(),
            "fetched_at": datetime.now().isoformat()
        }
    
    # ═══════════════════════════════════════════════════════════════════════════
    # DATA WRITERS
    # ═══════════════════════════════════════════════════════════════════════════
    
    def log_transaction(self, tx_data: Dict) -> bool:
        """거래 기록"""
        if MOCK_MODE or not self.spreadsheet:
            print(f"📝 [Mock] 거래 기록: {tx_data}")
            return True
        
        ws = self._get_worksheet(self.TAB_TRANSACTIONS)
        if not ws:
            return False
        
        try:
            row = [
                datetime.now().isoformat(),
                tx_data.get("from", ""),
                tx_data.get("to", ""),
                tx_data.get("type", ""),
                tx_data.get("amount", 0),
                tx_data.get("description", "")
            ]
            ws.append_row(row)
            return True
        except Exception as e:
            print(f"❌ 거래 기록 실패: {e}")
            return False
    
    def update_clark_accumulation(self, amount: float, tax_saved: float) -> bool:
        """클락 적립금 업데이트"""
        if MOCK_MODE or not self.spreadsheet:
            print(f"📝 [Mock] 클락 업데이트: +{amount}억, 절세 {tax_saved}억")
            return True
        
        ws = self._get_worksheet(self.TAB_CLARK)
        if not ws:
            return False
        
        try:
            current = ws.acell('B2').value or 0
            ws.update_acell('B2', float(current) + amount)
            
            saved = ws.acell('C2').value or 0
            ws.update_acell('C2', float(saved) + tax_saved)
            return True
        except Exception as e:
            print(f"❌ 클락 업데이트 실패: {e}")
            return False
    
    # ═══════════════════════════════════════════════════════════════════════════
    # MOCK DATA
    # ═══════════════════════════════════════════════════════════════════════════
    
    def _mock_founder(self) -> Dict:
        return {
            "assets": 200,
            "debt": 180,
            "revenue": 30,
            "expense": 40,
            "profit": -10,
            "debt_interest_rate": 0.05,
            "jeju_monthly_revenue": 1.0,
            "last_updated": datetime.now().isoformat(),
            "_mock": True
        }
    
    def _mock_jinho(self) -> Dict:
        return {
            "revenue": 50,
            "profit": 10,
            "expense": 40,
            "business": "F&B",
            "last_updated": datetime.now().isoformat(),
            "_mock": True
        }
    
    def _mock_jongho(self) -> Dict:
        corps = [
            {"name": "교육법인_1", "revenue": 120, "profit": 17},
            {"name": "교육법인_2", "revenue": 100, "profit": 14},
            {"name": "교육법인_3", "revenue": 90, "profit": 13},
            {"name": "교육법인_4", "revenue": 80, "profit": 11},
            {"name": "교육법인_5", "revenue": 60, "profit": 8},
            {"name": "교육법인_6", "revenue": 50, "profit": 7},
        ]
        return {
            "corporations": corps,
            "total_revenue": 500,
            "total_profit": 70,
            "total_expense": 430,
            "last_updated": datetime.now().isoformat(),
            "_mock": True
        }
    
    def _mock_clark(self) -> Dict:
        return {
            "accumulated": 0,
            "tax_saved": 0,
            "transfer_rate": 0.15,
            "last_updated": datetime.now().isoformat(),
            "_mock": True
        }


# ═══════════════════════════════════════════════════════════════════════════════
# SHEET TEMPLATE GENERATOR
# ═══════════════════════════════════════════════════════════════════════════════

def generate_sheet_template():
    """시트 템플릿 CSV 생성"""
    
    # 파운더 탭
    founder_csv = """자산,부채,매출,지출,수익,이자율,제주월매출
200,180,30,40,-10,0.05,1.0"""
    
    # 김진호 탭
    jinho_csv = """매출,수익,지출,사업유형
50,10,40,F&B"""
    
    # 김종호 탭
    jongho_csv = """법인명,매출,수익
교육법인_1,120,17
교육법인_2,100,14
교육법인_3,90,13
교육법인_4,80,11
교육법인_5,60,8
교육법인_6,50,7"""
    
    # 클락 탭
    clark_csv = """항목,적립금,절세누계,이전율
클락허브,0,0,0.15"""
    
    # 거래내역 탭
    tx_csv = """일시,출처,대상,유형,금액,설명"""
    
    templates = {
        "파운더.csv": founder_csv,
        "김진호.csv": jinho_csv,
        "김종호.csv": jongho_csv,
        "클락허브.csv": clark_csv,
        "거래내역.csv": tx_csv
    }
    
    template_dir = Path(__file__).parent / "sheet_templates"
    template_dir.mkdir(exist_ok=True)
    
    for filename, content in templates.items():
        filepath = template_dir / filename
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"📄 생성: {filepath}")
    
    print("\n✅ 시트 템플릿 생성 완료!")
    print("   구글 시트에 각 탭을 만들고 CSV 내용을 붙여넣으세요.")


# ═══════════════════════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="AUTUS Sheet Connector")
    parser.add_argument("--template", action="store_true", help="시트 템플릿 생성")
    parser.add_argument("--test", action="store_true", help="연결 테스트")
    parser.add_argument("--sheet-id", help="시트 ID")
    
    args = parser.parse_args()
    
    if args.template:
        generate_sheet_template()
    elif args.test:
        connector = SheetConnector(sheet_id=args.sheet_id)
        data = connector.get_all_entities()
        print(json.dumps(data, ensure_ascii=False, indent=2))
    else:
        parser.print_help()
