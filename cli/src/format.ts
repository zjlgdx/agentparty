// 消息打印格式："[seq] name(kind): body 首行"，多行缩进跟随
import type { MsgFrame } from "@agentparty/shared";

function formatSender(m: MsgFrame): string {
  const owner = m.sender.owner && m.sender.owner !== m.sender.name ? ` owner=${m.sender.owner}` : "";
  return `${m.sender.name}(${m.sender.kind}${owner})`;
}

export function formatMsg(m: MsgFrame): string {
  const badges = [
    m.edited ? "edited" : null,
    m.retracted ? "retracted" : null,
    m.supersedes !== undefined ? `supersedes #${m.supersedes}` : null,
    m.superseded_by !== undefined ? `superseded by #${m.superseded_by}` : null,
  ].filter((part): part is string => part !== null);
  const suffix = badges.length > 0 ? ` {${badges.join("; ")}}` : "";
  const prefix = `[${m.seq}] ${formatSender(m)}${suffix}: `;
  if (m.kind === "status") {
    const parts = [m.note, m.status?.scope.length ? `scope=${m.status.scope.join(",")}` : null];
    if (m.status?.blocked_reason) parts.push(`blocked=${m.status.blocked_reason}`);
    if (m.status?.summary_seq !== null && m.status?.summary_seq !== undefined) parts.push(`summary=#${m.status.summary_seq}`);
    const detail = parts.filter((part): part is string => typeof part === "string" && part !== "").join(" · ");
    return `${prefix}[${m.state}]${detail ? ` ${detail}` : ""}`;
  }
  if (m.retracted) return `${prefix}[retracted]`;
  const lines = (m.body ?? "").split("\n");
  const rest = lines.slice(1).map((l) => "    " + l);
  return [prefix + (lines[0] ?? ""), ...rest].join("\n");
}
