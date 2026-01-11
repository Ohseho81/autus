/**
 * AUTUS Mobile - Mission Create Modal Component
 */

import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Modal,
  Pressable,
} from 'react-native';
import { Node, MissionType } from '../types';
import { theme } from '../constants/theme';
import { formatNodeValue } from '../utils/formatters';
import { getStateIcon, getStateColor } from '../utils/calculations';
import { mediumTap, success, warning } from '../services/haptics';

interface ActionOption {
  id: string;
  name: string;
  desc: string;
  meta: string[];
  effect: string;
  effectColor: string;
  recommended?: boolean;
  type?: MissionType;
}

const ACTION_OPTIONS: ActionOption[] = [
  { 
    id: 'ignore', 
    name: '❌ 무시', 
    desc: '지금은 조치하지 않습니다', 
    meta: ['💰 ₩0', '⏱️ 0분'], 
    effect: '⚠️ 압력 상승',
    effectColor: theme.danger,
  },
  { 
    id: 'auto', 
    name: '🤖 자동화', 
    desc: 'AUTUS가 자동으로 최적화', 
    meta: ['💰 ₩0', '⏱️ 3일'], 
    effect: '📈 개선',
    effectColor: theme.success,
    recommended: true,
    type: '자동화',
  },
  { 
    id: 'out', 
    name: '👥 외주', 
    desc: '전문가에게 분석 의뢰', 
    meta: ['💰 ₩300,000', '⏱️ 7일'], 
    effect: '📈 큰 개선',
    effectColor: theme.success,
    type: '외주',
  },
  { 
    id: 'direct', 
    name: '📋 지시', 
    desc: '팀원에게 검토 지시', 
    meta: ['💰 ₩0', '⏱️ 1일'], 
    effect: '📈 소폭 개선',
    effectColor: theme.success,
    type: '지시',
  },
];

interface MissionCreateModalProps {
  visible: boolean;
  node: Node | null;
  onClose: () => void;
  onSelect: (type: MissionType | null) => void;
}

export const MissionCreateModal: React.FC<MissionCreateModalProps> = ({
  visible,
  node,
  onClose,
  onSelect,
}) => {
  if (!node) return null;
  
  const handleSelect = (option: ActionOption) => {
    if (option.id === 'ignore') {
      warning();
      onSelect(null);
    } else {
      success();
      onSelect(option.type!);
    }
  };
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
          {/* Handle */}
          <View style={styles.handle} />
          
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.icon}>{getStateIcon(node.state)}</Text>
            <Text style={styles.title}>{node.name} {formatNodeValue(node)}</Text>
            <Text style={styles.subtitle}>
              현재: {formatNodeValue(node)} | 압력: {(node.pressure * 100).toFixed(0)}%
            </Text>
          </View>
          
          {/* Question */}
          <Text style={styles.question}>어떻게 하시겠습니까?</Text>
          
          {/* Options */}
          {ACTION_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.option,
                option.recommended && styles.optionRecommended,
              ]}
              onPress={() => handleSelect(option)}
              activeOpacity={0.8}
            >
              <View style={styles.optionHeader}>
                <Text style={styles.optionName}>{option.name}</Text>
                {option.recommended && (
                  <View style={styles.recommendBadge}>
                    <Text style={styles.recommendText}>⭐ 추천</Text>
                  </View>
                )}
              </View>
              <Text style={styles.optionDesc}>{option.desc}</Text>
              <View style={styles.optionMeta}>
                {option.meta.map((m, i) => (
                  <Text key={i} style={styles.metaText}>{m}</Text>
                ))}
                <Text style={[styles.metaText, { color: option.effectColor }]}>
                  {option.effect}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
          
          {/* Cancel */}
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>취소</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: theme.bg2,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '85%',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: theme.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 28,
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.text,
  },
  subtitle: {
    fontSize: 13,
    color: theme.text2,
    marginTop: 6,
  },
  question: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 12,
  },
  option: {
    backgroundColor: theme.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
    marginBottom: 8,
  },
  optionRecommended: {
    backgroundColor: `${theme.accent}10`,
    borderColor: theme.accent,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  optionName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
  },
  recommendBadge: {
    backgroundColor: theme.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  recommendText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#000',
  },
  optionDesc: {
    fontSize: 12,
    color: theme.text2,
    marginBottom: 8,
  },
  optionMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaText: {
    fontSize: 11,
    color: theme.text3,
  },
  cancelBtn: {
    backgroundColor: theme.bg3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelText: {
    fontSize: 14,
    color: theme.text,
  },
});
