// 底部插话框：Markdown、@name mention、Cmd/Ctrl+Enter 发送（spec §9 第 4 块）。
// readonly / archived 时由页面层直接不渲染本组件（错误内联为条幅）。
import type { KeyboardEvent } from "react";

interface Props {
  draft: string;
  setDraft(value: string): void;
  onSend(): void;
  ready: boolean; // ws open 才能发
}

export function Composer({ draft, setDraft, onSend, ready }: Props) {
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="composer">
      <textarea
        className="composer-input t-mono"
        rows={3}
        placeholder="chime in… markdown ok · @name to mention · ⌘⏎ to send"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
      />
      <button
        type="button"
        className="d-btn d-btn--primary composer-send"
        onClick={onSend}
        disabled={!ready || draft.trim() === ""}
        title={ready ? "send (⌘⏎)" : "connecting…"}
      >
        send
      </button>
    </div>
  );
}
