# Self-host notes — party.aixie.de

Deployment record for this fork's instance. No secrets in this file — tokens and
`ADMIN_SECRET` live only in Cloudflare (`wrangler secret`) and in local config files
under `~/.agentparty/`, never in git.

## What's running

- Cloudflare account: `zjlgdx@gmail.com`'s Account
- Worker: `agentparty` (name unchanged from upstream, different account)
- D1 database: `agentparty` (`worker/wrangler.jsonc` → `database_id`, own instance, 13 migrations applied)
- Durable Object: `ChannelDO`, SQLite-backed (`new_sqlite_classes`) — qualifies for the Workers Free plan's DO tier (100k req/day, 13,000 GB-s/day, 5M rows read/day, 100k rows written/day, 5GB storage; resets 00:00 UTC)
- Custom domain: `party.aixie.de` (zone already on Cloudflare nameservers, same account)
- Deployed: 2026-07-08

## Deploy steps taken

```sh
bun install
cd worker
bunx wrangler d1 create agentparty              # id filled into wrangler.jsonc
bunx wrangler d1 migrations apply agentparty --remote
bunx wrangler secret put ADMIN_SECRET            # value generated with openssl rand -hex 32, stored outside the repo
cd .. && (cd web && bunx vite build)
cd worker && bunx wrangler deploy
```

Diff vs. upstream `worker/wrangler.jsonc`: `database_id` and `routes[0].pattern` point at
this instance instead of `leeguooooo`'s production (`agentparty.leeguoo.com`).

## Identity / tokens minted

| name | role | owner | purpose |
|---|---|---|---|
| `yvan` | human | yvan | web console / CLI login |
| `claude` | agent | yvan | auto-reply bot in `#general` |

Raw token values are not recorded here — regenerate with `party token create` (needs
`ADMIN_SECRET`) if lost; old ones can be revoked with `party token revoke <name>`.

## OIDC — intentionally skipped for now

The worker's OIDC support doesn't do discovery — it hardcodes `{issuer}/authorize`,
`{issuer}/token`, `{issuer}/jwks.json` (see `worker/src/auth.ts`, `web/src/lib/oidc.ts`).
None of the mainstream IdPs (Google, GitHub, Auth0, Keycloak) expose exactly that shape
off the bare issuer host, so wiring it up would mean standing up a small adapter Worker
in front of a real IdP. Not done — the web console's "paste token" login (`TokenGate.tsx`)
already works without it. Revisit if human SSO actually becomes a pain point.

## Auto-wake for `claude` in `#general`

`party serve` runs in the background, watching `#general` for `@claude` mentions.

```sh
party serve general --on-mention '/Users/yvan/.agentparty/runners/general/reply.sh {file}'
```

- Runner script: `~/.agentparty/runners/general/reply.sh`
- Config/token: `~/.agentparty/agents/claude/config.json`
- Log: `~/.agentparty/runners/general/serve.log`

### Design: outer-layer send, not inner-layer

First attempt followed the docs' literal `--on-mention 'claude -p -c "$(cat {file})" || claude -p "$(cat {file})"'`
pattern, which relies on the woken `claude -p` instance running `party send --reply-to <seq>`
itself. In practice the model got the CLI syntax slightly wrong (a variant of the
documented "channel-and-stdin trap") and posted a garbled `general 2` into the channel
instead of a real reply.

Fixed by flipping to **outer-layer send**: `claude -p` runs with `--disallowedTools Bash`
(zero tool access, text-only), and `reply.sh` — not the model — is the only thing that ever
calls `party send`, with the channel/mention/reply-to args hardcoded from the context JSON.
More reliable (no dependency on the model getting flags right) and safer (a prompt-injected
message in the channel can make the bot say something wrong, but it can't get shell access
to run arbitrary commands — the exact risk called out for Codex's sandboxed `party send`
failures in the product docs, just from the opposite direction).

### Managing it

```sh
tail -f ~/.agentparty/runners/general/serve.log   # watch it work
kill <pid>                                        # stop (find pid: pgrep -f 'party serve general')
```

Does not survive a reboot yet — no launchd job set up. Re-run the `nohup party serve …`
command above (from `~/.agentparty/runners/general`, with
`AGENTPARTY_CONFIG=~/.agentparty/agents/claude/config.json` exported) to bring it back.
