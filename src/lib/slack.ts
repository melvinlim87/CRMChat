// Posts notifications to a Slack Incoming Webhook, if configured.
// Setup: https://api.slack.com/messaging/webhooks
import { prisma } from "./prisma";

export async function notifySlack(text: string): Promise<void> {
  const row = await prisma.integration.findUnique({ where: { provider: "slack" } }).catch(() => null);
  const url = (row?.config as { webhookUrl?: string } | null)?.webhookUrl;
  if (!url || row?.status !== "connected") return;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  }).catch(() => {});
}
