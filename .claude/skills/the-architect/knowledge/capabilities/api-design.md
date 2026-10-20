# Capability: API Design

> The contract between your server and everything that calls it — your own UI, someone else's app, and increasingly an agent that read your docs thirty seconds ago.

Last verified: 2026-10-17

## When a project needs this

- Anything outside the server process reads or writes your data.
- A mobile app and a web app consume the same backend.
- You sell or publish endpoints — the API *is* the product.
- An agent, integration, or partner needs programmatic access.

If the only caller is your own server-rendered UI in the same codebase, you may not need an API at all. Server-side mutations against a query layer beat inventing endpoints nobody else calls.

## Decision matrix

| Style | Best for | Pros | Cons |
|---|---|---|---|
| **REST over HTTP** | Public APIs, partners, mobile, anything you do not control the client of | Universal, cacheable, debuggable with curl, every language has a client, describable to agents | Over- and under-fetching; you own versioning |
| **tRPC** | Full-stack TypeScript in one repository | End-to-end types with no code generation or schema file | TypeScript only, same repository, useless to external callers |
| **GraphQL** | Many distinct clients with divergent data needs | One endpoint, clients pick fields, strong introspection | Real operational cost: N+1, query depth limits, caching, auth per field |
| **Server actions / RPC from the framework** | The app's own UI | Almost no boilerplate, progressive enhancement, types for free | Framework-bound, not a public surface, easy to skip validation |
| **Webhooks (outbound)** | Telling other systems something happened | Push instead of poll | You must sign, retry, and deduplicate — see the pitfalls |

## Recommendation

**Server actions for your own UI, REST for everyone else — and keep both on top of one service layer.**

The rule that matters is not which protocol you pick; it is that transports are thin. Validation, authorization, and business logic live in functions that know nothing about HTTP. A server action, a REST handler, and an MCP tool are three doors into the same room. The moment logic lives inside a route handler, the second door duplicates it and the two drift.

Deviate when:
- **One TypeScript repository, no external consumers, complex read paths** → tRPC, and expose REST later if a partner appears.
- **Several first-party clients that genuinely need different shapes** → GraphQL. Only if you will fund the caching and N+1 work; do not choose it for a single web frontend.
- **The API is the product** → REST, generated from schemas, with an OpenAPI document and a published SDK.

## REST conventions

### URLs

```
GET    /v1/invoices                # list — paginated, filterable
POST   /v1/invoices                # create
GET    /v1/invoices/:id            # read one
PATCH  /v1/invoices/:id            # partial update (prefer over PUT)
DELETE /v1/invoices/:id            # delete
GET    /v1/invoices/:id/lines      # nested collection
POST   /v1/invoices/:id/send       # a verb only when it is a real state transition
```

Plural nouns, lowercase, hyphens between words. Nest at most one level — deeper, use a filter (`/v1/lines?invoice_id=...`). Reserve verb endpoints for transitions that are not a field write.

### Response envelope

One shape, every endpoint, including errors.

```json
{ "data": { }, "meta": { "next_cursor": "eyJpZCI6...", "has_more": true } }
```

```json
{ "error": { "code": "validation_error",
             "message": "Email is required",
             "details": [{ "field": "email", "message": "Required" }],
             "request_id": "req_01H..." } }
```

`code` is a stable machine string — clients and agents branch on it; `message` is human-facing and may change. Always return `request_id` so a support ticket maps to a log line. Timestamps are ISO-8601 UTC. Ids are opaque strings; never expose sequential integers.

### Status codes

| Code | When |
|---|---|
| 200 / 201 / 204 | Read or update / created (send a `Location` header) / deleted, no body |
| 202 | Accepted for async processing — include a way to poll |
| 400 / 401 / 403 | Malformed / not authenticated / authenticated but not permitted |
| 404 | Not found — also use for resources in another tenant |
| 409 | Conflict: a duplicate, or a state transition that is not legal now |
| 422 | Well-formed but semantically invalid (validation failure) |
| 429 | Rate limited — include `Retry-After` |
| 5xx | Your fault. Never return 200 with an error inside |

Returning 200 with `{"success": false}` is the single most common API design mistake. It defeats every HTTP client, retry policy, cache, and monitor in the chain.

### Pagination, filtering, sorting

```
GET /v1/invoices?limit=20&cursor=eyJpZCI6...      # cursor — default
GET /v1/invoices?status=open&created_after=2026-01-01&sort=-created_at
```

