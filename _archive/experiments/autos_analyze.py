#!/usr/bin/env python3
"""
AUTUS AI Analysis Engine
========================
Gemini Pro를 활용한 재무 데이터 분석 및 위험 진단

Usage:
    python autos_analyze.py --model gemini-pro --task risk_assessment --target_folder "./data/raw_finance"
    python autos_analyze.py --task cashflow_forecast --months 3
    python autos_analyze.py --task tax_optimization --year 2025
"""

import os
import sys
import json
import argparse
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional
from enum import Enum
import random

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

GEMINI_MODEL = "gemini-pro"

ANALYSIS_TASKS = {
    "risk_assessment": {
        "name": "위험 진단 리포트",
        "description": "재무 데이터 기반 리스크 분석",
        "prompt_template": """
다음 재무 데이터를 분석하여 위험 진단 리포트를 작성해주세요:

{data}

다음 항목을 포함해주세요:
1. 현금흐름 위험도 (High/Medium/Low)
2. 주요 위험 요인 3가지
3. 권장 조치사항
4. 30일 예측 시나리오
"""
    },
    "cashflow_forecast": {
        "name": "현금흐름 예측",
        "description": "향후 N개월 현금흐름 예측",
        "prompt_template": """
다음 재무 데이터를 기반으로 향후 {months}개월 현금흐름을 예측해주세요:

{data}

다음 형식으로 응답해주세요:
1. 월별 예상 수입
2. 월별 예상 지출
3. 순 현금흐름
4. 위험 구간 표시
"""
    },
    "tax_optimization": {
        "name": "세금 최적화",
        "description": "세금 절감 전략 분석",
        "prompt_template": """
다음 재무 데이터를 분석하여 세금 최적화 전략을 제안해주세요:

{data}

다음 항목을 포함해주세요:
1. 현재 예상 세금 부담
2. 절세 가능 항목
3. 추천 절세 전략
4. 예상 절감 금액
"""
    },
    "anomaly_detection": {
        "name": "이상 거래 탐지",
        "description": "비정상 패턴 감지",
        "prompt_template": """
다음 재무 데이터에서 이상 거래를 탐지해주세요:

{data}

다음 기준으로 분석해주세요:
1. 평균 대비 이상 금액
2. 비정상 거래 시간
3. 중복 거래 여부
4. 의심 거래 목록
"""
    }
}

# ═══════════════════════════════════════════════════════════════════════════════
# DATA MODELS
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class AnalysisResult:
    """분석 결과"""
    task: str
    model: str
    timestamp: str
    input_records: int
    risk_level: str  # HIGH, MEDIUM, LOW
    summary: str
    details: Dict
    recommendations: List[str]
    raw_response: Optional[str] = None

@dataclass
class RiskIndicator:
    """위험 지표"""
    name: str
    value: float
    threshold: float
    status: str  # SAFE, WARNING, DANGER
    description: str

# ═══════════════════════════════════════════════════════════════════════════════
# MOCK DATA GENERATOR
# ═══════════════════════════════════════════════════════════════════════════════

class MockDataGenerator:
    """테스트용 재무 데이터 생성기"""
    
    BANKS = ["신한은행", "국민은행", "우리은행", "하나은행"]
    CATEGORIES = ["매출", "급여", "비용", "세금", "대출"]
    
    def generate_monthly_data(self, months: int = 3) -> List[Dict]:
        """월별 재무 데이터 생성"""
        data = []
        base_date = datetime.now()
        
        for m in range(months):
            month_date = base_date - timedelta(days=30 * m)
            
            # 수입
            for _ in range(random.randint(5, 15)):
                data.append({
                    "date": (month_date - timedelta(days=random.randint(0, 29))).strftime("%Y-%m-%d"),
                    "type": "입금",
                    "amount": random.randint(100, 5000) * 10000,
                    "bank": random.choice(self.BANKS),
                    "category": random.choice(["매출", "투자"]),
                    "description": f"거래처 입금 #{random.randint(1000, 9999)}"
                })
            
            # 지출
            for _ in range(random.randint(10, 25)):
                data.append({
                    "date": (month_date - timedelta(days=random.randint(0, 29))).strftime("%Y-%m-%d"),
                    "type": "출금",
                    "amount": random.randint(10, 500) * 10000,
                    "bank": random.choice(self.BANKS),
                    "category": random.choice(["급여", "비용", "세금"]),
                    "description": f"지출 #{random.randint(1000, 9999)}"
                })
        
        return sorted(data, key=lambda x: x["date"], reverse=True)
    
    def load_from_folder(self, folder_path: str) -> List[Dict]:
        """폴더에서 데이터 로드 (또는 Mock 생성)"""
        if os.path.exists(folder_path):
            # 실제 파일이 있으면 로드 시도
            files = [f for f in os.listdir(folder_path) if f.endswith('.json')]
            if files:
                all_data = []
                for file in files:
                    with open(os.path.join(folder_path, file), 'r') as f:
                        all_data.extend(json.load(f))
                return all_data
        
        # Mock 데이터 생성
        print(f"  ⚠️  Folder not found or empty, generating mock data...")
        return self.generate_monthly_data(3)

