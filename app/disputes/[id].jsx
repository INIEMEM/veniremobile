import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import api from '../../utils/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Format ms to m:ss ─────────────────────────────────────────
const formatMs = (ms) => {
  if (!ms || ms <= 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec < 10 ? '0' : ''}${sec}`;
};

// ── VoiceNotePlayer ───────────────────────────────────────────
const VoiceNotePlayer = ({ uri, isMyMessage }) => {
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const progressWidth = useRef(0);
  const progressX = useRef(0);
  const soundRef = useRef(null);

  useEffect(() => {
    let s;
    const loadSound = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
          playThroughEarpieceAndroid: false,
          staysActiveInBackground: false,
        });
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: false },
          (status) => {
            if (status.isLoaded) {
              if (!isDragging) setPosition(status.positionMillis);
              setDuration(status.durationMillis || 0);
              setIsPlaying(status.isPlaying);
              if (status.didJustFinish) {
                setIsPlaying(false);
                setPosition(0);
              }
            }
          }
        );
        s = newSound;
        soundRef.current = newSound;
        setSound(newSound);
      } catch (err) {
        console.error('VoiceNotePlayer load error:', err);
      }
    };
    loadSound();
    return () => { if (s) s.unloadAsync(); };
  }, [uri]);

  const togglePlay = async () => {
    try {
      if (!soundRef.current) return;
      if (isPlaying) {
        await soundRef.current.pauseAsync();
      } else {
        await soundRef.current.playAsync();
      }
    } catch (err) {
      console.error('Playback error:', err);
    }
  };

  const seekTo = async (percent) => {
    if (!soundRef.current || duration <= 0) return;
    const seekMs = Math.max(0, Math.min(percent * duration, duration));
    try {
      await soundRef.current.setPositionAsync(seekMs);
      setPosition(seekMs);
    } catch (err) {
      console.error('Seek error:', err);
    }
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      setIsDragging(true);
      const x = e.nativeEvent.locationX;
      const pct = Math.max(0, Math.min(x / progressWidth.current, 1));
      setPosition(pct * duration);
    },
    onPanResponderMove: (e) => {
      const x = e.nativeEvent.pageX - progressX.current;
      const pct = Math.max(0, Math.min(x / progressWidth.current, 1));
      setPosition(pct * duration);
    },
    onPanResponderRelease: (e) => {
      const x = e.nativeEvent.pageX - progressX.current;
      const pct = Math.max(0, Math.min(x / progressWidth.current, 1));
      setIsDragging(false);
      seekTo(pct);
    },
  });

  const progress = duration > 0 ? Math.min((position / duration) * 100, 100) : 0;
  const trackColor = isMyMessage ? 'rgba(255,255,255,0.3)' : '#E0E0E0';
  const fillColor = isMyMessage ? '#FFF' : '#5A31F4';
  const iconColor = isMyMessage ? '#FFF' : '#5A31F4';
  const timeColor = isMyMessage ? 'rgba(255,255,255,0.8)' : '#888';

  return (
    <View style={styles.voiceNoteContainer}>
      <TouchableOpacity onPress={togglePlay} style={styles.playBtn}>
        <Ionicons name={isPlaying ? 'pause' : 'play'} size={22} color={iconColor} />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <View
          style={[styles.progressBarBg, { backgroundColor: trackColor }]}
          onLayout={(e) => {
            progressWidth.current = e.nativeEvent.layout.width;
            progressX.current = e.nativeEvent.layout.x;
          }}
          {...panResponder.panHandlers}
        >
          <View style={[styles.progressBarFill, { width: `${progress}%`, backgroundColor: fillColor }]} />
          <View style={[styles.thumb, { left: `${progress}%`, backgroundColor: fillColor }]} />
        </View>
        <View style={styles.durationRow}>
          <Text style={[styles.durationText, { color: timeColor }]}>{formatMs(position)}</Text>
          <Text style={[styles.durationText, { color: timeColor }]}>{formatMs(duration)}</Text>
        </View>
      </View>
    </View>
  );
};

// ── Main Chat Screen ──────────────────────────────────────────
export default function DisputeChatScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();

  const isVendor = user?.role === 'vendor';
  // Endpoints
  const detailEndpoint = isVendor ? `/vendor/disputes/${id}` : `/user/disputes/${id}`;
  const messageEndpoint = isVendor
    ? `/vendor/disputes/${id}/messages`
    : `/admin/disputes/${id}/messages`;
  const closeEndpoint = isVendor
    ? `/vendor/disputes/${id}/close`
    : `/user/disputes/${id}/close`;

  const [dispute, setDispute] = useState(null);
  const [messages, setMessages] = useState([]);
  const [textMsg, setTextMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Recording states
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const flatListRef = useRef(null);
  const recordingTimer = useRef(null);

  useEffect(() => {
    fetchDisputeDetails();
    Audio.requestPermissionsAsync();
  }, [id]);

  const fetchDisputeDetails = async () => {
    try {
      const res = await api.get(detailEndpoint);
      if (res.data?.success) {
        const data = res.data.data;
        // Data comes as { dispute, messages }
        setDispute(data.dispute || data);
        setMessages(data.messages || []);
      }
    } catch (e) {
      console.error('Fetch dispute error:', e?.response?.data || e?.message);
      toast.error('Could not load dispute details.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    Alert.alert(
      'Close Dispute',
      'Are you sure you want to close this dispute? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close Dispute',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await api.patch(closeEndpoint, {
                reason: 'Resolved by initiating party.',
              });
              if (res.data?.success) {
                toast.success('Dispute closed.');
                router.back();
              }
            } catch (err) {
              toast.error(err?.response?.data?.message || 'Failed to close dispute.');
            }
          },
        },
      ]
    );
  };

  const handleSendText = async () => {
    if (!textMsg.trim()) return;
    try {
      setSending(true);
      const payload = isVendor
        ? { message: textMsg, images: [], videos: [], voiceNotes: [] }
        : { target: 'admin', message: textMsg, images: [], videos: [], voiceNotes: [] };

      const res = await api.post(messageEndpoint, payload);
      if (res.data?.success) {
        // Append the new message locally
        setMessages(prev => [...prev, res.data.data]);
        setTextMsg('');
        flatListRef.current?.scrollToEnd({ animated: true });
      }
    } catch (e) {
      toast.error('Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const uploadAudioToS3 = async (localUri) => {
    const token = await AsyncStorage.getItem('token');
    const ext = localUri.split('.').pop() || 'm4a';
    const fileType = `audio/${ext}`;
    const s3Res = await api.put('/auth/sign-s3', { fileType, folder: 'disputes/audio' }, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!s3Res.data?.success) throw new Error('Failed to get S3 URL');
    const { signedRequest, url } = s3Res.data.data;
    const uploadRes = await FileSystem.uploadAsync(signedRequest, localUri, {
      httpMethod: 'PUT',
      headers: { 'Content-Type': fileType },
    });
    if (uploadRes.status !== 200) throw new Error('S3 upload failed');
    return url;
  };

  const handleMicPress = () => {
    if (isRecording) {
      stopRecordingAndSend();
    } else {
      startRecording();
    }
  };

  const startRecording = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (perm.status !== 'granted') {
        toast.error('Microphone permission required.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimer.current = setInterval(() => setRecordingDuration(p => p + 1), 1000);
    } catch (err) {
      console.error('Failed to start recording', err);
      toast.error('Could not start recording.');
    }
  };

  const stopRecordingAndSend = async () => {
    if (!recording) return;
    try {
      setIsRecording(false);
      clearInterval(recordingTimer.current);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setRecordingDuration(0);

      if (uri) {
        setSending(true);
        const s3Url = await uploadAudioToS3(uri);
        const payload = isVendor
          ? { message: '', images: [], videos: [], voiceNotes: [s3Url] }
          : { target: 'admin', message: '', images: [], videos: [], voiceNotes: [s3Url] };
        const res = await api.post(messageEndpoint, payload);
        if (res.data?.success) {
          setMessages(prev => [...prev, res.data.data]);
          flatListRef.current?.scrollToEnd({ animated: true });
        }
      }
    } catch (err) {
      toast.error('Failed to send voice note.');
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const formatSecs = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isMyMessage = (msg) => msg.sender?._id === user?._id;
  const isAdminMessage = (msg) => msg.senderType === 'admin';

  const canClose = dispute?.status !== 'closed' && dispute?.status !== 'resolved';

  const getOtherPartyInfo = () => {
    const order = dispute?.vendorOrder;
    if (!order) return 'Dispute Chat';
    const subject = dispute?.subject || dispute?.title || 'Dispute';
    return subject;
  };

  const renderMessage = ({ item }) => {
    const mine = isMyMessage(item);
    const adminMsg = isAdminMessage(item);
    const voiceNotes = item.voiceNotes || [];
    const hasVoice = voiceNotes.length > 0;
    const voiceUri = hasVoice ? voiceNotes[0] : null;

    return (
      <View style={[styles.bubbleWrapper, mine ? styles.bubbleWrapperRight : styles.bubbleWrapperLeft]}>
        {!mine && (
          <Text style={styles.senderName}>
            {adminMsg ? '🛡 Admin' : (item.sender?.firstname || 'User')}
          </Text>
        )}
        <View style={[
          styles.bubble,
          mine ? styles.bubbleRight : styles.bubbleLeft,
          adminMsg && !mine && styles.bubbleAdmin,
        ]}>
          {hasVoice ? (
            <VoiceNotePlayer uri={voiceUri} isMyMessage={mine} />
          ) : (
            <Text style={[styles.msgText, mine ? styles.msgTextRight : styles.msgTextLeft]}>
              {item.message || item.text}
            </Text>
          )}
        </View>
        <Text style={[styles.timeText, mine && { alignSelf: 'flex-end' }]}>
          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>{getOtherPartyInfo()}</Text>
            {dispute?.status && (
              <Text style={styles.headerSub}>Status: {dispute.status}</Text>
            )}
          </View>
          {canClose && (
            <TouchableOpacity onPress={handleClose} style={styles.closeDisputeBtn}>
              <Text style={styles.closeDisputeText}>Close</Text>
            </TouchableOpacity>
          )}
          {!canClose && <View style={{ width: 50 }} />}
        </View>

        {/* Info banner */}
        <View style={styles.adminBanner}>
          <Ionicons name="shield-half-outline" size={14} color="#5A31F4" />
          <Text style={styles.adminBannerText}>
            All messages are reviewed by our admin team
          </Text>
        </View>

        {/* Messages */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#5A31F4" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item, i) => item._id || String(i)}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            contentContainerStyle={[styles.chatList, messages.length === 0 && styles.chatListEmpty]}
            renderItem={renderMessage}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Ionicons name="chatbubbles-outline" size={48} color="#DDD" />
                <Text style={styles.emptyChatText}>No messages yet. Start the conversation!</Text>
              </View>
            }
          />
        )}

        {/* Input area */}
        {canClose ? (
          <View style={styles.inputArea}>
            {isRecording ? (
              <View style={styles.recordingOverlay}>
                <View style={styles.recordingBlink} />
                <Text style={styles.recordingTime}>{formatSecs(recordingDuration)}</Text>
                <Text style={styles.recordingHint}>Tap stop to send</Text>
              </View>
            ) : (
              <TextInput
                style={styles.textInput}
                placeholder="Type a message..."
                placeholderTextColor="#999"
                value={textMsg}
                onChangeText={setTextMsg}
                multiline
              />
            )}

            {textMsg.trim() ? (
              <TouchableOpacity style={styles.sendBtn} onPress={handleSendText} disabled={sending}>
                {sending ? <ActivityIndicator color="#FFF" /> : <Ionicons name="send" size={20} color="#FFF" />}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.micBtn, isRecording && styles.micBtnRecording]}
                onPress={handleMicPress}
                disabled={sending}
              >
                {sending
                  ? <ActivityIndicator color="#FFF" />
                  : <Ionicons name={isRecording ? 'stop' : 'mic'} size={24} color="#FFF" />
                }
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.closedBanner}>
            <Ionicons name="lock-closed-outline" size={16} color="#888" />
            <Text style={styles.closedBannerText}>This dispute has been {dispute?.status}.</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  backBtn: { padding: 5 },
  headerTitleContainer: { flex: 1, marginHorizontal: 10 },
  headerTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: '#222',
  },
  headerSub: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: '#888',
    textTransform: 'capitalize',
  },
  closeDisputeBtn: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  closeDisputeText: {
    color: '#FFF',
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
  },
  adminBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEE9FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  adminBannerText: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: '#5A31F4',
  },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  chatList: { padding: 15, paddingBottom: 20 },
  chatListEmpty: { flex: 1, justifyContent: 'center' },
  emptyChat: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyChatText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: '#AAA',
    textAlign: 'center',
    marginTop: 12,
  },
  bubbleWrapper: { marginBottom: 16, maxWidth: '80%' },
  bubbleWrapperLeft: { alignSelf: 'flex-start' },
  bubbleWrapperRight: { alignSelf: 'flex-end' },
  senderName: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    color: '#888',
    marginBottom: 4,
    marginLeft: 4,
  },
  bubble: { padding: 12, borderRadius: 16 },
  bubbleLeft: {
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  bubbleRight: { backgroundColor: '#5A31F4', borderBottomRightRadius: 4 },
  bubbleAdmin: { backgroundColor: '#FFF9E6', borderColor: '#FFD700', borderWidth: 1 },
  msgText: { fontSize: 15, fontFamily: 'Poppins_400Regular', lineHeight: 22 },
  msgTextLeft: { color: '#333' },
  msgTextRight: { color: '#FFF' },
  timeText: {
    fontSize: 10,
    fontFamily: 'Poppins_400Regular',
    color: '#AAA',
    marginTop: 4,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    minHeight: 60,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    color: '#333',
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: '#5A31F4',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  micBtn: {
    backgroundColor: '#FF3B30',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  micBtnRecording: { transform: [{ scale: 1.15 }], backgroundColor: '#C62828' },
  recordingOverlay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  recordingBlink: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#FF3B30', marginRight: 10,
  },
  recordingTime: {
    fontFamily: 'Poppins_500Medium', fontSize: 16,
    color: '#333', marginRight: 10,
  },
  recordingHint: {
    fontFamily: 'Poppins_400Regular', fontSize: 13, color: '#888',
  },
  closedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  closedBannerText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: '#888',
    textTransform: 'capitalize',
  },
  // Voice note player
  voiceNoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 220,
    paddingVertical: 4,
  },
  playBtn: { marginRight: 10, width: 28, alignItems: 'center' },
  progressBarBg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'visible',
    justifyContent: 'center',
  },
  progressBarFill: { height: '100%', borderRadius: 2 },
  thumb: {
    position: 'absolute',
    width: 12, height: 12, borderRadius: 6,
    top: -4, marginLeft: -6,
  },
  durationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  durationText: { fontSize: 10, fontFamily: 'Poppins_400Regular' },
});
