import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { PLACE_CATEGORIES } from "../constants/placesMockData";
import { useToast } from "../context/ToastContext";
import api from "../utils/axiosInstance";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");

const PRICE_RANGES = ["₦", "₦₦", "₦₦₦", "₦₦₦₦"];

export default function UploadPlaceModal({ visible, onClose, onSuccess }) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [media, setMedia] = useState([]); // array of { uri, type: "image"|"video" }
  const [name, setName] = useState("");
  const [category, setCategory] = useState("restaurant");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [rating, setRating] = useState(0);     // 1–5
  const [priceRange, setPriceRange] = useState("₦₦");
  const [tags, setTags] = useState("");         // comma-separated string
  const [categories, setCategories] = useState([]);

  React.useEffect(() => {
    if (visible) {
      api.get('/user/place/servicetype')
        .then(res => {
          if (res.data?.success) {
            setCategories(res.data.data);
            if (res.data.data.length > 0 && category === "restaurant") {
              setCategory(res.data.data[0]._id);
            }
          }
        })
        .catch(err => console.error("Error fetching categories:", err));
    }
  }, [visible]);

  const resetForm = () => {
    setMedia([]);
    setName("");
    setCategory("restaurant");
    setAddress("");
    setCity("");
    setDescription("");
    setRating(0);
    setPriceRange("₦₦");
    setTags("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // ── Media picker ─────────────────────────────────────────
  const pickMedia = async () => {
    if (media.length >= 5) {
      Alert.alert("Max 5 files", "You can upload up to 5 photos or videos per place.");
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow access to your photo library in Settings.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      selectionLimit: 5 - media.length,
      quality: 0.85,
      videoMaxDuration: 60,
    });

    if (!result.canceled && result.assets?.length > 0) {
      const newItems = result.assets.map((a) => ({
        uri: a.uri,
        type: a.type === "video" ? "video" : "image",
        mimeType: a.mimeType,
        name: a.fileName,
      }));
      setMedia((prev) => [...prev, ...newItems].slice(0, 5));
    }
  };

  const removeMedia = (idx) => {
    setMedia((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── Validation ───────────────────────────────────────────
  const validate = () => {
    if (media.length === 0) { toast.error("Please add at least one photo or video."); return false; }
    if (!name.trim())        { toast.error("Please enter the place name.");            return false; }
    if (!address.trim())     { toast.error("Please enter the address.");               return false; }
    if (!city.trim())        { toast.error("Please enter the city.");                  return false; }
    if (!description.trim()) { toast.error("Please write a short description.");       return false; }
    if (rating === 0)        { toast.error("Please tap a star to rate this place.");   return false; }
    return true;
  };


  // ── S3 Upload Helpers ────────────────────────────────────
  const getSignedUrl = async (fileName, fileType) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await api.put(
        '/auth/sign-s3',
        { fileName, fileType },
        {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          timeout: 30000,
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error getting signed URL:', error);
      throw error;
    }
  };

  const uploadMediaToS3 = async (mediaUri, uploadURL, mimeType) => {
    try {
      const response = await fetch(mediaUri);
      const blob = await response.blob();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': mimeType },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload media to S3');
      }
      return true;
    } catch (error) {
      console.error('Error uploading to S3:', error);
      throw error;
    }
  };

  const uploadAllMedia = async () => {
    const uploadedMedia = [];

    for (let i = 0; i < media.length; i++) {
      const item = media[i];
      const mediaType = item.type === 'video' ? 'video' : 'image';
      let mimeType = item.mimeType || 'application/octet-stream';
      if (!item.mimeType && mediaType === 'video') {
        mimeType = item.uri.toLowerCase().endsWith('.mov') ? 'video/quicktime' : 'video/mp4';
      } else if (!item.mimeType) {
        mimeType = 'image/jpeg';
      }
      
      const name = item.name || `place_${mediaType}_${Date.now()}.${mediaType === 'video' ? 'mp4' : 'jpg'}`;

      try {
        const signedData = await getSignedUrl(name, mimeType);
        const { uploadURL } = signedData;
        await uploadMediaToS3(item.uri, uploadURL, mimeType);
        const mediaUrl = uploadURL.split('?')[0];
        
        uploadedMedia.push({
          uri: mediaUrl,
          type: mediaType
        });
      } catch (error) {
        throw new Error(`Failed to upload ${mediaType} ${i + 1}`);
      }
    }

    return uploadedMedia;
  };

  // ── Submit ───────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);

    try {
      // 1. Upload to S3
      const uploadedMedia = await uploadAllMedia();

      // 2. Prepare JSON payload
      const placeData = {
        name: name.trim(),
        category: category,
        description: description.trim(),
        address: address.trim(),
        city: city.trim(),
        rating: rating,
        priceRange: priceRange,
        tags: tags.split(",").map(t => t.trim()).filter(Boolean),
        media: uploadedMedia,
      };
      
      const token = await AsyncStorage.getItem("token");
      const res = await api.post("/place", placeData, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (res.data?.success) {
        toast.success("Your place has been shared! 📍");
        resetForm();
        onSuccess?.();
        onClose();
      } else {
        toast.error(res.data?.message || "Failed to upload place");
      }
    } catch (err) {
      console.error("Upload error:", err?.response?.data || err?.message || err);
      toast.error(err?.response?.data?.message || err?.response?.data?.error || err?.message || "Failed to upload. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ───────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            {/* Handle bar */}
            <View style={styles.handle} />

            {/* Header */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Share a Place</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* ── Media Picker ──────────────────────────── */}
              <View style={styles.section}>
                <Text style={styles.label}>Photos & Videos <Text style={styles.req}>*</Text></Text>
                <Text style={styles.hint}>Add up to 5 photos or videos of this place</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaRow}>
                  {/* Add button */}
                  {media.length < 5 && (
                    <TouchableOpacity style={styles.addMedia} onPress={pickMedia}>
                      <Ionicons name="camera-outline" size={28} color="#5A31F4" />
                      <Text style={styles.addMediaText}>Add</Text>
                    </TouchableOpacity>
                  )}
                  {/* Previews */}
                  {media.map((item, idx) => (
                    <View key={idx} style={styles.mediaThumb}>
                      <Image source={{ uri: item.uri }} style={styles.thumbImg} />
                      {item.type === "video" && (
                        <View style={styles.videoTag}>
                          <Ionicons name="videocam" size={10} color="#FFF" />
                        </View>
                      )}
                      <TouchableOpacity style={styles.removeMedia} onPress={() => removeMedia(idx)}>
                        <Ionicons name="close-circle" size={20} color="#FF3B30" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>

              {/* ── Category ──────────────────────────────── */}
              <View style={styles.section}>
                <Text style={styles.label}>Category <Text style={styles.req}>*</Text></Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.categoryRow}>
                    {categories.map((cat) => {
                      const uiMeta = PLACE_CATEGORIES.find(c => c.name === cat.name.toLowerCase()) || PLACE_CATEGORIES.find(c => c.name === "other");
                      return (
                        <TouchableOpacity
                          key={cat._id}
                          style={[
                            styles.catChip,
                            { backgroundColor: category === cat._id ? uiMeta.color : uiMeta.bg },
                          ]}
                          onPress={() => setCategory(cat._id)}
                        >
                          <Ionicons
                            name={uiMeta.icon}
                            size={14}
                            color={category === cat._id ? "#FFF" : uiMeta.color}
                          />
                          <Text
                            style={[
                              styles.catText,
                              { color: category === cat._id ? "#FFF" : uiMeta.color },
                            ]}
                          >
                            {cat.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              {/* ── Place Name ────────────────────────────── */}
              <View style={styles.section}>
                <Text style={styles.label}>Place / Venue Name <Text style={styles.req}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Nok by Alara, Lekki Conservation Centre…"
                  placeholderTextColor="#bbb"
                  value={name}
                  onChangeText={setName}
                  maxLength={80}
                />
              </View>

              {/* ── Address & City ────────────────────────── */}
              <View style={styles.row}>
                <View style={[styles.section, { flex: 1 }]}>
                  <Text style={styles.label}>Address <Text style={styles.req}>*</Text></Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Street address"
                    placeholderTextColor="#bbb"
                    value={address}
                    onChangeText={setAddress}
                  />
                </View>
                <View style={[styles.section, { width: 110, marginLeft: 10 }]}>
                  <Text style={styles.label}>City <Text style={styles.req}>*</Text></Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Lagos"
                    placeholderTextColor="#bbb"
                    value={city}
                    onChangeText={setCity}
                  />
                </View>
              </View>

              {/* ── Description ───────────────────────────── */}
              <View style={styles.section}>
                <Text style={styles.label}>Your Experience <Text style={styles.req}>*</Text></Text>
                <TextInput
                  style={[styles.input, styles.textarea]}
                  placeholder="Tell people what you loved about this place — the vibe, food, views, service…"
                  placeholderTextColor="#bbb"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  maxLength={400}
                />
                <Text style={styles.charCount}>{description.length}/400</Text>
              </View>

              {/* ── Rating ────────────────────────────────── */}
              <View style={styles.section}>
                <Text style={styles.label}>Your Rating <Text style={styles.req}>*</Text></Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setRating(star)} style={styles.starBtn}>
                      <Text style={[styles.starIcon, { color: star <= rating ? "#FAB843" : "#DDD" }]}>
                        ★
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {rating > 0 && (
                    <Text style={styles.ratingLabel}>
                      {["", "Poor", "Fair", "Good", "Great", "Excellent"][rating]}
                    </Text>
                  )}
                </View>
              </View>

              {/* ── Price Range ───────────────────────────── */}
              <View style={styles.section}>
                <Text style={styles.label}>Price Range</Text>
                <View style={styles.priceRow}>
                  {PRICE_RANGES.map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[styles.priceChip, priceRange === p && styles.priceChipActive]}
                      onPress={() => setPriceRange(p)}
                    >
                      <Text style={[styles.priceChipText, priceRange === p && styles.priceChipTextActive]}>
                        {p}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* ── Tags ──────────────────────────────────── */}
              <View style={styles.section}>
                <Text style={styles.label}>Tags <Text style={styles.optional}>(optional)</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="date night, rooftop, seafood (comma separated)"
                  placeholderTextColor="#bbb"
                  value={tags}
                  onChangeText={setTags}
                  maxLength={120}
                />
              </View>

              {/* Spacer for keyboard */}
              <View style={{ height: 20 }} />
            </ScrollView>

            {/* ── Submit ────────────────────────────────── */}
            <View style={styles.submitWrap}>
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
                    <Ionicons name="location-outline" size={18} color="#FFF" />
                    <Text style={styles.submitText}>Share this Place</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 0,
    maxHeight: "94%",
  },
  handle: {
    width: 40, height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  sheetTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 20,
    color: "#1A1A1A",
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },

  section: { marginBottom: 18 },
  row: { flexDirection: "row", alignItems: "flex-start" },

  label: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#1A1A1A",
    marginBottom: 8,
  },
  req: { color: "#FF3B30" },
  optional: { color: "#999", fontFamily: "Poppins_400Regular" },
  hint: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "#999",
    marginBottom: 10,
    marginTop: -4,
  },

  // Media picker
  mediaRow: { flexDirection: "row" },
  addMedia: {
    width: 80, height: 80,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#5A31F4",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    backgroundColor: "#F8F4FF",
  },
  addMediaText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: "#5A31F4",
    marginTop: 4,
  },
  mediaThumb: {
    width: 80, height: 80,
    borderRadius: 12,
    marginRight: 10,
    overflow: "visible",
    position: "relative",
  },
  thumbImg: {
    width: 80, height: 80,
    borderRadius: 12,
  },
  videoTag: {
    position: "absolute",
    bottom: 5, left: 5,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 8,
    padding: 3,
  },
  removeMedia: {
    position: "absolute",
    top: -6, right: -6,
  },

  // Category chips
  categoryRow: {
    flexDirection: "row",
    gap: 8,
  },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  catChipText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
  },

  // Inputs
  input: {
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: "#1A1A1A",
    backgroundColor: "#FAFAFA",
  },
  textarea: {
    height: 100,
    textAlignVertical: "top",
  },
  charCount: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "#999",
    textAlign: "right",
    marginTop: 4,
  },

  // Rating stars
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  starBtn: { padding: 4 },
  starIcon: { fontSize: 32 },
  ratingLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#FAB843",
    marginLeft: 8,
  },

  // Price range
  priceRow: {
    flexDirection: "row",
    gap: 10,
  },
  priceChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
  },
  priceChipActive: {
    backgroundColor: "#FAB843",
    borderColor: "#FAB843",
  },
  priceChipText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 14,
    color: "#999",
  },
  priceChipTextActive: {
    color: "#FFF",
  },

  // Submit
  submitWrap: {
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    backgroundColor: "#FFF",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#5A31F4",
    borderRadius: 16,
    paddingVertical: 16,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 15,
    color: "#FFF",
  },
});
