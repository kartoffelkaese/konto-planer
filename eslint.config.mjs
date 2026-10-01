import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";
import { fixupConfigRules } from "@eslint/compat";

/** Legacy-Plugins (z. B. eslint-plugin-react) und ESLint 10 – siehe eslint.org/docs/latest/use/migrate-to-10.0.0 */
export default fixupConfigRules([
  ...coreWebVitals,
  ...typescript,
  {
    ignores: ["ecosystem.config.js"],
  },
  {
    // CommonJS-Dateien (PM2-Einstieg scripts/start-server.cjs, next.config.js) dürfen require() nutzen
    files: ["**/*.cjs", "next.config.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    // Gleicher Geltungsbereich wie eslint-config-next – nur dort sind die Plugins registriert (nicht für .cjs)
    files: ["**/*.{js,jsx,mjs,ts,tsx,mts,cts}"],
    rules: {
      // Strenge React-19-Hooks-Regeln: bestehende Fetch-in-Effect-Patterns schrittweise bereinigen
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/refs": "warn",
      "react/no-unescaped-entities": "warn",
    },
  },
]);
