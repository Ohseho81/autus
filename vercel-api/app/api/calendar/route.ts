// Next.js App Router - Google Calendar API
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

// 서비스 계정 인증
function getAuthClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let key = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !key) {
    return null;
  }

  // Private Key 줄바꿈 처리 (다양한 형식 지원)
  // 1. 리터럴 \n 문자열을 실제 줄바꿈으로 변환
  key = key.replace(/\\n/g, '\n');
  // 2. 이스케이프된 \\n도 처리
  key = key.split('\\n').join('\n');

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });

  return auth;
}

// 캘린더 ID
function getCalendarId() {
  return process.env.GOOGLE_CALENDAR_ID || 'primary';
}

// GET: 일정 조회 또는 상태 확인
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const date = searchParams.get('date');
  const timeMin = searchParams.get('timeMin');
  const timeMax = searchParams.get('timeMax');

  const auth = getAuthClient();

  if (!auth) {
    return NextResponse.json({
      success: false,
      demo: true,
      message: 'Google Calendar API not configured - running in demo mode',
    });
  }

  const calendar = google.calendar({ version: 'v3', auth });
  const calendarId = getCalendarId();

  try {
    // API 상태 확인
    if (action === 'status') {
      try {
        await calendar.calendarList.list({ maxResults: 1 });
        return NextResponse.json({
          success: true,
          connected: true,
          calendarId,
          message: 'Google Calendar API connected',
        });
      } catch (error: any) {
        return NextResponse.json({
          success: false,
          connected: false,
          message: error.message,
        });
      }
    }

    // 특정 날짜의 이벤트 조회
    if (action === 'events') {
      const startDate = date ? new Date(date) : new Date();
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);

      const response = await calendar.events.list({
        calendarId,
        timeMin: timeMin || startDate.toISOString(),
        timeMax: timeMax || endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      return NextResponse.json({
        success: true,
        events: response.data.items || [],
      });
    }

    // 가능한 시간대 조회 (보강 스케줄링용)
    if (action === 'available') {
      const targetDate = date ? new Date(date) : new Date();
      targetDate.setHours(0, 0, 0, 0);
      const endDate = new Date(targetDate);
      endDate.setHours(23, 59, 59, 999);

      const response = await calendar.events.list({
        calendarId,
        timeMin: targetDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      const busySlots = (response.data.items || []).map((event: any) => ({
        start: event.start.dateTime || event.start.date,
        end: event.end.dateTime || event.end.date,
        title: event.summary,
      }));

      // 기본 운영 시간 (09:00 - 21:00)
      const operatingHours = { start: 9, end: 21 };
      const slotDuration = 60; // 분
      const availableSlots = [];

      for (let hour = operatingHours.start; hour < operatingHours.end; hour++) {
        const slotStart = new Date(targetDate);
        slotStart.setHours(hour, 0, 0, 0);
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);

        const isOccupied = busySlots.some((busy: any) => {
          const busyStart = new Date(busy.start);
          const busyEnd = new Date(busy.end);
          return slotStart < busyEnd && slotEnd > busyStart;
        });

        if (!isOccupied) {
          availableSlots.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
            label: `${hour.toString().padStart(2, '0')}:00 - ${(hour + 1).toString().padStart(2, '0')}:00`,
          });
        }
      }

      return NextResponse.json({
        success: true,
        date: targetDate.toISOString().split('T')[0],
        busySlots,
        availableSlots,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('Calendar API Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.errors || null,
    }, { status: 500 });
  }
}

// POST: 일정 생성
export async function POST(request: NextRequest) {
  const auth = getAuthClient();

  if (!auth) {
    return NextResponse.json({
      success: false,
      demo: true,
      message: 'Google Calendar API not configured - running in demo mode',
    });
  }

  const calendar = google.calendar({ version: 'v3', auth });
  const calendarId = getCalendarId();

  try {
    const body = await request.json();
    const { summary, description, startTime, endTime, attendees } = body;

    if (!summary || !startTime || !endTime) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: summary, startTime, endTime',
      }, { status: 400 });
    }

    const event: any = {
      summary,
      description: description || '',
      start: {
        dateTime: new Date(startTime).toISOString(),
        timeZone: 'Asia/Seoul',
      },
      end: {
        dateTime: new Date(endTime).toISOString(),
        timeZone: 'Asia/Seoul',
      },
    };

    // 참석자가 있으면 추가
    if (attendees && Array.isArray(attendees)) {
      event.attendees = attendees.map((email: string) => ({ email }));
    }

    const response = await calendar.events.insert({
      calendarId,
      requestBody: event,
      sendUpdates: attendees ? 'all' : 'none',
    });

    return NextResponse.json({
      success: true,
      event: response.data,
      message: '일정이 생성되었습니다',
    });

  } catch (error: any) {
    console.error('Calendar API Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.errors || null,
    }, { status: 500 });
  }
}
