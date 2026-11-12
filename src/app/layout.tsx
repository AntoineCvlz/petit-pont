import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: { default: "Petit Pont", template: "%s · Petit Pont" },
  description: "Petit Pont — le jeu de collection de cartes de football entre joueurs.",
};

export const viewport: Viewport = {
  themeColor: "#0a120e",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${barlow.variable} ${barlowCondensed.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
