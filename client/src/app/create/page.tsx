'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronLeft, Minus, Plus, Save, Sparkles } from 'lucide-react';
import { HeroClass, Ancestry, ANCESTRIES, calculateModifier } from 'shared';
import { useAuth } from '@/context/AuthContext';
import { SERVER_URL } from '@/lib/config';
import { mintHeroSBT } from '@/lib/OneChain';
import { quoteHeroMintCost } from '@/lib/onechainEconomy';
import { useOnechainWalletExecutor } from '@/hooks/useOnechainWalletExecutor';
import {
  type Alignment,
  COMMON_LANGUAGES,
  RARE_LANGUAGES,
  DEITIES_BY_ALIGNMENT,
  buildHeroSbtSnapshot,
  defaultDeityForAlignment,
  levelOneTitle,
  rollStartingGoldGp,
} from '@/lib/shadowdarkSbt';

const panelClass =
  'rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,20,24,0.9),rgba(11,11,14,0.95))] shadow-[0_18px_36px_rgba(0,0,0,0.42)] backdrop-blur';
const inputClass =
  'w-full rounded-xl border border-white/12 bg-black/30 px-4 py-3 text-[0.84rem] text-stone-100 placeholder:text-stone-500 focus:border-amber-400/45 focus:outline-none';

function StatRow({
  label,
  value,
  min,
  max,
  availablePoints,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  availablePoints: number;
  onChange: (val: number) => void;
}) {
  const modifier = calculateModifier(value);
  const modStr = modifier > 0 ? `+${modifier}` : modifier.toString();
  const colorClass =
    modifier > 0 ? 'text-emerald-300' : modifier < 0 ? 'text-rose-300' : 'text-stone-400';

  const canDecrease = value > min;
  const canIncrease = value < max && availablePoints > 0;

  return (
    <div className="flex items-center justify-between border-b border-white/8 py-2.5 last:border-b-0">
      <div className="flex flex-col">
        <span className="font-cinzel text-[0.75rem] font-semibold uppercase tracking-[0.18em] text-stone-200">
          {label}
        </span>
        <span className="text-[0.62rem] tracking-[0.08em] text-stone-500">
          {min} / {max}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => canDecrease && onChange(value - 1)}
          disabled={!canDecrease}
          className="rounded-md border border-white/12 p-1.5 text-stone-400 transition hover:border-white/30 hover:text-stone-200 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>

        <span className="w-7 text-center font-cinzel text-lg font-bold text-stone-100">{value}</span>

        <button
          onClick={() => canIncrease && onChange(value + 1)}
          disabled={!canIncrease}
          className="rounded-md border border-white/12 p-1.5 text-stone-400 transition hover:border-amber-300/45 hover:text-amber-200 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>

        <span className={`min-w-[2rem] text-right text-xs font-semibold ${colorClass}`}>{modStr}</span>
      </div>
    </div>
  );
}

