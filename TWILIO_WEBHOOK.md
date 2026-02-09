# Twilio Webhook Setup

## Receiving Incoming SMS Messages

Your agent can now receive incoming SMS messages from Twilio and log them.

## How It Works

When someone texts your Twilio number, Twilio sends a webhook request to:
```
POST https://your-ngrok-url.ngrok.io/webhooks/sms
```

The server logs the incoming message:
```
📨 Incoming SMS received:
  Message ID: SMxxxxx
  From: +15551234567
  To: +1234567890
  Body: Hello there!
```

## Configuration

### 1. Get Your Webhook URL

If using ngrok:
```bash
npm start
# Note the NGROK_URL from output, e.g.: https://abc123.ngrok.io
```

### 2. Configure Twilio Webhook

1. Go to [Twilio Console](https://www.twilio.com/console)
2. Click on **Phone Numbers** → Select your number
3. Under **Messaging**:
   - **Webhook URL for incoming messages**: `https://your-url/webhooks/sms`
   - **HTTP Method**: `POST`
4. Click **Save**

Replace `your-url` with your actual ngrok URL or domain.

## Testing

### Option 1: Send SMS from Phone
Simply text your Twilio number. You should see it logged in your console:
```
📨 Incoming SMS received:
  Message ID: SMxxxxx
  From: +15551234567
  To: +1234567890
  Body: Hello from my phone!
```

### Option 2: Send Test SMS via Twilio CLI
```bash
twilio api:core:messages:create \
  --from=+1234567890 \
  --to=your-phone-number \
  --body="Test message"
```

### Option 3: cURL Test
```bash
curl -X POST http://localhost:3000/webhooks/sms \
  -d "MessageSid=SMtest123" \
  -d "From=+15551234567" \
  -d "To=+1234567890" \
  -d "Body=Test message"
```

## Current Behavior

- ✅ Logs incoming message details
- ✅ Returns proper TwiML response to Twilio
- 📋 Future: Store messages, trigger agent actions, send auto-replies

## Webhook URL Format

```
https://[your-domain]/webhooks/sms
```

Examples:
- `https://abc123def456.ngrok.io/webhooks/sms` (ngrok)
- `https://api.yourdomain.com/webhooks/sms` (production)

## Troubleshooting

### Webhook not being called
- Check that Twilio has the correct webhook URL
- Verify your server is running and accessible
- Check server logs for errors

### "Unable to create message"
- Ensure your Twilio account has SMS capability
- Check account balance
- Verify phone numbers are valid

### Webhook returns error
- Check server is accepting form-encoded data (it is with `express.urlencoded`)
- Verify all required fields are being sent

## Next Steps

Once incoming messages are working:
1. ✅ Log incoming messages (done)
2. 📋 Store messages in database
3. 📋 Trigger agent with incoming SMS
4. 📋 Send auto-replies
5. 📋 Create SMS conversation history

See [TWILIO_SETUP.md](TWILIO_SETUP.md) for more SMS features.
