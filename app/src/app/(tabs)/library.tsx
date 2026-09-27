import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '../../theme';
import { AppHeader } from '../../components/AppHeader';
import { SearchInput } from '../../components/SearchInput';
import { SpeciesCard } from '../../components/SpeciesCard';
import { EmptyState } from '../../components/EmptyState';
import { getIdentifiableTrees, searchIdentifiableTrees } from '../../services/inference';
import { LibraryFilter, TreeSpecies } from '../../types';
import { ForestGroveIcon } from '../../components/TreeIcons';

const FILTER_CHIPS: LibraryFilter[] = ['All', 'Common', 'Western Ghats', 'Thin'];

export default function LibraryScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<LibraryFilter>('All');

  const allTrees = useMemo(() => getIdentifiableTrees(), []);
  const thinCount = useMemo(() => allTrees.filter((t) => t.isThin).length, [allTrees]);

  const filteredTrees = useMemo(() => {
    return searchIdentifiableTrees(searchQuery, activeFilter);
  }, [searchQuery, activeFilter]);

  const handleCardPress = (tree: TreeSpecies) => {
    router.push({
      pathname: '/species/[id]',
      params: { id: tree.id },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <AppHeader
        title="Botanical Tree Atlas"
        subtitle={`${allTrees.length} Native & Forest Species Catalog`}
      />

      <View style={styles.container}>
        {/* Sticky Search & Filter Header with Glassmorphism */}
        <View
          style={[
            styles.headerControls,
            {
              backgroundColor: isDark ? 'rgba(15, 23, 17, 0.85)' : 'rgba(255, 255, 255, 0.88)',
              borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(46, 125, 50, 0.12)',
              backdropFilter: 'blur(16px)',
            } as any,
          ]}
        >
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by Tamil, Common, or Binomial name..."
          />

          {/* Counts & Statistics Sublabel */}
          <View style={styles.countRow}>
            <View style={styles.countLeft}>
              <View style={styles.forestTreeIconWrap}>
                <ForestGroveIcon size={16} color={colors.primary} focused={true} />
              </View>
              <Text style={[styles.countText, { color: colors.muted }]}>
                {allTrees.length} Cataloged Species • {thinCount} Thin (&lt;50 img)
              </Text>
            </View>

            {searchQuery ? (
              <View style={[styles.matchBadge, { backgroundColor: isDark ? '#143818' : colors.primaryLight }]}>
                <Text style={[styles.matchText, { color: colors.primary }]}>
                  {filteredTrees.length} Matches
                </Text>
              </View>
            ) : null}
          </View>

          {/* Interactive Filter Chips with Hover Effects */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {FILTER_CHIPS.map((chip) => {
              const isSelected = activeFilter === chip;
              return (
                <TouchableOpacity
                  key={chip}
                  activeOpacity={0.82}
                  onPress={() => setActiveFilter(chip)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected
                        ? colors.primary
                        : isDark
                        ? 'rgba(26, 36, 28, 0.85)'
                        : 'rgba(255, 255, 255, 0.9)',
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                    isSelected && Shadows.card,
                  ]}
                  className="interactive-hover"
                >
                  {chip === 'Western Ghats' && (
                    <Ionicons
                      name="leaf"
                      size={12}
                      color={isSelected ? '#FFFFFF' : colors.primary}
                      style={{ marginRight: 4 }}
                    />
                  )}
                  {chip === 'Thin' && (
                    <Ionicons
                      name="alert-circle-outline"
                      size={12}
                      color={isSelected ? '#FFFFFF' : colors.accent}
                      style={{ marginRight: 4 }}
                    />
                  )}
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: isSelected ? '#FFFFFF' : colors.text,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {chip}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* FlatList of SpeciesCard */}
        <FlatList
          data={filteredTrees}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          windowSize={5}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          renderItem={({ item }) => (
            <SpeciesCard tree={item} onPress={() => handleCardPress(item)} />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="search-outline"
              title="No Species Found"
              message={`No match for "${searchQuery}" in ${activeFilter}. Try searching by genus or scientific name.`}
              actionTitle="Reset All Filters"
              onAction={() => {
                setSearchQuery('');
                setActiveFilter('All');
              }}
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
  headerControls: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 8,
  },
  countLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  forestTreeIconWrap: {
    marginRight: 6,
  },
  countText: {
    ...Typography.captionBold,
    letterSpacing: 0.2,
    fontSize: 11,
  },
  matchBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.chip,
  },
  matchText: {
    ...Typography.captionBold,
    fontSize: 11,
  },
  filterRow: {
    gap: 8,
    paddingBottom: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.chip,
    borderWidth: 1,
  },
  chipText: {
    ...Typography.caption,
    fontSize: 12,
  },
  listContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 12,
    paddingBottom: 40,
  },
});
