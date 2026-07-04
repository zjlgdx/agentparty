import { describe, expect, test } from "bun:test";
import type { MsgFrame } from "@agentparty/shared";
import { formatMsg } from "../src/format";

function msgFrame(over: Partial<MsgFrame> = {}): MsgFrame {
  const base: MsgFrame = {
    type: "msg",
    seq: 7,
    sender: { name: "agent-a", kind: "agent", owner: "team-a" },
    kind: "message",
    body: "hello",
    mentions: [],
    reply_to: null,
    state: null,
    note: null,
    status: null,
    ts: 1_725_000_000_000,
  };
  return { ...base, ...over };
}

describe("formatMsg", () => {
  test("prints owner context when available", () => {
    expect(formatMsg(msgFrame())).toBe("[7] agent-a(agent owner=team-a): hello");
  });

  test("omits redundant owner context", () => {
    expect(formatMsg(msgFrame({ sender: { name: "agent-a", kind: "agent", owner: "agent-a" } }))).toBe(
      "[7] agent-a(agent): hello",
    );
  });
});
