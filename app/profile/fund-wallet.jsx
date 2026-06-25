import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import * as WebBrowser from 'expo-web-browser';
import api from '../../utils/axiosInstance';

export default function FundWalletScreen() {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFundWallet = async () => {
    const fundAmount = parseFloat(amount);
    if (!fundAmount || isNaN(fundAmount) || fundAmount <= 0) {
      Toast.show({ type: 'error', text1: 'Invalid Amount', text2: 'Please enter a valid amount to deposit.' });
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      
      // 1. Initialize Payment
      const initPayload = {
        amount: fundAmount.toString(),
        method: "paystack",
        description: "Deposit to fund wallet",
        category: "deposit"
      };

      const initRes = await api.post('/payment/initialize', initPayload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!initRes.data?.success) {
        throw new Error("Failed to initialize payment.");
      }

      const responseData = initRes.data;
      
      let authUrl, ref;
      if (responseData?.data?.data?.data?.authorization_url) {
        authUrl = responseData.data.data.data.authorization_url;
        ref = responseData.data.data.data.reference;
      } else if (responseData?.data?.data?.authorization_url) {
        authUrl = responseData.data.data.authorization_url;
        ref = responseData.data.data.reference;
      } else if (responseData?.data?.authorization_url) {
        authUrl = responseData.data.authorization_url;
        ref = responseData.data.reference;
      } else if (responseData?.authorization_url) {
        authUrl = responseData.authorization_url;
        ref = responseData.reference;
      }

      if (!authUrl) {
        throw new Error("Could not extract authorization URL from response.");
      }

      // 2. Open Paystack Checkout
      const result = await WebBrowser.openBrowserAsync(authUrl);

      // 3. Verify Payment after browser is closed or redirects
      // Even if user cancels, we hit verify to check the actual status on Paystack
      setLoading(true);
      
      const verifyRes = await api.get('/payment/verify', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          method: "paystack",
          reference: ref
        }
      });

      const vData = verifyRes.data;
      const status = vData?.data?.data?.status || vData?.data?.status || vData?.status;

      if ((vData?.success || vData?.data?.success) && status === 'success') {
        Toast.show({ type: 'success', text1: 'Success', text2: 'Wallet funded successfully!' });
        router.back();
      } else {
        Toast.show({ type: 'info', text1: 'Payment Unsuccessful', text2: 'Your payment was not completed or failed.' });
      }

    } catch (err) {
      console.log('Funding error:', err?.response?.data || err?.message);
      Toast.show({
        type: 'error',
        text1: 'Funding Failed',
        text2: err?.response?.data?.message || err.message || 'An error occurred during payment.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Fund Wallet</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <View style={styles.iconContainer}>
              <Ionicons name="wallet" size={32} color="#2ECC71" />
            </View>
            <Text style={styles.title}>Top up your balance</Text>
            <Text style={styles.description}>Enter the amount you wish to deposit to your wallet via Paystack.</Text>

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
                autoFocus
              />
            </View>

            <View style={styles.quickAmounts}>
              {['1000', '5000', '10000', '20000'].map((val) => (
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

            <TouchableOpacity
              style={[styles.payBtn, loading && { opacity: 0.7 }]}
              onPress={handleFundWallet}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="card-outline" size={20} color="#FFF" />
                  <Text style={styles.payBtnText}>Pay with Paystack</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7' },
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
  content: {
    padding: 20,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    alignItems: 'center'
  },
  iconContainer: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#E6F9F0',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontFamily: 'Poppins_600SemiBold', fontSize: 20, color: '#111827', marginBottom: 6 },
  description: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 30 },
  label: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: '#6B7280', alignSelf: 'flex-start', marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 16, paddingHorizontal: 16,
    backgroundColor: '#F9FAFB', marginBottom: 20,
    width: '100%'
  },
  prefix: { fontFamily: 'Poppins_600SemiBold', fontSize: 20, color: '#2ECC71', marginRight: 10 },
  amountInput: {
    flex: 1, fontFamily: 'Poppins_600SemiBold',
    fontSize: 28, color: '#111827',
    paddingVertical: 16,
  },
  quickAmounts: { flexDirection: 'row', gap: 8, marginBottom: 30, width: '100%' },
  quickBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#F3F4F6', alignItems: 'center',
  },
  quickBtnActive: { backgroundColor: '#2ECC71' },
  quickBtnText: { fontFamily: 'Poppins_500Medium', fontSize: 12, color: '#6B7280' },
  quickBtnTextActive: { color: '#FFF' },
  payBtn: {
    backgroundColor: '#111827',
    borderRadius: 16, paddingVertical: 18,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10,
    width: '100%'
  },
  payBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#FFF' },
});
