-- Cleanup test data (record_id=TEXT, atb_students.id=UUID → id::text로 맞춤)
DELETE FROM audit_logs WHERE record_id IN (SELECT id::text FROM atb_students WHERE name = 'AUDIT_TEST');
DELETE FROM atb_students WHERE name = 'AUDIT_TEST';

-- Final comprehensive status
SELECT 'TABLES' as category, count(*)::text as value FROM pg_stat_user_tables WHERE schemaname = 'public'
UNION ALL SELECT 'CHECK_CONSTRAINTS', count(*)::text FROM pg_constraint WHERE connamespace = 'public'::regnamespace AND contype = 'c'
UNION ALL SELECT 'TRIGGERS', count(*)::text FROM information_schema.triggers WHERE trigger_schema = 'public'
UNION ALL SELECT 'FUNCTIONS', count(*)::text FROM pg_proc WHERE pronamespace = 'public'::regnamespace
UNION ALL SELECT 'STUDENTS', count(*)::text FROM atb_students
UNION ALL SELECT 'ORGANIZATIONS', count(*)::text FROM organizations
UNION ALL SELECT 'PROGRAMS', count(*)::text FROM programs
UNION ALL SELECT 'CLASS_LOGS', count(*)::text FROM class_logs
UNION ALL SELECT 'ATTENDANCE', count(*)::text FROM atb_attendance
UNION ALL SELECT 'PAYMENTS', count(*)::text FROM payments
UNION ALL SELECT 'CONSULTATIONS', count(*)::text FROM consultations
UNION ALL SELECT 'SCHEDULES', count(*)::text FROM schedules
UNION ALL SELECT 'AUDIT_LOGS', count(*)::text FROM audit_logs;
