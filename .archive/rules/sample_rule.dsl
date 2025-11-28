# AUTUS DSL 정책 샘플
rule "NoCriticalRisk" {
    when risk.severity == "CRITICAL"
    then reject("치명적 리스크는 허용되지 않습니다.")
}
