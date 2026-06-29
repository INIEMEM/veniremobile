import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  TextInput,
  Dimensions,
  Alert,
  Animated,
  FlatList,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import api from "../../../utils/axiosInstance";

const { width, height } = Dimensions.get("window");

const MOCK_VENDOR = {
  _id: "v1",
  businessName: "Lagos Luxe Catering",
  category: "Catering",
  categoryIcon: "🍽️",
  description:
    "Premium catering services for corporate events, weddings, and private gatherings. With over 8 years of experience serving Lagos's elite, we bring gourmet cuisine to your event doorstep. Specialising in Nigerian fusion, continental, and Asian cuisines.",
  rating: 4.8,
  reviewCount: 142,
  eventsCompleted: 320,
  responseTime: "~1 hour",
  state: "Lagos",
  city: "Victoria Island",
  phone: "+234 801 234 5678",
  email: "hello@lagosluxe.ng",
  verified: true,
  portfolio: [
    "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?w=800",
    "https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?w=800",
    "https://images.pexels.com/photos/3184183/pexels-photo-3184183.jpeg?w=800",
    "https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?w=800",
    "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg?w=800",
    "https://images.pexels.com/photos/3771115/pexels-photo-3771115.jpeg?w=800",
  ],
  pricingTiers: [
    {
      id: "p1",
      name: "Basic Package",
      price: 150000,
      description: "Up to 50 guests. 3-course meal, service staff included.",
      includes: ["3 meal courses", "Service staff (3)", "Basic setup", "Disposable tableware"],
    },
    {
      id: "p2",
      name: "Standard Package",
      price: 280000,
      description: "Up to 100 guests. 5-course meal, premium service.",
      includes: ["5 meal courses", "Service staff (6)", "Elegant setup", "Quality tableware", "Cocktail hour"],
    },
    {
      id: "p3",
      name: "Premium Package",
      price: 500000,
      description: "Up to 200 guests. Full-service luxury catering.",
      includes: ["7 meal courses", "Service staff (12)", "Luxury setup", "Fine china & crystal", "Open bar", "Live cooking station"],
    },
  ],
  reviews: [
    {
      id: "r1",
      name: "Adaeze O.",
      avatar: "https://i.pravatar.cc/150?img=47",
      rating: 5,
      comment: "Absolutely fantastic! The food was incredible and the service was impeccable. Our guests couldn't stop raving about the jollof rice!",
      date: "2026-05-10",
      event: "Wedding Reception",
    },
    {
      id: "r2",
      name: "Emeka S.",
      avatar: "https://i.pravatar.cc/150?img=12",
      rating: 5,
      comment: "Professional, punctual, and the quality of food exceeded our expectations. Will definitely hire again for our company's annual dinner.",
      date: "2026-04-22",
      event: "Corporate Gala",
    },
    {
      id: "r3",
      name: "Chioma A.",
      avatar: "https://i.pravatar.cc/150?img=25",
      rating: 4,
      comment: "Great food and presentation. Setup was slightly delayed but they made up for it with excellent service throughout the evening.",
      date: "2026-03-15",
      event: "Birthday Party",
    },
  ],
};

