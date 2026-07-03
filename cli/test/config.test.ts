import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import {
  loadCursor,
  readConfig,
  readState,
  resolveChannel,
  saveCursor,
  slugifyBasename,
  statePath,
  workspaceId,
  writeConfig,
  writeState,
} from "../src/config";

let home: string;

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "ap-test-"));
  process.env.AGENTPARTY_HOME = home;
});

afterEach(() => {
  delete process.env.AGENTPARTY_HOME;
  rmSync(home, { recursive: true, force: true });
});

describe("config", () => {
  test("read returns null when missing", () => {
    expect(readConfig()).toBeNull();
  });

  test("write/read roundtrip", () => {
    writeConfig({ server: "https://ap.example.com", token: "ap_x" });
    expect(readConfig()).toEqual({ server: "https://ap.example.com", token: "ap_x" });
  });
});

describe("workspace id", () => {
  test("slugify basename", () => {
    expect(slugifyBasename("My_Dir 2")).toBe("my-dir-2");
    expect(slugifyBasename("herness-use")).toBe("herness-use");
    expect(slugifyBasename("中文目录")).toBe("workspace");
  });

  test("id = <basename-slug>-<sha256(cwd) first 16 hex>", () => {
    const cwd = "/Users/leo/github.com/My Project";
    const hash = createHash("sha256").update(cwd).digest("hex").slice(0, 16);
    expect(workspaceId(cwd)).toBe(`my-project-${hash}`);
  });

  test("state path lives under AGENTPARTY_HOME/state/<id>/state.json", () => {
    const cwd = "/tmp/abc";
    expect(statePath(cwd)).toBe(join(home, "state", workspaceId(cwd), "state.json"));
  });
});

describe("workspace state", () => {
  const cwd = "/tmp/project-x";

  test("state roundtrip + cursor helpers", () => {
    expect(readState(cwd)).toBeNull();
    writeState({ channel: "dev", cursor: 7 }, cwd);
    expect(readState(cwd)).toEqual({ channel: "dev", cursor: 7 });
    expect(loadCursor("dev", cwd)).toBe(7);
    expect(loadCursor("other", cwd)).toBe(0);
  });

  test("saveCursor only advances bound channel monotonically", () => {
    writeState({ channel: "dev", cursor: 5 }, cwd);
    saveCursor("dev", 9, cwd);
    expect(loadCursor("dev", cwd)).toBe(9);
    saveCursor("dev", 3, cwd);
    expect(loadCursor("dev", cwd)).toBe(9);
    saveCursor("other", 42, cwd);
    expect(readState(cwd)).toEqual({ channel: "dev", cursor: 9 });
  });

  test("resolveChannel prefers explicit over bound", () => {
    writeState({ channel: "dev", cursor: 0 }, cwd);
    expect(resolveChannel(undefined, cwd)).toBe("dev");
    expect(resolveChannel("ops", cwd)).toBe("ops");
    expect(resolveChannel(undefined, "/tmp/unbound")).toBeNull();
  });
});
