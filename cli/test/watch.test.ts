import { afterEach, describe, expect, test } from "bun:test";
import { EXIT_ARCHIVED, EXIT_AUTH, EXIT_LOOP_GUARD, EXIT_TIMEOUT } from "@agentparty/shared";
import { runWatch, type WatchOptions } from "../src/commands/watch";
import { msgFrame, startMockServer, welcomeFrame, type MockServer } from "./mock-server";

let server: MockServer | null = null;

afterEach(() => {
  server?.stop();
  server = null;
});

function opts(over: Partial<WatchOptions> & { server: string }): WatchOptions & { lines: string[] } {
  const lines: string[] = [];
  return {
    token: "ap_tok",
    channel: "dev",
    since: 0,
    timeoutSec: 3,
    follow: false,
    mentionsOnly: false,
    out: (l) => lines.push(l),
    backoffBaseMs: 20,
    lines,
    ...over,
  };
}

describe("runWatch", () => {
  test("prints backfilled messages and exits 0 once drained", async () => {
    server = startMockServer((frame, sock) => {
      if (frame.type === "hello") {
        sock.send(welcomeFrame(2));
        sock.send(msgFrame(1, "line one\nline two"));
        sock.send(msgFrame(2, "second"));
      }
    });
    const o = opts({ server: server.url });
    expect(await runWatch(o)).toBe(0);
    expect(o.lines).toEqual(["[1] bob(agent): line one\n    line two", "[2] bob(agent): second"]);
  });

  test("blocks until a live message arrives, then exits 0", async () => {
    server = startMockServer((frame, sock) => {
      if (frame.type === "hello") {
        sock.send(welcomeFrame(0));
        setTimeout(() => sock.send(msgFrame(1, "fresh")), 50);
      }
    });
    const o = opts({ server: server.url });
    expect(await runWatch(o)).toBe(0);
    expect(o.lines).toEqual(["[1] bob(agent): fresh"]);
  });

  test("timeout prints TIMEOUT and exits 2", async () => {
    server = startMockServer((frame, sock) => {
      if (frame.type === "hello") sock.send(welcomeFrame(0));
    });
    const o = opts({ server: server.url, timeoutSec: 0.2 });
    expect(await runWatch(o)).toBe(EXIT_TIMEOUT);
    expect(o.lines).toEqual(["TIMEOUT"]);
  });

  test("mentions-only ignores messages not mentioning self", async () => {
    server = startMockServer((frame, sock) => {
      if (frame.type === "hello") {
        sock.send(welcomeFrame(0, "me"));
        setTimeout(() => sock.send(msgFrame(1, "not for me")), 20);
        setTimeout(() => sock.send(msgFrame(2, "for me", { mentions: ["me"] })), 60);
      }
    });
    const o = opts({ server: server.url, mentionsOnly: true });
    expect(await runWatch(o)).toBe(0);
    expect(o.lines).toEqual(["[2] bob(agent): for me"]);
  });

  test("own messages are skipped", async () => {
    server = startMockServer((frame, sock) => {
      if (frame.type === "hello") {
        sock.send(welcomeFrame(0, "me"));
        setTimeout(() => sock.send(msgFrame(1, "echo", { sender: { name: "me", kind: "agent" } })), 20);
        setTimeout(() => sock.send(msgFrame(2, "reply")), 60);
      }
    });
    const o = opts({ server: server.url });
    expect(await runWatch(o)).toBe(0);
    expect(o.lines).toEqual(["[2] bob(agent): reply"]);
  });

  test("status messages print state and note", async () => {
    server = startMockServer((frame, sock) => {
      if (frame.type === "hello") {
        sock.send(welcomeFrame(1));
        sock.send(msgFrame(1, "", { kind: "status", state: "working", note: "fixing api" }));
      }
    });
    const o = opts({ server: server.url });
    expect(await runWatch(o)).toBe(0);
    expect(o.lines).toEqual(["[1] bob(agent): [working] fixing api"]);
  });

  test("error frames map to contract exit codes", async () => {
    for (const [code, exit] of [
      ["unauthorized", EXIT_AUTH],
      ["loop_guard", EXIT_LOOP_GUARD],
      ["archived", EXIT_ARCHIVED],
    ] as const) {
      const s = startMockServer((frame, sock) => {
        if (frame.type === "hello") sock.send({ type: "error", code, message: code });
      });
      const o = opts({ server: s.url });
      expect(await runWatch(o)).toBe(exit);
      s.stop();
    }
  });

  test("cursor callback fires for received messages", async () => {
    server = startMockServer((frame, sock) => {
      if (frame.type === "hello") {
        sock.send(welcomeFrame(2));
        sock.send(msgFrame(1, "a"));
        sock.send(msgFrame(2, "b"));
      }
    });
    const cursors: number[] = [];
    const o = opts({ server: server.url, onCursor: (c) => cursors.push(c) });
    expect(await runWatch(o)).toBe(0);
    expect(cursors).toEqual([1, 2]);
  });
});
