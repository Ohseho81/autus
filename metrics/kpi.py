#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
📊 AUTUS KPI Dashboard

핵심 지표 추적 및 시각화
"""

from typing import Dict, List, Optional
from datetime import datetime
import json
import os


class KPITracker:
    """KPI 추적기"""
    
    def __init__(self, data_dir: str = "data/output"):
        self.data_dir = data_dir
        self.history: List[Dict] = []
    
    def record(self, kpi: Dict, week_id: str = None) -> None:
        """KPI 기록"""
        if week_id is None:
            week_id = datetime.now().strftime("%Y-W%V")
        
        record = {
            "week_id": week_id,
            "timestamp": datetime.now().isoformat(),
            **kpi
        }
        
        self.history.append(record)
        
        # 파일 저장
        path = os.path.join(self.data_dir, "kpi_history.jsonl")
        os.makedirs(self.data_dir, exist_ok=True)
        
        with open(path, "a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
    
    def get_trend(self, metric: str, weeks: int = 4) -> List[Dict]:
        """지표 트렌드 조회"""
        recent = self.history[-weeks:] if len(self.history) >= weeks else self.history
        
        return [
            {"week_id": r["week_id"], "value": r.get(metric, 0)}
            for r in recent
        ]
    
    def get_alerts(self, kpi: Dict) -> List[Dict]:
        """경고 생성"""
        alerts = []
        
        # 엔트로피 체크
        entropy = kpi.get("entropy_ratio", 0)
        if entropy >= 0.30:
            alerts.append({
                "level": "CRITICAL",
                "metric": "entropy",
                "message": f"엔트로피 위험 수준 ({entropy:.1%})",
                "action": "즉각 개입 필요"
            })
        elif entropy >= 0.25:
            alerts.append({
                "level": "WARNING",
                "metric": "entropy",
                "message": f"엔트로피 경고 수준 ({entropy:.1%})",
                "action": "모니터링 강화"
            })
        
        # 속도 변화 체크
        vel_change = kpi.get("velocity_change", 0)
        if vel_change < -0.2:
            alerts.append({
                "level": "CRITICAL",
                "metric": "velocity",
                "message": f"생산성 급감 ({vel_change:+.1%})",
                "action": "원인 분석 필요"
            })
        elif vel_change < -0.1:
            alerts.append({
                "level": "WARNING",
                "metric": "velocity",
                "message": f"생산성 하락 ({vel_change:+.1%})",
                "action": "주의 필요"
            })
        
        return alerts


def generate_weekly_summary(kpi: Dict, team: Dict, roles: List[Dict]) -> str:
    """주간 요약 생성"""
    mint = kpi.get("mint_krw", 0)
    burn = kpi.get("burn_krw", 0)
    net = kpi.get("net_krw", 0)
    entropy = kpi.get("entropy_ratio", 0)
    
    lines = [
        "=" * 50,
        "📊 AUTUS 주간 요약",
        "=" * 50,
        "",
        f"💰 순수익: ₩{net/1e6:.1f}M",
        f"   (Mint ₩{mint/1e6:.1f}M - Burn ₩{burn/1e6:.1f}M)",
        "",
        f"🌡️ 엔트로피: {entropy:.1%}",
        "",
        f"🏆 최적 팀: {', '.join(team.get('team', []))}",
        f"   점수: {team.get('score', 0):.2f}",
        "",
        "👤 역할:",
    ]
    
    for r in roles:
        role_str = r.get("primary_role", "")
        if r.get("secondary_role"):
            role_str += f" + {r['secondary_role']}"
        lines.append(f"   {r['person_id']}: {role_str}")
    
    lines.extend(["", "=" * 50])
    
    return "\n".join(lines)






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
📊 AUTUS KPI Dashboard

핵심 지표 추적 및 시각화
"""

from typing import Dict, List, Optional
from datetime import datetime
import json
import os


