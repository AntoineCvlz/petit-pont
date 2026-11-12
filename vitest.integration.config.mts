import { defineConfig, loadEnv } from "vite";

// Tests d'intégration : nécessitent `supabase start` (base locale uniquement).
export default defineConfig(({ mode }) => ({
  resolve: { tsconfigPaths: true },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
    env: loadEnv(mode, process.cwd(), ""),
  },
}));
