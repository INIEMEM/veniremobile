import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  RefreshControl,
  
} from "react-native";
import { Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { truncateText } from "../utils/truncateText";
import api from "../utils/axiosInstance";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";

const { width, height } = Dimensions.get("window");

export default function ExploreEvents({ userId = null, events: propEvents = null }) {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const animations = useRef({}).current;

  // Fetch events on mount - only if events prop is not provided
  useEffect(() => {
    if (propEvents) {
      // Use provided events and process them
      processEvents(propEvents);
    } else {
      fetchEvents();
    }
  }, [userId, propEvents]);

  const processEvents = async (eventsData) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      
      const eventsWithCounts = await Promise.all(
        eventsData.map(async (event) => {
          try {
            // Fetch comments count
            const commentsResponse = await api.get(
              `/event/comment?eventId=${event._id}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            
            const commentCount = commentsResponse.data?.count || 0;
            const likeCount = event.likes?.length || event.likeCount || 0;
            
            return {
              ...event,
              totalComments: commentCount,
              totalLikes: likeCount,
            };
          } catch (error) {
            console.error(`Error fetching counts for event ${event._id}:`, error);
            return {
              ...event,
              totalComments: 0,
              totalLikes: 0,
            };
          }
        })
      );
      
      setEvents(eventsWithCounts);
    } catch (error) {
      console.error("Error processing events:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      
      let url = "/event";
      if (userId) {
        url = `/event/key?value=${userId}&key=userId`;
      }

      const response = await api.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        const data = response?.data?.data;
        const eventsData = Array.isArray(data) ? data : [data];
        await processEvents(eventsData);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
      Toast.show({
        type: "error",
        text1: "Failed to load events",
        text2: error.response?.data?.message || "Please try again",
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (propEvents) {
      await processEvents(propEvents);
    } else {
      await fetchEvents();
    }
    setRefreshing(false);
  };

  // Handle Like/Unlike
  const handleLike = async (eventId, isLiked) => {
    try {
      const token = await AsyncStorage.getItem("token");
      const endpoint = isLiked ? "/event/unlike" : "/event/like";

      await api.post(
        endpoint,
        { eventId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update local state
      setEvents((prev) =>
        prev.map((event) => {
          if (event._id === eventId) {
            // Trigger animation
            if (!animations[eventId]) animations[eventId] = new Animated.Value(1);
            Animated.sequence([
              Animated.timing(animations[eventId], {
                toValue: 1.5,
                duration: 150,
                useNativeDriver: true,
              }),
              Animated.spring(animations[eventId], {
                toValue: 1,
                friction: 3,
                useNativeDriver: true,
              }),
            ]).start();

            return {
              ...event,
              hasLiked: !isLiked,
              totalLikes: isLiked ? (event.totalLikes || 0) - 1 : (event.totalLikes || 0) + 1,
            };
          }
          return event;
        })
      );

      Toast.show({
        type: "success",
        text1: isLiked ? "Unliked" : "Liked",
      });
    } catch (error) {
      console.error("Error liking event:", error);
      Toast.show({
        type: "error",
        text1: "Action failed",
        text2: error.response?.data?.message || "Please try again",
      });
    }
  };

  // Handle Bookmark/Unbookmark
  const handleBookmark = async (eventId, isBookmarked) => {
    try {
      const token = await AsyncStorage.getItem("token");
      const endpoint = isBookmarked ? "/event/cancel-bookmark" : "/event/bookmark";

      await api.post(
        endpoint,
        { eventId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update local state
      setEvents((prev) =>
        prev.map((event) =>
          event._id === eventId
            ? { ...event, hasBookmarked: !isBookmarked }
            : event
        )
      );

      Toast.show({
        type: "success",
        text1: isBookmarked ? "Bookmark removed" : "Bookmarked",
      });
    } catch (error) {
      console.error("Error bookmarking event:", error);
      Toast.show({
        type: "error",
        text1: "Action failed",
        text2: error.response?.data?.message || "Please try again",
      });
    }
  };

  // Handle Interested
  const handleInterested = async (eventId, isInterested) => {
    try {
      const token = await AsyncStorage.getItem("token");
      const endpoint = isInterested ? "/event/interest-cancel" : "/event/interest";
  
      await api.post(
        endpoint,
        { eventId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
  
      // Update local state immediately
      setEvents((prev) =>
        prev.map((event) =>
          event._id === eventId
            ? { ...event, hasInterested: !isInterested }
            : event
        )
      );
  
      Toast.show({
        type: "success",
        text1: isInterested
          ? "Interest cancelled"
          : "Marked as interested",
      });
    } catch (error) {
      console.error("Error marking interest:", error);
      Toast.show({
        type: "error",
        text1: "Action failed",
        text2: error.response?.data?.message || "Please try again",
      });
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Format time
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#5A31F4" />
        <Text style={styles.loadingText}>Loading events...</Text>
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="calendar-outline" size={64} color="#ccc" />
        <Text style={styles.emptyText}>No events found</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {events.map((event) => {
        if (!animations[event._id]) {
          animations[event._id] = new Animated.Value(1);
        }

        const eventImage =
          event.images && event.images.length > 0
            ? event.images[0]
            : "https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=800";

        return (
          <View style={styles.eventCard} key={event._id}>
            <View style={styles.hostRow}>
              {/* I want to add the image here */}
              <Image
                  source={{
                    uri:
                      event.userId?.profileImage ||
                      "https://cdn-icons-png.flaticon.com/512/149/149071.png",
                  }}
                  style={styles.hostAvatar}
                />
              <Text style={styles.host}>
                {event.userId?.firstname || "Unknown"} {event.userId?.lastname || ""}
              </Text>
            </View>
            {/* <Text style={styles.roles}>{event.userId?.email || ""}</Text> */}

            <Text style={[styles.host, { marginTop: 20 }]}>Event Description</Text>
            <TouchableOpacity
              onPress={() => router.push(`/(tabs)/Events/${event._id}`)}
            >
              <Text style={styles.description}>
                {truncateText(event.description, 300, "long")}
              </Text>
            </TouchableOpacity>

            <Image source={{ uri: eventImage }} style={styles.flier} />

            <Text style={styles.eventTitle}>{event.name}</Text>
            <Text style={styles.caption}>{event.description}</Text>

            <View style={styles.infoRow}>
              <Text style={styles.dateTime}>
                {formatDate(event.start)} • {formatTime(event.start)}
              </Text>
            </View>

            <View style={[styles.infoRow2]}>
              <View style={styles.mapBox}>
                <Text style={styles.mapText}>Map</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mapText}>{event.address}</Text>
                <Text style={styles.mapText}>
                  Lat: {event.lat}°, Long: {event.long}°
                </Text>
              </View>
            </View>

            <View style={styles.priceRow}>
              <TouchableOpacity
                style={[
                  styles.interestedBtn,
                  event.hasInterested && { backgroundColor: "#ccc" },
                ]}
                onPress={() => handleInterested(event._id, event.hasInterested)}
              >
                <Text style={styles.interestedText}>
                  {event.hasInterested ? "Cancel Interest" : "Interested"}
                </Text>
              </TouchableOpacity>

              <Text style={styles.price}>
                {event.isTicket ? `₦${event.ticketAmount}` : "Free"}
              </Text>
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <TouchableOpacity
                onPress={() => handleLike(event._id, event.hasLiked)}
              >
                <Animated.View
                  style={{
                    transform: [{ scale: animations[event._id] }],
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Ionicons
                    name={event.hasLiked ? "heart" : "heart-outline"}
                    size={24}
                    color={event.hasLiked ? "red" : "#555"}
                  />
                  <Text style={styles.likesText}>{event.totalLikes || 0}</Text>
                </Animated.View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.statItem}
                onPress={() => router.push(`/(tabs)/Events/${event._id}?tab=comments`)}
              >
                <Ionicons name="chatbubble-outline" size={20} color="#555" />
                <Text style={styles.statText}>{event.totalComments || 0}</Text>
              </TouchableOpacity>

              <View style={styles.statItem}>
                <Ionicons name="eye-outline" size={20} color="#555" />
                <Text style={styles.statText}>{event.hasViewed ? "✓" : ""}</Text>
              </View>

              <TouchableOpacity
                onPress={() => handleBookmark(event._id, event.hasBookmarked)}
              >
                <Ionicons
                  name={event.hasBookmarked ? "bookmark" : "bookmark-outline"}
                  size={20}
                  color={event.hasBookmarked ? "#5A31F4" : "#555"}
                />
              </TouchableOpacity>

              <TouchableOpacity>
                <Ionicons name="share-social-outline" size={20} color="#555" />
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    fontFamily: "Poppins_400Regular",
    color: "#666",
  },
  emptyText: {
    marginTop: 10,
    fontFamily: "Poppins_400Regular",
    color: "#999",
    fontSize: 16,
  },
  eventCard: {
    marginBottom: 25,
  },
  host: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#444",
  },
  roles: {
    fontFamily: "Poppins_400Regular",
    color: "#777",
    fontSize: 12,
  },
  description: {
    fontFamily: "Poppins_300Light",
    color: "#666",
    marginVertical: 8,
    fontSize: 12,
  },
  flier: {
    width: "100%",
    height: height*0.5,
    borderRadius: 8,
  },
  eventTitle: {
    fontFamily: "Poppins_600SemiBold",
    marginTop: 8,
    fontSize: 14,
    color: "#666",
  },
  caption: {
    fontFamily: "Poppins_400Regular",
    color: "#777",
    marginBottom: 10,
    fontSize: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoRow2: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginTop: 18,
  },
  dateTime: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "#666",
  },
  mapBox: {
    backgroundColor: "#eee",
    width: 60,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 6,
  },
  mapText: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#777",
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 10,
  },
  interestedBtn: {
    backgroundColor: "#5A31F4",
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 6,
    width: width * 0.5,
    height: 45,
    justifyContent: "center",
    alignItems: "center",
  },
  interestedText: {
    color: "#fff",
    fontFamily: "Poppins_500Medium",
  },
  price: {
    fontFamily: "Poppins_600SemiBold",
    color: "#FAB843",
    fontSize: 14,
    backgroundColor: "#FDECCD",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FAB843",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
    alignItems: "center",
    borderBottomColor: "#eee",
    borderBottomWidth: 1,
    borderTopColor: "#eee",
    borderTopWidth: 1,
    paddingVertical: 10,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontFamily: "Poppins_400Regular",
    color: "#555",
    fontSize: 12,
  },
  likesText: {
    fontFamily: "Poppins_400Regular",
    color: "#777",
    fontSize: 12,
    marginTop: 5,
  },
  hostRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 5,
  },
  
  hostAvatar: {
    width: 35,
    height: 35,
    borderRadius: 50,
    backgroundColor: "#ddd",
  },
  
});