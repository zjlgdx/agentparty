// 合并各组件自己的词典模块。每个组件一个 strings/<Name>.ts 文件（各自独立，互不冲突，方便并行
// 补齐）；这里只做汇总 + 兜底：locale 缺某 key 时回落英文，英文也缺则回落 key 本身（不炸 UI）。
import type { Locale } from "./locale";

export type Dict = Record<string, string>;
export type LocaleDict = Record<Locale, Dict>;

// 各组件的词典模块在这里逐个 import + 汇总。新增组件：加一行 import，加一行展开。
const MODULES: LocaleDict[] = [];

export function registerDict(mod: LocaleDict): void {
  MODULES.push(mod);
}

function merged(locale: Locale): Dict {
  const out: Dict = {};
  for (const m of MODULES) Object.assign(out, m[locale]);
  return out;
}

export function lookup(locale: Locale, key: string): string | undefined {
  for (let i = MODULES.length - 1; i >= 0; i--) {
    const v = MODULES[i]![locale]?.[key];
    if (v !== undefined) return v;
  }
  return undefined;
}

// 仅测试/调试用：某 locale 目前汇总了多少 key
export function dictSize(locale: Locale): number {
  return Object.keys(merged(locale)).length;
}
