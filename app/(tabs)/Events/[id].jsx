import React, { useState, useRef, useEffect } from "react";
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
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Dimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";

import CommentsSection from "../../../components/CommentsSection";
import api from "../../../utils/axiosInstance";
const { width } = Dimensions.get("window");

export default function EventDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const animations = useRef({}).current;
  
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    if (id) {
      fetchEventDetails();
    }
  }, [id]);

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");

      const response = await api.get(`/event?key=id&value=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setEvent(response.data.data[0]);
      }
    } catch (error) {
      console.error("Error fetching event details:", error);
      Toast.show({
        type: "error",
        text1: "Failed to load event",
        text2: error.response?.data?.message || "Please try again",
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEventDetails();
    setRefreshing(false);
  };

  const handleLike = async () => {
    if (!event) return;

    try {
      const token = await AsyncStorage.getItem("token");
      const endpoint = event.hasLiked ? "/event/unlike" : "/event/like";

      if (!animations[event._id]) animations[event._id] = new Animated.Value(1);

      Animated.sequence([
        Animated.timing(animations[event._id], {
          toValue: 1.5,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(animations[event._id], {
          toValue: 1,
          friction: 3,
          useNativeDriver: true,
        }),
      ]).start();

      await api.post(
        endpoint,
        { eventId: event._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setEvent((prev) => ({
        ...prev,
        hasLiked: !prev.hasLiked,
        totalLikes: prev.hasLiked
          ? (prev.totalLikes || 0) - 1
          : (prev.totalLikes || 0) + 1,
      }));

      Toast.show({
        type: "success",
        text1: event.hasLiked ? "Unliked" : "Liked",
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

  const handleBookmark = async () => {
    if (!event) return;

    try {
      const token = await AsyncStorage.getItem("token");
      const endpoint = event.hasBookmarked ? "/event/cancel-bookmark" : "/event/bookmark";

      await api.post(
        endpoint,
        { eventId: event._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setEvent((prev) => ({
        ...prev,
        hasBookmarked: !prev.hasBookmarked,
      }));

      Toast.show({
        type: "success",
        text1: event.hasBookmarked ? "Bookmark removed" : "Bookmarked",
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

  const handleInterested = async () => {
    if (!event) return;

    try {
      const token = await AsyncStorage.getItem("token");

      await api.post(
        "/event/interest",
        { eventId: event._id, userStatus: "ongoing" },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Toast.show({
        type: "success",
        text1: "Marked as interested",
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

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
        <Text style={styles.loadingText}>Loading event...</Text>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#ccc" />
        <Text style={styles.emptyText}>Event not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const eventImage =
    event.images && event.images.length > 0
      ? event.images[0]
      : "https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=800";

  const organizerImage =
    event.userId?.profile_picture ||
    "https://via.placeholder.com/40/5A31F4/FFFFFF?text=" +
      (event.userId?.firstname?.charAt(0) || "U");

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.title}>Event Details</Text>

        {/* Organizer Info */}
        <View style={styles.avatarContainer}>
          <View style={styles.organizerName}>
            <Image source={{ uri: organizerImage }} style={styles.replyAvatar} />
            <View>
              <Text style={styles.userName}>
                {event.userId?.firstname || "Unknown"}{" "}
                {event.userId?.lastname || ""}
              </Text>
              <Text style={styles.time}>{event.userId?.email || "Organizer"}</Text>
            </View>
          </View>
          <View>
            <Ionicons name="ellipsis-vertical" size={20} color="#888" />
          </View>
        </View>

        {/* Event Description */}
        <Text style={[styles.smalltitle, { marginTop: 20 }]}>
          Event Description
        </Text>
        <Text style={styles.desc}>{event.description}</Text>

        {/* Event Image */}
        <Image source={{ uri: eventImage }} style={styles.eventImage} />

        {/* Event Info */}
        <View style={styles.eventDetails}>
          <Text style={styles.smalltitle}>{event.name}</Text>
          <Text style={styles.caption}>
            Capacity: {event.capacity} people
          </Text>

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
              style={styles.interestedBtn}
              onPress={handleInterested}
            >
              <Text style={styles.interestedText}>Interested</Text>
            </TouchableOpacity>
            <Text style={styles.price}>
              {event.isTicket ? `₦${event.ticketAmount}` : "Free"}
            </Text>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <TouchableOpacity onPress={handleLike}>
              <Animated.View
                style={{
                  transform: [
                    {
                      scale:
                        animations[event._id] || new Animated.Value(1),
                    },
                  ],
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
                <Text style={styles.likesText}>
                  {event.totalLikes || 0}
                </Text>
              </Animated.View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statItem}
              onPress={() => setShowComments(true)}
            >
              <Ionicons name="chatbubble-outline" size={20} color="#555" />
              <Text style={styles.statText}>
                {event.totalComments || 0}
              </Text>
            </TouchableOpacity>

            <View style={styles.statItem}>
              <Ionicons name="eye-outline" size={20} color="#555" />
              <Text style={styles.statText}>
                {event.hasViewed ? "✓" : ""}
              </Text>
            </View>

            <TouchableOpacity onPress={handleBookmark}>
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

        {/* Toggle Comments Button */}
        <TouchableOpacity
          style={styles.viewCommentsBtn}
          onPress={() => setShowComments(!showComments)}
        >
          <Text style={styles.viewCommentsText}>
            {showComments ? "Hide Comments" : "View Comments"}
          </Text>
          <Ionicons
            name={showComments ? "chevron-up" : "chevron-down"}
            size={20}
            color="#5A31F4"
          />
        </TouchableOpacity>
      </ScrollView>

      {/* Comments Section as Modal */}
      <Modal
        visible={showComments}
        animationType="slide"
        onRequestClose={() => setShowComments(false)}
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Comments</Text>
          <TouchableOpacity onPress={() => setShowComments(false)}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
        </View>
        <CommentsSection eventId={event._id} />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingVertical: 50,
    paddingHorizontal: 16,
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
  emptyText: {
    marginTop: 10,
    fontFamily: "Poppins_400Regular",
    color: "#999",
    fontSize: 16,
  },
  backButton: {
    marginTop: 20,
    backgroundColor: "#5A31F4",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#fff",
    fontFamily: "Poppins_500Medium",
  },
  eventImage: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    marginBottom: 15,
  },
  eventDetails: {},
  title: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 18,
    color: "#222",
    marginBottom: 6,
  },
  smalltitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#444",
    marginBottom: 6,
  },
  caption: {
    fontFamily: "Poppins_400Regular",
    color: "#555",
    fontSize: 12,
    marginBottom: 10,
  },
  desc: {
    fontFamily: "Poppins_400Regular",
    color: "#555",
    fontSize: 14,
    marginBottom: 10,
    marginTop: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  userName: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: "#333",
  },
  time: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "#999",
  },
  avatarContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
    marginTop: 20,
  },
  organizerName: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
  replyAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#eee",
  },
  viewCommentsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    marginTop: 10,
  },
  viewCommentsText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    color: "#5A31F4",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 15,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
  },
  modalTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 18,
    color: "#333",
  },
});