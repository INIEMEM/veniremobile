import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../../utils/axiosInstance';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

export default function EventAnalytics() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);

  // Mock data for charts
  const [stats, setStats] = useState({
    totalRevenue: 0,
    ticketsSold: 0,
    pageViews: 0,
    conversionRate: 0
  });

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const response = await api.get(`/event/key?key=_id&value=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        const eventData = Array.isArray(response.data.data) 
          ? response.data.data[0] 
          : response.data.data;
        setEvent(eventData);
        
        // Mocking some stats based on the event
        const baseViews = Math.floor(Math.random() * 1000) + 100;
        const baseTickets = Math.floor(baseViews * 0.15);
        
        setStats({
          totalRevenue: baseTickets * (eventData.ticketAmount || 5000),
          ticketsSold: baseTickets,
          pageViews: baseViews,
          conversionRate: 15.0
        });
      }
    } catch (error) {
      console.error("Error fetching event for analytics:", error);
      Toast.show({
        type: "error",
        text1: "Failed to load analytics",
        text2: "Please try again later"
      });
    } finally {
      setLoading(false);
    }
  };

  const chartConfig = {
    backgroundColor: '#fff',
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(90, 49, 244, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(102, 102, 102, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: { r: "4", strokeWidth: "2", stroke: "#5A31F4" }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#5A31F4" />
        <Text style={styles.loadingText}>Loading Analytics...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics Dashboard</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.eventTitle}>{event?.name}</Text>
        
        {/* Key Metrics */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Ionicons name="cash-outline" size={24} color="#4CAF50" />
            <Text style={styles.metricLabel}>Revenue</Text>
            <Text style={styles.metricValue}>₦{stats.totalRevenue.toLocaleString()}</Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons name="ticket-outline" size={24} color="#FF9800" />
            <Text style={styles.metricLabel}>Tickets Sold</Text>
            <Text style={styles.metricValue}>{stats.ticketsSold}</Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons name="eye-outline" size={24} color="#2196F3" />
            <Text style={styles.metricLabel}>Page Views</Text>
            <Text style={styles.metricValue}>{stats.pageViews}</Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons name="trending-up-outline" size={24} color="#9C27B0" />
            <Text style={styles.metricLabel}>Conversion</Text>
            <Text style={styles.metricValue}>{stats.conversionRate}%</Text>
          </View>
        </View>

        {/* Charts */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Ticket Sales (Last 7 Days)</Text>
          <LineChart
            data={{
              labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
              datasets: [{ data: [12, 19, 3, 5, 2, 24, 10] }]
            }}
            width={width - 40}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </View>

        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Sales by Ticket Type</Text>
          <BarChart
            data={{
              labels: ["Regular", "VIP", "Early Bird"],
              datasets: [{ data: [65, 20, 15] }]
            }}
            width={width - 40}
            height={220}
            chartConfig={{...chartConfig, color: (opacity = 1) => `rgba(250, 184, 67, ${opacity})`}}
            style={styles.chart}
            showValuesOnTopOfBars
          />
        </View>
        
        <View style={{height: 40}} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontFamily: 'Poppins_500Medium', color: '#666' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  backButton: { padding: 5 },
  headerTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, color: '#333' },
  placeholder: { width: 34 },
  scrollContent: { padding: 20 },
  eventTitle: { fontFamily: 'Poppins_700Bold', fontSize: 20, color: '#333', marginBottom: 20 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  metricCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0'
  },
  metricLabel: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: '#888', marginTop: 8 },
  metricValue: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, color: '#333', marginTop: 4 },
  chartContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    alignItems: 'center'
  },
  chartTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#333', alignSelf: 'flex-start', marginBottom: 15 },
  chart: { borderRadius: 12 }
});
