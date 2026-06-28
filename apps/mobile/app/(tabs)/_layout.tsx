import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useUnreadCounts } from "@/lib/hooks";
import { palette } from "@/theme";

export default function TabsLayout() {
  const { data: unread } = useUnreadCounts();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.ink,
        tabBarInactiveTintColor: palette.textFaint,
        tabBarStyle: { borderTopColor: palette.border, height: 60, paddingBottom: 6, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Ahabanza",
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="umuryango"
        options={{
          title: "Umuryango",
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "people" : "people-outline"} size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="ikarita"
        options={{
          title: "Ikarita",
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "location" : "location-outline"} size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="ubutumwa"
        options={{
          title: "Ubutumwa",
          tabBarBadge: unread?.messages ? unread.messages : undefined,
          tabBarBadgeStyle: { backgroundColor: palette.orange, fontSize: 10 },
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "chatbubble" : "chatbubble-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="konti"
        options={{
          title: "Konti",
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