export default function VendorProfilePage() {
  const router = useRouter();
  const { vendorId, eventId, eventName } = useLocalSearchParams();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("portfolio");
  const [selectedImage, setSelectedImage] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [bookingStep, setBookingStep] = useState(1);
  const [bookingForm, setBookingForm] = useState({
    message: "",
  });
  
  const [userEvents, setUserEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventDropdown, setShowEventDropdown] = useState(false);
  const [eventSearchQuery, setEventSearchQuery] = useState("");
  const [vendorFullRes, setVendorFullRes] = useState(null);
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([
    {
      id: "m1",
      sender: "vendor",
      text: "Hello! Thank you for reaching out. How can we help make your event special?",
      time: "10:30 AM",
    },
  ]);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [bookingSubmitted, setBookingSubmitted] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const chatScrollRef = useRef(null);

  useEffect(() => {
    loadVendor();
    loadUserEvents();
  }, [vendorId]);

  const loadUserEvents = async () => {
    try {
      const ustr = await AsyncStorage.getItem("user");
      if (ustr) {
        const u = JSON.parse(ustr);
        const res = await api.get(`/event/key?value=${u._id}&key=userId`);
        if (res.data?.success) {
           setUserEvents(Array.isArray(res.data.data) ? res.data.data : [res.data.data]);
        }
      }
    } catch(e) {
      console.log("Error loading user events:", e);
    }
  };

  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [loading]);

  const loadVendor = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/user/vendors/${vendorId}`);
      if (res.data?.success) {
        setVendorFullRes(res.data);
        setVendor(res.data.data || res.data);
      } else {
        setVendor(MOCK_VENDOR);
      }
    } catch (err) {
      console.error("Error loading vendor:", err?.response?.data || err?.message);
      setVendor(MOCK_VENDOR);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;
    const newMsg = {
      id: `m${Date.now()}`,
      sender: "user",
      text: chatMessage.trim(),
      time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    };
    setChatHistory((prev) => [...prev, newMsg]);
    setChatMessage("");

    // Simulate vendor reply after 1.5s
    setTimeout(() => {
      const replies = [
        "Thank you for your message! We'd love to assist with your event.",
        "Great! Let me check our availability for that date.",
        "That sounds perfect. Could you share more details about your event theme?",
        "We have accommodated similar events before. Would you like to schedule a consultation call?",
      ];
      const vendorReply = {
        id: `m${Date.now() + 1}`,
        sender: "vendor",
        text: replies[Math.floor(Math.random() * replies.length)],
        time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      };
      setChatHistory((prev) => [...prev, vendorReply]);
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
    }, 1500);

    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleSubmitBooking = async () => {
    const finalEventId = selectedEvent?._id || selectedEvent?.id || eventId;
    if (!finalEventId) {
      Toast.show({ type: "error", text1: "Missing Event", text2: "You must select an event to book a vendor." });
      return;
    }
    if (!selectedPlan) {
      Toast.show({ type: "error", text1: "Select Product", text2: "Please select a product/package to book." });
      return;
    }

    setIsSubmittingBooking(true);
    try {
      const payload = {
        eventId: finalEventId,
        vendorId: vendorId,
        productIds: [selectedPlan._id || selectedPlan.id],
        amount: selectedPlan.price || 0,
        message: bookingForm.message || "Please support my event.",
      };

      // Debug log — check Metro bundler to see exactly what is being sent
      console.log("📦 Booking payload:", JSON.stringify(payload, null, 2));

      const res = await api.post('/user/vendors/book', payload);
      
      if (res.data?.success) {
        setBookingSubmitted(true);
      } else {
        const errMsg = res.data?.message || "Failed to submit booking.";
        console.log("❌ Booking failed (non-success):", res.data);
        Toast.show({ type: "error", text1: "Booking Failed", text2: errMsg });
      }
    } catch (err) {
      // Show the REAL backend error message instead of a generic one
      const backendMsg = err?.response?.data?.message 
                      || err?.response?.data?.error 
                      || err?.message 
                      || "Something went wrong.";
      console.log("❌ Booking error:", JSON.stringify(err?.response?.data || err?.message));
      Toast.show({ 
        type: "error", 
        text1: "Booking Failed", 
        text2: backendMsg,
        visibilityTime: 5000,
      });
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  const renderStars = (rating, size = 14) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Ionicons
        key={i}
        name={i < Math.floor(rating) ? "star" : i < rating ? "star-half" : "star-outline"}
        size={size}
        color="#FAB843"
      />
    ));
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8F6FF" }}>
        <ActivityIndicator size="large" color="#5A31F4" />
      </View>
    );
  }

  if (!vendor) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontFamily: "Poppins_500Medium", color: "#666" }}>Vendor not found</Text>
      </View>
    );
  }
  console.log('the vendor info', vendor)
  const productsList = Array.isArray(vendor.products) ? vendor.products : [];
  const vendorProducts = vendor.products
                      || vendor.pricingTiers
                      || vendor.vendor?.products
                      || vendorFullRes?.products
                      || vendorFullRes?.data?.products
                      || [];
  const hasBookableProducts = Array.isArray(vendorProducts) && vendorProducts.length > 0;
  const getProductKey = (product) => product?._id || product?.id || product?.name;
  const isPlanSelected = (product) => selectedPlan && getProductKey(selectedPlan) === getProductKey(product);
  const formatCurrency = (value) => `₦${Number(value || 0).toLocaleString()}`;

  const portfolioImages = vendor.portfolio?.length 
  ? vendor.portfolio 
  : productsList
      .flatMap((p) => {
        if (Array.isArray(p.pictures)) return p.pictures;
        if (Array.isArray(p.picture)) return p.picture;
        if (Array.isArray(p.images)) return p.images;
        return [p.picture, p.image, p.imageUrl].filter((x) => typeof x === "string");
      })
      .filter(Boolean);

  return (
    <View style={{ flex: 1, backgroundColor: "#F8F6FF" }}>
      <Animated.ScrollView
        style={{ flex: 1, opacity: fadeAnim }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* ━━━ HERO ━━━ */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: vendor.coverPhoto || portfolioImages[0] || "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?w=600" }}
            style={styles.heroBg}
            blurRadius={2}
          />
          <View style={styles.heroOverlay} />
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.heroContent}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{vendor.categoryIcon || "✨"} {vendor.category?.name || vendor.category || "Service"}</Text>
            </View>
            <Text style={styles.heroName}>{vendor.businessName || vendor.name}</Text>
            <View style={styles.heroMeta}>
              <View style={styles.starsRow}>
                {renderStars(vendor.rating || 0, 16)}
                <Text style={styles.heroRatingText}>{vendor.rating || 0} ({vendor.reviewCount || 0} reviews)</Text>
              </View>
              <View style={styles.heroLocation}>
                <Ionicons name="location-sharp" size={14} color="rgba(255,255,255,0.9)" />
                <Text style={styles.heroLocationText}>{vendor.city || "Lagos"}, {vendor.state || "Nigeria"}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ━━━ STATS ROW ━━━ */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statBoxNum}>{vendor.completedOrders}+</Text>
            <Text style={styles.statBoxLabel}>Events Done</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statBoxNum}>{vendor.rating}</Text>
            <Text style={styles.statBoxLabel}>Rating</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statBoxNum}>{vendor.isActive ? "Active" : "Inactive"}</Text>
            <Text style={styles.statBoxLabel}>Response</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Ionicons name="shield-checkmark" size={18} color={vendor.verified ? "#2ECC71" : "#ccc"} />
            <Text style={styles.statBoxLabel}>{vendor.verified ? "Verified" : "Unverified"}</Text>
          </View>
        </View>

        {/* ━━━ ABOUT ━━━ */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>About</Text>
          <Text style={styles.cardBody}>{vendor.description}</Text>
          <View style={styles.contactRow}>
            <TouchableOpacity style={styles.contactChip}>
              <Ionicons name="call-outline" size={14} color="#5A31F4" />
              <Text style={styles.contactChipText}>{vendor.phone}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactChip}>
              <Ionicons name="mail-outline" size={14} color="#5A31F4" />
              <Text style={styles.contactChipText}>{vendor.email}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ━━━ TABS ━━━ */}
        <View style={styles.tabsContainer}>
          {["portfolio", "pricing", "reviews"].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ━━━ PORTFOLIO ━━━ */}
        {activeTab === "portfolio" && (
          <View style={styles.portfolioGrid}>
            {productsList.length > 0 ? (
              productsList.map((prod, i) => {
                // Collect all pictures from this product
                const pics = Array.isArray(prod.pictures) && prod.pictures.length > 0
                ? prod.pictures
                : Array.isArray(prod.picture) && prod.picture.length > 0
                  ? prod.picture
                  : Array.isArray(prod.images) && prod.images.length > 0
                    ? prod.images
                    : [prod.picture, prod.image, prod.imageUrl].filter((p) => typeof p === "string");

                const hasPics = pics.length > 0;

                return (
                  <View key={prod._id || i} style={styles.portfolioProductCard}>
                    {/* Image row - horizontal scroll if multiple */}
                    {hasPics && (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        pagingEnabled={pics.length > 1}
                        style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 0 }}
                      >
                        {pics.map((uri, idx) => (
                          <TouchableOpacity key={idx} activeOpacity={0.88} onPress={() => setSelectedImage(uri)}>
                            <Image
                              source={{ uri }}
                              style={[styles.portfolioProductImg, { width: width - 64, marginRight: idx < pics.length - 1 ? 2 : 0 }]}
                            />
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}
                    {!hasPics && (
                      <View style={[styles.portfolioProductImg, { backgroundColor: '#F3EDFF', justifyContent: 'center', alignItems: 'center' }]}>
                        <Ionicons name="image-outline" size={40} color="#D1C4FF" />
                      </View>
                    )}

                    {/* Image indicator dots */}
                    {pics.length > 1 && (
                      <View style={styles.imageDots}>
                        {pics.map((_, idx) => (
                          <View key={idx} style={[styles.imageDot, idx === 0 && styles.imageDotActive]} />
                        ))}
                      </View>
                    )}

                    <View style={styles.portfolioProductInfo}>
                      <View style={styles.portfolioProductHeaderRow}>
                        <Text style={styles.portfolioProductName}>{prod.name || "Product"}</Text>
                        {prod.isActive === false ? (
                          <View style={styles.inactiveBadge}>
                            <Text style={styles.inactiveBadgeText}>Inactive</Text>
                          </View>
                        ): (<View style={styles.inactiveBadge}>
                            <Text style={styles.inactiveBadgeText}>Active</Text>
                          </View>)}
                      </View>
                      {prod.description ? (
                        <Text style={styles.portfolioProductDesc} numberOfLines={3}>{prod.description}</Text>
                      ) : null}
                      <View style={styles.portfolioProductMeta}>
                        <Text style={styles.portfolioProductPrice}>
                          {prod.price > 0 ? `₦${prod.price.toLocaleString()}` : 'Price on request'}
                        </Text>
                        {prod.deliveryTime ? (
                          <View style={styles.deliveryChip}>
                            <Ionicons name="time-outline" size={11} color="#888" />
                            <Text style={styles.deliveryChipText}>{prod.deliveryTime}</Text>
                          </View>
                        ) : null}
                      </View>
                      {prod.isPriceFixed === false && (
                        <Text style={styles.negotiableLabel}>💬 Price is negotiable</Text>
                      )}
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyPortfolio}>
                <Ionicons name="images-outline" size={48} color="#D1C4FF" />
                <Text style={styles.emptyPortfolioText}>No portfolio products yet.</Text>
              </View>
            )}
          </View>
        )}

        {/* ━━━ PRICING / PRODUCTS ━━━ */}
        {activeTab === "pricing" && (
          <View style={styles.pricingContainer}>
            {(() => {
              if (!hasBookableProducts) {
                return (
                  <View style={{ padding: 20 }}>
                    <Text style={{ textAlign: "center", color: "#888", fontFamily: "Poppins_400Regular" }}>
                      No products or packages available for this vendor.
                    </Text>
                  </View>
                );
              }
              
              return vendorProducts.map((tier, idx) => (
              <TouchableOpacity
                key={tier._id || tier.id || idx}
                style={[
                  styles.pricingCard,
                  idx === 1 && styles.pricingCardFeatured,
                  isPlanSelected(tier) && styles.pricingCardSelected,
                ]}
                onPress={() => setSelectedPlan(tier)}
                activeOpacity={0.88}
              >
                {idx === 1 && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>Most Popular</Text>
                  </View>
                )}
                {isPlanSelected(tier) && (
                  <View style={styles.selectedCheckmark}>
                    <Ionicons name="checkmark-circle" size={22} color="#5A31F4" />
                  </View>
                )}
                <Text style={[styles.tierName, idx === 1 && styles.tierNameFeatured]}>{tier.name}</Text>
                <Text style={[styles.tierPrice, idx === 1 && styles.tierPriceFeatured]}>
                  {formatCurrency(tier.price)}
                </Text>
                <Text style={styles.tierDesc}>{tier.description || `Delivery time: ${tier.deliveryTime || 'N/A'} • Delivery Fee: ₦${tier.deliveryFee || 0}`}</Text>
                {tier.includes && (
                  <View style={styles.includesList}>
                    {tier.includes.map((item, j) => (
                      <View key={j} style={styles.includesItem}>
                        <Ionicons name="checkmark-circle" size={15} color={idx === 1 ? "#FFF" : "#5A31F4"} />
                        <Text style={[styles.includesText, idx === 1 && styles.includesTextFeatured]}>{item}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            ));
            })()}
          </View>
        )}

        {/* ━━━ REVIEWS ━━━ */}
        {activeTab === "reviews" && (
          <View style={styles.reviewsContainer}>
            <View style={styles.reviewSummary}>
              <Text style={styles.reviewBigScore}>{vendor.rating || 0}</Text>
              <View style={styles.starsRow}>{renderStars(vendor.rating || 0, 22)}</View>
              <Text style={styles.reviewCountText}>Based on {vendor.reviewCount || 0} reviews</Text>
            </View>
            {(vendor.reviews || []).map((review) => (
              <View key={review.id || review._id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Image source={{ uri: review.avatar || "https://i.pravatar.cc/150" }} style={styles.reviewAvatar} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reviewerName}>{review.name || "User"}</Text>
                    <Text style={styles.reviewEvent}>{review.event || "Event"}</Text>
                  </View>
                  <View>
                    <View style={styles.starsRow}>{renderStars(review.rating || 0, 12)}</View>
                    <Text style={styles.reviewDate}>
                      {review.date ? new Date(review.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : ""}
                    </Text>
                  </View>
                </View>
                <Text style={styles.reviewComment}>{review.comment}</Text>
              </View>
            ))}
            {(!vendor.reviews || vendor.reviews.length === 0) && (
              <Text style={{ textAlign: "center", width: "100%", padding: 20, color: "#888" }}>
                No reviews yet.
              </Text>
            )}
          </View>
        )}
      </Animated.ScrollView>

      {/* ━━━ STICKY BOTTOM BAR ━━━ */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.bookBtn}
          onPress={() => {
            setBookingStep(1);
            setBookingSubmitted(false);
            setShowBookingModal(true);
          }}
        >
          <Ionicons name="calendar-outline" size={18} color="#FFF" />
          <Text style={styles.bookBtnText}>Book Vendor</Text>
        </TouchableOpacity>
      </View>

      {/* ━━━ PORTFOLIO IMAGE VIEWER ━━━ */}
      <Modal visible={!!selectedImage} transparent animationType="fade" onRequestClose={() => setSelectedImage(null)}>
        <View style={styles.imageViewerOverlay}>
          <TouchableOpacity style={styles.imageViewerClose} onPress={() => setSelectedImage(null)}>
            <Ionicons name="close-circle" size={36} color="#FFF" />
          </TouchableOpacity>
          {selectedImage && (
            <Image source={{ uri: selectedImage }} style={styles.imageViewerImg} resizeMode="contain" />
          )}
        </View>
      </Modal>

      {/* ━━━ BOOKING MODAL ━━━ */}
      <Modal visible={showBookingModal} transparent animationType="slide" onRequestClose={() => setShowBookingModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.bookingSheet}>
            <View style={styles.sheetHandle} />
            <TouchableOpacity
              style={styles.sheetCloseBtn}
              onPress={() => {
                setShowBookingModal(false);
                setBookingStep(1);
                setBookingSubmitted(false);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={22} color="#333" />
            </TouchableOpacity>
            {bookingSubmitted ? (
              <View style={styles.successContainer}>
                <View style={styles.successCircle}>
                  <Ionicons name="checkmark" size={44} color="#2ECC71" />
                </View>
                <Text style={styles.successTitle}>Booking Request Sent! 🎉</Text>
                <Text style={styles.successSubtitle}>
                  {vendor.businessName} will review your request and respond within 24 hours.
                </Text>
                <View style={styles.bookingRefBox}>
                  <Text style={styles.bookingRefLabel}>Booking Reference</Text>
                  <Text style={styles.bookingRefValue}>VEN-BK-{Math.floor(Math.random() * 90000) + 10000}</Text>
                </View>
                <TouchableOpacity
                  style={styles.doneBtn}
                  onPress={() => {
                    setShowBookingModal(false);
                    setBookingSubmitted(false);
                    setBookingStep(1);
                  }}
                >
                  <Text style={styles.doneBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.sheetTitle}>Book {vendor.businessName}</Text>
                {selectedPlan && (
                  <View style={styles.selectedPlanBanner}>
                    <Ionicons name="layers-outline" size={16} color="#5A31F4" />
                    <Text style={styles.selectedPlanText}>
                      {selectedPlan.name} — {formatCurrency(selectedPlan.price)}
                    </Text>
                  </View>
                )}
                
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>

                {/* Step indicator */}
                <View style={styles.bookingStepRow}>
                  {[1, 2].map((s) => (
                    <React.Fragment key={s}>
                      <View style={[styles.stepCircleSmall, bookingStep >= s && styles.stepCircleSmallActive]}>
                        <Text style={[styles.stepCircleNum, bookingStep >= s && styles.stepCircleNumActive]}>{s}</Text>
                      </View>
                      {s < 2 && <View style={[styles.stepLineSmall, bookingStep >= 2 && styles.stepLineSmallActive]} />}
                    </React.Fragment>
                  ))}
                </View>

                {bookingStep === 1 && (
                  <View style={styles.bookingFormSection}>
                    <Text style={styles.formSectionLabel}>Select Event to Book For</Text>
                    
                    {/* Inline Event Selector */}
                    <TouchableOpacity 
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: 16,
                        backgroundColor: "#F8F6FF",
                        borderWidth: 1,
                        borderColor: showEventDropdown ? "#5A31F4" : "#E0D4FF",
                        borderRadius: showEventDropdown ? 12 : 12,
                        borderBottomLeftRadius: showEventDropdown ? 0 : 12,
                        borderBottomRightRadius: showEventDropdown ? 0 : 12,
                      }}
                      onPress={() => setShowEventDropdown(prev => !prev)}
                    >
                      <Text style={{ 
                        fontFamily: "Poppins_400Regular", 
                        fontSize: 14, 
                        color: selectedEvent ? "#1A1A1A" : "#888" 
                      }}>
                        {selectedEvent ? selectedEvent.name : "Select an event..."}
                      </Text>
                      <Ionicons name={showEventDropdown ? "chevron-up" : "chevron-down"} size={20} color="#5A31F4" />
                    </TouchableOpacity>

                    {/* Search + List (inline) */}
                    {showEventDropdown && (
                      <View style={{
                        borderWidth: 1,
                        borderTopWidth: 0,
                        borderColor: "#5A31F4",
                        borderBottomLeftRadius: 12,
                        borderBottomRightRadius: 12,
                        backgroundColor: "#FFF",
                        overflow: "hidden",
                        marginBottom: 20,
                      }}>
                        {/* Search row */}
                        <View style={{
                          flexDirection: "row",
                          alignItems: "center",
                          backgroundColor: "#F8F6FF",
                          paddingHorizontal: 12,
                          height: 44,
                          borderBottomWidth: 1,
                          borderBottomColor: "#EEE"
                        }}>
                          <Ionicons name="search" size={16} color="#888" />
                          <TextInput
                            style={{ flex: 1, marginLeft: 8, fontFamily: "Poppins_400Regular", fontSize: 14, color: "#1A1A1A" }}
                            placeholder="Search..."
                            placeholderTextColor="#AAA"
                            value={eventSearchQuery}
                            onChangeText={setEventSearchQuery}
                          />
                          {eventSearchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setEventSearchQuery("")}>
                              <Ionicons name="close-circle" size={16} color="#888" />
                            </TouchableOpacity>
                          )}
                        </View>

                        {/* Event list */}
                        {userEvents.length === 0 ? (
                          <View style={{ padding: 20, alignItems: "center" }}>
                            <Text style={{ fontFamily: "Poppins_400Regular", color: "#888", textAlign: "center" }}>
                              No events found. Create an event first!
                            </Text>
                          </View>
                        ) : (
                          userEvents
                            .filter(ev => ev.name?.toLowerCase().includes(eventSearchQuery.toLowerCase()))
                            .map(item => (
                              <TouchableOpacity
                                key={item._id}
                                style={{
                                  padding: 14,
                                  borderBottomWidth: 1,
                                  borderBottomColor: "#F0F0F0",
                                  flexDirection: "row",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  backgroundColor: selectedEvent?._id === item._id ? "#F3EDFF" : "#FFF"
                                }}
                                onPress={() => {
                                  setSelectedEvent(item);
                                  setShowEventDropdown(false);
                                  setEventSearchQuery("");
                                }}
                              >
                                <View>
                                  <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 14, color: selectedEvent?._id === item._id ? "#5A31F4" : "#1A1A1A" }}>
                                    {item.name}
                                  </Text>
                                  <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 12, color: "#888" }}>
                                    {item.start ? new Date(item.start).toLocaleDateString() : "No date"}
                                  </Text>
                                </View>
                                {selectedEvent?._id === item._id && (
                                  <Ionicons name="checkmark-circle" size={20} color="#5A31F4" />
                                )}
                              </TouchableOpacity>
                            ))
                        )}
                      </View>
                    )}

                    <Text style={[styles.formSectionLabel, { marginTop: 20 }]}>Select Package</Text>
                    {!hasBookableProducts ? (
                      <View style={styles.emptyPackageBox}>
                        <Ionicons name="cube-outline" size={22} color="#9CA3AF" />
                        <Text style={styles.emptyPackageText}>No products or packages available for this vendor.</Text>
                      </View>
                    ) : (
                      <View style={styles.modalPackageList}>
                        {vendorProducts.map((product, idx) => {
                          const selected = isPlanSelected(product);
                          return (
                            <TouchableOpacity
                              key={product._id || product.id || product.name || idx}
                              style={[styles.modalPackageCard, selected && styles.modalPackageCardSelected]}
                              onPress={() => setSelectedPlan(product)}
                              activeOpacity={0.86}
                            >
                              <View style={styles.modalPackageIcon}>
                                <Ionicons name={selected ? "checkmark-circle" : "layers-outline"} size={18} color="#5A31F4" />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.modalPackageName} numberOfLines={1}>{product.name || "Package"}</Text>
                                <Text style={styles.modalPackageMeta} numberOfLines={2}>
                                  {product.description || `Delivery time: ${product.deliveryTime || "N/A"} • Delivery Fee: ${formatCurrency(product.deliveryFee)}`}
                                </Text>
                              </View>
                              <Text style={styles.modalPackagePrice}>{formatCurrency(product.price)}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}

                    <TouchableOpacity
                      style={[styles.bookingNextBtn, (!selectedEvent || !selectedPlan) && { opacity: 0.4 }]}
                      disabled={!selectedEvent || !selectedPlan}
                      onPress={() => setBookingStep(2)}
                    >
                      <Text style={styles.bookingNextBtnText}>Next →</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {bookingStep === 2 && (
                  <View style={styles.bookingFormSection}>
                    <Text style={styles.formSectionLabel}>Additional Details</Text>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Message to Vendor</Text>
                      <TextInput
                        style={[styles.input, { height: 100, textAlignVertical: "top", paddingTop: 12 }]}
                        value={bookingForm.message}
                        onChangeText={(v) => setBookingForm((p) => ({ ...p, message: v }))}
                        placeholder="Describe your event, special requirements, dietary restrictions, etc."
                        placeholderTextColor="#bbb"
                        multiline
                      />
                    </View>

                    {/* Booking Summary */}
                    <View style={styles.bookingSummaryBox}>
                      <Text style={styles.summaryTitle}>Booking Summary</Text>
                      <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Vendor</Text><Text style={styles.summaryVal}>{vendor.businessName || vendor.name}</Text></View>
                      <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Event</Text><Text style={styles.summaryVal}>{selectedEvent?.name || eventName || "No Event Selected"}</Text></View>
                      <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Product/Package</Text><Text style={styles.summaryVal}>{selectedPlan?.name || "No package selected"}</Text></View>
                      {selectedPlan && (
                        <View style={[styles.summaryRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#eee" }]}>
                          <Text style={[styles.summaryLabel, { fontFamily: "Poppins_700Bold" }]}>Estimated Cost</Text>
                          <Text style={[styles.summaryVal, { color: "#5A31F4", fontFamily: "Poppins_700Bold" }]}>{formatCurrency(selectedPlan.price)}</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.bookingActions}>
                      <TouchableOpacity style={styles.backStepBtn} onPress={() => setBookingStep(1)}>
                        <Text style={styles.backStepBtnText}>← Back</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.submitBookingBtn}
                        onPress={handleSubmitBooking}
                        disabled={isSubmittingBooking}
                      >
                        {isSubmittingBooking ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <Text style={styles.submitBookingBtnText}>Send Request</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                </KeyboardAvoidingView>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ━━━ CHAT MODAL ━━━ */}
      <Modal visible={showChatModal} transparent animationType="slide" onRequestClose={() => setShowChatModal(false)}>
        <KeyboardAvoidingView
          style={styles.chatKeyboardAvoid}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.chatModalOverlay}>
            <View style={styles.chatSheet}>
              <View style={styles.chatHeader}>
                <TouchableOpacity onPress={() => setShowChatModal(false)}>
                  <Ionicons name="arrow-back" size={22} color="#333" />
                </TouchableOpacity>
                <View style={styles.chatVendorInfo}>
                  <View style={styles.chatAvatar}>
                    <Text style={{ fontSize: 20 }}>{vendor.categoryIcon}</Text>
                  </View>
                  <View>
                    <Text style={styles.chatVendorName}>{vendor.businessName}</Text>
                    <Text style={styles.chatVendorOnline}>● Online</Text>
                  </View>
                </View>
                <View style={{ width: 22 }} />
              </View>

              <ScrollView
                ref={chatScrollRef}
                style={styles.chatMessages}
                contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10 }}
                onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: false })}
                keyboardShouldPersistTaps="handled"
              >
                {chatHistory.map((msg) => (
                  <View
                    key={msg.id}
                    style={[
                      styles.chatBubbleWrap,
                      msg.sender === "user" ? styles.chatBubbleWrapUser : styles.chatBubbleWrapVendor,
                    ]}
                  >
                    <View
                      style={[
                        styles.chatBubble,
                        msg.sender === "user" ? styles.chatBubbleUser : styles.chatBubbleVendor,
                      ]}
                    >
                      <Text style={[styles.chatBubbleText, msg.sender === "user" && styles.chatBubbleTextUser]}>
                        {msg.text}
                      </Text>
                    </View>
                    <Text style={[styles.chatTime, msg.sender === "user" && { textAlign: "right" }]}>{msg.time}</Text>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.chatInputBar}>
                <TextInput
                  style={styles.chatInput}
                  value={chatMessage}
                  onChangeText={setChatMessage}
                  placeholder="Type a message..."
                  placeholderTextColor="#bbb"
                  multiline
                  maxLength={500}
                  onSubmitEditing={handleSendMessage}
                />
                <TouchableOpacity style={styles.sendBtn} onPress={handleSendMessage} disabled={!chatMessage.trim()}>
                  <Ionicons name="send" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  heroContainer: { height: 280, position: "relative", justifyContent: "flex-end" },
  heroBg: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,0,50,0.65)" },
  backBtn: {
    position: "absolute", top: Platform.OS === "ios" ? 55 : 40, left: 16,
    width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center", alignItems: "center",
  },
  heroContent: { padding: 20, paddingBottom: 24 },
  categoryBadge: {
    alignSelf: "flex-start", backgroundColor: "rgba(90,49,244,0.75)",
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginBottom: 8,
  },
  categoryBadgeText: { color: "#FFF", fontFamily: "Poppins_600SemiBold", fontSize: 12 },
  heroName: { color: "#FFF", fontFamily: "Poppins_700Bold", fontSize: 26, lineHeight: 32 },
  heroMeta: { marginTop: 8, gap: 6 },
  starsRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  heroRatingText: { color: "rgba(255,255,255,0.9)", fontFamily: "Poppins_500Medium", fontSize: 13, marginLeft: 4 },
  heroLocation: { flexDirection: "row", alignItems: "center", gap: 4 },
  heroLocationText: { color: "rgba(255,255,255,0.85)", fontFamily: "Poppins_400Regular", fontSize: 13 },
  statsRow: {
    flexDirection: "row", backgroundColor: "#FFF", marginHorizontal: 16, marginTop: -20,
    borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 12, elevation: 5,
    justifyContent: "space-around", alignItems: "center",
  },
  statBox: { alignItems: "center", flex: 1 },
  statBoxNum: { fontFamily: "Poppins_400Bold", fontSize: 12, color: "#1A1A1A" },
  statBoxLabel: { fontFamily: "Poppins_400Regular", fontSize: 11, color: "#888", marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: "#F0F0F0" },
  card: { backgroundColor: "#FFF", margin: 16, borderRadius: 16, padding: 18, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  cardTitle: { fontFamily: "Poppins_700Bold", fontSize: 16, color: "#1A1A1A", marginBottom: 8 },
  cardBody: { fontFamily: "Poppins_400Regular", fontSize: 14, color: "#555", lineHeight: 22 },
  contactRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 },
  contactChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#F3EDFF", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  contactChipText: { fontFamily: "Poppins_500Medium", fontSize: 12, color: "#5A31F4" },
  tabsContainer: { flexDirection: "row", marginHorizontal: 16, backgroundColor: "#EEEAF8", borderRadius: 12, padding: 4 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10 },
  tabBtnActive: { backgroundColor: "#5A31F4" },
  tabBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 13, color: "#888" },
  tabBtnTextActive: { color: "#FFF" },
  portfolioGrid: { flexDirection: "column", padding: 16, gap: 16 },
  portfolioProductCard: {
    backgroundColor: "#FFF", borderRadius: 16,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
    overflow: "hidden",
  },
  portfolioProductImg: { height: 220, resizeMode: "cover" },
  portfolioProductInfo: { padding: 14 },
  portfolioProductHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  portfolioProductName: { fontFamily: "Poppins_700Bold", fontSize: 16, color: "#1A1A1A", flex: 1 },
  inactiveBadge: { backgroundColor: "#FEE2E2", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginLeft: 8 },
  inactiveBadgeText: { fontFamily: "Poppins_500Medium", fontSize: 10, color: "#EF4444" },
  portfolioProductDesc: { fontFamily: "Poppins_400Regular", fontSize: 13, color: "#666", lineHeight: 20, marginBottom: 10 },
  portfolioProductMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  portfolioProductPrice: { fontFamily: "Poppins_700Bold", fontSize: 15, color: "#5A31F4" },
  deliveryChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#F3F4F6", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  deliveryChipText: { fontFamily: "Poppins_400Regular", fontSize: 11, color: "#666" },
  negotiableLabel: { fontFamily: "Poppins_400Regular", fontSize: 12, color: "#888", marginTop: 8 },
  imageDots: { flexDirection: "row", justifyContent: "center", gap: 5, marginTop: 8, marginBottom: 4 },
  imageDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#DDD" },
  imageDotActive: { backgroundColor: "#5A31F4", width: 16 },
  emptyPortfolio: { alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 10, width: "100%" },
  emptyPortfolioText: { fontFamily: "Poppins_400Regular", fontSize: 14, color: "#9CA3AF" },
  pricingContainer: { padding: 16, gap: 14 },
  pricingCard: { backgroundColor: "#FFF", borderRadius: 18, padding: 20, borderWidth: 2, borderColor: "#E8DBFF", position: "relative" },
  pricingCardFeatured: { backgroundColor: "#5A31F4", borderColor: "#5A31F4" },
  pricingCardSelected: { borderColor: "#5A31F4", borderWidth: 2.5 },
  popularBadge: { position: "absolute", top: 14, right: 14, backgroundColor: "#FAB843", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  popularBadgeText: { fontFamily: "Poppins_700Bold", fontSize: 10, color: "#FFF" },
  selectedCheckmark: { position: "absolute", top: 14, left: 14 },
  tierName: { fontFamily: "Poppins_700Bold", fontSize: 17, color: "#1A1A1A", marginBottom: 4 },
  tierNameFeatured: { color: "#FFF" },
  tierPrice: { fontFamily: "Poppins_700Bold", fontSize: 26, color: "#5A31F4", marginBottom: 6 },
  tierPriceFeatured: { color: "#FAB843" },
  tierDesc: { fontFamily: "Poppins_400Regular", fontSize: 13, color: "#666", marginBottom: 14 },
  includesList: { gap: 8 },
  includesItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  includesText: { fontFamily: "Poppins_400Regular", fontSize: 13, color: "#444", flex: 1 },
  includesTextFeatured: { color: "rgba(255,255,255,0.9)" },
  reviewsContainer: { padding: 16 },
  reviewSummary: { alignItems: "center", padding: 24, backgroundColor: "#FFF", borderRadius: 16, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  reviewBigScore: { fontFamily: "Poppins_700Bold", fontSize: 52, color: "#1A1A1A" },
  reviewCountText: { fontFamily: "Poppins_400Regular", fontSize: 13, color: "#888", marginTop: 4 },
  reviewCard: { backgroundColor: "#FFF", borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  reviewHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10, gap: 10 },
  reviewAvatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: "#E8DBFF" },
  reviewerName: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: "#1A1A1A" },
  reviewEvent: { fontFamily: "Poppins_400Regular", fontSize: 11, color: "#888" },
  reviewDate: { fontFamily: "Poppins_400Regular", fontSize: 11, color: "#aaa", textAlign: "right", marginTop: 2 },
  reviewComment: { fontFamily: "Poppins_400Regular", fontSize: 13, color: "#555", lineHeight: 20 },
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: "#FFF", borderTopWidth: 1, borderTopColor: "#F0F0F0",
    paddingBottom: Platform.OS === "ios" ? 28 : 14,
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 10, elevation: 6,
  },
  chatBtn: {
    flex: 1, flexDirection: "row", gap: 8, justifyContent: "center", alignItems: "center",
    borderWidth: 1.5, borderColor: "#5A31F4", borderRadius: 14, paddingVertical: 14,
  },
  chatBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: "#5A31F4" },
  bookBtn: {
    flex: 2, flexDirection: "row", gap: 8, justifyContent: "center", alignItems: "center",
    backgroundColor: "#5A31F4", borderRadius: 14, paddingVertical: 14,
  },
  bookBtnText: { fontFamily: "Poppins_700Bold", fontSize: 15, color: "#FFF" },
  imageViewerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center", alignItems: "center" },
  imageViewerClose: { position: "absolute", top: 55, right: 20, zIndex: 10 },
  imageViewerImg: { width: "100%", height: "80%" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  bookingSheet: {
    backgroundColor: "#FFF", borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: Platform.OS === "ios" ? 36 : 20,
    maxHeight: height * 0.88,
  },
  sheetHandle: { width: 40, height: 4, backgroundColor: "#DDD", borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  sheetCloseBtn: {
    position: "absolute",
    top: 14,
    right: 18,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
  },
  sheetTitle: { fontFamily: "Poppins_700Bold", fontSize: 20, color: "#1A1A1A", marginBottom: 16 },
  selectedPlanBanner: { flexDirection: "row", gap: 8, alignItems: "center", backgroundColor: "#F3EDFF", padding: 12, borderRadius: 10, marginBottom: 20, borderWidth: 1, borderColor: "#E0D4FF" },
  selectedPlanText: { fontFamily: "Poppins_600SemiBold", fontSize: 13, color: "#5A31F4" },
  bookingStepRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 20, gap: 0 },
  stepCircleSmall: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#eee", justifyContent: "center", alignItems: "center" },
  stepCircleSmallActive: { backgroundColor: "#5A31F4" },
  stepCircleNum: { fontFamily: "Poppins_600SemiBold", fontSize: 13, color: "#999" },
  stepCircleNumActive: { color: "#FFF" },
  stepLineSmall: { width: 60, height: 2, backgroundColor: "#EEE" },
  stepLineSmallActive: { backgroundColor: "#5A31F4" },
  bookingFormSection: { gap: 0 },
  formSectionLabel: { fontFamily: "Poppins_700Bold", fontSize: 15, color: "#1A1A1A", marginBottom: 14 },
  modalPackageList: { gap: 10, marginBottom: 18 },
  modalPackageCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFF",
    borderWidth: 1.5,
    borderColor: "#E8DBFF",
    borderRadius: 14,
    padding: 12,
  },
  modalPackageCardSelected: { backgroundColor: "#F3EDFF", borderColor: "#5A31F4" },
  modalPackageIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F3EDFF",
    justifyContent: "center",
    alignItems: "center",
  },
  modalPackageName: { fontFamily: "Poppins_700Bold", fontSize: 14, color: "#1A1A1A" },
  modalPackageMeta: { fontFamily: "Poppins_400Regular", fontSize: 11, color: "#777", marginTop: 2, lineHeight: 16 },
  modalPackagePrice: { fontFamily: "Poppins_700Bold", fontSize: 13, color: "#5A31F4", marginLeft: 8 },
  emptyPackageBox: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#F8F6FF",
    borderWidth: 1,
    borderColor: "#E0D4FF",
    borderRadius: 14,
    padding: 18,
    marginBottom: 18,
  },
  emptyPackageText: { fontFamily: "Poppins_400Regular", fontSize: 13, color: "#888", textAlign: "center" },
  inputGroup: { marginBottom: 14 },
  inputLabel: { fontFamily: "Poppins_500Medium", fontSize: 13, color: "#444", marginBottom: 6 },
  input: { backgroundColor: "#F8F6FF", borderWidth: 1.5, borderColor: "#E0D4FF", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontFamily: "Poppins_400Regular", fontSize: 14, color: "#1A1A1A" },
  bookingNextBtn: { backgroundColor: "#5A31F4", borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  bookingNextBtnText: { fontFamily: "Poppins_700Bold", fontSize: 15, color: "#FFF" },
  bookingSummaryBox: { backgroundColor: "#F8F6FF", borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#E0D4FF" },
  summaryTitle: { fontFamily: "Poppins_700Bold", fontSize: 14, color: "#1A1A1A", marginBottom: 10 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  summaryLabel: { fontFamily: "Poppins_400Regular", fontSize: 13, color: "#666" },
  summaryVal: { fontFamily: "Poppins_500Medium", fontSize: 13, color: "#1A1A1A", textAlign: "right", flex: 1, marginLeft: 16 },
  bookingActions: { flexDirection: "row", gap: 12, marginTop: 4 },
  backStepBtn: { flex: 1, borderWidth: 1.5, borderColor: "#DDD", borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  backStepBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: "#666" },
  submitBookingBtn: { flex: 2, backgroundColor: "#5A31F4", borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  submitBookingBtnText: { fontFamily: "Poppins_700Bold", fontSize: 15, color: "#FFF" },
  successContainer: { alignItems: "center", padding: 16, paddingBottom: 24 },
  successCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: "#E6F9F0", justifyContent: "center", alignItems: "center", marginBottom: 20 },
  successTitle: { fontFamily: "Poppins_700Bold", fontSize: 22, color: "#1A1A1A", textAlign: "center", marginBottom: 10 },
  successSubtitle: { fontFamily: "Poppins_400Regular", fontSize: 14, color: "#666", textAlign: "center", lineHeight: 22, marginBottom: 20 },
  bookingRefBox: { backgroundColor: "#F3EDFF", padding: 16, borderRadius: 14, width: "100%", alignItems: "center", marginBottom: 24 },
  bookingRefLabel: { fontFamily: "Poppins_400Regular", fontSize: 12, color: "#888" },
  bookingRefValue: { fontFamily: "Poppins_700Bold", fontSize: 20, color: "#5A31F4", marginTop: 4, letterSpacing: 1 },
  doneBtn: { backgroundColor: "#5A31F4", borderRadius: 14, paddingVertical: 15, alignItems: "center", width: "100%" },
  doneBtnText: { fontFamily: "Poppins_700Bold", fontSize: 16, color: "#FFF" },
  chatKeyboardAvoid: { flex: 1 },
  chatModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  chatSheet: { backgroundColor: "#FFF", borderTopLeftRadius: 28, borderTopRightRadius: 28, height: height * 0.82 },
  chatHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  chatVendorInfo: { flexDirection: "row", gap: 10, alignItems: "center" },
  chatAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#F3EDFF", justifyContent: "center", alignItems: "center" },
  chatVendorName: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: "#1A1A1A" },
  chatVendorOnline: { fontFamily: "Poppins_400Regular", fontSize: 12, color: "#2ECC71" },
  chatMessages: { flex: 1, backgroundColor: "#F8F6FF" },
  chatBubbleWrap: { marginBottom: 12 },
  chatBubbleWrapUser: { alignItems: "flex-end" },
  chatBubbleWrapVendor: { alignItems: "flex-start" },
  chatBubble: { maxWidth: "80%", padding: 12, borderRadius: 16 },
  chatBubbleUser: { backgroundColor: "#5A31F4", borderBottomRightRadius: 4 },
  chatBubbleVendor: { backgroundColor: "#FFF", borderBottomLeftRadius: 4, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  chatBubbleText: { fontFamily: "Poppins_400Regular", fontSize: 14, color: "#1A1A1A", lineHeight: 21 },
  chatBubbleTextUser: { color: "#FFF" },
  chatTime: { fontFamily: "Poppins_400Regular", fontSize: 11, color: "#AAA", marginTop: 3 },
  chatInputBar: {
    flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: "#FFF", borderTopWidth: 1, borderTopColor: "#F0F0F0",
    alignItems: "flex-end", paddingBottom: 16,
  },
  chatInput: { flex: 1, backgroundColor: "#F8F6FF", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100, fontFamily: "Poppins_400Regular", fontSize: 14, color: "#1A1A1A" },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#5A31F4", justifyContent: "center", alignItems: "center" },
});
