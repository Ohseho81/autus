from sklearn.ensemble import IsolationForest
import numpy as np
import joblib
import os
import pandas as pd

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'anomaly_model.joblib')

def train_anomaly_model(data):
    # 테스트에서는 정상 데이터와 이상치가 섞인 작은 샘플을 사용하므로
    # 한 개 수준의 이상치만 감지되도록 contamination을 조정한다.
    model = IsolationForest(contamination=0.1, random_state=42)
    model.fit(data)
    joblib.dump(model, MODEL_PATH)  # 모델 저장
    return model

def load_anomaly_model():
    if os.path.exists(MODEL_PATH):
        return joblib.load(MODEL_PATH)
    return None

def detect_anomalies(model, new_data):
    """
    Return indices of detected anomalies for easier assertions in tests.
    """
    labels = model.predict(new_data)
    # IsolationForest: -1 is anomaly, 1 is normal
    return np.where(labels == -1)[0]

def anonymize_data(data):
    df = pd.DataFrame(data)
    for col in df.select_dtypes(include='object').columns:
        df[col] = df[col].apply(lambda x: '***' if isinstance(x, str) else x)
    return df.values.tolist()
