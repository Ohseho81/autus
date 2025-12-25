#!/usr/bin/env python3
"""
AUTUS v1.0 Document Drafter
===========================
계약서 및 제안서 자동 생성기

Usage:
    python3 drafter.py --type contract --output ./docs/contract.md
    python3 drafter.py --type proposal
"""

import argparse
from datetime import datetime
from kernel import AutusKernel

# ═══════════════════════════════════════════════════════════════════════════════
# TEMPLATES
# ═══════════════════════════════════════════════════════════════════════════════

CONTRACT_TEMPLATE = """
# 교육서비스 고도화 및 IP 라이선스 계약서

**계약 번호:** AUTUS-{contract_id}  
**작성일:** {date}  
**생성 시스템:** AUTUS v1.0 무결성 자산 요새

---

## 제1조 (목적)

본 계약은 **갑**(이하 "ATB")과 **을**(이하 "김종호 교육법인")이 교육서비스 고도화, 
공동 R&D, 시스템 운영 및 IP 라이선스에 관한 상호 협력 사항을 정함을 목적으로 한다.

---

## 제2조 (계약 당사자)

### 갑 (서비스 제공자)
- **상호:** ATB (AUTUS Technology Base)
- **대표:** [파운더명]
- **사업자등록번호:** [사업자번호]

### 을 (서비스 이용자)
- **상호:** 김종호 교육법인 (교육법인_1 ~ 교육법인_6 포함)
- **대표:** 김종호
- **총 매출:** ₩{jongho_revenue}억
- **총 수익:** ₩{jongho_profit}억

---

## 제3조 (거래 내역)

본 계약에 따른 연간 거래 내역은 다음과 같다.

| 항목 | 금액 (억원) | 비율 | 설명 |
|------|-------------|------|------|
{transaction_table}
| **합계** | **{total_transfer}** | **{total_ratio}%** | |

---

## 제4조 (로열티)

1. 을은 갑이 제공하는 AUTUS 플랫폼 기술 사용에 대한 대가로 
   을의 연 매출의 **{royalty_rate}%** 이하에 해당하는 금액을 로열티로 지급한다.

2. 로열티 금액: **₩{royalty_amount}억/년**

3. 지급 시기: 매 분기 말일로부터 30일 이내

---

## 제5조 (R&D 분담금)

1. 갑과 을은 교육 콘텐츠 및 기술 고도화를 위한 공동 R&D 프로젝트를 수행한다.

2. 을은 공동 R&D 비용의 일부로 연간 **₩{rnd_amount}억**을 분담한다.

3. R&D 프로젝트 범위:
   - AI 기반 학습 분석 시스템
   - 교육 콘텐츠 자동화 도구
   - 학습 관리 시스템(LMS) 고도화

---

## 제6조 (시스템 운영 용역)

1. 갑은 을에게 다음 시스템 운영 서비스를 제공한다:
   - 통합 교육 플랫폼 유지보수
   - 데이터 분석 및 리포팅
   - 기술 지원 및 컨설팅

2. 용역비: **₩{service_amount}억/년**

3. 서비스 수준 협약(SLA): 가용성 99.5% 이상

---

## 제7조 (IP 라이선스)

1. 갑은 을에게 AUTUS 관련 지적재산권의 비독점적 사용권을 부여한다.

2. 라이선스 범위:
   - AUTUS 브랜드 사용권
   - 교육 콘텐츠 제작 도구
   - 분석 알고리즘

3. 라이선스 비용: **₩{ip_amount}억/년** (해당 시)

---

## 제8조 (세금 처리)

1. 본 계약에 따른 모든 거래는 관련 세법에 따라 적법하게 처리한다.

2. 국세청 적합성 점수: **{compliance}%**

3. 예상 절세 효과:
   - 갑 (ATB): 적자 커버 **₩{deficit_coverage}억**, 부채 감소 **₩{debt_reduction}억/년**
   - 을 (김종호): 비용 처리 절세 **₩{tax_saved}억/년**

---

## 제9조 (계약 기간)

1. 본 계약의 유효 기간은 계약 체결일로부터 **1년**으로 한다.

2. 계약 만료 30일 전까지 서면 해지 통보가 없는 경우 1년 단위로 자동 연장된다.

---

## 제10조 (비밀 유지)

양 당사자는 본 계약의 내용 및 계약 이행 과정에서 알게 된 상대방의 
영업 비밀을 제3자에게 누설하지 아니한다.

---

## 제11조 (분쟁 해결)

본 계약과 관련하여 분쟁이 발생한 경우, 양 당사자는 우선 협의하여 해결하고,
협의가 이루어지지 않을 경우 서울중앙지방법원을 관할 법원으로 한다.

---

## 서명

본 계약의 성립을 증명하기 위하여 본 계약서 2부를 작성하고, 
갑과 을이 서명 날인한 후 각 1부씩 보관한다.

**{date}**

| | 갑 (ATB) | 을 (김종호 교육법인) |
|---|---|---|
| **대표** | | |
| **서명** | | |

---

*본 계약서는 AUTUS v1.0 시스템에 의해 자동 생성되었습니다.*  
*물리 손실 함수: L = ∫(P + R×S)dt*

"""

