'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useCurrentAccount, useCurrentWallet, useDisconnectWallet } from '@onelabs/dapp-kit';
import { SERVER_URL } from '@/lib/config';
import { useGameState } from '@/store/useGameState';

interface AuthContextType {
    playerId: string | null;
    walletAddress: string | null;
    setAuth: (playerId: string | null, walletAddress: string | null) => void;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    playerId: null,
    walletAddress: null,
    setAuth: () => { },
    logout: () => { },
    isLoading: true,
});

const STORAGE_KEY = 'nft-dnd-player-id';
const WALLET_KEY = 'nft-dnd-wallet-address';

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const account = useCurrentAccount();
    const { currentWallet } = useCurrentWallet();
    const { mutate: disconnectWallet } = useDisconnectWallet();
    const [playerId, setPlayerIdState] = useState<string | null>(null);
    const [walletAddress, setWalletAddressState] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const lastSessionKeyRef = useRef<string | null>(null);

    useEffect(() => {
        try {
            const storedId = localStorage.getItem(STORAGE_KEY);
            const storedWallet = localStorage.getItem(WALLET_KEY);
            if (storedId) setPlayerIdState(storedId);
            if (storedWallet) setWalletAddressState(storedWallet);
        } catch {
            // localStorage unavailable (SSR, etc.)
        }
        setIsLoading(false);
    }, []);

    const setAuth = useCallback((id: string | null, wallet: string | null) => {
        setPlayerIdState(id);
        setWalletAddressState(wallet);
        try {
            if (id) localStorage.setItem(STORAGE_KEY, id);
            else localStorage.removeItem(STORAGE_KEY);

            if (wallet) localStorage.setItem(WALLET_KEY, wallet);
            else localStorage.removeItem(WALLET_KEY);
        } catch { }
    }, []);

    const logout = useCallback(() => {
        setAuth(null, null);
        disconnectWallet(undefined, {
            onError: (error) => {
                console.error('Wallet disconnect failed.', error);
            },
        });
    }, [disconnectWallet, setAuth]);

    useEffect(() => {
        let cancelled = false;

        if (isLoading) {
            return;
        }

        if (!account || !currentWallet) {
            setAuth(null, null);
            return;
        }

        const syncWalletSession = async () => {
            try {
                const response = await fetch(`${SERVER_URL}/api/auth/wallet`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        publicKey: account.address,
                        walletName: currentWallet.name || 'OneWallet',
                    }),
                });

                if (!response.ok) {
                    throw new Error('Failed to sync wallet session with the server.');
                }

                const { player } = await response.json();

                if (!cancelled) {
                    setAuth(player.id, account.address);
                }
            } catch (error) {
                console.error('Wallet auth sync failed.', error);
                if (!cancelled) {
                    setAuth(null, account.address);
                }
            }
        };

        void syncWalletSession();

        return () => {
            cancelled = true;
        };
    }, [account, currentWallet, isLoading, setAuth]);

    useEffect(() => {
        if (isLoading) return;
        const currentSessionKey = `${playerId || 'anonymous'}::${walletAddress || 'no-wallet'}`;
        if (lastSessionKeyRef.current === null) {
            lastSessionKeyRef.current = currentSessionKey;
            return;
        }
        if (lastSessionKeyRef.current !== currentSessionKey) {
            useGameState.getState().resetForAuthSession();
            lastSessionKeyRef.current = currentSessionKey;
        }
    }, [isLoading, playerId, walletAddress]);

    return (
        <AuthContext.Provider value={{ playerId, walletAddress, setAuth, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
