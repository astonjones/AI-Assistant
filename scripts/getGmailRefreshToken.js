/**
 * One-time script to generate Gmail refresh token
 * Run: node scripts/getGmailRefreshToken.js [callback_url]
 * 
 * Examples (LOCAL):
 *   node scripts/getGmailRefreshToken.js http://localhost:3001
 * 
 * Examples (NGROK):
 *   node scripts/getGmailRefreshToken.js https://your-ngrok-url.ngrok-free.app 3001
 *   (3001 is the local port ngrok forwards to)
 */

require('dotenv').config();
const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

// Get callback URL from CLI arguments or use defaults
const callbackUrl = process.argv[2] || process.env.NGROK_URL || 'http://localhost:3001';
const callbackPath = '/auth/gmail/callback';
const localPort = process.argv[3] || 3001; // Local port for server (ngrok will forward here)

if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET) {
  console.error('❌ Error: GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET must be set in .env');
  console.error('See GMAIL_SETUP.md for setup instructions.');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  callbackUrl + callbackPath
);

/*
// scopes for later:
'https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send'
*/

// Generate auth URL with required scopes
const scopes = ['https://www.googleapis.com/auth/calendar'];
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
  prompt: 'consent'
});

console.log('\n📧 Gmail Refresh Token Setup');
console.log('='.repeat(50));
console.log(`Public URL: ${callbackUrl + callbackPath}`);
console.log(`Local Server: localhost:${localPort}`);
console.log('\n⚠️  Make sure this URL is added to your Google Cloud Console OAuth credentials!\n');
console.log('📋 Pre-flight checks:');
console.log('  1. Did you set up OAuth consent screen? (Google Cloud → OAuth consent screen)');
console.log('  2. Are you added as a test user if in Development mode?');
console.log('  3. Does your redirect URI match exactly in Google Cloud Console?');
console.log('\n🌐 Opening browser for Gmail authentication...\n');
console.log(`Auth URL: ${authUrl}\n`);

// Local server to catch callback
const server = http.createServer(async (req, res) => {
  const queryUrl = url.parse(req.url, true);
  const code = queryUrl.query.code;
  const error = queryUrl.query.error;

  if (error) {
    console.error(`\n❌ Google rejected the request: ${error}`);
    console.error('\n📋 Common causes:');
    console.error('  1. OAuth consent screen not set up in Google Cloud Console');
    console.error('  2. You\'re not added as a test user (if app is in Development mode)');
    console.error('  3. Callback URL doesn\'t match Google Cloud redirect URI');
    console.error('  4. Wrong credential type (must be "Web application", not Desktop)\n');
    console.error('🔗 Fix it:');
    console.error('  1. Go to: https://console.cloud.google.com/apis/credentials/consent');
    console.error('  2. Configure OAuth consent screen');
    console.error('  3. Add your email under "Test users"');
    res.end(`<h1>❌ Error</h1><p>${error}</p><p>Check your console for fix instructions.</p>`);
    server.close();
    process.exit(1);
  }

  if (code) {
    try {
      // Exchange code for tokens
      const { tokens } = await oauth2Client.getToken(code);
      const refreshToken = tokens.refresh_token;

      if (!refreshToken) {
        throw new Error('No refresh token returned. Ensure "offline" access_type and "consent" prompt are set.');
      }

      console.log(`\n✅ Success! Refresh token acquired.`);
      console.log(`\n   ${refreshToken}\n`);
      console.log('Adding to .env...\n');

      // Add to .env
      const envPath = path.join(__dirname, '../.env');
      const envContent = fs.readFileSync(envPath, 'utf8');
      const updatedEnv = envContent.replace(
        /GMAIL_REFRESH_TOKEN=.*/,
        `GMAIL_REFRESH_TOKEN=${refreshToken}`
      );
      fs.writeFileSync(envPath, updatedEnv);
      console.log('✅ Saved to .env\n');

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>✅ Success!</h1><p>Refresh token saved to .env. You can close this window.</p>');
      
      server.close();
      process.exit(0);
    } catch (err) {
      console.error('\n❌ Error exchanging code for tokens:', err.message);
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`<h1>❌ Error</h1><p>${err.message}</p>`);
      server.close();
      process.exit(1);
    }
  } else if (req.url === callbackPath) {
    res.writeHead(400, { 'Content-Type': 'text/html' });
    res.end('No authorization code received');
  }
});

server.listen(localPort, () => {
  console.log(`✅ Waiting for callback on ${callbackUrl + callbackPath}`);
  console.log(`   Local server listening on localhost:${localPort}\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${localPort} is already in use!`);
    console.error(`Try a different port:\n`);
  } else {
    console.error('Server error:', err.message);
  }
  process.exit(1);
});

// Open browser
if (process.platform === 'win32') {
  require('child_process').exec(`start ${authUrl}`);
} else if (process.platform === 'darwin') {
  require('child_process').exec(`open ${authUrl}`);
} else {
  require('child_process').exec(`xdg-open ${authUrl}`);
}

// Timeout after 5 minutes
setTimeout(() => {
  console.error('\n⏱️  Timeout: No callback received after 5 minutes.');
  console.error('Make sure the callback URL matches your Google Cloud Console settings.\n');
  server.close();
  process.exit(1);
}, 5 * 60 * 1000);
