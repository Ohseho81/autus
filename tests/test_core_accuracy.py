"""
AUTUS 핵심 정확도 테스트
출석, 결제, 미수금 계산의 100% 정확성 검증
"""

import pytest
from datetime import date, datetime, timedelta
from decimal import Decimal

# ===== 출석 정확도 테스트 =====

class TestAttendanceAccuracy:
    """출석 체크 100% 정확성"""

    def test_attendance_basic(self):
        """기본 출석 체크"""
        student_id = "student-1"
        schedule_id = "schedule-1"
        attendance_date = date.today()

        # 출석 체크
        result = check_attendance(student_id, schedule_id, attendance_date)

        # 검증
        assert result.student_id == student_id
        assert result.schedule_id == schedule_id
        assert result.date == attendance_date
        assert result.status == "present"

    def test_attendance_duplicate_prevention(self):
        """중복 출석 방지"""
        student_id = "student-1"
        schedule_id = "schedule-1"
        attendance_date = date.today()

        # 첫 번째 출석
        check_attendance(student_id, schedule_id, attendance_date)

        # 두 번째 출석 시도 - 에러 발생해야 함
        with pytest.raises(DuplicateAttendanceError):
            check_attendance(student_id, schedule_id, attendance_date)

    def test_attendance_no_data_loss(self):
        """데이터 손실 방지 - 트랜잭션 실패 시 롤백"""
        student_id = "student-1"
        schedule_id = "schedule-1"
        attendance_date = date.today()

        # 출석 체크 + 알림 발송 (알림 실패 시뮬레이션)
        with pytest.raises(NotificationError):
            check_attendance_with_notification(
                student_id,
                schedule_id,
                attendance_date,
                force_notification_fail=True
            )

        # 출석 기록이 저장되지 않았는지 확인
        count = count_attendance_records(student_id, attendance_date)
        assert count == 0, "알림 실패 시 출석 기록도 롤백되어야 함"

    def test_attendance_count_accuracy(self):
        """출석 횟수 계산 정확도"""
        student_id = "student-1"
        schedule_id = "schedule-1"

        # 10일간 출석
        for i in range(10):
            attendance_date = date.today() - timedelta(days=i)
            check_attendance(student_id, schedule_id, attendance_date)

        # 출석 횟수 확인
        count = get_attendance_count(student_id, schedule_id)
        assert count == 10

        # 다른 방법으로도 확인 (이중 검증)
        count_verify = count_attendance_records(student_id)
        assert count == count_verify

# ===== 결제 정확도 테스트 =====

class TestPaymentAccuracy:
    """결제 계산 100% 정확성"""

    def test_payment_amount_calculation(self):
        """결제 금액 계산 정확도"""
        total_amount = 200000
        paid_amount = 0

        # 첫 번째 결제
        payment1 = process_payment({
            'student_id': 'student-1',
            'amount': 100000
        })

        assert payment1.total_amount == 200000
        assert payment1.paid_amount == 100000
        assert payment1.remaining_amount == 100000

        # 두 번째 결제
        payment2 = process_payment({
            'student_id': 'student-1',
            'amount': 50000
        })

        assert payment2.total_amount == 200000
        assert payment2.paid_amount == 150000
        assert payment2.remaining_amount == 50000

    def test_payment_overpayment_prevention(self):
        """초과 납부 방지"""
        total_amount = 200000
        paid_amount = 180000

        # 30,000원 납부 시도 (초과)
        with pytest.raises(OverpaymentError) as exc:
            process_payment({
                'student_id': 'student-1',
                'total_amount': total_amount,
                'paid_amount': paid_amount,
                'new_payment': 30000
            })

        assert "초과 납부" in str(exc.value)
        assert exc.value.details['allowed_amount'] == 20000

    def test_payment_decimal_precision(self):
        """결제 금액 소수점 정확도 (정수만 허용)"""
        # 소수점 금액 입력 시 에러
        with pytest.raises(ValueError):
            process_payment({
                'student_id': 'student-1',
                'amount': 199999.99
            })

    def test_payment_negative_amount_prevention(self):
        """음수 금액 방지"""
        with pytest.raises(ValueError) as exc:
            process_payment({
                'student_id': 'student-1',
                'amount': -100000
            })

        assert "음수" in str(exc.value)

    def test_payment_zero_amount_prevention(self):
        """0원 결제 방지"""
        with pytest.raises(ValueError) as exc:
            process_payment({
                'student_id': 'student-1',
                'amount': 0
            })

        assert "0원" in str(exc.value)

    def test_payment_fee_calculation(self):
        """수수료 계산 정확도"""
        amount = 1000000
        fee_rate = Decimal('0.8')  # 0.8%

        # 결제선생 수수료 계산
        fee = calculate_payment_fee(amount, fee_rate)

        # 정확히 8,000원이어야 함
        assert fee == 8000

        # 실수령액 확인
        net_amount = amount - fee
        assert net_amount == 992000

    def test_payment_concurrent_processing(self):
        """동시 결제 처리 (Race Condition 방지)"""
        import threading

        student_id = 'student-1'
        total_amount = 200000

        # 두 개의 스레드에서 동시에 100,000원 결제 시도
        errors = []

        def attempt_payment():
            try:
                process_payment({
                    'student_id': student_id,
                    'amount': 100000
                })
            except Exception as e:
                errors.append(e)

        threads = [
            threading.Thread(target=attempt_payment),
            threading.Thread(target=attempt_payment)
        ]

        for t in threads:
            t.start()
        for t in threads:
            t.join()

        # 하나는 성공, 하나는 실패해야 함
        payment = get_payment(student_id)
        assert payment.paid_amount == 100000
        assert len(errors) == 1  # 하나는 에러 발생

