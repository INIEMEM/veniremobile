import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Animated,
} from "react-native";
import { Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { truncateText } from "../utils/truncateText";

const { width } = Dimensions.get("window");

export default function ExploreEvents() {
  const router = useRouter();

  const [events, setEvents] = useState([
    {
      id: 1,
      host: "Chef Tunde",
      roles: "Baker | Chef | Transporter",
      description:
        "Join us for an amazing cooking masterclass featuring African dishes and food artistry...",
      flier:
        "https://images.pexels.com/photos/5938/food-salad-healthy-lunch.jpg?auto=compress&cs=tinysrgb&w=800",
      title: "African Cooking Masterclass",
      caption: "A day of delicious creativity and fun.",
      date: "Nov 10, 2025",
      time: "10:00 AM",
      location: "Abuja, Nigeria",
      price: "₦15,000",
      likes: 120,
      comments: 45,
      engagement: 200,
      liked: false,
    },
    {
      id: 2,
      host: "Chef Tunde",
      roles: "Baker | Chef | Transporter",
      description:
        "Join us for an amazing cooking masterclass featuring African dishes and food artistry...",
      flier:
        "https://images.pexels.com/photos/5938/food-salad-healthy-lunch.jpg?auto=compress&cs=tinysrgb&w=800",
      title: "African Cooking Masterclass",
      caption: "A day of delicious creativity and fun.",
      date: "Nov 10, 2025",
      time: "10:00 AM",
      location: "Abuja, Nigeria",
      price: "₦15,000",
      likes: 120,
      comments: 45,
      engagement: 200,
      liked: false,
    },
    
    {
      id: 3,
      host: "Chef Tunde",
      roles: "Baker | Chef | Transporter",
      description:
        "Join us for an amazing cooking masterclass featuring African dishes and food artistry...",
      flier:
        "https://images.pexels.com/photos/5938/food-salad-healthy-lunch.jpg?auto=compress&cs=tinysrgb&w=800",
      title: "African Cooking Masterclass",
      caption: "A day of delicious creativity and fun.",
      date: "Nov 10, 2025",
      time: "10:00 AM",
      location: "Abuja, Nigeria",
      price: "₦15,000",
      likes: 120,
      comments: 45,
      engagement: 200,
      liked: false,
    },

  ]);

  // Create animation refs for each event
  const animations = useRef({}).current;

  // 🩷 Handle Like with Bounce
  const handleLike = (id) => {
    setEvents((prev) =>
      prev.map((event) => {
        if (event.id === id) {
          // Trigger animation
          if (!animations[id]) animations[id] = new Animated.Value(1);
          Animated.sequence([
            Animated.timing(animations[id], {
              toValue: 1.5,
              duration: 150,
              useNativeDriver: true,
            }),
            Animated.spring(animations[id], {
              toValue: 1,
              friction: 3,
              useNativeDriver: true,
            }),
          ]).start();

          return {
            ...event,
            liked: !event.liked,
            likes: event.liked ? event.likes - 1 : event.likes + 1,
          };
        }
        return event;
      })
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {events.map((event) => {
        if (!animations[event.id]) animations[event.id] = new Animated.Value(1);

        return (
          <View style={styles.eventCard} key={event.id}>
            <Text style={styles.host}>{event.host}</Text>
            <Text style={styles.roles}>{event.roles}</Text>

            <Text style={[styles.host, { marginTop: 20 }]}>Event Description</Text>
            <TouchableOpacity
              onPress={() => router.push(`/(tabs)/Events/${event.id}`)}
            >
              <Text style={styles.description}>
                {truncateText(event.description, 300, "long")}
              </Text>
            </TouchableOpacity>

            <Image source={{ uri: event.flier }} style={styles.flier} />

            <Text style={styles.eventTitle}>{event.title}</Text>
            <Text style={styles.caption}>{event.caption}</Text>

            <View style={styles.infoRow}>
              <Text style={styles.dateTime}>
                {event.date} • {event.time}
              </Text>
            </View>

            <View style={[styles.infoRow2]}>
              <View style={styles.mapBox}>
                <Text style={styles.mapText}>Map</Text>
              </View>
              <View>
                <Text style={styles.mapText}>{event.location}</Text>
                <Text style={styles.mapText}>
                  Latitude: 9.0765° N, Longitude: 7.3986° E
                </Text>
              </View>
            </View>

            <View style={styles.priceRow}>
              <TouchableOpacity style={styles.interestedBtn}>
                <Text style={styles.interestedText}>Interested</Text>
              </TouchableOpacity>
              <Text style={styles.price}>{event.price}</Text>
            </View>

            {/* ❤️ Animated Like Icon */}
            <View style={styles.statsRow}>
              <TouchableOpacity onPress={() => handleLike(event.id)}>
                <Animated.View style={{ transform: [{ scale: animations[event.id] }], flexDirection: "row",
    alignItems: "center",
    gap: 4, }}>
                  <Ionicons
                    name={event.liked ? "heart" : "heart-outline"}
                    size={24}
                    color={event.liked ? "red" : "#555"}
                  />
                  <Text style={styles.likesText}>{event.likes} Likes</Text>
                </Animated.View>
              </TouchableOpacity>

              <View style={styles.statItem}>
                <Ionicons name="chatbubble-outline" size={20} color="#555" />
                <Text style={styles.statText}>{event.comments}</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="trending-up-outline" size={20} color="#555" />
                <Text style={styles.statText}>{event.engagement}</Text>
              </View>
              <Ionicons name="bookmark-outline" size={20} color="#555" />
              <Ionicons name="share-social-outline" size={20} color="#555" />
            </View>

            
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  eventCard:{
    marginBottom: 25,
  },
  title: {
    fontFamily: "Poppins_600SemiBold",
    color: "#444",
    fontSize: 16,
    marginBottom: 10,
  },
  host: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#222",
  },
  roles: {
    fontFamily: "Poppins_400Regular",
    color: "#777",
    fontSize: 12,
  },
  description: {
    fontFamily: "Poppins_300Light",
    color: "#666",
    marginVertical: 8,
    fontSize: 12,
  },
  flier: {
    width: "100%",
    height: 150,
    borderRadius: 8,
  },
  eventTitle: {
    fontFamily: "Poppins_600SemiBold",
    marginTop: 8,
    fontSize: 14,
    color: "#666",
  },
  caption: {
    fontFamily: "Poppins_400Regular",
    color: "#777",
    marginBottom: 10,
    fontSize: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoRow2: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginTop: 18,
  },
  dateTime: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "#666",
  },
  mapBox: {
    backgroundColor: "#eee",
    width: 60,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 6,
  },
  mapText: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#777",
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 10,
  },
  interestedBtn: {
    backgroundColor: "#5A31F4",
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 6,
    width: width * 0.5,
    height: 45,
    justifyContent: "center",
    alignItems: "center",
  },
  interestedText: {
    color: "#fff",
    fontFamily: "Poppins_500Medium",
  },
  price: {
    fontFamily: "Poppins_600SemiBold",
    color: "#FAB843",
    fontSize: 14,
    backgroundColor: "#FDECCD",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FAB843",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
    alignItems: "center",
    borderBottomColor: "#eee",
    borderBottomWidth: 1,
    borderTopColor: "#eee",
    borderTopWidth: 1,
    paddingVertical: 10,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontFamily: "Poppins_400Regular",
    color: "#555",
    fontSize: 12,
  },
  likesText: {
    fontFamily: "Poppins_400Regular",
    color: "#777",
    fontSize: 12,
    marginTop: 5,
  },
});
