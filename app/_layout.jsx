// app/_layout.jsx
import { Stack } from "expo-router";
import { AuthProvider } from "../context/AuthContext";
import Toast from 'react-native-toast-message';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, Poppins_300Light } from "@expo-google-fonts/poppins";
import { tokenCache } from '../utils/cache';
import { ClerkProvider, ClerkLoaded } from '@clerk/clerk-expo';
import { Text, View, ScrollView, SafeAreaView, Pressable } from "react-native";
import React, { useEffect } from "react";
import { ToastProvider } from "../context/ToastContext";
import { toastConfig } from "../components/CustomToast";
import * as WebBrowser from "expo-web-browser";
import AsyncStorage from "@react-native-async-storage/async-storage";
// import * as SplashScreen from "expo-splash-screen";
WebBrowser.maybeCompleteAuthSession();

// ── Fallback Global JS Error Handler ───────────────────────────────────────
if (typeof ErrorUtils !== "undefined") {
  const prevHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler(async (error, isFatal) => {
    try {
      const existing = await AsyncStorage.getItem("@venire_crash_log");
      const logs = existing ? JSON.parse(existing) : [];
      logs.unshift({
        timestamp: new Date().toISOString(),
        message: error?.message || String(error),
        stack: error?.stack || "",
        extra: isFatal ? "[FATAL STARTUP CRASH]" : "[NON-FATAL]",
      });
      await AsyncStorage.setItem("@venire_crash_log", JSON.stringify(logs.slice(0, 10)));
    } catch (e) {
      // silent
    }
    if (prevHandler) prevHandler(error, isFatal);
  });
}


const publishableKey = 'pk_test_Z2VuZXJvdXMtbXVsbGV0LTQyLmNsZXJrLmFjY291bnRzLmRldiQ'

if (!publishableKey) {
  throw new Error('Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env');
}
function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_300Light
  });

  useEffect(() => {
    if (fontsLoaded) {
      // ✅ Set global default only after fonts are ready
      Text.defaultProps = Text.defaultProps || {};
      Text.defaultProps.style = { fontFamily: "Poppins_400Regular" };
      // SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;
  Text.defaultProps = Text.defaultProps || {};
  Text.defaultProps.style = { fontFamily: "Poppins_400Regular" };

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <AuthProvider>
          <ToastProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </ToastProvider>
          <Toast config={toastConfig} topOffset={90} />
        </AuthProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("App Crash:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000', padding: 20 }}>
          <Text style={{ color: '#ff4444', fontSize: 24, fontWeight: 'bold', marginBottom: 20, marginTop: 40 }}>
            App Crashed!
          </Text>
          <ScrollView style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 14, fontFamily: 'monospace' }}>
              {this.state.error?.message || String(this.state.error)}
            </Text>
            <Text style={{ color: '#888', fontSize: 12, marginTop: 10, fontFamily: 'monospace' }}>
              {this.state.error?.stack || ''}
            </Text>
          </ScrollView>
          <Pressable 
            style={{ backgroundColor: '#5A31F4', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 20 }}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Try Again</Text>
          </Pressable>
        </SafeAreaView>
      );
    }
    return <RootLayout />;
  }
}

export default AppErrorBoundary;
