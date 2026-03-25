'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

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
    const [playerId, setPlayerIdState] = useState<string | null>(null);
    const [walletAddress, setWalletAddressState] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // On mount: restore from localStorage
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

    // Persist to localStorage when auth changes
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

    // Explicit logout: clear storage + state
    const logout = useCallback(() => {
        setPlayerIdState(null);
        setWalletAddressState(null);
        try {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(WALLET_KEY);
        } catch { }
    }, []);

    return (
        <AuthContext.Provider value={{ playerId, walletAddress, setAuth, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
