# Airbnb workflow — n8n reference → AirManager engines

The n8n workflow in [`reference/n8n-airbnb-workflow.json`](./reference/n8n-airbnb-workflow.json)
("Airbnb AI Automation Suite – Omnichannel AI Agent", 67 nodes) is the **specification**, not the
runtime. This document maps each of its branches to the AirManager engine that implements it, and
records the fixes required before any of this ships in the sold product.

## Product constraints (non-negotiable)

- **Provider-agnostic AI.** One internal gateway, adapter-per-provider. The OpenAI protocol is the
  default adapter (OpenAI, OpenRouter, Groq, Ollama, vLLM, omniroute); **Sarvam is a first-class
  option** (its `api-subscription-key` header scheme, `sarvam-105b` / `sarvam-105b-conversations`
  models) — selectable in Settings, never hardcoded into flow logic.
- **Channel-agnostic messaging.** WhatsApp / Instagram / Meta Ads / email / voice are adapters with
  credentials in a `channels` table (encrypted JSON). Unconfigured channel → graceful queue/fallback.
- **Anti-hallucination contracts** (adopted from the n8n workflow): the agent never invents
  availability, prices, booking IDs, policies, or amenities; bookings are created only after
  explicit guest confirmation; refunds / emergencies / policy exceptions / uncertainty escalate to
  a human.

## Branch → engine mapping

| n8n branch | Trigger | AirManager engine | Status |
| --- | --- | --- | --- |
| WhatsApp / Instagram / Meta Ads → Normalize → Unified Agent Context → LangChain agent (memory, 6 tools) → Parse Decision → channel reply | Webhooks | **AI booking agent** (`server/ai/`) — tools call storage directly, no HTTP hop; per-guest conversation memory persisted in DB | planned |
| Tool: Check Availability | agent tool | `POST /api/availability` (also exposed for the n8n dev harness) | to build |
| Tool: Property Search | agent tool | `GET /api/properties` + search params | exists (storage layer) |
| Tool: Create Booking | agent tool | `POST /api/bookings` | exists |
| Tool: Create CRM Lead | agent tool | `POST /api/enquiries` | exists |
| Tool: Create Support Ticket | agent tool | tickets engine | planned |
| Tool: Human Handoff | agent tool | `needs_host` flag + staff notification | planned |
| Booking Lead webhook → availability → sales decision → guest message | Webhook | same booking agent (webhook sub-path) | planned |
| Follow-up Scheduler `0 */2 * * *` → candidates → AI copy → send | Cron | **Follow-ups engine** — in-process scheduler, `follow_ups` + `follow_up_rules` tables | planned (next) |
| Pricing Scheduler `15 5 * * *` → metrics → recommendation → approval | Cron | **AI pricing** — `price_recommendations` table; recommendation is **never auto-applied** (host approval required; confidence ≥ threshold may auto-suggest only) | planned |
| Review webhook → sentiment → reply publish + staff alert | Webhook | reviews engine extension — AI reply drafting; **rating ≤ 3 or flagged → staff review before publish** | planned |
| Sarvam voice event → triage → ticket → callback | Webhook | **Voice** — `voice_calls` table + transcript UI stub; real telephony via a channel adapter later | stub only |
| Meta webhook verify (`hub.challenge`) | Webhook | channel webhook routes | part of channel engine |

## Fixes required vs the n8n original (implementation requirements)

1. **Webhook authenticity** — validate `X-Hub-Signature-256` HMAC on every Meta/WhatsApp/Instagram
   POST. The original only implemented the `hub.challenge` handshake and accepted unauthenticated
   POSTs.
2. **Dedup** — Meta redelivers webhooks; dedupe on normalized `messageId` before the agent runs.
3. **Provider-agnostic model calls** — the original hardcoded `api.sarvam.ai` + custom header in
   five HTTP nodes and, inconsistently, pointed a LangChain OpenAI node at `sarvam-105b`. In
   AirManager, all model calls go through the gateway; Sarvam is a settings choice.
4. **Resilience** — replies must never depend on a non-critical side effect. The original ran
   `Log AI Lead Decision` inline *before* sending the guest reply; log async/out of band. Add
   retries on outbound HTTP.
5. **WhatsApp policy** — business-initiated messages outside the 24 h customer-service window
   require pre-approved Meta templates; follow-up senders must use template messages when the
   window has closed.
6. **State of record** — conversation memory and lead stages live in AirManager's DB, not in the
   orchestrator.

## Dev harness (current phase)

The n8n JSON is used during development to exercise the conversational flow before the native
agent exists: import it into the local n8n, set its `*_URL` env vars to the running AirManager
(`http://127.0.0.1:5002`), and drive it with synthetic WhatsApp/lead/review events. The native
engines then adopt the workflow's contracts as their acceptance criteria, and n8n is dropped from
the shipped product.
