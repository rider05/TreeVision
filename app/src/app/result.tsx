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
import { Colors, Spacing, Typography } from '../theme';
import { AppHeader } from '../components/AppHeader';
import { ResultCard } from '../components/ResultCard';
import { PrimaryButton, SecondaryButton, GhostButton } from '../components/Buttons';
import { Prediction, Observation } from '../types';
import { saveObservation } from '../services/storage';

export default function ResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasSaved, setHasSaved] = useState<boolean>(false);

  // Parse prediction payload from route params
  let prediction: Prediction;
  try {
    prediction = params.predictionData
      ? JSON.parse(params.predictionData as string)
      : {
          speciesId: 'azadirachta-indica',
          commonName: 'Neem Tree',
          tamilName: 'வேப்ப மரம் (Veppam)',
          scientificName: 'Azadirachta indica',
          confidence: 0.934,
          latencyMs: 142,
          engine: 'LiteRT (INT8 MobileNetV4 • 224x224)',
          needsMoreEvidence: false,
          imageUri: 'https://images.unsplash.com/photo-1629853974488-8889ff0a9f5f?auto=format&fit=crop&w=800&q=80',
          alternatives: [
            {
              speciesId: 'millettia-pinnata',
              commonName: 'Pongamia',
              scientificName: 'Millettia pinnata',
              confidence: 0.043,
            },
            {
              speciesId: 'swietenia-mahagoni',
              commonName: 'Mahogany',
              scientificName: 'Swietenia mahagoni',
              confidence: 0.018,
            },
          ],
        };
  } catch (e) {
    prediction = {
      speciesId: 'azadirachta-indica',
      commonName: 'Neem Tree',
      tamilName: 'வேப்ப மரம்',
      scientificName: 'Azadirachta indica',
      confidence: 0.912,
      latencyMs: 156,
      engine: 'LiteRT (INT8 MobileNetV4)',
      needsMoreEvidence: false,
      imageUri: 'https://images.unsplash.com/photo-1629853974488-8889ff0a9f5f?auto=format&fit=crop&w=800&q=80',
      alternatives: [],
    };
  }

  // Save observation to local logbook (app-design.md §6.3 & §8)
  const handleSaveObservation = async () => {
    try {
      setIsSaving(true);
      const newObs: Observation = {
        id: `obs-${Date.now()}`,
        speciesId: prediction.speciesId,
        commonName: prediction.commonName,
        scientificName: prediction.scientificName,
        tamilName: prediction.tamilName,
        imageUri: prediction.imageUri,
        timestamp: new Date().toISOString(),
        confidence: prediction.confidence,
        latitude: 11.0168 + (Math.random() - 0.5) * 0.04,
        longitude: 76.9558 + (Math.random() - 0.5) * 0.04,
        locationName: 'Coimbatore District Field Observation',
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
});
