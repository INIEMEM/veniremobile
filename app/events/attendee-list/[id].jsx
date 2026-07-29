import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api from '../../../utils/axiosInstance';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

export default function AttendeeListScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [ticketInterests, setTicketInterests] = useState([]);
  const [activeTab, setActiveTab] = useState('interested'); // 'interested' or 'attended'

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const res = await api.get(`/event/key?key=_id&value=${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data?.success) {
        const fullEvent = Array.isArray(res.data?.data) ? res.data.data[0] : res.data?.data;
        if (fullEvent && fullEvent.ticketInterest) {
          setTicketInterests(fullEvent.ticketInterest);
        }
      }
    } catch (error) {
      console.error("Error fetching event details:", error);
      Toast.show({
        type: "error",
        text1: "Failed to load attendees",
        text2: "Please try again later"
      });
    } finally {
      setLoading(false);
    }
  };

  const interestedList = ticketInterests.filter(t => !t.isAttend);
  const attendedList = ticketInterests.filter(t => t.isAttend);

  const currentList = activeTab === 'interested' ? interestedList : attendedList;

  const renderItem = ({ item }) => {
    const user = item.userId;
    if (!user) return null;

    return (
      <View style={styles.attendeeCard}>
        <Image 
          source={{ uri: user.profile_picture || 'https://via.placeholder.com/150' }} 
          style={styles.avatar} 
        />
        <View style={styles.attendeeInfo}>
          <Text style={styles.attendeeName}>
            {user.firstname} {user.lastname}
          </Text>
          <Text style={styles.ticketInfo}>
            {item.ticketName} • Qty: {item.quantity}
          </Text>
          {item.ticket && (
            <Text style={styles.ticketId}>
              Ticket ID: {item.ticket}
            </Text>
          )}
        </View>
        <View style={[styles.statusBadge, item.isAttend ? styles.statusBadgeAttended : styles.statusBadgeInterested]}>
          <Text style={[styles.statusText, item.isAttend ? styles.statusTextAttended : styles.statusTextInterested]}>
            {item.isAttend ? 'Attended' : 'Pending'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendees</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'interested' && styles.activeTab]}
          onPress={() => setActiveTab('interested')}
        >
          <Text style={[styles.tabText, activeTab === 'interested' && styles.activeTabText]}>
            Interested ({interestedList.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'attended' && styles.activeTab]}
          onPress={() => setActiveTab('attended')}
        >
          <Text style={[styles.tabText, activeTab === 'attended' && styles.activeTabText]}>
            Attended ({attendedList.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#5A31F4" />
          <Text style={styles.loadingText}>Loading attendees...</Text>
        </View>
      ) : (
        <FlatList
          data={currentList}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No attendees found</Text>
              <Text style={styles.emptySubtext}>
                {activeTab === 'interested' 
                  ? "No one has bought tickets yet." 
                  : "No one has checked in yet."}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8F9FA' 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: { padding: 5 },
  headerTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#1A1A1A' },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#5A31F4',
  },
  tabText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#5A31F4',
    fontFamily: 'Poppins_600SemiBold',
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  attendeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
    backgroundColor: '#F0F0F0',
  },
  attendeeInfo: {
    flex: 1,
  },
  attendeeName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: '#1A1A1A',
  },
  ticketInfo: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: '#5A31F4',
    marginTop: 2,
  },
  ticketId: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  statusBadgeInterested: {
    backgroundColor: '#FFF4E5',
  },
  statusBadgeAttended: {
    backgroundColor: '#E8F5E9',
  },
  statusText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
  },
  statusTextInterested: {
    color: '#FF9800',
  },
  statusTextAttended: {
    color: '#4CAF50',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: '#666',
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#1A1A1A',
    marginTop: 16,
  },
  emptySubtext: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
});
