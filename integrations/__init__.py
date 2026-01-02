"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🔗 AUTUS Physics Map - 외부 서비스 연동 모듈                                 ║
║                                                                               ║
║  지원 서비스:                                                                 ║
║  - Google Sheets: 데이터 입출력                                               ║
║  - Make (Integromat): 고급 자동화                                             ║
║  - OpenAI GPT: AI 분석/조언                                                   ║
║  - 카카오톡 알림톡: 모바일 알림                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

from .google_sheets import GoogleSheetsClient
from .make_webhook import MakeIntegration, EventType
from .openai_advisor import PhysicsMapAdvisor
from .kakao_alimtalk import KakaoAlimtalk

__all__ = [
    "GoogleSheetsClient",
    "MakeIntegration",
    "EventType",
    "PhysicsMapAdvisor",
    "KakaoAlimtalk"
]

# 버전
__version__ = "1.0.0"


# ═══════════════════════════════════════════════════════════════════════════════
# 통합 클라이언트
# ═══════════════════════════════════════════════════════════════════════════════

class AutusIntegrations:
    """
    AUTUS 통합 연동 클라이언트
    
    모든 외부 서비스를 하나의 인터페이스로 관리
    """
    
    def __init__(
        self,
        google_credentials: str = None,
        make_webhook_url: str = None,
        openai_api_key: str = None,
        kakao_api_key: str = None
    ):
        """
        통합 클라이언트 초기화
        """
        self.sheets = None
        self.make = None
        self.ai = None
        self.kakao = None
        
        # Google Sheets
        if google_credentials:
            try:
                self.sheets = GoogleSheetsClient(google_credentials)
                print("✅ Google Sheets 연결됨")
            except:
                pass
        
        # Make
        if make_webhook_url:
            self.make = MakeIntegration(make_webhook_url)
            print("✅ Make 연결됨")
        
        # OpenAI
        if openai_api_key:
            self.ai = PhysicsMapAdvisor(openai_api_key)
            print("✅ OpenAI 연결됨")
        
        # 카카오톡
        if kakao_api_key:
            self.kakao = KakaoAlimtalk(api_key=kakao_api_key)
            print("✅ 카카오톡 연결됨")
    
    def send_everywhere(
        self,
        event_type: str,
        data: dict,
        phone_number: str = None
    ):
        """
        모든 연결된 서비스로 이벤트 전송
        """
        results = {}
        
        # Make로 전송
        if self.make:
            if event_type == "bottleneck":
                results["make"] = self.make.send_bottleneck_alert(data)
            elif event_type == "weekly":
                results["make"] = self.make.send_weekly_report(data)
        
        # 카카오톡 발송
        if self.kakao and phone_number:
            if event_type == "bottleneck":
                results["kakao"] = self.kakao.send_bottleneck_alert(phone_number, data)
            elif event_type == "weekly":
                results["kakao"] = self.kakao.send_weekly_report(phone_number, data)
        
        return results
    
    def get_ai_analysis(self, physics_data: dict) -> str:
        """AI 분석 결과 가져오기"""
        if self.ai:
            return self.ai.analyze_physics_map(physics_data)
        return "OpenAI 연결 필요"


# 사용 예제
if __name__ == "__main__":
    print("🔗 AUTUS Integrations v1.0.0")
    print("\n사용 가능한 모듈:")
    print("  - GoogleSheetsClient: Google Sheets 연동")
    print("  - MakeIntegration: Make 자동화 연동")
    print("  - PhysicsMapAdvisor: OpenAI AI 어드바이저")
    print("  - KakaoAlimtalk: 카카오톡 알림톡")
    print("  - AutusIntegrations: 통합 클라이언트")





"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🔗 AUTUS Physics Map - 외부 서비스 연동 모듈                                 ║
║                                                                               ║
║  지원 서비스:                                                                 ║
║  - Google Sheets: 데이터 입출력                                               ║
║  - Make (Integromat): 고급 자동화                                             ║
║  - OpenAI GPT: AI 분석/조언                                                   ║
║  - 카카오톡 알림톡: 모바일 알림                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

from .google_sheets import GoogleSheetsClient
from .make_webhook import MakeIntegration, EventType
from .openai_advisor import PhysicsMapAdvisor
from .kakao_alimtalk import KakaoAlimtalk

__all__ = [
    "GoogleSheetsClient",
    "MakeIntegration",
    "EventType",
    "PhysicsMapAdvisor",
    "KakaoAlimtalk"
]

# 버전
__version__ = "1.0.0"


