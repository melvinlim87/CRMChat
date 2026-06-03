# CRMChat

A chat-based CRM that connects **WhatsApp Business** and keeps all your leads in
one inbox — inspired by [The Librarian](https://thelibrarian.io/) and
[GoHighLevel](https://www.gohighlevel.com/). Capture conversations, manage your
lead pipeline, and reply from a single Team Inbox.

> **Status:** v1 scaffold — core foundation, auth, Leads CRM, and a live Chat
> inbox with a WhatsApp Cloud API connector. See the roadmap below.

## Tech stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** for the UI
- **Prisma** ORM + **PostgreSQL**
- **WhatsApp Business Cloud API** (official Meta API)
- Lightweight JWT cookie auth (`jose` + `bcryptjs`)

## Features in this version

- 🔐 Email/password login with session cookies
- 👥 **Leads** — pipeline table with status, tags, company, last activity
- 💬 **Chat** — GoHighLevel-style Team Inbox: conversation list, message thread,
  composer, and a contact-details side panel
- 🔌 **Integrations** — connection hub (WhatsApp + Google wired up; others stubbed)
- 📥 **WhatsApp webhook** — inbound messages auto-create leads + conversations
- 📤 **Send** — outbound replies delivered via the WhatsApp Cloud API
- 🟥 **Gmail** — recent inbox (read) + compose & send (write)
- 📅 **Google Calendar** — upcoming events agenda + create new events
- 📁 **Google Drive** — recent files list
- 🔑 **Google OAuth** — one connection grants Gmail + Calendar + Drive
- 👤 **Lead assignment** — owner per lead, inline reassign, filter by owner
- ⚡ **Automations** — auto-reply / add tag / set status on inbound messages
- 🟢 **Live inbox** — new messages appear via polling, no manual refresh

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
- [ ] WhatsApp message templates + 24h-window handling
- [ ] Real-time via WebSocket/SSE (replace polling)
- [ ] Lead followers, notes, drag-and-drop pipeline stages
- [ ] Drive uploads + link Gmail threads / files / events to leads
- [ ] More automation triggers (status change, scheduled follow-ups)
- [ ] Additional channels: Instagram DMs, SMS
- [ ] Multi-tenant / multi-workspace support

## License

Proprietary — all rights reserved.