class KPITracker:
    """KPI 추적기"""
    
    def __init__(self, data_dir: str = "data/output"):
        self.data_dir = data_dir
        self.history: List[Dict] = []
    
    def record(self, kpi: Dict, week_id: str = None) -> None:
        """KPI 기록"""
        if week_id is None:
            week_id = datetime.now().strftime("%Y-W%V")
        
        record = {
            "week_id": week_id,
            "timestamp": datetime.now().isoformat(),
            **kpi
        }
        
        self.history.append(record)
        
        # 파일 저장
        path = os.path.join(self.data_dir, "kpi_history.jsonl")
        os.makedirs(self.data_dir, exist_ok=True)
        
        with open(path, "a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
    
    def get_trend(self, metric: str, weeks: int = 4) -> List[Dict]:
        """지표 트렌드 조회"""
        recent = self.history[-weeks:] if len(self.history) >= weeks else self.history
        
        return [
            {"week_id": r["week_id"], "value": r.get(metric, 0)}
            for r in recent
        ]
    
    def get_alerts(self, kpi: Dict) -> List[Dict]:
        """경고 생성"""
        alerts = []
        
        # 엔트로피 체크
        entropy = kpi.get("entropy_ratio", 0)
        if entropy >= 0.30:
            alerts.append({
                "level": "CRITICAL",
                "metric": "entropy",
                "message": f"엔트로피 위험 수준 ({entropy:.1%})",
                "action": "즉각 개입 필요"
            })
        elif entropy >= 0.25:
            alerts.append({
                "level": "WARNING",
                "metric": "entropy",
                "message": f"엔트로피 경고 수준 ({entropy:.1%})",
                "action": "모니터링 강화"
            })
        
        # 속도 변화 체크
        vel_change = kpi.get("velocity_change", 0)
        if vel_change < -0.2:
            alerts.append({
                "level": "CRITICAL",
                "metric": "velocity",
                "message": f"생산성 급감 ({vel_change:+.1%})",
                "action": "원인 분석 필요"
            })
        elif vel_change < -0.1:
            alerts.append({
                "level": "WARNING",
                "metric": "velocity",
                "message": f"생산성 하락 ({vel_change:+.1%})",
                "action": "주의 필요"
            })
        
        return alerts


def generate_weekly_summary(kpi: Dict, team: Dict, roles: List[Dict]) -> str:
    """주간 요약 생성"""
    mint = kpi.get("mint_krw", 0)
    burn = kpi.get("burn_krw", 0)
    net = kpi.get("net_krw", 0)
    entropy = kpi.get("entropy_ratio", 0)
    
    lines = [
        "=" * 50,
        "📊 AUTUS 주간 요약",
        "=" * 50,
        "",
        f"💰 순수익: ₩{net/1e6:.1f}M",
        f"   (Mint ₩{mint/1e6:.1f}M - Burn ₩{burn/1e6:.1f}M)",
        "",
        f"🌡️ 엔트로피: {entropy:.1%}",
        "",
        f"🏆 최적 팀: {', '.join(team.get('team', []))}",
        f"   점수: {team.get('score', 0):.2f}",
        "",
        "👤 역할:",
    ]
    
    for r in roles:
        role_str = r.get("primary_role", "")
        if r.get("secondary_role"):
            role_str += f" + {r['secondary_role']}"
        lines.append(f"   {r['person_id']}: {role_str}")
    
    lines.extend(["", "=" * 50])
    
    return "\n".join(lines)






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
📊 AUTUS KPI Dashboard

핵심 지표 추적 및 시각화
"""

from typing import Dict, List, Optional
from datetime import datetime
import json
import os


class KPITracker:
    """KPI 추적기"""
    
    def __init__(self, data_dir: str = "data/output"):
        self.data_dir = data_dir
        self.history: List[Dict] = []
    
    def record(self, kpi: Dict, week_id: str = None) -> None:
        """KPI 기록"""
        if week_id is None:
            week_id = datetime.now().strftime("%Y-W%V")
        
        record = {
            "week_id": week_id,
            "timestamp": datetime.now().isoformat(),
            **kpi
        }
        
        self.history.append(record)
        
        # 파일 저장
        path = os.path.join(self.data_dir, "kpi_history.jsonl")
        os.makedirs(self.data_dir, exist_ok=True)
        
        with open(path, "a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
    
    def get_trend(self, metric: str, weeks: int = 4) -> List[Dict]:
        """지표 트렌드 조회"""
        recent = self.history[-weeks:] if len(self.history) >= weeks else self.history
        
        return [
            {"week_id": r["week_id"], "value": r.get(metric, 0)}
            for r in recent
        ]
    
    def get_alerts(self, kpi: Dict) -> List[Dict]:
        """경고 생성"""
        alerts = []
        
        # 엔트로피 체크
        entropy = kpi.get("entropy_ratio", 0)
        if entropy >= 0.30:
            alerts.append({
                "level": "CRITICAL",
                "metric": "entropy",
                "message": f"엔트로피 위험 수준 ({entropy:.1%})",
                "action": "즉각 개입 필요"
            })
        elif entropy >= 0.25:
            alerts.append({
                "level": "WARNING",
                "metric": "entropy",
                "message": f"엔트로피 경고 수준 ({entropy:.1%})",
                "action": "모니터링 강화"
            })
        
        # 속도 변화 체크
        vel_change = kpi.get("velocity_change", 0)
        if vel_change < -0.2:
            alerts.append({
                "level": "CRITICAL",
                "metric": "velocity",
                "message": f"생산성 급감 ({vel_change:+.1%})",
                "action": "원인 분석 필요"
            })
        elif vel_change < -0.1:
            alerts.append({
                "level": "WARNING",
                "metric": "velocity",
                "message": f"생산성 하락 ({vel_change:+.1%})",
                "action": "주의 필요"
            })
        
        return alerts


def generate_weekly_summary(kpi: Dict, team: Dict, roles: List[Dict]) -> str:
    """주간 요약 생성"""
    mint = kpi.get("mint_krw", 0)
    burn = kpi.get("burn_krw", 0)
    net = kpi.get("net_krw", 0)
    entropy = kpi.get("entropy_ratio", 0)
    
    lines = [
        "=" * 50,
        "📊 AUTUS 주간 요약",
        "=" * 50,
        "",
        f"💰 순수익: ₩{net/1e6:.1f}M",
        f"   (Mint ₩{mint/1e6:.1f}M - Burn ₩{burn/1e6:.1f}M)",
        "",
        f"🌡️ 엔트로피: {entropy:.1%}",
        "",
        f"🏆 최적 팀: {', '.join(team.get('team', []))}",
        f"   점수: {team.get('score', 0):.2f}",
        "",
        "👤 역할:",
    ]
    
    for r in roles:
        role_str = r.get("primary_role", "")
        if r.get("secondary_role"):
            role_str += f" + {r['secondary_role']}"
        lines.append(f"   {r['person_id']}: {role_str}")
    
    lines.extend(["", "=" * 50])
    
    return "\n".join(lines)






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
📊 AUTUS KPI Dashboard

핵심 지표 추적 및 시각화
"""

from typing import Dict, List, Optional
from datetime import datetime
import json
import os


class KPITracker:
    """KPI 추적기"""
    
    def __init__(self, data_dir: str = "data/output"):
        self.data_dir = data_dir
        self.history: List[Dict] = []
    
    def record(self, kpi: Dict, week_id: str = None) -> None:
        """KPI 기록"""
        if week_id is None:
            week_id = datetime.now().strftime("%Y-W%V")
        
        record = {
            "week_id": week_id,
            "timestamp": datetime.now().isoformat(),
            **kpi
        }
        
        self.history.append(record)
        
        # 파일 저장
        path = os.path.join(self.data_dir, "kpi_history.jsonl")
        os.makedirs(self.data_dir, exist_ok=True)
        
        with open(path, "a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
    
    def get_trend(self, metric: str, weeks: int = 4) -> List[Dict]:
        """지표 트렌드 조회"""
        recent = self.history[-weeks:] if len(self.history) >= weeks else self.history
        
        return [
            {"week_id": r["week_id"], "value": r.get(metric, 0)}
            for r in recent
        ]
    
    def get_alerts(self, kpi: Dict) -> List[Dict]:
        """경고 생성"""
        alerts = []
        
        # 엔트로피 체크
        entropy = kpi.get("entropy_ratio", 0)
        if entropy >= 0.30:
            alerts.append({
                "level": "CRITICAL",
                "metric": "entropy",
                "message": f"엔트로피 위험 수준 ({entropy:.1%})",
                "action": "즉각 개입 필요"
            })
        elif entropy >= 0.25:
            alerts.append({
                "level": "WARNING",
                "metric": "entropy",
                "message": f"엔트로피 경고 수준 ({entropy:.1%})",
                "action": "모니터링 강화"
            })
        
        # 속도 변화 체크
        vel_change = kpi.get("velocity_change", 0)
        if vel_change < -0.2:
            alerts.append({
                "level": "CRITICAL",
                "metric": "velocity",
                "message": f"생산성 급감 ({vel_change:+.1%})",
                "action": "원인 분석 필요"
            })
        elif vel_change < -0.1:
            alerts.append({
                "level": "WARNING",
                "metric": "velocity",
                "message": f"생산성 하락 ({vel_change:+.1%})",
                "action": "주의 필요"
            })
        
        return alerts


def generate_weekly_summary(kpi: Dict, team: Dict, roles: List[Dict]) -> str:
    """주간 요약 생성"""
    mint = kpi.get("mint_krw", 0)
    burn = kpi.get("burn_krw", 0)
    net = kpi.get("net_krw", 0)
    entropy = kpi.get("entropy_ratio", 0)
    
    lines = [
        "=" * 50,
        "📊 AUTUS 주간 요약",
        "=" * 50,
        "",
        f"💰 순수익: ₩{net/1e6:.1f}M",
        f"   (Mint ₩{mint/1e6:.1f}M - Burn ₩{burn/1e6:.1f}M)",
        "",
        f"🌡️ 엔트로피: {entropy:.1%}",
        "",
        f"🏆 최적 팀: {', '.join(team.get('team', []))}",
        f"   점수: {team.get('score', 0):.2f}",
        "",
        "👤 역할:",
    ]
    
    for r in roles:
        role_str = r.get("primary_role", "")
        if r.get("secondary_role"):
            role_str += f" + {r['secondary_role']}"
        lines.append(f"   {r['person_id']}: {role_str}")
    
    lines.extend(["", "=" * 50])
    
    return "\n".join(lines)






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
📊 AUTUS KPI Dashboard

핵심 지표 추적 및 시각화
"""

from typing import Dict, List, Optional
from datetime import datetime
import json
import os


class KPITracker:
    """KPI 추적기"""
    
    def __init__(self, data_dir: str = "data/output"):
        self.data_dir = data_dir
        self.history: List[Dict] = []
    
    def record(self, kpi: Dict, week_id: str = None) -> None:
        """KPI 기록"""
        if week_id is None:
            week_id = datetime.now().strftime("%Y-W%V")
        
        record = {
            "week_id": week_id,
            "timestamp": datetime.now().isoformat(),
            **kpi
        }
        
        self.history.append(record)
        
        # 파일 저장
        path = os.path.join(self.data_dir, "kpi_history.jsonl")
        os.makedirs(self.data_dir, exist_ok=True)
        
        with open(path, "a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
    
    def get_trend(self, metric: str, weeks: int = 4) -> List[Dict]:
        """지표 트렌드 조회"""
        recent = self.history[-weeks:] if len(self.history) >= weeks else self.history
        
        return [
            {"week_id": r["week_id"], "value": r.get(metric, 0)}
            for r in recent
        ]
    
    def get_alerts(self, kpi: Dict) -> List[Dict]:
        """경고 생성"""
        alerts = []
        
        # 엔트로피 체크
        entropy = kpi.get("entropy_ratio", 0)
        if entropy >= 0.30:
            alerts.append({
                "level": "CRITICAL",
                "metric": "entropy",
                "message": f"엔트로피 위험 수준 ({entropy:.1%})",
                "action": "즉각 개입 필요"
            })
        elif entropy >= 0.25:
            alerts.append({
                "level": "WARNING",
                "metric": "entropy",
                "message": f"엔트로피 경고 수준 ({entropy:.1%})",
                "action": "모니터링 강화"
            })
        
        # 속도 변화 체크
        vel_change = kpi.get("velocity_change", 0)
        if vel_change < -0.2:
            alerts.append({
                "level": "CRITICAL",
                "metric": "velocity",
                "message": f"생산성 급감 ({vel_change:+.1%})",
                "action": "원인 분석 필요"
            })
        elif vel_change < -0.1:
            alerts.append({
                "level": "WARNING",
                "metric": "velocity",
                "message": f"생산성 하락 ({vel_change:+.1%})",
                "action": "주의 필요"
            })
        
        return alerts


def generate_weekly_summary(kpi: Dict, team: Dict, roles: List[Dict]) -> str:
    """주간 요약 생성"""
    mint = kpi.get("mint_krw", 0)
    burn = kpi.get("burn_krw", 0)
    net = kpi.get("net_krw", 0)
    entropy = kpi.get("entropy_ratio", 0)
    
    lines = [
        "=" * 50,
        "📊 AUTUS 주간 요약",
        "=" * 50,
        "",
        f"💰 순수익: ₩{net/1e6:.1f}M",
        f"   (Mint ₩{mint/1e6:.1f}M - Burn ₩{burn/1e6:.1f}M)",
        "",
        f"🌡️ 엔트로피: {entropy:.1%}",
        "",
        f"🏆 최적 팀: {', '.join(team.get('team', []))}",
        f"   점수: {team.get('score', 0):.2f}",
        "",
        "👤 역할:",
    ]
    
    for r in roles:
        role_str = r.get("primary_role", "")
        if r.get("secondary_role"):
            role_str += f" + {r['secondary_role']}"
        lines.append(f"   {r['person_id']}: {role_str}")
    
    lines.extend(["", "=" * 50])
    
    return "\n".join(lines)
















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
📊 AUTUS KPI Dashboard

핵심 지표 추적 및 시각화
"""

from typing import Dict, List, Optional
from datetime import datetime
import json
import os


class KPITracker:
    """KPI 추적기"""
    
    def __init__(self, data_dir: str = "data/output"):
        self.data_dir = data_dir
        self.history: List[Dict] = []
    
    def record(self, kpi: Dict, week_id: str = None) -> None:
        """KPI 기록"""
        if week_id is None:
            week_id = datetime.now().strftime("%Y-W%V")
        
        record = {
            "week_id": week_id,
            "timestamp": datetime.now().isoformat(),
            **kpi
        }
        
        self.history.append(record)
        
        # 파일 저장
        path = os.path.join(self.data_dir, "kpi_history.jsonl")
        os.makedirs(self.data_dir, exist_ok=True)
        
        with open(path, "a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
    
    def get_trend(self, metric: str, weeks: int = 4) -> List[Dict]:
        """지표 트렌드 조회"""
        recent = self.history[-weeks:] if len(self.history) >= weeks else self.history
        
        return [
            {"week_id": r["week_id"], "value": r.get(metric, 0)}
            for r in recent
        ]
    
    def get_alerts(self, kpi: Dict) -> List[Dict]:
        """경고 생성"""
        alerts = []
        
        # 엔트로피 체크
        entropy = kpi.get("entropy_ratio", 0)
        if entropy >= 0.30:
            alerts.append({
                "level": "CRITICAL",
                "metric": "entropy",
                "message": f"엔트로피 위험 수준 ({entropy:.1%})",
                "action": "즉각 개입 필요"
            })
        elif entropy >= 0.25:
            alerts.append({
                "level": "WARNING",
                "metric": "entropy",
                "message": f"엔트로피 경고 수준 ({entropy:.1%})",
                "action": "모니터링 강화"
            })
        
        # 속도 변화 체크
        vel_change = kpi.get("velocity_change", 0)
        if vel_change < -0.2:
            alerts.append({
                "level": "CRITICAL",
                "metric": "velocity",
                "message": f"생산성 급감 ({vel_change:+.1%})",
                "action": "원인 분석 필요"
            })
        elif vel_change < -0.1:
            alerts.append({
                "level": "WARNING",
                "metric": "velocity",
                "message": f"생산성 하락 ({vel_change:+.1%})",
                "action": "주의 필요"
            })
        
        return alerts


def generate_weekly_summary(kpi: Dict, team: Dict, roles: List[Dict]) -> str:
    """주간 요약 생성"""
    mint = kpi.get("mint_krw", 0)
    burn = kpi.get("burn_krw", 0)
    net = kpi.get("net_krw", 0)
    entropy = kpi.get("entropy_ratio", 0)
    
    lines = [
        "=" * 50,
        "📊 AUTUS 주간 요약",
        "=" * 50,
        "",
        f"💰 순수익: ₩{net/1e6:.1f}M",
        f"   (Mint ₩{mint/1e6:.1f}M - Burn ₩{burn/1e6:.1f}M)",
        "",
        f"🌡️ 엔트로피: {entropy:.1%}",
        "",
        f"🏆 최적 팀: {', '.join(team.get('team', []))}",
        f"   점수: {team.get('score', 0):.2f}",
        "",
        "👤 역할:",
    ]
    
    for r in roles:
        role_str = r.get("primary_role", "")
        if r.get("secondary_role"):
            role_str += f" + {r['secondary_role']}"
        lines.append(f"   {r['person_id']}: {role_str}")
    
    lines.extend(["", "=" * 50])
    
    return "\n".join(lines)






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
📊 AUTUS KPI Dashboard

핵심 지표 추적 및 시각화
"""

from typing import Dict, List, Optional
from datetime import datetime
import json
import os


class KPITracker:
    """KPI 추적기"""
    
    def __init__(self, data_dir: str = "data/output"):
        self.data_dir = data_dir
        self.history: List[Dict] = []
    
    def record(self, kpi: Dict, week_id: str = None) -> None:
        """KPI 기록"""
        if week_id is None:
            week_id = datetime.now().strftime("%Y-W%V")
        
        record = {
            "week_id": week_id,
            "timestamp": datetime.now().isoformat(),
            **kpi
        }
        
        self.history.append(record)
        
        # 파일 저장
        path = os.path.join(self.data_dir, "kpi_history.jsonl")
        os.makedirs(self.data_dir, exist_ok=True)
        
        with open(path, "a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
    
    def get_trend(self, metric: str, weeks: int = 4) -> List[Dict]:
        """지표 트렌드 조회"""
        recent = self.history[-weeks:] if len(self.history) >= weeks else self.history
        
        return [
            {"week_id": r["week_id"], "value": r.get(metric, 0)}
            for r in recent
        ]
    
    def get_alerts(self, kpi: Dict) -> List[Dict]:
        """경고 생성"""
        alerts = []
        
        # 엔트로피 체크
        entropy = kpi.get("entropy_ratio", 0)
        if entropy >= 0.30:
            alerts.append({
                "level": "CRITICAL",
                "metric": "entropy",
                "message": f"엔트로피 위험 수준 ({entropy:.1%})",
                "action": "즉각 개입 필요"
            })
        elif entropy >= 0.25:
            alerts.append({
                "level": "WARNING",
                "metric": "entropy",
                "message": f"엔트로피 경고 수준 ({entropy:.1%})",
                "action": "모니터링 강화"
            })
        
        # 속도 변화 체크
        vel_change = kpi.get("velocity_change", 0)
        if vel_change < -0.2:
            alerts.append({
                "level": "CRITICAL",
                "metric": "velocity",
                "message": f"생산성 급감 ({vel_change:+.1%})",
                "action": "원인 분석 필요"
            })
        elif vel_change < -0.1:
            alerts.append({
                "level": "WARNING",
                "metric": "velocity",
                "message": f"생산성 하락 ({vel_change:+.1%})",
                "action": "주의 필요"
            })
        
        return alerts


def generate_weekly_summary(kpi: Dict, team: Dict, roles: List[Dict]) -> str:
    """주간 요약 생성"""
    mint = kpi.get("mint_krw", 0)
    burn = kpi.get("burn_krw", 0)
    net = kpi.get("net_krw", 0)
    entropy = kpi.get("entropy_ratio", 0)
    
    lines = [
        "=" * 50,
        "📊 AUTUS 주간 요약",
        "=" * 50,
        "",
        f"💰 순수익: ₩{net/1e6:.1f}M",
        f"   (Mint ₩{mint/1e6:.1f}M - Burn ₩{burn/1e6:.1f}M)",
        "",
        f"🌡️ 엔트로피: {entropy:.1%}",
        "",
        f"🏆 최적 팀: {', '.join(team.get('team', []))}",
        f"   점수: {team.get('score', 0):.2f}",
        "",
        "👤 역할:",
    ]
    
    for r in roles:
        role_str = r.get("primary_role", "")
        if r.get("secondary_role"):
            role_str += f" + {r['secondary_role']}"
        lines.append(f"   {r['person_id']}: {role_str}")
    
    lines.extend(["", "=" * 50])
    
    return "\n".join(lines)






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
📊 AUTUS KPI Dashboard

핵심 지표 추적 및 시각화
"""

from typing import Dict, List, Optional
from datetime import datetime
import json
import os


class KPITracker:
    """KPI 추적기"""
    
    def __init__(self, data_dir: str = "data/output"):
        self.data_dir = data_dir
        self.history: List[Dict] = []
    
    def record(self, kpi: Dict, week_id: str = None) -> None:
        """KPI 기록"""
        if week_id is None:
            week_id = datetime.now().strftime("%Y-W%V")
        
        record = {
            "week_id": week_id,
            "timestamp": datetime.now().isoformat(),
            **kpi
        }
        
        self.history.append(record)
        
        # 파일 저장
        path = os.path.join(self.data_dir, "kpi_history.jsonl")
        os.makedirs(self.data_dir, exist_ok=True)
        
        with open(path, "a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
    
    def get_trend(self, metric: str, weeks: int = 4) -> List[Dict]:
        """지표 트렌드 조회"""
        recent = self.history[-weeks:] if len(self.history) >= weeks else self.history
        
        return [
            {"week_id": r["week_id"], "value": r.get(metric, 0)}
            for r in recent
        ]
    
    def get_alerts(self, kpi: Dict) -> List[Dict]:
        """경고 생성"""
        alerts = []
        
        # 엔트로피 체크
        entropy = kpi.get("entropy_ratio", 0)
        if entropy >= 0.30:
            alerts.append({
                "level": "CRITICAL",
                "metric": "entropy",
                "message": f"엔트로피 위험 수준 ({entropy:.1%})",
                "action": "즉각 개입 필요"
            })
        elif entropy >= 0.25:
            alerts.append({
                "level": "WARNING",
                "metric": "entropy",
                "message": f"엔트로피 경고 수준 ({entropy:.1%})",
                "action": "모니터링 강화"
            })
        
        # 속도 변화 체크
        vel_change = kpi.get("velocity_change", 0)
        if vel_change < -0.2:
            alerts.append({
                "level": "CRITICAL",
                "metric": "velocity",
                "message": f"생산성 급감 ({vel_change:+.1%})",
                "action": "원인 분석 필요"
            })
        elif vel_change < -0.1:
            alerts.append({
                "level": "WARNING",
                "metric": "velocity",
                "message": f"생산성 하락 ({vel_change:+.1%})",
                "action": "주의 필요"
            })
        
        return alerts


def generate_weekly_summary(kpi: Dict, team: Dict, roles: List[Dict]) -> str:
    """주간 요약 생성"""
    mint = kpi.get("mint_krw", 0)
    burn = kpi.get("burn_krw", 0)
    net = kpi.get("net_krw", 0)
    entropy = kpi.get("entropy_ratio", 0)
    
    lines = [
        "=" * 50,
        "📊 AUTUS 주간 요약",
        "=" * 50,
        "",
        f"💰 순수익: ₩{net/1e6:.1f}M",
        f"   (Mint ₩{mint/1e6:.1f}M - Burn ₩{burn/1e6:.1f}M)",
        "",
        f"🌡️ 엔트로피: {entropy:.1%}",
        "",
        f"🏆 최적 팀: {', '.join(team.get('team', []))}",
        f"   점수: {team.get('score', 0):.2f}",
        "",
        "👤 역할:",
    ]
    
    for r in roles:
        role_str = r.get("primary_role", "")
        if r.get("secondary_role"):
            role_str += f" + {r['secondary_role']}"
        lines.append(f"   {r['person_id']}: {role_str}")
    
    lines.extend(["", "=" * 50])
    
    return "\n".join(lines)






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
📊 AUTUS KPI Dashboard

핵심 지표 추적 및 시각화
"""

from typing import Dict, List, Optional
from datetime import datetime
import json
import os


class KPITracker:
    """KPI 추적기"""
    
    def __init__(self, data_dir: str = "data/output"):
        self.data_dir = data_dir
        self.history: List[Dict] = []
    
    def record(self, kpi: Dict, week_id: str = None) -> None:
        """KPI 기록"""
        if week_id is None:
            week_id = datetime.now().strftime("%Y-W%V")
        
        record = {
            "week_id": week_id,
            "timestamp": datetime.now().isoformat(),
            **kpi
        }
        
        self.history.append(record)
        
        # 파일 저장
        path = os.path.join(self.data_dir, "kpi_history.jsonl")
        os.makedirs(self.data_dir, exist_ok=True)
        
        with open(path, "a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
    
    def get_trend(self, metric: str, weeks: int = 4) -> List[Dict]:
        """지표 트렌드 조회"""
        recent = self.history[-weeks:] if len(self.history) >= weeks else self.history
        
        return [
            {"week_id": r["week_id"], "value": r.get(metric, 0)}
            for r in recent
        ]
    
    def get_alerts(self, kpi: Dict) -> List[Dict]:
        """경고 생성"""
        alerts = []
        
        # 엔트로피 체크
        entropy = kpi.get("entropy_ratio", 0)
        if entropy >= 0.30:
            alerts.append({
                "level": "CRITICAL",
                "metric": "entropy",
                "message": f"엔트로피 위험 수준 ({entropy:.1%})",
                "action": "즉각 개입 필요"
            })
        elif entropy >= 0.25:
            alerts.append({
                "level": "WARNING",
                "metric": "entropy",
                "message": f"엔트로피 경고 수준 ({entropy:.1%})",
                "action": "모니터링 강화"
            })
        
        # 속도 변화 체크
        vel_change = kpi.get("velocity_change", 0)
        if vel_change < -0.2:
            alerts.append({
                "level": "CRITICAL",
                "metric": "velocity",
                "message": f"생산성 급감 ({vel_change:+.1%})",
                "action": "원인 분석 필요"
            })
        elif vel_change < -0.1:
            alerts.append({
                "level": "WARNING",
                "metric": "velocity",
                "message": f"생산성 하락 ({vel_change:+.1%})",
                "action": "주의 필요"
            })
        
        return alerts


def generate_weekly_summary(kpi: Dict, team: Dict, roles: List[Dict]) -> str:
    """주간 요약 생성"""
    mint = kpi.get("mint_krw", 0)
    burn = kpi.get("burn_krw", 0)
    net = kpi.get("net_krw", 0)
    entropy = kpi.get("entropy_ratio", 0)
    
    lines = [
        "=" * 50,
        "📊 AUTUS 주간 요약",
        "=" * 50,
        "",
        f"💰 순수익: ₩{net/1e6:.1f}M",
        f"   (Mint ₩{mint/1e6:.1f}M - Burn ₩{burn/1e6:.1f}M)",
        "",
        f"🌡️ 엔트로피: {entropy:.1%}",
        "",
        f"🏆 최적 팀: {', '.join(team.get('team', []))}",
        f"   점수: {team.get('score', 0):.2f}",
        "",
        "👤 역할:",
    ]
    
    for r in roles:
        role_str = r.get("primary_role", "")
        if r.get("secondary_role"):
            role_str += f" + {r['secondary_role']}"
        lines.append(f"   {r['person_id']}: {role_str}")
    
    lines.extend(["", "=" * 50])
    
    return "\n".join(lines)






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
📊 AUTUS KPI Dashboard

핵심 지표 추적 및 시각화
"""

from typing import Dict, List, Optional
from datetime import datetime
import json
import os


class KPITracker:
    """KPI 추적기"""
    
    def __init__(self, data_dir: str = "data/output"):
        self.data_dir = data_dir
        self.history: List[Dict] = []
    
    def record(self, kpi: Dict, week_id: str = None) -> None:
        """KPI 기록"""
        if week_id is None:
            week_id = datetime.now().strftime("%Y-W%V")
        
        record = {
            "week_id": week_id,
            "timestamp": datetime.now().isoformat(),
            **kpi
        }
        
        self.history.append(record)
        
        # 파일 저장
        path = os.path.join(self.data_dir, "kpi_history.jsonl")
        os.makedirs(self.data_dir, exist_ok=True)
        
        with open(path, "a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
    
    def get_trend(self, metric: str, weeks: int = 4) -> List[Dict]:
        """지표 트렌드 조회"""
        recent = self.history[-weeks:] if len(self.history) >= weeks else self.history
        
        return [
            {"week_id": r["week_id"], "value": r.get(metric, 0)}
            for r in recent
        ]
    
    def get_alerts(self, kpi: Dict) -> List[Dict]:
        """경고 생성"""
        alerts = []
        
        # 엔트로피 체크
        entropy = kpi.get("entropy_ratio", 0)
        if entropy >= 0.30:
            alerts.append({
                "level": "CRITICAL",
                "metric": "entropy",
                "message": f"엔트로피 위험 수준 ({entropy:.1%})",
                "action": "즉각 개입 필요"
            })
        elif entropy >= 0.25:
            alerts.append({
                "level": "WARNING",
                "metric": "entropy",
                "message": f"엔트로피 경고 수준 ({entropy:.1%})",
                "action": "모니터링 강화"
            })
        
        # 속도 변화 체크
        vel_change = kpi.get("velocity_change", 0)
        if vel_change < -0.2:
            alerts.append({
                "level": "CRITICAL",
                "metric": "velocity",
                "message": f"생산성 급감 ({vel_change:+.1%})",
                "action": "원인 분석 필요"
            })
        elif vel_change < -0.1:
            alerts.append({
                "level": "WARNING",
                "metric": "velocity",
                "message": f"생산성 하락 ({vel_change:+.1%})",
                "action": "주의 필요"
            })
        
        return alerts


def generate_weekly_summary(kpi: Dict, team: Dict, roles: List[Dict]) -> str:
    """주간 요약 생성"""
    mint = kpi.get("mint_krw", 0)
    burn = kpi.get("burn_krw", 0)
    net = kpi.get("net_krw", 0)
    entropy = kpi.get("entropy_ratio", 0)
    
    lines = [
        "=" * 50,
        "📊 AUTUS 주간 요약",
        "=" * 50,
        "",
        f"💰 순수익: ₩{net/1e6:.1f}M",
        f"   (Mint ₩{mint/1e6:.1f}M - Burn ₩{burn/1e6:.1f}M)",
        "",
        f"🌡️ 엔트로피: {entropy:.1%}",
        "",
        f"🏆 최적 팀: {', '.join(team.get('team', []))}",
        f"   점수: {team.get('score', 0):.2f}",
        "",
        "👤 역할:",
    ]
    
    for r in roles:
        role_str = r.get("primary_role", "")
        if r.get("secondary_role"):
            role_str += f" + {r['secondary_role']}"
        lines.append(f"   {r['person_id']}: {role_str}")
    
    lines.extend(["", "=" * 50])
    
    return "\n".join(lines)





















