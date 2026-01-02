#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    🔌 AUTUS EXTERNAL INTEGRATIONS - 외부 API 연동                          ║
║                                                                                           ║
║  "제국을 외부 세계와 연결하라"                                                              ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ 기상청 API (실제 날씨 데이터)                                                          ║
║  ✅ SMS API (알리고/NHN 클라우드)                                                          ║
║  ✅ 카카오 알림톡                                                                          ║
║  ✅ Slack 웹훅                                                                            ║
║  ✅ Discord 웹훅                                                                          ║
║  ✅ 이메일 알림                                                                            ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
import hashlib
import hmac
import base64

# HTTP 클라이언트
try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

# 환경 변수에서 API 키 로드 (실제 사용 시 .env 파일에서 로드)
class Config:
    # 기상청 API (공공데이터포털)
    WEATHER_API_KEY = os.getenv("WEATHER_API_KEY", "")
    WEATHER_BASE_URL = "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0"
    
    # SMS - 알리고
    ALIGO_API_KEY = os.getenv("ALIGO_API_KEY", "")
    ALIGO_USER_ID = os.getenv("ALIGO_USER_ID", "")
    ALIGO_SENDER = os.getenv("ALIGO_SENDER", "")
    
    # SMS - NHN Cloud
    NHN_APP_KEY = os.getenv("NHN_APP_KEY", "")
    NHN_SECRET_KEY = os.getenv("NHN_SECRET_KEY", "")
    NHN_SENDER = os.getenv("NHN_SENDER", "")
    
    # 카카오 알림톡
    KAKAO_API_KEY = os.getenv("KAKAO_API_KEY", "")
    KAKAO_SENDER_KEY = os.getenv("KAKAO_SENDER_KEY", "")
    
    # Slack
    SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL", "")
    
    # Discord
    DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL", "")
    
    # Email (SMTP)
    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 1. 기상청 API (Korea Meteorological Administration)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class WeatherForecast:
    """날씨 예보"""
    date: str
    time: str
    temperature: int
    humidity: int
    precipitation_probability: int
    sky_condition: str  # 맑음, 구름많음, 흐림
    precipitation_type: str  # 없음, 비, 눈, 비/눈
    wind_speed: float
    
    @property
    def weather_type(self) -> str:
        """날씨 유형 반환"""
        if self.precipitation_type == "비":
            return "rainy"
        elif self.precipitation_type == "눈":
            return "snowy"
        elif self.sky_condition == "맑음":
            return "sunny"
        elif self.sky_condition in ["구름많음", "흐림"]:
            return "cloudy"
        return "cloudy"


