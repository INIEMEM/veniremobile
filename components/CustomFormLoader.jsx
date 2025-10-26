import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

export default function CustomLoader() {
  // 🔹 Reduced initial positions to make motion tighter
  const move1 = useRef(new Animated.ValueXY({ x: -10, y: -10 })).current;
  const move2 = useRef(new Animated.ValueXY({ x: 10, y: 10 })).current;

  useEffect(() => {
    const loopAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(move1, {
              toValue: { x: 10, y: 10 }, // smaller range
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(move2, {
              toValue: { x: -10, y: -10 },
              duration: 600,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(move1, {
              toValue: { x: -10, y: -10 },
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(move2, {
              toValue: { x: 10, y: 10 },
              duration: 600,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    };

    loopAnimation();
  }, []);

  return (
    <View style={styles.overlay}>
      <View style={styles.loaderBox}>
        <View style={styles.animationContainer}>
          <Animated.View
            style={[styles.square, 
              { transform: move1.getTranslateTransform() }
            
            ]}
          />
          <Animated.View
            style={[styles.square, 
              { transform: move2.getTranslateTransform() }
            
            ]}
          />
        </View>
        <Text style={styles.text}>Please wait...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    width: "100%",
    height: "100%",
    zIndex: 999,
  },
  loaderBox: {
    width: width * 0.45,
    height: 105,
    backgroundColor: "#fff",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  animationContainer: {
    flexDirection: "row",
    position: "relative",
    marginBottom: 10,
  },
  square: {
    width: 15,
    height: 15,
    backgroundColor: "#5A31F4",
    borderRadius: 3,
    marginHorizontal: 4, // slightly closer
    marginBottom : 10,
  },
  text: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
    fontFamily: "Poppins_500Medium",
  },
});
