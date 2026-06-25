import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import VenireLogo from "./VenireLogo";

export default function Splash() {
  const glowOneOpacity = useRef(new Animated.Value(0)).current;
  const glowTwoOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineY = useRef(new Animated.Value(8)).current;
  const progressX = useRef(new Animated.Value(-120)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(glowOneOpacity, {
        toValue: 0.15,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(glowTwoOpacity, {
        toValue: 0.12,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.sequence([
      Animated.delay(900),
      Animated.parallel([
        Animated.timing(taglineOpacity, {
          toValue: 0.6,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(taglineY, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    const progressAnimation = Animated.loop(
      Animated.timing(progressX, {
        toValue: 120,
        duration: 1200,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      })
    );

    progressAnimation.start();

    return () => {
      progressAnimation.stop();
    };
  }, [glowOneOpacity, glowTwoOpacity, progressX, taglineOpacity, taglineY]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.glowOne,
          {
            opacity: glowOneOpacity,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.glowTwo,
          {
            opacity: glowTwoOpacity,
          },
        ]}
      />

      <View style={styles.content}>
        <VenireLogo
          size={100}
          showText={true}
          animate={true}
          showSpinner={false}
        />
        <Animated.Text
          style={[
            styles.tagline,
            {
              opacity: taglineOpacity,
              transform: [{ translateY: taglineY }],
            },
          ]}
        >
          Discover. Connect. Experience.
        </Animated.Text>
        <Animated.View
          style={[
            styles.taglineDivider,
            {
              opacity: taglineOpacity,
              transform: [{ translateY: taglineY }],
            },
          ]}
        />
        <Animated.Text
          style={[
            styles.futureText,
            {
              opacity: taglineOpacity,
              transform: [{ translateY: taglineY }],
            },
          ]}
        >
          The Future of Events & Places
        </Animated.Text>
      </View>

      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              transform: [{ translateX: progressX }],
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: "#0A0A0F",
    flex: 1,
    justifyContent: "center",
    overflow: "hidden",
  },
  glowOne: {
    backgroundColor: "#5A31F4",
    borderRadius: 200,
    height: 400,
    position: "absolute",
    width: 400,
  },
  glowTwo: {
    backgroundColor: "#5A31F4",
    borderRadius: 125,
    height: 250,
    position: "absolute",
    width: 250,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
  tagline: {
    color: "#FFFFFF",
    fontFamily: "Poppins_300Light",
    fontSize: 13,
    letterSpacing: 2,
    marginTop: 12,
    textAlign: "center",
  },
  taglineDivider: {
    width: 96,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.28)",
    marginTop: 12,
    marginBottom: 10,
  },
  futureText: {
    color: "#FFFFFF",
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    letterSpacing: 1.2,
    opacity: 0.75,
    textAlign: "center",
  },
  progressTrack: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 2,
    bottom: 60,
    height: 3,
    overflow: "hidden",
    position: "absolute",
    width: 120,
  },
  progressBar: {
    backgroundColor: "#FFFFFF",
    borderRadius: 2,
    height: 3,
    width: 60,
  },
});
