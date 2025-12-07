# 🎯 AUTUS v4.8 성능 분석 - 빠른 시작 가이드

## ⚡ 3가지 성능 분석 도구 통합 실행

이 가이드는 다음 3가지 액션을 통합합니다:
- **[M1]** 성능 대시보드 → 실시간 추적
- **[T2]** 캐시 검증 → 80% 목표 확인  
- **[D1]** 프로파일링 → 병목 특정

---

## 🚀 방법 1: VS Code 내장 (추천)

### 빠른 실행
1. **Ctrl+Shift+P** (명령 팔레트 열기)
2. **"Tasks: Run Task"** 입력
3. 원하는 작업 선택:

| 옵션 | 설명 | 소요시간 |
|-----|-----|--------|
| 🔵 **전체 성능 분석** | [M1+T2+D1] 모두 | 2-3분 |
| 🎯 **성능 대시보드** | [M1] 실시간 추적 | 지속 |
| 💾 **캐시 검증** | [T2] 80% 확인 | 1분 |
| ⚡ **프로파일링** | [D1] 병목 분석 | 1분 |

### VS Code Tasks 메뉴에서 직접 선택
```
Ctrl+Shift+P → Tasks: Run Task → 원하는 작업 선택
```

---

## 🚀 방법 2: 커맨드라인

### 기본 설치
```bash
# httpx 패키지 설치
pip install httpx

# (선택) cProfile 필요시 (Python 기본 포함)
```

### 전체 실행
```bash
python3 performance_dashboard.py --all
```

### 개별 실행

#### [M1] 실시간 성능 추적 (10분)
```bash
python3 performance_dashboard.py --dashboard --duration=600
```

#### [T2] 캐시 검증 (80% 확인)
```bash
python3 performance_dashboard.py --cache
```

#### [D1] 병목 프로파일링
```bash
python3 performance_dashboard.py --profile
```

---

## 🚀 방법 3: 빠른 한 줄 명령

### 실시간 대시보드 (30초 갱신)
```bash
while true; do clear; curl -s http://localhost:8000/monitoring/performance/dashboard | jq '.'; sleep 30; done
```

### 캐시 상태 모니터링 (10초 갱신)
```bash
while true; do clear; curl -s http://localhost:8000/cache/stats | jq '.'; sleep 10; done
```

### 요청 추적 모니터링 (10초 갱신)
```bash
while true; do clear; curl -s http://localhost:8000/monitoring/requests/summary | jq '.'; sleep 10; done
```

### 부하 테스트 (100 요청 벤치마크)
```bash
python3 -c "
import asyncio, httpx, time, statistics

async def benchmark():
    times = []
    async with httpx.AsyncClient() as client:
        for i in range(100):
            start = time.time()
            try:
                r = await client.get('http://localhost:8000/devices')
                times.append((time.time() - start) * 1000)
            except:
                pass
    times.sort()
    print(f'P50: {statistics.median(times):.2f}ms')
    print(f'P95: {times[int(len(times)*0.95)]:.2f}ms')
    print(f'P99: {times[int(len(times)*0.99)]:.2f}ms')
    print(f'Min: {min(times):.2f}ms, Max: {max(times):.2f}ms')

asyncio.run(benchmark())
"
```

---

## 📊 결과 해석

### [M1] 성능 대시보드 출력 예시

```
🎯 AUTUS v4.8 성능 대시보드
================================================================================
📊 전체 메트릭
  • 총 요청: 12,543
  • 평균 응답시간: 42.5ms
  • P95 응답시간: 85.2ms
  • P99 응답시간: 125.8ms
  • 캐시 히트율: 82.3%
  • 에러율: 0.12%

🔍 엔드포인트별 성능
  🟢 /devices
     └─ P95: 45.2ms | 에러: 0% | 캐시: 90%
  🟡 /analytics
     └─ P95: 120.5ms | 에러: 0.05% | 캐시: 70%
  🟢 /cache/stats
     └─ P95: 8.3ms | 에러: 0% | 캐시: 100%
```

**해석:**
- 🟢 = 우수 (P95 < 50ms)
- 🟡 = 양호 (P95 < 100ms)
- 🔴 = 개선 필요 (P95 > 200ms)

---

### [T2] 캐시 검증 결과 예시

```
💾 AUTUS v4.8 캐시 검증
================================================================================
🎯 목표 캐시 히트율: 80%

📊 현재 캐시 통계
  • 전체 요청: 5,234
  • 캐시 히트: 4,291
  • 캐시 미스: 943
  • 현재 히트율: 81.9%
  ✅ 목표 달성! (+1.9%)

🔍 엔드포인트별 캐시 성능
  ✅ /devices: 85.2%
  ✅ /analytics: 78.5%
  ✅ /config: 95.3%
  ✅ /cache/stats: 100%
```

