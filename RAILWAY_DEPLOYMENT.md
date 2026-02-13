# Railway.app Deployment Guide

## Prerequisites
- GitHub account
- Railway.app account (sign up at https://railway.app)
- All your API keys ready (OpenAI, Twilio, Gmail)

---

## Step 1: Prepare Your Repository

1. **Commit all changes to GitHub:**
   ```bash
   git add .
   git commit -m "Prepare for Railway deployment"
   git push origin main
   ```

2. **Verify these files exist:**
   - ✅ `Dockerfile`
   - ✅ `railway.json`
   - ✅ `.dockerignore`
   - ✅ `.env.example`

---

## Step 2: Create Railway Project

1. **Go to Railway:** https://railway.app
2. **Sign up/Login** with GitHub
3. **Click "New Project"**
4. **Select "Deploy from GitHub repo"**
5. **Choose your `AI-Agent` repository**
6. Railway will automatically detect your `Dockerfile`

---

## Step 3: Add PostgreSQL Database

1. In your Railway project dashboard, click **"+ New"**
2. Select **"Database"**
3. Choose **"PostgreSQL"**
4. Railway will automatically:
   - Create the database
   - Inject `DATABASE_URL` environment variable
   - Link it to your app

---

## Step 4: Configure Environment Variables

1. Click on your **service** (not the database)
2. Go to **"Variables"** tab
3. Click **"+ New Variable"** and add each:

```
PORT=3000
NODE_ENV=production
OPENAI_API_KEY=sk-your-key-here
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+18324301680
GMAIL_CLIENT_ID=your-client-id
GMAIL_CLIENT_SECRET=your-client-secret
GMAIL_REFRESH_TOKEN=your-refresh-token
```

**Important:** 
- Don't set `DATABASE_URL` - Railway injects this automatically
- Don't set `NGROK_URL` yet - we'll update this after getting the domain

---

## Step 5: Get Your Railway Domain

1. After deployment completes, go to **"Settings"** tab
2. Under **"Domains"**, you'll see your Railway domain:
   - Example: `ai-agent-production.up.railway.app`
3. **Copy this domain**

---

## Step 6: Update NGROK_URL Variable

1. Go back to **"Variables"** tab
2. Add or update:
   ```
   NGROK_URL=https://ai-agent-production.up.railway.app
   ```
   (Use your actual Railway domain with `https://`)

3. Railway will auto-redeploy with the new variable

---

## Step 7: Update Twilio Webhooks

1. Go to Twilio Console: https://console.twilio.com
2. Navigate to **Phone Numbers → Manage → Active Numbers**
3. Click your phone number
4. Under **"Voice & Fax"**, set:
   - **A CALL COMES IN:** Webhook
   - **URL:** `https://your-app.railway.app/voice/incoming`
   - **HTTP:** POST
5. **Save**

---

## Step 8: Test Your Deployment

1. **Check health endpoint:**
   ```
   https://your-app.railway.app/health
   ```
   Should return: `{"status":"healthy","timestamp":"..."}`

2. **Check logs in Railway:**
   - Click **"Deployments"** tab
   - Click latest deployment
   - View logs - you should see:
     ```
     ✅ Database initialized and ready
     🚀 Server listening on port 3000
     📱 Voice stream endpoint: https://...
     ```

3. **Make a test call:**
   - Call your Twilio number
   - Should connect to your AI agent
   - Check Railway logs for activity

---

## Step 9: Monitor and Manage

**View Logs:**
- Railway dashboard → Your service → "Deployments" → Click deployment → View logs

**Check Database:**
- Railway dashboard → PostgreSQL service → "Data" tab → Browse tables

**Restart Service:**
- Railway dashboard → Your service → "Settings" → "Restart"

**View Metrics:**
- Railway dashboard → Your service → "Metrics" tab

---

## Database Migration (SQLite → PostgreSQL)

Your app currently uses SQLite with `sql.js`. Railway includes PostgreSQL, so you need to switch.

### Option 1: Use PostgreSQL (Recommended)

Railway provides a `DATABASE_URL` environment variable automatically. You'll need to:

1. Install PostgreSQL driver:
   ```bash
   npm install pg
   ```

2. Update `src/services/database.js` to use PostgreSQL instead of sql.js

### Option 2: Keep SQLite (Not Recommended)

Railway's filesystem is ephemeral, so SQLite data will be lost on restart. But if you want to test:
- SQLite will work but data won't persist
- Consider adding a volume later (additional cost)

**I recommend Option 1 (PostgreSQL)** - want me to create the migration script?

---

## Troubleshooting

### "Application Error" or 503
- Check Railway logs for errors
- Verify all environment variables are set
- Check `DATABASE_URL` is injected (should appear automatically)

### "Cannot connect to database"
- Make sure PostgreSQL service is running
- Verify `DATABASE_URL` variable exists
- Check database service logs

### Twilio webhooks not working
- Verify `NGROK_URL` matches your Railway domain
- Check Twilio webhook URL is correct
- Look for webhook errors in Twilio console

### WebSocket connection fails
- Railway supports WebSockets by default
- Verify `/voice/stream` endpoint is accessible
- Check for connection timeout errors

---

## Cost Breakdown

**Railway Hobby Plan: $5/month includes:**
- ✅ App hosting (unlimited deployments)
- ✅ PostgreSQL database (8GB storage)
- ✅ 500GB bandwidth
- ✅ SSL certificate
- ✅ Custom domain support

**Additional costs: $0**

**Total: $5/month** (plus your existing OpenAI + Twilio costs)

---

## Custom Domain (Optional)

If you want `agent.yourdomain.com` instead of `*.railway.app`:

1. In Railway → "Settings" → "Domains"
2. Click "Custom Domain"
3. Enter your domain: `agent.yourdomain.com`
4. Railway will give you a CNAME record
5. Add CNAME in your DNS provider:
   ```
   Type: CNAME
   Name: agent
   Value: your-app.up.railway.app
   ```
6. Wait for DNS propagation (~5 minutes)
7. Railway auto-generates SSL certificate

---

## Next Steps

1. Deploy to Railway (follow steps above)
2. Migrate to PostgreSQL (I can help with this)
3. Test thoroughly
4. Update Twilio webhooks
5. Monitor logs and usage

Need help with any step? Let me know!
