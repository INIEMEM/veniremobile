import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

export default function CheckEmailScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* App Logo */}
        <View style={{ justifyContent: "center", alignItems: "center" }}>
          <Image
            source={require("../../assets/splash.png")}
            style={styles.logo}
          />
        </View>

        {/* Title */}
        <Text style={styles.appName}>Venire</Text>
        <Text style={styles.title}>Check your email </Text>

        {/* Caption */}
        <Text style={styles.caption}>
          We’ve sent a password reset link to your inbox. Please check and
          follow the instructions.
        </Text>

        {/* Proceed Button */}
        <TouchableOpacity
          style={[styles.button, styles.proceedButton]}
          onPress={() => router.replace("/auth/reset")}
        >
          <Text style={styles.proceedText}>Proceed</Text>
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: 24,
    paddingVertical: 30,
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 12,
    resizeMode: "contain",
  },
  appName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#5A31F4",
    textAlign: "center",
    marginBottom: 4,
    fontFamily: "Poppins_700Bold",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#5A31F4",
    marginTop: 20,
    // textAlign: "center",
    fontFamily: "Poppins_400Regular",

  },
  caption: {
    fontSize: 12,
    color: "#555",
    // textAlign: "center",
    lineHeight: 22,
    marginTop: 10,
    marginBottom: 40,
    // paddingHorizontal: 20,
    fontFamily: "Poppins_400Regular",
  },
  button: {
    width: "100%",
    height: 51,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  proceedButton: {
    backgroundColor: "#5A31F4",
  },
  proceedText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
  },
});
