import { registerDict, type LocaleDict } from "../dict";

export const AppStrings: LocaleDict = {
  en: {
    "App.join.failed": "Failed to join",
    "App.join.loginFailed": "Couldn't start sign-in",
    "App.join.backHome": "Back to home",
    "App.join.joining": "Joining channel…",
  },
  zh: {
    "App.join.failed": "加入失败",
    "App.join.loginFailed": "无法开始登录",
    "App.join.backHome": "返回首页",
    "App.join.joining": "正在加入频道…",
  },
};

registerDict(AppStrings);
