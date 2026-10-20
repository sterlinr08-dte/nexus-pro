# Shape: Marketing / Content Site

> A static or semi-static site whose job is to present or sell something — content-first, conversion-oriented, near-zero client JavaScript.

Last verified: 2026-07-27

## Is this your project?

**Yes if:** the user says "landing page", "our website", "brochure site", "docs site", "blog", or "directory"; success is measured in signups, demos, or organic traffic rather than logged-in usage; content changes more often than code and non-engineers must edit it; nearly every page can be rendered ahead of time and served from a CDN edge; there are no per-user accounts or private data.

**No if:**
- Users log in and see their own data → `knowledge/shapes/saas-webapp.md`
- There's a cart, checkout, and inventory → `knowledge/shapes/ecommerce-storefront.md`
- Users create content, comment, or follow each other → `knowledge/shapes/content-community-platform.md`
- The site is a shell around an LLM product → `knowledge/shapes/agent-app.md`

## Default runtime track

**TypeScript / Node** — see `knowledge/runtime-tracks/ts-node.md`. Use the static-first content framework named there, not the full-stack app framework: it ships zero JS by default and hydrates only what you explicitly mark interactive, which is exactly the cost model this shape wants.

Alternatives: the full-stack React framework on the same track when the site is one surface of a larger product and shares components with it; `knowledge/runtime-tracks/rails-laravel.md` when the site is glued to an existing monolith whose database already holds the content.

## Core capabilities

| Capability | Why this shape needs it | File |
|---|---|---|
| Frontend architecture | Islands vs. full hydration; where the content source plugs in | `knowledge/capabilities/frontend-architecture.md` |
| Styling | Tokens, type scale, dark mode — the design *is* the product | `knowledge/capabilities/styling.md` |
| Deployment | Static output, CDN, per-PR previews, redirects | `knowledge/capabilities/deployment.md` |
| Accessibility | Legal exposure on public pages, and it doubles as SEO | `knowledge/capabilities/accessibility.md` |
| Testing | Route smoke tests, link and metadata checks | `knowledge/capabilities/testing.md` |
| Observability | Real-user Core Web Vitals, form-submit success rate | `knowledge/capabilities/observability.md` |
| API design | Only the lead endpoint and any CRM webhook | `knowledge/capabilities/api-design.md` |
| Database | Directory variant only — the dataset behind generated pages | `knowledge/capabilities/database.md` |

## Data model

No user table. Model the *content*, and keep entities in files until files stop working.

| Entity | Fields | Notes |
|---|---|---|
| Page | slug, title, description, ogImage, noindex | One record per routable URL |
| Post | slug, title, excerpt, body, publishedAt, updatedAt, author, tags[] | Files first; add a CMS only when non-engineers edit weekly |
| Author | slug, name, bio, avatar, socials[] | Required for article structured data |
| Lead | email, name, message, source, utm{}, submittedAt | Write-only; the CRM or inbox is the real store |
| NavItem | label, href, children[] | Single source for header, footer, and sitemap |

## Variant: directory / programmatic SEO

One dataset, thousands of generated pages (`/tools/<slug>`, `/<city>/<service>`). Same track, different center of gravity.

