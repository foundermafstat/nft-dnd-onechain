import { useState, useEffect } from 'react';
import { Cpu, CheckCircle2, Hexagon, ShieldAlert } from 'lucide-react';

interface ZkDiceOverlayProps {
    rolling: boolean;
    diceType: string;
    result: number | null;
    receipt?: string | null;
    onReset: () => void;
}

export default function ZkDiceOverlay({ rolling, diceType, result, receipt, onReset }: ZkDiceOverlayProps) {
    const [step, setStep] = useState(0);

    // Manage ZK Proof stages visually based on whether we have a real result yet
    useEffect(() => {
        if (!rolling) {
            setStep(0);
            return;
        }

        if (result === null) {
            // Start the loading sequence independently
            setStep(1);
            const timer = setTimeout(() => setStep(2), 1000); // Shift to 'generating'
            return () => clearTimeout(timer);
        } else {
            // As soon as the result arrives, advance to Verify, then Done
            setStep(3); // Verifying Receipt
            const timer = setTimeout(() => setStep(4), 1000); // Done Show Result
            return () => clearTimeout(timer);
        }
    }, [rolling, result]);

    if (!rolling && result === null) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050505]/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-[#0a0a0a] border border-amber-900/40 rounded-2xl w-full max-w-sm overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.15)] relative">

                {/* Background Grid Pattern */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#f59e0b 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>

                {/* Header */}
                <div className="px-6 py-4 border-b border-amber-900/30 flex items-center justify-between bg-gradient-to-r from-amber-900/10 to-transparent">
                    <div className="flex items-center gap-2">
                        <Cpu className={`w-4 h-4 text-emerald-500 ${step > 0 && step < 4 ? 'animate-pulse' : ''}`} />
                        <h4 className="font-cinzel font-bold text-xs uppercase tracking-[0.2em] text-amber-200">ZK Context Execution</h4>
                    </div>
                    {step === 4 && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                </div>

                <div className="p-8 flex flex-col items-center">

                    {/* The 3D Dice / Loader Area */}
                    <div className="w-24 h-24 relative mb-8 flex items-center justify-center">
                        {step < 4 ? (
                            <div className="absolute inset-0 border-4 border-amber-900/30 border-t-amber-500 rounded-full animate-spin"></div>
                        ) : (
                            <div className="absolute inset-0 bg-amber-500/20 rounded-full animate-ping blur-md"></div>
                        )}
                        <div className="text-3xl font-cinzel font-bold text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)] z-10">
                            {step < 4 ? diceType : result}
                        </div>
                    </div>

                    {/* RISC Zero Step Logs */}
                    <div className="w-full space-y-3 font-mono text-[10px] uppercase tracking-wider">

                        <div className={`flex items-center gap-3 transition-opacity duration-300 ${step >= 1 ? 'opacity-100' : 'opacity-30'}`}>
                            <Hexagon className={`w-3 h-3 ${step === 1 ? 'animate-spin text-amber-500' : step > 1 ? 'text-emerald-500' : 'text-stone-600'}`} />
                            <span className={step >= 1 ? 'text-stone-300' : 'text-stone-600'}>
                                Loading RISC Zero Environment
                            </span>
                        </div>

                        <div className={`flex items-center gap-3 transition-opacity duration-300 ${step >= 2 ? 'opacity-100' : 'opacity-30'}`}>
                            <Hexagon className={`w-3 h-3 ${step === 2 ? 'animate-spin text-amber-500' : step > 2 ? 'text-emerald-500' : 'text-stone-600'}`} />
                            <span className={step >= 2 ? 'text-stone-300' : 'text-stone-600'}>
                                Executing off-chain RNG computation
                            </span>
                        </div>

                        <div className={`flex items-center gap-3 transition-opacity duration-300 ${step >= 3 ? 'opacity-100' : 'opacity-30'}`}>
                            <Hexagon className={`w-3 h-3 ${step === 3 ? 'animate-spin text-amber-500' : step > 3 ? 'text-emerald-500' : 'text-stone-600'}`} />
                            <span className={step >= 3 ? 'text-stone-300' : 'text-stone-600'}>
                                Verifying ZK Receipt payload
                            </span>
                        </div>

                    </div>

                    {/* Result Footer */}
                    {step === 4 && (
                        <div className="mt-8 w-full animate-in slide-in-from-bottom-2 fade-in">
                            <div className="bg-[#111] border border-emerald-900/50 rounded-lg p-3 text-center mb-4 text-xs font-inter text-emerald-400/80 break-all overflow-hidden h-10">
                                {receipt ? `0x${receipt.substring(0, 60)}...` : 'Verifying Cryptographic Proof...'}
                            </div>
                            <button
                                onClick={onReset}
                                className="w-full py-3 bg-gradient-to-r from-amber-800 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-amber-50 rounded-xl font-cinzel font-bold text-xs tracking-widest uppercase transition-colors"
                            >
                                Continue
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
