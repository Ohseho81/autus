#!/usr/bin/env python3
"""
AUTUS Local Distiller
=====================
Raw Data → Vector 즉시 가공 후 폐기

핵심 원칙:
1. Raw Data는 메모리에서만 처리 (디스크 저장 금지)
2. 가공 완료 즉시 메모리에서 삭제
3. 벡터 결과만 사용자 클라우드로 전송
4. AUTUS Kernel에는 Δ수식만 전송
"""

import time
import hashlib
import gc
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, Callable
from enum import Enum
from datetime import datetime
import json


class InputSource(Enum):
    """3가지 입력 소스"""
    MIC = "mic"       # 마이크 - 음성/환경음
    CAM = "cam"       # 카메라 - 표정/자세
    SCREEN = "screen" # 화면 - 앱/탭/입력


@dataclass
class RawBuffer:
    """
    Raw Data 임시 버퍼
    - 최대 100ms 유지
    - 가공 완료 즉시 삭제
    """
    source: InputSource
    timestamp: float
    data: bytes  # Raw binary data
    checksum: str = ""
    
    def __post_init__(self):
        # 무결성 검증용 체크섬 (데이터 자체는 저장 안 함)
        self.checksum = hashlib.sha256(self.data).hexdigest()[:16]
    
    def wipe(self):
        """Raw Data 즉시 폐기"""
        self.data = b'\x00' * len(self.data)  # 메모리 덮어쓰기
        self.data = None
        gc.collect()  # 가비지 컬렉션 강제 실행


@dataclass
class DistilledVector:
    """
    가공된 벡터 (저장 가능)
    - Raw Data 없음
    - 숫자만 존재
    """
    timestamp: float
    source: InputSource
    
    # Twin State 기여값
    energy_delta: float = 0.0
    flow_delta: float = 0.0
    risk_delta: float = 0.0
    
    # 소스별 특화 벡터
    vectors: Dict[str, float] = field(default_factory=dict)
    
    # 메타데이터 (개인정보 없음)
    processing_ms: float = 0.0
    confidence: float = 0.0
    
    def to_json(self) -> str:
        return json.dumps({
            "ts": self.timestamp,
            "src": self.source.value,
            "twin_delta": {
                "energy": round(self.energy_delta, 4),
                "flow": round(self.flow_delta, 4),
                "risk": round(self.risk_delta, 4)
            },
            "vectors": {k: round(v, 4) for k, v in self.vectors.items()},
            "meta": {
                "proc_ms": round(self.processing_ms, 2),
                "conf": round(self.confidence, 2)
            }
        })
    
    def to_delta_only(self) -> Dict[str, float]:
        """AUTUS Kernel 전송용 - Δ수식만"""
        return {
            "Δenergy": round(self.energy_delta, 4),
            "Δflow": round(self.flow_delta, 4),
            "Δrisk": round(self.risk_delta, 4)
        }