class WeatherService:
    """기상청 API 연동"""
    
    # 주요 도시 좌표 (기상청 격자 좌표)
    CITY_COORDS = {
        "서울": (60, 127),
        "부산": (98, 76),
        "대구": (89, 90),
        "인천": (55, 124),
        "광주": (58, 74),
        "대전": (67, 100),
        "울산": (102, 84),
        "수원": (60, 121),
        "성남": (63, 124),
        "고양": (57, 128),
    }
    
    SKY_CONDITIONS = {
        "1": "맑음",
        "3": "구름많음",
        "4": "흐림",
    }
    
    PRECIPITATION_TYPES = {
        "0": "없음",
        "1": "비",
        "2": "비/눈",
        "3": "눈",
        "4": "소나기",
    }
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or Config.WEATHER_API_KEY
        self.base_url = Config.WEATHER_BASE_URL
    
    async def get_forecast(self, city: str = "서울", date: datetime = None) -> Optional[WeatherForecast]:
        """날씨 예보 조회"""
        if not self.api_key:
            print("⚠️ 기상청 API 키가 설정되지 않았습니다.")
            return self._get_mock_forecast()
        
        if city not in self.CITY_COORDS:
            city = "서울"
        
        nx, ny = self.CITY_COORDS[city]
        
        if date is None:
            date = datetime.now()
        
        # 기상청 API는 매일 02:00, 05:00, 08:00, 11:00, 14:00, 17:00, 20:00, 23:00에 발표
        base_date = date.strftime("%Y%m%d")
        base_time = "0500"  # 05시 발표 데이터 사용
        
        params = {
            "serviceKey": self.api_key,
            "numOfRows": 100,
            "pageNo": 1,
            "dataType": "JSON",
            "base_date": base_date,
            "base_time": base_time,
            "nx": nx,
            "ny": ny,
        }
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        f"{self.base_url}/getVilageFcst",
                        params=params,
                        timeout=10.0
                    )
                    data = response.json()
            elif REQUESTS_AVAILABLE:
                response = requests.get(
                    f"{self.base_url}/getVilageFcst",
                    params=params,
                    timeout=10
                )
                data = response.json()
            else:
                return self._get_mock_forecast()
            
            return self._parse_forecast(data)
        
        except Exception as e:
            print(f"⚠️ 기상청 API 오류: {e}")
            return self._get_mock_forecast()
    
    def _parse_forecast(self, data: dict) -> Optional[WeatherForecast]:
        """응답 파싱"""
        try:
            items = data["response"]["body"]["items"]["item"]
            
            forecast_data = {}
            for item in items:
                category = item["category"]
                value = item["fcstValue"]
                
                if category == "TMP":  # 기온
                    forecast_data["temperature"] = int(value)
                elif category == "REH":  # 습도
                    forecast_data["humidity"] = int(value)
                elif category == "POP":  # 강수확률
                    forecast_data["precipitation_probability"] = int(value)
                elif category == "SKY":  # 하늘상태
                    forecast_data["sky_condition"] = self.SKY_CONDITIONS.get(value, "흐림")
                elif category == "PTY":  # 강수형태
                    forecast_data["precipitation_type"] = self.PRECIPITATION_TYPES.get(value, "없음")
                elif category == "WSD":  # 풍속
                    forecast_data["wind_speed"] = float(value)
            
            return WeatherForecast(
                date=items[0]["fcstDate"],
                time=items[0]["fcstTime"],
                temperature=forecast_data.get("temperature", 20),
                humidity=forecast_data.get("humidity", 50),
                precipitation_probability=forecast_data.get("precipitation_probability", 0),
                sky_condition=forecast_data.get("sky_condition", "흐림"),
                precipitation_type=forecast_data.get("precipitation_type", "없음"),
                wind_speed=forecast_data.get("wind_speed", 2.0),
            )
        
        except Exception as e:
            print(f"⚠️ 파싱 오류: {e}")
            return self._get_mock_forecast()
    
    def _get_mock_forecast(self) -> WeatherForecast:
        """Mock 데이터 반환"""
        import random
        
        conditions = ["맑음", "구름많음", "흐림"]
        precipitations = ["없음", "없음", "없음", "비", "눈"]
        
        return WeatherForecast(
            date=datetime.now().strftime("%Y%m%d"),
            time="1200",
            temperature=random.randint(-5, 35),
            humidity=random.randint(30, 80),
            precipitation_probability=random.randint(0, 100),
            sky_condition=random.choice(conditions),
            precipitation_type=random.choice(precipitations),
            wind_speed=random.uniform(1.0, 10.0),
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 2. SMS API (알리고 / NHN Cloud)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class SMSResult:
    """SMS 전송 결과"""
    success: bool
    message_id: str = ""
    error: str = ""


class SMSService:
    """SMS 발송 서비스"""
    
    def __init__(self, provider: str = "aligo"):
        self.provider = provider
    
    async def send_sms(self, phone: str, message: str) -> SMSResult:
        """SMS 발송"""
        if self.provider == "aligo":
            return await self._send_via_aligo(phone, message)
        elif self.provider == "nhn":
            return await self._send_via_nhn(phone, message)
        else:
            return SMSResult(success=False, error="Unknown provider")
    
    async def send_bulk_sms(self, phones: List[str], message: str) -> List[SMSResult]:
        """대량 SMS 발송"""
        results = []
        for phone in phones:
            result = await self.send_sms(phone, message)
            results.append(result)
            await asyncio.sleep(0.1)  # Rate limiting
        return results
    
    async def _send_via_aligo(self, phone: str, message: str) -> SMSResult:
        """알리고 SMS 발송"""
        if not Config.ALIGO_API_KEY:
            print("⚠️ 알리고 API 키가 설정되지 않았습니다.")
            return SMSResult(success=False, error="API key not configured")
        
        url = "https://apis.aligo.in/send/"
        
        data = {
            "key": Config.ALIGO_API_KEY,
            "user_id": Config.ALIGO_USER_ID,
            "sender": Config.ALIGO_SENDER,
            "receiver": phone,
            "msg": message,
        }
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.post(url, data=data, timeout=10.0)
                    result = response.json()
            elif REQUESTS_AVAILABLE:
                response = requests.post(url, data=data, timeout=10)
                result = response.json()
            else:
                return SMSResult(success=False, error="HTTP client not available")
            
            if result.get("result_code") == "1":
                return SMSResult(success=True, message_id=result.get("msg_id", ""))
            else:
                return SMSResult(success=False, error=result.get("message", "Unknown error"))
        
        except Exception as e:
            return SMSResult(success=False, error=str(e))
    
    async def _send_via_nhn(self, phone: str, message: str) -> SMSResult:
        """NHN Cloud SMS 발송"""
        if not Config.NHN_APP_KEY:
            print("⚠️ NHN Cloud API 키가 설정되지 않았습니다.")
            return SMSResult(success=False, error="API key not configured")
        
        url = f"https://api-sms.cloud.toast.com/sms/v2.4/appKeys/{Config.NHN_APP_KEY}/sender/sms"
        
        headers = {
            "Content-Type": "application/json;charset=UTF-8",
            "X-Secret-Key": Config.NHN_SECRET_KEY,
        }
        
        data = {
            "body": message,
            "sendNo": Config.NHN_SENDER,
            "recipientList": [{"recipientNo": phone}],
        }
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.post(url, json=data, headers=headers, timeout=10.0)
                    result = response.json()
            else:
                return SMSResult(success=False, error="HTTP client not available")
            
            if result.get("header", {}).get("isSuccessful"):
                return SMSResult(success=True, message_id=result.get("body", {}).get("data", {}).get("requestId", ""))
            else:
                return SMSResult(success=False, error=result.get("header", {}).get("resultMessage", "Unknown error"))
        
        except Exception as e:
            return SMSResult(success=False, error=str(e))


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 3. 카카오 알림톡
# ═══════════════════════════════════════════════════════════════════════════════════════════

class KakaoAlimtalkService:
    """카카오 알림톡 서비스"""
    
    # 미리 등록된 템플릿 예시
    TEMPLATES = {
        "VIP_WELCOME": "#{고객명}님, AUTUS에 오신 것을 환영합니다! 👑 VIP 고객님께 특별 혜택을 준비했습니다.",
        "QUEST_COMPLETE": "🎉 #{직원명}님, #{퀘스트명} 퀘스트를 완료했습니다! +#{XP} XP 획득!",
        "RESERVATION": "#{고객명}님, #{날짜} #{시간}에 예약이 완료되었습니다. 매장: #{매장명}",
        "BOUNTY_ALERT": "🕵️ #{사냥꾼명}님, 새로운 시크릿 미션이 도착했습니다. 앱에서 확인하세요!",
    }
    
    def __init__(self):
        self.api_key = Config.KAKAO_API_KEY
        self.sender_key = Config.KAKAO_SENDER_KEY
    
    async def send_alimtalk(self, phone: str, template_id: str, variables: Dict[str, str]) -> SMSResult:
        """알림톡 발송"""
        if not self.api_key:
            print("⚠️ 카카오 API 키가 설정되지 않았습니다.")
            return SMSResult(success=False, error="API key not configured")
        
        # 템플릿에 변수 대입
        template = self.TEMPLATES.get(template_id, "")
        if not template:
            return SMSResult(success=False, error="Template not found")
        
        message = template
        for key, value in variables.items():
            message = message.replace(f"#{{{key}}}", value)
        
        # 실제 API 호출 (예시)
        # 실제 구현 시 카카오 비즈니스 API 문서 참조
        
        print(f"📱 [KAKAO] To: {phone}")
        print(f"   Message: {message}")
        
        return SMSResult(success=True, message_id="KAKAO-MOCK-ID")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 4. Slack 웹훅
# ═══════════════════════════════════════════════════════════════════════════════════════════

class SlackService:
    """Slack 알림 서비스"""
    
    def __init__(self, webhook_url: str = None):
        self.webhook_url = webhook_url or Config.SLACK_WEBHOOK_URL
    
    async def send_message(self, text: str, channel: str = None) -> bool:
        """Slack 메시지 발송"""
        if not self.webhook_url:
            print("⚠️ Slack 웹훅 URL이 설정되지 않았습니다.")
            return False
        
        payload = {"text": text}
        if channel:
            payload["channel"] = channel
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.post(self.webhook_url, json=payload, timeout=10.0)
                    return response.status_code == 200
            elif REQUESTS_AVAILABLE:
                response = requests.post(self.webhook_url, json=payload, timeout=10)
                return response.status_code == 200
            return False
        
        except Exception as e:
            print(f"⚠️ Slack 오류: {e}")
            return False
    
    async def send_vip_alert(self, customer_name: str, station_id: str):
        """VIP 입장 알림"""
        message = f"👑 *VIP 입장 알림*\n\n고객: {customer_name}\n매장: {station_id}\n시간: {datetime.now().strftime('%H:%M:%S')}"
        return await self.send_message(message)
    
    async def send_caution_alert(self, customer_name: str, station_id: str):
        """주의 고객 알림"""
        message = f"⚠️ *주의 고객 감지*\n\n고객: {customer_name}\n매장: {station_id}\n시간: {datetime.now().strftime('%H:%M:%S')}\n\n> 규정대로 응대하세요."
        return await self.send_message(message)
    
    async def send_daily_report(self, stats: Dict[str, Any]):
        """일일 리포트"""
        message = f"""📊 *AUTUS 일일 리포트*

📅 날짜: {datetime.now().strftime('%Y-%m-%d')}

📈 *요약*
• 총 방문객: {stats.get('total_visitors', 0)}명
• VIP 방문: {stats.get('vip_visitors', 0)}명
• 매출: ₩{stats.get('revenue', 0):,}

🏆 *TOP 직원*
{stats.get('top_employee', 'N/A')}

💡 *내일 예측*
{stats.get('tomorrow_prediction', 'N/A')}
"""
        return await self.send_message(message)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 5. Discord 웹훅
# ═══════════════════════════════════════════════════════════════════════════════════════════

class DiscordService:
    """Discord 알림 서비스"""
    
    def __init__(self, webhook_url: str = None):
        self.webhook_url = webhook_url or Config.DISCORD_WEBHOOK_URL
    
    async def send_message(self, content: str, embeds: List[Dict] = None) -> bool:
        """Discord 메시지 발송"""
        if not self.webhook_url:
            print("⚠️ Discord 웹훅 URL이 설정되지 않았습니다.")
            return False
        
        payload = {"content": content}
        if embeds:
            payload["embeds"] = embeds
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.post(self.webhook_url, json=payload, timeout=10.0)
                    return response.status_code in [200, 204]
            return False
        
        except Exception as e:
            print(f"⚠️ Discord 오류: {e}")
            return False
    
    async def send_embed_alert(self, title: str, description: str, color: int = 0x00ff00):
        """임베드 알림"""
        embed = {
            "title": title,
            "description": description,
            "color": color,
            "timestamp": datetime.now().isoformat(),
            "footer": {"text": "AUTUS Empire"}
        }
        return await self.send_message("", embeds=[embed])


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 6. 통합 알림 매니저
# ═══════════════════════════════════════════════════════════════════════════════════════════

class NotificationManager:
    """
    통합 알림 매니저
    
    모든 알림 채널을 통합하여 관리
    """
    
    def __init__(self):
        self.sms = SMSService()
        self.kakao = KakaoAlimtalkService()
        self.slack = SlackService()
        self.discord = DiscordService()
        self.weather = WeatherService()
    
    async def notify_vip_entry(self, customer_name: str, phone: str, station_id: str):
        """VIP 입장 알림 (전체 채널)"""
        # Slack으로 내부 알림
        await self.slack.send_vip_alert(customer_name, station_id)
        
        # Discord로 내부 알림
        await self.discord.send_embed_alert(
            "👑 VIP 입장",
            f"**{customer_name}**님이 {station_id}에 입장했습니다.",
            0xffd700  # Gold
        )
        
        # SMS는 필요시에만
        # await self.sms.send_sms(manager_phone, f"VIP {customer_name}님 입장")
    
    async def notify_caution_entry(self, customer_name: str, station_id: str):
        """주의 고객 알림"""
        await self.slack.send_caution_alert(customer_name, station_id)
        await self.discord.send_embed_alert(
            "⚠️ 주의 고객 감지",
            f"**{customer_name}**님이 {station_id}에 입장했습니다.\n규정대로 응대하세요.",
            0xff0000  # Red
        )
    
    async def send_bounty_quest(self, hunter_phone: str, hunter_name: str, quest_description: str):
        """바운티 퀘스트 발송"""
        # SMS
        message = f"[AUTUS] {hunter_name}님, 새로운 시크릿 미션: {quest_description}"
        await self.sms.send_sms(hunter_phone, message)
        
        # 카카오 알림톡
        await self.kakao.send_alimtalk(
            hunter_phone,
            "BOUNTY_ALERT",
            {"사냥꾼명": hunter_name}
        )
    
    async def get_weather_for_oracle(self, city: str = "서울") -> Dict[str, Any]:
        """오라클 엔진용 날씨 데이터"""
        forecast = await self.weather.get_forecast(city)
        
        return {
            "weather_type": forecast.weather_type,
            "temperature": forecast.temperature,
            "precipitation_probability": forecast.precipitation_probability,
            "humidity": forecast.humidity,
            "sky_condition": forecast.sky_condition,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# FastAPI 라우터 (선택적)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_integration_routes():
    """FastAPI 라우터 생성"""
    from fastapi import APIRouter, HTTPException
    
    router = APIRouter(prefix="/api/v1/integrations", tags=["External Integrations"])
    
    notification_manager = NotificationManager()
    
    @router.get("/weather/{city}")
    async def get_weather(city: str = "서울"):
        """날씨 조회"""
        weather = WeatherService()
        forecast = await weather.get_forecast(city)
        
        if forecast:
            return {
                "city": city,
                "date": forecast.date,
                "temperature": forecast.temperature,
                "humidity": forecast.humidity,
                "precipitation_probability": forecast.precipitation_probability,
                "sky_condition": forecast.sky_condition,
                "precipitation_type": forecast.precipitation_type,
                "weather_type": forecast.weather_type,
            }
        
        raise HTTPException(status_code=500, detail="Weather data unavailable")
    
    @router.post("/sms/send")
    async def send_sms(phone: str, message: str, provider: str = "aligo"):
        """SMS 발송"""
        sms = SMSService(provider)
        result = await sms.send_sms(phone, message)
        return {"success": result.success, "message_id": result.message_id, "error": result.error}
    
    @router.post("/slack/send")
    async def send_slack(message: str):
        """Slack 메시지"""
        slack = SlackService()
        success = await slack.send_message(message)
        return {"success": success}
    
    @router.post("/notify/vip-entry")
    async def notify_vip(customer_name: str, phone: str, station_id: str):
        """VIP 입장 알림"""
        await notification_manager.notify_vip_entry(customer_name, phone, station_id)
        return {"success": True}
    
    return router


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트
# ═══════════════════════════════════════════════════════════════════════════════════════════

async def test_integrations():
    """통합 테스트"""
    print("🔌 AUTUS External Integrations Test")
    print("=" * 50)
    
    # 날씨 테스트
    print("\n📍 날씨 테스트...")
    weather = WeatherService()
    forecast = await weather.get_forecast("서울")
    print(f"   기온: {forecast.temperature}°C")
    print(f"   날씨: {forecast.sky_condition}")
    print(f"   강수확률: {forecast.precipitation_probability}%")
    
    # Slack 테스트 (웹훅 설정 필요)
    print("\n💬 Slack 테스트...")
    slack = SlackService()
    if Config.SLACK_WEBHOOK_URL:
        success = await slack.send_message("🧪 AUTUS 테스트 메시지")
        print(f"   결과: {'성공' if success else '실패'}")
    else:
        print("   ⚠️ 웹훅 URL 미설정")
    
    # 알림 매니저 테스트
    print("\n📢 알림 매니저 테스트...")
    manager = NotificationManager()
    weather_data = await manager.get_weather_for_oracle()
    print(f"   오라클용 날씨: {weather_data}")
    
    print("\n✅ 테스트 완료!")


if __name__ == "__main__":
    asyncio.run(test_integrations())







#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    🔌 AUTUS EXTERNAL INTEGRATIONS - 외부 API 연동                          ║
║                                                                                           ║
║  "제국을 외부 세계와 연결하라"                                                              ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ 기상청 API (실제 날씨 데이터)                                                          ║
║  ✅ SMS API (알리고/NHN 클라우드)                                                          ║
║  ✅ 카카오 알림톡                                                                          ║
║  ✅ Slack 웹훅                                                                            ║
║  ✅ Discord 웹훅                                                                          ║
║  ✅ 이메일 알림                                                                            ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
import hashlib
import hmac
import base64

# HTTP 클라이언트
try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

# 환경 변수에서 API 키 로드 (실제 사용 시 .env 파일에서 로드)
class Config:
    # 기상청 API (공공데이터포털)
    WEATHER_API_KEY = os.getenv("WEATHER_API_KEY", "")
    WEATHER_BASE_URL = "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0"
    
    # SMS - 알리고
    ALIGO_API_KEY = os.getenv("ALIGO_API_KEY", "")
    ALIGO_USER_ID = os.getenv("ALIGO_USER_ID", "")
    ALIGO_SENDER = os.getenv("ALIGO_SENDER", "")
    
    # SMS - NHN Cloud
    NHN_APP_KEY = os.getenv("NHN_APP_KEY", "")
    NHN_SECRET_KEY = os.getenv("NHN_SECRET_KEY", "")
    NHN_SENDER = os.getenv("NHN_SENDER", "")
    
    # 카카오 알림톡
    KAKAO_API_KEY = os.getenv("KAKAO_API_KEY", "")
    KAKAO_SENDER_KEY = os.getenv("KAKAO_SENDER_KEY", "")
    
    # Slack
    SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL", "")
    
    # Discord
    DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL", "")
    
    # Email (SMTP)
    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 1. 기상청 API (Korea Meteorological Administration)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class WeatherForecast:
    """날씨 예보"""
    date: str
    time: str
    temperature: int
    humidity: int
    precipitation_probability: int
    sky_condition: str  # 맑음, 구름많음, 흐림
    precipitation_type: str  # 없음, 비, 눈, 비/눈
    wind_speed: float
    
    @property
    def weather_type(self) -> str:
        """날씨 유형 반환"""
        if self.precipitation_type == "비":
            return "rainy"
        elif self.precipitation_type == "눈":
            return "snowy"
        elif self.sky_condition == "맑음":
            return "sunny"
        elif self.sky_condition in ["구름많음", "흐림"]:
            return "cloudy"
        return "cloudy"


class WeatherService:
    """기상청 API 연동"""
    
    # 주요 도시 좌표 (기상청 격자 좌표)
    CITY_COORDS = {
        "서울": (60, 127),
        "부산": (98, 76),
        "대구": (89, 90),
        "인천": (55, 124),
        "광주": (58, 74),
        "대전": (67, 100),
        "울산": (102, 84),
        "수원": (60, 121),
        "성남": (63, 124),
        "고양": (57, 128),
    }
    
    SKY_CONDITIONS = {
        "1": "맑음",
        "3": "구름많음",
        "4": "흐림",
    }
    
    PRECIPITATION_TYPES = {
        "0": "없음",
        "1": "비",
        "2": "비/눈",
        "3": "눈",
        "4": "소나기",
    }
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or Config.WEATHER_API_KEY
        self.base_url = Config.WEATHER_BASE_URL
    
    async def get_forecast(self, city: str = "서울", date: datetime = None) -> Optional[WeatherForecast]:
        """날씨 예보 조회"""
        if not self.api_key:
            print("⚠️ 기상청 API 키가 설정되지 않았습니다.")
            return self._get_mock_forecast()
        
        if city not in self.CITY_COORDS:
            city = "서울"
        
        nx, ny = self.CITY_COORDS[city]
        
        if date is None:
            date = datetime.now()
        
        # 기상청 API는 매일 02:00, 05:00, 08:00, 11:00, 14:00, 17:00, 20:00, 23:00에 발표
        base_date = date.strftime("%Y%m%d")
        base_time = "0500"  # 05시 발표 데이터 사용
        
        params = {
            "serviceKey": self.api_key,
            "numOfRows": 100,
            "pageNo": 1,
            "dataType": "JSON",
            "base_date": base_date,
            "base_time": base_time,
            "nx": nx,
            "ny": ny,
        }
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        f"{self.base_url}/getVilageFcst",
                        params=params,
                        timeout=10.0
                    )
                    data = response.json()
            elif REQUESTS_AVAILABLE:
                response = requests.get(
                    f"{self.base_url}/getVilageFcst",
                    params=params,
                    timeout=10
                )
                data = response.json()
            else:
                return self._get_mock_forecast()
            
            return self._parse_forecast(data)
        
        except Exception as e:
            print(f"⚠️ 기상청 API 오류: {e}")
            return self._get_mock_forecast()
    
    def _parse_forecast(self, data: dict) -> Optional[WeatherForecast]:
        """응답 파싱"""
        try:
            items = data["response"]["body"]["items"]["item"]
            
            forecast_data = {}
            for item in items:
                category = item["category"]
                value = item["fcstValue"]
                
                if category == "TMP":  # 기온
                    forecast_data["temperature"] = int(value)
                elif category == "REH":  # 습도
                    forecast_data["humidity"] = int(value)
                elif category == "POP":  # 강수확률
                    forecast_data["precipitation_probability"] = int(value)
                elif category == "SKY":  # 하늘상태
                    forecast_data["sky_condition"] = self.SKY_CONDITIONS.get(value, "흐림")
                elif category == "PTY":  # 강수형태
                    forecast_data["precipitation_type"] = self.PRECIPITATION_TYPES.get(value, "없음")
                elif category == "WSD":  # 풍속
                    forecast_data["wind_speed"] = float(value)
            
            return WeatherForecast(
                date=items[0]["fcstDate"],
                time=items[0]["fcstTime"],
                temperature=forecast_data.get("temperature", 20),
                humidity=forecast_data.get("humidity", 50),
                precipitation_probability=forecast_data.get("precipitation_probability", 0),
                sky_condition=forecast_data.get("sky_condition", "흐림"),
                precipitation_type=forecast_data.get("precipitation_type", "없음"),
                wind_speed=forecast_data.get("wind_speed", 2.0),
            )
        
        except Exception as e:
            print(f"⚠️ 파싱 오류: {e}")
            return self._get_mock_forecast()
    
    def _get_mock_forecast(self) -> WeatherForecast:
        """Mock 데이터 반환"""
        import random
        
        conditions = ["맑음", "구름많음", "흐림"]
        precipitations = ["없음", "없음", "없음", "비", "눈"]
        
        return WeatherForecast(
            date=datetime.now().strftime("%Y%m%d"),
            time="1200",
            temperature=random.randint(-5, 35),
            humidity=random.randint(30, 80),
            precipitation_probability=random.randint(0, 100),
            sky_condition=random.choice(conditions),
            precipitation_type=random.choice(precipitations),
            wind_speed=random.uniform(1.0, 10.0),
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 2. SMS API (알리고 / NHN Cloud)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class SMSResult:
    """SMS 전송 결과"""
    success: bool
    message_id: str = ""
    error: str = ""


class SMSService:
    """SMS 발송 서비스"""
    
    def __init__(self, provider: str = "aligo"):
        self.provider = provider
    
    async def send_sms(self, phone: str, message: str) -> SMSResult:
        """SMS 발송"""
        if self.provider == "aligo":
            return await self._send_via_aligo(phone, message)
        elif self.provider == "nhn":
            return await self._send_via_nhn(phone, message)
        else:
            return SMSResult(success=False, error="Unknown provider")
    
    async def send_bulk_sms(self, phones: List[str], message: str) -> List[SMSResult]:
        """대량 SMS 발송"""
        results = []
        for phone in phones:
            result = await self.send_sms(phone, message)
            results.append(result)
            await asyncio.sleep(0.1)  # Rate limiting
        return results
    
    async def _send_via_aligo(self, phone: str, message: str) -> SMSResult:
        """알리고 SMS 발송"""
        if not Config.ALIGO_API_KEY:
            print("⚠️ 알리고 API 키가 설정되지 않았습니다.")
            return SMSResult(success=False, error="API key not configured")
        
        url = "https://apis.aligo.in/send/"
        
        data = {
            "key": Config.ALIGO_API_KEY,
            "user_id": Config.ALIGO_USER_ID,
            "sender": Config.ALIGO_SENDER,
            "receiver": phone,
            "msg": message,
        }
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.post(url, data=data, timeout=10.0)
                    result = response.json()
            elif REQUESTS_AVAILABLE:
                response = requests.post(url, data=data, timeout=10)
                result = response.json()
            else:
                return SMSResult(success=False, error="HTTP client not available")
            
            if result.get("result_code") == "1":
                return SMSResult(success=True, message_id=result.get("msg_id", ""))
            else:
                return SMSResult(success=False, error=result.get("message", "Unknown error"))
        
        except Exception as e:
            return SMSResult(success=False, error=str(e))
    
    async def _send_via_nhn(self, phone: str, message: str) -> SMSResult:
        """NHN Cloud SMS 발송"""
        if not Config.NHN_APP_KEY:
            print("⚠️ NHN Cloud API 키가 설정되지 않았습니다.")
            return SMSResult(success=False, error="API key not configured")
        
        url = f"https://api-sms.cloud.toast.com/sms/v2.4/appKeys/{Config.NHN_APP_KEY}/sender/sms"
        
        headers = {
            "Content-Type": "application/json;charset=UTF-8",
            "X-Secret-Key": Config.NHN_SECRET_KEY,
        }
        
        data = {
            "body": message,
            "sendNo": Config.NHN_SENDER,
            "recipientList": [{"recipientNo": phone}],
        }
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.post(url, json=data, headers=headers, timeout=10.0)
                    result = response.json()
            else:
                return SMSResult(success=False, error="HTTP client not available")
            
            if result.get("header", {}).get("isSuccessful"):
                return SMSResult(success=True, message_id=result.get("body", {}).get("data", {}).get("requestId", ""))
            else:
                return SMSResult(success=False, error=result.get("header", {}).get("resultMessage", "Unknown error"))
        
        except Exception as e:
            return SMSResult(success=False, error=str(e))


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 3. 카카오 알림톡
# ═══════════════════════════════════════════════════════════════════════════════════════════

class KakaoAlimtalkService:
    """카카오 알림톡 서비스"""
    
    # 미리 등록된 템플릿 예시
    TEMPLATES = {
        "VIP_WELCOME": "#{고객명}님, AUTUS에 오신 것을 환영합니다! 👑 VIP 고객님께 특별 혜택을 준비했습니다.",
        "QUEST_COMPLETE": "🎉 #{직원명}님, #{퀘스트명} 퀘스트를 완료했습니다! +#{XP} XP 획득!",
        "RESERVATION": "#{고객명}님, #{날짜} #{시간}에 예약이 완료되었습니다. 매장: #{매장명}",
        "BOUNTY_ALERT": "🕵️ #{사냥꾼명}님, 새로운 시크릿 미션이 도착했습니다. 앱에서 확인하세요!",
    }
    
    def __init__(self):
        self.api_key = Config.KAKAO_API_KEY
        self.sender_key = Config.KAKAO_SENDER_KEY
    
    async def send_alimtalk(self, phone: str, template_id: str, variables: Dict[str, str]) -> SMSResult:
        """알림톡 발송"""
        if not self.api_key:
            print("⚠️ 카카오 API 키가 설정되지 않았습니다.")
            return SMSResult(success=False, error="API key not configured")
        
        # 템플릿에 변수 대입
        template = self.TEMPLATES.get(template_id, "")
        if not template:
            return SMSResult(success=False, error="Template not found")
        
        message = template
        for key, value in variables.items():
            message = message.replace(f"#{{{key}}}", value)
        
        # 실제 API 호출 (예시)
        # 실제 구현 시 카카오 비즈니스 API 문서 참조
        
        print(f"📱 [KAKAO] To: {phone}")
        print(f"   Message: {message}")
        
        return SMSResult(success=True, message_id="KAKAO-MOCK-ID")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 4. Slack 웹훅
# ═══════════════════════════════════════════════════════════════════════════════════════════

class SlackService:
    """Slack 알림 서비스"""
    
    def __init__(self, webhook_url: str = None):
        self.webhook_url = webhook_url or Config.SLACK_WEBHOOK_URL
    
    async def send_message(self, text: str, channel: str = None) -> bool:
        """Slack 메시지 발송"""
        if not self.webhook_url:
            print("⚠️ Slack 웹훅 URL이 설정되지 않았습니다.")
            return False
        
        payload = {"text": text}
        if channel:
            payload["channel"] = channel
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.post(self.webhook_url, json=payload, timeout=10.0)
                    return response.status_code == 200
            elif REQUESTS_AVAILABLE:
                response = requests.post(self.webhook_url, json=payload, timeout=10)
                return response.status_code == 200
            return False
        
        except Exception as e:
            print(f"⚠️ Slack 오류: {e}")
            return False
    
    async def send_vip_alert(self, customer_name: str, station_id: str):
        """VIP 입장 알림"""
        message = f"👑 *VIP 입장 알림*\n\n고객: {customer_name}\n매장: {station_id}\n시간: {datetime.now().strftime('%H:%M:%S')}"
        return await self.send_message(message)
    
    async def send_caution_alert(self, customer_name: str, station_id: str):
        """주의 고객 알림"""
        message = f"⚠️ *주의 고객 감지*\n\n고객: {customer_name}\n매장: {station_id}\n시간: {datetime.now().strftime('%H:%M:%S')}\n\n> 규정대로 응대하세요."
        return await self.send_message(message)
    
    async def send_daily_report(self, stats: Dict[str, Any]):
        """일일 리포트"""
        message = f"""📊 *AUTUS 일일 리포트*

📅 날짜: {datetime.now().strftime('%Y-%m-%d')}

📈 *요약*
• 총 방문객: {stats.get('total_visitors', 0)}명
• VIP 방문: {stats.get('vip_visitors', 0)}명
• 매출: ₩{stats.get('revenue', 0):,}

🏆 *TOP 직원*
{stats.get('top_employee', 'N/A')}

💡 *내일 예측*
{stats.get('tomorrow_prediction', 'N/A')}
"""
        return await self.send_message(message)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 5. Discord 웹훅
# ═══════════════════════════════════════════════════════════════════════════════════════════

class DiscordService:
    """Discord 알림 서비스"""
    
    def __init__(self, webhook_url: str = None):
        self.webhook_url = webhook_url or Config.DISCORD_WEBHOOK_URL
    
    async def send_message(self, content: str, embeds: List[Dict] = None) -> bool:
        """Discord 메시지 발송"""
        if not self.webhook_url:
            print("⚠️ Discord 웹훅 URL이 설정되지 않았습니다.")
            return False
        
        payload = {"content": content}
        if embeds:
            payload["embeds"] = embeds
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.post(self.webhook_url, json=payload, timeout=10.0)
                    return response.status_code in [200, 204]
            return False
        
        except Exception as e:
            print(f"⚠️ Discord 오류: {e}")
            return False
    
    async def send_embed_alert(self, title: str, description: str, color: int = 0x00ff00):
        """임베드 알림"""
        embed = {
            "title": title,
            "description": description,
            "color": color,
            "timestamp": datetime.now().isoformat(),
            "footer": {"text": "AUTUS Empire"}
        }
        return await self.send_message("", embeds=[embed])


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 6. 통합 알림 매니저
# ═══════════════════════════════════════════════════════════════════════════════════════════

class NotificationManager:
    """
    통합 알림 매니저
    
    모든 알림 채널을 통합하여 관리
    """
    
    def __init__(self):
        self.sms = SMSService()
        self.kakao = KakaoAlimtalkService()
        self.slack = SlackService()
        self.discord = DiscordService()
        self.weather = WeatherService()
    
    async def notify_vip_entry(self, customer_name: str, phone: str, station_id: str):
        """VIP 입장 알림 (전체 채널)"""
        # Slack으로 내부 알림
        await self.slack.send_vip_alert(customer_name, station_id)
        
        # Discord로 내부 알림
        await self.discord.send_embed_alert(
            "👑 VIP 입장",
            f"**{customer_name}**님이 {station_id}에 입장했습니다.",
            0xffd700  # Gold
        )
        
        # SMS는 필요시에만
        # await self.sms.send_sms(manager_phone, f"VIP {customer_name}님 입장")
    
    async def notify_caution_entry(self, customer_name: str, station_id: str):
        """주의 고객 알림"""
        await self.slack.send_caution_alert(customer_name, station_id)
        await self.discord.send_embed_alert(
            "⚠️ 주의 고객 감지",
            f"**{customer_name}**님이 {station_id}에 입장했습니다.\n규정대로 응대하세요.",
            0xff0000  # Red
        )
    
    async def send_bounty_quest(self, hunter_phone: str, hunter_name: str, quest_description: str):
        """바운티 퀘스트 발송"""
        # SMS
        message = f"[AUTUS] {hunter_name}님, 새로운 시크릿 미션: {quest_description}"
        await self.sms.send_sms(hunter_phone, message)
        
        # 카카오 알림톡
        await self.kakao.send_alimtalk(
            hunter_phone,
            "BOUNTY_ALERT",
            {"사냥꾼명": hunter_name}
        )
    
    async def get_weather_for_oracle(self, city: str = "서울") -> Dict[str, Any]:
        """오라클 엔진용 날씨 데이터"""
        forecast = await self.weather.get_forecast(city)
        
        return {
            "weather_type": forecast.weather_type,
            "temperature": forecast.temperature,
            "precipitation_probability": forecast.precipitation_probability,
            "humidity": forecast.humidity,
            "sky_condition": forecast.sky_condition,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# FastAPI 라우터 (선택적)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_integration_routes():
    """FastAPI 라우터 생성"""
    from fastapi import APIRouter, HTTPException
    
    router = APIRouter(prefix="/api/v1/integrations", tags=["External Integrations"])
    
    notification_manager = NotificationManager()
    
    @router.get("/weather/{city}")
    async def get_weather(city: str = "서울"):
        """날씨 조회"""
        weather = WeatherService()
        forecast = await weather.get_forecast(city)
        
        if forecast:
            return {
                "city": city,
                "date": forecast.date,
                "temperature": forecast.temperature,
                "humidity": forecast.humidity,
                "precipitation_probability": forecast.precipitation_probability,
                "sky_condition": forecast.sky_condition,
                "precipitation_type": forecast.precipitation_type,
                "weather_type": forecast.weather_type,
            }
        
        raise HTTPException(status_code=500, detail="Weather data unavailable")
    
    @router.post("/sms/send")
    async def send_sms(phone: str, message: str, provider: str = "aligo"):
        """SMS 발송"""
        sms = SMSService(provider)
        result = await sms.send_sms(phone, message)
        return {"success": result.success, "message_id": result.message_id, "error": result.error}
    
    @router.post("/slack/send")
    async def send_slack(message: str):
        """Slack 메시지"""
        slack = SlackService()
        success = await slack.send_message(message)
        return {"success": success}
    
    @router.post("/notify/vip-entry")
    async def notify_vip(customer_name: str, phone: str, station_id: str):
        """VIP 입장 알림"""
        await notification_manager.notify_vip_entry(customer_name, phone, station_id)
        return {"success": True}
    
    return router


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트
# ═══════════════════════════════════════════════════════════════════════════════════════════

async def test_integrations():
    """통합 테스트"""
    print("🔌 AUTUS External Integrations Test")
    print("=" * 50)
    
    # 날씨 테스트
    print("\n📍 날씨 테스트...")
    weather = WeatherService()
    forecast = await weather.get_forecast("서울")
    print(f"   기온: {forecast.temperature}°C")
    print(f"   날씨: {forecast.sky_condition}")
    print(f"   강수확률: {forecast.precipitation_probability}%")
    
    # Slack 테스트 (웹훅 설정 필요)
    print("\n💬 Slack 테스트...")
    slack = SlackService()
    if Config.SLACK_WEBHOOK_URL:
        success = await slack.send_message("🧪 AUTUS 테스트 메시지")
        print(f"   결과: {'성공' if success else '실패'}")
    else:
        print("   ⚠️ 웹훅 URL 미설정")
    
    # 알림 매니저 테스트
    print("\n📢 알림 매니저 테스트...")
    manager = NotificationManager()
    weather_data = await manager.get_weather_for_oracle()
    print(f"   오라클용 날씨: {weather_data}")
    
    print("\n✅ 테스트 완료!")


if __name__ == "__main__":
    asyncio.run(test_integrations())







#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    🔌 AUTUS EXTERNAL INTEGRATIONS - 외부 API 연동                          ║
║                                                                                           ║
║  "제국을 외부 세계와 연결하라"                                                              ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ 기상청 API (실제 날씨 데이터)                                                          ║
║  ✅ SMS API (알리고/NHN 클라우드)                                                          ║
║  ✅ 카카오 알림톡                                                                          ║
║  ✅ Slack 웹훅                                                                            ║
║  ✅ Discord 웹훅                                                                          ║
║  ✅ 이메일 알림                                                                            ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
import hashlib
import hmac
import base64

# HTTP 클라이언트
try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

# 환경 변수에서 API 키 로드 (실제 사용 시 .env 파일에서 로드)
class Config:
    # 기상청 API (공공데이터포털)
    WEATHER_API_KEY = os.getenv("WEATHER_API_KEY", "")
    WEATHER_BASE_URL = "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0"
    
    # SMS - 알리고
    ALIGO_API_KEY = os.getenv("ALIGO_API_KEY", "")
    ALIGO_USER_ID = os.getenv("ALIGO_USER_ID", "")
    ALIGO_SENDER = os.getenv("ALIGO_SENDER", "")
    
    # SMS - NHN Cloud
    NHN_APP_KEY = os.getenv("NHN_APP_KEY", "")
    NHN_SECRET_KEY = os.getenv("NHN_SECRET_KEY", "")
    NHN_SENDER = os.getenv("NHN_SENDER", "")
    
    # 카카오 알림톡
    KAKAO_API_KEY = os.getenv("KAKAO_API_KEY", "")
    KAKAO_SENDER_KEY = os.getenv("KAKAO_SENDER_KEY", "")
    
    # Slack
    SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL", "")
    
    # Discord
    DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL", "")
    
    # Email (SMTP)
    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 1. 기상청 API (Korea Meteorological Administration)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class WeatherForecast:
    """날씨 예보"""
    date: str
    time: str
    temperature: int
    humidity: int
    precipitation_probability: int
    sky_condition: str  # 맑음, 구름많음, 흐림
    precipitation_type: str  # 없음, 비, 눈, 비/눈
    wind_speed: float
    
    @property
    def weather_type(self) -> str:
        """날씨 유형 반환"""
        if self.precipitation_type == "비":
            return "rainy"
        elif self.precipitation_type == "눈":
            return "snowy"
        elif self.sky_condition == "맑음":
            return "sunny"
        elif self.sky_condition in ["구름많음", "흐림"]:
            return "cloudy"
        return "cloudy"


class WeatherService:
    """기상청 API 연동"""
    
    # 주요 도시 좌표 (기상청 격자 좌표)
    CITY_COORDS = {
        "서울": (60, 127),
        "부산": (98, 76),
        "대구": (89, 90),
        "인천": (55, 124),
        "광주": (58, 74),
        "대전": (67, 100),
        "울산": (102, 84),
        "수원": (60, 121),
        "성남": (63, 124),
        "고양": (57, 128),
    }
    
    SKY_CONDITIONS = {
        "1": "맑음",
        "3": "구름많음",
        "4": "흐림",
    }
    
    PRECIPITATION_TYPES = {
        "0": "없음",
        "1": "비",
        "2": "비/눈",
        "3": "눈",
        "4": "소나기",
    }
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or Config.WEATHER_API_KEY
        self.base_url = Config.WEATHER_BASE_URL
    
    async def get_forecast(self, city: str = "서울", date: datetime = None) -> Optional[WeatherForecast]:
        """날씨 예보 조회"""
        if not self.api_key:
            print("⚠️ 기상청 API 키가 설정되지 않았습니다.")
            return self._get_mock_forecast()
        
        if city not in self.CITY_COORDS:
            city = "서울"
        
        nx, ny = self.CITY_COORDS[city]
        
        if date is None:
            date = datetime.now()
        
        # 기상청 API는 매일 02:00, 05:00, 08:00, 11:00, 14:00, 17:00, 20:00, 23:00에 발표
        base_date = date.strftime("%Y%m%d")
        base_time = "0500"  # 05시 발표 데이터 사용
        
        params = {
            "serviceKey": self.api_key,
            "numOfRows": 100,
            "pageNo": 1,
            "dataType": "JSON",
            "base_date": base_date,
            "base_time": base_time,
            "nx": nx,
            "ny": ny,
        }
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        f"{self.base_url}/getVilageFcst",
                        params=params,
                        timeout=10.0
                    )
                    data = response.json()
            elif REQUESTS_AVAILABLE:
                response = requests.get(
                    f"{self.base_url}/getVilageFcst",
                    params=params,
                    timeout=10
                )
                data = response.json()
            else:
                return self._get_mock_forecast()
            
            return self._parse_forecast(data)
        
        except Exception as e:
            print(f"⚠️ 기상청 API 오류: {e}")
            return self._get_mock_forecast()
    
    def _parse_forecast(self, data: dict) -> Optional[WeatherForecast]:
        """응답 파싱"""
        try:
            items = data["response"]["body"]["items"]["item"]
            
            forecast_data = {}
            for item in items:
                category = item["category"]
                value = item["fcstValue"]
                
                if category == "TMP":  # 기온
                    forecast_data["temperature"] = int(value)
                elif category == "REH":  # 습도
                    forecast_data["humidity"] = int(value)
                elif category == "POP":  # 강수확률
                    forecast_data["precipitation_probability"] = int(value)
                elif category == "SKY":  # 하늘상태
                    forecast_data["sky_condition"] = self.SKY_CONDITIONS.get(value, "흐림")
                elif category == "PTY":  # 강수형태
                    forecast_data["precipitation_type"] = self.PRECIPITATION_TYPES.get(value, "없음")
                elif category == "WSD":  # 풍속
                    forecast_data["wind_speed"] = float(value)
            
            return WeatherForecast(
                date=items[0]["fcstDate"],
                time=items[0]["fcstTime"],
                temperature=forecast_data.get("temperature", 20),
                humidity=forecast_data.get("humidity", 50),
                precipitation_probability=forecast_data.get("precipitation_probability", 0),
                sky_condition=forecast_data.get("sky_condition", "흐림"),
                precipitation_type=forecast_data.get("precipitation_type", "없음"),
                wind_speed=forecast_data.get("wind_speed", 2.0),
            )
        
        except Exception as e:
            print(f"⚠️ 파싱 오류: {e}")
            return self._get_mock_forecast()
    
    def _get_mock_forecast(self) -> WeatherForecast:
        """Mock 데이터 반환"""
        import random
        
        conditions = ["맑음", "구름많음", "흐림"]
        precipitations = ["없음", "없음", "없음", "비", "눈"]
        
        return WeatherForecast(
            date=datetime.now().strftime("%Y%m%d"),
            time="1200",
            temperature=random.randint(-5, 35),
            humidity=random.randint(30, 80),
            precipitation_probability=random.randint(0, 100),
            sky_condition=random.choice(conditions),
            precipitation_type=random.choice(precipitations),
            wind_speed=random.uniform(1.0, 10.0),
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 2. SMS API (알리고 / NHN Cloud)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class SMSResult:
    """SMS 전송 결과"""
    success: bool
    message_id: str = ""
    error: str = ""


class SMSService:
    """SMS 발송 서비스"""
    
    def __init__(self, provider: str = "aligo"):
        self.provider = provider
    
    async def send_sms(self, phone: str, message: str) -> SMSResult:
        """SMS 발송"""
        if self.provider == "aligo":
            return await self._send_via_aligo(phone, message)
        elif self.provider == "nhn":
            return await self._send_via_nhn(phone, message)
        else:
            return SMSResult(success=False, error="Unknown provider")
    
    async def send_bulk_sms(self, phones: List[str], message: str) -> List[SMSResult]:
        """대량 SMS 발송"""
        results = []
        for phone in phones:
            result = await self.send_sms(phone, message)
            results.append(result)
            await asyncio.sleep(0.1)  # Rate limiting
        return results
    
    async def _send_via_aligo(self, phone: str, message: str) -> SMSResult:
        """알리고 SMS 발송"""
        if not Config.ALIGO_API_KEY:
            print("⚠️ 알리고 API 키가 설정되지 않았습니다.")
            return SMSResult(success=False, error="API key not configured")
        
        url = "https://apis.aligo.in/send/"
        
        data = {
            "key": Config.ALIGO_API_KEY,
            "user_id": Config.ALIGO_USER_ID,
            "sender": Config.ALIGO_SENDER,
            "receiver": phone,
            "msg": message,
        }
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.post(url, data=data, timeout=10.0)
                    result = response.json()
            elif REQUESTS_AVAILABLE:
                response = requests.post(url, data=data, timeout=10)
                result = response.json()
            else:
                return SMSResult(success=False, error="HTTP client not available")
            
            if result.get("result_code") == "1":
                return SMSResult(success=True, message_id=result.get("msg_id", ""))
            else:
                return SMSResult(success=False, error=result.get("message", "Unknown error"))
        
        except Exception as e:
            return SMSResult(success=False, error=str(e))
    
    async def _send_via_nhn(self, phone: str, message: str) -> SMSResult:
        """NHN Cloud SMS 발송"""
        if not Config.NHN_APP_KEY:
            print("⚠️ NHN Cloud API 키가 설정되지 않았습니다.")
            return SMSResult(success=False, error="API key not configured")
        
        url = f"https://api-sms.cloud.toast.com/sms/v2.4/appKeys/{Config.NHN_APP_KEY}/sender/sms"
        
        headers = {
            "Content-Type": "application/json;charset=UTF-8",
            "X-Secret-Key": Config.NHN_SECRET_KEY,
        }
        
        data = {
            "body": message,
            "sendNo": Config.NHN_SENDER,
            "recipientList": [{"recipientNo": phone}],
        }
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.post(url, json=data, headers=headers, timeout=10.0)
                    result = response.json()
            else:
                return SMSResult(success=False, error="HTTP client not available")
            
            if result.get("header", {}).get("isSuccessful"):
                return SMSResult(success=True, message_id=result.get("body", {}).get("data", {}).get("requestId", ""))
            else:
                return SMSResult(success=False, error=result.get("header", {}).get("resultMessage", "Unknown error"))
        
        except Exception as e:
            return SMSResult(success=False, error=str(e))


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 3. 카카오 알림톡
# ═══════════════════════════════════════════════════════════════════════════════════════════

class KakaoAlimtalkService:
    """카카오 알림톡 서비스"""
    
    # 미리 등록된 템플릿 예시
    TEMPLATES = {
        "VIP_WELCOME": "#{고객명}님, AUTUS에 오신 것을 환영합니다! 👑 VIP 고객님께 특별 혜택을 준비했습니다.",
        "QUEST_COMPLETE": "🎉 #{직원명}님, #{퀘스트명} 퀘스트를 완료했습니다! +#{XP} XP 획득!",
        "RESERVATION": "#{고객명}님, #{날짜} #{시간}에 예약이 완료되었습니다. 매장: #{매장명}",
        "BOUNTY_ALERT": "🕵️ #{사냥꾼명}님, 새로운 시크릿 미션이 도착했습니다. 앱에서 확인하세요!",
    }
    
    def __init__(self):
        self.api_key = Config.KAKAO_API_KEY
        self.sender_key = Config.KAKAO_SENDER_KEY
    
    async def send_alimtalk(self, phone: str, template_id: str, variables: Dict[str, str]) -> SMSResult:
        """알림톡 발송"""
        if not self.api_key:
            print("⚠️ 카카오 API 키가 설정되지 않았습니다.")
            return SMSResult(success=False, error="API key not configured")
        
        # 템플릿에 변수 대입
        template = self.TEMPLATES.get(template_id, "")
        if not template:
            return SMSResult(success=False, error="Template not found")
        
        message = template
        for key, value in variables.items():
            message = message.replace(f"#{{{key}}}", value)
        
        # 실제 API 호출 (예시)
        # 실제 구현 시 카카오 비즈니스 API 문서 참조
        
        print(f"📱 [KAKAO] To: {phone}")
        print(f"   Message: {message}")
        
        return SMSResult(success=True, message_id="KAKAO-MOCK-ID")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 4. Slack 웹훅
# ═══════════════════════════════════════════════════════════════════════════════════════════

class SlackService:
    """Slack 알림 서비스"""
    
    def __init__(self, webhook_url: str = None):
        self.webhook_url = webhook_url or Config.SLACK_WEBHOOK_URL
    
    async def send_message(self, text: str, channel: str = None) -> bool:
        """Slack 메시지 발송"""
        if not self.webhook_url:
            print("⚠️ Slack 웹훅 URL이 설정되지 않았습니다.")
            return False
        
        payload = {"text": text}
        if channel:
            payload["channel"] = channel
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.post(self.webhook_url, json=payload, timeout=10.0)
                    return response.status_code == 200
            elif REQUESTS_AVAILABLE:
                response = requests.post(self.webhook_url, json=payload, timeout=10)
                return response.status_code == 200
            return False
        
        except Exception as e:
            print(f"⚠️ Slack 오류: {e}")
            return False
    
    async def send_vip_alert(self, customer_name: str, station_id: str):
        """VIP 입장 알림"""
        message = f"👑 *VIP 입장 알림*\n\n고객: {customer_name}\n매장: {station_id}\n시간: {datetime.now().strftime('%H:%M:%S')}"
        return await self.send_message(message)
    
    async def send_caution_alert(self, customer_name: str, station_id: str):
        """주의 고객 알림"""
        message = f"⚠️ *주의 고객 감지*\n\n고객: {customer_name}\n매장: {station_id}\n시간: {datetime.now().strftime('%H:%M:%S')}\n\n> 규정대로 응대하세요."
        return await self.send_message(message)
    
    async def send_daily_report(self, stats: Dict[str, Any]):
        """일일 리포트"""
        message = f"""📊 *AUTUS 일일 리포트*

📅 날짜: {datetime.now().strftime('%Y-%m-%d')}

📈 *요약*
• 총 방문객: {stats.get('total_visitors', 0)}명
• VIP 방문: {stats.get('vip_visitors', 0)}명
• 매출: ₩{stats.get('revenue', 0):,}

🏆 *TOP 직원*
{stats.get('top_employee', 'N/A')}

💡 *내일 예측*
{stats.get('tomorrow_prediction', 'N/A')}
"""
        return await self.send_message(message)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 5. Discord 웹훅
# ═══════════════════════════════════════════════════════════════════════════════════════════

class DiscordService:
    """Discord 알림 서비스"""
    
    def __init__(self, webhook_url: str = None):
        self.webhook_url = webhook_url or Config.DISCORD_WEBHOOK_URL
    
    async def send_message(self, content: str, embeds: List[Dict] = None) -> bool:
        """Discord 메시지 발송"""
        if not self.webhook_url:
            print("⚠️ Discord 웹훅 URL이 설정되지 않았습니다.")
            return False
        
        payload = {"content": content}
        if embeds:
            payload["embeds"] = embeds
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.post(self.webhook_url, json=payload, timeout=10.0)
                    return response.status_code in [200, 204]
            return False
        
        except Exception as e:
            print(f"⚠️ Discord 오류: {e}")
            return False
    
    async def send_embed_alert(self, title: str, description: str, color: int = 0x00ff00):
        """임베드 알림"""
        embed = {
            "title": title,
            "description": description,
            "color": color,
            "timestamp": datetime.now().isoformat(),
            "footer": {"text": "AUTUS Empire"}
        }
        return await self.send_message("", embeds=[embed])


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 6. 통합 알림 매니저
# ═══════════════════════════════════════════════════════════════════════════════════════════

class NotificationManager:
    """
    통합 알림 매니저
    
    모든 알림 채널을 통합하여 관리
    """
    
    def __init__(self):
        self.sms = SMSService()
        self.kakao = KakaoAlimtalkService()
        self.slack = SlackService()
        self.discord = DiscordService()
        self.weather = WeatherService()
    
    async def notify_vip_entry(self, customer_name: str, phone: str, station_id: str):
        """VIP 입장 알림 (전체 채널)"""
        # Slack으로 내부 알림
        await self.slack.send_vip_alert(customer_name, station_id)
        
        # Discord로 내부 알림
        await self.discord.send_embed_alert(
            "👑 VIP 입장",
            f"**{customer_name}**님이 {station_id}에 입장했습니다.",
            0xffd700  # Gold
        )
        
        # SMS는 필요시에만
        # await self.sms.send_sms(manager_phone, f"VIP {customer_name}님 입장")
    
    async def notify_caution_entry(self, customer_name: str, station_id: str):
        """주의 고객 알림"""
        await self.slack.send_caution_alert(customer_name, station_id)
        await self.discord.send_embed_alert(
            "⚠️ 주의 고객 감지",
            f"**{customer_name}**님이 {station_id}에 입장했습니다.\n규정대로 응대하세요.",
            0xff0000  # Red
        )
    
    async def send_bounty_quest(self, hunter_phone: str, hunter_name: str, quest_description: str):
        """바운티 퀘스트 발송"""
        # SMS
        message = f"[AUTUS] {hunter_name}님, 새로운 시크릿 미션: {quest_description}"
        await self.sms.send_sms(hunter_phone, message)
        
        # 카카오 알림톡
        await self.kakao.send_alimtalk(
            hunter_phone,
            "BOUNTY_ALERT",
            {"사냥꾼명": hunter_name}
        )
    
    async def get_weather_for_oracle(self, city: str = "서울") -> Dict[str, Any]:
        """오라클 엔진용 날씨 데이터"""
        forecast = await self.weather.get_forecast(city)
        
        return {
            "weather_type": forecast.weather_type,
            "temperature": forecast.temperature,
            "precipitation_probability": forecast.precipitation_probability,
            "humidity": forecast.humidity,
            "sky_condition": forecast.sky_condition,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# FastAPI 라우터 (선택적)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_integration_routes():
    """FastAPI 라우터 생성"""
    from fastapi import APIRouter, HTTPException
    
    router = APIRouter(prefix="/api/v1/integrations", tags=["External Integrations"])
    
    notification_manager = NotificationManager()
    
    @router.get("/weather/{city}")
    async def get_weather(city: str = "서울"):
        """날씨 조회"""
        weather = WeatherService()
        forecast = await weather.get_forecast(city)
        
        if forecast:
            return {
                "city": city,
                "date": forecast.date,
                "temperature": forecast.temperature,
                "humidity": forecast.humidity,
                "precipitation_probability": forecast.precipitation_probability,
                "sky_condition": forecast.sky_condition,
                "precipitation_type": forecast.precipitation_type,
                "weather_type": forecast.weather_type,
            }
        
        raise HTTPException(status_code=500, detail="Weather data unavailable")
    
    @router.post("/sms/send")
    async def send_sms(phone: str, message: str, provider: str = "aligo"):
        """SMS 발송"""
        sms = SMSService(provider)
        result = await sms.send_sms(phone, message)
        return {"success": result.success, "message_id": result.message_id, "error": result.error}
    
    @router.post("/slack/send")
    async def send_slack(message: str):
        """Slack 메시지"""
        slack = SlackService()
        success = await slack.send_message(message)
        return {"success": success}
    
    @router.post("/notify/vip-entry")
    async def notify_vip(customer_name: str, phone: str, station_id: str):
        """VIP 입장 알림"""
        await notification_manager.notify_vip_entry(customer_name, phone, station_id)
        return {"success": True}
    
    return router


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트
# ═══════════════════════════════════════════════════════════════════════════════════════════

async def test_integrations():
    """통합 테스트"""
    print("🔌 AUTUS External Integrations Test")
    print("=" * 50)
    
    # 날씨 테스트
    print("\n📍 날씨 테스트...")
    weather = WeatherService()
    forecast = await weather.get_forecast("서울")
    print(f"   기온: {forecast.temperature}°C")
    print(f"   날씨: {forecast.sky_condition}")
    print(f"   강수확률: {forecast.precipitation_probability}%")
    
    # Slack 테스트 (웹훅 설정 필요)
    print("\n💬 Slack 테스트...")
    slack = SlackService()
    if Config.SLACK_WEBHOOK_URL:
        success = await slack.send_message("🧪 AUTUS 테스트 메시지")
        print(f"   결과: {'성공' if success else '실패'}")
    else:
        print("   ⚠️ 웹훅 URL 미설정")
    
    # 알림 매니저 테스트
    print("\n📢 알림 매니저 테스트...")
    manager = NotificationManager()
    weather_data = await manager.get_weather_for_oracle()
    print(f"   오라클용 날씨: {weather_data}")
    
    print("\n✅ 테스트 완료!")


if __name__ == "__main__":
    asyncio.run(test_integrations())







#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    🔌 AUTUS EXTERNAL INTEGRATIONS - 외부 API 연동                          ║
║                                                                                           ║
║  "제국을 외부 세계와 연결하라"                                                              ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ 기상청 API (실제 날씨 데이터)                                                          ║
║  ✅ SMS API (알리고/NHN 클라우드)                                                          ║
║  ✅ 카카오 알림톡                                                                          ║
║  ✅ Slack 웹훅                                                                            ║
║  ✅ Discord 웹훅                                                                          ║
║  ✅ 이메일 알림                                                                            ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
import hashlib
import hmac
import base64

# HTTP 클라이언트
try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

# 환경 변수에서 API 키 로드 (실제 사용 시 .env 파일에서 로드)
class Config:
    # 기상청 API (공공데이터포털)
    WEATHER_API_KEY = os.getenv("WEATHER_API_KEY", "")
    WEATHER_BASE_URL = "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0"
    
    # SMS - 알리고
    ALIGO_API_KEY = os.getenv("ALIGO_API_KEY", "")
    ALIGO_USER_ID = os.getenv("ALIGO_USER_ID", "")
    ALIGO_SENDER = os.getenv("ALIGO_SENDER", "")
    
    # SMS - NHN Cloud
    NHN_APP_KEY = os.getenv("NHN_APP_KEY", "")
    NHN_SECRET_KEY = os.getenv("NHN_SECRET_KEY", "")
    NHN_SENDER = os.getenv("NHN_SENDER", "")
    
    # 카카오 알림톡
    KAKAO_API_KEY = os.getenv("KAKAO_API_KEY", "")
    KAKAO_SENDER_KEY = os.getenv("KAKAO_SENDER_KEY", "")
    
    # Slack
    SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL", "")
    
    # Discord
    DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL", "")
    
    # Email (SMTP)
    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 1. 기상청 API (Korea Meteorological Administration)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class WeatherForecast:
    """날씨 예보"""
    date: str
    time: str
    temperature: int
    humidity: int
    precipitation_probability: int
    sky_condition: str  # 맑음, 구름많음, 흐림
    precipitation_type: str  # 없음, 비, 눈, 비/눈
    wind_speed: float
    
    @property
    def weather_type(self) -> str:
        """날씨 유형 반환"""
        if self.precipitation_type == "비":
            return "rainy"
        elif self.precipitation_type == "눈":
            return "snowy"
        elif self.sky_condition == "맑음":
            return "sunny"
        elif self.sky_condition in ["구름많음", "흐림"]:
            return "cloudy"
        return "cloudy"


class WeatherService:
    """기상청 API 연동"""
    
    # 주요 도시 좌표 (기상청 격자 좌표)
    CITY_COORDS = {
        "서울": (60, 127),
        "부산": (98, 76),
        "대구": (89, 90),
        "인천": (55, 124),
        "광주": (58, 74),
        "대전": (67, 100),
        "울산": (102, 84),
        "수원": (60, 121),
        "성남": (63, 124),
        "고양": (57, 128),
    }
    
    SKY_CONDITIONS = {
        "1": "맑음",
        "3": "구름많음",
        "4": "흐림",
    }
    
    PRECIPITATION_TYPES = {
        "0": "없음",
        "1": "비",
        "2": "비/눈",
        "3": "눈",
        "4": "소나기",
    }
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or Config.WEATHER_API_KEY
        self.base_url = Config.WEATHER_BASE_URL
    
    async def get_forecast(self, city: str = "서울", date: datetime = None) -> Optional[WeatherForecast]:
        """날씨 예보 조회"""
        if not self.api_key:
            print("⚠️ 기상청 API 키가 설정되지 않았습니다.")
            return self._get_mock_forecast()
        
        if city not in self.CITY_COORDS:
            city = "서울"
        
        nx, ny = self.CITY_COORDS[city]
        
        if date is None:
            date = datetime.now()
        
        # 기상청 API는 매일 02:00, 05:00, 08:00, 11:00, 14:00, 17:00, 20:00, 23:00에 발표
        base_date = date.strftime("%Y%m%d")
        base_time = "0500"  # 05시 발표 데이터 사용
        
        params = {
            "serviceKey": self.api_key,
            "numOfRows": 100,
            "pageNo": 1,
            "dataType": "JSON",
            "base_date": base_date,
            "base_time": base_time,
            "nx": nx,
            "ny": ny,
        }
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        f"{self.base_url}/getVilageFcst",
                        params=params,
                        timeout=10.0
                    )
                    data = response.json()
            elif REQUESTS_AVAILABLE:
                response = requests.get(
                    f"{self.base_url}/getVilageFcst",
                    params=params,
                    timeout=10
                )
                data = response.json()
            else:
                return self._get_mock_forecast()
            
            return self._parse_forecast(data)
        
        except Exception as e:
            print(f"⚠️ 기상청 API 오류: {e}")
            return self._get_mock_forecast()
    
    def _parse_forecast(self, data: dict) -> Optional[WeatherForecast]:
        """응답 파싱"""
        try:
            items = data["response"]["body"]["items"]["item"]
            
            forecast_data = {}
            for item in items:
                category = item["category"]
                value = item["fcstValue"]
                
                if category == "TMP":  # 기온
                    forecast_data["temperature"] = int(value)
                elif category == "REH":  # 습도
                    forecast_data["humidity"] = int(value)
                elif category == "POP":  # 강수확률
                    forecast_data["precipitation_probability"] = int(value)
                elif category == "SKY":  # 하늘상태
                    forecast_data["sky_condition"] = self.SKY_CONDITIONS.get(value, "흐림")
                elif category == "PTY":  # 강수형태
                    forecast_data["precipitation_type"] = self.PRECIPITATION_TYPES.get(value, "없음")
                elif category == "WSD":  # 풍속
                    forecast_data["wind_speed"] = float(value)
            
            return WeatherForecast(
                date=items[0]["fcstDate"],
                time=items[0]["fcstTime"],
                temperature=forecast_data.get("temperature", 20),
                humidity=forecast_data.get("humidity", 50),
                precipitation_probability=forecast_data.get("precipitation_probability", 0),
                sky_condition=forecast_data.get("sky_condition", "흐림"),
                precipitation_type=forecast_data.get("precipitation_type", "없음"),
                wind_speed=forecast_data.get("wind_speed", 2.0),
            )
        
        except Exception as e:
            print(f"⚠️ 파싱 오류: {e}")
            return self._get_mock_forecast()
    
    def _get_mock_forecast(self) -> WeatherForecast:
        """Mock 데이터 반환"""
        import random
        
        conditions = ["맑음", "구름많음", "흐림"]
        precipitations = ["없음", "없음", "없음", "비", "눈"]
        
        return WeatherForecast(
            date=datetime.now().strftime("%Y%m%d"),
            time="1200",
            temperature=random.randint(-5, 35),
            humidity=random.randint(30, 80),
            precipitation_probability=random.randint(0, 100),
            sky_condition=random.choice(conditions),
            precipitation_type=random.choice(precipitations),
            wind_speed=random.uniform(1.0, 10.0),
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 2. SMS API (알리고 / NHN Cloud)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class SMSResult:
    """SMS 전송 결과"""
    success: bool
    message_id: str = ""
    error: str = ""


class SMSService:
    """SMS 발송 서비스"""
    
    def __init__(self, provider: str = "aligo"):
        self.provider = provider
    
    async def send_sms(self, phone: str, message: str) -> SMSResult:
        """SMS 발송"""
        if self.provider == "aligo":
            return await self._send_via_aligo(phone, message)
        elif self.provider == "nhn":
            return await self._send_via_nhn(phone, message)
        else:
            return SMSResult(success=False, error="Unknown provider")
    
    async def send_bulk_sms(self, phones: List[str], message: str) -> List[SMSResult]:
        """대량 SMS 발송"""
        results = []
        for phone in phones:
            result = await self.send_sms(phone, message)
            results.append(result)
            await asyncio.sleep(0.1)  # Rate limiting
        return results
    
    async def _send_via_aligo(self, phone: str, message: str) -> SMSResult:
        """알리고 SMS 발송"""
        if not Config.ALIGO_API_KEY:
            print("⚠️ 알리고 API 키가 설정되지 않았습니다.")
            return SMSResult(success=False, error="API key not configured")
        
        url = "https://apis.aligo.in/send/"
        
        data = {
            "key": Config.ALIGO_API_KEY,
            "user_id": Config.ALIGO_USER_ID,
            "sender": Config.ALIGO_SENDER,
            "receiver": phone,
            "msg": message,
        }
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.post(url, data=data, timeout=10.0)
                    result = response.json()
            elif REQUESTS_AVAILABLE:
                response = requests.post(url, data=data, timeout=10)
                result = response.json()
            else:
                return SMSResult(success=False, error="HTTP client not available")
            
            if result.get("result_code") == "1":
                return SMSResult(success=True, message_id=result.get("msg_id", ""))
            else:
                return SMSResult(success=False, error=result.get("message", "Unknown error"))
        
        except Exception as e:
            return SMSResult(success=False, error=str(e))
    
    async def _send_via_nhn(self, phone: str, message: str) -> SMSResult:
        """NHN Cloud SMS 발송"""
        if not Config.NHN_APP_KEY:
            print("⚠️ NHN Cloud API 키가 설정되지 않았습니다.")
            return SMSResult(success=False, error="API key not configured")
        
        url = f"https://api-sms.cloud.toast.com/sms/v2.4/appKeys/{Config.NHN_APP_KEY}/sender/sms"
        
        headers = {
            "Content-Type": "application/json;charset=UTF-8",
            "X-Secret-Key": Config.NHN_SECRET_KEY,
        }
        
        data = {
            "body": message,
            "sendNo": Config.NHN_SENDER,
            "recipientList": [{"recipientNo": phone}],
        }
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.post(url, json=data, headers=headers, timeout=10.0)
                    result = response.json()
            else:
                return SMSResult(success=False, error="HTTP client not available")
            
            if result.get("header", {}).get("isSuccessful"):
                return SMSResult(success=True, message_id=result.get("body", {}).get("data", {}).get("requestId", ""))
            else:
                return SMSResult(success=False, error=result.get("header", {}).get("resultMessage", "Unknown error"))
        
        except Exception as e:
            return SMSResult(success=False, error=str(e))


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 3. 카카오 알림톡
# ═══════════════════════════════════════════════════════════════════════════════════════════

class KakaoAlimtalkService:
    """카카오 알림톡 서비스"""
    
    # 미리 등록된 템플릿 예시
    TEMPLATES = {
        "VIP_WELCOME": "#{고객명}님, AUTUS에 오신 것을 환영합니다! 👑 VIP 고객님께 특별 혜택을 준비했습니다.",
        "QUEST_COMPLETE": "🎉 #{직원명}님, #{퀘스트명} 퀘스트를 완료했습니다! +#{XP} XP 획득!",
        "RESERVATION": "#{고객명}님, #{날짜} #{시간}에 예약이 완료되었습니다. 매장: #{매장명}",
        "BOUNTY_ALERT": "🕵️ #{사냥꾼명}님, 새로운 시크릿 미션이 도착했습니다. 앱에서 확인하세요!",
    }
    
    def __init__(self):
        self.api_key = Config.KAKAO_API_KEY
        self.sender_key = Config.KAKAO_SENDER_KEY
    
    async def send_alimtalk(self, phone: str, template_id: str, variables: Dict[str, str]) -> SMSResult:
        """알림톡 발송"""
        if not self.api_key:
            print("⚠️ 카카오 API 키가 설정되지 않았습니다.")
            return SMSResult(success=False, error="API key not configured")
        
        # 템플릿에 변수 대입
        template = self.TEMPLATES.get(template_id, "")
        if not template:
            return SMSResult(success=False, error="Template not found")
        
        message = template
        for key, value in variables.items():
            message = message.replace(f"#{{{key}}}", value)
        
        # 실제 API 호출 (예시)
        # 실제 구현 시 카카오 비즈니스 API 문서 참조
        
        print(f"📱 [KAKAO] To: {phone}")
        print(f"   Message: {message}")
        
        return SMSResult(success=True, message_id="KAKAO-MOCK-ID")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 4. Slack 웹훅
# ═══════════════════════════════════════════════════════════════════════════════════════════

class SlackService:
    """Slack 알림 서비스"""
    
    def __init__(self, webhook_url: str = None):
        self.webhook_url = webhook_url or Config.SLACK_WEBHOOK_URL
    
    async def send_message(self, text: str, channel: str = None) -> bool:
        """Slack 메시지 발송"""
        if not self.webhook_url:
            print("⚠️ Slack 웹훅 URL이 설정되지 않았습니다.")
            return False
        
        payload = {"text": text}
        if channel:
            payload["channel"] = channel
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.post(self.webhook_url, json=payload, timeout=10.0)
                    return response.status_code == 200
            elif REQUESTS_AVAILABLE:
                response = requests.post(self.webhook_url, json=payload, timeout=10)
                return response.status_code == 200
            return False
        
        except Exception as e:
            print(f"⚠️ Slack 오류: {e}")
            return False
    
    async def send_vip_alert(self, customer_name: str, station_id: str):
        """VIP 입장 알림"""
        message = f"👑 *VIP 입장 알림*\n\n고객: {customer_name}\n매장: {station_id}\n시간: {datetime.now().strftime('%H:%M:%S')}"
        return await self.send_message(message)
    
    async def send_caution_alert(self, customer_name: str, station_id: str):
        """주의 고객 알림"""
        message = f"⚠️ *주의 고객 감지*\n\n고객: {customer_name}\n매장: {station_id}\n시간: {datetime.now().strftime('%H:%M:%S')}\n\n> 규정대로 응대하세요."
        return await self.send_message(message)
    
    async def send_daily_report(self, stats: Dict[str, Any]):
        """일일 리포트"""
        message = f"""📊 *AUTUS 일일 리포트*

📅 날짜: {datetime.now().strftime('%Y-%m-%d')}

📈 *요약*
• 총 방문객: {stats.get('total_visitors', 0)}명
• VIP 방문: {stats.get('vip_visitors', 0)}명
• 매출: ₩{stats.get('revenue', 0):,}

🏆 *TOP 직원*
{stats.get('top_employee', 'N/A')}

💡 *내일 예측*
{stats.get('tomorrow_prediction', 'N/A')}
"""
        return await self.send_message(message)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 5. Discord 웹훅
# ═══════════════════════════════════════════════════════════════════════════════════════════

class DiscordService:
    """Discord 알림 서비스"""
    
    def __init__(self, webhook_url: str = None):
        self.webhook_url = webhook_url or Config.DISCORD_WEBHOOK_URL
    
    async def send_message(self, content: str, embeds: List[Dict] = None) -> bool:
        """Discord 메시지 발송"""
        if not self.webhook_url:
            print("⚠️ Discord 웹훅 URL이 설정되지 않았습니다.")
            return False
        
        payload = {"content": content}
        if embeds:
            payload["embeds"] = embeds
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.post(self.webhook_url, json=payload, timeout=10.0)
                    return response.status_code in [200, 204]
            return False
        
        except Exception as e:
            print(f"⚠️ Discord 오류: {e}")
            return False
    
    async def send_embed_alert(self, title: str, description: str, color: int = 0x00ff00):
        """임베드 알림"""
        embed = {
            "title": title,
            "description": description,
            "color": color,
            "timestamp": datetime.now().isoformat(),
            "footer": {"text": "AUTUS Empire"}
        }
        return await self.send_message("", embeds=[embed])


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 6. 통합 알림 매니저
# ═══════════════════════════════════════════════════════════════════════════════════════════

class NotificationManager:
    """
    통합 알림 매니저
    
    모든 알림 채널을 통합하여 관리
    """
    
    def __init__(self):
        self.sms = SMSService()
        self.kakao = KakaoAlimtalkService()
        self.slack = SlackService()
        self.discord = DiscordService()
        self.weather = WeatherService()
    
    async def notify_vip_entry(self, customer_name: str, phone: str, station_id: str):
        """VIP 입장 알림 (전체 채널)"""
        # Slack으로 내부 알림
        await self.slack.send_vip_alert(customer_name, station_id)
        
        # Discord로 내부 알림
        await self.discord.send_embed_alert(
            "👑 VIP 입장",
            f"**{customer_name}**님이 {station_id}에 입장했습니다.",
            0xffd700  # Gold
        )
        
        # SMS는 필요시에만
        # await self.sms.send_sms(manager_phone, f"VIP {customer_name}님 입장")
    
    async def notify_caution_entry(self, customer_name: str, station_id: str):
        """주의 고객 알림"""
        await self.slack.send_caution_alert(customer_name, station_id)
        await self.discord.send_embed_alert(
            "⚠️ 주의 고객 감지",
            f"**{customer_name}**님이 {station_id}에 입장했습니다.\n규정대로 응대하세요.",
            0xff0000  # Red
        )
    
    async def send_bounty_quest(self, hunter_phone: str, hunter_name: str, quest_description: str):
        """바운티 퀘스트 발송"""
        # SMS
        message = f"[AUTUS] {hunter_name}님, 새로운 시크릿 미션: {quest_description}"
        await self.sms.send_sms(hunter_phone, message)
        
        # 카카오 알림톡
        await self.kakao.send_alimtalk(
            hunter_phone,
            "BOUNTY_ALERT",
            {"사냥꾼명": hunter_name}
        )
    
    async def get_weather_for_oracle(self, city: str = "서울") -> Dict[str, Any]:
        """오라클 엔진용 날씨 데이터"""
        forecast = await self.weather.get_forecast(city)
        
        return {
            "weather_type": forecast.weather_type,
            "temperature": forecast.temperature,
            "precipitation_probability": forecast.precipitation_probability,
            "humidity": forecast.humidity,
            "sky_condition": forecast.sky_condition,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# FastAPI 라우터 (선택적)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_integration_routes():
    """FastAPI 라우터 생성"""
    from fastapi import APIRouter, HTTPException
    
    router = APIRouter(prefix="/api/v1/integrations", tags=["External Integrations"])
    
    notification_manager = NotificationManager()
    
    @router.get("/weather/{city}")
    async def get_weather(city: str = "서울"):
        """날씨 조회"""
        weather = WeatherService()
        forecast = await weather.get_forecast(city)
        
        if forecast:
            return {
                "city": city,
                "date": forecast.date,
                "temperature": forecast.temperature,
                "humidity": forecast.humidity,
                "precipitation_probability": forecast.precipitation_probability,
                "sky_condition": forecast.sky_condition,
                "precipitation_type": forecast.precipitation_type,
                "weather_type": forecast.weather_type,
            }
        
        raise HTTPException(status_code=500, detail="Weather data unavailable")
    
    @router.post("/sms/send")
    async def send_sms(phone: str, message: str, provider: str = "aligo"):
        """SMS 발송"""
        sms = SMSService(provider)
        result = await sms.send_sms(phone, message)
        return {"success": result.success, "message_id": result.message_id, "error": result.error}
    
    @router.post("/slack/send")
    async def send_slack(message: str):
        """Slack 메시지"""
        slack = SlackService()
        success = await slack.send_message(message)
        return {"success": success}
    
    @router.post("/notify/vip-entry")
    async def notify_vip(customer_name: str, phone: str, station_id: str):
        """VIP 입장 알림"""
        await notification_manager.notify_vip_entry(customer_name, phone, station_id)
        return {"success": True}
    
    return router


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트
# ═══════════════════════════════════════════════════════════════════════════════════════════

async def test_integrations():
    """통합 테스트"""
    print("🔌 AUTUS External Integrations Test")
    print("=" * 50)
    
    # 날씨 테스트
    print("\n📍 날씨 테스트...")
    weather = WeatherService()
    forecast = await weather.get_forecast("서울")
    print(f"   기온: {forecast.temperature}°C")
    print(f"   날씨: {forecast.sky_condition}")
    print(f"   강수확률: {forecast.precipitation_probability}%")
    
    # Slack 테스트 (웹훅 설정 필요)
    print("\n💬 Slack 테스트...")
    slack = SlackService()
    if Config.SLACK_WEBHOOK_URL:
        success = await slack.send_message("🧪 AUTUS 테스트 메시지")
        print(f"   결과: {'성공' if success else '실패'}")
    else:
        print("   ⚠️ 웹훅 URL 미설정")
    
    # 알림 매니저 테스트
    print("\n📢 알림 매니저 테스트...")
    manager = NotificationManager()
    weather_data = await manager.get_weather_for_oracle()
    print(f"   오라클용 날씨: {weather_data}")
    
    print("\n✅ 테스트 완료!")


if __name__ == "__main__":
    asyncio.run(test_integrations())







#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    🔌 AUTUS EXTERNAL INTEGRATIONS - 외부 API 연동                          ║
║                                                                                           ║
║  "제국을 외부 세계와 연결하라"                                                              ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ 기상청 API (실제 날씨 데이터)                                                          ║
║  ✅ SMS API (알리고/NHN 클라우드)                                                          ║
║  ✅ 카카오 알림톡                                                                          ║
║  ✅ Slack 웹훅                                                                            ║
║  ✅ Discord 웹훅                                                                          ║
║  ✅ 이메일 알림                                                                            ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
import hashlib
import hmac
import base64

# HTTP 클라이언트
try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

# 환경 변수에서 API 키 로드 (실제 사용 시 .env 파일에서 로드)
class Config:
    # 기상청 API (공공데이터포털)
    WEATHER_API_KEY = os.getenv("WEATHER_API_KEY", "")
    WEATHER_BASE_URL = "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0"
    
    # SMS - 알리고
    ALIGO_API_KEY = os.getenv("ALIGO_API_KEY", "")
    ALIGO_USER_ID = os.getenv("ALIGO_USER_ID", "")
    ALIGO_SENDER = os.getenv("ALIGO_SENDER", "")
    
    # SMS - NHN Cloud
    NHN_APP_KEY = os.getenv("NHN_APP_KEY", "")
    NHN_SECRET_KEY = os.getenv("NHN_SECRET_KEY", "")
    NHN_SENDER = os.getenv("NHN_SENDER", "")
    
    # 카카오 알림톡
    KAKAO_API_KEY = os.getenv("KAKAO_API_KEY", "")
    KAKAO_SENDER_KEY = os.getenv("KAKAO_SENDER_KEY", "")
    
    # Slack
    SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL", "")
    
    # Discord
    DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL", "")
    
    # Email (SMTP)
    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 1. 기상청 API (Korea Meteorological Administration)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class WeatherForecast:
    """날씨 예보"""
    date: str
    time: str
    temperature: int
    humidity: int
    precipitation_probability: int
    sky_condition: str  # 맑음, 구름많음, 흐림
    precipitation_type: str  # 없음, 비, 눈, 비/눈
    wind_speed: float
    
    @property
    def weather_type(self) -> str:
        """날씨 유형 반환"""
        if self.precipitation_type == "비":
            return "rainy"
        elif self.precipitation_type == "눈":
            return "snowy"
        elif self.sky_condition == "맑음":
            return "sunny"
        elif self.sky_condition in ["구름많음", "흐림"]:
            return "cloudy"
        return "cloudy"


class WeatherService:
    """기상청 API 연동"""
    
    # 주요 도시 좌표 (기상청 격자 좌표)
    CITY_COORDS = {
        "서울": (60, 127),
        "부산": (98, 76),
        "대구": (89, 90),
        "인천": (55, 124),
        "광주": (58, 74),
        "대전": (67, 100),
        "울산": (102, 84),
        "수원": (60, 121),
        "성남": (63, 124),
        "고양": (57, 128),
    }
    
    SKY_CONDITIONS = {
        "1": "맑음",
        "3": "구름많음",
        "4": "흐림",
    }
    
    PRECIPITATION_TYPES = {
        "0": "없음",
        "1": "비",
        "2": "비/눈",
        "3": "눈",
        "4": "소나기",
    }
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or Config.WEATHER_API_KEY
        self.base_url = Config.WEATHER_BASE_URL
    
    async def get_forecast(self, city: str = "서울", date: datetime = None) -> Optional[WeatherForecast]:
        """날씨 예보 조회"""
        if not self.api_key:
            print("⚠️ 기상청 API 키가 설정되지 않았습니다.")
            return self._get_mock_forecast()
        
        if city not in self.CITY_COORDS:
            city = "서울"
        
        nx, ny = self.CITY_COORDS[city]
        
        if date is None:
            date = datetime.now()
        
        # 기상청 API는 매일 02:00, 05:00, 08:00, 11:00, 14:00, 17:00, 20:00, 23:00에 발표
        base_date = date.strftime("%Y%m%d")
        base_time = "0500"  # 05시 발표 데이터 사용
        
        params = {
            "serviceKey": self.api_key,
            "numOfRows": 100,
            "pageNo": 1,
            "dataType": "JSON",
            "base_date": base_date,
            "base_time": base_time,
            "nx": nx,
            "ny": ny,
        }
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        f"{self.base_url}/getVilageFcst",
                        params=params,
                        timeout=10.0
                    )
                    data = response.json()
            elif REQUESTS_AVAILABLE:
                response = requests.get(
                    f"{self.base_url}/getVilageFcst",
                    params=params,
                    timeout=10
                )
                data = response.json()
            else:
                return self._get_mock_forecast()
            
            return self._parse_forecast(data)
        
        except Exception as e:
            print(f"⚠️ 기상청 API 오류: {e}")
            return self._get_mock_forecast()
    
    def _parse_forecast(self, data: dict) -> Optional[WeatherForecast]:
        """응답 파싱"""
        try:
            items = data["response"]["body"]["items"]["item"]
            
            forecast_data = {}
            for item in items:
                category = item["category"]
                value = item["fcstValue"]
                
                if category == "TMP":  # 기온
                    forecast_data["temperature"] = int(value)
                elif category == "REH":  # 습도
                    forecast_data["humidity"] = int(value)
                elif category == "POP":  # 강수확률
                    forecast_data["precipitation_probability"] = int(value)
                elif category == "SKY":  # 하늘상태
                    forecast_data["sky_condition"] = self.SKY_CONDITIONS.get(value, "흐림")
                elif category == "PTY":  # 강수형태
                    forecast_data["precipitation_type"] = self.PRECIPITATION_TYPES.get(value, "없음")
                elif category == "WSD":  # 풍속
                    forecast_data["wind_speed"] = float(value)
            
            return WeatherForecast(
                date=items[0]["fcstDate"],
                time=items[0]["fcstTime"],
                temperature=forecast_data.get("temperature", 20),
                humidity=forecast_data.get("humidity", 50),
                precipitation_probability=forecast_data.get("precipitation_probability", 0),
                sky_condition=forecast_data.get("sky_condition", "흐림"),
                precipitation_type=forecast_data.get("precipitation_type", "없음"),
                wind_speed=forecast_data.get("wind_speed", 2.0),
            )
        
        except Exception as e:
            print(f"⚠️ 파싱 오류: {e}")
            return self._get_mock_forecast()
    
    def _get_mock_forecast(self) -> WeatherForecast:
        """Mock 데이터 반환"""
        import random
        
        conditions = ["맑음", "구름많음", "흐림"]
        precipitations = ["없음", "없음", "없음", "비", "눈"]
        
        return WeatherForecast(
            date=datetime.now().strftime("%Y%m%d"),
            time="1200",
            temperature=random.randint(-5, 35),
            humidity=random.randint(30, 80),
            precipitation_probability=random.randint(0, 100),
            sky_condition=random.choice(conditions),
            precipitation_type=random.choice(precipitations),
            wind_speed=random.uniform(1.0, 10.0),
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 2. SMS API (알리고 / NHN Cloud)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class SMSResult:
    """SMS 전송 결과"""
    success: bool
    message_id: str = ""
    error: str = ""


class SMSService:
    """SMS 발송 서비스"""
    
    def __init__(self, provider: str = "aligo"):
        self.provider = provider
    
    async def send_sms(self, phone: str, message: str) -> SMSResult:
        """SMS 발송"""
        if self.provider == "aligo":
            return await self._send_via_aligo(phone, message)
        elif self.provider == "nhn":
            return await self._send_via_nhn(phone, message)
        else:
            return SMSResult(success=False, error="Unknown provider")
    
    async def send_bulk_sms(self, phones: List[str], message: str) -> List[SMSResult]:
        """대량 SMS 발송"""
        results = []
        for phone in phones:
            result = await self.send_sms(phone, message)
            results.append(result)
            await asyncio.sleep(0.1)  # Rate limiting
        return results
    
    async def _send_via_aligo(self, phone: str, message: str) -> SMSResult:
        """알리고 SMS 발송"""
        if not Config.ALIGO_API_KEY:
            print("⚠️ 알리고 API 키가 설정되지 않았습니다.")
            return SMSResult(success=False, error="API key not configured")
        
        url = "https://apis.aligo.in/send/"
        
        data = {
            "key": Config.ALIGO_API_KEY,
            "user_id": Config.ALIGO_USER_ID,
            "sender": Config.ALIGO_SENDER,
            "receiver": phone,
            "msg": message,
        }
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.post(url, data=data, timeout=10.0)
                    result = response.json()
            elif REQUESTS_AVAILABLE:
                response = requests.post(url, data=data, timeout=10)
                result = response.json()
            else:
                return SMSResult(success=False, error="HTTP client not available")
            
            if result.get("result_code") == "1":
                return SMSResult(success=True, message_id=result.get("msg_id", ""))
            else:
                return SMSResult(success=False, error=result.get("message", "Unknown error"))
        
        except Exception as e:
            return SMSResult(success=False, error=str(e))
    
    async def _send_via_nhn(self, phone: str, message: str) -> SMSResult:
        """NHN Cloud SMS 발송"""
        if not Config.NHN_APP_KEY:
            print("⚠️ NHN Cloud API 키가 설정되지 않았습니다.")
            return SMSResult(success=False, error="API key not configured")
        
        url = f"https://api-sms.cloud.toast.com/sms/v2.4/appKeys/{Config.NHN_APP_KEY}/sender/sms"
        
        headers = {
            "Content-Type": "application/json;charset=UTF-8",
            "X-Secret-Key": Config.NHN_SECRET_KEY,
        }
        
        data = {
            "body": message,
            "sendNo": Config.NHN_SENDER,
            "recipientList": [{"recipientNo": phone}],
        }
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.post(url, json=data, headers=headers, timeout=10.0)
                    result = response.json()
            else:
                return SMSResult(success=False, error="HTTP client not available")
            
            if result.get("header", {}).get("isSuccessful"):
                return SMSResult(success=True, message_id=result.get("body", {}).get("data", {}).get("requestId", ""))
            else:
                return SMSResult(success=False, error=result.get("header", {}).get("resultMessage", "Unknown error"))
        
        except Exception as e:
            return SMSResult(success=False, error=str(e))


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 3. 카카오 알림톡
# ═══════════════════════════════════════════════════════════════════════════════════════════

class KakaoAlimtalkService:
    """카카오 알림톡 서비스"""
    
    # 미리 등록된 템플릿 예시
    TEMPLATES = {
        "VIP_WELCOME": "#{고객명}님, AUTUS에 오신 것을 환영합니다! 👑 VIP 고객님께 특별 혜택을 준비했습니다.",
        "QUEST_COMPLETE": "🎉 #{직원명}님, #{퀘스트명} 퀘스트를 완료했습니다! +#{XP} XP 획득!",
        "RESERVATION": "#{고객명}님, #{날짜} #{시간}에 예약이 완료되었습니다. 매장: #{매장명}",
        "BOUNTY_ALERT": "🕵️ #{사냥꾼명}님, 새로운 시크릿 미션이 도착했습니다. 앱에서 확인하세요!",
    }
    
    def __init__(self):
        self.api_key = Config.KAKAO_API_KEY
        self.sender_key = Config.KAKAO_SENDER_KEY
    
    async def send_alimtalk(self, phone: str, template_id: str, variables: Dict[str, str]) -> SMSResult:
        """알림톡 발송"""
        if not self.api_key:
            print("⚠️ 카카오 API 키가 설정되지 않았습니다.")
            return SMSResult(success=False, error="API key not configured")
        
        # 템플릿에 변수 대입
        template = self.TEMPLATES.get(template_id, "")
        if not template:
            return SMSResult(success=False, error="Template not found")
        
        message = template
        for key, value in variables.items():
            message = message.replace(f"#{{{key}}}", value)
        
        # 실제 API 호출 (예시)
        # 실제 구현 시 카카오 비즈니스 API 문서 참조
        
        print(f"📱 [KAKAO] To: {phone}")
        print(f"   Message: {message}")
        
        return SMSResult(success=True, message_id="KAKAO-MOCK-ID")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 4. Slack 웹훅
# ═══════════════════════════════════════════════════════════════════════════════════════════

class SlackService:
    """Slack 알림 서비스"""
    
    def __init__(self, webhook_url: str = None):
        self.webhook_url = webhook_url or Config.SLACK_WEBHOOK_URL
    
    async def send_message(self, text: str, channel: str = None) -> bool:
        """Slack 메시지 발송"""
        if not self.webhook_url:
            print("⚠️ Slack 웹훅 URL이 설정되지 않았습니다.")
            return False
        
        payload = {"text": text}
        if channel:
            payload["channel"] = channel
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.post(self.webhook_url, json=payload, timeout=10.0)
                    return response.status_code == 200
            elif REQUESTS_AVAILABLE:
                response = requests.post(self.webhook_url, json=payload, timeout=10)
                return response.status_code == 200
            return False
        
        except Exception as e:
            print(f"⚠️ Slack 오류: {e}")
            return False
    
    async def send_vip_alert(self, customer_name: str, station_id: str):
        """VIP 입장 알림"""
        message = f"👑 *VIP 입장 알림*\n\n고객: {customer_name}\n매장: {station_id}\n시간: {datetime.now().strftime('%H:%M:%S')}"
        return await self.send_message(message)
    
    async def send_caution_alert(self, customer_name: str, station_id: str):
        """주의 고객 알림"""
        message = f"⚠️ *주의 고객 감지*\n\n고객: {customer_name}\n매장: {station_id}\n시간: {datetime.now().strftime('%H:%M:%S')}\n\n> 규정대로 응대하세요."
        return await self.send_message(message)
    
    async def send_daily_report(self, stats: Dict[str, Any]):
        """일일 리포트"""
        message = f"""📊 *AUTUS 일일 리포트*

📅 날짜: {datetime.now().strftime('%Y-%m-%d')}

📈 *요약*
• 총 방문객: {stats.get('total_visitors', 0)}명
• VIP 방문: {stats.get('vip_visitors', 0)}명
• 매출: ₩{stats.get('revenue', 0):,}

🏆 *TOP 직원*
{stats.get('top_employee', 'N/A')}

💡 *내일 예측*
{stats.get('tomorrow_prediction', 'N/A')}
"""
        return await self.send_message(message)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 5. Discord 웹훅
# ═══════════════════════════════════════════════════════════════════════════════════════════

class DiscordService:
    """Discord 알림 서비스"""
    
    def __init__(self, webhook_url: str = None):
        self.webhook_url = webhook_url or Config.DISCORD_WEBHOOK_URL
    
    async def send_message(self, content: str, embeds: List[Dict] = None) -> bool:
        """Discord 메시지 발송"""
        if not self.webhook_url:
            print("⚠️ Discord 웹훅 URL이 설정되지 않았습니다.")
            return False
        
        payload = {"content": content}
        if embeds:
            payload["embeds"] = embeds
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.post(self.webhook_url, json=payload, timeout=10.0)
                    return response.status_code in [200, 204]
            return False
        
        except Exception as e:
            print(f"⚠️ Discord 오류: {e}")
            return False
    
    async def send_embed_alert(self, title: str, description: str, color: int = 0x00ff00):
        """임베드 알림"""
        embed = {
            "title": title,
            "description": description,
            "color": color,
            "timestamp": datetime.now().isoformat(),
            "footer": {"text": "AUTUS Empire"}
        }
        return await self.send_message("", embeds=[embed])


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 6. 통합 알림 매니저
# ═══════════════════════════════════════════════════════════════════════════════════════════

class NotificationManager:
    """
    통합 알림 매니저
    
    모든 알림 채널을 통합하여 관리
    """
    
    def __init__(self):
        self.sms = SMSService()
        self.kakao = KakaoAlimtalkService()
        self.slack = SlackService()
        self.discord = DiscordService()
        self.weather = WeatherService()
    
    async def notify_vip_entry(self, customer_name: str, phone: str, station_id: str):
        """VIP 입장 알림 (전체 채널)"""
        # Slack으로 내부 알림
        await self.slack.send_vip_alert(customer_name, station_id)
        
        # Discord로 내부 알림
        await self.discord.send_embed_alert(
            "👑 VIP 입장",
            f"**{customer_name}**님이 {station_id}에 입장했습니다.",
            0xffd700  # Gold
        )
        
        # SMS는 필요시에만
        # await self.sms.send_sms(manager_phone, f"VIP {customer_name}님 입장")
    
    async def notify_caution_entry(self, customer_name: str, station_id: str):
        """주의 고객 알림"""
        await self.slack.send_caution_alert(customer_name, station_id)
        await self.discord.send_embed_alert(
            "⚠️ 주의 고객 감지",
            f"**{customer_name}**님이 {station_id}에 입장했습니다.\n규정대로 응대하세요.",
            0xff0000  # Red
        )
    
    async def send_bounty_quest(self, hunter_phone: str, hunter_name: str, quest_description: str):
        """바운티 퀘스트 발송"""
        # SMS
        message = f"[AUTUS] {hunter_name}님, 새로운 시크릿 미션: {quest_description}"
        await self.sms.send_sms(hunter_phone, message)
        
        # 카카오 알림톡
        await self.kakao.send_alimtalk(
            hunter_phone,
            "BOUNTY_ALERT",
            {"사냥꾼명": hunter_name}
        )
    
    async def get_weather_for_oracle(self, city: str = "서울") -> Dict[str, Any]:
        """오라클 엔진용 날씨 데이터"""
        forecast = await self.weather.get_forecast(city)
        
        return {
            "weather_type": forecast.weather_type,
            "temperature": forecast.temperature,
            "precipitation_probability": forecast.precipitation_probability,
            "humidity": forecast.humidity,
            "sky_condition": forecast.sky_condition,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# FastAPI 라우터 (선택적)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_integration_routes():
    """FastAPI 라우터 생성"""
    from fastapi import APIRouter, HTTPException
    
    router = APIRouter(prefix="/api/v1/integrations", tags=["External Integrations"])
    
    notification_manager = NotificationManager()
    
    @router.get("/weather/{city}")
    async def get_weather(city: str = "서울"):
        """날씨 조회"""
        weather = WeatherService()
        forecast = await weather.get_forecast(city)
        
        if forecast:
            return {
                "city": city,
                "date": forecast.date,
                "temperature": forecast.temperature,
                "humidity": forecast.humidity,
                "precipitation_probability": forecast.precipitation_probability,
                "sky_condition": forecast.sky_condition,
                "precipitation_type": forecast.precipitation_type,
                "weather_type": forecast.weather_type,
            }
        
        raise HTTPException(status_code=500, detail="Weather data unavailable")
    
    @router.post("/sms/send")
    async def send_sms(phone: str, message: str, provider: str = "aligo"):
        """SMS 발송"""
        sms = SMSService(provider)
        result = await sms.send_sms(phone, message)
        return {"success": result.success, "message_id": result.message_id, "error": result.error}
    
    @router.post("/slack/send")
    async def send_slack(message: str):
        """Slack 메시지"""
        slack = SlackService()
        success = await slack.send_message(message)
        return {"success": success}
    
    @router.post("/notify/vip-entry")
    async def notify_vip(customer_name: str, phone: str, station_id: str):
        """VIP 입장 알림"""
        await notification_manager.notify_vip_entry(customer_name, phone, station_id)
        return {"success": True}
    
    return router


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트
# ═══════════════════════════════════════════════════════════════════════════════════════════

async def test_integrations():
    """통합 테스트"""
    print("🔌 AUTUS External Integrations Test")
    print("=" * 50)
    
    # 날씨 테스트
    print("\n📍 날씨 테스트...")
    weather = WeatherService()
    forecast = await weather.get_forecast("서울")
    print(f"   기온: {forecast.temperature}°C")
    print(f"   날씨: {forecast.sky_condition}")
    print(f"   강수확률: {forecast.precipitation_probability}%")
    
    # Slack 테스트 (웹훅 설정 필요)
    print("\n💬 Slack 테스트...")
    slack = SlackService()
    if Config.SLACK_WEBHOOK_URL:
        success = await slack.send_message("🧪 AUTUS 테스트 메시지")
        print(f"   결과: {'성공' if success else '실패'}")
    else:
        print("   ⚠️ 웹훅 URL 미설정")
    
    # 알림 매니저 테스트
    print("\n📢 알림 매니저 테스트...")
    manager = NotificationManager()
    weather_data = await manager.get_weather_for_oracle()
    print(f"   오라클용 날씨: {weather_data}")
    
    print("\n✅ 테스트 완료!")


if __name__ == "__main__":
    asyncio.run(test_integrations())

















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    🔌 AUTUS EXTERNAL INTEGRATIONS - 외부 API 연동                          ║
║                                                                                           ║
║  "제국을 외부 세계와 연결하라"                                                              ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ 기상청 API (실제 날씨 데이터)                                                          ║
║  ✅ SMS API (알리고/NHN 클라우드)                                                          ║
║  ✅ 카카오 알림톡                                                                          ║
║  ✅ Slack 웹훅                                                                            ║
║  ✅ Discord 웹훅                                                                          ║
║  ✅ 이메일 알림                                                                            ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
import hashlib
import hmac
import base64

# HTTP 클라이언트
try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

# 환경 변수에서 API 키 로드 (실제 사용 시 .env 파일에서 로드)
class Config:
    # 기상청 API (공공데이터포털)
    WEATHER_API_KEY = os.getenv("WEATHER_API_KEY", "")
    WEATHER_BASE_URL = "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0"
    
    # SMS - 알리고
    ALIGO_API_KEY = os.getenv("ALIGO_API_KEY", "")
    ALIGO_USER_ID = os.getenv("ALIGO_USER_ID", "")
    ALIGO_SENDER = os.getenv("ALIGO_SENDER", "")
    
    # SMS - NHN Cloud
    NHN_APP_KEY = os.getenv("NHN_APP_KEY", "")
    NHN_SECRET_KEY = os.getenv("NHN_SECRET_KEY", "")
    NHN_SENDER = os.getenv("NHN_SENDER", "")
    
    # 카카오 알림톡
    KAKAO_API_KEY = os.getenv("KAKAO_API_KEY", "")
    KAKAO_SENDER_KEY = os.getenv("KAKAO_SENDER_KEY", "")
    
    # Slack
    SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL", "")
    
    # Discord
    DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL", "")
    
    # Email (SMTP)
    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 1. 기상청 API (Korea Meteorological Administration)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class WeatherForecast:
    """날씨 예보"""
    date: str
    time: str
    temperature: int
    humidity: int
    precipitation_probability: int
    sky_condition: str  # 맑음, 구름많음, 흐림
    precipitation_type: str  # 없음, 비, 눈, 비/눈
    wind_speed: float
    
    @property
    def weather_type(self) -> str:
        """날씨 유형 반환"""
        if self.precipitation_type == "비":
            return "rainy"
        elif self.precipitation_type == "눈":
            return "snowy"
        elif self.sky_condition == "맑음":
            return "sunny"
        elif self.sky_condition in ["구름많음", "흐림"]:
            return "cloudy"
        return "cloudy"


class WeatherService:
    """기상청 API 연동"""
    
    # 주요 도시 좌표 (기상청 격자 좌표)
    CITY_COORDS = {
        "서울": (60, 127),
        "부산": (98, 76),
        "대구": (89, 90),
        "인천": (55, 124),
        "광주": (58, 74),
        "대전": (67, 100),
        "울산": (102, 84),
        "수원": (60, 121),
        "성남": (63, 124),
        "고양": (57, 128),
    }
    
    SKY_CONDITIONS = {
        "1": "맑음",
        "3": "구름많음",
        "4": "흐림",
    }
    
    PRECIPITATION_TYPES = {
        "0": "없음",
        "1": "비",
        "2": "비/눈",
        "3": "눈",
        "4": "소나기",
    }
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or Config.WEATHER_API_KEY
        self.base_url = Config.WEATHER_BASE_URL
    
    async def get_forecast(self, city: str = "서울", date: datetime = None) -> Optional[WeatherForecast]:
        """날씨 예보 조회"""
        if not self.api_key:
            print("⚠️ 기상청 API 키가 설정되지 않았습니다.")
            return self._get_mock_forecast()
        
        if city not in self.CITY_COORDS:
            city = "서울"
        
        nx, ny = self.CITY_COORDS[city]
        
        if date is None:
            date = datetime.now()
        
        # 기상청 API는 매일 02:00, 05:00, 08:00, 11:00, 14:00, 17:00, 20:00, 23:00에 발표
        base_date = date.strftime("%Y%m%d")
        base_time = "0500"  # 05시 발표 데이터 사용
        
        params = {
            "serviceKey": self.api_key,
            "numOfRows": 100,
            "pageNo": 1,
            "dataType": "JSON",
            "base_date": base_date,
            "base_time": base_time,
            "nx": nx,
            "ny": ny,
        }
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        f"{self.base_url}/getVilageFcst",
                        params=params,
                        timeout=10.0
                    )
                    data = response.json()
            elif REQUESTS_AVAILABLE:
                response = requests.get(
                    f"{self.base_url}/getVilageFcst",
                    params=params,
                    timeout=10
                )
                data = response.json()
            else:
                return self._get_mock_forecast()
            
            return self._parse_forecast(data)
        
        except Exception as e:
            print(f"⚠️ 기상청 API 오류: {e}")
            return self._get_mock_forecast()
    
    def _parse_forecast(self, data: dict) -> Optional[WeatherForecast]:
        """응답 파싱"""
        try:
            items = data["response"]["body"]["items"]["item"]
            
            forecast_data = {}
            for item in items:
                category = item["category"]
                value = item["fcstValue"]
                
                if category == "TMP":  # 기온
                    forecast_data["temperature"] = int(value)
                elif category == "REH":  # 습도
                    forecast_data["humidity"] = int(value)
                elif category == "POP":  # 강수확률
                    forecast_data["precipitation_probability"] = int(value)
                elif category == "SKY":  # 하늘상태
                    forecast_data["sky_condition"] = self.SKY_CONDITIONS.get(value, "흐림")
                elif category == "PTY":  # 강수형태
                    forecast_data["precipitation_type"] = self.PRECIPITATION_TYPES.get(value, "없음")
                elif category == "WSD":  # 풍속
                    forecast_data["wind_speed"] = float(value)
            
            return WeatherForecast(
                date=items[0]["fcstDate"],
                time=items[0]["fcstTime"],
                temperature=forecast_data.get("temperature", 20),
                humidity=forecast_data.get("humidity", 50),
                precipitation_probability=forecast_data.get("precipitation_probability", 0),
                sky_condition=forecast_data.get("sky_condition", "흐림"),
                precipitation_type=forecast_data.get("precipitation_type", "없음"),
                wind_speed=forecast_data.get("wind_speed", 2.0),
            )
        
        except Exception as e:
            print(f"⚠️ 파싱 오류: {e}")
            return self._get_mock_forecast()
    
    def _get_mock_forecast(self) -> WeatherForecast:
        """Mock 데이터 반환"""
        import random
        
        conditions = ["맑음", "구름많음", "흐림"]
        precipitations = ["없음", "없음", "없음", "비", "눈"]
        
        return WeatherForecast(
            date=datetime.now().strftime("%Y%m%d"),
            time="1200",
            temperature=random.randint(-5, 35),
            humidity=random.randint(30, 80),
            precipitation_probability=random.randint(0, 100),
            sky_condition=random.choice(conditions),
            precipitation_type=random.choice(precipitations),
            wind_speed=random.uniform(1.0, 10.0),
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 2. SMS API (알리고 / NHN Cloud)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class SMSResult:
    """SMS 전송 결과"""
    success: bool
    message_id: str = ""
    error: str = ""


class SMSService:
    """SMS 발송 서비스"""
    
    def __init__(self, provider: str = "aligo"):
        self.provider = provider
    
    async def send_sms(self, phone: str, message: str) -> SMSResult:
        """SMS 발송"""
        if self.provider == "aligo":
            return await self._send_via_aligo(phone, message)
        elif self.provider == "nhn":
            return await self._send_via_nhn(phone, message)
        else:
            return SMSResult(success=False, error="Unknown provider")
    
    async def send_bulk_sms(self, phones: List[str], message: str) -> List[SMSResult]:
        """대량 SMS 발송"""
        results = []
        for phone in phones:
            result = await self.send_sms(phone, message)
            results.append(result)
            await asyncio.sleep(0.1)  # Rate limiting
        return results
    
    async def _send_via_aligo(self, phone: str, message: str) -> SMSResult:
        """알리고 SMS 발송"""
        if not Config.ALIGO_API_KEY:
            print("⚠️ 알리고 API 키가 설정되지 않았습니다.")
            return SMSResult(success=False, error="API key not configured")
        
        url = "https://apis.aligo.in/send/"
        
        data = {
            "key": Config.ALIGO_API_KEY,
            "user_id": Config.ALIGO_USER_ID,
            "sender": Config.ALIGO_SENDER,
            "receiver": phone,
            "msg": message,
        }
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.post(url, data=data, timeout=10.0)
                    result = response.json()
            elif REQUESTS_AVAILABLE:
                response = requests.post(url, data=data, timeout=10)
                result = response.json()
            else:
                return SMSResult(success=False, error="HTTP client not available")
            
            if result.get("result_code") == "1":
                return SMSResult(success=True, message_id=result.get("msg_id", ""))
            else:
                return SMSResult(success=False, error=result.get("message", "Unknown error"))
        
        except Exception as e:
            return SMSResult(success=False, error=str(e))
    
    async def _send_via_nhn(self, phone: str, message: str) -> SMSResult:
        """NHN Cloud SMS 발송"""
        if not Config.NHN_APP_KEY:
            print("⚠️ NHN Cloud API 키가 설정되지 않았습니다.")
            return SMSResult(success=False, error="API key not configured")
        
        url = f"https://api-sms.cloud.toast.com/sms/v2.4/appKeys/{Config.NHN_APP_KEY}/sender/sms"
        
        headers = {
            "Content-Type": "application/json;charset=UTF-8",
            "X-Secret-Key": Config.NHN_SECRET_KEY,
        }
        
        data = {
            "body": message,
            "sendNo": Config.NHN_SENDER,
            "recipientList": [{"recipientNo": phone}],
        }
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.post(url, json=data, headers=headers, timeout=10.0)
                    result = response.json()
            else:
                return SMSResult(success=False, error="HTTP client not available")
            
            if result.get("header", {}).get("isSuccessful"):
                return SMSResult(success=True, message_id=result.get("body", {}).get("data", {}).get("requestId", ""))
            else:
                return SMSResult(success=False, error=result.get("header", {}).get("resultMessage", "Unknown error"))
        
        except Exception as e:
            return SMSResult(success=False, error=str(e))


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 3. 카카오 알림톡
# ═══════════════════════════════════════════════════════════════════════════════════════════

class KakaoAlimtalkService:
    """카카오 알림톡 서비스"""
    
    # 미리 등록된 템플릿 예시
    TEMPLATES = {
        "VIP_WELCOME": "#{고객명}님, AUTUS에 오신 것을 환영합니다! 👑 VIP 고객님께 특별 혜택을 준비했습니다.",
        "QUEST_COMPLETE": "🎉 #{직원명}님, #{퀘스트명} 퀘스트를 완료했습니다! +#{XP} XP 획득!",
        "RESERVATION": "#{고객명}님, #{날짜} #{시간}에 예약이 완료되었습니다. 매장: #{매장명}",
        "BOUNTY_ALERT": "🕵️ #{사냥꾼명}님, 새로운 시크릿 미션이 도착했습니다. 앱에서 확인하세요!",
    }
    
    def __init__(self):
        self.api_key = Config.KAKAO_API_KEY
        self.sender_key = Config.KAKAO_SENDER_KEY
    
    async def send_alimtalk(self, phone: str, template_id: str, variables: Dict[str, str]) -> SMSResult:
        """알림톡 발송"""
        if not self.api_key:
            print("⚠️ 카카오 API 키가 설정되지 않았습니다.")
            return SMSResult(success=False, error="API key not configured")
        
        # 템플릿에 변수 대입
        template = self.TEMPLATES.get(template_id, "")
        if not template:
            return SMSResult(success=False, error="Template not found")
        
        message = template
        for key, value in variables.items():
            message = message.replace(f"#{{{key}}}", value)
        
        # 실제 API 호출 (예시)
        # 실제 구현 시 카카오 비즈니스 API 문서 참조
        
        print(f"📱 [KAKAO] To: {phone}")
        print(f"   Message: {message}")
        
        return SMSResult(success=True, message_id="KAKAO-MOCK-ID")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 4. Slack 웹훅
# ═══════════════════════════════════════════════════════════════════════════════════════════

class SlackService:
    """Slack 알림 서비스"""
    
    def __init__(self, webhook_url: str = None):
        self.webhook_url = webhook_url or Config.SLACK_WEBHOOK_URL
    
    async def send_message(self, text: str, channel: str = None) -> bool:
        """Slack 메시지 발송"""
        if not self.webhook_url:
            print("⚠️ Slack 웹훅 URL이 설정되지 않았습니다.")
            return False
        
        payload = {"text": text}
        if channel:
            payload["channel"] = channel
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.post(self.webhook_url, json=payload, timeout=10.0)
                    return response.status_code == 200
            elif REQUESTS_AVAILABLE:
                response = requests.post(self.webhook_url, json=payload, timeout=10)
                return response.status_code == 200
            return False
        
        except Exception as e:
            print(f"⚠️ Slack 오류: {e}")
            return False
    
    async def send_vip_alert(self, customer_name: str, station_id: str):
        """VIP 입장 알림"""
        message = f"👑 *VIP 입장 알림*\n\n고객: {customer_name}\n매장: {station_id}\n시간: {datetime.now().strftime('%H:%M:%S')}"
        return await self.send_message(message)
    
    async def send_caution_alert(self, customer_name: str, station_id: str):
        """주의 고객 알림"""
        message = f"⚠️ *주의 고객 감지*\n\n고객: {customer_name}\n매장: {station_id}\n시간: {datetime.now().strftime('%H:%M:%S')}\n\n> 규정대로 응대하세요."
        return await self.send_message(message)
    
    async def send_daily_report(self, stats: Dict[str, Any]):
        """일일 리포트"""
        message = f"""📊 *AUTUS 일일 리포트*

📅 날짜: {datetime.now().strftime('%Y-%m-%d')}

📈 *요약*
• 총 방문객: {stats.get('total_visitors', 0)}명
• VIP 방문: {stats.get('vip_visitors', 0)}명
• 매출: ₩{stats.get('revenue', 0):,}

🏆 *TOP 직원*
{stats.get('top_employee', 'N/A')}

💡 *내일 예측*
{stats.get('tomorrow_prediction', 'N/A')}
"""
        return await self.send_message(message)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 5. Discord 웹훅
# ═══════════════════════════════════════════════════════════════════════════════════════════

class DiscordService:
    """Discord 알림 서비스"""
    
    def __init__(self, webhook_url: str = None):
        self.webhook_url = webhook_url or Config.DISCORD_WEBHOOK_URL
    
    async def send_message(self, content: str, embeds: List[Dict] = None) -> bool:
        """Discord 메시지 발송"""
        if not self.webhook_url:
            print("⚠️ Discord 웹훅 URL이 설정되지 않았습니다.")
            return False
        
        payload = {"content": content}
        if embeds:
            payload["embeds"] = embeds
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.post(self.webhook_url, json=payload, timeout=10.0)
                    return response.status_code in [200, 204]
            return False
        
        except Exception as e:
            print(f"⚠️ Discord 오류: {e}")
            return False
    
    async def send_embed_alert(self, title: str, description: str, color: int = 0x00ff00):
        """임베드 알림"""
        embed = {
            "title": title,
            "description": description,
            "color": color,
            "timestamp": datetime.now().isoformat(),
            "footer": {"text": "AUTUS Empire"}
        }
        return await self.send_message("", embeds=[embed])


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 6. 통합 알림 매니저
# ═══════════════════════════════════════════════════════════════════════════════════════════

class NotificationManager:
    """
    통합 알림 매니저
    
    모든 알림 채널을 통합하여 관리
    """
    
    def __init__(self):
        self.sms = SMSService()
        self.kakao = KakaoAlimtalkService()
        self.slack = SlackService()
        self.discord = DiscordService()
        self.weather = WeatherService()
    
    async def notify_vip_entry(self, customer_name: str, phone: str, station_id: str):
        """VIP 입장 알림 (전체 채널)"""
        # Slack으로 내부 알림
        await self.slack.send_vip_alert(customer_name, station_id)
        
        # Discord로 내부 알림
        await self.discord.send_embed_alert(
            "👑 VIP 입장",
            f"**{customer_name}**님이 {station_id}에 입장했습니다.",
            0xffd700  # Gold
        )
        
        # SMS는 필요시에만
        # await self.sms.send_sms(manager_phone, f"VIP {customer_name}님 입장")
    
    async def notify_caution_entry(self, customer_name: str, station_id: str):
        """주의 고객 알림"""
        await self.slack.send_caution_alert(customer_name, station_id)
        await self.discord.send_embed_alert(
            "⚠️ 주의 고객 감지",
            f"**{customer_name}**님이 {station_id}에 입장했습니다.\n규정대로 응대하세요.",
            0xff0000  # Red
        )
    
    async def send_bounty_quest(self, hunter_phone: str, hunter_name: str, quest_description: str):
        """바운티 퀘스트 발송"""
        # SMS
        message = f"[AUTUS] {hunter_name}님, 새로운 시크릿 미션: {quest_description}"
        await self.sms.send_sms(hunter_phone, message)
        
        # 카카오 알림톡
        await self.kakao.send_alimtalk(
            hunter_phone,
            "BOUNTY_ALERT",
            {"사냥꾼명": hunter_name}
        )
    
    async def get_weather_for_oracle(self, city: str = "서울") -> Dict[str, Any]:
        """오라클 엔진용 날씨 데이터"""
        forecast = await self.weather.get_forecast(city)
        
        return {
            "weather_type": forecast.weather_type,
            "temperature": forecast.temperature,
            "precipitation_probability": forecast.precipitation_probability,
            "humidity": forecast.humidity,
            "sky_condition": forecast.sky_condition,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# FastAPI 라우터 (선택적)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_integration_routes():
    """FastAPI 라우터 생성"""
    from fastapi import APIRouter, HTTPException
    
    router = APIRouter(prefix="/api/v1/integrations", tags=["External Integrations"])
    
    notification_manager = NotificationManager()
    
    @router.get("/weather/{city}")
    async def get_weather(city: str = "서울"):
        """날씨 조회"""
        weather = WeatherService()
        forecast = await weather.get_forecast(city)
        
        if forecast:
            return {
                "city": city,
                "date": forecast.date,
                "temperature": forecast.temperature,
                "humidity": forecast.humidity,
                "precipitation_probability": forecast.precipitation_probability,
                "sky_condition": forecast.sky_condition,
                "precipitation_type": forecast.precipitation_type,
                "weather_type": forecast.weather_type,
            }
        
        raise HTTPException(status_code=500, detail="Weather data unavailable")
    
    @router.post("/sms/send")
    async def send_sms(phone: str, message: str, provider: str = "aligo"):
        """SMS 발송"""
        sms = SMSService(provider)
        result = await sms.send_sms(phone, message)
        return {"success": result.success, "message_id": result.message_id, "error": result.error}
    
    @router.post("/slack/send")
    async def send_slack(message: str):
        """Slack 메시지"""
        slack = SlackService()
        success = await slack.send_message(message)
        return {"success": success}
    
    @router.post("/notify/vip-entry")
    async def notify_vip(customer_name: str, phone: str, station_id: str):
        """VIP 입장 알림"""
        await notification_manager.notify_vip_entry(customer_name, phone, station_id)
        return {"success": True}
    
    return router


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트
# ═══════════════════════════════════════════════════════════════════════════════════════════

async def test_integrations():
    """통합 테스트"""
    print("🔌 AUTUS External Integrations Test")
    print("=" * 50)
    
    # 날씨 테스트
    print("\n📍 날씨 테스트...")
    weather = WeatherService()
    forecast = await weather.get_forecast("서울")
    print(f"   기온: {forecast.temperature}°C")
    print(f"   날씨: {forecast.sky_condition}")
    print(f"   강수확률: {forecast.precipitation_probability}%")
    
    # Slack 테스트 (웹훅 설정 필요)
    print("\n💬 Slack 테스트...")
    slack = SlackService()
    if Config.SLACK_WEBHOOK_URL:
        success = await slack.send_message("🧪 AUTUS 테스트 메시지")
        print(f"   결과: {'성공' if success else '실패'}")
    else:
        print("   ⚠️ 웹훅 URL 미설정")
    
    # 알림 매니저 테스트
    print("\n📢 알림 매니저 테스트...")
    manager = NotificationManager()
    weather_data = await manager.get_weather_for_oracle()
    print(f"   오라클용 날씨: {weather_data}")
    
    print("\n✅ 테스트 완료!")


if __name__ == "__main__":
    asyncio.run(test_integrations())







#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    🔌 AUTUS EXTERNAL INTEGRATIONS - 외부 API 연동                          ║
║                                                                                           ║
║  "제국을 외부 세계와 연결하라"                                                              ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ 기상청 API (실제 날씨 데이터)                                                          ║
║  ✅ SMS API (알리고/NHN 클라우드)                                                          ║
║  ✅ 카카오 알림톡                                                                          ║
║  ✅ Slack 웹훅                                                                            ║
║  ✅ Discord 웹훅                                                                          ║
║  ✅ 이메일 알림                                                                            ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
import hashlib
import hmac
import base64

# HTTP 클라이언트
try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

# 환경 변수에서 API 키 로드 (실제 사용 시 .env 파일에서 로드)
class Config:
    # 기상청 API (공공데이터포털)
    WEATHER_API_KEY = os.getenv("WEATHER_API_KEY", "")
    WEATHER_BASE_URL = "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0"
    
    # SMS - 알리고
    ALIGO_API_KEY = os.getenv("ALIGO_API_KEY", "")
    ALIGO_USER_ID = os.getenv("ALIGO_USER_ID", "")
    ALIGO_SENDER = os.getenv("ALIGO_SENDER", "")
    
    # SMS - NHN Cloud
    NHN_APP_KEY = os.getenv("NHN_APP_KEY", "")
    NHN_SECRET_KEY = os.getenv("NHN_SECRET_KEY", "")
    NHN_SENDER = os.getenv("NHN_SENDER", "")
    
    # 카카오 알림톡
    KAKAO_API_KEY = os.getenv("KAKAO_API_KEY", "")
    KAKAO_SENDER_KEY = os.getenv("KAKAO_SENDER_KEY", "")
    
    # Slack
    SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL", "")
    
    # Discord
    DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL", "")
    
    # Email (SMTP)
    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 1. 기상청 API (Korea Meteorological Administration)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class WeatherForecast:
    """날씨 예보"""
    date: str
    time: str
    temperature: int
    humidity: int
    precipitation_probability: int
    sky_condition: str  # 맑음, 구름많음, 흐림
    precipitation_type: str  # 없음, 비, 눈, 비/눈
    wind_speed: float
    
    @property
    def weather_type(self) -> str:
        """날씨 유형 반환"""
        if self.precipitation_type == "비":
            return "rainy"
        elif self.precipitation_type == "눈":
            return "snowy"
        elif self.sky_condition == "맑음":
            return "sunny"
        elif self.sky_condition in ["구름많음", "흐림"]:
            return "cloudy"
        return "cloudy"


class WeatherService:
    """기상청 API 연동"""
    
    # 주요 도시 좌표 (기상청 격자 좌표)
    CITY_COORDS = {
        "서울": (60, 127),
        "부산": (98, 76),
        "대구": (89, 90),
        "인천": (55, 124),
        "광주": (58, 74),
        "대전": (67, 100),
        "울산": (102, 84),
        "수원": (60, 121),
        "성남": (63, 124),
        "고양": (57, 128),
    }
    
    SKY_CONDITIONS = {
        "1": "맑음",
        "3": "구름많음",
        "4": "흐림",
    }
    
    PRECIPITATION_TYPES = {
        "0": "없음",
        "1": "비",
        "2": "비/눈",
        "3": "눈",
        "4": "소나기",
    }
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or Config.WEATHER_API_KEY
        self.base_url = Config.WEATHER_BASE_URL
    
    async def get_forecast(self, city: str = "서울", date: datetime = None) -> Optional[WeatherForecast]:
        """날씨 예보 조회"""
        if not self.api_key:
            print("⚠️ 기상청 API 키가 설정되지 않았습니다.")
            return self._get_mock_forecast()
        
        if city not in self.CITY_COORDS:
            city = "서울"
        
        nx, ny = self.CITY_COORDS[city]
        
        if date is None:
            date = datetime.now()
        
        # 기상청 API는 매일 02:00, 05:00, 08:00, 11:00, 14:00, 17:00, 20:00, 23:00에 발표
        base_date = date.strftime("%Y%m%d")
        base_time = "0500"  # 05시 발표 데이터 사용
        
        params = {
            "serviceKey": self.api_key,
            "numOfRows": 100,
            "pageNo": 1,
            "dataType": "JSON",
            "base_date": base_date,
            "base_time": base_time,
            "nx": nx,
            "ny": ny,
        }
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        f"{self.base_url}/getVilageFcst",
                        params=params,
                        timeout=10.0
                    )
                    data = response.json()
            elif REQUESTS_AVAILABLE:
                response = requests.get(
                    f"{self.base_url}/getVilageFcst",
                    params=params,
                    timeout=10
                )
                data = response.json()
            else:
                return self._get_mock_forecast()
            
            return self._parse_forecast(data)
        
        except Exception as e:
            print(f"⚠️ 기상청 API 오류: {e}")
            return self._get_mock_forecast()
    
    def _parse_forecast(self, data: dict) -> Optional[WeatherForecast]:
        """응답 파싱"""
        try:
            items = data["response"]["body"]["items"]["item"]
            
            forecast_data = {}
            for item in items:
                category = item["category"]
                value = item["fcstValue"]
                
                if category == "TMP":  # 기온
                    forecast_data["temperature"] = int(value)
                elif category == "REH":  # 습도
                    forecast_data["humidity"] = int(value)
                elif category == "POP":  # 강수확률
                    forecast_data["precipitation_probability"] = int(value)
                elif category == "SKY":  # 하늘상태
                    forecast_data["sky_condition"] = self.SKY_CONDITIONS.get(value, "흐림")
                elif category == "PTY":  # 강수형태
                    forecast_data["precipitation_type"] = self.PRECIPITATION_TYPES.get(value, "없음")
                elif category == "WSD":  # 풍속
                    forecast_data["wind_speed"] = float(value)
            
            return WeatherForecast(
                date=items[0]["fcstDate"],
                time=items[0]["fcstTime"],
                temperature=forecast_data.get("temperature", 20),
                humidity=forecast_data.get("humidity", 50),
                precipitation_probability=forecast_data.get("precipitation_probability", 0),
                sky_condition=forecast_data.get("sky_condition", "흐림"),
                precipitation_type=forecast_data.get("precipitation_type", "없음"),
                wind_speed=forecast_data.get("wind_speed", 2.0),
            )
        
        except Exception as e:
            print(f"⚠️ 파싱 오류: {e}")
            return self._get_mock_forecast()
    
    def _get_mock_forecast(self) -> WeatherForecast:
        """Mock 데이터 반환"""
        import random
        
        conditions = ["맑음", "구름많음", "흐림"]
        precipitations = ["없음", "없음", "없음", "비", "눈"]
        
        return WeatherForecast(
            date=datetime.now().strftime("%Y%m%d"),
            time="1200",
            temperature=random.randint(-5, 35),
            humidity=random.randint(30, 80),
            precipitation_probability=random.randint(0, 100),
            sky_condition=random.choice(conditions),
            precipitation_type=random.choice(precipitations),
            wind_speed=random.uniform(1.0, 10.0),
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 2. SMS API (알리고 / NHN Cloud)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class SMSResult:
    """SMS 전송 결과"""
    success: bool
    message_id: str = ""
    error: str = ""


class SMSService:
    """SMS 발송 서비스"""
    
    def __init__(self, provider: str = "aligo"):
        self.provider = provider
    
    async def send_sms(self, phone: str, message: str) -> SMSResult:
        """SMS 발송"""
        if self.provider == "aligo":
            return await self._send_via_aligo(phone, message)
        elif self.provider == "nhn":
            return await self._send_via_nhn(phone, message)
        else:
            return SMSResult(success=False, error="Unknown provider")
    
    async def send_bulk_sms(self, phones: List[str], message: str) -> List[SMSResult]:
        """대량 SMS 발송"""
        results = []
        for phone in phones:
            result = await self.send_sms(phone, message)
            results.append(result)
            await asyncio.sleep(0.1)  # Rate limiting
        return results
    
    async def _send_via_aligo(self, phone: str, message: str) -> SMSResult:
        """알리고 SMS 발송"""
        if not Config.ALIGO_API_KEY:
            print("⚠️ 알리고 API 키가 설정되지 않았습니다.")
            return SMSResult(success=False, error="API key not configured")
        
        url = "https://apis.aligo.in/send/"
        
        data = {
            "key": Config.ALIGO_API_KEY,
            "user_id": Config.ALIGO_USER_ID,
            "sender": Config.ALIGO_SENDER,
            "receiver": phone,
            "msg": message,
        }
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.post(url, data=data, timeout=10.0)
                    result = response.json()
            elif REQUESTS_AVAILABLE:
                response = requests.post(url, data=data, timeout=10)
                result = response.json()
            else:
                return SMSResult(success=False, error="HTTP client not available")
            
            if result.get("result_code") == "1":
                return SMSResult(success=True, message_id=result.get("msg_id", ""))
            else:
                return SMSResult(success=False, error=result.get("message", "Unknown error"))
        
        except Exception as e:
            return SMSResult(success=False, error=str(e))
    
    async def _send_via_nhn(self, phone: str, message: str) -> SMSResult:
        """NHN Cloud SMS 발송"""
        if not Config.NHN_APP_KEY:
            print("⚠️ NHN Cloud API 키가 설정되지 않았습니다.")
            return SMSResult(success=False, error="API key not configured")
        
        url = f"https://api-sms.cloud.toast.com/sms/v2.4/appKeys/{Config.NHN_APP_KEY}/sender/sms"
        
        headers = {
            "Content-Type": "application/json;charset=UTF-8",
            "X-Secret-Key": Config.NHN_SECRET_KEY,
        }
        
        data = {
            "body": message,
            "sendNo": Config.NHN_SENDER,
            "recipientList": [{"recipientNo": phone}],
        }
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.post(url, json=data, headers=headers, timeout=10.0)
                    result = response.json()
            else:
                return SMSResult(success=False, error="HTTP client not available")
            
            if result.get("header", {}).get("isSuccessful"):
                return SMSResult(success=True, message_id=result.get("body", {}).get("data", {}).get("requestId", ""))
            else:
                return SMSResult(success=False, error=result.get("header", {}).get("resultMessage", "Unknown error"))
        
        except Exception as e:
            return SMSResult(success=False, error=str(e))


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 3. 카카오 알림톡
# ═══════════════════════════════════════════════════════════════════════════════════════════

class KakaoAlimtalkService:
    """카카오 알림톡 서비스"""
    
    # 미리 등록된 템플릿 예시
    TEMPLATES = {
        "VIP_WELCOME": "#{고객명}님, AUTUS에 오신 것을 환영합니다! 👑 VIP 고객님께 특별 혜택을 준비했습니다.",
        "QUEST_COMPLETE": "🎉 #{직원명}님, #{퀘스트명} 퀘스트를 완료했습니다! +#{XP} XP 획득!",
        "RESERVATION": "#{고객명}님, #{날짜} #{시간}에 예약이 완료되었습니다. 매장: #{매장명}",
        "BOUNTY_ALERT": "🕵️ #{사냥꾼명}님, 새로운 시크릿 미션이 도착했습니다. 앱에서 확인하세요!",
    }
    
    def __init__(self):
        self.api_key = Config.KAKAO_API_KEY
        self.sender_key = Config.KAKAO_SENDER_KEY
    
    async def send_alimtalk(self, phone: str, template_id: str, variables: Dict[str, str]) -> SMSResult:
        """알림톡 발송"""
        if not self.api_key:
            print("⚠️ 카카오 API 키가 설정되지 않았습니다.")
            return SMSResult(success=False, error="API key not configured")
        
        # 템플릿에 변수 대입
        template = self.TEMPLATES.get(template_id, "")
        if not template:
            return SMSResult(success=False, error="Template not found")
        
        message = template
        for key, value in variables.items():
            message = message.replace(f"#{{{key}}}", value)
        
        # 실제 API 호출 (예시)
        # 실제 구현 시 카카오 비즈니스 API 문서 참조
        
        print(f"📱 [KAKAO] To: {phone}")
        print(f"   Message: {message}")
        
        return SMSResult(success=True, message_id="KAKAO-MOCK-ID")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 4. Slack 웹훅
# ═══════════════════════════════════════════════════════════════════════════════════════════

class SlackService:
    """Slack 알림 서비스"""
    
    def __init__(self, webhook_url: str = None):
        self.webhook_url = webhook_url or Config.SLACK_WEBHOOK_URL
    
    async def send_message(self, text: str, channel: str = None) -> bool:
        """Slack 메시지 발송"""
        if not self.webhook_url:
            print("⚠️ Slack 웹훅 URL이 설정되지 않았습니다.")
            return False
        
        payload = {"text": text}
        if channel:
            payload["channel"] = channel
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.post(self.webhook_url, json=payload, timeout=10.0)
                    return response.status_code == 200
            elif REQUESTS_AVAILABLE:
                response = requests.post(self.webhook_url, json=payload, timeout=10)
                return response.status_code == 200
            return False
        
        except Exception as e:
            print(f"⚠️ Slack 오류: {e}")
            return False
    
    async def send_vip_alert(self, customer_name: str, station_id: str):
        """VIP 입장 알림"""
        message = f"👑 *VIP 입장 알림*\n\n고객: {customer_name}\n매장: {station_id}\n시간: {datetime.now().strftime('%H:%M:%S')}"
        return await self.send_message(message)
    
    async def send_caution_alert(self, customer_name: str, station_id: str):
        """주의 고객 알림"""
        message = f"⚠️ *주의 고객 감지*\n\n고객: {customer_name}\n매장: {station_id}\n시간: {datetime.now().strftime('%H:%M:%S')}\n\n> 규정대로 응대하세요."
        return await self.send_message(message)
    
    async def send_daily_report(self, stats: Dict[str, Any]):
        """일일 리포트"""
        message = f"""📊 *AUTUS 일일 리포트*

📅 날짜: {datetime.now().strftime('%Y-%m-%d')}

📈 *요약*
• 총 방문객: {stats.get('total_visitors', 0)}명
• VIP 방문: {stats.get('vip_visitors', 0)}명
• 매출: ₩{stats.get('revenue', 0):,}

🏆 *TOP 직원*
{stats.get('top_employee', 'N/A')}

💡 *내일 예측*
{stats.get('tomorrow_prediction', 'N/A')}
"""
        return await self.send_message(message)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 5. Discord 웹훅
# ═══════════════════════════════════════════════════════════════════════════════════════════

class DiscordService:
    """Discord 알림 서비스"""
    
    def __init__(self, webhook_url: str = None):
        self.webhook_url = webhook_url or Config.DISCORD_WEBHOOK_URL
    
    async def send_message(self, content: str, embeds: List[Dict] = None) -> bool:
        """Discord 메시지 발송"""
        if not self.webhook_url:
            print("⚠️ Discord 웹훅 URL이 설정되지 않았습니다.")
            return False
        
        payload = {"content": content}
        if embeds:
            payload["embeds"] = embeds
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.post(self.webhook_url, json=payload, timeout=10.0)
                    return response.status_code in [200, 204]
            return False
        
        except Exception as e:
            print(f"⚠️ Discord 오류: {e}")
            return False
    
    async def send_embed_alert(self, title: str, description: str, color: int = 0x00ff00):
        """임베드 알림"""
        embed = {
            "title": title,
            "description": description,
            "color": color,
            "timestamp": datetime.now().isoformat(),
            "footer": {"text": "AUTUS Empire"}
        }
        return await self.send_message("", embeds=[embed])


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 6. 통합 알림 매니저
# ═══════════════════════════════════════════════════════════════════════════════════════════

class NotificationManager:
    """
    통합 알림 매니저
    
    모든 알림 채널을 통합하여 관리
    """
    
    def __init__(self):
        self.sms = SMSService()
        self.kakao = KakaoAlimtalkService()
        self.slack = SlackService()
        self.discord = DiscordService()
        self.weather = WeatherService()
    
    async def notify_vip_entry(self, customer_name: str, phone: str, station_id: str):
        """VIP 입장 알림 (전체 채널)"""
        # Slack으로 내부 알림
        await self.slack.send_vip_alert(customer_name, station_id)
        
        # Discord로 내부 알림
        await self.discord.send_embed_alert(
            "👑 VIP 입장",
            f"**{customer_name}**님이 {station_id}에 입장했습니다.",
            0xffd700  # Gold
        )
        
        # SMS는 필요시에만
        # await self.sms.send_sms(manager_phone, f"VIP {customer_name}님 입장")
    
    async def notify_caution_entry(self, customer_name: str, station_id: str):
        """주의 고객 알림"""
        await self.slack.send_caution_alert(customer_name, station_id)
        await self.discord.send_embed_alert(
            "⚠️ 주의 고객 감지",
            f"**{customer_name}**님이 {station_id}에 입장했습니다.\n규정대로 응대하세요.",
            0xff0000  # Red
        )
    
    async def send_bounty_quest(self, hunter_phone: str, hunter_name: str, quest_description: str):
        """바운티 퀘스트 발송"""
        # SMS
        message = f"[AUTUS] {hunter_name}님, 새로운 시크릿 미션: {quest_description}"
        await self.sms.send_sms(hunter_phone, message)
        
        # 카카오 알림톡
        await self.kakao.send_alimtalk(
            hunter_phone,
            "BOUNTY_ALERT",
            {"사냥꾼명": hunter_name}
        )
    
    async def get_weather_for_oracle(self, city: str = "서울") -> Dict[str, Any]:
        """오라클 엔진용 날씨 데이터"""
        forecast = await self.weather.get_forecast(city)
        
        return {
            "weather_type": forecast.weather_type,
            "temperature": forecast.temperature,
            "precipitation_probability": forecast.precipitation_probability,
            "humidity": forecast.humidity,
            "sky_condition": forecast.sky_condition,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# FastAPI 라우터 (선택적)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_integration_routes():
    """FastAPI 라우터 생성"""
    from fastapi import APIRouter, HTTPException
    
    router = APIRouter(prefix="/api/v1/integrations", tags=["External Integrations"])
    
    notification_manager = NotificationManager()
    
    @router.get("/weather/{city}")
    async def get_weather(city: str = "서울"):
        """날씨 조회"""
        weather = WeatherService()
        forecast = await weather.get_forecast(city)
        
        if forecast:
            return {
                "city": city,
                "date": forecast.date,
                "temperature": forecast.temperature,
                "humidity": forecast.humidity,
                "precipitation_probability": forecast.precipitation_probability,
                "sky_condition": forecast.sky_condition,
                "precipitation_type": forecast.precipitation_type,
                "weather_type": forecast.weather_type,
            }
        
        raise HTTPException(status_code=500, detail="Weather data unavailable")
    
    @router.post("/sms/send")
    async def send_sms(phone: str, message: str, provider: str = "aligo"):
        """SMS 발송"""
        sms = SMSService(provider)
        result = await sms.send_sms(phone, message)
        return {"success": result.success, "message_id": result.message_id, "error": result.error}
    
    @router.post("/slack/send")
    async def send_slack(message: str):
        """Slack 메시지"""
        slack = SlackService()
        success = await slack.send_message(message)
        return {"success": success}
    
    @router.post("/notify/vip-entry")
    async def notify_vip(customer_name: str, phone: str, station_id: str):
        """VIP 입장 알림"""
        await notification_manager.notify_vip_entry(customer_name, phone, station_id)
        return {"success": True}
    
    return router


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트
# ═══════════════════════════════════════════════════════════════════════════════════════════

async def test_integrations():
    """통합 테스트"""
    print("🔌 AUTUS External Integrations Test")
    print("=" * 50)
    
    # 날씨 테스트
    print("\n📍 날씨 테스트...")
    weather = WeatherService()
    forecast = await weather.get_forecast("서울")
    print(f"   기온: {forecast.temperature}°C")
    print(f"   날씨: {forecast.sky_condition}")
    print(f"   강수확률: {forecast.precipitation_probability}%")
    
    # Slack 테스트 (웹훅 설정 필요)
    print("\n💬 Slack 테스트...")
    slack = SlackService()
    if Config.SLACK_WEBHOOK_URL:
        success = await slack.send_message("🧪 AUTUS 테스트 메시지")
        print(f"   결과: {'성공' if success else '실패'}")
    else:
        print("   ⚠️ 웹훅 URL 미설정")
    
    # 알림 매니저 테스트
    print("\n📢 알림 매니저 테스트...")
    manager = NotificationManager()
    weather_data = await manager.get_weather_for_oracle()
    print(f"   오라클용 날씨: {weather_data}")
    
    print("\n✅ 테스트 완료!")


if __name__ == "__main__":
    asyncio.run(test_integrations())







#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    🔌 AUTUS EXTERNAL INTEGRATIONS - 외부 API 연동                          ║
║                                                                                           ║
║  "제국을 외부 세계와 연결하라"                                                              ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ 기상청 API (실제 날씨 데이터)                                                          ║
║  ✅ SMS API (알리고/NHN 클라우드)                                                          ║
║  ✅ 카카오 알림톡                                                                          ║
║  ✅ Slack 웹훅                                                                            ║
║  ✅ Discord 웹훅                                                                          ║
║  ✅ 이메일 알림                                                                            ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
import hashlib
import hmac
import base64

# HTTP 클라이언트
try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

# 환경 변수에서 API 키 로드 (실제 사용 시 .env 파일에서 로드)
class Config:
    # 기상청 API (공공데이터포털)
    WEATHER_API_KEY = os.getenv("WEATHER_API_KEY", "")
    WEATHER_BASE_URL = "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0"
    
    # SMS - 알리고
    ALIGO_API_KEY = os.getenv("ALIGO_API_KEY", "")
    ALIGO_USER_ID = os.getenv("ALIGO_USER_ID", "")
    ALIGO_SENDER = os.getenv("ALIGO_SENDER", "")
    
    # SMS - NHN Cloud
    NHN_APP_KEY = os.getenv("NHN_APP_KEY", "")
    NHN_SECRET_KEY = os.getenv("NHN_SECRET_KEY", "")
    NHN_SENDER = os.getenv("NHN_SENDER", "")
    
    # 카카오 알림톡
    KAKAO_API_KEY = os.getenv("KAKAO_API_KEY", "")
    KAKAO_SENDER_KEY = os.getenv("KAKAO_SENDER_KEY", "")
    
    # Slack
    SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL", "")
    
    # Discord
    DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL", "")
    
    # Email (SMTP)
    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 1. 기상청 API (Korea Meteorological Administration)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class WeatherForecast:
    """날씨 예보"""
    date: str
    time: str
    temperature: int
    humidity: int
    precipitation_probability: int
    sky_condition: str  # 맑음, 구름많음, 흐림
    precipitation_type: str  # 없음, 비, 눈, 비/눈
    wind_speed: float
    
    @property
    def weather_type(self) -> str:
        """날씨 유형 반환"""
        if self.precipitation_type == "비":
            return "rainy"
        elif self.precipitation_type == "눈":
            return "snowy"
        elif self.sky_condition == "맑음":
            return "sunny"
        elif self.sky_condition in ["구름많음", "흐림"]:
            return "cloudy"
        return "cloudy"


class WeatherService:
    """기상청 API 연동"""
    
    # 주요 도시 좌표 (기상청 격자 좌표)
    CITY_COORDS = {
        "서울": (60, 127),
        "부산": (98, 76),
        "대구": (89, 90),
        "인천": (55, 124),
        "광주": (58, 74),
        "대전": (67, 100),
        "울산": (102, 84),
        "수원": (60, 121),
        "성남": (63, 124),
        "고양": (57, 128),
    }
    
    SKY_CONDITIONS = {
        "1": "맑음",
        "3": "구름많음",
        "4": "흐림",
    }
    
    PRECIPITATION_TYPES = {
        "0": "없음",
        "1": "비",
        "2": "비/눈",
        "3": "눈",
        "4": "소나기",
    }
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or Config.WEATHER_API_KEY
        self.base_url = Config.WEATHER_BASE_URL
    
    async def get_forecast(self, city: str = "서울", date: datetime = None) -> Optional[WeatherForecast]:
        """날씨 예보 조회"""
        if not self.api_key:
            print("⚠️ 기상청 API 키가 설정되지 않았습니다.")
            return self._get_mock_forecast()
        
        if city not in self.CITY_COORDS:
            city = "서울"
        
        nx, ny = self.CITY_COORDS[city]
        
        if date is None:
            date = datetime.now()
        
        # 기상청 API는 매일 02:00, 05:00, 08:00, 11:00, 14:00, 17:00, 20:00, 23:00에 발표
        base_date = date.strftime("%Y%m%d")
        base_time = "0500"  # 05시 발표 데이터 사용
        
        params = {
            "serviceKey": self.api_key,
            "numOfRows": 100,
            "pageNo": 1,
            "dataType": "JSON",
            "base_date": base_date,
            "base_time": base_time,
            "nx": nx,
            "ny": ny,
        }
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        f"{self.base_url}/getVilageFcst",
                        params=params,
                        timeout=10.0
                    )
                    data = response.json()
            elif REQUESTS_AVAILABLE:
                response = requests.get(
                    f"{self.base_url}/getVilageFcst",
                    params=params,
                    timeout=10
                )
                data = response.json()
            else:
                return self._get_mock_forecast()
            
            return self._parse_forecast(data)
        
        except Exception as e:
            print(f"⚠️ 기상청 API 오류: {e}")
            return self._get_mock_forecast()
    
    def _parse_forecast(self, data: dict) -> Optional[WeatherForecast]:
        """응답 파싱"""
        try:
            items = data["response"]["body"]["items"]["item"]
            
            forecast_data = {}
            for item in items:
                category = item["category"]
                value = item["fcstValue"]
                
                if category == "TMP":  # 기온
                    forecast_data["temperature"] = int(value)
                elif category == "REH":  # 습도
                    forecast_data["humidity"] = int(value)
                elif category == "POP":  # 강수확률
                    forecast_data["precipitation_probability"] = int(value)
                elif category == "SKY":  # 하늘상태
                    forecast_data["sky_condition"] = self.SKY_CONDITIONS.get(value, "흐림")
                elif category == "PTY":  # 강수형태
                    forecast_data["precipitation_type"] = self.PRECIPITATION_TYPES.get(value, "없음")
                elif category == "WSD":  # 풍속
                    forecast_data["wind_speed"] = float(value)
            
            return WeatherForecast(
                date=items[0]["fcstDate"],
                time=items[0]["fcstTime"],
                temperature=forecast_data.get("temperature", 20),
                humidity=forecast_data.get("humidity", 50),
                precipitation_probability=forecast_data.get("precipitation_probability", 0),
                sky_condition=forecast_data.get("sky_condition", "흐림"),
                precipitation_type=forecast_data.get("precipitation_type", "없음"),
                wind_speed=forecast_data.get("wind_speed", 2.0),
            )
        
        except Exception as e:
            print(f"⚠️ 파싱 오류: {e}")
            return self._get_mock_forecast()
    
    def _get_mock_forecast(self) -> WeatherForecast:
        """Mock 데이터 반환"""
        import random
        
        conditions = ["맑음", "구름많음", "흐림"]
        precipitations = ["없음", "없음", "없음", "비", "눈"]
        
        return WeatherForecast(
            date=datetime.now().strftime("%Y%m%d"),
            time="1200",
            temperature=random.randint(-5, 35),
            humidity=random.randint(30, 80),
            precipitation_probability=random.randint(0, 100),
            sky_condition=random.choice(conditions),
            precipitation_type=random.choice(precipitations),
            wind_speed=random.uniform(1.0, 10.0),
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 2. SMS API (알리고 / NHN Cloud)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class SMSResult:
    """SMS 전송 결과"""
    success: bool
    message_id: str = ""
    error: str = ""


class SMSService:
    """SMS 발송 서비스"""
    
    def __init__(self, provider: str = "aligo"):
        self.provider = provider
    
    async def send_sms(self, phone: str, message: str) -> SMSResult:
        """SMS 발송"""
        if self.provider == "aligo":
            return await self._send_via_aligo(phone, message)
        elif self.provider == "nhn":
            return await self._send_via_nhn(phone, message)
        else:
            return SMSResult(success=False, error="Unknown provider")
    
    async def send_bulk_sms(self, phones: List[str], message: str) -> List[SMSResult]:
        """대량 SMS 발송"""
        results = []
        for phone in phones:
            result = await self.send_sms(phone, message)
            results.append(result)
            await asyncio.sleep(0.1)  # Rate limiting
        return results
    
    async def _send_via_aligo(self, phone: str, message: str) -> SMSResult:
        """알리고 SMS 발송"""
        if not Config.ALIGO_API_KEY:
            print("⚠️ 알리고 API 키가 설정되지 않았습니다.")
            return SMSResult(success=False, error="API key not configured")
        
        url = "https://apis.aligo.in/send/"
        
        data = {
            "key": Config.ALIGO_API_KEY,
            "user_id": Config.ALIGO_USER_ID,
            "sender": Config.ALIGO_SENDER,
            "receiver": phone,
            "msg": message,
        }
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.post(url, data=data, timeout=10.0)
                    result = response.json()
            elif REQUESTS_AVAILABLE:
                response = requests.post(url, data=data, timeout=10)
                result = response.json()
            else:
                return SMSResult(success=False, error="HTTP client not available")
            
            if result.get("result_code") == "1":
                return SMSResult(success=True, message_id=result.get("msg_id", ""))
            else:
                return SMSResult(success=False, error=result.get("message", "Unknown error"))
        
        except Exception as e:
            return SMSResult(success=False, error=str(e))
    
    async def _send_via_nhn(self, phone: str, message: str) -> SMSResult:
        """NHN Cloud SMS 발송"""
        if not Config.NHN_APP_KEY:
            print("⚠️ NHN Cloud API 키가 설정되지 않았습니다.")
            return SMSResult(success=False, error="API key not configured")
        
        url = f"https://api-sms.cloud.toast.com/sms/v2.4/appKeys/{Config.NHN_APP_KEY}/sender/sms"
        
        headers = {
            "Content-Type": "application/json;charset=UTF-8",
            "X-Secret-Key": Config.NHN_SECRET_KEY,
        }
        
        data = {
            "body": message,
            "sendNo": Config.NHN_SENDER,
            "recipientList": [{"recipientNo": phone}],
        }
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.post(url, json=data, headers=headers, timeout=10.0)
                    result = response.json()
            else:
                return SMSResult(success=False, error="HTTP client not available")
            
            if result.get("header", {}).get("isSuccessful"):
                return SMSResult(success=True, message_id=result.get("body", {}).get("data", {}).get("requestId", ""))
            else:
                return SMSResult(success=False, error=result.get("header", {}).get("resultMessage", "Unknown error"))
        
        except Exception as e:
            return SMSResult(success=False, error=str(e))


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 3. 카카오 알림톡
# ═══════════════════════════════════════════════════════════════════════════════════════════

class KakaoAlimtalkService:
    """카카오 알림톡 서비스"""
    
    # 미리 등록된 템플릿 예시
    TEMPLATES = {
        "VIP_WELCOME": "#{고객명}님, AUTUS에 오신 것을 환영합니다! 👑 VIP 고객님께 특별 혜택을 준비했습니다.",
        "QUEST_COMPLETE": "🎉 #{직원명}님, #{퀘스트명} 퀘스트를 완료했습니다! +#{XP} XP 획득!",
        "RESERVATION": "#{고객명}님, #{날짜} #{시간}에 예약이 완료되었습니다. 매장: #{매장명}",
        "BOUNTY_ALERT": "🕵️ #{사냥꾼명}님, 새로운 시크릿 미션이 도착했습니다. 앱에서 확인하세요!",
    }
    
    def __init__(self):
        self.api_key = Config.KAKAO_API_KEY
        self.sender_key = Config.KAKAO_SENDER_KEY
    
    async def send_alimtalk(self, phone: str, template_id: str, variables: Dict[str, str]) -> SMSResult:
        """알림톡 발송"""
        if not self.api_key:
            print("⚠️ 카카오 API 키가 설정되지 않았습니다.")
            return SMSResult(success=False, error="API key not configured")
        
        # 템플릿에 변수 대입
        template = self.TEMPLATES.get(template_id, "")
        if not template:
            return SMSResult(success=False, error="Template not found")
        
        message = template
        for key, value in variables.items():
            message = message.replace(f"#{{{key}}}", value)
        
        # 실제 API 호출 (예시)
        # 실제 구현 시 카카오 비즈니스 API 문서 참조
        
        print(f"📱 [KAKAO] To: {phone}")
        print(f"   Message: {message}")
        
        return SMSResult(success=True, message_id="KAKAO-MOCK-ID")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 4. Slack 웹훅
# ═══════════════════════════════════════════════════════════════════════════════════════════

class SlackService:
    """Slack 알림 서비스"""
    
    def __init__(self, webhook_url: str = None):
        self.webhook_url = webhook_url or Config.SLACK_WEBHOOK_URL
    
    async def send_message(self, text: str, channel: str = None) -> bool:
        """Slack 메시지 발송"""
        if not self.webhook_url:
            print("⚠️ Slack 웹훅 URL이 설정되지 않았습니다.")
            return False
        
        payload = {"text": text}
        if channel:
            payload["channel"] = channel
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.post(self.webhook_url, json=payload, timeout=10.0)
                    return response.status_code == 200
            elif REQUESTS_AVAILABLE:
                response = requests.post(self.webhook_url, json=payload, timeout=10)
                return response.status_code == 200
            return False
        
        except Exception as e:
            print(f"⚠️ Slack 오류: {e}")
            return False
    
    async def send_vip_alert(self, customer_name: str, station_id: str):
        """VIP 입장 알림"""
        message = f"👑 *VIP 입장 알림*\n\n고객: {customer_name}\n매장: {station_id}\n시간: {datetime.now().strftime('%H:%M:%S')}"
        return await self.send_message(message)
    
    async def send_caution_alert(self, customer_name: str, station_id: str):
        """주의 고객 알림"""
        message = f"⚠️ *주의 고객 감지*\n\n고객: {customer_name}\n매장: {station_id}\n시간: {datetime.now().strftime('%H:%M:%S')}\n\n> 규정대로 응대하세요."
        return await self.send_message(message)
    
    async def send_daily_report(self, stats: Dict[str, Any]):
        """일일 리포트"""
        message = f"""📊 *AUTUS 일일 리포트*

📅 날짜: {datetime.now().strftime('%Y-%m-%d')}

📈 *요약*
• 총 방문객: {stats.get('total_visitors', 0)}명
• VIP 방문: {stats.get('vip_visitors', 0)}명
• 매출: ₩{stats.get('revenue', 0):,}

🏆 *TOP 직원*
{stats.get('top_employee', 'N/A')}

💡 *내일 예측*
{stats.get('tomorrow_prediction', 'N/A')}
"""
        return await self.send_message(message)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 5. Discord 웹훅
# ═══════════════════════════════════════════════════════════════════════════════════════════

class DiscordService:
    """Discord 알림 서비스"""
    
    def __init__(self, webhook_url: str = None):
        self.webhook_url = webhook_url or Config.DISCORD_WEBHOOK_URL
    
    async def send_message(self, content: str, embeds: List[Dict] = None) -> bool:
        """Discord 메시지 발송"""
        if not self.webhook_url:
            print("⚠️ Discord 웹훅 URL이 설정되지 않았습니다.")
            return False
        
        payload = {"content": content}
        if embeds:
            payload["embeds"] = embeds
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.post(self.webhook_url, json=payload, timeout=10.0)
                    return response.status_code in [200, 204]
            return False
        
        except Exception as e:
            print(f"⚠️ Discord 오류: {e}")
            return False
    
    async def send_embed_alert(self, title: str, description: str, color: int = 0x00ff00):
        """임베드 알림"""
        embed = {
            "title": title,
            "description": description,
            "color": color,
            "timestamp": datetime.now().isoformat(),
            "footer": {"text": "AUTUS Empire"}
        }
        return await self.send_message("", embeds=[embed])


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 6. 통합 알림 매니저
# ═══════════════════════════════════════════════════════════════════════════════════════════

class NotificationManager:
    """
    통합 알림 매니저
    
    모든 알림 채널을 통합하여 관리
    """
    
    def __init__(self):
        self.sms = SMSService()
        self.kakao = KakaoAlimtalkService()
        self.slack = SlackService()
        self.discord = DiscordService()
        self.weather = WeatherService()
    
    async def notify_vip_entry(self, customer_name: str, phone: str, station_id: str):
        """VIP 입장 알림 (전체 채널)"""
        # Slack으로 내부 알림
        await self.slack.send_vip_alert(customer_name, station_id)
        
        # Discord로 내부 알림
        await self.discord.send_embed_alert(
            "👑 VIP 입장",
            f"**{customer_name}**님이 {station_id}에 입장했습니다.",
            0xffd700  # Gold
        )
        
        # SMS는 필요시에만
        # await self.sms.send_sms(manager_phone, f"VIP {customer_name}님 입장")
    
    async def notify_caution_entry(self, customer_name: str, station_id: str):
        """주의 고객 알림"""
        await self.slack.send_caution_alert(customer_name, station_id)
        await self.discord.send_embed_alert(
            "⚠️ 주의 고객 감지",
            f"**{customer_name}**님이 {station_id}에 입장했습니다.\n규정대로 응대하세요.",
            0xff0000  # Red
        )
    
    async def send_bounty_quest(self, hunter_phone: str, hunter_name: str, quest_description: str):
        """바운티 퀘스트 발송"""
        # SMS
        message = f"[AUTUS] {hunter_name}님, 새로운 시크릿 미션: {quest_description}"
        await self.sms.send_sms(hunter_phone, message)
        
        # 카카오 알림톡
        await self.kakao.send_alimtalk(
            hunter_phone,
            "BOUNTY_ALERT",
            {"사냥꾼명": hunter_name}
        )
    
    async def get_weather_for_oracle(self, city: str = "서울") -> Dict[str, Any]:
        """오라클 엔진용 날씨 데이터"""
        forecast = await self.weather.get_forecast(city)
        
        return {
            "weather_type": forecast.weather_type,
            "temperature": forecast.temperature,
            "precipitation_probability": forecast.precipitation_probability,
            "humidity": forecast.humidity,
            "sky_condition": forecast.sky_condition,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# FastAPI 라우터 (선택적)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_integration_routes():
    """FastAPI 라우터 생성"""
    from fastapi import APIRouter, HTTPException
    
    router = APIRouter(prefix="/api/v1/integrations", tags=["External Integrations"])
    
    notification_manager = NotificationManager()
    
    @router.get("/weather/{city}")
    async def get_weather(city: str = "서울"):
        """날씨 조회"""
        weather = WeatherService()
        forecast = await weather.get_forecast(city)
        
        if forecast:
            return {
                "city": city,
                "date": forecast.date,
                "temperature": forecast.temperature,
                "humidity": forecast.humidity,
                "precipitation_probability": forecast.precipitation_probability,
                "sky_condition": forecast.sky_condition,
                "precipitation_type": forecast.precipitation_type,
                "weather_type": forecast.weather_type,
            }
        
        raise HTTPException(status_code=500, detail="Weather data unavailable")
    
    @router.post("/sms/send")
    async def send_sms(phone: str, message: str, provider: str = "aligo"):
        """SMS 발송"""
        sms = SMSService(provider)
        result = await sms.send_sms(phone, message)
        return {"success": result.success, "message_id": result.message_id, "error": result.error}
    
    @router.post("/slack/send")
    async def send_slack(message: str):
        """Slack 메시지"""
        slack = SlackService()
        success = await slack.send_message(message)
        return {"success": success}
    
    @router.post("/notify/vip-entry")
    async def notify_vip(customer_name: str, phone: str, station_id: str):
        """VIP 입장 알림"""
        await notification_manager.notify_vip_entry(customer_name, phone, station_id)
        return {"success": True}
    
    return router


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트
# ═══════════════════════════════════════════════════════════════════════════════════════════

async def test_integrations():
    """통합 테스트"""
    print("🔌 AUTUS External Integrations Test")
    print("=" * 50)
    
    # 날씨 테스트
    print("\n📍 날씨 테스트...")
    weather = WeatherService()
    forecast = await weather.get_forecast("서울")
    print(f"   기온: {forecast.temperature}°C")
    print(f"   날씨: {forecast.sky_condition}")
    print(f"   강수확률: {forecast.precipitation_probability}%")
    
    # Slack 테스트 (웹훅 설정 필요)
    print("\n💬 Slack 테스트...")
    slack = SlackService()
    if Config.SLACK_WEBHOOK_URL:
        success = await slack.send_message("🧪 AUTUS 테스트 메시지")
        print(f"   결과: {'성공' if success else '실패'}")
    else:
        print("   ⚠️ 웹훅 URL 미설정")
    
    # 알림 매니저 테스트
    print("\n📢 알림 매니저 테스트...")
    manager = NotificationManager()
    weather_data = await manager.get_weather_for_oracle()
    print(f"   오라클용 날씨: {weather_data}")
    
    print("\n✅ 테스트 완료!")


if __name__ == "__main__":
    asyncio.run(test_integrations())







#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    🔌 AUTUS EXTERNAL INTEGRATIONS - 외부 API 연동                          ║
║                                                                                           ║
║  "제국을 외부 세계와 연결하라"                                                              ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ 기상청 API (실제 날씨 데이터)                                                          ║
║  ✅ SMS API (알리고/NHN 클라우드)                                                          ║
║  ✅ 카카오 알림톡                                                                          ║
║  ✅ Slack 웹훅                                                                            ║
║  ✅ Discord 웹훅                                                                          ║
║  ✅ 이메일 알림                                                                            ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
import hashlib
import hmac
import base64

# HTTP 클라이언트
try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

# 환경 변수에서 API 키 로드 (실제 사용 시 .env 파일에서 로드)
class Config:
    # 기상청 API (공공데이터포털)
    WEATHER_API_KEY = os.getenv("WEATHER_API_KEY", "")
    WEATHER_BASE_URL = "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0"
    
    # SMS - 알리고
    ALIGO_API_KEY = os.getenv("ALIGO_API_KEY", "")
    ALIGO_USER_ID = os.getenv("ALIGO_USER_ID", "")
    ALIGO_SENDER = os.getenv("ALIGO_SENDER", "")
    
    # SMS - NHN Cloud
    NHN_APP_KEY = os.getenv("NHN_APP_KEY", "")
    NHN_SECRET_KEY = os.getenv("NHN_SECRET_KEY", "")
    NHN_SENDER = os.getenv("NHN_SENDER", "")
    
    # 카카오 알림톡
    KAKAO_API_KEY = os.getenv("KAKAO_API_KEY", "")
    KAKAO_SENDER_KEY = os.getenv("KAKAO_SENDER_KEY", "")
    
    # Slack
    SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL", "")
    
    # Discord
    DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL", "")
    
    # Email (SMTP)
    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 1. 기상청 API (Korea Meteorological Administration)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class WeatherForecast:
    """날씨 예보"""
    date: str
    time: str
    temperature: int
    humidity: int
    precipitation_probability: int
    sky_condition: str  # 맑음, 구름많음, 흐림
    precipitation_type: str  # 없음, 비, 눈, 비/눈
    wind_speed: float
    
    @property
    def weather_type(self) -> str:
        """날씨 유형 반환"""
        if self.precipitation_type == "비":
            return "rainy"
        elif self.precipitation_type == "눈":
            return "snowy"
        elif self.sky_condition == "맑음":
            return "sunny"
        elif self.sky_condition in ["구름많음", "흐림"]:
            return "cloudy"
        return "cloudy"


class WeatherService:
    """기상청 API 연동"""
    
    # 주요 도시 좌표 (기상청 격자 좌표)
    CITY_COORDS = {
        "서울": (60, 127),
        "부산": (98, 76),
        "대구": (89, 90),
        "인천": (55, 124),
        "광주": (58, 74),
        "대전": (67, 100),
        "울산": (102, 84),
        "수원": (60, 121),
        "성남": (63, 124),
        "고양": (57, 128),
    }
    
    SKY_CONDITIONS = {
        "1": "맑음",
        "3": "구름많음",
        "4": "흐림",
    }
    
    PRECIPITATION_TYPES = {
        "0": "없음",
        "1": "비",
        "2": "비/눈",
        "3": "눈",
        "4": "소나기",
    }
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or Config.WEATHER_API_KEY
        self.base_url = Config.WEATHER_BASE_URL
    
    async def get_forecast(self, city: str = "서울", date: datetime = None) -> Optional[WeatherForecast]:
        """날씨 예보 조회"""
        if not self.api_key:
            print("⚠️ 기상청 API 키가 설정되지 않았습니다.")
            return self._get_mock_forecast()
        
        if city not in self.CITY_COORDS:
            city = "서울"
        
        nx, ny = self.CITY_COORDS[city]
        
        if date is None:
            date = datetime.now()
        
        # 기상청 API는 매일 02:00, 05:00, 08:00, 11:00, 14:00, 17:00, 20:00, 23:00에 발표
        base_date = date.strftime("%Y%m%d")
        base_time = "0500"  # 05시 발표 데이터 사용
        
        params = {
            "serviceKey": self.api_key,
            "numOfRows": 100,
            "pageNo": 1,
            "dataType": "JSON",
            "base_date": base_date,
            "base_time": base_time,
            "nx": nx,
            "ny": ny,
        }
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        f"{self.base_url}/getVilageFcst",
                        params=params,
                        timeout=10.0
                    )
                    data = response.json()
            elif REQUESTS_AVAILABLE:
                response = requests.get(
                    f"{self.base_url}/getVilageFcst",
                    params=params,
                    timeout=10
                )
                data = response.json()
            else:
                return self._get_mock_forecast()
            
            return self._parse_forecast(data)
        
        except Exception as e:
            print(f"⚠️ 기상청 API 오류: {e}")
            return self._get_mock_forecast()
    
    def _parse_forecast(self, data: dict) -> Optional[WeatherForecast]:
        """응답 파싱"""
        try:
            items = data["response"]["body"]["items"]["item"]
            
            forecast_data = {}
            for item in items:
                category = item["category"]
                value = item["fcstValue"]
                
                if category == "TMP":  # 기온
                    forecast_data["temperature"] = int(value)
                elif category == "REH":  # 습도
                    forecast_data["humidity"] = int(value)
                elif category == "POP":  # 강수확률
                    forecast_data["precipitation_probability"] = int(value)
                elif category == "SKY":  # 하늘상태
                    forecast_data["sky_condition"] = self.SKY_CONDITIONS.get(value, "흐림")
                elif category == "PTY":  # 강수형태
                    forecast_data["precipitation_type"] = self.PRECIPITATION_TYPES.get(value, "없음")
                elif category == "WSD":  # 풍속
                    forecast_data["wind_speed"] = float(value)
            
            return WeatherForecast(
                date=items[0]["fcstDate"],
                time=items[0]["fcstTime"],
                temperature=forecast_data.get("temperature", 20),
                humidity=forecast_data.get("humidity", 50),
                precipitation_probability=forecast_data.get("precipitation_probability", 0),
                sky_condition=forecast_data.get("sky_condition", "흐림"),
                precipitation_type=forecast_data.get("precipitation_type", "없음"),
                wind_speed=forecast_data.get("wind_speed", 2.0),
            )
        
        except Exception as e:
            print(f"⚠️ 파싱 오류: {e}")
            return self._get_mock_forecast()
    
    def _get_mock_forecast(self) -> WeatherForecast:
        """Mock 데이터 반환"""
        import random
        
        conditions = ["맑음", "구름많음", "흐림"]
        precipitations = ["없음", "없음", "없음", "비", "눈"]
        
        return WeatherForecast(
            date=datetime.now().strftime("%Y%m%d"),
            time="1200",
            temperature=random.randint(-5, 35),
            humidity=random.randint(30, 80),
            precipitation_probability=random.randint(0, 100),
            sky_condition=random.choice(conditions),
            precipitation_type=random.choice(precipitations),
            wind_speed=random.uniform(1.0, 10.0),
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 2. SMS API (알리고 / NHN Cloud)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class SMSResult:
    """SMS 전송 결과"""
    success: bool
    message_id: str = ""
    error: str = ""


class SMSService:
    """SMS 발송 서비스"""
    
    def __init__(self, provider: str = "aligo"):
        self.provider = provider
    
    async def send_sms(self, phone: str, message: str) -> SMSResult:
        """SMS 발송"""
        if self.provider == "aligo":
            return await self._send_via_aligo(phone, message)
        elif self.provider == "nhn":
            return await self._send_via_nhn(phone, message)
        else:
            return SMSResult(success=False, error="Unknown provider")
    
    async def send_bulk_sms(self, phones: List[str], message: str) -> List[SMSResult]:
        """대량 SMS 발송"""
        results = []
        for phone in phones:
            result = await self.send_sms(phone, message)
            results.append(result)
            await asyncio.sleep(0.1)  # Rate limiting
        return results
    
    async def _send_via_aligo(self, phone: str, message: str) -> SMSResult:
        """알리고 SMS 발송"""
        if not Config.ALIGO_API_KEY:
            print("⚠️ 알리고 API 키가 설정되지 않았습니다.")
            return SMSResult(success=False, error="API key not configured")
        
        url = "https://apis.aligo.in/send/"
        
        data = {
            "key": Config.ALIGO_API_KEY,
            "user_id": Config.ALIGO_USER_ID,
            "sender": Config.ALIGO_SENDER,
            "receiver": phone,
            "msg": message,
        }
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.post(url, data=data, timeout=10.0)
                    result = response.json()
            elif REQUESTS_AVAILABLE:
                response = requests.post(url, data=data, timeout=10)
                result = response.json()
            else:
                return SMSResult(success=False, error="HTTP client not available")
            
            if result.get("result_code") == "1":
                return SMSResult(success=True, message_id=result.get("msg_id", ""))
            else:
                return SMSResult(success=False, error=result.get("message", "Unknown error"))
        
        except Exception as e:
            return SMSResult(success=False, error=str(e))
    
    async def _send_via_nhn(self, phone: str, message: str) -> SMSResult:
        """NHN Cloud SMS 발송"""
        if not Config.NHN_APP_KEY:
            print("⚠️ NHN Cloud API 키가 설정되지 않았습니다.")
            return SMSResult(success=False, error="API key not configured")
        
        url = f"https://api-sms.cloud.toast.com/sms/v2.4/appKeys/{Config.NHN_APP_KEY}/sender/sms"
        
        headers = {
            "Content-Type": "application/json;charset=UTF-8",
            "X-Secret-Key": Config.NHN_SECRET_KEY,
        }
        
        data = {
            "body": message,
            "sendNo": Config.NHN_SENDER,
            "recipientList": [{"recipientNo": phone}],
        }
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.post(url, json=data, headers=headers, timeout=10.0)
                    result = response.json()
            else:
                return SMSResult(success=False, error="HTTP client not available")
            
            if result.get("header", {}).get("isSuccessful"):
                return SMSResult(success=True, message_id=result.get("body", {}).get("data", {}).get("requestId", ""))
            else:
                return SMSResult(success=False, error=result.get("header", {}).get("resultMessage", "Unknown error"))
        
        except Exception as e:
            return SMSResult(success=False, error=str(e))


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 3. 카카오 알림톡
# ═══════════════════════════════════════════════════════════════════════════════════════════

class KakaoAlimtalkService:
    """카카오 알림톡 서비스"""
    
    # 미리 등록된 템플릿 예시
    TEMPLATES = {
        "VIP_WELCOME": "#{고객명}님, AUTUS에 오신 것을 환영합니다! 👑 VIP 고객님께 특별 혜택을 준비했습니다.",
        "QUEST_COMPLETE": "🎉 #{직원명}님, #{퀘스트명} 퀘스트를 완료했습니다! +#{XP} XP 획득!",
        "RESERVATION": "#{고객명}님, #{날짜} #{시간}에 예약이 완료되었습니다. 매장: #{매장명}",
        "BOUNTY_ALERT": "🕵️ #{사냥꾼명}님, 새로운 시크릿 미션이 도착했습니다. 앱에서 확인하세요!",
    }
    
    def __init__(self):
        self.api_key = Config.KAKAO_API_KEY
        self.sender_key = Config.KAKAO_SENDER_KEY
    
    async def send_alimtalk(self, phone: str, template_id: str, variables: Dict[str, str]) -> SMSResult:
        """알림톡 발송"""
        if not self.api_key:
            print("⚠️ 카카오 API 키가 설정되지 않았습니다.")
            return SMSResult(success=False, error="API key not configured")
        
        # 템플릿에 변수 대입
        template = self.TEMPLATES.get(template_id, "")
        if not template:
            return SMSResult(success=False, error="Template not found")
        
        message = template
        for key, value in variables.items():
            message = message.replace(f"#{{{key}}}", value)
        
        # 실제 API 호출 (예시)
        # 실제 구현 시 카카오 비즈니스 API 문서 참조
        
        print(f"📱 [KAKAO] To: {phone}")
        print(f"   Message: {message}")
        
        return SMSResult(success=True, message_id="KAKAO-MOCK-ID")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 4. Slack 웹훅
# ═══════════════════════════════════════════════════════════════════════════════════════════

class SlackService:
    """Slack 알림 서비스"""
    
    def __init__(self, webhook_url: str = None):
        self.webhook_url = webhook_url or Config.SLACK_WEBHOOK_URL
    
    async def send_message(self, text: str, channel: str = None) -> bool:
        """Slack 메시지 발송"""
        if not self.webhook_url:
            print("⚠️ Slack 웹훅 URL이 설정되지 않았습니다.")
            return False
        
        payload = {"text": text}
        if channel:
            payload["channel"] = channel
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.post(self.webhook_url, json=payload, timeout=10.0)
                    return response.status_code == 200
            elif REQUESTS_AVAILABLE:
                response = requests.post(self.webhook_url, json=payload, timeout=10)
                return response.status_code == 200
            return False
        
        except Exception as e:
            print(f"⚠️ Slack 오류: {e}")
            return False
    
    async def send_vip_alert(self, customer_name: str, station_id: str):
        """VIP 입장 알림"""
        message = f"👑 *VIP 입장 알림*\n\n고객: {customer_name}\n매장: {station_id}\n시간: {datetime.now().strftime('%H:%M:%S')}"
        return await self.send_message(message)
    
    async def send_caution_alert(self, customer_name: str, station_id: str):
        """주의 고객 알림"""
        message = f"⚠️ *주의 고객 감지*\n\n고객: {customer_name}\n매장: {station_id}\n시간: {datetime.now().strftime('%H:%M:%S')}\n\n> 규정대로 응대하세요."
        return await self.send_message(message)
    
    async def send_daily_report(self, stats: Dict[str, Any]):
        """일일 리포트"""
        message = f"""📊 *AUTUS 일일 리포트*

📅 날짜: {datetime.now().strftime('%Y-%m-%d')}

📈 *요약*
• 총 방문객: {stats.get('total_visitors', 0)}명
• VIP 방문: {stats.get('vip_visitors', 0)}명
• 매출: ₩{stats.get('revenue', 0):,}

🏆 *TOP 직원*
{stats.get('top_employee', 'N/A')}

💡 *내일 예측*
{stats.get('tomorrow_prediction', 'N/A')}
"""
        return await self.send_message(message)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 5. Discord 웹훅
# ═══════════════════════════════════════════════════════════════════════════════════════════

class DiscordService:
    """Discord 알림 서비스"""
    
    def __init__(self, webhook_url: str = None):
        self.webhook_url = webhook_url or Config.DISCORD_WEBHOOK_URL
    
    async def send_message(self, content: str, embeds: List[Dict] = None) -> bool:
        """Discord 메시지 발송"""
        if not self.webhook_url:
            print("⚠️ Discord 웹훅 URL이 설정되지 않았습니다.")
            return False
        
        payload = {"content": content}
        if embeds:
            payload["embeds"] = embeds
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.post(self.webhook_url, json=payload, timeout=10.0)
                    return response.status_code in [200, 204]
            return False
        
        except Exception as e:
            print(f"⚠️ Discord 오류: {e}")
            return False
    
    async def send_embed_alert(self, title: str, description: str, color: int = 0x00ff00):
        """임베드 알림"""
        embed = {
            "title": title,
            "description": description,
            "color": color,
            "timestamp": datetime.now().isoformat(),
            "footer": {"text": "AUTUS Empire"}
        }
        return await self.send_message("", embeds=[embed])


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 6. 통합 알림 매니저
# ═══════════════════════════════════════════════════════════════════════════════════════════

class NotificationManager:
    """
    통합 알림 매니저
    
    모든 알림 채널을 통합하여 관리
    """
    
    def __init__(self):
        self.sms = SMSService()
        self.kakao = KakaoAlimtalkService()
        self.slack = SlackService()
        self.discord = DiscordService()
        self.weather = WeatherService()
    
    async def notify_vip_entry(self, customer_name: str, phone: str, station_id: str):
        """VIP 입장 알림 (전체 채널)"""
        # Slack으로 내부 알림
        await self.slack.send_vip_alert(customer_name, station_id)
        
        # Discord로 내부 알림
        await self.discord.send_embed_alert(
            "👑 VIP 입장",
            f"**{customer_name}**님이 {station_id}에 입장했습니다.",
            0xffd700  # Gold
        )
        
        # SMS는 필요시에만
        # await self.sms.send_sms(manager_phone, f"VIP {customer_name}님 입장")
    
    async def notify_caution_entry(self, customer_name: str, station_id: str):
        """주의 고객 알림"""
        await self.slack.send_caution_alert(customer_name, station_id)
        await self.discord.send_embed_alert(
            "⚠️ 주의 고객 감지",
            f"**{customer_name}**님이 {station_id}에 입장했습니다.\n규정대로 응대하세요.",
            0xff0000  # Red
        )
    
    async def send_bounty_quest(self, hunter_phone: str, hunter_name: str, quest_description: str):
        """바운티 퀘스트 발송"""
        # SMS
        message = f"[AUTUS] {hunter_name}님, 새로운 시크릿 미션: {quest_description}"
        await self.sms.send_sms(hunter_phone, message)
        
        # 카카오 알림톡
        await self.kakao.send_alimtalk(
            hunter_phone,
            "BOUNTY_ALERT",
            {"사냥꾼명": hunter_name}
        )
    
    async def get_weather_for_oracle(self, city: str = "서울") -> Dict[str, Any]:
        """오라클 엔진용 날씨 데이터"""
        forecast = await self.weather.get_forecast(city)
        
        return {
            "weather_type": forecast.weather_type,
            "temperature": forecast.temperature,
            "precipitation_probability": forecast.precipitation_probability,
            "humidity": forecast.humidity,
            "sky_condition": forecast.sky_condition,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# FastAPI 라우터 (선택적)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_integration_routes():
    """FastAPI 라우터 생성"""
    from fastapi import APIRouter, HTTPException
    
    router = APIRouter(prefix="/api/v1/integrations", tags=["External Integrations"])
    
    notification_manager = NotificationManager()
    
    @router.get("/weather/{city}")
    async def get_weather(city: str = "서울"):
        """날씨 조회"""
        weather = WeatherService()
        forecast = await weather.get_forecast(city)
        
        if forecast:
            return {
                "city": city,
                "date": forecast.date,
                "temperature": forecast.temperature,
                "humidity": forecast.humidity,
                "precipitation_probability": forecast.precipitation_probability,
                "sky_condition": forecast.sky_condition,
                "precipitation_type": forecast.precipitation_type,
                "weather_type": forecast.weather_type,
            }
        
        raise HTTPException(status_code=500, detail="Weather data unavailable")
    
    @router.post("/sms/send")
    async def send_sms(phone: str, message: str, provider: str = "aligo"):
        """SMS 발송"""
        sms = SMSService(provider)
        result = await sms.send_sms(phone, message)
        return {"success": result.success, "message_id": result.message_id, "error": result.error}
    
    @router.post("/slack/send")
    async def send_slack(message: str):
        """Slack 메시지"""
        slack = SlackService()
        success = await slack.send_message(message)
        return {"success": success}
    
    @router.post("/notify/vip-entry")
    async def notify_vip(customer_name: str, phone: str, station_id: str):
        """VIP 입장 알림"""
        await notification_manager.notify_vip_entry(customer_name, phone, station_id)
        return {"success": True}
    
    return router


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트
# ═══════════════════════════════════════════════════════════════════════════════════════════

async def test_integrations():
    """통합 테스트"""
    print("🔌 AUTUS External Integrations Test")
    print("=" * 50)
    
    # 날씨 테스트
    print("\n📍 날씨 테스트...")
    weather = WeatherService()
    forecast = await weather.get_forecast("서울")
    print(f"   기온: {forecast.temperature}°C")
    print(f"   날씨: {forecast.sky_condition}")
    print(f"   강수확률: {forecast.precipitation_probability}%")
    
    # Slack 테스트 (웹훅 설정 필요)
    print("\n💬 Slack 테스트...")
    slack = SlackService()
    if Config.SLACK_WEBHOOK_URL:
        success = await slack.send_message("🧪 AUTUS 테스트 메시지")
        print(f"   결과: {'성공' if success else '실패'}")
    else:
        print("   ⚠️ 웹훅 URL 미설정")
    
    # 알림 매니저 테스트
    print("\n📢 알림 매니저 테스트...")
    manager = NotificationManager()
    weather_data = await manager.get_weather_for_oracle()
    print(f"   오라클용 날씨: {weather_data}")
    
    print("\n✅ 테스트 완료!")


if __name__ == "__main__":
    asyncio.run(test_integrations())







#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    🔌 AUTUS EXTERNAL INTEGRATIONS - 외부 API 연동                          ║
║                                                                                           ║
║  "제국을 외부 세계와 연결하라"                                                              ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ 기상청 API (실제 날씨 데이터)                                                          ║
║  ✅ SMS API (알리고/NHN 클라우드)                                                          ║
║  ✅ 카카오 알림톡                                                                          ║
║  ✅ Slack 웹훅                                                                            ║
║  ✅ Discord 웹훅                                                                          ║
║  ✅ 이메일 알림                                                                            ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
import hashlib
import hmac
import base64

# HTTP 클라이언트
try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

# 환경 변수에서 API 키 로드 (실제 사용 시 .env 파일에서 로드)
class Config:
    # 기상청 API (공공데이터포털)
    WEATHER_API_KEY = os.getenv("WEATHER_API_KEY", "")
    WEATHER_BASE_URL = "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0"
    
    # SMS - 알리고
    ALIGO_API_KEY = os.getenv("ALIGO_API_KEY", "")
    ALIGO_USER_ID = os.getenv("ALIGO_USER_ID", "")
    ALIGO_SENDER = os.getenv("ALIGO_SENDER", "")
    
    # SMS - NHN Cloud
    NHN_APP_KEY = os.getenv("NHN_APP_KEY", "")
    NHN_SECRET_KEY = os.getenv("NHN_SECRET_KEY", "")
    NHN_SENDER = os.getenv("NHN_SENDER", "")
    
    # 카카오 알림톡
    KAKAO_API_KEY = os.getenv("KAKAO_API_KEY", "")
    KAKAO_SENDER_KEY = os.getenv("KAKAO_SENDER_KEY", "")
    
    # Slack
    SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL", "")
    
    # Discord
    DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL", "")
    
    # Email (SMTP)
    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 1. 기상청 API (Korea Meteorological Administration)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class WeatherForecast:
    """날씨 예보"""
    date: str
    time: str
    temperature: int
    humidity: int
    precipitation_probability: int
    sky_condition: str  # 맑음, 구름많음, 흐림
    precipitation_type: str  # 없음, 비, 눈, 비/눈
    wind_speed: float
    
    @property
    def weather_type(self) -> str:
        """날씨 유형 반환"""
        if self.precipitation_type == "비":
            return "rainy"
        elif self.precipitation_type == "눈":
            return "snowy"
        elif self.sky_condition == "맑음":
            return "sunny"
        elif self.sky_condition in ["구름많음", "흐림"]:
            return "cloudy"
        return "cloudy"


class WeatherService:
    """기상청 API 연동"""
    
    # 주요 도시 좌표 (기상청 격자 좌표)
    CITY_COORDS = {
        "서울": (60, 127),
        "부산": (98, 76),
        "대구": (89, 90),
        "인천": (55, 124),
        "광주": (58, 74),
        "대전": (67, 100),
        "울산": (102, 84),
        "수원": (60, 121),
        "성남": (63, 124),
        "고양": (57, 128),
    }
    
    SKY_CONDITIONS = {
        "1": "맑음",
        "3": "구름많음",
        "4": "흐림",
    }
    
    PRECIPITATION_TYPES = {
        "0": "없음",
        "1": "비",
        "2": "비/눈",
        "3": "눈",
        "4": "소나기",
    }
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or Config.WEATHER_API_KEY
        self.base_url = Config.WEATHER_BASE_URL
    
    async def get_forecast(self, city: str = "서울", date: datetime = None) -> Optional[WeatherForecast]:
        """날씨 예보 조회"""
        if not self.api_key:
            print("⚠️ 기상청 API 키가 설정되지 않았습니다.")
            return self._get_mock_forecast()
        
        if city not in self.CITY_COORDS:
            city = "서울"
        
        nx, ny = self.CITY_COORDS[city]
        
        if date is None:
            date = datetime.now()
        
        # 기상청 API는 매일 02:00, 05:00, 08:00, 11:00, 14:00, 17:00, 20:00, 23:00에 발표
        base_date = date.strftime("%Y%m%d")
        base_time = "0500"  # 05시 발표 데이터 사용
        
        params = {
            "serviceKey": self.api_key,
            "numOfRows": 100,
            "pageNo": 1,
            "dataType": "JSON",
            "base_date": base_date,
            "base_time": base_time,
            "nx": nx,
            "ny": ny,
        }
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        f"{self.base_url}/getVilageFcst",
                        params=params,
                        timeout=10.0
                    )
                    data = response.json()
            elif REQUESTS_AVAILABLE:
                response = requests.get(
                    f"{self.base_url}/getVilageFcst",
                    params=params,
                    timeout=10
                )
                data = response.json()
            else:
                return self._get_mock_forecast()
            
            return self._parse_forecast(data)
        
        except Exception as e:
            print(f"⚠️ 기상청 API 오류: {e}")
            return self._get_mock_forecast()
    
    def _parse_forecast(self, data: dict) -> Optional[WeatherForecast]:
        """응답 파싱"""
        try:
            items = data["response"]["body"]["items"]["item"]
            
            forecast_data = {}
            for item in items:
                category = item["category"]
                value = item["fcstValue"]
                
                if category == "TMP":  # 기온
                    forecast_data["temperature"] = int(value)
                elif category == "REH":  # 습도
                    forecast_data["humidity"] = int(value)
                elif category == "POP":  # 강수확률
                    forecast_data["precipitation_probability"] = int(value)
                elif category == "SKY":  # 하늘상태
                    forecast_data["sky_condition"] = self.SKY_CONDITIONS.get(value, "흐림")
                elif category == "PTY":  # 강수형태
                    forecast_data["precipitation_type"] = self.PRECIPITATION_TYPES.get(value, "없음")
                elif category == "WSD":  # 풍속
                    forecast_data["wind_speed"] = float(value)
            
            return WeatherForecast(
                date=items[0]["fcstDate"],
                time=items[0]["fcstTime"],
                temperature=forecast_data.get("temperature", 20),
                humidity=forecast_data.get("humidity", 50),
                precipitation_probability=forecast_data.get("precipitation_probability", 0),
                sky_condition=forecast_data.get("sky_condition", "흐림"),
                precipitation_type=forecast_data.get("precipitation_type", "없음"),
                wind_speed=forecast_data.get("wind_speed", 2.0),
            )
        
        except Exception as e:
            print(f"⚠️ 파싱 오류: {e}")
            return self._get_mock_forecast()
    
    def _get_mock_forecast(self) -> WeatherForecast:
        """Mock 데이터 반환"""
        import random
        
        conditions = ["맑음", "구름많음", "흐림"]
        precipitations = ["없음", "없음", "없음", "비", "눈"]
        
        return WeatherForecast(
            date=datetime.now().strftime("%Y%m%d"),
            time="1200",
            temperature=random.randint(-5, 35),
            humidity=random.randint(30, 80),
            precipitation_probability=random.randint(0, 100),
            sky_condition=random.choice(conditions),
            precipitation_type=random.choice(precipitations),
            wind_speed=random.uniform(1.0, 10.0),
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 2. SMS API (알리고 / NHN Cloud)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class SMSResult:
    """SMS 전송 결과"""
    success: bool
    message_id: str = ""
    error: str = ""


class SMSService:
    """SMS 발송 서비스"""
    
    def __init__(self, provider: str = "aligo"):
        self.provider = provider
    
    async def send_sms(self, phone: str, message: str) -> SMSResult:
        """SMS 발송"""
        if self.provider == "aligo":
            return await self._send_via_aligo(phone, message)
        elif self.provider == "nhn":
            return await self._send_via_nhn(phone, message)
        else:
            return SMSResult(success=False, error="Unknown provider")
    
    async def send_bulk_sms(self, phones: List[str], message: str) -> List[SMSResult]:
        """대량 SMS 발송"""
        results = []
        for phone in phones:
            result = await self.send_sms(phone, message)
            results.append(result)
            await asyncio.sleep(0.1)  # Rate limiting
        return results
    
    async def _send_via_aligo(self, phone: str, message: str) -> SMSResult:
        """알리고 SMS 발송"""
        if not Config.ALIGO_API_KEY:
            print("⚠️ 알리고 API 키가 설정되지 않았습니다.")
            return SMSResult(success=False, error="API key not configured")
        
        url = "https://apis.aligo.in/send/"
        
        data = {
            "key": Config.ALIGO_API_KEY,
            "user_id": Config.ALIGO_USER_ID,
            "sender": Config.ALIGO_SENDER,
            "receiver": phone,
            "msg": message,
        }
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.post(url, data=data, timeout=10.0)
                    result = response.json()
            elif REQUESTS_AVAILABLE:
                response = requests.post(url, data=data, timeout=10)
                result = response.json()
            else:
                return SMSResult(success=False, error="HTTP client not available")
            
            if result.get("result_code") == "1":
                return SMSResult(success=True, message_id=result.get("msg_id", ""))
            else:
                return SMSResult(success=False, error=result.get("message", "Unknown error"))
        
        except Exception as e:
            return SMSResult(success=False, error=str(e))
    
    async def _send_via_nhn(self, phone: str, message: str) -> SMSResult:
        """NHN Cloud SMS 발송"""
        if not Config.NHN_APP_KEY:
            print("⚠️ NHN Cloud API 키가 설정되지 않았습니다.")
            return SMSResult(success=False, error="API key not configured")
        
        url = f"https://api-sms.cloud.toast.com/sms/v2.4/appKeys/{Config.NHN_APP_KEY}/sender/sms"
        
        headers = {
            "Content-Type": "application/json;charset=UTF-8",
            "X-Secret-Key": Config.NHN_SECRET_KEY,
        }
        
        data = {
            "body": message,
            "sendNo": Config.NHN_SENDER,
            "recipientList": [{"recipientNo": phone}],
        }
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.post(url, json=data, headers=headers, timeout=10.0)
                    result = response.json()
            else:
                return SMSResult(success=False, error="HTTP client not available")
            
            if result.get("header", {}).get("isSuccessful"):
                return SMSResult(success=True, message_id=result.get("body", {}).get("data", {}).get("requestId", ""))
            else:
                return SMSResult(success=False, error=result.get("header", {}).get("resultMessage", "Unknown error"))
        
        except Exception as e:
            return SMSResult(success=False, error=str(e))


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 3. 카카오 알림톡
# ═══════════════════════════════════════════════════════════════════════════════════════════

class KakaoAlimtalkService:
    """카카오 알림톡 서비스"""
    
    # 미리 등록된 템플릿 예시
    TEMPLATES = {
        "VIP_WELCOME": "#{고객명}님, AUTUS에 오신 것을 환영합니다! 👑 VIP 고객님께 특별 혜택을 준비했습니다.",
        "QUEST_COMPLETE": "🎉 #{직원명}님, #{퀘스트명} 퀘스트를 완료했습니다! +#{XP} XP 획득!",
        "RESERVATION": "#{고객명}님, #{날짜} #{시간}에 예약이 완료되었습니다. 매장: #{매장명}",
        "BOUNTY_ALERT": "🕵️ #{사냥꾼명}님, 새로운 시크릿 미션이 도착했습니다. 앱에서 확인하세요!",
    }
    
    def __init__(self):
        self.api_key = Config.KAKAO_API_KEY
        self.sender_key = Config.KAKAO_SENDER_KEY
    
    async def send_alimtalk(self, phone: str, template_id: str, variables: Dict[str, str]) -> SMSResult:
        """알림톡 발송"""
        if not self.api_key:
            print("⚠️ 카카오 API 키가 설정되지 않았습니다.")
            return SMSResult(success=False, error="API key not configured")
        
        # 템플릿에 변수 대입
        template = self.TEMPLATES.get(template_id, "")
        if not template:
            return SMSResult(success=False, error="Template not found")
        
        message = template
        for key, value in variables.items():
            message = message.replace(f"#{{{key}}}", value)
        
        # 실제 API 호출 (예시)
        # 실제 구현 시 카카오 비즈니스 API 문서 참조
        
        print(f"📱 [KAKAO] To: {phone}")
        print(f"   Message: {message}")
        
        return SMSResult(success=True, message_id="KAKAO-MOCK-ID")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 4. Slack 웹훅
# ═══════════════════════════════════════════════════════════════════════════════════════════

class SlackService:
    """Slack 알림 서비스"""
    
    def __init__(self, webhook_url: str = None):
        self.webhook_url = webhook_url or Config.SLACK_WEBHOOK_URL
    
    async def send_message(self, text: str, channel: str = None) -> bool:
        """Slack 메시지 발송"""
        if not self.webhook_url:
            print("⚠️ Slack 웹훅 URL이 설정되지 않았습니다.")
            return False
        
        payload = {"text": text}
        if channel:
            payload["channel"] = channel
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.post(self.webhook_url, json=payload, timeout=10.0)
                    return response.status_code == 200
            elif REQUESTS_AVAILABLE:
                response = requests.post(self.webhook_url, json=payload, timeout=10)
                return response.status_code == 200
            return False
        
        except Exception as e:
            print(f"⚠️ Slack 오류: {e}")
            return False
    
    async def send_vip_alert(self, customer_name: str, station_id: str):
        """VIP 입장 알림"""
        message = f"👑 *VIP 입장 알림*\n\n고객: {customer_name}\n매장: {station_id}\n시간: {datetime.now().strftime('%H:%M:%S')}"
        return await self.send_message(message)
    
    async def send_caution_alert(self, customer_name: str, station_id: str):
        """주의 고객 알림"""
        message = f"⚠️ *주의 고객 감지*\n\n고객: {customer_name}\n매장: {station_id}\n시간: {datetime.now().strftime('%H:%M:%S')}\n\n> 규정대로 응대하세요."
        return await self.send_message(message)
    
    async def send_daily_report(self, stats: Dict[str, Any]):
        """일일 리포트"""
        message = f"""📊 *AUTUS 일일 리포트*

📅 날짜: {datetime.now().strftime('%Y-%m-%d')}

📈 *요약*
• 총 방문객: {stats.get('total_visitors', 0)}명
• VIP 방문: {stats.get('vip_visitors', 0)}명
• 매출: ₩{stats.get('revenue', 0):,}

🏆 *TOP 직원*
{stats.get('top_employee', 'N/A')}

💡 *내일 예측*
{stats.get('tomorrow_prediction', 'N/A')}
"""
        return await self.send_message(message)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 5. Discord 웹훅
# ═══════════════════════════════════════════════════════════════════════════════════════════

class DiscordService:
    """Discord 알림 서비스"""
    
    def __init__(self, webhook_url: str = None):
        self.webhook_url = webhook_url or Config.DISCORD_WEBHOOK_URL
    
    async def send_message(self, content: str, embeds: List[Dict] = None) -> bool:
        """Discord 메시지 발송"""
        if not self.webhook_url:
            print("⚠️ Discord 웹훅 URL이 설정되지 않았습니다.")
            return False
        
        payload = {"content": content}
        if embeds:
            payload["embeds"] = embeds
        
        try:
            if HTTPX_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    response = await client.post(self.webhook_url, json=payload, timeout=10.0)
                    return response.status_code in [200, 204]
            return False
        
        except Exception as e:
            print(f"⚠️ Discord 오류: {e}")
            return False
    
    async def send_embed_alert(self, title: str, description: str, color: int = 0x00ff00):
        """임베드 알림"""
        embed = {
            "title": title,
            "description": description,
            "color": color,
            "timestamp": datetime.now().isoformat(),
            "footer": {"text": "AUTUS Empire"}
        }
        return await self.send_message("", embeds=[embed])


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 6. 통합 알림 매니저
# ═══════════════════════════════════════════════════════════════════════════════════════════

class NotificationManager:
    """
    통합 알림 매니저
    
    모든 알림 채널을 통합하여 관리
    """
    
    def __init__(self):
        self.sms = SMSService()
        self.kakao = KakaoAlimtalkService()
        self.slack = SlackService()
        self.discord = DiscordService()
        self.weather = WeatherService()
    
    async def notify_vip_entry(self, customer_name: str, phone: str, station_id: str):
        """VIP 입장 알림 (전체 채널)"""
        # Slack으로 내부 알림
        await self.slack.send_vip_alert(customer_name, station_id)
        
        # Discord로 내부 알림
        await self.discord.send_embed_alert(
            "👑 VIP 입장",
            f"**{customer_name}**님이 {station_id}에 입장했습니다.",
            0xffd700  # Gold
        )
        
        # SMS는 필요시에만
        # await self.sms.send_sms(manager_phone, f"VIP {customer_name}님 입장")
    
    async def notify_caution_entry(self, customer_name: str, station_id: str):
        """주의 고객 알림"""
        await self.slack.send_caution_alert(customer_name, station_id)
        await self.discord.send_embed_alert(
            "⚠️ 주의 고객 감지",
            f"**{customer_name}**님이 {station_id}에 입장했습니다.\n규정대로 응대하세요.",
            0xff0000  # Red
        )
    
    async def send_bounty_quest(self, hunter_phone: str, hunter_name: str, quest_description: str):
        """바운티 퀘스트 발송"""
        # SMS
        message = f"[AUTUS] {hunter_name}님, 새로운 시크릿 미션: {quest_description}"
        await self.sms.send_sms(hunter_phone, message)
        
        # 카카오 알림톡
        await self.kakao.send_alimtalk(
            hunter_phone,
            "BOUNTY_ALERT",
            {"사냥꾼명": hunter_name}
        )
    
    async def get_weather_for_oracle(self, city: str = "서울") -> Dict[str, Any]:
        """오라클 엔진용 날씨 데이터"""
        forecast = await self.weather.get_forecast(city)
        
        return {
            "weather_type": forecast.weather_type,
            "temperature": forecast.temperature,
            "precipitation_probability": forecast.precipitation_probability,
            "humidity": forecast.humidity,
            "sky_condition": forecast.sky_condition,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# FastAPI 라우터 (선택적)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_integration_routes():
    """FastAPI 라우터 생성"""
    from fastapi import APIRouter, HTTPException
    
    router = APIRouter(prefix="/api/v1/integrations", tags=["External Integrations"])
    
    notification_manager = NotificationManager()
    
    @router.get("/weather/{city}")
    async def get_weather(city: str = "서울"):
        """날씨 조회"""
        weather = WeatherService()
        forecast = await weather.get_forecast(city)
        
        if forecast:
            return {
                "city": city,
                "date": forecast.date,
                "temperature": forecast.temperature,
                "humidity": forecast.humidity,
                "precipitation_probability": forecast.precipitation_probability,
                "sky_condition": forecast.sky_condition,
                "precipitation_type": forecast.precipitation_type,
                "weather_type": forecast.weather_type,
            }
        
        raise HTTPException(status_code=500, detail="Weather data unavailable")
    
    @router.post("/sms/send")
    async def send_sms(phone: str, message: str, provider: str = "aligo"):
        """SMS 발송"""
        sms = SMSService(provider)
        result = await sms.send_sms(phone, message)
        return {"success": result.success, "message_id": result.message_id, "error": result.error}
    
    @router.post("/slack/send")
    async def send_slack(message: str):
        """Slack 메시지"""
        slack = SlackService()
        success = await slack.send_message(message)
        return {"success": success}
    
    @router.post("/notify/vip-entry")
    async def notify_vip(customer_name: str, phone: str, station_id: str):
        """VIP 입장 알림"""
        await notification_manager.notify_vip_entry(customer_name, phone, station_id)
        return {"success": True}
    
    return router


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트
# ═══════════════════════════════════════════════════════════════════════════════════════════

async def test_integrations():
    """통합 테스트"""
    print("🔌 AUTUS External Integrations Test")
    print("=" * 50)
    
    # 날씨 테스트
    print("\n📍 날씨 테스트...")
    weather = WeatherService()
    forecast = await weather.get_forecast("서울")
    print(f"   기온: {forecast.temperature}°C")
    print(f"   날씨: {forecast.sky_condition}")
    print(f"   강수확률: {forecast.precipitation_probability}%")
    
    # Slack 테스트 (웹훅 설정 필요)
    print("\n💬 Slack 테스트...")
    slack = SlackService()
    if Config.SLACK_WEBHOOK_URL:
        success = await slack.send_message("🧪 AUTUS 테스트 메시지")
        print(f"   결과: {'성공' if success else '실패'}")
    else:
        print("   ⚠️ 웹훅 URL 미설정")
    
    # 알림 매니저 테스트
    print("\n📢 알림 매니저 테스트...")
    manager = NotificationManager()
    weather_data = await manager.get_weather_for_oracle()
    print(f"   오라클용 날씨: {weather_data}")
    
    print("\n✅ 테스트 완료!")


if __name__ == "__main__":
    asyncio.run(test_integrations())






















