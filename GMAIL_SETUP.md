# Gmail Integration Setup

## Getting a Refresh Token

### Step 1: Create OAuth2 Credentials (Web App)
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable **Gmail API**
4. Go to **Credentials** → **Create OAuth 2.0 Client ID**
5. Choose **"Web application"** (NOT Desktop)
6. Add Authorized redirect URIs:
   - `http://localhost:3001/auth/gmail/callback` (local development)
   - `https://your-ngrok-url/auth/gmail/callback` (for remote testing)
7. Copy `Client ID` and `Client Secret`

### Step 2: Add Credentials to `.env`
```dotenv
GMAIL_CLIENT_ID=your_client_id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your_client_secret
GMAIL_REFRESH_TOKEN=  # Will be filled in by script
```

### Step 3: Generate Refresh Token

**For Local Development:**
```bash
npm run get-refresh-token http://localhost:3001
# or
node scripts/getGmailRefreshToken.js http://localhost:3001
```

**For Remote Testing (ngrok):**
```bash
npm run get-refresh-token https://your-ngrok-url.ngrok-free.app
# or
node scripts/getGmailRefreshToken.js https://your-ngrok-url.ngrok-free.app
```

The script will:
1. Open a browser asking for Gmail permission
2. Redirect to your callback URL with auth code
3. Exchange code for refresh token
4. Save to `.env` as `GMAIL_REFRESH_TOKEN`

### Troubleshooting

**"Callback URL in script doesn't match Google Cloud Console"**
- Make sure the redirect URI you pass to the script matches exactly what's in Google Cloud Console
- Example: If you set `http://localhost:3001/auth/gmail/callback` in Google Cloud, use `http://localhost:3001` in the script

**"Port already in use"**
- The callback server can't bind to the port
- Try a different port: `node scripts/getGmailRefreshToken.js http://localhost:3002`

**"No refresh token returned"**
- Check that you're using "Web application" credentials, not Desktop
- Ensure "consent" screen was shown (try deleting cache and running again)

### Step 3: Add Credentials to `.env`
```
GMAIL_CLIENT_ID=your_client_id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your_client_secret
GMAIL_REFRESH_TOKEN=1//0gNb...refresh_token_here
```

## How the Agent Maintains the Refresh Token

The `EmailService` automatically manages token refresh:

```javascript
// In email.js
const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  'http://localhost:3000/auth/gmail/callback'
);

// Set refresh token
oauth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN
});

// Gmail API uses oauth2Client
const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
```

**Key Points:**
- Refresh token stored in `.env` (never expires)
- `oauth2Client` automatically refreshes access token when it expires
- No manual token management needed
- All API calls use the authenticated client

## Never Expose Credentials
- `.env` is in `.gitignore`
- Refresh token only in `.env`, never in code
- Keep credentials secret in production