# ===== 미수금 정확도 테스트 =====

class TestUnpaidAccuracy:
    """미수금 계산 100% 정확성"""

    def test_unpaid_amount_calculation(self):
        """미수금 계산 정확도"""
        invoices = [
            {'total': 200000, 'paid': 200000},  # 완납
            {'total': 300000, 'paid': 150000},  # 미수 150,000
            {'total': 250000, 'paid': 0},       # 미수 250,000
        ]

        total_unpaid = calculate_total_unpaid(invoices)

        assert total_unpaid == 400000  # 150,000 + 250,000

    def test_unpaid_overdue_calculation(self):
        """연체 일수 계산 정확도"""
        due_date = date.today() - timedelta(days=7)

        overdue_days = calculate_overdue_days(due_date)

        assert overdue_days == 7

    def test_unpaid_status_transition(self):
        """청구서 상태 전환 정확성"""
        invoice_id = 'invoice-1'

        # 초기: sent
        invoice = create_invoice({
            'student_id': 'student-1',
            'amount': 200000,
            'due_date': date.today() + timedelta(days=7)
        })
        send_invoice(invoice_id)

        assert invoice.status == 'sent'

        # 부분 납부: partial
        process_payment({'invoice_id': invoice_id, 'amount': 100000})
        invoice = get_invoice(invoice_id)

        assert invoice.status == 'partial'

        # 전액 납부: paid
        process_payment({'invoice_id': invoice_id, 'amount': 100000})
        invoice = get_invoice(invoice_id)

        assert invoice.status == 'paid'

    def test_unpaid_list_consistency(self):
        """미수금 목록 일관성 (payments vs invoices)"""
        # payments 테이블에서 미수금 조회
        unpaid_from_payments = get_unpaid_from_payments()

        # invoices 테이블에서 미수금 조회
        unpaid_from_invoices = get_unpaid_from_invoices()

        # 두 결과가 동일해야 함
        assert len(unpaid_from_payments) == len(unpaid_from_invoices)

        for p, i in zip(unpaid_from_payments, unpaid_from_invoices):
            assert p.student_id == i.student_id
            assert p.unpaid_amount == i.unpaid_amount

# ===== 데이터 무결성 테스트 =====

