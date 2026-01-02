#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🟢 AUTUS Physics Map - Google Sheets 연동                                    ║
║                                                                               ║
║  기능:                                                                        ║
║  - Physics Map 데이터 → Google Sheets 자동 저장                               ║
║  - Google Sheets → Physics Map 데이터 불러오기                                ║
║  - 실시간 동기화                                                              ║
║                                                                               ║
║  설정 방법:                                                                   ║
║  1. Google Cloud Console → APIs & Services → Credentials                     ║
║  2. Service Account 생성 → JSON 키 다운로드                                   ║
║  3. credentials.json을 이 폴더에 저장                                         ║
║  4. Google Sheets에서 서비스 계정 이메일에 편집 권한 부여                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
from datetime import datetime
from typing import List, Dict, Any, Optional

# Google API
try:
    from google.oauth2.service_account import Credentials
    from googleapiclient.discovery import build
    GOOGLE_AVAILABLE = True
except ImportError:
    GOOGLE_AVAILABLE = False
    print("⚠️ google-api-python-client 설치 필요: pip install google-api-python-client google-auth")


class GoogleSheetsClient:
    """
    AUTUS Physics Map ↔ Google Sheets 연동 클라이언트
    """
    
    SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
    
    def __init__(self, credentials_path: str = "credentials.json"):
        """
        Google Sheets 클라이언트 초기화
        
        Args:
            credentials_path: 서비스 계정 JSON 키 파일 경로
        """
        self.credentials_path = credentials_path
        self.service = None
        
        if GOOGLE_AVAILABLE:
            self._authenticate()
    
    def _authenticate(self):
        """Google API 인증"""
        if not os.path.exists(self.credentials_path):
            print(f"❌ credentials.json 파일이 없습니다: {self.credentials_path}")
            print("📋 설정 방법:")
            print("   1. https://console.cloud.google.com 접속")
            print("   2. APIs & Services → Credentials")
            print("   3. Create Credentials → Service Account")
            print("   4. JSON 키 다운로드 → credentials.json으로 저장")
            return
        
        try:
            creds = Credentials.from_service_account_file(
                self.credentials_path, 
                scopes=self.SCOPES
            )
            self.service = build('sheets', 'v4', credentials=creds)
            print("✅ Google Sheets API 연결 성공!")
        except Exception as e:
            print(f"❌ Google API 인증 실패: {e}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Physics Map 데이터 → Google Sheets
    # ═══════════════════════════════════════════════════════════════════════════
    
    def export_physics_data(
        self, 
        spreadsheet_id: str,
        physics_data: Dict[str, Any],
        sheet_name: str = "Physics Map"
    ) -> bool:
        """
        Physics Map 데이터를 Google Sheets로 내보내기
        
        Args:
            spreadsheet_id: Google Sheets ID (URL에서 추출)
            physics_data: Physics Map 분석 결과
            sheet_name: 시트 이름
        
        Returns:
            성공 여부
        """
        if not self.service:
            print("❌ Google API 연결 안됨")
            return False
        
        try:
            # 헤더 행
            headers = [
                "ID", "이름", "역할", "위치",
                "Total Value (V)", "Inflow", "Outflow", 
                "Time Cost (T)", "Synergy (S)", "12M Forecast",
                "상태", "업데이트 시간"
            ]
            
            # 데이터 행 변환
            rows = [headers]
            
            for node in physics_data.get("nodes", []):
                row = [
                    node.get("id", ""),
                    node.get("name", node.get("label", "")),
                    node.get("role", ""),
                    node.get("location", ""),
                    node.get("value", 0),
                    node.get("inflow", 0),
                    node.get("outflow", 0),
                    node.get("time_cost", node.get("time", 0)),
                    node.get("synergy", 0),
                    node.get("forecast", 0),
                    node.get("status", "optimal"),
                    datetime.now().isoformat()
                ]
                rows.append(row)
            
            # Google Sheets에 쓰기
            body = {'values': rows}
            
            self.service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range=f"{sheet_name}!A1",
                valueInputOption='USER_ENTERED',
                body=body
            ).execute()
            
            print(f"✅ Google Sheets 내보내기 완료: {len(rows)-1}개 노드")
            return True
            
        except Exception as e:
            print(f"❌ 내보내기 실패: {e}")
            return False
    
    def export_flows(
        self,
        spreadsheet_id: str,
        flows: List[Dict],
        sheet_name: str = "Money Flows"
    ) -> bool:
        """
        돈 흐름 데이터를 Google Sheets로 내보내기
        """
        if not self.service:
            return False
        
        try:
            headers = [
                "From", "To", "금액", "유형", 
                "Physics Value", "업데이트 시간"
            ]
            
            rows = [headers]
            for flow in flows:
                row = [
                    flow.get("from", ""),
                    flow.get("to", ""),
                    flow.get("value", 0),
                    flow.get("type", ""),
                    flow.get("physics_value", 0),
                    datetime.now().isoformat()
                ]
                rows.append(row)
            
            body = {'values': rows}
            
            self.service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range=f"{sheet_name}!A1",
                valueInputOption='USER_ENTERED',
                body=body
            ).execute()
            
            print(f"✅ 돈 흐름 내보내기 완료: {len(rows)-1}개")
            return True
            
        except Exception as e:
            print(f"❌ 내보내기 실패: {e}")
            return False
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Google Sheets → Physics Map 데이터
    # ═══════════════════════════════════════════════════════════════════════════
    
    def import_physics_data(
        self,
        spreadsheet_id: str,
        sheet_name: str = "Physics Map",
        range_notation: str = "A:L"
    ) -> Optional[Dict[str, Any]]:
        """
        Google Sheets에서 Physics Map 데이터 불러오기
        
        Args:
            spreadsheet_id: Google Sheets ID
            sheet_name: 시트 이름
            range_notation: 셀 범위
        
        Returns:
            Physics Map 데이터 딕셔너리
        """
        if not self.service:
            return None
        
        try:
            result = self.service.spreadsheets().values().get(
                spreadsheetId=spreadsheet_id,
                range=f"{sheet_name}!{range_notation}"
            ).execute()
            
            values = result.get('values', [])
            
            if not values:
                print("⚠️ 데이터 없음")
                return None
            
            # 헤더 제외하고 데이터 파싱
            headers = values[0]
            nodes = []
            
            for row in values[1:]:
                if len(row) >= 6:  # 최소 필수 필드
                    node = {
                        "id": row[0] if len(row) > 0 else "",
                        "name": row[1] if len(row) > 1 else "",
                        "role": row[2] if len(row) > 2 else "",
                        "location": row[3] if len(row) > 3 else "",
                        "value": self._parse_number(row[4]) if len(row) > 4 else 0,
                        "inflow": self._parse_number(row[5]) if len(row) > 5 else 0,
                        "outflow": self._parse_number(row[6]) if len(row) > 6 else 0,
                        "time_cost": self._parse_number(row[7]) if len(row) > 7 else 0,
                        "synergy": self._parse_number(row[8]) if len(row) > 8 else 0,
                        "forecast": self._parse_number(row[9]) if len(row) > 9 else 0,
                        "status": row[10] if len(row) > 10 else "optimal"
                    }
                    nodes.append(node)
            
            print(f"✅ Google Sheets에서 {len(nodes)}개 노드 불러옴")
            
            return {
                "nodes": nodes,
                "imported_at": datetime.now().isoformat(),
                "source": f"Google Sheets: {spreadsheet_id}"
            }
            
        except Exception as e:
            print(f"❌ 불러오기 실패: {e}")
            return None
    
    def _parse_number(self, value: Any) -> float:
        """문자열을 숫자로 변환"""
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            # 원화 기호, 콤마 제거
            cleaned = value.replace('₩', '').replace(',', '').replace('억', '00000000').replace('만', '0000')
            try:
                return float(cleaned)
            except:
                return 0
        return 0
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════
    
    def create_physics_template(self, spreadsheet_id: str) -> bool:
        """
        Physics Map 템플릿 시트 생성
        """
        if not self.service:
            return False
        
        try:
            # Physics Map 시트
            physics_headers = [
                ["AUTUS Physics Map - 노드 데이터"],
                [""],
                ["ID", "이름", "역할", "위치", "Total Value", "Inflow", "Outflow", 
                 "Time Cost", "Synergy", "12M Forecast", "상태", "메모"],
                ["당신", "대표", "CONTROLLER", "서울 강남구", 182886563, 214000000, 38500000,
                 4000000, 11406562, 210000000, "optimal", ""],
                ["매니저", "매니저", "OPERATOR", "서울 서초구", 75000000, 85000000, 10000000,
                 3000000, 3000000, 90000000, "optimal", ""],
            ]
            
            # Money Flows 시트
            flow_headers = [
                ["AUTUS Physics Map - 돈 흐름"],
                [""],
                ["From", "To", "금액", "유형", "Physics Value", "메모"],
                ["학부모군", "당신", 120000000, "inflow", 120000000, "월 수업료"],
                ["당신", "매니저", 25000000, "inflow", 25000000, "급여"],
            ]
            
            # 시트 생성 및 데이터 입력
            requests = [
                {
                    'addSheet': {
                        'properties': {'title': 'Physics Map'}
                    }
                },
                {
                    'addSheet': {
                        'properties': {'title': 'Money Flows'}
                    }
                }
            ]
            
            # 시트 추가 시도 (이미 있으면 무시)
            try:
                self.service.spreadsheets().batchUpdate(
                    spreadsheetId=spreadsheet_id,
                    body={'requests': requests}
                ).execute()
            except:
                pass  # 이미 존재하면 무시
            
            # 데이터 입력
            self.service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range="Physics Map!A1",
                valueInputOption='USER_ENTERED',
                body={'values': physics_headers}
            ).execute()
            
            self.service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range="Money Flows!A1",
                valueInputOption='USER_ENTERED',
                body={'values': flow_headers}
            ).execute()
            
            print("✅ Physics Map 템플릿 생성 완료!")
            return True
            
        except Exception as e:
            print(f"❌ 템플릿 생성 실패: {e}")
            return False


# ═══════════════════════════════════════════════════════════════════════════════
# 사용 예제
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 1. 클라이언트 초기화
    sheets = GoogleSheetsClient("credentials.json")
    
    # 2. 스프레드시트 ID (URL에서 추출)
    # https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
    SPREADSHEET_ID = "your-spreadsheet-id-here"
    
    # 3. 템플릿 생성 (최초 1회)
    # sheets.create_physics_template(SPREADSHEET_ID)
    
    # 4. 데이터 내보내기 예제
    sample_data = {
        "nodes": [
            {
                "id": "당신",
                "name": "대표",
                "role": "CONTROLLER",
                "location": "서울 강남구",
                "value": 182886563,
                "inflow": 214000000,
                "outflow": 38500000,
                "time_cost": 4000000,
                "synergy": 11406562,
                "forecast": 210000000,
                "status": "optimal"
            }
        ]
    }
    
    # sheets.export_physics_data(SPREADSHEET_ID, sample_data)
    
    # 5. 데이터 불러오기
    # imported = sheets.import_physics_data(SPREADSHEET_ID)
    # print(json.dumps(imported, indent=2, ensure_ascii=False))
    
    print("\n📋 Google Sheets 연동 설정 가이드:")
    print("1. https://console.cloud.google.com 접속")
    print("2. 새 프로젝트 생성 또는 기존 프로젝트 선택")
    print("3. APIs & Services → Library → 'Google Sheets API' 검색 → 사용")
    print("4. APIs & Services → Credentials → Create Credentials → Service Account")
    print("5. 서비스 계정 생성 후 Keys → Add Key → JSON 다운로드")
    print("6. 다운로드한 파일을 credentials.json으로 저장")
    print("7. Google Sheets에서 서비스 계정 이메일에 편집자 권한 부여")





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🟢 AUTUS Physics Map - Google Sheets 연동                                    ║
║                                                                               ║
║  기능:                                                                        ║
║  - Physics Map 데이터 → Google Sheets 자동 저장                               ║
║  - Google Sheets → Physics Map 데이터 불러오기                                ║
║  - 실시간 동기화                                                              ║
║                                                                               ║
║  설정 방법:                                                                   ║
║  1. Google Cloud Console → APIs & Services → Credentials                     ║
║  2. Service Account 생성 → JSON 키 다운로드                                   ║
║  3. credentials.json을 이 폴더에 저장                                         ║
║  4. Google Sheets에서 서비스 계정 이메일에 편집 권한 부여                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
from datetime import datetime
from typing import List, Dict, Any, Optional

# Google API
try:
    from google.oauth2.service_account import Credentials
    from googleapiclient.discovery import build
    GOOGLE_AVAILABLE = True
except ImportError:
    GOOGLE_AVAILABLE = False
    print("⚠️ google-api-python-client 설치 필요: pip install google-api-python-client google-auth")


