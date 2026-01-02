"""
AUTUS Local Agent - SMS Collector
==================================

SMS 결제 알림에서 입금액 파싱

타겟 메시지:
- 은행 입금 알림: "[XX은행] 입금 500,000원"
- 카드 결제 알림: "[XX카드] 결제승인 300,000원"
- 간편결제 알림: "[카카오페이] 입금 100,000원"

Zero-Server-Cost:
- 로컬에서만 파싱
- 서버로 원문 전송 안함
- 금액만 추출하여 M 점수 계산
"""

from typing import List, Optional, Tuple, Dict
from dataclasses import dataclass
from datetime import datetime, timedelta
import re
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.models import SmsRecord


# ═══════════════════════════════════════════════════════════════════════════
#                              PAYMENT PATTERNS
# ═══════════════════════════════════════════════════════════════════════════

# 은행 입금 알림 패턴
BANK_PATTERNS = [
    # [은행명] 입금 금액
    r"\[([가-힣]+은행)\]\s*입금\s*([\d,]+)원",
    r"\[([가-힣]+뱅크)\]\s*입금\s*([\d,]+)원",
    # 은행명 입금 금액원
    r"([가-힣]+은행)\s*입금\s*([\d,]+)원",
    # 입금 금액 은행명
    r"입금\s*([\d,]+)원.*([가-힣]+은행)",
]

# 카드 결제 알림 패턴 (환불/취소 제외)
CARD_PATTERNS = [
    r"\[([가-힣]+카드)\]\s*결제승인\s*([\d,]+)원",
    r"\[([가-힣]+카드)\]\s*승인\s*([\d,]+)원",
    r"([가-힣]+카드)\s*결제\s*([\d,]+)원",
]

# 간편결제 입금 패턴
SIMPLE_PAY_PATTERNS = [
    r"\[카카오페이\]\s*입금\s*([\d,]+)원",
    r"\[네이버페이\]\s*입금\s*([\d,]+)원",
    r"\[토스\]\s*입금\s*([\d,]+)원",
    r"\[페이코\]\s*입금\s*([\d,]+)원",
]

# 제외 패턴 (환불, 취소 등)
EXCLUDE_PATTERNS = [
    r"환불",
    r"취소",
    r"반품",
    r"출금",
    r"이체",
    r"인출",
]


# ═══════════════════════════════════════════════════════════════════════════
#                              SMS COLLECTOR
# ═══════════════════════════════════════════════════════════════════════════

class SmsCollector:
    """
    SMS 결제 알림 수집기
    
    Android ContentResolver로 SMS 읽기 (권한 필요)
    """
    
    def __init__(self):
        # 컴파일된 정규식
        self._bank_patterns = [re.compile(p) for p in BANK_PATTERNS]
        self._card_patterns = [re.compile(p) for p in CARD_PATTERNS]
        self._simple_pay_patterns = [re.compile(p) for p in SIMPLE_PAY_PATTERNS]
        self._exclude_patterns = [re.compile(p) for p in EXCLUDE_PATTERNS]
        
        # 파싱 통계
        self.stats = {
            "total_scanned": 0,
            "payments_found": 0,
            "total_amount": 0.0,
        }
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         PARSING
    # ═══════════════════════════════════════════════════════════════════════
    
    def _extract_amount(self, text: str) -> Tuple[bool, float, str]:
        """
        SMS에서 금액 추출
        
        Returns: (is_payment, amount, source_type)
        """
        # 제외 패턴 체크
        for pattern in self._exclude_patterns:
            if pattern.search(text):
                return False, 0.0, ""
        
        # 은행 입금
        for pattern in self._bank_patterns:
            match = pattern.search(text)
            if match:
                amount_str = match.group(2) if len(match.groups()) >= 2 else match.group(1)
                amount = float(amount_str.replace(",", ""))
                return True, amount, "bank"
        
        # 카드 결제
        for pattern in self._card_patterns:
            match = pattern.search(text)
            if match:
                amount_str = match.group(2)
                amount = float(amount_str.replace(",", ""))
                return True, amount, "card"
        
        # 간편결제
        for pattern in self._simple_pay_patterns:
            match = pattern.search(text)
            if match:
                amount_str = match.group(1)
                amount = float(amount_str.replace(",", ""))
                return True, amount, "simple_pay"
        
        return False, 0.0, ""
    
    def parse_sms(self, phone: str, body: str, timestamp: datetime) -> SmsRecord:
        """단일 SMS 파싱"""
        is_payment, amount, source = self._extract_amount(body)
        
        return SmsRecord(
            phone=phone,
            body=body[:100],  # 앞 100자만 저장 (프라이버시)
            timestamp=timestamp,
            parsed_amount=amount if is_payment else None,
            is_payment_notification=is_payment,
        )
    
    def parse_batch(
        self,
        sms_list: List[Dict],
        lookback_days: int = 90,
    ) -> List[SmsRecord]:
        """
        SMS 배치 파싱
        
        Args:
            sms_list: [{"phone": "...", "body": "...", "date": timestamp}, ...]
            lookback_days: 조회 기간 (일)
        """
        cutoff = datetime.now() - timedelta(days=lookback_days)
        records = []
        
        for sms in sms_list:
            # 타임스탬프 변환
            ts = sms.get("date", 0)
            if isinstance(ts, (int, float)):
                timestamp = datetime.fromtimestamp(ts / 1000)  # 밀리초
            else:
                timestamp = ts
            
            # 기간 필터
            if timestamp < cutoff:
                continue
            
            # 파싱
            record = self.parse_sms(
                phone=sms.get("phone", sms.get("address", "")),
                body=sms.get("body", ""),
                timestamp=timestamp,
            )
            
            records.append(record)
            
            # 통계 업데이트
            self.stats["total_scanned"] += 1
            if record.is_payment_notification:
                self.stats["payments_found"] += 1
                self.stats["total_amount"] += record.parsed_amount or 0
        
        return records
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         AGGREGATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def aggregate_by_phone(
        self,
        records: List[SmsRecord],
    ) -> Dict[str, float]:
        """
        전화번호별 총 입금액 집계
        """
        totals = {}
        
        for record in records:
            if record.is_payment_notification and record.parsed_amount:
                phone = record.phone
                totals[phone] = totals.get(phone, 0) + record.parsed_amount
        
        return totals
    
    def get_payment_records(
        self,
        records: List[SmsRecord],
    ) -> List[SmsRecord]:
        """결제 알림만 필터링"""
        return [r for r in records if r.is_payment_notification]
    
    def get_stats(self) -> Dict:
        """파싱 통계"""
        return {
            **self.stats,
            "detection_rate": (
                self.stats["payments_found"] / self.stats["total_scanned"] * 100
                if self.stats["total_scanned"] > 0 else 0
            ),
        }


# ═══════════════════════════════════════════════════════════════════════════
#                              ANDROID INTEGRATION
# ═══════════════════════════════════════════════════════════════════════════

# React Native 브릿지용 인터페이스
REACT_NATIVE_BRIDGE = """
// React Native에서 호출
// Android 권한: READ_SMS, RECEIVE_SMS

import { NativeModules } from 'react-native';

const { SmsModule } = NativeModules;

export async function getAllSms(days = 90) {
  const cutoffMs = Date.now() - (days * 24 * 60 * 60 * 1000);
  
  // Android ContentResolver 쿼리
  const smsList = await SmsModule.querySms({
    projection: ['address', 'body', 'date'],
    selection: 'date > ?',
    selectionArgs: [cutoffMs.toString()],
    sortOrder: 'date DESC',
  });
  
  return smsList;
}
"""


# ═══════════════════════════════════════════════════════════════════════════
#                              TEST
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 테스트 SMS 데이터
    test_sms = [
        {
            "phone": "15990000",
            "body": "[국민은행] 입금 500,000원 잔액 1,200,000원",
            "date": datetime.now().timestamp() * 1000,
        },
        {
            "phone": "15990000",
            "body": "[신한카드] 결제승인 300,000원 홍길동님",
            "date": datetime.now().timestamp() * 1000,
        },
        {
            "phone": "15990000",
            "body": "[카카오페이] 입금 100,000원",
            "date": datetime.now().timestamp() * 1000,
        },
        {
            "phone": "15990000",
            "body": "[국민은행] 환불 50,000원",  # 제외 대상
            "date": datetime.now().timestamp() * 1000,
        },
        {
            "phone": "01012345678",
            "body": "안녕하세요. 내일 상담 가능하신가요?",  # 일반 메시지
            "date": datetime.now().timestamp() * 1000,
        },
    ]
    
    # 수집기 생성
    collector = SmsCollector()
    
    # 파싱
    records = collector.parse_batch(test_sms)
    
    print("=" * 60)
    print("AUTUS SMS Collector Test")
    print("=" * 60)
    
    for record in records:
        status = "💰 결제" if record.is_payment_notification else "📨 일반"
        amount = f"₩{record.parsed_amount:,.0f}" if record.parsed_amount else "-"
        print(f"\n{status} | {amount}")
        print(f"  {record.body[:50]}...")
    
    print("\n" + "=" * 60)
    print("Statistics:")
    print(collector.get_stats())
    
    print("\n" + "=" * 60)
    print("Aggregated by Phone:")
    print(collector.aggregate_by_phone(records))










"""
AUTUS Local Agent - SMS Collector
==================================

SMS 결제 알림에서 입금액 파싱

타겟 메시지:
- 은행 입금 알림: "[XX은행] 입금 500,000원"
- 카드 결제 알림: "[XX카드] 결제승인 300,000원"
- 간편결제 알림: "[카카오페이] 입금 100,000원"

Zero-Server-Cost:
- 로컬에서만 파싱
- 서버로 원문 전송 안함
- 금액만 추출하여 M 점수 계산
"""

from typing import List, Optional, Tuple, Dict
from dataclasses import dataclass
from datetime import datetime, timedelta
import re
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.models import SmsRecord


# ═══════════════════════════════════════════════════════════════════════════
#                              PAYMENT PATTERNS
# ═══════════════════════════════════════════════════════════════════════════

# 은행 입금 알림 패턴
BANK_PATTERNS = [
    # [은행명] 입금 금액
    r"\[([가-힣]+은행)\]\s*입금\s*([\d,]+)원",
    r"\[([가-힣]+뱅크)\]\s*입금\s*([\d,]+)원",
    # 은행명 입금 금액원
    r"([가-힣]+은행)\s*입금\s*([\d,]+)원",
    # 입금 금액 은행명
    r"입금\s*([\d,]+)원.*([가-힣]+은행)",
]

# 카드 결제 알림 패턴 (환불/취소 제외)
CARD_PATTERNS = [
    r"\[([가-힣]+카드)\]\s*결제승인\s*([\d,]+)원",
    r"\[([가-힣]+카드)\]\s*승인\s*([\d,]+)원",
    r"([가-힣]+카드)\s*결제\s*([\d,]+)원",
]

# 간편결제 입금 패턴
SIMPLE_PAY_PATTERNS = [
    r"\[카카오페이\]\s*입금\s*([\d,]+)원",
    r"\[네이버페이\]\s*입금\s*([\d,]+)원",
    r"\[토스\]\s*입금\s*([\d,]+)원",
    r"\[페이코\]\s*입금\s*([\d,]+)원",
]

# 제외 패턴 (환불, 취소 등)
EXCLUDE_PATTERNS = [
    r"환불",
    r"취소",
    r"반품",
    r"출금",
    r"이체",
    r"인출",
]


