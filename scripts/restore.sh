#!/bin/bash
# AUTUS 데이터 복구 스크립트
BACKUP_FILE=$1
if [ -z "$BACKUP_FILE" ]; then
  echo "복구할 백업 파일을 지정하세요."
  exit 1
fi
tar xzf "$BACKUP_FILE" -C ./
echo "복구 완료: $BACKUP_FILE"