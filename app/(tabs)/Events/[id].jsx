import React,  { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Animated
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Dimensions } from "react-native";
const { width } = Dimensions.get("window");
export default function EventDetailsScreen() {
  // Create animation refs for each event
  const animations = useRef({}).current;
  const [event, setEvents] = useState({
    id: 1,
  imgSrc:
    "https://images.pexels.com/photos/34384967/pexels-photo-34384967.jpeg?auto=compress&cs=tinysrgb&w=600&lazy=load",
  title: "Afrobeats Music Night",
  caption:
    "Season 2 Phase 4.",
  date: "Oct 28, 2025",
  time: "7:00 PM",
  location: "Lagos, Nigeria",
  price: "₦5,000",
  userImg:
    "https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=600",
  roles: "Baker | Chef | Transporter",
  description:
    "Join us for an amazing cooking masterclass featuring African dishes and food artistry...",
  liked: false,
  likes: 0,
  comments: 0,
  engagement: 0,
  }
); 
  // 🩷 Handle Like with Bounce
  const handleLike = (id) => {
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
  
    setEvents((prev) => ({
      ...prev,
      liked: !prev.liked,
      likes: prev.liked ? prev.likes - 1 : prev.likes + 1,
    }));
  };
  // const event = 
  const comments = [
    {
      id: 1,
      userImg:
        "https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=600",
      userName: "Jane Doe",
      time: "3 mins ago",
      comment: "This event looks amazing! Can't wait 😍",
      likes: 24,
      replies: [
        {
          id: 11,
          userImg:
            "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=600",
          userName: "Michael",
          time: "1 min ago",
          comment: "Same here! Let’s go together 😎",
          likes: 4,
        },
      ],
    },
    {
      id: 2,
      userImg:
        "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=600",
      userName: "John Smith",
      time: "15 mins ago",
      comment: "Afrobeats night is always 🔥",
      likes: 19,
      replies: [],
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Event Details</Text>
      <View style={styles.avatarContainer}>
        <View style={styles.organizerName}>
          <Image source={{ uri: event.imgSrc }}  style={styles.replyAvatar}/>
          <View>
            <Text style={styles.userName}>Organizer Name</Text>
            <Text style={styles.time}>Organizer Role</Text>
          </View>
        </View>
        <View>
          <Ionicons name="ellipsis-vertical" size={20} color="#888" />
        </View>
      </View>
      <Text style={[styles.smalltitle, { marginTop: 20 }]}>Event Description</Text>
      <Text style={styles.desc}>{event.description}</Text>
      {/* Event Image */}
      <Image source={{ uri: event.imgSrc }} style={styles.eventImage} />

      {/* Event Info */}
      <View style={styles.eventDetails}>
      <Text style={styles.smalltitle}>{event.title}</Text>
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
          <Animated.View style={{ transform: [{ scale: animations[event.id] || new Animated.Value(1) }], flexDirection: "row",
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

      {/* Comments Section */}
      <View style={styles.commentSection}>
        <Text style={styles.commentHeader}>Comments</Text>

        {comments.map((item) => (
          <View key={item.id} style={styles.commentCard}>
            <Image source={{ uri: item.userImg }} style={styles.avatar} />
            <View style={{ flex: 1 }}>
              <View style={styles.commentHeaderRow}>
                <Text style={styles.userName}>{item.userName}</Text>
                <Text style={styles.time}>{item.time}</Text>
              </View>
              <Text style={styles.commentText}>{item.comment}</Text>

              {/* Engagements */}
              <View style={styles.engagementRow}>
                <TouchableOpacity style={styles.engagementItem}>
                  <Ionicons name="heart-outline" size={18} color="#FF4D67" />
                  <Text style={styles.engagementText}>{item.likes}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.engagementItem}>
                  <Ionicons name="chatbubble-outline" size={18} color="#888" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.engagementItem}>
                  <Ionicons name="share-social-outline" size={18} color="#888" />
                </TouchableOpacity>
              </View>

              {/* Replies */}
              {item.replies.length > 0 && (
                <View style={styles.repliesContainer}>
                  {item.replies.map((reply) => (
                    <View key={reply.id} style={styles.replyCard}>
                      <Image
                        source={{ uri: reply.userImg }}
                        style={styles.replyAvatar}
                      />
                      <View style={{ flex: 1 }}>
                        <View style={styles.commentHeaderRow}>
                          <Text style={styles.userName}>{reply.userName}</Text>
                          <Text style={styles.time}>{reply.time}</Text>
                        </View>
                        <Text style={styles.commentText}>{reply.comment}</Text>

                        <View style={styles.engagementRow}>
                          <TouchableOpacity style={styles.engagementItem}>
                            <Ionicons
                              name="heart-outline"
                              size={16}
                              color="#FF4D67"
                            />
                            <Text style={styles.engagementText}>
                              {reply.likes}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingVertical: 50,  
    paddingHorizontal: 16,
  },
  eventImage: {
    width: "100%",
    height: 150,
    borderRadius: 16,
    // borderBottomRightRadius: 16,
    // marginTop: 100,  
  },
  eventDetails: {
    // padding: 16,
  },
  title: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 18,
    color: "#222",
    marginBottom: 6,
  },
  smalltitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#444",
    marginBottom: 6,
  },
  caption: {
    fontFamily: "Poppins_400Regular",
    color: "#555",
    fontSize: 12,
    marginBottom: 10,
  },
  desc: {
    fontFamily: "Poppins_400Regular",
    color: "#555",
    fontSize: 14,
    marginBottom: 10,
    marginTop: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  infoText: {
    fontFamily: "Poppins_400Regular",
    color: "#777",
  },
  price: {
    fontFamily: "Poppins_600SemiBold",
    color: "#FF4D67",
    marginTop: 10,
  },
  commentSection: {
    // paddingHorizontal: 16,
    paddingBottom: 30,
  },
  commentHeader: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    marginBottom: 12,
  },
  commentCard: {
    flexDirection: "row",
    marginBottom: 20,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
  },
  userName: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: "#333",
  },
  time: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "#999",
  },
  commentHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  commentText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: "#444",
    marginTop: 3,
  },
  engagementRow: {
    flexDirection: "row",
    marginTop: 6,
    gap: 14,
  },
  engagementItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  engagementText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "#777",
  },
  repliesContainer: {
    marginTop: 8,
    marginLeft: 40,
  },
  replyCard: {
    flexDirection: "row",
    marginBottom: 12,
  },
  replyAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
  avatarContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
    marginTop: 20, 
  },
  organizerName:
  {
    
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
    // marginBottom: 10,
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
