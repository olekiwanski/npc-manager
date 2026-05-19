import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/supabase.ts", "src/lib/config-status.ts"],
    },
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
