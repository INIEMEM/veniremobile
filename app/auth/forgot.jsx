import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import api from "../../utils/axiosInstance";
import Toast from "react-native-toast-message";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomLoader from "../../components/CustomFormLoader";
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    <View style={styles.container}>
      {isSubmitting && <CustomLoader/>}
        {/* App Logo */}
        <Image
          source={require("../../assets/splash.png")}
          style={styles.logo}
        />

        {/* App Name */}
        <Text style={styles.appName}>Venire</Text>
        <Text style={styles.welcomeText}>
          A new password will be sent to this 
        </Text>
        <Text style={styles.welcomeText}>
          email address.
        </Text>

        {/* Email Form */}
        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholderTextColor="#999"
            keyboardType="email-address"
          />
        </View>
        <View style={{paddingHorizontal: 24, width: '100%'}}>
          {/* Send Button */}
          <TouchableOpacity
            style={[styles.button, styles.sendButton]}
            onPress={handleSend}
          >
            <Text style={styles.sendText}>
              {isSubmitting ? "Sending..." : "Send"}
            </Text>
          </TouchableOpacity>

          {/* Go Back */}
          <TouchableOpacity
            style={[styles.button, styles.backButton]}
            onPress={() => router.push("/auth/login")}
          >
            <Text style={styles.backText}> Back</Text>
          </TouchableOpacity>
        </View>
      </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
    height: "100%",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
    // paddingHorizontal: 24,
    // justifyContent: "center",
    alignItems: "center",
    height: "100%",
    // paddingVertical: 20,
  },
  logo: {
    width: 60,
    height: 60,
    // marginBottom: 12,
    resizeMode: "contain",
    marginTop: 70,

  },
  appName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#5A31F4",
    textAlign: "center",
    marginBottom: 4,
    fontFamily: "Poppins_600SemiBold",
  },
  welcomeText: {
    fontSize: 15,
    color: "#555",
    textAlign: "center",
    lineHeight: 22,
    fontFamily: "Poppins_400Regular",
  },
  form: {
    width: "100%",
    marginTop: 40,
    marginBottom: 30,
    paddingHorizontal: 24,
  },
  label: {
    fontSize: 14,
    color: "#444",
    marginBottom: 4,
    fontFamily: "Poppins_400Regular",
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: "#555",
    paddingVertical: 8,
    marginBottom: 20,
    fontSize: 13,
    color: "#666",
    fontFamily: "Poppins_400Regular",
  },
  button: {
    width: "100%",
    height: 51,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  sendButton: {
    backgroundColor: "#5A31F4",
  },
  sendText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
  },
  backButton: {
    backgroundColor: "#F3EDFF",
  },
  backText: {
    color: "#5A31F4",
    fontWeight: "700",
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
  },
});
