"""
AUTUS Linear Integration
리스크 감지 시 Linear Task 자동 생성
"""

import os
import json
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List
import httpx

logger = logging.getLogger("autus.linear")

# ═══════════════════════════════════════════════════════════════════════════════
# Linear 설정
# ═══════════════════════════════════════════════════════════════════════════════

LINEAR_API_KEY = os.getenv("LINEAR_API_KEY", "")
LINEAR_TEAM_ID = os.getenv("LINEAR_TEAM_ID", "")
LINEAR_ENABLED = bool(LINEAR_API_KEY)

LINEAR_API_BASE = "https://api.linear.app/graphql"


# ═══════════════════════════════════════════════════════════════════════════════
# GraphQL 쿼리
# ═══════════════════════════════════════════════════════════════════════════════

CREATE_ISSUE_MUTATION = """
mutation IssueCreate($input: IssueCreateInput!) {
  issueCreate(input: $input) {
    success
    issue {
      id
      identifier
      title
      url
      state {
        name
      }
    }
  }
}
"""

GET_TEAMS_QUERY = """
query Teams {
  teams {
    nodes {
      id
      name
      key
    }
  }
}
"""

GET_LABELS_QUERY = """
query Labels($teamId: String!) {
  team(id: $teamId) {
    labels {
      nodes {
        id
        name
        color
      }
    }
  }
}
"""

GET_STATES_QUERY = """
query States($teamId: String!) {
  team(id: $teamId) {
    states {
      nodes {
        id
        name
        type
      }
    }
  }
}
"""

GET_ISSUES_QUERY = """
query Issues($first: Int, $filter: IssueFilter) {
  issues(first: $first, filter: $filter) {
    nodes {
      id
      identifier
      title
      state {
        name
      }
      priority
      url
      createdAt
    }
  }
}
"""

UPDATE_ISSUE_MUTATION = """
mutation IssueUpdate($id: String!, $input: IssueUpdateInput!) {
  issueUpdate(id: $id, input: $input) {
    success
    issue {
      id
      state {
        name
      }
    }
  }
}
"""


# ═══════════════════════════════════════════════════════════════════════════════
# Linear API 함수
# ═══════════════════════════════════════════════════════════════════════════════

async def graphql_request(query: str, variables: Dict = None) -> Optional[Dict]:
    """Linear GraphQL 요청"""
    
    if not LINEAR_ENABLED:
        logger.debug("[Linear] Not configured, skipping")
        return None
    
    headers = {
        "Authorization": LINEAR_API_KEY,
        "Content-Type": "application/json",
    }
    
    payload = {"query": query}
    if variables:
        payload["variables"] = variables
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                LINEAR_API_BASE,
                headers=headers,
                json=payload,
                timeout=15.0,
            )
            
            if response.status_code == 200:
                data = response.json()
                if "errors" in data:
                    logger.warning(f"[Linear] GraphQL errors: {data['errors']}")
                    return None
                return data.get("data")
            else:
                logger.warning(f"[Linear] HTTP {response.status_code}: {response.text}")
                return None
                
    except Exception as e:
        logger.error(f"[Linear] Error: {e}")
        return None


async def create_issue(
    title: str,
    description: str,
    team_id: str = None,
    priority: int = 0,  # 0=No priority, 1=Urgent, 2=High, 3=Medium, 4=Low
    label_ids: List[str] = None,
) -> Optional[Dict[str, Any]]:
    """Linear Issue 생성"""
    
    if not LINEAR_ENABLED:
        return None
    
    team = team_id or LINEAR_TEAM_ID
    
    if not team:
        logger.warning("[Linear] No team ID specified")
        return None
    
    input_data = {
        "teamId": team,
        "title": title,
        "description": description,
        "priority": priority,
    }
    
    if label_ids:
        input_data["labelIds"] = label_ids
    
    data = await graphql_request(CREATE_ISSUE_MUTATION, {"input": input_data})
    
    if data and data.get("issueCreate", {}).get("success"):
        issue = data["issueCreate"]["issue"]
        logger.info(f"[Linear] Issue created: {issue['identifier']}")
        return {
            "id": issue["id"],
            "identifier": issue["identifier"],
            "title": issue["title"],
            "url": issue["url"],
            "state": issue["state"]["name"],
        }
    
    return None


async def get_teams() -> List[Dict[str, Any]]:
    """팀 목록 조회"""
    
    data = await graphql_request(GET_TEAMS_QUERY)
    
    if data and "teams" in data:
        return data["teams"]["nodes"]
    
    return []


async def get_labels(team_id: str = None) -> List[Dict[str, Any]]:
    """라벨 목록 조회"""
    
    team = team_id or LINEAR_TEAM_ID
    
    if not team:
        return []
    
    data = await graphql_request(GET_LABELS_QUERY, {"teamId": team})
    
    if data and "team" in data:
        return data["team"]["labels"]["nodes"]
    
    return []


