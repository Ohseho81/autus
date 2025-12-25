#!/usr/bin/env python3
"""
AUTUS 2.0 Data Pipeline Runner
==============================
의사결정 OS - Raw Data에서 7대 노이즈 지표 추출 및 HUD 출력

Usage:
    # 통합 분석 (7대 노이즈)
    python3 autos_run.py --task integrated_analysis --input "법인 부채 5억 상환 vs 신규 사업 3억 투입"
    
    # 기존 파이프라인
    python3 autos_run.py --flow email_to_sheets --mock_data "2025-12-22, 신한은행, 5,500,000원 입금"
"""

import os
import sys
import json
import argparse
import re
from datetime import datetime
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional
from enum import Enum

# ═══════════════════════════════════════════════════════════════════════════════
# 7-LAYER ARCHITECTURE INTEGRATION
# ═══════════════════════════════════════════════════════════════════════════════

class Layer(Enum):
    L0_EXTERNAL = 0      # 외부 데이터 수신
    L1_SYSTEM = 1        # 시스템 상태
    L2_ENTITY = 2        # 데이터 엔티티
    L3_CANVAS = 3        # 처리 로직
    L4_DOCK = 4          # 액션 디스패치
    L5_OVERLAY = 5       # 알림/로그
    L6_OVERRIDE = 6      # 긴급 처리

class EdgePolicy(Enum):
    NORMAL = "NORMAL"           # 일반 처리
    ALTERNATE = "ALTERNATE"     # 대체 경로
    LOOP = "LOOP"               # 반복 처리

# ═══════════════════════════════════════════════════════════════════════════════
# DATA MODELS
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class FinanceRecord:
    """재무 데이터 레코드"""
    id: str
    date: str
    bank: str
    amount: float
    type: str  # 입금/출금
    description: str
    category: Optional[str] = None
    tax_code: Optional[str] = None
    processed: bool = False
    layer: int = 0
    policy: str = "NORMAL"

@dataclass
class PipelineResult:
    """파이프라인 실행 결과"""
    success: bool
    flow: str
    records_processed: int
    records_failed: int
    duration_ms: float
    output_path: Optional[str] = None
    errors: List[str] = None
    ledger: List[Dict] = None

# ═══════════════════════════════════════════════════════════════════════════════
# LEDGER (Decision Memory)
# ═══════════════════════════════════════════════════════════════════════════════

class DecisionLedger:
    """결정 기록 원장"""
    
    def __init__(self):
        self.entries = []
    
    def record(self, layer: Layer, action: str, data: Dict, policy: EdgePolicy = EdgePolicy.NORMAL):
        entry = {
            "timestamp": datetime.now().isoformat(),
            "layer": layer.name,
            "action": action,
            "policy": policy.value,
            "data": data
        }
        self.entries.append(entry)
        self._print_entry(entry)
    
    def _print_entry(self, entry):
        icons = {
            "L0_EXTERNAL": "🌐",
            "L1_SYSTEM": "⚙️",
            "L2_ENTITY": "📊",
            "L3_CANVAS": "🎯",
            "L4_DOCK": "🚀",
            "L5_OVERLAY": "🔔",
            "L6_OVERRIDE": "⚠️"
        }
        icon = icons.get(entry["layer"], "•")
        time = entry["timestamp"].split("T")[1][:8]
        print(f"  {icon} [{time}] {entry['layer']}: {entry['action']} ({entry['policy']})")
    
    def get_entries(self) -> List[Dict]:
        return self.entries

# ═══════════════════════════════════════════════════════════════════════════════
# PARSER (L0 → L2)
# ═══════════════════════════════════════════════════════════════════════════════

