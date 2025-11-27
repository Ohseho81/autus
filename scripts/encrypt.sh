#!/bin/bash
# 파일 암호화 스크립트 (openssl 사용)
FILE=$1
PASS=$2
if [ -z "$FILE" ] || [ -z "$PASS" ]; then
  echo "사용법: encrypt.sh <파일> <비밀번호>"
  exit 1
fi
openssl enc -aes-256-cbc -salt -in "$FILE" -out "$FILE.enc" -k "$PASS"
echo "암호화 완료: $FILE.enc"