import { env, runInDurableObject } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { api, createChannel, postMessage, seedToken, uniq } from "./helpers";

const workflow = (workflow_id: string, step_id = "step-1", run_id = "run-1") => ({
  workflow_id,
  kind: "pipeline",
  run_id,
  step_id,
});

function postStatus(
  slug: string,
  token: string,
  body: {
    state: "working" | "waiting" | "blocked" | "done";
    note: string;
    mentions?: string[];
    role?: "host" | "worker" | "reviewer" | "observer";
    workflow?: ReturnType<typeof workflow>;
  },
) {
  return api(`/api/channels/${slug}/messages`, token, {
    method: "POST",
    body: JSON.stringify({
      kind: "status",
      state: body.state,
      note: body.note,
      mentions: body.mentions ?? [],
      ...(body.role === undefined ? {} : { role: body.role }),
      ...(body.workflow === undefined ? {} : { workflow: body.workflow }),
    }),
  });
}

async function configureWorkflowGuard(slug: string, token: string, limit: number, enabled = true) {
  return api(`/api/channels/${slug}/workflow-guard`, token, {
    method: "PUT",
    body: JSON.stringify({ enabled, limit }),
  });
}

async function messages(slug: string, token: string) {
  const res = await api(`/api/channels/${slug}/messages?since=0&limit=100`, token);
  expect(res.status).toBe(200);
  return ((await res.json()) as { messages: Record<string, any>[] }).messages;
}

async function guardRows(slug: string) {
  const stub = env.CHANNELS.get(env.CHANNELS.idFromName(slug));
  return runInDurableObject(stub, async (_instance, state) =>
    state.storage.sql
      .exec(
        `SELECT workflow_id, count_since_progress, no_progress, blocked_seq, last_progress_seq,
                last_counted_seq, terminal, terminal_seq
           FROM workflow_guard_state
          ORDER BY workflow_id`,
      )
      .toArray(),
  );
}

