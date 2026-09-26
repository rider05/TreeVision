import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '../../theme';
import { AppHeader } from '../../components/AppHeader';
import { ConfidenceBadge } from '../../components/ConfidenceBadge';
import { PrimaryButton } from '../../components/Buttons';
import { getSavedObservations } from '../../services/storage';
import { Observation } from '../../types';
import { TreeMapPinIcon, TreeCanopyIcon } from '../../components/TreeIcons';

// Coimbatore Regional Biodiversity Hotspots
const COIMBATORE_HOTSPOTS = [
  { name: 'Singanallur Lake Buffer', lat: 11.001, lng: 76.962, count: 18, type: 'Wetland Ecotone' },
  { name: 'Marudhamalai Forest Track', lat: 11.045, lng: 76.924, count: 24, type: 'Dry Deciduous Scrub' },
  { name: 'Siruvani Catchment Basin', lat: 10.985, lng: 76.885, count: 32, type: 'Riparian Evergreen' },
  { name: 'Anaikatti Western Foothills', lat: 11.082, lng: 76.812, count: 29, type: 'Shola-Grassland' },
  { name: 'TNAU Botanical Enclave', lat: 11.012, lng: 76.936, count: 41, type: 'Living Botanical Flora' },
];

export default function MapScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const [observations, setObservations] = useState<Observation[]>([]);
  const [selectedObservation, setSelectedObservation] = useState<Observation | null>(null);
  const [filterType, setFilterType] = useState<'All' | 'Verified' | 'Pending'>('All');

  useEffect(() => {
    let mounted = true;
    getSavedObservations()
      .then((list) => {
        if (mounted) {
          setObservations(() => list);
          if (list.length > 0) {
            setSelectedObservation(() => list[0]);
          }
        }
      });
    return () => { mounted = false; };
  }, []);

  const filteredObservations = observations.filter((obs) => {
    if (filterType === 'Verified') return obs.status === 'Verified';
    if (filterType === 'Pending') return obs.status === 'Pending Field Review';
    return true;
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <AppHeader
        title="Biodiversity Map"
        subtitle="Coimbatore & Western Ghats Habitat Grid"
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Map Topographic Canvas with Glassmorphic Frame */}
        <View
          style={[
            styles.mapCanvas,
            {
              backgroundColor: isDark ? '#111D13' : '#DDE8DB',
              borderColor: isDark ? 'rgba(46, 125, 50, 0.4)' : '#BACDB8',
            },
            Shadows.cardHover,
          ]}
        >
          {/* Topographic Contour Rings */}
          <View style={styles.topographicOverlay}>
            <View style={[styles.gridCircle, { width: 340, height: 340, borderColor: colors.primary, opacity: 0.15 }]} />
            <View style={[styles.gridCircle, { width: 220, height: 220, borderColor: colors.primary, opacity: 0.2 }]} />
            <View style={[styles.gridCircle, { width: 110, height: 110, borderColor: colors.primary, opacity: 0.25 }]} />
          </View>

          {/* Region Label Badge with Compass */}
          <View
            style={[
              styles.regionHeaderBadge,
              { backgroundColor: isDark ? 'rgba(15, 23, 17, 0.9)' : 'rgba(255, 255, 255, 0.94)' },
            ]}
          >
            <Ionicons name="compass" size={14} color={colors.primary} style={{ marginRight: 5 }} />
            <Text style={[styles.regionBadgeText, { color: colors.primary }]}>
              Coimbatore Basin • 11.0168° N, 76.9558° E
            </Text>
          </View>

          {/* Observation Tree Pins on Map */}
          {filteredObservations.map((obs, index) => {
            const isSelected = selectedObservation?.id === obs.id;
            const topPercent = 25 + ((index * 23) % 52);
            const leftPercent = 18 + ((index * 31) % 65);

            return (
              <TouchableOpacity
                key={obs.id}
                activeOpacity={0.8}
                onPress={() => setSelectedObservation(obs)}
                style={[
                  styles.mapPin,
                  {
                    top: `${topPercent}%`,
                    left: `${leftPercent}%`,
                    backgroundColor: isSelected
                      ? colors.primary
                      : obs.status === 'Verified'
                      ? colors.success
                      : colors.accent,
                    transform: [{ scale: isSelected ? 1.25 : 1 }],
                  },
                  Shadows.cardHover,
                ]}
                className="interactive-hover"
              >
                <TreeCanopyIcon size={14} color="#FFFFFF" focused={true} />
              </TouchableOpacity>
            );
          })}

          {/* Map Controls & Privacy Gate Badge */}
          <View style={styles.mapControls}>
            <View style={styles.privacyChip}>
              <Ionicons name="lock-closed" size={11} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.privacyText}>Rounded ~3 Decimals (Conservation Privacy)</Text>
            </View>
          </View>
        </View>

        {/* Filter Pills with Hover Effects */}
        <View style={styles.filterRow}>
          {(['All', 'Verified', 'Pending'] as const).map((filter) => {
            const active = filterType === filter;
            return (
              <TouchableOpacity
                key={filter}
                onPress={() => setFilterType(filter)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: active
                      ? colors.primary
                      : isDark
                      ? 'rgba(24, 34, 26, 0.85)'
                      : 'rgba(255, 255, 255, 0.9)',
                    borderColor: active ? colors.primary : colors.border,
                  },
                  active && Shadows.card,
                ]}
                className="interactive-hover"
              >
                <Text style={[styles.filterPillText, { color: active ? '#FFFFFF' : colors.text }]}>
                  {filter} (
                  {filter === 'All'
                    ? observations.length
                    : filter === 'Verified'
                    ? observations.filter((o) => o.status === 'Verified').length
                    : observations.filter((o) => o.status !== 'Verified').length}
                  )
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected Observation Sheet with Glassmorphism */}
        {selectedObservation ? (
          <View
            style={[
              styles.observationSheet,
              {
                backgroundColor: isDark ? 'rgba(20, 28, 22, 0.88)' : 'rgba(255, 255, 255, 0.92)',
                borderColor: isDark ? 'rgba(46, 125, 50, 0.3)' : 'rgba(46, 125, 50, 0.16)',
                backdropFilter: 'blur(16px)',
              } as any,
              Shadows.cardHover,
            ]}
          >
            <View style={styles.sheetContentRow}>
              <Image
                source={{ uri: selectedObservation.imageUri }}
                style={styles.sheetThumb}
                resizeMode="cover"
              />
              <View style={styles.sheetDetails}>
                <View style={styles.sheetTopRow}>
                  <Text style={[styles.sheetTitle, { color: colors.text }]} numberOfLines={1}>
                    {selectedObservation.commonName}
                  </Text>
                  <ConfidenceBadge value={selectedObservation.confidence} size="sm" />
                </View>

                <Text style={[styles.sheetSci, { color: colors.muted }]} numberOfLines={1}>
                  {selectedObservation.scientificName}
                </Text>

                <View style={styles.locationMetaRow}>
                  <Ionicons name="location-outline" size={12} color={colors.primary} />
                  <Text style={[styles.locationMetaText, { color: colors.muted }]} numberOfLines={1}>
                    {selectedObservation.locationName}
                  </Text>
                </View>

                <Text style={[styles.coordText, { color: colors.muted }]}>
                  Lat: {selectedObservation.latitude.toFixed(3)}°, Lng: {selectedObservation.longitude.toFixed(3)}°
                </Text>
              </View>
            </View>

            <PrimaryButton
              title="View Species Botanical Profile"
              icon="book-outline"
              onPress={() =>
                router.push({
                  pathname: '/species/[id]',
                  params: { id: selectedObservation.speciesId },
                })
              }
              style={{ marginTop: Spacing.md }}
            />
          </View>
        ) : null}

        {/* Regional Hotspot Summaries */}
        <View style={styles.hotspotHeaderRow}>
          <TreeMapPinIcon size={16} color={colors.primary} focused={true} />
          <Text style={[styles.hotspotsSectionTitle, { color: colors.text }]}>
            Coimbatore Ecological Reserves
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hotspotsScroll}
        >
          {COIMBATORE_HOTSPOTS.map((h) => (
            <View
              key={h.name}
              style={[
                styles.hotspotCard,
                {
                  backgroundColor: isDark ? 'rgba(20, 28, 22, 0.85)' : 'rgba(255, 255, 255, 0.9)',
                  borderColor: isDark ? 'rgba(46, 125, 50, 0.25)' : 'rgba(46, 125, 50, 0.14)',
                  backdropFilter: 'blur(12px)',
                } as any,
                Shadows.card,
              ]}
              className="interactive-hover"
            >
              <Text style={[styles.hotspotName, { color: colors.text }]}>{h.name}</Text>
              <Text style={[styles.hotspotType, { color: colors.primary }]}>{h.type}</Text>
              <Text style={[styles.hotspotCount, { color: colors.muted }]}>
                {h.count} verified trees cataloged
              </Text>
            </View>
          ))}
        </ScrollView>
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
  mapCanvas: {
    height: 230,
    borderRadius: Radius.card,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  topographicOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCircle: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  regionHeaderBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.chip,
    borderWidth: 1,
    borderColor: 'rgba(46, 125, 50, 0.2)',
  },
  regionBadgeText: {
    ...Typography.captionBold,
    fontSize: 11,
  },
  mapPin: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  mapControls: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  privacyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.chip,
  },
  privacyText: {
    ...Typography.caption,
    color: '#FFFFFF',
    fontSize: 10,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.md,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.chip,
    borderWidth: 1,
  },
  filterPillText: {
    ...Typography.captionBold,
    fontSize: 12,
  },
  observationSheet: {
    borderRadius: Radius.card,
    padding: Spacing.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  sheetContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sheetThumb: {
    width: 72,
    height: 72,
    borderRadius: Radius.image,
    backgroundColor: '#E0E0E0',
  },
  sheetDetails: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  sheetTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sheetTitle: {
    ...Typography.bodyBold,
    fontSize: 15,
    flex: 1,
    marginRight: 6,
  },
  sheetSci: {
    ...Typography.caption,
    fontStyle: 'italic',
    marginTop: 1,
  },
  locationMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationMetaText: {
    ...Typography.caption,
    marginLeft: 4,
    fontSize: 11,
  },
  coordText: {
    ...Typography.mono,
    fontSize: 10,
    marginTop: 2,
  },
  hotspotHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  hotspotsSectionTitle: {
    ...Typography.bodyBold,
    fontSize: 14,
    marginLeft: 6,
  },
  hotspotsScroll: {
    gap: 10,
    paddingBottom: 20,
  },
  hotspotCard: {
    width: 175,
    padding: Spacing.md,
    borderRadius: Radius.card,
    borderWidth: 1,
  },
  hotspotName: {
    ...Typography.captionBold,
    fontSize: 12,
  },
  hotspotType: {
    ...Typography.caption,
    fontSize: 11,
    marginTop: 2,
  },
  hotspotCount: {
    ...Typography.caption,
    fontSize: 11,
    marginTop: 4,
  },
});
