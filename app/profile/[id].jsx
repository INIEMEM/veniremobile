import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { truncateText } from "../../utils/truncateText";
import ExploreEvents from "../../components/ExploreEvents";

export default function ProfilePage() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [activeTab, setActiveTab] = useState("events");

  const user = {
    id: id,
    name: "Aniekan Augustin",
    email: "anuieq@gmail.com",
    bio: "Your event isn’t complete without our cakes ✨ Freshly baked, beautifully designed, and made with love ❤️",
    avatar:
      "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=800",
    banner:
      "https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=1200",
    role: "Vendor",
    company: "BIOKRIPT × Microsoft",
    followers: 24000,
    following: 766,
    dob: "Oct 16, 2007",
    gender: "Female",
    joined: "April 14, 2024",
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header with banner */}
      <View style={styles.header}>
        <Image source={{ uri: user.banner }} style={styles.banner} />
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Profile Section */}
      <View style={styles.profileSection}>
        <View style={styles.profileEdit}>
          <Image source={{ uri: user.avatar }} style={styles.avatar} />
          <View>
            
            <Text style={{fontFamily: "Poppins_500Medium",color: '#555'}}>
            <Ionicons name="pencil-outline" size={14} color="#555" />
            Edit Profile</Text></View>
        </View>
        <View style={styles.profileEdit}>
          <View style={styles.emailName}>
            <View>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.email}>{user.email}</Text>
            </View>
            <Text style={styles.vendorTag}>{user.role}</Text>
          </View>
          <View>
            <Ionicons name="ellipsis-vertical" size={20} color="#444" />
          </View>
        </View>
        <Text style={styles.bio}>{user.bio}</Text>

        {/* Stats Row */}
        

        {/* Personal Info */}
        <View style={styles.statsRow}>
        <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color="#777" />
            <Text style={styles.infoText}>Akwa Ibom</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color="#777" />
            <Text style={[styles.infoText, ]}>DOB: {user.dob}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="female-outline" size={16} color="#777" />
            <Text style={styles.infoText}>{user.gender}</Text>
          </View>
         
        </View>
        <View style={styles.statsRow}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color="#777" />
            <Text style={[styles.infoText, {color: "#5A31F4"}]}>{truncateText("https://www.figma.com/proto/wVFDSriFrSv0CbmE7fm5Bb/Vinire-Event-App?node-id=4523-11670&starting-point-node-id=4301%3A8829", 15)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="female-outline" size={16} color="#777" />
            <Text style={styles.infoText}>{user.gender}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color="#777" />
            <Text style={styles.infoText}>Joined {user.joined}</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statText}>{user.following} Following</Text>
          <View style={styles.dot} />
          <Text style={styles.statText}>{user.followers} Followers</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {[
          { key: "events", label: "My Events" },
          { key: "comments", label: "Comments" },
          { key: "bookmarks", label: "Bookmarks" },
          { key: "wallet", label: "Wallet" },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabButton,
              activeTab === tab.key && styles.activeTabButton,
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text
              style={[
                styles.tabLabel,
                activeTab === tab.key && styles.activeTabLabel,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {activeTab === "events" && (
          <View>
            <Text style={styles.sectionTitle}>My Events</Text>
            <Text style={styles.sectionText}>
              <ExploreEvents/>
            </Text>
          </View>
        )}
        {activeTab === "comments" && (
          <View>
            <Text style={styles.sectionTitle}>My Comments</Text>
            <Text style={styles.sectionText}>
              💬 You have commented on 12 events.
            </Text>
          </View>
        )}
        {activeTab === "bookmarks" && (
          <View>
            <Text style={styles.sectionTitle}>My Bookmarks</Text>
            <Text style={styles.sectionText}>
              🔖 Your saved events will appear here.
            </Text>
          </View>
        )}
        {activeTab === "wallet" && (
          <View>
            <Text style={styles.sectionTitle}>Wallet</Text>
            <Text style={styles.sectionText}>
              💰 Balance: ₦42,000 — Manage transactions and withdrawals.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#fff", flex: 1 },
  header: { position: "relative" },
  banner: { width: "100%", height: 150 },
  backBtn: { position: "absolute", top: 40, left: 15 },
  profileSection: { padding: 16, marginTop: -40 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: "#fff",
  },
  name: { fontSize: 18, fontWeight: "700", marginTop: 8,fontFamily: "Poppins_600SemiBold",color: '#333' },
  email: { color: "#666", fontSize: 13, fontFamily: "Poppins_400Regular",color: '#555' },
  vendorTag: {
    backgroundColor: "#FAB843",
    color: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 64,
    marginTop: 6,
    fontSize: 12,
  },
  bio: {
    // textAlign: "center",
    marginVertical: 10,
    color: "#555",
    fontSize: 13,
    lineHeight: 18,
    // paddingHorizontal: 15,
    fontFamily: "Poppins_300Light",
  },
  statsRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  dot: {
    width: 4,
    height: 4,
    backgroundColor: "#aaa",
    borderRadius: 2,
    marginHorizontal: 6,
  },
  statText: { fontSize: 12, color: "#777",

    fontFamily: "Poppins_400Regular",
   },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 8,
  },
   
    infoText: { color: "#555", fontSize: 12,  
      fontFamily: "Poppins_300Light",
    },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    marginTop: 20,
  },
  tabButton: {
    paddingVertical: 10,
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: "#5A31F4",
  },
  tabLabel: {
    color: "#777",
    fontSize: 13,
    fontWeight: "500",
  },
  activeTabLabel: {
    color: "#5A31F4",
    fontWeight: "700",
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
    marginBottom: 6,
  },
  sectionText: { color: "#555", fontSize: 13, lineHeight: 20 },
  profileEdit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    fontFamily: "Poppins_500Medium",
  },
  emailName:{
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  }
});
