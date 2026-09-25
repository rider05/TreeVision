import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '../../theme';
import { AppHeader } from '../../components/AppHeader';
import { PrimaryButton, GhostButton } from '../../components/Buttons';
import { getTree } from '../../services/inference';
import { TreeCanopyIcon } from '../../components/TreeIcons';

export default function SpeciesDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const tree = getTree(id || '') || getTree('azadirachta-indica')!;
  const [activeImageTab, setActiveImageTab] = useState<'leaf' | 'bark' | 'tree'>('leaf');

  const currentImageUri =
    (activeImageTab === 'bark' && tree.sampleImages.bark) ||
    (activeImageTab === 'tree' && tree.sampleImages.tree) ||
    tree.sampleImages.leaf;

  const handleIdentifyThisSpecies = () => {
    router.push('/identify');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <AppHeader
        title={tree.commonName}
        subtitle={tree.scientificName}
        right={<GhostButton title="Back" icon="arrow-back" onPress={() => router.back()} />}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Hero Image with Morphological Switcher */}
        <View style={[styles.heroWrap, Shadows.cardHover]}>
          <Image source={{ uri: currentImageUri }} style={styles.heroImage} resizeMode="cover" />

          {/* Morphological Image View Switcher */}
          <View style={styles.imageSelectorRow}>
            <TouchableOpacity
              onPress={() => setActiveImageTab('leaf')}
              style={[
                styles.imageTabBtn,
                activeImageTab === 'leaf' && { backgroundColor: colors.primary },
              ]}
              className="interactive-hover"
            >
              <Text
                style={[
                  styles.imageTabText,
                  { color: activeImageTab === 'leaf' ? '#FFFFFF' : '#E0E0E0' },
                ]}
              >
                Leaf
              </Text>
            </TouchableOpacity>

            {tree.sampleImages.bark ? (
              <TouchableOpacity
                onPress={() => setActiveImageTab('bark')}
                style={[
                  styles.imageTabBtn,
                  activeImageTab === 'bark' && { backgroundColor: colors.primary },
                ]}
                className="interactive-hover"
              >
                <Text
                  style={[
                    styles.imageTabText,
                    { color: activeImageTab === 'bark' ? '#FFFFFF' : '#E0E0E0' },
                  ]}
                >
                  Bark
                </Text>
              </TouchableOpacity>
            ) : null}

            {tree.sampleImages.tree ? (
              <TouchableOpacity
                onPress={() => setActiveImageTab('tree')}
                style={[
                  styles.imageTabBtn,
                  activeImageTab === 'tree' && { backgroundColor: colors.primary },
                ]}
                className="interactive-hover"
              >
                <Text
                  style={[
                    styles.imageTabText,
                    { color: activeImageTab === 'tree' ? '#FFFFFF' : '#E0E0E0' },
                  ]}
                >
                  Canopy
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Title Block & Primary Badges */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: isDark ? 'rgba(20, 28, 22, 0.88)' : 'rgba(255, 255, 255, 0.92)',
              borderColor: isDark ? 'rgba(46, 125, 50, 0.3)' : 'rgba(46, 125, 50, 0.16)',
              backdropFilter: 'blur(16px)',
            } as any,
            Shadows.card,
          ]}
        >
          <View style={styles.titleTopRow}>
            <View style={styles.titleWithEmblem}>
              <View
                style={[
                  styles.treeEmblemBox,
                  { backgroundColor: isDark ? '#143818' : colors.primaryLight },
                ]}
              >
                <TreeCanopyIcon size={24} color={colors.primary} focused={true} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.commonTitle, { color: colors.text }]}>{tree.commonName}</Text>
                <Text style={[styles.tamilTitle, { color: colors.primary }]}>{tree.tamilName}</Text>
                <Text style={[styles.scientificTitle, { color: colors.muted }]}>
                  {tree.scientificName}
                </Text>
              </View>
            </View>

            {tree.isWesternGhats ? (
              <View
                style={[
                  styles.ghatsBadge,
                  { backgroundColor: isDark ? '#143818' : colors.primaryLight },
                ]}
              >
                <Ionicons name="leaf" size={13} color={colors.primary} style={{ marginRight: 4 }} />
                <Text style={[styles.ghatsText, { color: colors.primary }]}>Western Ghats</Text>
              </View>
            ) : null}
          </View>

          {/* Chips */}
          <View style={styles.chipsRow}>
            <View
              style={[styles.badgeChip, { backgroundColor: isDark ? '#262925' : colors.primaryLight }]}
            >
              <Text style={[styles.badgeChipText, { color: colors.primary }]}>
                Family: {tree.family}
              </Text>
            </View>
            <View style={[styles.badgeChip, { backgroundColor: isDark ? '#262925' : '#ECEFEA' }]}>
              <Text style={[styles.badgeChipText, { color: colors.muted }]}>
                IUCN: {tree.conservationStatus}
              </Text>
            </View>
          </View>

          {/* Stats Bar */}
          <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {tree.occurrenceRecords.toLocaleString()}
              </Text>
              <Text style={[styles.statSub, { color: colors.muted }]}>Occurrence Records</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text
                style={[
                  styles.statValue,
                  { color: tree.isThin ? colors.accent : colors.text },
                ]}
              >
                {tree.fieldImagesCount}
              </Text>
              <Text style={[styles.statSub, { color: colors.muted }]}>
                Field Images {tree.isThin ? '(Thin data)' : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Botanical Morphology Sections */}
        {/* Section 1: Leaf & Foliage */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: isDark ? 'rgba(20, 28, 22, 0.85)' : 'rgba(255, 255, 255, 0.9)',
              borderColor: isDark ? 'rgba(46, 125, 50, 0.28)' : 'rgba(46, 125, 50, 0.14)',
              backdropFilter: 'blur(14px)',
            } as any,
            Shadows.card,
          ]}
        >
          <View style={styles.cardHeader}>
            <Ionicons name="leaf-outline" size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Leaf & Foliage Morphology</Text>
          </View>
          <Text style={[styles.cardBody, { color: colors.text }]}>{tree.leafType}</Text>
        </View>

        {/* Section 2: Bark & Trunk */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: isDark ? 'rgba(20, 28, 22, 0.85)' : 'rgba(255, 255, 255, 0.9)',
              borderColor: isDark ? 'rgba(46, 125, 50, 0.28)' : 'rgba(46, 125, 50, 0.14)',
              backdropFilter: 'blur(14px)',
            } as any,
            Shadows.card,
          ]}
        >
          <View style={styles.cardHeader}>
            <Ionicons name="git-commit-outline" size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Bark & Trunk Texture</Text>
          </View>
          <Text style={[styles.cardBody, { color: colors.text }]}>{tree.barkDescription}</Text>
        </View>

        {/* Section 3: Flowers & Inflorescence */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: isDark ? 'rgba(20, 28, 22, 0.85)' : 'rgba(255, 255, 255, 0.9)',
              borderColor: isDark ? 'rgba(46, 125, 50, 0.28)' : 'rgba(46, 125, 50, 0.14)',
              backdropFilter: 'blur(14px)',
            } as any,
            Shadows.card,
          ]}
        >
          <View style={styles.cardHeader}>
            <Ionicons name="flower-outline" size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Flowers & Inflorescence
            </Text>
          </View>
          <Text style={[styles.cardBody, { color: colors.text }]}>{tree.flowerDescription}</Text>
        </View>

        {/* Section 4: Fruit & Seeds */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: isDark ? 'rgba(20, 28, 22, 0.85)' : 'rgba(255, 255, 255, 0.9)',
              borderColor: isDark ? 'rgba(46, 125, 50, 0.28)' : 'rgba(46, 125, 50, 0.14)',
              backdropFilter: 'blur(14px)',
            } as any,
            Shadows.card,
          ]}
        >
          <View style={styles.cardHeader}>
            <Ionicons name="nutrition-outline" size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Fruit & Seeds</Text>
          </View>
          <Text style={[styles.cardBody, { color: colors.text }]}>{tree.fruitDescription}</Text>
        </View>

        {/* Section 5: Habitat & Distribution */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: isDark ? 'rgba(20, 28, 22, 0.85)' : 'rgba(255, 255, 255, 0.9)',
              borderColor: isDark ? 'rgba(46, 125, 50, 0.28)' : 'rgba(46, 125, 50, 0.14)',
              backdropFilter: 'blur(14px)',
            } as any,
            Shadows.card,
          ]}
        >
          <View style={styles.cardHeader}>
            <Ionicons name="map-outline" size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Habitat & Regional Distribution
            </Text>
          </View>
          <Text style={[styles.cardBody, { color: colors.text }]}>{tree.habitat}</Text>
          <View style={[styles.regionPill, { backgroundColor: isDark ? '#262925' : '#ECEFEA' }]}>
            <Ionicons name="location" size={14} color={colors.muted} style={{ marginRight: 6 }} />
            <Text style={[styles.regionPillText, { color: colors.muted }]}>{tree.region}</Text>
          </View>
        </View>

        {/* Section 6: Traditional & Ecological Uses */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: isDark ? 'rgba(20, 28, 22, 0.85)' : 'rgba(255, 255, 255, 0.9)',
              borderColor: isDark ? 'rgba(46, 125, 50, 0.28)' : 'rgba(46, 125, 50, 0.14)',
              backdropFilter: 'blur(14px)',
            } as any,
            Shadows.card,
          ]}
        >
          <View style={styles.cardHeader}>
            <Ionicons name="medkit-outline" size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Traditional & Ecological Uses
            </Text>
          </View>
          {tree.uses.map((use, idx) => (
            <View key={idx} style={styles.useRow}>
              <View style={[styles.useDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.useText, { color: colors.text }]}>{use}</Text>
            </View>
          ))}
        </View>

        {/* Citation Box */}
        <View
          style={[
            styles.citationBox,
            {
              backgroundColor: isDark ? 'rgba(26, 34, 28, 0.7)' : 'rgba(239, 242, 236, 0.85)',
            },
          ]}
        >
          <Ionicons name="document-text-outline" size={16} color={colors.muted} style={{ marginRight: 8 }} />
          <Text style={[styles.citationText, { color: colors.muted }]}>
            Botanical citation: {tree.citation}
          </Text>
        </View>

        {/* Primary CTA */}
        <View style={styles.bottomCtaWrap}>
          <PrimaryButton
            title={`Identify this Species in the Field`}
            icon="camera"
            onPress={handleIdentifyThisSpecies}
          />
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
  imageSelectorRow: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.68)',
    borderRadius: Radius.chip,
    padding: 3,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  imageTabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.chip,
  },
  imageTabText: {
    ...Typography.captionBold,
    fontSize: 11,
  },
  sectionCard: {
    borderRadius: Radius.card,
    padding: Spacing.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  titleTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleWithEmblem: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 8,
  },
  treeEmblemBox: {
    width: 42,
    height: 42,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  commonTitle: {
    ...Typography.h2,
    fontSize: 21,
  },
  tamilTitle: {
    ...Typography.bodyBold,
    marginTop: 2,
    fontSize: 14,
  },
  scientificTitle: {
    ...Typography.body,
    fontStyle: 'italic',
    marginTop: 2,
  },
  ghatsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.chip,
  },
  ghatsText: {
    ...Typography.captionBold,
    fontSize: 11,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: Spacing.md,
  },
  badgeChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.chip,
  },
  badgeChipText: {
    ...Typography.captionBold,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...Typography.h3,
    fontWeight: '700',
  },
  statSub: {
    ...Typography.caption,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  cardTitle: {
    ...Typography.bodyBold,
    marginLeft: 8,
    fontSize: 15,
  },
  cardBody: {
    ...Typography.body,
    lineHeight: 22,
  },
  regionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.button,
    marginTop: 10,
  },
  regionPillText: {
    ...Typography.captionBold,
  },
  useRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 4,
  },
  useDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    marginRight: 10,
  },
  useText: {
    ...Typography.body,
    flex: 1,
    lineHeight: 20,
  },
  citationBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderRadius: Radius.card,
    marginBottom: Spacing.md,
  },
  citationText: {
    ...Typography.caption,
    flex: 1,
    lineHeight: 16,
  },
  bottomCtaWrap: {
    marginTop: Spacing.sm,
  },
});
