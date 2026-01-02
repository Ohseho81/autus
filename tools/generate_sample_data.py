#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS-PRIME: 샘플 데이터 생성기 (Dogfooding용)

실제 학원 데이터 형식에 맞는 테스트용 엑셀 파일 생성

Usage:
    python generate_sample_data.py
    python generate_sample_data.py --count 100
    python generate_sample_data.py --output my_academy.xlsx
"""

import argparse
import random
from datetime import datetime, timedelta
from pathlib import Path

# pandas 필요
try:
    import pandas as pd
except ImportError:
    print("pandas가 필요합니다: pip install pandas openpyxl")
    exit(1)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 샘플 데이터
# ═══════════════════════════════════════════════════════════════════════════════════════════

# 성씨
LAST_NAMES = [
    "김", "이", "박", "최", "정", "강", "조", "윤", "장", "임",
    "한", "오", "서", "신", "권", "황", "안", "송", "류", "홍"
]

# 이름 (2글자)
FIRST_NAMES = [
    "민수", "영희", "철수", "지연", "성호", "수빈", "준혁", "예진", "태윤", "하은",
    "서준", "지우", "하준", "도윤", "시우", "민준", "현우", "지호", "건우", "선우",
    "유나", "서연", "민서", "하윤", "지아", "서현", "수아", "다은", "채원", "유진"
]

# 학교명
SCHOOLS = [
    "서초중학교", "반포중학교", "잠원중학교", "방배중학교", "서운중학교",
    "서초고등학교", "반포고등학교", "세화고등학교", "상문고등학교", "서울고등학교",
    "서일초등학교", "반포초등학교", "잠원초등학교", "방배초등학교", "서래초등학교"
]

# 학년
GRADES = ["초4", "초5", "초6", "중1", "중2", "중3", "고1", "고2", "고3"]

# 과목
SUBJECTS = ["국어", "영어", "수학", "과학", "사회", "논술"]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 데이터 생성 함수
# ═══════════════════════════════════════════════════════════════════════════════════════════

def generate_phone() -> str:
    """전화번호 생성"""
    return f"010-{random.randint(1000,9999)}-{random.randint(1000,9999)}"


def generate_name() -> str:
    """이름 생성"""
    return random.choice(LAST_NAMES) + random.choice(FIRST_NAMES)


def generate_student(student_id: int) -> dict:
    """
    학생 데이터 생성
    
    다양한 티어 분포를 위해 가중치 적용:
    - 10% 💎 Diamond (고수익, 저엔트로피)
    - 15% 🥇 Platinum
    - 25% 🥈 Gold
    - 30% ⚙️ Steel
    - 20% 🔩 Iron (저수익, 고엔트로피)
    """
    # 티어 결정 (가중치)
    tier_roll = random.random()
    
    if tier_roll < 0.10:  # Diamond (10%)
        fee_range = (450000, 600000)
        score_delta = (15, 30)
        consult_range = (0, 1)
        tier_hint = "diamond"
    elif tier_roll < 0.25:  # Platinum (15%)
        fee_range = (380000, 480000)
        score_delta = (10, 20)
        consult_range = (0, 2)
        tier_hint = "platinum"
    elif tier_roll < 0.50:  # Gold (25%)
        fee_range = (300000, 400000)
        score_delta = (5, 15)
        consult_range = (1, 3)
        tier_hint = "gold"
    elif tier_roll < 0.80:  # Steel (30%)
        fee_range = (200000, 320000)
        score_delta = (-5, 10)
        consult_range = (2, 5)
        tier_hint = "steel"
    else:  # Iron (20%)
        fee_range = (100000, 220000)
        score_delta = (-15, 0)
        consult_range = (5, 10)
        tier_hint = "iron"
    
    # 기본 정보
    name = generate_name()
    initial_score = random.randint(40, 85)
    delta = random.randint(*score_delta)
    current_score = max(0, min(100, initial_score + delta))
    
    # 등록일 (최근 2년 내)
    enrolled_days_ago = random.randint(30, 730)
    enrolled_date = datetime.now() - timedelta(days=enrolled_days_ago)
    
    return {
        "이름": name,
        "전화번호": generate_phone(),
        "학교": random.choice(SCHOOLS),
        "학년": random.choice(GRADES),
        "과목": ", ".join(random.sample(SUBJECTS, k=random.randint(1, 3))),
        "수강료": random.randint(*fee_range),
        "입학점수": initial_score,
        "현재점수": current_score,
        "성적변화": delta,
        "상담횟수": random.randint(*consult_range),
        "잠재력": random.randint(30, 90),
        "감정소모": random.randint(0, 50) if tier_hint in ["steel", "iron"] else random.randint(0, 20),
        "등록일": enrolled_date.strftime("%Y-%m-%d"),
        "상태": random.choices(["재원", "휴원", "퇴원"], weights=[85, 10, 5])[0],
        "학부모": name[0] + "어머니",
        "학부모연락처": generate_phone(),
        "_tier_hint": tier_hint  # 내부 참조용 (엑셀에 포함 안 됨)
    }


def generate_dataset(count: int) -> pd.DataFrame:
    """
    데이터셋 생성
    
    Args:
        count: 학생 수
        
    Returns:
        DataFrame
    """
    students = [generate_student(i+1) for i in range(count)]
    df = pd.DataFrame(students)
    
    # 내부 참조용 컬럼 제거
    if "_tier_hint" in df.columns:
        df = df.drop(columns=["_tier_hint"])
    
    return df


def analyze_dataset(df: pd.DataFrame) -> dict:
    """
    데이터셋 분석
    """
    return {
        "total": len(df),
        "avg_fee": df["수강료"].mean(),
        "avg_score_delta": df["성적변화"].mean(),
        "avg_consult": df["상담횟수"].mean(),
        "status_dist": df["상태"].value_counts().to_dict(),
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="AUTUS-PRIME 샘플 데이터 생성")
    parser.add_argument("--count", type=int, default=50, help="학생 수 (기본: 50)")
    parser.add_argument("--output", type=str, default="sample_academy_data.xlsx", help="출력 파일명")
    parser.add_argument("--preview", action="store_true", help="미리보기만 (파일 저장 안 함)")
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("  📊 AUTUS-PRIME 샘플 데이터 생성기")
    print("=" * 60)
    
    # 데이터 생성
    print(f"\n🎲 {args.count}명의 학생 데이터 생성 중...")
    df = generate_dataset(args.count)
    
    # 분석
    stats = analyze_dataset(df)
    print(f"\n📈 데이터 분석:")
    print(f"   - 총 학생 수: {stats['total']}명")
    print(f"   - 평균 수강료: ₩{stats['avg_fee']:,.0f}")
    print(f"   - 평균 성적 변화: {stats['avg_score_delta']:+.1f}점")
    print(f"   - 평균 상담 횟수: {stats['avg_consult']:.1f}회")
    print(f"   - 상태 분포: {stats['status_dist']}")
    
    # 미리보기
    print(f"\n📋 미리보기 (상위 5명):")
    print(df.head().to_string(index=False))
    
    # 저장
    if not args.preview:
        output_path = Path(args.output)
        df.to_excel(output_path, index=False, engine="openpyxl")
        print(f"\n✅ 저장 완료: {output_path.absolute()}")
        print(f"\n💡 이 파일을 AUTUS-PRIME 대시보드에 업로드하여 테스트하세요!")
    
    print("\n" + "=" * 60)


if __name__ == "__main__":
    main()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS-PRIME: 샘플 데이터 생성기 (Dogfooding용)

실제 학원 데이터 형식에 맞는 테스트용 엑셀 파일 생성

Usage:
    python generate_sample_data.py
    python generate_sample_data.py --count 100
    python generate_sample_data.py --output my_academy.xlsx
"""

import argparse
import random
from datetime import datetime, timedelta
from pathlib import Path

# pandas 필요
try:
    import pandas as pd
except ImportError:
    print("pandas가 필요합니다: pip install pandas openpyxl")
    exit(1)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 샘플 데이터
# ═══════════════════════════════════════════════════════════════════════════════════════════

# 성씨
LAST_NAMES = [
    "김", "이", "박", "최", "정", "강", "조", "윤", "장", "임",
    "한", "오", "서", "신", "권", "황", "안", "송", "류", "홍"
]

# 이름 (2글자)
FIRST_NAMES = [
    "민수", "영희", "철수", "지연", "성호", "수빈", "준혁", "예진", "태윤", "하은",
    "서준", "지우", "하준", "도윤", "시우", "민준", "현우", "지호", "건우", "선우",
    "유나", "서연", "민서", "하윤", "지아", "서현", "수아", "다은", "채원", "유진"
]

# 학교명
SCHOOLS = [
    "서초중학교", "반포중학교", "잠원중학교", "방배중학교", "서운중학교",
    "서초고등학교", "반포고등학교", "세화고등학교", "상문고등학교", "서울고등학교",
    "서일초등학교", "반포초등학교", "잠원초등학교", "방배초등학교", "서래초등학교"
]

# 학년
GRADES = ["초4", "초5", "초6", "중1", "중2", "중3", "고1", "고2", "고3"]

