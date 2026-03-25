export type ChainConfig = {
  network: string;
  rpcUrl: string;
  faucetUrl: string | null;
  cliPackage: string;
  contractsPath: string;
};

export type ApiResponse = {
  name: string;
  status: string;
  chain: ChainConfig;
};

const FALLBACK_API_BASE_URL = "http://localhost:4000";

export async function getProjectStatus(): Promise<ApiResponse> {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? FALLBACK_API_BASE_URL;
  const response = await fetch(`${baseUrl}/api/config`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Unable to fetch backend configuration.");
  }

  return response.json();
}