# ═══════════════════════════════════════════════════════════════════════════
#                              SMS COLLECTOR
# ═══════════════════════════════════════════════════════════════════════════

class SmsCollector:
    """
    SMS 결제 알림 수집기
    
    Android ContentResolver로 SMS 읽기 (권한 필요)
    """
    
    def __init__(self):
        # 컴파일된 정규식
        self._bank_patterns = [re.compile(p) for p in BANK_PATTERNS]
        self._card_patterns = [re.compile(p) for p in CARD_PATTERNS]
        self._simple_pay_patterns = [re.compile(p) for p in SIMPLE_PAY_PATTERNS]
        self._exclude_patterns = [re.compile(p) for p in EXCLUDE_PATTERNS]
        
        # 파싱 통계
        self.stats = {
            "total_scanned": 0,
            "payments_found": 0,
            "total_amount": 0.0,
        }
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         PARSING
    # ═══════════════════════════════════════════════════════════════════════
    
    def _extract_amount(self, text: str) -> Tuple[bool, float, str]:
        """
        SMS에서 금액 추출
        
        Returns: (is_payment, amount, source_type)
        """
        # 제외 패턴 체크
        for pattern in self._exclude_patterns:
            if pattern.search(text):
                return False, 0.0, ""
        
        # 은행 입금
        for pattern in self._bank_patterns:
            match = pattern.search(text)
            if match:
                amount_str = match.group(2) if len(match.groups()) >= 2 else match.group(1)
                amount = float(amount_str.replace(",", ""))
                return True, amount, "bank"
        
        # 카드 결제
        for pattern in self._card_patterns:
            match = pattern.search(text)
            if match:
                amount_str = match.group(2)
                amount = float(amount_str.replace(",", ""))
                return True, amount, "card"
        
        # 간편결제
        for pattern in self._simple_pay_patterns:
            match = pattern.search(text)
            if match:
                amount_str = match.group(1)
                amount = float(amount_str.replace(",", ""))
                return True, amount, "simple_pay"
        
        return False, 0.0, ""
    
    def parse_sms(self, phone: str, body: str, timestamp: datetime) -> SmsRecord:
        """단일 SMS 파싱"""
        is_payment, amount, source = self._extract_amount(body)
        
        return SmsRecord(
            phone=phone,
            body=body[:100],  # 앞 100자만 저장 (프라이버시)
            timestamp=timestamp,
            parsed_amount=amount if is_payment else None,
            is_payment_notification=is_payment,
        )
    
    def parse_batch(
        self,
        sms_list: List[Dict],
        lookback_days: int = 90,
    ) -> List[SmsRecord]:
        """
        SMS 배치 파싱
        
        Args:
            sms_list: [{"phone": "...", "body": "...", "date": timestamp}, ...]
            lookback_days: 조회 기간 (일)
        """
        cutoff = datetime.now() - timedelta(days=lookback_days)
        records = []
        
        for sms in sms_list:
            # 타임스탬프 변환
            ts = sms.get("date", 0)
            if isinstance(ts, (int, float)):
                timestamp = datetime.fromtimestamp(ts / 1000)  # 밀리초
            else:
                timestamp = ts
            
            # 기간 필터
            if timestamp < cutoff:
                continue
            
            # 파싱
            record = self.parse_sms(
                phone=sms.get("phone", sms.get("address", "")),
                body=sms.get("body", ""),
                timestamp=timestamp,
            )
            
            records.append(record)
            
            # 통계 업데이트
            self.stats["total_scanned"] += 1
            if record.is_payment_notification:
                self.stats["payments_found"] += 1
                self.stats["total_amount"] += record.parsed_amount or 0
        
        return records
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         AGGREGATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def aggregate_by_phone(
        self,
        records: List[SmsRecord],
    ) -> Dict[str, float]:
        """
        전화번호별 총 입금액 집계
        """
        totals = {}
        
        for record in records:
            if record.is_payment_notification and record.parsed_amount:
                phone = record.phone
                totals[phone] = totals.get(phone, 0) + record.parsed_amount
        
        return totals
    
    def get_payment_records(
        self,
        records: List[SmsRecord],
    ) -> List[SmsRecord]:
        """결제 알림만 필터링"""
        return [r for r in records if r.is_payment_notification]
    
    def get_stats(self) -> Dict:
        """파싱 통계"""
        return {
            **self.stats,
            "detection_rate": (
                self.stats["payments_found"] / self.stats["total_scanned"] * 100
                if self.stats["total_scanned"] > 0 else 0
            ),
        }


# ═══════════════════════════════════════════════════════════════════════════
#                              ANDROID INTEGRATION
# ═══════════════════════════════════════════════════════════════════════════

# React Native 브릿지용 인터페이스
REACT_NATIVE_BRIDGE = """
// React Native에서 호출
// Android 권한: READ_SMS, RECEIVE_SMS

import { NativeModules } from 'react-native';

const { SmsModule } = NativeModules;

export async function getAllSms(days = 90) {
  const cutoffMs = Date.now() - (days * 24 * 60 * 60 * 1000);
  
  // Android ContentResolver 쿼리
  const smsList = await SmsModule.querySms({
    projection: ['address', 'body', 'date'],
    selection: 'date > ?',
    selectionArgs: [cutoffMs.toString()],
    sortOrder: 'date DESC',
  });
  
  return smsList;
}
"""


# ═══════════════════════════════════════════════════════════════════════════
#                              TEST
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 테스트 SMS 데이터
    test_sms = [
        {
            "phone": "15990000",
            "body": "[국민은행] 입금 500,000원 잔액 1,200,000원",
            "date": datetime.now().timestamp() * 1000,
        },
        {
            "phone": "15990000",
            "body": "[신한카드] 결제승인 300,000원 홍길동님",
            "date": datetime.now().timestamp() * 1000,
        },
        {
            "phone": "15990000",
            "body": "[카카오페이] 입금 100,000원",
            "date": datetime.now().timestamp() * 1000,
        },
        {
            "phone": "15990000",
            "body": "[국민은행] 환불 50,000원",  # 제외 대상
            "date": datetime.now().timestamp() * 1000,
        },
        {
            "phone": "01012345678",
            "body": "안녕하세요. 내일 상담 가능하신가요?",  # 일반 메시지
            "date": datetime.now().timestamp() * 1000,
        },
    ]
    
    # 수집기 생성
    collector = SmsCollector()
    
    # 파싱
    records = collector.parse_batch(test_sms)
    
    print("=" * 60)
    print("AUTUS SMS Collector Test")
    print("=" * 60)
    
    for record in records:
        status = "💰 결제" if record.is_payment_notification else "📨 일반"
        amount = f"₩{record.parsed_amount:,.0f}" if record.parsed_amount else "-"
        print(f"\n{status} | {amount}")
        print(f"  {record.body[:50]}...")
    
    print("\n" + "=" * 60)
    print("Statistics:")
    print(collector.get_stats())
    
    print("\n" + "=" * 60)
    print("Aggregated by Phone:")
    print(collector.aggregate_by_phone(records))










"""
AUTUS Local Agent - SMS Collector
==================================

SMS 결제 알림에서 입금액 파싱

타겟 메시지:
- 은행 입금 알림: "[XX은행] 입금 500,000원"
- 카드 결제 알림: "[XX카드] 결제승인 300,000원"
- 간편결제 알림: "[카카오페이] 입금 100,000원"

Zero-Server-Cost:
- 로컬에서만 파싱
- 서버로 원문 전송 안함
- 금액만 추출하여 M 점수 계산
"""

from typing import List, Optional, Tuple, Dict
from dataclasses import dataclass
from datetime import datetime, timedelta
import re
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.models import SmsRecord


# ═══════════════════════════════════════════════════════════════════════════
#                              PAYMENT PATTERNS
# ═══════════════════════════════════════════════════════════════════════════

# 은행 입금 알림 패턴
BANK_PATTERNS = [
    # [은행명] 입금 금액
    r"\[([가-힣]+은행)\]\s*입금\s*([\d,]+)원",
    r"\[([가-힣]+뱅크)\]\s*입금\s*([\d,]+)원",
    # 은행명 입금 금액원
    r"([가-힣]+은행)\s*입금\s*([\d,]+)원",
    # 입금 금액 은행명
    r"입금\s*([\d,]+)원.*([가-힣]+은행)",
]

# 카드 결제 알림 패턴 (환불/취소 제외)
CARD_PATTERNS = [
    r"\[([가-힣]+카드)\]\s*결제승인\s*([\d,]+)원",
    r"\[([가-힣]+카드)\]\s*승인\s*([\d,]+)원",
    r"([가-힣]+카드)\s*결제\s*([\d,]+)원",
]

# 간편결제 입금 패턴
SIMPLE_PAY_PATTERNS = [
    r"\[카카오페이\]\s*입금\s*([\d,]+)원",
    r"\[네이버페이\]\s*입금\s*([\d,]+)원",
    r"\[토스\]\s*입금\s*([\d,]+)원",
    r"\[페이코\]\s*입금\s*([\d,]+)원",
]

# 제외 패턴 (환불, 취소 등)
EXCLUDE_PATTERNS = [
    r"환불",
    r"취소",
    r"반품",
    r"출금",
    r"이체",
    r"인출",
]


# ═══════════════════════════════════════════════════════════════════════════
#                              SMS COLLECTOR
# ═══════════════════════════════════════════════════════════════════════════

class SmsCollector:
    """
    SMS 결제 알림 수집기
    
    Android ContentResolver로 SMS 읽기 (권한 필요)
    """
    
    def __init__(self):
        # 컴파일된 정규식
        self._bank_patterns = [re.compile(p) for p in BANK_PATTERNS]
        self._card_patterns = [re.compile(p) for p in CARD_PATTERNS]
        self._simple_pay_patterns = [re.compile(p) for p in SIMPLE_PAY_PATTERNS]
        self._exclude_patterns = [re.compile(p) for p in EXCLUDE_PATTERNS]
        
        # 파싱 통계
        self.stats = {
            "total_scanned": 0,
            "payments_found": 0,
            "total_amount": 0.0,
        }
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         PARSING
    # ═══════════════════════════════════════════════════════════════════════
    
    def _extract_amount(self, text: str) -> Tuple[bool, float, str]:
        """
        SMS에서 금액 추출
        
        Returns: (is_payment, amount, source_type)
        """
        # 제외 패턴 체크
        for pattern in self._exclude_patterns:
            if pattern.search(text):
                return False, 0.0, ""
        
        # 은행 입금
        for pattern in self._bank_patterns:
            match = pattern.search(text)
            if match:
                amount_str = match.group(2) if len(match.groups()) >= 2 else match.group(1)
                amount = float(amount_str.replace(",", ""))
                return True, amount, "bank"
        
        # 카드 결제
        for pattern in self._card_patterns:
            match = pattern.search(text)
            if match:
                amount_str = match.group(2)
                amount = float(amount_str.replace(",", ""))
                return True, amount, "card"
        
        # 간편결제
        for pattern in self._simple_pay_patterns:
            match = pattern.search(text)
            if match:
                amount_str = match.group(1)
                amount = float(amount_str.replace(",", ""))
                return True, amount, "simple_pay"
        
        return False, 0.0, ""
    
    def parse_sms(self, phone: str, body: str, timestamp: datetime) -> SmsRecord:
        """단일 SMS 파싱"""
        is_payment, amount, source = self._extract_amount(body)
        
        return SmsRecord(
            phone=phone,
            body=body[:100],  # 앞 100자만 저장 (프라이버시)
            timestamp=timestamp,
            parsed_amount=amount if is_payment else None,
            is_payment_notification=is_payment,
        )
    
    def parse_batch(
        self,
        sms_list: List[Dict],
        lookback_days: int = 90,
    ) -> List[SmsRecord]:
        """
        SMS 배치 파싱
        
        Args:
            sms_list: [{"phone": "...", "body": "...", "date": timestamp}, ...]
            lookback_days: 조회 기간 (일)
        """
        cutoff = datetime.now() - timedelta(days=lookback_days)
        records = []
        
        for sms in sms_list:
            # 타임스탬프 변환
            ts = sms.get("date", 0)
            if isinstance(ts, (int, float)):
                timestamp = datetime.fromtimestamp(ts / 1000)  # 밀리초
            else:
                timestamp = ts
            
            # 기간 필터
            if timestamp < cutoff:
                continue
            
            # 파싱
            record = self.parse_sms(
                phone=sms.get("phone", sms.get("address", "")),
                body=sms.get("body", ""),
                timestamp=timestamp,
            )
            
            records.append(record)
            
            # 통계 업데이트
            self.stats["total_scanned"] += 1
            if record.is_payment_notification:
                self.stats["payments_found"] += 1
                self.stats["total_amount"] += record.parsed_amount or 0
        
        return records
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         AGGREGATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def aggregate_by_phone(
        self,
        records: List[SmsRecord],
    ) -> Dict[str, float]:
        """
        전화번호별 총 입금액 집계
        """
        totals = {}
        
        for record in records:
            if record.is_payment_notification and record.parsed_amount:
                phone = record.phone
                totals[phone] = totals.get(phone, 0) + record.parsed_amount
        
        return totals
    
    def get_payment_records(
        self,
        records: List[SmsRecord],
    ) -> List[SmsRecord]:
        """결제 알림만 필터링"""
        return [r for r in records if r.is_payment_notification]
    
    def get_stats(self) -> Dict:
        """파싱 통계"""
        return {
            **self.stats,
            "detection_rate": (
                self.stats["payments_found"] / self.stats["total_scanned"] * 100
                if self.stats["total_scanned"] > 0 else 0
            ),
        }


