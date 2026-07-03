// 左侧频道列表：手绘 pill + 蜡笔点（standing=绿 / temp=蓝 / archived=灰）
import type { ChannelInfo } from "../lib/api";

interface Props {
  channels: ChannelInfo[] | null;
  active: string | null;
  error: string | null;
  onOpen(slug: string): void;
}

function dotClass(c: ChannelInfo): string {
  if (c.archived_at !== null) return "d-dot--offline";
  return c.kind === "temp" ? "d-dot--waiting" : "d-dot--working";
}

export function ChannelList({ channels, active, error, onOpen }: Props) {
  return (
    <nav className="side" aria-label="channels">
      <p className="side-label t-mono"># channels</p>
      {channels === null && error === null && <p className="side-note t-mono">loading…</p>}
      {error !== null && <p className="side-note side-note--err t-mono">{error}</p>}
      {channels?.map((c) => (
        <button
          key={c.slug}
          type="button"
          className={
            "d-pill chan-pill" +
            (c.slug === active ? " is-active" : "") +
            (c.archived_at !== null ? " chan-pill--archived" : "")
          }
          onClick={() => onOpen(c.slug)}
          title={c.topic ?? c.slug}
        >
          <span className={`d-dot ${dotClass(c)}`} />
          <span className="chan-name">{c.title ?? c.slug}</span>
          {c.kind === "temp" && <span className="chan-tag t-mono">temp</span>}
          {c.archived_at !== null && <span className="chan-tag t-mono">archived</span>}
        </button>
      ))}
      {channels !== null && channels.length === 0 && (
        <p className="side-note t-mono">$ party channel create</p>
      )}
    </nav>
  );
}
