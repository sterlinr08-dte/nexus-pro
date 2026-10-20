# Capability: Realtime Voice

> Spoken conversation with a model — web, app, or phone call — where the entire architecture is dictated by one number: how long the user waits after they stop talking.

Last verified: 2026-07-27

## When a project needs this

- The brief says voice agent, AI receptionist, phone screening, drive-thru, IVR replacement, call center deflection, or spoken tutor.
- Users talk and expect to be talked back to *in the same breath* — not "record, upload, wait".
- The product answers or places phone calls.
- **Not this** if audio is asynchronous: transcribing meetings, generating a narration file, batch dubbing. That is a job queue and an artifact — see `knowledge/shapes/generative-media-app.md`.

## The latency budget is the architecture

Target **under 800 ms** from the user's last syllable to the first syllable of the reply. Humans notice around one second and start talking over the agent past roughly 1.2 s. Every design decision below is downstream of this number.

| Segment | Realistic budget | Notes |
|---|---|---|
| Capture, encode, network to your edge | 50–150 ms | Regional endpoints; transcontinental hops alone can eat this twice over |
| End-of-turn detection | 150–400 ms | The largest tunable slice and the hardest tradeoff — cut it and you interrupt people mid-thought |
| Speech recognition finalization | 50–200 ms | Only if streaming. Waiting for a final transcript after silence is a needless serial wait |
| Model time-to-first-token | 200–500 ms | Tier and prompt length decide this. Cached prefix helps a lot |
| Speech synthesis first audio | 80–250 ms | Must be a streaming voice that starts on the first sentence, not on the full text |
| Playout and jitter buffer | 50–100 ms | |

**What blows the budget, in order of how often it happens:**

1. **Any non-streaming stage.** Waiting for the full transcript, or the full model response before synthesis, serializes everything and doubles the total. Every stage streams into the next or the budget is gone.
2. **A tool call inside the turn.** A database lookup or an API call adds its full latency to dead air. Speak a filler ("let me check that") before starting it, and cap the tool's timeout aggressively.
3. **A long system prompt with no caching.** Directly inflates time-to-first-token on every single turn. See `knowledge/capabilities/ai-llm-integration.md`.
4. **Cold starts.** Serverless is the wrong host for a media path. Keep warm, long-lived processes.
5. **Region mismatch.** STT in one region, model in another, TTS in a third, telephony in a fourth. Co-locate.
6. **Synchronous retrieval mid-turn.** Pre-load context at call start; do not run a vector search while the caller waits.
7. **Too-large a model for a turn that only needed routing.** Route simple turns to a fast tier.

## Decision matrix

| Option | Best for | Pros | Cons |
|---|---|---|---|
| **Voice agent platform** (Vapi, Retell, Bland, ElevenLabs Agents) | Almost everyone, especially phone-first products | Days to production; telephony, turn-taking, barge-in, recording and transfer already solved and tuned | Per-minute pricing; limited control of the pipeline internals; vendor owns your call quality |
| **Realtime speech-to-speech API** (OpenAI Realtime, Gemini Live) | In-app voice with the lowest achievable latency and natural prosody | One connection, no STT/TTS seams, preserves tone and emotion, fewest moving parts | No transcript-level control at each hop; telephony is your problem; provider lock-in on voices and behavior |
| **Open framework on your infra** (Pipecat, LiveKit Agents) | Teams who need custom pipeline control but not custom infrastructure | Swap any component, self-host, no per-minute markup, strong WebRTC transport | You operate media servers, autoscaling, and regional deployment |
| **Assemble it yourself** (streaming STT + LLM + streaming TTS over WebRTC) | Unusual language, on-prem, or unit economics at very high volume | Total control; best cost at scale | Months, not weeks. Turn-taking and barge-in alone are a quarter of engineering |

## Recommendation

**Ship on a managed voice agent platform.** For a phone-based agent this is a matter of days: number provisioning, PSTN bridging, barge-in, recording, warm transfer, and voicemail detection are already built and — more importantly — already *tuned* against real callers. For in-app voice with no telephony, a realtime speech-to-speech API is the better fit and even simpler.

**Rolling your own is a months-long detour that ends with a worse-sounding agent.** The hard parts are not STT, the model, or TTS — those are three API calls. The hard parts are end-of-turn detection that does not cut people off, barge-in that truncates context correctly, echo cancellation, packet loss, and codec quality on a bad mobile connection. Teams consistently underestimate this by a factor of three. That is precisely why this is a capability and not a shape: voice is something you *add* to a product, and you should buy the media layer.

Deviate when: data may not leave your network (self-host a framework); you need a fine-tuned or non-English-dominant recognizer the platforms do not offer; or you are running enough minutes that per-minute markup outweighs an engineering team — and verify that number with real traffic before believing it.

