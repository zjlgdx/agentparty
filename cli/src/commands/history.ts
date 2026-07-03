// party history — rest 拉历史消息
import { num, parseArgs } from "../args";
import { readConfig, resolveChannel } from "../config";
import { fetchMessages, handleRestError } from "../rest";
import { formatMsg } from "../format";

export async function run(argv: string[]): Promise<number> {
  const { positionals, flags } = parseArgs(argv);
  const cfg = readConfig();
  if (!cfg) {
    console.error("no config, run: party init --server URL --token T");
    return 1;
  }
  const channel = resolveChannel(positionals[0]);
  if (!channel) {
    console.error("no channel, pass one or bind with: party init --channel C");
    return 1;
  }
  try {
    const messages = await fetchMessages(
      cfg.server,
      cfg.token,
      channel,
      num(flags.since) ?? 0,
      num(flags.limit) ?? 100,
    );
    for (const m of messages) console.log(formatMsg(m));
    return 0;
  } catch (e) {
    return handleRestError(e);
  }
}
