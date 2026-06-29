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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import api from "../../utils/axiosInstance";
import Toast from "react-native-toast-message";
import CustomLoader from "../../components/CustomFormLoader";
import { useAuth } from "../../context/AuthContext";
import { 
  useOAuth, 
  useUser, 
  useAuth as useClerkAuth,
  useSession ,
  useClerk
} from "@clerk/clerk-expo";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import * as Linking from 'expo-linking';
import { Ionicons } from "@expo/vector-icons";
import VenireLogo from "../../components/VenireLogo";

const { width, height } = Dimensions.get("window");

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState("");
  const { login, logout } = useAuth();
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const { user: clerkUser, isLoaded } = useUser();
  const { isSignedIn, signOut, getToken } = useClerkAuth();
  const { session } = useSession();
  const clerk = useClerk();

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
  const passwordInputRef = useRef(null);

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

  const handleLogin = async () => {
    if (email === "" || password === "") {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "All fields are required.",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post("/auth/login", { email, password });

      const token = res.data?.token;
      if (!token) throw new Error("No token returned from server.");

      await login(token);
      router.replace("/(tabs)/Home");

      console.log("Login successful:", res.data);
    } catch (error) {
      console.error(error);
      const message =
        error.response?.data?.message ||
        error.message ||
        "Login failed. Try again.";

      if (message.includes("401")) {
        Toast.show({
          type: "error",
          text1: "Login Failed",
          text2: "Invalid email or password.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsSubmitting(true);
      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: "veniremobile",
        path: "oauth-native-callback",
        preferLocalhost: true,
      });
     console.log("Redirect URL for OAuth:", redirectUrl);
      const { createdSessionId, setActive, signUp, signIn } = await startOAuthFlow({
        redirectUrl,
      });
      
      if (createdSessionId) {
        await setActive({ session: createdSessionId });

        let activeUser = clerk.user;
        if (!activeUser) {
          await new Promise(resolve => setTimeout(resolve, 500));
          activeUser = clerk.user;
        }

        const userEmail =
          activeUser?.primaryEmailAddress?.emailAddress ||
          signIn?.identifier ||
          signUp?.emailAddress ||
          "";
        const userFirstName = activeUser?.firstName || signUp?.firstName || "";
        const userLastName = activeUser?.lastName || signUp?.lastName || "";
        const clerkUserId =
          activeUser?.id ||
          clerkUser?.id ||
          signIn?.userId ||
          signUp?.createdUserId ||
          "";

        console.log("User data extracted:", { 
          userEmail, 
          userFirstName, 
          userLastName, 
          clerkUserId 
        });

        if (!userEmail) {
          console.warn("Could not retrieve user email from Google. Continuing with available Clerk data.");
        }

        const getClerkSessionToken = async () => {
          const tokenGetters = [
            getToken,
            clerk.session?.getToken?.bind(clerk.session),
            session?.getToken?.bind(session),
          ].filter(Boolean);

          for (const tokenGetter of tokenGetters) {
            try {
              const token = await tokenGetter();
              if (token) return token;
            } catch (_) {}
          }

          return null;
        };

        const clerkSessionToken = await getClerkSessionToken();

        if (!clerkSessionToken) {
          console.warn("Could not retrieve Clerk session token for Google login.");
        }

        // Send user data to your backend
        const googleLoginPayload = {
          email: userEmail || "",
          firstname: userFirstName || "",
          lastname: userLastName || "",
          firstName: userFirstName || "",
          lastName: userLastName || "",
          clerkId: clerkUserId || "",
          googleId: clerkUserId || "",
          sessionId: createdSessionId,
          clerkToken: clerkSessionToken || "",
          clerkJwt: clerkSessionToken || "",
          provider: "google",
          authProvider: "clerk",
        };

        const response = await api.post("/auth/google/login", googleLoginPayload, {
          skipAuth: true,
        });

        const token = response.data?.token;
        if (!token) {
          throw new Error("No token returned from backend");
        }

        // Use your login function to save token and fetch user details
        await login(token);

        Toast.show({
          type: "success",
          text1: "Success",
          text2: "Signed in with Google successfully!",
        });

        router.replace("/(tabs)/Home");
      }
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      console.log("Google Sign-In Response:", error.response?.data);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Could not sign in with Google.";

      Toast.show({
        type: "error",
        text1: "Sign-In Failed",
        text2: errorMessage,
      });
      
      // If there was an error, sign out from Clerk to clean up
      try {
        await signOut();
      } catch (signOutError) {
        console.error("Error signing out after failed login:", signOutError);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      setIsSubmitting(true);
      
      // Sign out from Clerk
      await signOut();
      
      // Sign out from your backend
      await logout();
      
      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Signed out successfully!",
      });
      
    } catch (error) {
      console.error("Google Sign-Out Error:", error);
      Toast.show({
        type: "error",
        text1: "Sign-Out Failed",
        text2: error.message || "Could not sign out.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExplore = async () => {
    await AsyncStorage.setItem("isGuest", "true");
    router.replace("/(tabs)/Home");
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
          <Text style={styles.cardTitle}>Welcome Back</Text>
          <Text style={styles.cardSubtitle}>Sign in to continue</Text>

          {/* Login Form */}
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
                value={password}
                onChangeText={setPassword}
                placeholderTextColor="#999"
                secureTextEntry={!showPassword}
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
            <TouchableOpacity
              style={styles.fgPwd}
              onPress={() => router.replace("/auth/forgot")}
              activeOpacity={0.7}
            >
              <Text style={styles.fgPwdText}>Forgot Password?</Text>
            </TouchableOpacity>
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
            <TouchableOpacity
              style={[styles.button, styles.loginButton]}
              onPress={handleLogin}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <Text style={styles.loginText}>
                {isSubmitting ? "Logging in..." : "Sign In"}
              </Text>
            </TouchableOpacity>

            {/* OR Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.divider} />
            </View>

            {/* Google Sign-In Button */}
            <TouchableOpacity
              style={[styles.button, styles.googleButton]}
              onPress={handleGoogleSignIn}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <View style={styles.googleButtonContent}>
                <Ionicons
                  name="logo-google"
                  size={20}
                  color="#DB4437"
                  style={styles.googleIcon}
                />
                <Text style={styles.googleText}>Continue with Google</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/auth/signup")}
              activeOpacity={0.8}
              style={styles.authRedirectContainer}
            >
              <Text style={styles.authRedirectText}>
                Don't have an account?{" "}
                <Text style={styles.authRedirectLink}>Sign Up</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.exploreButton]}
              onPress={handleExplore}
              activeOpacity={0.8}
            >
              <Text style={styles.exploreText}>Explore</Text>
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
    fontFamily: "Poppins_400Regular",
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
  fgPwd: {
    alignItems: "flex-end",
    marginTop: -6,
    marginBottom: 14,
  },
  fgPwdText: {
    color: "#5A31F4",
    fontWeight: "600",
    fontSize: Math.min(width * 0.037, 14),
    fontFamily: "Poppins_400Regular",
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
    fontFamily: "Poppins_400Regular",
  },
  loginButton: {
    backgroundColor: "#5A31F4",
    shadowColor: "#5A31F4",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
    marginTop: 8,
  },
  loginText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
  },
  googleButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E8DBFF",
    elevation: 1,
    height: 52,
  },
  googleSignOutButton: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#EA4335",
    elevation: 2,
  },
  googleButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  googleIcon: {
    marginRight: 10,
  },
  googleText: {
    color: "#333",
    fontWeight: "500",
    fontSize: 15,
    fontFamily: "Poppins_500Medium",
  },
  googleSignOutText: {
    color: "#EA4335",
    fontWeight: "600",
    fontSize: Math.min(width * 0.04, 16),
    fontFamily: "Poppins_600SemiBold",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginVertical: 8,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#E8DBFF",
  },
  dividerText: {
    marginHorizontal: 12,
    color: "#999",
    fontSize: Math.min(width * 0.035, 13),
    fontFamily: "Poppins_400Regular",
  },
  signupButton: {
    backgroundColor: "#F3EDFF",
  },
  signupText: {
    color: "#5A31F4",
    fontWeight: "700",
    fontSize: Math.min(width * 0.043, 17),
    fontFamily: "Poppins_600SemiBold",
  },
  exploreButton: {
    backgroundColor: "#eee",
    elevation: 2,
    marginTop: 8,
  },
  exploreText: {
    color: "#555",
    fontWeight: "600",
    fontSize: Math.min(width * 0.043, 17),
    fontFamily: "Poppins_600SemiBold",
  },
  authRedirectContainer: {
    marginTop: 4,
    marginBottom: 12,
  },
  authRedirectText: {
    color: "#666",
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    textAlign: "center",
  },
  authRedirectLink: {
    color: "#5A31F4",
    fontFamily: "Poppins_600SemiBold",
  },
});
