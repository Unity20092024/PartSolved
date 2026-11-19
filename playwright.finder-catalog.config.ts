import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({
  ...base,
  testMatch: "finder-catalog.spec.ts",
  expect: { timeout: 10000 },
  outputDir: "artifacts/finder-catalog/test-results",
  use: { ...base.use, baseURL: "http://127.0.0.1:3300" },
  webServer: undefined,
});
