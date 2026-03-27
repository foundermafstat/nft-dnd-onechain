'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@onelabs/dapp-kit';
import '@onelabs/dapp-kit/dist/index.css';

const ONECHAIN_TESTNET_RPC_URL =
    process.env.NEXT_PUBLIC_ONECHAIN_RPC_URL || 'https://rpc-testnet.onelabs.cc:443';

const { networkConfig } = createNetworkConfig({
    testnet: {
        url: ONECHAIN_TESTNET_RPC_URL,
    },
});

export function OnechainProviders({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient());

    return (
        <QueryClientProvider client={queryClient}>
            <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
                <WalletProvider>
                    {children}
                </WalletProvider>
            </SuiClientProvider>
        </QueryClientProvider>
    );
}
