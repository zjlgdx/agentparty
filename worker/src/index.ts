// worker 入口占位 — rest 路由与 ws 转发由后续实现
import { Hono } from "hono";

export { ChannelDO } from "./do";

const app = new Hono();

app.get("/api/health", (c) => c.json({ ok: true }));

export default app;
