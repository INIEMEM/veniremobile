import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

export default function VenireLogo({
  size = 80,
  textColor = "#FFFFFF",
  showText = true,
  animate = true,
  showSpinner = false,
}) {
  const leftOpacity = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const leftX = useRef(new Animated.Value(animate ? -30 : 0)).current;
  const leftY = useRef(new Animated.Value(animate ? -20 : 0)).current;

  const rightOpacity = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const rightX = useRef(new Animated.Value(animate ? 30 : 0)).current;
  const rightY = useRef(new Animated.Value(animate ? -20 : 0)).current;

  const textOpacity = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const textY = useRef(new Animated.Value(animate ? 10 : 0)).current;

  const logoScale = useRef(new Animated.Value(1)).current;
  const spinnerRotation = useRef(new Animated.Value(0)).current;

  const vHeight = size;
  const vWidth = size * 0.9;
  const plankWidth = size * 0.18;
  const plankHeight = size * 0.82;
  const ringSize = size + 48;

  useEffect(() => {
    let pulseAnimation;

    if (animate) {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(leftOpacity, {
            toValue: 1,
            duration: 400,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(leftX, {
            toValue: 0,
            duration: 400,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(leftY, {
            toValue: 0,
            duration: 400,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.delay(150),
            Animated.parallel([
              Animated.timing(rightOpacity, {
                toValue: 1,
                duration: 400,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
              }),
              Animated.timing(rightX, {
                toValue: 0,
                duration: 400,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
              }),
              Animated.timing(rightY, {
                toValue: 0,
                duration: 400,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
              }),
            ]),
          ]),
        ]),
        Animated.delay(400),
        Animated.parallel([
          Animated.timing(textOpacity, {
            toValue: 1,
            duration: 400,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(textY, {
            toValue: 0,
            duration: 400,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        pulseAnimation = Animated.loop(
          Animated.sequence([
            Animated.timing(logoScale, {
              toValue: 1.04,
              duration: 900,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(logoScale, {
              toValue: 1,
              duration: 900,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ])
        );
        pulseAnimation.start();
      });
    }

    return () => {
      if (pulseAnimation) {
        pulseAnimation.stop();
      }
    };
  }, [
    animate,
    leftOpacity,
    leftX,
    leftY,
    logoScale,
    rightOpacity,
    rightX,
    rightY,
    textOpacity,
    textY,
  ]);

  useEffect(() => {
    let spinnerAnimation;

    if (showSpinner) {
      spinnerAnimation = Animated.loop(
        Animated.timing(spinnerRotation, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      spinnerAnimation.start();
    }

    return () => {
      if (spinnerAnimation) {
        spinnerAnimation.stop();
      }
    };
  }, [showSpinner, spinnerRotation]);

  const spinnerRotate = spinnerRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale: logoScale }] }]}>
      <View
        style={[
          styles.markContainer,
          {
            width: ringSize,
            height: ringSize,
          },
        ]}
      >
        {showSpinner && (
          <Animated.View
            style={[
              styles.spinner,
              {
                width: ringSize,
                height: ringSize,
                borderRadius: ringSize / 2,
                transform: [{ rotate: spinnerRotate }],
              },
            ]}
          />
        )}

        <View
          style={[
            styles.vContainer,
            {
              width: vWidth,
              height: vHeight,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.plank,
              {
                width: plankWidth,
                height: plankHeight,
                borderRadius: plankWidth / 2,
                left: vWidth * 0.24,
                top: vHeight * 0.05,
                backgroundColor: "#00BCD4",
                opacity: leftOpacity,
                transform: [
                  { translateX: leftX },
                  { translateY: leftY },
                  { rotate: "-35deg" },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.plank,
              {
                width: plankWidth,
                height: plankHeight,
                borderRadius: plankWidth / 2,
                right: vWidth * 0.24,
                top: vHeight * 0.05,
                backgroundColor: "#FAB843",
                opacity: rightOpacity,
                transform: [
                  { translateX: rightX },
                  { translateY: rightY },
                  { rotate: "35deg" },
                ],
              },
            ]}
          />
        </View>
      </View>

      {showText && (
        <Animated.Text
          style={[
            styles.logoText,
            {
              color: textColor,
              fontSize: size * 0.28,
              opacity: textOpacity,
              transform: [{ translateY: textY }],
            },
          ]}
        >
          Venire
        </Animated.Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  markContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  spinner: {
    borderBottomColor: "transparent",
    borderColor: "#5A31F4",
    borderLeftColor: "#5A31F4",
    borderRightColor: "#5A31F4",
    borderTopColor: "#5A31F4",
    borderWidth: 2.5,
    position: "absolute",
  },
  vContainer: {
    position: "relative",
  },
  plank: {
    position: "absolute",
  },
  logoText: {
    fontFamily: "Poppins_700Bold",
    marginTop: -6,
    textAlign: "center",
  },
});
