import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";
import { fixupConfigRules } from "@eslint/compat";

/** Legacy-Plugins (z. B. eslint-plugin-react) und ESLint 10 – siehe eslint.org/docs/latest/use/migrate-to-10.0.0 */
export default fixupConfigRules([...coreWebVitals, ...typescript]);
