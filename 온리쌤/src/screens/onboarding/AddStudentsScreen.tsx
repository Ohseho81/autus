/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🧒 AddStudentsScreen - 학생 추가
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { colors, typography, spacing, borderRadius } from '../../utils/theme';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'AddStudents'>;

interface Student {
  id: string;
  name: string;
}

export default function AddStudentsScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [studentName, setStudentName] = useState('');
  const [students, setStudents] = useState<Student[]>([]);

  const handleAdd = () => {
    if (!studentName.trim()) return;
    Keyboard.dismiss();
    setStudents(prev => [
      ...prev,
      { id: Date.now().toString(), name: studentName.trim() },
    ]);
    setStudentName('');
  };

  const handleRemove = (id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id));
  };

  const handleNext = () => {
    navigation.navigate('Complete', {});
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom }]}>
      {/* 뒤로가기 */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.step}>3 / 4</Text>
        <Text style={styles.title}>학생 추가</Text>
        <Text style={styles.subtitle}>관리할 학생을 추가하세요 (나중에도 가능)</Text>
      </View>

      {/* 입력 */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="학생 이름"
          placeholderTextColor={colors.text.muted}
          value={studentName}
          onChangeText={setStudentName}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
          maxLength={20}
        />
        <TouchableOpacity
          style={[styles.addBtn, !studentName.trim() && styles.addBtnDisabled]}
          onPress={handleAdd}
          disabled={!studentName.trim()}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* 학생 목록 */}
      <FlatList
        data={students}
        keyExtractor={item => item.id}
        style={styles.list}
        contentContainerStyle={students.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={colors.text.muted} />
            <Text style={styles.emptyText}>아직 추가된 학생이 없습니다</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.studentCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
            </View>
            <Text style={styles.studentName}>{item.name}</Text>
            <TouchableOpacity onPress={() => handleRemove(item.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={22} color={colors.text.muted} />
            </TouchableOpacity>
          </View>
        )}
      />

      {/* 하단 버튼 */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing[4] }]}>
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextBtnText}>
            {students.length > 0 ? `${students.length}명과 시작하기` : '건너뛰기'}
          </Text>
          <Ionicons name="arrow-forward" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backBtn: {
    marginLeft: spacing[4],
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[4],
    marginBottom: spacing[6],
  },
  step: {
    fontSize: typography.fontSize.sm,
    color: '#FF6B2C',
    fontWeight: '600',
    marginBottom: spacing[2],
  },
  title: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.text.tertiary,
  },
  inputRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing[6],
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.primary,
    height: 52,
    paddingHorizontal: spacing[4],
    fontSize: typography.fontSize.lg,
    color: colors.text.primary,
  },
  addBtn: {
    width: 52,
    height: 52,
    backgroundColor: '#FF6B2C',
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnDisabled: {
    opacity: 0.4,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing[6],
    gap: spacing[2],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    gap: spacing[3],
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: colors.text.muted,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B2C20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  avatarText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: '#FF6B2C',
  },
  studentName: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontWeight: '500',
    color: colors.text.primary,
  },
  bottomBar: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
  },
  nextBtn: {
    flexDirection: 'row',
    backgroundColor: '#FF6B2C',
    height: 54,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[2],
  },
  nextBtnText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: 'white',
  },
});
