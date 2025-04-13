// .eslintrc.js
module.exports = {
    root: true,
    env: {
        es2021: true,
        node: true,
    },
    parser: "@typescript-eslint/parser",
    parserOptions: {
        project: ["./tsconfig.json"],
        tsconfigRootDir: __dirname,
        sourceType: "module",
    },
    ignorePatterns: [".eslintrc.js", "node_modules", "dist", "lib", "build", "/generated/**/*"],
    plugins: ["@typescript-eslint", "import", "prettier"],
    extends: [
        "eslint:recommended",
        "plugin:import/errors",
        "plugin:import/warnings",
        "plugin:import/typescript",
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
        "plugin:prettier/recommended",
        "google",
    ],
    rules: {
        // ✅ Style rules
        quotes: ["error", "double", {avoidEscape: true}],
        indent: ["error", 2],
        "max-len": ["warn", {code: 140}],
        "new-cap": ["error", {capIsNew: false}],
        "require-jsdoc": "off",
        "valid-jsdoc": "off",
        "object-curly-spacing": ["error", "always"],
        "quote-props": ["error", "as-needed"],
        "import/no-unresolved": "off",

        // ✅ TypeScript: relax for production
        "@typescript-eslint/no-unsafe-assignment": "off",
        "@typescript-eslint/no-unsafe-member-access": "off",
        "@typescript-eslint/no-unsafe-argument": "off",
        "@typescript-eslint/no-unsafe-call": "off",
        "@typescript-eslint/restrict-template-expressions": "off",
        "@typescript-eslint/ban-types": "off",

        // ⚠️ Keep useful rules
        "@typescript-eslint/require-await": "warn",
        "@typescript-eslint/no-non-null-assertion": "off",
        "@typescript-eslint/no-floating-promises": "warn",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/ban-ts-comment": "off",
        "@typescript-eslint/explicit-module-boundary-types": "off",
        "@typescript-eslint/no-misused-promises": [
            "error",
            {
                checksVoidReturn: false,
            },
        ],

        // ✅ Prettier: formatting consistency
        "prettier/prettier": [
            "error",
            {
                semi: true,
                singleQuote: false,
                trailingComma: "all",
                printWidth: 100,
                tabWidth: 2,
            },
        ],
    },
};
