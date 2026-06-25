// app/_layout.jsx
import { Stack } from "expo-router";
import { AuthProvider } from "../context/AuthContext";
import Toast from 'react-native-toast-message';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, Poppins_300Light } from "@expo-google-fonts/poppins";
import { tokenCache } from '../utils/cache';
import { ClerkProvider, ClerkLoaded } from '@clerk/clerk-expo';
import { Text } from "react-native";
import { useEffect } from "react";
import { ToastProvider } from "../context/ToastContext";
import { toastConfig } from "../components/CustomToast";
import * as WebBrowser from "expo-web-browser";
// import * as SplashScreen from "expo-splash-screen";
WebBrowser.maybeCompleteAuthSession();

const publishableKey = 'pk_test_Z2VuZXJvdXMtbXVsbGV0LTQyLmNsZXJrLmFjY291bnRzLmRldiQ'

if (!publishableKey) {
  throw new Error('Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env');
}
export default function RootLayout() {
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

      // ✅ Hide splash only when fonts are loaded
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
