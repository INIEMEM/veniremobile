import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import api from '../../utils/axiosInstance';

const { width } = Dimensions.get('window');

const BANKS = [
  'Access Bank', 'Citibank', 'Ecobank', 'Fidelity Bank', 'First Bank',
  'First City Monument Bank (FCMB)', 'Globus Bank', 'Guaranty Trust Bank (GTB)',
  'Heritage Bank', 'Keystone Bank', 'Polaris Bank', 'Providus Bank',
  'Stanbic IBTC Bank', 'Standard Chartered Bank', 'Sterling Bank', 'SunTrust Bank',
  'Union Bank', 'United Bank for Africa (UBA)', 'Unity Bank', 'Wema Bank',
  'Zenith Bank', 'Opay', 'Kuda Bank', 'PalmPay', 'Moniepoint',
];

export default function VendorWalletScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showBankPicker, setShowBankPicker] = useState(false);

  // Wallet data
  const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);

  // Withdrawal form
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [pin, setPin] = useState('');

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      // Fetch balance from dashboard
      const dashRes = await api.get('/vendor/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (dashRes.data?.success && dashRes.data?.data) {
        setWalletBalance(dashRes.data.data.totalRevenue || 0);
      }

      // Fetch withdrawal history
      const txRes = await api.get('/withdrawal', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (txRes.data?.success && txRes.data?.data?.data) {
        setTransactions(txRes.data.data.data || []);
      }
    } catch (err) {
      console.log('Wallet fetch error:', err?.response?.data || err?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    const withdrawAmount = parseFloat(amount);
    if (!amount || isNaN(withdrawAmount) || withdrawAmount <= 0) {
      Toast.show({ type: 'error', text1: 'Invalid Amount', text2: 'Please enter a valid amount.' });
      return;
    }
    if (withdrawAmount > walletBalance) {
      Toast.show({ type: 'error', text1: 'Insufficient Balance', text2: `Your balance is ₦${walletBalance.toLocaleString()}` });
      return;
    }
    if (!bankName) {
      Toast.show({ type: 'error', text1: 'Select a Bank', text2: 'Please choose your bank.' });
      return;
    }
    if (!accountNumber || accountNumber.length < 10) {
      Toast.show({ type: 'error', text1: 'Invalid Account', text2: 'Please enter a valid 10-digit account number.' });
      return;
    }
    if (!accountName.trim()) {
      Toast.show({ type: 'error', text1: 'Account Name Required', text2: 'Please enter the account holder name.' });
      return;
    }
    if (!pin || pin.length < 4) {
      Toast.show({ type: 'error', text1: 'PIN Required', text2: 'Please enter your 4-digit PIN.' });
      return;
    }

    Alert.alert(
      'Confirm Withdrawal',
      `Withdraw ₦${withdrawAmount.toLocaleString()} to\n${accountName}\n${bankName} — ${accountNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Withdraw', style: 'default', onPress: confirmWithdraw },
      ]
    );
  };

  const confirmWithdraw = async () => {
    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem('token');
      await api.post(
        '/withdrawal/request',
        {
          amount: withdrawAmount,
          network: "bank",
          data: {
            bankName,
            AccountNumber: accountNumber,
            AccountName: accountName.trim(),
          },
          pin: pin
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Toast.show({ type: 'success', text1: 'Withdrawal Requested! 🎉', text2: 'Funds will be settled within 24–48 business hours.' });
      setAmount('');
      setBankName('');
      setAccountNumber('');
      setAccountName('');
      setPin('');
      fetchWalletData();
    } catch (err) {
      console.log('Withdrawal error:', err?.response?.data || err?.message);
      Toast.show({
        type: 'error',
        text1: 'Withdrawal Failed',
        text2: err?.response?.data?.message || err?.response?.data?.error || 'Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#5A31F4" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Wallet & Withdrawals</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* Balance Card */}
          <View style={styles.balanceCard}>
            <View style={styles.balanceTop}>
              <View style={styles.balanceIconBox}>
                <Ionicons name="wallet" size={24} color="#FFF" />
              </View>
              <Text style={styles.balanceLabel}>Available Balance</Text>
            </View>
            <Text style={styles.balanceAmount}>₦{walletBalance.toLocaleString()}</Text>
            <Text style={styles.balanceNote}>Earnings from completed bookings</Text>
          </View>

          {/* Withdraw Form */}
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Request Withdrawal</Text>

            {/* Amount */}
            <Text style={styles.label}>Amount (₦)</Text>
            <View style={styles.inputRow}>
              <Text style={styles.prefix}>₦</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor="#BBB"
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
              />
            </View>
            <View style={styles.quickAmounts}>
              {['5000', '10000', '25000', '50000'].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[styles.quickBtn, amount === val && styles.quickBtnActive]}
                  onPress={() => setAmount(val)}
                >
                  <Text style={[styles.quickBtnText, amount === val && styles.quickBtnTextActive]}>
                    ₦{parseInt(val).toLocaleString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Bank */}
            <Text style={styles.label}>Bank</Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowBankPicker(true)}>
              <Text style={[styles.pickerText, !bankName && { color: '#BBB' }]}>
                {bankName || 'Select your bank'}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#999" />
            </TouchableOpacity>

            {/* Account Number */}
            <Text style={styles.label}>Account Number</Text>
            <TextInput
              style={styles.input}
              placeholder="0123456789"
              placeholderTextColor="#BBB"
              keyboardType="number-pad"
              maxLength={10}
              value={accountNumber}
              onChangeText={setAccountNumber}
            />

            {/* Account Name */}
            <Text style={styles.label}>Account Name</Text>
            <TextInput
              style={styles.input}
              placeholder="John Doe"
              placeholderTextColor="#BBB"
              autoCapitalize="words"
              value={accountName}
              onChangeText={setAccountName}
            />

            {/* PIN */}
            <Text style={styles.label}>Transaction PIN</Text>
            <TextInput
              style={styles.input}
              placeholder="****"
              placeholderTextColor="#BBB"
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              value={pin}
              onChangeText={setPin}
            />

            <TouchableOpacity
              style={[styles.withdrawBtn, submitting && { opacity: 0.7 }]}
              onPress={handleWithdraw}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="cash-outline" size={20} color="#FFF" />
                  <Text style={styles.withdrawBtnText}>Request Withdrawal</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Transaction History */}
          <View style={styles.txSection}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            {transactions.length === 0 ? (
              <View style={styles.emptyTx}>
                <Ionicons name="receipt-outline" size={40} color="#DDD" />
                <Text style={styles.emptyTxText}>No transactions yet</Text>
              </View>
            ) : (
              transactions.map((tx, i) => {
                const isCredit = tx.amount > 0;
                return (
                  <View key={i} style={styles.txCard}>
                    <View style={[styles.txIcon, { backgroundColor: isCredit ? '#E6F9F0' : '#FEE2E2' }]}>
                      <Ionicons
                        name={isCredit ? 'arrow-down' : 'arrow-up'}
                        size={18}
                        color={isCredit ? '#2ECC71' : '#EF4444'}
                      />
                    </View>
                    <View style={styles.txInfo}>
                      <Text style={styles.txTitle}>
                        {tx.description || (isCredit ? 'Earning' : `Withdrawal (${tx.status || 'pending'})`)}
                      </Text>
                      <Text style={styles.txDate}>
                        {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                      </Text>
                    </View>
                    <Text style={[styles.txAmount, { color: isCredit ? '#2ECC71' : '#EF4444' }]}>
                      {isCredit ? '+' : '-'}₦{Math.abs(tx.amount || 0).toLocaleString()}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>

        {/* Bank Picker Modal */}
        <Modal
          visible={showBankPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowBankPicker(false)}
        >
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerSheet}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Select Bank</Text>
                <TouchableOpacity onPress={() => setShowBankPicker(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              <ScrollView>
                {BANKS.map((bank) => (
                  <TouchableOpacity
                    key={bank}
                    style={[styles.bankItem, bankName === bank && styles.bankItemActive]}
                    onPress={() => { setBankName(bank); setShowBankPicker(false); }}
                  >
                    <Text style={[styles.bankItemText, bankName === bank && styles.bankItemTextActive]}>{bank}</Text>
                    {bankName === bank && <Ionicons name="checkmark" size={18} color="#5A31F4" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F6FF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 17, color: '#111827' },

  scroll: { padding: 20, paddingBottom: 60 },

  // Balance Card
  balanceCard: {
    backgroundColor: '#5A31F4',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
  },
  balanceTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  balanceIconBox: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  balanceLabel: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  balanceAmount: { fontFamily: 'Poppins_700Bold', fontSize: 36, color: '#FFF', marginBottom: 4 },
  balanceNote: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.65)' },

  // Form
  formCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  sectionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#111827', marginBottom: 16 },
  label: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: '#6B7280', marginBottom: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 12, paddingHorizontal: 14,
    backgroundColor: '#F9FAFB', marginBottom: 12,
  },
  prefix: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, color: '#5A31F4', marginRight: 6 },
  amountInput: {
    flex: 1, fontFamily: 'Poppins_600SemiBold',
    fontSize: 24, color: '#111827',
    paddingVertical: 12,
  },
  quickAmounts: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  quickBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    backgroundColor: '#F3F4F6', alignItems: 'center',
  },
  quickBtnActive: { backgroundColor: '#5A31F4' },
  quickBtnText: { fontFamily: 'Poppins_500Medium', fontSize: 11, color: '#6B7280' },
  quickBtnTextActive: { color: '#FFF' },
  input: {
    borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: 'Poppins_400Regular', fontSize: 14, color: '#111827',
    backgroundColor: '#F9FAFB', marginBottom: 16,
  },
  pickerBtn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
    backgroundColor: '#F9FAFB', marginBottom: 16,
  },
  pickerText: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: '#111827' },
  withdrawBtn: {
    backgroundColor: '#5A31F4',
    borderRadius: 14, paddingVertical: 16,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10,
    marginTop: 4,
  },
  withdrawBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#FFF' },

  // Transactions
  txSection: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 24 },
  emptyTx: { alignItems: 'center', paddingVertical: 28 },
  emptyTxText: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: '#9CA3AF', marginTop: 10 },
  txCard: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  txIcon: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  txInfo: { flex: 1 },
  txTitle: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: '#111827' },
  txDate: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  txAmount: { fontFamily: 'Poppins_700Bold', fontSize: 15 },

  // Bank Picker Modal
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  pickerSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  pickerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 18,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  pickerTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#111827' },
  bankItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#F9FAFB',
  },
  bankItemActive: { backgroundColor: '#F3EDFF' },
  bankItemText: { fontFamily: 'Poppins_400Regular', fontSize: 15, color: '#374151' },
  bankItemTextActive: { fontFamily: 'Poppins_600SemiBold', color: '#5A31F4' },
});
