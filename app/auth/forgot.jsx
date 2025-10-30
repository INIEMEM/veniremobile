import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
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

const { width, height } = Dimensions.get("window");

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Animations
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(-20)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const formY = useRef(new Animated.Value(30)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const buttonY = useRef(new Animated.Value(30)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;

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
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
       

        {/* Logo Section */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [{ scale: logoScale }],
              opacity: logoOpacity,
            },
          ]}
        >
          <Image
            source={require("../../assets/splash.png")}
            style={styles.logo}
          />
        </Animated.View>

        {/* Header Section */}
        <Animated.View
          style={[
            styles.headerSection,
            {
              transform: [{ translateY: headerY }],
              opacity: headerOpacity,
            },
          ]}
        >
          <Text style={styles.appName}>Venire</Text>
          <Text style={styles.welcomeText}>
            A new password will be sent to this
          </Text>
          <Text style={styles.welcomeText}>email address.</Text>
        </Animated.View>

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
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
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
              {isSubmitting ? "Sending..." : "Send"}
            </Text>
          </TouchableOpacity>

          {/* Back Button */}
          <TouchableOpacity
            style={[styles.button, styles.backButton]}
            onPress={() => router.push("/auth/login")}
            activeOpacity={0.8}
          >
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: width * 0.06,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 30,
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 12,
  },
  logo: {
    width: Math.min(width * 0.15, 70),
    height: Math.min(width * 0.15, 70),
    resizeMode: "contain",
  },
  headerSection: {
    alignItems: "center",
    marginBottom: height * 0.04,
  },
  appName: {
    fontSize: Math.min(width * 0.065, 28),
    fontWeight: "700",
    color: "#5A31F4",
    textAlign: "center",
    marginBottom: 4,
    fontFamily: "Poppins_600SemiBold",
  },
  welcomeText: {
    fontSize: Math.min(width * 0.04, 16),
    color: "#555",
    textAlign: "center",
    lineHeight: 22,
    fontFamily: "Poppins_400Regular",
  },
  form: {
    width: "100%",
    marginTop: height * 0.03,
    marginBottom: height * 0.03,
  },
  label: {
    fontSize: Math.min(width * 0.037, 14),
    color: "#444",
    marginBottom: 6,
    fontFamily: "Poppins_400Regular",
    fontWeight: "500",
  },
  input: {
    borderBottomWidth: 1.5,
    borderBottomColor: "#555",
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    paddingHorizontal: 4,
    marginBottom: 20,
    fontSize: Math.min(width * 0.04, 15),
    color: "#333",
    fontFamily: "Poppins_400Regular",
    minHeight: 40,
  },
  buttonsContainer: {
    width: "100%",
    alignItems: "center",
  },
  button: {
    width: "100%",
    height: Math.min(height * 0.065, 54),
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  sendButton: {
    backgroundColor: "#5A31F4",
    // shadowColor: "#5A31F4",
    // shadowOffset: {
    //   width: 0,
    //   height: 4,
    // },
    // shadowOpacity: 0.3,
    // shadowRadius: 4.65,
    elevation: 8,
  },
  sendText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: Math.min(width * 0.043, 17),
    fontFamily: "Poppins_600SemiBold",
  },
  backButton: {
    backgroundColor: "#F3EDFF",
    // shadowColor: "#5A31F4",
    // shadowOffset: {
    //   width: 0,
    //   height: 2,
    // },
    // shadowOpacity: 0.1,
    // shadowRadius: 3,
    elevation: 3,
  },
  backText: {
    color: "#5A31F4",
    fontWeight: "700",
    fontSize: Math.min(width * 0.043, 17),
    fontFamily: "Poppins_600SemiBold",
  },
});