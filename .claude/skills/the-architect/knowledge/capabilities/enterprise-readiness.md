# Capability: Enterprise Readiness

> The procurement and security controls that gate B2B deals — SSO, SCIM, audit logs, permissions,
> residency, and compliance evidence. No amount of product polish substitutes for them.

Last verified: 2026-10-17

Enterprise readiness is not a feature users request. It is a checklist a security reviewer sends
after your champion already wants to buy. The deal stalls until you answer it.

## When a project needs this

Triggers from the interview:

- "We sell to companies, not consumers" · a seat-based or contract price above roughly $10k/year
- "Our buyer is IT / security / procurement", not the person who uses the product
- "Customers ask if we support Okta / Entra / Google Workspace login"
- "We handle their customers' personal data" · healthcare, finance, education, government
- "They sent us a security questionnaire" · a SIG, a CAIQ, or a 300-row spreadsheet
- "They asked for our SOC 2 report"

If the product is consumer, prosumer, or self-serve under a few thousand dollars a year, skip this
file entirely. Building it early is one of the classic ways a small team burns a quarter.

## Build now vs. defer

This is the whole decision. Split the checklist by **retrofit cost**, not by importance.

### Build up front — cheap now, brutal later

These change your data model and every query. Retrofitting them means touching every file.

| Control | Why it cannot wait |
|---|---|
| **Tenant/organization as a first-class entity** | Every row needs an owning org. Adding `org_id` to a live schema with real data is a migration project, not a migration. |
| **Roles and permissions as data** | `if (user.role === 'admin')` scattered through the codebase becomes unfixable. Store permissions; check permissions. |
| **An identity abstraction with one seam** | All login paths resolve to the same internal user record. If SSO can be added behind that seam later, SSO is a week. If not, it is a rewrite. |
| **An append-only audit event write path** | You cannot backfill history you never recorded. Start writing events on day one even if nothing reads them yet. |
| **Structured logs with request/actor/org IDs** | See `knowledge/capabilities/observability.md`. Also the raw material for audit evidence. |
| **Boring security hygiene** | Encryption in transit and at rest, secrets in a manager, dependency scanning, MFA on your own admin tooling, PRs required to merge. Costs nothing early; becomes SOC 2 evidence for free. |

### Defer until a signed deal or a live opportunity requires it

Each of these is weeks of work and ongoing operational cost, and each is sellable as a paid tier or
a contract commitment. Do not build them speculatively.

| Control | Trigger to build |
|---|---|
| **SAML SSO** | A named prospect says the word "Okta", "Entra", or "Ping" |
| **SCIM provisioning** | A customer with 200+ seats asks about deprovisioning, or an auditor does |
| **Customer-facing audit log export** | A customer asks for it in writing |
| **Data residency** (EU/US/other region) | An EU or public-sector prospect makes it a condition |
| **Customer-managed encryption keys** | Finance, health, or government asks; almost never before |
| **VPC / single-tenant / on-prem deployment** | A seven-figure conversation, and even then push back first |
| **SOC 2 Type II report** | A prospect blocks on it — but see the timing note below |
| **ISO 27001, HIPAA BAA, FedRAMP** | A specific vertical demands it; each is its own program |

### The one thing to start early even though you defer it

SOC 2 **Type II** attests to controls operating over an observation window, typically three to
twelve months. You cannot compress that window by paying more. So: adopt the *practices* early
(access reviews, onboarding/offboarding checklists, change management through pull requests,
vendor list, incident policy), and engage an auditor only when a deal needs the report. A Type I
report — controls designed as of a date — is faster and often unblocks a deal while Type II runs.

## Decision matrix

### SSO and directory

| Option | Best for | Pros | Cons |
|---|---|---|---|
| **Enterprise-SSO platform** (WorkOS, Stytch, Descope) | Teams with an existing auth stack that need SAML + SCIM bolted on | Handles the long tail of IdP quirks; admin portal customers self-configure; SCIM included | Per-connection pricing; a second identity vendor to reason about |
| **Auth vendor's enterprise tier** (Clerk enterprise connections, Auth0/Okta CIC) | Projects already on that vendor | One system, one bill, no seam to build | Enterprise tier pricing jumps hard; you are now fully locked in |
| **Open-source SAML service** (SAML Jackson, Keycloak, Ory) | Self-hosted requirements, or cost pressure at scale | No per-connection fee; runs inside your trust boundary | You debug IdP metadata, clock skew, and certificate rotation yourself |
| **Roll your own SAML** | Nobody | — | SAML is XML signature validation. Getting it subtly wrong is an authentication bypass. |

