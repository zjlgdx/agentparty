import type { MsgFrame, PresenceEntry, Sender } from "@agentparty/shared";
import type { ChannelIdentity } from "./api";
import type { MentionCandidate } from "./mentions";

export interface IdentityDisplay {
  display: string;
  kind?: "agent" | "human";
  account?: string;
}

export type IdentityDisplayMap = Record<string, IdentityDisplay>;

function displayQuality(name: string, display: string): number {
  return display !== "" && display !== name ? 2 : 1;
}

function addIdentity(
  map: IdentityDisplayMap,
  name: string,
  input: { display?: string; kind?: "agent" | "human"; account?: string },
  force = false,
) {
  if (name === "" || name === "system") return;
  const prev = map[name];
  const kind = input.kind ?? prev?.kind;
  const account = input.account ?? prev?.account;
  const fallbackDisplay = kind === "human" && account ? account : name;
  const nextDisplay = input.display ?? fallbackDisplay;
  const prevDisplay = prev?.display;
  const display =
    !force &&
    prevDisplay !== undefined &&
    displayQuality(name, prevDisplay) > displayQuality(name, nextDisplay)
      ? prevDisplay
      : nextDisplay;
  map[name] = {
    display,
    ...(kind === undefined ? {} : { kind }),
    ...(account === undefined ? {} : { account }),
  };
}

export function buildIdentityDisplay(input: {
  channelIdentities: ChannelIdentity[];
  mentionOptions: MentionCandidate[];
  messages: MsgFrame[];
  participants: Sender[];
  presence: Record<string, PresenceEntry>;
}): IdentityDisplayMap {
  const map: IdentityDisplayMap = {};

  for (const sender of input.participants) {
    addIdentity(map, sender.name, {
      kind: sender.kind,
      account: sender.owner,
      display: sender.kind === "human" && sender.owner ? sender.owner : sender.name,
    });
  }
  for (const entry of Object.values(input.presence)) {
    addIdentity(map, entry.name, {
      kind: entry.kind,
      account: entry.account,
      display: entry.kind === "human" && entry.account ? entry.account : entry.name,
    });
  }
  for (const message of input.messages) {
    addIdentity(map, message.sender.name, {
      kind: message.sender.kind,
      account: message.sender.owner,
      display: message.sender.kind === "human" && message.sender.owner ? message.sender.owner : message.sender.name,
    });
  }
  for (const option of input.mentionOptions) {
    addIdentity(map, option.name, { kind: option.kind, account: option.account, display: option.display });
  }
  for (const identity of input.channelIdentities) addIdentity(map, identity.name, identity, true);

  return map;
}
