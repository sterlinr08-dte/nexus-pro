# Capability: Sync and Collaboration

> Keeping state consistent across multiple clients — either live between people in the same
> document, or durably on a device that goes offline.

Last verified: 2026-07-27

This is the highest-difficulty capability in the knowledge base. Most projects that ask for it need
one of the two cheap tiers below instead. Read "Do you actually need this?" before anything else.

## Two different problems

Users say "real-time" for both. They are not the same system and rarely share code.

| | **A. Live collaboration** | **B. Local-first sync** |
|---|---|---|
| Problem | Two people edit the same thing at the same second | One person edits with no network, for minutes or days |
| State lives | In a stateful room server, memory-first | On the device, in a full local replica |
| Failure mode | Cursor jitter, lost keystrokes, split-brain rooms | Silent data loss on reconnect, duplicated records |
| Persistence | Snapshot the doc periodically; presence is never persisted | Every write is durable locally before it is durable anywhere |
| Typical ask | Docs, whiteboard, design canvas, shared cursor | Field app, notes app, mobile client on a subway |

A product can need both (a design tool). Most need neither.

## When a project needs this

**Tier 0 — manual refresh.** Admin panels, reports. Add a refresh button. Done.

**Tier 1 — polling.** Dashboards, feeds, job status, inbox counts. Refetch on an interval and on
window focus. Covers most "live" requests. See `knowledge/capabilities/state-management.md`.

**Tier 2 — optimistic updates.** The UI must feel instant on the user's *own* action. Apply the
mutation locally, send it, reconcile or roll back. This is not sync — one writer, one truth.

**Tier 3 — server push.** Notifications, live counters, job completion. The server sends a
"something changed" ping over SSE or a WebSocket and the client refetches. Cheap, boring, correct.

**Tier 4 — presence and awareness.** Avatars, "3 people viewing", live cursors. Ephemeral state
only; nothing is persisted, so nothing can be corrupted. Moderate cost, high perceived value.

**Tier 5 — concurrent editing.** Two people typing in the same paragraph. CRDT or OT. Expensive.

**Tier 6 — local-first durable sync.** Offline writes that survive a reconnect. Most expensive.

### How to tell which tier

Ask the user these, in order:

1. *"If two people change the same field within five seconds, what should happen?"* — "last one
   wins" or "that never happens" means Tier 1–3. "Both edits must survive" means Tier 5.
2. *"Does the app have to work with the network off?"* — no means you stop at Tier 4.
3. *"Would the product be broken without live cursors, or just less impressive?"* — "less
   impressive" means ship Tier 3 and add Tier 4 later.
4. *"What is the unit people collaborate on?"* — if there is no single shared document or canvas,
   there is nothing to CRDT.

Anything Tier 5 or 6 roughly doubles the build order and permanently raises the cost of every
schema change. Say that out loud during Phase 3 before the user commits.

## Decision matrix

### A. Live collaboration

| Option | Best for | Pros | Cons |
|---|---|---|---|
| **Managed collab platform** (Liveblocks, Convex, PartyKit) | Teams shipping multiplayer without owning infra | Presence, storage, and the room server in one SDK; comments and notifications included | Per-MAU or per-connection pricing; your document lives in their store |
| **CRDT lib + your own room server** (Yjs or Loro on Cloudflare Durable Objects, Y-Sweet, or a stateful node) | Products where the document is the product | Full control of persistence and export; mature editor bindings | You own scaling, backpressure, snapshot compaction, and auth per room |
| **Automerge** | Document sync where history and merge auditability matter | Rich change history, strong local-first story | Heavier documents; smaller editor ecosystem |
| **Operational transform** (ShareDB and similar) | Linear text where server-authoritative ordering is required | Compact ops, decades of production use | Server must be authoritative and always available; harder to reason about than CRDTs |
| **Broadcast channel only** (Supabase Realtime, Ably, Pusher, Phoenix Channels) | Presence, cursors, "user X is typing" | Trivial to add; no conflict model to design | Gives you delivery, not convergence — do not build an editor on it |

