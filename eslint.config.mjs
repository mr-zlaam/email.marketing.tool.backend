import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config({
  languageOptions: {
    parserOptions: {
      project: true,
      tsconfigRootDir: import.meta.dirname
    }
  },
  files: ["**/*.ts"],
  ignores: ["**/*.test.ts", "**/*.spec.ts", "**/*.test.tsx", "**/*.d.ts", "**/*.script.ts", "**/*.env.ts", "drizzle.config.ts"],
  extends: [eslint.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
  rules: {
    "no-console": "off",
    quotes: ["error", "double", { allowTemplateLiterals: true }],
    eqeqeq: "off",
    "no-unused-vars": "error",
    "@typescript-eslint/consistent-type-imports": [
      "error",
      {
        prefer: "type-imports",
        disallowTypeAnnotations: false
      }
    ],
    "prefer-const": ["error", { ignoreReadBeforeAssign: true }],
    "@typescript-eslint/only-throw-error": "off",
    "prefer-arrow-callback": ["error"],
    camelcase: ["error", { properties: "always" }]
  }
});
