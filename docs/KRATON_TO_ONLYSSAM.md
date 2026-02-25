# kraton-v2 → 온리쌤 전달 완료

> 2026-02 정리

## 전달 현황

| kraton 기능 | 온리쌤 위치 | 비고 |
|------------|------------|------|
| statsAPI.getDashboard | frontend/src/services/onlyssam.ts | getDashboardStats |
| attendanceAPI | mobile-app api.ts | getAttendanceAtb, recordAttendanceAtb |
| studentAPI | mobile-app api.ts | getStudentsAtb |
| classAPI | mobile-app api.ts | getClasses (atb_classes) |
| 원장 대시보드 UI | vercel-api app/page.tsx | 온리쌤 Tesla Grade BI |

## 배포 변경

- **이전**: vercel /* → kraton-v2 (Vite SPA)
- **이후**: vercel /* → vercel-api (Next.js)

vercel-api app/page.tsx가 온리쌤 메인 대시보드를 제공합니다.
