// Vercel Serverless Function - Google Calendar API
import { google } from 'googleapis';

// 서비스 계정 인증
function getAuthClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !key) {
    return null;
  }

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

export default async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const auth = getAuthClient();

  if (!auth) {
    return res.status(200).json({
      success: false,
      demo: true,
      message: 'Google Calendar API not configured - running in demo mode',
    });
  }

  const calendar = google.calendar({ version: 'v3', auth });
  const calendarId = getCalendarId();

  try {
    // GET: 일정 조회 또는 상태 확인
    if (req.method === 'GET') {
      const { action, date, timeMin, timeMax } = req.query;

      // API 상태 확인
      if (action === 'status') {
        try {
          await calendar.calendarList.list({ maxResults: 1 });
          return res.status(200).json({
            success: true,
            connected: true,
            calendarId,
            message: 'Google Calendar API connected',
          });
        } catch (error) {
          return res.status(200).json({
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

        return res.status(200).json({
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

        const busySlots = (response.data.items || []).map(event => ({
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

          const isOccupied = busySlots.some(busy => {
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

        return res.status(200).json({
          success: true,
          date: targetDate.toISOString().split('T')[0],
          busySlots,
          availableSlots,
        });
      }

      return res.status(400).json({ error: 'Invalid action' });
    }

    // POST: 일정 생성
    if (req.method === 'POST') {
      const { summary, description, startTime, endTime, attendees } = req.body;

      if (!summary || !startTime || !endTime) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: summary, startTime, endTime',
        });
      }

      const event = {
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
        event.attendees = attendees.map(email => ({ email }));
      }

      const response = await calendar.events.insert({
        calendarId,
        resource: event,
        sendUpdates: attendees ? 'all' : 'none',
      });

      return res.status(200).json({
        success: true,
        event: response.data,
        message: '일정이 생성되었습니다',
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Calendar API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      details: error.errors || null,
    });
  }
}
