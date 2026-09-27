import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Radius, Typography, Spacing, Shadows } from '../../theme';
import { AppHeader } from '../../components/AppHeader';
import { PrimaryButton, GhostButton } from '../../components/Buttons';
import { ImageQualityHint } from '../../components/ImageQualityHint';
import { predictTree, SAMPLE_TEST_LEAVES, isOrtNativeAvailable, isExpoGo, getOrtDiagnostics, resetStagedModel, resolveSampleUri } from '../../services/inference';
import { TreeScanIcon } from '../../components/TreeIcons';

export default function IdentifyScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const [selectedUri, setSelectedUri] = useState<string | null>(null);
  const [isInferring, setIsInferring] = useState<boolean>(false);
  const [inferPhase, setInferPhase] = useState<'idle' | 'model' | 'inference'>('idle');
  const [downloadFrac, setDownloadFrac] = useState<number | null>(null);
  const [qualityWarning, setQualityWarning] = useState<string | null>(null);
  const [inferError, setInferError] = useState<string | null>(null);
  const [modelNotice, setModelNotice] = useState<string | null>(null);

  const nativeAvailable = isOrtNativeAvailable();
  const diag = getOrtDiagnostics();
  const diagLine =
    `diag: expoGo=${diag.isExpoGo} env=${diag.executionEnvironment} ` +
    `owner=${diag.appOwnership} native=${diag.hasNativeModule} install=${diag.hasInstallFn}`;

  // Resolve bundled sample photos to local URIs once (works offline,
  // in dev builds and release builds alike).
  const [sampleUris, setSampleUris] = useState<Record<string, string>>({});
  useEffect(() => {
    (async () => {
      const entries: Record<string, string> = {};
      await Promise.all(
        SAMPLE_TEST_LEAVES.map(async (s) => {
          const uri = await resolveSampleUri(s.speciesId);
          if (uri) entries[s.speciesId] = uri;
        })
      );
      setSampleUris(entries);
    })();
  }, []);

  // Indeterminate progress animation for the model phase when total size
  // is unknown (release builds stage the embedded model locally).
  const [indeterminateX] = useState(() => new Animated.Value(0));
  const showIndeterminate = isInferring && inferPhase === 'model' && downloadFrac === null;
  useEffect(() => {
    if (!showIndeterminate) return;
    indeterminateX.setValue(0);
    const loop = Animated.loop(
      Animated.timing(indeterminateX, {
        toValue: 1,
        duration: 1200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [showIndeterminate, indeterminateX]);

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
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setSelectedUri(result.assets[0].uri);
        setQualityWarning(null);
        setInferError(null);
        setModelNotice(null);
      }
    } catch (e) {
      console.warn('Camera error:', e);
      Alert.alert('Camera Failed', 'Could not capture a photo. Please try again.');
    }
  };

  // Pick photo from device gallery
  const handlePickGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setSelectedUri(result.assets[0].uri);
        setQualityWarning(null);
        setInferError(null);
        setModelNotice(null);
      }
    } catch (e) {
      console.warn('Picker error:', e);
      Alert.alert('Gallery Failed', 'Could not load the selected photo. Please try again.');
    }
  };

  const handleSelectSample = (sample: typeof SAMPLE_TEST_LEAVES[0]) => {
    // Bundled real dataset photo, resolved to a local file URI on mount.
    const uri = sampleUris[sample.speciesId];
    if (!uri) return;
    setSelectedUri(uri);
    setQualityWarning(null);
    setInferError(null);
    setModelNotice(null);
  };

  // Run on-device inference with laser animation.
  // No alerts here: when the native ONNX engine is absent (Expo Go / web)
  // show an inline note instead of throwing, and surface genuine failures
  // inline too so identification never pops an error dialog.
  const handleIdentify = async () => {
    if (!selectedUri) return;

    if (!isOrtNativeAvailable()) {
      setInferError(
        'On-device AI needs the native TreeVision build. This preview runs in Expo Go, ' +
          'which cannot load the ONNX engine — install the release APK to run identification.'
      );
      return;
    }

    try {
      setIsInferring(true);
      setInferPhase('model');
      setInferError(null);
      setModelNotice(null);
      setDownloadFrac(null);
      const prediction = await predictTree(selectedUri, {
        onPhase: (phase) => setInferPhase(phase),
        onModelDownload: (written, total) =>
          setDownloadFrac(total && total > 0 ? Math.min(1, written / total) : null),
      });

      router.push({
        pathname: '/result',
        params: {
          predictionData: JSON.stringify(prediction),
        },
      });
    } catch (error) {
      console.error('Inference error:', error);
      setInferError(error instanceof Error ? error.message : 'An error occurred running the model.');
    } finally {
      setIsInferring(false);
      setInferPhase('idle');
      setDownloadFrac(null);
    }
  };

  const handleRetake = () => {
    setSelectedUri(null);
    setQualityWarning(null);
    setInferError(null);
    setModelNotice(null);
  };

  // Failure recovery: wipe the staged model/session and re-run, which
  // re-stages (re-downloads) the model from the bundle and reloads it.
  // The model-phase progress pill (spinner + progress bar) shows while staging.
  const handleRetryDownload = async () => {
    if (!selectedUri || isInferring) return;
    setInferError(null);
    setModelNotice(null);
    await resetStagedModel();
    await handleIdentify();
  };

  // Storage management: delete the staged model copy to free space.
  // It downloads again automatically on the next Run.
  const handleRemoveModel = async () => {
    if (isInferring) return;
    const freed = await resetStagedModel();
    setInferError(null);
    setModelNotice(
      freed > 0
        ? `Downloaded model removed (${(freed / 1048576).toFixed(1)} MB freed). It will download again on the next Run.`
        : 'No downloaded model found — nothing to remove.'
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <AppHeader
        title="Botanical Scanner"
        subtitle={nativeAvailable ? "ONNX MobileNetV3 (On-Device)" : isExpoGo ? "Expo Go Preview Mode" : "Native Engine Missing"}
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
              {isInferring && inferPhase !== 'model' && (
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

              {/* Model-download progress (first run only; staged afterwards) */}
              {isInferring && inferPhase === 'model' && (
                <View style={styles.downloadPill}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <View style={styles.downloadTextWrap}>
                    <Text style={styles.downloadText}>
                      {downloadFrac !== null
                        ? `Downloading AI model… ${Math.round(downloadFrac * 100)}%`
                        : 'Preparing AI model…'}
                    </Text>
                    <View style={styles.downloadTrack}>
                      {downloadFrac !== null ? (
                        <View style={[styles.downloadFill, { width: `${Math.round(downloadFrac * 100)}%` }]} />
                      ) : (
                        <Animated.View
                          style={[
                            styles.indeterminateFill,
                            {
                              left: indeterminateX.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['-30%', '100%'],
                              }),
                            },
                          ]}
                        />
                      )}
                    </View>
                  </View>
                </View>
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

            {/* Inline inference status — replaces the old error alert */}
            {inferError ? (
              <View
                style={[
                  styles.errorCard,
                  {
                    backgroundColor: isDark ? 'rgba(66, 20, 20, 0.85)' : 'rgba(253, 237, 237, 0.95)',
                    borderColor: isDark ? 'rgba(229, 115, 115, 0.4)' : 'rgba(198, 40, 40, 0.25)',
                  },
                ]}
              >
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle" size={18} color="#E53935" style={{ marginRight: 8 }} />
                  <Text style={[styles.errorText, { color: colors.text }]}>{inferError}</Text>
                </View>
                {!nativeAvailable ? (
                  <Text style={[styles.diagText, { color: colors.muted }]}>{diagLine}</Text>
                ) : null}
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={handleRemoveModel}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="trash-outline" size={14} color="#E53935" style={{ marginRight: 6 }} />
                    <Text style={styles.removeText}>Remove model</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={handleRetryDownload}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="download-outline" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.retryText}>Re-download model & retry</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {/* Green confirmation note (e.g. after removing the model) */}
            {modelNotice && !inferError ? (
              <View
                style={[
                  styles.errorCard,
                  {
                    backgroundColor: isDark ? 'rgba(20, 46, 24, 0.85)' : 'rgba(232, 245, 233, 0.95)',
                    borderColor: isDark ? 'rgba(76, 175, 80, 0.35)' : 'rgba(46, 125, 50, 0.25)',
                  },
                ]}
              >
                <View style={styles.errorRow}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                  <Text style={[styles.errorText, { color: colors.text }]}>{modelNotice}</Text>
                </View>
              </View>
            ) : null}
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
                    {sampleUris[sample.speciesId] ? (
                      <Image source={{ uri: sampleUris[sample.speciesId] }} style={styles.sampleThumb} resizeMode="cover" />
                    ) : (
                      <View style={[styles.sampleThumb, styles.sampleThumbPlaceholder]}>
                        <ActivityIndicator size="small" color={colors.primary} />
                      </View>
                    )}
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
  errorCard: {
    padding: Spacing.md,
    borderRadius: Radius.card,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    ...Typography.caption,
    flex: 1,
    lineHeight: 18,
  },
  diagText: {
    fontFamily: 'monospace',
    fontSize: 10,
    marginTop: 8,
    lineHeight: 14,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B5E20',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.chip,
  },
  retryText: {
    ...Typography.captionBold,
    color: '#FFFFFF',
    fontSize: 12,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.chip,
    borderWidth: 1,
    borderColor: 'rgba(198, 40, 40, 0.5)',
  },
  removeText: {
    ...Typography.captionBold,
    color: '#E53935',
    fontSize: 12,
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
  downloadPill: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.chip,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  downloadTextWrap: {
    flex: 1,
    marginLeft: 8,
  },
  downloadText: {
    ...Typography.captionBold,
    color: '#FFFFFF',
    fontSize: 11,
  },
  downloadTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginTop: 5,
    overflow: 'hidden',
  },
  downloadFill: {
    height: '100%',
    backgroundColor: '#10B981',
  },
  indeterminateFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '30%',
    backgroundColor: '#10B981',
    borderRadius: 2,
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
  sampleThumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
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
