#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════════════════════
📊 AUTUS Trinity - 주간 리포트 자동 생성기
═══════════════════════════════════════════════════════════════════════════════

사용법:
    python scripts/trinity_report.py [--output report.md] [--format md|html|json]

환경변수:
    SUPABASE_URL - Supabase URL
    SUPABASE_KEY - Supabase Service Key
    SLACK_WEBHOOK_URL - Slack 웹훅 (선택)

═══════════════════════════════════════════════════════════════════════════════
"""

import os
import json
import argparse
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
import urllib.request
import urllib.error


# ═══════════════════════════════════════════════════════════════════════════════
# 데이터 모델
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class WeeklyProgress:
    """주간 진행률 데이터"""
    week_start: str
    week_end: str
    progress_delta: float  # 진행률 변화
    current_progress: float
    target_progress: float
    on_track: bool
    
@dataclass
class ERTSummary:
    """ERT 분류 요약"""
    eliminated: int
    replaced: int  # automated
    transformed: int  # parallelized
    preserved: int
    optimization_rate: float
    
@dataclass
class GoalStatus:
    """목표 상태"""
    raw_desire: str
    feasibility: float
    remaining_days: int
    pain_index: float
    checkpoint: int
    total_checkpoints: int

@dataclass
class WeeklyReport:
    """주간 리포트 전체"""
    generated_at: str
    week_number: int
    progress: WeeklyProgress
    ert: ERTSummary
    goal: GoalStatus
    actions: List[str]
    highlights: List[str]
    warnings: List[str]


# ═══════════════════════════════════════════════════════════════════════════════
# 데이터 수집
# ═══════════════════════════════════════════════════════════════════════════════

def fetch_supabase_data(table: str, params: Dict = None) -> Optional[List[Dict]]:
    """Supabase에서 데이터 조회"""
    url = os.environ.get('SUPABASE_URL')
    key = os.environ.get('SUPABASE_KEY')
    
    if not url or not key:
        return None
    
    query = f"{url}/rest/v1/{table}?select=*"
    if params:
        query += "&" + "&".join(f"{k}={v}" for k, v in params.items())
    
    req = urllib.request.Request(query)
    req.add_header('apikey', key)
    req.add_header('Authorization', f'Bearer {key}')
    
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except urllib.error.URLError:
        return None


def get_mock_data() -> Dict[str, Any]:
    """Mock 데이터 (Supabase 없을 때)"""
    return {
        'progress': {
            'current': 10.4,
            'target': 20.0,
            'delta': 2.3,
        },
        'ert': {
            'eliminated': 30,
            'replaced': 40,
            'transformed': 20,
            'preserved': 10,
        },
        'goal': {
            'raw_desire': '부자가 되고 싶다',
            'feasibility': 68,
            'remaining_days': 1279,
            'pain_index': 35,
            'checkpoint': 1,
            'total_checkpoints': 5,
        },
        'actions': [
            '63개월간 인내할 결심',
            '10건의 핵심 업무에만 집중',
            '다음 체크포인트까지 255일 견디기',
        ],
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 리포트 생성
# ═══════════════════════════════════════════════════════════════════════════════

def generate_report() -> WeeklyReport:
    """주간 리포트 생성"""
    # 날짜 계산
    today = datetime.now()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)
    week_number = today.isocalendar()[1]
    
    # 데이터 수집
    data = get_mock_data()  # TODO: Supabase 연동 시 대체
    
    # 진행률 계산
    progress = WeeklyProgress(
        week_start=week_start.strftime('%Y-%m-%d'),
        week_end=week_end.strftime('%Y-%m-%d'),
        progress_delta=data['progress']['delta'],
        current_progress=data['progress']['current'],
        target_progress=data['progress']['target'],
        on_track=data['progress']['current'] >= data['progress']['target'] * 0.9,
    )
    
    # ERT 요약
    ert_total = sum(data['ert'].values())
    ert_optimized = data['ert']['eliminated'] + data['ert']['replaced'] + data['ert']['transformed']
    ert = ERTSummary(
        eliminated=data['ert']['eliminated'],
        replaced=data['ert']['replaced'],
        transformed=data['ert']['transformed'],
        preserved=data['ert']['preserved'],
        optimization_rate=round(ert_optimized / ert_total * 100, 1) if ert_total > 0 else 0,
    )
    
    # 목표 상태
    goal = GoalStatus(
        raw_desire=data['goal']['raw_desire'],
        feasibility=data['goal']['feasibility'],
        remaining_days=data['goal']['remaining_days'],
        pain_index=data['goal']['pain_index'],
        checkpoint=data['goal']['checkpoint'],
        total_checkpoints=data['goal']['total_checkpoints'],
    )
    
    # 하이라이트 & 경고
    highlights = []
    warnings = []
    
    if progress.progress_delta > 0:
        highlights.append(f"📈 이번 주 진행률 +{progress.progress_delta}% 증가")
    
    if ert.optimization_rate >= 80:
        highlights.append(f"🎯 업무 최적화율 {ert.optimization_rate}% 달성")
    
    if not progress.on_track:
        warnings.append("⚠️ 목표 진행률에 미달")
    
    if goal.remaining_days < 100:
        warnings.append(f"⏰ 목표까지 {goal.remaining_days}일 남음")
    
    return WeeklyReport(
        generated_at=today.isoformat(),
        week_number=week_number,
        progress=progress,
        ert=ert,
        goal=goal,
        actions=data['actions'],
        highlights=highlights,
        warnings=warnings,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# 출력 포맷터
# ═══════════════════════════════════════════════════════════════════════════════

def format_markdown(report: WeeklyReport) -> str:
    """Markdown 형식 출력"""
    md = f"""# 📊 AUTUS Trinity 주간 리포트

