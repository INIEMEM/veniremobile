import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
  Switch,
  Image,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Toast from 'react-native-toast-message';
import api from '../../../utils/axiosInstance';
import CustomLoader from '../../../components/CustomFormLoader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';
import { useToast } from '../../../context/ToastContext';
const { width, height } = Dimensions.get('window');

export default function EditEvent() {
  const router = useRouter();
  const { id , isDraft} = useLocalSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [existingVideos, setExistingVideos] = useState([]);
  const [uploadProgress, setUploadProgress] = useState('');
  

  const toast = useToast();
  const [form, setForm] = useState({
    name: '',
    description: '',
    address: '',
    lat: '',
    long: '',
    capacity: '',
    isTicket: false,
    ticketAmount: '0',
    isSponsored: false,
    sponsorAmount: '0',
    startDay: '',
    startMonth: '',
    startYear: '',
    startHour: '',
    startMinute: '',
    endDay: '',
    endMonth: '',
    endYear: '',
    endHour: '',
    endMinute: '',
    categoryId: '',
    isOrganizer: false,
    isHost: false,
  });

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (id) {
      fetchEventDetails();
      fetchCategories();
    }

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [id]);

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      
      const endpoint = isDraft 
        ? `/event/draft/key?key=_id&value=${id}`
        : `/event/key?key=_id&value=${id}`;

      const response = await api.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success && response.data.data.length > 0) {
        const event = response.data.data[0];
        
        // Parse start date
        const startDate = new Date(event.start);
        let startDateFields = {
          startDay: '',
          startMonth: '',
          startYear: '',
          startHour: '',
          startMinute: '',
        }
        let endDateFields = {
          endDay: '',
          endMonth: '',
          endYear: '',
          endHour: '',
          endMinute: '',
        };
        
        if (event.end) {
          const endDate = new Date(event.end);
          endDateFields = {
            endDay: endDate.getDate().toString().padStart(2, '0'),
            endMonth: (endDate.getMonth() + 1).toString().padStart(2, '0'),
            endYear: endDate.getFullYear().toString(),
            endHour: endDate.getHours().toString().padStart(2, '0'),
            endMinute: endDate.getMinutes().toString().padStart(2, '0'),
          };
        } 
        if(event.start) {
          startDateFields = {
            startDay: startDate.getDate().toString().padStart(2, '0'),
            startMonth: (startDate.getMonth() + 1).toString().padStart(2, '0'),
            startYear: startDate.getFullYear().toString(),
            startHour: startDate.getHours().toString().padStart(2, '0'),
            startMinute: startDate.getMinutes().toString().padStart(2, '0'),
          };
        }
        setForm({
          name: event.name || '',
          description: event.description || '',
          address: event.address || '',
          lat: event.lat?.toString() || '',
          long: event.long?.toString() || '',
          capacity: event.capacity?.toString() || '',
          isTicket: event.isTicket || false,
          ticketAmount: event.ticketAmount?.toString() || '0',
          isSponsored: event.isSponsored || false,
          sponsorAmount: event.sponsorAmount?.toString() || '0',
          ...startDateFields,
          ...endDateFields,
          categoryId: event.categoryId?._id || event.categoryId || '',
        });

        // Set existing images and videos
        if (event.images && event.images.length > 0) {
          setExistingImages(event.images);
        }
        if (event.videos && event.videos.length > 0) {
          setExistingVideos(event.videos);
        }
      }
    } catch (error) { 
      console.error('Error fetching event details:', error);
      toast.error(error.response?.data?.error || 'Failed to load event. Please try again.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await api.get('/category', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCategories(response.data.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const pickMedia = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5,
        videoMaxDuration: 60,
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
      });

      if (!result.canceled && result.assets) {
        const newMedia = result.assets.map((asset) => {
          let mimeType = 'application/octet-stream';
          if (asset.type === 'video') {
            mimeType = asset.uri.toLowerCase().endsWith('.mov') ? 'video/quicktime' : 'video/mp4';
          } else {
            mimeType = 'image/jpeg';
          }

          return {
            uri: asset.uri,
            type: asset.type === 'video' ? 'video' : 'image',
            mimeType: mimeType,
            name: asset.fileName || `event_${asset.type}_${Date.now()}.${asset.type === 'video' ? 'mp4' : 'jpg'}`,
            fileSize: asset.fileSize,
          };
        });

        // Check file sizes
        const oversizedFiles = newMedia.filter(m => m.fileSize && m.fileSize > 50 * 1024 * 1024);
        if (oversizedFiles.length > 0) {
          toast.error('Please select videos smaller than 50MB');
          return;
        }

        setSelectedMedia([...selectedMedia, ...newMedia]);
      }
    } catch (error) {
      console.error('Error picking media:', error);
      toast.error('Failed to pick media. Please try again.');
    }
  };

  const removeMedia = (index) => {
    const updatedMedia = selectedMedia.filter((_, i) => i !== index);
    setSelectedMedia(updatedMedia);
  };

  const removeExistingImage = (index) => {
    const updatedImages = existingImages.filter((_, i) => i !== index);
    setExistingImages(updatedImages);
  };

  const removeExistingVideo = (index) => {
    const updatedVideos = existingVideos.filter((_, i) => i !== index);
    setExistingVideos(updatedVideos);
  };

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const getSignedUrl = async (fileName, fileType) => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      console.log('Requesting signed URL with:');
      console.log('  fileName:', fileName);
      console.log('  fileType:', fileType);
     
      const response = await api.put(
        '/auth/sign-s3',
        { fileName, fileType },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
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

  const uploadNewMedia = async () => {
    const uploadedImages = [];
    const uploadedVideos = [];

    for (let i = 0; i < selectedMedia.length; i++) {
      const media = selectedMedia[i];
      const sizeInMB = media.fileSize ? (media.fileSize / (1024 * 1024)).toFixed(2) : 'unknown';
      setUploadProgress(`Uploading ${media.type} ${i + 1}/${selectedMedia.length} (${sizeInMB}MB)...`);

      try {
        const signedData = await getSignedUrl(media.name, media.mimeType);
        const { uploadURL } = signedData;
      
        await uploadMediaToS3(media.uri, uploadURL, media.mimeType);
        const mediaUrl = uploadURL.split('?')[0];
        
        if (media.type === 'video') {
          uploadedVideos.push(mediaUrl);
        } else {
          uploadedImages.push(mediaUrl);
        }
      } catch (error) {
        console.error(`Error uploading ${media.type} ${i + 1}:`, error);
        throw new Error(`Failed to upload ${media.type} ${i + 1}`);
      }
    }

    setUploadProgress('');
    return { images: uploadedImages, videos: uploadedVideos };
  };

  const handleUpdateEvent = async () => {
    const { name, description, address, capacity, categoryId, isTicket, ticketAmount, isSponsored, sponsorAmount } = form;

    // Validation
    if (!name.trim()) {
      return toast.error('Event name is required');
    }

    if (!description.trim()) {
      return toast.error('Event description is required');
    }

    if (!address.trim()) {
      return toast.error('Event address is required');
    }

    if (!capacity || parseInt(capacity) <= 0) {
      return toast.error('Please enter a valid capacity');
    }

    if (!categoryId) {
      return  toast.error('Please select a category');
    }

    try {
      setIsSubmitting(true);

      // Upload new media if any
      let newImages = [];
      let newVideos = [];
      if (selectedMedia.length > 0) {
        setUploadProgress('Uploading new media...');
        const uploaded = await uploadNewMedia();
        newImages = uploaded.images;
        newVideos = uploaded.videos;
      }

      // Combine existing and new media
      const allImages = [...existingImages, ...newImages];
      const allVideos = [...existingVideos, ...newVideos];

      setUploadProgress('Updating event...');
      const token = await AsyncStorage.getItem('token');
      
      const startDate = new Date(
        `${form.startYear}-${form.startMonth}-${form.startDay}T${form.startHour}:${form.startMinute}:00.000Z`
      );
      let endDate = null;
      if (form.endYear && form.endMonth && form.endDay) {
        endDate = new Date(
          `${form.endYear}-${form.endMonth?.padStart(2, '0')}-${form.endDay?.padStart(2, '0')}T${form.endHour?.padStart(2, '0') || '00'}:${form.endMinute?.padStart(2, '0') || '00'}:00.000Z`
        );

        if (isNaN(endDate.getTime())) {
          return toast.error('Invalid end date. Please check your input.');
        }
      }
     
      const eventData = {
        name: name.trim(),
        description: description.trim(),
        address: address.trim(),
        lat: form.lat || '0',
        long: form.long || '0',
        capacity: capacity,
        isTicket: isTicket,
        ticketAmount: isTicket ? parseFloat(ticketAmount) || 0 : 0,
        isSponsored: isSponsored,
        sponsorAmount: isSponsored ? parseFloat(sponsorAmount) || 0 : 0,
        start: startDate.toISOString(),
        ...(endDate && { end: endDate.toISOString() }),
        categoryId: typeof categoryId === 'object' ? categoryId._id : categoryId,
        type: allVideos.length > 0 ? 'videos' : 'images',
        ...(allImages.length > 0 && { images: allImages }),
        ...(allVideos.length > 0 && { videos: allVideos }),
        ...(form.isOrganizer && {isOrganizer: form.isOrganizer}),
        ...(form.isHost &&  {isHost: form.isHost}),
      };

      const response = await api.put(`/event/${id}`, eventData, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      toast.success('Event updated successfully');
      router.back();
    } catch (error) {
      console.error('Error updating event:', error.response || error);
      const message =
        error.response?.data?.error ||
        error.message ||
        'Failed to update event. Please try again.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
      setUploadProgress('');
    }
  };
  const handleSaveToDraft = async () => {
    const {
      name,
      description,
      address,
      capacity,
      categoryId,
      isTicket,
      ticketAmount,
      isSponsored,
      sponsorAmount,
    } = form;

    // Minimal validation for draft
    if (!name.trim()) {
      return Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Event name is required',
      });
    }

    if (!address.trim()) {
      return Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Event address is required',
      });
    }

    if (!categoryId) {
      return Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please select an event category',
      });
    }

    try {
      setIsSubmitting(true);

      const token = await AsyncStorage.getItem('token');
      let startDate = null;
      const isValidDateInput = (year, month, day) => {
        return (
          year && month && day &&
          !isNaN(parseInt(year)) &&
          !isNaN(parseInt(month)) &&
          !isNaN(parseInt(day))
        );
      };
        if (isValidDateInput(form.startYear, form.startMonth, form.startDay)) {
          startDate = new Date(
            `${form.startYear}-${form.startMonth.padStart(2, '0')}-${form.startDay.padStart(2, '0')}T${form.startHour?.padStart(2, '0') || '00'}:${form.startMinute?.padStart(2, '0') || '00'}:00.000Z`
          );

          if (isNaN(startDate.getTime())) {
            return Toast.show({
              type: 'error',
              text1: 'Invalid Start Date',
              text2: 'Please check your start date inputs',
            });
          }
        }

      let endDate = null;
      if (form.endYear && form.endMonth && form.endDay) {
        endDate = new Date(
          `${form.endYear}-${form.endMonth?.padStart(2, '0')}-${form.endDay?.padStart(2, '0')}T${form.endHour?.padStart(2, '0') || '00'}:${form.endMinute?.padStart(2, '0') || '00'}:00.000Z`
        );

        if (isNaN(endDate.getTime())) {
          return Toast.show({
            type: 'error',
            text1: 'Invalid Date',
            text2: 'Please check your end date',
          });
        }
      }
      const { images: uploadedImages, videos: uploadedVideos } = await uploadAllMedia();

      // Prepare draft data (no media upload required for draft)
      const draftData = {
        name: name.trim(),
        ...(description && {description: description.trim()}),
        ...(address && { address: address.trim()}),
        ...(form.lat && {lat: form.lat || '0'}),
        ...(form.long && {long: form.long || '0'}),
        ...(capacity && {capacity: capacity}),
        ...(isTicket && {isTicket: isTicket}),
        ...(ticketAmount && {ticketAmount: isTicket ? parseFloat(ticketAmount) || 0 : 0}),
        ...(isSponsored && {isSponsored: isSponsored}),
        ...(sponsorAmount && {sponsorAmount: isSponsored ? parseFloat(sponsorAmount) || 0 : 0}),
        ...(startDate && { start: startDate.toISOString()}),
        ...(startDate && !isNaN(startDate.getTime()) && { start: startDate.toISOString() }),
        categoryId: categoryId,
       ...(uploadedVideos &&  {type: uploadedVideos.length > 0 ? 'videos' : 'images'}),
        ...(uploadedImages.length > 0 && { images: uploadedImages }),
        ...(uploadedVideos.length > 0 && { videos: uploadedVideos }),
        ...(form.isOrganizer && {isOrganizer: form.isOrganizer}),
        ...(form.isHost &&  {isHost: form.isHost}),

      };

      console.log('Saving draft:', draftData);

      const response = await api.post('/event/draft', draftData, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      Toast.show({
        type: 'success',
        text1: 'Draft Saved! 📝',
        text2: 'Your event has been saved as draft',
      });
      // toast.success('Your event has been saved as draft');

      router.back();
    } catch (error) {
      console.error('Error saving draft:', error.response || error);
      const message =
        error.response?.data?.error ||
        error.message ||
        'Failed to save draft. Please try again.';
      Toast.show({
        type: 'error',
        text1: 'Save Failed',
        text2: message,
      });
      // toast.error(message);
      // error('Something went wrong!');

    } finally {
      setIsSubmitting(false);
    }
  };
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5A31F4" />
        <Text style={styles.loadingText}>Loading event details...</Text>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {isSubmitting && <CustomLoader />}

        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.formContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Text style={styles.backText}>←</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Edit Event</Text>
              <View style={styles.placeholder} />
            </View>

            {/* Upload Progress */}
            {uploadProgress !== '' && (
              <View style={styles.progressContainer}>
                <Text style={styles.progressText}>{uploadProgress}</Text>
              </View>
            )}

            {/* Existing Event Images */}
            {existingImages.length > 0 && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Current Images</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.imagePreviewContainer}
                >
                  {existingImages.map((imageUrl, index) => (
                    <View key={index} style={styles.imagePreviewWrapper}>
                      <Image source={{ uri: imageUrl }} style={styles.imagePreview} />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => removeExistingImage(index)}
                      >
                        <Text style={styles.removeImageText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Existing Event Videos */}
            {existingVideos.length > 0 && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Current Videos</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.imagePreviewContainer}
                >
                  {existingVideos.map((videoUrl, index) => (
                    <View key={index} style={styles.imagePreviewWrapper}>
                      <Video
                        source={{ uri: videoUrl }}
                        style={styles.imagePreview}
                        useNativeControls={false}
                        resizeMode="cover"
                        shouldPlay={false}
                      />
                      <View style={styles.videoOverlay}>
                        <Text style={styles.videoIcon}>▶️</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => removeExistingVideo(index)}
                      >
                        <Text style={styles.removeImageText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* New Event Media */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Add New Media (Optional)</Text>
              <TouchableOpacity style={styles.imagePickerButton} onPress={pickMedia}>
                <Text style={styles.imagePickerIcon}>🎬</Text>
                <Text style={styles.imagePickerText}>
                  {selectedMedia.length > 0
                    ? `${selectedMedia.length} file(s) selected`
                    : 'Add Images or Videos'}
                </Text>
                <Text style={styles.imagePickerSubtext}>
                  Images and videos up to 60 seconds
                </Text>
              </TouchableOpacity>

              {selectedMedia.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.imagePreviewContainer}
                >
                  {selectedMedia.map((media, index) => (
                    <View key={index} style={styles.imagePreviewWrapper}>
                      {media.type === 'video' ? (
                        <View>
                          <Video
                            source={{ uri: media.uri }}
                            style={styles.imagePreview}
                            useNativeControls={false}
                            resizeMode="cover"
                            shouldPlay={false}
                          />
                          <View style={styles.videoOverlay}>
                            <Text style={styles.videoIcon}>▶️</Text>
                          </View>
                        </View>
                      ) : (
                        <Image source={{ uri: media.uri }} style={styles.imagePreview} />
                      )}
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => removeMedia(index)}
                      >
                        <Text style={styles.removeImageText}>×</Text>
                      </TouchableOpacity>
                      <View style={styles.mediaTypeBadge}>
                        <Text style={styles.mediaTypeText}>
                          {media.type === 'video' ? '🎥' : '📷'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Event Name */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Event Name *</Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(text) => handleChange('name', text)}
                placeholder="e.g., Birthday Party at Cresent Estate"
                placeholderTextColor="#999"
              />
            </View>

            {/* Description */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.description}
                onChangeText={(text) => handleChange('description', text)}
                placeholder="Tell people about your event..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              
            </View>

            {/* Address */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Address *</Text>
              <TextInput
                style={styles.input}
                value={form.address}
                onChangeText={(text) => handleChange('address', text)}
                placeholder="e.g., Montana Resort - Lekki Phase 1"
                placeholderTextColor="#999"
              />
            </View>

            {/* Location Coordinates */}
            <View style={styles.row}>
              <View style={styles.halfInputContainer}>
                <Text style={styles.label}>Latitude *</Text>
                <TextInput
                  style={styles.input}
                  value={form.lat}
                  onChangeText={(text) => handleChange('lat', text)}
                  placeholder="0.0"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.halfInputContainer}>
                <Text style={styles.label}>Longitude *</Text>
                <TextInput
                  style={styles.input}
                  value={form.long}
                  onChangeText={(text) => handleChange('long', text)}
                  placeholder="0.0"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Capacity */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>How many people would be attending this event  *</Text>
              <TextInput
                style={styles.input}
                value={form.capacity}
                onChangeText={(text) => handleChange('capacity', text)}
                placeholder="e.g., 2000"
                placeholderTextColor="#999"
                keyboardType="number-pad"
              />
            </View>

            {/* Category */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Category *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryScroll}
              >
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category._id}
                    style={[
                      styles.categoryChip,
                      form.categoryId === category._id && styles.categoryChipActive,
                    ]}
                    onPress={() => handleChange('categoryId', category._id)}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        form.categoryId === category._id && styles.categoryTextActive,
                      ]}
                    >
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Start Date & Time */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Start Date & Time *</Text>
              <View style={styles.dateTimeRow}>
                <TextInput
                  style={[styles.dateTimeInput, { flex: 1 }]}
                  placeholder="DD"
                  value={form.startDay}
                  maxLength={2}
                  keyboardType="number-pad"
                  onChangeText={(day) => handleChange('startDay', day)}
                />
                <TextInput
                  style={[styles.dateTimeInput, { flex: 1 }]}
                  placeholder="MM"
                  value={form.startMonth}
                  maxLength={2}
                  keyboardType="number-pad"
                  onChangeText={(month) => handleChange('startMonth', month)}
                />
                <TextInput
                  style={[styles.dateTimeInput, { flex: 2 }]}
                  placeholder="YYYY"
                  value={form.startYear}
                  maxLength={4}
                  keyboardType="number-pad"
                  onChangeText={(year) => handleChange('startYear', year)}
                />
                <TextInput
                  style={[styles.dateTimeInput, { flex: 1 }]}
                  placeholder="HH"
                  value={form.startHour}
                  maxLength={2}
                  keyboardType="number-pad"
                  onChangeText={(hour) => handleChange('startHour', hour)}
                />
                <TextInput
                  style={[styles.dateTimeInput, { flex: 1 }]}
                  placeholder="MM"
                  value={form.startMinute}
                  maxLength={2}
                  keyboardType="number-pad"
                  onChangeText={(minute) => handleChange('startMinute', minute)}
                />
              </View>
            </View>

            {/* End Date & Time */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>End Date & Time </Text>
              <View style={styles.dateTimeRow}>
                <TextInput
                  style={[styles.dateTimeInput, { flex: 1 }]}
                  placeholder="DD"
                  value={form.endDay}
                  maxLength={2}
                  keyboardType="number-pad"
                  onChangeText={(day) => handleChange('endDay', day)}
                />
                <TextInput
                  style={[styles.dateTimeInput, { flex: 1 }]}
                  placeholder="MM"
                  value={form.endMonth}
                  maxLength={2}
                  keyboardType="number-pad"
                  onChangeText={(month) => handleChange('endMonth', month)}
                />
                <TextInput
                  style={[styles.dateTimeInput, { flex: 2 }]}
                  placeholder="YYYY"
                  value={form.endYear}
                  maxLength={4}
                  keyboardType="number-pad"
                  onChangeText={(year) => handleChange('endYear', year)}
                />
                <TextInput
                  style={[styles.dateTimeInput, { flex: 1 }]}
                  placeholder="HH"
                  value={form.endHour}
                  maxLength={2}
                  keyboardType="number-pad"
                  onChangeText={(hour) => handleChange('endHour', hour)}
                />
                <TextInput
                  style={[styles.dateTimeInput, { flex: 1 }]}
                  placeholder="MM"
                  value={form.endMinute}
                  maxLength={2}
                  keyboardType="number-pad"
                  onChangeText={(minute) => handleChange('endMinute', minute)}
                />
              </View>
            </View>

            {/* Ticketing */}
            <View style={styles.switchContainer}>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Is this a ticketed event?</Text>
                <Switch
                  value={form.isTicket}
                  onValueChange={(value) => handleChange('isTicket', value)}
                  trackColor={{ false: '#ccc', true: '#5A31F4' }}
                  thumbColor="#fff"
                />
              </View>
              {form.isTicket && (
                <TextInput
                  style={styles.input}
                  value={form.ticketAmount}
                  onChangeText={(text) => handleChange('ticketAmount', text)}
                  placeholder="Ticket price"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                />
              )}
            </View>

            {/* Sponsorship */}
            <View style={styles.switchContainer}>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Is this event sponsored?</Text>
                <Switch
                  value={form.isSponsored}
                  onValueChange={(value) => handleChange('isSponsored', value)}
                  trackColor={{ false: '#ccc', true: '#5A31F4' }}
                  thumbColor="#fff"
                />
              </View>
              {form.isSponsored && (
                <TextInput
                  style={styles.input}
                  value={form.sponsorAmount}
                  onChangeText={(text) => handleChange('sponsorAmount', text)}
                  placeholder="Sponsorship amount"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                />
              )}
            </View>
               {/* Organizer */}
          <View style={styles.switchContainer}>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Are you the organizer?</Text>
              <Switch
                value={form.isOrganizer}
                onValueChange={(value) => handleChange('isOrganizer', value)}
                trackColor={{ false: '#ccc', true: '#5A31F4' }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* Host */}
          <View style={styles.switchContainer}>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Are you the host?</Text>
              <Switch
                value={form.isHost}
                onValueChange={(value) => handleChange('isHost', value)}
                trackColor={{ false: '#ccc', true: '#5A31F4' }}
                thumbColor="#fff"
              />
            </View>
          </View>
          <View style={styles.buttonContainer}>
          <TouchableOpacity
              style={styles.draftButton}
              onPress={handleSaveToDraft}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <Text style={styles.draftButtonText}>
                {isSubmitting ? 'Saving...' : '📝 Save to Draft'}
              </Text>
            </TouchableOpacity>
               {/* Update Button */}
            <TouchableOpacity
              style={styles.createButton}
              onPress={handleUpdateEvent}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <Text style={styles.createButtonText}>
                {isSubmitting ? 'Updating...' : 'Update Event'}
              </Text>
            </TouchableOpacity>
          </View>
           
          </Animated.View>
        </ScrollView>
       
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  draftButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#5A31F4',
    borderRadius: 12,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  draftButtonText: {
    color: '#5A31F4',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  loadingText: {
    marginTop: 10,
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: '#666',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  formContainer: {
    paddingHorizontal: width * 0.04,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backText: {
    fontSize: 28,
    color: '#333',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    fontFamily: 'Poppins_600SemiBold',
  },
  placeholder: {
    width: 40,
  },
  progressContainer: {
    backgroundColor: '#f0f0ff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#5A31F4',
  },
  progressText: {
    fontSize: 14,
    color: '#5A31F4',
    fontFamily: 'Poppins_500Medium',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#444',
    marginBottom: 8,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#333',
    fontFamily: 'Poppins_400Regular',
    backgroundColor: '#fafafa',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  imagePickerButton: {
    borderWidth: 2,
    borderColor: '#5A31F4',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 24,
    alignItems: 'center',
    backgroundColor: '#f9f7ff',
  },
  imagePickerIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  imagePickerText: {
    fontSize: 14,
    color: '#5A31F4',
    fontFamily: 'Poppins_500Medium',
  },
  imagePickerSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    fontFamily: 'Poppins_400Regular',
  },
  imagePreviewContainer: {
    marginTop: 12,
  },
  imagePreviewWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
  },
  videoIcon: {
    fontSize: 32,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ff4444',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: -2,
  },
  mediaTypeBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mediaTypeText: {
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  halfInputContainer: {
    flex: 1,
    marginBottom: 20,
  },
  categoryScroll: {
    marginTop: 8,
  },
  categoryChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
  },
  categoryChipActive: {
    backgroundColor: '#5A31F4',
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Poppins_400Regular',
  },
  categoryTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  switchContainer: {
    marginBottom: 20,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  switchLabel: {
    fontSize: 14,
    color: '#444',
    fontFamily: 'Poppins_500Medium',
    flex: 1,
  },
  createButton: {
    backgroundColor: '#5A31F4',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    elevation: 4,
    shadowColor: '#5A31F4',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Poppins_600SemiBold',
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  dateTimeInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingVertical: 10,
    textAlign: 'center',
    backgroundColor: '#fafafa',
    fontSize: 15,
    color: '#333',
    fontFamily: 'Poppins_400Regular',
  },
});