PROPOSAL_TEMPLATE = """
# AUTUS 협력 제안서

**제안 번호:** PROP-{proposal_id}  
**작성일:** {date}  
**제안자:** ATB (AUTUS Technology Base)

---

## 📋 Executive Summary

김종호 교육법인의 지속 성장과 ATB의 기술 역량을 결합하여 
**상호 Win-Win 협력 구조**를 제안드립니다.

### 핵심 제안

| 항목 | 내용 |
|------|------|
| **총 협력 규모** | ₩{total_transfer}억/년 |
| **귀사 절세 효과** | ₩{tax_saved}억/년 |
| **국세청 적합성** | {compliance}% |

---

## 📊 귀사 현황 분석

- **총 매출:** ₩{jongho_revenue}억
- **총 수익:** ₩{jongho_profit}억
- **법인 수:** 6개 (교육법인_1 ~ 6)

---

## 🎯 제안 구조

### 1. 기술 로열티 (₩{royalty_amount}억/년)
- AUTUS 플랫폼 기술 사용권
- 매출 대비 {royalty_rate}% 이하 (국세청 안전 기준 내)

### 2. 공동 R&D (₩{rnd_amount}억/년)
- AI 학습 분석 시스템 공동 개발
- 교육 콘텐츠 자동화 협력
- R&D 세액공제 추가 혜택

### 3. 시스템 운영 용역 (₩{service_amount}억/년)
- 통합 플랫폼 유지보수
- 데이터 분석 서비스
- 24/7 기술 지원

---

## 💰 귀사 혜택

### 즉시 효과
- **연간 절세:** ₩{tax_saved}억
- **월간 절세:** ₩{monthly_tax_saved}억

### 장기 효과
- 기술 역량 강화
- 브랜드 가치 상승
- 사업 확장 기반 마련

---

## 📈 시뮬레이션

### 5년 누적 효과

| 연차 | 협력금 | 절세액 | 누적 절세 |
|------|--------|--------|-----------|
| 1년 | ₩{total_transfer}억 | ₩{tax_saved}억 | ₩{tax_saved}억 |
| 2년 | ₩{total_transfer}억 | ₩{tax_saved}억 | ₩{tax_saved_2y}억 |
| 3년 | ₩{total_transfer}억 | ₩{tax_saved}억 | ₩{tax_saved_3y}억 |
| 4년 | ₩{total_transfer}억 | ₩{tax_saved}억 | ₩{tax_saved_4y}억 |
| 5년 | ₩{total_transfer}억 | ₩{tax_saved}억 | ₩{tax_saved_5y}억 |

---

## ✅ 다음 단계

1. **1주 내:** 세부 조건 협의 미팅
2. **2주 내:** 계약서 초안 검토
3. **1개월 내:** 계약 체결 및 실행

---

## 📞 연락처

**ATB (AUTUS Technology Base)**
- 담당: 파운더
- 이메일: founder@autus.io
- 전화: 010-XXXX-XXXX

---

*본 제안서는 AUTUS v1.0 시스템에 의해 자동 생성되었습니다.*

"""

# ═══════════════════════════════════════════════════════════════════════════════
# DRAFTER CLASS
# ═══════════════════════════════════════════════════════════════════════════════

