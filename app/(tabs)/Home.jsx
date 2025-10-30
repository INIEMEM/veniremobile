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

  useEffect(() => {
    const fetchUser = async () => {
      const token = await AsyncStorage.getItem("token");
      const storedUser = await AsyncStorage.getItem("user");
      const isGuest = await AsyncStorage.getItem("isGuest");

      if (token && storedUser && !isGuest) {
        setUser(JSON.parse(storedUser));
      } else {
        setUser(null);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    // Subtle staggered entrance animations
    Animated.parallel([
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
      // Search bar animation
      Animated.sequence([
        Animated.delay(150),
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
        Animated.delay(300),
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
    ]).start();
  }, []);

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
            onPress={() => router.push(`/profile/${user?._id}`)}
            activeOpacity={0.7}
          >
            <Image
              source={
                user?.profileImage
                  ? { uri: user.profileImage }
                  : require("../../assets/default-avatar.jpg")
              }
              style={styles.avatar}
            />
          </TouchableOpacity>
          <View>
            <Text style={styles.welcomeText}>
              Welcome{" "}
              <Text style={styles.userName}>
                {user ? truncateText(user.firstname, 8) : "Guest"}
              </Text>
            </Text>
          </View>
        </View>

        {/* Toggle + Support */}
        <View style={styles.headerRight}>
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
        </View>
      </Animated.View>

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
          <EventsScreen />
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
  /** 🔍 Search Bar Row */
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