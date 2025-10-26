import { View, Text, StyleSheet, ScrollView } from "react-native";
import React from "react";
import EventCategoryBoxes from "./EventCategoryBoxes";
import { Ionicons } from "@expo/vector-icons";
import LiveEventCard from "./LiveEventCard";
import testImage from '../assets/livee.jpg';
import { useRouter } from "expo-router";
import ExploreEvents from "./ExploreEvents";
// import '../assets/categories/concert.png'
export default function EventsScreen() {
  const router = useRouter();
  const categories = [
    { image: require("../assets/categories/concert.png"), label: "Concert", count: 23 },
    { image: require("../assets/categories/tech.png"), label: "Tech", count: 10 },
    {image: require("../assets/categories/sports.png"), label: "Sport", count: 30 },
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
      contentContainerStyle={{ paddingBottom: 100 }}
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
           label={cat.label} />
        ))}
      </ScrollView>

      <Text style={[styles.title, {marginTop: 20}]}>Live Events </Text>
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


      {/* ===== EXPLORE DETAILS ==== */}
      <Text style={[styles.title, { marginTop: 25 }]}>Explore Events</Text>

      <ExploreEvents/>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    // paddingBottom: 30,
  },
  title: {
    fontFamily: "Poppins_600SemiBold",
    color: "#444",  
    fontSize: 16,
    marginBottom: 10,
  },
  scrollContent: {
    paddingRight: 20,
  },
});
