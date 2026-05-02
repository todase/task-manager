import { defineConfig } from "vitest/config"
import tsconfigPaths from "vite-tsconfig-paths"
import path from "path"

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      "next/server": path.resolve(__dirname, "node_modules/next/dist/server/web/exports/index.js"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    setupFiles: ["./src/test-setup.ts"],
    // Stage 2: Tests added incrementally; allow zero tests until test files are created
    passWithNoTests: true,
    server: {
      deps: {
        inline: [/next-auth/],
      },
    },
  },
})
