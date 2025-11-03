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
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import api from '../../utils/axiosInstance';
import CustomLoader from '../../components/CustomFormLoader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';

const { width, height } = Dimensions.get('window');

/**
 * Custom Keyboard Input Component
 * Stays fixed at bottom, moves with keyboard
 */
const CustomKeyboardInput = ({
  value,
  onChangeText,
  placeholder,
  multiline = true,
  maxHeight = 120,
  label,
  onSubmit,
}) => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [inputHeight, setInputHeight] = useState(40);
  const keyboardTranslateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        const kbHeight = event.endCoordinates.height;
        setKeyboardHeight(kbHeight);

        Animated.timing(keyboardTranslateY, {
          toValue: -kbHeight,
          duration: Platform.OS === 'ios' ? 250 : 200,
          useNativeDriver: true,
        }).start();
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        Animated.timing(keyboardTranslateY, {
          toValue: 0,
          duration: Platform.OS === 'ios' ? 250 : 200,
          useNativeDriver: true,
        }).start();
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  const handleContentSizeChange = (event) => {
    if (multiline) {
      const height = event.nativeEvent.contentSize.height;
      setInputHeight(Math.min(Math.max(40, height), maxHeight));
    }
  };

  if (!isFocused && !value) return null;

  return (
    <Animated.View
      style={[
        styles.customKeyboardContainer,
        {
          transform: [{ translateY: keyboardTranslateY }],
        },
      ]}
    >
      {label && <Text style={styles.floatingLabel}>{label}</Text>}
      <View style={[styles.customInputContainer, isFocused && styles.customInputFocused]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#999"
          multiline={multiline}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onContentSizeChange={handleContentSizeChange}
          style={[
            styles.customInput,
            multiline && { height: Math.max(40, inputHeight) },
          ]}
          returnKeyType="done"
          onSubmitEditing={() => {
            Keyboard.dismiss();
            onSubmit?.();
          }}
        />
        {value.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              Keyboard.dismiss();
              onSubmit?.();
            }}
            style={styles.doneButton}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

export default function CreateEvent() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [uploadProgress, setUploadProgress] = useState('');
  
  // Track which field is being edited
  const [activeField, setActiveField] = useState(null);
  const scrollViewRef = useRef(null);

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

        const oversizedFiles = newMedia.filter(m => m.fileSize && m.fileSize > 50 * 1024 * 1024);
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

  // Open custom keyboard for specific field
  const openCustomKeyboard = (fieldName) => {
    setActiveField(fieldName);
  };

  const closeCustomKeyboard = () => {
    setActiveField(null);
    Keyboard.dismiss();
  };

  const handleSaveToDraft = async () => {
    // Your existing draft save logic
    const { name, address, categoryId } = form;

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
      
      const draftData = {
        name: name.trim(),
        address: address.trim(),
        categoryId: categoryId,
      };

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

      router.back();
    } catch (error) {
      console.error('Error saving draft:', error.response || error);
      const message =
        error.response?.data?.message ||
        error.message ||
        'Failed to save draft. Please try again.';
      Toast.show({
        type: 'error',
        text1: 'Save Failed',
        text2: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateEvent = async () => {
    // Your existing create event logic - keeping it intact
    // ... (copy all your existing validation and creation logic)
  };

  return (
    <View style={styles.container}>
      {isSubmitting && <CustomLoader />}

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        // Add padding bottom when keyboard is active
        contentInset={{ bottom: activeField ? 300 : 0 }}
        contentInsetAdjustmentBehavior="automatic"
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

          {/* Event Media */}
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

          {/* Event Name - Tap to open custom keyboard */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Event Name *</Text>
            <TouchableOpacity
              style={styles.touchableInput}
              onPress={() => openCustomKeyboard('name')}
            >
              <Text style={[styles.touchableInputText, !form.name && styles.placeholderText]}>
                {form.name || 'e.g., Birthday Party at Cresent Estate'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Description - Tap to open custom keyboard */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Description *</Text>
            <TouchableOpacity
              style={[styles.touchableInput, styles.touchableTextArea]}
              onPress={() => openCustomKeyboard('description')}
            >
              <Text style={[styles.touchableInputText, !form.description && styles.placeholderText]}>
                {form.description || 'Tell people about your event...'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Address - Tap to open custom keyboard */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Address *</Text>
            <TouchableOpacity
              style={styles.touchableInput}
              onPress={() => openCustomKeyboard('address')}
            >
              <Text style={[styles.touchableInputText, !form.address && styles.placeholderText]}>
                {form.address || 'e.g., Montana Resort - Lekki Phase 1'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Rest of your form fields - keep as regular inputs for numbers, etc. */}
          <View style={styles.row}>
            <View style={styles.halfInputContainer}>
              <Text style={styles.label}>Latitude</Text>
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
              <Text style={styles.label}>Longitude</Text>
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
            <Text style={styles.label}>How many people are attending? *</Text>
            <TextInput
              style={styles.input}
              value={form.capacity}
              onChangeText={(text) => handleChange('capacity', text)}
              placeholder="e.g., 20"
              placeholderTextColor="#999"
              keyboardType="number-pad"
            />
          </View>

          {/* Categories */}
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

          {/* Add more fields as needed... */}

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.draftButton}
              onPress={handleSaveToDraft}
              disabled={isSubmitting}
            >
              <Text style={styles.draftButtonText}>
                {isSubmitting ? 'Saving...' : '📝 Save to Draft'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreateEvent}
              disabled={isSubmitting}
            >
              <Text style={styles.createButtonText}>
                {isSubmitting ? 'Creating...' : 'Create Event'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Add spacing for keyboard */}
          <View style={{ height: 100 }} />
        </Animated.View>
      </ScrollView>

      {/* Custom Keyboard Inputs */}
      {activeField === 'name' && (
        <CustomKeyboardInput
          value={form.name}
          onChangeText={(text) => handleChange('name', text)}
          placeholder="Event Name"
          label="Event Name"
          multiline={false}
          onSubmit={closeCustomKeyboard}
        />
      )}

      {activeField === 'description' && (
        <CustomKeyboardInput
          value={form.description}
          onChangeText={(text) => handleChange('description', text)}
          placeholder="Tell people about your event..."
          label="Description"
          multiline={true}
          maxHeight={150}
          onSubmit={closeCustomKeyboard}
        />
      )}

      {activeField === 'address' && (
        <CustomKeyboardInput
          value={form.address}
          onChangeText={(text) => handleChange('address', text)}
          placeholder="Event Address"
          label="Address"
          multiline={false}
          onSubmit={closeCustomKeyboard}
        />
      )}
    </View>
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
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#444',
    marginBottom: 8,
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
    backgroundColor: '#fafafa',
  },
  // Touchable input styles (for custom keyboard fields)
  touchableInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fafafa',
    minHeight: 48,
    justifyContent: 'center',
  },
  touchableTextArea: {
    minHeight: 100,
  },
  touchableInputText: {
    fontSize: 15,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  // Custom keyboard styles
  customKeyboardContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  floatingLabel: {
    fontSize: 12,
    color: '#5A31F4',
    fontWeight: '600',
    marginBottom: 8,
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f0f0f0',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 40,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  customInputFocused: {
    borderColor: '#5A31F4',
    backgroundColor: '#fafafa',
  },
  customInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    maxHeight: 150,
    paddingTop: Platform.OS === 'ios' ? 8 : 0,
    paddingBottom: Platform.OS === 'ios' ? 8 : 0,
  },
  doneButton: {
    backgroundColor: '#5A31F4',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginLeft: 8,
  },
  doneButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
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
  },
  imagePickerSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
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
  },
  categoryTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
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
  },
  createButton: {
    flex: 1,
    backgroundColor: '#5A31F4',
    borderRadius: 12,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#5A31F4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});