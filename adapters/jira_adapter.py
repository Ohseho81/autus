"""
Jira 이슈/프로젝트 연동 어댑터 예시 (Python)
- Jira REST API를 통한 이슈 생성/조회/상태변경/프로젝트 자동화
"""
import requests
from typing import Any, Dict, Optional
from .adapter_template import AutusAdapterBase

class JiraAdapter(AutusAdapterBase):
    def run(self, command: str, args: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        # 예시: 이슈 생성
        try:
            url = args.get('url')
            auth = (args.get('user'), args.get('token'))
            payload = args.get('payload', {})
            resp = requests.post(url, json=payload, auth=auth, timeout=10)
            return {'success': resp.status_code in (200,201), 'output': resp.text, 'status_code': resp.status_code}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    def rollback(self, context: Dict[str, Any]) -> Dict[str, Any]:
        # 예시: 이슈 삭제
        try:
            url = context.get('delete_url')
            auth = (context.get('user'), context.get('token'))
            resp = requests.delete(url, auth=auth, timeout=10)
            return {'success': resp.status_code in (200,204), 'output': resp.text, 'status_code': resp.status_code}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    def status(self, context: Dict[str, Any]) -> Dict[str, Any]:
        # 예시: 이슈 상태 조회
        try:
            url = context.get('status_url')
            auth = (context.get('user'), context.get('token'))
            resp = requests.get(url, auth=auth, timeout=10)
            return {'status': resp.text, 'status_code': resp.status_code}
        except Exception as e:
            return {'status': 'error', 'error': str(e)}
