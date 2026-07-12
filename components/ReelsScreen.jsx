import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { Video } from "expo-av";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import api from "../utils/axiosInstance";
import { useToast } from "../context/ToastContext";

const { width, height } = Dimensions.get("window");

const viewabilityConfig = {
  itemVisiblePercentThreshold: 80,
};

const PLACEHOLDER_IMAGE =
  "https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=800";

const getEventMedia = (event) => {
  if (event?.videos && event.videos.length > 0) {
    return { type: "video", uri: event.videos[0] };
  }
  if (event?.images && event.images.length > 0) {
    return { type: "image", uri: event.images[0] };
  }
  return {
    type: "image",
    uri: PLACEHOLDER_IMAGE,
  };
};

const formatDate = (dateString) => {
  if (!dateString) return "Date TBA";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Date TBA";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatPrice = (amount) => {
  const value = Number(amount || 0);
  return `₦${value.toLocaleString()}`;
};

const getOrganizerName = (event) => {
  const firstName = event?.userId?.firstname || event?.user?.firstname || "Unknown";
  const lastName = event?.userId?.lastname || event?.user?.lastname || "";
  return `${firstName} ${lastName}`.trim();
};

const getOrganizerAvatar = (event) =>
  event?.userId?.profile_picture ||
  event?.user?.profile_picture ||
  "https://cdn-icons-png.flaticon.com/512/149/149071.png";

const getStatusBadge = (status) => {
  if (status === "ongoing") {
    return {
      label: "🔴 Happening Now",
      backgroundColor: "rgba(255,59,48,0.85)",
    };
  }
  if (status === "completed") {
    return {
      label: "✓ Past Event",
      backgroundColor: "rgba(100,100,100,0.85)",
    };
  }
  return {
    label: "📅 Upcoming",
    backgroundColor: "rgba(90,49,244,0.85)",
  };
};

