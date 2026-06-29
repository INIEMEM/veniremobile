import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PlaceCard from "./PlaceCard";
import UploadPlaceModal from "./UploadPlaceModal";
import { PLACE_CATEGORIES } from "../constants/placesMockData";
import api from "../utils/axiosInstance";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useToast } from "../context/ToastContext";
import { useEffect } from "react";

const { width } = Dimensions.get("window");

export default function PlacesScreen({ searchQuery = "", filterStatus }) {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const toast = useToast();
  const [activeCategory, setActiveCategory] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [uploadVisible, setUploadVisible] = useState(false);
  const fabAnim = useRef(new Animated.Value(1)).current;

  // ── Filter places by category + search ──────────────────
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c;
  };

  const filtered = places.filter((p) => {
    const matchCat = activeCategory === "all" || p.category === activeCategory;
    const matchSearch = !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    let matchFilter = true;
    if (filterStatus) {
      if (filterStatus.distance && filterStatus.distance !== "any") {
        const radius = parseInt(filterStatus.distance, 10);
        if (p.lat && p.long) {
          const dist = calculateDistance(6.5244, 3.3792, parseFloat(p.lat), parseFloat(p.long));
          if (dist > radius) matchFilter = false;
        } else {
          matchFilter = false;
        }
      }
      if (filterStatus.price === "free") {
        if (p.priceRange !== "Free" && p.priceRange !== "$") matchFilter = false;
      } else if (filterStatus.price === "paid") {
        if (p.priceRange === "Free" || p.priceRange === "$") matchFilter = false;
      }
    }

    return matchCat && matchSearch && matchFilter;
  });

  
  // ── Fetch places from backend ────────────────────────────
  const fetchPlaces = useCallback(async (pageNum = 1, shouldRefresh = false) => {
    try {
      if (shouldRefresh) setRefreshing(true);
      else if (pageNum === 1) setLoading(true);

      const isGuest = await AsyncStorage.getItem("isGuest");
      const endpoint = isGuest === "true" ? "/place/explore" : "/place";
      
      const res = await api.get(endpoint, {
        params: {
          page: pageNum,
          limit: 10,
          category: activeCategory !== "all" ? activeCategory : undefined,
          search: searchQuery || undefined,
        }
      });

      if (res.data?.success) {
        const newPlaces = res.data.data || [];
        setPlaces(prev => shouldRefresh || pageNum === 1 ? newPlaces : [...prev, ...newPlaces]);
        setHasMore(res.data.pagination?.hasMore ?? newPlaces.length === 10);
        setPage(pageNum);
      }
    } catch (err) {
      console.error("Error fetching places:", err?.response?.data || err?.message);
      if (pageNum === 1) setPlaces([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeCategory, searchQuery]);

  useEffect(() => {
    fetchPlaces(1);
  }, [fetchPlaces]);

  // ── Pull to refresh ──────────────────────────────────────
  const onRefresh = useCallback(() => {
    fetchPlaces(1, true);
  }, [fetchPlaces]);

  // ── Load more ────────────────────────────────────────────
  const handleLoadMore = () => {
    if (!loading && !refreshing && hasMore) {
      fetchPlaces(page + 1);
    }
  };


  
  // ── Like handler ─────────────────────────────────────────
  const handleLike = useCallback(async (placeId, currentlyLiked) => {
    const isGuest = await AsyncStorage.getItem("isGuest");
    if (isGuest === "true") {
      toast.error("Please log in to like places");
      return;
    }
    
    // Optimistic update
    setPlaces((prev) =>
      prev.map((p) =>
        p._id === placeId
          ? {
              ...p,
              hasLiked: !currentlyLiked,
              totalLikes: currentlyLiked ? p.totalLikes - 1 : p.totalLikes + 1,
            }
          : p
      )
    );
    
    try {
      const endpoint = currentlyLiked ? "/place/unlike" : "/place/like";
      await api.post(endpoint, { placeId });
    } catch (error) {
      // Revert on error
      setPlaces((prev) =>
        prev.map((p) =>
          p._id === placeId
            ? {
                ...p,
                hasLiked: currentlyLiked,
                totalLikes: currentlyLiked ? p.totalLikes + 1 : p.totalLikes - 1,
              }
            : p
        )
      );
      toast.error("Failed to like place");
    }
  }, [toast]);


  
  // ── Save handler ─────────────────────────────────────────
  const handleSave = useCallback(async (placeId, currentlySaved) => {
    const isGuest = await AsyncStorage.getItem("isGuest");
    if (isGuest === "true") {
      toast.error("Please log in to save places");
      return;
    }

    // Optimistic update
    setPlaces((prev) =>
      prev.map((p) =>
        p._id === placeId
          ? { ...p, hasSaved: !currentlySaved, totalSaves: currentlySaved ? p.totalSaves - 1 : p.totalSaves + 1 }
          : p
      )
    );
    
    try {
      const endpoint = currentlySaved ? "/place/unsave" : "/place/save";
      await api.post(endpoint, { placeId });
    } catch (error) {
      // Revert on error
      setPlaces((prev) =>
        prev.map((p) =>
          p._id === placeId
            ? { ...p, hasSaved: currentlySaved, totalSaves: currentlySaved ? p.totalSaves + 1 : p.totalSaves - 1 }
            : p
        )
      );
      toast.error("Failed to save place");
    }
  }, [toast]);


  // ── FAB pulse animation ──────────────────────────────────
  const pulseFab = () => {
    Animated.sequence([
      Animated.timing(fabAnim, { toValue: 0.88, duration: 100, useNativeDriver: true }),
      Animated.spring(fabAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  };

  // ── Render each card ─────────────────────────────────────
  const renderItem = useCallback(({ item }) => (
    <PlaceCard
      place={item}
      onLike={handleLike}
      onSave={handleSave}
    />
  ), [handleLike, handleSave]);

  const keyExtractor = useCallback((item) => item._id, []);

  // ── Category filter pills ─────────────────────────────────
  const renderCategoryBar = () => (
    <View style={styles.catBarWrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catBar}
      >
        {PLACE_CATEGORIES.map((cat) => {
          const active = activeCategory === cat.key;
          return (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.catPill,
                active && { backgroundColor: cat.color },
                !active && { backgroundColor: cat.bg },
              ]}
              onPress={() => setActiveCategory(cat.key)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={cat.icon}
                size={13}
                color={active ? "#FFF" : cat.color}
              />
              <Text style={[styles.catPillText, { color: active ? "#FFF" : cat.color }]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  // ── Empty state ──────────────────────────────────────────
  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name="location-outline" size={48} color="#C4B5FD" />
      </View>
      <Text style={styles.emptyTitle}>
        {searchQuery ? `No places found for "${searchQuery}"` : "No places yet"}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery
          ? "Try a different search term or browse all categories."
          : "Be the first to share a great spot! Tap the + button below."}
      </Text>
      {!searchQuery && (
        <TouchableOpacity
          style={styles.emptyBtn}
          onPress={() => { pulseFab(); setUploadVisible(true); }}
        >
          <Ionicons name="add" size={16} color="#FFF" />
          <Text style={styles.emptyBtnText}>Share a Place</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ── Header: stats bar ────────────────────────────────────
  const renderHeader = () => (
    <View>
      {renderCategoryBar()}
      {filtered.length > 0 && (
        <View style={styles.statsBar}>
          <Text style={styles.statsText}>
            {filtered.length} {filtered.length === 1 ? "place" : "places"}{" "}
            {activeCategory !== "all" && `· ${PLACE_CATEGORIES.find(c => c.key === activeCategory)?.label}`}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {loading && page === 1 ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#5A31F4" />
        </View>
      ) : (
        <FlatList
        data={filtered}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#5A31F4"
          />
        }
        removeClippedSubviews={Platform.OS === "android"}
        initialNumToRender={3}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        maxToRenderPerBatch={4}
        windowSize={5}
        updateCellsBatchingPeriod={80}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : undefined}
          ListFooterComponent={hasMore && page > 1 ? <ActivityIndicator size="small" color="#5A31F4" style={{ marginVertical: 20 }} /> : null}
        />
      )}

      {/* ── Floating Action Button ──────────────────────── */}
      <Animated.View
        style={[styles.fab, { transform: [{ scale: fabAnim }] }]}
      >
        <TouchableOpacity
          style={styles.fabInner}
          activeOpacity={0.85}
          onPress={() => {
            pulseFab();
            setUploadVisible(true);
          }}
        >
          <Ionicons name="add" size={28} color="#FFF" />
        </TouchableOpacity>
      </Animated.View>

      {/* ── Upload Modal ────────────────────────────────── */}
      <UploadPlaceModal
        visible={uploadVisible}
        onClose={() => setUploadVisible(false)}
        onSuccess={() => {
          // TODO (Backend): After successful upload, prepend new place to feed
          // or refetch the first page. For now we just close.
          onRefresh();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F2",
  },

  // Category bar
  catBarWrapper: {
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  catBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    flexDirection: "row",
  },
  catPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  catPillText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
  },

  // Stats bar
  statsBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#FFF",
    marginBottom: 2,
  },
  statsText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: "#999",
  },

  // Empty state
  emptyContainer: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#F3EDFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 17,
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: "#888",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#5A31F4",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
  },
  emptyBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#FFF",
  },

  // FAB
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    zIndex: 20,
  },
  fabInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#5A31F4",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#5A31F4",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 10,
  },
});
