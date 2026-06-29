import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  StatusBar,
  Linking,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Video } from "expo-av";
import { PLACE_CATEGORIES } from "../../constants/placesMockData";
import api from "../../utils/axiosInstance";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useToast } from "../../context/ToastContext";

const { width, height } = Dimensions.get("window");

// ── Helpers ──────────────────────────────────────────────────
const formatCount = (n) => {
  if (!n) return "0";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
};

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

const timeAgo = (iso) => {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};



export default function PlaceDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const toast = useToast();

  const [place, setPlace] = useState(null);
  const [loadingPlace, setLoadingPlace] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const [playingKey, setPlayingKey] = useState(null);
  const [fullScreen, setFullScreen] = useState(null);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [showAllDesc, setShowAllDesc] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;


  // ── Fetch Place Data ───────────────────────────────────────
  useEffect(() => {
    const fetchPlace = async () => {
      try {
        const res = await api.get(`/place/key?key=_id&value=${id}`);
        if (res.data?.success) {
          setPlace(res.data.data);
        }
      } catch (err) {
        console.error("Error fetching place:", err?.response?.data || err?.message);
        toast.error("Failed to load place details");
      } finally {
        setLoadingPlace(false);
      }
    };
    fetchPlace();
  }, [id, toast]);

  // ── Fetch Comments ─────────────────────────────────────────
  const fetchComments = useCallback(async () => {
    try {
      const res = await api.get(`/place/comment?placeId=${id}`);
      if (res.data?.success) {
        setComments(res.data.data || []);
      }
    } catch (err) {
      console.error("Error fetching comments:", err?.response?.data || err?.message);
    } finally {
      setLoadingComments(false);
    }
  }, [id]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);


  const videoRefs = useRef({});
  const fsVideoRef = useRef(null);

  if (loadingPlace) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#111" }}>
        <ActivityIndicator size="large" color="#5A31F4" />
      </View>
    );
  }

  const cat = PLACE_CATEGORIES.find((c) => c.key === place?.category) || PLACE_CATEGORIES[0];
  const mediaCount = place?.media?.length || 0;

  if (!place) {
    return (
      <View style={styles.notFound}>
        <Ionicons name="location-outline" size={64} color="#C4B5FD" />
        <Text style={styles.notFoundText}>Place not found</Text>
        <TouchableOpacity style={styles.backBtn2} onPress={() => router.back()}>
          <Text style={styles.backBtn2Text}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Video helpers ────────────────────────────────────────
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

  
  // ── Like ─────────────────────────────────────────────────
  const handleLike = async () => {
    const isGuest = await AsyncStorage.getItem("isGuest");
    if (isGuest === "true") {
      toast.error("Please log in to like places");
      return;
    }
    
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.5, duration: 140, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
    
    const currentlyLiked = place.hasLiked;
    
    setPlace((p) => ({
      ...p,
      hasLiked: !currentlyLiked,
      totalLikes: currentlyLiked ? p.totalLikes - 1 : p.totalLikes + 1,
    }));
    
    try {
      const endpoint = currentlyLiked ? "/place/unlike" : "/place/like";
      await api.post(endpoint, { placeId: id });
    } catch (error) {
      setPlace((p) => ({
        ...p,
        hasLiked: currentlyLiked,
        totalLikes: currentlyLiked ? p.totalLikes + 1 : p.totalLikes - 1,
      }));
      toast.error("Failed to like place");
    }
  };


  
  // ── Save ─────────────────────────────────────────────────
  const handleSave = async () => {
    const isGuest = await AsyncStorage.getItem("isGuest");
    if (isGuest === "true") {
      toast.error("Please log in to save places");
      return;
    }

    const currentlySaved = place.hasSaved;
    setPlace((p) => ({ ...p, hasSaved: !currentlySaved, totalSaves: currentlySaved ? p.totalSaves - 1 : p.totalSaves + 1 }));
    
    try {
      const endpoint = currentlySaved ? "/place/unsave" : "/place/save";
      await api.post(endpoint, { placeId: id });
      toast.success(currentlySaved ? "Removed from saved" : "Place saved! 🔖");
    } catch (error) {
      setPlace((p) => ({ ...p, hasSaved: currentlySaved, totalSaves: currentlySaved ? p.totalSaves + 1 : p.totalSaves - 1 }));
      toast.error("Failed to save place");
    }
  };


  
  // ── Post comment ─────────────────────────────────────────
  const handlePostComment = async () => {
    if (!commentText.trim()) return;
    const isGuest = await AsyncStorage.getItem("isGuest");
    if (isGuest === "true") {
      toast.error("Please log in to comment");
      return;
    }

    setPostingComment(true);
    try {
      const res = await api.post("/place/comment", { placeId: id, text: commentText.trim() });
      if (res.data?.success) {
        setComments((prev) => [res.data.data, ...prev]);
        setCommentText("");
        setPlace((p) => ({ ...p, totalComments: (p.totalComments || 0) + 1 }));
      }
    } catch (err) {
      console.error("Error posting comment:", err?.response?.data || err?.message);
      toast.error("Failed to post comment");
    } finally {
      setPostingComment(false);
    }
  };


  // ── Open Maps ────────────────────────────────────────────
  const openMaps = () => {
    if (place.lat && place.long) {
      Linking.openURL(`https://www.google.com/maps?q=${place.lat},${place.long}`);
    } else {
      Linking.openURL(`https://www.google.com/maps/search/${encodeURIComponent(place.name + " " + place.city)}`);
    }
  };

  // ── Render ───────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Back button — floats above media */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => { pauseAll(); router.back(); }}
      >
        <Ionicons name="chevron-back" size={22} color="#FFF" />
      </TouchableOpacity>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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
              {place.media.map((item, idx) => {
                const vKey = `detail-${place._id}-${idx}`;
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
                    {mediaCount > 1 && (
                      <View style={styles.mediaCounter}>
                        <Text style={styles.mediaCounterText}>{idx + 1} / {mediaCount}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            {/* Dot indicators */}
            {mediaCount > 1 && (
              <View style={styles.dots}>
                {place.media.map((_, i) => (
                  <View key={i} style={[styles.dot, i === activeIdx && styles.dotActive]} />
                ))}
              </View>
            )}
          </View>

          {/* ── ACTION BAR ─────────────────────────────── */}
          <View style={styles.actionBar}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <Ionicons
                  name={place.hasLiked ? "heart" : "heart-outline"}
                  size={24}
                  color={place.hasLiked ? "#FF3B30" : "#1A1A1A"}
                />
              </Animated.View>
              <Text style={[styles.actionCount, place.hasLiked && { color: "#FF3B30" }]}>
                {formatCount(place.totalLikes)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn}>
              <Ionicons name="chatbubble-outline" size={24} color="#1A1A1A" />
              <Text style={styles.actionCount}>{formatCount(place.totalComments)}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn}>
              <Ionicons name="share-social-outline" size={24} color="#1A1A1A" />
            </TouchableOpacity>

            <View style={{ flex: 1 }} />

            <TouchableOpacity style={styles.actionBtn} onPress={handleSave}>
              <Ionicons
                name={place.hasSaved ? "bookmark" : "bookmark-outline"}
                size={24}
                color={place.hasSaved ? "#5A31F4" : "#1A1A1A"}
              />
            </TouchableOpacity>
          </View>

          {/* Likes count */}
          {place.totalLikes > 0 && (
            <View style={styles.likesRow}>
              <Text style={styles.likesText}>{formatCount(place.totalLikes)} likes</Text>
            </View>
          )}

          {/* ── PLACE INFO ──────────────────────────────── */}
          <View style={styles.infoSection}>

            {/* Name + Category */}
            <View style={styles.nameRow}>
              <Text style={styles.placeName}>{place.name}</Text>
              <View style={[styles.catBadge, { backgroundColor: cat.bg }]}>
                <Ionicons name={cat.icon} size={12} color={cat.color} />
                <Text style={[styles.catBadgeText, { color: cat.color }]}>{cat.label}</Text>
              </View>
            </View>

            {/* Rating + Price + City */}
            <View style={styles.metaRow}>
              <View style={styles.starsRow}>{renderStars(place.rating)}</View>
              <Text style={styles.ratingNum}>{place.rating.toFixed(1)}</Text>
              <View style={styles.metaDot} />
              <Text style={styles.priceRange}>{place.priceRange}</Text>
              <View style={styles.metaDot} />
              <Ionicons name="location-outline" size={13} color="#5A31F4" />
              <Text style={styles.cityText}>{place.city}</Text>
            </View>

            {/* Address */}
            <View style={styles.addressRow}>
              <Ionicons name="map-outline" size={14} color="#5A31F4" />
              <Text style={styles.addressText}>{place.address}</Text>
            </View>

            {/* Open in Maps CTA */}
            <TouchableOpacity style={styles.mapsBtn} onPress={openMaps} activeOpacity={0.85}>
              <Ionicons name="navigate" size={16} color="#FFF" />
              <Text style={styles.mapsBtnText}>Open in Google Maps</Text>
            </TouchableOpacity>

            {/* Description */}
            <Text style={styles.sectionTitle}>About this place</Text>
            <Text
              style={styles.description}
              numberOfLines={showAllDesc ? undefined : 4}
            >
              {place.description}
            </Text>
            {place.description?.length > 180 && (
              <TouchableOpacity onPress={() => setShowAllDesc((p) => !p)}>
                <Text style={styles.readMore}>
                  {showAllDesc ? "Show less" : "Read more"}
                </Text>
              </TouchableOpacity>
            )}

            {/* Tags */}
            {place.tags?.length > 0 && (
              <View style={styles.tagsRow}>
                {place.tags.map((tag) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Posted by */}
            <TouchableOpacity 
              style={styles.postedByRow}
              activeOpacity={0.7}
              onPress={() => {
                const orgId = place.postedBy?._id || place.postedBy?.id;
                if (orgId) {
                  router.push({
                    pathname: `/profile/${orgId}`,
                    params: {
                      firstname: place.postedBy?.firstname,
                      lastname: place.postedBy?.lastname,
                      profile_picture: place.postedBy?.profile_picture,
                      username: place.postedBy?.username,
                    }
                  });
                }
              }}
            >
              <Image
                source={{ uri: place.postedBy?.profile_picture }}
                style={styles.postedAvatar}
              />
              <View>
                <Text style={styles.postedByLabel}>Posted by</Text>
                <Text style={styles.postedByName}>
                  {place.postedBy?.firstname} {place.postedBy?.lastname}
                </Text>
              </View>
              <Text style={styles.postedTime}>{timeAgo(place.createdAt)}</Text>
            </TouchableOpacity>
          </View>

          {/* ── COMMENTS ────────────────────────────────── */}
          <View style={styles.commentsSection}>
            <Text style={styles.sectionTitle}>
              Comments ({place.totalComments || comments.length})
            </Text>

            {/* Comment input */}
            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                placeholder="Share your thoughts…"
                placeholderTextColor="#bbb"
                value={commentText}
                onChangeText={setCommentText}
                multiline
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!commentText.trim() || postingComment) && styles.sendBtnDisabled]}
                onPress={handlePostComment}
                disabled={!commentText.trim() || postingComment}
              >
                {postingComment ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Ionicons name="send" size={16} color="#FFF" />
                )}
              </TouchableOpacity>
            </View>

            {/* Comment list */}
            {comments.map((c) => (
              <View key={c._id} style={styles.commentItem}>
                <Image
                  source={{ uri: c.userId?.profile_picture }}
                  style={styles.commentAvatar}
                />
                <View style={styles.commentBody}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentUser}>
                      {c.userId?.firstname} {c.userId?.lastname}
                    </Text>
                    <Text style={styles.commentTime}>{timeAgo(c.createdAt)}</Text>
                  </View>
                  <Text style={styles.commentText}>{c.text}</Text>
                </View>
              </View>
            ))}

            {/* Spacer */}
            <View style={{ height: 40 }} />
          </View>
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
            {place.media.map((item, idx) => (
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },

  // Back button
  backBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : (StatusBar.currentHeight || 30) + 12,
    left: 16,
    zIndex: 100,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Media
  mediaContainer: {
    width,
    height: height * 0.52,
    backgroundColor: "#000",
  },
  mediaSlide: {
    width,
    height: height * 0.52,
    position: "relative",
  },
  media: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  videoOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  playWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 4,
  },
  expandBtn: {
    position: "absolute",
    top: 12, right: 12,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  mediaCounter: {
    position: "absolute",
    bottom: 16,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  mediaCounterText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: "#FFF",
  },
  dots: {
    position: "absolute",
    bottom: 14,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
  },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  dotActive: {
    width: 18, backgroundColor: "#FFF",
  },

  // Actions
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 6,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 6,
  },
  actionCount: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    color: "#1A1A1A",
  },
  likesRow: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  likesText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#1A1A1A",
  },

  // Info section
  infoSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: "#FFF",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  placeName: {
    fontFamily: "Poppins_700Bold",
    fontSize: 22,
    color: "#1A1A1A",
    flex: 1,
  },
  catBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  catBadgeText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  starsRow: { flexDirection: "row" },
  ratingNum: {
    fontFamily: "Poppins_700Bold",
    fontSize: 14,
    color: "#1A1A1A",
  },
  metaDot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: "#C4B5FD",
  },
  priceRange: {
    fontFamily: "Poppins_700Bold",
    fontSize: 14,
    color: "#FAB843",
  },
  cityText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: "#5A31F4",
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginBottom: 14,
  },
  addressText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: "#555",
    flex: 1,
    lineHeight: 20,
  },
  mapsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#5A31F4",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    alignSelf: "flex-start",
    marginBottom: 20,
    shadowColor: "#5A31F4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  mapsBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#FFF",
  },
  sectionTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 15,
    color: "#1A1A1A",
    marginBottom: 8,
    marginTop: 4,
  },
  description: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: "#444",
    lineHeight: 22,
  },
  readMore: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#5A31F4",
    marginTop: 6,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
    marginBottom: 4,
  },
  tag: {
    backgroundColor: "#F3EDFF",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  tagText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "#5A31F4",
  },
  postedByRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    marginBottom: 4,
  },
  postedAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#ddd",
    borderWidth: 2,
    borderColor: "#5A31F4",
  },
  postedByLabel: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "#999",
  },
  postedByName: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#1A1A1A",
  },
  postedTime: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "#999",
    marginLeft: "auto",
  },

  // Comments
  commentsSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 6,
    borderTopColor: "#F2F2F2",
    marginTop: 8,
  },
  commentInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    marginBottom: 20,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: "#1A1A1A",
    backgroundColor: "#FAFAFA",
    maxHeight: 80,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#5A31F4",
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },
  commentItem: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
    alignItems: "flex-start",
  },
  commentAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#ddd",
  },
  commentBody: { flex: 1 },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  commentUser: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#1A1A1A",
  },
  commentTime: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "#999",
  },
  commentText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: "#444",
    lineHeight: 20,
  },

  // Not found
  notFound: {
    flex: 1, justifyContent: "center", alignItems: "center", gap: 12,
  },
  notFoundText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16, color: "#999",
  },
  backBtn2: {
    backgroundColor: "#5A31F4",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backBtn2Text: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#FFF",
  },

  // Fullscreen
  fsContainer: {
    flex: 1, backgroundColor: "#000", justifyContent: "center",
  },
  fsCloseBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : 30,
    right: 20,
    zIndex: 10,
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 25,
  },
  fsSlide: {
    width, height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  fsMedia: {
    width: "100%", height: "100%",
  },
});
