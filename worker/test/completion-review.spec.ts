import { describe, expect, it } from "vitest";
import { WsClient, api, createChannel, postMessage, seedToken, uniq } from "./helpers";

interface MsgLike {
  seq: number;
  body: string;
  mentions: string[];
  reply_to: number | null;
  completion_artifact?: { kickoff_seq: number };
  completion_review?: {
    state: "pending_review" | "approved" | "rejected";
    policy: "sender" | "owner";
    reason?: string;
    reviewer?: { name: string };
    reviewed_at?: number;
  };
  rev_seq?: number;
}

async function fixture() {
  const acct = `${uniq("acct")}@leeguoo.com`;
  const owner = await seedToken("agent", uniq("owner"), { owner: acct });
  const slug = await createChannel(owner.token);
  const writer = await seedToken("agent", uniq("writer"), { owner: acct, channelScope: slug });
  const reviewer = await seedToken("agent", uniq("reviewer"), { owner: `${uniq("reviewer")}@example.com`, channelScope: slug });
  const readonly = await seedToken("readonly", uniq("ro"), { owner: acct, channelScope: slug });
  const gate = await api(`/api/channels/${slug}/completion-gate`, owner.token, {
    method: "PUT",
    body: JSON.stringify({ gate: "reviewer", policy: "sender" }),
  });
  expect(gate.status).toBe(200);
  const kickoff = await postMessage(slug, writer.token, "please do the work");
  const kickoffSeq = ((await kickoff.json()) as { seq: number }).seq;
  return { slug, owner, writer, reviewer, readonly, kickoffSeq };
}

async function postCompletion(slug: string, token: string, kickoffSeq: number) {
  return api(`/api/channels/${slug}/messages`, token, {
    method: "POST",
    body: JSON.stringify({
      kind: "message",
      body: "final synthesis",
      mentions: [],
      reply_to: kickoffSeq,
      completion_artifact: {
        kind: "final_synthesis",
        kickoff_seq: kickoffSeq,
        replies_count: 1,
        timeout: false,
        related_issues: [],
        related_prs: [],
      },
    }),
  });
}

describe("review-gated completion (#34)", () => {
  it("creates pending completion and approves it with message_update(review)", async () => {
    const { slug, writer, reviewer, readonly, kickoffSeq } = await fixture();
    const completion = await postCompletion(slug, writer.token, kickoffSeq);
    expect(completion.status).toBe(200);
    const completionBody = (await completion.json()) as { seq: number; completion_review?: { state: string; policy: string } };
    expect(completionBody.completion_review).toEqual({ state: "pending_review", policy: "sender" });

    const selfReview = await api(`/api/channels/${slug}/messages/${completionBody.seq}/review`, writer.token, {
      method: "POST",
      body: JSON.stringify({ action: "approve" }),
    });
    expect(selfReview.status).toBe(403);

    const readonlyReview = await api(`/api/channels/${slug}/messages/${completionBody.seq}/review`, readonly.token, {
      method: "POST",
      body: JSON.stringify({ action: "approve" }),
    });
    expect(readonlyReview.status).toBe(403);

    const ws = await WsClient.open(slug, reviewer.token);
    await ws.nextOfType("welcome");
    const approved = await api(`/api/channels/${slug}/messages/${completionBody.seq}/review`, reviewer.token, {
      method: "POST",
      body: JSON.stringify({ action: "approve" }),
    });
    expect(approved.status).toBe(200);
    const approvedBody = (await approved.json()) as { message: MsgLike; reply: MsgLike };
    expect(approvedBody.message).toMatchObject({
      seq: completionBody.seq,
      completion_review: { state: "approved", policy: "sender", reviewer: { name: reviewer.name } },
    });
    expect(approvedBody.message.rev_seq).toBeGreaterThan(0);
    expect(approvedBody.reply).toMatchObject({ reply_to: completionBody.seq, body: `review approved #${completionBody.seq}` });

    const update = await ws.nextOfType("message_update");
    expect(update).toMatchObject({
      type: "message_update",
      target_seq: completionBody.seq,
      action: "review",
      message: { completion_review: { state: "approved" } },
    });
    const reply = await ws.nextOfType("msg");
    expect(reply).toMatchObject({ reply_to: completionBody.seq, body: `review approved #${completionBody.seq}` });
    ws.close();

    const duplicate = await api(`/api/channels/${slug}/messages/${completionBody.seq}/review`, reviewer.token, {
      method: "POST",
      body: JSON.stringify({ action: "reject", reason: "too late" }),
    });
    expect(duplicate.status).toBe(409);
  });

  it("rejects with public reason and mentions the original sender", async () => {
    const { slug, writer, reviewer, kickoffSeq } = await fixture();
    const completion = await postCompletion(slug, writer.token, kickoffSeq);
    const seq = ((await completion.json()) as { seq: number }).seq;

    const missingReason = await api(`/api/channels/${slug}/messages/${seq}/review`, reviewer.token, {
      method: "POST",
      body: JSON.stringify({ action: "reject" }),
    });
    expect(missingReason.status).toBe(400);

    const rejected = await api(`/api/channels/${slug}/messages/${seq}/review`, reviewer.token, {
      method: "POST",
      body: JSON.stringify({ action: "reject", reason: "missing test evidence" }),
    });
    expect(rejected.status).toBe(200);
    const body = (await rejected.json()) as { message: MsgLike; reply: MsgLike };
    expect(body.message).toMatchObject({
      completion_review: { state: "rejected", reason: "missing test evidence", reviewer: { name: reviewer.name } },
    });
    expect(body.reply).toMatchObject({
      reply_to: seq,
      mentions: [writer.name],
      body: `@${writer.name} review rejected #${seq}: missing test evidence`,
    });
  });
});
