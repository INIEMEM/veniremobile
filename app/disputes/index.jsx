import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import api from '../../utils/axiosInstance';
import { useAuth } from '../../context/AuthContext';

const STATUS_OPTIONS = ['pending', 'settling', 'resolved', 'closed'];

export default function DisputesListScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const isVendor = user?.role === 'vendor';
  const endpoint = isVendor ? '/vendor/disputes' : '/user/disputes';

  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeStatus, setActiveStatus] = useState('pending');

  const fetchDisputes = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get(`${endpoint}?status=${activeStatus}&page=1&limit=20`);
      if (res.data?.success) {
        setDisputes(res.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching disputes:', error?.response?.data || error?.message);
      setDisputes([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDisputes();
    }, [activeStatus])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDisputes(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return { bg: '#FFF3E0', text: '#FF8C00' };
      case 'settling': return { bg: '#E3F2FD', text: '#1565C0' };
      case 'resolved': return { bg: '#E8F5E9', text: '#2E7D32' };
      case 'closed': return { bg: '#F5F5F5', text: '#757575' };
      default: return { bg: '#F5F5F5', text: '#757575' };
    }
  };

  const getDisputeTitle = (item) => {
    return item.subject || item.title || 'Dispute';
  };

  const getOtherPartyName = (item) => {
    const order = item.vendorOrder;
    if (!order) return 'Unknown';
    if (isVendor) {
      const org = order.organizer;
      return org ? `${org.firstname} ${org.lastname}` : 'Customer';
    } else {
      const vendor = order.vendor;
      return vendor ? `${vendor.firstname} ${vendor.lastname}` : 'Vendor';
    }
  };

  const renderItem = ({ item }) => {
    const statusColors = getStatusColor(item.status);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/disputes/${item._id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>{getDisputeTitle(item)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
            <Text style={[styles.statusText, { color: statusColors.text }]}>
              {item.status?.charAt(0).toUpperCase() + item.status?.slice(1)}
            </Text>
          </View>
        </View>
        <Text style={styles.cardSub} numberOfLines={1}>
          {isVendor ? 'Raised by: ' : 'Against: '}
          <Text style={styles.cardSubBold}>{getOtherPartyName(item)}</Text>
        </Text>
        {item.createdAt && (
          <Text style={styles.cardDate}>
            {new Date(item.createdAt).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'short', year: 'numeric'
            })}
          </Text>
        )}
        <View style={styles.cardChevron}>
          <Ionicons name="chevron-forward" size={18} color="#CCC" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Disputes</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Status Filter Tabs */}
      <View style={styles.tabsWrapper}>
        <FlatList
          data={STATUS_OPTIONS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item}
          contentContainerStyle={styles.tabsContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.tab, activeStatus === item && styles.activeTab]}
              onPress={() => setActiveStatus(item)}
            >
              <Text style={[styles.tabText, activeStatus === item && styles.activeTabText]}>
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#5A31F4" />
        </View>
      ) : (
        <FlatList
          data={disputes}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5A31F4" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="shield-checkmark-outline" size={64} color="#CCC" />
              <Text style={styles.emptyTitle}>No disputes here</Text>
              <Text style={styles.emptyText}>
                {activeStatus === 'pending' ? 'Raise a dispute from a vendor or user profile.' : `No ${activeStatus} disputes found.`}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: { padding: 5 },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
  },
  tabsWrapper: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    marginRight: 8,
  },
  activeTab: {
    backgroundColor: '#5A31F4',
  },
  tabText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: '#888',
  },
  activeTabText: {
    color: '#FFF',
  },
  listContent: {
    padding: 15,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: '#222',
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
  },
  cardSub: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: '#777',
    marginBottom: 4,
  },
  cardSubBold: {
    fontFamily: 'Poppins_500Medium',
    color: '#444',
  },
  cardDate: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: '#AAA',
  },
  cardChevron: {
    position: 'absolute',
    right: 16,
    top: '50%',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#555',
    marginTop: 16,
  },
  emptyText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
});
