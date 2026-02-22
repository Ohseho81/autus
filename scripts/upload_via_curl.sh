#!/bin/bash
# Upload students to Supabase using curl (bypassing proxy)

SUPABASE_URL="https://pphzvnaedmzcvpxjulti.supabase.co"
SERVICE_KEY="your-supabase-service-role-key-here"

# Test with first student
echo "🧪 테스트: 첫 번째 학생 업로드..."
curl --noproxy "*" -X POST \
  "${SUPABASE_URL}/rest/v1/students" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '[
    {
      "name": "오은우",
      "parent_phone": "010-2048-6048",
      "birth_date": "2016-01-01",
      "school": null,
      "shuttle_required": false,
      "status": "active"
    }
  ]' \
  2>&1 | head -20

echo -e "\n✅ 테스트 완료"
