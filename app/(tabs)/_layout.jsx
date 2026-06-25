import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, StyleSheet, Pressable } from "react-native";
import { Link } from "expo-router";

export default function TabLayout() {
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
          href: null, // 🚫 This line hides it from the tab bar
        }}
      />
      <Tabs.Screen
        name="Tickets"
        options={{
          title: "",
          tabBarIcon: () => (
            <Link href="/events/create" asChild>
              <Pressable style={styles.createButtonContainer}>
                <View style={styles.createButton}>
                  <Ionicons name="add" size={28} color="#FFF" />
                </View>
              </Pressable>
            </Link>
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
          href: null, // 🚫 This line hides it from the tab bar
        }}
      />
      <Tabs.Screen
        name="Vendor/testresgister"
        options={{
          href: null, // 🚫 This line hides it from the tab bar
        }}
      />
      <Tabs.Screen
        name="Vendor/marketplace"
        options={{
          href: null, // 🚫 Hidden from tab bar
        }}
      />
      <Tabs.Screen
        name="Vendor/[vendorId]"
        options={{
          href: null, // 🚫 Hidden from tab bar
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
    backgroundColor: "#FAB843",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FAB843",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 8,
    borderWidth: 3,
    borderColor: "#FFF",
  },
});