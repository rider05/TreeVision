import React from 'react';
import { View, StyleSheet, Platform, useColorScheme } from 'react-native';

export const AnimatedBackground: React.FC = () => {
  const isDark = useColorScheme() === 'dark';

  if (Platform.OS === 'web') {
    return (
      <View pointerEvents="none" style={styles.webContainer}>
        {/* Living Ambient Gradients */}
        <div className="animated-botanical-bg">
          <div className="ambient-orb orb-1" />
          <div className="ambient-orb orb-2" />
          <div className="ambient-orb orb-3" />

          {/* Drifting Botanical Foliage Particles */}
          <div className="particle-leaf" style={{ left: '12%', animationDuration: '19s', animationDelay: '0s' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C7 2 3 7 3 13C3 18.5 7.5 21 12 22C16.5 21 21 18.5 21 13C21 7 17 2 12 2Z" fill="#10B981" opacity="0.6" />
              <path d="M12 22V6" stroke="#047857" strokeWidth="1.2" />
            </svg>
          </div>

          <div className="particle-leaf" style={{ left: '38%', animationDuration: '24s', animationDelay: '-6s' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 3C8 6 5 10 5 15C5 19 8.5 21 12 21C15.5 21 19 19 19 15C19 10 16 6 12 3Z" fill="#F59E0B" opacity="0.45" />
            </svg>
          </div>

          <div className="particle-leaf" style={{ left: '68%', animationDuration: '21s', animationDelay: '-11s' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C7 2 3 7 3 13C3 18.5 7.5 21 12 22C16.5 21 21 18.5 21 13C21 7 17 2 12 2Z" fill="#34D399" opacity="0.5" />
              <path d="M12 22V6" stroke="#065F46" strokeWidth="1.2" />
            </svg>
          </div>

          <div className="particle-leaf" style={{ left: '88%', animationDuration: '26s', animationDelay: '-3s' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C7 2 3 7 3 13C3 18.5 7.5 21 12 22C16.5 21 21 18.5 21 13C21 7 17 2 12 2Z" fill="#10B981" opacity="0.5" />
            </svg>
          </div>
        </div>
      </View>
    );
  }

  // Native Mobile Fallback (soft radial orbs)
  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: isDark ? '#0F1610' : '#F4F7F3',
          zIndex: -1,
        },
      ]}
    >
      <View
        style={[
          styles.nativeOrb,
          {
            backgroundColor: isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(46, 125, 50, 0.12)',
            top: -80,
            left: -80,
            width: 300,
            height: 300,
          },
        ]}
      />
      <View
        style={[
          styles.nativeOrb,
          {
            backgroundColor: isDark ? 'rgba(245, 158, 11, 0.06)' : 'rgba(245, 158, 11, 0.1)',
            bottom: 50,
            right: -60,
            width: 260,
            height: 260,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  webContainer: {
    ...StyleSheet.absoluteFill,
    zIndex: -1,
    overflow: 'hidden',
  },
  nativeOrb: {
    position: 'absolute',
    borderRadius: 999,
  },
});