# ═══════════════════════════════════════════════════════════════════════════
#                              ANDROID INTEGRATION
# ═══════════════════════════════════════════════════════════════════════════

# React Native 브릿지용 인터페이스
REACT_NATIVE_BRIDGE = """
// React Native에서 호출
// Android 권한: READ_SMS, RECEIVE_SMS

import { NativeModules } from 'react-native';

const { SmsModule } = NativeModules;

export async function getAllSms(days = 90) {
  const cutoffMs = Date.now() - (days * 24 * 60 * 60 * 1000);
  
  // Android ContentResolver 쿼리
  const smsList = await SmsModule.querySms({
    projection: ['address', 'body', 'date'],
    selection: 'date > ?',
    selectionArgs: [cutoffMs.toString()],
    sortOrder: 'date DESC',
  });
  
  return smsList;
}
"""


# ═══════════════════════════════════════════════════════════════════════════
#                              TEST
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 테스트 SMS 데이터
    test_sms = [
        {
            "phone": "15990000",
            "body": "[국민은행] 입금 500,000원 잔액 1,200,000원",
            "date": datetime.now().timestamp() * 1000,
        },
        {
            "phone": "15990000",
            "body": "[신한카드] 결제승인 300,000원 홍길동님",
            "date": datetime.now().timestamp() * 1000,
        },
        {
            "phone": "15990000",
            "body": "[카카오페이] 입금 100,000원",
            "date": datetime.now().timestamp() * 1000,
        },
        {
            "phone": "15990000",
            "body": "[국민은행] 환불 50,000원",  # 제외 대상
            "date": datetime.now().timestamp() * 1000,
        },
        {
            "phone": "01012345678",
            "body": "안녕하세요. 내일 상담 가능하신가요?",  # 일반 메시지
            "date": datetime.now().timestamp() * 1000,
        },
    ]
    
    # 수집기 생성
    collector = SmsCollector()
    
    # 파싱
    records = collector.parse_batch(test_sms)
    
    print("=" * 60)
    print("AUTUS SMS Collector Test")
    print("=" * 60)
    
    for record in records:
        status = "💰 결제" if record.is_payment_notification else "📨 일반"
        amount = f"₩{record.parsed_amount:,.0f}" if record.parsed_amount else "-"
        print(f"\n{status} | {amount}")
        print(f"  {record.body[:50]}...")
    
    print("\n" + "=" * 60)
    print("Statistics:")
    print(collector.get_stats())
    
    print("\n" + "=" * 60)
    print("Aggregated by Phone:")
    print(collector.aggregate_by_phone(records))










"""
AUTUS Local Agent - SMS Collector
==================================

SMS 결제 알림에서 입금액 파싱

타겟 메시지:
- 은행 입금 알림: "[XX은행] 입금 500,000원"
- 카드 결제 알림: "[XX카드] 결제승인 300,000원"
- 간편결제 알림: "[카카오페이] 입금 100,000원"

Zero-Server-Cost:
- 로컬에서만 파싱
- 서버로 원문 전송 안함
- 금액만 추출하여 M 점수 계산
"""

from typing import List, Optional, Tuple, Dict
from dataclasses import dataclass
from datetime import datetime, timedelta
import re
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.models import SmsRecord


# ═══════════════════════════════════════════════════════════════════════════
#                              PAYMENT PATTERNS
# ═══════════════════════════════════════════════════════════════════════════

# 은행 입금 알림 패턴
BANK_PATTERNS = [
    # [은행명] 입금 금액
    r"\[([가-힣]+은행)\]\s*입금\s*([\d,]+)원",
    r"\[([가-힣]+뱅크)\]\s*입금\s*([\d,]+)원",
    # 은행명 입금 금액원
    r"([가-힣]+은행)\s*입금\s*([\d,]+)원",
    # 입금 금액 은행명
    r"입금\s*([\d,]+)원.*([가-힣]+은행)",
]

# 카드 결제 알림 패턴 (환불/취소 제외)
CARD_PATTERNS = [
    r"\[([가-힣]+카드)\]\s*결제승인\s*([\d,]+)원",
    r"\[([가-힣]+카드)\]\s*승인\s*([\d,]+)원",
    r"([가-힣]+카드)\s*결제\s*([\d,]+)원",
]

# 간편결제 입금 패턴
SIMPLE_PAY_PATTERNS = [
    r"\[카카오페이\]\s*입금\s*([\d,]+)원",
    r"\[네이버페이\]\s*입금\s*([\d,]+)원",
    r"\[토스\]\s*입금\s*([\d,]+)원",
    r"\[페이코\]\s*입금\s*([\d,]+)원",
]

# 제외 패턴 (환불, 취소 등)
EXCLUDE_PATTERNS = [
    r"환불",
    r"취소",
    r"반품",
    r"출금",
    r"이체",
    r"인출",
]


# ═══════════════════════════════════════════════════════════════════════════
#                              SMS COLLECTOR
# ═══════════════════════════════════════════════════════════════════════════

class SmsCollector:
    """
    SMS 결제 알림 수집기
    
    Android ContentResolver로 SMS 읽기 (권한 필요)
    """
    
    def __init__(self):
        # 컴파일된 정규식
        self._bank_patterns = [re.compile(p) for p in BANK_PATTERNS]
        self._card_patterns = [re.compile(p) for p in CARD_PATTERNS]
        self._simple_pay_patterns = [re.compile(p) for p in SIMPLE_PAY_PATTERNS]
        self._exclude_patterns = [re.compile(p) for p in EXCLUDE_PATTERNS]
        
        # 파싱 통계
        self.stats = {
            "total_scanned": 0,
            "payments_found": 0,
            "total_amount": 0.0,
        }
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         PARSING
    # ═══════════════════════════════════════════════════════════════════════
    
    def _extract_amount(self, text: str) -> Tuple[bool, float, str]:
        """
        SMS에서 금액 추출
        
        Returns: (is_payment, amount, source_type)
        """
        # 제외 패턴 체크
        for pattern in self._exclude_patterns:
            if pattern.search(text):
                return False, 0.0, ""
        
        # 은행 입금
        for pattern in self._bank_patterns:
            match = pattern.search(text)
            if match:
                amount_str = match.group(2) if len(match.groups()) >= 2 else match.group(1)
                amount = float(amount_str.replace(",", ""))
                return True, amount, "bank"
        
        # 카드 결제
        for pattern in self._card_patterns:
            match = pattern.search(text)
            if match:
                amount_str = match.group(2)
                amount = float(amount_str.replace(",", ""))
                return True, amount, "card"
        
        # 간편결제
        for pattern in self._simple_pay_patterns:
            match = pattern.search(text)
            if match:
                amount_str = match.group(1)
                amount = float(amount_str.replace(",", ""))
                return True, amount, "simple_pay"
        
        return False, 0.0, ""
    
    def parse_sms(self, phone: str, body: str, timestamp: datetime) -> SmsRecord:
        """단일 SMS 파싱"""
        is_payment, amount, source = self._extract_amount(body)
        
        return SmsRecord(
            phone=phone,
            body=body[:100],  # 앞 100자만 저장 (프라이버시)
            timestamp=timestamp,
            parsed_amount=amount if is_payment else None,
            is_payment_notification=is_payment,
        )
    
    def parse_batch(
        self,
        sms_list: List[Dict],
        lookback_days: int = 90,
    ) -> List[SmsRecord]:
        """
        SMS 배치 파싱
        
        Args:
            sms_list: [{"phone": "...", "body": "...", "date": timestamp}, ...]
            lookback_days: 조회 기간 (일)
        """
        cutoff = datetime.now() - timedelta(days=lookback_days)
        records = []
        
        for sms in sms_list:
            # 타임스탬프 변환
            ts = sms.get("date", 0)
            if isinstance(ts, (int, float)):
                timestamp = datetime.fromtimestamp(ts / 1000)  # 밀리초
            else:
                timestamp = ts
            
            # 기간 필터
            if timestamp < cutoff:
                continue
            
            # 파싱
            record = self.parse_sms(
                phone=sms.get("phone", sms.get("address", "")),
                body=sms.get("body", ""),
                timestamp=timestamp,
            )
            
            records.append(record)
            
            # 통계 업데이트
            self.stats["total_scanned"] += 1
            if record.is_payment_notification:
                self.stats["payments_found"] += 1
                self.stats["total_amount"] += record.parsed_amount or 0
        
        return records
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         AGGREGATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def aggregate_by_phone(
        self,
        records: List[SmsRecord],
    ) -> Dict[str, float]:
        """
        전화번호별 총 입금액 집계
        """
        totals = {}
        
        for record in records:
            if record.is_payment_notification and record.parsed_amount:
                phone = record.phone
                totals[phone] = totals.get(phone, 0) + record.parsed_amount
        
        return totals
    
    def get_payment_records(
        self,
        records: List[SmsRecord],
    ) -> List[SmsRecord]:
        """결제 알림만 필터링"""
        return [r for r in records if r.is_payment_notification]
    
    def get_stats(self) -> Dict:
        """파싱 통계"""
        return {
            **self.stats,
            "detection_rate": (
                self.stats["payments_found"] / self.stats["total_scanned"] * 100
                if self.stats["total_scanned"] > 0 else 0
            ),
        }


# ═══════════════════════════════════════════════════════════════════════════
#                              ANDROID INTEGRATION
# ═══════════════════════════════════════════════════════════════════════════

