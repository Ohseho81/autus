"""
═══════════════════════════════════════════════════════════════════════════════
🤖 AUTUS Transformer Predictor v1.0 — 시계열 예측
═══════════════════════════════════════════════════════════════════════════════

Transformer 기반 V 공식 장기 예측:
- Vanilla Transformer Encoder
- PatchTST (Patch Time Series Transformer)
- 시계열 특화 아키텍처

장점:
- LSTM의 vanishing gradient 문제 없음
- 병렬 연산으로 학습 속도 빠름
- Self-attention으로 중요 타임스텝에 집중

═══════════════════════════════════════════════════════════════════════════════
"""
from dataclasses import dataclass
from typing import List, Dict, Optional, Tuple, Any
import math

# ═══════════════════════════════════════════════════════════════════════════════
# 의존성 체크
# ═══════════════════════════════════════════════════════════════════════════════

TORCH_AVAILABLE = False
NUMPY_AVAILABLE = False

try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    TORCH_AVAILABLE = True
except ImportError:
    pass

try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    pass


# ═══════════════════════════════════════════════════════════════════════════════
# Positional Encoding
# ═══════════════════════════════════════════════════════════════════════════════

if TORCH_AVAILABLE:
    class PositionalEncoding(nn.Module):
        """사인/코사인 위치 인코딩"""
        
        def __init__(self, d_model: int, max_len: int = 5000, dropout: float = 0.1):
            super().__init__()
            self.dropout = nn.Dropout(p=dropout)
            
            pe = torch.zeros(max_len, d_model)
            position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
            div_term = torch.exp(
                torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model)
            )
            
            pe[:, 0::2] = torch.sin(position * div_term)
            pe[:, 1::2] = torch.cos(position * div_term)
            pe = pe.unsqueeze(0)  # (1, max_len, d_model)
            
            self.register_buffer('pe', pe)
        
        def forward(self, x: torch.Tensor) -> torch.Tensor:
            """x: (batch, seq_len, d_model)"""
            x = x + self.pe[:, :x.size(1), :]
            return self.dropout(x)


# ═══════════════════════════════════════════════════════════════════════════════
# Vanilla Transformer for Time Series
# ═══════════════════════════════════════════════════════════════════════════════

if TORCH_AVAILABLE:
    class TimeSeriesTransformer(nn.Module):
        """
        Vanilla Transformer Encoder for Time Series Forecasting
        
        입력: (batch, seq_len, input_dim)
        출력: (batch, forecast_len, input_dim)
        """
        
        def __init__(
            self,
            input_dim: int = 4,         # [M, T, s, network_density]
            d_model: int = 64,
            nhead: int = 4,
            num_layers: int = 2,
            dim_feedforward: int = 256,
            dropout: float = 0.1,
            forecast_len: int = 12
        ):
            super().__init__()
            
            self.input_dim = input_dim
            self.d_model = d_model
            self.forecast_len = forecast_len
            
            # Input projection
            self.input_fc = nn.Linear(input_dim, d_model)
            
            # Positional encoding
            self.pos_encoder = PositionalEncoding(d_model, dropout=dropout)
            
            # Transformer encoder
            encoder_layer = nn.TransformerEncoderLayer(
                d_model=d_model,
                nhead=nhead,
                dim_feedforward=dim_feedforward,
                dropout=dropout,
                batch_first=True
            )
            self.transformer_encoder = nn.TransformerEncoder(
                encoder_layer,
                num_layers=num_layers
            )
            
            # Output projection (simple: last hidden → forecast)
            self.output_fc = nn.Linear(d_model, input_dim)
            
            # Multi-step prediction head
            self.forecast_head = nn.Linear(d_model, forecast_len * input_dim)
        
        def forward(self, src: torch.Tensor) -> torch.Tensor:
            """
            Forward pass
            
            Args:
                src: (batch, seq_len, input_dim)
            
            Returns:
                forecast: (batch, forecast_len, input_dim)
            """
            # Project input
            src = self.input_fc(src)  # (batch, seq_len, d_model)
            
            # Add positional encoding
            src = self.pos_encoder(src)
            
            # Transformer encoder
            output = self.transformer_encoder(src)  # (batch, seq_len, d_model)
            
            # Use last timestep for forecasting
            last_hidden = output[:, -1, :]  # (batch, d_model)
            
            # Generate multi-step forecast
            forecast = self.forecast_head(last_hidden)  # (batch, forecast_len * input_dim)
            forecast = forecast.view(-1, self.forecast_len, self.input_dim)
            
            return forecast
        
        def predict_autoregressive(
            self, 
            src: torch.Tensor, 
            steps: int
        ) -> torch.Tensor:
            """
            Autoregressive prediction (step by step)
            
            더 정확하지만 느림
            """
            predictions = []
            current_input = src
            
            for _ in range(steps):
                # Project and encode
                x = self.input_fc(current_input)
                x = self.pos_encoder(x)
                output = self.transformer_encoder(x)
                
                # Predict next step
                next_pred = self.output_fc(output[:, -1, :])  # (batch, input_dim)
                predictions.append(next_pred)
                
                # Append to input for next iteration
                next_pred = next_pred.unsqueeze(1)  # (batch, 1, input_dim)
                current_input = torch.cat([current_input[:, 1:, :], next_pred], dim=1)
            
            return torch.stack(predictions, dim=1)  # (batch, steps, input_dim)