# ═══════════════════════════════════════════════════════════════════════════════
# ANALYSIS ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

class AnalysisEngine:
    """AI 분석 엔진"""
    
    def __init__(self, model: str = GEMINI_MODEL, use_mock: bool = True):
        self.model = model
        self.use_mock = use_mock
        self.api_key = os.environ.get("GOOGLE_API_KEY")
        
        if not use_mock and self.api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.api_key)
                self.genai_model = genai.GenerativeModel(model)
                self.use_mock = False
            except ImportError:
                print("  ⚠️  google-generativeai not installed, using mock mode")
                self.use_mock = True
        else:
            self.use_mock = True
    
    def analyze(self, task: str, data: List[Dict], **kwargs) -> AnalysisResult:
        """데이터 분석 실행"""
        task_config = ANALYSIS_TASKS.get(task)
        if not task_config:
            raise ValueError(f"Unknown task: {task}")
        
        print(f"\n🔬 Running analysis: {task_config['name']}")
        print(f"   Model: {self.model} ({'Mock' if self.use_mock else 'Live'})")
        print(f"   Records: {len(data)}")
        
        # 데이터 요약
        summary_data = self._summarize_data(data)
        
        if self.use_mock:
            result = self._mock_analysis(task, summary_data, **kwargs)
        else:
            result = self._live_analysis(task, task_config, summary_data, **kwargs)
        
        return result
    
    def _summarize_data(self, data: List[Dict]) -> Dict:
        """데이터 요약 통계"""
        total_income = sum(d["amount"] for d in data if d["type"] == "입금")
        total_expense = sum(d["amount"] for d in data if d["type"] == "출금")
        
        by_category = {}
        for d in data:
            cat = d.get("category", "기타")
            if cat not in by_category:
                by_category[cat] = {"income": 0, "expense": 0, "count": 0}
            
            if d["type"] == "입금":
                by_category[cat]["income"] += d["amount"]
            else:
                by_category[cat]["expense"] += d["amount"]
            by_category[cat]["count"] += 1
        
        return {
            "total_records": len(data),
            "total_income": total_income,
            "total_expense": total_expense,
            "net_cashflow": total_income - total_expense,
            "by_category": by_category,
            "date_range": {
                "start": min(d["date"] for d in data) if data else None,
                "end": max(d["date"] for d in data) if data else None
            }
        }
    
    def _mock_analysis(self, task: str, summary: Dict, **kwargs) -> AnalysisResult:
        """Mock 분석 결과 생성"""
        net = summary["net_cashflow"]
        income = summary["total_income"]
        expense = summary["total_expense"]
        
        # 위험도 계산
        if net < 0:
            risk_level = "HIGH"
        elif expense / max(income, 1) > 0.8:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"
        
        risk_indicators = self._calculate_risk_indicators(summary)
        
        if task == "risk_assessment":
            details = {
                "cashflow_ratio": round(income / max(expense, 1), 2),
                "expense_ratio": round(expense / max(income, 1) * 100, 1),
                "risk_indicators": [asdict(r) for r in risk_indicators],
                "monthly_burn_rate": expense / 3,
                "runway_months": round(net / max(expense / 3, 1), 1) if net > 0 else 0
            }
            recommendations = [
                "현금 보유량 대비 지출 비율 모니터링 필요" if risk_level != "LOW" else "현재 재무 상태 양호",
                "고정비 절감 검토" if expense / max(income, 1) > 0.7 else "지출 관리 양호",
                "매출 다각화 검토" if len(summary["by_category"]) < 3 else "수입원 다양성 양호",
                "세금 신고 일정 확인" if "세금" in summary["by_category"] else "세금 관련 지출 없음"
            ]
        
        elif task == "cashflow_forecast":
            months = kwargs.get("months", 3)
            avg_income = income / 3
            avg_expense = expense / 3
            
            forecast = []
            for m in range(1, months + 1):
                forecast.append({
                    "month": m,
                    "projected_income": avg_income * (1 + random.uniform(-0.1, 0.15)),
                    "projected_expense": avg_expense * (1 + random.uniform(-0.05, 0.1)),
                })
            
            details = {
                "forecast": forecast,
                "trend": "STABLE" if abs(net) < income * 0.1 else ("GROWING" if net > 0 else "DECLINING")
            }
            recommendations = [
                f"향후 {months}개월 예상 순현금흐름: {sum(f['projected_income'] - f['projected_expense'] for f in forecast):,.0f}원",
                "성장세 유지" if details["trend"] == "GROWING" else "비용 관리 강화 필요"
            ]
        
        elif task == "tax_optimization":
            tax_expense = summary["by_category"].get("세금", {}).get("expense", 0)
            details = {
                "current_tax_burden": tax_expense,
                "deductible_items": ["업무용 차량", "통신비", "복리후생비"],
                "potential_savings": tax_expense * 0.15
            }
            recommendations = [
                f"예상 절세 가능 금액: {details['potential_savings']:,.0f}원",
                "비용 항목 재분류 검토",
                "세액공제 항목 확인"
            ]
        
        else:
            details = {}
            recommendations = ["분석 결과 없음"]
        
        return AnalysisResult(
            task=task,
            model=self.model + " (Mock)",
            timestamp=datetime.now().isoformat(),
            input_records=summary["total_records"],
            risk_level=risk_level,
            summary=f"총 {summary['total_records']}건 분석 완료. 순현금흐름: {net:,.0f}원",
            details=details,
            recommendations=recommendations
        )
    
    def _live_analysis(self, task: str, config: Dict, summary: Dict, **kwargs) -> AnalysisResult:
        """실제 Gemini API 호출"""
        prompt = config["prompt_template"].format(
            data=json.dumps(summary, ensure_ascii=False, indent=2),
            **kwargs
        )
        
        try:
            response = self.genai_model.generate_content(prompt)
            raw_response = response.text
            
            # 응답 파싱 (간단한 버전)
            return AnalysisResult(
                task=task,
                model=self.model,
                timestamp=datetime.now().isoformat(),
                input_records=summary["total_records"],
                risk_level="MEDIUM",  # API 응답에서 파싱 필요
                summary=raw_response[:200],
                details={"raw": raw_response},
                recommendations=[raw_response[:500]],
                raw_response=raw_response
            )
        except Exception as e:
            print(f"  ❌ API Error: {e}")
            return self._mock_analysis(task, summary, **kwargs)
    
    def _calculate_risk_indicators(self, summary: Dict) -> List[RiskIndicator]:
        """위험 지표 계산"""
        indicators = []
        
        income = summary["total_income"]
        expense = summary["total_expense"]
        net = summary["net_cashflow"]
        
        # 현금흐름 비율
        cf_ratio = income / max(expense, 1)
        indicators.append(RiskIndicator(
            name="현금흐름 비율",
            value=round(cf_ratio, 2),
            threshold=1.2,
            status="SAFE" if cf_ratio >= 1.2 else ("WARNING" if cf_ratio >= 1.0 else "DANGER"),
            description="수입/지출 비율 (1.2 이상 권장)"
        ))
        
        # 지출 비율
        expense_ratio = expense / max(income, 1) * 100
        indicators.append(RiskIndicator(
            name="지출 비율",
            value=round(expense_ratio, 1),
            threshold=80,
            status="SAFE" if expense_ratio <= 70 else ("WARNING" if expense_ratio <= 90 else "DANGER"),
            description="지출/수입 비율 (80% 이하 권장)"
        ))
        
        # 순현금흐름
        indicators.append(RiskIndicator(
            name="순현금흐름",
            value=net,
            threshold=0,
            status="SAFE" if net > 0 else "DANGER",
            description="수입 - 지출 (양수 필요)"
        ))
        
        return indicators

