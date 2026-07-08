// 底部插话框：Markdown、@name mention（动态在线列表补全，issue #39）、Cmd/Ctrl+Enter 发送（spec §9 第 4 块）。
// readonly / archived 时由页面层直接不渲染本组件（错误内联为条幅）。
import { useCallback, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties, KeyboardEvent } from "react";
import { agentHue } from "../lib/agentColor";
import {
  activeMentionQuery,
  filterCandidates,
  type MentionCandidate,
  type MentionTier,
} from "../lib/mentions";
import { useT } from "../i18n/useT";
import "../i18n/strings/Composer";

interface Props {
  draft: string;
  setDraft(value: string): void;
  onSend(): void;
  ready: boolean; // ws open 才能发
  candidates: MentionCandidate[]; // @ 补全候选（participants ∪ presence，已分档排序）
}

const TIER_DOT: Record<MentionTier, string> = { online: "●", wakeable: "◐", recent: "○" };

interface MentionMenuState {
  start: number;
  query: string;
  items: MentionCandidate[];
  active: number;
}

function sameCandidateNames(prev: MentionCandidate[], next: MentionCandidate[]): boolean {
  return prev.length === next.length && prev.every((item, index) => item.name === next[index]?.name);
}

export function Composer({ draft, setDraft, onSend, ready, candidates }: Props) {
  const t = useT();
  const TIER_LABEL: Record<MentionTier, string> = {
    online: t("Composer.tier.online"),
    wakeable: t("Composer.tier.wakeable"),
    recent: t("Composer.tier.recent"),
  };
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const [menu, setMenu] = useState<MentionMenuState | null>(null);

  // 光标处是否在打 @<prefix> → 算候选菜单
  const recompute = useCallback(
    (text: string, caret: number) => {
      const q = activeMentionQuery(text, caret);
      if (q === null) {
        setMenu(null);
        return;
      }
      const items = filterCandidates(candidates, q.query);
      setMenu((prev) => {
        if (items.length === 0) return null;
        if (prev !== null && prev.start === q.start && prev.query === q.query && sameCandidateNames(prev.items, items)) {
          return { start: q.start, query: q.query, items, active: Math.min(prev.active, items.length - 1) };
        }
        return { start: q.start, query: q.query, items, active: 0 };
      });
    },
    [candidates],
  );

  const onChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(e.target.value);
    recompute(e.target.value, e.target.selectionStart ?? e.target.value.length);
  };

  // 选中候选：把 @<query> 替换成 @<name> + 空格，光标移到其后
  const choose = useCallback(
    (cand: MentionCandidate) => {
      const ta = taRef.current;
      if (ta === null || menu === null) return;
      const caret = ta.selectionStart ?? draft.length;
      const before = draft.slice(0, menu.start);
      const after = draft.slice(caret);
      const inserted = `@${cand.name} `;
      const next = before + inserted + after;
      setDraft(next);
      setMenu(null);
      const pos = before.length + inserted.length;
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(pos, pos);
      });
    },
    [draft, menu, setDraft],
  );

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (menu !== null) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMenu((prev) => (prev === null ? prev : { ...prev, active: (prev.active + 1) % prev.items.length }));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMenu((prev) => (prev === null ? prev : { ...prev, active: (prev.active - 1 + prev.items.length) % prev.items.length }));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        choose(menu.items[menu.active]!);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMenu(null);
        return;
      }
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onSend();
      return;
    }
    // 单独 Enter 发送，但要放过输入法合成中的 Enter（中文/日文候选词确认），否则会误发半成品
    if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="composer">
      {menu !== null && (
        <ul className="mention-menu" role="listbox" aria-label="mention suggestions">
          {menu.items.map((c, i) => (
            <li
              key={c.name}
              role="option"
              aria-selected={i === menu.active}
              className={"mention-item" + (i === menu.active ? " is-active" : "")}
              style={{ "--ah": agentHue(c.name) } as CSSProperties}
              // hover 看「是谁 + 职责」：显示名 + 账号 + 协作角色（issue #38/#39）
              title={
                [c.display, c.account && c.account !== c.display ? c.account : "", c.role ? t("Composer.role", { role: c.role }) : ""]
                  .filter(Boolean)
                  .join(" · ")
              }
              onMouseDown={(e) => {
                e.preventDefault();
                choose(c);
              }}
            >
              <span className="mention-dot" aria-hidden="true" />
              <span className="mention-name t-mono">{c.display}</span>
              {c.role && <span className="mention-role">{c.role}</span>}
              <span className={`mention-tier mention-tier--${c.tier}`}>
                {TIER_DOT[c.tier]} {TIER_LABEL[c.tier]}
              </span>
            </li>
          ))}
        </ul>
      )}
      <textarea
        ref={taRef}
        className="composer-input t-mono"
        rows={3}
        placeholder={t("Composer.placeholder")}
        value={draft}
        onChange={onChange}
        onKeyUp={(e) => recompute(e.currentTarget.value, e.currentTarget.selectionStart ?? 0)}
        onClick={(e) => recompute(e.currentTarget.value, e.currentTarget.selectionStart ?? 0)}
        onKeyDown={onKeyDown}
        onBlur={() => setTimeout(() => setMenu(null), 120)}
      />
      <button
        type="button"
        className="d-btn d-btn--primary composer-send"
        onClick={onSend}
        disabled={!ready || draft.trim() === ""}
        title={ready ? t("Composer.send.readyTitle") : t("Composer.send.connectingTitle")}
      >
        {t("Composer.send.label")}
      </button>
    </div>
  );
}
