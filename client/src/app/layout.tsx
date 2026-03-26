import type { Metadata } from "next";
import { Cinzel, Manrope } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { OnechainProviders } from "@/components/OnechainProviders";
import GlobalNavbar from "@/components/GlobalNavbar";

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
        className={`${cinzel.variable} ${manrope.variable} h-screen overflow-hidden antialiased`}
      >
        <OnechainProviders>
          <AuthProvider>
            <div className="flex h-full flex-col">
              <GlobalNavbar />
              <div className="min-h-0 flex-1">
                {children}
              </div>
            </div>
          </AuthProvider>
        </OnechainProviders>
      </body>
    </html>
  );
}
