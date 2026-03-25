import { useState, useRef, useEffect } from 'react';
import { useGameState, ChatMessage } from '@/store/useGameState';
import { useDroppable } from '@dnd-kit/core';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Backpack, Users, Send, User, Sparkles, Dices, ShieldAlert, CheckCircle2, X } from 'lucide-react';
import DraggableItem from './DraggableItem';
import { DiceType } from '@/components/DiceOverlay';
import { SERVER_URL } from '@/lib/config';
import { endGame } from '@/lib/OneChain';
import { useAuth } from '@/context/AuthContext';

interface InteractionPanelProps {
	triggerRoll: (type: DiceType) => void;
}

export default function InteractionPanel({ triggerRoll }: InteractionPanelProps) {
	const {
		chatMessages,
		addMessage,
		currentTurn,
		setTurn,
		activeNpc,
		setActiveNpc,
		entities,
		testQuestState,
		setTestQuestState,
		testQuestSessionId
	} = useGameState();
	const { playerId, walletAddress } = useAuth();
	const [inputText, setInputText] = useState('');
	const [isSendingDialog, setIsSendingDialog] = useState(false);
	const [isEndingQuest, setIsEndingQuest] = useState(false);
	const [hasRolled, setHasRolled] = useState(false);
	const [activeMenu, setActiveMenu] = useState<'inventory' | 'party' | 'playerInfo' | 'skills' | 'dice' | null>(null);
	const scrollRef = useRef<HTMLDivElement>(null);

	// Chat is a dropzone for using items from inventory
	const { setNodeRef: setChatDropRef, isOver: isChatOver } = useDroppable({
		id: 'chat-dropzone',
		data: { type: 'chat' }
	});

	// Auto-scroll chat to bottom
	const scrollToBottom = () => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	};

	useEffect(() => {
		// Handle immediate DOM mutations and layout changes
		const viewport = scrollRef.current;
		if (!viewport) return;

		const { scrollTop, scrollHeight, clientHeight } = viewport;
		// If user is near bottom, or opened a menu, scroll down. 
		const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;

		if (isNearBottom || activeMenu !== null) {
			// Use requestAnimationFrame to let browser paint and calculate new flex sizes
			requestAnimationFrame(() => {
				scrollToBottom();
				setTimeout(scrollToBottom, 50);
				setTimeout(scrollToBottom, 350); // After duration-300 animation
			});
		}
	}, [chatMessages, activeMenu]);

	const handleSend = async () => {
		if (!inputText.trim() || isSendingDialog) return;

		const textToRoute = inputText;
		setInputText('');

		if (activeNpc) {
			// NPC Conversation Mode
			addMessage({ sender: 'Player', senderType: 'player', content: textToRoute });

			// Hackathon Test Quest Progression 
			if (activeNpc.name === 'Game Master' && testQuestState === 'started') {
				setTestQuestState('npc_dialog');
				addMessage({
					sender: 'Game Master',
					senderType: 'dm',
					content: 'Excellent. Your path is clear. Proceed into the wilds and prove your strength against the Goblin! After your victory, claim your prize.',
					flavorText: 'He nods approvingly, vanishing into the shadows.'
				});
				setActiveNpc(null);
				return;
			}

			setIsSendingDialog(true);
			try {
				// Filter chat log to just the conversation history (approx 10 messages for context)
				const history = chatMessages.slice(-10).map(m => ({
					role: m.senderType === 'player' ? 'user' : 'assistant',
					content: m.content
				}));
				// Append the brand new message
				history.push({ role: 'user', content: textToRoute });

				const res = await fetch(`${SERVER_URL}/api/npc/${activeNpc.id}/dialog`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ message: textToRoute, history })
				});
				const data = await res.json();

				if (data.success && data.response) {
					addMessage({ sender: activeNpc.name, senderType: 'dm', content: data.response });
				} else {
					addMessage({ sender: activeNpc.name, senderType: 'system', content: `*${activeNpc.name} stares silently.*` });
				}
			} catch (err) {
				addMessage({ sender: 'System', senderType: 'system', content: `*${activeNpc.name} turns away.*` });
			} finally {
				setIsSendingDialog(false);
			}
		} else {
			// Normal Chat / DM Command mode
			addMessage({ sender: 'Player', senderType: 'player', content: textToRoute });
		}
	};

	const handleNameClick = (msg: ChatMessage) => {
		if (msg.senderType === 'dm' || msg.senderType === 'enemy') {
			const npcEntity = entities.find(e => e.name === msg.sender);
			if (npcEntity) {
				setActiveNpc({ id: npcEntity.id, name: npcEntity.name });
			} else {
				// If they spoke as a DM/Enemy but aren't currently an active entity on map, just address them by name
				setActiveNpc({ id: msg.sender, name: msg.sender });
			}
		}
	};

	// Trigger generic dice roll
	const handleDiceRollLocal = (sides: number) => {
		setHasRolled(true);
		triggerRoll(`d${sides}` as any);
	};

	// Trigger Hackathon Test Quest ZK Simulation
	const handleZkLootRoll = () => {
		if (testQuestState !== 'combat') {
			addMessage({ sender: 'System', senderType: 'system', content: 'You must defeat the Goblin first.' });
			return;
		}

		triggerRoll('ZK_LOOT');
	};

	const handleEndQuest = async () => {
		if (!walletAddress || !testQuestSessionId) return;
		setIsEndingQuest(true);
		try {
			const res = await endGame(walletAddress, testQuestSessionId);
			if (res.success) {
				setTestQuestState('not_started');
				addMessage({
					sender: 'System',
					senderType: 'system',
					content: `Quest Finalized! Session Reference: ${res.hash?.substring(0, 10)}...`
				});
			} else {
				addMessage({ sender: 'System', senderType: 'system', content: `End Game Error: ${res.error}` });
			}
		} catch (err: any) {
			addMessage({ sender: 'System', senderType: 'system', content: `Error: ${err.message}` });
		} finally {
			setIsEndingQuest(false);
		}
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') handleSend();
	};

	return (
		<div className="flex flex-col h-full w-full bg-[#050505] relative">

			{/* 1. Chat History (Scrollable, takes up remaining space) */}
			<div
				ref={setChatDropRef}
				className={`flex-1 overflow-hidden flex flex-col relative transition-colors duration-500 ${isChatOver ? 'bg-amber-900/10 ring-1 ring-inset ring-amber-500/40 shadow-[inset_0_0_50px_rgba(245,158,11,0.1)]' : ''}`}
			>
				<div className="px-5 py-3 text-[10px] uppercase tracking-[0.3em] font-cinzel text-amber-600/60 font-bold border-b border-amber-900/30 bg-[#0a0a0a] shrink-0 sticky top-0 z-10 shadow-sm flex items-center justify-between">
					<span>Adventure Log</span>
					{isChatOver && <span className="text-amber-400 animate-pulse">Drop to Use</span>}
				</div>

				<ScrollArea viewportRef={scrollRef} className="flex-1 min-h-0 bg-[#1c1c1c]">
					<div className="space-y-6 pb-4 px-5 pt-6">
						{chatMessages.map(msg => (
							<div key={msg.id} className={`flex flex-col ${msg.senderType === 'player' ? 'items-end' : 'items-start'} mb-2`}>

								<div className={`flex items-baseline gap-2 mb-1.5 ${msg.senderType === 'player' ? 'flex-row-reverse' : ''}`}>
									<button
										onClick={() => handleNameClick(msg)}
										className="text-[9px] font-cinzel text-stone-500 tracking-[0.2em] font-bold uppercase opacity-80 hover:text-amber-400 transition-colors cursor-pointer"
									>
										{msg.sender}
									</button>

									{msg.flavorText && (
										<span className="text-[11px] font-inter text-stone-500 opacity-60 italic tracking-wide max-w-[65%] leading-tight text-left">
											{msg.flavorText}
										</span>
									)}
								</div>

								<div className={`
                                    px-4 py-3 rounded-2xl text-[14px] font-inter max-w-[85%] break-words shadow-sm leading-relaxed
                                    ${msg.senderType === 'player' ? 'bg-[#1a1714] text-amber-50 border border-stone-800 rounded-br-none' :
										msg.senderType === 'dm' ? 'bg-gradient-to-br from-[#1a1005] to-[#0a0602] text-amber-200 border border-amber-900/40 rounded-bl-none font-serif text-[15px] shadow-[0_2px_15px_rgba(245,158,11,0.05)]' :
											msg.senderType === 'system' ? 'bg-transparent text-stone-400 border border-transparent italic flex gap-2 items-center text-xs' :
												'bg-[#0a0a0a] text-stone-300 border border-stone-800/50 rounded-bl-none'}
                                `}>
									<div>{msg.content}</div>

									{/* Render Spawned Item in Chat (Draggable) */}
									{msg.itemId && (
										<div className="mt-3">
											<DraggableItem id={msg.itemId} source="chat" />
										</div>
									)}
								</div>
							</div>
						))}
					</div>
				</ScrollArea>
			</div>

			{/* 2. Dynamic Menus (In-flow flex item to push chat up) */}
			{activeMenu && (
				<div className="shrink-0 h-[35vh] bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-amber-900/30 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-20 animate-in slide-in-from-bottom-5 duration-300 relative">
					<div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-amber-700/50 to-transparent"></div>
					<div className="p-4 flex justify-between items-center border-b border-amber-900/20">
						<h3 className="font-cinzel font-bold text-amber-400 tracking-[0.2em] uppercase text-sm">{activeMenu}</h3>
						<button onClick={() => setActiveMenu(null)} className="text-stone-500 hover:text-amber-500 text-[10px] uppercase font-cinzel font-bold tracking-widest transition-colors flex flex-col items-center">
							<span className="text-lg leading-none">×</span>
						</button>
					</div>

					<ScrollArea className="h-[calc(100%-53px)]">
						{activeMenu === 'inventory' && <InventoryMenu />}
						{activeMenu === 'party' && <PartyMenu />}
						{activeMenu === 'playerInfo' && <PlayerInfoMenu />}
						{activeMenu === 'skills' && <SkillsMenu />}
						{activeMenu === 'dice' && <DiceMenu triggerRoll={triggerRoll} />}
					</ScrollArea>
				</div>
			)}

			{/* 3. Control Panel (Fixed Bottom) */}
			<div className="shrink-0 bg-[#111] border-t border-amber-900/30 p-4 space-y-4 z-30 shadow-[0_-5px_20px_rgba(0,0,0,0.5)] relative">
				<div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-amber-900/50 to-transparent"></div>

				{/* Dice & Quick Actions */}
				<div className="flex gap-3 items-center justify-between">
					{/* Left Actions */}
					<div className="flex gap-2.5">
						<Button
							variant="outline"
							size="sm"
							className={`h-9 px-3 rounded-lg border transition-all duration-300 ${activeMenu === 'dice' ? 'bg-amber-900/20 text-amber-400 border-amber-500/50 shadow-[inset_0_0_10px_rgba(245,158,11,0.1)]' : 'bg-[#100c08] border-stone-800 text-stone-400 hover:bg-[#1a1714] hover:border-stone-600 hover:text-amber-100'}`}
							onClick={() => setActiveMenu(activeMenu === 'dice' ? null : 'dice')}
							title="Roll Dice"
						>
							<Dices className="h-4 w-4 mr-2" />
							<span className="text-xs font-cinzel font-bold tracking-widest uppercase">Dice</span>
						</Button>
					</div>

					{/* Right Actions */}
					<div className="flex gap-2.5">
						<Button
							variant="outline"
							size="sm"
							className={`h-9 px-3 rounded-lg border transition-all duration-300 ${activeMenu === 'playerInfo' ? 'bg-amber-900/20 text-amber-400 border-amber-500/50 shadow-[inset_0_0_10px_rgba(245,158,11,0.1)]' : 'bg-[#100c08] border-stone-800 text-stone-400 hover:bg-[#1a1714] hover:border-stone-600 hover:text-amber-100'}`}
							onClick={() => setActiveMenu(activeMenu === 'playerInfo' ? null : 'playerInfo')}
							title="Player Info"
						>
							<User className="h-4 w-4" />
						</Button>

						<Button
							variant="outline"
							size="sm"
							className={`h-9 px-3 rounded-lg border transition-all duration-300 ${activeMenu === 'skills' ? 'bg-amber-900/20 text-amber-400 border-amber-500/50 shadow-[inset_0_0_10px_rgba(245,158,11,0.1)]' : 'bg-[#100c08] border-stone-800 text-stone-400 hover:bg-[#1a1714] hover:border-stone-600 hover:text-amber-100'}`}
							onClick={() => setActiveMenu(activeMenu === 'skills' ? null : 'skills')}
							title="Skills & Abilities"
						>
							<Sparkles className="h-4 w-4" />
						</Button>

						<Button
							variant="outline"
							size="sm"
							className={`h-9 px-3 rounded-lg border transition-all duration-300 ${activeMenu === 'party' ? 'bg-amber-900/20 text-amber-400 border-amber-500/50 shadow-[inset_0_0_10px_rgba(245,158,11,0.1)]' : 'bg-[#100c08] border-stone-800 text-stone-400 hover:bg-[#1a1714] hover:border-stone-600 hover:text-amber-100'}`}
							onClick={() => setActiveMenu(activeMenu === 'party' ? null : 'party')}
							title="Party Status"
						>
							<Users className="h-4 w-4" />
						</Button>

						{/* INVENTORY BUTTON DROPZONE */}
						<InventoryButtonDropzone activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
					</div>
				</div>

				{/* Action Grids - Only show if actions exist */}
				{(testQuestState === 'combat' || testQuestState === 'completed') && (
					<div className="flex gap-4 p-4 border-t border-amber-900/30 bg-[#0a0a0a]/50">
						{/* ZK Quest Action (Conditional) */}
						{testQuestState === 'combat' && (
							<button
								onClick={handleZkLootRoll}
								className="flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gradient-to-r from-emerald-900/40 to-emerald-800/20 border border-emerald-500/30 hover:bg-emerald-800/40 transition-colors group"
							>
								<ShieldAlert className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
								<span className="font-cinzel text-[10px] font-bold text-emerald-200 tracking-wider">Generate ZK Loot</span>
							</button>
						)}

						{testQuestState === 'completed' && (
							<button
								onClick={handleEndQuest}
								disabled={isEndingQuest}
								className="flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gradient-to-r from-amber-700 to-amber-600 border border-amber-500/30 hover:bg-amber-600 transition-colors group"
							>
								{isEndingQuest ? (
									<div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
								) : (
									<CheckCircle2 className="w-5 h-5 text-amber-200 group-hover:scale-110 transition-transform" />
								)}
								<span className="font-cinzel text-[10px] font-bold text-amber-50 tracking-wider">Finalize Quest (On-Chain)</span>
							</button>
						)}
					</div>
				)}

				{/* Text Input */}
				<div className="flex gap-3 items-center relative">
					<div className={`flex-1 flex gap-2 items-center bg-[#050505] border ${activeNpc || isSendingDialog ? 'border-amber-500/50 ring-1 ring-amber-500/50' : 'border-stone-800 focus-within:ring-1 focus-within:ring-amber-500/50 focus-within:border-amber-500/50'} rounded-xl shadow-inner transition-all px-3 h-12`}>
						{activeNpc && (
							<div className="flex items-center gap-2 bg-amber-900/30 text-amber-400 pl-2.5 pr-1 py-1 rounded-md border border-amber-700/50 shadow-[0_0_10px_rgba(245,158,11,0.1)] shrink-0 group/badge">
								<span className="text-[10px] font-cinzel font-bold uppercase tracking-widest flex items-center gap-1.5">
									<span className="text-amber-600">to:</span> {activeNpc.name}
								</span>
								<button
									onClick={() => setActiveNpc(null)}
									className="p-0.5 rounded-sm hover:bg-amber-800/50 text-amber-600 hover:text-amber-200 transition-colors"
									title="End Conversation"
								>
									<X className="w-3 h-3" />
								</button>
							</div>
						)}
						<input
							className="flex-1 bg-transparent border-none text-amber-50 placeholder:text-stone-600 font-inter outline-none h-full text-sm"
							placeholder={
								isSendingDialog ? `${activeNpc?.name} is responding...` :
									activeNpc ? `Type message...` :
										currentTurn === 'player' ? "What do you do?" : "Wait for your turn..."
							}
							value={inputText}
							onChange={(e) => setInputText(e.target.value)}
							onKeyDown={handleKeyPress}
							disabled={currentTurn !== 'player' || isSendingDialog}
						/>
					</div>

					<Button
						onClick={handleSend}
						disabled={!inputText.trim() || currentTurn !== 'player' || isSendingDialog}
						className="h-12 px-6 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-amber-50 rounded-xl disabled:opacity-50 border border-amber-500/30 font-cinzel tracking-widest uppercase font-bold text-xs shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all duration-300 group"
					>
						{isSendingDialog ? (
							<span className="flex gap-1">
								<span className="w-1.5 h-1.5 bg-amber-200 rounded-full animate-bounce"></span>
								<span className="w-1.5 h-1.5 bg-amber-200 rounded-full animate-bounce delay-100"></span>
								<span className="w-1.5 h-1.5 bg-amber-200 rounded-full animate-bounce delay-200"></span>
							</span>
						) : (
							<Send className="w-4 h-4 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
						)}
					</Button>
				</div>
			</div>
		</div >
	);
}

