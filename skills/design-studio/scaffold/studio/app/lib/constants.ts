import { Monitor, Tablet, Smartphone } from "lucide-react";
import type { Color } from "./types";

// ---------------------------------------------------------------------------
// Shared filter/display constants (used by bank, filter-bar, boards)
// ---------------------------------------------------------------------------

export const COLORS: Color[] = [
  "red", "blue", "emerald", "amber", "purple", "pink", "gray",
];

export const KIND_OPTIONS = [
  { value: "observation", label: "Observation" },
  { value: "question", label: "Question" },
  { value: "principle", label: "Principle" },
  { value: "reference", label: "Reference" },
] as const;

export const IMPORTANCE_OPTIONS = [
  { value: "signal", label: "Signal" },
  { value: "assumption", label: "Assumption" },
  { value: "guiding", label: "Guiding" },
  { value: "foundational", label: "Foundational" },
  { value: "invalidated", label: "Invalidated" },
] as const;

/** Device presets for the prototype viewer. */
export const DEVICE_PRESETS = {
  desktop: { width: 1440, height: 900, label: "Desktop" },
  laptop: { width: 1280, height: 800, label: "Laptop" },
  tablet: { width: 1024, height: 768, label: "Tablet" },
  mobile: { width: 390, height: 844, label: "Mobile" },
} as const;

export type DevicePreset = keyof typeof DEVICE_PRESETS;

export const DEVICE_ICONS: Record<DevicePreset, typeof Monitor> = {
  desktop: Monitor,
  laptop: Monitor,
  tablet: Tablet,
  mobile: Smartphone,
};