# React Native 브릿지용 인터페이스
REACT_NATIVE_BRIDGE = """
// React Native에서 호출
// Android 권한: READ_SMS, RECEIVE_SMS

import { NativeModules } from 'react-native';

const { SmsModule } = NativeModules;

export async function getAllSms(days = 90) {
  const cutoffMs = Date.now() - (days * 24 * 60 * 60 * 1000);
  
  // Android ContentResolver 쿼리
  const smsList = await SmsModule.querySms({
    projection: ['address', 'body', 'date'],
    selection: 'date > ?',
    selectionArgs: [cutoffMs.toString()],
    sortOrder: 'date DESC',
  });
  
  return smsList;
}
"""


# ═══════════════════════════════════════════════════════════════════════════
#                              TEST
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 테스트 SMS 데이터
    test_sms = [
        {
            "phone": "15990000",
            "body": "[국민은행] 입금 500,000원 잔액 1,200,000원",
            "date": datetime.now().timestamp() * 1000,
        },
        {
            "phone": "15990000",
            "body": "[신한카드] 결제승인 300,000원 홍길동님",
            "date": datetime.now().timestamp() * 1000,
        },
        {
            "phone": "15990000",
            "body": "[카카오페이] 입금 100,000원",
            "date": datetime.now().timestamp() * 1000,
        },
        {
            "phone": "15990000",
            "body": "[국민은행] 환불 50,000원",  # 제외 대상
            "date": datetime.now().timestamp() * 1000,
        },
        {
            "phone": "01012345678",
            "body": "안녕하세요. 내일 상담 가능하신가요?",  # 일반 메시지
            "date": datetime.now().timestamp() * 1000,
        },
    ]
    
    # 수집기 생성
    collector = SmsCollector()
    
    # 파싱
    records = collector.parse_batch(test_sms)
    
    print("=" * 60)
    print("AUTUS SMS Collector Test")
    print("=" * 60)
    
    for record in records:
        status = "💰 결제" if record.is_payment_notification else "📨 일반"
        amount = f"₩{record.parsed_amount:,.0f}" if record.parsed_amount else "-"
        print(f"\n{status} | {amount}")
        print(f"  {record.body[:50]}...")
    
    print("\n" + "=" * 60)
    print("Statistics:")
    print(collector.get_stats())
    
    print("\n" + "=" * 60)
    print("Aggregated by Phone:")
    print(collector.aggregate_by_phone(records))










"""
AUTUS Local Agent - SMS Collector
==================================

SMS 결제 알림에서 입금액 파싱

타겟 메시지:
- 은행 입금 알림: "[XX은행] 입금 500,000원"
- 카드 결제 알림: "[XX카드] 결제승인 300,000원"
- 간편결제 알림: "[카카오페이] 입금 100,000원"

Zero-Server-Cost:
- 로컬에서만 파싱
- 서버로 원문 전송 안함
- 금액만 추출하여 M 점수 계산
"""

from typing import List, Optional, Tuple, Dict
from dataclasses import dataclass
from datetime import datetime, timedelta
import re
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.models import SmsRecord


# ═══════════════════════════════════════════════════════════════════════════
#                              PAYMENT PATTERNS
# ═══════════════════════════════════════════════════════════════════════════

# 은행 입금 알림 패턴
BANK_PATTERNS = [
    # [은행명] 입금 금액
    r"\[([가-힣]+은행)\]\s*입금\s*([\d,]+)원",
    r"\[([가-힣]+뱅크)\]\s*입금\s*([\d,]+)원",
    # 은행명 입금 금액원
    r"([가-힣]+은행)\s*입금\s*([\d,]+)원",
    # 입금 금액 은행명
    r"입금\s*([\d,]+)원.*([가-힣]+은행)",
]

# 카드 결제 알림 패턴 (환불/취소 제외)
CARD_PATTERNS = [
    r"\[([가-힣]+카드)\]\s*결제승인\s*([\d,]+)원",
    r"\[([가-힣]+카드)\]\s*승인\s*([\d,]+)원",
    r"([가-힣]+카드)\s*결제\s*([\d,]+)원",
]

# 간편결제 입금 패턴
SIMPLE_PAY_PATTERNS = [
    r"\[카카오페이\]\s*입금\s*([\d,]+)원",
    r"\[네이버페이\]\s*입금\s*([\d,]+)원",
    r"\[토스\]\s*입금\s*([\d,]+)원",
    r"\[페이코\]\s*입금\s*([\d,]+)원",
]

# 제외 패턴 (환불, 취소 등)
EXCLUDE_PATTERNS = [
    r"환불",
    r"취소",
    r"반품",
    r"출금",
    r"이체",
    r"인출",
]


# ═══════════════════════════════════════════════════════════════════════════
#                              SMS COLLECTOR
# ═══════════════════════════════════════════════════════════════════════════

class SmsCollector:
    """
    SMS 결제 알림 수집기
    
    Android ContentResolver로 SMS 읽기 (권한 필요)
    """
    
    def __init__(self):
        # 컴파일된 정규식
        self._bank_patterns = [re.compile(p) for p in BANK_PATTERNS]
        self._card_patterns = [re.compile(p) for p in CARD_PATTERNS]
        self._simple_pay_patterns = [re.compile(p) for p in SIMPLE_PAY_PATTERNS]
        self._exclude_patterns = [re.compile(p) for p in EXCLUDE_PATTERNS]
        
        # 파싱 통계
        self.stats = {
            "total_scanned": 0,
            "payments_found": 0,
            "total_amount": 0.0,
        }
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         PARSING
    # ═══════════════════════════════════════════════════════════════════════
    
    def _extract_amount(self, text: str) -> Tuple[bool, float, str]:
        """
        SMS에서 금액 추출
        
        Returns: (is_payment, amount, source_type)
        """
        # 제외 패턴 체크
        for pattern in self._exclude_patterns:
            if pattern.search(text):
                return False, 0.0, ""
        
        # 은행 입금
        for pattern in self._bank_patterns:
            match = pattern.search(text)
            if match:
                amount_str = match.group(2) if len(match.groups()) >= 2 else match.group(1)
                amount = float(amount_str.replace(",", ""))
                return True, amount, "bank"
        
        # 카드 결제
        for pattern in self._card_patterns:
            match = pattern.search(text)
            if match:
                amount_str = match.group(2)
                amount = float(amount_str.replace(",", ""))
                return True, amount, "card"
        
        # 간편결제
        for pattern in self._simple_pay_patterns:
            match = pattern.search(text)
            if match:
                amount_str = match.group(1)
                amount = float(amount_str.replace(",", ""))
                return True, amount, "simple_pay"
        
        return False, 0.0, ""
    
    def parse_sms(self, phone: str, body: str, timestamp: datetime) -> SmsRecord:
        """단일 SMS 파싱"""
        is_payment, amount, source = self._extract_amount(body)
        
        return SmsRecord(
            phone=phone,
            body=body[:100],  # 앞 100자만 저장 (프라이버시)
            timestamp=timestamp,
            parsed_amount=amount if is_payment else None,
            is_payment_notification=is_payment,
        )
    
    def parse_batch(
        self,
        sms_list: List[Dict],
        lookback_days: int = 90,
    ) -> List[SmsRecord]:
        """
        SMS 배치 파싱
        
        Args:
            sms_list: [{"phone": "...", "body": "...", "date": timestamp}, ...]
            lookback_days: 조회 기간 (일)
        """
        cutoff = datetime.now() - timedelta(days=lookback_days)
        records = []
        
        for sms in sms_list:
            # 타임스탬프 변환
            ts = sms.get("date", 0)
            if isinstance(ts, (int, float)):
                timestamp = datetime.fromtimestamp(ts / 1000)  # 밀리초
            else:
                timestamp = ts
            
            # 기간 필터
            if timestamp < cutoff:
                continue
            
            # 파싱
            record = self.parse_sms(
                phone=sms.get("phone", sms.get("address", "")),
                body=sms.get("body", ""),
                timestamp=timestamp,
            )
            
            records.append(record)
            
            # 통계 업데이트
            self.stats["total_scanned"] += 1
            if record.is_payment_notification:
                self.stats["payments_found"] += 1
                self.stats["total_amount"] += record.parsed_amount or 0
        
        return records
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         AGGREGATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def aggregate_by_phone(
        self,
        records: List[SmsRecord],
    ) -> Dict[str, float]:
        """
        전화번호별 총 입금액 집계
        """
        totals = {}
        
        for record in records:
            if record.is_payment_notification and record.parsed_amount:
                phone = record.phone
                totals[phone] = totals.get(phone, 0) + record.parsed_amount
        
        return totals
    
    def get_payment_records(
        self,
        records: List[SmsRecord],
    ) -> List[SmsRecord]:
        """결제 알림만 필터링"""
        return [r for r in records if r.is_payment_notification]
    
    def get_stats(self) -> Dict:
        """파싱 통계"""
        return {
            **self.stats,
            "detection_rate": (
                self.stats["payments_found"] / self.stats["total_scanned"] * 100
                if self.stats["total_scanned"] > 0 else 0
            ),
        }


# ═══════════════════════════════════════════════════════════════════════════
#                              ANDROID INTEGRATION
# ═══════════════════════════════════════════════════════════════════════════

# React Native 브릿지용 인터페이스
REACT_NATIVE_BRIDGE = """
// React Native에서 호출
// Android 권한: READ_SMS, RECEIVE_SMS

import { NativeModules } from 'react-native';

const { SmsModule } = NativeModules;

export async function getAllSms(days = 90) {
  const cutoffMs = Date.now() - (days * 24 * 60 * 60 * 1000);
  
  // Android ContentResolver 쿼리
  const smsList = await SmsModule.querySms({
    projection: ['address', 'body', 'date'],
    selection: 'date > ?',
    selectionArgs: [cutoffMs.toString()],
    sortOrder: 'date DESC',
  });
  
  return smsList;
}
"""


# ═══════════════════════════════════════════════════════════════════════════
#                              TEST
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 테스트 SMS 데이터
    test_sms = [
        {
            "phone": "15990000",
            "body": "[국민은행] 입금 500,000원 잔액 1,200,000원",
            "date": datetime.now().timestamp() * 1000,
        },
        {
            "phone": "15990000",
            "body": "[신한카드] 결제승인 300,000원 홍길동님",
            "date": datetime.now().timestamp() * 1000,
        },
        {
            "phone": "15990000",
            "body": "[카카오페이] 입금 100,000원",
            "date": datetime.now().timestamp() * 1000,
        },
        {
            "phone": "15990000",
            "body": "[국민은행] 환불 50,000원",  # 제외 대상
            "date": datetime.now().timestamp() * 1000,
        },
        {
            "phone": "01012345678",
            "body": "안녕하세요. 내일 상담 가능하신가요?",  # 일반 메시지
            "date": datetime.now().timestamp() * 1000,
        },
    ]
    
    # 수집기 생성
    collector = SmsCollector()
    
    # 파싱
    records = collector.parse_batch(test_sms)
    
    print("=" * 60)
    print("AUTUS SMS Collector Test")
    print("=" * 60)
    
    for record in records:
        status = "💰 결제" if record.is_payment_notification else "📨 일반"
        amount = f"₩{record.parsed_amount:,.0f}" if record.parsed_amount else "-"
        print(f"\n{status} | {amount}")
        print(f"  {record.body[:50]}...")
    
    print("\n" + "=" * 60)
    print("Statistics:")
    print(collector.get_stats())
    
    print("\n" + "=" * 60)
    print("Aggregated by Phone:")
    print(collector.aggregate_by_phone(records))




















