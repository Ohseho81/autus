# AUTUS UI — 3 Pages Router (LOCK)

> **AUTUS UI는 페이지 이동이 아니라 상태 전이만 존재한다.**
> **URL은 결과일 뿐, 선택지가 아니다.**

## 🎯 URL 구조 (고정)

```
/solar      → 상태 확인 (진입점)
/action     → 결정 실행 (1회)
/audit      → 기록 확인 (terminal, 탈출 불가)
```

## 📁 파일 구조

```
ui/
├── app/
│   ├── layout.tsx          # 전역 레이아웃 + History Lock
│   ├── page.tsx            # / → /solar 리다이렉트
│   ├── solar/
│   │   └── page.tsx        # SOLAR 페이지
│   ├── action/
│   │   └── page.tsx        # ACTION 페이지
│   ├── audit/
│   │   └── page.tsx        # AUDIT 페이지 (terminal)
│   ├── providers/
│   │   └── StateProvider.tsx
│   └── lib/
│       ├── navigation.ts   # 네비게이션 규칙
│       └── api.ts          # API 클라이언트
├── package.json
├── tsconfig.json
├── next.config.js
└── README.md
```

## 🚀 실행 방법

```bash
# 의존성 설치
cd ui
npm install

# 개발 서버
npm run dev

# 빌드
npm run build

# 프로덕션
npm run start
```

## 🔒 보안 규칙

### History Lock
- 모든 페이지에서 뒤로가기 차단
- `/audit`에서는 완전 잠금

### URL 직접 접근 차단
- 유효하지 않은 URL → `/solar`로 리다이렉트
- 조건 미충족 시 자동 리다이렉트

### 상태 기반 전이
```
/solar → /action  : risk >= 60 && gate !== 'RED'
/action → /audit  : auditId !== null
/audit → (없음)   : terminal (탈출 불가)
```

## ✅ 체크리스트

```
□ layout.tsx — History Lock
□ StateProvider — 상태 관리
□ /solar — 진입점
□ /action — 단일 클릭
□ /audit — Terminal
□ 뒤로가기 차단
□ URL 직접 접근 차단
□ 자동 전이 작동
```

## 📌 핵심 문장

> **"이 UI는 SaaS가 아니다.**
> **설명하면 실패다.**
> **침묵하면 성공이다."**
