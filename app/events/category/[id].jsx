import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import api from "../../../utils/axiosInstance";
import ExploreEvents from "../../../components/ExploreEvents";
const { width, height } = Dimensions.get("window");

export default function CategoryDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [category, setCategory] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchCategoryDetails();
    }
  }, [id]);

  const fetchCategoryDetails = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const isGuest = await AsyncStorage.getItem("isGuest");

      const config = isGuest === "true" || !token 
        ? {} 
        : { headers: { Authorization: `Bearer ${token}` } };

      // Fetch category events using the explore endpoint with categoryId
      // console.log("Fetching events for category ID:", id);
      const response = await api.get(
        `/event/explore/key?value=${id}&key=categoryId`,
        config
      );
      // console.log("Category events response:", response.data.success);
      if (response.data.success) {
        const eventsData = Array.isArray(response.data.data) 
          ? response.data.data 
          : [response.data.data];
        
        setEvents(eventsData);
        
        // Get category name from first event if available
        console.log("Fetched events data:", eventsData);
        if (eventsData.length > 0 && eventsData[0].categoryId) {
          setCategory(eventsData[0].categoryId);
        }
      }
    } catch (error) {
      console.error("Error fetching category details:", error);
      Toast.show({
        type: "error",
        text1: "Failed to load category",
        text2: error.response?.data?.message || "Please try again",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#5A31F4" />
        <Text style={styles.loadingText}>Loading category...</Text>
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
          {category?.image && (
            <Image
              source={{ uri: category.image }}
              style={styles.categoryIcon}
            />
          )}
          <Text style={styles.headerTitle}>
            {category?.name || "Category"}
          </Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Events Count */}
      <View style={styles.infoBar}>
        <Text style={styles.infoText}>
          {events.length} event{events.length !== 1 ? "s" : ""} found
        </Text>
      </View>

      {/* Events List */}
      {events.length > 0 ? (
        <ExploreEvents events={events} />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No events in this category yet</Text>
          <Text style={styles.emptySubtext}>
            Check back later for new events
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
    paddingHorizontal: width * 0.03,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
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
  categoryIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
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
    backgroundColor: "#f8f8f8",
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
  },
});