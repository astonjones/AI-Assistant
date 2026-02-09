# Twilio SMS Setup Guide

## What You Can Do

With Twilio integrated, your agent can:
- **Send SMS messages** via `send_sms` function
- **Check SMS history** (sent and received) via `list_sms_history` function
- **Combine with other services** (email + SMS in one request)

Example:
```
"Text John at +15551234567 about the meeting tomorrow"
"Send an email to sarah@example.com and text her at +15559876543 saying I'm running late"
```

## Setup Steps

### 1. Get Twilio Account

1. Sign up at [twilio.com](https://www.twilio.com/console)
2. Verify your phone number
3. Go to [Twilio Console](https://www.twilio.com/console)
4. Copy your:
   - **Account SID** (visible on main console page)
   - **Auth Token** (visible on main console page)
   - **Phone Number** (get from "Phone Numbers" → "Manage Numbers" or buy one)

### 2. Configure Environment Variables

Add to your `.env` file:

```bash
TWILIO_ACCOUNT_SID=<Twilio_secret>
TWILIO_AUTH_TOKEN=your-auth-token-here
TWILIO_PHONE_NUMBER=+1234567890
```

**Phone Number Format:** Must be in E.164 format:
- US: `+1234567890`
- UK: `+442071946000`
- Australia: `+61292551234`

### 3. Test It Out

Start your server:
```bash
npm start
```

Send a test SMS:
```bash
curl -X PUT http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Send a text to +15551234567 saying hello world",
    "tools": ["twilio"]
  }'
```

### 4. Check Message History

```bash
curl -X PUT http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Show me my recent text messages",
    "tools": ["twilio"]
  }'
```

## Function Reference

### `send_sms`
Sends an SMS message to a phone number.

**Parameters:**
- `to` (required): Phone number in E.164 format (e.g., `+1234567890`)
- `body` (required): Message content (max 1600 characters, but 160 recommended for single SMS)

**Example:**
```json
{
  "to": "+15551234567",
  "body": "Hey John, the meeting is at 3pm tomorrow"
}
```

### `list_sms_history`
Retrieves recent SMS messages (both sent and received).

**Parameters:**
- `limit` (optional): Number of messages (1-100, default 10)

**Example:**
```json
{
  "limit": 20
}
```

**Returns:**
```json
{
  "count": 3,
  "messages": [
    {
      "sid": "SMxxxxx",
      "from": "+1234567890",
      "to": "+15559876543",
      "body": "Hello!",
      "status": "delivered",
      "direction": "outbound",
      "dateSent": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

## Combining Services

Use email and SMS together in one request:

```bash
curl -X PUT http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Email the team report and text everyone the highlights",
    "tools": ["email", "twilio"]
  }'
```

The agent will use both services intelligently based on the context.

## Troubleshooting

### Error: "Twilio not configured"
- Check that `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER` are set in `.env`
- Restart the server after updating `.env`

### Error: "Phone number is invalid"
- Ensure phone number is in E.164 format: `+` followed by country code and number
- Example: `+15551234567` (not `555-123-4567` or `1-555-123-4567`)

### SMS not sending
- Check Twilio account balance
- Verify recipient phone number is correct
- Check message content (no special characters that might break encoding)

### Messages show "failed" status
- Verify recipient number is valid
- Check that your Twilio account has SMS capability in that country
- Review error code in Twilio console

## Pricing

Twilio charges per SMS sent/received:
- Typically $0.0075 per SMS in the US
- Different rates for international numbers
- Check [Twilio Pricing](https://www.twilio.com/sms/pricing) for your region

## Next Steps

Once Twilio is working, you can:
1. Add phone call capabilities (voice API)
2. Add WhatsApp messaging
3. Set up webhook handlers for incoming SMS
4. Integrate with calendar for appointment reminders
5. Create notification workflows (alert via email AND SMS)

See [FUNCTION_CALLING.md](FUNCTION_CALLING.md) for how to add more services following this same pattern.
