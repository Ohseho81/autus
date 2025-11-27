import numpy as np
from ai import anomaly_detection as ad

def test_train_and_detect():
    # 샘플 데이터 (정상: 0~9, 이상: 100)
    data = np.array([[i] for i in range(10)] + [[100]])
    model = ad.train_anomaly_model(data)
    anomalies = ad.detect_anomalies(model, data)
    assert len(anomalies) == 1
    assert anomalies[0] == 10  # 100이 이상치

def test_anonymize_data():
    data = [
        {'name': '홍길동', 'score': 90},
        {'name': '김철수', 'score': 80}
    ]
    anon = ad.anonymize_data(data)
    assert all(row[0] == '***' for row in anon)
