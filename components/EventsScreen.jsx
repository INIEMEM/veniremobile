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
  const [completedEvents, setCompletedEvents] = useState([]);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Subtle animations
  const categoriesOpacity = useRef(new Animated.Value(0)).current;
  const categoriesY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    fetchCategories();
    fetchAllEvents(1, true); // Initial load
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

  const fetchAllEvents = async (page = 1, isInitial = false) => {
    // Prevent multiple simultaneous requests
    if (loadingMore || (!isInitial && !hasMore)) return;

    try {
      if (isInitial) {
        setLoadingEvents(true);
      } else {
        setLoadingMore(true);
      }

      const token = await AsyncStorage.getItem("token");
      const isGuest = await AsyncStorage.getItem("isGuest");

      const baseUrl = isExploreMode || isGuest === "true" ? "/event/explore" : "/event";
      const url = `${baseUrl}?limit=10&page=${page}`;
      
      const config = isGuest === "true" || !token 
        ? {} 
        : { headers: { Authorization: `Bearer ${token}` } };

      const response = await api.get(url, config);

      if (response.data.success) {
        const newEvents = response.data.data;
        
        // Check if there are more events to load
        if (newEvents.length < 10) {
          setHasMore(false);
        }

        if (isInitial) {
          // Initial load - replace all events
          categorizeEvents(newEvents);
        } else {
          // Pagination - append new events
          const updatedEvents = [...allEvents, ...newEvents];
          categorizeEvents(updatedEvents);
        }

        setCurrentPage(page);
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
  
    console.log("Completed Events:", completed);
    
    setOngoingEvents(ongoing);
    setFutureEvents(pending);
    setCompletedEvents(completed);
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

  // Create advanced randomized feed with interleaved sections
  const createRandomizedFeed = () => {
    const sections = [];
    let allEventsIndex = 0;
    let ongoingIndex = 0;
    let futureIndex = 0;
    let completedEventsIndex = 0;

    // Calculate how many sections we can create for each type
    const maxOngoingSections = Math.ceil(ongoingEvents.length / 3);
    const maxFutureSections = Math.ceil(futureEvents.length / 3);
    const maxCompletedSections = Math.ceil(completedEvents.length / 3);
    const maxAllSections = Math.ceil(allEvents.length / 4);

    // Create a pool of section types based on available content
    const sectionPool = [];
    
    // Add ongoing sections to pool
    for (let i = 0; i < maxOngoingSections; i++) {
      sectionPool.push({ type: 'ongoing', index: i });
    }
    
    // Add future sections to pool
    for (let i = 0; i < maxFutureSections; i++) {
      sectionPool.push({ type: 'future', index: i });
    }
    
    // Add completed sections to pool
    for (let i = 0; i < maxCompletedSections; i++) {
      sectionPool.push({ type: 'completed', index: i });
    }
    
    // Add "all" sections to pool
    for (let i = 0; i < maxAllSections; i++) {
      sectionPool.push({ type: 'all', index: i });
    }

    // Shuffle the entire pool
    const shuffledPool = [...sectionPool].sort(() => Math.random() - 0.5);

    // Build sections from shuffled pool
    shuffledPool.forEach((item, idx) => {
      if (item.type === 'ongoing' && ongoingIndex < ongoingEvents.length) {
        const sectionEvents = ongoingEvents.slice(ongoingIndex, ongoingIndex + 3);
        if (sectionEvents.length > 0) {
          sections.push({
            id: `ongoing-${idx}`,
            type: 'ongoing',
            status: 'ongoing',
            title: 'Happening Now',
            events: sectionEvents,
            scrollDirection: 'horizontal'
          });
          ongoingIndex += 3;
        }
      } else if (item.type === 'future' && futureIndex < futureEvents.length) {
        const sectionEvents = futureEvents.slice(futureIndex, futureIndex + 3);
        if (sectionEvents.length > 0) {
          sections.push({
            id: `future-${idx}`,
            type: 'future',
            status: 'pending',
            title: 'Upcoming Events',
            events: sectionEvents,
            scrollDirection: 'horizontal'
          });
          futureIndex += 3;
        }
      } else if (item.type === 'completed' && completedEventsIndex < completedEvents.length) {
        const sectionEvents = completedEvents.slice(completedEventsIndex, completedEventsIndex + 3);
        if (sectionEvents.length > 0) {
          sections.push({
            id: `completed-${idx}`,
            type: 'completed',
            status: 'completed',
            title: 'Past Events',
            events: sectionEvents,
            scrollDirection: 'horizontal'
          });
          completedEventsIndex += 3;
        }
      } else if (item.type === 'all' && allEventsIndex < allEvents.length) {
        const sectionEvents = allEvents.slice(allEventsIndex, allEventsIndex + 4);
        if (sectionEvents.length > 0) {
          sections.push({
            id: `all-${idx}`,
            type: 'all',
            status: null,
            title: 'Explore Events',
            events: sectionEvents,
            scrollDirection: 'vertical'
          });
          allEventsIndex += 4;
        }
      }
    });

    return sections;
  };

  // Handle scroll to load more
  const handleScroll = ({ nativeEvent }) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    const paddingToBottom = 20;
    
    // Check if user is near the bottom
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= 
      contentSize.height - paddingToBottom;

    if (isCloseToBottom && hasMore && !loadingMore && !loadingEvents) {
      fetchAllEvents(currentPage + 1, false);
    }
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
      onScroll={handleScroll}
      scrollEventThrottle={400}
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
        <>
          {randomizedSections.map((section) => (
            <View key={section.id} style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.title, styles.sectionSpacing]}>
                  {section.title}
                </Text>
                {section.scrollDirection === 'horizontal' && section.status && (
                  <TouchableOpacity
                    onPress={() => {
                      router.push(`/events/all/${section.status}`);
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
                  events={section.events} 
                  isExploreMode={isExploreMode} 
                />
              )}
            </View>
          ))}

          {/* Loading More Indicator */}
          {loadingMore && (
            <View style={styles.loadingMoreContainer}>
              <ActivityIndicator size="small" color="#5A31F4" />
              <Text style={styles.loadingMoreText}>Loading more events...</Text>
            </View>
          )}

          {/* End of Feed Indicator */}
          {!hasMore && allEvents.length > 0 && (
            <View style={styles.endOfFeedContainer}>
              <Text style={styles.endOfFeedText}>You've reached the end!</Text>
              <Text style={styles.endOfFeedSubtext}>
                That's all the events for now
              </Text>
            </View>
          )}
        </>
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
  endOfFeedContainer: {
    alignItems: "center",
    paddingVertical: 30,
  },
  endOfFeedText: {
    fontFamily: "Poppins_500Medium",
    color: "#666",
    fontSize: 14,
  },
  endOfFeedSubtext: {
    fontFamily: "Poppins_400Regular",
    color: "#999",
    fontSize: 12,
    marginTop: 5,
  },
});