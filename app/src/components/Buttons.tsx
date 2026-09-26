import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  useColorScheme,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Shadows } from '../theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const PrimaryButton: React.FC<ButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
}) => {
  const isDark = useColorScheme() === 'dark';

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      activeOpacity={0.85}
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.baseButton,
        {
          backgroundColor: isDisabled
            ? (isDark ? '#2A302A' : '#D1D5DB')
            : isDark
            ? '#2E7D32'
            : '#1B5E20',
          borderColor: isDark ? 'rgba(76, 175, 80, 0.4)' : 'rgba(255, 255, 255, 0.25)',
          borderWidth: 1,
        },
        !isDisabled && Shadows.cardHover,
        style,
      ]}
      className="shimmer-button interactive-hover"
    >
      {loading ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <View style={styles.contentRow}>
          {icon ? (
            <Ionicons
              name={icon}
              size={18}
              color={isDisabled ? (isDark ? '#6B7280' : '#8E918A') : '#FFFFFF'}
              style={styles.iconStyle}
            />
          ) : null}
          <Text
            style={[
              styles.buttonText,
              { color: isDisabled ? (isDark ? '#6B7280' : '#8E918A') : '#FFFFFF' },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export const SecondaryButton: React.FC<ButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
}) => {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      activeOpacity={0.8}
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.baseButton,
        {
          backgroundColor: isDark ? 'rgba(30, 40, 32, 0.85)' : 'rgba(255, 255, 255, 0.9)',
          borderWidth: 1.5,
          borderColor: isDisabled ? colors.border : colors.primary,
          backdropFilter: 'blur(8px)',
        } as any,
        style,
      ]}
      className="interactive-hover"
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <View style={styles.contentRow}>
          {icon ? (
            <Ionicons
              name={icon}
              size={18}
              color={isDisabled ? colors.muted : colors.primary}
              style={styles.iconStyle}
            />
          ) : null}
          <Text
            style={[
              styles.buttonText,
              { color: isDisabled ? colors.muted : colors.primary },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export const GhostButton: React.FC<ButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
}) => {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.ghostButton, style]}
      className="interactive-hover"
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <View style={styles.contentRow}>
          {icon ? (
            <Ionicons name={icon} size={16} color={colors.muted} style={styles.iconStyle} />
          ) : null}
          <Text style={[styles.ghostText, { color: colors.muted }, textStyle]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  baseButton: {
    minHeight: 48,
    paddingVertical: 13,
    paddingHorizontal: 22,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconStyle: {
    marginRight: 8,
  },
  buttonText: {
    ...Typography.bodyBold,
    letterSpacing: 0.3,
  },
  ghostButton: {
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.button,
  },
  ghostText: {
    ...Typography.bodyBold,
    fontSize: 13,
  },
});
