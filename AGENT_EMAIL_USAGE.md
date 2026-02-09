# Agent Email Sending Guide

## How It Works

When you ask your agent to send an email, it will:
1. Parse your request
2. Generate an email response
3. **Automatically execute** the email send action
4. Return confirmation with email details

## Example Usage

### Send a Simple Email

```bash
curl -X PUT http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Send an email to john@example.com with subject \"Meeting Tomorrow\" and body \"Hi John, see you tomorrow at 10am!\""
  }'
```

**Response:**
```json
{
  "choices": [...],
  "emailActions": {
    "actions": [
      {
        "type": "send_email",
        "success": true,
        "result": {
          "success": true,
          "messageId": "abc123xyz",
          "message": "Email sent to john@example.com"
        }
      }
    ],
    "errors": []
  }
}
```

### Using Natural Language

```bash
curl -X PUT http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Tell sarah@company.com that the project is delayed. Subject should be \"Project Update\""
  }'
```

The agent will:
1. Understand your intent
2. Generate appropriate email content
3. Send it automatically

## Email Format Recognition

The agent looks for these patterns in its response:

```
to: recipient@example.com
subject: "Email Subject"
body: "Email body content here"
```

Or natural language like:
- "Send email to john@example.com"
- "Subject: Meeting Time"
- "Body: Let's schedule..."

## Disable Auto-Execution

If you want to just generate emails without sending:

```bash
curl -X PUT http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Draft an email...",
    "executeActions": false
  }'
```

This returns what the agent would send, without actually sending it.

## Error Handling

If email sending fails:

```json
{
  "emailActions": {
    "actions": [],
    "errors": [
      {
        "action": "send_email",
        "error": "Could not extract email details. Include: to, subject, and body"
      }
    ]
  }
}
```

**Common issues:**
- Missing recipient email
- Missing subject
- Missing body
- Invalid email format

## Requirements

- Gmail API must be configured (see GMAIL_SETUP.md)
- `GMAIL_REFRESH_TOKEN` must be set in .env
- Agent request must clearly specify: **to**, **subject**, and **body**
