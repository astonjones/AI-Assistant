# Phase 2 Quick Setup Guide

## What You Have Now

✅ Voice calls routed to AI assistant
✅ Real-time speech recognition
✅ AI responses streamed back to caller
✅ All in 1-2 second latency

## Setup Steps

### 1. Get OpenAI API Key

```
1. Go to https://platform.openai.com/api-keys
2. Sign in with your OpenAI account
3. Click "Create new secret key"
4. Copy the key (you won't see it again!)
```

### 2. Update .env File

```bash
# Add to your .env file
OPENAI_API_KEY=sk-xxxxxxxxxxxx

# Verify these exist (from Phase 1)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
NGROK_URL=https://xxxxxxxx.ngrok.io
```

### 3. Install Dependencies

```bash
npm install
```

(The `ws` package is already installed from Phase 1)

### 4. Start Your Server

```bash
npm start
```

You should see:
```
🚀 Public URL: https://xxxxxxxx.ngrok.io
📱 Voice stream endpoint: https://xxxxxxxx.ngrok.io/voice/stream
```

### 5. Test with a Phone Call

1. Get your Twilio phone number
2. Call it from any phone
3. You should be connected to the AI
4. Speak naturally!
5. Listen for AI responses

## Example Conversation

```
YOU: "Hi there"
AI: "Hi! How can I help you today?"

YOU: "Tell me a joke"
AI: "Why don't scientists trust atoms? Because they make up everything!"

YOU: "What's the weather?"
AI: "I don't have access to weather data, but you can check a weather website."

YOU: "Goodbye"
AI: "Have a great day!"
```

## What Happens Behind the Scenes

```
You speak → Twilio records → Your server receives
         → Sends to OpenAI → OpenAI transcribes
         → OpenAI thinks → OpenAI generates response
         → OpenAI speaks → Your server sends audio
         → Twilio plays → You hear response
```

All of this happens in ~1.5-2 seconds!

## Monitoring

Watch your server logs while testing:

```
🔌 WebSocket connection established
📡 Stream started - Call SID: CA...
✅ OpenAI Realtime WebSocket connected
👤 User transcription: "Hi there"
🤖 AI response completed
```

## Cost Tracking

Check your OpenAI usage at https://platform.openai.com/account/billing/overview

- **15-min call:** ~$1.50
- **100 calls/month:** ~$150
- **Free tier:** $5 credit (good for testing!)

## Common Issues

### "OPENAI_API_KEY not found"
- Add it to `.env`
- Restart server with `npm start`

### Audio not working
- Verify WebSocket connection in logs
- Check OpenAI session created message
- Call from a different phone

### Server crashes
- Check error in terminal
- Verify all environment variables
- Restart: `npm start`

## Next Steps

Try Phase 3:
- Give the AI access to your calendar
- Say: "Add a meeting tomorrow at 2pm"
- AI will update your calendar automatically!

## Files Modified

**New:**
- `src/services/realtime.js` - OpenAI integration

**Updated:**
- `src/index.js` - WebSocket routing
- `src/services/twilio.js` - Audio sending

## That's It!

Your AI voice assistant is now live! 🎉

Questions? Check the logs or review `PHASE_2_IMPLEMENTATION.md` for details.
