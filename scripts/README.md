# AUTUS Scripts

## 폴더 구조

| 폴더 | 용도 |
|------|------|
| **upload/** | 학생·강사·수업 업로드 (`upload_students.py`, `upload_coaches_classes.py`) |
| **setup/** | 설치·검증 스크립트 |
| **deploy/** | 배포·백업 |
| **sql/** | SQL 스크립트 |

## 자주 쓰는 명령

```bash
# 학생 업로드 (CSV: _local_data/students.csv)
python3 scripts/upload/upload_students.py

# 강사·수업 업로드
python3 scripts/upload/upload_coaches_classes.py

# ATB 데이터 확인
python3 scripts/check_atb_data.py
```
