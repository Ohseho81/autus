#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Data Sanitizer                                    ║
║                          데이터 세탁기 - 10개 매장 데이터 정규화                            ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

기능:
1. 전화번호 정규화 (010-1234-5678 → 01012345678)
2. 이름 정제 (김철수(학부모) → 김철수)
3. 중복 제거 (Fuzzy Matching)
4. 국가번호 처리 (82-10-xxx → 010xxx)

입력: 10개 매장의 더러운 엑셀 데이터
출력: 단일 고유 ID로 통합된 깨끗한 데이터
"""

import re
from typing import Optional, List, Dict, Tuple
from dataclasses import dataclass
from difflib import SequenceMatcher


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 전화번호 정규화
# ═══════════════════════════════════════════════════════════════════════════════════════════

class PhoneSanitizer:
    """
    전화번호 정규화 엔진
    
    지원 형식:
    - 010-1234-5678
    - 010.1234.5678
    - 010 1234 5678
    - 01012345678
    - +82-10-1234-5678
    - 82-10-1234-5678
    - 821012345678
    """
    
    # 한국 휴대폰 번호 패턴
    MOBILE_PREFIXES = ['010', '011', '016', '017', '018', '019']
    
    @classmethod
    def normalize(cls, raw_phone: str) -> str:
        """
        어떤 형태의 전화번호든 '01012345678' 형식으로 통일
        
        Args:
            raw_phone: 원본 전화번호 문자열
            
        Returns:
            str: 정규화된 11자리 전화번호 (실패 시 빈 문자열)
        """
        if not raw_phone:
            return ""
        
        # 1. 숫자만 추출
        digits = re.sub(r'[^0-9]', '', str(raw_phone))
        
        if not digits:
            return ""
        
        # 2. 국가번호(82) 처리
        if digits.startswith('820'):
            # 82010... → 010...
            digits = digits[2:]
        elif digits.startswith('82') and len(digits) >= 12:
            # 8210... → 010...
            digits = '0' + digits[2:]
        
        # 3. 앞자리 '0' 누락 보정
        if digits.startswith('10') and len(digits) == 10:
            digits = '0' + digits
        
        # 4. 길이 검증 (휴대폰: 11자리, 유선: 9~10자리)
        if len(digits) == 11 and digits[:3] in cls.MOBILE_PREFIXES:
            return digits
        elif len(digits) in [9, 10] and digits.startswith('0'):
            # 유선전화 (02-xxx-xxxx 등)
            return digits
        
        # 5. 복구 불가능한 경우
        return ""
    
    @classmethod
    def format_display(cls, phone: str) -> str:
        """
        표시용 포맷팅 (010-1234-5678)
        """
        normalized = cls.normalize(phone)
        if len(normalized) == 11:
            return f"{normalized[:3]}-{normalized[3:7]}-{normalized[7:]}"
        elif len(normalized) == 10:
            return f"{normalized[:3]}-{normalized[3:6]}-{normalized[6:]}"
        elif len(normalized) == 9:
            return f"{normalized[:2]}-{normalized[2:5]}-{normalized[5:]}"
        return phone
    
    @classmethod
    def is_valid(cls, phone: str) -> bool:
        """유효한 전화번호인지 확인"""
        normalized = cls.normalize(phone)
        return len(normalized) >= 9


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 이름 정제
# ═══════════════════════════════════════════════════════════════════════════════════════════

class NameSanitizer:
    """
    이름 정규화 엔진
    
    처리 대상:
    - 김철수(학부모) → 김철수
    - 이영희 mom → 이영희
    - 박 진수 → 박진수
    - Mr. Kim → Kim
    """
    
    # 제거할 접미사 패턴
    SUFFIX_PATTERNS = [
        r'\s*(학부모|엄마|아빠|부모|보호자|mom|dad|parent)\s*',
        r'\s*(님|씨|선생|원장|대표|사장)\s*',
        r'\([^)]*\)',  # 괄호 안의 모든 내용
        r'\[[^\]]*\]',  # 대괄호 안의 모든 내용
    ]
    
    # 제거할 접두사
    PREFIX_PATTERNS = [
        r'^(Mr\.?|Ms\.?|Mrs\.?)\s*',
        r'^(학생|원생|회원)\s*',
    ]
    
    @classmethod
    def normalize(cls, raw_name: str) -> str:
        """
        이름 정규화
        
        Args:
            raw_name: 원본 이름 문자열
            
        Returns:
            str: 정제된 이름
        """
        if not raw_name:
            return ""
        
        name = str(raw_name).strip()
        
        # 1. 접미사 제거
        for pattern in cls.SUFFIX_PATTERNS:
            name = re.sub(pattern, '', name, flags=re.IGNORECASE)
        
        # 2. 접두사 제거
        for pattern in cls.PREFIX_PATTERNS:
            name = re.sub(pattern, '', name, flags=re.IGNORECASE)
        
        # 3. 불필요한 공백 제거
        name = re.sub(r'\s+', '', name)
        
        # 4. 특수문자 제거 (한글, 영문, 숫자만 유지)
        name = re.sub(r'[^\w가-힣]', '', name)
        
        return name.strip()
    
    @classmethod
    def extract_family_name(cls, name: str) -> str:
        """성씨 추출 (동명이인 비교용)"""
        normalized = cls.normalize(name)
        if normalized and len(normalized) >= 1:
            # 한글 이름: 첫 글자가 성
            if re.match(r'^[가-힣]', normalized):
                return normalized[0]
            # 영문 이름: 전체 반환 (성/이름 구분 어려움)
            return normalized
        return ""


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 중복 매칭 (Fuzzy Matching)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class CustomerRecord:
    """고객 레코드"""
    phone: str
    name: str
    source: str  # 출처 (academy, restaurant, sports 등)
    raw_data: Dict = None
    
    def __post_init__(self):
        self.phone_normalized = PhoneSanitizer.normalize(self.phone)
        self.name_normalized = NameSanitizer.normalize(self.name)
        if self.raw_data is None:
            self.raw_data = {}


class DuplicateMatcher:
    """
    중복 고객 매칭 엔진
    
    전략:
    1. 전화번호 완전 일치 → 동일 인물 확정
    2. 전화번호 없음 + 이름 유사도 90% 이상 → 후보군
    3. 전화번호 1자리 차이 + 이름 동일 → 오타로 추정
    """
    
    SIMILARITY_THRESHOLD = 0.85  # 이름 유사도 기준
    
    @classmethod
    def calculate_similarity(cls, str1: str, str2: str) -> float:
        """두 문자열의 유사도 계산 (0.0 ~ 1.0)"""
        if not str1 or not str2:
            return 0.0
        return SequenceMatcher(None, str1.lower(), str2.lower()).ratio()
    
    @classmethod
    def is_phone_typo(cls, phone1: str, phone2: str) -> bool:
        """
        전화번호 오타 여부 확인 (1자리 차이)
        """
        if len(phone1) != len(phone2):
            return False
        
        diff_count = sum(1 for a, b in zip(phone1, phone2) if a != b)
        return diff_count == 1
    
    @classmethod
    def find_duplicates(
        cls, 
        records: List[CustomerRecord]
    ) -> List[List[CustomerRecord]]:
        """
        중복 레코드 그룹 찾기
        
        Returns:
            List[List[CustomerRecord]]: 같은 사람으로 추정되는 레코드 그룹 목록
        """
        # 전화번호 기준 그룹핑
        phone_groups: Dict[str, List[CustomerRecord]] = {}
        no_phone_records: List[CustomerRecord] = []
        
        for record in records:
            if record.phone_normalized:
                if record.phone_normalized not in phone_groups:
                    phone_groups[record.phone_normalized] = []
                phone_groups[record.phone_normalized].append(record)
            else:
                no_phone_records.append(record)
        
        # 결과 그룹
        duplicate_groups = []
        
        # 1. 전화번호 동일 그룹 (2개 이상)
        for phone, group in phone_groups.items():
            if len(group) >= 2:
                duplicate_groups.append(group)
        
        # 2. 전화번호 없는 레코드 중 이름 유사도 기반 매칭
        matched_indices = set()
        for i, rec1 in enumerate(no_phone_records):
            if i in matched_indices:
                continue
            
            similar_group = [rec1]
            for j, rec2 in enumerate(no_phone_records[i+1:], start=i+1):
                if j in matched_indices:
                    continue
                
                similarity = cls.calculate_similarity(
                    rec1.name_normalized, 
                    rec2.name_normalized
                )
                if similarity >= cls.SIMILARITY_THRESHOLD:
                    similar_group.append(rec2)
                    matched_indices.add(j)
            
            if len(similar_group) >= 2:
                duplicate_groups.append(similar_group)
                matched_indices.add(i)
        
        return duplicate_groups
    
    @classmethod
    def merge_records(cls, records: List[CustomerRecord]) -> CustomerRecord:
        """
        여러 레코드를 하나로 병합
        
        전략:
        - 전화번호: 가장 먼저 나온 유효한 번호
        - 이름: 가장 긴 이름 (정보 손실 최소화)
        - 출처: 모두 기록
        """
        if not records:
            return None
        
        # 유효한 전화번호 찾기
        phone = ""
        for rec in records:
            if rec.phone_normalized:
                phone = rec.phone_normalized
                break
        
        # 가장 긴 이름
        name = max(records, key=lambda r: len(r.name_normalized)).name_normalized
        
        # 출처 합치기
        sources = list(set(rec.source for rec in records))
        
        # raw_data 병합
        merged_data = {}
        for rec in records:
            merged_data.update(rec.raw_data or {})
        merged_data['_sources'] = sources
        merged_data['_merged_count'] = len(records)
        
        return CustomerRecord(
            phone=phone,
            name=name,
            source=','.join(sources),
            raw_data=merged_data
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 통합 세탁기
# ═══════════════════════════════════════════════════════════════════════════════════════════

class DataSanitizer:
    """
    10개 매장 데이터 통합 세탁기
    
    Usage:
        sanitizer = DataSanitizer()
        clean_data = sanitizer.process_all(raw_records)
    """
    
    def __init__(self):
        self.phone_sanitizer = PhoneSanitizer()
        self.name_sanitizer = NameSanitizer()
        self.duplicate_matcher = DuplicateMatcher()
        
        # 처리 통계
        self.stats = {
            "total_input": 0,
            "total_output": 0,
            "duplicates_merged": 0,
            "invalid_phones": 0,
            "sources": set()
        }
    
    def sanitize_record(self, raw: Dict, source: str) -> CustomerRecord:
        """단일 레코드 정제"""
        phone = raw.get('phone', raw.get('전화번호', raw.get('연락처', '')))
        name = raw.get('name', raw.get('이름', raw.get('성명', '')))
        
        return CustomerRecord(
            phone=PhoneSanitizer.normalize(phone),
            name=NameSanitizer.normalize(name),
            source=source,
            raw_data=raw
        )
    
    def process_batch(
        self, 
        records: List[Dict], 
        source: str
    ) -> List[CustomerRecord]:
        """배치 처리"""
        self.stats["sources"].add(source)
        self.stats["total_input"] += len(records)
        
        sanitized = []
        for raw in records:
            record = self.sanitize_record(raw, source)
            
            # 유효성 검사
            if not record.phone_normalized and not record.name_normalized:
                continue  # 둘 다 없으면 스킵
            
            if record.phone and not record.phone_normalized:
                self.stats["invalid_phones"] += 1
            
            sanitized.append(record)
        
        return sanitized
    
    def merge_all(
        self, 
        all_records: List[CustomerRecord]
    ) -> List[CustomerRecord]:
        """모든 레코드 병합"""
        # 1. 중복 그룹 찾기
        duplicate_groups = self.duplicate_matcher.find_duplicates(all_records)
        
        # 2. 병합된 레코드 수집
        merged_phones = set()
        merged_records = []
        
        for group in duplicate_groups:
            merged = self.duplicate_matcher.merge_records(group)
            if merged:
                merged_records.append(merged)
                if merged.phone_normalized:
                    merged_phones.add(merged.phone_normalized)
                self.stats["duplicates_merged"] += len(group) - 1
        
        # 3. 중복 아닌 레코드 추가
        for record in all_records:
            if record.phone_normalized and record.phone_normalized in merged_phones:
                continue
            merged_records.append(record)
        
        self.stats["total_output"] = len(merged_records)
        return merged_records
    
    def get_stats(self) -> Dict:
        """처리 통계 반환"""
        return {
            **self.stats,
            "sources": list(self.stats["sources"]),
            "dedup_rate": f"{(1 - self.stats['total_output'] / max(self.stats['total_input'], 1)) * 100:.1f}%"
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """세탁기 데모"""
    print("=" * 70)
    print("  🧹 AUTUS-TRINITY Data Sanitizer Demo")
    print("=" * 70)
    
    # 테스트 데이터 (10개 매장에서 온 더러운 데이터)
    dirty_data = [
        # 학원
        {"전화번호": "010-1234-5678", "이름": "김철수(학부모)", "source": "academy"},
        {"전화번호": "010.1234.5678", "이름": "김 철수", "source": "academy"},  # 중복
        
        # 식당
        {"phone": "01012345678", "name": "김철수님", "source": "restaurant"},  # 중복
        {"phone": "+82-10-9876-5432", "name": "이영희 mom", "source": "restaurant"},
        
        # 스포츠
        {"연락처": "82-10-5555-1234", "성명": "박진수", "source": "sports"},
        {"연락처": "010-5555-1234", "성명": "박진수", "source": "sports"},  # 중복 (오타 아님)
        
        # 잘못된 데이터
        {"phone": "12345", "name": "", "source": "other"},  # 무효
    ]
    
    sanitizer = DataSanitizer()
    
    # 배치 처리
    records = []
    for data in dirty_data:
        source = data.pop('source', 'unknown')
        rec = sanitizer.sanitize_record(data, source)
        records.append(rec)
        print(f"  {data} → {rec.phone_normalized} | {rec.name_normalized}")
    
    print("\n" + "-" * 70)
    
    # 중복 병합
    merged = sanitizer.merge_all(records)
    
    print(f"\n📊 처리 결과:")
    print(f"  - 입력: {len(dirty_data)}건")
    print(f"  - 출력: {len(merged)}건")
    print(f"  - 중복 병합: {sanitizer.stats['duplicates_merged']}건")
    
    print(f"\n👥 정제된 고객 목록:")
    for rec in merged:
        sources = rec.raw_data.get('_sources', [rec.source])
        print(f"  - {rec.name_normalized} | {PhoneSanitizer.format_display(rec.phone_normalized)} | 출처: {sources}")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Data Sanitizer                                    ║
║                          데이터 세탁기 - 10개 매장 데이터 정규화                            ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

기능:
1. 전화번호 정규화 (010-1234-5678 → 01012345678)
2. 이름 정제 (김철수(학부모) → 김철수)
3. 중복 제거 (Fuzzy Matching)
4. 국가번호 처리 (82-10-xxx → 010xxx)

입력: 10개 매장의 더러운 엑셀 데이터
출력: 단일 고유 ID로 통합된 깨끗한 데이터
"""

import re
from typing import Optional, List, Dict, Tuple
from dataclasses import dataclass
from difflib import SequenceMatcher


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 전화번호 정규화
# ═══════════════════════════════════════════════════════════════════════════════════════════

class PhoneSanitizer:
    """
    전화번호 정규화 엔진
    
    지원 형식:
    - 010-1234-5678
    - 010.1234.5678
    - 010 1234 5678
    - 01012345678
    - +82-10-1234-5678
    - 82-10-1234-5678
    - 821012345678
    """
    
    # 한국 휴대폰 번호 패턴
    MOBILE_PREFIXES = ['010', '011', '016', '017', '018', '019']
    
    @classmethod
    def normalize(cls, raw_phone: str) -> str:
        """
        어떤 형태의 전화번호든 '01012345678' 형식으로 통일
        
        Args:
            raw_phone: 원본 전화번호 문자열
            
        Returns:
            str: 정규화된 11자리 전화번호 (실패 시 빈 문자열)
        """
        if not raw_phone:
            return ""
        
        # 1. 숫자만 추출
        digits = re.sub(r'[^0-9]', '', str(raw_phone))
        
        if not digits:
            return ""
        
        # 2. 국가번호(82) 처리
        if digits.startswith('820'):
            # 82010... → 010...
            digits = digits[2:]
        elif digits.startswith('82') and len(digits) >= 12:
            # 8210... → 010...
            digits = '0' + digits[2:]
        
        # 3. 앞자리 '0' 누락 보정
        if digits.startswith('10') and len(digits) == 10:
            digits = '0' + digits
        
        # 4. 길이 검증 (휴대폰: 11자리, 유선: 9~10자리)
        if len(digits) == 11 and digits[:3] in cls.MOBILE_PREFIXES:
            return digits
        elif len(digits) in [9, 10] and digits.startswith('0'):
            # 유선전화 (02-xxx-xxxx 등)
            return digits
        
        # 5. 복구 불가능한 경우
        return ""
    
    @classmethod
    def format_display(cls, phone: str) -> str:
        """
        표시용 포맷팅 (010-1234-5678)
        """
        normalized = cls.normalize(phone)
        if len(normalized) == 11:
            return f"{normalized[:3]}-{normalized[3:7]}-{normalized[7:]}"
        elif len(normalized) == 10:
            return f"{normalized[:3]}-{normalized[3:6]}-{normalized[6:]}"
        elif len(normalized) == 9:
            return f"{normalized[:2]}-{normalized[2:5]}-{normalized[5:]}"
        return phone
    
    @classmethod
    def is_valid(cls, phone: str) -> bool:
        """유효한 전화번호인지 확인"""
        normalized = cls.normalize(phone)
        return len(normalized) >= 9


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 이름 정제
# ═══════════════════════════════════════════════════════════════════════════════════════════