### B. Local-first sync

| Option | Best for | Pros | Cons |
|---|---|---|---|
| **Read-replica sync** (ElectricSQL, PowerSync, Zero) | Existing Postgres app that needs offline reads and scoped writes | Keeps your existing database as source of truth; partial replication by shape/scope | Write path still needs conflict rules you design |
| **Mutation-log sync** (Replicache-style) | Apps where every write is already a named intent | Server re-runs mutations authoritatively; rollback is well-defined | You must express every write as a replayable mutator |
| **Sync-native backend** (Convex, InstantDB, Triplit, Jazz) | Greenfield, small team, sync is the point | Sync, auth, and persistence in one model; fastest path to working offline | Migrating off later is a rewrite, not a port |
| **Mobile local DB + custom sync** (WatermelonDB, RxDB, SQLite plus your own protocol) | Mobile-first apps with a mature backend | Fits `knowledge/runtime-tracks/mobile-native.md` well | You are writing a sync protocol — budget for it as a project, not a step |

## Recommendation

**Default: don't.** Ship Tier 1–3. Polling with focus revalidation plus optimistic updates on the
user's own writes reads as "real-time" to almost every user, costs about a day, and cannot corrupt
data.

**When live collaboration is genuinely the product** (an editor, a canvas, a board): use a managed
collab platform for the first release. It gets presence, storage, and conflict resolution right on
day one, and it defers the room-server operations problem until you have revenue. Move to a CRDT
library on your own stateful room server when per-seat cost passes the cost of an engineer, or when
the document must live in your own database for compliance reasons.

**When offline is a hard requirement** (field work, transit, warehouses): pick a read-replica sync
layer over your existing Postgres rather than a sync-native backend, unless the project is
greenfield and small. Keeping the source of truth in a normal relational database means the rest of
`knowledge/capabilities/database.md` still applies.

**Never** hand-roll a CRDT. Never merge with "whoever wrote last wins" on a field users care about
without telling them — silent overwrite is the single most common local-first bug reaching users.

## Data model additions

**Live collaboration**

| Entity | Fields | Notes |
|---|---|---|
| `rooms` | id, resource_type, resource_id, created_at | Authorization is per-room; never per-connection |
| `doc_snapshots` | room_id, version, binary_state, created_at | Compact the update log into a snapshot on a schedule |
| `doc_updates` | room_id, seq, client_id, payload, created_at | Append-only; prune below the newest snapshot |
| `comments` / `threads` | id, room_id, anchor, author_id, body, resolved_at | Anchors must survive edits — store a relative position, not an offset |

Presence (cursor, selection, viewport, idle state) is **ephemeral**. Keep it in the room server's
memory with a TTL. Writing presence to your primary database is the classic way to melt it.

**Local-first sync**

| Entity | Fields | Notes |
|---|---|---|
| `clients` | id, user_id, device_label, last_seen_seq, last_seen_at | One row per installed replica, not per user |
| `mutations` | client_id, client_seq, name, args, applied_at | Idempotency key is `(client_id, client_seq)` |
| every synced table | `updated_at`, `deleted_at`, `version`, `last_writer_id` | Soft-delete only — a hard delete cannot be replicated to a client that never saw the row |

Deletes need tombstones with a retention window longer than your worst expected offline period.
Schema migrations must be additive and tolerate old clients, because an offline client can arrive
running a version you shipped months ago.

## Build steps this adds

Splice after the shape's data-model and auth steps.

1. **Pin the chosen tier in code** — export the tier as a named constant from one module, together
   with the parameters it derives (poll interval, presence TTL, retry backoff). The tier rationale
   and the answers to the four questions go in the blueprint's decision log; the *code* is what this
   step gates. · *Done when:* a test imports the tier constant from that single module and asserts
   the running sync interval equals the value that tier defines, and a grep-based test fails the
   build if any sync interval or presence TTL appears as a numeric literal anywhere outside it.