- **The dataset is the product.** Versioned source (files in the repo, or a table once it's large); every page is a pure function of one row. Adds `knowledge/capabilities/database.md`.
- **Per-page uniqueness is the whole game.** Pages differing only by a swapped noun get treated as thin content. Each needs at least one field no competitor has, and metadata — title, description, canonical, JSON-LD — derives per row rather than from one shared template string.
- **Shard the sitemap.** Above the 50,000-URL per-file cap you need a sitemap index, generated from the dataset.
- **Decide the build-time budget before step 1.** Full static generation of a large dataset gets slow; page-level incremental or on-demand rendering behind a long CDN cache is the escape hatch.
- **Honest risk:** a business whose only channel is organic search is riskier than it used to be — answer engines increasingly resolve the query without a click. Treat directory traffic as one channel, never the plan.

## Distribution: SEO and answer engines

Classic ranking and being *citable* by AI answer engines are two deliverables. Ship both.

| Surface | What to build | How you check it |
|---|---|---|
| Crawlable HTML | Content in the server response, not injected client-side | `curl` the URL, grep for the headline text |
| Per-page metadata | Unique title, description, canonical, OG/Twitter image | Audit script over every route |
| Structured data | JSON-LD: Organization, WebSite, Article, FAQPage, Product as applicable | Structured-data validator reports no errors |
| `sitemap.xml` + `robots.txt` | Generated at build, submitted to search consoles | Fetches 200, lists every canonical URL |
| `llms.txt` | Curated markdown index at site root — what this is, key pages, one line each | Fetches 200; every URL inside also 200s |
| Quotable answers | Each key page opens with a direct 2-3 sentence answer to its query, plus a stable fact block (pricing, specs, FAQ) | Ask an answer engine the target question; check for a citation |

`llms.txt` is a convention, not a ratified standard, and no engine promises to read it. It's cheap and it forces a clean site summary — build it, don't bet on it. Serving a `.md` mirror beside each `.html` page is the same trade: low effort, unguaranteed payoff.

## Directory structure

Shown for the TypeScript track; names generalize.

```
src/
  pages/            # one file per route; index, pricing, contact, 404
    blog/           # listing + [slug] template
  layouts/          # Base (head/meta/fonts), Post
  components/
    sections/       # Hero, Features, Proof, Pricing, FAQ, CTA — one per band of the page
    ui/             # Button, Card, Badge — no logic
    islands/        # the only interactive components; each justified in a comment
  content/          # markdown posts + schema definition
  data/             # directory variant: the source dataset
  lib/              # cms client, mail client, seo helpers
  styles/           # tokens + base
public/             # fonts, og images, favicon, llms.txt, robots.txt
```

## Build order

1. **Scaffold + tokens** — create the project on the chosen track, wire the styling layer, define color/type/spacing tokens. · *Done when:* the dev server renders a blank page using only token values and the build command exits 0.
2. **Base layout** — head/meta component taking title, description, canonical, OG image as props; header and footer from one nav source. · *Done when:* view-source on any route shows a unique `<title>` and a `<link rel="canonical">`.
3. **Design system pass** — buttons, cards, section rhythm, dark mode if in scope. Run `ui-ux-pro-max` first. · *Done when:* a components page renders every primitive in both themes with nothing unstyled.
4. **Landing page, section by section** — hero, proof, features, pricing, FAQ, CTA; two sections per sitting, never all six at once. · *Done when:* the page renders at 360px and 1440px with no horizontal scroll and no layout shift on load.
5. **Inner pages** — about, pricing detail, legal, custom 404. · *Done when:* every nav link resolves to a 200 and the 404 page returns a real 404 status.
6. **Content pipeline** — content schema, listing, post template, RSS. · *Done when:* adding a markdown file with valid frontmatter makes a post appear in the listing after rebuild, and invalid frontmatter fails the build with a named error.
7. **Lead capture** — form island with inline validation and a honeypot, POST endpoint that emails and optionally forwards to the CRM. · *Done when:* WHEN a valid submission is posted THE SYSTEM SHALL return success, deliver an email, and render a success state; an empty required field never reaches the network.
8. **Directory variant only — generation** — route mapping one dataset row to one page with derived metadata and JSON-LD. · *Done when:* row count equals generated page count and three random slugs return 200 with distinct titles and descriptions.
9. **SEO surface** — sitemap (sharded if needed), robots, structured data, per-page OG images. · *Done when:* an audit script over every route reports zero missing titles, zero duplicate descriptions, zero canonical mismatches.
10. **Answer-engine surface** — `llms.txt`, quotable opening paragraphs on key pages, FAQ structured data. · *Done when:* `llms.txt` returns 200 and every URL it lists returns 200.
11. **Images and fonts** — modern formats, explicit width/height, self-hosted fonts with preload and `font-display`. · *Done when:* no shipped image exceeds 200KB and no third-party font request appears in the network panel.
12. **Accessibility + smoke tests** — keyboard path through nav and form, contrast check, E2E test hitting every route. · *Done when:* the automated a11y scan reports zero critical issues and the E2E suite passes on all routes.
13. **Performance gate** — measure on a throttled mobile profile. · *Done when:* Lighthouse performance and SEO both score at least 95 on the landing page and one content page.
14. **Deploy** — CDN host, custom domain, PR previews, redirects for old URLs, analytics. · *Done when:* a scripted request to the production apex returns 200 over HTTPS with a valid certificate chain, every legacy URL in the redirect map returns its documented 301 to a 200, a PR run prints a preview URL that also returns 200, and a headless browser loading the production landing page records at least one outbound request to the analytics collector returning 2xx.

## Post-build launch checklist

Deliberately not build steps — each depends on a third party or a real human, so it cannot terminate inside the build.

| Item | Why it cannot be a build gate | Start it |
|---|---|---|
| Verify real-user pageviews and Core Web Vitals from actual devices | Field data accumulates over days; only lab data exists at build time | Week one after launch |
| Submit the sitemap to search consoles and confirm indexing | Crawl and index on the engine's schedule | Launch day |
| Check whether an answer engine cites the quotable page | No API guarantees it, and no engine promises to read `llms.txt` | 2-4 weeks after launch |
| CRM / inbox receipt of a real lead, end to end | Depends on someone else's mailbox and account | Launch day, with a live test submission |

## Pitfalls

- **Reaching for a SPA framework.** Client-side routing pays hydration cost on every visit and hands crawlers less. Static-first, islands only where interaction exists — and every island is a bundle, so if a component doesn't respond to input it isn't one.
- **Desktop-first design.** Most marketing traffic is mobile. Design the 360px view first; desktop is the adaptation.
- **A CMS nobody needs.** Repo files beat a hosted CMS until a non-engineer edits weekly. Adding one later is a day; removing one is a migration.
- **An unoptimized hero that owns the largest contentful paint.** Explicit dimensions, modern format, preload the hero, lazy-load the rest.
- **Copy written last.** Sections built around placeholder text get rebuilt when the real copy lands. Get the message before the markup, then run `/humanizalo` over it.
- **One OG image for the whole site.** Every shared link looks identical. Generate per page.
- **Analytics that force a consent banner.** A privacy-preserving analytics service skips the banner and the cookie-policy work entirely.

## Skills for the build phase

Install commands and fallbacks: `knowledge/skills-registry.md`. No slash means auto-activating — writing those with a slash is a silent no-op.

| Skill | When |
|---|---|
| `ui-ux-pro-max` | Before step 3 — palette, type scale, component style |
| `frontend-design` | Every section in steps 4-5 |
| `emil-design-eng` | Scroll reveals, hover states, motion restraint |
| `/claude-seo-ai:audit` `:geo` `:score` | After step 9 — classic SEO plus answer-engine visibility |
| `/humanizalo` | All marketing and blog copy |
| `agent-browser` | Analyzing a reference site the user names |
| `playwright-cli` | The route smoke suite in step 12 |

## See also

- `knowledge/runtime-tracks/ts-node.md` — pinned framework, styling, and tooling versions
- `knowledge/capabilities/frontend-architecture.md` — islands, content collections, rendering modes
- `knowledge/capabilities/deployment.md` — CDN hosts, preview deploys, redirects
- `knowledge/capabilities/accessibility.md` — the checks that gate step 12
- `knowledge/shapes/ecommerce-storefront.md` — when the site actually takes money for products
- `knowledge/shapes/saas-webapp.md` — when this is only the front door to an app
