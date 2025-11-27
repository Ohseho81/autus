# AUTUS VS COMMAND SPEC v0.1

## 명령어 스키마

```
AUTUS:TERMINAL_REQUEST {
  "action": "<ACTION_NAME>",
  "args": { ... },
  "reason": "<why VS cannot execute this and terminal must>"
}
```

## ACTION 목록 및 매핑

| ACTION         | 터미널 명령어                        | VS 안내 메시지 예시                                 |
|----------------|--------------------------------------|-----------------------------------------------------|
| CHECK_SERVER   | uvicorn server.main:app --reload     | 서버 재시작이 필요합니다.                           |
| RUN_TESTS      | pytest -q                            | 전체 테스트를 터미널에서 실행해야 합니다.            |
| RUN_SMOKE      | pytest -k smoke                      | 스모크 테스트 실행이 필요합니다.                    |
| CLEAN_CACHE    | scripts/clean_cache.sh               | 캐시 삭제는 터미널에서 실행해야 합니다.             |
| INSPECT        | scripts/autus_inspect.sh             | 구조 점검을 위해 터미널 명령 실행 필요.             |
| FIX_IMPORT     | python -m compileall server/main.py  | import 오류 해결을 위해 컴파일 필요.                |
| RESTART_AUTUS  | pkill -f uvicorn → uvicorn ...       | AUTUS를 재시작해야 합니다.                          |

## 예시

### 예제 1
```
AUTUS:TERMINAL_REQUEST {
  "action": "RUN_TESTS",
  "reason": "코어 테스트는 VS 내부에서 실행하면 충돌 위험이 있습니다."
}
```
VS가 출력:
> 터미널에서 아래 명령을 실행해 주세요:
> pytest -q

### 예제 2
```
AUTUS:TERMINAL_REQUEST {
  "action": "INSPECT",
  "reason": "폴더/팩 구조 점검은 터미널에서만 가능합니다."
}
```
VS가 출력:
> 터미널에서 scripts/autus_inspect.sh 를 실행해 주세요.

### 예제 3
```
AUTUS:TERMINAL_REQUEST {
  "action": "CLEAN_CACHE" 
}
```
VS가 출력:
> 터미널에서 캐시 초기화를 실행해야 합니다:
> scripts/clean_cache.sh

---

## 확장 전략/리스크/ROI 등은 별도 문서 참고
