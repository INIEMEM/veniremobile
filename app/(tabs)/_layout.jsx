import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, StyleSheet, Pressable, DeviceEventEmitter } from "react-native";
import React, { useState, useEffect } from "react";

export default function TabLayout() {
  const [activeTab, setActiveTab] = useState("events");
  const router = useRouter();

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('homeTabChanged', (tab) => {
      setActiveTab(tab);
    });
    return () => sub.remove();
  }, []);

  const handlePlusPress = () => {
    if (activeTab === "events") {
      router.push("/events/create");
    } else {
      DeviceEventEmitter.emit('openCreatePlaceModal');
    }
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#5A31F4",
        tabBarLabelStyle: {
          fontFamily: "Poppins_500Medium",
          fontSize: 10,
        },
      }}
    >
      <Tabs.Screen
        name="Home"
        options={{
          tabBarIcon: ({ color }) => (
            <Ionicons name="home-outline" size={22} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="Events/index"
        options={{
          title: "Events",
          tabBarIcon: ({ color }) => (
            <Ionicons name="calendar-outline" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="Events/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="Tickets"
        options={{
          title: "",
          tabBarIcon: () => (
            <Pressable onPress={handlePlusPress} style={styles.createButtonContainer}>
              <View style={[styles.createButton, { backgroundColor: activeTab === 'events' ? '#FAB843' : '#5A31F4', shadowColor: activeTab === 'events' ? '#FAB843' : '#5A31F4', borderColor: '#FFF' }]}>
                <Ionicons name="add" size={28} color="#FFF" />
              </View>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="Notifications"
        options={{
          tabBarIcon: ({ color }) => (
            <Ionicons name="notifications-outline" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="Vendor/index"
        options={{
          title: "Vendor",
          tabBarIcon: ({ color }) => (
            <Ionicons name="storefront-outline" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="Vendor/register"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="Vendor/testresgister"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="Vendor/marketplace"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="Vendor/[vendorId]"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  createButtonContainer: {
    top: -10,
    justifyContent: "center",
    alignItems: "center",
  },
  createButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 8,
    borderWidth: 3,
  },
});