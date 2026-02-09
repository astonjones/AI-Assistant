# Phase 2: OpenAI Realtime API Integration

## Vision
Real-time audio conversation with AI assistant via phone call. When user can't answer, caller speaks to AI that understands context and responds naturally.

## Architecture Overview

```
CALLER DIALS YOUR TWILIO NUMBER
         ↓
    Twilio Call
         ↓
    Your Server (incoming webhook)
         ↓
    Generate TwiML with WebSocket URL
         ↓
    Twilio streams audio to your WebSocket
         ↓
    ┌─────────────────────────────────────────┐
    │   Your Server WebSocket Handler         │
    │   (/voice/stream)                       │
    │                                         │
    │   Receives: Audio from Twilio           │
    │   Sends: Audio to Twilio                │
    └─────────────────────────────────────────┘
         ↓ (audio chunks)
    ┌─────────────────────────────────────────┐
    │   OpenAI Realtime API                   │
    │   WebSocket Connection                  │
    │                                         │
    │   Handles:                              │
    │   • Speech Recognition (user audio)     │
    │   • LLM Processing (understand + think) │
    │   • Text-to-Speech (AI response)        │
    └─────────────────────────────────────────┘
         ↓ (audio response)
    Audio streamed back through Twilio
         ↓
    CALLER HEARS AI RESPONSE
```

## Key Difference from Previous Plan

### Before (Options 1-3):
```
Twilio Audio → Your buffer/accumulate
           → Whisper API (STT only)
           → OpenAI API (LLM only)
           → TTS API (text-to-speech)
           → Back to Twilio

❌ Multiple APIs, complex orchestration, slow
```

### Now (OpenAI Realtime):
```
Twilio Audio → OpenAI Realtime API
           (handles STT + LLM + TTS internally)
           → Back to Twilio

✅ One API, fully integrated, real-time
```

## How OpenAI Realtime API Works

### Timeline Example:

```
TIME    EVENT                                  LATENCY
────────────────────────────────────────────────────────
0s      Caller says: "Hi, can you add a meeting?"
        
100ms   OpenAI receives audio chunk           (100ms network)

200ms   OpenAI begins recognizing voice       

500ms   OpenAI has full text: "Hi, can you add a meeting?"
        OpenAI begins generating response     (STT complete)

1200ms  OpenAI has response: "I'd be happy to help..."
        OpenAI starts generating audio       (LLM complete)

1800ms  OpenAI sends back first audio chunk
        Caller hears: "I'd be happy..."      (TTS complete)

TOTAL: ~1.8 seconds from question to hearing response
```

### What OpenAI Sends/Receives:

**TO OpenAI (from Twilio audio):**
```json
{
  "type": "input_audio_buffer.append",
  "audio": "base64_encoded_audio_chunk"
}
```

**FROM OpenAI (response to Twilio):**
```json
{
  "type": "response.audio.delta",
  "delta": "base64_encoded_response_audio"
}
```

**User sees transcript:**
```json
{
  "type": "conversation.item.created",
  "item": {
    "type": "message",
    "role": "user",
    "content": [
      {
        "type": "text",
        "text": "Hi, can you add a meeting?"
      }
    ]
  }
}
```

## Cost Breakdown

**OpenAI Realtime API Pricing:**
- Input audio (caller speaking): $0.10/min
- Output audio (AI responding): $0.20/min

**Realistic 15-minute call:**
- Caller speaks: ~5 min = $0.50
- AI responds: ~5 min = $1.00
- Total per call: ~$1.50

**Comparison:**
- Option 3 (Whisper batching): $21.60
- **OpenAI Realtime: $1.50** ✅
- Twilio Gather: $1-2

## Data Flow Detailed

```
┌──────────────────────────────────────────────────────┐
│ TWILIO MEDIASTREAM → YOUR SERVER                     │
└──────────────────────────────────────────────────────┘

Your WebSocket Handler receives:
{
  "type": "start",
  "start": {
    "callSid": "CA...",
    "streamSid": "MG...",
    "customParameters": {}
  }
}

↓

{
  "type": "media",
  "media": {
    "payload": "base64_audio"  ← Caller's voice
  }
}

                    ↓

┌──────────────────────────────────────────────────────┐
│ YOUR SERVER → OPENAI REALTIME API WEBSOCKET          │
└──────────────────────────────────────────────────────┘

Send to OpenAI:
{
  "type": "input_audio_buffer.append",
  "audio": "base64_audio"
}

↓ (OpenAI processes)

Receive from OpenAI:
{
  "type": "response.audio.delta",
  "delta": "base64_response_audio"  ← AI's voice
}

                    ↓

┌──────────────────────────────────────────────────────┐
│ YOUR SERVER → TWILIO MEDIASTREAM                     │
└──────────────────────────────────────────────────────┘

Send back to caller:
{
  "event": "media",
  "streamSid": "MG...",
  "media": {
    "payload": "base64_response_audio"
  }
}

↓

CALLER HEARS: "I'd be happy to help you..."
```

