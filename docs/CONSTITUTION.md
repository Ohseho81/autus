# AUTUS CONSTITUTION v1.0 (IMMUTABLE)

## 불변 원칙

1. **원본 미저장** - Raw data는 절대 저장하지 않는다
2. **Read-only 접근** - 외부 데이터는 읽기만 한다
3. **Shadow만 저장** - 비가역 변환된 벡터만 저장한다
4. **Contract 불변** - Atlas Envelope 구조는 변경 불가
5. **Secret 격리** - TLF 커널은 완전 격리 실행

## 금지 사항

- ❌ 예측
- ❌ 추천
- ❌ 자동 실행
- ❌ Raw 저장
- ❌ 역변환

## 허용 사항

- ✅ 관측
- ✅ 상태 계산
- ✅ 차단 (반사)
- ✅ Shadow 저장
- ✅ Audit 기록

이 헌법을 위반하는 코드는 AUTUS가 아니다.