// Separate component for Inventory Button to make it a dropzone
function InventoryButtonDropzone({ activeMenu, setActiveMenu }: { activeMenu: string | null, setActiveMenu: (m: 'inventory' | 'party' | null) => void; }) {
	const { setNodeRef, isOver } = useDroppable({
		id: 'inventory-btn-dropzone',
		data: { type: 'inventory' }
	});

	// If item is hovered over button, open menu automatically
	useEffect(() => {
		if (isOver && activeMenu !== 'inventory') {
			setActiveMenu('inventory');
		}
	}, [isOver, activeMenu, setActiveMenu]);

	return (
		<Button
			ref={setNodeRef}
			variant="outline"
			size="sm"
			className={`h-9 px-3 rounded-lg border transition-all duration-300
        ${activeMenu === 'inventory' ? 'bg-amber-900/20 text-amber-400 border-amber-500/50 shadow-[inset_0_0_10px_rgba(245,158,11,0.1)]' : 'bg-[#100c08] border-stone-800 text-stone-400 hover:bg-[#1a1714] hover:border-stone-600 hover:text-amber-100'}
        ${isOver ? 'ring-2 ring-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.6)] scale-105 bg-amber-900/30' : ''}
      `}
			onClick={() => setActiveMenu(activeMenu === 'inventory' ? null : 'inventory')}
		>
			<Backpack className={`h-4 w-4 ${isOver ? 'animate-bounce text-amber-400' : ''}`} />
			<span className="ml-2 text-xs font-cinzel font-bold tracking-widest uppercase">{activeMenu === 'inventory' ? 'Open' : ''}</span>
		</Button>
	);
}

