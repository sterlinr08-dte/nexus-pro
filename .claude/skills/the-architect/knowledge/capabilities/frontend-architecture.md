# Capability: Frontend Architecture

> How a UI is rendered, routed, and fed data — decided per route, before the first component exists.

Last verified: 2026-07-27

## When a project needs this

- Anything with a screen. Every shape except a pure API, CLI, or pipeline.
- The brief mixes public pages and logged-in pages on one domain — they need different rendering.
- SEO matters for some routes and not others.
- The interview surfaces "it feels slow", "the spinner never ends", or "the page flashes".
- An AI feature streams output token by token, or the model decides what UI to render.

The framework and its pins are **not** decided here. Pick the runtime track first
(`knowledge/runtime-tracks/ts-node.md` for the web default), then use this file to decide how you
render inside it.

## Decision matrix

Rendering is a **per-route** decision, not a per-app one. Most products use three of these at once.

| Strategy | Best for | Pros | Cons |
|---|---|---|---|
| **Static** — built once at deploy | Landing, pricing, legal, docs, blog | Fastest possible TTFB; cacheable at the edge; cheapest | Content is frozen until the next build; slow builds at thousands of pages |
| **Incremental** — static + background revalidation | Product pages, CMS content, public profiles | Static speed with fresh-enough data; no rebuild per edit | Readers can see stale data for one window; cache invalidation is now your problem |
| **Server-rendered per request** | Dashboards, search results, anything personalized | Always correct; data never leaves the server; no client fetch waterfall | Every request costs compute; needs a running server, not just a CDN |
| **Client-rendered (SPA)** | Internal tools behind a login, editors, canvas apps | Simple mental model; no server runtime; instant in-app navigation | Bad first paint; no SEO; auth flashes; bundle grows silently |
| **Streamed** — server-rendered in chunks | Pages with one slow section; AI output | Fast shell, progressive fill; no all-or-nothing wait | Needs real Suspense boundaries; harder to reason about error handling |

## Recommendation

**Server-first, client at the leaves.** Render on the server by default; make a component
client-side only when it needs interactivity, browser APIs, or subscriptions. This is the default
for every shape with a UI.

Route-level defaults:

| Route | Strategy |
|---|---|
| Marketing, docs, legal | Static |
| Catalog / content detail pages | Incremental |
| Everything behind auth | Server-rendered per request |
| Editor, canvas, drag-and-drop surfaces | Client, mounted inside a server-rendered shell |
| AI chat and generation | Streamed |

**Deviate when:** the product is a login-gated tool with no SEO and no public surface — a pure SPA
with a thin API is less machinery and ships faster (`knowledge/shapes/internal-tool.md`). Or when
the site is nearly all content — island architecture that ships zero JS by default beats a
full-stack framework (`knowledge/shapes/marketing-site.md`).

## The server/client boundary

The single most consequential line in a modern frontend. Get it wrong and either everything ships to
the browser or nothing is interactive.

- **Push the boundary down.** Mark the smallest interactive leaf as client, not the page that
  contains it. A page with one dropdown should ship one dropdown's worth of JavaScript.
- **Server components fetch; client components react.** Data access, secrets, and ORM calls live
  only on the server side of the line.
- **Props cross the boundary, not closures.** Anything passed into a client component is serialized
  — no functions, no class instances, no database handles.
- **A client component's children can still be server-rendered** when passed as `children` rather
  than imported. Use this to keep a client-side layout shell wrapping server content.
- **Never mark a whole layout as client** to fix one hook. That marks the entire subtree.

## Routing and layout composition

- **Route groups over duplicated layouts.** Public shell and app shell are two groups sharing one
  root — not two copies of the same header.
- **Layouts hold chrome; pages hold data.** A layout that fetches per-route data will refetch on
  every navigation or, worse, cache the wrong tenant's.
- **The tenant or locale segment wraps everything.** If URLs will ever carry `/:org` or `/:locale`,
  put the segment in from day one; adding it later rewrites every link in the app.
- **Modals: a route, not a boolean.** If a modal has shareable content (a record detail, a
  checkout step), it gets a URL. Otherwise it is local UI state.
- **Cap component size at ~300 lines.** Past that, split by responsibility — data, layout, control.

## Data-fetching boundaries

- **Fetch as deep as the data is used, not at the top.** Top-level fetching forces prop drilling and
  serializes unrelated requests.
- **Parallelize siblings.** Two independent awaits in sequence is a self-inflicted waterfall; start
  both, then await both.
- **One query module per feature**, imported only by server code. Components never import the
  database layer — see the directory rules in each shape file.
- **Validate at the boundary, once.** Incoming params and form payloads are parsed into typed
  objects at the edge of the server; nothing downstream re-checks. See
  `knowledge/capabilities/api-design.md`.
