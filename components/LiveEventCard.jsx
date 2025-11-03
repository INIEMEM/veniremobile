import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Video } from "expo-av";
import { useRouter } from "expo-router";

import { truncateText } from "../utils/truncateText";

export default function LiveEventCard({
  eventId, // Add eventId prop
  imgSrc,
  videoSrc,
  title,
  caption,
  date,
  time,
  location,
  price,
}) {
  const router = useRouter();
  
  // Determine if we should show video or image
  const mediaType = videoSrc ? 'video' : 'image';
  const mediaSrc = videoSrc || imgSrc;

  const handlePress = () => {
    if (eventId) {
      router.push(`/(tabs)/Events/${eventId}`);
    }
  };

  return (
    <TouchableOpacity 
      style={styles.cardContainer}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* 🖼️ Event Image or Video */}
      <View style={styles.mediaContainer}>
        {mediaType === 'video' ? (
          <Video
            source={{ uri: mediaSrc }}
            style={styles.media}
            useNativeControls
            resizeMode="cover"
            isLooping
            shouldPlay={false}
          />
        ) : (
          <Image source={{ uri: mediaSrc }} style={styles.media} />
        )}
      </View>

      {/* 🏷️ Event Title */}
      <Text style={styles.title}>{truncateText(title, 35)}</Text>

      {/* ✍️ Caption */}
      <Text style={styles.caption}>{truncateText(caption, 40)}</Text>

      {/* 📅 Date, Time, Location + 💰 Price */}
      <View style={styles.footerRow}>
        <View style={styles.detailsSection}>
          <View style={styles.detailItem}>
            {/* <Ionicons name="calendar-outline" size={14} color="#FAB843" /> */}
            <Text style={styles.detailText}>{date}</Text>
          </View>

          <View style={styles.detailItem}>
            {/* <Ionicons name="time-outline" size={14} color="#FAB843" /> */}
            <Text style={styles.detailText}>{time}</Text>
          </View>

          <View style={styles.detailItem}>
            {/* <Ionicons name="location-outline" size={14} color="#FAB843" /> */}
            <Text style={styles.detailText}>{location}</Text>
          </View>
        </View>

        <View style={styles.priceSection}>
          <Text style={styles.price}>{price}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#f8f8f8",
    borderRadius: 10,
    padding: 5,
    marginBottom: 15,
    width: 290,
    overflow: 'hidden',
  },
  mediaContainer: {
    width: 283,
    height: 151,
    borderRadius: 9,
    overflow: 'hidden',
    backgroundColor: '#e0e0e0',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    marginTop: 6,
    color: "#555",
  },
  caption: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "#666",
    marginTop: 3,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  detailsSection: {
    flexDirection: "row",
    gap: 3,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 10,
    color: "#444",
  },
  priceSection: {
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  price: {
    color: "#444",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
  },
});