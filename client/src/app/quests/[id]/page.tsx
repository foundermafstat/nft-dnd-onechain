'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { fetchQuestById, fetchQuestHistory, Quest, QuestHistoryEntry } from '@/lib/questApi';
import { Skull, Trophy, Swords, Loader2, ArrowLeft, Sparkles, Dice1, ScrollText } from 'lucide-react';
import Link from 'next/link';

function RollBadge({ roll, label }: { roll: number | null; label: string; }) {
	if (roll === null || roll === undefined) return null;
	const isNat20 = roll === 20;
	const isNat1 = roll === 1;
	return (
		<span
			className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border
                ${isNat20 ? 'bg-amber-900/40 border-amber-600/50 text-amber-300 shadow-[0_0_12px_rgba(217,119,6,0.25)]' :
					isNat1 ? 'bg-red-900/40 border-red-600/50 text-red-300 shadow-[0_0_12px_rgba(220,38,38,0.25)]' :
						'bg-stone-800/40 border-stone-700/50 text-stone-400'}`}
		>
			<Dice1 className="w-3 h-3" />
			{label}: {roll}
			{isNat20 && <Sparkles className="w-3 h-3 text-amber-400" />}
			{isNat1 && <Skull className="w-3 h-3 text-red-400" />}
		</span>
	);
}

function EngineTriggerBadge({ trigger }: { trigger: string | null; }) {
	if (!trigger || trigger === 'none') return null;
	const colors: Record<string, string> = {
		obstacle_cleared: 'bg-emerald-900/30 border-emerald-700/40 text-emerald-400',
		combat_start: 'bg-red-900/30 border-red-700/40 text-red-400',
		spawn_patrol: 'bg-orange-900/30 border-orange-700/40 text-orange-400',
		enemies_flee: 'bg-sky-900/30 border-sky-700/40 text-sky-400',
		trap_triggered: 'bg-purple-900/30 border-purple-700/40 text-purple-400',
	};
	const cls = colors[trigger] || 'bg-stone-800/30 border-stone-700/40 text-stone-400';
	return (
		<span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${cls}`}>
			⚙ {trigger.replace(/_/g, ' ')}
		</span>
	);
}