"""
AUTUS Local Agent - SMS Collector
==================================

SMS 결제 알림에서 입금액 파싱

타겟 메시지:
- 은행 입금 알림: "[XX은행] 입금 500,000원"
- 카드 결제 알림: "[XX카드] 결제승인 300,000원"
- 간편결제 알림: "[카카오페이] 입금 100,000원"

Zero-Server-Cost:
- 로컬에서만 파싱
- 서버로 원문 전송 안함
- 금액만 추출하여 M 점수 계산
"""

from typing import List, Optional, Tuple, Dict
from dataclasses import dataclass
from datetime import datetime, timedelta
import re
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.models import SmsRecord


# ═══════════════════════════════════════════════════════════════════════════
#                              PAYMENT PATTERNS
# ═══════════════════════════════════════════════════════════════════════════

# 은행 입금 알림 패턴
BANK_PATTERNS = [
    # [은행명] 입금 금액
    r"\[([가-힣]+은행)\]\s*입금\s*([\d,]+)원",
    r"\[([가-힣]+뱅크)\]\s*입금\s*([\d,]+)원",
    # 은행명 입금 금액원
    r"([가-힣]+은행)\s*입금\s*([\d,]+)원",
    # 입금 금액 은행명
    r"입금\s*([\d,]+)원.*([가-힣]+은행)",
]

# 카드 결제 알림 패턴 (환불/취소 제외)
CARD_PATTERNS = [
    r"\[([가-힣]+카드)\]\s*결제승인\s*([\d,]+)원",
    r"\[([가-힣]+카드)\]\s*승인\s*([\d,]+)원",
    r"([가-힣]+카드)\s*결제\s*([\d,]+)원",
]

# 간편결제 입금 패턴
SIMPLE_PAY_PATTERNS = [
    r"\[카카오페이\]\s*입금\s*([\d,]+)원",
    r"\[네이버페이\]\s*입금\s*([\d,]+)원",
    r"\[토스\]\s*입금\s*([\d,]+)원",
    r"\[페이코\]\s*입금\s*([\d,]+)원",
]

# 제외 패턴 (환불, 취소 등)
EXCLUDE_PATTERNS = [
    r"환불",
    r"취소",
    r"반품",
    r"출금",
    r"이체",
    r"인출",
]


# ═══════════════════════════════════════════════════════════════════════════
#                              SMS COLLECTOR
# ═══════════════════════════════════════════════════════════════════════════

class SmsCollector:
    """
    SMS 결제 알림 수집기
    
    Android ContentResolver로 SMS 읽기 (권한 필요)
    """
    
    def __init__(self):
        # 컴파일된 정규식
        self._bank_patterns = [re.compile(p) for p in BANK_PATTERNS]
        self._card_patterns = [re.compile(p) for p in CARD_PATTERNS]
        self._simple_pay_patterns = [re.compile(p) for p in SIMPLE_PAY_PATTERNS]
        self._exclude_patterns = [re.compile(p) for p in EXCLUDE_PATTERNS]
        
        # 파싱 통계
        self.stats = {
            "total_scanned": 0,
            "payments_found": 0,
            "total_amount": 0.0,
        }
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         PARSING
    # ═══════════════════════════════════════════════════════════════════════
    
    def _extract_amount(self, text: str) -> Tuple[bool, float, str]:
        """
        SMS에서 금액 추출
        
        Returns: (is_payment, amount, source_type)
        """
        # 제외 패턴 체크
        for pattern in self._exclude_patterns:
            if pattern.search(text):
                return False, 0.0, ""
        
        # 은행 입금
        for pattern in self._bank_patterns:
            match = pattern.search(text)
            if match:
                amount_str = match.group(2) if len(match.groups()) >= 2 else match.group(1)
                amount = float(amount_str.replace(",", ""))
                return True, amount, "bank"
        
        # 카드 결제
        for pattern in self._card_patterns:
            match = pattern.search(text)
            if match:
                amount_str = match.group(2)
                amount = float(amount_str.replace(",", ""))
                return True, amount, "card"
        
        # 간편결제
        for pattern in self._simple_pay_patterns:
            match = pattern.search(text)
            if match:
                amount_str = match.group(1)
                amount = float(amount_str.replace(",", ""))
                return True, amount, "simple_pay"
        
        return False, 0.0, ""
    
    def parse_sms(self, phone: str, body: str, timestamp: datetime) -> SmsRecord:
        """단일 SMS 파싱"""
        is_payment, amount, source = self._extract_amount(body)
        
        return SmsRecord(
            phone=phone,
            body=body[:100],  # 앞 100자만 저장 (프라이버시)
            timestamp=timestamp,
            parsed_amount=amount if is_payment else None,
            is_payment_notification=is_payment,
        )
    
    def parse_batch(
        self,
        sms_list: List[Dict],
        lookback_days: int = 90,
    ) -> List[SmsRecord]:
        """
        SMS 배치 파싱
        
        Args:
            sms_list: [{"phone": "...", "body": "...", "date": timestamp}, ...]
            lookback_days: 조회 기간 (일)
        """
        cutoff = datetime.now() - timedelta(days=lookback_days)
        records = []
        
        for sms in sms_list:
            # 타임스탬프 변환
            ts = sms.get("date", 0)
            if isinstance(ts, (int, float)):
                timestamp = datetime.fromtimestamp(ts / 1000)  # 밀리초
            else:
                timestamp = ts
            
            # 기간 필터
            if timestamp < cutoff:
                continue
            
            # 파싱
            record = self.parse_sms(
                phone=sms.get("phone", sms.get("address", "")),
                body=sms.get("body", ""),
                timestamp=timestamp,
            )
            
            records.append(record)
            
            # 통계 업데이트
            self.stats["total_scanned"] += 1
            if record.is_payment_notification:
                self.stats["payments_found"] += 1
                self.stats["total_amount"] += record.parsed_amount or 0
        
        return records
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         AGGREGATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def aggregate_by_phone(
        self,
        records: List[SmsRecord],
    ) -> Dict[str, float]:
        """
        전화번호별 총 입금액 집계
        """
        totals = {}
        
        for record in records:
            if record.is_payment_notification and record.parsed_amount:
                phone = record.phone
                totals[phone] = totals.get(phone, 0) + record.parsed_amount
        
        return totals
    
    def get_payment_records(
        self,
        records: List[SmsRecord],
    ) -> List[SmsRecord]:
        """결제 알림만 필터링"""
        return [r for r in records if r.is_payment_notification]
    
    def get_stats(self) -> Dict:
        """파싱 통계"""
        return {
            **self.stats,
            "detection_rate": (
                self.stats["payments_found"] / self.stats["total_scanned"] * 100
                if self.stats["total_scanned"] > 0 else 0
            ),
        }


# ═══════════════════════════════════════════════════════════════════════════
#                              ANDROID INTEGRATION
# ═══════════════════════════════════════════════════════════════════════════

# React Native 브릿지용 인터페이스
REACT_NATIVE_BRIDGE = """
// React Native에서 호출
// Android 권한: READ_SMS, RECEIVE_SMS

import { NativeModules } from 'react-native';

const { SmsModule } = NativeModules;

export async function getAllSms(days = 90) {
  const cutoffMs = Date.now() - (days * 24 * 60 * 60 * 1000);
  
  // Android ContentResolver 쿼리
  const smsList = await SmsModule.querySms({
    projection: ['address', 'body', 'date'],
    selection: 'date > ?',
    selectionArgs: [cutoffMs.toString()],
    sortOrder: 'date DESC',
  });
  
  return smsList;
}
"""


# ═══════════════════════════════════════════════════════════════════════════
#                              TEST
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 테스트 SMS 데이터
    test_sms = [
        {
            "phone": "15990000",
            "body": "[국민은행] 입금 500,000원 잔액 1,200,000원",
            "date": datetime.now().timestamp() * 1000,
        },
        {
            "phone": "15990000",
            "body": "[신한카드] 결제승인 300,000원 홍길동님",
            "date": datetime.now().timestamp() * 1000,
        },
        {
            "phone": "15990000",
            "body": "[카카오페이] 입금 100,000원",
            "date": datetime.now().timestamp() * 1000,
        },
        {
            "phone": "15990000",
            "body": "[국민은행] 환불 50,000원",  # 제외 대상
            "date": datetime.now().timestamp() * 1000,
        },
        {
            "phone": "01012345678",
            "body": "안녕하세요. 내일 상담 가능하신가요?",  # 일반 메시지
            "date": datetime.now().timestamp() * 1000,
        },
    ]
    
    # 수집기 생성
    collector = SmsCollector()
    
    # 파싱
    records = collector.parse_batch(test_sms)
    
    print("=" * 60)
    print("AUTUS SMS Collector Test")
    print("=" * 60)
    
    for record in records:
        status = "💰 결제" if record.is_payment_notification else "📨 일반"
        amount = f"₩{record.parsed_amount:,.0f}" if record.parsed_amount else "-"
        print(f"\n{status} | {amount}")
        print(f"  {record.body[:50]}...")
    
    print("\n" + "=" * 60)
    print("Statistics:")
    print(collector.get_stats())
    
    print("\n" + "=" * 60)
    print("Aggregated by Phone:")
    print(collector.aggregate_by_phone(records))










"""
AUTUS Local Agent - SMS Collector
==================================

SMS 결제 알림에서 입금액 파싱

타겟 메시지:
- 은행 입금 알림: "[XX은행] 입금 500,000원"
- 카드 결제 알림: "[XX카드] 결제승인 300,000원"
- 간편결제 알림: "[카카오페이] 입금 100,000원"

Zero-Server-Cost:
- 로컬에서만 파싱
- 서버로 원문 전송 안함
- 금액만 추출하여 M 점수 계산
"""

from typing import List, Optional, Tuple, Dict
from dataclasses import dataclass
from datetime import datetime, timedelta
import re
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.models import SmsRecord


# ═══════════════════════════════════════════════════════════════════════════
#                              PAYMENT PATTERNS
# ═══════════════════════════════════════════════════════════════════════════

# 은행 입금 알림 패턴
BANK_PATTERNS = [
    # [은행명] 입금 금액
    r"\[([가-힣]+은행)\]\s*입금\s*([\d,]+)원",
    r"\[([가-힣]+뱅크)\]\s*입금\s*([\d,]+)원",
    # 은행명 입금 금액원
    r"([가-힣]+은행)\s*입금\s*([\d,]+)원",
    # 입금 금액 은행명
    r"입금\s*([\d,]+)원.*([가-힣]+은행)",
]

# 카드 결제 알림 패턴 (환불/취소 제외)
CARD_PATTERNS = [
    r"\[([가-힣]+카드)\]\s*결제승인\s*([\d,]+)원",
    r"\[([가-힣]+카드)\]\s*승인\s*([\d,]+)원",
    r"([가-힣]+카드)\s*결제\s*([\d,]+)원",
]

# 간편결제 입금 패턴
SIMPLE_PAY_PATTERNS = [
    r"\[카카오페이\]\s*입금\s*([\d,]+)원",
    r"\[네이버페이\]\s*입금\s*([\d,]+)원",
    r"\[토스\]\s*입금\s*([\d,]+)원",
    r"\[페이코\]\s*입금\s*([\d,]+)원",
]

# 제외 패턴 (환불, 취소 등)
EXCLUDE_PATTERNS = [
    r"환불",
    r"취소",
    r"반품",
    r"출금",
    r"이체",
    r"인출",
]


