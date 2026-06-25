import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../utils/axiosInstance";

const STATUS_CONFIG = {
  pending:   { label: "Awaiting Vendor", color: "#F59E0B", bg: "#FEF3C7" },
  accepted:  { label: "Accepted",        color: "#3B82F6", bg: "#EFF6FF" },
  process:   { label: "In Progress",     color: "#8B5CF6", bg: "#F3EDFF" },
  processed: { label: "In Progress",     color: "#8B5CF6", bg: "#F3EDFF" },
  delivered: { label: "Delivered",       color: "#10B981", bg: "#ECFDF5" },
  completed: { label: "Completed ✓",    color: "#10B981", bg: "#ECFDF5" },
  cancelled: { label: "Cancelled",       color: "#EF4444", bg: "#FEF2F2" },
  rejected:  { label: "Rejected",        color: "#EF4444", bg: "#FEF2F2" },
};

export default function MyBookingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookings, setBookings] = useState([]);

  const [debugLog, setDebugLog] = useState("");
  const [showDebug, setShowDebug] = useState(false);

  const fetchAllBookings = async () => {
    try {
      let log = "Starting fetch...\n";
      const ustr = await AsyncStorage.getItem("user");
      if (!ustr) {
        setLoading(false);
        setRefreshing(false);
        return;
      }
      const user = JSON.parse(ustr);
      log += `User ID: ${user._id}\n`;

      // 1. Fetch user's events
      const eventRes = await api.get(`/event/key?value=${user._id}&key=userId`);
      const rawEvents = eventRes.data?.data;
      const events = Array.isArray(rawEvents) ? rawEvents : (rawEvents ? [rawEvents] : []);
      log += `Found ${events.length} events.\n`;

      // 2. Fetch hired vendors for each event concurrently
      const allBookings = [];
      await Promise.all(
        events.map(async (ev, index) => {
          try {
            const url = `/user/vendors/hire/request/${ev._id || ev.id}`;
            const hiredRes = await api.get(url);
            
            // Log the raw response for the first 2 events
            if (index < 2) {
              log += `\n--- Event ${index + 1} (${ev.name}) ---\n`;
              log += `URL: ${url}\n`;
              log += `Response: ${JSON.stringify(hiredRes.data)}\n`;
            }

            if (hiredRes.data?.success && hiredRes.data?.data) {
               const orders = Array.isArray(hiredRes.data.data) ? hiredRes.data.data : [hiredRes.data.data];
               allBookings.push(...orders);
            }
          } catch (e) {
            log += `\nError on event ${ev.name}: ${e?.message}\n`;
          }
        })
      );

      // 3. Sort by createdAt desc
      allBookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setBookings(allBookings);
      setDebugLog(log);
    } catch (error) {
      console.log("Error fetching all bookings:", error);
      setDebugLog(`Global Error: ${error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllBookings();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAllBookings();
  }, []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#5A31F4" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Booked Vendors</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5A31F4" />}
      >
        {bookings.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="briefcase-outline" size={54} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No hired vendors yet</Text>
            <Text style={styles.emptySubtitle}>
              When you book a vendor for your event, they will appear here.
            </Text>
            <TouchableOpacity style={styles.browseBtn} onPress={() => router.push("/(tabs)/Home")}>
              <Text style={styles.browseBtnText}>Explore Events & Vendors</Text>
            </TouchableOpacity>
          </View>
        ) : (
          bookings.map((order) => {
            const vName = order.vendor?.firstname
              ? `${order.vendor.firstname} ${order.vendor.lastname || ""}`.trim()
              : order.vendor?.businessName || "Vendor";
            const vAvatar = order.vendor?.profile_picture;
            const sc = STATUS_CONFIG[order.status] || { color: "#888", bg: "#F0F0F0", label: order.status };

            return (
              <TouchableOpacity
                key={order._id}
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => router.push({
                  pathname: `/orders/${order._id}`,
                  params: { orderData: JSON.stringify(order) }
                })}
              >
                <View style={styles.cardHeader}>
                  {vAvatar ? (
                    <Image source={{ uri: vAvatar }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={{ fontSize: 18 }}>👤</Text>
                    </View>
                  )}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.vendorName}>{vName}</Text>
                    <Text style={styles.eventName} numberOfLines={1}>
                      Event: {order.event?.name || "Unknown Event"}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.statusText, { color: sc.color }]}>{sc.label}</Text>
                  </View>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.cardFooter}>
                  <View style={styles.footerItem}>
                    <Text style={styles.footerLabel}>Amount</Text>
                    <Text style={styles.footerValue}>
                      ₦{(order.amount || 0).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.footerItem}>
                    <Text style={styles.footerLabel}>Requested</Text>
                    <Text style={styles.footerValue}>
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "—"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#CCC" />
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F6FF" },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backBtn: { padding: 4 },
  headerTitle: { fontFamily: "Poppins_700Bold", fontSize: 18, color: "#111827" },

  listContainer: { padding: 16, paddingBottom: 40 },
  
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#F3EDFF", justifyContent: "center", alignItems: "center",
  },
  vendorName: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: "#111827" },
  eventName: { fontFamily: "Poppins_400Regular", fontSize: 13, color: "#6B7280", marginTop: 2 },
  
  statusBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontFamily: "Poppins_600SemiBold", fontSize: 11 },

  cardDivider: { height: 1, backgroundColor: "#F3F4F6", marginVertical: 12 },
  
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  footerItem: { flex: 1 },
  footerLabel: { fontFamily: "Poppins_400Regular", fontSize: 12, color: "#9CA3AF" },
  footerValue: { fontFamily: "Poppins_600SemiBold", fontSize: 13, color: "#374151", marginTop: 2 },

  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 60, paddingHorizontal: 20 },
  emptyTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 18, color: "#374151", marginTop: 16 },
  emptySubtitle: { fontFamily: "Poppins_400Regular", fontSize: 14, color: "#6B7280", textAlign: "center", marginTop: 8 },
  browseBtn: {
    backgroundColor: "#5A31F4",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 24,
  },
  browseBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: "#FFF" },
});