# ═══════════════════════════════════════════════════════════════════════════════
# 통합 클라이언트
# ═══════════════════════════════════════════════════════════════════════════════

class AutusIntegrations:
    """
    AUTUS 통합 연동 클라이언트
    
    모든 외부 서비스를 하나의 인터페이스로 관리
    """
    
    def __init__(
        self,
        google_credentials: str = None,
        make_webhook_url: str = None,
        openai_api_key: str = None,
        kakao_api_key: str = None
    ):
        """
        통합 클라이언트 초기화
        """
        self.sheets = None
        self.make = None
        self.ai = None
        self.kakao = None
        
        # Google Sheets
        if google_credentials:
            try:
                self.sheets = GoogleSheetsClient(google_credentials)
                print("✅ Google Sheets 연결됨")
            except:
                pass
        
        # Make
        if make_webhook_url:
            self.make = MakeIntegration(make_webhook_url)
            print("✅ Make 연결됨")
        
        # OpenAI
        if openai_api_key:
            self.ai = PhysicsMapAdvisor(openai_api_key)
            print("✅ OpenAI 연결됨")
        
        # 카카오톡
        if kakao_api_key:
            self.kakao = KakaoAlimtalk(api_key=kakao_api_key)
            print("✅ 카카오톡 연결됨")
    
    def send_everywhere(
        self,
        event_type: str,
        data: dict,
        phone_number: str = None
    ):
        """
        모든 연결된 서비스로 이벤트 전송
        """
        results = {}
        
        # Make로 전송
        if self.make:
            if event_type == "bottleneck":
                results["make"] = self.make.send_bottleneck_alert(data)
            elif event_type == "weekly":
                results["make"] = self.make.send_weekly_report(data)
        
        # 카카오톡 발송
        if self.kakao and phone_number:
            if event_type == "bottleneck":
                results["kakao"] = self.kakao.send_bottleneck_alert(phone_number, data)
            elif event_type == "weekly":
                results["kakao"] = self.kakao.send_weekly_report(phone_number, data)
        
        return results
    
    def get_ai_analysis(self, physics_data: dict) -> str:
        """AI 분석 결과 가져오기"""
        if self.ai:
            return self.ai.analyze_physics_map(physics_data)
        return "OpenAI 연결 필요"


# 사용 예제
if __name__ == "__main__":
    print("🔗 AUTUS Integrations v1.0.0")
    print("\n사용 가능한 모듈:")
    print("  - GoogleSheetsClient: Google Sheets 연동")
    print("  - MakeIntegration: Make 자동화 연동")
    print("  - PhysicsMapAdvisor: OpenAI AI 어드바이저")
    print("  - KakaoAlimtalk: 카카오톡 알림톡")
    print("  - AutusIntegrations: 통합 클라이언트")





"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🔗 AUTUS Physics Map - 외부 서비스 연동 모듈                                 ║
║                                                                               ║
║  지원 서비스:                                                                 ║
║  - Google Sheets: 데이터 입출력                                               ║
║  - Make (Integromat): 고급 자동화                                             ║
║  - OpenAI GPT: AI 분석/조언                                                   ║
║  - 카카오톡 알림톡: 모바일 알림                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

from .google_sheets import GoogleSheetsClient
from .make_webhook import MakeIntegration, EventType
from .openai_advisor import PhysicsMapAdvisor
from .kakao_alimtalk import KakaoAlimtalk

__all__ = [
    "GoogleSheetsClient",
    "MakeIntegration",
    "EventType",
    "PhysicsMapAdvisor",
    "KakaoAlimtalk"
]

# 버전
__version__ = "1.0.0"


# ═══════════════════════════════════════════════════════════════════════════════
# 통합 클라이언트
# ═══════════════════════════════════════════════════════════════════════════════

