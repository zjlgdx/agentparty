// 频道页：presence 条 + 实时消息流 + 内联错误条幅 + 插话框。
// App 用 key={slug} 挂载本组件，切频道即整体重建（socket/状态零残留）。
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Composer } from "../components/Composer";
import { MessageCard } from "../components/MessageCard";
import { PresenceBar } from "../components/PresenceBar";
import { ChannelSocket } from "../lib/ws";
import { channelReducer, initialChannelState } from "../state";

interface Props {
  slug: string;
  token: string;
  onAuthFailed(message: string): void;
}

const MENTION_RE = /@([a-zA-Z0-9][a-zA-Z0-9._-]*)/g;

export function ChannelPage({ slug, token, onAuthFailed }: Props) {
  const [state, dispatch] = useReducer(channelReducer, initialChannelState);
  const [draft, setDraft] = useState("");
  const sockRef = useRef<ChannelSocket | null>(null);
  const streamRef = useRef<HTMLDivElement | null>(null);
  const stickBottom = useRef(true);
  const authFailedRef = useRef(onAuthFailed);
  authFailedRef.current = onAuthFailed;

  useEffect(() => {
    const sock = new ChannelSocket(slug, token, {
      onFrame: (frame) => dispatch({ type: "frame", frame }),
      onStatus: (status) => dispatch({ type: "status", status }),
      onFatal: (reason) => {
        if (reason === "revoked") authFailedRef.current("token revoked — paste a new one");
        else dispatch({ type: "fatal", reason });
      },
    });
    sockRef.current = sock;
    sock.connect();
    return () => {
      sock.dispose();
      sockRef.current = null;
    };
  }, [slug, token]);

  // 新消息贴底滚动；用户上翻回看时不打扰
  const lastSeq = state.messages.length > 0 ? state.messages[state.messages.length - 1]!.seq : 0;
  useEffect(() => {
    const el = streamRef.current;
    if (el !== null && stickBottom.current) el.scrollTop = el.scrollHeight;
  }, [lastSeq]);

  const onScroll = useCallback(() => {
    const el = streamRef.current;
    if (el !== null) stickBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
  }, []);

  // 服务端 sent 确认后才清草稿（失败保留正文）
  useEffect(() => {
    if (state.lastSentSeq > 0) setDraft("");
  }, [state.lastSentSeq]);

  const send = useCallback(() => {
    const body = draft.trim();
    if (body === "") return;
    const mentions = [...new Set([...body.matchAll(MENTION_RE)].map((m) => m[1]!))];
    sockRef.current?.send({ type: "send", kind: "message", body, mentions, reply_to: null });
  }, [draft]);

  const canWrite = !state.archived && !state.readonly;

  return (
    <div className="chan">
      <PresenceBar presence={state.presence} participants={state.participants} status={state.status} />
      <div className="stream" ref={streamRef} onScroll={onScroll}>
        {state.messages.map((m) => (
          <MessageCard key={m.seq} msg={m} self={state.self} />
        ))}
        {state.messages.length === 0 && <p className="d-empty">party watch {slug}</p>}
      </div>
      {state.archived && <p className="banner banner--gray">channel archived — read-only from here on</p>}
      {state.loopGuard !== null && (
        <p className="banner banner--yellow">
          loop guard: agents hit the back-and-forth cap — a human message resets it
        </p>
      )}
      {state.readonly && !state.archived && (
        <p className="banner banner--gray">read-only link — you're watching the party</p>
      )}
      {state.sendError !== null && canWrite && <p className="banner banner--red">{state.sendError}</p>}
      {canWrite && (
        <Composer draft={draft} setDraft={setDraft} onSend={send} ready={state.status === "open"} />
      )}
    </div>
  );
}
