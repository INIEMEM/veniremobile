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
  Modal,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import api from '../../utils/axiosInstance';
import CustomLoader from '../../components/CustomFormLoader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Calendar from 'expo-calendar';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Video } from 'expo-av';
import CustomKeyboardInput from '../../components/CustomKeyboardInput';
import { useToast } from '../../context/ToastContext';
const { width, height } = Dimensions.get('window');



export default function CreateEvent() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [uploadProgress, setUploadProgress] = useState('');
  const [composerVisible, setComposerVisible] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false)
  const [showStartTimePicker, setShowStartTimePicker] = useState(false)
  const [showEndDatePicker, setShowEndDatePicker] = useState(false)
  const [showEndTimePicker, setShowEndTimePicker] = useState(false)
  const [startDateTime, setStartDateTime] = useState(null)
  const [endDateTime, setEndDateTime] = useState(null)
  const [hashtagInput, setHashtagInput] = useState("")
  const [hashtags, setHashtags] = useState([])

  // Advanced Event Features State
  const [tickets, setTickets] = useState([]);
  const [newTicket, setNewTicket] = useState({ name: '', price: '', capacity: '', type: 'regular', isInviteOnly: false });
  const [showAddTicket, setShowAddTicket] = useState(false);

  const [promoCodes, setPromoCodes] = useState([]);
  const [newPromo, setNewPromo] = useState({ code: '', discount: '', maxUses: '' });
  const [showAddPromo, setShowAddPromo] = useState(false);

  const [seatingPlans, setSeatingPlans] = useState([]);
  const [newSeat, setNewSeat] = useState({ name: '', capacity: '', price: '' });
  const [showAddSeat, setShowAddSeat] = useState(false);

  const [scheduledDate, setScheduledDate] = useState(null);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [showScheduleTimePicker, setShowScheduleTimePicker] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [addCalendarReminder, setAddCalendarReminder] = useState(true);

  // const { toast } = useToast();
  const { success, error, info, warning } = useToast();
  const scrollRef = useRef(null); 
  useEffect(() => {
    if (composerVisible && scrollRef.current) {
      // small timeout to allow layout/keyboard to animate then scroll
      setTimeout(() => {
        scrollRef.current.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [composerVisible]);
  const [form, setForm] = useState({
    name: '',
    description: '',
    address: '',
    lat: '6.5244',
    long: '3.3792',
    capacity: '',
    isTicket: false,
    ticketAmount: '0',
    isSponsored: false,
    sponsorAmount: '0',
    start: '',
    end: '',
    categoryId: '',
    isOrganizer: false,
    isHost: false,
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
      // toast.error('Please grant media library permissions to upload files');
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
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5,
        videoMaxDuration: 60,
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
        exif: false,
      });

      if (!result.canceled && result.assets) {
        const readableAssets = result.assets.filter((asset) => asset?.uri);

        if (readableAssets.length === 0) {
          Toast.show({
            type: 'error',
            text1: 'Unable to read media',
            text2: 'Please choose another photo or video and try again',
          });
          return;
        }

        const newMedia = readableAssets.map((asset) => {
          const mediaType = asset.type === 'video' ? 'video' : 'image';
          let mimeType = asset.mimeType || 'application/octet-stream';
          if (!asset.mimeType && mediaType === 'video') {
            mimeType = asset.uri.toLowerCase().endsWith('.mov') ? 'video/quicktime' : 'video/mp4';
          } else if (!asset.mimeType) {
            mimeType = 'image/jpeg';
          }

          return {
            uri: asset.uri,
            type: mediaType,
            mimeType: mimeType,
            name: asset.fileName || `event_${mediaType}_${Date.now()}.${mediaType === 'video' ? 'mp4' : 'jpg'}`,
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
          // toast.error('Please select videos smaller than 50MB');
          return;
        }

        setSelectedMedia([...selectedMedia, ...newMedia]);
      }
    } catch (error) {
      console.error('Error picking media:', error);
      const isRepresentationError =
        error?.message?.includes('Cannot load representation') ||
        error?.message?.includes('Failed to read picked image');
      Toast.show({
        type: 'error',
        text1: isRepresentationError ? 'Unable to read this image' : 'Error',
        text2: isRepresentationError
          ? 'Please choose another photo, or save it again in Photos and retry'
          : 'Failed to pick media',
      });
      // toast.error('Failed to pick media');
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
          timeout: 30000,
        }
      );

      console.log('Signed URL response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error getting signed URL:', error);
      
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

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

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
        
        if (media.type === 'video') {
          uploadedVideos.push(mediaUrl);
        } else {
          uploadedImages.push(mediaUrl);
        }
      } catch (error) {
        console.error(`Error uploading ${media.type} ${i + 1}:`, error);
        
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
        ...(hashtags.length > 0 && {hashtags: hashtags}),
        tickets: tickets.length > 0 ? tickets : [{
          name: form.isTicket ? "Standard Ticket" : "Free Entry",
          price: form.isTicket ? parseFloat(form.ticketAmount) || 0 : 0,
          capacity: form.capacity ? parseInt(form.capacity) : 1000,
          type: "regular",
          isInviteOnly: false
        }],
        ...(promoCodes.length > 0 && {promoCodes: promoCodes}),
        ...(seatingPlans.length > 0 && {seatingPlans: seatingPlans}),
        ...(scheduledDate && {scheduledDate: scheduledDate.toISOString()}),
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
      router.replace(`/(tabs)/Events/${response.data.data._id}?isDraft=true`);
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

    // Full validation for published event
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

    // if (!capacity || parseInt(capacity) <= 0) {
    //   return Toast.show({
    //     type: 'error',
    //     text1: 'Validation Error',
    //     text2: 'Please enter a valid capacity',
    //   });
    // }

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
        `${form.startYear}-${form.startMonth?.padStart(2, '0')}-${form.startDay?.padStart(2, '0')}T${form.startHour?.padStart(2, '0') || '00'}:${form.startMinute?.padStart(2, '0') || '00'}:00.000Z`
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
        ...(capacity && {capacity: capacity}),
        isTicket: isTicket,
        ticketAmount: isTicket ? parseFloat(ticketAmount) || 0 : 0,
        isSponsored: isSponsored,
        sponsorAmount: isSponsored ? parseFloat(sponsorAmount) || 0 : 0,
        start: startDate.toISOString(),
        ...(endDate && { end: endDate.toISOString() }),
        categoryId: categoryId,
        type: uploadedVideos.length > 0 ? 'videos' : 'images',
        ...(uploadedImages.length > 0 && { images: uploadedImages }),
        ...(uploadedVideos.length > 0 && { videos: uploadedVideos }),
        isOrganizer: form.isOrganizer,
        isHost: form.isHost,
        ...(hashtags.length > 0 && { hashtags }),
        tickets: tickets.length > 0 ? tickets : [{
          name: isTicket ? "Standard Ticket" : "Free Entry",
          price: isTicket ? parseFloat(ticketAmount) || 0 : 0,
          capacity: capacity ? parseInt(capacity) : 1000,
          type: "regular",
          isInviteOnly: false
        }],
        ...(promoCodes.length > 0 && { promoCodes }),
        ...(seatingPlans.length > 0 && { seatingPlans }),
        ...(scheduledDate && { scheduledDate: scheduledDate.toISOString() }),
      };

      console.log('Creating event with data:', eventData);
      const response = await api.post('/event', eventData, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      console.log('Event created successfully:', response.data);
      // Toast.show({
      //   type: 'success',
      //   text1: 'Success! 🎉',
      //   text2: 'Event created successfully',
      // });
      // toast.success('Event created successfully');
      router.replace(`/(tabs)/Events/${response.data.data._id}`);
    } catch (err) {
      console.error('Error creating event:', err.response || err);
      const message =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
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

  const handleScheduleEvent = async (dateOverride) => {
    const finalDate = dateOverride || scheduledDate;

    if (!finalDate) {
      return Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please pick a scheduled date' });
    }

    if (finalDate <= new Date()) {
      return Toast.show({ type: 'error', text1: 'Invalid Schedule', text2: 'Pick a future date and time to publish this event' });
    }

    if (!form.name.trim()) {
      return Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Event name is required' });
    }

    if (!form.description.trim()) {
      return Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Event description is required' });
    }

    if (!form.address.trim()) {
      return Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Event address is required' });
    }

    if (!form.categoryId) {
      return Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please select an event category' });
    }

    if (selectedMedia.length === 0) {
      return Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please add at least one image or video' });
    }

    const startDate = new Date(
      `${form.startYear}-${form.startMonth?.padStart(2, '0')}-${form.startDay?.padStart(2, '0')}T${form.startHour?.padStart(2, '0') || '00'}:${form.startMinute?.padStart(2, '0') || '00'}:00.000Z`
    );

    if (isNaN(startDate.getTime())) {
      return Toast.show({ type: 'error', text1: 'Invalid Start Date', text2: 'Please select the event start date and time' });
    }

    let endDate = null;
    if (form.endYear && form.endMonth && form.endDay) {
      endDate = new Date(
        `${form.endYear}-${form.endMonth?.padStart(2, '0')}-${form.endDay?.padStart(2, '0')}T${form.endHour?.padStart(2, '0') || '00'}:${form.endMinute?.padStart(2, '0') || '00'}:00.000Z`
      );

      if (isNaN(endDate.getTime())) {
        return Toast.show({ type: 'error', text1: 'Invalid End Date', text2: 'Please check your end date' });
      }

      if (endDate < startDate) {
        return Toast.show({ type: 'error', text1: 'Invalid End Date', text2: 'End time cannot be before start time' });
      }
    }

    try {
      setIsSubmitting(true);
      setUploadProgress('Preparing scheduled event...');
      const { images: uploadedImages, videos: uploadedVideos } = await uploadAllMedia();
      const clientScheduleId = `scheduled_${Date.now()}`;
      const scheduledPayload = {
        clientScheduleId,
        status: 'scheduled',
        publishAt: finalDate.toISOString(),
        scheduledDate: finalDate.toISOString(),
        calendarReminderRequested: addCalendarReminder,
        name: form.name.trim(),
        description: form.description.trim(),
        address: form.address.trim(),
        lat: form.lat || '0',
        long: form.long || '0',
        ...(form.capacity && { capacity: form.capacity }),
        isTicket: form.isTicket,
        ticketAmount: form.isTicket ? parseFloat(form.ticketAmount) || 0 : 0,
        isSponsored: form.isSponsored,
        sponsorAmount: form.isSponsored ? parseFloat(form.sponsorAmount) || 0 : 0,
        start: startDate.toISOString(),
        ...(endDate && { end: endDate.toISOString() }),
        categoryId: form.categoryId,
        type: uploadedVideos.length > 0 ? 'videos' : 'images',
        ...(uploadedImages.length > 0 && { images: uploadedImages }),
        ...(uploadedVideos.length > 0 && { videos: uploadedVideos }),
        isOrganizer: form.isOrganizer,
        isHost: form.isHost,
        ...(hashtags.length > 0 && { hashtags }),
        tickets: tickets.length > 0 ? tickets : [{
          name: isTicket ? "Standard Ticket" : "Free Entry",
          price: isTicket ? parseFloat(ticketAmount) || 0 : 0,
          capacity: capacity ? parseInt(capacity) : 1000,
          type: "regular",
          isInviteOnly: false
        }],
        ...(promoCodes.length > 0 && { promoCodes }),
        ...(seatingPlans.length > 0 && { seatingPlans }),
      };

      let calendarEventId = null;
      if (addCalendarReminder) {
        calendarEventId = await addScheduledEventToCalendar(finalDate, scheduledPayload);
      }

      const storedPayload = {
        ...scheduledPayload,
        ...(calendarEventId && { calendarEventId }),
        createdAt: new Date().toISOString(),
      };

      const existingSchedules = await AsyncStorage.getItem('scheduledEvents');
      const parsedSchedules = existingSchedules ? JSON.parse(existingSchedules) : [];
      await AsyncStorage.setItem(
        'scheduledEvents',
        JSON.stringify([storedPayload, ...parsedSchedules])
      );

      console.log('Scheduled event payload:', storedPayload);
      
      Toast.show({
        type: 'success',
        text1: 'Event Scheduled! 📅',
        text2: `Publishing ${formatDisplayDate(finalDate)} at ${formatDisplayTime(finalDate)}`,
      });
      
      setShowScheduleModal(false);
      router.back();
    } catch (err) {
      console.error(err);
      Toast.show({
        type: 'error',
        text1: 'Schedule Failed',
        text2: err.message || 'Something went wrong',
      });
    } finally {
      setIsSubmitting(false);
      setUploadProgress('');
    }
  };

  const addScheduledEventToCalendar = async (scheduleDate, scheduledPayload) => {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({
          type: 'info',
          text1: 'Calendar reminder skipped',
          text2: 'Calendar permission was not granted',
        });
        return null;
      }

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const writableCalendar = calendars.find((calendar) => calendar.allowsModifications) || calendars[0];

      if (!writableCalendar) {
        Toast.show({
          type: 'info',
          text1: 'Calendar reminder skipped',
          text2: 'No writable calendar was found on this device',
        });
        return null;
      }

      const startDate = new Date(scheduleDate);
      const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);

      return await Calendar.createEventAsync(writableCalendar.id, {
        title: `Publish Venire event: ${scheduledPayload.name}`,
        startDate,
        endDate,
        location: scheduledPayload.address || '',
        notes: `Reminder to publish "${scheduledPayload.name}" on Venire.\n\nEvent starts: ${formatDisplayDate(new Date(scheduledPayload.start))} at ${formatDisplayTime(new Date(scheduledPayload.start))}`,
        alarms: [{ relativeOffset: -15 }],
      });
    } catch (calendarError) {
      console.error('Schedule calendar error:', calendarError);
      Toast.show({
        type: 'info',
        text1: 'Calendar reminder skipped',
        text2: 'The event was scheduled, but calendar reminder failed',
      });
      return null;
    }
  };

  const formatDisplayDate = (date) => {
    if (!date) return "Select date"
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  const formatDisplayTime = (date) => {
    if (!date) return "Select time"
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  const handleAddHashtag = () => {
    const raw = hashtagInput.trim()
    if (!raw) return
    const tag = raw.startsWith("#") ? raw : `#${raw}`
    const clean = tag
      .replace(/\s+/g, "")
      .toLowerCase()
    if (clean.length <= 1) return
    if (hashtags.includes(clean)) {
      setHashtagInput("")
      return
    }
    if (hashtags.length >= 10) {
      Toast.show({
        type: "info",
        text1: "Maximum 10 hashtags allowed",
      })
      return
    }
    setHashtags([...hashtags, clean])
    setHashtagInput("")
  }

  const handleRemoveHashtag = (tag) => {
    setHashtags(hashtags.filter(h => h !== tag))
  }

  return (
       <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {isSubmitting && <CustomLoader />}

      <ScrollView
        ref={scrollRef}
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

          {/* AI Banner */}
          <TouchableOpacity 
            style={styles.aiBannerContainer} 
            activeOpacity={0.8}
            onPress={() => router.push('/events/ai-create')}
          >
            <View style={styles.aiBannerContent}>
              <View style={styles.aiIconContainer}>
                <Ionicons name="sparkles" size={24} color="#FFF" />
              </View>
              <View style={styles.aiTextContainer}>
                <Text style={styles.aiBannerTitle}>Create with AI</Text>
                <Text style={styles.aiBannerDesc}>Let Venire AI plan your perfect event in seconds.</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#5A31F4" />
            </View>
          </TouchableOpacity>

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
            {/* <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => {
                  setComposerVisible(true);
                  // scroll so the preview is visible (optional)
                  setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
                }}
                style={[styles.touchableInput, styles.touchableTextArea]}
              >
                {form.description ? (
                  <Text style={styles.touchableInputText}>{form.description}</Text>
                ) : (
                  <Text style={[styles.touchableInputText, styles.placeholderText]}>
                    Tell people about your event...
                  </Text>
                )}
              </TouchableOpacity> */}
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

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Hashtags{" "}
              <Text style={styles.optionalLabel}>
                (optional, up to 10)
              </Text>
            </Text>

            <View style={styles.hashtagInputRow}>
              <TextInput
                style={styles.hashtagTextInput}
                value={hashtagInput}
                onChangeText={(text) => {
                  const clean = text.replace(/\s/g, "")
                  setHashtagInput(clean)
                }}
                onSubmitEditing={handleAddHashtag}
                placeholder="#music  #lagos  #concert"
                placeholderTextColor="#BBBBBB"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[
                  styles.hashtagAddBtn,
                  !hashtagInput.trim() && 
                    styles.hashtagAddBtnDisabled
                ]}
                onPress={handleAddHashtag}
                disabled={!hashtagInput.trim()}
                activeOpacity={0.7}
              >
                <Text style={styles.hashtagAddBtnText}>Add</Text>
              </TouchableOpacity>
            </View>

            {hashtags.length > 0 && (
              <View style={styles.hashtagsList}>
                {hashtags.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={styles.hashtagChip}
                    onPress={() => handleRemoveHashtag(tag)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.hashtagChipText}>{tag}</Text>
                    <Ionicons 
                      name="close" 
                      size={12} 
                      color="#5A31F4" 
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {hashtags.length > 0 && (
              <Text style={styles.hashtagHint}>
                Tap a hashtag to remove it
              </Text>
            )}
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

          {/* Capacity */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>How many people are attending this event? </Text>
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
            <View style={styles.datePickerRow}>
              
              <TouchableOpacity
                style={styles.datePickerBtn}
                onPress={() => setShowStartDatePicker(true)}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name="calendar-outline" 
                  size={18} 
                  color="#5A31F4" 
                />
                <Text style={[
                  styles.datePickerBtnText,
                  !startDateTime && styles.datePickerPlaceholder
                ]}>
                  {formatDisplayDate(startDateTime)}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.timePickerBtn}
                onPress={() => {
                  if (!startDateTime) {
                    Toast.show({
                      type: "info",
                      text1: "Pick a date first",
                    })
                    return
                  }
                  setShowStartTimePicker(true)
                }}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name="time-outline" 
                  size={18} 
                  color="#5A31F4" 
                />
                <Text style={[
                  styles.datePickerBtnText,
                  !startDateTime && styles.datePickerPlaceholder
                ]}>
                  {formatDisplayTime(startDateTime)}
                </Text>
              </TouchableOpacity>

            </View>

            {showStartDatePicker && (
              <DateTimePicker
                value={startDateTime || new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                minimumDate={new Date()}
                onChange={(event, selectedDate) => {
                  setShowStartDatePicker(false)
                  if (selectedDate) {
                    const updated = startDateTime 
                      ? new Date(startDateTime) 
                      : new Date()
                    updated.setFullYear(
                      selectedDate.getFullYear(),
                      selectedDate.getMonth(),
                      selectedDate.getDate()
                    )
                    setStartDateTime(updated)
                    handleChange("startYear", 
                      String(selectedDate.getFullYear()))
                    handleChange("startMonth", 
                      String(selectedDate.getMonth() + 1))
                    handleChange("startDay", 
                      String(selectedDate.getDate()))
                  }
                }}
              />
            )}

            {showStartTimePicker && (
              <DateTimePicker
                value={startDateTime || new Date()}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(event, selectedTime) => {
                  setShowStartTimePicker(false)
                  if (selectedTime && startDateTime) {
                    const updated = new Date(startDateTime)
                    updated.setHours(selectedTime.getHours())
                    updated.setMinutes(selectedTime.getMinutes())
                    setStartDateTime(updated)
                    handleChange("startHour", 
                      String(selectedTime.getHours()))
                    handleChange("startMinute", 
                      String(selectedTime.getMinutes()))
                  }
                }}
              />
            )}

            {startDateTime && (
              <View style={styles.dateConfirmRow}>
                <Ionicons 
                  name="checkmark-circle" 
                  size={14} 
                  color="#22C55E" 
                />
                <Text style={styles.dateConfirmText}>
                  {formatDisplayDate(startDateTime)} at{" "}
                  {formatDisplayTime(startDateTime)}
                </Text>
                <TouchableOpacity 
                  onPress={() => setStartDateTime(null)}
                >
                  <Text style={styles.dateClearText}>Clear</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* End Date & Time */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              End Date & Time{" "}
              <Text style={styles.optionalLabel}>(optional)</Text>
            </Text>
            <View style={styles.datePickerRow}>

              <TouchableOpacity
                style={styles.datePickerBtn}
                onPress={() => setShowEndDatePicker(true)}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name="calendar-outline" 
                  size={18} 
                  color="#5A31F4" 
                />
                <Text style={[
                  styles.datePickerBtnText,
                  !endDateTime && styles.datePickerPlaceholder
                ]}>
                  {formatDisplayDate(endDateTime)}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.timePickerBtn}
                onPress={() => {
                  if (!endDateTime) {
                    Toast.show({
                      type: "info",
                      text1: "Pick a date first",
                    })
                    return
                  }
                  setShowEndTimePicker(true)
                }}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name="time-outline" 
                  size={18} 
                  color="#5A31F4" 
                />
                <Text style={[
                  styles.datePickerBtnText,
                  !endDateTime && styles.datePickerPlaceholder
                ]}>
                  {formatDisplayTime(endDateTime)}
                </Text>
              </TouchableOpacity>

            </View>

            {showEndDatePicker && (
              <DateTimePicker
                value={endDateTime || 
                  (startDateTime ? new Date(startDateTime) 
                  : new Date())}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                minimumDate={startDateTime || new Date()}
                onChange={(event, selectedDate) => {
                  setShowEndDatePicker(false)
                  if (selectedDate) {
                    const updated = endDateTime 
                      ? new Date(endDateTime) 
                      : new Date()
                    updated.setFullYear(
                      selectedDate.getFullYear(),
                      selectedDate.getMonth(),
                      selectedDate.getDate()
                    )
                    setEndDateTime(updated)
                    handleChange("endYear", 
                      String(selectedDate.getFullYear()))
                    handleChange("endMonth", 
                      String(selectedDate.getMonth() + 1))
                    handleChange("endDay", 
                      String(selectedDate.getDate()))
                  }
                }}
              />
            )}

            {showEndTimePicker && (
              <DateTimePicker
                value={endDateTime || new Date()}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(event, selectedTime) => {
                  setShowEndTimePicker(false)
                  if (selectedTime && endDateTime) {
                    const updated = new Date(endDateTime)
                    updated.setHours(selectedTime.getHours())
                    updated.setMinutes(selectedTime.getMinutes())
                    setEndDateTime(updated)
                    handleChange("endHour", 
                      String(selectedTime.getHours()))
                    handleChange("endMinute", 
                      String(selectedTime.getMinutes()))
                  }
                }}
              />
            )}

            {endDateTime && (
              <View style={styles.dateConfirmRow}>
                <Ionicons 
                  name="checkmark-circle" 
                  size={14} 
                  color="#22C55E" 
                />
                <Text style={styles.dateConfirmText}>
                  {formatDisplayDate(endDateTime)} at{" "}
                  {formatDisplayTime(endDateTime)}
                </Text>
                <TouchableOpacity 
                  onPress={() => setEndDateTime(null)}
                >
                  <Text style={styles.dateClearText}>Clear</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Ticketing - Advanced */}
          <View style={styles.advancedSection}>
            <View style={styles.advancedSectionHeader}>
              <Text style={styles.label}>Ticket Tiers *</Text>
              <TouchableOpacity onPress={() => setShowAddTicket(!showAddTicket)}>
                <Text style={styles.addText}>{showAddTicket ? 'Cancel' : '+ Add Ticket'}</Text>
              </TouchableOpacity>
            </View>

            {/* Legacy Fallback Toggle (Since payload shouldn't change yet) */}
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Is this a paid event?</Text>
              <Switch
                value={form.isTicket}
                onValueChange={(value) => handleChange('isTicket', value)}
                trackColor={{ false: '#ccc', true: '#5A31F4' }}
                thumbColor="#fff"
              />
            </View>
            {form.isTicket && (
              <TextInput
                style={[styles.input, { marginBottom: 15 }]}
                value={form.ticketAmount}
                onChangeText={(text) => handleChange('ticketAmount', text)}
                placeholder="Base Ticket Price (Legacy)"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
              />
            )}

            {/* Multiple Tickets UI */}
            {tickets.map((t, index) => (
              <View key={index} style={styles.ticketCard}>
                <View>
                  <Text style={styles.ticketName}>{t.name} <Text style={styles.ticketTypeBadge}>({t.type})</Text></Text>
                  <Text style={styles.ticketDetails}>Price: ₦{t.price} • Capacity: {t.capacity} {t.isInviteOnly ? '• Invite Only' : ''}</Text>
                </View>
                <TouchableOpacity onPress={() => setTickets(tickets.filter((_, i) => i !== index))}>
                  <Ionicons name="trash-outline" size={20} color="#ff4444" />
                </TouchableOpacity>
              </View>
            ))}

            {showAddTicket && (
              <View style={styles.addFormCard}>
                <TextInput style={styles.inputSmall} placeholder="Ticket Name (e.g. VIP)" value={newTicket.name} onChangeText={(t) => setNewTicket({...newTicket, name: t})} />
                <View style={styles.row}>
                  <TextInput style={[styles.inputSmall, { flex: 1, marginRight: 10 }]} placeholder="Price" keyboardType="numeric" value={newTicket.price} onChangeText={(t) => setNewTicket({...newTicket, price: t})} />
                  <TextInput style={[styles.inputSmall, { flex: 1 }]} placeholder="Capacity" keyboardType="numeric" value={newTicket.capacity} onChangeText={(t) => setNewTicket({...newTicket, capacity: t})} />
                </View>
                <View style={styles.row}>
                  <TouchableOpacity style={[styles.typeBtn, newTicket.type === 'regular' && styles.typeBtnActive]} onPress={() => setNewTicket({...newTicket, type: 'regular'})}><Text style={newTicket.type === 'regular' ? styles.typeBtnTextActive : styles.typeBtnText}>Regular</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.typeBtn, newTicket.type === 'vip' && styles.typeBtnActive]} onPress={() => setNewTicket({...newTicket, type: 'vip'})}><Text style={newTicket.type === 'vip' ? styles.typeBtnTextActive : styles.typeBtnText}>VIP</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.typeBtn, newTicket.type === 'early_bird' && styles.typeBtnActive]} onPress={() => setNewTicket({...newTicket, type: 'early_bird'})}><Text style={newTicket.type === 'early_bird' ? styles.typeBtnTextActive : styles.typeBtnText}>Early Bird</Text></TouchableOpacity>
                </View>
                <View style={[styles.switchRow, { marginTop: 10 }]}>
                  <Text style={styles.switchLabel}>Invite Only?</Text>
                  <Switch value={newTicket.isInviteOnly} onValueChange={(val) => setNewTicket({...newTicket, isInviteOnly: val})} trackColor={{ false: '#ccc', true: '#5A31F4' }} />
                </View>
                <TouchableOpacity 
                  style={styles.saveAddBtn} 
                  onPress={() => {
                    if(newTicket.name && newTicket.price) {
                      setTickets([...tickets, newTicket]);
                      setNewTicket({ name: '', price: '', capacity: '', type: 'regular', isInviteOnly: false });
                      setShowAddTicket(false);
                    }
                  }}
                >
                  <Text style={styles.saveAddBtnText}>Save Ticket</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Promo Codes */}
          <View style={styles.advancedSection}>
            <View style={styles.advancedSectionHeader}>
              <Text style={styles.label}>Promo Codes</Text>
              <TouchableOpacity onPress={() => setShowAddPromo(!showAddPromo)}>
                <Text style={styles.addText}>{showAddPromo ? 'Cancel' : '+ Add Promo'}</Text>
              </TouchableOpacity>
            </View>
            {promoCodes.map((p, index) => (
              <View key={index} style={styles.ticketCard}>
                <View>
                  <Text style={styles.ticketName}>{p.code}</Text>
                  <Text style={styles.ticketDetails}>Discount: {p.discount}% • Max Uses: {p.maxUses}</Text>
                </View>
                <TouchableOpacity onPress={() => setPromoCodes(promoCodes.filter((_, i) => i !== index))}>
                  <Ionicons name="trash-outline" size={20} color="#ff4444" />
                </TouchableOpacity>
              </View>
            ))}
            {showAddPromo && (
              <View style={styles.addFormCard}>
                <TextInput style={styles.inputSmall} placeholder="Code (e.g. SUMMER20)" value={newPromo.code} onChangeText={(t) => setNewPromo({...newPromo, code: t})} />
                <View style={styles.row}>
                  <TextInput style={[styles.inputSmall, { flex: 1, marginRight: 10 }]} placeholder="Discount %" keyboardType="numeric" value={newPromo.discount} onChangeText={(t) => setNewPromo({...newPromo, discount: t})} />
                  <TextInput style={[styles.inputSmall, { flex: 1 }]} placeholder="Max Uses" keyboardType="numeric" value={newPromo.maxUses} onChangeText={(t) => setNewPromo({...newPromo, maxUses: t})} />
                </View>
                <TouchableOpacity 
                  style={styles.saveAddBtn} 
                  onPress={() => {
                    if(newPromo.code && newPromo.discount) {
                      setPromoCodes([...promoCodes, newPromo]);
                      setNewPromo({ code: '', discount: '', maxUses: '' });
                      setShowAddPromo(false);
                    }
                  }}
                >
                  <Text style={styles.saveAddBtnText}>Save Promo Code</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Seating / Table Allocation */}
          <View style={styles.advancedSection}>
            <View style={styles.advancedSectionHeader}>
              <Text style={styles.label}>Table & Seat Allocation</Text>
              <TouchableOpacity onPress={() => setShowAddSeat(!showAddSeat)}>
                <Text style={styles.addText}>{showAddSeat ? 'Cancel' : '+ Add Table'}</Text>
              </TouchableOpacity>
            </View>
            {seatingPlans.map((s, index) => (
              <View key={index} style={styles.ticketCard}>
                <View>
                  <Text style={styles.ticketName}>{s.name}</Text>
                  <Text style={styles.ticketDetails}>Seats: {s.capacity} • Price: ₦{s.price}</Text>
                </View>
                <TouchableOpacity onPress={() => setSeatingPlans(seatingPlans.filter((_, i) => i !== index))}>
                  <Ionicons name="trash-outline" size={20} color="#ff4444" />
                </TouchableOpacity>
              </View>
            ))}
            {showAddSeat && (
              <View style={styles.addFormCard}>
                <TextInput style={styles.inputSmall} placeholder="Table Name (e.g. VVIP Table 1)" value={newSeat.name} onChangeText={(t) => setNewSeat({...newSeat, name: t})} />
                <View style={styles.row}>
                  <TextInput style={[styles.inputSmall, { flex: 1, marginRight: 10 }]} placeholder="Seats Capacity" keyboardType="numeric" value={newSeat.capacity} onChangeText={(t) => setNewSeat({...newSeat, capacity: t})} />
                  <TextInput style={[styles.inputSmall, { flex: 1 }]} placeholder="Total Price" keyboardType="numeric" value={newSeat.price} onChangeText={(t) => setNewSeat({...newSeat, price: t})} />
                </View>
                <TouchableOpacity 
                  style={styles.saveAddBtn} 
                  onPress={() => {
                    if(newSeat.name && newSeat.price) {
                      setSeatingPlans([...seatingPlans, newSeat]);
                      setNewSeat({ name: '', capacity: '', price: '' });
                      setShowAddSeat(false);
                    }
                  }}
                >
                  <Text style={styles.saveAddBtnText}>Save Table</Text>
                </TouchableOpacity>
              </View>
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

          {/* Action Buttons */}
          <View style={styles.buttonContainerTop}>
             {/* Save to Draft Button */}
             <TouchableOpacity
              style={styles.draftButton}
              onPress={handleSaveToDraft}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <Text style={styles.draftButtonText}>
                {isSubmitting ? 'Saving...' : '📝 Save Draft'}
              </Text>
            </TouchableOpacity>

            {/* Schedule Publishing Button */}
            <TouchableOpacity
              style={styles.scheduleButton}
              onPress={() => setShowScheduleModal(true)}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <Text style={styles.scheduleButtonText}>
                {isSubmitting ? 'Scheduling...' : '📅 Schedule'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.buttonContainerBottom}>
            {/* Create Event Button */}
            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreateEvent}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <Text style={styles.createButtonText}>
                {isSubmitting ? 'Publishing...' : 'Publish Event Now'}
              </Text>
            </TouchableOpacity>
          </View>

        </Animated.View>
      </ScrollView>

      <Modal
        visible={showScheduleModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowScheduleModal(false)}
      >
        <View style={styles.scheduleModalOverlay}>
          <View style={styles.scheduleSheet}>
            <View style={styles.scheduleSheetHandle} />
            <View style={styles.scheduleHeader}>
              <View>
                <Text style={styles.scheduleTitle}>Schedule event</Text>
                <Text style={styles.scheduleSubtitle}>
                  Publish later and remind yourself on your calendar.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.scheduleCloseBtn}
                onPress={() => setShowScheduleModal(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.scheduleFlowRow}>
              <View style={styles.scheduleStepActive}>
                <Text style={styles.scheduleStepActiveText}>1</Text>
              </View>
              <View style={styles.scheduleStepLine} />
              <View style={scheduledDate ? styles.scheduleStepActive : styles.scheduleStep}>
                <Text style={scheduledDate ? styles.scheduleStepActiveText : styles.scheduleStepText}>2</Text>
              </View>
              <View style={styles.scheduleStepLine} />
              <View style={addCalendarReminder ? styles.scheduleStepActive : styles.scheduleStep}>
                <Text style={addCalendarReminder ? styles.scheduleStepActiveText : styles.scheduleStepText}>3</Text>
              </View>
            </View>

            <View style={styles.scheduleCard}>
              <Text style={styles.scheduleCardLabel}>Publish date and time</Text>
              <View style={styles.scheduleDateRow}>
                <TouchableOpacity
                  style={styles.scheduleDateBtn}
                  onPress={() => setShowSchedulePicker(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="calendar-outline" size={18} color="#5A31F4" />
                  <Text style={[
                    styles.scheduleDateBtnText,
                    !scheduledDate && styles.datePickerPlaceholder,
                  ]}>
                    {formatDisplayDate(scheduledDate)}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.scheduleDateBtn}
                  onPress={() => {
                    if (!scheduledDate) {
                      Toast.show({
                        type: 'info',
                        text1: 'Pick a date first',
                      });
                      return;
                    }
                    setShowScheduleTimePicker(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="time-outline" size={18} color="#5A31F4" />
                  <Text style={[
                    styles.scheduleDateBtnText,
                    !scheduledDate && styles.datePickerPlaceholder,
                  ]}>
                    {formatDisplayTime(scheduledDate)}
                  </Text>
                </TouchableOpacity>
              </View>

              {showSchedulePicker && (
                <DateTimePicker
                  value={scheduledDate || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  minimumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    setShowSchedulePicker(false);
                    if (selectedDate) {
                      const updated = scheduledDate ? new Date(scheduledDate) : new Date();
                      updated.setFullYear(
                        selectedDate.getFullYear(),
                        selectedDate.getMonth(),
                        selectedDate.getDate()
                      );
                      setScheduledDate(updated);
                      setShowScheduleTimePicker(true);
                    }
                  }}
                />
              )}

              {showScheduleTimePicker && (
                <DateTimePicker
                  value={scheduledDate || new Date()}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedTime) => {
                    setShowScheduleTimePicker(false);
                    if (selectedTime && scheduledDate) {
                      const updated = new Date(scheduledDate);
                      updated.setHours(selectedTime.getHours());
                      updated.setMinutes(selectedTime.getMinutes());
                      setScheduledDate(updated);
                    }
                  }}
                />
              )}

              {scheduledDate && (
                <View style={styles.schedulePreview}>
                  <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                  <Text style={styles.schedulePreviewText}>
                    This event will publish on {formatDisplayDate(scheduledDate)} at {formatDisplayTime(scheduledDate)}.
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.scheduleCard}>
              <View style={styles.scheduleReminderRow}>
                <View style={styles.scheduleReminderIcon}>
                  <Ionicons name="notifications-outline" size={18} color="#5A31F4" />
                </View>
                <View style={styles.scheduleReminderTextWrap}>
                  <Text style={styles.scheduleReminderTitle}>Add calendar reminder</Text>
                  <Text style={styles.scheduleReminderText}>
                    Venire will add a reminder to your device calendar 15 minutes before publishing.
                  </Text>
                </View>
                <Switch
                  value={addCalendarReminder}
                  onValueChange={setAddCalendarReminder}
                  trackColor={{ false: '#ddd', true: '#5A31F4' }}
                  thumbColor="#fff"
                />
              </View>
            </View>

            <View style={styles.scheduleSummaryCard}>
              <Text style={styles.scheduleSummaryTitle}>Schedule summary</Text>
              <View style={styles.scheduleSummaryRow}>
                <Text style={styles.scheduleSummaryLabel}>Event</Text>
                <Text style={styles.scheduleSummaryValue} numberOfLines={1}>
                  {form.name || 'Untitled event'}
                </Text>
              </View>
              <View style={styles.scheduleSummaryRow}>
                <Text style={styles.scheduleSummaryLabel}>Event starts</Text>
                <Text style={styles.scheduleSummaryValue} numberOfLines={1}>
                  {startDateTime
                    ? `${formatDisplayDate(startDateTime)} • ${formatDisplayTime(startDateTime)}`
                    : 'Not selected'}
                </Text>
              </View>
              <View style={styles.scheduleSummaryRow}>
                <Text style={styles.scheduleSummaryLabel}>Media</Text>
                <Text style={styles.scheduleSummaryValue}>
                  {selectedMedia.length} file{selectedMedia.length === 1 ? '' : 's'}
                </Text>
              </View>
            </View>

            <View style={styles.scheduleActions}>
              <TouchableOpacity
                style={styles.scheduleCancelBtn}
                onPress={() => setShowScheduleModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.scheduleCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.scheduleConfirmBtn,
                  !scheduledDate && styles.scheduleConfirmBtnDisabled,
                ]}
                onPress={() => handleScheduleEvent()}
                disabled={!scheduledDate || isSubmitting}
                activeOpacity={0.8}
              >
                <Text style={styles.scheduleConfirmText}>
                  {isSubmitting ? 'Scheduling...' : 'Schedule Event'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <CustomKeyboardInput
        visible={composerVisible}
        value={form.description}
        onChangeText={(text) => handleChange('description', text)}
        placeholder="Tell people about your event..."
        label="Description"
        onSubmit={() => {
          setComposerVisible(false);
        }}
        onClose={() => setComposerVisible(false)}
        autoFocus={true}
      />
    </KeyboardAvoidingView>
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
  datePickerRow: {
    flexDirection: "row",
    gap: 10,
  },
  datePickerBtn: {
    flex: 1.4,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E8DBFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "#F8F4FF",
  },
  timePickerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E8DBFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "#F8F4FF",
  },
  datePickerBtnText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: "#333",
    flex: 1,
  },
  datePickerPlaceholder: {
    color: "#AAAAAA",
  },
  dateConfirmRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  dateConfirmText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "#15803D",
    flex: 1,
  },
  aiBannerContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 2, // for gradient border effect
    backgroundColor: '#EBE2FF',
  },
  aiBannerContent: {
    backgroundColor: '#F3EDFF',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D4C4FF',
  },
  aiIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#5A31F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  aiTextContainer: {
    flex: 1,
  },
  aiBannerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#2D1B69',
    marginBottom: 2,
  },
  aiBannerDesc: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#665B8B',
    lineHeight: 16,
  },
  dateClearText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: "#EF4444",
  },
  optionalLabel: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "#999",
  },
  hashtagInputRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  hashtagTextInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E8DBFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: "#333",
    fontFamily: "Poppins_400Regular",
    backgroundColor: "#FAFAFA",
  },
  hashtagAddBtn: {
    backgroundColor: "#5A31F4",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  hashtagAddBtnDisabled: {
    backgroundColor: "#E8DBFF",
  },
  hashtagAddBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#FFFFFF",
  },
  hashtagsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  hashtagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F3EDFF",
    borderWidth: 1,
    borderColor: "#E8DBFF",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  hashtagChipText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: "#5A31F4",
  },
  hashtagHint: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "#999",
    marginTop: 6,
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
    fontFamily: 'Poppins_600SemiBold',
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
  advancedSection: {
    marginBottom: 20,
    backgroundColor: '#FAFAFA',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8DBFF',
  },
  advancedSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  addText: {
    color: '#5A31F4',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
  },
  ticketCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    marginBottom: 8,
  },
  ticketName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#333',
  },
  ticketTypeBadge: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#999',
    textTransform: 'uppercase',
  },
  ticketDetails: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  addFormCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8DBFF',
    marginTop: 8,
  },
  inputSmall: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
    fontFamily: 'Poppins_400Regular',
    backgroundColor: '#fafafa',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
    marginHorizontal: 2,
    borderRadius: 6,
  },
  typeBtnActive: {
    backgroundColor: '#5A31F4',
    borderColor: '#5A31F4',
  },
  typeBtnText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: '#666',
  },
  typeBtnTextActive: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: '#fff',
  },
  saveAddBtn: {
    backgroundColor: '#F3EDFF',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 5,
  },
  saveAddBtnText: {
    color: '#5A31F4',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
  },
  buttonContainerTop: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  buttonContainerBottom: {
    marginTop: 12,
  },
  scheduleButton: {
    flex: 1,
    backgroundColor: '#FDECCD',
    borderWidth: 1,
    borderColor: '#FAB843',
    borderRadius: 12,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduleButtonText: {
    color: '#FAB843',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  scheduleModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  scheduleSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: height * 0.9,
  },
  scheduleSheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 16,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 18,
  },
  scheduleTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    color: '#1A1A1A',
  },
  scheduleSubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#777',
    marginTop: 4,
    lineHeight: 19,
    maxWidth: width * 0.72,
  },
  scheduleCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduleFlowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  scheduleStep: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduleStepActive: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#5A31F4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduleStepText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#999',
  },
  scheduleStepActiveText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  scheduleStepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E8DBFF',
  },
  scheduleCard: {
    backgroundColor: '#F8F4FF',
    borderWidth: 1,
    borderColor: '#E8DBFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  scheduleCardLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#333',
    marginBottom: 10,
  },
  scheduleDateRow: {
    flexDirection: 'row',
    gap: 10,
  },
  scheduleDateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8DBFF',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  scheduleDateBtnText: {
    flex: 1,
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: '#333',
  },
  schedulePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  schedulePreviewText: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#15803D',
    lineHeight: 17,
  },
  scheduleReminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scheduleReminderIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduleReminderTextWrap: {
    flex: 1,
  },
  scheduleReminderTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#333',
  },
  scheduleReminderText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#777',
    lineHeight: 16,
    marginTop: 2,
  },
  scheduleSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  scheduleSummaryTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: '#1A1A1A',
    marginBottom: 10,
  },
  scheduleSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 5,
  },
  scheduleSummaryLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#888',
  },
  scheduleSummaryValue: {
    flex: 1,
    textAlign: 'right',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#333',
  },
  scheduleActions: {
    flexDirection: 'row',
    gap: 10,
  },
  scheduleCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E8DBFF',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  scheduleCancelText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#5A31F4',
  },
  scheduleConfirmBtn: {
    flex: 1.4,
    backgroundColor: '#5A31F4',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  scheduleConfirmBtnDisabled: {
    backgroundColor: '#CFC3FF',
  },
  scheduleConfirmText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
});
