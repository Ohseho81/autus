from sklearn.ensemble import IsolationForest
import numpy as np
import joblib
import os
import pandas as pd

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'anomaly_model.joblib')

def train_anomaly_model(data):
    model = IsolationForest(contamination=0.01)
    model.fit(data)
    joblib.dump(model, MODEL_PATH)  # 모델 저장
    return model

def load_anomaly_model():
    if os.path.exists(MODEL_PATH):
        return joblib.load(MODEL_PATH)
    return None

def detect_anomalies(model, new_data):
    return model.predict(new_data)

def anonymize_data(data):
    df = pd.DataFrame(data)
    for col in df.select_dtypes(include='object').columns:
        df[col] = df[col].apply(lambda x: '***' if isinstance(x, str) else x)
    return df.values.tolist()