class AutusIntegrations:
    """
    AUTUS 통합 연동 클라이언트
    
    모든 외부 서비스를 하나의 인터페이스로 관리
    """
    
    def __init__(
        self,
        google_credentials: str = None,
        make_webhook_url: str = None,
        openai_api_key: str = None,
        kakao_api_key: str = None
    ):
        """
        통합 클라이언트 초기화
        """
        self.sheets = None
        self.make = None
        self.ai = None
        self.kakao = None
        
        # Google Sheets
        if google_credentials:
            try:
                self.sheets = GoogleSheetsClient(google_credentials)
                print("✅ Google Sheets 연결됨")
            except:
                pass
        
        # Make
        if make_webhook_url:
            self.make = MakeIntegration(make_webhook_url)
            print("✅ Make 연결됨")
        
        # OpenAI
        if openai_api_key:
            self.ai = PhysicsMapAdvisor(openai_api_key)
            print("✅ OpenAI 연결됨")
        
        # 카카오톡
        if kakao_api_key:
            self.kakao = KakaoAlimtalk(api_key=kakao_api_key)
            print("✅ 카카오톡 연결됨")
    
    def send_everywhere(
        self,
        event_type: str,
        data: dict,
        phone_number: str = None
    ):
        """
        모든 연결된 서비스로 이벤트 전송
        """
        results = {}
        
        # Make로 전송
        if self.make:
            if event_type == "bottleneck":
                results["make"] = self.make.send_bottleneck_alert(data)
            elif event_type == "weekly":
                results["make"] = self.make.send_weekly_report(data)
        
        # 카카오톡 발송
        if self.kakao and phone_number:
            if event_type == "bottleneck":
                results["kakao"] = self.kakao.send_bottleneck_alert(phone_number, data)
            elif event_type == "weekly":
                results["kakao"] = self.kakao.send_weekly_report(phone_number, data)
        
        return results
    
    def get_ai_analysis(self, physics_data: dict) -> str:
        """AI 분석 결과 가져오기"""
        if self.ai:
            return self.ai.analyze_physics_map(physics_data)
        return "OpenAI 연결 필요"


# 사용 예제
if __name__ == "__main__":
    print("🔗 AUTUS Integrations v1.0.0")
    print("\n사용 가능한 모듈:")
    print("  - GoogleSheetsClient: Google Sheets 연동")
    print("  - MakeIntegration: Make 자동화 연동")
    print("  - PhysicsMapAdvisor: OpenAI AI 어드바이저")
    print("  - KakaoAlimtalk: 카카오톡 알림톡")
    print("  - AutusIntegrations: 통합 클라이언트")





"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🔗 AUTUS Physics Map - 외부 서비스 연동 모듈                                 ║
║                                                                               ║
║  지원 서비스:                                                                 ║
║  - Google Sheets: 데이터 입출력                                               ║
║  - Make (Integromat): 고급 자동화                                             ║
║  - OpenAI GPT: AI 분석/조언                                                   ║
║  - 카카오톡 알림톡: 모바일 알림                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

from .google_sheets import GoogleSheetsClient
from .make_webhook import MakeIntegration, EventType
from .openai_advisor import PhysicsMapAdvisor
from .kakao_alimtalk import KakaoAlimtalk

__all__ = [
    "GoogleSheetsClient",
    "MakeIntegration",
    "EventType",
    "PhysicsMapAdvisor",
    "KakaoAlimtalk"
]

# 버전
__version__ = "1.0.0"


# ═══════════════════════════════════════════════════════════════════════════════
# 통합 클라이언트
# ═══════════════════════════════════════════════════════════════════════════════

class AutusIntegrations:
    """
    AUTUS 통합 연동 클라이언트
    
    모든 외부 서비스를 하나의 인터페이스로 관리
    """
    
    def __init__(
        self,
        google_credentials: str = None,
        make_webhook_url: str = None,
        openai_api_key: str = None,
        kakao_api_key: str = None
    ):
        """
        통합 클라이언트 초기화
        """
        self.sheets = None
        self.make = None
        self.ai = None
        self.kakao = None
        
        # Google Sheets
        if google_credentials:
            try:
                self.sheets = GoogleSheetsClient(google_credentials)
                print("✅ Google Sheets 연결됨")
            except:
                pass
        
        # Make
        if make_webhook_url:
            self.make = MakeIntegration(make_webhook_url)
            print("✅ Make 연결됨")
        
        # OpenAI
        if openai_api_key:
            self.ai = PhysicsMapAdvisor(openai_api_key)
            print("✅ OpenAI 연결됨")
        
        # 카카오톡
        if kakao_api_key:
            self.kakao = KakaoAlimtalk(api_key=kakao_api_key)
            print("✅ 카카오톡 연결됨")
    
    def send_everywhere(
        self,
        event_type: str,
        data: dict,
        phone_number: str = None
    ):
        """
        모든 연결된 서비스로 이벤트 전송
        """
        results = {}
        
        # Make로 전송
        if self.make:
            if event_type == "bottleneck":
                results["make"] = self.make.send_bottleneck_alert(data)
            elif event_type == "weekly":
                results["make"] = self.make.send_weekly_report(data)
        
        # 카카오톡 발송
        if self.kakao and phone_number:
            if event_type == "bottleneck":
                results["kakao"] = self.kakao.send_bottleneck_alert(phone_number, data)
            elif event_type == "weekly":
                results["kakao"] = self.kakao.send_weekly_report(phone_number, data)
        
        return results
    
    def get_ai_analysis(self, physics_data: dict) -> str:
        """AI 분석 결과 가져오기"""
        if self.ai:
            return self.ai.analyze_physics_map(physics_data)
        return "OpenAI 연결 필요"


