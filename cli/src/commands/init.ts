// party init — 写全局配置 + 绑定当前目录默认频道（不存在则创建）
import { parseArgs, str } from "../args";
import { readConfig, readState, writeConfig, writeState } from "../config";
import { RestError, createChannel, handleRestError, listChannels } from "../rest";

export async function run(argv: string[]): Promise<number> {
  const { positionals, flags } = parseArgs(argv);
  const prev = readConfig();
  const server = str(flags.server) ?? prev?.server;
  const token = str(flags.token) ?? prev?.token;
  if (!server || !token) {
    console.error("need --server and --token (or existing config)");
    return 1;
  }
  const cfg = { server: server.replace(/\/+$/, ""), token };
  writeConfig(cfg);

  const channel = str(flags.channel) ?? positionals[0];
  if (channel) {
    try {
      const channels = await listChannels(cfg.server, cfg.token);
      if (!channels.some((c) => c.slug === channel)) {
        try {
          await createChannel(cfg.server, cfg.token, { slug: channel, kind: "standing" });
          console.log(`created channel ${channel}`);
        } catch (e) {
          // 409 = 并发下已被建出来，视为存在
          if (!(e instanceof RestError && e.status === 409)) throw e;
        }
      }
    } catch (e) {
      return handleRestError(e);
    }
    const st = readState();
    writeState({ channel, cursor: st?.channel === channel ? st.cursor : 0 });
    console.log(`bound channel ${channel}`);
  }
  console.log(`config written for ${cfg.server}`);
  return 0;
}
