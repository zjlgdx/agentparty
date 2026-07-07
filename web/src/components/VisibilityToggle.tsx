// 频道可见性切换（issue #38 web 前端）。public→private 立即生效；private→public 服务端要二段
// 确认（会暴露历史给任何人），这里用 409 needs_confirm 弹确认条。只对可写人类会话渲染，最终
// 由服务端强制 owner 校验（非 owner → 403，内联报错）。
import { useState } from "react";
import { AuthError, ForbiddenError, setChannelVisibility } from "../lib/api";

interface Props {
  slug: string;
  token: string;
  isPublic: boolean;
  onChanged(nextPublic: boolean): void;
  onAuthFailed(message: string): void;
}

export function VisibilityToggle({ slug, token, isPublic, onChanged, onAuthFailed }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // private→public 待确认：暂存待暴露的历史条数，用于确认条文案
  const [confirmPublic, setConfirmPublic] = useState<number | null>(null);

  async function apply(target: "public" | "private", confirm: boolean) {
    setBusy(true);
    setError(null);
    try {
      const r = await setChannelVisibility(token, slug, target, confirm);
      if (r.needsConfirm) {
        setConfirmPublic(r.messageCount ?? 0);
        return;
      }
      setConfirmPublic(null);
      onChanged(target === "public");
    } catch (e) {
      if (e instanceof AuthError) {
        onAuthFailed(e.message);
        return;
      }
      setError(e instanceof ForbiddenError ? e.message : e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="vis-toggle">
      <span className={`vis-badge vis-badge--${isPublic ? "public" : "private"}`}>
        {isPublic ? "PUBLIC" : "PRIVATE"}
      </span>
      <button
        type="button"
        className="d-btn vis-btn"
        disabled={busy}
        onClick={() => apply(isPublic ? "private" : "public", false)}
        title={isPublic ? "转为私有频道（仅成员可见）" : "转为公开频道（任何人可见历史）"}
      >
        {busy ? "…" : isPublic ? "转私有" : "转公开"}
      </button>
      {confirmPublic !== null && (
        <div className="vis-confirm" role="alertdialog" aria-label="确认转公开">
          <span className="vis-confirm-text">
            转公开后，历史 {confirmPublic} 条消息将对任何人可见。确认？
          </span>
          <button type="button" className="d-btn d-btn--primary" disabled={busy} onClick={() => apply("public", true)}>
            确认转公开
          </button>
          <button type="button" className="d-btn" disabled={busy} onClick={() => setConfirmPublic(null)}>
            取消
          </button>
        </div>
      )}
      {error !== null && <span className="vis-error">{error}</span>}
    </div>
  );
}
