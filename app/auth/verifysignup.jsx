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
import { useAuth } from "../../context/AuthContext";

const { width, height } = Dimensions.get("window");

export default function ResetPasswordScreen() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(120);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const router = useRouter();
  const { loggedEmail } = useAuth();
  const inputRefs = useRef([]);

  // Animations
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(-20)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const otpY = useRef(new Animated.Value(30)).current;
  const otpOpacity = useRef(new Animated.Value(0)).current;
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
      // OTP inputs animation
      Animated.sequence([
        Animated.delay(400),
        Animated.parallel([
          Animated.timing(otpY, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(otpOpacity, {
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

  useEffect(() => {
    if (timer > 0) {
      const countdown = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(countdown);
    }
  }, [timer]);

  const handleChange = (text, index) => {
    // Only allow numbers
    if (!/^\d*$/.test(text)) return;

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Auto-focus next input
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    // Handle backspace
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleProceed = async () => {
    const code = otp.join("");

    if (code.length < 6) {
      Toast.show({ type: "error", text1: "Please enter the 6-digit OTP" });
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/auth/verify", { token: code });
      Toast.show({ type: "success", text1: "OTP verified successfully" });
      router.push("/auth/login");
    } catch (error) {
      Toast.show({
        type: "error",
        text1: error.response?.data?.message || "OTP verification failed",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      setResending(true);
      await api.post("/auth/sendotp", { email: loggedEmail });
      Toast.show({ type: "success", text1: "OTP resent successfully" });
      setTimer(120);
      setOtp(["", "", "", "", "", ""]); // Clear OTP inputs
    } catch (error) {
      Toast.show({
        type: "error",
        text1: error.response?.data?.message || "Failed to resend OTP",
      });
      console.log("Resend :", error.response);
    } finally {
      setResending(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {loading && <CustomLoader />}
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
          <Text style={styles.title}>OTP Verification</Text>
          <Text style={styles.caption}>
            Enter the six-digit code sent to your email
          </Text>
        </Animated.View>

        {/* OTP Input Section */}
        <Animated.View
          style={[
            styles.otpSection,
            {
              transform: [{ translateY: otpY }],
              opacity: otpOpacity,
            },
          ]}
        >
          {/* Custom OTP Inputs */}
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={styles.otpInput}
                value={digit}
                onChangeText={(text) => handleChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                autoFocus={index === 0}
              />
            ))}
          </View>

          <Text style={styles.timerText}>
            Code will expire in {formatTime(timer)}
          </Text>
        </Animated.View>

        {/* Button Section */}
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
            style={[styles.button, loading && { opacity: 0.6 }]}
            onPress={handleProceed}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {loading ? "Verifying..." : "Proceed"}
            </Text>
          </TouchableOpacity>

          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Didn't get an OTP? </Text>
            <TouchableOpacity
              onPress={timer === 0 && !resending ? handleResend : null}
              disabled={timer > 0 || resending}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.resendLink,
                  (timer > 0 || resending) && { color: "#999" },
                ]}
              >
                {resending
                  ? "Resending..."
                  : timer > 0
                  ? `Resend in ${formatTime(timer)}`
                  : "Resend OTP"}
              </Text>
            </TouchableOpacity>
          </View>
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
    marginBottom: height * 0.03,
  },
  appName: {
    fontSize: Math.min(width * 0.065, 28),
    fontWeight: "700",
    color: "#5A31F4",
    textAlign: "center",
    marginBottom: 4,
    fontFamily: "Poppins_600SemiBold",
  },
  title: {
    fontSize: Math.min(width * 0.053, 22),
    fontWeight: "600",
    marginBottom: 6,
    marginTop: height * 0.02,
    fontFamily: "Poppins_400Regular",
    color: "#5A31F4",
  },
  caption: {
    color: "#555",
    marginBottom: height * 0.02,
    fontFamily: "Poppins_400Regular",
    fontSize: Math.min(width * 0.04, 15),
    textAlign: "center",
    paddingHorizontal: width * 0.02,
  },
  otpSection: {
    width: "100%",
    marginBottom: height * 0.03,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Math.min(width * 0.025, 10),
    marginBottom: 20,
  },
  otpInput: {
    width: Math.min(width * 0.13, 50),
    height: Math.min(width * 0.14, 55),
    borderWidth: 2,
    borderColor: "#5A31F4",
    borderRadius: 10,
    textAlign: "center",
    fontSize: Math.min(width * 0.053, 20),
    fontWeight: "600",
    color: "#333",
    fontFamily: "Poppins_400Regular",
    backgroundColor: "#fff",
  },
  timerText: {
    textAlign: "center",
    color: "#555",
    fontFamily: "Poppins_400Regular",
    fontSize: Math.min(width * 0.037, 14),
  },
  buttonsContainer: {
    width: "100%",
    alignItems: "center",
  },
  button: {
    backgroundColor: "#5A31F4",
    width: "100%",
    height: Math.min(height * 0.065, 54),
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 25,
    shadowColor: "#5A31F4",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: Math.min(width * 0.043, 17),
    fontFamily: "Poppins_600SemiBold",
  },
  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
  },
  resendText: {
    fontSize: Math.min(width * 0.04, 15),
    color: "#777",
    fontFamily: "Poppins_400Regular",
  },
  resendLink: {
    color: "red",
    fontWeight: "600",
    fontSize: Math.min(width * 0.04, 15),
    fontFamily: "Poppins_600SemiBold",
  },
});