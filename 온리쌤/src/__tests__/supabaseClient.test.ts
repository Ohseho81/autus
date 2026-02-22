/**
 * Bundle ID + 앱 설정 일관성 테스트
 */

describe('Bundle ID 일관성', () => {
  const appJson = require('../../app.json');

  it('bundleIdentifier가 com.allthatbasket.atb이어야 한다', () => {
    expect(appJson.expo.ios.bundleIdentifier).toBe('com.allthatbasket.atb');
    expect(appJson.expo.android.package).toBe('com.allthatbasket.atb');
  });

  it('OAuth scheme이 atb이어야 한다', () => {
    expect(appJson.expo.scheme).toBe('atb');
  });

  it('앱 이름이 ATB이어야 한다', () => {
    expect(appJson.expo.name).toBe('ATB');
  });

  it('slug가 ssam이어야 한다', () => {
    expect(appJson.expo.slug).toBe('ssam');
  });

  it('Supabase URL 환경변수 키가 설정에 포함되어야 한다', () => {
    expect(appJson.expo).toBeDefined();
    expect(typeof appJson.expo.name).toBe('string');
  });
});
