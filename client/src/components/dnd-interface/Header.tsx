import { Wallet, LogOut, ChevronDown, Map, Scroll, Settings, ChevronRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useGameState } from '@/store/useGameState';
import QuestBoard from './QuestBoard';
import { useState } from 'react';

interface HeaderProps {
    walletAddress?: string;
}

export default function Header({ walletAddress: propWallet }: HeaderProps) {
    const { playerId, walletAddress: authWallet, logout } = useAuth();
    const walletAddress = propWallet || authWallet;
    const { currentTurn } = useGameState();
    const [showQuestBoard, setShowQuestBoard] = useState(false);

    const handleLogout = () => {
        logout();
    };

    return (
        <div className="w-full h-16 bg-[#111] border-b border-amber-900/30 flex items-center justify-between px-8 shadow-[0_4px_20px_rgba(0,0,0,0.5)] z-50 relative shrink-0">
            {/* Left: Logo & Game Info */}
            <div className="flex items-center gap-10">
                <h1 className="text-2xl font-cinzel font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-amber-600 drop-shadow-[0_0_10px_rgba(245,158,11,0.3)] cursor-pointer uppercase">
                    NFT-DND
                </h1>

                {/* Navigation Menus (Moved from BottomNav) */}
                {playerId && (
                    <div className="flex items-center gap-4">
                        <DropdownMenu>
                            <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-2 text-xs font-cinzel font-bold tracking-[0.2em] uppercase text-stone-400 hover:text-amber-400 transition-colors dropdown-open:text-amber-400 outline-none group rounded-lg hover:bg-amber-900/10">
                                <Map className="w-4 h-4 group-hover:drop-shadow-[0_0_5px_rgba(245,158,11,0.5)] transition-all" /> Map <ChevronDown className="w-3 h-3 opacity-50" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-56 bg-[#0a0a0a] border border-amber-900/40 shadow-2xl backdrop-blur-xl">
                                <DropdownMenuLabel className="font-cinzel text-[10px] tracking-[0.2em] uppercase text-amber-500/70 border-b border-amber-900/20 pb-2 mb-2">World Map</DropdownMenuLabel>
                                <DropdownMenuItem className="cursor-pointer font-inter text-stone-300 hover:text-amber-300 focus:bg-amber-900/20 focus:text-amber-300 transition-colors py-2 text-sm">Global Region</DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer font-inter text-stone-300 hover:text-amber-300 focus:bg-amber-900/20 focus:text-amber-300 transition-colors py-2 text-sm">Local Dungeon</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <DropdownMenu>
                            <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-2 text-xs font-cinzel font-bold tracking-[0.2em] uppercase text-stone-400 hover:text-amber-400 transition-colors dropdown-open:text-amber-400 outline-none group rounded-lg hover:bg-amber-900/10">
                                <Scroll className="w-4 h-4 group-hover:drop-shadow-[0_0_5px_rgba(245,158,11,0.5)] transition-all" /> Lore <ChevronDown className="w-3 h-3 opacity-50" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-56 bg-[#0a0a0a] border border-amber-900/40 shadow-2xl backdrop-blur-xl">
                                <DropdownMenuLabel className="font-cinzel text-[10px] tracking-[0.2em] uppercase text-amber-500/70 border-b border-amber-900/20 pb-2 mb-2">Chronicles</DropdownMenuLabel>
                                <DropdownMenuItem className="cursor-pointer font-inter text-stone-300 hover:text-amber-300 focus:bg-amber-900/20 focus:text-amber-300 transition-colors py-2 text-sm">Quest Journal</DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer font-inter text-stone-300 hover:text-amber-300 focus:bg-amber-900/20 focus:text-amber-300 transition-colors py-2 text-sm">NPC Entries</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <button
                            onClick={() => setShowQuestBoard(true)}
                            className="flex items-center gap-2 px-3 py-2 text-xs font-cinzel font-bold tracking-[0.2em] uppercase text-amber-500 hover:text-amber-300 transition-colors outline-none group rounded-lg bg-amber-900/20 border border-amber-900/50 hover:bg-amber-900/40"
                        >
                            <Scroll className="w-4 h-4 group-hover:drop-shadow-[0_0_5px_rgba(245,158,11,0.5)] transition-all" /> Test Quest
                        </button>
                    </div>
                )}
            </div>

            {/* Right: Turn Indicator & User Menu */}
            <div className="flex items-center gap-8">
                {/* Turn Indicator */}
                <div className="flex items-center gap-3 bg-[#0a0a0a] px-4 py-2 rounded-lg border border-amber-900/30 shadow-inner">
                    <span className="text-[10px] font-cinzel font-bold uppercase tracking-[0.2em] text-stone-500">Turn:</span>
                    <span className={`text-sm font-cinzel font-bold tracking-wider capitalize ${currentTurn === 'player' ? 'text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]' :
                        currentTurn === 'enemy' ? 'text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]' :
                            currentTurn === 'ally' ? 'text-blue-400' : 'text-amber-400 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]'
                        }`}>
                        {currentTurn}
                    </span>
                </div>

                {playerId ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger className="flex items-center gap-3 bg-[#100c08] border border-amber-900/40 hover:border-amber-500/50 hover:bg-[#1a1510] rounded-xl px-4 py-2 text-sm transition-all duration-300 text-amber-50 outline-none shadow-sm group">
                            <Wallet className="w-4 h-4 text-amber-500 group-hover:drop-shadow-[0_0_8px_rgba(245,158,11,0.6)] transition-all" />
                            <span className="max-w-[120px] truncate font-inter">{playerId}</span>
                            <ChevronDown className="w-4 h-4 text-stone-500" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64 bg-[#0a0a0a] border border-amber-900/40 shadow-2xl backdrop-blur-xl p-1">
                            <DropdownMenuLabel className="text-amber-500/70 font-cinzel font-bold tracking-[0.2em] uppercase text-[10px] px-2 py-3 border-b border-amber-900/20 mb-1">My Account</DropdownMenuLabel>
                            <DropdownMenuItem className="focus:bg-amber-900/20 focus:text-amber-300 cursor-pointer font-inter text-stone-300 py-2.5 px-3 rounded-md transition-colors text-sm">
                                Profile
                            </DropdownMenuItem>
                            <div className="h-px bg-amber-900/20 my-1 mx-2" />
                            <DropdownMenuItem
                                onClick={handleLogout}
                                className="focus:bg-red-950/30 focus:text-red-400 text-red-500/80 cursor-pointer font-inter py-2.5 px-3 rounded-md transition-colors text-sm"
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Disconnect
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : (
                    <div className="text-xs font-cinzel tracking-widest text-stone-500 uppercase">Not connected</div>
                )}
            </div>

            {showQuestBoard && playerId && walletAddress && (
                <QuestBoard playerId={playerId} walletAddress={walletAddress} onClose={() => setShowQuestBoard(false)} />
            )}
        </div>
    );
}
