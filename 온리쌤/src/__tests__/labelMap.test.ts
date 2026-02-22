/**
 * LabelMap 및 IndustryConfig 테스트
 * 타입 안전 라벨 접근 헬퍼, 동적 라벨 생성, 상태/액션 매핑 검증
 */

import {
  L,
  createLabel,
  getStateLabel,
  getActionLabel,
  getScreenTitle,
} from '../config/labelMap';

import {
  T,
  OUTCOME_ACTIONS,
  INDUSTRY_OUTCOME,
  getOutcomeActions,
  isActionAllowed,
} from '../config/textMap';

import {
  INDUSTRY_CONFIG,
  DEFAULT_INDUSTRY_CODE,
  getIndustryConfig,
  isValidIndustryCode,
  getAllIndustryCodes,
} from '../config/industryConfig';

import type { IndustryConfig } from '../config/industryConfig';

// 테스트용 농구 config
const basketballConfig = INDUSTRY_CONFIG[DEFAULT_INDUSTRY_CODE];
// 테스트용 건축 config
const constructionConfig = INDUSTRY_CONFIG['SERVICE.CONSTRUCTION.RESIDENTIAL.HOUSE'];
// 테스트용 의료 config
const clinicConfig = INDUSTRY_CONFIG['SERVICE.HEALTH.CLINIC'];

describe('IndustryConfig', () => {
  describe('DEFAULT_INDUSTRY_CODE', () => {
    it('기본 산업 코드가 농구여야 한다', () => {
      expect(DEFAULT_INDUSTRY_CODE).toBe('SERVICE.EDU.SPORTS.BASKETBALL');
    });

    it('기본 설정이 존재해야 한다', () => {
      expect(basketballConfig).toBeDefined();
      expect(basketballConfig.name).toBe('온리쌤');
      expect(basketballConfig.icon).toBe('🏀');
    });
  });

  describe('getIndustryConfig', () => {
    it('유효한 산업 코드로 설정을 가져올 수 있어야 한다', () => {
      const config = getIndustryConfig('SERVICE.EDU.SPORTS.BASKETBALL');
      expect(config.name).toBe('온리쌤');
    });

    it('null 코드는 기본 설정을 반환해야 한다', () => {
      const config = getIndustryConfig(null);
      expect(config.name).toBe('온리쌤');
    });

    it('undefined 코드는 기본 설정을 반환해야 한다', () => {
      const config = getIndustryConfig(undefined);
      expect(config.name).toBe('온리쌤');
    });

    it('존재하지 않는 코드는 기본 설정을 반환해야 한다', () => {
      const config = getIndustryConfig('INVALID.CODE');
      expect(config.name).toBe('온리쌤');
    });
  });

  describe('isValidIndustryCode', () => {
    it('유효한 코드는 true를 반환해야 한다', () => {
      expect(isValidIndustryCode('SERVICE.EDU.SPORTS.BASKETBALL')).toBe(true);
      expect(isValidIndustryCode('SERVICE.CONSTRUCTION.RESIDENTIAL.HOUSE')).toBe(true);
      expect(isValidIndustryCode('SERVICE.HEALTH.CLINIC')).toBe(true);
    });

    it('유효하지 않은 코드는 false를 반환해야 한다', () => {
      expect(isValidIndustryCode('INVALID')).toBe(false);
      expect(isValidIndustryCode('')).toBe(false);
    });
  });

  describe('getAllIndustryCodes', () => {
    it('모든 산업 코드 배열을 반환해야 한다', () => {
      const codes = getAllIndustryCodes();
      expect(codes.length).toBeGreaterThanOrEqual(4);
      expect(codes).toContain('SERVICE.EDU.SPORTS.BASKETBALL');
      expect(codes).toContain('SERVICE.CONSTRUCTION.RESIDENTIAL.HOUSE');
      expect(codes).toContain('SERVICE.HEALTH.CLINIC');
      expect(codes).toContain('SERVICE.EDU.SPORTS.FITNESS');
    });
  });

  describe('모든 산업 설정이 필수 필드를 포함해야 한다', () => {
    const allConfigs = Object.entries(INDUSTRY_CONFIG);

    it.each(allConfigs)('%s 설정이 name/icon을 가져야 한다', (code, config) => {
      expect(config.name).toBeTruthy();
      expect(config.icon).toBeTruthy();
    });

    it.each(allConfigs)('%s 설정이 color.primary를 가져야 한다', (code, config) => {
      expect(config.color.primary).toBeTruthy();
      expect(config.color.secondary).toBeTruthy();
    });

    it.each(allConfigs)('%s 설정이 모든 필수 라벨을 가져야 한다', (code, config) => {
      const requiredKeys = [
        'entity', 'entities', 'entityParent',
        'service', 'services',
        'staff', 'staffs',
        'location', 'attendance',
        'absent', 'late', 'excused',
        'consultation', 'payment', 'emergency',
        'riskHigh', 'riskAction', 'churn',
        'risk', 'action', 'settings', 'admin',
      ];
      requiredKeys.forEach(key => {
        expect((config.labels as any)[key]).toBeTruthy();
      });
    });

    it.each(allConfigs)('%s 설정이 상태 설정을 가져야 한다', (code, config) => {
      expect(config.states.scheduled).toBeDefined();
      expect(config.states.scheduled.emoji).toBeTruthy();
      expect(config.states.scheduled.label).toBeTruthy();
      expect(config.states.in_progress).toBeDefined();
      expect(config.states.completed).toBeDefined();
    });

    it.each(allConfigs)('%s 설정이 outcome을 가져야 한다', (code, config) => {
      expect(config.outcome.purpose).toBeTruthy();
      expect(config.outcome.metric).toBeTruthy();
      expect(['%', 'score', 'count']).toContain(config.outcome.unit);
    });
  });
});

