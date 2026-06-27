import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import api from "../../../utils/axiosInstance";

const { width: screenWidth } = Dimensions.get("window");
const CELL_SIZE = (screenWidth - 48 - 24) / 3;

// ─── Category Icon Map ────────────────────────────────────────────────────────
const ICON_MAP = {
  "master of ceremony": "🎤",
  catering: "🍽️",
  photography: "📸",
  decoration: "🎨",
  "event hall": "🏛️",
  "sound": "🎵",
  lighting: "💡",
  cake: "🎂",
  security: "🛡️",
  transportation: "🚌",
  makeup: "💄",
  dj: "🎧",
  band: "🎸",
  default: "🏢",
};

const getCategoryIcon = (name = "") => {
  const lower = name.toLowerCase();
  for (const key of Object.keys(ICON_MAP)) {
    if (lower.includes(key)) return ICON_MAP[key];
  }
  return ICON_MAP.default;
};

// ─── Empty Product Template ───────────────────────────────────────────────────
const emptyProduct = () => ({
  id: Date.now().toString(),
  name: "",
  pictures: [],
  price: "",
  isPriceFixed: true,
  deliveryTime: "",
  deliveryFee: "",
  isActive: true,
});

export default function VendorRegistration() {
  const router = useRouter();
  const { user } = useAuth();
  const { success, error: showError } = useToast();

  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [focusedField, setFocusedField] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [expandedProductId, setExpandedProductId] = useState(null);

  // Step 2: Business Details
  const [form, setForm] = useState({
    businessName: "",
    description: "",
    phone: "",
    state: "",
    city: "",
  });

  // Step 3: Dynamic Fields (from serviceType.fields)
  const [dynamicFields, setDynamicFields] = useState({});

  // Step 4: Portfolio
  const [coverPhoto, setCoverPhoto] = useState(null); // { uri, uploaded_url }
  const [products, setProducts] = useState([emptyProduct()]);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingProductId, setUploadingProductId] = useState(null); // id of product currently uploading images

  const skeletonOpacity = useRef(new Animated.Value(0.3)).current;
  const spinnerRotation = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const successToastShown = useRef(false);

  // ─── Load Categories ────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true);
        const token = await AsyncStorage.getItem("token");
        const res = await api.get("/user/servicetype", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data?.success) {
          setCategories(res.data.data || []);
        }
      } catch (e) {
        console.log("Failed to load categories:", e);
        showError("Could not load service categories. Please try again.");
      } finally {
        setCategoriesLoading(false);
      }
    };
    fetchCategories();
  }, []);

  // ─── Skeleton pulse ─────────────────────────────────────────────────────────
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonOpacity, { toValue: 0.7, duration: 650, useNativeDriver: true }),
        Animated.timing(skeletonOpacity, { toValue: 0.3, duration: 650, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [skeletonOpacity]);

  // ─── Submit spinner ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!submitting) { spinnerRotation.stopAnimation(); spinnerRotation.setValue(0); return; }
    const spin = Animated.loop(
      Animated.timing(spinnerRotation, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true })
    );
    spin.start();
    return () => spin.stop();
  }, [spinnerRotation, submitting]);

  // ─── Success animation ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!submitted) return;
    Animated.spring(successScale, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }).start();
    if (!successToastShown.current) {
      successToastShown.current = true;
      success("Application submitted successfully!");
    }
  }, [submitted, success, successScale]);

  // ─── Step Definitions ────────────────────────────────────────────────────────
  const stepDetails = [
    { number: 1, label: "Service" },
    { number: 2, label: "Details" },
    { number: 3, label: "Fields" },
    { number: 4, label: "Portfolio" },
  ];

  // ─── Validation ──────────────────────────────────────────────────────────────
  const isDetailsValid =
    form.businessName.trim() &&
    form.description.trim() &&
    form.phone.trim() &&
    form.state.trim() &&
    form.city.trim();

  const isDynamicValid = !selectedCategory?.fields?.length ||
    selectedCategory.fields.every((f) =>
      !f.is_required_attribute || dynamicFields[f.name_attribute]?.toString().trim()
    );

  const isPortfolioValid = products.some((p) => p.name.trim());

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const updateForm = (field, value) => setForm((c) => ({ ...c, [field]: value }));
  const updateDynamic = (key, value) => setDynamicFields((c) => ({ ...c, [key]: value }));

  const handleBack = () => {
    if (step === 1) { router.back(); return; }
    setStep(step - 1);
  };

  // ─── S3 Upload Helpers ───────────────────────────────────────────────────────
  const getSignedUrl = async (fileName, fileType) => {
    const token = await AsyncStorage.getItem('token');
    const response = await api.put(
      '/auth/sign-s3',
      { fileName, fileType },
      { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, timeout: 30000 }
    );
    return response.data; // { uploadURL, ... }
  };

  const uploadImageToS3 = async (localUri, uploadURL, mimeType) => {
    const res = await fetch(localUri);
    const blob = await res.blob();
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 90000);
    const up = await fetch(uploadURL, {
      method: 'PUT',
      body: blob,
      headers: { 'Content-Type': mimeType },
      signal: controller.signal,
    });
    clearTimeout(tid);
    if (!up.ok) throw new Error(`S3 upload failed: ${up.status}`);
    return uploadURL.split('?')[0]; // clean S3 URL
  };

  // ─── Image Uploading ─────────────────────────────────────────────────────────
  const pickCoverPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.length) {
      const asset = result.assets[0];
      // Show local preview immediately
      setCoverPhoto({ uri: asset.uri, uploaded_url: null });
      setUploadingCover(true);
      try {
        const ext = asset.uri.split('.').pop() || 'jpg';
        const mimeType = asset.mimeType || `image/${ext}`;
        const fileName = `cover_${Date.now()}.${ext}`;
        const { uploadURL } = await getSignedUrl(fileName, mimeType);
        const s3Url = await uploadImageToS3(asset.uri, uploadURL, mimeType);
        setCoverPhoto({ uri: asset.uri, uploaded_url: s3Url });
      } catch (e) {
        showError('Failed to upload cover photo. Please try again.');
        setCoverPhoto(null);
      } finally {
        setUploadingCover(false);
      }
    }
  };

  const pickProductImages = async (productId) => {
    const product = products.find((p) => p.id === productId);
    const remaining = 3 - (product?.pictures?.length || 0);
    if (remaining <= 0) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: remaining,
    });
    if (!result.canceled && result.assets?.length) {
      // Optimistically add local URIs as placeholders
      const localUris = result.assets.map((a) => a.uri);
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId
            ? { ...p, pictures: [...p.pictures, ...localUris].slice(0, 3) }
            : p
        )
      );
      setUploadingProductId(productId);
      try {
        const s3Urls = [];
        for (const asset of result.assets) {
          const ext = asset.uri.split('.').pop() || 'jpg';
          const mimeType = asset.mimeType || `image/${ext}`;
          const fileName = `product_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
          const { uploadURL } = await getSignedUrl(fileName, mimeType);
          const s3Url = await uploadImageToS3(asset.uri, uploadURL, mimeType);
          s3Urls.push(s3Url);
        }
        // Replace local URIs with S3 URLs
        setProducts((prev) =>
          prev.map((p) => {
            if (p.id !== productId) return p;
            // Replace the last result.assets.length local uris with s3 URLs
            const before = p.pictures.slice(0, p.pictures.length - result.assets.length);
            return { ...p, pictures: [...before, ...s3Urls].slice(0, 3) };
          })
        );
      } catch (e) {
        showError('Failed to upload product image. Please try again.');
        // Remove the failed local URIs
        setProducts((prev) =>
          prev.map((p) =>
            p.id === productId
              ? { ...p, pictures: p.pictures.filter((uri) => !localUris.includes(uri)) }
              : p
          )
        );
      } finally {
        setUploadingProductId(null);
      }
    }
  };

  const removeProductImage = (productId, imgIndex) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, pictures: p.pictures.filter((_, i) => i !== imgIndex) } : p
      )
    );
  };

  const updateProduct = (productId, field, value) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, [field]: value } : p))
    );
  };

  const removeProduct = (productId) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  // ─── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem("token");

      // Validate that all images are uploaded (no local file:// URIs)
      const hasUnuploadedImages = products.some((p) =>
        p.pictures.some((uri) => uri.startsWith('file://'))
      );
      if (hasUnuploadedImages || uploadingProductId || uploadingCover) {
        showError('Please wait for all images to finish uploading.');
        setSubmitting(false);
        return;
      }

      const payload = {
        serviceTypeId: selectedCategory._id,
        cover_photo: coverPhoto?.uploaded_url || "",
        dynamicFields: dynamicFields,
        ...form,
        products: products
          .filter((p) => p.name.trim())
          .map((p) => ({
            name: p.name.trim(),
            picture: p.pictures, // already S3 URLs
            price: parseFloat(p.price) || 0,
            isPriceFixed: p.isPriceFixed,
            deliveryTime: p.deliveryTime.trim(),
            deliveryFee: parseFloat(p.deliveryFee) || 0,
            isActive: p.isActive,
          })),
      };

      await api.post("/vendor/request", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSubmitted(true);
    } catch (e) {
      const msg = e.response?.data?.message || "Failed to submit. Please try again.";
      showError(msg);
      console.log('vendor register error ', e.response)
    } finally {
      setSubmitting(false);
    }
  };

  const spinnerStyle = {
    transform: [{ rotate: spinnerRotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }],
  };

  // ─── Shared Renderers ─────────────────────────────────────────────────────────
  const renderStepIndicator = () => (
    <View style={styles.indicatorContainer}>
      <View style={styles.indicatorRow}>
        {stepDetails.map((item, index) => {
          const isCompleted = step > item.number;
          const isActive = step === item.number;
          return (
            <React.Fragment key={item.number}>
              <View style={styles.indicatorItem}>
                <View style={[styles.stepCircle, (isCompleted || isActive) && styles.stepCircleActive]}>
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  ) : (
                    <Text style={[styles.stepNumber, isActive && styles.stepNumberActive]}>{item.number}</Text>
                  )}
                </View>
              </View>
              {index < stepDetails.length - 1 && (
                <View style={[styles.stepLine, step > item.number && styles.stepLineCompleted]} />
              )}
            </React.Fragment>
          );
        })}
      </View>
      <View style={styles.indicatorLabels}>
        {stepDetails.map((item) => (
          <Text key={item.number} style={[styles.indicatorLabel, step >= item.number && styles.indicatorLabelActive]}>
            {item.label}
          </Text>
        ))}
      </View>
    </View>
  );

  const renderHeader = (title, subtitle) => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backIconButton} onPress={handleBack} activeOpacity={0.75}>
        <Ionicons name="chevron-back" size={26} color="#333" />
      </TouchableOpacity>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );

  const renderLabel = (label, required = true) => (
    <Text style={styles.inputLabel}>
      {label} {required && <Text style={styles.required}>*</Text>}
    </Text>
  );

  const renderInput = ({ label, field, multiline, keyboardType, placeholder, required = true }) => (
    <View style={styles.fieldGroup}>
      {renderLabel(label, required)}
      <TextInput
        style={[styles.input, multiline && styles.textArea, focusedField === field && styles.inputFocused]}
        value={form[field]}
        onChangeText={(v) => updateForm(field, v)}
        onFocus={() => setFocusedField(field)}
        onBlur={() => setFocusedField("")}
        keyboardType={keyboardType || "default"}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        placeholder={placeholder || ""}
        placeholderTextColor="#999"
      />
    </View>
  );

  // ─── Step 1: Service Category ─────────────────────────────────────────────────
  const renderStepOne = () => (
    <>
      {renderHeader("What service do you offer?", "Choose the category that best describes your business")}
      {renderStepIndicator()}

      {categoriesLoading ? (
        <View style={styles.categoryGrid}>
          {[1, 2, 3, 4].map((i) => (
            <Animated.View key={i} style={[styles.skeletonCard, { opacity: skeletonOpacity }]} />
          ))}
        </View>
      ) : categories.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={40} color="#ccc" />
          <Text style={styles.emptyStateText}>No categories available</Text>
        </View>
      ) : (
        <View style={styles.categoryGrid}>
          {categories.map((category) => {
            const isSelected = selectedCategory?._id === category._id;
            const icon = getCategoryIcon(category.name);
            return (
              <TouchableOpacity
                key={category._id}
                style={[styles.categoryCard, isSelected && styles.categoryCardSelected]}
                onPress={() => setSelectedCategory(category)}
                activeOpacity={0.82}
              >
                {isSelected && (
                  <View style={styles.selectedBadge}>
                    <Ionicons name="checkmark" size={10} color="#fff" />
                  </View>
                )}
                <Text style={styles.categoryIcon}>{icon}</Text>
                <Text style={styles.categoryName}>{category.name}</Text>
                <Text style={styles.categoryDescription} numberOfLines={2}>{category.description}</Text>
                {category.no_of_vendors > 0 && (
                  <View style={styles.vendorCountBadge}>
                    <Text style={styles.vendorCountText}>{category.no_of_vendors} vendors</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <TouchableOpacity
        style={[styles.primaryButton, selectedCategory ? styles.primaryButtonEnabled : styles.primaryButtonDisabled]}
        onPress={() => setStep(2)}
        disabled={!selectedCategory}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryButtonText}>Continue</Text>
      </TouchableOpacity>
    </>
  );

  // ─── Step 2: Business Details ──────────────────────────────────────────────────
  const renderStepTwo = () => (
    <>
      {renderHeader("Tell us about your business", "Fill in your business information")}
      {renderStepIndicator()}

      {renderInput({ label: "Business Name", field: "businessName", placeholder: "e.g. John's Catering Co." })}
      {renderInput({ label: "Description", field: "description", multiline: true, placeholder: "Describe what makes your service unique..." })}
      {renderInput({ label: "Phone Number", field: "phone", keyboardType: "phone-pad", placeholder: "e.g. 08012345678" })}
      {renderInput({ label: "State", field: "state", placeholder: "e.g. Lagos" })}
      {renderInput({ label: "City", field: "city", placeholder: "e.g. Lekki" })}

      <TouchableOpacity
        style={[styles.primaryButton, isDetailsValid ? styles.primaryButtonEnabled : styles.primaryButtonDisabled]}
        onPress={() => setStep(3)}
        disabled={!isDetailsValid}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryButtonText}>Continue</Text>
      </TouchableOpacity>
    </>
  );

  // ─── Step 3: Dynamic Fields ───────────────────────────────────────────────────
  const renderStepThree = () => {
    const fields = selectedCategory?.fields || [];
    return (
      <>
        {renderHeader(`${selectedCategory?.name} Details`, "Fill in the specifics for your service category")}
        {renderStepIndicator()}

        {fields.length === 0 ? (
          <View style={styles.emptyDynamicBox}>
            <Ionicons name="checkmark-circle-outline" size={44} color="#8B5CF6" />
            <Text style={styles.emptyDynamicText}>No additional details required for this category.</Text>
          </View>
        ) : (
          fields.map((field) => (
            <View key={field.name_attribute} style={styles.fieldGroup}>
              {renderLabel(field.label_attribute, field.is_required_attribute)}
              <TextInput
                style={[styles.input, focusedField === field.name_attribute && styles.inputFocused]}
                value={dynamicFields[field.name_attribute] || ""}
                onChangeText={(v) => updateDynamic(field.name_attribute, v)}
                onFocus={() => setFocusedField(field.name_attribute)}
                onBlur={() => setFocusedField("")}
                keyboardType={field.type_attribute === "number" ? "numeric" : "default"}
                placeholder={field.placeholder_attribute}
                placeholderTextColor="#999"
              />
            </View>
          ))
        )}

        <TouchableOpacity
          style={[styles.primaryButton, isDynamicValid ? styles.primaryButtonEnabled : styles.primaryButtonDisabled]}
          onPress={() => setStep(4)}
          disabled={!isDynamicValid}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
        </TouchableOpacity>
      </>
    );
  };

  // ─── Step 4: Portfolio (Cover Photo + Products) ───────────────────────────────
  const renderProductCard = (product) => {
    const isExpanded = expandedProductId === product.id;
    return (
      <View key={product.id} style={styles.productCard}>
        {/* Card Header */}
        <TouchableOpacity
          style={styles.productCardHeader}
          onPress={() => setExpandedProductId(isExpanded ? null : product.id)}
          activeOpacity={0.8}
        >
          <View style={styles.productCardHeaderLeft}>
            <Ionicons name="cube-outline" size={18} color="#5A31F4" />
            <Text style={styles.productCardTitle} numberOfLines={1}>
              {product.name || "New Product"}
            </Text>
          </View>
          <View style={styles.productCardHeaderRight}>
            <TouchableOpacity onPress={() => removeProduct(product.id)} style={styles.deleteProductBtn}>
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
            </TouchableOpacity>
            <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color="#999" />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.productCardBody}>
            {/* Product Name */}
            <View style={styles.fieldGroup}>
              {renderLabel("Product / Service Name")}
              <TextInput
                style={[styles.input, focusedField === `name_${product.id}` && styles.inputFocused]}
                value={product.name}
                onChangeText={(v) => updateProduct(product.id, "name", v)}
                onFocus={() => setFocusedField(`name_${product.id}`)}
                onBlur={() => setFocusedField("")}
                placeholder="e.g. Wedding Package"
                placeholderTextColor="#999"
              />
            </View>

            {/* Price Row */}
            <View style={styles.rowFields}>
              <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                {renderLabel("Price (₦)")}
                <TextInput
                  style={[styles.input, focusedField === `price_${product.id}` && styles.inputFocused]}
                  value={product.price}
                  onChangeText={(v) => updateProduct(product.id, "price", v)}
                  onFocus={() => setFocusedField(`price_${product.id}`)}
                  onBlur={() => setFocusedField("")}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor="#999"
                />
              </View>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                {renderLabel("Delivery Fee (₦)")}
                <TextInput
                  style={[styles.input, focusedField === `fee_${product.id}` && styles.inputFocused]}
                  value={product.deliveryFee}
                  onChangeText={(v) => updateProduct(product.id, "deliveryFee", v)}
                  onFocus={() => setFocusedField(`fee_${product.id}`)}
                  onBlur={() => setFocusedField("")}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            {/* Delivery Time */}
            <View style={styles.fieldGroup}>
              {renderLabel("Delivery Time")}
              <TextInput
                style={[styles.input, focusedField === `time_${product.id}` && styles.inputFocused]}
                value={product.deliveryTime}
                onChangeText={(v) => updateProduct(product.id, "deliveryTime", v)}
                onFocus={() => setFocusedField(`time_${product.id}`)}
                onBlur={() => setFocusedField("")}
                placeholder="e.g. 24 hours, 2 days"
                placeholderTextColor="#999"
              />
            </View>

            {/* Toggles */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleItem}>
                <Text style={styles.toggleLabel}>Fixed Price</Text>
                <Switch
                  value={product.isPriceFixed}
                  onValueChange={(v) => updateProduct(product.id, "isPriceFixed", v)}
                  trackColor={{ false: "#ddd", true: "#C4B5FD" }}
                  thumbColor={product.isPriceFixed ? "#5A31F4" : "#f4f3f4"}
                />
              </View>
              <View style={styles.toggleItem}>
                <Text style={styles.toggleLabel}>Active Listing</Text>
                <Switch
                  value={product.isActive}
                  onValueChange={(v) => updateProduct(product.id, "isActive", v)}
                  trackColor={{ false: "#ddd", true: "#C4B5FD" }}
                  thumbColor={product.isActive ? "#5A31F4" : "#f4f3f4"}
                />
              </View>
            </View>

            {/* Product Images */}
            <Text style={styles.inputLabel}>Product Photos <Text style={styles.optionalTag}>(up to 3)</Text></Text>
            <View style={styles.miniImageGrid}>
              {product.pictures.map((uri, idx) => (
                <View key={idx} style={styles.miniImageCell}>
                  <Image source={{ uri }} style={styles.miniImage} />
                  {/* Show uploading spinner on the last image if still uploading */}
                  {uploadingProductId === product.id && idx === product.pictures.length - 1 && (
                    <View style={[styles.removeButton, { backgroundColor: 'rgba(0,0,0,0.5)', width: 36, height: 36, borderRadius: 18 }]}>
                      <ActivityIndicator size="small" color="#fff" />
                    </View>
                  )}
                  {uploadingProductId !== product.id && (
                    <TouchableOpacity style={styles.removeButton} onPress={() => removeProductImage(product.id, idx)}>
                      <Ionicons name="close" size={10} color="#fff" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {product.pictures.length < 3 && (
                <TouchableOpacity style={styles.miniAddCell} onPress={() => pickProductImages(product.id)}>
                  <Ionicons name="camera-outline" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderStepFour = () => (
    <>
      {renderHeader("Showcase Your Work", "Add your cover photo and advertise your products or services")}
      {renderStepIndicator()}

      {/* Cover Photo */}
      <Text style={styles.sectionTitle}>Cover Photo</Text>
      <TouchableOpacity style={styles.coverPhotoBox} onPress={pickCoverPhoto} activeOpacity={0.8}>
        {coverPhoto ? (
          <>
            <Image source={{ uri: coverPhoto.uri }} style={styles.coverPhotoImage} />
            {uploadingCover ? (
              <View style={styles.coverPhotoOverlay}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.coverPhotoOverlayText}>Uploading...</Text>
              </View>
            ) : (
              <View style={styles.coverPhotoOverlay}>
                <Ionicons name="camera" size={22} color="#fff" />
                <Text style={styles.coverPhotoOverlayText}>Change Photo</Text>
              </View>
            )}
          </>
        ) : (
          <>
            <Ionicons name="image-outline" size={36} color="#9CA3AF" />
            <Text style={styles.coverPhotoPlaceholder}>Tap to upload a cover photo</Text>
            <Text style={styles.coverPhotoHint}>This is the first thing clients see on your profile</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Products / Services */}
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>Products / Services</Text>
        <TouchableOpacity
          onPress={() => {
            const p = emptyProduct();
            setProducts((prev) => [...prev, p]);
            setExpandedProductId(p.id);
          }}
          style={styles.addProductBtn}
        >
          <Ionicons name="add" size={16} color="#5A31F4" />
          <Text style={styles.addProductBtnText}>Add</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.sectionSubtitle}>List your packages so clients know what to expect</Text>

      {products.map(renderProductCard)}

      <TouchableOpacity
        style={[styles.primaryButton, isPortfolioValid ? styles.primaryButtonEnabled : styles.primaryButtonDisabled]}
        onPress={handleSubmit}
        disabled={!isPortfolioValid}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryButtonText}>Submit Application</Text>
      </TouchableOpacity>

      {!isPortfolioValid && (
        <Text style={styles.portfolioHint}>Add at least one product or service to continue</Text>
      )}


    </>
  );

  // ─── Loader & Success ─────────────────────────────────────────────────────────
  const renderLoader = () => (
    <View style={styles.loaderOverlay}>
      <View style={styles.loaderCard}>
        <Animated.View style={spinnerStyle}>
          <Ionicons name="sync-outline" size={36} color="#5A31F4" />
        </Animated.View>
        <Text style={styles.loaderText}>Submitting your application...</Text>
      </View>
    </View>
  );

  const renderSuccess = () => (
    <View style={styles.successScreen}>
      <Animated.View style={[styles.successCircle, { transform: [{ scale: successScale }] }]}>
        <Ionicons name="checkmark" size={40} color="#22C55E" />
      </Animated.View>
      <Text style={styles.successTitle}>Application Submitted!</Text>
      <Text style={styles.successSubtitle}>
        We'll review your application and notify you within 24-48 hours.
      </Text>
      {selectedCategory && (
        <View style={styles.categoryPill}>
          <Text style={styles.categoryPillText}>
            {getCategoryIcon(selectedCategory.name)} {selectedCategory.name}
          </Text>
        </View>
      )}
      <TouchableOpacity style={styles.successButton} onPress={() => router.back()} activeOpacity={0.85}>
        <Text style={styles.primaryButtonText}>Back to Vendor</Text>
      </TouchableOpacity>
    </View>
  );

  // ─── Main Return ──────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <KeyboardAvoidingView style={styles.keyboardView}>
        <ScrollView style={styles.container} contentContainerStyle={styles.successScrollContent} showsVerticalScrollIndicator={false}>
          {renderSuccess()}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 1 && renderStepOne()}
        {step === 2 && renderStepTwo()}
        {step === 3 && renderStepThree()}
        {step === 4 && renderStepFour()}
      </ScrollView>
      {submitting && renderLoader()}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: { flex: 1, backgroundColor: "#F8F8F8" },
  container: { flex: 1, backgroundColor: "#F8F8F8" },
  scrollContent: { paddingHorizontal: 24, paddingTop: Platform.OS === "ios" ? 62 : 44, paddingBottom: 48 },
  successScrollContent: { flexGrow: 1 },

  header: { marginBottom: 22 },
  backIconButton: { alignItems: "center", height: 34, justifyContent: "center", marginBottom: 18, marginLeft: -8, width: 34 },
  title: { color: "#333", fontFamily: "Poppins_700Bold", fontSize: 22, lineHeight: 30 },
  subtitle: { color: "#666", fontFamily: "Poppins_400Regular", fontSize: 14, lineHeight: 21, marginTop: 6 },

  // Step Indicator
  indicatorContainer: { marginBottom: 26 },
  indicatorRow: { alignItems: "center", flexDirection: "row", justifyContent: "center" },
  indicatorItem: { alignItems: "center", width: 30 },
  stepCircle: { alignItems: "center", backgroundColor: "#fff", borderColor: "#E8DBFF", borderRadius: 15, borderWidth: 1, height: 30, justifyContent: "center", width: 30 },
  stepCircleActive: { backgroundColor: "#5A31F4", borderColor: "#5A31F4" },
  stepNumber: { color: "#999", fontFamily: "Poppins_600SemiBold", fontSize: 12 },
  stepNumberActive: { color: "#fff" },
  stepLine: { backgroundColor: "#E8DBFF", height: 2, flex: 1, maxWidth: 48 },
  stepLineCompleted: { backgroundColor: "#5A31F4" },
  indicatorLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, paddingHorizontal: 4 },
  indicatorLabel: { color: "#999", flex: 1, fontFamily: "Poppins_400Regular", fontSize: 10, textAlign: "center" },
  indicatorLabelActive: { color: "#5A31F4" },

  // Categories
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 8 },
  skeletonCard: { backgroundColor: "#DDD", borderRadius: 12, minHeight: 110, width: (screenWidth - 48 - 12) / 2 },
  categoryCard: { alignItems: "center", backgroundColor: "#fff", borderColor: "#E8DBFF", borderRadius: 12, borderWidth: 1, justifyContent: "center", minHeight: 110, padding: 14, position: "relative", width: (screenWidth - 48 - 12) / 2 },
  categoryCardSelected: { backgroundColor: "#F3EDFF", borderColor: "#5A31F4", borderWidth: 2 },
  selectedBadge: { alignItems: "center", backgroundColor: "#5A31F4", borderRadius: 8, height: 18, justifyContent: "center", position: "absolute", right: 8, top: 8, width: 18 },
  categoryIcon: { fontSize: 28 },
  categoryName: { color: "#333", fontFamily: "Poppins_600SemiBold", fontSize: 13, marginTop: 8, textAlign: "center" },
  categoryDescription: { color: "#999", fontFamily: "Poppins_400Regular", fontSize: 11, lineHeight: 15, marginTop: 4, textAlign: "center" },
  vendorCountBadge: { marginTop: 6, backgroundColor: "#EDE9FE", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  vendorCountText: { color: "#5A31F4", fontFamily: "Poppins_500Medium", fontSize: 10 },

  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyStateText: { color: "#999", fontFamily: "Poppins_400Regular", fontSize: 14, marginTop: 8 },
  emptyDynamicBox: { alignItems: "center", paddingVertical: 40, backgroundColor: "#F3EDFF", borderRadius: 16, marginBottom: 24 },
  emptyDynamicText: { color: "#5A31F4", fontFamily: "Poppins_500Medium", fontSize: 14, marginTop: 10, textAlign: "center", paddingHorizontal: 20 },

  // Form
  fieldGroup: { marginBottom: 16 },
  inputLabel: { color: "#333", fontFamily: "Poppins_500Medium", fontSize: 13, marginBottom: 6 },
  required: { color: "#FF4444" },
  optionalTag: { color: "#9CA3AF", fontFamily: "Poppins_400Regular", fontSize: 11 },
  input: { backgroundColor: "#fff", borderColor: "#E8DBFF", borderRadius: 10, borderWidth: 1, color: "#333", fontFamily: "Poppins_400Regular", fontSize: 14, height: 52, paddingHorizontal: 14 },
  inputFocused: { borderColor: "#5A31F4" },
  textArea: { height: 100, minHeight: 100, paddingTop: 14 },
  rowFields: { flexDirection: "row" },

  // Buttons
  primaryButton: { alignItems: "center", backgroundColor: "#5A31F4", borderRadius: 12, height: 52, justifyContent: "center", marginTop: 24, width: "100%" },
  primaryButtonEnabled: { elevation: 4, shadowColor: "#5A31F4", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 8 },
  primaryButtonDisabled: { opacity: 0.4 },
  primaryButtonText: { color: "#fff", fontFamily: "Poppins_600SemiBold", fontSize: 16 },
  skipButton: { alignItems: "center", marginTop: 16, paddingVertical: 10 },
  skipButtonText: { color: "#666", fontFamily: "Poppins_400Regular", fontSize: 14 },

  // Cover Photo
  sectionTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: "#333", marginBottom: 6 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  sectionSubtitle: { fontFamily: "Poppins_400Regular", fontSize: 13, color: "#9CA3AF", marginBottom: 14 },
  coverPhotoBox: { backgroundColor: "#fff", borderColor: "#E8DBFF", borderRadius: 16, borderWidth: 1, borderStyle: "dashed", height: 160, alignItems: "center", justifyContent: "center", marginBottom: 24, overflow: "hidden" },
  coverPhotoImage: { width: "100%", height: "100%", position: "absolute" },
  coverPhotoOverlay: { backgroundColor: "rgba(0,0,0,0.4)", position: "absolute", bottom: 0, left: 0, right: 0, height: 50, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  coverPhotoOverlayText: { color: "#fff", fontFamily: "Poppins_500Medium", fontSize: 14 },
  coverPhotoPlaceholder: { fontFamily: "Poppins_500Medium", fontSize: 14, color: "#6B7280", marginTop: 10 },
  coverPhotoHint: { fontFamily: "Poppins_400Regular", fontSize: 11, color: "#9CA3AF", marginTop: 4 },

  // Products
  portfolioHint: { color: "#EF4444", fontFamily: "Poppins_400Regular", fontSize: 12, textAlign: "center", marginTop: 8 },
  addProductBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#F3EDFF", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addProductBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 13, color: "#5A31F4" },
  productCard: { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#E8DBFF", marginBottom: 12, overflow: "hidden" },
  productCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 },
  productCardHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  productCardTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: "#333", flex: 1 },
  productCardHeaderRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  deleteProductBtn: { padding: 4 },
  productCardBody: { paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: "#F3F4F6" },

  // Toggles
  toggleRow: { flexDirection: "row", gap: 12, marginBottom: 16, marginTop: 4 },
  toggleItem: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#F9FAFB", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: "#F3F4F6" },
  toggleLabel: { fontFamily: "Poppins_500Medium", fontSize: 12, color: "#374151" },

  // Mini Image Grid
  miniImageGrid: { flexDirection: "row", gap: 8, marginTop: 4 },
  miniImageCell: { width: 70, height: 70, borderRadius: 8, overflow: "hidden", position: "relative" },
  miniImage: { width: "100%", height: "100%" },
  miniAddCell: { width: 70, height: 70, borderRadius: 8, borderWidth: 1, borderStyle: "dashed", borderColor: "#ccc", alignItems: "center", justifyContent: "center" },
  removeButton: { position: "absolute", top: 4, right: 4, backgroundColor: "#EF4444", borderRadius: 8, width: 16, height: 16, alignItems: "center", justifyContent: "center" },

  // Loader
  loaderOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" },
  loaderCard: { backgroundColor: "#fff", borderRadius: 16, padding: 28, alignItems: "center", gap: 14, width: 200 },
  loaderText: { fontFamily: "Poppins_500Medium", fontSize: 14, color: "#333", textAlign: "center" },

  // Success
  successScreen: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  successCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: "#F0FDF4", alignItems: "center", justifyContent: "center", marginBottom: 24, borderWidth: 2, borderColor: "#86EFAC" },
  successTitle: { fontFamily: "Poppins_700Bold", fontSize: 22, color: "#111", marginBottom: 10, textAlign: "center" },
  successSubtitle: { fontFamily: "Poppins_400Regular", fontSize: 14, color: "#666", textAlign: "center", lineHeight: 22 },
  categoryPill: { backgroundColor: "#F3EDFF", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginTop: 16 },
  categoryPillText: { fontFamily: "Poppins_500Medium", fontSize: 14, color: "#5A31F4" },
  successButton: { backgroundColor: "#5A31F4", borderRadius: 12, height: 52, width: "100%", alignItems: "center", justifyContent: "center", marginTop: 28 },
});