class FinanceParser:
    """재무 데이터 파서"""
    
    def __init__(self, ledger: DecisionLedger):
        self.ledger = ledger
    
    def parse_email_data(self, raw_data: str) -> FinanceRecord:
        """이메일/텍스트 데이터 파싱"""
        self.ledger.record(Layer.L0_EXTERNAL, "receive_data", {"raw": raw_data[:50]})
        
        # 패턴 매칭
        patterns = {
            "date": r"(\d{4}-\d{2}-\d{2})",
            "amount": r"([\d,]+)원",
            "type": r"(입금|출금|이체)",
            "bank": r"(신한|국민|우리|하나|기업|농협|SC|씨티)은행?"
        }
        
        result = {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "amount": 0,
            "type": "입금",
            "bank": "Unknown",
            "description": raw_data
        }
        
        for key, pattern in patterns.items():
            match = re.search(pattern, raw_data)
            if match:
                value = match.group(1)
                if key == "amount":
                    value = float(value.replace(",", ""))
                result[key] = value
        
        self.ledger.record(Layer.L2_ENTITY, "parse_complete", result)
        
        record = FinanceRecord(
            id=f"FIN-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            date=result["date"],
            bank=result["bank"],
            amount=result["amount"],
            type=result["type"],
            description=result["description"],
            layer=2,
            policy="NORMAL"
        )
        
        return record

# ═══════════════════════════════════════════════════════════════════════════════
# CLASSIFIER (L3)
# ═══════════════════════════════════════════════════════════════════════════════

class FinanceClassifier:
    """재무 데이터 분류기"""
    
    CATEGORIES = {
        "급여": ["급여", "월급", "상여", "보너스"],
        "매출": ["결제", "판매", "수익", "매출"],
        "비용": ["지출", "구매", "결제", "비용"],
        "세금": ["세금", "부가세", "원천세", "법인세"],
        "대출": ["대출", "이자", "상환"],
        "투자": ["투자", "배당", "주식"],
    }
    
    TAX_CODES = {
        "급여": "T-SAL",
        "매출": "T-REV",
        "비용": "T-EXP",
        "세금": "T-TAX",
        "대출": "T-LOA",
        "투자": "T-INV",
    }
    
    def __init__(self, ledger: DecisionLedger):
        self.ledger = ledger
    
    def classify(self, record: FinanceRecord) -> FinanceRecord:
        """레코드 분류 및 세금 코드 할당"""
        self.ledger.record(Layer.L3_CANVAS, "classify_start", {"id": record.id})
        
        description = record.description.lower()
        
        for category, keywords in self.CATEGORIES.items():
            if any(kw in description for kw in keywords):
                record.category = category
                record.tax_code = self.TAX_CODES.get(category, "T-UNK")
                break
        
        if not record.category:
            record.category = "기타"
            record.tax_code = "T-ETC"
        
        # 금액에 따른 정책 결정
        if record.amount >= 10_000_000:  # 1천만원 이상
            record.policy = "ALTERNATE"
            self.ledger.record(Layer.L6_OVERRIDE, "high_value_alert", 
                             {"amount": record.amount}, EdgePolicy.ALTERNATE)
        elif record.category == "세금":
            record.policy = "LOOP"
            self.ledger.record(Layer.L3_CANVAS, "tax_item_loop", 
                             {"category": record.category}, EdgePolicy.LOOP)
        
        record.layer = 3
        self.ledger.record(Layer.L3_CANVAS, "classify_complete", 
                          {"category": record.category, "tax_code": record.tax_code})
        
        return record

# ═══════════════════════════════════════════════════════════════════════════════
# SHEET WRITER (L4)
# ═══════════════════════════════════════════════════════════════════════════════

class SheetWriter:
    """Google Sheets 기록기 (Mock)"""
    
    def __init__(self, ledger: DecisionLedger):
        self.ledger = ledger
        self.mock_data = []
    
    def write(self, record: FinanceRecord) -> bool:
        """시트에 기록 (Mock)"""
        self.ledger.record(Layer.L4_DOCK, "write_start", {"id": record.id})
        
        try:
            row = {
                "ID": record.id,
                "날짜": record.date,
                "은행": record.bank,
                "금액": record.amount,
                "유형": record.type,
                "카테고리": record.category,
                "세금코드": record.tax_code,
                "설명": record.description[:50],
                "정책": record.policy
            }
            
            self.mock_data.append(row)
            record.processed = True
            record.layer = 4
            
            self.ledger.record(Layer.L4_DOCK, "write_complete", {"row": len(self.mock_data)})
            self.ledger.record(Layer.L5_OVERLAY, "notification", 
                             {"message": f"Record {record.id} saved"})
            
            return True
            
        except Exception as e:
            self.ledger.record(Layer.L6_OVERRIDE, "write_error", 
                             {"error": str(e)}, EdgePolicy.ALTERNATE)
            return False
    
    def get_mock_data(self) -> List[Dict]:
        return self.mock_data

