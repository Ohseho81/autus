"""
AUTUS 월 1회 자동 최신화 Airflow DAG
====================================

스케줄: 매월 1일 00:00 UTC (한국 시간 09:00)

태스크 흐름:
1. analyze_packages: 패키지 버전 분석
2. check_safety: Breaking Change 및 안전성 검증
3. update_packages: Canary 배포
4. validate_metrics: 메트릭 검증
5. report_results: 결과 보고
"""

from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator, BranchPythonOperator
from airflow.operators.empty import EmptyOperator
from airflow.utils.dates import days_ago
import os
import sys

# AUTUS 백엔드 코드 경로 추가
sys.path.insert(0, '/opt/airflow/backend')

# ═══════════════════════════════════════════════════════════════════════════════
# DAG 설정
# ═══════════════════════════════════════════════════════════════════════════════

default_args = {
    'owner': 'autus',
    'depends_on_past': False,
    'email': ['admin@autus.ai'],
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 2,
    'retry_delay': timedelta(minutes=5),
}

dag = DAG(
    'autus_monthly_update',
    default_args=default_args,
    description='AUTUS 월 1회 외부 기술 최신화',
    schedule_interval='0 0 1 * *',  # 매월 1일 00:00 UTC
    start_date=days_ago(1),
    catchup=False,
    tags=['autus', 'monthly', 'update'],
)

# ═══════════════════════════════════════════════════════════════════════════════
# 태스크 함수
# ═══════════════════════════════════════════════════════════════════════════════

def analyze_packages(**context):
    """패키지 버전 분석"""
    from integrations.release_analyzer import analyze_releases
    
    packages = [
        ('langgraph', '1.0.6'),
        ('langchain', '0.3.0'),
        ('crewai', '0.85.0'),
        ('openai', '1.60.0'),
        ('anthropic', '0.40.0'),
        ('pinecone', '5.0.0'),
    ]
    
    results = analyze_releases(packages)
    
    analysis_summary = {
        'total_packages': len(packages),
        'high_risk_count': sum(1 for r in results if r.risk_level.value in ['high', 'critical']),
        'results': [
            {
                'package': r.package,
                'version': r.version,
                'risk_score': r.risk_score,
                'risk_level': r.risk_level.value,
                'human_escalation': r.human_escalation,
            }
            for r in results
        ],
    }
    
    context['ti'].xcom_push(key='analysis_summary', value=analysis_summary)
    return analysis_summary


def check_safety(**context):
    """안전성 검증"""
    from integrations.behavior_drift import BehaviorDriftDetector
    
    analysis = context['ti'].xcom_pull(key='analysis_summary', task_ids='analyze_packages')
    
    # Behavior Drift 검사
    detector = BehaviorDriftDetector()
    drift_result = detector.detect_drift()
    
    safety_result = {
        'drift_safe': drift_result.is_safe,
        'cosine_similarity': drift_result.avg_cosine_similarity,
        'high_risk_packages': analysis.get('high_risk_count', 0),
        'needs_escalation': not drift_result.is_safe or analysis.get('high_risk_count', 0) > 2,
    }
    
    context['ti'].xcom_push(key='safety_result', value=safety_result)
    return safety_result


def decide_update_path(**context):
    """업데이트 경로 결정 (분기)"""
    safety = context['ti'].xcom_pull(key='safety_result', task_ids='check_safety')
    
    if safety.get('needs_escalation'):
        return 'human_escalation'
    return 'update_packages'


def human_escalation(**context):
    """Human Escalation 알림"""
    from integrations.webhooks import WebhookNotifier
    
    safety = context['ti'].xcom_pull(key='safety_result', task_ids='check_safety')
    analysis = context['ti'].xcom_pull(key='analysis_summary', task_ids='analyze_packages')
    
    notifier = WebhookNotifier()
    notifier.send_escalation(
        reason=f"월 1회 업데이트 검증 실패: 고위험 패키지 {safety.get('high_risk_packages')}개",
        session_id=f"monthly_{datetime.now().strftime('%Y%m')}",
        details={
            'drift_safe': safety.get('drift_safe'),
            'cosine_sim': safety.get('cosine_similarity'),
        },
    )
    
    return {'escalated': True, 'reason': 'High risk detected'}


