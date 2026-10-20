# Capability: Availability Engine

> Booking and scheduling — deriving free slots from rules, and making it impossible for two people to take the same one.

Last verified: 2026-07-27

## When a project needs this

- The brief says "book a call", "appointments", "reservations", "classes", "shifts", "rentals", "consultations", or "availability".
- A limited resource — a person, a room, a machine, a table, a court — is consumed for a window of time.
- Someone pays to hold a future slot, or a deposit is taken and later refunded on cancellation.
- Staff need to publish working hours, take holidays, and not be booked while they are already booked elsewhere.

This is the capability people most consistently underestimate. Timezones and concurrency turn a "simple calendar" into two weeks of work no matter what stack you pick.

## Decision matrix

| Option | Best for | Pros | Cons |
|---|---|---|---|
| Embed a hosted scheduler (Calendly, Cal.com cloud) | Booking is peripheral — a "talk to sales" button | Zero build, calendar sync and reminders included | The booking record lives outside your database; payments, capacity, and your own domain logic cannot reach it |
| Self-host an open scheduling engine (Cal.com) | Booking is core but conventional 1:1 | Full feature set, calendar sync solved, brandable | A large service to operate and upgrade; bending it to unusual rules costs more than writing them |
| **Build a rule-based engine** | Booking *is* the product, or rules are unusual: capacity, multi-resource, staff-plus-room, pricing per slot | Exact fit, one database, transactional with payments and inventory | Timezones and concurrency are yours to get right |
| Calendar-as-database (write straight to a calendar API) | Throwaway internal tools | No schema to design | API quotas, no transactions, no concurrency control. **Never for paid bookings** |

## Recommendation

**Build a rule-based engine and never store slots.**

Store rules, exceptions, and bookings. Compute availability on read. Precomputed slot tables are the single biggest source of both double-bookings and stale calendars: they go wrong the moment a rule changes, a holiday is added, or a tz-database update shifts a country's clocks, and they grow without bound the further into the future you materialize.

Deviate only when booking is genuinely peripheral to the product — then embed a hosted scheduler and move on.

Three architectural commitments that follow from this:

- **Slot generation is a pure function** of `(rules, exceptions, existing bookings, external busy blocks, now)`. Pure means testable, and this is the code you must test hardest.
- **The availability query is advisory; the booking write is authoritative.** Anything shown in a slot picker is stale by the time the user clicks. Re-validate every constraint inside the booking transaction.
- **Capacity is a number, not a boolean.** Model 1:1 appointments as capacity 1 from the start. Retrofitting group classes onto a boolean "is booked" model is a rewrite.

## Timezones — the number one source of bugs

Read this section before writing a single query.

1. **Store instants in UTC in a timezone-aware timestamp column. Store the IANA zone name separately** (`Europe/Madrid`, `America/Bogota`). Store it on the resource, on the service, and on the booking as `timezone_at_booking` for display and reminders.
2. **Never store an offset as the zone.** `+02:00` is correct twice a year. Offsets are outputs, not identity.
3. **Availability rules are wall-clock local time, not instants.** "9:00–17:00 in Madrid" stays 9:00 across a DST change while the UTC instant moves an hour. Store `start_time`/`end_time` as local times plus the zone, and expand to instants at query time.
4. **Convert, then do date math, then convert back.** Adding 24 hours to a UTC instant is not "the same time tomorrow". A local day can have 23 or 25 hours.
5. **Handle the two DST anomalies explicitly.** On spring-forward, some local times do not exist — skip those slots. On fall-back, some occur twice — pick the first occurrence and document it. A generator that ignores both will emit duplicate or impossible slots twice a year.
6. **The tz database changes.** Governments alter DST rules with weeks of notice. Keep the runtime's tz data current, and store the *rule* rather than the expanded instant for anything recurring — otherwise a rule change silently invalidates months of future bookings.
7. **Render in the viewer's zone, always with the zone label**, and attach a calendar file to every confirmation. Two people looking at one booking must see their own local time and be able to tell which zone it is in.
8. **Test with at least four zones:** the resource's zone, a southern-hemisphere zone (DST runs the other way), a half-hour-offset zone such as `Asia/Kolkata`, and `UTC` itself.

## Data model additions

