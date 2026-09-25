import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TreeSpecies } from '../types';
import { Colors, Radius, Typography, Spacing, Shadows } from '../theme';
import { TreeCanopyIcon } from './TreeIcons';

interface SpeciesCardProps {
  tree: TreeSpecies;
  onPress: () => void;
}

export const SpeciesCard: React.FC<SpeciesCardProps> = ({ tree, onPress }) => {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${tree.commonName}, ${tree.scientificName}`}
      style={[
        styles.card,
        {
          backgroundColor: isDark ? 'rgba(20, 28, 22, 0.85)' : 'rgba(255, 255, 255, 0.9)',
          borderColor: isDark ? 'rgba(46, 125, 50, 0.28)' : 'rgba(46, 125, 50, 0.14)',
          backdropFilter: 'blur(12px)',
        } as any,
        Shadows.card,
      ]}
      className="interactive-hover"
    >
      <View style={styles.thumbnailWrapper}>
        <Image
          source={{ uri: tree.sampleImages.leaf }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
        {tree.isWesternGhats && (
          <View style={styles.treeSymbolBadge}>
            <TreeCanopyIcon size={12} color="#FFFFFF" focused={true} />
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={[styles.commonName, { color: colors.text }]} numberOfLines={1}>
            {tree.commonName}
          </Text>
          {tree.isWesternGhats ? (
            <View
              style={[
                styles.miniChip,
                { backgroundColor: isDark ? '#143818' : colors.primaryLight },
              ]}
            >
              <Ionicons name="leaf" size={10} color={colors.primary} style={{ marginRight: 3 }} />
              <Text style={[styles.miniChipText, { color: colors.primary }]}>Ghats</Text>
            </View>
          ) : null}
        </View>

        <Text style={[styles.tamilName, { color: colors.primary }]} numberOfLines={1}>
          {tree.tamilName}
        </Text>

        <Text style={[styles.scientificName, { color: colors.muted }]} numberOfLines={1}>
          {tree.scientificName}
        </Text>

        <View style={styles.footerRow}>
          <View style={[styles.familyChip, { backgroundColor: isDark ? '#262925' : '#F0F4EF' }]}>
            <Text style={[styles.familyText, { color: colors.muted }]}>{tree.family}</Text>
          </View>

          <View style={styles.statsWrap}>
            <Ionicons
              name="images-outline"
              size={12}
              color={tree.isThin ? colors.accent : colors.muted}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.imagesCount,
                { color: tree.isThin ? colors.accent : colors.muted },
              ]}
            >
              {tree.fieldImagesCount} img
              {tree.isThin ? ' (thin)' : ''}
            </Text>
          </View>
        </View>
      </View>

      <View
        style={[
          styles.chevronWrap,
          { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(46, 125, 50, 0.06)' },
        ]}
      >
        <Ionicons name="chevron-forward" size={16} color={colors.primary} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.card,
    padding: Spacing.md,
    borderWidth: 1,
    minHeight: 90,
  },
  thumbnailWrapper: {
    position: 'relative',
    width: 76,
    height: 76,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: Radius.image,
    backgroundColor: '#E0E3DC',
  },
  treeSymbolBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    backgroundColor: '#1B5E20',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    marginLeft: Spacing.md,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 4,
  },
  commonName: {
    ...Typography.h3,
    flex: 1,
    fontSize: 15,
  },
  miniChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.chip,
    marginLeft: 6,
  },
  miniChipText: {
    ...Typography.captionBold,
    fontSize: 10,
  },
  tamilName: {
    ...Typography.captionBold,
    marginTop: 1,
    fontSize: 12,
  },
  scientificName: {
    ...Typography.caption,
    fontStyle: 'italic',
    marginTop: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  familyChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.chip,
    marginRight: 8,
  },
  familyText: {
    ...Typography.caption,
    fontSize: 11,
  },
  statsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imagesCount: {
    ...Typography.caption,
    fontSize: 11,
  },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
});
