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
import Toast from "react-native-toast-message";
import api from "../../utils/axiosInstance";
import CustomLoader from "../../components/CustomFormLoader";
import { useAuth } from "../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import VenireLogo from "../../components/VenireLogo";

const { width, height } = Dimensions.get("window");

export default function SignupScreen() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState("");
  const { setLoggedEmail } = useAuth();

  // Animations
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(-20)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const formY = useRef(new Animated.Value(30)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const buttonY = useRef(new Animated.Value(30)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const firstNameInputRef = useRef(null);
  const lastNameInputRef = useRef(null);
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const confirmPasswordInputRef = useRef(null);

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

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSignup = async () => {
    const { firstName, lastName, email, password, confirmPassword } = form;

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      return Toast.show({
        type: "error",
        text1: "Error",
        text2: "All fields are required.",
      });
    }

    if (password !== confirmPassword) {
      return Toast.show({
        type: "error",
        text1: "Password Mismatch",
        text2: "Passwords do not match.",
      });
    }

    try {
      setIsSubmitting(true);
      const res = await api.post("/auth/register", {
        firstname: firstName,
        lastname: lastName,
        email: email,
        password: password,
        password_confirm: confirmPassword,
      });
      setLoggedEmail(email);
      Toast.show({
        type: "success",
        text1: "Account Created 🎉",
        text2: "You can now log in to Venire.",
      });

      router.replace("/auth/checksignupmail");
    } catch (error) {
      console.error(error.response);
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Signup failed. Please try again.";
      const displayMessage = message
        .replace("User validation failed: email: ", "")
        .replace("exisit", "exist");
      Toast.show({
        type: "error",
        text1: "Signup Failed",
        text2: displayMessage,
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
      {/* Show loader when submitting */}
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
          <Text style={styles.cardTitle}>Create Account</Text>
          <Text style={styles.cardSubtitle}>Join thousands of event lovers</Text>

          {/* Signup Form */}
          <Animated.View
            style={[
              styles.form,
              {
                transform: [{ translateY: formY }],
                opacity: formOpacity,
              },
            ]}
          >
            {/* Name Row */}
            <View style={styles.row}>
              <View style={styles.halfInputContainer}>
                <Text style={styles.label}>First Name</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    focusedField === "firstName" && styles.inputWrapperFocused,
                  ]}
                  onTouchEnd={() => firstNameInputRef.current?.focus()}
                >
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color="#999"
                    style={styles.leftInputIcon}
                    pointerEvents="none"
                  />
                  <TextInput
                    ref={firstNameInputRef}
                    style={styles.input}
                    value={form.firstName}
                    onChangeText={(text) => handleChange("firstName", text)}
                    placeholderTextColor="#999"
                    autoCapitalize="words"
                    onFocus={() => setFocusedField("firstName")}
                    onBlur={() => setFocusedField("")}
                  />
                </View>
              </View>
              <View style={styles.halfInputContainer}>
                <Text style={styles.label}>Last Name</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    focusedField === "lastName" && styles.inputWrapperFocused,
                  ]}
                  onTouchEnd={() => lastNameInputRef.current?.focus()}
                >
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color="#999"
                    style={styles.leftInputIcon}
                    pointerEvents="none"
                  />
                  <TextInput
                    ref={lastNameInputRef}
                    style={styles.input}
                    value={form.lastName}
                    onChangeText={(text) => handleChange("lastName", text)}
                    placeholderTextColor="#999"
                    autoCapitalize="words"
                    onFocus={() => setFocusedField("lastName")}
                    onBlur={() => setFocusedField("")}
                  />
                </View>
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputContainer}>
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
                  value={form.email}
                  onChangeText={(text) => handleChange("email", text)}
                  keyboardType="email-address"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField("")}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View
                style={[
                  styles.passwordFieldContainer,
                  styles.inputWrapper,
                  focusedField === "password" && styles.inputWrapperFocused,
                ]}
                onTouchEnd={() => passwordInputRef.current?.focus()}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#999"
                  style={styles.leftInputIcon}
                  pointerEvents="none"
                />
                <TextInput
                  ref={passwordInputRef}
                  style={[styles.input, styles.passwordInput]}
                  value={form.password}
                  onChangeText={(text) => handleChange("password", text)}
                  secureTextEntry={!showPassword}
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField("")}
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword((current) => !current)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#999"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password</Text>
              <View
                style={[
                  styles.passwordFieldContainer,
                  styles.inputWrapper,
                  focusedField === "confirmPassword" && styles.inputWrapperFocused,
                ]}
                onTouchEnd={() => confirmPasswordInputRef.current?.focus()}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#999"
                  style={styles.leftInputIcon}
                  pointerEvents="none"
                />
                <TextInput
                  ref={confirmPasswordInputRef}
                  style={[styles.input, styles.passwordInput]}
                  value={form.confirmPassword}
                  onChangeText={(text) => handleChange("confirmPassword", text)}
                  secureTextEntry={!showConfirmPassword}
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  onFocus={() => setFocusedField("confirmPassword")}
                  onBlur={() => setFocusedField("")}
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowConfirmPassword((current) => !current)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#999"
                  />
                </TouchableOpacity>
              </View>
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
            {/* Signup Button */}
            <TouchableOpacity
              style={[styles.button, styles.signupButton]}
              onPress={handleSignup}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <Text style={styles.signupText}>
                {isSubmitting ? "Creating account..." : "Create Account"}
              </Text>
            </TouchableOpacity>

            {/* Google Sign In */}
            {/* <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.googleText}>Sign in with Google</Text>
            </TouchableOpacity> */}

            {/* Login Redirect */}
            <TouchableOpacity
              onPress={() => router.push("/auth/login")}
              activeOpacity={0.7}
              style={styles.loginRedirectContainer}
            >
              <Text style={styles.loginRedirect}>
                Already have an account?{" "}
                <Text style={styles.loginLink}>Login</Text>
              </Text>
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
    marginBottom: 24,
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
    fontWeight: "600",
  },
  form: {
    width: "100%",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  halfInputContainer: {
    flex: 1,
  },
  inputContainer: {
    width: "100%",
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
  passwordFieldContainer: {
    position: "relative",
    width: "100%",
  },
  passwordInput: {
    paddingRight: 48,
  },
  passwordToggle: {
    position: "absolute",
    right: 14,
    top: 16,
    zIndex: 4,
  },
  buttonsContainer: {
    width: "100%",
    alignItems: "center",
    marginTop: 8,
  },
  button: {
    width: "100%",
    height: 54,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  signupButton: {
    backgroundColor: "#5A31F4",
    shadowColor: "#5A31F4",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
    marginTop: 8,
  },
  signupText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
  },
  googleText: {
    fontSize: Math.min(width * 0.037, 14),
    color: "#5A31F4",
    textAlign: "center",
    fontFamily: "Poppins_400Regular",
    fontWeight: "600",
    marginBottom: 20,
  },
  loginRedirectContainer: {
    marginTop: 8,
  },
  loginRedirect: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    fontFamily: "Poppins_400Regular",
  },
  loginLink: {
    color: "#5A31F4",
    fontFamily: "Poppins_600SemiBold",
  },
});
