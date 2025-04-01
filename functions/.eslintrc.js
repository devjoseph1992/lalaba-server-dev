module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "google",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["./tsconfig.json"],
    sourceType: "module",
  },
  ignorePatterns: [".eslintrc.js", "/lib/**/*", "/generated/**/*"],
  plugins: ["@typescript-eslint", "import"],
  rules: {
    quotes: ["error", "double", { avoidEscape: true }], // ✅ Enforce double quotes
    indent: ["error", 2], // ✅ Fix indentation errors
    "max-len": ["error", { code: 180 }],
    "new-cap": ["error", { capIsNew: false }],
    "require-jsdoc": "off",
    "valid-jsdoc": "off",
    "object-curly-spacing": ["error", "always"],
    "import/no-unresolved": 0,
    "quote-props": ["error", "as-needed"], // ✅ Prevent unnecessary quoted properties
  },
};