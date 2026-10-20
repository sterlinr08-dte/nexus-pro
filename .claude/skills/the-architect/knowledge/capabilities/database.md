# Capability: Database & Data Layer

> Where state lives, how it is shaped, and how it changes over time without losing anybody's data.

Last verified: 2026-10-17

## When a project needs this

- Anything survives a page refresh, a deploy, or a restart.
- Two users must see the same fact, or one user must see the same fact tomorrow.
- The brief mentions accounts, records, history, search, or reporting.

You do **not** need one for a static marketing site, a stateless transform API, or a CLI that reads local files. A managed form service or a git-committed content file beats a database you have to operate.

## Decision matrix

| Option | Best for | Pros | Cons |
|---|---|---|---|
| **Postgres — Supabase** | Most web apps; the default | Database plus auth, storage, realtime, and row-level policies in one service | You inherit the whole platform, more than some projects need |
| **Postgres — Neon** | Serverless apps, preview environments | Scale-to-zero, branch the database per pull request, fast provisioning | Just a database — auth and storage are yours to assemble |
| **Postgres — self-managed / cloud provider** | Regulated or existing infrastructure | Full control, no platform lock-in | You own backups, upgrades, failover, and pooling |
| **MySQL — PlanetScale** | High write volume, zero-downtime schema changes | Branch-and-merge schema workflow, proven at scale | Foreign-key constraints are constrained by design; you enforce more in app code |
| **SQLite — Turso / libSQL, or a file** | Edge reads, single-node apps, desktop, CLI | Microsecond reads, replicate near users, nearly free, no server to run | Writes serialize; poor fit for heavy concurrent writes |
| **Cloudflare D1** | Small apps already on Cloudflare's runtime | Colocated with the worker, no connection management | Size and write-throughput ceilings; check limits before committing |
| **MongoDB** | Genuinely variable documents | No migration to add a field; natural fit for nested payloads | Joins and multi-document invariants are painful; schema drift arrives quietly |
| **Redis — managed / Upstash** | Cache, rate limits, queues, ephemeral state | Fast, simple, expiring keys | Not a system of record. Never your only store |

## Recommendation

**Postgres, managed, with Supabase as the default and Neon when you want per-branch databases and nothing else bundled.** Relational is right for almost every brief because the interesting bugs are relational: an invoice with no customer, a membership pointing at a deleted org. Constraints catch those at write time; a document store discovers them in production.

Deviate when:
- **The data is genuinely schemaless** — heterogeneous scraped payloads, per-tenant custom fields with no shared shape → MongoDB, or a `jsonb` column in Postgres, which usually wins because you keep transactions.
- **Reads must be local to the user and writes are rare** — edge content, config, analytics dashboards → SQLite replicated at the edge.
- **The app is single-user and local** — desktop, CLI, browser extension → an embedded SQLite file. No server.
- **Vector search is core**, not incidental → still Postgres with a vector extension until scale forces a dedicated index; one store beats two you must keep in sync.

Add Redis when you need caching, rate limiting, or a queue — alongside the primary database, never instead of it.

## The ORM decision

| Option | Best for | Pros | Cons |
|---|---|---|---|
| **Typed SQL-shaped ORM** (Drizzle) | Most TypeScript projects | Schema is code, queries read like SQL, thin runtime, migrations generated from schema diffs | Fewer conveniences; you write more joins yourself |
| **Full-featured ORM** (Prisma) | Teams that value DX over control | Excellent ergonomics, strong types, mature migration tooling, good studio/tooling | Extra layer between you and the query plan; heavier client |
| **Query builder** (Kysely) | SQL-first teams | Type-safe with almost no abstraction | Bring your own migration runner |
| **Raw SQL + a mapper** | Small services, heavy analytics | Nothing between you and the plan | No type safety, no migration story, hand-written everything |
| **Platform client** (Supabase, Firebase SDK) | Prototypes, client-side reads | No backend for simple reads; policies enforce access | Access rules live outside your codebase; easy to under-test |

