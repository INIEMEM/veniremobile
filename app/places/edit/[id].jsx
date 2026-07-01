import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../../utils/axiosInstance';
import { useToast } from '../../../context/ToastContext';
import { PLACE_CATEGORIES } from '../../../constants/placesMockData';

const { width } = Dimensions.get('window');

const PRICE_RANGES = ['Free', '₦', '₦₦', '₦₦₦', '₦₦₦₦'];

export default function EditPlace() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  // Existing media from backend (already uploaded)
  const [existingMedia, setExistingMedia] = useState([]);
  // Newly picked local media to upload
  const [newMedia, setNewMedia] = useState([]);

  const [form, setForm] = useState({
    name: '',
    category: 'restaurant',
    description: '',
    address: '',
    city: '',
    priceRange: '₦₦',
    lat: '',
    long: '',
    tags: '',
  });

  // ── Fetch existing place data ─────────────────────────────
  useEffect(() => {
    const fetchPlace = async () => {
      try {
        const res = await api.get(`/place/key?key=_id&value=${id}`);
        if (res.data?.success) {
          const p = res.data.data;
          setForm({
            name: p.name || '',
            category: p.category || 'restaurant',
            description: p.description || '',
            address: p.address || '',
            city: p.city || '',
            priceRange: p.priceRange || '₦₦',
            lat: p.lat ? String(p.lat) : '',
            long: p.long ? String(p.long) : '',
            tags: Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags || ''),
          });
          setExistingMedia(p.media || []);
        }
      } catch (err) {
        console.error('Failed to load place:', err?.response?.data || err?.message);
        toast.error('Failed to load place details');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchPlace();
  }, [id]);

  const updateField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  // ── Pick new images/videos ────────────────────────────────
  const pickMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please allow access to your gallery.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      const picked = result.assets.map(a => ({
        uri: a.uri,
        type: a.type === 'video' ? 'video' : 'image',
        fileName: a.fileName || `media_${Date.now()}.jpg`,
        mimeType: a.mimeType || 'image/jpeg',
      }));
      setNewMedia(prev => [...prev, ...picked]);
    }
  };

  const removeExisting = (idx) => {
    setExistingMedia(prev => prev.filter((_, i) => i !== idx));
  };

  const removeNew = (idx) => {
    setNewMedia(prev => prev.filter((_, i) => i !== idx));
  };

  // ── Upload a single file to S3 ────────────────────────────
  const uploadToS3 = async (file) => {
    const token = await AsyncStorage.getItem('token');

    // 1. Get signed URL
    const signRes = await api.put(
      '/auth/sign-s3',
      { fileName: file.fileName, fileType: file.mimeType },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const { uploadURL } = signRes.data;

    // 2. Upload blob to S3
    const fileResponse = await fetch(file.uri);
    const blob = await fileResponse.blob();
    await fetch(uploadURL, {
      method: 'PUT',
      body: blob,
      headers: { 'Content-Type': file.mimeType },
    });

    // 3. Return clean URL (strip query params)
    return uploadURL.split('?')[0];
  };

  // ── Submit ────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Place name is required');
      return;
    }
    if (!form.description.trim()) {
      toast.error('Description is required');
      return;
    }
    if (!form.city.trim()) {
      toast.error('City is required');
      return;
    }

    setSubmitting(true);
    try {
      // Upload any new media files
      const uploadedMedia = [...existingMedia]; // keep existing
      for (let i = 0; i < newMedia.length; i++) {
        const file = newMedia[i];
        setUploadProgress(`Uploading media ${i + 1} of ${newMedia.length}…`);
        const url = await uploadToS3(file);
        uploadedMedia.push({ type: file.type, uri: url });
      }
      setUploadProgress('Saving changes…');

      const token = await AsyncStorage.getItem('token');

      const payload = {
        name: form.name.trim(),
        category: form.category,
        description: form.description.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        priceRange: form.priceRange,
        lat: form.lat.trim(),
        long: form.long.trim(),
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        media: uploadedMedia,
      };

      await api.put(`/place/${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success('Place updated successfully! ✅');
      router.back();
    } catch (err) {
      console.error('Error updating place:', err?.response?.data || err?.message);
      toast.error(err?.response?.data?.message || 'Failed to update place');
    } finally {
      setSubmitting(false);
      setUploadProgress('');
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D0D0D' }}>
        <ActivityIndicator size="large" color="#5A31F4" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Place</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

        {/* ── Name ── */}
        <Text style={styles.label}>Place Name *</Text>
        <TextInput
          style={styles.input}
          value={form.name}
          onChangeText={v => updateField('name', v)}
          placeholder="e.g. Nok by Alara"
          placeholderTextColor="#555"
        />

        {/* ── Category ── */}
        <Text style={styles.label}>Category *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {PLACE_CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.key}
              style={[styles.categoryChip, form.category === cat.key && styles.categoryChipActive]}
              onPress={() => updateField('category', cat.key)}
            >
              <Text style={[styles.categoryChipText, form.category === cat.key && styles.categoryChipTextActive]}>
                {cat.emoji} {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Description ── */}
        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={form.description}
          onChangeText={v => updateField('description', v)}
          placeholder="Tell people what makes this place special…"
          placeholderTextColor="#555"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* ── Address & City ── */}
        <Text style={styles.label}>Address</Text>
        <TextInput
          style={styles.input}
          value={form.address}
          onChangeText={v => updateField('address', v)}
          placeholder="Street address"
          placeholderTextColor="#555"
        />

        <Text style={styles.label}>City *</Text>
        <TextInput
          style={styles.input}
          value={form.city}
          onChangeText={v => updateField('city', v)}
          placeholder="e.g. Lagos"
          placeholderTextColor="#555"
        />

        {/* ── Price Range ── */}
        <Text style={styles.label}>Price Range</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {PRICE_RANGES.map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.categoryChip, form.priceRange === p && styles.categoryChipActive]}
              onPress={() => updateField('priceRange', p)}
            >
              <Text style={[styles.categoryChipText, form.priceRange === p && styles.categoryChipTextActive]}>
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Coordinates ── */}
        <Text style={styles.label}>Coordinates (optional)</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 8 }]}
            value={form.lat}
            onChangeText={v => updateField('lat', v)}
            placeholder="Latitude"
            placeholderTextColor="#555"
            keyboardType="decimal-pad"
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={form.long}
            onChangeText={v => updateField('long', v)}
            placeholder="Longitude"
            placeholderTextColor="#555"
            keyboardType="decimal-pad"
          />
        </View>

        {/* ── Tags ── */}
        <Text style={styles.label}>Tags (comma-separated)</Text>
        <TextInput
          style={styles.input}
          value={form.tags}
          onChangeText={v => updateField('tags', v)}
          placeholder="e.g. rooftop, cocktails, date night"
          placeholderTextColor="#555"
        />

        {/* ── Media ── */}
        <Text style={styles.label}>Photos & Videos</Text>

        {/* Existing media */}
        {existingMedia.length > 0 && (
          <>
            <Text style={styles.sublabel}>Existing media (tap × to remove)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaRow}>
              {existingMedia.map((m, i) => (
                <View key={i} style={styles.mediaThumbnailWrap}>
                  <Image source={{ uri: m.uri }} style={styles.mediaThumbnail} />
                  <TouchableOpacity style={styles.removeBtn} onPress={() => removeExisting(i)}>
                    <Ionicons name="close-circle" size={22} color="#FF3B30" />
                  </TouchableOpacity>
                  {m.type === 'video' && (
                    <View style={styles.videoOverlay}>
                      <Ionicons name="play-circle" size={28} color="#FFF" />
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </>
        )}

        {/* New media */}
        {newMedia.length > 0 && (
          <>
            <Text style={styles.sublabel}>New media to upload</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaRow}>
              {newMedia.map((m, i) => (
                <View key={i} style={styles.mediaThumbnailWrap}>
                  <Image source={{ uri: m.uri }} style={styles.mediaThumbnail} />
                  <TouchableOpacity style={styles.removeBtn} onPress={() => removeNew(i)}>
                    <Ionicons name="close-circle" size={22} color="#FF3B30" />
                  </TouchableOpacity>
                  {m.type === 'video' && (
                    <View style={styles.videoOverlay}>
                      <Ionicons name="play-circle" size={28} color="#FFF" />
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </>
        )}

        <TouchableOpacity style={styles.addMediaBtn} onPress={pickMedia}>
          <Ionicons name="add-circle-outline" size={20} color="#5A31F4" />
          <Text style={styles.addMediaText}>Add Photos / Videos</Text>
        </TouchableOpacity>

        {/* ── Submit ── */}
        {uploadProgress ? (
          <View style={styles.progressWrap}>
            <ActivityIndicator size="small" color="#5A31F4" />
            <Text style={styles.progressText}>{uploadProgress}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
              <Text style={styles.submitText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#0D0D0D',
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFF',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: '#AAA',
    marginBottom: 8,
    marginTop: 18,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sublabel: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: '#666',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    color: '#FFF',
  },
  textarea: {
    minHeight: 110,
    paddingTop: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipScroll: {
    flexGrow: 0,
    marginBottom: 4,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#5A31F4',
    borderColor: '#5A31F4',
  },
  categoryChipText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: '#AAA',
  },
  categoryChipTextActive: {
    color: '#FFF',
  },
  mediaRow: {
    flexGrow: 0,
    marginBottom: 8,
  },
  mediaThumbnailWrap: {
    width: 90,
    height: 90,
    borderRadius: 12,
    marginRight: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  mediaThumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: '#222',
  },
  removeBtn: {
    position: 'absolute',
    top: 3,
    right: 3,
    backgroundColor: '#000',
    borderRadius: 11,
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  addMediaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#5A31F4',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    justifyContent: 'center',
  },
  addMediaText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: '#5A31F4',
  },
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    padding: 12,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
  },
  progressText: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: '#AAA',
  },
  submitBtn: {
    marginTop: 28,
    backgroundColor: '#5A31F4',
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#5A31F4',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFF',
  },
});
