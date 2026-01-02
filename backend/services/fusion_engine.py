#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Fusion Engine                                     ║
║                          10개 사업장 데이터 통합 용광로                                     ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

핵심 기능:
1. 10개 사업장의 엑셀/API 데이터를 통합
2. 전화번호 기준 Super Node 생성
3. 크로스 사업장 시너지 계산
4. 실시간 고객 프로필 조회

데이터 흐름:
엑셀 업로드 → Sanitizer → Fusion → Customer Profile → BlackBox → Field Instruction
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from pathlib import Path
import json
import sys

# 내부 모듈
sys.path.insert(0, '..')
from utils.sanitizer import DataSanitizer, PhoneSanitizer, CustomerRecord
from models.customer import CustomerProfile, CustomerArchetype
from models.staff import StaffProfile, StaffTier


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 사업장 유형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class BizType:
    """사업장 유형 상수"""
    ACADEMY = "academy"         # 학원
    RESTAURANT = "restaurant"   # 식당
    SPORTS = "sports"           # 스포츠센터
    INTERIOR = "interior"       # 인테리어
    CAFE = "cafe"               # 카페
    
    ALL_TYPES = [ACADEMY, RESTAURANT, SPORTS, INTERIOR, CAFE]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 사업장 데이터 구조
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class BizNodeData:
    """단일 사업장 데이터"""
    biz_id: str
    biz_type: str
    biz_name: str
    raw_records: List[Dict] = field(default_factory=list)
    customer_records: List[CustomerRecord] = field(default_factory=list)
    last_sync: datetime = field(default_factory=datetime.now)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퓨전 엔진
# ═══════════════════════════════════════════════════════════════════════════════════════════

