# AUTUS 완전 자동 배포 설정

이 가이드를 따라 1회 설정하면, 이후로는 **git push만 하면 자동 배포**됩니다.

---

## 🎯 최종 목표

```
git push  →  GitHub Actions  →  Netlify + Render 자동 배포
```

---

## 📋 1회 설정 (10분)

### Step 1: Netlify 설정

1. **Netlify 접속**: https://app.netlify.com
2. **Site Settings** → **Build & deploy** → **Continuous deployment**
3. **Link to Git provider** → GitHub 선택 → `Ohseho81/autus` 연결
4. **Build settings**:
   - Base directory: `frontend/deploy`
   - Build command: (비워두기)
   - Publish directory: `frontend/deploy`
5. **Deploy site** 클릭

### Step 2: Netlify Token 가져오기

1. **User settings** → **Applications** → **Personal access tokens**
2. **New access token** → 이름: `AUTUS-Deploy`
3. **Generate** → 토큰 복사

### Step 3: Render 설정

1. **Render 접속**: https://dashboard.render.com
2. **New** → **Web Service** → GitHub 연결
3. **Settings**:
   - Name: `autus-api`
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. **Create Web Service**

### Step 4: Render Deploy Hook 가져오기

1. Render 서비스 선택 → **Settings**
2. **Deploy Hook** → **Create Deploy Hook**
3. URL 복사 (예: `https://api.render.com/deploy/xxx`)

### Step 5: GitHub Secrets 등록

1. GitHub 레포 → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret** 클릭하여 아래 4개 등록:

| Secret Name | 값 |
|-------------|-----|
| `NETLIFY_AUTH_TOKEN` | Netlify Personal Access Token |
| `NETLIFY_SITE_ID` | `0a4bcfab-268e-4066-8687-2f5d28ba3435` |
| `RENDER_DEPLOY_HOOK_URL` | Render Deploy Hook URL |
| `SLACK_WEBHOOK_URL` | (선택) Slack Incoming Webhook |

---

## ✅ 설정 완료 후

### 자동 배포 테스트

```bash
# 아무 파일이나 수정 후
git add .
git commit -m "test: auto deploy"
git push
```

### 확인

1. GitHub → **Actions** 탭에서 워크플로우 실행 확인
2. 2-3분 후 https://autus-ai.com 에서 변경사항 확인

---

## 🔄 배포 흐름

```
┌─────────────┐
│  git push   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│         GitHub Actions                   │
│  ┌─────────────┐  ┌─────────────────┐   │
│  │  Frontend   │  │    Backend      │   │
│  │  → Netlify  │  │    → Render     │   │
│  └─────────────┘  └─────────────────┘   │
└─────────────────────────────────────────┘
       │                    │
       ▼                    ▼
┌─────────────┐    ┌─────────────────┐
│autus-ai.com │    │ api.autus-ai.com│
└─────────────┘    └─────────────────┘
```

---

## 🚨 문제 해결

### 배포 실패 시

1. GitHub → Actions → 실패한 워크플로우 클릭
2. 로그 확인
3. Secrets가 올바르게 설정되었는지 확인

### Netlify 배포 실패

- `NETLIFY_AUTH_TOKEN`이 만료되었는지 확인
- `NETLIFY_SITE_ID`가 올바른지 확인

### Render 배포 실패

- `RENDER_DEPLOY_HOOK_URL`이 올바른지 확인
- Render 대시보드에서 로그 확인

---

## 🎉 완료!

이제 코드 수정 → git push만 하면 자동으로 배포됩니다!
