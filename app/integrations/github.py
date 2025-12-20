"""
AUTUS GitHub Integration
AUDIT 기록 시 GitHub Issue 자동 생성
"""

import os
import json
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List
import httpx

logger = logging.getLogger("autus.github")

# ═══════════════════════════════════════════════════════════════════════════════
# GitHub 설정
# ═══════════════════════════════════════════════════════════════════════════════

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
GITHUB_REPO = os.getenv("GITHUB_REPO", "Ohseho81/autus")  # owner/repo
GITHUB_ENABLED = bool(GITHUB_TOKEN and GITHUB_REPO)

GITHUB_API_BASE = "https://api.github.com"


# ═══════════════════════════════════════════════════════════════════════════════
# Issue 템플릿
# ═══════════════════════════════════════════════════════════════════════════════

def format_audit_issue(
    audit_id: str,
    action: str,
    risk: float,
    system_state: str,
    snapshot: Dict[str, Any],
    person_id: Optional[str] = None,
) -> Dict[str, Any]:
    """AUDIT 기록 Issue 생성"""
    
    # 라벨 결정
    labels = ["audit", "automated"]
    
    if system_state == "RED":
        labels.append("critical")
    elif system_state in ["YELLOW", "AMBER"]:
        labels.append("warning")
    else:
        labels.append("normal")
    
    labels.append(f"action-{action.lower()}")
    
    # 타이틀
    title = f"[AUDIT] {action} executed - {audit_id}"
    
    # 본문
    timestamp = snapshot.get("executed_at", datetime.utcnow().isoformat())
    
    body = f"""## 🔒 AUDIT Record

| Field | Value |
|-------|-------|
| **AUDIT ID** | `{audit_id}` |
| **Action** | `{action}` |
| **System State** | {system_state} |
| **Risk** | {risk}% |
| **Timestamp** | {timestamp} |
| **Person ID** | {person_id or 'N/A'} |

---

### 📋 Snapshot

```json
{json.dumps(snapshot, indent=2, ensure_ascii=False)}
```

---

### ⚠️ Immutability Notice

> This record is **immutable**. It cannot be modified or deleted.
> Any changes must be recorded as a new AUDIT entry.

---

*Generated automatically by AUTUS System*
"""

    return {
        "title": title,
        "body": body,
        "labels": labels,
    }


def format_system_red_issue(
    risk: float,
    survival_days: float,
    violations: List[str],
    snapshot: Dict[str, Any],
) -> Dict[str, Any]:
    """SYSTEM_RED 긴급 Issue"""
    
    title = f"🔴 [CRITICAL] SYSTEM RED - Risk {risk}%"
    
    violation_list = "\n".join([f"- {v}" for v in violations]) if violations else "- None specified"
    
    body = f"""## 🚨 SYSTEM RED Alert

**The system has entered RED state. All actions are blocked.**

---

### 📊 Current State

| Metric | Value |
|--------|-------|
| **Risk** | 🔴 {risk}% |
| **Survival Days** | {survival_days} |
| **Status** | CRITICAL |

---

### ⚠️ Violations

{violation_list}

---

### 📋 System Snapshot

```json
{json.dumps(snapshot, indent=2, ensure_ascii=False)}
```

---

### 🔧 Required Actions

1. [ ] Identify root cause
2. [ ] Implement mitigation
3. [ ] Verify system recovery
4. [ ] Document resolution

---

*Generated automatically by AUTUS System*
"""

    return {
        "title": title,
        "body": body,
        "labels": ["critical", "system-red", "automated", "urgent"],
    }


def format_daily_summary_issue(
    date: str,
    total_actions: int,
    total_audits: int,
    avg_risk: float,
    actions_by_type: Dict[str, int],
    state_distribution: Dict[str, int],
) -> Dict[str, Any]:
    """일일 요약 Issue"""
    
    title = f"📊 [Daily Summary] {date}"
    
    actions_table = "\n".join([f"| {k} | {v} |" for k, v in actions_by_type.items()])
    states_table = "\n".join([f"| {k} | {v} |" for k, v in state_distribution.items()])
    
    body = f"""## 📊 Daily Summary - {date}

### 📈 Overview

| Metric | Value |
|--------|-------|
| **Total Actions** | {total_actions} |
| **Total Audits** | {total_audits} |
| **Average Risk** | {avg_risk:.1f}% |

---

### 🎯 Actions by Type

| Action | Count |
|--------|-------|
{actions_table}

---

### 🚦 State Distribution

| State | Count |
|-------|-------|
{states_table}

---

*Generated automatically by AUTUS System*
"""

    return {
        "title": title,
        "body": body,
        "labels": ["summary", "automated", "daily-report"],
    }


# ═══════════════════════════════════════════════════════════════════════════════
# GitHub API 함수
# ═══════════════════════════════════════════════════════════════════════════════

