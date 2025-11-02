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
  Keyboard
} from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import api from '../../utils/axiosInstance';
import CustomLoader from '../../components/CustomFormLoader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';

const { width, height } = Dimensions.get('window');

export default function CreateEvent() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [uploadProgress, setUploadProgress] = useState('');

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
    start: '',
    end: '',
    categoryId: '',
  });

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    fetchCategories();
    requestPermissions();

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
  }, []);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Toast.show({
        type: 'error',
        text1: 'Permission Required',
        text2: 'Please grant media library permissions to upload files',
      });
    }
  };

  const fetchCategories = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await api.get('/category', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
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
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium, // Compress video
      });

      if (!result.canceled && result.assets) {
        const newMedia = result.assets.map((asset) => {
          // Determine MIME type from URI if available
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
        const oversizedFiles = newMedia.filter(m => m.fileSize && m.fileSize > 50 * 1024 * 1024); // 50MB limit
        if (oversizedFiles.length > 0) {
          Toast.show({
            type: 'error',
            text1: 'File Too Large',
            text2: 'Please select videos smaller than 50MB',
          });
          return;
        }

        setSelectedMedia([...selectedMedia, ...newMedia]);
      }
    } catch (error) {
      console.error('Error picking media:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to pick media',
      });
    }
  };

  const removeMedia = (index) => {
    const updatedMedia = selectedMedia.filter((_, i) => i !== index);
    setSelectedMedia(updatedMedia);
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
      console.log('  Token:', token ? 'Present' : 'Missing');
     
      const response = await api.put(
        '/auth/sign-s3',
        {
          fileName: fileName,
          fileType: fileType,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          timeout: 30000, // 30 second timeout
        }
      );

      console.log('Signed URL response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error getting signed URL:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Error config:', error.config?.url);
      
      // Provide more specific error message
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else if (error.response?.status === 400) {
        throw new Error('Invalid file type. Backend may not accept videos.');
      } else if (error.response?.status === 415) {
        throw new Error('Unsupported media type. Backend rejected the file type.');
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout. Server is taking too long to respond.');
      } else if (error.message === 'Network Error') {
        throw new Error('Cannot connect to server. Check your internet connection and backend URL.');
      }
      
      throw error;
    }
  };

  const uploadMediaToS3 = async (mediaUri, uploadURL, mimeType) => {
    try {
      console.log(`Starting upload for: ${mediaUri}`);
      console.log(`Upload URL: ${uploadURL}`);
      console.log(`MIME Type: ${mimeType}`);

      const response = await fetch(mediaUri);
      const blob = await response.blob();

      console.log(`Blob size: ${blob.size} bytes`);

      // Create upload with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes timeout

      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: blob,
        headers: {
          'Content-Type': mimeType,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('S3 Upload Error:', errorText);
        throw new Error(`Failed to upload media to S3: ${uploadResponse.status} - ${errorText}`);
      }

      console.log('Upload successful');
      return true;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('Upload timeout');
        throw new Error('Upload timed out. Please try a smaller file.');
      }
      console.error('Error uploading to S3:', error);
      throw error;
    }
  };

  const uploadAllMedia = async () => {
    const uploadedImages = [];
    const uploadedVideos = [];

    for (let i = 0; i < selectedMedia.length; i++) {
      const media = selectedMedia[i];
      const sizeInMB = media.fileSize ? (media.fileSize / (1024 * 1024)).toFixed(2) : 'unknown';
      setUploadProgress(`Uploading ${media.type} ${i + 1}/${selectedMedia.length} (${sizeInMB}MB)...`);

      try {
        console.log(`\n=== Uploading ${media.type} ${i + 1} ===`);
        console.log('File name:', media.name);
        console.log('MIME type:', media.mimeType);
        console.log('File size:', sizeInMB, 'MB');

        const signedData = await getSignedUrl(media.name, media.mimeType);
        const { uploadURL } = signedData;
        
        console.log('Got signed URL, starting upload...');
        await uploadMediaToS3(media.uri, uploadURL, media.mimeType);
        
        const mediaUrl = uploadURL.split('?')[0];
        console.log('Upload complete:', mediaUrl);
        
        // Separate images and videos as simple URL strings
        if (media.type === 'video') {
          uploadedVideos.push(mediaUrl);
        } else {
          uploadedImages.push(mediaUrl);
        }
      } catch (error) {
        console.error(`Error uploading ${media.type} ${i + 1}:`, error);
        
        // Show more specific error message
        const errorMessage = error.message || `Failed to upload ${media.type} ${i + 1}`;
        Toast.show({
          type: 'error',
          text1: 'Upload Failed',
          text2: errorMessage,
        });
        
        throw new Error(errorMessage);
      }
    }

    setUploadProgress('');
    return { images: uploadedImages, videos: uploadedVideos };
  };

  const handleCreateEvent = async () => {
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

    // Validation
    if (!name.trim()) {
      return Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Event name is required',
      });
    }

    if (!description.trim()) {
      return Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Event description is required',
      });
    }

    if (!address.trim()) {
      return Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Event address is required',
      });
    }

    if (!capacity || parseInt(capacity) <= 0) {
      return Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please enter a valid capacity',
      });
    }

    if (!categoryId) {
      return Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please select an event category',
      });
    }

    if (selectedMedia.length === 0) {
      return Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please add at least one image or video',
      });
    }

    try {
      setIsSubmitting(true);

      setUploadProgress('Uploading media...');
      const { images: uploadedImages, videos: uploadedVideos } = await uploadAllMedia();

      console.log('Uploaded images:', uploadedImages);
      console.log('Uploaded videos:', uploadedVideos);

      setUploadProgress('Creating event...');
      const token = await AsyncStorage.getItem('token');
      const startDate = new Date(
        `${form.startYear}-${form.startMonth}-${form.startDay}T00:00:00.000Z`
      );
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
        categoryId: categoryId,
        // Determine the type based on what media is uploaded
        type: uploadedVideos.length > 0 ? 'videos' : 'images',
        ...(uploadedImages.length > 0 && { images: uploadedImages }),
        ...(uploadedVideos.length > 0 && { videos: uploadedVideos }),
      };

      const response = await api.post('/event', eventData, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      Toast.show({
        type: 'success',
        text1: 'Success! 🎉',
        text2: 'Event created successfully',
      });

      router.back();
    } catch (error) {
      console.error('Error creating event:', error.response || error);
      const message =
        error.response?.data?.message ||
        error.message ||
        'Failed to create event. Please try again.';
      Toast.show({
        type: 'error',
        text1: 'Creation Failed',
        text2: message,
      });
    } finally {
      setIsSubmitting(false);
      setUploadProgress('');
    }
  };

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
            <Text style={styles.headerTitle}>Create Event</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Upload Progress */}
          {uploadProgress !== '' && (
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>{uploadProgress}</Text>
            </View>
          )}

          {/* Event Media (Images & Videos) */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Event Media (Images & Videos) *</Text>
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
                      <View style={styles.videoPreviewContainer}>
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
              <Text style={styles.label}>Latitude (Optional)</Text>
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
              <Text style={styles.label}>Longitude (Optional)</Text>
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
            <Text style={styles.label}>How many people are attending this event? *</Text>
            <TextInput
              style={styles.input}
              value={form.capacity}
              onChangeText={(text) => handleChange('capacity', text)}
              placeholder="e.g., 20"
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
                maxLength={2}
                keyboardType="number-pad"
                onChangeText={(day) => handleChange('startDay', day)}
              />
              <TextInput
                style={[styles.dateTimeInput, { flex: 1 }]}
                placeholder="MM"
                maxLength={2}
                keyboardType="number-pad"
                onChangeText={(month) => handleChange('startMonth', month)}
              />
              <TextInput
                style={[styles.dateTimeInput, { flex: 2 }]}
                placeholder="YYYY"
                maxLength={4}
                keyboardType="number-pad"
                onChangeText={(year) => handleChange('startYear', year)}
              />
              <TextInput
                style={[styles.dateTimeInput, { flex: 1 }]}
                placeholder="HH"
                maxLength={2}
                keyboardType="number-pad"
                onChangeText={(hour) => handleChange('startHour', hour)}
              />
              <TextInput
                style={[styles.dateTimeInput, { flex: 1 }]}
                placeholder="MM"
                maxLength={2}
                keyboardType="number-pad"
                onChangeText={(minute) => handleChange('startMinute', minute)}
              />
            </View>
          </View>

          {/* End Date & Time */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>End Date & Time *</Text>
            <View style={styles.dateTimeRow}>
              <TextInput
                style={[styles.dateTimeInput, { flex: 1 }]}
                placeholder="DD"
                maxLength={2}
                keyboardType="number-pad"
                onChangeText={(day) => handleChange('endDay', day)}
              />
              <TextInput
                style={[styles.dateTimeInput, { flex: 1 }]}
                placeholder="MM"
                maxLength={2}
                keyboardType="number-pad"
                onChangeText={(month) => handleChange('endMonth', month)}
              />
              <TextInput
                style={[styles.dateTimeInput, { flex: 2 }]}
                placeholder="YYYY"
                maxLength={4}
                keyboardType="number-pad"
                onChangeText={(year) => handleChange('endYear', year)}
              />
              <TextInput
                style={[styles.dateTimeInput, { flex: 1 }]}
                placeholder="HH"
                maxLength={2}
                keyboardType="number-pad"
                onChangeText={(hour) => handleChange('endHour', hour)}
              />
              <TextInput
                style={[styles.dateTimeInput, { flex: 1 }]}
                placeholder="MM"
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

          {/* Create Button */}
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateEvent}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            <Text style={styles.createButtonText}>
              {isSubmitting ? 'Creating...' : 'Create Event'}
            </Text>
          </TouchableOpacity>
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
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  formContainer: {
    paddingHorizontal: width * 0.04,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
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
  videoPreviewContainer: {
    position: 'relative',
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
  dateButton: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fafafa',
  },
  dateText: {
    fontSize: 15,
    color: '#333',
    fontFamily: 'Poppins_400Regular',
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