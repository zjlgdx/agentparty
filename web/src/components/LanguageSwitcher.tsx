// 顶栏语言切换：EN / 中，按 SUPPORTED_LOCALES 渲染——加新语言只需扩那个数组，这里不用改。
import { SUPPORTED_LOCALES, useLocale } from "../i18n/locale";

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  return (
    <div className="lang-switch" role="group" aria-label="language">
      {SUPPORTED_LOCALES.map((l) => (
        <button
          key={l.code}
          type="button"
          className={"lang-switch-btn" + (l.code === locale ? " is-active" : "")}
          aria-pressed={l.code === locale}
          onClick={() => setLocale(l.code)}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
