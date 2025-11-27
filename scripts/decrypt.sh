#!/bin/bash
# 파일 복호화 스크립트 (openssl 사용)
FILE=$1
PASS=$2
if [ -z "$FILE" ] || [ -z "$PASS" ]; then
  echo "사용법: decrypt.sh <암호화파일> <비밀번호>"
  exit 1
fi
openssl enc -d -aes-256-cbc -in "$FILE" -out "${FILE%.enc}" -k "$PASS"
echo "복호화 완료: ${FILE%.enc}"