# ═══════════════════════════════════════════════════════════════════════════════
# PIPELINE RUNNER
# ═══════════════════════════════════════════════════════════════════════════════

class PipelineRunner:
    """파이프라인 실행기"""
    
    def __init__(self):
        self.ledger = DecisionLedger()
        self.parser = FinanceParser(self.ledger)
        self.classifier = FinanceClassifier(self.ledger)
        self.writer = SheetWriter(self.ledger)
    
    def run_email_to_sheets(self, mock_data: str) -> PipelineResult:
        """이메일 → 시트 파이프라인"""
        start_time = datetime.now()
        
        print("\n" + "═" * 60)
        print("🚀 AUTUS Pipeline: email_to_sheets")
        print("═" * 60)
        print(f"📧 Input: {mock_data[:60]}...")
        print("─" * 60)
        print("\n📋 Processing Ledger:")
        
        self.ledger.record(Layer.L1_SYSTEM, "pipeline_start", {"flow": "email_to_sheets"})
        
        records_processed = 0
        records_failed = 0
        errors = []
        
        try:
            # L0 → L2: Parse
            record = self.parser.parse_email_data(mock_data)
            
            # L3: Classify
            record = self.classifier.classify(record)
            
            # L4: Write
            success = self.writer.write(record)
            
            if success:
                records_processed += 1
            else:
                records_failed += 1
                errors.append(f"Failed to write record {record.id}")
            
            self.ledger.record(Layer.L1_SYSTEM, "pipeline_complete", 
                             {"processed": records_processed, "failed": records_failed})
            
        except Exception as e:
            records_failed += 1
            errors.append(str(e))
            self.ledger.record(Layer.L6_OVERRIDE, "pipeline_error", 
                             {"error": str(e)}, EdgePolicy.ALTERNATE)
        
        duration = (datetime.now() - start_time).total_seconds() * 1000
        
        result = PipelineResult(
            success=records_failed == 0,
            flow="email_to_sheets",
            records_processed=records_processed,
            records_failed=records_failed,
            duration_ms=duration,
            errors=errors if errors else None,
            ledger=self.ledger.get_entries()
        )
        
        self._print_result(result)
        self._print_mock_sheet()
        
        return result
    
    def _print_result(self, result: PipelineResult):
        print("\n" + "─" * 60)
        print("📊 Result Summary:")
        print(f"  • Status: {'✅ Success' if result.success else '❌ Failed'}")
        print(f"  • Processed: {result.records_processed}")
        print(f"  • Failed: {result.records_failed}")
        print(f"  • Duration: {result.duration_ms:.2f}ms")
        print(f"  • Ledger entries: {len(result.ledger)}")
        
        if result.errors:
            print("\n  ❌ Errors:")
            for error in result.errors:
                print(f"     • {error}")
    
    def _print_mock_sheet(self):
        data = self.writer.get_mock_data()
        if data:
            print("\n" + "─" * 60)
            print("📝 Mock Sheet Output:")
            print("─" * 60)
            for row in data:
                print(f"  ID: {row['ID']}")
                print(f"  날짜: {row['날짜']} | 은행: {row['은행']}")
                print(f"  금액: {row['금액']:,.0f}원 ({row['유형']})")
                print(f"  카테고리: {row['카테고리']} | 세금코드: {row['세금코드']}")
                print(f"  정책: {row['정책']}")
                print()

# ═══════════════════════════════════════════════════════════════════════════════
# INTEGRATED ANALYSIS (7대 노이즈)
# ═══════════════════════════════════════════════════════════════════════════════