# 과목
SUBJECTS = ["국어", "영어", "수학", "과학", "사회", "논술"]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 데이터 생성 함수
# ═══════════════════════════════════════════════════════════════════════════════════════════

def generate_phone() -> str:
    """전화번호 생성"""
    return f"010-{random.randint(1000,9999)}-{random.randint(1000,9999)}"


def generate_name() -> str:
    """이름 생성"""
    return random.choice(LAST_NAMES) + random.choice(FIRST_NAMES)


def generate_student(student_id: int) -> dict:
    """
    학생 데이터 생성
    
    다양한 티어 분포를 위해 가중치 적용:
    - 10% 💎 Diamond (고수익, 저엔트로피)
    - 15% 🥇 Platinum
    - 25% 🥈 Gold
    - 30% ⚙️ Steel
    - 20% 🔩 Iron (저수익, 고엔트로피)
    """
    # 티어 결정 (가중치)
    tier_roll = random.random()
    
    if tier_roll < 0.10:  # Diamond (10%)
        fee_range = (450000, 600000)
        score_delta = (15, 30)
        consult_range = (0, 1)
        tier_hint = "diamond"
    elif tier_roll < 0.25:  # Platinum (15%)
        fee_range = (380000, 480000)
        score_delta = (10, 20)
        consult_range = (0, 2)
        tier_hint = "platinum"
    elif tier_roll < 0.50:  # Gold (25%)
        fee_range = (300000, 400000)
        score_delta = (5, 15)
        consult_range = (1, 3)
        tier_hint = "gold"
    elif tier_roll < 0.80:  # Steel (30%)
        fee_range = (200000, 320000)
        score_delta = (-5, 10)
        consult_range = (2, 5)
        tier_hint = "steel"
    else:  # Iron (20%)
        fee_range = (100000, 220000)
        score_delta = (-15, 0)
        consult_range = (5, 10)
        tier_hint = "iron"
    
    # 기본 정보
    name = generate_name()
    initial_score = random.randint(40, 85)
    delta = random.randint(*score_delta)
    current_score = max(0, min(100, initial_score + delta))
    
    # 등록일 (최근 2년 내)
    enrolled_days_ago = random.randint(30, 730)
    enrolled_date = datetime.now() - timedelta(days=enrolled_days_ago)
    
    return {
        "이름": name,
        "전화번호": generate_phone(),
        "학교": random.choice(SCHOOLS),
        "학년": random.choice(GRADES),
        "과목": ", ".join(random.sample(SUBJECTS, k=random.randint(1, 3))),
        "수강료": random.randint(*fee_range),
        "입학점수": initial_score,
        "현재점수": current_score,
        "성적변화": delta,
        "상담횟수": random.randint(*consult_range),
        "잠재력": random.randint(30, 90),
        "감정소모": random.randint(0, 50) if tier_hint in ["steel", "iron"] else random.randint(0, 20),
        "등록일": enrolled_date.strftime("%Y-%m-%d"),
        "상태": random.choices(["재원", "휴원", "퇴원"], weights=[85, 10, 5])[0],
        "학부모": name[0] + "어머니",
        "학부모연락처": generate_phone(),
        "_tier_hint": tier_hint  # 내부 참조용 (엑셀에 포함 안 됨)
    }


def generate_dataset(count: int) -> pd.DataFrame:
    """
    데이터셋 생성
    
    Args:
        count: 학생 수
        
    Returns:
        DataFrame
    """
    students = [generate_student(i+1) for i in range(count)]
    df = pd.DataFrame(students)
    
    # 내부 참조용 컬럼 제거
    if "_tier_hint" in df.columns:
        df = df.drop(columns=["_tier_hint"])
    
    return df


def analyze_dataset(df: pd.DataFrame) -> dict:
    """
    데이터셋 분석
    """
    return {
        "total": len(df),
        "avg_fee": df["수강료"].mean(),
        "avg_score_delta": df["성적변화"].mean(),
        "avg_consult": df["상담횟수"].mean(),
        "status_dist": df["상태"].value_counts().to_dict(),
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="AUTUS-PRIME 샘플 데이터 생성")
    parser.add_argument("--count", type=int, default=50, help="학생 수 (기본: 50)")
    parser.add_argument("--output", type=str, default="sample_academy_data.xlsx", help="출력 파일명")
    parser.add_argument("--preview", action="store_true", help="미리보기만 (파일 저장 안 함)")
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("  📊 AUTUS-PRIME 샘플 데이터 생성기")
    print("=" * 60)
    
    # 데이터 생성
    print(f"\n🎲 {args.count}명의 학생 데이터 생성 중...")
    df = generate_dataset(args.count)
    
    # 분석
    stats = analyze_dataset(df)
    print(f"\n📈 데이터 분석:")
    print(f"   - 총 학생 수: {stats['total']}명")
    print(f"   - 평균 수강료: ₩{stats['avg_fee']:,.0f}")
    print(f"   - 평균 성적 변화: {stats['avg_score_delta']:+.1f}점")
    print(f"   - 평균 상담 횟수: {stats['avg_consult']:.1f}회")
    print(f"   - 상태 분포: {stats['status_dist']}")
    
    # 미리보기
    print(f"\n📋 미리보기 (상위 5명):")
    print(df.head().to_string(index=False))
    
    # 저장
    if not args.preview:
        output_path = Path(args.output)
        df.to_excel(output_path, index=False, engine="openpyxl")
        print(f"\n✅ 저장 완료: {output_path.absolute()}")
        print(f"\n💡 이 파일을 AUTUS-PRIME 대시보드에 업로드하여 테스트하세요!")
    
    print("\n" + "=" * 60)


if __name__ == "__main__":
    main()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS-PRIME: 샘플 데이터 생성기 (Dogfooding용)

실제 학원 데이터 형식에 맞는 테스트용 엑셀 파일 생성

Usage:
    python generate_sample_data.py
    python generate_sample_data.py --count 100
    python generate_sample_data.py --output my_academy.xlsx