class GoogleSheetsClient:
    """
    AUTUS Physics Map ↔ Google Sheets 연동 클라이언트
    """
    
    SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
    
    def __init__(self, credentials_path: str = "credentials.json"):
        """
        Google Sheets 클라이언트 초기화
        
        Args:
            credentials_path: 서비스 계정 JSON 키 파일 경로
        """
        self.credentials_path = credentials_path
        self.service = None
        
        if GOOGLE_AVAILABLE:
            self._authenticate()
    
    def _authenticate(self):
        """Google API 인증"""
        if not os.path.exists(self.credentials_path):
            print(f"❌ credentials.json 파일이 없습니다: {self.credentials_path}")
            print("📋 설정 방법:")
            print("   1. https://console.cloud.google.com 접속")
            print("   2. APIs & Services → Credentials")
            print("   3. Create Credentials → Service Account")
            print("   4. JSON 키 다운로드 → credentials.json으로 저장")
            return
        
        try:
            creds = Credentials.from_service_account_file(
                self.credentials_path, 
                scopes=self.SCOPES
            )
            self.service = build('sheets', 'v4', credentials=creds)
            print("✅ Google Sheets API 연결 성공!")
        except Exception as e:
            print(f"❌ Google API 인증 실패: {e}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Physics Map 데이터 → Google Sheets
    # ═══════════════════════════════════════════════════════════════════════════
    
    def export_physics_data(
        self, 
        spreadsheet_id: str,
        physics_data: Dict[str, Any],
        sheet_name: str = "Physics Map"
    ) -> bool:
        """
        Physics Map 데이터를 Google Sheets로 내보내기
        
        Args:
            spreadsheet_id: Google Sheets ID (URL에서 추출)
            physics_data: Physics Map 분석 결과
            sheet_name: 시트 이름
        
        Returns:
            성공 여부
        """
        if not self.service:
            print("❌ Google API 연결 안됨")
            return False
        
        try:
            # 헤더 행
            headers = [
                "ID", "이름", "역할", "위치",
                "Total Value (V)", "Inflow", "Outflow", 
                "Time Cost (T)", "Synergy (S)", "12M Forecast",
                "상태", "업데이트 시간"
            ]
            
            # 데이터 행 변환
            rows = [headers]
            
            for node in physics_data.get("nodes", []):
                row = [
                    node.get("id", ""),
                    node.get("name", node.get("label", "")),
                    node.get("role", ""),
                    node.get("location", ""),
                    node.get("value", 0),
                    node.get("inflow", 0),
                    node.get("outflow", 0),
                    node.get("time_cost", node.get("time", 0)),
                    node.get("synergy", 0),
                    node.get("forecast", 0),
                    node.get("status", "optimal"),
                    datetime.now().isoformat()
                ]
                rows.append(row)
            
            # Google Sheets에 쓰기
            body = {'values': rows}
            
            self.service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range=f"{sheet_name}!A1",
                valueInputOption='USER_ENTERED',
                body=body
            ).execute()
            
            print(f"✅ Google Sheets 내보내기 완료: {len(rows)-1}개 노드")
            return True
            
        except Exception as e:
            print(f"❌ 내보내기 실패: {e}")
            return False
    
    def export_flows(
        self,
        spreadsheet_id: str,
        flows: List[Dict],
        sheet_name: str = "Money Flows"
    ) -> bool:
        """
        돈 흐름 데이터를 Google Sheets로 내보내기
        """
        if not self.service:
            return False
        
        try:
            headers = [
                "From", "To", "금액", "유형", 
                "Physics Value", "업데이트 시간"
            ]
            
            rows = [headers]
            for flow in flows:
                row = [
                    flow.get("from", ""),
                    flow.get("to", ""),
                    flow.get("value", 0),
                    flow.get("type", ""),
                    flow.get("physics_value", 0),
                    datetime.now().isoformat()
                ]
                rows.append(row)
            
            body = {'values': rows}
            
            self.service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range=f"{sheet_name}!A1",
                valueInputOption='USER_ENTERED',
                body=body
            ).execute()
            
            print(f"✅ 돈 흐름 내보내기 완료: {len(rows)-1}개")
            return True
            
        except Exception as e:
            print(f"❌ 내보내기 실패: {e}")
            return False
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Google Sheets → Physics Map 데이터
    # ═══════════════════════════════════════════════════════════════════════════
    
    def import_physics_data(
        self,
        spreadsheet_id: str,
        sheet_name: str = "Physics Map",
        range_notation: str = "A:L"
    ) -> Optional[Dict[str, Any]]:
        """
        Google Sheets에서 Physics Map 데이터 불러오기
        
        Args:
            spreadsheet_id: Google Sheets ID
            sheet_name: 시트 이름
            range_notation: 셀 범위
        
        Returns:
            Physics Map 데이터 딕셔너리
        """
        if not self.service:
            return None
        
        try:
            result = self.service.spreadsheets().values().get(
                spreadsheetId=spreadsheet_id,
                range=f"{sheet_name}!{range_notation}"
            ).execute()
            
            values = result.get('values', [])
            
            if not values:
                print("⚠️ 데이터 없음")
                return None
            
            # 헤더 제외하고 데이터 파싱
            headers = values[0]
            nodes = []
            
            for row in values[1:]:
                if len(row) >= 6:  # 최소 필수 필드
                    node = {
                        "id": row[0] if len(row) > 0 else "",
                        "name": row[1] if len(row) > 1 else "",
                        "role": row[2] if len(row) > 2 else "",
                        "location": row[3] if len(row) > 3 else "",
                        "value": self._parse_number(row[4]) if len(row) > 4 else 0,
                        "inflow": self._parse_number(row[5]) if len(row) > 5 else 0,
                        "outflow": self._parse_number(row[6]) if len(row) > 6 else 0,
                        "time_cost": self._parse_number(row[7]) if len(row) > 7 else 0,
                        "synergy": self._parse_number(row[8]) if len(row) > 8 else 0,
                        "forecast": self._parse_number(row[9]) if len(row) > 9 else 0,
                        "status": row[10] if len(row) > 10 else "optimal"
                    }
                    nodes.append(node)
            
            print(f"✅ Google Sheets에서 {len(nodes)}개 노드 불러옴")
            
            return {
                "nodes": nodes,
                "imported_at": datetime.now().isoformat(),
                "source": f"Google Sheets: {spreadsheet_id}"
            }
            
        except Exception as e:
            print(f"❌ 불러오기 실패: {e}")
            return None
    
    def _parse_number(self, value: Any) -> float:
        """문자열을 숫자로 변환"""
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            # 원화 기호, 콤마 제거
            cleaned = value.replace('₩', '').replace(',', '').replace('억', '00000000').replace('만', '0000')
            try:
                return float(cleaned)
            except:
                return 0
        return 0
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════
    
    def create_physics_template(self, spreadsheet_id: str) -> bool:
        """
        Physics Map 템플릿 시트 생성
        """
        if not self.service:
            return False
        
        try:
            # Physics Map 시트
            physics_headers = [
                ["AUTUS Physics Map - 노드 데이터"],
                [""],
                ["ID", "이름", "역할", "위치", "Total Value", "Inflow", "Outflow", 
                 "Time Cost", "Synergy", "12M Forecast", "상태", "메모"],
                ["당신", "대표", "CONTROLLER", "서울 강남구", 182886563, 214000000, 38500000,
                 4000000, 11406562, 210000000, "optimal", ""],
                ["매니저", "매니저", "OPERATOR", "서울 서초구", 75000000, 85000000, 10000000,
                 3000000, 3000000, 90000000, "optimal", ""],
            ]
            
            # Money Flows 시트
            flow_headers = [
                ["AUTUS Physics Map - 돈 흐름"],
                [""],
                ["From", "To", "금액", "유형", "Physics Value", "메모"],
                ["학부모군", "당신", 120000000, "inflow", 120000000, "월 수업료"],
                ["당신", "매니저", 25000000, "inflow", 25000000, "급여"],
            ]
            
            # 시트 생성 및 데이터 입력
            requests = [
                {
                    'addSheet': {
                        'properties': {'title': 'Physics Map'}
                    }
                },
                {
                    'addSheet': {
                        'properties': {'title': 'Money Flows'}
                    }
                }
            ]
            
            # 시트 추가 시도 (이미 있으면 무시)
            try:
                self.service.spreadsheets().batchUpdate(
                    spreadsheetId=spreadsheet_id,
                    body={'requests': requests}
                ).execute()
            except:
                pass  # 이미 존재하면 무시
            
            # 데이터 입력
            self.service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range="Physics Map!A1",
                valueInputOption='USER_ENTERED',
                body={'values': physics_headers}
            ).execute()
            
            self.service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range="Money Flows!A1",
                valueInputOption='USER_ENTERED',
                body={'values': flow_headers}
            ).execute()
            
            print("✅ Physics Map 템플릿 생성 완료!")
            return True
            
        except Exception as e:
            print(f"❌ 템플릿 생성 실패: {e}")
            return False


# ═══════════════════════════════════════════════════════════════════════════════
# 사용 예제
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 1. 클라이언트 초기화
    sheets = GoogleSheetsClient("credentials.json")
    
    # 2. 스프레드시트 ID (URL에서 추출)
    # https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
    SPREADSHEET_ID = "your-spreadsheet-id-here"
    
    # 3. 템플릿 생성 (최초 1회)
    # sheets.create_physics_template(SPREADSHEET_ID)
    
    # 4. 데이터 내보내기 예제
    sample_data = {
        "nodes": [
            {
                "id": "당신",
                "name": "대표",
                "role": "CONTROLLER",
                "location": "서울 강남구",
                "value": 182886563,
                "inflow": 214000000,
                "outflow": 38500000,
                "time_cost": 4000000,
                "synergy": 11406562,
                "forecast": 210000000,
                "status": "optimal"
            }
        ]
    }
    
    # sheets.export_physics_data(SPREADSHEET_ID, sample_data)
    
    # 5. 데이터 불러오기
    # imported = sheets.import_physics_data(SPREADSHEET_ID)
    # print(json.dumps(imported, indent=2, ensure_ascii=False))
    
    print("\n📋 Google Sheets 연동 설정 가이드:")
    print("1. https://console.cloud.google.com 접속")
    print("2. 새 프로젝트 생성 또는 기존 프로젝트 선택")
    print("3. APIs & Services → Library → 'Google Sheets API' 검색 → 사용")
    print("4. APIs & Services → Credentials → Create Credentials → Service Account")
    print("5. 서비스 계정 생성 후 Keys → Add Key → JSON 다운로드")
    print("6. 다운로드한 파일을 credentials.json으로 저장")
    print("7. Google Sheets에서 서비스 계정 이메일에 편집자 권한 부여")





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🟢 AUTUS Physics Map - Google Sheets 연동                                    ║
║                                                                               ║
║  기능:                                                                        ║
║  - Physics Map 데이터 → Google Sheets 자동 저장                               ║
║  - Google Sheets → Physics Map 데이터 불러오기                                ║
║  - 실시간 동기화                                                              ║
║                                                                               ║
║  설정 방법:                                                                   ║
║  1. Google Cloud Console → APIs & Services → Credentials                     ║
║  2. Service Account 생성 → JSON 키 다운로드                                   ║
║  3. credentials.json을 이 폴더에 저장                                         ║
║  4. Google Sheets에서 서비스 계정 이메일에 편집 권한 부여                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
from datetime import datetime
from typing import List, Dict, Any, Optional

# Google API
try:
    from google.oauth2.service_account import Credentials
    from googleapiclient.discovery import build
    GOOGLE_AVAILABLE = True
except ImportError:
    GOOGLE_AVAILABLE = False
    print("⚠️ google-api-python-client 설치 필요: pip install google-api-python-client google-auth")


class GoogleSheetsClient:
    """
    AUTUS Physics Map ↔ Google Sheets 연동 클라이언트
    """
    
    SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
    
    def __init__(self, credentials_path: str = "credentials.json"):
        """
        Google Sheets 클라이언트 초기화
        
        Args:
            credentials_path: 서비스 계정 JSON 키 파일 경로
        """
        self.credentials_path = credentials_path
        self.service = None
        
        if GOOGLE_AVAILABLE:
            self._authenticate()
    
    def _authenticate(self):
        """Google API 인증"""
        if not os.path.exists(self.credentials_path):
            print(f"❌ credentials.json 파일이 없습니다: {self.credentials_path}")
            print("📋 설정 방법:")
            print("   1. https://console.cloud.google.com 접속")
            print("   2. APIs & Services → Credentials")
            print("   3. Create Credentials → Service Account")
            print("   4. JSON 키 다운로드 → credentials.json으로 저장")
            return
        
        try:
            creds = Credentials.from_service_account_file(
                self.credentials_path, 
                scopes=self.SCOPES
            )
            self.service = build('sheets', 'v4', credentials=creds)
            print("✅ Google Sheets API 연결 성공!")
        except Exception as e:
            print(f"❌ Google API 인증 실패: {e}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Physics Map 데이터 → Google Sheets
    # ═══════════════════════════════════════════════════════════════════════════
    
    def export_physics_data(
        self, 
        spreadsheet_id: str,
        physics_data: Dict[str, Any],
        sheet_name: str = "Physics Map"
    ) -> bool:
        """
        Physics Map 데이터를 Google Sheets로 내보내기
        
        Args:
            spreadsheet_id: Google Sheets ID (URL에서 추출)
            physics_data: Physics Map 분석 결과
            sheet_name: 시트 이름
        
        Returns:
            성공 여부
        """
        if not self.service:
            print("❌ Google API 연결 안됨")
            return False
        
        try:
            # 헤더 행
            headers = [
                "ID", "이름", "역할", "위치",
                "Total Value (V)", "Inflow", "Outflow", 
                "Time Cost (T)", "Synergy (S)", "12M Forecast",
                "상태", "업데이트 시간"
            ]
            
            # 데이터 행 변환
            rows = [headers]
            
            for node in physics_data.get("nodes", []):
                row = [
                    node.get("id", ""),
                    node.get("name", node.get("label", "")),
                    node.get("role", ""),
                    node.get("location", ""),
                    node.get("value", 0),
                    node.get("inflow", 0),
                    node.get("outflow", 0),
                    node.get("time_cost", node.get("time", 0)),
                    node.get("synergy", 0),
                    node.get("forecast", 0),
                    node.get("status", "optimal"),
                    datetime.now().isoformat()
                ]
                rows.append(row)
            
            # Google Sheets에 쓰기
            body = {'values': rows}
            
            self.service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range=f"{sheet_name}!A1",
                valueInputOption='USER_ENTERED',
                body=body
            ).execute()
            
            print(f"✅ Google Sheets 내보내기 완료: {len(rows)-1}개 노드")
            return True
            
        except Exception as e:
            print(f"❌ 내보내기 실패: {e}")
            return False
    
    def export_flows(
        self,
        spreadsheet_id: str,
        flows: List[Dict],
        sheet_name: str = "Money Flows"
    ) -> bool:
        """
        돈 흐름 데이터를 Google Sheets로 내보내기
        """
        if not self.service:
            return False
        
        try:
            headers = [
                "From", "To", "금액", "유형", 
                "Physics Value", "업데이트 시간"
            ]
            
            rows = [headers]
            for flow in flows:
                row = [
                    flow.get("from", ""),
                    flow.get("to", ""),
                    flow.get("value", 0),
                    flow.get("type", ""),
                    flow.get("physics_value", 0),
                    datetime.now().isoformat()
                ]
                rows.append(row)
            
            body = {'values': rows}
            
            self.service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range=f"{sheet_name}!A1",
                valueInputOption='USER_ENTERED',
                body=body
            ).execute()
            
            print(f"✅ 돈 흐름 내보내기 완료: {len(rows)-1}개")
            return True
            
        except Exception as e:
            print(f"❌ 내보내기 실패: {e}")
            return False
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Google Sheets → Physics Map 데이터
    # ═══════════════════════════════════════════════════════════════════════════
    
    def import_physics_data(
        self,
        spreadsheet_id: str,
        sheet_name: str = "Physics Map",
        range_notation: str = "A:L"
    ) -> Optional[Dict[str, Any]]:
        """
        Google Sheets에서 Physics Map 데이터 불러오기
        
        Args:
            spreadsheet_id: Google Sheets ID
            sheet_name: 시트 이름
            range_notation: 셀 범위
        
        Returns:
            Physics Map 데이터 딕셔너리
        """
        if not self.service:
            return None
        
        try:
            result = self.service.spreadsheets().values().get(
                spreadsheetId=spreadsheet_id,
                range=f"{sheet_name}!{range_notation}"
            ).execute()
            
            values = result.get('values', [])
            
            if not values:
                print("⚠️ 데이터 없음")
                return None
            
            # 헤더 제외하고 데이터 파싱
            headers = values[0]
            nodes = []
            
            for row in values[1:]:
                if len(row) >= 6:  # 최소 필수 필드
                    node = {
                        "id": row[0] if len(row) > 0 else "",
                        "name": row[1] if len(row) > 1 else "",
                        "role": row[2] if len(row) > 2 else "",
                        "location": row[3] if len(row) > 3 else "",
                        "value": self._parse_number(row[4]) if len(row) > 4 else 0,
                        "inflow": self._parse_number(row[5]) if len(row) > 5 else 0,
                        "outflow": self._parse_number(row[6]) if len(row) > 6 else 0,
                        "time_cost": self._parse_number(row[7]) if len(row) > 7 else 0,
                        "synergy": self._parse_number(row[8]) if len(row) > 8 else 0,
                        "forecast": self._parse_number(row[9]) if len(row) > 9 else 0,
                        "status": row[10] if len(row) > 10 else "optimal"
                    }
                    nodes.append(node)
            
            print(f"✅ Google Sheets에서 {len(nodes)}개 노드 불러옴")
            
            return {
                "nodes": nodes,
                "imported_at": datetime.now().isoformat(),
                "source": f"Google Sheets: {spreadsheet_id}"
            }
            
        except Exception as e:
            print(f"❌ 불러오기 실패: {e}")
            return None
    
    def _parse_number(self, value: Any) -> float:
        """문자열을 숫자로 변환"""
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            # 원화 기호, 콤마 제거
            cleaned = value.replace('₩', '').replace(',', '').replace('억', '00000000').replace('만', '0000')
            try:
                return float(cleaned)
            except:
                return 0
        return 0
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════
    
    def create_physics_template(self, spreadsheet_id: str) -> bool:
        """
        Physics Map 템플릿 시트 생성
        """
        if not self.service:
            return False
        
        try:
            # Physics Map 시트
            physics_headers = [
                ["AUTUS Physics Map - 노드 데이터"],
                [""],
                ["ID", "이름", "역할", "위치", "Total Value", "Inflow", "Outflow", 
                 "Time Cost", "Synergy", "12M Forecast", "상태", "메모"],
                ["당신", "대표", "CONTROLLER", "서울 강남구", 182886563, 214000000, 38500000,
                 4000000, 11406562, 210000000, "optimal", ""],
                ["매니저", "매니저", "OPERATOR", "서울 서초구", 75000000, 85000000, 10000000,
                 3000000, 3000000, 90000000, "optimal", ""],
            ]
            
            # Money Flows 시트
            flow_headers = [
                ["AUTUS Physics Map - 돈 흐름"],
                [""],
                ["From", "To", "금액", "유형", "Physics Value", "메모"],
                ["학부모군", "당신", 120000000, "inflow", 120000000, "월 수업료"],
                ["당신", "매니저", 25000000, "inflow", 25000000, "급여"],
            ]
            
            # 시트 생성 및 데이터 입력
            requests = [
                {
                    'addSheet': {
                        'properties': {'title': 'Physics Map'}
                    }
                },
                {
                    'addSheet': {
                        'properties': {'title': 'Money Flows'}
                    }
                }
            ]
            
            # 시트 추가 시도 (이미 있으면 무시)
            try:
                self.service.spreadsheets().batchUpdate(
                    spreadsheetId=spreadsheet_id,
                    body={'requests': requests}
                ).execute()
            except:
                pass  # 이미 존재하면 무시
            
            # 데이터 입력
            self.service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range="Physics Map!A1",
                valueInputOption='USER_ENTERED',
                body={'values': physics_headers}
            ).execute()
            
            self.service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range="Money Flows!A1",
                valueInputOption='USER_ENTERED',
                body={'values': flow_headers}
            ).execute()
            
            print("✅ Physics Map 템플릿 생성 완료!")
            return True
            
        except Exception as e:
            print(f"❌ 템플릿 생성 실패: {e}")
            return False


