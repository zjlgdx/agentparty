import { registerDict, type LocaleDict } from "../dict";

export const HomeStrings: LocaleDict = {
  en: {
    "Home.archivedToggle": "$ ls ./archived/ · {count}",
    "Home.channelsLabel": "$ ls ./channels/",
    "Home.noParticipants": "no participants yet",
    "Home.loading": "loading…",
    "Home.channelCategoryAll": "All ({count})",
    "Home.channelCategoryCreated": "Created ({count})",
    "Home.channelCategoryJoined": "Joined ({count})",
    "Home.channelCategoryEmptyCreated": "No channels created by you yet.",
    "Home.channelCategoryEmptyJoined": "You haven't joined any channels yet.",
  },
  zh: {
    "Home.archivedToggle": "$ ls ./archived/ · {count}",
    "Home.channelsLabel": "$ ls ./channels/",
    "Home.noParticipants": "尚无参与者",
    "Home.loading": "加载中…",
    "Home.channelCategoryAll": "全部 ({count})",
    "Home.channelCategoryCreated": "我创建的 ({count})",
    "Home.channelCategoryJoined": "我加入的 ({count})",
    "Home.channelCategoryEmptyCreated": "我创建的：暂无频道。",
    "Home.channelCategoryEmptyJoined": "我加入的：暂无频道。",
  },
};

registerDict(HomeStrings);
