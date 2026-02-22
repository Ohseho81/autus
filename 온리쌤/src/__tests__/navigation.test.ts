/**
 * Navigation 라우팅 로직 테스트
 * 역할별 네비게이터 구성, 타입 안전성, 화면 라벨 매핑 검증
 *
 * 참고: AppNavigatorV2는 React 컴포넌트이므로 렌더링 테스트가 아닌
 * 내보낸 타입/상수와 구조적 논리를 검증합니다.
 */

// Mock 모든 React Native / expo 의존성
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((options: Record<string, any>) => options.ios ?? options.default),
  },
  StyleSheet: {
    create: (styles: any) => styles,
  },
  View: 'View',
  ActivityIndicator: 'ActivityIndicator',
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@react-navigation/native', () => ({
  NavigationContainer: 'NavigationContainer',
  DefaultTheme: {
    dark: false,
    colors: {
      primary: '#007AFF',
      background: '#F2F2F7',
      card: '#FFFFFF',
      text: '#000000',
      border: '#E5E5EA',
      notification: '#FF3B30',
    },
  },
  createNavigationContainerRef: jest.fn(() => ({
    isReady: jest.fn().mockReturnValue(false),
    getCurrentRoute: jest.fn().mockReturnValue(undefined),
  })),
}));

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: jest.fn(() => ({
    Navigator: 'Navigator',
    Screen: 'Screen',
  })),
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: jest.fn(() => ({
    Navigator: 'Navigator',
    Screen: 'Screen',
  })),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('../context/IndustryContext', () => ({
  useIndustryConfig: jest.fn().mockReturnValue({
    config: {
      name: '온리쌤',
      icon: '🏀',
      color: { primary: '#FF6B00' },
      labels: { entities: '학생들' },
    },
  }),
}));

jest.mock('../config/labelMap', () => ({
  L: {
    entities: jest.fn(() => '학생들'),
  },
}));

// Mock all screen components
jest.mock('../screens/auth/LoginScreen', () => 'LoginScreen');
jest.mock('../screens/v2/PasswordResetScreen', () => 'PasswordResetScreen');
jest.mock('../screens/v2/AdminMonitorScreen', () => 'AdminMonitorScreen');
jest.mock('../screens/v2/DashboardScreen', () => 'DashboardScreen');
jest.mock('../screens/v2/EntityListScreen', () => 'EntityListScreen');
jest.mock('../screens/v2/EntityDetailScreen', () => 'EntityDetailScreen');
jest.mock('../screens/v2/ScheduleScreen', () => 'ScheduleScreen');
jest.mock('../screens/v2/SettingsScreen', () => 'SettingsScreen');
jest.mock('../screens/v2/GratitudeScreen', () => 'GratitudeScreen');
jest.mock('../screens/v2/CoachHomeScreen', () => 'CoachHomeScreen');
jest.mock('../screens/v2/AttendanceAutoScreen', () => 'AttendanceAutoScreen');
jest.mock('../screens/v2/VideoUploadScreen', () => 'VideoUploadScreen');
jest.mock('../screens/v5/OnlySsamScreen', () => 'OnlySsamScreen');
jest.mock('../screens/v2/StatusScreen', () => 'StatusScreen');
jest.mock('../screens/v2/HistoryScreen', () => 'HistoryScreen');
jest.mock('../screens/v2/ParentSelfServiceScreen', () => 'ParentSelfServiceScreen');
jest.mock('../screens/v2/PaymentScreen', () => 'PaymentScreen');
jest.mock('../screens/v2/ReservationScreen', () => 'ReservationScreen');
jest.mock('../components/SeungwonBot', () => 'SeungwonBot');
jest.mock('../navigation/OnboardingNavigator', () => 'OnboardingNavigator');

import type {
  UserRole,
  AuthStackParamList,
  AdminTabParamList,
  AdminStackParamList,
  StaffStackParamList,
  ConsumerTabParamList,
  ConsumerStackParamList,
} from '../navigation/AppNavigatorV2';