# ═══════════════════════════════════════════════════════════════════════════════
# 사용 예제
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 1. 클라이언트 초기화
    sheets = GoogleSheetsClient("credentials.json")
    
    # 2. 스프레드시트 ID (URL에서 추출)
    # https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
    SPREADSHEET_ID = "your-spreadsheet-id-here"
    
    # 3. 템플릿 생성 (최초 1회)
    # sheets.create_physics_template(SPREADSHEET_ID)
    
    # 4. 데이터 내보내기 예제
    sample_data = {
        "nodes": [
            {
                "id": "당신",
                "name": "대표",
                "role": "CONTROLLER",
                "location": "서울 강남구",
                "value": 182886563,
                "inflow": 214000000,
                "outflow": 38500000,
                "time_cost": 4000000,
                "synergy": 11406562,
                "forecast": 210000000,
                "status": "optimal"
            }
        ]
    }
    
    # sheets.export_physics_data(SPREADSHEET_ID, sample_data)
    
    # 5. 데이터 불러오기
    # imported = sheets.import_physics_data(SPREADSHEET_ID)
    # print(json.dumps(imported, indent=2, ensure_ascii=False))
    
    print("\n📋 Google Sheets 연동 설정 가이드:")
    print("1. https://console.cloud.google.com 접속")
    print("2. 새 프로젝트 생성 또는 기존 프로젝트 선택")
    print("3. APIs & Services → Library → 'Google Sheets API' 검색 → 사용")
    print("4. APIs & Services → Credentials → Create Credentials → Service Account")
    print("5. 서비스 계정 생성 후 Keys → Add Key → JSON 다운로드")
    print("6. 다운로드한 파일을 credentials.json으로 저장")
    print("7. Google Sheets에서 서비스 계정 이메일에 편집자 권한 부여")





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🟢 AUTUS Physics Map - Google Sheets 연동                                    ║
║                                                                               ║
║  기능:                                                                        ║
║  - Physics Map 데이터 → Google Sheets 자동 저장                               ║
║  - Google Sheets → Physics Map 데이터 불러오기                                ║
║  - 실시간 동기화                                                              ║
║                                                                               ║
║  설정 방법:                                                                   ║
║  1. Google Cloud Console → APIs & Services → Credentials                     ║
║  2. Service Account 생성 → JSON 키 다운로드                                   ║
║  3. credentials.json을 이 폴더에 저장                                         ║
║  4. Google Sheets에서 서비스 계정 이메일에 편집 권한 부여                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
from datetime import datetime
from typing import List, Dict, Any, Optional

# Google API
try:
    from google.oauth2.service_account import Credentials
    from googleapiclient.discovery import build
    GOOGLE_AVAILABLE = True
except ImportError:
    GOOGLE_AVAILABLE = False
    print("⚠️ google-api-python-client 설치 필요: pip install google-api-python-client google-auth")


class GoogleSheetsClient:
    """
    AUTUS Physics Map ↔ Google Sheets 연동 클라이언트
    """
    
    SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
    
    def __init__(self, credentials_path: str = "credentials.json"):
        """
        Google Sheets 클라이언트 초기화
        
        Args:
            credentials_path: 서비스 계정 JSON 키 파일 경로
        """
        self.credentials_path = credentials_path
        self.service = None
        
        if GOOGLE_AVAILABLE:
            self._authenticate()
    
    def _authenticate(self):
        """Google API 인증"""
        if not os.path.exists(self.credentials_path):
            print(f"❌ credentials.json 파일이 없습니다: {self.credentials_path}")
            print("📋 설정 방법:")
            print("   1. https://console.cloud.google.com 접속")
            print("   2. APIs & Services → Credentials")
            print("   3. Create Credentials → Service Account")
            print("   4. JSON 키 다운로드 → credentials.json으로 저장")
            return
        
        try:
            creds = Credentials.from_service_account_file(
                self.credentials_path, 
                scopes=self.SCOPES
            )
            self.service = build('sheets', 'v4', credentials=creds)
            print("✅ Google Sheets API 연결 성공!")
        except Exception as e:
            print(f"❌ Google API 인증 실패: {e}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Physics Map 데이터 → Google Sheets
    # ═══════════════════════════════════════════════════════════════════════════
    
    def export_physics_data(
        self, 
        spreadsheet_id: str,
        physics_data: Dict[str, Any],
        sheet_name: str = "Physics Map"
    ) -> bool:
        """
        Physics Map 데이터를 Google Sheets로 내보내기
        
        Args:
            spreadsheet_id: Google Sheets ID (URL에서 추출)
            physics_data: Physics Map 분석 결과
            sheet_name: 시트 이름
        
        Returns:
            성공 여부
        """
        if not self.service:
            print("❌ Google API 연결 안됨")
            return False
        
        try:
            # 헤더 행
            headers = [
                "ID", "이름", "역할", "위치",
                "Total Value (V)", "Inflow", "Outflow", 
                "Time Cost (T)", "Synergy (S)", "12M Forecast",
                "상태", "업데이트 시간"
            ]
            
            # 데이터 행 변환
            rows = [headers]
            
            for node in physics_data.get("nodes", []):
                row = [
                    node.get("id", ""),
                    node.get("name", node.get("label", "")),
                    node.get("role", ""),
                    node.get("location", ""),
                    node.get("value", 0),
                    node.get("inflow", 0),
                    node.get("outflow", 0),
                    node.get("time_cost", node.get("time", 0)),
                    node.get("synergy", 0),
                    node.get("forecast", 0),
                    node.get("status", "optimal"),
                    datetime.now().isoformat()
                ]
                rows.append(row)
            
            # Google Sheets에 쓰기
            body = {'values': rows}
            
            self.service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range=f"{sheet_name}!A1",
                valueInputOption='USER_ENTERED',
                body=body
            ).execute()
            
            print(f"✅ Google Sheets 내보내기 완료: {len(rows)-1}개 노드")
            return True
            
        except Exception as e:
            print(f"❌ 내보내기 실패: {e}")
            return False
    
    def export_flows(
        self,
        spreadsheet_id: str,
        flows: List[Dict],
        sheet_name: str = "Money Flows"
    ) -> bool:
        """
        돈 흐름 데이터를 Google Sheets로 내보내기
        """
        if not self.service:
            return False
        
        try:
            headers = [
                "From", "To", "금액", "유형", 
                "Physics Value", "업데이트 시간"
            ]
            
            rows = [headers]
            for flow in flows:
                row = [
                    flow.get("from", ""),
                    flow.get("to", ""),
                    flow.get("value", 0),
                    flow.get("type", ""),
                    flow.get("physics_value", 0),
                    datetime.now().isoformat()
                ]
                rows.append(row)
            
            body = {'values': rows}
            
            self.service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range=f"{sheet_name}!A1",
                valueInputOption='USER_ENTERED',
                body=body
            ).execute()
            
            print(f"✅ 돈 흐름 내보내기 완료: {len(rows)-1}개")
            return True
            
        except Exception as e:
            print(f"❌ 내보내기 실패: {e}")
            return False
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Google Sheets → Physics Map 데이터
    # ═══════════════════════════════════════════════════════════════════════════
    
    def import_physics_data(
        self,
        spreadsheet_id: str,
        sheet_name: str = "Physics Map",
        range_notation: str = "A:L"
    ) -> Optional[Dict[str, Any]]:
        """
        Google Sheets에서 Physics Map 데이터 불러오기
        
        Args:
            spreadsheet_id: Google Sheets ID
            sheet_name: 시트 이름
            range_notation: 셀 범위
        
        Returns:
            Physics Map 데이터 딕셔너리
        """
        if not self.service:
            return None
        
        try:
            result = self.service.spreadsheets().values().get(
                spreadsheetId=spreadsheet_id,
                range=f"{sheet_name}!{range_notation}"
            ).execute()
            
            values = result.get('values', [])
            
            if not values:
                print("⚠️ 데이터 없음")
                return None
            
            # 헤더 제외하고 데이터 파싱
            headers = values[0]
            nodes = []
            
            for row in values[1:]:
                if len(row) >= 6:  # 최소 필수 필드
                    node = {
                        "id": row[0] if len(row) > 0 else "",
                        "name": row[1] if len(row) > 1 else "",
                        "role": row[2] if len(row) > 2 else "",
                        "location": row[3] if len(row) > 3 else "",
                        "value": self._parse_number(row[4]) if len(row) > 4 else 0,
                        "inflow": self._parse_number(row[5]) if len(row) > 5 else 0,
                        "outflow": self._parse_number(row[6]) if len(row) > 6 else 0,
                        "time_cost": self._parse_number(row[7]) if len(row) > 7 else 0,
                        "synergy": self._parse_number(row[8]) if len(row) > 8 else 0,
                        "forecast": self._parse_number(row[9]) if len(row) > 9 else 0,
                        "status": row[10] if len(row) > 10 else "optimal"
                    }
                    nodes.append(node)
            
            print(f"✅ Google Sheets에서 {len(nodes)}개 노드 불러옴")
            
            return {
                "nodes": nodes,
                "imported_at": datetime.now().isoformat(),
                "source": f"Google Sheets: {spreadsheet_id}"
            }
            
        except Exception as e:
            print(f"❌ 불러오기 실패: {e}")
            return None
    
    def _parse_number(self, value: Any) -> float:
        """문자열을 숫자로 변환"""
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            # 원화 기호, 콤마 제거
            cleaned = value.replace('₩', '').replace(',', '').replace('억', '00000000').replace('만', '0000')
            try:
                return float(cleaned)
            except:
                return 0
        return 0
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════
    
    def create_physics_template(self, spreadsheet_id: str) -> bool:
        """
        Physics Map 템플릿 시트 생성
        """
        if not self.service:
            return False
        
        try:
            # Physics Map 시트
            physics_headers = [
                ["AUTUS Physics Map - 노드 데이터"],
                [""],
                ["ID", "이름", "역할", "위치", "Total Value", "Inflow", "Outflow", 
                 "Time Cost", "Synergy", "12M Forecast", "상태", "메모"],
                ["당신", "대표", "CONTROLLER", "서울 강남구", 182886563, 214000000, 38500000,
                 4000000, 11406562, 210000000, "optimal", ""],
                ["매니저", "매니저", "OPERATOR", "서울 서초구", 75000000, 85000000, 10000000,
                 3000000, 3000000, 90000000, "optimal", ""],
            ]
            
            # Money Flows 시트
            flow_headers = [
                ["AUTUS Physics Map - 돈 흐름"],
                [""],
                ["From", "To", "금액", "유형", "Physics Value", "메모"],
                ["학부모군", "당신", 120000000, "inflow", 120000000, "월 수업료"],
                ["당신", "매니저", 25000000, "inflow", 25000000, "급여"],
            ]
            
            # 시트 생성 및 데이터 입력
            requests = [
                {
                    'addSheet': {
                        'properties': {'title': 'Physics Map'}
                    }
                },
                {
                    'addSheet': {
                        'properties': {'title': 'Money Flows'}
                    }
                }
            ]
            
            # 시트 추가 시도 (이미 있으면 무시)
            try:
                self.service.spreadsheets().batchUpdate(
                    spreadsheetId=spreadsheet_id,
                    body={'requests': requests}
                ).execute()
            except:
                pass  # 이미 존재하면 무시
            
            # 데이터 입력
            self.service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range="Physics Map!A1",
                valueInputOption='USER_ENTERED',
                body={'values': physics_headers}
            ).execute()
            
            self.service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range="Money Flows!A1",
                valueInputOption='USER_ENTERED',
                body={'values': flow_headers}
            ).execute()
            
            print("✅ Physics Map 템플릿 생성 완료!")
            return True
            
        except Exception as e:
            print(f"❌ 템플릿 생성 실패: {e}")
            return False


