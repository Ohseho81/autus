#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  💬 AUTUS Physics Map - 카카오톡 알림톡 연동                                  ║
║                                                                               ║
║  기능:                                                                        ║
║  - Physics Map 알림 → 카카오톡 알림톡 발송                                    ║
║  - 병목 감지 시 즉시 알림                                                     ║
║  - 주간 리포트 발송                                                           ║
║  - 마일스톤 달성 알림                                                         ║
║                                                                               ║
║  설정 방법:                                                                   ║
║  1. 카카오 비즈니스 (business.kakao.com) 가입                                 ║
║  2. 채널 생성 → 알림톡 템플릿 등록                                            ║
║  3. API 키 발급                                                               ║
║  4. 또는 NHN Cloud / Solapi 등 알림톡 대행사 사용                             ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import requests
from datetime import datetime
from typing import Dict, Any, List, Optional
from dataclasses import dataclass


@dataclass
class AlimtalkTemplate:
    """알림톡 템플릿"""
    template_code: str
    name: str
    content: str
    buttons: List[Dict] = None


class KakaoAlimtalk:
    """
    카카오톡 알림톡 클라이언트
    
    지원 플랫폼:
    - 카카오 비즈니스 직접 연동
    - NHN Cloud 알림톡
    - Solapi
    - 비즈엠
    """
    
    # 알림톡 템플릿 정의
    TEMPLATES = {
        "bottleneck": AlimtalkTemplate(
            template_code="AUTUS_BOTTLENECK_001",
            name="병목 감지 알림",
            content="""⚠️ AUTUS 병목 감지

#{name}님의 돈 흐름에서 병목이 감지되었습니다.

📍 위치: #{location}
💰 유입: #{inflow}
🔴 유출: #{outflow}
📊 유출비율: #{ratio}%

💡 권장 조치:
#{recommendation}

확인하기 👉""",
            buttons=[{"type": "WL", "name": "대시보드 확인", "url": "https://autus.app/dashboard"}]
        ),
        "weekly_report": AlimtalkTemplate(
            template_code="AUTUS_WEEKLY_001",
            name="주간 리포트",
            content="""📊 AUTUS 주간 리포트

#{week_id} 리포트가 준비되었습니다.

💰 총 가치: #{total_value}
📈 변동: #{change}%
✨ 시너지: #{synergy}

🎯 이번 주 핵심:
#{summary}

자세히 보기 👉""",
            buttons=[{"type": "WL", "name": "리포트 확인", "url": "https://autus.app/report"}]
        ),
        "milestone": AlimtalkTemplate(
            template_code="AUTUS_MILESTONE_001",
            name="마일스톤 달성",
            content="""🎉 축하합니다!

#{milestone_type} 마일스톤을 달성했습니다!

🏆 달성: #{message}
💰 현재 가치: #{value}

계속해서 성장하세요! 🚀""",
            buttons=[{"type": "WL", "name": "성과 확인", "url": "https://autus.app/milestone"}]
        ),
        "prediction": AlimtalkTemplate(
            template_code="AUTUS_PREDICTION_001",
            name="예측 알림",
            content="""🔮 AUTUS 예측 알림

#{prediction_type} 예측이 있습니다.

🎯 대상: #{target}
📊 현재: #{current_value}
📈 예측: #{predicted_value}
🎲 신뢰도: #{confidence}%

#{action_message}

확인하기 👉""",
            buttons=[{"type": "WL", "name": "상세 보기", "url": "https://autus.app/prediction"}]
        )
    }
    
    def __init__(
        self,
        platform: str = "solapi",
        api_key: str = None,
        api_secret: str = None,
        sender_key: str = None
    ):
        """
        알림톡 클라이언트 초기화
        
        Args:
            platform: 사용 플랫폼 ("kakao", "nhn", "solapi", "bizm")
            api_key: API 키
            api_secret: API Secret
            sender_key: 발신 프로필 키
        """
        self.platform = platform
        self.api_key = api_key or os.getenv("ALIMTALK_API_KEY")
        self.api_secret = api_secret or os.getenv("ALIMTALK_API_SECRET")
        self.sender_key = sender_key or os.getenv("ALIMTALK_SENDER_KEY")
        
        # 플랫폼별 엔드포인트
        self.endpoints = {
            "solapi": "https://api.solapi.com/messages/v4/send",
            "nhn": "https://api-alimtalk.cloud.toast.com/alimtalk/v2.0/appkeys/{appkey}/messages",
            "bizm": "https://alimtalk-api.bizm.co.kr/v2/sender/send"
        }
        
        if not all([self.api_key, self.sender_key]):
            print("⚠️ 알림톡 API 설정 필요")
            self._print_setup_guide()
    
    def _print_setup_guide(self):
        """설정 가이드 출력"""
        print("\n📋 알림톡 설정 가이드:")
        print("\n[Option 1: Solapi (추천 - 간편)]")
        print("1. solapi.com 가입")
        print("2. 카카오 채널 연동")
        print("3. API 키 발급")
        print("4. 환경변수 설정:")
        print('   export ALIMTALK_API_KEY="your-api-key"')
        print('   export ALIMTALK_API_SECRET="your-api-secret"')
        print('   export ALIMTALK_SENDER_KEY="your-sender-key"')
        
        print("\n[Option 2: 카카오 비즈니스 직접 연동]")
        print("1. business.kakao.com 가입")
        print("2. 카카오톡 채널 생성")
        print("3. 알림톡 발신 프로필 신청")
        print("4. 템플릿 등록 및 검수")
        print("5. API 연동")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 알림톡 발송 (Solapi 기준)
    # ═══════════════════════════════════════════════════════════════════════════
    
    def send_alimtalk(
        self,
        phone_number: str,
        template_code: str,
        variables: Dict[str, str],
        buttons: List[Dict] = None
    ) -> bool:
        """
        알림톡 발송 (Solapi)
        
        Args:
            phone_number: 수신자 전화번호 (01012345678)
            template_code: 템플릿 코드
            variables: 템플릿 변수 (#{name} → variables["name"])
            buttons: 버튼 목록
        
        Returns:
            발송 성공 여부
        """
        if not self.api_key:
            print("❌ API 키 설정 필요")
            return False
        
        try:
            # Solapi 형식
            payload = {
                "message": {
                    "to": phone_number,
                    "from": self.sender_key,
                    "kakaoOptions": {
                        "pfId": self.sender_key,
                        "templateId": template_code,
                        "variables": variables
                    }
                }
            }
            
            if buttons:
                payload["message"]["kakaoOptions"]["buttons"] = buttons
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            response = requests.post(
                self.endpoints.get(self.platform, self.endpoints["solapi"]),
                json=payload,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                print(f"✅ 알림톡 발송 성공: {phone_number}")
                return True
            else:
                print(f"❌ 알림톡 발송 실패: {response.status_code}")
                print(response.text)
                return False
                
        except Exception as e:
            print(f"❌ 알림톡 오류: {e}")
            return False
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Physics Map 알림 전송
    # ═══════════════════════════════════════════════════════════════════════════
    
    def send_bottleneck_alert(
        self,
        phone_number: str,
        node: Dict[str, Any]
    ) -> bool:
        """
        병목 감지 알림 발송
        """
        inflow = node.get("inflow", 0)
        outflow = node.get("outflow", 0)
        ratio = (outflow / inflow * 100) if inflow > 0 else 0
        
        variables = {
            "name": node.get("name", node.get("id", "Unknown")),
            "location": node.get("location", "-"),
            "inflow": self._format_money(inflow),
            "outflow": self._format_money(outflow),
            "ratio": f"{ratio:.1f}",
            "recommendation": self._get_recommendation(ratio)
        }
        
        return self.send_alimtalk(
            phone_number,
            self.TEMPLATES["bottleneck"].template_code,
            variables,
            self.TEMPLATES["bottleneck"].buttons
        )
    
    def send_weekly_report(
        self,
        phone_number: str,
        report: Dict[str, Any]
    ) -> bool:
        """
        주간 리포트 알림 발송
        """
        variables = {
            "week_id": report.get("week_id", ""),
            "total_value": self._format_money(report.get("total_value", 0)),
            "change": f"{report.get('value_change', 0):+.1f}",
            "synergy": self._format_money(report.get("total_synergy", 0)),
            "summary": report.get("summary", "")[:100]  # 100자 제한
        }
        
        return self.send_alimtalk(
            phone_number,
            self.TEMPLATES["weekly_report"].template_code,
            variables,
            self.TEMPLATES["weekly_report"].buttons
        )
    
    def send_milestone(
        self,
        phone_number: str,
        milestone_type: str,
        message: str,
        value: float
    ) -> bool:
        """
        마일스톤 달성 알림 발송
        """
        variables = {
            "milestone_type": milestone_type,
            "message": message,
            "value": self._format_money(value)
        }
        
        return self.send_alimtalk(
            phone_number,
            self.TEMPLATES["milestone"].template_code,
            variables,
            self.TEMPLATES["milestone"].buttons
        )
    
    def send_prediction(
        self,
        phone_number: str,
        prediction: Dict[str, Any]
    ) -> bool:
        """
        예측 알림 발송
        """
        pred_type = "기회" if prediction.get("type") == "opportunity" else "위험"
        action = "지금 확인하세요!" if prediction.get("type") == "opportunity" else "주의가 필요합니다."
        
        variables = {
            "prediction_type": pred_type,
            "target": prediction.get("target", ""),
            "current_value": self._format_money(prediction.get("current_value", 0)),
            "predicted_value": self._format_money(prediction.get("predicted_value", 0)),
            "confidence": str(prediction.get("confidence", 0)),
            "action_message": action
        }
        
        return self.send_alimtalk(
            phone_number,
            self.TEMPLATES["prediction"].template_code,
            variables,
            self.TEMPLATES["prediction"].buttons
        )
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════
    
    def _format_money(self, value: float) -> str:
        """금액 포맷팅"""
        if abs(value) >= 100000000:
            return f"₩{value/100000000:.2f}억"
        elif abs(value) >= 10000:
            return f"₩{value/10000:,.0f}만"
        else:
            return f"₩{value:,.0f}"
    
    def _get_recommendation(self, outflow_ratio: float) -> str:
        """유출 비율에 따른 권장 조치"""
        if outflow_ratio > 50:
            return "🔴 긴급: 즉시 비용 절감 필요"
        elif outflow_ratio > 30:
            return "🟡 주의: 유입 경로 다각화 검토"
        else:
            return "🟢 모니터링: 지속 관찰"


# ═══════════════════════════════════════════════════════════════════════════════
# 카카오 비즈니스 직접 연동 (고급)
# ═══════════════════════════════════════════════════════════════════════════════

class KakaoBusinessAPI:
    """
    카카오 비즈니스 직접 연동 클라이언트
    
    주의: 사업자등록 및 템플릿 검수 필요
    """
    
    def __init__(
        self,
        app_key: str = None,
        sender_key: str = None
    ):
        self.app_key = app_key or os.getenv("KAKAO_APP_KEY")
        self.sender_key = sender_key or os.getenv("KAKAO_SENDER_KEY")
        self.base_url = "https://kapi.kakao.com"
    
    def get_token(self, code: str) -> Optional[str]:
        """OAuth 토큰 획득"""
        # 카카오 OAuth 플로우 구현
        pass
    
    def send_alimtalk(self, phone: str, template_code: str, variables: Dict) -> bool:
        """알림톡 발송"""
        # 카카오 비즈메시지 API 호출
        pass


# ═══════════════════════════════════════════════════════════════════════════════
# 사용 예제
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 클라이언트 초기화
    kakao = KakaoAlimtalk(platform="solapi")
    
    # 테스트 전화번호 (실제 번호로 변경)
    TEST_PHONE = "01012345678"
    
    # 병목 알림 예제
    bottleneck_node = {
        "id": "파트너A",
        "name": "미국 파트너",
        "location": "New York, USA",
        "inflow": 45000000,
        "outflow": 15000000,
        "status": "bottleneck"
    }
    
    # kakao.send_bottleneck_alert(TEST_PHONE, bottleneck_node)
    
    # 주간 리포트 예제
    weekly = {
        "week_id": "2025-W01",
        "total_value": 709000000,
        "value_change": 15.2,
        "total_synergy": 22810000,
        "summary": "총 가치 7억 돌파! 시너지 지속 성장 중"
    }
    
    # kakao.send_weekly_report(TEST_PHONE, weekly)
    
    # 마일스톤 알림 예제
    # kakao.send_milestone(TEST_PHONE, "총 가치", "7억 돌파!", 709000000)
    
    print("\n📋 카카오톡 알림톡 설정 가이드:")
    print("\n[간편 설정: Solapi 사용]")
    print("1. https://solapi.com 가입")
    print("2. 카카오 채널 연동 (채널 관리 → 카카오톡 채널 연동)")
    print("3. 발신 프로필 등록")
    print("4. 템플릿 등록:")
    print("   - AUTUS_BOTTLENECK_001: 병목 감지")
    print("   - AUTUS_WEEKLY_001: 주간 리포트")
    print("   - AUTUS_MILESTONE_001: 마일스톤")
    print("   - AUTUS_PREDICTION_001: 예측 알림")
    print("5. API 키 발급 (대시보드 → 개발/연동)")
    print("6. 환경변수 설정:")
    print('   export ALIMTALK_API_KEY="your-api-key"')
    print('   export ALIMTALK_API_SECRET="your-api-secret"')
    print('   export ALIMTALK_SENDER_KEY="your-sender-key"')
    
    print("\n💡 Tip: Solapi는 월 50건 무료!")
    print("💰 예상 비용: 알림톡 1건당 약 8원")





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  💬 AUTUS Physics Map - 카카오톡 알림톡 연동                                  ║
║                                                                               ║
║  기능:                                                                        ║
║  - Physics Map 알림 → 카카오톡 알림톡 발송                                    ║
║  - 병목 감지 시 즉시 알림                                                     ║
║  - 주간 리포트 발송                                                           ║
║  - 마일스톤 달성 알림                                                         ║
║                                                                               ║
║  설정 방법:                                                                   ║
║  1. 카카오 비즈니스 (business.kakao.com) 가입                                 ║
║  2. 채널 생성 → 알림톡 템플릿 등록                                            ║
║  3. API 키 발급                                                               ║
║  4. 또는 NHN Cloud / Solapi 등 알림톡 대행사 사용                             ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import requests
from datetime import datetime
from typing import Dict, Any, List, Optional
from dataclasses import dataclass


@dataclass
class AlimtalkTemplate:
    """알림톡 템플릿"""
    template_code: str
    name: str
    content: str
    buttons: List[Dict] = None


class KakaoAlimtalk:
    """
    카카오톡 알림톡 클라이언트
    
    지원 플랫폼:
    - 카카오 비즈니스 직접 연동
    - NHN Cloud 알림톡
    - Solapi
    - 비즈엠
    """
    
    # 알림톡 템플릿 정의
    TEMPLATES = {
        "bottleneck": AlimtalkTemplate(
            template_code="AUTUS_BOTTLENECK_001",
            name="병목 감지 알림",
            content="""⚠️ AUTUS 병목 감지

#{name}님의 돈 흐름에서 병목이 감지되었습니다.

📍 위치: #{location}
💰 유입: #{inflow}
🔴 유출: #{outflow}
📊 유출비율: #{ratio}%

💡 권장 조치:
#{recommendation}

확인하기 👉""",
            buttons=[{"type": "WL", "name": "대시보드 확인", "url": "https://autus.app/dashboard"}]
        ),
        "weekly_report": AlimtalkTemplate(
            template_code="AUTUS_WEEKLY_001",
            name="주간 리포트",
            content="""📊 AUTUS 주간 리포트

#{week_id} 리포트가 준비되었습니다.

💰 총 가치: #{total_value}
📈 변동: #{change}%
✨ 시너지: #{synergy}

🎯 이번 주 핵심:
#{summary}

자세히 보기 👉""",
            buttons=[{"type": "WL", "name": "리포트 확인", "url": "https://autus.app/report"}]
        ),
        "milestone": AlimtalkTemplate(
            template_code="AUTUS_MILESTONE_001",
            name="마일스톤 달성",
            content="""🎉 축하합니다!

#{milestone_type} 마일스톤을 달성했습니다!

🏆 달성: #{message}
💰 현재 가치: #{value}

계속해서 성장하세요! 🚀""",
            buttons=[{"type": "WL", "name": "성과 확인", "url": "https://autus.app/milestone"}]
        ),
        "prediction": AlimtalkTemplate(
            template_code="AUTUS_PREDICTION_001",
            name="예측 알림",
            content="""🔮 AUTUS 예측 알림

#{prediction_type} 예측이 있습니다.

🎯 대상: #{target}
📊 현재: #{current_value}
📈 예측: #{predicted_value}
🎲 신뢰도: #{confidence}%

#{action_message}

확인하기 👉""",
            buttons=[{"type": "WL", "name": "상세 보기", "url": "https://autus.app/prediction"}]
        )
    }
    
    def __init__(
        self,
        platform: str = "solapi",
        api_key: str = None,
        api_secret: str = None,
        sender_key: str = None
    ):
        """
        알림톡 클라이언트 초기화
        
        Args:
            platform: 사용 플랫폼 ("kakao", "nhn", "solapi", "bizm")
            api_key: API 키
            api_secret: API Secret
            sender_key: 발신 프로필 키
        """
        self.platform = platform
        self.api_key = api_key or os.getenv("ALIMTALK_API_KEY")
        self.api_secret = api_secret or os.getenv("ALIMTALK_API_SECRET")
        self.sender_key = sender_key or os.getenv("ALIMTALK_SENDER_KEY")
        
        # 플랫폼별 엔드포인트
        self.endpoints = {
            "solapi": "https://api.solapi.com/messages/v4/send",
            "nhn": "https://api-alimtalk.cloud.toast.com/alimtalk/v2.0/appkeys/{appkey}/messages",
            "bizm": "https://alimtalk-api.bizm.co.kr/v2/sender/send"
        }
        
        if not all([self.api_key, self.sender_key]):
            print("⚠️ 알림톡 API 설정 필요")
            self._print_setup_guide()
    
    def _print_setup_guide(self):
        """설정 가이드 출력"""
        print("\n📋 알림톡 설정 가이드:")
        print("\n[Option 1: Solapi (추천 - 간편)]")
        print("1. solapi.com 가입")
        print("2. 카카오 채널 연동")
        print("3. API 키 발급")
        print("4. 환경변수 설정:")
        print('   export ALIMTALK_API_KEY="your-api-key"')
        print('   export ALIMTALK_API_SECRET="your-api-secret"')
        print('   export ALIMTALK_SENDER_KEY="your-sender-key"')
        
        print("\n[Option 2: 카카오 비즈니스 직접 연동]")
        print("1. business.kakao.com 가입")
        print("2. 카카오톡 채널 생성")
        print("3. 알림톡 발신 프로필 신청")
        print("4. 템플릿 등록 및 검수")
        print("5. API 연동")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 알림톡 발송 (Solapi 기준)
    # ═══════════════════════════════════════════════════════════════════════════
    
    def send_alimtalk(
        self,
        phone_number: str,
        template_code: str,
        variables: Dict[str, str],
        buttons: List[Dict] = None
    ) -> bool:
        """
        알림톡 발송 (Solapi)
        
        Args:
            phone_number: 수신자 전화번호 (01012345678)
            template_code: 템플릿 코드
            variables: 템플릿 변수 (#{name} → variables["name"])
            buttons: 버튼 목록
        
        Returns:
            발송 성공 여부
        """
        if not self.api_key:
            print("❌ API 키 설정 필요")
            return False
        
        try:
            # Solapi 형식
            payload = {
                "message": {
                    "to": phone_number,
                    "from": self.sender_key,
                    "kakaoOptions": {
                        "pfId": self.sender_key,
                        "templateId": template_code,
                        "variables": variables
                    }
                }
            }
            
            if buttons:
                payload["message"]["kakaoOptions"]["buttons"] = buttons
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            response = requests.post(
                self.endpoints.get(self.platform, self.endpoints["solapi"]),
                json=payload,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                print(f"✅ 알림톡 발송 성공: {phone_number}")
                return True
            else:
                print(f"❌ 알림톡 발송 실패: {response.status_code}")
                print(response.text)
                return False
                
        except Exception as e:
            print(f"❌ 알림톡 오류: {e}")
            return False
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Physics Map 알림 전송
    # ═══════════════════════════════════════════════════════════════════════════
    
    def send_bottleneck_alert(
        self,
        phone_number: str,
        node: Dict[str, Any]
    ) -> bool:
        """
        병목 감지 알림 발송
        """
        inflow = node.get("inflow", 0)
        outflow = node.get("outflow", 0)
        ratio = (outflow / inflow * 100) if inflow > 0 else 0
        
        variables = {
            "name": node.get("name", node.get("id", "Unknown")),
            "location": node.get("location", "-"),
            "inflow": self._format_money(inflow),
            "outflow": self._format_money(outflow),
            "ratio": f"{ratio:.1f}",
            "recommendation": self._get_recommendation(ratio)
        }
        
        return self.send_alimtalk(
            phone_number,
            self.TEMPLATES["bottleneck"].template_code,
            variables,
            self.TEMPLATES["bottleneck"].buttons
        )
    
    def send_weekly_report(
        self,
        phone_number: str,
        report: Dict[str, Any]
    ) -> bool:
        """
        주간 리포트 알림 발송
        """
        variables = {
            "week_id": report.get("week_id", ""),
            "total_value": self._format_money(report.get("total_value", 0)),
            "change": f"{report.get('value_change', 0):+.1f}",
            "synergy": self._format_money(report.get("total_synergy", 0)),
            "summary": report.get("summary", "")[:100]  # 100자 제한
        }
        
        return self.send_alimtalk(
            phone_number,
            self.TEMPLATES["weekly_report"].template_code,
            variables,
            self.TEMPLATES["weekly_report"].buttons
        )
    
    def send_milestone(
        self,
        phone_number: str,
        milestone_type: str,
        message: str,
        value: float
    ) -> bool:
        """
        마일스톤 달성 알림 발송
        """
        variables = {
            "milestone_type": milestone_type,
            "message": message,
            "value": self._format_money(value)
        }
        
        return self.send_alimtalk(
            phone_number,
            self.TEMPLATES["milestone"].template_code,
            variables,
            self.TEMPLATES["milestone"].buttons
        )
    
    def send_prediction(
        self,
        phone_number: str,
        prediction: Dict[str, Any]
    ) -> bool:
        """
        예측 알림 발송
        """
        pred_type = "기회" if prediction.get("type") == "opportunity" else "위험"
        action = "지금 확인하세요!" if prediction.get("type") == "opportunity" else "주의가 필요합니다."
        
        variables = {
            "prediction_type": pred_type,
            "target": prediction.get("target", ""),
            "current_value": self._format_money(prediction.get("current_value", 0)),
            "predicted_value": self._format_money(prediction.get("predicted_value", 0)),
            "confidence": str(prediction.get("confidence", 0)),
            "action_message": action
        }
        
        return self.send_alimtalk(
            phone_number,
            self.TEMPLATES["prediction"].template_code,
            variables,
            self.TEMPLATES["prediction"].buttons
        )
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════
    
    def _format_money(self, value: float) -> str:
        """금액 포맷팅"""
        if abs(value) >= 100000000:
            return f"₩{value/100000000:.2f}억"
        elif abs(value) >= 10000:
            return f"₩{value/10000:,.0f}만"
        else:
            return f"₩{value:,.0f}"
    
    def _get_recommendation(self, outflow_ratio: float) -> str:
        """유출 비율에 따른 권장 조치"""
        if outflow_ratio > 50:
            return "🔴 긴급: 즉시 비용 절감 필요"
        elif outflow_ratio > 30:
            return "🟡 주의: 유입 경로 다각화 검토"
        else:
            return "🟢 모니터링: 지속 관찰"


# ═══════════════════════════════════════════════════════════════════════════════
# 카카오 비즈니스 직접 연동 (고급)
# ═══════════════════════════════════════════════════════════════════════════════

class KakaoBusinessAPI:
    """
    카카오 비즈니스 직접 연동 클라이언트
    
    주의: 사업자등록 및 템플릿 검수 필요
    """
    
    def __init__(
        self,
        app_key: str = None,
        sender_key: str = None
    ):
        self.app_key = app_key or os.getenv("KAKAO_APP_KEY")
        self.sender_key = sender_key or os.getenv("KAKAO_SENDER_KEY")
        self.base_url = "https://kapi.kakao.com"
    
    def get_token(self, code: str) -> Optional[str]:
        """OAuth 토큰 획득"""
        # 카카오 OAuth 플로우 구현
        pass
    
    def send_alimtalk(self, phone: str, template_code: str, variables: Dict) -> bool:
        """알림톡 발송"""
        # 카카오 비즈메시지 API 호출
        pass


# ═══════════════════════════════════════════════════════════════════════════════
# 사용 예제
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 클라이언트 초기화
    kakao = KakaoAlimtalk(platform="solapi")
    
    # 테스트 전화번호 (실제 번호로 변경)
    TEST_PHONE = "01012345678"
    
    # 병목 알림 예제
    bottleneck_node = {
        "id": "파트너A",
        "name": "미국 파트너",
        "location": "New York, USA",
        "inflow": 45000000,
        "outflow": 15000000,
        "status": "bottleneck"
    }
    
    # kakao.send_bottleneck_alert(TEST_PHONE, bottleneck_node)
    
    # 주간 리포트 예제
    weekly = {
        "week_id": "2025-W01",
        "total_value": 709000000,
        "value_change": 15.2,
        "total_synergy": 22810000,
        "summary": "총 가치 7억 돌파! 시너지 지속 성장 중"
    }
    
    # kakao.send_weekly_report(TEST_PHONE, weekly)
    
    # 마일스톤 알림 예제
    # kakao.send_milestone(TEST_PHONE, "총 가치", "7억 돌파!", 709000000)
    
    print("\n📋 카카오톡 알림톡 설정 가이드:")
    print("\n[간편 설정: Solapi 사용]")
    print("1. https://solapi.com 가입")
    print("2. 카카오 채널 연동 (채널 관리 → 카카오톡 채널 연동)")
    print("3. 발신 프로필 등록")
    print("4. 템플릿 등록:")
    print("   - AUTUS_BOTTLENECK_001: 병목 감지")
    print("   - AUTUS_WEEKLY_001: 주간 리포트")
    print("   - AUTUS_MILESTONE_001: 마일스톤")
    print("   - AUTUS_PREDICTION_001: 예측 알림")
    print("5. API 키 발급 (대시보드 → 개발/연동)")
    print("6. 환경변수 설정:")
    print('   export ALIMTALK_API_KEY="your-api-key"')
    print('   export ALIMTALK_API_SECRET="your-api-secret"')
    print('   export ALIMTALK_SENDER_KEY="your-sender-key"')
    
    print("\n💡 Tip: Solapi는 월 50건 무료!")
    print("💰 예상 비용: 알림톡 1건당 약 8원")





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  💬 AUTUS Physics Map - 카카오톡 알림톡 연동                                  ║
║                                                                               ║
║  기능:                                                                        ║
║  - Physics Map 알림 → 카카오톡 알림톡 발송                                    ║
║  - 병목 감지 시 즉시 알림                                                     ║
║  - 주간 리포트 발송                                                           ║
║  - 마일스톤 달성 알림                                                         ║
║                                                                               ║
║  설정 방법:                                                                   ║
║  1. 카카오 비즈니스 (business.kakao.com) 가입                                 ║
║  2. 채널 생성 → 알림톡 템플릿 등록                                            ║
║  3. API 키 발급                                                               ║
║  4. 또는 NHN Cloud / Solapi 등 알림톡 대행사 사용                             ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import requests
from datetime import datetime
from typing import Dict, Any, List, Optional
from dataclasses import dataclass


@dataclass
class AlimtalkTemplate:
    """알림톡 템플릿"""
    template_code: str
    name: str
    content: str
    buttons: List[Dict] = None


class KakaoAlimtalk:
    """
    카카오톡 알림톡 클라이언트
    
    지원 플랫폼:
    - 카카오 비즈니스 직접 연동
    - NHN Cloud 알림톡
    - Solapi
    - 비즈엠
    """
    
    # 알림톡 템플릿 정의
    TEMPLATES = {
        "bottleneck": AlimtalkTemplate(
            template_code="AUTUS_BOTTLENECK_001",
            name="병목 감지 알림",
            content="""⚠️ AUTUS 병목 감지

#{name}님의 돈 흐름에서 병목이 감지되었습니다.

📍 위치: #{location}
💰 유입: #{inflow}
🔴 유출: #{outflow}
📊 유출비율: #{ratio}%

💡 권장 조치:
#{recommendation}

확인하기 👉""",
            buttons=[{"type": "WL", "name": "대시보드 확인", "url": "https://autus.app/dashboard"}]
        ),
        "weekly_report": AlimtalkTemplate(
            template_code="AUTUS_WEEKLY_001",
            name="주간 리포트",
            content="""📊 AUTUS 주간 리포트

#{week_id} 리포트가 준비되었습니다.

💰 총 가치: #{total_value}
📈 변동: #{change}%
✨ 시너지: #{synergy}

🎯 이번 주 핵심:
#{summary}

자세히 보기 👉""",
            buttons=[{"type": "WL", "name": "리포트 확인", "url": "https://autus.app/report"}]
        ),
        "milestone": AlimtalkTemplate(
            template_code="AUTUS_MILESTONE_001",
            name="마일스톤 달성",
            content="""🎉 축하합니다!

#{milestone_type} 마일스톤을 달성했습니다!

🏆 달성: #{message}
💰 현재 가치: #{value}

계속해서 성장하세요! 🚀""",
            buttons=[{"type": "WL", "name": "성과 확인", "url": "https://autus.app/milestone"}]
        ),
        "prediction": AlimtalkTemplate(
            template_code="AUTUS_PREDICTION_001",
            name="예측 알림",
            content="""🔮 AUTUS 예측 알림

#{prediction_type} 예측이 있습니다.

🎯 대상: #{target}
📊 현재: #{current_value}
📈 예측: #{predicted_value}
🎲 신뢰도: #{confidence}%

#{action_message}

확인하기 👉""",
            buttons=[{"type": "WL", "name": "상세 보기", "url": "https://autus.app/prediction"}]
        )
    }
    
    def __init__(
        self,
        platform: str = "solapi",
        api_key: str = None,
        api_secret: str = None,
        sender_key: str = None
    ):
        """
        알림톡 클라이언트 초기화
        
        Args:
            platform: 사용 플랫폼 ("kakao", "nhn", "solapi", "bizm")
            api_key: API 키
            api_secret: API Secret
            sender_key: 발신 프로필 키
        """
        self.platform = platform
        self.api_key = api_key or os.getenv("ALIMTALK_API_KEY")
        self.api_secret = api_secret or os.getenv("ALIMTALK_API_SECRET")
        self.sender_key = sender_key or os.getenv("ALIMTALK_SENDER_KEY")
        
        # 플랫폼별 엔드포인트
        self.endpoints = {
            "solapi": "https://api.solapi.com/messages/v4/send",
            "nhn": "https://api-alimtalk.cloud.toast.com/alimtalk/v2.0/appkeys/{appkey}/messages",
            "bizm": "https://alimtalk-api.bizm.co.kr/v2/sender/send"
        }
        
        if not all([self.api_key, self.sender_key]):
            print("⚠️ 알림톡 API 설정 필요")
            self._print_setup_guide()
    
    def _print_setup_guide(self):
        """설정 가이드 출력"""
        print("\n📋 알림톡 설정 가이드:")
        print("\n[Option 1: Solapi (추천 - 간편)]")
        print("1. solapi.com 가입")
        print("2. 카카오 채널 연동")
        print("3. API 키 발급")
        print("4. 환경변수 설정:")
        print('   export ALIMTALK_API_KEY="your-api-key"')
        print('   export ALIMTALK_API_SECRET="your-api-secret"')
        print('   export ALIMTALK_SENDER_KEY="your-sender-key"')
        
        print("\n[Option 2: 카카오 비즈니스 직접 연동]")
        print("1. business.kakao.com 가입")
        print("2. 카카오톡 채널 생성")
        print("3. 알림톡 발신 프로필 신청")
        print("4. 템플릿 등록 및 검수")
        print("5. API 연동")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 알림톡 발송 (Solapi 기준)
    # ═══════════════════════════════════════════════════════════════════════════
    
    def send_alimtalk(
        self,
        phone_number: str,
        template_code: str,
        variables: Dict[str, str],
        buttons: List[Dict] = None
    ) -> bool:
        """
        알림톡 발송 (Solapi)
        
        Args:
            phone_number: 수신자 전화번호 (01012345678)
            template_code: 템플릿 코드
            variables: 템플릿 변수 (#{name} → variables["name"])
            buttons: 버튼 목록
        
        Returns:
            발송 성공 여부
        """
        if not self.api_key:
            print("❌ API 키 설정 필요")
            return False
        
        try:
            # Solapi 형식
            payload = {
                "message": {
                    "to": phone_number,
                    "from": self.sender_key,
                    "kakaoOptions": {
                        "pfId": self.sender_key,
                        "templateId": template_code,
                        "variables": variables
                    }
                }
            }
            
            if buttons:
                payload["message"]["kakaoOptions"]["buttons"] = buttons
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            response = requests.post(
                self.endpoints.get(self.platform, self.endpoints["solapi"]),
                json=payload,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                print(f"✅ 알림톡 발송 성공: {phone_number}")
                return True
            else:
                print(f"❌ 알림톡 발송 실패: {response.status_code}")
                print(response.text)
                return False
                
        except Exception as e:
            print(f"❌ 알림톡 오류: {e}")
            return False
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Physics Map 알림 전송
    # ═══════════════════════════════════════════════════════════════════════════
    
    def send_bottleneck_alert(
        self,
        phone_number: str,
        node: Dict[str, Any]
    ) -> bool:
        """
        병목 감지 알림 발송
        """
        inflow = node.get("inflow", 0)
        outflow = node.get("outflow", 0)
        ratio = (outflow / inflow * 100) if inflow > 0 else 0
        
        variables = {
            "name": node.get("name", node.get("id", "Unknown")),
            "location": node.get("location", "-"),
            "inflow": self._format_money(inflow),
            "outflow": self._format_money(outflow),
            "ratio": f"{ratio:.1f}",
            "recommendation": self._get_recommendation(ratio)
        }
        
        return self.send_alimtalk(
            phone_number,
            self.TEMPLATES["bottleneck"].template_code,
            variables,
            self.TEMPLATES["bottleneck"].buttons
        )
    
    def send_weekly_report(
        self,
        phone_number: str,
        report: Dict[str, Any]
    ) -> bool:
        """
        주간 리포트 알림 발송
        """
        variables = {
            "week_id": report.get("week_id", ""),
            "total_value": self._format_money(report.get("total_value", 0)),
            "change": f"{report.get('value_change', 0):+.1f}",
            "synergy": self._format_money(report.get("total_synergy", 0)),
            "summary": report.get("summary", "")[:100]  # 100자 제한
        }
        
        return self.send_alimtalk(
            phone_number,
            self.TEMPLATES["weekly_report"].template_code,
            variables,
            self.TEMPLATES["weekly_report"].buttons
        )
    
    def send_milestone(
        self,
        phone_number: str,
        milestone_type: str,
        message: str,
        value: float
    ) -> bool:
        """
        마일스톤 달성 알림 발송
        """
        variables = {
            "milestone_type": milestone_type,
            "message": message,
            "value": self._format_money(value)
        }
        
        return self.send_alimtalk(
            phone_number,
            self.TEMPLATES["milestone"].template_code,
            variables,
            self.TEMPLATES["milestone"].buttons
        )
    
    def send_prediction(
        self,
        phone_number: str,
        prediction: Dict[str, Any]
    ) -> bool:
        """
        예측 알림 발송
        """
        pred_type = "기회" if prediction.get("type") == "opportunity" else "위험"
        action = "지금 확인하세요!" if prediction.get("type") == "opportunity" else "주의가 필요합니다."
        
        variables = {
            "prediction_type": pred_type,
            "target": prediction.get("target", ""),
            "current_value": self._format_money(prediction.get("current_value", 0)),
            "predicted_value": self._format_money(prediction.get("predicted_value", 0)),
            "confidence": str(prediction.get("confidence", 0)),
            "action_message": action
        }
        
        return self.send_alimtalk(
            phone_number,
            self.TEMPLATES["prediction"].template_code,
            variables,
            self.TEMPLATES["prediction"].buttons
        )
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════
    
    def _format_money(self, value: float) -> str:
        """금액 포맷팅"""
        if abs(value) >= 100000000:
            return f"₩{value/100000000:.2f}억"
        elif abs(value) >= 10000:
            return f"₩{value/10000:,.0f}만"
        else:
            return f"₩{value:,.0f}"
    
    def _get_recommendation(self, outflow_ratio: float) -> str:
        """유출 비율에 따른 권장 조치"""
        if outflow_ratio > 50:
            return "🔴 긴급: 즉시 비용 절감 필요"
        elif outflow_ratio > 30:
            return "🟡 주의: 유입 경로 다각화 검토"
        else:
            return "🟢 모니터링: 지속 관찰"


# ═══════════════════════════════════════════════════════════════════════════════
# 카카오 비즈니스 직접 연동 (고급)
# ═══════════════════════════════════════════════════════════════════════════════

class KakaoBusinessAPI:
    """
    카카오 비즈니스 직접 연동 클라이언트
    
    주의: 사업자등록 및 템플릿 검수 필요
    """
    
    def __init__(
        self,
        app_key: str = None,
        sender_key: str = None
    ):
        self.app_key = app_key or os.getenv("KAKAO_APP_KEY")
        self.sender_key = sender_key or os.getenv("KAKAO_SENDER_KEY")
        self.base_url = "https://kapi.kakao.com"
    
    def get_token(self, code: str) -> Optional[str]:
        """OAuth 토큰 획득"""
        # 카카오 OAuth 플로우 구현
        pass
    
    def send_alimtalk(self, phone: str, template_code: str, variables: Dict) -> bool:
        """알림톡 발송"""
        # 카카오 비즈메시지 API 호출
        pass


# ═══════════════════════════════════════════════════════════════════════════════
# 사용 예제
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 클라이언트 초기화
    kakao = KakaoAlimtalk(platform="solapi")
    
    # 테스트 전화번호 (실제 번호로 변경)
    TEST_PHONE = "01012345678"
    
    # 병목 알림 예제
    bottleneck_node = {
        "id": "파트너A",
        "name": "미국 파트너",
        "location": "New York, USA",
        "inflow": 45000000,
        "outflow": 15000000,
        "status": "bottleneck"
    }
    
    # kakao.send_bottleneck_alert(TEST_PHONE, bottleneck_node)
    
    # 주간 리포트 예제
    weekly = {
        "week_id": "2025-W01",
        "total_value": 709000000,
        "value_change": 15.2,
        "total_synergy": 22810000,
        "summary": "총 가치 7억 돌파! 시너지 지속 성장 중"
    }
    
    # kakao.send_weekly_report(TEST_PHONE, weekly)
    
    # 마일스톤 알림 예제
    # kakao.send_milestone(TEST_PHONE, "총 가치", "7억 돌파!", 709000000)
    
    print("\n📋 카카오톡 알림톡 설정 가이드:")
    print("\n[간편 설정: Solapi 사용]")
    print("1. https://solapi.com 가입")
    print("2. 카카오 채널 연동 (채널 관리 → 카카오톡 채널 연동)")
    print("3. 발신 프로필 등록")
    print("4. 템플릿 등록:")
    print("   - AUTUS_BOTTLENECK_001: 병목 감지")
    print("   - AUTUS_WEEKLY_001: 주간 리포트")
    print("   - AUTUS_MILESTONE_001: 마일스톤")
    print("   - AUTUS_PREDICTION_001: 예측 알림")
    print("5. API 키 발급 (대시보드 → 개발/연동)")
    print("6. 환경변수 설정:")
    print('   export ALIMTALK_API_KEY="your-api-key"')
    print('   export ALIMTALK_API_SECRET="your-api-secret"')
    print('   export ALIMTALK_SENDER_KEY="your-sender-key"')
    
    print("\n💡 Tip: Solapi는 월 50건 무료!")
    print("💰 예상 비용: 알림톡 1건당 약 8원")





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  💬 AUTUS Physics Map - 카카오톡 알림톡 연동                                  ║
║                                                                               ║
║  기능:                                                                        ║
║  - Physics Map 알림 → 카카오톡 알림톡 발송                                    ║
║  - 병목 감지 시 즉시 알림                                                     ║
║  - 주간 리포트 발송                                                           ║
║  - 마일스톤 달성 알림                                                         ║
║                                                                               ║
║  설정 방법:                                                                   ║
║  1. 카카오 비즈니스 (business.kakao.com) 가입                                 ║
║  2. 채널 생성 → 알림톡 템플릿 등록                                            ║
║  3. API 키 발급                                                               ║
║  4. 또는 NHN Cloud / Solapi 등 알림톡 대행사 사용                             ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import requests
from datetime import datetime
from typing import Dict, Any, List, Optional
from dataclasses import dataclass


@dataclass
class AlimtalkTemplate:
    """알림톡 템플릿"""
    template_code: str
    name: str
    content: str
    buttons: List[Dict] = None


class KakaoAlimtalk:
    """
    카카오톡 알림톡 클라이언트
    
    지원 플랫폼:
    - 카카오 비즈니스 직접 연동
    - NHN Cloud 알림톡
    - Solapi
    - 비즈엠
    """
    
    # 알림톡 템플릿 정의
    TEMPLATES = {
        "bottleneck": AlimtalkTemplate(
            template_code="AUTUS_BOTTLENECK_001",
            name="병목 감지 알림",
            content="""⚠️ AUTUS 병목 감지

#{name}님의 돈 흐름에서 병목이 감지되었습니다.

📍 위치: #{location}
💰 유입: #{inflow}
🔴 유출: #{outflow}
📊 유출비율: #{ratio}%

💡 권장 조치:
#{recommendation}

확인하기 👉""",
            buttons=[{"type": "WL", "name": "대시보드 확인", "url": "https://autus.app/dashboard"}]
        ),
        "weekly_report": AlimtalkTemplate(
            template_code="AUTUS_WEEKLY_001",
            name="주간 리포트",
            content="""📊 AUTUS 주간 리포트

#{week_id} 리포트가 준비되었습니다.

💰 총 가치: #{total_value}
📈 변동: #{change}%
✨ 시너지: #{synergy}

🎯 이번 주 핵심:
#{summary}

자세히 보기 👉""",
            buttons=[{"type": "WL", "name": "리포트 확인", "url": "https://autus.app/report"}]
        ),
        "milestone": AlimtalkTemplate(
            template_code="AUTUS_MILESTONE_001",
            name="마일스톤 달성",
            content="""🎉 축하합니다!

#{milestone_type} 마일스톤을 달성했습니다!

🏆 달성: #{message}
💰 현재 가치: #{value}

계속해서 성장하세요! 🚀""",
            buttons=[{"type": "WL", "name": "성과 확인", "url": "https://autus.app/milestone"}]
        ),
        "prediction": AlimtalkTemplate(
            template_code="AUTUS_PREDICTION_001",
            name="예측 알림",
            content="""🔮 AUTUS 예측 알림

#{prediction_type} 예측이 있습니다.

🎯 대상: #{target}
📊 현재: #{current_value}
📈 예측: #{predicted_value}
🎲 신뢰도: #{confidence}%

#{action_message}

확인하기 👉""",
            buttons=[{"type": "WL", "name": "상세 보기", "url": "https://autus.app/prediction"}]
        )
    }
    
    def __init__(
        self,
        platform: str = "solapi",
        api_key: str = None,
        api_secret: str = None,
        sender_key: str = None
    ):
        """
        알림톡 클라이언트 초기화
        
        Args:
            platform: 사용 플랫폼 ("kakao", "nhn", "solapi", "bizm")
            api_key: API 키
            api_secret: API Secret
            sender_key: 발신 프로필 키
        """
        self.platform = platform
        self.api_key = api_key or os.getenv("ALIMTALK_API_KEY")
        self.api_secret = api_secret or os.getenv("ALIMTALK_API_SECRET")
        self.sender_key = sender_key or os.getenv("ALIMTALK_SENDER_KEY")
        
        # 플랫폼별 엔드포인트
        self.endpoints = {
            "solapi": "https://api.solapi.com/messages/v4/send",
            "nhn": "https://api-alimtalk.cloud.toast.com/alimtalk/v2.0/appkeys/{appkey}/messages",
            "bizm": "https://alimtalk-api.bizm.co.kr/v2/sender/send"
        }
        
        if not all([self.api_key, self.sender_key]):
            print("⚠️ 알림톡 API 설정 필요")
            self._print_setup_guide()
    
    def _print_setup_guide(self):
        """설정 가이드 출력"""
        print("\n📋 알림톡 설정 가이드:")
        print("\n[Option 1: Solapi (추천 - 간편)]")
        print("1. solapi.com 가입")
        print("2. 카카오 채널 연동")
        print("3. API 키 발급")
        print("4. 환경변수 설정:")
        print('   export ALIMTALK_API_KEY="your-api-key"')
        print('   export ALIMTALK_API_SECRET="your-api-secret"')
        print('   export ALIMTALK_SENDER_KEY="your-sender-key"')
        
        print("\n[Option 2: 카카오 비즈니스 직접 연동]")
        print("1. business.kakao.com 가입")
        print("2. 카카오톡 채널 생성")
        print("3. 알림톡 발신 프로필 신청")
        print("4. 템플릿 등록 및 검수")
        print("5. API 연동")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 알림톡 발송 (Solapi 기준)
    # ═══════════════════════════════════════════════════════════════════════════
    
    def send_alimtalk(
        self,
        phone_number: str,
        template_code: str,
        variables: Dict[str, str],
        buttons: List[Dict] = None
    ) -> bool:
        """
        알림톡 발송 (Solapi)
        
        Args:
            phone_number: 수신자 전화번호 (01012345678)
            template_code: 템플릿 코드
            variables: 템플릿 변수 (#{name} → variables["name"])
            buttons: 버튼 목록
        
        Returns:
            발송 성공 여부
        """
        if not self.api_key:
            print("❌ API 키 설정 필요")
            return False
        
        try:
            # Solapi 형식
            payload = {
                "message": {
                    "to": phone_number,
                    "from": self.sender_key,
                    "kakaoOptions": {
                        "pfId": self.sender_key,
                        "templateId": template_code,
                        "variables": variables
                    }
                }
            }
            
            if buttons:
                payload["message"]["kakaoOptions"]["buttons"] = buttons
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            response = requests.post(
                self.endpoints.get(self.platform, self.endpoints["solapi"]),
                json=payload,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                print(f"✅ 알림톡 발송 성공: {phone_number}")
                return True
            else:
                print(f"❌ 알림톡 발송 실패: {response.status_code}")
                print(response.text)
                return False
                
        except Exception as e:
            print(f"❌ 알림톡 오류: {e}")
            return False
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Physics Map 알림 전송
    # ═══════════════════════════════════════════════════════════════════════════
    
    def send_bottleneck_alert(
        self,
        phone_number: str,
        node: Dict[str, Any]
    ) -> bool:
        """
        병목 감지 알림 발송
        """
        inflow = node.get("inflow", 0)
        outflow = node.get("outflow", 0)
        ratio = (outflow / inflow * 100) if inflow > 0 else 0
        
        variables = {
            "name": node.get("name", node.get("id", "Unknown")),
            "location": node.get("location", "-"),
            "inflow": self._format_money(inflow),
            "outflow": self._format_money(outflow),
            "ratio": f"{ratio:.1f}",
            "recommendation": self._get_recommendation(ratio)
        }
        
        return self.send_alimtalk(
            phone_number,
            self.TEMPLATES["bottleneck"].template_code,
            variables,
            self.TEMPLATES["bottleneck"].buttons
        )
    
    def send_weekly_report(
        self,
        phone_number: str,
        report: Dict[str, Any]
    ) -> bool:
        """
        주간 리포트 알림 발송
        """
        variables = {
            "week_id": report.get("week_id", ""),
            "total_value": self._format_money(report.get("total_value", 0)),
            "change": f"{report.get('value_change', 0):+.1f}",
            "synergy": self._format_money(report.get("total_synergy", 0)),
            "summary": report.get("summary", "")[:100]  # 100자 제한
        }
        
        return self.send_alimtalk(
            phone_number,
            self.TEMPLATES["weekly_report"].template_code,
            variables,
            self.TEMPLATES["weekly_report"].buttons
        )
    
    def send_milestone(
        self,
        phone_number: str,
        milestone_type: str,
        message: str,
        value: float
    ) -> bool:
        """
        마일스톤 달성 알림 발송
        """
        variables = {
            "milestone_type": milestone_type,
            "message": message,
            "value": self._format_money(value)
        }
        
        return self.send_alimtalk(
            phone_number,
            self.TEMPLATES["milestone"].template_code,
            variables,
            self.TEMPLATES["milestone"].buttons
        )
    
    def send_prediction(
        self,
        phone_number: str,
        prediction: Dict[str, Any]
    ) -> bool:
        """
        예측 알림 발송
        """
        pred_type = "기회" if prediction.get("type") == "opportunity" else "위험"
        action = "지금 확인하세요!" if prediction.get("type") == "opportunity" else "주의가 필요합니다."
        
        variables = {
            "prediction_type": pred_type,
            "target": prediction.get("target", ""),
            "current_value": self._format_money(prediction.get("current_value", 0)),
            "predicted_value": self._format_money(prediction.get("predicted_value", 0)),
            "confidence": str(prediction.get("confidence", 0)),
            "action_message": action
        }
        
        return self.send_alimtalk(
            phone_number,
            self.TEMPLATES["prediction"].template_code,
            variables,
            self.TEMPLATES["prediction"].buttons
        )
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════
    
    def _format_money(self, value: float) -> str:
        """금액 포맷팅"""
        if abs(value) >= 100000000:
            return f"₩{value/100000000:.2f}억"
        elif abs(value) >= 10000:
            return f"₩{value/10000:,.0f}만"
        else:
            return f"₩{value:,.0f}"
    
    def _get_recommendation(self, outflow_ratio: float) -> str:
        """유출 비율에 따른 권장 조치"""
        if outflow_ratio > 50:
            return "🔴 긴급: 즉시 비용 절감 필요"
        elif outflow_ratio > 30:
            return "🟡 주의: 유입 경로 다각화 검토"
        else:
            return "🟢 모니터링: 지속 관찰"


# ═══════════════════════════════════════════════════════════════════════════════
# 카카오 비즈니스 직접 연동 (고급)
# ═══════════════════════════════════════════════════════════════════════════════

class KakaoBusinessAPI:
    """
    카카오 비즈니스 직접 연동 클라이언트
    
    주의: 사업자등록 및 템플릿 검수 필요
    """
    
    def __init__(
        self,
        app_key: str = None,
        sender_key: str = None
    ):
        self.app_key = app_key or os.getenv("KAKAO_APP_KEY")
        self.sender_key = sender_key or os.getenv("KAKAO_SENDER_KEY")
        self.base_url = "https://kapi.kakao.com"
    
    def get_token(self, code: str) -> Optional[str]:
        """OAuth 토큰 획득"""
        # 카카오 OAuth 플로우 구현
        pass
    
    def send_alimtalk(self, phone: str, template_code: str, variables: Dict) -> bool:
        """알림톡 발송"""
        # 카카오 비즈메시지 API 호출
        pass


# ═══════════════════════════════════════════════════════════════════════════════
# 사용 예제
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 클라이언트 초기화
    kakao = KakaoAlimtalk(platform="solapi")
    
    # 테스트 전화번호 (실제 번호로 변경)
    TEST_PHONE = "01012345678"
    
    # 병목 알림 예제
    bottleneck_node = {
        "id": "파트너A",
        "name": "미국 파트너",
        "location": "New York, USA",
        "inflow": 45000000,
        "outflow": 15000000,
        "status": "bottleneck"
    }
    
    # kakao.send_bottleneck_alert(TEST_PHONE, bottleneck_node)
    
    # 주간 리포트 예제
    weekly = {
        "week_id": "2025-W01",
        "total_value": 709000000,
        "value_change": 15.2,
        "total_synergy": 22810000,
        "summary": "총 가치 7억 돌파! 시너지 지속 성장 중"
    }
    
    # kakao.send_weekly_report(TEST_PHONE, weekly)
    
    # 마일스톤 알림 예제
    # kakao.send_milestone(TEST_PHONE, "총 가치", "7억 돌파!", 709000000)
    
    print("\n📋 카카오톡 알림톡 설정 가이드:")
    print("\n[간편 설정: Solapi 사용]")
    print("1. https://solapi.com 가입")
    print("2. 카카오 채널 연동 (채널 관리 → 카카오톡 채널 연동)")
    print("3. 발신 프로필 등록")
    print("4. 템플릿 등록:")
    print("   - AUTUS_BOTTLENECK_001: 병목 감지")
    print("   - AUTUS_WEEKLY_001: 주간 리포트")
    print("   - AUTUS_MILESTONE_001: 마일스톤")
    print("   - AUTUS_PREDICTION_001: 예측 알림")
    print("5. API 키 발급 (대시보드 → 개발/연동)")
    print("6. 환경변수 설정:")
    print('   export ALIMTALK_API_KEY="your-api-key"')
    print('   export ALIMTALK_API_SECRET="your-api-secret"')
    print('   export ALIMTALK_SENDER_KEY="your-sender-key"')
    
    print("\n💡 Tip: Solapi는 월 50건 무료!")
    print("💰 예상 비용: 알림톡 1건당 약 8원")





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  💬 AUTUS Physics Map - 카카오톡 알림톡 연동                                  ║
║                                                                               ║
║  기능:                                                                        ║
║  - Physics Map 알림 → 카카오톡 알림톡 발송                                    ║
║  - 병목 감지 시 즉시 알림                                                     ║
║  - 주간 리포트 발송                                                           ║
║  - 마일스톤 달성 알림                                                         ║
║                                                                               ║
║  설정 방법:                                                                   ║
║  1. 카카오 비즈니스 (business.kakao.com) 가입                                 ║
║  2. 채널 생성 → 알림톡 템플릿 등록                                            ║
║  3. API 키 발급                                                               ║
║  4. 또는 NHN Cloud / Solapi 등 알림톡 대행사 사용                             ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import requests
from datetime import datetime
from typing import Dict, Any, List, Optional
from dataclasses import dataclass


@dataclass
class AlimtalkTemplate:
    """알림톡 템플릿"""
    template_code: str
    name: str
    content: str
    buttons: List[Dict] = None


class KakaoAlimtalk:
    """
    카카오톡 알림톡 클라이언트
    
    지원 플랫폼:
    - 카카오 비즈니스 직접 연동
    - NHN Cloud 알림톡
    - Solapi
    - 비즈엠
    """
    
    # 알림톡 템플릿 정의
    TEMPLATES = {
        "bottleneck": AlimtalkTemplate(
            template_code="AUTUS_BOTTLENECK_001",
            name="병목 감지 알림",
            content="""⚠️ AUTUS 병목 감지

#{name}님의 돈 흐름에서 병목이 감지되었습니다.

📍 위치: #{location}
💰 유입: #{inflow}
🔴 유출: #{outflow}
📊 유출비율: #{ratio}%

💡 권장 조치:
#{recommendation}

확인하기 👉""",
            buttons=[{"type": "WL", "name": "대시보드 확인", "url": "https://autus.app/dashboard"}]
        ),
        "weekly_report": AlimtalkTemplate(
            template_code="AUTUS_WEEKLY_001",
            name="주간 리포트",
            content="""📊 AUTUS 주간 리포트

#{week_id} 리포트가 준비되었습니다.

💰 총 가치: #{total_value}
📈 변동: #{change}%
✨ 시너지: #{synergy}

🎯 이번 주 핵심:
#{summary}

자세히 보기 👉""",
            buttons=[{"type": "WL", "name": "리포트 확인", "url": "https://autus.app/report"}]
        ),
        "milestone": AlimtalkTemplate(
            template_code="AUTUS_MILESTONE_001",
            name="마일스톤 달성",
            content="""🎉 축하합니다!

#{milestone_type} 마일스톤을 달성했습니다!

🏆 달성: #{message}
💰 현재 가치: #{value}

계속해서 성장하세요! 🚀""",
            buttons=[{"type": "WL", "name": "성과 확인", "url": "https://autus.app/milestone"}]
        ),
        "prediction": AlimtalkTemplate(
            template_code="AUTUS_PREDICTION_001",
            name="예측 알림",
            content="""🔮 AUTUS 예측 알림

#{prediction_type} 예측이 있습니다.

🎯 대상: #{target}
📊 현재: #{current_value}
📈 예측: #{predicted_value}
🎲 신뢰도: #{confidence}%

#{action_message}

확인하기 👉""",
            buttons=[{"type": "WL", "name": "상세 보기", "url": "https://autus.app/prediction"}]
        )
    }
    
    def __init__(
        self,
        platform: str = "solapi",
        api_key: str = None,
        api_secret: str = None,
        sender_key: str = None
    ):
        """
        알림톡 클라이언트 초기화
        
        Args:
            platform: 사용 플랫폼 ("kakao", "nhn", "solapi", "bizm")
            api_key: API 키
            api_secret: API Secret
            sender_key: 발신 프로필 키
        """
        self.platform = platform
        self.api_key = api_key or os.getenv("ALIMTALK_API_KEY")
        self.api_secret = api_secret or os.getenv("ALIMTALK_API_SECRET")
        self.sender_key = sender_key or os.getenv("ALIMTALK_SENDER_KEY")
        
        # 플랫폼별 엔드포인트
        self.endpoints = {
            "solapi": "https://api.solapi.com/messages/v4/send",
            "nhn": "https://api-alimtalk.cloud.toast.com/alimtalk/v2.0/appkeys/{appkey}/messages",
            "bizm": "https://alimtalk-api.bizm.co.kr/v2/sender/send"
        }
        
        if not all([self.api_key, self.sender_key]):
            print("⚠️ 알림톡 API 설정 필요")
            self._print_setup_guide()
    
    def _print_setup_guide(self):
        """설정 가이드 출력"""
        print("\n📋 알림톡 설정 가이드:")
        print("\n[Option 1: Solapi (추천 - 간편)]")
        print("1. solapi.com 가입")
        print("2. 카카오 채널 연동")
        print("3. API 키 발급")
        print("4. 환경변수 설정:")
        print('   export ALIMTALK_API_KEY="your-api-key"')
        print('   export ALIMTALK_API_SECRET="your-api-secret"')
        print('   export ALIMTALK_SENDER_KEY="your-sender-key"')
        
        print("\n[Option 2: 카카오 비즈니스 직접 연동]")
        print("1. business.kakao.com 가입")
        print("2. 카카오톡 채널 생성")
        print("3. 알림톡 발신 프로필 신청")
        print("4. 템플릿 등록 및 검수")
        print("5. API 연동")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 알림톡 발송 (Solapi 기준)
    # ═══════════════════════════════════════════════════════════════════════════
    
    def send_alimtalk(
        self,
        phone_number: str,
        template_code: str,
        variables: Dict[str, str],
        buttons: List[Dict] = None
    ) -> bool:
        """
        알림톡 발송 (Solapi)
        
        Args:
            phone_number: 수신자 전화번호 (01012345678)
            template_code: 템플릿 코드
            variables: 템플릿 변수 (#{name} → variables["name"])
            buttons: 버튼 목록
        
        Returns:
            발송 성공 여부
        """
        if not self.api_key:
            print("❌ API 키 설정 필요")
            return False
        
        try:
            # Solapi 형식
            payload = {
                "message": {
                    "to": phone_number,
                    "from": self.sender_key,
                    "kakaoOptions": {
                        "pfId": self.sender_key,
                        "templateId": template_code,
                        "variables": variables
                    }
                }
            }
            
            if buttons:
                payload["message"]["kakaoOptions"]["buttons"] = buttons
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            response = requests.post(
                self.endpoints.get(self.platform, self.endpoints["solapi"]),
                json=payload,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                print(f"✅ 알림톡 발송 성공: {phone_number}")
                return True
            else:
                print(f"❌ 알림톡 발송 실패: {response.status_code}")
                print(response.text)
                return False
                
        except Exception as e:
            print(f"❌ 알림톡 오류: {e}")
            return False
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Physics Map 알림 전송
    # ═══════════════════════════════════════════════════════════════════════════
    
    def send_bottleneck_alert(
        self,
        phone_number: str,
        node: Dict[str, Any]
    ) -> bool:
        """
        병목 감지 알림 발송
        """
        inflow = node.get("inflow", 0)
        outflow = node.get("outflow", 0)
        ratio = (outflow / inflow * 100) if inflow > 0 else 0
        
        variables = {
            "name": node.get("name", node.get("id", "Unknown")),
            "location": node.get("location", "-"),
            "inflow": self._format_money(inflow),
            "outflow": self._format_money(outflow),
            "ratio": f"{ratio:.1f}",
            "recommendation": self._get_recommendation(ratio)
        }
        
        return self.send_alimtalk(
            phone_number,
            self.TEMPLATES["bottleneck"].template_code,
            variables,
            self.TEMPLATES["bottleneck"].buttons
        )
    
    def send_weekly_report(
        self,
        phone_number: str,
        report: Dict[str, Any]
    ) -> bool:
        """
        주간 리포트 알림 발송
        """
        variables = {
            "week_id": report.get("week_id", ""),
            "total_value": self._format_money(report.get("total_value", 0)),
            "change": f"{report.get('value_change', 0):+.1f}",
            "synergy": self._format_money(report.get("total_synergy", 0)),
            "summary": report.get("summary", "")[:100]  # 100자 제한
        }
        
        return self.send_alimtalk(
            phone_number,
            self.TEMPLATES["weekly_report"].template_code,
            variables,
            self.TEMPLATES["weekly_report"].buttons
        )
    
    def send_milestone(
        self,
        phone_number: str,
        milestone_type: str,
        message: str,
        value: float
    ) -> bool:
        """
        마일스톤 달성 알림 발송
        """
        variables = {
            "milestone_type": milestone_type,
            "message": message,
            "value": self._format_money(value)
        }
        
        return self.send_alimtalk(
            phone_number,
            self.TEMPLATES["milestone"].template_code,
            variables,
            self.TEMPLATES["milestone"].buttons
        )
    
    def send_prediction(
        self,
        phone_number: str,
        prediction: Dict[str, Any]
    ) -> bool:
        """
        예측 알림 발송
        """
        pred_type = "기회" if prediction.get("type") == "opportunity" else "위험"
        action = "지금 확인하세요!" if prediction.get("type") == "opportunity" else "주의가 필요합니다."
        
        variables = {
            "prediction_type": pred_type,
            "target": prediction.get("target", ""),
            "current_value": self._format_money(prediction.get("current_value", 0)),
            "predicted_value": self._format_money(prediction.get("predicted_value", 0)),
            "confidence": str(prediction.get("confidence", 0)),
            "action_message": action
        }
        
        return self.send_alimtalk(
            phone_number,
            self.TEMPLATES["prediction"].template_code,
            variables,
            self.TEMPLATES["prediction"].buttons
        )
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════
    
    def _format_money(self, value: float) -> str:
        """금액 포맷팅"""
        if abs(value) >= 100000000:
            return f"₩{value/100000000:.2f}억"
        elif abs(value) >= 10000:
            return f"₩{value/10000:,.0f}만"
        else:
            return f"₩{value:,.0f}"
    
    def _get_recommendation(self, outflow_ratio: float) -> str:
        """유출 비율에 따른 권장 조치"""
        if outflow_ratio > 50:
            return "🔴 긴급: 즉시 비용 절감 필요"
        elif outflow_ratio > 30:
            return "🟡 주의: 유입 경로 다각화 검토"
        else:
            return "🟢 모니터링: 지속 관찰"


# ═══════════════════════════════════════════════════════════════════════════════
# 카카오 비즈니스 직접 연동 (고급)
# ═══════════════════════════════════════════════════════════════════════════════

class KakaoBusinessAPI:
    """
    카카오 비즈니스 직접 연동 클라이언트
    
    주의: 사업자등록 및 템플릿 검수 필요
    """
    
    def __init__(
        self,
        app_key: str = None,
        sender_key: str = None
    ):
        self.app_key = app_key or os.getenv("KAKAO_APP_KEY")
        self.sender_key = sender_key or os.getenv("KAKAO_SENDER_KEY")
        self.base_url = "https://kapi.kakao.com"
    
    def get_token(self, code: str) -> Optional[str]:
        """OAuth 토큰 획득"""
        # 카카오 OAuth 플로우 구현
        pass
    
    def send_alimtalk(self, phone: str, template_code: str, variables: Dict) -> bool:
        """알림톡 발송"""
        # 카카오 비즈메시지 API 호출
        pass


# ═══════════════════════════════════════════════════════════════════════════════
# 사용 예제
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 클라이언트 초기화
    kakao = KakaoAlimtalk(platform="solapi")
    
    # 테스트 전화번호 (실제 번호로 변경)
    TEST_PHONE = "01012345678"
    
    # 병목 알림 예제
    bottleneck_node = {
        "id": "파트너A",
        "name": "미국 파트너",
        "location": "New York, USA",
        "inflow": 45000000,
        "outflow": 15000000,
        "status": "bottleneck"
    }
    
    # kakao.send_bottleneck_alert(TEST_PHONE, bottleneck_node)
    
    # 주간 리포트 예제
    weekly = {
        "week_id": "2025-W01",
        "total_value": 709000000,
        "value_change": 15.2,
        "total_synergy": 22810000,
        "summary": "총 가치 7억 돌파! 시너지 지속 성장 중"
    }
    
    # kakao.send_weekly_report(TEST_PHONE, weekly)
    
    # 마일스톤 알림 예제
    # kakao.send_milestone(TEST_PHONE, "총 가치", "7억 돌파!", 709000000)
    
    print("\n📋 카카오톡 알림톡 설정 가이드:")
    print("\n[간편 설정: Solapi 사용]")
    print("1. https://solapi.com 가입")
    print("2. 카카오 채널 연동 (채널 관리 → 카카오톡 채널 연동)")
    print("3. 발신 프로필 등록")
    print("4. 템플릿 등록:")
    print("   - AUTUS_BOTTLENECK_001: 병목 감지")
    print("   - AUTUS_WEEKLY_001: 주간 리포트")
    print("   - AUTUS_MILESTONE_001: 마일스톤")
    print("   - AUTUS_PREDICTION_001: 예측 알림")
    print("5. API 키 발급 (대시보드 → 개발/연동)")
    print("6. 환경변수 설정:")
    print('   export ALIMTALK_API_KEY="your-api-key"')
    print('   export ALIMTALK_API_SECRET="your-api-secret"')
    print('   export ALIMTALK_SENDER_KEY="your-sender-key"')
    
    print("\n💡 Tip: Solapi는 월 50건 무료!")
    print("💰 예상 비용: 알림톡 1건당 약 8원")















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  💬 AUTUS Physics Map - 카카오톡 알림톡 연동                                  ║
║                                                                               ║
║  기능:                                                                        ║
║  - Physics Map 알림 → 카카오톡 알림톡 발송                                    ║
║  - 병목 감지 시 즉시 알림                                                     ║
║  - 주간 리포트 발송                                                           ║
║  - 마일스톤 달성 알림                                                         ║
║                                                                               ║
║  설정 방법:                                                                   ║
║  1. 카카오 비즈니스 (business.kakao.com) 가입                                 ║
║  2. 채널 생성 → 알림톡 템플릿 등록                                            ║
║  3. API 키 발급                                                               ║
║  4. 또는 NHN Cloud / Solapi 등 알림톡 대행사 사용                             ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import requests
from datetime import datetime
from typing import Dict, Any, List, Optional
from dataclasses import dataclass


@dataclass
class AlimtalkTemplate:
    """알림톡 템플릿"""
    template_code: str
    name: str
    content: str
    buttons: List[Dict] = None


class KakaoAlimtalk:
    """
    카카오톡 알림톡 클라이언트
    
    지원 플랫폼:
    - 카카오 비즈니스 직접 연동
    - NHN Cloud 알림톡
    - Solapi
    - 비즈엠
    """
    
    # 알림톡 템플릿 정의
    TEMPLATES = {
        "bottleneck": AlimtalkTemplate(
            template_code="AUTUS_BOTTLENECK_001",
            name="병목 감지 알림",
            content="""⚠️ AUTUS 병목 감지

#{name}님의 돈 흐름에서 병목이 감지되었습니다.

📍 위치: #{location}
💰 유입: #{inflow}
🔴 유출: #{outflow}
📊 유출비율: #{ratio}%

💡 권장 조치:
#{recommendation}

확인하기 👉""",
            buttons=[{"type": "WL", "name": "대시보드 확인", "url": "https://autus.app/dashboard"}]
        ),
        "weekly_report": AlimtalkTemplate(
            template_code="AUTUS_WEEKLY_001",
            name="주간 리포트",
            content="""📊 AUTUS 주간 리포트

#{week_id} 리포트가 준비되었습니다.

💰 총 가치: #{total_value}
📈 변동: #{change}%
✨ 시너지: #{synergy}

🎯 이번 주 핵심:
#{summary}

자세히 보기 👉""",
            buttons=[{"type": "WL", "name": "리포트 확인", "url": "https://autus.app/report"}]
        ),
        "milestone": AlimtalkTemplate(
            template_code="AUTUS_MILESTONE_001",
            name="마일스톤 달성",
            content="""🎉 축하합니다!

#{milestone_type} 마일스톤을 달성했습니다!

🏆 달성: #{message}
💰 현재 가치: #{value}

계속해서 성장하세요! 🚀""",
            buttons=[{"type": "WL", "name": "성과 확인", "url": "https://autus.app/milestone"}]
        ),
        "prediction": AlimtalkTemplate(
            template_code="AUTUS_PREDICTION_001",
            name="예측 알림",
            content="""🔮 AUTUS 예측 알림

#{prediction_type} 예측이 있습니다.

🎯 대상: #{target}
📊 현재: #{current_value}
📈 예측: #{predicted_value}
🎲 신뢰도: #{confidence}%

#{action_message}

확인하기 👉""",
            buttons=[{"type": "WL", "name": "상세 보기", "url": "https://autus.app/prediction"}]
        )
    }
    
    def __init__(
        self,
        platform: str = "solapi",
        api_key: str = None,
        api_secret: str = None,
        sender_key: str = None
    ):
        """
        알림톡 클라이언트 초기화
        
        Args:
            platform: 사용 플랫폼 ("kakao", "nhn", "solapi", "bizm")
            api_key: API 키
            api_secret: API Secret
            sender_key: 발신 프로필 키
        """
        self.platform = platform
        self.api_key = api_key or os.getenv("ALIMTALK_API_KEY")
        self.api_secret = api_secret or os.getenv("ALIMTALK_API_SECRET")
        self.sender_key = sender_key or os.getenv("ALIMTALK_SENDER_KEY")
        
        # 플랫폼별 엔드포인트
        self.endpoints = {
            "solapi": "https://api.solapi.com/messages/v4/send",
            "nhn": "https://api-alimtalk.cloud.toast.com/alimtalk/v2.0/appkeys/{appkey}/messages",
            "bizm": "https://alimtalk-api.bizm.co.kr/v2/sender/send"
        }
        
        if not all([self.api_key, self.sender_key]):
            print("⚠️ 알림톡 API 설정 필요")
            self._print_setup_guide()
    
    def _print_setup_guide(self):
        """설정 가이드 출력"""
        print("\n📋 알림톡 설정 가이드:")
        print("\n[Option 1: Solapi (추천 - 간편)]")
        print("1. solapi.com 가입")
        print("2. 카카오 채널 연동")
        print("3. API 키 발급")
        print("4. 환경변수 설정:")
        print('   export ALIMTALK_API_KEY="your-api-key"')
        print('   export ALIMTALK_API_SECRET="your-api-secret"')
        print('   export ALIMTALK_SENDER_KEY="your-sender-key"')
        
        print("\n[Option 2: 카카오 비즈니스 직접 연동]")
        print("1. business.kakao.com 가입")
        print("2. 카카오톡 채널 생성")
        print("3. 알림톡 발신 프로필 신청")
        print("4. 템플릿 등록 및 검수")
        print("5. API 연동")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 알림톡 발송 (Solapi 기준)
    # ═══════════════════════════════════════════════════════════════════════════
    
    def send_alimtalk(
        self,
        phone_number: str,
        template_code: str,
        variables: Dict[str, str],
        buttons: List[Dict] = None
    ) -> bool:
        """
        알림톡 발송 (Solapi)
        
        Args:
            phone_number: 수신자 전화번호 (01012345678)
            template_code: 템플릿 코드
            variables: 템플릿 변수 (#{name} → variables["name"])
            buttons: 버튼 목록
        
        Returns:
            발송 성공 여부
        """
        if not self.api_key:
            print("❌ API 키 설정 필요")
            return False
        
        try:
            # Solapi 형식
            payload = {
                "message": {
                    "to": phone_number,
                    "from": self.sender_key,
                    "kakaoOptions": {
                        "pfId": self.sender_key,
                        "templateId": template_code,
                        "variables": variables
                    }
                }
            }
            
            if buttons:
                payload["message"]["kakaoOptions"]["buttons"] = buttons
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            response = requests.post(
                self.endpoints.get(self.platform, self.endpoints["solapi"]),
                json=payload,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                print(f"✅ 알림톡 발송 성공: {phone_number}")
                return True
            else:
                print(f"❌ 알림톡 발송 실패: {response.status_code}")
                print(response.text)
                return False
                
        except Exception as e:
            print(f"❌ 알림톡 오류: {e}")
            return False
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Physics Map 알림 전송
    # ═══════════════════════════════════════════════════════════════════════════
    
    def send_bottleneck_alert(
        self,
        phone_number: str,
        node: Dict[str, Any]
    ) -> bool:
        """
        병목 감지 알림 발송
        """
        inflow = node.get("inflow", 0)
        outflow = node.get("outflow", 0)
        ratio = (outflow / inflow * 100) if inflow > 0 else 0
        
        variables = {
            "name": node.get("name", node.get("id", "Unknown")),
            "location": node.get("location", "-"),
            "inflow": self._format_money(inflow),
            "outflow": self._format_money(outflow),
            "ratio": f"{ratio:.1f}",
            "recommendation": self._get_recommendation(ratio)
        }
        
        return self.send_alimtalk(
            phone_number,
            self.TEMPLATES["bottleneck"].template_code,
            variables,
            self.TEMPLATES["bottleneck"].buttons
        )
    
    def send_weekly_report(
        self,
        phone_number: str,
        report: Dict[str, Any]
    ) -> bool:
        """
        주간 리포트 알림 발송
        """
        variables = {
            "week_id": report.get("week_id", ""),
            "total_value": self._format_money(report.get("total_value", 0)),
            "change": f"{report.get('value_change', 0):+.1f}",
            "synergy": self._format_money(report.get("total_synergy", 0)),
            "summary": report.get("summary", "")[:100]  # 100자 제한
        }
        
        return self.send_alimtalk(
            phone_number,
            self.TEMPLATES["weekly_report"].template_code,
            variables,
            self.TEMPLATES["weekly_report"].buttons
        )
    
    def send_milestone(
        self,
        phone_number: str,
        milestone_type: str,
        message: str,
        value: float
    ) -> bool:
        """
        마일스톤 달성 알림 발송
        """
        variables = {
            "milestone_type": milestone_type,
            "message": message,
            "value": self._format_money(value)
        }
        
        return self.send_alimtalk(
            phone_number,
            self.TEMPLATES["milestone"].template_code,
            variables,
            self.TEMPLATES["milestone"].buttons
        )
    
    def send_prediction(
        self,
        phone_number: str,
        prediction: Dict[str, Any]
    ) -> bool:
        """
        예측 알림 발송
        """
        pred_type = "기회" if prediction.get("type") == "opportunity" else "위험"
        action = "지금 확인하세요!" if prediction.get("type") == "opportunity" else "주의가 필요합니다."
        
        variables = {
            "prediction_type": pred_type,
            "target": prediction.get("target", ""),
            "current_value": self._format_money(prediction.get("current_value", 0)),
            "predicted_value": self._format_money(prediction.get("predicted_value", 0)),
            "confidence": str(prediction.get("confidence", 0)),
            "action_message": action
        }
        
        return self.send_alimtalk(
            phone_number,
            self.TEMPLATES["prediction"].template_code,
            variables,
            self.TEMPLATES["prediction"].buttons
        )
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════
    
    def _format_money(self, value: float) -> str:
        """금액 포맷팅"""
        if abs(value) >= 100000000:
            return f"₩{value/100000000:.2f}억"
        elif abs(value) >= 10000:
            return f"₩{value/10000:,.0f}만"
        else:
            return f"₩{value:,.0f}"
    
    def _get_recommendation(self, outflow_ratio: float) -> str:
        """유출 비율에 따른 권장 조치"""
        if outflow_ratio > 50:
            return "🔴 긴급: 즉시 비용 절감 필요"
        elif outflow_ratio > 30:
            return "🟡 주의: 유입 경로 다각화 검토"
        else:
            return "🟢 모니터링: 지속 관찰"


# ═══════════════════════════════════════════════════════════════════════════════
# 카카오 비즈니스 직접 연동 (고급)
# ═══════════════════════════════════════════════════════════════════════════════

class KakaoBusinessAPI:
    """
    카카오 비즈니스 직접 연동 클라이언트
    
    주의: 사업자등록 및 템플릿 검수 필요
    """
    
    def __init__(
        self,
        app_key: str = None,
        sender_key: str = None
    ):
        self.app_key = app_key or os.getenv("KAKAO_APP_KEY")
        self.sender_key = sender_key or os.getenv("KAKAO_SENDER_KEY")
        self.base_url = "https://kapi.kakao.com"
    
    def get_token(self, code: str) -> Optional[str]:
        """OAuth 토큰 획득"""
        # 카카오 OAuth 플로우 구현
        pass
    
    def send_alimtalk(self, phone: str, template_code: str, variables: Dict) -> bool:
        """알림톡 발송"""
        # 카카오 비즈메시지 API 호출
        pass


# ═══════════════════════════════════════════════════════════════════════════════
# 사용 예제
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 클라이언트 초기화
    kakao = KakaoAlimtalk(platform="solapi")
    
    # 테스트 전화번호 (실제 번호로 변경)
    TEST_PHONE = "01012345678"
    
    # 병목 알림 예제
    bottleneck_node = {
        "id": "파트너A",
        "name": "미국 파트너",
        "location": "New York, USA",
        "inflow": 45000000,
        "outflow": 15000000,
        "status": "bottleneck"
    }
    
    # kakao.send_bottleneck_alert(TEST_PHONE, bottleneck_node)
    
    # 주간 리포트 예제
    weekly = {
        "week_id": "2025-W01",
        "total_value": 709000000,
        "value_change": 15.2,
        "total_synergy": 22810000,
        "summary": "총 가치 7억 돌파! 시너지 지속 성장 중"
    }
    
    # kakao.send_weekly_report(TEST_PHONE, weekly)
    
    # 마일스톤 알림 예제
    # kakao.send_milestone(TEST_PHONE, "총 가치", "7억 돌파!", 709000000)
    
    print("\n📋 카카오톡 알림톡 설정 가이드:")
    print("\n[간편 설정: Solapi 사용]")
    print("1. https://solapi.com 가입")
    print("2. 카카오 채널 연동 (채널 관리 → 카카오톡 채널 연동)")
    print("3. 발신 프로필 등록")
    print("4. 템플릿 등록:")
    print("   - AUTUS_BOTTLENECK_001: 병목 감지")
    print("   - AUTUS_WEEKLY_001: 주간 리포트")
    print("   - AUTUS_MILESTONE_001: 마일스톤")
    print("   - AUTUS_PREDICTION_001: 예측 알림")
    print("5. API 키 발급 (대시보드 → 개발/연동)")
    print("6. 환경변수 설정:")
    print('   export ALIMTALK_API_KEY="your-api-key"')
    print('   export ALIMTALK_API_SECRET="your-api-secret"')
    print('   export ALIMTALK_SENDER_KEY="your-sender-key"')
    
    print("\n💡 Tip: Solapi는 월 50건 무료!")
    print("💰 예상 비용: 알림톡 1건당 약 8원")





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  💬 AUTUS Physics Map - 카카오톡 알림톡 연동                                  ║
║                                                                               ║
║  기능:                                                                        ║
║  - Physics Map 알림 → 카카오톡 알림톡 발송                                    ║
║  - 병목 감지 시 즉시 알림                                                     ║
║  - 주간 리포트 발송                                                           ║
║  - 마일스톤 달성 알림                                                         ║
║                                                                               ║
║  설정 방법:                                                                   ║
║  1. 카카오 비즈니스 (business.kakao.com) 가입                                 ║
║  2. 채널 생성 → 알림톡 템플릿 등록                                            ║
║  3. API 키 발급                                                               ║
║  4. 또는 NHN Cloud / Solapi 등 알림톡 대행사 사용                             ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import requests
from datetime import datetime
from typing import Dict, Any, List, Optional
from dataclasses import dataclass


@dataclass
class AlimtalkTemplate:
    """알림톡 템플릿"""
    template_code: str
    name: str
    content: str
    buttons: List[Dict] = None


class KakaoAlimtalk:
    """
    카카오톡 알림톡 클라이언트
    
    지원 플랫폼:
    - 카카오 비즈니스 직접 연동
    - NHN Cloud 알림톡
    - Solapi
    - 비즈엠
    """
    
    # 알림톡 템플릿 정의
    TEMPLATES = {
        "bottleneck": AlimtalkTemplate(
            template_code="AUTUS_BOTTLENECK_001",
            name="병목 감지 알림",
            content="""⚠️ AUTUS 병목 감지

#{name}님의 돈 흐름에서 병목이 감지되었습니다.

📍 위치: #{location}
💰 유입: #{inflow}
🔴 유출: #{outflow}
📊 유출비율: #{ratio}%

💡 권장 조치:
#{recommendation}

확인하기 👉""",
            buttons=[{"type": "WL", "name": "대시보드 확인", "url": "https://autus.app/dashboard"}]
        ),
        "weekly_report": AlimtalkTemplate(
            template_code="AUTUS_WEEKLY_001",
            name="주간 리포트",
            content="""📊 AUTUS 주간 리포트

#{week_id} 리포트가 준비되었습니다.

💰 총 가치: #{total_value}
📈 변동: #{change}%
✨ 시너지: #{synergy}

🎯 이번 주 핵심:
#{summary}

자세히 보기 👉""",
            buttons=[{"type": "WL", "name": "리포트 확인", "url": "https://autus.app/report"}]
        ),
        "milestone": AlimtalkTemplate(
            template_code="AUTUS_MILESTONE_001",
            name="마일스톤 달성",
            content="""🎉 축하합니다!

#{milestone_type} 마일스톤을 달성했습니다!

🏆 달성: #{message}
💰 현재 가치: #{value}

계속해서 성장하세요! 🚀""",
            buttons=[{"type": "WL", "name": "성과 확인", "url": "https://autus.app/milestone"}]
        ),
        "prediction": AlimtalkTemplate(
            template_code="AUTUS_PREDICTION_001",
            name="예측 알림",
            content="""🔮 AUTUS 예측 알림

#{prediction_type} 예측이 있습니다.

🎯 대상: #{target}
📊 현재: #{current_value}
📈 예측: #{predicted_value}
🎲 신뢰도: #{confidence}%

#{action_message}

확인하기 👉""",
            buttons=[{"type": "WL", "name": "상세 보기", "url": "https://autus.app/prediction"}]
        )
    }
    
    def __init__(
        self,
        platform: str = "solapi",
        api_key: str = None,
        api_secret: str = None,
        sender_key: str = None
    ):
        """
        알림톡 클라이언트 초기화
        
        Args:
            platform: 사용 플랫폼 ("kakao", "nhn", "solapi", "bizm")
            api_key: API 키
            api_secret: API Secret
            sender_key: 발신 프로필 키
        """
        self.platform = platform
        self.api_key = api_key or os.getenv("ALIMTALK_API_KEY")
        self.api_secret = api_secret or os.getenv("ALIMTALK_API_SECRET")
        self.sender_key = sender_key or os.getenv("ALIMTALK_SENDER_KEY")
        
        # 플랫폼별 엔드포인트
        self.endpoints = {
            "solapi": "https://api.solapi.com/messages/v4/send",
            "nhn": "https://api-alimtalk.cloud.toast.com/alimtalk/v2.0/appkeys/{appkey}/messages",
            "bizm": "https://alimtalk-api.bizm.co.kr/v2/sender/send"
        }
        
        if not all([self.api_key, self.sender_key]):
            print("⚠️ 알림톡 API 설정 필요")
            self._print_setup_guide()
    
    def _print_setup_guide(self):
        """설정 가이드 출력"""
        print("\n📋 알림톡 설정 가이드:")
        print("\n[Option 1: Solapi (추천 - 간편)]")
        print("1. solapi.com 가입")
        print("2. 카카오 채널 연동")
        print("3. API 키 발급")
        print("4. 환경변수 설정:")
        print('   export ALIMTALK_API_KEY="your-api-key"')
        print('   export ALIMTALK_API_SECRET="your-api-secret"')
        print('   export ALIMTALK_SENDER_KEY="your-sender-key"')
        
        print("\n[Option 2: 카카오 비즈니스 직접 연동]")
        print("1. business.kakao.com 가입")
        print("2. 카카오톡 채널 생성")
        print("3. 알림톡 발신 프로필 신청")
        print("4. 템플릿 등록 및 검수")
        print("5. API 연동")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 알림톡 발송 (Solapi 기준)
    # ═══════════════════════════════════════════════════════════════════════════
    
    def send_alimtalk(
        self,
        phone_number: str,
        template_code: str,
        variables: Dict[str, str],
        buttons: List[Dict] = None
    ) -> bool:
        """
        알림톡 발송 (Solapi)
        
        Args:
            phone_number: 수신자 전화번호 (01012345678)
            template_code: 템플릿 코드
            variables: 템플릿 변수 (#{name} → variables["name"])
            buttons: 버튼 목록
        
        Returns:
            발송 성공 여부
        """
        if not self.api_key:
            print("❌ API 키 설정 필요")
            return False
        
        try:
            # Solapi 형식
            payload = {
                "message": {
                    "to": phone_number,
                    "from": self.sender_key,
                    "kakaoOptions": {
                        "pfId": self.sender_key,
                        "templateId": template_code,
                        "variables": variables
                    }
                }
            }
            
            if buttons:
                payload["message"]["kakaoOptions"]["buttons"] = buttons
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            response = requests.post(
                self.endpoints.get(self.platform, self.endpoints["solapi"]),
                json=payload,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                print(f"✅ 알림톡 발송 성공: {phone_number}")
                return True
            else:
                print(f"❌ 알림톡 발송 실패: {response.status_code}")
                print(response.text)
                return False
                
        except Exception as e:
            print(f"❌ 알림톡 오류: {e}")
            return False
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Physics Map 알림 전송
    # ═══════════════════════════════════════════════════════════════════════════
    
    def send_bottleneck_alert(
        self,
        phone_number: str,
        node: Dict[str, Any]
    ) -> bool:
        """
        병목 감지 알림 발송
        """
        inflow = node.get("inflow", 0)
        outflow = node.get("outflow", 0)
        ratio = (outflow / inflow * 100) if inflow > 0 else 0
        
        variables = {
            "name": node.get("name", node.get("id", "Unknown")),
            "location": node.get("location", "-"),
            "inflow": self._format_money(inflow),
            "outflow": self._format_money(outflow),
            "ratio": f"{ratio:.1f}",
            "recommendation": self._get_recommendation(ratio)
        }
        
        return self.send_alimtalk(
            phone_number,
            self.TEMPLATES["bottleneck"].template_code,
            variables,
            self.TEMPLATES["bottleneck"].buttons
        )
    
    def send_weekly_report(
        self,
        phone_number: str,
        report: Dict[str, Any]
    ) -> bool:
        """
        주간 리포트 알림 발송
        """
        variables = {
            "week_id": report.get("week_id", ""),
            "total_value": self._format_money(report.get("total_value", 0)),
            "change": f"{report.get('value_change', 0):+.1f}",
            "synergy": self._format_money(report.get("total_synergy", 0)),
            "summary": report.get("summary", "")[:100]  # 100자 제한
        }
        
        return self.send_alimtalk(
            phone_number,
            self.TEMPLATES["weekly_report"].template_code,
            variables,
            self.TEMPLATES["weekly_report"].buttons
        )
    
    def send_milestone(
        self,
        phone_number: str,
        milestone_type: str,
        message: str,
        value: float
    ) -> bool:
        """
        마일스톤 달성 알림 발송
        """
        variables = {
            "milestone_type": milestone_type,
            "message": message,
            "value": self._format_money(value)
        }
        
        return self.send_alimtalk(
            phone_number,
            self.TEMPLATES["milestone"].template_code,
            variables,
            self.TEMPLATES["milestone"].buttons
        )
    
    def send_prediction(
        self,
        phone_number: str,
        prediction: Dict[str, Any]
    ) -> bool:
        """
        예측 알림 발송
        """
        pred_type = "기회" if prediction.get("type") == "opportunity" else "위험"
        action = "지금 확인하세요!" if prediction.get("type") == "opportunity" else "주의가 필요합니다."
        
        variables = {
            "prediction_type": pred_type,
            "target": prediction.get("target", ""),
            "current_value": self._format_money(prediction.get("current_value", 0)),
            "predicted_value": self._format_money(prediction.get("predicted_value", 0)),
            "confidence": str(prediction.get("confidence", 0)),
            "action_message": action
        }
        
        return self.send_alimtalk(
            phone_number,
            self.TEMPLATES["prediction"].template_code,
            variables,
            self.TEMPLATES["prediction"].buttons
        )
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════
    
    def _format_money(self, value: float) -> str:
        """금액 포맷팅"""
        if abs(value) >= 100000000:
            return f"₩{value/100000000:.2f}억"
        elif abs(value) >= 10000:
            return f"₩{value/10000:,.0f}만"
        else:
            return f"₩{value:,.0f}"
    
    def _get_recommendation(self, outflow_ratio: float) -> str:
        """유출 비율에 따른 권장 조치"""
        if outflow_ratio > 50:
            return "🔴 긴급: 즉시 비용 절감 필요"
        elif outflow_ratio > 30:
            return "🟡 주의: 유입 경로 다각화 검토"
        else:
            return "🟢 모니터링: 지속 관찰"


# ═══════════════════════════════════════════════════════════════════════════════
# 카카오 비즈니스 직접 연동 (고급)
# ═══════════════════════════════════════════════════════════════════════════════

class KakaoBusinessAPI:
    """
    카카오 비즈니스 직접 연동 클라이언트
    
    주의: 사업자등록 및 템플릿 검수 필요
    """
    
    def __init__(
        self,
        app_key: str = None,
        sender_key: str = None
    ):
        self.app_key = app_key or os.getenv("KAKAO_APP_KEY")
        self.sender_key = sender_key or os.getenv("KAKAO_SENDER_KEY")
        self.base_url = "https://kapi.kakao.com"
    
    def get_token(self, code: str) -> Optional[str]:
        """OAuth 토큰 획득"""
        # 카카오 OAuth 플로우 구현
        pass
    
    def send_alimtalk(self, phone: str, template_code: str, variables: Dict) -> bool:
        """알림톡 발송"""
        # 카카오 비즈메시지 API 호출
        pass


# ═══════════════════════════════════════════════════════════════════════════════
# 사용 예제
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 클라이언트 초기화
    kakao = KakaoAlimtalk(platform="solapi")
    
    # 테스트 전화번호 (실제 번호로 변경)
    TEST_PHONE = "01012345678"
    
    # 병목 알림 예제
    bottleneck_node = {
        "id": "파트너A",
        "name": "미국 파트너",
        "location": "New York, USA",
        "inflow": 45000000,
        "outflow": 15000000,
        "status": "bottleneck"
    }
    
    # kakao.send_bottleneck_alert(TEST_PHONE, bottleneck_node)
    
    # 주간 리포트 예제
    weekly = {
        "week_id": "2025-W01",
        "total_value": 709000000,
        "value_change": 15.2,
        "total_synergy": 22810000,
        "summary": "총 가치 7억 돌파! 시너지 지속 성장 중"
    }
    
    # kakao.send_weekly_report(TEST_PHONE, weekly)
    
    # 마일스톤 알림 예제
    # kakao.send_milestone(TEST_PHONE, "총 가치", "7억 돌파!", 709000000)
    
    print("\n📋 카카오톡 알림톡 설정 가이드:")
    print("\n[간편 설정: Solapi 사용]")
    print("1. https://solapi.com 가입")
    print("2. 카카오 채널 연동 (채널 관리 → 카카오톡 채널 연동)")
    print("3. 발신 프로필 등록")
    print("4. 템플릿 등록:")
    print("   - AUTUS_BOTTLENECK_001: 병목 감지")
    print("   - AUTUS_WEEKLY_001: 주간 리포트")
    print("   - AUTUS_MILESTONE_001: 마일스톤")
    print("   - AUTUS_PREDICTION_001: 예측 알림")
    print("5. API 키 발급 (대시보드 → 개발/연동)")
    print("6. 환경변수 설정:")
    print('   export ALIMTALK_API_KEY="your-api-key"')
    print('   export ALIMTALK_API_SECRET="your-api-secret"')
    print('   export ALIMTALK_SENDER_KEY="your-sender-key"')
    
    print("\n💡 Tip: Solapi는 월 50건 무료!")
    print("💰 예상 비용: 알림톡 1건당 약 8원")





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  💬 AUTUS Physics Map - 카카오톡 알림톡 연동                                  ║
║                                                                               ║
║  기능:                                                                        ║
║  - Physics Map 알림 → 카카오톡 알림톡 발송                                    ║
║  - 병목 감지 시 즉시 알림                                                     ║
║  - 주간 리포트 발송                                                           ║
║  - 마일스톤 달성 알림                                                         ║
║                                                                               ║
║  설정 방법:                                                                   ║
║  1. 카카오 비즈니스 (business.kakao.com) 가입                                 ║
║  2. 채널 생성 → 알림톡 템플릿 등록                                            ║
║  3. API 키 발급                                                               ║
║  4. 또는 NHN Cloud / Solapi 등 알림톡 대행사 사용                             ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import requests
from datetime import datetime
from typing import Dict, Any, List, Optional
from dataclasses import dataclass


@dataclass
class AlimtalkTemplate:
    """알림톡 템플릿"""
    template_code: str
    name: str
    content: str
    buttons: List[Dict] = None


class KakaoAlimtalk:
    """
    카카오톡 알림톡 클라이언트
    
    지원 플랫폼:
    - 카카오 비즈니스 직접 연동
    - NHN Cloud 알림톡
    - Solapi
    - 비즈엠
    """
    
    # 알림톡 템플릿 정의
    TEMPLATES = {
        "bottleneck": AlimtalkTemplate(
            template_code="AUTUS_BOTTLENECK_001",
            name="병목 감지 알림",
            content="""⚠️ AUTUS 병목 감지

#{name}님의 돈 흐름에서 병목이 감지되었습니다.

📍 위치: #{location}
💰 유입: #{inflow}
🔴 유출: #{outflow}
📊 유출비율: #{ratio}%

💡 권장 조치:
#{recommendation}

확인하기 👉""",
            buttons=[{"type": "WL", "name": "대시보드 확인", "url": "https://autus.app/dashboard"}]
        ),
        "weekly_report": AlimtalkTemplate(
            template_code="AUTUS_WEEKLY_001",
            name="주간 리포트",
            content="""📊 AUTUS 주간 리포트

#{week_id} 리포트가 준비되었습니다.

💰 총 가치: #{total_value}
📈 변동: #{change}%
✨ 시너지: #{synergy}

🎯 이번 주 핵심:
#{summary}

자세히 보기 👉""",
            buttons=[{"type": "WL", "name": "리포트 확인", "url": "https://autus.app/report"}]
        ),
        "milestone": AlimtalkTemplate(
            template_code="AUTUS_MILESTONE_001",
            name="마일스톤 달성",
            content="""🎉 축하합니다!

#{milestone_type} 마일스톤을 달성했습니다!

🏆 달성: #{message}
💰 현재 가치: #{value}

계속해서 성장하세요! 🚀""",
            buttons=[{"type": "WL", "name": "성과 확인", "url": "https://autus.app/milestone"}]
        ),
        "prediction": AlimtalkTemplate(
            template_code="AUTUS_PREDICTION_001",
            name="예측 알림",
            content="""🔮 AUTUS 예측 알림

#{prediction_type} 예측이 있습니다.

🎯 대상: #{target}
📊 현재: #{current_value}
📈 예측: #{predicted_value}
🎲 신뢰도: #{confidence}%

#{action_message}

확인하기 👉""",
            buttons=[{"type": "WL", "name": "상세 보기", "url": "https://autus.app/prediction"}]
        )
    }
    
    def __init__(
        self,
        platform: str = "solapi",
        api_key: str = None,
        api_secret: str = None,
        sender_key: str = None
    ):
        """
        알림톡 클라이언트 초기화
        
        Args:
            platform: 사용 플랫폼 ("kakao", "nhn", "solapi", "bizm")
            api_key: API 키
            api_secret: API Secret
            sender_key: 발신 프로필 키
        """
        self.platform = platform
        self.api_key = api_key or os.getenv("ALIMTALK_API_KEY")
        self.api_secret = api_secret or os.getenv("ALIMTALK_API_SECRET")
        self.sender_key = sender_key or os.getenv("ALIMTALK_SENDER_KEY")
        
        # 플랫폼별 엔드포인트
        self.endpoints = {
            "solapi": "https://api.solapi.com/messages/v4/send",
            "nhn": "https://api-alimtalk.cloud.toast.com/alimtalk/v2.0/appkeys/{appkey}/messages",
            "bizm": "https://alimtalk-api.bizm.co.kr/v2/sender/send"
        }
        
        if not all([self.api_key, self.sender_key]):
            print("⚠️ 알림톡 API 설정 필요")
            self._print_setup_guide()
    
    def _print_setup_guide(self):
        """설정 가이드 출력"""
        print("\n📋 알림톡 설정 가이드:")
        print("\n[Option 1: Solapi (추천 - 간편)]")
        print("1. solapi.com 가입")
        print("2. 카카오 채널 연동")
        print("3. API 키 발급")
        print("4. 환경변수 설정:")
        print('   export ALIMTALK_API_KEY="your-api-key"')
        print('   export ALIMTALK_API_SECRET="your-api-secret"')
        print('   export ALIMTALK_SENDER_KEY="your-sender-key"')
        
        print("\n[Option 2: 카카오 비즈니스 직접 연동]")
        print("1. business.kakao.com 가입")
        print("2. 카카오톡 채널 생성")
        print("3. 알림톡 발신 프로필 신청")
        print("4. 템플릿 등록 및 검수")
        print("5. API 연동")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 알림톡 발송 (Solapi 기준)
    # ═══════════════════════════════════════════════════════════════════════════
    
    def send_alimtalk(
        self,
        phone_number: str,
        template_code: str,
        variables: Dict[str, str],
        buttons: List[Dict] = None
    ) -> bool:
        """
        알림톡 발송 (Solapi)
        
        Args:
            phone_number: 수신자 전화번호 (01012345678)
            template_code: 템플릿 코드
            variables: 템플릿 변수 (#{name} → variables["name"])
            buttons: 버튼 목록
        
        Returns:
            발송 성공 여부
        """
        if not self.api_key:
            print("❌ API 키 설정 필요")
            return False
        
        try:
            # Solapi 형식
            payload = {
                "message": {
                    "to": phone_number,
                    "from": self.sender_key,
                    "kakaoOptions": {
                        "pfId": self.sender_key,
                        "templateId": template_code,
                        "variables": variables
                    }
                }
            }
            
            if buttons:
                payload["message"]["kakaoOptions"]["buttons"] = buttons
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            response = requests.post(
                self.endpoints.get(self.platform, self.endpoints["solapi"]),
                json=payload,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                print(f"✅ 알림톡 발송 성공: {phone_number}")
                return True
            else:
                print(f"❌ 알림톡 발송 실패: {response.status_code}")
                print(response.text)
                return False
                
        except Exception as e:
            print(f"❌ 알림톡 오류: {e}")
            return False
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Physics Map 알림 전송
    # ═══════════════════════════════════════════════════════════════════════════
    
    def send_bottleneck_alert(
        self,
        phone_number: str,
        node: Dict[str, Any]
    ) -> bool:
        """
        병목 감지 알림 발송
        """
        inflow = node.get("inflow", 0)
        outflow = node.get("outflow", 0)
        ratio = (outflow / inflow * 100) if inflow > 0 else 0
        
        variables = {
            "name": node.get("name", node.get("id", "Unknown")),
            "location": node.get("location", "-"),
            "inflow": self._format_money(inflow),
            "outflow": self._format_money(outflow),
            "ratio": f"{ratio:.1f}",
            "recommendation": self._get_recommendation(ratio)
        }
        
        return self.send_alimtalk(
            phone_number,
            self.TEMPLATES["bottleneck"].template_code,
            variables,
            self.TEMPLATES["bottleneck"].buttons
        )
    
    def send_weekly_report(
        self,
        phone_number: str,
        report: Dict[str, Any]
    ) -> bool:
        """
        주간 리포트 알림 발송
        """
        variables = {
            "week_id": report.get("week_id", ""),
            "total_value": self._format_money(report.get("total_value", 0)),
            "change": f"{report.get('value_change', 0):+.1f}",
            "synergy": self._format_money(report.get("total_synergy", 0)),
            "summary": report.get("summary", "")[:100]  # 100자 제한
        }
        
        return self.send_alimtalk(
            phone_number,
            self.TEMPLATES["weekly_report"].template_code,
            variables,
            self.TEMPLATES["weekly_report"].buttons
        )
    
    def send_milestone(
        self,
        phone_number: str,
        milestone_type: str,
        message: str,
        value: float
    ) -> bool:
        """
        마일스톤 달성 알림 발송
        """
        variables = {
            "milestone_type": milestone_type,
            "message": message,
            "value": self._format_money(value)
        }
        
        return self.send_alimtalk(
            phone_number,
            self.TEMPLATES["milestone"].template_code,
            variables,
            self.TEMPLATES["milestone"].buttons
        )
    
    def send_prediction(
        self,
        phone_number: str,
        prediction: Dict[str, Any]
    ) -> bool:
        """
        예측 알림 발송
        """
        pred_type = "기회" if prediction.get("type") == "opportunity" else "위험"
        action = "지금 확인하세요!" if prediction.get("type") == "opportunity" else "주의가 필요합니다."
        
        variables = {
            "prediction_type": pred_type,
            "target": prediction.get("target", ""),
            "current_value": self._format_money(prediction.get("current_value", 0)),
            "predicted_value": self._format_money(prediction.get("predicted_value", 0)),
            "confidence": str(prediction.get("confidence", 0)),
            "action_message": action
        }
        
        return self.send_alimtalk(
            phone_number,
            self.TEMPLATES["prediction"].template_code,
            variables,
            self.TEMPLATES["prediction"].buttons
        )
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════
    
    def _format_money(self, value: float) -> str:
        """금액 포맷팅"""
        if abs(value) >= 100000000:
            return f"₩{value/100000000:.2f}억"
        elif abs(value) >= 10000:
            return f"₩{value/10000:,.0f}만"
        else:
            return f"₩{value:,.0f}"
    
    def _get_recommendation(self, outflow_ratio: float) -> str:
        """유출 비율에 따른 권장 조치"""
        if outflow_ratio > 50:
            return "🔴 긴급: 즉시 비용 절감 필요"
        elif outflow_ratio > 30:
            return "🟡 주의: 유입 경로 다각화 검토"
        else:
            return "🟢 모니터링: 지속 관찰"


# ═══════════════════════════════════════════════════════════════════════════════
# 카카오 비즈니스 직접 연동 (고급)
# ═══════════════════════════════════════════════════════════════════════════════

class KakaoBusinessAPI:
    """
    카카오 비즈니스 직접 연동 클라이언트
    
    주의: 사업자등록 및 템플릿 검수 필요
    """
    
    def __init__(
        self,
        app_key: str = None,
        sender_key: str = None
    ):
        self.app_key = app_key or os.getenv("KAKAO_APP_KEY")
        self.sender_key = sender_key or os.getenv("KAKAO_SENDER_KEY")
        self.base_url = "https://kapi.kakao.com"
    
    def get_token(self, code: str) -> Optional[str]:
        """OAuth 토큰 획득"""
        # 카카오 OAuth 플로우 구현
        pass
    
    def send_alimtalk(self, phone: str, template_code: str, variables: Dict) -> bool:
        """알림톡 발송"""
        # 카카오 비즈메시지 API 호출
        pass


# ═══════════════════════════════════════════════════════════════════════════════
# 사용 예제
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 클라이언트 초기화
    kakao = KakaoAlimtalk(platform="solapi")
    
    # 테스트 전화번호 (실제 번호로 변경)
    TEST_PHONE = "01012345678"
    
    # 병목 알림 예제
    bottleneck_node = {
        "id": "파트너A",
        "name": "미국 파트너",
        "location": "New York, USA",
        "inflow": 45000000,
        "outflow": 15000000,
        "status": "bottleneck"
    }
    
    # kakao.send_bottleneck_alert(TEST_PHONE, bottleneck_node)
    
    # 주간 리포트 예제
    weekly = {
        "week_id": "2025-W01",
        "total_value": 709000000,
        "value_change": 15.2,
        "total_synergy": 22810000,
        "summary": "총 가치 7억 돌파! 시너지 지속 성장 중"
    }
    
    # kakao.send_weekly_report(TEST_PHONE, weekly)
    
    # 마일스톤 알림 예제
    # kakao.send_milestone(TEST_PHONE, "총 가치", "7억 돌파!", 709000000)
    
    print("\n📋 카카오톡 알림톡 설정 가이드:")
    print("\n[간편 설정: Solapi 사용]")
    print("1. https://solapi.com 가입")
    print("2. 카카오 채널 연동 (채널 관리 → 카카오톡 채널 연동)")
    print("3. 발신 프로필 등록")
    print("4. 템플릿 등록:")
    print("   - AUTUS_BOTTLENECK_001: 병목 감지")
    print("   - AUTUS_WEEKLY_001: 주간 리포트")
    print("   - AUTUS_MILESTONE_001: 마일스톤")
    print("   - AUTUS_PREDICTION_001: 예측 알림")
    print("5. API 키 발급 (대시보드 → 개발/연동)")
    print("6. 환경변수 설정:")
    print('   export ALIMTALK_API_KEY="your-api-key"')
    print('   export ALIMTALK_API_SECRET="your-api-secret"')
    print('   export ALIMTALK_SENDER_KEY="your-sender-key"')
    
    print("\n💡 Tip: Solapi는 월 50건 무료!")
    print("💰 예상 비용: 알림톡 1건당 약 8원")





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  💬 AUTUS Physics Map - 카카오톡 알림톡 연동                                  ║
║                                                                               ║
║  기능:                                                                        ║
║  - Physics Map 알림 → 카카오톡 알림톡 발송                                    ║
║  - 병목 감지 시 즉시 알림                                                     ║
║  - 주간 리포트 발송                                                           ║
║  - 마일스톤 달성 알림                                                         ║
║                                                                               ║
║  설정 방법:                                                                   ║
║  1. 카카오 비즈니스 (business.kakao.com) 가입                                 ║
║  2. 채널 생성 → 알림톡 템플릿 등록                                            ║
║  3. API 키 발급                                                               ║
║  4. 또는 NHN Cloud / Solapi 등 알림톡 대행사 사용                             ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import requests
from datetime import datetime
from typing import Dict, Any, List, Optional
from dataclasses import dataclass


@dataclass
class AlimtalkTemplate:
    """알림톡 템플릿"""
    template_code: str
    name: str
    content: str
    buttons: List[Dict] = None


class KakaoAlimtalk:
    """
    카카오톡 알림톡 클라이언트
    
    지원 플랫폼:
    - 카카오 비즈니스 직접 연동
    - NHN Cloud 알림톡
    - Solapi
    - 비즈엠
    """
    
    # 알림톡 템플릿 정의
    TEMPLATES = {
        "bottleneck": AlimtalkTemplate(
            template_code="AUTUS_BOTTLENECK_001",
            name="병목 감지 알림",
            content="""⚠️ AUTUS 병목 감지

#{name}님의 돈 흐름에서 병목이 감지되었습니다.

📍 위치: #{location}
💰 유입: #{inflow}
🔴 유출: #{outflow}
📊 유출비율: #{ratio}%

💡 권장 조치:
#{recommendation}

확인하기 👉""",
            buttons=[{"type": "WL", "name": "대시보드 확인", "url": "https://autus.app/dashboard"}]
        ),
        "weekly_report": AlimtalkTemplate(
            template_code="AUTUS_WEEKLY_001",
            name="주간 리포트",
            content="""📊 AUTUS 주간 리포트

#{week_id} 리포트가 준비되었습니다.

💰 총 가치: #{total_value}
📈 변동: #{change}%
✨ 시너지: #{synergy}

🎯 이번 주 핵심:
#{summary}

자세히 보기 👉""",
            buttons=[{"type": "WL", "name": "리포트 확인", "url": "https://autus.app/report"}]
        ),
        "milestone": AlimtalkTemplate(
            template_code="AUTUS_MILESTONE_001",
            name="마일스톤 달성",
            content="""🎉 축하합니다!

#{milestone_type} 마일스톤을 달성했습니다!

🏆 달성: #{message}
💰 현재 가치: #{value}

계속해서 성장하세요! 🚀""",
            buttons=[{"type": "WL", "name": "성과 확인", "url": "https://autus.app/milestone"}]
        ),
        "prediction": AlimtalkTemplate(
            template_code="AUTUS_PREDICTION_001",
            name="예측 알림",
            content="""🔮 AUTUS 예측 알림

#{prediction_type} 예측이 있습니다.

🎯 대상: #{target}
📊 현재: #{current_value}
📈 예측: #{predicted_value}
🎲 신뢰도: #{confidence}%

#{action_message}

확인하기 👉""",
            buttons=[{"type": "WL", "name": "상세 보기", "url": "https://autus.app/prediction"}]
        )
    }
    
    def __init__(
        self,
        platform: str = "solapi",
        api_key: str = None,
        api_secret: str = None,
        sender_key: str = None
    ):
        """
        알림톡 클라이언트 초기화
        
        Args:
            platform: 사용 플랫폼 ("kakao", "nhn", "solapi", "bizm")
            api_key: API 키
            api_secret: API Secret
            sender_key: 발신 프로필 키
        """
        self.platform = platform
        self.api_key = api_key or os.getenv("ALIMTALK_API_KEY")
        self.api_secret = api_secret or os.getenv("ALIMTALK_API_SECRET")
        self.sender_key = sender_key or os.getenv("ALIMTALK_SENDER_KEY")
        
        # 플랫폼별 엔드포인트
        self.endpoints = {
            "solapi": "https://api.solapi.com/messages/v4/send",
            "nhn": "https://api-alimtalk.cloud.toast.com/alimtalk/v2.0/appkeys/{appkey}/messages",
            "bizm": "https://alimtalk-api.bizm.co.kr/v2/sender/send"
        }
        
        if not all([self.api_key, self.sender_key]):
            print("⚠️ 알림톡 API 설정 필요")
            self._print_setup_guide()
    
    def _print_setup_guide(self):
        """설정 가이드 출력"""
        print("\n📋 알림톡 설정 가이드:")
        print("\n[Option 1: Solapi (추천 - 간편)]")
        print("1. solapi.com 가입")
        print("2. 카카오 채널 연동")
        print("3. API 키 발급")
        print("4. 환경변수 설정:")
        print('   export ALIMTALK_API_KEY="your-api-key"')
        print('   export ALIMTALK_API_SECRET="your-api-secret"')
        print('   export ALIMTALK_SENDER_KEY="your-sender-key"')
        
        print("\n[Option 2: 카카오 비즈니스 직접 연동]")
        print("1. business.kakao.com 가입")
        print("2. 카카오톡 채널 생성")
        print("3. 알림톡 발신 프로필 신청")
        print("4. 템플릿 등록 및 검수")
        print("5. API 연동")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 알림톡 발송 (Solapi 기준)
    # ═══════════════════════════════════════════════════════════════════════════
    
    def send_alimtalk(
        self,
        phone_number: str,
        template_code: str,
        variables: Dict[str, str],
        buttons: List[Dict] = None
    ) -> bool:
        """
        알림톡 발송 (Solapi)
        
        Args:
            phone_number: 수신자 전화번호 (01012345678)
            template_code: 템플릿 코드
            variables: 템플릿 변수 (#{name} → variables["name"])
            buttons: 버튼 목록
        
        Returns:
            발송 성공 여부
        """
        if not self.api_key:
            print("❌ API 키 설정 필요")
            return False
        
        try:
            # Solapi 형식
            payload = {
                "message": {
                    "to": phone_number,
                    "from": self.sender_key,
                    "kakaoOptions": {
                        "pfId": self.sender_key,
                        "templateId": template_code,
                        "variables": variables
                    }
                }
            }
            
            if buttons:
                payload["message"]["kakaoOptions"]["buttons"] = buttons
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            response = requests.post(
                self.endpoints.get(self.platform, self.endpoints["solapi"]),
                json=payload,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                print(f"✅ 알림톡 발송 성공: {phone_number}")
                return True
            else:
                print(f"❌ 알림톡 발송 실패: {response.status_code}")
                print(response.text)
                return False
                
        except Exception as e:
            print(f"❌ 알림톡 오류: {e}")
            return False
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Physics Map 알림 전송
    # ═══════════════════════════════════════════════════════════════════════════
    
    def send_bottleneck_alert(
        self,
        phone_number: str,
        node: Dict[str, Any]
    ) -> bool:
        """
        병목 감지 알림 발송
        """
        inflow = node.get("inflow", 0)
        outflow = node.get("outflow", 0)
        ratio = (outflow / inflow * 100) if inflow > 0 else 0
        
        variables = {
            "name": node.get("name", node.get("id", "Unknown")),
            "location": node.get("location", "-"),
            "inflow": self._format_money(inflow),
            "outflow": self._format_money(outflow),
            "ratio": f"{ratio:.1f}",
            "recommendation": self._get_recommendation(ratio)
        }
        
        return self.send_alimtalk(
            phone_number,
            self.TEMPLATES["bottleneck"].template_code,
            variables,
            self.TEMPLATES["bottleneck"].buttons
        )
    
    def send_weekly_report(
        self,
        phone_number: str,
        report: Dict[str, Any]
    ) -> bool:
        """
        주간 리포트 알림 발송
        """
        variables = {
            "week_id": report.get("week_id", ""),
            "total_value": self._format_money(report.get("total_value", 0)),
            "change": f"{report.get('value_change', 0):+.1f}",
            "synergy": self._format_money(report.get("total_synergy", 0)),
            "summary": report.get("summary", "")[:100]  # 100자 제한
        }
        
        return self.send_alimtalk(
            phone_number,
            self.TEMPLATES["weekly_report"].template_code,
            variables,
            self.TEMPLATES["weekly_report"].buttons
        )
    
    def send_milestone(
        self,
        phone_number: str,
        milestone_type: str,
        message: str,
        value: float
    ) -> bool:
        """
        마일스톤 달성 알림 발송
        """
        variables = {
            "milestone_type": milestone_type,
            "message": message,
            "value": self._format_money(value)
        }
        
        return self.send_alimtalk(
            phone_number,
            self.TEMPLATES["milestone"].template_code,
            variables,
            self.TEMPLATES["milestone"].buttons
        )
    
    def send_prediction(
        self,
        phone_number: str,
        prediction: Dict[str, Any]
    ) -> bool:
        """
        예측 알림 발송
        """
        pred_type = "기회" if prediction.get("type") == "opportunity" else "위험"
        action = "지금 확인하세요!" if prediction.get("type") == "opportunity" else "주의가 필요합니다."
        
        variables = {
            "prediction_type": pred_type,
            "target": prediction.get("target", ""),
            "current_value": self._format_money(prediction.get("current_value", 0)),
            "predicted_value": self._format_money(prediction.get("predicted_value", 0)),
            "confidence": str(prediction.get("confidence", 0)),
            "action_message": action
        }
        
        return self.send_alimtalk(
            phone_number,
            self.TEMPLATES["prediction"].template_code,
            variables,
            self.TEMPLATES["prediction"].buttons
        )
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════
    
    def _format_money(self, value: float) -> str:
        """금액 포맷팅"""
        if abs(value) >= 100000000:
            return f"₩{value/100000000:.2f}억"
        elif abs(value) >= 10000:
            return f"₩{value/10000:,.0f}만"
        else:
            return f"₩{value:,.0f}"
    
    def _get_recommendation(self, outflow_ratio: float) -> str:
        """유출 비율에 따른 권장 조치"""
        if outflow_ratio > 50:
            return "🔴 긴급: 즉시 비용 절감 필요"
        elif outflow_ratio > 30:
            return "🟡 주의: 유입 경로 다각화 검토"
        else:
            return "🟢 모니터링: 지속 관찰"


# ═══════════════════════════════════════════════════════════════════════════════
# 카카오 비즈니스 직접 연동 (고급)
# ═══════════════════════════════════════════════════════════════════════════════

class KakaoBusinessAPI:
    """
    카카오 비즈니스 직접 연동 클라이언트
    
    주의: 사업자등록 및 템플릿 검수 필요
    """
    
    def __init__(
        self,
        app_key: str = None,
        sender_key: str = None
    ):
        self.app_key = app_key or os.getenv("KAKAO_APP_KEY")
        self.sender_key = sender_key or os.getenv("KAKAO_SENDER_KEY")
        self.base_url = "https://kapi.kakao.com"
    
    def get_token(self, code: str) -> Optional[str]:
        """OAuth 토큰 획득"""
        # 카카오 OAuth 플로우 구현
        pass
    
    def send_alimtalk(self, phone: str, template_code: str, variables: Dict) -> bool:
        """알림톡 발송"""
        # 카카오 비즈메시지 API 호출
        pass


# ═══════════════════════════════════════════════════════════════════════════════
# 사용 예제
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 클라이언트 초기화
    kakao = KakaoAlimtalk(platform="solapi")
    
    # 테스트 전화번호 (실제 번호로 변경)
    TEST_PHONE = "01012345678"
    
    # 병목 알림 예제
    bottleneck_node = {
        "id": "파트너A",
        "name": "미국 파트너",
        "location": "New York, USA",
        "inflow": 45000000,
        "outflow": 15000000,
        "status": "bottleneck"
    }
    
    # kakao.send_bottleneck_alert(TEST_PHONE, bottleneck_node)
    
    # 주간 리포트 예제
    weekly = {
        "week_id": "2025-W01",
        "total_value": 709000000,
        "value_change": 15.2,
        "total_synergy": 22810000,
        "summary": "총 가치 7억 돌파! 시너지 지속 성장 중"
    }
    
    # kakao.send_weekly_report(TEST_PHONE, weekly)
    
    # 마일스톤 알림 예제
    # kakao.send_milestone(TEST_PHONE, "총 가치", "7억 돌파!", 709000000)
    
    print("\n📋 카카오톡 알림톡 설정 가이드:")
    print("\n[간편 설정: Solapi 사용]")
    print("1. https://solapi.com 가입")
    print("2. 카카오 채널 연동 (채널 관리 → 카카오톡 채널 연동)")
    print("3. 발신 프로필 등록")
    print("4. 템플릿 등록:")
    print("   - AUTUS_BOTTLENECK_001: 병목 감지")
    print("   - AUTUS_WEEKLY_001: 주간 리포트")
    print("   - AUTUS_MILESTONE_001: 마일스톤")
    print("   - AUTUS_PREDICTION_001: 예측 알림")
    print("5. API 키 발급 (대시보드 → 개발/연동)")
    print("6. 환경변수 설정:")
    print('   export ALIMTALK_API_KEY="your-api-key"')
    print('   export ALIMTALK_API_SECRET="your-api-secret"')
    print('   export ALIMTALK_SENDER_KEY="your-sender-key"')
    
    print("\n💡 Tip: Solapi는 월 50건 무료!")
    print("💰 예상 비용: 알림톡 1건당 약 8원")





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  💬 AUTUS Physics Map - 카카오톡 알림톡 연동                                  ║
║                                                                               ║
║  기능:                                                                        ║
║  - Physics Map 알림 → 카카오톡 알림톡 발송                                    ║
║  - 병목 감지 시 즉시 알림                                                     ║
║  - 주간 리포트 발송                                                           ║
║  - 마일스톤 달성 알림                                                         ║
║                                                                               ║
║  설정 방법:                                                                   ║
║  1. 카카오 비즈니스 (business.kakao.com) 가입                                 ║
║  2. 채널 생성 → 알림톡 템플릿 등록                                            ║
║  3. API 키 발급                                                               ║
║  4. 또는 NHN Cloud / Solapi 등 알림톡 대행사 사용                             ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import requests
from datetime import datetime
from typing import Dict, Any, List, Optional
from dataclasses import dataclass


@dataclass
class AlimtalkTemplate:
    """알림톡 템플릿"""
    template_code: str
    name: str
    content: str
    buttons: List[Dict] = None


class KakaoAlimtalk:
    """
    카카오톡 알림톡 클라이언트
    
    지원 플랫폼:
    - 카카오 비즈니스 직접 연동
    - NHN Cloud 알림톡
    - Solapi
    - 비즈엠
    """
    
    # 알림톡 템플릿 정의
    TEMPLATES = {
        "bottleneck": AlimtalkTemplate(
            template_code="AUTUS_BOTTLENECK_001",
            name="병목 감지 알림",
            content="""⚠️ AUTUS 병목 감지

#{name}님의 돈 흐름에서 병목이 감지되었습니다.

📍 위치: #{location}
💰 유입: #{inflow}
🔴 유출: #{outflow}
📊 유출비율: #{ratio}%

💡 권장 조치:
#{recommendation}

확인하기 👉""",
            buttons=[{"type": "WL", "name": "대시보드 확인", "url": "https://autus.app/dashboard"}]
        ),
        "weekly_report": AlimtalkTemplate(
            template_code="AUTUS_WEEKLY_001",
            name="주간 리포트",
            content="""📊 AUTUS 주간 리포트

#{week_id} 리포트가 준비되었습니다.

💰 총 가치: #{total_value}
📈 변동: #{change}%
✨ 시너지: #{synergy}

🎯 이번 주 핵심:
#{summary}

자세히 보기 👉""",
            buttons=[{"type": "WL", "name": "리포트 확인", "url": "https://autus.app/report"}]
        ),
        "milestone": AlimtalkTemplate(
            template_code="AUTUS_MILESTONE_001",
            name="마일스톤 달성",
            content="""🎉 축하합니다!

#{milestone_type} 마일스톤을 달성했습니다!

🏆 달성: #{message}
💰 현재 가치: #{value}

계속해서 성장하세요! 🚀""",
            buttons=[{"type": "WL", "name": "성과 확인", "url": "https://autus.app/milestone"}]
        ),
        "prediction": AlimtalkTemplate(
            template_code="AUTUS_PREDICTION_001",
            name="예측 알림",
            content="""🔮 AUTUS 예측 알림

#{prediction_type} 예측이 있습니다.

🎯 대상: #{target}
📊 현재: #{current_value}
📈 예측: #{predicted_value}
🎲 신뢰도: #{confidence}%

#{action_message}

확인하기 👉""",
            buttons=[{"type": "WL", "name": "상세 보기", "url": "https://autus.app/prediction"}]
        )
    }
    
    def __init__(
        self,
        platform: str = "solapi",
        api_key: str = None,
        api_secret: str = None,
        sender_key: str = None
    ):
        """
        알림톡 클라이언트 초기화
        
        Args:
            platform: 사용 플랫폼 ("kakao", "nhn", "solapi", "bizm")
            api_key: API 키
            api_secret: API Secret
            sender_key: 발신 프로필 키
        """
        self.platform = platform
        self.api_key = api_key or os.getenv("ALIMTALK_API_KEY")
        self.api_secret = api_secret or os.getenv("ALIMTALK_API_SECRET")
        self.sender_key = sender_key or os.getenv("ALIMTALK_SENDER_KEY")
        
        # 플랫폼별 엔드포인트
        self.endpoints = {
            "solapi": "https://api.solapi.com/messages/v4/send",
            "nhn": "https://api-alimtalk.cloud.toast.com/alimtalk/v2.0/appkeys/{appkey}/messages",
            "bizm": "https://alimtalk-api.bizm.co.kr/v2/sender/send"
        }
        
        if not all([self.api_key, self.sender_key]):
            print("⚠️ 알림톡 API 설정 필요")
            self._print_setup_guide()
    
    def _print_setup_guide(self):
        """설정 가이드 출력"""
        print("\n📋 알림톡 설정 가이드:")
        print("\n[Option 1: Solapi (추천 - 간편)]")
        print("1. solapi.com 가입")
        print("2. 카카오 채널 연동")
        print("3. API 키 발급")
        print("4. 환경변수 설정:")
        print('   export ALIMTALK_API_KEY="your-api-key"')
        print('   export ALIMTALK_API_SECRET="your-api-secret"')
        print('   export ALIMTALK_SENDER_KEY="your-sender-key"')
        
        print("\n[Option 2: 카카오 비즈니스 직접 연동]")
        print("1. business.kakao.com 가입")
        print("2. 카카오톡 채널 생성")
        print("3. 알림톡 발신 프로필 신청")
        print("4. 템플릿 등록 및 검수")
        print("5. API 연동")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 알림톡 발송 (Solapi 기준)
    # ═══════════════════════════════════════════════════════════════════════════
    
    def send_alimtalk(
        self,
        phone_number: str,
        template_code: str,
        variables: Dict[str, str],
        buttons: List[Dict] = None
    ) -> bool:
        """
        알림톡 발송 (Solapi)
        
        Args:
            phone_number: 수신자 전화번호 (01012345678)
            template_code: 템플릿 코드
            variables: 템플릿 변수 (#{name} → variables["name"])
            buttons: 버튼 목록
        
        Returns:
            발송 성공 여부
        """
        if not self.api_key:
            print("❌ API 키 설정 필요")
            return False
        
        try:
            # Solapi 형식
            payload = {
                "message": {
                    "to": phone_number,
                    "from": self.sender_key,
                    "kakaoOptions": {
                        "pfId": self.sender_key,
                        "templateId": template_code,
                        "variables": variables
                    }
                }
            }
            
            if buttons:
                payload["message"]["kakaoOptions"]["buttons"] = buttons
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            response = requests.post(
                self.endpoints.get(self.platform, self.endpoints["solapi"]),
                json=payload,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                print(f"✅ 알림톡 발송 성공: {phone_number}")
                return True
            else:
                print(f"❌ 알림톡 발송 실패: {response.status_code}")
                print(response.text)
                return False
                
        except Exception as e:
            print(f"❌ 알림톡 오류: {e}")
            return False
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Physics Map 알림 전송
    # ═══════════════════════════════════════════════════════════════════════════
    
    def send_bottleneck_alert(
        self,
        phone_number: str,
        node: Dict[str, Any]
    ) -> bool:
        """
        병목 감지 알림 발송
        """
        inflow = node.get("inflow", 0)
        outflow = node.get("outflow", 0)
        ratio = (outflow / inflow * 100) if inflow > 0 else 0
        
        variables = {
            "name": node.get("name", node.get("id", "Unknown")),
            "location": node.get("location", "-"),
            "inflow": self._format_money(inflow),
            "outflow": self._format_money(outflow),
            "ratio": f"{ratio:.1f}",
            "recommendation": self._get_recommendation(ratio)
        }
        
        return self.send_alimtalk(
            phone_number,
            self.TEMPLATES["bottleneck"].template_code,
            variables,
            self.TEMPLATES["bottleneck"].buttons
        )
    
    def send_weekly_report(
        self,
        phone_number: str,
        report: Dict[str, Any]
    ) -> bool:
        """
        주간 리포트 알림 발송
        """
        variables = {
            "week_id": report.get("week_id", ""),
            "total_value": self._format_money(report.get("total_value", 0)),
            "change": f"{report.get('value_change', 0):+.1f}",
            "synergy": self._format_money(report.get("total_synergy", 0)),
            "summary": report.get("summary", "")[:100]  # 100자 제한
        }
        
        return self.send_alimtalk(
            phone_number,
            self.TEMPLATES["weekly_report"].template_code,
            variables,
            self.TEMPLATES["weekly_report"].buttons
        )
    
    def send_milestone(
        self,
        phone_number: str,
        milestone_type: str,
        message: str,
        value: float
    ) -> bool:
        """
        마일스톤 달성 알림 발송
        """
        variables = {
            "milestone_type": milestone_type,
            "message": message,
            "value": self._format_money(value)
        }
        
        return self.send_alimtalk(
            phone_number,
            self.TEMPLATES["milestone"].template_code,
            variables,
            self.TEMPLATES["milestone"].buttons
        )
    
    def send_prediction(
        self,
        phone_number: str,
        prediction: Dict[str, Any]
    ) -> bool:
        """
        예측 알림 발송
        """
        pred_type = "기회" if prediction.get("type") == "opportunity" else "위험"
        action = "지금 확인하세요!" if prediction.get("type") == "opportunity" else "주의가 필요합니다."
        
        variables = {
            "prediction_type": pred_type,
            "target": prediction.get("target", ""),
            "current_value": self._format_money(prediction.get("current_value", 0)),
            "predicted_value": self._format_money(prediction.get("predicted_value", 0)),
            "confidence": str(prediction.get("confidence", 0)),
            "action_message": action
        }
        
        return self.send_alimtalk(
            phone_number,
            self.TEMPLATES["prediction"].template_code,
            variables,
            self.TEMPLATES["prediction"].buttons
        )
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════
    
    def _format_money(self, value: float) -> str:
        """금액 포맷팅"""
        if abs(value) >= 100000000:
            return f"₩{value/100000000:.2f}억"
        elif abs(value) >= 10000:
            return f"₩{value/10000:,.0f}만"
        else:
            return f"₩{value:,.0f}"
    
    def _get_recommendation(self, outflow_ratio: float) -> str:
        """유출 비율에 따른 권장 조치"""
        if outflow_ratio > 50:
            return "🔴 긴급: 즉시 비용 절감 필요"
        elif outflow_ratio > 30:
            return "🟡 주의: 유입 경로 다각화 검토"
        else:
            return "🟢 모니터링: 지속 관찰"


# ═══════════════════════════════════════════════════════════════════════════════
# 카카오 비즈니스 직접 연동 (고급)
# ═══════════════════════════════════════════════════════════════════════════════

class KakaoBusinessAPI:
    """
    카카오 비즈니스 직접 연동 클라이언트
    
    주의: 사업자등록 및 템플릿 검수 필요
    """
    
    def __init__(
        self,
        app_key: str = None,
        sender_key: str = None
    ):
        self.app_key = app_key or os.getenv("KAKAO_APP_KEY")
        self.sender_key = sender_key or os.getenv("KAKAO_SENDER_KEY")
        self.base_url = "https://kapi.kakao.com"
    
    def get_token(self, code: str) -> Optional[str]:
        """OAuth 토큰 획득"""
        # 카카오 OAuth 플로우 구현
        pass
    
    def send_alimtalk(self, phone: str, template_code: str, variables: Dict) -> bool:
        """알림톡 발송"""
        # 카카오 비즈메시지 API 호출
        pass


# ═══════════════════════════════════════════════════════════════════════════════
# 사용 예제
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 클라이언트 초기화
    kakao = KakaoAlimtalk(platform="solapi")
    
    # 테스트 전화번호 (실제 번호로 변경)
    TEST_PHONE = "01012345678"
    
    # 병목 알림 예제
    bottleneck_node = {
        "id": "파트너A",
        "name": "미국 파트너",
        "location": "New York, USA",
        "inflow": 45000000,
        "outflow": 15000000,
        "status": "bottleneck"
    }
    
    # kakao.send_bottleneck_alert(TEST_PHONE, bottleneck_node)
    
    # 주간 리포트 예제
    weekly = {
        "week_id": "2025-W01",
        "total_value": 709000000,
        "value_change": 15.2,
        "total_synergy": 22810000,
        "summary": "총 가치 7억 돌파! 시너지 지속 성장 중"
    }
    
    # kakao.send_weekly_report(TEST_PHONE, weekly)
    
    # 마일스톤 알림 예제
    # kakao.send_milestone(TEST_PHONE, "총 가치", "7억 돌파!", 709000000)
    
    print("\n📋 카카오톡 알림톡 설정 가이드:")
    print("\n[간편 설정: Solapi 사용]")
    print("1. https://solapi.com 가입")
    print("2. 카카오 채널 연동 (채널 관리 → 카카오톡 채널 연동)")
    print("3. 발신 프로필 등록")
    print("4. 템플릿 등록:")
    print("   - AUTUS_BOTTLENECK_001: 병목 감지")
    print("   - AUTUS_WEEKLY_001: 주간 리포트")
    print("   - AUTUS_MILESTONE_001: 마일스톤")
    print("   - AUTUS_PREDICTION_001: 예측 알림")
    print("5. API 키 발급 (대시보드 → 개발/연동)")
    print("6. 환경변수 설정:")
    print('   export ALIMTALK_API_KEY="your-api-key"')
    print('   export ALIMTALK_API_SECRET="your-api-secret"')
    print('   export ALIMTALK_SENDER_KEY="your-sender-key"')
    
    print("\n💡 Tip: Solapi는 월 50건 무료!")
    print("💰 예상 비용: 알림톡 1건당 약 8원")





















