import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Prediction } from '../types';
import { Colors, Radius, Typography, Spacing, Shadows } from '../theme';
import { ConfidenceBadge } from './ConfidenceBadge';
import { ThresholdBanner } from './ThresholdBanner';
import { getTree } from '../services/inference';
import { TreeCanopyIcon } from './TreeIcons';

interface ResultCardProps {
  prediction: Prediction;
  onSpeciesPress: (id: string) => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({ prediction, onSpeciesPress }) => {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const [showGradCam, setShowGradCam] = useState<boolean>(false);
  const treeInfo = getTree(prediction.speciesId);

  return (
    <View style={styles.container}>
      {/* Hero Image Block with Grad-CAM Explainability Toggle */}
      <View style={[styles.heroWrap, Shadows.cardHover]}>
        <Image
          source={{ uri: prediction.imageUri }}
          style={styles.heroImage}
          resizeMode="cover"
        />

        {showGradCam ? (
          <View style={styles.gradCamOverlay}>
            <View style={styles.heatmapRadial} />
            <View style={styles.gradCamBadge}>
              <Ionicons name="eye" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.gradCamBadgeText}>Grad-CAM: Venation Attention Map</Text>
            </View>
          </View>
        ) : null}

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setShowGradCam(!showGradCam)}
          style={[
            styles.gradCamToggle,
            {
              backgroundColor: showGradCam ? colors.accent : 'rgba(0, 0, 0, 0.72)',
            },
          ]}
          className="shimmer-button"
        >
          <Ionicons
            name={showGradCam ? 'color-wand' : 'color-wand-outline'}
            size={16}
            color="#FFFFFF"
            style={{ marginRight: 6 }}
          />
          <Text style={styles.gradCamToggleText}>
            {showGradCam ? 'Grad-CAM Active' : 'Explain (Grad-CAM)'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Block 1: Top Prediction details with Tree Emblem */}
      <View
        style={[
          styles.cardBlock,
          {
            backgroundColor: isDark ? 'rgba(20, 28, 22, 0.88)' : 'rgba(255, 255, 255, 0.92)',
            borderColor: isDark ? 'rgba(46, 125, 50, 0.3)' : 'rgba(46, 125, 50, 0.16)',
            backdropFilter: 'blur(16px)',
          } as any,
          Shadows.card,
        ]}
      >
        <View style={styles.primaryHeaderRow}>
          <View style={styles.titleWithEmblem}>
            <View
              style={[
                styles.treeInsigniaBox,
                { backgroundColor: isDark ? '#143818' : colors.primaryLight },
              ]}
            >
              <TreeCanopyIcon size={22} color={colors.primary} focused={true} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.commonName, { color: colors.text }]}>
                {prediction.commonName}
              </Text>
              <Text style={[styles.tamilName, { color: colors.primary }]}>
                {prediction.tamilName}
              </Text>
              <Text style={[styles.scientificName, { color: colors.muted }]}>
                {prediction.scientificName}
              </Text>
            </View>
          </View>
          <ConfidenceBadge value={prediction.confidence} size="lg" />
        </View>

        {/* Engine and Latency stamp */}
        <View style={[styles.engineRow, { borderTopColor: colors.border }]}>
          <Ionicons name="hardware-chip-outline" size={14} color={colors.primary} />
          <Text style={[styles.monoText, { color: colors.muted }]}>
            {prediction.engine} • {prediction.latencyMs}ms latency
          </Text>
        </View>
      </View>

      {/* Block 2: Threshold Gate Banner (if low confidence) */}
      <ThresholdBanner needsMoreEvidence={prediction.needsMoreEvidence} />

      {/* Block 3: Top Alternatives List with Hover Lift */}
      <View
        style={[
          styles.cardBlock,
          {
            backgroundColor: isDark ? 'rgba(20, 28, 22, 0.85)' : 'rgba(255, 255, 255, 0.9)',
            borderColor: isDark ? 'rgba(46, 125, 50, 0.28)' : 'rgba(46, 125, 50, 0.14)',
            backdropFilter: 'blur(14px)',
          } as any,
          Shadows.card,
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Candidate Alternatives
        </Text>
        <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
          Secondary model predictions ranked by softmax probability
        </Text>

        {prediction.alternatives.map((alt, index) => {
          const altPercent = (alt.confidence * 100).toFixed(1);
          return (
            <TouchableOpacity
              key={alt.speciesId}
              activeOpacity={0.75}
              onPress={() => onSpeciesPress(alt.speciesId)}
              style={[
                styles.altRow,
                index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
              ]}
              className="interactive-hover"
            >
              <View style={styles.altInfo}>
                <View style={styles.altTitleRow}>
                  <Text style={[styles.altCommonName, { color: colors.text }]}>
                    {alt.commonName}
                  </Text>
                  <Text style={[styles.altPercentage, { color: colors.muted }]}>
                    {altPercent}%
                  </Text>
                </View>
                <Text style={[styles.altScientific, { color: colors.muted }]}>
                  {alt.scientificName}
                </Text>

                {/* Progress bar with glow */}
                <View style={[styles.progressBarBg, { backgroundColor: isDark ? '#2E322D' : '#E6E9E3' }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(100, Math.max(5, alt.confidence * 100))}%`,
                        backgroundColor: colors.primary,
                      },
                    ]}
                  />
                </View>
              </View>

              <Ionicons name="chevron-forward" size={16} color={colors.primary} style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Block 4: Botanical Info Chips */}
      {treeInfo ? (
        <View
          style={[
            styles.cardBlock,
            {
              backgroundColor: isDark ? 'rgba(20, 28, 22, 0.85)' : 'rgba(255, 255, 255, 0.9)',
              borderColor: isDark ? 'rgba(46, 125, 50, 0.28)' : 'rgba(46, 125, 50, 0.14)',
              backdropFilter: 'blur(14px)',
            } as any,
            Shadows.card,
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Field Botanical Context
          </Text>
          <View style={styles.chipsWrap}>
            <View style={[styles.chip, { backgroundColor: isDark ? '#252924' : colors.primaryLight }]}>
              <Ionicons name="flower-outline" size={13} color={colors.primary} style={styles.chipIcon} />
              <Text style={[styles.chipText, { color: colors.primary }]}>{treeInfo.family}</Text>
            </View>

            <View style={[styles.chip, { backgroundColor: isDark ? '#252924' : '#F1F3EE' }]}>
              <Ionicons name="location-outline" size={13} color={colors.muted} style={styles.chipIcon} />
              <Text style={[styles.chipText, { color: colors.muted }]}>{treeInfo.region}</Text>
            </View>

            <View style={[styles.chip, { backgroundColor: isDark ? '#252924' : '#F1F3EE' }]}>
              <Ionicons name="images-outline" size={13} color={colors.muted} style={styles.chipIcon} />
              <Text style={[styles.chipText, { color: colors.muted }]}>
                {treeInfo.fieldImagesCount} Field Images
              </Text>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  heroWrap: {
    height: 250,
    borderRadius: Radius.card,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(46, 125, 50, 0.25)',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333333',
  },
  gradCamOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255, 60, 0, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heatmapRadial: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 235, 59, 0.45)',
    borderWidth: 2,
    borderColor: 'rgba(255, 143, 0, 0.8)',
  },
  gradCamBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.chip,
  },
  gradCamBadgeText: {
    ...Typography.captionBold,
    color: '#FFFFFF',
    fontSize: 11,
  },
  gradCamToggle: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.chip,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  gradCamToggleText: {
    ...Typography.captionBold,
    color: '#FFFFFF',
    fontSize: 12,
  },
  cardBlock: {
    borderRadius: Radius.card,
    padding: Spacing.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  primaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  titleWithEmblem: {
    flexDirection: 'row',
    flex: 1,
    marginRight: Spacing.sm,
  },
  treeInsigniaBox: {
    width: 38,
    height: 38,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  commonName: {
    ...Typography.h2,
    fontSize: 20,
  },
  tamilName: {
    ...Typography.bodyBold,
    marginTop: 2,
    fontSize: 13,
  },
  scientificName: {
    ...Typography.body,
    fontStyle: 'italic',
    marginTop: 2,
  },
  engineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  monoText: {
    ...Typography.mono,
    marginLeft: 6,
    fontSize: 11,
  },
  sectionTitle: {
    ...Typography.h3,
    marginBottom: 2,
    fontSize: 15,
  },
  sectionSubtitle: {
    ...Typography.caption,
    marginBottom: Spacing.md,
  },
  altRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: Radius.button,
  },
  altInfo: {
    flex: 1,
  },
  altTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  altCommonName: {
    ...Typography.bodyBold,
  },
  altPercentage: {
    ...Typography.captionBold,
  },
  altScientific: {
    ...Typography.caption,
    fontStyle: 'italic',
    marginTop: 1,
    marginBottom: 5,
  },
  progressBarBg: {
    height: 4,
    borderRadius: 2,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.sm,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.chip,
  },
  chipIcon: {
    marginRight: 5,
  },
  chipText: {
    ...Typography.captionBold,
  },
});
