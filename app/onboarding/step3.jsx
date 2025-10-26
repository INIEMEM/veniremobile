import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, ImageBackground, StyleSheet, Animated } from "react-native";
import { useRouter } from "expo-router";
import { useFonts, Unlock_400Regular } from "@expo-google-fonts/unlock";
import AsyncStorage from "@react-native-async-storage/async-storage";
export default function Step3() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    Unlock_400Regular,
  });

  // Animations
  const imageY = useRef(new Animated.Value(30)).current; // from bottom
  const imageOpacity = useRef(new Animated.Value(0)).current;
  const leftSlide = useRef(new Animated.Value(-200)).current; // from left
  const rightSlide = useRef(new Animated.Value(200)).current; // from right
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(imageY, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(imageOpacity, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(leftSlide, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(fadeIn, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(600),
        Animated.timing(rightSlide, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);
  if (!fontsLoaded) return null;

  const finishOnboarding = async () => {
    await AsyncStorage.setItem("onboardingDone", "true");
    router.replace("/auth/login");
  };

  return (
    <Animated.View
    style={[
      styles.container,
      {
        transform: [{ translateY: imageY }],
        opacity: imageOpacity,
      },
    ]}
  >
    <ImageBackground
      source={require("../../assets/step3.png")}
      style={styles.background}
      resizeMode="cover"
    >
      {/* Dim overlay */}
      <View style={styles.overlay} />

      {/* Top navigation: pagination + skip */}
      <View style={styles.topBar}>
        <Animated.View
          style={[
            styles.pagination,
            { transform: [{ translateX: leftSlide }], opacity: fadeIn },
          ]}
        >
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={[styles.dot, styles.activeDot]} />
        </Animated.View>

        <Animated.View
          style={{ transform: [{ translateX: rightSlide }], opacity: fadeIn }}
        >
          <TouchableOpacity onPress={finishOnboarding}>
            <Text style={styles.skip}>Skip</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Content */}
      <Animated.View
        style={[
          styles.content,
          { transform: [{ translateX: leftSlide }], opacity: fadeIn },
        ]}
      >
        <Text style={styles.title}>Discover and Explore Events of Interests</Text>
        <Text style={styles.caption}>
          Explore events that match your vibe and meet people of like minds:
          from concerts to tech meetups, weddings, and more.
        </Text>
      </Animated.View>

      {/* Bottom navigation */}
      <Animated.View
        style={[
          styles.bottomBar,
          { transform: [{ translateX: rightSlide }], opacity: fadeIn },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={() => router.push("/onboarding/step4")}
        >
          <Text style={styles.nextText}>Next →</Text>
        </TouchableOpacity>
      </Animated.View>
    </ImageBackground>
  </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1, padding: 20, position: "relative" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.2)", // adjust 0.4 → 0.6 for darker
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 40,
  },
  pagination: { flexDirection: "row" },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
    marginHorizontal: 4,
    opacity: 0.4,
  },
  activeDot: {
    width: 16,
    backgroundColor: "#fff",
    opacity: 1,
  },
  skip: { color: "#fff", fontWeight: "600", fontSize: 16, fontFamily: "Urbanist_400Regular"  },
  content: { marginTop: 10 },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    paddingVertical: 15,
    fontFamily: "Unlock_400Regular",
    marginTop: 30,
  },
  caption: {
    color: "#fff",
    fontSize: 14,
    paddingVertical: 10,
    marginTop: 0,
    fontFamily: "Poppins_400Regular", 
  },
  bottomBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: 40,
    gap: 20,
  },
  nextButton: {
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  nextText: {
    color: "#17BAEB",
    fontWeight: "700",
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
  },
  backText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
  },
});
