# OpenAI Realtime + Database Integration

## Changes Made

### 1. **Removed Auto Name Extraction**
- ❌ Old: Heuristic parsing of first user utterance  
- ✅ New: AI naturally asks for name, captures it from conversation

### 2. **AI-Driven Name Extraction**
Updated system prompt to instruct AI:
```
"During the conversation, naturally ask the caller for their name if you don't 
already know it, and remember it for future reference."
```

### 3. **Fixed Syntax Error**
- Added missing `realtimeService.createSession(callSid, systemPrompt)` call
- Removed orphaned `.then()` 

### 4. **Context Injection for Returning Callers**
When a call starts and this is a known caller:
```javascript
const caller = dbService.upsertCaller(fromNumber);
const previousHistory = dbService.getConversationHistory(fromNumber, 3);
// System prompt now includes:
// "Note: This caller has called 2 time(s) before. Their name is John."
```

### 5. **AI Response Logging**
- `realtime.js`: Accumulates `response.text.delta` events into `session.currentAIResponse`
- On `response.done`: Emits new `assistant-transcript` event with full text
- `index.js`: Listens for `assistant-transcript` and logs to database

### 6. **New Database Methods**
```javascript
// Get conversation history with OpenAI-compatible summary
dbService.getConversationContextForOpenAI(phone, limit)

// Get messages formatted as OpenAI API messages (for future re-injection)
dbService.getConversationAsOpenAIMessages(callSid)
```

## Data Flow

**Initial Call:**
```
Caller → Twilio → Create: caller record, conversation record
  → AI asks for name naturally during chat
  → User responds → stored as message  
  → AI hears it, remembers it
  → AI may optionally update caller name (future feature)
  → Call ends → conversation duration recorded
```

**Returning Caller:**
```
Caller → Twilio → Retrieve: past 3 conversations summary
  → System prompt includes context: "You've talked 2 times before. Name: John."
  → AI understands history, acts accordingly
  → New messages logged for continuity
```

## Future Enhancement Ideas

1. **Extract Name from AI's Understanding**
   - Monitor what the AI has learned about the caller
   - If AI explicitly identifies them: `dbService.updateCallerName(phone, name)`

2. **Full Conversation Re-Injection**
   ```javascript
   const prevMessages = dbService.getConversationAsOpenAIMessages(lastCallSid);
   // Could send this to OpenAI context for deeper continuity
   ```

3. **Conversation Summaries**
   - Store `summary` in conversations table
   - AI generates a brief recap before call ends
   - Inject summaries into future calls

## Database Schema (Updated)

```sql
callers: id, phone, name, createdAt, lastCallAt, callCount
conversations: id, callSid, callerId, callStartTime, callEndTime, 
               durationSeconds, nameExtracted, summary
messages: id, conversationId, role, transcript, timestamp
```

## Testing

**Start server:**
```bash
npm start
```

**Make a call** → Look for logs:
```
✨ New caller recorded: +12125551234
📞 Incoming call from +12125551234
📝 User said: "Hi, my name is John"
🤖 AI said: "Nice to meet you John! How can I help?"
```

**Check database:**
```bash
sqlite3 data/calls.db "SELECT * FROM messages;" 
```

You should see alternating user/assistant messages in conversation history.
