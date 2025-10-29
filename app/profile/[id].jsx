import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../utils/axiosInstance";
import ExploreEvents from "../../components/ExploreEvents";
import { truncateText } from "../../utils/truncateText";
import { useAuth } from "../../context/AuthContext";
export default function ProfilePage() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState("events");
  const [userProfile, setUserProfile] = useState(null);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user: authUser } = useAuth();
  const isMyProfile = loggedInUser?._id === id;


  // 🧠 Fetch Logged In User + Profile User
  useEffect(() => {
    const fetchData = async () => {
      try {
        
        const token = await AsyncStorage.getItem("token");
        setLoggedInUser(authUser);
        console.log("user token", token)
        
        const response = await api.get("/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log("Fetched profile data:", response.data);
        setUserProfile(response.data.data);
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);


// 📸 Handle Profile Picture Upload
const handleImageUpload = async () => {
  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Please allow access to your gallery.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const image = result.assets[0];
      const formData = new FormData();

      // ✅ Ensure correct format for multipart/form-data
      formData.append("profile-picture", {
        uri: image.uri,
        name: image.fileName || "profile.jpg",
        type: image.mimeType || "image/jpeg",
      });

      const token = await AsyncStorage.getItem("token");

      const response = await api.post(`/auth/profile/picture`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        Alert.alert("Success", "Profile picture updated successfully!");
        setUserProfile((prev) => ({
          ...prev,
          avatar: response.data.data.profilePicture,
        }));
      }
    }
  } catch (error) {
    console.error("Upload error:", error.response?.data || error.message);
    Alert.alert("Error", "Failed to upload profile picture.");
  }
};

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#5A31F4" />
      </View>
    );
  }

  const user = userProfile || {};

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Banner */}
      <View style={styles.header}>
        <Image
          source={{
            uri:
              user.banner ||
              "https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=1200",
          }}
          style={styles.banner}
        />
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Profile Section */}
      <View style={styles.profileSection}>
        <View style={styles.profileEdit}>
          <View style={{ position: "relative" }}>
            <Image
              source={{
                uri:
                  user.avatar ||
                  "https://cdn-icons-png.flaticon.com/512/149/149071.png",
              }}
              style={styles.avatar}
            />

            {/* 📸 Camera icon for logged-in user */}
            {isMyProfile && (
              <TouchableOpacity style={styles.cameraIcon} onPress={handleImageUpload}>
                <Ionicons name="camera-outline" size={16} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

          {/* ✏️ Edit Profile */}
          {isMyProfile && (
            <TouchableOpacity onPress={() => router.push("/edit-profile")}>
              <Text style={{ fontFamily: "Poppins_500Medium", color: "#555" }}>
                <Ionicons name="pencil-outline" size={14} color="#555" /> Edit Profile
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Name + Email */}
        <View style={styles.profileEdit}>
          <View style={styles.emailName}>
            <View>
              <Text style={styles.name}>
                {user.firstname} {user.lastname}
              </Text>
              <Text style={styles.email}>{user.email}</Text>
            </View>
            <Text style={styles.vendorTag}>{user.role || "User"}</Text>
          </View>
          <Ionicons name="ellipsis-vertical" size={20} color="#444" />
        </View>

        <Text style={styles.bio}>
          {user.about || "This user hasn’t added a bio yet."}
        </Text>

        {/* Info Section */}
        <View style={styles.statsRow}>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color="#777" />
            <Text style={styles.infoText}>{user.state || "Lagos"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color="#777" />
            <Text style={styles.infoText}>DOB: {user.dob || "Not set"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="male-female-outline" size={16} color="#777" />
            <Text style={styles.infoText}>{user.gender || "Not set"}</Text>
          </View>
        </View>

        {/* Followers */}
        <View style={styles.statsRow}>
          <Text style={styles.statText}>{user.followingCount || 0} Following</Text>
          <View style={styles.dot} />
          <Text style={styles.statText}>{user.followerCount || 0} Followers</Text>
        </View>
      </View>

      {/* Tabs — only show for logged-in user */}
      {isMyProfile && (
        <>
          <View style={styles.tabContainer}>
            {[
              { key: "events", label: "My Events" },
              { key: "comments", label: "Comments" },
              { key: "bookmarks", label: "Bookmarks" },
              { key: "wallet", label: "Wallet" },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tabButton,
                  activeTab === tab.key && styles.activeTabButton,
                ]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    activeTab === tab.key && styles.activeTabLabel,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab Content */}
          <View style={styles.content}>
            {activeTab === "events" && (
              <>
                <Text style={styles.sectionTitle}>My Events</Text>
                <ExploreEvents />
              </>
            )}
            {activeTab === "comments" && (
              <>
                <Text style={styles.sectionTitle}>My Comments</Text>
                <Text style={styles.sectionText}>💬 You have commented on 12 events.</Text>
              </>
            )}
            {activeTab === "bookmarks" && (
              <>
                <Text style={styles.sectionTitle}>My Bookmarks</Text>
                <Text style={styles.sectionText}>🔖 Your saved events will appear here.</Text>
              </>
            )}
            {activeTab === "wallet" && (
              <>
                <Text style={styles.sectionTitle}>Wallet</Text>
                <Text style={styles.sectionText}>
                  💰 Balance: ₦{user.wallet?.NGN || 0} — Manage transactions.
                </Text>
              </>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#fff", flex: 1 },
  header: { position: "relative" },
  banner: { width: "100%", height: 150 },
  backBtn: { position: "absolute", top: 40, left: 15 },
  profileSection: { padding: 16, marginTop: -40 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: "#fff",
  },
  cameraIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#5A31F4",
    borderRadius: 12,
    padding: 5,
  },
  name: { fontSize: 18, fontWeight: "700", fontFamily: "Poppins_600SemiBold", color: "#333" },
  email: { color: "#666", fontSize: 13, fontFamily: "Poppins_400Regular" },
  vendorTag: {
    backgroundColor: "#FAB843",
    color: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 64,
    marginTop: 6,
    fontSize: 12,
  },
  bio: { marginVertical: 10, color: "#555", fontSize: 13, lineHeight: 18, fontFamily: "Poppins_400Regular"  },
  statsRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  dot: {
    width: 4,
    height: 4,
    backgroundColor: "#aaa",
    borderRadius: 2,
    marginHorizontal: 6,
  },
  statText: { fontSize: 12, color: "#777", fontFamily: "Poppins_400Regular" },
  infoRow: { flexDirection: "row", alignItems: "center", marginTop: 4, gap: 8 },
  infoText: { color: "#555", fontSize: 12, fontFamily: "Poppins_400Regular"  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    marginTop: 20,
  },
  tabButton: { paddingVertical: 10 },
  activeTabButton: { borderBottomWidth: 2, borderBottomColor: "#5A31F4" },
  tabLabel: { color: "#777", fontSize: 13, fontWeight: "500" },
  activeTabLabel: { color: "#5A31F4", fontWeight: "700" },
  content: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#222", marginBottom: 6, fontFamily: "Poppins_400Regular"  },
  sectionText: { color: "#555", fontSize: 13, lineHeight: 20, fontFamily: "Poppins_400Regular"  },
  profileEdit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  emailName: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
});
