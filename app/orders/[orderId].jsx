import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../utils/axiosInstance";

// Status config for the pill badge
const STATUS_CONFIG = {
  pending:    { label: "Awaiting Vendor", color: "#F59E0B", bg: "#FEF3C7" },
  accepted:   { label: "Accepted",        color: "#3B82F6", bg: "#EFF6FF" },
  processing: { label: "In Progress",     color: "#8B5CF6", bg: "#F3EDFF" },
  process:    { label: "In Progress",     color: "#8B5CF6", bg: "#F3EDFF" },
  processed:  { label: "In Progress",     color: "#8B5CF6", bg: "#F3EDFF" },
  delivered:  { label: "Delivered",       color: "#10B981", bg: "#ECFDF5" },
  completed:  { label: "Completed ✓",    color: "#10B981", bg: "#ECFDF5" },
  cancelled:  { label: "Cancelled",       color: "#EF4444", bg: "#FEF2F2" },
  rejected:   { label: "Rejected",        color: "#EF4444", bg: "#FEF2F2" },
};

export default function OrderDetailsScreen() {
  const { orderId, orderData } = useLocalSearchParams();
  const [order, setOrder] = useState(() => {
    if (orderData) {
      try {
        return JSON.parse(orderData);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const router = useRouter();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(!order);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Chat
  const [chatMessage, setChatMessage] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const chatScrollRef = useRef(null);

  // Complete action
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (orderId && currentUserId !== null) {
      fetchOrderAndMessages();
    }
  }, [orderId, currentUserId]);

  const loadCurrentUser = async () => {
    try {
      const ustr = await AsyncStorage.getItem("user");
      if (ustr) {
        const u = JSON.parse(ustr);
        setCurrentUserId(u._id);
      } else {
        setCurrentUserId("");
      }
    } catch {
      setCurrentUserId("");
    }
  };

  const fetchOrderAndMessages = async () => {
    try {
      // The hire request endpoint returns the order details
      // We need the eventId to fetch this, which is passed as a param
      // OR we can use the orderId directly if a single-order endpoint exists
      const [ordRes, msgRes] = await Promise.all([
        api.get(`/user/vendor-orders/${orderId}`).catch(() => null),
        api.get(`/user/vendor-orders/${orderId}/messages`),
      ]);

      // Try single order endpoint first; fall back to null (order was already passed via navigation)
      if (ordRes?.data?.success) {
        setOrder(ordRes.data.data);
      }

      // Messages
      if (msgRes.data?.success && Array.isArray(msgRes.data.data)) {
        setMessages(msgRes.data.data);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.log("Error loading order/messages:", error?.response?.data || error?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrderAndMessages();
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;
    const msgText = chatMessage.trim();
    setChatMessage("");
    setSendingMsg(true);

    // Optimistic bubble
    const optimistic = {
      _id: `temp_${Date.now()}`,
      message: msgText,
      sender: { _id: currentUserId },
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = await api.post(`/user/vendor-orders/${orderId}/messages`, {
        message: msgText,
      });
      if (res.data?.success) {
        // Re-fetch to get server-side message
        const msgRes = await api.get(`/user/vendor-orders/${orderId}/messages`);
        if (msgRes.data?.success && Array.isArray(msgRes.data.data)) {
          setMessages(msgRes.data.data);
        }
      }
    } catch (error) {
      console.log("Send message error:", error?.response?.data || error?.message);
      // Remove optimistic on fail
      setMessages((prev) => prev.filter((m) => m._id !== optimistic._id));
      Alert.alert("Error", "Failed to send message. Please try again.");
    } finally {
      setSendingMsg(false);
    }
  };

  const handleCompleteOrder = () => {
    Alert.alert(
      "Mark as Complete",
      "Confirm that the vendor has finished their service for your event. This will release payment to the vendor.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Complete",
          style: "default",
          onPress: async () => {
            setCompleting(true);
            try {
              const res = await api.put(`/user/vendor-orders/${orderId}/complete`);
              if (res.data?.success) {
                setOrder((prev) => ({
                  ...prev,
                  status: "completed",
                  completedAt: res.data.data?.completedAt,
                }));
                Alert.alert("🎉 Done!", "Job marked as complete. Payment has been released to the vendor.");
              } else {
                Alert.alert("Error", res.data?.message || "Failed to complete order.");
              }
            } catch (error) {
              Alert.alert("Error", error?.response?.data?.message || "Something went wrong.");
            } finally {
              setCompleting(false);
            }
          },
        },
      ]
    );
  };

  // ─── Derived vendor name from the real API shape ───
  const vendorName = order?.vendor?.firstname
    ? `${order.vendor.firstname} ${order.vendor.lastname || ""}`.trim()
    : order?.vendor?.businessName || "Vendor";

  const vendorAvatar = order?.vendor?.profile_picture;
  const statusConfig = STATUS_CONFIG[order?.status] || { label: order?.status || "Unknown", color: "#888", bg: "#F0F0F0" };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#5A31F4" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ─── HEADER ─── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          {vendorAvatar ? (
            <Image source={{ uri: vendorAvatar }} style={styles.headerAvatar} />
          ) : (
            <View style={styles.headerAvatarFallback}>
              <Text style={{ fontSize: 18 }}>👤</Text>
            </View>
          )}
          <View>
            <Text style={styles.headerTitle}>{vendorName}</Text>
            <View style={[styles.statusPill, { backgroundColor: statusConfig.bg }]}>
              <Text style={[styles.statusPillText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity style={styles.backBtn} onPress={onRefresh}>
          <Ionicons name="refresh-outline" size={22} color="#5A31F4" />
        </TouchableOpacity>
      </View>

      {/* ─── ORDER INFO CARD ─── */}
      {order && (
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Event</Text>
            <Text style={styles.infoVal} numberOfLines={1}>{order.event?.name || "—"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Amount</Text>
            <Text style={[styles.infoVal, { color: "#5A31F4", fontFamily: "Poppins_700Bold" }]}>
              ₦{(order.amount || 0).toLocaleString()} {order.currency || "NGN"}
            </Text>
          </View>
          {order.acceptedAt && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Accepted</Text>
              <Text style={styles.infoVal}>{new Date(order.acceptedAt).toLocaleDateString()}</Text>
            </View>
          )}
        </View>
      )}

      {/* ─── COMPLETE JOB BANNER ─── */}
      {order?.status === "delivered" && (
        <TouchableOpacity
          style={styles.completeBanner}
          onPress={handleCompleteOrder}
          disabled={completing}
          activeOpacity={0.85}
        >
          {completing ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={22} color="#FFF" />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.completeBannerTitle}>Vendor has delivered!</Text>
                <Text style={styles.completeBannerSub}>Tap to confirm & release payment</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#FFF" />
            </>
          )}
        </TouchableOpacity>
      )}

      {/* ─── PENDING NOTICE ─── */}
      {order?.status === "pending" && (
        <View style={styles.pendingBanner}>
          <Ionicons name="time-outline" size={20} color="#F59E0B" />
          <Text style={styles.pendingBannerText}>
            Waiting for vendor to accept your request...
          </Text>
        </View>
      )}

      {/* ─── CHAT ─── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView
          ref={chatScrollRef}
          style={styles.chatArea}
          contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
          onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5A31F4" />}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 ? (
            <View style={styles.emptyChat}>
              <Ionicons name="chatbubbles-outline" size={48} color="#DDD" />
              <Text style={styles.emptyChatText}>No messages yet</Text>
              <Text style={styles.emptyChatSub}>Start the conversation with your vendor</Text>
            </View>
          ) : (
            messages.map((msg, i) => {
              // Real API: sender is an object {_id, firstname, role, ...}
              // Optimistic: sender is {_id: currentUserId}
              const senderId = typeof msg.sender === "object" ? msg.sender?._id : msg.sender;
              const isMe = senderId === currentUserId;
              const senderName = isMe
                ? "You"
                : typeof msg.sender === "object"
                  ? `${msg.sender.firstname || ""} ${msg.sender.lastname || ""}`.trim()
                  : "Vendor";

              return (
                <View
                  key={msg._id || i}
                  style={[styles.bubbleWrap, isMe ? styles.bubbleWrapMe : styles.bubbleWrapThem]}
                >
                  {!isMe && (
                    <View style={styles.avatarSmall}>
                      {msg.sender?.profile_picture ? (
                        <Image source={{ uri: msg.sender.profile_picture }} style={styles.avatarSmallImg} />
                      ) : (
                        <Text style={{ fontSize: 14 }}>👤</Text>
                      )}
                    </View>
                  )}
                  <View style={{ flex: 1, alignItems: isMe ? "flex-end" : "flex-start" }}>
                    {!isMe && (
                      <Text style={styles.senderLabel}>{senderName}</Text>
                    )}
                    <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                      <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>
                        {msg.message}
                      </Text>
                    </View>
                    <Text style={[styles.bubbleTime, isMe && { textAlign: "right" }]}>
                      {msg.createdAt
                        ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : ""}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* ─── INPUT ─── */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#AAA"
            value={chatMessage}
            onChangeText={setChatMessage}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !chatMessage.trim() && { opacity: 0.4 }]}
            onPress={handleSendMessage}
            disabled={!chatMessage.trim() || sendingMsg}
          >
            {sendingMsg ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="send" size={18} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F6FF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 56 : 36,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20 },
  headerAvatarFallback: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#F3EDFF", justifyContent: "center", alignItems: "center",
  },
  headerTitle: { fontFamily: "Poppins_700Bold", fontSize: 15, color: "#111827" },
  statusPill: {
    alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 20, marginTop: 2,
  },
  statusPillText: { fontFamily: "Poppins_600SemiBold", fontSize: 11 },

  // Info card
  infoCard: {
    backgroundColor: "#FFF", marginHorizontal: 16, marginTop: 12,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  infoLabel: { fontFamily: "Poppins_400Regular", fontSize: 13, color: "#888" },
  infoVal: { fontFamily: "Poppins_600SemiBold", fontSize: 13, color: "#1A1A1A", maxWidth: "60%", textAlign: "right" },

  // Banners
  completeBanner: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#10B981", margin: 16, marginTop: 8,
    padding: 14, borderRadius: 12,
  },
  completeBannerTitle: { fontFamily: "Poppins_700Bold", fontSize: 14, color: "#FFF" },
  completeBannerSub: { fontFamily: "Poppins_400Regular", fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 2 },
  pendingBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#FEF3C7", margin: 16, marginTop: 8,
    padding: 12, borderRadius: 12,
  },
  pendingBannerText: { fontFamily: "Poppins_400Regular", fontSize: 13, color: "#92400E", flex: 1 },

  // Chat
  chatArea: { flex: 1 },
  emptyChat: { alignItems: "center", marginTop: 60 },
  emptyChatText: { fontFamily: "Poppins_600SemiBold", fontSize: 16, color: "#888", marginTop: 12 },
  emptyChatSub: { fontFamily: "Poppins_400Regular", fontSize: 13, color: "#AAA", marginTop: 4 },

  bubbleWrap: { flexDirection: "row", marginBottom: 14, alignItems: "flex-end" },
  bubbleWrapMe: { justifyContent: "flex-end" },
  bubbleWrapThem: { justifyContent: "flex-start" },
  avatarSmall: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "#E0D4FF", justifyContent: "center", alignItems: "center",
    marginRight: 8,
  },
  avatarSmallImg: { width: 28, height: 28, borderRadius: 14 },
  senderLabel: { fontFamily: "Poppins_400Regular", fontSize: 11, color: "#AAA", marginBottom: 3, marginLeft: 2 },
  bubble: { maxWidth: "78%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleMe: { backgroundColor: "#5A31F4", borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: "#FFF", borderBottomLeftRadius: 4, borderWidth: 1, borderColor: "#E0D4FF" },
  bubbleText: { fontFamily: "Poppins_400Regular", fontSize: 14, color: "#111827", lineHeight: 22 },
  bubbleTextMe: { color: "#FFF" },
  bubbleTime: { fontFamily: "Poppins_400Regular", fontSize: 11, color: "#AAA", marginTop: 3, marginHorizontal: 2 },

  // Input
  inputRow: {
    flexDirection: "row", alignItems: "flex-end",
    paddingHorizontal: 16, paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 30 : 14,
    backgroundColor: "#FFF",
    borderTopWidth: 1, borderTopColor: "#F0F0F0",
  },
  input: {
    flex: 1, backgroundColor: "#F4F0FF",
    borderRadius: 22, paddingHorizontal: 16,
    paddingTop: 10, paddingBottom: 10,
    maxHeight: 100, minHeight: 44,
    fontFamily: "Poppins_400Regular", fontSize: 14, color: "#1A1A1A",
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#5A31F4", justifyContent: "center",
    alignItems: "center", marginLeft: 10,
  },
});