**목표:**
- ✅ 80% 이상 = 목표 달성
- ⚠️ 70-80% = 개선 권장 (TTL 증가)
- 🔴 < 70% = 즉시 개선 필요

---

### [D1] 프로파일링 결과 예시

```
⚡ AUTUS v4.8 성능 프로파일링
================================================================================
🔍 성능 분석 (P95 기준 정렬)

1. /devices 🟢 EXCELLENT
   ├─ P95: 42.3ms
   ├─ Mean: 38.1ms
   ├─ Min/Max: 25.2ms / 65.4ms
   ├─ 성공: 50/50
   └─ StdDev: 8.5ms

2. /analytics 🟡 GOOD
   ├─ P95: 95.7ms
   ├─ Mean: 82.3ms
   ├─ Min/Max: 65.2ms / 180.4ms
   ├─ 성공: 50/50
   └─ StdDev: 22.1ms

🔴 병목 지점 분석
⚠️  /analytics
   → P95: 95.7ms (목표: 100ms)
   → DB 쿼리 최적화 또는 캐시 TTL 증가
```

**성능 등급:**
- 🟢 EXCELLENT: P95 < 50ms
- 🟡 GOOD: P95 < 100ms
- 🟠 ACCEPTABLE: P95 < 200ms
- 🔴 POOR: P95 > 200ms

---

## 💡 다음 단계

### 🔴 POOR (P95 > 200ms) 인 경우
1. [D1] 프로파일링으로 정확한 병목 확인
2. `api/cache.py`의 TTL 증가 고려
3. `evolved/database_optimizer.py`로 인덱스 확인
4. 배치 크기 최적화 검토

### 🟠 ACCEPTABLE (P95: 100-200ms) 인 경우
1. 캐시 설정 검토
2. 데이터베이스 쿼리 최적화
3. 배치 처리 성능 확인

### 🟡 GOOD (P95 < 100ms) 인 경우
1. 현재 설정 유지
2. 정기적 모니터링 (주 1회)
3. 트래픽 증가시 재분석

### 🟢 EXCELLENT (P95 < 50ms) 인 경우
✅ 성능 목표 달성!

---

## 📋 체크리스트

실행 전 확인 사항:

- [ ] main.py가 실행 중인가? (`http://localhost:8000` 접근 가능)
- [ ] Python 3.7+가 설치되어 있는가?
- [ ] httpx가 설치되어 있는가? (`pip install httpx`)
- [ ] jq가 설치되어 있는가? (한 줄 명령 사용시)

---

## 🆘 문제 해결

### "Connection refused" 오류
```bash
# 서버 시작 확인
curl http://localhost:8000/health

# 서버가 안 떠있으면 시작
python3 main.py
```

### "Module 'httpx' not found"
```bash
pip install httpx
```

### "jq: command not found"
```bash
# macOS
brew install jq

# Ubuntu/Debian
sudo apt-get install jq

# 또는 Python으로 대체
curl http://localhost:8000/cache/stats | python3 -m json.tool
```

### 느린 응답 (P95 > 200ms)
1. 데이터베이스 연결 확인
2. 캐시 상태 확인 (`/cache/stats`)
3. 요청 추적 확인 (`/monitoring/requests/summary`)
4. 메모리 사용량 확인 (`/monitoring/performance/dashboard`)

---

## 📞 참고 링크

- 📖 전체 액션 리스트: `VS_CODE_ACTION_LIST.md`
- 📊 API 참고: `curl http://localhost:8000/docs`
- 🔧 설정: `config/settings.py`
- 📝 문제 해결: `docs/TROUBLESHOOTING_GUIDE.md`

---

## ✅ 성공 사례

**목표:** 성능 기준선 설정 후 정기적 모니터링

**실행:**
```bash
# 주 1회 정기 성능 분석
python3 performance_dashboard.py --all

# 배포 후 성능 확인
python3 performance_dashboard.py --profile

# 트래픽 증가시 캐시 검증
python3 performance_dashboard.py --cache
```

**결과:**
- ✅ 성능 기준선 수립
- ✅ 병목 조기 감지
- ✅ 캐시 효율성 최적화
- ✅ SLA 준수 (P95 < 100ms)

---

**Last Updated:** 2024-12-07  
**Version:** AUTUS v4.8  
**Status:** Production Ready ✅
