import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform } from "react-native";
import React from "react";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window")

const CATEGORY_ICONS = {
  "Games": "🎮",
  "Religion": "🙏",
  "Club": "🎉",
  "Concert": "🎵",
  "Sports": "⚽",
  "Food": "🍽️",
  "Art": "🎨",
  "Tech": "💻",
  "Technology": "💻",
  "Fashion": "👗",
  "Business": "💼",
  "Health": "💊",
  "Education": "📚",
  "Music": "🎶",
  "Comedy": "😂",
  "Networking": "🤝",
  "Photography": "📸",
  "Film": "🎬",
  "Travel": "✈️",
  "Fitness": "🏋️",
  "Charity": "❤️",
  "Politics": "🏛️",
  "Science": "🔬",
  "Gaming": "🕹️",
  "default": "✨"
}

const CATEGORY_COLORS = {
  "Games": { bg: "#EDE9FE", text: "#5A31F4" },
  "Religion": { bg: "#FEF9C3", text: "#854D0E" },
  "Club": { bg: "#FCE7F3", text: "#9D174D" },
  "Concert": { bg: "#E0F2FE", text: "#0369A1" },
  "Sports": { bg: "#DCFCE7", text: "#166534" },
  "Food": { bg: "#FEF3C7", text: "#92400E" },
  "Art": { bg: "#FCE7F3", text: "#9D174D" },
  "Tech": { bg: "#EDE9FE", text: "#5A31F4" },
  "Technology": { bg: "#EDE9FE", text: "#5A31F4" },
  "Fashion": { bg: "#FDF2F8", text: "#9D174D" },
  "Business": { bg: "#F0FDF4", text: "#166534" },
  "Health": { bg: "#FFF1F2", text: "#9F1239" },
  "Education": { bg: "#EFF6FF", text: "#1D4ED8" },
  "Music": { bg: "#F5F3FF", text: "#6D28D9" },
  "Comedy": { bg: "#FFFBEB", text: "#92400E" },
  "Networking": { bg: "#F0FDF4", text: "#166534" },
  "default": { bg: "#F3EDFF", text: "#5A31F4" }
}

export default function EventCategoryBoxes({ category }) {
  const router = useRouter();

  const handlePress = () => {
    // Navigate to category details page with category ID
    router.push(`/events/category/${category._id}`);
  };

  const emoji = CATEGORY_ICONS[category.name] || CATEGORY_ICONS["default"]
  const colors = CATEGORY_COLORS[category.name] || CATEGORY_COLORS["default"]

  return (
    <TouchableOpacity
      style={styles.pill}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconCircle, { backgroundColor: colors.bg }]}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      <View style={styles.textContainer}>
        <Text
          style={[styles.label, { color: colors.text }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {category.name}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "#E8DBFF",
    paddingVertical: 7,
    paddingLeft: 5,
    paddingRight: 12,
    marginRight: 8,
    gap: 6,
    shadowColor: "#5A31F4",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    maxWidth: width * 0.45,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  emoji: {
    fontSize: 16,
    lineHeight: Platform.OS === "android" ? 20 : undefined,
    includeFontPadding: false,
  },
  textContainer: {
    justifyContent: "center",
    flexShrink: 1,
    overflow: "hidden",
  },
  label: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#333",
    includeFontPadding: false,
    flexShrink: 1,
  },
  count: {
    fontFamily: "Poppins_400Regular",
    fontSize: 10,
    color: "#999",
    marginTop: 0,
    includeFontPadding: false,
  },
})
