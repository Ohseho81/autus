#!/bin/bash
# AUTUS 전체 프로젝트 스냅샷(백업) 스크립트
# 1. 현재 시점 전체 프로젝트를 tar.gz로 백업
# 2. git 커밋 해시/날짜 포함

SNAPSHOT_DIR="./snapshots"
DATE=$(date '+%Y-%m-%d_%H-%M-%S')
GIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "nogit")
SNAPSHOT_FILE="$SNAPSHOT_DIR/autus_snapshot_${DATE}_${GIT_HASH}.tar.gz"

mkdir -p "$SNAPSHOT_DIR"

tar --exclude='./.venv' --exclude='./snapshots' --exclude='./__pycache__' --exclude='./.git' -czf "$SNAPSHOT_FILE" .

echo "[스냅샷 생성 완료] $SNAPSHOT_FILE"
