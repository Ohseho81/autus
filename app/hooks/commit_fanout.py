from fastapi import BackgroundTasks
from core.autus.dean.guard import safe_call

def fanout_after_commit(bg: BackgroundTasks, payload: dict):
    """Commit 후 비동기 작업 (Core 영향 없음)"""
    bg.add_task(run_learning_safe, payload)
    bg.add_task(update_pattern_safe, payload)

def run_learning_safe(payload: dict):
    """Hassabis Learning (비동기, 실패해도 무시)"""
    try:
        # TODO: Hassabis compute 연결
        pass
    except Exception:
        pass

def update_pattern_safe(payload: dict):
    """Pattern Memory 업데이트 (비동기, 실패해도 무시)"""
    try:
        # TODO: Pattern store 연결
        pass
    except Exception:
        pass
