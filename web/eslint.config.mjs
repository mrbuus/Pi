import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // react-hooks/set-state-in-effect (React Compiler-ийн шинэ, хатуу дүрэм):
  // 74 газар (ихэнх нь effect-ийн эхэнд setLoading(true)) — нэг дор засах нь
  // ажиллагааг эвдэх эрсдэлтэй тул ТҮР анхааруулга. Файл бүрийг засах явцад
  // аажмаар цэвэрлэнэ; бусад бүх дүрэм алдаа хэвээр, CI-д шалгагдана (2026-09-27).
  { rules: { "react-hooks/set-state-in-effect": "warn" } },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