# 사용 예제
if __name__ == "__main__":
    print("🔗 AUTUS Integrations v1.0.0")
    print("\n사용 가능한 모듈:")
    print("  - GoogleSheetsClient: Google Sheets 연동")
    print("  - MakeIntegration: Make 자동화 연동")
    print("  - PhysicsMapAdvisor: OpenAI AI 어드바이저")
    print("  - KakaoAlimtalk: 카카오톡 알림톡")
    print("  - AutusIntegrations: 통합 클라이언트")





"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🔗 AUTUS Physics Map - 외부 서비스 연동 모듈                                 ║
║                                                                               ║
║  지원 서비스:                                                                 ║
║  - Google Sheets: 데이터 입출력                                               ║
║  - Make (Integromat): 고급 자동화                                             ║
║  - OpenAI GPT: AI 분석/조언                                                   ║
║  - 카카오톡 알림톡: 모바일 알림                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

from .google_sheets import GoogleSheetsClient
from .make_webhook import MakeIntegration, EventType
from .openai_advisor import PhysicsMapAdvisor
from .kakao_alimtalk import KakaoAlimtalk

__all__ = [
    "GoogleSheetsClient",
    "MakeIntegration",
    "EventType",
    "PhysicsMapAdvisor",
    "KakaoAlimtalk"
]

# 버전
__version__ = "1.0.0"


# ═══════════════════════════════════════════════════════════════════════════════
# 통합 클라이언트
# ═══════════════════════════════════════════════════════════════════════════════

class AutusIntegrations:
    """
    AUTUS 통합 연동 클라이언트
    
    모든 외부 서비스를 하나의 인터페이스로 관리
    """
    
    def __init__(
        self,
        google_credentials: str = None,
        make_webhook_url: str = None,
        openai_api_key: str = None,
        kakao_api_key: str = None
    ):
        """
        통합 클라이언트 초기화
        """
        self.sheets = None
        self.make = None
        self.ai = None
        self.kakao = None
        
        # Google Sheets
        if google_credentials:
            try:
                self.sheets = GoogleSheetsClient(google_credentials)
                print("✅ Google Sheets 연결됨")
            except:
                pass
        
        # Make
        if make_webhook_url:
            self.make = MakeIntegration(make_webhook_url)
            print("✅ Make 연결됨")
        
        # OpenAI
        if openai_api_key:
            self.ai = PhysicsMapAdvisor(openai_api_key)
            print("✅ OpenAI 연결됨")
        
        # 카카오톡
        if kakao_api_key:
            self.kakao = KakaoAlimtalk(api_key=kakao_api_key)
            print("✅ 카카오톡 연결됨")
    
    def send_everywhere(
        self,
        event_type: str,
        data: dict,
        phone_number: str = None
    ):
        """
        모든 연결된 서비스로 이벤트 전송
        """
        results = {}
        
        # Make로 전송
        if self.make:
            if event_type == "bottleneck":
                results["make"] = self.make.send_bottleneck_alert(data)
            elif event_type == "weekly":
                results["make"] = self.make.send_weekly_report(data)
        
        # 카카오톡 발송
        if self.kakao and phone_number:
            if event_type == "bottleneck":
                results["kakao"] = self.kakao.send_bottleneck_alert(phone_number, data)
            elif event_type == "weekly":
                results["kakao"] = self.kakao.send_weekly_report(phone_number, data)
        
        return results
    
    def get_ai_analysis(self, physics_data: dict) -> str:
        """AI 분석 결과 가져오기"""
        if self.ai:
            return self.ai.analyze_physics_map(physics_data)
        return "OpenAI 연결 필요"


# 사용 예제
if __name__ == "__main__":
    print("🔗 AUTUS Integrations v1.0.0")
    print("\n사용 가능한 모듈:")
    print("  - GoogleSheetsClient: Google Sheets 연동")
    print("  - MakeIntegration: Make 자동화 연동")
    print("  - PhysicsMapAdvisor: OpenAI AI 어드바이저")
    print("  - KakaoAlimtalk: 카카오톡 알림톡")
    print("  - AutusIntegrations: 통합 클라이언트")