export default function CreateHeroPage() {
  const router = useRouter();
  const { playerId, walletAddress, isLoading } = useAuth();
  const { executor, isExecuting: isWalletExecuting } = useOnechainWalletExecutor();

  const [name, setName] = useState('');
  const [selectedAncestry, setSelectedAncestry] = useState<Ancestry>(Ancestry.Human);
  const [selectedClass, setSelectedClass] = useState<HeroClass>(HeroClass.Fighter);
  const [alignment, setAlignment] = useState<Alignment>('Neutral');
  const [deity, setDeity] = useState<string>(defaultDeityForAlignment('Neutral'));
  const [background, setBackground] = useState('');
  const [stats, setStats] = useState({ str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 });
  const [isSaving, setIsSaving] = useState(false);
  const [startingGoldGp] = useState(() => rollStartingGoldGp());
  const [humanExtraLanguage, setHumanExtraLanguage] = useState<string>('Dwarvish');
  const [priestLanguage, setPriestLanguage] = useState<string>('Celestial');
  const [wizardCommonLanguageA, setWizardCommonLanguageA] = useState<string>('Dwarvish');
  const [wizardCommonLanguageB, setWizardCommonLanguageB] = useState<string>('Elvish');
  const [wizardRareLanguageA, setWizardRareLanguageA] = useState<string>('Draconic');
  const [wizardRareLanguageB, setWizardRareLanguageB] = useState<string>('Primordial');
  const [knownSpellsInput, setKnownSpellsInput] = useState('');
  const [extraTalentsInput, setExtraTalentsInput] = useState('');

  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

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
    setStats((prev) => {
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

  useEffect(() => {
    if (!isLoading && !playerId) {
      router.push('/');
    }
  }, [isLoading, playerId, router]);

  useEffect(() => {
    const allowed = DEITIES_BY_ALIGNMENT[alignment];
    if (!allowed.includes(deity)) {
      setDeity(defaultDeityForAlignment(alignment));
    }
  }, [alignment, deity]);

  const currentPoints = Object.values(stats).reduce((a, b) => a + b, 0);
  const availablePoints = TOTAL_POINTS - currentPoints;
  const heroMintQuote = quoteHeroMintCost();
  const titleAtLevelOne = levelOneTitle(selectedClass, alignment);

  const handleStatChange = (stat: keyof typeof stats, value: number) => {
    setStats((prev) => ({ ...prev, [stat]: value }));
  };

  const generateWithAI = async () => {
    if (!aiPrompt.trim()) {
      alert('Please enter a short prompt describing your hero.');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch(`${SERVER_URL}/api/character/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt }),
      });

      if (!response.ok) throw new Error('AI Generation Failed');
      const data = await response.json();

      if (data.success && data.character) {
        const character = data.character;
        setName(character.name || '');
        if (Object.values(Ancestry).includes(character.ancestry)) {
          setSelectedAncestry(character.ancestry as Ancestry);
        }
        if (Object.values(HeroClass).includes(character.class)) {
          setSelectedClass(character.class as HeroClass);
        }
        if (['Lawful', 'Neutral', 'Chaotic'].includes(character.alignment)) {
          setAlignment(character.alignment as Alignment);
        }
        if (character.background) setBackground(character.background);
        if (character.stats) {
          setStats({
            str: character.stats.str || 10,
            dex: character.stats.dex || 10,
            con: character.stats.con || 10,
            int: character.stats.int || 10,
            wis: character.stats.wis || 10,
            cha: character.stats.cha || 10,
          });
        }
      }
    } catch (error) {
      console.error(error);
      alert('Failed to generate hero. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Hero Name is required.');
      return;
    }
    if (availablePoints !== 0) {
      alert('You must allocate all attribute points.');
      return;
    }
    if (!walletAddress) {
      alert('Connect wallet before forging your hero soulbound token.');
      return;
    }
    if (!executor) {
      alert('Wallet signer not available. Reconnect OneWallet and try again.');
      return;
    }

    let baseHp = 4;
    if (selectedClass === HeroClass.Fighter) baseHp = 8;
    if (selectedClass === HeroClass.Priest) baseHp = 6;

    const conMod = calculateModifier(stats.con);
    let maxHp = Math.max(1, baseHp + conMod);
    if (selectedAncestry === Ancestry.Dwarf) maxHp += 2;

    const ac = 10 + calculateModifier(stats.dex);
    const alignmentDeities = DEITIES_BY_ALIGNMENT[alignment];
    if (selectedClass === HeroClass.Priest && !alignmentDeities.includes(deity)) {
      alert('Priest deity must match current alignment.');
      return;
    }

    setIsSaving(true);

    const knownSpells = knownSpellsInput
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    const extraTalents = extraTalentsInput
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    const sbtSnapshot = buildHeroSbtSnapshot({
      heroClass: selectedClass,
      ancestry: selectedAncestry,
      alignment,
      deity,
      background,
      stats,
      maxHp,
      armorClass: ac,
      startingGoldGp,
      humanExtraLanguage,
      priestLanguage,
      wizardCommonLanguages: [wizardCommonLanguageA, wizardCommonLanguageB],
      wizardRareLanguages: [wizardRareLanguageA, wizardRareLanguageB],
      knownSpells,
      extraTalents,
    });

    try {
      const mintResult = await mintHeroSBT({
        playerAddress: walletAddress,
        heroName: name,
        heroClass: selectedClass,
        ancestry: selectedAncestry,
        sbtSnapshot,
      }, executor);

      if (!mintResult.success) {
        throw new Error(mintResult.error || 'Hero SBT mint transaction was rejected.');
      }

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
          ac,
          state: {
            onchain: {
              heroSbtMintHash: mintResult.hash,
              heroMintPaidOne: mintResult.paidOne,
              heroMintGasOne: mintResult.gasFeeOne,
              heroSbtSnapshot: sbtSnapshot,
            },
          },
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create character');
      }

      router.push('/game');
    } catch (error: any) {
      console.error(error);
      alert(`Error: ${error.message}`);
      setIsSaving(false);
    }
  };

  return (
    <div className="relative h-full overflow-y-auto custom-scrollbar">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(214,172,93,0.08),transparent_30%),radial-gradient(circle_at_90%_15%,rgba(102,130,168,0.08),transparent_32%)]" />
      <div className="relative z-10 mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10">
        <header className="mb-7 flex items-center justify-between border-b border-white/10 pb-5">
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/[0.03] px-3.5 py-2 text-[0.67rem] uppercase tracking-[0.16em] text-stone-300 transition hover:border-amber-300/45 hover:text-amber-100"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Exit
          </button>
          <div className="text-center">
            <p className="text-[0.64rem] uppercase tracking-[0.26em] text-stone-500">Character Forge</p>
            <h1 className="font-cinzel text-2xl font-semibold uppercase tracking-[0.14em] text-stone-100 md:text-[1.9rem]">
              Build Your Hero
            </h1>
          </div>
          <div className="w-16 md:w-24" />
        </header>

        <section className={`${panelClass} mb-7 p-5 md:p-6`}>
          <div className="mb-3 flex items-center gap-2 text-[0.66rem] uppercase tracking-[0.24em] text-amber-300/90">
            <Sparkles className="h-3.5 w-3.5" />
            AI Origin Draft
          </div>
          <div className="flex flex-col gap-3 md:flex-row">
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="A war priest exiled after sealing a volcanic breach..."
              className={`${inputClass} md:flex-1`}
            />
            <button
              onClick={generateWithAI}
              disabled={isGenerating || !aiPrompt.trim()}
              className="rounded-xl border border-amber-300/45 bg-amber-400/[0.1] px-5 py-3 font-cinzel text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-amber-100 transition hover:bg-amber-400/[0.16] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGenerating ? 'Drafting...' : 'Generate'}
            </button>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-7 lg:grid-cols-12">
          <div className="space-y-7 lg:col-span-7">
            <section className={`${panelClass} space-y-5 p-5 md:p-6`}>
              <div>
                <label className="mb-2 block text-[0.65rem] uppercase tracking-[0.22em] text-stone-400">
                  Hero Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name your legend"
                  className={`${inputClass} font-cinzel text-lg tracking-[0.06em]`}
                  maxLength={32}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[0.65rem] uppercase tracking-[0.22em] text-stone-400">
                    Alignment
                  </label>
                  <div className="relative">
                    <select
                      value={alignment}
                      onChange={(e) => setAlignment(e.target.value as Alignment)}
                      className={`${inputClass} appearance-none pr-10`}
                    >
                      <option value="Lawful">Lawful</option>
                      <option value="Neutral">Neutral</option>
                      <option value="Chaotic">Chaotic</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-[0.65rem] uppercase tracking-[0.22em] text-stone-400">
                    Deity
                  </label>
                  <div className="relative">
                    <select
                      value={deity}
                      onChange={(e) => setDeity(e.target.value)}
                      className={`${inputClass} appearance-none pr-10`}
                    >
                      {DEITIES_BY_ALIGNMENT[alignment].map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
                  </div>
                </div>
              </div>

              {selectedAncestry === Ancestry.Human && (
                <div>
                  <label className="mb-2 block text-[0.65rem] uppercase tracking-[0.22em] text-stone-400">
                    Human Bonus Language
                  </label>
                  <div className="relative">
                    <select
                      value={humanExtraLanguage}
                      onChange={(e) => setHumanExtraLanguage(e.target.value)}
                      className={`${inputClass} appearance-none pr-10`}
                    >
                      {COMMON_LANGUAGES.filter((language) => language !== 'Common').map((language) => (
                        <option key={language} value={language}>
                          {language}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
                  </div>
                </div>
              )}

              {selectedClass === HeroClass.Priest && (
                <div>
                  <label className="mb-2 block text-[0.65rem] uppercase tracking-[0.22em] text-stone-400">
                    Priest Sacred Language
                  </label>
                  <div className="relative">
                    <select
                      value={priestLanguage}
                      onChange={(e) => setPriestLanguage(e.target.value)}
                      className={`${inputClass} appearance-none pr-10`}
                    >
                      {RARE_LANGUAGES.map((language) => (
                        <option key={language} value={language}>
                          {language}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
                  </div>
                </div>
              )}

              {selectedClass === HeroClass.Wizard && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[0.65rem] uppercase tracking-[0.22em] text-stone-400">
                      Wizard Common Language A
                    </label>
                    <div className="relative">
                      <select
                        value={wizardCommonLanguageA}
                        onChange={(e) => setWizardCommonLanguageA(e.target.value)}
                        className={`${inputClass} appearance-none pr-10`}
                      >
                        {COMMON_LANGUAGES.filter((language) => language !== 'Common').map((language) => (
                          <option key={language} value={language}>
                            {language}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-[0.65rem] uppercase tracking-[0.22em] text-stone-400">
                      Wizard Common Language B
                    </label>
                    <div className="relative">
                      <select
                        value={wizardCommonLanguageB}
                        onChange={(e) => setWizardCommonLanguageB(e.target.value)}
                        className={`${inputClass} appearance-none pr-10`}
                      >
                        {COMMON_LANGUAGES.filter((language) => language !== 'Common').map((language) => (
                          <option key={language} value={language}>
                            {language}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-[0.65rem] uppercase tracking-[0.22em] text-stone-400">
                      Wizard Rare Language A
                    </label>
                    <div className="relative">
                      <select
                        value={wizardRareLanguageA}
                        onChange={(e) => setWizardRareLanguageA(e.target.value)}
                        className={`${inputClass} appearance-none pr-10`}
                      >
                        {RARE_LANGUAGES.map((language) => (
                          <option key={language} value={language}>
                            {language}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-[0.65rem] uppercase tracking-[0.22em] text-stone-400">
                      Wizard Rare Language B
                    </label>
                    <div className="relative">
                      <select
                        value={wizardRareLanguageB}
                        onChange={(e) => setWizardRareLanguageB(e.target.value)}
                        className={`${inputClass} appearance-none pr-10`}
                      >
                        {RARE_LANGUAGES.map((language) => (
                          <option key={language} value={language}>
                            {language}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="mb-2 block text-[0.65rem] uppercase tracking-[0.22em] text-stone-400">
                  Background
                </label>
                <textarea
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  placeholder="Short origin story and defining motivation..."
                  className={`${inputClass} custom-scrollbar h-24 resize-none`}
                />
              </div>

              {(selectedClass === HeroClass.Priest || selectedClass === HeroClass.Wizard) && (
                <div>
                  <label className="mb-2 block text-[0.65rem] uppercase tracking-[0.22em] text-stone-400">
                    Known Spells (comma separated)
                  </label>
                  <input
                    type="text"
                    value={knownSpellsInput}
                    onChange={(e) => setKnownSpellsInput(e.target.value)}
                    placeholder={
                      selectedClass === HeroClass.Priest
                        ? 'Cure Wounds, Holy Weapon'
                        : 'Magic Missile, Sleep, Shield'
                    }
                    className={inputClass}
                  />
                </div>
              )}

              <div>
                <label className="mb-2 block text-[0.65rem] uppercase tracking-[0.22em] text-stone-400">
                  Extra Talents Notes (comma separated)
                </label>
                <input
                  type="text"
                  value={extraTalentsInput}
                  onChange={(e) => setExtraTalentsInput(e.target.value)}
                  placeholder="Shield Specialist, Beast Tongue"
                  className={inputClass}
                />
              </div>
            </section>

            <section className={`${panelClass} p-5 md:p-6`}>
              <h2 className="mb-4 font-cinzel text-lg uppercase tracking-[0.14em] text-stone-100">Ancestry</h2>
              <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {(Object.values(Ancestry) as Ancestry[]).map((anc) => (
                  <button
                    key={anc}
                    onClick={() => setSelectedAncestry(anc)}
                    className={`rounded-lg border px-3 py-3 font-cinzel text-[0.69rem] uppercase tracking-[0.14em] transition ${
                      selectedAncestry === anc
                        ? 'border-amber-300/40 bg-amber-300/[0.1] text-amber-100'
                        : 'border-white/10 bg-white/[0.02] text-stone-400 hover:border-white/24 hover:text-stone-200'
                    }`}
                  >
                    {ANCESTRIES[anc].name}
                  </button>
                ))}
              </div>
              <div className="rounded-xl border border-white/10 bg-black/25 p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h3 className="font-cinzel text-base uppercase tracking-[0.08em] text-stone-100">
                    {ANCESTRIES[selectedAncestry].name}
                  </h3>
                  <span className="rounded-full border border-amber-300/30 bg-amber-300/[0.08] px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.16em] text-amber-200">
                    {ANCESTRIES[selectedAncestry].feature}
                  </span>
                </div>
                <p className="text-[0.8rem] leading-6 text-stone-400">
                  {ANCESTRIES[selectedAncestry].description}
                </p>
                <p className="mt-2 text-[0.68rem] uppercase tracking-[0.15em] text-stone-500">
                  Languages:{' '}
                  <span className="normal-case tracking-normal text-stone-300">
                    {ANCESTRIES[selectedAncestry].languages.join(', ')}
                  </span>
                </p>
              </div>
            </section>

            <section className={`${panelClass} p-5 md:p-6`}>
              <h2 className="mb-4 font-cinzel text-lg uppercase tracking-[0.14em] text-stone-100">Class</h2>
              <div className="grid grid-cols-2 gap-3">
                {(Object.values(HeroClass) as HeroClass[]).map((heroClass) => (
                  <button
                    key={heroClass}
                    onClick={() => setSelectedClass(heroClass)}
                    className={`rounded-xl border px-4 py-4 text-left transition ${
                      selectedClass === heroClass
                        ? 'border-amber-300/40 bg-amber-300/[0.09]'
                        : 'border-white/10 bg-white/[0.02] hover:border-white/24'
                    }`}
                  >
                    <div className="font-cinzel text-sm uppercase tracking-[0.13em] text-stone-100">
                      {heroClass}
                    </div>
                    <div className="mt-2 text-[0.72rem] leading-5 text-stone-400">
                      {heroClass === 'Fighter'
                        ? 'd8 HP, front-line dominance'
                        : heroClass === 'Priest'
                          ? 'd6 HP, divine control'
                          : heroClass === 'Thief'
                            ? 'd4 HP, stealth and utility'
                            : 'd4 HP, arcane burst and control'}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-7 lg:col-span-5">
            <section className={`${panelClass} p-5 md:p-6`}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-cinzel text-lg uppercase tracking-[0.14em] text-stone-100">Attributes</h2>
                <span
                  className={`rounded-full border px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.16em] ${
                    availablePoints > 0
                      ? 'border-amber-300/35 bg-amber-300/[0.08] text-amber-200'
                      : availablePoints < 0
                        ? 'border-rose-300/35 bg-rose-300/[0.08] text-rose-200'
                        : 'border-emerald-300/35 bg-emerald-300/[0.08] text-emerald-200'
                  }`}
                >
                  {availablePoints > 0
                    ? `${availablePoints} left`
                    : availablePoints < 0
                      ? `${Math.abs(availablePoints)} over`
                      : 'complete'}
                </span>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/25 px-4">
                <StatRow
                  label="STR"
                  value={stats.str}
                  min={limits.str.min}
                  max={limits.str.max}
                  availablePoints={availablePoints}
                  onChange={(v) => handleStatChange('str', v)}
                />
                <StatRow
                  label="DEX"
                  value={stats.dex}
                  min={limits.dex.min}
                  max={limits.dex.max}
                  availablePoints={availablePoints}
                  onChange={(v) => handleStatChange('dex', v)}
                />
                <StatRow
                  label="CON"
                  value={stats.con}
                  min={limits.con.min}
                  max={limits.con.max}
                  availablePoints={availablePoints}
                  onChange={(v) => handleStatChange('con', v)}
                />
                <StatRow
                  label="INT"
                  value={stats.int}
                  min={limits.int.min}
                  max={limits.int.max}
                  availablePoints={availablePoints}
                  onChange={(v) => handleStatChange('int', v)}
                />
                <StatRow
                  label="WIS"
                  value={stats.wis}
                  min={limits.wis.min}
                  max={limits.wis.max}
                  availablePoints={availablePoints}
                  onChange={(v) => handleStatChange('wis', v)}
                />
                <StatRow
                  label="CHA"
                  value={stats.cha}
                  min={limits.cha.min}
                  max={limits.cha.max}
                  availablePoints={availablePoints}
                  onChange={(v) => handleStatChange('cha', v)}
                />
              </div>
            </section>

            <section className={`${panelClass} p-5 md:p-6`}>
              <p className="mb-2 text-[0.63rem] uppercase tracking-[0.22em] text-stone-500">Hero Summary</p>
              <h3 className="font-cinzel text-2xl uppercase tracking-[0.08em] text-stone-100">
                {name || 'Unnamed'}
              </h3>
              <p className="mt-2 text-[0.78rem] text-stone-400">
                Level 1 {titleAtLevelOne} · {alignment} · {selectedAncestry} {selectedClass}
              </p>
              <p className="mt-1 text-[0.72rem] text-stone-500">
                Deity: {deity} · Starting gold: {startingGoldGp} gp
              </p>
              <p className="mt-5 text-[0.75rem] leading-6 text-stone-500">
                Your AI-generated chronicle and in-game decisions will shape future NFT relics tied to this character.
              </p>
              <div className="mt-4 rounded-xl border border-amber-300/25 bg-amber-300/[0.06] px-3 py-2 text-[0.68rem] uppercase tracking-[0.14em] text-amber-100/85">
                Hero SBT mint: {heroMintQuote.totalOne} ONE (incl. gas buffer)
              </div>

              <button
                onClick={handleSave}
                disabled={isSaving || isWalletExecuting || availablePoints !== 0 || !name.trim() || !executor}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300/45 bg-amber-300/[0.1] px-4 py-3 font-cinzel text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-amber-100 transition hover:bg-amber-300/[0.18] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isSaving || isWalletExecuting ? 'Forging...' : 'Enter The Game'}
              </button>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
