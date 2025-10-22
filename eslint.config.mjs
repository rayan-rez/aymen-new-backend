// eslint.config.mjs
import eslintPluginTypeScript from "@typescript-eslint/eslint-plugin";
import eslintParserTypeScript from "@typescript-eslint/parser";

export default [
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"], // Apply to these file types
    languageOptions: {
      parser: eslintParserTypeScript,
      parserOptions: {
        project: "./tsconfig.json", // Path to your tsconfig.json
      },
    },
    plugins: {
      "@typescript-eslint": eslintPluginTypeScript,
    },
    rules: {
      ...eslintPluginTypeScript.configs.recommended.rules, // Apply recommended TypeScript rules
      // Add or override specific rules here
      // 'indent': ['error', 2],
    },
  },
];
