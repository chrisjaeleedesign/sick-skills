import { Monitor, Tablet, Smartphone } from "lucide-react";

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
