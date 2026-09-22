import type { Metadata } from "next";
import { Providers } from "../components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "PadelApp — γραμματεία",
  description: "Desk του club. Τα δεδομένα μένουν στην εγκατάσταση του πελάτη.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="el">
      <body className="min-h-screen font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
