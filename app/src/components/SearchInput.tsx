import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing } from '../theme';

interface SearchInputProps {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Search species by common, Tamil, or scientific name...',
}) => {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <View
      style={[
        styles.searchContainer,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <Ionicons name="search" size={20} color={colors.muted} style={styles.searchIcon} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={[styles.input, { color: colors.text }]}
        clearButtonMode="while-editing"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value ? (
        <TouchableOpacity
          onPress={() => onChange('')}
          accessibilityLabel="Clear search"
          style={styles.clearButton}
        >
          <Ionicons name="close-circle" size={18} color={colors.muted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.button,
    paddingHorizontal: Spacing.md,
    height: 48, // Field-friendly 48dp minimum
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    ...Typography.body,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
});