> 생성: {report.generated_at}  
> Week {report.week_number} ({report.progress.week_start} ~ {report.progress.week_end})

---

## 🎯 목표

**"{report.goal.raw_desire}"**

| 지표 | 값 |
|------|-----|
| 실현 가능성 | {report.goal.feasibility}% |
| 남은 기간 | {report.goal.remaining_days}일 |
| 고통 지수 | {report.goal.pain_index}% |
| 체크포인트 | {report.goal.checkpoint}/{report.goal.total_checkpoints} |

---

## 📈 주간 진행률

| 지표 | 값 |
|------|-----|
| 현재 진행률 | {report.progress.current_progress}% |
| 목표 진행률 | {report.progress.target_progress}% |
| 이번 주 변화 | +{report.progress.progress_delta}% |
| 상태 | {'✅ 정상' if report.progress.on_track else '⚠️ 미달'} |

---

## 🔄 ERT 최적화

| 분류 | 건수 |
|------|------|
| 🗑️ 삭제 (E) | {report.ert.eliminated} |
| 🤖 자동화 (R) | {report.ert.replaced} |
| 🔀 병렬화 (T) | {report.ert.transformed} |
| 👤 보존 | {report.ert.preserved} |
| **최적화율** | **{report.ert.optimization_rate}%** |

---

## 💡 이번 주 할 일

"""
    for i, action in enumerate(report.actions, 1):
        md += f"{i}. {action}\n"
    
    if report.highlights:
        md += "\n---\n\n## ✨ 하이라이트\n\n"
        for h in report.highlights:
            md += f"- {h}\n"
    
    if report.warnings:
        md += "\n---\n\n## ⚠️ 주의사항\n\n"
        for w in report.warnings:
            md += f"- {w}\n"
    
    md += f"""
---

*"무슨 존재가 될지는 당신이 정한다. 그 존재를 유지하는 일은 우리가 한다."*

