/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 👤 EntityDetailScreen - AUTUS v1.0 Entity 상세/등록/수정 통합
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 모드:
 * - view: 상세 보기 (Outcome 표시)
 * - create: 신규 등록 (폼)
 * - edit: 정보 수정 (폼)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, spacing, borderRadius, typography } from '../../utils/theme';
import { useIndustryConfig } from '../../context/IndustryContext';
import { L, T } from '../../config/labelMap';
import type { AdminStackParamList } from '../../navigation/AppNavigatorV2';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

type Mode = 'view' | 'create' | 'edit';

interface EntityData {
  id?: string;
  name: string;
  contact: string;
  parentName?: string;
  parentContact?: string;
  vIndex?: number;
  status?: 'safe' | 'caution' | 'risk';
  totalSessions?: number;
  completedSessions?: number;
  joinDate?: string;
  nextSession?: string;
  unpaidAmount?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function EntityDetailScreen() {
  const { config } = useIndustryConfig();
  const navigation = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const route = useRoute<RouteProp<AdminStackParamList, 'EntityDetail'>>();
  
  const { entityId, mode: initialMode } = route.params;
  const [mode, setMode] = useState<Mode>(initialMode);
  const [loading, setLoading] = useState(initialMode === 'view');
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<EntityData>({
    name: '',
    contact: '',
    parentName: '',
    parentContact: '',
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Data Fetching
  // ─────────────────────────────────────────────────────────────────────────────

  const fetchEntityData = useCallback(async () => {
    if (!entityId) return;

    try {
      // TODO: 실제 API 연동
      // Mock data
      await new Promise(resolve => setTimeout(resolve, 500));
      setFormData({
        id: entityId,
        name: '김민수',
        contact: '010-1234-5678',
        parentName: '김철수',
        parentContact: '010-9876-5432',
        vIndex: 78,
        status: 'safe',
        totalSessions: 24,
        completedSessions: 18,
        joinDate: '2023-09-01',
        nextSession: '2024-01-17 15:00',
      });
    } catch (error: unknown) {
      if (__DEV__) console.error('Failed to fetch entity:', error);
    } finally {
      setLoading(false);
    }
  }, [entityId]);

  useEffect(() => {
    if (initialMode === 'view' || initialMode === 'edit') {
      fetchEntityData();
    }
  }, [entityId, initialMode, fetchEntityData]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Form Handling
  // ─────────────────────────────────────────────────────────────────────────────

  const updateField = useCallback((field: keyof EntityData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const validateForm = useCallback((): boolean => {
    if (!formData.name.trim()) {
      Alert.alert('알림', `${L.entity(config)} 이름을 입력해주세요.`);
      return false;
    }
    if (!formData.contact.trim()) {
      Alert.alert('알림', '연락처를 입력해주세요.');
      return false;
    }
    return true;
  }, [formData.name, formData.contact, config]);

  const handleSave = useCallback(async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      // TODO: 실제 API 연동
      await new Promise(resolve => setTimeout(resolve, 1000));

      const message = mode === 'create'
        ? `${L.entity(config)} 등록이 완료되었습니다.`
        : '수정이 완료되었습니다.';

      Alert.alert('완료', message, [
        { text: '확인', onPress: () => navigation.goBack() }
      ]);
    } catch (error: unknown) {
      Alert.alert('오류', '저장 중 문제가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  }, [validateForm, mode, config, navigation]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      '삭제 확인',
      `정말로 ${formData.name} ${L.entity(config)}을 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            // TODO: 실제 API 연동
            navigation.goBack();
          },
        },
      ]
    );
  }, [formData.name, config, navigation]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────────

  const getStatusColor = useCallback((status?: string) => {
    switch (status) {
      case 'safe': return colors.success.primary;
      case 'caution': return colors.caution.primary;
      case 'risk': return colors.danger.primary;
      default: return colors.text.muted;
    }
  }, []);

  const getStatusLabel = useCallback((status?: string) => {
    switch (status) {
      case 'safe': return '정상';
      case 'caution': return '주의';
      case 'risk': return config.labels.risk;
      default: return '-';
    }
  }, [config]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Render: View Mode
  // ─────────────────────────────────────────────────────────────────────────────

  const renderViewMode = () => (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      {/* Outcome Card */}
      <LinearGradient
        colors={[colors.surface, colors.background]}
        style={styles.outcomeCard}
      >
        <View style={styles.outcomeHeader}>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(formData.status)}20` }]}>
            <Text style={[styles.statusText, { color: getStatusColor(formData.status) }]}>
              {getStatusLabel(formData.status)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setMode('edit')}
          >
            <Ionicons name="pencil" size={18} color={config.color.primary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.entityNameLarge}>{formData.name}</Text>
        
        <View style={styles.vIndexDisplay}>
          <Text style={[styles.vIndexLarge, { color: getStatusColor(formData.status) }]}>
            {formData.vIndex || 0}°
          </Text>
          <Text style={styles.vIndexLabel}>V-Index</Text>
        </View>

        <View style={styles.progressInfo}>
          <Text style={styles.progressText}>
            {L.service(config)} 진행률: {formData.completedSessions || 0}/{formData.totalSessions || 0}회
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${((formData.completedSessions || 0) / (formData.totalSessions || 1)) * 100}%`,
                  backgroundColor: config.color.primary 
                }
              ]} 
            />
          </View>
        </View>
      </LinearGradient>

      {/* Info Cards */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📞 연락처</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{L.entity(config)}</Text>
            <Text style={styles.infoValue}>{formData.contact}</Text>
          </View>
          {formData.parentName && (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{L.entityParent(config)}</Text>
                <Text style={styles.infoValue}>{formData.parentName}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{L.entityParent(config)} 연락처</Text>
                <Text style={styles.infoValue}>{formData.parentContact}</Text>
              </View>
            </>
          )}
        </View>
        
        {/* 전화 연결 버튼 (온리쌤 스타일) */}
        <View style={styles.callButtonsRow}>
          {formData.contact && (
            <TouchableOpacity
              style={[styles.callButton, { backgroundColor: '#30D15820' }]}
              onPress={() => Linking.openURL(`tel:${formData.contact.replace(/-/g, '')}`)}
            >
              <Ionicons name="call" size={18} color="#30D158" />
              <Text style={[styles.callButtonText, { color: '#30D158' }]}>
                {L.entity(config)} 연락
              </Text>
            </TouchableOpacity>
          )}
          {formData.parentContact && (
            <TouchableOpacity
              style={[styles.callButton, { backgroundColor: `${config.color.primary}20` }]}
              onPress={() => formData.parentContact && Linking.openURL(`tel:${formData.parentContact.replace(/-/g, '')}`)}
            >
              <Ionicons name="call" size={18} color={config.color.primary} />
              <Text style={[styles.callButtonText, { color: config.color.primary }]}>
                {L.entityParent(config)} 연락
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📅 일정</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>등록일</Text>
            <Text style={styles.infoValue}>{formData.joinDate || '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>다음 {L.service(config)}</Text>
            <Text style={styles.infoValue}>{formData.nextSession || '-'}</Text>
          </View>
        </View>
      </View>

      {formData.unpaidAmount && formData.unpaidAmount > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💳 {T.unpaidAmount(config)}</Text>
          <View style={[styles.infoCard, styles.unpaidCard]}>
            <Text style={styles.unpaidAmount}>
              {formData.unpaidAmount.toLocaleString()}원
            </Text>
            <TouchableOpacity style={[styles.payButton, { backgroundColor: config.color.primary }]}>
              <Text style={styles.payButtonText}>결제 요청</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Delete Button */}
      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <Ionicons name="trash-outline" size={18} color={colors.danger.primary} />
        <Text style={styles.deleteButtonText}>삭제</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Render: Form Mode (Create/Edit)
  // ─────────────────────────────────────────────────────────────────────────────

  const renderFormMode = () => (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{L.entity(config)} 정보</Text>
          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>이름 *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(v) => updateField('name', v)}
                placeholder={`${L.entity(config)} 이름 입력`}
                placeholderTextColor={colors.text.muted}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>연락처 *</Text>
              <TextInput
                style={styles.input}
                value={formData.contact}
                onChangeText={(v) => updateField('contact', v)}
                placeholder="010-0000-0000"
                placeholderTextColor={colors.text.muted}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{L.entityParent(config)} 정보 (선택)</Text>
          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{L.entityParent(config)} 이름</Text>
              <TextInput
                style={styles.input}
                value={formData.parentName}
                onChangeText={(v) => updateField('parentName', v)}
                placeholder={`${L.entityParent(config)} 이름 입력`}
                placeholderTextColor={colors.text.muted}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{L.entityParent(config)} 연락처</Text>
              <TextInput
                style={styles.input}
                value={formData.parentContact}
                onChangeText={(v) => updateField('parentContact', v)}
                placeholder="010-0000-0000"
                placeholderTextColor={colors.text.muted}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: config.color.primary }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>
              {mode === 'create' ? '등록하기' : '저장하기'}
            </Text>
          )}
        </TouchableOpacity>

        {mode === 'edit' && (
          <TouchableOpacity style={styles.cancelButton} onPress={() => setMode('view')}>
            <Text style={styles.cancelButtonText}>취소</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Main Render
  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={config.color.primary} />
      </View>
    );
  }

  const headerTitle = mode === 'create' 
    ? T.newEntity(config)
    : mode === 'edit' 
    ? T.editEntity(config)
    : formData.name;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        <View style={{ width: 40 }} />
      </View>

      {mode === 'view' ? renderViewMode() : renderFormMode()}
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text.primary,
  },

  // Content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
  },

  // Outcome Card
  outcomeCard: {
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  outcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  statusBadge: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  entityNameLarge: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  vIndexDisplay: {
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  vIndexLarge: {
    fontSize: 48,
    fontWeight: '700',
  },
  vIndexLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
  },
  progressInfo: {
    gap: spacing[2],
  },
  progressText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.border.primary,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },

  // Section
  section: {
    marginBottom: spacing[4],
  },
  sectionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing[2],
  },

  // Info Card
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  infoLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
  },
  infoValue: {
    fontSize: typography.fontSize.md,
    color: colors.text.primary,
    fontWeight: '500',
  },

  // Unpaid Card
  unpaidCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderColor: colors.danger.primary,
  },
  unpaidAmount: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.danger.primary,
  },
  payButton: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
  },
  payButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: '#fff',
  },

  // Form Card
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.primary,
    gap: spacing[3],
  },
  inputGroup: {
    gap: spacing[1],
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  input: {
    height: 48,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    fontSize: typography.fontSize.md,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },

  // Buttons
  saveButton: {
    height: 52,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing[4],
  },
  saveButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: '#fff',
  },
  cancelButton: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing[2],
  },
  cancelButtonText: {
    fontSize: typography.fontSize.md,
    color: colors.text.muted,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
    marginTop: spacing[4],
  },
  deleteButtonText: {
    fontSize: typography.fontSize.md,
    color: colors.danger.primary,
  },

  // 전화 연결 버튼 (온리쌤 스타일)
  callButtonsRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[3],
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
  },
  callButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
});