"""

import argparse
import random
from datetime import datetime, timedelta
from pathlib import Path

# pandas 필요
try:
    import pandas as pd
except ImportError:
    print("pandas가 필요합니다: pip install pandas openpyxl")
    exit(1)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 샘플 데이터
# ═══════════════════════════════════════════════════════════════════════════════════════════

# 성씨
LAST_NAMES = [
    "김", "이", "박", "최", "정", "강", "조", "윤", "장", "임",
    "한", "오", "서", "신", "권", "황", "안", "송", "류", "홍"
]

# 이름 (2글자)
FIRST_NAMES = [
    "민수", "영희", "철수", "지연", "성호", "수빈", "준혁", "예진", "태윤", "하은",
    "서준", "지우", "하준", "도윤", "시우", "민준", "현우", "지호", "건우", "선우",
    "유나", "서연", "민서", "하윤", "지아", "서현", "수아", "다은", "채원", "유진"
]

# 학교명
SCHOOLS = [
    "서초중학교", "반포중학교", "잠원중학교", "방배중학교", "서운중학교",
    "서초고등학교", "반포고등학교", "세화고등학교", "상문고등학교", "서울고등학교",
    "서일초등학교", "반포초등학교", "잠원초등학교", "방배초등학교", "서래초등학교"
]

# 학년
GRADES = ["초4", "초5", "초6", "중1", "중2", "중3", "고1", "고2", "고3"]

# 과목
SUBJECTS = ["국어", "영어", "수학", "과학", "사회", "논술"]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 데이터 생성 함수
# ═══════════════════════════════════════════════════════════════════════════════════════════

def generate_phone() -> str:
    """전화번호 생성"""
    return f"010-{random.randint(1000,9999)}-{random.randint(1000,9999)}"


def generate_name() -> str:
    """이름 생성"""
    return random.choice(LAST_NAMES) + random.choice(FIRST_NAMES)


def generate_student(student_id: int) -> dict:
    """
    학생 데이터 생성
    
    다양한 티어 분포를 위해 가중치 적용:
    - 10% 💎 Diamond (고수익, 저엔트로피)
    - 15% 🥇 Platinum
    - 25% 🥈 Gold
    - 30% ⚙️ Steel
    - 20% 🔩 Iron (저수익, 고엔트로피)
    """
    # 티어 결정 (가중치)
    tier_roll = random.random()
    
    if tier_roll < 0.10:  # Diamond (10%)
        fee_range = (450000, 600000)
        score_delta = (15, 30)
        consult_range = (0, 1)
        tier_hint = "diamond"
    elif tier_roll < 0.25:  # Platinum (15%)
        fee_range = (380000, 480000)
        score_delta = (10, 20)
        consult_range = (0, 2)
        tier_hint = "platinum"
    elif tier_roll < 0.50:  # Gold (25%)
        fee_range = (300000, 400000)
        score_delta = (5, 15)
        consult_range = (1, 3)
        tier_hint = "gold"
    elif tier_roll < 0.80:  # Steel (30%)
        fee_range = (200000, 320000)
        score_delta = (-5, 10)
        consult_range = (2, 5)
        tier_hint = "steel"
    else:  # Iron (20%)
        fee_range = (100000, 220000)
        score_delta = (-15, 0)
        consult_range = (5, 10)
        tier_hint = "iron"
    
    # 기본 정보
    name = generate_name()
    initial_score = random.randint(40, 85)
    delta = random.randint(*score_delta)
    current_score = max(0, min(100, initial_score + delta))
    
    # 등록일 (최근 2년 내)
    enrolled_days_ago = random.randint(30, 730)
    enrolled_date = datetime.now() - timedelta(days=enrolled_days_ago)
    
    return {
        "이름": name,
        "전화번호": generate_phone(),
        "학교": random.choice(SCHOOLS),
        "학년": random.choice(GRADES),
        "과목": ", ".join(random.sample(SUBJECTS, k=random.randint(1, 3))),
        "수강료": random.randint(*fee_range),
        "입학점수": initial_score,
        "현재점수": current_score,
        "성적변화": delta,
        "상담횟수": random.randint(*consult_range),
        "잠재력": random.randint(30, 90),
        "감정소모": random.randint(0, 50) if tier_hint in ["steel", "iron"] else random.randint(0, 20),
        "등록일": enrolled_date.strftime("%Y-%m-%d"),
        "상태": random.choices(["재원", "휴원", "퇴원"], weights=[85, 10, 5])[0],
        "학부모": name[0] + "어머니",
        "학부모연락처": generate_phone(),
        "_tier_hint": tier_hint  # 내부 참조용 (엑셀에 포함 안 됨)
    }


def generate_dataset(count: int) -> pd.DataFrame:
    """
    데이터셋 생성
    
    Args:
        count: 학생 수
        
    Returns:
        DataFrame
    """
    students = [generate_student(i+1) for i in range(count)]
    df = pd.DataFrame(students)
    
    # 내부 참조용 컬럼 제거
    if "_tier_hint" in df.columns:
        df = df.drop(columns=["_tier_hint"])
    
    return df


def analyze_dataset(df: pd.DataFrame) -> dict:
    """
    데이터셋 분석
    """
    return {
        "total": len(df),
        "avg_fee": df["수강료"].mean(),
        "avg_score_delta": df["성적변화"].mean(),
        "avg_consult": df["상담횟수"].mean(),
        "status_dist": df["상태"].value_counts().to_dict(),
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="AUTUS-PRIME 샘플 데이터 생성")
    parser.add_argument("--count", type=int, default=50, help="학생 수 (기본: 50)")
    parser.add_argument("--output", type=str, default="sample_academy_data.xlsx", help="출력 파일명")
    parser.add_argument("--preview", action="store_true", help="미리보기만 (파일 저장 안 함)")
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("  📊 AUTUS-PRIME 샘플 데이터 생성기")
    print("=" * 60)
    
    # 데이터 생성
    print(f"\n🎲 {args.count}명의 학생 데이터 생성 중...")
    df = generate_dataset(args.count)
    
    # 분석
    stats = analyze_dataset(df)
    print(f"\n📈 데이터 분석:")
    print(f"   - 총 학생 수: {stats['total']}명")
    print(f"   - 평균 수강료: ₩{stats['avg_fee']:,.0f}")
    print(f"   - 평균 성적 변화: {stats['avg_score_delta']:+.1f}점")
    print(f"   - 평균 상담 횟수: {stats['avg_consult']:.1f}회")
    print(f"   - 상태 분포: {stats['status_dist']}")
    
    # 미리보기
    print(f"\n📋 미리보기 (상위 5명):")
    print(df.head().to_string(index=False))
    
    # 저장
    if not args.preview:
        output_path = Path(args.output)
        df.to_excel(output_path, index=False, engine="openpyxl")
        print(f"\n✅ 저장 완료: {output_path.absolute()}")
        print(f"\n💡 이 파일을 AUTUS-PRIME 대시보드에 업로드하여 테스트하세요!")
    
    print("\n" + "=" * 60)


if __name__ == "__main__":
    main()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS-PRIME: 샘플 데이터 생성기 (Dogfooding용)

실제 학원 데이터 형식에 맞는 테스트용 엑셀 파일 생성

Usage:
    python generate_sample_data.py
    python generate_sample_data.py --count 100
    python generate_sample_data.py --output my_academy.xlsx
"""

import argparse
import random
from datetime import datetime, timedelta
from pathlib import Path

# pandas 필요
try:
    import pandas as pd
except ImportError:
    print("pandas가 필요합니다: pip install pandas openpyxl")
    exit(1)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 샘플 데이터
# ═══════════════════════════════════════════════════════════════════════════════════════════

# 성씨
LAST_NAMES = [
    "김", "이", "박", "최", "정", "강", "조", "윤", "장", "임",
    "한", "오", "서", "신", "권", "황", "안", "송", "류", "홍"
]

# 이름 (2글자)
FIRST_NAMES = [
    "민수", "영희", "철수", "지연", "성호", "수빈", "준혁", "예진", "태윤", "하은",
    "서준", "지우", "하준", "도윤", "시우", "민준", "현우", "지호", "건우", "선우",
    "유나", "서연", "민서", "하윤", "지아", "서현", "수아", "다은", "채원", "유진"
]

# 학교명
SCHOOLS = [
    "서초중학교", "반포중학교", "잠원중학교", "방배중학교", "서운중학교",
    "서초고등학교", "반포고등학교", "세화고등학교", "상문고등학교", "서울고등학교",
    "서일초등학교", "반포초등학교", "잠원초등학교", "방배초등학교", "서래초등학교"
]

# 학년
GRADES = ["초4", "초5", "초6", "중1", "중2", "중3", "고1", "고2", "고3"]

# 과목
SUBJECTS = ["국어", "영어", "수학", "과학", "사회", "논술"]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 데이터 생성 함수
# ═══════════════════════════════════════════════════════════════════════════════════════════

def generate_phone() -> str:
    """전화번호 생성"""
    return f"010-{random.randint(1000,9999)}-{random.randint(1000,9999)}"


def generate_name() -> str:
    """이름 생성"""
    return random.choice(LAST_NAMES) + random.choice(FIRST_NAMES)


def generate_student(student_id: int) -> dict:
    """
    학생 데이터 생성
    
    다양한 티어 분포를 위해 가중치 적용:
    - 10% 💎 Diamond (고수익, 저엔트로피)
    - 15% 🥇 Platinum
    - 25% 🥈 Gold
    - 30% ⚙️ Steel
    - 20% 🔩 Iron (저수익, 고엔트로피)
    """
    # 티어 결정 (가중치)
    tier_roll = random.random()
    
    if tier_roll < 0.10:  # Diamond (10%)
        fee_range = (450000, 600000)
        score_delta = (15, 30)
        consult_range = (0, 1)
        tier_hint = "diamond"
    elif tier_roll < 0.25:  # Platinum (15%)
        fee_range = (380000, 480000)
        score_delta = (10, 20)
        consult_range = (0, 2)
        tier_hint = "platinum"
    elif tier_roll < 0.50:  # Gold (25%)
        fee_range = (300000, 400000)
        score_delta = (5, 15)
        consult_range = (1, 3)
        tier_hint = "gold"
    elif tier_roll < 0.80:  # Steel (30%)
        fee_range = (200000, 320000)
        score_delta = (-5, 10)
        consult_range = (2, 5)
        tier_hint = "steel"
    else:  # Iron (20%)
        fee_range = (100000, 220000)
        score_delta = (-15, 0)
        consult_range = (5, 10)
        tier_hint = "iron"
    
    # 기본 정보
    name = generate_name()
    initial_score = random.randint(40, 85)
    delta = random.randint(*score_delta)
    current_score = max(0, min(100, initial_score + delta))
    
    # 등록일 (최근 2년 내)
    enrolled_days_ago = random.randint(30, 730)
    enrolled_date = datetime.now() - timedelta(days=enrolled_days_ago)
    
    return {
        "이름": name,
        "전화번호": generate_phone(),
        "학교": random.choice(SCHOOLS),
        "학년": random.choice(GRADES),
        "과목": ", ".join(random.sample(SUBJECTS, k=random.randint(1, 3))),
        "수강료": random.randint(*fee_range),
        "입학점수": initial_score,
        "현재점수": current_score,
        "성적변화": delta,
        "상담횟수": random.randint(*consult_range),
        "잠재력": random.randint(30, 90),
        "감정소모": random.randint(0, 50) if tier_hint in ["steel", "iron"] else random.randint(0, 20),
        "등록일": enrolled_date.strftime("%Y-%m-%d"),
        "상태": random.choices(["재원", "휴원", "퇴원"], weights=[85, 10, 5])[0],
        "학부모": name[0] + "어머니",
        "학부모연락처": generate_phone(),
        "_tier_hint": tier_hint  # 내부 참조용 (엑셀에 포함 안 됨)
    }


def generate_dataset(count: int) -> pd.DataFrame:
    """
    데이터셋 생성
    
    Args:
        count: 학생 수
        
    Returns:
        DataFrame
    """
    students = [generate_student(i+1) for i in range(count)]
    df = pd.DataFrame(students)
    
    # 내부 참조용 컬럼 제거
    if "_tier_hint" in df.columns:
        df = df.drop(columns=["_tier_hint"])
    
    return df


