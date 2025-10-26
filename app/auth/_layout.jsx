import { Stack, useRouter } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
export default function AuthLayout() {
  const router = useRouter();
  // useEffect(() => {
  //   const checkAuth = async () => {
  //     const token = await AsyncStorage.getItem("token");
  //     const isGuest = await AsyncStorage.getItem("isGuest");
  //     if (token || isGuest) {
  //       router.replace("/(tabs)/home");
  //     } else {
  //       router.replace("/auth/login");
  //     }
  //     // setLoading(false);
  //   };
  //   checkAuth();
  // }, []);
  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
