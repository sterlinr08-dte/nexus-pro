# Runtime Track: Go

> Choose Go when the deliverable is a high-throughput service or a single static binary, and you are
> willing to trade expressiveness for predictable latency, predictable memory, and a trivial deploy.

**Last verified: 2026-10-17** — every version below was checked on this date against
`https://go.dev/dl/?mode=json` (toolchain) and `proxy.golang.org/<module>/@latest` (modules).
When refreshing this file, re-verify and update this line.

## When to choose this track

**Yes:**
- **High-throughput APIs.** Goroutine-per-request costs kilobytes, not megabytes. A single instance
  absorbs traffic that would need a fleet of Node or Python workers.
- **CLIs, agents, and MCP servers that must ship as one file.** `CGO_ENABLED=0 go build` produces a
  static binary with zero runtime dependency. No interpreter, no `node_modules`, no venv. This is the
  strongest reason to pick Go — see [Single-binary distribution](#single-binary-distribution).
- **Long-running services where memory must stay flat.** Daemons, ingest workers, proxies, sidecars.
- **Anything that ships to a user's machine.** Cross-compile to 6 platforms from your laptop in
  under a minute.

**No:**
- **The project is mostly UI.** Go has no good frontend story. Use `runtime-tracks/ts-node.md`.
- **One person shipping a CRUD product fast.** Go's verbosity is a tax you pay per endpoint, and the
  ecosystem has no Rails/Next equivalent. Use `runtime-tracks/ts-node.md` or
  `runtime-tracks/rails-laravel.md`.
- **The work is ML/data science.** Use `runtime-tracks/python.md`.

## Pinned versions

| Layer | Choice | Version | Notes |
|---|---|---|---|
| Toolchain | Go | **go1.27.2** | Current stable. Previous supported line: go1.26.9. Most pinned modules now require `go 1.26.0` |
| HTTP routing | `net/http` **stdlib** | (stdlib) | Default. Method + wildcard patterns since Go 1.22 |
| HTTP routing (opt) | `github.com/go-chi/chi/v5` | v5.5.0 | Only when you need nested route groups / per-subtree middleware |
| HTTP framework (opt) | `github.com/gin-gonic/gin` | v1.12.0 | Only if the team already knows it |
| HTTP framework (opt) | `github.com/labstack/echo/v5` | v5.4.0 | Same caveat as Gin. v4 (v4.16.0) gets fixes only until 2026-12-31 — do not start on it |
| Postgres driver | `github.com/jackc/pgx/v5` | v5.11.0 | Use the native `pgxpool` API, not `database/sql` |
| Query codegen | `github.com/sqlc-dev/sqlc` | v1.31.1 | SQL in `.sql` files → typed Go. Not an ORM |
| Migrations | `github.com/pressly/goose/v3` | v3.29.0 | Embeds into the binary via `embed.FS` |
| SQLite (pure Go) | `modernc.org/sqlite` | v1.60.1 | No cgo — keeps the static-binary story intact |
| Assertions | `github.com/stretchr/testify` | v1.12.1 | `require` only. See Gotchas |
| Struct diffing | `github.com/google/go-cmp` | v0.7.0 | For comparing structs in tests. Last release 2025-01 — stable, slow-moving |
| Integration tests | `github.com/testcontainers/testcontainers-go` | v0.44.0 | Real Postgres/Redis in tests |
| Mocks | `go.uber.org/mock` | v0.6.0 | Successor to the archived `golang/mock`. Last release 2025-08 |
| Lint | `github.com/golangci/golangci-lint/v2` | v2.15.0 | v2 config schema — see Gotchas. go1.27 support since v2.13.0 |
| CLI framework | `github.com/spf13/cobra` | v1.10.2 | Default. `urfave/cli/v3` v3.14.0 is a lighter alternative |
| TUI | `charm.land/bubbletea/v2` | v2.1.0 | With `charm.land/lipgloss/v2` v2.0.6 for styling. v2 moved to the `charm.land` import path — the `github.com/charmbracelet/...` v2 path will not resolve |
| MCP server | `github.com/modelcontextprotocol/go-sdk` | v1.8.0 | Official SDK |
| Config | `github.com/caarlos0/env/v11` | v11.4.1 | Env → struct. Prefer over Viper unless you need files |
| Validation | `github.com/go-playground/validator/v10` | v10.30.5 | Struct-tag validation for request bodies |
| JWT | `github.com/golang-jwt/jwt/v5` | v5.3.1 | v4 and earlier have CVEs — never pin below v5 |
| Redis | `github.com/redis/go-redis/v9` | v9.23.0 | |
| Background jobs | `github.com/riverqueue/river` | v0.49.0 | Postgres-backed queue; no extra infra. 0.x — pin exactly; read the changelog on every bump |
| Tracing | `go.opentelemetry.io/otel` | v1.47.0 | |
| Release automation | `github.com/goreleaser/goreleaser/v2` | v2.18.3 | Cross-compiles + publishes in CI. Building it from source needs go ≥1.27.1 |
| Live reload (dev) | `github.com/air-verse/air` | v1.67.4 | |

## Setup

```bash
mkdir myapp && cd myapp
go mod init github.com/you/myapp

# Pin the toolchain in go.mod so every machine and CI runner agrees.
go mod edit -go=1.26.0 -toolchain=go1.27.2

go get github.com/jackc/pgx/v5@v5.11.0 github.com/pressly/goose/v3@v3.29.0 \
       github.com/caarlos0/env/v11@v11.4.1

# Build-time tools become `tool` directives in go.mod (Go 1.24+), so `go tool <name>`
# runs the pinned version with nothing installed globally.
go get -tool github.com/sqlc-dev/sqlc/cmd/sqlc@v1.31.1
go get -tool github.com/golangci/golangci-lint/v2/cmd/golangci-lint@v2.15.0

mkdir -p cmd/api internal/{http,store,config} migrations
```

## Conventions

```
cmd/<binary>/main.go   # one dir per binary; main() only wires and calls run(ctx) error
internal/              # everything real. `internal/` is compiler-enforced private
  http/                # handlers, middleware, router
  store/               # sqlc output + hand-written repo methods
  config/              # env → struct, validated once at boot
migrations/            # *.sql, embedded via //go:embed
pkg/                   # ONLY if an external repo imports it. Most projects need no pkg/
```

- **Accept interfaces, return structs.** Define the interface in the *consuming* package.
- **`context.Context` is the first parameter** of every I/O function. Never store it in a struct.
- **Errors wrap with `%w`** (`fmt.Errorf("load user %s: %w", id, err)`), inspected with `errors.Is` /
  `errors.As`. Never compare error strings.
- **`log/slog` for logging** — stdlib, structured, zero deps. `slog.NewJSONHandler` in production;
  `github.com/lmittmann/tint` v1.2.1 for readable dev output.
- **No global state, no DI framework.** Dependencies are struct fields on a `Server` value wired in
  `main`. Skip `pkg/` unless an external repo imports it — the compiler enforces `internal/`.
- **300 lines per file, soft cap.** Split by responsibility, not by type.

### Routing: does stdlib suffice?

**Yes, for most services — use `net/http.ServeMux`.** Since Go 1.22 it supports method matching and
path wildcards:

```go
mux.HandleFunc("GET /users/{id}", h.getUser)      // r.PathValue("id")
mux.HandleFunc("POST /users", h.createUser)
mux.HandleFunc("GET /files/{path...}", h.serve)   // trailing wildcard
mux.HandleFunc("GET /exact/{$}", h.exact)         // exact match, no prefix
```

Precedence is by specificity, not registration order; conflicting patterns panic at registration.

**Reach for chi when** you need nested route groups with per-subtree middleware stacks
(`r.Route("/admin", func(r chi.Router){ r.Use(auth); ... })`). Stdlib has no grouping, and hand-rolling
it gets ugly past ~3 middleware tiers. chi stays worth it because it is `http.Handler` end to end —
every stdlib middleware and test helper keeps working.

**Do not default to Gin or Echo.** Both invent their own `Context` type, which infects every handler
signature in the codebase and cuts you off from the stdlib middleware ecosystem. Pick them only when
the team already ships them or when you specifically want their bind/validate/render batteries.

## Testing / Lint / Build commands

| Task | Command |
|---|---|
| Test | `go test ./...` |
| Test (race + coverage) | `go test -race -cover ./...` |
| Benchmark | `go test -bench=. -benchmem ./...` |
| Lint | `go tool golangci-lint run ./...` |
| Format | `gofmt -w .` (or `go tool golangci-lint fmt ./...`) |
| Modernize idioms | `go fix ./...` (Go 1.26 rewrote this as a modernizer suite) |
| Generate queries | `go tool sqlc generate` |
| Tidy deps | `go mod tidy` |
| Vuln scan | `go run golang.org/x/vuln/cmd/govulncheck@latest ./...` |
| Build (dev) | `go build -o bin/api ./cmd/api` |

Tests live in `_test.go` next to the code. Use table-driven subtests with `t.Run`. Use
`testify/require` for assertions and `go-cmp` for struct comparison. For concurrent or time-dependent
code, use `testing/synctest` (GA in Go 1.25) — it gives a virtual clock so a `time.Sleep(time.Hour)`
resolves instantly and deterministically.

## Single-binary distribution

The reason to pick Go for `shapes/cli-library-mcp.md`. The output is one file with no runtime
dependency: `scp` it, `COPY` it into `FROM scratch`, or attach it to a GitHub release.

```bash
CGO_ENABLED=0 go build \
  -trimpath \
  -ldflags="-s -w -X main.version=$(git describe --tags)" \
  -o bin/myapp ./cmd/myapp
```

- `CGO_ENABLED=0` — the whole point. Forces the pure-Go DNS resolver and `os/user` implementation, so
  the binary has no libc dependency and runs on Alpine, distroless, and `scratch`.
- `-trimpath` — strips local filesystem paths from the binary. Required for reproducible builds.
- `-ldflags="-s -w"` — drops the symbol table and DWARF data. Typically 25–30% smaller.
- `-X main.version=...` — stamps the version at link time. (Go also records VCS info automatically;
  read it with `go version -m ./bin/myapp` or `debug.ReadBuildInfo()`.)

**Embed everything the binary needs** so there is nothing to install alongside it:

```go
//go:embed migrations/*.sql
var migrationsFS embed.FS
//go:embed web/dist
var staticFS embed.FS
```

### Cross-compilation

No toolchain, no container, no CI matrix required — set two env vars:

```bash
export CGO_ENABLED=0
for t in linux/amd64 linux/arm64 darwin/arm64 darwin/amd64 windows/amd64; do
  GOOS=${t%/*} GOARCH=${t#*/} go build -trimpath -ldflags="-s -w" \
    -o "dist/myapp_${t%/*}_${t#*/}" ./cmd/myapp
done   # append .exe for windows
```

`go tool dist list` prints every supported pair. For release engineering — checksums, archives,
Homebrew taps, Docker manifests, signing — use GoReleaser rather than hand-rolling the matrix.

**Cross-compilation dies the moment you need cgo.** Keep every dependency pure Go. The common trap is
SQLite: `mattn/go-sqlite3` requires cgo, so use `modernc.org/sqlite` instead.

## Deployment notes

- **Container:** multi-stage build, then `FROM gcr.io/distroless/static:nonroot` (or `scratch` if you
  bundle CA certs and a tzdata import). Final image is typically 10–20 MB.
- **GOMAXPROCS:** Go 1.25+ reads Linux cgroup CPU limits automatically — the old `automaxprocs`
  dependency is obsolete. Delete it.
- **Memory limit:** set `GOMEMLIMIT` to ~80% of the container limit. Without it the GC targets heap
  growth ratio, not your cgroup ceiling, and you get OOM-killed under burst load.
- **Graceful shutdown is mandatory:** trap `SIGTERM` via `signal.NotifyContext`, then
  `srv.Shutdown(ctx)` with a timeout. Without it every deploy drops in-flight requests.
- **`/livez` and `/readyz` are separate endpoints.** Conflating them causes restart loops when the
  database blips.
- Deployment targets and CI wiring: `knowledge/capabilities/deployment.md`.

## Gotchas

- **`go mod init` writes the full toolchain version** (`go 1.27.2` under go1.27.2). The "1.(N-1).0"
  default announced in the Go 1.26 notes shipped only in go1.26.0 and was reverted in go1.26.1.
  Lower it deliberately (`go mod edit -go=1.26.0`) and add a `toolchain go1.27.2` line to pin what builds.
- **golangci-lint v2 changed the config schema.** A v1 `.golangci.yml` will not load. v2 files start
  with `version: "2"`, and formatters (`gofmt`, `gci`, `goimports`) moved out of `linters` into a
  top-level `formatters` block run by `golangci-lint fmt`. Migrate with `golangci-lint migrate`.
- **Use `testify/require`, not `testify/assert`.** `assert` records the failure and keeps executing,
  so a nil-pointer assertion is followed by a panic that hides the real error. `require` stops the
  test at the failure.
- **`encoding/json/v2` is GA as of Go 1.27**, and `encoding/json` (v1 API) is now backed by the v2
  implementation — behaviour is preserved but error-message text may differ, so do not assert on
  JSON error strings. Opt out with `GOEXPERIMENT=nojsonv2` (slated for removal). New code may use v2 directly.
- **Green Tea GC is the default since Go 1.26** (10–40% less GC overhead). The `GOEXPERIMENT=nogreenteagc`
  escape hatch still exists in go1.27.2 despite the 1.26 notes expecting its removal — do not rely on it.
- **pgx: use `pgxpool`, not `database/sql`.** Going through `database/sql` costs you the binary
  protocol, native `LISTEN/NOTIFY`, `CopyFrom`, and typed Postgres arrays/JSONB.
- **sqlc is not an ORM.** Changing a query means re-running `go tool sqlc generate` — wire it into CI
  and fail the build if the generated output is dirty.
- **`net/http/httputil.ReverseProxy.Director` is deprecated** as of Go 1.26. Use `Rewrite`.
- **`golang/mock` is archived.** Use `go.uber.org/mock`; import path and `mockgen` binary changed.
- **Nil interface vs nil pointer:** returning a typed nil pointer as an `error` makes `err != nil`
  true. Return a bare `nil`.

## Skills for the build phase

- `find-skills` — discover Go-specific skills before the build starts.
- `playwright-cli` — E2E coverage when the Go service backs a web frontend.
- `/last30days` — current opinion on a library before adopting it.

If a skill is unavailable, fall back to this file plus `WebSearch`/`WebFetch`, note the fallback in
one line, and keep going.

## Shapes that use this track

- `knowledge/shapes/api-backend.md` — the primary fit
- `knowledge/shapes/cli-library-mcp.md` — single static binary, cross-compiled
- `knowledge/shapes/data-pipeline-analytics.md` — long-running ingest workers with flat memory
- `knowledge/shapes/automation-bot-integration.md` — webhook receivers and always-on daemons

## See also

- `knowledge/capabilities/database.md` — Postgres modelling and migration strategy
- `knowledge/capabilities/api-design.md` — REST/RPC contract shape, versioning, error envelopes
- `knowledge/capabilities/testing.md` — test pyramid and coverage targets
- `knowledge/capabilities/deployment.md` — container and release pipeline
- `knowledge/capabilities/observability.md` — `log/slog` + OpenTelemetry wiring
- `knowledge/runtime-tracks/ts-node.md` — pick this instead when the project is UI-heavy
- `knowledge/stack-compatibility.md` — known-bad combinations across tracks