def analyze_dataset(df: pd.DataFrame) -> dict:
    """
    데이터셋 분석
    """
    return {
        "total": len(df),
        "avg_fee": df["수강료"].mean(),
        "avg_score_delta": df["성적변화"].mean(),
        "avg_consult": df["상담횟수"].mean(),
        "status_dist": df["상태"].value_counts().to_dict(),
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="AUTUS-PRIME 샘플 데이터 생성")
    parser.add_argument("--count", type=int, default=50, help="학생 수 (기본: 50)")
    parser.add_argument("--output", type=str, default="sample_academy_data.xlsx", help="출력 파일명")
    parser.add_argument("--preview", action="store_true", help="미리보기만 (파일 저장 안 함)")
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("  📊 AUTUS-PRIME 샘플 데이터 생성기")
    print("=" * 60)
    
    # 데이터 생성
    print(f"\n🎲 {args.count}명의 학생 데이터 생성 중...")
    df = generate_dataset(args.count)
    
    # 분석
    stats = analyze_dataset(df)
    print(f"\n📈 데이터 분석:")
    print(f"   - 총 학생 수: {stats['total']}명")
    print(f"   - 평균 수강료: ₩{stats['avg_fee']:,.0f}")
    print(f"   - 평균 성적 변화: {stats['avg_score_delta']:+.1f}점")
    print(f"   - 평균 상담 횟수: {stats['avg_consult']:.1f}회")
    print(f"   - 상태 분포: {stats['status_dist']}")
    
    # 미리보기
    print(f"\n📋 미리보기 (상위 5명):")
    print(df.head().to_string(index=False))
    
    # 저장
    if not args.preview:
        output_path = Path(args.output)
        df.to_excel(output_path, index=False, engine="openpyxl")
        print(f"\n✅ 저장 완료: {output_path.absolute()}")
        print(f"\n💡 이 파일을 AUTUS-PRIME 대시보드에 업로드하여 테스트하세요!")
    
    print("\n" + "=" * 60)


if __name__ == "__main__":
    main()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS-PRIME: 샘플 데이터 생성기 (Dogfooding용)

실제 학원 데이터 형식에 맞는 테스트용 엑셀 파일 생성

Usage:
    python generate_sample_data.py
    python generate_sample_data.py --count 100
    python generate_sample_data.py --output my_academy.xlsx
"""

import argparse
import random
from datetime import datetime, timedelta
from pathlib import Path

# pandas 필요
try:
    import pandas as pd
except ImportError:
    print("pandas가 필요합니다: pip install pandas openpyxl")
    exit(1)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 샘플 데이터
# ═══════════════════════════════════════════════════════════════════════════════════════════

# 성씨
LAST_NAMES = [
    "김", "이", "박", "최", "정", "강", "조", "윤", "장", "임",
    "한", "오", "서", "신", "권", "황", "안", "송", "류", "홍"
]

# 이름 (2글자)
FIRST_NAMES = [
    "민수", "영희", "철수", "지연", "성호", "수빈", "준혁", "예진", "태윤", "하은",
    "서준", "지우", "하준", "도윤", "시우", "민준", "현우", "지호", "건우", "선우",
    "유나", "서연", "민서", "하윤", "지아", "서현", "수아", "다은", "채원", "유진"
]

# 학교명
SCHOOLS = [
    "서초중학교", "반포중학교", "잠원중학교", "방배중학교", "서운중학교",
    "서초고등학교", "반포고등학교", "세화고등학교", "상문고등학교", "서울고등학교",
    "서일초등학교", "반포초등학교", "잠원초등학교", "방배초등학교", "서래초등학교"
]

# 학년
GRADES = ["초4", "초5", "초6", "중1", "중2", "중3", "고1", "고2", "고3"]

# 과목
SUBJECTS = ["국어", "영어", "수학", "과학", "사회", "논술"]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 데이터 생성 함수
# ═══════════════════════════════════════════════════════════════════════════════════════════

def generate_phone() -> str:
    """전화번호 생성"""
    return f"010-{random.randint(1000,9999)}-{random.randint(1000,9999)}"


def generate_name() -> str:
    """이름 생성"""
    return random.choice(LAST_NAMES) + random.choice(FIRST_NAMES)


def generate_student(student_id: int) -> dict:
    """
    학생 데이터 생성
    
    다양한 티어 분포를 위해 가중치 적용:
    - 10% 💎 Diamond (고수익, 저엔트로피)
    - 15% 🥇 Platinum
    - 25% 🥈 Gold
    - 30% ⚙️ Steel
    - 20% 🔩 Iron (저수익, 고엔트로피)
    """
    # 티어 결정 (가중치)
    tier_roll = random.random()
    
    if tier_roll < 0.10:  # Diamond (10%)
        fee_range = (450000, 600000)
        score_delta = (15, 30)
        consult_range = (0, 1)
        tier_hint = "diamond"
    elif tier_roll < 0.25:  # Platinum (15%)
        fee_range = (380000, 480000)
        score_delta = (10, 20)
        consult_range = (0, 2)
        tier_hint = "platinum"
    elif tier_roll < 0.50:  # Gold (25%)
        fee_range = (300000, 400000)
        score_delta = (5, 15)
        consult_range = (1, 3)
        tier_hint = "gold"
    elif tier_roll < 0.80:  # Steel (30%)
        fee_range = (200000, 320000)
        score_delta = (-5, 10)
        consult_range = (2, 5)
        tier_hint = "steel"
    else:  # Iron (20%)
        fee_range = (100000, 220000)
        score_delta = (-15, 0)
        consult_range = (5, 10)
        tier_hint = "iron"
    
    # 기본 정보
    name = generate_name()
    initial_score = random.randint(40, 85)
    delta = random.randint(*score_delta)
    current_score = max(0, min(100, initial_score + delta))
    
    # 등록일 (최근 2년 내)
    enrolled_days_ago = random.randint(30, 730)
    enrolled_date = datetime.now() - timedelta(days=enrolled_days_ago)
    
    return {
        "이름": name,
        "전화번호": generate_phone(),
        "학교": random.choice(SCHOOLS),
        "학년": random.choice(GRADES),
        "과목": ", ".join(random.sample(SUBJECTS, k=random.randint(1, 3))),
        "수강료": random.randint(*fee_range),
        "입학점수": initial_score,
        "현재점수": current_score,
        "성적변화": delta,
        "상담횟수": random.randint(*consult_range),
        "잠재력": random.randint(30, 90),
        "감정소모": random.randint(0, 50) if tier_hint in ["steel", "iron"] else random.randint(0, 20),
        "등록일": enrolled_date.strftime("%Y-%m-%d"),
        "상태": random.choices(["재원", "휴원", "퇴원"], weights=[85, 10, 5])[0],
        "학부모": name[0] + "어머니",
        "학부모연락처": generate_phone(),
        "_tier_hint": tier_hint  # 내부 참조용 (엑셀에 포함 안 됨)
    }


def generate_dataset(count: int) -> pd.DataFrame:
    """
    데이터셋 생성
    
    Args:
        count: 학생 수
        
    Returns:
        DataFrame
    """
    students = [generate_student(i+1) for i in range(count)]
    df = pd.DataFrame(students)
    
    # 내부 참조용 컬럼 제거
    if "_tier_hint" in df.columns:
        df = df.drop(columns=["_tier_hint"])
    
    return df


def analyze_dataset(df: pd.DataFrame) -> dict:
    """
    데이터셋 분석
    """
    return {
        "total": len(df),
        "avg_fee": df["수강료"].mean(),
        "avg_score_delta": df["성적변화"].mean(),
        "avg_consult": df["상담횟수"].mean(),
        "status_dist": df["상태"].value_counts().to_dict(),
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="AUTUS-PRIME 샘플 데이터 생성")
    parser.add_argument("--count", type=int, default=50, help="학생 수 (기본: 50)")
    parser.add_argument("--output", type=str, default="sample_academy_data.xlsx", help="출력 파일명")
    parser.add_argument("--preview", action="store_true", help="미리보기만 (파일 저장 안 함)")
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("  📊 AUTUS-PRIME 샘플 데이터 생성기")
    print("=" * 60)
    
    # 데이터 생성
    print(f"\n🎲 {args.count}명의 학생 데이터 생성 중...")
    df = generate_dataset(args.count)
    
    # 분석
    stats = analyze_dataset(df)
    print(f"\n📈 데이터 분석:")
    print(f"   - 총 학생 수: {stats['total']}명")
    print(f"   - 평균 수강료: ₩{stats['avg_fee']:,.0f}")
    print(f"   - 평균 성적 변화: {stats['avg_score_delta']:+.1f}점")
    print(f"   - 평균 상담 횟수: {stats['avg_consult']:.1f}회")
    print(f"   - 상태 분포: {stats['status_dist']}")
    
    # 미리보기
    print(f"\n📋 미리보기 (상위 5명):")
    print(df.head().to_string(index=False))
    
    # 저장
    if not args.preview:
        output_path = Path(args.output)
        df.to_excel(output_path, index=False, engine="openpyxl")
        print(f"\n✅ 저장 완료: {output_path.absolute()}")
        print(f"\n💡 이 파일을 AUTUS-PRIME 대시보드에 업로드하여 테스트하세요!")
    
    print("\n" + "=" * 60)


if __name__ == "__main__":
    main()




















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS-PRIME: 샘플 데이터 생성기 (Dogfooding용)

실제 학원 데이터 형식에 맞는 테스트용 엑셀 파일 생성

Usage:
    python generate_sample_data.py
    python generate_sample_data.py --count 100
    python generate_sample_data.py --output my_academy.xlsx
"""

