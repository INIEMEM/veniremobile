import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Platform,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../../utils/axiosInstance";

const { width } = Dimensions.get("window");

export default function VendorMarketplace() {
  const router = useRouter();
  const { eventId, eventName: rawEventName } = useLocalSearchParams();
  const eventName = rawEventName ? decodeURIComponent(rawEventName) : "";

  const [categories, setCategories] = useState([{ _id: "all", name: "All", icon: "🌟" }]);
  const [vendors, setVendors] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("rating"); // 'rating' | 'price_asc' | 'price_desc'
  const [loading, setLoading] = useState(false);
  const [addedVendors, setAddedVendors] = useState([]);

  useEffect(() => {
    loadAddedVendors();
    fetchCategories();
  }, []);

  useEffect(() => {
    // Basic debounce for search
    const delayDebounceFn = setTimeout(() => {
      fetchVendors();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [selectedCategory, searchQuery]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/user/servicetype');
      if (res.data?.success && res.data?.data) {
        // Map to include an icon if available, otherwise fallback
        const mapped = res.data.data.map(cat => ({
          ...cat,
          icon: "✨" // Could map icons based on name later
        }));
        setCategories([{ _id: "all", name: "All", icon: "🌟" }, ...mapped]);
      }
    } catch (e) {
      console.log('Failed to load categories', e);
    }
  };

  const fetchVendors = async () => {
    setLoading(true);
    try {
      // Build query
      let query = `/user/vendors?page=1&limit=50`;
      
      if (selectedCategory !== 'all') {
        query += `&serviceType=${selectedCategory}`;
      }
      
      // If backend supports search, we could append it here, 
      // but for now we'll fetch and filter locally if not supported.
      const res = await api.get(query);
      
      if (res.data?.success && res.data?.data) {
        setVendors(res.data.data);
      }
    } catch (e) {
      console.log('Failed to fetch vendors:', e?.response?.data || e?.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAddedVendors = async () => {
    try {
      if (!eventId) return;
      const key = `event_vendors_${eventId}`;
      const stored = await AsyncStorage.getItem(key);
      if (stored) setAddedVendors(JSON.parse(stored));
    } catch (err) {
      console.error("Error loading vendors:", err);
    }
  };

  const handleAddVendor = async (vendor) => {
    try {
      const updated = addedVendors.includes(vendor._id)
        ? addedVendors.filter((id) => id !== vendor._id)
        : [...addedVendors, vendor._id];
      setAddedVendors(updated);
      if (eventId) {
        await AsyncStorage.setItem(`event_vendors_${eventId}`, JSON.stringify(updated));
      }
    } catch (err) {
      console.error("Error updating vendors:", err);
    }
  };

  // Local filtering (for search/sort)
  const filteredVendors = vendors.filter((v) => {
    const matchSearch =
      !searchQuery ||
      v.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.city?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSearch;
  }).sort((a, b) => {
    // Assuming backend returns rating/price, otherwise fallback to 0
    const ratingA = a.rating || 0;
    const ratingB = b.rating || 0;
    const priceA = a.startingPrice || 0;
    const priceB = b.startingPrice || 0;

    if (sortBy === "rating") return ratingB - ratingA;
    if (sortBy === "price_asc") return priceA - priceB;
    if (sortBy === "price_desc") return priceB - priceA;
    return 0;
  });

  const renderVendorCard = (vendor) => {
    const isAdded = addedVendors.includes(vendor._id);
    return (
      <TouchableOpacity
        key={vendor._id}
        style={styles.vendorCard}
        activeOpacity={0.88}
        onPress={() =>
          router.push({
            pathname: `/(tabs)/Vendor/${vendor._id}`,
            params: { eventId, eventName },
          })
        }
      >
        <Image 
          source={{ uri: vendor.cover_photo || vendor.imageUrl || vendor.picture || vendor.image || "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?w=600" }} 
          style={styles.vendorImg} 
        />
        <View style={styles.vendorImgOverlay}>
          {vendor.is_active && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={10} color="#FFF" />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
          {eventId && (
            <TouchableOpacity
              style={[styles.addBtn, isAdded && styles.addBtnAdded]}
              onPress={(e) => {
                e.stopPropagation();
                handleAddVendor(vendor);
              }}
            >
              <Ionicons name={isAdded ? "checkmark-circle" : "add-circle-outline"} size={16} color="#FFF" />
              <Text style={styles.addBtnText}>{isAdded ? "Added" : "Add"}</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.vendorInfo}>
          <View style={styles.vendorNameRow}>
            <Text style={styles.vendorCategoryIcon}>{vendor.categoryIcon || "✨"}</Text>
            <Text style={styles.vendorName} numberOfLines={1}>{vendor.businessName || vendor.name}</Text>
          </View>
          <Text style={styles.vendorTagline} numberOfLines={1}>{vendor.description}</Text>
          <View style={styles.vendorMeta}>
            <View style={styles.ratingChip}>
              <Ionicons name="star" size={12} color="#FAB843" />
              <Text style={styles.ratingText}>{vendor.rating || 0}</Text>
              <Text style={styles.reviewCount}>({vendor.reviewCount || 0})</Text>
            </View>
            <View style={styles.locationChip}>
              <Ionicons name="location-outline" size={12} color="#888" />
              <Text style={styles.locationText}>{vendor.city || "Lagos"}</Text>
            </View>
          </View>
          <View style={styles.vendorFooter}>
            <Text style={styles.priceLabel}>Starting from</Text>
            <Text style={styles.priceVal}>₦{(vendor.startingPrice || vendor.price || vendor.products?.[0]?.price || 0).toLocaleString()}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Vendor Marketplace</Text>
          {eventName ? (
            <Text style={styles.headerSub} numberOfLines={1}>for {eventName}</Text>
          ) : null}
        </View>
        {addedVendors.length > 0 && eventId && (
          <View style={styles.addedBadge}>
            <Text style={styles.addedBadgeText}>{addedVendors.length} added</Text>
          </View>
        )}
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color="#888" />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search vendors by name or city..."
          placeholderTextColor="#bbb"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={18} color="#888" />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
      >
        {categories.map((cat, idx) => (
          <TouchableOpacity
            key={cat._id}
            style={[styles.catChip, selectedCategory === cat._id && styles.catChipActive]}
            onPress={() => setSelectedCategory(cat._id)}
          >
            <Text style={styles.catChipIcon}>{cat.icon}</Text>
            <Text
              style={[styles.catChipText, selectedCategory === cat._id && styles.catChipTextActive]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Result count */}
      <Text style={styles.resultCount}>{filteredVendors.length} vendors found</Text>

      {/* Sort Buttons Row */}
      <View style={styles.sortRow}>
        {[
          { key: "rating", label: "⭐ Top Rated" },
          { key: "price_asc", label: "Price ↑" },
          { key: "price_desc", label: "Price ↓" },
        ].map((s) => (
          <TouchableOpacity
            key={s.key}
            style={[styles.sortBtn, sortBy === s.key && styles.sortBtnActive]}
            onPress={() => setSortBy(s.key)}
          >
            <Text style={[styles.sortBtnText, sortBy === s.key && styles.sortBtnTextActive]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Vendor List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.vendorList}
      >
        {filteredVendors.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 48 }}>🔍</Text>
            <Text style={styles.emptyTitle}>No vendors found</Text>
            <Text style={styles.emptySubtitle}>Try changing your search or category filter</Text>
          </View>
        ) : (
          filteredVendors.map(renderVendorCard)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F6FF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 58 : 44,
    paddingBottom: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#F3EDFF", justifyContent: "center", alignItems: "center" },
  headerTitle: { fontFamily: "Poppins_700Bold", fontSize: 18, color: "#1A1A1A" },
  headerSub: { fontFamily: "Poppins_400Regular", fontSize: 12, color: "#888" },
  addedBadge: { backgroundColor: "#5A31F4", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  addedBadgeText: { fontFamily: "Poppins_600SemiBold", fontSize: 12, color: "#FFF" },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#FFF", marginHorizontal: 16, marginTop: 14, marginBottom: 10,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11,
    borderWidth: 1.5, borderColor: "#E0D4FF",
  },
  searchInput: { flex: 1, fontFamily: "Poppins_400Regular", fontSize: 14, color: "#1A1A1A" },
  categoryScroll: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
    alignItems: "center",
    flexDirection: "row",
  },
  catChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#FFF", borderWidth: 1.5, borderColor: "#E0D4FF",
    justifyContent: "center",
    marginRight: 8,
  },
  catChipActive: { backgroundColor: "#5A31F4", borderColor: "#5A31F4" },
  catChipIcon: { fontSize: 14, includeFontPadding: false },
  catChipText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: "#666",
    includeFontPadding: false,
  },
  catChipTextActive: { color: "#FFF" },
  resultCount: { fontFamily: "Poppins_500Medium", fontSize: 13, color: "#888", paddingHorizontal: 16, marginBottom: 8 },
  sortRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 14, flexWrap: "wrap" },
  sortBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: "#FFF", borderWidth: 1.5, borderColor: "#E0D4FF" },
  sortBtnActive: { backgroundColor: "#5A31F4", borderColor: "#5A31F4" },
  sortBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 12, color: "#666" },
  sortBtnTextActive: { color: "#FFF" },
  vendorList: { paddingHorizontal: 16, paddingBottom: 30, gap: 14 },
  vendorCard: { backgroundColor: "#FFF", borderRadius: 18, overflow: "hidden", shadowColor: "#5A31F4", shadowOpacity: 0.06, shadowRadius: 12, elevation: 4 },
  vendorImg: { width: "100%", height: 170 },
  vendorImgOverlay: { position: "absolute", top: 0, left: 0, right: 0, height: 170, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", padding: 12 },
  verifiedBadge: { flexDirection: "row", gap: 4, alignItems: "center", backgroundColor: "rgba(46,204,113,0.9)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  verifiedText: { fontFamily: "Poppins_600SemiBold", fontSize: 11, color: "#FFF" },
  addBtn: { flexDirection: "row", gap: 4, alignItems: "center", backgroundColor: "rgba(90,49,244,0.85)", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  addBtnAdded: { backgroundColor: "rgba(46,204,113,0.85)" },
  addBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 11, color: "#FFF" },
  vendorInfo: { padding: 14 },
  vendorNameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  vendorCategoryIcon: { fontSize: 16 },
  vendorName: { fontFamily: "Poppins_700Bold", fontSize: 16, color: "#1A1A1A", flex: 1 },
  vendorTagline: { fontFamily: "Poppins_400Regular", fontSize: 12, color: "#888", marginBottom: 10 },
  vendorMeta: { flexDirection: "row", gap: 10, marginBottom: 10 },
  ratingChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FFF8EC", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  ratingText: { fontFamily: "Poppins_600SemiBold", fontSize: 12, color: "#1A1A1A" },
  reviewCount: { fontFamily: "Poppins_400Regular", fontSize: 12, color: "#888" },
  locationChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#F3F4F6", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  locationText: { fontFamily: "Poppins_400Regular", fontSize: 12, color: "#666" },
  vendorFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#F0F0F0", paddingTop: 10 },
  priceLabel: { fontFamily: "Poppins_400Regular", fontSize: 12, color: "#888" },
  priceVal: { fontFamily: "Poppins_700Bold", fontSize: 15, color: "#5A31F4" },
  emptyState: { alignItems: "center", paddingVertical: 60 },
  emptyTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 18, color: "#333", marginTop: 12 },
  emptySubtitle: { fontFamily: "Poppins_400Regular", fontSize: 14, color: "#888", marginTop: 4, textAlign: "center" },
});