export default function QuestLandingPage() {
	const params = useParams();
	const questId = params?.id as string;

	const [quest, setQuest] = useState<Quest | null>(null);
	const [history, setHistory] = useState<QuestHistoryEntry[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!questId) return;
		Promise.all([fetchQuestById(questId), fetchQuestHistory(questId)])
			.then(([q, h]) => {
				setQuest(q);
				setHistory(h);
			})
			.catch(console.error)
			.finally(() => setLoading(false));
	}, [questId]);

	if (loading) {
		return (
			<main className="flex items-center justify-center h-screen bg-[#0a0806]">
				<Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
			</main>
		);
	}

	if (!quest) {
		return (
			<main className="flex flex-col items-center justify-center h-screen bg-[#0a0806] text-stone-400 font-serif">
				<Skull className="w-12 h-12 text-stone-700 mb-4" />
				<p className="text-lg">This quest has been lost to the void.</p>
				<Link href="/quests" className="mt-6 text-amber-600 hover:text-amber-400 transition-colors text-sm flex items-center gap-2">
					<ArrowLeft className="w-4 h-4" /> Return to Chronicle
				</Link>
			</main>
		);
	}

	const isSuccess = quest.status === 'Success';
	const isWiped = quest.status === 'PartyWiped';
	const chainEvents = history.filter(h => h.on_chain_event);

	return (
		<main className="min-h-screen bg-[#0a0806] text-stone-200 overflow-auto custom-scrollbar">

			{/* ── Hero Banner ──────────────────────────────────────── */}
			<div className="relative overflow-hidden">
				{/* Ambient glow */}
				<div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full blur-[160px] pointer-events-none ${isSuccess ? 'bg-amber-600/8' : isWiped ? 'bg-red-600/8' : 'bg-stone-600/5'}`} />

				<div className="relative max-w-3xl mx-auto px-6 pt-12 pb-8">
					<Link href="/quests" className="inline-flex items-center gap-1 text-stone-600 hover:text-amber-500 transition-colors text-xs font-mono uppercase tracking-widest mb-8">
						<ArrowLeft className="w-3 h-3" /> Chronicle
					</Link>

					{/* Status Banner */}
					<div className="flex items-center gap-4 mb-6">
						<div className={`w-16 h-16 rounded-xl flex items-center justify-center ${isSuccess ? 'bg-gradient-to-br from-amber-800/30 to-amber-950/30 border border-amber-700/30 shadow-[0_0_30px_rgba(217,119,6,0.1)]' : isWiped ? 'bg-gradient-to-br from-red-900/30 to-red-950/30 border border-red-700/30 shadow-[0_0_30px_rgba(220,38,38,0.1)]' : 'bg-gradient-to-br from-stone-800/30 to-stone-900/30 border border-stone-700/30'}`}>
							{isSuccess ? <Trophy className="w-8 h-8 text-amber-400" /> : isWiped ? <Skull className="w-8 h-8 text-red-400" /> : <Swords className="w-8 h-8 text-stone-400 animate-pulse" />}
						</div>
						<div>
							<h1 className={`text-3xl font-serif font-black tracking-tight ${isSuccess ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-orange-600' : isWiped ? 'text-transparent bg-clip-text bg-gradient-to-r from-red-300 via-red-500 to-red-800' : 'text-stone-300'}`}>
								{isSuccess ? 'Victory' : isWiped ? 'Annihilation' : 'Quest in Progress'}
							</h1>
							<p className="text-stone-600 text-xs font-mono mt-1">
								{new Date(quest.start_time).toLocaleString()} {quest.end_time && `→ ${new Date(quest.end_time).toLocaleString()}`}
							</p>
						</div>
					</div>

					{/* Meta chips */}
					<div className="flex flex-wrap gap-2 text-xs font-mono">
						<span className="px-3 py-1 rounded-full bg-stone-900/60 border border-stone-800/50 text-stone-500">
							{quest.party_members?.length || 0} heroes
						</span>
						{quest.loot_dropped && (
							<span className="px-3 py-1 rounded-full bg-amber-900/20 border border-amber-800/30 text-amber-500 flex items-center gap-1">
								<Sparkles className="w-3 h-3" /> Loot Acquired
							</span>
						)}
						{chainEvents.length > 0 && (
							<span className="px-3 py-1 rounded-full bg-indigo-900/20 border border-indigo-800/30 text-indigo-400">
								⛓ {chainEvents.length} on-chain event{chainEvents.length > 1 ? 's' : ''}
							</span>
						)}
						<span className="px-3 py-1 rounded-full bg-stone-900/60 border border-stone-800/50 text-stone-500">
							{history.length} chronicle entries
						</span>
					</div>
				</div>
			</div>

			{/* ── Divider ──────────────────────────────────────────── */}
			<div className="max-w-3xl mx-auto px-6">
				<div className="h-px bg-gradient-to-r from-transparent via-stone-800 to-transparent" />
			</div>

			{/* ── Chronicle Timeline ───────────────────────────────── */}
			<div className="max-w-3xl mx-auto px-6 pt-10 pb-24">
				<div className="flex items-center gap-2 mb-8">
					<ScrollText className="w-5 h-5 text-stone-600" />
					<h2 className="text-lg font-serif font-bold text-stone-400 tracking-wide">Chronicle Timeline</h2>
				</div>

				{history.length === 0 ? (
					<p className="text-stone-700 font-serif text-center py-16">The chronicle is empty. The story has yet to be written.</p>
				) : (
					<div className="relative">
						{/* Vertical line */}
						<div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-stone-800 via-stone-800/50 to-transparent" />

						<div className="space-y-0">
							{history.map((entry, idx) => {
								const isSpecial = entry.player_roll === 20 || entry.player_roll === 1;
								return (
									<div key={entry.id} className="relative pl-12 pb-8 group">
										{/* Timeline dot */}
										<div className={`absolute left-2.5 top-1 w-3 h-3 rounded-full border-2 transition-all duration-300
                                            ${entry.on_chain_event ? 'bg-indigo-500 border-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.4)]' :
												isSpecial ? (entry.player_roll === 20 ? 'bg-amber-500 border-amber-400 shadow-[0_0_10px_rgba(217,119,6,0.4)]' : 'bg-red-500 border-red-400 shadow-[0_0_10px_rgba(220,38,38,0.4)]') :
													'bg-stone-700 border-stone-600 group-hover:bg-stone-500'}`}
										/>

										{/* Card */}
										<div className={`rounded-lg border p-4 transition-all duration-300
                                            ${entry.on_chain_event ? 'bg-indigo-950/10 border-indigo-800/20 hover:border-indigo-700/30' :
												entry.player_roll === 20 ? 'bg-amber-950/10 border-amber-800/20 hover:border-amber-700/30' :
													entry.player_roll === 1 ? 'bg-red-950/10 border-red-800/20 hover:border-red-700/30' :
														'bg-[#0e0c09] border-stone-800/30 hover:border-stone-700/40'}`}
										>
											{/* Timestamp */}
											<div className="flex items-center justify-between mb-3">
												<span className="text-[10px] font-mono text-stone-700 uppercase tracking-widest">
													Entry {idx + 1} · {new Date(entry.created_at).toLocaleTimeString()}
												</span>
												<div className="flex gap-1.5">
													<RollBadge roll={entry.player_roll} label="Player" />
													<RollBadge roll={entry.dm_roll} label="DM" />
													<EngineTriggerBadge trigger={entry.engine_trigger} />
												</div>
											</div>

											{/* Player Action */}
											{entry.player_action && (
												<div className="mb-3">
													<p className="text-xs text-stone-600 font-mono uppercase tracking-wider mb-1">Action</p>
													<p className="text-sm text-stone-300 font-serif leading-relaxed pl-3 border-l-2 border-stone-700/50">
														{entry.player_action}
													</p>
												</div>
											)}

											{/* AI Narrative */}
											{entry.ai_narrative && (
												<div className="mt-3">
													<p className="text-xs text-stone-600 font-mono uppercase tracking-wider mb-1">The Dungeon Master Speaks</p>
													<blockquote className={`text-sm font-serif leading-relaxed pl-3 border-l-2 italic
                                                        ${entry.player_roll === 20 ? 'text-amber-200/90 border-amber-600/50' :
															entry.player_roll === 1 ? 'text-red-200/90 border-red-600/50' :
																'text-stone-300/90 border-amber-900/30'}`}
													>
														{entry.ai_narrative}
													</blockquote>
												</div>
											)}

											{/* On-chain event */}
											{entry.on_chain_event && (
												<div className="mt-3 pt-3 border-t border-indigo-800/20">
													<span className="inline-flex items-center gap-1 text-[10px] font-mono text-indigo-400 uppercase tracking-widest">
														⛓ OneChain VoteSession Initiated
													</span>
												</div>
											)}

											{/* Background flavor */}
											{entry.player_background && (
												<div className="mt-2">
													<span className="text-[10px] font-mono text-stone-700 uppercase tracking-wider">
														Background: <span className="text-stone-500">{entry.player_background}</span>
													</span>
												</div>
											)}
										</div>
									</div>
								);
							})}
						</div>
					</div>
				)}

				{/* ── Conclusion Banner ─────────────────────────────── */}
				{(isSuccess || isWiped) && (
					<div className={`mt-12 rounded-xl border p-8 text-center relative overflow-hidden
                        ${isSuccess ? 'bg-gradient-to-b from-amber-950/20 to-[#0a0806] border-amber-800/20' : 'bg-gradient-to-b from-red-950/20 to-[#0a0806] border-red-800/20'}`}
					>
						<div className={`absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent ${isSuccess ? 'via-amber-500/40' : 'via-red-500/40'} to-transparent`} />
						{isSuccess ? (
							<>
								<Trophy className="w-10 h-10 text-amber-500 mx-auto mb-3" />
								<h3 className="text-2xl font-serif font-black text-amber-200 mb-2">Quest Complete</h3>
								<p className="text-stone-500 font-serif text-sm max-w-md mx-auto">
									The heroes have emerged from the darkness victorious. Their names shall be remembered.
								</p>
							</>
						) : (
							<>
								<Skull className="w-10 h-10 text-red-500 mx-auto mb-3" />
								<h3 className="text-2xl font-serif font-black text-red-300 mb-2">Total Party Kill</h3>
								<p className="text-stone-500 font-serif text-sm max-w-md mx-auto">
									The darkness claimed them. Their bones will join the forgotten corridors of the deep. Perhaps the next
									party will succeed where they fell.
								</p>
							</>
						)}

						{quest.loot_dropped && (
							<div className="mt-6 pt-4 border-t border-amber-800/15">
								<p className="text-xs font-mono text-amber-700 uppercase tracking-widest">
									✦ Legendary Loot Was Earned
								</p>
							</div>
						)}
					</div>
				)}
			</div>
		</main>
	);
}