import argparse
import random
from datetime import datetime, timedelta
from pathlib import Path

# pandas 필요
try:
    import pandas as pd
except ImportError:
    print("pandas가 필요합니다: pip install pandas openpyxl")
    exit(1)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 샘플 데이터
# ═══════════════════════════════════════════════════════════════════════════════════════════

# 성씨
LAST_NAMES = [
    "김", "이", "박", "최", "정", "강", "조", "윤", "장", "임",
    "한", "오", "서", "신", "권", "황", "안", "송", "류", "홍"
]

# 이름 (2글자)
FIRST_NAMES = [
    "민수", "영희", "철수", "지연", "성호", "수빈", "준혁", "예진", "태윤", "하은",
    "서준", "지우", "하준", "도윤", "시우", "민준", "현우", "지호", "건우", "선우",
    "유나", "서연", "민서", "하윤", "지아", "서현", "수아", "다은", "채원", "유진"
]

# 학교명
SCHOOLS = [
    "서초중학교", "반포중학교", "잠원중학교", "방배중학교", "서운중학교",
    "서초고등학교", "반포고등학교", "세화고등학교", "상문고등학교", "서울고등학교",
    "서일초등학교", "반포초등학교", "잠원초등학교", "방배초등학교", "서래초등학교"
]

# 학년
GRADES = ["초4", "초5", "초6", "중1", "중2", "중3", "고1", "고2", "고3"]

# 과목
SUBJECTS = ["국어", "영어", "수학", "과학", "사회", "논술"]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 데이터 생성 함수
# ═══════════════════════════════════════════════════════════════════════════════════════════

def generate_phone() -> str:
    """전화번호 생성"""
    return f"010-{random.randint(1000,9999)}-{random.randint(1000,9999)}"


def generate_name() -> str:
    """이름 생성"""
    return random.choice(LAST_NAMES) + random.choice(FIRST_NAMES)


def generate_student(student_id: int) -> dict:
    """
    학생 데이터 생성
    
    다양한 티어 분포를 위해 가중치 적용:
    - 10% 💎 Diamond (고수익, 저엔트로피)
    - 15% 🥇 Platinum
    - 25% 🥈 Gold
    - 30% ⚙️ Steel
    - 20% 🔩 Iron (저수익, 고엔트로피)
    """
    # 티어 결정 (가중치)
    tier_roll = random.random()
    
    if tier_roll < 0.10:  # Diamond (10%)
        fee_range = (450000, 600000)
        score_delta = (15, 30)
        consult_range = (0, 1)
        tier_hint = "diamond"
    elif tier_roll < 0.25:  # Platinum (15%)
        fee_range = (380000, 480000)
        score_delta = (10, 20)
        consult_range = (0, 2)
        tier_hint = "platinum"
    elif tier_roll < 0.50:  # Gold (25%)
        fee_range = (300000, 400000)
        score_delta = (5, 15)
        consult_range = (1, 3)
        tier_hint = "gold"
    elif tier_roll < 0.80:  # Steel (30%)
        fee_range = (200000, 320000)
        score_delta = (-5, 10)
        consult_range = (2, 5)
        tier_hint = "steel"
    else:  # Iron (20%)
        fee_range = (100000, 220000)
        score_delta = (-15, 0)
        consult_range = (5, 10)
        tier_hint = "iron"
    
    # 기본 정보
    name = generate_name()
    initial_score = random.randint(40, 85)
    delta = random.randint(*score_delta)
    current_score = max(0, min(100, initial_score + delta))
    
    # 등록일 (최근 2년 내)
    enrolled_days_ago = random.randint(30, 730)
    enrolled_date = datetime.now() - timedelta(days=enrolled_days_ago)
    
    return {
        "이름": name,
        "전화번호": generate_phone(),
        "학교": random.choice(SCHOOLS),
        "학년": random.choice(GRADES),
        "과목": ", ".join(random.sample(SUBJECTS, k=random.randint(1, 3))),
        "수강료": random.randint(*fee_range),
        "입학점수": initial_score,
        "현재점수": current_score,
        "성적변화": delta,
        "상담횟수": random.randint(*consult_range),
        "잠재력": random.randint(30, 90),
        "감정소모": random.randint(0, 50) if tier_hint in ["steel", "iron"] else random.randint(0, 20),
        "등록일": enrolled_date.strftime("%Y-%m-%d"),
        "상태": random.choices(["재원", "휴원", "퇴원"], weights=[85, 10, 5])[0],
        "학부모": name[0] + "어머니",
        "학부모연락처": generate_phone(),
        "_tier_hint": tier_hint  # 내부 참조용 (엑셀에 포함 안 됨)
    }


def generate_dataset(count: int) -> pd.DataFrame:
    """
    데이터셋 생성
    
    Args:
        count: 학생 수
        
    Returns:
        DataFrame
    """
    students = [generate_student(i+1) for i in range(count)]
    df = pd.DataFrame(students)
    
    # 내부 참조용 컬럼 제거
    if "_tier_hint" in df.columns:
        df = df.drop(columns=["_tier_hint"])
    
    return df


def analyze_dataset(df: pd.DataFrame) -> dict:
    """
    데이터셋 분석
    """
    return {
        "total": len(df),
        "avg_fee": df["수강료"].mean(),
        "avg_score_delta": df["성적변화"].mean(),
        "avg_consult": df["상담횟수"].mean(),
        "status_dist": df["상태"].value_counts().to_dict(),
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="AUTUS-PRIME 샘플 데이터 생성")
    parser.add_argument("--count", type=int, default=50, help="학생 수 (기본: 50)")
    parser.add_argument("--output", type=str, default="sample_academy_data.xlsx", help="출력 파일명")
    parser.add_argument("--preview", action="store_true", help="미리보기만 (파일 저장 안 함)")
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("  📊 AUTUS-PRIME 샘플 데이터 생성기")
    print("=" * 60)
    
    # 데이터 생성
    print(f"\n🎲 {args.count}명의 학생 데이터 생성 중...")
    df = generate_dataset(args.count)
    
    # 분석
    stats = analyze_dataset(df)
    print(f"\n📈 데이터 분석:")
    print(f"   - 총 학생 수: {stats['total']}명")
    print(f"   - 평균 수강료: ₩{stats['avg_fee']:,.0f}")
    print(f"   - 평균 성적 변화: {stats['avg_score_delta']:+.1f}점")
    print(f"   - 평균 상담 횟수: {stats['avg_consult']:.1f}회")
    print(f"   - 상태 분포: {stats['status_dist']}")
    
    # 미리보기
    print(f"\n📋 미리보기 (상위 5명):")
    print(df.head().to_string(index=False))
    
    # 저장
    if not args.preview:
        output_path = Path(args.output)
        df.to_excel(output_path, index=False, engine="openpyxl")
        print(f"\n✅ 저장 완료: {output_path.absolute()}")
        print(f"\n💡 이 파일을 AUTUS-PRIME 대시보드에 업로드하여 테스트하세요!")
    
    print("\n" + "=" * 60)


if __name__ == "__main__":
    main()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS-PRIME: 샘플 데이터 생성기 (Dogfooding용)

실제 학원 데이터 형식에 맞는 테스트용 엑셀 파일 생성

Usage:
    python generate_sample_data.py
    python generate_sample_data.py --count 100
    python generate_sample_data.py --output my_academy.xlsx