async def create_issue(
    title: str,
    body: str,
    labels: List[str] = None,
) -> Optional[Dict[str, Any]]:
    """GitHub Issue 생성"""
    
    if not GITHUB_ENABLED:
        logger.debug("[GitHub] Not configured, skipping issue creation")
        return None
    
    url = f"{GITHUB_API_BASE}/repos/{GITHUB_REPO}/issues"
    
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json",
    }
    
    payload = {
        "title": title,
        "body": body,
    }
    
    if labels:
        payload["labels"] = labels
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                headers=headers,
                json=payload,
                timeout=15.0,
            )
            
            if response.status_code == 201:
                data = response.json()
                logger.info(f"[GitHub] Issue created: #{data['number']}")
                return {
                    "number": data["number"],
                    "url": data["html_url"],
                    "title": data["title"],
                }
            else:
                logger.warning(f"[GitHub] Failed: {response.status_code} - {response.text}")
                return None
                
    except Exception as e:
        logger.error(f"[GitHub] Error: {e}")
        return None


async def add_comment(
    issue_number: int,
    body: str,
) -> bool:
    """Issue에 코멘트 추가"""
    
    if not GITHUB_ENABLED:
        return False
    
    url = f"{GITHUB_API_BASE}/repos/{GITHUB_REPO}/issues/{issue_number}/comments"
    
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json",
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                headers=headers,
                json={"body": body},
                timeout=10.0,
            )
            return response.status_code == 201
    except Exception as e:
        logger.error(f"[GitHub] Comment error: {e}")
        return False


async def close_issue(issue_number: int) -> bool:
    """Issue 닫기"""
    
    if not GITHUB_ENABLED:
        return False
    
    url = f"{GITHUB_API_BASE}/repos/{GITHUB_REPO}/issues/{issue_number}"
    
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json",
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.patch(
                url,
                headers=headers,
                json={"state": "closed"},
                timeout=10.0,
            )
            return response.status_code == 200
    except Exception as e:
        logger.error(f"[GitHub] Close error: {e}")
        return False


async def list_issues(
    state: str = "open",
    labels: str = None,
    limit: int = 10,
) -> List[Dict[str, Any]]:
    """Issue 목록 조회"""
    
    if not GITHUB_ENABLED:
        return []
    
    url = f"{GITHUB_API_BASE}/repos/{GITHUB_REPO}/issues"
    
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json",
    }
    
    params = {
        "state": state,
        "per_page": limit,
        "sort": "created",
        "direction": "desc",
    }
    
    if labels:
        params["labels"] = labels
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                headers=headers,
                params=params,
                timeout=10.0,
            )
            
            if response.status_code == 200:
                return response.json()
            return []
    except Exception as e:
        logger.error(f"[GitHub] List error: {e}")
        return []


# ═══════════════════════════════════════════════════════════════════════════════
# 편의 함수
# ═══════════════════════════════════════════════════════════════════════════════

async def create_audit_issue(
    audit_id: str,
    action: str,
    risk: float,
    system_state: str,
    snapshot: Dict[str, Any],
    person_id: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """AUDIT Issue 생성"""
    
    issue_data = format_audit_issue(
        audit_id=audit_id,
        action=action,
        risk=risk,
        system_state=system_state,
        snapshot=snapshot,
        person_id=person_id,
    )
    
    return await create_issue(
        title=issue_data["title"],
        body=issue_data["body"],
        labels=issue_data["labels"],
    )


async def create_system_red_issue(
    risk: float,
    survival_days: float,
    violations: List[str],
    snapshot: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    """SYSTEM_RED Issue 생성"""
    
    issue_data = format_system_red_issue(
        risk=risk,
        survival_days=survival_days,
        violations=violations,
        snapshot=snapshot,
    )
    
    return await create_issue(
        title=issue_data["title"],
        body=issue_data["body"],
        labels=issue_data["labels"],
    )


async def create_daily_summary_issue(
    date: str,
    total_actions: int,
    total_audits: int,
    avg_risk: float,
    actions_by_type: Dict[str, int],
    state_distribution: Dict[str, int],
) -> Optional[Dict[str, Any]]:
    """일일 요약 Issue 생성"""
    
    issue_data = format_daily_summary_issue(
        date=date,
        total_actions=total_actions,
        total_audits=total_audits,
        avg_risk=avg_risk,
        actions_by_type=actions_by_type,
        state_distribution=state_distribution,
    )
    
    return await create_issue(
        title=issue_data["title"],
        body=issue_data["body"],
        labels=issue_data["labels"],
    )


# ═══════════════════════════════════════════════════════════════════════════════
# 테스트
# ═══════════════════════════════════════════════════════════════════════════════

async def test_github_connection() -> Dict[str, Any]:
    """GitHub 연결 테스트"""
    
    if not GITHUB_ENABLED:
        return {
            "status": "disabled",
            "message": "GITHUB_TOKEN or GITHUB_REPO not configured",
        }
    
    # 저장소 정보 확인
    url = f"{GITHUB_API_BASE}/repos/{GITHUB_REPO}"
    
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json",
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, timeout=10.0)
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "status": "success",
                    "repo": data["full_name"],
                    "private": data["private"],
                    "permissions": {
                        "push": data.get("permissions", {}).get("push", False),
                        "pull": data.get("permissions", {}).get("pull", False),
                    },
                }
            else:
                return {
                    "status": "failed",
                    "message": f"HTTP {response.status_code}",
                }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
        }
