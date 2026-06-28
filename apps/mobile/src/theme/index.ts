/**
 * Umuturanyi design tokens — derived from the original design brief.
 * Warm and playful, but practical and trustworthy.
 */
export const palette = {
  orange: "#EF6320",
  orangeDark: "#C5571A",
  orangeSoft: "#FCEAD9",
  green: "#1E9E57",
  greenSoft: "#E4F5EC",
  ink: "#211C16",
  sun: "#F6C544",
  sky: "#2293C9",

  // Neutrals / surfaces
  bg: "#FFFFFF",
  bgWarm: "#FBF7F0",
  surface: "#FFFFFF",
  surfaceAlt: "#F4EEE4",
  surfaceMuted: "#F4EFE7",
  border: "#F0EAE0",
  borderStrong: "#E6DFD3",

  // Text
  textPrimary: "#211C16",
  textSecondary: "#5C544A",
  textMuted: "#A39A8B",
  textFaint: "#BCB3A4",

  white: "#FFFFFF",
  danger: "#D7263D",
} as const;

export const gradients = {
  poster: ["#FFF4E8", "#FDE6CC", "#F8D6AF"] as const,
  warm: ["#FFE6CA", "#F4C79C"] as const,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
  card: 18,
} as const;

export const font = {
  display: "System", // swap to "Baloo2" once expo-font loads it
  body: "System", // swap to "PlusJakartaSans"
} as const;

export const text = {
  h1: { fontSize: 28, fontWeight: "800", color: palette.textPrimary, letterSpacing: -0.3 },
  h2: { fontSize: 21, fontWeight: "800", color: palette.textPrimary },
  h3: { fontSize: 17, fontWeight: "700", color: palette.textPrimary },
  title: { fontSize: 16, fontWeight: "600", color: palette.textPrimary },
  body: { fontSize: 14, fontWeight: "500", color: palette.textSecondary },
  label: { fontSize: 13, fontWeight: "600", color: palette.textPrimary },
  caption: { fontSize: 12.5, fontWeight: "500", color: palette.textMuted },
  price: { fontSize: 18, fontWeight: "800", color: palette.textPrimary },
} as const;

export const shadow = {
  card: {
    shadowColor: "#1E140A",
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  fab: {
    shadowColor: palette.orange,
    shadowOpacity: 0.38,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
} as const;

export const theme = { palette, gradients, spacing, radius, font, text, shadow };
export type Theme = typeof theme;
