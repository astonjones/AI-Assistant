# 🚀 Railway Deployment Checklist

Quick checklist to deploy your AI Phone Agent to Railway.app

---

## Before You Start

- [ ] GitHub account created
- [ ] Railway.app account created (https://railway.app)
- [ ] All API keys ready:
  - [ ] OpenAI API Key
  - [ ] Twilio Account SID
  - [ ] Twilio Auth Token  
  - [ ] Twilio Phone Number
  - [ ] Gmail Client ID
  - [ ] Gmail Client Secret
  - [ ] Gmail Refresh Token

---

## Step 1: Prepare Code

- [ ] Install PostgreSQL package:
  ```bash
  npm install pg
  ```

- [ ] Switch to PostgreSQL database:
  ```bash
  mv src/services/database.js src/services/database.sqlite.js
  mv src/services/database.postgres.js src/services/database.js
  ```

- [ ] Commit and push to GitHub:
  ```bash
  git add .
  git commit -m "Prepare for Railway deployment"
  git push origin main
  ```

---

## Step 2: Create Railway Project

- [ ] Go to https://railway.app
- [ ] Click "New Project"
- [ ] Select "Deploy from GitHub repo"
- [ ] Choose your `AI-Agent` repository
- [ ] Wait for initial deployment

---

## Step 3: Add PostgreSQL

- [ ] In Railway dashboard, click "+ New"
- [ ] Select "Database"
- [ ] Choose "PostgreSQL"
- [ ] Wait for database to provision

---

## Step 4: Set Environment Variables

In Railway → Your Service → Variables tab, add:

- [ ] `NODE_ENV=production`
- [ ] `PORT=3000`
- [ ] `OPENAI_API_KEY=sk-...`
- [ ] `TWILIO_ACCOUNT_SID=ACxxx...`
- [ ] `TWILIO_AUTH_TOKEN=...`
- [ ] `TWILIO_PHONE_NUMBER=+1...`
- [ ] `GMAIL_CLIENT_ID=...`
- [ ] `GMAIL_CLIENT_SECRET=...`
- [ ] `GMAIL_REFRESH_TOKEN=...`

**Note:** Don't set `DATABASE_URL` - Railway injects it automatically!

---

## Step 5: Get Your Railway Domain

- [ ] Go to "Settings" tab in your service
- [ ] Copy your Railway domain (e.g., `ai-agent-production.up.railway.app`)
- [ ] Go back to "Variables" tab
- [ ] Set `NGROK_URL=https://your-app.up.railway.app`
- [ ] Service will auto-redeploy

---

## Step 6: Update Twilio

- [ ] Go to Twilio Console: https://console.twilio.com
- [ ] Navigate to Phone Numbers → Manage → Active Numbers
- [ ] Click your phone number
- [ ] Under "Voice & Fax", set webhook:
  - **URL:** `https://your-app.up.railway.app/voice/incoming`
  - **Method:** POST
- [ ] Save configuration

---

## Step 7: Test Deployment

- [ ] Check health endpoint: `https://your-app.up.railway.app/health`
  - Should return: `{"status":"healthy",...}`

- [ ] Check Railway logs:
  - [ ] See "✅ PostgreSQL connected"
  - [ ] See "✅ Database initialized and ready"
  - [ ] See "🚀 Server listening on port 3000"

- [ ] Make test call to your Twilio number
  - [ ] Call connects
  - [ ] AI agent responds
  - [ ] Calendar/SMS tools work

- [ ] Check database:
  - Railway → PostgreSQL → Data tab
  - [ ] See records in `callers` table
  - [ ] See records in `conversations` table
  - [ ] See records in `messages` table

---

## Step 8: Monitor (Optional)

- [ ] Set up Railway alerts (Settings → Alerts)
- [ ] Bookmark your Railway dashboard
- [ ] Check logs periodically

---

## Troubleshooting

### App won't start
- [ ] Check Railway logs for errors
- [ ] Verify all environment variables are set
- [ ] Ensure `DATABASE_URL` exists (auto-injected by PostgreSQL service)

### Calls not connecting
- [ ] Verify Twilio webhook URL is correct
- [ ] Check `NGROK_URL` variable matches your Railway domain
- [ ] Look for errors in Railway logs during call

### Database errors
- [ ] Ensure PostgreSQL service is running
- [ ] Check database service logs
- [ ] Verify `database.postgres.js` is being used (not `database.sqlite.js`)

---

## Cost Summary

- **Railway Hobby Plan:** $5/month
  - Includes app hosting
  - Includes PostgreSQL database
  - Includes SSL certificate
  - Includes 500GB bandwidth

- **Additional Costs:** $0
  - No extra services needed!

- **Your Existing Costs:**
  - OpenAI API (pay per usage)
  - Twilio (pay per usage)

---

## Next Steps After Deployment

- [ ] Test all features thoroughly
- [ ] Monitor usage and performance
- [ ] Set up automatic backups (optional)
- [ ] Add custom domain (optional)
- [ ] Invite others to test (optional)

---

## Support Resources

- **Railway Docs:** https://docs.railway.app
- **Railway Discord:** https://discord.gg/railway
- **Your Deployment Guide:** See `RAILWAY_DEPLOYMENT.md`
- **PostgreSQL Migration:** See `POSTGRESQL_MIGRATION.md`

---

## ✅ You're Done!

Once all checkboxes are checked, your AI Phone Agent is live on Railway! 🎉

**Your app is now accessible at:** `https://your-app.up.railway.app`

Call your Twilio number to test it out!
