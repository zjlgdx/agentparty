import { describe, expect, test } from "bun:test";
import { evaluateHostLease, type PresenceEntry } from "@agentparty/shared";

const NOW = 10_000;

function presence(over: Partial<PresenceEntry> = {}): PresenceEntry {
  return {
    name: "host-a",
    state: "working",
    note: null,
    ts: NOW - 1_000,
    last_seen: NOW - 1_000,
    role: "host",
    residency: "supervised",
    wake: { kind: "serve" },
    ...over,
  };
}

describe("host lease evaluation", () => {
  test("marks resident host with live wake as active", () => {
    expect(evaluateHostLease(presence(), NOW)).toMatchObject({
      lease: "active",
      reason: null,
      residency: "supervised",
      wake_kind: "serve",
    });
  });

  test("requires host role, resident mode, wake layer, and fresh last_seen", () => {
    expect(evaluateHostLease(presence({ role: "worker" }), NOW).reason).toBe("role=worker");
    expect(evaluateHostLease(presence({ residency: "human_driven" }), NOW).reason).toBe("residency=human_driven");
    expect(evaluateHostLease(presence({ wake: { kind: "none" } }), NOW).reason).toBe("wake=none");
    expect(evaluateHostLease(presence({ last_seen: NOW - 120_000 }), NOW).reason).toBe("lease-expired");
  });

  test("uses ts as a last_seen fallback", () => {
    expect(evaluateHostLease(presence({ last_seen: undefined, ts: NOW - 500 }), NOW)).toMatchObject({
      lease: "active",
      last_seen: NOW - 500,
    });
  });
});