class TestDataIntegrity:
    """데이터 무결성 100%"""

    def test_referential_integrity(self):
        """참조 무결성 (FK 제약)"""
        # 존재하지 않는 학생으로 결제 시도
        with pytest.raises(ForeignKeyError):
            create_payment({
                'student_id': 'non-existent-student',
                'amount': 200000
            })

    def test_unique_constraint(self):
        """유일성 제약 (중복 방지)"""
        student_id = 'student-1'
        schedule_id = 'schedule-1'
        booking_date = date.today()

        # 첫 번째 예약
        create_booking({
            'student_id': student_id,
            'schedule_id': schedule_id,
            'booking_date': booking_date
        })

        # 중복 예약 시도
        with pytest.raises(UniqueConstraintError):
            create_booking({
                'student_id': student_id,
                'schedule_id': schedule_id,
                'booking_date': booking_date
            })

    def test_check_constraint(self):
        """체크 제약 (유효성 검증)"""
        # 잘못된 타입
        with pytest.raises(CheckConstraintError):
            create_profile({
                'type': 'invalid_type',  # student, parent, coach만 허용
                'name': '김철수'
            })

    def test_not_null_constraint(self):
        """NOT NULL 제약"""
        # 필수 필드 누락
        with pytest.raises(NotNullError):
            create_profile({
                'type': 'student',
                # name 누락
            })

    def test_cascade_delete(self):
        """Cascade 삭제 일관성"""
        organization_id = 'org-1'

        # 조직 생성
        create_organization({'id': organization_id, 'name': '온리쌤'})

        # 학생 3명 생성
        for i in range(3):
            create_profile({
                'organization_id': organization_id,
                'type': 'student',
                'name': f'학생{i+1}'
            })

        # 조직 삭제
        delete_organization(organization_id)

        # 학생도 모두 삭제되었는지 확인
        students = get_profiles_by_organization(organization_id)
        assert len(students) == 0

# ===== 성능 정확도 테스트 =====

class TestPerformanceAccuracy:
    """성능 목표 달성 검증"""

    def test_api_response_time(self):
        """API 응답 시간 <200ms (P95)"""
        import time

        response_times = []

        for _ in range(100):
            start = time.time()
            response = api_client.get('/api/profiles?type=student')
            end = time.time()

            response_times.append((end - start) * 1000)

        p95 = sorted(response_times)[95]
        assert p95 < 200, f"P95 응답 시간: {p95:.2f}ms > 200ms"

    def test_database_query_time(self):
        """DB 쿼리 시간 <50ms"""
        import time

        start = time.time()
        result = db.execute("""
            SELECT * FROM profiles
            WHERE organization_id = %s AND type = 'student'
            LIMIT 100
        """, (organization_id,))
        end = time.time()

        query_time = (end - start) * 1000
        assert query_time < 50, f"쿼리 시간: {query_time:.2f}ms > 50ms"

# ===== 보안 테스트 =====

class TestSecurity:
    """보안 100%"""

    def test_rls_policy_enforcement(self):
        """RLS 정책 강제 적용"""
        # 온리쌤 강남 관리자로 로그인
        session1 = login_as_admin('onlyssam-gangnam')

        # 챔피언스포츠클럽 관리자로 로그인
        session2 = login_as_admin('champion-sports')

        # 온리쌤 학생 조회
        students1 = session1.get_students()

        # 챔피언 학생 조회
        students2 = session2.get_students()

        # 두 결과가 완전히 달라야 함
        student_ids1 = {s.id for s in students1}
        student_ids2 = {s.id for s in students2}

        assert len(student_ids1 & student_ids2) == 0, "조직 간 데이터 격리 실패"

    def test_sql_injection_prevention(self):
        """SQL Injection 방지"""
        # 악의적 입력
        malicious_input = "'; DROP TABLE profiles; --"

        # 검색 시도 - 에러가 아니라 빈 결과여야 함
        result = search_students(malicious_input)

        assert isinstance(result, list)
        assert len(result) == 0

        # profiles 테이블이 여전히 존재하는지 확인
        students = get_all_students()
        assert len(students) > 0

    def test_sensitive_data_encryption(self):
        """민감 정보 암호화"""
        # Universal Profile 생성
        profile = create_universal_profile({
            'phone': '010-1234-5678',
            'email': 'test@example.com'
        })

        # DB에서 직접 조회
        raw_data = db.execute("""
            SELECT phone_hash, email_hash
            FROM universal_profiles
            WHERE id = %s
        """, (profile.id,))

        # 원본 값이 저장되지 않았는지 확인
        assert '010-1234-5678' not in raw_data[0]
        assert 'test@example.com' not in raw_data[0]

        # 해시값인지 확인
        assert len(raw_data[0]['phone_hash']) == 64  # SHA256 = 64 hex chars

# ===== 실행 =====

if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
