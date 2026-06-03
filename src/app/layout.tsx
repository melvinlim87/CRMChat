import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRMChat — WhatsApp CRM for your leads",
  description: "A chat-based CRM that connects WhatsApp Business and keeps all your leads in one inbox.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
