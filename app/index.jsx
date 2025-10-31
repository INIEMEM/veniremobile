import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import SplashScreen from "../components/SplashScreen";
import { View, ActivityIndicator } from "react-native";
import Toast from "react-native-toast-message";

export default function Index() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const onboarded = await AsyncStorage.getItem("onboardingDone");
      const token = await AsyncStorage.getItem("token");
      console.log("token:", token)
      const isGuest = await AsyncStorage.getItem("isGuest");
      // console.log("Token:", isGuest);
      if (!onboarded) router.replace("/onboarding/step1");
      else if (!token) router.replace("/auth/login");
      else router.replace("/(tabs)/Home");

      // Give a small buffer before removing splashxc
      setTimeout(() => setShowSplash(false), 500);
    };

    initializeApp();
  }, []);

  if (showSplash) return <SplashScreen />;

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
      <Toast />
    </View>
  );
}