describe('L (라벨 접근 헬퍼)', () => {
  describe('엔티티 라벨', () => {
    it('농구에서 entity는 학생이어야 한다', () => {
      expect(L.entity(basketballConfig)).toBe('학생');
    });

    it('건축에서 entity는 건축주여야 한다', () => {
      expect(L.entity(constructionConfig)).toBe('건축주');
    });

    it('의료에서 entity는 환자여야 한다', () => {
      expect(L.entity(clinicConfig)).toBe('환자');
    });
  });

  describe('서비스 라벨', () => {
    it('농구에서 service는 수업이어야 한다', () => {
      expect(L.service(basketballConfig)).toBe('수업');
    });

    it('건축에서 service는 프로젝트여야 한다', () => {
      expect(L.service(constructionConfig)).toBe('프로젝트');
    });
  });

  describe('담당자 라벨', () => {
    it('농구에서 staff는 코치여야 한다', () => {
      expect(L.staff(basketballConfig)).toBe('코치');
    });

    it('의료에서 staff는 의사여야 한다', () => {
      expect(L.staff(clinicConfig)).toBe('의사');
    });
  });

  describe('포맷된 라벨 (L.format)', () => {
    it('entityList가 올바르게 조합되어야 한다', () => {
      expect(L.format.entityList(basketballConfig)).toBe('학생 목록');
      expect(L.format.entityList(constructionConfig)).toBe('건축주 목록');
    });

    it('newEntity가 올바르게 조합되어야 한다', () => {
      expect(L.format.newEntity(basketballConfig)).toBe('신규 학생');
    });

    it('attendanceCheck가 올바르게 조합되어야 한다', () => {
      expect(L.format.attendanceCheck(basketballConfig)).toBe('출석 체크');
      expect(L.format.attendanceCheck(clinicConfig)).toBe('내원 체크');
    });

    it('paymentStatus가 올바르게 조합되어야 한다', () => {
      expect(L.format.paymentStatus(basketballConfig)).toBe('결제 현황');
      expect(L.format.paymentStatus(constructionConfig)).toBe('청구 현황');
    });
  });

  describe('브랜드 라벨', () => {
    it('brandFull이 아이콘과 이름을 조합해야 한다', () => {
      expect(L.brandFull(basketballConfig)).toBe('🏀 온리쌤');
      expect(L.brandFull(constructionConfig)).toBe('🏗️ 한울건축');
    });
  });

  describe('상태 라벨', () => {
    it('stateScheduled가 올바르게 반환되어야 한다', () => {
      expect(L.stateScheduled(basketballConfig)).toBe('예정');
      expect(L.stateScheduled(constructionConfig)).toBe('대기');
    });

    it('emojiScheduled가 올바르게 반환되어야 한다', () => {
      expect(L.emojiScheduled(basketballConfig)).toBe('🔵');
    });
  });
});

