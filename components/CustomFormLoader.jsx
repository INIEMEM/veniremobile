import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import VenireLogo from "./VenireLogo";

const { width } = Dimensions.get("window");

export default function CustomLoader() {
  return (
    <View style={styles.overlay}>
      <View style={styles.loaderBox}>
        <VenireLogo
          size={60}
          showText={false}
          animate={true}
          showSpinner={true}
          textColor="#5A31F4"
        />
        <Text style={styles.text}>Please wait...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    width: "100%",
    height: "100%",
    zIndex: 999,
  },
  loaderBox: {
    width: width * 0.52,
    paddingVertical: 28,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#5A31F4",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
  },
  text: {
    marginTop: 10,
    fontSize: 13,
    color: "#555",
    fontFamily: "Poppins_400Regular",
  },
});
