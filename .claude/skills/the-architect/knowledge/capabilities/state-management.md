# Capability: State Management

> Deciding who owns each piece of data at runtime — and, mostly, deciding you do not need a state
> library at all.

Last verified: 2026-10-17

## When a project needs this

- Two components must agree on the same value and they are not parent and child.
- The UI shows something the server does not know about yet (an in-flight edit, a selection).
- Data must stay fresh while the page is open — polling, subscriptions, or refetch on focus.
- The interview says "it shows stale data after saving", "the filters reset when I go back", or
  "two tabs disagree".

Most briefs trigger none of this seriously. Read the recommendation before adding a dependency.

## The primary split

Everything below follows from one distinction. Get it right and the rest is mechanical.

| | **Server state** | **Client state** |
|---|---|---|
| Source of truth | The database | The browser tab |
| Examples | Records, lists, the current user, entitlements | Sidebar open, active tab, unsaved form input, selected rows |
| Can go stale | Yes — another user or process can change it | No — nobody else can change it |
| Needs | Fetching, caching, invalidation, retry | A variable |
| Wrong tool | A global store. It cannot know when the server changed | A server cache. There is no server round trip to cache |

**Putting server state in a client store is the single most expensive mistake in this capability.**
It turns every mutation into manual cache surgery and guarantees screens that disagree.

## Decision matrix

| Option | Owns | Best for | Pros | Cons |
|---|---|---|---|---|
| **Server rendering** | Server state | Any data displayed on a server-rendered route | Zero client state, zero cache, no stale window | Requires a round trip to refresh |
| **Server mutations + revalidation** | Server state | Forms, create/update/delete | The framework invalidates for you; works without JS | Full-route revalidation can be coarse |
| **Server-state cache** (TanStack Query, SWR) | Server state | Client-owned fetching: polling, infinite lists, optimistic UI, offline | Caching, dedupe, retry, refetch-on-focus for free | A second cache alongside the server-rendered one — pick one owner per screen |
| **URL** | Shared view state | Filters, pagination, sort, tab, open record | Shareable, bookmarkable, survives reload and back | Awkward for high-frequency values; length limits |
| **Small client store** (Zustand, Jotai) | Client state | Cross-tree UI state: command palette, sidebar, wizard step | Tiny, no boilerplate, no provider tree | Easy to abuse as a server cache |
| **Full flux framework** (Redux Toolkit) | Client state | Large teams, deeply interdependent client state, time-travel debugging | Strict conventions, excellent devtools | Boilerplate-heavy; usually solving a problem the project does not have |

## Recommendation

**Server-first, one small client store, URL for anything shareable.** Concretely:

1. **Render server state on the server.** No library, no cache, no hook.
2. **Mutate with server actions or a typed endpoint, then revalidate.** No manual cache updates.
3. **Add a server-state cache only for screens that genuinely need client-owned fetching** —
   polling, infinite scroll, optimistic updates, offline. Not "all data goes through it".
4. **Put filters, pagination, sort, and tabs in the URL.**
5. **One small client store for UI-only state**, split into focused slices — one per concern, not
   one global object.

That covers essentially every SaaS, internal tool, storefront, and content site. Reach for a full
flux framework only when a team of five or more shares a genuinely interdependent client model —
a collaborative editor, an IDE-like tool, a complex canvas.

**Deviate when:** the app is a login-gated SPA with no server rendering
(`knowledge/shapes/internal-tool.md`) — then a server-state cache is the primary data layer, not an
add-on, and it is the *only* place server data lives.

## When you need no state library at all

| Need | Use instead |
|---|---|
| Data displayed on a server-rendered page | Fetch in the component |
| Form input | The framework's form primitives, or an uncontrolled form + validation on submit |
| Filters, pagination, sort, active tab | Search params |
| Theme | Cookie + root attribute — see `knowledge/capabilities/styling.md` |
| Session and user identity | The auth provider's own hook — see `knowledge/capabilities/auth.md` |
| Value used by one component and its children | A local variable or a prop |
| Value shared by exactly two nearby components | Lift it one level |

If none of the remaining state is cross-tree, **ship without a store.** Adding one later is an
afternoon; removing one is a refactor.

## URL as state

Anything a user might send to a colleague belongs in the URL: filters, search, page, sort, selected
record, active tab, date range.

- Parse and validate search params into typed values at the route boundary, with defaults — never
  read raw strings in components.
- Omit defaults from the URL. `?page=1&sort=created_desc` on a fresh load is noise.
- Replace, do not push, for high-frequency changes (typing in a search box), or the back button
  becomes unusable. Debounce before writing.
- Sensitive values never go in the URL — they land in logs, referrers, and analytics.

## Forms

- **Uncontrolled by default.** Let the DOM hold input values and read them on submit. Controlled
  inputs re-render the form on every keystroke and are only needed for live validation, dependent
  fields, or formatted input.
- **Validate with one schema on both sides.** The client copy is UX; the server copy is the
  contract. See `knowledge/capabilities/api-design.md`.
- **Field errors come back keyed by field name**, so the server can drive the same error display as
  the client.
- **Disable the submit control while in flight and show it.** Double submission is the most common
  duplicate-record bug.
- **Autosave drafts only when losing work is expensive** — long documents, multi-step wizards. It
  costs a table and a conflict story; do not add it to a three-field dialog.

## Caching and invalidation

- **Invalidate by scope, not by hand.** After a mutation, revalidate the affected route or query key
  and let data reload. Hand-patching cached objects is where cache bugs come from.