**AUTUS Trinity Engine** • {datetime.now().year}
"""
    
    return md


def format_json(report: WeeklyReport) -> str:
    """JSON 형식 출력"""
    return json.dumps(asdict(report), indent=2, ensure_ascii=False)


def format_html(report: WeeklyReport) -> str:
    """HTML 형식 출력"""
    return f"""<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>AUTUS Trinity 주간 리포트 - Week {report.week_number}</title>
    <style>
        body {{ font-family: -apple-system, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; background: #0a0a0a; color: #fff; }}
        h1 {{ color: #22d3ee; }}
        table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
        th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #333; }}
        th {{ background: #1a1a2e; color: #8b5cf6; }}
        .highlight {{ background: #10b98120; padding: 10px; border-radius: 8px; margin: 10px 0; }}
        .warning {{ background: #f59e0b20; padding: 10px; border-radius: 8px; margin: 10px 0; }}
        .quote {{ font-style: italic; color: #888; margin-top: 40px; text-align: center; }}
    </style>
</head>
<body>
    <h1>📊 AUTUS Trinity 주간 리포트</h1>
    <p>Week {report.week_number} • {report.progress.week_start} ~ {report.progress.week_end}</p>
    
    <h2>🎯 목표: "{report.goal.raw_desire}"</h2>
    <table>
        <tr><th>지표</th><th>값</th></tr>
        <tr><td>실현 가능성</td><td>{report.goal.feasibility}%</td></tr>
        <tr><td>남은 기간</td><td>{report.goal.remaining_days}일</td></tr>
        <tr><td>진행률</td><td>{report.progress.current_progress}%</td></tr>
        <tr><td>최적화율</td><td>{report.ert.optimization_rate}%</td></tr>
    </table>
    
    <h2>💡 이번 주 할 일</h2>
    <ol>
        {''.join(f'<li>{a}</li>' for a in report.actions)}
    </ol>
    
    {''.join(f'<div class="highlight">{h}</div>' for h in report.highlights)}
    {''.join(f'<div class="warning">{w}</div>' for w in report.warnings)}
    
    <p class="quote">"무슨 존재가 될지는 당신이 정한다. 그 존재를 유지하는 일은 우리가 한다."</p>
</body>
</html>"""


# ═══════════════════════════════════════════════════════════════════════════════
# Slack 전송
# ═══════════════════════════════════════════════════════════════════════════════

def send_to_slack(report: WeeklyReport) -> bool:
    """Slack으로 리포트 전송"""
    webhook_url = os.environ.get('SLACK_WEBHOOK_URL')
    if not webhook_url:
        return False
    
    payload = {
        "blocks": [
            {
                "type": "header",
                "text": {"type": "plain_text", "text": f"📊 Trinity 주간 리포트 (Week {report.week_number})"}
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*목표*\n{report.goal.raw_desire}"},
                    {"type": "mrkdwn", "text": f"*진행률*\n{report.progress.current_progress}%"},
                    {"type": "mrkdwn", "text": f"*최적화율*\n{report.ert.optimization_rate}%"},
                    {"type": "mrkdwn", "text": f"*남은 기간*\n{report.goal.remaining_days}일"},
                ]
            },
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": "*💡 이번 주 할 일*\n" + "\n".join(f"• {a}" for a in report.actions)}
            },
        ]
    }
    
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(webhook_url, data=data)
    req.add_header('Content-Type', 'application/json')
    
    try:
        with urllib.request.urlopen(req) as response:
            return response.status == 200
    except urllib.error.URLError:
        return False


# ═══════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description='AUTUS Trinity 주간 리포트 생성')
    parser.add_argument('--output', '-o', help='출력 파일 경로')
    parser.add_argument('--format', '-f', choices=['md', 'html', 'json'], default='md', help='출력 형식')
    parser.add_argument('--slack', action='store_true', help='Slack으로 전송')
    
    args = parser.parse_args()
    
    # 리포트 생성
    report = generate_report()
    
    # 포맷팅
    formatters = {
        'md': format_markdown,
        'html': format_html,
        'json': format_json,
    }
    output = formatters[args.format](report)
    
    # 출력
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(output)
        print(f"✅ 리포트 저장: {args.output}")
    else:
        print(output)
    
    # Slack 전송
    if args.slack:
        if send_to_slack(report):
            print("✅ Slack 전송 완료")
        else:
            print("⚠️ Slack 전송 실패 (SLACK_WEBHOOK_URL 확인)")


if __name__ == '__main__':
    main()
