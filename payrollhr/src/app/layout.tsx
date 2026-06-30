import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PayrollHR — Singapore Payroll & Leave CRM",
  description: "Singapore payroll, CPF, leave and attendance management",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
