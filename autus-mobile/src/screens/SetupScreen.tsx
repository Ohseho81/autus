/**
 * AUTUS Mobile - Setup Screen
 */

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAutusStore } from '../stores/autusStore';
import { theme } from '../constants/theme';
import { SetupItem, Toast } from '../components';
import { success, warning } from '../services/haptics';

export const SetupScreen: React.FC = () => {
  const { 
    connectors, 
    devices, 
    webServices,
    settings,
    team,
    toggleConnector,
    toggleDevice,
    toggleWebService,
    connectAllWebServices,
    resetAll,
  } = useAutusStore();
  
  const [toast, setToast] = useState<string | null>(null);
  
  const handleDeviceToggle = (id: string) => {
    toggleDevice(id);
    const device = devices.find(d => d.id === id);
    setToast(device?.on ? `${device.name} 권한 해제됨` : `${device?.name} 권한 허용됨!`);
  };
  
  const handleWebServiceToggle = (id: string) => {
    toggleWebService(id);
    const service = webServices.find(w => w.id === id);
    setToast(service?.on ? `${service.name} 연결 해제됨` : `${service?.name} 연결됨!`);
  };
  
  const handleConnectAll = () => {
    connectAllWebServices();
    success();
    setToast('🎉 모든 웹 서비스가 연결되었습니다!');
  };
  
  const handleReset = () => {
    Alert.alert(
      '데이터 초기화',
      '모든 데이터가 삭제됩니다. 계속하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '초기화', 
          style: 'destructive',
          onPress: async () => {
            await resetAll();
            warning();
            setToast('모든 데이터가 초기화되었습니다');
          },
        },
      ]
    );
  };
  
  const autoLevelLabels = ['L0: 알림만', 'L1: 옵션 제시', 'L2: 추천', 'L3: 승인 후 실행', 'L4: 자동 실행'];
  
  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        {/* Devices */}
        <Text style={styles.sectionTitle}>📷 디바이스 권한</Text>
        {devices.map((device) => (
          <SetupItem
            key={device.id}
            icon={device.icon}
            name={device.name}
            desc={device.desc}
            isOn={device.on}
            onPress={() => handleDeviceToggle(device.id)}
          />
        ))}
        
        {/* Web Services */}
        <Text style={[styles.sectionTitle, styles.sectionMargin]}>🌐 웹 서비스 연결</Text>
        
        {/* Connect All Button */}
        <TouchableOpacity 
          style={styles.connectAllCard}
          onPress={handleConnectAll}
        >
          <View style={styles.connectAllLeft}>
            <Text style={styles.connectAllTitle}>🌐 모든 서비스 한번에 연결</Text>
            <Text style={styles.connectAllDesc}>GPT Atlas 방식 - 한 번의 동의로 모든 권한</Text>
          </View>
          <View style={styles.connectAllBtn}>
            <Text style={styles.connectAllBtnText}>전체 연결</Text>
          </View>
        </TouchableOpacity>
        
        {webServices.map((service) => (
          <SetupItem
            key={service.id}
            icon={service.icon}
            name={service.name}
            desc={service.desc}
            isOn={service.on}
            onPress={() => handleWebServiceToggle(service.id)}
          />
        ))}
        
        {/* Connectors */}
        <Text style={[styles.sectionTitle, styles.sectionMargin]}>🔗 데이터 연결</Text>
        {connectors.map((connector) => (
          <SetupItem
            key={connector.id}
            icon={connector.icon}
            name={connector.name}
            desc={connector.desc}
            isOn={connector.on}
            onPress={() => {
              toggleConnector(connector.id);
              setToast(connector.on ? `${connector.name} 연결 해제됨` : `${connector.name} 연결됨`);
            }}
          />
        ))}
        
        {/* Team */}
        <Text style={[styles.sectionTitle, styles.sectionMargin]}>👥 팀원</Text>
        {team.map((member) => (
          <SetupItem
            key={member.id}
            icon="👤"
            name={member.name}
            desc={member.role}
            isOn={true}
            onPress={() => setToast(`${member.name} 편집 (개발 예정)`)}
          />
        ))}
        <TouchableOpacity 
          style={styles.addBtn}
          onPress={() => setToast('팀원 추가 (개발 예정)')}
        >
          <Text style={styles.addBtnText}>+ 팀원 추가</Text>
        </TouchableOpacity>
        
        {/* Settings */}
        <Text style={[styles.sectionTitle, styles.sectionMargin]}>⚙️ 설정</Text>
        <SetupItem
          icon="🔔"
          name="일일 발화 제한"
          desc="하루 최대 알림"
          isOn={false}
          rightText={`${settings.dailyLimit}회`}
          onPress={() => setToast('일일 발화 제한 설정 (개발 예정)')}
        />
        <SetupItem
          icon="🤖"
          name="자율 수준"
          desc={autoLevelLabels[settings.autoLevel]}
          isOn={false}
          rightText={`L${settings.autoLevel}`}
          onPress={() => setToast('자율 수준 설정 (개발 예정)')}
        />
        
        {/* Reset */}
        <TouchableOpacity 
          style={styles.resetBtn}
          onPress={handleReset}
        >
          <Text style={styles.resetBtnText}>🗑️ 모든 데이터 초기화</Text>
        </TouchableOpacity>
      </ScrollView>
      
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
  sectionTitle: {
    fontSize: 13,
    color: theme.text2,
    marginBottom: 10,
  },
  sectionMargin: {
    marginTop: 20,
  },
  connectAllCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.bg2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.accent,
    padding: 12,
    marginBottom: 12,
  },
  connectAllLeft: {
    flex: 1,
  },
  connectAllTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.accent,
  },
  connectAllDesc: {
    fontSize: 11,
    color: theme.text3,
    marginTop: 2,
  },
  connectAllBtn: {
    backgroundColor: theme.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  connectAllBtnText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 13,
  },
  addBtn: {
    backgroundColor: theme.bg3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  addBtnText: {
    color: theme.text,
    fontSize: 13,
  },
  resetBtn: {
    backgroundColor: theme.bg2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.danger,
    padding: 14,
    alignItems: 'center',
    marginTop: 30,
  },
  resetBtnText: {
    color: theme.danger,
    fontSize: 14,
    fontWeight: '600',
  },
});
