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

const { width, height } = Dimensions.get('window');

export default function EditEvent() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [selectedImages, setSelectedImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
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
      
      const response = await api.get(`/event?key=id&value=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success && response.data.data.length > 0) {
        const event = response.data.data[0];
        
        // Parse start date
        const startDate = new Date(event.start);
        const endDate = new Date(event.end);

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
          startDay: startDate.getDate().toString().padStart(2, '0'),
          startMonth: (startDate.getMonth() + 1).toString().padStart(2, '0'),
          startYear: startDate.getFullYear().toString(),
          startHour: startDate.getHours().toString().padStart(2, '0'),
          startMinute: startDate.getMinutes().toString().padStart(2, '0'),
          endDay: endDate.getDate().toString().padStart(2, '0'),
          endMonth: (endDate.getMonth() + 1).toString().padStart(2, '0'),
          endYear: endDate.getFullYear().toString(),
          endHour: endDate.getHours().toString().padStart(2, '0'),
          endMinute: endDate.getMinutes().toString().padStart(2, '0'),
          categoryId: event.categoryId?._id || event.categoryId || '',
        });

        // Set existing images
        if (event.images && event.images.length > 0) {
          setExistingImages(event.images);
        }
      }
    } catch (error) {
      console.error('Error fetching event details:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to load event',
        text2: error.response?.data?.message || 'Please try again',
      });
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

  const pickImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map((asset) => ({
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          name: asset.fileName || `event_image_${Date.now()}.jpg`,
        }));
        setSelectedImages([...selectedImages, ...newImages]);
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to pick images',
      });
    }
  };

  const removeImage = (index) => {
    const updatedImages = selectedImages.filter((_, i) => i !== index);
    setSelectedImages(updatedImages);
  };

  const removeExistingImage = (index) => {
    const updatedImages = existingImages.filter((_, i) => i !== index);
    setExistingImages(updatedImages);
  };

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const getSignedUrl = async (fileName, fileType) => {
    try {
      const token = await AsyncStorage.getItem('token');
     
      const response = await api.put(
        '/auth/sign-s3',
        { fileName, fileType },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error getting signed URL:', error);
      throw error;
    }
  };

  const uploadImageToS3 = async (imageUri, uploadURL) => {
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();

      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': blob.type },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image to S3');
      }

      return true;
    } catch (error) {
      console.error('Error uploading to S3:', error);
      throw error;
    }
  };

  const uploadNewImages = async () => {
    const uploadedUrls = [];

    for (let i = 0; i < selectedImages.length; i++) {
      const image = selectedImages[i];
      setUploadProgress(`Uploading image ${i + 1} of ${selectedImages.length}...`);

      try {
        const signedData = await getSignedUrl(image.name, image.type);
        const { uploadURL } = signedData;
      
        await uploadImageToS3(image.uri, uploadURL);
        const imageUrl = uploadURL.split('?')[0];
        uploadedUrls.push(imageUrl);
      } catch (error) {
        console.error(`Error uploading image ${i + 1}:`, error);
        throw new Error(`Failed to upload image ${i + 1}`);
      }
    }

    setUploadProgress('');
    return uploadedUrls;
  };

  const handleUpdateEvent = async () => {
    const { name, description, address, capacity, categoryId, isTicket, ticketAmount, isSponsored, sponsorAmount } = form;

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

    try {
      setIsSubmitting(true);

      // Upload new images if any
      let newImageUrls = [];
      if (selectedImages.length > 0) {
        setUploadProgress('Uploading new images...');
        newImageUrls = await uploadNewImages();
      }

      // Combine existing and new images
      const allImages = [...existingImages, ...newImageUrls];

      setUploadProgress('Updating event...');
      const token = await AsyncStorage.getItem('token');
      
      const startDate = new Date(
        `${form.startYear}-${form.startMonth}-${form.startDay}T${form.startHour}:${form.startMinute}:00.000Z`
      );
      const endDate = new Date(
        `${form.endYear}-${form.endMonth}-${form.endDay}T${form.endHour}:${form.endMinute}:00.000Z`
      );

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
        end: endDate.toISOString(),
        categoryId: typeof categoryId === 'object' ? categoryId._id : categoryId,
        image: allImages,
      };

      const response = await api.put(`/event/${id}`, eventData, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      Toast.show({
        type: 'success',
        text1: 'Success! 🎉',
        text2: 'Event updated successfully',
      });

      router.back();
    } catch (error) {
      console.error('Error updating event:', error.response || error);
      const message =
        error.response?.data?.message ||
        error.message ||
        'Failed to update event. Please try again.';
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: message,
      });
    } finally {
      setIsSubmitting(false);
      setUploadProgress('');
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

            {/* New Event Images */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Add New Images (Optional)</Text>
              <TouchableOpacity style={styles.imagePickerButton} onPress={pickImages}>
                <Text style={styles.imagePickerIcon}>📷</Text>
                <Text style={styles.imagePickerText}>
                  {selectedImages.length > 0
                    ? `${selectedImages.length} new image(s) selected`
                    : 'Add More Images'}
                </Text>
              </TouchableOpacity>

              {selectedImages.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.imagePreviewContainer}
                >
                  {selectedImages.map((image, index) => (
                    <View key={index} style={styles.imagePreviewWrapper}>
                      <Image source={{ uri: image.uri }} style={styles.imagePreview} />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => removeImage(index)}
                      >
                        <Text style={styles.removeImageText}>×</Text>
                      </TouchableOpacity>
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
              <Text style={styles.label}>Capacity *</Text>
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
              <Text style={styles.label}>End Date & Time *</Text>
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