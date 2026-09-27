import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useColorScheme,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Typography } from '../theme';
import { AppHeader } from '../components/AppHeader';
import { ResultCard } from '../components/ResultCard';
import { PrimaryButton, SecondaryButton, GhostButton } from '../components/Buttons';
import { Prediction, Observation } from '../types';
import { saveObservation } from '../services/storage';
import * as Location from 'expo-location';

// Coimbatore center — used only when GPS is unavailable/denied.
const COIMBATORE_FALLBACK = { latitude: 11.0168, longitude: 76.9558 };

/** Real GPS fix with a timeout; falls back to the Coimbatore center. */
async function getObservationCoords(): Promise<{ latitude: number; longitude: number; gps: boolean }> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) return { ...COIMBATORE_FALLBACK, gps: false };
    const pos = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('gps-timeout')), 8000)),
    ]);
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude, gps: true };
  } catch (e) {
    console.warn('GPS unavailable, using approximate center:', e);
    return { ...COIMBATORE_FALLBACK, gps: false };
  }
}

export default function ResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasSaved, setHasSaved] = useState<boolean>(false);

  // Parse prediction payload from route params. No fabricated fallback:
  // without a real model prediction there is nothing to display.
  let prediction: Prediction | null = null;
  try {
    prediction = params.predictionData
      ? (JSON.parse(params.predictionData as string) as Prediction)
      : null;
  } catch {
    prediction = null;
  }

  // Save observation to local logbook (app-design.md §6.3 & §8)
  const handleSaveObservation = async () => {
    if (!prediction) return;
    try {
      setIsSaving(true);
      const coords = await getObservationCoords();
      const newObs: Observation = {
        id: `obs-${Date.now()}`,
        speciesId: prediction.speciesId,
        commonName: prediction.commonName,
        scientificName: prediction.scientificName,
        tamilName: prediction.tamilName,
        imageUri: prediction.imageUri,
        timestamp: new Date().toISOString(),
        confidence: prediction.confidence,
        latitude: coords.latitude,
        longitude: coords.longitude,
        locationName: coords.gps
          ? 'GPS Field Observation • Coimbatore'
          : 'Coimbatore District (approximate — GPS unavailable)',
        status: prediction.confidence >= 0.8 ? 'Verified' : 'Pending Field Review',
      };

      await saveObservation(newObs);
      setHasSaved(true);
      Alert.alert(
        'Observation Logged',
        'Field identification saved to your local offline logbook.',
        [
          { text: 'View Logbook', onPress: () => router.push('/observations') },
          { text: 'OK' },
        ]
      );
    } catch (e) {
      console.warn('Save error:', e);
      Alert.alert('Save Failed', 'Could not save observation.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNavigateSpecies = (id: string) => {
    router.push({
      pathname: '/species/[id]',
      params: { id },
    });
  };

  if (!prediction) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
        <AppHeader
          title="Identification Result"
          subtitle="Confidence-aware LiteRT classification"
        />
        <View style={styles.emptyWrap}>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            No identification result was received. Please run a scan from the Identify tab.
          </Text>
          <GhostButton
            title="Go to Identify"
            icon="camera-outline"
            onPress={() => router.push('/identify')}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <AppHeader
        title="Identification Result"
        subtitle="Confidence-aware LiteRT classification"
        right={
          <GhostButton
            title="Done"
            onPress={() => router.push('/identify')}
          />
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {prediction.isNonTree ? (
          <>
            {/* Non-tree rejection card (OOD gate in services/inference) */}
            <View
              style={[
                styles.rejectCard,
                {
                  backgroundColor: isDark ? 'rgba(46, 20, 20, 0.88)' : 'rgba(255, 243, 238, 0.95)',
                  borderColor: isDark ? 'rgba(229, 115, 115, 0.35)' : 'rgba(198, 40, 40, 0.25)',
                },
              ]}
            >
              <View style={styles.rejectHeader}>
                <Ionicons name="alert-circle-outline" size={26} color={isDark ? '#EF9A9A' : '#C62828'} />
                <Text style={[styles.rejectTitle, { color: colors.text }]}>
                  Doesn&apos;t look like a tree
                </Text>
              </View>
              {prediction.rejectionReason ? (
                <Text style={[styles.rejectBody, { color: colors.text }]}>
                  {prediction.rejectionReason}
                </Text>
              ) : null}
              {prediction.evidenceNotes ? (
                <Text style={[styles.rejectBody, { color: colors.muted }]}>
                  {prediction.evidenceNotes}
                </Text>
              ) : null}
              <View style={styles.tipList}>
                {[
                  'Fill the frame with one leaf, bark patch, or the whole tree',
                  'Avoid people, vehicles, buildings, and food',
                  'Use daylight, hold steady, and tap to focus',
                ].map((tip) => (
                  <View key={tip} style={styles.tipRow}>
                    <View style={[styles.tipDot, { backgroundColor: colors.primary }]} />
                    <Text style={[styles.tipText, { color: colors.text }]}>{tip}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.actionButtonGroup}>
              <GhostButton
                title="Try Another Photo"
                icon="camera-outline"
                onPress={() => router.push('/identify')}
                style={styles.ghostActionButton}
              />
            </View>
          </>
        ) : (
          <>
            {/* Core Result Card containing Hero, Confidence, Alternatives, Grad-CAM (app-design.md §6.3) */}
            <ResultCard
              prediction={prediction}
              onSpeciesPress={handleNavigateSpecies}
            />

            {/* Action Buttons (Bottom of Result Screen per app-design.md §6.3) */}
            <View style={styles.actionButtonGroup}>
              {/* Action 1: View details → /species/[id] (Primary) */}
              <PrimaryButton
                title="View Complete Species Profile"
                icon="book-outline"
                onPress={() => handleNavigateSpecies(prediction.speciesId)}
                style={styles.primaryActionButton}
              />

              {/* Action 2: Save observation (Secondary, stores to local DB) */}
              <SecondaryButton
                title={hasSaved ? 'Observation Saved ✓' : 'Save to Field Observations'}
                icon={hasSaved ? 'checkmark-circle' : 'bookmark-outline'}
                onPress={handleSaveObservation}
                disabled={hasSaved || isSaving}
                loading={isSaving}
                style={styles.secondaryActionButton}
              />

              {/* Action 3: Identify another specimen */}
              <GhostButton
                title="Identify Another Leaf Specimen"
                icon="camera-outline"
                onPress={() => router.push('/identify')}
                style={styles.ghostActionButton}
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.screenPadding,
    paddingBottom: 40,
  },
  actionButtonGroup: {
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  primaryActionButton: {
    width: '100%',
  },
  secondaryActionButton: {
    width: '100%',
  },
  ghostActionButton: {
    width: '100%',
    paddingVertical: 12,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.screenPadding,
  },
  emptyText: {
    ...Typography.body,
    textAlign: 'center',
    marginBottom: Spacing.md,
    lineHeight: 22,
  },
  rejectCard: {
    borderRadius: Radius.card,
    padding: Spacing.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  rejectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  rejectTitle: {
    ...Typography.h3,
    marginLeft: 10,
    flex: 1,
  },
  rejectBody: {
    ...Typography.body,
    lineHeight: 21,
    marginBottom: Spacing.sm,
  },
  tipList: {
    marginTop: Spacing.sm,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 4,
  },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    marginRight: 10,
  },
  tipText: {
    ...Typography.body,
    flex: 1,
    lineHeight: 20,
  },
});
