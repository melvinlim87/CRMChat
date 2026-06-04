# AlgoVenture — AI WhatsApp CRM

A full **AI-powered chat CRM**: WhatsApp + a website chat widget + Google, an AI
"brain" grounded in your own PDFs, a visual flow builder, a drag-and-drop website
builder, and a sales pipeline — inspired by [GoHighLevel](https://www.gohighlevel.com/)
and [The Librarian](https://thelibrarian.io/).

## Tech stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS**
- **Prisma** ORM + **PostgreSQL**
- **React Flow** (visual flow builder)
- **WhatsApp Business Cloud API** + **Google APIs** + multi-provider AI
- JWT cookie auth (`jose` + `bcryptjs`)

## Features

**Inbox & CRM**
- 💬 GoHighLevel-style **Team Inbox** — live updates, channel badges, WhatsApp-Web search (name / number / email / message), unread & "Needs you" filters, contact panel
- ⚡ **Quick replies** (canned responses) + **✨ AI draft** in the composer
- 👥 **Leads** table + 🗂️ drag-and-drop **Pipeline** board, manual **New lead**, owner assignment & filter, lead **notes**
- 📊 **Dashboard** with charts (new leads/day, by source) + stats
- 🧑‍🤝‍🧑 **Team members** — add users who can log in and own leads

**AI brain**
- 🤖 **Multi-provider AI** with model picker: **Groq (free)**, **Gemini (free)**, **Ollama (local)**, OpenRouter, OpenAI, Anthropic
- 📚 **Knowledge base** — upload PDFs → text extracted → **RAG** grounds every AI reply
- 🔀 **Visual WhatsApp AI flow builder** — one-click templates, resizable nodes, send/AI/condition/wait/tag/status, multi-turn, looping AI for continuous chat, and a **live phone preview** with real AI
- 🔧 **Automations** (auto-reply / tag / status), 🌍 **multilingual** replies, 🚨 **sentiment + human handoff**

**Channels & integrations**
- 📲 **WhatsApp Business** (Cloud API) — configure in-app; inbound → leads, outbound send
- 🔌 **Embeddable chat widget** — plug-and-play `<script>` for any website, with live preview
- 🌐 **Website builder** — drag-and-drop pages incl. a **lead-capture form**, publish to a public URL
- 🔵 **Google** (Gmail/Calendar/Drive read + write) · 🔔 **Slack** notifications

**Go-live**
- 🚀 **Go Live** readiness checklist + `DEPLOY.md` (Vercel + Neon)

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Start Postgres

```bash
docker compose up -d
```

### 3. Configure environment

```bash
cp .env.example .env
# edit .env — at minimum set AUTH_SECRET (openssl rand -base64 32)
```

### 4. Create the schema and seed demo data

```bash
npm run db:push
npm run db:seed
```

### 5. Run

```bash
npm run dev
```

Open http://localhost:3000 and log in with:

- **Email:** `demo@crmchat.app`
- **Password:** `password123`

## Connecting WhatsApp Business

1. Create a Meta app at https://developers.facebook.com and add the **WhatsApp**
   product.
2. From **WhatsApp → API Setup**, copy your **Phone number ID** and a
   **temporary/permanent access token** into `.env`:
   ```
   WHATSAPP_PHONE_NUMBER_ID="..."
   WHATSAPP_ACCESS_TOKEN="..."
   WHATSAPP_VERIFY_TOKEN="my-verify-token"
   ```
3. Expose your local server (e.g. `ngrok http 3000`) and set the webhook in Meta:
   - **Callback URL:** `https://<your-domain>/api/webhooks/whatsapp`
   - **Verify token:** the same value as `WHATSAPP_VERIFY_TOKEN`
   - Subscribe to the **messages** field.
4. Send a WhatsApp message to your business number — it will appear in the inbox
   as a new lead.

> Outside WhatsApp's 24-hour customer-service window you must send an approved
> **message template** rather than free-form text. The current send helper sends
> plain text (works within the window); template support is on the roadmap.

## Connecting Google (Gmail, Calendar, Drive)

1. In the [Google Cloud Console](https://console.cloud.google.com/) create (or pick)
   a project and enable the **Gmail API**, **Google Calendar API**, and **Google
   Drive API**.
2. Configure the **OAuth consent screen** (External is fine for testing; add your
   own Google account as a test user).
3. Create an **OAuth 2.0 Client ID** of type **Web application** and add the
   redirect URI:
   ```
   http://localhost:3000/api/integrations/google/callback
   ```
   (use your real domain in production).
4. Put the credentials in `.env`:
   ```
   GOOGLE_CLIENT_ID="..."
   GOOGLE_CLIENT_SECRET="..."
   ```
5. Restart the dev server, go to **Integrations → Connect Google**, and approve
   access. Gmail, Calendar, and Drive pages then populate from your account.

> Scopes are **read-only** (`gmail.readonly`, `calendar.readonly`,
> `drive.metadata.readonly`). Sending email / creating events is on the roadmap.

## Project structure

```
src/
  app/
    (app)/            # authenticated app (sidebar layout)
      leads/          # Leads CRM table
      chat/           # Team Inbox (chat)
      gmail/          # Gmail inbox (Google)
      calendar/       # Calendar agenda (Google)
      drive/          # Drive files (Google)
      integrations/   # Channel + tool connections
    api/
      auth/                    # login / logout
      messages/                # send a message
      conversations/           # inbox polling endpoint
      webhooks/whatsapp/       # Meta webhook (verify + inbound)
      integrations/google/     # OAuth start / callback / disconnect
    login/            # sign-in page
  components/         # Sidebar, ChatInbox, StatusBadge, ConnectGoogle, ...
  lib/                # prisma, auth, whatsapp, google, formatting
prisma/
  schema.prisma       # data model
  seed.ts             # demo data
```

## Roadmap

- [x] Lead owner & assignment (assign, filter, inline reassign)
- [x] Real-time inbox (live polling, mark-read)
- [x] Google integrations: Gmail, Calendar, Drive (OAuth)
- [x] Google write actions: send Gmail, create Calendar events
- [x] Automations (auto-reply / tag / set status on inbound message)
- [x] Dashboard, drag-and-drop pipeline board, lead notes
- [x] Multi-provider AI (Claude / GPT / Gemini) with model selector + AI-drafted replies
- [x] Visual WhatsApp AI flow builder (React Flow)
- [ ] WhatsApp message templates + 24h-window handling
- [ ] Real-time via WebSocket/SSE (replace polling)
- [ ] Lead followers, notes, drag-and-drop pipeline stages
- [ ] Drive uploads + link Gmail threads / files / events to leads
- [ ] More automation triggers (status change, scheduled follow-ups)
- [ ] Additional channels: Instagram DMs, SMS
- [ ] Multi-tenant / multi-workspace support

## License

Proprietary — all rights reserved.
