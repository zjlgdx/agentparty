import { describe, expect, test } from "bun:test";
import type { ReadCursor, Sender } from "@agentparty/shared";
import { readStateFor } from "./readList";

function cur(name: string, seq: number, kind: "agent" | "human" = "agent"): ReadCursor {
  return { name, kind, last_seen_seq: seq, updated_at: 1 };
}
const P = (name: string, kind: "agent" | "human" = "agent"): Sender => ({ name, kind });

describe("readStateFor", () => {
  test("readers = cursors at/after seq; excludes the sender and system", () => {
    const cursors = { alice: cur("alice", 10), bob: cur("bob", 4), sys: cur("system", 99), leo: cur("leo", 10) };
    const st = readStateFor(5, "leo", [P("alice"), P("bob")], cursors);
    expect(st.readers.map((r) => r.name)).toEqual(["alice"]); // bob behind, leo=sender, system excluded
  });

  test("agent readers count the same as humans", () => {
    const cursors = { agentx: cur("agentx", 8, "agent"), human1: cur("human1", 8, "human") };
    const st = readStateFor(8, "leo", [], cursors);
    expect(st.readers.map((r) => r.name).sort()).toEqual(["agentx", "human1"]);
    expect(st.readers.find((r) => r.name === "agentx")?.kind).toBe("agent");
  });

  test("unread = connected participants behind the cursor (or no cursor); not stale leavers", () => {
    const cursors = { alice: cur("alice", 10), bob: cur("bob", 3) };
    // carol connected, never acked; dave read and left (not a participant) → not unread
    const st = readStateFor(5, "leo", [P("alice"), P("bob"), P("carol"), P("leo")], cursors);
    expect(st.unread.map((r) => r.name)).toEqual(["bob", "carol"]); // alice read, leo=sender
  });

  test("a reader who has since disconnected still counts as read", () => {
    const cursors = { ghost: cur("ghost", 20) };
    const st = readStateFor(5, "leo", [], cursors); // ghost not in participants but read
    expect(st.readers.map((r) => r.name)).toEqual(["ghost"]);
    expect(st.unread).toEqual([]);
  });
});
