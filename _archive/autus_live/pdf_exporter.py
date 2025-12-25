#!/usr/bin/env python3
"""
AUTUS v1.0 PDF Exporter
=======================
계약서/제안서 PDF 추출기

Usage:
    python3 pdf_exporter.py --type contract --output ./docs/contract.pdf
    python3 pdf_exporter.py --type proposal --corp "교육법인_1"
"""

import os
import argparse
from datetime import datetime
from pathlib import Path
from typing import Optional

# PDF 생성 (HTML → PDF)
try:
    from weasyprint import HTML, CSS
    PDF_ENGINE = "weasyprint"
except ImportError:
    PDF_ENGINE = "markdown"
    print("⚠️ weasyprint 미설치 - Markdown 출력만 지원")

from kernel import AutusKernel

# ═══════════════════════════════════════════════════════════════════════════════
# HTML TEMPLATES
# ═══════════════════════════════════════════════════════════════════════════════

CONTRACT_HTML = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @page {{ size: A4; margin: 2cm; }}
        body {{ 
            font-family: 'Noto Sans KR', sans-serif; 
            line-height: 1.8;
            color: #333;
        }}
        h1 {{ 
            color: #1a1a2e; 
            border-bottom: 3px solid #00d4ff;
            padding-bottom: 10px;
        }}
        h2 {{ color: #16213e; margin-top: 30px; }}
        table {{ 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0;
        }}
        th, td {{ 
            border: 1px solid #ddd; 
            padding: 12px; 
            text-align: left;
        }}
        th {{ background: #1a1a2e; color: white; }}
        .highlight {{ 
            background: #e8f4f8; 
            padding: 15px; 
            border-left: 4px solid #00d4ff;
            margin: 20px 0;
        }}
        .amount {{ 
            font-size: 1.5em; 
            font-weight: bold; 
            color: #00d4ff;
        }}
        .signature-box {{
            display: flex;
            justify-content: space-between;
            margin-top: 50px;
        }}
        .signature {{
            width: 45%;
            border-top: 2px solid #333;
            padding-top: 10px;
            text-align: center;
        }}
        .footer {{
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 0.9em;
            color: #666;
        }}
    </style>
</head>
<body>
    <h1>📋 교육서비스 고도화 및 IP 라이선스 계약서</h1>
    
    <p><strong>계약번호:</strong> AUTUS-{contract_id}</p>
    <p><strong>작성일:</strong> {date}</p>
    
    <h2>제1조 (목적)</h2>
    <p>본 계약은 <strong>갑</strong>(ATB)과 <strong>을</strong>(김종호 교육법인)이 
    교육서비스 고도화, 공동 R&D, 시스템 운영 및 IP 라이선스에 관한 
    상호 협력 사항을 정함을 목적으로 한다.</p>
    
    <h2>제2조 (계약 당사자)</h2>
    <table>
        <tr><th>구분</th><th>갑 (ATB)</th><th>을 (김종호 교육법인)</th></tr>
        <tr><td>대표</td><td>파운더</td><td>김종호</td></tr>
        <tr><td>매출</td><td>₩30억</td><td>₩{jongho_revenue}억</td></tr>
        <tr><td>수익</td><td>₩-10억 (적자)</td><td>₩{jongho_profit}억</td></tr>
    </table>
    
    <h2>제3조 (거래 내역)</h2>
    <div class="highlight">
        <p>총 연간 거래액: <span class="amount">₩{total_transfer}억</span></p>
    </div>
    
    <table>
        <tr><th>항목</th><th>금액 (억원)</th><th>설명</th></tr>
        {transaction_rows}
    </table>
    
    <h2>제4조 (로열티)</h2>
    <p>을은 갑이 제공하는 AUTUS 플랫폼 기술 사용에 대한 대가로 
    매출의 <strong>2% 이하</strong>에 해당하는 금액 <strong>₩{royalty}억/년</strong>을 지급한다.</p>
    
    <h2>제5조 (R&D 분담금)</h2>
    <p>갑과 을은 공동 R&D 프로젝트를 수행하며, 을은 연간 <strong>₩{rnd}억</strong>을 분담한다.</p>
    <ul>
        <li>AI 기반 학습 분석 시스템</li>
        <li>교육 콘텐츠 자동화 도구</li>
        <li>학습 관리 시스템(LMS) 고도화</li>
    </ul>
    
    <h2>제6조 (시스템 운영 용역)</h2>
    <p>갑은 을에게 통합 플랫폼 유지보수, 데이터 분석, 기술 지원 서비스를 제공하며, 
    용역비는 연간 <strong>₩{service}억</strong>으로 한다.</p>
    
    <h2>제7조 (세금 처리)</h2>
    <div class="highlight">
        <p>✅ 국세청 적합성: <strong>{compliance}%</strong></p>
        <p>💰 을(김종호) 예상 절세: <strong>₩{tax_saved}억/년</strong></p>
    </div>
    
    <h2>제8조 (계약 기간)</h2>
    <p>본 계약은 체결일로부터 <strong>1년</strong>간 유효하며, 
    만료 30일 전 서면 해지 통보가 없으면 자동 연장된다.</p>
    
    <h2>제9조 (비밀 유지)</h2>
    <p>양 당사자는 계약 내용 및 영업 비밀을 제3자에게 누설하지 아니한다.</p>
    
    <div class="signature-box">
        <div class="signature">
            <p><strong>갑 (ATB)</strong></p>
            <br><br>
            <p>대표: ________________</p>
            <p>서명: ________________</p>
        </div>
        <div class="signature">
            <p><strong>을 (김종호 교육법인)</strong></p>
            <br><br>
            <p>대표: ________________</p>
            <p>서명: ________________</p>
        </div>
    </div>
    
    <div class="footer">
        <p>본 계약서는 <strong>AUTUS v1.0 무결성 자산 요새</strong> 시스템에 의해 자동 생성되었습니다.</p>
        <p>물리 손실 함수: L = ∫(P + R×S)dt</p>
        <p>생성일시: {timestamp}</p>
    </div>
</body>
</html>
"""

PROPOSAL_HTML = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @page {{ size: A4; margin: 2cm; }}
        body {{ 
            font-family: 'Noto Sans KR', sans-serif; 
            line-height: 1.8;
            color: #333;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        }}
        .header {{
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: white;
            padding: 30px;
            margin: -2cm -2cm 30px -2cm;
        }}
        h1 {{ color: #00d4ff; margin: 0; }}
        h2 {{ color: #1a1a2e; border-left: 4px solid #00d4ff; padding-left: 15px; }}
        .benefit-box {{
            background: white;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }}
        .big-number {{
            font-size: 3em;
            font-weight: bold;
            color: #00d4ff;
        }}
        table {{ 
            width: 100%; 
            border-collapse: collapse; 
            background: white;
            border-radius: 10px;
            overflow: hidden;
        }}
        th {{ background: #1a1a2e; color: white; padding: 15px; }}
        td {{ padding: 15px; border-bottom: 1px solid #eee; }}
        .cta {{
            background: #00d4ff;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 10px;
            margin-top: 30px;
        }}
        .footer {{ 
            margin-top: 50px; 
            text-align: center; 
            color: #666;
            font-size: 0.9em;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 AUTUS 협력 제안서</h1>
        <p>{corp_name} 전용</p>
        <p>제안번호: PROP-{proposal_id} | {date}</p>
    </div>
    
    <h2>📋 Executive Summary</h2>
    <div class="benefit-box">
        <p>김종호 교육법인의 성장과 ATB의 기술 역량을 결합한<br>
        <strong>상호 Win-Win 협력 구조</strong>를 제안드립니다.</p>
        
        <table>
            <tr><th>항목</th><th>내용</th></tr>
            <tr><td>총 협력 규모</td><td><strong>₩{total_transfer}억/년</strong></td></tr>
            <tr><td>귀사 절세 효과</td><td><strong>₩{tax_saved}억/년</strong></td></tr>
            <tr><td>국세청 적합성</td><td><strong>{compliance}%</strong></td></tr>
        </table>
    </div>
    
    <h2>💰 귀사 혜택</h2>
    <div class="benefit-box" style="text-align: center;">
        <p>연간 절세 효과</p>
        <p class="big-number">₩{tax_saved}억</p>
        <p>월 <strong>₩{monthly_tax_saved}억</strong> 절감</p>
    </div>
    
    <h2>🎯 제안 구조</h2>
    <table>
        <tr><th>항목</th><th>금액</th><th>설명</th></tr>
        <tr><td>기술 로열티</td><td>₩{royalty}억/년</td><td>AUTUS 플랫폼 사용권</td></tr>
        <tr><td>공동 R&D</td><td>₩{rnd}억/년</td><td>AI 학습 분석 공동 개발</td></tr>
        <tr><td>시스템 용역</td><td>₩{service}억/년</td><td>유지보수 및 기술 지원</td></tr>
    </table>
    
    <h2>📈 5년 시뮬레이션</h2>
    <table>
        <tr><th>연차</th><th>협력금</th><th>절세액</th><th>누적</th></tr>
        <tr><td>1년</td><td>₩{total_transfer}억</td><td>₩{tax_saved}억</td><td>₩{tax_saved}억</td></tr>
        <tr><td>2년</td><td>₩{total_transfer}억</td><td>₩{tax_saved}억</td><td>₩{tax_2y}억</td></tr>
        <tr><td>3년</td><td>₩{total_transfer}억</td><td>₩{tax_saved}억</td><td>₩{tax_3y}억</td></tr>
        <tr><td>4년</td><td>₩{total_transfer}억</td><td>₩{tax_saved}억</td><td>₩{tax_4y}억</td></tr>
        <tr><td>5년</td><td>₩{total_transfer}억</td><td>₩{tax_saved}억</td><td>₩{tax_5y}억</td></tr>
    </table>
    
    <div class="cta">
        <h3>✅ 다음 단계</h3>
        <p>1주 내 세부 협의 → 2주 내 계약 검토 → 1개월 내 실행</p>
    </div>
    
    <div class="footer">
        <p>AUTUS v1.0 무결성 자산 요새</p>
        <p>문의: founder@autus.io</p>
        <p>생성: {timestamp}</p>
    </div>
</body>
</html>
"""


# ═══════════════════════════════════════════════════════════════════════════════
# PDF EXPORTER CLASS
# ═══════════════════════════════════════════════════════════════════════════════

class PDFExporter:
    """PDF 추출기"""
    
    def __init__(self, transfer_ratio: float = 0.30):
        self.kernel = AutusKernel()
        self.report = self.kernel.generate_full_report(transfer_ratio)
        self.date = datetime.now().strftime("%Y년 %m월 %d일")
        self.timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    def export_contract_pdf(self, output_path: str) -> bool:
        """계약서 PDF 생성"""
        plan = self.report["optimized_plan"]
        jongho = self.report["jongho"]
        
        # 거래 행 생성
        tx_rows = ""
        royalty = rnd = service = 0
        for tx in plan["transactions"]:
            tx_rows += f"<tr><td>{tx['type']}</td><td>₩{tx['amount']:.1f}억</td><td>{tx['desc']}</td></tr>"
            if tx['type'] == 'ROYALTY':
                royalty = tx['amount']
            elif tx['type'] == 'RND_SHARE':
                rnd = tx['amount']
            elif tx['type'] == 'SERVICE_FEE':
                service = tx['amount']
        
        html = CONTRACT_HTML.format(
            contract_id=datetime.now().strftime("%Y%m%d%H%M"),
            date=self.date,
            timestamp=self.timestamp,
            jongho_revenue=jongho["total_revenue"],
            jongho_profit=jongho["total_profit"],
            total_transfer=f"{plan['total']:.1f}",
            transaction_rows=tx_rows,
            royalty=f"{royalty:.1f}",
            rnd=f"{rnd:.1f}",
            service=f"{service:.1f}",
            compliance=f"{plan['compliance']*100:.0f}",
            tax_saved=f"{plan['tax_saved']:.1f}"
        )
        
        return self._save_pdf(html, output_path)
    
    def export_proposal_pdf(self, output_path: str, corp_name: str = "김종호 교육법인") -> bool:
        """제안서 PDF 생성"""
        plan = self.report["optimized_plan"]
        jongho = self.report["jongho"]
        
        royalty = rnd = service = 0
        for tx in plan["transactions"]:
            if tx['type'] == 'ROYALTY':
                royalty = tx['amount']
            elif tx['type'] == 'RND_SHARE':
                rnd = tx['amount']
            elif tx['type'] == 'SERVICE_FEE':
                service = tx['amount']
        
        tax = plan['tax_saved']
        
        html = PROPOSAL_HTML.format(
            proposal_id=datetime.now().strftime("%Y%m%d%H%M"),
            date=self.date,
            timestamp=self.timestamp,
            corp_name=corp_name,
            total_transfer=f"{plan['total']:.1f}",
            tax_saved=f"{tax:.1f}",
            monthly_tax_saved=f"{tax/12:.2f}",
            compliance=f"{plan['compliance']*100:.0f}",
            royalty=f"{royalty:.1f}",
            rnd=f"{rnd:.1f}",
            service=f"{service:.1f}",
            tax_2y=f"{tax*2:.1f}",
            tax_3y=f"{tax*3:.1f}",
            tax_4y=f"{tax*4:.1f}",
            tax_5y=f"{tax*5:.1f}"
        )
        
        return self._save_pdf(html, output_path)
    
    def _save_pdf(self, html: str, output_path: str) -> bool:
        """HTML → PDF 저장"""
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        
        if PDF_ENGINE == "weasyprint":
            try:
                HTML(string=html).write_pdf(output_path)
                print(f"✅ PDF 생성: {output_path}")
                return True
            except Exception as e:
                print(f"❌ PDF 생성 실패: {e}")
                # HTML로 폴백
                html_path = output_path.replace('.pdf', '.html')
                with open(html_path, 'w', encoding='utf-8') as f:
                    f.write(html)
                print(f"📄 HTML로 저장: {html_path}")
                return True
        else:
            # HTML로 저장
            html_path = output_path.replace('.pdf', '.html')
            with open(html_path, 'w', encoding='utf-8') as f:
                f.write(html)
            print(f"📄 HTML 생성: {html_path}")
            print("   브라우저에서 열고 '인쇄 > PDF로 저장'으로 변환하세요")
            return True
    
    def export_all_proposals(self, output_dir: str = "./docs") -> List[str]:
        """전체 법인 제안서 일괄 생성"""
        jongho = self.report["jongho"]
        output_files = []
        
        for corp in jongho["corporations"]:
            filename = f"proposal_{corp['name']}.pdf"
            filepath = os.path.join(output_dir, filename)
            self.export_proposal_pdf(filepath, corp['name'])
            output_files.append(filepath)
        
        return output_files


# ═══════════════════════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="AUTUS PDF Exporter")
    parser.add_argument("--type", "-t", choices=["contract", "proposal", "all"], default="contract")
    parser.add_argument("--output", "-o", default="./docs/output.pdf")
    parser.add_argument("--corp", "-c", default="김종호 교육법인", help="법인명 (제안서용)")
    parser.add_argument("--ratio", "-r", type=float, default=0.30)
    
    args = parser.parse_args()
    
    exporter = PDFExporter(transfer_ratio=args.ratio)
    
    if args.type == "contract":
        exporter.export_contract_pdf(args.output)
    elif args.type == "proposal":
        exporter.export_proposal_pdf(args.output, args.corp)
    elif args.type == "all":
        files = exporter.export_all_proposals()
        print(f"\n📚 {len(files)}개 제안서 생성 완료!")
        for f in files:
            print(f"   - {f}")


if __name__ == "__main__":
    main()
