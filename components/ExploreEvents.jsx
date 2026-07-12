import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  ScrollView,
  AppState,
} from "react-native";
import { Dimensions, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { truncateText } from "../utils/truncateText";
import api from "../utils/axiosInstance";
import { Video, Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import { useToast } from '../context/ToastContext';
import { Modal } from 'react-native';
import { Image } from 'expo-image';
import ReelsScreen from './ReelsScreen';
import MOCK_REELS from '../constants/reelsMockData';

// Global Audio config to ensure sound plays even when device is on silent mode
try {
  Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    allowsRecordingIOS: false,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
} catch (e) {
  console.log("Audio config error:", e);
}

const { width, height } = Dimensions.get("window");

export default function ExploreEvents({ 
  userId = null, 
  events: propEvents = null,
  isExploreMode = false,
  isDraftMode = false, // New prop to indicate if we're showing drafts
  embedded = false,
  onEndReached = null,
  loadingMore = false,
  ListHeaderComponent = null,
  ListFooterComponent = null,
  contentContainerStyle = null,
  scrollEnabled = true,
}) {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const animations = useRef({}).current;
  const activeIndexes = useRef({}).current;
  const toast = useToast();
  const [fullScreenMedia, setFullScreenMedia] = useState(null); // { media: array, initialIndex: number }
  const [loadingInterest, setLoadingInterest] = useState({});

  // Video playback management
  // Key format: `${eventId}-${mediaIndex}`
  const videoRefs = useRef({});
  const fullScreenVideoRef = useRef(null);
  const [playingVideoKey, setPlayingVideoKey] = useState(null); // which feed video is currently playing

  // Pause all feed card videos (called on app background / fullscreen open)
  const pauseAllFeedVideos = useCallback(async () => {
    const refs = Object.values(videoRefs.current);
    await Promise.all(
      refs.map(async (ref) => {
        try { if (ref) await ref.pauseAsync(); } catch (_) {}
      })
    );
    setPlayingVideoKey(null);
  }, []);

  // Pause the fullscreen video and clear state
  const closeFullScreen = useCallback(async () => {
    try {
      if (fullScreenVideoRef.current) {
        await fullScreenVideoRef.current.pauseAsync();
      }
    } catch (_) {}
    setFullScreenMedia(null);
  }, []);

  // Handle app going to background — stop everything
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active") {
        pauseAllFeedVideos();
        try {
          if (fullScreenVideoRef.current) fullScreenVideoRef.current.pauseAsync();
        } catch (_) {}
      }
    });
    return () => subscription.remove();
  }, [pauseAllFeedVideos]);

  // Ticket modal state (for buying tickets directly from the feed)
  const [ticketModalEvent, setTicketModalEvent] = useState(null);
  const [ticketQuantities, setTicketQuantities] = useState({});
  const [purchasingTickets, setPurchasingTickets] = useState(false);
  const getEventKey = (event, index) => `${event?._id || "event"}-${index}`;
  const isRenderableEvent = (event) => event && typeof event === "object" && event._id;
  const safeText = (value, fallback = "") => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === "string" || typeof value === "number") return String(value);
    return fallback;
  };

  useEffect(() => {
    const getCurrentUserId = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("user");
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser); // parse the JSON string
        setCurrentUserId(parsedUser);
      }
      } catch (error) {
        console.error("Error getting current user ID:", error);
      }
    };
    
    getCurrentUserId();
    if (propEvents) {
      processEvents(propEvents);
    } else {
      fetchEvents();
    }
  }, [userId, propEvents, isExploreMode, isDraftMode]);

  const processEvents = async (eventsData) => {
    try {
      const shouldShowLoader = events.length === 0;
      if (shouldShowLoader) {
        setLoading(true);
      }
      const token = await AsyncStorage.getItem("token");
      const isGuest = await AsyncStorage.getItem("isGuest");
      const existingEventsById = new Map(
        events.map((event) => [event._id, event])
      );
      
      // Skip comment/like fetching for drafts
      if (isDraftMode) {
        setEvents(eventsData.map(event => {
          const existingEvent = existingEventsById.get(event._id);
          return {
            ...event,
            totalComments:
              existingEvent?.totalComments ??
              event.totalComments ??
              event.commentCount ??
              event.comments?.length ??
              0,
            totalLikes:
              existingEvent?.totalLikes ??
              event.totalLikes ??
              event.likes?.length ??
              event.likeCount ??
              0,
          };
        }));
        setLoading(false);
        return;
      }
      
      if (isGuest === "true" || !token) {
        setEvents(eventsData.map(event => {
          const existingEvent = existingEventsById.get(event._id);
          return {
            ...event,
            totalComments:
              existingEvent?.totalComments ??
              event.totalComments ??
              event.commentCount ??
              event.comments?.length ??
              0,
            totalLikes:
              existingEvent?.totalLikes ??
              event.totalLikes ??
              event.likes?.length ??
              event.likeCount ??
              0,
          };
        }));
        setLoading(false);
        return;
      }
      
      const eventsWithCounts = eventsData.map((event) => {
          const existingEvent = existingEventsById.get(event._id);

          return {
            ...event,
            totalComments:
              existingEvent?.totalComments ??
              event.totalComments ??
              event.commentCount ??
              event.comments?.length ??
              0,
            totalLikes:
              existingEvent?.totalLikes ??
              event.totalLikes ??
              event.likes?.length ??
              event.likeCount ??
              0,
          };
        });
      
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
      const isGuest = await AsyncStorage.getItem("isGuest");
      
      let url = "/event";
      let config = {};
      
      if (isExploreMode || isGuest === "true") {
        url = "/event/explore";
        // console.log("Fetching explore events (guest mode)");
      } else if (userId) {
        url = `/event/key?value=${userId}&key=userId`;
        // console.log("Fetching user specific events");
        config = {
          headers: { Authorization: `Bearer ${token}` },
          requiresAuth: true
        };
      } else {
        config = {
          headers: { Authorization: `Bearer ${token}` },
          requiresAuth: true
        };
      }
  
      const response = await api.get(url, config);
  
      if (response.data.success) {
        const data = response?.data?.data;
        const eventsData = Array.isArray(data) ? data : [data];
        await processEvents(eventsData);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
      // Toast.show({
      //   type: "error",
      //   text1: "Failed to load events",
      //   text2: error.response?.data?.message || "Please try again",
      // });
      toast.error(error.response?.data?.error)
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

  const handleLike = async (eventId, isLiked) => {
    if (isDraftMode) {
      Toast.show({
        type: "info",
        text1: "Cannot like draft events",
      });
      return;
    }

    try {
      const token = await AsyncStorage.getItem("token");
      const isGuest = await AsyncStorage.getItem("isGuest");
      
      if (isGuest === "true") {
        Toast.show({
          type: "info",
          text1: "Login Required",
          text2: "Please login to like events",
        });
        return;
      }

      // Optimistic Update
      setEvents((prev) =>
        prev.map((event) => {
          if (event._id === eventId) {
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
              totalLikes: isLiked ? Math.max((event.totalLikes || 0) - 1, 0) : (event.totalLikes || 0) + 1,
            };
          }
          return event;
        })
      );

      const endpoint = isLiked ? "/event/unlike" : "/event/like";

      try {
        await api.post(
          endpoint,
          { eventId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (apiError) {
        // Revert the optimistic update on failure
        setEvents((prev) =>
          prev.map((event) => {
            if (event._id === eventId) {
              return {
                ...event,
                hasLiked: isLiked, // Revert to original
                totalLikes: isLiked ? (event.totalLikes || 0) : Math.max((event.totalLikes || 0) - 1, 0), // Revert to original count
              };
            }
            return event;
          })
        );
        throw apiError; // Throw to the outer catch
      }

    } catch (error) {
      console.error("Error liking event:", error);
      toast.error(error.response?.data?.error || "Failed to like event");
    }
  };

  const handleBookmark = async (eventId, isBookmarked) => {
    if (isDraftMode) {
      Toast.show({
        type: "info",
        text1: "Cannot bookmark draft events",
      });
      return;
    }

    try {
      const token = await AsyncStorage.getItem("token");
      const isGuest = await AsyncStorage.getItem("isGuest");
      
      if (isGuest === "true") {
        Toast.show({
          type: "info",
          text1: "Login Required",
          text2: "Please login to bookmark events",
        });
        return;
      }

      const endpoint = isBookmarked ? "/event/cancel-bookmark" : "/event/bookmark";

      await api.post(
        endpoint,
        { eventId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setEvents((prev) =>
        prev.map((event) =>
          event._id === eventId
            ? { ...event, hasBookmarked: !isBookmarked }
            : event
        )
      );

      // Toast.show({
      //   type: "success",
      //   text1: isBookmarked ? "Bookmark removed" : "Bookmarked",
      // });
    } catch (error) {
      console.error("Error bookmarking event:", error);
      // Toast.show({
      //   type: "error",
      //   text1: "Action failed",
      //   text2: error.response?.data?.message || "Please try again",
      // });
      toast.error(error.response?.data?.error)
    }
  };

  const handleInterested = async (eventId, isInterested) => {
    if (loadingInterest[eventId]) return;

    if (isDraftMode) {
      Toast.show({ type: "info", text1: "Cannot mark interest in draft events" });
      return;
    }

    try {
      setLoadingInterest(prev => ({ ...prev, [eventId]: true }));
      const token = await AsyncStorage.getItem("token");
      const isGuest = await AsyncStorage.getItem("isGuest");

      if (isGuest === "true") {
        Toast.show({ type: "info", text1: "Login Required", text2: "Please login to show interest in events" });
        return;
      }

      if (isInterested) {
        // Cancelling — call cancel endpoint directly
        await api.post("/event/interest-cancel", { eventId }, { headers: { Authorization: `Bearer ${token}` } });
        setEvents(prev => prev.map(ev => ev._id === eventId ? { ...ev, hasInterested: false } : ev));
        toast.success("Interest cancelled");
        return;
      }

      // Always fetch full event details to get the tickets array
      // (the list API doesn't return tickets, but the backend ALWAYS requires a non-empty tickets array)
      const res = await api.get(`/event/key?key=_id&value=${eventId}`, { headers: { Authorization: `Bearer ${token}` } });
      console.log("RAW response data path:", JSON.stringify(res.data, null, 2));
      const fullEvent = Array.isArray(res.data?.data) ? res.data.data[0] : res.data?.data;
      console.log("Full event for ticket modal:", fullEvent?.tickets);
      if (!fullEvent) {
        toast.error("Could not load event details. Please try again.");
        return;
      }

      // ALWAYS open ticket selection modal with full ticket data, even if tickets is empty.
      setTicketModalEvent(fullEvent);
      setTicketQuantities({});
    } catch (error) {
      console.error("Error marking interest:", error.response?.data);
      toast.error(error.response?.data?.error || error.response?.data?.message || "Could not update interest");
    } finally {
      setLoadingInterest(prev => ({ ...prev, [eventId]: false }));
    }
  };

  const updateTicketQty = (ticketId, delta) => {
    setTicketQuantities(prev => {
      const current = prev[ticketId] || 0;
      const next = current + delta;
      if (next < 0) return prev;
      return { ...prev, [ticketId]: next };
    });
  };

  const getTicketTotal = () => {
    let total = 0;
    const ticketsSource = ticketModalEvent?.tickets?.length > 0 
      ? ticketModalEvent.tickets 
      : [{
          _id: ticketModalEvent?._id || "default",
          price: ticketModalEvent?.ticketAmount || 0,
        }];

    Object.entries(ticketQuantities).forEach(([id, qty]) => {
      const t = ticketsSource.find(x => x._id === id);
      if (t && qty > 0) total += (t.price || 0) * qty;
    });
    return total;
  };

  const handlePurchaseFromFeed = async () => {
    const totalQty = Object.values(ticketQuantities).reduce((a, b) => a + b, 0);
    if (totalQty === 0) {
      Toast.show({ type: "error", text1: "No tickets selected", text2: "Please select at least one ticket." });
      return;
    }
    setPurchasingTickets(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const payload = {
        eventId: ticketModalEvent._id,
        comment: "",
        tickets: Object.entries(ticketQuantities)
          .filter(([_, qty]) => qty > 0)
          .map(([id, qty]) => ({ id, quantity: qty }))
      };
      console.log('the submit event payload', payload)
      const res = await api.post("/event/interest", payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.success) {
        toast.success("Tickets purchased successfully! 🎟️");
        setEvents(prev =>
          prev.map(ev =>
            ev._id === ticketModalEvent._id ? { ...ev, hasInterested: true } : ev
          )
        );
        setTicketModalEvent(null);
        setTicketQuantities({});
      }
    } catch (error) {
      console.error("Purchase error:", error.response?.data);
      Toast.show({ type: "error", text1: "Purchase Failed", text2: error.response?.data?.message || error.response?.data?.error || "Please try again" });
    } finally {
      setPurchasingTickets(false);
    }
  };

  const handleEventPress = (eventId) => {
    // Navigate with isDraft parameter if in draft mode
    if (isDraftMode) {
      router.push(`/(tabs)/Events/${eventId}?isDraft=true`);
    } else {
      router.push(`/(tabs)/Events/${eventId}`);
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
    // Force to UTC components (no timezone offset)
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

  const renderEventCard = (event) => {
    if (!animations[event?._id]) {
      animations[event?._id] = new Animated.Value(1);
    }

    const media = getEventMedia(event);
    const eventOwnerId = event.userId?._id || event.userId || event.user?._id || event.user;
    const isOwnEvent = currentUserId?._id && String(eventOwnerId) === String(currentUserId._id);
    const allMedia = []

    if (event.videos && event.videos.length > 0) {
      event.videos.forEach(uri => 
        allMedia.push({ type: "video", uri })
      )
    }

    if (event.images && event.images.length > 0) {
      event.images.forEach(uri => 
        allMedia.push({ type: "image", uri })
      )
    }

    if (allMedia.length === 0) {
      allMedia.push({
        type: "image",
        uri: "https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=800"
      })
    }

    const mediaCount = allMedia.length

    if (activeIndexes[event._id] === undefined) {
      activeIndexes[event._id] = 0
    }

    return (
      <View style={styles.eventCard}>

        {/* ── Header: Avatar + Name + Location + Price badge ── */}
        <TouchableOpacity 
          style={styles.cardHeader}
          activeOpacity={0.85}
          onPress={() => handleEventPress(event._id)}
        >
          <View style={styles.hostLeft}>
            {/* Avatar with story-ring border */}
            <View style={styles.avatarRing}>
              <Image
                source={{ uri: event.userId?.profile_picture || 
                  event.user?.profile_picture ||
                  "https://cdn-icons-png.flaticon.com/512/149/149071.png" }}
                style={styles.hostAvatar}
              />
            </View>
            <View style={styles.hostInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Text style={styles.hostName}>
                  {event.userId?.firstname || event.user?.firstname || "Unknown"}{" "}
                  {event.userId?.lastname || event.user?.lastname || ""}
                </Text>
                {/* Draft badge inline */}
                {isDraftMode && (
                  <View style={styles.draftBadge}>
                    <Text style={styles.draftBadgeText}>DRAFT</Text>
                  </View>
                )}
              </View>
              <View style={styles.hostMeta}>
                <Ionicons name="location-outline" size={10} color="#999" />
                <Text style={styles.hostLocation} numberOfLines={1}>
                  {safeText(event.address, "Location TBA")}
                </Text>
              </View>
            </View>
          </View>

          {/* Right side badges */}
          <View style={styles.headerRight}>
            {event.userStatus === "ongoing" && (
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            )}
            {event.isTicket ? (
              <View style={styles.priceBadge}>
                <Text style={styles.priceBadgeText}>
                  ₦{event.ticketAmount?.toLocaleString()}
                </Text>
              </View>
            ) : (
              <View style={[styles.priceBadge, styles.freeBadge]}>
                <Text style={[styles.priceBadgeText, styles.freeText]}>FREE</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* ── MEDIA (tall, full-width, Instagram-style) ── */}
        <View style={styles.carouselContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(
                e.nativeEvent.contentOffset.x / width
              )
              activeIndexes[event._id] = index
              setEvents(prev => [...prev])
            }}
            style={styles.carouselScroll}
          >
            {allMedia.map((item, idx) => {
              const videoKey = `${event._id}-${idx}`;
              const isPlaying = playingVideoKey === videoKey;

              return (
                <View key={idx} style={styles.carouselSlide}>
                  {item.type === "video" ? (
                    <>
                      <Video
                        ref={(r) => { videoRefs.current[videoKey] = r; }}
                        source={{ uri: item.uri }}
                        style={styles.carouselMedia}
                        resizeMode="cover"
                        shouldPlay={false}
                        isLooping={false}
                        isMuted={false}
                        onPlaybackStatusUpdate={(status) => {
                          // Auto-clear playing state when video finishes
                          if (status.didJustFinish) setPlayingVideoKey(null);
                        }}
                      />
                      {/* Tap-to-play overlay — shows play button when not playing */}
                      <TouchableOpacity
                        style={styles.videoOverlay}
                        activeOpacity={0.85}
                        onPress={async () => {
                          const ref = videoRefs.current[videoKey];
                          if (!ref) return;
                          if (isPlaying) {
                            // Pause this video
                            await ref.pauseAsync();
                            setPlayingVideoKey(null);
                          } else {
                            // Pause any other playing video first
                            await pauseAllFeedVideos();
                            await ref.playAsync();
                            setPlayingVideoKey(videoKey);
                          }
                        }}
                        onLongPress={async () => {
                          // Long press opens fullscreen — pause feed video first
                          await pauseAllFeedVideos();
                          setFullScreenMedia({ media: allMedia, initialIndex: idx });
                        }}
                      >
                        {!isPlaying && (
                          <View style={styles.playIconWrap}>
                            <Ionicons name="play" size={36} color="#FFFFFF" />
                          </View>
                        )}
                        {/* Fullscreen expand icon — top right corner */}
                        <TouchableOpacity
                          style={styles.expandBtn}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          onPress={async () => {
                            await pauseAllFeedVideos();
                            setFullScreenMedia({ media: allMedia, initialIndex: idx });
                          }}
                        >
                          <Ionicons name="expand-outline" size={18} color="#FFF" />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      style={{ flex: 1 }}
                      activeOpacity={0.95}
                      onPress={() => setFullScreenMedia({ media: allMedia, initialIndex: idx })}
                    >
                      <Image
                        source={{ uri: item.uri }}
                        style={styles.carouselMedia}
                        contentFit="cover" transition={200}
                      />
                    </TouchableOpacity>
                  )}

                  {/* Media count — top left */}
                  {mediaCount > 1 && (
                    <View style={styles.mediaCounter}>
                      <Ionicons name="images-outline" size={11} color="#FFFFFF" />
                      <Text style={styles.mediaCounterText}>
                        {idx + 1}/{mediaCount}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>

          {/* Dot indicators */}
          {mediaCount > 1 && (
            <View style={styles.dotsContainer}>
              {allMedia.map((_, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.dot,
                    activeIndexes[event._id] === idx && styles.dotActive
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        {/* ── Action Bar: all on one line — like | comment | share | bookmark | interested ── */}
        <View style={styles.actionBar}>
          {/* Like */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleLike(event._id, event.hasLiked)}
          >
            <Animated.View style={{ transform: [{ scale: animations[event._id] }] }}>
              <Ionicons
                name={event.hasLiked ? "heart" : "heart-outline"}
                size={22}
                color={event.hasLiked ? "#FF3B30" : "#1A1A1A"}
              />
            </Animated.View>
            <Text style={[styles.actionCount, event.hasLiked && { color: "#FF3B30" }]}>
              {event.totalLikes || 0}
            </Text>
          </TouchableOpacity>

          {/* Comment */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push(`/(tabs)/Events/${event._id}?tab=comments`)}
          >
            <Ionicons name="chatbubble-outline" size={22} color="#1A1A1A" />
            <Text style={styles.actionCount}>{event.totalComments || 0}</Text>
          </TouchableOpacity>

          {/* Share */}
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="share-social-outline" size={22} color="#1A1A1A" />
          </TouchableOpacity>

          {/* Spacer */}
          <View style={{ flex: 1 }} />

          {/* Bookmark */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleBookmark(event._id, event.hasBookmarked)}
          >
            <Ionicons
              name={event.hasBookmarked ? "bookmark" : "bookmark-outline"}
              size={22}
              color={event.hasBookmarked ? "#5A31F4" : "#1A1A1A"}
            />
          </TouchableOpacity>

          {/* Interested */}
          {!isDraftMode && !isOwnEvent && (
            <TouchableOpacity
              style={[styles.interestedBtn, event.hasInterested && styles.interestedBtnActive]}
              onPress={() => handleInterested(event._id, event.hasInterested)}
            >
              <Ionicons
                name={event.hasInterested ? "star" : "star-outline"}
                size={13}
                color={event.hasInterested ? "#FAB843" : "#5A31F4"}
              />
              <Text style={[styles.interestedText, event.hasInterested && styles.interestedTextActive]}>
                {event.hasInterested ? "Going" : "Interested"}
              </Text>
            </TouchableOpacity>
          )}
          {isDraftMode && (
            <TouchableOpacity
              style={styles.draftBtn}
              onPress={() => router.replace(`/(tabs)/Events/${event._id}?isDraft=true`)}
            >
              <Text style={styles.draftBtnText}>View Draft</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Likes count ── */}
        {(event.totalLikes || 0) > 0 && (
          <View style={styles.likesRow}>
            <Text style={styles.likesText}>
              {(event.totalLikes || 0).toLocaleString()} {event.totalLikes === 1 ? "like" : "likes"}
            </Text>
          </View>
        )}

        {/* ── Caption: Event name + description + view comments ── */}
        <TouchableOpacity
          onPress={() => handleEventPress(event._id)}
          style={styles.captionContainer}
          activeOpacity={0.8}
        >
          <Text style={styles.captionEventName}>{safeText(event.name, "Untitled event")}</Text>
          <Text style={styles.captionHost} numberOfLines={1}>
            by {event.userId?.firstname || event.user?.firstname || "Unknown"}{" "}
            {event.userId?.lastname || event.user?.lastname || ""}
          </Text>
          <Text style={styles.captionDescription} numberOfLines={3}>
            {safeText(event.description, "")}
          </Text>
          {(event.totalComments || 0) > 0 && (
            <Text
              style={styles.viewComments}
              onPress={() => router.push(`/(tabs)/Events/${event._id}?tab=comments`)}
            >
              View all {event.totalComments} comments
            </Text>
          )}
        </TouchableOpacity>

        {/* ── Footer strip: Date · Time · Capacity ── */}
        <TouchableOpacity
          style={styles.metaStrip}
          onPress={() => handleEventPress(event._id)}
          activeOpacity={0.85}
        >
          <Ionicons name="calendar-outline" size={12} color="#5A31F4" />
          <Text style={styles.metaText}>{formatDate(event.start)}</Text>
          <View style={styles.metaDot} />
          <Ionicons name="time-outline" size={12} color="#5A31F4" />
          <Text style={styles.metaText}>{formatTime(event.start)}</Text>
          <View style={styles.metaDot} />
          <Ionicons name="people-outline" size={12} color="#5A31F4" />
          <Text style={styles.metaText}>{safeText(event.capacity, "Open")} cap.</Text>
          {event.isTicket && (
            <>
              <View style={styles.metaDot} />
              <Ionicons name="ticket-outline" size={12} color="#FAB843" />
              <Text style={[styles.metaText, { color: "#FAB843" }]}>
                ₦{safeText(event.ticketAmount, "0")}
              </Text>
            </>
          )}
          {!event.isTicket && (
            <>
              <View style={styles.metaDot} />
              <Ionicons name="ticket-outline" size={12} color="#22C55E" />
              <Text style={[styles.metaText, { color: "#22C55E" }]}>Free</Text>
            </>
          )}
        </TouchableOpacity>

        {/* ── Hashtag pills from event category / address ── */}
        {(event.category || event.address) && (
          <View style={styles.tagsRow}>
            {event.category && (
              <View style={styles.tagPill}>
                <Text style={styles.tagPillText}>#{String(event.category).toLowerCase().replace(/\s+/g, "")}</Text>
              </View>
            )}
            {event.address && (
              <View style={styles.tagPill}>
                <Text style={styles.tagPillText} numberOfLines={1}>
                  📍 {safeText(event.address, "").split(",")[0]}
                </Text>
              </View>
            )}
            {event.isTicket && (
              <View style={[styles.tagPill, { backgroundColor: "#FEF3E2" }]}>
                <Text style={[styles.tagPillText, { color: "#C08000" }]}>#ticketed</Text>
              </View>
            )}
          </View>
        )}

      </View>
    );
  };

  const renderSponsoredCard = (event) => {
    if (!animations[event?._id]) {
      animations[event?._id] = new Animated.Value(1);
    }

    const media = getEventMedia(event);
    const eventOwnerId = event.userId?._id || event.userId || event.user?._id || event.user;
    const isOwnEvent = currentUserId?._id && String(eventOwnerId) === String(currentUserId._id);
    const allMedia = []

    if (event.videos && event.videos.length > 0) {
      event.videos.forEach(uri => 
        allMedia.push({ type: "video", uri })
      )
    }

    if (event.images && event.images.length > 0) {
      event.images.forEach(uri => 
        allMedia.push({ type: "image", uri })
      )
    }

    if (allMedia.length === 0) {
      allMedia.push({
        type: "image",
        uri: "https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=800"
      })
    }

    const mediaCount = allMedia.length

    if (activeIndexes[event._id] === undefined) {
      activeIndexes[event._id] = 0
    }

    return (
      <View style={styles.sponsoredCard}>

        {/* Sponsored Label Bar */}
        <View style={styles.sponsoredLabelBar}>
          <View style={styles.sponsoredLabelLeft}>
            <Ionicons name="flash" size={13} color="#F59E0B" />
            <Text style={styles.sponsoredLabelText}>Sponsored</Text>
          </View>
          <Text style={styles.whyAdText}>Why this ad?</Text>
        </View>

        {/* Host Row — same structure as regular card */}
        <TouchableOpacity
          style={styles.cardHeader}
          activeOpacity={0.7}
          onPress={() => handleEventPress(event._id)}
        >
          <View style={styles.hostLeft}>
            <Image
              source={{
                uri:
                  event.userId?.profile_picture ||
                  event.user?.profile_picture ||
                  "https://cdn-icons-png.flaticon.com/512/149/149071.png",
              }}
              style={styles.hostAvatar}
            />
            <View style={styles.hostInfo}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={styles.hostName}>
                  {event.userId?.firstname ||
                    event.user?.firstname ||
                    "Unknown"}{" "}
                  {event.userId?.lastname || event.user?.lastname || ""}
                </Text>
                <View style={styles.promotedBadge}>
                  <Text style={styles.promotedBadgeText}>✦ Promoted</Text>
                </View>
              </View>
              <View style={styles.hostMeta}>
                <Ionicons name="location-outline" size={11} color="#999" />
                <Text style={styles.hostLocation} numberOfLines={1}>
                  {safeText(event.address, "Location TBA")}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.headerRight}>
            {event.isTicket ? (
              <View style={styles.priceBadge}>
                <Text style={styles.priceBadgeText}>
                  ₦{event.ticketAmount?.toLocaleString()}
                </Text>
              </View>
            ) : (
              <View style={[styles.priceBadge, styles.freeBadge]}>
                <Text style={[styles.priceBadgeText, styles.freeText]}>
                  FREE
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Description */}
        <TouchableOpacity
          onPress={() => handleEventPress(event._id)}
          style={styles.descriptionContainer}
          activeOpacity={0.8}
        >
          <Text style={styles.eventNameInline}>{safeText(event.name, "Untitled event")}</Text>
          <Text style={styles.description}>
            {truncateText(safeText(event.description), 120, "long")}
          </Text>
        </TouchableOpacity>

        {/* Media */}
        <View style={styles.carouselContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(
                e.nativeEvent.contentOffset.x / width
              )
              activeIndexes[event._id] = index
              setEvents(prev => [...prev])
            }}
            style={styles.carouselScroll}
          >
            {allMedia.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.carouselSlide}
                onPress={() => setFullScreenMedia({ media: allMedia, initialIndex: idx })}
                activeOpacity={0.9}
              >
                {item.type === "video" ? (
                  <Video
                    source={{ uri: item.uri }}
                    style={styles.carouselMedia}
                    useNativeControls
                    resizeMode="cover"
                    isLooping
                    shouldPlay={false}
                  />
                ) : (
                  <>
                    <Image
                      source={{ uri: item.uri }}
                      style={styles.carouselMedia}
                      contentFit="cover" transition={200}
                    />
                    <View 
                      style={styles.sponsoredMediaOverlay} 
                      pointerEvents="none" 
                    />
                  </>
                )}

                {/* Media index counter — top right */}
                {mediaCount > 1 && (
                  <View style={styles.mediaCounter}>
                    <Ionicons 
                      name="images-outline" 
                      size={11} 
                      color="#FFFFFF" 
                    />
                    <Text style={styles.mediaCounterText}>
                      {idx + 1}/{mediaCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Dot indicators — only shown if more than 1 */}
          {mediaCount > 1 && (
            <View style={styles.dotsContainer}>
              {allMedia.map((_, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.dot,
                    activeIndexes[event._id] === idx 
                      && styles.dotActive
                  ]}
                />
              ))}
            </View>
          )}

          {/* Left/Right swipe hint — only on first render
              for events with multiple media */}
          {mediaCount > 1 && (
            <View style={styles.swipeHint} pointerEvents="none">
              <View style={styles.swipeHintLeft}>
                <Ionicons 
                  name="chevron-back" 
                  size={20} 
                  color="rgba(255,255,255,0.6)" 
                />
              </View>
              <View style={styles.swipeHintRight}>
                <Ionicons 
                  name="chevron-forward" 
                  size={20} 
                  color="rgba(255,255,255,0.6)" 
                />
              </View>
            </View>
          )}
        </View>

        {/* Meta Strip */}
        <View style={styles.sponsoredMetaStrip}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={13} color="#D97706" />
            <Text style={styles.sponsoredMetaText}>
              {formatDate(event.start)}
            </Text>
          </View>
          <View style={styles.metaDot} />
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={13} color="#D97706" />
            <Text style={styles.sponsoredMetaText}>
              {formatTime(event.start)}
            </Text>
          </View>
          <View style={styles.metaDot} />
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={13} color="#D97706" />
            <Text style={styles.sponsoredMetaText}>
              {safeText(event.capacity, "Open")} capacity
            </Text>
          </View>
        </View>

        {/* CTA Row */}
        <View style={styles.ctaRow}>
          <View style={styles.ctaLeft}>
            <Text style={styles.ctaEventName} numberOfLines={1}>
              {safeText(event.name, "Untitled event")}
            </Text>
            {event.isTicket ? (
              <Text style={styles.ctaPriceText}>
                ₦{event.ticketAmount?.toLocaleString()} per ticket
              </Text>
            ) : (
              <Text style={styles.ctaFreeText}>Free Entry</Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => handleEventPress(event._id)}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaButtonText}>
              {event.isTicket ? "Get Tickets" : "Learn More"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Action Bar — identical to regular card */}
        <View style={styles.actionBar}>
          <View style={styles.actionLeft}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleLike(event._id, event.hasLiked)}
            >
              <Animated.View
                style={{ transform: [{ scale: animations[event._id] }] }}
              >
                <Ionicons
                  name={event.hasLiked ? "heart" : "heart-outline"}
                  size={22}
                  color={event.hasLiked ? "#FF3B30" : "#555"}
                />
              </Animated.View>
              <Text
                style={[
                  styles.actionCount,
                  event.hasLiked && { color: "#FF3B30" },
                ]}
              >
                {event.totalLikes || 0}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() =>
                router.push(`/(tabs)/Events/${event._id}?tab=comments`)
              }
            >
              <Ionicons name="chatbubble-outline" size={20} color="#555" />
              <Text style={styles.actionCount}>{event.totalComments || 0}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn}>
              <Ionicons name="share-social-outline" size={20} color="#555" />
            </TouchableOpacity>
          </View>

          <View style={styles.actionRight}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleBookmark(event._id, event.hasBookmarked)}
            >
              <Ionicons
                name={event.hasBookmarked ? "bookmark" : "bookmark-outline"}
                size={20}
                color={event.hasBookmarked ? "#5A31F4" : "#555"}
              />
            </TouchableOpacity>

            {!isDraftMode && !isOwnEvent && (
              <TouchableOpacity
                style={[
                  styles.sponsoredInterestedBtn,
                  event.hasInterested && styles.interestedBtnActive,
                ]}
                onPress={() =>
                  handleInterested(event._id, event.hasInterested)
                }
              >
                <Ionicons
                  name={event.hasInterested ? "star" : "star-outline"}
                  size={14}
                  color={event.hasInterested ? "#FAB843" : "#D97706"}
                />
                <Text
                  style={[
                    styles.sponsoredInterestedText,
                    event.hasInterested && styles.interestedTextActive,
                  ]}
                >
                  {event.hasInterested ? "Going" : "Interested"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

      </View>
    );
  };

  const renderContent = () => {
    if (embedded) {
      return (
        <View style={styles.embeddedContainer}>
          {events.filter(isRenderableEvent).map((event, index) => {
            const isSponsored = event.isSponsored === true ||
              (event.isSponsored === undefined && index % 4 === 3)
            return (
              <View key={getEventKey(event, index)}>
                {isSponsored
                  ? renderSponsoredCard(event)
                  : renderEventCard(event)}
              </View>
            )
          })}
        </View>
      );
    }

    return (
      <FlatList
        data={events.filter(isRenderableEvent)}
        keyExtractor={getEventKey}
        scrollEnabled={scrollEnabled}
        renderItem={({ item, index }) => {
          const isSponsored = item.isSponsored === true ||
            (item.isSponsored === undefined && index % 4 === 3)
          return isSponsored
            ? renderSponsoredCard(item)
            : renderEventCard(item)
        }}
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        removeClippedSubviews={Platform.OS === "android"}
        initialNumToRender={3}
        maxToRenderPerBatch={4}
        windowSize={5}
        updateCellsBatchingPeriod={80}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.6}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={ListFooterComponent || (
          loadingMore ? (
            <View style={styles.loadingMoreContainer}>
              <ActivityIndicator size="small" color="#5A31F4" />
              <Text style={styles.loadingMoreText}>Loading more events...</Text>
            </View>
          ) : null
        )}
        contentContainerStyle={contentContainerStyle}
      />
    );
  };

  return (
    <>
      {renderContent()}



        {/* Full Screen Media Viewer */}
        <Modal
          visible={!!fullScreenMedia}
          transparent={true}
          animationType="fade"
          onRequestClose={closeFullScreen}
        >
          <View style={styles.fullScreenContainer}>
            <TouchableOpacity 
              style={styles.fullScreenCloseBtn}
              onPress={closeFullScreen}
            >
              <Ionicons name="close" size={30} color="#FFF" />
            </TouchableOpacity>
            
            {fullScreenMedia && (
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                contentOffset={{ x: fullScreenMedia.initialIndex * width, y: 0 }}
                style={styles.fullScreenScroll}
                onMomentumScrollEnd={async (e) => {
                  // Pause when the user swipes to a different slide
                  try {
                    if (fullScreenVideoRef.current) {
                      await fullScreenVideoRef.current.pauseAsync();
                    }
                  } catch (_) {}
                }}
              >
                {fullScreenMedia.media.map((item, index) => (
                  <View key={index} style={styles.fullScreenSlide}>
                    {item.type === "video" ? (
                      <Video
                        // Only attach the ref to the initially focused slide
                        ref={index === fullScreenMedia.initialIndex ? fullScreenVideoRef : null}
                        source={{ uri: item.uri }}
                        style={styles.fullScreenMedia}
                        useNativeControls
                        resizeMode="contain"
                        shouldPlay={index === fullScreenMedia.initialIndex}
                        isLooping={false}
                        isMuted={false}
                        volume={1.0}
                      />
                    ) : (
                      <Image
                        source={{ uri: item.uri }}
                        style={styles.fullScreenMedia}
                        contentFit="contain" transition={200}
                      />
                    )}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </Modal>

      {/* Ticket Selection Modal — opens inline from the feed */}
      <Modal
        visible={!!ticketModalEvent}
        animationType="slide"
        transparent={true}
        onRequestClose={() => { setTicketModalEvent(null); setTicketQuantities({}); }}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '80%' }}>
            {/* Handle bar */}
            <View style={{ width: 40, height: 4, backgroundColor: '#e0e0e0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />

            <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 20, color: '#1A1A1A', marginBottom: 4 }}>
              Select Tickets
            </Text>
            <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 14, color: '#666', marginBottom: 20 }} numberOfLines={1}>
              {ticketModalEvent?.name}
            </Text>

            {(() => {
              const ticketsToRender = ticketModalEvent?.tickets?.length > 0 
                ? ticketModalEvent.tickets 
                : [{
                    _id: ticketModalEvent?._id || "default",
                    name: ticketModalEvent?.isTicket ? "Standard Ticket" : "Free Entry",
                    price: ticketModalEvent?.ticketAmount || 0,
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
                          onPress={() => updateTicketQty(ticket._id, -1)}
                          style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3EDFF', justifyContent: 'center', alignItems: 'center' }}
                        >
                          <Ionicons name="remove" size={18} color="#5A31F4" />
                        </TouchableOpacity>
                        <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#1A1A1A', minWidth: 20, textAlign: 'center' }}>
                          {ticketQuantities[ticket._id] || 0}
                        </Text>
                        <TouchableOpacity
                          onPress={() => updateTicketQty(ticket._id, 1)}
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
                onPress={() => { setTicketModalEvent(null); setTicketQuantities({}); }}
                style={{ flex: 1, paddingVertical: 15, borderRadius: 14, borderWidth: 1.5, borderColor: '#E0E0E0', alignItems: 'center' }}
                disabled={purchasingTickets}
              >
                <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: '#666' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handlePurchaseFromFeed}
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
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },
  embeddedContainer: {
    backgroundColor: "#F8F8F8",
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
  loadingMoreContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    gap: 10,
  },
  loadingMoreText: {
    fontFamily: "Poppins_400Regular",
    color: "#666",
    fontSize: 13,
  },
  emptyText: {
    marginTop: 10,
    fontFamily: "Poppins_400Regular",
    color: "#999",
    fontSize: 16,
  },
  draftBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: "#FDECCD",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#FAB843",
  },
  draftBadgeText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 10,
    color: "#FAB843",
  },
  eventCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 0,
    marginBottom: 2,
    borderBottomWidth: 6,
    borderBottomColor: "#F2F2F2",
    paddingBottom: 0,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  hostLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 9,
  },
  avatarRing: {
    padding: 2,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#5A31F4",
  },
  hostAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ddd",
  },
  hostInfo: {
    flex: 1,
  },
  hostName: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#1A1A1A",
  },
  hostMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 1,
  },
  hostLocation: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "#999",
    flex: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FF3B30",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
  liveText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 9,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  priceBadge: {
    backgroundColor: "#FDECCD",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FAB843",
  },
  priceBadgeText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 11,
    color: "#B8860B",
  },
  freeBadge: {
    backgroundColor: "#E6F9F0",
    borderColor: "#22C55E",
  },
  freeText: {
    color: "#15803D",
  },
  descriptionContainer: {
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  eventNameInline: {
    fontFamily: "Poppins_700Bold",
    fontSize: 15,
    color: "#1A1A1A",
    marginBottom: 4,
  },
  description: {
    fontFamily: "Poppins_400Regular",
    color: "#555",
    fontSize: 13,
    lineHeight: 20,
  },
  /* Instagram-style caption area */
  captionContainer: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 8,
  },
  captionHost: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#1A1A1A",
    lineHeight: 20,
  },
  captionEventName: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: "#1A1A1A",
  },
  captionDescription: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: "#555",
    lineHeight: 19,
    marginTop: 1,
  },
  viewComments: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: "#999",
    marginTop: 5,
  },
  likesRow: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 0,
  },
  likesText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#1A1A1A",
  },
  flierContainer: {
    width: "100%",
    height: height * 0.60,
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
    borderRadius: 0,
  },
  flier: {
    width: "100%",
    height: "100%",
  },
  metaStrip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F2F2F2",
    gap: 5,
    flexWrap: "wrap",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  metaText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "#5A31F4",
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#C4B5FD",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  tagPill: {
    backgroundColor: "#F3EDFF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  tagPillText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "#5A31F4",
  },
  /* Instagram-style action bar: icons only, no border, generous padding */
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 4,
  },
  actionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionCount: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: "#1A1A1A",
  },
  interestedBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F3EDFF",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#5A31F4",
  },
  interestedBtnActive: {
    backgroundColor: "#FDECCD",
    borderColor: "#FAB843",
  },
  draftBtn: {
    backgroundColor: "#FAB843",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  draftBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#FFFFFF",
  },
  interestedText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#5A31F4",
  },
  interestedTextActive: {
    color: "#B8860B",
  },
  sponsoredCard: {
    backgroundColor: "#FFFDF5",
    borderLeftWidth: 3,
    borderLeftColor: "#FAB843",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#FDE68A",
  },
  sponsoredLabelBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#FDE68A",
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  sponsoredLabelLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flex: 1,
  },
  sponsoredLabelText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#B45309",
  },
  whyAdText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "#B45309",
    opacity: 0.7,
  },
  promotedBadge: {
    backgroundColor: "#FEF3C7",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  promotedBadgeText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 9,
    color: "#D97706",
  },
  sponsoredMediaOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(250, 184, 67, 0.06)",
  },
  sponsoredMetaStrip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#FFFBEB",
    gap: 6,
  },
  sponsoredMetaText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "#D97706",
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#FDE68A",
  },
  ctaLeft: {
    flex: 1,
    marginRight: 12,
  },
  ctaEventName: {
    fontFamily: "Poppins_700Bold",
    fontSize: 14,
    color: "#1A1A1A",
  },
  ctaPriceText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: "#D97706",
    marginTop: 2,
  },
  ctaFreeText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: "#15803D",
    marginTop: 2,
  },
  ctaButton: {
    backgroundColor: "#FAB843",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  ctaButtonText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 12,
    color: "#1A1A1A",
  },
  sponsoredInterestedBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FAB843",
  },
  sponsoredInterestedText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#D97706",
  },
  carouselContainer: {
    width: "100%",
    height: height * 0.60,
    position: "relative",
    backgroundColor: "#000",
    overflow: "hidden",
  },
  carouselScroll: {
    width: "100%",
    height: "100%",
  },
  carouselSlide: {
    width: width,
    height: height * 0.60,
    position: "relative",
  },
  carouselMedia: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  /* Full-cover overlay that sits above the video — handles tap-to-play */
  videoOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  playIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    /* nudge the play icon 2px right to visually centre it */
    paddingLeft: 4,
  },
  expandBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.50)",
    justifyContent: "center",
    alignItems: "center",
  },
  mediaCounter: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  mediaCounterText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    color: "#FFFFFF",
  },
  dotsContainer: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.45)",
  },
  dotActive: {
    width: 18,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
  swipeHint: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  swipeHintLeft: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  swipeHintRight: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
  },
  fullScreenCloseBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 30,
    right: 20,
    zIndex: 10,
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 25,
  },
  fullScreenScroll: {
    flex: 1,
  },
  fullScreenSlide: {
    width: width,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenMedia: {
    width: "100%",
    height: "100%",
  },
});
