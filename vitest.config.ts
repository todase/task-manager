import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Stage 2: Tests added incrementally; allow zero tests until test files are created
    passWithNoTests: true,
  },
})