**OIDC vs SAML:** support both, lead with OIDC. Google Workspace, Entra ID, and Okta all speak it,
the flow is a normal OAuth flow, and it is dramatically easier to get right. But SAML is still what
large enterprise IT sends you, so you need it too — which is the argument for the platform option.

### Authorization model

| Model | Best for | Pros | Cons |
|---|---|---|---|
| **Static roles** (owner/admin/member) | Pre-enterprise, single tenant per user | Trivial | Enterprise buyers ask for custom roles within the quarter |
| **RBAC with permissions as data** | The default for B2B SaaS | Custom roles are a row, not a deploy; auditable | Needs a real permission catalog and enforcement discipline |
| **ReBAC / policy engine** (OpenFGA, SpiceDB, Cerbos, Oso) | Nested resources, sharing, "access to this folder implies access to its files" | Handles hierarchy and delegation natively | An extra service on the hot path; latency budget and cache design needed |

### Compliance tooling

Automation platforms (Vanta, Drata, Secureframe, and similar) connect to your cloud, HR, and code
hosting and collect evidence continuously. Worth it: they turn a months-long manual evidence hunt
into a dashboard, and they include policy templates. They do not make you compliant — an auditor
still audits, and the platform fee is separate from the audit fee. Budget for both.

## Recommendation

**Default: an enterprise-SSO platform behind your own identity seam, RBAC with permissions stored as
data, and an append-only audit log written from day one.**

Reasoning: the platform absorbs the part that is genuinely hard and genuinely dangerous (SAML
assertion validation, IdP-specific behavior, SCIM semantics), and it is the only item here that a
prospect can self-serve — they configure their own connection in an admin portal instead of trading
metadata XML with your support inbox for two weeks. The identity seam is what keeps that vendor
replaceable.

Deviate when: you are already deep in one auth vendor that sells enterprise connections, and the
price delta is small — then use theirs and keep one system. Or you have a hard self-hosting
requirement, in which case run an open-source SAML service inside your own boundary.

**On pricing:** gating SSO behind an enterprise tier is normal and defensible; SSO and SCIM carry
real support cost. Gating basic security — MFA, audit visibility of your own account, a password
policy — behind a paid tier reads as extortion and gets written up. Put SSO in the enterprise tier.
Keep baseline security in every tier.

## Data model additions

Extends `knowledge/capabilities/auth.md`'s `users`, `organizations`, `memberships`, and `api_keys` —
the same tables, never a second copy. `organizations` is the tenant boundary every domain row
references; `memberships` is many-to-many from the start. This capability adds:

| Entity | Fields | Notes |
|---|---|---|
| `roles` | id, org_id (null = system role), name, description | Custom roles are org-scoped rows |
| `permissions` | key (`billing.manage`, `member.invite`), description | A fixed catalog defined in code, seeded into the database |
| `role_permissions` | role_id, permission_key | Roles are bundles; the code checks permissions |
| `sso_connections` | org_id, protocol, idp_metadata_ref, status, enforced_at | `enforced_at` set means password login is blocked for that org |
| `verified_domains` | org_id, domain, verified_at, method | Required before domain-based auto-join. Never auto-join an unverified domain. |
| `scim_tokens` | org_id, token_hash, last_used_at, revoked_at | Store a hash, never the token |
| `directory_users` / `directory_groups` | external_id, org_id, raw_attributes, synced_at | The IdP's view, mapped to your users — keep them separate tables |
| `audit_events` | id, org_id, actor_type, actor_id, actor_ip, action, target_type, target_id, metadata, request_id, occurred_at | Append-only. No updates, no deletes. The one audit table — `knowledge/capabilities/database.md` defers here |

**Audit event rules.** `action` is a stable `object.verb` string (`member.invited`,
`sso_connection.enabled`, `export.downloaded`) — it is an API contract, so never rename one. Write
the event in the same transaction as the change it describes. Record failed authorization attempts,
not just successes; those are what security teams actually look for. Set a retention period per plan
and offer export as newline-delimited JSON or CSV.

## Build steps this adds

1. **Make the org the tenant boundary** — every domain table carries `org_id`; every query is
   org-scoped by construction, not by convention. · *Done when:* a test seeds two orgs and asserts
   that every list endpoint returns zero rows from the other org, and a cross-org direct-ID fetch
   returns 404, not 403.
