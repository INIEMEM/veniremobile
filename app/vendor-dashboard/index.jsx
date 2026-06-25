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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axiosInstance';

const { width } = Dimensions.get('window');

const STATUS_CONFIG = {
  pending:    { color: '#FAB843', bg: '#FFF8EC', label: 'Pending' },
  accepted:   { color: '#5A31F4', bg: '#F3EDFF', label: 'Accepted' },
  processing: { color: '#3B82F6', bg: '#EFF6FF', label: 'In Progress' },
  delivered:  { color: '#10B981', bg: '#ECFDF5', label: 'Delivered' },
  completed:  { color: '#2ECC71', bg: '#E6F9F0', label: 'Completed' },
  rejected:   { color: '#EF4444', bg: '#FEE2E2', label: 'Rejected' },
};

export default function VendorDashboardOverview() {
  const router = useRouter();
  const { user } = useAuth();

  const [dashboardData, setDashboardData] = useState({
    totalRevenue: 0, completedOrders: 0, rating: 0, productsCount: 0,
  });
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.get('/vendor/dashboard');
      if (res.data?.success && res.data?.data) {
        setDashboardData(res.data.data);
      }
    } catch (e) {
      console.log('Error fetching dashboard:', e?.response?.data || e?.message);
    }
  }, []);

  const fetchPendingOrders = useCallback(async () => {
    try {
      const res = await api.get('/vendor/orders?status=pending&page=1&limit=5');
      if (res.data?.success) {
        setPendingOrders(res.data.data || []);
      }
    } catch (e) {
      console.log('Error fetching pending orders:', e?.response?.data || e?.message);
    }
  }, []);

  const loadAll = useCallback(async () => {
    await Promise.all([fetchDashboard(), fetchPendingOrders()]);
    setLoading(false);
    setRefreshing(false);
  }, [fetchDashboard, fetchPendingOrders]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const onRefresh = () => { setRefreshing(true); loadAll(); };

  const formatCurrency = (amount) => `₦${(amount || 0).toLocaleString()}`;

  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5A31F4" />}
      >

        {/* ━━━ HEADER ━━━ */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.firstname || 'Vendor'} 👋</Text>
          </View>
          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => router.push('/vendor-dashboard/settings')}
          >
            <Ionicons name="settings-outline" size={22} color="#1A1A1A" />
          </TouchableOpacity>
        </View>

        {/* ━━━ QUICK ACTIONS ━━━ */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity
            style={[styles.quickActionBtn, { backgroundColor: '#F3EDFF' }]}
            onPress={() => router.push('/vendor-dashboard/bookings')}
          >
            <Ionicons name="list-outline" size={20} color="#5A31F4" />
            <Text style={[styles.quickActionText, { color: '#5A31F4' }]}>All Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickActionBtn, { backgroundColor: '#E6F9F0' }]}
            onPress={() => router.push('/vendor-dashboard/wallet')}
          >
            <Ionicons name="cash" size={20} color="#2ECC71" />
            <Text style={[styles.quickActionText, { color: '#2ECC71' }]}>Wallet</Text>
          </TouchableOpacity>
        </View>

        {/* ━━━ METRICS GRID ━━━ */}
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.metricsGrid}>
          {/* Earnings Card */}
          <View style={[styles.metricCard, styles.earningsCard]}>
            <View style={styles.metricHeader}>
              <View style={styles.iconBoxEarnings}>
                <Ionicons name="wallet" size={20} color="#FFF" />
              </View>
              <Text style={styles.earningsLabel}>Total Earnings</Text>
            </View>
            <Text style={styles.earningsAmount}>{formatCurrency(dashboardData.totalRevenue)}</Text>
          </View>

          {/* Half Width Cards */}
          <View style={styles.metricRow}>
            <View style={[styles.metricCard, styles.halfCard]}>
              <View style={styles.metricHeader}>
                <View style={[styles.iconBox, { backgroundColor: '#FFF8EC' }]}>
                  <Ionicons name="time" size={18} color="#FAB843" />
                </View>
              </View>
              <Text style={styles.metricValue}>{pendingOrders.length}</Text>
              <Text style={styles.metricLabel}>Pending Requests</Text>
            </View>

            <View style={[styles.metricCard, styles.halfCard]}>
              <View style={styles.metricHeader}>
                <View style={[styles.iconBox, { backgroundColor: '#E6F9F0' }]}>
                  <Ionicons name="checkmark-circle" size={18} color="#2ECC71" />
                </View>
              </View>
              <Text style={styles.metricValue}>{dashboardData.completedOrders || 0}</Text>
              <Text style={styles.metricLabel}>Completed Jobs</Text>
            </View>
          </View>
        </View>

        {/* ━━━ PENDING REQUESTS ━━━ */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pending Requests</Text>
          <TouchableOpacity onPress={() => router.push('/vendor-dashboard/bookings')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color="#5A31F4" style={{ marginTop: 20 }} />
        ) : pendingOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={40} color="#D1D5DB" />
            <Text style={styles.emptyText}>No pending requests.</Text>
            <Text style={styles.emptySubText}>New job requests will appear here.</Text>
          </View>
        ) : (
          pendingOrders.map((order) => {
            const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
            const organizer = order.organizer || {};
            const event = order.event || {};
            return (
              <TouchableOpacity
                key={order._id}
                style={styles.requestCard}
                onPress={() => router.push({ pathname: '/vendor-dashboard/order-detail', params: { orderId: order._id } })}
                activeOpacity={0.85}
              >
                <View style={styles.requestLeft}>
                  <View style={styles.requestAvatar}>
                    <Text style={{ fontSize: 18 }}>🎪</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.requestName} numberOfLines={1}>{event.name || 'Event'}</Text>
                    <Text style={styles.requestOrg} numberOfLines={1}>
                      by {organizer.firstname} {organizer.lastname}
                    </Text>
                    <Text style={styles.requestDate}>{fmtDate(event.start)}</Text>
                  </View>
                </View>
                <View style={styles.requestRight}>
                  <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.statusText, { color: sc.color }]}>{sc.label}</Text>
                  </View>
                  <Text style={styles.requestAmount}>₦{(order.amount || 0).toLocaleString()}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#ccc" style={{ marginTop: 4 }} />
                </View>
              </TouchableOpacity>
            );
          })
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F6FF' },
  scrollContent: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 40 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: '#6B7280' },
  userName: { fontFamily: 'Poppins_700Bold', fontSize: 22, color: '#111827', marginTop: -2 },
  profileBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F3F4F6' },

  // Quick Actions
  quickActionsContainer: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  quickActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12 },
  quickActionText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13 },

  // Metrics
  sectionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, color: '#111827', marginBottom: 14 },
  metricsGrid: { marginBottom: 32 },
  metricCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  earningsCard: { backgroundColor: '#5A31F4', marginBottom: 12 },
  metricHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  iconBoxEarnings: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  earningsLabel: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  earningsAmount: { fontFamily: 'Poppins_700Bold', fontSize: 32, color: '#FFF' },
  metricRow: { flexDirection: 'row', gap: 12 },
  halfCard: { flex: 1, padding: 16 },
  iconBox: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  metricValue: { fontFamily: 'Poppins_700Bold', fontSize: 24, color: '#111827' },
  metricLabel: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: '#6B7280', marginTop: 2 },

  // Section header
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  seeAll: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: '#5A31F4' },

  // Request cards
  requestCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFF', borderRadius: 16, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 1,
  },
  requestLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  requestAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#F3EDFF', justifyContent: 'center', alignItems: 'center' },
  requestName: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#111827' },
  requestOrg: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: '#6B7280', marginTop: 1 },
  requestDate: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  requestRight: { alignItems: 'flex-end', gap: 4 },
  requestAmount: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: '#5A31F4' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontFamily: 'Poppins_600SemiBold', fontSize: 10 },

  // Empty
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 36, backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#F3F4F6', borderStyle: 'dashed' },
  emptyText: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: '#9CA3AF', marginTop: 12 },
  emptySubText: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: '#D1D5DB', marginTop: 4 },
});
