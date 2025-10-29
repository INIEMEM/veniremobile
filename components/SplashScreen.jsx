import React, { useEffect, useRef } from "react";
import { View, Image, Animated, StyleSheet, Easing, Text } from "react-native";

export default function Splash() {
  const scale = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Bounce-in logo animation
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 1,
        friction: 3,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.95,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Ellipse (loading dots) animation loop
    const animateDots = () => {
      Animated.sequence([
        Animated.timing(dot1, {
          toValue: 1,
          duration: 300,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(dot1, {
          toValue: 0,
          duration: 300,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(dot2, {
          toValue: 1,
          duration: 300,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(dot2, {
          toValue: 0,
          duration: 300,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(dot3, {
          toValue: 1,
          duration: 300,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(dot3, {
          toValue: 0,
          duration: 300,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]).start(() => animateDots());
    };

    animateDots();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require("../assets/splash.png")}
        style={[styles.logo, { transform: [{ scale }] }]}
        resizeMode="contain"
      />
      {/* <Text>Venire</Text> */}
      {/* Loading Ellipse (Dots) */}
      <View style={styles.dotsContainer}>
        <Animated.View
          style={[styles.dot, { opacity: dot1 }]}
        />
        <Animated.View
          style={[styles.dot, { opacity: dot2 }]}
        />
        <Animated.View
          style={[styles.dot, { opacity: dot3 }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#5A31F4",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
    objectFit: 'cover'
  },
  dotsContainer: {
    flexDirection: "row",
    marginTop: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#fff",
    marginHorizontal: 5,
  },
});
