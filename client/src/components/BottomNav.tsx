'use client';

import { Backpack, Map, Scroll, Settings, Swords, LogOut, Wallet, ChevronUp } from "lucide-react";
import { useState } from "react";
import FreighterAuthButton from "./OneWalletAuthButton";
import { useAuth } from "@/context/AuthContext";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function BottomNav() {
	const { playerId, walletAddress, setAuth, logout } = useAuth();
	const [activeTab, setActiveTab] = useState<string | null>(null);

	const toggleTab = (tab: string) => {
		if (!playerId) return;
		setActiveTab(activeTab === tab ? null : tab);
	};

	const handleLogout = () => {
		logout();
		setActiveTab(null);
	};

	const tabs = [
		{ id: 'combat', icon: Swords, label: 'Combat' },
		{ id: 'inventory', icon: Backpack, label: 'Inv' },
		{ id: 'map', icon: Map, label: 'Map' },
		{ id: 'lore', icon: Scroll, label: 'Lore' },
		{ id: 'settings', icon: Settings, label: 'Options' },
	];

	return (
		<div className="relative w-full z-50">
			{/* The Overlay Content Area that slides up FROM the nav */}
			<div
				className={`absolute bottom-full left-0 right-0 bg-background/95 border-t border-border backdrop-blur-md transition-all duration-300 ease-in-out text-foreground shadow-2xl ${activeTab ? 'h-[60vh] opacity-100 p-6' : 'h-0 opacity-0 overflow-hidden pt-0 pb-0'
					}`}
			>
				<div className="max-w-7xl mx-auto h-full flex flex-col">
					{activeTab === 'inventory' && <h2 className="text-2xl font-bold font-serif text-foreground mb-4">Inventory</h2>}
					{activeTab === 'combat' && <h2 className="text-2xl font-bold font-serif text-foreground mb-4">Combat Log</h2>}
					{activeTab === 'map' && <h2 className="text-2xl font-bold font-serif text-foreground mb-4">World Map</h2>}
					{activeTab === 'lore' && <h2 className="text-2xl font-bold font-serif text-foreground mb-4">Lore Journal</h2>}
					{activeTab === 'settings' && <h2 className="text-2xl font-bold font-serif text-foreground mb-4">Game Settings</h2>}

					<p className="text-muted-foreground font-serif">Content for {activeTab} goes here. This overlay covers the real-time canvas beneath it without stopping the background loop.</p>
				</div>
			</div>

			{/* The Bottom Navigation Bar (Fixed bottom, full width) */}
			<div className="w-full bg-card border-t border-border h-20 flex items-center px-6 shadow-2xl relative">

				{/* Center Tabs */}
				<div className="absolute left-1/2 -translate-x-1/2 flex gap-8 items-center h-full">
					{tabs.map((Tab) => {
						const isActive = activeTab === Tab.id;
						const isDisabled = !playerId;
						return (
							<button
								key={Tab.id}
								onClick={() => toggleTab(Tab.id)}
								disabled={isDisabled}
								className={`flex flex-col items-center gap-1 transition-all duration-200 mt-2 h-full justify-center ${isDisabled ? 'text-muted cursor-not-allowed hidden' :
									isActive
										? 'text-primary -translate-y-1'
										: 'text-muted-foreground hover:text-primary hover:-translate-y-1'
									}`}
							>
								<Tab.icon className={`w-6 h-6 ${isActive ? 'drop-shadow-md' : ''}`} />
								<span className="text-[10px] uppercase font-bold tracking-widest">{Tab.label}</span>
							</button>
						);
					})}
				</div>

				{/* Right side: Wallet connect or User Menu */}
				<div className="ml-auto w-1/3 flex justify-end items-center h-full z-10">
					{!playerId ? (
						<FreighterAuthButton onAuthenticated={(id, wallet) => setAuth(id, wallet)} />
					) : (
						<DropdownMenu>
							<DropdownMenuTrigger className="flex items-center gap-2 bg-muted border border-border hover:bg-accent hover:text-accent-foreground rounded-lg px-4 py-2 font-serif text-sm transition-colors text-foreground outline-none">
								<Wallet className="w-4 h-4 text-primary" />
								<span className="max-w-[100px] truncate">{walletAddress || playerId}</span>
								<ChevronUp className="w-4 h-4 text-muted-foreground" />
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" sideOffset={12} className="w-56 bg-popover border-border text-popover-foreground">
								<DropdownMenuLabel className="text-muted-foreground font-serif tracking-widest uppercase text-xs">My Account</DropdownMenuLabel>
								<DropdownMenuSeparator className="bg-border" />
								<DropdownMenuItem className="focus:bg-accent focus:text-accent-foreground cursor-pointer font-sans">
									Profile
								</DropdownMenuItem>
								<DropdownMenuItem className="focus:bg-accent focus:text-accent-foreground cursor-pointer font-sans">
									Copy Wallet Address
								</DropdownMenuItem>
								<DropdownMenuSeparator className="bg-border" />
								<DropdownMenuItem
									onClick={handleLogout}
									className="focus:bg-destructive/20 focus:text-destructive text-destructive cursor-pointer font-sans"
								>
									<LogOut className="w-4 h-4 mr-2" />
									Disconnect
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					)}
				</div>

			</div>
		</div>
	);
}
