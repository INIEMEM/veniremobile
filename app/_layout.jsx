// app/_layout.jsx
import { Stack } from "expo-router";
import { AuthProvider } from "../context/AuthContext";
import Toast from 'react-native-toast-message';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, Poppins_300Light } from "@expo-google-fonts/poppins";
import { ThemeProvider } from '@rneui/themed';
import { useEffect } from "react";
// import * as SplashScreen from "expo-splash-screen";
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
    <AuthProvider>
      <ThemeProvider>

      <Stack screenOptions={{ headerShown: false }} />
      </ThemeProvider>
      <Toast />
    </AuthProvider>
  );
}
