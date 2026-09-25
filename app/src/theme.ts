// TreeVision Theme System
// Implements app-design.md §4 (Colors, Typography, Spacing, Radius)

export const Colors = {
  light: {
    primary: '#1B5E20',       // Green 900 (CTA, active tab, links)
    primaryLight: '#E8F5E9',  // Card bg, chip bg, active tint
    primaryDark: '#0D3810',   // Deep green
    accent: '#FF8F00',        // Amber 800 (Low-confidence warning, Grad-CAM)
    accentLight: '#FFF8E1',   // Amber light bg
    surface: '#FFFFFF',       // Card & sheet surface
    background: '#F6F7F4',    // Screen background
    text: '#1A1C19',          // Primary high-contrast text
    muted: '#5F6368',         // Secondary helper text
    border: '#E0E3DC',        // Dividers, inputs, subtle borders
    error: '#BA1A1A',         // Quality-check reject
    errorLight: '#FFEDEA',    // Error chip bg
    success: '#2E7D32',       // High confidence badge
    successLight: '#E8F5E9',  // High confidence chip bg
    cardShadow: 'rgba(0, 0, 0, 0.08)',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  dark: {
    primary: '#4CAF50',       // Lighter green for dark mode contrast
    primaryLight: '#1B351E',  // Dark tint bg
    primaryDark: '#1B5E20',
    accent: '#FFB300',        // Amber
    accentLight: '#3E2D08',
    surface: '#1E211E',       // Dark card surface
    background: '#121412',    // Dark screen bg
    text: '#E2E5E0',          // High-contrast light text
    muted: '#9AA096',         // Secondary muted text
    border: '#2C312B',        // Subtle border in dark mode
    error: '#FFB4AB',
    errorLight: '#410002',
    success: '#81C784',
    successLight: '#153518',
    cardShadow: 'rgba(0, 0, 0, 0.35)',
    overlay: 'rgba(0, 0, 0, 0.75)',
  },
};

export const Spacing = {
  unit: 4,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  screenPadding: 16,
  cardGap: 12,
  sectionGap: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  chip: 999,
  image: 12,
  button: 12,
  card: 16,
  modal: 24,
};

export const Typography = {
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 22,
    fontWeight: '700' as const,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  bodyBold: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  captionBold: {
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
  },
  mono: {
    fontSize: 12,
    fontWeight: '500' as const,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
};

export const Shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHover: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  floatButton: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
};