// Sub-components for menus
function InventoryMenu() {
	const { inventory } = useGameState();

	const { setNodeRef, isOver } = useDroppable({
		id: 'inventory-menu-dropzone',
		data: { type: 'inventory' }
	});

	return (
		<div
			ref={setNodeRef}
			className={`p-6 min-h-full transition-colors duration-500 ${isOver ? 'bg-amber-900/10 shadow-[inset_0_0_100px_rgba(245,158,11,0.05)]' : ''}`}
		>
			{inventory.length === 0 ? (
				<div className="flex flex-col items-center justify-center h-40 text-center text-stone-600 font-cinzel tracking-widest uppercase italic py-8 border border-dashed border-stone-800 rounded-xl bg-[#050505]">
					<Backpack className="w-8 h-8 mb-3 opacity-20" />
					Your pack is empty.<br />Drag loot here to collect it.
				</div>
			) : (
				<div className="grid grid-cols-4 gap-4">
					{inventory.map(item => (
						<div key={item.id} className="aspect-square bg-[#050505] border border-stone-800 rounded-xl flex flex-col items-center justify-center p-3 relative group hover:border-amber-500/40 hover:bg-[#0a0a0a] transition-all shadow-inner hover:shadow-[0_0_15px_rgba(245,158,11,0.1)]">
							<DraggableItem id={item.id} source="inventory">
								<div className="w-12 h-12 rounded-lg bg-[#100c08] border border-stone-800 flex items-center justify-center mb-2 text-2xl text-amber-500 shadow-inner group-hover:scale-110 transition-transform duration-300">
									{/* Icon placeholder based on type */}
									{item.type === 'weapon' ? '⚔️' : item.type === 'consumable' ? '🧪' : '🛡️'}
								</div>
								<span className="text-[10px] font-inter font-medium text-stone-400 text-center leading-tight truncate w-full px-1 group-hover:text-amber-200 transition-colors">{item.name}</span>
							</DraggableItem>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

function PartyMenu() {
	const { entities } = useGameState();
	const party = entities.filter(e => e.type !== 'enemy' && e.type !== 'system');

	return (
		<div className="p-6 space-y-4">
			{party.length === 0 ? (
				<div className="text-stone-500 text-center text-sm italic font-inter px-8 py-10 border border-dashed border-stone-800 rounded-xl bg-[#050505]">No party members found.</div>
			) : (
				party.map(member => (
					<div key={member.id} className="p-4 bg-[#050505] border border-stone-800 rounded-xl shadow-inner relative overflow-hidden group hover:border-amber-900/40 transition-colors">
						<div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-900/20 to-transparent"></div>
						<div className="flex justify-between items-center mb-3">
							<span className="font-bold font-cinzel tracking-wider text-amber-50 group-hover:text-amber-200 transition-colors uppercase">{member.name}</span>
							<span className={`text-xs font-inter font-bold tracking-widest ${member.isDead ? 'text-red-500' : 'text-emerald-400'}`}>
								{member.hp} / {member.maxHp} HP
							</span>
						</div>
						<div className="w-full bg-[#100c08] rounded-full h-2 overflow-hidden border border-stone-800 shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)]">
							<div
								className={`h-full transition-all duration-700 ease-out relative ${member.isDead ? 'bg-red-900' : member.hp / member.maxHp > 0.3 ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : 'bg-gradient-to-r from-red-600 to-red-400'}`}
								style={{ width: `${Math.max(0, Math.min(100, (member.hp / member.maxHp) * 100))}%` }}
							>
								<div className="absolute top-0 right-0 bottom-0 w-4 bg-gradient-to-r from-transparent to-white/30 mix-blend-overlay"></div>
							</div>
						</div>
					</div>
				))
			)}
		</div>
	);
}

function PlayerInfoMenu() {
	const { playerCharacter } = useGameState();

	return (
		<div className="p-6 space-y-6">
			<div className="flex items-start gap-4 p-4 bg-[#050505] border border-stone-800 rounded-xl shadow-inner relative overflow-hidden">
				<div className="w-16 h-16 rounded-xl border border-amber-900/50 bg-[#100c08] flex items-center justify-center text-3xl shrink-0">
					<User className="w-8 h-8 text-amber-600/50" />
				</div>
				<div className="flex-1">
					<h4 className="font-cinzel text-lg font-bold text-amber-400 uppercase tracking-widest drop-shadow-[0_0_5px_rgba(245,158,11,0.3)]">
						{playerCharacter ? playerCharacter.name : 'Unknown Hero'}
					</h4>
					<p className="text-sm font-inter text-stone-400 capitalize">
						{playerCharacter ? `Level ${playerCharacter.level || 1} ${playerCharacter.ancestry || ''} ${playerCharacter.class || ''}` : 'Level 1 Wanderer'}
					</p>
					<div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-inter font-bold tracking-widest text-stone-500">
						<div className="bg-[#100c08] border border-stone-800 rounded p-2"><span className="block text-amber-200">STR</span> {playerCharacter?.str || '--'}</div>
						<div className="bg-[#100c08] border border-stone-800 rounded p-2"><span className="block text-amber-200">DEX</span> {playerCharacter?.dex || '--'}</div>
						<div className="bg-[#100c08] border border-stone-800 rounded p-2"><span className="block text-amber-200">CON</span> {playerCharacter?.con || '--'}</div>
						<div className="bg-[#100c08] border border-stone-800 rounded p-2"><span className="block text-amber-200">INT</span> {playerCharacter?.int || '--'}</div>
						<div className="bg-[#100c08] border border-stone-800 rounded p-2"><span className="block text-amber-200">WIS</span> {playerCharacter?.wis || '--'}</div>
						<div className="bg-[#100c08] border border-stone-800 rounded p-2"><span className="block text-amber-200">CHA</span> {playerCharacter?.cha || '--'}</div>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div className="p-3 bg-[#050505] border border-stone-800 rounded-xl flex flex-col items-center">
					<span className="text-[10px] uppercase font-cinzel font-bold tracking-widest text-amber-700/80 mb-1 block">Max HP</span>
					<span className="text-xl font-cinzel text-amber-100">{playerCharacter?.max_hp || 10}</span>
				</div>
				<div className="p-3 bg-[#050505] border border-stone-800 rounded-xl flex flex-col items-center">
					<span className="text-[10px] uppercase font-cinzel font-bold tracking-widest text-amber-700/80 mb-1 block">Alignment</span>
					<span className="text-xl font-cinzel text-amber-100">{playerCharacter?.alignment || 'Neutral'}</span>
				</div>
			</div>

			{playerCharacter?.background && (
				<div className="p-4 bg-[#050505] border border-stone-800 rounded-xl relative">
					<span className="text-[10px] uppercase font-cinzel font-bold tracking-[0.2em] text-amber-900/80 absolute -top-2.5 left-4 bg-[#0a0a0a] px-2 block">Background</span>
					<p className="text-sm font-inter text-stone-400 italic leading-relaxed">"{playerCharacter.background}"</p>
				</div>
			)}
		</div>
	);
}

function SkillsMenu() {
	return (
		<div className="p-6 space-y-4">
			{/* Example Skill List */}
			{[
				{ name: 'Power Attack', type: 'Melee', cost: '1 Action', desc: 'A heavy strike that deals extra damage but reduces accuracy.' },
				{ name: 'Second Wind', type: 'Recovery', cost: '1 Bonus', desc: 'Draw on your stamina to recover some hit points.' },
				{ name: 'Intimidate', type: 'Social', cost: 'Action', desc: 'Attempt to force an enemy to flee through a show of force.' },
			].map((skill, idx) => (
				<div key={idx} className="p-4 bg-[#050505] border border-stone-800 rounded-xl shadow-inner hover:border-amber-900/40 transition-colors group">
					<div className="flex justify-between items-start mb-2">
						<span className="font-bold font-cinzel tracking-wider text-amber-200 uppercase">{skill.name}</span>
						<div className="flex flex-col items-end gap-1">
							<span className="text-[10px] font-inter uppercase tracking-widest text-stone-500 bg-stone-900 px-2 py-0.5 rounded border border-stone-800">{skill.type}</span>
							<span className="text-[10px] text-amber-700/80 font-bold">{skill.cost}</span>
						</div>
					</div>
					<p className="text-xs font-inter text-stone-400 leading-relaxed">
						{skill.desc}
					</p>
				</div>
			))}
		</div>
	);
}

function DiceMenu({ triggerRoll }: { triggerRoll: (t: DiceType) => void; }) {
	return (
		<div className="p-6">
			<h4 className="text-amber-500/50 font-cinzel font-bold text-xs uppercase tracking-[0.3em] mb-4 text-center">Cast the Bones</h4>
			<div className="grid grid-cols-3 gap-4 max-w-[280px] mx-auto">
				{['d4', 'd6', 'd8', 'd10', 'd12', 'd20'].map(d => (
					<button
						key={d}
						onClick={() => triggerRoll(d as DiceType)}
						className={`py-4 text-base font-cinzel font-bold tracking-widest rounded-xl border transition-all duration-300 shadow-inner group
                            ${d === 'd20'
								? 'bg-gradient-to-b from-amber-900/30 to-amber-900/10 border-amber-500/50 text-amber-400 hover:border-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:-translate-y-1'
								: 'bg-[#050505] border-stone-800 text-stone-400 hover:bg-[#0a0a0a] hover:border-stone-600 hover:text-amber-200 hover:-translate-y-0.5'}`}
					>
						<span className="group-hover:scale-110 transition-transform block">{d}</span>
					</button>
				))}
			</div>
		</div>
	);
}
