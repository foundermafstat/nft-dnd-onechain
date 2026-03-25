'use client';

import { useEffect, useState } from 'react';
import { fetchQuests, Quest } from '@/lib/questApi';
import Link from 'next/link';
import { Skull, Trophy, Loader2, Scroll, Swords, ChevronRight } from 'lucide-react';

export default function QuestsPage() {
    const [quests, setQuests] = useState<Quest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchQuests()
            .then(setQuests)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const statusIcon = (status: string) => {
        if (status === 'Success') return <Trophy className="w-5 h-5 text-amber-400" />;
        if (status === 'PartyWiped') return <Skull className="w-5 h-5 text-red-500" />;
        return <Swords className="w-5 h-5 text-stone-400 animate-pulse" />;
    };

    const statusLabel = (status: string) => {
        if (status === 'Success') return 'Victory';
        if (status === 'PartyWiped') return 'Total Party Kill';
        return 'In Progress';
    };

    const statusColor = (status: string) => {
        if (status === 'Success') return 'text-amber-400';
        if (status === 'PartyWiped') return 'text-red-400';
        return 'text-stone-400';
    };

    if (loading) {
        return (
            <main className="flex items-center justify-center h-screen bg-[#0a0806]">
                <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#0a0806] text-stone-200 overflow-auto">
            {/* Hero Header */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-amber-900/20 via-transparent to-transparent pointer-events-none" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-amber-600/5 rounded-full blur-[120px]" />
                <div className="relative max-w-4xl mx-auto px-6 pt-16 pb-10">
                    <div className="flex items-center gap-3 mb-4">
                        <Scroll className="w-8 h-8 text-amber-600" />
                        <h1 className="text-4xl font-serif font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-amber-200 via-amber-500 to-orange-800">
                            The Chronicle
                        </h1>
                    </div>
                    <p className="text-stone-500 font-serif text-sm max-w-lg leading-relaxed">
                        Every quest etches its tale into the annals of fate. Here lie the records of courage, folly, and the eternal
                        struggle against the dark.
                    </p>
                </div>
            </div>

            {/* Quest List */}
            <div className="max-w-4xl mx-auto px-6 pb-20">
                {quests.length === 0 ? (
                    <div className="text-center py-20 border border-stone-800/50 rounded-2xl bg-[#0e0b08]">
                        <Scroll className="w-12 h-12 text-stone-700 mx-auto mb-4" />
                        <p className="text-stone-600 font-serif text-lg">No quests have been recorded yet.</p>
                        <p className="text-stone-700 font-serif text-sm mt-1">Begin your first adventure to see it chronicled here.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {quests.map((quest, idx) => (
                            <Link
                                key={quest.id}
                                href={`/quests/${quest.id}`}
                                className="group block"
                            >
                                <div className="relative bg-[#12100d] border border-stone-800/50 rounded-xl p-5 hover:border-amber-800/40 transition-all duration-300 hover:bg-[#16130f] overflow-hidden">
                                    {/* Glow line on top */}
                                    <div className={`absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent ${quest.status === 'Success' ? 'via-amber-600/40' : quest.status === 'PartyWiped' ? 'via-red-600/40' : 'via-stone-600/30'} to-transparent`} />

                                    <div className="flex items-center gap-4">
                                        {/* Icon */}
                                        <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${quest.status === 'Success' ? 'bg-amber-900/20 border border-amber-800/30' : quest.status === 'PartyWiped' ? 'bg-red-900/20 border border-red-800/30' : 'bg-stone-800/30 border border-stone-700/30'}`}>
                                            {statusIcon(quest.status)}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-baseline gap-2 mb-1">
                                                <span className="font-serif font-bold text-stone-200 text-lg">
                                                    Quest #{idx + 1}
                                                </span>
                                                <span className={`text-xs font-mono uppercase tracking-widest ${statusColor(quest.status)}`}>
                                                    {statusLabel(quest.status)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-stone-600 font-mono">
                                                <span>{new Date(quest.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                {quest.loot_dropped && (
                                                    <span className="text-amber-700 flex items-center gap-1">
                                                        ✦ Loot Acquired
                                                    </span>
                                                )}
                                                <span>{quest.party_members?.length || 0} heroes</span>
                                            </div>
                                        </div>

                                        {/* Arrow */}
                                        <ChevronRight className="w-5 h-5 text-stone-700 group-hover:text-amber-500 transition-colors flex-shrink-0" />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
