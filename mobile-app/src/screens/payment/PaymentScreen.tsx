/**
 * PaymentScreen.tsx
 * 학부모용 수납/결제 화면
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  RefreshControl, Alert, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { generatePaymentUrl } from '../../lib/payment';

const THEME = {
  background: '#0D1117', surface: '#161B22',
  primary: '#FF6B35', primaryLight: '#FF8C42',
  success: '#2ED573', error: '#FF6B6B',
  warning: '#FFB347', kakaoPay: '#FFE812',
  text: '#FFFFFF', textSecondary: 'rgba(255,255,255,0.6)',
  border: 'rgba(255,255,255,0.08)',
};

const PaymentScreen: React.FC = () => {
  const navigation = useNavigation();
  const [currentPayment, setCurrentPayment] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const studentId = 'current-student-id';

  const loadData = useCallback(async () => {
    const { data: payment } = await supabase
      .from('student_payments').select('*')
      .eq('student_id', studentId).order('created_at', { ascending: false }).limit(1).single();
    setCurrentPayment(payment);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handlePayment = async () => {
    if (!currentPayment) return;
    setProcessing(true);
    try {
      const url = generatePaymentUrl({
        studentId, paymentId: currentPayment.id, amount: currentPayment.amount,
        packageName: currentPayment.package_name, paymentMethod: 'EASY_PAY', easyPayProvider: 'KAKAOPAY',
      });
      await Linking.openURL(url);
    } catch (e: any) { Alert.alert('결제 오류', e.message); }
    finally { setProcessing(false); }
  };

  const isPaid = currentPayment?.paid;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={THEME.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>레슨 수납</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor={THEME.primary} />}>
        {isPaid ? (
          <LinearGradient colors={[THEME.primary, THEME.primaryLight]} style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>잔여 레슨</Text>
            <Text style={styles.balanceAmount}>{currentPayment?.remaining_lessons}회</Text>
            <TouchableOpacity style={styles.qrButton} onPress={() => navigation.navigate('MyQRCode' as never)}>
              <Ionicons name="qr-code" size={20} color={THEME.primary} />
              <Text style={styles.qrButtonText}>출석 QR 보기</Text>
            </TouchableOpacity>
          </LinearGradient>
        ) : (
          <View style={styles.unpaidCard}>
            <Text style={styles.unpaidAmount}>{currentPayment?.amount?.toLocaleString()}원</Text>
            <View style={styles.qrBlocked}>
              <Ionicons name="lock-closed" size={16} color={THEME.error} />
              <Text style={styles.qrBlockedText}>출석 QR 비활성</Text>
            </View>
            <TouchableOpacity style={styles.payButton} onPress={handlePayment} disabled={processing}>
              <Text style={styles.payButtonText}>{processing ? '처리 중...' : '카카오페이 결제'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: THEME.text },
  balanceCard: { margin: 16, borderRadius: 24, padding: 24, alignItems: 'center' },
  balanceLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  balanceAmount: { fontSize: 48, fontWeight: '800', color: THEME.text, marginVertical: 8 },
  qrButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', padding: 14, borderRadius: 14, marginTop: 16 },
  qrButtonText: { fontSize: 16, fontWeight: '700', color: THEME.primary },
  unpaidCard: { margin: 16, backgroundColor: 'rgba(255,107,107,0.1)', borderWidth: 2, borderColor: THEME.error, borderRadius: 24, padding: 24, alignItems: 'center' },
  unpaidAmount: { fontSize: 32, fontWeight: '800', color: THEME.error },
  qrBlocked: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 16 },
  qrBlockedText: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  payButton: { backgroundColor: THEME.kakaoPay, padding: 16, borderRadius: 14, width: '100%', alignItems: 'center' },
  payButtonText: { fontSize: 16, fontWeight: '700', color: '#3C1E1E' },
});

export default PaymentScreen;
