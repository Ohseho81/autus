WHEN risk.severity == "critical" AND risk.category == "SECURITY"
THEN notify("admin") AND escalate("security_team")
