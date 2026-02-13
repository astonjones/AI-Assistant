# OpenAI Realtime Tools Implementation

## Architecture

Your tools are structured modularly for reusability across **both** Realtime and standard OpenAI APIs:

```
src/services/
├── functions/                    ← Tool definitions (shared)
│   ├── databaseFunctions.js
│   ├── calendarFunctions.js
│   ├── emailFunctions.js
│   └── twilioFunctions.js
├── implementations/              ← Tool implementations (shared)
│   ├── databaseImpl.js
│   ├── calendarImpl.js
│   ├── emailImpl.js
│   └── twilioImpl.js
└── tools.js                      ← Orchestrator (handles routing)
```

**Key Point**: Function definitions and implementations are identical whether you use:
- **OpenAI Realtime** (WebSocket - voice)
- **OpenAI Chat API** (REST - text)

The only difference is *where* they appear in the API request and *how* results come back.

## Available Tools

### 1. Database: `update_caller_name`
Updates the caller's name in the database when the AI learns it.

### 2. Calendar Functions
- `create_event` - Schedule appointments
- `list_events` - Show upcoming events

### 3. Email Functions
- `send_email` - Send emails via Gmail

### 4. SMS Functions
- `send_sms` - Send text messages via Twilio

## Setup

### Prerequisites
```bash
npm install better-sqlite3 nodemailer
```

### Configure Credentials

Add to `.env`:
```
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_CALENDAR_REFRESH_TOKEN=your_refresh_token
GMAIL_USER=your_gmail@gmail.com
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number
```

**Get Google Refresh Token:**
```bash
node scripts/getGmailRefreshToken.js
```

## How Tools Work (Realtime ↔ Text APIs)

Both APIs use the same tool execution flow. The difference is **delivery**:

### OpenAI Realtime (WebSocket)
```
Session → Tools array in session.update
  ↓
AI decides to call tool
  ↓
WebSocket: response.function_call_arguments.delta events
  ↓
Parse arguments + emit 'tool-call' event
  ↓
ToolsService.executeTool() routes to implementation
  ↓
Send result back via conversation.item.create
```

### OpenAI Chat API (REST)
```
Messages → Tools array in request
  ↓
AI decides to call tool
  ↓
Response: tool_calls in choice
  ↓
Parse tool_calls array
  ↓
ToolsService.executeTool() routes to implementation
  ↓
Add tool result as message, send another request
```

**Tool definitions and implementations are 100% identical.** Only the orchestration layer differs!

## Adding a New Tool

### 1. Define it (e.g., `myServiceFunctions.js`)
```javascript
const myFunctions = [
  {
    name: 'my_function',
    description: 'What this does',
    parameters: {
      type: 'object',
      properties: {
        arg1: { type: 'string', description: 'Argument' }
      },
      required: ['arg1']
    }
  }
];
module.exports = myFunctions;
```

### 2. Implement it (e.g., `myServiceImpl.js`)
```javascript
module.exports = {
  async my_function(args, phone) {
    // Your code here
    return { success: true, result: 'Done' };
  }
};
```

### 3. Register in `tools.js`
```javascript
// Import
const myFunctions = require('./functions/myServiceFunctions');
const myImpl = require('./implementations/myServiceImpl');

// Add to tools array
this.tools = [...this.tools, ...myFunctions];

// Add to implementations map
this.implementations = {
  ...this.implementations,
  my_function: myImpl.my_function
};
```

## Testing

**Make a call:**
```
AI: "What's your name?"
Caller: "I'm John Smith"
AI: [calls update_caller_name]
AI: "Nice to meet you, John!"
```

**Check logs:**
```
🔧 Executing tool: update_caller_name
✅ Updated caller name: +1234567890 → "John Smith"
📤 Sent tool result to OpenAI
```

**Schedule something:**
```
Caller: "Schedule a meeting for tomorrow at 3pm"
AI: [calls create_event]
AI: "I've added that to your calendar!"
```

## Troubleshooting

**Tool not being called:**
- Check system prompt mentions when tools are useful
- Tools work best when naturally needed for task
- Review AI logs for tool-related messages

**Tool execution fails:**
- Check .env has all required credentials
- Verify corresponding service is initialized (calendar, email, SMS)
- Review error message in logs

**API rate limits:**
- Google Calendar/Gmail have daily limits
- Twilio has per-account limits
- Consider caching results for common operations