Whichever you pick, **keep the business logic in your own backend behind a tool interface.** The voice vendor calls your API; your API owns the data, the rules, and the audit trail. Then the vendor is replaceable.

## Turn-taking and barge-in

The single largest quality differentiator, and where every homegrown pipeline shows its seams.

- **Endpointing** decides when the user is done. Pure silence-based voice activity detection either interrupts thinkers or feels sluggish. Semantic endpointing — is that utterance actually complete? — is what makes it feel human. Make the threshold tunable per deployment and expect to tune it against real recordings.
- **Barge-in must do two things**, and forgetting the second one is the classic bug: stop audio playback immediately, *and* truncate the conversation history to what the user actually heard. Otherwise the model believes it said three sentences the caller never received and answers a question that was never asked.
- **Filler while working.** A tool call over about 500 ms needs an acknowledgement first. Silence reads as a dropped call and callers hang up.
- **Numbers, spelling, and names need confirmation.** Recognition on digits and proper nouns is much worse than on prose. Read back anything consequential.
- **Always have an escape hatch**: a phrase and a keypress that reach a human. Track how often it is used — that metric is your quality score.

## Telephony

- **PSTN reaches the agent via SIP or a WebRTC bridge** (Twilio, Telnyx, or your platform's built-in numbers). Phone audio is narrowband — treat it as a hard quality ceiling, not a bug to fix, and evaluate on phone-quality audio rather than studio recordings.
- **DTMF still matters.** Callers press keys, and menus, extensions, and card entry depend on it. Handle tones as an input channel alongside speech.
- **Transfer and handoff** to a human queue is table stakes; carry the transcript and the context with the transfer so the caller does not repeat themselves.
- **Voicemail detection** for outbound, or you will leave dead air on thousands of answering machines.
- **Regulatory reality** varies by country: caller-ID authentication for outbound, number registration for messaging, permitted calling hours, mandatory opt-out, and prior consent for automated outbound calls. Get this reviewed before the first outbound campaign — the fines are per call.

## Recording, consent, and data

- **Announce recording at call start.** Many jurisdictions require all-party consent, and the announcement is the cheapest possible compliance.
- **Persist the consent record**, not just the recording: what was disclosed, when, and the caller's response.
- **Never record payment card entry.** Pause recording and transcription across the digits, or your call storage inherits PCI scope. The same applies to health and identity numbers.
- Recordings and transcripts are personal data: encrypt at rest, restrict access, set a retention window and actually enforce it, honor deletion requests across recordings, transcripts, *and* traces. See `knowledge/capabilities/enterprise-readiness.md`.
- Check the model and speech vendors' retention and training terms — audio is the most sensitive payload most products ever send to a third party.
- **Voice cloning needs the speaker's documented consent.** Do not clone a real person's voice from samples you were merely given.

## Evaluation

Text evals do not cover voice. Measure the medium.

| Metric | Target posture |
|---|---|
| End-of-speech → first audio, p50 and p95 | p95 is the real experience; p50 hides the failures |
| Interruption handling rate | Did barge-in stop playback and truncate context correctly? |
| Word error rate on *your* vocabulary | Product names, street names, digits — not a generic benchmark |
| Task completion rate | The actual business metric: booking made, question answered |
| Abandon / hangup rate, and time-to-hangup | Early hangups usually mean the greeting or first latency spike |
| Human escalation rate | Rising escalation is a quality regression before anything else shows it |

Keep a **golden audio set** — real recordings including accents, background noise, interruptions, and phone-quality audio — and replay it through the pipeline in CI. Score transcripts with a rubric judge for policy adherence, and listen to a sample of real calls every week. No dashboard replaces listening.

## Data model additions

| Entity | Holds |
|---|---|
| `calls` | direction, caller, callee, start/end, status, disposition, cost, recording ref |
| `turns` | call id, ordinal, speaker, transcript, audio ref, barge-in flag, latency segments |
| `call_events` | DTMF, transfer, escalation, voicemail detected, silence timeout |
| `consents` | call id, disclosure text, method, captured_at |
| `recordings` | storage ref, duration, retention_until, redaction spans |

Latency belongs on `turns` as segment fields, not one total — you cannot tune what you cannot attribute.

## Build steps this adds

1. **Pick the transport and prove the loop** — one round trip: audio in, model, audio out. · *Done when:* a programmatic test call from the SDK's own client produces a spoken reply and the measured end-of-speech-to-first-audio is logged per turn.
2. **Latency instrumentation** — every segment timed and persisted on the turn. · *Done when:* a dashboard shows p50 and p95 per segment across at least twenty turns, and the slowest segment is identified by name.
3. **Turn-taking tuning** — configurable endpointing, tested against recorded speech with pauses. · *Done when:* WHEN a caller pauses mid-sentence for under the configured threshold THE SYSTEM SHALL NOT begin speaking, verified against at least ten recorded utterances.
4. **Barge-in** — playback stop plus history truncation. · *Done when:* interrupting mid-reply stops audio within 200 ms and the persisted transcript contains only the words actually played.
5. **Tools behind your own API** — the voice layer calls your backend; business logic never lives in the vendor. · *Done when:* a tool call completes within its timeout, a filler phrase plays first, and the same tool is callable and tested outside the voice path.
6. **Telephony integration** — inbound number, DTMF, transfer to human, voicemail detection. · *Done when:* a programmatic SIP or WebRTC test client places the inbound call and the inbound webhook fires with the expected payload; a synthesized DTMF tone in that call produces the matching digit event on `call_events`; and the transfer dials the configured destination with the transcript attached to the outbound context, asserted against a stub endpoint that records the request — no human answers anything in this test.
7. **Recording and consent** — announcement, consent row, redaction of sensitive spans, retention job. · *Done when:* every recording has a consent record; a card-entry test call has no digits in the audio or transcript; the retention job deletes an expired recording and its transcript.
8. **Failure behavior** — silence timeouts, recognition failure, model or vendor outage, graceful fallback. · *Done when:* WHEN the model provider is unavailable THE SYSTEM SHALL speak an apology and transfer or take a message rather than dropping the call, covered by a fault-injection test.
9. **Eval harness** — golden audio replay in CI against a committed baseline; the weekly listening habit is a launch-checklist item, not a build gate. · *Done when:* the replay suite reports WER, p95 latency, and task completion against the committed baseline, and fails CI below it.

## Post-build launch checklist

Not build steps — every item here needs a real carrier, a real handset, a regulator, or a person on the far end of the line, so none of them can terminate inside an autonomous build. Put them in the blueprint as a launch checklist with an owner each, and start the slow ones early.

| Item | Why it cannot be a build gate | Start it |
|---|---|---|
| Live transfer to a staffed human queue: a real caller on a real handset is handed off and the agent on the other end confirms the transcript arrived | Requires a person answering; the build can only assert the transfer request and its payload against a stub | The day step 6 lands |
| Place and receive calls over the real PSTN path from at least one mobile carrier and one landline | Narrowband codecs, carrier transcoding, and packet loss only exist on the real network | Before any pilot traffic |
| Tune endpointing thresholds against recordings of real callers | Synthetic audio does not contain the pauses, accents, and background noise that mistune it | Week one of pilot traffic |
| Carrier and regulator paperwork: number registration, caller-ID attestation for outbound, consent and calling-hours rules | Third-party queues measured in days to weeks; fines are per call | Day one of the project |
| Legal review of the recording disclosure for every jurisdiction you dial | A human lawyer, and jurisdiction-dependent | Before the first recorded call |
| Weekly listening to a sample of real calls | There is no metric for "it sounded wrong"; a person has to hear it | Continuously after launch |

## Pitfalls

- **Building the pipeline yourself to save vendor cost.** You will spend more on engineering in the first quarter than a year of per-minute fees, and the result will interrupt people.
- **Any non-streaming stage.** One buffered hop destroys the whole budget.
- **Barge-in that stops audio but keeps the full context.** The agent then answers a question the caller never heard it ask.
- **Testing only on studio-quality microphones.** Real calls are narrowband, noisy, and lossy. Evaluate on that.
- **Serverless for the media path.** Cold starts are audible.
- **Recording without disclosure.** A legal problem, not a product problem, and it is jurisdiction-dependent.
- **No human escape hatch.** Callers who cannot reach a person do not call back.
- **A long system prompt on every turn with no caching.** Pure latency tax, paid per turn, for the entire life of the product.
- **Ignoring cost per minute.** Speech recognition, model, synthesis, and telephony each bill separately; model the blended per-minute cost before launch — see `knowledge/capabilities/credit-metering.md`.
- **Treating voice as a UI skin on your chatbot.** Spoken language is shorter, more interruptible, and less forgiving of long answers. Rewrite the prompt for the ear: two sentences, then stop.

## See also

- `knowledge/capabilities/ai-llm-integration.md` — the gateway, prompt caching, and cost accounting behind every turn
- `knowledge/capabilities/agent-loop.md` — when the voice agent takes multi-step actions rather than just answering
- `knowledge/capabilities/observability.md` — per-segment latency, call dashboards, and alerting
- `knowledge/capabilities/enterprise-readiness.md` — recording retention, access control, and deletion obligations
- `knowledge/shapes/agent-app.md` — the shape where realtime voice is the synchronous variant
- `knowledge/shapes/generative-media-app.md` — when audio is an asynchronous artifact instead of a conversation
