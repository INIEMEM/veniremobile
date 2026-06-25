import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import CustomFormLoader from "../../../components/CustomFormLoader";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import api from "../../../utils/axiosInstance";

const { width } = Dimensions.get("window");
const imageSize = (width - 72) / 3;

export default function VendorRegistration() {
  const router = useRouter();
  const toast = useToast();
  const { token } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [categoryError, setCategoryError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [uploadPercent, setUploadPercent] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState("");
  const successScale = useRef(new Animated.Value(0.6)).current;

  const [formData, setFormData] = useState({
    businessName: "",
    description: "",
    phone: "",
    state: "",
    city: "",
  });
  const [portfolioImages, setPortfolioImages] = useState([]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (isSuccess) {
      Animated.spring(successScale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }).start();
    }
  }, [isSuccess, successScale]);

  const fetchCategories = async () => {
    try {
      setCategoryLoading(true);
      setCategoryError("");
      const response = await api.get("/vendor/categories");
      const nextCategories = response.data?.data || response.data?.categories || [];
      setCategories(nextCategories);
    } catch (error) {
      console.error("Error fetching vendor categories:", error);
      setCategoryError(
        error.response?.data?.message ||
          "Unable to load vendor categories. Please try again."
      );
    } finally {
      setCategoryLoading(false);
    }
  };

  const updateFormData = (key, value) => {
    setFormData((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const isStepTwoValid =
    formData.businessName.trim() &&
    formData.description.trim() &&
    formData.phone.trim() &&
    formData.state.trim() &&
    formData.city.trim();

  const getCategoryId = (category) => category?._id || category?.id || category?.value;

  const handlePickImages = async () => {
    try {
      const remainingSlots = 6 - portfolioImages.length;

      if (remainingSlots <= 0) {
        toast.info("You can upload up to 6 photos");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
        quality: 0.85,
      });

      if (!result.canceled && result.assets?.length) {
        const selectedImages = result.assets.slice(0, remainingSlots).map((asset) => ({
          uri: asset.uri,
          fileName: asset.fileName || `vendor_portfolio_${Date.now()}.jpg`,
          mimeType: asset.mimeType || "image/jpeg",
        }));

        setPortfolioImages((current) => [...current, ...selectedImages].slice(0, 6));
      }
    } catch (error) {
      console.error("Image picker error:", error);
      toast.error("Failed to pick images");
    }
  };

  const removeImage = (index) => {
    setPortfolioImages((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const getSignedUrl = async (fileName, fileType) => {
    const response = await api.put(
      "/auth/sign-s3",
      {
        fileName,
        fileType,
      },
      {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        timeout: 30000,
      }
    );

    return response.data;
  };

  const uploadImageToS3 = async (image, uploadURL) => {
    const imageResponse = await fetch(image.uri);
    const blob = await imageResponse.blob();

    const uploadResponse = await fetch(uploadURL, {
      method: "PUT",
      body: blob,
      headers: {
        "Content-Type": image.mimeType,
      },
    });

    if (!uploadResponse.ok) {
      throw new Error("Failed to upload image");
    }
  };

  const uploadPortfolioImages = async () => {
    const uploadedUrls = [];

    if (portfolioImages.length === 0) {
      return uploadedUrls;
    }

    setUploading(true);
    setUploadPercent(0);

    for (let index = 0; index < portfolioImages.length; index += 1) {
      const image = portfolioImages[index];
      setUploadProgress(`Uploading ${index + 1} of ${portfolioImages.length} images...`);

      const signedData = await getSignedUrl(image.fileName, image.mimeType);
      const uploadURL = signedData?.uploadURL || signedData?.url;

      if (!uploadURL) {
        throw new Error("Could not get upload URL");
      }

      await uploadImageToS3(image, uploadURL);
      uploadedUrls.push(uploadURL.split("?")[0]);
      setUploadPercent(((index + 1) / portfolioImages.length) * 100);
    }

    setUploading(false);
    setUploadProgress("");
    return uploadedUrls;
  };

  const handleSubmit = async (skipPortfolio = false) => {
    try {
      setSubmitting(true);
      const portfolioUrls = skipPortfolio ? [] : await uploadPortfolioImages();

      await api.post("/vendor/register", {
        businessName: formData.businessName.trim(),
        serviceTypeId: getCategoryId(selectedCategory),
        description: formData.description.trim(),
        phone: formData.phone.trim(),
        state: formData.state.trim(),
        city: formData.city.trim(),
        fields: {
          portfolioImages: portfolioUrls,
        },
      });

      toast.success("Vendor application submitted successfully!");
      setIsSuccess(true);
    } catch (error) {
      console.error("Vendor registration error:", error);
      toast.error(
        error.response?.data?.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
      setUploading(false);
      setUploadProgress("");
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map((step, index) => {
        const isCompleted = currentStep > step;
        const isActive = currentStep === step;

        return (
          <React.Fragment key={step}>
            <View
              style={[
                styles.stepDot,
                (isCompleted || isActive) && styles.stepDotActive,
              ]}
            >
              {isCompleted ? (
                <Ionicons name="checkmark" size={14} color="#fff" />
              ) : (
                <Text
                  style={[
                    styles.stepDotText,
                    isActive && styles.stepDotTextActive,
                  ]}
                >
                  {step}
                </Text>
              )}
            </View>
            {index < 2 && (
              <View
                style={[
                  styles.stepLine,
                  currentStep > step && styles.stepLineActive,
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );

  const renderBackButton = () => (
    <TouchableOpacity
      style={styles.backButton}
      onPress={() => {
        if (currentStep === 1) {
          router.back();
        } else {
          setCurrentStep((step) => step - 1);
        }
      }}
      activeOpacity={0.75}
    >
      <Ionicons name="arrow-back" size={18} color="#5A31F4" />
      <Text style={styles.backButtonText}>Back</Text>
    </TouchableOpacity>
  );

  const renderCategorySkeleton = () => (
    <View style={styles.categoryGrid}>
      {[1, 2, 3, 4].map((item) => (
        <View key={item} style={[styles.categoryCard, styles.skeletonCard]}>
          <View style={styles.skeletonIcon} />
          <View style={styles.skeletonText} />
        </View>
      ))}
    </View>
  );

  const renderStepOne = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What service do you offer?</Text>
      <Text style={styles.stepSubtitle}>
        Choose the category that best describes your business
      </Text>

      {categoryLoading ? (
        renderCategorySkeleton()
      ) : categoryError ? (
        <View style={styles.errorState}>
          <Ionicons name="alert-circle-outline" size={36} color="#5A31F4" />
          <Text style={styles.errorText}>{categoryError}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchCategories}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.categoryGrid}>
          {categories.map((category, index) => {
            const selected = getCategoryId(selectedCategory) === getCategoryId(category);
            return (
              <TouchableOpacity
                key={getCategoryId(category) || index}
                style={[
                  styles.categoryCard,
                  selected && styles.categoryCardSelected,
                ]}
                onPress={() => setSelectedCategory(category)}
                activeOpacity={0.8}
              >
                <Text style={styles.categoryIcon}>{category.icon || "🎪"}</Text>
                <Text style={styles.categoryName}>{category.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.primaryButton,
          !selectedCategory && styles.primaryButtonDisabled,
        ]}
        onPress={() => setCurrentStep(2)}
        disabled={!selectedCategory}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryButtonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLabel = (label) => (
    <Text style={styles.label}>
      {label} <Text style={styles.required}>*</Text>
    </Text>
  );

  const renderInput = ({ label, field, multiline, placeholder, keyboardType }) => (
    <View style={styles.fieldGroup}>
      {renderLabel(label)}
      <TextInput
        style={[
          styles.input,
          multiline && styles.textArea,
          focusedField === field && styles.inputFocused,
        ]}
        value={formData[field]}
        onChangeText={(text) => updateFormData(field, text)}
        onFocus={() => setFocusedField(field)}
        onBlur={() => setFocusedField("")}
        placeholder={placeholder}
        placeholderTextColor="#999"
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        textAlignVertical={multiline ? "top" : "center"}
        keyboardType={keyboardType || "default"}
      />
    </View>
  );

  const renderStepTwo = () => (
    <View style={styles.stepContainer}>
      {renderBackButton()}
      <Text style={styles.stepTitle}>Tell us about your business</Text>

      {renderInput({ label: "Business Name", field: "businessName" })}
      {renderInput({
        label: "Description",
        field: "description",
        multiline: true,
        placeholder: "Describe your services...",
      })}
      {renderInput({
        label: "Phone Number",
        field: "phone",
        keyboardType: "phone-pad",
      })}
      {renderInput({ label: "State", field: "state" })}
      {renderInput({ label: "City", field: "city" })}

      <TouchableOpacity
        style={[
          styles.primaryButton,
          !isStepTwoValid && styles.primaryButtonDisabled,
        ]}
        onPress={() => setCurrentStep(3)}
        disabled={!isStepTwoValid}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryButtonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStepThree = () => (
    <View style={styles.stepContainer}>
      {renderBackButton()}
      <Text style={styles.stepTitle}>Add your portfolio</Text>
      <Text style={styles.stepSubtitle}>
        Upload photos of your previous work (optional but recommended)
      </Text>

      <View style={styles.imageGrid}>
        {portfolioImages.map((image, index) => (
          <View key={`${image.uri}-${index}`} style={styles.imageCell}>
            <Image source={{ uri: image.uri }} style={styles.portfolioImage} />
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={() => removeImage(index)}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        ))}

        {portfolioImages.length < 6 && (
          <TouchableOpacity
            style={styles.addPhotoCell}
            onPress={handlePickImages}
            activeOpacity={0.8}
          >
            <Ionicons name="camera-outline" size={24} color="#999" />
            <Text style={styles.addPhotoText}>Add Photo</Text>
          </TouchableOpacity>
        )}
      </View>

      {uploading && (
        <View style={styles.uploadProgressBox}>
          <Text style={styles.uploadProgressText}>{uploadProgress}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${uploadPercent}%` }]} />
          </View>
        </View>
      )}

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => handleSubmit(false)}
        disabled={submitting}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryButtonText}>Submit Application</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.skipButton}
        onPress={() => handleSubmit(true)}
        disabled={submitting}
        activeOpacity={0.75}
      >
        <Text style={styles.skipButtonText}>Skip for now</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSuccessScreen = () => (
    <View style={styles.successContainer}>
      <Animated.View
        style={[
          styles.successIcon,
          {
            transform: [{ scale: successScale }],
          },
        ]}
      >
        <Ionicons name="checkmark" size={54} color="#fff" />
      </Animated.View>
      <Text style={styles.successTitle}>Application Submitted!</Text>
      <Text style={styles.successSubtitle}>
        We'll review your application and get back to you within 24-48 hours.
      </Text>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => router.back()}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryButtonText}>Back to Vendor</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {submitting && <CustomFormLoader />}
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          isSuccess && styles.successScrollContent,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {isSuccess ? (
          renderSuccessScreen()
        ) : (
          <>
            {renderStepIndicator()}
            {currentStep === 1 && renderStepOne()}
            {currentStep === 2 && renderStepTwo()}
            {currentStep === 3 && renderStepThree()}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 64 : 44,
    paddingBottom: 34,
  },
  successScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  stepIndicator: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 30,
  },
  stepDot: {
    alignItems: "center",
    backgroundColor: "#DDD",
    borderRadius: 14,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  stepDotActive: {
    backgroundColor: "#5A31F4",
  },
  stepDotText: {
    color: "#999",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
  },
  stepDotTextActive: {
    color: "#fff",
  },
  stepLine: {
    backgroundColor: "#DDD",
    height: 2,
    width: 58,
  },
  stepLineActive: {
    backgroundColor: "#5A31F4",
  },
  stepContainer: {
    flex: 1,
  },
  backButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    marginBottom: 18,
  },
  backButtonText: {
    color: "#5A31F4",
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    marginLeft: 5,
  },
  stepTitle: {
    color: "#333",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 24,
    lineHeight: 32,
    marginBottom: 8,
  },
  stepSubtitle: {
    color: "#666",
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 24,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  categoryCard: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#E8DBFF",
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    marginBottom: 14,
    minHeight: 126,
    padding: 16,
    width: "48%",
  },
  categoryCardSelected: {
    backgroundColor: "#F3EDFF",
    borderColor: "#5A31F4",
    borderWidth: 1.5,
  },
  categoryIcon: {
    fontSize: 34,
    marginBottom: 10,
  },
  categoryName: {
    color: "#333",
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    textAlign: "center",
  },
  skeletonCard: {
    alignItems: "center",
    backgroundColor: "#fff",
  },
  skeletonIcon: {
    backgroundColor: "#EEE8FA",
    borderRadius: 18,
    height: 36,
    marginBottom: 14,
    width: 36,
  },
  skeletonText: {
    backgroundColor: "#EEE8FA",
    borderRadius: 5,
    height: 10,
    width: "70%",
  },
  errorState: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#E8DBFF",
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 24,
    padding: 22,
  },
  errorText: {
    color: "#666",
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    lineHeight: 20,
    marginVertical: 12,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#F3EDFF",
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: "#5A31F4",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    color: "#333",
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    marginBottom: 7,
  },
  required: {
    color: "#FF4444",
  },
  input: {
    backgroundColor: "#fff",
    borderColor: "#E8DBFF",
    borderRadius: 10,
    borderWidth: 1,
    color: "#333",
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    height: 52,
    paddingHorizontal: 14,
  },
  inputFocused: {
    borderColor: "#5A31F4",
  },
  textArea: {
    height: 120,
    paddingTop: 14,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#5A31F4",
    borderRadius: 12,
    height: 52,
    justifyContent: "center",
    marginTop: 12,
    width: "100%",
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: "#fff",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 22,
  },
  imageCell: {
    borderRadius: 12,
    height: imageSize,
    overflow: "hidden",
    width: imageSize,
  },
  portfolioImage: {
    height: "100%",
    width: "100%",
  },
  removeImageButton: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 12,
    height: 24,
    justifyContent: "center",
    position: "absolute",
    right: 6,
    top: 6,
    width: 24,
  },
  addPhotoCell: {
    alignItems: "center",
    borderColor: "#CFCFCF",
    borderRadius: 12,
    borderStyle: "dashed",
    borderWidth: 1.5,
    height: imageSize,
    justifyContent: "center",
    width: imageSize,
  },
  addPhotoText: {
    color: "#999",
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    marginTop: 6,
  },
  uploadProgressBox: {
    backgroundColor: "#fff",
    borderColor: "#E8DBFF",
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
    padding: 14,
  },
  uploadProgressText: {
    color: "#333",
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    marginBottom: 10,
  },
  progressTrack: {
    backgroundColor: "#EEE",
    borderRadius: 4,
    height: 7,
    overflow: "hidden",
  },
  progressFill: {
    backgroundColor: "#5A31F4",
    borderRadius: 4,
    height: 7,
  },
  skipButton: {
    alignItems: "center",
    paddingVertical: 16,
  },
  skipButtonText: {
    color: "#999",
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
  },
  successContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  successIcon: {
    alignItems: "center",
    backgroundColor: "#22A06B",
    borderRadius: 48,
    height: 96,
    justifyContent: "center",
    marginBottom: 24,
    width: 96,
  },
  successTitle: {
    color: "#333",
    fontFamily: "Poppins_700Bold",
    fontSize: 24,
    marginBottom: 10,
    textAlign: "center",
  },
  successSubtitle: {
    color: "#666",
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 12,
    textAlign: "center",
  },
});
