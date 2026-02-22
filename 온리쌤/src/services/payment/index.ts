/**
 * Payment Service - Main exports for backward compatibility
 *
 * This index file re-exports everything from the split modules
 * to ensure existing imports continue to work.
 */

// Export all types and enums
export * from './types';

// Export service classes
export { PaymentValidator, paymentValidator } from './PaymentValidator';
export { PaymentProcessor, paymentProcessor } from './PaymentProcessor';
export { DunningService, dunningService } from './DunningService';
export { PaymentHelpers, paymentHelpers } from './PaymentHelpers';

// Main PaymentService class that combines all functionality
import { paymentProcessor } from './PaymentProcessor';
import { dunningService } from './DunningService';
import { paymentHelpers } from './PaymentHelpers';
import type { PaymentRequest, PaymentResult, RefundRequest, RefundResult } from './types';

export class PaymentService {
  async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    return paymentProcessor.processPayment(request);
  }

  async processRefund(request: RefundRequest): Promise<RefundResult> {
    return paymentHelpers.processRefund(request);
  }

  async runDunningProcess() {
    return dunningService.runDunningProcess();
  }

  async processAutoRenewals() {
    return dunningService.processAutoRenewals();
  }

  async checkLowSessions() {
    return dunningService.checkLowSessions();
  }
}

// Singleton instance
export const paymentService = new PaymentService();

// Scheduling functions
export const runDailyDunning = () => paymentService.runDunningProcess();
export const runAutoRenewals = () => paymentService.processAutoRenewals();
export const runLowSessionCheck = () => paymentService.checkLowSessions();
