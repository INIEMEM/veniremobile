import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#5A31F4",
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
          tabBarIcon: ({ color }) => (
            <Ionicons name="ticket-outline" size={22} color={color} />
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
        name="Vendor"
        options={{
          tabBarIcon: ({ color }) => (
            <Ionicons name="storefront-outline" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
