import React from 'react';
import { Tabs } from 'expo-router';
import { useColorScheme, Platform, StyleSheet, View } from 'react-native';
import { Colors, Typography, Radius } from '../../theme';
import {
  TreeCanopyIcon,
  TreeScanIcon,
  ForestGroveIcon,
  TreeMapPinIcon,
  TreeLogbookIcon,
} from '../../components/TreeIcons';

export default function TabLayout() {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: isDark ? '#7E8B80' : '#6B7A6E',
        tabBarStyle: {
          backgroundColor: isDark ? 'rgba(15, 23, 17, 0.92)' : 'rgba(255, 255, 255, 0.92)',
          borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(46, 125, 50, 0.15)',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 90 : 70,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
          elevation: 12,
          shadowColor: '#1B5E20',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          backdropFilter: 'blur(16px)',
        } as any,
        tabBarLabelStyle: {
          ...Typography.captionBold,
          fontSize: 11,
          marginTop: 2,
          letterSpacing: 0.2,
        },
      }}
    >
      {/* 1. Home — Tree Canopy Symbol */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: 'TreeVision',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
              <TreeCanopyIcon size={24} color={focused ? colors.primary : color} focused={focused} />
              {focused && <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />}
            </View>
          ),
        }}
      />

      {/* 2. Identify — Tree Scan Symbol */}
      <Tabs.Screen
        name="identify"
        options={{
          title: 'Identify',
          tabBarLabel: 'Identify',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
              <TreeScanIcon size={24} color={focused ? colors.primary : color} focused={focused} />
              {focused && <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />}
            </View>
          ),
        }}
      />

      {/* 3. Library — Forest Grove Symbol */}
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarLabel: 'Tree Atlas',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
              <ForestGroveIcon size={24} color={focused ? colors.primary : color} focused={focused} />
              {focused && <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />}
            </View>
          ),
        }}
      />

      {/* 4. Map — Tree Map Marker Symbol */}
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarLabel: 'Eco Map',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
              <TreeMapPinIcon size={24} color={focused ? colors.primary : color} focused={focused} />
              {focused && <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />}
            </View>
          ),
        }}
      />

      {/* 5. Observations — Tree Logbook Symbol */}
      <Tabs.Screen
        name="observations"
        options={{
          title: 'Observations',
          tabBarLabel: 'Field Log',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
              <TreeLogbookIcon size={24} color={focused ? colors.primary : color} focused={focused} />
              {focused && <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: Radius.chip,
    position: 'relative',
  },
  iconWrapperActive: {
    transform: [{ scale: 1.05 }],
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
});
