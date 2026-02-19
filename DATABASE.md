# Database Reference

## Overview

The app runs two interchangeable database backends selected automatically at startup:

| Environment | Backend | File |
|---|---|---|
| Local dev (`DATABASE_URL` absent) | SQLite via `sql.js` | `data/calls.db` |
| Production / Railway (`DATABASE_URL` set) | PostgreSQL | Railway-managed |

Both expose the same method signatures. `database.auto.js` picks the right one at require-time, so nothing else in the app needs to care which backend is active.

---

## Tables

### `callers`
One row per unique phone number. This is the top-level entity everything else hangs off.

| Column | Type | Description |
|---|---|---|
| `id` | integer PK | Auto-increment |
| `phone` | text / varchar(20) | E.164 phone number, e.g. `+12125551234`. Unique. |
| `name` | text / varchar(255) | Caller's name, saved by the AI via `update_caller_name` tool when learned during a call |
| `summary` | text | **Rolling AI summary** — single blob, overwritten after every call. Used to give Maya personalised context on returning callers. See [Rolling Summary](#rolling-summary) below. |
| `createdAt` / `created_at` | datetime | When the caller was first seen |
| `lastCallAt` | datetime | SQLite only — updated on each call |
| `callCount` | integer | SQLite only — incremented on each call |

---

### `conversations`
One row per call. Links back to `callers`.

| Column | Type | Description |
|---|---|---|
| `id` | integer PK | Auto-increment |
| `callSid` / `call_sid` | text / varchar(100) | Twilio Call SID. Unique. Primary key for looking up a call. |
| `callerId` / `caller_id` | integer FK | Foreign key → `callers.id` |
| `callStartTime` / `call_start_time` | datetime | When the WebSocket stream connected |
| `callEndTime` / `call_end_time` | datetime | Set on call end |
| `durationSeconds` / `duration_seconds` | integer | Derived from start/end timestamps |
| `nameExtracted` / `name_extracted` | boolean | Flag — set when the AI successfully saved a caller name |
| `summary` | text | SQLite only — present in schema but **not currently written**. Reserved for per-call summaries if needed later. |

---

### `messages`
One row per spoken turn. Append-only audit log.

| Column | Type | Description |
|---|---|---|
| `id` | integer PK | Auto-increment |
| `conversationId` / `conversation_id` | integer FK | Foreign key → `conversations.id` |
| `role` | text / varchar(20) | `"user"` (caller) or `"assistant"` (Maya) |
| `transcript` / `content` | text | The transcribed text for that turn |
| `timestamp` | datetime | When the turn was logged |

Every transcription event from OpenAI Whisper (caller speech) and every AI response text fires a `logMessage()` write here. This is a raw audit log — useful for debugging, but the AI does not read from it at runtime.

---

## Relationships

```
callers
  │
  ├── conversations (many per caller, via callerId FK)
  │     │
  │     └── messages (many per conversation, via conversationId FK)
  │
  └── summary (single rolling blob, lives directly on the callers row)
```

---

## Rolling Summary

**What it is:** A single `TEXT` blob on the `callers` row that holds a concise, AI-generated history of all calls from that number. It is **not** a log — it is a living document that gets overwritten after every call.

**How it works:**

```
Call ends
  ├─ Read  callers.summary  (prior history, null on first call)
  ├─ OpenAI merges: prior summary + this call's transcript
  │    → produces one updated summary under 150 words
  ├─ Write new summary → callers.summary  (overwrites previous)
  └─ Send summary to Telegram

Next call from same number
  ├─ Read  callers.summary  (now contains merged history)
  └─ Inject into Maya's system prompt as CALLER HISTORY block
```

**Why on `callers` and not `conversations`:**
- One row to read, one row to write — no aggregation query needed
- Stays flat at any scale (N callers = N summary blobs)
- History survives regardless of how many conversations the caller has had

---

## Schema Changes (v2)

The following were added in the second iteration of development. Both databases include a **safe migration** that runs on startup and is silent if the column already exists.

### `callers.summary` column
```sql
-- SQLite
ALTER TABLE callers ADD COLUMN summary TEXT;

-- PostgreSQL
ALTER TABLE callers ADD COLUMN IF NOT EXISTS summary TEXT;
```
Added to support the rolling summary feature. Pre-existing caller rows gain the column with a `NULL` value (treated as first-time caller on their next call).

### PostgreSQL indexes
```sql
CREATE INDEX IF NOT EXISTS idx_callers_phone          ON callers(phone);
CREATE INDEX IF NOT EXISTS idx_conversations_call_sid ON conversations(call_sid);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
```
Added so phone-number lookups and callSid lookups stay fast as message volume grows.

---

## Inspect Endpoints

All read-only. No authentication — restrict access in production.

| Endpoint | Returns |
|---|---|
| `GET /database/callers` | All callers (name, phone, call count) |
| `GET /database/conversations?limit=50` | Recent conversations with caller info joined |
| `GET /database/stats` | Row counts for all three tables |
| `GET /database/caller/:phone` | Single caller + recent conversation metadata |
| `GET /database/caller/:phone/summary` | The current rolling summary for a caller |
| `GET /database/conversation/:callSid` | Full conversation row + all messages |
| `GET /database/conversation/:callSid/messages` | Messages only (shorthand) |
