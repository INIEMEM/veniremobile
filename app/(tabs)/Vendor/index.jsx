import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../../utils/axiosInstance';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

// ─── Category Icon Map ─────────────────────────────────────────────────────────
const ICON_MAP = {
  'master of ceremony': '🎤',
  catering: '🍽️',
  photography: '📸',
  decoration: '🎨',
  'event hall': '🏛️',
  sound: '🎵',
  lighting: '💡',
  cake: '🎂',
  security: '🛡️',
  transportation: '🚌',
  makeup: '💄',
  dj: '🎧',
  band: '🎸',
  default: '🏢',
};

const getCategoryIcon = (name = '') => {
  const lower = name.toLowerCase();
  for (const key of Object.keys(ICON_MAP)) {
    if (lower.includes(key)) return ICON_MAP[key];
  }
  return ICON_MAP.default;
};

// ─── Skeleton Component ────────────────────────────────────────────────────────
function SkeletonBox({ width: w, height: h, borderRadius = 8, style }) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 600, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);
  return (
    <Animated.View
      style={[{ width: w, height: h, borderRadius, backgroundColor: '#E0E0E0', opacity }, style]}
    />
  );
}

// ─── Skeleton: Featured Vendors ────────────────────────────────────────────────
function FeaturedSkeleton() {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 16 }}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={{ width: 200, borderRadius: 18, overflow: 'hidden', gap: 8 }}>
          <SkeletonBox width={200} height={240} borderRadius={18} />
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Skeleton: Category Grid ───────────────────────────────────────────────────
function CategoriesSkeleton() {
  const itemWidth = (width - 32 - 20) / 4;
  return (
    <View style={styles.categoriesGrid}>
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <SkeletonBox key={i} width={itemWidth} height={82} borderRadius={14} />
      ))}
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function VendorHub() {
  const router = useRouter();
  const [featuredVendors, setFeaturedVendors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myBookings, setMyBookings] = useState([]);
  const [vendorStatus, setVendorStatus] = useState(null); // 'approved', 'pending', or null

  // ─── Fetch Data ──────────────────────────────────────────────────────────────
  const fetchFeaturedVendors = useCallback(async () => {
    try {
      const res = await api.get('/user/vendors/featured');
      console.log('Featured vendors response:', JSON.stringify(res.data));
      if (res.data?.success) {
        setFeaturedVendors(res.data.data || []);
      }
    } catch (e) {
      console.log('Failed to load featured vendors:', e?.response?.status, e?.response?.data || e?.message);
    } finally {
      setLoadingFeatured(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get('/user/servicetype');
      console.log('Categories response:', JSON.stringify(res.data));
      if (res.data?.success) {
        setCategories(res.data.data || []);
      }
    } catch (e) {
      console.log('Failed to load categories:', e?.response?.status, e?.response?.data || e?.message);
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  const loadMyBookings = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('vendor_bookings');
      if (stored) setMyBookings(JSON.parse(stored));
    } catch (err) {
      console.error('Error loading bookings:', err);
    }
  }, []);

  const fetchVendorStatus = useCallback(async () => {
    try {
      const res = await api.get('/vendor/request');
      if (res.data?.success && res.data?.data) {
        setVendorStatus(res.data.data.status);
      }
    } catch (e) {
      // It's normal for this to 404 if they have never applied
      if (e?.response?.status !== 404) {
        console.log('Failed to fetch vendor status:', e?.response?.data || e?.message);
      }
    }
  }, []);

  useEffect(() => {
    fetchFeaturedVendors();
    fetchCategories();
    loadMyBookings();
    fetchVendorStatus();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    setLoadingFeatured(true);
    setLoadingCategories(true);
    await Promise.all([fetchFeaturedVendors(), fetchCategories(), loadMyBookings(), fetchVendorStatus()]);
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5A31F4" />}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* ━━━ HERO HEADER ━━━ */}
        <View style={styles.heroHeader}>
          <View style={styles.heroContent}>
            <Text style={styles.heroGreeting}>Vendor Hub 🤝</Text>
            <Text style={styles.heroTitle}>Find the perfect{'\n'}vendors for your event</Text>
            <TouchableOpacity
              style={styles.heroSearchBtn}
              onPress={() => router.push('/(tabs)/Vendor/marketplace')}
            >
              <Ionicons name="search-outline" size={18} color="#888" />
              <Text style={styles.heroSearchText}>Search vendors...</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ━━━ QUICK ACTIONS ━━━ */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: '#5A31F4' }]}
            onPress={() => router.push('/(tabs)/Vendor/marketplace')}
          >
            <Ionicons name="storefront-outline" size={22} color="#FFF" />
            <Text style={[styles.quickActionText, { color: '#FFF' }]}>Browse All</Text>
          </TouchableOpacity>

          {vendorStatus === 'approved' ? (
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: '#FFF' }]}
              onPress={() => router.push('/vendor-dashboard')}
            >
              <Ionicons name="grid-outline" size={22} color="#5A31F4" />
              <Text style={[styles.quickActionText, { color: '#5A31F4' }]}>Dashboard</Text>
            </TouchableOpacity>
          ) : vendorStatus === 'pending' ? (
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: '#FFF' }]}
              onPress={() => {}}
            >
              <Ionicons name="time-outline" size={22} color="#FAB843" />
              <Text style={[styles.quickActionText, { color: '#FAB843' }]}>Pending</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: '#FFF' }]}
              onPress={() => router.push('/(tabs)/Vendor/register')}
            >
              <Ionicons name="person-add-outline" size={22} color="#5A31F4" />
              <Text style={[styles.quickActionText, { color: '#5A31F4' }]}>Register</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: '#FFF' }]}
            onPress={() => {}}
          >
            <Ionicons name="bookmark-outline" size={22} color="#FAB843" />
            <Text style={[styles.quickActionText, { color: '#FAB843' }]}>Saved</Text>
          </TouchableOpacity>
        </View>

        {/* ━━━ MY BOOKINGS ━━━ */}
        {myBookings.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Booking Requests</Text>
              <TouchableOpacity>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            {myBookings.slice(0, 3).map((booking) => (
              <View key={booking.id} style={styles.bookingCard}>
                <View style={styles.bookingIconBox}>
                  <Text style={{ fontSize: 22 }}>{getCategoryIcon(booking.category)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bookingVendor}>{booking.vendorName}</Text>
                  <Text style={styles.bookingEvent} numberOfLines={1}>
                    {booking.eventName} • {booking.eventDate}
                  </Text>
                </View>
                <View style={[styles.bookingStatus, { backgroundColor: booking.status === 'pending' ? '#FFF8EC' : '#E6F9F0' }]}>
                  <Text style={[styles.bookingStatusText, { color: booking.status === 'pending' ? '#FAB843' : '#2ECC71' }]}>
                    {booking.status === 'pending' ? '⏳ Pending' : '✅ Confirmed'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ━━━ FEATURED VENDORS ━━━ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Vendors</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/Vendor/marketplace')}>
              <Text style={styles.seeAll}>See all →</Text>
            </TouchableOpacity>
          </View>

          {loadingFeatured ? (
            <FeaturedSkeleton />
          ) : featuredVendors.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No featured vendors yet.</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 16 }}>
              {featuredVendors.map((v) => {
                const icon = getCategoryIcon(v.serviceType?.name || '');
                return (
                  <TouchableOpacity
                    key={v._id}
                    style={styles.featuredCard}
                    onPress={() => router.push(`/(tabs)/Vendor/${v._id}`)}
                    activeOpacity={0.88}
                  >
                    <Image
                      source={{
                        uri: v.cover_photo || v.imageUrl || v.picture || v.image || 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?w=500',
                      }}
                      style={styles.featuredImg}
                    />
                    <View style={styles.featuredOverlay} />
                    {v.isVerified && (
                      <View style={styles.verifiedBadge}>
                        <Ionicons name="shield-checkmark" size={10} color="#FFF" />
                        <Text style={styles.verifiedText}>Verified</Text>
                      </View>
                    )}
                    <View style={styles.featuredInfo}>
                      {v.serviceType?.name && (
                        <Text style={styles.featuredCat}>{icon} {v.serviceType.name}</Text>
                      )}
                      <Text style={styles.featuredName} numberOfLines={1}>{v.businessName}</Text>
                      <View style={styles.featuredRating}>
                        <Ionicons name="star" size={11} color="#FAB843" />
                        <Text style={styles.featuredRatingText}>
                          {v.rating > 0 ? `${v.rating} (${v.completedOrders})` : 'New'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* ━━━ BROWSE BY CATEGORY ━━━ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Browse by Category</Text>
          </View>

          {loadingCategories ? (
            <CategoriesSkeleton />
          ) : categories.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No categories available.</Text>
            </View>
          ) : (
            <View style={styles.categoriesGrid}>
              {categories.map((cat) => {
                const icon = getCategoryIcon(cat.name);
                return (
                  <TouchableOpacity
                    key={cat._id}
                    style={styles.categoryCard}
                    onPress={() =>
                      router.push({ pathname: '/(tabs)/Vendor/marketplace', params: { categoryId: cat._id } })
                    }
                    activeOpacity={0.8}
                  >
                    <Text style={styles.categoryCardIcon}>{icon}</Text>
                    <Text style={styles.categoryCardName} numberOfLines={1}>{cat.name}</Text>
                    <Text style={styles.categoryCardCount}>
                      {cat.no_of_vendors > 0 ? `${cat.no_of_vendors} vendors` : 'Be first!'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* ━━━ BECOME A VENDOR BANNER ━━━ */}
        <View style={styles.vendorBanner}>
          <View style={styles.vendorBannerLeft}>
            <Text style={styles.vendorBannerTitle}>Are you a vendor?</Text>
            <Text style={styles.vendorBannerSubtitle}>
              Join hundreds of vendors earning through Venire events.
            </Text>
            <TouchableOpacity
              style={styles.vendorBannerBtn}
              onPress={() => router.push('/(tabs)/Vendor/register')}
            >
              <Text style={styles.vendorBannerBtnText}>Register Now →</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 60 }}>🚀</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F6FF' },
  heroHeader: {
    backgroundColor: '#5A31F4',
    paddingTop: Platform.OS === 'ios' ? 60 : 46,
    paddingBottom: 28,
    paddingHorizontal: 20,
  },
  heroContent: {},
  heroGreeting: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: 'rgba(255,255,255,0.75)', marginBottom: 4 },
  heroTitle: { fontFamily: 'Poppins_700Bold', fontSize: 26, color: '#FFF', lineHeight: 34, marginBottom: 18 },
  heroSearchBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFF', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13,
  },
  heroSearchText: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: '#bbb' },
  quickActions: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: -16 },
  quickAction: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, borderRadius: 16,
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, elevation: 4,
  },
  quickActionText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12 },
  section: { paddingTop: 24, paddingHorizontal: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontFamily: 'Poppins_700Bold', fontSize: 17, color: '#1A1A1A' },
  seeAll: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: '#5A31F4' },

  // Bookings
  bookingCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  bookingIconBox: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#F3EDFF', justifyContent: 'center', alignItems: 'center' },
  bookingVendor: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#1A1A1A' },
  bookingEvent: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: '#888', marginTop: 2 },
  bookingStatus: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  bookingStatusText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11 },

  // Featured
  featuredCard: { width: 200, borderRadius: 18, overflow: 'hidden', position: 'relative' },
  featuredImg: { width: 200, height: 240 },
  featuredOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,0,40,0.45)' },
  verifiedBadge: {
    position: 'absolute', top: 10, right: 10, flexDirection: 'row', gap: 4, alignItems: 'center',
    backgroundColor: 'rgba(46,204,113,0.85)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
  },
  verifiedText: { fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: '#FFF' },
  featuredInfo: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14 },
  featuredCat: { fontFamily: 'Poppins_500Medium', fontSize: 11, color: 'rgba(255,255,255,0.8)', marginBottom: 2 },
  featuredName: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: '#FFF', marginBottom: 4 },
  featuredRating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  featuredRatingText: { fontFamily: 'Poppins_500Medium', fontSize: 12, color: 'rgba(255,255,255,0.9)' },

  // Categories
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryCard: {
    width: (width - 32 - 20) / 4,
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14, padding: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  categoryCardIcon: { fontSize: 24, marginBottom: 5 },
  categoryCardName: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: '#1A1A1A', textAlign: 'center' },
  categoryCardCount: { fontFamily: 'Poppins_400Regular', fontSize: 10, color: '#888', marginTop: 2, textAlign: 'center' },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 24 },
  emptyStateText: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: '#9CA3AF' },

  // Banner
  vendorBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    margin: 16, backgroundColor: '#1A0A4E', borderRadius: 20, padding: 20,
  },
  vendorBannerLeft: { flex: 1 },
  vendorBannerTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: '#FFF', marginBottom: 6 },
  vendorBannerSubtitle: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 19, marginBottom: 14 },
  vendorBannerBtn: { alignSelf: 'flex-start', backgroundColor: '#FAB843', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 12 },
  vendorBannerBtnText: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: '#1A1A1A' },
});