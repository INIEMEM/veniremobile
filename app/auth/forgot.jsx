import React, { useState, useEffect, useRef } from "react";
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
} from "react-native";
import { useRouter } from "expo-router";
import api from "../../utils/axiosInstance";
import Toast from "react-native-toast-message";
import CustomLoader from "../../components/CustomFormLoader";
import { Ionicons } from "@expo/vector-icons";
import VenireLogo from "../../components/VenireLogo";

const { width, height } = Dimensions.get("window");

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState("");

  // Animations
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(-20)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const formY = useRef(new Animated.Value(30)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const buttonY = useRef(new Animated.Value(30)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const emailInputRef = useRef(null);

  useEffect(() => {
    Animated.parallel([
      // Logo animation
      Animated.sequence([
        Animated.parallel([
          Animated.timing(logoScale, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(logoOpacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ]),
      // Header animation
      Animated.sequence([
        Animated.delay(200),
        Animated.parallel([
          Animated.timing(headerY, {
            toValue: 0,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(headerOpacity, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
      ]),
      // Form animation
      Animated.sequence([
        Animated.delay(400),
        Animated.parallel([
          Animated.timing(formY, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(formOpacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ]),
      // Button animation
      Animated.sequence([
        Animated.delay(600),
        Animated.parallel([
          Animated.timing(buttonY, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(buttonOpacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();
  }, []);

  const handleSend = async () => {
    if (!email) {
      return Toast.show({
        type: "error",
        text1: "Error",
        text2: "Email is required.",
      });
    }

    try {
      setIsSubmitting(true);
      await api.post("/auth/password/forgot", { email });
      Toast.show({
        type: "success",
        text1: "Check your email 📩",
        text2: "A password reset link has been sent to your inbox.",
      });
      router.replace("/auth/checkemail");
    } catch (error) {
      console.error(error);
      const message =
        error.response?.data?.message ||
        "Failed to send reset email. Please try again.";
      Toast.show({
        type: "error",
        text1: "Request Failed",
        text2: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {isSubmitting && <CustomLoader />}
      <View style={styles.topHeader} pointerEvents="none">
        <VenireLogo
          size={60}
          showText={true}
          animate={false}
        />
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
      >
        <View style={styles.authCard}>
          <Text style={styles.cardTitle}>Forgot Password?</Text>
          <Text style={styles.cardSubtitle}>
            Enter your email address and we'll send reset instructions.
          </Text>

          {/* Email Form */}
          <Animated.View
            style={[
              styles.form,
              {
                transform: [{ translateY: formY }],
                opacity: formOpacity,
              },
            ]}
          >
            <Text style={styles.label}>Email Address</Text>
            <View
              style={[
                styles.inputWrapper,
                focusedField === "email" && styles.inputWrapperFocused,
              ]}
              onTouchEnd={() => emailInputRef.current?.focus()}
            >
              <Ionicons
                name="mail-outline"
                size={20}
                color="#999"
                style={styles.leftInputIcon}
                pointerEvents="none"
              />
              <TextInput
                ref={emailInputRef}
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField("")}
              />
            </View>
          </Animated.View>

          {/* Buttons Section */}
          <Animated.View
            style={[
              styles.buttonsContainer,
              {
                transform: [{ translateY: buttonY }],
                opacity: buttonOpacity,
              },
            ]}
          >
            {/* Send Button */}
            <TouchableOpacity
              style={[styles.button, styles.sendButton]}
              onPress={handleSend}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <Text style={styles.sendText}>
                {isSubmitting ? "Sending..." : "Send Reset Link"}
              </Text>
            </TouchableOpacity>

            {/* Back Button */}
            <TouchableOpacity
              style={[styles.button, styles.backButton]}
              onPress={() => router.push("/auth/login")}
              activeOpacity={0.8}
            >
              <Text style={styles.backText}>Back to Login</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F4FF",
  },
  topHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 260,
    backgroundColor: "#5A31F4",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContainer: {
    flexGrow: 1,
    paddingTop: 0,
    paddingBottom: 30,
  },
  authCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 28,
    marginHorizontal: 20,
    marginTop: 200,
    shadowColor: "#5A31F4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
  cardTitle: {
    color: "#333",
    fontFamily: "Poppins_700Bold",
    fontSize: 22,
    marginBottom: 4,
  },
  cardSubtitle: {
    color: "#666",
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 24,
  },
  form: {
    width: "100%",
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    color: "#555",
    marginBottom: 6,
    fontFamily: "Poppins_500Medium",
  },
  inputWrapper: {
    position: "relative",
    width: "100%",
    height: 52,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E8DBFF",
    borderRadius: 12,
    marginBottom: 16,
    justifyContent: "center",
  },
  inputWrapperFocused: {
    borderColor: "#5A31F4",
    shadowColor: "#5A31F4",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  leftInputIcon: {
    position: "absolute",
    left: 14,
    zIndex: 1,
  },
  input: {
    flex: 1,
    width: "100%",
    height: 52,
    paddingLeft: 44,
    paddingRight: 14,
    fontSize: 14,
    color: "#333",
    fontFamily: "Poppins_400Regular",
    zIndex: 2,
  },
  buttonsContainer: {
    width: "100%",
    alignItems: "center",
  },
  button: {
    width: "100%",
    height: 54,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  sendButton: {
    backgroundColor: "#5A31F4",
    shadowColor: "#5A31F4",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
    marginTop: 8,
  },
  sendText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
  },
  backButton: {
    backgroundColor: "#F3EDFF",
    elevation: 3,
  },
  backText: {
    color: "#5A31F4",
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
  },
});
