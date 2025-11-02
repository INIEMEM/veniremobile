import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  ScrollView,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';

import api from '../../../utils/axiosInstance';
const { width, height } = Dimensions.get('window');
import { useAuth } from '../../../context/AuthContext';
import ExploreEvents from '../../../components/ExploreEvents';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

export default function Events() {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('My Events');
  const {user} = useAuth()
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const fabScale = useRef(new Animated.Value(0)).current;

  const tabs = ['My Events', 'Tickets', 'Draft', 'Verification'];

  useEffect(() => {
    // Animate elements
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(fabScale, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Fetch events based on active tab
  useEffect(() => {
    fetchEventsByTab();
  }, [activeTab]);

  const fetchEventsByTab = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      
      let url = '';
      let config = {
        headers: { Authorization: `Bearer ${token}` },
        requiresAuth: true
      };

      switch (activeTab) {
        case 'My Events':
          url = `/event/key?value=${user._id}&key=userId`;
          break;
        case 'Draft':
          url = '/event/draft';
          break;
        case 'Tickets':
          url = '/event/tickets';
          break;
        case 'Verification':
          url = '/event/verification';
          break;
        default:
          url = `/event/key?value=${user._id}&key=userId`;
      }

      const response = await api.get(url, config);

      if (response.data.success) {
        const data = response.data.data;
        const eventsData = Array.isArray(data) ? data : [data];
        setEvents(eventsData);
      } else {
        setEvents([]);
      }

    } catch (error) {
      console.error(`Error fetching ${activeTab}:`, error);
      setEvents([]);
      
      // Only show toast if it's not a "no data" scenario
      if (error.response?.status !== 404) {
        Toast.show({
          type: 'error',
          text1: `Failed to load ${activeTab.toLowerCase()}`,
          text2: error.response?.data?.message || 'Please try again',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = () => {
    router.push('/events/create');
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Reset fade animation when switching tabs
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.container}>
      {/* Header Tabs */}
      <View style={styles.tabContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollContent}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={styles.tab}
              onPress={() => handleTabChange(tab)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.tabTextActive,
                ]}
              >
                {tab}
              </Text>
              {activeTab === tab && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content Area */}
      <View style={styles.contentContainer}>
        {!loading && events.length === 0 ? (
          <Animated.View
            style={[
              styles.emptyState,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {/* Empty State Icon */}
            <View style={styles.emptyIconContainer}>
              <View style={styles.emptyIconCircle}>
                <Text style={styles.emptyIconPlus}>+</Text>
              </View>
              <View style={styles.emptyIconTicket}>
                <View style={styles.ticketNotch} />
              </View>
            </View>

            {/* Empty State Text */}
            <Text style={styles.emptyText}>
              {activeTab === 'Draft' 
                ? 'You have no draft events yet.'
                : activeTab === 'Tickets'
                ? 'You have no tickets yet.'
                : activeTab === 'Verification'
                ? 'No events pending verification.'
                : 'You have no event records yet. Any event you host'}
            </Text>
            <Text style={styles.emptyText}>
              {activeTab === 'My Events' && (
                <>
                  will be recorded here.{' '}
                  <Text style={styles.createLink} onPress={handleCreateEvent}>
                    Create event?
                  </Text>
                </>
              )}
            </Text>
          </Animated.View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.eventsListContainer}
            showsVerticalScrollIndicator={false}
          >
            <ExploreEvents 
              userId={activeTab === 'My Events' ? user._id : null}
              events={events}
              isExploreMode={false}
              isDraftMode={activeTab === 'Draft'} // Pass isDraftMode prop
            />
          </ScrollView>
        )}
      </View>

      {/* Floating Action Button */}
      <Animated.View
        style={[
          styles.fabContainer,
          {
            transform: [{ scale: fabScale }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.fab}
          onPress={handleCreateEvent}
          activeOpacity={0.8}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  tabContainer: {
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tabScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  tab: {
    marginRight: 24,
    paddingBottom: 12,
    position: 'relative',
  },
  tabText: {
    fontSize: 15,
    color: '#999',
    fontFamily: 'Poppins_400Regular',
  },
  tabTextActive: {
    color: '#5A31F4',
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#5A31F4',
    borderRadius: 2,
  },
  contentContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  emptyIconPlus: {
    fontSize: 36,
    color: '#ccc',
    fontWeight: '300',
  },
  emptyIconTicket: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 40,
    height: 50,
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    transform: [{ rotate: '15deg' }],
  },
  ticketNotch: {
    position: 'absolute',
    top: '45%',
    right: -2,
    width: 8,
    height: 8,
    backgroundColor: '#fff',
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: 'Poppins_400Regular',
  },
  createLink: {
    color: '#5A31F4',
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  eventsListContainer: {
    padding: 20,
  },
  eventCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    fontFamily: 'Poppins_600SemiBold',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    zIndex: 10,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#5A31F4',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#5A31F4',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  fabIcon: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '300',
    marginTop: -2,
  },
});