# ═══════════════════════════════════════════════════════════════════════════
#                              SMS COLLECTOR
# ═══════════════════════════════════════════════════════════════════════════

class SmsCollector:
    """
    SMS 결제 알림 수집기
    
    Android ContentResolver로 SMS 읽기 (권한 필요)
    """
    
    def __init__(self):
        # 컴파일된 정규식
        self._bank_patterns = [re.compile(p) for p in BANK_PATTERNS]
        self._card_patterns = [re.compile(p) for p in CARD_PATTERNS]
        self._simple_pay_patterns = [re.compile(p) for p in SIMPLE_PAY_PATTERNS]
        self._exclude_patterns = [re.compile(p) for p in EXCLUDE_PATTERNS]
        
        # 파싱 통계
        self.stats = {
            "total_scanned": 0,
            "payments_found": 0,
            "total_amount": 0.0,
        }
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         PARSING
    # ═══════════════════════════════════════════════════════════════════════
    
    def _extract_amount(self, text: str) -> Tuple[bool, float, str]:
        """
        SMS에서 금액 추출
        
        Returns: (is_payment, amount, source_type)
        """
        # 제외 패턴 체크
        for pattern in self._exclude_patterns:
            if pattern.search(text):
                return False, 0.0, ""
        
        # 은행 입금
        for pattern in self._bank_patterns:
            match = pattern.search(text)
            if match:
                amount_str = match.group(2) if len(match.groups()) >= 2 else match.group(1)
                amount = float(amount_str.replace(",", ""))
                return True, amount, "bank"
        
        # 카드 결제
        for pattern in self._card_patterns:
            match = pattern.search(text)
            if match:
                amount_str = match.group(2)
                amount = float(amount_str.replace(",", ""))
                return True, amount, "card"
        
        # 간편결제
        for pattern in self._simple_pay_patterns:
            match = pattern.search(text)
            if match:
                amount_str = match.group(1)
                amount = float(amount_str.replace(",", ""))
                return True, amount, "simple_pay"
        
        return False, 0.0, ""
    
    def parse_sms(self, phone: str, body: str, timestamp: datetime) -> SmsRecord:
        """단일 SMS 파싱"""
        is_payment, amount, source = self._extract_amount(body)
        
        return SmsRecord(
            phone=phone,
            body=body[:100],  # 앞 100자만 저장 (프라이버시)
            timestamp=timestamp,
            parsed_amount=amount if is_payment else None,
            is_payment_notification=is_payment,
        )
    
    def parse_batch(
        self,
        sms_list: List[Dict],
        lookback_days: int = 90,
    ) -> List[SmsRecord]:
        """
        SMS 배치 파싱
        
        Args:
            sms_list: [{"phone": "...", "body": "...", "date": timestamp}, ...]
            lookback_days: 조회 기간 (일)
        """
        cutoff = datetime.now() - timedelta(days=lookback_days)
        records = []
        
        for sms in sms_list:
            # 타임스탬프 변환
            ts = sms.get("date", 0)
            if isinstance(ts, (int, float)):
                timestamp = datetime.fromtimestamp(ts / 1000)  # 밀리초
            else:
                timestamp = ts
            
            # 기간 필터
            if timestamp < cutoff:
                continue
            
            # 파싱
            record = self.parse_sms(
                phone=sms.get("phone", sms.get("address", "")),
                body=sms.get("body", ""),
                timestamp=timestamp,
            )
            
            records.append(record)
            
            # 통계 업데이트
            self.stats["total_scanned"] += 1
            if record.is_payment_notification:
                self.stats["payments_found"] += 1
                self.stats["total_amount"] += record.parsed_amount or 0
        
        return records
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         AGGREGATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def aggregate_by_phone(
        self,
        records: List[SmsRecord],
    ) -> Dict[str, float]:
        """
        전화번호별 총 입금액 집계
        """
        totals = {}
        
        for record in records:
            if record.is_payment_notification and record.parsed_amount:
                phone = record.phone
                totals[phone] = totals.get(phone, 0) + record.parsed_amount
        
        return totals
    
    def get_payment_records(
        self,
        records: List[SmsRecord],
    ) -> List[SmsRecord]:
        """결제 알림만 필터링"""
        return [r for r in records if r.is_payment_notification]
    
    def get_stats(self) -> Dict:
        """파싱 통계"""
        return {
            **self.stats,
            "detection_rate": (
                self.stats["payments_found"] / self.stats["total_scanned"] * 100
                if self.stats["total_scanned"] > 0 else 0
            ),
        }


# ═══════════════════════════════════════════════════════════════════════════
#                              ANDROID INTEGRATION
# ═══════════════════════════════════════════════════════════════════════════

# React Native 브릿지용 인터페이스
REACT_NATIVE_BRIDGE = """
// React Native에서 호출
// Android 권한: READ_SMS, RECEIVE_SMS

import { NativeModules } from 'react-native';

const { SmsModule } = NativeModules;

export async function getAllSms(days = 90) {
  const cutoffMs = Date.now() - (days * 24 * 60 * 60 * 1000);
  
  // Android ContentResolver 쿼리
  const smsList = await SmsModule.querySms({
    projection: ['address', 'body', 'date'],
    selection: 'date > ?',
    selectionArgs: [cutoffMs.toString()],
    sortOrder: 'date DESC',
  });
  
  return smsList;
}
"""


# ═══════════════════════════════════════════════════════════════════════════
#                              TEST
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 테스트 SMS 데이터
    test_sms = [
        {
            "phone": "15990000",
            "body": "[국민은행] 입금 500,000원 잔액 1,200,000원",
            "date": datetime.now().timestamp() * 1000,
        },
        {
            "phone": "15990000",
            "body": "[신한카드] 결제승인 300,000원 홍길동님",
            "date": datetime.now().timestamp() * 1000,
        },
        {
            "phone": "15990000",
            "body": "[카카오페이] 입금 100,000원",
            "date": datetime.now().timestamp() * 1000,
        },
        {
            "phone": "15990000",
            "body": "[국민은행] 환불 50,000원",  # 제외 대상
            "date": datetime.now().timestamp() * 1000,
        },
        {
            "phone": "01012345678",
            "body": "안녕하세요. 내일 상담 가능하신가요?",  # 일반 메시지
            "date": datetime.now().timestamp() * 1000,
        },
    ]
    
    # 수집기 생성
    collector = SmsCollector()
    
    # 파싱
    records = collector.parse_batch(test_sms)
    
    print("=" * 60)
    print("AUTUS SMS Collector Test")
    print("=" * 60)
    
    for record in records:
        status = "💰 결제" if record.is_payment_notification else "📨 일반"
        amount = f"₩{record.parsed_amount:,.0f}" if record.parsed_amount else "-"
        print(f"\n{status} | {amount}")
        print(f"  {record.body[:50]}...")
    
    print("\n" + "=" * 60)
    print("Statistics:")
    print(collector.get_stats())
    
    print("\n" + "=" * 60)
    print("Aggregated by Phone:")
    print(collector.aggregate_by_phone(records))










"""
AUTUS Local Agent - SMS Collector
==================================

SMS 결제 알림에서 입금액 파싱

타겟 메시지:
- 은행 입금 알림: "[XX은행] 입금 500,000원"
- 카드 결제 알림: "[XX카드] 결제승인 300,000원"
- 간편결제 알림: "[카카오페이] 입금 100,000원"

Zero-Server-Cost:
- 로컬에서만 파싱
- 서버로 원문 전송 안함
- 금액만 추출하여 M 점수 계산
"""

from typing import List, Optional, Tuple, Dict
from dataclasses import dataclass
from datetime import datetime, timedelta
import re
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.models import SmsRecord


# ═══════════════════════════════════════════════════════════════════════════
#                              PAYMENT PATTERNS
# ═══════════════════════════════════════════════════════════════════════════

# 은행 입금 알림 패턴
BANK_PATTERNS = [
    # [은행명] 입금 금액
    r"\[([가-힣]+은행)\]\s*입금\s*([\d,]+)원",
    r"\[([가-힣]+뱅크)\]\s*입금\s*([\d,]+)원",
    # 은행명 입금 금액원
    r"([가-힣]+은행)\s*입금\s*([\d,]+)원",
    # 입금 금액 은행명
    r"입금\s*([\d,]+)원.*([가-힣]+은행)",
]

# 카드 결제 알림 패턴 (환불/취소 제외)
CARD_PATTERNS = [
    r"\[([가-힣]+카드)\]\s*결제승인\s*([\d,]+)원",
    r"\[([가-힣]+카드)\]\s*승인\s*([\d,]+)원",
    r"([가-힣]+카드)\s*결제\s*([\d,]+)원",
]

# 간편결제 입금 패턴
SIMPLE_PAY_PATTERNS = [
    r"\[카카오페이\]\s*입금\s*([\d,]+)원",
    r"\[네이버페이\]\s*입금\s*([\d,]+)원",
    r"\[토스\]\s*입금\s*([\d,]+)원",
    r"\[페이코\]\s*입금\s*([\d,]+)원",
]

# 제외 패턴 (환불, 취소 등)
EXCLUDE_PATTERNS = [
    r"환불",
    r"취소",
    r"반품",
    r"출금",
    r"이체",
    r"인출",
]


# ═══════════════════════════════════════════════════════════════════════════
#                              SMS COLLECTOR
# ═══════════════════════════════════════════════════════════════════════════

class SmsCollector:
    """
    SMS 결제 알림 수집기
    
    Android ContentResolver로 SMS 읽기 (권한 필요)
    """
    
    def __init__(self):
        # 컴파일된 정규식
        self._bank_patterns = [re.compile(p) for p in BANK_PATTERNS]
        self._card_patterns = [re.compile(p) for p in CARD_PATTERNS]
        self._simple_pay_patterns = [re.compile(p) for p in SIMPLE_PAY_PATTERNS]
        self._exclude_patterns = [re.compile(p) for p in EXCLUDE_PATTERNS]
        
        # 파싱 통계
        self.stats = {
            "total_scanned": 0,
            "payments_found": 0,
            "total_amount": 0.0,
        }
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         PARSING
    # ═══════════════════════════════════════════════════════════════════════
    
    def _extract_amount(self, text: str) -> Tuple[bool, float, str]:
        """
        SMS에서 금액 추출
        
        Returns: (is_payment, amount, source_type)
        """
        # 제외 패턴 체크
        for pattern in self._exclude_patterns:
            if pattern.search(text):
                return False, 0.0, ""
        
        # 은행 입금
        for pattern in self._bank_patterns:
            match = pattern.search(text)
            if match:
                amount_str = match.group(2) if len(match.groups()) >= 2 else match.group(1)
                amount = float(amount_str.replace(",", ""))
                return True, amount, "bank"
        
        # 카드 결제
        for pattern in self._card_patterns:
            match = pattern.search(text)
            if match:
                amount_str = match.group(2)
                amount = float(amount_str.replace(",", ""))
                return True, amount, "card"
        
        # 간편결제
        for pattern in self._simple_pay_patterns:
            match = pattern.search(text)
            if match:
                amount_str = match.group(1)
                amount = float(amount_str.replace(",", ""))
                return True, amount, "simple_pay"
        
        return False, 0.0, ""
    
    def parse_sms(self, phone: str, body: str, timestamp: datetime) -> SmsRecord:
        """단일 SMS 파싱"""
        is_payment, amount, source = self._extract_amount(body)
        
        return SmsRecord(
            phone=phone,
            body=body[:100],  # 앞 100자만 저장 (프라이버시)
            timestamp=timestamp,
            parsed_amount=amount if is_payment else None,
            is_payment_notification=is_payment,
        )
    
    def parse_batch(
        self,
        sms_list: List[Dict],
        lookback_days: int = 90,
    ) -> List[SmsRecord]:
        """
        SMS 배치 파싱
        
        Args:
            sms_list: [{"phone": "...", "body": "...", "date": timestamp}, ...]
            lookback_days: 조회 기간 (일)
        """
        cutoff = datetime.now() - timedelta(days=lookback_days)
        records = []
        
        for sms in sms_list:
            # 타임스탬프 변환
            ts = sms.get("date", 0)
            if isinstance(ts, (int, float)):
                timestamp = datetime.fromtimestamp(ts / 1000)  # 밀리초
            else:
                timestamp = ts
            
            # 기간 필터
            if timestamp < cutoff:
                continue
            
            # 파싱
            record = self.parse_sms(
                phone=sms.get("phone", sms.get("address", "")),
                body=sms.get("body", ""),
                timestamp=timestamp,
            )
            
            records.append(record)
            
            # 통계 업데이트
            self.stats["total_scanned"] += 1
            if record.is_payment_notification:
                self.stats["payments_found"] += 1
                self.stats["total_amount"] += record.parsed_amount or 0
        
        return records
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         AGGREGATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def aggregate_by_phone(
        self,
        records: List[SmsRecord],
    ) -> Dict[str, float]:
        """
        전화번호별 총 입금액 집계
        """
        totals = {}
        
        for record in records:
            if record.is_payment_notification and record.parsed_amount:
                phone = record.phone
                totals[phone] = totals.get(phone, 0) + record.parsed_amount
        
        return totals
    
    def get_payment_records(
        self,
        records: List[SmsRecord],
    ) -> List[SmsRecord]:
        """결제 알림만 필터링"""
        return [r for r in records if r.is_payment_notification]
    
    def get_stats(self) -> Dict:
        """파싱 통계"""
        return {
            **self.stats,
            "detection_rate": (
                self.stats["payments_found"] / self.stats["total_scanned"] * 100
                if self.stats["total_scanned"] > 0 else 0
            ),
        }