# ═══════════════════════════════════════════════════════════════════════════════
# PatchTST (Simplified Implementation)
# ═══════════════════════════════════════════════════════════════════════════════

if TORCH_AVAILABLE:
    class RevIN(nn.Module):
        """
        Reversible Instance Normalization
        
        비정상 시계열 처리에 효과적
        """
        
        def __init__(self, num_features: int, eps: float = 1e-5, affine: bool = True):
            super().__init__()
            self.num_features = num_features
            self.eps = eps
            self.affine = affine
            
            if affine:
                self.weight = nn.Parameter(torch.ones(num_features))
                self.bias = nn.Parameter(torch.zeros(num_features))
        
        def forward(self, x: torch.Tensor, mode: str = 'norm') -> torch.Tensor:
            """
            x: (batch, seq_len, num_features)
            mode: 'norm' or 'denorm'
            """
            if mode == 'norm':
                self._mean = x.mean(dim=1, keepdim=True)
                self._std = x.std(dim=1, keepdim=True) + self.eps
                x = (x - self._mean) / self._std
                if self.affine:
                    x = x * self.weight + self.bias
            elif mode == 'denorm':
                if self.affine:
                    x = (x - self.bias) / self.weight
                x = x * self._std + self._mean
            return x


    class PatchTST(nn.Module):
        """
        PatchTST: A Time Series is Worth 64 Words
        
        핵심 아이디어:
        1. Patching: 시계열을 패치로 나눔 (토큰 수 감소)
        2. Channel-independence: 각 채널 독립 처리
        3. RevIN: 비정상성 처리
        
        ICLR 2023 SOTA 모델
        """
        
        def __init__(
            self,
            c_in: int = 4,              # 입력 채널 수 [M, T, s, network_density]
            seq_len: int = 96,          # 입력 시퀀스 길이
            pred_len: int = 24,         # 예측 길이
            patch_len: int = 16,        # 패치 길이
            stride: int = 8,            # 패치 stride
            d_model: int = 128,
            nhead: int = 4,
            num_layers: int = 3,
            d_ff: int = 256,
            dropout: float = 0.2,
            use_revin: bool = True
        ):
            super().__init__()
            
            self.c_in = c_in
            self.seq_len = seq_len
            self.pred_len = pred_len
            self.patch_len = patch_len
            self.stride = stride
            self.d_model = d_model
            self.use_revin = use_revin
            
            # RevIN
            if use_revin:
                self.revin = RevIN(c_in)
            
            # Patching
            self.patch_num = (seq_len - patch_len) // stride + 1
            
            # Patch embedding (각 패치를 d_model로 투영)
            self.patch_embedding = nn.Linear(patch_len, d_model)
            
            # Positional encoding
            self.pos_encoding = PositionalEncoding(d_model, max_len=self.patch_num + 10)
            
            # Transformer encoder
            encoder_layer = nn.TransformerEncoderLayer(
                d_model=d_model,
                nhead=nhead,
                dim_feedforward=d_ff,
                dropout=dropout,
                batch_first=True
            )
            self.encoder = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
            
            # Flatten head (패치 출력 → 예측)
            self.head_nf = d_model * self.patch_num
            self.head = nn.Sequential(
                nn.Flatten(start_dim=-2),
                nn.Linear(self.head_nf, pred_len),
                nn.Dropout(dropout)
            )
        
        def forward(self, x: torch.Tensor) -> torch.Tensor:
            """
            Forward pass
            
            Args:
                x: (batch, seq_len, c_in)
            
            Returns:
                forecast: (batch, pred_len, c_in)
            """
            batch_size = x.size(0)
            
            # RevIN normalization
            if self.use_revin:
                x = self.revin(x, mode='norm')
            
            # Channel independence: 각 채널 독립 처리
            # (batch, seq_len, c_in) → (batch * c_in, seq_len, 1)
            x = x.permute(0, 2, 1)  # (batch, c_in, seq_len)
            x = x.reshape(batch_size * self.c_in, self.seq_len, 1)
            
            # Patching
            # 패치 추출: (batch * c_in, patch_num, patch_len)
            patches = []
            for i in range(self.patch_num):
                start = i * self.stride
                end = start + self.patch_len
                patches.append(x[:, start:end, :])
            
            x = torch.cat(patches, dim=-1)  # (batch * c_in, patch_len, patch_num)
            x = x.permute(0, 2, 1)  # (batch * c_in, patch_num, patch_len)
            
            # Patch embedding
            x = self.patch_embedding(x)  # (batch * c_in, patch_num, d_model)
            
            # Positional encoding
            x = self.pos_encoding(x)
            
            # Transformer encoder
            x = self.encoder(x)  # (batch * c_in, patch_num, d_model)
            
            # Flatten head
            x = self.head(x)  # (batch * c_in, pred_len)
            
            # Reshape back: (batch, c_in, pred_len) → (batch, pred_len, c_in)
            x = x.reshape(batch_size, self.c_in, self.pred_len)
            x = x.permute(0, 2, 1)
            
            # RevIN denormalization
            if self.use_revin:
                x = self.revin(x, mode='denorm')
            
            return x