| Table | Key fields | Notes |
|---|---|---|
| `resources` | `kind` (person, room, equipment), `timezone` (IANA name), `capacity` | The thing being consumed. Capacity defaults to 1 |
| `services` | `duration_minutes`, `buffer_before`, `buffer_after`, `min_notice_minutes`, `max_advance_days`, `slot_interval_minutes`, `capacity` | The bookable offering. Slot interval is separate from duration — 30-minute meetings can start every 15 |
| `service_resources` | `service_id`, `resource_id`, `required` | Multi-resource bookings: a class needs a coach **and** a room |
| `availability_rules` | `resource_id`, `weekday`, `start_time`, `end_time` (**local wall-clock**), `valid_from`, `valid_until` | Recurring working hours |
| `availability_exceptions` | `resource_id`, `starts_at`, `ends_at`, `type` (`block` \| `open`), `reason` | Holidays, PTO, and one-off extra openings |
| `bookings` | `resource_id`, `service_id`, `starts_at`, `ends_at` (UTC instants), `blocking_range`, `status`, `capacity_used`, `customer_id`, `timezone_at_booking`, `rescheduled_from_id` | Status: `held → confirmed → completed \| cancelled \| no_show` |
| `booking_holds` | `booking_id`, `expires_at` | Short-lived reservation while payment completes |
| `calendar_connections` | `resource_id`, `provider`, `sync_token`, `channel_expires_at` | Two-way sync state |
| `external_busy` | `resource_id`, `starts_at`, `ends_at`, `fetched_at` | Cached busy blocks from a connected calendar. Advisory only |

**`blocking_range` is the field that makes buffers correct.** Store the booking's real `starts_at`/`ends_at` for display, and a separate range `[starts_at - buffer_before, ends_at + buffer_after]` for conflict detection. Buffers then get enforced by the same database constraint that prevents overlaps, instead of by application code someone will forget to call.

## Preventing double-booking under concurrency

The invariant: **for any resource, no set of non-cancelled bookings may overlap beyond that resource's capacity at any instant.** Enforce it in the database. Application-level checks lose every race.

| Mechanism | Use when | How |
|---|---|---|
| **Range exclusion constraint** *(default)* | Capacity is 1 | `EXCLUDE USING gist (resource_id WITH =, blocking_range WITH &&) WHERE (status IN ('held','confirmed'))`. Concurrent inserts: one commits, the rest raise a constraint violation you map to `409` |
| **Row lock on the resource** | Capacity > 1, or one booking consumes several resources | `SELECT ... FROM resources WHERE id = ANY(:ids) ORDER BY id FOR UPDATE`, then count overlapping capacity, then insert — one transaction. Deterministic lock order prevents deadlock |
| **Unique index on a slot key** | Every booking sits on a fixed grid with uniform duration | `UNIQUE (resource_id, slot_start)`. Cheapest, but invalid the moment durations vary |

Rules that go with all three:

- **Never check-then-insert without a lock or a constraint.** Reading availability and then writing is the canonical race, and it fails only under the load you get on launch day.
- **Keep the transaction short.** No provider calls, no email, no calendar API inside it. Insert the booking, commit, then do the slow work.
- **Payment happens against a hold.** Insert the booking as `held` with a TTL, take payment, promote to `confirmed`. A sweeper expires stale holds and releases the slot — see `knowledge/capabilities/payments-rails.md` for the payment half.
- **Choose read-committed plus a constraint over serializable plus retries.** Both are correct; the constraint approach has one failure mode and one error code to map, which is far easier to test.
- **Re-validate the soft rules in the transaction too:** min-notice, booking horizon, and the resource's rules. A slot fetched twenty minutes ago may now violate min-notice.

**The test that proves this works:** fire 50 concurrent requests at one capacity-1 slot. Exactly one returns `201`, forty-nine return `409`, and the table holds exactly one row. If this test does not exist, the system double-books.

## Recurring rules

- **Use the iCalendar recurrence grammar** (`RRULE`, `EXDATE`, `UNTIL`, `COUNT`) rather than inventing a scheme. Every calendar client already speaks it, and the edge cases — fifth Tuesday, last weekday of the month — are already specified.
- **Store `DTSTART` with its zone, the rule string, and an exception list.** Expand on demand with a library; never materialize an infinite series.
- **Cap the expansion horizon** at the service's `max_advance_days`. Unbounded expansion is how a slot query times out.
- **Editing a series has three modes**, and you must pick which you support: *this instance only* → an exception plus a standalone booking; *this and following* → close the old rule with `UNTIL` and create a new rule; *all* → mutate the rule and reconcile already-confirmed instances. Anything already paid for is never silently moved.

## Cancellation and rescheduling

- **Never delete a booking.** Transition status and record actor, reason, and timestamp. Cancelled rows are excluded from the conflict constraint by its `WHERE` clause, so the slot frees itself.
- **Rescheduling is cancel-plus-create in one transaction**, linked by `rescheduled_from_id`. Treating it as an update loses history and skips the conflict check on the new time.
- **Evaluate policy windows in a fixed, documented zone** — usually the resource's. "Free cancellation until 24 hours before" evaluated in the customer's browser zone produces disputes.
- **Cancellation links are single-use, expiring, signed tokens.** A guessable booking id in a cancel URL means anyone can cancel anyone's booking.
- **Late cancellations and no-shows are policy, not code paths to bolt on later.** Decide the refund and fee rules before writing the endpoint.

## Calendar sync

