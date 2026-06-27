import React, { useState, useRef, useEffect, useCallback } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Image,
  ActivityIndicator,
  FlatList,
  Dimensions,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import EventSource from 'react-native-sse';
import api from '../../utils/axiosInstance';
import * as ImagePicker from 'expo-image-picker';


const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BASE_URL = 'https://venire-backend.onrender.com/api/v1';
const AI_CHAT_INDEX_KEY = 'venire_ai_chat_ids';

// ─── Prompt Chips ────────────────────────────────────────────────────────────
const PROMPT_CHIPS = [
  '🎉 Plan a birthday party',
  '💼 Tech networking event',
  '🎶 Afrobeats concert',
  '🍽️ Food festival in Lagos',
  '👗 Fashion show in Abuja',
  '🏋️ Fitness bootcamp',
];

const createWelcomeMessage = () => ({
  id: '1',
  role: 'assistant',
  type: 'agent_message',
  text: "Hi! I'm Venire AI ✨\n\nTell me about the event you want to create. I'll generate the title, description, find venues, suggest vendors, and build your full schedule automatically.",
});

const createDefaultPayload = () => ({
  name: 'Your Event',
  description: '',
  address: 'Location TBA',
  start: null,
  ticketAmount: '0',
  isTicket: false,
  posterUrl: null,
  category: 'General',
  schedule: [],
  socialCaption: '',
  tickets: [],
});

// ─── Agent Action Icons ──────────────────────────────────────────────────────
const TOOL_ICONS = {
  generate_event_details: { icon: 'sparkles', color: '#8B5CF6' },
  search_vendors:         { icon: 'storefront-outline', color: '#06B6D4' },
  search_venues:          { icon: 'location-outline', color: '#10B981' },
  message_vendor:         { icon: 'chatbubble-ellipses-outline', color: '#F59E0B' },
  generate_event_poster_prompt: { icon: 'image-outline', color: '#EC4899' },
  create_calendar_event:  { icon: 'calendar-outline', color: '#3B82F6' },
};

// ─── AgentActionCard ─────────────────────────────────────────────────────────
function AgentActionCard({ tool, content, done }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (done) {
      Animated.spring(checkAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 6 }).start();
    }
  }, [done]);

  const { icon, color } = TOOL_ICONS[tool] || { icon: 'flash-outline', color: '#5A31F4' };
  const label = tool?.replace(/_/g, ' ') || 'Processing';

  return (
    <Animated.View style={[styles.actionCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }, done && styles.actionCardDone]}>
      <View style={[styles.actionIconBg, { backgroundColor: done ? '#D1FAE520' : color + '20' }]}>
        <Ionicons name={done ? 'checkmark' : icon} size={15} color={done ? '#10B981' : color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.actionLabel, { color: done ? '#10B981' : color }]}>{label}</Text>
        <Text style={styles.actionContent} numberOfLines={2}>{content}</Text>
      </View>
      {done
        ? <Animated.View style={{ transform: [{ scale: checkAnim }] }}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          </Animated.View>
        : <ActivityIndicator size="small" color={color} />
      }
    </Animated.View>
  );
}