2. **Build the permission catalog** — enumerate permissions in code, seed default roles.
   · *Done when:* every mutating endpoint calls a single `requirePermission` helper; a test
   enumerates routes and fails on any that skips it.
3. **Add the audit write path** — one helper, called inside the transaction.
   · *Done when:* WHEN a member's role changes THE SYSTEM SHALL write an `member.role_changed` event
   with actor, target, before/after values, and request ID; a test asserts the event and the change
   commit or roll back together.
4. **Put login behind an identity seam** — password, magic link, and social all resolve to one
   internal user record with one session shape. · *Done when:* adding a new auth method touches only
   the seam module; a test asserts identical session claims regardless of login method.
5. *(deal-triggered)* **Add SAML and OIDC SSO** — per-org connections, self-serve setup, optional
   enforcement. · *Done when:* a connection against a stub/mock IdP (signed fixture assertions)
   logs a user in end to end; the live-IdP check goes on the post-build launch checklist; WHEN `enforced_at` is set THE SYSTEM SHALL reject password login for that org's verified
   domains with a redirect to the IdP.
6. *(deal-triggered)* **Add SCIM provisioning** — user create/update/deactivate and group sync.
   · *Done when:* a mock-IdP SCIM deactivate request revokes that user's sessions and API keys,
   asserted in a test; a replayed SCIM request is idempotent. Real-IdP verification goes on the
   post-build launch checklist.
7. *(deal-triggered)* **Expose audit logs to customers** — filterable UI plus export.
   · *Done when:* an org admin filters by actor and date range and downloads a file whose row count
   matches the filtered view.
8. *(deal-triggered)* **Pin data residency** — region recorded on the org, enforced at the storage
   layer. · *Done when:* a test asserts every storage and backup client resolved for an EU org is
   configured with an EU region, and a subprocessor-manifest check fails on any non-EU entry.
9. **Publish a trust page** — subprocessor list, security practices, incident contact, status page,
   DPA template. · *Done when:* the page is live and linked from the footer and the pricing page.
10. **Adopt SOC 2 practices without the audit** — access reviews on a schedule, offboarding
    checklist, PR-gated changes, vendor inventory, incident response doc. · *Done when:* a
    grep check exits 0 only if each practice's doc exists and names an owner, a cadence, and a
    dated last run; first real runs go on the post-build launch checklist.

## Pitfalls

- **Building all of it before the first enterprise customer.** The most expensive form of this
  mistake is a SOC 2 audit and an on-prem deployment path for a prospect who never signs. Sell it
  first, build it against a real customer's IdP second.
- **Role strings in conditionals.** `role === 'admin'` spreads to hundreds of call sites and makes
  custom roles impossible. Permissions as data, from the first commit.
- **Auto-joining on unverified email domains.** Anyone with a `@bigco.com` address joining the
  BigCo tenant is a data breach if the domain was never proven. Verify by DNS record.
- **SSO without a break-glass account.** When the IdP is misconfigured at 2am, someone must still be
  able to get in. Keep one enforcement-exempt owner account and audit its every use.
- **Ignoring deprovisioning.** SSO controls login; it does not remove access to API keys, personal
  access tokens, or long-lived sessions. Revoke all of them on deactivation.
- **Mutable audit logs.** If your application can update or delete an audit row, the log is not
  evidence. Restrict at the database grant level.
- **Treating a compliance platform as compliance.** The dashboard being green is not a report. The
  auditor is a separate engagement with a separate cost and a separate calendar.
- **Signing an SLA you cannot measure.** Do not commit to 99.9% before you have external uptime
  monitoring and a defined measurement window — see `knowledge/capabilities/observability.md`.
  Define exclusions (planned maintenance, customer-caused, upstream provider) and cap the remedy at
  service credits.
- **A questionnaire answered from scratch every time.** Keep one maintained answer bank; the second
  questionnaire is 80% the first one.

## See also

- `knowledge/capabilities/auth.md` — the identity seam SSO plugs into
- `knowledge/capabilities/observability.md` — structured logs, uptime measurement, incident evidence
- `knowledge/capabilities/database.md` — tenant isolation, row-level scoping, backup and residency
- `knowledge/capabilities/accessibility.md` — public-sector and large-enterprise procurement asks for
  an accessibility conformance report alongside the security review
- `knowledge/capabilities/deployment.md` — regional deployment and single-tenant topologies
- `knowledge/shapes/saas-webapp.md` — the shape that almost always ends up here
- `knowledge/shapes/internal-tool.md` — inherits the permission model, rarely the rest
