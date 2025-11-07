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
  Alert,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Video } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import CommentsSection from "../../../components/CommentsSection";
import api from "../../../utils/axiosInstance";

const { width, height } = Dimensions.get("window");

const EVENT_STATUSES = [
  { value: "pending", label: "Pending", color: "#FAB843", icon: "time-outline" },
  { value: "ongoing", label: "Ongoing", color: "#4CAF50", icon: "play-circle-outline" },
  { value: "completed", label: "Completed", color: "#2196F3", icon: "checkmark-circle-outline" },
  { value: "draft", label: "Draft", color: "#9E9E9E", icon: "document-text-outline" },
  { value: "cancelled", label: "Cancelled", color: "#ff4444", icon: "close-circle-outline" },
];

export default function EventDetailsScreen() {
  const { id, isDraft } = useLocalSearchParams();
  const router = useRouter();
  const animations = useRef({}).current;
  
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [imageScale] = useState(new Animated.Value(1));

  useEffect(() => {
    if (id) {
      fetchEventDetails();
      getCurrentUser();
    }
  }, [id, isDraft]);

  const getCurrentUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem("user");
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setCurrentUserId(user._id);
      }
    } catch (error) {
      console.error("Error getting current user:", error);
    }
  };

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");

      const endpoint = isDraft 
        ? `/event/draft/key?key=_id&value=${id}`
        : `/event/key?key=_id&value=${id}`;

      const response = await api.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        const eventData = Array.isArray(response.data.data) 
          ? response.data.data[0] 
          : response.data.data;
        setEvent(eventData);
      }
      console.log("Fetched event data:", response.data);
    } catch (error) {
      console.error("Error fetching event details:", error);
      Toast.show({
        type: "error",
        text1: `Failed to load ${isDraft ? 'draft' : 'event'}`,
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

  const handleImagePress = () => {
    setShowImageViewer(true);
    // Animate the image scale when opening
    Animated.spring(imageScale, {
      toValue: 1,
      friction: 7,
      useNativeDriver: true,
    }).start();
  };

  const handleCloseImageViewer = () => {
    Animated.timing(imageScale, {
      toValue: 0.8,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowImageViewer(false);
      imageScale.setValue(1);
    });
  };

  const handleLike = async () => {
    if (!event || isDraft) {
      Toast.show({
        type: "info",
        text1: "Cannot like draft events",
      });
      return;
    }

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
    if (!event || isDraft) {
      Toast.show({
        type: "info",
        text1: "Cannot bookmark draft events",
      });
      return;
    }

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
    if (!event || isDraft) {
      Toast.show({
        type: "info",
        text1: "Cannot mark interest in draft events",
      });
      return;
    }

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

  const handleChangeStatus = (newStatus) => {
    const statusLabel = EVENT_STATUSES.find(s => s.value === newStatus)?.label || newStatus;
    Alert.alert(
      "Change Event Status",
      `Are you sure you want to change this event's status to "${statusLabel}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Change",
          onPress: () => confirmStatusChange(newStatus),
        },
      ]
    );
  };

  const confirmStatusChange = async (newStatus) => {
    try {
      setChangingStatus(true);
      const token = await AsyncStorage.getItem("token");

      await api.put(
        `/event/user/${event._id}`,
        { userStatus: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setEvent((prev) => ({
        ...prev,
        userStatus: newStatus,
      }));

      const statusLabel = EVENT_STATUSES.find(s => s.value === newStatus)?.label || newStatus;
      Toast.show({
        type: "success",
        text1: "Status updated",
        text2: `Event status changed to ${statusLabel}`,
      });

      setShowStatusMenu(false);
    } catch (error) {
      console.error("Error changing status:", error);
      Toast.show({
        type: "error",
        text1: "Status change failed",
        text2: error.response?.data?.message || "Please try again",
      });
    } finally {
      setChangingStatus(false);
    }
  };

  const handleDeleteEvent = () => {
    Alert.alert(
      isDraft ? "Delete Draft" : "Delete Event",
      `Are you sure you want to delete this ${isDraft ? 'draft' : 'event'}? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: confirmDelete,
        },
      ]
    );
  };

  const confirmDelete = async () => {
    try {
      setDeleting(true);
      const token = await AsyncStorage.getItem("token");

      const endpoint = isDraft 
        ? `/event/draft/${event._id}`
        : `/event/${event._id}`;

      await api.delete(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Toast.show({
        type: "success",
        text1: isDraft ? "Draft deleted successfully" : "Event deleted successfully",
      });

      router.back();
    } catch (error) {
      console.error("Error deleting:", error);
      Toast.show({
        type: "error",
        text1: "Delete failed",
        text2: error.response?.data?.message || "Please try again",
      });
    } finally {
      setDeleting(false);
      setShowOptionsMenu(false);
    }
  };

  const handleEditEvent = () => {
    setShowOptionsMenu(false);
    if (isDraft) {
      router.push(`/events/edit-event/${event._id}?isDraft=true`);
    } else {
      router.push(`/events/edit-event/${event._id}`);
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
    const utcDate = new Date(dateString);
    const localDate = new Date(
      utcDate.getUTCFullYear(),
      utcDate.getUTCMonth(),
      utcDate.getUTCDate(),
      utcDate.getUTCHours(),
      utcDate.getUTCMinutes()
    );

    return localDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getEventMedia = (event) => {
    if (event.videos && event.videos.length > 0) {
      return { type: 'video', uri: event.videos[0] };
    }
    if (event.images && event.images.length > 0) {
      return { type: 'image', uri: event.images[0] };
    }
    return { 
      type: 'image', 
      uri: "https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=800" 
    };
  };

  const getCurrentStatusInfo = () => {
    const currentStatus = event?.userStatus || 'draft';
    return EVENT_STATUSES.find(s => s.value === currentStatus) || EVENT_STATUSES[3];
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#5A31F4" />
        <Text style={styles.loadingText}>
          Loading {isDraft ? 'draft' : 'event'}...
        </Text>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#ccc" />
        <Text style={styles.emptyText}>
          {isDraft ? 'Draft' : 'Event'} not found
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const media = getEventMedia(event);
  const statusInfo = getCurrentStatusInfo();

  const organizerImage =
    event.userId?.profile_picture ||
    "https://via.placeholder.com/40/5A31F4/FFFFFF?text=" +
      (event.userId?.firstname?.charAt(0) || "U");

  const isOwner = currentUserId && event.userId?._id === currentUserId;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={[styles.statusBadge, { backgroundColor: `${statusInfo.color}20`, borderColor: statusInfo.color }]}>
          <Ionicons name={statusInfo.icon} size={16} color={statusInfo.color} />
          <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>
            {statusInfo.label.toUpperCase()}
          </Text>
        </View>

        <Text style={styles.title}>
          {isDraft ? 'Draft Details' : 'Event Details'}
        </Text>

        <View style={styles.avatarContainer}>
          <View style={styles.organizerName}>
            <Image source={{ uri: organizerImage }} style={styles.replyAvatar} />
            <View>
              <Text style={styles.userName}>
                {event.userId?.firstname || "Unknown"}{" "}
                {event.userId?.lastname || ""}
              </Text>
              <Text style={styles.time}>{event?.isOrganizer && 'Organizer'} | {event?.isHost && 'Host'} {!event?.isOrganizer && !event?.isHost && 'Publisher'}</Text>
            </View>
          </View>
          <View>
            {isOwner && (
              <TouchableOpacity onPress={() => setShowOptionsMenu(true)}>
                <Ionicons name="ellipsis-vertical" size={20} color="#888" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Text style={[styles.smalltitle, { marginTop: 20 }]}>
          Event Description
        </Text>
        <Text style={styles.desc}>{event.description}</Text>

        {/* Event Media with TouchableOpacity */}
        <TouchableOpacity 
          style={styles.mediaContainer}
          onPress={media.type === 'image' ? handleImagePress : null}
          activeOpacity={media.type === 'image' ? 0.8 : 1}
        >
          {media.type === 'video' ? (
            <Video
              source={{ uri: media.uri }}
              style={styles.eventMedia}
              useNativeControls
              resizeMode="contain"
              isLooping
              shouldPlay={false}
            />
          ) : (
            <Image source={{ uri: media.uri }} style={styles.eventMedia} />
          )}
          {media.type === 'image' && (
            <View style={styles.expandIconContainer}>
              <Ionicons name="expand-outline" size={24} color="#fff" />
            </View>
          )}
        </TouchableOpacity>

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

          <Text> {event.end && 'End Date:'} </Text>
          <View style={styles.infoRow}>
            <Text style={styles.dateTime}>
              {event?.end && formatDate(event?.end)} • {event.end && formatTime(event?.end)}
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
            {!isDraft && (
              <TouchableOpacity
                style={styles.interestedBtn}
                onPress={handleInterested}
              >
                <Text style={styles.interestedText}>Interested</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.price}>
              {event.isTicket ? `₦${event.ticketAmount}` : "Free"}
            </Text>
          </View>

          {!isDraft && (
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
                    {event.likes?.length || 0}
                  </Text>
                </Animated.View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.statItem}
                onPress={() => setShowComments(true)}
              >
                <Ionicons name="chatbubble-outline" size={20} color="#555" />
                <Text style={styles.statText}>
                  {event.comments?.length || 0}
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
          )}
        </View>

        {!isDraft && (
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
        )}
      </ScrollView>

      {/* Full Screen Image Viewer Modal */}
      <Modal
        visible={showImageViewer}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseImageViewer}
      >
        <View style={styles.imageViewerContainer}>
          <TouchableOpacity
            style={styles.closeImageButton}
            onPress={handleCloseImageViewer}
          >
            <Ionicons name="close-circle" size={40} color="#fff" />
          </TouchableOpacity>
          
          <Animated.View style={{ transform: [{ scale: imageScale }] }}>
            <Image
              source={{ uri: media.uri }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          </Animated.View>

          <View style={styles.imageViewerInfo}>
            <Text style={styles.imageViewerText}>{event.name}</Text>
            <Text style={styles.imageViewerSubtext}>Tap anywhere to close</Text>
          </View>
        </View>
      </Modal>

      {!isDraft && (
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
      )}

      <Modal
        visible={showOptionsMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowOptionsMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsMenu(false)}
        >
          <View style={styles.optionsMenu}>
            <Text style={styles.optionsTitle}>
              {isDraft ? 'Draft Options' : 'Event Options'}
            </Text>
            
            <TouchableOpacity
              style={styles.optionItem}
              onPress={handleEditEvent}
            >
              <Ionicons name="create-outline" size={22} color="#5A31F4" />
              <Text style={styles.optionText}>
                {isDraft ? 'Edit Draft' : 'Edit Event'}
              </Text>
            </TouchableOpacity>

            {isOwner && !isDraft && (
              <TouchableOpacity
                style={[styles.optionItem, styles.statusOption]}
                onPress={() => {
                  setShowOptionsMenu(false);
                  setShowStatusMenu(true);
                }}
              >
                <Ionicons name="swap-horizontal-outline" size={22} color="#FF9800" />
                <Text style={[styles.optionText, styles.statusText]}>
                  Change Status
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.optionItem, styles.deleteOption]}
              onPress={handleDeleteEvent}
              disabled={deleting}
            >
              <Ionicons name="trash-outline" size={22} color="#ff4444" />
              <Text style={[styles.optionText, styles.deleteText]}>
                {deleting ? "Deleting..." : isDraft ? "Delete Draft" : "Delete Event"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelOption}
              onPress={() => setShowOptionsMenu(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showStatusMenu}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowStatusMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowStatusMenu(false)}
        >
          <View style={styles.statusMenu}>
            <View style={styles.statusMenuHeader}>
              <Text style={styles.statusMenuTitle}>Change Event Status</Text>
              <Text style={styles.statusMenuSubtitle}>
                Current: {statusInfo.label}
              </Text>
            </View>

            <ScrollView style={styles.statusList}>
              {EVENT_STATUSES.map((status) => (
                <TouchableOpacity
                  key={status.value}
                  style={[
                    styles.statusItem,
                    event.userStatus === status.value && styles.statusItemActive,
                  ]}
                  onPress={() => handleChangeStatus(status.value)}
                  disabled={changingStatus || event.userStatus === status.value}
                >
                  <View style={styles.statusItemLeft}>
                    <Ionicons name={status.icon} size={24} color={status.color} />
                    <View>
                      <Text style={styles.statusItemLabel}>{status.label}</Text>
                      <Text style={styles.statusItemDescription}>
                        {status.value === 'pending' && 'Event is scheduled but not started'}
                        {status.value === 'ongoing' && 'Event is currently happening'}
                        {status.value === 'completed' && 'Event has finished'}
                        {status.value === 'draft' && 'Event is not yet published'}
                        {status.value === 'cancelled' && 'Event has been cancelled'}
                      </Text>
                    </View>
                  </View>
                  {event.userStatus === status.value && (
                    <Ionicons name="checkmark-circle" size={24} color={status.color} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.cancelOption}
              onPress={() => setShowStatusMenu(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
  },
  mediaContainer: {
    width: "100%",
    height: height * 0.45,
    borderRadius: 16,
    marginBottom: 15,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    position: 'relative',
  },
  eventMedia: {
    width: "100%",
    height: "100%",
  },
  expandIconContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  optionsMenu: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  optionsTitle: {
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    color: "#333",
    marginBottom: 20,
    textAlign: "center",
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: "#f8f8f8",
  },
  statusOption: {
    backgroundColor: "#fff3e0",
  },
  deleteOption: {
    backgroundColor: "#fff5f5",
  },
  optionText: {
    fontSize: 16,
    fontFamily: "Poppins_500Medium",
    color: "#333",
  },
  statusText: {
    color: "#FF9800",
  },
  deleteText: {
    color: "#ff4444",
  },
  cancelOption: {
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 10,
  },
  cancelText: {
    fontSize: 16,
    fontFamily: "Poppins_500Medium",
    color: "#666",
  },
  statusMenu: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 20,
    maxHeight: height * 0.7,
  },
  statusMenuHeader: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  statusMenuTitle: {
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    color: "#333",
    marginBottom: 4,
  },
  statusMenuSubtitle: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#666",
  },
  statusList: {
    maxHeight: height * 0.45,
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: "#f8f8f8",
    borderWidth: 2,
    borderColor: "transparent",
  },
  statusItemActive: {
    backgroundColor: "#f0f0ff",
    borderColor: "#5A31F4",
  },
  statusItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  statusItemLabel: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    color: "#333",
  },
  statusItemDescription: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#666",
    marginTop: 2,
  },
  // Full Screen Image Viewer Styles
  imageViewerContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeImageButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  fullScreenImage: {
    width: width,
    height: height * 0.8,
  },
  imageViewerInfo: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  imageViewerText: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    textAlign: "center",
    marginBottom: 5,
  },
  imageViewerSubtext: {
    color: "#ccc",
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
  },
});