# ═══════════════════════════════════════════════════════════════════════════
#                              ANDROID INTEGRATION
# ═══════════════════════════════════════════════════════════════════════════

# React Native 브릿지용 인터페이스
REACT_NATIVE_BRIDGE = """
// React Native에서 호출
// Android 권한: READ_SMS, RECEIVE_SMS

import { NativeModules } from 'react-native';

const { SmsModule } = NativeModules;

export async function getAllSms(days = 90) {
  const cutoffMs = Date.now() - (days * 24 * 60 * 60 * 1000);
  
  // Android ContentResolver 쿼리
  const smsList = await SmsModule.querySms({
    projection: ['address', 'body', 'date'],
    selection: 'date > ?',
    selectionArgs: [cutoffMs.toString()],
    sortOrder: 'date DESC',
  });
  
  return smsList;
}
"""


# ═══════════════════════════════════════════════════════════════════════════
#                              TEST
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 테스트 SMS 데이터
    test_sms = [
        {
            "phone": "15990000",
            "body": "[국민은행] 입금 500,000원 잔액 1,200,000원",
            "date": datetime.now().timestamp() * 1000,
        },
        {
            "phone": "15990000",
            "body": "[신한카드] 결제승인 300,000원 홍길동님",
            "date": datetime.now().timestamp() * 1000,
        },
        {
            "phone": "15990000",
            "body": "[카카오페이] 입금 100,000원",
            "date": datetime.now().timestamp() * 1000,
        },
        {
            "phone": "15990000",
            "body": "[국민은행] 환불 50,000원",  # 제외 대상
            "date": datetime.now().timestamp() * 1000,
        },
        {
            "phone": "01012345678",
            "body": "안녕하세요. 내일 상담 가능하신가요?",  # 일반 메시지
            "date": datetime.now().timestamp() * 1000,
        },
    ]
    
    # 수집기 생성
    collector = SmsCollector()
    
    # 파싱
    records = collector.parse_batch(test_sms)
    
    print("=" * 60)
    print("AUTUS SMS Collector Test")
    print("=" * 60)
    
    for record in records:
        status = "💰 결제" if record.is_payment_notification else "📨 일반"
        amount = f"₩{record.parsed_amount:,.0f}" if record.parsed_amount else "-"
        print(f"\n{status} | {amount}")
        print(f"  {record.body[:50]}...")
    
    print("\n" + "=" * 60)
    print("Statistics:")
    print(collector.get_stats())
    
    print("\n" + "=" * 60)
    print("Aggregated by Phone:")
    print(collector.aggregate_by_phone(records))










"""
AUTUS Local Agent - SMS Collector
==================================

SMS 결제 알림에서 입금액 파싱

타겟 메시지:
- 은행 입금 알림: "[XX은행] 입금 500,000원"
- 카드 결제 알림: "[XX카드] 결제승인 300,000원"
- 간편결제 알림: "[카카오페이] 입금 100,000원"

Zero-Server-Cost:
- 로컬에서만 파싱
- 서버로 원문 전송 안함
- 금액만 추출하여 M 점수 계산
"""

from typing import List, Optional, Tuple, Dict
from dataclasses import dataclass
from datetime import datetime, timedelta
import re
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.models import SmsRecord


# ═══════════════════════════════════════════════════════════════════════════
#                              PAYMENT PATTERNS
# ═══════════════════════════════════════════════════════════════════════════

# 은행 입금 알림 패턴
BANK_PATTERNS = [
    # [은행명] 입금 금액
    r"\[([가-힣]+은행)\]\s*입금\s*([\d,]+)원",
    r"\[([가-힣]+뱅크)\]\s*입금\s*([\d,]+)원",
    # 은행명 입금 금액원
    r"([가-힣]+은행)\s*입금\s*([\d,]+)원",
    # 입금 금액 은행명
    r"입금\s*([\d,]+)원.*([가-힣]+은행)",
]

# 카드 결제 알림 패턴 (환불/취소 제외)
CARD_PATTERNS = [
    r"\[([가-힣]+카드)\]\s*결제승인\s*([\d,]+)원",
    r"\[([가-힣]+카드)\]\s*승인\s*([\d,]+)원",
    r"([가-힣]+카드)\s*결제\s*([\d,]+)원",
]

# 간편결제 입금 패턴
SIMPLE_PAY_PATTERNS = [
    r"\[카카오페이\]\s*입금\s*([\d,]+)원",
    r"\[네이버페이\]\s*입금\s*([\d,]+)원",
    r"\[토스\]\s*입금\s*([\d,]+)원",
    r"\[페이코\]\s*입금\s*([\d,]+)원",
]

# 제외 패턴 (환불, 취소 등)
EXCLUDE_PATTERNS = [
    r"환불",
    r"취소",
    r"반품",
    r"출금",
    r"이체",
    r"인출",
]


# ═══════════════════════════════════════════════════════════════════════════
#                              SMS COLLECTOR
# ═══════════════════════════════════════════════════════════════════════════

class SmsCollector:
    """
    SMS 결제 알림 수집기
    
    Android ContentResolver로 SMS 읽기 (권한 필요)
    """
    
    def __init__(self):
        # 컴파일된 정규식
        self._bank_patterns = [re.compile(p) for p in BANK_PATTERNS]
        self._card_patterns = [re.compile(p) for p in CARD_PATTERNS]
        self._simple_pay_patterns = [re.compile(p) for p in SIMPLE_PAY_PATTERNS]
        self._exclude_patterns = [re.compile(p) for p in EXCLUDE_PATTERNS]
        
        # 파싱 통계
        self.stats = {
            "total_scanned": 0,
            "payments_found": 0,
            "total_amount": 0.0,
        }
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         PARSING
    # ═══════════════════════════════════════════════════════════════════════
    
    def _extract_amount(self, text: str) -> Tuple[bool, float, str]:
        """
        SMS에서 금액 추출
        
        Returns: (is_payment, amount, source_type)
        """
        # 제외 패턴 체크
        for pattern in self._exclude_patterns:
            if pattern.search(text):
                return False, 0.0, ""
        
        # 은행 입금
        for pattern in self._bank_patterns:
            match = pattern.search(text)
            if match:
                amount_str = match.group(2) if len(match.groups()) >= 2 else match.group(1)
                amount = float(amount_str.replace(",", ""))
                return True, amount, "bank"
        
        # 카드 결제
        for pattern in self._card_patterns:
            match = pattern.search(text)
            if match:
                amount_str = match.group(2)
                amount = float(amount_str.replace(",", ""))
                return True, amount, "card"
        
        # 간편결제
        for pattern in self._simple_pay_patterns:
            match = pattern.search(text)
            if match:
                amount_str = match.group(1)
                amount = float(amount_str.replace(",", ""))
                return True, amount, "simple_pay"
        
        return False, 0.0, ""
    
    def parse_sms(self, phone: str, body: str, timestamp: datetime) -> SmsRecord:
        """단일 SMS 파싱"""
        is_payment, amount, source = self._extract_amount(body)
        
        return SmsRecord(
            phone=phone,
            body=body[:100],  # 앞 100자만 저장 (프라이버시)
            timestamp=timestamp,
            parsed_amount=amount if is_payment else None,
            is_payment_notification=is_payment,
        )
    
    def parse_batch(
        self,
        sms_list: List[Dict],
        lookback_days: int = 90,
    ) -> List[SmsRecord]:
        """
        SMS 배치 파싱
        
        Args:
            sms_list: [{"phone": "...", "body": "...", "date": timestamp}, ...]
            lookback_days: 조회 기간 (일)
        """
        cutoff = datetime.now() - timedelta(days=lookback_days)
        records = []
        
        for sms in sms_list:
            # 타임스탬프 변환
            ts = sms.get("date", 0)
            if isinstance(ts, (int, float)):
                timestamp = datetime.fromtimestamp(ts / 1000)  # 밀리초
            else:
                timestamp = ts
            
            # 기간 필터
            if timestamp < cutoff:
                continue
            
            # 파싱
            record = self.parse_sms(
                phone=sms.get("phone", sms.get("address", "")),
                body=sms.get("body", ""),
                timestamp=timestamp,
            )
            
            records.append(record)
            
            # 통계 업데이트
            self.stats["total_scanned"] += 1
            if record.is_payment_notification:
                self.stats["payments_found"] += 1
                self.stats["total_amount"] += record.parsed_amount or 0
        
        return records
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         AGGREGATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def aggregate_by_phone(
        self,
        records: List[SmsRecord],
    ) -> Dict[str, float]:
        """
        전화번호별 총 입금액 집계
        """
        totals = {}
        
        for record in records:
            if record.is_payment_notification and record.parsed_amount:
                phone = record.phone
                totals[phone] = totals.get(phone, 0) + record.parsed_amount
        
        return totals
    
    def get_payment_records(
        self,
        records: List[SmsRecord],
    ) -> List[SmsRecord]:
        """결제 알림만 필터링"""
        return [r for r in records if r.is_payment_notification]
    
    def get_stats(self) -> Dict:
        """파싱 통계"""
        return {
            **self.stats,
            "detection_rate": (
                self.stats["payments_found"] / self.stats["total_scanned"] * 100
                if self.stats["total_scanned"] > 0 else 0
            ),
        }


# ═══════════════════════════════════════════════════════════════════════════
#                              ANDROID INTEGRATION
# ═══════════════════════════════════════════════════════════════════════════

