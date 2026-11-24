export interface ThemeColors {
  primary: string;
  secondary: string;
}
export interface ThemeFavorite extends ThemeColors {
  name: string;
}
export const DEFAULT_THEME: ThemeColors = {
  primary: "#211f1d",
  secondary: "#ff851b",
};
export const DEFAULT_FAVORITES: ThemeFavorite[] = [
  { ...DEFAULT_THEME, name: "Klar · Bernstein" },
  { primary: "#1d252c", secondary: "#62c6f5", name: "Nord · Eisblau" },
  { primary: "#202a24", secondary: "#a9d977", name: "Wald · Limette" },
  { primary: "#292231", secondary: "#c8a1fa", name: "Abend · Lavendel" },
  { primary: "#2c2225", secondary: "#ff9aaa", name: "Rosé · Koralle" },
];
const rgb = (hex: string) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
export function mix(a: string, b: string, amount: number): string {
  const x = rgb(a),
    y = rgb(b);
  return (
    "#" +
    x
      .map((v, i) =>
        Math.round(v + (y[i] - v) * amount)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
function luminance(hex: string): number {
  return rgb(hex)
    .map((v) => {
      const n = v / 255;
      return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
    })
    .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
}
export function contrast(a: string, b: string): number {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function themePalette(theme: ThemeColors) {
  let bg = theme.primary;
  // Keep every selectable primary color within the dark design's safe range.
  while (luminance(bg) > 0.025) bg = mix(bg, "#000000", 0.08);
  const panel = mix(bg, "#ffffff", 0.035),
    raised = mix(bg, "#ffffff", 0.075);
  let accent = theme.secondary;
  while (contrast(accent, raised) < 4.5) accent = mix(accent, "#ffffff", 0.08);
  let muted = mix(raised, "#ffffff", 0.68);
  while (contrast(muted, raised) < 4.5) muted = mix(muted, "#ffffff", 0.08);
  return {
    bg,
    panel,
    raised,
    border: mix(raised, "#ffffff", 0.35),
    muted,
    text: "#f5f0e9",
    accent,
    onAccent:
      contrast("#000000", accent) >= contrast("#ffffff", accent)
        ? "#000000"
        : "#ffffff",
  };
}
export function themeVariables(theme: ThemeColors): Record<string, string> {
  const p = themePalette(theme);
  const custom =
    theme.primary.toLowerCase() !== DEFAULT_THEME.primary ||
    theme.secondary.toLowerCase() !== DEFAULT_THEME.secondary;
  return {
    "--bg": p.bg,
    "--panel": p.panel,
    "--raised": p.raised,
    "--border": p.border,
    "--muted": p.muted,
    "--text": p.text,
    "--orange": p.accent,
    "--on-accent": p.onAccent,
    ...(custom
      ? {
          "--theme-bg": p.bg,
          "--theme-panel": p.panel,
          "--theme-raised": p.raised,
          "--theme-border": p.border,
          "--theme-muted": p.muted,
          "--theme-text": p.text,
          "--theme-accent": p.accent,
          "--theme-on-accent": p.onAccent,
          "--theme-tint": mix(p.panel, p.accent, 0.14),
        }
      : {}),
  };
}

export function applyTheme(theme: ThemeColors): void {
  const root = document.documentElement;
  for (const key of Array.from(root.style))
    if (key.startsWith("--theme-")) root.style.removeProperty(key);
  const values = themeVariables(theme);
  // Retain the original palette exactly for the original favorite.
  if (
    theme.primary.toLowerCase() === DEFAULT_THEME.primary &&
    theme.secondary.toLowerCase() === DEFAULT_THEME.secondary
  ) {
    for (const key of [
      "--bg",
      "--panel",
      "--raised",
      "--border",
      "--muted",
      "--text",
      "--orange",
      "--on-accent",
    ])
      root.style.removeProperty(key);
  } else
    for (const [key, value] of Object.entries(values))
      root.style.setProperty(key, value);
}
