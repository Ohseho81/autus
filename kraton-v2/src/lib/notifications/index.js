/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔔 NOTIFICATION SERVICE - 알림 시스템
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ============================================
// NOTIFICATION TYPES
// ============================================
export const NOTIFICATION_TYPES = {
  RISK_ALERT: 'risk_alert',
  PAYMENT: 'payment',
  ATTENDANCE: 'attendance',
  REPORT: 'report',
  MESSAGE: 'message',
  SCHEDULE: 'schedule',
  SYSTEM: 'system',
};

// ============================================
// NOTIFICATION CHANNELS
// ============================================
export const CHANNELS = {
  PUSH: 'push',
  KAKAO: 'kakao',
  SLACK: 'slack',
  EMAIL: 'email',
  SMS: 'sms',
};

// ============================================
// NOTIFICATION SERVICE
// ============================================
class NotificationService {
  constructor() {
    this.subscribers = new Set();
    this.notifications = [];
    this.unreadCount = 0;
  }
  
  // Subscribe to notifications
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }
  
  // Notify all subscribers
  notify() {
    this.subscribers.forEach(callback => callback({
      notifications: this.notifications,
      unreadCount: this.unreadCount,
    }));
  }
  
  // Add new notification
  add(notification) {
    const newNotification = {
      id: `notif_${Date.now()}`,
      createdAt: new Date().toISOString(),
      read: false,
      ...notification,
    };
    
    this.notifications.unshift(newNotification);
    this.unreadCount++;
    this.notify();
    
    // Show browser notification if permission granted
    this.showBrowserNotification(newNotification);
    
    return newNotification;
  }
  
  // Mark notification as read
  markAsRead(id) {
    const notification = this.notifications.find(n => n.id === id);
    if (notification && !notification.read) {
      notification.read = true;
      this.unreadCount = Math.max(0, this.unreadCount - 1);
      this.notify();
    }
  }
  
  // Mark all as read
  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
    this.unreadCount = 0;
    this.notify();
  }
  
  // Clear all notifications
  clear() {
    this.notifications = [];
    this.unreadCount = 0;
    this.notify();
  }
  
  // Get notifications
  getNotifications(filters = {}) {
    let result = [...this.notifications];
    
    if (filters.type) {
      result = result.filter(n => n.type === filters.type);
    }
    
    if (filters.unreadOnly) {
      result = result.filter(n => !n.read);
    }
    
    if (filters.limit) {
      result = result.slice(0, filters.limit);
    }
    
    return result;
  }
  
  // Browser notification
  async showBrowserNotification(notification) {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/kraton-logo-transparent.png',
        tag: notification.id,
      });
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/kraton-logo-transparent.png',
          tag: notification.id,
        });
      }
    }
  }
  
  // Request notification permission
  async requestPermission() {
    if (!('Notification' in window)) {
      return 'unsupported';
    }
    return await Notification.requestPermission();
  }
}

// Singleton instance
export const notificationService = new NotificationService();

// ============================================
// CHANNEL INTEGRATIONS
// ============================================

// Kakao AlimTalk
export const sendKakaoNotification = async ({ phone, template, variables }) => {
  // TODO: Integrate with Kakao AlimTalk API
  console.log('📱 Kakao AlimTalk:', { phone, template, variables });
  
  // Mock implementation
  return {
    success: true,
    messageId: `kakao_${Date.now()}`,
    sentAt: new Date().toISOString(),
  };
};

// Slack
export const sendSlackNotification = async ({ channel, message, blocks }) => {
  // TODO: Integrate with Slack Webhook
  console.log('📢 Slack:', { channel, message });
  
  // Mock implementation
  return {
    success: true,
    ts: `slack_${Date.now()}`,
    channel,
  };
};

// Push Notification
export const sendPushNotification = async ({ userId, title, body, data }) => {
  // TODO: Integrate with Firebase Cloud Messaging or similar
  console.log('🔔 Push:', { userId, title, body });
  
  // Use browser notification as fallback
  notificationService.add({
    type: NOTIFICATION_TYPES.SYSTEM,
    title,
    message: body,
    data,
  });
  
  return {
    success: true,
    messageId: `push_${Date.now()}`,
  };
};

// Email
export const sendEmailNotification = async ({ to, subject, html }) => {
  // TODO: Integrate with email service (SendGrid, SES, etc.)
  console.log('📧 Email:', { to, subject });
  
  return {
    success: true,
    messageId: `email_${Date.now()}`,
  };
};

// ============================================
// NOTIFICATION TEMPLATES
// ============================================
export const TEMPLATES = {
  // Risk Alert
  riskAlert: (student) => ({
    type: NOTIFICATION_TYPES.RISK_ALERT,
    title: `🚨 위험 학생 알림`,
    message: `${student.name} 학생이 State ${student.state}로 변경되었습니다.`,
    priority: 'high',
    data: { studentId: student.id, state: student.state },
  }),
  
  // Payment
  paymentComplete: (payment) => ({
    type: NOTIFICATION_TYPES.PAYMENT,
    title: `💳 결제 완료`,
    message: `${payment.studentName}님의 수강료 ${payment.amount.toLocaleString()}원이 결제되었습니다.`,
    priority: 'normal',
    data: { paymentId: payment.id },
  }),
  
  paymentOverdue: (payment) => ({
    type: NOTIFICATION_TYPES.PAYMENT,
    title: `⚠️ 미납 알림`,
    message: `${payment.studentName}님의 수강료가 미납되었습니다. (${payment.dueDate})`,
    priority: 'high',
    data: { paymentId: payment.id },
  }),
  
  // Attendance
  attendanceAbsent: (student) => ({
    type: NOTIFICATION_TYPES.ATTENDANCE,
    title: `❌ 결석 알림`,
    message: `${student.name} 학생이 결석하였습니다.`,
    priority: 'normal',
    data: { studentId: student.id },
  }),
  
  attendanceLate: (student) => ({
    type: NOTIFICATION_TYPES.ATTENDANCE,
    title: `⏰ 지각 알림`,
    message: `${student.name} 학생이 지각하였습니다.`,
    priority: 'low',
    data: { studentId: student.id },
  }),
  
  // Report
  reportGenerated: (report) => ({
    type: NOTIFICATION_TYPES.REPORT,
    title: `📊 리포트 생성`,
    message: `${report.period} ${report.type} 리포트가 생성되었습니다.`,
    priority: 'normal',
    data: { reportId: report.id },
  }),
  
  // Schedule
  scheduleReminder: (schedule) => ({
    type: NOTIFICATION_TYPES.SCHEDULE,
    title: `📅 일정 알림`,
    message: `${schedule.title}이 ${schedule.time}에 예정되어 있습니다.`,
    priority: 'normal',
    data: { scheduleId: schedule.id },
  }),
};

// ============================================
// NOTIFICATION DISPATCHER
// ============================================
export const dispatchNotification = async (template, channels = [CHANNELS.PUSH]) => {
  const results = [];
  
  for (const channel of channels) {
    switch (channel) {
      case CHANNELS.PUSH:
        results.push(await sendPushNotification({
          title: template.title,
          body: template.message,
          data: template.data,
        }));
        break;
        
      case CHANNELS.KAKAO:
        // Would need phone number
        break;
        
      case CHANNELS.SLACK:
        results.push(await sendSlackNotification({
          channel: '#alerts',
          message: `${template.title}\n${template.message}`,
        }));
        break;
        
      case CHANNELS.EMAIL:
        // Would need email address
        break;
    }
  }
  
  return results;
};

export default notificationService;