class NameSanitizer:
    """
    이름 정규화 엔진
    
    처리 대상:
    - 김철수(학부모) → 김철수
    - 이영희 mom → 이영희
    - 박 진수 → 박진수
    - Mr. Kim → Kim
    """
    
    # 제거할 접미사 패턴
    SUFFIX_PATTERNS = [
        r'\s*(학부모|엄마|아빠|부모|보호자|mom|dad|parent)\s*',
        r'\s*(님|씨|선생|원장|대표|사장)\s*',
        r'\([^)]*\)',  # 괄호 안의 모든 내용
        r'\[[^\]]*\]',  # 대괄호 안의 모든 내용
    ]
    
    # 제거할 접두사
    PREFIX_PATTERNS = [
        r'^(Mr\.?|Ms\.?|Mrs\.?)\s*',
        r'^(학생|원생|회원)\s*',
    ]
    
    @classmethod
    def normalize(cls, raw_name: str) -> str:
        """
        이름 정규화
        
        Args:
            raw_name: 원본 이름 문자열
            
        Returns:
            str: 정제된 이름
        """
        if not raw_name:
            return ""
        
        name = str(raw_name).strip()
        
        # 1. 접미사 제거
        for pattern in cls.SUFFIX_PATTERNS:
            name = re.sub(pattern, '', name, flags=re.IGNORECASE)
        
        # 2. 접두사 제거
        for pattern in cls.PREFIX_PATTERNS:
            name = re.sub(pattern, '', name, flags=re.IGNORECASE)
        
        # 3. 불필요한 공백 제거
        name = re.sub(r'\s+', '', name)
        
        # 4. 특수문자 제거 (한글, 영문, 숫자만 유지)
        name = re.sub(r'[^\w가-힣]', '', name)
        
        return name.strip()
    
    @classmethod
    def extract_family_name(cls, name: str) -> str:
        """성씨 추출 (동명이인 비교용)"""
        normalized = cls.normalize(name)
        if normalized and len(normalized) >= 1:
            # 한글 이름: 첫 글자가 성
            if re.match(r'^[가-힣]', normalized):
                return normalized[0]
            # 영문 이름: 전체 반환 (성/이름 구분 어려움)
            return normalized
        return ""


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 중복 매칭 (Fuzzy Matching)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class CustomerRecord:
    """고객 레코드"""
    phone: str
    name: str
    source: str  # 출처 (academy, restaurant, sports 등)
    raw_data: Dict = None
    
    def __post_init__(self):
        self.phone_normalized = PhoneSanitizer.normalize(self.phone)
        self.name_normalized = NameSanitizer.normalize(self.name)
        if self.raw_data is None:
            self.raw_data = {}


