'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, LogOut, ScrollText, Shield, Store, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const links = [
  { href: '/game', label: 'Game', icon: Compass },
  { href: '/marketplace', label: 'Marketplace', icon: Store },
  { href: '/quests', label: 'Chronicle', icon: ScrollText },
  { href: '/create', label: 'Forge', icon: Shield },
];

export default function GlobalNavbar() {
  const pathname = usePathname();
  const { playerId, walletAddress, isLoading, logout } = useAuth();

  if (isLoading || !playerId) {
    return null;
  }

  const shortWallet = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : playerId;

  return (
    <header className="relative z-50 shrink-0 border-b border-white/7 bg-[linear-gradient(180deg,rgba(13,13,15,0.96),rgba(8,8,10,0.92))] p-2 backdrop-blur-2xl md:px-4">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />
      <div className="mx-auto flex items-center justify-between gap-3">
        <Link
          href="/game"
          className="inline-flex items-center rounded-xl border border-amber-400/18 bg-[linear-gradient(145deg,rgba(28,24,20,0.94),rgba(11,11,12,0.96))] px-3 py-1.5"
        >
          <span className="font-cinzel text-[0.82rem] uppercase tracking-[0.14em] text-transparent bg-clip-text bg-[linear-gradient(180deg,#f7e3b0_0%,#d8ab53_55%,#8e6632_100%)]">
            NFT-DND
          </span>
        </Link>

        <nav className="flex flex-1 items-center justify-center gap-1.5 overflow-x-auto px-1">
          {links.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[0.62rem] font-semibold uppercase tracking-[0.16em] transition-colors',
                  isActive
                    ? 'border-amber-400/30 bg-amber-400/[0.08] text-amber-100'
                    : 'border-white/8 bg-white/[0.02] text-stone-300 hover:border-white/20 hover:text-amber-100'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            );
          })}
        </nav>

        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex h-8 min-w-[150px] items-center gap-2 rounded-lg border border-white/8 bg-white/[0.02] px-2.5 text-left text-[0.68rem] text-stone-200 transition-colors hover:border-amber-400/25">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-amber-400/16 bg-[linear-gradient(180deg,rgba(59,46,27,0.46),rgba(20,19,17,0.92))]">
              <Wallet className="h-3.5 w-3.5 text-amber-300" />
            </span>
            <span className="truncate">{shortWallet}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 rounded-xl border border-white/10 bg-[#0e0e10]/96 p-1.5 backdrop-blur-2xl">
            <DropdownMenuLabel className="text-[0.62rem] uppercase tracking-[0.2em] text-stone-500">
              Wallet Session
            </DropdownMenuLabel>
            <div className="rounded-lg border border-white/7 bg-white/[0.02] px-2.5 py-2 text-[0.74rem] text-stone-300">
              {walletAddress || playerId}
            </div>
            <DropdownMenuSeparator className="my-1 bg-white/8" />
            <DropdownMenuItem
              onClick={logout}
              className="cursor-pointer rounded-md text-[0.72rem] text-red-300 focus:bg-red-950/25 focus:text-red-200"
            >
              <LogOut className="mr-2 h-3.5 w-3.5" />
              Disconnect
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