"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🔗 AUTUS Physics Map - 외부 서비스 연동 모듈                                 ║
║                                                                               ║
║  지원 서비스:                                                                 ║
║  - Google Sheets: 데이터 입출력                                               ║
║  - Make (Integromat): 고급 자동화                                             ║
║  - OpenAI GPT: AI 분석/조언                                                   ║
║  - 카카오톡 알림톡: 모바일 알림                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

from .google_sheets import GoogleSheetsClient
from .make_webhook import MakeIntegration, EventType
from .openai_advisor import PhysicsMapAdvisor
from .kakao_alimtalk import KakaoAlimtalk

__all__ = [
    "GoogleSheetsClient",
    "MakeIntegration",
    "EventType",
    "PhysicsMapAdvisor",
    "KakaoAlimtalk"
]

# 버전
__version__ = "1.0.0"


# ═══════════════════════════════════════════════════════════════════════════════
# 통합 클라이언트
# ═══════════════════════════════════════════════════════════════════════════════

class AutusIntegrations:
    """
    AUTUS 통합 연동 클라이언트
    
    모든 외부 서비스를 하나의 인터페이스로 관리
    """
    
    def __init__(
        self,
        google_credentials: str = None,
        make_webhook_url: str = None,
        openai_api_key: str = None,
        kakao_api_key: str = None
    ):
        """
        통합 클라이언트 초기화
        """
        self.sheets = None
        self.make = None
        self.ai = None
        self.kakao = None
        
        # Google Sheets
        if google_credentials:
            try:
                self.sheets = GoogleSheetsClient(google_credentials)
                print("✅ Google Sheets 연결됨")
            except:
                pass
        
        # Make
        if make_webhook_url:
            self.make = MakeIntegration(make_webhook_url)
            print("✅ Make 연결됨")
        
        # OpenAI
        if openai_api_key:
            self.ai = PhysicsMapAdvisor(openai_api_key)
            print("✅ OpenAI 연결됨")
        
        # 카카오톡
        if kakao_api_key:
            self.kakao = KakaoAlimtalk(api_key=kakao_api_key)
            print("✅ 카카오톡 연결됨")
    
    def send_everywhere(
        self,
        event_type: str,
        data: dict,
        phone_number: str = None
    ):
        """
        모든 연결된 서비스로 이벤트 전송
        """
        results = {}
        
        # Make로 전송
        if self.make:
            if event_type == "bottleneck":
                results["make"] = self.make.send_bottleneck_alert(data)
            elif event_type == "weekly":
                results["make"] = self.make.send_weekly_report(data)
        
        # 카카오톡 발송
        if self.kakao and phone_number:
            if event_type == "bottleneck":
                results["kakao"] = self.kakao.send_bottleneck_alert(phone_number, data)
            elif event_type == "weekly":
                results["kakao"] = self.kakao.send_weekly_report(phone_number, data)
        
        return results
    
    def get_ai_analysis(self, physics_data: dict) -> str:
        """AI 분석 결과 가져오기"""
        if self.ai:
            return self.ai.analyze_physics_map(physics_data)
        return "OpenAI 연결 필요"


# 사용 예제
if __name__ == "__main__":
    print("🔗 AUTUS Integrations v1.0.0")
    print("\n사용 가능한 모듈:")
    print("  - GoogleSheetsClient: Google Sheets 연동")
    print("  - MakeIntegration: Make 자동화 연동")
    print("  - PhysicsMapAdvisor: OpenAI AI 어드바이저")
    print("  - KakaoAlimtalk: 카카오톡 알림톡")
    print("  - AutusIntegrations: 통합 클라이언트")





"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🔗 AUTUS Physics Map - 외부 서비스 연동 모듈                                 ║
║                                                                               ║
║  지원 서비스:                                                                 ║
║  - Google Sheets: 데이터 입출력                                               ║
║  - Make (Integromat): 고급 자동화                                             ║
║  - OpenAI GPT: AI 분석/조언                                                   ║
║  - 카카오톡 알림톡: 모바일 알림                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

from .google_sheets import GoogleSheetsClient
from .make_webhook import MakeIntegration, EventType
from .openai_advisor import PhysicsMapAdvisor
from .kakao_alimtalk import KakaoAlimtalk

__all__ = [
    "GoogleSheetsClient",
    "MakeIntegration",
    "EventType",
    "PhysicsMapAdvisor",
    "KakaoAlimtalk"
]

# 버전
__version__ = "1.0.0"


