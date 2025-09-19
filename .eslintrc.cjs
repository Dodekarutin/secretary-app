/* eslint-env node */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "react-refresh"],
  env: { browser: true, es2021: true, node: true },
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  settings: { react: { version: "detect" } },
  rules: {
    quotes: ["error", "double"],
    semi: ["error", "never"],
    indent: ["error", 2, { SwitchCase: 1 }],
    "react-refresh/only-export-components": "warn",
  },
  ignorePatterns: ["dist", "node_modules"],
};
