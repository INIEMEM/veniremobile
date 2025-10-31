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
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import EventsScreen from "../../components/EventsScreen";
import { useAuth } from "../../context/AuthContext";
import { truncateText } from "../../utils/truncateText";

const { width, height } = Dimensions.get("window");

export default function Home() {
  const [user, setUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [selectedTab, setSelectedTab] = useState("events");
  const [searchQuery, setSearchQuery] = useState("");
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
      
      console.log("guest status in Home:", guestStatus);
      
      setIsGuest(guestStatus === "true");
      
      if (token && storedUser && guestStatus !== "true") {
        setUser(JSON.parse(storedUser));
        console.log("User loaded in Home:", JSON.parse(storedUser));
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

  return (
    <View style={styles.container}>
      {/* ===== HEADER SECTION ===== */}
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
                  ? { uri: user.profile_picture }
                  : require("../../assets/default-avatar.jpg")
              }
              style={styles.avatar}
            />
          </TouchableOpacity>
          <View>
            <Text style={styles.welcomeText}>
              {isGuest ? "Exploring as " : "Welcome "}
              <Text style={styles.userName}>
                {user ? truncateText(user.firstname, 8) : "Guest"}
              </Text>
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
                    selectedTab === "events" && styles.activeToggle,
                  ]}
                  onPress={() => setSelectedTab("events")}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      selectedTab === "events" && styles.activeToggleText,
                    ]}
                  >
                    Events
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    selectedTab === "places" && styles.activeToggle,
                  ]}
                  onPress={() => setSelectedTab("places")}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      selectedTab === "places" && styles.activeToggleText,
                    ]}
                  >
                    Places
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.supportIcon}
                onPress={handleSupport}
                activeOpacity={0.7}
              >
                <Ionicons name="headset-outline" size={24} color="#666" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </Animated.View>

      {/* ===== GUEST BANNER ===== */}
      {isGuest && (
        <Animated.View
          style={[
            styles.guestBanner,
            {
              transform: [{ translateY: bannerY }],
              opacity: bannerOpacity,
            },
          ]}
        >
          <Ionicons name="information-circle-outline" size={22} color="#5A31F4" />
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
        </View>

        {/* Filter Button */}
        <TouchableOpacity style={styles.filterButton} activeOpacity={0.7}>
          <Ionicons name="options-outline" size={22} color="#666" />
        </TouchableOpacity>
      </Animated.View>

      {/* ===== CONTENT AREA ===== */}
      <Animated.View
        style={[
          styles.contentArea,
          {
            transform: [{ translateY: contentY }],
            opacity: contentOpacity,
          },
        ]}
      >
        {selectedTab === "events" ? (
          <EventsScreen isExploreMode={isGuest} searchQuery={searchQuery} />
        ) : (
          <View style={styles.comingSoonContainer}>
            <Text style={styles.comingSoonText}>
              📍 Feature Coming soon....
            </Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 60 : 50,
    paddingHorizontal: width * 0.03,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: height * 0.015,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Math.min(width * 0.025, 10),
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Math.min(width * 0.02, 8),
  },
  avatar: {
    width: Math.min(width * 0.1, 40),
    height: Math.min(width * 0.1, 40),
    borderRadius: Math.min(width * 0.05, 20),
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
  },
  toggleButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Math.min(height * 0.01, 6),
    paddingHorizontal: Math.min(width * 0.03, 8),
    borderRadius: 20,
    minWidth: width * 0.1,
  },
  toggleText: {
    color: "#6B7280",
    fontWeight: "500",
    fontFamily: "Poppins_400Regular",
    fontSize: Math.min(width * 0.032, 12),
  },
  activeToggle: {
    backgroundColor: "#FAB843",
  },
  activeToggleText: {
    color: "#fff",
  },
  supportIcon: {
    backgroundColor: "#F3F4F6",
    padding: Math.min(width * 0.02, 8),
    borderRadius: 100,
    width: Math.min(width * 0.1, 40),
    height: Math.min(width * 0.1, 40),
    justifyContent: "center",
    alignItems: "center",
  },
  guestBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f4ff",
    paddingHorizontal: width * 0.04,
    paddingVertical: 12,
    marginTop: 10,
    marginBottom: 5,
    borderRadius: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: "#e8dbff",
  },
  guestBannerTextContainer: {
    flex: 1,
  },
  guestBannerTitle: {
    fontSize: Math.min(width * 0.037, 14),
    fontFamily: "Poppins_600SemiBold",
    color: "#5A31F4",
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
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
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
    gap: Math.min(width * 0.025, 10),
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    borderRadius: 10,
    paddingHorizontal: Math.min(width * 0.04, 15),
    height: Math.min(height * 0.06, 48),
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: Math.min(width * 0.037, 14),
    color: "#333",
    fontFamily: "Poppins_400Regular",
  },
  filterButton: {
    backgroundColor: "#f8f8f8",
    width: Math.min(height * 0.06, 48),
    height: Math.min(height * 0.06, 48),
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  contentArea: {
    flex: 1,
    marginTop: height * 0.02,
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