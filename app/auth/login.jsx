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

// Required for OAuth flow
WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get("window");

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, logout } = useAuth();
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const { user: clerkUser, isLoaded } = useUser();
  const { isSignedIn, signOut } = useClerkAuth();
  const { session } = useSession();

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
        path: "/oauth-native-callback",
      });
      
      const { createdSessionId, setActive, signUp, signIn } = await startOAuthFlow({
        redirectUrl,
      });

      if (createdSessionId) {
        await setActive({ session: createdSessionId });
        
        // Give Clerk a moment to set up the session
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Get user data from the session or the OAuth result
        // The user data is in either signUp or signIn depending on whether it's a new user
        let userEmail, userFirstName, userLastName, userId, userImage;

        // Try to get from session first (most reliable)
        if (session?.user) {
          userEmail = session.user.emailAddresses?.[0]?.emailAddress;
          userFirstName = session.user.firstName;
          userLastName = session.user.lastName;
          userId = session.user.id;
          userImage = session.user.imageUrl;
          console.log("Got user from session:", session.user);
        } 
        // Fallback to signUp/signIn result
        else if (signUp?.createdUserId) {
          userEmail = signUp.emailAddress;
          userFirstName = signUp.firstName;
          userLastName = signUp.lastName;
          userId = signUp.createdUserId;
          userImage = signUp.imageUrl;
          console.log("Got user from signUp:", signUp);
        } 
        else if (signIn?.createdSessionId) {
          userEmail = signIn.identifier;
          userFirstName = signIn.firstName;
          userLastName = signIn.lastName;
          userId = signIn.userId;
          userImage = signIn.imageUrl;
          console.log("Got user from signIn:", signIn);
        }
        // Last resort: try clerkUser hook
        else if (clerkUser) {
          userEmail = clerkUser.emailAddresses?.[0]?.emailAddress;
          userFirstName = clerkUser.firstName;
          userLastName = clerkUser.lastName;
          userId = clerkUser.id;
          userImage = clerkUser.imageUrl;
          console.log("Got user from clerkUser hook:", clerkUser);
        }

        console.log("User data extracted:", { 
          userEmail, 
          userFirstName, 
          userLastName, 
          userId 
        });

        if (!userEmail) {
          throw new Error("Could not retrieve user email from Google");
        }

        // Send user data to your backend
        const response = await api.post("/auth/clerk/google/login", {
          userEmail: userEmail,
          userFirstName: userFirstName,
          userLastName: userLastName,
          // clerkId: userId,
          userProfileImage: userImage,
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
      Toast.show({
        type: "error",
        text1: "Sign-In Failed",
        text2: error.message || "Could not sign in with Google.",
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
          <Text style={styles.welcomeText}>Welcome back, log in to discover</Text>
          <Text style={styles.welcomeText}>new events!</Text>
        </Animated.View>

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

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholderTextColor="#999"
            secureTextEntry
            autoCapitalize="none"
          />
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
              {isSubmitting ? "Logging in..." : "Login"}
            </Text>
          </TouchableOpacity>

          {/* Google Sign-In/Out Buttons */}
          {isSignedIn && isLoaded ? (
            <TouchableOpacity
              style={[styles.button, styles.googleSignOutButton]}
              onPress={handleGoogleSignOut}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <View style={styles.googleButtonContent}>
                <Text style={styles.googleSignOutText}>Sign Out from Google</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.googleButton]}
              onPress={handleGoogleSignIn}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <View style={styles.googleButtonContent}>
                {/* Uncomment when you have the icon */}
                {/* <Image
                  source={require("../../assets/google-icon.png")}
                  style={styles.googleIcon}
                /> */}
                <Text style={styles.googleText}>Continue with Google</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* OR Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.divider} />
          </View>

          <TouchableOpacity
            style={[styles.button, styles.signupButton]}
            onPress={() => router.push("/auth/signup")}
            activeOpacity={0.8}
          >
            <Text style={styles.signupText}>Sign Up</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.exploreButton]}
            onPress={handleExplore}
            activeOpacity={0.8}
          >
            <Text style={styles.exploreText}>Explore</Text>
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
    borderBottomColor: "#ccc",
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    paddingHorizontal: 4,
    marginBottom: 20,
    fontSize: Math.min(width * 0.04, 15),
    color: "#333",
    fontFamily: "Poppins_400Regular",
    minHeight: 40,
  },
  fgPwd: {
    alignItems: "flex-end",
    marginTop: -10,
    marginBottom: 10,
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
    height: Math.min(height * 0.065, 54),
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    fontFamily: "Poppins_400Regular",
  },
  loginButton: {
    backgroundColor: "#5A31F4",
    elevation: 8,
  },
  loginText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: Math.min(width * 0.043, 17),
    fontFamily: "Poppins_600SemiBold",
  },
  googleButton: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#ddd",
    elevation: 2,
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
    width: 20,
    height: 20,
    marginRight: 10,
    resizeMode: "contain",
  },
  googleText: {
    color: "#444",
    fontWeight: "600",
    fontSize: Math.min(width * 0.04, 16),
    fontFamily: "Poppins_600SemiBold",
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
    backgroundColor: "#ddd",
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
  },
  exploreText: {
    color: "#555",
    fontWeight: "600",
    fontSize: Math.min(width * 0.043, 17),
    fontFamily: "Poppins_600SemiBold",
  },
});