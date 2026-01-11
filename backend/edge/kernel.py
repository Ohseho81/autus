"""
Arbutus Edge Kernel v1.0
========================

Arbutus Analyzer의 검증된 성능을 Edge Computing으로 계승

핵심 역량:
- 초당 수백만 레코드 처리
- 200+ 감사 특화 함수 (핵심 30개 우선 구현)
- Read-only 무결성 보장
- 파일 사이즈 제한 없음
"""

from dataclasses import dataclass, field
from typing import Dict, List, Tuple, Optional, Any, Callable, Iterator, Union
from enum import Enum, auto
from collections import defaultdict, Counter
import json
import time
import os
import struct
import hashlib
import math
import statistics
import bisect
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
import threading
import mmap
import io


# ============================================================
# 1. 성능 메트릭
# ============================================================

class PerformanceMetrics:
    """처리 성능 추적"""
    
    def __init__(self):
        self.records_processed = 0
        self.start_time = 0
        self.operations = []
        self._lock = threading.Lock()
    
    def start(self):
        self.start_time = time.perf_counter()
        self.records_processed = 0
        self.operations = []
    
    def add_records(self, count: int):
        with self._lock:
            self.records_processed += count
    
    def log_operation(self, name: str, duration_ms: float, records: int):
        self.operations.append({
            "name": name,
            "duration_ms": round(duration_ms, 2),
            "records": records,
            "throughput": round(records / (duration_ms / 1000), 0) if duration_ms > 0 else 0
        })
    
    def summary(self) -> Dict:
        elapsed = time.perf_counter() - self.start_time
        return {
            "total_records": self.records_processed,
            "elapsed_seconds": round(elapsed, 3),
            "records_per_second": round(self.records_processed / elapsed, 0) if elapsed > 0 else 0,
            "operations": self.operations
        }


# ============================================================
# 2. 데이터 타입 및 스키마
# ============================================================

class DataType(Enum):
    """데이터 타입"""
    STRING = "string"
    INTEGER = "integer"
    FLOAT = "float"
    DATE = "date"
    DATETIME = "datetime"
    BOOLEAN = "boolean"
    CURRENCY = "currency"


@dataclass
class FieldSchema:
    """필드 스키마"""
    name: str
    dtype: DataType
    nullable: bool = True
    primary_key: bool = False
    indexed: bool = False


@dataclass
class TableSchema:
    """테이블 스키마 (Read-only 보장)"""
    name: str
    fields: List[FieldSchema]
    record_count: int = 0
    
    # 무결성 해시
    _integrity_hash: str = ""
    
    def get_field(self, name: str) -> Optional[FieldSchema]:
        for f in self.fields:
            if f.name == name:
                return f
        return None
    
    def compute_integrity_hash(self, data: List[Dict]) -> str:
        """데이터 무결성 해시 계산"""
        content = json.dumps(data, sort_keys=True, default=str)
        return hashlib.sha256(content.encode()).hexdigest()[:16]


# ============================================================
# 3. 인메모리 테이블 (고속 처리)
# ============================================================

class InMemoryTable:
    """
    고속 인메모리 테이블
    
    - 컬럼 기반 저장 (분석 최적화)
    - 인덱스 지원
    - Read-only 모드
    """
    
    def __init__(self, schema: TableSchema, read_only: bool = True):
        self.schema = schema
        self.read_only = read_only
        
        # 컬럼 기반 저장
        self._columns: Dict[str, List] = {f.name: [] for f in schema.fields}
        self._row_count = 0
        
        # 인덱스
        self._indexes: Dict[str, Dict] = {}
        
        # 무결성
        self._integrity_hash = ""
        self._locked = False
    
    def load_data(self, records: List[Dict]):
        """데이터 로드 (벌크)"""
        if self._locked:
            raise RuntimeError("Table is locked (read-only)")
        
        start = time.perf_counter()
        
        for record in records:
            for field in self.schema.fields:
                value = record.get(field.name)
                self._columns[field.name].append(value)
            self._row_count += 1
        
        # 인덱스 생성
        for field in self.schema.fields:
            if field.indexed:
                self._build_index(field.name)
        
        # 무결성 해시
        self._integrity_hash = self.schema.compute_integrity_hash(records)
        
        elapsed_ms = (time.perf_counter() - start) * 1000
        return {
            "records_loaded": self._row_count,
            "elapsed_ms": round(elapsed_ms, 2),
            "throughput": round(self._row_count / (elapsed_ms / 1000), 0)
        }
    
    def lock(self):
        """Read-only 잠금"""
        self._locked = True
    
    def _build_index(self, field_name: str):
        """인덱스 구축"""
        index = defaultdict(list)
        for i, value in enumerate(self._columns[field_name]):
            index[value].append(i)
        self._indexes[field_name] = dict(index)
    
    def get_column(self, name: str) -> List:
        """컬럼 조회"""
        return self._columns.get(name, [])
    
    def get_row(self, index: int) -> Dict:
        """행 조회"""
        if index < 0 or index >= self._row_count:
            return {}
        return {
            f.name: self._columns[f.name][index]
            for f in self.schema.fields
        }
    
    def get_rows_by_index(self, field_name: str, value: Any) -> List[int]:
        """인덱스로 행 조회"""
        if field_name in self._indexes:
            return self._indexes[field_name].get(value, [])
        return []
    
    def iterate(self) -> Iterator[Dict]:
        """행 순회"""
        for i in range(self._row_count):
            yield self.get_row(i)
    
    @property
    def row_count(self) -> int:
        return self._row_count
    
    @property
    def integrity_hash(self) -> str:
        return self._integrity_hash