describe('createLabel (동적 라벨 생성)', () => {
  it('count 접미사가 올바르게 생성되어야 한다', () => {
    expect(createLabel(basketballConfig, 'entity', 'count', 10)).toBe('학생 10명');
  });

  it('time 접미사가 올바르게 생성되어야 한다', () => {
    expect(createLabel(basketballConfig, 'service', 'time', '16:00')).toBe('수업 16:00');
  });

  it('rate 접미사가 올바르게 생성되어야 한다', () => {
    expect(createLabel(basketballConfig, 'attendance', 'rate', 95)).toBe('출석률 95%');
  });

  it('status 접미사가 올바르게 생성되어야 한다', () => {
    expect(createLabel(basketballConfig, 'payment', 'status', '완료')).toBe('결제 완료');
  });
});

describe('getStateLabel', () => {
  it('scheduled 상태를 반환해야 한다', () => {
    const state = getStateLabel(basketballConfig, 'scheduled');
    expect(state.label).toBe('예정');
    expect(state.emoji).toBe('🔵');
  });

  it('in_progress 상태를 반환해야 한다', () => {
    const state = getStateLabel(basketballConfig, 'in_progress');
    expect(state.label).toBe('진행중');
  });

  it('completed 상태를 반환해야 한다', () => {
    const state = getStateLabel(basketballConfig, 'completed');
    expect(state.label).toBe('완료');
    expect(state.emoji).toBe('✅');
  });

  it('cancelled 상태를 반환해야 한다', () => {
    const state = getStateLabel(basketballConfig, 'cancelled');
    expect(state.label).toBe('취소');
  });
});

describe('getActionLabel', () => {
  it('scheduled 상태에서 "수업 시작"을 반환해야 한다', () => {
    expect(getActionLabel(basketballConfig, 'scheduled')).toBe('수업 시작');
  });

  it('in_progress 상태에서 "수업 종료"를 반환해야 한다', () => {
    expect(getActionLabel(basketballConfig, 'in_progress')).toBe('수업 종료');
  });

  it('건축 산업에서 "프로젝트 시작"을 반환해야 한다', () => {
    expect(getActionLabel(constructionConfig, 'scheduled')).toBe('프로젝트 시작');
  });
});

describe('getScreenTitle', () => {
  it('Home 화면 타이틀이 대시보드여야 한다', () => {
    expect(getScreenTitle(basketballConfig, 'Home')).toBe('대시보드');
  });

  it('StudentList 화면 타이틀이 산업별로 달라야 한다', () => {
    expect(getScreenTitle(basketballConfig, 'StudentList')).toBe('학생 목록');
    expect(getScreenTitle(constructionConfig, 'StudentList')).toBe('건축주 목록');
    expect(getScreenTitle(clinicConfig, 'StudentList')).toBe('환자 목록');
  });

  it('CoachHome 화면 타이틀이 산업별로 달라야 한다', () => {
    expect(getScreenTitle(basketballConfig, 'CoachHome')).toBe('코치 홈');
    expect(getScreenTitle(clinicConfig, 'CoachHome')).toBe('의사 홈');
  });

  it('알 수 없는 화면은 screenName을 그대로 반환해야 한다', () => {
    expect(getScreenTitle(basketballConfig, 'UnknownScreen')).toBe('UnknownScreen');
  });
});

