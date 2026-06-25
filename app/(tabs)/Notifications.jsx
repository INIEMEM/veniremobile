import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  Animated,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../../utils/axiosInstance";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";

export default function Notifications() {

  const [notifications, setNotifications] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const successOpacity = useRef(new Animated.Value(0)).current;

  const fetchNotifications = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      
      const response = await api.get("/notification", {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        let rawData = response.data.data;
        
        // Handle cases where the backend wraps the array in an object
        if (rawData && !Array.isArray(rawData)) {
          if (Array.isArray(rawData.notifications)) rawData = rawData.notifications;
          else if (Array.isArray(rawData.data)) rawData = rawData.data;
          else rawData = [rawData];
        }
        
        rawData = rawData || [];
        
        // Map backend fields to frontend UI needs
        const mapped = rawData.map(item => ({
          id: item._id || item.id || Math.random().toString(),
          type: item.type || "default",
          message: item.message || item.title || "New Notification",
          subtext: item.subtext || "",
          time: "Recently", // You can use a timeAgo function if you have one
          isRead: !!item.read || !!item.isRead,
          createdAt: item.createdAt,
        }));
        setNotifications(mapped);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const unreadCount = notifications.filter((item) => !item.isRead).length;

  const filteredNotifications = useMemo(() => {
    if (activeFilter === "unread") {
      return notifications.filter((item) => !item.isRead);
    }
    return notifications;
  }, [activeFilter, notifications]);

  const sections = useMemo(() => {
    // If backend provides dates, we could group by actual date.
    // For now we'll put them all in "Recent"
    if (filteredNotifications.length === 0) return [];
    return [
      { title: "Recent Notifications", data: filteredNotifications }
    ];
  }, [filteredNotifications]);

  const showSuccessMessage = () => {
    successOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(successOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.delay(1200),
      Animated.timing(successOpacity, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleMarkAllAsRead = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      await api.put("/notification", {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications((current) =>
        current.map((item) => ({ ...item, isRead: true }))
      );
      showSuccessMessage();
    } catch (error) {
      Toast.show({ type: "error", text1: "Failed to mark all as read" });
    }
  };

  const handlePressNotification = async (id) => {
    try {
      const token = await AsyncStorage.getItem("token");
      await api.put(`/notification/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications((current) =>
        current.map((item) =>
          item.id === id ? { ...item, isRead: true } : item
        )
      );
    } catch (error) {
      console.log("Error marking notification read:", error);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const getNotificationMeta = (type, isRead) => {
    const tintOpacity = isRead ? "1A" : "2E";

    switch (type) {
      case "like":
        return {
          icon: "heart",
          color: "#FF6B6B",
          backgroundColor: `#FF6B6B${tintOpacity}`,
        };
      case "comment":
        return {
          icon: "chatbubble",
          color: "#5A31F4",
          backgroundColor: `#5A31F4${tintOpacity}`,
        };
      case "interest":
        return {
          icon: "star",
          color: "#FAB843",
          backgroundColor: `#FAB843${tintOpacity}`,
        };
      case "bookmark":
        return {
          icon: "bookmark",
          color: "#5A31F4",
          backgroundColor: `#5A31F4${tintOpacity}`,
        };
      case "event_approved":
        return {
          icon: "checkmark",
          color: "#22A06B",
          backgroundColor: `#22A06B${tintOpacity}`,
        };
      case "event_reminder":
        return {
          icon: "notifications",
          color: "#F97316",
          backgroundColor: `#F97316${tintOpacity}`,
        };
      default:
        return {
          icon: "notifications",
          color: "#5A31F4",
          backgroundColor: `#5A31F4${tintOpacity}`,
        };
    }
  };

  const renderNotification = ({ item }) => {
    const meta = getNotificationMeta(item.type, item.isRead);

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          !item.isRead && styles.unreadNotificationItem,
        ]}
        onPress={() => handlePressNotification(item.id)}
        activeOpacity={0.75}
      >
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: meta.backgroundColor,
            },
          ]}
        >
          <Ionicons name={meta.icon} size={20} color={meta.color} />
        </View>

        <View style={styles.notificationContent}>
          <Text style={styles.notificationMessage}>{item.message}</Text>
          <Text style={styles.notificationSubtext} numberOfLines={1}>
            {item.subtext}
          </Text>
          <Text style={styles.notificationTime}>{item.time}</Text>
        </View>

        <View style={styles.indicatorColumn}>
          {!item.isRead && <View style={styles.unreadDot} />}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="notifications-outline" size={58} color="#C9C0D8" />
      <Text style={styles.emptyTitle}>You're all caught up!</Text>
      <Text style={styles.emptySubtext}>No unread notifications</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Notifications</Text>
          <TouchableOpacity onPress={handleMarkAllAsRead} activeOpacity={0.75}>
            <Text style={styles.markAllText}>Mark all as read</Text>
          </TouchableOpacity>
        </View>

        <Animated.Text
          style={[
            styles.successText,
            {
              opacity: successOpacity,
            },
          ]}
        >
          All caught up ✓
        </Animated.Text>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeFilter === "all" && styles.activeTab,
            ]}
            onPress={() => setActiveFilter("all")}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.tabText,
                activeFilter === "all" && styles.activeTabText,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeFilter === "unread" && styles.activeTab,
            ]}
            onPress={() => setActiveFilter("unread")}
            activeOpacity={0.75}
          >
            <View style={styles.unreadTabContent}>
              <Text
                style={[
                  styles.tabText,
                  activeFilter === "unread" && styles.activeTabText,
                ]}
              >
                Unread
              </Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#5A31F4" />
        </View>
      ) : (
        <SectionList
          sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={[
          styles.listContent,
          sections.length === 0 && styles.emptyListContent,
        ]}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#5A31F4"
            colors={["#5A31F4"]}
          />
        }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },
  header: {
    backgroundColor: "#F8F8F8",
    paddingHorizontal: 16,
    paddingTop: 58,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    color: "#333",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 22,
  },
  markAllText: {
    color: "#5A31F4",
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
  },
  successText: {
    color: "#5A31F4",
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    marginTop: 6,
  },
  tabs: {
    flexDirection: "row",
    marginTop: 14,
  },
  tab: {
    alignItems: "center",
    borderBottomColor: "transparent",
    borderBottomWidth: 2,
    marginRight: 26,
    paddingBottom: 9,
  },
  activeTab: {
    borderBottomColor: "#5A31F4",
  },
  tabText: {
    color: "#999",
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
  },
  activeTabText: {
    color: "#5A31F4",
  },
  unreadTabContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  badge: {
    alignItems: "center",
    backgroundColor: "#5A31F4",
    borderRadius: 9,
    height: 18,
    justifyContent: "center",
    marginLeft: 7,
    minWidth: 18,
    paddingHorizontal: 5,
  },
  badgeText: {
    color: "#fff",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 10,
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  sectionHeader: {
    backgroundColor: "#F8F8F8",
    color: "#999",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 18,
    textTransform: "uppercase",
  },
  notificationItem: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderBottomColor: "#E8DBFF",
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  unreadNotificationItem: {
    backgroundColor: "#F8F4FF",
  },
  iconCircle: {
    alignItems: "center",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  notificationContent: {
    flex: 1,
    marginLeft: 12,
  },
  notificationMessage: {
    color: "#333",
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    lineHeight: 20,
  },
  notificationSubtext: {
    color: "#666",
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    fontStyle: "italic",
    lineHeight: 18,
    marginTop: 2,
  },
  notificationTime: {
    color: "#999",
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  indicatorColumn: {
    alignItems: "flex-end",
    marginLeft: 12,
    width: 10,
  },
  unreadDot: {
    backgroundColor: "#5A31F4",
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  emptyState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: "#333",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 17,
    marginTop: 14,
    textAlign: "center",
  },
  emptySubtext: {
    color: "#999",
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    marginTop: 4,
    textAlign: "center",
  },
});
