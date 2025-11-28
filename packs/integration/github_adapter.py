"""
GitHub Actions/이슈/PR 연동 어댑터 예시 (Python)
- GitHub REST API를 통한 자동화/상태조회/이벤트 트리거/피드백
"""
import requests
from typing import Any, Dict, Optional
from .adapter_template import AutusAdapterBase

GITHUB_API = "https://api.github.com"

class GitHubAdapter(AutusAdapterBase):
    def run(self, command: str, args: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        # 예시: 워크플로우 트리거, 이슈 생성 등
        try:
            token = args.get('token')
            repo = args.get('repo')
            event = args.get('event', 'workflow_dispatch')
            workflow = args.get('workflow')
            ref = args.get('ref', 'main')
            url = f"{GITHUB_API}/repos/{repo}/actions/workflows/{workflow}/dispatches"
            headers = {'Authorization': f'token {token}', 'Accept': 'application/vnd.github+json'}
            payload = {'ref': ref}
            resp = requests.post(url, json=payload, headers=headers, timeout=10)
            return {'success': resp.status_code in (200,201,204), 'output': resp.text, 'status_code': resp.status_code}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    def rollback(self, context: Dict[str, Any]) -> Dict[str, Any]:
        # 예시: 이슈/PR/워크플로우 취소 등 (실제 구현 필요)
        return {'success': True, 'output': 'GitHub 롤백은 수동 처리 필요'}
    def status(self, context: Dict[str, Any]) -> Dict[str, Any]:
        # 예시: 워크플로우/이슈/PR 상태 조회
        try:
            token = context.get('token')
            repo = context.get('repo')
            url = f"{GITHUB_API}/repos/{repo}/actions/runs"
            headers = {'Authorization': f'token {token}', 'Accept': 'application/vnd.github+json'}
            resp = requests.get(url, headers=headers, timeout=10)
            return {'status': resp.text, 'status_code': resp.status_code}
        except Exception as e:
            return {'status': 'error', 'error': str(e)}
