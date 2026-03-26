import type { Metadata } from "next";
import { Cinzel, Manrope } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { OnechainProviders } from "@/components/OnechainProviders";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const manrope = Manrope({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "NFT-DND — Forge Your Legacy",
  description: "An elite procedural fantasy RPG governed by an AI Game Master, connected through OneWallet on OneChain testnet.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${cinzel.variable} ${manrope.variable} antialiased`}
      >
        <OnechainProviders>
          <AuthProvider>
            {children}
          </AuthProvider>
        </OnechainProviders>
      </body>
    </html>
  );
}
