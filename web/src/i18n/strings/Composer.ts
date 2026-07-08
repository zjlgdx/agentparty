import { registerDict, type LocaleDict } from "../dict";

export const ComposerStrings: LocaleDict = {
  en: {
    "Composer.tier.online": "online",
    "Composer.tier.wakeable": "wakeable",
    "Composer.tier.recent": "recent",
    "Composer.role": "role: {role}",
  },
  zh: {
    "Composer.tier.online": "在线",
    "Composer.tier.wakeable": "可唤醒",
    "Composer.tier.recent": "最近",
    "Composer.role": "职责: {role}",
  },
};

registerDict(ComposerStrings);
