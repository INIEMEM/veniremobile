import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import api from '../../utils/axiosInstance';

export default function VendorSettingsScreen() {
  const router = useRouter();

  const [loadingAction, setLoadingAction] = useState(null);

  // Forms states
  const [activeTab, setActiveTab] = useState('add'); // 'add', 'change', 'reset'

  // Add PIN state
  const [addForm, setAddForm] = useState({ password: '', pin: '' });
  
  // Change PIN state
  const [changeForm, setChangeForm] = useState({ password: '', pin: '', newPin: '' });

  // Reset PIN state
  const [resetStep, setResetStep] = useState(1); // 1: request token, 2: verify token
  const [resetForm, setResetForm] = useState({ password: '', token: '', pin: '' });

  const handleAddPin = async () => {
    if (!addForm.password || addForm.pin.length < 4) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please enter password and a 4-digit PIN.' });
      return;
    }
    setLoadingAction('add');
    try {
      const token = await AsyncStorage.getItem('token');
      await api.post('/auth/settings/add-pin', addForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Toast.show({ type: 'success', text1: 'Success', text2: 'Transaction PIN added successfully!' });
      setAddForm({ password: '', pin: '' });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error', text2: err?.response?.data?.message || err.message });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleChangePin = async () => {
    if (!changeForm.password || changeForm.pin.length < 4 || changeForm.newPin.length < 4) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please fill all fields correctly.' });
      return;
    }
    setLoadingAction('change');
    try {
      const token = await AsyncStorage.getItem('token');
      await api.post('/auth/settings/change-pin', changeForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Toast.show({ type: 'success', text1: 'Success', text2: 'Transaction PIN changed successfully!' });
      setChangeForm({ password: '', pin: '', newPin: '' });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error', text2: err?.response?.data?.message || err.message });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleInitiateReset = async () => {
    if (!resetForm.password) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please enter your password.' });
      return;
    }
    setLoadingAction('initiateReset');
    try {
      const token = await AsyncStorage.getItem('token');
      await api.post('/auth/settings/initiate-pin-reset', { password: resetForm.password }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Toast.show({ type: 'success', text1: 'OTP Sent', text2: 'Check your email for the reset token.' });
      setResetStep(2);
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error', text2: err?.response?.data?.message || err.message });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleResetPin = async () => {
    if (!resetForm.token || resetForm.pin.length < 4) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please enter token and new PIN.' });
      return;
    }
    setLoadingAction('reset');
    try {
      const token = await AsyncStorage.getItem('token');
      await api.post('/auth/settings/reset-pin', { token: resetForm.token, pin: resetForm.pin }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Toast.show({ type: 'success', text1: 'Success', text2: 'Transaction PIN reset successfully!' });
      setResetStep(1);
      setResetForm({ password: '', token: '', pin: '' });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error', text2: err?.response?.data?.message || err.message });
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Security Settings</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.tabContainer}>
          {['add', 'change', 'reset'].map((tab) => (
            <TouchableOpacity 
              key={tab} 
              style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]} 
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'add' ? 'Set PIN' : tab === 'change' ? 'Change PIN' : 'Reset PIN'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          
          {activeTab === 'add' && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Set Up Transaction PIN</Text>
              <Text style={styles.description}>Create a secure 4-digit PIN for your withdrawals.</Text>
              
              <Text style={styles.label}>Account Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter password"
                secureTextEntry
                value={addForm.password}
                onChangeText={(t) => setAddForm(prev => ({ ...prev, password: t }))}
              />

              <Text style={styles.label}>New 4-Digit PIN</Text>
              <TextInput
                style={styles.input}
                placeholder="****"
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
                value={addForm.pin}
                onChangeText={(t) => setAddForm(prev => ({ ...prev, pin: t }))}
              />

              <TouchableOpacity 
                style={[styles.submitBtn, loadingAction === 'add' && { opacity: 0.7 }]} 
                onPress={handleAddPin} 
                disabled={loadingAction === 'add'}
              >
                {loadingAction === 'add' ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Save PIN</Text>}
              </TouchableOpacity>
            </View>
          )}

          {activeTab === 'change' && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Change Transaction PIN</Text>
              
              <Text style={styles.label}>Account Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter password"
                secureTextEntry
                value={changeForm.password}
                onChangeText={(t) => setChangeForm(prev => ({ ...prev, password: t }))}
              />

              <Text style={styles.label}>Current PIN</Text>
              <TextInput
                style={styles.input}
                placeholder="****"
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
                value={changeForm.pin}
                onChangeText={(t) => setChangeForm(prev => ({ ...prev, pin: t }))}
              />

              <Text style={styles.label}>New PIN</Text>
              <TextInput
                style={styles.input}
                placeholder="****"
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
                value={changeForm.newPin}
                onChangeText={(t) => setChangeForm(prev => ({ ...prev, newPin: t }))}
              />

              <TouchableOpacity 
                style={[styles.submitBtn, loadingAction === 'change' && { opacity: 0.7 }]} 
                onPress={handleChangePin} 
                disabled={loadingAction === 'change'}
              >
                {loadingAction === 'change' ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Update PIN</Text>}
              </TouchableOpacity>
            </View>
          )}

          {activeTab === 'reset' && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Reset Transaction PIN</Text>
              
              {resetStep === 1 ? (
                <>
                  <Text style={styles.description}>We will send an OTP to your email to verify your identity.</Text>
                  
                  <Text style={styles.label}>Account Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter password"
                    secureTextEntry
                    value={resetForm.password}
                    onChangeText={(t) => setResetForm(prev => ({ ...prev, password: t }))}
                  />

                  <TouchableOpacity 
                    style={[styles.submitBtn, loadingAction === 'initiateReset' && { opacity: 0.7 }]} 
                    onPress={handleInitiateReset} 
                    disabled={loadingAction === 'initiateReset'}
                  >
                    {loadingAction === 'initiateReset' ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Send Reset OTP</Text>}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.description}>Enter the OTP sent to your email and your new PIN.</Text>
                  
                  <Text style={styles.label}>6-Digit OTP Token</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="123456"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={resetForm.token}
                    onChangeText={(t) => setResetForm(prev => ({ ...prev, token: t }))}
                  />

                  <Text style={styles.label}>New 4-Digit PIN</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="****"
                    keyboardType="number-pad"
                    maxLength={4}
                    secureTextEntry
                    value={resetForm.pin}
                    onChangeText={(t) => setResetForm(prev => ({ ...prev, pin: t }))}
                  />

                  <TouchableOpacity 
                    style={[styles.submitBtn, loadingAction === 'reset' && { opacity: 0.7 }]} 
                    onPress={handleResetPin} 
                    disabled={loadingAction === 'reset'}
                  >
                    {loadingAction === 'reset' ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Reset PIN</Text>}
                  </TouchableOpacity>
                  
                  <TouchableOpacity onPress={() => setResetStep(1)} style={{ marginTop: 16, alignItems: 'center' }}>
                    <Text style={{ fontFamily: 'Poppins_500Medium', color: '#5A31F4' }}>Didn't receive code? Resend</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F6FF' },
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
  tabContainer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 0,
    gap: 10,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
  },
  tabBtnActive: {
    backgroundColor: '#5A31F4',
  },
  tabText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#FFF',
  },
  scroll: { padding: 20, paddingBottom: 60 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  sectionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, color: '#111827', marginBottom: 8 },
  description: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: '#6B7280', marginBottom: 20 },
  label: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: '#6B7280', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
    fontFamily: 'Poppins_400Regular', fontSize: 14, color: '#111827',
    backgroundColor: '#F9FAFB', marginBottom: 16,
  },
  submitBtn: {
    backgroundColor: '#5A31F4',
    borderRadius: 14, paddingVertical: 16,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    marginTop: 10,
  },
  submitBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#FFF' },
});