class FusionEngine:
    """
    10개 사업장 데이터 통합 엔진
    
    Usage:
        engine = FusionEngine()
        engine.add_biz_data("academy_1", "academy", "서초영어학원", excel_data)
        engine.add_biz_data("restaurant_1", "restaurant", "서초분식", pos_data)
        engine.fuse_all()
        customer = engine.get_customer("01012345678")
    """
    
    def __init__(self):
        # 사업장 데이터
        self._biz_nodes: Dict[str, BizNodeData] = {}
        
        # 통합 고객 DB (phone → CustomerProfile)
        self._customers: Dict[str, CustomerProfile] = {}
        
        # 직원 DB (staff_id → StaffProfile)
        self._staff: Dict[str, StaffProfile] = {}
        
        # 데이터 세탁기
        self._sanitizer = DataSanitizer()
        
        # 통계
        self._stats = {
            "total_records": 0,
            "unique_customers": 0,
            "multi_biz_customers": 0,
            "last_fusion": None,
        }
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 데이터 입력
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def add_biz_data(
        self, 
        biz_id: str, 
        biz_type: str, 
        biz_name: str, 
        records: List[Dict]
    ) -> int:
        """
        사업장 데이터 추가
        
        Args:
            biz_id: 사업장 고유 ID
            biz_type: 사업 유형 (academy, restaurant, sports 등)
            biz_name: 사업장 이름
            records: 원본 데이터 (엑셀에서 읽은 딕셔너리 리스트)
            
        Returns:
            int: 처리된 레코드 수
        """
        # 데이터 세탁
        sanitized = self._sanitizer.process_batch(records, biz_id)
        
        # 사업장 노드 생성/업데이트
        self._biz_nodes[biz_id] = BizNodeData(
            biz_id=biz_id,
            biz_type=biz_type,
            biz_name=biz_name,
            raw_records=records,
            customer_records=sanitized,
            last_sync=datetime.now()
        )
        
        self._stats["total_records"] += len(records)
        
        return len(sanitized)
    
    def add_staff(self, staff: StaffProfile):
        """직원 추가"""
        self._staff[staff.staff_id] = staff
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 데이터 융합
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def fuse_all(self) -> int:
        """
        전체 데이터 융합
        
        모든 사업장의 데이터를 전화번호 기준으로 통합하여
        Super Node (CustomerProfile) 생성
        
        Returns:
            int: 생성된 고유 고객 수
        """
        # 기존 데이터 초기화
        self._customers.clear()
        
        # 전화번호 → 사업장별 데이터 매핑
        phone_to_records: Dict[str, List[Tuple[str, str, CustomerRecord]]] = {}
        
        for biz_id, node in self._biz_nodes.items():
            for record in node.customer_records:
                phone = record.phone_normalized
                if not phone:
                    continue
                
                if phone not in phone_to_records:
                    phone_to_records[phone] = []
                
                phone_to_records[phone].append((biz_id, node.biz_type, record))
        
        # Super Node 생성
        for phone, records in phone_to_records.items():
            customer = self._create_customer_profile(phone, records)
            self._customers[phone] = customer
        
        # 통계 업데이트
        self._stats["unique_customers"] = len(self._customers)
        self._stats["multi_biz_customers"] = sum(
            1 for c in self._customers.values() if c.is_multi_biz_user
        )
        self._stats["last_fusion"] = datetime.now().isoformat()
        
        return len(self._customers)
    
    def _create_customer_profile(
        self, 
        phone: str, 
        records: List[Tuple[str, str, CustomerRecord]]
    ) -> CustomerProfile:
        """
        여러 사업장 데이터로 CustomerProfile 생성
        
        Args:
            phone: 전화번호
            records: (biz_id, biz_type, CustomerRecord) 튜플 리스트
        """
        # 이름은 첫 번째 레코드에서
        name = records[0][2].name_normalized if records else "Unknown"
        
        profile = CustomerProfile(phone=phone, name=name)
        
        # 사업장별 데이터 집계
        for biz_id, biz_type, record in records:
            raw = record.raw_data or {}
            
            # M (Money) - 결제액/수강료
            money = self._extract_money(raw, biz_type)
            
            # T (Entropy) - 상담/컴플레인 횟수
            entropy = self._extract_entropy(raw, biz_type)
            
            # S (Synergy) - 기본값 (크로스 이용시 자동 가산)
            synergy = 0
            
            profile.add_biz_record(
                biz_type=biz_type,
                money=money,
                entropy=entropy,
                synergy=synergy,
                biz_id=biz_id,
                biz_name=self._biz_nodes[biz_id].biz_name
            )
        
        # 시간 반감기 적용
        profile.apply_time_decay()
        profile.recalculate()
        
        return profile
    
    def _extract_money(self, raw: Dict, biz_type: str) -> float:
        """원본 데이터에서 Money 값 추출"""
        # 다양한 필드명 대응
        money_fields = ["수강료", "monthly_fee", "결제액", "payment", "금액", "amount"]
        
        for field in money_fields:
            if field in raw:
                try:
                    return float(raw[field]) / 10000  # 만원 단위로 정규화
                except (ValueError, TypeError):
                    continue
        
        return 0.0
    
    def _extract_entropy(self, raw: Dict, biz_type: str) -> float:
        """원본 데이터에서 Entropy 값 추출"""
        entropy_fields = ["상담횟수", "consult_count", "complain_count", "컴플레인"]
        
        total = 0.0
        for field in entropy_fields:
            if field in raw:
                try:
                    # 상담 1회 = 5점, 컴플레인 1회 = 15점
                    count = float(raw[field])
                    if "complain" in field.lower() or "컴플레인" in field:
                        total += count * 15
                    else:
                        total += count * 5
                except (ValueError, TypeError):
                    continue
        
        return total
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 조회
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def get_customer(self, phone: str) -> Optional[CustomerProfile]:
        """
        고객 조회
        
        Args:
            phone: 전화번호 (정규화 안 되어도 됨)
            
        Returns:
            CustomerProfile or None
        """
        normalized = PhoneSanitizer.normalize(phone)
        return self._customers.get(normalized)
    
    def search_customers(
        self, 
        name: str = None, 
        archetype: CustomerArchetype = None,
        biz_type: str = None,
        min_value: float = None,
        limit: int = 100
    ) -> List[CustomerProfile]:
        """
        고객 검색
        
        Args:
            name: 이름 (부분 일치)
            archetype: 고객 유형
            biz_type: 이용 중인 사업장 유형
            min_value: 최소 가치 점수
            limit: 최대 결과 수
        """
        results = []
        
        for customer in self._customers.values():
            # 이름 필터
            if name and name not in customer.name:
                continue
            
            # 유형 필터
            if archetype and customer.archetype != archetype:
                continue
            
            # 사업장 필터
            if biz_type and biz_type not in customer.biz_records:
                continue
            
            # 가치 필터
            if min_value and customer._value_score < min_value:
                continue
            
            results.append(customer)
            
            if len(results) >= limit:
                break
        
        return results
    
    def get_staff(self, staff_id: str) -> Optional[StaffProfile]:
        """직원 조회"""
        return self._staff.get(staff_id)
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 분석
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def get_archetype_distribution(self) -> Dict[str, int]:
        """고객 유형 분포"""
        dist = {a.value: 0 for a in CustomerArchetype}
        
        for customer in self._customers.values():
            dist[customer.archetype.value] += 1
        
        return dist
    
    def get_super_patrons(self, limit: int = 10) -> List[CustomerProfile]:
        """
        슈퍼 후원자 찾기
        
        3개 이상 사업장 이용 + PATRON/TYCOON 등급
        """
        super_patrons = [
            c for c in self._customers.values()
            if len(c.biz_records) >= 3 and c.archetype in [
                CustomerArchetype.PATRON, 
                CustomerArchetype.TYCOON
            ]
        ]
        
        return sorted(super_patrons, key=lambda x: -x._value_score)[:limit]
    
    def get_stats(self) -> Dict[str, Any]:
        """통계 조회"""
        return {
            **self._stats,
            "biz_node_count": len(self._biz_nodes),
            "biz_types": list(set(n.biz_type for n in self._biz_nodes.values())),
            "archetype_distribution": self.get_archetype_distribution(),
        }
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def export_customers(self, filepath: str):
        """고객 데이터 JSON 내보내기"""
        data = [c.to_dict() for c in self._customers.values()]
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def clear(self):
        """전체 초기화"""
        self._biz_nodes.clear()
        self._customers.clear()
        self._staff.clear()
        self._stats = {
            "total_records": 0,
            "unique_customers": 0,
            "multi_biz_customers": 0,
            "last_fusion": None,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 싱글톤 인스턴스
# ═══════════════════════════════════════════════════════════════════════════════════════════

_fusion_engine: Optional[FusionEngine] = None

def get_fusion_engine() -> FusionEngine:
    """글로벌 Fusion Engine 인스턴스"""
    global _fusion_engine
    if _fusion_engine is None:
        _fusion_engine = FusionEngine()
    return _fusion_engine


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """퓨전 엔진 데모"""
    print("=" * 70)
    print("  🔥 AUTUS-TRINITY Fusion Engine Demo")
    print("=" * 70)
    
    engine = FusionEngine()
    
    # 테스트 데이터 - 3개 사업장
    academy_data = [
        {"이름": "김후원", "전화번호": "010-1111-2222", "수강료": 500000, "상담횟수": 1},
        {"이름": "이권력", "전화번호": "010-2222-3333", "수강료": 400000, "상담횟수": 5},
        {"이름": "박충성", "전화번호": "010-3333-4444", "수강료": 200000, "상담횟수": 2},
        {"이름": "최주의", "전화번호": "010-4444-5555", "수강료": 100000, "상담횟수": 10},
    ]
    
    restaurant_data = [
        {"name": "김후원", "phone": "01011112222", "payment": 300000, "visits": 20},
        {"name": "이권력", "phone": "010.2222.3333", "payment": 500000, "visits": 30},
        {"name": "정일반", "phone": "010-5555-6666", "payment": 50000, "visits": 3},
    ]
    
    sports_data = [
        {"성명": "김후원", "연락처": "+82-10-1111-2222", "금액": 1200000, "consult_count": 0},
        {"성명": "박충성", "연락처": "01033334444", "금액": 800000, "consult_count": 1},
    ]
    
    # 데이터 로드
    print("\n📂 데이터 로드 중...")
    engine.add_biz_data("academy_1", "academy", "서초영어학원", academy_data)
    engine.add_biz_data("restaurant_1", "restaurant", "서초분식", restaurant_data)
    engine.add_biz_data("sports_1", "sports", "서초헬스장", sports_data)
    
    # 융합
    print("🔥 데이터 융합 중...")
    unique_count = engine.fuse_all()
    
    print(f"\n📊 융합 결과:")
    stats = engine.get_stats()
    print(f"  - 총 레코드: {stats['total_records']}건")
    print(f"  - 고유 고객: {stats['unique_customers']}명")
    print(f"  - 다중 사업장 이용자: {stats['multi_biz_customers']}명")
    
    # 고객 유형 분포
    print(f"\n📈 고객 유형 분포:")
    for archetype, count in stats['archetype_distribution'].items():
        if count > 0:
            emoji = CustomerArchetype(archetype).emoji
            name = CustomerArchetype(archetype).name_kr
            print(f"  {emoji} {name}: {count}명")
    
    # 슈퍼 후원자
    print(f"\n👑 슈퍼 후원자 (3+ 사업장 이용):")
    super_patrons = engine.get_super_patrons()
    if super_patrons:
        for patron in super_patrons:
            biz_list = list(patron.biz_records.keys())
            print(f"  - {patron.name}: {patron.archetype.emoji} | 이용: {biz_list}")
    else:
        print("  (해당 없음)")
    
    # 개별 고객 조회
    print(f"\n🔍 고객 조회 테스트:")
    test_phone = "010-1111-2222"
    customer = engine.get_customer(test_phone)
    if customer:
        print(f"  {customer}")
        print(f"  이용 사업장: {list(customer.biz_records.keys())}")
        print(f"  M={customer.total_m:.0f}, T={customer.total_t:.0f}, S={customer.total_s:.0f}")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Fusion Engine                                     ║
║                          10개 사업장 데이터 통합 용광로                                     ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

핵심 기능:
1. 10개 사업장의 엑셀/API 데이터를 통합
2. 전화번호 기준 Super Node 생성
3. 크로스 사업장 시너지 계산
4. 실시간 고객 프로필 조회

데이터 흐름:
엑셀 업로드 → Sanitizer → Fusion → Customer Profile → BlackBox → Field Instruction
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from pathlib import Path
import json
import sys

# 내부 모듈
sys.path.insert(0, '..')
from utils.sanitizer import DataSanitizer, PhoneSanitizer, CustomerRecord
from models.customer import CustomerProfile, CustomerArchetype
from models.staff import StaffProfile, StaffTier


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 사업장 유형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class BizType:
    """사업장 유형 상수"""
    ACADEMY = "academy"         # 학원
    RESTAURANT = "restaurant"   # 식당
    SPORTS = "sports"           # 스포츠센터
    INTERIOR = "interior"       # 인테리어
    CAFE = "cafe"               # 카페
    
    ALL_TYPES = [ACADEMY, RESTAURANT, SPORTS, INTERIOR, CAFE]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 사업장 데이터 구조
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class BizNodeData:
    """단일 사업장 데이터"""
    biz_id: str
    biz_type: str
    biz_name: str
    raw_records: List[Dict] = field(default_factory=list)
    customer_records: List[CustomerRecord] = field(default_factory=list)
    last_sync: datetime = field(default_factory=datetime.now)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퓨전 엔진
# ═══════════════════════════════════════════════════════════════════════════════════════════

class FusionEngine:
    """
    10개 사업장 데이터 통합 엔진
    
    Usage:
        engine = FusionEngine()
        engine.add_biz_data("academy_1", "academy", "서초영어학원", excel_data)
        engine.add_biz_data("restaurant_1", "restaurant", "서초분식", pos_data)
        engine.fuse_all()
        customer = engine.get_customer("01012345678")
    """
    
    def __init__(self):
        # 사업장 데이터
        self._biz_nodes: Dict[str, BizNodeData] = {}
        
        # 통합 고객 DB (phone → CustomerProfile)
        self._customers: Dict[str, CustomerProfile] = {}
        
        # 직원 DB (staff_id → StaffProfile)
        self._staff: Dict[str, StaffProfile] = {}
        
        # 데이터 세탁기
        self._sanitizer = DataSanitizer()
        
        # 통계
        self._stats = {
            "total_records": 0,
            "unique_customers": 0,
            "multi_biz_customers": 0,
            "last_fusion": None,
        }
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 데이터 입력
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def add_biz_data(
        self, 
        biz_id: str, 
        biz_type: str, 
        biz_name: str, 
        records: List[Dict]
    ) -> int:
        """
        사업장 데이터 추가
        
        Args:
            biz_id: 사업장 고유 ID
            biz_type: 사업 유형 (academy, restaurant, sports 등)
            biz_name: 사업장 이름
            records: 원본 데이터 (엑셀에서 읽은 딕셔너리 리스트)
            
        Returns:
            int: 처리된 레코드 수
        """
        # 데이터 세탁
        sanitized = self._sanitizer.process_batch(records, biz_id)
        
        # 사업장 노드 생성/업데이트
        self._biz_nodes[biz_id] = BizNodeData(
            biz_id=biz_id,
            biz_type=biz_type,
            biz_name=biz_name,
            raw_records=records,
            customer_records=sanitized,
            last_sync=datetime.now()
        )
        
        self._stats["total_records"] += len(records)
        
        return len(sanitized)
    
    def add_staff(self, staff: StaffProfile):
        """직원 추가"""
        self._staff[staff.staff_id] = staff
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 데이터 융합
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def fuse_all(self) -> int:
        """
        전체 데이터 융합
        
        모든 사업장의 데이터를 전화번호 기준으로 통합하여
        Super Node (CustomerProfile) 생성
        
        Returns:
            int: 생성된 고유 고객 수
        """
        # 기존 데이터 초기화
        self._customers.clear()
        
        # 전화번호 → 사업장별 데이터 매핑
        phone_to_records: Dict[str, List[Tuple[str, str, CustomerRecord]]] = {}
        
        for biz_id, node in self._biz_nodes.items():
            for record in node.customer_records:
                phone = record.phone_normalized
                if not phone:
                    continue
                
                if phone not in phone_to_records:
                    phone_to_records[phone] = []
                
                phone_to_records[phone].append((biz_id, node.biz_type, record))
        
        # Super Node 생성
        for phone, records in phone_to_records.items():
            customer = self._create_customer_profile(phone, records)
            self._customers[phone] = customer
        
        # 통계 업데이트
        self._stats["unique_customers"] = len(self._customers)
        self._stats["multi_biz_customers"] = sum(
            1 for c in self._customers.values() if c.is_multi_biz_user
        )
        self._stats["last_fusion"] = datetime.now().isoformat()
        
        return len(self._customers)
    
    def _create_customer_profile(
        self, 
        phone: str, 
        records: List[Tuple[str, str, CustomerRecord]]
    ) -> CustomerProfile:
        """
        여러 사업장 데이터로 CustomerProfile 생성
        
        Args:
            phone: 전화번호
            records: (biz_id, biz_type, CustomerRecord) 튜플 리스트
        """
        # 이름은 첫 번째 레코드에서
        name = records[0][2].name_normalized if records else "Unknown"
        
        profile = CustomerProfile(phone=phone, name=name)
        
        # 사업장별 데이터 집계
        for biz_id, biz_type, record in records:
            raw = record.raw_data or {}
            
            # M (Money) - 결제액/수강료
            money = self._extract_money(raw, biz_type)
            
            # T (Entropy) - 상담/컴플레인 횟수
            entropy = self._extract_entropy(raw, biz_type)
            
            # S (Synergy) - 기본값 (크로스 이용시 자동 가산)
            synergy = 0
            
            profile.add_biz_record(
                biz_type=biz_type,
                money=money,
                entropy=entropy,
                synergy=synergy,
                biz_id=biz_id,
                biz_name=self._biz_nodes[biz_id].biz_name
            )
        
        # 시간 반감기 적용
        profile.apply_time_decay()
        profile.recalculate()
        
        return profile
    
    def _extract_money(self, raw: Dict, biz_type: str) -> float:
        """원본 데이터에서 Money 값 추출"""
        # 다양한 필드명 대응
        money_fields = ["수강료", "monthly_fee", "결제액", "payment", "금액", "amount"]
        
        for field in money_fields:
            if field in raw:
                try:
                    return float(raw[field]) / 10000  # 만원 단위로 정규화
                except (ValueError, TypeError):
                    continue
        
        return 0.0
    
    def _extract_entropy(self, raw: Dict, biz_type: str) -> float:
        """원본 데이터에서 Entropy 값 추출"""
        entropy_fields = ["상담횟수", "consult_count", "complain_count", "컴플레인"]
        
        total = 0.0
        for field in entropy_fields:
            if field in raw:
                try:
                    # 상담 1회 = 5점, 컴플레인 1회 = 15점
                    count = float(raw[field])
                    if "complain" in field.lower() or "컴플레인" in field:
                        total += count * 15
                    else:
                        total += count * 5
                except (ValueError, TypeError):
                    continue
        
        return total
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 조회
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def get_customer(self, phone: str) -> Optional[CustomerProfile]:
        """
        고객 조회
        
        Args:
            phone: 전화번호 (정규화 안 되어도 됨)
            
        Returns:
            CustomerProfile or None
        """
        normalized = PhoneSanitizer.normalize(phone)
        return self._customers.get(normalized)
    
    def search_customers(
        self, 
        name: str = None, 
        archetype: CustomerArchetype = None,
        biz_type: str = None,
        min_value: float = None,
        limit: int = 100
    ) -> List[CustomerProfile]:
        """
        고객 검색
        
        Args:
            name: 이름 (부분 일치)
            archetype: 고객 유형
            biz_type: 이용 중인 사업장 유형
            min_value: 최소 가치 점수
            limit: 최대 결과 수
        """
        results = []
        
        for customer in self._customers.values():
            # 이름 필터
            if name and name not in customer.name:
                continue
            
            # 유형 필터
            if archetype and customer.archetype != archetype:
                continue
            
            # 사업장 필터
            if biz_type and biz_type not in customer.biz_records:
                continue
            
            # 가치 필터
            if min_value and customer._value_score < min_value:
                continue
            
            results.append(customer)
            
            if len(results) >= limit:
                break
        
        return results
    
    def get_staff(self, staff_id: str) -> Optional[StaffProfile]:
        """직원 조회"""
        return self._staff.get(staff_id)
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 분석
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def get_archetype_distribution(self) -> Dict[str, int]:
        """고객 유형 분포"""
        dist = {a.value: 0 for a in CustomerArchetype}
        
        for customer in self._customers.values():
            dist[customer.archetype.value] += 1
        
        return dist
    
    def get_super_patrons(self, limit: int = 10) -> List[CustomerProfile]:
        """
        슈퍼 후원자 찾기
        
        3개 이상 사업장 이용 + PATRON/TYCOON 등급
        """
        super_patrons = [
            c for c in self._customers.values()
            if len(c.biz_records) >= 3 and c.archetype in [
                CustomerArchetype.PATRON, 
                CustomerArchetype.TYCOON
            ]
        ]
        
        return sorted(super_patrons, key=lambda x: -x._value_score)[:limit]
    
    def get_stats(self) -> Dict[str, Any]:
        """통계 조회"""
        return {
            **self._stats,
            "biz_node_count": len(self._biz_nodes),
            "biz_types": list(set(n.biz_type for n in self._biz_nodes.values())),
            "archetype_distribution": self.get_archetype_distribution(),
        }
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def export_customers(self, filepath: str):
        """고객 데이터 JSON 내보내기"""
        data = [c.to_dict() for c in self._customers.values()]
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def clear(self):
        """전체 초기화"""
        self._biz_nodes.clear()
        self._customers.clear()
        self._staff.clear()
        self._stats = {
            "total_records": 0,
            "unique_customers": 0,
            "multi_biz_customers": 0,
            "last_fusion": None,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 싱글톤 인스턴스
# ═══════════════════════════════════════════════════════════════════════════════════════════

_fusion_engine: Optional[FusionEngine] = None

def get_fusion_engine() -> FusionEngine:
    """글로벌 Fusion Engine 인스턴스"""
    global _fusion_engine
    if _fusion_engine is None:
        _fusion_engine = FusionEngine()
    return _fusion_engine


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """퓨전 엔진 데모"""
    print("=" * 70)
    print("  🔥 AUTUS-TRINITY Fusion Engine Demo")
    print("=" * 70)
    
    engine = FusionEngine()
    
    # 테스트 데이터 - 3개 사업장
    academy_data = [
        {"이름": "김후원", "전화번호": "010-1111-2222", "수강료": 500000, "상담횟수": 1},
        {"이름": "이권력", "전화번호": "010-2222-3333", "수강료": 400000, "상담횟수": 5},
        {"이름": "박충성", "전화번호": "010-3333-4444", "수강료": 200000, "상담횟수": 2},
        {"이름": "최주의", "전화번호": "010-4444-5555", "수강료": 100000, "상담횟수": 10},
    ]
    
    restaurant_data = [
        {"name": "김후원", "phone": "01011112222", "payment": 300000, "visits": 20},
        {"name": "이권력", "phone": "010.2222.3333", "payment": 500000, "visits": 30},
        {"name": "정일반", "phone": "010-5555-6666", "payment": 50000, "visits": 3},
    ]
    
    sports_data = [
        {"성명": "김후원", "연락처": "+82-10-1111-2222", "금액": 1200000, "consult_count": 0},
        {"성명": "박충성", "연락처": "01033334444", "금액": 800000, "consult_count": 1},
    ]
    
    # 데이터 로드
    print("\n📂 데이터 로드 중...")
    engine.add_biz_data("academy_1", "academy", "서초영어학원", academy_data)
    engine.add_biz_data("restaurant_1", "restaurant", "서초분식", restaurant_data)
    engine.add_biz_data("sports_1", "sports", "서초헬스장", sports_data)
    
    # 융합
    print("🔥 데이터 융합 중...")
    unique_count = engine.fuse_all()
    
    print(f"\n📊 융합 결과:")
    stats = engine.get_stats()
    print(f"  - 총 레코드: {stats['total_records']}건")
    print(f"  - 고유 고객: {stats['unique_customers']}명")
    print(f"  - 다중 사업장 이용자: {stats['multi_biz_customers']}명")
    
    # 고객 유형 분포
    print(f"\n📈 고객 유형 분포:")
    for archetype, count in stats['archetype_distribution'].items():
        if count > 0:
            emoji = CustomerArchetype(archetype).emoji
            name = CustomerArchetype(archetype).name_kr
            print(f"  {emoji} {name}: {count}명")
    
    # 슈퍼 후원자
    print(f"\n👑 슈퍼 후원자 (3+ 사업장 이용):")
    super_patrons = engine.get_super_patrons()
    if super_patrons:
        for patron in super_patrons:
            biz_list = list(patron.biz_records.keys())
            print(f"  - {patron.name}: {patron.archetype.emoji} | 이용: {biz_list}")
    else:
        print("  (해당 없음)")
    
    # 개별 고객 조회
    print(f"\n🔍 고객 조회 테스트:")
    test_phone = "010-1111-2222"
    customer = engine.get_customer(test_phone)
    if customer:
        print(f"  {customer}")
        print(f"  이용 사업장: {list(customer.biz_records.keys())}")
        print(f"  M={customer.total_m:.0f}, T={customer.total_t:.0f}, S={customer.total_s:.0f}")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Fusion Engine                                     ║
║                          10개 사업장 데이터 통합 용광로                                     ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

핵심 기능:
1. 10개 사업장의 엑셀/API 데이터를 통합
2. 전화번호 기준 Super Node 생성
3. 크로스 사업장 시너지 계산
4. 실시간 고객 프로필 조회

데이터 흐름:
엑셀 업로드 → Sanitizer → Fusion → Customer Profile → BlackBox → Field Instruction
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from pathlib import Path
import json
import sys

# 내부 모듈
sys.path.insert(0, '..')
from utils.sanitizer import DataSanitizer, PhoneSanitizer, CustomerRecord
from models.customer import CustomerProfile, CustomerArchetype
from models.staff import StaffProfile, StaffTier


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 사업장 유형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class BizType:
    """사업장 유형 상수"""
    ACADEMY = "academy"         # 학원
    RESTAURANT = "restaurant"   # 식당
    SPORTS = "sports"           # 스포츠센터
    INTERIOR = "interior"       # 인테리어
    CAFE = "cafe"               # 카페
    
    ALL_TYPES = [ACADEMY, RESTAURANT, SPORTS, INTERIOR, CAFE]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 사업장 데이터 구조
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class BizNodeData:
    """단일 사업장 데이터"""
    biz_id: str
    biz_type: str
    biz_name: str
    raw_records: List[Dict] = field(default_factory=list)
    customer_records: List[CustomerRecord] = field(default_factory=list)
    last_sync: datetime = field(default_factory=datetime.now)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퓨전 엔진
# ═══════════════════════════════════════════════════════════════════════════════════════════

class FusionEngine:
    """
    10개 사업장 데이터 통합 엔진
    
    Usage:
        engine = FusionEngine()
        engine.add_biz_data("academy_1", "academy", "서초영어학원", excel_data)
        engine.add_biz_data("restaurant_1", "restaurant", "서초분식", pos_data)
        engine.fuse_all()
        customer = engine.get_customer("01012345678")
    """
    
    def __init__(self):
        # 사업장 데이터
        self._biz_nodes: Dict[str, BizNodeData] = {}
        
        # 통합 고객 DB (phone → CustomerProfile)
        self._customers: Dict[str, CustomerProfile] = {}
        
        # 직원 DB (staff_id → StaffProfile)
        self._staff: Dict[str, StaffProfile] = {}
        
        # 데이터 세탁기
        self._sanitizer = DataSanitizer()
        
        # 통계
        self._stats = {
            "total_records": 0,
            "unique_customers": 0,
            "multi_biz_customers": 0,
            "last_fusion": None,
        }
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 데이터 입력
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def add_biz_data(
        self, 
        biz_id: str, 
        biz_type: str, 
        biz_name: str, 
        records: List[Dict]
    ) -> int:
        """
        사업장 데이터 추가
        
        Args:
            biz_id: 사업장 고유 ID
            biz_type: 사업 유형 (academy, restaurant, sports 등)
            biz_name: 사업장 이름
            records: 원본 데이터 (엑셀에서 읽은 딕셔너리 리스트)
            
        Returns:
            int: 처리된 레코드 수
        """
        # 데이터 세탁
        sanitized = self._sanitizer.process_batch(records, biz_id)
        
        # 사업장 노드 생성/업데이트
        self._biz_nodes[biz_id] = BizNodeData(
            biz_id=biz_id,
            biz_type=biz_type,
            biz_name=biz_name,
            raw_records=records,
            customer_records=sanitized,
            last_sync=datetime.now()
        )
        
        self._stats["total_records"] += len(records)
        
        return len(sanitized)
    
    def add_staff(self, staff: StaffProfile):
        """직원 추가"""
        self._staff[staff.staff_id] = staff
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 데이터 융합
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def fuse_all(self) -> int:
        """
        전체 데이터 융합
        
        모든 사업장의 데이터를 전화번호 기준으로 통합하여
        Super Node (CustomerProfile) 생성
        
        Returns:
            int: 생성된 고유 고객 수
        """
        # 기존 데이터 초기화
        self._customers.clear()
        
        # 전화번호 → 사업장별 데이터 매핑
        phone_to_records: Dict[str, List[Tuple[str, str, CustomerRecord]]] = {}
        
        for biz_id, node in self._biz_nodes.items():
            for record in node.customer_records:
                phone = record.phone_normalized
                if not phone:
                    continue
                
                if phone not in phone_to_records:
                    phone_to_records[phone] = []
                
                phone_to_records[phone].append((biz_id, node.biz_type, record))
        
        # Super Node 생성
        for phone, records in phone_to_records.items():
            customer = self._create_customer_profile(phone, records)
            self._customers[phone] = customer
        
        # 통계 업데이트
        self._stats["unique_customers"] = len(self._customers)
        self._stats["multi_biz_customers"] = sum(
            1 for c in self._customers.values() if c.is_multi_biz_user
        )
        self._stats["last_fusion"] = datetime.now().isoformat()
        
        return len(self._customers)
    
    def _create_customer_profile(
        self, 
        phone: str, 
        records: List[Tuple[str, str, CustomerRecord]]
    ) -> CustomerProfile:
        """
        여러 사업장 데이터로 CustomerProfile 생성
        
        Args:
            phone: 전화번호
            records: (biz_id, biz_type, CustomerRecord) 튜플 리스트
        """
        # 이름은 첫 번째 레코드에서
        name = records[0][2].name_normalized if records else "Unknown"
        
        profile = CustomerProfile(phone=phone, name=name)
        
        # 사업장별 데이터 집계
        for biz_id, biz_type, record in records:
            raw = record.raw_data or {}
            
            # M (Money) - 결제액/수강료
            money = self._extract_money(raw, biz_type)
            
            # T (Entropy) - 상담/컴플레인 횟수
            entropy = self._extract_entropy(raw, biz_type)
            
            # S (Synergy) - 기본값 (크로스 이용시 자동 가산)
            synergy = 0
            
            profile.add_biz_record(
                biz_type=biz_type,
                money=money,
                entropy=entropy,
                synergy=synergy,
                biz_id=biz_id,
                biz_name=self._biz_nodes[biz_id].biz_name
            )
        
        # 시간 반감기 적용
        profile.apply_time_decay()
        profile.recalculate()
        
        return profile
    
    def _extract_money(self, raw: Dict, biz_type: str) -> float:
        """원본 데이터에서 Money 값 추출"""
        # 다양한 필드명 대응
        money_fields = ["수강료", "monthly_fee", "결제액", "payment", "금액", "amount"]
        
        for field in money_fields:
            if field in raw:
                try:
                    return float(raw[field]) / 10000  # 만원 단위로 정규화
                except (ValueError, TypeError):
                    continue
        
        return 0.0
    
    def _extract_entropy(self, raw: Dict, biz_type: str) -> float:
        """원본 데이터에서 Entropy 값 추출"""
        entropy_fields = ["상담횟수", "consult_count", "complain_count", "컴플레인"]
        
        total = 0.0
        for field in entropy_fields:
            if field in raw:
                try:
                    # 상담 1회 = 5점, 컴플레인 1회 = 15점
                    count = float(raw[field])
                    if "complain" in field.lower() or "컴플레인" in field:
                        total += count * 15
                    else:
                        total += count * 5
                except (ValueError, TypeError):
                    continue
        
        return total
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 조회
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def get_customer(self, phone: str) -> Optional[CustomerProfile]:
        """
        고객 조회
        
        Args:
            phone: 전화번호 (정규화 안 되어도 됨)
            
        Returns:
            CustomerProfile or None
        """
        normalized = PhoneSanitizer.normalize(phone)
        return self._customers.get(normalized)
    
    def search_customers(
        self, 
        name: str = None, 
        archetype: CustomerArchetype = None,
        biz_type: str = None,
        min_value: float = None,
        limit: int = 100
    ) -> List[CustomerProfile]:
        """
        고객 검색
        
        Args:
            name: 이름 (부분 일치)
            archetype: 고객 유형
            biz_type: 이용 중인 사업장 유형
            min_value: 최소 가치 점수
            limit: 최대 결과 수
        """
        results = []
        
        for customer in self._customers.values():
            # 이름 필터
            if name and name not in customer.name:
                continue
            
            # 유형 필터
            if archetype and customer.archetype != archetype:
                continue
            
            # 사업장 필터
            if biz_type and biz_type not in customer.biz_records:
                continue
            
            # 가치 필터
            if min_value and customer._value_score < min_value:
                continue
            
            results.append(customer)
            
            if len(results) >= limit:
                break
        
        return results
    
    def get_staff(self, staff_id: str) -> Optional[StaffProfile]:
        """직원 조회"""
        return self._staff.get(staff_id)
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 분석
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def get_archetype_distribution(self) -> Dict[str, int]:
        """고객 유형 분포"""
        dist = {a.value: 0 for a in CustomerArchetype}
        
        for customer in self._customers.values():
            dist[customer.archetype.value] += 1
        
        return dist
    
    def get_super_patrons(self, limit: int = 10) -> List[CustomerProfile]:
        """
        슈퍼 후원자 찾기
        
        3개 이상 사업장 이용 + PATRON/TYCOON 등급
        """
        super_patrons = [
            c for c in self._customers.values()
            if len(c.biz_records) >= 3 and c.archetype in [
                CustomerArchetype.PATRON, 
                CustomerArchetype.TYCOON
            ]
        ]
        
        return sorted(super_patrons, key=lambda x: -x._value_score)[:limit]
    
    def get_stats(self) -> Dict[str, Any]:
        """통계 조회"""
        return {
            **self._stats,
            "biz_node_count": len(self._biz_nodes),
            "biz_types": list(set(n.biz_type for n in self._biz_nodes.values())),
            "archetype_distribution": self.get_archetype_distribution(),
        }
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def export_customers(self, filepath: str):
        """고객 데이터 JSON 내보내기"""
        data = [c.to_dict() for c in self._customers.values()]
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def clear(self):
        """전체 초기화"""
        self._biz_nodes.clear()
        self._customers.clear()
        self._staff.clear()
        self._stats = {
            "total_records": 0,
            "unique_customers": 0,
            "multi_biz_customers": 0,
            "last_fusion": None,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 싱글톤 인스턴스
# ═══════════════════════════════════════════════════════════════════════════════════════════

_fusion_engine: Optional[FusionEngine] = None

def get_fusion_engine() -> FusionEngine:
    """글로벌 Fusion Engine 인스턴스"""
    global _fusion_engine
    if _fusion_engine is None:
        _fusion_engine = FusionEngine()
    return _fusion_engine


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """퓨전 엔진 데모"""
    print("=" * 70)
    print("  🔥 AUTUS-TRINITY Fusion Engine Demo")
    print("=" * 70)
    
    engine = FusionEngine()
    
    # 테스트 데이터 - 3개 사업장
    academy_data = [
        {"이름": "김후원", "전화번호": "010-1111-2222", "수강료": 500000, "상담횟수": 1},
        {"이름": "이권력", "전화번호": "010-2222-3333", "수강료": 400000, "상담횟수": 5},
        {"이름": "박충성", "전화번호": "010-3333-4444", "수강료": 200000, "상담횟수": 2},
        {"이름": "최주의", "전화번호": "010-4444-5555", "수강료": 100000, "상담횟수": 10},
    ]
    
    restaurant_data = [
        {"name": "김후원", "phone": "01011112222", "payment": 300000, "visits": 20},
        {"name": "이권력", "phone": "010.2222.3333", "payment": 500000, "visits": 30},
        {"name": "정일반", "phone": "010-5555-6666", "payment": 50000, "visits": 3},
    ]
    
    sports_data = [
        {"성명": "김후원", "연락처": "+82-10-1111-2222", "금액": 1200000, "consult_count": 0},
        {"성명": "박충성", "연락처": "01033334444", "금액": 800000, "consult_count": 1},
    ]
    
    # 데이터 로드
    print("\n📂 데이터 로드 중...")
    engine.add_biz_data("academy_1", "academy", "서초영어학원", academy_data)
    engine.add_biz_data("restaurant_1", "restaurant", "서초분식", restaurant_data)
    engine.add_biz_data("sports_1", "sports", "서초헬스장", sports_data)
    
    # 융합
    print("🔥 데이터 융합 중...")
    unique_count = engine.fuse_all()
    
    print(f"\n📊 융합 결과:")
    stats = engine.get_stats()
    print(f"  - 총 레코드: {stats['total_records']}건")
    print(f"  - 고유 고객: {stats['unique_customers']}명")
    print(f"  - 다중 사업장 이용자: {stats['multi_biz_customers']}명")
    
    # 고객 유형 분포
    print(f"\n📈 고객 유형 분포:")
    for archetype, count in stats['archetype_distribution'].items():
        if count > 0:
            emoji = CustomerArchetype(archetype).emoji
            name = CustomerArchetype(archetype).name_kr
            print(f"  {emoji} {name}: {count}명")
    
    # 슈퍼 후원자
    print(f"\n👑 슈퍼 후원자 (3+ 사업장 이용):")
    super_patrons = engine.get_super_patrons()
    if super_patrons:
        for patron in super_patrons:
            biz_list = list(patron.biz_records.keys())
            print(f"  - {patron.name}: {patron.archetype.emoji} | 이용: {biz_list}")
    else:
        print("  (해당 없음)")
    
    # 개별 고객 조회
    print(f"\n🔍 고객 조회 테스트:")
    test_phone = "010-1111-2222"
    customer = engine.get_customer(test_phone)
    if customer:
        print(f"  {customer}")
        print(f"  이용 사업장: {list(customer.biz_records.keys())}")
        print(f"  M={customer.total_m:.0f}, T={customer.total_t:.0f}, S={customer.total_s:.0f}")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Fusion Engine                                     ║
║                          10개 사업장 데이터 통합 용광로                                     ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

핵심 기능:
1. 10개 사업장의 엑셀/API 데이터를 통합
2. 전화번호 기준 Super Node 생성
3. 크로스 사업장 시너지 계산
4. 실시간 고객 프로필 조회

데이터 흐름:
엑셀 업로드 → Sanitizer → Fusion → Customer Profile → BlackBox → Field Instruction
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from pathlib import Path
import json
import sys

# 내부 모듈
sys.path.insert(0, '..')
from utils.sanitizer import DataSanitizer, PhoneSanitizer, CustomerRecord
from models.customer import CustomerProfile, CustomerArchetype
from models.staff import StaffProfile, StaffTier


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 사업장 유형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class BizType:
    """사업장 유형 상수"""
    ACADEMY = "academy"         # 학원
    RESTAURANT = "restaurant"   # 식당
    SPORTS = "sports"           # 스포츠센터
    INTERIOR = "interior"       # 인테리어
    CAFE = "cafe"               # 카페
    
    ALL_TYPES = [ACADEMY, RESTAURANT, SPORTS, INTERIOR, CAFE]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 사업장 데이터 구조
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class BizNodeData:
    """단일 사업장 데이터"""
    biz_id: str
    biz_type: str
    biz_name: str
    raw_records: List[Dict] = field(default_factory=list)
    customer_records: List[CustomerRecord] = field(default_factory=list)
    last_sync: datetime = field(default_factory=datetime.now)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퓨전 엔진
# ═══════════════════════════════════════════════════════════════════════════════════════════

class FusionEngine:
    """
    10개 사업장 데이터 통합 엔진
    
    Usage:
        engine = FusionEngine()
        engine.add_biz_data("academy_1", "academy", "서초영어학원", excel_data)
        engine.add_biz_data("restaurant_1", "restaurant", "서초분식", pos_data)
        engine.fuse_all()
        customer = engine.get_customer("01012345678")
    """
    
    def __init__(self):
        # 사업장 데이터
        self._biz_nodes: Dict[str, BizNodeData] = {}
        
        # 통합 고객 DB (phone → CustomerProfile)
        self._customers: Dict[str, CustomerProfile] = {}
        
        # 직원 DB (staff_id → StaffProfile)
        self._staff: Dict[str, StaffProfile] = {}
        
        # 데이터 세탁기
        self._sanitizer = DataSanitizer()
        
        # 통계
        self._stats = {
            "total_records": 0,
            "unique_customers": 0,
            "multi_biz_customers": 0,
            "last_fusion": None,
        }
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 데이터 입력
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def add_biz_data(
        self, 
        biz_id: str, 
        biz_type: str, 
        biz_name: str, 
        records: List[Dict]
    ) -> int:
        """
        사업장 데이터 추가
        
        Args:
            biz_id: 사업장 고유 ID
            biz_type: 사업 유형 (academy, restaurant, sports 등)
            biz_name: 사업장 이름
            records: 원본 데이터 (엑셀에서 읽은 딕셔너리 리스트)
            
        Returns:
            int: 처리된 레코드 수
        """
        # 데이터 세탁
        sanitized = self._sanitizer.process_batch(records, biz_id)
        
        # 사업장 노드 생성/업데이트
        self._biz_nodes[biz_id] = BizNodeData(
            biz_id=biz_id,
            biz_type=biz_type,
            biz_name=biz_name,
            raw_records=records,
            customer_records=sanitized,
            last_sync=datetime.now()
        )
        
        self._stats["total_records"] += len(records)
        
        return len(sanitized)
    
    def add_staff(self, staff: StaffProfile):
        """직원 추가"""
        self._staff[staff.staff_id] = staff
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 데이터 융합
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def fuse_all(self) -> int:
        """
        전체 데이터 융합
        
        모든 사업장의 데이터를 전화번호 기준으로 통합하여
        Super Node (CustomerProfile) 생성
        
        Returns:
            int: 생성된 고유 고객 수
        """
        # 기존 데이터 초기화
        self._customers.clear()
        
        # 전화번호 → 사업장별 데이터 매핑
        phone_to_records: Dict[str, List[Tuple[str, str, CustomerRecord]]] = {}
        
        for biz_id, node in self._biz_nodes.items():
            for record in node.customer_records:
                phone = record.phone_normalized
                if not phone:
                    continue
                
                if phone not in phone_to_records:
                    phone_to_records[phone] = []
                
                phone_to_records[phone].append((biz_id, node.biz_type, record))
        
        # Super Node 생성
        for phone, records in phone_to_records.items():
            customer = self._create_customer_profile(phone, records)
            self._customers[phone] = customer
        
        # 통계 업데이트
        self._stats["unique_customers"] = len(self._customers)
        self._stats["multi_biz_customers"] = sum(
            1 for c in self._customers.values() if c.is_multi_biz_user
        )
        self._stats["last_fusion"] = datetime.now().isoformat()
        
        return len(self._customers)
    
    def _create_customer_profile(
        self, 
        phone: str, 
        records: List[Tuple[str, str, CustomerRecord]]
    ) -> CustomerProfile:
        """
        여러 사업장 데이터로 CustomerProfile 생성
        
        Args:
            phone: 전화번호
            records: (biz_id, biz_type, CustomerRecord) 튜플 리스트
        """
        # 이름은 첫 번째 레코드에서
        name = records[0][2].name_normalized if records else "Unknown"
        
        profile = CustomerProfile(phone=phone, name=name)
        
        # 사업장별 데이터 집계
        for biz_id, biz_type, record in records:
            raw = record.raw_data or {}
            
            # M (Money) - 결제액/수강료
            money = self._extract_money(raw, biz_type)
            
            # T (Entropy) - 상담/컴플레인 횟수
            entropy = self._extract_entropy(raw, biz_type)
            
            # S (Synergy) - 기본값 (크로스 이용시 자동 가산)
            synergy = 0
            
            profile.add_biz_record(
                biz_type=biz_type,
                money=money,
                entropy=entropy,
                synergy=synergy,
                biz_id=biz_id,
                biz_name=self._biz_nodes[biz_id].biz_name
            )
        
        # 시간 반감기 적용
        profile.apply_time_decay()
        profile.recalculate()
        
        return profile
    
    def _extract_money(self, raw: Dict, biz_type: str) -> float:
        """원본 데이터에서 Money 값 추출"""
        # 다양한 필드명 대응
        money_fields = ["수강료", "monthly_fee", "결제액", "payment", "금액", "amount"]
        
        for field in money_fields:
            if field in raw:
                try:
                    return float(raw[field]) / 10000  # 만원 단위로 정규화
                except (ValueError, TypeError):
                    continue
        
        return 0.0
    
    def _extract_entropy(self, raw: Dict, biz_type: str) -> float:
        """원본 데이터에서 Entropy 값 추출"""
        entropy_fields = ["상담횟수", "consult_count", "complain_count", "컴플레인"]
        
        total = 0.0
        for field in entropy_fields:
            if field in raw:
                try:
                    # 상담 1회 = 5점, 컴플레인 1회 = 15점
                    count = float(raw[field])
                    if "complain" in field.lower() or "컴플레인" in field:
                        total += count * 15
                    else:
                        total += count * 5
                except (ValueError, TypeError):
                    continue
        
        return total
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 조회
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def get_customer(self, phone: str) -> Optional[CustomerProfile]:
        """
        고객 조회
        
        Args:
            phone: 전화번호 (정규화 안 되어도 됨)
            
        Returns:
            CustomerProfile or None
        """
        normalized = PhoneSanitizer.normalize(phone)
        return self._customers.get(normalized)
    
    def search_customers(
        self, 
        name: str = None, 
        archetype: CustomerArchetype = None,
        biz_type: str = None,
        min_value: float = None,
        limit: int = 100
    ) -> List[CustomerProfile]:
        """
        고객 검색
        
        Args:
            name: 이름 (부분 일치)
            archetype: 고객 유형
            biz_type: 이용 중인 사업장 유형
            min_value: 최소 가치 점수
            limit: 최대 결과 수
        """
        results = []
        
        for customer in self._customers.values():
            # 이름 필터
            if name and name not in customer.name:
                continue
            
            # 유형 필터
            if archetype and customer.archetype != archetype:
                continue
            
            # 사업장 필터
            if biz_type and biz_type not in customer.biz_records:
                continue
            
            # 가치 필터
            if min_value and customer._value_score < min_value:
                continue
            
            results.append(customer)
            
            if len(results) >= limit:
                break
        
        return results
    
    def get_staff(self, staff_id: str) -> Optional[StaffProfile]:
        """직원 조회"""
        return self._staff.get(staff_id)
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 분석
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def get_archetype_distribution(self) -> Dict[str, int]:
        """고객 유형 분포"""
        dist = {a.value: 0 for a in CustomerArchetype}
        
        for customer in self._customers.values():
            dist[customer.archetype.value] += 1
        
        return dist
    
    def get_super_patrons(self, limit: int = 10) -> List[CustomerProfile]:
        """
        슈퍼 후원자 찾기
        
        3개 이상 사업장 이용 + PATRON/TYCOON 등급
        """
        super_patrons = [
            c for c in self._customers.values()
            if len(c.biz_records) >= 3 and c.archetype in [
                CustomerArchetype.PATRON, 
                CustomerArchetype.TYCOON
            ]
        ]
        
        return sorted(super_patrons, key=lambda x: -x._value_score)[:limit]
    
    def get_stats(self) -> Dict[str, Any]:
        """통계 조회"""
        return {
            **self._stats,
            "biz_node_count": len(self._biz_nodes),
            "biz_types": list(set(n.biz_type for n in self._biz_nodes.values())),
            "archetype_distribution": self.get_archetype_distribution(),
        }
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def export_customers(self, filepath: str):
        """고객 데이터 JSON 내보내기"""
        data = [c.to_dict() for c in self._customers.values()]
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def clear(self):
        """전체 초기화"""
        self._biz_nodes.clear()
        self._customers.clear()
        self._staff.clear()
        self._stats = {
            "total_records": 0,
            "unique_customers": 0,
            "multi_biz_customers": 0,
            "last_fusion": None,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 싱글톤 인스턴스
# ═══════════════════════════════════════════════════════════════════════════════════════════

_fusion_engine: Optional[FusionEngine] = None

def get_fusion_engine() -> FusionEngine:
    """글로벌 Fusion Engine 인스턴스"""
    global _fusion_engine
    if _fusion_engine is None:
        _fusion_engine = FusionEngine()
    return _fusion_engine


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """퓨전 엔진 데모"""
    print("=" * 70)
    print("  🔥 AUTUS-TRINITY Fusion Engine Demo")
    print("=" * 70)
    
    engine = FusionEngine()
    
    # 테스트 데이터 - 3개 사업장
    academy_data = [
        {"이름": "김후원", "전화번호": "010-1111-2222", "수강료": 500000, "상담횟수": 1},
        {"이름": "이권력", "전화번호": "010-2222-3333", "수강료": 400000, "상담횟수": 5},
        {"이름": "박충성", "전화번호": "010-3333-4444", "수강료": 200000, "상담횟수": 2},
        {"이름": "최주의", "전화번호": "010-4444-5555", "수강료": 100000, "상담횟수": 10},
    ]
    
    restaurant_data = [
        {"name": "김후원", "phone": "01011112222", "payment": 300000, "visits": 20},
        {"name": "이권력", "phone": "010.2222.3333", "payment": 500000, "visits": 30},
        {"name": "정일반", "phone": "010-5555-6666", "payment": 50000, "visits": 3},
    ]
    
    sports_data = [
        {"성명": "김후원", "연락처": "+82-10-1111-2222", "금액": 1200000, "consult_count": 0},
        {"성명": "박충성", "연락처": "01033334444", "금액": 800000, "consult_count": 1},
    ]
    
    # 데이터 로드
    print("\n📂 데이터 로드 중...")
    engine.add_biz_data("academy_1", "academy", "서초영어학원", academy_data)
    engine.add_biz_data("restaurant_1", "restaurant", "서초분식", restaurant_data)
    engine.add_biz_data("sports_1", "sports", "서초헬스장", sports_data)
    
    # 융합
    print("🔥 데이터 융합 중...")
    unique_count = engine.fuse_all()
    
    print(f"\n📊 융합 결과:")
    stats = engine.get_stats()
    print(f"  - 총 레코드: {stats['total_records']}건")
    print(f"  - 고유 고객: {stats['unique_customers']}명")
    print(f"  - 다중 사업장 이용자: {stats['multi_biz_customers']}명")
    
    # 고객 유형 분포
    print(f"\n📈 고객 유형 분포:")
    for archetype, count in stats['archetype_distribution'].items():
        if count > 0:
            emoji = CustomerArchetype(archetype).emoji
            name = CustomerArchetype(archetype).name_kr
            print(f"  {emoji} {name}: {count}명")
    
    # 슈퍼 후원자
    print(f"\n👑 슈퍼 후원자 (3+ 사업장 이용):")
    super_patrons = engine.get_super_patrons()
    if super_patrons:
        for patron in super_patrons:
            biz_list = list(patron.biz_records.keys())
            print(f"  - {patron.name}: {patron.archetype.emoji} | 이용: {biz_list}")
    else:
        print("  (해당 없음)")
    
    # 개별 고객 조회
    print(f"\n🔍 고객 조회 테스트:")
    test_phone = "010-1111-2222"
    customer = engine.get_customer(test_phone)
    if customer:
        print(f"  {customer}")
        print(f"  이용 사업장: {list(customer.biz_records.keys())}")
        print(f"  M={customer.total_m:.0f}, T={customer.total_t:.0f}, S={customer.total_s:.0f}")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Fusion Engine                                     ║
║                          10개 사업장 데이터 통합 용광로                                     ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

핵심 기능:
1. 10개 사업장의 엑셀/API 데이터를 통합
2. 전화번호 기준 Super Node 생성
3. 크로스 사업장 시너지 계산
4. 실시간 고객 프로필 조회

데이터 흐름:
엑셀 업로드 → Sanitizer → Fusion → Customer Profile → BlackBox → Field Instruction
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from pathlib import Path
import json
import sys

# 내부 모듈
sys.path.insert(0, '..')
from utils.sanitizer import DataSanitizer, PhoneSanitizer, CustomerRecord
from models.customer import CustomerProfile, CustomerArchetype
from models.staff import StaffProfile, StaffTier


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 사업장 유형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class BizType:
    """사업장 유형 상수"""
    ACADEMY = "academy"         # 학원
    RESTAURANT = "restaurant"   # 식당
    SPORTS = "sports"           # 스포츠센터
    INTERIOR = "interior"       # 인테리어
    CAFE = "cafe"               # 카페
    
    ALL_TYPES = [ACADEMY, RESTAURANT, SPORTS, INTERIOR, CAFE]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 사업장 데이터 구조
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class BizNodeData:
    """단일 사업장 데이터"""
    biz_id: str
    biz_type: str
    biz_name: str
    raw_records: List[Dict] = field(default_factory=list)
    customer_records: List[CustomerRecord] = field(default_factory=list)
    last_sync: datetime = field(default_factory=datetime.now)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퓨전 엔진
# ═══════════════════════════════════════════════════════════════════════════════════════════

class FusionEngine:
    """
    10개 사업장 데이터 통합 엔진
    
    Usage:
        engine = FusionEngine()
        engine.add_biz_data("academy_1", "academy", "서초영어학원", excel_data)
        engine.add_biz_data("restaurant_1", "restaurant", "서초분식", pos_data)
        engine.fuse_all()
        customer = engine.get_customer("01012345678")
    """
    
    def __init__(self):
        # 사업장 데이터
        self._biz_nodes: Dict[str, BizNodeData] = {}
        
        # 통합 고객 DB (phone → CustomerProfile)
        self._customers: Dict[str, CustomerProfile] = {}
        
        # 직원 DB (staff_id → StaffProfile)
        self._staff: Dict[str, StaffProfile] = {}
        
        # 데이터 세탁기
        self._sanitizer = DataSanitizer()
        
        # 통계
        self._stats = {
            "total_records": 0,
            "unique_customers": 0,
            "multi_biz_customers": 0,
            "last_fusion": None,
        }
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 데이터 입력
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def add_biz_data(
        self, 
        biz_id: str, 
        biz_type: str, 
        biz_name: str, 
        records: List[Dict]
    ) -> int:
        """
        사업장 데이터 추가
        
        Args:
            biz_id: 사업장 고유 ID
            biz_type: 사업 유형 (academy, restaurant, sports 등)
            biz_name: 사업장 이름
            records: 원본 데이터 (엑셀에서 읽은 딕셔너리 리스트)
            
        Returns:
            int: 처리된 레코드 수
        """
        # 데이터 세탁
        sanitized = self._sanitizer.process_batch(records, biz_id)
        
        # 사업장 노드 생성/업데이트
        self._biz_nodes[biz_id] = BizNodeData(
            biz_id=biz_id,
            biz_type=biz_type,
            biz_name=biz_name,
            raw_records=records,
            customer_records=sanitized,
            last_sync=datetime.now()
        )
        
        self._stats["total_records"] += len(records)
        
        return len(sanitized)
    
    def add_staff(self, staff: StaffProfile):
        """직원 추가"""
        self._staff[staff.staff_id] = staff
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 데이터 융합
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def fuse_all(self) -> int:
        """
        전체 데이터 융합
        
        모든 사업장의 데이터를 전화번호 기준으로 통합하여
        Super Node (CustomerProfile) 생성
        
        Returns:
            int: 생성된 고유 고객 수
        """
        # 기존 데이터 초기화
        self._customers.clear()
        
        # 전화번호 → 사업장별 데이터 매핑
        phone_to_records: Dict[str, List[Tuple[str, str, CustomerRecord]]] = {}
        
        for biz_id, node in self._biz_nodes.items():
            for record in node.customer_records:
                phone = record.phone_normalized
                if not phone:
                    continue
                
                if phone not in phone_to_records:
                    phone_to_records[phone] = []
                
                phone_to_records[phone].append((biz_id, node.biz_type, record))
        
        # Super Node 생성
        for phone, records in phone_to_records.items():
            customer = self._create_customer_profile(phone, records)
            self._customers[phone] = customer
        
        # 통계 업데이트
        self._stats["unique_customers"] = len(self._customers)
        self._stats["multi_biz_customers"] = sum(
            1 for c in self._customers.values() if c.is_multi_biz_user
        )
        self._stats["last_fusion"] = datetime.now().isoformat()
        
        return len(self._customers)
    
    def _create_customer_profile(
        self, 
        phone: str, 
        records: List[Tuple[str, str, CustomerRecord]]
    ) -> CustomerProfile:
        """
        여러 사업장 데이터로 CustomerProfile 생성
        
        Args:
            phone: 전화번호
            records: (biz_id, biz_type, CustomerRecord) 튜플 리스트
        """
        # 이름은 첫 번째 레코드에서
        name = records[0][2].name_normalized if records else "Unknown"
        
        profile = CustomerProfile(phone=phone, name=name)
        
        # 사업장별 데이터 집계
        for biz_id, biz_type, record in records:
            raw = record.raw_data or {}
            
            # M (Money) - 결제액/수강료
            money = self._extract_money(raw, biz_type)
            
            # T (Entropy) - 상담/컴플레인 횟수
            entropy = self._extract_entropy(raw, biz_type)
            
            # S (Synergy) - 기본값 (크로스 이용시 자동 가산)
            synergy = 0
            
            profile.add_biz_record(
                biz_type=biz_type,
                money=money,
                entropy=entropy,
                synergy=synergy,
                biz_id=biz_id,
                biz_name=self._biz_nodes[biz_id].biz_name
            )
        
        # 시간 반감기 적용
        profile.apply_time_decay()
        profile.recalculate()
        
        return profile
    
    def _extract_money(self, raw: Dict, biz_type: str) -> float:
        """원본 데이터에서 Money 값 추출"""
        # 다양한 필드명 대응
        money_fields = ["수강료", "monthly_fee", "결제액", "payment", "금액", "amount"]
        
        for field in money_fields:
            if field in raw:
                try:
                    return float(raw[field]) / 10000  # 만원 단위로 정규화
                except (ValueError, TypeError):
                    continue
        
        return 0.0
    
    def _extract_entropy(self, raw: Dict, biz_type: str) -> float:
        """원본 데이터에서 Entropy 값 추출"""
        entropy_fields = ["상담횟수", "consult_count", "complain_count", "컴플레인"]
        
        total = 0.0
        for field in entropy_fields:
            if field in raw:
                try:
                    # 상담 1회 = 5점, 컴플레인 1회 = 15점
                    count = float(raw[field])
                    if "complain" in field.lower() or "컴플레인" in field:
                        total += count * 15
                    else:
                        total += count * 5
                except (ValueError, TypeError):
                    continue
        
        return total
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 조회
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def get_customer(self, phone: str) -> Optional[CustomerProfile]:
        """
        고객 조회
        
        Args:
            phone: 전화번호 (정규화 안 되어도 됨)
            
        Returns:
            CustomerProfile or None
        """
        normalized = PhoneSanitizer.normalize(phone)
        return self._customers.get(normalized)
    
    def search_customers(
        self, 
        name: str = None, 
        archetype: CustomerArchetype = None,
        biz_type: str = None,
        min_value: float = None,
        limit: int = 100
    ) -> List[CustomerProfile]:
        """
        고객 검색
        
        Args:
            name: 이름 (부분 일치)
            archetype: 고객 유형
            biz_type: 이용 중인 사업장 유형
            min_value: 최소 가치 점수
            limit: 최대 결과 수
        """
        results = []
        
        for customer in self._customers.values():
            # 이름 필터
            if name and name not in customer.name:
                continue
            
            # 유형 필터
            if archetype and customer.archetype != archetype:
                continue
            
            # 사업장 필터
            if biz_type and biz_type not in customer.biz_records:
                continue
            
            # 가치 필터
            if min_value and customer._value_score < min_value:
                continue
            
            results.append(customer)
            
            if len(results) >= limit:
                break
        
        return results
    
    def get_staff(self, staff_id: str) -> Optional[StaffProfile]:
        """직원 조회"""
        return self._staff.get(staff_id)
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 분석
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def get_archetype_distribution(self) -> Dict[str, int]:
        """고객 유형 분포"""
        dist = {a.value: 0 for a in CustomerArchetype}
        
        for customer in self._customers.values():
            dist[customer.archetype.value] += 1
        
        return dist
    
    def get_super_patrons(self, limit: int = 10) -> List[CustomerProfile]:
        """
        슈퍼 후원자 찾기
        
        3개 이상 사업장 이용 + PATRON/TYCOON 등급
        """
        super_patrons = [
            c for c in self._customers.values()
            if len(c.biz_records) >= 3 and c.archetype in [
                CustomerArchetype.PATRON, 
                CustomerArchetype.TYCOON
            ]
        ]
        
        return sorted(super_patrons, key=lambda x: -x._value_score)[:limit]
    
    def get_stats(self) -> Dict[str, Any]:
        """통계 조회"""
        return {
            **self._stats,
            "biz_node_count": len(self._biz_nodes),
            "biz_types": list(set(n.biz_type for n in self._biz_nodes.values())),
            "archetype_distribution": self.get_archetype_distribution(),
        }
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def export_customers(self, filepath: str):
        """고객 데이터 JSON 내보내기"""
        data = [c.to_dict() for c in self._customers.values()]
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def clear(self):
        """전체 초기화"""
        self._biz_nodes.clear()
        self._customers.clear()
        self._staff.clear()
        self._stats = {
            "total_records": 0,
            "unique_customers": 0,
            "multi_biz_customers": 0,
            "last_fusion": None,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 싱글톤 인스턴스
# ═══════════════════════════════════════════════════════════════════════════════════════════

_fusion_engine: Optional[FusionEngine] = None

def get_fusion_engine() -> FusionEngine:
    """글로벌 Fusion Engine 인스턴스"""
    global _fusion_engine
    if _fusion_engine is None:
        _fusion_engine = FusionEngine()
    return _fusion_engine


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """퓨전 엔진 데모"""
    print("=" * 70)
    print("  🔥 AUTUS-TRINITY Fusion Engine Demo")
    print("=" * 70)
    
    engine = FusionEngine()
    
    # 테스트 데이터 - 3개 사업장
    academy_data = [
        {"이름": "김후원", "전화번호": "010-1111-2222", "수강료": 500000, "상담횟수": 1},
        {"이름": "이권력", "전화번호": "010-2222-3333", "수강료": 400000, "상담횟수": 5},
        {"이름": "박충성", "전화번호": "010-3333-4444", "수강료": 200000, "상담횟수": 2},
        {"이름": "최주의", "전화번호": "010-4444-5555", "수강료": 100000, "상담횟수": 10},
    ]
    
    restaurant_data = [
        {"name": "김후원", "phone": "01011112222", "payment": 300000, "visits": 20},
        {"name": "이권력", "phone": "010.2222.3333", "payment": 500000, "visits": 30},
        {"name": "정일반", "phone": "010-5555-6666", "payment": 50000, "visits": 3},
    ]
    
    sports_data = [
        {"성명": "김후원", "연락처": "+82-10-1111-2222", "금액": 1200000, "consult_count": 0},
        {"성명": "박충성", "연락처": "01033334444", "금액": 800000, "consult_count": 1},
    ]
    
    # 데이터 로드
    print("\n📂 데이터 로드 중...")
    engine.add_biz_data("academy_1", "academy", "서초영어학원", academy_data)
    engine.add_biz_data("restaurant_1", "restaurant", "서초분식", restaurant_data)
    engine.add_biz_data("sports_1", "sports", "서초헬스장", sports_data)
    
    # 융합
    print("🔥 데이터 융합 중...")
    unique_count = engine.fuse_all()
    
    print(f"\n📊 융합 결과:")
    stats = engine.get_stats()
    print(f"  - 총 레코드: {stats['total_records']}건")
    print(f"  - 고유 고객: {stats['unique_customers']}명")
    print(f"  - 다중 사업장 이용자: {stats['multi_biz_customers']}명")
    
    # 고객 유형 분포
    print(f"\n📈 고객 유형 분포:")
    for archetype, count in stats['archetype_distribution'].items():
        if count > 0:
            emoji = CustomerArchetype(archetype).emoji
            name = CustomerArchetype(archetype).name_kr
            print(f"  {emoji} {name}: {count}명")
    
    # 슈퍼 후원자
    print(f"\n👑 슈퍼 후원자 (3+ 사업장 이용):")
    super_patrons = engine.get_super_patrons()
    if super_patrons:
        for patron in super_patrons:
            biz_list = list(patron.biz_records.keys())
            print(f"  - {patron.name}: {patron.archetype.emoji} | 이용: {biz_list}")
    else:
        print("  (해당 없음)")
    
    # 개별 고객 조회
    print(f"\n🔍 고객 조회 테스트:")
    test_phone = "010-1111-2222"
    customer = engine.get_customer(test_phone)
    if customer:
        print(f"  {customer}")
        print(f"  이용 사업장: {list(customer.biz_records.keys())}")
        print(f"  M={customer.total_m:.0f}, T={customer.total_t:.0f}, S={customer.total_s:.0f}")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()




















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Fusion Engine                                     ║
║                          10개 사업장 데이터 통합 용광로                                     ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

핵심 기능:
1. 10개 사업장의 엑셀/API 데이터를 통합
2. 전화번호 기준 Super Node 생성
3. 크로스 사업장 시너지 계산
4. 실시간 고객 프로필 조회

데이터 흐름:
엑셀 업로드 → Sanitizer → Fusion → Customer Profile → BlackBox → Field Instruction
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from pathlib import Path
import json
import sys

# 내부 모듈
sys.path.insert(0, '..')
from utils.sanitizer import DataSanitizer, PhoneSanitizer, CustomerRecord
from models.customer import CustomerProfile, CustomerArchetype
from models.staff import StaffProfile, StaffTier


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 사업장 유형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class BizType:
    """사업장 유형 상수"""
    ACADEMY = "academy"         # 학원
    RESTAURANT = "restaurant"   # 식당
    SPORTS = "sports"           # 스포츠센터
    INTERIOR = "interior"       # 인테리어
    CAFE = "cafe"               # 카페
    
    ALL_TYPES = [ACADEMY, RESTAURANT, SPORTS, INTERIOR, CAFE]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 사업장 데이터 구조
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class BizNodeData:
    """단일 사업장 데이터"""
    biz_id: str
    biz_type: str
    biz_name: str
    raw_records: List[Dict] = field(default_factory=list)
    customer_records: List[CustomerRecord] = field(default_factory=list)
    last_sync: datetime = field(default_factory=datetime.now)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퓨전 엔진
# ═══════════════════════════════════════════════════════════════════════════════════════════

class FusionEngine:
    """
    10개 사업장 데이터 통합 엔진
    
    Usage:
        engine = FusionEngine()
        engine.add_biz_data("academy_1", "academy", "서초영어학원", excel_data)
        engine.add_biz_data("restaurant_1", "restaurant", "서초분식", pos_data)
        engine.fuse_all()
        customer = engine.get_customer("01012345678")
    """
    
    def __init__(self):
        # 사업장 데이터
        self._biz_nodes: Dict[str, BizNodeData] = {}
        
        # 통합 고객 DB (phone → CustomerProfile)
        self._customers: Dict[str, CustomerProfile] = {}
        
        # 직원 DB (staff_id → StaffProfile)
        self._staff: Dict[str, StaffProfile] = {}
        
        # 데이터 세탁기
        self._sanitizer = DataSanitizer()
        
        # 통계
        self._stats = {
            "total_records": 0,
            "unique_customers": 0,
            "multi_biz_customers": 0,
            "last_fusion": None,
        }
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 데이터 입력
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def add_biz_data(
        self, 
        biz_id: str, 
        biz_type: str, 
        biz_name: str, 
        records: List[Dict]
    ) -> int:
        """
        사업장 데이터 추가
        
        Args:
            biz_id: 사업장 고유 ID
            biz_type: 사업 유형 (academy, restaurant, sports 등)
            biz_name: 사업장 이름
            records: 원본 데이터 (엑셀에서 읽은 딕셔너리 리스트)
            
        Returns:
            int: 처리된 레코드 수
        """
        # 데이터 세탁
        sanitized = self._sanitizer.process_batch(records, biz_id)
        
        # 사업장 노드 생성/업데이트
        self._biz_nodes[biz_id] = BizNodeData(
            biz_id=biz_id,
            biz_type=biz_type,
            biz_name=biz_name,
            raw_records=records,
            customer_records=sanitized,
            last_sync=datetime.now()
        )
        
        self._stats["total_records"] += len(records)
        
        return len(sanitized)
    
    def add_staff(self, staff: StaffProfile):
        """직원 추가"""
        self._staff[staff.staff_id] = staff
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 데이터 융합
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def fuse_all(self) -> int:
        """
        전체 데이터 융합
        
        모든 사업장의 데이터를 전화번호 기준으로 통합하여
        Super Node (CustomerProfile) 생성
        
        Returns:
            int: 생성된 고유 고객 수
        """
        # 기존 데이터 초기화
        self._customers.clear()
        
        # 전화번호 → 사업장별 데이터 매핑
        phone_to_records: Dict[str, List[Tuple[str, str, CustomerRecord]]] = {}
        
        for biz_id, node in self._biz_nodes.items():
            for record in node.customer_records:
                phone = record.phone_normalized
                if not phone:
                    continue
                
                if phone not in phone_to_records:
                    phone_to_records[phone] = []
                
                phone_to_records[phone].append((biz_id, node.biz_type, record))
        
        # Super Node 생성
        for phone, records in phone_to_records.items():
            customer = self._create_customer_profile(phone, records)
            self._customers[phone] = customer
        
        # 통계 업데이트
        self._stats["unique_customers"] = len(self._customers)
        self._stats["multi_biz_customers"] = sum(
            1 for c in self._customers.values() if c.is_multi_biz_user
        )
        self._stats["last_fusion"] = datetime.now().isoformat()
        
        return len(self._customers)
    
    def _create_customer_profile(
        self, 
        phone: str, 
        records: List[Tuple[str, str, CustomerRecord]]
    ) -> CustomerProfile:
        """
        여러 사업장 데이터로 CustomerProfile 생성
        
        Args:
            phone: 전화번호
            records: (biz_id, biz_type, CustomerRecord) 튜플 리스트
        """
        # 이름은 첫 번째 레코드에서
        name = records[0][2].name_normalized if records else "Unknown"
        
        profile = CustomerProfile(phone=phone, name=name)
        
        # 사업장별 데이터 집계
        for biz_id, biz_type, record in records:
            raw = record.raw_data or {}
            
            # M (Money) - 결제액/수강료
            money = self._extract_money(raw, biz_type)
            
            # T (Entropy) - 상담/컴플레인 횟수
            entropy = self._extract_entropy(raw, biz_type)
            
            # S (Synergy) - 기본값 (크로스 이용시 자동 가산)
            synergy = 0
            
            profile.add_biz_record(
                biz_type=biz_type,
                money=money,
                entropy=entropy,
                synergy=synergy,
                biz_id=biz_id,
                biz_name=self._biz_nodes[biz_id].biz_name
            )
        
        # 시간 반감기 적용
        profile.apply_time_decay()
        profile.recalculate()
        
        return profile
    
    def _extract_money(self, raw: Dict, biz_type: str) -> float:
        """원본 데이터에서 Money 값 추출"""
        # 다양한 필드명 대응
        money_fields = ["수강료", "monthly_fee", "결제액", "payment", "금액", "amount"]
        
        for field in money_fields:
            if field in raw:
                try:
                    return float(raw[field]) / 10000  # 만원 단위로 정규화
                except (ValueError, TypeError):
                    continue
        
        return 0.0
    
    def _extract_entropy(self, raw: Dict, biz_type: str) -> float:
        """원본 데이터에서 Entropy 값 추출"""
        entropy_fields = ["상담횟수", "consult_count", "complain_count", "컴플레인"]
        
        total = 0.0
        for field in entropy_fields:
            if field in raw:
                try:
                    # 상담 1회 = 5점, 컴플레인 1회 = 15점
                    count = float(raw[field])
                    if "complain" in field.lower() or "컴플레인" in field:
                        total += count * 15
                    else:
                        total += count * 5
                except (ValueError, TypeError):
                    continue
        
        return total
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 조회
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def get_customer(self, phone: str) -> Optional[CustomerProfile]:
        """
        고객 조회
        
        Args:
            phone: 전화번호 (정규화 안 되어도 됨)
            
        Returns:
            CustomerProfile or None
        """
        normalized = PhoneSanitizer.normalize(phone)
        return self._customers.get(normalized)
    
    def search_customers(
        self, 
        name: str = None, 
        archetype: CustomerArchetype = None,
        biz_type: str = None,
        min_value: float = None,
        limit: int = 100
    ) -> List[CustomerProfile]:
        """
        고객 검색
        
        Args:
            name: 이름 (부분 일치)
            archetype: 고객 유형
            biz_type: 이용 중인 사업장 유형
            min_value: 최소 가치 점수
            limit: 최대 결과 수
        """
        results = []
        
        for customer in self._customers.values():
            # 이름 필터
            if name and name not in customer.name:
                continue
            
            # 유형 필터
            if archetype and customer.archetype != archetype:
                continue
            
            # 사업장 필터
            if biz_type and biz_type not in customer.biz_records:
                continue
            
            # 가치 필터
            if min_value and customer._value_score < min_value:
                continue
            
            results.append(customer)
            
            if len(results) >= limit:
                break
        
        return results
    
    def get_staff(self, staff_id: str) -> Optional[StaffProfile]:
        """직원 조회"""
        return self._staff.get(staff_id)
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 분석
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def get_archetype_distribution(self) -> Dict[str, int]:
        """고객 유형 분포"""
        dist = {a.value: 0 for a in CustomerArchetype}
        
        for customer in self._customers.values():
            dist[customer.archetype.value] += 1
        
        return dist
    
    def get_super_patrons(self, limit: int = 10) -> List[CustomerProfile]:
        """
        슈퍼 후원자 찾기
        
        3개 이상 사업장 이용 + PATRON/TYCOON 등급
        """
        super_patrons = [
            c for c in self._customers.values()
            if len(c.biz_records) >= 3 and c.archetype in [
                CustomerArchetype.PATRON, 
                CustomerArchetype.TYCOON
            ]
        ]
        
        return sorted(super_patrons, key=lambda x: -x._value_score)[:limit]
    
    def get_stats(self) -> Dict[str, Any]:
        """통계 조회"""
        return {
            **self._stats,
            "biz_node_count": len(self._biz_nodes),
            "biz_types": list(set(n.biz_type for n in self._biz_nodes.values())),
            "archetype_distribution": self.get_archetype_distribution(),
        }
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def export_customers(self, filepath: str):
        """고객 데이터 JSON 내보내기"""
        data = [c.to_dict() for c in self._customers.values()]
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def clear(self):
        """전체 초기화"""
        self._biz_nodes.clear()
        self._customers.clear()
        self._staff.clear()
        self._stats = {
            "total_records": 0,
            "unique_customers": 0,
            "multi_biz_customers": 0,
            "last_fusion": None,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 싱글톤 인스턴스
# ═══════════════════════════════════════════════════════════════════════════════════════════

_fusion_engine: Optional[FusionEngine] = None

def get_fusion_engine() -> FusionEngine:
    """글로벌 Fusion Engine 인스턴스"""
    global _fusion_engine
    if _fusion_engine is None:
        _fusion_engine = FusionEngine()
    return _fusion_engine


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """퓨전 엔진 데모"""
    print("=" * 70)
    print("  🔥 AUTUS-TRINITY Fusion Engine Demo")
    print("=" * 70)
    
    engine = FusionEngine()
    
    # 테스트 데이터 - 3개 사업장
    academy_data = [
        {"이름": "김후원", "전화번호": "010-1111-2222", "수강료": 500000, "상담횟수": 1},
        {"이름": "이권력", "전화번호": "010-2222-3333", "수강료": 400000, "상담횟수": 5},
        {"이름": "박충성", "전화번호": "010-3333-4444", "수강료": 200000, "상담횟수": 2},
        {"이름": "최주의", "전화번호": "010-4444-5555", "수강료": 100000, "상담횟수": 10},
    ]
    
    restaurant_data = [
        {"name": "김후원", "phone": "01011112222", "payment": 300000, "visits": 20},
        {"name": "이권력", "phone": "010.2222.3333", "payment": 500000, "visits": 30},
        {"name": "정일반", "phone": "010-5555-6666", "payment": 50000, "visits": 3},
    ]
    
    sports_data = [
        {"성명": "김후원", "연락처": "+82-10-1111-2222", "금액": 1200000, "consult_count": 0},
        {"성명": "박충성", "연락처": "01033334444", "금액": 800000, "consult_count": 1},
    ]
    
    # 데이터 로드
    print("\n📂 데이터 로드 중...")
    engine.add_biz_data("academy_1", "academy", "서초영어학원", academy_data)
    engine.add_biz_data("restaurant_1", "restaurant", "서초분식", restaurant_data)
    engine.add_biz_data("sports_1", "sports", "서초헬스장", sports_data)
    
    # 융합
    print("🔥 데이터 융합 중...")
    unique_count = engine.fuse_all()
    
    print(f"\n📊 융합 결과:")
    stats = engine.get_stats()
    print(f"  - 총 레코드: {stats['total_records']}건")
    print(f"  - 고유 고객: {stats['unique_customers']}명")
    print(f"  - 다중 사업장 이용자: {stats['multi_biz_customers']}명")
    
    # 고객 유형 분포
    print(f"\n📈 고객 유형 분포:")
    for archetype, count in stats['archetype_distribution'].items():
        if count > 0:
            emoji = CustomerArchetype(archetype).emoji
            name = CustomerArchetype(archetype).name_kr
            print(f"  {emoji} {name}: {count}명")
    
    # 슈퍼 후원자
    print(f"\n👑 슈퍼 후원자 (3+ 사업장 이용):")
    super_patrons = engine.get_super_patrons()
    if super_patrons:
        for patron in super_patrons:
            biz_list = list(patron.biz_records.keys())
            print(f"  - {patron.name}: {patron.archetype.emoji} | 이용: {biz_list}")
    else:
        print("  (해당 없음)")
    
    # 개별 고객 조회
    print(f"\n🔍 고객 조회 테스트:")
    test_phone = "010-1111-2222"
    customer = engine.get_customer(test_phone)
    if customer:
        print(f"  {customer}")
        print(f"  이용 사업장: {list(customer.biz_records.keys())}")
        print(f"  M={customer.total_m:.0f}, T={customer.total_t:.0f}, S={customer.total_s:.0f}")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Fusion Engine                                     ║
║                          10개 사업장 데이터 통합 용광로                                     ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

핵심 기능:
1. 10개 사업장의 엑셀/API 데이터를 통합
2. 전화번호 기준 Super Node 생성
3. 크로스 사업장 시너지 계산
4. 실시간 고객 프로필 조회

데이터 흐름:
엑셀 업로드 → Sanitizer → Fusion → Customer Profile → BlackBox → Field Instruction
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from pathlib import Path
import json
import sys

# 내부 모듈
sys.path.insert(0, '..')
from utils.sanitizer import DataSanitizer, PhoneSanitizer, CustomerRecord
from models.customer import CustomerProfile, CustomerArchetype
from models.staff import StaffProfile, StaffTier


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 사업장 유형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class BizType:
    """사업장 유형 상수"""
    ACADEMY = "academy"         # 학원
    RESTAURANT = "restaurant"   # 식당
    SPORTS = "sports"           # 스포츠센터
    INTERIOR = "interior"       # 인테리어
    CAFE = "cafe"               # 카페
    
    ALL_TYPES = [ACADEMY, RESTAURANT, SPORTS, INTERIOR, CAFE]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 사업장 데이터 구조
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class BizNodeData:
    """단일 사업장 데이터"""
    biz_id: str
    biz_type: str
    biz_name: str
    raw_records: List[Dict] = field(default_factory=list)
    customer_records: List[CustomerRecord] = field(default_factory=list)
    last_sync: datetime = field(default_factory=datetime.now)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퓨전 엔진
# ═══════════════════════════════════════════════════════════════════════════════════════════

class FusionEngine:
    """
    10개 사업장 데이터 통합 엔진
    
    Usage:
        engine = FusionEngine()
        engine.add_biz_data("academy_1", "academy", "서초영어학원", excel_data)
        engine.add_biz_data("restaurant_1", "restaurant", "서초분식", pos_data)
        engine.fuse_all()
        customer = engine.get_customer("01012345678")
    """
    
    def __init__(self):
        # 사업장 데이터
        self._biz_nodes: Dict[str, BizNodeData] = {}
        
        # 통합 고객 DB (phone → CustomerProfile)
        self._customers: Dict[str, CustomerProfile] = {}
        
        # 직원 DB (staff_id → StaffProfile)
        self._staff: Dict[str, StaffProfile] = {}
        
        # 데이터 세탁기
        self._sanitizer = DataSanitizer()
        
        # 통계
        self._stats = {
            "total_records": 0,
            "unique_customers": 0,
            "multi_biz_customers": 0,
            "last_fusion": None,
        }
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 데이터 입력
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def add_biz_data(
        self, 
        biz_id: str, 
        biz_type: str, 
        biz_name: str, 
        records: List[Dict]
    ) -> int:
        """
        사업장 데이터 추가
        
        Args:
            biz_id: 사업장 고유 ID
            biz_type: 사업 유형 (academy, restaurant, sports 등)
            biz_name: 사업장 이름
            records: 원본 데이터 (엑셀에서 읽은 딕셔너리 리스트)
            
        Returns:
            int: 처리된 레코드 수
        """
        # 데이터 세탁
        sanitized = self._sanitizer.process_batch(records, biz_id)
        
        # 사업장 노드 생성/업데이트
        self._biz_nodes[biz_id] = BizNodeData(
            biz_id=biz_id,
            biz_type=biz_type,
            biz_name=biz_name,
            raw_records=records,
            customer_records=sanitized,
            last_sync=datetime.now()
        )
        
        self._stats["total_records"] += len(records)
        
        return len(sanitized)
    
    def add_staff(self, staff: StaffProfile):
        """직원 추가"""
        self._staff[staff.staff_id] = staff
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 데이터 융합
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def fuse_all(self) -> int:
        """
        전체 데이터 융합
        
        모든 사업장의 데이터를 전화번호 기준으로 통합하여
        Super Node (CustomerProfile) 생성
        
        Returns:
            int: 생성된 고유 고객 수
        """
        # 기존 데이터 초기화
        self._customers.clear()
        
        # 전화번호 → 사업장별 데이터 매핑
        phone_to_records: Dict[str, List[Tuple[str, str, CustomerRecord]]] = {}
        
        for biz_id, node in self._biz_nodes.items():
            for record in node.customer_records:
                phone = record.phone_normalized
                if not phone:
                    continue
                
                if phone not in phone_to_records:
                    phone_to_records[phone] = []
                
                phone_to_records[phone].append((biz_id, node.biz_type, record))
        
        # Super Node 생성
        for phone, records in phone_to_records.items():
            customer = self._create_customer_profile(phone, records)
            self._customers[phone] = customer
        
        # 통계 업데이트
        self._stats["unique_customers"] = len(self._customers)
        self._stats["multi_biz_customers"] = sum(
            1 for c in self._customers.values() if c.is_multi_biz_user
        )
        self._stats["last_fusion"] = datetime.now().isoformat()
        
        return len(self._customers)
    
    def _create_customer_profile(
        self, 
        phone: str, 
        records: List[Tuple[str, str, CustomerRecord]]
    ) -> CustomerProfile:
        """
        여러 사업장 데이터로 CustomerProfile 생성
        
        Args:
            phone: 전화번호
            records: (biz_id, biz_type, CustomerRecord) 튜플 리스트
        """
        # 이름은 첫 번째 레코드에서
        name = records[0][2].name_normalized if records else "Unknown"
        
        profile = CustomerProfile(phone=phone, name=name)
        
        # 사업장별 데이터 집계
        for biz_id, biz_type, record in records:
            raw = record.raw_data or {}
            
            # M (Money) - 결제액/수강료
            money = self._extract_money(raw, biz_type)
            
            # T (Entropy) - 상담/컴플레인 횟수
            entropy = self._extract_entropy(raw, biz_type)
            
            # S (Synergy) - 기본값 (크로스 이용시 자동 가산)
            synergy = 0
            
            profile.add_biz_record(
                biz_type=biz_type,
                money=money,
                entropy=entropy,
                synergy=synergy,
                biz_id=biz_id,
                biz_name=self._biz_nodes[biz_id].biz_name
            )
        
        # 시간 반감기 적용
        profile.apply_time_decay()
        profile.recalculate()
        
        return profile
    
    def _extract_money(self, raw: Dict, biz_type: str) -> float:
        """원본 데이터에서 Money 값 추출"""
        # 다양한 필드명 대응
        money_fields = ["수강료", "monthly_fee", "결제액", "payment", "금액", "amount"]
        
        for field in money_fields:
            if field in raw:
                try:
                    return float(raw[field]) / 10000  # 만원 단위로 정규화
                except (ValueError, TypeError):
                    continue
        
        return 0.0
    
    def _extract_entropy(self, raw: Dict, biz_type: str) -> float:
        """원본 데이터에서 Entropy 값 추출"""
        entropy_fields = ["상담횟수", "consult_count", "complain_count", "컴플레인"]
        
        total = 0.0
        for field in entropy_fields:
            if field in raw:
                try:
                    # 상담 1회 = 5점, 컴플레인 1회 = 15점
                    count = float(raw[field])
                    if "complain" in field.lower() or "컴플레인" in field:
                        total += count * 15
                    else:
                        total += count * 5
                except (ValueError, TypeError):
                    continue
        
        return total
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 조회
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def get_customer(self, phone: str) -> Optional[CustomerProfile]:
        """
        고객 조회
        
        Args:
            phone: 전화번호 (정규화 안 되어도 됨)
            
        Returns:
            CustomerProfile or None
        """
        normalized = PhoneSanitizer.normalize(phone)
        return self._customers.get(normalized)
    
    def search_customers(
        self, 
        name: str = None, 
        archetype: CustomerArchetype = None,
        biz_type: str = None,
        min_value: float = None,
        limit: int = 100
    ) -> List[CustomerProfile]:
        """
        고객 검색
        
        Args:
            name: 이름 (부분 일치)
            archetype: 고객 유형
            biz_type: 이용 중인 사업장 유형
            min_value: 최소 가치 점수
            limit: 최대 결과 수
        """
        results = []
        
        for customer in self._customers.values():
            # 이름 필터
            if name and name not in customer.name:
                continue
            
            # 유형 필터
            if archetype and customer.archetype != archetype:
                continue
            
            # 사업장 필터
            if biz_type and biz_type not in customer.biz_records:
                continue
            
            # 가치 필터
            if min_value and customer._value_score < min_value:
                continue
            
            results.append(customer)
            
            if len(results) >= limit:
                break
        
        return results
    
    def get_staff(self, staff_id: str) -> Optional[StaffProfile]:
        """직원 조회"""
        return self._staff.get(staff_id)
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 분석
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def get_archetype_distribution(self) -> Dict[str, int]:
        """고객 유형 분포"""
        dist = {a.value: 0 for a in CustomerArchetype}
        
        for customer in self._customers.values():
            dist[customer.archetype.value] += 1
        
        return dist
    
    def get_super_patrons(self, limit: int = 10) -> List[CustomerProfile]:
        """
        슈퍼 후원자 찾기
        
        3개 이상 사업장 이용 + PATRON/TYCOON 등급
        """
        super_patrons = [
            c for c in self._customers.values()
            if len(c.biz_records) >= 3 and c.archetype in [
                CustomerArchetype.PATRON, 
                CustomerArchetype.TYCOON
            ]
        ]
        
        return sorted(super_patrons, key=lambda x: -x._value_score)[:limit]
    
    def get_stats(self) -> Dict[str, Any]:
        """통계 조회"""
        return {
            **self._stats,
            "biz_node_count": len(self._biz_nodes),
            "biz_types": list(set(n.biz_type for n in self._biz_nodes.values())),
            "archetype_distribution": self.get_archetype_distribution(),
        }
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def export_customers(self, filepath: str):
        """고객 데이터 JSON 내보내기"""
        data = [c.to_dict() for c in self._customers.values()]
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def clear(self):
        """전체 초기화"""
        self._biz_nodes.clear()
        self._customers.clear()
        self._staff.clear()
        self._stats = {
            "total_records": 0,
            "unique_customers": 0,
            "multi_biz_customers": 0,
            "last_fusion": None,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 싱글톤 인스턴스
# ═══════════════════════════════════════════════════════════════════════════════════════════

_fusion_engine: Optional[FusionEngine] = None

def get_fusion_engine() -> FusionEngine:
    """글로벌 Fusion Engine 인스턴스"""
    global _fusion_engine
    if _fusion_engine is None:
        _fusion_engine = FusionEngine()
    return _fusion_engine


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """퓨전 엔진 데모"""
    print("=" * 70)
    print("  🔥 AUTUS-TRINITY Fusion Engine Demo")
    print("=" * 70)
    
    engine = FusionEngine()
    
    # 테스트 데이터 - 3개 사업장
    academy_data = [
        {"이름": "김후원", "전화번호": "010-1111-2222", "수강료": 500000, "상담횟수": 1},
        {"이름": "이권력", "전화번호": "010-2222-3333", "수강료": 400000, "상담횟수": 5},
        {"이름": "박충성", "전화번호": "010-3333-4444", "수강료": 200000, "상담횟수": 2},
        {"이름": "최주의", "전화번호": "010-4444-5555", "수강료": 100000, "상담횟수": 10},
    ]
    
    restaurant_data = [
        {"name": "김후원", "phone": "01011112222", "payment": 300000, "visits": 20},
        {"name": "이권력", "phone": "010.2222.3333", "payment": 500000, "visits": 30},
        {"name": "정일반", "phone": "010-5555-6666", "payment": 50000, "visits": 3},
    ]
    
    sports_data = [
        {"성명": "김후원", "연락처": "+82-10-1111-2222", "금액": 1200000, "consult_count": 0},
        {"성명": "박충성", "연락처": "01033334444", "금액": 800000, "consult_count": 1},
    ]
    
    # 데이터 로드
    print("\n📂 데이터 로드 중...")
    engine.add_biz_data("academy_1", "academy", "서초영어학원", academy_data)
    engine.add_biz_data("restaurant_1", "restaurant", "서초분식", restaurant_data)
    engine.add_biz_data("sports_1", "sports", "서초헬스장", sports_data)
    
    # 융합
    print("🔥 데이터 융합 중...")
    unique_count = engine.fuse_all()
    
    print(f"\n📊 융합 결과:")
    stats = engine.get_stats()
    print(f"  - 총 레코드: {stats['total_records']}건")
    print(f"  - 고유 고객: {stats['unique_customers']}명")
    print(f"  - 다중 사업장 이용자: {stats['multi_biz_customers']}명")
    
    # 고객 유형 분포
    print(f"\n📈 고객 유형 분포:")
    for archetype, count in stats['archetype_distribution'].items():
        if count > 0:
            emoji = CustomerArchetype(archetype).emoji
            name = CustomerArchetype(archetype).name_kr
            print(f"  {emoji} {name}: {count}명")
    
    # 슈퍼 후원자
    print(f"\n👑 슈퍼 후원자 (3+ 사업장 이용):")
    super_patrons = engine.get_super_patrons()
    if super_patrons:
        for patron in super_patrons:
            biz_list = list(patron.biz_records.keys())
            print(f"  - {patron.name}: {patron.archetype.emoji} | 이용: {biz_list}")
    else:
        print("  (해당 없음)")
    
    # 개별 고객 조회
    print(f"\n🔍 고객 조회 테스트:")
    test_phone = "010-1111-2222"
    customer = engine.get_customer(test_phone)
    if customer:
        print(f"  {customer}")
        print(f"  이용 사업장: {list(customer.biz_records.keys())}")
        print(f"  M={customer.total_m:.0f}, T={customer.total_t:.0f}, S={customer.total_s:.0f}")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Fusion Engine                                     ║
║                          10개 사업장 데이터 통합 용광로                                     ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

핵심 기능:
1. 10개 사업장의 엑셀/API 데이터를 통합
2. 전화번호 기준 Super Node 생성
3. 크로스 사업장 시너지 계산
4. 실시간 고객 프로필 조회

데이터 흐름:
엑셀 업로드 → Sanitizer → Fusion → Customer Profile → BlackBox → Field Instruction
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from pathlib import Path
import json
import sys

# 내부 모듈
sys.path.insert(0, '..')
from utils.sanitizer import DataSanitizer, PhoneSanitizer, CustomerRecord
from models.customer import CustomerProfile, CustomerArchetype
from models.staff import StaffProfile, StaffTier


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 사업장 유형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class BizType:
    """사업장 유형 상수"""
    ACADEMY = "academy"         # 학원
    RESTAURANT = "restaurant"   # 식당
    SPORTS = "sports"           # 스포츠센터
    INTERIOR = "interior"       # 인테리어
    CAFE = "cafe"               # 카페
    
    ALL_TYPES = [ACADEMY, RESTAURANT, SPORTS, INTERIOR, CAFE]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 사업장 데이터 구조
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class BizNodeData:
    """단일 사업장 데이터"""
    biz_id: str
    biz_type: str
    biz_name: str
    raw_records: List[Dict] = field(default_factory=list)
    customer_records: List[CustomerRecord] = field(default_factory=list)
    last_sync: datetime = field(default_factory=datetime.now)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퓨전 엔진
# ═══════════════════════════════════════════════════════════════════════════════════════════

class FusionEngine:
    """
    10개 사업장 데이터 통합 엔진
    
    Usage:
        engine = FusionEngine()
        engine.add_biz_data("academy_1", "academy", "서초영어학원", excel_data)
        engine.add_biz_data("restaurant_1", "restaurant", "서초분식", pos_data)
        engine.fuse_all()
        customer = engine.get_customer("01012345678")
    """
    
    def __init__(self):
        # 사업장 데이터
        self._biz_nodes: Dict[str, BizNodeData] = {}
        
        # 통합 고객 DB (phone → CustomerProfile)
        self._customers: Dict[str, CustomerProfile] = {}
        
        # 직원 DB (staff_id → StaffProfile)
        self._staff: Dict[str, StaffProfile] = {}
        
        # 데이터 세탁기
        self._sanitizer = DataSanitizer()
        
        # 통계
        self._stats = {
            "total_records": 0,
            "unique_customers": 0,
            "multi_biz_customers": 0,
            "last_fusion": None,
        }
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 데이터 입력
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def add_biz_data(
        self, 
        biz_id: str, 
        biz_type: str, 
        biz_name: str, 
        records: List[Dict]
    ) -> int:
        """
        사업장 데이터 추가
        
        Args:
            biz_id: 사업장 고유 ID
            biz_type: 사업 유형 (academy, restaurant, sports 등)
            biz_name: 사업장 이름
            records: 원본 데이터 (엑셀에서 읽은 딕셔너리 리스트)
            
        Returns:
            int: 처리된 레코드 수
        """
        # 데이터 세탁
        sanitized = self._sanitizer.process_batch(records, biz_id)
        
        # 사업장 노드 생성/업데이트
        self._biz_nodes[biz_id] = BizNodeData(
            biz_id=biz_id,
            biz_type=biz_type,
            biz_name=biz_name,
            raw_records=records,
            customer_records=sanitized,
            last_sync=datetime.now()
        )
        
        self._stats["total_records"] += len(records)
        
        return len(sanitized)
    
    def add_staff(self, staff: StaffProfile):
        """직원 추가"""
        self._staff[staff.staff_id] = staff
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 데이터 융합
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def fuse_all(self) -> int:
        """
        전체 데이터 융합
        
        모든 사업장의 데이터를 전화번호 기준으로 통합하여
        Super Node (CustomerProfile) 생성
        
        Returns:
            int: 생성된 고유 고객 수
        """
        # 기존 데이터 초기화
        self._customers.clear()
        
        # 전화번호 → 사업장별 데이터 매핑
        phone_to_records: Dict[str, List[Tuple[str, str, CustomerRecord]]] = {}
        
        for biz_id, node in self._biz_nodes.items():
            for record in node.customer_records:
                phone = record.phone_normalized
                if not phone:
                    continue
                
                if phone not in phone_to_records:
                    phone_to_records[phone] = []
                
                phone_to_records[phone].append((biz_id, node.biz_type, record))
        
        # Super Node 생성
        for phone, records in phone_to_records.items():
            customer = self._create_customer_profile(phone, records)
            self._customers[phone] = customer
        
        # 통계 업데이트
        self._stats["unique_customers"] = len(self._customers)
        self._stats["multi_biz_customers"] = sum(
            1 for c in self._customers.values() if c.is_multi_biz_user
        )
        self._stats["last_fusion"] = datetime.now().isoformat()
        
        return len(self._customers)
    
    def _create_customer_profile(
        self, 
        phone: str, 
        records: List[Tuple[str, str, CustomerRecord]]
    ) -> CustomerProfile:
        """
        여러 사업장 데이터로 CustomerProfile 생성
        
        Args:
            phone: 전화번호
            records: (biz_id, biz_type, CustomerRecord) 튜플 리스트
        """
        # 이름은 첫 번째 레코드에서
        name = records[0][2].name_normalized if records else "Unknown"
        
        profile = CustomerProfile(phone=phone, name=name)
        
        # 사업장별 데이터 집계
        for biz_id, biz_type, record in records:
            raw = record.raw_data or {}
            
            # M (Money) - 결제액/수강료
            money = self._extract_money(raw, biz_type)
            
            # T (Entropy) - 상담/컴플레인 횟수
            entropy = self._extract_entropy(raw, biz_type)
            
            # S (Synergy) - 기본값 (크로스 이용시 자동 가산)
            synergy = 0
            
            profile.add_biz_record(
                biz_type=biz_type,
                money=money,
                entropy=entropy,
                synergy=synergy,
                biz_id=biz_id,
                biz_name=self._biz_nodes[biz_id].biz_name
            )
        
        # 시간 반감기 적용
        profile.apply_time_decay()
        profile.recalculate()
        
        return profile
    
    def _extract_money(self, raw: Dict, biz_type: str) -> float:
        """원본 데이터에서 Money 값 추출"""
        # 다양한 필드명 대응
        money_fields = ["수강료", "monthly_fee", "결제액", "payment", "금액", "amount"]
        
        for field in money_fields:
            if field in raw:
                try:
                    return float(raw[field]) / 10000  # 만원 단위로 정규화
                except (ValueError, TypeError):
                    continue
        
        return 0.0
    
    def _extract_entropy(self, raw: Dict, biz_type: str) -> float:
        """원본 데이터에서 Entropy 값 추출"""
        entropy_fields = ["상담횟수", "consult_count", "complain_count", "컴플레인"]
        
        total = 0.0
        for field in entropy_fields:
            if field in raw:
                try:
                    # 상담 1회 = 5점, 컴플레인 1회 = 15점
                    count = float(raw[field])
                    if "complain" in field.lower() or "컴플레인" in field:
                        total += count * 15
                    else:
                        total += count * 5
                except (ValueError, TypeError):
                    continue
        
        return total
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 조회
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def get_customer(self, phone: str) -> Optional[CustomerProfile]:
        """
        고객 조회
        
        Args:
            phone: 전화번호 (정규화 안 되어도 됨)
            
        Returns:
            CustomerProfile or None
        """
        normalized = PhoneSanitizer.normalize(phone)
        return self._customers.get(normalized)
    
    def search_customers(
        self, 
        name: str = None, 
        archetype: CustomerArchetype = None,
        biz_type: str = None,
        min_value: float = None,
        limit: int = 100
    ) -> List[CustomerProfile]:
        """
        고객 검색
        
        Args:
            name: 이름 (부분 일치)
            archetype: 고객 유형
            biz_type: 이용 중인 사업장 유형
            min_value: 최소 가치 점수
            limit: 최대 결과 수
        """
        results = []
        
        for customer in self._customers.values():
            # 이름 필터
            if name and name not in customer.name:
                continue
            
            # 유형 필터
            if archetype and customer.archetype != archetype:
                continue
            
            # 사업장 필터
            if biz_type and biz_type not in customer.biz_records:
                continue
            
            # 가치 필터
            if min_value and customer._value_score < min_value:
                continue
            
            results.append(customer)
            
            if len(results) >= limit:
                break
        
        return results
    
    def get_staff(self, staff_id: str) -> Optional[StaffProfile]:
        """직원 조회"""
        return self._staff.get(staff_id)
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 분석
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def get_archetype_distribution(self) -> Dict[str, int]:
        """고객 유형 분포"""
        dist = {a.value: 0 for a in CustomerArchetype}
        
        for customer in self._customers.values():
            dist[customer.archetype.value] += 1
        
        return dist
    
    def get_super_patrons(self, limit: int = 10) -> List[CustomerProfile]:
        """
        슈퍼 후원자 찾기
        
        3개 이상 사업장 이용 + PATRON/TYCOON 등급
        """
        super_patrons = [
            c for c in self._customers.values()
            if len(c.biz_records) >= 3 and c.archetype in [
                CustomerArchetype.PATRON, 
                CustomerArchetype.TYCOON
            ]
        ]
        
        return sorted(super_patrons, key=lambda x: -x._value_score)[:limit]
    
    def get_stats(self) -> Dict[str, Any]:
        """통계 조회"""
        return {
            **self._stats,
            "biz_node_count": len(self._biz_nodes),
            "biz_types": list(set(n.biz_type for n in self._biz_nodes.values())),
            "archetype_distribution": self.get_archetype_distribution(),
        }
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def export_customers(self, filepath: str):
        """고객 데이터 JSON 내보내기"""
        data = [c.to_dict() for c in self._customers.values()]
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def clear(self):
        """전체 초기화"""
        self._biz_nodes.clear()
        self._customers.clear()
        self._staff.clear()
        self._stats = {
            "total_records": 0,
            "unique_customers": 0,
            "multi_biz_customers": 0,
            "last_fusion": None,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 싱글톤 인스턴스
# ═══════════════════════════════════════════════════════════════════════════════════════════

_fusion_engine: Optional[FusionEngine] = None

def get_fusion_engine() -> FusionEngine:
    """글로벌 Fusion Engine 인스턴스"""
    global _fusion_engine
    if _fusion_engine is None:
        _fusion_engine = FusionEngine()
    return _fusion_engine


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """퓨전 엔진 데모"""
    print("=" * 70)
    print("  🔥 AUTUS-TRINITY Fusion Engine Demo")
    print("=" * 70)
    
    engine = FusionEngine()
    
    # 테스트 데이터 - 3개 사업장
    academy_data = [
        {"이름": "김후원", "전화번호": "010-1111-2222", "수강료": 500000, "상담횟수": 1},
        {"이름": "이권력", "전화번호": "010-2222-3333", "수강료": 400000, "상담횟수": 5},
        {"이름": "박충성", "전화번호": "010-3333-4444", "수강료": 200000, "상담횟수": 2},
        {"이름": "최주의", "전화번호": "010-4444-5555", "수강료": 100000, "상담횟수": 10},
    ]
    
    restaurant_data = [
        {"name": "김후원", "phone": "01011112222", "payment": 300000, "visits": 20},
        {"name": "이권력", "phone": "010.2222.3333", "payment": 500000, "visits": 30},
        {"name": "정일반", "phone": "010-5555-6666", "payment": 50000, "visits": 3},
    ]
    
    sports_data = [
        {"성명": "김후원", "연락처": "+82-10-1111-2222", "금액": 1200000, "consult_count": 0},
        {"성명": "박충성", "연락처": "01033334444", "금액": 800000, "consult_count": 1},
    ]
    
    # 데이터 로드
    print("\n📂 데이터 로드 중...")
    engine.add_biz_data("academy_1", "academy", "서초영어학원", academy_data)
    engine.add_biz_data("restaurant_1", "restaurant", "서초분식", restaurant_data)
    engine.add_biz_data("sports_1", "sports", "서초헬스장", sports_data)
    
    # 융합
    print("🔥 데이터 융합 중...")
    unique_count = engine.fuse_all()
    
    print(f"\n📊 융합 결과:")
    stats = engine.get_stats()
    print(f"  - 총 레코드: {stats['total_records']}건")
    print(f"  - 고유 고객: {stats['unique_customers']}명")
    print(f"  - 다중 사업장 이용자: {stats['multi_biz_customers']}명")
    
    # 고객 유형 분포
    print(f"\n📈 고객 유형 분포:")
    for archetype, count in stats['archetype_distribution'].items():
        if count > 0:
            emoji = CustomerArchetype(archetype).emoji
            name = CustomerArchetype(archetype).name_kr
            print(f"  {emoji} {name}: {count}명")
    
    # 슈퍼 후원자
    print(f"\n👑 슈퍼 후원자 (3+ 사업장 이용):")
    super_patrons = engine.get_super_patrons()
    if super_patrons:
        for patron in super_patrons:
            biz_list = list(patron.biz_records.keys())
            print(f"  - {patron.name}: {patron.archetype.emoji} | 이용: {biz_list}")
    else:
        print("  (해당 없음)")
    
    # 개별 고객 조회
    print(f"\n🔍 고객 조회 테스트:")
    test_phone = "010-1111-2222"
    customer = engine.get_customer(test_phone)
    if customer:
        print(f"  {customer}")
        print(f"  이용 사업장: {list(customer.biz_records.keys())}")
        print(f"  M={customer.total_m:.0f}, T={customer.total_t:.0f}, S={customer.total_s:.0f}")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Fusion Engine                                     ║
║                          10개 사업장 데이터 통합 용광로                                     ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

핵심 기능:
1. 10개 사업장의 엑셀/API 데이터를 통합
2. 전화번호 기준 Super Node 생성
3. 크로스 사업장 시너지 계산
4. 실시간 고객 프로필 조회

데이터 흐름:
엑셀 업로드 → Sanitizer → Fusion → Customer Profile → BlackBox → Field Instruction
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from pathlib import Path
import json
import sys

# 내부 모듈
sys.path.insert(0, '..')
from utils.sanitizer import DataSanitizer, PhoneSanitizer, CustomerRecord
from models.customer import CustomerProfile, CustomerArchetype
from models.staff import StaffProfile, StaffTier


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 사업장 유형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class BizType:
    """사업장 유형 상수"""
    ACADEMY = "academy"         # 학원
    RESTAURANT = "restaurant"   # 식당
    SPORTS = "sports"           # 스포츠센터
    INTERIOR = "interior"       # 인테리어
    CAFE = "cafe"               # 카페
    
    ALL_TYPES = [ACADEMY, RESTAURANT, SPORTS, INTERIOR, CAFE]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 사업장 데이터 구조
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class BizNodeData:
    """단일 사업장 데이터"""
    biz_id: str
    biz_type: str
    biz_name: str
    raw_records: List[Dict] = field(default_factory=list)
    customer_records: List[CustomerRecord] = field(default_factory=list)
    last_sync: datetime = field(default_factory=datetime.now)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퓨전 엔진
# ═══════════════════════════════════════════════════════════════════════════════════════════

class FusionEngine:
    """
    10개 사업장 데이터 통합 엔진
    
    Usage:
        engine = FusionEngine()
        engine.add_biz_data("academy_1", "academy", "서초영어학원", excel_data)
        engine.add_biz_data("restaurant_1", "restaurant", "서초분식", pos_data)
        engine.fuse_all()
        customer = engine.get_customer("01012345678")
    """
    
    def __init__(self):
        # 사업장 데이터
        self._biz_nodes: Dict[str, BizNodeData] = {}
        
        # 통합 고객 DB (phone → CustomerProfile)
        self._customers: Dict[str, CustomerProfile] = {}
        
        # 직원 DB (staff_id → StaffProfile)
        self._staff: Dict[str, StaffProfile] = {}
        
        # 데이터 세탁기
        self._sanitizer = DataSanitizer()
        
        # 통계
        self._stats = {
            "total_records": 0,
            "unique_customers": 0,
            "multi_biz_customers": 0,
            "last_fusion": None,
        }
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 데이터 입력
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def add_biz_data(
        self, 
        biz_id: str, 
        biz_type: str, 
        biz_name: str, 
        records: List[Dict]
    ) -> int:
        """
        사업장 데이터 추가
        
        Args:
            biz_id: 사업장 고유 ID
            biz_type: 사업 유형 (academy, restaurant, sports 등)
            biz_name: 사업장 이름
            records: 원본 데이터 (엑셀에서 읽은 딕셔너리 리스트)
            
        Returns:
            int: 처리된 레코드 수
        """
        # 데이터 세탁
        sanitized = self._sanitizer.process_batch(records, biz_id)
        
        # 사업장 노드 생성/업데이트
        self._biz_nodes[biz_id] = BizNodeData(
            biz_id=biz_id,
            biz_type=biz_type,
            biz_name=biz_name,
            raw_records=records,
            customer_records=sanitized,
            last_sync=datetime.now()
        )
        
        self._stats["total_records"] += len(records)
        
        return len(sanitized)
    
    def add_staff(self, staff: StaffProfile):
        """직원 추가"""
        self._staff[staff.staff_id] = staff
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 데이터 융합
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def fuse_all(self) -> int:
        """
        전체 데이터 융합
        
        모든 사업장의 데이터를 전화번호 기준으로 통합하여
        Super Node (CustomerProfile) 생성
        
        Returns:
            int: 생성된 고유 고객 수
        """
        # 기존 데이터 초기화
        self._customers.clear()
        
        # 전화번호 → 사업장별 데이터 매핑
        phone_to_records: Dict[str, List[Tuple[str, str, CustomerRecord]]] = {}
        
        for biz_id, node in self._biz_nodes.items():
            for record in node.customer_records:
                phone = record.phone_normalized
                if not phone:
                    continue
                
                if phone not in phone_to_records:
                    phone_to_records[phone] = []
                
                phone_to_records[phone].append((biz_id, node.biz_type, record))
        
        # Super Node 생성
        for phone, records in phone_to_records.items():
            customer = self._create_customer_profile(phone, records)
            self._customers[phone] = customer
        
        # 통계 업데이트
        self._stats["unique_customers"] = len(self._customers)
        self._stats["multi_biz_customers"] = sum(
            1 for c in self._customers.values() if c.is_multi_biz_user
        )
        self._stats["last_fusion"] = datetime.now().isoformat()
        
        return len(self._customers)
    
    def _create_customer_profile(
        self, 
        phone: str, 
        records: List[Tuple[str, str, CustomerRecord]]
    ) -> CustomerProfile:
        """
        여러 사업장 데이터로 CustomerProfile 생성
        
        Args:
            phone: 전화번호
            records: (biz_id, biz_type, CustomerRecord) 튜플 리스트
        """
        # 이름은 첫 번째 레코드에서
        name = records[0][2].name_normalized if records else "Unknown"
        
        profile = CustomerProfile(phone=phone, name=name)
        
        # 사업장별 데이터 집계
        for biz_id, biz_type, record in records:
            raw = record.raw_data or {}
            
            # M (Money) - 결제액/수강료
            money = self._extract_money(raw, biz_type)
            
            # T (Entropy) - 상담/컴플레인 횟수
            entropy = self._extract_entropy(raw, biz_type)
            
            # S (Synergy) - 기본값 (크로스 이용시 자동 가산)
            synergy = 0
            
            profile.add_biz_record(
                biz_type=biz_type,
                money=money,
                entropy=entropy,
                synergy=synergy,
                biz_id=biz_id,
                biz_name=self._biz_nodes[biz_id].biz_name
            )
        
        # 시간 반감기 적용
        profile.apply_time_decay()
        profile.recalculate()
        
        return profile
    
    def _extract_money(self, raw: Dict, biz_type: str) -> float:
        """원본 데이터에서 Money 값 추출"""
        # 다양한 필드명 대응
        money_fields = ["수강료", "monthly_fee", "결제액", "payment", "금액", "amount"]
        
        for field in money_fields:
            if field in raw:
                try:
                    return float(raw[field]) / 10000  # 만원 단위로 정규화
                except (ValueError, TypeError):
                    continue
        
        return 0.0
    
    def _extract_entropy(self, raw: Dict, biz_type: str) -> float:
        """원본 데이터에서 Entropy 값 추출"""
        entropy_fields = ["상담횟수", "consult_count", "complain_count", "컴플레인"]
        
        total = 0.0
        for field in entropy_fields:
            if field in raw:
                try:
                    # 상담 1회 = 5점, 컴플레인 1회 = 15점
                    count = float(raw[field])
                    if "complain" in field.lower() or "컴플레인" in field:
                        total += count * 15
                    else:
                        total += count * 5
                except (ValueError, TypeError):
                    continue
        
        return total
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 조회
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def get_customer(self, phone: str) -> Optional[CustomerProfile]:
        """
        고객 조회
        
        Args:
            phone: 전화번호 (정규화 안 되어도 됨)
            
        Returns:
            CustomerProfile or None
        """
        normalized = PhoneSanitizer.normalize(phone)
        return self._customers.get(normalized)
    
    def search_customers(
        self, 
        name: str = None, 
        archetype: CustomerArchetype = None,
        biz_type: str = None,
        min_value: float = None,
        limit: int = 100
    ) -> List[CustomerProfile]:
        """
        고객 검색
        
        Args:
            name: 이름 (부분 일치)
            archetype: 고객 유형
            biz_type: 이용 중인 사업장 유형
            min_value: 최소 가치 점수
            limit: 최대 결과 수
        """
        results = []
        
        for customer in self._customers.values():
            # 이름 필터
            if name and name not in customer.name:
                continue
            
            # 유형 필터
            if archetype and customer.archetype != archetype:
                continue
            
            # 사업장 필터
            if biz_type and biz_type not in customer.biz_records:
                continue
            
            # 가치 필터
            if min_value and customer._value_score < min_value:
                continue
            
            results.append(customer)
            
            if len(results) >= limit:
                break
        
        return results
    
    def get_staff(self, staff_id: str) -> Optional[StaffProfile]:
        """직원 조회"""
        return self._staff.get(staff_id)
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 분석
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def get_archetype_distribution(self) -> Dict[str, int]:
        """고객 유형 분포"""
        dist = {a.value: 0 for a in CustomerArchetype}
        
        for customer in self._customers.values():
            dist[customer.archetype.value] += 1
        
        return dist
    
    def get_super_patrons(self, limit: int = 10) -> List[CustomerProfile]:
        """
        슈퍼 후원자 찾기
        
        3개 이상 사업장 이용 + PATRON/TYCOON 등급
        """
        super_patrons = [
            c for c in self._customers.values()
            if len(c.biz_records) >= 3 and c.archetype in [
                CustomerArchetype.PATRON, 
                CustomerArchetype.TYCOON
            ]
        ]
        
        return sorted(super_patrons, key=lambda x: -x._value_score)[:limit]
    
    def get_stats(self) -> Dict[str, Any]:
        """통계 조회"""
        return {
            **self._stats,
            "biz_node_count": len(self._biz_nodes),
            "biz_types": list(set(n.biz_type for n in self._biz_nodes.values())),
            "archetype_distribution": self.get_archetype_distribution(),
        }
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def export_customers(self, filepath: str):
        """고객 데이터 JSON 내보내기"""
        data = [c.to_dict() for c in self._customers.values()]
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def clear(self):
        """전체 초기화"""
        self._biz_nodes.clear()
        self._customers.clear()
        self._staff.clear()
        self._stats = {
            "total_records": 0,
            "unique_customers": 0,
            "multi_biz_customers": 0,
            "last_fusion": None,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 싱글톤 인스턴스
# ═══════════════════════════════════════════════════════════════════════════════════════════

_fusion_engine: Optional[FusionEngine] = None

def get_fusion_engine() -> FusionEngine:
    """글로벌 Fusion Engine 인스턴스"""
    global _fusion_engine
    if _fusion_engine is None:
        _fusion_engine = FusionEngine()
    return _fusion_engine


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """퓨전 엔진 데모"""
    print("=" * 70)
    print("  🔥 AUTUS-TRINITY Fusion Engine Demo")
    print("=" * 70)
    
    engine = FusionEngine()
    
    # 테스트 데이터 - 3개 사업장
    academy_data = [
        {"이름": "김후원", "전화번호": "010-1111-2222", "수강료": 500000, "상담횟수": 1},
        {"이름": "이권력", "전화번호": "010-2222-3333", "수강료": 400000, "상담횟수": 5},
        {"이름": "박충성", "전화번호": "010-3333-4444", "수강료": 200000, "상담횟수": 2},
        {"이름": "최주의", "전화번호": "010-4444-5555", "수강료": 100000, "상담횟수": 10},
    ]
    
    restaurant_data = [
        {"name": "김후원", "phone": "01011112222", "payment": 300000, "visits": 20},
        {"name": "이권력", "phone": "010.2222.3333", "payment": 500000, "visits": 30},
        {"name": "정일반", "phone": "010-5555-6666", "payment": 50000, "visits": 3},
    ]
    
    sports_data = [
        {"성명": "김후원", "연락처": "+82-10-1111-2222", "금액": 1200000, "consult_count": 0},
        {"성명": "박충성", "연락처": "01033334444", "금액": 800000, "consult_count": 1},
    ]
    
    # 데이터 로드
    print("\n📂 데이터 로드 중...")
    engine.add_biz_data("academy_1", "academy", "서초영어학원", academy_data)
    engine.add_biz_data("restaurant_1", "restaurant", "서초분식", restaurant_data)
    engine.add_biz_data("sports_1", "sports", "서초헬스장", sports_data)
    
    # 융합
    print("🔥 데이터 융합 중...")
    unique_count = engine.fuse_all()
    
    print(f"\n📊 융합 결과:")
    stats = engine.get_stats()
    print(f"  - 총 레코드: {stats['total_records']}건")
    print(f"  - 고유 고객: {stats['unique_customers']}명")
    print(f"  - 다중 사업장 이용자: {stats['multi_biz_customers']}명")
    
    # 고객 유형 분포
    print(f"\n📈 고객 유형 분포:")
    for archetype, count in stats['archetype_distribution'].items():
        if count > 0:
            emoji = CustomerArchetype(archetype).emoji
            name = CustomerArchetype(archetype).name_kr
            print(f"  {emoji} {name}: {count}명")
    
    # 슈퍼 후원자
    print(f"\n👑 슈퍼 후원자 (3+ 사업장 이용):")
    super_patrons = engine.get_super_patrons()
    if super_patrons:
        for patron in super_patrons:
            biz_list = list(patron.biz_records.keys())
            print(f"  - {patron.name}: {patron.archetype.emoji} | 이용: {biz_list}")
    else:
        print("  (해당 없음)")
    
    # 개별 고객 조회
    print(f"\n🔍 고객 조회 테스트:")
    test_phone = "010-1111-2222"
    customer = engine.get_customer(test_phone)
    if customer:
        print(f"  {customer}")
        print(f"  이용 사업장: {list(customer.biz_records.keys())}")
        print(f"  M={customer.total_m:.0f}, T={customer.total_t:.0f}, S={customer.total_s:.0f}")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Fusion Engine                                     ║
║                          10개 사업장 데이터 통합 용광로                                     ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

핵심 기능:
1. 10개 사업장의 엑셀/API 데이터를 통합
2. 전화번호 기준 Super Node 생성
3. 크로스 사업장 시너지 계산
4. 실시간 고객 프로필 조회

데이터 흐름:
엑셀 업로드 → Sanitizer → Fusion → Customer Profile → BlackBox → Field Instruction
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from pathlib import Path
import json
import sys

# 내부 모듈
sys.path.insert(0, '..')
from utils.sanitizer import DataSanitizer, PhoneSanitizer, CustomerRecord
from models.customer import CustomerProfile, CustomerArchetype
from models.staff import StaffProfile, StaffTier


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 사업장 유형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class BizType:
    """사업장 유형 상수"""
    ACADEMY = "academy"         # 학원
    RESTAURANT = "restaurant"   # 식당
    SPORTS = "sports"           # 스포츠센터
    INTERIOR = "interior"       # 인테리어
    CAFE = "cafe"               # 카페
    
    ALL_TYPES = [ACADEMY, RESTAURANT, SPORTS, INTERIOR, CAFE]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 사업장 데이터 구조
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class BizNodeData:
    """단일 사업장 데이터"""
    biz_id: str
    biz_type: str
    biz_name: str
    raw_records: List[Dict] = field(default_factory=list)
    customer_records: List[CustomerRecord] = field(default_factory=list)
    last_sync: datetime = field(default_factory=datetime.now)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 퓨전 엔진
# ═══════════════════════════════════════════════════════════════════════════════════════════

class FusionEngine:
    """
    10개 사업장 데이터 통합 엔진
    
    Usage:
        engine = FusionEngine()
        engine.add_biz_data("academy_1", "academy", "서초영어학원", excel_data)
        engine.add_biz_data("restaurant_1", "restaurant", "서초분식", pos_data)
        engine.fuse_all()
        customer = engine.get_customer("01012345678")
    """
    
    def __init__(self):
        # 사업장 데이터
        self._biz_nodes: Dict[str, BizNodeData] = {}
        
        # 통합 고객 DB (phone → CustomerProfile)
        self._customers: Dict[str, CustomerProfile] = {}
        
        # 직원 DB (staff_id → StaffProfile)
        self._staff: Dict[str, StaffProfile] = {}
        
        # 데이터 세탁기
        self._sanitizer = DataSanitizer()
        
        # 통계
        self._stats = {
            "total_records": 0,
            "unique_customers": 0,
            "multi_biz_customers": 0,
            "last_fusion": None,
        }
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 데이터 입력
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def add_biz_data(
        self, 
        biz_id: str, 
        biz_type: str, 
        biz_name: str, 
        records: List[Dict]
    ) -> int:
        """
        사업장 데이터 추가
        
        Args:
            biz_id: 사업장 고유 ID
            biz_type: 사업 유형 (academy, restaurant, sports 등)
            biz_name: 사업장 이름
            records: 원본 데이터 (엑셀에서 읽은 딕셔너리 리스트)
            
        Returns:
            int: 처리된 레코드 수
        """
        # 데이터 세탁
        sanitized = self._sanitizer.process_batch(records, biz_id)
        
        # 사업장 노드 생성/업데이트
        self._biz_nodes[biz_id] = BizNodeData(
            biz_id=biz_id,
            biz_type=biz_type,
            biz_name=biz_name,
            raw_records=records,
            customer_records=sanitized,
            last_sync=datetime.now()
        )
        
        self._stats["total_records"] += len(records)
        
        return len(sanitized)
    
    def add_staff(self, staff: StaffProfile):
        """직원 추가"""
        self._staff[staff.staff_id] = staff
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 데이터 융합
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def fuse_all(self) -> int:
        """
        전체 데이터 융합
        
        모든 사업장의 데이터를 전화번호 기준으로 통합하여
        Super Node (CustomerProfile) 생성
        
        Returns:
            int: 생성된 고유 고객 수
        """
        # 기존 데이터 초기화
        self._customers.clear()
        
        # 전화번호 → 사업장별 데이터 매핑
        phone_to_records: Dict[str, List[Tuple[str, str, CustomerRecord]]] = {}
        
        for biz_id, node in self._biz_nodes.items():
            for record in node.customer_records:
                phone = record.phone_normalized
                if not phone:
                    continue
                
                if phone not in phone_to_records:
                    phone_to_records[phone] = []
                
                phone_to_records[phone].append((biz_id, node.biz_type, record))
        
        # Super Node 생성
        for phone, records in phone_to_records.items():
            customer = self._create_customer_profile(phone, records)
            self._customers[phone] = customer
        
        # 통계 업데이트
        self._stats["unique_customers"] = len(self._customers)
        self._stats["multi_biz_customers"] = sum(
            1 for c in self._customers.values() if c.is_multi_biz_user
        )
        self._stats["last_fusion"] = datetime.now().isoformat()
        
        return len(self._customers)
    
    def _create_customer_profile(
        self, 
        phone: str, 
        records: List[Tuple[str, str, CustomerRecord]]
    ) -> CustomerProfile:
        """
        여러 사업장 데이터로 CustomerProfile 생성
        
        Args:
            phone: 전화번호
            records: (biz_id, biz_type, CustomerRecord) 튜플 리스트
        """
        # 이름은 첫 번째 레코드에서
        name = records[0][2].name_normalized if records else "Unknown"
        
        profile = CustomerProfile(phone=phone, name=name)
        
        # 사업장별 데이터 집계
        for biz_id, biz_type, record in records:
            raw = record.raw_data or {}
            
            # M (Money) - 결제액/수강료
            money = self._extract_money(raw, biz_type)
            
            # T (Entropy) - 상담/컴플레인 횟수
            entropy = self._extract_entropy(raw, biz_type)
            
            # S (Synergy) - 기본값 (크로스 이용시 자동 가산)
            synergy = 0
            
            profile.add_biz_record(
                biz_type=biz_type,
                money=money,
                entropy=entropy,
                synergy=synergy,
                biz_id=biz_id,
                biz_name=self._biz_nodes[biz_id].biz_name
            )
        
        # 시간 반감기 적용
        profile.apply_time_decay()
        profile.recalculate()
        
        return profile
    
    def _extract_money(self, raw: Dict, biz_type: str) -> float:
        """원본 데이터에서 Money 값 추출"""
        # 다양한 필드명 대응
        money_fields = ["수강료", "monthly_fee", "결제액", "payment", "금액", "amount"]
        
        for field in money_fields:
            if field in raw:
                try:
                    return float(raw[field]) / 10000  # 만원 단위로 정규화
                except (ValueError, TypeError):
                    continue
        
        return 0.0
    
    def _extract_entropy(self, raw: Dict, biz_type: str) -> float:
        """원본 데이터에서 Entropy 값 추출"""
        entropy_fields = ["상담횟수", "consult_count", "complain_count", "컴플레인"]
        
        total = 0.0
        for field in entropy_fields:
            if field in raw:
                try:
                    # 상담 1회 = 5점, 컴플레인 1회 = 15점
                    count = float(raw[field])
                    if "complain" in field.lower() or "컴플레인" in field:
                        total += count * 15
                    else:
                        total += count * 5
                except (ValueError, TypeError):
                    continue
        
        return total
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 조회
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def get_customer(self, phone: str) -> Optional[CustomerProfile]:
        """
        고객 조회
        
        Args:
            phone: 전화번호 (정규화 안 되어도 됨)
            
        Returns:
            CustomerProfile or None
        """
        normalized = PhoneSanitizer.normalize(phone)
        return self._customers.get(normalized)
    
    def search_customers(
        self, 
        name: str = None, 
        archetype: CustomerArchetype = None,
        biz_type: str = None,
        min_value: float = None,
        limit: int = 100
    ) -> List[CustomerProfile]:
        """
        고객 검색
        
        Args:
            name: 이름 (부분 일치)
            archetype: 고객 유형
            biz_type: 이용 중인 사업장 유형
            min_value: 최소 가치 점수
            limit: 최대 결과 수
        """
        results = []
        
        for customer in self._customers.values():
            # 이름 필터
            if name and name not in customer.name:
                continue
            
            # 유형 필터
            if archetype and customer.archetype != archetype:
                continue
            
            # 사업장 필터
            if biz_type and biz_type not in customer.biz_records:
                continue
            
            # 가치 필터
            if min_value and customer._value_score < min_value:
                continue
            
            results.append(customer)
            
            if len(results) >= limit:
                break
        
        return results
    
    def get_staff(self, staff_id: str) -> Optional[StaffProfile]:
        """직원 조회"""
        return self._staff.get(staff_id)
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 분석
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def get_archetype_distribution(self) -> Dict[str, int]:
        """고객 유형 분포"""
        dist = {a.value: 0 for a in CustomerArchetype}
        
        for customer in self._customers.values():
            dist[customer.archetype.value] += 1
        
        return dist
    
    def get_super_patrons(self, limit: int = 10) -> List[CustomerProfile]:
        """
        슈퍼 후원자 찾기
        
        3개 이상 사업장 이용 + PATRON/TYCOON 등급
        """
        super_patrons = [
            c for c in self._customers.values()
            if len(c.biz_records) >= 3 and c.archetype in [
                CustomerArchetype.PATRON, 
                CustomerArchetype.TYCOON
            ]
        ]
        
        return sorted(super_patrons, key=lambda x: -x._value_score)[:limit]
    
    def get_stats(self) -> Dict[str, Any]:
        """통계 조회"""
        return {
            **self._stats,
            "biz_node_count": len(self._biz_nodes),
            "biz_types": list(set(n.biz_type for n in self._biz_nodes.values())),
            "archetype_distribution": self.get_archetype_distribution(),
        }
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def export_customers(self, filepath: str):
        """고객 데이터 JSON 내보내기"""
        data = [c.to_dict() for c in self._customers.values()]
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def clear(self):
        """전체 초기화"""
        self._biz_nodes.clear()
        self._customers.clear()
        self._staff.clear()
        self._stats = {
            "total_records": 0,
            "unique_customers": 0,
            "multi_biz_customers": 0,
            "last_fusion": None,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 싱글톤 인스턴스
# ═══════════════════════════════════════════════════════════════════════════════════════════

_fusion_engine: Optional[FusionEngine] = None

def get_fusion_engine() -> FusionEngine:
    """글로벌 Fusion Engine 인스턴스"""
    global _fusion_engine
    if _fusion_engine is None:
        _fusion_engine = FusionEngine()
    return _fusion_engine


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """퓨전 엔진 데모"""
    print("=" * 70)
    print("  🔥 AUTUS-TRINITY Fusion Engine Demo")
    print("=" * 70)
    
    engine = FusionEngine()
    
    # 테스트 데이터 - 3개 사업장
    academy_data = [
        {"이름": "김후원", "전화번호": "010-1111-2222", "수강료": 500000, "상담횟수": 1},
        {"이름": "이권력", "전화번호": "010-2222-3333", "수강료": 400000, "상담횟수": 5},
        {"이름": "박충성", "전화번호": "010-3333-4444", "수강료": 200000, "상담횟수": 2},
        {"이름": "최주의", "전화번호": "010-4444-5555", "수강료": 100000, "상담횟수": 10},
    ]
    
    restaurant_data = [
        {"name": "김후원", "phone": "01011112222", "payment": 300000, "visits": 20},
        {"name": "이권력", "phone": "010.2222.3333", "payment": 500000, "visits": 30},
        {"name": "정일반", "phone": "010-5555-6666", "payment": 50000, "visits": 3},
    ]
    
    sports_data = [
        {"성명": "김후원", "연락처": "+82-10-1111-2222", "금액": 1200000, "consult_count": 0},
        {"성명": "박충성", "연락처": "01033334444", "금액": 800000, "consult_count": 1},
    ]
    
    # 데이터 로드
    print("\n📂 데이터 로드 중...")
    engine.add_biz_data("academy_1", "academy", "서초영어학원", academy_data)
    engine.add_biz_data("restaurant_1", "restaurant", "서초분식", restaurant_data)
    engine.add_biz_data("sports_1", "sports", "서초헬스장", sports_data)
    
    # 융합
    print("🔥 데이터 융합 중...")
    unique_count = engine.fuse_all()
    
    print(f"\n📊 융합 결과:")
    stats = engine.get_stats()
    print(f"  - 총 레코드: {stats['total_records']}건")
    print(f"  - 고유 고객: {stats['unique_customers']}명")
    print(f"  - 다중 사업장 이용자: {stats['multi_biz_customers']}명")
    
    # 고객 유형 분포
    print(f"\n📈 고객 유형 분포:")
    for archetype, count in stats['archetype_distribution'].items():
        if count > 0:
            emoji = CustomerArchetype(archetype).emoji
            name = CustomerArchetype(archetype).name_kr
            print(f"  {emoji} {name}: {count}명")
    
    # 슈퍼 후원자
    print(f"\n👑 슈퍼 후원자 (3+ 사업장 이용):")
    super_patrons = engine.get_super_patrons()
    if super_patrons:
        for patron in super_patrons:
            biz_list = list(patron.biz_records.keys())
            print(f"  - {patron.name}: {patron.archetype.emoji} | 이용: {biz_list}")
    else:
        print("  (해당 없음)")
    
    # 개별 고객 조회
    print(f"\n🔍 고객 조회 테스트:")
    test_phone = "010-1111-2222"
    customer = engine.get_customer(test_phone)
    if customer:
        print(f"  {customer}")
        print(f"  이용 사업장: {list(customer.biz_records.keys())}")
        print(f"  M={customer.total_m:.0f}, T={customer.total_t:.0f}, S={customer.total_s:.0f}")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()

























