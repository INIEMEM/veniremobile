import React, { useEffect, useState, useCallback } from "react";
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
  Modal,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import api from "../../utils/axiosInstance";
import ExploreEvents from "../../components/ExploreEvents";
import { useAuth } from "../../context/AuthContext";
// import CustomKeyboardInput from '../../../components/CustomKeyboardInput';
import CustomKeyboardInput from "../../components/CustomKeyboardInput";
const { width } = Dimensions.get("window");

export default function ProfilePage() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState("analytics");
  const [userProfile, setUserProfile] = useState(null);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [interestedEvents, setInterestedEvents] = useState([]);
  const [bookmarkedEvents, setBookmarkedEvents] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const { user: authUser, logout, updateUser } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const isMyProfile = loggedInUser?._id === id;
  const [isFollowing, setIsFollowing] = useState(false);

  // Ticketing Wallet States
  const [transactions, setTransactions] = useState([]);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [walletBalance, setWalletBalance] = useState(142500);

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

  const loadTransactions = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await api.get('/transaction?category=all&limit=24&page=1', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data?.success && response.data?.message?.transactions) {
        const txs = response.data.message.transactions;
        setTransactions(txs);
        
        let balance = 0;
        txs.forEach(tx => {
          if (tx.mode === 'credit' || tx.category === 'deposit') {
            balance += tx.NGN || 0;
          } else if (tx.mode === 'debit') {
            balance -= tx.NGN || 0;
          }
        });
        setWalletBalance(Math.max(0, balance));
      }
    } catch (err) {
      console.error("Error loading transactions:", err?.response?.data || err?.message);
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

        console.log("Fetched profile data:", response.data.data);
        
        await fetchFilteredEvents();
        await loadTransactions();
        
        if (response.data.data._id === id) {
          setActiveTab("analytics");
        } else {
          setActiveTab("events");
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // Automatically refresh transactions when this screen comes back into focus
  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [])
  );

  // Load follow state
  useEffect(() => {
    const loadFollowState = async () => {
      if (!loggedInUser?._id || isMyProfile) return;
      const key = `following_organizers_${loggedInUser._id}`;
      const followedList = await AsyncStorage.getItem(key);
      if (followedList) {
        const list = JSON.parse(followedList);
        setIsFollowing(list.includes(id));
      }
    };
    loadFollowState();
  }, [loggedInUser, id]);

  // Refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFilteredEvents();
    setRefreshing(false);
  };

  const handleFollow = async () => {
    try {
      if (!loggedInUser?._id) return;
      const key = `following_organizers_${loggedInUser._id}`;
      const followedList = await AsyncStorage.getItem(key);
      let list = followedList ? JSON.parse(followedList) : [];
      if (isFollowing) {
        list = list.filter(i => i !== id);
        setIsFollowing(false);
        Toast.show({ type: 'success', text1: 'Unfollowed', text2: `You unfollowed ${userProfile?.firstname || 'this user'}` });
      } else {
        if (!list.includes(id)) list.push(id);
        setIsFollowing(true);
        Toast.show({ type: 'success', text1: 'Following! 🎉', text2: `You are now following ${userProfile?.firstname || 'this user'}` });
      }
      await AsyncStorage.setItem(key, JSON.stringify(list));
    } catch (err) {
      console.error('Follow error:', err);
    }
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
            { images: [imageUrl] },
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
            const updatedProfile = {
              ...userProfile,
              avatar: imageUrl,
              profile_picture: imageUrl,
            };
            await AsyncStorage.setItem("user", JSON.stringify(updatedProfile));
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
  const avatarUri = user.avatar || user.profile_picture || "https://cdn-icons-png.flaticon.com/512/149/149071.png";

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F7' }}>
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* ━━━ HERO BANNER ━━━ */}
      <View style={styles.heroSection}>
        <Image
          source={{ uri: user.banner || "https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=1200" }}
          style={styles.heroBanner}
          blurRadius={1}
        />
        <View style={styles.heroOverlay} />
        <View style={styles.heroTopRow}>
          <TouchableOpacity style={styles.heroIconBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          {isMyProfile && (
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity style={styles.heroIconBtn} onPress={() => router.push('/profile/settings')}>
                <Ionicons name="settings-outline" size={22} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.heroIconBtn} onPress={handleLogout} disabled={isLoggingOut}>
                <Ionicons name="log-out-outline" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>
          )}
        </View>
        <View style={styles.avatarWrapper}>
          <Image source={{ uri: avatarUri }} style={styles.heroAvatar} />
          {isMyProfile && (
            <TouchableOpacity style={styles.cameraIcon} onPress={handleImageUpload} disabled={uploadingImage}>
              {uploadingImage ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="camera" size={14} color="#fff" />}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ━━━ PROFILE INFO CARD ━━━ */}
      <View style={styles.infoCard}>
        <View style={styles.nameRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user.firstname} {user.lastname}</Text>
            <Text style={styles.email}>{user.email}</Text>
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user.role || "User"}</Text>
          </View>
        </View>

        <Text style={styles.bio}>{user.about || "No bio added yet."}</Text>

        <View style={styles.chipsRow}>
          {user.state && <View style={styles.chip}><Ionicons name="location-outline" size={13} color="#5A31F4" /><Text style={styles.chipText}>{user.state}</Text></View>}
          {user.gender && <View style={styles.chip}><Ionicons name="male-female-outline" size={13} color="#5A31F4" /><Text style={styles.chipText}>{user.gender}</Text></View>}
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{user.followingCount || 0}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{user.followerCount || 24}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{user.eventsCount || 0}</Text>
            <Text style={styles.statLabel}>Events</Text>
          </View>
        </View>

        {isMyProfile ? (
          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity style={[styles.editBtn, { flex: 1 }]} onPress={() => router.push("/edit-profile")}>
              <Ionicons name="pencil-outline" size={16} color="#5A31F4" />
              <Text style={styles.editBtnText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.editBtn, { flex: 1, backgroundColor: "#F3EDFF", borderColor: "#5A31F4", borderWidth: 1 }]} 
              onPress={() => router.push("/orders")}
            >
              <Ionicons name="briefcase-outline" size={16} color="#5A31F4" />
              <Text style={[styles.editBtnText, { color: "#5A31F4" }]}>My Bookings</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.followBtn,
                isFollowing && styles.followBtnActive
              ]}
              onPress={handleFollow}
            >
              <Ionicons
                name={isFollowing ? 'checkmark-circle' : 'person-add-outline'}
                size={16}
                color={isFollowing ? '#5A31F4' : '#fff'}
              />
              <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.messageBtn}>
              <Ionicons name="chatbubble-outline" size={18} color="#5A31F4" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {(isMyProfile
          ? [
              { key: "analytics", label: "Analytics" },
              { key: "wallet", label: "Wallet" },
            ]
          : [
              { key: "events", label: "Created Events" },
              { key: "interest", label: "Interested" },
            ]
        ).map((tab) => (
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
        {/* PUBLIC TABS */}
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
                <Text style={styles.emptyText}>No events they're interested in yet</Text>
              </View>
            )}
          </>
        )}
        
        {/* PRIVATE TABS */}
        {activeTab === "analytics" && isMyProfile && (
          <View style={{ alignItems: "center" }}>
            <Text style={styles.sectionTitle}>Earnings Overview</Text>
            <Text style={styles.sectionText}>Track your ticket sales and platform revenue over time.</Text>
            
            <View style={{ marginTop: 20, marginBottom: 30, backgroundColor: "#FFF", borderRadius: 16, padding: 10, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 }}>
              <LineChart
                data={{
                  labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
                  datasets: [
                    {
                      data: [
                        Math.random() * 100,
                        Math.random() * 100,
                        Math.random() * 100,
                        Math.random() * 100,
                        Math.random() * 100,
                        Math.random() * 100
                      ]
                    }
                  ]
                }}
                width={Dimensions.get("window").width - 50} // from react-native
                height={220}
                yAxisLabel="₦"
                yAxisSuffix="k"
                yAxisInterval={1} 
                chartConfig={{
                  backgroundColor: "#ffffff",
                  backgroundGradientFrom: "#ffffff",
                  backgroundGradientTo: "#ffffff",
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(90, 49, 244, ${opacity})`, // #5A31F4
                  labelColor: (opacity = 1) => `rgba(100, 100, 100, ${opacity})`,
                  style: { borderRadius: 16 },
                  propsForDots: { r: "5", strokeWidth: "2", stroke: "#FAB843" }
                }}
                bezier
                style={{
                  marginVertical: 8,
                  borderRadius: 16
                }}
              />
            </View>

            <View style={styles.usageGrid}>
              <View style={styles.usageCard}>
                <Ionicons name="ticket" size={24} color="#5A31F4" />
                <Text style={styles.usageValue}>3,402</Text>
                <Text style={styles.usageLabel}>Tickets Sold</Text>
              </View>
              <View style={styles.usageCard}>
                <Ionicons name="eye" size={24} color="#FAB843" />
                <Text style={styles.usageValue}>45.2k</Text>
                <Text style={styles.usageLabel}>Profile Views</Text>
              </View>
            </View>
          </View>
        )}
        
        {activeTab === "wallet" && isMyProfile && (
          <View style={styles.walletContainer}>
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Total Balance</Text>
              <Text style={styles.balanceAmount}>₦{walletBalance.toLocaleString()}</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 15 }}>
                <TouchableOpacity 
                  style={[styles.withdrawBtn, { flex: 1, backgroundColor: '#2ECC71' }]}
                  onPress={() => router.push('/profile/fund-wallet')}
                >
                  <Text style={styles.withdrawText}>Fund Wallet</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.withdrawBtn, { flex: 1 }]}
                  onPress={() => {
                    Alert.alert("Withdrawal", "To withdraw funds, please use the Vendor Dashboard.");
                  }}
                >
                  <Text style={styles.withdrawText}>Withdraw</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text style={[styles.sectionTitle, {marginTop: 20, marginBottom: 5}]}>Recent Transactions</Text>
            
            {transactions.length > 0 ? (
              transactions.map((tx) => {
                const isDebit = tx.mode === "debit";
                const displayAmt = `${isDebit ? '-' : '+'}₦${Math.abs(tx.NGN || 0).toLocaleString()}`;
                
                let title = "Transaction";
                let iconName = "swap-horizontal";
                let iconColor = "#5A31F4";
                let iconBg = "rgba(90, 49, 244, 0.1)";

                if (tx.category === "ticket" && tx.mode === "debit") {
                  title = "Ticket Purchase";
                  iconName = "ticket-outline";
                  iconColor = "#FF3B30";
                  iconBg = "rgba(255, 59, 48, 0.1)";
                } else if (tx.category === "ticket" && tx.mode === "credit") {
                  title = "Refund / Sale";
                  iconName = "arrow-undo-outline";
                  iconColor = "#2ECC71";
                  iconBg = "rgba(46, 204, 113, 0.1)";
                } else if (tx.category === "deposit") {
                  title = "Wallet Top-up";
                  iconName = "wallet-outline";
                  iconColor = "#2ECC71";
                  iconBg = "rgba(46, 204, 113, 0.1)";
                } else if (tx.category === "withdraw") {
                  title = "Withdrawal";
                  iconName = "cash-outline";
                  iconColor = "#FF9500";
                  iconBg = "rgba(255, 149, 0, 0.1)";
                } else if (tx.category === "service") {
                  title = "Vendor Payment";
                  iconName = "briefcase-outline";
                  iconColor = "#5A31F4";
                  iconBg = "rgba(90, 49, 244, 0.1)";
                }

                return (
                  <TouchableOpacity 
                    key={tx._id} 
                    style={styles.transactionItem}
                    activeOpacity={0.8}
                    onPress={() => setSelectedTransaction(tx)}
                  >
                    <View style={styles.txLeft}>
                      <View style={[styles.txIcon, { backgroundColor: iconBg }]}>
                        <Ionicons name={iconName} size={20} color={iconColor} />
                      </View>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={styles.txTitle}>{title}</Text>
                        <Text style={styles.txSubText} numberOfLines={1}>
                          {tx.description || tx.category}
                        </Text>
                        <Text style={styles.txDate}>
                          {new Date(tx.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} • {new Date(tx.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end', flexShrink: 0, paddingLeft: 10 }}>
                      <Text style={[
                        styles.txAmount, 
                        { color: isDebit ? '#FF3B30' : '#2ECC71' }
                      ]}>
                        {displayAmt}
                      </Text>
                      <Text style={styles.viewReceiptText}>View Invoice</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="swap-horizontal-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No transactions logged yet</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>

    {/* Invoice Receipt Modal - Rendered outside ScrollView to avoid touch/scroll conflicts */}
    <Modal
      visible={!!selectedTransaction}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setSelectedTransaction(null)}
    >
      <View style={styles.receiptOverlay}>
        <View style={styles.receiptContent}>
          <TouchableOpacity 
            style={styles.receiptCloseBtn} 
            onPress={() => setSelectedTransaction(null)}
          >
            <Ionicons name="close-circle" size={30} color="#666" />
          </TouchableOpacity>

          <View style={styles.receiptHeader}>
            <Text style={styles.receiptLogoText}>VENIRE</Text>
            <Text style={styles.receiptTitleText}>Payment Receipt</Text>
            <View style={styles.statusBadgeReceipt}>
              <Text style={styles.statusBadgeReceiptText}>PAID / SETTLED</Text>
            </View>
          </View>

          <View style={styles.receiptDottedDivider} />

          <View style={styles.receiptDetailsContainer}>
            <View style={styles.receiptDetailRow}>
              <Text style={styles.receiptDetailLabel}>Transaction Date</Text>
              <Text style={styles.receiptDetailVal}>
                {selectedTransaction?.date && new Date(selectedTransaction.date).toLocaleString()}
              </Text>
            </View>
            <View style={styles.receiptDetailRow}>
              <Text style={styles.receiptDetailLabel}>Reference ID</Text>
              <Text style={styles.receiptDetailVal}>{selectedTransaction?.reference}</Text>
            </View>
            <View style={styles.receiptDetailRow}>
              <Text style={styles.receiptDetailLabel}>Payment Option</Text>
              <Text style={styles.receiptDetailVal}>{selectedTransaction?.paymentMethod}</Text>
            </View>
          </View>

          <View style={styles.receiptDottedDivider} />

          <View style={styles.receiptItemsContainer}>
            <Text style={styles.receiptItemHeader}>Billing details</Text>
            <View style={styles.receiptBillingRow}>
              <Text style={styles.receiptItemName}>{selectedTransaction?.eventName}</Text>
              <Text style={styles.receiptItemPrice}>
                ₦{selectedTransaction?.subtotal ? Math.abs(selectedTransaction.subtotal).toLocaleString() : (selectedTransaction?.amount ? Math.abs(selectedTransaction.amount).toLocaleString() : "0")}
              </Text>
            </View>
            <Text style={styles.receiptItemSub}>
              {selectedTransaction?.ticketType} Tier ({selectedTransaction?.quantity || 1} ticket(s))
            </Text>

            {selectedTransaction?.discount > 0 && (
              <View style={styles.receiptBillingSubRow}>
                <Text style={styles.receiptBillingSubLabel}>Discount</Text>
                <Text style={[styles.receiptBillingSubValue, { color: '#2ECC71' }]}>
                  -₦{selectedTransaction?.discount?.toLocaleString()}
                </Text>
              </View>
            )}

            {selectedTransaction?.fee > 0 && (
              <View style={styles.receiptBillingSubRow}>
                <Text style={styles.receiptBillingSubLabel}>System service fee</Text>
                <Text style={styles.receiptBillingSubValue}>₦{selectedTransaction?.fee?.toLocaleString()}</Text>
              </View>
            )}
          </View>

          <View style={styles.receiptSolidDivider} />

          <View style={styles.receiptTotalContainer}>
            <Text style={styles.receiptTotalLabel}>Amount Paid</Text>
            <Text style={styles.receiptTotalValue}>
              ₦{selectedTransaction?.amount ? Math.abs(selectedTransaction.amount).toLocaleString() : "0"}
            </Text>
          </View>

          <Text style={styles.receiptFooterText}>
            Thank you for using Venire. This receipt serves as official proof of payment. For queries, reach out to billing@venire.com.
          </Text>
        </View>
      </View>
    </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  txSubText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  viewReceiptText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    color: '#5A31F4',
    marginTop: 4,
    textDecorationLine: 'underline',
  },
  receiptOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  receiptContent: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
    position: 'relative',
  },
  receiptCloseBtn: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 10,
  },
  receiptHeader: {
    alignItems: 'center',
    marginTop: 15,
  },
  receiptLogoText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    color: '#5A31F4',
    letterSpacing: 2,
  },
  receiptTitleText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  statusBadgeReceipt: {
    backgroundColor: '#E6F9F0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2ECC71',
    marginTop: 10,
  },
  statusBadgeReceiptText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 10,
    color: '#2ECC71',
    letterSpacing: 0.5,
  },
  receiptDottedDivider: {
    height: 1,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderStyle: 'dashed',
    marginVertical: 18,
  },
  receiptSolidDivider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginVertical: 18,
  },
  receiptDetailsContainer: {
    gap: 8,
  },
  receiptDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptDetailLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#888888',
  },
  receiptDetailVal: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: '#222222',
  },
  receiptItemsContainer: {
    marginTop: 5,
  },
  receiptItemHeader: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
    color: '#1A1A1A',
    marginBottom: 10,
  },
  receiptBillingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptItemName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#222222',
    flex: 1,
    marginRight: 15,
  },
  receiptItemPrice: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: '#1A1A1A',
  },
  receiptItemSub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#777777',
    marginTop: 2,
    marginBottom: 10,
  },
  receiptBillingSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  receiptBillingSubLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#777777',
  },
  receiptBillingSubValue: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: '#222222',
  },
  receiptTotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptTotalLabel: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    color: '#1A1A1A',
  },
  receiptTotalValue: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: '#5A31F4',
  },
  receiptFooterText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 10,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 15,
    marginTop: 24,
  },
  container: { backgroundColor: "#F5F5F7", flex: 1 },
  // ━━━ HERO ━━━
  heroSection: { height: 220, position: "relative", justifyContent: "flex-end", alignItems: "center" },
  heroBanner: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(30,0,80,0.55)" },
  heroTopRow: { position: "absolute", top: 50, left: 0, right: 0, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20 },
  heroIconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  avatarWrapper: { position: "absolute", bottom: -45, alignSelf: "center" },
  heroAvatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 4, borderColor: "#FFF" },
  // ━━━ INFO CARD ━━━
  infoCard: { backgroundColor: "#FFF", marginTop: 55, marginHorizontal: 16, borderRadius: 20, padding: 20, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, elevation: 4 },
  nameRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  name: { fontSize: 20, fontWeight: "700", fontFamily: "Poppins_700Bold", color: "#1A1A1A" },
  email: { color: "#888", fontSize: 12, fontFamily: "Poppins_400Regular", marginTop: 1 },
  roleBadge: { backgroundColor: "#FAB843", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  roleText: { color: "#FFF", fontFamily: "Poppins_600SemiBold", fontSize: 12 },
  bio: { color: "#555", fontSize: 13, lineHeight: 20, fontFamily: "Poppins_400Regular", marginVertical: 10 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#F3EDFF", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  chipText: { color: "#5A31F4", fontFamily: "Poppins_500Medium", fontSize: 12 },
  // ━━━ STATS GRID ━━━
  statsGrid: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 16, borderTopWidth: 1, borderTopColor: "#F0F0F0", marginBottom: 16 },
  statItem: { alignItems: "center" },
  statNumber: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#1A1A1A" },
  statLabel: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "#888", marginTop: 2 },
  statDivider: { width: 1, backgroundColor: "#F0F0F0" },
  // ━━━ ACTION BUTTONS ━━━
  editBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#F3EDFF", paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: "#E0D4FF" },
  editBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: "#5A31F4" },
  actionRow: { flexDirection: "row", gap: 12 },
  followBtn: { flex: 1, flexDirection: 'row', gap: 6, backgroundColor: "#5A31F4", paddingVertical: 12, borderRadius: 12, alignItems: "center", justifyContent: 'center' },
  followBtnActive: { backgroundColor: '#F0EAFF', borderWidth: 1.5, borderColor: '#5A31F4' },
  followBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: "#FFF" },
  followBtnTextActive: { color: '#5A31F4' },
  messageBtn: { width: 48, height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: "#5A31F4", justifyContent: "center", alignItems: "center" },
  // ━━━ CAMERA ━━━
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
  usageGrid: {
    flexDirection: 'row',
    gap: 15,
    width: '100%',
  },
  usageCard: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
  },
  usageValue: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    color: '#333',
    marginTop: 8,
  },
  usageLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: '#777',
  },
  walletContainer: {
    paddingBottom: 20,
  },
  balanceCard: {
    backgroundColor: '#5A31F4',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#5A31F4',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  balanceLabel: {
    color: '#E0D4FF',
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
  },
  balanceAmount: {
    color: '#FFF',
    fontFamily: 'Poppins_700Bold',
    fontSize: 32,
    marginVertical: 10,
  },
  withdrawBtn: {
    backgroundColor: '#FAB843',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  withdrawText: {
    color: '#FFF',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    marginTop: 10,
  },
  txLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(46, 204, 113, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  txTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#333',
  },
  txDate: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#888',
  },
  txAmount: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
  }
});