## System Architecture Diagram

```
┌─────────────────┐
│  CALLER         │
│  (Phone)        │
└────────┬────────┘
         │ (voice audio)
         ↓
┌─────────────────────────────────────────┐
│  TWILIO VOICE SERVICE                   │
│  • Receives call                        │
│  • Streams audio to your server         │
│  • Plays audio back to caller           │
└────────┬──────────────────────┬─────────┘
         │                      │
     (webhook)            (MediaStream)
         ↓                      ↓
┌─────────────────┐  ┌──────────────────────────┐
│ Your Node Server│  │ WebSocket Handler        │
│ - Express app  │  │ /voice/stream            │
│ - Routes       │  │ - Bidirectional audio    │
│ - Services     │  │ - Proxies to OpenAI      │
└────────┬────────┘  └──────────┬───────────────┘
         │                      │
         │ (TwiML XML)     (audio chunks)
         │                      │
         └──────────┬───────────┘
                    │
                    ↓
         ┌─────────────────────────────────┐
         │ OpenAI Realtime API             │
         │ WebSocket Connection            │
         │                                 │
         │ • Transcribes user audio        │
         │ • Generates AI responses        │
         │ • Converts text to speech       │
         │ • Returns audio stream          │
         └─────────────────────────────────┘
```

## Revised Phase Structure

### Phase 1: ✅ COMPLETE
**Voice Streaming Infrastructure**
- Twilio integration (already done)
- WebSocket server (already done)
- Audio streaming from Twilio (already done)
- TwiML response generation (already done)

### Phase 2: 🆕 CURRENT
**OpenAI Realtime API Integration**
- Create RealtimeService to manage OpenAI connection
- Proxy audio from Twilio → OpenAI → Twilio
- Handle session management
- Error handling and reconnection

**Deliverables:**
- `src/services/realtime.js` - OpenAI Realtime manager
- Updated `src/index.js` - Wire OpenAI into WebSocket handler
- Test with live calls

**Timeline:** 4-6 hours
**Complexity:** 🟡 Medium

### Phase 3: 🔄 NEW
**Calendar Tool Integration**
- Give OpenAI Realtime access to calendar functions
- User can ask: "Add a meeting tomorrow at 2pm"
- AI calls your calendar API in real-time
- Responds: "I've added the meeting"

**Deliverables:**
- Update RealtimeService to include function tools
- Calendar functions as OpenAI tools
- Tool execution during conversation

**Timeline:** 3-4 hours
**Complexity:** 🟡 Medium

### Phase 4: 🔄 NEW
**Multi-Turn Conversation Context**
- Maintain conversation history during call
- AI remembers what was said earlier
- Handle complex multi-step requests
- Natural conversation flow

**Deliverables:**
- Conversation history tracking
- Context window management
- Better prompts for call assistant role

**Timeline:** 2-3 hours
**Complexity:** 🟡 Medium

### Phase 5: 🔄 NEW
**Testing & Optimization**
- Live call testing
- Latency optimization
- Cost monitoring
- Error handling refinement

**Timeline:** 4-6 hours
**Complexity:** 🟢 Low

## Implementation Preview

### What Phase 2 Looks Like