# ═══════════════════════════════════════════════════════════════════════════════
# 통합 클라이언트
# ═══════════════════════════════════════════════════════════════════════════════

class AutusIntegrations:
    """
    AUTUS 통합 연동 클라이언트
    
    모든 외부 서비스를 하나의 인터페이스로 관리
    """
    
    def __init__(
        self,
        google_credentials: str = None,
        make_webhook_url: str = None,
        openai_api_key: str = None,
        kakao_api_key: str = None
    ):
        """
        통합 클라이언트 초기화
        """
        self.sheets = None
        self.make = None
        self.ai = None
        self.kakao = None
        
        # Google Sheets
        if google_credentials:
            try:
                self.sheets = GoogleSheetsClient(google_credentials)
                print("✅ Google Sheets 연결됨")
            except:
                pass
        
        # Make
        if make_webhook_url:
            self.make = MakeIntegration(make_webhook_url)
            print("✅ Make 연결됨")
        
        # OpenAI
        if openai_api_key:
            self.ai = PhysicsMapAdvisor(openai_api_key)
            print("✅ OpenAI 연결됨")
        
        # 카카오톡
        if kakao_api_key:
            self.kakao = KakaoAlimtalk(api_key=kakao_api_key)
            print("✅ 카카오톡 연결됨")
    
    def send_everywhere(
        self,
        event_type: str,
        data: dict,
        phone_number: str = None
    ):
        """
        모든 연결된 서비스로 이벤트 전송
        """
        results = {}
        
        # Make로 전송
        if self.make:
            if event_type == "bottleneck":
                results["make"] = self.make.send_bottleneck_alert(data)
            elif event_type == "weekly":
                results["make"] = self.make.send_weekly_report(data)
        
        # 카카오톡 발송
        if self.kakao and phone_number:
            if event_type == "bottleneck":
                results["kakao"] = self.kakao.send_bottleneck_alert(phone_number, data)
            elif event_type == "weekly":
                results["kakao"] = self.kakao.send_weekly_report(phone_number, data)
        
        return results
    
    def get_ai_analysis(self, physics_data: dict) -> str:
        """AI 분석 결과 가져오기"""
        if self.ai:
            return self.ai.analyze_physics_map(physics_data)
        return "OpenAI 연결 필요"


# 사용 예제
if __name__ == "__main__":
    print("🔗 AUTUS Integrations v1.0.0")
    print("\n사용 가능한 모듈:")
    print("  - GoogleSheetsClient: Google Sheets 연동")
    print("  - MakeIntegration: Make 자동화 연동")
    print("  - PhysicsMapAdvisor: OpenAI AI 어드바이저")
    print("  - KakaoAlimtalk: 카카오톡 알림톡")
    print("  - AutusIntegrations: 통합 클라이언트")





"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🔗 AUTUS Physics Map - 외부 서비스 연동 모듈                                 ║
║                                                                               ║
║  지원 서비스:                                                                 ║
║  - Google Sheets: 데이터 입출력                                               ║
║  - Make (Integromat): 고급 자동화                                             ║
║  - OpenAI GPT: AI 분석/조언                                                   ║
║  - 카카오톡 알림톡: 모바일 알림                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

from .google_sheets import GoogleSheetsClient
from .make_webhook import MakeIntegration, EventType
from .openai_advisor import PhysicsMapAdvisor
from .kakao_alimtalk import KakaoAlimtalk

__all__ = [
    "GoogleSheetsClient",
    "MakeIntegration",
    "EventType",
    "PhysicsMapAdvisor",
    "KakaoAlimtalk"
]

# 버전
__version__ = "1.0.0"


# ═══════════════════════════════════════════════════════════════════════════════
# 통합 클라이언트
# ═══════════════════════════════════════════════════════════════════════════════

