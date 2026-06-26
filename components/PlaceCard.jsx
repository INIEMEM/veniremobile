import React, { useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  ScrollView,
  Dimensions,
  AppState,
  Linking,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Video } from "expo-av";
import { useRouter } from "expo-router";
import { PLACE_CATEGORIES } from "../constants/placesMockData";

const { width, height } = Dimensions.get("window");

// ─── Helpers ────────────────────────────────────────────────
const formatCount = (n) => {
  if (!n) return "0";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
};

const renderStars = (rating) => {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(5 - full - (half ? 1 : 0));
};

const timeAgo = (iso) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800)return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

// ─── PlaceCard ──────────────────────────────────────────────
export default function PlaceCard({ place, onLike, onSave }) {
  const router = useRouter();
  const [activeIdx, setActiveIdx] = useState(0);
  const [playingKey, setPlayingKey] = useState(null);
  const [fullScreen, setFullScreen] = useState(null);
  const videoRefs = useRef({});
  const fsVideoRef = useRef(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const cat = PLACE_CATEGORIES.find((c) => c.key === place.category) || PLACE_CATEGORIES[0];
  const mediaCount = place.media?.length || 0;

  // ── Video helpers ────────────────────────────────────────
  const pauseAll = useCallback(async () => {
    await Promise.all(
      Object.values(videoRefs.current).map(async (r) => {
        try { if (r) await r.pauseAsync(); } catch (_) {}
      })
    );
    setPlayingKey(null);
  }, []);

  const openFullScreen = useCallback(async (idx) => {
    await pauseAll();
    setFullScreen(idx);
  }, [pauseAll]);

  const closeFullScreen = useCallback(async () => {
    try { if (fsVideoRef.current) await fsVideoRef.current.pauseAsync(); } catch (_) {}
    setFullScreen(null);
  }, []);

  // ── Like animation ───────────────────────────────────────
  const animateLike = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.5, duration: 140, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
  };

  const handleLike = () => {
    animateLike();
    onLike?.(place._id, place.hasLiked);
  };

  // ── Navigate to detail ───────────────────────────────────
  const goToDetail = () => router.push(`/places/${place._id}`);

  return (
    <View style={styles.card}>
      {/* ─── HEADER ─────────────────────────────────────── */}
      <TouchableOpacity style={styles.header} activeOpacity={0.85} onPress={goToDetail}>
        <View style={styles.avatarRing}>
          <Image
            source={{ uri: place.postedBy?.profile_picture || "https://cdn-icons-png.flaticon.com/512/149/149071.png" }}
            style={styles.avatar}
          />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.posterName}>
            {place.postedBy?.firstname} {place.postedBy?.lastname}
          </Text>
          <Text style={styles.timeAgo}>{timeAgo(place.createdAt)}</Text>
        </View>
        {/* Category pill */}
        <View style={[styles.catPill, { backgroundColor: cat.bg }]}>
          <Ionicons name={cat.icon} size={11} color={cat.color} />
          <Text style={[styles.catLabel, { color: cat.color }]}>{cat.label}</Text>
        </View>
      </TouchableOpacity>

      {/* ─── MEDIA CAROUSEL ──────────────────────────────── */}
      <View style={styles.mediaContainer}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onMomentumScrollEnd={(e) => {
            setActiveIdx(Math.round(e.nativeEvent.contentOffset.x / width));
          }}
        >
          {place.media.map((item, idx) => {
            const vKey = `${place._id}-${idx}`;
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
                        if (isPlaying) {
                          await ref.pauseAsync();
                          setPlayingKey(null);
                        } else {
                          await pauseAll();
                          await ref.playAsync();
                          setPlayingKey(vKey);
                        }
                      }}
                      onLongPress={() => openFullScreen(idx)}
                    >
                      {!isPlaying && (
                        <View style={styles.playWrap}>
                          <Ionicons name="play" size={32} color="#FFF" />
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.expandBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        onPress={() => openFullScreen(idx)}
                      >
                        <Ionicons name="expand-outline" size={16} color="#FFF" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    activeOpacity={0.95}
                    onPress={() => openFullScreen(idx)}
                  >
                    <Image source={{ uri: item.uri }} style={styles.media} resizeMode="cover" />
                    {/* Expand icon for images too */}
                    <View style={styles.expandBtn} pointerEvents="none">
                      <Ionicons name="expand-outline" size={16} color="#FFF" />
                    </View>
                  </TouchableOpacity>
                )}

                {/* Slide counter */}
                {mediaCount > 1 && (
                  <View style={styles.mediaCounter}>
                    <Ionicons name="images-outline" size={10} color="#FFF" />
                    <Text style={styles.mediaCounterText}>{idx + 1}/{mediaCount}</Text>
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

      {/* ─── ACTION BAR ──────────────────────────────────── */}
      <View style={styles.actionBar}>
        {/* Like */}
        <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Ionicons
              name={place.hasLiked ? "heart" : "heart-outline"}
              size={22}
              color={place.hasLiked ? "#FF3B30" : "#1A1A1A"}
            />
          </Animated.View>
          <Text style={[styles.actionCount, place.hasLiked && { color: "#FF3B30" }]}>
            {formatCount(place.totalLikes)}
          </Text>
        </TouchableOpacity>

        {/* Comment */}
        <TouchableOpacity style={styles.actionBtn} onPress={goToDetail}>
          <Ionicons name="chatbubble-outline" size={22} color="#1A1A1A" />
          <Text style={styles.actionCount}>{formatCount(place.totalComments)}</Text>
        </TouchableOpacity>

        {/* Share */}
        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="share-social-outline" size={22} color="#1A1A1A" />
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        {/* Save */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onSave?.(place._id, place.hasSaved)}
        >
          <Ionicons
            name={place.hasSaved ? "bookmark" : "bookmark-outline"}
            size={22}
            color={place.hasSaved ? "#5A31F4" : "#1A1A1A"}
          />
        </TouchableOpacity>
      </View>

      {/* ─── LIKES COUNT ─────────────────────────────────── */}
      {(place.totalLikes || 0) > 0 && (
        <View style={styles.likesRow}>
          <Text style={styles.likesText}>
            {formatCount(place.totalLikes)} {place.totalLikes === 1 ? "like" : "likes"}
          </Text>
        </View>
      )}

      {/* ─── CAPTION ─────────────────────────────────────── */}
      <TouchableOpacity style={styles.caption} activeOpacity={0.85} onPress={goToDetail}>
        <Text style={styles.placeName}>{place.name}</Text>
        <Text style={styles.description} numberOfLines={3}>{place.description}</Text>
        {(place.totalComments || 0) > 0 && (
          <Text style={styles.viewComments} onPress={goToDetail}>
            View all {place.totalComments} comments
          </Text>
        )}
      </TouchableOpacity>

      {/* ─── FOOTER STRIP ────────────────────────────────── */}
      <TouchableOpacity style={styles.footer} activeOpacity={0.85} onPress={goToDetail}>
        {/* Rating */}
        <Text style={styles.stars}>{renderStars(place.rating)}</Text>
        <Text style={styles.ratingNum}>{place.rating.toFixed(1)}</Text>
        <View style={styles.footerDot} />
        {/* Price */}
        <Text style={styles.price}>{place.priceRange}</Text>
        <View style={styles.footerDot} />
        {/* Address */}
        <Ionicons name="location-outline" size={11} color="#5A31F4" />
        <Text style={styles.address} numberOfLines={1}>{place.city}</Text>
        {/* Maps link */}
        {place.lat && place.long && (
          <TouchableOpacity
            style={styles.mapsBtn}
            onPress={() =>
              Linking.openURL(`https://www.google.com/maps?q=${place.lat},${place.long}`)
            }
          >
            <Ionicons name="navigate-outline" size={12} color="#5A31F4" />
            <Text style={styles.mapsBtnText}>Maps</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {/* Tags */}
      {place.tags?.length > 0 && (
        <View style={styles.tagsRow}>
          {place.tags.slice(0, 4).map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ─── FULLSCREEN MODAL ────────────────────────────── */}
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

// ─── Styles ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF",
    borderBottomWidth: 6,
    borderBottomColor: "#F2F2F2",
    marginBottom: 2,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 9,
  },
  avatarRing: {
    padding: 2,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#5A31F4",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ddd",
  },
  headerInfo: { flex: 1 },
  posterName: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#1A1A1A",
  },
  timeAgo: {
    fontFamily: "Poppins_400Regular",
    fontSize: 10,
    color: "#999",
    marginTop: 1,
  },
  catPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },
  catLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
  },

  // Media
  mediaContainer: {
    width: "100%",
    height: height * 0.60,
    backgroundColor: "#000",
    position: "relative",
  },
  mediaSlide: {
    width,
    height: height * 0.60,
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
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 4,
  },
  expandBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  mediaCounter: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  mediaCounterText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 10,
    color: "#FFF",
  },
  dots: {
    position: "absolute",
    bottom: 12,
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
    paddingTop: 10,
    paddingBottom: 4,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  actionCount: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: "#1A1A1A",
  },

  // Likes
  likesRow: { paddingHorizontal: 14, paddingTop: 2 },
  likesText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#1A1A1A",
  },

  // Caption
  caption: {
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 8,
  },
  placeName: {
    fontFamily: "Poppins_700Bold",
    fontSize: 15,
    color: "#1A1A1A",
    marginBottom: 3,
  },
  description: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: "#444",
    lineHeight: 20,
  },
  viewComments: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: "#999",
    marginTop: 5,
  },

  // Footer strip
  footer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: "#F2F2F2",
    gap: 5,
  },
  stars: {
    fontSize: 12,
    color: "#FAB843",
    letterSpacing: -1,
  },
  ratingNum: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#1A1A1A",
  },
  footerDot: {
    width: 3, height: 3, borderRadius: 1.5,
    backgroundColor: "#C4B5FD",
  },
  price: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#FAB843",
  },
  address: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "#5A31F4",
    flex: 1,
  },
  mapsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#F3EDFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mapsBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 10,
    color: "#5A31F4",
  },

  // Tags
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  tag: {
    backgroundColor: "#F3EDFF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  tagText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "#5A31F4",
  },

  // Fullscreen modal
  fsContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
  },
  fsCloseBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 25,
  },
  fsSlide: {
    width,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  fsMedia: {
    width: "100%",
    height: "100%",
  },
});