class DocumentDrafter:
    """문서 자동 생성기"""
    
    def __init__(self, transfer_ratio: float = 0.30):
        self.kernel = AutusKernel()
        self.report = self.kernel.generate_full_report(transfer_ratio)
        self.date = datetime.now().strftime("%Y년 %m월 %d일")
    
    def generate_contract(self) -> str:
        """계약서 생성"""
        plan = self.report["optimized_plan"]
        jongho = self.report["jongho"]
        founder = self.report["founder"]
        
        # 거래 테이블 생성
        tx_rows = []
        for tx in plan["transactions"]:
            ratio = tx["amount"] / jongho["total_revenue"] * 100
            tx_rows.append(f"| {tx['type']} | {tx['amount']:.1f} | {ratio:.2f}% | {tx['desc']} |")
        
        transaction_table = "\n".join(tx_rows)
        
        # 각 항목별 금액 추출
        royalty = sum(tx["amount"] for tx in plan["transactions"] if tx["type"] == "ROYALTY")
        rnd = sum(tx["amount"] for tx in plan["transactions"] if tx["type"] == "RND_SHARE")
        service = sum(tx["amount"] for tx in plan["transactions"] if tx["type"] == "SERVICE_FEE")
        ip = sum(tx["amount"] for tx in plan["transactions"] if tx["type"] == "IP_LICENSE")
        
        return CONTRACT_TEMPLATE.format(
            contract_id=datetime.now().strftime("%Y%m%d%H%M"),
            date=self.date,
            jongho_revenue=jongho["total_revenue"],
            jongho_profit=jongho["total_profit"],
            transaction_table=transaction_table,
            total_transfer=f"{plan['total']:.1f}",
            total_ratio=f"{plan['total']/jongho['total_revenue']*100:.2f}",
            royalty_rate="2",
            royalty_amount=f"{royalty:.1f}",
            rnd_amount=f"{rnd:.1f}",
            service_amount=f"{service:.1f}",
            ip_amount=f"{ip:.1f}" if ip > 0 else "0",
            compliance=f"{plan['compliance']*100:.0f}",
            deficit_coverage=f"{plan['deficit_coverage']:.1f}",
            debt_reduction=f"{plan['debt_reduction']:.1f}",
            tax_saved=f"{plan['tax_saved']:.1f}"
        )
    
    def generate_proposal(self) -> str:
        """제안서 생성"""
        plan = self.report["optimized_plan"]
        jongho = self.report["jongho"]
        
        royalty = sum(tx["amount"] for tx in plan["transactions"] if tx["type"] == "ROYALTY")
        rnd = sum(tx["amount"] for tx in plan["transactions"] if tx["type"] == "RND_SHARE")
        service = sum(tx["amount"] for tx in plan["transactions"] if tx["type"] == "SERVICE_FEE")
        
        return PROPOSAL_TEMPLATE.format(
            proposal_id=datetime.now().strftime("%Y%m%d%H%M"),
            date=self.date,
            total_transfer=f"{plan['total']:.1f}",
            tax_saved=f"{plan['tax_saved']:.1f}",
            monthly_tax_saved=f"{plan['tax_saved']/12:.2f}",
            compliance=f"{plan['compliance']*100:.0f}",
            jongho_revenue=jongho["total_revenue"],
            jongho_profit=jongho["total_profit"],
            royalty_amount=f"{royalty:.1f}",
            royalty_rate="2",
            rnd_amount=f"{rnd:.1f}",
            service_amount=f"{service:.1f}",
            tax_saved_2y=f"{plan['tax_saved']*2:.1f}",
            tax_saved_3y=f"{plan['tax_saved']*3:.1f}",
            tax_saved_4y=f"{plan['tax_saved']*4:.1f}",
            tax_saved_5y=f"{plan['tax_saved']*5:.1f}"
        )


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="AUTUS Document Drafter")
    parser.add_argument("--type", "-t", choices=["contract", "proposal"], default="contract")
    parser.add_argument("--output", "-o", help="Output file path")
    parser.add_argument("--ratio", "-r", type=float, default=0.30, help="Transfer ratio")
    
    args = parser.parse_args()
    
    drafter = DocumentDrafter(transfer_ratio=args.ratio)
    
    if args.type == "contract":
        doc = drafter.generate_contract()
        print("📝 계약서 생성 완료!")
    else:
        doc = drafter.generate_proposal()
        print("📋 제안서 생성 완료!")
    
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(doc)
        print(f"💾 저장됨: {args.output}")
    else:
        print("\n" + "=" * 60)
        print(doc)


if __name__ == "__main__":
    main()
