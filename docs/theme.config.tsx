import React from "react";

const config = {
  logo: <span>NFT-DND on OneChain</span>,
  project: {
    link: "https://github.com/one-chain-labs/onechain"
  },
  docsRepositoryBase:
    "https://github.com/one-chain-labs/onechain/tree/main/docs",
  footer: {
    text: "NFT-DND documentation migrated to English and aligned with OneChain."
  },
  useNextSeoProps() {
    return {
      titleTemplate: "%s | NFT-DND Docs"
    };
  }
};

export default config;