- **Client fetching is the exception**, and when you reach for it you are choosing a server-state
  cache — that decision lives in `knowledge/capabilities/state-management.md`.

## Loading and error states

Every route ships three states before it is done: loading, empty, error. Missing states are the most
common review finding on agent-built UIs.

- **Skeletons, not spinners**, for anything with known layout. Match the real content's dimensions
  so nothing shifts when data lands.
- **One error boundary per route segment**, plus a root one. A failed sidebar must not blank the
  page.
- **Empty state carries the primary action.** "No projects yet" with a create button, not an empty
  table.
- **Not-found is a real state**, distinct from error. A missing record returns 404, not a thrown
  exception — and for tenant-scoped records, 404 rather than 403, so ids do not leak.

## Streaming and generative UI

For products where a model produces the output (`knowledge/shapes/agent-app.md`,
`knowledge/capabilities/ai-llm-integration.md`):

- **Stream by default.** A first token in under a second beats a complete answer in eight. Render
  the shell, then the stream.
- **Three visible phases:** submitted (input locked, indicator on) → streaming (partial text,
  stop button live) → settled (actions available: copy, retry, branch).
- **A stop button is mandatory.** Aborting must cancel the server request, not just hide output.
- **Render structured output as components, not markdown.** When the model emits a tool result —
  a chart, a table, a confirmation card — map it to a typed component with a fallback for unknown
  types. Never inject model output as raw HTML.
- **Persist as you stream.** Write the partial message server-side so a refresh mid-generation does
  not lose it.
- **Auto-scroll must yield to the user.** Once they scroll up, stop following; offer a jump-to-latest
  control.

## Data model additions

None at the database level — this capability adds artifacts, not tables:

| Artifact | Purpose |
|---|---|
| Route manifest | Every route with its strategy (static / incremental / server / client) and auth requirement. Written before components; it is the frontend's contract |
| Per-route revalidation window | For incremental routes only — how stale is acceptable, in seconds |
| Suspense boundary map | Which sections stream independently on the slowest pages |

Streaming AI surfaces do add persistence — see `knowledge/capabilities/ai-llm-integration.md`.

## Build steps this adds

1. **Write the route manifest** — list every route with rendering strategy, auth requirement, and
   data source. *Done when:* the manifest covers every entry in the shape's build order, and no
   route is marked "decide later".
2. **Build both shells empty** — public layout and app layout, with navigation, no features.
   *Done when:* both render at 375px and 1440px with no horizontal scroll, and navigating between
   them does not remount the root.
3. **Establish the server/client boundary** — one representative page with a server-rendered body
   and a single client leaf. *Done when:* **WHEN** the page loads with JavaScript disabled **THE
   SYSTEM SHALL** still render its content and navigation.
4. **Add loading, empty, and error states to the primary list route.** *Done when:* the route
   renders correctly at 0 records, at 200+ records, with a forced fetch error, and the skeleton
   causes no layout shift when real data replaces it.
5. **Set the performance budget and measure it** — bundle size for the app shell and interaction
   latency on the busiest route. *Done when:* a production build reports the shell under budget and
   CI fails if a later change exceeds it.
6. **(AI surfaces) Implement the stream lifecycle** — submitted → streaming → settled, with abort.
   *Done when:* clicking stop mid-generation cancels the server request within one second and the
   partial output remains on screen and in storage after a refresh.

## Pitfalls

- **Marking the root layout as client.** One hook in a header drags the whole tree into the bundle.
  Extract the hook into a leaf instead.
- **Fetch waterfalls hidden behind awaits.** Sequential awaits of independent data are invisible in
  code review and obvious in a network waterfall. Look at the waterfall while building, not after.
- **Two sources of truth for the same data.** Server-rendered value plus a client cache of the same
  record produces UI that disagrees with itself after a mutation. Pick one owner per screen.
- **Auth flash.** Client-side redirects render the protected page for a frame first. Gate on the
  server, before render.
- **Layout shift from skeletons that do not match.** A skeleton with the wrong height is worse than
  a spinner.
- **Infinite spinner on error.** A loading state with no error path never resolves when the request
  fails. Every loading state has a matching error state.
- **Rendering model output as HTML.** Straight prompt-injection-to-XSS. Render as text or as mapped
  components, always.
- **Deciding rendering strategy per app.** "We're an SSR app" forces server compute onto a static
  pricing page. Decide per route.

## See also

- `knowledge/capabilities/state-management.md` — who owns the data once it reaches the client
- `knowledge/capabilities/styling.md` — tokens, component library, and the shells' visual system
- `knowledge/capabilities/accessibility.md` — focus management across route and modal transitions
- `knowledge/capabilities/ai-llm-integration.md` — the server side of streamed and generative UI
- `knowledge/runtime-tracks/ts-node.md` — the framework, its pins, and its routing conventions
