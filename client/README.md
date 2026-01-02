# 🔮 AUTUS Bridge: Universal Edition

10개 매장 PC 화면을 OCR로 읽어 서버로 전송하는 **정식 업무 툴**입니다.

## 📋 기능

- **화면 OCR**: 매니저 프로그램(POS, LMS 등) 화면을 실시간 캡처
- **전화번호 감지**: 고객 전화번호 자동 인식
- **서버 연동**: 분석된 행동 지침(VIP/주의) 실시간 수신
- **업장 모드**: 학원/식당/스포츠 등 업종별 최적화 파싱

## 🛠️ 설치 (매니저 PC)

### 방법 1: 실행 파일 (권장)

1. `AUTUS_Bridge.exe`를 USB로 전달
2. 바탕화면에 복사 후 실행
3. 끝!

### 방법 2: Python 직접 실행

```bash
# 1. Python 설치 (3.8+)
# https://www.python.org/downloads/

# 2. 라이브러리 설치
pip install -r requirements.txt

# 3. Tesseract-OCR 설치
# Windows: https://github.com/UB-Mannheim/tesseract/wiki
# 기본 경로: C:\Program Files\Tesseract-OCR\tesseract.exe

# 4. 실행
python autus_bridge_universal.py
```

## 📐 초기 설정

### 1. 업장 선택
콤보박스에서 본인 업장 선택:
- `ACADEMY` - 학원
- `RESTAURANT` - 식당
- `SPORTS` - 스포츠센터

### 2. 좌표 설정
1. `📐 좌표 설정` 버튼 클릭
2. 안내에 따라 감시 영역의 좌상단 → 우하단 순서로 마우스 이동
3. 설정 자동 저장

### 3. 서버 URL 설정
1. `⚙️ 설정` 버튼 클릭
2. 서버 URL 입력 (예: `http://192.168.0.100:8000`)
3. 저장

## 🎯 감시 영역 가이드

### 학원 (ACADEMY)
- LMS 프로그램의 '학생 상세 정보' 창
- 학부모 상담 화면
- 성적 조회 화면

### 식당 (RESTAURANT)
- POS기의 '포인트 적립' 팝업
- 영수증 조회 화면
- 테이블 현황 화면

### 스포츠 (SPORTS)
- 회원관리 프로그램의 '회원 조회' 창
- 락커 현황 화면
- 출석 체크 화면

## 📊 상태 표시

- 🟢 **SYSTEM READY**: 정상 작동
- 🟡 **데이터 분석 중...**: 서버 전송 중
- 🔵 **VIP 메시지**: VIP 고객 감지
- 🔴 **주의 메시지**: 주의 고객 감지

## 🔧 문제 해결

### "서버 연결 끊김"
- 서버 URL 확인
- 네트워크 연결 확인
- 방화벽 설정 확인

### "전화번호 없음"
- 감시 영역 재설정
- OCR 영역에 고객 정보 화면이 보이는지 확인

### OCR 인식률 낮음
- 화면 해상도 확인
- 감시 영역 크기 조정
- Tesseract 한글 데이터 설치 확인

## 📦 EXE 빌드 방법

```bash
# PyInstaller 설치
pip install pyinstaller

# 빌드
python build_exe.py

# 또는 직접 실행
pyinstaller --onefile --noconsole --name="AUTUS_Bridge" autus_bridge_universal.py

# 출력: dist/AUTUS_Bridge.exe
```

## 📁 파일 구조

```
client/
├── autus_bridge_universal.py   # 메인 프로그램
├── calibrator.py               # 좌표 설정 도구
├── build_exe.py                # EXE 빌드 스크립트
├── requirements.txt            # 의존성 목록
└── README.md                   # 이 문서
```

## 📞 지원

문제 발생 시 본사 IT팀에 문의하세요.
