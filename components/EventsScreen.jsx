import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Animated,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import React, { useEffect, useRef, useState } from "react";
import EventCategoryBoxes from "./EventCategoryBoxes";
import { Ionicons } from "@expo/vector-icons";
import LiveEventCard from "./LiveEventCard";
import testImage from "../assets/livee.jpg";
import { useRouter } from "expo-router";
import ExploreEvents from "./ExploreEvents";
import api from "../utils/axiosInstance";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";

const { width, height } = Dimensions.get("window");

export default function EventsScreen({ isExploreMode = false, searchQuery = "" }) {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [allEvents, setAllEvents] = useState([]);
  const [ongoingEvents, setOngoingEvents] = useState([]);
  const [futureEvents, setFutureEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Subtle animations
  const categoriesOpacity = useRef(new Animated.Value(0)).current;
  const categoriesY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    fetchCategories();
    fetchAllEvents();
  }, []);

  useEffect(() => {
    // Subtle entrance animation for categories
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

  const fetchAllEvents = async () => {
    try {
      setLoadingEvents(true);
      const token = await AsyncStorage.getItem("token");
      const isGuest = await AsyncStorage.getItem("isGuest");

      const url = isExploreMode || isGuest === "true" ? "/event/explore" : "/event";
      const config = isGuest === "true" || !token 
        ? {} 
        : { headers: { Authorization: `Bearer ${token}` } };

      const response = await api.get(url, config);

      if (response.data.success) {
        const events = response.data.data;
        categorizeEvents(events);
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
    }
  };

  const categorizeEvents = (events) => {
    const now = new Date();
    const ongoing = [];
    const future = [];

    events.forEach(event => {
      const startDate = new Date(event.start);
      const endDate = event.end ? new Date(event.end) : null;

      // Check if event is ongoing
      if (startDate <= now && (!endDate || endDate >= now)) {
        ongoing.push(event);
      } 
      // Future events
      else if (startDate > now) {
        future.push(event);
      }
    });
    console.log("on Events:", ongoing);
    setOngoingEvents(ongoing);
    setFutureEvents(future);
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
      console.log("Search Results:", response.data.data);
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Helper function to get event media (video or image)
  const getEventMedia = (event) => {
    // Check if event has videos first
    if (event.videos && event.videos.length > 0) {
      return { type: 'video', src: event.videos[0] };
    }
    // Fall back to images
    if (event.images && event.images.length > 0) {
      return { type: 'image', src: event.images[0] };
    }
    // Default placeholder image
    return { 
      type: 'image', 
      src: "https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=800" 
    };
  };

  // Create randomized sections
  const createRandomizedFeed = () => {
    const sections = [];
    let allEventsIndex = 0;
    let ongoingIndex = 0;
    let futureIndex = 0;

    // Randomize section order
    const sectionTypes = ['all', 'ongoing', 'future'];
    const randomizedTypes = [...sectionTypes].sort(() => Math.random() - 0.5);

    randomizedTypes.forEach((type, index) => {
      if (type === 'ongoing' && ongoingEvents.length > 0) {
        sections.push({
          id: `ongoing-${index}`,
          type: 'ongoing',
          title: 'Happening Now',
          events: ongoingEvents.slice(ongoingIndex, ongoingIndex + 3),
          scrollDirection: 'horizontal'
        });
        ongoingIndex += 3;
      } else if (type === 'future' && futureEvents.length > 0) {
        sections.push({
          id: `future-${index}`,
          type: 'future',
          title: 'Upcoming Events',
          events: futureEvents.slice(futureIndex, futureIndex + 3),
          scrollDirection: 'horizontal'
        });
        futureIndex += 3;
      } else if (type === 'all' && allEvents.length > 0) {
        sections.push({
          id: `all-${index}`,
          type: 'all',
          title: 'Explore Events',
          events: allEvents.slice(allEventsIndex, allEventsIndex + 4),
          scrollDirection: 'vertical'
        });
        allEventsIndex += 4;
      }
    });

    return sections;
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
          <ExploreEvents events={searchResults} isExploreMode={isExploreMode} />
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

  const randomizedSections = createRandomizedFeed();

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* ===== CATEGORIES SECTION ===== */}
      <Animated.View
        style={{
          transform: [{ translateY: categoriesY }],
          opacity: categoriesOpacity,
        }}
      >
        <Text style={styles.title}>Categories</Text>

        {loadingCategories ? (
          <View style={styles.categoriesLoadingContainer}>
            <ActivityIndicator size="small" color="#5A31F4" />
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {categories.map((category) => (
              <EventCategoryBoxes key={category._id} category={category} />
            ))}
          </ScrollView>
        )}
      </Animated.View>

      {/* ===== RANDOMIZED EVENT SECTIONS ===== */}
      {loadingEvents ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#5A31F4" />
          <Text style={styles.loadingText}>Loading events...</Text>
        </View>
      ) : (
        randomizedSections.map((section) => (
          <View key={section.id} style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.title, styles.sectionSpacing]}>
                {section.title}
              </Text>
              {section.scrollDirection === 'horizontal' && (
                <TouchableOpacity
                  onPress={() => {
                    // Navigate to full section view
                    console.log(`View all ${section.type} events`);
                  }}
                >
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              )}
            </View>

            {section.scrollDirection === 'horizontal' ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
                {section.events.map((event) => {
                  const media = getEventMedia(event);

                  return (
                    <LiveEventCard
                      key={event._id}
                      imgSrc={media.type === 'image' ? media.src : undefined}
                      videoSrc={media.type === 'video' ? media.src : undefined}
                      title={event.name}
                      caption={event.description}
                      date={formatDate(event.start)}
                      time={formatTime(event.start)}
                      location={event.address}
                      price={event.isTicket ? `₦${event.ticketAmount}` : "Free"}
                      eventId={event._id}
                    />
                  );
                })}
              </ScrollView>
            ) : (
              <ExploreEvents 
                events={allEvents} 
                isExploreMode={isExploreMode} 
              />
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: height * 0.015,
  },
  contentContainer: {
    paddingBottom: height * 0.15,
  },
  title: {
    fontFamily: "Poppins_600SemiBold",
    color: "#444",
    fontSize: Math.min(width * 0.043, 16),
    marginBottom: height * 0.012,
  },
  sectionSpacing: {
    marginTop: height * 0.03,
  },
  scrollContent: {
    paddingRight: width * 0.05,
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
  sectionContainer: {
    marginBottom: height * 0.02,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingRight: width * 0.05,
  },
  viewAllText: {
    fontFamily: "Poppins_500Medium",
    color: "#5A31F4",
    fontSize: 13,
  },
});