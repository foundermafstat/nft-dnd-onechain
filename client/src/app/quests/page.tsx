'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2, Scroll, Skull, Swords, Trophy, ChevronRight } from 'lucide-react';
import { fetchQuests, Quest } from '@/lib/questApi';

const panelClass =
  'rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,20,24,0.9),rgba(11,11,14,0.95))] shadow-[0_18px_36px_rgba(0,0,0,0.42)] backdrop-blur';

function statusMeta(status: string) {
  if (status === 'Success') {
    return {
      label: 'Victory',
      icon: <Trophy className="h-4 w-4 text-amber-200" />,
      badge: 'border-amber-300/35 bg-amber-300/[0.1] text-amber-200',
      iconBox: 'border-amber-300/30 bg-amber-300/[0.08]',
      topLine: 'from-transparent via-amber-300/40 to-transparent',
    };
  }
  if (status === 'PartyWiped') {
    return {
      label: 'Party Wiped',
      icon: <Skull className="h-4 w-4 text-rose-200" />,
      badge: 'border-rose-300/35 bg-rose-300/[0.1] text-rose-200',
      iconBox: 'border-rose-300/30 bg-rose-300/[0.08]',
      topLine: 'from-transparent via-rose-300/40 to-transparent',
    };
  }
  return {
    label: 'In Progress',
    icon: <Swords className="h-4 w-4 animate-pulse text-sky-200" />,
    badge: 'border-sky-300/35 bg-sky-300/[0.1] text-sky-200',
    iconBox: 'border-sky-300/30 bg-sky-300/[0.08]',
    topLine: 'from-transparent via-sky-300/35 to-transparent',
  };
}

export default function QuestsPage() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuests()
      .then(setQuests)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const summary = useMemo(() => {
    const total = quests.length;
    const victories = quests.filter((q) => q.status === 'Success').length;
    const wipes = quests.filter((q) => q.status === 'PartyWiped').length;
    const active = total - victories - wipes;
    return { total, victories, wipes, active };
  }, [quests]);

  if (loading) {
    return (
      <main className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-300" />
      </main>
    );
  }

  return (
    <main className="relative h-full overflow-y-auto custom-scrollbar">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(214,172,93,0.08),transparent_30%),radial-gradient(circle_at_92%_14%,rgba(102,130,168,0.08),transparent_32%)]" />
      <div className="relative z-10 mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10">
        <header className={`${panelClass} mb-7 p-5 md:p-6`}>
          <div className="mb-3 flex items-center gap-2 text-[0.64rem] uppercase tracking-[0.24em] text-stone-500">
            <Scroll className="h-3.5 w-3.5" />
            Campaign Chronicle
          </div>
          <h1 className="font-cinzel text-2xl uppercase tracking-[0.12em] text-stone-100 md:text-[1.9rem]">
            Quest Archive
          </h1>
          <p className="mt-2 max-w-2xl text-[0.82rem] leading-6 text-stone-400">
            История прохождений, AI-событий и результатов каждой экспедиции. Здесь фиксируется прогресс,
            который влияет на развитие лора и NFT-награды.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
              <p className="text-[0.6rem] uppercase tracking-[0.2em] text-stone-500">Total</p>
              <p className="mt-1 font-cinzel text-xl text-stone-100">{summary.total}</p>
            </div>
            <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.05] px-3 py-2">
              <p className="text-[0.6rem] uppercase tracking-[0.2em] text-amber-200/75">Victories</p>
              <p className="mt-1 font-cinzel text-xl text-amber-100">{summary.victories}</p>
            </div>
            <div className="rounded-xl border border-sky-300/20 bg-sky-300/[0.05] px-3 py-2">
              <p className="text-[0.6rem] uppercase tracking-[0.2em] text-sky-200/75">In Progress</p>
              <p className="mt-1 font-cinzel text-xl text-sky-100">{summary.active}</p>
            </div>
            <div className="rounded-xl border border-rose-300/20 bg-rose-300/[0.05] px-3 py-2">
              <p className="text-[0.6rem] uppercase tracking-[0.2em] text-rose-200/75">Wipes</p>
              <p className="mt-1 font-cinzel text-xl text-rose-100">{summary.wipes}</p>
            </div>
          </div>
        </header>

        {quests.length === 0 ? (
          <section className={`${panelClass} py-18 px-6 text-center`}>
            <Scroll className="mx-auto mb-4 h-10 w-10 text-stone-600" />
            <h2 className="font-cinzel text-xl uppercase tracking-[0.1em] text-stone-200">No quests yet</h2>
            <p className="mt-2 text-[0.82rem] text-stone-500">
              Начните первое приключение, чтобы хроника заполнилась событиями.
            </p>
          </section>
        ) : (
          <section className="space-y-3 pb-6">
            {quests.map((quest, idx) => {
              const status = statusMeta(quest.status);
              return (
                <Link key={quest.id} href={`/quests/${quest.id}`} className="group block">
                  <article
                    className={`${panelClass} relative overflow-hidden px-4 py-4 transition duration-200 hover:border-white/20 hover:bg-[linear-gradient(180deg,rgba(24,24,28,0.92),rgba(12,12,16,0.96))] md:px-5`}
                  >
                    <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${status.topLine}`} />
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg border ${status.iconBox}`}
                      >
                        {status.icon}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <h3 className="font-cinzel text-[0.95rem] uppercase tracking-[0.11em] text-stone-100">
                            Quest #{idx + 1}
                          </h3>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[0.58rem] uppercase tracking-[0.18em] ${status.badge}`}
                          >
                            {status.label}
                          </span>
                          {quest.loot_dropped && (
                            <span className="rounded-full border border-emerald-300/35 bg-emerald-300/[0.1] px-2 py-0.5 text-[0.58rem] uppercase tracking-[0.18em] text-emerald-200">
                              Loot minted
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[0.69rem] uppercase tracking-[0.12em] text-stone-500">
                          <span>
                            {new Date(quest.start_time).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                          <span>{quest.party_members?.length || 0} heroes</span>
                        </div>
                      </div>

                      <ChevronRight className="h-5 w-5 text-stone-600 transition group-hover:text-amber-200" />
                    </div>
                  </article>
                </Link>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
