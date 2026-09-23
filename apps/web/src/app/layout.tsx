import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import { Providers } from "../components/Providers";
import "./globals.css";

const sans = Source_Sans_3({
  subsets: ["latin", "latin-ext", "greek"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "PadelApp — γραμματεία",
  description: "Desk του club. Γραμματεία στο browser, δεδομένα στην πλατφόρμα PadelApp.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="el">
      <body className={`${sans.variable} min-h-screen font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
