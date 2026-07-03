// ws 客户端：帧异步迭代 + 指数退避重连 + 游标自动推进
import type { ClientFrame, ServerFrame } from "@agentparty/shared";

class FrameQueue {
  private items: ServerFrame[] = [];
  private waiters: ((r: IteratorResult<ServerFrame>) => void)[] = [];
  private done = false;

  push(frame: ServerFrame): void {
    if (this.done) return;
    const w = this.waiters.shift();
    if (w) w({ value: frame, done: false });
    else this.items.push(frame);
  }

  end(): void {
    if (this.done) return;
    this.done = true;
    for (const w of this.waiters.splice(0)) w({ value: undefined, done: true });
  }

  async next(): Promise<IteratorResult<ServerFrame>> {
    const item = this.items.shift();
    if (item !== undefined) return { value: item, done: false };
    if (this.done) return { value: undefined, done: true };
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  [Symbol.asyncIterator](): AsyncIterator<ServerFrame> {
    return this;
  }
}

export interface ConnectOptions {
  onCursor?: (cursor: number) => void;
  backoffBaseMs?: number;
  backoffMaxMs?: number;
  pingIntervalMs?: number;
}

export interface Connection {
  frames: AsyncIterable<ServerFrame>;
  send(frame: ClientFrame): void;
  close(): void;
  readonly cursor: number;
}

export function connect(
  server: string,
  token: string,
  slug: string,
  since: number,
  opts: ConnectOptions = {},
): Connection {
  const base = opts.backoffBaseMs ?? 1000;
  const max = opts.backoffMaxMs ?? 30_000;
  const pingEvery = opts.pingIntervalMs ?? 25_000;
  const wsUrl =
    server.replace(/\/+$/, "").replace(/^http/, "ws") +
    `/api/channels/${encodeURIComponent(slug)}/ws`;

  const queue = new FrameQueue();
  let cursor = since;
  let closed = false;
  let attempt = 0;
  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let pingTimer: ReturnType<typeof setInterval> | null = null;

  const advance = (seq: number) => {
    if (seq > cursor) {
      cursor = seq;
      opts.onCursor?.(cursor);
    }
  };

  const stopPing = () => {
    if (pingTimer) {
      clearInterval(pingTimer);
      pingTimer = null;
    }
  };

  const open = () => {
    // bun 的 WebSocket 支持 headers 扩展
    ws = new WebSocket(wsUrl, {
      headers: { authorization: `Bearer ${token}` },
    } as unknown as string[]);
    const sock = ws;
    sock.onopen = () => {
      attempt = 0;
      sock.send(JSON.stringify({ type: "hello", since: cursor }));
      stopPing();
      pingTimer = setInterval(() => {
        if (sock.readyState === WebSocket.OPEN) sock.send(JSON.stringify({ type: "ping" }));
      }, pingEvery);
    };
    sock.onmessage = (ev) => {
      for (const line of String(ev.data).split("\n")) {
        if (!line.trim()) continue;
        let frame: ServerFrame;
        try {
          frame = JSON.parse(line) as ServerFrame;
        } catch {
          continue;
        }
        if (frame.type === "msg" || frame.type === "sent") advance(frame.seq);
        queue.push(frame);
      }
    };
    sock.onclose = () => {
      stopPing();
      if (closed) {
        queue.end();
        return;
      }
      const delay = Math.min(base * 2 ** attempt, max);
      attempt++;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (!closed) open();
      }, delay);
    };
    sock.onerror = () => {
      // close 事件跟随，交给 onclose 重连
    };
  };

  open();

  return {
    frames: queue,
    send(frame: ClientFrame) {
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(frame));
    },
    close() {
      if (closed) return;
      closed = true;
      stopPing();
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close();
      }
      queue.end();
    },
    get cursor() {
      return cursor;
    },
  };
}
