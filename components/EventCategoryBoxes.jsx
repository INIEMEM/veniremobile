import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import React from "react";
import { useRouter } from "expo-router";

export default function EventCategoryBoxes({ category }) {
  const router = useRouter();

  const handlePress = () => {
    // Navigate to category details page with category ID
    router.push(`/events/category/${category._id}`);
  };

  return (
    <TouchableOpacity 
      style={styles.cardContainer}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Image 
        source={{ uri: category.image }} 
        style={styles.iconImage} 
        resizeMode="cover" 
      />
      <Text style={styles.label}>{category.name}</Text>
      {category.totalEvents > 0 && (
        <Text style={styles.count}>{category.totalEvents}</Text>
      )}
    </TouchableOpacity>
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
    textAlign: "center",
  },
  count: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  iconImage: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
  },
});