# ═══════════════════════════════════════════════════════════════════════════════
# 사용 예제
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 1. 클라이언트 초기화
    sheets = GoogleSheetsClient("credentials.json")
    
    # 2. 스프레드시트 ID (URL에서 추출)
    # https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
    SPREADSHEET_ID = "your-spreadsheet-id-here"
    
    # 3. 템플릿 생성 (최초 1회)
    # sheets.create_physics_template(SPREADSHEET_ID)
    
    # 4. 데이터 내보내기 예제
    sample_data = {
        "nodes": [
            {
                "id": "당신",
                "name": "대표",
                "role": "CONTROLLER",
                "location": "서울 강남구",
                "value": 182886563,
                "inflow": 214000000,
                "outflow": 38500000,
                "time_cost": 4000000,
                "synergy": 11406562,
                "forecast": 210000000,
                "status": "optimal"
            }
        ]
    }
    
    # sheets.export_physics_data(SPREADSHEET_ID, sample_data)
    
    # 5. 데이터 불러오기
    # imported = sheets.import_physics_data(SPREADSHEET_ID)
    # print(json.dumps(imported, indent=2, ensure_ascii=False))
    
    print("\n📋 Google Sheets 연동 설정 가이드:")
    print("1. https://console.cloud.google.com 접속")
    print("2. 새 프로젝트 생성 또는 기존 프로젝트 선택")
    print("3. APIs & Services → Library → 'Google Sheets API' 검색 → 사용")
    print("4. APIs & Services → Credentials → Create Credentials → Service Account")
    print("5. 서비스 계정 생성 후 Keys → Add Key → JSON 다운로드")
    print("6. 다운로드한 파일을 credentials.json으로 저장")
    print("7. Google Sheets에서 서비스 계정 이메일에 편집자 권한 부여")





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🟢 AUTUS Physics Map - Google Sheets 연동                                    ║
║                                                                               ║
║  기능:                                                                        ║
║  - Physics Map 데이터 → Google Sheets 자동 저장                               ║
║  - Google Sheets → Physics Map 데이터 불러오기                                ║
║  - 실시간 동기화                                                              ║
║                                                                               ║
║  설정 방법:                                                                   ║
║  1. Google Cloud Console → APIs & Services → Credentials                     ║
║  2. Service Account 생성 → JSON 키 다운로드                                   ║
║  3. credentials.json을 이 폴더에 저장                                         ║
║  4. Google Sheets에서 서비스 계정 이메일에 편집 권한 부여                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
from datetime import datetime
from typing import List, Dict, Any, Optional

# Google API
try:
    from google.oauth2.service_account import Credentials
    from googleapiclient.discovery import build
    GOOGLE_AVAILABLE = True
except ImportError:
    GOOGLE_AVAILABLE = False
    print("⚠️ google-api-python-client 설치 필요: pip install google-api-python-client google-auth")


class GoogleSheetsClient:
    """
    AUTUS Physics Map ↔ Google Sheets 연동 클라이언트
    """
    
    SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
    
    def __init__(self, credentials_path: str = "credentials.json"):
        """
        Google Sheets 클라이언트 초기화
        
        Args:
            credentials_path: 서비스 계정 JSON 키 파일 경로
        """
        self.credentials_path = credentials_path
        self.service = None
        
        if GOOGLE_AVAILABLE:
            self._authenticate()
    
    def _authenticate(self):
        """Google API 인증"""
        if not os.path.exists(self.credentials_path):
            print(f"❌ credentials.json 파일이 없습니다: {self.credentials_path}")
            print("📋 설정 방법:")
            print("   1. https://console.cloud.google.com 접속")
            print("   2. APIs & Services → Credentials")
            print("   3. Create Credentials → Service Account")
            print("   4. JSON 키 다운로드 → credentials.json으로 저장")
            return
        
        try:
            creds = Credentials.from_service_account_file(
                self.credentials_path, 
                scopes=self.SCOPES
            )
            self.service = build('sheets', 'v4', credentials=creds)
            print("✅ Google Sheets API 연결 성공!")
        except Exception as e:
            print(f"❌ Google API 인증 실패: {e}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Physics Map 데이터 → Google Sheets
    # ═══════════════════════════════════════════════════════════════════════════
    
    def export_physics_data(
        self, 
        spreadsheet_id: str,
        physics_data: Dict[str, Any],
        sheet_name: str = "Physics Map"
    ) -> bool:
        """
        Physics Map 데이터를 Google Sheets로 내보내기
        
        Args:
            spreadsheet_id: Google Sheets ID (URL에서 추출)
            physics_data: Physics Map 분석 결과
            sheet_name: 시트 이름
        
        Returns:
            성공 여부
        """
        if not self.service:
            print("❌ Google API 연결 안됨")
            return False
        
        try:
            # 헤더 행
            headers = [
                "ID", "이름", "역할", "위치",
                "Total Value (V)", "Inflow", "Outflow", 
                "Time Cost (T)", "Synergy (S)", "12M Forecast",
                "상태", "업데이트 시간"
            ]
            
            # 데이터 행 변환
            rows = [headers]
            
            for node in physics_data.get("nodes", []):
                row = [
                    node.get("id", ""),
                    node.get("name", node.get("label", "")),
                    node.get("role", ""),
                    node.get("location", ""),
                    node.get("value", 0),
                    node.get("inflow", 0),
                    node.get("outflow", 0),
                    node.get("time_cost", node.get("time", 0)),
                    node.get("synergy", 0),
                    node.get("forecast", 0),
                    node.get("status", "optimal"),
                    datetime.now().isoformat()
                ]
                rows.append(row)
            
            # Google Sheets에 쓰기
            body = {'values': rows}
            
            self.service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range=f"{sheet_name}!A1",
                valueInputOption='USER_ENTERED',
                body=body
            ).execute()
            
            print(f"✅ Google Sheets 내보내기 완료: {len(rows)-1}개 노드")
            return True
            
        except Exception as e:
            print(f"❌ 내보내기 실패: {e}")
            return False
    
    def export_flows(
        self,
        spreadsheet_id: str,
        flows: List[Dict],
        sheet_name: str = "Money Flows"
    ) -> bool:
        """
        돈 흐름 데이터를 Google Sheets로 내보내기
        """
        if not self.service:
            return False
        
        try:
            headers = [
                "From", "To", "금액", "유형", 
                "Physics Value", "업데이트 시간"
            ]
            
            rows = [headers]
            for flow in flows:
                row = [
                    flow.get("from", ""),
                    flow.get("to", ""),
                    flow.get("value", 0),
                    flow.get("type", ""),
                    flow.get("physics_value", 0),
                    datetime.now().isoformat()
                ]
                rows.append(row)
            
            body = {'values': rows}
            
            self.service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range=f"{sheet_name}!A1",
                valueInputOption='USER_ENTERED',
                body=body
            ).execute()
            
            print(f"✅ 돈 흐름 내보내기 완료: {len(rows)-1}개")
            return True
            
        except Exception as e:
            print(f"❌ 내보내기 실패: {e}")
            return False
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Google Sheets → Physics Map 데이터
    # ═══════════════════════════════════════════════════════════════════════════
    
    def import_physics_data(
        self,
        spreadsheet_id: str,
        sheet_name: str = "Physics Map",
        range_notation: str = "A:L"
    ) -> Optional[Dict[str, Any]]:
        """
        Google Sheets에서 Physics Map 데이터 불러오기
        
        Args:
            spreadsheet_id: Google Sheets ID
            sheet_name: 시트 이름
            range_notation: 셀 범위
        
        Returns:
            Physics Map 데이터 딕셔너리
        """
        if not self.service:
            return None
        
        try:
            result = self.service.spreadsheets().values().get(
                spreadsheetId=spreadsheet_id,
                range=f"{sheet_name}!{range_notation}"
            ).execute()
            
            values = result.get('values', [])
            
            if not values:
                print("⚠️ 데이터 없음")
                return None
            
            # 헤더 제외하고 데이터 파싱
            headers = values[0]
            nodes = []
            
            for row in values[1:]:
                if len(row) >= 6:  # 최소 필수 필드
                    node = {
                        "id": row[0] if len(row) > 0 else "",
                        "name": row[1] if len(row) > 1 else "",
                        "role": row[2] if len(row) > 2 else "",
                        "location": row[3] if len(row) > 3 else "",
                        "value": self._parse_number(row[4]) if len(row) > 4 else 0,
                        "inflow": self._parse_number(row[5]) if len(row) > 5 else 0,
                        "outflow": self._parse_number(row[6]) if len(row) > 6 else 0,
                        "time_cost": self._parse_number(row[7]) if len(row) > 7 else 0,
                        "synergy": self._parse_number(row[8]) if len(row) > 8 else 0,
                        "forecast": self._parse_number(row[9]) if len(row) > 9 else 0,
                        "status": row[10] if len(row) > 10 else "optimal"
                    }
                    nodes.append(node)
            
            print(f"✅ Google Sheets에서 {len(nodes)}개 노드 불러옴")
            
            return {
                "nodes": nodes,
                "imported_at": datetime.now().isoformat(),
                "source": f"Google Sheets: {spreadsheet_id}"
            }
            
        except Exception as e:
            print(f"❌ 불러오기 실패: {e}")
            return None
    
    def _parse_number(self, value: Any) -> float:
        """문자열을 숫자로 변환"""
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            # 원화 기호, 콤마 제거
            cleaned = value.replace('₩', '').replace(',', '').replace('억', '00000000').replace('만', '0000')
            try:
                return float(cleaned)
            except:
                return 0
        return 0
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════
    
    def create_physics_template(self, spreadsheet_id: str) -> bool:
        """
        Physics Map 템플릿 시트 생성
        """
        if not self.service:
            return False
        
        try:
            # Physics Map 시트
            physics_headers = [
                ["AUTUS Physics Map - 노드 데이터"],
                [""],
                ["ID", "이름", "역할", "위치", "Total Value", "Inflow", "Outflow", 
                 "Time Cost", "Synergy", "12M Forecast", "상태", "메모"],
                ["당신", "대표", "CONTROLLER", "서울 강남구", 182886563, 214000000, 38500000,
                 4000000, 11406562, 210000000, "optimal", ""],
                ["매니저", "매니저", "OPERATOR", "서울 서초구", 75000000, 85000000, 10000000,
                 3000000, 3000000, 90000000, "optimal", ""],
            ]
            
            # Money Flows 시트
            flow_headers = [
                ["AUTUS Physics Map - 돈 흐름"],
                [""],
                ["From", "To", "금액", "유형", "Physics Value", "메모"],
                ["학부모군", "당신", 120000000, "inflow", 120000000, "월 수업료"],
                ["당신", "매니저", 25000000, "inflow", 25000000, "급여"],
            ]
            
            # 시트 생성 및 데이터 입력
            requests = [
                {
                    'addSheet': {
                        'properties': {'title': 'Physics Map'}
                    }
                },
                {
                    'addSheet': {
                        'properties': {'title': 'Money Flows'}
                    }
                }
            ]
            
            # 시트 추가 시도 (이미 있으면 무시)
            try:
                self.service.spreadsheets().batchUpdate(
                    spreadsheetId=spreadsheet_id,
                    body={'requests': requests}
                ).execute()
            except:
                pass  # 이미 존재하면 무시
            
            # 데이터 입력
            self.service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range="Physics Map!A1",
                valueInputOption='USER_ENTERED',
                body={'values': physics_headers}
            ).execute()
            
            self.service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range="Money Flows!A1",
                valueInputOption='USER_ENTERED',
                body={'values': flow_headers}
            ).execute()
            
            print("✅ Physics Map 템플릿 생성 완료!")
            return True
            
        except Exception as e:
            print(f"❌ 템플릿 생성 실패: {e}")
            return False


# ═══════════════════════════════════════════════════════════════════════════════
# 사용 예제
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 1. 클라이언트 초기화
    sheets = GoogleSheetsClient("credentials.json")
    
    # 2. 스프레드시트 ID (URL에서 추출)
    # https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
    SPREADSHEET_ID = "your-spreadsheet-id-here"
    
    # 3. 템플릿 생성 (최초 1회)
    # sheets.create_physics_template(SPREADSHEET_ID)
    
    # 4. 데이터 내보내기 예제
    sample_data = {
        "nodes": [
            {
                "id": "당신",
                "name": "대표",
                "role": "CONTROLLER",
                "location": "서울 강남구",
                "value": 182886563,
                "inflow": 214000000,
                "outflow": 38500000,
                "time_cost": 4000000,
                "synergy": 11406562,
                "forecast": 210000000,
                "status": "optimal"
            }
        ]
    }
    
    # sheets.export_physics_data(SPREADSHEET_ID, sample_data)
    
    # 5. 데이터 불러오기
    # imported = sheets.import_physics_data(SPREADSHEET_ID)
    # print(json.dumps(imported, indent=2, ensure_ascii=False))
    
    print("\n📋 Google Sheets 연동 설정 가이드:")
    print("1. https://console.cloud.google.com 접속")
    print("2. 새 프로젝트 생성 또는 기존 프로젝트 선택")
    print("3. APIs & Services → Library → 'Google Sheets API' 검색 → 사용")
    print("4. APIs & Services → Credentials → Create Credentials → Service Account")
    print("5. 서비스 계정 생성 후 Keys → Add Key → JSON 다운로드")
    print("6. 다운로드한 파일을 credentials.json으로 저장")
    print("7. Google Sheets에서 서비스 계정 이메일에 편집자 권한 부여")















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🟢 AUTUS Physics Map - Google Sheets 연동                                    ║
║                                                                               ║
║  기능:                                                                        ║
║  - Physics Map 데이터 → Google Sheets 자동 저장                               ║
║  - Google Sheets → Physics Map 데이터 불러오기                                ║
║  - 실시간 동기화                                                              ║
║                                                                               ║
║  설정 방법:                                                                   ║
║  1. Google Cloud Console → APIs & Services → Credentials                     ║
║  2. Service Account 생성 → JSON 키 다운로드                                   ║
║  3. credentials.json을 이 폴더에 저장                                         ║
║  4. Google Sheets에서 서비스 계정 이메일에 편집 권한 부여                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
from datetime import datetime
from typing import List, Dict, Any, Optional

