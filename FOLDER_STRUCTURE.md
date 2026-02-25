# AUTUS 폴더 구조

> 2026-02 정리 기준

## 루트

| 폴더/파일 | 용도 |
|----------|------|
| backend/ | FastAPI 백엔드 |
| frontend/ | React/Next 웹 |
| vercel-api/ | Next.js API + 온리쌤 대시보드 (kraton 통합) |
| vercel-api/ | Next.js API (autus-ai.com) |
| mobile-app/ | Expo/React Native (온리쌤 앱) |
| moltbot-brain/ | 몰트봇 AI |
| moltbot-bridge/ | 몰트봇 브릿지 |
| docs/ | 문서 (spec/setup/api/_ref/_archive) |
| scripts/ | 유틸 (upload/setup/deploy/sql) |
| supabase/ | DB 마이그레이션 |
| tests/ | pytest |
| _local_data/ | PII·로컬 데이터 (csv, json) — gitignore |

## 핵심 명령어

```bash
cd /Users/oseho/Desktop/autus
make dev                              # 백엔드
cd vercel-api && npm run dev
cd vercel-api && npm run dev
cd mobile-app && npx expo start

# 학생 업로드
python3 scripts/upload/upload_students.py
```
