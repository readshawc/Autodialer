# AutoDialer Backend

Provider-agnostic dialing engine. Currently uses Telnyx. Swap to Twilio or Bandwidth by editing `services/telephony.js` only.

---

## Deploy to Railway (step by step)

### 1. Create a GitHub repository
1. Go to github.com and sign in (create a free account if needed)
2. Click the **+** button → **New repository**
3. Name it `autodialer-backend`
4. Click **Create repository**
5. Upload all these files to the repo (drag & drop on GitHub works)

### 2. Deploy on Railway
1. Go to **railway.app** and sign in with your GitHub account
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your `autodialer-backend` repository
4. Railway will detect it's a Node.js app automatically
5. Click **Deploy** — it'll build in about 60 seconds

### 3. Set environment variables
1. In Railway, click your project → **Variables** tab
2. Add each variable from `.env.example` with your real values:

| Variable | Where to find it |
|---|---|
| `TELNYX_API_KEY` | telnyx.com → API Keys |
| `TELNYX_PHONE_NUMBER` | Your Telnyx number (with +1) |
| `TELNYX_CONNECTION_ID` | telnyx.com → Voice → Connections |
| `BACKEND_URL` | Railway gives you this URL after deploy |
| `APP_API_KEY` | Make up a long random password |

3. Click **Deploy** again after adding variables

### 4. Get your backend URL
1. In Railway, click **Settings** → **Domains**
2. Copy your URL — it looks like `https://autodialer-backend-production.up.railway.app`
3. Add this as `BACKEND_URL` in your variables
4. Also set this as the webhook URL in Telnyx (see below)

### 5. Configure Telnyx webhook
1. Go to telnyx.com → **Voice** → **Connections**
2. Open your connection → **Inbound** settings
3. Set **Webhook URL** to: `https://YOUR-RAILWAY-URL/webhooks/telnyx`
4. Save

### 6. Test it
Visit `https://YOUR-RAILWAY-URL/health` in your browser.
You should see: `{"status":"ok","ts":"..."}`

---

## API Reference

All routes (except `/health` and `/webhooks`) require:
```
Authorization: Bearer YOUR_APP_API_KEY
```

| Method | Route | Description |
|---|---|---|
| GET | `/health` | Server status |
| GET | `/calls/state` | Full app state |
| POST | `/calls/start` | Start dialer |
| POST | `/calls/stop` | Stop dialer |
| PATCH | `/calls/params` | Update parameters |
| GET | `/contacts` | List contacts |
| POST | `/contacts` | Add one contact |
| POST | `/contacts/bulk` | Import many contacts |
| DELETE | `/contacts/:id` | Remove contact |
| POST | `/contacts/:id/reset` | Reset call history |
| POST | `/contacts/:id/skip` | Skip contact |

---

## Swap telephony providers

To switch from Telnyx to Twilio:
1. Open `services/telephony.js`
2. Add a `twilioAdapter` object with the same interface
3. Change `TELEPHONY_PROVIDER=twilio` in Railway variables

Nothing else in the app needs to change.