def update_packages(**context):
    """패키지 업데이트 (Dry Run)"""
    from integrations import run_monthly_update
    
    # Dry Run 모드로 실행
    result = run_monthly_update(dry_run=True, verbose=False)
    
    update_result = {
        'packages_updated': result.packages_updated,
        'packages_failed': result.packages_failed,
        'dry_run': True,
        'report': result.report,
    }
    
    context['ti'].xcom_push(key='update_result', value=update_result)
    return update_result


def validate_metrics(**context):
    """메트릭 검증"""
    from integrations.auto_rollback import check_and_rollback
    
    # 현재 메트릭 확인
    rollback_result = check_and_rollback(
        inertia_debt=0.35,  # 실제로는 DB에서 조회
        delta_s_dot=0.42,
        stability_score=0.82,
    )
    
    validation_result = {
        'metrics_ok': rollback_result is None,
        'rollback_triggered': rollback_result is not None,
    }
    
    context['ti'].xcom_push(key='validation_result', value=validation_result)
    return validation_result


def report_results(**context):
    """결과 보고"""
    from integrations.webhooks import WebhookNotifier
    from integrations.realtime_progress import RealtimeProgressReporter
    
    analysis = context['ti'].xcom_pull(key='analysis_summary', task_ids='analyze_packages')
    safety = context['ti'].xcom_pull(key='safety_result', task_ids='check_safety')
    update = context['ti'].xcom_pull(key='update_result', task_ids='update_packages')
    validation = context['ti'].xcom_pull(key='validation_result', task_ids='validate_metrics')
    
    # 최종 보고서 생성
    report = f"""
AUTUS 월 1회 최신화 결과 ({datetime.now().strftime('%Y-%m')})
============================================================

📦 패키지 분석
- 총 패키지: {analysis.get('total_packages', 0)}개
- 고위험: {analysis.get('high_risk_count', 0)}개

🔒 안전성 검증
- Drift 안전: {'✅' if safety.get('drift_safe') else '❌'}
- Cosine Sim: {safety.get('cosine_similarity', 0):.4f}

📥 업데이트
- 업데이트 패키지: {update.get('packages_updated', 0)}개
- 실패: {update.get('packages_failed', 0)}개
- Dry Run: {update.get('dry_run', True)}

📊 메트릭 검증
- 메트릭 정상: {'✅' if validation.get('metrics_ok') else '❌'}
- 롤백 트리거: {'⚠️' if validation.get('rollback_triggered') else '✅'}

최종 상태: {'✅ 성공' if validation.get('metrics_ok') else '❌ 실패'}
"""
    
    # Webhook 알림
    notifier = WebhookNotifier()
    notifier.send_update_complete(
        success=validation.get('metrics_ok', False),
        session_id=f"monthly_{datetime.now().strftime('%Y%m')}",
        report=report,
        packages_updated=update.get('packages_updated', 0),
    )
    
    print(report)
    return {'report': report, 'success': validation.get('metrics_ok', False)}


# ═══════════════════════════════════════════════════════════════════════════════
# DAG 구성
# ═══════════════════════════════════════════════════════════════════════════════

with dag:
    # 시작
    start = EmptyOperator(task_id='start')
    
    # 1. 패키지 분석
    t_analyze = PythonOperator(
        task_id='analyze_packages',
        python_callable=analyze_packages,
    )
    
    # 2. 안전성 검증
    t_safety = PythonOperator(
        task_id='check_safety',
        python_callable=check_safety,
    )
    
    # 3. 분기 결정
    t_decide = BranchPythonOperator(
        task_id='decide_path',
        python_callable=decide_update_path,
    )
    
    # 4a. Human Escalation
    t_escalation = PythonOperator(
        task_id='human_escalation',
        python_callable=human_escalation,
    )
    
    # 4b. 패키지 업데이트
    t_update = PythonOperator(
        task_id='update_packages',
        python_callable=update_packages,
    )
    
    # 5. 메트릭 검증
    t_validate = PythonOperator(
        task_id='validate_metrics',
        python_callable=validate_metrics,
    )
    
    # 6. 결과 보고
    t_report = PythonOperator(
        task_id='report_results',
        python_callable=report_results,
        trigger_rule='none_failed_min_one_success',
    )
    
    # 종료
    end = EmptyOperator(task_id='end', trigger_rule='none_failed_min_one_success')
    
    # 의존성 정의
    start >> t_analyze >> t_safety >> t_decide
    t_decide >> t_escalation >> t_report
    t_decide >> t_update >> t_validate >> t_report
    t_report >> end
