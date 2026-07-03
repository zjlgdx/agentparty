// party send — rest 一次性发消息，成功后推进游标
import { num, parseArgs, type Parsed } from "../args";
import { readConfig, resolveChannel, saveCursor, type Config } from "../config";
import { handleRestError, postMessage } from "../rest";

export const sendSpec = { repeatable: ["mention"] };

export interface SendInput {
  channel: string;
  body: string;
  mentions: string[];
  replyTo: number | null;
}

export async function resolveSendInput(parsed: Parsed): Promise<SendInput | null> {
  const { positionals, flags } = parsed;
  let explicit: string | undefined;
  let text: string | undefined;
  if (positionals.length >= 2) {
    explicit = positionals[0];
    text = positionals[1];
  } else {
    text = positionals[0];
  }
  const channel = resolveChannel(explicit);
  if (!channel) {
    console.error("no channel, pass one or bind with: party init --channel C");
    return null;
  }
  if (text === undefined) {
    console.error("missing message body (use - to read stdin)");
    return null;
  }
  if (text === "-") text = await Bun.stdin.text();
  return {
    channel,
    body: text,
    mentions: (flags.mention as string[] | undefined) ?? [],
    replyTo: num(flags["reply-to"]) ?? null,
  };
}

export async function doSend(cfg: Config, input: SendInput): Promise<number | { seq: number }> {
  try {
    const { seq } = await postMessage(cfg.server, cfg.token, input.channel, {
      kind: "message",
      body: input.body,
      mentions: input.mentions,
      reply_to: input.replyTo,
    });
    saveCursor(input.channel, seq);
    return { seq };
  } catch (e) {
    return handleRestError(e);
  }
}

export async function run(argv: string[]): Promise<number> {
  const cfg = readConfig();
  if (!cfg) {
    console.error("no config, run: party init --server URL --token T");
    return 1;
  }
  const input = await resolveSendInput(parseArgs(argv, sendSpec));
  if (!input) return 1;
  const result = await doSend(cfg, input);
  if (typeof result === "number") return result;
  console.log(`sent seq=${result.seq}`);
  return 0;
}
