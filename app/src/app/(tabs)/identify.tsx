import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Radius, Typography, Spacing, Shadows } from '../../theme';
import { AppHeader } from '../../components/AppHeader';
import { PrimaryButton, GhostButton } from '../../components/Buttons';
import { ImageQualityHint } from '../../components/ImageQualityHint';
import { predictTree, SAMPLE_TEST_LEAVES } from '../../services/inference';
import { TreeScanIcon } from '../../components/TreeIcons';

export default function IdentifyScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const [selectedUri, setSelectedUri] = useState<string | null>(null);
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string | null>(null);
  const [isInferring, setIsInferring] = useState<boolean>(false);
  const [qualityWarning, setQualityWarning] = useState<string | null>(null);
  const [lowConfidenceMode, setLowConfidenceMode] = useState<boolean>(false);

  // Take photo with device camera
  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Camera Permission',
          'Camera access is required for field leaf scanning.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setSelectedUri(result.assets[0].uri);
        setSelectedSpeciesId(null);
        setQualityWarning(null);
      }
    } catch (e) {
      console.warn('Camera error:', e);
      setSelectedUri(SAMPLE_TEST_LEAVES[0].image);
      setSelectedSpeciesId(SAMPLE_TEST_LEAVES[0].speciesId);
    }
  };

  // Pick photo from device gallery
  const handlePickGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setSelectedUri(result.assets[0].uri);
        setSelectedSpeciesId(null);
        setQualityWarning(null);
      }
    } catch (e) {
      console.warn('Picker error:', e);
      setSelectedUri(SAMPLE_TEST_LEAVES[1].image);
      setSelectedSpeciesId(SAMPLE_TEST_LEAVES[1].speciesId);
    }
  };

  const handleSelectSample = (sample: typeof SAMPLE_TEST_LEAVES[0]) => {
    setSelectedUri(sample.image);
    setSelectedSpeciesId(sample.speciesId);
    setQualityWarning(null);
  };

  // Run on-device inference with laser animation
  const handleIdentify = async () => {
    if (!selectedUri) return;

    try {
      setIsInferring(true);
      const prediction = await predictTree(selectedUri, {
        forcedSpeciesId: selectedSpeciesId || undefined,
        lowConfidence: lowConfidenceMode,
      });

      router.push({
        pathname: '/result',
        params: {
          predictionData: JSON.stringify(prediction),
        },
      });
    } catch (error) {
      console.error('Inference error:', error);
      Alert.alert(
        'Inference Failed',
        error instanceof Error ? error.message : 'An error occurred running the LiteRT model.'
      );
    } finally {
      setIsInferring(false);
    }
  };

  const handleRetake = () => {
    setSelectedUri(null);
    setSelectedSpeciesId(null);
    setQualityWarning(null);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <AppHeader
        title="Botanical Scanner"
        subtitle="LiteRT MobileNetV4 INT8"
        right={
          selectedUri ? (
            <GhostButton title="Clear" onPress={handleRetake} />
          ) : null
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Tip Instruction Banner */}
        <View
          style={[
            styles.tipCard,
            {
              backgroundColor: isDark ? 'rgba(20, 46, 24, 0.8)' : 'rgba(232, 245, 233, 0.85)',
              borderColor: isDark ? 'rgba(76, 175, 80, 0.35)' : 'rgba(46, 125, 50, 0.2)',
            },
          ]}
        >
          <View style={styles.tipIconWrap}>
            <Ionicons name="sparkles" size={18} color={colors.primary} />
          </View>
          <Text style={[styles.tipText, { color: colors.text }]}>
            <Text style={{ fontWeight: '700', color: colors.primary }}>Field Tip: </Text>
            Fill frame with one leaf blade, avoid heavy shadows, and ensure clear venation focus.
          </Text>
        </View>

        {/* Preview State or Picker State */}
        {selectedUri ? (
          <View style={styles.previewContainer}>
            {/* Viewfinder Preview Frame with Corner Brackets & Laser Scan */}
            <View style={[styles.previewFrame, Shadows.cardHover]}>
              <Image source={{ uri: selectedUri }} style={styles.previewImage} resizeMode="cover" />

              {/* Viewfinder Corner Overlays */}
              <View style={[styles.cornerBracket, styles.bracketTL]} />
              <View style={[styles.cornerBracket, styles.bracketTR]} />
              <View style={[styles.cornerBracket, styles.bracketBL]} />
              <View style={[styles.cornerBracket, styles.bracketBR]} />

              {/* Animated Laser Scanning Line during Inference */}
              {isInferring && (
                <View
                  style={{
                    position: 'absolute',
                    left: 8,
                    right: 8,
                    top: '50%',
                    height: 2,
                    borderRadius: 1,
                    backgroundColor: colors.primary,
                    opacity: 0.9,
                  }}
                />
              )}

              {/* Retake Pill */}
              <View style={styles.retakeOverlay}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleRetake}
                  style={styles.retakeChip}
                >
                  <Ionicons name="refresh" size={14} color="#FFFFFF" style={{ marginRight: 5 }} />
                  <Text style={styles.retakeText}>Retake / Reselect</Text>
                </TouchableOpacity>
              </View>

              {/* Neural Lens Center Reticle */}
              <View style={styles.reticleCenter}>
                <View style={styles.reticleCrossH} />
                <View style={styles.reticleCrossV} />
                <View style={styles.reticleCircle} />
              </View>
            </View>

            {/* Quality Hint (if flagged) */}
            {qualityWarning ? <ImageQualityHint reason={qualityWarning} /> : null}

            {/* Simulation Options */}
            <View
              style={[
                styles.optionsBlock,
                {
                  backgroundColor: isDark ? 'rgba(24, 32, 26, 0.85)' : 'rgba(255, 255, 255, 0.88)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(46, 125, 50, 0.15)',
                },
                Shadows.card,
              ]}
              className="glass-card"
            >
              <View style={styles.optionRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionLabel, { color: colors.text }]}>
                    Confidence Gate Test (&lt;60%)
                  </Text>
                  <Text style={[styles.optionSub, { color: colors.muted }]}>
                    Simulates ambiguous foliage triggering the multi-evidence threshold banner
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setLowConfidenceMode(!lowConfidenceMode)}
                  style={[
                    styles.toggleButton,
                    {
                      backgroundColor: lowConfidenceMode ? colors.accent : (isDark ? '#333' : '#E0E0E0'),
                    },
                  ]}
                  className="interactive-hover"
                >
                  <Text style={[styles.toggleText, { color: lowConfidenceMode ? '#FFFFFF' : colors.muted }]}>
                    {lowConfidenceMode ? 'ON' : 'OFF'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.captureContainer}>
            {/* Capture CTAs: Take Photo & Gallery */}
            <View style={styles.ctaGrid}>
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={handleTakePhoto}
                style={[styles.ctaBoxPrimary, Shadows.cardHover]}
                className="interactive-hover shimmer-button"
              >
                <View style={styles.ctaIconCircle}>
                  <TreeScanIcon size={32} color="#FFFFFF" focused={true} />
                </View>
                <Text style={styles.ctaPrimaryTitle}>Take Photo</Text>
                <Text style={styles.ctaPrimarySubtitle}>Field Camera Viewfinder</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.88}
                onPress={handlePickGallery}
                style={[
                  styles.ctaBoxSecondary,
                  {
                    backgroundColor: isDark ? 'rgba(24, 32, 26, 0.85)' : 'rgba(255, 255, 255, 0.9)',
                    borderColor: isDark ? 'rgba(46, 125, 50, 0.3)' : 'rgba(46, 125, 50, 0.18)',
                  },
                  Shadows.card,
                ]}
                className="interactive-hover"
              >
                <View
                  style={[
                    styles.ctaIconCircleOutline,
                    { backgroundColor: isDark ? '#143818' : colors.primaryLight },
                  ]}
                >
                  <Ionicons name="images" size={28} color={colors.primary} />
                </View>
                <Text style={[styles.ctaSecondaryTitle, { color: colors.text }]}>
                  Gallery Upload
                </Text>
                <Text style={[styles.ctaSecondarySubtitle, { color: colors.muted }]}>
                  Existing Specimen Photo
                </Text>
              </TouchableOpacity>
            </View>

            {/* Quick Test Leaf Samples */}
            <View style={styles.samplesSection}>
              <View style={styles.samplesHeaderRow}>
                <Ionicons name="sparkles-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.samplesHeader, { color: colors.text }]}>
                  Quick Specimen Demos (Tap to Test)
                </Text>
              </View>
              <Text style={[styles.samplesSub, { color: colors.muted }]}>
                Select an authentic Coimbatore leaf to test on-device neural classification:
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.samplesScroll}
              >
                {SAMPLE_TEST_LEAVES.map((sample) => (
                  <TouchableOpacity
                    key={sample.speciesId}
                    activeOpacity={0.85}
                    onPress={() => handleSelectSample(sample)}
                    style={[
                      styles.sampleCard,
                      {
                        backgroundColor: isDark ? 'rgba(20, 28, 22, 0.85)' : 'rgba(255, 255, 255, 0.9)',
                        borderColor: isDark ? 'rgba(46, 125, 50, 0.25)' : 'rgba(46, 125, 50, 0.12)',
                      },
                      Shadows.card,
                    ]}
                    className="interactive-hover"
                  >
                    <Image source={{ uri: sample.image }} style={styles.sampleThumb} resizeMode="cover" />
                    <View style={styles.sampleTapBadge}>
                      <Text style={styles.sampleTapText}>Tap to Test</Text>
                    </View>
                    <Text style={[styles.sampleName, { color: colors.text }]} numberOfLines={1}>
                      {sample.name}
                    </Text>
                    <Text style={[styles.sampleDesc, { color: colors.muted }]} numberOfLines={2}>
                      {sample.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom-Fixed Primary CTA */}
      <View
        style={[
          styles.bottomFixedBar,
          {
            backgroundColor: isDark ? 'rgba(18, 26, 20, 0.92)' : 'rgba(255, 255, 255, 0.94)',
            borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(46, 125, 50, 0.15)',
          },
          Shadows.floatButton,
        ]}
      >
        <PrimaryButton
          title={isInferring ? 'Analyzing Leaf Venation...' : 'Run LiteRT Identification'}
          icon="sparkles"
          onPress={handleIdentify}
          disabled={!selectedUri || isInferring}
          loading={isInferring}
        />
      </View>
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
    paddingBottom: 110,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.card,
    borderWidth: 1,
    marginBottom: Spacing.sectionGap,
    backdropFilter: 'blur(12px)',
  } as any,
  tipIconWrap: {
    marginRight: 10,
  },
  tipText: {
    ...Typography.caption,
    flex: 1,
    lineHeight: 18,
  },
  previewContainer: {
    marginBottom: Spacing.md,
  },
  previewFrame: {
    width: '100%',
    height: 310,
    borderRadius: Radius.image,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0F1610',
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  cornerBracket: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#10B981',
  },
  bracketTL: {
    top: 16,
    left: 16,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  bracketTR: {
    top: 16,
    right: 16,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bracketBL: {
    bottom: 16,
    left: 16,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bracketBR: {
    bottom: 16,
    right: 16,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  reticleCenter: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 40,
    height: 40,
    marginLeft: -20,
    marginTop: -20,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  reticleCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    borderStyle: 'dashed',
  },
  reticleCrossH: {
    position: 'absolute',
    width: 20,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  reticleCrossV: {
    position: 'absolute',
    height: 20,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  retakeOverlay: {
    position: 'absolute',
    top: 14,
    right: 14,
  },
  retakeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.chip,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  retakeText: {
    ...Typography.captionBold,
    color: '#FFFFFF',
    fontSize: 11,
  },
  captureContainer: {
    marginBottom: Spacing.md,
  },
  ctaGrid: {
    flexDirection: 'row',
    gap: Spacing.cardGap,
    marginBottom: Spacing.sectionGap,
  },
  ctaBoxPrimary: {
    flex: 1,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    backgroundColor: '#1B5E20',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  ctaIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  ctaPrimaryTitle: {
    ...Typography.h3,
    color: '#FFFFFF',
    marginTop: 4,
    fontSize: 16,
  },
  ctaPrimarySubtitle: {
    ...Typography.caption,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
    fontSize: 11,
  },
  ctaBoxSecondary: {
    flex: 1,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
    backdropFilter: 'blur(16px)',
  } as any,
  ctaIconCircleOutline: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  ctaSecondaryTitle: {
    ...Typography.h3,
    marginTop: 4,
    fontSize: 16,
  },
  ctaSecondarySubtitle: {
    ...Typography.caption,
    marginTop: 2,
    fontSize: 11,
  },
  samplesSection: {
    marginTop: Spacing.sm,
  },
  samplesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  samplesHeader: {
    ...Typography.bodyBold,
  },
  samplesSub: {
    ...Typography.caption,
    marginTop: 3,
    marginBottom: Spacing.md,
  },
  samplesScroll: {
    gap: 12,
    paddingRight: 16,
  },
  sampleCard: {
    width: 145,
    borderRadius: Radius.card,
    padding: 10,
    borderWidth: 1,
    position: 'relative',
    backdropFilter: 'blur(12px)',
  } as any,
  sampleThumb: {
    width: '100%',
    height: 95,
    borderRadius: Radius.image,
    backgroundColor: '#E0E0E0',
    marginBottom: 8,
  },
  sampleTapBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: 'rgba(27, 94, 32, 0.85)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.chip,
  },
  sampleTapText: {
    ...Typography.captionBold,
    color: '#FFFFFF',
    fontSize: 9,
    letterSpacing: 0.4,
  },
  sampleName: {
    ...Typography.captionBold,
    fontSize: 12,
  },
  sampleDesc: {
    ...Typography.caption,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 14,
  },
  optionsBlock: {
    borderRadius: Radius.card,
    padding: Spacing.md,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionLabel: {
    ...Typography.bodyBold,
  },
  optionSub: {
    ...Typography.caption,
    marginTop: 2,
    marginRight: 10,
    lineHeight: 15,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.chip,
  },
  toggleText: {
    ...Typography.captionBold,
    fontSize: 11,
  },
  bottomFixedBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.screenPadding,
    borderTopWidth: 1,
    backdropFilter: 'blur(16px)',
  } as any,
});
