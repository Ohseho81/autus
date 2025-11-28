import os
import re

class SimpleRuleEngine:
    def __init__(self, rule_dir="rules") -> None:
        self.rule_dir = rule_dir
        self.rules = []
        self.load_rules()

    def load_rules(self):
        self.rules = []
        for fname in os.listdir(self.rule_dir):
            if fname.endswith(".dsl"):
                with open(os.path.join(self.rule_dir, fname), encoding="utf-8") as f:
                    self.rules.append(f.read())

    def evaluate(self, context):
        # 매우 단순한 DSL 파서: when/then만 지원
        for rule in self.rules:
            # rule 블록 내에서 when/then 추출
            m = re.search(r'when (.+?)\n\s*then (.+?)\n?}', rule, re.DOTALL)
            if not m:
                continue
            cond, action = m.group(1).strip(), m.group(2).strip()
            cond_py = cond.replace('risk.severity', "risk['severity']")
            try:
                if eval(cond_py, {}, {'risk': context.get('risk', {})}):
                    if action.startswith("reject("):
                        msg = action[len("reject("): -1].strip('"')
                        return {"result": "rejected", "msg": msg}
            except Exception as e:
                continue
        return {"result": "accepted"}

global_rule_engine = SimpleRuleEngine()
