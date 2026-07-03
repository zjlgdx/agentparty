// 子进程级冒烟：真实 argv 路由 + 退出码
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startMockServer, welcomeFrame, type MockServer } from "./mock-server";

const indexPath = join(import.meta.dir, "..", "src", "index.ts");

let home: string;
let server: MockServer | null = null;

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "ap-cli-"));
});

afterEach(() => {
  rmSync(home, { recursive: true, force: true });
  server?.stop();
  server = null;
});

async function runCli(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn(["bun", "run", indexPath, ...args], {
    env: { ...process.env, AGENTPARTY_HOME: home },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { code, stdout, stderr };
}

describe("cli subprocess", () => {
  test("--help exits 0", async () => {
    const r = await runCli(["--help"]);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("party <command>");
  });

  test("unknown command exits 1", async () => {
    const r = await runCli(["nope"]);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("unknown command");
  });

  test("watch without config exits 1", async () => {
    const r = await runCli(["watch", "dev", "--timeout", "1"]);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("no config");
  });

  test("watch timeout exits 2 and prints TIMEOUT", async () => {
    server = startMockServer((frame, sock) => {
      if (frame.type === "hello") sock.send(welcomeFrame(0));
    });
    mkdirSync(home, { recursive: true });
    writeFileSync(
      join(home, "config.json"),
      JSON.stringify({ server: server.url, token: "ap_tok" }),
    );
    const r = await runCli(["watch", "dev", "--timeout", "1"]);
    expect(r.code).toBe(2);
    expect(r.stdout.trim()).toBe("TIMEOUT");
  }, 15_000);
});
