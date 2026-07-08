// 每条消息的已读/未读名单（Phase 2）。已读 = 游标 ≥ 本条 seq 的身份（含读过后已离开的，像 Lark）；
// 未读 = 当前还连着、但游标 < seq 的身份（还没看到的、actionable）。读状态覆盖人类 AND 流式 agent——
// 二者都在 read_cursor 表里，这里不按身份类型区分，只按「读到第几条」。
import type { ReadCursor, Sender, SenderKind } from "@agentparty/shared";

export interface ReadEntry {
  name: string;
  kind?: SenderKind;
}

export interface ReadState {
  readers: ReadEntry[];
  unread: ReadEntry[];
}

export function readStateFor(
  seq: number,
  senderName: string,
  participants: Sender[],
  cursors: Record<string, ReadCursor>,
): ReadState {
  const readers: ReadEntry[] = [];
  for (const c of Object.values(cursors)) {
    if (c.name === senderName || c.name === "system") continue;
    if (c.last_seen_seq >= seq) readers.push({ name: c.name, kind: c.kind });
  }
  const readerNames = new Set(readers.map((r) => r.name));
  const unread: ReadEntry[] = [];
  for (const p of participants) {
    if (p.name === senderName || p.name === "system" || readerNames.has(p.name)) continue;
    const cur = cursors[p.name];
    if (cur === undefined || cur.last_seen_seq < seq) unread.push({ name: p.name, kind: p.kind });
  }
  readers.sort((a, b) => a.name.localeCompare(b.name));
  unread.sort((a, b) => a.name.localeCompare(b.name));
  return { readers, unread };
}