describe('T (문장 템플릿)', () => {
  it('todayService가 올바르게 생성되어야 한다', () => {
    expect(T.todayService(basketballConfig)).toBe('오늘의 수업');
    expect(T.todayService(constructionConfig)).toBe('오늘의 프로젝트');
  });

  it('startService가 올바르게 생성되어야 한다', () => {
    expect(T.startService(basketballConfig)).toBe('수업 시작');
    expect(T.startService(clinicConfig)).toBe('진료 시작');
  });

  it('attendanceCheck가 올바르게 생성되어야 한다', () => {
    expect(T.attendanceCheck(basketballConfig)).toBe('출석 체크');
    expect(T.attendanceCheck(clinicConfig)).toBe('내원 체크');
  });

  it('searchEntity가 올바르게 생성되어야 한다', () => {
    expect(T.searchEntity(basketballConfig)).toBe('학생 이름 검색...');
  });

  it('brandFull이 올바르게 생성되어야 한다', () => {
    expect(T.brandFull(basketballConfig)).toBe('🏀 온리쌤');
  });

  it('churnProbability가 올바르게 생성되어야 한다', () => {
    expect(T.churnProbability(basketballConfig)).toBe('퇴원 확률');
    expect(T.churnProbability(clinicConfig)).toBe('이탈 확률');
  });
});

describe('OUTCOME_ACTIONS (Outcome-Based Action Map)', () => {
  it('교육 outcome 액션이 정의되어야 한다', () => {
    expect(OUTCOME_ACTIONS.STUDENT_GROWTH).toContain('start_session');
    expect(OUTCOME_ACTIONS.STUDENT_GROWTH).toContain('end_session');
    expect(OUTCOME_ACTIONS.STUDENT_GROWTH).toContain('video');
  });

  it('건축 outcome 액션이 정의되어야 한다', () => {
    expect(OUTCOME_ACTIONS.SITE_COMPLETION).toContain('start_work');
    expect(OUTCOME_ACTIONS.SITE_COMPLETION).toContain('photo_report');
  });

  it('의료 outcome 액션이 정의되어야 한다', () => {
    expect(OUTCOME_ACTIONS.PATIENT_TREATMENT).toContain('start_care');
    expect(OUTCOME_ACTIONS.PATIENT_TREATMENT).toContain('prescription');
  });
});

describe('getOutcomeActions', () => {
  it('농구 산업 코드로 교육 액션을 반환해야 한다', () => {
    const actions = getOutcomeActions('SERVICE.EDU.SPORTS.BASKETBALL');
    expect(actions).toContain('start_session');
  });

  it('건축 산업 코드로 건축 액션을 반환해야 한다', () => {
    const actions = getOutcomeActions('SERVICE.CONSTRUCTION.RESIDENTIAL.HOUSE');
    expect(actions).toContain('start_work');
  });

  it('알 수 없는 코드는 기본 액션(STUDENT_GROWTH)을 반환해야 한다', () => {
    const actions = getOutcomeActions('UNKNOWN.CODE');
    expect(actions).toEqual(OUTCOME_ACTIONS.STUDENT_GROWTH);
  });
});

describe('isActionAllowed', () => {
  it('허용된 액션은 true를 반환해야 한다', () => {
    expect(isActionAllowed('SERVICE.EDU.SPORTS.BASKETBALL', 'start_session')).toBe(true);
    expect(isActionAllowed('SERVICE.EDU.SPORTS.BASKETBALL', 'video')).toBe(true);
  });

  it('허용되지 않은 액션은 false를 반환해야 한다', () => {
    expect(isActionAllowed('SERVICE.EDU.SPORTS.BASKETBALL', 'prescription')).toBe(false);
    expect(isActionAllowed('SERVICE.HEALTH.CLINIC', 'video')).toBe(false);
  });
});
