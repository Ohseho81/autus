/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🏀 ParentSelfServiceScreen - 일론 스타일 학부모 셀프서비스
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 일론 원칙 적용:
 * 1. 셀프서비스 100% - 문의 버튼 없음, 모든 것 직접 처리
 * 2. 원터치 - 결석신고, 보강신청 한 번 탭으로 완료
 * 3. 실시간 - 모든 상태 즉시 반영
 * 4. 예측 - 필요한 것 미리 제안
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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface Child {
  id: string;
  name: string;
  photo?: string;
  className: string;
  sessionsRemaining: number;
  nextClass: {
    date: string;
    time: string;
    className: string;
  };
  recentVideos: number;
  attendanceRate: number;
}

interface QuickAction {
  id: string;
  icon: string;
  label: string;
  color: string;
  bgColor: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Quick Action Button (원터치)
// ═══════════════════════════════════════════════════════════════════════════════

interface QuickActionButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  bgColor: string;
  onPress: () => void;
  badge?: number;
}

const QuickActionButton: React.FC<QuickActionButtonProps> = ({
  icon,
  label,
  color,
  bgColor,
  onPress,
  badge,
}) => (
  <TouchableOpacity
    style={[styles.quickAction, { backgroundColor: bgColor }]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <View style={styles.quickActionIcon}>
      <Ionicons name={icon} size={28} color={color} />
      {badge !== undefined && badge > 0 && (
        <View style={[styles.badge, { backgroundColor: color }]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </View>
    <Text style={[styles.quickActionLabel, { color }]}>{label}</Text>
  </TouchableOpacity>
);

// ═══════════════════════════════════════════════════════════════════════════════
// 원터치 결석신고 모달
// ═══════════════════════════════════════════════════════════════════════════════

interface AbsenceModalProps {
  visible: boolean;
  onClose: () => void;
  childName: string;
  nextClass: { date: string; time: string; className: string };
}

const AbsenceModal: React.FC<AbsenceModalProps> = ({
  visible,
  onClose,
  childName,
  nextClass,
}) => {
  const [reason, setReason] = useState<string>('');
  const [submitted, setSubmitted] = useState(false);

  const reasons = [
    { id: 'sick', label: '아파요', icon: 'medical' },
    { id: 'school', label: '학교일정', icon: 'school' },
    { id: 'family', label: '가족일정', icon: 'people' },
    { id: 'other', label: '기타', icon: 'ellipsis-horizontal' },
  ];

  const handleSubmit = () => {
    if (!reason) {
      Alert.alert('사유를 선택해주세요');
      return;
    }

    setSubmitted(true);

    // 🚀 일론 방식: 즉시 처리 + 자동 보강권 발급
    setTimeout(() => {
      onClose();
      setSubmitted(false);
      setReason('');
      Alert.alert(
        '결석 신고 완료',
        `${childName} 학생의 결석이 접수되었습니다.\n\n✅ 보강권 1회가 자동 발급되었습니다.`,
        [{ text: '확인' }]
      );
    }, 1000);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>결석 신고</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* 수업 정보 */}
          <View style={styles.classInfo}>
            <Ionicons name="calendar" size={20} color="#FF9500" />
            <View style={styles.classInfoText}>
              <Text style={styles.classInfoMain}>
                {nextClass.date} {nextClass.time}
              </Text>
              <Text style={styles.classInfoSub}>{nextClass.className}</Text>
            </View>
          </View>

          {/* 사유 선택 (원터치) */}
          <Text style={styles.reasonLabel}>결석 사유</Text>
          <View style={styles.reasonGrid}>
            {reasons.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={[
                  styles.reasonBtn,
                  reason === r.id && styles.reasonBtnActive,
                ]}
                onPress={() => setReason(r.id)}
              >
                <Ionicons
                  name={r.icon as keyof typeof Ionicons.glyphMap}
                  size={24}
                  color={reason === r.id ? '#FF9500' : '#888'}
                />
                <Text style={[
                  styles.reasonText,
                  reason === r.id && styles.reasonTextActive,
                ]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 안내 메시지 */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#4CAF50" />
            <Text style={styles.infoText}>
              결석 신고 시 보강권 1회가 자동으로 발급됩니다.
            </Text>
          </View>

          {/* 제출 버튼 */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              !reason && styles.submitBtnDisabled,
              submitted && styles.submitBtnLoading,
            ]}
            onPress={handleSubmit}
            disabled={!reason || submitted}
          >
            {submitted ? (
              <Text style={styles.submitBtnText}>처리 중...</Text>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.submitBtnText}>결석 신고하기</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 메인 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

export default function ParentSelfServiceScreen() {
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [showMakeupModal, setShowMakeupModal] = useState(false);

  // Mock 데이터
  const child: Child = {
    id: '1',
    name: '김민준',
    className: '초5,6부',
    sessionsRemaining: 3,
    nextClass: {
      date: '오늘',
      time: '17:00',
      className: '초5,6부',
    },
    recentVideos: 2,
    attendanceRate: 92,
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <LinearGradient
        colors={['#FF9500', '#FF7B00']}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.childName}>{child.name}</Text>
            <Text style={styles.className}>{child.className}</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{child.name?.[0] || '?'}</Text>
          </View>
        </View>

        {/* 다음 수업 */}
        <View style={styles.nextClassCard}>
          <View style={styles.nextClassLeft}>
            <Text style={styles.nextClassLabel}>다음 수업</Text>
            <Text style={styles.nextClassTime}>
              {child.nextClass.date} {child.nextClass.time}
            </Text>
          </View>
          <View style={styles.nextClassDivider} />
          <View style={styles.nextClassRight}>
            <Text style={styles.sessionsLabel}>잔여 회차</Text>
            <Text style={[
              styles.sessionsNum,
              child.sessionsRemaining <= 3 && { color: '#FFCDD2' }
            ]}>
              {child.sessionsRemaining}회
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* 🚀 일론 스타일: 원터치 퀵액션 */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>원터치 서비스</Text>
          <View style={styles.quickActionsGrid}>
            <QuickActionButton
              icon="close-circle"
              label="결석 신고"
              color="#F44336"
              bgColor="#FFEBEE"
              onPress={() => setShowAbsenceModal(true)}
            />
            <QuickActionButton
              icon="add-circle"
              label="보강 신청"
              color="#4CAF50"
              bgColor="#E8F5E9"
              onPress={() => setShowMakeupModal(true)}
            />
            <QuickActionButton
              icon="calendar"
              label="스케줄 변경"
              color="#2196F3"
              bgColor="#E3F2FD"
              onPress={() => {}}
            />
            <QuickActionButton
              icon="card"
              label="결제하기"
              color="#FF9500"
              bgColor="#FFF3E0"
              onPress={() => {}}
              badge={child.sessionsRemaining <= 3 ? 1 : 0}
            />
          </View>
        </View>

        {/* 실시간 현황 카드들 */}
        <View style={styles.statusSection}>
          <Text style={styles.sectionTitle}>현황</Text>

          {/* 출석률 */}
          <View style={styles.statusCard}>
            <View style={styles.statusIcon}>
              <Ionicons name="checkmark-done" size={24} color="#4CAF50" />
            </View>
            <View style={styles.statusInfo}>
              <Text style={styles.statusLabel}>이번 달 출석률</Text>
              <Text style={styles.statusValue}>{child.attendanceRate}%</Text>
            </View>
            <View style={styles.statusProgress}>
              <View style={[styles.progressBar, { width: `${child.attendanceRate}%` }]} />
            </View>
          </View>

          {/* 최근 영상 */}
          <TouchableOpacity style={styles.statusCard}>
            <View style={[styles.statusIcon, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="videocam" size={24} color="#2196F3" />
            </View>
            <View style={styles.statusInfo}>
              <Text style={styles.statusLabel}>새 수업 영상</Text>
              <Text style={styles.statusValue}>{child.recentVideos}개</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* 🚀 일론 방식: AI 추천 (예측 > 반응) */}
        {child.sessionsRemaining <= 3 && (
          <View style={styles.aiRecommendation}>
            <View style={styles.aiHeader}>
              <Ionicons name="bulb" size={20} color="#FF9500" />
              <Text style={styles.aiTitle}>AI 추천</Text>
            </View>
            <Text style={styles.aiText}>
              잔여 회차가 {child.sessionsRemaining}회 남았습니다.
              {'\n'}지금 충전하시면 10% 할인 혜택을 받으실 수 있어요!
            </Text>
            <TouchableOpacity style={styles.aiBtn}>
              <Text style={styles.aiBtnText}>10회 충전하기 (270,000원)</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 🚀 일론 방식: 문의 버튼 없음 - 대신 FAQ */}
        <View style={styles.faqSection}>
          <Text style={styles.sectionTitle}>자주 묻는 질문</Text>
          {[
            { q: '보강은 어떻게 신청하나요?', a: '원터치 서비스 > 보강 신청' },
            { q: '스케줄 변경은 가능한가요?', a: '원터치 서비스 > 스케줄 변경' },
            { q: '수업 영상은 어디서 볼 수 있나요?', a: '현황 > 새 수업 영상' },
          ].map((faq, idx) => (
            <TouchableOpacity key={idx} style={styles.faqItem}>
              <Text style={styles.faqQ}>{faq.q}</Text>
              <Ionicons name="chevron-forward" size={16} color="#ccc" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* 결석신고 모달 */}
      <AbsenceModal
        visible={showAbsenceModal}
        onClose={() => setShowAbsenceModal(false)}
        childName={child.name}
        nextClass={child.nextClass}
      />
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
    paddingBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  childName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  className: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  nextClassCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
  },
  nextClassLeft: {
    flex: 1,
  },
  nextClassLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  nextClassTime: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginTop: 4,
  },
  nextClassDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 16,
  },
  nextClassRight: {
    alignItems: 'flex-end',
  },
  sessionsLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  sessionsNum: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },

  // Quick Actions
  quickActionsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickAction: {
    width: (SCREEN_WIDTH - 44) / 2,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  quickActionIcon: {
    position: 'relative',
    marginBottom: 8,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  quickActionLabel: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Status Section
  statusSection: {
    padding: 16,
    paddingTop: 0,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 13,
    color: '#888',
  },
  statusValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 2,
  },
  statusProgress: {
    width: 60,
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },

  // AI Recommendation
  aiRecommendation: {
    margin: 16,
    marginTop: 0,
    backgroundColor: '#FFF8E1',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  aiTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF9500',
  },
  aiText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  aiBtn: {
    marginTop: 12,
    backgroundColor: '#FF9500',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  aiBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },

  // FAQ
  faqSection: {
    padding: 16,
    paddingTop: 0,
    marginBottom: 40,
  },
  faqItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  faqQ: {
    fontSize: 14,
    color: '#1A1A1A',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  modalClose: {
    padding: 4,
  },
  classInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 14,
    borderRadius: 12,
    gap: 12,
    marginBottom: 20,
  },
  classInfoText: {},
  classInfoMain: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  classInfoSub: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  reasonGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  reasonBtn: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  reasonBtnActive: {
    borderColor: '#FF9500',
    backgroundColor: '#FFF3E0',
  },
  reasonText: {
    fontSize: 12,
    color: '#888',
    marginTop: 6,
  },
  reasonTextActive: {
    color: '#FF9500',
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 10,
    gap: 8,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#388E3C',
  },
  submitBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FF9500',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  submitBtnDisabled: {
    backgroundColor: '#E0E0E0',
  },
  submitBtnLoading: {
    backgroundColor: '#FFB74D',
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
