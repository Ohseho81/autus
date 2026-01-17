"""
═══════════════════════════════════════════════════════════════════════════════
🧠 AUTUS V Predictor v1.0 — AI 기반 V 예측
═══════════════════════════════════════════════════════════════════════════════

V 공식의 AI 통합:
- LSTM/GRU 시계열 예측
- 로그 변환으로 복리 선형화
- 연속 학습 (Continual Learning)
- 앙상블 예측

로컬 (Zero-Cloud) 환경에서 실행
═══════════════════════════════════════════════════════════════════════════════
"""
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
import math
import json
from datetime import datetime

# ═══════════════════════════════════════════════════════════════════════════════
# 의존성 체크 (로컬 환경)
# ═══════════════════════════════════════════════════════════════════════════════

NUMPY_AVAILABLE = False
TORCH_AVAILABLE = False

try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    pass

try:
    import torch
    import torch.nn as nn
    TORCH_AVAILABLE = True
except ImportError:
    pass


# ═══════════════════════════════════════════════════════════════════════════════
# V 시계열 데이터
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class VTimePoint:
    """V 시계열 데이터 포인트"""
    timestamp: datetime
    M: float
    T: float
    s: float
    V: float
    network_density: float = 0.0
    decision_type: str = "accept"  # accept, reject, sync


@dataclass
class VHistory:
    """V 히스토리 컬렉션"""
    points: List[VTimePoint] = field(default_factory=list)
    
    def add(self, point: VTimePoint):
        self.points.append(point)
    
    def to_sequences(self, window_size: int = 7) -> List[List[float]]:
        """시계열을 윈도우 시퀀스로 변환"""
        if len(self.points) < window_size:
            return []
        
        sequences = []
        for i in range(len(self.points) - window_size + 1):
            window = self.points[i:i + window_size]
            seq = [p.V for p in window]
            sequences.append(seq)
        
        return sequences
    
    def to_features(self) -> List[List[float]]:
        """특징 벡터로 변환 [M, T, s, network_density]"""
        return [
            [p.M, p.T, p.s, p.network_density]
            for p in self.points
        ]
    
    def to_targets(self) -> List[float]:
        """타겟 (V값)"""
        return [p.V for p in self.points]


# ═══════════════════════════════════════════════════════════════════════════════
# 로그 변환 선형 예측기 (Numpy 기반)
# ═══════════════════════════════════════════════════════════════════════════════

