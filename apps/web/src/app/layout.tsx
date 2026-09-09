import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PadelApp ρεσεψιόν",
  description: "Ρυθμίσεις club — εσωτερική υλοποίηση",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="el">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