# ═══════════════════════════════════════════════════════════════════════════════
# REPORT GENERATOR
# ═══════════════════════════════════════════════════════════════════════════════

class ReportGenerator:
    """분석 리포트 생성기"""
    
    @staticmethod
    def print_report(result: AnalysisResult):
        """콘솔 리포트 출력"""
        print("\n" + "═" * 70)
        print(f"📊 AUTUS ANALYSIS REPORT: {result.task.upper()}")
        print("═" * 70)
        
        # 기본 정보
        print(f"\n📅 Generated: {result.timestamp}")
        print(f"🤖 Model: {result.model}")
        print(f"📁 Records Analyzed: {result.input_records}")
        
        # 위험도
        risk_icons = {"HIGH": "🔴", "MEDIUM": "🟡", "LOW": "🟢"}
        print(f"\n⚠️  Risk Level: {risk_icons.get(result.risk_level, '⚪')} {result.risk_level}")
        
        # 요약
        print(f"\n📝 Summary:")
        print(f"   {result.summary}")
        
        # 상세
        if result.details:
            print(f"\n📈 Details:")
            for key, value in result.details.items():
                if key == "risk_indicators":
                    print(f"   Risk Indicators:")
                    for ind in value:
                        status_icon = {"SAFE": "🟢", "WARNING": "🟡", "DANGER": "🔴"}.get(ind["status"], "⚪")
                        print(f"     {status_icon} {ind['name']}: {ind['value']} (threshold: {ind['threshold']})")
                elif key == "forecast":
                    print(f"   Forecast:")
                    for f in value:
                        print(f"     Month {f['month']}: +{f['projected_income']:,.0f} / -{f['projected_expense']:,.0f}")
                else:
                    if isinstance(value, (int, float)):
                        print(f"   {key}: {value:,.2f}" if isinstance(value, float) else f"   {key}: {value:,}")
                    else:
                        print(f"   {key}: {value}")
        
        # 권장사항
        print(f"\n💡 Recommendations:")
        for i, rec in enumerate(result.recommendations, 1):
            print(f"   {i}. {rec}")
        
        print("\n" + "─" * 70)
    
    @staticmethod
    def save_report(result: AnalysisResult, output_path: str):
        """JSON 리포트 저장"""
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(asdict(result), f, ensure_ascii=False, indent=2)
        print(f"\n💾 Report saved to: {output_path}")

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="AUTUS AI Analysis Engine",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python autos_analyze.py --model gemini-pro --task risk_assessment --target_folder "./data/raw_finance"
  python autos_analyze.py --task cashflow_forecast --months 6
  python autos_analyze.py --task tax_optimization --year 2025
        """
    )
    parser.add_argument("--model", default="gemini-pro",
                        help="AI model to use")
    parser.add_argument("--task", required=True,
                        choices=list(ANALYSIS_TASKS.keys()),
                        help="Analysis task to run")
    parser.add_argument("--target_folder", default="./data/raw_finance",
                        help="Folder containing finance data")
    parser.add_argument("--months", type=int, default=3,
                        help="Number of months for forecast")
    parser.add_argument("--year", type=int, default=2025,
                        help="Year for tax analysis")
    parser.add_argument("--output", type=str,
                        help="Output file path for report")
    parser.add_argument("--mock", action="store_true",
                        help="Force mock mode (no API calls)")
    
    args = parser.parse_args()
    
    print("═" * 70)
    print("🔬 AUTUS AI ANALYSIS ENGINE")
    print(f"   Task: {args.task}")
    print(f"   Model: {args.model}")
    print(f"   Target: {args.target_folder}")
    print("═" * 70)
    
    # 데이터 로드
    generator = MockDataGenerator()
    data = generator.load_from_folder(args.target_folder)
    print(f"\n📂 Loaded {len(data)} records")
    
    # 분석 실행
    engine = AnalysisEngine(model=args.model, use_mock=args.mock)
    result = engine.analyze(
        task=args.task,
        data=data,
        months=args.months,
        year=args.year
    )
    
    # 리포트 출력
    ReportGenerator.print_report(result)
    
    # 파일 저장
    if args.output:
        ReportGenerator.save_report(result, args.output)
    else:
        default_output = f"./output/report_{args.task}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        ReportGenerator.save_report(result, default_output)
    
    print("\n" + "═" * 70)
    print("🏁 Analysis completed")
    print("═" * 70)


if __name__ == "__main__":
    main()