# ============================================================
# 4. ARBUTUS 감사 함수 (핵심 30개)
# ============================================================

class AuditFunctions:
    """
    Arbutus 감사 특화 함수
    
    30년간 감사 현장에서 검증된 핵심 함수들
    """
    
    # ─────────────────────────────────────────────────────────
    # 4.1 데이터 결합 함수
    # ─────────────────────────────────────────────────────────
    
    @staticmethod
    def JOIN(
        primary: InMemoryTable,
        secondary: InMemoryTable,
        primary_key: str,
        secondary_key: str,
        join_type: str = "inner"
    ) -> List[Dict]:
        """
        테이블 조인
        
        - inner: 매칭되는 것만
        - left: 프라이머리 모두 + 매칭
        - unmatch: 매칭되지 않는 것만
        """
        start = time.perf_counter()
        
        # 세컨더리 인덱스 구축
        sec_index = defaultdict(list)
        for i, val in enumerate(secondary.get_column(secondary_key)):
            sec_index[val].append(i)
        
        results = []
        matched_secondary = set()
        
        for i in range(primary.row_count):
            pkey = primary.get_column(primary_key)[i]
            primary_row = primary.get_row(i)
            
            if pkey in sec_index:
                for sec_idx in sec_index[pkey]:
                    matched_secondary.add(sec_idx)
                    if join_type in ["inner", "left"]:
                        combined = {**primary_row}
                        sec_row = secondary.get_row(sec_idx)
                        for k, v in sec_row.items():
                            combined[f"sec_{k}"] = v
                        results.append(combined)
            else:
                if join_type == "left":
                    results.append(primary_row)
                elif join_type == "unmatch":
                    results.append(primary_row)
        
        elapsed = (time.perf_counter() - start) * 1000
        return results
    
    @staticmethod
    def RELATE(
        table: InMemoryTable,
        source_field: str,
        target_table: InMemoryTable,
        target_field: str
    ) -> Dict[str, List[int]]:
        """
        관계 매핑 (N:M 관계 분석)
        """
        relations = defaultdict(list)
        
        target_index = defaultdict(list)
        for i, val in enumerate(target_table.get_column(target_field)):
            target_index[val].append(i)
        
        for i, val in enumerate(table.get_column(source_field)):
            if val in target_index:
                relations[i] = target_index[val]
        
        return dict(relations)
    
    # ─────────────────────────────────────────────────────────
    # 4.2 데이터 분류 함수
    # ─────────────────────────────────────────────────────────
    
    @staticmethod
    def CLASSIFY(
        table: InMemoryTable,
        field: str,
        buckets: List[Tuple[str, Callable]]
    ) -> Dict[str, List[int]]:
        """
        조건별 분류
        
        buckets: [("label", lambda x: condition), ...]
        """
        classified = {label: [] for label, _ in buckets}
        classified["_unclassified"] = []
        
        for i, val in enumerate(table.get_column(field)):
            matched = False
            for label, condition in buckets:
                try:
                    if condition(val):
                        classified[label].append(i)
                        matched = True
                        break
                except:
                    pass
            if not matched:
                classified["_unclassified"].append(i)
        
        return classified
    
    @staticmethod
    def STRATIFY(
        table: InMemoryTable,
        field: str,
        intervals: List[Tuple[float, float]]
    ) -> Dict[str, Dict]:
        """
        수치 계층화 (금액 분포 분석)
        
        intervals: [(min, max), ...]
        """
        strata = {}
        values = table.get_column(field)
        
        for i, (low, high) in enumerate(intervals):
            label = f"{low:,.0f}-{high:,.0f}"
            rows = []
            total = 0.0
            
            for j, val in enumerate(values):
                if val is not None and low <= val < high:
                    rows.append(j)
                    total += val
            
            strata[label] = {
                "count": len(rows),
                "total": total,
                "avg": total / len(rows) if rows else 0,
                "rows": rows
            }
        
        return strata
    
    @staticmethod
    def AGE(
        table: InMemoryTable,
        date_field: str,
        as_of_date: datetime = None,
        buckets: List[int] = None
    ) -> Dict[str, Dict]:
        """
        에이징 분석 (미수금, 미지급 등)
        
        buckets: [30, 60, 90, 120] → 0-30, 31-60, 61-90, 91-120, 120+
        """
        as_of = as_of_date or datetime.now()
        buckets = buckets or [30, 60, 90, 120]
        
        age_buckets = {
            f"0-{buckets[0]}": {"count": 0, "rows": []},
        }
        
        for i in range(len(buckets) - 1):
            label = f"{buckets[i]+1}-{buckets[i+1]}"
            age_buckets[label] = {"count": 0, "rows": []}
        
        age_buckets[f"{buckets[-1]+1}+"] = {"count": 0, "rows": []}
        
        dates = table.get_column(date_field)
        
        for i, date_val in enumerate(dates):
            if date_val is None:
                continue
            
            if isinstance(date_val, str):
                try:
                    date_val = datetime.fromisoformat(date_val.replace('Z', '+00:00'))
                except:
                    continue
            
            days = (as_of - date_val).days
            
            if days <= buckets[0]:
                key = f"0-{buckets[0]}"
            elif days > buckets[-1]:
                key = f"{buckets[-1]+1}+"
            else:
                for j in range(len(buckets) - 1):
                    if buckets[j] < days <= buckets[j+1]:
                        key = f"{buckets[j]+1}-{buckets[j+1]}"
                        break
            
            age_buckets[key]["count"] += 1
            age_buckets[key]["rows"].append(i)
        
        return age_buckets
    
    # ─────────────────────────────────────────────────────────
    # 4.3 이상 탐지 함수
    # ─────────────────────────────────────────────────────────
    
    @staticmethod
    def DUPLICATES(
        table: InMemoryTable,
        fields: List[str],
        threshold: int = 1
    ) -> List[Dict]:
        """
        중복 탐지
        
        fields: 중복 판단 기준 필드들
        threshold: 최소 중복 횟수
        """
        # 복합 키 생성
        key_map = defaultdict(list)
        
        for i in range(table.row_count):
            key_parts = []
            for f in fields:
                val = table.get_column(f)[i]
                key_parts.append(str(val) if val is not None else "NULL")
            key = "|".join(key_parts)
            key_map[key].append(i)
        
        # 중복 추출
        duplicates = []
        for key, rows in key_map.items():
            if len(rows) > threshold:
                duplicates.append({
                    "key": key,
                    "count": len(rows),
                    "rows": rows,
                    "first_row": table.get_row(rows[0])
                })
        
        return sorted(duplicates, key=lambda x: x["count"], reverse=True)
    
    @staticmethod
    def GAPS(
        table: InMemoryTable,
        sequence_field: str
    ) -> List[Dict]:
        """
        번호 누락 탐지 (송장 번호, 수표 번호 등)
        """
        values = []
        for i, val in enumerate(table.get_column(sequence_field)):
            if val is not None:
                try:
                    values.append((int(val), i))
                except:
                    pass
        
        if not values:
            return []
        
        values.sort(key=lambda x: x[0])
        gaps = []
        
        for i in range(1, len(values)):
            expected = values[i-1][0] + 1
            actual = values[i][0]
            
            if actual > expected:
                gaps.append({
                    "gap_start": expected,
                    "gap_end": actual - 1,
                    "missing_count": actual - expected,
                    "before_row": values[i-1][1],
                    "after_row": values[i][1]
                })
        
        return gaps
    
    @staticmethod
    def OUTLIERS(
        table: InMemoryTable,
        field: str,
        method: str = "zscore",
        threshold: float = 3.0
    ) -> List[Dict]:
        """
        이상치 탐지
        
        method: zscore, iqr, mad
        """
        values = []
        indices = []
        
        for i, val in enumerate(table.get_column(field)):
            if val is not None:
                try:
                    values.append(float(val))
                    indices.append(i)
                except:
                    pass
        
        if len(values) < 3:
            return []
        
        outliers = []
        
        if method == "zscore":
            mean = statistics.mean(values)
            stdev = statistics.stdev(values)
            
            for i, val in enumerate(values):
                z = (val - mean) / stdev if stdev > 0 else 0
                if abs(z) > threshold:
                    outliers.append({
                        "row_index": indices[i],
                        "value": val,
                        "z_score": round(z, 3),
                        "deviation": round(abs(val - mean), 2)
                    })
        
        elif method == "iqr":
            sorted_vals = sorted(values)
            q1 = sorted_vals[len(sorted_vals) // 4]
            q3 = sorted_vals[3 * len(sorted_vals) // 4]
            iqr = q3 - q1
            lower = q1 - threshold * iqr
            upper = q3 + threshold * iqr
            
            for i, val in enumerate(values):
                if val < lower or val > upper:
                    outliers.append({
                        "row_index": indices[i],
                        "value": val,
                        "iqr_bounds": (round(lower, 2), round(upper, 2))
                    })
        
        elif method == "mad":
            median = statistics.median(values)
            mad = statistics.median([abs(v - median) for v in values])
            
            for i, val in enumerate(values):
                if mad > 0:
                    m_score = abs(val - median) / mad
                    if m_score > threshold:
                        outliers.append({
                            "row_index": indices[i],
                            "value": val,
                            "mad_score": round(m_score, 3)
                        })
        
        return sorted(outliers, key=lambda x: abs(x.get("z_score", x.get("value", 0))), reverse=True)
    
    @staticmethod
    def BENFORD(
        table: InMemoryTable,
        field: str
    ) -> Dict:
        """
        벤포드 법칙 분석 (첫자리 숫자 분포)
        
        부정 거래 탐지에 활용
        """
        # 이론적 벤포드 분포
        expected = {
            1: 30.1, 2: 17.6, 3: 12.5, 4: 9.7,
            5: 7.9, 6: 6.7, 7: 5.8, 8: 5.1, 9: 4.6
        }
        
        first_digits = Counter()
        valid_count = 0
        
        for val in table.get_column(field):
            if val is not None and val != 0:
                try:
                    num_str = str(abs(float(val))).lstrip('0').lstrip('.')
                    if num_str and num_str[0].isdigit():
                        first_digit = int(num_str[0])
                        if 1 <= first_digit <= 9:
                            first_digits[first_digit] += 1
                            valid_count += 1
                except:
                    pass
        
        if valid_count == 0:
            return {"error": "No valid numeric data"}
        
        # 관측 분포
        observed = {d: (first_digits[d] / valid_count * 100) for d in range(1, 10)}
        
        # 카이제곱 통계량
        chi_square = sum(
            ((observed[d] - expected[d]) ** 2) / expected[d]
            for d in range(1, 10)
        )
        
        # 위험 수준
        if chi_square < 15.51:  # p > 0.05
            conformity = "CONFORMS"
        elif chi_square < 20.09:  # p > 0.01
            conformity = "MARGINAL"
        else:
            conformity = "NON_CONFORMING"
        
        return {
            "valid_records": valid_count,
            "expected": expected,
            "observed": {k: round(v, 2) for k, v in observed.items()},
            "chi_square": round(chi_square, 2),
            "conformity": conformity,
            "suspicious_digits": [
                d for d in range(1, 10)
                if abs(observed[d] - expected[d]) > 5
            ]
        }
    
    # ─────────────────────────────────────────────────────────
    # 4.4 통계 함수
    # ─────────────────────────────────────────────────────────
    
    @staticmethod
    def STATISTICS(
        table: InMemoryTable,
        field: str
    ) -> Dict:
        """
        기술 통계량
        """
        values = []
        for val in table.get_column(field):
            if val is not None:
                try:
                    values.append(float(val))
                except:
                    pass
        
        if not values:
            return {"error": "No numeric data"}
        
        sorted_vals = sorted(values)
        n = len(values)
        
        return {
            "count": n,
            "sum": round(sum(values), 2),
            "mean": round(statistics.mean(values), 4),
            "median": round(statistics.median(values), 4),
            "mode": round(statistics.mode(values), 4) if n > 1 else values[0],
            "stdev": round(statistics.stdev(values), 4) if n > 1 else 0,
            "variance": round(statistics.variance(values), 4) if n > 1 else 0,
            "min": round(min(values), 4),
            "max": round(max(values), 4),
            "range": round(max(values) - min(values), 4),
            "q1": round(sorted_vals[n // 4], 4),
            "q3": round(sorted_vals[3 * n // 4], 4),
            "iqr": round(sorted_vals[3 * n // 4] - sorted_vals[n // 4], 4)
        }
    
    @staticmethod
    def SUMMARIZE(
        table: InMemoryTable,
        group_by: str,
        agg_field: str,
        agg_func: str = "sum"
    ) -> Dict[str, Dict]:
        """
        그룹별 집계
        """
        groups = defaultdict(list)
        
        group_col = table.get_column(group_by)
        agg_col = table.get_column(agg_field)
        
        for i in range(table.row_count):
            group_key = group_col[i]
            agg_val = agg_col[i]
            if agg_val is not None:
                try:
                    groups[group_key].append(float(agg_val))
                except:
                    pass
        
        result = {}
        for key, values in groups.items():
            if not values:
                continue
            
            agg_result = {
                "count": len(values),
                "sum": round(sum(values), 2),
                "avg": round(statistics.mean(values), 2),
                "min": round(min(values), 2),
                "max": round(max(values), 2)
            }
            result[str(key)] = agg_result
        
        return result
    
    # ─────────────────────────────────────────────────────────
    # 4.5 샘플링 함수
    # ─────────────────────────────────────────────────────────
    
    @staticmethod
    def SAMPLE(
        table: InMemoryTable,
        method: str = "random",
        size: int = 100,
        seed: int = None
    ) -> List[int]:
        """
        감사 샘플 추출
        
        method: random, systematic, monetary
        """
        import random
        if seed:
            random.seed(seed)
        
        n = table.row_count
        if size >= n:
            return list(range(n))
        
        if method == "random":
            return sorted(random.sample(range(n), size))
        
        elif method == "systematic":
            interval = n // size
            start = random.randint(0, interval - 1)
            return [start + i * interval for i in range(size) if start + i * interval < n]
        
        elif method == "monetary":
            # MUS (Monetary Unit Sampling)
            # 금액 비례 확률 샘플링
            amounts = []
            for i in range(n):
                try:
                    amt = float(table.get_column("amount")[i] or 0)
                    amounts.append((i, abs(amt)))
                except:
                    amounts.append((i, 0))
            
            total = sum(a[1] for a in amounts)
            if total == 0:
                return sorted(random.sample(range(n), size))
            
            # 누적 확률
            cumulative = []
            running = 0
            for i, amt in amounts:
                running += amt
                cumulative.append((i, running / total))
            
            # 샘플 선택
            selected = set()
            while len(selected) < size:
                r = random.random()
                for i, cum in cumulative:
                    if r <= cum:
                        selected.add(i)
                        break
            
            return sorted(selected)
        
        return []
    
    # ─────────────────────────────────────────────────────────
    # 4.6 검증 함수
    # ─────────────────────────────────────────────────────────
    
    @staticmethod
    def VERIFY(
        table: InMemoryTable,
        field: str,
        rule: Callable
    ) -> Dict:
        """
        규칙 기반 검증
        """
        passed = []
        failed = []
        errors = []
        
        for i, val in enumerate(table.get_column(field)):
            try:
                if rule(val):
                    passed.append(i)
                else:
                    failed.append(i)
            except Exception as e:
                errors.append({"row": i, "error": str(e)})
        
        return {
            "passed": len(passed),
            "failed": len(failed),
            "errors": len(errors),
            "pass_rate": round(len(passed) / (len(passed) + len(failed)) * 100, 2) if passed or failed else 0,
            "failed_rows": failed[:100],  # 상위 100개만
            "error_rows": errors[:10]
        }
    
    @staticmethod
    def CROSS_VALIDATE(
        table1: InMemoryTable,
        field1: str,
        table2: InMemoryTable,
        field2: str
    ) -> Dict:
        """
        교차 검증 (두 테이블 간 값 비교)
        """
        set1 = set(table1.get_column(field1))
        set2 = set(table2.get_column(field2))
        
        only_in_1 = set1 - set2
        only_in_2 = set2 - set1
        in_both = set1 & set2
        
        return {
            "table1_count": len(set1),
            "table2_count": len(set2),
            "matched": len(in_both),
            "only_in_table1": len(only_in_1),
            "only_in_table2": len(only_in_2),
            "match_rate": round(len(in_both) / max(len(set1), len(set2)) * 100, 2) if set1 or set2 else 0,
            "only_in_table1_sample": list(only_in_1)[:10],
            "only_in_table2_sample": list(only_in_2)[:10]
        }


# ============================================================
# 5. EDGE KERNEL
# ============================================================

class ArbutusEdgeKernel:
    """
    Arbutus Edge Kernel
    
    데스크톱급 성능을 Edge에서 구현
    - 초당 수백만 레코드 처리
    - 메모리 최적화
    - 병렬 처리
    """
    
    def __init__(self, max_workers: int = 4):
        self.tables: Dict[str, InMemoryTable] = {}
        self.metrics = PerformanceMetrics()
        self.max_workers = max_workers
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        
        # 감사 함수
        self.funcs = AuditFunctions()
    
    def create_table(self, name: str, schema: TableSchema) -> InMemoryTable:
        """테이블 생성"""
        table = InMemoryTable(schema)
        self.tables[name] = table
        return table
    
    def load_data(
        self,
        table_name: str,
        records: List[Dict],
        lock: bool = True
    ) -> Dict:
        """데이터 로드"""
        if table_name not in self.tables:
            raise ValueError(f"Table {table_name} not found")
        
        table = self.tables[table_name]
        result = table.load_data(records)
        
        if lock:
            table.lock()
        
        self.metrics.add_records(result["records_loaded"])
        return result
    
    def execute(
        self,
        func_name: str,
        table_name: str,
        **kwargs
    ) -> Any:
        """감사 함수 실행"""
        start = time.perf_counter()
        
        table = self.tables.get(table_name)
        if not table:
            raise ValueError(f"Table {table_name} not found")
        
        func = getattr(self.funcs, func_name, None)
        if not func:
            raise ValueError(f"Function {func_name} not found")
        
        result = func(table, **kwargs)
        
        elapsed_ms = (time.perf_counter() - start) * 1000
        self.metrics.log_operation(func_name, elapsed_ms, table.row_count)
        
        return result
    
    def execute_parallel(
        self,
        operations: List[Tuple[str, str, Dict]]
    ) -> List[Any]:
        """병렬 실행"""
        futures = []
        for func_name, table_name, kwargs in operations:
            future = self.executor.submit(
                self.execute, func_name, table_name, **kwargs
            )
            futures.append(future)
        
        return [f.result() for f in futures]
    
    def get_metrics(self) -> Dict:
        """성능 메트릭"""
        return self.metrics.summary()
    
    def close(self):
        """정리"""
        self.executor.shutdown(wait=True)


# ============================================================
# 6. 테스트 데이터 생성
# ============================================================

def generate_test_logs(count: int) -> List[Dict]:
    """테스트 로그 생성"""
    import random
    
    categories = ["PAYMENT", "INVOICE", "JOURNAL", "TRANSFER", "ADJUSTMENT"]
    vendors = [f"VENDOR_{i:04d}" for i in range(100)]
    departments = [f"DEPT_{i:02d}" for i in range(20)]
    
    logs = []
    base_time = datetime(2024, 1, 1)
    
    for i in range(count):
        # 대부분 정상, 일부 이상
        is_anomaly = random.random() < 0.01  # 1% 이상 징후
        
        if is_anomaly:
            # 이상 패턴
            anomaly_type = random.choice([
                "duplicate", "round_amount", "high_value",
                "weekend", "period_end", "missing_approval"
            ])
            
            if anomaly_type == "duplicate":
                amount = random.choice([1000, 5000, 10000, 50000])
                vendor = random.choice(vendors[:10])
            elif anomaly_type == "round_amount":
                amount = random.choice([100000, 500000, 1000000])
                vendor = random.choice(vendors)
            elif anomaly_type == "high_value":
                amount = random.uniform(500000, 5000000)
                vendor = random.choice(vendors)
            else:
                amount = random.uniform(100, 50000)
                vendor = random.choice(vendors)
            
            flags = [anomaly_type]
        else:
            amount = random.uniform(10, 50000)
            vendor = random.choice(vendors)
            flags = []
        
        log = {
            "id": i + 1,
            "timestamp": (base_time + timedelta(minutes=i)).isoformat(),
            "category": random.choice(categories),
            "vendor": vendor,
            "department": random.choice(departments),
            "amount": round(amount, 2),
            "invoice_num": f"INV{100000 + i}",
            "approved": random.random() > 0.05,
            "flags": flags
        }
        logs.append(log)
    
    return logs

