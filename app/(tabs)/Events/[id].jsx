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
  Platform,
  TextInput,
  Linking,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
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

const renderStars = (rating) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Text key={i} style={{ color: i <= Math.round(rating) ? "#FAB843" : "#DDD", fontSize: 18 }}>
        ★
      </Text>
    );
  }
  return stars;
};

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

  // Review & Rating states
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [imageScale] = useState(new Animated.Value(1));

  // Ticketing
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketQuantities, setTicketQuantities] = useState({});
  const [purchasingTickets, setPurchasingTickets] = useState(false);

  // Carousel & Video
  const [activeIdx, setActiveIdx] = useState(0);
  const [playingKey, setPlayingKey] = useState(null);
  const [fullScreen, setFullScreen] = useState(null);
  const [showAllDesc, setShowAllDesc] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const videoRefs = useRef({});
  const fsVideoRef = useRef(null);
  
  // Hired Vendors
  const [hiredVendors, setHiredVendors] = useState([]);
  const [fetchingVendors, setFetchingVendors] = useState(false);

  useEffect(() => {
    if (id) {
      fetchEventDetails();
      getCurrentUser();
    }
  }, [id, isDraft]);

  useFocusEffect(
    React.useCallback(() => {
      if (event && currentUserId) {
        const ownsEvent = event.userId?._id === currentUserId || event.userId === currentUserId;
        if (ownsEvent && !isDraft) {
          fetchHiredVendors();
        }
      }
    }, [event, currentUserId, isDraft])
  );

  const fetchHiredVendors = async () => {
    try {
      setFetchingVendors(true);
      const token = await AsyncStorage.getItem("token");
      // Use event?._id as fallback just in case
      const targetId = event?._id || id;

      // console.log("Target ID:", targetId); 
      const res = await api.get(`/user/vendors/hire/request/${targetId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.success) {
        const data = res.data.data;
        const finalData = Array.isArray(data) ? data : data ? [data] : [];
        setHiredVendors(finalData);
        // console.log("Hired vendors:", res.data);
        // Debug
        // Toast.show({ type: "info", text1: "Vendors fetched", text2: `Found ${finalData.length}` });
      } else {
        Toast.show({ type: "error", text1: "Failed", text2: res.data?.message || "Unknown error" });
      }
    } catch (err) {
      if (err?.response?.status !== 404) {
        console.log("Error fetching hired vendors:", err?.response?.data || err?.message);
        Toast.show({ type: "error", text1: "Error fetching vendors", text2: err?.response?.data?.message || err.message });
      }
      setHiredVendors([]);
    } finally {
      setFetchingVendors(false);
    }
  };

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
      console.log("Fetched event data:", response.data?.data?.tickets);
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
    if (!isDraft) {
      await fetchHiredVendors();
    }
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

  const handleInterested = () => {
    if (!event || isDraft) {
      Toast.show({ type: "info", text1: "Cannot interact with draft events" });
      return;
    }
    
    // Always open the ticket modal
    setShowTicketModal(true);
  };

  const updateTicketQuantity = (ticketId, delta) => {
    setTicketQuantities(prev => {
      const current = prev[ticketId] || 0;
      const next = current + delta;
      if (next < 0) return prev;
      return { ...prev, [ticketId]: next };
    });
  };

  const getTicketTotal = () => {
    let total = 0;
    const ticketsSource = event?.tickets?.length > 0 
      ? event.tickets 
      : [{
          _id: event?._id || "default",
          price: event?.ticketAmount || 0,
        }];

    Object.entries(ticketQuantities).forEach(([id, qty]) => {
      const t = ticketsSource.find(x => x._id === id);
      if (t && qty > 0) total += (t.price || 0) * qty;
    });
    return total;
  };

  const handlePurchaseTickets = async () => {
    const totalQty = Object.values(ticketQuantities).reduce((a, b) => a + b, 0);
    if (totalQty === 0) {
      Toast.show({ type: "error", text1: "No tickets selected", text2: "Please select at least one ticket." });
      return;
    }

    setPurchasingTickets(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const payload = {
        eventId: event._id,
        comment: "",
        tickets: Object.entries(ticketQuantities)
          .filter(([_, qty]) => qty > 0)
          .map(([id, qty]) => ({ id, quantity: qty }))
      };

      const res = await api.post("/event/interest", payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data?.success) {
        Toast.show({ type: "success", text1: "Tickets purchased successfully!" });
        setShowTicketModal(false);
        setTicketQuantities({});
      }
    } catch (error) {
      Toast.show({ type: "error", text1: "Purchase Failed", text2: error.response?.data?.message || "Something went wrong" });
    } finally {
      setPurchasingTickets(false);
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

  const handleSubmitReview = async () => {
    if (!rating) {
      Toast.show({ type: "error", text1: "Please select a rating" });
      return;
    }
    if (!reviewText.trim()) {
      Toast.show({ type: "error", text1: "Please enter a review" });
      return;
    }

    try {
      setIsSubmittingReview(true);
      const token = await AsyncStorage.getItem("token");
      await api.post(
        "/event/review-rate",
        {
          eventId: event?._id || id,
          review: reviewText.trim(),
          rate: rating,
          rating: rating,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Toast.show({ type: "success", text1: "Review submitted successfully!" });
      setShowReviewModal(false);
      setRating(0);
      setReviewText("");
    } catch (error) {
      console.error("Error submitting review:", error?.response?.data || error?.message);
      Toast.show({
        type: "error",
        text1: "Failed to submit review",
        text2: error?.response?.data?.message || error?.response?.data?.error || "Server error occurred",
      });
    } finally {
      setIsSubmittingReview(false);
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
    const allMedia = [];
    if (event.videos && event.videos.length > 0) {
      event.videos.forEach(uri => allMedia.push({ type: "video", uri }));
    }
    if (event.images && event.images.length > 0) {
      event.images.forEach(uri => allMedia.push({ type: "image", uri }));
    }
    if (allMedia.length === 0) {
      allMedia.push({
        type: "image",
        uri: "https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=800"
      });
    }
    return allMedia;
  };

  const pauseAll = async () => {
    await Promise.all(
      Object.values(videoRefs.current).map(async (r) => {
        try { if (r) await r.pauseAsync(); } catch (_) {}
      })
    );
    setPlayingKey(null);
  };

  const openFullScreen = async (idx) => {
    await pauseAll();
    setFullScreen(idx);
  };

  const closeFullScreen = async () => {
    try { if (fsVideoRef.current) await fsVideoRef.current.pauseAsync(); } catch (_) {}
    setFullScreen(null);
  };

  const getCurrentStatusInfo = () => {
    const currentStatus = event?.userStatus || 'draft';
    return EVENT_STATUSES.find(s => s.value === currentStatus) || EVENT_STATUSES[3];
  };

  const openMaps = () => {
    if (event.lat && event.long) {
      Linking.openURL(`https://www.google.com/maps?q=${event.lat},${event.long}`);
    } else {
      const address = event.address || "";
      Linking.openURL(`https://www.google.com/maps/search/${encodeURIComponent(event.name + " " + address)}`);
    }
  };

  const formatCount = (n) => {
    if (!n) return "0";
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
    return String(n);
  };

  const timeAgo = (iso) => {
    if (!iso) return "";
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
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

  const isOwner = currentUserId && (event.userId?._id === currentUserId || event.userId === currentUserId);

  return (
    <View style={styles.container}>
      {/* Back button — floats above media */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => { pauseAll(); router.back(); }}
      >
        <Ionicons name="chevron-back" size={22} color="#FFF" />
      </TouchableOpacity>

      {/* Status Badge - floating top right */}
      <View style={[styles.floatingStatusBadge, { backgroundColor: statusInfo.color }]}>
        <Ionicons name={statusInfo.icon} size={12} color="#fff" />
        <Text style={styles.floatingStatusText}>{statusInfo.label.toUpperCase()}</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* ── MEDIA CAROUSEL ───────────────────────────── */}
          <View style={styles.mediaContainer}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              onMomentumScrollEnd={(e) =>
                setActiveIdx(Math.round(e.nativeEvent.contentOffset.x / width))
              }
            >
              {media.map((item, idx) => {
                const vKey = `detail-${event._id}-${idx}`;
                const isPlaying = playingKey === vKey;
                return (
                  <View key={idx} style={styles.mediaSlide}>
                    {item.type === "video" ? (
                      <>
                        <Video
                          ref={(r) => { videoRefs.current[vKey] = r; }}
                          source={{ uri: item.uri }}
                          style={styles.media}
                          resizeMode="cover"
                          shouldPlay={false}
                          isLooping={false}
                          isMuted={false}
                          onPlaybackStatusUpdate={(s) => {
                            if (s.didJustFinish) setPlayingKey(null);
                          }}
                        />
                        <TouchableOpacity
                          style={styles.videoOverlay}
                          activeOpacity={0.85}
                          onPress={async () => {
                            const ref = videoRefs.current[vKey];
                            if (!ref) return;
                            if (isPlaying) { await ref.pauseAsync(); setPlayingKey(null); }
                            else { await pauseAll(); await ref.playAsync(); setPlayingKey(vKey); }
                          }}
                          onLongPress={() => openFullScreen(idx)}
                        >
                          {!isPlaying && (
                            <View style={styles.playWrap}>
                              <Ionicons name="play" size={36} color="#FFF" />
                            </View>
                          )}
                          <TouchableOpacity style={styles.expandBtn} onPress={() => openFullScreen(idx)}>
                            <Ionicons name="expand-outline" size={16} color="#FFF" />
                          </TouchableOpacity>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <TouchableOpacity style={{ flex: 1 }} onPress={() => openFullScreen(idx)} activeOpacity={0.95}>
                        <Image source={{ uri: item.uri }} style={styles.media} resizeMode="cover" />
                        <View style={styles.expandBtn} pointerEvents="none">
                          <Ionicons name="expand-outline" size={16} color="#FFF" />
                        </View>
                      </TouchableOpacity>
                    )}
                    {media.length > 1 && (
                      <View style={styles.mediaCounter}>
                        <Text style={styles.mediaCounterText}>{idx + 1} / {media.length}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            {/* Dot indicators */}
            {media.length > 1 && (
              <View style={styles.dots}>
                {media.map((_, i) => (
                  <View key={i} style={[styles.dot, i === activeIdx && styles.dotActive]} />
                ))}
              </View>
            )}
          </View>

          {/* ── ACTION BAR ─────────────────────────────── */}
          {!isDraft && (
            <View style={styles.actionBar}>
              <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
                <Animated.View style={{ transform: [{ scale: animations[event._id] || new Animated.Value(1) }] }}>
                  <Ionicons
                    name={event.hasLiked ? "heart" : "heart-outline"}
                    size={24}
                    color={event.hasLiked ? "#FF3B30" : "#1A1A1A"}
                  />
                </Animated.View>
                <Text style={[styles.actionCount, event.hasLiked && { color: "#FF3B30" }]}>
                  {formatCount(event.likes?.length || event.totalLikes)}
                </Text>
              </TouchableOpacity>

              <View style={styles.actionBtn}>
                <Ionicons name="chatbubble-outline" size={24} color="#1A1A1A" />
                <Text style={styles.actionCount}>{formatCount(event.comments?.length || event.totalComments)}</Text>
              </View>

              <TouchableOpacity style={styles.actionBtn}>
                <Ionicons name="share-social-outline" size={24} color="#1A1A1A" />
              </TouchableOpacity>

              <View style={{ flex: 1 }} />

              <TouchableOpacity style={styles.actionBtn} onPress={handleBookmark}>
                <Ionicons
                  name={event.hasBookmarked ? "bookmark" : "bookmark-outline"}
                  size={24}
                  color={event.hasBookmarked ? "#5A31F4" : "#1A1A1A"}
                />
              </TouchableOpacity>
            </View>
          )}

          {/* Likes count */}
          {!isDraft && (event.likes?.length > 0 || event.totalLikes > 0) && (
            <View style={styles.likesRow}>
              <Text style={styles.likesText}>{formatCount(event.likes?.length || event.totalLikes)} likes</Text>
            </View>
          )}

          {/* ── EVENT INFO ──────────────────────────────── */}
          <View style={styles.infoSection}>

            {/* Name + Options */}
            <View style={styles.nameRow}>
              <Text style={styles.placeName}>{event.name || "Event Details"}</Text>
              {isOwner && (
                <TouchableOpacity onPress={() => setShowOptionsMenu(true)} style={styles.optionsIcon}>
                  <Ionicons name="ellipsis-horizontal" size={20} color="#1A1A1A" />
                </TouchableOpacity>
              )}
            </View>

            {/* Rating + Price + Location */}
            <View style={styles.metaRow}>
              <View style={styles.starsRow}>{renderStars(event.rating || event.averageRating || 0)}</View>
              <Text style={styles.ratingNum}>{(event.rating || event.averageRating || 0).toFixed(1)}</Text>
              <View style={styles.metaDot} />
              <Text style={styles.priceRange}>{event.isTicket ? `₦${event.ticketAmount}` : "Free"}</Text>
              <View style={styles.metaDot} />
              <Ionicons name="calendar-outline" size={13} color="#5A31F4" />
              <Text style={styles.cityText}>{formatDate(event.start)}</Text>
            </View>

            {/* Address */}
            {event.address && (
              <View style={styles.addressRow}>
                <Ionicons name="map-outline" size={14} color="#5A31F4" />
                <Text style={styles.addressText}>{event.address}</Text>
              </View>
            )}

            {/* Open in Maps CTA */}
            {event.address && (
              <TouchableOpacity style={styles.mapsBtn} onPress={openMaps} activeOpacity={0.85}>
                <Ionicons name="navigate" size={16} color="#FFF" />
                <Text style={styles.mapsBtnText}>Open in Google Maps</Text>
              </TouchableOpacity>
            )}

            {/* Description */}
            <Text style={styles.sectionTitle}>About this event</Text>
            <Text
              style={styles.description}
              numberOfLines={showAllDesc ? undefined : 4}
            >
              {event.description}
            </Text>
            {event.description?.length > 180 && (
              <TouchableOpacity onPress={() => setShowAllDesc((p) => !p)}>
                <Text style={styles.readMore}>
                  {showAllDesc ? "Show less" : "Read more"}
                </Text>
              </TouchableOpacity>
            )}

            {/* Tags */}
            {(event.category || event.tags?.length > 0) && (
              <View style={styles.tagsRow}>
                {event.category && (
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>#{String(event.category).toLowerCase().replace(/\s+/g, "")}</Text>
                  </View>
                )}
                {event.tags?.map((tag) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Posted by */}
            <View style={styles.postedByRow}>
              <Image
                source={{ uri: organizerImage }}
                style={styles.postedAvatar}
              />
              <View>
                <Text style={styles.postedByLabel}>
                  {event?.isOrganizer ? 'Organizer' : (event?.isHost ? 'Host' : 'Posted by')}
                </Text>
                <Text style={styles.postedByName}>
                  {event.userId?.firstname || "Unknown"} {event.userId?.lastname || ""}
                </Text>
              </View>
              <Text style={styles.postedTime}>{timeAgo(event.createdAt || event.start)}</Text>
            </View>

            {/* Hired Vendors */}
            {isOwner && (
              <View style={styles.vendorSection}>
                <View style={styles.vendorSectionHeader}>
                  <Text style={styles.sectionTitle}>Hired Vendors</Text>
                  {hiredVendors.length > 0 && (
                    <Text style={styles.vendorCount}>{hiredVendors.length} hired</Text>
                  )}
                </View>

                {hiredVendors.length > 0 ? (
                  hiredVendors.map((req, index) => {
                    const name = req.vendor?.firstname
                      ? `${req.vendor.firstname} ${req.vendor.lastname || ''}`.trim()
                      : req.vendor?.businessName || 'Vendor';
                    const category = req.vendor?.category || req.vendor?.serviceType || req.vendor?.role || 'Service Provider';
                    const photo = req.vendor?.profile_picture || req.vendor?.userId?.profile_picture;
                    const message = req.message || req.note || '';
                    const amount = req.amount || 0;
                    const status = req.status || 'pending';
                    const STATUS_CONFIG = {
                      accepted:  { bg: '#EFF6FF', text: '#3B82F6', label: 'Accepted' },
                      pending:   { bg: '#FEF3C7', text: '#F59E0B', label: 'Awaiting' },
                      rejected:  { bg: '#FEF2F2', text: '#EF4444', label: 'Rejected' },
                      completed: { bg: '#ECFDF5', text: '#10B981', label: 'Done' },
                      process:   { bg: '#F3EDFF', text: '#8B5CF6', label: 'Working' },
                      delivered: { bg: '#ECFDF5', text: '#10B981', label: 'Delivered' },
                    };
                    const sc = STATUS_CONFIG[status] || { bg: '#F3F4F6', text: '#6B7280', label: status };

                    return (
                      <TouchableOpacity
                        key={req._id || index}
                        style={styles.vendorCard}
                        onPress={() => router.push({ pathname: `/orders/${req._id}`, params: { orderData: JSON.stringify(req) } })}
                        activeOpacity={0.85}
                      >
                        <View style={styles.vendorCardLeft}>
                          {photo ? (
                            <Image source={{ uri: photo }} style={styles.vendorAvatar} />
                          ) : (
                            <View style={[styles.vendorAvatar, styles.vendorAvatarFallback]}>
                              <Text style={styles.vendorAvatarLetter}>{name.charAt(0).toUpperCase()}</Text>
                            </View>
                          )}
                          <View style={styles.vendorCardInfo}>
                            <Text style={styles.vendorCardName} numberOfLines={1}>{name}</Text>
                            <Text style={styles.vendorCardCategory} numberOfLines={1}>
                              {amount > 0 ? `₦${amount.toLocaleString()}` : category}
                            </Text>
                          </View>
                        </View>
                        <View style={[styles.vendorBadge, { backgroundColor: sc.bg }]}>
                          <Text style={[styles.vendorBadgeText, { color: sc.text }]}>{sc.label}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <Text style={styles.description}>No vendors hired yet.</Text>
                )}

                {/* Hire a Vendor CTA */}
                <TouchableOpacity
                  style={styles.hireVendorCta}
                  onPress={() => router.push(`/(tabs)/Vendor/marketplace?eventId=${event._id}`)}
                  activeOpacity={0.85}
                >
                  <View style={styles.hireVendorCtaLeft}>
                    <View style={styles.hireVendorIcon}>
                      <Ionicons name="storefront" size={20} color="#5A31F4" />
                    </View>
                    <View>
                      <Text style={styles.hireVendorTitle}>Hire a Vendor</Text>
                      <Text style={styles.hireVendorSubtitle}>Browse caterers, DJs & more</Text>
                    </View>
                  </View>
                  <Ionicons name="arrow-forward-circle" size={24} color="#5A31F4" />
                </TouchableOpacity>
              </View>
            )}

            {/* CTAs (Rate & Tickets) */}
            {!isDraft && (
              <View style={styles.bottomCtaRow}>
                <TouchableOpacity style={styles.rateBtn} onPress={() => setShowReviewModal(true)}>
                  <Ionicons name="star-outline" size={18} color="#5A31F4" />
                  <Text style={styles.rateBtnText}>Rate Event</Text>
                </TouchableOpacity>

                {!isOwner && (
                  <TouchableOpacity style={styles.interestedBtn} onPress={handleInterested}>
                    <Text style={styles.interestedText}>
                      {event.isTicket ? "Buy Tickets" : "Interested"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* ── COMMENTS ────────────────────────────────── */}
          {!isDraft && (
            <View style={styles.commentsSection}>
              <Text style={styles.sectionTitle}>
                Comments ({formatCount(event.comments?.length || event.totalComments)})
              </Text>
              
              <View style={{ marginTop: 10 }}>
                <CommentsSection eventId={event._id} />
              </View>

              <View style={{ height: 40 }} />
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── FULLSCREEN MODAL ────────────────────────────── */}
      <Modal
        visible={fullScreen !== null}
        transparent
        animationType="fade"
        onRequestClose={closeFullScreen}
      >
        <View style={styles.fsContainer}>
          <TouchableOpacity style={styles.fsCloseBtn} onPress={closeFullScreen}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: (fullScreen || 0) * width, y: 0 }}
          >
            {media.map((item, idx) => (
              <View key={idx} style={styles.fsSlide}>
                {item.type === "video" ? (
                  <Video
                    ref={idx === fullScreen ? fsVideoRef : null}
                    source={{ uri: item.uri }}
                    style={styles.fsMedia}
                    useNativeControls
                    resizeMode="contain"
                    shouldPlay={idx === fullScreen}
                    isLooping={false}
                    isMuted={false}
                    volume={1.0}
                  />
                ) : (
                  <Image source={{ uri: item.uri }} style={styles.fsMedia} resizeMode="contain" />
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Review Modal */}
      {!isDraft && (
        <Modal
          visible={showReviewModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowReviewModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.reviewMenu}>
              <View style={styles.reviewHeader}>
                <Text style={styles.optionsTitle}>Rate this Event</Text>
                <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setRating(star)}>
                    <Ionicons 
                      name={rating >= star ? "star" : "star-outline"} 
                      size={40} 
                      color={rating >= star ? "#FAB843" : "#ccc"} 
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.reviewInput}
                placeholder="Write your review here..."
                multiline
                numberOfLines={4}
                value={reviewText}
                onChangeText={setReviewText}
                textAlignVertical="top"
              />

              <TouchableOpacity 
                style={styles.submitReviewBtn} 
                onPress={handleSubmitReview}
                disabled={isSubmittingReview}
              >
                {isSubmittingReview ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitReviewText}>Submit Review</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

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
      <Modal
        visible={showTicketModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => { setShowTicketModal(false); setTicketQuantities({}); }}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '80%' }}>
            {/* Handle bar */}
            <View style={{ width: 40, height: 4, backgroundColor: '#e0e0e0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />

            <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 20, color: '#1A1A1A', marginBottom: 4 }}>
              Select Tickets
            </Text>
            <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 14, color: '#666', marginBottom: 20 }} numberOfLines={1}>
              {event?.name}
            </Text>

            {(() => {
              const ticketsToRender = event?.tickets?.length > 0 
                ? event.tickets 
                : [{
                    _id: event?._id || "default",
                    name: event?.isTicket ? "Standard Ticket" : "Free Entry",
                    price: event?.ticketAmount || 0,
                    description: "General Admission"
                  }];

              return (
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }}>
                  {ticketsToRender.map((ticket, idx) => (
                    <View key={ticket._id || ticket.id || idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: '#1A1A1A' }}>{ticket.name}</Text>
                        <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 13, color: ticket.price > 0 ? '#5A31F4' : '#22C55E', marginTop: 2 }}>
                          {ticket.price > 0 ? `₦${ticket.price?.toLocaleString()}` : 'Free'}
                        </Text>
                        {ticket.description ? (
                          <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 12, color: '#999', marginTop: 2 }} numberOfLines={2}>{ticket.description}</Text>
                        ) : null}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <TouchableOpacity
                          onPress={() => updateTicketQuantity(ticket._id, -1)}
                          style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3EDFF', justifyContent: 'center', alignItems: 'center' }}
                        >
                          <Ionicons name="remove" size={18} color="#5A31F4" />
                        </TouchableOpacity>
                        <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#1A1A1A', minWidth: 20, textAlign: 'center' }}>
                          {ticketQuantities[ticket._id] || 0}
                        </Text>
                        <TouchableOpacity
                          onPress={() => updateTicketQuantity(ticket._id, 1)}
                          style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#5A31F4', justifyContent: 'center', alignItems: 'center' }}
                        >
                          <Ionicons name="add" size={18} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              );
            })()}

            {/* Total */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 16 }}>
              <Text style={{ fontFamily: 'Poppins_500Medium', fontSize: 15, color: '#666' }}>Total</Text>
              <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 22, color: '#1A1A1A' }}>
                ₦{getTicketTotal().toLocaleString()}
              </Text>
            </View>

            {/* Action Buttons (Unconditionally Rendered) */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => { setShowTicketModal(false); setTicketQuantities({}); }}
                style={{ flex: 1, paddingVertical: 15, borderRadius: 14, borderWidth: 1.5, borderColor: '#E0E0E0', alignItems: 'center' }}
                disabled={purchasingTickets}
              >
                <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: '#666' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handlePurchaseTickets}
                style={{ flex: 2, paddingVertical: 15, borderRadius: 14, backgroundColor: '#5A31F4', alignItems: 'center', justifyContent: 'center' }}
                disabled={purchasingTickets}
              >
                {purchasingTickets ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: '#fff' }}>Checkout</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  backBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : 42,
    left: 16,
    zIndex: 100,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center", alignItems: "center",
  },
  floatingStatusBadge: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : 42,
    right: 16,
    zIndex: 100,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  floatingStatusText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    color: "#fff",
  },
  mediaContainer: {
    width, height: height * 0.52,
    backgroundColor: "#000",
  },
  mediaSlide: {
    width, height: height * 0.52,
    position: "relative",
  },
  media: { width: "100%", height: "100%", objectFit: "cover" },
  videoOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: "center", alignItems: "center",
  },
  playWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center", alignItems: "center", paddingLeft: 4,
  },
  expandBtn: {
    position: "absolute", top: 12, right: 12,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center", alignItems: "center",
  },
  mediaCounter: {
    position: "absolute", bottom: 16, right: 16,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20,
  },
  mediaCounterText: { fontFamily: "Poppins_500Medium", fontSize: 11, color: "#FFF" },
  dots: {
    position: "absolute", bottom: 14, left: 0, right: 0,
    flexDirection: "row", justifyContent: "center", gap: 5,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.4)" },
  dotActive: { width: 18, backgroundColor: "#FFF" },
  actionBar: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 8, paddingTop: 12, paddingBottom: 6,
  },
  actionBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 7, paddingVertical: 6,
  },
  actionCount: { fontFamily: "Poppins_500Medium", fontSize: 14, color: "#1A1A1A" },
  likesRow: { paddingHorizontal: 16, paddingBottom: 4 },
  likesText: { fontFamily: "Poppins_600SemiBold", fontSize: 13, color: "#1A1A1A" },
  infoSection: {
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, backgroundColor: "#FFF",
  },
  nameRow: {
    flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap",
  },
  placeName: { fontFamily: "Poppins_700Bold", fontSize: 22, color: "#1A1A1A", flex: 1 },
  optionsIcon: { padding: 4 },
  metaRow: {
    flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10, flexWrap: "wrap",
  },
  starsRow: { flexDirection: "row" },
  ratingNum: { fontFamily: "Poppins_700Bold", fontSize: 14, color: "#1A1A1A" },
  metaDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#C4B5FD" },
  priceRange: { fontFamily: "Poppins_700Bold", fontSize: 14, color: "#FAB843" },
  cityText: { fontFamily: "Poppins_500Medium", fontSize: 13, color: "#5A31F4" },
  addressRow: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginBottom: 14 },
  addressText: { fontFamily: "Poppins_400Regular", fontSize: 13, color: "#555", flex: 1, lineHeight: 20 },
  mapsBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#5A31F4", paddingHorizontal: 18, paddingVertical: 12,
    borderRadius: 14, alignSelf: "flex-start", marginBottom: 20,
    shadowColor: "#5A31F4", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 6,
  },
  mapsBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: "#FFF" },
  sectionTitle: { fontFamily: "Poppins_700Bold", fontSize: 15, color: "#1A1A1A", marginBottom: 8, marginTop: 4 },
  description: { fontFamily: "Poppins_400Regular", fontSize: 14, color: "#444", lineHeight: 22 },
  readMore: { fontFamily: "Poppins_600SemiBold", fontSize: 13, color: "#5A31F4", marginTop: 6 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14, marginBottom: 4 },
  tag: { backgroundColor: "#F3EDFF", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  tagText: { fontFamily: "Poppins_400Regular", fontSize: 12, color: "#5A31F4" },
  postedByRow: {
    flexDirection: "row", alignItems: "center", gap: 10, marginTop: 20, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: "#F0F0F0", marginBottom: 4,
  },
  postedAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#ddd", borderWidth: 2, borderColor: "#5A31F4" },
  postedByLabel: { fontFamily: "Poppins_400Regular", fontSize: 11, color: "#999" },
  postedByName: { fontFamily: "Poppins_600SemiBold", fontSize: 13, color: "#1A1A1A" },
  postedTime: { fontFamily: "Poppins_400Regular", fontSize: 11, color: "#999", marginLeft: "auto" },
  
  bottomCtaRow: {
    flexDirection: "row", alignItems: "center", gap: 12, marginTop: 24, paddingBottom: 10,
  },
  rateBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: "#E8DBFF", backgroundColor: "#F3EDFF",
  },
  rateBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: "#5A31F4" },
  interestedBtn: {
    flex: 1, backgroundColor: "#5A31F4", paddingVertical: 14, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#5A31F4", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 6,
  },
  interestedText: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: "#FFF" },

  commentsSection: {
    paddingHorizontal: 16, paddingTop: 16, borderTopWidth: 6, borderTopColor: "#F2F2F2", marginTop: 8,
  },

  fsContainer: { flex: 1, backgroundColor: "#000", justifyContent: "center" },
  fsCloseBtn: {
    position: "absolute", top: Platform.OS === "ios" ? 54 : 30, right: 20, zIndex: 10,
    padding: 10, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 25,
  },
  fsSlide: { width, height: "100%", justifyContent: "center", alignItems: "center" },
  fsMedia: { width: "100%", height: "100%" },

  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  loadingText: { marginTop: 10, fontFamily: "Poppins_400Regular", color: "#666" },

  // --- Modals below ---
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  optionsMenu: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  optionsTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 18, color: "#333", marginBottom: 20, textAlign: "center" },
  optionItem: { flexDirection: "row", alignItems: "center", paddingVertical: 16, paddingHorizontal: 20, borderRadius: 12, backgroundColor: "#F9FAFB", marginBottom: 12 },
  optionText: { fontFamily: "Poppins_500Medium", fontSize: 16, color: "#333", marginLeft: 12 },
  deleteOption: { backgroundColor: "#FEF2F2" },
  deleteText: { color: "#ff4444" },
  cancelOption: { marginTop: 8, paddingVertical: 16, alignItems: "center" },
  cancelText: { fontFamily: "Poppins_600SemiBold", fontSize: 16, color: "#666" },
  statusOption: { backgroundColor: "#FFF3E0" },
  statusText: { color: "#FF9800" },
  statusMenu: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "80%" },
  statusMenuHeader: { padding: 20, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  statusMenuTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 18, color: "#111827", textAlign: "center" },
  statusMenuSubtitle: { fontFamily: "Poppins_400Regular", fontSize: 14, color: "#6B7280", textAlign: "center", marginTop: 4 },
  statusList: { padding: 20 },
  statusItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderRadius: 16, backgroundColor: "#F9FAFB", marginBottom: 12, borderWidth: 1, borderColor: "transparent" },
  statusItemActive: { backgroundColor: "#F3F4F6", borderColor: "#E5E7EB" },
  statusItemLeft: { flexDirection: "row", alignItems: "center", gap: 16, flex: 1 },
  statusItemLabel: { fontFamily: "Poppins_600SemiBold", fontSize: 16, color: "#111827" },
  statusItemDescription: { fontFamily: "Poppins_400Regular", fontSize: 12, color: "#6B7280", marginTop: 2, paddingRight: 16 },
  reviewMenu: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  starRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 15,
    marginBottom: 20,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 15,
    fontSize: 15,
    fontFamily: "Poppins_400Regular",
    color: "#333",
    backgroundColor: "#F9FAFB",
    minHeight: 120,
    marginBottom: 20,
  },
  submitReviewBtn: {
    backgroundColor: "#5A31F4",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  submitReviewText: {
    color: "#fff",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
  },

  // ── Vendor Section ────────────────────────────────────────────
  vendorSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  vendorSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  vendorCount: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: '#5A31F4',
    backgroundColor: '#F0EBFF',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  vendorCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  vendorCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  vendorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  vendorAvatarFallback: {
    backgroundColor: '#E8DBFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vendorAvatarLetter: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    color: '#5A31F4',
  },
  vendorCardInfo: { flex: 1 },
  vendorCardName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#111827',
  },
  vendorCardCategory: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
  },
  vendorEmptyText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 12,
  },

  // Hire a Vendor CTA
  hireVendorCta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#F0EBFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  hireVendorCtaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  hireVendorIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8DBFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hireVendorTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#5A31F4',
  },
  hireVendorSubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#7C3AED',
    marginTop: 2,
  },
});