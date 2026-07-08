import { registerDict, type LocaleDict } from "../dict";

export const VisibilityToggleStrings: LocaleDict = {
  en: {
    "Visibility.toPrivateTitle": "Switch to private (members only)",
    "Visibility.toPublicTitle": "Switch to public (history visible to anyone)",
    "Visibility.toPrivate": "make private",
    "Visibility.toPublic": "make public",
    "Visibility.confirmDialogLabel": "confirm going public",
    "Visibility.confirmText": "Going public exposes {count} messages of history to anyone. Confirm?",
    "Visibility.confirmButton": "confirm, go public",
    "Visibility.cancel": "cancel",
  },
  zh: {
    "Visibility.toPrivateTitle": "转为私有频道（仅成员可见）",
    "Visibility.toPublicTitle": "转为公开频道（任何人可见历史）",
    "Visibility.toPrivate": "转私有",
    "Visibility.toPublic": "转公开",
    "Visibility.confirmDialogLabel": "确认转公开",
    "Visibility.confirmText": "转公开后，历史 {count} 条消息将对任何人可见。确认？",
    "Visibility.confirmButton": "确认转公开",
    "Visibility.cancel": "取消",
  },
};

registerDict(VisibilityToggleStrings);