class AutusIntegrations:
    """
    AUTUS 통합 연동 클라이언트
    
    모든 외부 서비스를 하나의 인터페이스로 관리
    """
    
    def __init__(
        self,
        google_credentials: str = None,
        make_webhook_url: str = None,
        openai_api_key: str = None,
        kakao_api_key: str = None
    ):
        """
        통합 클라이언트 초기화
        """
        self.sheets = None
        self.make = None
        self.ai = None
        self.kakao = None
        
        # Google Sheets
        if google_credentials:
            try:
                self.sheets = GoogleSheetsClient(google_credentials)
                print("✅ Google Sheets 연결됨")
            except:
                pass
        
        # Make
        if make_webhook_url:
            self.make = MakeIntegration(make_webhook_url)
            print("✅ Make 연결됨")
        
        # OpenAI
        if openai_api_key:
            self.ai = PhysicsMapAdvisor(openai_api_key)
            print("✅ OpenAI 연결됨")
        
        # 카카오톡
        if kakao_api_key:
            self.kakao = KakaoAlimtalk(api_key=kakao_api_key)
            print("✅ 카카오톡 연결됨")
    
    def send_everywhere(
        self,
        event_type: str,
        data: dict,
        phone_number: str = None
    ):
        """
        모든 연결된 서비스로 이벤트 전송
        """
        results = {}
        
        # Make로 전송
        if self.make:
            if event_type == "bottleneck":
                results["make"] = self.make.send_bottleneck_alert(data)
            elif event_type == "weekly":
                results["make"] = self.make.send_weekly_report(data)
        
        # 카카오톡 발송
        if self.kakao and phone_number:
            if event_type == "bottleneck":
                results["kakao"] = self.kakao.send_bottleneck_alert(phone_number, data)
            elif event_type == "weekly":
                results["kakao"] = self.kakao.send_weekly_report(phone_number, data)
        
        return results
    
    def get_ai_analysis(self, physics_data: dict) -> str:
        """AI 분석 결과 가져오기"""
        if self.ai:
            return self.ai.analyze_physics_map(physics_data)
        return "OpenAI 연결 필요"


# 사용 예제
if __name__ == "__main__":
    print("🔗 AUTUS Integrations v1.0.0")
    print("\n사용 가능한 모듈:")
    print("  - GoogleSheetsClient: Google Sheets 연동")
    print("  - MakeIntegration: Make 자동화 연동")
    print("  - PhysicsMapAdvisor: OpenAI AI 어드바이저")
    print("  - KakaoAlimtalk: 카카오톡 알림톡")
    print("  - AutusIntegrations: 통합 클라이언트")





"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🔗 AUTUS Physics Map - 외부 서비스 연동 모듈                                 ║
║                                                                               ║
║  지원 서비스:                                                                 ║
║  - Google Sheets: 데이터 입출력                                               ║
║  - Make (Integromat): 고급 자동화                                             ║
║  - OpenAI GPT: AI 분석/조언                                                   ║
║  - 카카오톡 알림톡: 모바일 알림                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

from .google_sheets import GoogleSheetsClient
from .make_webhook import MakeIntegration, EventType
from .openai_advisor import PhysicsMapAdvisor
from .kakao_alimtalk import KakaoAlimtalk

__all__ = [
    "GoogleSheetsClient",
    "MakeIntegration",
    "EventType",
    "PhysicsMapAdvisor",
    "KakaoAlimtalk"
]

# 버전
__version__ = "1.0.0"


# ═══════════════════════════════════════════════════════════════════════════════
# 통합 클라이언트
# ═══════════════════════════════════════════════════════════════════════════════

class AutusIntegrations:
    """
    AUTUS 통합 연동 클라이언트
    
    모든 외부 서비스를 하나의 인터페이스로 관리
    """
    
    def __init__(
        self,
        google_credentials: str = None,
        make_webhook_url: str = None,
        openai_api_key: str = None,
        kakao_api_key: str = None
    ):
        """
        통합 클라이언트 초기화
        """
        self.sheets = None
        self.make = None
        self.ai = None
        self.kakao = None
        
        # Google Sheets
        if google_credentials:
            try:
                self.sheets = GoogleSheetsClient(google_credentials)
                print("✅ Google Sheets 연결됨")
            except:
                pass
        
        # Make
        if make_webhook_url:
            self.make = MakeIntegration(make_webhook_url)
            print("✅ Make 연결됨")
        
        # OpenAI
        if openai_api_key:
            self.ai = PhysicsMapAdvisor(openai_api_key)
            print("✅ OpenAI 연결됨")
        
        # 카카오톡
        if kakao_api_key:
            self.kakao = KakaoAlimtalk(api_key=kakao_api_key)
            print("✅ 카카오톡 연결됨")
    
    def send_everywhere(
        self,
        event_type: str,
        data: dict,
        phone_number: str = None
    ):
        """
        모든 연결된 서비스로 이벤트 전송
        """
        results = {}
        
        # Make로 전송
        if self.make:
            if event_type == "bottleneck":
                results["make"] = self.make.send_bottleneck_alert(data)
            elif event_type == "weekly":
                results["make"] = self.make.send_weekly_report(data)
        
        # 카카오톡 발송
        if self.kakao and phone_number:
            if event_type == "bottleneck":
                results["kakao"] = self.kakao.send_bottleneck_alert(phone_number, data)
            elif event_type == "weekly":
                results["kakao"] = self.kakao.send_weekly_report(phone_number, data)
        
        return results
    
    def get_ai_analysis(self, physics_data: dict) -> str:
        """AI 분석 결과 가져오기"""
        if self.ai:
            return self.ai.analyze_physics_map(physics_data)
        return "OpenAI 연결 필요"