Cursor-based by default; offset only for small admin lists that need page numbers. Cap `limit` server-side. Whitelist filterable and sortable fields explicitly — passing user input into a query builder is how you get a table scan or worse. `-field` means descending. Search is one `q` parameter, not a query language.

## Validation at the boundary

Every input is parsed by a schema at the edge of the process — request body, query string, path parameters, headers, and webhook payloads alike. The handler receives a typed, trusted object or the request never reaches it.

- **Parse, do not validate.** The schema's output type is what flows inward; no raw request object survives past the boundary.
- One schema per operation, reused for types, the OpenAPI document, and the client SDK. Hand-maintained duplicates diverge.
- Reject unknown fields on writes. Silently ignoring a typo'd field becomes a bug report about data that "did not save".
- Validation errors return 422 with a field-level `details` array — enough for a form to highlight inputs and for an agent to retry correctly. Authorization runs *after* parsing and *before* business logic, in the service layer, not the route (`knowledge/capabilities/auth.md`).
- Mutating endpoints accept an `Idempotency-Key` header, stored with the response so a retry replays instead of double-charging.

## Versioning and deprecation

- Major version in the path (`/v1`). Simple, visible in logs, and unambiguous in a support conversation.
- **Within a version, only additive changes.** New optional fields, new endpoints, new enum values that clients already tolerate. Removing a field, tightening validation, or changing a type is a new version.
- Clients must ignore unknown response fields. Say so in the docs, and mean it.
- Deprecate on a clock, not a vibe: announce, return `Deprecation` and `Sunset` headers on the affected endpoints, log every call by consumer, contact the top callers, then remove. Nothing disappears without a header having warned about it first.
- Two supported versions at a time, maximum. Three means every fix ships three times.

## The agent-readable API surface

By 2026 a meaningful share of API traffic originates from an agent that discovered your service, read something, and called it. Design for that reader explicitly — it is cheap, and it is now a distribution channel.

### OpenAPI

Generate the document from the same validation schemas that guard the handlers. A hand-maintained spec is wrong within a month, and a wrong spec is worse than none because generated clients and agent tool definitions inherit the error. Descriptions are load-bearing: an agent picking between two endpoints has only your `summary` and `description` to go on. Include realistic examples for every operation, document error codes, and check the generated document into the repository so a diff shows up in code review when the contract changes.

### llms.txt

A markdown index at `/llms.txt` listing your key docs, plus a paragraph on what the product does. A community convention rather than a ratified standard, with uneven support — but it costs an afternoon, and it makes your docs legible to a reader that would otherwise parse a JavaScript-rendered site. Serve real markdown at those URLs; the index is worthless if the links resolve to a single-page app.

### MCP server

Ship one when agents should *act*, not just read. It wraps the same service layer as your HTTP API — never a second implementation.

**Get the protocol reality right.** The current Model Context Protocol revision is **stateless**: there is no `initialize` handshake; every request declares its protocol version in `_meta` (and, on Streamable HTTP, in the `MCP-Protocol-Version` header), and the server accepts or rejects each request independently. Servers **must** implement `server/discover`. The handshake-based revisions are now **legacy** — and per the spec's own compatibility matrix, a legacy-only host talking to a modern-only server *fails*, with no fall-forward. Hosts in the field still speak legacy. Confirm the current revision string at modelcontextprotocol.io/specification/versioning before pinning it.

Practical guidance:
- **Modern is the baseline; build dual-era.** Serve per-request `_meta` requests statelessly, implement `server/discover`, and also answer a legacy `initialize` (scoped to the stdio process or HTTP session) so older hosts keep working. The spec allows both eras on the same endpoint.
- **Negotiate, do not assume.** Reject an unsupported version with the spec's unsupported-version error listing what you support, read the client's declared capabilities, and degrade gracefully rather than erroring on an older host.
- **Few, well-named tools.** Twelve sharp tools beat sixty generated one-per-endpoint. Every tool description is a prompt; write it as instructions to a competent stranger, including when *not* to use it.
- **Token-lean responses.** Return the fields an agent needs, paginate by default, and never dump a raw database row. Response size is a cost and a context-window risk.
- **Same authorization, same limits.** An MCP call is an API call. It carries an identity, passes the same guard, and counts against the same rate limits and audit log.
- **Read-only by default.** Destructive tools are opt-in, narrowly scoped, and idempotent where possible.

