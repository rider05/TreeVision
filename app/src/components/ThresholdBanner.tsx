import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing } from '../theme';

interface ThresholdBannerProps {
  needsMoreEvidence: boolean;
  message?: string;
}

export const ThresholdBanner: React.FC<ThresholdBannerProps> = ({
  needsMoreEvidence,
  message = 'Low confidence match (<60%). We recommend capturing a bark texture or whole canopy photo to confirm species identification.',
}) => {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  if (!needsMoreEvidence) return null;

  return (
    <View
      style={[
        styles.bannerContainer,
        {
          backgroundColor: isDark ? '#3D2A04' : colors.accentLight,
          borderColor: colors.accent,
        },
      ]}
    >
      <Ionicons
        name="alert-circle"
        size={22}
        color={colors.accent}
        style={styles.bannerIcon}
      />
      <View style={styles.textContainer}>
        <Text style={[styles.bannerTitle, { color: colors.accent }]}>
          Evidence Gate Threshold Triggered
        </Text>
        <Text style={[styles.bannerMessage, { color: isDark ? '#F5E4B5' : '#7A4800' }]}>
          {message}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderRadius: Radius.card,
    borderWidth: 1.5,
    marginVertical: Spacing.sm,
  },
  bannerIcon: {
    marginRight: 10,
    marginTop: 1,
  },
  textContainer: {
    flex: 1,
  },
  bannerTitle: {
    ...Typography.bodyBold,
    marginBottom: 3,
  },
  bannerMessage: {
    ...Typography.caption,
    lineHeight: 18,
  },
});