- **The read side is mandatory** if the resource is a human. Fetch free/busy from their connected calendar and subtract it from generated slots — otherwise you book them over their dentist appointment. Cache with a short TTL, treat as advisory, and re-check at confirm time.
- **The write side is optional but expected.** Create the external event with your booking id in an extended property, and store the external event id on the booking.
- **Prevent sync loops.** Tag events you created and ignore change notifications originating from your own writes.
- **Deletions made in the external calendar do not auto-cancel bookings.** Flag them `needs_attention` and tell a human. Automatic cancellation on a sync glitch destroys paid bookings.
- **Sync tokens and watch subscriptions expire.** Renew on a cron; on an invalid token, fall back to a full resync rather than silently going stale.

## Build steps this adds

1. **Time foundation** — timezone-aware timestamps, IANA zone columns, and a slot-generation module with a fixed clock injected. · *Done when:* the generator's test suite passes across four zones including a southern-hemisphere and a half-hour-offset zone, and produces zero slots for a non-existent spring-forward local hour.
2. **Rules and exceptions** — working hours, date-range blocks, one-off openings. · *Done when:* adding a full-day block removes exactly that day's slots and leaves adjacent days unchanged.
3. **Slot query endpoint** — WHEN a client requests availability for a service, date range, and viewer zone THE SYSTEM SHALL return slots honouring duration, interval, buffers, min-notice, and horizon. · *Done when:* a slot within the min-notice window is absent, and a slot beyond the horizon is absent, both asserted by tests.
4. **The conflict constraint** — exclusion constraint or resource lock, chosen per the table above, on `blocking_range`. · *Done when:* 50 concurrent bookings of one capacity-1 slot produce exactly one `201`, forty-nine `409`s, and one row.
5. **Buffers via `blocking_range`** — computed on write, enforced by the constraint. · *Done when:* a booking adjacent to an existing one within its buffer window is rejected by the database, not by application code.
6. **Hold, pay, confirm** — `held` with TTL, payment, promotion to `confirmed`, sweeper for expiry. · *Done when:* abandoning checkout frees the slot within one sweeper interval, and a paid hold promotes exactly once under duplicate webhook delivery.
7. **Confirmations and reminders** — email with a calendar attachment, rendered in the recipient's zone with the zone label. · *Done when:* a booking made from one zone for a resource in another produces two messages showing different local times for the same instant.
8. **Cancellation and rescheduling** — signed single-use tokens, status transitions, policy windows. · *Done when:* the same cancel token fails on second use, and a reschedule into a taken slot returns `409` leaving the original booking intact.
9. **Recurring series** *(if in scope)* — recurrence rule storage, bounded expansion, three edit modes. · *Done when:* a weekly series spanning a DST boundary keeps the same local start time on every occurrence.
10. **Calendar sync** — free/busy read, event write with your booking id attached, token renewal. · *Done when:* an event created directly in the connected calendar removes the overlapping slot from the next availability query, and an expired sync token triggers a full resync instead of stale results.
11. **Operational visibility** — alert on booking failure rate, `409` rate, stale sync connections, and expired holds. · *Done when:* forcing a sync token to expire raises an alert within one check interval.

## Pitfalls

- **Precomputed slot tables.** They go stale, they double-book, and they grow forever. Derive slots; store bookings.
- **Storing offsets instead of zone names.** Correct until the first DST transition, then quietly wrong for half the year.
- **UTC-only storage with no zone column.** You can render an instant, but you can no longer answer "what were their working hours?" or move a recurring meeting correctly.
- **Application-level conflict checks.** Two requests read "free" and both write. Only a database constraint or a lock actually prevents this.
- **Buffers applied only in the slot query.** A direct API call then books straight through them. Enforce buffers in the stored range.
- **Deleting cancelled bookings.** You lose the audit trail, the no-show history, and the ability to explain a refund.
- **Auto-cancelling on calendar sync deletions.** Sync fails in ways that look like deletions. Flag for a human.
- **Long transactions.** Holding a lock across a payment API call serializes your whole booking system behind the slowest provider response.
- **Ignoring capacity from day one.** Every 1:1 booking system eventually gets asked for group classes.
- **No concurrency test.** If the 50-concurrent-request test is not in the suite, assume the system double-books.

## See also

- `knowledge/capabilities/database.md` — constraints, locking, and transaction isolation behind the conflict rules
- `knowledge/capabilities/payments-rails.md` — deposits, holds, refunds on cancellation, and no-show fees
- `knowledge/capabilities/api-design.md` — the availability query contract and `409` semantics
- `knowledge/capabilities/testing.md` — concurrency and timezone tests, the two suites that matter here
- `knowledge/capabilities/observability.md` — alerting on booking failures and stale calendar connections
- `knowledge/shapes/saas-webapp.md` — the usual host shape for a booking product
- `knowledge/shapes/internal-tool.md` — staff-side rota and room scheduling without public booking
