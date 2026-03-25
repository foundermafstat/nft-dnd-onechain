'use client';

interface TooltipProps {
    x: number;
    y: number;
    name: string;
    title?: string;
    level?: number;
    type: 'player' | 'npc';
}

export default function Tooltip({ x, y, name, title, level, type }: TooltipProps) {
    const borderColor = type === 'npc' ? 'border-amber-500/40' : 'border-sky-500/40';
    const accentColor = type === 'npc' ? 'text-amber-400' : 'text-sky-400';
    const dotColor = type === 'npc' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]' : 'bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.8)]';
    const glowColor = type === 'npc' ? 'shadow-[0_10px_30px_rgba(245,158,11,0.15)]' : 'shadow-[0_10px_30px_rgba(14,165,233,0.15)]';

    return (
        <div
            className="absolute z-40 pointer-events-none animate-in fade-in duration-200"
            style={{ left: x, top: y - 60, transform: 'translateX(-50%)' }}
        >
            <div className={`bg-[#050505]/95 border ${borderColor} rounded-xl px-4 py-2 ${glowColor} backdrop-blur-md relative overflow-hidden`}>
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent"></div>

                <div className="flex items-center gap-2 relative z-10">
                    <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                    <span className={`${accentColor} text-sm font-cinzel font-bold tracking-widest uppercase whitespace-nowrap drop-shadow-md`}>{name}</span>
                </div>

                {(title || level) && (
                    <div className="text-[10px] text-stone-400 font-inter font-medium tracking-wide whitespace-nowrap mt-1 relative z-10 opacity-90">
                        {title && <span>{title}</span>}
                        {title && level && <span> · </span>}
                        {level && <span>Lv. {level}</span>}
                    </div>
                )}
            </div>

            {/* Arrow */}
            <div className={`w-3 h-3 bg-[#050505] border-r ${borderColor} border-b rotate-45 mx-auto -mt-1.5 shadow-[2px_2px_5px_rgba(0,0,0,0.5)]`} />
        </div>
    );
}
