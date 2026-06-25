import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../utils/axiosInstance';
import { useToast } from '../../context/ToastContext';

const { width } = Dimensions.get('window');

const TABS = [
  { id: 'pending',    label: 'Pending' },
  { id: 'accepted',   label: 'Accepted' },
  { id: 'processing', label: 'In Progress' },
  { id: 'delivered',  label: 'Delivered' },
  { id: 'completed',  label: 'Completed' },
  { id: 'rejected',   label: 'Rejected' },
];

export default function VendorBookings() {
  const router = useRouter();
  const { success, error: showError } = useToast();
  
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchBookings = useCallback(async (status) => {
    try {
      const res = await api.get(`/vendor/orders?status=${status}&page=1&limit=50`);
      if (res.data?.success && res.data?.data) {
        setBookings(res.data.data);
      } else {
        setBookings([]);
      }
    } catch (e) {
      console.log('Error fetching vendor orders', e?.response?.data || e?.message);
      setBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setBookings([]);
    fetchBookings(activeTab);
  }, [activeTab, fetchBookings]);

  const onRefresh = () => { setRefreshing(true); fetchBookings(activeTab); };

  const formatCurrency = (amount) => `₦${(amount || 0).toLocaleString()}`;

  const handleBookingAction = async (bookingId, action) => {
    if (action === 'reject') {
      const confirmed = await new Promise((res) =>
        Alert.alert('Reject Order', 'Are you sure you want to reject this order?', [
          { text: 'Cancel', style: 'cancel', onPress: () => res(false) },
          { text: 'Reject', style: 'destructive', onPress: () => res(true) },
        ])
      );
      if (!confirmed) return;
    }
    setActionLoading(bookingId);
    try {
      await api.put(`/vendor/orders/${bookingId}/${action}`);
      success(`Order ${action}ed successfully`);
      fetchBookings(activeTab);
    } catch (e) {
      showError(e?.response?.data?.message || `Failed to ${action} order.`);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredBookings = bookings;

  return (
    <View style={styles.container}>
      {/* ━━━ HEADER ━━━ */}
      <View style={styles.header}>
        <Text style={styles.title}>Job Requests</Text>
        <Text style={styles.subtitle}>Manage your incoming and upcoming jobs</Text>
      </View>

      {/* ━━━ TABS ━━━ */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ━━━ LIST ━━━ */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#5A31F4" />
        </View>
      ) : filteredBookings.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={54} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No {TABS.find(t => t.id === activeTab)?.label.toLowerCase()} orders</Text>
          <Text style={styles.emptySubtitle}>Orders with this status will appear here.</Text>
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.listContainer} 
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5A31F4" />}
        >
          {filteredBookings.map((booking) => (
            <View key={booking._id} style={styles.bookingCard}>
              
              <View style={styles.cardHeader}>
                <View style={styles.userInfo}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {(booking.organizer?.firstname || "?").charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.userName}>
                      {booking.organizer?.firstname || "User"}{" "}
                      {booking.organizer?.lastname || ""}
                    </Text>
                    <Text style={styles.postedTime}>
                      {booking.createdAt ? new Date(booking.createdAt).toLocaleDateString() : ""}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.messageBtn}
                  onPress={() => router.push({ pathname: '/vendor-dashboard/order-detail', params: { orderId: booking._id } })}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color="#5A31F4" />
                  <Text style={styles.messageBtnText}>Chat</Text>
                </TouchableOpacity>
              </View>

              {/* Event Details */}
              <View style={styles.eventDetailsBox}>
                <Text style={styles.eventName}>{booking.event?.name || "Event"}</Text>
                <View style={styles.eventInfoRow}>
                  <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                  <Text style={styles.eventInfoText}>
                    {booking.event?.start ? new Date(booking.event.start).toLocaleDateString() : "No date"}
                  </Text>
                </View>
                <View style={styles.eventInfoRow}>
                  <Ionicons name="location-outline" size={14} color="#6B7280" />
                  <Text style={styles.eventInfoText}>{booking.event?.address || "No location"}</Text>
                </View>
              </View>

              {/* Requested Services */}
              <View style={styles.productsSection}>
                <Text style={styles.sectionLabel}>Job Summary</Text>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Message</Text>
                  <Text style={[styles.productName, { flex: 1, textAlign: "right" }]} numberOfLines={2}>
                    {booking.message || "No message"}
                  </Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total Payout</Text>
                  <Text style={styles.totalAmount}>{formatCurrency(booking.amount || 0)}</Text>
                </View>
              </View>

              {/* Action Buttons (Only for Pending) */}
              {booking.status === 'pending' && (
                <View style={styles.actionRow}>
                  <TouchableOpacity 
                    style={styles.rejectBtn}
                    onPress={() => handleBookingAction(booking._id, 'reject')}
                    disabled={actionLoading === booking._id}
                  >
                    <Text style={styles.rejectBtnText}>Decline</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.acceptBtn}
                    onPress={() => handleBookingAction(booking._id, 'accept')}
                    disabled={actionLoading === booking._id}
                  >
                    {actionLoading === booking._id ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" />
                        <Text style={styles.acceptBtnText}>Approve Job</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Action Buttons for Accepted / In Progress */}
              {booking.status === 'accepted' && (
                <View style={styles.actionRow}>
                  <TouchableOpacity 
                    style={[styles.acceptBtn, { width: '100%' }]}
                    onPress={() => handleBookingAction(booking._id, 'process')}
                    disabled={actionLoading === booking._id}
                  >
                    {actionLoading === booking._id ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="play-circle-outline" size={18} color="#FFF" />
                        <Text style={styles.acceptBtnText}>Start Job</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Action Buttons for In-Progress (processing) */}
              {booking.status === 'processing' && (
                <View style={styles.actionRow}>
                  <TouchableOpacity 
                    style={[styles.acceptBtn, { width: '100%', backgroundColor: '#10B981' }]}
                    onPress={() => handleBookingAction(booking._id, 'deliver')}
                    disabled={actionLoading === booking._id}
                  >
                    {actionLoading === booking._id ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="bag-check-outline" size={18} color="#FFF" />
                        <Text style={styles.acceptBtnText}>Mark as Delivered</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Delivered - waiting for client */}
              {booking.status === 'delivered' && (
                <View style={[styles.waitBanner]}>
                  <Ionicons name="hourglass-outline" size={16} color="#10B981" />
                  <Text style={styles.waitBannerText}>Waiting for client to confirm completion</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F6FF' },
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#FFF' },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 24, color: '#111827' },
  subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: '#6B7280', marginTop: 2 },
  
  // Tabs
  tabContainer: { backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  tabScroll: { paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
  tabBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#F3F4F6' },
  tabBtnActive: { backgroundColor: '#5A31F4' },
  tabText: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: '#6B7280' },
  tabTextActive: { color: '#FFF' },

  listContainer: { padding: 16, paddingBottom: 40 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Empty State
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, color: '#374151', marginTop: 16 },
  emptySubtitle: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginTop: 8 },

  // Cards
  bookingCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8DBFF', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#5A31F4' },
  userName: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#111827' },
  postedTime: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: '#9CA3AF' },
  
  messageBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F3EDFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  messageBtnText: { fontFamily: 'Poppins_500Medium', fontSize: 12, color: '#5A31F4' },

  eventDetailsBox: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginBottom: 16 },
  eventName: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: '#111827', marginBottom: 8 },
  eventInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  eventInfoText: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: '#4B5563' },

  productsSection: { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 16, marginBottom: 16 },
  sectionLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#9CA3AF', marginBottom: 10, textTransform: 'uppercase' },
  productRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  productName: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: '#374151' },
  productPrice: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: '#111827' },
  
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', borderStyle: 'dashed' },
  totalLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#374151' },
  totalAmount: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#10B981' },

  actionRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  rejectBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#FEF2F2', alignItems: 'center' },
  rejectBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#EF4444' },
  acceptBtn: { flex: 2, flexDirection: 'row', gap: 8, paddingVertical: 12, borderRadius: 12, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' },
  acceptBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#FFF' },
  waitBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ECFDF5', borderRadius: 12, padding: 12, marginTop: 4 },
  waitBannerText: { fontFamily: 'Poppins_500Medium', fontSize: 12, color: '#10B981', flex: 1 },
});
