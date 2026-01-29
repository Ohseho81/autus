/**
 * AUTUS Mobile API Service
 */

import axios, { AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.autus.ai/v1';

class ApiService {
  private client: AxiosInstance;
  private accessToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for auth
    this.client.interceptors.request.use(
      async (config) => {
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Try to refresh token
          await this.refreshToken();
          return this.client.request(error.config);
        }
        return Promise.reject(error);
      }
    );
  }

  // ==========================================
  // Auth
  // ==========================================

  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', { email, password });
    if (response.data.success) {
      this.accessToken = response.data.data.access_token;
      await SecureStore.setItemAsync('access_token', response.data.data.access_token);
      await SecureStore.setItemAsync('refresh_token', response.data.data.refresh_token);
    }
    return response.data;
  }

  async refreshToken() {
    const refreshToken = await SecureStore.getItemAsync('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token');
    }
    const response = await this.client.post('/auth/refresh', { refresh_token: refreshToken });
    if (response.data.success) {
      this.accessToken = response.data.data.access_token;
      await SecureStore.setItemAsync('access_token', response.data.data.access_token);
    }
    return response.data;
  }

  async logout() {
    await this.client.post('/auth/logout');
    this.accessToken = null;
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
  }

  async loadStoredToken() {
    const token = await SecureStore.getItemAsync('access_token');
    if (token) {
      this.accessToken = token;
    }
    return !!token;
  }

  // ==========================================
  // Dashboard
  // ==========================================

  async getDashboardSummary() {
    const response = await this.client.get('/dashboard/summary');
    return response.data;
  }

  async getVIndex(period: 'day' | 'week' | 'month' | 'year' = 'month') {
    const response = await this.client.get('/dashboard/v-index', { params: { period } });
    return response.data;
  }

  // ==========================================
  // Students
  // ==========================================

  async getStudents(params?: {
    filter?: 'all' | 'at_risk' | 'warning' | 'normal';
    sort?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const response = await this.client.get('/students', { params });
    return response.data;
  }

  async getStudent(studentId: string) {
    const response = await this.client.get(`/students/${studentId}`);
    return response.data;
  }

  async createStudent(data: {
    name: string;
    grade: string;
    school?: string;
    subjects: string[];
    parent_name: string;
    parent_phone: string;
    parent_email?: string;
    monthly_fee: number;
    payment_day?: number;
    memo?: string;
  }) {
    const response = await this.client.post('/students', data);
    return response.data;
  }

  async updateStudent(studentId: string, data: Partial<{
    name: string;
    grade: string;
    school: string;
    subjects: string[];
    parent_name: string;
    parent_phone: string;
    parent_email: string;
    monthly_fee: number;
    payment_day: number;
    memo: string;
  }>) {
    const response = await this.client.put(`/students/${studentId}`, data);
    return response.data;
  }

  async deleteStudent(studentId: string) {
    const response = await this.client.delete(`/students/${studentId}`);
    return response.data;
  }

  async getStudentRiskHistory(studentId: string, period: 'week' | 'month' | 'quarter' | 'year' = 'month') {
    const response = await this.client.get(`/students/${studentId}/risk-history`, { params: { period } });
    return response.data;
  }

  // ==========================================
  // Attendance
  // ==========================================

  async getAttendance(params?: { date?: string; student_id?: string }) {
    const response = await this.client.get('/attendance', { params });
    return response.data;
  }

  async recordAttendance(data: {
    student_id: string;
    date: string;
    status: 'present' | 'absent' | 'late' | 'excused';
    note?: string;
  }) {
    const response = await this.client.post('/attendance', data);
    return response.data;
  }

  // ==========================================
  // Payments
  // ==========================================

  async getPaymentsSummary(month?: string) {
    const response = await this.client.get('/payments/summary', { params: { month } });
    return response.data;
  }

  async getOverduePayments() {
    const response = await this.client.get('/payments/overdue');
    return response.data;
  }

  async sendPaymentReminder(paymentId: string, channel?: 'sms' | 'kakao' | 'email', customMessage?: string) {
    const response = await this.client.post(`/payments/${paymentId}/remind`, {
      channel,
      custom_message: customMessage,
    });
    return response.data;
  }

  // ==========================================
  // Consultations
  // ==========================================

  async getConsultations(params?: { student_id?: string; type?: string }) {
    const response = await this.client.get('/consultations', { params });
    return response.data;
  }

  async createConsultation(data: {
    student_id: string;
    type: 'regular' | 'risk' | 'complaint';
    content: string;
    result?: 'positive' | 'pending' | 'negative';
    follow_up?: string[];
  }) {
    const response = await this.client.post('/consultations', data);
    return response.data;
  }

  // ==========================================
  // Churn (Risk Management)
  // ==========================================

  async getAtRiskStudents(riskLevel: 'all' | 'high' | 'medium' = 'all') {
    const response = await this.client.get('/churn/at-risk', { params: { risk_level: riskLevel } });
    return response.data;
  }

  async generateConsultationScript(studentId: string, scenario?: string) {
    const response = await this.client.post('/churn/script', {
      student_id: studentId,
      scenario: scenario || 'risk_prevention',
    });
    return response.data;
  }

  async recordChurnOutcome(data: {
    student_id: string;
    consultation_id: string;
    outcome: 'prevented' | 'churned' | 'pending';
    monthly_fee?: number;
    notes?: string;
  }) {
    const response = await this.client.post('/churn/outcome', data);
    return response.data;
  }

  // ==========================================
  // AI
  // ==========================================

  async callAIBrain(action: string, data?: any) {
    const response = await this.client.post('/ai/brain', { action, data });
    return response.data;
  }

  async getRewardCards(category?: 'all' | 'risk' | 'payment' | 'achievement') {
    const response = await this.client.get('/ai/reward-cards', { params: { category } });
    return response.data;
  }

  // ==========================================
  // Settings
  // ==========================================

  async getProfile() {
    const response = await this.client.get('/settings/profile');
    return response.data;
  }

  async updateProfile(data: { name?: string; phone?: string; email?: string }) {
    const response = await this.client.put('/settings/profile', data);
    return response.data;
  }

  async getAcademy() {
    const response = await this.client.get('/settings/academy');
    return response.data;
  }

  async updateAcademy(data: { name?: string; address?: string; phone?: string; subjects?: string[] }) {
    const response = await this.client.put('/settings/academy', data);
    return response.data;
  }

  async getRiskSettings() {
    const response = await this.client.get('/settings/risk-detection');
    return response.data;
  }

  async updateRiskSettings(data: {
    high_risk_threshold?: number;
    medium_risk_threshold?: number;
    weights?: {
      attendance?: number;
      homework?: number;
      grade?: number;
      response?: number;
      payment?: number;
    };
    notification_channels?: ('push' | 'kakao' | 'sms' | 'email')[];
  }) {
    const response = await this.client.put('/settings/risk-detection', data);
    return response.data;
  }

  async getNotificationSettings() {
    const response = await this.client.get('/settings/notifications');
    return response.data;
  }

  async updateNotificationSettings(data: {
    push_enabled?: boolean;
    kakao_enabled?: boolean;
    sms_enabled?: boolean;
    email_enabled?: boolean;
    daily_summary?: boolean;
    daily_summary_time?: string;
    risk_alert?: boolean;
    payment_alert?: boolean;
    attendance_alert?: boolean;
  }) {
    const response = await this.client.put('/settings/notifications', data);
    return response.data;
  }

  // ==========================================
  // Notifications
  // ==========================================

  async getNotifications(unreadOnly = false) {
    const response = await this.client.get('/notifications', { params: { unread_only: unreadOnly } });
    return response.data;
  }

  async markNotificationRead(notificationId: string) {
    const response = await this.client.post(`/notifications/${notificationId}/read`);
    return response.data;
  }
}

export const api = new ApiService();
