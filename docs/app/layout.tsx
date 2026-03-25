import { Footer, Layout, Navbar } from "nextra-theme-docs";
import { getPageMap } from "nextra/page-map";
import type { Metadata } from "next";
import "nextra-theme-docs/style.css";
import "../styles.css";

export const metadata: Metadata = {
  title: "NFT-DND Docs",
  description:
    "Documentation for the NFT-DND concept, translated to English and adapted to OneChain."
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pageMap = await getPageMap();

  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body>
        <Layout
          navbar={<Navbar logo="NFT-DND on OneChain" />}
          pageMap={pageMap}
          docsRepositoryBase="https://github.com/one-chain-labs/onechain"
          footer={<Footer>Translated project docs and OneChain migration notes.</Footer>}
        >
          {children}
        </Layout>
      </body>
    </html>
  );
}