2. **Ship the cheap tier first** — polling plus optimistic updates on the primary mutation.
   · *Done when:* WHEN a second browser mutates a record THE SYSTEM SHALL reflect the change in the
   first browser within one poll interval, verified by an automated two-context test.
3. **Add presence** (Tier 4+) — a room server connection publishing user id, name, cursor, and TTL.
   · *Done when:* WHEN a client disconnects THE SYSTEM SHALL remove its avatar for all other clients
   within 30 seconds; a leaked-presence test asserts zero stale entries after forced socket close.
4. **Authorize the room, not the socket** (Tier 4+) — issue a short-lived, room-scoped token from
   your backend. · *Done when:* a test asserts a user without access to the underlying resource
   receives a 403 on token issuance and cannot join the room directly.
5. **Wire the CRDT document** (Tier 5) — bind the editor to the shared type; no application state
   duplicated outside it. · *Done when:* two headless clients apply 200 interleaved edits offline
   from each other, reconnect, and converge to byte-identical state.
6. **Persist and compact** (Tier 5) — snapshot on an interval and on last-client-disconnect.
   · *Done when:* killing the room server mid-session and restarting loses no committed edit; a test
   asserts the update log shrinks after compaction.
7. **Build the local replica** (Tier 6) — local database, schema, and initial hydration for the
   user's scope. · *Done when:* with the network disabled at launch, the app renders previously
   synced data and accepts a new write.
8. **Define the write path and conflict rules per table** (Tier 6) — document, in the blueprint, the
   resolution rule for every synced table. · *Done when:* a table-by-table conflict table exists and
   each rule has a passing test.
9. **Test the reconnect storm** (Tier 6) — 50 queued offline mutations replayed at once.
   · *Done when:* WHEN a client reconnects with queued mutations THE SYSTEM SHALL apply each exactly
   once; replaying the same batch twice produces no duplicate rows.
10. **Surface sync state in the UI** — synced / syncing / offline / conflict, plus a manual retry.
    · *Done when:* toggling the network flips a visible indicator and no user action silently fails.

## Pitfalls

- **Building Tier 5 for a Tier 2 product.** The most expensive mistake in this file. Live cursors on
  a form nobody co-edits is weeks of work for a demo moment.
- **Presence in the primary database.** Cursor positions at 30 updates per second per user will take
  down Postgres. Memory plus TTL, always.
- **Broadcast mistaken for convergence.** A pub/sub channel guarantees delivery attempts, not that
  everyone ends in the same state. Dropped messages during a reconnect diverge clients permanently.
- **No offline authorization story.** A client can queue writes it is no longer allowed to make. The
  server must re-authorize every replayed mutation, not trust the client's snapshot of its own role.
- **Unbounded update logs.** Without compaction, document load time grows linearly forever and a
  year-old doc takes 30 seconds to open.
- **Non-additive migrations.** Dropping a column breaks every replica that has not synced since.
  Additive only, with a deprecation window measured in releases.
- **Server-authoritative timestamps assumed.** Device clocks are wrong, sometimes by years. Order by
  a server-assigned sequence or a logical clock, never by `Date.now()` from a client.
- **Testing with one browser.** Every failure mode here needs two concurrent clients and a
  controllable network. Build that harness in step 2 — see `knowledge/capabilities/testing.md`.

## See also

- `knowledge/capabilities/state-management.md` — Tier 0–3, which is where most projects should stop
- `knowledge/capabilities/database.md` — the source of truth that local replicas replicate
- `knowledge/capabilities/api-design.md` — mutation endpoints must be idempotent for replay to work
- `knowledge/capabilities/realtime-voice.md` — the other stateful-connection capability; shares the
  room-server and token-issuance patterns
- `knowledge/capabilities/testing.md` — two-client and offline harnesses
- `knowledge/shapes/saas-webapp.md` — where collaboration is usually requested and usually not needed
- `knowledge/shapes/mobile-app.md` — where offline is usually a real requirement
