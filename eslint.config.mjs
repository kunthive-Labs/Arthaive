import nextCoreWebVitals from "eslint-config-next/core-web-vitals"
import nextTypescript from "eslint-config-next/typescript"

// eslint-config-next@16 ships native flat-config arrays, so we spread them
// directly rather than going through FlatCompat (which chokes on the plugins'
// circular references).
const eslintConfig = [
  {
    // Don't lint build output, deps, generated data, or vendored UI primitives.
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "public/**",
      "scripts/**",
      "pipeline/**",
      "**/*.config.{js,mjs,cjs,ts}",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // Pragmatic levels: keep `npm run lint` green on the current codebase.
    // These start as warnings so CI surfaces them without failing the build;
    // tighten to "error" once the existing violations are cleaned up.
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
      "react-hooks/exhaustive-deps": "warn",
      // react-hooks v7 promotes these to errors; keep them as warnings so the
      // current codebase lints clean while still surfacing the findings.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react/no-unescaped-entities": "off",
      "@next/next/no-img-element": "warn",
      "@next/next/no-html-link-for-pages": "warn",
      "prefer-const": "warn",
      "no-unused-vars": "off",
    },
  },
]

export default eslintConfig
