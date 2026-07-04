import { describe, expect, test } from "bun:test";
import {
  agentFilterSearch,
  filterByAgent,
  matchesAgentFilter,
  parseAgentFilter,
  toggleAgent,
  type AgentFilter,
} from "./filters";

describe("agent filters", () => {
  test("parses deep-link filters from csv and repeated params", () => {
    expect(parseAgentFilter("?agent=bob,alice&agent=alice&agentMode=except")).toEqual({
      mode: "except",
      agents: ["alice", "bob"],
    });
  });

  test("ignores invalid names and defaults to only mode", () => {
    expect(parseAgentFilter("?agent=ok&agent=bad/name&agentMode=wat")).toEqual({
      mode: "only",
      agents: ["ok"],
    });
  });

  test("serializes only and except modes", () => {
    expect(agentFilterSearch({ mode: "only", agents: ["alice", "bob"] })).toBe("agent=alice%2Cbob");
    expect(agentFilterSearch({ mode: "except", agents: ["alice"] })).toBe("agent=alice&agentMode=except");
    expect(agentFilterSearch({ mode: "except", agents: [] })).toBe("");
  });

  test("toggles agents deterministically", () => {
    const filter: AgentFilter = { mode: "only", agents: ["bob"] };
    expect(toggleAgent(filter, "alice")).toEqual({ mode: "only", agents: ["alice", "bob"] });
    expect(toggleAgent(filter, "bob")).toEqual({ mode: "only", agents: [] });
  });

  test("matches only and except filters", () => {
    expect(matchesAgentFilter("alice", { mode: "only", agents: ["alice"] })).toBe(true);
    expect(matchesAgentFilter("bob", { mode: "only", agents: ["alice"] })).toBe(false);
    expect(matchesAgentFilter("alice", { mode: "except", agents: ["alice"] })).toBe(false);
    expect(matchesAgentFilter("bob", { mode: "except", agents: ["alice"] })).toBe(true);
  });

  test("filters sender-shaped items", () => {
    const items = [
      { seq: 1, sender: { name: "alice" } },
      { seq: 2, sender: { name: "bob" } },
    ];
    expect(filterByAgent(items, { mode: "only", agents: ["bob"] })).toEqual([items[1]]);
  });
});
