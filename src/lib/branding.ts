/**
 * Central branding config. Change these values to rebrand the product.
 */
export const branding = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "FlowBoard",
  tagline: "Move work forward",
  description:
    "A modern project management board for teams that ship. Workspaces, boards, lists, and cards — organized and fast.",
  shortDescription: "Project management boards for modern teams",
} as const;

export type Branding = typeof branding;
