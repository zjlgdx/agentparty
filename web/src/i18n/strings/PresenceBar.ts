import { registerDict, type LocaleDict } from "../dict";

export const PresenceBarStrings: LocaleDict = {
  en: {
    "PresenceBar.kickTitle": "Kick {name}",
    "PresenceBar.kick": "kick",
  },
  zh: {
    "PresenceBar.kickTitle": "踢出 {name}",
    "PresenceBar.kick": "踢出",
  },
};

registerDict(PresenceBarStrings);
