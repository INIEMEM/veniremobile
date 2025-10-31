import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Animated,
} from "react-native";
import React, { useEffect, useRef } from "react";
import EventCategoryBoxes from "./EventCategoryBoxes";
import { Ionicons } from "@expo/vector-icons";
import LiveEventCard from "./LiveEventCard";
import testImage from "../assets/livee.jpg";
import { useRouter } from "expo-router";
import ExploreEvents from "./ExploreEvents";

const { width, height } = Dimensions.get("window");

export default function EventsScreen({isExploreMode = false, searchQuery = ""}) {
  const router = useRouter();

  // Subtle animations
  const categoriesOpacity = useRef(new Animated.Value(0)).current;
  const categoriesY = useRef(new Animated.Value(10)).current;
  const liveEventsOpacity = useRef(new Animated.Value(0)).current;
  const liveEventsY = useRef(new Animated.Value(10)).current;
  const exploreOpacity = useRef(new Animated.Value(0)).current;
  const exploreY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    // Subtle staggered entrance animations
    Animated.parallel([
      // Categories animation
      Animated.parallel([
        Animated.timing(categoriesY, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(categoriesOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // Live Events animation
      Animated.sequence([
        Animated.delay(150),
        Animated.parallel([
          Animated.timing(liveEventsY, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(liveEventsOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ]),
      // Explore Events animation
      Animated.sequence([
        Animated.delay(300),
        Animated.parallel([
          Animated.timing(exploreY, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(exploreOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();
  }, []);

  const categories = [
    {
      image: require("../assets/categories/concert.png"),
      label: "Concert",
      count: 23,
    },
    { image: require("../assets/categories/tech.png"), label: "Tech", count: 10 },
    {
      image: require("../assets/categories/sports.png"),
      label: "Sport",
      count: 30,
    },
    { image: require("../assets/categories/socials.png"), label: "Social" },
    { image: require("../assets/categories/concert.png"), label: "Art" },
    { image: require("../assets/categories/concert.png"), label: "Comedy" },
  ];

  const sponsoredEvents = [
    {
      id: 1,
      image:
        "https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=800",
      link: "/event-details/1",
    },
    {
      id: 2,
      image:
        "https://images.pexels.com/photos/210922/pexels-photo-210922.jpeg?auto=compress&cs=tinysrgb&w=800",
      link: "/event-details/2",
    },
  ];

  const regularEvents = [
    {
      id: 1,
      host: "Chef Tunde",
      roles: "Baker | Chef | Transporter",
      description:
        "Join us for an amazing cooking masterclass featuring African dishes and food artistry.",
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
    },
  ];

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* ===== CATEGORIES SECTION ===== */}
      <Animated.View
        style={{
          transform: [{ translateY: categoriesY }],
          opacity: categoriesOpacity,
        }}
      >
        <Text style={styles.title}>Categories</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {categories.map((cat, index) => (
            <EventCategoryBoxes
              key={index}
              imageSrc={cat.image}
              label={cat.label}
            />
          ))}
        </ScrollView>
      </Animated.View>

      {/* ===== LIVE EVENTS SECTION ===== */}
      <Animated.View
        style={{
          transform: [{ translateY: liveEventsY }],
          opacity: liveEventsOpacity,
        }}
      >
        <Text style={[styles.title, styles.sectionSpacing]}>Live Events</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <LiveEventCard
            imgSrc="https://images.pexels.com/photos/34384967/pexels-photo-34384967.jpeg?auto=compress&cs=tinysrgb&w=600&lazy=load"
            title="Afrobeats Music Night"
            caption="An unforgettable night with top DJs"
            date="Oct 28, 2025"
            time="7:00 PM"
            location="Lagos, Nigeria"
            price="₦5,000"
          />
          <LiveEventCard
            imgSrc={`${testImage}`}
            title="Afrobeats Music Night"
            caption="An unforgettable night with top DJs"
            date="Oct 28, 2025"
            time="7:00 PM"
            location="Lagos, Nigeria"
            price="₦5,000"
          />
          <LiveEventCard
            imgSrc="https://images.pexels.com/photos/34384967/pexels-photo-34384967.jpeg?auto=compress&cs=tinysrgb&w=600&lazy=load"
            title="Afrobeats Music Night"
            caption="An unforgettable night with top DJs"
            date="Oct 28, 2025"
            time="7:00 PM"
            location="Lagos, Nigeria"
            price="₦5,000"
          />
        </ScrollView>
      </Animated.View>

      {/* ===== EXPLORE EVENTS SECTION ===== */}
      <Animated.View
        style={{
          transform: [{ translateY: exploreY }],
          opacity: exploreOpacity,
        }}
      >
        <Text style={[styles.title, styles.sectionSpacing]}>
          Explore Events
        </Text>

        <ExploreEvents isExploreMode={isExploreMode} />
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: height * 0.015,
  },
  contentContainer: {
    paddingBottom: height * 0.15,
  },
  title: {
    fontFamily: "Poppins_600SemiBold",
    color: "#444",
    fontSize: Math.min(width * 0.043, 16),
    marginBottom: height * 0.012,
  },
  sectionSpacing: {
    marginTop: height * 0.03,
  },
  scrollContent: {
    paddingRight: width * 0.05,
  },
});