describe("workflow no-progress guard", () => {
  it("blocks only a stalled workflow, recovers on progress, clears terminal state, prunes LRU, and supports reset", async () => {
    const ownerAccount = `${uniq("acct")}@leeguoo.com`;
    const workerA = await seedToken("agent", uniq("worker-a"), { owner: ownerAccount });
    const workerB = await seedToken("agent", uniq("worker-b"), { owner: ownerAccount });
    const host = await seedToken("human", uniq("host"), { owner: ownerAccount });
    const slug = await createChannel(workerA.token);

    const config = await configureWorkflowGuard(slug, workerA.token, 2);
    expect(config.status).toBe(200);
    expect(await config.json()).toEqual({ enabled: true, limit: 2 });

    expect((await postStatus(slug, host.token, { state: "working", note: "hosting", role: "host" })).status).toBe(200);
    expect((await postStatus(slug, workerA.token, {
      state: "working",
      note: "wf-a started",
      workflow: workflow("wf-a"),
    })).status).toBe(200);

    expect((await postMessage(slug, workerA.token, "still investigating 1")).status).toBe(200);
    expect((await postMessage(slug, workerA.token, "still investigating 2")).status).toBe(200);

    const afterTrip = await messages(slug, host.token);
    const blocked = afterTrip.find((m) => m.kind === "status" && m.sender.name === "system" && m.status?.workflow?.workflow_id === "wf-a");
    expect(blocked).toMatchObject({
      state: "blocked",
      mentions: expect.arrayContaining([workerA.name, host.name]),
      status: {
        blocked_reason: expect.stringContaining("no progress"),
        workflow: expect.objectContaining({ workflow_id: "wf-a" }),
      },
    });

    const limited = await postMessage(slug, workerA.token, "same loop again");
    expect(limited.status).toBe(409);
    expect((await limited.json()) as { error: { code: string; message: string } }).toMatchObject({
      error: { code: "workflow_guard", message: expect.stringContaining("wf-a") },
    });

    expect((await postStatus(slug, workerB.token, {
      state: "working",
      note: "wf-b started",
      workflow: workflow("wf-b"),
    })).status).toBe(200);
    expect((await postMessage(slug, workerB.token, "wf-b can continue")).status).toBe(200);

    const progress = await postStatus(slug, workerA.token, {
      state: "working",
      note: "moved to step 2",
      workflow: workflow("wf-a", "step-2"),
    });
    expect(progress.status).toBe(200);
    expect((await postMessage(slug, workerA.token, "after progress")).status).toBe(200);

    const done = await postStatus(slug, workerA.token, {
      state: "done",
      note: "wf-a done",
      workflow: workflow("wf-a", "step-2"),
    });
    expect(done.status).toBe(200);
    const doneRows = await guardRows(slug);
    expect(doneRows.find((r) => r.workflow_id === "wf-a")).toMatchObject({
      count_since_progress: 0,
      no_progress: 0,
      terminal: 1,
    });

    expect((await postStatus(slug, workerA.token, {
      state: "working",
      note: "wf-reset started",
      workflow: workflow("wf-reset"),
    })).status).toBe(200);
    expect((await postMessage(slug, workerA.token, "reset trip 1")).status).toBe(200);
    expect((await postMessage(slug, workerA.token, "reset trip 2")).status).toBe(200);
    expect((await postMessage(slug, workerA.token, "reset blocked")).status).toBe(409);
    const reset = await api(`/api/channels/${slug}/workflows/wf-reset/reset-guard`, host.token, { method: "POST" });
    expect(reset.status).toBe(200);
    expect(await reset.json()).toEqual({ ok: true, workflow_id: "wf-reset" });
    expect((await postMessage(slug, workerA.token, "after single workflow reset")).status).toBe(200);

    const stub = env.CHANNELS.get(env.CHANNELS.idFromName(slug));
    const lru = await runInDurableObject(stub, async (_instance, state) => {
      for (let i = 0; i < 201; i++) {
        state.storage.sql.exec(
          `INSERT OR REPLACE INTO workflow_guard_state (
             workflow_id, kind, run_id, step_id, state, count_since_progress, no_progress,
             blocked_seq, last_progress_seq, last_counted_seq, initiator_name, host_name,
             terminal, terminal_seq, updated_at
           )
           VALUES (?, 'pipeline', 'run', 'step', 'working', 0, 0, NULL, NULL, NULL, NULL, NULL, 0, NULL, ?)`,
          `old-${String(i).padStart(3, "0")}`,
          i,
        );
      }
      state.storage.sql.exec(
        `INSERT OR REPLACE INTO workflow_guard_state (
           workflow_id, kind, run_id, step_id, state, count_since_progress, no_progress,
           blocked_seq, last_progress_seq, last_counted_seq, initiator_name, host_name,
           terminal, terminal_seq, updated_at
         )
         VALUES ('blocked-keep', 'pipeline', 'run', 'step', 'working', 2, 1, 99, NULL, 99, ?, ?, 0, NULL, 1)`,
        workerA.name,
        host.name,
      );
      return { before: Number(state.storage.sql.exec("SELECT COUNT(*) AS n FROM workflow_guard_state").one().n) };
    });
    expect(lru.before).toBeGreaterThan(200);
    expect((await postStatus(slug, workerB.token, {
      state: "working",
      note: "touch prune",
      workflow: workflow("wf-prune"),
    })).status).toBe(200);
    const pruned = await runInDurableObject(stub, async (_instance, state) => ({
      total: Number(state.storage.sql.exec("SELECT COUNT(*) AS n FROM workflow_guard_state").one().n),
      blocked: Number(
        state.storage.sql.exec("SELECT COUNT(*) AS n FROM workflow_guard_state WHERE workflow_id = 'blocked-keep'").one().n,
      ),
      oldestZero: Number(
        state.storage.sql.exec("SELECT COUNT(*) AS n FROM workflow_guard_state WHERE workflow_id = 'old-000'").one().n,
      ),
    }));
    expect(pruned.total).toBeLessThanOrEqual(200);
    expect(pruned.blocked).toBe(1);
    expect(pruned.oldestZero).toBe(0);
  });
});
