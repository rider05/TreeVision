import React from 'react';
import { View, Text, StyleSheet, useColorScheme, Platform, StatusBar } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../theme';
import { TreeCanopyIcon } from './TreeIcons';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  showTreeEmblem?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  right,
  showTreeEmblem = true,
}) => {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <View
      style={[
        styles.headerContainer,
        {
          backgroundColor: isDark ? 'rgba(18, 26, 20, 0.85)' : 'rgba(255, 255, 255, 0.88)',
          borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(46, 125, 50, 0.14)',
          backdropFilter: 'blur(16px)',
        } as any,
      ]}
    >
      <View style={styles.titleArea}>
        <View style={styles.titleRow}>
          {showTreeEmblem && (
            <View style={{ marginRight: 10 }}>
              <View
                style={[
                  styles.treeEmblemCircle,
                  { backgroundColor: isDark ? '#143818' : colors.primaryLight },
                ]}
              >
                <TreeCanopyIcon size={18} color={colors.primary} focused={true} />
              </View>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <View style={styles.subtitleRow}>
                <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.primary, marginRight: 6 }} />
                <Text style={[styles.subtitle, { color: colors.muted }]} numberOfLines={1}>
                  {subtitle}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
      {right ? <View style={styles.rightArea}>{right}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Platform.OS === 'ios' ? 14 : (StatusBar.currentHeight ? StatusBar.currentHeight + 8 : 16),
    paddingBottom: 14,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  titleArea: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  treeEmblemCircle: {
    width: 32,
    height: 32,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.h2,
    fontSize: 20,
    letterSpacing: -0.3,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  subtitle: {
    ...Typography.captionBold,
    fontSize: 11,
    letterSpacing: 0.2,
  },
  rightArea: {
    marginLeft: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