class LogLinearPredictor:
    """
    로그 변환 선형 예측기
    
    복리 공식의 로그 변환:
    log(V) = log(M-T) + t × log(1+s)
    
    이를 선형 회귀로 학습:
    y = a + b×t  (여기서 y = log(V))
    """
    
    def __init__(self):
        self.a = 0.0  # intercept
        self.b = 0.0  # slope (≈ log(1+s))
        self.trained = False
        self.r_squared = 0.0
    
    def fit(self, history: VHistory) -> Dict[str, float]:
        """
        히스토리 데이터로 학습
        
        Returns:
            학습 결과 (a, b, r_squared)
        """
        if not NUMPY_AVAILABLE:
            return self._fit_fallback(history)
        
        points = history.points
        if len(points) < 3:
            return {"error": "데이터 부족 (최소 3개 필요)"}
        
        # 시간 인덱스와 log(V) 추출
        t_values = np.array(range(len(points)))
        v_values = np.array([p.V for p in points])
        
        # V가 0 이하인 경우 처리
        v_values = np.clip(v_values, 0.01, None)
        log_v = np.log(v_values)
        
        # 선형 회귀 (최소제곱)
        n = len(t_values)
        sum_t = np.sum(t_values)
        sum_log_v = np.sum(log_v)
        sum_t_log_v = np.sum(t_values * log_v)
        sum_t_sq = np.sum(t_values ** 2)
        
        denominator = n * sum_t_sq - sum_t ** 2
        if denominator == 0:
            return {"error": "계산 불가 (분모 0)"}
        
        self.b = (n * sum_t_log_v - sum_t * sum_log_v) / denominator
        self.a = (sum_log_v - self.b * sum_t) / n
        
        # R² 계산
        predicted = self.a + self.b * t_values
        ss_res = np.sum((log_v - predicted) ** 2)
        ss_tot = np.sum((log_v - np.mean(log_v)) ** 2)
        self.r_squared = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0
        
        self.trained = True
        
        # 추정 synergy 계산: b ≈ log(1+s) → s ≈ exp(b) - 1
        estimated_s = math.exp(self.b) - 1 if self.b > -1 else 0
        
        return {
            "a": round(self.a, 4),
            "b": round(self.b, 4),
            "r_squared": round(self.r_squared, 4),
            "estimated_s": round(estimated_s, 4),
            "data_points": len(points)
        }
    
    def _fit_fallback(self, history: VHistory) -> Dict[str, float]:
        """Numpy 없이 순수 Python으로 학습"""
        points = history.points
        if len(points) < 3:
            return {"error": "데이터 부족"}
        
        t_values = list(range(len(points)))
        log_v = [math.log(max(0.01, p.V)) for p in points]
        
        n = len(t_values)
        sum_t = sum(t_values)
        sum_log_v = sum(log_v)
        sum_t_log_v = sum(t * lv for t, lv in zip(t_values, log_v))
        sum_t_sq = sum(t ** 2 for t in t_values)
        
        denominator = n * sum_t_sq - sum_t ** 2
        if denominator == 0:
            return {"error": "계산 불가"}
        
        self.b = (n * sum_t_log_v - sum_t * sum_log_v) / denominator
        self.a = (sum_log_v - self.b * sum_t) / n
        self.trained = True
        
        return {
            "a": round(self.a, 4),
            "b": round(self.b, 4),
            "estimated_s": round(math.exp(self.b) - 1, 4) if self.b > -1 else 0
        }
    
    def predict(self, future_t: int) -> Dict[str, float]:
        """미래 V 예측"""
        if not self.trained:
            return {"error": "학습 필요"}
        
        log_v_pred = self.a + self.b * future_t
        v_pred = math.exp(log_v_pred)
        
        return {
            "t": future_t,
            "predicted_V": round(v_pred, 2),
            "log_V": round(log_v_pred, 4),
            "confidence": self.r_squared
        }
    
    def predict_range(self, start_t: int, end_t: int) -> List[Dict[str, float]]:
        """범위 예측"""
        return [self.predict(t) for t in range(start_t, end_t + 1)]


# ═══════════════════════════════════════════════════════════════════════════════
# LSTM 예측기 (PyTorch 기반)
# ═══════════════════════════════════════════════════════════════════════════════

if TORCH_AVAILABLE:
    class VLSTMModel(nn.Module):
        """V 예측용 LSTM 모델"""
        
        def __init__(
            self,
            input_size: int = 4,    # [M, T, s, network_density]
            hidden_size: int = 32,
            num_layers: int = 2,
            output_size: int = 1    # V
        ):
            super().__init__()
            
            self.hidden_size = hidden_size
            self.num_layers = num_layers
            
            self.lstm = nn.LSTM(
                input_size=input_size,
                hidden_size=hidden_size,
                num_layers=num_layers,
                batch_first=True,
                dropout=0.1 if num_layers > 1 else 0
            )
            
            self.fc = nn.Sequential(
                nn.Linear(hidden_size, 16),
                nn.ReLU(),
                nn.Linear(16, output_size)
            )
        
        def forward(self, x, hidden=None):
            # x: (batch, seq_len, input_size)
            lstm_out, hidden = self.lstm(x, hidden)
            # lstm_out: (batch, seq_len, hidden_size)
            
            # 마지막 타임스텝의 출력
            last_output = lstm_out[:, -1, :]
            
            # 최종 예측
            out = self.fc(last_output)
            return out, hidden


