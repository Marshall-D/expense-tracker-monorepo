// packages/client/eslint.config.cjs
module.exports = [
  // ignore patterns (replaces .eslintignore)
  {
    ignores: ["node_modules/**", "dist/**", "build/**", "public/**"],
  },

  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",

      // provide the parser MODULE
      parser: require("@typescript-eslint/parser"),

      // put ecmaFeatures inside parserOptions (correct location)
      parserOptions: {
        project: ["./tsconfig.json"],
        tsconfigRootDir: __dirname,
        ecmaFeatures: { jsx: true },
      },
    },

    plugins: {
      "@typescript-eslint": require("@typescript-eslint/eslint-plugin"),
      react: require("eslint-plugin-react"),
      "react-hooks": require("eslint-plugin-react-hooks"),
      "jsx-a11y": require("eslint-plugin-jsx-a11y"),
      import: require("eslint-plugin-import"),
    },

    settings: {
      react: { version: "detect" },
      "import/resolver": {
        typescript: {
          project: ["./tsconfig.json"],
          tsconfigRootDir: __dirname,
        },
      },
    },

    rules: {
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "import/order": [
        "warn",
        {
          groups: [
            ["builtin", "external"],
            ["internal", "parent", "sibling", "index"],
          ],
          "newlines-between": "always",
        },
      ],
    },
  },
];