def run_integrated_analysis(input_text: str, output_path: str = None):
    """
    통합 분석: 7대 노이즈 지표 추출 및 HUD 출력
    """
    from autus_distiller import Distiller
    from autus_hud import HUDRenderer
    
    print("\n" + "═" * 70)
    print("🧠 AUTUS 2.0 INTEGRATED ANALYSIS")
    print("═" * 70)
    print(f"📥 Input: {input_text[:60]}...")
    print("─" * 70)
    
    # Distiller로 7대 노이즈 추출
    distiller = Distiller()
    hud_result = distiller.distill(input_text)
    
    # HUD 스타일 출력
    renderer = HUDRenderer()
    renderer.render(hud_result)
    
    # JSON 저장
    if output_path:
        json_output = distiller.to_hud_json(hud_result)
        os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else ".", exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(json_output)
        print(f"💾 JSON saved to: {output_path}")
    else:
        # 기본 저장 경로
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        default_path = f"./output/hud_{timestamp}.json"
        os.makedirs("./output", exist_ok=True)
        json_output = distiller.to_hud_json(hud_result)
        with open(default_path, 'w', encoding='utf-8') as f:
            f.write(json_output)
        print(f"💾 JSON saved to: {default_path}")
    
    return hud_result


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="AUTUS 2.0 Pipeline Runner",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # 통합 분석 (7대 노이즈)
  python3 autos_run.py --task integrated_analysis --input "법인 부채 5억 상환 vs 신규 사업 3억 투입"
  
  # 재무 파이프라인
  python3 autos_run.py --flow email_to_sheets --mock_data "2025-12-22, 신한은행, 5,500,000원 입금"
        """
    )
    
    # 새로운 통합 분석 옵션
    parser.add_argument("--task", type=str,
                        choices=["integrated_analysis"],
                        help="Analysis task to run")
    parser.add_argument("--input", "-i", type=str,
                        help="Input text for analysis")
    
    # 기존 파이프라인 옵션
    parser.add_argument("--flow", type=str,
                        choices=["email_to_sheets", "parse_invoice", "monthly_report"],
                        help="Pipeline flow to execute")
    parser.add_argument("--mock_data", type=str,
                        help="Mock data string for testing")
    parser.add_argument("--file", type=str,
                        help="Input file path")
    parser.add_argument("--output", "-o", type=str,
                        help="Output file path")
    parser.add_argument("--verbose", "-v", action="store_true",
                        help="Verbose output")
    
    args = parser.parse_args()
    
    # ─────────────────────────────────────────────────────────────────────────
    # 통합 분석 모드
    # ─────────────────────────────────────────────────────────────────────────
    if args.task == "integrated_analysis":
        if not args.input:
            print("❌ Error: --input is required for integrated_analysis")
            print("   Example: --input \"법인 부채 5억 상환 vs 신규 사업 3억 투입\"")
            sys.exit(1)
        
        result = run_integrated_analysis(args.input, args.output)
        
        print("\n" + "═" * 70)
        print(f"🏁 Analysis completed | Dominant Noise: {result.dominant_noise}")
        print("═" * 70)
        sys.exit(0)
    
    # ─────────────────────────────────────────────────────────────────────────
    # 기존 파이프라인 모드
    # ─────────────────────────────────────────────────────────────────────────
    if not args.flow:
        parser.print_help()
        sys.exit(1)
    
    runner = PipelineRunner()
    
    if args.flow == "email_to_sheets":
        if not args.mock_data:
            args.mock_data = "2025-12-22, 신한은행, 5,500,000원 입금, 적요: 거래처 결제"
        
        result = runner.run_email_to_sheets(args.mock_data)
        
    elif args.flow == "parse_invoice":
        print("📄 Invoice parsing not yet implemented")
        sys.exit(1)
        
    elif args.flow == "monthly_report":
        print("📊 Monthly report not yet implemented")
        sys.exit(1)
    
    print("\n" + "═" * 60)
    print("🏁 Pipeline execution completed")
    print("═" * 60)
    
    sys.exit(0 if result.success else 1)


if __name__ == "__main__":
    main()
