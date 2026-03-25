'use client';

import { useState } from 'react';
import { LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SERVER_URL } from '@/lib/config';


interface AuthButtonProps {
    onAuthenticated: (playerId: string, walletAddress: string) => void;
    variant?: 'default' | 'hero' | 'footer';
}

export default function FreighterAuthButton({ onAuthenticated, variant = 'default' }: AuthButtonProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleConnect = async () => {
        setLoading(true);
        setError(null);

        try {
            const pubKey =
                window.prompt('Enter your OneChain wallet address to continue:')?.trim() || '';
            if (!pubKey) throw new Error('A wallet address is required to continue.');

            const response = await fetch(`${SERVER_URL}/api/auth/wallet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ publicKey: pubKey })
            });

            if (!response.ok) {
                throw new Error('Failed to save player session');
            }

            const { player } = await response.json();

            onAuthenticated(player.id, pubKey);

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Error connecting to Wallet');
        } finally {
            setLoading(false);
        }
    };

    if (variant === 'hero' || variant === 'footer') {
        return (
            <div className="flex flex-col items-center w-full">
                {error && <span className="text-red-400 text-sm font-inter font-medium mb-3 absolute -top-8 w-full text-center">{error}</span>}
                <button
                    onClick={handleConnect}
                    disabled={loading}
                    className="group relative w-full inline-flex items-center justify-center gap-3 px-8 py-4 bg-[#0a0a0a] text-amber-50 font-cinzel font-bold tracking-[0.2em] uppercase rounded-full overflow-hidden transition-all duration-500 hover:scale-105 active:scale-95 disabled:opacity-70 disabled:hover:scale-100 shadow-[0_0_30px_rgba(0,0,0,0.8)] hover:shadow-[0_0_50px_rgba(245,158,11,0.4)] border border-amber-900/30 hover:border-amber-500/50"
                >
                    {/* Magical Ambient Inner Glow */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--color-amber-500)_0%,_transparent_70%)] opacity-0 group-hover:opacity-20 transition-opacity duration-700 mix-blend-screen"></div>

                    {/* Animated glowing gradient background that spins */}
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-300/20 via-amber-500/40 to-amber-700/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-slow-pan"></div>

                    {/* Dark inner layer that shrinks slightly on hover for the border effect */}
                    <div className="absolute inset-[1px] bg-[#0d0a08] rounded-full transition-all duration-500 group-hover:bg-[#120e0a] z-0"></div>

                    {/* Subtle Golden Inner Ring */}
                    <div className="absolute inset-[3px] border border-amber-500/10 rounded-full z-10 pointer-events-none group-hover:border-amber-400/30 transition-colors duration-500"></div>

                    {/* Text and Icon on top */}
                    <span className="relative z-20 flex items-center gap-3 text-amber-100/80 group-hover:text-amber-300 transition-colors duration-500 drop-shadow-md">
                        <LogIn className={`w-5 h-5 ${loading ? 'animate-pulse text-amber-500' : 'group-hover:translate-x-1 group-hover:text-amber-400 transition-all duration-500'}`} />
                        {loading ? 'OPENING GATE...' : 'CONNECT WALLET'}
                    </span>

                    {/* Glossy overlay reflection */}
                    <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-t-full pointer-events-none z-10"></div>
                </button>
            </div>
        )
    }

    return (
        <div className="flex items-center gap-4">
            {error && <span className="text-red-400 text-xs font-inter font-medium max-w-xs">{error}</span>}
            <Button
                onClick={handleConnect}
                disabled={loading}
                className="bg-[#0a0a0a] hover:bg-[#120e0a] text-amber-100/90 font-cinzel font-bold uppercase tracking-[0.15em] rounded-full shadow-lg hover:shadow-[0_0_20px_rgba(245,158,11,0.2)] border border-amber-900/30 hover:border-amber-500/40 transition-all duration-500 flex items-center gap-2 group relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 -translate-x-full group-hover:animate-[shimmer_2s_infinite]"></div>
                <LogIn className="w-4 h-4 relative z-10 group-hover:text-amber-400 transition-colors duration-300" />
                <span className="relative z-10">{loading ? 'CONNECTING...' : 'CONNECT'}</span>
            </Button>
        </div>
    );
}
