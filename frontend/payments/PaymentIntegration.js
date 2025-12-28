// ================================================================
// AUTUS PAYMENT INTEGRATION
// 마이크로 클리닉 + Elite Club 결제 연동
// ================================================================

// ================================================================
// PAYMENT TYPES
// ================================================================

export const PaymentType = {
    MICRO_CLINIC: 'MICRO_CLINIC',
    ELITE_CLUB_MONTHLY: 'ELITE_CLUB_MONTHLY',
    ELITE_CLUB_DEPOSIT: 'ELITE_CLUB_DEPOSIT',
    UPGRADE: 'UPGRADE',
    ADDON: 'ADDON',
    REFUND: 'REFUND'
};

export const PaymentStatus = {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
    CANCELLED: 'CANCELLED',
    REFUNDED: 'REFUNDED'
};

export const PaymentMethod = {
    CARD: 'CARD',
    BANK_TRANSFER: 'BANK_TRANSFER',
    KAKAO_PAY: 'KAKAO_PAY',
    NAVER_PAY: 'NAVER_PAY',
    TOSS: 'TOSS'
};

// ================================================================
// PAYMENT INTEGRATION
// ================================================================

export const PaymentIntegration = {
    config: {
        pgProvider: 'toss',  // PG사 선택
        merchantId: '',
        apiKey: '',
        webhookUrl: 'https://api.autus.io/webhooks/payment'
    },
    products: {},
    transactions: [],
    subscriptions: [],
    
    init(config = {}) {
        this.config = { ...this.config, ...config };
        this.products = this._getDefaultProducts();
        this.transactions = [];
        this.subscriptions = [];
        return this;
    },
    
    // ================================================================
    // PRODUCT CATALOG
    // ================================================================
    
    _getDefaultProducts() {
        return {
            // 마이크로 클리닉 상품
            MICRO_CLINIC_BASIC: {
                id: 'MICRO_CLINIC_BASIC',
                name: '마이크로 클리닉 - 기본',
                description: '1:1 집중 보충 수업 (30분)',
                price: 50000,
                type: PaymentType.MICRO_CLINIC,
                duration: 30
            },
            MICRO_CLINIC_STANDARD: {
                id: 'MICRO_CLINIC_STANDARD',
                name: '마이크로 클리닉 - 표준',
                description: '1:1 집중 보충 수업 (60분)',
                price: 90000,
                type: PaymentType.MICRO_CLINIC,
                duration: 60
            },
            MICRO_CLINIC_PREMIUM: {
                id: 'MICRO_CLINIC_PREMIUM',
                name: '마이크로 클리닉 - 프리미엄',
                description: '1:1 집중 보충 수업 (90분) + 자료',
                price: 150000,
                type: PaymentType.MICRO_CLINIC,
                duration: 90
            },
            
            // Elite Club 상품
            ELITE_CLUB_MONTHLY: {
                id: 'ELITE_CLUB_MONTHLY',
                name: 'Elite Club 월정액',
                description: '프리미엄 멤버십 월정액',
                price: 500000,
                type: PaymentType.ELITE_CLUB_MONTHLY,
                recurring: true,
                interval: 'monthly'
            },
            ELITE_CLUB_DEPOSIT: {
                id: 'ELITE_CLUB_DEPOSIT',
                name: 'Elite Club 예치금',
                description: '골든 링 대기 예치금 (환불 가능)',
                price: 100000,
                type: PaymentType.ELITE_CLUB_DEPOSIT,
                refundable: true
            },
            
            // 업그레이드 상품
            TIER_UPGRADE: {
                id: 'TIER_UPGRADE',
                name: '티어 업그레이드',
                description: 'Elite Club 티어 업그레이드',
                price: 200000,
                type: PaymentType.UPGRADE
            }
        };
    },
    
    /**
     * 상품 조회
     */
    getProduct(productId) {
        return this.products[productId];
    },
    
    /**
     * 상품 목록
     */
    getProductsByType(type) {
        return Object.values(this.products).filter(p => p.type === type);
    },
    
    // ================================================================
    // PAYMENT PROCESSING
    // ================================================================
    
    /**
     * 결제 시작
     */
    async initiatePayment(params) {
        const { productId, customerId, method, metadata } = params;
        
        const product = this.getProduct(productId);
        if (!product) {
            throw new Error('상품을 찾을 수 없습니다.');
        }
        
        const transaction = {
            id: `txn_${Date.now()}`,
            productId,
            product,
            customerId,
            amount: product.price,
            method: method || PaymentMethod.CARD,
            status: PaymentStatus.PENDING,
            metadata: metadata || {},
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        this.transactions.push(transaction);
        
        // PG사 결제 페이지 URL 생성
        const paymentUrl = this._generatePaymentUrl(transaction);
        
        return {
            transactionId: transaction.id,
            amount: transaction.amount,
            paymentUrl,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30분 유효
        };
    },
    
    /**
     * 결제 완료 처리
     */
    async completePayment(transactionId, pgResponse) {
        const transaction = this.transactions.find(t => t.id === transactionId);
        if (!transaction) {
            throw new Error('거래를 찾을 수 없습니다.');
        }
        
        transaction.status = PaymentStatus.COMPLETED;
        transaction.pgResponse = pgResponse;
        transaction.completedAt = new Date();
        transaction.updatedAt = new Date();
        
        // 구독 상품인 경우 구독 생성
        if (transaction.product.recurring) {
            await this._createSubscription(transaction);
        }
        
        // 웹훅 전송
        await this._sendWebhook('payment.completed', transaction);
        
        return {
            success: true,
            transactionId: transaction.id,
            receipt: this._generateReceipt(transaction)
        };
    },
    
    /**
     * 결제 취소
     */
    async cancelPayment(transactionId, reason) {
        const transaction = this.transactions.find(t => t.id === transactionId);
        if (!transaction) {
            throw new Error('거래를 찾을 수 없습니다.');
        }
        
        if (transaction.status !== PaymentStatus.COMPLETED) {
            throw new Error('완료된 결제만 취소할 수 있습니다.');
        }
        
        transaction.status = PaymentStatus.CANCELLED;
        transaction.cancelReason = reason;
        transaction.cancelledAt = new Date();
        transaction.updatedAt = new Date();
        
        // PG사 취소 요청 (실제 구현에서)
        // await this._requestPGCancellation(transaction);
        
        await this._sendWebhook('payment.cancelled', transaction);
        
        return { success: true, transactionId };
    },
    
    /**
     * 환불 처리
     */
    async processRefund(transactionId, amount, reason) {
        const transaction = this.transactions.find(t => t.id === transactionId);
        if (!transaction) {
            throw new Error('거래를 찾을 수 없습니다.');
        }
        
        const refundAmount = amount || transaction.amount;
        
        const refund = {
            id: `ref_${Date.now()}`,
            originalTransactionId: transactionId,
            amount: refundAmount,
            reason,
            status: PaymentStatus.PROCESSING,
            createdAt: new Date()
        };
        
        // 부분 환불 / 전체 환불 처리
        if (refundAmount === transaction.amount) {
            transaction.status = PaymentStatus.REFUNDED;
        } else {
            transaction.partialRefunds = transaction.partialRefunds || [];
            transaction.partialRefunds.push(refund);
        }
        
        transaction.updatedAt = new Date();
        
        await this._sendWebhook('payment.refunded', { transaction, refund });
        
        return { success: true, refundId: refund.id, amount: refundAmount };
    },
    
    // ================================================================
    // SUBSCRIPTION MANAGEMENT
    // ================================================================
    
    /**
     * 구독 생성
     */
    async _createSubscription(transaction) {
        const subscription = {
            id: `sub_${Date.now()}`,
            customerId: transaction.customerId,
            productId: transaction.productId,
            product: transaction.product,
            status: 'ACTIVE',
            currentPeriodStart: new Date(),
            currentPeriodEnd: this._calculatePeriodEnd(transaction.product.interval),
            nextBillingDate: this._calculatePeriodEnd(transaction.product.interval),
            createdAt: new Date()
        };
        
        this.subscriptions.push(subscription);
        
        return subscription;
    },
    
    /**
     * 구독 조회
     */
    getSubscription(customerId) {
        return this.subscriptions.find(
            s => s.customerId === customerId && s.status === 'ACTIVE'
        );
    },
    
    /**
     * 구독 취소
     */
    async cancelSubscription(subscriptionId, immediately = false) {
        const subscription = this.subscriptions.find(s => s.id === subscriptionId);
        if (!subscription) {
            throw new Error('구독을 찾을 수 없습니다.');
        }
        
        if (immediately) {
            subscription.status = 'CANCELLED';
            subscription.cancelledAt = new Date();
        } else {
            subscription.cancelAtPeriodEnd = true;
        }
        
        await this._sendWebhook('subscription.cancelled', subscription);
        
        return { success: true, subscriptionId };
    },
    
    /**
     * 구독 갱신
     */
    async renewSubscription(subscriptionId) {
        const subscription = this.subscriptions.find(s => s.id === subscriptionId);
        if (!subscription) {
            throw new Error('구독을 찾을 수 없습니다.');
        }
        
        // 자동 결제 시도
        const payment = await this.initiatePayment({
            productId: subscription.productId,
            customerId: subscription.customerId,
            method: PaymentMethod.CARD,
            metadata: { subscriptionId, isRenewal: true }
        });
        
        return payment;
    },
    
    // ================================================================
    // ELITE CLUB SPECIFIC
    // ================================================================
    
    /**
     * Elite Club 가입
     */
    async joinEliteClub(customerId, tier = 1) {
        // 예치금 결제
        const deposit = await this.initiatePayment({
            productId: 'ELITE_CLUB_DEPOSIT',
            customerId,
            method: PaymentMethod.CARD,
            metadata: { tier, joinType: 'ELITE_CLUB' }
        });
        
        return {
            depositPayment: deposit,
            message: '예치금 결제 완료 후 Elite Club 가입이 완료됩니다.'
        };
    },
    
    /**
     * Elite Club 월정액 시작
     */
    async startEliteClubSubscription(customerId) {
        const subscription = await this.initiatePayment({
            productId: 'ELITE_CLUB_MONTHLY',
            customerId,
            method: PaymentMethod.CARD,
            metadata: { isEliteClub: true }
        });
        
        return subscription;
    },
    
    /**
     * Elite Club 티어 업그레이드
     */
    async upgradeEliteClubTier(customerId, newTier) {
        const upgrade = await this.initiatePayment({
            productId: 'TIER_UPGRADE',
            customerId,
            method: PaymentMethod.CARD,
            metadata: { newTier, upgradeType: 'TIER' }
        });
        
        return upgrade;
    },
    
    // ================================================================
    // MICRO CLINIC SPECIFIC
    // ================================================================
    
    /**
     * 마이크로 클리닉 예약 & 결제
     */
    async bookMicroClinic(params) {
        const { customerId, productId, date, time, teacherId, notes } = params;
        
        const payment = await this.initiatePayment({
            productId,
            customerId,
            method: PaymentMethod.CARD,
            metadata: {
                bookingDate: date,
                bookingTime: time,
                teacherId,
                notes,
                type: 'MICRO_CLINIC'
            }
        });
        
        return {
            payment,
            booking: {
                date,
                time,
                teacherId,
                status: 'PENDING_PAYMENT'
            }
        };
    },
    
    // ================================================================
    // HELPERS
    // ================================================================
    
    _generatePaymentUrl(transaction) {
        // 실제 구현에서는 PG사 SDK 사용
        return `https://pay.autus.io/checkout/${transaction.id}?amount=${transaction.amount}`;
    },
    
    _generateReceipt(transaction) {
        return {
            receiptId: `rcp_${transaction.id}`,
            transactionId: transaction.id,
            productName: transaction.product.name,
            amount: transaction.amount,
            paidAt: transaction.completedAt,
            paymentMethod: transaction.method,
            status: transaction.status
        };
    },
    
    _calculatePeriodEnd(interval) {
        const now = new Date();
        switch (interval) {
            case 'monthly':
                return new Date(now.setMonth(now.getMonth() + 1));
            case 'yearly':
                return new Date(now.setFullYear(now.getFullYear() + 1));
            default:
                return new Date(now.setMonth(now.getMonth() + 1));
        }
    },
    
    async _sendWebhook(event, data) {
        console.log(`[PaymentIntegration] Webhook: ${event}`, data.id || data.transactionId);
        // 실제 구현에서는 webhook URL로 POST 요청
    },
    
    // ================================================================
    // REPORTS
    // ================================================================
    
    /**
     * 결제 통계
     */
    getPaymentStats(period = 'month') {
        const now = new Date();
        let cutoff;
        
        switch (period) {
            case 'day': cutoff = new Date(now - 24 * 60 * 60 * 1000); break;
            case 'week': cutoff = new Date(now - 7 * 24 * 60 * 60 * 1000); break;
            case 'month': cutoff = new Date(now - 30 * 24 * 60 * 60 * 1000); break;
            default: cutoff = new Date(0);
        }
        
        const periodTransactions = this.transactions.filter(
            t => new Date(t.createdAt) >= cutoff
        );
        
        const completed = periodTransactions.filter(t => t.status === PaymentStatus.COMPLETED);
        const totalRevenue = completed.reduce((sum, t) => sum + t.amount, 0);
        
        const byProduct = {};
        completed.forEach(t => {
            byProduct[t.productId] = (byProduct[t.productId] || 0) + t.amount;
        });
        
        return {
            period,
            totalTransactions: periodTransactions.length,
            completedTransactions: completed.length,
            totalRevenue,
            averageOrderValue: completed.length > 0 ? totalRevenue / completed.length : 0,
            byProduct,
            conversionRate: periodTransactions.length > 0 
                ? (completed.length / periodTransactions.length * 100).toFixed(1) + '%'
                : 'N/A'
        };
    },
    
    /**
     * 대시보드 렌더링
     */
    renderDashboard() {
        const stats = this.getPaymentStats('month');
        const activeSubscriptions = this.subscriptions.filter(s => s.status === 'ACTIVE');
        
        return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>AUTUS Payment Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: system-ui, sans-serif; background: #0f0f1a; color: #fff; padding: 20px; }
        .dashboard { max-width: 1200px; margin: 0 auto; }
        h1 { margin-bottom: 30px; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: rgba(255,255,255,0.05); padding: 20px; border-radius: 12px; text-align: center; }
        .stat-value { font-size: 32px; font-weight: bold; color: #4ade80; }
        .stat-label { color: #888; font-size: 14px; }
        section { background: rgba(255,255,255,0.03); padding: 20px; border-radius: 12px; margin-bottom: 20px; }
        section h2 { margin-bottom: 15px; font-size: 18px; }
        .products-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
        .product-card { background: rgba(0,0,0,0.3); padding: 20px; border-radius: 12px; }
        .product-name { font-weight: bold; margin-bottom: 5px; }
        .product-price { font-size: 24px; color: #4ade80; }
        .product-desc { font-size: 12px; color: #888; }
    </style>
</head>
<body>
    <div class="dashboard">
        <h1>💳 Payment Dashboard</h1>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">₩${(stats.totalRevenue / 10000).toFixed(0)}만</div>
                <div class="stat-label">이번 달 매출</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.completedTransactions}</div>
                <div class="stat-label">완료된 결제</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${activeSubscriptions.length}</div>
                <div class="stat-label">활성 구독</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.conversionRate}</div>
                <div class="stat-label">전환율</div>
            </div>
        </div>
        
        <section>
            <h2>📦 상품 목록</h2>
            <div class="products-grid">
                ${Object.values(this.products).map(p => `
                    <div class="product-card">
                        <div class="product-name">${p.name}</div>
                        <div class="product-price">₩${p.price.toLocaleString()}</div>
                        <div class="product-desc">${p.description}</div>
                    </div>
                `).join('')}
            </div>
        </section>
    </div>
</body>
</html>`;
    }
};

// ================================================================
// TEST
// ================================================================

export async function testPaymentIntegration() {
    console.log('Testing Payment Integration...');
    
    const payment = Object.create(PaymentIntegration).init();
    
    // 마이크로 클리닉 결제
    const microClinic = await payment.initiatePayment({
        productId: 'MICRO_CLINIC_STANDARD',
        customerId: 'customer_001',
        method: PaymentMethod.CARD
    });
    console.log('✅ Micro Clinic payment initiated:', microClinic.transactionId);
    
    // Elite Club 가입
    const eliteClub = await payment.joinEliteClub('customer_002');
    console.log('✅ Elite Club join initiated:', eliteClub.depositPayment.transactionId);
    
    // 통계
    const stats = payment.getPaymentStats('month');
    console.log('✅ Stats:', stats);
    
    return { payment, microClinic, eliteClub, stats };
}

export default PaymentIntegration;
