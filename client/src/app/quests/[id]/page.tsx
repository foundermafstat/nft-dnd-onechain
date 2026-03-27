'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Dice1,
  Loader2,
  ScrollText,
  Skull,
  Sparkles,
  Swords,
  Trophy,
} from 'lucide-react';
import {
  fetchQuestById,
  fetchQuestHistory,
  fetchQuestRewardTx,
  Quest,
  QuestHistoryEntry,
  QuestRewardTx,
} from '@/lib/questApi';
import { buildTxExplorerUrl } from '@/lib/onechainExplorer';

const panelClass =
  'rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,20,24,0.9),rgba(11,11,14,0.95))] shadow-[0_18px_36px_rgba(0,0,0,0.42)] backdrop-blur';

function RollBadge({ roll, label }: { roll: number | null; label: string }) {
  if (roll === null || roll === undefined) return null;
  const isNat20 = roll === 20;
  const isNat1 = roll === 1;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.16em]
        ${
          isNat20
            ? 'border-amber-300/35 bg-amber-300/[0.1] text-amber-100'
            : isNat1
              ? 'border-rose-300/35 bg-rose-300/[0.1] text-rose-100'
              : 'border-white/12 bg-white/[0.03] text-stone-300'
        }`}
    >
      <Dice1 className="h-3 w-3" />
      {label}: {roll}
      {isNat20 && <Sparkles className="h-3 w-3 text-amber-200" />}
      {isNat1 && <Skull className="h-3 w-3 text-rose-200" />}
    </span>
  );
}

function EngineTriggerBadge({ trigger }: { trigger: string | null }) {
  if (!trigger || trigger === 'none') return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-sky-300/25 bg-sky-300/[0.08] px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.16em] text-sky-200">
      {trigger.replace(/_/g, ' ')}
    </span>
  );
}

export default function QuestLandingPage() {
  const params = useParams();
  const questId = params?.id as string;

  const [quest, setQuest] = useState<Quest | null>(null);
  const [history, setHistory] = useState<QuestHistoryEntry[]>([]);
  const [rewards, setRewards] = useState<QuestRewardTx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!questId) return;
    Promise.all([fetchQuestById(questId), fetchQuestHistory(questId), fetchQuestRewardTx(questId)])
      .then(([q, h, rewardRows]) => {
        setQuest(q);
        setHistory(h);
        setRewards(rewardRows || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [questId]);

  const chainEvents = useMemo(() => history.filter((h) => h.on_chain_event), [history]);

  if (loading) {
    return (
      <main className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-300" />
      </main>
    );
  }

  if (!quest) {
    return (
      <main className="flex h-full flex-col items-center justify-center gap-3 text-stone-400">
        <Skull className="h-10 w-10 text-stone-600" />
        <p className="text-[0.92rem]">This quest has been lost to the void.</p>
        <Link
          href="/quests"
          className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/[0.08] px-3 py-1.5 text-[0.64rem] uppercase tracking-[0.18em] text-amber-100"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Chronicle
        </Link>
      </main>
    );
  }

  const isSuccess = quest.status === 'Success';
  const isWiped = quest.status === 'PartyWiped';

  return (
    <main className="relative h-full overflow-y-auto custom-scrollbar">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(214,172,93,0.08),transparent_30%),radial-gradient(circle_at_92%_14%,rgba(102,130,168,0.08),transparent_32%)]" />
      <div className="relative z-10 mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10">
        <header className={`${panelClass} mb-6 p-5 md:p-6`}>
          <Link
            href="/quests"
            className="mb-4 inline-flex items-center gap-1 text-[0.6rem] uppercase tracking-[0.2em] text-stone-500 transition-colors hover:text-amber-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Chronicle
          </Link>
          <div className="mb-3 flex items-center gap-2 text-[0.64rem] uppercase tracking-[0.24em] text-stone-500">
            <ScrollText className="h-3.5 w-3.5" /> Quest Detail
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-cinzel text-2xl uppercase tracking-[0.12em] text-stone-100 md:text-[1.8rem]">
              {isSuccess ? 'Victory Chronicle' : isWiped ? 'Party Wipe Chronicle' : 'Quest In Progress'}
            </h1>
            <span
              className={`rounded-full border px-2.5 py-1 text-[0.58rem] uppercase tracking-[0.18em] ${
                isSuccess
                  ? 'border-amber-300/35 bg-amber-300/[0.1] text-amber-200'
                  : isWiped
                    ? 'border-rose-300/35 bg-rose-300/[0.1] text-rose-200'
                    : 'border-sky-300/35 bg-sky-300/[0.1] text-sky-200'
              }`}
            >
              {isSuccess ? 'Success' : isWiped ? 'PartyWiped' : 'InProgress'}
            </span>
          </div>
          <p className="mt-2 text-[0.76rem] uppercase tracking-[0.14em] text-stone-500">
            {new Date(quest.start_time).toLocaleString()}
            {quest.end_time ? `  →  ${new Date(quest.end_time).toLocaleString()}` : ''}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
              <p className="text-[0.58rem] uppercase tracking-[0.18em] text-stone-500">Heroes</p>
              <p className="mt-1 font-cinzel text-xl text-stone-100">{quest.party_members?.length || 0}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
              <p className="text-[0.58rem] uppercase tracking-[0.18em] text-stone-500">Entries</p>
              <p className="mt-1 font-cinzel text-xl text-stone-100">{history.length}</p>
            </div>
            <div className="rounded-xl border border-indigo-300/20 bg-indigo-300/[0.05] px-3 py-2">
              <p className="text-[0.58rem] uppercase tracking-[0.18em] text-indigo-200/80">On-Chain</p>
              <p className="mt-1 font-cinzel text-xl text-indigo-100">{chainEvents.length}</p>
            </div>
            <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.05] px-3 py-2">
              <p className="text-[0.58rem] uppercase tracking-[0.18em] text-emerald-200/80">Reward TX</p>
              <p className="mt-1 font-cinzel text-xl text-emerald-100">{rewards.length}</p>
            </div>
          </div>
        </header>

        {rewards.length > 0 && (
          <section className={`${panelClass} mb-6 p-5`}>
            <div className="mb-3 flex items-center gap-2 text-[0.62rem] uppercase tracking-[0.22em] text-emerald-300/80">
              <Sparkles className="h-3.5 w-3.5" /> Reward Transactions
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {rewards.map((reward) => {
                const txUrl = buildTxExplorerUrl(reward.tx_hash);
                return (
                  <article
                    key={`${reward.item_id}-${reward.tx_hash}`}
                    className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3"
                  >
                    <p className="font-cinzel text-[0.9rem] uppercase tracking-[0.08em] text-stone-100">
                      {reward.item_name}
                    </p>
                    {reward.onechain_token_id && (
                      <p className="mt-1 break-all text-[0.7rem] text-stone-400">
                        Token: {reward.onechain_token_id}
                      </p>
                    )}
                    <p className="mt-1 break-all text-[0.7rem] text-stone-500">TX: {reward.tx_hash}</p>
                    {txUrl && (
                      <a
                        href={txUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-[0.66rem] uppercase tracking-[0.16em] text-amber-300 underline underline-offset-4 hover:text-amber-100"
                      >
                        Open In OneScan
                      </a>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        )}

        <section className="space-y-3 pb-6">
          {history.length === 0 ? (
            <article className={`${panelClass} p-6 text-center text-[0.8rem] text-stone-500`}>
              Chronicle is empty for this quest.
            </article>
          ) : (
            history.map((entry, idx) => (
              <article
                key={entry.id}
                className={`${panelClass} border-white/12 bg-[linear-gradient(180deg,rgba(17,18,22,0.92),rgba(11,12,15,0.96))] p-4`}
              >
                <div className="mb-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <p className="text-[0.62rem] uppercase tracking-[0.18em] text-stone-500">
                    Entry {idx + 1} · {new Date(entry.created_at).toLocaleTimeString()}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <RollBadge roll={entry.player_roll} label="Player" />
                    <RollBadge roll={entry.dm_roll} label="DM" />
                    <EngineTriggerBadge trigger={entry.engine_trigger} />
                    {entry.on_chain_event && (
                      <span className="inline-flex items-center rounded-full border border-indigo-300/25 bg-indigo-300/[0.08] px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.16em] text-indigo-200">
                        on-chain
                      </span>
                    )}
                  </div>
                </div>

                {entry.player_action && (
                  <div className="mb-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                    <p className="text-[0.56rem] uppercase tracking-[0.18em] text-stone-500">Action</p>
                    <p className="mt-1 text-[0.78rem] text-stone-200">{entry.player_action}</p>
                  </div>
                )}

                {entry.ai_narrative && (
                  <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                    <p className="text-[0.56rem] uppercase tracking-[0.18em] text-stone-500">Dungeon Master</p>
                    <p className="mt-1 text-[0.8rem] leading-6 text-stone-300">{entry.ai_narrative}</p>
                  </div>
                )}
              </article>
            ))
          )}
        </section>

        {(isSuccess || isWiped) && (
          <section
            className={`${panelClass} border ${
              isSuccess ? 'border-amber-300/22' : 'border-rose-300/22'
            } p-6 text-center`}
          >
            {isSuccess ? (
              <>
                <Trophy className="mx-auto mb-2 h-8 w-8 text-amber-300" />
                <h3 className="font-cinzel text-xl uppercase tracking-[0.1em] text-amber-100">Quest Complete</h3>
              </>
            ) : (
              <>
                <Skull className="mx-auto mb-2 h-8 w-8 text-rose-300" />
                <h3 className="font-cinzel text-xl uppercase tracking-[0.1em] text-rose-100">Party Wiped</h3>
              </>
            )}
            <p className="mt-2 text-[0.8rem] text-stone-400">
              {isSuccess
                ? 'The squad survived and sealed the outcome in the chronicle.'
                : 'The run collapsed. The chronicle keeps the lesson.'}
            </p>
            {quest.loot_dropped && (
              <p className="mt-3 inline-flex items-center gap-1 rounded-full border border-amber-300/30 bg-amber-300/[0.08] px-3 py-1 text-[0.62rem] uppercase tracking-[0.16em] text-amber-200">
                <Swords className="h-3 w-3" /> Loot was dropped
              </p>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
