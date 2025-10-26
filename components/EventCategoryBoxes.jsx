import { View, Text, StyleSheet, Image } from "react-native";
import React from "react";

export default function EventCategoryBoxes({ imageSrc, label, count }) {
  return (
    <View style={styles.cardContainer}>
      <Image source={imageSrc} style={styles.iconImage} resizeMode="contain" />
      <Text style={styles.label}>{label}</Text>
      {count && <Text style={styles.count}>{count}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#f8f8f8",
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    width: 80, 
    marginRight: 12, 
  },
  label: {
    marginTop: 6,
    fontFamily: "Poppins_500Medium",
    color: "#333",
    fontSize: 13,
  },
  count: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "#888",
  },
  iconImage: {
    width: 35,
    height: 35,
    objectFit: "cover",
  },
});
