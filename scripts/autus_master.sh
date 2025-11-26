#!/bin/bash
echo "🚀 AUTUS Master Automation"
echo "=========================="

ACTION=$1

case $ACTION in
    dev)
        echo "🔧 Development mode"
        ./scripts/autus_infinite_loop.sh &
        ./scripts/monitor_loop.sh
        ;;
    deploy)
        echo "🚀 Deploying..."
        ./scripts/security_full_check.sh
        ./scripts/release.sh
        ./scripts/deploy_zero_downtime.sh
        ;;
    monitor)
        echo "📊 Monitoring..."
        python dashboard_server.py &
        ./scripts/realtime_anomaly.sh &
        ./scripts/log_analyzer.sh
        ;;
    heal)
        echo "🔧 Self-healing..."
        ./scripts/self_heal_advanced.sh
        ;;
    optimize)
        echo "⚡ Optimizing..."
        ./scripts/optimize.sh
        ;;
    all)
        echo "🌟 Full automation..."
        $0 dev &
        $0 monitor &
        echo "✅ All systems running"
        ;;
    status)
        echo "📊 Status Report"
        echo "================"
        echo "Tests: $(python -m pytest -q --tb=no 2>&1 | tail -1)"
        echo "Scripts: $(ls scripts/*.sh | wc -l)"
        echo "Packs: $(ls packs/development/*.yaml | wc -l)"
        echo "Endpoints: $(grep -c include_router server/main.py)"
        ;;
    *)
        echo "Usage: $0 {dev|deploy|monitor|heal|optimize|all|status}"
        ;;
esac