**New File: `src/services/realtime.js`**
```javascript
const WebSocket = require('ws');
const EventEmitter = require('events');

class RealtimeService extends EventEmitter {
  constructor() {
    super();
    this.openaiUrl = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview';
    this.sessions = new Map(); // callSid → websocket connection
  }

  // Connect to OpenAI when call starts
  createSession(callSid) {
    const ws = new WebSocket(this.openaiUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'OpenAI-Beta': 'realtime=v1'
      }
    });

    // Setup handlers for OpenAI messages
    ws.on('message', (data) => {
      const message = JSON.parse(data);
      // Handle different message types from OpenAI
      this.handleOpenAIMessage(callSid, message);
    });

    this.sessions.set(callSid, ws);
    return ws;
  }

  // Forward audio chunk to OpenAI
  sendAudioChunk(callSid, audioBase64) {
    const ws = this.sessions.get(callSid);
    if (!ws) return;

    ws.send(JSON.stringify({
      type: 'input_audio_buffer.append',
      audio: audioBase64
    }));
  }

  // Receive audio response from OpenAI, send to Twilio
  handleOpenAIMessage(callSid, message) {
    if (message.type === 'response.audio.delta') {
      this.emit('audio-response', {
        callSid,
        audio: message.delta
      });
    }
  }

  closeSession(callSid) {
    const ws = this.sessions.get(callSid);
    if (ws) {
      ws.close();
      this.sessions.delete(callSid);
    }
  }
}
```

**Updated WebSocket Handler in `src/index.js`:**
```javascript
const realtimeService = new RealtimeService();

wss.on('connection', (ws, req) => {
  let callSid;

  ws.on('message', (data) => {
    const message = JSON.parse(data);

    if (message.event === 'start') {
      callSid = message.start.streamSid;
      // Create OpenAI session for this call
      realtimeService.createSession(callSid);
    }

    if (message.event === 'media') {
      // Forward Twilio audio to OpenAI
      realtimeService.sendAudioChunk(callSid, message.media.payload);
    }

    if (message.event === 'stop') {
      // Clean up OpenAI session
      realtimeService.closeSession(callSid);
    }
  });
});

// Listen for OpenAI responses
realtimeService.on('audio-response', ({ callSid, audio }) => {
  // Send back to Twilio
  twilioService.sendMediaUpdate(callSid, audio);
});
```

## Key Differences from Original Plan

| Aspect | Original (Whisper) | New (OpenAI Realtime) |
|--------|-------------------|----------------------|
| **APIs Used** | Whisper + OpenAI + TTS | OpenAI Realtime (all-in-one) |
| **Cost** | $21.60/call | $1.50/call |
| **Latency** | 15-17 seconds | 1-2 seconds |
| **Complexity** | High (buffering, dedup) | Medium (straightforward proxy) |
| **Error Handling** | Complex | Simpler |
| **Code Lines** | 500+ | 200-300 |
| **Implementation** | 14-20 hours | 4-6 hours |

## Environment Setup Required

```bash
# Add to .env
OPENAI_API_KEY=sk-...your-key-here...
```

That's it! No additional keys needed.

## Real Call Flow Example

```
CALLER dials your Twilio number
         ↓
YOUR SERVER receives webhook
         ↓
YOUR SERVER generates TwiML with WebSocket URL
         ↓
TWILIO says: "Connecting you to AI assistant..."
         ↓
TWILIO opens WebSocket to YOUR SERVER
         ↓
YOUR SERVER creates OpenAI Realtime session
         ↓
CALLER: "Hi, I need help with my schedule"
         ↓
AUDIO → YOUR WEBSOCKET → OPENAI → STT: "Hi, I need help with my schedule"
         ↓
OPENAI: Generates response: "I'd be happy to help. What would you like to do?"
         ↓
OPENAI: Converts to speech and sends audio chunks
         ↓
YOUR WEBSOCKET receives audio → sends to TWILIO
         ↓
CALLER hears: "I'd be happy to help. What would you like to do?"
         ↓
CALLER: "Add a meeting tomorrow at 2pm"
         ↓
(repeat audio loop...)
OPENAI: "I've added that meeting for you"
         ↓
CALLER HEARS RESPONSE
```

## Benefits of This Approach

✅ **Cost-effective** - $1.50 per call vs $21.60
✅ **Real-time** - 1-2 second latency vs 15-17 seconds
✅ **Simple** - One API to manage vs three
✅ **Integrated** - STT, LLM, TTS all coordinated
✅ **Scalable** - No complex buffer management
✅ **Maintainable** - Less code to debug
✅ **Production-ready** - OpenAI handles reliability

## Next Steps

Ready to implement Phase 2 with OpenAI Realtime API?

Would you like me to:
1. Create `RealtimeService` class
2. Update WebSocket handler in index.js
3. Create test configuration
4. Build calendar function tools for Phase 3

Let me know! 🚀
