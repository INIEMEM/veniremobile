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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import EventsScreen from "../../components/EventsScreen";

const { width } = Dimensions.get("window");

export default function Home() {
  const [user, setUser] = useState(null);
  const [selectedTab, setSelectedTab] = useState("events");
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const toggleAnim = useRef(new Animated.Value(0)).current;

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
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <TouchableOpacity onPress={()=>router.push("/profile/1")}>

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
              <Text style={{ color: "#FAB843" }}>
                {user ? user.name : "Guest"}
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
          >
            <Ionicons name="headset-outline" size={24} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ===== SEARCH BAR + FILTER ===== */}
      <View style={styles.searchRow}>
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
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="options-outline" size={22} color="#666" />
        </TouchableOpacity>
      </View>

      {/* ===== CONTENT AREA ===== */}
      <View style={styles.contentArea}>
        {selectedTab === "events" ? (
          <EventsScreen/>
        ) : (
          <Text style={{ fontFamily: "Poppins_400Regular" }}>
            📍 Feature Coming soon....
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  avatar: {
    width: 25,
    height: 25,
    borderRadius: 30,
  },
  welcomeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    fontFamily: "Poppins_500Medium",
  },
  toggleContainer: {
    flexDirection: "row",
    borderRadius: 25,
    borderColor: "#FAB843",
    borderWidth: 1,
  },
  toggleButton: {
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 20,
    width: 70,
  },
  toggleText: {
    color: "#6B7280",
    fontWeight: "500",
    fontFamily: "Poppins_400Regular",
  },
  activeToggle: {
    backgroundColor: "#FAB843",
  },
  activeToggleText: {
    color: "#fff",
  },
  supportIcon: {
    backgroundColor: "#F3F4F6",
    padding: 5,
    borderRadius: 100,
  },
  /** 🔍 Search Bar Row */
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
    gap: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 45,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: "#333",
    fontFamily: "Poppins_400Regular",
  },
  filterButton: {
    backgroundColor: "#f8f8f8",
    width: 45,
    height: 45,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  contentArea: {
    marginTop: 20,
  },
});
