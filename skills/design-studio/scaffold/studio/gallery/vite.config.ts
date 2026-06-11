import { defineConfig } from "vite";
import path from "node:path";

const STUDIO = path.resolve(import.meta.dirname, "..");

export default defineConfig({
  resolve: {
    alias: {
      // The app/ components were written for Next; these shims let them
      // compile unchanged.
      "next/link": path.resolve(import.meta.dirname, "src/next-shim/link.tsx"),
      "next/navigation": path.resolve(import.meta.dirname, "src/next-shim/navigation.tsx"),
      "@": STUDIO,
    },
  },
  build: {
    outDir: path.join(STUDIO, "dist", "gallery"),
    emptyOutDir: true,
  },
});
