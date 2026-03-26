import { useState } from 'react';
import { startGame } from '@/lib/OneChain';
import { useGameState } from '@/store/useGameState';
import { Scroll, Wallet, CheckCircle2, AlertTriangle, ShieldX } from 'lucide-react';
import { quoteAdventurePrepay } from '@/lib/onechainEconomy';
import { useOnechainWalletExecutor } from '@/hooks/useOnechainWalletExecutor';

interface QuestBoardProps {
	playerId: string;
	walletAddress: string;
	onClose: () => void;
}

export default function QuestBoard({ playerId, walletAddress, onClose }: QuestBoardProps) {
	const { testQuestState, setTestQuestState, setTestQuestSessionId, addMessage } = useGameState();
	const { executor, isExecuting: isWalletExecuting } = useOnechainWalletExecutor();
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const quote = quoteAdventurePrepay({ generationCount: 3, mintableDropsEstimate: 1 });

	const handleStartQuest = async () => {
		if (!executor) {
			setError('Wallet signer is unavailable. Reconnect OneWallet and retry.');
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			const result = await startGame(
				walletAddress,
				executor,
				{ generationCount: 3, mintableDropsEstimate: 1 },
			);

			if (result.success) {
				setTestQuestState('started');
				if (result.sessionId) setTestQuestSessionId(result.sessionId);

				addMessage({
					sender: 'System',
					senderType: 'system',
					content: `Quest Authorized. Session Reference: ${result.hash?.substring(0, 10)}... Prepaid ${result.paidOne ?? quote.totalOne} ONE.`
				});

				addMessage({
					sender: 'Game Master',
					senderType: 'dm',
					content: 'A brave soul steps forward. I have a task for you. Shall we converse?',
					flavorText: 'The tavern quiets as the cloaked figure addresses you.'
				});

				onClose();
			} else {
				setError(result.error || 'Transaction failed or was rejected.');
			}
		} catch (err: any) {
			setError(err.message || 'An unexpected error occurred.');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050505]/95 backdrop-blur-md animate-in fade-in duration-300">
			<div className="bg-[#0a0a0a] border border-amber-900/50 p-8 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] max-w-lg w-full relative overflow-hidden">

				{/* Decorative borders */}
				<div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50"></div>

				<button onClick={onClose} className="absolute top-4 right-4 text-stone-500 hover:text-amber-500 transition-colors">
					<span className="text-xl">×</span>
				</button>

				<div className="flex items-center gap-3 mb-6">
					<Scroll className="w-8 h-8 text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
					<h2 className="text-3xl font-cinzel font-bold text-amber-50 tracking-widest uppercase">The Genesis Trial</h2>
				</div>

				<div className="space-y-4 mb-8">
					<p className="text-stone-400 font-inter leading-relaxed">
						To prove your worth in the New Era, you must complete the Genesis Trial.
						This quest will test your mettle. Starting the run prepays AI generations and mint reserve on OneChain.
					</p>
					<div className="rounded-xl border border-amber-900/30 bg-[#111] p-4 shadow-inner">
						<h4 className="mb-3 border-b border-amber-900/20 pb-2 font-cinzel text-xs font-bold uppercase tracking-widest text-amber-200">
							Prepay Breakdown
						</h4>
						<div className="space-y-1.5 text-[0.72rem] uppercase tracking-[0.14em] text-stone-400">
							<div className="flex items-center justify-between">
								<span>Adventure Entry</span>
								<span className="text-stone-200">{quote.entryFeeOne} ONE</span>
							</div>
							<div className="flex items-center justify-between">
								<span>AI Generations</span>
								<span className="text-stone-200">{quote.generationFeeOne} ONE</span>
							</div>
							<div className="flex items-center justify-between">
								<span>NFT Mint Reserve</span>
								<span className="text-stone-200">{quote.mintReserveOne} ONE</span>
							</div>
							<div className="flex items-center justify-between">
								<span>Gas Buffer</span>
								<span className="text-stone-200">{quote.gasBufferOne} ONE</span>
							</div>
							<div className="mt-2 border-t border-amber-900/20 pt-2 flex items-center justify-between text-amber-200">
								<span>Total</span>
								<span>{quote.totalOne} ONE</span>
							</div>
						</div>
					</div>
					<div className="bg-[#111] border border-amber-900/30 rounded-xl p-4 shadow-inner space-y-2">
						<h4 className="font-cinzel text-amber-200 text-xs tracking-widest uppercase font-bold border-b border-amber-900/20 pb-2 mb-3">Quest Objectives</h4>

						<div className="flex items-start gap-3 text-sm">
							<CheckCircle2 className={`w-4 h-4 mt-0.5 ${testQuestState !== 'not_started' ? 'text-emerald-500' : 'text-stone-600'}`} />
							<span className={testQuestState !== 'not_started' ? 'text-stone-300' : 'text-stone-500'}>
								1. Open the quest session
							</span>
						</div>
						<div className="flex items-start gap-3 text-sm">
							<CheckCircle2 className={`w-4 h-4 mt-0.5 ${['combat', 'loot', 'completed'].includes(testQuestState) ? 'text-emerald-500' : 'text-stone-600'}`} />
							<span className={['combat', 'loot', 'completed'].includes(testQuestState) ? 'text-stone-300' : 'text-stone-500'}>
								2. Converse with the Game Master
							</span>
						</div>
						<div className="flex items-start gap-3 text-sm">
							<CheckCircle2 className={`w-4 h-4 mt-0.5 ${['loot', 'completed'].includes(testQuestState) ? 'text-emerald-500' : 'text-stone-600'}`} />
							<span className={['loot', 'completed'].includes(testQuestState) ? 'text-stone-300' : 'text-stone-500'}>
								3. Slay the Goblin
							</span>
						</div>
						<div className="flex items-start gap-3 text-sm">
							<CheckCircle2 className={`w-4 h-4 mt-0.5 ${testQuestState === 'completed' ? 'text-emerald-500' : 'text-stone-600'}`} />
							<span className={testQuestState === 'completed' ? 'text-stone-300' : 'text-stone-500'}>
								4. Verify ZK loot and close the quest
							</span>
						</div>
					</div>
				</div>

				{error && (
					<div className="mb-6 p-3 bg-red-950/30 border border-red-900/50 rounded-lg flex items-start gap-3 text-red-400 text-sm">
						<AlertTriangle className="w-5 h-5 shrink-0" />
						<span className="leading-tight">{error}</span>
					</div>
				)}

				{testQuestState === 'not_started' ? (
					<button
						onClick={handleStartQuest}
						disabled={isLoading || isWalletExecuting || !executor}
						className="w-full relative group perspective-1000"
					>
						<div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-amber-600 via-amber-400 to-amber-700 opacity-40 group-hover:opacity-100 transition duration-500 blur-sm group-hover:blur-md"></div>
						<div className="relative bg-[#050505] border border-amber-900/50 rounded-xl py-4 flex items-center justify-center gap-3 transition-all duration-300 group-hover:bg-[#0a0a0a]">
							{isLoading ? (
								<div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
							) : (
								<Wallet className="w-5 h-5 text-amber-500" />
							)}
							<span className="font-bold font-cinzel tracking-[0.2em] text-amber-50 uppercase shadow-sm">
								{isLoading || isWalletExecuting ? 'Opening Session...' : 'Begin Trial'}
							</span>
						</div>
					</button>
				) : (
					<div className="w-full py-4 text-center bg-emerald-950/20 border border-emerald-900/50 rounded-xl">
						<span className="font-bold font-cinzel tracking-[0.2em] text-emerald-500 uppercase flex items-center justify-center gap-2">
							<CheckCircle2 className="w-5 h-5" /> Quest Active
						</span>
						<p className="text-xs text-stone-500 mt-2 font-inter">Return to the map to continue your journey.</p>
					</div>
				)}

			</div>
		</div>
	);
}
