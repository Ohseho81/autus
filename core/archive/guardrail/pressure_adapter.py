import time
from collections import deque

class QueuePressureAdapter:
    def __init__(self, window=50, max_queue=100):
        self.window = window
        self.max_queue = max_queue
        self.queue_lengths = deque(maxlen=window)
        self.last_ts = time.time()
        self._last_pressure = 0.0

    def observe(self, queue_len: int):
        self.queue_lengths.append(queue_len)

    def compute(self):
        if not self.queue_lengths:
            return {"pressure": 0.0, "sigma": 0.0, "dP_dt": 0.0}

        avg = sum(self.queue_lengths) / len(self.queue_lengths)
        variance = sum((x - avg) ** 2 for x in self.queue_lengths) / len(self.queue_lengths)

        pressure = min(avg / self.max_queue, 1.0)
        sigma = min((variance ** 0.5) / self.max_queue, 1.0)

        now = time.time()
        dt = max(now - self.last_ts, 1e-6)
        dP_dt = (pressure - self._last_pressure) / dt

        self._last_pressure = pressure
        self.last_ts = now

        return {
            "pressure": round(pressure, 4),
            "sigma": round(sigma, 4),
            "dP_dt": round(min(abs(dP_dt), 1.0), 4)
        }
