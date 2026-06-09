# AlgoVenture — AI Chat Widget · Handoff

A Next.js app that powers an **AI chat assistant** you embed on a website. It
answers from an uploaded knowledge base + FAQs, can run a scripted visual flow,
gates students via email, and supports **live human takeover** from an inbox.

- **Repo:** `melvinlim87/CRMChat`
- **Working branch:** `claude/peaceful-lovelace-xWJvw`
- **Stack:** Next.js 14 (App Router, TS) · Prisma · PostgreSQL · Tailwind · React Flow

> ⚠️ **Login is currently disabled** — the admin is open to anyone with the URL.
> Fine for local dev; add a passcode/auth before deploying publicly (see "Security").

---

## 1. Run locally

Prereqs: **Node 18+**, **npm**, and **PostgreSQL** (Docker is easiest).

```bash
git clone https://github.com/melvinlim87/CRMChat.git
cd CRMChat
git checkout claude/peaceful-lovelace-xWJvw

npm install
cp .env.example .env          # then set AUTH_SECRET (any long random string)

docker compose up -d          # starts Postgres on :5432 (or use your own DB)
npm run db:push               # creates/updates all tables
npm run dev                   # http://localhost:3000
```

The app opens straight to the **Chat Widget** page (no sign-in).

> After every `git pull` that changes `prisma/schema.prisma`, run `npm run db:push` again.

---

## 2. Configure the assistant

All in the admin UI:

- **Chat Widget** (`/chat-widget`) — title, colour, AI tone, intro flow (student gate),
  starter prompts, avatar, embed type/height, **and PDF knowledge upload**.
- **Settings** (`/settings`) — pick an **AI provider + model** and paste an API key.
  Free options: **Groq**, **Google Gemini**, **Ollama** (local). The assistant
  won't reply until a provider key is set.
- **FAQs** (`/faq`) — Q&A pairs the AI uses (and a public feed at `/api/widget/faqs`).
- **Flow builder** (`/chat-widget/flow/public`) — visual guided conversation.
- **Inbox** (`/chat`) — where agents answer visitors who ask for a human (live takeover).

---

## 3. Embed on a website

Deploy the app first (see below). It serves the loader at `https://YOUR-APP/widget.js`.
Then paste **one snippet** into the target site (before `</body>`).

**Inline panel (e.g. an "AI Assistant" section), dark theme:**
```html
<div id="crmchat-assistant" style="height:600px"></div>
<script src="https://YOUR-APP/widget.js"
        data-widget="public" data-color="#cda14a"
        data-theme="dark" data-inline="#crmchat-assistant"
        data-height="600px" defer></script>
```

**Floating bubble on every page:**
```html
<script src="https://YOUR-APP/widget.js" data-widget="public" data-color="#cda14a" defer></script>
```

The Chat Widget admin page generates the exact snippet (Copy code) with the
right URL/options. `data-widget="students"` embeds the student-only widget.

---

## 4. Deploy (Vercel + Neon suggested)

1. Create a Postgres DB (e.g. **Neon**), copy its connection string.
2. Import the repo into **Vercel**.
3. Set env vars: `DATABASE_URL`, `AUTH_SECRET` (see `.env.example` for the rest).
4. Deploy. Then run `npx prisma db push` against the production DB (or use a
   build step) to create tables.
5. Your app URL becomes the `widget.js` host used in the embed snippet.

See `DEPLOY.md` for more detail.

---

## 5. How it works (quick map)

- `public/widget.js` — embed loader (floating + inline).
- `src/app/widget/page.tsx` + `src/components/WidgetChat.tsx` — the chat UI.
- `src/app/api/widget/chat/route.ts` — AI replies, history, human-handoff.
- `src/app/api/widget/poll/route.ts` — live agent replies into the widget.
- `src/app/api/widget/verify-student/route.ts` — student email check.
- `src/lib/ai.ts` — multi-provider AI. `src/lib/knowledge.ts` — KB/FAQ retrieval.
- `src/components/WidgetSetup.tsx` — the admin. `src/components/ChatInbox.tsx` — agent inbox.
- `prisma/schema.prisma` — data model.

---

## 6. Security (before going live)

Login was removed for convenience. Options to protect the admin:
- A shared **passcode** to open the admin (no full login page).
- **IP allowlist**, or restrict to a Google account.
- Add **rate limiting** to the public `/api/widget/*` endpoints and fix the
  student-email lookup so it can't be used to enumerate accounts.

Public visitor endpoints (`/api/widget/chat`, `/poll`, `/verify-student`,
`/log`, `/faqs`) are intentionally open — they're what the website widget calls.
