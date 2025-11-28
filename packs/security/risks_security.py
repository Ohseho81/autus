from packs.security.enforcer import Risk, RiskCategory, Severity, enforcer

def dummy_prevention():
    pass

def dummy_detection():
    return False

def dummy_response():
    pass

def dummy_recovery():
    pass

def register_security_risks():
    sql_injection = Risk(
        name="SQL Injection Attack",
        category=RiskCategory.SECURITY,
        severity=Severity.CRITICAL,
        description="Detects SQL injection attempts in user input.",
        prevention=dummy_prevention,
        detection=dummy_detection,
        response=dummy_response,
        recovery=dummy_recovery
    )
    enforcer.register_risk(sql_injection)