"""

import argparse
import random
from datetime import datetime, timedelta
from pathlib import Path

# pandas 필요
try:
    import pandas as pd
except ImportError:
    print("pandas가 필요합니다: pip install pandas openpyxl")
    exit(1)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 샘플 데이터
# ═══════════════════════════════════════════════════════════════════════════════════════════

# 성씨
LAST_NAMES = [
    "김", "이", "박", "최", "정", "강", "조", "윤", "장", "임",
    "한", "오", "서", "신", "권", "황", "안", "송", "류", "홍"
]

# 이름 (2글자)
FIRST_NAMES = [
    "민수", "영희", "철수", "지연", "성호", "수빈", "준혁", "예진", "태윤", "하은",
    "서준", "지우", "하준", "도윤", "시우", "민준", "현우", "지호", "건우", "선우",
    "유나", "서연", "민서", "하윤", "지아", "서현", "수아", "다은", "채원", "유진"
]

# 학교명
SCHOOLS = [
    "서초중학교", "반포중학교", "잠원중학교", "방배중학교", "서운중학교",
    "서초고등학교", "반포고등학교", "세화고등학교", "상문고등학교", "서울고등학교",
    "서일초등학교", "반포초등학교", "잠원초등학교", "방배초등학교", "서래초등학교"
]

# 학년
GRADES = ["초4", "초5", "초6", "중1", "중2", "중3", "고1", "고2", "고3"]

# 과목
SUBJECTS = ["국어", "영어", "수학", "과학", "사회", "논술"]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 데이터 생성 함수
# ═══════════════════════════════════════════════════════════════════════════════════════════

def generate_phone() -> str:
    """전화번호 생성"""
    return f"010-{random.randint(1000,9999)}-{random.randint(1000,9999)}"


def generate_name() -> str:
    """이름 생성"""
    return random.choice(LAST_NAMES) + random.choice(FIRST_NAMES)


def generate_student(student_id: int) -> dict:
    """
    학생 데이터 생성
    
    다양한 티어 분포를 위해 가중치 적용:
    - 10% 💎 Diamond (고수익, 저엔트로피)
    - 15% 🥇 Platinum
    - 25% 🥈 Gold
    - 30% ⚙️ Steel
    - 20% 🔩 Iron (저수익, 고엔트로피)
    """
    # 티어 결정 (가중치)
    tier_roll = random.random()
    
    if tier_roll < 0.10:  # Diamond (10%)
        fee_range = (450000, 600000)
        score_delta = (15, 30)
        consult_range = (0, 1)
        tier_hint = "diamond"
    elif tier_roll < 0.25:  # Platinum (15%)
        fee_range = (380000, 480000)
        score_delta = (10, 20)
        consult_range = (0, 2)
        tier_hint = "platinum"
    elif tier_roll < 0.50:  # Gold (25%)
        fee_range = (300000, 400000)
        score_delta = (5, 15)
        consult_range = (1, 3)
        tier_hint = "gold"
    elif tier_roll < 0.80:  # Steel (30%)
        fee_range = (200000, 320000)
        score_delta = (-5, 10)
        consult_range = (2, 5)
        tier_hint = "steel"
    else:  # Iron (20%)
        fee_range = (100000, 220000)
        score_delta = (-15, 0)
        consult_range = (5, 10)
        tier_hint = "iron"
    
    # 기본 정보
    name = generate_name()
    initial_score = random.randint(40, 85)
    delta = random.randint(*score_delta)
    current_score = max(0, min(100, initial_score + delta))
    
    # 등록일 (최근 2년 내)
    enrolled_days_ago = random.randint(30, 730)
    enrolled_date = datetime.now() - timedelta(days=enrolled_days_ago)
    
    return {
        "이름": name,
        "전화번호": generate_phone(),
        "학교": random.choice(SCHOOLS),
        "학년": random.choice(GRADES),
        "과목": ", ".join(random.sample(SUBJECTS, k=random.randint(1, 3))),
        "수강료": random.randint(*fee_range),
        "입학점수": initial_score,
        "현재점수": current_score,
        "성적변화": delta,
        "상담횟수": random.randint(*consult_range),
        "잠재력": random.randint(30, 90),
        "감정소모": random.randint(0, 50) if tier_hint in ["steel", "iron"] else random.randint(0, 20),
        "등록일": enrolled_date.strftime("%Y-%m-%d"),
        "상태": random.choices(["재원", "휴원", "퇴원"], weights=[85, 10, 5])[0],
        "학부모": name[0] + "어머니",
        "학부모연락처": generate_phone(),
        "_tier_hint": tier_hint  # 내부 참조용 (엑셀에 포함 안 됨)
    }


def generate_dataset(count: int) -> pd.DataFrame:
    """
    데이터셋 생성
    
    Args:
        count: 학생 수
        
    Returns:
        DataFrame
    """
    students = [generate_student(i+1) for i in range(count)]
    df = pd.DataFrame(students)
    
    # 내부 참조용 컬럼 제거
    if "_tier_hint" in df.columns:
        df = df.drop(columns=["_tier_hint"])
    
    return df


def analyze_dataset(df: pd.DataFrame) -> dict:
    """
    데이터셋 분석
    """
    return {
        "total": len(df),
        "avg_fee": df["수강료"].mean(),
        "avg_score_delta": df["성적변화"].mean(),
        "avg_consult": df["상담횟수"].mean(),
        "status_dist": df["상태"].value_counts().to_dict(),
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="AUTUS-PRIME 샘플 데이터 생성")
    parser.add_argument("--count", type=int, default=50, help="학생 수 (기본: 50)")
    parser.add_argument("--output", type=str, default="sample_academy_data.xlsx", help="출력 파일명")
    parser.add_argument("--preview", action="store_true", help="미리보기만 (파일 저장 안 함)")
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("  📊 AUTUS-PRIME 샘플 데이터 생성기")
    print("=" * 60)
    
    # 데이터 생성
    print(f"\n🎲 {args.count}명의 학생 데이터 생성 중...")
    df = generate_dataset(args.count)
    
    # 분석
    stats = analyze_dataset(df)
    print(f"\n📈 데이터 분석:")
    print(f"   - 총 학생 수: {stats['total']}명")
    print(f"   - 평균 수강료: ₩{stats['avg_fee']:,.0f}")
    print(f"   - 평균 성적 변화: {stats['avg_score_delta']:+.1f}점")
    print(f"   - 평균 상담 횟수: {stats['avg_consult']:.1f}회")
    print(f"   - 상태 분포: {stats['status_dist']}")
    
    # 미리보기
    print(f"\n📋 미리보기 (상위 5명):")
    print(df.head().to_string(index=False))
    
    # 저장
    if not args.preview:
        output_path = Path(args.output)
        df.to_excel(output_path, index=False, engine="openpyxl")
        print(f"\n✅ 저장 완료: {output_path.absolute()}")
        print(f"\n💡 이 파일을 AUTUS-PRIME 대시보드에 업로드하여 테스트하세요!")
    
    print("\n" + "=" * 60)


if __name__ == "__main__":
    main()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS-PRIME: 샘플 데이터 생성기 (Dogfooding용)

실제 학원 데이터 형식에 맞는 테스트용 엑셀 파일 생성

Usage:
    python generate_sample_data.py
    python generate_sample_data.py --count 100
    python generate_sample_data.py --output my_academy.xlsx
"""

import argparse
import random
from datetime import datetime, timedelta
from pathlib import Path

# pandas 필요
try:
    import pandas as pd
except ImportError:
    print("pandas가 필요합니다: pip install pandas openpyxl")
    exit(1)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 샘플 데이터
# ═══════════════════════════════════════════════════════════════════════════════════════════

# 성씨
LAST_NAMES = [
    "김", "이", "박", "최", "정", "강", "조", "윤", "장", "임",
    "한", "오", "서", "신", "권", "황", "안", "송", "류", "홍"
]

# 이름 (2글자)
FIRST_NAMES = [
    "민수", "영희", "철수", "지연", "성호", "수빈", "준혁", "예진", "태윤", "하은",
    "서준", "지우", "하준", "도윤", "시우", "민준", "현우", "지호", "건우", "선우",
    "유나", "서연", "민서", "하윤", "지아", "서현", "수아", "다은", "채원", "유진"
]

# 학교명
SCHOOLS = [
    "서초중학교", "반포중학교", "잠원중학교", "방배중학교", "서운중학교",
    "서초고등학교", "반포고등학교", "세화고등학교", "상문고등학교", "서울고등학교",
    "서일초등학교", "반포초등학교", "잠원초등학교", "방배초등학교", "서래초등학교"
]

# 학년
GRADES = ["초4", "초5", "초6", "중1", "중2", "중3", "고1", "고2", "고3"]

# 과목
SUBJECTS = ["국어", "영어", "수학", "과학", "사회", "논술"]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 데이터 생성 함수
# ═══════════════════════════════════════════════════════════════════════════════════════════

def generate_phone() -> str:
    """전화번호 생성"""
    return f"010-{random.randint(1000,9999)}-{random.randint(1000,9999)}"


def generate_name() -> str:
    """이름 생성"""
    return random.choice(LAST_NAMES) + random.choice(FIRST_NAMES)


def generate_student(student_id: int) -> dict:
    """
    학생 데이터 생성
    
    다양한 티어 분포를 위해 가중치 적용:
    - 10% 💎 Diamond (고수익, 저엔트로피)
    - 15% 🥇 Platinum
    - 25% 🥈 Gold
    - 30% ⚙️ Steel
    - 20% 🔩 Iron (저수익, 고엔트로피)
    """
    # 티어 결정 (가중치)
    tier_roll = random.random()
    
    if tier_roll < 0.10:  # Diamond (10%)
        fee_range = (450000, 600000)
        score_delta = (15, 30)
        consult_range = (0, 1)
        tier_hint = "diamond"
    elif tier_roll < 0.25:  # Platinum (15%)
        fee_range = (380000, 480000)
        score_delta = (10, 20)
        consult_range = (0, 2)
        tier_hint = "platinum"
    elif tier_roll < 0.50:  # Gold (25%)
        fee_range = (300000, 400000)
        score_delta = (5, 15)
        consult_range = (1, 3)
        tier_hint = "gold"
    elif tier_roll < 0.80:  # Steel (30%)
        fee_range = (200000, 320000)
        score_delta = (-5, 10)
        consult_range = (2, 5)
        tier_hint = "steel"
    else:  # Iron (20%)
        fee_range = (100000, 220000)
        score_delta = (-15, 0)
        consult_range = (5, 10)
        tier_hint = "iron"
    
    # 기본 정보
    name = generate_name()
    initial_score = random.randint(40, 85)
    delta = random.randint(*score_delta)
    current_score = max(0, min(100, initial_score + delta))
    
    # 등록일 (최근 2년 내)
    enrolled_days_ago = random.randint(30, 730)
    enrolled_date = datetime.now() - timedelta(days=enrolled_days_ago)
    
    return {
        "이름": name,
        "전화번호": generate_phone(),
        "학교": random.choice(SCHOOLS),
        "학년": random.choice(GRADES),
        "과목": ", ".join(random.sample(SUBJECTS, k=random.randint(1, 3))),
        "수강료": random.randint(*fee_range),
        "입학점수": initial_score,
        "현재점수": current_score,
        "성적변화": delta,
        "상담횟수": random.randint(*consult_range),
        "잠재력": random.randint(30, 90),
        "감정소모": random.randint(0, 50) if tier_hint in ["steel", "iron"] else random.randint(0, 20),
        "등록일": enrolled_date.strftime("%Y-%m-%d"),
        "상태": random.choices(["재원", "휴원", "퇴원"], weights=[85, 10, 5])[0],
        "학부모": name[0] + "어머니",
        "학부모연락처": generate_phone(),
        "_tier_hint": tier_hint  # 내부 참조용 (엑셀에 포함 안 됨)
    }


