// party lark — personal Lark/Feishu notification bridge
import { isHelpArg, parseArgs, str, unknownFlagError, valueFlagError } from "../args";
import { resolveChannel } from "../config";
import { resolveAuth } from "../oidc-cli";
import {
  disableLarkNotify,
  enableLarkNotify,
  getLarkNotifyStatus,
  handleRestError,
  type LarkNotifyStatus,
} from "../rest";
import { isSlug } from "../validation";

const LARK_FLAGS = ["channel"];
const HELP = `usage: party lark notify on [--channel C]
       party lark notify off [--channel C]
       party lark notify status [--channel C]
       party lark status [--channel C]

Bridge AgentParty mentions to your Lark/Feishu account. The current human login
must be a Lark/Feishu OAuth session with a profile handle. When enabled, messages
that @your-handle in the channel are delivered as private Lark/Feishu cards.`;

function printStatus(status: LarkNotifyStatus): void {
  if (status.enabled) {
    console.log(
      `lark notify on ${status.channel_slug}: enabled for @${status.target_name ?? "unknown"} (${status.provider_id ?? "provider"})`,
    );
  } else {
    console.log(`lark notify on ${status.channel_slug}: disabled`);
  }
}

export async function run(argv: string[]): Promise<number> {
  if (isHelpArg(argv, { allowHelpPositional: true })) {
    console.log(HELP);
    return 0;
  }
  const { positionals, flags } = parseArgs(argv);
  const unknown = unknownFlagError(flags, LARK_FLAGS);
  if (unknown !== null) {
    console.error(unknown);
    return 1;
  }
  const flagError = valueFlagError(flags, ["channel"]);
  if (flagError !== null) {
    console.error(flagError);
    return 1;
  }
  const cfg = await resolveAuth();
  if (!cfg) {
    console.error("no config, run: party login or party init --server URL --token T");
    return 1;
  }
  const group = positionals[0];
  const action = group === "notify" ? positionals[1] : group === "status" ? "status" : null;
  const slug = resolveChannel(str(flags.channel));
  if (!slug) {
    console.error("channel required: pass --channel C or run party init --channel C");
    return 1;
  }
  if (!isSlug(slug)) {
    console.error("channel must match [a-z0-9][a-z0-9-]{0,63}");
    return 1;
  }
  try {
    switch (action) {
      case "on": {
        const status = await enableLarkNotify(cfg.server, cfg.token, slug);
        printStatus(status);
        return 0;
      }
      case "off": {
        const status = await disableLarkNotify(cfg.server, cfg.token, slug);
        printStatus(status);
        return 0;
      }
      case "status": {
        const status = await getLarkNotifyStatus(cfg.server, cfg.token, slug);
        printStatus(status);
        return 0;
      }
      default:
        console.error("usage: party lark notify on|off|status [--channel C]");
        return 1;
    }
  } catch (e) {
    return handleRestError(e);
  }
}
