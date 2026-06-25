import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Animated,
  ActivityIndicator,
} from "react-native";
import React, { useEffect, useRef, useState } from "react";
import EventCategoryBoxes from "./EventCategoryBoxes";
import { Ionicons } from "@expo/vector-icons";
import ExploreEvents from "./ExploreEvents";
import MapScreen from "./MapScreen";
import api from "../utils/axiosInstance";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";

const { width, height } = Dimensions.get("window");
const PAGE_SIZE = 10;
const CACHE_TTL_MS = 60 * 1000;

let categoriesCache = null;
let categoriesCacheTime = 0;
const eventsCache = new Map();

const mergeUniqueEvents = (existingEvents, newEvents) => {
  const merged = new Map();

  existingEvents.forEach((event) => {
    if (event?._id) merged.set(event._id, event);
  });

  newEvents.forEach((event) => {
    if (event?._id) {
      merged.set(event._id, {
        ...merged.get(event._id),
        ...event,
      });
    }
  });

  return Array.from(merged.values());
};

const SkeletonLoader = ({ width, height, borderRadius = 8, style }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.8],
  });

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: "#E5E7EB", opacity },
        style,
      ]}
    />
  );
};

export default function EventsScreen({ 
  isExploreMode = false, 
  searchQuery = "",
  filterStatus = "all",
  mapMode = false
}) {
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [allEvents, setAllEvents] = useState([]);
  const [ongoingEvents, setOngoingEvents] = useState([]);
  const [futureEvents, setFutureEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [completedEvents, setCompletedEvents] = useState([]);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Subtle animations — start at final state so categories are visible immediately on remount
  const categoriesOpacity = useRef(new Animated.Value(1)).current;
  const categoriesY = useRef(new Animated.Value(0)).current;
  const loadingMoreRef = useRef(false);
  const allEventsRef = useRef([]);
  const feedCacheKeyRef = useRef("explore");

  useEffect(() => {
    const bootstrapFeed = async () => {
      const isGuest = await AsyncStorage.getItem("isGuest");
      const storedUser = await AsyncStorage.getItem("user");
      let currentUserId = "guest";

      try {
        currentUserId = storedUser ? JSON.parse(storedUser)?._id || "guest" : "guest";
      } catch (error) {
        currentUserId = "guest";
      }

      const feedCacheKey =
        isExploreMode || isGuest === "true"
          ? "explore"
          : `authenticated:${currentUserId}`;
      feedCacheKeyRef.current = feedCacheKey;
      const cachedFeed = eventsCache.get(feedCacheKey);
      const hasFreshCategoriesCache =
        categoriesCache && Date.now() - categoriesCacheTime < CACHE_TTL_MS;
      const hasFreshFeedCache =
        cachedFeed && Date.now() - cachedFeed.time < CACHE_TTL_MS;

      if (categoriesCache) {
        setCategories(categoriesCache);
        setLoadingCategories(false);
      }

      if (cachedFeed?.events?.length) {
        categorizeEvents(cachedFeed.events);
        setCurrentPage(cachedFeed.currentPage || 1);
        setHasMore(cachedFeed.hasMore ?? true);
        setLoadingEvents(false);
      }

      if (!hasFreshCategoriesCache) {
        fetchCategories();
      }

      if (!hasFreshFeedCache) {
        fetchAllEvents(1, true, {
          silent: !!cachedFeed?.events?.length,
          cacheKey: feedCacheKey,
        });
      }
    };

    bootstrapFeed();
  }, [isExploreMode]);

  useEffect(() => {
    // Only animate if categories are not already loaded from cache
    if (categoriesCache) {
      // Already loaded — snap to visible immediately
      categoriesOpacity.setValue(1);
      categoriesY.setValue(0);
    } else {
      // First load — start hidden and animate in once data arrives
      categoriesOpacity.setValue(0);
      categoriesY.setValue(10);
      Animated.parallel([
        Animated.timing(categoriesY, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(categoriesOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, []);

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const delaySearch = setTimeout(() => {
        handleSearch(searchQuery);
      }, 500);

      return () => clearTimeout(delaySearch);
    } else {
      setSearchResults(null);
    }
  }, [searchQuery]);

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await api.get("/category");

      if (response.data.success) {
        categoriesCache = response.data.data;
        categoriesCacheTime = Date.now();
        setCategories(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      Toast.show({
        type: "error",
        text1: "Failed to load categories",
        text2: error.response?.data?.message || "Please try again",
      });
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchAllEvents = async (page = 1, isInitial = false, options = {}) => {
    // Prevent multiple simultaneous requests
    if (loadingMoreRef.current || loadingMore || (!isInitial && loadingEvents)) return;

    try {
      const requestedPage = !isInitial && !hasMore ? 1 : page;

      if (isInitial) {
        if (!options.silent) {
          setLoadingEvents(true);
        }
      } else {
        loadingMoreRef.current = true;
        setLoadingMore(true);
      }

      const token = await AsyncStorage.getItem("token");
      const isGuest = await AsyncStorage.getItem("isGuest");

      const baseUrl = isExploreMode || isGuest === "true" ? "/event/explore" : "/event";
      const cacheKey =
        options.cacheKey ||
        feedCacheKeyRef.current ||
        (isExploreMode || isGuest === "true" ? "explore" : "authenticated");
      const url = `${baseUrl}?limit=${PAGE_SIZE}&page=${requestedPage}`;
      
      const config = isGuest === "true" || !token 
        ? {
          headers:{
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        } 
        : { headers: { Authorization: `Bearer ${token}` } };

      const response = await api.get(url, config);

      if (response.data.success) {
        const responseData = response.data.data;
        const newEvents = Array.isArray(responseData) ? responseData : [responseData].filter(Boolean);
        
        // Check if there are more events to load
        setHasMore(newEvents.length >= PAGE_SIZE);

        if (isInitial) {
          // Initial load - replace all events
          categorizeEvents(newEvents);
          eventsCache.set(cacheKey, {
            events: newEvents,
            currentPage: requestedPage,
            hasMore: newEvents.length >= PAGE_SIZE,
            time: Date.now(),
          });
        } else {
          // Pagination - append new events
          const updatedEvents = requestedPage === 1 && !hasMore
            ? mergeUniqueEvents(allEventsRef.current, newEvents)
            : mergeUniqueEvents(allEventsRef.current, newEvents);
          categorizeEvents(updatedEvents);
          eventsCache.set(cacheKey, {
            events: updatedEvents,
            currentPage: requestedPage,
            hasMore: newEvents.length >= PAGE_SIZE,
            time: Date.now(),
          });
        }

        setCurrentPage(requestedPage);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
      Toast.show({
        type: "error",
        text1: "Failed to load events",
        text2: error.response?.data?.message || "Please try again",
      });
    } finally {
      setLoadingEvents(false);
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  };

  const categorizeEvents = (events) => {
    const ongoing = [];
    const pending = [];
    const completed = [];
  
    events.forEach(event => {
      // Use userStatus to categorize events
      if (event.userStatus === "ongoing") {
        ongoing.push(event);
      } else if (event.userStatus === "pending") {
        pending.push(event);
      } else if (event.userStatus === "completed") {
        completed.push(event);
      }
      // Note: draft and cancelled events are excluded from the feed
    });
  
    setOngoingEvents(ongoing);
    setFutureEvents(pending);
    setCompletedEvents(completed);
    allEventsRef.current = events;
    setAllEvents(events);
  };

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    
    try {
      setSearching(true);
      const token = await AsyncStorage.getItem("token");
      const isGuest = await AsyncStorage.getItem("isGuest");

      const config = isGuest === "true" || !token 
        ? {} 
        : { headers: { Authorization: `Bearer ${token}` } };

      const response = await api.get(
        `/event/search-query?page=1&limit=10&query=${encodeURIComponent(query)}`,
        config
      );

      if (response.data.success) {
        setSearchResults(response.data.data);
      }
    } catch (error) {
      console.error("Error searching events:", error);
      Toast.show({
        type: "error",
        text1: "Search failed",
        text2: error.response?.data?.message || "Please try again",
      });
    } finally {
      setSearching(false);
    }
  };

  // Calculate Haversine distance (mocking user location at Lagos 6.5244, 3.3792)
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

  // Filter events based on selected filter
  const getFilteredEvents = () => {
    let baseEvents = allEvents;
    const status = typeof filterStatus === 'string' ? filterStatus : filterStatus.status;
    
    if (status === "ongoing") baseEvents = ongoingEvents;
    else if (status === "pending") baseEvents = futureEvents;
    else if (status === "completed") baseEvents = completedEvents;

    if (typeof filterStatus === 'string') return baseEvents;

    return baseEvents.filter(event => {
      // Distance filter
      if (filterStatus.distance && filterStatus.distance !== "any") {
        const radius = parseInt(filterStatus.distance, 10);
        if (event.lat && event.long) {
          const dist = calculateDistance(6.5244, 3.3792, parseFloat(event.lat), parseFloat(event.long));
          if (dist > radius) return false;
        } else {
          return false;
        }
      }

      // Price filter
      if (filterStatus.price === "free" && event.isTicket) return false;
      if (filterStatus.price === "paid" && !event.isTicket) return false;

      // Date filter
      if (filterStatus.date && filterStatus.date !== "any" && event.start) {
        const eventDate = new Date(event.start);
        const today = new Date();
        if (filterStatus.date === "today") {
          if (eventDate.toDateString() !== today.toDateString()) return false;
        } else if (filterStatus.date === "weekend") {
          const day = eventDate.getDay();
          if (day !== 0 && day !== 6 && day !== 5) return false; // 5=Fri, 6=Sat, 0=Sun
        }
      }

      return true;
    });
  };

  const handleLoadMore = () => {
    const isFiltered = typeof filterStatus === 'string' ? filterStatus !== "all" : filterStatus.status !== "all" || filterStatus.distance !== "any" || filterStatus.price !== "all" || filterStatus.date !== "any";
    if (loadingMoreRef.current || loadingMore || loadingEvents || isFiltered) return;

    const nextPage = hasMore ? currentPage + 1 : 1;
    fetchAllEvents(nextPage, false);
  };

  // If searching, show search results
  if (searching) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#5A31F4" />
        <Text style={styles.loadingText}>Searching...</Text>
      </View>
    );
  }

  // If map mode, show map
  if (mapMode) {
    const feedEvents = getFilteredEvents();
    return <MapScreen events={feedEvents} />;
  }

  // If there are search results, show them
  if (searchResults !== null) {
    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.searchHeader}>
          <Text style={styles.title}>
            Search Results for "{searchQuery}"
          </Text>
          <Text style={styles.resultCount}>
            {searchResults.length} event{searchResults.length !== 1 ? "s" : ""} found
          </Text>
        </View>

        {searchResults.length > 0 ? (
          <ExploreEvents events={searchResults} isExploreMode={isExploreMode} embedded />
        ) : (
          <View style={styles.emptySearchContainer}>
            <Ionicons name="search-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No events found</Text>
            <Text style={styles.emptySubtext}>
              Try different keywords or check spelling
            </Text>
          </View>
        )}
      </ScrollView>
    );
  }

  // Get filter label for display
  const getFilterLabel = () => {
    if (typeof filterStatus === 'string') {
      if (filterStatus === "ongoing") return "Happening Now";
      if (filterStatus === "pending") return "Upcoming Events";
      if (filterStatus === "completed") return "Past Events";
      return null;
    }
    
    let labels = [];
    if (filterStatus.status === "ongoing") labels.push("Live");
    if (filterStatus.status === "pending") labels.push("Upcoming");
    if (filterStatus.status === "completed") labels.push("Past");
    if (filterStatus.distance !== "any") labels.push(`<${filterStatus.distance}km`);
    if (filterStatus.price !== "all") labels.push(filterStatus.price === "free" ? "Free" : "Paid");
    if (filterStatus.date !== "any") labels.push(filterStatus.date === "today" ? "Today" : "Weekend");

    return labels.length > 0 ? labels.join(", ") : null;
  };

  const feedEvents = getFilteredEvents();
  const feedTitle = getFilterLabel() || "Explore Events";
  const feedHeader = (
    <View>
      {/* ===== CATEGORIES SECTION ===== */}
      {(!filterStatus || (typeof filterStatus === 'string' ? filterStatus === "all" : filterStatus.status === "all")) && (
        <Animated.View
          style={{
            transform: [{ translateY: categoriesY }],
            opacity: categoriesOpacity,
            paddingHorizontal: 16,
            overflow: "visible",
          }}
        >
          <View style={styles.categoriesHeader}>
            <Text style={styles.categoriesTitle}>Categories</Text>
            <Text style={styles.categoriesSubtitle}>
              Browse by type
            </Text>
          </View>

          {loadingCategories ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScrollContent}>
              {[1, 2, 3, 4, 5].map((key) => (
                <SkeletonLoader key={key} width={80} height={100} borderRadius={16} style={{ marginRight: 12, marginTop: 10 }} />
              ))}
            </ScrollView>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesScrollContent}
            >
              {categories.map((category) => (
                <EventCategoryBoxes key={category._id} category={category} />
              ))}
            </ScrollView>
          )}
        </Animated.View>
      )}

      {getFilterLabel() && (
        <View style={[styles.filterActiveContainer, { marginHorizontal: 16 }]}>
          <Text style={styles.filterActiveText}>
            Showing: {feedTitle}
          </Text>
        </View>
      )}

      <View style={[styles.sectionHeader, { paddingHorizontal: 16 }]}>
        <Text style={[styles.title, styles.sectionSpacing]}>
          {feedTitle}
        </Text>
      </View>
    </View>
  );

  if (loadingEvents && feedEvents.length === 0) {
    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        {feedHeader}
        <View style={{ marginTop: 20 }}>
          {[1, 2, 3].map((key) => (
            <View key={key} style={{ paddingHorizontal: 16, marginBottom: 24 }}>
              <SkeletonLoader width="100%" height={180} borderRadius={16} style={{ marginBottom: 12 }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <SkeletonLoader width="60%" height={24} borderRadius={6} />
                <SkeletonLoader width="20%" height={24} borderRadius={6} />
              </View>
              <SkeletonLoader width="40%" height={16} borderRadius={4} style={{ marginBottom: 12 }} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <SkeletonLoader width={32} height={32} borderRadius={16} />
                <SkeletonLoader width="30%" height={32} borderRadius={16} />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }

  if (feedEvents.length === 0) {
    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        {feedHeader}
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No events available</Text>
          <Text style={styles.emptySubtext}>
            {filterStatus !== "all" 
              ? "Try selecting a different filter" 
              : "Check back later for new events"
            }
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ExploreEvents
      events={feedEvents}
      isExploreMode={isExploreMode}
      onEndReached={handleLoadMore}
      loadingMore={loadingMore && filterStatus === "all"}
      ListHeaderComponent={feedHeader}
      contentContainerStyle={styles.contentContainer}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },
  contentContainer: {
    paddingTop: 8,
    paddingBottom: height * 0.15,
  },
  title: {
    fontFamily: "Poppins_700Bold",
    color: "#1A1A1A",
    fontSize: 16,
    marginBottom: 12,
    includeFontPadding: false,
  },
  sectionSpacing: {
    marginTop: height * 0.03,
  },
  scrollContent: {
    paddingRight: width * 0.05,
  },
  categoriesHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingRight: 4,
  },
  categoriesTitle: {
    fontFamily: "Poppins_700Bold",
    color: "#1A1A1A",
    fontSize: 16,
    includeFontPadding: false,
  },
  categoriesSubtitle: {
    fontFamily: "Poppins_400Regular",
    color: "#999",
    fontSize: 12,
    includeFontPadding: false,
  },
  categoriesScrollContent: {
    paddingLeft: 4,
    paddingRight: 16,
    paddingBottom: 6,
    paddingTop: 2,
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
    fontSize: 14,
  },
  categoriesLoadingContainer: {
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  searchHeader: {
    marginBottom: 20,
  },
  resultCount: {
    fontFamily: "Poppins_400Regular",
    color: "#666",
    fontSize: 13,
    marginTop: 4,
  },
  emptySearchContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    marginTop: 40,
  },
  emptyText: {
    marginTop: 15,
    fontFamily: "Poppins_500Medium",
    color: "#666",
    fontSize: 16,
  },
  emptySubtext: {
    marginTop: 5,
    fontFamily: "Poppins_400Regular",
    color: "#999",
    fontSize: 13,
    textAlign: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingRight: width * 0.05,
  },
  filterActiveContainer: {
    backgroundColor: "#f8f4ff",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e8dbff",
  },
  filterActiveText: {
    fontFamily: "Poppins_500Medium",
    color: "#5A31F4",
    fontSize: 14,
  },
});
