 # API Reference

## Endpoints

---

### Health
```
GET /health
```
Returns server status and uptime.

---

### AI Agent
```
PUT /agent
```
Main agentic endpoint. OpenAI runs in a loop, calling tools until the task is done.

**Body**
```json
{
  "prompt": "Send John an email and text him too",
  "tools": ["email", "twilio", "calendar", "database", "telegram"],
  "model": "gpt-4-turbo",
  "temperature": 0.7
}
```
Either `prompt` (string) or `messages` (array) is required. `tools` defaults to all five groups if omitted.

**Tool groups**

| Key | Functions exposed to the AI |
|---|---|
| `email` | `send_email`, `read_emails`, `summarize_emails` |
| `twilio` | `send_sms`, `list_sms_history`, `hang_up_call` |
| `calendar` | `list_events`, `create_event`, `update_event`, `delete_event` |
| `database` | `update_caller_name` |
| `telegram` | `send_telegram_message`, `summarize_and_send_telegram`, `send_telegram_summary` |

**Response**
```json
{
  "choices": [...],
  "model": "gpt-4-turbo",
  "usage": { "prompt_tokens": 0, "completion_tokens": 0 },
  "toolCalls": [...]
}
```

### Authentication
```
GET /auth/gmail/callback
  └─ Google OAuth2 callback for Gmail/Calendar
```

### Voice Calls (NEW ORGANIZATION)
```
POST /voice/incoming
  ├─ Called by: Twilio
  ├─ Purpose: Handle incoming calls
  └─ Returns: TwiML response

WS /voice/stream
  ├─ Protocol: WebSocket
  ├─ Purpose: Real-time audio streaming
  └─ Data: JSON media stream events

GET /voice/stats
  ├─ Purpose: Stream statistics
  └─ Returns: Active streams, duration, bytes

GET /voice/streams
  ├─ Purpose: List active streams
  └─ Returns: Array of stream details
```

### SMS Operations (NEW!)
```
POST /sms/send
  ├─ Body: { to: "+15551234567", body: "message" }
  ├─ Purpose: Send SMS
  └─ Returns: { success, messageSid, status }

GET /sms/list?limit=10
  ├─ Purpose: List recent SMS messages
  ├─ Query: limit (1-100, default: 10)
  └─ Returns: { count, messages: [...] }

GET /sms/details/:messageSid
  ├─ Purpose: Get specific message details
  └─ Returns: { sid, from, to, body, status, ... }
```

### Webhooks (Legacy)
```
POST /webhooks/sms
  ├─ Called by: Twilio (incoming SMS)
  └─ Purpose: Receive incoming SMS notifications
```

## Usage Examples

### Send SMS
```bash
curl -X POST http://localhost:3000/sms/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+15551234567",
    "body": "Hello from AI Agent!"
  }'
```

### List SMS
```bash
curl http://localhost:3000/sms/list?limit=20
```

### Get Message Details
```bash
curl http://localhost:3000/sms/details/SM1234567890abcdef
```

### Check Voice Stats
```bash
curl http://localhost:3000/voice/stats
```

### Check Active Calls
```bash
curl http://localhost:3000/voice/streams
```

### Send with Agent
```bash
curl -X PUT http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Send a text to 555-1234 saying hello",
    "tools": ["twilio"]
  }'
```

## Service Usage

### TwilioService Methods

**SMS:**
```javascript
await twilioService.sendSMS(to, body);
await twilioService.listMessages(limit);
await twilioService.getMessageDetails(messageSid);
```

**Voice:**
```javascript
twilioService.initializeStream(callSid, ws);
twilioService.handleAudioData(callSid, audioBuffer);
twilioService.closeStream(callSid);
twilioService.getStreamStats();
twilioService.getActiveStreams();
```

**Events:**
```javascript
twilioService.on('stream-started', (data) => {});
twilioService.on('audio-received', (data) => {});
twilioService.on('stream-ended', (data) => {});
```

## File Organization

```
src/
├── services/
│   ├── twilio.js          ← SMS + Voice (combined)
│   ├── calendar.js
│   ├── email.js
│   ├── openai.js
│   └── emailProcessor.js
│
├── routes/
│   ├── voice.js           ← Voice call handling
│   ├── sms.js             ← SMS operations (NEW!)
│   ├── agent.js           ← AI agent
│   ├── auth.js            ← OAuth
│   ├── health.js          ← Health check
│   └── webhooks.js        ← Webhook receivers
│
└── index.js               ← Main server
```

## Configuration

### Environment Variables Needed
```
OPENAI_API_KEY=...
NGROK_URL=https://...
PORT=3000

# Gmail/Calendar
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REFRESH_TOKEN=...

# Twilio
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
```

## What's What

| Component | Purpose | Protocol | Real-time |
|-----------|---------|----------|-----------|
| SMS Service | Send/receive text messages | HTTP REST | No |
| Voice Service | Handle phone calls | WebSocket | Yes |
| TwiML | Instructions for calls | XML | - |
| AI Agent | Process requests | HTTP REST | No |

## Status

✅ **Production Ready**
- All routes implemented
- All services consolidated
- Error handling in place
- Documentation complete

⏳ **Phase 2 Ready**
- Voice streaming functional
- Ready for Whisper transcription
- Ready for OpenAI integration

## Key Points

1. **TwilioService** = SMS + Voice management
2. **/sms** = Send/list SMS messages (HTTP)
3. **/voice** = Handle calls & streaming (WebSocket)
4. **TwiML** = XML response telling Twilio what to do
5. **EventEmitter** = Allows services to emit events

## Next Phase

When ready for Phase 2 (Whisper transcription):
- Will add real-time audio-to-text
- Will integrate with OpenAI
- Will handle text-to-speech responses

Current status: **Foundation complete, ready to build on!** 🚀