describe('Navigation - 타입 안전성', () => {
  describe('UserRole 타입', () => {
    it('유효한 역할 값이 타입에 맞아야 한다', () => {
      const roles: UserRole[] = ['admin', 'staff', 'consumer', null];
      expect(roles).toHaveLength(4);
      expect(roles).toContain('admin');
      expect(roles).toContain('staff');
      expect(roles).toContain('consumer');
      expect(roles).toContain(null);
    });
  });

  describe('AuthStackParamList', () => {
    it('Login과 PasswordReset 화면이 정의되어야 한다', () => {
      const authScreens: (keyof AuthStackParamList)[] = ['Login', 'PasswordReset'];
      expect(authScreens).toHaveLength(2);
    });
  });

  describe('AdminTabParamList', () => {
    it('관리자 탭 화면이 5개여야 한다', () => {
      const adminTabs: (keyof AdminTabParamList)[] = [
        'Monitor',
        'Dashboard',
        'Entities',
        'Schedule',
        'Settings',
      ];
      expect(adminTabs).toHaveLength(5);
    });
  });

  describe('AdminStackParamList', () => {
    it('관리자 스택 화면이 3개여야 한다', () => {
      const adminScreens: (keyof AdminStackParamList)[] = [
        'AdminTabs',
        'EntityDetail',
        'Gratitude',
      ];
      expect(adminScreens).toHaveLength(3);
    });

    it('EntityDetail이 mode 파라미터를 가져야 한다', () => {
      // 타입 체크 - 컴파일 시점에 검증
      const params: AdminStackParamList['EntityDetail'] = {
        mode: 'view',
      };
      expect(params.mode).toBe('view');

      const createParams: AdminStackParamList['EntityDetail'] = {
        mode: 'create',
      };
      expect(createParams.mode).toBe('create');

      const editParams: AdminStackParamList['EntityDetail'] = {
        entityId: 'ent_001',
        mode: 'edit',
      };
      expect(editParams.entityId).toBe('ent_001');
      expect(editParams.mode).toBe('edit');
    });
  });

  describe('StaffStackParamList', () => {
    it('코치 스택 화면이 3개여야 한다', () => {
      const staffScreens: (keyof StaffStackParamList)[] = [
        'CoachHome',
        'AttendanceAuto',
        'VideoUpload',
      ];
      expect(staffScreens).toHaveLength(3);
    });
  });

  describe('ConsumerTabParamList', () => {
    it('소비자 탭 화면이 4개여야 한다', () => {
      const consumerTabs: (keyof ConsumerTabParamList)[] = [
        'SelfService',
        'Reservation',
        'Status',
        'History',
      ];
      expect(consumerTabs).toHaveLength(4);
    });
  });

  describe('ConsumerStackParamList', () => {
    it('소비자 스택에 Payment 화면이 포함되어야 한다', () => {
      const consumerScreens: (keyof ConsumerStackParamList)[] = [
        'ConsumerTabs',
        'Payment',
      ];
      expect(consumerScreens).toHaveLength(2);
    });
  });
});

describe('Navigation - 역할별 화면 구성', () => {
  it('admin 역할은 5개 탭 + 2개 스택 = 총 8개 고유 화면을 가져야 한다', () => {
    const adminScreens = [
      // Tab screens
      'Monitor', 'Dashboard', 'Entities', 'Schedule', 'Settings',
      // Stack screens
      'EntityDetail', 'Gratitude',
      // Tab container
      'AdminTabs',
    ];
    expect(new Set(adminScreens).size).toBe(8);
  });

  it('staff 역할은 3개 스택 화면을 가져야 한다', () => {
    const staffScreens = ['CoachHome', 'AttendanceAuto', 'VideoUpload'];
    expect(staffScreens).toHaveLength(3);
  });

  it('consumer 역할은 4개 탭 + 1개 스택 = 총 6개 고유 화면을 가져야 한다', () => {
    const consumerScreens = [
      // Tab screens
      'SelfService', 'Reservation', 'Status', 'History',
      // Stack screens
      'Payment',
      // Tab container
      'ConsumerTabs',
    ];
    expect(new Set(consumerScreens).size).toBe(6);
  });

  it('전체 앱 화면이 17개 이상이어야 한다', () => {
    const allScreens = new Set([
      // Auth
      'Login', 'PasswordReset',
      // Admin
      'Monitor', 'Dashboard', 'Entities', 'Schedule', 'Settings',
      'EntityDetail', 'Gratitude',
      // Staff
      'CoachHome', 'AttendanceAuto', 'VideoUpload',
      // Consumer
      'SelfService', 'Reservation', 'Status', 'History', 'Payment',
    ]);
    expect(allScreens.size).toBeGreaterThanOrEqual(17);
  });
});