class LSTMPredictor:
    """
    LSTM 기반 V 예측기
    
    시계열 패턴 학습:
    - 입력: [M, T, s, network_density] 시퀀스
    - 출력: 미래 V
    """
    
    def __init__(self, window_size: int = 7):
        self.window_size = window_size
        self.model = None
        self.trained = False
        self.loss_history = []
        
        if TORCH_AVAILABLE:
            self.model = VLSTMModel()
    
    def fit(
        self,
        history: VHistory,
        epochs: int = 100,
        lr: float = 0.001
    ) -> Dict[str, any]:
        """LSTM 학습"""
        
        if not TORCH_AVAILABLE:
            return {"error": "PyTorch 미설치"}
        
        if len(history.points) < self.window_size + 1:
            return {"error": f"데이터 부족 (최소 {self.window_size + 1}개 필요)"}
        
        # 데이터 준비
        features = history.to_features()
        targets = history.to_targets()
        
        # 시퀀스 생성
        X, y = [], []
        for i in range(len(features) - self.window_size):
            X.append(features[i:i + self.window_size])
            y.append(targets[i + self.window_size])
        
        X = torch.tensor(X, dtype=torch.float32)
        y = torch.tensor(y, dtype=torch.float32).unsqueeze(1)
        
        # 학습
        optimizer = torch.optim.Adam(self.model.parameters(), lr=lr)
        criterion = nn.MSELoss()
        
        self.model.train()
        self.loss_history = []
        
        for epoch in range(epochs):
            optimizer.zero_grad()
            output, _ = self.model(X)
            loss = criterion(output, y)
            loss.backward()
            optimizer.step()
            
            self.loss_history.append(loss.item())
        
        self.trained = True
        
        return {
            "final_loss": round(self.loss_history[-1], 6),
            "epochs": epochs,
            "data_points": len(X)
        }
    
    def predict(self, recent_history: List[List[float]]) -> Dict[str, float]:
        """미래 V 예측"""
        
        if not TORCH_AVAILABLE or not self.trained:
            return {"error": "학습 필요 또는 PyTorch 미설치"}
        
        if len(recent_history) < self.window_size:
            return {"error": f"최근 {self.window_size}개 데이터 필요"}
        
        # 마지막 window_size 개 사용
        recent = recent_history[-self.window_size:]
        
        self.model.eval()
        with torch.no_grad():
            x = torch.tensor([recent], dtype=torch.float32)
            output, _ = self.model(x)
            predicted_v = output.item()
        
        return {
            "predicted_V": round(predicted_v, 2)
        }


# ═══════════════════════════════════════════════════════════════════════════════
# 앙상블 예측기
# ═══════════════════════════════════════════════════════════════════════════════

class EnsemblePredictor:
    """
    앙상블 예측기
    
    여러 모델의 예측을 결합:
    - LogLinear (빠르고 해석 가능)
    - LSTM (복잡한 패턴 학습)
    
    가중 평균으로 최종 예측
    """
    
    def __init__(self):
        self.log_linear = LogLinearPredictor()
        self.lstm = LSTMPredictor() if TORCH_AVAILABLE else None
        self.weights = {"log_linear": 0.5, "lstm": 0.5}
    
    def fit(self, history: VHistory) -> Dict[str, any]:
        """앙상블 학습"""
        
        results = {}
        
        # LogLinear 학습
        ll_result = self.log_linear.fit(history)
        results["log_linear"] = ll_result
        
        # LSTM 학습 (가능한 경우)
        if self.lstm:
            lstm_result = self.lstm.fit(history)
            results["lstm"] = lstm_result
        
        # 가중치 조정 (R² 기반)
        if "r_squared" in ll_result and ll_result.get("r_squared", 0) > 0:
            r2 = ll_result["r_squared"]
            self.weights["log_linear"] = r2
            self.weights["lstm"] = 1 - r2
        
        results["weights"] = self.weights
        return results
    
    def predict(self, future_t: int, recent_features: List[List[float]] = None) -> Dict[str, any]:
        """앙상블 예측"""
        
        predictions = {}
        
        # LogLinear 예측
        ll_pred = self.log_linear.predict(future_t)
        if "predicted_V" in ll_pred:
            predictions["log_linear"] = ll_pred["predicted_V"]
        
        # LSTM 예측 (가능한 경우)
        if self.lstm and self.lstm.trained and recent_features:
            lstm_pred = self.lstm.predict(recent_features)
            if "predicted_V" in lstm_pred:
                predictions["lstm"] = lstm_pred["predicted_V"]
        
        # 가중 평균
        if predictions:
            weighted_sum = 0
            total_weight = 0
            
            for model, v in predictions.items():
                weight = self.weights.get(model, 0.5)
                weighted_sum += v * weight
                total_weight += weight
            
            ensemble_v = weighted_sum / total_weight if total_weight > 0 else 0
            
            return {
                "ensemble_V": round(ensemble_v, 2),
                "individual": predictions,
                "weights": self.weights
            }
        
        return {"error": "예측 불가"}


