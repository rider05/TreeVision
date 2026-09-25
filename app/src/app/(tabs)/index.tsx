import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Radius, Typography, Spacing, Shadows } from '../../theme';
import { getAllTrees, SAMPLE_TEST_LEAVES } from '../../services/inference';
import {
  BanyanBrandEmblem,
  TreeCanopyIcon,
  TreeScanIcon,
  ForestGroveIcon,
  TreeMapPinIcon,
  TreeLogbookIcon,
} from '../../components/TreeIcons';

export default function HomeScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const trees = getAllTrees();
  const ghatsTreesCount = trees.filter((t) => t.isWesternGhats).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ✨ Glassmorphic Hero Banner */}
        <View
          style={[
            styles.heroGlassPanel,
            {
              backgroundColor: isDark ? 'rgba(16, 26, 18, 0.82)' : 'rgba(255, 255, 255, 0.86)',
              borderColor: isDark ? 'rgba(46, 125, 50, 0.3)' : 'rgba(46, 125, 50, 0.16)',
            },
            Shadows.cardHover,
          ]}
        >
          {/* Top Brand Bar */}
          <View style={styles.heroTopRow}>
            <div className="tree-menu-symbol" style={{ cursor: 'pointer' }}>
              <BanyanBrandEmblem size={48} />
            </div>

            <View style={styles.heroBrandText}>
              <View style={styles.wordmarkRow}>
                <Text style={[styles.wordmark, { color: colors.text }]}>TreeVision</Text>
                <View
                  style={[
                    styles.tagBadge,
                    { backgroundColor: isDark ? '#143818' : colors.primaryLight },
                  ]}
                >
                  <Text style={[styles.tagBadgeText, { color: colors.primary }]}>AI 2.0</Text>
                </View>
              </View>

              <Text style={[styles.tagline, { color: colors.muted }]}>
                Coimbatore & Western Ghats • Offline Neural ID
              </Text>
            </View>

            {/* Live Status Pulse */}
            <View
              style={[
                styles.liveStatusPill,
                { backgroundColor: isDark ? '#102A14' : '#E8F5E9' },
              ]}
            >
              <div className="pulse-beacon" style={{ marginRight: 6 }} />
              <Text style={[styles.liveStatusText, { color: colors.primary }]}>READY</Text>
            </View>
          </View>

          {/* Botanical Mission Statement */}
          <Text style={[styles.heroDescription, { color: isDark ? '#D1DCD2' : '#2D3B2F' }]}>
            Identify native flora in the field without internet. Powered by on-device LiteRT neural models, Grad-CAM venation maps, and traditional Tamil botanical heritage.
          </Text>

          {/* Quick Metrics Bar */}
          <View
            style={[
              styles.metricsBar,
              {
                backgroundColor: isDark ? 'rgba(0, 0, 0, 0.25)' : 'rgba(232, 245, 233, 0.55)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(46, 125, 50, 0.1)',
              },
            ]}
          >
            <View style={styles.metricItem}>
              <Text style={[styles.metricVal, { color: colors.primary }]}>50</Text>
              <Text style={[styles.metricLabel, { color: colors.muted }]}>Species</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricVal, { color: colors.primary }]}>{ghatsTreesCount}</Text>
              <Text style={[styles.metricLabel, { color: colors.muted }]}>Ghats Endemic</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricVal, { color: colors.accent }]}>&lt;200ms</Text>
              <Text style={[styles.metricLabel, { color: colors.muted }]}>LiteRT Speed</Text>
            </View>
          </View>
        </View>

        {/* 🌟 Primary Interactive Action Cards with Hover Lift */}
        <View style={styles.primaryCardsSection}>
          {/* Card 1: Identify a Tree */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => router.push('/identify')}
            style={[styles.primaryActionCard, Shadows.cardHover]}
            className="interactive-hover shimmer-button"
          >
            {/* Background Decorative Tree Glow */}
            <View style={styles.cardWatermark}>
              <TreeCanopyIcon size={120} color="rgba(255, 255, 255, 0.12)" />
            </View>

            <View style={styles.cardHeaderRow}>
              <View style={styles.actionIconPill}>
                <TreeScanIcon size={26} color="#FFFFFF" focused={true} />
              </View>
              <View style={styles.arrowPill}>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </View>
            </View>

            <View style={styles.cardTextContent}>
              <Text style={styles.primaryCardTitle}>Identify a Tree</Text>
              <Text style={styles.primaryCardSubtitle}>
                Snap or upload a leaf photo. Instant offline LiteRT neural classification with Grad-CAM venation maps.
              </Text>
            </View>
          </TouchableOpacity>

          {/* Card 2: Tree Library */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => router.push('/library')}
            style={[
              styles.secondaryActionCard,
              {
                backgroundColor: isDark ? 'rgba(20, 28, 22, 0.85)' : 'rgba(255, 255, 255, 0.9)',
                borderColor: isDark ? 'rgba(46, 125, 50, 0.3)' : 'rgba(46, 125, 50, 0.18)',
              },
              Shadows.card,
            ]}
            className="interactive-hover"
          >
            <View style={styles.cardHeaderRow}>
              <View
                style={[
                  styles.secondaryIconPill,
                  { backgroundColor: isDark ? '#143818' : colors.primaryLight },
                ]}
              >
                <ForestGroveIcon size={26} color={colors.primary} focused={true} />
              </View>
              <View
                style={[
                  styles.arrowOutlinePill,
                  { borderColor: colors.border },
                ]}
              >
                <Ionicons name="chevron-forward" size={16} color={colors.primary} />
              </View>
            </View>

            <View style={styles.cardTextContent}>
              <View style={styles.speciesCountBadgeRow}>
                <Text style={[styles.secondaryCardTitle, { color: colors.text }]}>
                  Botanical Tree Atlas
                </Text>
                <View
                  style={[
                    styles.countPill,
                    { backgroundColor: isDark ? '#143818' : colors.primaryLight },
                  ]}
                >
                  <Text style={[styles.countPillText, { color: colors.primary }]}>50 Species</Text>
                </View>
              </View>
              <Text style={[styles.secondaryCardSubtitle, { color: colors.muted }]}>
                Complete local taxonomy: Tamil names, bark, leaf morphology, traditional uses & IUCN status.
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 🍃 Quick Demo Leaf Specimen Carousel */}
        <View style={styles.quickSpecimensSection}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWithIcon}>
              <Ionicons name="leaf" size={18} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.sectionHeading, { color: colors.text }]}>
                Coimbatore Leaf Specimens
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/identify')}>
              <Text style={[styles.viewAllText, { color: colors.primary }]}>Try Scan →</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.specimensScroll}
          >
            {SAMPLE_TEST_LEAVES.map((sample) => (
              <TouchableOpacity
                key={sample.speciesId}
                activeOpacity={0.85}
                onPress={() => router.push('/identify')}
                style={[
                  styles.specimenCard,
                  {
                    backgroundColor: isDark ? 'rgba(20, 28, 22, 0.85)' : 'rgba(255, 255, 255, 0.9)',
                    borderColor: isDark ? 'rgba(46, 125, 50, 0.25)' : 'rgba(46, 125, 50, 0.12)',
                  },
                  Shadows.card,
                ]}
                className="interactive-hover"
              >
                <Image source={{ uri: sample.image }} style={styles.specimenThumb} resizeMode="cover" />
                <View style={styles.specimenBadge}>
                  <Text style={styles.specimenBadgeText}>Sample</Text>
                </View>
                <Text style={[styles.specimenName, { color: colors.text }]} numberOfLines={1}>
                  {sample.name}
                </Text>
                <Text style={[styles.specimenDesc, { color: colors.muted }]} numberOfLines={1}>
                  {sample.description}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 🗺️ Secondary Grid: Eco Map & Field Logbook */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Explore & Conserve</Text>
        </View>
        <View style={styles.secondaryRow}>
          {/* Map Card */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/map')}
            style={[
              styles.navTile,
              {
                backgroundColor: isDark ? 'rgba(18, 28, 36, 0.85)' : 'rgba(255, 255, 255, 0.9)',
                borderColor: isDark ? 'rgba(25, 118, 210, 0.3)' : 'rgba(25, 118, 210, 0.16)',
              },
              Shadows.card,
            ]}
            className="interactive-hover"
          >
            <View style={styles.tileHeader}>
              <View style={[styles.tileIconBox, { backgroundColor: isDark ? '#122638' : '#E3F2FD' }]}>
                <TreeMapPinIcon size={22} color="#1976D2" focused={true} />
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </View>
            <Text style={[styles.tileTitle, { color: colors.text }]}>Biodiversity Map</Text>
            <Text style={[styles.tileSubtitle, { color: colors.muted }]}>
              Coimbatore & Ghats hotspots
            </Text>
          </TouchableOpacity>

          {/* Observations Card */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/observations')}
            style={[
              styles.navTile,
              {
                backgroundColor: isDark ? 'rgba(32, 26, 18, 0.85)' : 'rgba(255, 255, 255, 0.9)',
                borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.16)',
              },
              Shadows.card,
            ]}
            className="interactive-hover"
          >
            <View style={styles.tileHeader}>
              <View style={[styles.tileIconBox, { backgroundColor: isDark ? '#2E2210' : '#FFF3E0' }]}>
                <TreeLogbookIcon size={22} color="#D97706" focused={true} />
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </View>
            <Text style={[styles.tileTitle, { color: colors.text }]}>Field Logbook</Text>
            <Text style={[styles.tileSubtitle, { color: colors.muted }]}>
              Local saved observations
            </Text>
          </TouchableOpacity>
        </View>

        {/* 📜 Footer Tech Note */}
        <View style={styles.footerWrap}>
          <View style={styles.footerPill}>
            <Ionicons name="hardware-chip-outline" size={13} color={colors.primary} style={{ marginRight: 5 }} />
            <Text style={[styles.footerPillText, { color: colors.primary }]}>
              MobileNetV4 INT8 • 224x224 • On-Device Engine
            </Text>
          </View>
          <Text style={[styles.footerSubText, { color: colors.muted }]}>
            TreeVision Coimbatore Biodiversity Atlas • Field AI Edition
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    padding: Spacing.screenPadding,
    paddingBottom: 40,
  },
  heroGlassPanel: {
    borderRadius: Radius.card,
    padding: Spacing.lg,
    borderWidth: 1,
    marginBottom: Spacing.sectionGap,
    backdropFilter: 'blur(16px)',
  } as any,
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  heroBrandText: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordmark: {
    ...Typography.h1,
    fontSize: 24,
    letterSpacing: -0.5,
  },
  tagBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.chip,
    marginLeft: 8,
  },
  tagBadgeText: {
    ...Typography.captionBold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  tagline: {
    ...Typography.caption,
    marginTop: 2,
    fontSize: 12,
  },
  liveStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.chip,
  },
  liveStatusText: {
    ...Typography.captionBold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  heroDescription: {
    ...Typography.body,
    lineHeight: 21,
    marginBottom: Spacing.md,
  },
  metricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderRadius: Radius.button,
    borderWidth: 1,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricVal: {
    ...Typography.h3,
    fontWeight: '800',
    fontSize: 17,
  },
  metricLabel: {
    ...Typography.caption,
    fontSize: 11,
    marginTop: 1,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(46, 125, 50, 0.15)',
  },
  primaryCardsSection: {
    gap: Spacing.cardGap,
    marginBottom: Spacing.sectionGap,
  },
  primaryActionCard: {
    borderRadius: Radius.card,
    padding: Spacing.lg,
    backgroundColor: '#1B5E20',
    minHeight: 160,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  cardWatermark: {
    position: 'absolute',
    right: -10,
    bottom: -15,
    pointerEvents: 'none',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionIconPill: {
    width: 46,
    height: 46,
    borderRadius: Radius.button,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextContent: {
    marginTop: Spacing.md,
  },
  primaryCardTitle: {
    ...Typography.h2,
    color: '#FFFFFF',
    fontSize: 20,
    marginBottom: 4,
  },
  primaryCardSubtitle: {
    ...Typography.caption,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
  },
  secondaryActionCard: {
    borderRadius: Radius.card,
    padding: Spacing.lg,
    borderWidth: 1,
    minHeight: 145,
    justifyContent: 'space-between',
    backdropFilter: 'blur(16px)',
  } as any,
  secondaryIconPill: {
    width: 46,
    height: 46,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowOutlinePill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speciesCountBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  secondaryCardTitle: {
    ...Typography.h3,
    fontSize: 18,
  },
  countPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.chip,
  },
  countPillText: {
    ...Typography.captionBold,
    fontSize: 10,
  },
  secondaryCardSubtitle: {
    ...Typography.caption,
    lineHeight: 18,
  },
  quickSpecimensSection: {
    marginBottom: Spacing.sectionGap,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sectionTitleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHeading: {
    ...Typography.h3,
    fontSize: 16,
    letterSpacing: -0.2,
  },
  viewAllText: {
    ...Typography.captionBold,
    fontSize: 12,
  },
  specimensScroll: {
    gap: 12,
    paddingRight: 16,
  },
  specimenCard: {
    width: 145,
    borderRadius: Radius.card,
    padding: 10,
    borderWidth: 1,
    position: 'relative',
    backdropFilter: 'blur(12px)',
  } as any,
  specimenThumb: {
    width: '100%',
    height: 95,
    borderRadius: Radius.image,
    backgroundColor: '#E0E0E0',
    marginBottom: 8,
  },
  specimenBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.chip,
  },
  specimenBadgeText: {
    ...Typography.captionBold,
    color: '#FFFFFF',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  specimenName: {
    ...Typography.captionBold,
    fontSize: 12,
  },
  specimenDesc: {
    ...Typography.caption,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 14,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: Spacing.cardGap,
    marginBottom: Spacing.sectionGap,
  },
  navTile: {
    flex: 1,
    borderRadius: Radius.card,
    padding: Spacing.md,
    borderWidth: 1,
    minHeight: 110,
    justifyContent: 'space-between',
    backdropFilter: 'blur(12px)',
  } as any,
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tileIconBox: {
    width: 38,
    height: 38,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTitle: {
    ...Typography.bodyBold,
    marginTop: 6,
    fontSize: 14,
  },
  tileSubtitle: {
    ...Typography.caption,
    fontSize: 11,
    marginTop: 2,
  },
  footerWrap: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  footerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.chip,
    backgroundColor: 'rgba(46, 125, 50, 0.1)',
    marginBottom: 6,
  },
  footerPillText: {
    ...Typography.mono,
    fontSize: 11,
  },
  footerSubText: {
    ...Typography.caption,
    fontSize: 11,
    opacity: 0.75,
  },
});
