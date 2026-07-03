// party token create — 需要 ADMIN_SECRET 环境变量
import type { TokenRole } from "@agentparty/shared";
import { parseArgs, str } from "../args";
import { readConfig } from "../config";
import { createToken, handleRestError, revokeToken } from "../rest";

const ROLES: TokenRole[] = ["agent", "human", "readonly"];

export async function run(argv: string[]): Promise<number> {
  const { positionals, flags } = parseArgs(argv);
  const cfg = readConfig();
  const server = str(flags.server) ?? cfg?.server;
  if (!server) {
    console.error("no server, run party init or pass --server");
    return 1;
  }
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    console.error("ADMIN_SECRET env var required");
    return 1;
  }
  const sub = positionals[0];
  try {
    switch (sub) {
      case "create": {
        const name = str(flags.name);
        const role = str(flags.role) ?? "agent";
        if (!name || !ROLES.includes(role as TokenRole)) {
          console.error("usage: party token create --name n --role agent|human|readonly");
          return 1;
        }
        const res = await createToken(server, adminSecret, name, role as TokenRole);
        // 明文 token 只出现这一次
        console.log(JSON.stringify(res));
        return 0;
      }
      case "revoke": {
        const name = str(flags.name) ?? positionals[1];
        if (!name) {
          console.error("usage: party token revoke <name>");
          return 1;
        }
        await revokeToken(server, adminSecret, name);
        console.log(`revoked ${name}`);
        return 0;
      }
      default:
        console.error("usage: party token create|revoke");
        return 1;
    }
  } catch (e) {
    return handleRestError(e);
  }
}