const ReelItem = memo(function ReelItem({
  event,
  index,
  activeIndex,
  muted,
  progressWidth,
  showSwipeHint,
  swipeHintY,
  likeScale,
  onToggleMute,
  onLike,
  onBookmark,
  onInterested,
  onComments,
  onDetails,
  activeTab,
  onTabChange,
}) {
  const media = useMemo(() => getEventMedia(event), [event]);
  const statusBadge = useMemo(
    () => getStatusBadge(event?.userStatus),
    [event?.userStatus]
  );
  const isActive = index === activeIndex;
  const isOwnEvent = event?.isOwnEvent === true;
  const likesCount = event?.totalLikes || event?.likes?.length || event?.likeCount || 0;
  const commentsCount = event?.totalComments || event?.commentCount || 0;

  return (
    <View style={styles.reelItem}>
      {media.type === "video" ? (
        <Video
          source={{ uri: media.uri }}
          resizeMode="cover"
          shouldPlay={isActive}
          isLooping
          isMuted={muted}
          style={styles.backgroundMedia}
        />
      ) : (
        <View style={styles.imageBackground}>
          <Image
            source={{ uri: media.uri }}
            contentFit="cover" transition={200}
            style={styles.backgroundMedia}
          />
          <View style={styles.noVideoPill}>
            <Text style={styles.noVideoText}>No video available</Text>
          </View>
        </View>
      )}

      <View style={styles.topGradient} pointerEvents="none" />
      <View style={styles.bottomGradient} pointerEvents="none" />

      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
      </View>

      <View style={styles.topBar}>
        <View style={styles.tabsRow}>
          <TouchableOpacity 
            style={styles.tabItem}
            activeOpacity={0.8}
            onPress={() => onTabChange("For You")}
          >
            <Text style={[styles.tabText, activeTab === "For You" && styles.tabTextActive]}>For You</Text>
            {activeTab === "For You" && <View style={styles.activeTabUnderline} />}
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.tabItem}
            activeOpacity={0.8}
            onPress={() => onTabChange("Events Near Me")}
          >
            <Text style={[styles.tabText, activeTab === "Events Near Me" && styles.tabTextActive]}>Events Near Me</Text>
            {activeTab === "Events Near Me" && <View style={styles.activeTabUnderline} />}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.muteButton}
          onPress={onToggleMute}
          activeOpacity={0.8}
        >
          <Ionicons
            name={muted ? "volume-mute-outline" : "volume-high-outline"}
            size={24}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.bottomLeft}>
        <View style={styles.organizerRow}>
          <Image
            source={{ uri: getOrganizerAvatar(event) }}
            style={styles.organizerAvatar}
            transition={200}
          />
          <Text style={styles.organizerName} numberOfLines={1}>
            {getOrganizerName(event)}
          </Text>
          {!isOwnEvent && (
            <TouchableOpacity style={styles.followButton} activeOpacity={0.8}>
              <Text style={styles.followText}>Follow</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.captionContainer} onPress={() => onDetails(event)} activeOpacity={0.8}>
          <Text style={styles.eventName} numberOfLines={2}>
            {event?.name || "Untitled event"}
          </Text>
          <Text style={styles.eventDescription} numberOfLines={2}>
            {event?.description || "Tap to view more details"}
          </Text>
        </TouchableOpacity>

        <View style={styles.eventDetailsRow}>
          <Ionicons name="calendar-outline" size={14} color="#FFFFFF" />
          <Text style={styles.eventDetailText} numberOfLines={1}>
            {formatDate(event?.start)}
          </Text>
          <Ionicons name="location-outline" size={14} color="#FFFFFF" />
          <Text style={styles.eventDetailText} numberOfLines={1}>
            {event?.address || "Location TBA"}
          </Text>
        </View>

        <View style={styles.ctaRow}>
          <View
            style={[
              styles.pricePill,
              event?.isTicket ? styles.ticketPill : styles.freePill,
            ]}
          >
            <Text
              style={[
                styles.pricePillText,
                event?.isTicket ? styles.ticketText : styles.freeText,
              ]}
            >
              {event?.isTicket ? formatPrice(event?.ticketAmount) : "FREE ENTRY"}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.interestedButton,
              event?.hasInterested && styles.interestedButtonActive,
            ]}
            onPress={() => onInterested(event)}
            activeOpacity={0.85}
          >
            <Text style={styles.interestedButtonText}>
              {event?.hasInterested ? "✓ Going" : "⭐ Interested"}
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusBadge.backgroundColor },
          ]}
        >
          <Text style={styles.statusBadgeText}>{statusBadge.label}</Text>
        </View>
      </View>

      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => onLike(event)}
          activeOpacity={0.8}
        >
          <Animated.View style={{ transform: [{ scale: likeScale }] }}>
            <Ionicons
              name={event?.hasLiked ? "heart" : "heart-outline"}
              size={30}
              color={event?.hasLiked ? "#FF3B30" : "#FFFFFF"}
            />
          </Animated.View>
          <Text style={styles.actionLabel}>{likesCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => onComments(event)}
          activeOpacity={0.8}
        >
          <Ionicons name="chatbubble-outline" size={28} color="#FFFFFF" />
          <Text style={styles.actionLabel}>{commentsCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} activeOpacity={0.8}>
          <Ionicons name="share-social-outline" size={28} color="#FFFFFF" />
          <Text style={styles.actionLabel}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => onBookmark(event)}
          activeOpacity={0.8}
        >
          <Ionicons
            name={event?.hasBookmarked ? "bookmark" : "bookmark-outline"}
            size={28}
            color={event?.hasBookmarked ? "#FAB843" : "#FFFFFF"}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => onDetails(event)}
          activeOpacity={0.8}
        >
          <Ionicons name="information-circle-outline" size={28} color="#FFFFFF" />
          <Text style={styles.actionLabel}>Details</Text>
        </TouchableOpacity>
      </View>

      {showSwipeHint && (
        <Animated.View
          style={[
            styles.swipeHint,
            { transform: [{ translateY: swipeHintY }] },
          ]}
          pointerEvents="none"
        >
          <Ionicons name="chevron-up" size={20} color="#FFFFFF" />
          <Text style={styles.swipeHintText}>Swipe up for next event</Text>
        </Animated.View>
      )}
    </View>
  );
});

