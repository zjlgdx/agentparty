import type { MsgFrame } from "@agentparty/shared";

const ISSUE_RE = /(^|[\s(])#[1-9]\d*\b/;
const RELEASE_RE = /\bv\d+\.\d+\.\d+\b|\b(release|released|deploy|deployed|shipped|landed)\b/i;
const QUESTION_RE = /[?？]|\b(blocked|unknown|unclear|open question)\b/i;

export interface CatchupItem {
  seq: number;
  label: string;
  text: string;
}

export interface CatchupDigest {
  messages: number;
  mentions: number;
  respondedMentions: number;
  statuses: number;
  blocked: number;
  done: number;
  replies: number;
  releases: number;
  questions: number;
  items: CatchupItem[];
}

export function catchupKey(slug: string, self: string): string {
  return `ap_seen:v1:${slug}:${self}`;
}

export function compactDigestText(msg: MsgFrame): string {
  const raw = msg.kind === "status" ? (msg.note ?? msg.body) : msg.body;
  const normalized = raw.replace(/\s+/g, " ").trim();
  return normalized.length > 120 ? normalized.slice(0, 117) + "..." : normalized;
}

function hasResponse(messages: MsgFrame[], mention: MsgFrame, viewer: string): boolean {
  return messages.some(
    (candidate) =>
      candidate.seq > mention.seq &&
      candidate.sender.name === viewer &&
      (candidate.reply_to === mention.seq || candidate.status?.summary_seq === mention.seq),
  );
}

export function summarizeCatchup(messages: MsgFrame[], self: string, seenSeq: number): CatchupDigest {
  const fresh = messages.filter((m) => m.seq > seenSeq);
  const items: CatchupItem[] = [];
  let mentions = 0;
  let respondedMentions = 0;
  let statuses = 0;
  let blocked = 0;
  let done = 0;
  let replies = 0;
  let releases = 0;
  let questions = 0;

  for (const msg of fresh) {
    const text = compactDigestText(msg);
    const mentioned = msg.mentions.includes(self);
    const responded = mentioned && hasResponse(messages, msg, self);
    const release = RELEASE_RE.test(text) || ISSUE_RE.test(text);
    const question = QUESTION_RE.test(text);
    if (mentioned) mentions++;
    if (responded) respondedMentions++;
    if (msg.kind === "status") statuses++;
    if (msg.state === "blocked") blocked++;
    if (msg.state === "done") done++;
    if (msg.reply_to !== null) replies++;
    if (release) releases++;
    if (question) questions++;

    let label: string | null = null;
    if (mentioned) label = responded ? `@${self} done` : `@${self}`;
    else if (msg.state === "blocked") label = "blocked";
    else if (msg.state === "done") label = "done";
    else if (release) label = "release";
    else if (question) label = "question";
    else if (msg.reply_to !== null) label = "reply";
    if (label !== null && text !== "") items.push({ seq: msg.seq, label, text });
  }

  return {
    messages: fresh.length,
    mentions,
    respondedMentions,
    statuses,
    blocked,
    done,
    replies,
    releases,
    questions,
    items: items.slice(-4).reverse(),
  };
}
