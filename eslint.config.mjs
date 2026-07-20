import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    ".next_old*/**",
    "src/app/(dashboard)/**",
    "src/app/vendor/sales/record/**",
    "src/app/api/cron/**",
    "src/app/api/events/copy/**",
    "src/app/api/notifications/**",
    "src/app/api/notify/**",
    "src/app/api/stripe/invoice/**",
    "src/components/SpaceSelector.tsx",
    "src/components/VendorBottomNav.tsx",
    "src/components/OrganizerSidebarNav.tsx",
    "src/components/organizer/SpaceSettings.tsx",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