def generate_dataset(count: int) -> pd.DataFrame:
    """
    데이터셋 생성
    
    Args:
        count: 학생 수
        
    Returns:
        DataFrame
    """
    students = [generate_student(i+1) for i in range(count)]
    df = pd.DataFrame(students)
    
    # 내부 참조용 컬럼 제거
    if "_tier_hint" in df.columns:
        df = df.drop(columns=["_tier_hint"])
    
    return df


def analyze_dataset(df: pd.DataFrame) -> dict:
    """
    데이터셋 분석
    """
    return {
        "total": len(df),
        "avg_fee": df["수강료"].mean(),
        "avg_score_delta": df["성적변화"].mean(),
        "avg_consult": df["상담횟수"].mean(),
        "status_dist": df["상태"].value_counts().to_dict(),
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="AUTUS-PRIME 샘플 데이터 생성")
    parser.add_argument("--count", type=int, default=50, help="학생 수 (기본: 50)")
    parser.add_argument("--output", type=str, default="sample_academy_data.xlsx", help="출력 파일명")
    parser.add_argument("--preview", action="store_true", help="미리보기만 (파일 저장 안 함)")
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("  📊 AUTUS-PRIME 샘플 데이터 생성기")
    print("=" * 60)
    
    # 데이터 생성
    print(f"\n🎲 {args.count}명의 학생 데이터 생성 중...")
    df = generate_dataset(args.count)
    
    # 분석
    stats = analyze_dataset(df)
    print(f"\n📈 데이터 분석:")
    print(f"   - 총 학생 수: {stats['total']}명")
    print(f"   - 평균 수강료: ₩{stats['avg_fee']:,.0f}")
    print(f"   - 평균 성적 변화: {stats['avg_score_delta']:+.1f}점")
    print(f"   - 평균 상담 횟수: {stats['avg_consult']:.1f}회")
    print(f"   - 상태 분포: {stats['status_dist']}")
    
    # 미리보기
    print(f"\n📋 미리보기 (상위 5명):")
    print(df.head().to_string(index=False))
    
    # 저장
    if not args.preview:
        output_path = Path(args.output)
        df.to_excel(output_path, index=False, engine="openpyxl")
        print(f"\n✅ 저장 완료: {output_path.absolute()}")
        print(f"\n💡 이 파일을 AUTUS-PRIME 대시보드에 업로드하여 테스트하세요!")
    
    print("\n" + "=" * 60)


if __name__ == "__main__":
    main()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS-PRIME: 샘플 데이터 생성기 (Dogfooding용)

실제 학원 데이터 형식에 맞는 테스트용 엑셀 파일 생성

Usage:
    python generate_sample_data.py
    python generate_sample_data.py --count 100
    python generate_sample_data.py --output my_academy.xlsx
"""

import argparse
import random
from datetime import datetime, timedelta
from pathlib import Path

# pandas 필요
try:
    import pandas as pd
except ImportError:
    print("pandas가 필요합니다: pip install pandas openpyxl")
    exit(1)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 샘플 데이터
# ═══════════════════════════════════════════════════════════════════════════════════════════

# 성씨
LAST_NAMES = [
    "김", "이", "박", "최", "정", "강", "조", "윤", "장", "임",
    "한", "오", "서", "신", "권", "황", "안", "송", "류", "홍"
]

# 이름 (2글자)
FIRST_NAMES = [
    "민수", "영희", "철수", "지연", "성호", "수빈", "준혁", "예진", "태윤", "하은",
    "서준", "지우", "하준", "도윤", "시우", "민준", "현우", "지호", "건우", "선우",
    "유나", "서연", "민서", "하윤", "지아", "서현", "수아", "다은", "채원", "유진"
]

# 학교명
SCHOOLS = [
    "서초중학교", "반포중학교", "잠원중학교", "방배중학교", "서운중학교",
    "서초고등학교", "반포고등학교", "세화고등학교", "상문고등학교", "서울고등학교",
    "서일초등학교", "반포초등학교", "잠원초등학교", "방배초등학교", "서래초등학교"
]

# 학년
GRADES = ["초4", "초5", "초6", "중1", "중2", "중3", "고1", "고2", "고3"]

# 과목
SUBJECTS = ["국어", "영어", "수학", "과학", "사회", "논술"]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 데이터 생성 함수
# ═══════════════════════════════════════════════════════════════════════════════════════════

def generate_phone() -> str:
    """전화번호 생성"""
    return f"010-{random.randint(1000,9999)}-{random.randint(1000,9999)}"


def generate_name() -> str:
    """이름 생성"""
    return random.choice(LAST_NAMES) + random.choice(FIRST_NAMES)


def generate_student(student_id: int) -> dict:
    """
    학생 데이터 생성
    
    다양한 티어 분포를 위해 가중치 적용:
    - 10% 💎 Diamond (고수익, 저엔트로피)
    - 15% 🥇 Platinum
    - 25% 🥈 Gold
    - 30% ⚙️ Steel
    - 20% 🔩 Iron (저수익, 고엔트로피)
    """
    # 티어 결정 (가중치)
    tier_roll = random.random()
    
    if tier_roll < 0.10:  # Diamond (10%)
        fee_range = (450000, 600000)
        score_delta = (15, 30)
        consult_range = (0, 1)
        tier_hint = "diamond"
    elif tier_roll < 0.25:  # Platinum (15%)
        fee_range = (380000, 480000)
        score_delta = (10, 20)
        consult_range = (0, 2)
        tier_hint = "platinum"
    elif tier_roll < 0.50:  # Gold (25%)
        fee_range = (300000, 400000)
        score_delta = (5, 15)
        consult_range = (1, 3)
        tier_hint = "gold"
    elif tier_roll < 0.80:  # Steel (30%)
        fee_range = (200000, 320000)
        score_delta = (-5, 10)
        consult_range = (2, 5)
        tier_hint = "steel"
    else:  # Iron (20%)
        fee_range = (100000, 220000)
        score_delta = (-15, 0)
        consult_range = (5, 10)
        tier_hint = "iron"
    
    # 기본 정보
    name = generate_name()
    initial_score = random.randint(40, 85)
    delta = random.randint(*score_delta)
    current_score = max(0, min(100, initial_score + delta))
    
    # 등록일 (최근 2년 내)
    enrolled_days_ago = random.randint(30, 730)
    enrolled_date = datetime.now() - timedelta(days=enrolled_days_ago)
    
    return {
        "이름": name,
        "전화번호": generate_phone(),
        "학교": random.choice(SCHOOLS),
        "학년": random.choice(GRADES),
        "과목": ", ".join(random.sample(SUBJECTS, k=random.randint(1, 3))),
        "수강료": random.randint(*fee_range),
        "입학점수": initial_score,
        "현재점수": current_score,
        "성적변화": delta,
        "상담횟수": random.randint(*consult_range),
        "잠재력": random.randint(30, 90),
        "감정소모": random.randint(0, 50) if tier_hint in ["steel", "iron"] else random.randint(0, 20),
        "등록일": enrolled_date.strftime("%Y-%m-%d"),
        "상태": random.choices(["재원", "휴원", "퇴원"], weights=[85, 10, 5])[0],
        "학부모": name[0] + "어머니",
        "학부모연락처": generate_phone(),
        "_tier_hint": tier_hint  # 내부 참조용 (엑셀에 포함 안 됨)
    }


def generate_dataset(count: int) -> pd.DataFrame:
    """
    데이터셋 생성
    
    Args:
        count: 학생 수
        
    Returns:
        DataFrame
    """
    students = [generate_student(i+1) for i in range(count)]
    df = pd.DataFrame(students)
    
    # 내부 참조용 컬럼 제거
    if "_tier_hint" in df.columns:
        df = df.drop(columns=["_tier_hint"])
    
    return df


def analyze_dataset(df: pd.DataFrame) -> dict:
    """
    데이터셋 분석
    """
    return {
        "total": len(df),
        "avg_fee": df["수강료"].mean(),
        "avg_score_delta": df["성적변화"].mean(),
        "avg_consult": df["상담횟수"].mean(),
        "status_dist": df["상태"].value_counts().to_dict(),
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="AUTUS-PRIME 샘플 데이터 생성")
    parser.add_argument("--count", type=int, default=50, help="학생 수 (기본: 50)")
    parser.add_argument("--output", type=str, default="sample_academy_data.xlsx", help="출력 파일명")
    parser.add_argument("--preview", action="store_true", help="미리보기만 (파일 저장 안 함)")
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("  📊 AUTUS-PRIME 샘플 데이터 생성기")
    print("=" * 60)
    
    # 데이터 생성
    print(f"\n🎲 {args.count}명의 학생 데이터 생성 중...")
    df = generate_dataset(args.count)
    
    # 분석
    stats = analyze_dataset(df)
    print(f"\n📈 데이터 분석:")
    print(f"   - 총 학생 수: {stats['total']}명")
    print(f"   - 평균 수강료: ₩{stats['avg_fee']:,.0f}")
    print(f"   - 평균 성적 변화: {stats['avg_score_delta']:+.1f}점")
    print(f"   - 평균 상담 횟수: {stats['avg_consult']:.1f}회")
    print(f"   - 상태 분포: {stats['status_dist']}")
    
    # 미리보기
    print(f"\n📋 미리보기 (상위 5명):")
    print(df.head().to_string(index=False))
    
    # 저장
    if not args.preview:
        output_path = Path(args.output)
        df.to_excel(output_path, index=False, engine="openpyxl")
        print(f"\n✅ 저장 완료: {output_path.absolute()}")
        print(f"\n💡 이 파일을 AUTUS-PRIME 대시보드에 업로드하여 테스트하세요!")
    
    print("\n" + "=" * 60)


if __name__ == "__main__":
    main()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS-PRIME: 샘플 데이터 생성기 (Dogfooding용)

실제 학원 데이터 형식에 맞는 테스트용 엑셀 파일 생성

Usage:
    python generate_sample_data.py
    python generate_sample_data.py --count 100
    python generate_sample_data.py --output my_academy.xlsx
"""

