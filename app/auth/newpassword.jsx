import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  // SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";
// import api from "../utils/axiosInstance";
import api from "../../utils/axiosInstance";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomLoader from "../../components/CustomFormLoader";
import { useAuth } from "../../context/AuthContext";
export default function NewPasswordScreen() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const {setResetToken, resetToken} = useAuth()
  const handleResetPassword = async () => {
    if (!password || !confirmPassword) {
      Toast.show({
        type: "error",
        text1: "All fields are required",
      });
      return;
    }

    if (password !== confirmPassword) {
      Toast.show({
        type: "error",
        text1: "Passwords do not match",
      });
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/auth/password/reset", { password: password, resetToken: resetToken });
      Toast.show({
        type: "success",
        text1: "Password reset successfully!",
      });
      router.replace("/auth/login");
    } catch (error) {
      Toast.show({
        type: "error",
        text1: error.response?.data?.message || "Password reset failed",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Show loader when submitting */}
      {loading && <CustomLoader />}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.container}>
          <Text style={styles.logo}>Venire</Text>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.caption}>Enter your new password below</Text>

          <View style={styles.form}>
            <Text style={styles.label}>New Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor="#aaa"
            />

            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholderTextColor="#aaa"
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.6 }]}
            onPress={handleResetPassword}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Resetting..." : "Reset Password"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace("/auth/login")}>
            <Text style={styles.backText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  logo: {
    fontSize: 30,
    color: "#5A31F4",
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 40,
    fontFamily: "Poppins_600SemiBold",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 6,
    fontFamily: "Poppins_600SemiBold",
  },
  caption: {
    textAlign: "center",
    color: "#555",
    marginBottom: 30,
    fontFamily: "Poppins_400Regular",
  },
  form: {
    marginBottom: 30,
  },
  label: {
    fontSize: 14,
    color: "#444",
    marginBottom: 6,
    fontFamily: "Poppins_400Regular",

  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingVertical: 8,
    fontSize: 16,
    color: "#000",
    marginBottom: 20,
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
    fontFamily: "Poppins_600SemiBold",

  },
  backText: {
    textAlign: "center",
    color: "#5A31F4",
    fontWeight: "600",
    fontSize: 15,
    fontFamily: "Poppins_400Regular",

  },
});
