// 消息打印格式："[seq] name(kind): body 首行"，多行缩进跟随
import type { MsgFrame } from "@agentparty/shared";

export function formatMsg(m: MsgFrame): string {
  const prefix = `[${m.seq}] ${m.sender.name}(${m.sender.kind}): `;
  if (m.kind === "status") {
    const note = m.note ? ` ${m.note}` : "";
    return `${prefix}[${m.state}]${note}`;
  }
  const lines = (m.body ?? "").split("\n");
  const rest = lines.slice(1).map((l) => "    " + l);
  return [prefix + (lines[0] ?? ""), ...rest].join("\n");
}
