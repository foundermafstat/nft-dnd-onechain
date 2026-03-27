'use client';

import { useEffect } from 'react';
import { LogIn } from 'lucide-react';
import { ConnectModal, useCurrentAccount, useCurrentWallet } from '@onelabs/dapp-kit';
import { useAuth } from '@/context/AuthContext';

interface AuthButtonProps {
    onAuthenticated: (playerId: string, walletAddress: string) => void;
    variant?: 'default' | 'hero' | 'footer';
}

export default function OneWalletAuthButton({ onAuthenticated, variant = 'default' }: AuthButtonProps) {
    const account = useCurrentAccount();
    const { currentWallet } = useCurrentWallet();
    const { playerId, walletAddress, isLoading } = useAuth();
    const helperText = account && currentWallet
        ? `${currentWallet.name} connected on ${account.chains?.[0] || 'testnet'}.`
        : 'Connect through the OneWallet browser extension on OneChain testnet.';

    useEffect(() => {
        if (playerId && walletAddress) {
            onAuthenticated(playerId, walletAddress);
        }
    }, [onAuthenticated, playerId, walletAddress]);

    if (variant === 'hero' || variant === 'footer') {
        return (
            <div className="flex flex-col items-center w-full">
                <ConnectModal
                    trigger={
                        <button
                            type="button"
                            className="group relative w-full inline-flex items-center justify-center gap-3 px-8 py-4 bg-[#0a0a0a] text-amber-50 font-cinzel font-bold tracking-[0.2em] uppercase rounded-full overflow-hidden transition-all duration-500 hover:scale-105 active:scale-95 disabled:opacity-70 disabled:hover:scale-100 shadow-[0_0_30px_rgba(0,0,0,0.8)] hover:shadow-[0_0_50px_rgba(245,158,11,0.4)] border border-amber-900/30 hover:border-amber-500/50"
                            disabled={isLoading}
                        >
                            <span className="relative z-20 flex items-center gap-3 text-amber-100/80 group-hover:text-amber-300 transition-colors duration-500 drop-shadow-md">
                                <LogIn className={`w-5 h-5 ${isLoading ? 'animate-pulse text-amber-500' : 'group-hover:translate-x-1 group-hover:text-amber-400 transition-all duration-500'}`} />
                                {isLoading ? 'SYNCING HERO...' : account ? 'ONEWALLET CONNECTED' : 'CONNECT ONEWALLET'}
                            </span>
                        </button>
                    }
                />
            </div>
        );
    }

    return (
        <div className="flex items-center gap-4">
            <ConnectModal
                trigger={
                    <button
                        type="button"
                        disabled={isLoading}
                        className="bg-[#0a0a0a] hover:bg-[#120e0a] text-amber-100/90 font-cinzel font-bold uppercase tracking-[0.15em] rounded-full shadow-lg hover:shadow-[0_0_20px_rgba(245,158,11,0.2)] border border-amber-900/30 hover:border-amber-500/40 transition-all duration-500 flex items-center gap-2 group relative overflow-hidden px-4 py-2"
                    >
                        <span className="relative z-10 inline-flex items-center gap-2">
                            <LogIn className="w-4 h-4 group-hover:text-amber-400 transition-colors duration-300" />
                            <span>{isLoading ? 'SYNCING...' : account ? 'CONNECTED' : 'CONNECT ONEWALLET'}</span>
                        </span>
                    </button>
                }
            />
            <span className="text-stone-500 text-xs font-inter max-w-xs">{helperText}</span>
        </div>
    );
}
