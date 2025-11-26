#!/bin/bash
# AUTUS 롤백(restore) 스크립트
# 1. snapshots/에서 tar.gz 스냅샷 선택
# 2. 현재 프로젝트 디렉토리에 복원(덮어쓰기)

SNAPSHOT_DIR="./snapshots"
LATEST_SNAPSHOT=$(ls -t $SNAPSHOT_DIR/autus_snapshot_*.tar.gz 2>/dev/null | head -1)

if [ -z "$LATEST_SNAPSHOT" ]; then
  echo "[ERROR] 복원할 스냅샷이 없습니다."
  exit 1
fi

echo "[롤백] $LATEST_SNAPSHOT → 현재 디렉토리 복원"
tar --exclude='./.venv' --exclude='./snapshots' --exclude='./__pycache__' --exclude='./.git' -xzf "$LATEST_SNAPSHOT" -C .

echo "[롤백 완료] $LATEST_SNAPSHOT"
