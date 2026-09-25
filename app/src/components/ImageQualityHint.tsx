import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing } from '../theme';

interface ImageQualityHintProps {
  reason: string;
}

export const ImageQualityHint: React.FC<ImageQualityHintProps> = ({ reason }) => {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#361515' : colors.errorLight,
          borderColor: colors.error,
        },
      ]}
    >
      <Ionicons name="warning-outline" size={20} color={colors.error} style={styles.icon} />
      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: colors.error }]}>Quality Check Warning</Text>
        <Text style={[styles.desc, { color: isDark ? '#FFDAD6' : '#690005' }]}>{reason}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.card,
    borderWidth: 1,
    marginVertical: Spacing.sm,
  },
  icon: {
    marginRight: 10,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    ...Typography.bodyBold,
    marginBottom: 2,
  },
  desc: {
    ...Typography.caption,
    lineHeight: 16,
  },
});
