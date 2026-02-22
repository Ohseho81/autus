#!/usr/bin/env python3
"""
AUTUS Audit v2.0 - Coach App Contract Validator
올댓바스켓 강사앱 스펙 검증

변경사항 v2.0:
- 금지: 학부모 연락처 (parentPhone, parentEmail, parentContact)
- 허용: skillLevel, remainingLessons, paymentStatus
"""

import argparse, json, os, re, sys
from dataclasses import dataclass
from typing import Dict, List, Tuple

# Coach App: 금지 패턴 v2.0
# 학부모 연락처만 금지 (개인정보 보호)
COACH_BANNED_PATTERNS = [
    r"\bparentPhone\b",       # 학부모 전화번호
    r"\bparentEmail\b",       # 학부모 이메일
    r"ParentContact",         # 학부모 연락처 컴포넌트
    r"DirectCallButton",      # 직접 통화 버튼
]

# 허용된 패턴 (검사에서 제외됨)
# - skillLevel: 스킬 레벨 표시 허용
# - remainingLessons: 잔여 회수 표시 허용
# - paymentStatus: 결제 상태 표시 허용

REQUIRED_SESSION_STATES = {"SCHEDULED", "IN_PROGRESS", "COMPLETED"}

TEXT_EXTS = {".ts", ".tsx", ".js", ".jsx"}

@dataclass
class Finding:
    severity: str
    area: str
    title: str
    detail: str
    file: str = ""
    line: int = 0

def iter_files(repo: str) -> List[str]:
    out = []
    for root, dirs, files in os.walk(repo):
        dirs[:] = [d for d in dirs if d not in {".git", "node_modules", "dist", "build"}]
        for f in files:
            path = os.path.join(root, f)
            ext = os.path.splitext(f)[1].lower()
            if ext in TEXT_EXTS:
                out.append(path)
    return out

def read_lines(path: str) -> List[str]:
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as fp:
            return fp.readlines()
    except:
        return []

def scan_patterns(files: List[str], patterns: List[str], area: str, severity: str) -> List[Finding]:
    findings = []
    compiled = [re.compile(p, re.IGNORECASE) for p in patterns]
    for path in files:
        lines = read_lines(path)
        for i, line in enumerate(lines, start=1):
            # 주석 라인 제외
            stripped = line.strip()
            if stripped.startswith('//') or stripped.startswith('*') or stripped.startswith('/*'):
                continue

            for rx in compiled:
                if rx.search(line):
                    findings.append(Finding(
                        severity=severity,
                        area=area,
                        title=f"금지 패턴: '{rx.pattern}'",
                        detail=line.strip()[:120],
                        file=os.path.basename(path),
                        line=i
                    ))
    return findings

def detect_session_states(files: List[str]) -> set:
    found = set()
    rx = re.compile(r"\b(SCHEDULED|IN_PROGRESS|COMPLETED)\b")
    for path in files:
        txt = "".join(read_lines(path))
        for m in rx.finditer(txt):
            found.add(m.group(1))
    return found

def check_required_features(files: List[str]) -> List[Finding]:
    findings = []
    all_content = ""
    for path in files:
        all_content += "".join(read_lines(path))

    # 수업 시작/종료 버튼 확인
    if "수업 시작" not in all_content and "handleStartSession" not in all_content:
        findings.append(Finding("FAIL", "COACH", "수업 시작 버튼 없음", "PrimaryButton(START) 필요"))

    # 사고 버튼 확인
    if "사고" not in all_content and "Incident" not in all_content:
        findings.append(Finding("FAIL", "COACH", "사고 버튼 없음", "IncidentButton 필요"))

    return findings

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True)
    ap.add_argument("--strict", action="store_true")
    ap.add_argument("--json-out", default="")
    args = ap.parse_args()

    files = iter_files(args.repo)
    print(f"[AUTUS Audit v2.0] {len(files)}개 파일 검사 중...")

    findings = []

    # 1) 금지 패턴 검사 (학부모 연락처)
    findings += scan_patterns(files, COACH_BANNED_PATTERNS, "COACH", "FAIL")

    # 2) 상태 머신 확인
    states = detect_session_states(files)
    missing = REQUIRED_SESSION_STATES - states
    if missing:
        findings.append(Finding("WARN", "COACH", "상태 머신 누락", f"필요: {sorted(missing)}"))

    # 3) 필수 기능 확인
    findings += check_required_features(files)

    if args.strict:
        for f in findings:
            if f.severity == "WARN":
                f.severity = "FAIL"

    # 출력
    fails = [f for f in findings if f.severity == "FAIL"]
    warns = [f for f in findings if f.severity == "WARN"]

    print(f"\n{'='*60}")
    print(f"AUTUS Coach App Audit Report v2.0")
    print(f"{'='*60}")

    if fails:
        print(f"\n🔴 FAIL ({len(fails)})")
        for f in fails:
            print(f"  [{f.file}:{f.line}] {f.title}")
            print(f"    → {f.detail}")

    if warns:
        print(f"\n🟡 WARN ({len(warns)})")
        for f in warns:
            print(f"  {f.title}: {f.detail}")

    print(f"\n{'='*60}")
    print(f"결과: FAIL={len(fails)} WARN={len(warns)}")

    if len(fails) == 0:
        print("✅ 스펙 준수!")
    else:
        print("❌ 스펙 위반 - 수정 필요")
    print(f"{'='*60}")

    if args.json_out:
        with open(args.json_out, "w") as fp:
            json.dump([f.__dict__ for f in findings], fp, ensure_ascii=False, indent=2)

    sys.exit(1 if fails else 0)

if __name__ == "__main__":
    main()
