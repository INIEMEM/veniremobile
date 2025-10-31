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
  Dimensions,
  RefreshControl,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import api from "../../utils/axiosInstance";
import ExploreEvents from "../../components/ExploreEvents";
import { useAuth } from "../../context/AuthContext";

const { width } = Dimensions.get("window");

export default function ProfilePage() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState("events");
  const [userProfile, setUserProfile] = useState(null);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [interestedEvents, setInterestedEvents] = useState([]);
  const [bookmarkedEvents, setBookmarkedEvents] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const { user: authUser, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const isMyProfile = loggedInUser?._id === id;

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      router.replace("/auth/login");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Fetch all events and filter by interest/bookmark
  const fetchFilteredEvents = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      
      const response = await api.get("/event", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        const allEvents = response.data.data;
        
        const interested = allEvents.filter(event => 
          event.eventInterests?.some(interest => interest.userId === id) ||
          (event.totalInterest > 0 && event.eventInterests?.length > 0)
        );
        
        const bookmarked = allEvents.filter(event => 
          event.bookmark?.includes(id) || event.hasBookmarked
        );
        
        setInterestedEvents(interested);
        setBookmarkedEvents(bookmarked);
      }
    } catch (error) {
      console.error("Error fetching filtered events:", error);
    }
  };

  // Fetch Logged In User + Profile User
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        setLoggedInUser(authUser);
        
        const response = await api.get("/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        setUserProfile(response.data.data);
        
        await fetchFilteredEvents();
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // Refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFilteredEvents();
    setRefreshing(false);
  };

  // Get signed URL for S3 upload
  const getSignedUrl = async (fileName, fileType) => {
    try {
      const token = await AsyncStorage.getItem("token");
     
      const response = await api.put(
        "/auth/sign-s3",
        {
          fileName: fileName,
          fileType: fileType,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error("Error getting signed URL:", error);
      throw error;
    }
  };

  // Upload image to S3
  const uploadImageToS3 = async (imageUri, uploadURL) => {
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();

      const uploadResponse = await fetch(uploadURL, {
        method: "PUT",
        body: blob,
        headers: {
          "Content-Type": blob.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload image to S3");
      }

      return true;
    } catch (error) {
      console.error("Error uploading to S3:", error);
      throw error;
    }
  };

  // Handle Profile Picture Upload
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
        setUploadingImage(true);
        const image = result.assets[0];
        
        const fileName = image.fileName || `profile_${Date.now()}.jpg`;
        const fileType = image.mimeType || "image/jpeg";

        try {
          // Step 1: Get signed URL from backend
          Toast.show({
            type: "info",
            text1: "Uploading...",
            text2: "Getting upload URL",
          });

          const signedData = await getSignedUrl(fileName, fileType);
          const { uploadURL } = signedData;

          // Step 2: Upload image to S3
          Toast.show({
            type: "info",
            text1: "Uploading...",
            text2: "Uploading to cloud storage",
          });

          await uploadImageToS3(image.uri, uploadURL);

          // Step 3: Get the final image URL (remove query params)
          const imageUrl = uploadURL.split("?")[0];

          // Step 4: Send URL to backend to update profile
          Toast.show({
            type: "info",
            text1: "Uploading...",
            text2: "Updating profile",
          });

          const token = await AsyncStorage.getItem("token");

          const response = await api.post(
            `/auth/profile/picture`,
            { profilePictureUrl: imageUrl },
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (response.data.success) {
            Toast.show({
              type: "success",
              text1: "Success! 🎉",
              text2: "Profile picture updated successfully",
            });

            // Update local state with new profile picture
            setUserProfile((prev) => ({
              ...prev,
              avatar: imageUrl,
              profile_picture: imageUrl,
            }));
          }
        } catch (uploadError) {
          console.error("Upload error:", uploadError);
          Toast.show({
            type: "error",
            text1: "Upload Failed",
            text2: uploadError.response?.data?.message || "Failed to upload profile picture",
          });
        } finally {
          setUploadingImage(false);
        }
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to pick image",
      });
      setUploadingImage(false);
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
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
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
                  user.profile_picture ||
                  "https://cdn-icons-png.flaticon.com/512/149/149071.png",
              }}
              style={styles.avatar}
            />

            {isMyProfile && (
              <TouchableOpacity 
                style={styles.cameraIcon} 
                onPress={handleImageUpload}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="camera-outline" size={16} color="#fff" />
                )}
              </TouchableOpacity>
            )}
          </View>

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
          {user.about || "This user hasn't added a bio yet."}
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

      {/* Logout button */}
      {isMyProfile && (
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={isLoggingOut}
        >
          <Text style={styles.logoutText}>
            {isLoggingOut ? "Logging out..." : "Logout"}
          </Text>
        </TouchableOpacity>
      )}

      {/* Tabs — only show for logged-in user */}
      {isMyProfile && (
        <>
          <View style={styles.tabContainer}>
            {[
              { key: "events", label: "My Events" },
              { key: "interest", label: "Interest" },
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
              <ExploreEvents userId={id} />
            )}
            
            {activeTab === "interest" && (
              <>
                {interestedEvents.length > 0 ? (
                  <ExploreEvents events={interestedEvents} />
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="heart-outline" size={64} color="#ccc" />
                    <Text style={styles.emptyText}>No events you're interested in yet</Text>
                    <Text style={styles.emptySubtext}>
                      Click "Interested" on events to see them here
                    </Text>
                  </View>
                )}
              </>
            )}
            
            {activeTab === "bookmarks" && (
              <>
                {bookmarkedEvents.length > 0 ? (
                  <ExploreEvents events={bookmarkedEvents} />
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="bookmark-outline" size={64} color="#ccc" />
                    <Text style={styles.emptyText}>No bookmarked events yet</Text>
                    <Text style={styles.emptySubtext}>
                      Bookmark events to save them for later
                    </Text>
                  </View>
                )}
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
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
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
  bio: { marginVertical: 10, color: "#555", fontSize: 13, lineHeight: 18, fontFamily: "Poppins_400Regular" },
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
  infoText: { color: "#555", fontSize: 12, fontFamily: "Poppins_400Regular" },
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
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#222", marginBottom: 6, fontFamily: "Poppins_400Regular" },
  sectionText: { color: "#555", fontSize: 13, lineHeight: 20, fontFamily: "Poppins_400Regular" },
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
  logoutButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#d4d4d4",
    borderRadius: 8,
    marginHorizontal: 16,
    width: width * 0.25,
  },
  logoutText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
    fontFamily: "Poppins_500Medium",
    color: "#666",
  },
  emptySubtext: {
    marginTop: 5,
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#999",
    textAlign: "center",
  },
});