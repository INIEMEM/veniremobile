import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../utils/axiosInstance';

export default function VendorOrderChat() {
  const router = useRouter();
  const { orderId, clientName, clientAvatar } = useLocalSearchParams();

  const [messages, setMessages]       = useState([]);
  const [newMsg, setNewMsg]           = useState('');
  const [loading, setLoading]         = useState(true);
  const [sending, setSending]         = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  const flatRef  = useRef(null);
  const pollRef  = useRef(null);

  // Load logged-in vendor's user ID
  useEffect(() => {
    AsyncStorage.getItem('user').then((raw) => {
      if (raw) {
        try {
          const u = JSON.parse(raw);
          setCurrentUserId(u._id || u.id || null);
        } catch (_) {}
      }
    });
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.get(`/vendor/user-orders/${orderId}/messages`);
      if (res.data?.success) {
        setMessages(res.data.data || []);
      }
    } catch (e) {
      console.log('fetch messages error', e?.response?.data || e?.message);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchMessages();
    // Poll for new messages every 6 seconds
    pollRef.current = setInterval(fetchMessages, 6000);
    return () => clearInterval(pollRef.current);
  }, [fetchMessages]);

  const handleSend = async () => {
    const text = newMsg.trim();
    if (!text || sending) return;

    // Optimistic bubble
    const optimistic = {
      _id: `temp_${Date.now()}`,
      message: text,
      sender: { role: 'vendor' },
      createdAt: new Date().toISOString(),
      _optimistic: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setNewMsg('');
    setSending(true);

    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const res = await api.post(`/vendor/user-orders/${orderId}/messages`, { message: text });
      if (res.data?.success) {
        // Replace optimistic message with real one
        setMessages((prev) =>
          prev.map((m) => (m._id === optimistic._id ? res.data.data : m))
        );
      }
    } catch (e) {
      // Revert optimistic message on failure
      setMessages((prev) => prev.filter((m) => m._id !== optimistic._id));
      setNewMsg(text);
      console.log('send message error', e?.response?.data || e?.message);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const fmtTime = (d) =>
    d ? new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';

  const renderMessage = ({ item: m }) => {
    const senderId = typeof m.sender === 'object' ? m.sender?._id : m.sender;
    // It's a vendor message if the sender ID matches the logged in user, OR if it's an optimistic message
    const isVendor = (currentUserId && senderId === currentUserId) || m._optimistic;
    return (
      <View style={[styles.bubbleWrap, isVendor ? styles.bubbleWrapRight : styles.bubbleWrapLeft]}>
        {!isVendor && (
          <View style={styles.avatarSmall}>
            {clientAvatar ? (
              <Image source={{ uri: clientAvatar }} style={styles.avatarImg} transition={200} />
            ) : (
              <Text style={{ fontSize: 13 }}>👤</Text>
            )}
          </View>
        )}
        <View style={{ flex: 1, alignItems: isVendor ? 'flex-end' : 'flex-start' }}>
          {!isVendor && (
            <Text style={styles.senderLabel}>{clientName || 'Client'}</Text>
          )}
          <View style={[styles.bubble, isVendor ? styles.bubbleVendor : styles.bubbleClient]}>
            <Text style={[styles.bubbleText, isVendor && styles.bubbleTextVendor]}>
              {m.message}
            </Text>
          </View>
          <Text style={[styles.bubbleTime, isVendor && { textAlign: 'right' }]}>
            {fmtTime(m.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          {clientAvatar ? (
            <Image source={{ uri: clientAvatar }} style={styles.headerAvatar} transition={200} />
          ) : (
            <View style={styles.headerAvatarFallback}>
              <Text style={{ fontSize: 18 }}>👤</Text>
            </View>
          )}
          <View>
            <Text style={styles.headerName} numberOfLines={1}>
              {clientName || 'Client'}
            </Text>
            <Text style={styles.headerSub}>Chat</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchMessages}>
          <Ionicons name="refresh-outline" size={20} color="#5A31F4" />
        </TouchableOpacity>
      </View>

      {/* ── Messages ── */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#5A31F4" />
        </View>
      ) : (
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(m, i) => m._id || String(i)}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="chatbubbles-outline" size={52} color="#D1D5DB" />
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubText}>Start the conversation with the client</Text>
            </View>
          }
        />
      )}

      {/* ── Input Bar ── */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={newMsg}
          onChangeText={setNewMsg}
          placeholder="Type a message..."
          placeholderTextColor="#aaa"
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!newMsg.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!newMsg.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Ionicons name="send" size={18} color="#FFF" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F4FF' },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 58 : 40,
    paddingBottom: 14,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#F3EDFF',
    justifyContent: 'center', alignItems: 'center',
  },
  refreshBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#F3EDFF',
    justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#E5E7EB' },
  headerAvatarFallback: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#F3EDFF',
    justifyContent: 'center', alignItems: 'center',
  },
  headerName: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: '#1A1A1A' },
  headerSub:  { fontFamily: 'Poppins_400Regular', fontSize: 11, color: '#888' },

  listContent: { padding: 16, paddingBottom: 8, flexGrow: 1 },

  bubbleWrap:      { flexDirection: 'row', marginBottom: 14, alignItems: 'flex-end' },
  bubbleWrapRight: { justifyContent: 'flex-end' },
  bubbleWrapLeft:  { justifyContent: 'flex-start', gap: 8 },

  avatarSmall: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#F3EDFF',
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: 30, height: 30, borderRadius: 15 },
  senderLabel: {
    fontFamily: 'Poppins_600SemiBold', fontSize: 11,
    color: '#5A31F4', marginBottom: 3,
  },

  bubble: {
    maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10,
  },
  bubbleClient: {
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 4,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  bubbleVendor: {
    backgroundColor: '#5A31F4',
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontFamily: 'Poppins_400Regular', fontSize: 14,
    color: '#1A1A1A', lineHeight: 20,
  },
  bubbleTextVendor: { color: '#FFF' },
  bubbleTime: {
    fontFamily: 'Poppins_400Regular', fontSize: 10,
    color: '#aaa', marginTop: 4,
  },

  emptyBox: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingTop: 80, gap: 10,
  },
  emptyText:    { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#9CA3AF' },
  emptySubText: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: '#C4C4C4', textAlign: 'center' },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 30 : 12,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  input: {
    flex: 1, backgroundColor: '#F3EDFF', borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10,
    fontFamily: 'Poppins_400Regular', fontSize: 14,
    color: '#1A1A1A', maxHeight: 100,
  },
  sendBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#5A31F4',
    justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#C4B5FD' },
});
