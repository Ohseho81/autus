/**
 * 📅 Google Calendar API - Vercel Serverless Function
 *
 * 서비스 계정을 사용한 캘린더 연동
 *
 * 환경 변수 (Vercel Dashboard에서 설정):
 * - GOOGLE_SERVICE_ACCOUNT_EMAIL: 서비스 계정 이메일
 * - GOOGLE_PRIVATE_KEY: 서비스 계정 비공개 키 (JSON의 private_key)
 * - GOOGLE_CALENDAR_ID: 캘린더 ID (캘린더 설정에서 확인)
 *
 * 엔드포인트:
 * - GET /api/calendar?action=events&date=2024-02-03
 * - GET /api/calendar?action=available&birthYear=2015&excludeDate=2024-02-03
 * - POST /api/calendar (일정 생성)
 */

import { google } from 'googleapis';

// ============================================
// 인증 설정
// ============================================
function getAuthClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !key) {
    throw new Error('Google Service Account credentials not configured');
  }

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });

  return auth;
}

function getCalendar() {
  const auth = getAuthClient();
  return google.calendar({ version: 'v3', auth });
}

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';

// ============================================
// 유틸리티
// ============================================
function parseEventTitle(title) {
  if (title?.startsWith('팀-') || title?.startsWith('TEAM-')) {
    const yearPart = title.replace(/^(팀-|TEAM-)/, '');
    const years = yearPart.split(/[~\-]/).map(y => parseInt(y.trim()));
    const birthYears = [];
    if (years.length === 2) {
      for (let y = years[0]; y <= years[1]; y++) {
        birthYears.push(y);
      }
    } else {
      birthYears.push(...years);
    }
    return { type: 'team', birthYears };
  }

  if (title?.startsWith('개인-') || title?.startsWith('PVT-')) {
    return { type: 'private', studentName: title.replace(/^(개인-|PVT-)/, '') };
  }

  if (title === '출근' || title === 'WORK') {
    return { type: 'work' };
  }

  return { type: 'unknown', title };
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date) {
  return new Date(date).toISOString().split('T')[0];
}

// ============================================
// API 핸들러
// ============================================

// 특정 날짜 이벤트 조회
async function getEvents(date) {
  const calendar = getCalendar();

  const response = await calendar.events.list({
    calendarId: CALENDAR_ID,
    timeMin: `${date}T00:00:00+09:00`,
    timeMax: `${date}T23:59:59+09:00`,
    singleEvents: true,
    orderBy: 'startTime',
  });

  return response.data.items.map(event => ({
    id: event.id,
    title: event.summary,
    date,
    time: event.start.dateTime?.split('T')[1]?.slice(0, 5) || '00:00',
    description: event.description,
    ...parseEventTitle(event.summary),
  }));
}

// 보충 가능 일정 조회
async function getAvailableSlots(birthYear, excludeDate, classType = 'team', coachId = null, limit = 3) {
  const calendar = getCalendar();
  const today = new Date();
  const maxDate = addDays(today, 14);

  // 2주간 이벤트 조회
  const response = await calendar.events.list({
    calendarId: CALENDAR_ID,
    timeMin: today.toISOString(),
    timeMax: maxDate.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 100,
  });

  const events = response.data.items || [];
  const availableSlots = [];

  // 팀수업: 해당 연생 포함된 이벤트 찾기
  if (classType === 'team') {
    for (const event of events) {
      const eventDate = event.start.dateTime?.split('T')[0] || event.start.date;

      // 결석일 제외
      if (eventDate === excludeDate) continue;

      const parsed = parseEventTitle(event.summary);
      if (parsed.type === 'team' && parsed.birthYears?.includes(parseInt(birthYear))) {
        availableSlots.push({
          id: event.id,
          date: eventDate,
          time: event.start.dateTime?.split('T')[1]?.slice(0, 5) || '00:00',
          title: event.summary,
          type: 'team',
          birthYears: parsed.birthYears,
        });

        if (availableSlots.length >= limit) break;
      }
    }
  }

  // 개인훈련: 코치 빈 시간 찾기 (출근 이벤트 기준)
  if (classType === 'private' && coachId) {
    // TODO: 코치별 캘린더 연동 시 구현
    // 현재는 데모 모드에서만 지원
  }

  return availableSlots;
}

// 보충 수업 생성
async function createMakeupEvent(data) {
  const {
    studentName,
    originalDate,
    targetDate,
    targetTime,
    className,
    type,
  } = data;

  const calendar = getCalendar();

  const event = {
    summary: type === 'team'
      ? `[보충] ${studentName} - ${className || '팀수업'}`
      : `[보충] 개인-${studentName}`,
    description: `원래 일정: ${originalDate}\n보충 수업`,
    start: {
      dateTime: `${targetDate}T${targetTime}:00+09:00`,
      timeZone: 'Asia/Seoul',
    },
    end: {
      dateTime: `${targetDate}T${String(parseInt(targetTime.split(':')[0]) + 1).padStart(2, '0')}:00:00+09:00`,
      timeZone: 'Asia/Seoul',
    },
    colorId: '10', // 초록색 (보충 표시)
  };

  const response = await calendar.events.insert({
    calendarId: CALENDAR_ID,
    resource: event,
  });

  return {
    id: response.data.id,
    title: event.summary,
    date: targetDate,
    time: targetTime,
    link: response.data.htmlLink,
  };
}

// ============================================
// 메인 핸들러
// ============================================
export default async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 설정 체크
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      return res.status(200).json({
        success: true,
        demo: true,
        message: 'Running in demo mode - Google credentials not configured',
        data: [],
      });
    }

    if (req.method === 'GET') {
      const { action, date, birthYear, excludeDate, classType, coachId, limit } = req.query;

      switch (action) {
        case 'events':
          if (!date) {
            return res.status(400).json({ success: false, error: 'date is required' });
          }
          const events = await getEvents(date);
          return res.status(200).json({ success: true, data: events });

        case 'available':
          if (!birthYear || !excludeDate) {
            return res.status(400).json({ success: false, error: 'birthYear and excludeDate are required' });
          }
          const slots = await getAvailableSlots(birthYear, excludeDate, classType, coachId, parseInt(limit) || 3);
          return res.status(200).json({ success: true, data: slots });

        case 'status':
          return res.status(200).json({
            success: true,
            configured: true,
            calendarId: CALENDAR_ID ? 'Set' : 'Not set',
          });

        default:
          return res.status(400).json({ success: false, error: 'Invalid action' });
      }
    }

    if (req.method === 'POST') {
      const data = req.body;

      if (!data.studentName || !data.targetDate || !data.targetTime) {
        return res.status(400).json({
          success: false,
          error: 'studentName, targetDate, and targetTime are required',
        });
      }

      const result = await createMakeupEvent(data);
      return res.status(200).json({ success: true, data: result });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });

  } catch (error) {
    console.error('[Calendar API Error]', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