**Default: a typed SQL-shaped ORM in the same language as the app.** Pick one and let it own the schema — the schema file is the source of truth, migrations are generated from it, and types flow to the application for free. Version pins and the exact CLI commands live in the runtime track: `knowledge/runtime-tracks/ts-node.md`, `knowledge/runtime-tracks/python.md`, `knowledge/runtime-tracks/go.md`, `knowledge/runtime-tracks/rails-laravel.md`.

Never run two migration systems against one database. If the platform has a dashboard schema editor and your ORM has migrations, the dashboard is read-only from day one.

## Schema conventions

- Tables plural and snake_case (`users`, `blog_posts`); columns snake_case; booleans read as assertions (`is_archived`, not `archived_flag`).
- Foreign keys are `<singular_table>_id`. Indexes are `idx_<table>_<columns>`; unique constraints `uq_<table>_<columns>`.
- Enums as a constrained text column or a lookup table — a database enum type is painful to alter.
- Money as an **integer in minor units** plus a currency column. Never floating point. Timestamps timezone-aware, stored UTC, formatted only for display.
- Junction tables for many-to-many, named for both sides (`post_tags`), with a composite unique key. Hierarchies use a self-referential `parent_id`.
- Polymorphic foreign keys are a trap — use separate tables or nullable typed columns so the database can still enforce integrity.

### Required on every table

```sql
id          uuid primary key default gen_random_uuid()
created_at  timestamptz not null default now()
updated_at  timestamptz not null default now()
```

Add the tenancy scope column (`org_id` or `user_id`) to every tenant-owned table, with an index and a not-null constraint. `updated_at` is maintained by a trigger, not by application code — application code forgets.

Prefer UUIDs for anything exposed in a URL so ids are not enumerable. Where insert throughput matters, use a time-sortable UUID variant so the primary key index does not fragment.

### Soft deletes

```sql
deleted_at  timestamptz
```

Use for user-generated content, billing records, and anything a support ticket might ask you to restore. Skip for logs, events, sessions, and high-volume append-only tables — there, delete or partition.

If you soft-delete, do it properly: a partial unique index so a deleted row does not block reusing an email or slug, and a default-filtered read path so `deleted_at is not null` rows cannot leak through a forgotten `where`. A soft delete that half the queries ignore is worse than none.

## Migrations

- Every schema change is a checked-in migration file. No hand edits to a production database, ever. Migrations run **automatically on deploy**, before the new code serves traffic.
- Forward-only in production. "Roll back the migration" is a fantasy once rows exist; write a new migration that corrects.
- **Expand → migrate → contract** for anything destructive: add the new column, backfill in batches, dual-write, switch reads, then drop the old column in a later release. A rename in one step breaks every running instance of the old code mid-deploy.
- Test against a database with data. Backfills are where migrations time out. A seed script producing a realistic dataset — two tenants, enough rows to expose an N+1 — is part of the migration story, not an afterthought.

## Indexing and query health

- Index every foreign key — most databases do not do this for you — plus the columns you filter, sort, and join on. Composite index order is equality first, then range, then sort.
- Add a unique index for every real-world uniqueness rule (email per tenant, slug per org). Application-level uniqueness checks race.
- Read the query plan on the two or three heaviest queries before shipping. The dashboard list view is always one of them.
- Every index costs write throughput. Drop the ones nothing uses.

## Connection pooling

The failure mode of a serverless app on a traditional database is exhausting connections under a traffic spike, not slow queries.

- Serverless or per-request runtimes must connect through a pooler, never directly. Migrations and background workers use a **direct** connection instead.
- Poolers in transaction mode do not support session-scoped features — prepared statements, advisory locks, `LISTEN`/`NOTIFY`. Configure the driver accordingly or you get intermittent, load-dependent errors.
- Long-lived servers keep a small pool sized to the connection limit divided by the instance count. Bigger is not faster.

