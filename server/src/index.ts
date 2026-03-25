import cors from "cors";
import express from "express";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const network = process.env.ONECHAIN_NETWORK ?? "testnet";

const defaultConfigByNetwork = {
  mainnet: {
    rpcUrl: "https://rpc-mainnet.onelabs.cc:443",
    faucetUrl: null
  },
  devnet: {
    rpcUrl: "https://rpc-devnet.onelabs.cc:443",
    faucetUrl: "https://faucet-devnet.onelabs.cc:443"
  },
  testnet: {
    rpcUrl: "https://rpc-testnet.onelabs.cc:443",
    faucetUrl: "https://faucet-testnet.onelabs.cc:443"
  }
} as const;

const selectedNetwork =
  defaultConfigByNetwork[network as keyof typeof defaultConfigByNetwork] ??
  defaultConfigByNetwork.testnet;

app.use(cors());
app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({
    ok: true,
    service: "server",
    network
  });
});

app.get("/api/config", (_request, response) => {
  response.json({
    name: "NFT-DND on OneChain",
    status: "online",
    chain: {
      network,
      rpcUrl: process.env.ONECHAIN_RPC_URL ?? selectedNetwork.rpcUrl,
      faucetUrl: process.env.ONECHAIN_FAUCET_URL ?? selectedNetwork.faucetUrl,
      cliPackage: "one",
      contractsPath: "/contracts"
    }
  });
});

app.listen(port, () => {
  console.log(`NFT-DND server listening on http://localhost:${port}`);
});
