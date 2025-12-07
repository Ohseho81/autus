# 🔴 PHASE 1: VS Code 작업 (Import 에러 해결)

> **상태**: 터미널 Phase 1 완료 후
> **시간**: 1.5시간
> **목표**: 9개 파일의 모든 import 에러 해결

---

## 🎯 작업 목록

### File 1️⃣: `evolved/kafka_producer.py`
**위치**: Line 6-7  
**작업**: kafka import를 try-except로 감싸기

```python
# ❌ 현재
from kafka import KafkaProducer, KafkaConsumer
from kafka.errors import KafkaError

# ✅ 변경
try:
    from kafka import KafkaProducer, KafkaConsumer
    from kafka.errors import KafkaError
    KAFKA_AVAILABLE = True
except ImportError:
    KAFKA_AVAILABLE = False
    logger.warning("Kafka not available. Install: pip install kafka-python")
    KafkaProducer = None
    KafkaConsumer = None
    KafkaError = None
```

---

### File 2️⃣: `evolved/spark_processor.py`
**위치**: Line 28, 62, 118, 167, 260 (5곳)  
**작업**: pyspark import를 try-except로 감싸기

**Line 28 근처**:
```python
# ❌ 현재
from pyspark.sql import SparkSession

# ✅ 변경
try:
    from pyspark.sql import SparkSession
    SPARK_AVAILABLE = True
except ImportError:
    SPARK_AVAILABLE = False
    SparkSession = None
```

**다른 4곳도 동일한 패턴으로 수정**

---

### File 3️⃣: `evolved/ml_pipeline.py`
**위치**: Line 91, 126, 127, 194, 236, 276 (6곳)  
**작업**: sklearn import를 try-except로 감싸기

**Line 91 근처**:
```python
# ❌ 현재
from sklearn.preprocessing import StandardScaler

# ✅ 변경
try:
    from sklearn.preprocessing import StandardScaler
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    StandardScaler = None
```

---

### File 4️⃣: `evolved/onnx_models.py`
**위치**: Line 48, 49, 90, 129, 196, 211 (7곳)  
**작업**: skl2onnx, tf2onnx, torch, onnxruntime import를 try-except로 감싸기

**Line 48-49 근처**:
```python
# ❌ 현재
import skl2onnx
from skl2onnx.common.data_types import FloatTensorType

# ✅ 변경
try:
    import skl2onnx
    from skl2onnx.common.data_types import FloatTensorType
    SKL2ONNX_AVAILABLE = True
except ImportError:
    SKL2ONNX_AVAILABLE = False
```

---

### File 5️⃣: `evolved/spark_distributed.py`
**위치**: Line 79, 323, 353 (3곳)  
**작업**: pyspark import를 try-except로 감싸기

**Line 79 근처**:
```python
# ❌ 현재
from pyspark import SparkConf, SparkContext

# ✅ 변경
try:
    from pyspark import SparkConf, SparkContext
    SPARK_AVAILABLE = True
except ImportError:
    SPARK_AVAILABLE = False
    SparkConf = None
    SparkContext = None
```

---

### File 6️⃣: `evolved/celery_app.py`
**위치**: Line 6-8  
**작업**: celery, kombu import를 try-except로 감싸기

```python
# ❌ 현재
from celery import Celery, Task
from celery.schedules import crontab
from kombu import Exchange, Queue

# ✅ 변경
try:
    from celery import Celery, Task
    from celery.schedules import crontab
    from kombu import Exchange, Queue
    CELERY_AVAILABLE = True
except ImportError:
    CELERY_AVAILABLE = False
    logger.warning("Celery not available")
```

---

### File 7️⃣: `evolved/tasks.py`
**위치**: Line 309, 322  
**작업**: celery.group import를 try-except로 감싸기

```python
# ❌ 현재
from celery import group

# ✅ 변경
try:
    from celery import group
    CELERY_GROUP_AVAILABLE = True
except ImportError:
    CELERY_GROUP_AVAILABLE = False
    group = None
```

---

### File 8️⃣: `evolved/kafka_consumer_service.py`
**위치**: Line 120  
**상태**: ⚠️ 이미 try-except 있음 (확인만)

```python
# ✅ 이미 구현됨
try:
    from kafka import KafkaConsumer
    KAFKA_AVAILABLE = True
except ImportError:
    KAFKA_AVAILABLE = False
```

---

### File 9️⃣: `test_v4_8_kubernetes.py`
**위치**: Line 247  
**작업**: sklearn import를 try-except로 감싸기

```python
# ❌ 현재
from sklearn.ensemble import RandomForestRegressor

# ✅ 변경
try:
    from sklearn.ensemble import RandomForestRegressor
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    RandomForestRegressor = None
```

---

## 📋 작업 체크리스트

```
파일별 수정 진행 상황:

□ File 1: evolved/kafka_producer.py (5분)
  └─ kafka import를 try-except로 감싸기

□ File 2: evolved/spark_processor.py (10분)
  └─ pyspark import 5곳을 try-except로 감싸기

□ File 3: evolved/ml_pipeline.py (12분)
  └─ sklearn import 6곳을 try-except로 감싸기

□ File 4: evolved/onnx_models.py (15분)
  └─ skl2onnx, tf2onnx, torch, onnxruntime import 7곳

□ File 5: evolved/spark_distributed.py (8분)
  └─ pyspark import 3곳을 try-except로 감싸기

□ File 6: evolved/celery_app.py (5분)
  └─ celery, kombu import를 try-except로 감싸기

□ File 7: evolved/tasks.py (5분)
  └─ celery.group import를 try-except로 감싸기

□ File 8: evolved/kafka_consumer_service.py (1분)
  └─ 이미 구현됨 (확인만)

□ File 9: test_v4_8_kubernetes.py (3분)
  └─ sklearn import를 try-except로 감싸기

총 시간: 약 1시간
```

---

## 🎯 다음 단계

### 모든 파일 수정 완료 후
```bash
# 터미널에서 검증
python -c "from evolved.kafka_producer import *; print('✅ All imports OK')"
pytest test_v4_8_kubernetes.py -v --tb=short
```

### 그 다음
1. main.py 라우터 등록 (VS Code)
2. api/errors.py 생성 (VS Code)
3. main.py에 exception handler 추가 (VS Code)

---

## 💡 팁

- 각 파일을 Find & Replace (Ctrl+H)로 빠르게 수정 가능
- 변경 후 즉시 저장 (Ctrl+S)
- 에러 있으면 Problems 패널(Ctrl+Shift+M) 에서 확인

