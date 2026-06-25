import React, { createRef, useEffect, useRef, useState } from "react";
import {
  Animated,
  Clipboard,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
// import api from "../utils/axiosInstance";
import api from "../../utils/axiosInstance";
import Toast from "react-native-toast-message";
import CustomLoader from "../../components/CustomFormLoader";
import { useAuth } from "../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const OTP_BOX_SIZE = Math.min((width - 80) / 6, 52);

export default function ResetPasswordScreen() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(120); // 2 minutes
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const router = useRouter();
  const { setResetToken, resetToken } = useAuth();
  const inputRefs = useRef([...Array(6)].map(() => createRef()));

  const otpY = useRef(new Animated.Value(30)).current;
  const otpOpacity = useRef(new Animated.Value(0)).current;
  const buttonY = useRef(new Animated.Value(30)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.sequence([
        Animated.delay(300),
        Animated.parallel([
          Animated.timing(otpY, {
            toValue: 0,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(otpOpacity, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(500),
        Animated.parallel([
          Animated.timing(buttonY, {
            toValue: 0,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(buttonOpacity, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (timer > 0) {
      const countdown = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(countdown);
    }
  }, [timer]);

  const handleChange = (value, index) => {
    if (/^[0-9]?$/.test(value)) {
      const digit = value.slice(-1);
      const newOtp = [...otp];
      newOtp[index] = digit;
      setOtp(newOtp);

      if (digit && index < 5) {
        inputRefs.current[index + 1].current?.focus();
      }
    }
  };

  const handleKeyPress = (e, index) => {
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

  const handleProceed = async () => {
    const code = otp.join("");
    if (code.length < 6) {
      Toast.show({ type: "error", text1: "Please enter the 6-digit OTP" });
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/auth/password/verify", { token: code });
      Toast.show({ type: "success", text1: "OTP verified successfully" });
      setResetToken(code);
      router.push("/auth/newpassword"); // Redirect to password reset screen
    } catch (error) {
      Toast.show({
        type: "error",
        text1: error.response?.data?.message || "OTP verification failed",
      });
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      setResending(true);
      await api.post("/auth/sendotp");
      Toast.show({ type: "success", text1: "OTP resent successfully" });
      setTimer(120); // Reset timer
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0].current?.focus();
    } catch (error) {
      Toast.show({
        type: "error",
        text1: error.response?.data?.message || "Failed to resend OTP",
      });
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
      <View style={styles.topHeader} pointerEvents="none">
        <Ionicons name="shield-checkmark-outline" size={48} color="#fff" />
        <Text style={styles.headerTitle}>Verify Reset Code</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Enter the 6-digit code</Text>
          <Text style={styles.cardSubtitle}>
            Enter the six-digit code sent to your email
          </Text>

          {/* OTP Inputs */}
          <Animated.View
            style={[
              styles.otpSection,
              {
                transform: [{ translateY: otpY }],
                opacity: otpOpacity,
              },
            ]}
          >
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
                  keyboardType="number-pad"
                  maxLength={1}
                  value={digit}
                  onChangeText={(value) => handleChange(value, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  onFocus={() => setFocusedIndex(index)}
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

            <Text style={styles.timerText}>
              Code will expire in {formatTime(timer)}
            </Text>

            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Didn't get an OTP? </Text>
              <TouchableOpacity
                onPress={timer === 0 && !resending ? handleResend : null}
                disabled={timer > 0 || resending}
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
                    ? `Resend OTP in ${formatTime(timer)}`
                    : "Resend OTP"}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

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
              onPress={handleProceed}
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
    lineHeight: 21,
    marginTop: 12,
    textAlign: "center",
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
  timerText: {
    textAlign: "center",
    color: "#666",
    marginTop: 18,
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
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
