# 결제선생 API 키 발급 가이드

## 📋 목적
ATB 앱에서 결제선생 청구서 발송 기능을 활성화하기 위한 API 키 발급 가이드

---

## 🔐 계정 정보
- **웹사이트**: https://www.payssam.kr
- **아이디**: atbasket@naver.com
- **비밀번호**: atb053511!@

---

## 📝 발급 절차

### 1️⃣ 로그인
1. https://www.payssam.kr 접속
2. 우측 상단 **[로그인]** 클릭
3. 아이디/비밀번호 입력

### 2️⃣ API 관리 페이지 이동
로그인 후 다음 경로로 이동:
```
[설정] → [API 관리] 또는 [개발자 센터]
```

또는 직접 URL:
```
https://www.payssam.kr/settings/api
```

### 3️⃣ API 키 발급

#### 필요한 키 3개

| 키 이름 | 용도 | 환경 변수명 |
|---------|------|------------|
| **PAYMENT API 키** | 청구서 발송 | `EXPO_PUBLIC_PAYSSAM_API_KEY_PAYMENT` |
| **SEARCH API 키** | 수납 상태 조회 | `EXPO_PUBLIC_PAYSSAM_API_KEY_SEARCH` |
| **파트너 ID** | 계정 식별 | `EXPO_PUBLIC_PAYSSAM_PARTNER_ID` |

#### 발급 방법
1. **[API 키 발급]** 버튼 클릭
2. 키 종류 선택:
   - **PAYMENT**: 청구서 발송, 취소
   - **SEARCH**: 조회 전용
3. **[생성]** 클릭
4. 생성된 키를 **복사** (다시 볼 수 없으니 주의!)

### 4️⃣ 파트너 ID 확인
- API 관리 페이지 상단에 표시됨
- 형식: `PARTNER-XXXX-XXXX` 또는 숫자

---

## 🔑 발급받은 키 예시

```bash
# PAYMENT API 키
PLKEY-xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# SEARCH API 키
SLKEY-xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 파트너 ID
PARTNER-1234-5678
```

---

## ⚠️ 주의사항

1. **API 키는 절대 외부 공유 금지**
2. **PAYMENT 키는 결제 권한**이 있으므로 특히 주의
3. 키 유출 시 즉시 재발급 필요
4. 키는 한 번만 표시되므로 **반드시 안전한 곳에 보관**

---

## 📄 다음 단계

API 키 발급 완료 후:
1. `.env` 파일에 키 추가 (아래 템플릿 참고)
2. Vercel/Railway 환경 변수 설정
3. 앱 재배포
4. 테스트 청구서 발송

---

## 📧 문의

결제선생 고객센터:
- 이메일: support@payssam.kr
- 전화: 1588-XXXX (웹사이트 하단 확인)
- 카카오톡: 결제선생 고객센터

---

*작성일: 2026-02-13*
*작성자: Claude (AUTUS Project)*
