import type { Metadata } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import { I18nProvider } from "@/lib/i18n/I18nContext";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const logoFont = Cormorant_Garamond({
  variable: "--font-logo",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: "VisuAlpes — Signalétique Haut de Gamme",
  description: "Plateforme atelier & espace client VisuAlpes",
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} ${logoFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-[#0E0E0E] text-[#F7F5EF]">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