class DuplicateMatcher:
    """
    중복 고객 매칭 엔진
    
    전략:
    1. 전화번호 완전 일치 → 동일 인물 확정
    2. 전화번호 없음 + 이름 유사도 90% 이상 → 후보군
    3. 전화번호 1자리 차이 + 이름 동일 → 오타로 추정
    """
    
    SIMILARITY_THRESHOLD = 0.85  # 이름 유사도 기준
    
    @classmethod
    def calculate_similarity(cls, str1: str, str2: str) -> float:
        """두 문자열의 유사도 계산 (0.0 ~ 1.0)"""
        if not str1 or not str2:
            return 0.0
        return SequenceMatcher(None, str1.lower(), str2.lower()).ratio()
    
    @classmethod
    def is_phone_typo(cls, phone1: str, phone2: str) -> bool:
        """
        전화번호 오타 여부 확인 (1자리 차이)
        """
        if len(phone1) != len(phone2):
            return False
        
        diff_count = sum(1 for a, b in zip(phone1, phone2) if a != b)
        return diff_count == 1
    
    @classmethod
    def find_duplicates(
        cls, 
        records: List[CustomerRecord]
    ) -> List[List[CustomerRecord]]:
        """
        중복 레코드 그룹 찾기
        
        Returns:
            List[List[CustomerRecord]]: 같은 사람으로 추정되는 레코드 그룹 목록
        """
        # 전화번호 기준 그룹핑
        phone_groups: Dict[str, List[CustomerRecord]] = {}
        no_phone_records: List[CustomerRecord] = []
        
        for record in records:
            if record.phone_normalized:
                if record.phone_normalized not in phone_groups:
                    phone_groups[record.phone_normalized] = []
                phone_groups[record.phone_normalized].append(record)
            else:
                no_phone_records.append(record)
        
        # 결과 그룹
        duplicate_groups = []
        
        # 1. 전화번호 동일 그룹 (2개 이상)
        for phone, group in phone_groups.items():
            if len(group) >= 2:
                duplicate_groups.append(group)
        
        # 2. 전화번호 없는 레코드 중 이름 유사도 기반 매칭
        matched_indices = set()
        for i, rec1 in enumerate(no_phone_records):
            if i in matched_indices:
                continue
            
            similar_group = [rec1]
            for j, rec2 in enumerate(no_phone_records[i+1:], start=i+1):
                if j in matched_indices:
                    continue
                
                similarity = cls.calculate_similarity(
                    rec1.name_normalized, 
                    rec2.name_normalized
                )
                if similarity >= cls.SIMILARITY_THRESHOLD:
                    similar_group.append(rec2)
                    matched_indices.add(j)
            
            if len(similar_group) >= 2:
                duplicate_groups.append(similar_group)
                matched_indices.add(i)
        
        return duplicate_groups
    
    @classmethod
    def merge_records(cls, records: List[CustomerRecord]) -> CustomerRecord:
        """
        여러 레코드를 하나로 병합
        
        전략:
        - 전화번호: 가장 먼저 나온 유효한 번호
        - 이름: 가장 긴 이름 (정보 손실 최소화)
        - 출처: 모두 기록
        """
        if not records:
            return None
        
        # 유효한 전화번호 찾기
        phone = ""
        for rec in records:
            if rec.phone_normalized:
                phone = rec.phone_normalized
                break
        
        # 가장 긴 이름
        name = max(records, key=lambda r: len(r.name_normalized)).name_normalized
        
        # 출처 합치기
        sources = list(set(rec.source for rec in records))
        
        # raw_data 병합
        merged_data = {}
        for rec in records:
            merged_data.update(rec.raw_data or {})
        merged_data['_sources'] = sources
        merged_data['_merged_count'] = len(records)
        
        return CustomerRecord(
            phone=phone,
            name=name,
            source=','.join(sources),
            raw_data=merged_data
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 통합 세탁기
# ═══════════════════════════════════════════════════════════════════════════════════════════

class DataSanitizer:
    """
    10개 매장 데이터 통합 세탁기
    
    Usage:
        sanitizer = DataSanitizer()
        clean_data = sanitizer.process_all(raw_records)
    """
    
    def __init__(self):
        self.phone_sanitizer = PhoneSanitizer()
        self.name_sanitizer = NameSanitizer()
        self.duplicate_matcher = DuplicateMatcher()
        
        # 처리 통계
        self.stats = {
            "total_input": 0,
            "total_output": 0,
            "duplicates_merged": 0,
            "invalid_phones": 0,
            "sources": set()
        }
    
    def sanitize_record(self, raw: Dict, source: str) -> CustomerRecord:
        """단일 레코드 정제"""
        phone = raw.get('phone', raw.get('전화번호', raw.get('연락처', '')))
        name = raw.get('name', raw.get('이름', raw.get('성명', '')))
        
        return CustomerRecord(
            phone=PhoneSanitizer.normalize(phone),
            name=NameSanitizer.normalize(name),
            source=source,
            raw_data=raw
        )
    
    def process_batch(
        self, 
        records: List[Dict], 
        source: str
    ) -> List[CustomerRecord]:
        """배치 처리"""
        self.stats["sources"].add(source)
        self.stats["total_input"] += len(records)
        
        sanitized = []
        for raw in records:
            record = self.sanitize_record(raw, source)
            
            # 유효성 검사
            if not record.phone_normalized and not record.name_normalized:
                continue  # 둘 다 없으면 스킵
            
            if record.phone and not record.phone_normalized:
                self.stats["invalid_phones"] += 1
            
            sanitized.append(record)
        
        return sanitized
    
    def merge_all(
        self, 
        all_records: List[CustomerRecord]
    ) -> List[CustomerRecord]:
        """모든 레코드 병합"""
        # 1. 중복 그룹 찾기
        duplicate_groups = self.duplicate_matcher.find_duplicates(all_records)
        
        # 2. 병합된 레코드 수집
        merged_phones = set()
        merged_records = []
        
        for group in duplicate_groups:
            merged = self.duplicate_matcher.merge_records(group)
            if merged:
                merged_records.append(merged)
                if merged.phone_normalized:
                    merged_phones.add(merged.phone_normalized)
                self.stats["duplicates_merged"] += len(group) - 1
        
        # 3. 중복 아닌 레코드 추가
        for record in all_records:
            if record.phone_normalized and record.phone_normalized in merged_phones:
                continue
            merged_records.append(record)
        
        self.stats["total_output"] = len(merged_records)
        return merged_records
    
    def get_stats(self) -> Dict:
        """처리 통계 반환"""
        return {
            **self.stats,
            "sources": list(self.stats["sources"]),
            "dedup_rate": f"{(1 - self.stats['total_output'] / max(self.stats['total_input'], 1)) * 100:.1f}%"
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """세탁기 데모"""
    print("=" * 70)
    print("  🧹 AUTUS-TRINITY Data Sanitizer Demo")
    print("=" * 70)
    
    # 테스트 데이터 (10개 매장에서 온 더러운 데이터)
    dirty_data = [
        # 학원
        {"전화번호": "010-1234-5678", "이름": "김철수(학부모)", "source": "academy"},
        {"전화번호": "010.1234.5678", "이름": "김 철수", "source": "academy"},  # 중복
        
        # 식당
        {"phone": "01012345678", "name": "김철수님", "source": "restaurant"},  # 중복
        {"phone": "+82-10-9876-5432", "name": "이영희 mom", "source": "restaurant"},
        
        # 스포츠
        {"연락처": "82-10-5555-1234", "성명": "박진수", "source": "sports"},
        {"연락처": "010-5555-1234", "성명": "박진수", "source": "sports"},  # 중복 (오타 아님)
        
        # 잘못된 데이터
        {"phone": "12345", "name": "", "source": "other"},  # 무효
    ]
    
    sanitizer = DataSanitizer()
    
    # 배치 처리
    records = []
    for data in dirty_data:
        source = data.pop('source', 'unknown')
        rec = sanitizer.sanitize_record(data, source)
        records.append(rec)
        print(f"  {data} → {rec.phone_normalized} | {rec.name_normalized}")
    
    print("\n" + "-" * 70)
    
    # 중복 병합
    merged = sanitizer.merge_all(records)
    
    print(f"\n📊 처리 결과:")
    print(f"  - 입력: {len(dirty_data)}건")
    print(f"  - 출력: {len(merged)}건")
    print(f"  - 중복 병합: {sanitizer.stats['duplicates_merged']}건")
    
    print(f"\n👥 정제된 고객 목록:")
    for rec in merged:
        sources = rec.raw_data.get('_sources', [rec.source])
        print(f"  - {rec.name_normalized} | {PhoneSanitizer.format_display(rec.phone_normalized)} | 출처: {sources}")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Data Sanitizer                                    ║
║                          데이터 세탁기 - 10개 매장 데이터 정규화                            ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

기능:
1. 전화번호 정규화 (010-1234-5678 → 01012345678)
2. 이름 정제 (김철수(학부모) → 김철수)
3. 중복 제거 (Fuzzy Matching)
4. 국가번호 처리 (82-10-xxx → 010xxx)

입력: 10개 매장의 더러운 엑셀 데이터
출력: 단일 고유 ID로 통합된 깨끗한 데이터
"""

import re
from typing import Optional, List, Dict, Tuple
from dataclasses import dataclass
from difflib import SequenceMatcher


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 전화번호 정규화
# ═══════════════════════════════════════════════════════════════════════════════════════════

class PhoneSanitizer:
    """
    전화번호 정규화 엔진
    
    지원 형식:
    - 010-1234-5678
    - 010.1234.5678
    - 010 1234 5678
    - 01012345678
    - +82-10-1234-5678
    - 82-10-1234-5678
    - 821012345678
    """
    
    # 한국 휴대폰 번호 패턴
    MOBILE_PREFIXES = ['010', '011', '016', '017', '018', '019']
    
    @classmethod
    def normalize(cls, raw_phone: str) -> str:
        """
        어떤 형태의 전화번호든 '01012345678' 형식으로 통일
        
        Args:
            raw_phone: 원본 전화번호 문자열
            
        Returns:
            str: 정규화된 11자리 전화번호 (실패 시 빈 문자열)
        """
        if not raw_phone:
            return ""
        
        # 1. 숫자만 추출
        digits = re.sub(r'[^0-9]', '', str(raw_phone))
        
        if not digits:
            return ""
        
        # 2. 국가번호(82) 처리
        if digits.startswith('820'):
            # 82010... → 010...
            digits = digits[2:]
        elif digits.startswith('82') and len(digits) >= 12:
            # 8210... → 010...
            digits = '0' + digits[2:]
        
        # 3. 앞자리 '0' 누락 보정
        if digits.startswith('10') and len(digits) == 10:
            digits = '0' + digits
        
        # 4. 길이 검증 (휴대폰: 11자리, 유선: 9~10자리)
        if len(digits) == 11 and digits[:3] in cls.MOBILE_PREFIXES:
            return digits
        elif len(digits) in [9, 10] and digits.startswith('0'):
            # 유선전화 (02-xxx-xxxx 등)
            return digits
        
        # 5. 복구 불가능한 경우
        return ""
    
    @classmethod
    def format_display(cls, phone: str) -> str:
        """
        표시용 포맷팅 (010-1234-5678)
        """
        normalized = cls.normalize(phone)
        if len(normalized) == 11:
            return f"{normalized[:3]}-{normalized[3:7]}-{normalized[7:]}"
        elif len(normalized) == 10:
            return f"{normalized[:3]}-{normalized[3:6]}-{normalized[6:]}"
        elif len(normalized) == 9:
            return f"{normalized[:2]}-{normalized[2:5]}-{normalized[5:]}"
        return phone
    
    @classmethod
    def is_valid(cls, phone: str) -> bool:
        """유효한 전화번호인지 확인"""
        normalized = cls.normalize(phone)
        return len(normalized) >= 9


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 이름 정제
# ═══════════════════════════════════════════════════════════════════════════════════════════

class NameSanitizer:
    """
    이름 정규화 엔진
    
    처리 대상:
    - 김철수(학부모) → 김철수
    - 이영희 mom → 이영희
    - 박 진수 → 박진수
    - Mr. Kim → Kim
    """
    
    # 제거할 접미사 패턴
    SUFFIX_PATTERNS = [
        r'\s*(학부모|엄마|아빠|부모|보호자|mom|dad|parent)\s*',
        r'\s*(님|씨|선생|원장|대표|사장)\s*',
        r'\([^)]*\)',  # 괄호 안의 모든 내용
        r'\[[^\]]*\]',  # 대괄호 안의 모든 내용
    ]
    
    # 제거할 접두사
    PREFIX_PATTERNS = [
        r'^(Mr\.?|Ms\.?|Mrs\.?)\s*',
        r'^(학생|원생|회원)\s*',
    ]
    
    @classmethod
    def normalize(cls, raw_name: str) -> str:
        """
        이름 정규화
        
        Args:
            raw_name: 원본 이름 문자열
            
        Returns:
            str: 정제된 이름
        """
        if not raw_name:
            return ""
        
        name = str(raw_name).strip()
        
        # 1. 접미사 제거
        for pattern in cls.SUFFIX_PATTERNS:
            name = re.sub(pattern, '', name, flags=re.IGNORECASE)
        
        # 2. 접두사 제거
        for pattern in cls.PREFIX_PATTERNS:
            name = re.sub(pattern, '', name, flags=re.IGNORECASE)
        
        # 3. 불필요한 공백 제거
        name = re.sub(r'\s+', '', name)
        
        # 4. 특수문자 제거 (한글, 영문, 숫자만 유지)
        name = re.sub(r'[^\w가-힣]', '', name)
        
        return name.strip()
    
    @classmethod
    def extract_family_name(cls, name: str) -> str:
        """성씨 추출 (동명이인 비교용)"""
        normalized = cls.normalize(name)
        if normalized and len(normalized) >= 1:
            # 한글 이름: 첫 글자가 성
            if re.match(r'^[가-힣]', normalized):
                return normalized[0]
            # 영문 이름: 전체 반환 (성/이름 구분 어려움)
            return normalized
        return ""


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 중복 매칭 (Fuzzy Matching)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class CustomerRecord:
    """고객 레코드"""
    phone: str
    name: str
    source: str  # 출처 (academy, restaurant, sports 등)
    raw_data: Dict = None
    
    def __post_init__(self):
        self.phone_normalized = PhoneSanitizer.normalize(self.phone)
        self.name_normalized = NameSanitizer.normalize(self.name)
        if self.raw_data is None:
            self.raw_data = {}


class DuplicateMatcher:
    """
    중복 고객 매칭 엔진
    
    전략:
    1. 전화번호 완전 일치 → 동일 인물 확정
    2. 전화번호 없음 + 이름 유사도 90% 이상 → 후보군
    3. 전화번호 1자리 차이 + 이름 동일 → 오타로 추정
    """
    
    SIMILARITY_THRESHOLD = 0.85  # 이름 유사도 기준
    
    @classmethod
    def calculate_similarity(cls, str1: str, str2: str) -> float:
        """두 문자열의 유사도 계산 (0.0 ~ 1.0)"""
        if not str1 or not str2:
            return 0.0
        return SequenceMatcher(None, str1.lower(), str2.lower()).ratio()
    
    @classmethod
    def is_phone_typo(cls, phone1: str, phone2: str) -> bool:
        """
        전화번호 오타 여부 확인 (1자리 차이)
        """
        if len(phone1) != len(phone2):
            return False
        
        diff_count = sum(1 for a, b in zip(phone1, phone2) if a != b)
        return diff_count == 1
    
    @classmethod
    def find_duplicates(
        cls, 
        records: List[CustomerRecord]
    ) -> List[List[CustomerRecord]]:
        """
        중복 레코드 그룹 찾기
        
        Returns:
            List[List[CustomerRecord]]: 같은 사람으로 추정되는 레코드 그룹 목록
        """
        # 전화번호 기준 그룹핑
        phone_groups: Dict[str, List[CustomerRecord]] = {}
        no_phone_records: List[CustomerRecord] = []
        
        for record in records:
            if record.phone_normalized:
                if record.phone_normalized not in phone_groups:
                    phone_groups[record.phone_normalized] = []
                phone_groups[record.phone_normalized].append(record)
            else:
                no_phone_records.append(record)
        
        # 결과 그룹
        duplicate_groups = []
        
        # 1. 전화번호 동일 그룹 (2개 이상)
        for phone, group in phone_groups.items():
            if len(group) >= 2:
                duplicate_groups.append(group)
        
        # 2. 전화번호 없는 레코드 중 이름 유사도 기반 매칭
        matched_indices = set()
        for i, rec1 in enumerate(no_phone_records):
            if i in matched_indices:
                continue
            
            similar_group = [rec1]
            for j, rec2 in enumerate(no_phone_records[i+1:], start=i+1):
                if j in matched_indices:
                    continue
                
                similarity = cls.calculate_similarity(
                    rec1.name_normalized, 
                    rec2.name_normalized
                )
                if similarity >= cls.SIMILARITY_THRESHOLD:
                    similar_group.append(rec2)
                    matched_indices.add(j)
            
            if len(similar_group) >= 2:
                duplicate_groups.append(similar_group)
                matched_indices.add(i)
        
        return duplicate_groups
    
    @classmethod
    def merge_records(cls, records: List[CustomerRecord]) -> CustomerRecord:
        """
        여러 레코드를 하나로 병합
        
        전략:
        - 전화번호: 가장 먼저 나온 유효한 번호
        - 이름: 가장 긴 이름 (정보 손실 최소화)
        - 출처: 모두 기록
        """
        if not records:
            return None
        
        # 유효한 전화번호 찾기
        phone = ""
        for rec in records:
            if rec.phone_normalized:
                phone = rec.phone_normalized
                break
        
        # 가장 긴 이름
        name = max(records, key=lambda r: len(r.name_normalized)).name_normalized
        
        # 출처 합치기
        sources = list(set(rec.source for rec in records))
        
        # raw_data 병합
        merged_data = {}
        for rec in records:
            merged_data.update(rec.raw_data or {})
        merged_data['_sources'] = sources
        merged_data['_merged_count'] = len(records)
        
        return CustomerRecord(
            phone=phone,
            name=name,
            source=','.join(sources),
            raw_data=merged_data
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 통합 세탁기
# ═══════════════════════════════════════════════════════════════════════════════════════════

class DataSanitizer:
    """
    10개 매장 데이터 통합 세탁기
    
    Usage:
        sanitizer = DataSanitizer()
        clean_data = sanitizer.process_all(raw_records)
    """
    
    def __init__(self):
        self.phone_sanitizer = PhoneSanitizer()
        self.name_sanitizer = NameSanitizer()
        self.duplicate_matcher = DuplicateMatcher()
        
        # 처리 통계
        self.stats = {
            "total_input": 0,
            "total_output": 0,
            "duplicates_merged": 0,
            "invalid_phones": 0,
            "sources": set()
        }
    
    def sanitize_record(self, raw: Dict, source: str) -> CustomerRecord:
        """단일 레코드 정제"""
        phone = raw.get('phone', raw.get('전화번호', raw.get('연락처', '')))
        name = raw.get('name', raw.get('이름', raw.get('성명', '')))
        
        return CustomerRecord(
            phone=PhoneSanitizer.normalize(phone),
            name=NameSanitizer.normalize(name),
            source=source,
            raw_data=raw
        )
    
    def process_batch(
        self, 
        records: List[Dict], 
        source: str
    ) -> List[CustomerRecord]:
        """배치 처리"""
        self.stats["sources"].add(source)
        self.stats["total_input"] += len(records)
        
        sanitized = []
        for raw in records:
            record = self.sanitize_record(raw, source)
            
            # 유효성 검사
            if not record.phone_normalized and not record.name_normalized:
                continue  # 둘 다 없으면 스킵
            
            if record.phone and not record.phone_normalized:
                self.stats["invalid_phones"] += 1
            
            sanitized.append(record)
        
        return sanitized
    
    def merge_all(
        self, 
        all_records: List[CustomerRecord]
    ) -> List[CustomerRecord]:
        """모든 레코드 병합"""
        # 1. 중복 그룹 찾기
        duplicate_groups = self.duplicate_matcher.find_duplicates(all_records)
        
        # 2. 병합된 레코드 수집
        merged_phones = set()
        merged_records = []
        
        for group in duplicate_groups:
            merged = self.duplicate_matcher.merge_records(group)
            if merged:
                merged_records.append(merged)
                if merged.phone_normalized:
                    merged_phones.add(merged.phone_normalized)
                self.stats["duplicates_merged"] += len(group) - 1
        
        # 3. 중복 아닌 레코드 추가
        for record in all_records:
            if record.phone_normalized and record.phone_normalized in merged_phones:
                continue
            merged_records.append(record)
        
        self.stats["total_output"] = len(merged_records)
        return merged_records
    
    def get_stats(self) -> Dict:
        """처리 통계 반환"""
        return {
            **self.stats,
            "sources": list(self.stats["sources"]),
            "dedup_rate": f"{(1 - self.stats['total_output'] / max(self.stats['total_input'], 1)) * 100:.1f}%"
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """세탁기 데모"""
    print("=" * 70)
    print("  🧹 AUTUS-TRINITY Data Sanitizer Demo")
    print("=" * 70)
    
    # 테스트 데이터 (10개 매장에서 온 더러운 데이터)
    dirty_data = [
        # 학원
        {"전화번호": "010-1234-5678", "이름": "김철수(학부모)", "source": "academy"},
        {"전화번호": "010.1234.5678", "이름": "김 철수", "source": "academy"},  # 중복
        
        # 식당
        {"phone": "01012345678", "name": "김철수님", "source": "restaurant"},  # 중복
        {"phone": "+82-10-9876-5432", "name": "이영희 mom", "source": "restaurant"},
        
        # 스포츠
        {"연락처": "82-10-5555-1234", "성명": "박진수", "source": "sports"},
        {"연락처": "010-5555-1234", "성명": "박진수", "source": "sports"},  # 중복 (오타 아님)
        
        # 잘못된 데이터
        {"phone": "12345", "name": "", "source": "other"},  # 무효
    ]
    
    sanitizer = DataSanitizer()
    
    # 배치 처리
    records = []
    for data in dirty_data:
        source = data.pop('source', 'unknown')
        rec = sanitizer.sanitize_record(data, source)
        records.append(rec)
        print(f"  {data} → {rec.phone_normalized} | {rec.name_normalized}")
    
    print("\n" + "-" * 70)
    
    # 중복 병합
    merged = sanitizer.merge_all(records)
    
    print(f"\n📊 처리 결과:")
    print(f"  - 입력: {len(dirty_data)}건")
    print(f"  - 출력: {len(merged)}건")
    print(f"  - 중복 병합: {sanitizer.stats['duplicates_merged']}건")
    
    print(f"\n👥 정제된 고객 목록:")
    for rec in merged:
        sources = rec.raw_data.get('_sources', [rec.source])
        print(f"  - {rec.name_normalized} | {PhoneSanitizer.format_display(rec.phone_normalized)} | 출처: {sources}")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Data Sanitizer                                    ║
║                          데이터 세탁기 - 10개 매장 데이터 정규화                            ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

기능:
1. 전화번호 정규화 (010-1234-5678 → 01012345678)
2. 이름 정제 (김철수(학부모) → 김철수)
3. 중복 제거 (Fuzzy Matching)
4. 국가번호 처리 (82-10-xxx → 010xxx)

입력: 10개 매장의 더러운 엑셀 데이터
출력: 단일 고유 ID로 통합된 깨끗한 데이터
"""

import re
from typing import Optional, List, Dict, Tuple
from dataclasses import dataclass
from difflib import SequenceMatcher


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 전화번호 정규화
# ═══════════════════════════════════════════════════════════════════════════════════════════

class PhoneSanitizer:
    """
    전화번호 정규화 엔진
    
    지원 형식:
    - 010-1234-5678
    - 010.1234.5678
    - 010 1234 5678
    - 01012345678
    - +82-10-1234-5678
    - 82-10-1234-5678
    - 821012345678
    """
    
    # 한국 휴대폰 번호 패턴
    MOBILE_PREFIXES = ['010', '011', '016', '017', '018', '019']
    
    @classmethod
    def normalize(cls, raw_phone: str) -> str:
        """
        어떤 형태의 전화번호든 '01012345678' 형식으로 통일
        
        Args:
            raw_phone: 원본 전화번호 문자열
            
        Returns:
            str: 정규화된 11자리 전화번호 (실패 시 빈 문자열)
        """
        if not raw_phone:
            return ""
        
        # 1. 숫자만 추출
        digits = re.sub(r'[^0-9]', '', str(raw_phone))
        
        if not digits:
            return ""
        
        # 2. 국가번호(82) 처리
        if digits.startswith('820'):
            # 82010... → 010...
            digits = digits[2:]
        elif digits.startswith('82') and len(digits) >= 12:
            # 8210... → 010...
            digits = '0' + digits[2:]
        
        # 3. 앞자리 '0' 누락 보정
        if digits.startswith('10') and len(digits) == 10:
            digits = '0' + digits
        
        # 4. 길이 검증 (휴대폰: 11자리, 유선: 9~10자리)
        if len(digits) == 11 and digits[:3] in cls.MOBILE_PREFIXES:
            return digits
        elif len(digits) in [9, 10] and digits.startswith('0'):
            # 유선전화 (02-xxx-xxxx 등)
            return digits
        
        # 5. 복구 불가능한 경우
        return ""
    
    @classmethod
    def format_display(cls, phone: str) -> str:
        """
        표시용 포맷팅 (010-1234-5678)
        """
        normalized = cls.normalize(phone)
        if len(normalized) == 11:
            return f"{normalized[:3]}-{normalized[3:7]}-{normalized[7:]}"
        elif len(normalized) == 10:
            return f"{normalized[:3]}-{normalized[3:6]}-{normalized[6:]}"
        elif len(normalized) == 9:
            return f"{normalized[:2]}-{normalized[2:5]}-{normalized[5:]}"
        return phone
    
    @classmethod
    def is_valid(cls, phone: str) -> bool:
        """유효한 전화번호인지 확인"""
        normalized = cls.normalize(phone)
        return len(normalized) >= 9


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 이름 정제
# ═══════════════════════════════════════════════════════════════════════════════════════════

class NameSanitizer:
    """
    이름 정규화 엔진
    
    처리 대상:
    - 김철수(학부모) → 김철수
    - 이영희 mom → 이영희
    - 박 진수 → 박진수
    - Mr. Kim → Kim
    """
    
    # 제거할 접미사 패턴
    SUFFIX_PATTERNS = [
        r'\s*(학부모|엄마|아빠|부모|보호자|mom|dad|parent)\s*',
        r'\s*(님|씨|선생|원장|대표|사장)\s*',
        r'\([^)]*\)',  # 괄호 안의 모든 내용
        r'\[[^\]]*\]',  # 대괄호 안의 모든 내용
    ]
    
    # 제거할 접두사
    PREFIX_PATTERNS = [
        r'^(Mr\.?|Ms\.?|Mrs\.?)\s*',
        r'^(학생|원생|회원)\s*',
    ]
    
    @classmethod
    def normalize(cls, raw_name: str) -> str:
        """
        이름 정규화
        
        Args:
            raw_name: 원본 이름 문자열
            
        Returns:
            str: 정제된 이름
        """
        if not raw_name:
            return ""
        
        name = str(raw_name).strip()
        
        # 1. 접미사 제거
        for pattern in cls.SUFFIX_PATTERNS:
            name = re.sub(pattern, '', name, flags=re.IGNORECASE)
        
        # 2. 접두사 제거
        for pattern in cls.PREFIX_PATTERNS:
            name = re.sub(pattern, '', name, flags=re.IGNORECASE)
        
        # 3. 불필요한 공백 제거
        name = re.sub(r'\s+', '', name)
        
        # 4. 특수문자 제거 (한글, 영문, 숫자만 유지)
        name = re.sub(r'[^\w가-힣]', '', name)
        
        return name.strip()
    
    @classmethod
    def extract_family_name(cls, name: str) -> str:
        """성씨 추출 (동명이인 비교용)"""
        normalized = cls.normalize(name)
        if normalized and len(normalized) >= 1:
            # 한글 이름: 첫 글자가 성
            if re.match(r'^[가-힣]', normalized):
                return normalized[0]
            # 영문 이름: 전체 반환 (성/이름 구분 어려움)
            return normalized
        return ""


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 중복 매칭 (Fuzzy Matching)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class CustomerRecord:
    """고객 레코드"""
    phone: str
    name: str
    source: str  # 출처 (academy, restaurant, sports 등)
    raw_data: Dict = None
    
    def __post_init__(self):
        self.phone_normalized = PhoneSanitizer.normalize(self.phone)
        self.name_normalized = NameSanitizer.normalize(self.name)
        if self.raw_data is None:
            self.raw_data = {}


class DuplicateMatcher:
    """
    중복 고객 매칭 엔진
    
    전략:
    1. 전화번호 완전 일치 → 동일 인물 확정
    2. 전화번호 없음 + 이름 유사도 90% 이상 → 후보군
    3. 전화번호 1자리 차이 + 이름 동일 → 오타로 추정
    """
    
    SIMILARITY_THRESHOLD = 0.85  # 이름 유사도 기준
    
    @classmethod
    def calculate_similarity(cls, str1: str, str2: str) -> float:
        """두 문자열의 유사도 계산 (0.0 ~ 1.0)"""
        if not str1 or not str2:
            return 0.0
        return SequenceMatcher(None, str1.lower(), str2.lower()).ratio()
    
    @classmethod
    def is_phone_typo(cls, phone1: str, phone2: str) -> bool:
        """
        전화번호 오타 여부 확인 (1자리 차이)
        """
        if len(phone1) != len(phone2):
            return False
        
        diff_count = sum(1 for a, b in zip(phone1, phone2) if a != b)
        return diff_count == 1
    
    @classmethod
    def find_duplicates(
        cls, 
        records: List[CustomerRecord]
    ) -> List[List[CustomerRecord]]:
        """
        중복 레코드 그룹 찾기
        
        Returns:
            List[List[CustomerRecord]]: 같은 사람으로 추정되는 레코드 그룹 목록
        """
        # 전화번호 기준 그룹핑
        phone_groups: Dict[str, List[CustomerRecord]] = {}
        no_phone_records: List[CustomerRecord] = []
        
        for record in records:
            if record.phone_normalized:
                if record.phone_normalized not in phone_groups:
                    phone_groups[record.phone_normalized] = []
                phone_groups[record.phone_normalized].append(record)
            else:
                no_phone_records.append(record)
        
        # 결과 그룹
        duplicate_groups = []
        
        # 1. 전화번호 동일 그룹 (2개 이상)
        for phone, group in phone_groups.items():
            if len(group) >= 2:
                duplicate_groups.append(group)
        
        # 2. 전화번호 없는 레코드 중 이름 유사도 기반 매칭
        matched_indices = set()
        for i, rec1 in enumerate(no_phone_records):
            if i in matched_indices:
                continue
            
            similar_group = [rec1]
            for j, rec2 in enumerate(no_phone_records[i+1:], start=i+1):
                if j in matched_indices:
                    continue
                
                similarity = cls.calculate_similarity(
                    rec1.name_normalized, 
                    rec2.name_normalized
                )
                if similarity >= cls.SIMILARITY_THRESHOLD:
                    similar_group.append(rec2)
                    matched_indices.add(j)
            
            if len(similar_group) >= 2:
                duplicate_groups.append(similar_group)
                matched_indices.add(i)
        
        return duplicate_groups
    
    @classmethod
    def merge_records(cls, records: List[CustomerRecord]) -> CustomerRecord:
        """
        여러 레코드를 하나로 병합
        
        전략:
        - 전화번호: 가장 먼저 나온 유효한 번호
        - 이름: 가장 긴 이름 (정보 손실 최소화)
        - 출처: 모두 기록
        """
        if not records:
            return None
        
        # 유효한 전화번호 찾기
        phone = ""
        for rec in records:
            if rec.phone_normalized:
                phone = rec.phone_normalized
                break
        
        # 가장 긴 이름
        name = max(records, key=lambda r: len(r.name_normalized)).name_normalized
        
        # 출처 합치기
        sources = list(set(rec.source for rec in records))
        
        # raw_data 병합
        merged_data = {}
        for rec in records:
            merged_data.update(rec.raw_data or {})
        merged_data['_sources'] = sources
        merged_data['_merged_count'] = len(records)
        
        return CustomerRecord(
            phone=phone,
            name=name,
            source=','.join(sources),
            raw_data=merged_data
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 통합 세탁기
# ═══════════════════════════════════════════════════════════════════════════════════════════

class DataSanitizer:
    """
    10개 매장 데이터 통합 세탁기
    
    Usage:
        sanitizer = DataSanitizer()
        clean_data = sanitizer.process_all(raw_records)
    """
    
    def __init__(self):
        self.phone_sanitizer = PhoneSanitizer()
        self.name_sanitizer = NameSanitizer()
        self.duplicate_matcher = DuplicateMatcher()
        
        # 처리 통계
        self.stats = {
            "total_input": 0,
            "total_output": 0,
            "duplicates_merged": 0,
            "invalid_phones": 0,
            "sources": set()
        }
    
    def sanitize_record(self, raw: Dict, source: str) -> CustomerRecord:
        """단일 레코드 정제"""
        phone = raw.get('phone', raw.get('전화번호', raw.get('연락처', '')))
        name = raw.get('name', raw.get('이름', raw.get('성명', '')))
        
        return CustomerRecord(
            phone=PhoneSanitizer.normalize(phone),
            name=NameSanitizer.normalize(name),
            source=source,
            raw_data=raw
        )
    
    def process_batch(
        self, 
        records: List[Dict], 
        source: str
    ) -> List[CustomerRecord]:
        """배치 처리"""
        self.stats["sources"].add(source)
        self.stats["total_input"] += len(records)
        
        sanitized = []
        for raw in records:
            record = self.sanitize_record(raw, source)
            
            # 유효성 검사
            if not record.phone_normalized and not record.name_normalized:
                continue  # 둘 다 없으면 스킵
            
            if record.phone and not record.phone_normalized:
                self.stats["invalid_phones"] += 1
            
            sanitized.append(record)
        
        return sanitized
    
    def merge_all(
        self, 
        all_records: List[CustomerRecord]
    ) -> List[CustomerRecord]:
        """모든 레코드 병합"""
        # 1. 중복 그룹 찾기
        duplicate_groups = self.duplicate_matcher.find_duplicates(all_records)
        
        # 2. 병합된 레코드 수집
        merged_phones = set()
        merged_records = []
        
        for group in duplicate_groups:
            merged = self.duplicate_matcher.merge_records(group)
            if merged:
                merged_records.append(merged)
                if merged.phone_normalized:
                    merged_phones.add(merged.phone_normalized)
                self.stats["duplicates_merged"] += len(group) - 1
        
        # 3. 중복 아닌 레코드 추가
        for record in all_records:
            if record.phone_normalized and record.phone_normalized in merged_phones:
                continue
            merged_records.append(record)
        
        self.stats["total_output"] = len(merged_records)
        return merged_records
    
    def get_stats(self) -> Dict:
        """처리 통계 반환"""
        return {
            **self.stats,
            "sources": list(self.stats["sources"]),
            "dedup_rate": f"{(1 - self.stats['total_output'] / max(self.stats['total_input'], 1)) * 100:.1f}%"
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """세탁기 데모"""
    print("=" * 70)
    print("  🧹 AUTUS-TRINITY Data Sanitizer Demo")
    print("=" * 70)
    
    # 테스트 데이터 (10개 매장에서 온 더러운 데이터)
    dirty_data = [
        # 학원
        {"전화번호": "010-1234-5678", "이름": "김철수(학부모)", "source": "academy"},
        {"전화번호": "010.1234.5678", "이름": "김 철수", "source": "academy"},  # 중복
        
        # 식당
        {"phone": "01012345678", "name": "김철수님", "source": "restaurant"},  # 중복
        {"phone": "+82-10-9876-5432", "name": "이영희 mom", "source": "restaurant"},
        
        # 스포츠
        {"연락처": "82-10-5555-1234", "성명": "박진수", "source": "sports"},
        {"연락처": "010-5555-1234", "성명": "박진수", "source": "sports"},  # 중복 (오타 아님)
        
        # 잘못된 데이터
        {"phone": "12345", "name": "", "source": "other"},  # 무효
    ]
    
    sanitizer = DataSanitizer()
    
    # 배치 처리
    records = []
    for data in dirty_data:
        source = data.pop('source', 'unknown')
        rec = sanitizer.sanitize_record(data, source)
        records.append(rec)
        print(f"  {data} → {rec.phone_normalized} | {rec.name_normalized}")
    
    print("\n" + "-" * 70)
    
    # 중복 병합
    merged = sanitizer.merge_all(records)
    
    print(f"\n📊 처리 결과:")
    print(f"  - 입력: {len(dirty_data)}건")
    print(f"  - 출력: {len(merged)}건")
    print(f"  - 중복 병합: {sanitizer.stats['duplicates_merged']}건")
    
    print(f"\n👥 정제된 고객 목록:")
    for rec in merged:
        sources = rec.raw_data.get('_sources', [rec.source])
        print(f"  - {rec.name_normalized} | {PhoneSanitizer.format_display(rec.phone_normalized)} | 출처: {sources}")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Data Sanitizer                                    ║
║                          데이터 세탁기 - 10개 매장 데이터 정규화                            ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

기능:
1. 전화번호 정규화 (010-1234-5678 → 01012345678)
2. 이름 정제 (김철수(학부모) → 김철수)
3. 중복 제거 (Fuzzy Matching)
4. 국가번호 처리 (82-10-xxx → 010xxx)

입력: 10개 매장의 더러운 엑셀 데이터
출력: 단일 고유 ID로 통합된 깨끗한 데이터
"""

import re
from typing import Optional, List, Dict, Tuple
from dataclasses import dataclass
from difflib import SequenceMatcher


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 전화번호 정규화
# ═══════════════════════════════════════════════════════════════════════════════════════════

class PhoneSanitizer:
    """
    전화번호 정규화 엔진
    
    지원 형식:
    - 010-1234-5678
    - 010.1234.5678
    - 010 1234 5678
    - 01012345678
    - +82-10-1234-5678
    - 82-10-1234-5678
    - 821012345678
    """
    
    # 한국 휴대폰 번호 패턴
    MOBILE_PREFIXES = ['010', '011', '016', '017', '018', '019']
    
    @classmethod
    def normalize(cls, raw_phone: str) -> str:
        """
        어떤 형태의 전화번호든 '01012345678' 형식으로 통일
        
        Args:
            raw_phone: 원본 전화번호 문자열
            
        Returns:
            str: 정규화된 11자리 전화번호 (실패 시 빈 문자열)
        """
        if not raw_phone:
            return ""
        
        # 1. 숫자만 추출
        digits = re.sub(r'[^0-9]', '', str(raw_phone))
        
        if not digits:
            return ""
        
        # 2. 국가번호(82) 처리
        if digits.startswith('820'):
            # 82010... → 010...
            digits = digits[2:]
        elif digits.startswith('82') and len(digits) >= 12:
            # 8210... → 010...
            digits = '0' + digits[2:]
        
        # 3. 앞자리 '0' 누락 보정
        if digits.startswith('10') and len(digits) == 10:
            digits = '0' + digits
        
        # 4. 길이 검증 (휴대폰: 11자리, 유선: 9~10자리)
        if len(digits) == 11 and digits[:3] in cls.MOBILE_PREFIXES:
            return digits
        elif len(digits) in [9, 10] and digits.startswith('0'):
            # 유선전화 (02-xxx-xxxx 등)
            return digits
        
        # 5. 복구 불가능한 경우
        return ""
    
    @classmethod
    def format_display(cls, phone: str) -> str:
        """
        표시용 포맷팅 (010-1234-5678)
        """
        normalized = cls.normalize(phone)
        if len(normalized) == 11:
            return f"{normalized[:3]}-{normalized[3:7]}-{normalized[7:]}"
        elif len(normalized) == 10:
            return f"{normalized[:3]}-{normalized[3:6]}-{normalized[6:]}"
        elif len(normalized) == 9:
            return f"{normalized[:2]}-{normalized[2:5]}-{normalized[5:]}"
        return phone
    
    @classmethod
    def is_valid(cls, phone: str) -> bool:
        """유효한 전화번호인지 확인"""
        normalized = cls.normalize(phone)
        return len(normalized) >= 9


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 이름 정제
# ═══════════════════════════════════════════════════════════════════════════════════════════

class NameSanitizer:
    """
    이름 정규화 엔진
    
    처리 대상:
    - 김철수(학부모) → 김철수
    - 이영희 mom → 이영희
    - 박 진수 → 박진수
    - Mr. Kim → Kim
    """
    
    # 제거할 접미사 패턴
    SUFFIX_PATTERNS = [
        r'\s*(학부모|엄마|아빠|부모|보호자|mom|dad|parent)\s*',
        r'\s*(님|씨|선생|원장|대표|사장)\s*',
        r'\([^)]*\)',  # 괄호 안의 모든 내용
        r'\[[^\]]*\]',  # 대괄호 안의 모든 내용
    ]
    
    # 제거할 접두사
    PREFIX_PATTERNS = [
        r'^(Mr\.?|Ms\.?|Mrs\.?)\s*',
        r'^(학생|원생|회원)\s*',
    ]
    
    @classmethod
    def normalize(cls, raw_name: str) -> str:
        """
        이름 정규화
        
        Args:
            raw_name: 원본 이름 문자열
            
        Returns:
            str: 정제된 이름
        """
        if not raw_name:
            return ""
        
        name = str(raw_name).strip()
        
        # 1. 접미사 제거
        for pattern in cls.SUFFIX_PATTERNS:
            name = re.sub(pattern, '', name, flags=re.IGNORECASE)
        
        # 2. 접두사 제거
        for pattern in cls.PREFIX_PATTERNS:
            name = re.sub(pattern, '', name, flags=re.IGNORECASE)
        
        # 3. 불필요한 공백 제거
        name = re.sub(r'\s+', '', name)
        
        # 4. 특수문자 제거 (한글, 영문, 숫자만 유지)
        name = re.sub(r'[^\w가-힣]', '', name)
        
        return name.strip()
    
    @classmethod
    def extract_family_name(cls, name: str) -> str:
        """성씨 추출 (동명이인 비교용)"""
        normalized = cls.normalize(name)
        if normalized and len(normalized) >= 1:
            # 한글 이름: 첫 글자가 성
            if re.match(r'^[가-힣]', normalized):
                return normalized[0]
            # 영문 이름: 전체 반환 (성/이름 구분 어려움)
            return normalized
        return ""


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 중복 매칭 (Fuzzy Matching)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class CustomerRecord:
    """고객 레코드"""
    phone: str
    name: str
    source: str  # 출처 (academy, restaurant, sports 등)
    raw_data: Dict = None
    
    def __post_init__(self):
        self.phone_normalized = PhoneSanitizer.normalize(self.phone)
        self.name_normalized = NameSanitizer.normalize(self.name)
        if self.raw_data is None:
            self.raw_data = {}


class DuplicateMatcher:
    """
    중복 고객 매칭 엔진
    
    전략:
    1. 전화번호 완전 일치 → 동일 인물 확정
    2. 전화번호 없음 + 이름 유사도 90% 이상 → 후보군
    3. 전화번호 1자리 차이 + 이름 동일 → 오타로 추정
    """
    
    SIMILARITY_THRESHOLD = 0.85  # 이름 유사도 기준
    
    @classmethod
    def calculate_similarity(cls, str1: str, str2: str) -> float:
        """두 문자열의 유사도 계산 (0.0 ~ 1.0)"""
        if not str1 or not str2:
            return 0.0
        return SequenceMatcher(None, str1.lower(), str2.lower()).ratio()
    
    @classmethod
    def is_phone_typo(cls, phone1: str, phone2: str) -> bool:
        """
        전화번호 오타 여부 확인 (1자리 차이)
        """
        if len(phone1) != len(phone2):
            return False
        
        diff_count = sum(1 for a, b in zip(phone1, phone2) if a != b)
        return diff_count == 1
    
    @classmethod
    def find_duplicates(
        cls, 
        records: List[CustomerRecord]
    ) -> List[List[CustomerRecord]]:
        """
        중복 레코드 그룹 찾기
        
        Returns:
            List[List[CustomerRecord]]: 같은 사람으로 추정되는 레코드 그룹 목록
        """
        # 전화번호 기준 그룹핑
        phone_groups: Dict[str, List[CustomerRecord]] = {}
        no_phone_records: List[CustomerRecord] = []
        
        for record in records:
            if record.phone_normalized:
                if record.phone_normalized not in phone_groups:
                    phone_groups[record.phone_normalized] = []
                phone_groups[record.phone_normalized].append(record)
            else:
                no_phone_records.append(record)
        
        # 결과 그룹
        duplicate_groups = []
        
        # 1. 전화번호 동일 그룹 (2개 이상)
        for phone, group in phone_groups.items():
            if len(group) >= 2:
                duplicate_groups.append(group)
        
        # 2. 전화번호 없는 레코드 중 이름 유사도 기반 매칭
        matched_indices = set()
        for i, rec1 in enumerate(no_phone_records):
            if i in matched_indices:
                continue
            
            similar_group = [rec1]
            for j, rec2 in enumerate(no_phone_records[i+1:], start=i+1):
                if j in matched_indices:
                    continue
                
                similarity = cls.calculate_similarity(
                    rec1.name_normalized, 
                    rec2.name_normalized
                )
                if similarity >= cls.SIMILARITY_THRESHOLD:
                    similar_group.append(rec2)
                    matched_indices.add(j)
            
            if len(similar_group) >= 2:
                duplicate_groups.append(similar_group)
                matched_indices.add(i)
        
        return duplicate_groups
    
    @classmethod
    def merge_records(cls, records: List[CustomerRecord]) -> CustomerRecord:
        """
        여러 레코드를 하나로 병합
        
        전략:
        - 전화번호: 가장 먼저 나온 유효한 번호
        - 이름: 가장 긴 이름 (정보 손실 최소화)
        - 출처: 모두 기록
        """
        if not records:
            return None
        
        # 유효한 전화번호 찾기
        phone = ""
        for rec in records:
            if rec.phone_normalized:
                phone = rec.phone_normalized
                break
        
        # 가장 긴 이름
        name = max(records, key=lambda r: len(r.name_normalized)).name_normalized
        
        # 출처 합치기
        sources = list(set(rec.source for rec in records))
        
        # raw_data 병합
        merged_data = {}
        for rec in records:
            merged_data.update(rec.raw_data or {})
        merged_data['_sources'] = sources
        merged_data['_merged_count'] = len(records)
        
        return CustomerRecord(
            phone=phone,
            name=name,
            source=','.join(sources),
            raw_data=merged_data
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 통합 세탁기
# ═══════════════════════════════════════════════════════════════════════════════════════════

class DataSanitizer:
    """
    10개 매장 데이터 통합 세탁기
    
    Usage:
        sanitizer = DataSanitizer()
        clean_data = sanitizer.process_all(raw_records)
    """
    
    def __init__(self):
        self.phone_sanitizer = PhoneSanitizer()
        self.name_sanitizer = NameSanitizer()
        self.duplicate_matcher = DuplicateMatcher()
        
        # 처리 통계
        self.stats = {
            "total_input": 0,
            "total_output": 0,
            "duplicates_merged": 0,
            "invalid_phones": 0,
            "sources": set()
        }
    
    def sanitize_record(self, raw: Dict, source: str) -> CustomerRecord:
        """단일 레코드 정제"""
        phone = raw.get('phone', raw.get('전화번호', raw.get('연락처', '')))
        name = raw.get('name', raw.get('이름', raw.get('성명', '')))
        
        return CustomerRecord(
            phone=PhoneSanitizer.normalize(phone),
            name=NameSanitizer.normalize(name),
            source=source,
            raw_data=raw
        )
    
    def process_batch(
        self, 
        records: List[Dict], 
        source: str
    ) -> List[CustomerRecord]:
        """배치 처리"""
        self.stats["sources"].add(source)
        self.stats["total_input"] += len(records)
        
        sanitized = []
        for raw in records:
            record = self.sanitize_record(raw, source)
            
            # 유효성 검사
            if not record.phone_normalized and not record.name_normalized:
                continue  # 둘 다 없으면 스킵
            
            if record.phone and not record.phone_normalized:
                self.stats["invalid_phones"] += 1
            
            sanitized.append(record)
        
        return sanitized
    
    def merge_all(
        self, 
        all_records: List[CustomerRecord]
    ) -> List[CustomerRecord]:
        """모든 레코드 병합"""
        # 1. 중복 그룹 찾기
        duplicate_groups = self.duplicate_matcher.find_duplicates(all_records)
        
        # 2. 병합된 레코드 수집
        merged_phones = set()
        merged_records = []
        
        for group in duplicate_groups:
            merged = self.duplicate_matcher.merge_records(group)
            if merged:
                merged_records.append(merged)
                if merged.phone_normalized:
                    merged_phones.add(merged.phone_normalized)
                self.stats["duplicates_merged"] += len(group) - 1
        
        # 3. 중복 아닌 레코드 추가
        for record in all_records:
            if record.phone_normalized and record.phone_normalized in merged_phones:
                continue
            merged_records.append(record)
        
        self.stats["total_output"] = len(merged_records)
        return merged_records
    
    def get_stats(self) -> Dict:
        """처리 통계 반환"""
        return {
            **self.stats,
            "sources": list(self.stats["sources"]),
            "dedup_rate": f"{(1 - self.stats['total_output'] / max(self.stats['total_input'], 1)) * 100:.1f}%"
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """세탁기 데모"""
    print("=" * 70)
    print("  🧹 AUTUS-TRINITY Data Sanitizer Demo")
    print("=" * 70)
    
    # 테스트 데이터 (10개 매장에서 온 더러운 데이터)
    dirty_data = [
        # 학원
        {"전화번호": "010-1234-5678", "이름": "김철수(학부모)", "source": "academy"},
        {"전화번호": "010.1234.5678", "이름": "김 철수", "source": "academy"},  # 중복
        
        # 식당
        {"phone": "01012345678", "name": "김철수님", "source": "restaurant"},  # 중복
        {"phone": "+82-10-9876-5432", "name": "이영희 mom", "source": "restaurant"},
        
        # 스포츠
        {"연락처": "82-10-5555-1234", "성명": "박진수", "source": "sports"},
        {"연락처": "010-5555-1234", "성명": "박진수", "source": "sports"},  # 중복 (오타 아님)
        
        # 잘못된 데이터
        {"phone": "12345", "name": "", "source": "other"},  # 무효
    ]
    
    sanitizer = DataSanitizer()
    
    # 배치 처리
    records = []
    for data in dirty_data:
        source = data.pop('source', 'unknown')
        rec = sanitizer.sanitize_record(data, source)
        records.append(rec)
        print(f"  {data} → {rec.phone_normalized} | {rec.name_normalized}")
    
    print("\n" + "-" * 70)
    
    # 중복 병합
    merged = sanitizer.merge_all(records)
    
    print(f"\n📊 처리 결과:")
    print(f"  - 입력: {len(dirty_data)}건")
    print(f"  - 출력: {len(merged)}건")
    print(f"  - 중복 병합: {sanitizer.stats['duplicates_merged']}건")
    
    print(f"\n👥 정제된 고객 목록:")
    for rec in merged:
        sources = rec.raw_data.get('_sources', [rec.source])
        print(f"  - {rec.name_normalized} | {PhoneSanitizer.format_display(rec.phone_normalized)} | 출처: {sources}")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()




















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Data Sanitizer                                    ║
║                          데이터 세탁기 - 10개 매장 데이터 정규화                            ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

기능:
1. 전화번호 정규화 (010-1234-5678 → 01012345678)
2. 이름 정제 (김철수(학부모) → 김철수)
3. 중복 제거 (Fuzzy Matching)
4. 국가번호 처리 (82-10-xxx → 010xxx)

입력: 10개 매장의 더러운 엑셀 데이터
출력: 단일 고유 ID로 통합된 깨끗한 데이터
"""

import re
from typing import Optional, List, Dict, Tuple
from dataclasses import dataclass
from difflib import SequenceMatcher


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 전화번호 정규화
# ═══════════════════════════════════════════════════════════════════════════════════════════

class PhoneSanitizer:
    """
    전화번호 정규화 엔진
    
    지원 형식:
    - 010-1234-5678
    - 010.1234.5678
    - 010 1234 5678
    - 01012345678
    - +82-10-1234-5678
    - 82-10-1234-5678
    - 821012345678
    """
    
    # 한국 휴대폰 번호 패턴
    MOBILE_PREFIXES = ['010', '011', '016', '017', '018', '019']
    
    @classmethod
    def normalize(cls, raw_phone: str) -> str:
        """
        어떤 형태의 전화번호든 '01012345678' 형식으로 통일
        
        Args:
            raw_phone: 원본 전화번호 문자열
            
        Returns:
            str: 정규화된 11자리 전화번호 (실패 시 빈 문자열)
        """
        if not raw_phone:
            return ""
        
        # 1. 숫자만 추출
        digits = re.sub(r'[^0-9]', '', str(raw_phone))
        
        if not digits:
            return ""
        
        # 2. 국가번호(82) 처리
        if digits.startswith('820'):
            # 82010... → 010...
            digits = digits[2:]
        elif digits.startswith('82') and len(digits) >= 12:
            # 8210... → 010...
            digits = '0' + digits[2:]
        
        # 3. 앞자리 '0' 누락 보정
        if digits.startswith('10') and len(digits) == 10:
            digits = '0' + digits
        
        # 4. 길이 검증 (휴대폰: 11자리, 유선: 9~10자리)
        if len(digits) == 11 and digits[:3] in cls.MOBILE_PREFIXES:
            return digits
        elif len(digits) in [9, 10] and digits.startswith('0'):
            # 유선전화 (02-xxx-xxxx 등)
            return digits
        
        # 5. 복구 불가능한 경우
        return ""
    
    @classmethod
    def format_display(cls, phone: str) -> str:
        """
        표시용 포맷팅 (010-1234-5678)
        """
        normalized = cls.normalize(phone)
        if len(normalized) == 11:
            return f"{normalized[:3]}-{normalized[3:7]}-{normalized[7:]}"
        elif len(normalized) == 10:
            return f"{normalized[:3]}-{normalized[3:6]}-{normalized[6:]}"
        elif len(normalized) == 9:
            return f"{normalized[:2]}-{normalized[2:5]}-{normalized[5:]}"
        return phone
    
    @classmethod
    def is_valid(cls, phone: str) -> bool:
        """유효한 전화번호인지 확인"""
        normalized = cls.normalize(phone)
        return len(normalized) >= 9


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 이름 정제
# ═══════════════════════════════════════════════════════════════════════════════════════════

class NameSanitizer:
    """
    이름 정규화 엔진
    
    처리 대상:
    - 김철수(학부모) → 김철수
    - 이영희 mom → 이영희
    - 박 진수 → 박진수
    - Mr. Kim → Kim
    """
    
    # 제거할 접미사 패턴
    SUFFIX_PATTERNS = [
        r'\s*(학부모|엄마|아빠|부모|보호자|mom|dad|parent)\s*',
        r'\s*(님|씨|선생|원장|대표|사장)\s*',
        r'\([^)]*\)',  # 괄호 안의 모든 내용
        r'\[[^\]]*\]',  # 대괄호 안의 모든 내용
    ]
    
    # 제거할 접두사
    PREFIX_PATTERNS = [
        r'^(Mr\.?|Ms\.?|Mrs\.?)\s*',
        r'^(학생|원생|회원)\s*',
    ]
    
    @classmethod
    def normalize(cls, raw_name: str) -> str:
        """
        이름 정규화
        
        Args:
            raw_name: 원본 이름 문자열
            
        Returns:
            str: 정제된 이름
        """
        if not raw_name:
            return ""
        
        name = str(raw_name).strip()
        
        # 1. 접미사 제거
        for pattern in cls.SUFFIX_PATTERNS:
            name = re.sub(pattern, '', name, flags=re.IGNORECASE)
        
        # 2. 접두사 제거
        for pattern in cls.PREFIX_PATTERNS:
            name = re.sub(pattern, '', name, flags=re.IGNORECASE)
        
        # 3. 불필요한 공백 제거
        name = re.sub(r'\s+', '', name)
        
        # 4. 특수문자 제거 (한글, 영문, 숫자만 유지)
        name = re.sub(r'[^\w가-힣]', '', name)
        
        return name.strip()
    
    @classmethod
    def extract_family_name(cls, name: str) -> str:
        """성씨 추출 (동명이인 비교용)"""
        normalized = cls.normalize(name)
        if normalized and len(normalized) >= 1:
            # 한글 이름: 첫 글자가 성
            if re.match(r'^[가-힣]', normalized):
                return normalized[0]
            # 영문 이름: 전체 반환 (성/이름 구분 어려움)
            return normalized
        return ""


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 중복 매칭 (Fuzzy Matching)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class CustomerRecord:
    """고객 레코드"""
    phone: str
    name: str
    source: str  # 출처 (academy, restaurant, sports 등)
    raw_data: Dict = None
    
    def __post_init__(self):
        self.phone_normalized = PhoneSanitizer.normalize(self.phone)
        self.name_normalized = NameSanitizer.normalize(self.name)
        if self.raw_data is None:
            self.raw_data = {}


class DuplicateMatcher:
    """
    중복 고객 매칭 엔진
    
    전략:
    1. 전화번호 완전 일치 → 동일 인물 확정
    2. 전화번호 없음 + 이름 유사도 90% 이상 → 후보군
    3. 전화번호 1자리 차이 + 이름 동일 → 오타로 추정
    """
    
    SIMILARITY_THRESHOLD = 0.85  # 이름 유사도 기준
    
    @classmethod
    def calculate_similarity(cls, str1: str, str2: str) -> float:
        """두 문자열의 유사도 계산 (0.0 ~ 1.0)"""
        if not str1 or not str2:
            return 0.0
        return SequenceMatcher(None, str1.lower(), str2.lower()).ratio()
    
    @classmethod
    def is_phone_typo(cls, phone1: str, phone2: str) -> bool:
        """
        전화번호 오타 여부 확인 (1자리 차이)
        """
        if len(phone1) != len(phone2):
            return False
        
        diff_count = sum(1 for a, b in zip(phone1, phone2) if a != b)
        return diff_count == 1
    
    @classmethod
    def find_duplicates(
        cls, 
        records: List[CustomerRecord]
    ) -> List[List[CustomerRecord]]:
        """
        중복 레코드 그룹 찾기
        
        Returns:
            List[List[CustomerRecord]]: 같은 사람으로 추정되는 레코드 그룹 목록
        """
        # 전화번호 기준 그룹핑
        phone_groups: Dict[str, List[CustomerRecord]] = {}
        no_phone_records: List[CustomerRecord] = []
        
        for record in records:
            if record.phone_normalized:
                if record.phone_normalized not in phone_groups:
                    phone_groups[record.phone_normalized] = []
                phone_groups[record.phone_normalized].append(record)
            else:
                no_phone_records.append(record)
        
        # 결과 그룹
        duplicate_groups = []
        
        # 1. 전화번호 동일 그룹 (2개 이상)
        for phone, group in phone_groups.items():
            if len(group) >= 2:
                duplicate_groups.append(group)
        
        # 2. 전화번호 없는 레코드 중 이름 유사도 기반 매칭
        matched_indices = set()
        for i, rec1 in enumerate(no_phone_records):
            if i in matched_indices:
                continue
            
            similar_group = [rec1]
            for j, rec2 in enumerate(no_phone_records[i+1:], start=i+1):
                if j in matched_indices:
                    continue
                
                similarity = cls.calculate_similarity(
                    rec1.name_normalized, 
                    rec2.name_normalized
                )
                if similarity >= cls.SIMILARITY_THRESHOLD:
                    similar_group.append(rec2)
                    matched_indices.add(j)
            
            if len(similar_group) >= 2:
                duplicate_groups.append(similar_group)
                matched_indices.add(i)
        
        return duplicate_groups
    
    @classmethod
    def merge_records(cls, records: List[CustomerRecord]) -> CustomerRecord:
        """
        여러 레코드를 하나로 병합
        
        전략:
        - 전화번호: 가장 먼저 나온 유효한 번호
        - 이름: 가장 긴 이름 (정보 손실 최소화)
        - 출처: 모두 기록
        """
        if not records:
            return None
        
        # 유효한 전화번호 찾기
        phone = ""
        for rec in records:
            if rec.phone_normalized:
                phone = rec.phone_normalized
                break
        
        # 가장 긴 이름
        name = max(records, key=lambda r: len(r.name_normalized)).name_normalized
        
        # 출처 합치기
        sources = list(set(rec.source for rec in records))
        
        # raw_data 병합
        merged_data = {}
        for rec in records:
            merged_data.update(rec.raw_data or {})
        merged_data['_sources'] = sources
        merged_data['_merged_count'] = len(records)
        
        return CustomerRecord(
            phone=phone,
            name=name,
            source=','.join(sources),
            raw_data=merged_data
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 통합 세탁기
# ═══════════════════════════════════════════════════════════════════════════════════════════

class DataSanitizer:
    """
    10개 매장 데이터 통합 세탁기
    
    Usage:
        sanitizer = DataSanitizer()
        clean_data = sanitizer.process_all(raw_records)
    """
    
    def __init__(self):
        self.phone_sanitizer = PhoneSanitizer()
        self.name_sanitizer = NameSanitizer()
        self.duplicate_matcher = DuplicateMatcher()
        
        # 처리 통계
        self.stats = {
            "total_input": 0,
            "total_output": 0,
            "duplicates_merged": 0,
            "invalid_phones": 0,
            "sources": set()
        }
    
    def sanitize_record(self, raw: Dict, source: str) -> CustomerRecord:
        """단일 레코드 정제"""
        phone = raw.get('phone', raw.get('전화번호', raw.get('연락처', '')))
        name = raw.get('name', raw.get('이름', raw.get('성명', '')))
        
        return CustomerRecord(
            phone=PhoneSanitizer.normalize(phone),
            name=NameSanitizer.normalize(name),
            source=source,
            raw_data=raw
        )
    
    def process_batch(
        self, 
        records: List[Dict], 
        source: str
    ) -> List[CustomerRecord]:
        """배치 처리"""
        self.stats["sources"].add(source)
        self.stats["total_input"] += len(records)
        
        sanitized = []
        for raw in records:
            record = self.sanitize_record(raw, source)
            
            # 유효성 검사
            if not record.phone_normalized and not record.name_normalized:
                continue  # 둘 다 없으면 스킵
            
            if record.phone and not record.phone_normalized:
                self.stats["invalid_phones"] += 1
            
            sanitized.append(record)
        
        return sanitized
    
    def merge_all(
        self, 
        all_records: List[CustomerRecord]
    ) -> List[CustomerRecord]:
        """모든 레코드 병합"""
        # 1. 중복 그룹 찾기
        duplicate_groups = self.duplicate_matcher.find_duplicates(all_records)
        
        # 2. 병합된 레코드 수집
        merged_phones = set()
        merged_records = []
        
        for group in duplicate_groups:
            merged = self.duplicate_matcher.merge_records(group)
            if merged:
                merged_records.append(merged)
                if merged.phone_normalized:
                    merged_phones.add(merged.phone_normalized)
                self.stats["duplicates_merged"] += len(group) - 1
        
        # 3. 중복 아닌 레코드 추가
        for record in all_records:
            if record.phone_normalized and record.phone_normalized in merged_phones:
                continue
            merged_records.append(record)
        
        self.stats["total_output"] = len(merged_records)
        return merged_records
    
    def get_stats(self) -> Dict:
        """처리 통계 반환"""
        return {
            **self.stats,
            "sources": list(self.stats["sources"]),
            "dedup_rate": f"{(1 - self.stats['total_output'] / max(self.stats['total_input'], 1)) * 100:.1f}%"
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """세탁기 데모"""
    print("=" * 70)
    print("  🧹 AUTUS-TRINITY Data Sanitizer Demo")
    print("=" * 70)
    
    # 테스트 데이터 (10개 매장에서 온 더러운 데이터)
    dirty_data = [
        # 학원
        {"전화번호": "010-1234-5678", "이름": "김철수(학부모)", "source": "academy"},
        {"전화번호": "010.1234.5678", "이름": "김 철수", "source": "academy"},  # 중복
        
        # 식당
        {"phone": "01012345678", "name": "김철수님", "source": "restaurant"},  # 중복
        {"phone": "+82-10-9876-5432", "name": "이영희 mom", "source": "restaurant"},
        
        # 스포츠
        {"연락처": "82-10-5555-1234", "성명": "박진수", "source": "sports"},
        {"연락처": "010-5555-1234", "성명": "박진수", "source": "sports"},  # 중복 (오타 아님)
        
        # 잘못된 데이터
        {"phone": "12345", "name": "", "source": "other"},  # 무효
    ]
    
    sanitizer = DataSanitizer()
    
    # 배치 처리
    records = []
    for data in dirty_data:
        source = data.pop('source', 'unknown')
        rec = sanitizer.sanitize_record(data, source)
        records.append(rec)
        print(f"  {data} → {rec.phone_normalized} | {rec.name_normalized}")
    
    print("\n" + "-" * 70)
    
    # 중복 병합
    merged = sanitizer.merge_all(records)
    
    print(f"\n📊 처리 결과:")
    print(f"  - 입력: {len(dirty_data)}건")
    print(f"  - 출력: {len(merged)}건")
    print(f"  - 중복 병합: {sanitizer.stats['duplicates_merged']}건")
    
    print(f"\n👥 정제된 고객 목록:")
    for rec in merged:
        sources = rec.raw_data.get('_sources', [rec.source])
        print(f"  - {rec.name_normalized} | {PhoneSanitizer.format_display(rec.phone_normalized)} | 출처: {sources}")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Data Sanitizer                                    ║
║                          데이터 세탁기 - 10개 매장 데이터 정규화                            ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

기능:
1. 전화번호 정규화 (010-1234-5678 → 01012345678)
2. 이름 정제 (김철수(학부모) → 김철수)
3. 중복 제거 (Fuzzy Matching)
4. 국가번호 처리 (82-10-xxx → 010xxx)

입력: 10개 매장의 더러운 엑셀 데이터
출력: 단일 고유 ID로 통합된 깨끗한 데이터
"""

import re
from typing import Optional, List, Dict, Tuple
from dataclasses import dataclass
from difflib import SequenceMatcher


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 전화번호 정규화
# ═══════════════════════════════════════════════════════════════════════════════════════════

class PhoneSanitizer:
    """
    전화번호 정규화 엔진
    
    지원 형식:
    - 010-1234-5678
    - 010.1234.5678
    - 010 1234 5678
    - 01012345678
    - +82-10-1234-5678
    - 82-10-1234-5678
    - 821012345678
    """
    
    # 한국 휴대폰 번호 패턴
    MOBILE_PREFIXES = ['010', '011', '016', '017', '018', '019']
    
    @classmethod
    def normalize(cls, raw_phone: str) -> str:
        """
        어떤 형태의 전화번호든 '01012345678' 형식으로 통일
        
        Args:
            raw_phone: 원본 전화번호 문자열
            
        Returns:
            str: 정규화된 11자리 전화번호 (실패 시 빈 문자열)
        """
        if not raw_phone:
            return ""
        
        # 1. 숫자만 추출
        digits = re.sub(r'[^0-9]', '', str(raw_phone))
        
        if not digits:
            return ""
        
        # 2. 국가번호(82) 처리
        if digits.startswith('820'):
            # 82010... → 010...
            digits = digits[2:]
        elif digits.startswith('82') and len(digits) >= 12:
            # 8210... → 010...
            digits = '0' + digits[2:]
        
        # 3. 앞자리 '0' 누락 보정
        if digits.startswith('10') and len(digits) == 10:
            digits = '0' + digits
        
        # 4. 길이 검증 (휴대폰: 11자리, 유선: 9~10자리)
        if len(digits) == 11 and digits[:3] in cls.MOBILE_PREFIXES:
            return digits
        elif len(digits) in [9, 10] and digits.startswith('0'):
            # 유선전화 (02-xxx-xxxx 등)
            return digits
        
        # 5. 복구 불가능한 경우
        return ""
    
    @classmethod
    def format_display(cls, phone: str) -> str:
        """
        표시용 포맷팅 (010-1234-5678)
        """
        normalized = cls.normalize(phone)
        if len(normalized) == 11:
            return f"{normalized[:3]}-{normalized[3:7]}-{normalized[7:]}"
        elif len(normalized) == 10:
            return f"{normalized[:3]}-{normalized[3:6]}-{normalized[6:]}"
        elif len(normalized) == 9:
            return f"{normalized[:2]}-{normalized[2:5]}-{normalized[5:]}"
        return phone
    
    @classmethod
    def is_valid(cls, phone: str) -> bool:
        """유효한 전화번호인지 확인"""
        normalized = cls.normalize(phone)
        return len(normalized) >= 9


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 이름 정제
# ═══════════════════════════════════════════════════════════════════════════════════════════

class NameSanitizer:
    """
    이름 정규화 엔진
    
    처리 대상:
    - 김철수(학부모) → 김철수
    - 이영희 mom → 이영희
    - 박 진수 → 박진수
    - Mr. Kim → Kim
    """
    
    # 제거할 접미사 패턴
    SUFFIX_PATTERNS = [
        r'\s*(학부모|엄마|아빠|부모|보호자|mom|dad|parent)\s*',
        r'\s*(님|씨|선생|원장|대표|사장)\s*',
        r'\([^)]*\)',  # 괄호 안의 모든 내용
        r'\[[^\]]*\]',  # 대괄호 안의 모든 내용
    ]
    
    # 제거할 접두사
    PREFIX_PATTERNS = [
        r'^(Mr\.?|Ms\.?|Mrs\.?)\s*',
        r'^(학생|원생|회원)\s*',
    ]
    
    @classmethod
    def normalize(cls, raw_name: str) -> str:
        """
        이름 정규화
        
        Args:
            raw_name: 원본 이름 문자열
            
        Returns:
            str: 정제된 이름
        """
        if not raw_name:
            return ""
        
        name = str(raw_name).strip()
        
        # 1. 접미사 제거
        for pattern in cls.SUFFIX_PATTERNS:
            name = re.sub(pattern, '', name, flags=re.IGNORECASE)
        
        # 2. 접두사 제거
        for pattern in cls.PREFIX_PATTERNS:
            name = re.sub(pattern, '', name, flags=re.IGNORECASE)
        
        # 3. 불필요한 공백 제거
        name = re.sub(r'\s+', '', name)
        
        # 4. 특수문자 제거 (한글, 영문, 숫자만 유지)
        name = re.sub(r'[^\w가-힣]', '', name)
        
        return name.strip()
    
    @classmethod
    def extract_family_name(cls, name: str) -> str:
        """성씨 추출 (동명이인 비교용)"""
        normalized = cls.normalize(name)
        if normalized and len(normalized) >= 1:
            # 한글 이름: 첫 글자가 성
            if re.match(r'^[가-힣]', normalized):
                return normalized[0]
            # 영문 이름: 전체 반환 (성/이름 구분 어려움)
            return normalized
        return ""


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 중복 매칭 (Fuzzy Matching)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class CustomerRecord:
    """고객 레코드"""
    phone: str
    name: str
    source: str  # 출처 (academy, restaurant, sports 등)
    raw_data: Dict = None
    
    def __post_init__(self):
        self.phone_normalized = PhoneSanitizer.normalize(self.phone)
        self.name_normalized = NameSanitizer.normalize(self.name)
        if self.raw_data is None:
            self.raw_data = {}


class DuplicateMatcher:
    """
    중복 고객 매칭 엔진
    
    전략:
    1. 전화번호 완전 일치 → 동일 인물 확정
    2. 전화번호 없음 + 이름 유사도 90% 이상 → 후보군
    3. 전화번호 1자리 차이 + 이름 동일 → 오타로 추정
    """
    
    SIMILARITY_THRESHOLD = 0.85  # 이름 유사도 기준
    
    @classmethod
    def calculate_similarity(cls, str1: str, str2: str) -> float:
        """두 문자열의 유사도 계산 (0.0 ~ 1.0)"""
        if not str1 or not str2:
            return 0.0
        return SequenceMatcher(None, str1.lower(), str2.lower()).ratio()
    
    @classmethod
    def is_phone_typo(cls, phone1: str, phone2: str) -> bool:
        """
        전화번호 오타 여부 확인 (1자리 차이)
        """
        if len(phone1) != len(phone2):
            return False
        
        diff_count = sum(1 for a, b in zip(phone1, phone2) if a != b)
        return diff_count == 1
    
    @classmethod
    def find_duplicates(
        cls, 
        records: List[CustomerRecord]
    ) -> List[List[CustomerRecord]]:
        """
        중복 레코드 그룹 찾기
        
        Returns:
            List[List[CustomerRecord]]: 같은 사람으로 추정되는 레코드 그룹 목록
        """
        # 전화번호 기준 그룹핑
        phone_groups: Dict[str, List[CustomerRecord]] = {}
        no_phone_records: List[CustomerRecord] = []
        
        for record in records:
            if record.phone_normalized:
                if record.phone_normalized not in phone_groups:
                    phone_groups[record.phone_normalized] = []
                phone_groups[record.phone_normalized].append(record)
            else:
                no_phone_records.append(record)
        
        # 결과 그룹
        duplicate_groups = []
        
        # 1. 전화번호 동일 그룹 (2개 이상)
        for phone, group in phone_groups.items():
            if len(group) >= 2:
                duplicate_groups.append(group)
        
        # 2. 전화번호 없는 레코드 중 이름 유사도 기반 매칭
        matched_indices = set()
        for i, rec1 in enumerate(no_phone_records):
            if i in matched_indices:
                continue
            
            similar_group = [rec1]
            for j, rec2 in enumerate(no_phone_records[i+1:], start=i+1):
                if j in matched_indices:
                    continue
                
                similarity = cls.calculate_similarity(
                    rec1.name_normalized, 
                    rec2.name_normalized
                )
                if similarity >= cls.SIMILARITY_THRESHOLD:
                    similar_group.append(rec2)
                    matched_indices.add(j)
            
            if len(similar_group) >= 2:
                duplicate_groups.append(similar_group)
                matched_indices.add(i)
        
        return duplicate_groups
    
    @classmethod
    def merge_records(cls, records: List[CustomerRecord]) -> CustomerRecord:
        """
        여러 레코드를 하나로 병합
        
        전략:
        - 전화번호: 가장 먼저 나온 유효한 번호
        - 이름: 가장 긴 이름 (정보 손실 최소화)
        - 출처: 모두 기록
        """
        if not records:
            return None
        
        # 유효한 전화번호 찾기
        phone = ""
        for rec in records:
            if rec.phone_normalized:
                phone = rec.phone_normalized
                break
        
        # 가장 긴 이름
        name = max(records, key=lambda r: len(r.name_normalized)).name_normalized
        
        # 출처 합치기
        sources = list(set(rec.source for rec in records))
        
        # raw_data 병합
        merged_data = {}
        for rec in records:
            merged_data.update(rec.raw_data or {})
        merged_data['_sources'] = sources
        merged_data['_merged_count'] = len(records)
        
        return CustomerRecord(
            phone=phone,
            name=name,
            source=','.join(sources),
            raw_data=merged_data
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 통합 세탁기
# ═══════════════════════════════════════════════════════════════════════════════════════════

class DataSanitizer:
    """
    10개 매장 데이터 통합 세탁기
    
    Usage:
        sanitizer = DataSanitizer()
        clean_data = sanitizer.process_all(raw_records)
    """
    
    def __init__(self):
        self.phone_sanitizer = PhoneSanitizer()
        self.name_sanitizer = NameSanitizer()
        self.duplicate_matcher = DuplicateMatcher()
        
        # 처리 통계
        self.stats = {
            "total_input": 0,
            "total_output": 0,
            "duplicates_merged": 0,
            "invalid_phones": 0,
            "sources": set()
        }
    
    def sanitize_record(self, raw: Dict, source: str) -> CustomerRecord:
        """단일 레코드 정제"""
        phone = raw.get('phone', raw.get('전화번호', raw.get('연락처', '')))
        name = raw.get('name', raw.get('이름', raw.get('성명', '')))
        
        return CustomerRecord(
            phone=PhoneSanitizer.normalize(phone),
            name=NameSanitizer.normalize(name),
            source=source,
            raw_data=raw
        )
    
    def process_batch(
        self, 
        records: List[Dict], 
        source: str
    ) -> List[CustomerRecord]:
        """배치 처리"""
        self.stats["sources"].add(source)
        self.stats["total_input"] += len(records)
        
        sanitized = []
        for raw in records:
            record = self.sanitize_record(raw, source)
            
            # 유효성 검사
            if not record.phone_normalized and not record.name_normalized:
                continue  # 둘 다 없으면 스킵
            
            if record.phone and not record.phone_normalized:
                self.stats["invalid_phones"] += 1
            
            sanitized.append(record)
        
        return sanitized
    
    def merge_all(
        self, 
        all_records: List[CustomerRecord]
    ) -> List[CustomerRecord]:
        """모든 레코드 병합"""
        # 1. 중복 그룹 찾기
        duplicate_groups = self.duplicate_matcher.find_duplicates(all_records)
        
        # 2. 병합된 레코드 수집
        merged_phones = set()
        merged_records = []
        
        for group in duplicate_groups:
            merged = self.duplicate_matcher.merge_records(group)
            if merged:
                merged_records.append(merged)
                if merged.phone_normalized:
                    merged_phones.add(merged.phone_normalized)
                self.stats["duplicates_merged"] += len(group) - 1
        
        # 3. 중복 아닌 레코드 추가
        for record in all_records:
            if record.phone_normalized and record.phone_normalized in merged_phones:
                continue
            merged_records.append(record)
        
        self.stats["total_output"] = len(merged_records)
        return merged_records
    
    def get_stats(self) -> Dict:
        """처리 통계 반환"""
        return {
            **self.stats,
            "sources": list(self.stats["sources"]),
            "dedup_rate": f"{(1 - self.stats['total_output'] / max(self.stats['total_input'], 1)) * 100:.1f}%"
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """세탁기 데모"""
    print("=" * 70)
    print("  🧹 AUTUS-TRINITY Data Sanitizer Demo")
    print("=" * 70)
    
    # 테스트 데이터 (10개 매장에서 온 더러운 데이터)
    dirty_data = [
        # 학원
        {"전화번호": "010-1234-5678", "이름": "김철수(학부모)", "source": "academy"},
        {"전화번호": "010.1234.5678", "이름": "김 철수", "source": "academy"},  # 중복
        
        # 식당
        {"phone": "01012345678", "name": "김철수님", "source": "restaurant"},  # 중복
        {"phone": "+82-10-9876-5432", "name": "이영희 mom", "source": "restaurant"},
        
        # 스포츠
        {"연락처": "82-10-5555-1234", "성명": "박진수", "source": "sports"},
        {"연락처": "010-5555-1234", "성명": "박진수", "source": "sports"},  # 중복 (오타 아님)
        
        # 잘못된 데이터
        {"phone": "12345", "name": "", "source": "other"},  # 무효
    ]
    
    sanitizer = DataSanitizer()
    
    # 배치 처리
    records = []
    for data in dirty_data:
        source = data.pop('source', 'unknown')
        rec = sanitizer.sanitize_record(data, source)
        records.append(rec)
        print(f"  {data} → {rec.phone_normalized} | {rec.name_normalized}")
    
    print("\n" + "-" * 70)
    
    # 중복 병합
    merged = sanitizer.merge_all(records)
    
    print(f"\n📊 처리 결과:")
    print(f"  - 입력: {len(dirty_data)}건")
    print(f"  - 출력: {len(merged)}건")
    print(f"  - 중복 병합: {sanitizer.stats['duplicates_merged']}건")
    
    print(f"\n👥 정제된 고객 목록:")
    for rec in merged:
        sources = rec.raw_data.get('_sources', [rec.source])
        print(f"  - {rec.name_normalized} | {PhoneSanitizer.format_display(rec.phone_normalized)} | 출처: {sources}")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Data Sanitizer                                    ║
║                          데이터 세탁기 - 10개 매장 데이터 정규화                            ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

기능:
1. 전화번호 정규화 (010-1234-5678 → 01012345678)
2. 이름 정제 (김철수(학부모) → 김철수)
3. 중복 제거 (Fuzzy Matching)
4. 국가번호 처리 (82-10-xxx → 010xxx)

입력: 10개 매장의 더러운 엑셀 데이터
출력: 단일 고유 ID로 통합된 깨끗한 데이터
"""

import re
from typing import Optional, List, Dict, Tuple
from dataclasses import dataclass
from difflib import SequenceMatcher


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 전화번호 정규화
# ═══════════════════════════════════════════════════════════════════════════════════════════

class PhoneSanitizer:
    """
    전화번호 정규화 엔진
    
    지원 형식:
    - 010-1234-5678
    - 010.1234.5678
    - 010 1234 5678
    - 01012345678
    - +82-10-1234-5678
    - 82-10-1234-5678
    - 821012345678
    """
    
    # 한국 휴대폰 번호 패턴
    MOBILE_PREFIXES = ['010', '011', '016', '017', '018', '019']
    
    @classmethod
    def normalize(cls, raw_phone: str) -> str:
        """
        어떤 형태의 전화번호든 '01012345678' 형식으로 통일
        
        Args:
            raw_phone: 원본 전화번호 문자열
            
        Returns:
            str: 정규화된 11자리 전화번호 (실패 시 빈 문자열)
        """
        if not raw_phone:
            return ""
        
        # 1. 숫자만 추출
        digits = re.sub(r'[^0-9]', '', str(raw_phone))
        
        if not digits:
            return ""
        
        # 2. 국가번호(82) 처리
        if digits.startswith('820'):
            # 82010... → 010...
            digits = digits[2:]
        elif digits.startswith('82') and len(digits) >= 12:
            # 8210... → 010...
            digits = '0' + digits[2:]
        
        # 3. 앞자리 '0' 누락 보정
        if digits.startswith('10') and len(digits) == 10:
            digits = '0' + digits
        
        # 4. 길이 검증 (휴대폰: 11자리, 유선: 9~10자리)
        if len(digits) == 11 and digits[:3] in cls.MOBILE_PREFIXES:
            return digits
        elif len(digits) in [9, 10] and digits.startswith('0'):
            # 유선전화 (02-xxx-xxxx 등)
            return digits
        
        # 5. 복구 불가능한 경우
        return ""
    
    @classmethod
    def format_display(cls, phone: str) -> str:
        """
        표시용 포맷팅 (010-1234-5678)
        """
        normalized = cls.normalize(phone)
        if len(normalized) == 11:
            return f"{normalized[:3]}-{normalized[3:7]}-{normalized[7:]}"
        elif len(normalized) == 10:
            return f"{normalized[:3]}-{normalized[3:6]}-{normalized[6:]}"
        elif len(normalized) == 9:
            return f"{normalized[:2]}-{normalized[2:5]}-{normalized[5:]}"
        return phone
    
    @classmethod
    def is_valid(cls, phone: str) -> bool:
        """유효한 전화번호인지 확인"""
        normalized = cls.normalize(phone)
        return len(normalized) >= 9


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 이름 정제
# ═══════════════════════════════════════════════════════════════════════════════════════════

class NameSanitizer:
    """
    이름 정규화 엔진
    
    처리 대상:
    - 김철수(학부모) → 김철수
    - 이영희 mom → 이영희
    - 박 진수 → 박진수
    - Mr. Kim → Kim
    """
    
    # 제거할 접미사 패턴
    SUFFIX_PATTERNS = [
        r'\s*(학부모|엄마|아빠|부모|보호자|mom|dad|parent)\s*',
        r'\s*(님|씨|선생|원장|대표|사장)\s*',
        r'\([^)]*\)',  # 괄호 안의 모든 내용
        r'\[[^\]]*\]',  # 대괄호 안의 모든 내용
    ]
    
    # 제거할 접두사
    PREFIX_PATTERNS = [
        r'^(Mr\.?|Ms\.?|Mrs\.?)\s*',
        r'^(학생|원생|회원)\s*',
    ]
    
    @classmethod
    def normalize(cls, raw_name: str) -> str:
        """
        이름 정규화
        
        Args:
            raw_name: 원본 이름 문자열
            
        Returns:
            str: 정제된 이름
        """
        if not raw_name:
            return ""
        
        name = str(raw_name).strip()
        
        # 1. 접미사 제거
        for pattern in cls.SUFFIX_PATTERNS:
            name = re.sub(pattern, '', name, flags=re.IGNORECASE)
        
        # 2. 접두사 제거
        for pattern in cls.PREFIX_PATTERNS:
            name = re.sub(pattern, '', name, flags=re.IGNORECASE)
        
        # 3. 불필요한 공백 제거
        name = re.sub(r'\s+', '', name)
        
        # 4. 특수문자 제거 (한글, 영문, 숫자만 유지)
        name = re.sub(r'[^\w가-힣]', '', name)
        
        return name.strip()
    
    @classmethod
    def extract_family_name(cls, name: str) -> str:
        """성씨 추출 (동명이인 비교용)"""
        normalized = cls.normalize(name)
        if normalized and len(normalized) >= 1:
            # 한글 이름: 첫 글자가 성
            if re.match(r'^[가-힣]', normalized):
                return normalized[0]
            # 영문 이름: 전체 반환 (성/이름 구분 어려움)
            return normalized
        return ""


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 중복 매칭 (Fuzzy Matching)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class CustomerRecord:
    """고객 레코드"""
    phone: str
    name: str
    source: str  # 출처 (academy, restaurant, sports 등)
    raw_data: Dict = None
    
    def __post_init__(self):
        self.phone_normalized = PhoneSanitizer.normalize(self.phone)
        self.name_normalized = NameSanitizer.normalize(self.name)
        if self.raw_data is None:
            self.raw_data = {}


class DuplicateMatcher:
    """
    중복 고객 매칭 엔진
    
    전략:
    1. 전화번호 완전 일치 → 동일 인물 확정
    2. 전화번호 없음 + 이름 유사도 90% 이상 → 후보군
    3. 전화번호 1자리 차이 + 이름 동일 → 오타로 추정
    """
    
    SIMILARITY_THRESHOLD = 0.85  # 이름 유사도 기준
    
    @classmethod
    def calculate_similarity(cls, str1: str, str2: str) -> float:
        """두 문자열의 유사도 계산 (0.0 ~ 1.0)"""
        if not str1 or not str2:
            return 0.0
        return SequenceMatcher(None, str1.lower(), str2.lower()).ratio()
    
    @classmethod
    def is_phone_typo(cls, phone1: str, phone2: str) -> bool:
        """
        전화번호 오타 여부 확인 (1자리 차이)
        """
        if len(phone1) != len(phone2):
            return False
        
        diff_count = sum(1 for a, b in zip(phone1, phone2) if a != b)
        return diff_count == 1
    
    @classmethod
    def find_duplicates(
        cls, 
        records: List[CustomerRecord]
    ) -> List[List[CustomerRecord]]:
        """
        중복 레코드 그룹 찾기
        
        Returns:
            List[List[CustomerRecord]]: 같은 사람으로 추정되는 레코드 그룹 목록
        """
        # 전화번호 기준 그룹핑
        phone_groups: Dict[str, List[CustomerRecord]] = {}
        no_phone_records: List[CustomerRecord] = []
        
        for record in records:
            if record.phone_normalized:
                if record.phone_normalized not in phone_groups:
                    phone_groups[record.phone_normalized] = []
                phone_groups[record.phone_normalized].append(record)
            else:
                no_phone_records.append(record)
        
        # 결과 그룹
        duplicate_groups = []
        
        # 1. 전화번호 동일 그룹 (2개 이상)
        for phone, group in phone_groups.items():
            if len(group) >= 2:
                duplicate_groups.append(group)
        
        # 2. 전화번호 없는 레코드 중 이름 유사도 기반 매칭
        matched_indices = set()
        for i, rec1 in enumerate(no_phone_records):
            if i in matched_indices:
                continue
            
            similar_group = [rec1]
            for j, rec2 in enumerate(no_phone_records[i+1:], start=i+1):
                if j in matched_indices:
                    continue
                
                similarity = cls.calculate_similarity(
                    rec1.name_normalized, 
                    rec2.name_normalized
                )
                if similarity >= cls.SIMILARITY_THRESHOLD:
                    similar_group.append(rec2)
                    matched_indices.add(j)
            
            if len(similar_group) >= 2:
                duplicate_groups.append(similar_group)
                matched_indices.add(i)
        
        return duplicate_groups
    
    @classmethod
    def merge_records(cls, records: List[CustomerRecord]) -> CustomerRecord:
        """
        여러 레코드를 하나로 병합
        
        전략:
        - 전화번호: 가장 먼저 나온 유효한 번호
        - 이름: 가장 긴 이름 (정보 손실 최소화)
        - 출처: 모두 기록
        """
        if not records:
            return None
        
        # 유효한 전화번호 찾기
        phone = ""
        for rec in records:
            if rec.phone_normalized:
                phone = rec.phone_normalized
                break
        
        # 가장 긴 이름
        name = max(records, key=lambda r: len(r.name_normalized)).name_normalized
        
        # 출처 합치기
        sources = list(set(rec.source for rec in records))
        
        # raw_data 병합
        merged_data = {}
        for rec in records:
            merged_data.update(rec.raw_data or {})
        merged_data['_sources'] = sources
        merged_data['_merged_count'] = len(records)
        
        return CustomerRecord(
            phone=phone,
            name=name,
            source=','.join(sources),
            raw_data=merged_data
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 통합 세탁기
# ═══════════════════════════════════════════════════════════════════════════════════════════

class DataSanitizer:
    """
    10개 매장 데이터 통합 세탁기
    
    Usage:
        sanitizer = DataSanitizer()
        clean_data = sanitizer.process_all(raw_records)
    """
    
    def __init__(self):
        self.phone_sanitizer = PhoneSanitizer()
        self.name_sanitizer = NameSanitizer()
        self.duplicate_matcher = DuplicateMatcher()
        
        # 처리 통계
        self.stats = {
            "total_input": 0,
            "total_output": 0,
            "duplicates_merged": 0,
            "invalid_phones": 0,
            "sources": set()
        }
    
    def sanitize_record(self, raw: Dict, source: str) -> CustomerRecord:
        """단일 레코드 정제"""
        phone = raw.get('phone', raw.get('전화번호', raw.get('연락처', '')))
        name = raw.get('name', raw.get('이름', raw.get('성명', '')))
        
        return CustomerRecord(
            phone=PhoneSanitizer.normalize(phone),
            name=NameSanitizer.normalize(name),
            source=source,
            raw_data=raw
        )
    
    def process_batch(
        self, 
        records: List[Dict], 
        source: str
    ) -> List[CustomerRecord]:
        """배치 처리"""
        self.stats["sources"].add(source)
        self.stats["total_input"] += len(records)
        
        sanitized = []
        for raw in records:
            record = self.sanitize_record(raw, source)
            
            # 유효성 검사
            if not record.phone_normalized and not record.name_normalized:
                continue  # 둘 다 없으면 스킵
            
            if record.phone and not record.phone_normalized:
                self.stats["invalid_phones"] += 1
            
            sanitized.append(record)
        
        return sanitized
    
    def merge_all(
        self, 
        all_records: List[CustomerRecord]
    ) -> List[CustomerRecord]:
        """모든 레코드 병합"""
        # 1. 중복 그룹 찾기
        duplicate_groups = self.duplicate_matcher.find_duplicates(all_records)
        
        # 2. 병합된 레코드 수집
        merged_phones = set()
        merged_records = []
        
        for group in duplicate_groups:
            merged = self.duplicate_matcher.merge_records(group)
            if merged:
                merged_records.append(merged)
                if merged.phone_normalized:
                    merged_phones.add(merged.phone_normalized)
                self.stats["duplicates_merged"] += len(group) - 1
        
        # 3. 중복 아닌 레코드 추가
        for record in all_records:
            if record.phone_normalized and record.phone_normalized in merged_phones:
                continue
            merged_records.append(record)
        
        self.stats["total_output"] = len(merged_records)
        return merged_records
    
    def get_stats(self) -> Dict:
        """처리 통계 반환"""
        return {
            **self.stats,
            "sources": list(self.stats["sources"]),
            "dedup_rate": f"{(1 - self.stats['total_output'] / max(self.stats['total_input'], 1)) * 100:.1f}%"
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """세탁기 데모"""
    print("=" * 70)
    print("  🧹 AUTUS-TRINITY Data Sanitizer Demo")
    print("=" * 70)
    
    # 테스트 데이터 (10개 매장에서 온 더러운 데이터)
    dirty_data = [
        # 학원
        {"전화번호": "010-1234-5678", "이름": "김철수(학부모)", "source": "academy"},
        {"전화번호": "010.1234.5678", "이름": "김 철수", "source": "academy"},  # 중복
        
        # 식당
        {"phone": "01012345678", "name": "김철수님", "source": "restaurant"},  # 중복
        {"phone": "+82-10-9876-5432", "name": "이영희 mom", "source": "restaurant"},
        
        # 스포츠
        {"연락처": "82-10-5555-1234", "성명": "박진수", "source": "sports"},
        {"연락처": "010-5555-1234", "성명": "박진수", "source": "sports"},  # 중복 (오타 아님)
        
        # 잘못된 데이터
        {"phone": "12345", "name": "", "source": "other"},  # 무효
    ]
    
    sanitizer = DataSanitizer()
    
    # 배치 처리
    records = []
    for data in dirty_data:
        source = data.pop('source', 'unknown')
        rec = sanitizer.sanitize_record(data, source)
        records.append(rec)
        print(f"  {data} → {rec.phone_normalized} | {rec.name_normalized}")
    
    print("\n" + "-" * 70)
    
    # 중복 병합
    merged = sanitizer.merge_all(records)
    
    print(f"\n📊 처리 결과:")
    print(f"  - 입력: {len(dirty_data)}건")
    print(f"  - 출력: {len(merged)}건")
    print(f"  - 중복 병합: {sanitizer.stats['duplicates_merged']}건")
    
    print(f"\n👥 정제된 고객 목록:")
    for rec in merged:
        sources = rec.raw_data.get('_sources', [rec.source])
        print(f"  - {rec.name_normalized} | {PhoneSanitizer.format_display(rec.phone_normalized)} | 출처: {sources}")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Data Sanitizer                                    ║
║                          데이터 세탁기 - 10개 매장 데이터 정규화                            ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

기능:
1. 전화번호 정규화 (010-1234-5678 → 01012345678)
2. 이름 정제 (김철수(학부모) → 김철수)
3. 중복 제거 (Fuzzy Matching)
4. 국가번호 처리 (82-10-xxx → 010xxx)

입력: 10개 매장의 더러운 엑셀 데이터
출력: 단일 고유 ID로 통합된 깨끗한 데이터
"""

import re
from typing import Optional, List, Dict, Tuple
from dataclasses import dataclass
from difflib import SequenceMatcher


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 전화번호 정규화
# ═══════════════════════════════════════════════════════════════════════════════════════════

class PhoneSanitizer:
    """
    전화번호 정규화 엔진
    
    지원 형식:
    - 010-1234-5678
    - 010.1234.5678
    - 010 1234 5678
    - 01012345678
    - +82-10-1234-5678
    - 82-10-1234-5678
    - 821012345678
    """
    
    # 한국 휴대폰 번호 패턴
    MOBILE_PREFIXES = ['010', '011', '016', '017', '018', '019']
    
    @classmethod
    def normalize(cls, raw_phone: str) -> str:
        """
        어떤 형태의 전화번호든 '01012345678' 형식으로 통일
        
        Args:
            raw_phone: 원본 전화번호 문자열
            
        Returns:
            str: 정규화된 11자리 전화번호 (실패 시 빈 문자열)
        """
        if not raw_phone:
            return ""
        
        # 1. 숫자만 추출
        digits = re.sub(r'[^0-9]', '', str(raw_phone))
        
        if not digits:
            return ""
        
        # 2. 국가번호(82) 처리
        if digits.startswith('820'):
            # 82010... → 010...
            digits = digits[2:]
        elif digits.startswith('82') and len(digits) >= 12:
            # 8210... → 010...
            digits = '0' + digits[2:]
        
        # 3. 앞자리 '0' 누락 보정
        if digits.startswith('10') and len(digits) == 10:
            digits = '0' + digits
        
        # 4. 길이 검증 (휴대폰: 11자리, 유선: 9~10자리)
        if len(digits) == 11 and digits[:3] in cls.MOBILE_PREFIXES:
            return digits
        elif len(digits) in [9, 10] and digits.startswith('0'):
            # 유선전화 (02-xxx-xxxx 등)
            return digits
        
        # 5. 복구 불가능한 경우
        return ""
    
    @classmethod
    def format_display(cls, phone: str) -> str:
        """
        표시용 포맷팅 (010-1234-5678)
        """
        normalized = cls.normalize(phone)
        if len(normalized) == 11:
            return f"{normalized[:3]}-{normalized[3:7]}-{normalized[7:]}"
        elif len(normalized) == 10:
            return f"{normalized[:3]}-{normalized[3:6]}-{normalized[6:]}"
        elif len(normalized) == 9:
            return f"{normalized[:2]}-{normalized[2:5]}-{normalized[5:]}"
        return phone
    
    @classmethod
    def is_valid(cls, phone: str) -> bool:
        """유효한 전화번호인지 확인"""
        normalized = cls.normalize(phone)
        return len(normalized) >= 9


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 이름 정제
# ═══════════════════════════════════════════════════════════════════════════════════════════

class NameSanitizer:
    """
    이름 정규화 엔진
    
    처리 대상:
    - 김철수(학부모) → 김철수
    - 이영희 mom → 이영희
    - 박 진수 → 박진수
    - Mr. Kim → Kim
    """
    
    # 제거할 접미사 패턴
    SUFFIX_PATTERNS = [
        r'\s*(학부모|엄마|아빠|부모|보호자|mom|dad|parent)\s*',
        r'\s*(님|씨|선생|원장|대표|사장)\s*',
        r'\([^)]*\)',  # 괄호 안의 모든 내용
        r'\[[^\]]*\]',  # 대괄호 안의 모든 내용
    ]
    
    # 제거할 접두사
    PREFIX_PATTERNS = [
        r'^(Mr\.?|Ms\.?|Mrs\.?)\s*',
        r'^(학생|원생|회원)\s*',
    ]
    
    @classmethod
    def normalize(cls, raw_name: str) -> str:
        """
        이름 정규화
        
        Args:
            raw_name: 원본 이름 문자열
            
        Returns:
            str: 정제된 이름
        """
        if not raw_name:
            return ""
        
        name = str(raw_name).strip()
        
        # 1. 접미사 제거
        for pattern in cls.SUFFIX_PATTERNS:
            name = re.sub(pattern, '', name, flags=re.IGNORECASE)
        
        # 2. 접두사 제거
        for pattern in cls.PREFIX_PATTERNS:
            name = re.sub(pattern, '', name, flags=re.IGNORECASE)
        
        # 3. 불필요한 공백 제거
        name = re.sub(r'\s+', '', name)
        
        # 4. 특수문자 제거 (한글, 영문, 숫자만 유지)
        name = re.sub(r'[^\w가-힣]', '', name)
        
        return name.strip()
    
    @classmethod
    def extract_family_name(cls, name: str) -> str:
        """성씨 추출 (동명이인 비교용)"""
        normalized = cls.normalize(name)
        if normalized and len(normalized) >= 1:
            # 한글 이름: 첫 글자가 성
            if re.match(r'^[가-힣]', normalized):
                return normalized[0]
            # 영문 이름: 전체 반환 (성/이름 구분 어려움)
            return normalized
        return ""


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 중복 매칭 (Fuzzy Matching)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class CustomerRecord:
    """고객 레코드"""
    phone: str
    name: str
    source: str  # 출처 (academy, restaurant, sports 등)
    raw_data: Dict = None
    
    def __post_init__(self):
        self.phone_normalized = PhoneSanitizer.normalize(self.phone)
        self.name_normalized = NameSanitizer.normalize(self.name)
        if self.raw_data is None:
            self.raw_data = {}


class DuplicateMatcher:
    """
    중복 고객 매칭 엔진
    
    전략:
    1. 전화번호 완전 일치 → 동일 인물 확정
    2. 전화번호 없음 + 이름 유사도 90% 이상 → 후보군
    3. 전화번호 1자리 차이 + 이름 동일 → 오타로 추정
    """
    
    SIMILARITY_THRESHOLD = 0.85  # 이름 유사도 기준
    
    @classmethod
    def calculate_similarity(cls, str1: str, str2: str) -> float:
        """두 문자열의 유사도 계산 (0.0 ~ 1.0)"""
        if not str1 or not str2:
            return 0.0
        return SequenceMatcher(None, str1.lower(), str2.lower()).ratio()
    
    @classmethod
    def is_phone_typo(cls, phone1: str, phone2: str) -> bool:
        """
        전화번호 오타 여부 확인 (1자리 차이)
        """
        if len(phone1) != len(phone2):
            return False
        
        diff_count = sum(1 for a, b in zip(phone1, phone2) if a != b)
        return diff_count == 1
    
    @classmethod
    def find_duplicates(
        cls, 
        records: List[CustomerRecord]
    ) -> List[List[CustomerRecord]]:
        """
        중복 레코드 그룹 찾기
        
        Returns:
            List[List[CustomerRecord]]: 같은 사람으로 추정되는 레코드 그룹 목록
        """
        # 전화번호 기준 그룹핑
        phone_groups: Dict[str, List[CustomerRecord]] = {}
        no_phone_records: List[CustomerRecord] = []
        
        for record in records:
            if record.phone_normalized:
                if record.phone_normalized not in phone_groups:
                    phone_groups[record.phone_normalized] = []
                phone_groups[record.phone_normalized].append(record)
            else:
                no_phone_records.append(record)
        
        # 결과 그룹
        duplicate_groups = []
        
        # 1. 전화번호 동일 그룹 (2개 이상)
        for phone, group in phone_groups.items():
            if len(group) >= 2:
                duplicate_groups.append(group)
        
        # 2. 전화번호 없는 레코드 중 이름 유사도 기반 매칭
        matched_indices = set()
        for i, rec1 in enumerate(no_phone_records):
            if i in matched_indices:
                continue
            
            similar_group = [rec1]
            for j, rec2 in enumerate(no_phone_records[i+1:], start=i+1):
                if j in matched_indices:
                    continue
                
                similarity = cls.calculate_similarity(
                    rec1.name_normalized, 
                    rec2.name_normalized
                )
                if similarity >= cls.SIMILARITY_THRESHOLD:
                    similar_group.append(rec2)
                    matched_indices.add(j)
            
            if len(similar_group) >= 2:
                duplicate_groups.append(similar_group)
                matched_indices.add(i)
        
        return duplicate_groups
    
    @classmethod
    def merge_records(cls, records: List[CustomerRecord]) -> CustomerRecord:
        """
        여러 레코드를 하나로 병합
        
        전략:
        - 전화번호: 가장 먼저 나온 유효한 번호
        - 이름: 가장 긴 이름 (정보 손실 최소화)
        - 출처: 모두 기록
        """
        if not records:
            return None
        
        # 유효한 전화번호 찾기
        phone = ""
        for rec in records:
            if rec.phone_normalized:
                phone = rec.phone_normalized
                break
        
        # 가장 긴 이름
        name = max(records, key=lambda r: len(r.name_normalized)).name_normalized
        
        # 출처 합치기
        sources = list(set(rec.source for rec in records))
        
        # raw_data 병합
        merged_data = {}
        for rec in records:
            merged_data.update(rec.raw_data or {})
        merged_data['_sources'] = sources
        merged_data['_merged_count'] = len(records)
        
        return CustomerRecord(
            phone=phone,
            name=name,
            source=','.join(sources),
            raw_data=merged_data
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 통합 세탁기
# ═══════════════════════════════════════════════════════════════════════════════════════════

class DataSanitizer:
    """
    10개 매장 데이터 통합 세탁기
    
    Usage:
        sanitizer = DataSanitizer()
        clean_data = sanitizer.process_all(raw_records)
    """
    
    def __init__(self):
        self.phone_sanitizer = PhoneSanitizer()
        self.name_sanitizer = NameSanitizer()
        self.duplicate_matcher = DuplicateMatcher()
        
        # 처리 통계
        self.stats = {
            "total_input": 0,
            "total_output": 0,
            "duplicates_merged": 0,
            "invalid_phones": 0,
            "sources": set()
        }
    
    def sanitize_record(self, raw: Dict, source: str) -> CustomerRecord:
        """단일 레코드 정제"""
        phone = raw.get('phone', raw.get('전화번호', raw.get('연락처', '')))
        name = raw.get('name', raw.get('이름', raw.get('성명', '')))
        
        return CustomerRecord(
            phone=PhoneSanitizer.normalize(phone),
            name=NameSanitizer.normalize(name),
            source=source,
            raw_data=raw
        )
    
    def process_batch(
        self, 
        records: List[Dict], 
        source: str
    ) -> List[CustomerRecord]:
        """배치 처리"""
        self.stats["sources"].add(source)
        self.stats["total_input"] += len(records)
        
        sanitized = []
        for raw in records:
            record = self.sanitize_record(raw, source)
            
            # 유효성 검사
            if not record.phone_normalized and not record.name_normalized:
                continue  # 둘 다 없으면 스킵
            
            if record.phone and not record.phone_normalized:
                self.stats["invalid_phones"] += 1
            
            sanitized.append(record)
        
        return sanitized
    
    def merge_all(
        self, 
        all_records: List[CustomerRecord]
    ) -> List[CustomerRecord]:
        """모든 레코드 병합"""
        # 1. 중복 그룹 찾기
        duplicate_groups = self.duplicate_matcher.find_duplicates(all_records)
        
        # 2. 병합된 레코드 수집
        merged_phones = set()
        merged_records = []
        
        for group in duplicate_groups:
            merged = self.duplicate_matcher.merge_records(group)
            if merged:
                merged_records.append(merged)
                if merged.phone_normalized:
                    merged_phones.add(merged.phone_normalized)
                self.stats["duplicates_merged"] += len(group) - 1
        
        # 3. 중복 아닌 레코드 추가
        for record in all_records:
            if record.phone_normalized and record.phone_normalized in merged_phones:
                continue
            merged_records.append(record)
        
        self.stats["total_output"] = len(merged_records)
        return merged_records
    
    def get_stats(self) -> Dict:
        """처리 통계 반환"""
        return {
            **self.stats,
            "sources": list(self.stats["sources"]),
            "dedup_rate": f"{(1 - self.stats['total_output'] / max(self.stats['total_input'], 1)) * 100:.1f}%"
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """세탁기 데모"""
    print("=" * 70)
    print("  🧹 AUTUS-TRINITY Data Sanitizer Demo")
    print("=" * 70)
    
    # 테스트 데이터 (10개 매장에서 온 더러운 데이터)
    dirty_data = [
        # 학원
        {"전화번호": "010-1234-5678", "이름": "김철수(학부모)", "source": "academy"},
        {"전화번호": "010.1234.5678", "이름": "김 철수", "source": "academy"},  # 중복
        
        # 식당
        {"phone": "01012345678", "name": "김철수님", "source": "restaurant"},  # 중복
        {"phone": "+82-10-9876-5432", "name": "이영희 mom", "source": "restaurant"},
        
        # 스포츠
        {"연락처": "82-10-5555-1234", "성명": "박진수", "source": "sports"},
        {"연락처": "010-5555-1234", "성명": "박진수", "source": "sports"},  # 중복 (오타 아님)
        
        # 잘못된 데이터
        {"phone": "12345", "name": "", "source": "other"},  # 무효
    ]
    
    sanitizer = DataSanitizer()
    
    # 배치 처리
    records = []
    for data in dirty_data:
        source = data.pop('source', 'unknown')
        rec = sanitizer.sanitize_record(data, source)
        records.append(rec)
        print(f"  {data} → {rec.phone_normalized} | {rec.name_normalized}")
    
    print("\n" + "-" * 70)
    
    # 중복 병합
    merged = sanitizer.merge_all(records)
    
    print(f"\n📊 처리 결과:")
    print(f"  - 입력: {len(dirty_data)}건")
    print(f"  - 출력: {len(merged)}건")
    print(f"  - 중복 병합: {sanitizer.stats['duplicates_merged']}건")
    
    print(f"\n👥 정제된 고객 목록:")
    for rec in merged:
        sources = rec.raw_data.get('_sources', [rec.source])
        print(f"  - {rec.name_normalized} | {PhoneSanitizer.format_display(rec.phone_normalized)} | 출처: {sources}")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Data Sanitizer                                    ║
║                          데이터 세탁기 - 10개 매장 데이터 정규화                            ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

기능:
1. 전화번호 정규화 (010-1234-5678 → 01012345678)
2. 이름 정제 (김철수(학부모) → 김철수)
3. 중복 제거 (Fuzzy Matching)
4. 국가번호 처리 (82-10-xxx → 010xxx)

입력: 10개 매장의 더러운 엑셀 데이터
출력: 단일 고유 ID로 통합된 깨끗한 데이터
"""

import re
from typing import Optional, List, Dict, Tuple
from dataclasses import dataclass
from difflib import SequenceMatcher


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 전화번호 정규화
# ═══════════════════════════════════════════════════════════════════════════════════════════

class PhoneSanitizer:
    """
    전화번호 정규화 엔진
    
    지원 형식:
    - 010-1234-5678
    - 010.1234.5678
    - 010 1234 5678
    - 01012345678
    - +82-10-1234-5678
    - 82-10-1234-5678
    - 821012345678
    """
    
    # 한국 휴대폰 번호 패턴
    MOBILE_PREFIXES = ['010', '011', '016', '017', '018', '019']
    
    @classmethod
    def normalize(cls, raw_phone: str) -> str:
        """
        어떤 형태의 전화번호든 '01012345678' 형식으로 통일
        
        Args:
            raw_phone: 원본 전화번호 문자열
            
        Returns:
            str: 정규화된 11자리 전화번호 (실패 시 빈 문자열)
        """
        if not raw_phone:
            return ""
        
        # 1. 숫자만 추출
        digits = re.sub(r'[^0-9]', '', str(raw_phone))
        
        if not digits:
            return ""
        
        # 2. 국가번호(82) 처리
        if digits.startswith('820'):
            # 82010... → 010...
            digits = digits[2:]
        elif digits.startswith('82') and len(digits) >= 12:
            # 8210... → 010...
            digits = '0' + digits[2:]
        
        # 3. 앞자리 '0' 누락 보정
        if digits.startswith('10') and len(digits) == 10:
            digits = '0' + digits
        
        # 4. 길이 검증 (휴대폰: 11자리, 유선: 9~10자리)
        if len(digits) == 11 and digits[:3] in cls.MOBILE_PREFIXES:
            return digits
        elif len(digits) in [9, 10] and digits.startswith('0'):
            # 유선전화 (02-xxx-xxxx 등)
            return digits
        
        # 5. 복구 불가능한 경우
        return ""
    
    @classmethod
    def format_display(cls, phone: str) -> str:
        """
        표시용 포맷팅 (010-1234-5678)
        """
        normalized = cls.normalize(phone)
        if len(normalized) == 11:
            return f"{normalized[:3]}-{normalized[3:7]}-{normalized[7:]}"
        elif len(normalized) == 10:
            return f"{normalized[:3]}-{normalized[3:6]}-{normalized[6:]}"
        elif len(normalized) == 9:
            return f"{normalized[:2]}-{normalized[2:5]}-{normalized[5:]}"
        return phone
    
    @classmethod
    def is_valid(cls, phone: str) -> bool:
        """유효한 전화번호인지 확인"""
        normalized = cls.normalize(phone)
        return len(normalized) >= 9


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 이름 정제
# ═══════════════════════════════════════════════════════════════════════════════════════════

class NameSanitizer:
    """
    이름 정규화 엔진
    
    처리 대상:
    - 김철수(학부모) → 김철수
    - 이영희 mom → 이영희
    - 박 진수 → 박진수
    - Mr. Kim → Kim
    """
    
    # 제거할 접미사 패턴
    SUFFIX_PATTERNS = [
        r'\s*(학부모|엄마|아빠|부모|보호자|mom|dad|parent)\s*',
        r'\s*(님|씨|선생|원장|대표|사장)\s*',
        r'\([^)]*\)',  # 괄호 안의 모든 내용
        r'\[[^\]]*\]',  # 대괄호 안의 모든 내용
    ]
    
    # 제거할 접두사
    PREFIX_PATTERNS = [
        r'^(Mr\.?|Ms\.?|Mrs\.?)\s*',
        r'^(학생|원생|회원)\s*',
    ]
    
    @classmethod
    def normalize(cls, raw_name: str) -> str:
        """
        이름 정규화
        
        Args:
            raw_name: 원본 이름 문자열
            
        Returns:
            str: 정제된 이름
        """
        if not raw_name:
            return ""
        
        name = str(raw_name).strip()
        
        # 1. 접미사 제거
        for pattern in cls.SUFFIX_PATTERNS:
            name = re.sub(pattern, '', name, flags=re.IGNORECASE)
        
        # 2. 접두사 제거
        for pattern in cls.PREFIX_PATTERNS:
            name = re.sub(pattern, '', name, flags=re.IGNORECASE)
        
        # 3. 불필요한 공백 제거
        name = re.sub(r'\s+', '', name)
        
        # 4. 특수문자 제거 (한글, 영문, 숫자만 유지)
        name = re.sub(r'[^\w가-힣]', '', name)
        
        return name.strip()
    
    @classmethod
    def extract_family_name(cls, name: str) -> str:
        """성씨 추출 (동명이인 비교용)"""
        normalized = cls.normalize(name)
        if normalized and len(normalized) >= 1:
            # 한글 이름: 첫 글자가 성
            if re.match(r'^[가-힣]', normalized):
                return normalized[0]
            # 영문 이름: 전체 반환 (성/이름 구분 어려움)
            return normalized
        return ""


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 중복 매칭 (Fuzzy Matching)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class CustomerRecord:
    """고객 레코드"""
    phone: str
    name: str
    source: str  # 출처 (academy, restaurant, sports 등)
    raw_data: Dict = None
    
    def __post_init__(self):
        self.phone_normalized = PhoneSanitizer.normalize(self.phone)
        self.name_normalized = NameSanitizer.normalize(self.name)
        if self.raw_data is None:
            self.raw_data = {}


class DuplicateMatcher:
    """
    중복 고객 매칭 엔진
    
    전략:
    1. 전화번호 완전 일치 → 동일 인물 확정
    2. 전화번호 없음 + 이름 유사도 90% 이상 → 후보군
    3. 전화번호 1자리 차이 + 이름 동일 → 오타로 추정
    """
    
    SIMILARITY_THRESHOLD = 0.85  # 이름 유사도 기준
    
    @classmethod
    def calculate_similarity(cls, str1: str, str2: str) -> float:
        """두 문자열의 유사도 계산 (0.0 ~ 1.0)"""
        if not str1 or not str2:
            return 0.0
        return SequenceMatcher(None, str1.lower(), str2.lower()).ratio()
    
    @classmethod
    def is_phone_typo(cls, phone1: str, phone2: str) -> bool:
        """
        전화번호 오타 여부 확인 (1자리 차이)
        """
        if len(phone1) != len(phone2):
            return False
        
        diff_count = sum(1 for a, b in zip(phone1, phone2) if a != b)
        return diff_count == 1
    
    @classmethod
    def find_duplicates(
        cls, 
        records: List[CustomerRecord]
    ) -> List[List[CustomerRecord]]:
        """
        중복 레코드 그룹 찾기
        
        Returns:
            List[List[CustomerRecord]]: 같은 사람으로 추정되는 레코드 그룹 목록
        """
        # 전화번호 기준 그룹핑
        phone_groups: Dict[str, List[CustomerRecord]] = {}
        no_phone_records: List[CustomerRecord] = []
        
        for record in records:
            if record.phone_normalized:
                if record.phone_normalized not in phone_groups:
                    phone_groups[record.phone_normalized] = []
                phone_groups[record.phone_normalized].append(record)
            else:
                no_phone_records.append(record)
        
        # 결과 그룹
        duplicate_groups = []
        
        # 1. 전화번호 동일 그룹 (2개 이상)
        for phone, group in phone_groups.items():
            if len(group) >= 2:
                duplicate_groups.append(group)
        
        # 2. 전화번호 없는 레코드 중 이름 유사도 기반 매칭
        matched_indices = set()
        for i, rec1 in enumerate(no_phone_records):
            if i in matched_indices:
                continue
            
            similar_group = [rec1]
            for j, rec2 in enumerate(no_phone_records[i+1:], start=i+1):
                if j in matched_indices:
                    continue
                
                similarity = cls.calculate_similarity(
                    rec1.name_normalized, 
                    rec2.name_normalized
                )
                if similarity >= cls.SIMILARITY_THRESHOLD:
                    similar_group.append(rec2)
                    matched_indices.add(j)
            
            if len(similar_group) >= 2:
                duplicate_groups.append(similar_group)
                matched_indices.add(i)
        
        return duplicate_groups
    
    @classmethod
    def merge_records(cls, records: List[CustomerRecord]) -> CustomerRecord:
        """
        여러 레코드를 하나로 병합
        
        전략:
        - 전화번호: 가장 먼저 나온 유효한 번호
        - 이름: 가장 긴 이름 (정보 손실 최소화)
        - 출처: 모두 기록
        """
        if not records:
            return None
        
        # 유효한 전화번호 찾기
        phone = ""
        for rec in records:
            if rec.phone_normalized:
                phone = rec.phone_normalized
                break
        
        # 가장 긴 이름
        name = max(records, key=lambda r: len(r.name_normalized)).name_normalized
        
        # 출처 합치기
        sources = list(set(rec.source for rec in records))
        
        # raw_data 병합
        merged_data = {}
        for rec in records:
            merged_data.update(rec.raw_data or {})
        merged_data['_sources'] = sources
        merged_data['_merged_count'] = len(records)
        
        return CustomerRecord(
            phone=phone,
            name=name,
            source=','.join(sources),
            raw_data=merged_data
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 통합 세탁기
# ═══════════════════════════════════════════════════════════════════════════════════════════

class DataSanitizer:
    """
    10개 매장 데이터 통합 세탁기
    
    Usage:
        sanitizer = DataSanitizer()
        clean_data = sanitizer.process_all(raw_records)
    """
    
    def __init__(self):
        self.phone_sanitizer = PhoneSanitizer()
        self.name_sanitizer = NameSanitizer()
        self.duplicate_matcher = DuplicateMatcher()
        
        # 처리 통계
        self.stats = {
            "total_input": 0,
            "total_output": 0,
            "duplicates_merged": 0,
            "invalid_phones": 0,
            "sources": set()
        }
    
    def sanitize_record(self, raw: Dict, source: str) -> CustomerRecord:
        """단일 레코드 정제"""
        phone = raw.get('phone', raw.get('전화번호', raw.get('연락처', '')))
        name = raw.get('name', raw.get('이름', raw.get('성명', '')))
        
        return CustomerRecord(
            phone=PhoneSanitizer.normalize(phone),
            name=NameSanitizer.normalize(name),
            source=source,
            raw_data=raw
        )
    
    def process_batch(
        self, 
        records: List[Dict], 
        source: str
    ) -> List[CustomerRecord]:
        """배치 처리"""
        self.stats["sources"].add(source)
        self.stats["total_input"] += len(records)
        
        sanitized = []
        for raw in records:
            record = self.sanitize_record(raw, source)
            
            # 유효성 검사
            if not record.phone_normalized and not record.name_normalized:
                continue  # 둘 다 없으면 스킵
            
            if record.phone and not record.phone_normalized:
                self.stats["invalid_phones"] += 1
            
            sanitized.append(record)
        
        return sanitized
    
    def merge_all(
        self, 
        all_records: List[CustomerRecord]
    ) -> List[CustomerRecord]:
        """모든 레코드 병합"""
        # 1. 중복 그룹 찾기
        duplicate_groups = self.duplicate_matcher.find_duplicates(all_records)
        
        # 2. 병합된 레코드 수집
        merged_phones = set()
        merged_records = []
        
        for group in duplicate_groups:
            merged = self.duplicate_matcher.merge_records(group)
            if merged:
                merged_records.append(merged)
                if merged.phone_normalized:
                    merged_phones.add(merged.phone_normalized)
                self.stats["duplicates_merged"] += len(group) - 1
        
        # 3. 중복 아닌 레코드 추가
        for record in all_records:
            if record.phone_normalized and record.phone_normalized in merged_phones:
                continue
            merged_records.append(record)
        
        self.stats["total_output"] = len(merged_records)
        return merged_records
    
    def get_stats(self) -> Dict:
        """처리 통계 반환"""
        return {
            **self.stats,
            "sources": list(self.stats["sources"]),
            "dedup_rate": f"{(1 - self.stats['total_output'] / max(self.stats['total_input'], 1)) * 100:.1f}%"
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """세탁기 데모"""
    print("=" * 70)
    print("  🧹 AUTUS-TRINITY Data Sanitizer Demo")
    print("=" * 70)
    
    # 테스트 데이터 (10개 매장에서 온 더러운 데이터)
    dirty_data = [
        # 학원
        {"전화번호": "010-1234-5678", "이름": "김철수(학부모)", "source": "academy"},
        {"전화번호": "010.1234.5678", "이름": "김 철수", "source": "academy"},  # 중복
        
        # 식당
        {"phone": "01012345678", "name": "김철수님", "source": "restaurant"},  # 중복
        {"phone": "+82-10-9876-5432", "name": "이영희 mom", "source": "restaurant"},
        
        # 스포츠
        {"연락처": "82-10-5555-1234", "성명": "박진수", "source": "sports"},
        {"연락처": "010-5555-1234", "성명": "박진수", "source": "sports"},  # 중복 (오타 아님)
        
        # 잘못된 데이터
        {"phone": "12345", "name": "", "source": "other"},  # 무효
    ]
    
    sanitizer = DataSanitizer()
    
    # 배치 처리
    records = []
    for data in dirty_data:
        source = data.pop('source', 'unknown')
        rec = sanitizer.sanitize_record(data, source)
        records.append(rec)
        print(f"  {data} → {rec.phone_normalized} | {rec.name_normalized}")
    
    print("\n" + "-" * 70)
    
    # 중복 병합
    merged = sanitizer.merge_all(records)
    
    print(f"\n📊 처리 결과:")
    print(f"  - 입력: {len(dirty_data)}건")
    print(f"  - 출력: {len(merged)}건")
    print(f"  - 중복 병합: {sanitizer.stats['duplicates_merged']}건")
    
    print(f"\n👥 정제된 고객 목록:")
    for rec in merged:
        sources = rec.raw_data.get('_sources', [rec.source])
        print(f"  - {rec.name_normalized} | {PhoneSanitizer.format_display(rec.phone_normalized)} | 출처: {sources}")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()


























