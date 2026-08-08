// import js from '@eslint/js';
// import globals from 'globals';
// import reactHooks from 'eslint-plugin-react-hooks';
// import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from "eslint/config";
import configs from "eslint-config-xx";

export default defineConfig([
  globalIgnores(["dist", "build"]),
  ...configs,
  {
    settings: {
      // 消除 React 版本检测警告。该设置仅告诉 `eslint-plugin-react` 使用指定的版本号，不影响项目本身（非 React 项目)
      react: { version: "100.100.100" },
    },
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-unused-vars": ["warn", { varsIgnorePattern: "^[A-Z_]" }],
      "@typescript-eslint/no-unused-vars": ["warn"],
    },
  },
]);