# ═══════════════════════════════════════════════════════════════════════════════
# 싱글톤
# ═══════════════════════════════════════════════════════════════════════════════

_ensemble_instance: Optional[EnsemblePredictor] = None


def get_ensemble_predictor() -> EnsemblePredictor:
    """앙상블 예측기 싱글톤"""
    global _ensemble_instance
    if _ensemble_instance is None:
        _ensemble_instance = EnsemblePredictor()
    return _ensemble_instance


# ═══════════════════════════════════════════════════════════════════════════════
# 편의 함수
# ═══════════════════════════════════════════════════════════════════════════════

def train_predictor(v_history: List[Dict]) -> Dict:
    """
    히스토리 데이터로 예측기 학습
    
    Args:
        v_history: [{"M": 100, "T": 40, "s": 0.3, "V": 60, "network_density": 0.1}, ...]
    
    Returns:
        학습 결과
    """
    history = VHistory()
    
    for i, point in enumerate(v_history):
        history.add(VTimePoint(
            timestamp=datetime.now(),
            M=point.get("M", 0),
            T=point.get("T", 0),
            s=point.get("s", 0),
            V=point.get("V", 0),
            network_density=point.get("network_density", 0)
        ))
    
    predictor = get_ensemble_predictor()
    return predictor.fit(history)


def predict_future_v(future_months: int, recent_data: List[Dict] = None) -> Dict:
    """
    미래 V 예측
    
    Args:
        future_months: 예측할 미래 기간 (월)
        recent_data: 최근 데이터 (LSTM용)
    
    Returns:
        예측 결과
    """
    predictor = get_ensemble_predictor()
    
    recent_features = None
    if recent_data:
        recent_features = [
            [d.get("M", 0), d.get("T", 0), d.get("s", 0), d.get("network_density", 0)]
            for d in recent_data
        ]
    
    return predictor.predict(future_months, recent_features)


# ═══════════════════════════════════════════════════════════════════════════════
# 테스트
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("═" * 60)
    print("  AUTUS V Predictor Test")
    print("═" * 60)
    print(f"  NumPy: {'✅' if NUMPY_AVAILABLE else '❌'}")
    print(f"  PyTorch: {'✅' if TORCH_AVAILABLE else '❌'}")
    print("─" * 60)
    
    # 테스트 데이터 생성 (복리 성장 시뮬)
    test_history = []
    base_v = 60
    s = 0.3
    for t in range(20):
        v = base_v * ((1 + s) ** t)
        test_history.append({
            "M": 100 + t * 5,
            "T": 40 + t * 2,
            "s": s,
            "V": v,
            "network_density": min(1, 0.1 + t * 0.05)
        })
    
    # 학습
    train_result = train_predictor(test_history)
    print("\n학습 결과:")
    print(f"  LogLinear R²: {train_result.get('log_linear', {}).get('r_squared', 'N/A')}")
    print(f"  추정 Synergy: {train_result.get('log_linear', {}).get('estimated_s', 'N/A')}")
    
    # 예측
    pred = predict_future_v(24, test_history[-7:])
    print(f"\n24개월 후 예측:")
    print(f"  Ensemble V: {pred.get('ensemble_V', 'N/A')}")