# Google API
try:
    from google.oauth2.service_account import Credentials
    from googleapiclient.discovery import build
    GOOGLE_AVAILABLE = True
except ImportError:
    GOOGLE_AVAILABLE = False
    print("⚠️ google-api-python-client 설치 필요: pip install google-api-python-client google-auth")


class GoogleSheetsClient:
    """
    AUTUS Physics Map ↔ Google Sheets 연동 클라이언트
    """
    
    SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
    
    def __init__(self, credentials_path: str = "credentials.json"):
        """
        Google Sheets 클라이언트 초기화
        
        Args:
            credentials_path: 서비스 계정 JSON 키 파일 경로
        """
        self.credentials_path = credentials_path
        self.service = None
        
        if GOOGLE_AVAILABLE:
            self._authenticate()
    
    def _authenticate(self):
        """Google API 인증"""
        if not os.path.exists(self.credentials_path):
            print(f"❌ credentials.json 파일이 없습니다: {self.credentials_path}")
            print("📋 설정 방법:")
            print("   1. https://console.cloud.google.com 접속")
            print("   2. APIs & Services → Credentials")
            print("   3. Create Credentials → Service Account")
            print("   4. JSON 키 다운로드 → credentials.json으로 저장")
            return
        
        try:
            creds = Credentials.from_service_account_file(
                self.credentials_path, 
                scopes=self.SCOPES
            )
            self.service = build('sheets', 'v4', credentials=creds)
            print("✅ Google Sheets API 연결 성공!")
        except Exception as e:
            print(f"❌ Google API 인증 실패: {e}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Physics Map 데이터 → Google Sheets
    # ═══════════════════════════════════════════════════════════════════════════
    
    def export_physics_data(
        self, 
        spreadsheet_id: str,
        physics_data: Dict[str, Any],
        sheet_name: str = "Physics Map"
    ) -> bool:
        """
        Physics Map 데이터를 Google Sheets로 내보내기
        
        Args:
            spreadsheet_id: Google Sheets ID (URL에서 추출)
            physics_data: Physics Map 분석 결과
            sheet_name: 시트 이름
        
        Returns:
            성공 여부
        """
        if not self.service:
            print("❌ Google API 연결 안됨")
            return False
        
        try:
            # 헤더 행
            headers = [
                "ID", "이름", "역할", "위치",
                "Total Value (V)", "Inflow", "Outflow", 
                "Time Cost (T)", "Synergy (S)", "12M Forecast",
                "상태", "업데이트 시간"
            ]
            
            # 데이터 행 변환
            rows = [headers]
            
            for node in physics_data.get("nodes", []):
                row = [
                    node.get("id", ""),
                    node.get("name", node.get("label", "")),
                    node.get("role", ""),
                    node.get("location", ""),
                    node.get("value", 0),
                    node.get("inflow", 0),
                    node.get("outflow", 0),
                    node.get("time_cost", node.get("time", 0)),
                    node.get("synergy", 0),
                    node.get("forecast", 0),
                    node.get("status", "optimal"),
                    datetime.now().isoformat()
                ]
                rows.append(row)
            
            # Google Sheets에 쓰기
            body = {'values': rows}
            
            self.service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range=f"{sheet_name}!A1",
                valueInputOption='USER_ENTERED',
                body=body
            ).execute()
            
            print(f"✅ Google Sheets 내보내기 완료: {len(rows)-1}개 노드")
            return True
            
        except Exception as e:
            print(f"❌ 내보내기 실패: {e}")
            return False
    
    def export_flows(
        self,
        spreadsheet_id: str,
        flows: List[Dict],
        sheet_name: str = "Money Flows"
    ) -> bool:
        """
        돈 흐름 데이터를 Google Sheets로 내보내기
        """
        if not self.service:
            return False
        
        try:
            headers = [
                "From", "To", "금액", "유형", 
                "Physics Value", "업데이트 시간"
            ]
            
            rows = [headers]
            for flow in flows:
                row = [
                    flow.get("from", ""),
                    flow.get("to", ""),
                    flow.get("value", 0),
                    flow.get("type", ""),
                    flow.get("physics_value", 0),
                    datetime.now().isoformat()
                ]
                rows.append(row)
            
            body = {'values': rows}
            
            self.service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range=f"{sheet_name}!A1",
                valueInputOption='USER_ENTERED',
                body=body
            ).execute()
            
            print(f"✅ 돈 흐름 내보내기 완료: {len(rows)-1}개")
            return True
            
        except Exception as e:
            print(f"❌ 내보내기 실패: {e}")
            return False
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Google Sheets → Physics Map 데이터
    # ═══════════════════════════════════════════════════════════════════════════
    
    def import_physics_data(
        self,
        spreadsheet_id: str,
        sheet_name: str = "Physics Map",
        range_notation: str = "A:L"
    ) -> Optional[Dict[str, Any]]:
        """
        Google Sheets에서 Physics Map 데이터 불러오기
        
        Args:
            spreadsheet_id: Google Sheets ID
            sheet_name: 시트 이름
            range_notation: 셀 범위
        
        Returns:
            Physics Map 데이터 딕셔너리
        """
        if not self.service:
            return None
        
        try:
            result = self.service.spreadsheets().values().get(
                spreadsheetId=spreadsheet_id,
                range=f"{sheet_name}!{range_notation}"
            ).execute()
            
            values = result.get('values', [])
            
            if not values:
                print("⚠️ 데이터 없음")
                return None
            
            # 헤더 제외하고 데이터 파싱
            headers = values[0]
            nodes = []
            
            for row in values[1:]:
                if len(row) >= 6:  # 최소 필수 필드
                    node = {
                        "id": row[0] if len(row) > 0 else "",
                        "name": row[1] if len(row) > 1 else "",
                        "role": row[2] if len(row) > 2 else "",
                        "location": row[3] if len(row) > 3 else "",
                        "value": self._parse_number(row[4]) if len(row) > 4 else 0,
                        "inflow": self._parse_number(row[5]) if len(row) > 5 else 0,
                        "outflow": self._parse_number(row[6]) if len(row) > 6 else 0,
                        "time_cost": self._parse_number(row[7]) if len(row) > 7 else 0,
                        "synergy": self._parse_number(row[8]) if len(row) > 8 else 0,
                        "forecast": self._parse_number(row[9]) if len(row) > 9 else 0,
                        "status": row[10] if len(row) > 10 else "optimal"
                    }
                    nodes.append(node)
            
            print(f"✅ Google Sheets에서 {len(nodes)}개 노드 불러옴")
            
            return {
                "nodes": nodes,
                "imported_at": datetime.now().isoformat(),
                "source": f"Google Sheets: {spreadsheet_id}"
            }
            
        except Exception as e:
            print(f"❌ 불러오기 실패: {e}")
            return None
    
    def _parse_number(self, value: Any) -> float:
        """문자열을 숫자로 변환"""
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            # 원화 기호, 콤마 제거
            cleaned = value.replace('₩', '').replace(',', '').replace('억', '00000000').replace('만', '0000')
            try:
                return float(cleaned)
            except:
                return 0
        return 0
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════
    
    def create_physics_template(self, spreadsheet_id: str) -> bool:
        """
        Physics Map 템플릿 시트 생성
        """
        if not self.service:
            return False
        
        try:
            # Physics Map 시트
            physics_headers = [
                ["AUTUS Physics Map - 노드 데이터"],
                [""],
                ["ID", "이름", "역할", "위치", "Total Value", "Inflow", "Outflow", 
                 "Time Cost", "Synergy", "12M Forecast", "상태", "메모"],
                ["당신", "대표", "CONTROLLER", "서울 강남구", 182886563, 214000000, 38500000,
                 4000000, 11406562, 210000000, "optimal", ""],
                ["매니저", "매니저", "OPERATOR", "서울 서초구", 75000000, 85000000, 10000000,
                 3000000, 3000000, 90000000, "optimal", ""],
            ]
            
            # Money Flows 시트
            flow_headers = [
                ["AUTUS Physics Map - 돈 흐름"],
                [""],
                ["From", "To", "금액", "유형", "Physics Value", "메모"],
                ["학부모군", "당신", 120000000, "inflow", 120000000, "월 수업료"],
                ["당신", "매니저", 25000000, "inflow", 25000000, "급여"],
            ]
            
            # 시트 생성 및 데이터 입력
            requests = [
                {
                    'addSheet': {
                        'properties': {'title': 'Physics Map'}
                    }
                },
                {
                    'addSheet': {
                        'properties': {'title': 'Money Flows'}
                    }
                }
            ]
            
            # 시트 추가 시도 (이미 있으면 무시)
            try:
                self.service.spreadsheets().batchUpdate(
                    spreadsheetId=spreadsheet_id,
                    body={'requests': requests}
                ).execute()
            except:
                pass  # 이미 존재하면 무시
            
            # 데이터 입력
            self.service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range="Physics Map!A1",
                valueInputOption='USER_ENTERED',
                body={'values': physics_headers}
            ).execute()
            
            self.service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range="Money Flows!A1",
                valueInputOption='USER_ENTERED',
                body={'values': flow_headers}
            ).execute()
            
            print("✅ Physics Map 템플릿 생성 완료!")
            return True
            
        except Exception as e:
            print(f"❌ 템플릿 생성 실패: {e}")
            return False


# ═══════════════════════════════════════════════════════════════════════════════
# 사용 예제
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 1. 클라이언트 초기화
    sheets = GoogleSheetsClient("credentials.json")
    
    # 2. 스프레드시트 ID (URL에서 추출)
    # https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
    SPREADSHEET_ID = "your-spreadsheet-id-here"
    
    # 3. 템플릿 생성 (최초 1회)
    # sheets.create_physics_template(SPREADSHEET_ID)
    
    # 4. 데이터 내보내기 예제
    sample_data = {
        "nodes": [
            {
                "id": "당신",
                "name": "대표",
                "role": "CONTROLLER",
                "location": "서울 강남구",
                "value": 182886563,
                "inflow": 214000000,
                "outflow": 38500000,
                "time_cost": 4000000,
                "synergy": 11406562,
                "forecast": 210000000,
                "status": "optimal"
            }
        ]
    }
    
    # sheets.export_physics_data(SPREADSHEET_ID, sample_data)
    
    # 5. 데이터 불러오기
    # imported = sheets.import_physics_data(SPREADSHEET_ID)
    # print(json.dumps(imported, indent=2, ensure_ascii=False))
    
    print("\n📋 Google Sheets 연동 설정 가이드:")
    print("1. https://console.cloud.google.com 접속")
    print("2. 새 프로젝트 생성 또는 기존 프로젝트 선택")
    print("3. APIs & Services → Library → 'Google Sheets API' 검색 → 사용")
    print("4. APIs & Services → Credentials → Create Credentials → Service Account")
    print("5. 서비스 계정 생성 후 Keys → Add Key → JSON 다운로드")
    print("6. 다운로드한 파일을 credentials.json으로 저장")
    print("7. Google Sheets에서 서비스 계정 이메일에 편집자 권한 부여")





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🟢 AUTUS Physics Map - Google Sheets 연동                                    ║
║                                                                               ║
║  기능:                                                                        ║
║  - Physics Map 데이터 → Google Sheets 자동 저장                               ║
║  - Google Sheets → Physics Map 데이터 불러오기                                ║
║  - 실시간 동기화                                                              ║
║                                                                               ║
║  설정 방법:                                                                   ║
║  1. Google Cloud Console → APIs & Services → Credentials                     ║
║  2. Service Account 생성 → JSON 키 다운로드                                   ║
║  3. credentials.json을 이 폴더에 저장                                         ║
║  4. Google Sheets에서 서비스 계정 이메일에 편집 권한 부여                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
from datetime import datetime
from typing import List, Dict, Any, Optional

# Google API
try:
    from google.oauth2.service_account import Credentials
    from googleapiclient.discovery import build
    GOOGLE_AVAILABLE = True
except ImportError:
    GOOGLE_AVAILABLE = False
    print("⚠️ google-api-python-client 설치 필요: pip install google-api-python-client google-auth")


