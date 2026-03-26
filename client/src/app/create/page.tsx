'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Dices, Save, Sparkles, Minus, Plus, ChevronDown } from 'lucide-react';
import { HeroClass, Ancestry, ANCESTRIES, calculateModifier } from 'shared';
import { useAuth } from '@/context/AuthContext';
import { SERVER_URL } from '@/lib/config';


function StatRow({ label, value, min, max, availablePoints, onChange }: { label: string; value: number, min: number, max: number, availablePoints: number, onChange: (val: number) => void }) {
    const mod = calculateModifier(value);
    const modStr = mod > 0 ? `+${mod}` : mod.toString();
    const colorClass = mod > 0 ? 'text-primary' : mod < 0 ? 'text-destructive' : 'text-muted-foreground';

    const canDecrease = value > min;
    const canIncrease = value < max && availablePoints > 0;

    return (
        <div className="flex items-center justify-between py-3 border-b border-amber-900/20">
            <div className="flex flex-col">
                <span className="font-cinzel text-sm uppercase tracking-widest text-amber-700/80 font-bold">{label}</span>
                <span className="text-[10px] text-stone-500 font-inter">Min: {min} / Max: {max}</span>
            </div>
            <div className="flex items-center gap-4">
                <button
                    onClick={() => canDecrease && onChange(value - 1)}
                    disabled={!canDecrease}
                    className="p-1.5 hover:bg-amber-900/20 rounded-md text-stone-400 hover:text-amber-400 border border-transparent hover:border-amber-900/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <Minus className="w-4 h-4" />
                </button>

                <span className="font-cinzel font-bold text-2xl text-amber-50 w-8 text-center drop-shadow-sm">{value}</span>

                <button
                    onClick={() => canIncrease && onChange(value + 1)}
                    disabled={!canIncrease}
                    className="p-1.5 hover:bg-amber-900/20 rounded-md text-stone-400 hover:text-amber-400 border border-transparent hover:border-amber-900/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <Plus className="w-4 h-4" />
                </button>

                <span className={`font-inter font-semibold text-sm min-w-[30px] text-right ${colorClass}`}>{modStr}</span>
            </div>
        </div>
    );
}