For a project whose deliverable *is* the server, see `knowledge/shapes/cli-library-mcp.md`.

## Data model additions

| Table | Fields | Notes |
|---|---|---|
| `api_keys` | Defined in `knowledge/capabilities/auth.md` — the single owner. Do not redefine it here | Hash the secret, display once, make rotation possible |
| `idempotency_keys` | key, org_id, endpoint, request_hash, response_body, status_code, created_at, expires_at | Unique on (key, org_id). Replay the stored response on retry. Same table as `knowledge/capabilities/deployment.md`'s enqueue keys — `endpoint` is the scope |
| `webhook_endpoints` | id, org_id, url, secret, event_types, disabled_at | Outbound webhooks only |
| `webhook_deliveries` | id, endpoint_id, event_id, status, attempts, next_retry_at, response_code | Retries with backoff, visible in a UI so support can answer "did it send?" |

## Build steps this adds

1. **Service layer first** — business functions with no HTTP awareness, taking a typed input and an actor. *Done when:* the module imports nothing from the web framework, and a unit test calls it directly with no request object.
2. **Schemas + one endpoint end to end** — validation, authorization, handler, envelope, error mapping. *Done when:* a valid request returns 200 in the envelope; a missing required field returns 422 with a `details` entry naming the field; an unauthenticated request returns 401.
3. **Error handling middleware** — one place mapping thrown errors to codes, attaching `request_id`, and logging. *Done when:* an unhandled exception returns a 500 envelope with a `request_id` that appears in the logs, and no stack trace reaches the client.
4. **Pagination + filtering** — cursor helper, server-side max limit, whitelisted filter and sort fields. *Done when:* an unknown `sort` value returns 422 rather than being ignored, and paging through 200 seeded rows yields each row exactly once.
5. **Rate limiting** — per key and per IP, with `Retry-After`. *Done when:* exceeding the configured limit returns 429 with the header, and the limit resets after the window.
6. **Idempotency** — key storage and replay on mutating endpoints. *Done when:* the same `Idempotency-Key` sent twice creates one row and returns the identical response body both times.
7. **OpenAPI generated from the schemas** — checked in, plus docs. *Done when:* a generated client from the document successfully calls three endpoints, and changing a schema changes the checked-in document in the same commit.
8. **Agent surface** *(when agents are a target)* — `/llms.txt` with markdown docs, and an MCP server over the service layer. *Done when:* a modern request (`server/discover`, then a tools list carrying the version in `_meta`) and a legacy `initialize` session both list the same tools, and a read tool returns paginated data under the same authorization as the HTTP path.

## Pitfalls

- **200 with an error body.** Breaks retries, caches, alerting, and every generated client.
- **Logic in route handlers.** The second transport — mobile endpoint, MCP tool, background job — copies it, and the copies drift apart.
- **Leaking database shape.** Column renames become breaking API changes. Map explicitly to a response type.
- **Unbounded list endpoints.** One client asking for everything takes the service down. Cap on the server.
- **Inbound webhooks trusted blindly.** Verify the signature over the **raw** body before parsing, deduplicate by event id, return 200 quickly and do the work after. Duplicate and out-of-order deliveries are normal.
- **Outbound webhooks without retries.** Consumers go down. Queue, back off exponentially, expose delivery history, and disable an endpoint that has failed for days.
- **Tightening validation as a "bug fix".** Integrations were quietly relying on the looseness. That is a new version, not a patch.
- **One MCP tool per REST endpoint.** Machine-generated tool surfaces overwhelm the model's selection. Design the tool list for a task, not for coverage.
- **Documentation written for humans only.** If your docs require JavaScript to read, agents see an empty page — and so does the crawler that would have recommended you.

## See also

- `knowledge/capabilities/auth.md` — identity for API keys, machine callers, and the authorization guard the service layer calls
- `knowledge/capabilities/database.md` — the query layer beneath the service layer; cursor pagination mechanics
- `knowledge/capabilities/observability.md` — request ids, structured logs, and error reporting referenced throughout
- `knowledge/capabilities/testing.md` — contract tests that keep the generated document honest
- `knowledge/shapes/api-backend.md` — the shape where the API is the whole deliverable
- `knowledge/shapes/cli-library-mcp.md` — when the MCP server itself is the product
