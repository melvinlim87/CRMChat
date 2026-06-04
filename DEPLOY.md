# Deploying CRMChat to production

This guide takes you from local code to a live, public CRM with real Google and
WhatsApp integrations. The recommended stack is **Vercel** (hosting) + **Neon**
(Postgres) — both have free tiers.

> In the app, open **Go Live** in the sidebar for a live checklist of what's
> done and what's left.

---

## 1. Database (Neon)

You likely already have this from local dev.

1. Create a project at [neon.tech](https://neon.tech) and copy the connection
   string (`postgresql://…?sslmode=require`).
2. Keep it handy — it becomes `DATABASE_URL` in Vercel.

## 2. Deploy the app (Vercel)

1. Make sure your code is pushed to GitHub (this repo).
2. Go to [vercel.com/new](https://vercel.com/new) and **import the repository**.
3. Framework preset: **Next.js** (auto-detected). No build settings to change.
4. Add **Environment Variables** (Settings → Environment Variables):

   | Name | Value |
   |------|-------|
   | `DATABASE_URL` | your Neon connection string |
   | `AUTH_SECRET` | a long random string — `openssl rand -base64 32` |

5. Click **Deploy**. You'll get a URL like `https://your-app.vercel.app`.

### Create the tables in production

Run once from your machine, pointed at the production database:

```bash
DATABASE_URL="<your-neon-url>" npx prisma db push
DATABASE_URL="<your-neon-url>" npm run db:seed   # optional demo data
```

Then log in at `https://your-app.vercel.app` with `demo@crmchat.app` /
`password123` and **change the password / create your own user** (see Security).

## 3. AI model (required for AI replies)

In the app: **Settings** → pick a provider and paste a key. Free options:

- **Groq** — [console.groq.com/keys](https://console.groq.com/keys)
- **Google Gemini** — [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
- **Ollama** — only for self-hosting (a local model server); not for Vercel.

Keys are stored in your database, so you set them once in the live app.

## 4. Connect Google (Gmail / Calendar / Drive)

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
   create an **OAuth 2.0 Client (Web application)**.
2. Enable the **Gmail, Calendar, and Drive** APIs.
3. Add the **Authorized redirect URI**:
   ```
   https://your-app.vercel.app/api/integrations/google/callback
   ```
4. In Vercel env vars, add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, then
   redeploy.
5. In the app: **Integrations → Connect Google**.

## 5. Connect WhatsApp Business (Cloud API)

1. Create a Meta app at [developers.facebook.com](https://developers.facebook.com)
   and add the **WhatsApp** product.
2. In the app: **Integrations → WhatsApp → Connect**, and paste your
   **Phone number ID** and **Access token**. Pick a **verify token**.
3. In Meta → WhatsApp → Configuration, set the **Callback URL** to:
   ```
   https://your-app.vercel.app/api/webhooks/whatsapp
   ```
   and the **Verify token** to the same value. Subscribe to the **messages** field.
4. Send a WhatsApp message to your business number — it appears in **Chat**.

## 6. Embed the chat widget on your website

In the app: **Chat Widget** → copy the snippet and paste it before `</body>`
on any site:

```html
<script src="https://your-app.vercel.app/widget.js" data-color="#cda14a" defer></script>
```

## 7. Slack notifications (optional)

**Integrations → Slack** → paste an Incoming Webhook URL
([api.slack.com/messaging/webhooks](https://api.slack.com/messaging/webhooks)).

---

## Security before launch

- **Change `AUTH_SECRET`** to a strong random value (done in step 2).
- **Replace the demo user.** Create your own account and remove/rotate
  `demo@crmchat.app`. (Reset its password via Prisma Studio or a quick seed edit.)
- Rotate any keys you may have shared during testing.
- Consider a **custom domain** in Vercel (Settings → Domains) and use it in the
  Google redirect URI and WhatsApp callback URL above.

## Notes

- Uploaded PDFs and all data live in your Postgres database, so they persist
  across deploys.
- Each `git push` to your main branch auto-deploys on Vercel.
- After any schema change, run `npx prisma db push` against the production
  `DATABASE_URL` again.
