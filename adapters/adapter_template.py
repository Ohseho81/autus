"""
AUTUS 범용 어댑터 템플릿 (Python)
- 어떤 외부 프로그램/스크립트/서비스도 이 템플릿을 상속/구현하면 AUTUS 자동화 파이프라인에 연결 가능
"""
import subprocess
from typing import Any, Dict, Optional

class AutusAdapterBase:
    def run(self, command: str, args: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """명령 실행 및 결과/에러/상태 반환"""
        raise NotImplementedError
    def rollback(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """실패 시 롤백 동작"""
        raise NotImplementedError
    def status(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """실행 상태 조회"""
        raise NotImplementedError

class ShellAdapter(AutusAdapterBase):
    def run(self, command: str, args: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        try:
            result = subprocess.run(command, shell=True, capture_output=True, text=True)
            return {
                'success': result.returncode == 0,
                'output': result.stdout,
                'error': result.stderr,
                'returncode': result.returncode
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}
    def rollback(self, context: Dict[str, Any]) -> Dict[str, Any]:
        # 예시: 롤백 명령 실행
        rollback_cmd = context.get('rollback_cmd')
        if rollback_cmd:
            return self.run(rollback_cmd)
        return {'success': True, 'output': 'No rollback needed.'}
    def status(self, context: Dict[str, Any]) -> Dict[str, Any]:
        # 예시: 상태 확인 로직
        return {'status': 'unknown'}

# 신규 어댑터는 이 템플릿을 상속/구현하여 adapters/에 추가하면 됨
