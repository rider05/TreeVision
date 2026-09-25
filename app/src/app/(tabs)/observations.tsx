import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '../../theme';
import { AppHeader } from '../../components/AppHeader';
import { ConfidenceBadge } from '../../components/ConfidenceBadge';
import { EmptyState } from '../../components/EmptyState';
import { getSavedObservations, deleteObservation } from '../../services/storage';
import { Observation } from '../../types';
import { TreeLogbookIcon } from '../../components/TreeIcons';

export default function ObservationsScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const [observations, setObservations] = useState<Observation[]>([]);
  const [filter, setFilter] = useState<'All' | 'Verified' | 'Pending'>('All');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await getSavedObservations();
      setObservations(data);
    } catch (e) {
      console.warn('Failed to load observations:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Remove Observation',
      `Delete ${name} from your local logbook?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteObservation(id);
            setObservations((prev) => prev.filter((o) => o.id !== id));
          },
        },
      ]
    );
  };

  const filteredObservations = observations.filter((obs) => {
    if (filter === 'Verified') return obs.status === 'Verified';
    if (filter === 'Pending') return obs.status === 'Pending Field Review';
    return true;
  });

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <AppHeader
        title="Field Logbook"
        subtitle="Offline Verified Specimen Records"
        right={
          <TouchableOpacity
            onPress={() => router.push('/identify')}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            className="shimmer-button interactive-hover"
          >
            <Ionicons name="camera" size={15} color="#FFFFFF" style={{ marginRight: 5 }} />
            <Text style={styles.addBtnText}>Log New</Text>
          </TouchableOpacity>
        }
      />

      <View style={styles.container}>
        {/* Verification Status Filter Tabs */}
        <View style={styles.filterBar}>
          {(['All', 'Verified', 'Pending'] as const).map((tab) => {
            const isActive = filter === tab;
            return (
              <TouchableOpacity
                key={tab}
                activeOpacity={0.82}
                onPress={() => setFilter(tab)}
                style={[
                  styles.filterTab,
                  {
                    backgroundColor: isActive
                      ? colors.primary
                      : isDark
                      ? 'rgba(26, 36, 28, 0.85)'
                      : 'rgba(255, 255, 255, 0.9)',
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                  isActive && Shadows.card,
                ]}
                className="interactive-hover"
              >
                <Text
                  style={[
                    styles.filterTabText,
                    {
                      color: isActive ? '#FFFFFF' : colors.text,
                      fontWeight: isActive ? '700' : '500',
                    },
                  ]}
                >
                  {tab === 'Pending' ? 'Pending Review' : tab} (
                  {tab === 'All'
                    ? observations.length
                    : tab === 'Verified'
                    ? observations.filter((o) => o.status === 'Verified').length
                    : observations.filter((o) => o.status !== 'Verified').length}
                  )
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Observations List */}
        <FlatList
          data={filteredObservations}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() =>
                router.push({
                  pathname: '/species/[id]',
                  params: { id: item.speciesId },
                })
              }
              style={[
                styles.obsCard,
                {
                  backgroundColor: isDark ? 'rgba(20, 28, 22, 0.85)' : 'rgba(255, 255, 255, 0.9)',
                  borderColor: isDark ? 'rgba(46, 125, 50, 0.28)' : 'rgba(46, 125, 50, 0.14)',
                  backdropFilter: 'blur(12px)',
                } as any,
                Shadows.card,
              ]}
              className="interactive-hover"
            >
              <Image source={{ uri: item.imageUri }} style={styles.obsThumb} resizeMode="cover" />

              <View style={styles.obsContent}>
                <View style={styles.obsTopRow}>
                  <Text style={[styles.obsTitle, { color: colors.text }]} numberOfLines={1}>
                    {item.commonName}
                  </Text>
                  <ConfidenceBadge value={item.confidence} size="sm" />
                </View>

                {item.tamilName ? (
                  <Text style={[styles.obsTamil, { color: colors.primary }]}>
                    {item.tamilName}
                  </Text>
                ) : null}

                <Text style={[styles.obsSci, { color: colors.muted }]} numberOfLines={1}>
                  {item.scientificName}
                </Text>

                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={12} color={colors.primary} />
                  <Text style={[styles.metaText, { color: colors.muted }]} numberOfLines={1}>
                    {item.locationName}
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <Ionicons name="time-outline" size={12} color={colors.muted} />
                  <Text style={[styles.metaText, { color: colors.muted }]}>
                    {formatDate(item.timestamp)}
                  </Text>
                </View>

                {/* Status chip */}
                <View style={styles.statusRow}>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor:
                          item.status === 'Verified'
                            ? isDark
                              ? '#143818'
                              : colors.primaryLight
                            : isDark
                            ? '#3A2800'
                            : colors.accentLight,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor:
                            item.status === 'Verified' ? colors.success : colors.accent,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            item.status === 'Verified' ? colors.success : colors.accent,
                        },
                      ]}
                    >
                      {item.status}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleDelete(item.id, item.commonName)}
                    style={styles.deleteBtn}
                  >
                    <Ionicons name="trash-outline" size={15} color={colors.muted} />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="bookmark-outline"
              title="No Observations Logged"
              message={
                filter === 'All'
                  ? 'Your field logbook is empty. Snap a photo of a leaf or tree canopy in Coimbatore to record your first specimen.'
                  : `No observations found with status "${filter}".`
              }
              actionTitle="Identify a Tree"
              onAction={() => router.push('/identify')}
            />
          }
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
  container: {
    flex: 1,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: Radius.chip,
  },
  addBtnText: {
    ...Typography.captionBold,
    color: '#FFFFFF',
    fontSize: 12,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: Spacing.sm,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.chip,
    borderWidth: 1,
  },
  filterTabText: {
    ...Typography.caption,
    fontSize: 12,
  },
  listContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 8,
    paddingBottom: 40,
  },
  obsCard: {
    flexDirection: 'row',
    borderRadius: Radius.card,
    padding: Spacing.md,
    borderWidth: 1,
  },
  obsThumb: {
    width: 80,
    height: 96,
    borderRadius: Radius.image,
    backgroundColor: '#E0E0E0',
  },
  obsContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  obsTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  obsTitle: {
    ...Typography.bodyBold,
    fontSize: 15,
    flex: 1,
    marginRight: 6,
  },
  obsTamil: {
    ...Typography.captionBold,
    marginTop: 1,
    fontSize: 11,
  },
  obsSci: {
    ...Typography.caption,
    fontStyle: 'italic',
    marginTop: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  metaText: {
    ...Typography.caption,
    marginLeft: 4,
    fontSize: 11,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.chip,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 5,
  },
  statusText: {
    ...Typography.captionBold,
    fontSize: 10,
  },
  deleteBtn: {
    padding: 4,
  },
});
