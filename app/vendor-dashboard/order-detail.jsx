import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Dimensions,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api from '../../utils/axiosInstance';

const { width } = Dimensions.get('window');

const STATUS_CONFIG = {
  pending:    { color: '#FAB843', bg: '#FFF8EC', label: 'Pending',      icon: 'time-outline' },
  accepted:   { color: '#5A31F4', bg: '#F3EDFF', label: 'Accepted',     icon: 'checkmark-circle-outline' },
  processed: { color: '#3B82F6', bg: '#EFF6FF', label: 'Processed',  icon: 'play-circle-outline' },
  delivered:  { color: '#10B981', bg: '#ECFDF5', label: 'Delivered',    icon: 'bag-check-outline' },
  completed:  { color: '#2ECC71', bg: '#E6F9F0', label: 'Completed',    icon: 'trophy-outline' },
  rejected:   { color: '#EF4444', bg: '#FEF2F2', label: 'Rejected',     icon: 'close-circle-outline' },
};

export default function VendorOrderDetail() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams();

  const [order, setOrder]         = useState(null);
  const [messages, setMessages]   = useState([]);
  const [newMsg, setNewMsg]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [sending, setSending]     = useState(false);
  const [actioning, setActioning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const scrollRef = useRef(null);
  const pollRef  = useRef(null);

  // ── Fetch order + messages ─────────────────────────────────────────────────
  const fetchOrder = useCallback(async () => {
    try {
      const res = await api.get(`/vendor/order/${orderId}`);

      console.log('order', res.data.data);
      if (res.data?.success) setOrder(res.data.data);
    } catch (e) {
      console.log('fetch order error', e?.response?.data || e?.message);
    }
  }, [orderId]);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.get(`/vendor/user-orders/${orderId}/messages`);
      if (res.data?.success) setMessages(res.data.data || []);
    } catch (e) {
      console.log('fetch messages error', e?.response?.data || e?.message);
    }
  }, [orderId]);

  const loadAll = useCallback(async () => {
    await Promise.all([fetchOrder(), fetchMessages()]);
    setLoading(false);
    setRefreshing(false);
  }, [fetchOrder, fetchMessages]);

  useEffect(() => {
    loadAll();
    // Poll messages every 8 seconds
    pollRef.current = setInterval(fetchMessages, 8000);
    return () => clearInterval(pollRef.current);
  }, [loadAll, fetchMessages]);

  // ── Send message ───────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = newMsg.trim();
    if (!text || sending) return;
    setSending(true);
    setNewMsg('');
    try {
      const res = await api.post(`/vendor/user-orders/${orderId}/messages`, { message: text });
      if (res.data?.success) {
        setMessages((prev) => [...prev, res.data.data]);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (e) {
      setNewMsg(text); // restore on fail
      console.log('send message error', e?.response?.data || e?.message);
    } finally {
      setSending(false);
    }
  };

  // ── Order lifecycle actions ────────────────────────────────────────────────
  const doAction = async (endpoint, confirmMsg) => {
    if (confirmMsg) {
      const confirmed = await new Promise((res) =>
        Alert.alert('Confirm', confirmMsg, [
          { text: 'Cancel', style: 'cancel', onPress: () => res(false) },
          { text: 'Yes', style: 'destructive', onPress: () => res(true) },
        ])
      );
      if (!confirmed) return;
    }
    setActioning(true);
    try {
      await api.put(endpoint);
      await fetchOrder();
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || 'Action failed. Please try again.');
    } finally {
      setActioning(false);
    }
  };

  const handleAccept  = () => doAction(`/vendor/orders/${orderId}/accept`);
  const handleReject  = () => doAction(`/vendor/orders/${orderId}/reject`, 'Are you sure you want to reject this order?');
  const handleStart   = () => doAction(`/vendor/orders/${orderId}/process`);
  const handleDeliver = () => doAction(`/vendor/orders/${orderId}/deliver`);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#5A31F4" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Order not found.</Text>
      </View>
    );
  }

  const status = order.status || 'pending';
  const sc     = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const organizer = order.organizer || {};
  const event     = order.event     || {};

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#F8F6FF' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Order Detail</Text>
        <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
          <Ionicons name={sc.icon} size={12} color={sc.color} />
          <Text style={[styles.statusText, { color: sc.color }]}>{sc.label}</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAll(); }} tintColor="#5A31F4" />}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >

        {/* Order Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📋 Order Info</Text>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={14} color="#888" />
            <Text style={styles.infoLabel}>Client</Text>
            <Text style={styles.infoValue}>{organizer.firstname} {organizer.lastname}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={14} color="#888" />
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{organizer.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={14} color="#888" />
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{organizer.phone}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={14} color="#888" />
            <Text style={styles.infoLabel}>Event</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{event.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={14} color="#888" />
            <Text style={styles.infoLabel}>Venue</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{event.address}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={14} color="#888" />
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoValue}>{fmtDate(event.start)} {fmtTime(event.start)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Ionicons name="cash-outline" size={14} color="#5A31F4" />
            <Text style={styles.infoLabel}>Amount</Text>
            <Text style={[styles.infoValue, { color: '#5A31F4', fontFamily: 'Poppins_700Bold' }]}>
              ₦{(order.amount || 0).toLocaleString()} {order.currency}
            </Text>
          </View>
          {order.message ? (
            <View style={styles.messageBox}>
              <Text style={styles.messageBoxLabel}>Client's Message</Text>
              <Text style={styles.messageBoxText}>"{order.message}"</Text>
            </View>
          ) : null}
        </View>

        {/* Action Buttons */}
        {actioning && (
          <ActivityIndicator color="#5A31F4" style={{ marginVertical: 8 }} />
        )}
        {!actioning && status === 'pending' && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={handleReject}>
              <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
              <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.acceptBtn]} onPress={handleAccept}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" />
              <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Accept Order</Text>
            </TouchableOpacity>
          </View>
        )}
        {!actioning && status === 'accepted' && (
          <TouchableOpacity style={[styles.actionBtn, styles.startBtn, { marginHorizontal: 0 }]} onPress={handleStart}>
            <Ionicons name="play-circle-outline" size={18} color="#FFF" />
            <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Complete Order</Text>
          </TouchableOpacity>
        )}
        {!actioning && status === 'processed' && (
          <TouchableOpacity style={[styles.actionBtn, styles.deliverBtn, { marginHorizontal: 0 }]} onPress={handleDeliver}>
            <Ionicons name="bag-check-outline" size={18} color="#FFF" />
            <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Mark as Delivered</Text>
          </TouchableOpacity>
        )}
        {status === 'delivered' && (
          <View style={styles.waitingBanner}>
            <Ionicons name="hourglass-outline" size={18} color="#10B981" />
            <Text style={styles.waitingText}>Waiting for the client to confirm completion</Text>
          </View>
        )}
        {status === 'completed' && (
          <View style={[styles.waitingBanner, { backgroundColor: '#E6F9F0' }]}>
            <Ionicons name="trophy-outline" size={18} color="#2ECC71" />
            <Text style={[styles.waitingText, { color: '#2ECC71' }]}>Job completed! Payment has been released.</Text>
          </View>
        )}

        {/* Chat with Client — navigates to full-screen chat */}
        <TouchableOpacity
          style={styles.chatCard}
          activeOpacity={0.85}
          onPress={() =>
            router.push({
              pathname: '/vendor-dashboard/order-chat',
              params: {
                orderId,
                clientName: `${organizer.firstname || ''} ${organizer.lastname || ''}`.trim() || 'Client',
                clientAvatar: organizer.profile_picture || '',
              },
            })
          }
        >
          <View style={styles.chatCardLeft}>
            <View style={styles.chatIconWrap}>
              <Ionicons name="chatbubbles-outline" size={22} color="#5A31F4" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.chatCardTitle}>💬 Chat with Client</Text>
              <Text style={styles.chatCardSub}>
                {messages.length > 0
                  ? `${messages.length} message${messages.length > 1 ? 's' : ''} · Tap to open`
                  : 'Negotiate details before accepting'}
              </Text>
              {messages.length > 0 && (
                <Text style={styles.chatCardPreview} numberOfLines={1}>
                  {messages[messages.length - 1]?.message}
                </Text>
              )}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#5A31F4" />
        </TouchableOpacity>
      </ScrollView>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F6FF' },
  emptyText: { fontFamily: 'Poppins_400Regular', color: '#888', fontSize: 14 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 58 : 40,
    paddingBottom: 14,
    backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F3EDFF', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontFamily: 'Poppins_700Bold', fontSize: 17, color: '#1A1A1A' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11 },

  scrollContent: { padding: 16, paddingBottom: 40, gap: 14 },

  card: { backgroundColor: '#FFF', borderRadius: 18, padding: 18, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: '#1A1A1A', marginBottom: 14 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  infoLabel: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: '#888', width: 50 },
  infoValue: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: '#1A1A1A', flex: 1 },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 10 },
  messageBox: { backgroundColor: '#F8F6FF', borderRadius: 12, padding: 12, marginTop: 4 },
  messageBoxLabel: { fontFamily: 'Poppins_500Medium', fontSize: 11, color: '#888', marginBottom: 4 },
  messageBoxText: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: '#444', fontStyle: 'italic', lineHeight: 20 },

  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 16 },
  rejectBtn: { backgroundColor: '#FEE2E2' },
  acceptBtn: { backgroundColor: '#5A31F4' },
  startBtn: { backgroundColor: '#3B82F6' },
  deliverBtn: { backgroundColor: '#10B981' },
  actionBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14 },

  waitingBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#ECFDF5', borderRadius: 14, padding: 14 },
  waitingText: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: '#10B981', flex: 1 },

  chatCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#5A31F4',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  chatCardLeft:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  chatIconWrap:    { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3EDFF', justifyContent: 'center', alignItems: 'center' },
  chatCardTitle:   { fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#1A1A1A' },
  chatCardSub:     { fontFamily: 'Poppins_400Regular', fontSize: 12, color: '#888', marginTop: 1 },
  chatCardPreview: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: '#5A31F4', marginTop: 3 },
});