export default function CreateHeroPage() {
    const router = useRouter();
    const { playerId, isLoading } = useAuth();

    // Form state
    const [name, setName] = useState('');
    const [selectedAncestry, setSelectedAncestry] = useState<Ancestry>(Ancestry.Human);
    const [selectedClass, setSelectedClass] = useState<HeroClass>(HeroClass.Fighter);
    const [alignment, setAlignment] = useState('Neutral');
    const [background, setBackground] = useState('');

    // Stats state
    const [stats, setStats] = useState({ str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 });
    const [isSaving, setIsSaving] = useState(false);

    const TOTAL_POINTS = 72;

    const limits = useMemo(() => {
        const l = {
            str: { min: 3, max: 18 },
            dex: { min: 3, max: 18 },
            con: { min: 3, max: 18 },
            int: { min: 3, max: 18 },
            wis: { min: 3, max: 18 },
            cha: { min: 3, max: 18 },
        };

        if (selectedClass === HeroClass.Fighter) l.str.min = 12;
        if (selectedClass === HeroClass.Priest) l.wis.min = 12;
        if (selectedClass === HeroClass.Thief) l.dex.min = 12;
        if (selectedClass === HeroClass.Wizard) l.int.min = 12;

        switch (selectedAncestry) {
            case Ancestry.Dwarf:
                l.con.min = Math.max(l.con.min, 10);
                l.dex.max = Math.min(l.dex.max, 14);
                break;
            case Ancestry.Elf:
                l.dex.min = Math.max(l.dex.min, 10);
                l.con.max = Math.min(l.con.max, 14);
                break;
            case Ancestry.Goblin:
                l.str.max = Math.min(l.str.max, 12);
                break;
            case Ancestry.Halfling:
                l.str.max = Math.min(l.str.max, 10);
                break;
            case Ancestry.HalfOrc:
                l.str.min = Math.max(l.str.min, 10);
                l.int.max = Math.min(l.int.max, 14);
                break;
            case Ancestry.Human:
                break;
        }
        return l;
    }, [selectedAncestry, selectedClass]);

    useEffect(() => {
        setStats(prev => {
            const next = { ...prev };
            let changed = false;
            for (const key of Object.keys(next) as Array<keyof typeof next>) {
                if (next[key] < limits[key].min) {
                    next[key] = limits[key].min;
                    changed = true;
                }
                if (next[key] > limits[key].max) {
                    next[key] = limits[key].max;
                    changed = true;
                }
            }
            return changed ? next : prev;
        });
    }, [limits]);

    const currentPoints = Object.values(stats).reduce((a, b) => a + b, 0);
    const availablePoints = TOTAL_POINTS - currentPoints;

    // AI Generation State
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (!isLoading && !playerId) {
            router.push('/');
        }
    }, [isLoading, playerId, router]);

    const handleStatChange = (stat: keyof typeof stats, value: number) => {
        setStats(prev => ({ ...prev, [stat]: value }));
    };

    const generateWithAI = async () => {
        if (!aiPrompt.trim()) return alert("Please enter a short prompt describing your hero.");

        setIsGenerating(true);
        try {

            const response = await fetch(`${SERVER_URL}/api/character/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: aiPrompt })
            });

            if (!response.ok) throw new Error("AI Generation Failed");
            const data = await response.json();

            if (data.success && data.character) {
                const c = data.character;
                setName(c.name || '');
                if (Object.values(Ancestry).includes(c.ancestry)) setSelectedAncestry(c.ancestry as Ancestry);
                if (Object.values(HeroClass).includes(c.class)) setSelectedClass(c.class as HeroClass);
                if (c.alignment) setAlignment(c.alignment);
                if (c.background) setBackground(c.background);
                if (c.stats) {
                    setStats({
                        str: c.stats.str || 10,
                        dex: c.stats.dex || 10,
                        con: c.stats.con || 10,
                        int: c.stats.int || 10,
                        wis: c.stats.wis || 10,
                        cha: c.stats.cha || 10,
                    });
                }
            }
        } catch (error) {
            console.error(error);
            alert("Failed to generate hero. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) return alert("Hero Name is required.");
        if (availablePoints !== 0) return alert("You must allocate all attribute points.");

        setIsSaving(true);
        // Base HP starts as roughly max of the class hit die. Let's do a strict approximation.
        let baseHp = 4;
        if (selectedClass === HeroClass.Fighter) baseHp = 8;
        if (selectedClass === HeroClass.Priest) baseHp = 6;

        const conMod = calculateModifier(stats.con);
        let maxHp = Math.max(1, baseHp + conMod);

        // Dwarf Stout feature gives +2 HP
        if (selectedAncestry === Ancestry.Dwarf) maxHp += 2;

        // Base AC = 10 + DEX mod
        const ac = 10 + calculateModifier(stats.dex);

        try {

            const response = await fetch(`${SERVER_URL}/api/character/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    playerId,
                    name,
                    ancestry: selectedAncestry,
                    class: selectedClass,
                    alignment,
                    background,
                    stats,
                    hp_current: maxHp,
                    hp_max: maxHp,
                    ac
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to create character');
            }

            // Redirect to game
            router.push('/game');
        } catch (error: any) {
            console.error(error);
            alert(`Error: ${error.message}`);
            setIsSaving(false);
        }
    };

    return (
        <div className="absolute inset-0 w-full h-full bg-[#050505] text-amber-50 overflow-y-auto custom-scrollbar selection:bg-amber-900/50 selection:text-amber-100 font-inter">
            {/* Background Texture */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(245,158,11,0.05)_0%,_transparent_100%)] pointer-events-none fixed"></div>

            <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">

                {/* Header */}
                <div className="flex items-center justify-between mb-12 border-b border-amber-900/30 pb-6">
                    <button onClick={() => router.push('/')} className="flex items-center gap-2 text-stone-400 hover:text-amber-400 transition-colors bg-[#0a0a0a] px-5 py-2.5 rounded-full border border-amber-900/30 hover:border-amber-500/50 group">
                        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="font-cinzel text-xs font-bold uppercase tracking-widest">Flee to Hub</span>
                    </button>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-widest font-cinzel text-amber-50 drop-shadow-[0_2px_10px_rgba(245,158,11,0.3)] uppercase">Forge Your Hero</h1>
                    <div className="w-[140px]"></div> {/* Spacer for symmetry */}
                </div>

                {/* AI Generator Section */}
                <div className="mb-10 bg-[#0a0a0a] border border-amber-900/30 rounded-2xl p-8 shadow-[0_10px_30px_rgba(0,0,0,0.8)] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[100px] rounded-full pointer-events-none translate-x-1/2 -translate-y-1/2 group-hover:bg-amber-500/10 transition-colors duration-700"></div>
                    <div className="flex flex-col md:flex-row gap-5 items-end relative z-10">
                        <div className="flex-1 w-full relative">
                            <label className="block text-xs font-cinzel font-bold tracking-[0.2em] text-amber-500 uppercase mb-3 flex items-center gap-2">
                                <Sparkles className="w-4 h-4 drop-shadow-[0_0_5px_rgba(245,158,11,0.8)]" />
                                Generate with AI
                            </label>
                            <input
                                type="text"
                                value={aiPrompt}
                                onChange={e => setAiPrompt(e.target.value)}
                                placeholder="Describe your hero... e.g. 'A grumpy dwarven priest who worships the god of forge'."
                                className="w-full bg-[#050505] border border-amber-900/30 rounded-xl px-5 py-4 font-inter text-amber-50 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all shadow-inner"
                            />
                        </div>
                        <button
                            onClick={generateWithAI}
                            disabled={isGenerating || !aiPrompt.trim()}
                            className="px-8 py-4 bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-500 text-amber-50 border border-amber-500/50 rounded-xl font-bold font-cinzel tracking-[0.15em] uppercase shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_25px_rgba(245,158,11,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 whitespace-nowrap"
                        >
                            {isGenerating ? 'Weaving Spell...' : 'Generate Profile'}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                    {/* LEFT COLUMN: Choices */}
                    <div className="lg:col-span-7 space-y-8">

                        {/* Core Details (Name, Alignment, Background) */}
                        <div className="bg-[#0a0a0a] border border-amber-900/30 rounded-2xl p-8 shadow-[0_10px_30px_rgba(0,0,0,0.8)] relative overflow-hidden space-y-6">
                            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"></div>

                            <div>
                                <label className="block text-xs font-cinzel font-bold tracking-[0.2em] text-amber-500 uppercase mb-3">Hero Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Enter a legendary name..."
                                    className="w-full bg-[#050505] border border-amber-900/30 rounded-xl px-5 py-4 text-2xl font-cinzel font-bold text-amber-50 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all shadow-inner"
                                    maxLength={32}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-cinzel font-bold tracking-[0.2em] text-amber-500 uppercase mb-3">Alignment</label>
                                    <div className="relative">
                                        <select
                                            value={alignment}
                                            onChange={e => setAlignment(e.target.value)}
                                            className="w-full bg-[#050505] border border-amber-900/30 rounded-xl px-5 py-4 font-inter text-amber-50 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all appearance-none shadow-inner"
                                        >
                                            <option value="Lawful">Lawful</option>
                                            <option value="Neutral">Neutral</option>
                                            <option value="Chaotic">Chaotic</option>
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-cinzel font-bold tracking-[0.2em] text-amber-500 uppercase mb-3">Background Origin</label>
                                <textarea
                                    value={background}
                                    onChange={e => setBackground(e.target.value)}
                                    placeholder="Where did this hero come from?"
                                    className="w-full bg-[#050505] border border-amber-900/30 rounded-xl px-5 py-4 font-inter text-amber-50 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all h-28 resize-none custom-scrollbar shadow-inner"
                                />
                            </div>
                        </div>

                        {/* Ancestry Selection */}
                        <div className="bg-[#0a0a0a] border border-amber-900/30 rounded-2xl p-8 shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
                            <h2 className="text-2xl font-cinzel font-bold mb-6 text-amber-50 uppercase tracking-wider">Ancestry</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                                {(Object.values(Ancestry) as Ancestry[]).map((anc) => (
                                    <button
                                        key={anc}
                                        onClick={() => setSelectedAncestry(anc)}
                                        className={`px-4 py-4 rounded-xl border text-sm font-cinzel font-bold tracking-widest uppercase transition-all duration-300 ${selectedAncestry === anc ? 'bg-amber-500/10 text-amber-400 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-[#050505] text-stone-400 border-amber-900/20 hover:border-amber-900/50 hover:text-stone-200'}`}
                                    >
                                        {ANCESTRIES[anc].name}
                                    </button>
                                ))}
                            </div>

                            {/* Selected Ancestry Details */}
                            <div className="bg-[#050505] border border-amber-900/30 rounded-xl p-6 shadow-inner relative overflow-hidden">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-amber-500/50 to-transparent"></div>
                                <div className="flex items-center gap-4 mb-3">
                                    <h3 className="text-xl font-cinzel font-bold text-amber-50 drop-shadow-sm">{ANCESTRIES[selectedAncestry].name}</h3>
                                    <span className="px-2.5 py-1 rounded text-[10px] font-cinzelfont-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                        Trait: {ANCESTRIES[selectedAncestry].feature}
                                    </span>
                                </div>
                                <p className="text-sm text-stone-400 font-inter leading-relaxed mb-4">
                                    {ANCESTRIES[selectedAncestry].description}
                                </p>
                                <div className="text-xs font-cinzel tracking-widest text-amber-700/80">
                                    <span className="font-bold">LANGUAGES:</span> <span className="text-stone-300 font-inter tracking-normal">{ANCESTRIES[selectedAncestry].languages.join(', ')}</span>
                                </div>
                            </div>
                        </div>

                        {/* Class Selection */}
                        <div className="bg-[#0a0a0a] border border-amber-900/30 rounded-2xl p-8 shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
                            <h2 className="text-2xl font-cinzel font-bold mb-6 text-amber-50 uppercase tracking-wider">Class</h2>
                            <div className="grid grid-cols-2 gap-5">
                                {(Object.values(HeroClass) as HeroClass[]).map((hc) => (
                                    <button
                                        key={hc}
                                        onClick={() => setSelectedClass(hc)}
                                        className={`flex flex-col items-center justify-center p-6 rounded-xl border transition-all duration-300 ${selectedClass === hc ? 'bg-amber-500/10 text-amber-400 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-[#050505] text-stone-400 border-amber-900/20 hover:border-amber-900/50 hover:text-stone-200'}`}
                                    >
                                        <span className="text-xl font-cinzel font-bold mb-2 uppercase tracking-widest">{hc}</span>
                                        <span className={`text-xs font-inter opacity-80 text-center px-2 ${selectedClass === hc ? 'text-amber-100/90' : 'text-stone-500'}`}>
                                            {hc === 'Fighter' ? 'd8 HP • Any Weapon' : hc === 'Priest' ? 'd6 HP • Divine Magic' : hc === 'Thief' ? 'd4 HP • Stealth & Finesse' : 'd4 HP • Arcane Magic'}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* RIGHT COLUMN: Stats & Action */}
                    <div className="lg:col-span-5 space-y-8">

                        {/* Stats Panel */}
                        <div className="bg-[#0a0a0a] border border-amber-900/30 rounded-2xl p-8 shadow-[0_10px_30px_rgba(0,0,0,0.8)] relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/5 blur-[80px] rounded-full pointer-events-none"></div>

                            <div className="flex items-start justify-between mb-8">
                                <div>
                                    <h2 className="text-2xl font-cinzel font-bold text-amber-50 uppercase tracking-wider">Attributes</h2>
                                    <p className="text-xs text-stone-500 font-inter mt-2 leading-relaxed">Customize your fundamental capabilities</p>
                                </div>
                                <div className={`px-4 py-2 rounded-lg border text-xs font-cinzel font-bold tracking-[0.15em] uppercase shadow-inner flex items-center gap-2 ${availablePoints > 0 ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.1)]' : availablePoints < 0 ? 'bg-red-900/20 border-red-500/50 text-red-400' : 'bg-[#050505] border-amber-900/30 text-stone-400'}`}>
                                    <Sparkles className="w-4 h-4" />
                                    {availablePoints > 0 ? `${availablePoints} Pts Available` : availablePoints < 0 ? `Over budget: ${Math.abs(availablePoints)}` : 'Points Assigned'}
                                </div>
                            </div>

                            <div className="space-y-1 bg-[#050505] p-5 rounded-xl border border-amber-900/20 shadow-inner">
                                <StatRow label="STR" value={stats.str} min={limits.str.min} max={limits.str.max} availablePoints={availablePoints} onChange={(v) => handleStatChange('str', v)} />
                                <StatRow label="DEX" value={stats.dex} min={limits.dex.min} max={limits.dex.max} availablePoints={availablePoints} onChange={(v) => handleStatChange('dex', v)} />
                                <StatRow label="CON" value={stats.con} min={limits.con.min} max={limits.con.max} availablePoints={availablePoints} onChange={(v) => handleStatChange('con', v)} />
                                <StatRow label="INT" value={stats.int} min={limits.int.min} max={limits.int.max} availablePoints={availablePoints} onChange={(v) => handleStatChange('int', v)} />
                                <StatRow label="WIS" value={stats.wis} min={limits.wis.min} max={limits.wis.max} availablePoints={availablePoints} onChange={(v) => handleStatChange('wis', v)} />
                                <StatRow label="CHA" value={stats.cha} min={limits.cha.min} max={limits.cha.max} availablePoints={availablePoints} onChange={(v) => handleStatChange('cha', v)} />
                            </div>
                        </div>

                        {/* Summary Block */}
                        <div className="bg-[#0a0a0a] border border-amber-900/30 rounded-2xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.9)] relative overflow-hidden backdrop-blur-xl group hover:border-amber-500/40 transition-colors duration-500">
                            <h3 className="text-xs font-cinzel tracking-[0.2em] text-amber-500 font-bold uppercase mb-6 text-center">Hero Summary</h3>

                            <div className="flex justify-between items-end mb-10 border-b border-amber-900/30 pb-6">
                                <div>
                                    <div className="text-3xl font-cinzel font-bold text-amber-50 mb-2 drop-shadow-sm">{name || 'Unnamed'}</div>
                                    <div className="text-stone-400 font-inter text-sm flex items-center gap-2">
                                        <span className="text-amber-700/80">LVL 1</span>
                                        <span className="w-1 h-1 rounded-full bg-stone-600"></span>
                                        {alignment} {selectedAncestry} {selectedClass}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={isSaving || availablePoints !== 0 || !name.trim()}
                                className="w-full relative group perspective-1000 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="absolute -inset-[2px] rounded-xl bg-gradient-to-r from-amber-600 via-amber-400 to-amber-700 opacity-40 group-hover:opacity-100 transition duration-700 blur-[8px] group-hover:blur-[12px]"></div>
                                <div className="relative bg-[#050505] border border-amber-900/50 rounded-xl py-5 flex items-center justify-center gap-4 transition-all duration-500 group-hover:bg-[#0a0a0a] shadow-inner transform group-active:scale-[0.98]">
                                    <Save className="w-5 h-5 text-amber-500 group-hover:text-amber-400 transition-colors duration-500" />
                                    <span className="font-bold font-cinzel tracking-[0.2em] text-amber-50 uppercase drop-shadow-sm">
                                        {isSaving ? 'Forging...' : 'Enter the Dungeon'}
                                    </span>
                                </div>
                            </button>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
}
