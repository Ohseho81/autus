import json
import os
from datetime import datetime

class JSONLineLogger:
    def __init__(self, log_dir="logs", log_file="autus.log") -> None:
        self.log_dir = log_dir
        self.log_file = log_file
        os.makedirs(log_dir, exist_ok=True)
        self.path = os.path.join(log_dir, log_file)

    def log(self, level, event, **kwargs):
        entry = {
            "ts": datetime.utcnow().isoformat() + "Z",
            "level": level,
            "event": event,
            **kwargs
        }
        with open(self.path, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")

    def search(self, keyword):
        results = []
        with open(self.path, encoding="utf-8") as f:
            for line in f:
                if keyword in line:
                    results.append(json.loads(line))
        return results

global_logger = JSONLineLogger()
