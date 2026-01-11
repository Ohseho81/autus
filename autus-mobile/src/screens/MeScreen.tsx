/**
 * AUTUS Mobile - Me Screen (Human Domain)
 */

import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Pressable,
} from 'react-native';
import { useAutusStore } from '../stores/autusStore';
import { theme } from '../constants/theme';
import { Toast } from '../components';
import { success } from '../services/haptics';

export const MeScreen: React.FC = () => {
  const { nodes, settings, updateSettings, toggleNode } = useAutusStore();
  const [toast, setToast] = useState<string | null>(null);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showNodesModal, setShowNodesModal] = useState(false);
  const [goalText, setGoalText] = useState(settings.goal);
  const [goalMonths, setGoalMonths] = useState(String(settings.goalMonths));
  
  const activeNodes = useMemo(() => {
    return Object.values(nodes).filter(n => n.active);
  }, [nodes]);
  
  const handleSaveGoal = () => {
    updateSettings({ 
      goal: goalText, 
      goalMonths: parseInt(goalMonths) || 12 
    });
    success();
    setShowGoalModal(false);
    setToast('목표가 저장되었습니다');
  };
  
  const handleSaveNodes = () => {
    success();
    setShowNodesModal(false);
    setToast('노드가 저장되었습니다');
  };
  
  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        {/* Goal */}
        <View style={styles.domain}>
          <Text style={styles.domainTitle}>🎯 목표</Text>
          <View style={styles.domainCard}>
            <Text style={styles.goalText}>{settings.goal}</Text>
            <Text style={styles.goalMonths}>{settings.goalMonths}개월</Text>
            <TouchableOpacity 
              style={styles.editBtn}
              onPress={() => setShowGoalModal(true)}
            >
              <Text style={styles.editBtnText}>목표 수정</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Active Nodes */}
        <View style={styles.domain}>
          <Text style={styles.domainTitle}>📦 활성 노드 ({activeNodes.length}/36)</Text>
          <View style={styles.domainCard}>
            <View style={styles.tags}>
              {activeNodes.map((node) => (
                <View key={node.id} style={styles.tag}>
                  <Text style={styles.tagText}>{node.icon} {node.name}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity 
              style={styles.editBtn}
              onPress={() => setShowNodesModal(true)}
            >
              <Text style={styles.editBtnText}>노드 편집</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Identity */}
        <View style={styles.domain}>
          <Text style={styles.domainTitle}>🎭 정체성</Text>
          <TouchableOpacity 
            style={styles.domainCard}
            onPress={() => setToast('정체성 편집 (개발 예정)')}
          >
            <Text style={styles.identityText}>
              나는 <Text style={styles.highlight}>{settings.identity.stage} {settings.identity.type}</Text>입니다
            </Text>
            <View style={styles.tags}>
              <View style={styles.tag}>
                <Text style={styles.tagText}>유형: {settings.identity.type}</Text>
              </View>
              <View style={styles.tag}>
                <Text style={styles.tagText}>단계: {settings.identity.stage}</Text>
              </View>
              <View style={styles.tag}>
                <Text style={styles.tagText}>산업: {settings.identity.industry}</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
        
        {/* Values */}
        <View style={styles.domain}>
          <Text style={styles.domainTitle}>💎 가치 우선순위</Text>
          <TouchableOpacity 
            style={styles.domainCard}
            onPress={() => setToast('가치 편집 (개발 예정)')}
          >
            <View style={styles.tags}>
              {settings.values.map((value, index) => (
                <View key={value} style={styles.tag}>
                  <View style={styles.tagNum}>
                    <Text style={styles.tagNumText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.tagText}>{value}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        </View>
        
        {/* Boundaries */}
        <View style={styles.domain}>
          <Text style={styles.domainTitle}>🚫 경계</Text>
          <TouchableOpacity 
            style={styles.domainCard}
            onPress={() => setToast('경계 편집 (개발 예정)')}
          >
            <Text style={styles.boundaryLabel}>절대 안 함</Text>
            {settings.boundaries.never.map((item) => (
              <Text key={item} style={styles.boundaryItem}>⛔ {item}</Text>
            ))}
            <Text style={[styles.boundaryLabel, styles.limitsLabel]}>한계선</Text>
            {settings.boundaries.limits.map((item) => (
              <Text key={item} style={styles.boundaryItem}>📊 {item}</Text>
            ))}
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      {/* Goal Edit Modal */}
      <Modal
        visible={showGoalModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGoalModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowGoalModal(false)}
        >
          <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>목표 수정</Text>
            
            <Text style={styles.inputLabel}>주요 목표</Text>
            <TextInput
              style={styles.input}
              value={goalText}
              onChangeText={setGoalText}
              placeholder="목표를 입력하세요"
              placeholderTextColor={theme.text3}
            />
            
            <Text style={styles.inputLabel}>기간 (개월)</Text>
            <TextInput
              style={styles.input}
              value={goalMonths}
              onChangeText={setGoalMonths}
              keyboardType="number-pad"
              placeholder="12"
              placeholderTextColor={theme.text3}
            />
            
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveGoal}>
              <Text style={styles.saveBtnText}>저장</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.cancelBtn}
              onPress={() => setShowGoalModal(false)}
            >
              <Text style={styles.cancelBtnText}>취소</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
      
      {/* Nodes Edit Modal */}
      <Modal
        visible={showNodesModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNodesModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowNodesModal(false)}
        >
          <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>활성 노드 선택 (36개)</Text>
            
            <ScrollView style={styles.nodesList}>
              {Object.values(nodes).map((node) => (
                <TouchableOpacity
                  key={node.id}
                  style={styles.nodeItem}
                  onPress={() => toggleNode(node.id)}
                >
                  <View style={[
                    styles.checkbox,
                    node.active && styles.checkboxActive
                  ]}>
                    {node.active && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.nodeIcon}>{node.icon}</Text>
                  <Text style={styles.nodeName}>{node.name}</Text>
                  <Text style={styles.nodeLayer}>{node.layer}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveNodes}>
              <Text style={styles.saveBtnText}>저장</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.cancelBtn}
              onPress={() => setShowNodesModal(false)}
            >
              <Text style={styles.cancelBtnText}>취소</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
      
      {/* Toast */}
      <Toast
        message={toast || ''}
        visible={!!toast}
        onHide={() => setToast(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 15,
    paddingBottom: 30,
  },
  domain: {
    marginBottom: 20,
  },
  domainTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 10,
  },
  domainCard: {
    backgroundColor: theme.bg2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
  },
  goalText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.accent,
    marginBottom: 4,
  },
  goalMonths: {
    fontSize: 12,
    color: theme.text3,
    marginBottom: 10,
  },
  editBtn: {
    backgroundColor: theme.bg3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 10,
    alignItems: 'center',
  },
  editBtnText: {
    color: theme.text,
    fontSize: 13,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.bg3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
  },
  tagText: {
    fontSize: 12,
    color: theme.text,
  },
  tagNum: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  tagNumText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#000',
  },
  identityText: {
    fontSize: 14,
    color: theme.text,
    marginBottom: 10,
  },
  highlight: {
    color: theme.accent,
    fontWeight: '600',
  },
  boundaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.danger,
    marginBottom: 8,
  },
  limitsLabel: {
    color: theme.warning,
    marginTop: 12,
  },
  boundaryItem: {
    fontSize: 13,
    color: theme.text,
    paddingVertical: 4,
  },
  modalOverlay: {
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
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: theme.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    color: theme.text3,
    marginBottom: 6,
  },
  input: {
    backgroundColor: theme.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
    color: theme.text,
    fontSize: 14,
    marginBottom: 16,
  },
  saveBtn: {
    backgroundColor: theme.accent,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 14,
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
  cancelBtnText: {
    color: theme.text,
    fontSize: 14,
  },
  nodesList: {
    maxHeight: 350,
    marginBottom: 16,
  },
  nodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: theme.border,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: theme.accent,
    borderColor: theme.accent,
  },
  checkmark: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
  nodeIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  nodeName: {
    flex: 1,
    fontSize: 14,
    color: theme.text,
  },
  nodeLayer: {
    fontSize: 12,
    color: theme.text3,
  },
});
