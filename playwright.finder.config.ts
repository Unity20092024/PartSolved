import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({
  ...base,
  expect: { timeout: 10000 },
  use: { ...base.use, baseURL: "http://127.0.0.1:3200" },
  webServer: {
    command: "npm run start -- --port 3200",
    url: "http://127.0.0.1:3200",
    env: {
      BLOG_ADMIN_ORIGIN: "http://127.0.0.1:3200",
      CATALOG_ADMIN_ORIGIN: "http://127.0.0.1:3200",
      CATALOG_ENABLED: "false",
      CATALOG_WRITES_ENABLED: "false",
    },
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