import argparse
import random
from datetime import datetime, timedelta
from pathlib import Path

# pandas 필요
try:
    import pandas as pd
except ImportError:
    print("pandas가 필요합니다: pip install pandas openpyxl")
    exit(1)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 샘플 데이터
# ═══════════════════════════════════════════════════════════════════════════════════════════

# 성씨
LAST_NAMES = [
    "김", "이", "박", "최", "정", "강", "조", "윤", "장", "임",
    "한", "오", "서", "신", "권", "황", "안", "송", "류", "홍"
]

# 이름 (2글자)
FIRST_NAMES = [
    "민수", "영희", "철수", "지연", "성호", "수빈", "준혁", "예진", "태윤", "하은",
    "서준", "지우", "하준", "도윤", "시우", "민준", "현우", "지호", "건우", "선우",
    "유나", "서연", "민서", "하윤", "지아", "서현", "수아", "다은", "채원", "유진"
]

# 학교명
SCHOOLS = [
    "서초중학교", "반포중학교", "잠원중학교", "방배중학교", "서운중학교",
    "서초고등학교", "반포고등학교", "세화고등학교", "상문고등학교", "서울고등학교",
    "서일초등학교", "반포초등학교", "잠원초등학교", "방배초등학교", "서래초등학교"
]

# 학년
GRADES = ["초4", "초5", "초6", "중1", "중2", "중3", "고1", "고2", "고3"]

# 과목
SUBJECTS = ["국어", "영어", "수학", "과학", "사회", "논술"]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 데이터 생성 함수
# ═══════════════════════════════════════════════════════════════════════════════════════════

def generate_phone() -> str:
    """전화번호 생성"""
    return f"010-{random.randint(1000,9999)}-{random.randint(1000,9999)}"


def generate_name() -> str:
    """이름 생성"""
    return random.choice(LAST_NAMES) + random.choice(FIRST_NAMES)


def generate_student(student_id: int) -> dict:
    """
    학생 데이터 생성
    
    다양한 티어 분포를 위해 가중치 적용:
    - 10% 💎 Diamond (고수익, 저엔트로피)
    - 15% 🥇 Platinum
    - 25% 🥈 Gold
    - 30% ⚙️ Steel
    - 20% 🔩 Iron (저수익, 고엔트로피)
    """
    # 티어 결정 (가중치)
    tier_roll = random.random()
    
    if tier_roll < 0.10:  # Diamond (10%)
        fee_range = (450000, 600000)
        score_delta = (15, 30)
        consult_range = (0, 1)
        tier_hint = "diamond"
    elif tier_roll < 0.25:  # Platinum (15%)
        fee_range = (380000, 480000)
        score_delta = (10, 20)
        consult_range = (0, 2)
        tier_hint = "platinum"
    elif tier_roll < 0.50:  # Gold (25%)
        fee_range = (300000, 400000)
        score_delta = (5, 15)
        consult_range = (1, 3)
        tier_hint = "gold"
    elif tier_roll < 0.80:  # Steel (30%)
        fee_range = (200000, 320000)
        score_delta = (-5, 10)
        consult_range = (2, 5)
        tier_hint = "steel"
    else:  # Iron (20%)
        fee_range = (100000, 220000)
        score_delta = (-15, 0)
        consult_range = (5, 10)
        tier_hint = "iron"
    
    # 기본 정보
    name = generate_name()
    initial_score = random.randint(40, 85)
    delta = random.randint(*score_delta)
    current_score = max(0, min(100, initial_score + delta))
    
    # 등록일 (최근 2년 내)
    enrolled_days_ago = random.randint(30, 730)
    enrolled_date = datetime.now() - timedelta(days=enrolled_days_ago)
    
    return {
        "이름": name,
        "전화번호": generate_phone(),
        "학교": random.choice(SCHOOLS),
        "학년": random.choice(GRADES),
        "과목": ", ".join(random.sample(SUBJECTS, k=random.randint(1, 3))),
        "수강료": random.randint(*fee_range),
        "입학점수": initial_score,
        "현재점수": current_score,
        "성적변화": delta,
        "상담횟수": random.randint(*consult_range),
        "잠재력": random.randint(30, 90),
        "감정소모": random.randint(0, 50) if tier_hint in ["steel", "iron"] else random.randint(0, 20),
        "등록일": enrolled_date.strftime("%Y-%m-%d"),
        "상태": random.choices(["재원", "휴원", "퇴원"], weights=[85, 10, 5])[0],
        "학부모": name[0] + "어머니",
        "학부모연락처": generate_phone(),
        "_tier_hint": tier_hint  # 내부 참조용 (엑셀에 포함 안 됨)
    }


def generate_dataset(count: int) -> pd.DataFrame:
    """
    데이터셋 생성
    
    Args:
        count: 학생 수
        
    Returns:
        DataFrame
    """
    students = [generate_student(i+1) for i in range(count)]
    df = pd.DataFrame(students)
    
    # 내부 참조용 컬럼 제거
    if "_tier_hint" in df.columns:
        df = df.drop(columns=["_tier_hint"])
    
    return df


def analyze_dataset(df: pd.DataFrame) -> dict:
    """
    데이터셋 분석
    """
    return {
        "total": len(df),
        "avg_fee": df["수강료"].mean(),
        "avg_score_delta": df["성적변화"].mean(),
        "avg_consult": df["상담횟수"].mean(),
        "status_dist": df["상태"].value_counts().to_dict(),
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="AUTUS-PRIME 샘플 데이터 생성")
    parser.add_argument("--count", type=int, default=50, help="학생 수 (기본: 50)")
    parser.add_argument("--output", type=str, default="sample_academy_data.xlsx", help="출력 파일명")
    parser.add_argument("--preview", action="store_true", help="미리보기만 (파일 저장 안 함)")
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("  📊 AUTUS-PRIME 샘플 데이터 생성기")
    print("=" * 60)
    
    # 데이터 생성
    print(f"\n🎲 {args.count}명의 학생 데이터 생성 중...")
    df = generate_dataset(args.count)
    
    # 분석
    stats = analyze_dataset(df)
    print(f"\n📈 데이터 분석:")
    print(f"   - 총 학생 수: {stats['total']}명")
    print(f"   - 평균 수강료: ₩{stats['avg_fee']:,.0f}")
    print(f"   - 평균 성적 변화: {stats['avg_score_delta']:+.1f}점")
    print(f"   - 평균 상담 횟수: {stats['avg_consult']:.1f}회")
    print(f"   - 상태 분포: {stats['status_dist']}")
    
    # 미리보기
    print(f"\n📋 미리보기 (상위 5명):")
    print(df.head().to_string(index=False))
    
    # 저장
    if not args.preview:
        output_path = Path(args.output)
        df.to_excel(output_path, index=False, engine="openpyxl")
        print(f"\n✅ 저장 완료: {output_path.absolute()}")
        print(f"\n💡 이 파일을 AUTUS-PRIME 대시보드에 업로드하여 테스트하세요!")
    
    print("\n" + "=" * 60)


if __name__ == "__main__":
    main()

























