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
import MOCK_PLACES, { PLACE_CATEGORIES } from "../constants/placesMockData";

const { width } = Dimensions.get("window");

export default function PlacesScreen({ searchQuery = "" }) {
  const [places, setPlaces] = useState(MOCK_PLACES);
  const [activeCategory, setActiveCategory] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [uploadVisible, setUploadVisible] = useState(false);
  const fabAnim = useRef(new Animated.Value(1)).current;

  // ── Filter places by category + search ──────────────────
  const filtered = places.filter((p) => {
    const matchCat = activeCategory === "all" || p.category === activeCategory;
    const matchSearch = !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchSearch;
  });

  // ── Pull to refresh (mocked) ─────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // TODO (Backend): Replace with real fetch:
    // const res = await api.get(`/place?category=${activeCategory}`);
    // setPlaces(res.data.data);
    await new Promise((r) => setTimeout(r, 800));
    setRefreshing(false);
  }, [activeCategory]);

  // ── Like handler (optimistic) ────────────────────────────
  const handleLike = useCallback((placeId, currentlyLiked) => {
    // TODO (Backend): POST /place/like or /place/unlike
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
  }, []);

  // ── Save handler (optimistic) ────────────────────────────
  const handleSave = useCallback((placeId, currentlySaved) => {
    // TODO (Backend): POST /place/save or /place/unsave
    setPlaces((prev) =>
      prev.map((p) =>
        p._id === placeId
          ? { ...p, hasSaved: !currentlySaved, totalSaves: currentlySaved ? p.totalSaves - 1 : p.totalSaves + 1 }
          : p
      )
    );
  }, []);

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
        maxToRenderPerBatch={4}
        windowSize={5}
        updateCellsBatchingPeriod={80}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : undefined}
      />

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
