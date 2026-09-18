export const DICEBEAR_STYLES = [
  { id: "fun-emoji", label: "Emoji" },
  { id: "avataaars", label: "Cartoon" },
  { id: "bottts", label: "Robots" },
  { id: "pixel-art", label: "Pixel" },
  { id: "adventurer", label: "Adventurer" },
  { id: "lorelei", label: "Lorelei" },
  { id: "dylan", label: "Dylan" },
  { id: "rings", label: "Rings" },
  { id: "shapes", label: "Shapes" },
  { id: "thumbs", label: "Thumbs" },
] as const;

export type DicebearStyleId = (typeof DICEBEAR_STYLES)[number]["id"];

const STYLE_IDS = new Set<string>(DICEBEAR_STYLES.map((style) => style.id));

/** Soft pastel backgrounds so line-art styles stay visible and colorful. */
export const AVATAR_BACKGROUND_COLORS = [
  "b6e3f4",
  "c0aede",
  "d1d4f9",
  "ffd5dc",
  "ffdfbf",
  "c1f4c5",
  "fce1a8",
  "a0e7e5",
] as const;

export function isDicebearStyleId(value: string): value is DicebearStyleId {
  return STYLE_IDS.has(value);
}

/** Stable seeds so the picker grid is consistent across reloads. */
export const AVATAR_PICKER_SEEDS = [
  "amber",
  "blake",
  "casey",
  "drew",
  "eden",
  "finch",
  "gray",
  "haven",
  "indigo",
  "jules",
  "kai",
  "lane",
  "morgan",
  "nova",
  "oak",
  "pine",
  "quinn",
  "river",
] as const;

export function buildDicebearAvatarUrl(
  style: DicebearStyleId,
  seed: string,
  size = 128,
): string {
  const params = new URLSearchParams({
    seed,
    size: String(size),
    // Comma-separated list → DiceBear picks one from the seed (colorful + opaque).
    backgroundColor: AVATAR_BACKGROUND_COLORS.join(","),
    radius: "50",
  });
  // SVG has a higher rate limit than PNG and scales cleanly in the picker.
  return `https://api.dicebear.com/9.x/${style}/svg?${params.toString()}`;
}