- **Name query keys hierarchically** — `['projects']`, `['projects', id]` — so one invalidation call
  covers a subtree.
- **Refetch on window focus for shared data**, off for expensive or rarely changing data.
- **Poll rather than subscribe** until polling actually hurts. Thirty seconds is invisible to users
  and orders of magnitude cheaper than a socket layer.
- **Scope every cache key by tenant and user.** A cache key that omits the tenant will eventually
  serve one customer another customer's data.

## Optimistic updates

Use them where the action almost never fails and latency is felt: toggles, likes, reorder,
checkbox completion, adding a chat message.

Do **not** use them for payments, deletions, or anything with server-side validation the client
cannot replicate.

The contract, every time:

1. Snapshot current state.
2. Apply the predicted result immediately.
3. On success, reconcile with the server's response — it is authoritative.
4. On failure, roll back to the snapshot **and tell the user**. A silent revert reads as the app
   losing their work.

## Real-time

**You need it for:** chat, multiplayer editing, live cursors and presence, monitoring dashboards
where seconds matter, in-app notifications that must arrive unprompted.

**You do not need it for:** ordinary dashboards (poll), feeds (refetch on focus), admin panels
(a refresh button), progress on a job the user just started (poll that job).

| Transport | Use when |
|---|---|
| **Polling** | The default. Simplest thing that works; no new infrastructure |
| **Server-sent events** | One-way server → client: job progress, notifications, streamed AI output. Reconnects natively, works over plain HTTP |
| **WebSockets** | Genuinely bidirectional and high-frequency: chat, presence, collaborative editing |
| **Database-backed realtime** (e.g. Supabase Realtime) | Already on that platform and the events are row changes — no server to run |
| **Managed pub/sub** (e.g. Pusher, Ably) | WebSockets needed but not the operational burden of running them |

Every realtime channel is authorized on the server, per subscriber, per tenant. A channel name is
not a permission. Collaborative editing with conflict resolution is a different problem — see
`knowledge/capabilities/sync-and-collab.md`.

## Data model additions

| Table / field | Purpose |
|---|---|
| `saved_views` | Persisted filter/sort sets when users ask to reuse them: owner scope, name, params blob. The URL stays the runtime source of truth; this only stores presets |
| `draft` | Autosaved form drafts: owner, entity type, entity id (nullable for new), payload, updated_at |
| `<entity>.updated_at` | Required for conflict detection — a mutation carrying a stale timestamp is rejected instead of overwriting |
| `presence` | Ephemeral only. Keep it in the realtime provider or a cache with TTL; never a durable table |

Most projects add only `updated_at`.

## Build steps this adds

1. **Write the state ownership map** — every screen's data, labeled server state or client state,
   with its owner. *Done when:* no item is listed in both columns, and every server-state item names
   exactly one fetch location.
2. **Move view state into the URL** on the primary list route: filters, sort, pagination.
   *Done when:* **WHEN** a user filters a list, reloads, and presses back **THE SYSTEM SHALL**
   restore the previous filter set, and the URL alone reproduces the view in a new tab.
3. **Establish the mutation → revalidation path** for one entity. *Done when:* after create, edit,
   and delete, both the list and the detail view reflect the change with no manual refresh and no
   hand-written cache patch.
4. **Add the client store only if the ownership map shows cross-tree UI state.** *Done when:* the
   store contains no field that also exists in the database, and each slice is under 50 lines.
5. **(If needed) Add the server-state cache** to the screens that require client-owned fetching.
   *Done when:* query keys are tenant-scoped, one invalidation call refreshes a whole entity
   subtree, and refetch-on-focus is deliberately on or off per query.
6. **(If optimistic) Prove the rollback path.** *Done when:* with the mutation endpoint forced to
   fail, the UI returns to its prior state within one second and surfaces a visible error.
7. **(If realtime) Authorize and prove the channel.** *Done when:* a subscriber from tenant A
   receives zero events belonging to tenant B, and dropping the connection reconnects and backfills
   missed events without a reload.

## Pitfalls

- **A global store as the app's database.** Every mutation becomes manual cache maintenance and the
  store drifts from the server. Server state belongs to the server.
- **Two caches for one screen.** Server-rendered data plus a client cache of the same records means
  the UI disagrees with itself after a mutation. One owner per screen.
- **Filters in component state.** They vanish on reload, cannot be shared, and break the back button.
  The URL is free and already persistent.
- **Cache keys without the tenant.** The most dangerous bug in this file — one user sees another's
  data, and it only appears under real concurrency.
- **Silent optimistic rollback.** The user sees their change appear, then vanish, with no
  explanation. Always surface the failure.
- **Realtime before it is needed.** A socket layer adds reconnection, auth, ordering, backfill, and
  scaling problems. Poll until polling is the measured bottleneck.
- **Refetch-on-focus on expensive queries.** Alt-tabbing becomes a load test on your own database.
- **A store per component "for consistency".** Fragmentation is not architecture. Add a store when
  two distant components need the same value, and not before.

## See also

- `knowledge/capabilities/frontend-architecture.md` — where data enters the client in the first place
- `knowledge/capabilities/api-design.md` — the mutation contract and shared validation schema
- `knowledge/capabilities/sync-and-collab.md` — when two people edit the same record simultaneously
- `knowledge/capabilities/database.md` — tenant scoping that cache keys must mirror
- `knowledge/runtime-tracks/ts-node.md` — the concrete libraries and their pins