class GoogleSheetsClient:
    """
    AUTUS Physics Map ↔ Google Sheets 연동 클라이언트
    """
    
    SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
    
    def __init__(self, credentials_path: str = "credentials.json"):
        """
        Google Sheets 클라이언트 초기화
        
        Args:
            credentials_path: 서비스 계정 JSON 키 파일 경로
        """
        self.credentials_path = credentials_path
        self.service = None
        
        if GOOGLE_AVAILABLE:
            self._authenticate()
    
    def _authenticate(self):
        """Google API 인증"""
        if not os.path.exists(self.credentials_path):
            print(f"❌ credentials.json 파일이 없습니다: {self.credentials_path}")
            print("📋 설정 방법:")
            print("   1. https://console.cloud.google.com 접속")
            print("   2. APIs & Services → Credentials")
            print("   3. Create Credentials → Service Account")
            print("   4. JSON 키 다운로드 → credentials.json으로 저장")
            return
        
        try:
            creds = Credentials.from_service_account_file(
                self.credentials_path, 
                scopes=self.SCOPES
            )
            self.service = build('sheets', 'v4', credentials=creds)
            print("✅ Google Sheets API 연결 성공!")
        except Exception as e:
            print(f"❌ Google API 인증 실패: {e}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Physics Map 데이터 → Google Sheets
    # ═══════════════════════════════════════════════════════════════════════════
    
    def export_physics_data(
        self, 
        spreadsheet_id: str,
        physics_data: Dict[str, Any],
        sheet_name: str = "Physics Map"
    ) -> bool:
        """
        Physics Map 데이터를 Google Sheets로 내보내기
        
        Args:
            spreadsheet_id: Google Sheets ID (URL에서 추출)
            physics_data: Physics Map 분석 결과
            sheet_name: 시트 이름
        
        Returns:
            성공 여부
        """
        if not self.service:
            print("❌ Google API 연결 안됨")
            return False
        
        try:
            # 헤더 행
            headers = [
                "ID", "이름", "역할", "위치",
                "Total Value (V)", "Inflow", "Outflow", 
                "Time Cost (T)", "Synergy (S)", "12M Forecast",
                "상태", "업데이트 시간"
            ]
            
            # 데이터 행 변환
            rows = [headers]
            
            for node in physics_data.get("nodes", []):
                row = [
                    node.get("id", ""),
                    node.get("name", node.get("label", "")),
                    node.get("role", ""),
                    node.get("location", ""),
                    node.get("value", 0),
                    node.get("inflow", 0),
                    node.get("outflow", 0),
                    node.get("time_cost", node.get("time", 0)),
                    node.get("synergy", 0),
                    node.get("forecast", 0),
                    node.get("status", "optimal"),
                    datetime.now().isoformat()
                ]
                rows.append(row)
            
            # Google Sheets에 쓰기
            body = {'values': rows}
            
            self.service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range=f"{sheet_name}!A1",
                valueInputOption='USER_ENTERED',
                body=body
            ).execute()
            
            print(f"✅ Google Sheets 내보내기 완료: {len(rows)-1}개 노드")
            return True
            
        except Exception as e:
            print(f"❌ 내보내기 실패: {e}")
            return False
    
    def export_flows(
        self,
        spreadsheet_id: str,
        flows: List[Dict],
        sheet_name: str = "Money Flows"
    ) -> bool:
        """
        돈 흐름 데이터를 Google Sheets로 내보내기
        """
        if not self.service:
            return False
        
        try:
            headers = [
                "From", "To", "금액", "유형", 
                "Physics Value", "업데이트 시간"
            ]
            
            rows = [headers]
            for flow in flows:
                row = [
                    flow.get("from", ""),
                    flow.get("to", ""),
                    flow.get("value", 0),
                    flow.get("type", ""),
                    flow.get("physics_value", 0),
                    datetime.now().isoformat()
                ]
                rows.append(row)
            
            body = {'values': rows}
            
            self.service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range=f"{sheet_name}!A1",
                valueInputOption='USER_ENTERED',
                body=body
            ).execute()
            
            print(f"✅ 돈 흐름 내보내기 완료: {len(rows)-1}개")
            return True
            
        except Exception as e:
            print(f"❌ 내보내기 실패: {e}")
            return False
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Google Sheets → Physics Map 데이터
    # ═══════════════════════════════════════════════════════════════════════════
    
    def import_physics_data(
        self,
        spreadsheet_id: str,
        sheet_name: str = "Physics Map",
        range_notation: str = "A:L"
    ) -> Optional[Dict[str, Any]]:
        """
        Google Sheets에서 Physics Map 데이터 불러오기
        
        Args:
            spreadsheet_id: Google Sheets ID
            sheet_name: 시트 이름
            range_notation: 셀 범위
        
        Returns:
            Physics Map 데이터 딕셔너리
        """
        if not self.service:
            return None
        
        try:
            result = self.service.spreadsheets().values().get(
                spreadsheetId=spreadsheet_id,
                range=f"{sheet_name}!{range_notation}"
            ).execute()
            
            values = result.get('values', [])
            
            if not values:
                print("⚠️ 데이터 없음")
                return None
            
            # 헤더 제외하고 데이터 파싱
            headers = values[0]
            nodes = []
            
            for row in values[1:]:
                if len(row) >= 6:  # 최소 필수 필드
                    node = {
                        "id": row[0] if len(row) > 0 else "",
                        "name": row[1] if len(row) > 1 else "",
                        "role": row[2] if len(row) > 2 else "",
                        "location": row[3] if len(row) > 3 else "",
                        "value": self._parse_number(row[4]) if len(row) > 4 else 0,
                        "inflow": self._parse_number(row[5]) if len(row) > 5 else 0,
                        "outflow": self._parse_number(row[6]) if len(row) > 6 else 0,
                        "time_cost": self._parse_number(row[7]) if len(row) > 7 else 0,
                        "synergy": self._parse_number(row[8]) if len(row) > 8 else 0,
                        "forecast": self._parse_number(row[9]) if len(row) > 9 else 0,
                        "status": row[10] if len(row) > 10 else "optimal"
                    }
                    nodes.append(node)
            
            print(f"✅ Google Sheets에서 {len(nodes)}개 노드 불러옴")
            
            return {
                "nodes": nodes,
                "imported_at": datetime.now().isoformat(),
                "source": f"Google Sheets: {spreadsheet_id}"
            }
            
        except Exception as e:
            print(f"❌ 불러오기 실패: {e}")
            return None
    
    def _parse_number(self, value: Any) -> float:
        """문자열을 숫자로 변환"""
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            # 원화 기호, 콤마 제거
            cleaned = value.replace('₩', '').replace(',', '').replace('억', '00000000').replace('만', '0000')
            try:
                return float(cleaned)
            except:
                return 0
        return 0
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════
    
    def create_physics_template(self, spreadsheet_id: str) -> bool:
        """
        Physics Map 템플릿 시트 생성
        """
        if not self.service:
            return False
        
        try:
            # Physics Map 시트
            physics_headers = [
                ["AUTUS Physics Map - 노드 데이터"],
                [""],
                ["ID", "이름", "역할", "위치", "Total Value", "Inflow", "Outflow", 
                 "Time Cost", "Synergy", "12M Forecast", "상태", "메모"],
                ["당신", "대표", "CONTROLLER", "서울 강남구", 182886563, 214000000, 38500000,
                 4000000, 11406562, 210000000, "optimal", ""],
                ["매니저", "매니저", "OPERATOR", "서울 서초구", 75000000, 85000000, 10000000,
                 3000000, 3000000, 90000000, "optimal", ""],
            ]
            
            # Money Flows 시트
            flow_headers = [
                ["AUTUS Physics Map - 돈 흐름"],
                [""],
                ["From", "To", "금액", "유형", "Physics Value", "메모"],
                ["학부모군", "당신", 120000000, "inflow", 120000000, "월 수업료"],
                ["당신", "매니저", 25000000, "inflow", 25000000, "급여"],
            ]
            
            # 시트 생성 및 데이터 입력
            requests = [
                {
                    'addSheet': {
                        'properties': {'title': 'Physics Map'}
                    }
                },
                {
                    'addSheet': {
                        'properties': {'title': 'Money Flows'}
                    }
                }
            ]
            
            # 시트 추가 시도 (이미 있으면 무시)
            try:
                self.service.spreadsheets().batchUpdate(
                    spreadsheetId=spreadsheet_id,
                    body={'requests': requests}
                ).execute()
            except:
                pass  # 이미 존재하면 무시
            
            # 데이터 입력
            self.service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range="Physics Map!A1",
                valueInputOption='USER_ENTERED',
                body={'values': physics_headers}
            ).execute()
            
            self.service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range="Money Flows!A1",
                valueInputOption='USER_ENTERED',
                body={'values': flow_headers}
            ).execute()
            
            print("✅ Physics Map 템플릿 생성 완료!")
            return True
            
        except Exception as e:
            print(f"❌ 템플릿 생성 실패: {e}")
            return False


# ═══════════════════════════════════════════════════════════════════════════════
# 사용 예제
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 1. 클라이언트 초기화
    sheets = GoogleSheetsClient("credentials.json")
    
    # 2. 스프레드시트 ID (URL에서 추출)
    # https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
    SPREADSHEET_ID = "your-spreadsheet-id-here"
    
    # 3. 템플릿 생성 (최초 1회)
    # sheets.create_physics_template(SPREADSHEET_ID)
    
    # 4. 데이터 내보내기 예제
    sample_data = {
        "nodes": [
            {
                "id": "당신",
                "name": "대표",
                "role": "CONTROLLER",
                "location": "서울 강남구",
                "value": 182886563,
                "inflow": 214000000,
                "outflow": 38500000,
                "time_cost": 4000000,
                "synergy": 11406562,
                "forecast": 210000000,
                "status": "optimal"
            }
        ]
    }
    
    # sheets.export_physics_data(SPREADSHEET_ID, sample_data)
    
    # 5. 데이터 불러오기
    # imported = sheets.import_physics_data(SPREADSHEET_ID)
    # print(json.dumps(imported, indent=2, ensure_ascii=False))
    
    print("\n📋 Google Sheets 연동 설정 가이드:")
    print("1. https://console.cloud.google.com 접속")
    print("2. 새 프로젝트 생성 또는 기존 프로젝트 선택")
    print("3. APIs & Services → Library → 'Google Sheets API' 검색 → 사용")
    print("4. APIs & Services → Credentials → Create Credentials → Service Account")
    print("5. 서비스 계정 생성 후 Keys → Add Key → JSON 다운로드")
    print("6. 다운로드한 파일을 credentials.json으로 저장")
    print("7. Google Sheets에서 서비스 계정 이메일에 편집자 권한 부여")





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🟢 AUTUS Physics Map - Google Sheets 연동                                    ║
║                                                                               ║
║  기능:                                                                        ║
║  - Physics Map 데이터 → Google Sheets 자동 저장                               ║
║  - Google Sheets → Physics Map 데이터 불러오기                                ║
║  - 실시간 동기화                                                              ║
║                                                                               ║
║  설정 방법:                                                                   ║
║  1. Google Cloud Console → APIs & Services → Credentials                     ║
║  2. Service Account 생성 → JSON 키 다운로드                                   ║
║  3. credentials.json을 이 폴더에 저장                                         ║
║  4. Google Sheets에서 서비스 계정 이메일에 편집 권한 부여                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
from datetime import datetime
from typing import List, Dict, Any, Optional

# Google API
try:
    from google.oauth2.service_account import Credentials
    from googleapiclient.discovery import build
    GOOGLE_AVAILABLE = True
except ImportError:
    GOOGLE_AVAILABLE = False
    print("⚠️ google-api-python-client 설치 필요: pip install google-api-python-client google-auth")


class GoogleSheetsClient:
    """
    AUTUS Physics Map ↔ Google Sheets 연동 클라이언트
    """
    
    SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
    
    def __init__(self, credentials_path: str = "credentials.json"):
        """
        Google Sheets 클라이언트 초기화
        
        Args:
            credentials_path: 서비스 계정 JSON 키 파일 경로
        """
        self.credentials_path = credentials_path
        self.service = None
        
        if GOOGLE_AVAILABLE:
            self._authenticate()
    
    def _authenticate(self):
        """Google API 인증"""
        if not os.path.exists(self.credentials_path):
            print(f"❌ credentials.json 파일이 없습니다: {self.credentials_path}")
            print("📋 설정 방법:")
            print("   1. https://console.cloud.google.com 접속")
            print("   2. APIs & Services → Credentials")
            print("   3. Create Credentials → Service Account")
            print("   4. JSON 키 다운로드 → credentials.json으로 저장")
            return
        
        try:
            creds = Credentials.from_service_account_file(
                self.credentials_path, 
                scopes=self.SCOPES
            )
            self.service = build('sheets', 'v4', credentials=creds)
            print("✅ Google Sheets API 연결 성공!")
        except Exception as e:
            print(f"❌ Google API 인증 실패: {e}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Physics Map 데이터 → Google Sheets
    # ═══════════════════════════════════════════════════════════════════════════
    
    def export_physics_data(
        self, 
        spreadsheet_id: str,
        physics_data: Dict[str, Any],
        sheet_name: str = "Physics Map"
    ) -> bool:
        """
        Physics Map 데이터를 Google Sheets로 내보내기
        
        Args:
            spreadsheet_id: Google Sheets ID (URL에서 추출)
            physics_data: Physics Map 분석 결과
            sheet_name: 시트 이름
        
        Returns:
            성공 여부
        """
        if not self.service:
            print("❌ Google API 연결 안됨")
            return False
        
        try:
            # 헤더 행
            headers = [
                "ID", "이름", "역할", "위치",
                "Total Value (V)", "Inflow", "Outflow", 
                "Time Cost (T)", "Synergy (S)", "12M Forecast",
                "상태", "업데이트 시간"
            ]
            
            # 데이터 행 변환
            rows = [headers]
            
            for node in physics_data.get("nodes", []):
                row = [
                    node.get("id", ""),
                    node.get("name", node.get("label", "")),
                    node.get("role", ""),
                    node.get("location", ""),
                    node.get("value", 0),
                    node.get("inflow", 0),
                    node.get("outflow", 0),
                    node.get("time_cost", node.get("time", 0)),
                    node.get("synergy", 0),
                    node.get("forecast", 0),
                    node.get("status", "optimal"),
                    datetime.now().isoformat()
                ]
                rows.append(row)
            
            # Google Sheets에 쓰기
            body = {'values': rows}
            
            self.service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range=f"{sheet_name}!A1",
                valueInputOption='USER_ENTERED',
                body=body
            ).execute()
            
            print(f"✅ Google Sheets 내보내기 완료: {len(rows)-1}개 노드")
            return True
            
        except Exception as e:
            print(f"❌ 내보내기 실패: {e}")
            return False
    
    def export_flows(
        self,
        spreadsheet_id: str,
        flows: List[Dict],
        sheet_name: str = "Money Flows"
    ) -> bool:
        """
        돈 흐름 데이터를 Google Sheets로 내보내기
        """
        if not self.service:
            return False
        
        try:
            headers = [
                "From", "To", "금액", "유형", 
                "Physics Value", "업데이트 시간"
            ]
            
            rows = [headers]
            for flow in flows:
                row = [
                    flow.get("from", ""),
                    flow.get("to", ""),
                    flow.get("value", 0),
                    flow.get("type", ""),
                    flow.get("physics_value", 0),
                    datetime.now().isoformat()
                ]
                rows.append(row)
            
            body = {'values': rows}
            
            self.service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range=f"{sheet_name}!A1",
                valueInputOption='USER_ENTERED',
                body=body
            ).execute()
            
            print(f"✅ 돈 흐름 내보내기 완료: {len(rows)-1}개")
            return True
            
        except Exception as e:
            print(f"❌ 내보내기 실패: {e}")
            return False
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Google Sheets → Physics Map 데이터
    # ═══════════════════════════════════════════════════════════════════════════
    
    def import_physics_data(
        self,
        spreadsheet_id: str,
        sheet_name: str = "Physics Map",
        range_notation: str = "A:L"
    ) -> Optional[Dict[str, Any]]:
        """
        Google Sheets에서 Physics Map 데이터 불러오기
        
        Args:
            spreadsheet_id: Google Sheets ID
            sheet_name: 시트 이름
            range_notation: 셀 범위
        
        Returns:
            Physics Map 데이터 딕셔너리
        """
        if not self.service:
            return None
        
        try:
            result = self.service.spreadsheets().values().get(
                spreadsheetId=spreadsheet_id,
                range=f"{sheet_name}!{range_notation}"
            ).execute()
            
            values = result.get('values', [])
            
            if not values:
                print("⚠️ 데이터 없음")
                return None
            
            # 헤더 제외하고 데이터 파싱
            headers = values[0]
            nodes = []
            
            for row in values[1:]:
                if len(row) >= 6:  # 최소 필수 필드
                    node = {
                        "id": row[0] if len(row) > 0 else "",
                        "name": row[1] if len(row) > 1 else "",
                        "role": row[2] if len(row) > 2 else "",
                        "location": row[3] if len(row) > 3 else "",
                        "value": self._parse_number(row[4]) if len(row) > 4 else 0,
                        "inflow": self._parse_number(row[5]) if len(row) > 5 else 0,
                        "outflow": self._parse_number(row[6]) if len(row) > 6 else 0,
                        "time_cost": self._parse_number(row[7]) if len(row) > 7 else 0,
                        "synergy": self._parse_number(row[8]) if len(row) > 8 else 0,
                        "forecast": self._parse_number(row[9]) if len(row) > 9 else 0,
                        "status": row[10] if len(row) > 10 else "optimal"
                    }
                    nodes.append(node)
            
            print(f"✅ Google Sheets에서 {len(nodes)}개 노드 불러옴")
            
            return {
                "nodes": nodes,
                "imported_at": datetime.now().isoformat(),
                "source": f"Google Sheets: {spreadsheet_id}"
            }
            
        except Exception as e:
            print(f"❌ 불러오기 실패: {e}")
            return None
    
    def _parse_number(self, value: Any) -> float:
        """문자열을 숫자로 변환"""
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            # 원화 기호, 콤마 제거
            cleaned = value.replace('₩', '').replace(',', '').replace('억', '00000000').replace('만', '0000')
            try:
                return float(cleaned)
            except:
                return 0
        return 0
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════
    
    def create_physics_template(self, spreadsheet_id: str) -> bool:
        """
        Physics Map 템플릿 시트 생성
        """
        if not self.service:
            return False
        
        try:
            # Physics Map 시트
            physics_headers = [
                ["AUTUS Physics Map - 노드 데이터"],
                [""],
                ["ID", "이름", "역할", "위치", "Total Value", "Inflow", "Outflow", 
                 "Time Cost", "Synergy", "12M Forecast", "상태", "메모"],
                ["당신", "대표", "CONTROLLER", "서울 강남구", 182886563, 214000000, 38500000,
                 4000000, 11406562, 210000000, "optimal", ""],
                ["매니저", "매니저", "OPERATOR", "서울 서초구", 75000000, 85000000, 10000000,
                 3000000, 3000000, 90000000, "optimal", ""],
            ]
            
            # Money Flows 시트
            flow_headers = [
                ["AUTUS Physics Map - 돈 흐름"],
                [""],
                ["From", "To", "금액", "유형", "Physics Value", "메모"],
                ["학부모군", "당신", 120000000, "inflow", 120000000, "월 수업료"],
                ["당신", "매니저", 25000000, "inflow", 25000000, "급여"],
            ]
            
            # 시트 생성 및 데이터 입력
            requests = [
                {
                    'addSheet': {
                        'properties': {'title': 'Physics Map'}
                    }
                },
                {
                    'addSheet': {
                        'properties': {'title': 'Money Flows'}
                    }
                }
            ]
            
            # 시트 추가 시도 (이미 있으면 무시)
            try:
                self.service.spreadsheets().batchUpdate(
                    spreadsheetId=spreadsheet_id,
                    body={'requests': requests}
                ).execute()
            except:
                pass  # 이미 존재하면 무시
            
            # 데이터 입력
            self.service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range="Physics Map!A1",
                valueInputOption='USER_ENTERED',
                body={'values': physics_headers}
            ).execute()
            
            self.service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range="Money Flows!A1",
                valueInputOption='USER_ENTERED',
                body={'values': flow_headers}
            ).execute()
            
            print("✅ Physics Map 템플릿 생성 완료!")
            return True
            
        except Exception as e:
            print(f"❌ 템플릿 생성 실패: {e}")
            return False