// ─── VendorCard ──────────────────────────────────────────────────────────────
function VendorCard({ vendor, onSelect }) {
  return (
    <TouchableOpacity style={styles.suggestionCard} onPress={() => onSelect(vendor)} activeOpacity={0.8}>
      <Image
        source={{ uri: vendor.avatarUrl || 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=400' }}
        style={styles.suggestionImg}
      />
      <View style={styles.suggestionBadge}>
        <Ionicons name="storefront" size={10} color="#06B6D4" />
        <Text style={[styles.suggestionBadgeText, { color: '#06B6D4' }]}>Vendor</Text>
      </View>
      <Text style={styles.suggestionName} numberOfLines={1}>{vendor.name}</Text>
      <Text style={styles.suggestionSub} numberOfLines={1}>{vendor.category} · {vendor.location}</Text>
      <Text style={styles.suggestionPrice}>{vendor.priceRange}</Text>
      <View style={styles.ratingRow}>
        <Ionicons name="star" size={11} color="#F59E0B" />
        <Text style={styles.ratingText}>{vendor.rating}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── VenueCard ───────────────────────────────────────────────────────────────
function VenueCard({ venue, onSelect }) {
  return (
    <TouchableOpacity style={styles.suggestionCard} onPress={() => onSelect(venue)} activeOpacity={0.8}>
      <Image
        source={{ uri: venue.imageUrl || 'https://images.pexels.com/photos/1679825/pexels-photo-1679825.jpeg?auto=compress&cs=tinysrgb&w=400' }}
        style={styles.suggestionImg}
      />
      <View style={styles.suggestionBadge}>
        <Ionicons name="location" size={10} color="#10B981" />
        <Text style={[styles.suggestionBadgeText, { color: '#10B981' }]}>Venue</Text>
      </View>
      <Text style={styles.suggestionName} numberOfLines={1}>{venue.name}</Text>
      <Text style={styles.suggestionSub} numberOfLines={1}>{venue.address}</Text>
      <Text style={styles.suggestionPrice}>{venue.priceRange}</Text>
      <View style={styles.ratingRow}>
        <Ionicons name="people" size={11} color="#6B7280" />
        <Text style={styles.ratingText}>Fits {venue.capacity}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Message Bubble ──────────────────────────────────────────────────────────
function MessageBubble({
  msg,
  onSelectVendor,
  onSelectVenue,
  onRequestDatePick,
  onSelectOption,
  onSubmitSponsorship,
  onSubmitLocation,
  onSubmitNumber,
  onSubmitTicketing,
  onSubmitBoolean,
  onSubmitMedia,
  onSubmitEventType,
  onSubmitCurrency,
  onSubmitRawText,
  onPublish,
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current;
  const [sponsorAmount, setSponsorAmount] = useState('');
  const [locationText, setLocationText] = useState('');
  const [numberText, setNumberText] = useState('');
  const [currencyText, setCurrencyText] = useState('');
  const [ticketName, setTicketName] = useState('Regular');
  const [ticketPrice, setTicketPrice] = useState('');
  const [ticketCapacity, setTicketCapacity] = useState('');
  const [booleanAmount, setBooleanAmount] = useState('');

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const isUser = msg.role === 'user';

  if (msg.type === 'agent_action') {
    return <AgentActionCard tool={msg.tool} content={msg.text} done={msg.done} />;
  }

  if (
    msg.type === 'agent_message' &&
    !msg.answered &&
    /what type of event are you planning/i.test(msg.text || '')
  ) {
    const eventTypes = ['Wedding', 'Birthday', 'Tech mixer', 'Concert', 'Conference', 'Party'];

    return (
      <Animated.View style={[styles.messageBubble, styles.aiBubble, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.aiAvatar}>
          <Ionicons name="sparkles" size={13} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.aiText}>{msg.text}</Text>
          <View style={styles.eventTypeWrap}>
            {eventTypes.map((eventType) => (
              <TouchableOpacity
                key={eventType}
                style={styles.eventTypeBtn}
                onPress={() => onSubmitEventType(msg.id, eventType)}
                activeOpacity={0.8}
              >
                <Text style={styles.eventTypeText}>{eventType}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Animated.View>
    );
  }

  if (
    /proceed to the final step/i.test(msg.text || '')
  ) {
    return (
      <Animated.View style={[styles.messageBubble, styles.aiBubble, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.aiAvatar}>
          <Ionicons name="sparkles" size={13} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.aiText}>{msg.text}</Text>
          {!msg.answered && (
            <View style={styles.mediaChoiceWrap}>
              <TouchableOpacity
                style={styles.eventTypeBtn}
                onPress={() => onSubmitRawText(msg.id, 'Yes', 'Your event payload is ready.\nHanding off to the create event flow now.')}
                activeOpacity={0.8}
              >
                <Text style={styles.eventTypeText}>Yes</Text>
              </TouchableOpacity>
            </View>
          )}
          {msg.answered && (
            <View style={styles.datePickedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text style={styles.datePickedText}>{msg.answeredLabel}</Text>
            </View>
          )}
        </View>
      </Animated.View>
    );
  }

  if (msg.type === 'interactive_input' && msg.control === 'datetime') {
    return (
      <Animated.View style={[styles.messageBubble, styles.aiBubble, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.aiAvatar}>
          <Ionicons name="sparkles" size={13} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.aiText}>{msg.text}</Text>
          {!msg.answered && (
            <TouchableOpacity
              style={styles.datePickerBtn}
              onPress={() => onRequestDatePick(msg.id, msg.minDate, msg.field)}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar-outline" size={16} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.datePickerBtnText}>Select Date & Time</Text>
            </TouchableOpacity>
          )}
          {msg.answered && (
            <View style={styles.datePickedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text style={styles.datePickedText}>{msg.answeredLabel}</Text>
            </View>
          )}
        </View>
      </Animated.View>
    );
  }

  if (
    msg.type === 'interactive_input' &&
    (msg.control === 'select' || msg.control === 'segmented' || msg.control === 'select_or_text')
  ) {
    return (
      <Animated.View style={[styles.messageBubble, styles.aiBubble, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.aiAvatar}>
          <Ionicons name="sparkles" size={13} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.aiText}>{msg.text}</Text>
          {!msg.answered && (
            <View style={styles.selectOptionsWrap}>
              {(msg.options || []).map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={styles.selectOptionBtn}
                  onPress={() => onSelectOption(msg.id, msg.field, option)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.selectOptionText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {msg.answered && (
            <View style={styles.datePickedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text style={styles.datePickedText}>{msg.answeredLabel}</Text>
            </View>
          )}
        </View>
      </Animated.View>
    );
  }

  if (msg.type === 'interactive_input' && msg.control === 'advanced_event_fields') {
    return (
      <Animated.View style={[styles.messageBubble, styles.aiBubble, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.aiAvatar}>
          <Ionicons name="sparkles" size={13} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.aiText}>{msg.text}</Text>
          {!msg.answered && (
            <View style={styles.mediaChoiceWrap}>
              <TouchableOpacity
                style={styles.mediaSkipBtn}
                onPress={() => onSubmitRawText(msg.id, 'Skip these', 'Skip these')}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-forward-circle-outline" size={15} color="#5A31F4" />
                <Text style={styles.mediaSkipText}>Skip for now</Text>
              </TouchableOpacity>
            </View>
          )}
          {msg.answered && (
            <View style={styles.datePickedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text style={styles.datePickedText}>{msg.answeredLabel}</Text>
            </View>
          )}
        </View>
      </Animated.View>
    );
  }

  if (msg.type === 'interactive_input' && msg.control === 'sponsorship') {
    const submitAmount = (amount) => {
      const numericAmount = Number(amount || 0);
      onSubmitSponsorship(msg.id, numericAmount > 0, numericAmount);
    };

    return (
      <Animated.View style={[styles.messageBubble, styles.aiBubble, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.aiAvatar}>
          <Ionicons name="sparkles" size={13} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.aiText}>{msg.text}</Text>
          {!msg.answered && (
            <View style={styles.sponsorWrap}>
              <View style={styles.sponsorQuickRow}>
                <TouchableOpacity
                  style={styles.sponsorNoBtn}
                  onPress={() => submitAmount(0)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.sponsorNoText}>No sponsorship</Text>
                </TouchableOpacity>
                {[50000, 100000].map((amount) => (
                  <TouchableOpacity
                    key={amount}
                    style={styles.sponsorAmountBtn}
                    onPress={() => submitAmount(amount)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.sponsorAmountText}>₦{amount.toLocaleString()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.sponsorInputRow}>
                <TextInput
                  style={styles.sponsorInput}
                  value={sponsorAmount}
                  onChangeText={(text) => setSponsorAmount(text.replace(/[^0-9]/g, ''))}
                  placeholder="Custom amount"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                />
                <TouchableOpacity
                  style={[
                    styles.sponsorSubmitBtn,
                    !sponsorAmount && styles.sponsorSubmitBtnDisabled,
                  ]}
                  onPress={() => submitAmount(sponsorAmount)}
                  disabled={!sponsorAmount}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark" size={16} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          {msg.answered && (
            <View style={styles.datePickedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text style={styles.datePickedText}>{msg.answeredLabel}</Text>
            </View>
          )}
        </View>
      </Animated.View>
    );
  }

  if (msg.type === 'interactive_input' && msg.control === 'location') {
    return (
      <Animated.View style={[styles.messageBubble, styles.aiBubble, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.aiAvatar}>
          <Ionicons name="sparkles" size={13} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.aiText}>{msg.text}</Text>
          {!msg.answered && (
            <View style={styles.locationWrap}>
              <View style={styles.locationInputRow}>
                <Ionicons name="location-outline" size={17} color="#5A31F4" />
                <TextInput
                  style={styles.locationInput}
                  value={locationText}
                  onChangeText={setLocationText}
                  placeholder="e.g. Victoria Island, Lagos"
                  placeholderTextColor="#9CA3AF"
                  returnKeyType="done"
                  onSubmitEditing={() => onSubmitLocation(msg.id, locationText)}
                />
              </View>
              <View style={styles.locationQuickRow}>
                {['Lagos, Nigeria', 'Lekki Phase 1, Lagos', 'Victoria Island, Lagos'].map((location) => (
                  <TouchableOpacity
                    key={location}
                    style={styles.locationQuickBtn}
                    onPress={() => onSubmitLocation(msg.id, location)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.locationQuickText}>{location}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={[
                  styles.locationSubmitBtn,
                  (!locationText.trim() || isStreaming) && styles.locationSubmitBtnDisabled,
                ]}
                onPress={() => onSubmitLocation(msg.id, locationText)}
                disabled={!locationText.trim() || isStreaming}
                activeOpacity={0.8}
              >
                <Text style={styles.locationSubmitText}>Use this location</Text>
              </TouchableOpacity>
            </View>
          )}
          {msg.answered && (
            <View style={styles.datePickedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text style={styles.datePickedText}>{msg.answeredLabel}</Text>
            </View>
          )}
        </View>
      </Animated.View>
    );
  }

  if (msg.type === 'interactive_input' && msg.control === 'number') {
    const submitNumber = (value) => {
      const cleanValue = String(value || '').replace(/[^0-9]/g, '');
      if (!cleanValue) return;
      onSubmitNumber(msg.id, msg.field, cleanValue);
    };

    return (
      <Animated.View style={[styles.messageBubble, styles.aiBubble, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.aiAvatar}>
          <Ionicons name="sparkles" size={13} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.aiText}>{msg.text}</Text>
          {!msg.answered && (
            <View style={styles.numberWrap}>
              <View style={styles.numberInputRow}>
                <Ionicons name="people-outline" size={17} color="#5A31F4" />
                <TextInput
                  style={styles.numberInput}
                  value={numberText}
                  onChangeText={(text) => setNumberText(text.replace(/[^0-9]/g, ''))}
                  placeholder="Expected number"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  returnKeyType="done"
                  onSubmitEditing={() => submitNumber(numberText)}
                />
              </View>
              <View style={styles.numberQuickRow}>
                {['50', '100', '200', '500'].map((value) => (
                  <TouchableOpacity
                    key={value}
                    style={styles.numberQuickBtn}
                    onPress={() => submitNumber(value)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.numberQuickText}>{value}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={[
                  styles.numberSubmitBtn,
                  !numberText && styles.numberSubmitBtnDisabled,
                ]}
                onPress={() => submitNumber(numberText)}
                disabled={!numberText}
                activeOpacity={0.8}
              >
                <Text style={styles.numberSubmitText}>Use this number</Text>
              </TouchableOpacity>
            </View>
          )}
          {msg.answered && (
            <View style={styles.datePickedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text style={styles.datePickedText}>{msg.answeredLabel}</Text>
            </View>
          )}
        </View>
      </Animated.View>
    );
  }

  if (msg.type === 'interactive_input' && msg.control === 'currency') {
    const submitCurrency = (value) => {
      const cleanValue = String(value || '').replace(/[^0-9]/g, '');
      if (!cleanValue) return;
      onSubmitCurrency(msg.id, msg.field, cleanValue, msg.responseFormat);
    };

    return (
      <Animated.View style={[styles.messageBubble, styles.aiBubble, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.aiAvatar}>
          <Ionicons name="sparkles" size={13} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.aiText}>{msg.text}</Text>
          {!msg.answered && (
            <View style={styles.currencyWrap}>
              <View style={styles.currencyInputRow}>
                <Text style={styles.currencySymbol}>₦</Text>
                <TextInput
                  style={styles.currencyInput}
                  value={currencyText}
                  onChangeText={(text) => setCurrencyText(text.replace(/[^0-9]/g, ''))}
                  placeholder="Enter amount"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  returnKeyType="done"
                  onSubmitEditing={() => submitCurrency(currencyText)}
                />
              </View>
              <View style={styles.currencyQuickRow}>
                {[500000, 1000000, 5000000].map((amount) => (
                  <TouchableOpacity
                    key={amount}
                    style={styles.currencyQuickBtn}
                    onPress={() => submitCurrency(amount)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.currencyQuickText}>₦{amount.toLocaleString()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={[
                  styles.currencySubmitBtn,
                  !currencyText && styles.currencySubmitBtnDisabled,
                ]}
                onPress={() => submitCurrency(currencyText)}
                disabled={!currencyText}
                activeOpacity={0.8}
              >
                <Text style={styles.currencySubmitText}>Use this budget</Text>
              </TouchableOpacity>
            </View>
          )}
          {msg.answered && (
            <View style={styles.datePickedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text style={styles.datePickedText}>{msg.answeredLabel}</Text>
            </View>
          )}
        </View>
      </Animated.View>
    );
  }

  if (msg.type === 'interactive_input' && msg.control === 'ticket_builder') {
    const submitFreeEntry = () => {
      onSubmitTicketing(msg.id, {
        isTicket: false,
        ticketAmount: 0,
        tickets: [],
      });
    };

    const submitPaidTicket = (priceValue, capacityValue = ticketCapacity, nameValue = ticketName) => {
      const cleanPrice = String(priceValue || '').replace(/[^0-9]/g, '');
      if (!cleanPrice) return;
      const cleanCapacity = String(capacityValue || '').replace(/[^0-9]/g, '');
      const finalName = nameValue?.trim() || 'Regular';
      const ticket = {
        name: finalName,
        price: cleanPrice,
        capacity: cleanCapacity || '0',
        type: finalName.toLowerCase().includes('vip') ? 'vip' : 'regular',
        isInviteOnly: false,
      };

      onSubmitTicketing(msg.id, {
        isTicket: true,
        ticketAmount: Number(cleanPrice) || 0,
        tickets: [ticket],
      });
    };

    return (
      <Animated.View style={[styles.messageBubble, styles.aiBubble, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.aiAvatar}>
          <Ionicons name="sparkles" size={13} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.aiText}>{msg.text}</Text>
          {!msg.answered && (
            <View style={styles.ticketBuilderWrap}>
              <TouchableOpacity
                style={styles.ticketFreeBtn}
                onPress={submitFreeEntry}
                activeOpacity={0.8}
              >
                <Ionicons name="pricetag-outline" size={14} color="#15803D" />
                <Text style={styles.ticketFreeText}>Free Entry</Text>
              </TouchableOpacity>

              <View style={styles.ticketQuickRow}>
                {[3000, 5000, 10000].map((amount) => (
                  <TouchableOpacity
                    key={amount}
                    style={styles.ticketQuickBtn}
                    onPress={() => submitPaidTicket(amount, '')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.ticketQuickText}>₦{amount.toLocaleString()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.ticketInput}
                value={ticketName}
                onChangeText={setTicketName}
                placeholder="Ticket name"
                placeholderTextColor="#9CA3AF"
              />
              <View style={styles.ticketInputRow}>
                <TextInput
                  style={styles.ticketInput}
                  value={ticketPrice}
                  onChangeText={(text) => setTicketPrice(text.replace(/[^0-9]/g, ''))}
                  placeholder="Price"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                />
                <TextInput
                  style={styles.ticketInput}
                  value={ticketCapacity}
                  onChangeText={(text) => setTicketCapacity(text.replace(/[^0-9]/g, ''))}
                  placeholder="Capacity"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                />
              </View>
              <TouchableOpacity
                style={[
                  styles.ticketSubmitBtn,
                  !ticketPrice && styles.ticketSubmitBtnDisabled,
                ]}
                onPress={() => submitPaidTicket(ticketPrice)}
                disabled={!ticketPrice}
                activeOpacity={0.8}
              >
                <Text style={styles.ticketSubmitText}>Use this ticket</Text>
              </TouchableOpacity>
            </View>
          )}
          {msg.answered && (
            <View style={styles.datePickedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text style={styles.datePickedText}>{msg.answeredLabel}</Text>
            </View>
          )}
        </View>
      </Animated.View>
    );
  }

  if (msg.type === 'interactive_input' && msg.control === 'boolean') {
    const isVendorNeed = msg.field === 'vendorNeed';
    const submitBoolean = (value, amount = '') => {
      onSubmitBoolean(msg.id, msg.field, value, amount);
    };

    return (
      <Animated.View style={[styles.messageBubble, styles.aiBubble, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.aiAvatar}>
          <Ionicons name="sparkles" size={13} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.aiText}>{msg.text}</Text>
          {!msg.answered && (
            <View style={styles.booleanWrap}>
              <View style={styles.booleanQuickRow}>
                <TouchableOpacity
                  style={styles.booleanYesBtn}
                  onPress={() => submitBoolean(true, booleanAmount)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-circle-outline" size={14} color="#FFF" />
                  <Text style={styles.booleanYesText}>Yes</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.booleanNoBtn}
                  onPress={() => submitBoolean(false)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close-circle-outline" size={14} color="#4B5563" />
                  <Text style={styles.booleanNoText}>No</Text>
                </TouchableOpacity>
              </View>

              {isVendorNeed && (
                <View style={styles.booleanInputRow}>
                  <TextInput
                    style={styles.booleanInput}
                    value={booleanAmount}
                    onChangeText={(text) => setBooleanAmount(text.replace(/[^0-9]/g, ''))}
                    placeholder="Vendor budget, optional"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                  />
                  <TouchableOpacity
                    style={[
                      styles.booleanSubmitBtn,
                      !booleanAmount && styles.booleanSubmitBtnDisabled,
                    ]}
                    onPress={() => submitBoolean(true, booleanAmount)}
                    disabled={!booleanAmount}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="send" size={15} color="#FFF" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
          {msg.answered && (
            <View style={styles.datePickedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text style={styles.datePickedText}>{msg.answeredLabel}</Text>
            </View>
          )}
        </View>
      </Animated.View>
    );
  }

  if (msg.type === 'interactive_input' && (msg.control === 'media_or_generate' || msg.control === 'media_upload_or_generate')) {
    return (
      <Animated.View style={[styles.messageBubble, styles.aiBubble, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.aiAvatar}>
          <Ionicons name="sparkles" size={13} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.aiText}>{msg.text}</Text>
          {!msg.answered && (
            <View style={styles.mediaChoiceWrap}>
              <TouchableOpacity
                style={styles.mediaUploadBtn}
                onPress={() => onSubmitMedia(msg.id, 'upload')}
                activeOpacity={0.8}
              >
                <Ionicons name="cloud-upload-outline" size={15} color="#FFF" />
                <Text style={styles.mediaUploadText}>📸 Upload my image</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.mediaGenerateBtn}
                onPress={() => onSubmitMedia(msg.id, 'generate')}
                activeOpacity={0.8}
              >
                <Ionicons name="color-wand-outline" size={15} color="#FFF" />
                <Text style={styles.mediaGenerateText}>🎨 Generate AI flyer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.mediaSkipBtn}
                onPress={() => onSubmitMedia(msg.id, 'skip')}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-forward-circle-outline" size={15} color="#5A31F4" />
                <Text style={styles.mediaSkipText}>Skip for now</Text>
              </TouchableOpacity>
            </View>
          )}
          {msg.answered && (
            <View style={styles.datePickedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text style={styles.datePickedText}>{msg.answeredLabel}</Text>
            </View>
          )}
        </View>
      </Animated.View>
    );
  }

  if (msg.type === 'vendor_suggestions') {
    const groups = msg.groups || [];
    const allVendors = msg.vendors?.length > 0 ? msg.vendors : groups.flatMap(g => g.vendors || []);

    return (
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], marginBottom: 14 }}>
        <Text style={styles.suggestionHeader}>
          <Ionicons name="storefront-outline" size={13} color="#06B6D4" /> Vendor Suggestions
        </Text>
        {allVendors.length > 0 ? (
          <FlatList
            data={allVendors}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, i) => `vendor-${item._id || i}`}
            renderItem={({ item }) => <VendorCard vendor={item} onSelect={onSelectVendor} />}
            contentContainerStyle={{ paddingLeft: 2, paddingRight: 10 }}
          />
        ) : (
          <View style={styles.emptyVendorBox}>
            <Ionicons name="search-outline" size={18} color="#6B7280" />
            <Text style={styles.emptyVendorTitle}>No approved vendors matched this budget.</Text>
            {groups.length > 0 && (
              <View style={styles.vendorBudgetList}>
                {groups.map((group, index) => (
                  <Text key={`${group.category}-${index}`} style={styles.vendorBudgetText}>
                    {group.category}: ₦{Number(group.budgetAmount || 0).toLocaleString()}
                  </Text>
                ))}
              </View>
            )}
            <Text style={styles.emptyVendorHint}>
              Increase the budget or choose No when asked to continue without vendor suggestions.
            </Text>
          </View>
        )}
      </Animated.View>
    );
  }

  if (msg.type === 'venue_suggestions') {
    return (
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], marginBottom: 14 }}>
        <Text style={styles.suggestionHeader}>
          <Ionicons name="location-outline" size={13} color="#10B981" /> Venue Suggestions
        </Text>
        <FlatList
          data={msg.venues}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item, i) => `venue-${i}`}
          renderItem={({ item }) => <VenueCard venue={item} onSelect={onSelectVenue} />}
          contentContainerStyle={{ paddingLeft: 2, paddingRight: 10 }}
        />
      </Animated.View>
    );
  }

  const isFinalMessage = 
    !isUser &&
    msg.text && (
      msg.text.includes("Your event has been saved as a draft") ||
      msg.text.includes("Your event is scheduled") ||
      msg.text.includes("Handing off to the create event flow now")
    );

  return (
    <Animated.View
      style={[
        styles.messageBubble,
        isUser ? styles.userBubble : styles.aiBubble,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {!isUser && (
        <View style={styles.aiAvatar}>
          <Ionicons name="sparkles" size={13} color="#FFF" />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={[styles.messageText, isUser ? styles.userText : styles.aiText]}>
          {msg.text}
        </Text>
        {isFinalMessage && (
          <TouchableOpacity 
            style={[styles.publishBtn, { alignSelf: 'flex-start', marginTop: 10 }]} 
            onPress={onPublish} 
            activeOpacity={0.8}
          >
            <Ionicons name="send" size={13} color="#FFF" style={{ marginRight: 5 }} />
            <Text style={styles.publishBtnText}>Publish Event</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}


// ─── Main Component ──────────────────────────────────────────────────────────
export default function AICreateEvent() {
  const router = useRouter();
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  // Stores pending date_picker/input_request info so agent_message can render the right bubble
  const pendingInputRef = useRef(null);
  const pendingDateFieldRef = useRef(null);

  const [messages, setMessages] = useState([createWelcomeMessage()]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeActions, setActiveActions] = useState([]); // currently-running agent steps
  const [conversationHistory, setConversationHistory] = useState([]);

  // ─── Date Picker State ────────────────────────────────────────────────────
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState('date'); // 'date' | 'time'
  const [pickedDate, setPickedDate] = useState(new Date());
  const [pendingDateMsgId, setPendingDateMsgId] = useState(null);
  const [pendingMinDate, setPendingMinDate] = useState(null);
  const [pendingDateField, setPendingDateField] = useState(null);
  const [tempDate, setTempDate] = useState(null); // stores the date across mode switches

  const [eventPayload, setEventPayload] = useState(createDefaultPayload());

  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  const previewFadeAnim = useRef(new Animated.Value(0)).current;
  const headerGlowAnim = useRef(new Animated.Value(0)).current;

  const [chatId, setChatId] = useState(null);
  const [clientSessionId] = useState(() => `client_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const [allChats, setAllChats] = useState([]);
  const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);
  const [loadingChat, setLoadingChat] = useState(true);

  const upsertChatIndex = async (chat) => {
    const normalizedChatId = chat?.chatId || chat?.id || chat?._id;
    if (!normalizedChatId) return;

    const indexedChat = {
      id: normalizedChatId,
      chatId: normalizedChatId,
      name: chat.name || chat.title || chat.eventPayload?.name || chat.payload?.name || normalizedChatId,
      date: chat.updatedAt || chat.createdAt || chat.date || new Date().toISOString(),
    };

    setAllChats(prev => {
      const withoutDuplicate = prev.filter(item => (item.chatId || item.id) !== normalizedChatId);
      return [indexedChat, ...withoutDuplicate];
    });

    try {
      const existing = await AsyncStorage.getItem(AI_CHAT_INDEX_KEY);
      const parsed = existing ? JSON.parse(existing) : [];
      const withoutDuplicate = parsed.filter(item => (item.chatId || item.id) !== normalizedChatId);
      await AsyncStorage.setItem(
        AI_CHAT_INDEX_KEY,
        JSON.stringify([indexedChat, ...withoutDuplicate])
      );
    } catch (err) {
      console.log('Could not save AI chat index:', err?.message);
    }
  };

  const normalizeBackendMessages = (backendMessages) => {
    if (!Array.isArray(backendMessages) || backendMessages.length === 0) {
      return [createWelcomeMessage()];
    }

    return backendMessages.map((message, index) => ({
      id: message.id || message._id || `${Date.now()}_${index}`,
      role: message.role === 'assistant' ? 'assistant' : 'user',
      type: message.type || (message.role === 'assistant' ? 'agent_message' : 'user'),
      text: message.text || message.content || '',
      ...message,
    }));
  };

  const normalizeChatResponse = (data) => {
    const root = data?.data || data || {};
    const chat = root.chat || root.session || root;

    return {
      chatId: root.chatId || chat.chatId || chat._id || chat.id,
      messages: chat.messages || root.messages || [],
      payload: chat.eventPayload || chat.payload || root.eventPayload || root.payload,
      history: chat.history || root.history || [],
      chats: root.chats || root.sessions || [],
    };
  };

  const applyBackendChat = (data) => {
    const normalized = normalizeChatResponse(data);
    if (normalized.chatId) setChatId(normalized.chatId);
    setMessages(normalizeBackendMessages(normalized.messages));
    setEventPayload(normalized.payload || createDefaultPayload());
    setConversationHistory(normalized.history);
    if (normalized.chatId) {
      upsertChatIndex({
        chatId: normalized.chatId,
        name: normalized.payload?.name || normalized.chatId,
      });
    }
    if (normalized.chats.length > 0) {
      const backendChats = normalized.chats.map((chat) => ({
        id: chat.chatId || chat._id || chat.id,
        chatId: chat.chatId || chat._id || chat.id,
        name: chat.name || chat.title || chat.eventPayload?.name || chat.payload?.name || 'AI Event Plan',
        date: chat.updatedAt || chat.createdAt || new Date().toISOString(),
        ...chat,
      }));
      setAllChats(backendChats);
      AsyncStorage.setItem(AI_CHAT_INDEX_KEY, JSON.stringify(backendChats)).catch(() => {});
    }
  };

  const openBackendChat = async (requestedChatId = null) => {
    try {
      setLoadingChat(true);
      const body = {
        type: 'ai_chat',
        clientSessionId,
        ...(requestedChatId && { chatId: requestedChatId }),
      };
      const response = await api.post('/ai/chats', body);
      applyBackendChat(response.data);
      return normalizeChatResponse(response.data).chatId;
    } catch (err) {
      console.log('Could not load AI chat from backend:', err?.response?.data || err?.message);
      Toast.show({
        type: 'error',
        text1: 'AI chat unavailable',
        text2: 'Could not connect to the AI chat session.',
      });
      return null;
    } finally {
      setLoadingChat(false);
    }
  };

  // ─── Load backend chat/session on mount ──────────────────────────────────
  useEffect(() => {
    const bootChat = async () => {
      try {
        const existing = await AsyncStorage.getItem(AI_CHAT_INDEX_KEY);
        const parsed = existing ? JSON.parse(existing) : [];
        if (parsed.length > 0) {
          setAllChats(parsed);
          await openBackendChat(parsed[0].chatId || parsed[0].id);
          return;
        }
      } catch (err) {
        console.log('Could not read AI chat index:', err?.message);
      }

      await openBackendChat();
    };

    bootChat();

    Animated.timing(previewFadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(headerGlowAnim, { toValue: 1, duration: 2000, useNativeDriver: false }),
        Animated.timing(headerGlowAnim, { toValue: 0, duration: 2000, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const handleNewChat = async () => {
    setMessages([createWelcomeMessage()]);
    setEventPayload(createDefaultPayload());
    setConversationHistory([]);
    setIsHistoryModalVisible(false);
    await openBackendChat();
  };

  const loadChat = async (chat) => {
    const selectedChatId = chat.chatId || chat.id || chat._id;
    setIsHistoryModalVisible(false);
    if (selectedChatId) await openBackendChat(selectedChatId);
  };

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
  }, []);

  const appendMessage = useCallback((msg) => {
    setMessages(prev => [...prev, { id: Date.now().toString() + Math.random(), ...msg }]);
    scrollToBottom();
  }, [scrollToBottom]);

  // ─── SSE Streaming Call ──────────────────────────────────────────────────
  const handleSend = async (overrideText, apiOverrideText) => {
  const text = typeof overrideText === 'string' ? overrideText : input.trim();
  const apiText = typeof apiOverrideText === 'string' ? apiOverrideText : text;
  if (!text || loadingChat || isStreaming) return; // ← block ALL sends while streaming, not just typed ones

    const userMsg = { role: 'user', type: 'user', text };
    appendMessage(userMsg);
    if (typeof overrideText !== 'string') setInput('');
    setIsStreaming(true);
    setActiveActions([]);

    const updatedHistory = [...conversationHistory, { role: 'user', content: apiText }];
    setConversationHistory(updatedHistory);

    try {
      const token = await AsyncStorage.getItem('token');
      const activeChatId = chatId || await openBackendChat();

      if (!activeChatId) {
        setIsStreaming(false);
        setActiveActions([]);
        appendMessage({
          role: 'assistant',
          type: 'agent_message',
          text: 'I could not start an AI chat session. Please try again.',
        });
        return;
      }

      const es = new EventSource(`${BASE_URL}/ai/event-planner/${activeChatId}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        method: 'POST',
        body: JSON.stringify({
          chatId: activeChatId,
          clientSessionId,
          message: apiText,
          messages: updatedHistory,
          context: { existingEventPayload: eventPayload },
        }),
        pollingInterval: 0,
      });

      let assistantText = '';
      let idleTimer = null;

      const finishStream = (esRef) => {
        if (idleTimer) clearTimeout(idleTimer);
        esRef.close();
        setIsStreaming(false);
        setActiveActions([]);
        setMessages(prev => prev.map(m =>
          m.type === 'agent_action' ? { ...m, done: true } : m
        ));
        if (assistantText) {
          setConversationHistory(prev => [...prev, { role: 'assistant', content: assistantText }]);
        }
        scrollToBottom();
      };

      // Safety timeout: force-stop after 1 second of inactivity if backend hangs
      const resetIdleTimer = () => {
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(() => finishStream(es), 8000); // safety net only, not the main path
      };

      resetIdleTimer();
      es.addEventListener('message', (event) => {
        console.log("Raw SSE message event received:", event.data);
        resetIdleTimer();
        if (!event.data || event.data === '[DONE]') {
          finishStream(es);
          return;
        }
        try {
          const parsed = JSON.parse(event.data);
          handleSSEEvent(parsed, (txt) => { assistantText = txt; });
          if (parsed.type === 'done' || parsed.type === 'error' || parsed.type === 'duplicate') {
            finishStream(es); // ← close immediately, don't wait for idle timeout
          }
        } catch (_) {}
      });

      // ['agent_thought','agent_action','agent_message','event_payload',
      // 'ai_chat','vendor_suggestions','venue_suggestions','category_suggestions','done','error',
      // 'date_picker','input_request','duplicate'].forEach((evtType) => {  // ← added 'duplicate'
      //   es.addEventListener(evtType, (event) => {
      //     console.log(`Raw SSE ${evtType} event received:`, event.data);
      //     resetIdleTimer();
      //     try {
      //       const parsed = JSON.parse(event.data);
      //       handleSSEEvent({ type: evtType, ...parsed }, (txt) => { assistantText = txt; });
      //       if (evtType === 'done' || evtType === 'error' || evtType === 'duplicate') {
      //         finishStream(es);
      //       }
      //     } catch (_) {}
      //   });
      // });

      es.addEventListener('error', (err) => {
        console.error('SSE error:', err);
        finishStream(es);
        appendMessage({
          role: 'assistant',
          type: 'agent_message',
          text: "I'm having trouble connecting right now. Please check your connection and try again.",
        });
      });

    } catch (err) {
      console.error('AI stream error:', err);
      setIsStreaming(false);
      setActiveActions([]);
      appendMessage({
        role: 'assistant',
        type: 'agent_message',
        text: "Something went wrong. Please try again.",
      });
    }
  };


  // ─── Handle each SSE event ────────────────────────────────────────────────
  const handleSSEEvent = (event, setAssistantText) => {
    switch (event.type) {
      case 'agent_thought':
        // dim status — no persistent bubble, just update active action
        setActiveActions(prev => [{ id: Date.now(), tool: null, content: event.content }]);
        break;

      case 'agent_action':
        setActiveActions(prev => [{ id: Date.now(), tool: event.tool, content: event.content }]);
        // Also add a persistent action card
        appendMessage({ role: 'assistant', type: 'agent_action', tool: event.tool, text: event.content });
        break;
      case 'duplicate':
      // Backend detected this as a repeat of an in-flight request — just close quietly, no new bubble
      setActiveActions([]);
      break;
      case 'agent_message':
        setActiveActions([]);
        if (pendingInputRef.current?.control === 'datetime') {
          // There's a pending date picker request — render interactive bubble
          // using the AI's own message text instead of our hardcoded string
          const pending = pendingInputRef.current;
          pendingInputRef.current = null;
          appendMessage({
            role: 'assistant',
            type: 'interactive_input',
            control: 'datetime',
            field: pending.field,
            text: event.content,
            minDate: pending.minDate,
            answered: false,
          });
          setAssistantText(event.content);
        } else if (
          pendingInputRef.current?.control === 'select' ||
          pendingInputRef.current?.control === 'segmented' ||
          pendingInputRef.current?.control === 'select_or_text'
        ) {
          const pending = pendingInputRef.current;
          pendingInputRef.current = null;
          appendMessage({
            role: 'assistant',
            type: 'interactive_input',
            control: pending.control,
            field: pending.field,
            text: event.content,
            options: pending.options || [],
            answered: false,
          });
          setAssistantText(event.content);
        } else if (pendingInputRef.current?.control === 'sponsorship') {
          const pending = pendingInputRef.current;
          pendingInputRef.current = null;
          appendMessage({
            role: 'assistant',
            type: 'interactive_input',
            control: 'sponsorship',
            field: pending.field,
            text: event.content,
            answered: false,
          });
          setAssistantText(event.content);
        } else if (pendingInputRef.current?.control === 'location') {
          const pending = pendingInputRef.current;
          pendingInputRef.current = null;
          appendMessage({
            role: 'assistant',
            type: 'interactive_input',
            control: 'location',
            field: pending.field,
            text: event.content,
            answered: false,
          });
          setAssistantText(event.content);
        } else if (pendingInputRef.current?.control === 'number') {
          const pending = pendingInputRef.current;
          pendingInputRef.current = null;
          appendMessage({
            role: 'assistant',
            type: 'interactive_input',
            control: 'number',
            field: pending.field,
            text: event.content,
            answered: false,
          });
          setAssistantText(event.content);
        } else if (pendingInputRef.current?.control === 'currency') {
          const pending = pendingInputRef.current;
          pendingInputRef.current = null;
          appendMessage({
            role: 'assistant',
            type: 'interactive_input',
            control: 'currency',
            field: pending.field,
            text: event.content,
            responseFormat: pending.responseFormat,
            answered: false,
          });
          setAssistantText(event.content);
        } else if (pendingInputRef.current?.control === 'ticket_builder') {
          const pending = pendingInputRef.current;
          pendingInputRef.current = null;
          appendMessage({
            role: 'assistant',
            type: 'interactive_input',
            control: 'ticket_builder',
            field: pending.field,
            text: event.content,
            answered: false,
          });
          setAssistantText(event.content);
        } else if (pendingInputRef.current?.control === 'boolean') {
          const pending = pendingInputRef.current;
          pendingInputRef.current = null;
          appendMessage({
            role: 'assistant',
            type: 'interactive_input',
            control: 'boolean',
            field: pending.field,
            text: event.content,
            answered: false,
          });
          setAssistantText(event.content);
        } else if (pendingInputRef.current?.control === 'media_or_generate' || pendingInputRef.current?.control === 'media_upload_or_generate') {
          const pending = pendingInputRef.current;
          pendingInputRef.current = null;
          appendMessage({
            role: 'assistant',
            type: 'interactive_input',
            control: 'media_or_generate',
            field: pending.field,
            text: event.content,
            answered: false,
          });
          setAssistantText(event.content);
        } else if (pendingInputRef.current?.control === 'advanced_event_fields') {
          const pending = pendingInputRef.current;
          pendingInputRef.current = null;
          appendMessage({
            role: 'assistant',
            type: 'interactive_input',
            control: 'advanced_event_fields',
            field: pending.field,
            text: event.content,
            answered: false,
          });
          setAssistantText(event.content);
        } else {
          appendMessage({ role: 'assistant', type: 'agent_message', text: event.content });
          setAssistantText(event.content);
        }
        break;

      case 'date_picker':
        // Store info — wait for agent_message to render the bubble
        pendingInputRef.current = {
          control: 'datetime',
          field: event.field,
          minDate: event.minDate || new Date().toISOString(),
        };
        setActiveActions([]);
        break;

      case 'input_request':
        // Merge control info into the pending ref if already set
        if (pendingInputRef.current) {
          pendingInputRef.current.control = event.control || 'datetime';
          pendingInputRef.current.field = event.field || pendingInputRef.current.field;
          pendingInputRef.current.minDate = event.minDate || pendingInputRef.current.minDate;
          pendingInputRef.current.options = event.options || pendingInputRef.current.options;
          pendingInputRef.current.responseFormat = event.responseFormat || pendingInputRef.current.responseFormat;
        } else {
          pendingInputRef.current = {
            control: event.control || 'datetime',
            field: event.field,
            minDate: event.minDate || new Date().toISOString(),
            options: event.options || [],
            responseFormat: event.responseFormat,
          };
        }
        setActiveActions([]);
        break;

      case 'event_payload':
        setActiveActions([]);
        setEventPayload(prev => ({ ...prev, ...event.payload }));
        break;

      case 'ai_chat':
        if (event.chatId) {
          setChatId(event.chatId);
          upsertChatIndex({
            chatId: event.chatId,
            name: event.chatId,
            date: new Date().toISOString(),
          });
          setAllChats(prev => {
            const exists = prev.some(chat => (chat.chatId || chat.id) === event.chatId);
            if (exists) {
              return prev.map(chat =>
                (chat.chatId || chat.id) === event.chatId
                  ? { ...chat, chatId: event.chatId, id: event.chatId, date: new Date().toISOString() }
                  : chat
              );
            }
            return [
              {
                id: event.chatId,
                chatId: event.chatId,
                name: event.chatId,
                date: new Date().toISOString(),
              },
              ...prev,
            ];
          });
        }
        break;

      case 'category_suggestions':
        setActiveActions([]);
        pendingInputRef.current = {
          control: 'select',
          field: 'categoryId',
          options: (event.categories || []).map((category) => ({
            label: category.name,
            value: category._id,
          })),
        };
        break;

      case 'vendor_suggestions':
        appendMessage({ 
          role: 'assistant', 
          type: 'vendor_suggestions', 
          vendors: event.vendors || [],
          groups: event.groups || [],
          budget: event.budget,
          plan: event.plan || [],
          empty: event.empty,
        });
        break;

      case 'venue_suggestions':
        appendMessage({ role: 'assistant', type: 'venue_suggestions', venues: event.venues });
        break;

      case 'done':
        setActiveActions([]);
        break;

      case 'error':
        appendMessage({ role: 'assistant', type: 'agent_message', text: `⚠️ ${event.content}` });
        break;

      default:
        break;
    }
  };

  // ─── Date Picker Handlers ─────────────────────────────────────────────────
  const handleRequestDatePick = (msgId, minDate, field) => {
    const dateField = field || 'start';
    setPendingDateMsgId(msgId);
    setPendingDateField(dateField);
    pendingDateFieldRef.current = dateField;
    setPendingMinDate(minDate ? new Date(minDate) : new Date());
    setPickedDate(minDate ? new Date(minDate) : new Date());
    setTempDate(null);
    setDatePickerMode('date');
    setShowDatePicker(true);
  };

  const handleDateChange = (event, selectedDate) => {
    if (event.type === 'dismissed') {
      setShowDatePicker(false);
      return;
    }
    if (!selectedDate) return;

    if (Platform.OS === 'android') {
      // Android fires one event per mode — chain date → time
      if (datePickerMode === 'date') {
        setTempDate(selectedDate);
        setDatePickerMode('time');
        setShowDatePicker(true);
      } else {
        // Combine saved date with new time
        const combined = tempDate ? new Date(tempDate) : new Date(selectedDate);
        combined.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
        setShowDatePicker(false);
        confirmDate(combined);
      }
    } else {
      // iOS inline picker — just keep updating
      setPickedDate(selectedDate);
    }
  };

  const confirmDate = (date) => {
    setShowDatePicker(false);
    const isoDate = date.toISOString();
    const label = date.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const field = pendingDateFieldRef.current || pendingDateField || 'start';
    const fieldLabel = field === 'end' ? 'end' : 'start';

    // Mark the interactive bubble as answered
    setMessages(prev => prev.map(m =>
      m.id === pendingDateMsgId ? { ...m, answered: true, answeredLabel: label } : m
    ));

    // Update the exact event payload field requested by the backend
    setEventPayload(prev => ({ ...prev, [field]: isoDate }));
    pendingDateFieldRef.current = null;
    setPendingDateField(null);
    setPendingDateMsgId(null);

    // Show a friendly message and send the same field in an explicit machine-readable shape.
    handleSend(
      `The event ${fieldLabel} date and time is: ${isoDate}`,
      `The event ${fieldLabel} date and time is: ${isoDate}\nStructured response: ${JSON.stringify({ [field]: isoDate })}`
    );
  };

  // ─── S3 Upload Helpers ────────────────────────────────────────────────────
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
      if (!uploadResponse.ok) throw new Error('Failed to upload media to S3');
      return true;
    } catch (error) {
      console.error('Error uploading to S3:', error);
      throw error;
    }
  };

  const pickAndUploadImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Toast.show({ type: 'error', text1: 'Permission Required', text2: 'Please grant photo library access.' });
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 0.85,
      exif: false,
    });

    if (result.canceled || !result.assets?.length) return null;

    const uploadedUrls = [];
    for (const asset of result.assets) {
      const mimeType = asset.mimeType || 'image/jpeg';
      const fileName = asset.fileName || `event_image_${Date.now()}.jpg`;
      const signedData = await getSignedUrl(fileName, mimeType);
      const { uploadURL } = signedData;
      await uploadMediaToS3(asset.uri, uploadURL, mimeType);
      uploadedUrls.push(uploadURL.split('?')[0]);
    }

    return uploadedUrls;
  };

  // ─── Generate AI Poster ───────────────────────────────────────────────────
  const generatePosterUrl = async () => {
    if (isGeneratingPoster) return;
    setIsGeneratingPoster(true);
    
    const actionId = Date.now().toString() + Math.random();
    setMessages(prev => [...prev, {
      id: actionId,
      role: 'assistant',
      type: 'agent_action',
      tool: 'generate_event_poster_prompt',
      text: 'Generating your AI event poster...',
      done: false
    }]);
    scrollToBottom();

    try {
      const token = await AsyncStorage.getItem('token');
      
      const prompt = `A vibrant, premium, and modern poster for an event named "${eventPayload.name}". Category: ${eventPayload.category}. Description: ${eventPayload.description}`;
      
      const res = await api.post('/ai/generate-poster', {
        eventId: chatId, // use the current chatId as a temporary eventId since it's a valid ObjectId
        imagePrompt: prompt,
      }, { 
        headers: { Authorization: `Bearer ${token}` },
        timeout: 25000 // Increased timeout for image generation
      });

      const posterUrl =
        res.data?.posterUrl ||
        res.data?.data?.posterUrl ||
        res.data?.url ||
        res.data?.data?.url ||
        res.data?.imageUrl ||
        res.data?.data?.imageUrl;

      if (posterUrl) {
        setEventPayload(prev => ({ ...prev, posterUrl }));
        
        // Mark the action as done
        setMessages(prev => prev.map(m => m.id === actionId ? { ...m, done: true, text: 'Poster generated!' } : m));
        appendMessage({ role: 'assistant', type: 'agent_message', text: '🎨 Your AI poster is ready! Check the Live Preview above.' });
        return posterUrl;
      } else {
        throw new Error('No poster URL returned');
      }
    } catch (err) {
      // Mark as done but failed
      setMessages(prev => prev.map(m => m.id === actionId ? { ...m, done: true, text: 'Failed to generate poster' } : m));
      appendMessage({
        role: 'assistant',
        type: 'agent_message',
        text: err?.response?.data?.error || err?.response?.data?.message || "Couldn't generate poster right now. The AI Image service might be busy.",
      });
      return null;
    } finally {
      setIsGeneratingPoster(false);
    }
  };

  const handleGeneratePoster = async () => {
    await generatePosterUrl();
  };

  // ─── Handle Selection ──────────────────────────────────────────────────────
  const handleSelectVenue = (venue) => {
    setEventPayload(prev => ({ ...prev, address: venue.address }));
    handleSend(`I would like to use this venue: ${venue.name}.`);
  };

  const handleSelectVendor = (vendor) => {
    handleSend(`I want to book this vendor: ${vendor.name} for ₦${vendor.price}.`);
  };

  const handleSubmitEventType = (msgId, eventType) => {
    if (!eventType) return;
    const payload = {
      eventType,
      typeOfEvent: eventType,
    };

    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, answered: true, answeredLabel: eventType } : m
    ));

    setEventPayload(prev => ({
      ...prev,
      category: eventType,
    }));

    handleSend(
      eventType,
      `Selected event type: ${eventType}\nStructured response: ${JSON.stringify(payload)}`
    );
  };

  const handleSelectOption = (msgId, field, option) => {
    if (!field || !option?.value) return;
    const structuredPayload = field === 'finalization'
      ? { action: option.value }
      : { [field]: option.value };

    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, answered: true, answeredLabel: option.label } : m
    ));

    setEventPayload(prev => ({
      ...prev,
      ...(field === 'finalization'
        ? { finalizationAction: option.value }
        : { [field]: option.value }),
      ...(field === 'categoryId' && { category: option.label }),
    }));

    handleSend(
      option.label,
      `Selected ${field}: ${option.value}\nStructured response: ${JSON.stringify(structuredPayload)}`
    );
  };

  const handleSubmitSponsorship = (msgId, isSponsored, sponsorAmount) => {
    const payload = {
      isSponsored,
      sponsorAmount: isSponsored ? Number(sponsorAmount) || 0 : 0,
    };
    const label = isSponsored
      ? `Sponsored with ₦${payload.sponsorAmount.toLocaleString()}`
      : 'No sponsorship';

    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, answered: true, answeredLabel: label } : m
    ));

    setEventPayload(prev => ({
      ...prev,
      ...payload,
    }));

    handleSend(
      label,
      `Selected sponsorship: ${label}\nStructured response: ${JSON.stringify(payload)}`
    );
  };

  const handleSubmitLocation = (msgId, addressText) => {
    const address = addressText?.trim();
    if (!address) return;

    const payload = {
      address,
      lat: '6.5244',
      long: '3.3792',
    };

    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, answered: true, answeredLabel: address } : m
    ));

    setEventPayload(prev => ({
      ...prev,
      ...payload,
    }));

    handleSend(
      address,
      `Selected location: ${address}\nStructured response: ${JSON.stringify(payload)}`
    );
  };

  const handleSubmitNumber = (msgId, field, value) => {
    const cleanValue = String(value || '').replace(/[^0-9]/g, '');
    if (!field || !cleanValue) return;

    const payload = {
      [field]: cleanValue,
    };

    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, answered: true, answeredLabel: cleanValue } : m
    ));

    setEventPayload(prev => ({
      ...prev,
      ...payload,
    }));

    handleSend(
      cleanValue,
      `Selected ${field}: ${cleanValue}\nStructured response: ${JSON.stringify(payload)}`
    );
  };

  const handleSubmitCurrency = (msgId, field, value, responseFormat = null) => {
    const cleanValue = String(value || '').replace(/[^0-9]/g, '');
    if (!field || !cleanValue) return;

    const amount = Number(cleanValue);
    const responseKey = responseFormat ? Object.keys(responseFormat)[0] : null;
    const payloadKey = responseKey || (field === 'vendorBudgetIncrease' ? 'aiVendorBudget' : field);
    const payload = {
      [payloadKey]: amount,
      ...((field === 'vendorBudget' || field === 'vendorBudgetIncrease') && {
        aiVendorBudget: amount,
        vendorBudget: amount,
      }),
    };
    const label = `₦${amount.toLocaleString()}`;

    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, answered: true, answeredLabel: label } : m
    ));

    setEventPayload(prev => ({
      ...prev,
      ...payload,
    }));

    handleSend(
      label,
      `Selected ${field}: ${label}\nStructured response: ${JSON.stringify(payload)}`
    );
  };

  const handleSubmitTicketing = (msgId, payload) => {
    if (!payload) return;

    const normalizedPayload = {
      isTicket: !!payload.isTicket,
      ticketAmount: payload.isTicket ? Number(payload.ticketAmount) || 0 : 0,
      tickets: payload.isTicket ? payload.tickets || [] : [],
    };

    const label = normalizedPayload.isTicket
      ? `Ticketed event: ₦${normalizedPayload.ticketAmount.toLocaleString()}`
      : 'Free entry';

    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, answered: true, answeredLabel: label } : m
    ));

    setEventPayload(prev => ({
      ...prev,
      ...normalizedPayload,
    }));

    handleSend(
      label,
      `Selected ticketing: ${label}\nStructured response: ${JSON.stringify(normalizedPayload)}`
    );
  };

  const handleSubmitBoolean = (msgId, field, value, amount = '') => {
    if (!field) return;

    const cleanAmount = String(amount || '').replace(/[^0-9]/g, '');
    const payload = field === 'vendorNeed'
      ? {
          aiVendorNeedConfirmed: !!value,
          ...(value && cleanAmount && {
            aiVendorBudget: Number(cleanAmount),
            vendorBudget: Number(cleanAmount),
          }),
        }
      : { [field]: !!value };

    const label = value
      ? cleanAmount
        ? `Yes, budget ₦${Number(cleanAmount).toLocaleString()}`
        : 'Yes'
      : 'No';

    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, answered: true, answeredLabel: label } : m
    ));

    setEventPayload(prev => ({
      ...prev,
      ...payload,
    }));

    handleSend(
      label,
      `Selected ${field}: ${label}\nStructured response: ${JSON.stringify(payload)}`
    );
  };

  const handleSubmitMedia = async (msgId, action) => {
    const shouldGenerate = action === 'generate';
    const shouldUpload = action === 'upload';
    let posterUrl = null;
    let uploadedImages = [];

    if (shouldUpload) {
      // Show uploading status
      setMessages(prev => prev.map(m =>
        m.id === msgId ? { ...m, uploading: true } : m
      ));

      try {
        const urls = await pickAndUploadImage();
        if (!urls || urls.length === 0) {
          // User cancelled picker — reset uploading state
          setMessages(prev => prev.map(m =>
            m.id === msgId ? { ...m, uploading: false } : m
          ));
          return;
        }
        uploadedImages = urls;
      } catch (err) {
        setMessages(prev => prev.map(m =>
          m.id === msgId ? { ...m, uploading: false } : m
        ));
        Toast.show({
          type: 'error',
          text1: 'Upload failed',
          text2: err?.message || 'Could not upload image. Please try again.',
        });
        return;
      }
    } else if (shouldGenerate) {
      posterUrl = await generatePosterUrl();
      if (!posterUrl) {
        Toast.show({
          type: 'error',
          text1: 'Flyer generation failed',
          text2: 'Please try again or skip for now.',
        });
        return;
      }
      uploadedImages = [posterUrl];
    }

    const payload = {
      images: uploadedImages,
      videos: [],
      type: 'images',
      generatePoster: shouldGenerate,
    };

    const answeredLabel = shouldUpload
      ? `${uploadedImages.length} image${uploadedImages.length !== 1 ? 's' : ''} uploaded`
      : shouldGenerate
      ? 'AI flyer generated'
      : 'Skipped';

    const humanLabel = shouldUpload
      ? `Uploaded ${uploadedImages.length} image${uploadedImages.length !== 1 ? 's' : ''}`
      : shouldGenerate
      ? 'Generate flyer'
      : 'Skip flyer for now';

    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, answered: true, uploading: false, answeredLabel } : m
    ));

    setEventPayload(prev => ({
      ...prev,
      ...payload,
      ...(posterUrl && { posterUrl }),
      ...(uploadedImages.length > 0 && !posterUrl && { posterUrl: uploadedImages[0] }),
    }));

    handleSend(
      humanLabel,
      `Selected event media: ${humanLabel}\nStructured response: ${JSON.stringify(payload)}`
    );
  };


  const handleSubmitRawText = (msgId, buttonLabel, textToSend) => {
    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, answered: true, answeredLabel: buttonLabel } : m
    ));
    handleSend(buttonLabel, textToSend);
  };

  // ─── Publish event ────────────────────────────────────────────────────────
  const handlePublish = async () => {
    if (!eventPayload.name || eventPayload.name === 'Your Event') {
      Toast.show({ type: 'info', text1: 'Not Ready', text2: 'Ask the AI to plan your event first!' });
      return;
    }
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await api.post('/event', {
        name: eventPayload.name,
        description: eventPayload.description,
        address: eventPayload.address,
        lat: eventPayload.lat || '0',
        long: eventPayload.long || '0',
        capacity: eventPayload.capacity,
        isTicket: eventPayload.isTicket,
        ticketAmount: parseFloat(eventPayload.ticketAmount) || 0,
        isSponsored: false,
        sponsorAmount: 0,
        start: eventPayload.start,
        end: eventPayload.end,
        categoryId: eventPayload.categoryId || '',
        type: eventPayload.posterUrl ? 'images' : 'images',
        images: eventPayload.posterUrl ? [eventPayload.posterUrl] : [],
        hashtags: eventPayload.hashtags || [],
        tickets: eventPayload.tickets || [],
      }, { headers: { Authorization: `Bearer ${token}` } });

      Toast.show({ type: 'success', text1: 'Event Published! 🎉', text2: 'Your AI-generated event is now live.' });
      setTimeout(() => {
        if (response.data?.data?._id) {
          router.replace(`/(tabs)/Events/${response.data.data._id}`);
        } else {
          router.replace('/(tabs)/Events');
        }
      }, 1800);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to publish event.';
      Toast.show({ type: 'error', text1: 'Publish Failed', text2: msg });
    }
  };

  // ─── Glowing border color ─────────────────────────────────────────────────
  const glowColor = headerGlowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(90,49,244,0.3)', 'rgba(139,92,246,0.8)'],
  });

  const isEventReadyToPublish = messages.some(m => 
    (m.text || '').includes('Handing off to the create event flow now')
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color="#2D1B69" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsHistoryModalVisible(true)} style={[styles.backButton, { marginLeft: 5 }]}>
            <Ionicons name="list" size={20} color="#2D1B69" />
          </TouchableOpacity>
        </View>
        <View style={styles.headerCenter}>
          <Animated.View style={[styles.aiDot, { shadowColor: glowColor }]} />
          <Text style={styles.headerTitle}>Venire AI</Text>
        </View>
        <TouchableOpacity 
          style={[styles.publishBtn, !isEventReadyToPublish && { backgroundColor: '#A78BFA', opacity: 0.7 }]} 
          onPress={handlePublish} 
          disabled={!isEventReadyToPublish}
          activeOpacity={0.8}
        >
          <Ionicons name="send" size={13} color="#FFF" style={{ marginRight: 5 }} />
          <Text style={styles.publishBtnText}>Publish</Text>
        </TouchableOpacity>
      </View>

      {/* ── Scrollable Body ─────────────────────────────────────────────── */}
      <ScrollView
        ref={scrollRef}
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Live Preview Card */}
        <Animated.View style={[styles.previewContainer, { opacity: previewFadeAnim }]}>
          <View style={styles.previewLabelRow}>
            <View style={styles.liveDot} />
            <Text style={styles.previewHeader}>Live Preview</Text>
            <TouchableOpacity
              style={styles.posterBtn}
              onPress={handleGeneratePoster}
              disabled={isGeneratingPoster}
              activeOpacity={0.8}
            >
              {isGeneratingPoster
                ? <ActivityIndicator size="small" color="#EC4899" />
                : <><Ionicons name="image-outline" size={13} color="#EC4899" /><Text style={styles.posterBtnText}> AI Poster</Text></>
              }
            </TouchableOpacity>
          </View>

          <View style={styles.previewCard}>
            <Image
              source={{ uri: eventPayload.posterUrl || 'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=800' }}
              style={styles.previewImage}
            />
            <View style={styles.previewGradient}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{eventPayload.category}</Text>
              </View>
              <Text style={styles.previewTitleOnImage} numberOfLines={1}>{eventPayload.name}</Text>
            </View>

            <View style={styles.previewDetails}>
              <View style={styles.previewRow}>
                <Ionicons name="location-outline" size={13} color="#7C3AED" />
                <Text style={styles.previewText} numberOfLines={1}>{eventPayload.address}</Text>
              </View>
              <View style={styles.previewRow}>
                <Ionicons name="calendar-outline" size={13} color="#7C3AED" />
                <Text style={styles.previewText}>
                  {eventPayload.start ? new Date(eventPayload.start).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) : 'Date TBA'}
                </Text>
              </View>
              <View style={styles.previewRow}>
                <Ionicons name="ticket-outline" size={13} color="#7C3AED" />
                <Text style={styles.previewPrice}>
                  {eventPayload.isTicket ? `From ₦${Number(eventPayload.ticketAmount).toLocaleString()}` : 'Free Entry'}
                </Text>
              </View>

              {/* Advanced Event Data (Capacity & Ticket Tiers) */}
              {(eventPayload.capacity || (eventPayload.tickets && eventPayload.tickets.length > 0)) && (
                <View style={styles.advancedDataBox}>
                  {!!eventPayload.capacity && (
                    <View style={styles.advancedDataRow}>
                      <Ionicons name="people-outline" size={12} color="#4B5563" />
                      <Text style={styles.advancedDataText}>Capacity: {eventPayload.capacity}</Text>
                    </View>
                  )}
                  {eventPayload.tickets && eventPayload.tickets.length > 0 && (
                    <View style={{ marginTop: 4 }}>
                      <Text style={styles.advancedDataTitle}>Ticket Tiers:</Text>
                      {eventPayload.tickets.map((t, i) => (
                        <View key={i} style={styles.advancedDataRow}>
                          <View style={styles.miniDot} />
                          <Text style={styles.advancedDataText}>{t.name} - ₦{Number(t.price).toLocaleString()}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* AI Schedule */}
              {eventPayload.schedule?.length > 0 && (
                <TouchableOpacity style={styles.scheduleToggle} onPress={() => setShowSchedule(v => !v)}>
                  <Ionicons name={showSchedule ? 'chevron-up' : 'chevron-down'} size={13} color="#7C3AED" />
                  <Text style={styles.scheduleToggleText}>
                    {showSchedule ? 'Hide Schedule' : `View AI Schedule (${eventPayload.schedule.length} items)`}
                  </Text>
                </TouchableOpacity>
              )}
              {showSchedule && eventPayload.schedule?.map((item, i) => (
                <View key={i} style={styles.scheduleItem}>
                  <Text style={styles.scheduleTime}>{item.time}</Text>
                  <Text style={styles.scheduleActivity}>{item.activity}</Text>
                </View>
              ))}

              {/* Social Caption */}
              {!!eventPayload.socialCaption && (
                <View style={styles.captionBox}>
                  <Ionicons name="megaphone-outline" size={13} color="#F59E0B" />
                  <Text style={styles.captionText} numberOfLines={3}>{eventPayload.socialCaption}</Text>
                </View>
              )}
            </View>
          </View>
        </Animated.View>

        {/* Prompt Chips (shown only before first user message) */}
        {messages.length === 1 && (
          <View style={styles.chipsContainer}>
            {PROMPT_CHIPS.map((chip, i) => (
              <TouchableOpacity
                key={i}
                style={styles.chip}
                onPress={() => setInput(chip.slice(2))}
                activeOpacity={0.7}
              >
                <Text style={styles.chipText}>{chip}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Messages */}
        <View style={styles.chatArea}>
          {messages.map((msg) => (
            <MessageBubble 
              key={msg.id} 
              msg={msg} 
              isStreaming={isStreaming}
              onSelectVenue={handleSelectVenue}
              onSelectVendor={handleSelectVendor}
              onRequestDatePick={handleRequestDatePick}
              onSelectOption={handleSelectOption}
              onSubmitSponsorship={handleSubmitSponsorship}
              onSubmitLocation={handleSubmitLocation}
              onSubmitNumber={handleSubmitNumber}
              onSubmitTicketing={handleSubmitTicketing}
              onSubmitBoolean={handleSubmitBoolean}
              onSubmitMedia={handleSubmitMedia}
              onSubmitEventType={handleSubmitEventType}
              onSubmitCurrency={handleSubmitCurrency}
              onSubmitRawText={handleSubmitRawText}
              onPublish={handlePublish}
            />
          ))}

          {/* Active streaming indicator */}
          {isStreaming && activeActions.length === 0 && (
            <View style={[styles.messageBubble, styles.aiBubble]}>
              <View style={styles.aiAvatar}>
                <Ionicons name="sparkles" size={13} color="#FFF" />
              </View>
              <View style={styles.typingDots}>
                <TypingDots />
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Input Bar ──────────────────────────────────────────────────── */}
      <View style={styles.inputArea}>
        <TextInput
          ref={inputRef}
          style={styles.textInput}
          placeholder={loadingChat ? "Starting AI session..." : "Describe your event..."}
          placeholderTextColor="#9CA3AF"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!input.trim() || isStreaming || loadingChat) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || isStreaming || loadingChat}
          activeOpacity={0.8}
        >
          {isStreaming || loadingChat
            ? <ActivityIndicator size="small" color="#FFF" />
            : <Ionicons name="arrow-up" size={18} color="#FFF" />
          }
        </TouchableOpacity>
      </View>

      {/* ── History Modal ──────────────────────────────────────────────── */}
      <Modal
        visible={isHistoryModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsHistoryModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Past Conversations</Text>
            <TouchableOpacity onPress={() => setIsHistoryModalVisible(false)}>
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.newChatBtn} onPress={handleNewChat}>
            <Ionicons name="add" size={18} color="#FFF" />
            <Text style={styles.newChatBtnText}>Start New Plan</Text>
          </TouchableOpacity>

          <FlatList
            data={allChats}
            keyExtractor={(item, index) => item.id || item.chatId || `chat-${index}`}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.historyItem} onPress={() => loadChat(item)}>
                <View style={styles.historyIconBg}>
                  <Ionicons name="chatbubbles-outline" size={16} color="#8B5CF6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyTitle} numberOfLines={1}>
                    {item.name || item.title || item.chatId || item.id || 'AI Event Plan'}
                  </Text>
                  <Text style={styles.historyDate}>
                    {item.date
                      ? `${new Date(item.date).toLocaleDateString()} at ${new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : 'Backend chat'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
              </TouchableOpacity>
            )}
            contentContainerStyle={{ padding: 20 }}
            ListEmptyComponent={
              <Text style={styles.emptyHistoryText}>No past conversations yet.</Text>
            }
          />
        </View>
      </Modal>

      {/* ── Date Picker ────────────────────────────────────────────────── */}
      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={pickedDate}
          mode={datePickerMode}
          display="default"
          minimumDate={pendingMinDate || new Date()}
          onChange={handleDateChange}
        />
      )}

      {showDatePicker && Platform.OS === 'ios' && (
        <Modal transparent animationType="slide" visible={showDatePicker}>
          <View style={styles.datePickerModal}>
            <View style={styles.datePickerInner}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.datePickerCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>Select Date & Time</Text>
                <TouchableOpacity onPress={() => confirmDate(pickedDate)}>
                  <Text style={styles.datePickerConfirm}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={pickedDate}
                mode="datetime"
                display="spinner"
                minimumDate={pendingMinDate || new Date()}
                onChange={(e, d) => d && setPickedDate(d)}
                textColor="#1F2937"
              />
            </View>
          </View>
        </Modal>
      )}

    </KeyboardAvoidingView>
  );
}

// ─── Typing animation ────────────────────────────────────────────────────────
function TypingDots() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -5, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600),
        ])
      ).start();
    animate(dot1, 0);
    animate(dot2, 150);
    animate(dot3, 300);
  }, []);

  const dotStyle = (anim) => ({ transform: [{ translateY: anim }] });

  return (
    <View style={{ flexDirection: 'row', gap: 5, paddingVertical: 4 }}>
      {[dot1, dot2, dot3].map((d, i) => (
        <Animated.View key={i} style={[styles.dot, dotStyle(d)]} />
      ))}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F0FF' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 58 : 38,
    paddingBottom: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EDE9FE',
  },
  backButton: { padding: 6, borderRadius: 20, backgroundColor: '#F4F0FF' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#7C3AED',
    shadowOffset: { width: 0, height: 0 }, shadowRadius: 6, shadowOpacity: 1,
  },
  headerTitle: { fontFamily: 'Poppins_700Bold', fontSize: 17, color: '#2D1B69' },
  publishBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#5A31F4', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  publishBtnText: { fontFamily: 'Poppins_600SemiBold', color: '#FFF', fontSize: 13 },

  // Scroll
  scrollArea: { flex: 1 },
  scrollContent: { paddingBottom: 30 },

  // Preview
  previewContainer: { margin: 16, marginBottom: 8 },
  previewLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#10B981' },
  previewHeader: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1, flex: 1 },
  posterBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FDF2F8', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
    borderWidth: 1, borderColor: '#FBCFE8',
  },
  posterBtnText: { fontFamily: 'Poppins_500Medium', fontSize: 11, color: '#EC4899' },

  previewCard: {
    backgroundColor: '#FFF', borderRadius: 20, overflow: 'hidden',
    shadowColor: '#5A31F4', shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  previewImage: { width: '100%', height: 150, backgroundColor: '#EDE9FE' },
  previewGradient: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 150,
    justifyContent: 'flex-end', padding: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  categoryBadge: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(90,49,244,0.85)',
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, marginBottom: 6,
  },
  categoryText: { fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: '#FFF' },
  previewTitleOnImage: { fontFamily: 'Poppins_700Bold', fontSize: 17, color: '#FFF' },

  previewDetails: { padding: 14 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 },
  previewText: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: '#4B5563', flex: 1 },
  previewPrice: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#5A31F4' },

  scheduleToggle: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, marginBottom: 4 },
  scheduleToggleText: { fontFamily: 'Poppins_500Medium', fontSize: 12, color: '#7C3AED' },
  scheduleItem: {
    flexDirection: 'row', gap: 10, paddingVertical: 5, borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  scheduleTime: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: '#5A31F4', width: 62 },
  scheduleActivity: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: '#374151', flex: 1 },

  captionBox: {
    marginTop: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 7,
    backgroundColor: '#FFFBEB', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  captionText: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: '#92400E', flex: 1, lineHeight: 18 },

  advancedDataBox: {
    marginTop: 8, padding: 10, backgroundColor: '#F9FAFB', borderRadius: 10,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  advancedDataRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  advancedDataTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: '#4B5563', marginBottom: 2 },
  advancedDataText: { fontFamily: 'Poppins_500Medium', fontSize: 11, color: '#6B7280' },
  miniDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#9CA3AF' },

  // Chips
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  chip: {
    backgroundColor: '#FFF', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: '#DDD6FE',
    shadowColor: '#5A31F4', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  chipText: { fontFamily: 'Poppins_500Medium', fontSize: 12, color: '#5A31F4' },

  // Chat
  chatArea: { paddingHorizontal: 16, paddingTop: 6 },
  messageBubble: {
    maxWidth: '86%', marginBottom: 12, borderRadius: 20,
    flexDirection: 'row', alignItems: 'flex-start', gap: 9,
  },
  userBubble: {
    alignSelf: 'flex-end', backgroundColor: '#5A31F4',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start', backgroundColor: '#FFF',
    paddingHorizontal: 14, paddingVertical: 12, borderBottomLeftRadius: 4,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  aiAvatar: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: '#5A31F4',
    justifyContent: 'center', alignItems: 'center', marginTop: 2,
  },
  messageText: { fontFamily: 'Poppins_400Regular', fontSize: 14, lineHeight: 22, flexShrink: 1 },
  userText: { color: '#FFF' },
  aiText: { color: '#1F2937' },

  // Agent Action Card
  actionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFF', borderRadius: 14, padding: 12, marginBottom: 10,
    borderLeftWidth: 3, borderLeftColor: '#5A31F4',
    shadowColor: '#5A31F4', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  actionIconBg: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  actionLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, textTransform: 'capitalize', marginBottom: 2 },
  actionContent: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: '#6B7280' },

  // Suggestions
  suggestionHeader: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: '#374151', marginBottom: 8 },
  suggestionCard: {
    width: 150, backgroundColor: '#FFF', borderRadius: 14, overflow: 'hidden', marginRight: 10,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  suggestionImg: { width: '100%', height: 90, backgroundColor: '#EDE9FE' },
  suggestionBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    position: 'absolute', top: 8, left: 8,
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3,
  },
  emptyVendorBox: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  emptyVendorTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#374151',
  },
  vendorBudgetList: {
    gap: 4,
    paddingTop: 2,
  },
  vendorBudgetText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#6B7280',
  },
  emptyVendorHint: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#9CA3AF',
    lineHeight: 16,
  },

  // Typing dots
  typingDots: { paddingVertical: 2 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#C4B5FD' },

  // Input
  inputArea: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 14, paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 30 : 14,
    backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#EDE9FE',
  },
  textInput: {
    flex: 1, backgroundColor: '#F5F3FF', borderRadius: 22,
    paddingHorizontal: 18, paddingTop: 12, paddingBottom: 12,
    fontFamily: 'Poppins_400Regular', fontSize: 14, color: '#1F2937',
    maxHeight: 110, borderWidth: 1, borderColor: '#DDD6FE',
  },
  sendButton: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: '#5A31F4',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#5A31F4', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  sendButtonDisabled: { backgroundColor: '#C4B5FD', shadowOpacity: 0 },

  // History Modal
  modalContainer: { flex: 1, backgroundColor: '#F9FAFB' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingTop: Platform.OS === 'ios' ? 60 : 30 },
  modalTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: '#111827' },
  newChatBtn: { flexDirection: 'row', backgroundColor: '#8B5CF6', margin: 20, padding: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  newChatBtnText: { fontFamily: 'Poppins_600SemiBold', color: '#FFF', fontSize: 15, marginLeft: 6 },
  historyItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#F3F4F6' },
  historyIconBg: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  historyTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: '#1F2937' },
  historyDate: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  emptyHistoryText: { fontFamily: 'Poppins_400Regular', textAlign: 'center', color: '#6B7280', marginTop: 20 },

  // Interactive Date Picker bubble
  datePickerBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#7C3AED', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    marginTop: 10, alignSelf: 'flex-start',
  },
  datePickerBtnText: { fontFamily: 'Poppins_600SemiBold', color: '#FFF', fontSize: 13 },
  eventTypeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  eventTypeBtn: {
    backgroundColor: '#F3EDFF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  eventTypeText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#5A31F4',
  },
  selectOptionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  selectOptionBtn: {
    backgroundColor: '#F3EDFF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  selectOptionText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#5A31F4',
  },
  sponsorWrap: {
    marginTop: 10,
    gap: 10,
  },
  sponsorQuickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sponsorNoBtn: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sponsorNoText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#4B5563',
  },
  sponsorAmountBtn: {
    backgroundColor: '#F3EDFF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sponsorAmountText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
    color: '#5A31F4',
  },
  sponsorInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sponsorInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#1F2937',
    backgroundColor: '#F5F3FF',
  },
  sponsorSubmitBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#5A31F4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sponsorSubmitBtnDisabled: {
    backgroundColor: '#C4B5FD',
  },
  locationWrap: {
    marginTop: 10,
    gap: 10,
  },
  locationInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 12,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  locationInput: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#1F2937',
    paddingVertical: 0,
  },
  locationQuickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  locationQuickBtn: {
    backgroundColor: '#F3EDFF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  locationQuickText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    color: '#5A31F4',
  },
  locationSubmitBtn: {
    backgroundColor: '#5A31F4',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  locationSubmitBtnDisabled: {
    backgroundColor: '#C4B5FD',
  },
  locationSubmitText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
    color: '#FFF',
  },
  numberWrap: {
    marginTop: 10,
    gap: 10,
  },
  numberInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 12,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  numberInput: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#1F2937',
    paddingVertical: 0,
  },
  numberQuickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  numberQuickBtn: {
    backgroundColor: '#F3EDFF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  numberQuickText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
    color: '#5A31F4',
  },
  numberSubmitBtn: {
    backgroundColor: '#5A31F4',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  numberSubmitBtnDisabled: {
    backgroundColor: '#C4B5FD',
  },
  numberSubmitText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
    color: '#FFF',
  },
  currencyWrap: {
    marginTop: 10,
    gap: 10,
  },
  currencyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 12,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  currencySymbol: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: '#5A31F4',
  },
  currencyInput: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#1F2937',
    paddingVertical: 0,
  },
  currencyQuickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  currencyQuickBtn: {
    backgroundColor: '#F3EDFF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  currencyQuickText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 11,
    color: '#5A31F4',
  },
  currencySubmitBtn: {
    backgroundColor: '#5A31F4',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  currencySubmitBtnDisabled: {
    backgroundColor: '#C4B5FD',
  },
  currencySubmitText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
    color: '#FFF',
  },
  ticketBuilderWrap: {
    marginTop: 10,
    gap: 10,
  },
  ticketFreeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  ticketFreeText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
    color: '#15803D',
  },
  ticketQuickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ticketQuickBtn: {
    backgroundColor: '#F3EDFF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ticketQuickText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
    color: '#5A31F4',
  },
  ticketInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  ticketInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#1F2937',
    backgroundColor: '#F5F3FF',
  },
  ticketSubmitBtn: {
    backgroundColor: '#5A31F4',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  ticketSubmitBtnDisabled: {
    backgroundColor: '#C4B5FD',
  },
  ticketSubmitText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
    color: '#FFF',
  },
  booleanWrap: {
    marginTop: 10,
    gap: 10,
  },
  booleanQuickRow: {
    flexDirection: 'row',
    gap: 8,
  },
  booleanYesBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#5A31F4',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  booleanYesText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
    color: '#FFF',
  },
  booleanNoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  booleanNoText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
    color: '#4B5563',
  },
  booleanInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  booleanInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#1F2937',
    backgroundColor: '#F5F3FF',
  },
  booleanSubmitBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#5A31F4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  booleanSubmitBtnDisabled: {
    backgroundColor: '#C4B5FD',
  },
  mediaChoiceWrap: {
    marginTop: 10,
    gap: 10,
  },
  mediaUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  mediaUploadText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
    color: '#FFF',
  },
  mediaGenerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#5A31F4',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  mediaGenerateText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
    color: '#FFF',
  },
  mediaSkipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#F3EDFF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  mediaSkipText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
    color: '#5A31F4',
  },
  datePickedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(16,185,129,0.15)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, marginTop: 8,
    alignSelf: 'flex-start',
  },
  datePickedText: { fontFamily: 'Poppins_500Medium', color: '#10B981', fontSize: 12 },

  // iOS Date picker modal
  datePickerModal: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  datePickerInner: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  datePickerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  datePickerTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#111827' },
  datePickerCancel: { fontFamily: 'Poppins_500Medium', fontSize: 15, color: '#9CA3AF' },
  datePickerConfirm: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: '#7C3AED' },
});
