import { Wallet, LogOut, ChevronDown, Map, Scroll, Crown, Sparkles } from 'lucide-react';
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

const navigationMenus = [
    {
        key: 'map',
        label: 'Atlas',
        icon: Map,
        title: 'Realm Layers',
        items: ['World Surface', 'Dungeon Floor', 'Fog Routes'],
    },
    {
        key: 'lore',
        label: 'Chronicle',
        icon: Scroll,
        title: 'Story Archive',
        items: ['Quest Journal', 'NPC Records', 'Faction Rumors'],
    },
];

export default function Header({ walletAddress: propWallet }: HeaderProps) {
    const { playerId, walletAddress: authWallet, logout } = useAuth();
    const walletAddress = propWallet || authWallet;
    const { currentTurn } = useGameState();
    const [showQuestBoard, setShowQuestBoard] = useState(false);
    const shortWallet = walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : playerId;

    const handleLogout = () => {
        logout();
    };

    return (
        <div className="relative z-50 shrink-0 border-b border-white/6 bg-[linear-gradient(180deg,rgba(14,14,15,0.94)_0%,rgba(9,9,10,0.90)_100%)] px-4 py-4 shadow-[0_20px_48px_rgba(0,0,0,0.42)] backdrop-blur-2xl md:px-6">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/30 to-transparent" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(194,150,77,0.12),transparent_22%),radial-gradient(circle_at_84%_0%,rgba(148,163,184,0.08),transparent_20%)]" />
            <div className="relative z-10 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                    <div className="group relative overflow-hidden rounded-[26px] border border-amber-400/18 bg-[linear-gradient(145deg,rgba(28,24,20,0.94),rgba(11,11,12,0.96))] px-5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_36px_rgba(0,0,0,0.34)]">
                        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(214,174,96,0.12),transparent_42%,rgba(148,163,184,0.06)_100%)] opacity-80" />
                        <div className="relative flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-400/20 bg-[radial-gradient(circle_at_30%_30%,rgba(244,211,146,0.16),rgba(74,53,24,0.22)_60%,rgba(19,17,15,0.95)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_22px_rgba(0,0,0,0.26)]">
                                <Crown className="h-4 w-4 text-amber-200" />
                            </div>
                            <div className="min-w-0">
                                <div className="text-[0.58rem] font-inter font-semibold uppercase tracking-[0.34em] text-stone-500">
                                    OneChain Campaign
                                </div>
                                <h1 className="text-[1.55rem] font-cinzel font-semibold uppercase tracking-[0.16em] text-transparent bg-clip-text bg-[linear-gradient(180deg,#f7e3b0_0%,#d8ab53_55%,#8e6632_100%)]">
                                    NFT-DND
                                </h1>
                            </div>
                        </div>
                    </div>

                    {playerId && (
                        <div className="flex flex-1 flex-wrap items-center gap-2.5">
                            {navigationMenus.map((menu) => {
                                const Icon = menu.icon;

                                return (
                                    <DropdownMenu key={menu.key}>
                                        <DropdownMenuTrigger className="group flex h-11 items-center gap-2.5 rounded-2xl border border-white/6 bg-[linear-gradient(180deg,rgba(18,18,20,0.92),rgba(13,13,14,0.9))] px-4 text-[0.68rem] font-inter font-semibold uppercase tracking-[0.24em] text-stone-300/85 transition-all hover:-translate-y-0.5 hover:border-amber-400/24 hover:bg-[linear-gradient(180deg,rgba(31,26,20,0.96),rgba(16,14,13,0.92))] hover:text-amber-100 outline-none">
                                            <Icon className="h-4 w-4 text-stone-400 transition-colors group-hover:text-amber-300" />
                                            <span>{menu.label}</span>
                                            <ChevronDown className="h-3.5 w-3.5 text-stone-500 transition-transform group-data-[state=open]:rotate-180" />
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start" className="w-60 rounded-2xl border border-white/8 bg-[#0d0d0e]/96 p-2 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
                                            <DropdownMenuLabel className="border-b border-white/6 px-2 py-2 font-cinzel text-[0.62rem] uppercase tracking-[0.28em] text-amber-300/78">
                                                {menu.title}
                                            </DropdownMenuLabel>
                                            {menu.items.map((item) => (
                                                <DropdownMenuItem
                                                    key={item}
                                                    className="mt-1 cursor-pointer rounded-xl px-3 py-2.5 font-inter text-[0.8rem] text-stone-300 transition-colors hover:text-amber-100 focus:bg-white/[0.04] focus:text-amber-100"
                                                >
                                                    {item}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                );
                            })}

                            <button
                                onClick={() => setShowQuestBoard(true)}
                                className="group flex h-11 items-center gap-2.5 rounded-2xl border border-amber-400/25 bg-[linear-gradient(180deg,rgba(77,53,23,0.55),rgba(31,24,17,0.96))] px-4 text-[0.68rem] font-inter font-semibold uppercase tracking-[0.24em] text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_12px_26px_rgba(0,0,0,0.28)] transition-all hover:-translate-y-0.5 hover:border-amber-300/45 hover:shadow-[0_18px_36px_rgba(0,0,0,0.34)]"
                            >
                                <Sparkles className="h-4 w-4 text-amber-300 transition-transform group-hover:scale-110" />
                                <span>Quest Board</span>
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-3 xl:justify-end">
                    <div className="flex min-w-[168px] items-center gap-3 rounded-[22px] border border-white/6 bg-[linear-gradient(180deg,rgba(17,18,19,0.95),rgba(11,12,13,0.92))] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_12px_28px_rgba(0,0,0,0.28)]">
                        <div className={`h-2.5 w-2.5 rounded-full ${currentTurn === 'player' ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)]' :
                            currentTurn === 'enemy' ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.7)]' :
                                currentTurn === 'ally' ? 'bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.7)]' :
                                    'bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.7)]'
                            }`} />
                        <div className="min-w-0">
                            <div className="text-[0.58rem] font-inter font-semibold uppercase tracking-[0.32em] text-stone-500">
                                Turn State
                            </div>
                            <div className="mt-1 text-[0.92rem] font-cinzel font-semibold uppercase tracking-[0.18em] text-stone-100">
                                {currentTurn}
                            </div>
                        </div>
                    </div>

                    {playerId ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger className="group flex min-w-[220px] items-center gap-3 rounded-[22px] border border-white/7 bg-[linear-gradient(180deg,rgba(21,21,23,0.96),rgba(14,14,16,0.92))] px-4 py-3 text-sm text-amber-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_12px_28px_rgba(0,0,0,0.28)] outline-none transition-all hover:-translate-y-0.5 hover:border-amber-400/24">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-400/16 bg-[linear-gradient(180deg,rgba(59,46,27,0.46),rgba(20,19,17,0.92))]">
                                    <Wallet className="h-4 w-4 text-amber-300" />
                                </div>
                                <div className="min-w-0 flex-1 text-left">
                                    <div className="text-[0.58rem] font-inter font-semibold uppercase tracking-[0.3em] text-stone-500">
                                        Bound Wallet
                                    </div>
                                    <div className="mt-1 truncate text-[0.92rem] font-medium text-stone-100">
                                        {shortWallet}
                                    </div>
                                </div>
                                <ChevronDown className="h-4 w-4 text-stone-500 transition-transform group-data-[state=open]:rotate-180" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-72 rounded-2xl border border-white/8 bg-[#0e0e10]/96 p-2 shadow-[0_26px_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
                                <DropdownMenuLabel className="border-b border-white/6 px-2 py-2.5 font-cinzel text-[0.62rem] uppercase tracking-[0.28em] text-amber-300/78">
                                    Account Relay
                                </DropdownMenuLabel>
                                <div className="mt-2 rounded-2xl border border-white/6 bg-white/[0.025] px-3 py-3">
                                    <div className="text-[0.58rem] font-inter font-semibold uppercase tracking-[0.28em] text-stone-500">
                                        Full Wallet Address
                                    </div>
                                    <div className="mt-2 break-all text-[0.82rem] leading-relaxed text-stone-200">
                                        {walletAddress || playerId}
                                    </div>
                                </div>
                                <DropdownMenuItem className="mt-2 cursor-pointer rounded-xl px-3 py-2.5 font-inter text-[0.82rem] text-stone-300 transition-colors hover:text-amber-100 focus:bg-white/[0.04] focus:text-amber-100">
                                    Profile
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="my-1 bg-white/6" />
                                <DropdownMenuItem
                                    onClick={handleLogout}
                                    className="cursor-pointer rounded-xl px-3 py-2.5 font-inter text-[0.82rem] text-red-400/88 transition-colors focus:bg-red-950/25 focus:text-red-300"
                                >
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Disconnect
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <div className="rounded-[22px] border border-white/6 bg-[linear-gradient(180deg,rgba(17,18,19,0.95),rgba(11,12,13,0.92))] px-4 py-3 text-[0.68rem] font-inter font-semibold uppercase tracking-[0.28em] text-stone-500">
                            Not connected
                        </div>
                    )}
                </div>
            </div>

            {showQuestBoard && playerId && walletAddress && (
                <QuestBoard playerId={playerId} walletAddress={walletAddress} onClose={() => setShowQuestBoard(false)} />
            )}
        </div>
    );
}
