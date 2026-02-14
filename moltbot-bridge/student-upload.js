/**
 * /upload_students - CSV 파일 업로드 → atb_students 자동 등록
 *
 * 플로우: /upload_students → CSV 안내 → 파일 수신 → 파싱 → 검증 → upsert → 결과 알림
 */

import { parse } from 'csv-parse/sync';
import { getClient, isAvailable } from './supabase-queries.js';

// /upload_students 입력한 chatId 추적
const waitingForFile = new Set();

/**
 * 전화번호 정규화: 01012345678 → 010-1234-5678
 */
function normalizePhone(raw) {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('010')) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  // 이미 하이픈 포함된 경우 그대로 반환
  if (/^010-\d{4}-\d{4}$/.test(raw.trim())) {
    return raw.trim();
  }
  return raw.trim() || null;
}

/**
 * shuttle_required 파싱: "True"/"true"/"1" → true, 나머지 false
 */
function parseBool(val) {
  if (!val) return false;
  const s = String(val).trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes';
}

/**
 * CSV 형식 안내 메시지
 */
function formatGuide() {
  return `📎 *CSV 파일을 보내주세요*

예상 형식:
\`\`\`
name,parent_phone,birth_date,school,shuttle_required,status
오은우,010-2048-6048,2016-01-01,,False,active
진은기,010-3213-7099,2015-06-26,BEK,False,active
\`\`\`

*필수 열:* name, parent\\_phone
*선택 열:* birth\\_date, school, shuttle\\_required, status

⏳ 60초 내에 파일을 보내주세요.`;
}

/**
 * 결과 메시지 포맷
 */
function formatResult(inserted, updated, skipped, skippedReasons) {
  const total = inserted + updated + skipped.length;
  let msg = `✅ *학생 업로드 완료*

📊 전체: ${total}명
✅ 등록: ${inserted}명
🔄 업데이트: ${updated}명
⚠️ 건너뜀: ${skipped.length}명`;

  if (skipped.length > 0) {
    msg += '\n\n건너뜀 사유:';
    for (const { row, reason } of skipped) {
      msg += `\n- ${row}행: ${reason}`;
    }
  }

  return msg;
}

export function setupStudentUploadCommands(bot) {
  // 1) /upload_students 명령어
  bot.onText(/\/upload_students/, (msg) => {
    const chatId = msg.chat.id;

    if (!isAvailable()) {
      bot.sendMessage(chatId, '❌ Supabase 미설정. `.env`에 `SUPABASE_URL`과 `SUPABASE_SERVICE_KEY`를 추가하세요.', { parse_mode: 'Markdown' });
      return;
    }

    waitingForFile.add(chatId);
    bot.sendMessage(chatId, formatGuide(), { parse_mode: 'Markdown' });

    // 60초 타임아웃
    setTimeout(() => {
      if (waitingForFile.has(chatId)) {
        waitingForFile.delete(chatId);
        bot.sendMessage(chatId, '⏰ CSV 파일 대기 시간이 초과되었습니다. 다시 /upload\\_students 를 입력해주세요.', { parse_mode: 'Markdown' });
      }
    }, 60_000);
  });

  // 2) document 이벤트 핸들러
  bot.on('document', async (msg) => {
    const chatId = msg.chat.id;
    if (!waitingForFile.has(chatId)) return;
    waitingForFile.delete(chatId);

    const doc = msg.document;

    // 파일 타입 검증
    const fileName = doc.file_name || '';
    const mimeType = doc.mime_type || '';
    if (!fileName.endsWith('.csv') && !mimeType.includes('csv') && !mimeType.includes('text/plain')) {
      bot.sendMessage(chatId, '❌ CSV 파일만 업로드 가능합니다. (.csv 확장자 또는 text/csv)');
      return;
    }

    bot.sendMessage(chatId, '📥 파일 다운로드 중...');

    try {
      // 파일 다운로드
      const fileStream = await bot.getFileStream(doc.file_id);
      const chunks = [];
      for await (const chunk of fileStream) {
        chunks.push(chunk);
      }
      const csvText = Buffer.concat(chunks).toString('utf-8');

      // BOM 제거
      const cleanText = csvText.replace(/^\uFEFF/, '');

      // CSV 파싱
      let records;
      try {
        records = parse(cleanText, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
          bom: true,
        });
      } catch (parseErr) {
        bot.sendMessage(chatId, `❌ CSV 파싱 실패: ${parseErr.message}`);
        return;
      }

      if (records.length === 0) {
        bot.sendMessage(chatId, '❌ CSV에 데이터가 없습니다.');
        return;
      }

      // 검증 + 변환
      const validRows = [];
      const skipped = [];

      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        const rowNum = i + 2; // 헤더=1행, 데이터는 2행부터

        const name = (row.name || '').trim();
        if (!name) {
          skipped.push({ row: rowNum, reason: '이름 누락' });
          continue;
        }

        const parentPhone = normalizePhone(row.parent_phone);
        if (!parentPhone) {
          skipped.push({ row: rowNum, reason: '학부모 연락처 누락' });
          continue;
        }

        validRows.push({
          name,
          parent_phone: parentPhone,
          birth_date: row.birth_date?.trim() || null,
          school: row.school?.trim() || null,
          shuttle_required: parseBool(row.shuttle_required),
          status: row.status?.trim() || 'active',
          v_index: 50,
          risk_level: 'safe',
        });
      }

      if (validRows.length === 0) {
        bot.sendMessage(chatId, formatResult(0, 0, skipped, []), { parse_mode: 'Markdown' });
        return;
      }

      // Supabase upsert
      const sb = getClient();
      if (!sb) {
        bot.sendMessage(chatId, '❌ Supabase 연결 실패');
        return;
      }

      bot.sendMessage(chatId, `🔄 ${validRows.length}명 등록 중...`);

      let inserted = 0;
      let updated = 0;

      for (const row of validRows) {
        // 기존 학생 존재 여부 확인 (name + parent_phone)
        const { data: existing } = await sb
          .from('atb_students')
          .select('id')
          .eq('name', row.name)
          .eq('parent_phone', row.parent_phone)
          .maybeSingle();

        if (existing) {
          // 업데이트
          const { error } = await sb
            .from('atb_students')
            .update({
              birth_date: row.birth_date,
              school: row.school,
              shuttle_required: row.shuttle_required,
              status: row.status,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);

          if (!error) updated++;
        } else {
          // 신규 등록
          const { error } = await sb
            .from('atb_students')
            .insert({
              name: row.name,
              parent_phone: row.parent_phone,
              birth_date: row.birth_date,
              school: row.school,
              shuttle_required: row.shuttle_required,
              status: row.status,
              v_index: row.v_index,
              risk_level: row.risk_level,
            });

          if (!error) inserted++;
        }
      }

      bot.sendMessage(chatId, formatResult(inserted, updated, skipped, []), { parse_mode: 'Markdown' });

    } catch (err) {
      console.error('[UPLOAD] Error:', err);
      bot.sendMessage(chatId, `❌ 업로드 처리 중 오류: ${err.message}`);
    }
  });

  console.log('📎 Student Upload 핸들러 연결됨');
}
