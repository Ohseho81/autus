# iPad 스크린샷 촬영 가이드

## 📱 필요한 디바이스
- iPad Air 11-inch (M3) 또는 유사 모델
- iOS 최신 버전

---

## 🎯 촬영해야 할 화면 (5-6개)

### 1. 관리자 모니터 화면 (Admin Monitor)
**경로**: 로그인 → Admin 계정 → Monitor 탭
**보여줄 내용**:
- 상담 현황 카드
- 스케줄 현황 카드
- 수납 현황 카드
- 실시간 알림

### 2. 스케줄 화면 (Schedule View)
**경로**: 로그인 → Admin 계정 → Schedule 탭
**보여줄 내용**:
- 주간 캘린더 뷰
- 일정 리스트
- 상담/수업 세션 카드

### 3. 출석 체크 화면 (Attendance)
**경로**: 로그인 → Coach 계정 → CoachHome → 출석 체크
**보여줄 내용**:
- QR 스캔 인터페이스
- 출석 리스트
- 학생/내담자 정보

### 4. 회원 관리 화면 (Entity List)
**경로**: 로그인 → Admin 계정 → Entities 탭
**보여줄 내용**:
- 학생/내담자 리스트
- 검색/필터 기능
- 상태 배지

### 5. 대시보드 화면 (Dashboard)
**경로**: 로그인 → Admin 계정 → Dashboard 탭
**보여줄 내용**:
- Outcome 차트
- V-Index 그래프
- 성장률 분석

### 6. (Optional) 학부모 셀프서비스 화면
**경로**: 로그인 → Consumer 계정 → SelfService
**보여줄 내용**:
- 자녀 현황
- 예약 기능
- 결제 내역

---

## 📸 스크린샷 촬영 방법

### iPad에서 스크린샷 찍기
1. **Top 버튼 + Volume Up 버튼** 동시 누르기
2. 또는 **Apple Pencil**로 화면 모서리에서 대각선으로 스와이프

### 사이즈 요구사항
- **iPad Air 11-inch (M3)**: 2360 x 1640 pixels (landscape) 또는 1640 x 2360 pixels (portrait)
- **파일 형식**: PNG 또는 JPG
- **최대 용량**: 각 5MB 이하

---

## ⚙️ 촬영 전 준비

### 1. TestFlight에서 ATB 앱 설치
```
Production Build 완료 후 → TestFlight 링크 받기 →
iPad에서 TestFlight 앱 열기 → ATB 설치
```

### 2. 테스트 데이터 준비
- Admin 계정 로그인 정보
- Coach 계정 로그인 정보
- Consumer 계정 로그인 정보
- 샘플 학생/내담자 데이터
- 샘플 스케줄 데이터

### 3. 화면 클린업
- 알림 끄기 (방해금지 모드)
- Wi-Fi 아이콘 등 시스템 UI 최소화
- 앱 내 데모 데이터로 채우기

---

## 📤 App Store Connect 업로드

### 1. App Store Connect 접속
```
App Store Connect → My Apps → ATB →
App Store 탭 → Media Manager
```

### 2. iPad 스크린샷 섹션 찾기
```
"View All Sizes in Media Manager" 클릭 →
iPad Pro (6th Gen) 13-inch 또는 iPad Air 11-inch 선택
```

### 3. 스크린샷 업로드
- 6개 스크린샷을 순서대로 드래그 앤 드롭
- 각 스크린샷에 간단한 캡션 추가 (Optional)

### 4. 순서 조정
App Store에 표시될 순서:
1. Admin Monitor (메인 기능)
2. Schedule View (스케줄 관리)
3. Attendance (출석 체크)
4. Dashboard (분석)
5. Entity List (회원 관리)
6. Consumer SelfService (학부모 뷰)

---

## ✅ 체크리스트

촬영 전:
- [ ] iPad Air 준비
- [ ] TestFlight에서 ATB 설치
- [ ] 테스트 계정 로그인 확인
- [ ] 샘플 데이터 입력

촬영 중:
- [ ] 5-6개 주요 화면 캡처
- [ ] 각 화면이 iPad 네이티브로 보이는지 확인
- [ ] iPhone 프레임 없는지 재확인

촬영 후:
- [ ] 파일 사이즈 확인 (각 5MB 이하)
- [ ] 해상도 확인 (2360x1640 또는 1640x2360)
- [ ] App Store Connect 업로드
- [ ] 순서 조정

---

## 🚨 주의사항

❌ **하지 말아야 할 것**:
- iPhone 화면을 iPad 프레임에 넣기
- 시뮬레이터 스크린샷 사용
- 실제 사용자 개인정보 노출
- 저해상도 이미지 업로드

✅ **해야 할 것**:
- 실제 iPad 디바이스 사용
- 데모 데이터로 채우기
- 고해상도 유지
- 앱의 핵심 기능 강조

---

## 🎯 예상 소요 시간

- TestFlight 설치: 5분
- 테스트 데이터 준비: 10분
- 스크린샷 촬영: 15분
- 업로드 및 정리: 10분

**총 예상 시간**: 약 40분

---

## 📞 문제 발생 시

- TestFlight 링크가 안 오면: EAS Build 상태 확인
- 앱 설치 안 되면: Bundle ID 확인 (com.allthatbasket.atb)
- 화면이 이상하면: iPad 방향 (가로/세로) 확인

---

**완료 후**: App Store Connect에서 "Save" 클릭 → 심사팀에 업데이트 알림
