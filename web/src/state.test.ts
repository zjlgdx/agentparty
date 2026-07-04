import { describe, expect, test } from "bun:test";
import type { MsgFrame, PresenceFrame } from "@agentparty/shared";
import { channelReducer, initialChannelState } from "./state";

function msgFrame(seq: number, body: string, over: Partial<MsgFrame> = {}): MsgFrame {
  return {
    type: "msg",
    seq,
    sender: { name: "bob", kind: "agent" },
    kind: "message",
    body,
    mentions: [],
    reply_to: null,
    state: null,
    note: null,
    ts: 1_725_000_000_000 + seq,
    ...over,
  };
}

describe("channel state", () => {
  test("ignores duplicate history frames without revision metadata", () => {
    const first = channelReducer(initialChannelState, { type: "frame", frame: msgFrame(6, "original") });
    const duplicate = channelReducer(first, { type: "frame", frame: msgFrame(6, "stale duplicate") });

    expect(duplicate.messages).toHaveLength(1);
    expect(duplicate.messages[0]?.body).toBe("original");
  });

  test("replaces same-seq history frames when they carry revision metadata", () => {
    const first = channelReducer(initialChannelState, { type: "frame", frame: msgFrame(6, "original") });
    const revised = channelReducer(first, {
      type: "frame",
      frame: msgFrame(6, "edited", { edited: true, edited_at: 1_725_000_000_999, edited_by: "bob" }),
    });

    expect(revised.messages).toHaveLength(1);
    expect(revised.messages[0]).toMatchObject({ seq: 6, body: "edited", edited: true });
  });

  test("preserves lineage on incremental presence frames", () => {
    const frame: PresenceFrame = {
      type: "presence",
      name: "child-a",
      state: "working",
      note: "checking",
      ts: 1_725_000_000_000,
      status: {
        owner: "child-a",
        state: "working",
        scope: ["web/src"],
        summary_seq: null,
        blocked_reason: null,
        updated_at: 1_725_000_000_000,
        workflow: {
          workflow_id: "wf-ui",
          kind: "parallel",
          run_id: "run-1",
          step_id: "render",
          parent_summary_seq: 4,
        },
      },
      lineage: {
        parent_agent: "parent-a",
        root_agent: "parent-a",
        team_id: "team-a",
        depth: 1,
        expires_at: 1_725_000_060_000,
      },
    };
    const next = channelReducer(initialChannelState, { type: "frame", frame });

    expect(next.presence["child-a"]?.lineage).toEqual(frame.lineage);
    expect(next.presence["child-a"]?.status?.workflow).toEqual(frame.status?.workflow);
  });
});
