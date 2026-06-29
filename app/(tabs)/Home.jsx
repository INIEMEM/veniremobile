import React, { useEffect, useState, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  TextInput,
  Dimensions,
  Platform,
  StatusBar,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import EventsScreen from "../../components/EventsScreen";
import PlacesScreen from "../../components/PlacesScreen";
import ReelsScreen from "../../components/ReelsScreen";
import FilterModal from "../../components/FilterModal";
import { useAuth } from "../../context/AuthContext";
import { truncateText } from "../../utils/truncateText";
import MOCK_REELS from "../../constants/reelsMockData";

const { width, height } = Dimensions.get("window");

export default function Home() {
  const [user, setUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [selectedTab, setSelectedTab] = useState("events");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState({
    status: "all",
    distance: "any",
    price: "all",
    date: "any"
  });
  const [reelsMode, setReelsMode] = useState(false);
  const [mapMode, setMapMode] = useState(false);
  const router = useRouter();
  const toggleAnim = useRef(new Animated.Value(0)).current;
  // Subtle animations
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(-10)).current;
  const searchOpacity = useRef(new Animated.Value(0)).current;
  const searchY = useRef(new Animated.Value(-10)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentY = useRef(new Animated.Value(10)).current;
  const bannerOpacity = useRef(new Animated.Value(0)).current;
  const bannerY = useRef(new Animated.Value(-10)).current;

  useEffect(() => {
    const fetchUser = async () => {
      const token = await AsyncStorage.getItem("token");
      const storedUser = await AsyncStorage.getItem("user");
      const guestStatus = await AsyncStorage.getItem("isGuest");
      
      setIsGuest(guestStatus === "true");
      
      if (token && storedUser && guestStatus !== "true") {
        setUser(JSON.parse(storedUser));
        console.log("User data set successfully:", JSON.parse(storedUser));
      } else {
        setUser(null);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    // Subtle staggered entrance animations
    const animations = [
      // Header animation
      Animated.parallel([
        Animated.timing(headerY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(headerOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      // Banner animation (if guest)
      ...(isGuest
        ? [
            Animated.sequence([
              Animated.delay(150),
              Animated.parallel([
                Animated.timing(bannerY, {
                  toValue: 0,
                  duration: 500,
                  useNativeDriver: true,
                }),
                Animated.timing(bannerOpacity, {
                  toValue: 1,
                  duration: 500,
                  useNativeDriver: true,
                }),
              ]),
            ]),
          ]
        : []),
      // Search bar animation
      Animated.sequence([
        Animated.delay(isGuest ? 300 : 150),
        Animated.parallel([
          Animated.timing(searchY, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(searchOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ]),
      // Content animation
      Animated.sequence([
        Animated.delay(isGuest ? 450 : 300),
        Animated.parallel([
          Animated.timing(contentY, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(contentOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ];

    Animated.parallel(animations).start();
  }, [isGuest]);

  const handleSupport = () => {
    router.push("/support");
  };

  const handleToggle = (tab) => {
    setSelectedTab(tab);
    Animated.spring(toggleAnim, {
      toValue: tab === "events" ? 0 : 1,
      useNativeDriver: false,
      friction: 8,
    }).start();
  };

  const handleLoginPrompt = async () => {
    await AsyncStorage.removeItem("isGuest");
    router.push("/auth/login");
  };

  const handleFilterPress = () => {
    setFilterModalVisible(true);
  };

  const handleSelectFilter = (filter) => {
    setSelectedFilter(filter);
  };

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning,"
    if (hour < 17) return "Good afternoon,"
    return "Good evening,"
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: reelsMode ? "#000000" : "#F8F8F8",
          paddingTop: reelsMode
            ? 0
            : Platform.OS === "ios" 
              ? 60 
              : (StatusBar.currentHeight || 40) + 10,
        },
      ]}
    >
      {/* Always visible — reels toggle only */}
      {reelsMode && (
        <View style={styles.reelsModeHeader}>
          <TouchableOpacity
            style={styles.reelsBackBtn}
            onPress={() => setReelsMode(false)}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="chevron-back" 
              size={20} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>
        </View>
      )}

      {/* ===== HEADER SECTION ===== */}
      {!reelsMode && (
        <Animated.View
          style={[
            styles.header,
            {
              transform: [{ translateY: headerY }],
              opacity: headerOpacity,
            },
          ]}
        >
          <View style={styles.userInfo}>
            <TouchableOpacity
              onPress={() =>
                isGuest
                  ? handleLoginPrompt()
                  : router.push(`/profile/${user?._id}`)
              }
              activeOpacity={0.7}
            >
              <Image
                source={
                  user?.profile_picture
                    ? { uri: user?.profile_picture }
                    : require("../../assets/default-avatar.jpg")
                }
                style={styles.avatar}
              />
            </TouchableOpacity>
            <View style={styles.userTextBlock}>
              <Text
                style={styles.greetingLabel}
                numberOfLines={1}
                ellipsizeMode="tail"
                allowFontScaling={false}
              >
                {getGreeting()}
              </Text>
              <Text
                style={styles.userNameLarge}
                numberOfLines={1}
                ellipsizeMode="tail"
                allowFontScaling={false}
              >
                {isGuest ? "Explorer 👋" : 
                  (user ? truncateText(user.firstname, 10) : "Guest")}
              </Text>
            </View>
          </View>

          {/* Toggle + Support/Login */}
          <View style={styles.headerRight}>
            {isGuest ? (
              <TouchableOpacity
                style={styles.loginButton}
                onPress={handleLoginPrompt}
                activeOpacity={0.8}
              >
                <Ionicons name="log-in-outline" size={18} color="#5A31F4" />
                <Text style={styles.loginButtonText}>Login</Text>
              </TouchableOpacity>
            ) : (
              <>
                <View style={styles.toggleContainer}>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      selectedTab === "events" && 
                        !reelsMode && styles.activeToggle,
                    ]}
                    onPress={() => {
                      setSelectedTab("events")
                      setReelsMode(false)
                      setMapMode(false)
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.toggleText,
                        selectedTab === "events" && 
                          !reelsMode && styles.activeToggleText,
                      ]}
                    >
                      Events
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      selectedTab === "places" && 
                        !reelsMode && styles.activeToggle,
                    ]}
                    onPress={() => {
                      setSelectedTab("places")
                      setReelsMode(false)
                      setMapMode(false)
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.toggleText,
                        selectedTab === "places" && 
                          !reelsMode && styles.activeToggleText,
                      ]}
                    >
                      Places
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.supportIcon}
                  onPress={() => router.push("/Notifications")}
                  activeOpacity={0.7}
                >
                  <View style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: "#F3F4F6",
                    justifyContent: "center",
                    alignItems: "center",
                    position: "relative",
                  }}>
                    <Ionicons name="notifications-outline" 
                      size={22} color="#333" />
                    <View style={{
                      position: "absolute",
                      top: 0, right: 0,
                      width: 8, height: 8,
                      borderRadius: 4,
                      backgroundColor: "#FF3B30"
                    }} />
                  </View>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Animated.View>
      )}

      {/* ===== GUEST BANNER ===== */}
      {!reelsMode && isGuest && (
        <Animated.View
          style={[
            styles.guestBanner,
            {
              transform: [{ translateY: bannerY }],
              opacity: bannerOpacity,
            },
          ]}
        >
          <View style={{
            width: 44, height: 44, borderRadius: 22,
            backgroundColor: "#EDE4FF",
            justifyContent: "center", alignItems: "center"
          }}>
            <Ionicons name="flash-outline" size={22} color="#5A31F4" />
          </View>
          <View style={styles.guestBannerTextContainer}>
            <Text style={styles.guestBannerTitle}>Browsing as Guest</Text>
            <Text style={styles.guestBannerSubtitle}>
              Login to like, bookmark, and interact with events
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleLoginPrompt}
            style={styles.guestBannerButton}
          >
            <Text style={styles.guestBannerButtonText}>Login</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ===== SEARCH BAR + FILTER ===== */}
      {!reelsMode && (
        <Animated.View
          style={[
            styles.searchRow,
            {
              transform: [{ translateY: searchY }],
              opacity: searchOpacity,
            },
          ]}
        >
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder={`Search ${selectedTab}...`}
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          {/* Map Mode Button */}
          {/* <TouchableOpacity 
            style={[styles.filterButton, mapMode && styles.filterButtonActive]} 
            activeOpacity={0.7}
            onPress={() => {
              setSelectedTab("events");
              setMapMode(!mapMode);
              setReelsMode(false);
            }}
          >
            <Ionicons 
              name="map-outline" 
              size={22} 
              color={mapMode ? "#5A31F4" : "#666"} 
            />
          </TouchableOpacity> */}

          {/* Reels Mode Button */}
          <TouchableOpacity 
            style={styles.filterButton} 
            activeOpacity={0.7}
            onPress={() => {
              setSelectedTab("events");
              setReelsMode(true);
              setMapMode(false);
            }}
          >
            <Ionicons 
              name="play-circle-outline" 
              size={24} 
              color="#5A31F4" 
            />
          </TouchableOpacity>

          {/* Filter Button */}
          <TouchableOpacity 
            style={[
              styles.filterButton,
              (selectedFilter.status !== "all" || selectedFilter.distance !== "any" || selectedFilter.price !== "all" || selectedFilter.date !== "any") && styles.filterButtonActive
            ]} 
            activeOpacity={0.7}
            onPress={handleFilterPress}
          >
            <Ionicons 
              name="options-outline" 
              size={22} 
              color={(selectedFilter.status !== "all" || selectedFilter.distance !== "any" || selectedFilter.price !== "all" || selectedFilter.date !== "any") ? "#5A31F4" : "#666"} 
            />
            {(selectedFilter.status !== "all" || selectedFilter.distance !== "any" || selectedFilter.price !== "all" || selectedFilter.date !== "any") && (
              <View style={styles.filterBadge} />
            )}
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ===== CONTENT AREA ===== */}
      <Animated.View
        style={[
          styles.contentArea,
          reelsMode && styles.reelsContentArea,
          {
            transform: [{ translateY: contentY }],
            opacity: contentOpacity,
          },
        ]}
      >
        {selectedTab === "events" ? (
          reelsMode ? (
            <ReelsScreen
              events={MOCK_REELS}
              isExploreMode={isGuest}
              onInterested={() => {}}
            />
          ) : (
            <EventsScreen 
              isExploreMode={isGuest} 
              searchQuery={searchQuery}
              filterStatus={selectedFilter}
              mapMode={mapMode}
            />
          )
        ) : (
          <PlacesScreen searchQuery={searchQuery} filterStatus={selectedFilter} />
        )}
      </Animated.View>

      {/* Filter Modal */}
      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        selectedFilter={selectedFilter}
        onSelectFilter={handleSelectFilter}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "ios" 
      ? 60 
      : (StatusBar.currentHeight || 40) + 10,
    backgroundColor: "#F8F8F8",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: height * 0.015,
    flexWrap: "nowrap",
    paddingHorizontal: 16,
    gap: 8,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
    justifyContent: "flex-end",
    minWidth: 0,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flex: 1,
    minWidth: 0,
    maxWidth: width * 0.44,
  },
  userTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: "#5A31F4",
    flexShrink: 0,
  },
  welcomeText: {
    fontSize: Math.min(width * 0.037, 14),
    fontWeight: "600",
    color: "#666",
    fontFamily: "Poppins_500Medium",
  },
  userName: {
    color: "#FAB843",
  },
  greetingLabel: {
    fontSize: 10,
    fontFamily: "Poppins_400Regular",
    color: "#999",
    includeFontPadding: false,
  },
  userNameLarge: {
    fontSize: 14,
    fontFamily: "Poppins_700Bold",
    color: "#333",
    marginTop: 0,
    includeFontPadding: false,
  },
  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f8f4ff",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e8dbff",
  },
  loginButtonText: {
    fontSize: Math.min(width * 0.035, 13),
    fontFamily: "Poppins_600SemiBold",
    color: "#5A31F4",
  },
  toggleContainer: {
    flexDirection: "row",
    borderRadius: 25,
    borderColor: "#FAB843",
    borderWidth: 1,
    overflow: "hidden",
    flexShrink: 1,
    maxWidth: 138,
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 20,
    minWidth: 66,
  },
  toggleText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: "#6B7280",
    includeFontPadding: false,
  },
  activeToggle: {
    backgroundColor: "#FAB843",
  },
  activeToggleText: {
    color: "#fff",
    includeFontPadding: false,
  },
  reelsToggleActive: {
    backgroundColor: "#5A31F4",
  },
  reelsModeHeader: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : (StatusBar.currentHeight || 40) + 10,
    left: 16,
    zIndex: 100,
  },
  reelsBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  supportIcon: {
    backgroundColor: "#F3F4F6",
    borderRadius: 100,
    width: 38,
    height: 38,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  guestBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3EDFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8DBFF",
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 0,
    gap: 10,
  },
  guestBannerTextContainer: {
    flex: 1,
  },
  guestBannerTitle: {
    fontSize: Math.min(width * 0.037, 14),
    fontFamily: "Poppins_600SemiBold",
    color: "#333",
    marginBottom: 2,
  },
  guestBannerSubtitle: {
    fontSize: Math.min(width * 0.032, 12),
    fontFamily: "Poppins_400Regular",
    color: "#666",
    lineHeight: 16,
  },
  guestBannerButton: {
    backgroundColor: "#5A31F4",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  guestBannerButtonText: {
    fontSize: Math.min(width * 0.032, 12),
    fontFamily: "Poppins_600SemiBold",
    color: "#fff",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: height * 0.015,
    paddingHorizontal: 16,
    gap: Math.min(width * 0.025, 10),
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8DBFF",
    paddingHorizontal: 14,
    height: 48,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    fontFamily: "Poppins_400Regular",
    includeFontPadding: false,
    paddingVertical: 0,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8DBFF",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
    position: "relative",
  },
  filterButtonActive: {
    backgroundColor: "#F3EDFF",
    borderColor: "#5A31F4",
  },
  filterBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#5A31F4",
  },
  contentArea: {
    flex: 1,
    marginTop: 12,
  },
  reelsContentArea: {
    marginTop: 0,
  },
  comingSoonContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  comingSoonText: {
    fontFamily: "Poppins_400Regular",
    fontSize: Math.min(width * 0.04, 15),
    color: "#666",
  },
});