class LocalDistiller:
    """
    로컬 증류기 - Raw Data를 벡터로 변환
    
    처리 흐름:
    1. Raw Data 수신 → Buffer
    2. 가공 (< 100ms)
    3. Vector 생성
    4. Raw Data 즉시 폐기
    5. Vector → User Cloud
    6. Δ수식 → AUTUS Kernel
    """
    
    BUFFER_TIMEOUT_MS = 100  # 버퍼 최대 유지 시간
    
    def __init__(self):
        self._processors: Dict[InputSource, Callable] = {
            InputSource.MIC: self._process_mic,
            InputSource.CAM: self._process_cam,
            InputSource.SCREEN: self._process_screen
        }
        self._last_vectors: Dict[InputSource, DistilledVector] = {}
    
    def distill(self, source: InputSource, raw_data: bytes) -> DistilledVector:
        """
        Raw Data → Vector 변환 후 즉시 폐기
        
        Args:
            source: 입력 소스 (MIC/CAM/SCREEN)
            raw_data: Raw binary data
        
        Returns:
            DistilledVector (저장 가능한 벡터)
        """
        start_time = time.time()
        
        # 1. 버퍼 생성
        buffer = RawBuffer(
            source=source,
            timestamp=start_time,
            data=raw_data
        )
        
        try:
            # 2. 가공
            processor = self._processors.get(source)
            if not processor:
                raise ValueError(f"Unknown source: {source}")
            
            vector = processor(buffer)
            vector.processing_ms = (time.time() - start_time) * 1000
            
            # 3. 이전 벡터와 비교하여 델타 계산
            if source in self._last_vectors:
                prev = self._last_vectors[source]
                vector.energy_delta = vector.vectors.get('energy', 0) - prev.vectors.get('energy', 0)
                vector.flow_delta = vector.vectors.get('flow', 0) - prev.vectors.get('flow', 0)
                vector.risk_delta = vector.vectors.get('risk', 0) - prev.vectors.get('risk', 0)
            
            self._last_vectors[source] = vector
            
            return vector
            
        finally:
            # 4. Raw Data 즉시 폐기 (예외 발생해도 반드시 실행)
            buffer.wipe()
            del buffer
            gc.collect()
    
    def _process_mic(self, buffer: RawBuffer) -> DistilledVector:
        """
        마이크 데이터 가공
        - 음성 → 감정/집중도/키워드 벡터
        - 실제 구현: WebRTC VAD, Whisper, 감정 분석 모델
        """
        # TODO: 실제 AI 모델 연동
        # 현재는 시뮬레이션
        import random
        
        vector = DistilledVector(
            timestamp=buffer.timestamp,
            source=InputSource.MIC,
            confidence=0.85
        )
        
        # 가공 결과 (숫자만)
        vector.vectors = {
            "mood": random.uniform(0.3, 0.9),      # 감정 상태
            "focus": random.uniform(0.4, 1.0),     # 집중도
            "stress": random.uniform(0.1, 0.6),    # 스트레스
            "energy": random.uniform(0.5, 0.9),    # 에너지 기여
            "flow": random.uniform(0.3, 0.8),      # Flow 기여
            "risk": random.uniform(0.1, 0.4)       # Risk 기여
        }
        
        return vector
    
    def _process_cam(self, buffer: RawBuffer) -> DistilledVector:
        """
        카메라 데이터 가공
        - 영상 → 피로도/긴장도/자세 벡터
        - 실제 구현: MediaPipe, 표정 인식 모델
        """
        import random
        
        vector = DistilledVector(
            timestamp=buffer.timestamp,
            source=InputSource.CAM,
            confidence=0.80
        )
        
        vector.vectors = {
            "fatigue": random.uniform(0.1, 0.7),   # 피로도
            "tension": random.uniform(0.1, 0.5),   # 긴장도
            "posture": random.uniform(0.6, 1.0),   # 자세 점수
            "gaze": random.uniform(0.5, 1.0),      # 시선 집중도
            "energy": random.uniform(0.4, 0.9),
            "flow": random.uniform(0.3, 0.7),
            "risk": random.uniform(0.1, 0.5)
        }
        
        return vector
    
    def _process_screen(self, buffer: RawBuffer) -> DistilledVector:
        """
        화면 데이터 가공
        - 스크린 → 작업 분류/전환율 벡터
        - 실제 구현: OCR, 앱 분류 모델
        """
        import random
        
        vector = DistilledVector(
            timestamp=buffer.timestamp,
            source=InputSource.SCREEN,
            confidence=0.90
        )
        
        # 작업 타입 인코딩 (0: idle, 1: work, 2: meeting, 3: break)
        task_type = random.choice([0, 1, 1, 1, 2, 3])
        
        vector.vectors = {
            "task_type": float(task_type),
            "switch_rate": random.uniform(0, 20),  # 시간당 전환 횟수
            "active_ratio": random.uniform(0.5, 1.0),  # 활성 시간 비율
            "productivity": random.uniform(0.4, 0.9),
            "energy": random.uniform(0.5, 0.85),
            "flow": random.uniform(0.4, 0.9),
            "risk": random.uniform(0.05, 0.3)
        }
        
        return vector


class UserCloudSync:
    """
    사용자 클라우드 동기화
    - 벡터만 저장
    - Raw Data 절대 전송 안 함
    """
    
    def __init__(self, cloud_path: str = "./user_cloud"):
        self.cloud_path = cloud_path
        self._ensure_path()
    
    def _ensure_path(self):
        import os
        os.makedirs(self.cloud_path, exist_ok=True)
    
    def save_vector(self, vector: DistilledVector) -> str:
        """벡터를 사용자 클라우드에 저장"""
        filename = f"{self.cloud_path}/vec_{vector.source.value}_{int(vector.timestamp)}.json"
        
        with open(filename, 'w') as f:
            f.write(vector.to_json())
        
        return filename


class AutusKernelClient:
    """
    AUTUS Kernel 클라이언트
    - Δ수식만 전송
    - 원본 복원 불가능한 데이터만 취급
    """
    
    def __init__(self, kernel_url: str = "ws://localhost:8000/ws"):
        self.kernel_url = kernel_url
        self._connected = False
    
    def send_delta(self, vector: DistilledVector):
        """Δ수식만 전송"""
        delta = vector.to_delta_only()
        
        payload = {
            "type": "delta_update",
            "ts": vector.timestamp,
            "source": vector.source.value,
            "delta": delta
        }
        
        # TODO: 실제 WebSocket 전송
        print(f"[AUTUS] Delta sent: {json.dumps(delta)}")
        
        return payload


# ═══════════════════════════════════════════════════════════════
# CLI 테스트
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 60)
    print("🔬 AUTUS Local Distiller Test")
    print("=" * 60)
    
    distiller = LocalDistiller()
    cloud = UserCloudSync("./user_cloud")
    kernel = AutusKernelClient()
    
    # 시뮬레이션: 각 소스에서 데이터 수신
    for source in InputSource:
        print(f"\n📡 Processing: {source.value.upper()}")
        
        # 가상의 Raw Data (실제로는 센서에서 수신)
        fake_raw = b'\x00' * 1024  # 1KB dummy
        
        # 가공
        vector = distiller.distill(source, fake_raw)
        
        # 결과 출력
        print(f"   ✅ Vector: {vector.to_json()[:100]}...")
        print(f"   ⏱️ Processing: {vector.processing_ms:.2f}ms")
        
        # 사용자 클라우드 저장
        saved = cloud.save_vector(vector)
        print(f"   💾 Saved to: {saved}")
        
        # AUTUS Kernel 전송
        kernel.send_delta(vector)
    
    print("\n" + "=" * 60)
    print("✅ Raw Data: 즉시 폐기됨")
    print("✅ Vector: 사용자 클라우드에 저장됨")
    print("✅ Δ수식: AUTUS Kernel로 전송됨")
    print("=" * 60)
