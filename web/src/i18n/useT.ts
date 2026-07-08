// useT()：取当前 locale 的翻译函数。key 缺当前 locale → 落回英文；英文也没有 → 直接显示 key
// （降级可见但不炸 UI，比空白或抛错更容易在 review 时发现漏翻）。vars 做 {name} 风格插值。
import { useCallback } from "react";
import { lookup } from "./dict";
import { useLocale } from "./locale";

export type TFunc = (key: string, vars?: Record<string, string | number>) => string;

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (vars === undefined) return template;
  return template.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m));
}

export function useT(): TFunc {
  const { locale } = useLocale();
  return useCallback(
    (key, vars) => {
      const raw = lookup(locale, key) ?? lookup("en", key) ?? key;
      return interpolate(raw, vars);
    },
    [locale],
  );
}
