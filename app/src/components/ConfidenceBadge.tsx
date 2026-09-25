import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { Colors, Radius, Typography } from '../theme';

interface ConfidenceBadgeProps {
  value: number; // 0.0 to 1.0
  size?: 'sm' | 'md' | 'lg';
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ value, size = 'md' }) => {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const percentage = Math.round(value * 1000) / 10; // e.g. 91.2%
  const formattedText = `${percentage.toFixed(1)}%`;

  // Color logic per app-design.md §4.1: >=0.8 success, 0.6-0.8 muted, <0.6 amber
  let badgeBg: string;
  let textColor: string;
  let labelTag = 'Confidence';

  if (value >= 0.8) {
    badgeBg = isDark ? '#143818' : colors.primaryLight;
    textColor = colors.success;
    labelTag = 'High Match';
  } else if (value >= 0.6) {
    badgeBg = isDark ? '#262925' : '#EAECE8';
    textColor = colors.muted;
    labelTag = 'Moderate';
  } else {
    badgeBg = isDark ? '#3D2800' : colors.accentLight;
    textColor = colors.accent;
    labelTag = 'Low Confidence';
  }

  const isSmall = size === 'sm';
  const isLarge = size === 'lg';

  return (
    <View
      accessible={true}
      accessibilityLabel={`${formattedText} confidence rating (${labelTag})`}
      style={[
        styles.badgeContainer,
        {
          backgroundColor: badgeBg,
          paddingVertical: isSmall ? 3 : isLarge ? 8 : 5,
          paddingHorizontal: isSmall ? 8 : isLarge ? 14 : 10,
        },
      ]}
    >
      <View style={[styles.dotIndicator, { backgroundColor: textColor }]} />
      <Text
        style={[
          isSmall ? Typography.captionBold : isLarge ? Typography.h3 : Typography.bodyBold,
          { color: textColor },
        ]}
      >
        {formattedText}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.chip,
    alignSelf: 'flex-start',
  },
  dotIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
});
