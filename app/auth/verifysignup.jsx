import React, { createRef, useState, useEffect, useRef } from "react";
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
  Clipboard,
} from "react-native";
import { useRouter } from "expo-router";
import api from "../../utils/axiosInstance";
import Toast from "react-native-toast-message";
import CustomLoader from "../../components/CustomFormLoader";
import { useAuth } from "../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");
const OTP_BOX_SIZE = Math.min((width - 80) / 6, 52);

export default function ResetPasswordScreen() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(30);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const router = useRouter();
  const { loggedEmail } = useAuth();
  const inputRefs = useRef([...Array(6)].map(() => createRef()));
  const lastSubmittedCode = useRef("");

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
      const countdown = setInterval(() => {
        setTimer((currentTimer) => Math.max(currentTimer - 1, 0));
      }, 1000);
      return () => clearInterval(countdown);
    }
  }, [timer]);

  useEffect(() => {
    const code = otp.join("");

    if (code.length === 6 && code !== lastSubmittedCode.current && !loading) {
      const submitDelay = setTimeout(() => {
        lastSubmittedCode.current = code;
        handleProceed(code);
      }, 300);

      return () => clearTimeout(submitDelay);
    }
  }, [otp, loading]);

  const handleChange = (text, index) => {
    // Only allow numbers
    if (!/^\d*$/.test(text)) return;

    const digit = text.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Auto-focus next input
    if (digit && index < 5) {
      inputRefs.current[index + 1].current?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    // Handle backspace
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      const newOtp = [...otp];
      newOtp[index - 1] = "";
      setOtp(newOtp);
      inputRefs.current[index - 1].current?.focus();
    }
  };

  const handlePasteCode = async () => {
    const text = await Clipboard.getString();
    const digits = text.replace(/\D/g, "").slice(0, 6);

    if (digits.length > 0) {
      const newOtp = ["", "", "", "", "", ""];

      digits.split("").forEach((digit, index) => {
        newOtp[index] = digit;
      });

      setOtp(newOtp);

      if (digits.length === 6) {
        inputRefs.current.forEach((inputRef) => inputRef.current?.blur());
      } else {
        inputRefs.current[digits.length].current?.focus();
      }
    }
  };

  const handleProceed = async (overrideCode) => {
    const code = overrideCode || otp.join("");

    if (code.length < 6) {
      Toast.show({ type: "error", text1: "Please enter the 6-digit OTP" });
      return;
    }

    lastSubmittedCode.current = code;

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
      setTimer(30);
      setOtp(["", "", "", "", "", ""]); // Clear OTP inputs
      lastSubmittedCode.current = "";
      inputRefs.current[0].current?.focus();
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
    return `${seconds}s`;
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {loading && <CustomLoader />}
      <View style={styles.topHeader} pointerEvents="none">
        <Ionicons name="shield-checkmark-outline" size={48} color="#fff" />
        <Text style={styles.headerTitle}>Verify Your Email</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Enter the 6-digit code</Text>
          <Text style={styles.cardSubtitle}>We sent a verification code to</Text>
          <Text style={styles.emailText}>{loggedEmail}</Text>

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
                  ref={inputRefs.current[index]}
                  style={[
                    styles.otpInput,
                    digit && styles.otpInputFilled,
                    focusedIndex === index && styles.otpInputFocused,
                  ]}
                  value={digit}
                  onChangeText={(text) => handleChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  onFocus={() => setFocusedIndex(index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  autoFocus={index === 0}
                />
              ))}
            </View>

            <TouchableOpacity
              style={styles.pasteButton}
              onPress={handlePasteCode}
              activeOpacity={0.75}
            >
              <Ionicons name="clipboard-outline" size={16} color="#5A31F4" />
              <Text style={styles.pasteButtonText}>Paste code</Text>
            </TouchableOpacity>

            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Didn't receive a code? </Text>
              <TouchableOpacity
                onPress={timer === 0 && !resending ? handleResend : null}
                disabled={timer > 0 || resending}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.resendLink,
                    (timer > 0 || resending) && styles.resendLinkDisabled,
                  ]}
                >
                  {resending
                    ? "Resending..."
                    : timer > 0
                    ? `Resend in ${formatTime(timer)}`
                    : "Resend"}
                </Text>
              </TouchableOpacity>
            </View>
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
              style={[
                styles.button,
                (loading || otp.join("").length < 6) && styles.buttonDisabled,
              ]}
              onPress={() => handleProceed()}
              disabled={loading || otp.join("").length < 6}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>
                {loading ? "Verifying..." : "Verify"}
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
    height: 200,
    backgroundColor: "#5A31F4",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontFamily: "Poppins_700Bold",
    fontSize: 20,
    marginTop: 10,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    marginHorizontal: 20,
    marginTop: 160,
    padding: 28,
    shadowColor: "#5A31F4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
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
    marginTop: 28,
    marginBottom: 20,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    columnGap: 8,
  },
  otpInput: {
    width: OTP_BOX_SIZE,
    height: OTP_BOX_SIZE,
    maxWidth: 52,
    borderWidth: 1.5,
    borderColor: "#E8DBFF",
    borderRadius: 12,
    textAlign: "center",
    fontSize: 22,
    color: "#333",
    fontFamily: "Poppins_700Bold",
    backgroundColor: "#fff",
  },
  otpInputFilled: {
    borderColor: "#22C55E",
  },
  otpInputFocused: {
    borderColor: "#5A31F4",
  },
  cardTitle: {
    color: "#333",
    fontFamily: "Poppins_700Bold",
    fontSize: 20,
    textAlign: "center",
  },
  cardSubtitle: {
    color: "#666",
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    marginTop: 12,
    textAlign: "center",
  },
  emailText: {
    color: "#5A31F4",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    marginTop: 4,
    textAlign: "center",
  },
  pasteButton: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    marginTop: 16,
  },
  pasteButtonText: {
    color: "#5A31F4",
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    marginLeft: 6,
  },
  buttonsContainer: {
    width: "100%",
    alignItems: "center",
  },
  button: {
    backgroundColor: "#5A31F4",
    width: "100%",
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#5A31F4",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
  },
  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 18,
  },
  resendText: {
    fontSize: 14,
    color: "#999",
    fontFamily: "Poppins_400Regular",
  },
  resendLink: {
    color: "#5A31F4",
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
  },
  resendLinkDisabled: {
    color: "#999",
  },
});
