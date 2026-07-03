// party ask — send + watch 语法糖，agent 主循环用
import { num, parseArgs } from "../args";
import { loadCursor, readConfig, saveCursor } from "../config";
import { doSend, resolveSendInput, sendSpec } from "./send";
import { runWatch } from "./watch";

export async function run(argv: string[]): Promise<number> {
  const parsed = parseArgs(argv, {
    ...sendSpec,
    booleans: ["mentions-only"],
  });
  const cfg = readConfig();
  if (!cfg) {
    console.error("no config, run: party init --server URL --token T");
    return 1;
  }
  const input = await resolveSendInput(parsed);
  if (!input) return 1;
  const result = await doSend(cfg, input);
  if (typeof result === "number") return result;

  // 游标从自己刚发的 seq 起，自己的消息不会被当成回复
  const since = Math.max(result.seq, loadCursor(input.channel));
  return runWatch({
    server: cfg.server,
    token: cfg.token,
    channel: input.channel,
    since,
    timeoutSec: num(parsed.flags.timeout) ?? 240,
    follow: false,
    mentionsOnly: parsed.flags["mentions-only"] === true,
    onCursor: (c) => saveCursor(input.channel, c),
  });
}