async def get_states(team_id: str = None) -> List[Dict[str, Any]]:
    """상태 목록 조회"""
    
    team = team_id or LINEAR_TEAM_ID
    
    if not team:
        return []
    
    data = await graphql_request(GET_STATES_QUERY, {"teamId": team})
    
    if data and "team" in data:
        return data["team"]["states"]["nodes"]
    
    return []


async def get_issues(
    first: int = 10,
    team_id: str = None,
) -> List[Dict[str, Any]]:
    """Issue 목록 조회"""
    
    team = team_id or LINEAR_TEAM_ID
    
    filter_data = {}
    if team:
        filter_data["team"] = {"id": {"eq": team}}
    
    variables = {"first": first}
    if filter_data:
        variables["filter"] = filter_data
    
    data = await graphql_request(GET_ISSUES_QUERY, variables)
    
    if data and "issues" in data:
        return data["issues"]["nodes"]
    
    return []


async def update_issue_state(
    issue_id: str,
    state_id: str,
) -> bool:
    """Issue 상태 변경"""
    
    data = await graphql_request(
        UPDATE_ISSUE_MUTATION,
        {"id": issue_id, "input": {"stateId": state_id}}
    )
    
    return data and data.get("issueUpdate", {}).get("success", False)


# ═══════════════════════════════════════════════════════════════════════════════
# AUTUS 연동 함수
# ═══════════════════════════════════════════════════════════════════════════════

async def create_audit_task(
    audit_id: str,
    action: str,
    risk: float,
    system_state: str,
    person_id: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """AUDIT 기록 Task 생성"""
    
    # 우선순위 결정
    if system_state == "RED" or risk >= 70:
        priority = 1  # Urgent
    elif system_state in ["YELLOW", "AMBER"] or risk >= 50:
        priority = 2  # High
    elif risk >= 30:
        priority = 3  # Medium
    else:
        priority = 4  # Low
    
    title = f"[AUDIT] {action} - {audit_id[:16]}"
    
    description = f"""## AUDIT Record

| Field | Value |
|-------|-------|
| **AUDIT ID** | `{audit_id}` |
| **Action** | `{action}` |
| **System State** | {system_state} |
| **Risk** | {risk}% |
| **Person ID** | {person_id or 'N/A'} |
| **Timestamp** | {datetime.utcnow().isoformat()} |

---

### ⚠️ Note
This task was automatically created by AUTUS system.
The AUDIT record is **immutable**.

---

*Generated by AUTUS*
"""
    
    return await create_issue(
        title=title,
        description=description,
        priority=priority,
    )


async def create_risk_alert_task(
    risk: float,
    survival_days: float,
    system_state: str,
    violations: List[str] = None,
) -> Optional[Dict[str, Any]]:
    """리스크 알림 Task 생성"""
    
    # 긴급도 결정
    if system_state == "RED":
        priority = 1  # Urgent
        title = f"🔴 [CRITICAL] System RED - Risk {risk}%"
    elif risk >= 60:
        priority = 1  # Urgent
        title = f"⚠️ [HIGH RISK] Risk Level {risk}%"
    else:
        priority = 2  # High
        title = f"⚡ [ALERT] Risk Warning {risk}%"
    
    violation_list = "\n".join([f"- {v}" for v in (violations or [])]) or "- None"
    
    description = f"""## Risk Alert

| Metric | Value |
|--------|-------|
| **Risk** | {risk}% |
| **Survival Days** | {survival_days} |
| **System State** | {system_state} |

---

### Violations
{violation_list}

---

### Required Actions
- [ ] Investigate root cause
- [ ] Implement mitigation
- [ ] Verify system recovery
- [ ] Update status

---

*Generated by AUTUS*
"""
    
    return await create_issue(
        title=title,
        description=description,
        priority=priority,
    )


async def create_daily_review_task(
    date: str,
    total_actions: int,
    avg_risk: float,
    summary: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    """일일 리뷰 Task 생성"""
    
    title = f"📊 [Daily Review] {date}"
    
    description = f"""## Daily Review - {date}

### Summary
| Metric | Value |
|--------|-------|
| **Total Actions** | {total_actions} |
| **Average Risk** | {avg_risk:.1f}% |

---

### Tasks
- [ ] Review all actions
- [ ] Verify audit records
- [ ] Check system health
- [ ] Plan next day

---

### Details
```json
{json.dumps(summary, indent=2)}
```

---

*Generated by AUTUS*
"""
    
    return await create_issue(
        title=title,
        description=description,
        priority=4,  # Low
    )


# ═══════════════════════════════════════════════════════════════════════════════
# 테스트
# ═══════════════════════════════════════════════════════════════════════════════

async def test_linear_connection() -> Dict[str, Any]:
    """Linear 연결 테스트"""
    
    if not LINEAR_ENABLED:
        return {
            "status": "disabled",
            "message": "LINEAR_API_KEY not configured",
        }
    
    teams = await get_teams()
    
    if teams:
        return {
            "status": "success",
            "teams": [{"id": t["id"], "name": t["name"], "key": t["key"]} for t in teams],
            "team_count": len(teams),
        }
    
    return {
        "status": "failed",
        "message": "Could not fetch teams",
    }
