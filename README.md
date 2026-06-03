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
- 🔌 **Integrations** — connection hub (WhatsApp wired up; others stubbed)
- 📥 **WhatsApp webhook** — inbound messages auto-create leads + conversations
- 📤 **Send** — outbound replies delivered via the WhatsApp Cloud API

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

## Project structure

```
src/
  app/
    (app)/            # authenticated app (sidebar layout)
      leads/          # Leads CRM table
      chat/           # Team Inbox (chat)
      integrations/   # Channel connections
    api/
      auth/           # login / logout
      messages/       # send a message
      conversations/  # inbox polling endpoint
      webhooks/whatsapp/  # Meta webhook (verify + inbound)
    login/            # sign-in page
  components/         # Sidebar, ChatInbox, StatusBadge
  lib/                # prisma, auth, whatsapp, formatting
prisma/
  schema.prisma       # data model
  seed.ts             # demo data
```

## Roadmap

- [ ] WhatsApp message templates + 24h-window handling
- [ ] Real-time updates (WebSocket / SSE) instead of refresh-on-send
- [ ] Lead detail editing, notes, and pipeline stages (drag & drop)
- [ ] Team members, roles, and assignment (lead owner / followers)
- [ ] Automations & trigger links (GoHighLevel-style workflows)
- [ ] Additional channels: Instagram DMs, Gmail, SMS
- [ ] Multi-tenant / multi-workspace support

## License

Proprietary — all rights reserved.
