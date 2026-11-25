import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import reactHooks from "eslint-plugin-react-hooks";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // ESLint 9 requires a rule's plugin in the same config object, so the
    // override has to carry the plugin that eslint-config-next registered.
    plugins: { "react-hooks": reactHooks },
    rules: {
      // We intentionally read browser-only state (localStorage) and fetch data
      // on mount inside useEffect, then setState. That's the correct SSR-safe
      // pattern here, so downgrade React 19's strict effect rule to a warning.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated Prisma client — not our code to lint.
    "src/generated/**",
    // Agent skills and their helper scripts — tooling, not app code.
    ".agents/**",
    // Android build intermediates (generated Capacitor bridge files).
    "android/**/build/**",
    // iOS build intermediates (if ever added).
    "ios/**/build/**",
    "ios/Pods/**",
  ]),
]);

export default eslintConfig;
