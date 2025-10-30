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
        error.response?.data?.message || "Signup failed. Please try again.";
      Toast.show({
        type: "error",
        text1: "Signup Failed",
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
       {/* Show loader when submitting */}
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
          <Text style={styles.welcomeText}>Create an account to start</Text>
          <Text style={styles.welcomeText}>discovering events!</Text>
        </Animated.View>

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
              <TextInput
                style={styles.input}
                value={form.firstName}
                onChangeText={(text) => handleChange("firstName", text)}
                placeholderTextColor="#999"
                autoCapitalize="words"
              />
            </View>
            <View style={styles.halfInputContainer}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={styles.input}
                value={form.lastName}
                onChangeText={(text) => handleChange("lastName", text)}
                placeholderTextColor="#999"
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={form.email}
              onChangeText={(text) => handleChange("email", text)}
              keyboardType="email-address"
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={form.password}
              onChangeText={(text) => handleChange("password", text)}
              secureTextEntry
              placeholderTextColor="#999"
              autoCapitalize="none"
            />
          </View>

          {/* Confirm Password */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              value={form.confirmPassword}
              onChangeText={(text) => handleChange("confirmPassword", text)}
              secureTextEntry
              placeholderTextColor="#999"
              autoCapitalize="none"
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
          {/* Signup Button */}
          <TouchableOpacity
            style={[styles.button, styles.signupButton]}
            onPress={handleSignup}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            <Text style={styles.signupText}>
              {isSubmitting ? "Creating account..." : "Sign Up"}
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
    marginBottom: height * 0.03,
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
    marginBottom: 8,
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
    borderBottomColor: "#ccc",
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
    marginTop: height * 0.02,
  },
  button: {
    width: "100%",
    height: Math.min(height * 0.065, 54),
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  signupButton: {
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
  signupText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: Math.min(width * 0.043, 17),
    fontFamily: "Poppins_400Regular",
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
    fontSize: Math.min(width * 0.037, 14),
    color: "#555",
    textAlign: "center",
    fontFamily: "Poppins_400Regular",
  },
  loginLink: {
    color: "#5A31F4",
    fontWeight: "700",
    fontFamily: "Poppins_500Medium",
  },
});