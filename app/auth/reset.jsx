import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from "react-native";
import { useRouter } from "expo-router";
// import api from "../utils/axiosInstance";
import api from "../../utils/axiosInstance";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import CustomLoader from "../../components/CustomFormLoader";
export default function ResetPasswordScreen() {
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [timer, setTimer] = useState(120); // 2 minutes
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const router = useRouter();

  // Countdown timer
  useEffect(() => {
    if (timer > 0) {
      const countdown = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(countdown);
    }
  }, [timer]);

  const handleChange = (value, index) => {
    if (/^[0-9]?$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);
    }
  };

  const handleProceed = async () => {
    const code = otp.join("");
    if (code.length < 4) {
      Toast.show({ type: "error", text1: "Please enter the 4-digit OTP" });
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/auth/password/forgot", { token: code });
      Toast.show({ type: "success", text1: "OTP verified successfully" });
      router.push("/auth/newpassword"); // Redirect to password reset screen
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
      await api.post("/auth/sendotp");
      Toast.show({ type: "success", text1: "OTP resent successfully" });
      setTimer(120); // Reset timer
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
    <View style={styles.container}>
    {loading && <CustomLoader/>}
        <View style={{ justifyContent: "center", alignItems: "center", marginTop: 70 }}>
          <Image
            source={require("../../assets/splash.png")}
            style={styles.logo}
          />
        </View> 
      <Text style={styles.appName}>Venire</Text>
      <Text style={styles.title}>OTP Verification</Text>
      <Text style={styles.caption}>Enter the four-digit code sent to your email</Text>

      {/* OTP Inputs */}
      <View style={styles.otpContainer}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            style={styles.otpInput}
            keyboardType="numeric"
            maxLength={1}
            value={digit}
            onChangeText={(value) => handleChange(value, index)}
          />
        ))}
      </View>

      <Text style={styles.timerText}>Code will expire in {formatTime(timer)}</Text>
      <View style={{paddingHorizontal: 24, width: '100%'}}>

      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.6 }]}
        onPress={handleProceed}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? "Verifying..." : "Proceed"}</Text>
      </TouchableOpacity>
      </View>
      
      <View style={styles.resendContainer}>
        <Text style={styles.resendText}>Didn’t get an OTP? </Text>
        <TouchableOpacity
          onPress={timer === 0 && !resending ? handleResend : null}
          disabled={timer > 0 || resending}
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
              ? `Resend OTP in ${formatTime(timer)}`
              : "Resend OTP"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
    // justifyContent: "center",
    // position: 'relative',
    // paddingHorizontal: 30,
    // marginTop: 40,
    // alignItems: `center`
  },
  logo: {
    width: 60,
    height: 60,
    // marginBottom: 12,
    resizeMode: "contain",
  },
  appName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#5A31F4",
    textAlign: "center",
    marginBottom: 4,
    fontFamily: "Poppins_600SemiBold",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    // textAlign: "center",
    marginBottom: 6,
    marginTop: 20,
    fontFamily: "Poppins_400Regular",
    color: "#5A31F4",
    paddingHorizontal:24,
  },
  caption: {
    // textAlign: "center",
    color: "#555",
    marginBottom: 30,
    fontFamily: "Poppins_400Regular",
    paddingHorizontal:24,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginBottom: 20,
    fontFamily: "Poppins_400Regular",
  },
  otpInput: {
    width: 55,
    height: 55,
    borderWidth: 1.5,
    borderColor: "#5A31F4",
    borderRadius: 10,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "600",
    color: "#666",
    fontFamily: "Poppins_400Regular",
  },
  timerText: {
    textAlign: "center",
    color: "#555",
    marginBottom: 30,
    fontFamily: "Poppins_400Regular",
  },
  button: {
    backgroundColor: "#5A31F4",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 25,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  resendText: {
    fontSize: 15,
    color: "#777",
    
  },
  resendLink: {
    color: "red",
    fontWeight: "600",
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold",
  },
});