# React Native 브릿지용 인터페이스
REACT_NATIVE_BRIDGE = """
// React Native에서 호출
// Android 권한: READ_SMS, RECEIVE_SMS

import { NativeModules } from 'react-native';

const { SmsModule } = NativeModules;

export async function getAllSms(days = 90) {
  const cutoffMs = Date.now() - (days * 24 * 60 * 60 * 1000);
  
  // Android ContentResolver 쿼리
  const smsList = await SmsModule.querySms({
    projection: ['address', 'body', 'date'],
    selection: 'date > ?',
    selectionArgs: [cutoffMs.toString()],
    sortOrder: 'date DESC',
  });
  
  return smsList;
}
"""


# ═══════════════════════════════════════════════════════════════════════════
#                              TEST
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 테스트 SMS 데이터
    test_sms = [
        {
            "phone": "15990000",
            "body": "[국민은행] 입금 500,000원 잔액 1,200,000원",
            "date": datetime.now().timestamp() * 1000,
        },
        {
            "phone": "15990000",
            "body": "[신한카드] 결제승인 300,000원 홍길동님",
            "date": datetime.now().timestamp() * 1000,
        },
        {
            "phone": "15990000",
            "body": "[카카오페이] 입금 100,000원",
            "date": datetime.now().timestamp() * 1000,
        },
        {
            "phone": "15990000",
            "body": "[국민은행] 환불 50,000원",  # 제외 대상
            "date": datetime.now().timestamp() * 1000,
        },
        {
            "phone": "01012345678",
            "body": "안녕하세요. 내일 상담 가능하신가요?",  # 일반 메시지
            "date": datetime.now().timestamp() * 1000,
        },
    ]
    
    # 수집기 생성
    collector = SmsCollector()
    
    # 파싱
    records = collector.parse_batch(test_sms)
    
    print("=" * 60)
    print("AUTUS SMS Collector Test")
    print("=" * 60)
    
    for record in records:
        status = "💰 결제" if record.is_payment_notification else "📨 일반"
        amount = f"₩{record.parsed_amount:,.0f}" if record.parsed_amount else "-"
        print(f"\n{status} | {amount}")
        print(f"  {record.body[:50]}...")
    
    print("\n" + "=" * 60)
    print("Statistics:")
    print(collector.get_stats())
    
    print("\n" + "=" * 60)
    print("Aggregated by Phone:")
    print(collector.aggregate_by_phone(records))










"""
AUTUS Local Agent - SMS Collector
==================================

SMS 결제 알림에서 입금액 파싱

타겟 메시지:
- 은행 입금 알림: "[XX은행] 입금 500,000원"
- 카드 결제 알림: "[XX카드] 결제승인 300,000원"
- 간편결제 알림: "[카카오페이] 입금 100,000원"

Zero-Server-Cost:
- 로컬에서만 파싱
- 서버로 원문 전송 안함
- 금액만 추출하여 M 점수 계산
"""

from typing import List, Optional, Tuple, Dict
from dataclasses import dataclass
from datetime import datetime, timedelta
import re
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.models import SmsRecord


# ═══════════════════════════════════════════════════════════════════════════
#                              PAYMENT PATTERNS
# ═══════════════════════════════════════════════════════════════════════════

# 은행 입금 알림 패턴
BANK_PATTERNS = [
    # [은행명] 입금 금액
    r"\[([가-힣]+은행)\]\s*입금\s*([\d,]+)원",
    r"\[([가-힣]+뱅크)\]\s*입금\s*([\d,]+)원",
    # 은행명 입금 금액원
    r"([가-힣]+은행)\s*입금\s*([\d,]+)원",
    # 입금 금액 은행명
    r"입금\s*([\d,]+)원.*([가-힣]+은행)",
]

# 카드 결제 알림 패턴 (환불/취소 제외)
CARD_PATTERNS = [
    r"\[([가-힣]+카드)\]\s*결제승인\s*([\d,]+)원",
    r"\[([가-힣]+카드)\]\s*승인\s*([\d,]+)원",
    r"([가-힣]+카드)\s*결제\s*([\d,]+)원",
]

# 간편결제 입금 패턴
SIMPLE_PAY_PATTERNS = [
    r"\[카카오페이\]\s*입금\s*([\d,]+)원",
    r"\[네이버페이\]\s*입금\s*([\d,]+)원",
    r"\[토스\]\s*입금\s*([\d,]+)원",
    r"\[페이코\]\s*입금\s*([\d,]+)원",
]

# 제외 패턴 (환불, 취소 등)
EXCLUDE_PATTERNS = [
    r"환불",
    r"취소",
    r"반품",
    r"출금",
    r"이체",
    r"인출",
]


# ═══════════════════════════════════════════════════════════════════════════
#                              SMS COLLECTOR
# ═══════════════════════════════════════════════════════════════════════════

class SmsCollector:
    """
    SMS 결제 알림 수집기
    
    Android ContentResolver로 SMS 읽기 (권한 필요)
    """
    
    def __init__(self):
        # 컴파일된 정규식
        self._bank_patterns = [re.compile(p) for p in BANK_PATTERNS]
        self._card_patterns = [re.compile(p) for p in CARD_PATTERNS]
        self._simple_pay_patterns = [re.compile(p) for p in SIMPLE_PAY_PATTERNS]
        self._exclude_patterns = [re.compile(p) for p in EXCLUDE_PATTERNS]
        
        # 파싱 통계
        self.stats = {
            "total_scanned": 0,
            "payments_found": 0,
            "total_amount": 0.0,
        }
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         PARSING
    # ═══════════════════════════════════════════════════════════════════════
    
    def _extract_amount(self, text: str) -> Tuple[bool, float, str]:
        """
        SMS에서 금액 추출
        
        Returns: (is_payment, amount, source_type)
        """
        # 제외 패턴 체크
        for pattern in self._exclude_patterns:
            if pattern.search(text):
                return False, 0.0, ""
        
        # 은행 입금
        for pattern in self._bank_patterns:
            match = pattern.search(text)
            if match:
                amount_str = match.group(2) if len(match.groups()) >= 2 else match.group(1)
                amount = float(amount_str.replace(",", ""))
                return True, amount, "bank"
        
        # 카드 결제
        for pattern in self._card_patterns:
            match = pattern.search(text)
            if match:
                amount_str = match.group(2)
                amount = float(amount_str.replace(",", ""))
                return True, amount, "card"
        
        # 간편결제
        for pattern in self._simple_pay_patterns:
            match = pattern.search(text)
            if match:
                amount_str = match.group(1)
                amount = float(amount_str.replace(",", ""))
                return True, amount, "simple_pay"
        
        return False, 0.0, ""
    
    def parse_sms(self, phone: str, body: str, timestamp: datetime) -> SmsRecord:
        """단일 SMS 파싱"""
        is_payment, amount, source = self._extract_amount(body)
        
        return SmsRecord(
            phone=phone,
            body=body[:100],  # 앞 100자만 저장 (프라이버시)
            timestamp=timestamp,
            parsed_amount=amount if is_payment else None,
            is_payment_notification=is_payment,
        )
    
    def parse_batch(
        self,
        sms_list: List[Dict],
        lookback_days: int = 90,
    ) -> List[SmsRecord]:
        """
        SMS 배치 파싱
        
        Args:
            sms_list: [{"phone": "...", "body": "...", "date": timestamp}, ...]
            lookback_days: 조회 기간 (일)
        """
        cutoff = datetime.now() - timedelta(days=lookback_days)
        records = []
        
        for sms in sms_list:
            # 타임스탬프 변환
            ts = sms.get("date", 0)
            if isinstance(ts, (int, float)):
                timestamp = datetime.fromtimestamp(ts / 1000)  # 밀리초
            else:
                timestamp = ts
            
            # 기간 필터
            if timestamp < cutoff:
                continue
            
            # 파싱
            record = self.parse_sms(
                phone=sms.get("phone", sms.get("address", "")),
                body=sms.get("body", ""),
                timestamp=timestamp,
            )
            
            records.append(record)
            
            # 통계 업데이트
            self.stats["total_scanned"] += 1
            if record.is_payment_notification:
                self.stats["payments_found"] += 1
                self.stats["total_amount"] += record.parsed_amount or 0
        
        return records
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         AGGREGATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def aggregate_by_phone(
        self,
        records: List[SmsRecord],
    ) -> Dict[str, float]:
        """
        전화번호별 총 입금액 집계
        """
        totals = {}
        
        for record in records:
            if record.is_payment_notification and record.parsed_amount:
                phone = record.phone
                totals[phone] = totals.get(phone, 0) + record.parsed_amount
        
        return totals
    
    def get_payment_records(
        self,
        records: List[SmsRecord],
    ) -> List[SmsRecord]:
        """결제 알림만 필터링"""
        return [r for r in records if r.is_payment_notification]
    
    def get_stats(self) -> Dict:
        """파싱 통계"""
        return {
            **self.stats,
            "detection_rate": (
                self.stats["payments_found"] / self.stats["total_scanned"] * 100
                if self.stats["total_scanned"] > 0 else 0
            ),
        }


# ═══════════════════════════════════════════════════════════════════════════
#                              ANDROID INTEGRATION
# ═══════════════════════════════════════════════════════════════════════════

# React Native 브릿지용 인터페이스
REACT_NATIVE_BRIDGE = """
// React Native에서 호출
// Android 권한: READ_SMS, RECEIVE_SMS

import { NativeModules } from 'react-native';

const { SmsModule } = NativeModules;

export async function getAllSms(days = 90) {
  const cutoffMs = Date.now() - (days * 24 * 60 * 60 * 1000);
  
  // Android ContentResolver 쿼리
  const smsList = await SmsModule.querySms({
    projection: ['address', 'body', 'date'],
    selection: 'date > ?',
    selectionArgs: [cutoffMs.toString()],
    sortOrder: 'date DESC',
  });
  
  return smsList;
}
"""


# ═══════════════════════════════════════════════════════════════════════════
#                              TEST
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 테스트 SMS 데이터
    test_sms = [
        {
            "phone": "15990000",
            "body": "[국민은행] 입금 500,000원 잔액 1,200,000원",
            "date": datetime.now().timestamp() * 1000,
        },
        {
            "phone": "15990000",
            "body": "[신한카드] 결제승인 300,000원 홍길동님",
            "date": datetime.now().timestamp() * 1000,
        },
        {
            "phone": "15990000",
            "body": "[카카오페이] 입금 100,000원",
            "date": datetime.now().timestamp() * 1000,
        },
        {
            "phone": "15990000",
            "body": "[국민은행] 환불 50,000원",  # 제외 대상
            "date": datetime.now().timestamp() * 1000,
        },
        {
            "phone": "01012345678",
            "body": "안녕하세요. 내일 상담 가능하신가요?",  # 일반 메시지
            "date": datetime.now().timestamp() * 1000,
        },
    ]
    
    # 수집기 생성
    collector = SmsCollector()
    
    # 파싱
    records = collector.parse_batch(test_sms)
    
    print("=" * 60)
    print("AUTUS SMS Collector Test")
    print("=" * 60)
    
    for record in records:
        status = "💰 결제" if record.is_payment_notification else "📨 일반"
        amount = f"₩{record.parsed_amount:,.0f}" if record.parsed_amount else "-"
        print(f"\n{status} | {amount}")
        print(f"  {record.body[:50]}...")
    
    print("\n" + "=" * 60)
    print("Statistics:")
    print(collector.get_stats())
    
    print("\n" + "=" * 60)
    print("Aggregated by Phone:")
    print(collector.aggregate_by_phone(records))


