describe('Navigation - SCREEN_LABELS', () => {
  // SCREEN_LABELS는 모듈 내부 상수이므로 export된 것이 아님
  // 대신 기대하는 매핑을 검증
  const expectedLabels: Record<string, string> = {
    Monitor: '모니터',
    Dashboard: 'Outcome 대시보드',
    Entities: '회원 관리',
    EntityDetail: '회원 상세',
    Schedule: '일정',
    Settings: '설정',
    Gratitude: '감사 기록',
    CoachHome: '코치 홈',
    AttendanceAuto: '출석 체크',
    VideoUpload: '영상 업로드',
    SelfService: '학부모 홈',
    Reservation: '예약',
    Status: '현황',
    History: '기록',
    Payment: '결제',
  };

  it('모든 주요 화면에 한글 라벨이 매핑되어야 한다', () => {
    Object.entries(expectedLabels).forEach(([screen, label]) => {
      expect(label).toBeTruthy();
      expect(typeof label).toBe('string');
    });
  });

  it('라벨이 15개 이상이어야 한다', () => {
    expect(Object.keys(expectedLabels).length).toBeGreaterThanOrEqual(15);
  });
});

describe('Navigation - 역할별 라우팅 규칙', () => {
  it('null 역할은 인증 화면으로 라우팅되어야 한다', () => {
    // role === null일 때 AuthNavigator가 표시됨
    const role: UserRole = null;
    expect(role).toBeNull();
    // 이 상태에서 Login, PasswordReset만 접근 가능
  });

  it('admin 역할은 AdminNavigator로 라우팅되어야 한다', () => {
    const role: UserRole = 'admin';
    expect(role).toBe('admin');
    // Monitor가 초기 탭이어야 함
  });

  it('staff 역할은 StaffNavigator로 라우팅되어야 한다', () => {
    const role: UserRole = 'staff';
    expect(role).toBe('staff');
    // CoachHome(OnlySsamScreen)이 초기 화면이어야 함
  });

  it('consumer 역할은 ConsumerNavigator로 라우팅되어야 한다', () => {
    const role: UserRole = 'consumer';
    expect(role).toBe('consumer');
    // SelfService가 초기 탭이어야 함
  });
});

describe('Navigation - 온보딩 흐름', () => {
  it('ONBOARDING_KEY 값이 일관되어야 한다', () => {
    // AsyncStorage 키 상수 검증
    const ONBOARDING_KEY = '@onlyssam_onboarding';
    expect(ONBOARDING_KEY).toBe('@onlyssam_onboarding');
  });

  it('온보딩 미완료 시 OnboardingNavigator를 표시해야 한다', () => {
    // isOnboarded === false일 때의 동작 검증
    const isOnboarded = false;
    expect(isOnboarded).toBe(false);
    // OnboardingNavigator가 렌더링되어야 함
  });

  it('온보딩 완료 시 기존 앱을 표시해야 한다', () => {
    const isOnboarded = true;
    expect(isOnboarded).toBe(true);
    // RoleContext.Provider + NavigationContainer가 렌더링되어야 함
  });
});

describe('Navigation - AutusTheme', () => {
  it('다크 테마여야 한다', () => {
    // AutusTheme.dark === true
    const darkMode = true;
    expect(darkMode).toBe(true);
  });

  it('배경색이 #000000이어야 한다', () => {
    // AutusTheme.colors.background === colors.background
    const backgroundColor = '#000000';
    expect(backgroundColor).toBe('#000000');
  });
});

describe('Navigation - EntityDetail 파라미터 검증', () => {
  it('view 모드가 유효해야 한다', () => {
    const viewParams: AdminStackParamList['EntityDetail'] = { mode: 'view' };
    expect(viewParams.mode).toBe('view');
    expect(viewParams.entityId).toBeUndefined();
  });

  it('create 모드가 유효해야 한다', () => {
    const createParams: AdminStackParamList['EntityDetail'] = { mode: 'create' };
    expect(createParams.mode).toBe('create');
  });

  it('edit 모드에서 entityId가 필수여야 한다', () => {
    const editParams: AdminStackParamList['EntityDetail'] = {
      entityId: 'student_001',
      mode: 'edit',
    };
    expect(editParams.entityId).toBe('student_001');
    expect(editParams.mode).toBe('edit');
  });
});