# ═══════════════════════════════════════════════════════════════════════════════
# 사용 예제
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 1. 클라이언트 초기화
    sheets = GoogleSheetsClient("credentials.json")
    
    # 2. 스프레드시트 ID (URL에서 추출)
    # https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
    SPREADSHEET_ID = "your-spreadsheet-id-here"
    
    # 3. 템플릿 생성 (최초 1회)
    # sheets.create_physics_template(SPREADSHEET_ID)
    
    # 4. 데이터 내보내기 예제
    sample_data = {
        "nodes": [
            {
                "id": "당신",
                "name": "대표",
                "role": "CONTROLLER",
                "location": "서울 강남구",
                "value": 182886563,
                "inflow": 214000000,
                "outflow": 38500000,
                "time_cost": 4000000,
                "synergy": 11406562,
                "forecast": 210000000,
                "status": "optimal"
            }
        ]
    }
    
    # sheets.export_physics_data(SPREADSHEET_ID, sample_data)
    
    # 5. 데이터 불러오기
    # imported = sheets.import_physics_data(SPREADSHEET_ID)
    # print(json.dumps(imported, indent=2, ensure_ascii=False))
    
    print("\n📋 Google Sheets 연동 설정 가이드:")
    print("1. https://console.cloud.google.com 접속")
    print("2. 새 프로젝트 생성 또는 기존 프로젝트 선택")
    print("3. APIs & Services → Library → 'Google Sheets API' 검색 → 사용")
    print("4. APIs & Services → Credentials → Create Credentials → Service Account")
    print("5. 서비스 계정 생성 후 Keys → Add Key → JSON 다운로드")
    print("6. 다운로드한 파일을 credentials.json으로 저장")
    print("7. Google Sheets에서 서비스 계정 이메일에 편집자 권한 부여")





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🟢 AUTUS Physics Map - Google Sheets 연동                                    ║
║                                                                               ║
║  기능:                                                                        ║
║  - Physics Map 데이터 → Google Sheets 자동 저장                               ║
║  - Google Sheets → Physics Map 데이터 불러오기                                ║
║  - 실시간 동기화                                                              ║
║                                                                               ║
║  설정 방법:                                                                   ║
║  1. Google Cloud Console → APIs & Services → Credentials                     ║
║  2. Service Account 생성 → JSON 키 다운로드                                   ║
║  3. credentials.json을 이 폴더에 저장                                         ║
║  4. Google Sheets에서 서비스 계정 이메일에 편집 권한 부여                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
from datetime import datetime
from typing import List, Dict, Any, Optional

# Google API
try:
    from google.oauth2.service_account import Credentials
    from googleapiclient.discovery import build
    GOOGLE_AVAILABLE = True
except ImportError:
    GOOGLE_AVAILABLE = False
    print("⚠️ google-api-python-client 설치 필요: pip install google-api-python-client google-auth")


class GoogleSheetsClient:
    """
    AUTUS Physics Map ↔ Google Sheets 연동 클라이언트
    """
    
    SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
    
    def __init__(self, credentials_path: str = "credentials.json"):
        """
        Google Sheets 클라이언트 초기화
        
        Args:
            credentials_path: 서비스 계정 JSON 키 파일 경로
        """
        self.credentials_path = credentials_path
        self.service = None
        
        if GOOGLE_AVAILABLE:
            self._authenticate()
    
    def _authenticate(self):
        """Google API 인증"""
        if not os.path.exists(self.credentials_path):
            print(f"❌ credentials.json 파일이 없습니다: {self.credentials_path}")
            print("📋 설정 방법:")
            print("   1. https://console.cloud.google.com 접속")
            print("   2. APIs & Services → Credentials")
            print("   3. Create Credentials → Service Account")
            print("   4. JSON 키 다운로드 → credentials.json으로 저장")
            return
        
        try:
            creds = Credentials.from_service_account_file(
                self.credentials_path, 
                scopes=self.SCOPES
            )
            self.service = build('sheets', 'v4', credentials=creds)
            print("✅ Google Sheets API 연결 성공!")
        except Exception as e:
            print(f"❌ Google API 인증 실패: {e}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Physics Map 데이터 → Google Sheets
    # ═══════════════════════════════════════════════════════════════════════════
    
    def export_physics_data(
        self, 
        spreadsheet_id: str,
        physics_data: Dict[str, Any],
        sheet_name: str = "Physics Map"
    ) -> bool:
        """
        Physics Map 데이터를 Google Sheets로 내보내기
        
        Args:
            spreadsheet_id: Google Sheets ID (URL에서 추출)
            physics_data: Physics Map 분석 결과
            sheet_name: 시트 이름
        
        Returns:
            성공 여부
        """
        if not self.service:
            print("❌ Google API 연결 안됨")
            return False
        
        try:
            # 헤더 행
            headers = [
                "ID", "이름", "역할", "위치",
                "Total Value (V)", "Inflow", "Outflow", 
                "Time Cost (T)", "Synergy (S)", "12M Forecast",
                "상태", "업데이트 시간"
            ]
            
            # 데이터 행 변환
            rows = [headers]
            
            for node in physics_data.get("nodes", []):
                row = [
                    node.get("id", ""),
                    node.get("name", node.get("label", "")),
                    node.get("role", ""),
                    node.get("location", ""),
                    node.get("value", 0),
                    node.get("inflow", 0),
                    node.get("outflow", 0),
                    node.get("time_cost", node.get("time", 0)),
                    node.get("synergy", 0),
                    node.get("forecast", 0),
                    node.get("status", "optimal"),
                    datetime.now().isoformat()
                ]
                rows.append(row)
            
            # Google Sheets에 쓰기
            body = {'values': rows}
            
            self.service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range=f"{sheet_name}!A1",
                valueInputOption='USER_ENTERED',
                body=body
            ).execute()
            
            print(f"✅ Google Sheets 내보내기 완료: {len(rows)-1}개 노드")
            return True
            
        except Exception as e:
            print(f"❌ 내보내기 실패: {e}")
            return False
    
    def export_flows(
        self,
        spreadsheet_id: str,
        flows: List[Dict],
        sheet_name: str = "Money Flows"
    ) -> bool:
        """
        돈 흐름 데이터를 Google Sheets로 내보내기
        """
        if not self.service:
            return False
        
        try:
            headers = [
                "From", "To", "금액", "유형", 
                "Physics Value", "업데이트 시간"
            ]
            
            rows = [headers]
            for flow in flows:
                row = [
                    flow.get("from", ""),
                    flow.get("to", ""),
                    flow.get("value", 0),
                    flow.get("type", ""),
                    flow.get("physics_value", 0),
                    datetime.now().isoformat()
                ]
                rows.append(row)
            
            body = {'values': rows}
            
            self.service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range=f"{sheet_name}!A1",
                valueInputOption='USER_ENTERED',
                body=body
            ).execute()
            
            print(f"✅ 돈 흐름 내보내기 완료: {len(rows)-1}개")
            return True
            
        except Exception as e:
            print(f"❌ 내보내기 실패: {e}")
            return False
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Google Sheets → Physics Map 데이터
    # ═══════════════════════════════════════════════════════════════════════════
    
    def import_physics_data(
        self,
        spreadsheet_id: str,
        sheet_name: str = "Physics Map",
        range_notation: str = "A:L"
    ) -> Optional[Dict[str, Any]]:
        """
        Google Sheets에서 Physics Map 데이터 불러오기
        
        Args:
            spreadsheet_id: Google Sheets ID
            sheet_name: 시트 이름
            range_notation: 셀 범위
        
        Returns:
            Physics Map 데이터 딕셔너리
        """
        if not self.service:
            return None
        
        try:
            result = self.service.spreadsheets().values().get(
                spreadsheetId=spreadsheet_id,
                range=f"{sheet_name}!{range_notation}"
            ).execute()
            
            values = result.get('values', [])
            
            if not values:
                print("⚠️ 데이터 없음")
                return None
            
            # 헤더 제외하고 데이터 파싱
            headers = values[0]
            nodes = []
            
            for row in values[1:]:
                if len(row) >= 6:  # 최소 필수 필드
                    node = {
                        "id": row[0] if len(row) > 0 else "",
                        "name": row[1] if len(row) > 1 else "",
                        "role": row[2] if len(row) > 2 else "",
                        "location": row[3] if len(row) > 3 else "",
                        "value": self._parse_number(row[4]) if len(row) > 4 else 0,
                        "inflow": self._parse_number(row[5]) if len(row) > 5 else 0,
                        "outflow": self._parse_number(row[6]) if len(row) > 6 else 0,
                        "time_cost": self._parse_number(row[7]) if len(row) > 7 else 0,
                        "synergy": self._parse_number(row[8]) if len(row) > 8 else 0,
                        "forecast": self._parse_number(row[9]) if len(row) > 9 else 0,
                        "status": row[10] if len(row) > 10 else "optimal"
                    }
                    nodes.append(node)
            
            print(f"✅ Google Sheets에서 {len(nodes)}개 노드 불러옴")
            
            return {
                "nodes": nodes,
                "imported_at": datetime.now().isoformat(),
                "source": f"Google Sheets: {spreadsheet_id}"
            }
            
        except Exception as e:
            print(f"❌ 불러오기 실패: {e}")
            return None
    
    def _parse_number(self, value: Any) -> float:
        """문자열을 숫자로 변환"""
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            # 원화 기호, 콤마 제거
            cleaned = value.replace('₩', '').replace(',', '').replace('억', '00000000').replace('만', '0000')
            try:
                return float(cleaned)
            except:
                return 0
        return 0
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════
    
    def create_physics_template(self, spreadsheet_id: str) -> bool:
        """
        Physics Map 템플릿 시트 생성
        """
        if not self.service:
            return False
        
        try:
            # Physics Map 시트
            physics_headers = [
                ["AUTUS Physics Map - 노드 데이터"],
                [""],
                ["ID", "이름", "역할", "위치", "Total Value", "Inflow", "Outflow", 
                 "Time Cost", "Synergy", "12M Forecast", "상태", "메모"],
                ["당신", "대표", "CONTROLLER", "서울 강남구", 182886563, 214000000, 38500000,
                 4000000, 11406562, 210000000, "optimal", ""],
                ["매니저", "매니저", "OPERATOR", "서울 서초구", 75000000, 85000000, 10000000,
                 3000000, 3000000, 90000000, "optimal", ""],
            ]
            
            # Money Flows 시트
            flow_headers = [
                ["AUTUS Physics Map - 돈 흐름"],
                [""],
                ["From", "To", "금액", "유형", "Physics Value", "메모"],
                ["학부모군", "당신", 120000000, "inflow", 120000000, "월 수업료"],
                ["당신", "매니저", 25000000, "inflow", 25000000, "급여"],
            ]
            
            # 시트 생성 및 데이터 입력
            requests = [
                {
                    'addSheet': {
                        'properties': {'title': 'Physics Map'}
                    }
                },
                {
                    'addSheet': {
                        'properties': {'title': 'Money Flows'}
                    }
                }
            ]
            
            # 시트 추가 시도 (이미 있으면 무시)
            try:
                self.service.spreadsheets().batchUpdate(
                    spreadsheetId=spreadsheet_id,
                    body={'requests': requests}
                ).execute()
            except:
                pass  # 이미 존재하면 무시
            
            # 데이터 입력
            self.service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range="Physics Map!A1",
                valueInputOption='USER_ENTERED',
                body={'values': physics_headers}
            ).execute()
            
            self.service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range="Money Flows!A1",
                valueInputOption='USER_ENTERED',
                body={'values': flow_headers}
            ).execute()
            
            print("✅ Physics Map 템플릿 생성 완료!")
            return True
            
        except Exception as e:
            print(f"❌ 템플릿 생성 실패: {e}")
            return False