## Pagination

- **Cursor-based** for feeds, infinite scroll, and any list that changes while being read. The cursor is an opaque encoding of the sort key plus a tie-breaker id — never a raw offset in disguise. Stable under inserts, and constant cost at any depth.
- **Offset-based** only for small, admin-facing, numbered lists where the user expects "page 7 of 12". Deep offsets get slower linearly, and rows shift between pages when data changes underneath.
- Always cap the page size on the server. A client asking for 10,000 rows gets your maximum, not an outage.
- Return the next cursor in the response envelope; do not make the client construct it. See `knowledge/capabilities/api-design.md`.

## Data model additions

This capability contributes the conventions above rather than tables of its own. Two it usually adds:

| Table | Fields | Notes |
|---|---|---|
| `audit_events` | Schema owned by `knowledge/capabilities/enterprise-readiness.md` — use it as-is, never a second audit table | Append-only. Add on day one when the buyer is a company |
| `outbox` | id, event_type, payload, created_at, processed_at, attempts | Write alongside the row in the same transaction when an external system must learn about a change reliably |

## Build steps this adds

1. **Provision + connect** — create the database, store the URL as a secret, connect through the pooler with a direct URL reserved for migrations. *Done when:* a health check queries the database and returns 200 from a deployed environment, not just locally.
2. **Schema + first migration** — core entities, tenancy scope columns, required columns, foreign keys. *Done when:* the migration applies to an empty database and a second run is a no-op.
3. **Seed script** — realistic data covering at least two tenants. *Done when:* the seed command exits 0 and a query returns at least two tenants, each with rows in every core table.
4. **Constraints and indexes** — foreign-key indexes, unique constraints for real-world rules, indexes for the main list query. *Done when:* the plan for the dashboard list query uses an index scan, and inserting a duplicate email for one tenant is rejected by the database.
5. **Query layer** — every read and write goes through functions that take the tenancy scope as an argument. *Done when:* no route handler or component builds a query inline.
6. **Pagination** — cursor helper plus a server-enforced maximum page size. *Done when:* requesting 10,000 rows returns the cap, and inserting a row mid-scroll neither duplicates nor skips an item.
7. **Backups verified** — automated backups on, and one restore actually performed. *Done when:* a backup has been restored into a scratch database and row counts match. Untested backups are not backups.

## Pitfalls

- **No tenancy column, decided late.** Retrofitting `org_id` onto a live schema rewrites every query and every policy. Decide before the first migration.
- **N+1 on the list view.** The most-loaded page in the product. Count queries while building it.
- **`select *` everywhere.** Ships columns you do not need over the wire and breaks silently when a column is added or renamed. Name the fields.
- **Destructive migration in one step.** Rename or drop while old instances are still running and requests fail during the deploy window. Expand, migrate, contract.
- **Timestamps without timezones.** Ambiguous, unfixable after the fact, and every daylight-saving boundary is a bug report.
- **Floating-point money.** Rounding errors that reconcile to nothing.
- **JSON columns as a schema escape hatch.** One or two are pragmatic. Ten means you have an untyped, unqueryable, unmigrated database inside your database.
- **The platform dashboard as a second migration path.** Manual edits drift from the checked-in schema and the next migration fails in production only.
- **Caching before measuring.** A missing index is the cause far more often than a missing cache, and a cache adds an invalidation bug you did not have.

## See also

- `knowledge/capabilities/auth.md` — who owns the `users` table, and the mirror-sync problem when a provider does
- `knowledge/capabilities/api-design.md` — the pagination envelope and validation boundary that sit above this layer
- `knowledge/capabilities/deployment.md` — running migrations on release, environment separation, secrets
- `knowledge/runtime-tracks/ts-node.md` — pinned ORM and migration CLI commands for the default track
- `knowledge/stack-compatibility.md` — driver, pooler, and runtime combinations that do not work together
