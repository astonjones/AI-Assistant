# SQLite Database Setup & Integration

## Installation
```bash
npm install better-sqlite3
```

## Files Created/Modified

### New File: `src/services/database.js`
- **Purpose**: SQLite database service with schema management and query methods
- **Database**: `data/calls.db` (auto-created in project root)
- **Tables Created Automatically**:
  - `callers` - phone number, name, call count, timestamps
  - `conversations` - call metadata, duration, name-extracted flag
  - `messages` - user/assistant transcripts with timestamps

### Modified: `src/index.js`
**New Lines Added**:
1. **Import database**: `const dbService = require('./services/database');`
2. **Track conversation state**: `const conversationStates = new Map();`
3. **On WebSocket `start` event**:
   - Create/update caller: `dbService.upsertCaller(fromNumber);`
   - Create conversation: `dbService.createConversation(callSid, fromNumber);`
   - Store state in `conversationStates` map
   - Updated system prompt to ask AI to request caller's name

4. **On WebSocket `stop` event**:
   - End conversation: `dbService.endConversation(callSid);`
   - Clean up: `conversationStates.delete(callSid);`

5. **On `user-transcription` event**:
   - Log message: `dbService.logMessage(callSid, 'user', text);`
   - **Name extraction (MVP)**:
     - Takes first user response (max 3 words)
     - Validates it looks like a name (< 50 chars, no special chars)
     - Auto-updates database: `dbService.updateCallerName(phone, name);`
     - Marks conversation as `nameExtracted = true`

6. **On WebSocket `close`/`error` events**:
   - Added database cleanup calls

## How It Works

### Caller Recording
```
Call comes in → Extract phone number → upsertCaller() → Create conversation
```

### Name Extraction (Auto)
```
AI asks "What's your name?" → User responds → First response captured as name → DB updated
```

### Message Logging
```
User speaks → conversation.item.input_audio_transcription.completed → logMessage('user', text)
```

## Database Methods Available

| Method | Purpose |
|--------|---------|
| `upsertCaller(phone, name?)` | Create/update caller |
| `getCaller(phone)` | Retrieve caller info |
| `createConversation(callSid, phone)` | Start new conversation |
| `endConversation(callSid)` | Finalize conversation with duration |
| `logMessage(callSid, role, text)` | Log user/assistant messages |
| `updateCallerName(phone, name)` | Update caller's name |
| `markNameExtracted(callSid)` | Flag conversation as having name |
| `getConversationHistory(phone, limit)` | Retrieve past calls |
| `getConversationMessages(callSid)` | Get transcript of a call |

## Database Schema

```sql
callers
├── id (PK)
├── phone (UNIQUE)
├── name (nullable)
├── createdAt
├── lastCallAt
└── callCount

conversations
├── id (PK)
├── callSid (UNIQUE)
├── callerId (FK→callers.id)
├── callStartTime
├── callEndTime (nullable)
├── durationSeconds (nullable)
├── nameExtracted (boolean)
└── summary (nullable)

messages
├── id (PK)
├── conversationId (FK→conversations.id)
├── role ('user' or 'assistant')
├── transcript
└── timestamp
```

## Testing

**Check database file**:
```bash
sqlite3 data/calls.db ".tables"
```

**View callers**:
```bash
sqlite3 data/calls.db "SELECT phone, name, callCount FROM callers;"
```

**View conversation history**:
```bash
sqlite3 data/calls.db "SELECT * FROM conversations;"
```

## Notes

- Database file automatically created on first run
- WAL (Write-Ahead Logging) enabled for better concurrency
- Name extraction uses first user utterance heuristic (MVP approach)
- For production/containerization, switch from SQLite to PostgreSQL
- All database operations are wrapped with error handling/logging
