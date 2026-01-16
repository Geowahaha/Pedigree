import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
const aiProxyTarget = process.env.VITE_AI_PROXY_TARGET || "https://petdegree.vercel.app";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 3000,
    proxy: {
      "/api": {
        target: aiProxyTarget,
        changeOrigin: true,
        secure: true,
      },
    },
  },
  plugins: [
    react()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          const normalizedId = id.replace(/\\/g, "/");
          if (normalizedId.includes("/node_modules/react/") || normalizedId.includes("/node_modules/react-dom/")) return "react-vendor";
          if (normalizedId.includes("/node_modules/react-router/") || normalizedId.includes("/node_modules/react-router-dom/")) return "router-vendor";
          if (normalizedId.includes("/node_modules/@tanstack/")) return "tanstack-vendor";
          if (normalizedId.includes("/node_modules/@supabase/")) return "supabase-vendor";
          if (normalizedId.includes("/node_modules/@emoji-mart/")) return "emoji-vendor";
          if (normalizedId.includes("/node_modules/@google/generative-ai/")) return "ai-vendor";
          if (normalizedId.includes("/node_modules/tesseract.js/")) return "ocr-vendor";
          if (normalizedId.includes("/node_modules/highlight.js/")) return "highlight-vendor";
          if (normalizedId.includes("/node_modules/marked/")) return "markdown-vendor";
          if (normalizedId.includes("/node_modules/i18next/") || normalizedId.includes("/node_modules/react-i18next/")) return "i18n-vendor";
          if (normalizedId.includes("/node_modules/react-hook-form/")) return "forms-vendor";
          if (normalizedId.includes("/node_modules/date-fns/")) return "date-vendor";
          if (normalizedId.includes("/node_modules/embla-carousel-react/")) return "carousel-vendor";
          if (normalizedId.includes("/node_modules/react-day-picker/")) return "calendar-vendor";
          if (normalizedId.includes("/node_modules/lucide-react/")) return "icons-vendor";
          if (normalizedId.includes("/node_modules/@radix-ui/")) return "radix-vendor";
          if (normalizedId.includes("/node_modules/recharts/")) return "charts-vendor";
          return "vendor";
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
}));
// Re-saving to trigger build
