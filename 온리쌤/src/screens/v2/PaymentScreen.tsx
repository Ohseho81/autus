/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🏀 PaymentScreen - 베이조스 스타일 결제 플라이휠
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 핵심 원칙:
 * 1. 플라이휠 효과: 결제 → 출석 → 만족 → 재등록
 * 2. 25단계 프로세스 모니터링
 * 3. 로열티 할인 자동 적용
 * 4. AI 추천 패키지
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// 서비스 임포트
import {
  paymentService,
  PaymentType,
  PaymentMethod,
  PaymentError,
} from '../../services/PaymentService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface Package {
  id: string;
  name: string;
  sessions: number;
  price: number;
  originalPrice?: number;
  discount?: number;
  popular?: boolean;
  recommended?: boolean;
}

interface PaymentSummary {
  subtotal: number;
  loyaltyDiscount: number;
  promoDiscount: number;
  bonusSessions: number;
  total: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 패키지 카드 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

interface PackageCardProps {
  pkg: Package;
  selected: boolean;
  onSelect: () => void;
}

const PackageCard: React.FC<PackageCardProps> = ({ pkg, selected, onSelect }) => (
  <TouchableOpacity
    style={[
      styles.packageCard,
      selected && styles.packageCardSelected,
      pkg.recommended && styles.packageCardRecommended,
    ]}
    onPress={onSelect}
    activeOpacity={0.8}
  >
    {pkg.recommended && (
      <View style={styles.recommendedBadge}>
        <Ionicons name="star" size={12} color="#fff" />
        <Text style={styles.recommendedText}>AI 추천</Text>
      </View>
    )}
    {pkg.popular && (
      <View style={[styles.recommendedBadge, { backgroundColor: '#2196F3' }]}>
        <Ionicons name="flame" size={12} color="#fff" />
        <Text style={styles.recommendedText}>인기</Text>
      </View>
    )}

    <Text style={styles.packageName}>{pkg.name}</Text>
    <Text style={styles.packageSessions}>{pkg.sessions}회</Text>

    <View style={styles.priceContainer}>
      {pkg.originalPrice && (
        <Text style={styles.originalPrice}>
          {pkg.originalPrice.toLocaleString()}원
        </Text>
      )}
      <Text style={[styles.packagePrice, selected && styles.packagePriceSelected]}>
        {pkg.price.toLocaleString()}원
      </Text>
      {pkg.discount && (
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>{pkg.discount}%↓</Text>
        </View>
      )}
    </View>

    <Text style={styles.perSession}>
      회당 {Math.round(pkg.price / pkg.sessions).toLocaleString()}원
    </Text>

    {selected && (
      <View style={styles.selectedCheck}>
        <Ionicons name="checkmark-circle" size={24} color="#FF9500" />
      </View>
    )}
  </TouchableOpacity>
);

// ═══════════════════════════════════════════════════════════════════════════════
// 결제 수단 선택 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

interface PaymentMethodSelectorProps {
  selected: PaymentMethod | null;
  onSelect: (method: PaymentMethod) => void;
}

const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  selected,
  onSelect,
}) => {
  const methods = [
    { id: PaymentMethod.CARD, icon: 'card', label: '카드결제' },
    { id: PaymentMethod.KAKAO_PAY, icon: 'chatbubble', label: '카카오페이' },
    { id: PaymentMethod.NAVER_PAY, icon: 'logo-google', label: '네이버페이' },
    { id: PaymentMethod.TRANSFER, icon: 'swap-horizontal', label: '계좌이체' },
  ];

  return (
    <View style={styles.methodContainer}>
      <Text style={styles.sectionTitle}>결제 수단</Text>
      <View style={styles.methodGrid}>
        {methods.map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[
              styles.methodCard,
              selected === method.id && styles.methodCardSelected,
            ]}
            onPress={() => onSelect(method.id)}
          >
            <Ionicons
              name={method.icon as keyof typeof Ionicons.glyphMap}
              size={24}
              color={selected === method.id ? '#FF9500' : '#888'}
            />
            <Text style={[
              styles.methodLabel,
              selected === method.id && styles.methodLabelSelected,
            ]}>
              {method.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 자동결제 옵션 */}
      <TouchableOpacity style={styles.autoPayOption}>
        <View style={styles.autoPayCheck}>
          <Ionicons name="checkbox" size={24} color="#FF9500" />
        </View>
        <View style={styles.autoPayInfo}>
          <Text style={styles.autoPayTitle}>자동결제 설정</Text>
          <Text style={styles.autoPayDesc}>
            매월 자동 갱신 시 10% 추가 할인 + 3회 보너스
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 메인 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

export default function PaymentScreen() {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [autoRenewal, setAutoRenewal] = useState(true);

  // 패키지 목록 (실제로는 서버에서 로드)
  const packages: Package[] = [
    { id: 'regular_4', name: '정규반 주1회', sessions: 4, price: 120000, originalPrice: 120000 },
    { id: 'regular_8', name: '정규반 주2회', sessions: 8, price: 220000, originalPrice: 240000, discount: 8, popular: true },
    { id: 'regular_12', name: '정규반 주3회', sessions: 12, price: 300000, originalPrice: 360000, discount: 17, recommended: true },
    { id: 'private_4', name: '개인레슨 4회', sessions: 4, price: 280000, originalPrice: 320000, discount: 13 },
    { id: 'open_10', name: '오픈반 10회권', sessions: 10, price: 130000, originalPrice: 150000, discount: 13 },
  ];

  // 학생 정보 (실제로는 Context/Props에서)
  const studentInfo = {
    id: 'student_001',
    name: '김민준',
    remainingSessions: 2,
    membershipMonths: 8, // 8개월 회원 → Silver 등급
    loyaltyTier: 'silver',
    loyaltyDiscount: 5,
  };

  // 패키지 선택 시 요약 계산
  useEffect(() => {
    if (selectedPackage) {
      const pkg = packages.find(p => p.id === selectedPackage);
      if (pkg) {
        const subtotal = pkg.price;
        const loyaltyDiscount = Math.round(subtotal * (studentInfo.loyaltyDiscount / 100));
        const promoDiscount = 0; // TODO: 프로모션 코드 적용
        const bonusSessions = autoRenewal ? 3 : 0;
        const autoDiscount = autoRenewal ? Math.round(subtotal * 0.1) : 0;
        const total = subtotal - loyaltyDiscount - promoDiscount - autoDiscount;

        setSummary({
          subtotal,
          loyaltyDiscount: loyaltyDiscount + autoDiscount,
          promoDiscount,
          bonusSessions,
          total,
        });
      }
    }
  }, [selectedPackage, autoRenewal]);

  // 결제 처리
  const handlePayment = async () => {
    if (!selectedPackage || !selectedMethod) {
      Alert.alert('알림', '패키지와 결제 수단을 선택해주세요.');
      return;
    }

    const pkg = packages.find(p => p.id === selectedPackage);
    if (!pkg) return;

    setIsProcessing(true);

    try {
      const result = await paymentService.processPayment({
        studentId: studentInfo.id,
        parentId: 'parent_001', // 실제로는 로그인된 사용자
        type: PaymentType.RENEWAL,
        method: selectedMethod,
        amount: pkg.price,
        sessions: pkg.sessions,
        programId: pkg.id,
        autoRenewal,
      });

      if (result.success) {
        Alert.alert(
          '결제 완료! 🎉',
          `${pkg.sessions + (summary?.bonusSessions || 0)}회가 충전되었습니다.\n\n` +
          `처리 시간: ${result.metrics?.totalDurationMs}ms\n` +
          `영수증 번호: ${result.receipt?.receiptId}`,
          [{ text: '확인', onPress: () => {/* 네비게이션 */ } }]
        );
      } else {
        const errorMessages: Record<string, string> = {
          [PaymentError.CARD_DECLINED]: '카드가 거절되었습니다. 다른 결제 수단을 사용해주세요.',
          [PaymentError.DUPLICATE_PAYMENT]: '이미 처리된 결제입니다.',
          [PaymentError.PG_CONNECTION_ERROR]: 'PG사 연결 오류입니다. 잠시 후 다시 시도해주세요.',
        };

        Alert.alert(
          '결제 실패',
          errorMessages[result.error || ''] || result.message || '결제 처리 중 오류가 발생했습니다.'
        );
      }
    } catch (error: unknown) {
      if (__DEV__) console.error('Payment error:', error);
      Alert.alert('오류', '결제 처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <LinearGradient
        colors={['#FF9500', '#FF7B00']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>수강권 충전</Text>
          <Text style={styles.headerSubtitle}>
            {studentInfo.name} • 잔여 {studentInfo.remainingSessions}회
          </Text>
        </View>

        {/* 로열티 등급 */}
        <View style={styles.loyaltyCard}>
          <View style={styles.loyaltyIcon}>
            <Ionicons name="trophy" size={20} color="#FFD700" />
          </View>
          <View style={styles.loyaltyInfo}>
            <Text style={styles.loyaltyTier}>
              {studentInfo.loyaltyTier.toUpperCase()} 회원
            </Text>
            <Text style={styles.loyaltyBenefit}>
              {studentInfo.loyaltyDiscount}% 상시 할인
            </Text>
          </View>
          <Text style={styles.loyaltyMonths}>
            {studentInfo.membershipMonths}개월 이용
          </Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* 패키지 선택 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>패키지 선택</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.packageList}
          >
            {packages.map((pkg) => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                selected={selectedPackage === pkg.id}
                onSelect={() => setSelectedPackage(pkg.id)}
              />
            ))}
          </ScrollView>
        </View>

        {/* 결제 수단 */}
        <PaymentMethodSelector
          selected={selectedMethod}
          onSelect={setSelectedMethod}
        />

        {/* 결제 요약 */}
        {summary && (
          <View style={styles.summarySection}>
            <Text style={styles.sectionTitle}>결제 요약</Text>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>상품 금액</Text>
                <Text style={styles.summaryValue}>
                  {summary.subtotal.toLocaleString()}원
                </Text>
              </View>

              {summary.loyaltyDiscount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>
                    할인 ({studentInfo.loyaltyTier} + 자동결제)
                  </Text>
                  <Text style={[styles.summaryValue, styles.discountValue]}>
                    -{summary.loyaltyDiscount.toLocaleString()}원
                  </Text>
                </View>
              )}

              {summary.bonusSessions > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>보너스 회차</Text>
                  <Text style={[styles.summaryValue, styles.bonusValue]}>
                    +{summary.bonusSessions}회
                  </Text>
                </View>
              )}

              <View style={styles.summaryDivider} />

              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>총 결제 금액</Text>
                <Text style={styles.totalValue}>
                  {summary.total.toLocaleString()}원
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* 플라이휠 안내 */}
        <View style={styles.flywheelCard}>
          <View style={styles.flywheelHeader}>
            <Ionicons name="infinite" size={20} color="#FF9500" />
            <Text style={styles.flywheelTitle}>플라이휠 혜택</Text>
          </View>
          <Text style={styles.flywheelText}>
            지속적인 이용으로 더 큰 혜택을 받으세요!{'\n'}
            • 6개월 이용 시: 3% 할인 (Bronze){'\n'}
            • 12개월 이용 시: 5% 할인 (Silver){'\n'}
            • 24개월 이용 시: 8% 할인 (Gold){'\n'}
            • 36개월 이용 시: 10% 할인 (Platinum)
          </Text>
        </View>
      </ScrollView>

      {/* 결제 버튼 */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.payButton,
            (!selectedPackage || !selectedMethod) && styles.payButtonDisabled,
            isProcessing && styles.payButtonProcessing,
          ]}
          onPress={handlePayment}
          disabled={!selectedPackage || !selectedMethod || isProcessing}
        >
          {isProcessing ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.payButtonText}>25단계 처리 중...</Text>
            </>
          ) : (
            <>
              <Ionicons name="card" size={20} color="#fff" />
              <Text style={styles.payButtonText}>
                {summary ? `${summary.total.toLocaleString()}원 결제하기` : '결제하기'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerContent: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  loyaltyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 12,
  },
  loyaltyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,215,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  loyaltyInfo: {
    flex: 1,
  },
  loyaltyTier: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFD700',
  },
  loyaltyBenefit: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  loyaltyMonths: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  packageList: {
    paddingRight: 16,
    gap: 12,
  },
  packageCard: {
    width: 160,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    position: 'relative',
  },
  packageCardSelected: {
    borderColor: '#FF9500',
    backgroundColor: '#FFF8F0',
  },
  packageCardRecommended: {
    borderColor: '#FF9500',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -8,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  packageName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  packageSessions: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FF9500',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  originalPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  packagePrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  packagePriceSelected: {
    color: '#FF9500',
  },
  discountBadge: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  discountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F44336',
  },
  perSession: {
    fontSize: 11,
    color: '#888',
    marginTop: 8,
  },
  selectedCheck: {
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
  methodContainer: {
    padding: 16,
    paddingTop: 0,
  },
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  methodCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  methodCardSelected: {
    borderColor: '#FF9500',
    backgroundColor: '#FFF8F0',
  },
  methodLabel: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
  },
  methodLabelSelected: {
    color: '#FF9500',
    fontWeight: '600',
  },
  autoPayOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  autoPayCheck: {
    marginRight: 12,
  },
  autoPayInfo: {
    flex: 1,
  },
  autoPayTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  autoPayDesc: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  summarySection: {
    padding: 16,
    paddingTop: 0,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  discountValue: {
    color: '#F44336',
  },
  bonusValue: {
    color: '#4CAF50',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 10,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FF9500',
  },
  flywheelCard: {
    margin: 16,
    marginTop: 0,
    backgroundColor: '#FFF8E1',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
    marginBottom: 100,
  },
  flywheelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  flywheelTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF9500',
  },
  flywheelText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  payButton: {
    backgroundColor: '#FF9500',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  payButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  payButtonProcessing: {
    backgroundColor: '#FFB74D',
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