# 사용 예제
if __name__ == "__main__":
    print("🔗 AUTUS Integrations v1.0.0")
    print("\n사용 가능한 모듈:")
    print("  - GoogleSheetsClient: Google Sheets 연동")
    print("  - MakeIntegration: Make 자동화 연동")
    print("  - PhysicsMapAdvisor: OpenAI AI 어드바이저")
    print("  - KakaoAlimtalk: 카카오톡 알림톡")
    print("  - AutusIntegrations: 통합 클라이언트")





"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🔗 AUTUS Physics Map - 외부 서비스 연동 모듈                                 ║
║                                                                               ║
║  지원 서비스:                                                                 ║
║  - Google Sheets: 데이터 입출력                                               ║
║  - Make (Integromat): 고급 자동화                                             ║
║  - OpenAI GPT: AI 분석/조언                                                   ║
║  - 카카오톡 알림톡: 모바일 알림                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

from .google_sheets import GoogleSheetsClient
from .make_webhook import MakeIntegration, EventType
from .openai_advisor import PhysicsMapAdvisor
from .kakao_alimtalk import KakaoAlimtalk

__all__ = [
    "GoogleSheetsClient",
    "MakeIntegration",
    "EventType",
    "PhysicsMapAdvisor",
    "KakaoAlimtalk"
]

# 버전
__version__ = "1.0.0"


# ═══════════════════════════════════════════════════════════════════════════════
# 통합 클라이언트
# ═══════════════════════════════════════════════════════════════════════════════

class AutusIntegrations:
    """
    AUTUS 통합 연동 클라이언트
    
    모든 외부 서비스를 하나의 인터페이스로 관리
    """
    
    def __init__(
        self,
        google_credentials: str = None,
        make_webhook_url: str = None,
        openai_api_key: str = None,
        kakao_api_key: str = None
    ):
        """
        통합 클라이언트 초기화
        """
        self.sheets = None
        self.make = None
        self.ai = None
        self.kakao = None
        
        # Google Sheets
        if google_credentials:
            try:
                self.sheets = GoogleSheetsClient(google_credentials)
                print("✅ Google Sheets 연결됨")
            except:
                pass
        
        # Make
        if make_webhook_url:
            self.make = MakeIntegration(make_webhook_url)
            print("✅ Make 연결됨")
        
        # OpenAI
        if openai_api_key:
            self.ai = PhysicsMapAdvisor(openai_api_key)
            print("✅ OpenAI 연결됨")
        
        # 카카오톡
        if kakao_api_key:
            self.kakao = KakaoAlimtalk(api_key=kakao_api_key)
            print("✅ 카카오톡 연결됨")
    
    def send_everywhere(
        self,
        event_type: str,
        data: dict,
        phone_number: str = None
    ):
        """
        모든 연결된 서비스로 이벤트 전송
        """
        results = {}
        
        # Make로 전송
        if self.make:
            if event_type == "bottleneck":
                results["make"] = self.make.send_bottleneck_alert(data)
            elif event_type == "weekly":
                results["make"] = self.make.send_weekly_report(data)
        
        # 카카오톡 발송
        if self.kakao and phone_number:
            if event_type == "bottleneck":
                results["kakao"] = self.kakao.send_bottleneck_alert(phone_number, data)
            elif event_type == "weekly":
                results["kakao"] = self.kakao.send_weekly_report(phone_number, data)
        
        return results
    
    def get_ai_analysis(self, physics_data: dict) -> str:
        """AI 분석 결과 가져오기"""
        if self.ai:
            return self.ai.analyze_physics_map(physics_data)
        return "OpenAI 연결 필요"


# 사용 예제
if __name__ == "__main__":
    print("🔗 AUTUS Integrations v1.0.0")
    print("\n사용 가능한 모듈:")
    print("  - GoogleSheetsClient: Google Sheets 연동")
    print("  - MakeIntegration: Make 자동화 연동")
    print("  - PhysicsMapAdvisor: OpenAI AI 어드바이저")
    print("  - KakaoAlimtalk: 카카오톡 알림톡")
    print("  - AutusIntegrations: 통합 클라이언트")





















