// app/events/all/[status].js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import api from "../../../utils/axiosInstance";
import ExploreEvents from "../../../components/ExploreEvents";
import { useToast } from "../../../context/ToastContext";
const { width, height } = Dimensions.get("window");

// Status configuration
const STATUS_CONFIG = {
  pending: {
    title: "Upcoming Events",
    icon: "calendar-outline",
    color: "#5A31F4",
  },
  ongoing: {
    title: "Live Events",
    icon: "radio-outline",
    color: "#FF6B6B",
  },
  completed: {
    title: "Past Events",
    icon: "checkmark-circle-outline",
    color: "#51CF66",
  },
  draft: {
    title: "Draft Events",
    icon: "document-outline",
    color: "#868E96",
  },
  cancelled: {
    title: "Cancelled Events",
    icon: "close-circle-outline",
    color: "#FA5252",
  },
};

export default function AllEventsByStatusScreen() {
  const { status } = useLocalSearchParams();
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  useEffect(() => {
    if (status) {
      fetchEventsByStatus();
    }
  }, [status]);

  const fetchEventsByStatus = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const isGuest = await AsyncStorage.getItem("isGuest");

      const url = isGuest === "true" ? "/event/explore" : "/event";
      const config = isGuest === "true" || !token 
        ? {} 
        : { headers: { Authorization: `Bearer ${token}` } };

      const response = await api.get(url, config);

      if (response.data.success) {
        // Filter events by userStatus
        const filteredEvents = response.data.data.filter(
          (event) => event.userStatus === status
        );
        setEvents(filteredEvents);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
      // Toast.show({
      //   type: "error",
      //   text1: "Failed to load events",
      //   text2: error.response?.data?.message || "Please try again",
      // });
      toast(error.response?.data?.error)
    } finally {
      setLoading(false);
    }
  };

  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={statusConfig.color} />
        <Text style={styles.loadingText}>Loading events...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Ionicons 
            name={statusConfig.icon} 
            size={24} 
            color={statusConfig.color} 
          />
          <Text style={styles.headerTitle}>{statusConfig.title}</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Events Count */}
      <View style={[styles.infoBar, { backgroundColor: `${statusConfig.color}15` }]}>
        <Text style={styles.infoText}>
          {events.length} event{events.length !== 1 ? "s" : ""} found
        </Text>
      </View>

      {/* Events List */}
      {events.length > 0 ? (
        <View style={styles.eventContainer}>
          <ExploreEvents events={events} />
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons 
            name={statusConfig.icon} 
            size={64} 
            color="#ccc" 
          />
          <Text style={styles.emptyText}>
            No {statusConfig.title.toLowerCase()} yet
          </Text>
          <Text style={styles.emptySubtext}>
            {status === "pending" && "Check back later for upcoming events"}
            {status === "ongoing" && "No live events at the moment"}
            {status === "completed" && "No past events to show"}
            {status === "draft" && "No draft events available"}
            {status === "cancelled" && "No cancelled events"}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingBottom: 200
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  eventContainer: {
    paddingHorizontal: 16,
  },
  loadingText: {
    marginTop: 10,
    fontFamily: "Poppins_400Regular",
    color: "#666",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    color: "#333",
  },
  placeholder: {
    width: 40,
  },
  infoBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: "#666",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    marginTop: 15,
    fontFamily: "Poppins_500Medium",
    color: "#666",
    fontSize: 16,
  },
  emptySubtext: {
    marginTop: 5,
    fontFamily: "Poppins_400Regular",
    color: "#999",
    fontSize: 13,
    textAlign: "center",
  },
});