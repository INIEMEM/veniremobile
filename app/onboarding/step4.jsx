import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions
} from "react-native";
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
const { width, height, fontScale } = Dimensions.get("window");
const ITEM_WIDTH = width * 0.28; // 26% of screen width
  // Map each category to its icon
export default function SelectSkillsScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState([]);
  const finishOnboarding = async () => {
    await AsyncStorage.setItem("onboardingDone", "true");
    router.replace("/auth/login");
  };
  
  const categories = [
    { name: "Music", icon: <Ionicons name="musical-notes-outline" size={16} color="#333" /> },
    { name: "Church", icon: <MaterialCommunityIcons name="church" size={16} color="#333" /> },
    { name: "Sport", icon: <FontAwesome5 name="basketball-ball" size={16} color="#333" /> },
    { name: "Wedding", icon: <FontAwesome5 name="ring" size={16} color="#333" /> },
    { name: "Workshop", icon: <Ionicons name="hammer-outline" size={16} color="#333" /> },
    { name: "Tech", icon: <Ionicons name="hardware-chip-outline" size={16} color="#333" /> },
    { name: "Art", icon: <Ionicons name="color-palette-outline" size={16} color="#333" /> },
    { name: "Travel", icon: <Ionicons name="airplane-outline" size={16} color="#333" /> },
    { name: "Education", icon: <Ionicons name="school-outline" size={16} color="#333" /> },
    { name: "Business", icon: <Ionicons name="briefcase-outline" size={16} color="#333" /> },
  ];

  const toggleSelect = (itemName) => {
    setSelected((prev) =>
      prev.includes(itemName)
        ? prev.filter((i) => i !== itemName)
        : [...prev, itemName]
    );
  };

  const isDisabled = selected.length < 2;

  // Helper to group items in pattern: [3,2,3,2,...]
  const getRows = () => {
    let rows = [];
    let i = 0;
    let pattern = [3, 2];
    let patternIndex = 0;

    while (i < categories.length) {
      const size = pattern[patternIndex % 2];
      rows.push(categories.slice(i, i + size));
      i += size;
      patternIndex++;
    }
    return rows;
  };

  return (
    <View style={styles.container}>
      {/* Top Section with Back Button and Title */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#000" />
      </TouchableOpacity>
      <View style={styles.header}>
        
        <Text style={styles.title}>Let's personalize your experience</Text>
      </View>

      <Text style={styles.subtitle}>
        Please select two or more skills of your choice to proceed.
      </Text>

      {/* Category Selection */}
      <View style={styles.list}>
        {getRows().map((row, index) => (
          <View key={index} style={styles.row}>
            {row.map(({ name, icon }) => {
              const active = selected.includes(name);
              return (
                <TouchableOpacity
                  key={name}
                  style={[styles.item, active && styles.itemActive]}
                  onPress={() => toggleSelect(name)}
                >
                  <View style={styles.itemContent}>
                    {icon}
                    <Text
                      style={[
                        styles.itemText,
                        active && styles.itemTextActive,
                      ]}
                    >
                      {name}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* Next Button */}
      <TouchableOpacity
        style={[
          styles.nextButton,
          isDisabled ? styles.disabledButton : styles.activeButton,
        ]}
        disabled={isDisabled}
        onPress={finishOnboarding}
      >
        <Text
          style={[
            styles.nextText,
            isDisabled ? styles.disabledText : styles.activeText,
          ]}
        >
          Next
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// 🎨 Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    fontFamily: "Poppins_400Regular",
  },
  backButton: {
    // paddingRight: 5,
    marginTop:-20,
    marginBottom:30,
    fontFamily: "Poppins_400Regular",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#000",
    flexShrink: 1,
    fontFamily: "Poppins_700Bold",
  },
  subtitle: {
    fontSize: 14,
    color: "#777",
    marginBottom: 30,
    fontFamily: "Poppins_400Regular",
  },
  list: {
    flexGrow: 1,
  },
  row: {
    flexDirection: "row",
    // justifyContent: "center",
    marginBottom: 15,
    gap: 12,
  },
  item: {
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderRadius: 25,
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: "#F8F8F8",
    width: ITEM_WIDTH,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
  },
  itemActive: {
    borderColor: "#5A31F4",
    // backgroundColor: "#F3EDFF",
  },
  itemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    
  },
  itemText: {
    color: "#333",
    fontWeight: "600",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11 / fontScale,
  },
  itemTextActive: {
    color: "#333",
  },
  nextButton: {
    marginTop: "auto",
    marginBottom: 40,
    borderRadius: 15,
    paddingVertical: 14,
    alignItems: "center",
    height: 51,
    fontFamily: "Poppins_400Regular",
  },
  activeButton: {
    backgroundColor: "#5A31F4",
  },
  disabledButton: {
    backgroundColor: "#eee",
  },
  nextText: {
    fontWeight: "700",
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
  },
  activeText: {
    color: "#fff",
  },
  disabledText: {
    color: "#999",
    fontFamily: "Poppins_400Regular",
  },
});
