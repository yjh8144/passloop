import js from "@eslint/js"
import tseslint from "typescript-eslint"
import reactHooks from "eslint-plugin-react-hooks"
import prettier from "eslint-config-prettier"

export default tseslint.config(
  { ignores: ["dist/", "node_modules/", "proxy/"] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-dynamic-delete": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/preserve-caught-error": "off",
      "preserve-caught-error": "off",
    },
  },
  prettier,
)
