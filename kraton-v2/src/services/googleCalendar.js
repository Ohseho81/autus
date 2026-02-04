/**
 * 📅 구글 캘린더 연동 서비스
 *
 * 기능:
 * - 코치 스케줄 조회
 * - 오픈 클래스 목록 조회
 * - 보충 가능 일정 조회
 * - 일정 생성 (보충 수업)
 *
 * 캘린더 이벤트 제목 규칙:
 * - 팀수업: "팀-2015~2016" (대상 연생 표시)
 * - 개인훈련: "개인-홍길동"
 * - 출근: "출근"
 *
 * API 연동 방식:
 * - Vercel Serverless Function 사용 (/api/calendar)
 * - 서비스 계정 인증 (백엔드에서 처리)
 */

// ============================================
// 설정
// ============================================
const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const CALENDAR_API = `${API_BASE_URL}/api/calendar`;

// 데모 모드 체크 (로컬 개발 또는 API 미설정 시)
const isDemoMode = import.meta.env.DEV || !API_BASE_URL;

// API 호출 헬퍼
async function callCalendarAPI(params, method = 'GET', body = null) {
  try {
    const url = new URL(CALENDAR_API, window.location.origin);
    if (method === 'GET' && params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value);
        }
      });
    }

    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    if (method === 'POST' && body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url.toString(), options);
    const result = await response.json();

    return result;
  } catch (error) {
    console.error('[GoogleCalendar API Error]', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// 데모 데이터
// ============================================
const DEMO_COACHES = [
  { id: 'coach_1', name: '김코치', email: 'kim@allthatbasket.com' },
  { id: 'coach_2', name: '박코치', email: 'park@allthatbasket.com' },
  { id: 'coach_3', name: '이코치', email: 'lee@allthatbasket.com' },
];

const DEMO_CLASSES = [
  { id: 'class_1', name: '유아부 A', targetBirthYears: [2019, 2020], coachId: 'coach_1', dayOfWeek: ['mon', 'wed', 'fri'], time: '15:00' },
  { id: 'class_2', name: '유아부 B', targetBirthYears: [2019, 2020], coachId: 'coach_2', dayOfWeek: ['tue', 'thu'], time: '15:00' },
  { id: 'class_3', name: '초등저 A', targetBirthYears: [2016, 2017, 2018], coachId: 'coach_1', dayOfWeek: ['mon', 'wed', 'fri'], time: '16:00' },
  { id: 'class_4', name: '초등저 B', targetBirthYears: [2016, 2017, 2018], coachId: 'coach_2', dayOfWeek: ['tue', 'thu'], time: '16:00' },
  { id: 'class_5', name: '초등고 A', targetBirthYears: [2013, 2014, 2015], coachId: 'coach_1', dayOfWeek: ['mon', 'wed', 'fri'], time: '17:00' },
  { id: 'class_6', name: '초등고 B', targetBirthYears: [2013, 2014, 2015], coachId: 'coach_3', dayOfWeek: ['tue', 'thu', 'sat'], time: '17:00' },
  { id: 'class_7', name: '중등부', targetBirthYears: [2010, 2011, 2012], coachId: 'coach_3', dayOfWeek: ['mon', 'wed', 'fri'], time: '18:00' },
];

const DEMO_COACH_SCHEDULES = {
  'coach_1': {
    workingDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
    offDays: ['sun'],
    workingHours: { start: '14:00', end: '21:00' },
  },
  'coach_2': {
    workingDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
    offDays: ['sat', 'sun'],
    workingHours: { start: '14:00', end: '20:00' },
  },
  'coach_3': {
    workingDays: ['tue', 'thu', 'sat'],
    offDays: ['mon', 'wed', 'fri', 'sun'],
    workingHours: { start: '15:00', end: '21:00' },
  },
};

// ============================================
// 유틸리티 함수
// ============================================
function getDayOfWeek(date) {
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return days[new Date(date).getDay()];
}

function formatDate(date) {
  return new Date(date).toISOString().split('T')[0];
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function parseEventTitle(title) {
  // "팀-2015~2016" -> { type: 'team', birthYears: [2015, 2016] }
  // "개인-홍길동" -> { type: 'private', studentName: '홍길동' }
  // "출근" -> { type: 'work' }

  if (title.startsWith('팀-') || title.startsWith('TEAM-')) {
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

  if (title.startsWith('개인-') || title.startsWith('PVT-')) {
    const studentName = title.replace(/^(개인-|PVT-)/, '');
    return { type: 'private', studentName };
  }

  if (title === '출근' || title === 'WORK') {
    return { type: 'work' };
  }

  return { type: 'unknown', title };
}

// ============================================
// Google Calendar API
// ============================================
let gapiLoaded = false;
let gisLoaded = false;

async function initGoogleAPI() {
  if (isDemoMode) {
    console.log('[GoogleCalendar] Demo mode - API not configured');
    return false;
  }

  return new Promise((resolve) => {
    // Load GAPI
    const script1 = document.createElement('script');
    script1.src = 'https://apis.google.com/js/api.js';
    script1.onload = () => {
      window.gapi.load('client', async () => {
        await window.gapi.client.init({
          apiKey: GOOGLE_API_KEY,
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
        });
        gapiLoaded = true;
        checkReady();
      });
    };
    document.body.appendChild(script1);

    // Load GIS for OAuth
    const script2 = document.createElement('script');
    script2.src = 'https://accounts.google.com/gsi/client';
    script2.onload = () => {
      gisLoaded = true;
      checkReady();
    };
    document.body.appendChild(script2);

    function checkReady() {
      if (gapiLoaded && gisLoaded) {
        resolve(true);
      }
    }
  });
}

// ============================================
// 캘린더 서비스
// ============================================
export const googleCalendarService = {
  // 초기화 및 상태 확인
  async init() {
    // API 상태 확인
    if (!isDemoMode) {
      const result = await callCalendarAPI({ action: 'status' });
      if (result.success && result.configured) {
        console.log('[GoogleCalendar] API connected');
        return { success: true, demo: false };
      }
    }

    console.log('[GoogleCalendar] Running in demo mode');
    return { success: true, demo: true };
  },

  // 연결 상태 확인 (실시간)
  async checkConnection() {
    try {
      const result = await callCalendarAPI({ action: 'status' });
      if (result.success && result.connected) {
        return {
          connected: true,
          calendarId: result.calendarId,
          message: result.message
        };
      }
      // demo 모드인 경우
      if (result.demo) {
        return {
          connected: false,
          demo: true,
          message: result.message || 'Demo mode - API not configured'
        };
      }
      return {
        connected: false,
        error: result.error || 'Connection failed'
      };
    } catch (error) {
      console.error('[GoogleCalendar] Connection check error:', error);
      return {
        connected: false,
        error: error.message
      };
    }
  },

  // 특정 날짜의 일정 조회 (UI용)
  async getEvents(date) {
    try {
      const result = await callCalendarAPI({ action: 'events', date });
      if (result.success) {
        return {
          success: true,
          events: result.events || [],
          demo: result.demo || false
        };
      }
      return { success: false, events: [], error: result.error };
    } catch (error) {
      console.error('[GoogleCalendar] Get events error:', error);
      return { success: false, events: [], error: error.message };
    }
  },

  // 코치 목록 조회
  async getCoaches() {
    if (isDemoMode) {
      return { success: true, data: DEMO_COACHES, demo: true };
    }

    // 실제 구현: Google Calendar 공유된 캘린더 목록에서 코치 추출
    // 또는 별도 데이터베이스에서 조회
    return { success: true, data: DEMO_COACHES, demo: true };
  },

  // 오픈 클래스 목록 조회
  async getOpenClasses() {
    if (isDemoMode) {
      return { success: true, data: DEMO_CLASSES, demo: true };
    }

    // 실제 구현: Google Calendar에서 팀수업 이벤트 조회
    return { success: true, data: DEMO_CLASSES, demo: true };
  },

  // 코치 스케줄 조회
  async getCoachSchedule(coachId) {
    if (isDemoMode) {
      return {
        success: true,
        data: DEMO_COACH_SCHEDULES[coachId] || DEMO_COACH_SCHEDULES['coach_1'],
        demo: true,
      };
    }

    // 실제 구현: 코치 캘린더에서 스케줄 조회
    return {
      success: true,
      data: DEMO_COACH_SCHEDULES[coachId] || {},
      demo: true,
    };
  },

  // 특정 날짜 이벤트 조회
  async getEventsOnDate(date, coachId = null) {
    // 먼저 API 호출 시도
    if (!isDemoMode) {
      const result = await callCalendarAPI({ action: 'events', date });
      if (result.success && !result.demo) {
        return result;
      }
    }

    // 데모 모드 또는 API 실패 시 로컬 데이터 사용
    const dayOfWeek = getDayOfWeek(date);
    const events = DEMO_CLASSES
      .filter(c => c.dayOfWeek.includes(dayOfWeek))
      .filter(c => !coachId || c.coachId === coachId)
      .map(c => ({
        id: `${c.id}_${date}`,
        classId: c.id,
        title: `팀-${c.targetBirthYears[0]}~${c.targetBirthYears[c.targetBirthYears.length - 1]}`,
        className: c.name,
        date,
        time: c.time,
        coachId: c.coachId,
        type: 'team',
        targetBirthYears: c.targetBirthYears,
      }));

    return { success: true, data: events, demo: true };
  },

  // 보충 가능 일정 조회 (팀수업)
  async getAvailableTeamSlots(studentBirthYear, excludeDate, limit = 3) {
    // 먼저 API 호출 시도
    if (!isDemoMode) {
      const result = await callCalendarAPI({
        action: 'available',
        birthYear: studentBirthYear,
        excludeDate,
        classType: 'team',
        limit,
      });
      if (result.success && !result.demo) {
        return result;
      }
    }

    // 데모 모드 또는 API 실패 시 로컬 데이터 사용
    const availableSlots = [];
    const today = new Date();
    const maxDate = addDays(today, 14);

    // 해당 연생이 포함된 클래스 찾기
    const matchingClasses = DEMO_CLASSES.filter(c =>
      c.targetBirthYears.includes(studentBirthYear)
    );

    let currentDate = addDays(today, 1);
    while (availableSlots.length < limit && currentDate <= maxDate) {
      const dateStr = formatDate(currentDate);
      const dayOfWeek = getDayOfWeek(currentDate);

      // 결석일 제외
      if (dateStr !== excludeDate) {
        for (const cls of matchingClasses) {
          if (cls.dayOfWeek.includes(dayOfWeek)) {
            // 코치 근무일 체크
            const coachSchedule = DEMO_COACH_SCHEDULES[cls.coachId];
            if (coachSchedule && coachSchedule.workingDays.includes(dayOfWeek)) {
              availableSlots.push({
                date: dateStr,
                dayOfWeek,
                time: cls.time,
                classId: cls.id,
                className: cls.name,
                coachId: cls.coachId,
                coachName: DEMO_COACHES.find(c => c.id === cls.coachId)?.name,
                type: 'team',
              });

              if (availableSlots.length >= limit) break;
            }
          }
        }
      }

      currentDate = addDays(currentDate, 1);
    }

    return { success: true, data: availableSlots, demo: true };
  },

  // 보충 가능 일정 조회 (개인훈련)
  async getAvailablePrivateSlots(coachId, excludeDate, limit = 3) {
    const availableSlots = [];
    const today = new Date();
    const maxDate = addDays(today, 14);

    if (isDemoMode) {
      const coachSchedule = DEMO_COACH_SCHEDULES[coachId];
      if (!coachSchedule) {
        return { success: false, error: 'Coach not found' };
      }

      // 해당 코치의 기존 수업 시간 가져오기
      const coachClasses = DEMO_CLASSES.filter(c => c.coachId === coachId);
      const busyTimes = {}; // { 'mon': ['15:00', '16:00'], ... }

      for (const cls of coachClasses) {
        for (const day of cls.dayOfWeek) {
          if (!busyTimes[day]) busyTimes[day] = [];
          busyTimes[day].push(cls.time);
        }
      }

      let currentDate = addDays(today, 1);
      while (availableSlots.length < limit && currentDate <= maxDate) {
        const dateStr = formatDate(currentDate);
        const dayOfWeek = getDayOfWeek(currentDate);

        if (dateStr !== excludeDate && coachSchedule.workingDays.includes(dayOfWeek)) {
          // 가능한 시간대 찾기 (근무 시간 중 비어있는 시간)
          const startHour = parseInt(coachSchedule.workingHours.start.split(':')[0]);
          const endHour = parseInt(coachSchedule.workingHours.end.split(':')[0]);
          const busyOnDay = busyTimes[dayOfWeek] || [];

          for (let hour = startHour; hour < endHour && availableSlots.length < limit; hour++) {
            const timeStr = `${hour.toString().padStart(2, '0')}:00`;
            if (!busyOnDay.includes(timeStr)) {
              availableSlots.push({
                date: dateStr,
                dayOfWeek,
                time: timeStr,
                coachId,
                coachName: DEMO_COACHES.find(c => c.id === coachId)?.name,
                type: 'private',
              });
            }
          }
        }

        currentDate = addDays(currentDate, 1);
      }

      return { success: true, data: availableSlots, demo: true };
    }

    return { success: true, data: availableSlots, demo: true };
  },

  // 보충 수업 일정 생성
  async createMakeupClass(request) {
    const {
      studentName,
      originalDate,
      targetDate,
      targetTime,
      className,
      coachId,
      type, // 'team' | 'private'
    } = request;

    // 먼저 API 호출 시도
    if (!isDemoMode) {
      const result = await callCalendarAPI(null, 'POST', {
        studentName,
        originalDate,
        targetDate,
        targetTime,
        className,
        type,
      });
      if (result.success && !result.demo) {
        return result;
      }
    }

    // 데모 모드 또는 API 실패 시
    console.log('[GoogleCalendar] Demo mode - Would create event:', request);
    return {
      success: true,
      data: {
        id: `makeup_${Date.now()}`,
        title: type === 'team'
          ? `[보충] ${studentName} - ${className}`
          : `[보충] 개인-${studentName}`,
        date: targetDate,
        time: targetTime,
      },
      demo: true,
    };
  },
};

export default googleCalendarService;