# ═══════════════════════════════════════════════════════════════════════════════
# 사용 예제
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 1. 클라이언트 초기화
    sheets = GoogleSheetsClient("credentials.json")
    
    # 2. 스프레드시트 ID (URL에서 추출)
    # https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
    SPREADSHEET_ID = "your-spreadsheet-id-here"
    
    # 3. 템플릿 생성 (최초 1회)
    # sheets.create_physics_template(SPREADSHEET_ID)
    
    # 4. 데이터 내보내기 예제
    sample_data = {
        "nodes": [
            {
                "id": "당신",
                "name": "대표",
                "role": "CONTROLLER",
                "location": "서울 강남구",
                "value": 182886563,
                "inflow": 214000000,
                "outflow": 38500000,
                "time_cost": 4000000,
                "synergy": 11406562,
                "forecast": 210000000,
                "status": "optimal"
            }
        ]
    }
    
    # sheets.export_physics_data(SPREADSHEET_ID, sample_data)
    
    # 5. 데이터 불러오기
    # imported = sheets.import_physics_data(SPREADSHEET_ID)
    # print(json.dumps(imported, indent=2, ensure_ascii=False))
    
    print("\n📋 Google Sheets 연동 설정 가이드:")
    print("1. https://console.cloud.google.com 접속")
    print("2. 새 프로젝트 생성 또는 기존 프로젝트 선택")
    print("3. APIs & Services → Library → 'Google Sheets API' 검색 → 사용")
    print("4. APIs & Services → Credentials → Create Credentials → Service Account")
    print("5. 서비스 계정 생성 후 Keys → Add Key → JSON 다운로드")
    print("6. 다운로드한 파일을 credentials.json으로 저장")
    print("7. Google Sheets에서 서비스 계정 이메일에 편집자 권한 부여")





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🟢 AUTUS Physics Map - Google Sheets 연동                                    ║
║                                                                               ║
║  기능:                                                                        ║
║  - Physics Map 데이터 → Google Sheets 자동 저장                               ║
║  - Google Sheets → Physics Map 데이터 불러오기                                ║
║  - 실시간 동기화                                                              ║
║                                                                               ║
║  설정 방법:                                                                   ║
║  1. Google Cloud Console → APIs & Services → Credentials                     ║
║  2. Service Account 생성 → JSON 키 다운로드                                   ║
║  3. credentials.json을 이 폴더에 저장                                         ║
║  4. Google Sheets에서 서비스 계정 이메일에 편집 권한 부여                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
from datetime import datetime
from typing import List, Dict, Any, Optional

# Google API
try:
    from google.oauth2.service_account import Credentials
    from googleapiclient.discovery import build
    GOOGLE_AVAILABLE = True
except ImportError:
    GOOGLE_AVAILABLE = False
    print("⚠️ google-api-python-client 설치 필요: pip install google-api-python-client google-auth")


class GoogleSheetsClient:
    """
    AUTUS Physics Map ↔ Google Sheets 연동 클라이언트
    """
    
    SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
    
    def __init__(self, credentials_path: str = "credentials.json"):
        """
        Google Sheets 클라이언트 초기화
        
        Args:
            credentials_path: 서비스 계정 JSON 키 파일 경로
        """
        self.credentials_path = credentials_path
        self.service = None
        
        if GOOGLE_AVAILABLE:
            self._authenticate()
    
    def _authenticate(self):
        """Google API 인증"""
        if not os.path.exists(self.credentials_path):
            print(f"❌ credentials.json 파일이 없습니다: {self.credentials_path}")
            print("📋 설정 방법:")
            print("   1. https://console.cloud.google.com 접속")
            print("   2. APIs & Services → Credentials")
            print("   3. Create Credentials → Service Account")
            print("   4. JSON 키 다운로드 → credentials.json으로 저장")
            return
        
        try:
            creds = Credentials.from_service_account_file(
                self.credentials_path, 
                scopes=self.SCOPES
            )
            self.service = build('sheets', 'v4', credentials=creds)
            print("✅ Google Sheets API 연결 성공!")
        except Exception as e:
            print(f"❌ Google API 인증 실패: {e}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Physics Map 데이터 → Google Sheets
    # ═══════════════════════════════════════════════════════════════════════════
    
    def export_physics_data(
        self, 
        spreadsheet_id: str,
        physics_data: Dict[str, Any],
        sheet_name: str = "Physics Map"
    ) -> bool:
        """
        Physics Map 데이터를 Google Sheets로 내보내기
        
        Args:
            spreadsheet_id: Google Sheets ID (URL에서 추출)
            physics_data: Physics Map 분석 결과
            sheet_name: 시트 이름
        
        Returns:
            성공 여부
        """
        if not self.service:
            print("❌ Google API 연결 안됨")
            return False
        
        try:
            # 헤더 행
            headers = [
                "ID", "이름", "역할", "위치",
                "Total Value (V)", "Inflow", "Outflow", 
                "Time Cost (T)", "Synergy (S)", "12M Forecast",
                "상태", "업데이트 시간"
            ]
            
            # 데이터 행 변환
            rows = [headers]
            
            for node in physics_data.get("nodes", []):
                row = [
                    node.get("id", ""),
                    node.get("name", node.get("label", "")),
                    node.get("role", ""),
                    node.get("location", ""),
                    node.get("value", 0),
                    node.get("inflow", 0),
                    node.get("outflow", 0),
                    node.get("time_cost", node.get("time", 0)),
                    node.get("synergy", 0),
                    node.get("forecast", 0),
                    node.get("status", "optimal"),
                    datetime.now().isoformat()
                ]
                rows.append(row)
            
            # Google Sheets에 쓰기
            body = {'values': rows}
            
            self.service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range=f"{sheet_name}!A1",
                valueInputOption='USER_ENTERED',
                body=body
            ).execute()
            
            print(f"✅ Google Sheets 내보내기 완료: {len(rows)-1}개 노드")
            return True
            
        except Exception as e:
            print(f"❌ 내보내기 실패: {e}")
            return False
    
    def export_flows(
        self,
        spreadsheet_id: str,
        flows: List[Dict],
        sheet_name: str = "Money Flows"
    ) -> bool:
        """
        돈 흐름 데이터를 Google Sheets로 내보내기
        """
        if not self.service:
            return False
        
        try:
            headers = [
                "From", "To", "금액", "유형", 
                "Physics Value", "업데이트 시간"
            ]
            
            rows = [headers]
            for flow in flows:
                row = [
                    flow.get("from", ""),
                    flow.get("to", ""),
                    flow.get("value", 0),
                    flow.get("type", ""),
                    flow.get("physics_value", 0),
                    datetime.now().isoformat()
                ]
                rows.append(row)
            
            body = {'values': rows}
            
            self.service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range=f"{sheet_name}!A1",
                valueInputOption='USER_ENTERED',
                body=body
            ).execute()
            
            print(f"✅ 돈 흐름 내보내기 완료: {len(rows)-1}개")
            return True
            
        except Exception as e:
            print(f"❌ 내보내기 실패: {e}")
            return False
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Google Sheets → Physics Map 데이터
    # ═══════════════════════════════════════════════════════════════════════════
    
    def import_physics_data(
        self,
        spreadsheet_id: str,
        sheet_name: str = "Physics Map",
        range_notation: str = "A:L"
    ) -> Optional[Dict[str, Any]]:
        """
        Google Sheets에서 Physics Map 데이터 불러오기
        
        Args:
            spreadsheet_id: Google Sheets ID
            sheet_name: 시트 이름
            range_notation: 셀 범위
        
        Returns:
            Physics Map 데이터 딕셔너리
        """
        if not self.service:
            return None
        
        try:
            result = self.service.spreadsheets().values().get(
                spreadsheetId=spreadsheet_id,
                range=f"{sheet_name}!{range_notation}"
            ).execute()
            
            values = result.get('values', [])
            
            if not values:
                print("⚠️ 데이터 없음")
                return None
            
            # 헤더 제외하고 데이터 파싱
            headers = values[0]
            nodes = []
            
            for row in values[1:]:
                if len(row) >= 6:  # 최소 필수 필드
                    node = {
                        "id": row[0] if len(row) > 0 else "",
                        "name": row[1] if len(row) > 1 else "",
                        "role": row[2] if len(row) > 2 else "",
                        "location": row[3] if len(row) > 3 else "",
                        "value": self._parse_number(row[4]) if len(row) > 4 else 0,
                        "inflow": self._parse_number(row[5]) if len(row) > 5 else 0,
                        "outflow": self._parse_number(row[6]) if len(row) > 6 else 0,
                        "time_cost": self._parse_number(row[7]) if len(row) > 7 else 0,
                        "synergy": self._parse_number(row[8]) if len(row) > 8 else 0,
                        "forecast": self._parse_number(row[9]) if len(row) > 9 else 0,
                        "status": row[10] if len(row) > 10 else "optimal"
                    }
                    nodes.append(node)
            
            print(f"✅ Google Sheets에서 {len(nodes)}개 노드 불러옴")
            
            return {
                "nodes": nodes,
                "imported_at": datetime.now().isoformat(),
                "source": f"Google Sheets: {spreadsheet_id}"
            }
            
        except Exception as e:
            print(f"❌ 불러오기 실패: {e}")
            return None
    
    def _parse_number(self, value: Any) -> float:
        """문자열을 숫자로 변환"""
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            # 원화 기호, 콤마 제거
            cleaned = value.replace('₩', '').replace(',', '').replace('억', '00000000').replace('만', '0000')
            try:
                return float(cleaned)
            except:
                return 0
        return 0
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════
    
    def create_physics_template(self, spreadsheet_id: str) -> bool:
        """
        Physics Map 템플릿 시트 생성
        """
        if not self.service:
            return False
        
        try:
            # Physics Map 시트
            physics_headers = [
                ["AUTUS Physics Map - 노드 데이터"],
                [""],
                ["ID", "이름", "역할", "위치", "Total Value", "Inflow", "Outflow", 
                 "Time Cost", "Synergy", "12M Forecast", "상태", "메모"],
                ["당신", "대표", "CONTROLLER", "서울 강남구", 182886563, 214000000, 38500000,
                 4000000, 11406562, 210000000, "optimal", ""],
                ["매니저", "매니저", "OPERATOR", "서울 서초구", 75000000, 85000000, 10000000,
                 3000000, 3000000, 90000000, "optimal", ""],
            ]
            
            # Money Flows 시트
            flow_headers = [
                ["AUTUS Physics Map - 돈 흐름"],
                [""],
                ["From", "To", "금액", "유형", "Physics Value", "메모"],
                ["학부모군", "당신", 120000000, "inflow", 120000000, "월 수업료"],
                ["당신", "매니저", 25000000, "inflow", 25000000, "급여"],
            ]
            
            # 시트 생성 및 데이터 입력
            requests = [
                {
                    'addSheet': {
                        'properties': {'title': 'Physics Map'}
                    }
                },
                {
                    'addSheet': {
                        'properties': {'title': 'Money Flows'}
                    }
                }
            ]
            
            # 시트 추가 시도 (이미 있으면 무시)
            try:
                self.service.spreadsheets().batchUpdate(
                    spreadsheetId=spreadsheet_id,
                    body={'requests': requests}
                ).execute()
            except:
                pass  # 이미 존재하면 무시
            
            # 데이터 입력
            self.service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range="Physics Map!A1",
                valueInputOption='USER_ENTERED',
                body={'values': physics_headers}
            ).execute()
            
            self.service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range="Money Flows!A1",
                valueInputOption='USER_ENTERED',
                body={'values': flow_headers}
            ).execute()
            
            print("✅ Physics Map 템플릿 생성 완료!")
            return True
            
        except Exception as e:
            print(f"❌ 템플릿 생성 실패: {e}")
            return False


# ═══════════════════════════════════════════════════════════════════════════════
# 사용 예제
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 1. 클라이언트 초기화
    sheets = GoogleSheetsClient("credentials.json")
    
    # 2. 스프레드시트 ID (URL에서 추출)
    # https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
    SPREADSHEET_ID = "your-spreadsheet-id-here"
    
    # 3. 템플릿 생성 (최초 1회)
    # sheets.create_physics_template(SPREADSHEET_ID)
    
    # 4. 데이터 내보내기 예제
    sample_data = {
        "nodes": [
            {
                "id": "당신",
                "name": "대표",
                "role": "CONTROLLER",
                "location": "서울 강남구",
                "value": 182886563,
                "inflow": 214000000,
                "outflow": 38500000,
                "time_cost": 4000000,
                "synergy": 11406562,
                "forecast": 210000000,
                "status": "optimal"
            }
        ]
    }
    
    # sheets.export_physics_data(SPREADSHEET_ID, sample_data)
    
    # 5. 데이터 불러오기
    # imported = sheets.import_physics_data(SPREADSHEET_ID)
    # print(json.dumps(imported, indent=2, ensure_ascii=False))
    
    print("\n📋 Google Sheets 연동 설정 가이드:")
    print("1. https://console.cloud.google.com 접속")
    print("2. 새 프로젝트 생성 또는 기존 프로젝트 선택")
    print("3. APIs & Services → Library → 'Google Sheets API' 검색 → 사용")
    print("4. APIs & Services → Credentials → Create Credentials → Service Account")
    print("5. 서비스 계정 생성 후 Keys → Add Key → JSON 다운로드")
    print("6. 다운로드한 파일을 credentials.json으로 저장")
    print("7. Google Sheets에서 서비스 계정 이메일에 편집자 권한 부여")





















