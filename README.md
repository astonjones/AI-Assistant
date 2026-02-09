# AI Agent API

Small Express API that forwards `PUT /agent` requests to OpenAI Chat Completions and exposes health endpoints.

Setup

1. Copy `.env.example` to `.env` and set `OPENAI_API_KEY`.
2. Install dependencies:

```bash
npm install
```

Run

```bash
npm start
```

Expose via ngrok (optional)

If you want to expose the server over the internet for testing (ngrok):

1. Start your app (default port 3000):

```powershell
# start your app (PowerShell)
node src/index.js
```

2. In a separate terminal run ngrok (replace 3000 if you use a different port):

```bash
ngrok http 3000
```

3. Copy the HTTPS forwarding URL shown by ngrok (for example `https://abcd-1234.ngrok.io`) and either:

- Set it as `NGROK_URL` in your `.env` file, or
- Use it directly as the base URL for requests.

Example `.env` entries:

```
PORT=3000
OPENAI_API_KEY=sk-REPLACE_WITH_YOUR_KEY
NGROK_URL=https://abcd-1234.ngrok.io
```

Endpoints

- `GET /health` — returns `{ status: 'ok' }`.
- `GET /health/ready` — returns `{ ready: true }`.
- `PUT /agent` — forward request to OpenAI. Example body formats:

1) Chat-style messages:

```json
{
	"model": "gpt-3.5-turbo",
	"messages": [{ "role": "user", "content": "Say hello" }]
}
```

2) Simple prompt (will be converted to a single user message):

```json
{ "prompt": "Write a haiku about code." }
```

Example curl (using a local server):

```bash
curl -X PUT http://localhost:3000/agent \
	-H "Content-Type: application/json" \
	-d '{"prompt":"Say hello"}'
```

Example curl (using ngrok):

```bash
curl -X PUT https://abcd-1234.ngrok.io/agent \
	-H "Content-Type: application/json" \
	-d '{"prompt":"Say hello"}'
```

Tip: instead of hard-coding the ngrok URL in commands, you can set an env var and use it in scripts. In PowerShell:

```powershell
#$env:BASE_URL='https://abcd-1234.ngrok.io'
#curl -X PUT $env:BASE_URL/agent -H 'Content-Type: application/json' -d '{"prompt":"Say hello"}'
```
# AI Agent API

Small Express API that forwards PUT /agent requests to OpenAI Chat Completions and exposes health endpoints.

Setup

1. Copy `.env.example` to `.env` and set `OPENAI_API_KEY`.
2. Install dependencies:

```bash
npm install
```

Run

```bash
npm start
```

Endpoints

- `GET /health` — returns `{ status: 'ok' }`.
- `GET /health/ready` — returns `{ ready: true }`.
- `PUT /agent` — forward request to OpenAI. Example body formats: