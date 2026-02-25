# 🔐 AUTUS GitHub Secrets 설정 가이드

이 문서는 CI/CD 파이프라인 실행에 필요한 GitHub Secrets 설정 방법을 설명합니다.

---

## 📋 필수 Secrets 목록

### 🚀 배포용 (Railway)

| Secret Name | 설명 | 얻는 방법 |
|-------------|------|----------|
| `RAILWAY_TOKEN` | Railway API 토큰 | Railway 대시보드 → Settings → Tokens |

### 🌐 프론트엔드 배포용 (Vercel) - 선택

| Secret Name | 설명 | 얻는 방법 |
|-------------|------|----------|
| `VERCEL_TOKEN` | Vercel API 토큰 | Vercel → Settings → Tokens |
| `VERCEL_ORG_ID` | 조직 ID | `.vercel/project.json` 또는 대시보드 |
| `VERCEL_PROJECT_ID` | 프로젝트 ID | `.vercel/project.json` 또는 대시보드 |

### 💳 결제 연동용 - 선택

| Secret Name | 설명 | 얻는 방법 |
|-------------|------|----------|
| `STRIPE_API_KEY` | Stripe 시크릿 키 | Stripe Dashboard → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | 웹훅 시크릿 | Stripe Dashboard → Webhooks |
| `TOSS_SECRET_KEY` | 토스 시크릿 키 | 토스페이먼츠 개발자센터 |

---

## 🛠️ 설정 방법

### 1. GitHub Repository Settings 접속

```
GitHub Repository → Settings → Secrets and variables → Actions
```

### 2. New repository secret 클릭

### 3. 각 Secret 추가

---

## 🚂 Railway Token 발급 방법

1. [Railway 대시보드](https://railway.app/account/tokens) 접속
2. **Generate Token** 클릭
3. 이름 입력: `AUTUS-CICD`
4. 토큰 복사
5. GitHub Secrets에 `RAILWAY_TOKEN`으로 등록

---

## ✅ 설정 확인

모든 Secrets가 등록되면 GitHub Actions가 자동으로 실행됩니다.

```bash
# 로컬에서 확인
gh secret list
```

---

## 🔒 보안 주의사항

1. **절대로** Secrets를 코드에 하드코딩하지 마세요
2. `.env` 파일은 `.gitignore`에 포함되어 있는지 확인
3. Secrets는 주기적으로 로테이션 권장
4. 프로덕션 키와 테스트 키 구분

---

## 📊 최소 요구 Secrets (즉시 배포용)

**Railway 배포만 원할 경우:**
```
RAILWAY_TOKEN  ← 이것만 있으면 배포 가능!
```

**전체 CI/CD:**
```
RAILWAY_TOKEN
VERCEL_TOKEN (선택)
```

---

## 🚀 배포 실행

Secrets 설정 후:

```bash
# 방법 1: main 브랜치에 push
git push origin main

# 방법 2: 수동 트리거
GitHub → Actions → Deploy → Run workflow
```

---

*마지막 업데이트: 2026-01-04*