# ═══════════════════════════════════════════════════════════════════════════════
# V 예측 Wrapper
# ═══════════════════════════════════════════════════════════════════════════════

class VTransformerPredictor:
    """
    V 예측용 Transformer Wrapper
    
    AUTUS 통합용
    """
    
    def __init__(
        self,
        model_type: str = "patchtst",  # "vanilla" or "patchtst"
        seq_len: int = 24,
        pred_len: int = 12,
        input_dim: int = 4
    ):
        self.model_type = model_type
        self.seq_len = seq_len
        self.pred_len = pred_len
        self.input_dim = input_dim
        self.model = None
        self.trained = False
        
        if TORCH_AVAILABLE:
            if model_type == "patchtst":
                self.model = PatchTST(
                    c_in=input_dim,
                    seq_len=seq_len,
                    pred_len=pred_len,
                    patch_len=min(16, seq_len // 2),
                    stride=min(8, seq_len // 4),
                    d_model=64,
                    nhead=4,
                    num_layers=2
                )
            else:
                self.model = TimeSeriesTransformer(
                    input_dim=input_dim,
                    forecast_len=pred_len
                )
    
    def fit(
        self,
        X: List[List[List[float]]],  # (samples, seq_len, features)
        y: List[List[List[float]]],  # (samples, pred_len, features)
        epochs: int = 100,
        lr: float = 0.001
    ) -> Dict[str, Any]:
        """Transformer 학습"""
        
        if not TORCH_AVAILABLE:
            return {"error": "PyTorch 미설치"}
        
        X_tensor = torch.tensor(X, dtype=torch.float32)
        y_tensor = torch.tensor(y, dtype=torch.float32)
        
        optimizer = torch.optim.Adam(self.model.parameters(), lr=lr)
        criterion = nn.MSELoss()
        
        self.model.train()
        losses = []
        
        for epoch in range(epochs):
            optimizer.zero_grad()
            pred = self.model(X_tensor)
            loss = criterion(pred, y_tensor)
            loss.backward()
            optimizer.step()
            losses.append(loss.item())
        
        self.trained = True
        
        return {
            "model_type": self.model_type,
            "final_loss": round(losses[-1], 6),
            "epochs": epochs,
            "samples": len(X)
        }
    
    def predict(self, X: List[List[float]]) -> Dict[str, Any]:
        """미래 V 예측"""
        
        if not TORCH_AVAILABLE or not self.trained:
            return {"error": "학습 필요 또는 PyTorch 미설치"}
        
        self.model.eval()
        with torch.no_grad():
            X_tensor = torch.tensor([X], dtype=torch.float32)
            pred = self.model(X_tensor)
            pred = pred.squeeze(0).numpy().tolist()
        
        # V만 추출 (첫 번째 채널 또는 계산)
        v_predictions = []
        for step in pred:
            # step: [M, T, s, network_density] → V = (M - T) × (1 + s)
            if len(step) >= 3:
                M, T, s = step[0], step[1], step[2]
                V = (M - T) * (1 + s)
                v_predictions.append(round(V, 2))
            else:
                v_predictions.append(round(step[0], 2))
        
        return {
            "model_type": self.model_type,
            "predicted_steps": pred,
            "V_trajectory": v_predictions
        }


# ═══════════════════════════════════════════════════════════════════════════════
# 싱글톤
# ═══════════════════════════════════════════════════════════════════════════════

_transformer_predictor: Optional[VTransformerPredictor] = None


def get_transformer_predictor(model_type: str = "patchtst") -> VTransformerPredictor:
    """Transformer 예측기 싱글톤"""
    global _transformer_predictor
    if _transformer_predictor is None or _transformer_predictor.model_type != model_type:
        _transformer_predictor = VTransformerPredictor(model_type=model_type)
    return _transformer_predictor


# ═══════════════════════════════════════════════════════════════════════════════
# 테스트
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("═" * 70)
    print("  🤖 AUTUS Transformer Predictor Test")
    print("═" * 70)
    print(f"  PyTorch: {'✅' if TORCH_AVAILABLE else '❌'}")
    print(f"  NumPy: {'✅' if NUMPY_AVAILABLE else '❌'}")
    print("─" * 70)
    
    if TORCH_AVAILABLE:
        # Vanilla Transformer 테스트
        print("\n1. Vanilla Transformer:")
        model = TimeSeriesTransformer(input_dim=4, forecast_len=12)
        x = torch.randn(2, 24, 4)  # (batch=2, seq_len=24, features=4)
        y = model(x)
        print(f"   Input: {x.shape} → Output: {y.shape}")
        
        # PatchTST 테스트
        print("\n2. PatchTST:")
        model = PatchTST(c_in=4, seq_len=48, pred_len=12, patch_len=8, stride=4)
        x = torch.randn(2, 48, 4)
        y = model(x)
        print(f"   Input: {x.shape} → Output: {y.shape}")
        
        print("\n✅ 모든 모델 정상 작동")
    else:
        print("\n❌ PyTorch 미설치 - 테스트 건너뜀")