export default function ReelsScreen({
  events,
  isExploreMode = false,
  onInterested,
}) {
  const router = useRouter();
  const toast = useToast();
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("For You");
  const [muted, setMuted] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [localEvents, setLocalEvents] = useState(events);
  const likeAnims = useRef({}).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const swipeHintY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setLocalEvents(events);
  }, [events]);

  useEffect(() => {
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 15000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  }, [activeIndex, progressAnim]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(swipeHintY, {
          toValue: -8,
          duration: 600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(swipeHintY, {
          toValue: 0,
          duration: 600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [swipeHintY]);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    const nextItem = viewableItems?.[0];
    if (nextItem?.index !== null && nextItem?.index !== undefined) {
      setActiveIndex(nextItem.index);
      if (nextItem.index > 0) {
        setHasScrolled(true);
      }
    }
  }).current;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const getLikeAnim = useCallback(
    (eventId) => {
      if (!likeAnims[eventId]) {
        likeAnims[eventId] = new Animated.Value(1);
      }
      return likeAnims[eventId];
    },
    [likeAnims]
  );

  const updateEvent = useCallback((eventId, updater) => {
    setLocalEvents((prev) =>
      prev.map((event) => (event?._id === eventId ? updater(event) : event))
    );
  }, []);

  const showAuthPrompt = useCallback(
    (message) => {
      toast.info(message);
    },
    [toast]
  );

  const handleLike = useCallback(
    async (event) => {
      try {
        const token = await AsyncStorage.getItem("token");
        const isGuest = await AsyncStorage.getItem("isGuest");

        if (isGuest === "true" || !token) {
          showAuthPrompt("Please login to like events");
          return;
        }

        // Optimistic Update
        const anim = getLikeAnim(event._id);
        Animated.sequence([
          Animated.spring(anim, {
            toValue: 1.6,
            useNativeDriver: true,
          }),
          Animated.spring(anim, {
            toValue: 1,
            friction: 3,
            useNativeDriver: true,
          }),
        ]).start();

        updateEvent(event._id, (current) => ({
          ...current,
          hasLiked: !event.hasLiked,
          totalLikes: event.hasLiked
            ? Math.max((current.totalLikes || current.likes?.length || 0) - 1, 0)
            : (current.totalLikes || current.likes?.length || 0) + 1,
        }));

        const endpoint = event?.hasLiked ? "/event/unlike" : "/event/like";

        try {
          await api.post(
            endpoint,
            { eventId: event._id },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } catch (apiError) {
          // Revert on error
          updateEvent(event._id, (current) => ({
            ...current,
            hasLiked: event.hasLiked,
            totalLikes: event.hasLiked
              ? (current.totalLikes || current.likes?.length || 0) + 1
              : Math.max((current.totalLikes || current.likes?.length || 0) - 1, 0),
          }));
          throw apiError;
        }

      } catch (error) {
        console.error("Error liking reel event:", error);
        toast.error(error.response?.data?.error || "Could not update like");
      }
    },
    [getLikeAnim, showAuthPrompt, toast, updateEvent]
  );

  const handleBookmark = useCallback(
    async (event) => {
      try {
        const token = await AsyncStorage.getItem("token");
        const isGuest = await AsyncStorage.getItem("isGuest");

        if (isGuest === "true" || !token) {
          showAuthPrompt("Please login to bookmark events");
          return;
        }

        const endpoint = event?.hasBookmarked
          ? "/event/cancel-bookmark"
          : "/event/bookmark";

        await api.post(
          endpoint,
          { eventId: event._id },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        updateEvent(event._id, (current) => ({
          ...current,
          hasBookmarked: !event.hasBookmarked,
        }));
      } catch (error) {
        console.error("Error bookmarking reel event:", error);
        toast.error(error.response?.data?.error || "Could not update bookmark");
      }
    },
    [showAuthPrompt, toast, updateEvent]
  );

  const handleInterested = useCallback(
    async (event) => {
      try {
        const token = await AsyncStorage.getItem("token");
        const isGuest = await AsyncStorage.getItem("isGuest");

        if (isGuest === "true" || !token) {
          showAuthPrompt("Please login to show interest in events");
          return;
        }

        if (event?.isTicket && !event?.hasInterested) {
          // If it's a ticketed event, navigate to details to select tickets
          router.push(`/(tabs)/Events/${event._id}`);
          return;
        }

        const endpoint = event?.hasInterested
          ? "/event/interest-cancel"
          : "/event/interest";

        await api.post(
          endpoint,
          { eventId: event._id },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        updateEvent(event._id, (current) => ({
          ...current,
          hasInterested: !event.hasInterested,
        }));

        onInterested?.({
          ...event,
          hasInterested: !event.hasInterested,
        });

        toast.success(
          event.hasInterested ? "Interest cancelled" : "Marked as interested"
        );
      } catch (error) {
        console.error("Error marking reel interest:", error);
        toast.error(error.response?.data?.error || "Could not update interest");
      }
    },
    [onInterested, showAuthPrompt, toast, updateEvent]
  );

  const handleComments = useCallback(
    (event) => {
      router.push(`/(tabs)/Events/${event._id}?tab=comments`);
    },
    [router]
  );

  const handleDetails = useCallback(
    (event) => {
      router.push(`/(tabs)/Events/${event._id}`);
    },
    [router]
  );

  const renderItem = useCallback(
    ({ item, index }) => (
      <ReelItem
        event={item}
        index={index}
        activeIndex={activeIndex}
        muted={muted}
        progressWidth={progressWidth}
        showSwipeHint={index === 0 && !hasScrolled}
        swipeHintY={swipeHintY}
        likeScale={getLikeAnim(item._id)}
        onToggleMute={() => setMuted((prev) => !prev)}
        onLike={handleLike}
        onBookmark={handleBookmark}
        onInterested={handleInterested}
        onComments={handleComments}
        onDetails={handleDetails}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === "Events Near Me") {
            toast.info("Searching for events near your location...");
          }
        }}
      />
    ),
    [
      activeIndex,
      getLikeAnim,
      handleBookmark,
      handleComments,
      handleDetails,
      handleInterested,
      handleLike,
      hasScrolled,
      muted,
      progressWidth,
      swipeHintY,
      activeTab,
      toast
    ]
  );

  if (!events || events.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>🎭</Text>
        <Text style={styles.emptyTitle}>No events yet</Text>
        <Text style={styles.emptySubtitle}>Check back soon</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={localEvents}
      keyExtractor={(item, index) => `${item?._id || "event"}${index}`}
      renderItem={renderItem}
      pagingEnabled
      showsVerticalScrollIndicator={false}
      snapToInterval={height}
      snapToAlignment="start"
      decelerationRate="fast"
      viewabilityConfig={viewabilityConfig}
      onViewableItemsChanged={onViewableItemsChanged}
      removeClippedSubviews
      initialNumToRender={2}
      maxToRenderPerBatch={2}
      windowSize={3}
      style={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width,
    height,
    backgroundColor: "#0A0A0F",
  },
  reelItem: {
    width,
    height,
    backgroundColor: "#0A0A0F",
  },
  backgroundMedia: {
    width,
    height,
  },
  imageBackground: {
    width,
    height,
    justifyContent: "center",
    alignItems: "center",
  },
  noVideoPill: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  noVideoText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "#FFFFFF",
    includeFontPadding: false,
  },
  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 280,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  progressTrack: {
    position: "absolute",
    top: Platform.OS === "ios" ? 44 : (StatusBar.currentHeight || 0) + 2,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  progressFill: {
    height: 2,
    backgroundColor: "#FFFFFF",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop:
      Platform.OS === "ios" ? 54 : (StatusBar.currentHeight || 0) + 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tabsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  tabItem: {
    alignItems: "center",
  },
  tabText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    color: "rgba(255,255,255,0.55)",
    includeFontPadding: false,
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  activeTabUnderline: {
    width: "100%",
    height: 2,
    borderRadius: 1,
    backgroundColor: "#FFFFFF",
    marginTop: 5,
  },
  muteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  bottomLeft: {
    position: "absolute",
    bottom: 90,
    left: 16,
    right: 72,
  },
  organizerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  organizerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  organizerName: {
    flexShrink: 1,
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#FFFFFF",
    includeFontPadding: false,
  },
  followButton: {
    borderWidth: 1,
    borderColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  followText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: "#FFFFFF",
    includeFontPadding: false,
  },
  captionContainer: {
    marginTop: 10,
  },
  eventName: {
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    color: "#FFFFFF",
    includeFontPadding: false,
  },
  eventDescription: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
    includeFontPadding: false,
  },
  eventDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  eventDetailText: {
    flexShrink: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    includeFontPadding: false,
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  pricePill: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  ticketPill: {
    backgroundColor: "#FAB843",
  },
  freePill: {
    backgroundColor: "rgba(34,197,94,0.9)",
  },
  pricePillText: {
    fontFamily: "Poppins_700Bold",
    includeFontPadding: false,
  },
  ticketText: {
    fontSize: 13,
    color: "#1A1A1A",
  },
  freeText: {
    fontSize: 11,
    color: "#FFFFFF",
  },
  interestedButton: {
    marginLeft: 10,
    backgroundColor: "#5A31F4",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  interestedButtonActive: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  interestedButtonText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 13,
    color: "#FFFFFF",
    includeFontPadding: false,
  },
  statusBadge: {
    alignSelf: "flex-start",
    marginTop: 8,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    color: "#FFFFFF",
    includeFontPadding: false,
  },
  actionBar: {
    position: "absolute",
    bottom: 90,
    right: 12,
    alignItems: "center",
    gap: 24,
  },
  actionItem: {
    alignItems: "center",
    gap: 4,
  },
  actionLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#FFFFFF",
    includeFontPadding: false,
  },
  swipeHint: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  swipeHintText: {
    marginTop: 2,
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    includeFontPadding: false,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: "#0A0A0F",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyEmoji: {
    fontSize: 60,
    includeFontPadding: false,
  },
  emptyTitle: {
    marginTop: 12,
    fontFamily: "Poppins_700Bold",
    fontSize: 20,
    color: "#FFFFFF",
    includeFontPadding: false,
  },
  emptySubtitle: {
    marginTop: 6,
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    includeFontPadding: false,
  },
});
