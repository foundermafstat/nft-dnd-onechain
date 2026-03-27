import { useState } from 'react';
import { CheckCircle2, Scroll, Sparkles, AlertTriangle } from 'lucide-react';
import { useGameState } from '@/store/useGameState';
import { startDialogWithMarta } from '@/lib/martaQuestApi';

interface QuestBoardProps {
	playerId: string;
	walletAddress: string;
	onClose: () => void;
}

function stepDone(state: string, stepKey: string): boolean {
    if (stepKey === 'talk_to_marta') return state !== 'not_started';
    if (stepKey === 'accept_and_prepay') return ['combat_required', 'return_to_marta', 'completed_success', 'completed_fail'].includes(state);
    if (stepKey === 'combat_mandatory') return ['return_to_marta', 'completed_success', 'completed_fail'].includes(state);
    if (stepKey === 'return_to_marta') return ['return_to_marta', 'completed_success', 'completed_fail'].includes(state);
    if (stepKey === 'turn_in') return ['completed_success', 'completed_fail'].includes(state);
    return false;
}

function mapServerStateToLocal(state: string): 'not_started' | 'offered_by_marta' | 'combat_required' | 'return_to_marta' | 'completed_success' | 'completed_fail' {
    if (state === 'OFFERED_BY_MARTA' || state === 'OFFERED_BY_ALDRIC') return 'offered_by_marta';
    if (state === 'COMBAT_REQUIRED' || state === 'ADVENTURE_ACTIVE' || state === 'ACCEPTED') return 'combat_required';
    if (state === 'RETURN_TO_MARTA' || state === 'RETURN_TO_ALDRIC') return 'return_to_marta';
    if (state === 'COMPLETED_SUCCESS') return 'completed_success';
    if (state === 'COMPLETED_FAIL') return 'completed_fail';
    return 'not_started';
}

export default function QuestBoard({ playerId, onClose }: QuestBoardProps) {
	const {
        testQuestState,
        questFlow,
        setQuestFlow,
        setTestQuestState,
        setActiveQuestId,
        setActiveNpc,
        addMessage,
    } = useGameState();
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

    const openMartaDialog = async () => {
        setError(null);
        setIsLoading(true);
        try {
            const result = await startDialogWithMarta({ playerId });
            if (result.questId) setActiveQuestId(result.questId);
            if (result.flow) {
                setQuestFlow(result.flow);
                setTestQuestState(mapServerStateToLocal(result.flow.state));
            }
            setActiveNpc({ id: '10000000-0000-4000-a000-000000000002', name: 'Old Marta' });
            addMessage({
                sender: 'Old Marta',
                senderType: 'dm',
                content: result.martaLine || 'The bones told me you would come...',
                flavorText: 'The old fortune teller taps bone dice against the table.',
            });
            onClose();
        } catch (err: any) {
            setError(err?.message || 'Failed to reach Old Marta.');
        } finally {
            setIsLoading(false);
        }
    };

	return (
		<div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050505]/95 backdrop-blur-md animate-in fade-in duration-300">
			<div className="bg-[#0a0a0a] border border-amber-900/50 p-8 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] max-w-lg w-full relative overflow-hidden">
				<div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50" />

				<button onClick={onClose} className="absolute top-4 right-4 text-stone-500 hover:text-amber-500 transition-colors">
					<span className="text-xl">×</span>
				</button>

				<div className="flex items-center gap-3 mb-6">
					<Scroll className="w-8 h-8 text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
					<h2 className="text-3xl font-cinzel font-bold text-amber-50 tracking-widest uppercase">Marta Quest Ledger</h2>
				</div>

                <div className="mb-4 rounded-xl border border-amber-900/30 bg-[#111] p-4 shadow-inner">
                    <h4 className="mb-3 border-b border-amber-900/20 pb-2 font-cinzel text-xs font-bold uppercase tracking-widest text-amber-200">
                        Current Stage
                    </h4>
                    <p className="text-[0.72rem] uppercase tracking-[0.14em] text-stone-300">
                        {testQuestState.replaceAll('_', ' ')}
                    </p>
                    {questFlow?.branch && questFlow.branch !== 'pending' && (
                        <p className="mt-2 text-[0.68rem] uppercase tracking-[0.14em] text-amber-200">
                            Branch: {questFlow.branch}
                        </p>
                    )}
                </div>

				<div className="bg-[#111] border border-amber-900/30 rounded-xl p-4 shadow-inner space-y-2">
					<h4 className="font-cinzel text-amber-200 text-xs tracking-widest uppercase font-bold border-b border-amber-900/20 pb-2 mb-3">Quest Chain</h4>
                    {(questFlow?.scenario.steps || [
                        { step: 'talk_to_marta', title: 'Speak with Old Marta' },
                        { step: 'accept_and_prepay', title: 'Accept quest and prepay adventure' },
                        { step: 'combat_mandatory', title: 'Complete mandatory combat stage' },
                        { step: 'return_to_marta', title: 'Return to Marta with outcome' },
                        { step: 'turn_in', title: 'GM d20 reward resolution and closure' },
                    ]).map((step) => (
                        <div key={step.step} className="flex items-start gap-3 text-sm">
                            <CheckCircle2 className={`w-4 h-4 mt-0.5 ${stepDone(testQuestState, step.step) ? 'text-emerald-500' : 'text-stone-600'}`} />
                            <span className={stepDone(testQuestState, step.step) ? 'text-stone-300' : 'text-stone-500'}>
                                {step.title}
                            </span>
                        </div>
                    ))}
				</div>

				{error && (
					<div className="mt-4 p-3 bg-red-950/30 border border-red-900/50 rounded-lg flex items-start gap-3 text-red-400 text-sm">
						<AlertTriangle className="w-5 h-5 shrink-0" />
						<span className="leading-tight">{error}</span>
					</div>
				)}

                <button
                    onClick={openMartaDialog}
                    disabled={isLoading}
                    className="mt-6 w-full relative group perspective-1000"
                >
                    <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-amber-600 via-amber-400 to-amber-700 opacity-40 group-hover:opacity-100 transition duration-500 blur-sm group-hover:blur-md" />
                    <div className="relative bg-[#050505] border border-amber-900/50 rounded-xl py-4 flex items-center justify-center gap-3 transition-all duration-300 group-hover:bg-[#0a0a0a]">
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Sparkles className="w-5 h-5 text-amber-500" />
                        )}
                        <span className="font-bold font-cinzel tracking-[0.2em] text-amber-50 uppercase shadow-sm">
                            {isLoading ? 'Calling Marta...' : 'Speak With Old Marta'}
                        </span>
                    </div>
                </button>
			</div>
		</div>
	);
}
