/**
 * AUTUS Local Agent - Intent Service
 * ====================================
 * 
 * OS Intent를 통한 클라이언트 사이드 자동화
 * 
 * 서버 경유 없음 → 법적 면책
 * "유저가 자기 기기에서 버튼을 눌러 앱을 실행한 것"
 */

import { Linking, Platform } from 'react-native';
import { Node } from './SQService';

// ═══════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type ActionType = 'sms' | 'call' | 'kakao' | 'email';

export interface ActionResult {
  success: boolean;
  actionType: ActionType;
  uri: string;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              MESSAGE TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

export const MESSAGE_TEMPLATES = {
  // 학원 특화
  payment_reminder: `안녕하세요, {student} 학부모님.
이번 달 수강료 납부 안내드립니다.
납부 기한: {dueDate}
금액: {amount}원
감사합니다.`,

  attendance_alert: `안녕하세요, {student} 학부모님.
오늘 {student} 학생이 결석하였습니다.
확인 부탁드립니다.`,

  score_up: `안녕하세요, {student} 학부모님.
{student} 학생의 성적이 향상되었습니다! 🎉
이전: {prevScore}점 → 현재: {currScore}점
계속 응원해주세요!`,

  score_down: `안녕하세요, {student} 학부모님.
{student} 학생의 성적 변화 안내드립니다.
이전: {prevScore}점 → 현재: {currScore}점
상담이 필요하시면 연락 주세요.`,

  check_in: `안녕하세요, {student} 학부모님.
{student} 학생이 학원에 도착했습니다. ✅
도착 시간: {time}`,

  // 일반
  thank_you: `안녕하세요, {name}님.
항상 저희를 믿고 맡겨주셔서 감사합니다.
앞으로도 최선을 다하겠습니다.`,

  birthday: `안녕하세요, {name}님.
생일 축하드립니다! 🎂
행복한 하루 되세요.`,

  custom: `{message}`,
};

export type TemplateKey = keyof typeof MESSAGE_TEMPLATES;

// ═══════════════════════════════════════════════════════════════════════════
//                              INTENT SERVICE
// ═══════════════════════════════════════════════════════════════════════════

class IntentService {
  // ─────────────────────────────────────────────────────────────────────────
  //                         MESSAGE FORMATTING
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 템플릿에 변수 적용
   */
  formatMessage(
    templateKey: TemplateKey,
    params: Record<string, string | number>
  ): string {
    let message = MESSAGE_TEMPLATES[templateKey];

    for (const [key, value] of Object.entries(params)) {
      const placeholder = `{${key}}`;
      message = message.replace(new RegExp(placeholder, 'g'), String(value));
    }

    return message;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         URI GENERATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * SMS Intent URI 생성
   */
  generateSmsUri(phone: string, message: string): string {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const encodedMessage = encodeURIComponent(message);

    if (Platform.OS === 'android') {
      return `sms:${cleanPhone}?body=${encodedMessage}`;
    } else {
      // iOS
      return `sms:${cleanPhone}&body=${encodedMessage}`;
    }
  }

  /**
   * 전화 Intent URI 생성
   */
  generateCallUri(phone: string): string {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    return `tel:${cleanPhone}`;
  }

  /**
   * 카카오톡 Intent URI 생성 (Android only)
   */
  generateKakaoUri(message: string): string {
    if (Platform.OS !== 'android') {
      return '';
    }

    const encodedMessage = encodeURIComponent(message);
    return `intent://send?text=${encodedMessage}#Intent;package=com.kakao.talk;end`;
  }

  /**
   * 이메일 Intent URI 생성
   */
  generateEmailUri(email: string, subject: string, body: string): string {
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    return `mailto:${email}?subject=${encodedSubject}&body=${encodedBody}`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         ACTION EXECUTION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Intent 실행 가능 여부 확인
   */
  async canExecuteIntent(uri: string): Promise<boolean> {
    try {
      return await Linking.canOpenURL(uri);
    } catch {
      return false;
    }
  }

  /**
   * Intent 실행
   */
  async executeIntent(uri: string): Promise<boolean> {
    try {
      const canOpen = await Linking.canOpenURL(uri);
      
      if (canOpen) {
        await Linking.openURL(uri);
        return true;
      } else {
        console.warn('Cannot open URI:', uri);
        return false;
      }
    } catch (error) {
      console.error('Failed to execute intent:', error);
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         HIGH-LEVEL ACTIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * SMS 발송 액션 준비
   */
  async prepareSmsAction(
    node: Node,
    templateKey: TemplateKey,
    params: Record<string, string | number> = {}
  ): Promise<ActionResult> {
    const message = this.formatMessage(templateKey, {
      name: node.name,
      student: node.studentName || node.name,
      ...params,
    });

    const uri = this.generateSmsUri(node.phone, message);
    const canOpen = await this.canExecuteIntent(uri);

    return {
      success: canOpen,
      actionType: 'sms',
      uri,
      error: canOpen ? undefined : 'SMS app not available',
    };
  }

  /**
   * 전화 액션 준비
   */
  async prepareCallAction(node: Node): Promise<ActionResult> {
    const uri = this.generateCallUri(node.phone);
    const canOpen = await this.canExecuteIntent(uri);

    return {
      success: canOpen,
      actionType: 'call',
      uri,
      error: canOpen ? undefined : 'Phone app not available',
    };
  }

  /**
   * 카카오톡 액션 준비
   */
  async prepareKakaoAction(
    templateKey: TemplateKey,
    params: Record<string, string | number> = {}
  ): Promise<ActionResult> {
    if (Platform.OS !== 'android') {
      return {
        success: false,
        actionType: 'kakao',
        uri: '',
        error: 'KakaoTalk intent only available on Android',
      };
    }

    const message = this.formatMessage(templateKey, params);
    const uri = this.generateKakaoUri(message);
    const canOpen = await this.canExecuteIntent(uri);

    return {
      success: canOpen,
      actionType: 'kakao',
      uri,
      error: canOpen ? undefined : 'KakaoTalk not installed',
    };
  }

  /**
   * 액션 실행
   */
  async executeAction(action: ActionResult): Promise<boolean> {
    if (!action.success || !action.uri) {
      return false;
    }

    return this.executeIntent(action.uri);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         BATCH ACTIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 배치 액션 준비 (실행은 유저가 하나씩)
   */
  async prepareBatchSmsActions(
    nodes: Node[],
    templateKey: TemplateKey,
    params: Record<string, string | number> = {}
  ): Promise<ActionResult[]> {
    const results: ActionResult[] = [];

    for (const node of nodes) {
      const result = await this.prepareSmsAction(node, templateKey, params);
      results.push(result);
    }

    return results;
  }
}

// 싱글톤 인스턴스
export const intentService = new IntentService();
export default intentService;

// ═══════════════════════════════════════════════════════════════════════════
//                              LEGAL DISCLAIMER
// ═══════════════════════════════════════════════════════════════════════════

export const LEGAL_DISCLAIMER = `
╔═══════════════════════════════════════════════════════════════════════════╗
║                            법적 면책 조항                                  ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  본 시스템은 메시지를 직접 발송하지 않습니다.                              ║
║                                                                           ║
║  동작 방식:                                                                ║
║  1. 사용자가 '발송' 버튼을 클릭합니다.                                     ║
║  2. 시스템이 OS의 기본 앱(SMS, 카카오톡 등)을 실행합니다.                  ║
║  3. 사용자가 해당 앱에서 '전송'을 직접 눌러야 메시지가 발송됩니다.         ║
║                                                                           ║
║  따라서:                                                                   ║
║  - 메시지 발송의 법적 책임은 사용자에게 있습니다.                          ║
║  - 본 시스템은 '편의 기능'을 제공할 뿐입니다.                              ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
`;










/**
 * AUTUS Local Agent - Intent Service
 * ====================================
 * 
 * OS Intent를 통한 클라이언트 사이드 자동화
 * 
 * 서버 경유 없음 → 법적 면책
 * "유저가 자기 기기에서 버튼을 눌러 앱을 실행한 것"
 */

import { Linking, Platform } from 'react-native';
import { Node } from './SQService';

// ═══════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type ActionType = 'sms' | 'call' | 'kakao' | 'email';

export interface ActionResult {
  success: boolean;
  actionType: ActionType;
  uri: string;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              MESSAGE TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

export const MESSAGE_TEMPLATES = {
  // 학원 특화
  payment_reminder: `안녕하세요, {student} 학부모님.
이번 달 수강료 납부 안내드립니다.
납부 기한: {dueDate}
금액: {amount}원
감사합니다.`,

  attendance_alert: `안녕하세요, {student} 학부모님.
오늘 {student} 학생이 결석하였습니다.
확인 부탁드립니다.`,

  score_up: `안녕하세요, {student} 학부모님.
{student} 학생의 성적이 향상되었습니다! 🎉
이전: {prevScore}점 → 현재: {currScore}점
계속 응원해주세요!`,

  score_down: `안녕하세요, {student} 학부모님.
{student} 학생의 성적 변화 안내드립니다.
이전: {prevScore}점 → 현재: {currScore}점
상담이 필요하시면 연락 주세요.`,

  check_in: `안녕하세요, {student} 학부모님.
{student} 학생이 학원에 도착했습니다. ✅
도착 시간: {time}`,

  // 일반
  thank_you: `안녕하세요, {name}님.
항상 저희를 믿고 맡겨주셔서 감사합니다.
앞으로도 최선을 다하겠습니다.`,

  birthday: `안녕하세요, {name}님.
생일 축하드립니다! 🎂
행복한 하루 되세요.`,

  custom: `{message}`,
};

export type TemplateKey = keyof typeof MESSAGE_TEMPLATES;

// ═══════════════════════════════════════════════════════════════════════════
//                              INTENT SERVICE
// ═══════════════════════════════════════════════════════════════════════════

class IntentService {
  // ─────────────────────────────────────────────────────────────────────────
  //                         MESSAGE FORMATTING
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 템플릿에 변수 적용
   */
  formatMessage(
    templateKey: TemplateKey,
    params: Record<string, string | number>
  ): string {
    let message = MESSAGE_TEMPLATES[templateKey];

    for (const [key, value] of Object.entries(params)) {
      const placeholder = `{${key}}`;
      message = message.replace(new RegExp(placeholder, 'g'), String(value));
    }

    return message;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         URI GENERATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * SMS Intent URI 생성
   */
  generateSmsUri(phone: string, message: string): string {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const encodedMessage = encodeURIComponent(message);

    if (Platform.OS === 'android') {
      return `sms:${cleanPhone}?body=${encodedMessage}`;
    } else {
      // iOS
      return `sms:${cleanPhone}&body=${encodedMessage}`;
    }
  }

  /**
   * 전화 Intent URI 생성
   */
  generateCallUri(phone: string): string {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    return `tel:${cleanPhone}`;
  }

  /**
   * 카카오톡 Intent URI 생성 (Android only)
   */
  generateKakaoUri(message: string): string {
    if (Platform.OS !== 'android') {
      return '';
    }

    const encodedMessage = encodeURIComponent(message);
    return `intent://send?text=${encodedMessage}#Intent;package=com.kakao.talk;end`;
  }

  /**
   * 이메일 Intent URI 생성
   */
  generateEmailUri(email: string, subject: string, body: string): string {
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    return `mailto:${email}?subject=${encodedSubject}&body=${encodedBody}`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         ACTION EXECUTION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Intent 실행 가능 여부 확인
   */
  async canExecuteIntent(uri: string): Promise<boolean> {
    try {
      return await Linking.canOpenURL(uri);
    } catch {
      return false;
    }
  }

  /**
   * Intent 실행
   */
  async executeIntent(uri: string): Promise<boolean> {
    try {
      const canOpen = await Linking.canOpenURL(uri);
      
      if (canOpen) {
        await Linking.openURL(uri);
        return true;
      } else {
        console.warn('Cannot open URI:', uri);
        return false;
      }
    } catch (error) {
      console.error('Failed to execute intent:', error);
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         HIGH-LEVEL ACTIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * SMS 발송 액션 준비
   */
  async prepareSmsAction(
    node: Node,
    templateKey: TemplateKey,
    params: Record<string, string | number> = {}
  ): Promise<ActionResult> {
    const message = this.formatMessage(templateKey, {
      name: node.name,
      student: node.studentName || node.name,
      ...params,
    });

    const uri = this.generateSmsUri(node.phone, message);
    const canOpen = await this.canExecuteIntent(uri);

    return {
      success: canOpen,
      actionType: 'sms',
      uri,
      error: canOpen ? undefined : 'SMS app not available',
    };
  }

  /**
   * 전화 액션 준비
   */
  async prepareCallAction(node: Node): Promise<ActionResult> {
    const uri = this.generateCallUri(node.phone);
    const canOpen = await this.canExecuteIntent(uri);

    return {
      success: canOpen,
      actionType: 'call',
      uri,
      error: canOpen ? undefined : 'Phone app not available',
    };
  }

  /**
   * 카카오톡 액션 준비
   */
  async prepareKakaoAction(
    templateKey: TemplateKey,
    params: Record<string, string | number> = {}
  ): Promise<ActionResult> {
    if (Platform.OS !== 'android') {
      return {
        success: false,
        actionType: 'kakao',
        uri: '',
        error: 'KakaoTalk intent only available on Android',
      };
    }

    const message = this.formatMessage(templateKey, params);
    const uri = this.generateKakaoUri(message);
    const canOpen = await this.canExecuteIntent(uri);

    return {
      success: canOpen,
      actionType: 'kakao',
      uri,
      error: canOpen ? undefined : 'KakaoTalk not installed',
    };
  }

  /**
   * 액션 실행
   */
  async executeAction(action: ActionResult): Promise<boolean> {
    if (!action.success || !action.uri) {
      return false;
    }

    return this.executeIntent(action.uri);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         BATCH ACTIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 배치 액션 준비 (실행은 유저가 하나씩)
   */
  async prepareBatchSmsActions(
    nodes: Node[],
    templateKey: TemplateKey,
    params: Record<string, string | number> = {}
  ): Promise<ActionResult[]> {
    const results: ActionResult[] = [];

    for (const node of nodes) {
      const result = await this.prepareSmsAction(node, templateKey, params);
      results.push(result);
    }

    return results;
  }
}

// 싱글톤 인스턴스
export const intentService = new IntentService();
export default intentService;

// ═══════════════════════════════════════════════════════════════════════════
//                              LEGAL DISCLAIMER
// ═══════════════════════════════════════════════════════════════════════════

export const LEGAL_DISCLAIMER = `
╔═══════════════════════════════════════════════════════════════════════════╗
║                            법적 면책 조항                                  ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  본 시스템은 메시지를 직접 발송하지 않습니다.                              ║
║                                                                           ║
║  동작 방식:                                                                ║
║  1. 사용자가 '발송' 버튼을 클릭합니다.                                     ║
║  2. 시스템이 OS의 기본 앱(SMS, 카카오톡 등)을 실행합니다.                  ║
║  3. 사용자가 해당 앱에서 '전송'을 직접 눌러야 메시지가 발송됩니다.         ║
║                                                                           ║
║  따라서:                                                                   ║
║  - 메시지 발송의 법적 책임은 사용자에게 있습니다.                          ║
║  - 본 시스템은 '편의 기능'을 제공할 뿐입니다.                              ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
`;










/**
 * AUTUS Local Agent - Intent Service
 * ====================================
 * 
 * OS Intent를 통한 클라이언트 사이드 자동화
 * 
 * 서버 경유 없음 → 법적 면책
 * "유저가 자기 기기에서 버튼을 눌러 앱을 실행한 것"
 */

import { Linking, Platform } from 'react-native';
import { Node } from './SQService';

// ═══════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type ActionType = 'sms' | 'call' | 'kakao' | 'email';

export interface ActionResult {
  success: boolean;
  actionType: ActionType;
  uri: string;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              MESSAGE TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

export const MESSAGE_TEMPLATES = {
  // 학원 특화
  payment_reminder: `안녕하세요, {student} 학부모님.
이번 달 수강료 납부 안내드립니다.
납부 기한: {dueDate}
금액: {amount}원
감사합니다.`,

  attendance_alert: `안녕하세요, {student} 학부모님.
오늘 {student} 학생이 결석하였습니다.
확인 부탁드립니다.`,

  score_up: `안녕하세요, {student} 학부모님.
{student} 학생의 성적이 향상되었습니다! 🎉
이전: {prevScore}점 → 현재: {currScore}점
계속 응원해주세요!`,

  score_down: `안녕하세요, {student} 학부모님.
{student} 학생의 성적 변화 안내드립니다.
이전: {prevScore}점 → 현재: {currScore}점
상담이 필요하시면 연락 주세요.`,

  check_in: `안녕하세요, {student} 학부모님.
{student} 학생이 학원에 도착했습니다. ✅
도착 시간: {time}`,

  // 일반
  thank_you: `안녕하세요, {name}님.
항상 저희를 믿고 맡겨주셔서 감사합니다.
앞으로도 최선을 다하겠습니다.`,

  birthday: `안녕하세요, {name}님.
생일 축하드립니다! 🎂
행복한 하루 되세요.`,

  custom: `{message}`,
};

export type TemplateKey = keyof typeof MESSAGE_TEMPLATES;

// ═══════════════════════════════════════════════════════════════════════════
//                              INTENT SERVICE
// ═══════════════════════════════════════════════════════════════════════════

class IntentService {
  // ─────────────────────────────────────────────────────────────────────────
  //                         MESSAGE FORMATTING
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 템플릿에 변수 적용
   */
  formatMessage(
    templateKey: TemplateKey,
    params: Record<string, string | number>
  ): string {
    let message = MESSAGE_TEMPLATES[templateKey];

    for (const [key, value] of Object.entries(params)) {
      const placeholder = `{${key}}`;
      message = message.replace(new RegExp(placeholder, 'g'), String(value));
    }

    return message;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         URI GENERATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * SMS Intent URI 생성
   */
  generateSmsUri(phone: string, message: string): string {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const encodedMessage = encodeURIComponent(message);

    if (Platform.OS === 'android') {
      return `sms:${cleanPhone}?body=${encodedMessage}`;
    } else {
      // iOS
      return `sms:${cleanPhone}&body=${encodedMessage}`;
    }
  }

  /**
   * 전화 Intent URI 생성
   */
  generateCallUri(phone: string): string {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    return `tel:${cleanPhone}`;
  }

  /**
   * 카카오톡 Intent URI 생성 (Android only)
   */
  generateKakaoUri(message: string): string {
    if (Platform.OS !== 'android') {
      return '';
    }

    const encodedMessage = encodeURIComponent(message);
    return `intent://send?text=${encodedMessage}#Intent;package=com.kakao.talk;end`;
  }

  /**
   * 이메일 Intent URI 생성
   */
  generateEmailUri(email: string, subject: string, body: string): string {
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    return `mailto:${email}?subject=${encodedSubject}&body=${encodedBody}`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         ACTION EXECUTION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Intent 실행 가능 여부 확인
   */
  async canExecuteIntent(uri: string): Promise<boolean> {
    try {
      return await Linking.canOpenURL(uri);
    } catch {
      return false;
    }
  }

  /**
   * Intent 실행
   */
  async executeIntent(uri: string): Promise<boolean> {
    try {
      const canOpen = await Linking.canOpenURL(uri);
      
      if (canOpen) {
        await Linking.openURL(uri);
        return true;
      } else {
        console.warn('Cannot open URI:', uri);
        return false;
      }
    } catch (error) {
      console.error('Failed to execute intent:', error);
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         HIGH-LEVEL ACTIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * SMS 발송 액션 준비
   */
  async prepareSmsAction(
    node: Node,
    templateKey: TemplateKey,
    params: Record<string, string | number> = {}
  ): Promise<ActionResult> {
    const message = this.formatMessage(templateKey, {
      name: node.name,
      student: node.studentName || node.name,
      ...params,
    });

    const uri = this.generateSmsUri(node.phone, message);
    const canOpen = await this.canExecuteIntent(uri);

    return {
      success: canOpen,
      actionType: 'sms',
      uri,
      error: canOpen ? undefined : 'SMS app not available',
    };
  }

  /**
   * 전화 액션 준비
   */
  async prepareCallAction(node: Node): Promise<ActionResult> {
    const uri = this.generateCallUri(node.phone);
    const canOpen = await this.canExecuteIntent(uri);

    return {
      success: canOpen,
      actionType: 'call',
      uri,
      error: canOpen ? undefined : 'Phone app not available',
    };
  }

  /**
   * 카카오톡 액션 준비
   */
  async prepareKakaoAction(
    templateKey: TemplateKey,
    params: Record<string, string | number> = {}
  ): Promise<ActionResult> {
    if (Platform.OS !== 'android') {
      return {
        success: false,
        actionType: 'kakao',
        uri: '',
        error: 'KakaoTalk intent only available on Android',
      };
    }

    const message = this.formatMessage(templateKey, params);
    const uri = this.generateKakaoUri(message);
    const canOpen = await this.canExecuteIntent(uri);

    return {
      success: canOpen,
      actionType: 'kakao',
      uri,
      error: canOpen ? undefined : 'KakaoTalk not installed',
    };
  }

  /**
   * 액션 실행
   */
  async executeAction(action: ActionResult): Promise<boolean> {
    if (!action.success || !action.uri) {
      return false;
    }

    return this.executeIntent(action.uri);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         BATCH ACTIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 배치 액션 준비 (실행은 유저가 하나씩)
   */
  async prepareBatchSmsActions(
    nodes: Node[],
    templateKey: TemplateKey,
    params: Record<string, string | number> = {}
  ): Promise<ActionResult[]> {
    const results: ActionResult[] = [];

    for (const node of nodes) {
      const result = await this.prepareSmsAction(node, templateKey, params);
      results.push(result);
    }

    return results;
  }
}

// 싱글톤 인스턴스
export const intentService = new IntentService();
export default intentService;

// ═══════════════════════════════════════════════════════════════════════════
//                              LEGAL DISCLAIMER
// ═══════════════════════════════════════════════════════════════════════════

export const LEGAL_DISCLAIMER = `
╔═══════════════════════════════════════════════════════════════════════════╗
║                            법적 면책 조항                                  ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  본 시스템은 메시지를 직접 발송하지 않습니다.                              ║
║                                                                           ║
║  동작 방식:                                                                ║
║  1. 사용자가 '발송' 버튼을 클릭합니다.                                     ║
║  2. 시스템이 OS의 기본 앱(SMS, 카카오톡 등)을 실행합니다.                  ║
║  3. 사용자가 해당 앱에서 '전송'을 직접 눌러야 메시지가 발송됩니다.         ║
║                                                                           ║
║  따라서:                                                                   ║
║  - 메시지 발송의 법적 책임은 사용자에게 있습니다.                          ║
║  - 본 시스템은 '편의 기능'을 제공할 뿐입니다.                              ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
`;










/**
 * AUTUS Local Agent - Intent Service
 * ====================================
 * 
 * OS Intent를 통한 클라이언트 사이드 자동화
 * 
 * 서버 경유 없음 → 법적 면책
 * "유저가 자기 기기에서 버튼을 눌러 앱을 실행한 것"
 */

import { Linking, Platform } from 'react-native';
import { Node } from './SQService';

// ═══════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type ActionType = 'sms' | 'call' | 'kakao' | 'email';

export interface ActionResult {
  success: boolean;
  actionType: ActionType;
  uri: string;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              MESSAGE TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

export const MESSAGE_TEMPLATES = {
  // 학원 특화
  payment_reminder: `안녕하세요, {student} 학부모님.
이번 달 수강료 납부 안내드립니다.
납부 기한: {dueDate}
금액: {amount}원
감사합니다.`,

  attendance_alert: `안녕하세요, {student} 학부모님.
오늘 {student} 학생이 결석하였습니다.
확인 부탁드립니다.`,

  score_up: `안녕하세요, {student} 학부모님.
{student} 학생의 성적이 향상되었습니다! 🎉
이전: {prevScore}점 → 현재: {currScore}점
계속 응원해주세요!`,

  score_down: `안녕하세요, {student} 학부모님.
{student} 학생의 성적 변화 안내드립니다.
이전: {prevScore}점 → 현재: {currScore}점
상담이 필요하시면 연락 주세요.`,

  check_in: `안녕하세요, {student} 학부모님.
{student} 학생이 학원에 도착했습니다. ✅
도착 시간: {time}`,

  // 일반
  thank_you: `안녕하세요, {name}님.
항상 저희를 믿고 맡겨주셔서 감사합니다.
앞으로도 최선을 다하겠습니다.`,

  birthday: `안녕하세요, {name}님.
생일 축하드립니다! 🎂
행복한 하루 되세요.`,

  custom: `{message}`,
};

export type TemplateKey = keyof typeof MESSAGE_TEMPLATES;

// ═══════════════════════════════════════════════════════════════════════════
//                              INTENT SERVICE
// ═══════════════════════════════════════════════════════════════════════════

class IntentService {
  // ─────────────────────────────────────────────────────────────────────────
  //                         MESSAGE FORMATTING
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 템플릿에 변수 적용
   */
  formatMessage(
    templateKey: TemplateKey,
    params: Record<string, string | number>
  ): string {
    let message = MESSAGE_TEMPLATES[templateKey];

    for (const [key, value] of Object.entries(params)) {
      const placeholder = `{${key}}`;
      message = message.replace(new RegExp(placeholder, 'g'), String(value));
    }

    return message;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         URI GENERATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * SMS Intent URI 생성
   */
  generateSmsUri(phone: string, message: string): string {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const encodedMessage = encodeURIComponent(message);

    if (Platform.OS === 'android') {
      return `sms:${cleanPhone}?body=${encodedMessage}`;
    } else {
      // iOS
      return `sms:${cleanPhone}&body=${encodedMessage}`;
    }
  }

  /**
   * 전화 Intent URI 생성
   */
  generateCallUri(phone: string): string {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    return `tel:${cleanPhone}`;
  }

  /**
   * 카카오톡 Intent URI 생성 (Android only)
   */
  generateKakaoUri(message: string): string {
    if (Platform.OS !== 'android') {
      return '';
    }

    const encodedMessage = encodeURIComponent(message);
    return `intent://send?text=${encodedMessage}#Intent;package=com.kakao.talk;end`;
  }

  /**
   * 이메일 Intent URI 생성
   */
  generateEmailUri(email: string, subject: string, body: string): string {
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    return `mailto:${email}?subject=${encodedSubject}&body=${encodedBody}`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         ACTION EXECUTION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Intent 실행 가능 여부 확인
   */
  async canExecuteIntent(uri: string): Promise<boolean> {
    try {
      return await Linking.canOpenURL(uri);
    } catch {
      return false;
    }
  }

  /**
   * Intent 실행
   */
  async executeIntent(uri: string): Promise<boolean> {
    try {
      const canOpen = await Linking.canOpenURL(uri);
      
      if (canOpen) {
        await Linking.openURL(uri);
        return true;
      } else {
        console.warn('Cannot open URI:', uri);
        return false;
      }
    } catch (error) {
      console.error('Failed to execute intent:', error);
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         HIGH-LEVEL ACTIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * SMS 발송 액션 준비
   */
  async prepareSmsAction(
    node: Node,
    templateKey: TemplateKey,
    params: Record<string, string | number> = {}
  ): Promise<ActionResult> {
    const message = this.formatMessage(templateKey, {
      name: node.name,
      student: node.studentName || node.name,
      ...params,
    });

    const uri = this.generateSmsUri(node.phone, message);
    const canOpen = await this.canExecuteIntent(uri);

    return {
      success: canOpen,
      actionType: 'sms',
      uri,
      error: canOpen ? undefined : 'SMS app not available',
    };
  }

  /**
   * 전화 액션 준비
   */
  async prepareCallAction(node: Node): Promise<ActionResult> {
    const uri = this.generateCallUri(node.phone);
    const canOpen = await this.canExecuteIntent(uri);

    return {
      success: canOpen,
      actionType: 'call',
      uri,
      error: canOpen ? undefined : 'Phone app not available',
    };
  }

  /**
   * 카카오톡 액션 준비
   */
  async prepareKakaoAction(
    templateKey: TemplateKey,
    params: Record<string, string | number> = {}
  ): Promise<ActionResult> {
    if (Platform.OS !== 'android') {
      return {
        success: false,
        actionType: 'kakao',
        uri: '',
        error: 'KakaoTalk intent only available on Android',
      };
    }

    const message = this.formatMessage(templateKey, params);
    const uri = this.generateKakaoUri(message);
    const canOpen = await this.canExecuteIntent(uri);

    return {
      success: canOpen,
      actionType: 'kakao',
      uri,
      error: canOpen ? undefined : 'KakaoTalk not installed',
    };
  }

  /**
   * 액션 실행
   */
  async executeAction(action: ActionResult): Promise<boolean> {
    if (!action.success || !action.uri) {
      return false;
    }

    return this.executeIntent(action.uri);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         BATCH ACTIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 배치 액션 준비 (실행은 유저가 하나씩)
   */
  async prepareBatchSmsActions(
    nodes: Node[],
    templateKey: TemplateKey,
    params: Record<string, string | number> = {}
  ): Promise<ActionResult[]> {
    const results: ActionResult[] = [];

    for (const node of nodes) {
      const result = await this.prepareSmsAction(node, templateKey, params);
      results.push(result);
    }

    return results;
  }
}

// 싱글톤 인스턴스
export const intentService = new IntentService();
export default intentService;

// ═══════════════════════════════════════════════════════════════════════════
//                              LEGAL DISCLAIMER
// ═══════════════════════════════════════════════════════════════════════════

export const LEGAL_DISCLAIMER = `
╔═══════════════════════════════════════════════════════════════════════════╗
║                            법적 면책 조항                                  ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  본 시스템은 메시지를 직접 발송하지 않습니다.                              ║
║                                                                           ║
║  동작 방식:                                                                ║
║  1. 사용자가 '발송' 버튼을 클릭합니다.                                     ║
║  2. 시스템이 OS의 기본 앱(SMS, 카카오톡 등)을 실행합니다.                  ║
║  3. 사용자가 해당 앱에서 '전송'을 직접 눌러야 메시지가 발송됩니다.         ║
║                                                                           ║
║  따라서:                                                                   ║
║  - 메시지 발송의 법적 책임은 사용자에게 있습니다.                          ║
║  - 본 시스템은 '편의 기능'을 제공할 뿐입니다.                              ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
`;










/**
 * AUTUS Local Agent - Intent Service
 * ====================================
 * 
 * OS Intent를 통한 클라이언트 사이드 자동화
 * 
 * 서버 경유 없음 → 법적 면책
 * "유저가 자기 기기에서 버튼을 눌러 앱을 실행한 것"
 */

import { Linking, Platform } from 'react-native';
import { Node } from './SQService';

// ═══════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type ActionType = 'sms' | 'call' | 'kakao' | 'email';

export interface ActionResult {
  success: boolean;
  actionType: ActionType;
  uri: string;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              MESSAGE TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

export const MESSAGE_TEMPLATES = {
  // 학원 특화
  payment_reminder: `안녕하세요, {student} 학부모님.
이번 달 수강료 납부 안내드립니다.
납부 기한: {dueDate}
금액: {amount}원
감사합니다.`,

  attendance_alert: `안녕하세요, {student} 학부모님.
오늘 {student} 학생이 결석하였습니다.
확인 부탁드립니다.`,

  score_up: `안녕하세요, {student} 학부모님.
{student} 학생의 성적이 향상되었습니다! 🎉
이전: {prevScore}점 → 현재: {currScore}점
계속 응원해주세요!`,

  score_down: `안녕하세요, {student} 학부모님.
{student} 학생의 성적 변화 안내드립니다.
이전: {prevScore}점 → 현재: {currScore}점
상담이 필요하시면 연락 주세요.`,

  check_in: `안녕하세요, {student} 학부모님.
{student} 학생이 학원에 도착했습니다. ✅
도착 시간: {time}`,

  // 일반
  thank_you: `안녕하세요, {name}님.
항상 저희를 믿고 맡겨주셔서 감사합니다.
앞으로도 최선을 다하겠습니다.`,

  birthday: `안녕하세요, {name}님.
생일 축하드립니다! 🎂
행복한 하루 되세요.`,

  custom: `{message}`,
};

export type TemplateKey = keyof typeof MESSAGE_TEMPLATES;

// ═══════════════════════════════════════════════════════════════════════════
//                              INTENT SERVICE
// ═══════════════════════════════════════════════════════════════════════════

class IntentService {
  // ─────────────────────────────────────────────────────────────────────────
  //                         MESSAGE FORMATTING
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 템플릿에 변수 적용
   */
  formatMessage(
    templateKey: TemplateKey,
    params: Record<string, string | number>
  ): string {
    let message = MESSAGE_TEMPLATES[templateKey];

    for (const [key, value] of Object.entries(params)) {
      const placeholder = `{${key}}`;
      message = message.replace(new RegExp(placeholder, 'g'), String(value));
    }

    return message;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         URI GENERATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * SMS Intent URI 생성
   */
  generateSmsUri(phone: string, message: string): string {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const encodedMessage = encodeURIComponent(message);

    if (Platform.OS === 'android') {
      return `sms:${cleanPhone}?body=${encodedMessage}`;
    } else {
      // iOS
      return `sms:${cleanPhone}&body=${encodedMessage}`;
    }
  }

  /**
   * 전화 Intent URI 생성
   */
  generateCallUri(phone: string): string {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    return `tel:${cleanPhone}`;
  }

  /**
   * 카카오톡 Intent URI 생성 (Android only)
   */
  generateKakaoUri(message: string): string {
    if (Platform.OS !== 'android') {
      return '';
    }

    const encodedMessage = encodeURIComponent(message);
    return `intent://send?text=${encodedMessage}#Intent;package=com.kakao.talk;end`;
  }

  /**
   * 이메일 Intent URI 생성
   */
  generateEmailUri(email: string, subject: string, body: string): string {
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    return `mailto:${email}?subject=${encodedSubject}&body=${encodedBody}`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         ACTION EXECUTION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Intent 실행 가능 여부 확인
   */
  async canExecuteIntent(uri: string): Promise<boolean> {
    try {
      return await Linking.canOpenURL(uri);
    } catch {
      return false;
    }
  }

  /**
   * Intent 실행
   */
  async executeIntent(uri: string): Promise<boolean> {
    try {
      const canOpen = await Linking.canOpenURL(uri);
      
      if (canOpen) {
        await Linking.openURL(uri);
        return true;
      } else {
        console.warn('Cannot open URI:', uri);
        return false;
      }
    } catch (error) {
      console.error('Failed to execute intent:', error);
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         HIGH-LEVEL ACTIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * SMS 발송 액션 준비
   */
  async prepareSmsAction(
    node: Node,
    templateKey: TemplateKey,
    params: Record<string, string | number> = {}
  ): Promise<ActionResult> {
    const message = this.formatMessage(templateKey, {
      name: node.name,
      student: node.studentName || node.name,
      ...params,
    });

    const uri = this.generateSmsUri(node.phone, message);
    const canOpen = await this.canExecuteIntent(uri);

    return {
      success: canOpen,
      actionType: 'sms',
      uri,
      error: canOpen ? undefined : 'SMS app not available',
    };
  }

  /**
   * 전화 액션 준비
   */
  async prepareCallAction(node: Node): Promise<ActionResult> {
    const uri = this.generateCallUri(node.phone);
    const canOpen = await this.canExecuteIntent(uri);

    return {
      success: canOpen,
      actionType: 'call',
      uri,
      error: canOpen ? undefined : 'Phone app not available',
    };
  }

  /**
   * 카카오톡 액션 준비
   */
  async prepareKakaoAction(
    templateKey: TemplateKey,
    params: Record<string, string | number> = {}
  ): Promise<ActionResult> {
    if (Platform.OS !== 'android') {
      return {
        success: false,
        actionType: 'kakao',
        uri: '',
        error: 'KakaoTalk intent only available on Android',
      };
    }

    const message = this.formatMessage(templateKey, params);
    const uri = this.generateKakaoUri(message);
    const canOpen = await this.canExecuteIntent(uri);

    return {
      success: canOpen,
      actionType: 'kakao',
      uri,
      error: canOpen ? undefined : 'KakaoTalk not installed',
    };
  }

  /**
   * 액션 실행
   */
  async executeAction(action: ActionResult): Promise<boolean> {
    if (!action.success || !action.uri) {
      return false;
    }

    return this.executeIntent(action.uri);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         BATCH ACTIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 배치 액션 준비 (실행은 유저가 하나씩)
   */
  async prepareBatchSmsActions(
    nodes: Node[],
    templateKey: TemplateKey,
    params: Record<string, string | number> = {}
  ): Promise<ActionResult[]> {
    const results: ActionResult[] = [];

    for (const node of nodes) {
      const result = await this.prepareSmsAction(node, templateKey, params);
      results.push(result);
    }

    return results;
  }
}

// 싱글톤 인스턴스
export const intentService = new IntentService();
export default intentService;

// ═══════════════════════════════════════════════════════════════════════════
//                              LEGAL DISCLAIMER
// ═══════════════════════════════════════════════════════════════════════════

export const LEGAL_DISCLAIMER = `
╔═══════════════════════════════════════════════════════════════════════════╗
║                            법적 면책 조항                                  ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  본 시스템은 메시지를 직접 발송하지 않습니다.                              ║
║                                                                           ║
║  동작 방식:                                                                ║
║  1. 사용자가 '발송' 버튼을 클릭합니다.                                     ║
║  2. 시스템이 OS의 기본 앱(SMS, 카카오톡 등)을 실행합니다.                  ║
║  3. 사용자가 해당 앱에서 '전송'을 직접 눌러야 메시지가 발송됩니다.         ║
║                                                                           ║
║  따라서:                                                                   ║
║  - 메시지 발송의 법적 책임은 사용자에게 있습니다.                          ║
║  - 본 시스템은 '편의 기능'을 제공할 뿐입니다.                              ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
`;




















/**
 * AUTUS Local Agent - Intent Service
 * ====================================
 * 
 * OS Intent를 통한 클라이언트 사이드 자동화
 * 
 * 서버 경유 없음 → 법적 면책
 * "유저가 자기 기기에서 버튼을 눌러 앱을 실행한 것"
 */

import { Linking, Platform } from 'react-native';
import { Node } from './SQService';

// ═══════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type ActionType = 'sms' | 'call' | 'kakao' | 'email';

export interface ActionResult {
  success: boolean;
  actionType: ActionType;
  uri: string;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              MESSAGE TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

export const MESSAGE_TEMPLATES = {
  // 학원 특화
  payment_reminder: `안녕하세요, {student} 학부모님.
이번 달 수강료 납부 안내드립니다.
납부 기한: {dueDate}
금액: {amount}원
감사합니다.`,

  attendance_alert: `안녕하세요, {student} 학부모님.
오늘 {student} 학생이 결석하였습니다.
확인 부탁드립니다.`,

  score_up: `안녕하세요, {student} 학부모님.
{student} 학생의 성적이 향상되었습니다! 🎉
이전: {prevScore}점 → 현재: {currScore}점
계속 응원해주세요!`,

  score_down: `안녕하세요, {student} 학부모님.
{student} 학생의 성적 변화 안내드립니다.
이전: {prevScore}점 → 현재: {currScore}점
상담이 필요하시면 연락 주세요.`,

  check_in: `안녕하세요, {student} 학부모님.
{student} 학생이 학원에 도착했습니다. ✅
도착 시간: {time}`,

  // 일반
  thank_you: `안녕하세요, {name}님.
항상 저희를 믿고 맡겨주셔서 감사합니다.
앞으로도 최선을 다하겠습니다.`,

  birthday: `안녕하세요, {name}님.
생일 축하드립니다! 🎂
행복한 하루 되세요.`,

  custom: `{message}`,
};

export type TemplateKey = keyof typeof MESSAGE_TEMPLATES;

// ═══════════════════════════════════════════════════════════════════════════
//                              INTENT SERVICE
// ═══════════════════════════════════════════════════════════════════════════

class IntentService {
  // ─────────────────────────────────────────────────────────────────────────
  //                         MESSAGE FORMATTING
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 템플릿에 변수 적용
   */
  formatMessage(
    templateKey: TemplateKey,
    params: Record<string, string | number>
  ): string {
    let message = MESSAGE_TEMPLATES[templateKey];

    for (const [key, value] of Object.entries(params)) {
      const placeholder = `{${key}}`;
      message = message.replace(new RegExp(placeholder, 'g'), String(value));
    }

    return message;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         URI GENERATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * SMS Intent URI 생성
   */
  generateSmsUri(phone: string, message: string): string {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const encodedMessage = encodeURIComponent(message);

    if (Platform.OS === 'android') {
      return `sms:${cleanPhone}?body=${encodedMessage}`;
    } else {
      // iOS
      return `sms:${cleanPhone}&body=${encodedMessage}`;
    }
  }

  /**
   * 전화 Intent URI 생성
   */
  generateCallUri(phone: string): string {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    return `tel:${cleanPhone}`;
  }

  /**
   * 카카오톡 Intent URI 생성 (Android only)
   */
  generateKakaoUri(message: string): string {
    if (Platform.OS !== 'android') {
      return '';
    }

    const encodedMessage = encodeURIComponent(message);
    return `intent://send?text=${encodedMessage}#Intent;package=com.kakao.talk;end`;
  }

  /**
   * 이메일 Intent URI 생성
   */
  generateEmailUri(email: string, subject: string, body: string): string {
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    return `mailto:${email}?subject=${encodedSubject}&body=${encodedBody}`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         ACTION EXECUTION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Intent 실행 가능 여부 확인
   */
  async canExecuteIntent(uri: string): Promise<boolean> {
    try {
      return await Linking.canOpenURL(uri);
    } catch {
      return false;
    }
  }

  /**
   * Intent 실행
   */
  async executeIntent(uri: string): Promise<boolean> {
    try {
      const canOpen = await Linking.canOpenURL(uri);
      
      if (canOpen) {
        await Linking.openURL(uri);
        return true;
      } else {
        console.warn('Cannot open URI:', uri);
        return false;
      }
    } catch (error) {
      console.error('Failed to execute intent:', error);
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         HIGH-LEVEL ACTIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * SMS 발송 액션 준비
   */
  async prepareSmsAction(
    node: Node,
    templateKey: TemplateKey,
    params: Record<string, string | number> = {}
  ): Promise<ActionResult> {
    const message = this.formatMessage(templateKey, {
      name: node.name,
      student: node.studentName || node.name,
      ...params,
    });

    const uri = this.generateSmsUri(node.phone, message);
    const canOpen = await this.canExecuteIntent(uri);

    return {
      success: canOpen,
      actionType: 'sms',
      uri,
      error: canOpen ? undefined : 'SMS app not available',
    };
  }

  /**
   * 전화 액션 준비
   */
  async prepareCallAction(node: Node): Promise<ActionResult> {
    const uri = this.generateCallUri(node.phone);
    const canOpen = await this.canExecuteIntent(uri);

    return {
      success: canOpen,
      actionType: 'call',
      uri,
      error: canOpen ? undefined : 'Phone app not available',
    };
  }

  /**
   * 카카오톡 액션 준비
   */
  async prepareKakaoAction(
    templateKey: TemplateKey,
    params: Record<string, string | number> = {}
  ): Promise<ActionResult> {
    if (Platform.OS !== 'android') {
      return {
        success: false,
        actionType: 'kakao',
        uri: '',
        error: 'KakaoTalk intent only available on Android',
      };
    }

    const message = this.formatMessage(templateKey, params);
    const uri = this.generateKakaoUri(message);
    const canOpen = await this.canExecuteIntent(uri);

    return {
      success: canOpen,
      actionType: 'kakao',
      uri,
      error: canOpen ? undefined : 'KakaoTalk not installed',
    };
  }

  /**
   * 액션 실행
   */
  async executeAction(action: ActionResult): Promise<boolean> {
    if (!action.success || !action.uri) {
      return false;
    }

    return this.executeIntent(action.uri);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         BATCH ACTIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 배치 액션 준비 (실행은 유저가 하나씩)
   */
  async prepareBatchSmsActions(
    nodes: Node[],
    templateKey: TemplateKey,
    params: Record<string, string | number> = {}
  ): Promise<ActionResult[]> {
    const results: ActionResult[] = [];

    for (const node of nodes) {
      const result = await this.prepareSmsAction(node, templateKey, params);
      results.push(result);
    }

    return results;
  }
}

// 싱글톤 인스턴스
export const intentService = new IntentService();
export default intentService;

// ═══════════════════════════════════════════════════════════════════════════
//                              LEGAL DISCLAIMER
// ═══════════════════════════════════════════════════════════════════════════

export const LEGAL_DISCLAIMER = `
╔═══════════════════════════════════════════════════════════════════════════╗
║                            법적 면책 조항                                  ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  본 시스템은 메시지를 직접 발송하지 않습니다.                              ║
║                                                                           ║
║  동작 방식:                                                                ║
║  1. 사용자가 '발송' 버튼을 클릭합니다.                                     ║
║  2. 시스템이 OS의 기본 앱(SMS, 카카오톡 등)을 실행합니다.                  ║
║  3. 사용자가 해당 앱에서 '전송'을 직접 눌러야 메시지가 발송됩니다.         ║
║                                                                           ║
║  따라서:                                                                   ║
║  - 메시지 발송의 법적 책임은 사용자에게 있습니다.                          ║
║  - 본 시스템은 '편의 기능'을 제공할 뿐입니다.                              ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
`;










/**
 * AUTUS Local Agent - Intent Service
 * ====================================
 * 
 * OS Intent를 통한 클라이언트 사이드 자동화
 * 
 * 서버 경유 없음 → 법적 면책
 * "유저가 자기 기기에서 버튼을 눌러 앱을 실행한 것"
 */

import { Linking, Platform } from 'react-native';
import { Node } from './SQService';

// ═══════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type ActionType = 'sms' | 'call' | 'kakao' | 'email';

export interface ActionResult {
  success: boolean;
  actionType: ActionType;
  uri: string;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              MESSAGE TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

export const MESSAGE_TEMPLATES = {
  // 학원 특화
  payment_reminder: `안녕하세요, {student} 학부모님.
이번 달 수강료 납부 안내드립니다.
납부 기한: {dueDate}
금액: {amount}원
감사합니다.`,

  attendance_alert: `안녕하세요, {student} 학부모님.
오늘 {student} 학생이 결석하였습니다.
확인 부탁드립니다.`,

  score_up: `안녕하세요, {student} 학부모님.
{student} 학생의 성적이 향상되었습니다! 🎉
이전: {prevScore}점 → 현재: {currScore}점
계속 응원해주세요!`,

  score_down: `안녕하세요, {student} 학부모님.
{student} 학생의 성적 변화 안내드립니다.
이전: {prevScore}점 → 현재: {currScore}점
상담이 필요하시면 연락 주세요.`,

  check_in: `안녕하세요, {student} 학부모님.
{student} 학생이 학원에 도착했습니다. ✅
도착 시간: {time}`,

  // 일반
  thank_you: `안녕하세요, {name}님.
항상 저희를 믿고 맡겨주셔서 감사합니다.
앞으로도 최선을 다하겠습니다.`,

  birthday: `안녕하세요, {name}님.
생일 축하드립니다! 🎂
행복한 하루 되세요.`,

  custom: `{message}`,
};

export type TemplateKey = keyof typeof MESSAGE_TEMPLATES;

// ═══════════════════════════════════════════════════════════════════════════
//                              INTENT SERVICE
// ═══════════════════════════════════════════════════════════════════════════

class IntentService {
  // ─────────────────────────────────────────────────────────────────────────
  //                         MESSAGE FORMATTING
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 템플릿에 변수 적용
   */
  formatMessage(
    templateKey: TemplateKey,
    params: Record<string, string | number>
  ): string {
    let message = MESSAGE_TEMPLATES[templateKey];

    for (const [key, value] of Object.entries(params)) {
      const placeholder = `{${key}}`;
      message = message.replace(new RegExp(placeholder, 'g'), String(value));
    }

    return message;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         URI GENERATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * SMS Intent URI 생성
   */
  generateSmsUri(phone: string, message: string): string {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const encodedMessage = encodeURIComponent(message);

    if (Platform.OS === 'android') {
      return `sms:${cleanPhone}?body=${encodedMessage}`;
    } else {
      // iOS
      return `sms:${cleanPhone}&body=${encodedMessage}`;
    }
  }

  /**
   * 전화 Intent URI 생성
   */
  generateCallUri(phone: string): string {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    return `tel:${cleanPhone}`;
  }

  /**
   * 카카오톡 Intent URI 생성 (Android only)
   */
  generateKakaoUri(message: string): string {
    if (Platform.OS !== 'android') {
      return '';
    }

    const encodedMessage = encodeURIComponent(message);
    return `intent://send?text=${encodedMessage}#Intent;package=com.kakao.talk;end`;
  }

  /**
   * 이메일 Intent URI 생성
   */
  generateEmailUri(email: string, subject: string, body: string): string {
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    return `mailto:${email}?subject=${encodedSubject}&body=${encodedBody}`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         ACTION EXECUTION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Intent 실행 가능 여부 확인
   */
  async canExecuteIntent(uri: string): Promise<boolean> {
    try {
      return await Linking.canOpenURL(uri);
    } catch {
      return false;
    }
  }

  /**
   * Intent 실행
   */
  async executeIntent(uri: string): Promise<boolean> {
    try {
      const canOpen = await Linking.canOpenURL(uri);
      
      if (canOpen) {
        await Linking.openURL(uri);
        return true;
      } else {
        console.warn('Cannot open URI:', uri);
        return false;
      }
    } catch (error) {
      console.error('Failed to execute intent:', error);
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         HIGH-LEVEL ACTIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * SMS 발송 액션 준비
   */
  async prepareSmsAction(
    node: Node,
    templateKey: TemplateKey,
    params: Record<string, string | number> = {}
  ): Promise<ActionResult> {
    const message = this.formatMessage(templateKey, {
      name: node.name,
      student: node.studentName || node.name,
      ...params,
    });

    const uri = this.generateSmsUri(node.phone, message);
    const canOpen = await this.canExecuteIntent(uri);

    return {
      success: canOpen,
      actionType: 'sms',
      uri,
      error: canOpen ? undefined : 'SMS app not available',
    };
  }

  /**
   * 전화 액션 준비
   */
  async prepareCallAction(node: Node): Promise<ActionResult> {
    const uri = this.generateCallUri(node.phone);
    const canOpen = await this.canExecuteIntent(uri);

    return {
      success: canOpen,
      actionType: 'call',
      uri,
      error: canOpen ? undefined : 'Phone app not available',
    };
  }

  /**
   * 카카오톡 액션 준비
   */
  async prepareKakaoAction(
    templateKey: TemplateKey,
    params: Record<string, string | number> = {}
  ): Promise<ActionResult> {
    if (Platform.OS !== 'android') {
      return {
        success: false,
        actionType: 'kakao',
        uri: '',
        error: 'KakaoTalk intent only available on Android',
      };
    }

    const message = this.formatMessage(templateKey, params);
    const uri = this.generateKakaoUri(message);
    const canOpen = await this.canExecuteIntent(uri);

    return {
      success: canOpen,
      actionType: 'kakao',
      uri,
      error: canOpen ? undefined : 'KakaoTalk not installed',
    };
  }

  /**
   * 액션 실행
   */
  async executeAction(action: ActionResult): Promise<boolean> {
    if (!action.success || !action.uri) {
      return false;
    }

    return this.executeIntent(action.uri);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         BATCH ACTIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 배치 액션 준비 (실행은 유저가 하나씩)
   */
  async prepareBatchSmsActions(
    nodes: Node[],
    templateKey: TemplateKey,
    params: Record<string, string | number> = {}
  ): Promise<ActionResult[]> {
    const results: ActionResult[] = [];

    for (const node of nodes) {
      const result = await this.prepareSmsAction(node, templateKey, params);
      results.push(result);
    }

    return results;
  }
}

// 싱글톤 인스턴스
export const intentService = new IntentService();
export default intentService;

// ═══════════════════════════════════════════════════════════════════════════
//                              LEGAL DISCLAIMER
// ═══════════════════════════════════════════════════════════════════════════

export const LEGAL_DISCLAIMER = `
╔═══════════════════════════════════════════════════════════════════════════╗
║                            법적 면책 조항                                  ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  본 시스템은 메시지를 직접 발송하지 않습니다.                              ║
║                                                                           ║
║  동작 방식:                                                                ║
║  1. 사용자가 '발송' 버튼을 클릭합니다.                                     ║
║  2. 시스템이 OS의 기본 앱(SMS, 카카오톡 등)을 실행합니다.                  ║
║  3. 사용자가 해당 앱에서 '전송'을 직접 눌러야 메시지가 발송됩니다.         ║
║                                                                           ║
║  따라서:                                                                   ║
║  - 메시지 발송의 법적 책임은 사용자에게 있습니다.                          ║
║  - 본 시스템은 '편의 기능'을 제공할 뿐입니다.                              ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
`;










/**
 * AUTUS Local Agent - Intent Service
 * ====================================
 * 
 * OS Intent를 통한 클라이언트 사이드 자동화
 * 
 * 서버 경유 없음 → 법적 면책
 * "유저가 자기 기기에서 버튼을 눌러 앱을 실행한 것"
 */

import { Linking, Platform } from 'react-native';
import { Node } from './SQService';

// ═══════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type ActionType = 'sms' | 'call' | 'kakao' | 'email';

export interface ActionResult {
  success: boolean;
  actionType: ActionType;
  uri: string;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              MESSAGE TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

export const MESSAGE_TEMPLATES = {
  // 학원 특화
  payment_reminder: `안녕하세요, {student} 학부모님.
이번 달 수강료 납부 안내드립니다.
납부 기한: {dueDate}
금액: {amount}원
감사합니다.`,

  attendance_alert: `안녕하세요, {student} 학부모님.
오늘 {student} 학생이 결석하였습니다.
확인 부탁드립니다.`,

  score_up: `안녕하세요, {student} 학부모님.
{student} 학생의 성적이 향상되었습니다! 🎉
이전: {prevScore}점 → 현재: {currScore}점
계속 응원해주세요!`,

  score_down: `안녕하세요, {student} 학부모님.
{student} 학생의 성적 변화 안내드립니다.
이전: {prevScore}점 → 현재: {currScore}점
상담이 필요하시면 연락 주세요.`,

  check_in: `안녕하세요, {student} 학부모님.
{student} 학생이 학원에 도착했습니다. ✅
도착 시간: {time}`,

  // 일반
  thank_you: `안녕하세요, {name}님.
항상 저희를 믿고 맡겨주셔서 감사합니다.
앞으로도 최선을 다하겠습니다.`,

  birthday: `안녕하세요, {name}님.
생일 축하드립니다! 🎂
행복한 하루 되세요.`,

  custom: `{message}`,
};

export type TemplateKey = keyof typeof MESSAGE_TEMPLATES;

// ═══════════════════════════════════════════════════════════════════════════
//                              INTENT SERVICE
// ═══════════════════════════════════════════════════════════════════════════

class IntentService {
  // ─────────────────────────────────────────────────────────────────────────
  //                         MESSAGE FORMATTING
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 템플릿에 변수 적용
   */
  formatMessage(
    templateKey: TemplateKey,
    params: Record<string, string | number>
  ): string {
    let message = MESSAGE_TEMPLATES[templateKey];

    for (const [key, value] of Object.entries(params)) {
      const placeholder = `{${key}}`;
      message = message.replace(new RegExp(placeholder, 'g'), String(value));
    }

    return message;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         URI GENERATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * SMS Intent URI 생성
   */
  generateSmsUri(phone: string, message: string): string {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const encodedMessage = encodeURIComponent(message);

    if (Platform.OS === 'android') {
      return `sms:${cleanPhone}?body=${encodedMessage}`;
    } else {
      // iOS
      return `sms:${cleanPhone}&body=${encodedMessage}`;
    }
  }

  /**
   * 전화 Intent URI 생성
   */
  generateCallUri(phone: string): string {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    return `tel:${cleanPhone}`;
  }

  /**
   * 카카오톡 Intent URI 생성 (Android only)
   */
  generateKakaoUri(message: string): string {
    if (Platform.OS !== 'android') {
      return '';
    }

    const encodedMessage = encodeURIComponent(message);
    return `intent://send?text=${encodedMessage}#Intent;package=com.kakao.talk;end`;
  }

  /**
   * 이메일 Intent URI 생성
   */
  generateEmailUri(email: string, subject: string, body: string): string {
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    return `mailto:${email}?subject=${encodedSubject}&body=${encodedBody}`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         ACTION EXECUTION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Intent 실행 가능 여부 확인
   */
  async canExecuteIntent(uri: string): Promise<boolean> {
    try {
      return await Linking.canOpenURL(uri);
    } catch {
      return false;
    }
  }

  /**
   * Intent 실행
   */
  async executeIntent(uri: string): Promise<boolean> {
    try {
      const canOpen = await Linking.canOpenURL(uri);
      
      if (canOpen) {
        await Linking.openURL(uri);
        return true;
      } else {
        console.warn('Cannot open URI:', uri);
        return false;
      }
    } catch (error) {
      console.error('Failed to execute intent:', error);
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         HIGH-LEVEL ACTIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * SMS 발송 액션 준비
   */
  async prepareSmsAction(
    node: Node,
    templateKey: TemplateKey,
    params: Record<string, string | number> = {}
  ): Promise<ActionResult> {
    const message = this.formatMessage(templateKey, {
      name: node.name,
      student: node.studentName || node.name,
      ...params,
    });

    const uri = this.generateSmsUri(node.phone, message);
    const canOpen = await this.canExecuteIntent(uri);

    return {
      success: canOpen,
      actionType: 'sms',
      uri,
      error: canOpen ? undefined : 'SMS app not available',
    };
  }

  /**
   * 전화 액션 준비
   */
  async prepareCallAction(node: Node): Promise<ActionResult> {
    const uri = this.generateCallUri(node.phone);
    const canOpen = await this.canExecuteIntent(uri);

    return {
      success: canOpen,
      actionType: 'call',
      uri,
      error: canOpen ? undefined : 'Phone app not available',
    };
  }

  /**
   * 카카오톡 액션 준비
   */
  async prepareKakaoAction(
    templateKey: TemplateKey,
    params: Record<string, string | number> = {}
  ): Promise<ActionResult> {
    if (Platform.OS !== 'android') {
      return {
        success: false,
        actionType: 'kakao',
        uri: '',
        error: 'KakaoTalk intent only available on Android',
      };
    }

    const message = this.formatMessage(templateKey, params);
    const uri = this.generateKakaoUri(message);
    const canOpen = await this.canExecuteIntent(uri);

    return {
      success: canOpen,
      actionType: 'kakao',
      uri,
      error: canOpen ? undefined : 'KakaoTalk not installed',
    };
  }

  /**
   * 액션 실행
   */
  async executeAction(action: ActionResult): Promise<boolean> {
    if (!action.success || !action.uri) {
      return false;
    }

    return this.executeIntent(action.uri);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         BATCH ACTIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 배치 액션 준비 (실행은 유저가 하나씩)
   */
  async prepareBatchSmsActions(
    nodes: Node[],
    templateKey: TemplateKey,
    params: Record<string, string | number> = {}
  ): Promise<ActionResult[]> {
    const results: ActionResult[] = [];

    for (const node of nodes) {
      const result = await this.prepareSmsAction(node, templateKey, params);
      results.push(result);
    }

    return results;
  }
}

// 싱글톤 인스턴스
export const intentService = new IntentService();
export default intentService;

// ═══════════════════════════════════════════════════════════════════════════
//                              LEGAL DISCLAIMER
// ═══════════════════════════════════════════════════════════════════════════

export const LEGAL_DISCLAIMER = `
╔═══════════════════════════════════════════════════════════════════════════╗
║                            법적 면책 조항                                  ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  본 시스템은 메시지를 직접 발송하지 않습니다.                              ║
║                                                                           ║
║  동작 방식:                                                                ║
║  1. 사용자가 '발송' 버튼을 클릭합니다.                                     ║
║  2. 시스템이 OS의 기본 앱(SMS, 카카오톡 등)을 실행합니다.                  ║
║  3. 사용자가 해당 앱에서 '전송'을 직접 눌러야 메시지가 발송됩니다.         ║
║                                                                           ║
║  따라서:                                                                   ║
║  - 메시지 발송의 법적 책임은 사용자에게 있습니다.                          ║
║  - 본 시스템은 '편의 기능'을 제공할 뿐입니다.                              ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
`;










/**
 * AUTUS Local Agent - Intent Service
 * ====================================
 * 
 * OS Intent를 통한 클라이언트 사이드 자동화
 * 
 * 서버 경유 없음 → 법적 면책
 * "유저가 자기 기기에서 버튼을 눌러 앱을 실행한 것"
 */

import { Linking, Platform } from 'react-native';
import { Node } from './SQService';

// ═══════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type ActionType = 'sms' | 'call' | 'kakao' | 'email';

export interface ActionResult {
  success: boolean;
  actionType: ActionType;
  uri: string;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              MESSAGE TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

export const MESSAGE_TEMPLATES = {
  // 학원 특화
  payment_reminder: `안녕하세요, {student} 학부모님.
이번 달 수강료 납부 안내드립니다.
납부 기한: {dueDate}
금액: {amount}원
감사합니다.`,

  attendance_alert: `안녕하세요, {student} 학부모님.
오늘 {student} 학생이 결석하였습니다.
확인 부탁드립니다.`,

  score_up: `안녕하세요, {student} 학부모님.
{student} 학생의 성적이 향상되었습니다! 🎉
이전: {prevScore}점 → 현재: {currScore}점
계속 응원해주세요!`,

  score_down: `안녕하세요, {student} 학부모님.
{student} 학생의 성적 변화 안내드립니다.
이전: {prevScore}점 → 현재: {currScore}점
상담이 필요하시면 연락 주세요.`,

  check_in: `안녕하세요, {student} 학부모님.
{student} 학생이 학원에 도착했습니다. ✅
도착 시간: {time}`,

  // 일반
  thank_you: `안녕하세요, {name}님.
항상 저희를 믿고 맡겨주셔서 감사합니다.
앞으로도 최선을 다하겠습니다.`,

  birthday: `안녕하세요, {name}님.
생일 축하드립니다! 🎂
행복한 하루 되세요.`,

  custom: `{message}`,
};

export type TemplateKey = keyof typeof MESSAGE_TEMPLATES;

// ═══════════════════════════════════════════════════════════════════════════
//                              INTENT SERVICE
// ═══════════════════════════════════════════════════════════════════════════

class IntentService {
  // ─────────────────────────────────────────────────────────────────────────
  //                         MESSAGE FORMATTING
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 템플릿에 변수 적용
   */
  formatMessage(
    templateKey: TemplateKey,
    params: Record<string, string | number>
  ): string {
    let message = MESSAGE_TEMPLATES[templateKey];

    for (const [key, value] of Object.entries(params)) {
      const placeholder = `{${key}}`;
      message = message.replace(new RegExp(placeholder, 'g'), String(value));
    }

    return message;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         URI GENERATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * SMS Intent URI 생성
   */
  generateSmsUri(phone: string, message: string): string {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const encodedMessage = encodeURIComponent(message);

    if (Platform.OS === 'android') {
      return `sms:${cleanPhone}?body=${encodedMessage}`;
    } else {
      // iOS
      return `sms:${cleanPhone}&body=${encodedMessage}`;
    }
  }

  /**
   * 전화 Intent URI 생성
   */
  generateCallUri(phone: string): string {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    return `tel:${cleanPhone}`;
  }

  /**
   * 카카오톡 Intent URI 생성 (Android only)
   */
  generateKakaoUri(message: string): string {
    if (Platform.OS !== 'android') {
      return '';
    }

    const encodedMessage = encodeURIComponent(message);
    return `intent://send?text=${encodedMessage}#Intent;package=com.kakao.talk;end`;
  }

  /**
   * 이메일 Intent URI 생성
   */
  generateEmailUri(email: string, subject: string, body: string): string {
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    return `mailto:${email}?subject=${encodedSubject}&body=${encodedBody}`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         ACTION EXECUTION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Intent 실행 가능 여부 확인
   */
  async canExecuteIntent(uri: string): Promise<boolean> {
    try {
      return await Linking.canOpenURL(uri);
    } catch {
      return false;
    }
  }

  /**
   * Intent 실행
   */
  async executeIntent(uri: string): Promise<boolean> {
    try {
      const canOpen = await Linking.canOpenURL(uri);
      
      if (canOpen) {
        await Linking.openURL(uri);
        return true;
      } else {
        console.warn('Cannot open URI:', uri);
        return false;
      }
    } catch (error) {
      console.error('Failed to execute intent:', error);
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         HIGH-LEVEL ACTIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * SMS 발송 액션 준비
   */
  async prepareSmsAction(
    node: Node,
    templateKey: TemplateKey,
    params: Record<string, string | number> = {}
  ): Promise<ActionResult> {
    const message = this.formatMessage(templateKey, {
      name: node.name,
      student: node.studentName || node.name,
      ...params,
    });

    const uri = this.generateSmsUri(node.phone, message);
    const canOpen = await this.canExecuteIntent(uri);

    return {
      success: canOpen,
      actionType: 'sms',
      uri,
      error: canOpen ? undefined : 'SMS app not available',
    };
  }

  /**
   * 전화 액션 준비
   */
  async prepareCallAction(node: Node): Promise<ActionResult> {
    const uri = this.generateCallUri(node.phone);
    const canOpen = await this.canExecuteIntent(uri);

    return {
      success: canOpen,
      actionType: 'call',
      uri,
      error: canOpen ? undefined : 'Phone app not available',
    };
  }

  /**
   * 카카오톡 액션 준비
   */
  async prepareKakaoAction(
    templateKey: TemplateKey,
    params: Record<string, string | number> = {}
  ): Promise<ActionResult> {
    if (Platform.OS !== 'android') {
      return {
        success: false,
        actionType: 'kakao',
        uri: '',
        error: 'KakaoTalk intent only available on Android',
      };
    }

    const message = this.formatMessage(templateKey, params);
    const uri = this.generateKakaoUri(message);
    const canOpen = await this.canExecuteIntent(uri);

    return {
      success: canOpen,
      actionType: 'kakao',
      uri,
      error: canOpen ? undefined : 'KakaoTalk not installed',
    };
  }

  /**
   * 액션 실행
   */
  async executeAction(action: ActionResult): Promise<boolean> {
    if (!action.success || !action.uri) {
      return false;
    }

    return this.executeIntent(action.uri);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         BATCH ACTIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 배치 액션 준비 (실행은 유저가 하나씩)
   */
  async prepareBatchSmsActions(
    nodes: Node[],
    templateKey: TemplateKey,
    params: Record<string, string | number> = {}
  ): Promise<ActionResult[]> {
    const results: ActionResult[] = [];

    for (const node of nodes) {
      const result = await this.prepareSmsAction(node, templateKey, params);
      results.push(result);
    }

    return results;
  }
}

// 싱글톤 인스턴스
export const intentService = new IntentService();
export default intentService;

// ═══════════════════════════════════════════════════════════════════════════
//                              LEGAL DISCLAIMER
// ═══════════════════════════════════════════════════════════════════════════

export const LEGAL_DISCLAIMER = `
╔═══════════════════════════════════════════════════════════════════════════╗
║                            법적 면책 조항                                  ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  본 시스템은 메시지를 직접 발송하지 않습니다.                              ║
║                                                                           ║
║  동작 방식:                                                                ║
║  1. 사용자가 '발송' 버튼을 클릭합니다.                                     ║
║  2. 시스템이 OS의 기본 앱(SMS, 카카오톡 등)을 실행합니다.                  ║
║  3. 사용자가 해당 앱에서 '전송'을 직접 눌러야 메시지가 발송됩니다.         ║
║                                                                           ║
║  따라서:                                                                   ║
║  - 메시지 발송의 법적 책임은 사용자에게 있습니다.                          ║
║  - 본 시스템은 '편의 기능'을 제공할 뿐입니다.                              ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
`;










/**
 * AUTUS Local Agent - Intent Service
 * ====================================
 * 
 * OS Intent를 통한 클라이언트 사이드 자동화
 * 
 * 서버 경유 없음 → 법적 면책
 * "유저가 자기 기기에서 버튼을 눌러 앱을 실행한 것"
 */

import { Linking, Platform } from 'react-native';
import { Node } from './SQService';

// ═══════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type ActionType = 'sms' | 'call' | 'kakao' | 'email';

export interface ActionResult {
  success: boolean;
  actionType: ActionType;
  uri: string;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              MESSAGE TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

export const MESSAGE_TEMPLATES = {
  // 학원 특화
  payment_reminder: `안녕하세요, {student} 학부모님.
이번 달 수강료 납부 안내드립니다.
납부 기한: {dueDate}
금액: {amount}원
감사합니다.`,

  attendance_alert: `안녕하세요, {student} 학부모님.
오늘 {student} 학생이 결석하였습니다.
확인 부탁드립니다.`,

  score_up: `안녕하세요, {student} 학부모님.
{student} 학생의 성적이 향상되었습니다! 🎉
이전: {prevScore}점 → 현재: {currScore}점
계속 응원해주세요!`,

  score_down: `안녕하세요, {student} 학부모님.
{student} 학생의 성적 변화 안내드립니다.
이전: {prevScore}점 → 현재: {currScore}점
상담이 필요하시면 연락 주세요.`,

  check_in: `안녕하세요, {student} 학부모님.
{student} 학생이 학원에 도착했습니다. ✅
도착 시간: {time}`,

  // 일반
  thank_you: `안녕하세요, {name}님.
항상 저희를 믿고 맡겨주셔서 감사합니다.
앞으로도 최선을 다하겠습니다.`,

  birthday: `안녕하세요, {name}님.
생일 축하드립니다! 🎂
행복한 하루 되세요.`,

  custom: `{message}`,
};

export type TemplateKey = keyof typeof MESSAGE_TEMPLATES;

// ═══════════════════════════════════════════════════════════════════════════
//                              INTENT SERVICE
// ═══════════════════════════════════════════════════════════════════════════

class IntentService {
  // ─────────────────────────────────────────────────────────────────────────
  //                         MESSAGE FORMATTING
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 템플릿에 변수 적용
   */
  formatMessage(
    templateKey: TemplateKey,
    params: Record<string, string | number>
  ): string {
    let message = MESSAGE_TEMPLATES[templateKey];

    for (const [key, value] of Object.entries(params)) {
      const placeholder = `{${key}}`;
      message = message.replace(new RegExp(placeholder, 'g'), String(value));
    }

    return message;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         URI GENERATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * SMS Intent URI 생성
   */
  generateSmsUri(phone: string, message: string): string {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const encodedMessage = encodeURIComponent(message);

    if (Platform.OS === 'android') {
      return `sms:${cleanPhone}?body=${encodedMessage}`;
    } else {
      // iOS
      return `sms:${cleanPhone}&body=${encodedMessage}`;
    }
  }

  /**
   * 전화 Intent URI 생성
   */
  generateCallUri(phone: string): string {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    return `tel:${cleanPhone}`;
  }

  /**
   * 카카오톡 Intent URI 생성 (Android only)
   */
  generateKakaoUri(message: string): string {
    if (Platform.OS !== 'android') {
      return '';
    }

    const encodedMessage = encodeURIComponent(message);
    return `intent://send?text=${encodedMessage}#Intent;package=com.kakao.talk;end`;
  }

  /**
   * 이메일 Intent URI 생성
   */
  generateEmailUri(email: string, subject: string, body: string): string {
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    return `mailto:${email}?subject=${encodedSubject}&body=${encodedBody}`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         ACTION EXECUTION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Intent 실행 가능 여부 확인
   */
  async canExecuteIntent(uri: string): Promise<boolean> {
    try {
      return await Linking.canOpenURL(uri);
    } catch {
      return false;
    }
  }

  /**
   * Intent 실행
   */
  async executeIntent(uri: string): Promise<boolean> {
    try {
      const canOpen = await Linking.canOpenURL(uri);
      
      if (canOpen) {
        await Linking.openURL(uri);
        return true;
      } else {
        console.warn('Cannot open URI:', uri);
        return false;
      }
    } catch (error) {
      console.error('Failed to execute intent:', error);
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         HIGH-LEVEL ACTIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * SMS 발송 액션 준비
   */
  async prepareSmsAction(
    node: Node,
    templateKey: TemplateKey,
    params: Record<string, string | number> = {}
  ): Promise<ActionResult> {
    const message = this.formatMessage(templateKey, {
      name: node.name,
      student: node.studentName || node.name,
      ...params,
    });

    const uri = this.generateSmsUri(node.phone, message);
    const canOpen = await this.canExecuteIntent(uri);

    return {
      success: canOpen,
      actionType: 'sms',
      uri,
      error: canOpen ? undefined : 'SMS app not available',
    };
  }

  /**
   * 전화 액션 준비
   */
  async prepareCallAction(node: Node): Promise<ActionResult> {
    const uri = this.generateCallUri(node.phone);
    const canOpen = await this.canExecuteIntent(uri);

    return {
      success: canOpen,
      actionType: 'call',
      uri,
      error: canOpen ? undefined : 'Phone app not available',
    };
  }

  /**
   * 카카오톡 액션 준비
   */
  async prepareKakaoAction(
    templateKey: TemplateKey,
    params: Record<string, string | number> = {}
  ): Promise<ActionResult> {
    if (Platform.OS !== 'android') {
      return {
        success: false,
        actionType: 'kakao',
        uri: '',
        error: 'KakaoTalk intent only available on Android',
      };
    }

    const message = this.formatMessage(templateKey, params);
    const uri = this.generateKakaoUri(message);
    const canOpen = await this.canExecuteIntent(uri);

    return {
      success: canOpen,
      actionType: 'kakao',
      uri,
      error: canOpen ? undefined : 'KakaoTalk not installed',
    };
  }

  /**
   * 액션 실행
   */
  async executeAction(action: ActionResult): Promise<boolean> {
    if (!action.success || !action.uri) {
      return false;
    }

    return this.executeIntent(action.uri);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         BATCH ACTIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 배치 액션 준비 (실행은 유저가 하나씩)
   */
  async prepareBatchSmsActions(
    nodes: Node[],
    templateKey: TemplateKey,
    params: Record<string, string | number> = {}
  ): Promise<ActionResult[]> {
    const results: ActionResult[] = [];

    for (const node of nodes) {
      const result = await this.prepareSmsAction(node, templateKey, params);
      results.push(result);
    }

    return results;
  }
}

// 싱글톤 인스턴스
export const intentService = new IntentService();
export default intentService;

// ═══════════════════════════════════════════════════════════════════════════
//                              LEGAL DISCLAIMER
// ═══════════════════════════════════════════════════════════════════════════

export const LEGAL_DISCLAIMER = `
╔═══════════════════════════════════════════════════════════════════════════╗
║                            법적 면책 조항                                  ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  본 시스템은 메시지를 직접 발송하지 않습니다.                              ║
║                                                                           ║
║  동작 방식:                                                                ║
║  1. 사용자가 '발송' 버튼을 클릭합니다.                                     ║
║  2. 시스템이 OS의 기본 앱(SMS, 카카오톡 등)을 실행합니다.                  ║
║  3. 사용자가 해당 앱에서 '전송'을 직접 눌러야 메시지가 발송됩니다.         ║
║                                                                           ║
║  따라서:                                                                   ║
║  - 메시지 발송의 법적 책임은 사용자에게 있습니다.                          ║
║  - 본 시스템은 '편의 기능'을 제공할 뿐입니다.                              ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
`;


























