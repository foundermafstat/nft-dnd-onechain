'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ChevronDown, ChevronLeft, Minus, Plus, Save, Sparkles } from 'lucide-react';
import {
  HeroClass,
  Ancestry,
  ANCESTRIES,
  calculateModifier,
  clampStatsToLimits,
  getProfileStatLimits,
  statsMeetLimits,
  type ShadowdarkStats,
} from 'shared';
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
  QUICKSTART_BACKGROUNDS,
  buildHeroSbtSnapshot,
  defaultDeityForAlignment,
  levelOneTitle,
} from '@/lib/shadowdarkSbt';

const panelClass =
  'rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,20,24,0.9),rgba(11,11,14,0.95))] shadow-[0_18px_36px_rgba(0,0,0,0.42)] backdrop-blur';
const inputClass =
  'w-full rounded-xl border border-white/12 bg-black/30 px-4 py-3 text-[0.84rem] text-stone-100 placeholder:text-stone-500 focus:border-amber-400/45 focus:outline-none';
type HeroGender = 'male' | 'female';
type CreateStep = 'identity' | 'heritage' | 'combat';
type StatSource = 'seeded_defaults' | 'offchain_roll' | 'manual_adjust';

const GENDER_OPTIONS: Array<{ value: HeroGender; label: string; iconPath: string }> = [
  { value: 'male', label: 'Male', iconPath: '/game/gender/dnd-male.png' },
  { value: 'female', label: 'Female', iconPath: '/game/gender/dnd-female.png' },
];

const ANCESTRY_IMAGE_SLUG: Record<Ancestry, string> = {
  [Ancestry.Dwarf]: 'dwarf',
  [Ancestry.Elf]: 'elf',
  [Ancestry.Goblin]: 'goblin',
  [Ancestry.Halfling]: 'halfling',
  [Ancestry.HalfOrc]: 'half-orc',
  [Ancestry.Human]: 'human',
};

const CLASS_ICON_PATH: Record<HeroClass, string> = {
  [HeroClass.Fighter]: '/game/class/dnd-fighter.png',
  [HeroClass.Priest]: '/game/class/dnd-priest.png',
  [HeroClass.Thief]: '/game/class/dnd-thief.png',
  [HeroClass.Wizard]: '/game/class/dnd-wizard.png',
};

const ANCESTRY_VISUALS: Record<Ancestry, { glow: string; beam: string }> = {
  [Ancestry.Dwarf]: { glow: 'rgba(34, 30, 24, 0.58)', beam: 'rgba(34, 30, 24, 0.52)' },
  [Ancestry.Elf]: { glow: 'rgba(34, 30, 24, 0.58)', beam: 'rgba(34, 30, 24, 0.52)' },
  [Ancestry.Goblin]: { glow: 'rgba(34, 30, 24, 0.58)', beam: 'rgba(34, 30, 24, 0.52)' },
  [Ancestry.Halfling]: { glow: 'rgba(34, 30, 24, 0.58)', beam: 'rgba(34, 30, 24, 0.52)' },
  [Ancestry.HalfOrc]: { glow: 'rgba(34, 30, 24, 0.58)', beam: 'rgba(34, 30, 24, 0.52)' },
  [Ancestry.Human]: { glow: 'rgba(34, 30, 24, 0.58)', beam: 'rgba(34, 30, 24, 0.52)' },
};

const getAncestryImagePath = (ancestry: Ancestry, gender: HeroGender): string =>
  `/game/race/${gender}/${gender}-${ANCESTRY_IMAGE_SLUG[ancestry]}.png`;

function StatRow({
  label,
  value,
  min,
  max,
  canEdit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  canEdit: boolean;
  onChange: (val: number) => void;
}) {
  const modifier = calculateModifier(value);
  const modStr = modifier > 0 ? `+${modifier}` : modifier.toString();
  const colorClass =
    modifier > 0 ? 'text-emerald-300' : modifier < 0 ? 'text-rose-300' : 'text-stone-400';

  const canDecrease = canEdit && value > min;
  const canIncrease = canEdit && value < max;

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
  const [activeStep, setActiveStep] = useState<CreateStep>('identity');
  const [selectedAncestry, setSelectedAncestry] = useState<Ancestry>(Ancestry.Human);
  const [selectedGender, setSelectedGender] = useState<HeroGender>('male');
  const [selectedClass, setSelectedClass] = useState<HeroClass>(HeroClass.Fighter);
  const [alignment, setAlignment] = useState<Alignment>('Neutral');
  const [deity, setDeity] = useState<string>(defaultDeityForAlignment('Neutral'));
  const [background, setBackground] = useState('');
  const [stats, setStats] = useState<ShadowdarkStats>({
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
  });
  const [statsSource, setStatsSource] = useState<StatSource>('seeded_defaults');
  const [isSaving, setIsSaving] = useState(false);
  const [startingGoldGp, setStartingGoldGp] = useState<number>(0);
  const [rolledMaxHp, setRolledMaxHp] = useState<number | null>(null);
  const [rolledArmorClass, setRolledArmorClass] = useState<number | null>(null);
  const [rollAttempts, setRollAttempts] = useState<number | null>(null);
  const [rollSource, setRollSource] = useState<string>('not_rolled');
  const [lastRolledProfile, setLastRolledProfile] = useState<string | null>(null);
  const [lastRollTimestamp, setLastRollTimestamp] = useState<string | null>(null);
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
  const [isRollingStats, setIsRollingStats] = useState(false);

  const MANUAL_STAT_EDIT_ENABLED = false;

  const limits = useMemo(
    () => getProfileStatLimits(selectedClass, selectedAncestry),
    [selectedAncestry, selectedClass]
  );

  useEffect(() => {
    setStats((prev) => {
      const { stats: next, changed } = clampStatsToLimits(prev, limits);
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

  const activeProfileKey = `${selectedClass}:${selectedAncestry}`;
  const hasFreshStrictRoll = lastRolledProfile === activeProfileKey;
  const statsWithinLimits = statsMeetLimits(stats, limits);
  const strictRollReady =
    hasFreshStrictRoll &&
    statsWithinLimits &&
    rolledMaxHp !== null &&
    rolledArmorClass !== null &&
    startingGoldGp > 0;
  const strictRollStale = Boolean(lastRolledProfile) && !hasFreshStrictRoll;
  useEffect(() => {
    if (lastRolledProfile && lastRolledProfile !== activeProfileKey) {
      setRolledMaxHp(null);
      setRolledArmorClass(null);
      setStartingGoldGp(0);
      setRollSource('stale_profile_mismatch');
    }
  }, [activeProfileKey, lastRolledProfile]);

  const heroMintQuote = quoteHeroMintCost();
  const titleAtLevelOne = levelOneTitle(selectedClass, alignment);
  const creationSteps: Array<{ key: CreateStep; label: string; hint: string }> = [
    { key: 'identity', label: 'Origin', hint: 'Name, ethos, myth' },
    { key: 'heritage', label: 'Bloodline', hint: 'Gender, race, class' },
    { key: 'combat', label: 'Loadout', hint: 'Stats and arcana' },
  ];
  const activeStepIndex = creationSteps.findIndex((step) => step.key === activeStep);
  const canProceedToForge =
    Boolean(name.trim()) &&
    Boolean(executor) &&
    strictRollReady;
  const previewKnownSpells = knownSpellsInput
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const previewTalents = extraTalentsInput
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const previewFallbackHp =
    selectedClass === HeroClass.Fighter ? 8 : selectedClass === HeroClass.Priest ? 6 : 4;
  const previewMaxHp =
    rolledMaxHp ??
    (Math.max(1, previewFallbackHp + calculateModifier(stats.con)) +
      (selectedAncestry === Ancestry.Dwarf ? 2 : 0));
  const previewArmorClass = rolledArmorClass ?? 10 + calculateModifier(stats.dex);
  const previewSbtSnapshot = useMemo(
    () =>
      buildHeroSbtSnapshot({
        heroClass: selectedClass,
        ancestry: selectedAncestry,
        alignment,
        deity,
        background,
        stats,
        maxHp: previewMaxHp,
        armorClass: previewArmorClass,
        startingGoldGp,
        humanExtraLanguage,
        priestLanguage,
        wizardCommonLanguages: [wizardCommonLanguageA, wizardCommonLanguageB],
        wizardRareLanguages: [wizardRareLanguageA, wizardRareLanguageB],
        knownSpells: previewKnownSpells,
        extraTalents: previewTalents,
      }),
    [
      selectedClass,
      selectedAncestry,
      alignment,
      deity,
      background,
      stats,
      previewMaxHp,
      previewArmorClass,
      startingGoldGp,
      humanExtraLanguage,
      priestLanguage,
      wizardCommonLanguageA,
      wizardCommonLanguageB,
      wizardRareLanguageA,
      wizardRareLanguageB,
      previewKnownSpells,
      previewTalents,
    ]
  );

  const handleStatChange = (stat: keyof typeof stats, value: number) => {
    setStats((prev) => ({ ...prev, [stat]: value }));
    setStatsSource('manual_adjust');
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
        if (typeof character.gender === 'string') {
          const normalizedGender = character.gender.trim().toLowerCase();
          if (normalizedGender === 'male' || normalizedGender === 'female') {
            setSelectedGender(normalizedGender);
          }
        }
        if (['Lawful', 'Neutral', 'Chaotic'].includes(character.alignment)) {
          setAlignment(character.alignment as Alignment);
        }
        if (character.background) setBackground(character.background);
      }
    } catch (error) {
      console.error(error);
      alert('Failed to generate hero. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const rollStatsOffchain = async () => {
    setIsRollingStats(true);
    try {
      const response = await fetch(`${SERVER_URL}/api/character/roll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class: selectedClass, ancestry: selectedAncestry }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.stats) {
        throw new Error(payload?.error || 'Failed to roll offchain stats');
      }
      const rolledStats: ShadowdarkStats = {
        str: payload.stats.str ?? 10,
        dex: payload.stats.dex ?? 10,
        con: payload.stats.con ?? 10,
        int: payload.stats.int ?? 10,
        wis: payload.stats.wis ?? 10,
        cha: payload.stats.cha ?? 10,
      };
      setStats(rolledStats);
      setStatsSource('offchain_roll');
      setRollAttempts(typeof payload?.attempts === 'number' ? payload.attempts : null);
      setRollSource(payload?.source || 'offchain_roll');
      setLastRolledProfile(activeProfileKey);
      setLastRollTimestamp(new Date().toISOString());
      setRolledMaxHp(
        typeof payload?.derived?.hitPoints?.total === 'number' ? payload.derived.hitPoints.total : null
      );
      setRolledArmorClass(
        typeof payload?.derived?.armorClass === 'number' ? payload.derived.armorClass : null
      );
      setStartingGoldGp(
        typeof payload?.derived?.startingGold?.totalGp === 'number'
          ? payload.derived.startingGold.totalGp
          : 0
      );
    } catch (error: any) {
      console.error(error);
      alert(error?.message || 'Failed to roll offchain stats');
    } finally {
      setIsRollingStats(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Hero Name is required.');
      return;
    }
    if (!hasFreshStrictRoll) {
      alert('Roll strict offchain stats for the current class and ancestry before forging.');
      return;
    }
    if (!statsWithinLimits) {
      alert('Current stats do not satisfy strict class/ancestry limits.');
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

    if (rolledMaxHp === null || rolledArmorClass === null || startingGoldGp <= 0) {
      alert('Strict roll metadata is incomplete. Roll again before forging.');
      return;
    }

    const maxHp = rolledMaxHp;
    const ac = rolledArmorClass;
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
            appearance: {
              gender: selectedGender,
              portrait: getAncestryImagePath(selectedAncestry, selectedGender),
            },
            creation: {
              mode: 'strict_quickstart',
              statsSource: rollSource,
              rolledAt: lastRollTimestamp,
              rollAttempts,
              profileKey: activeProfileKey,
              limits,
              statsOrigin: statsSource,
            },
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

      const createPayload = await response.json();
      const createdCharacterId = createPayload?.character?.id;
      if (createdCharacterId) {
        await fetch(`${SERVER_URL}/api/character/${createdCharacterId}/inventory/ensure-starter-kit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
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
            <section className={`${panelClass} p-5 md:p-6`}>
              <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {creationSteps.map((step, index) => {
                  const active = activeStep === step.key;
                  const completed = activeStepIndex > index;
                  return (
                    <button
                      key={step.key}
                      onClick={() => setActiveStep(step.key)}
                      className={`rounded-xl border px-4 py-3 text-left transition ${
                        active
                          ? 'border-amber-300/45 bg-amber-300/[0.12]'
                          : completed
                            ? 'border-emerald-300/30 bg-emerald-300/[0.08]'
                            : 'border-white/10 bg-white/[0.02] hover:border-white/25'
                      }`}
                    >
                      <p className="font-cinzel text-[0.64rem] uppercase tracking-[0.18em] text-stone-300">
                        Step {index + 1}
                      </p>
                      <p className="mt-1 font-cinzel text-sm uppercase tracking-[0.1em] text-stone-100">
                        {step.label}
                      </p>
                      <p className="mt-1 text-[0.7rem] text-stone-500">{step.hint}</p>
                    </button>
                  );
                })}
              </div>

              {activeStep === 'identity' && (
                <div className="space-y-5">
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

                  <div>
                    <label className="mb-2 block text-[0.65rem] uppercase tracking-[0.22em] text-stone-400">
                      Background
                    </label>
                    <div className="mb-2 flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          setBackground(
                            QUICKSTART_BACKGROUNDS[
                              Math.floor(Math.random() * QUICKSTART_BACKGROUNDS.length)
                            ]
                          )
                        }
                        className="rounded-md border border-white/12 px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.14em] text-stone-300 transition hover:border-white/25"
                      >
                        Roll Random
                      </button>
                      <select
                        value={background}
                        onChange={(e) => setBackground(e.target.value)}
                        className="min-w-[260px] rounded-md border border-white/12 bg-black/35 px-2.5 py-1 text-[0.72rem] text-stone-200 focus:border-amber-300/45 focus:outline-none"
                      >
                        <option value="">Choose quickstart background...</option>
                        {QUICKSTART_BACKGROUNDS.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>
                    <textarea
                      value={background}
                      onChange={(e) => setBackground(e.target.value)}
                      placeholder="Short origin story and defining motivation..."
                      className={`${inputClass} custom-scrollbar h-28 resize-none`}
                    />
                  </div>
                </div>
              )}

              {activeStep === 'heritage' && (
                <div className="space-y-6">
                  <div>
                    <label className="mb-2 block text-[0.65rem] uppercase tracking-[0.22em] text-stone-400">
                      Gender
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      {GENDER_OPTIONS.map((genderOption) => (
                        <button
                          key={genderOption.value}
                          onClick={() => setSelectedGender(genderOption.value)}
                          className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                            selectedGender === genderOption.value
                              ? 'border-amber-300/40 bg-amber-300/[0.1]'
                              : 'border-white/10 bg-white/[0.02] hover:border-white/24'
                          }`}
                        >
                          <Image
                            src={genderOption.iconPath}
                            alt={genderOption.label}
                            width={28}
                            height={28}
                            className="h-7 w-7 rounded-md object-contain"
                          />
                          <span className="font-cinzel text-[0.68rem] uppercase tracking-[0.12em] text-stone-200">
                            {genderOption.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h2 className="mb-3 font-cinzel text-sm uppercase tracking-[0.16em] text-stone-300">Ancestry</h2>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {(Object.values(Ancestry) as Ancestry[]).map((anc) => (
                        <button
                          key={anc}
                          onClick={() => setSelectedAncestry(anc)}
                          className={`group relative aspect-[3/4] overflow-hidden rounded-xl border text-left transition-all duration-300 ${
                            selectedAncestry === anc
                              ? 'border-amber-300/45 bg-[linear-gradient(160deg,rgba(214,172,93,0.18),rgba(20,20,28,0.7))] text-amber-100 shadow-[0_10px_24px_rgba(214,172,93,0.22)]'
                              : 'border-white/12 bg-[linear-gradient(160deg,rgba(34,36,48,0.5),rgba(16,16,22,0.65))] text-stone-300 hover:border-white/28 hover:text-stone-100 hover:shadow-[0_8px_20px_rgba(0,0,0,0.35)]'
                          }`}
                          style={{
                            boxShadow:
                              selectedAncestry === anc
                                ? `0 0 0 1px ${ANCESTRY_VISUALS[anc].beam} inset, 0 14px 28px rgba(0,0,0,0.42)`
                                : undefined,
                          }}
                        >
                          <div className="relative flex h-full flex-col">
                            <Image
                              src={getAncestryImagePath(anc, selectedGender)}
                              alt={`${ANCESTRIES[anc].name} ${selectedGender}`}
                              width={360}
                              height={480}
                              className="h-[82%] w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
                              style={{
                                filter:
                                  `drop-shadow(0 10px 20px rgba(0,0,0,0.72)) drop-shadow(0 0 18px ${ANCESTRY_VISUALS[anc].glow})`,
                              }}
                            />
                            <div className="flex h-[18%] items-center justify-center px-2">
                              <span className="whitespace-nowrap font-cinzel text-[0.7rem] uppercase tracking-[0.14em] text-stone-50 sm:text-[0.72rem]">
                                {ANCESTRIES[anc].name}
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h2 className="mb-3 font-cinzel text-sm uppercase tracking-[0.16em] text-stone-300">Class</h2>
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
                          <div className="flex items-center gap-2.5">
                            <Image
                              src={CLASS_ICON_PATH[heroClass]}
                              alt={`${heroClass} icon`}
                              width={28}
                              height={28}
                              className="h-7 w-7 rounded-md object-contain"
                            />
                            <div className="font-cinzel text-sm uppercase tracking-[0.13em] text-stone-100">
                              {heroClass}
                            </div>
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
                  </div>
                </div>
              )}

              {activeStep === 'combat' && (
                <div className="space-y-5">
                  <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-[0.68rem] leading-5 text-stone-400">
                    <p className="mb-1 uppercase tracking-[0.14em] text-stone-500">Quickstart Constraints</p>
                    <p>Strict mode: server rolls 3d6 for each stat. If no stat is 14+, roll again.</p>
                    <p>
                      Current mins: STR {limits.str.min}, DEX {limits.dex.min}, CON {limits.con.min}, INT{' '}
                      {limits.int.min}, WIS {limits.wis.min}, CHA {limits.cha.min}.
                    </p>
                    <p>Gear slots formula: max(STR, 10) + Fighter CON modifier (if positive).</p>
                    <p>
                      Roll status:{' '}
                      {strictRollReady
                        ? 'ready for mint'
                        : strictRollStale
                          ? 'stale (profile changed, reroll required)'
                          : 'awaiting strict offchain roll'}
                      {rollAttempts ? ` · attempts: ${rollAttempts}` : ''}
                    </p>
                    <p>
                      Source: {rollSource}
                      {lastRollTimestamp ? ` · rolled at ${new Date(lastRollTimestamp).toLocaleString()}` : ''}
                    </p>
                    <p>
                      Manual stat edit: {MANUAL_STAT_EDIT_ENABLED ? 'enabled (secondary mode)' : 'disabled (strict)'}
                    </p>
                    <div className="mt-2">
                      <button
                        onClick={rollStatsOffchain}
                        disabled={isRollingStats}
                        className="rounded-md border border-amber-300/40 bg-amber-300/[0.1] px-3 py-1.5 text-[0.62rem] uppercase tracking-[0.14em] text-amber-100 transition hover:bg-amber-300/[0.16] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isRollingStats ? 'Rolling...' : 'Roll Stats Offchain (3d6)'}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <h2 className="font-cinzel text-lg uppercase tracking-[0.14em] text-stone-100">Attributes</h2>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.16em] ${
                        strictRollReady
                          ? 'border-emerald-300/35 bg-emerald-300/[0.08] text-emerald-200'
                          : strictRollStale
                            ? 'border-rose-300/35 bg-rose-300/[0.08] text-rose-200'
                            : 'border-amber-300/35 bg-amber-300/[0.08] text-amber-200'
                      }`}
                    >
                      {strictRollReady ? 'strict roll ready' : strictRollStale ? 'reroll required' : 'not rolled'}
                    </span>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/25 px-4">
                    <StatRow
                      label="STR"
                      value={stats.str}
                      min={limits.str.min}
                      max={limits.str.max}
                      canEdit={MANUAL_STAT_EDIT_ENABLED}
                      onChange={(v) => handleStatChange('str', v)}
                    />
                    <StatRow
                      label="DEX"
                      value={stats.dex}
                      min={limits.dex.min}
                      max={limits.dex.max}
                      canEdit={MANUAL_STAT_EDIT_ENABLED}
                      onChange={(v) => handleStatChange('dex', v)}
                    />
                    <StatRow
                      label="CON"
                      value={stats.con}
                      min={limits.con.min}
                      max={limits.con.max}
                      canEdit={MANUAL_STAT_EDIT_ENABLED}
                      onChange={(v) => handleStatChange('con', v)}
                    />
                    <StatRow
                      label="INT"
                      value={stats.int}
                      min={limits.int.min}
                      max={limits.int.max}
                      canEdit={MANUAL_STAT_EDIT_ENABLED}
                      onChange={(v) => handleStatChange('int', v)}
                    />
                    <StatRow
                      label="WIS"
                      value={stats.wis}
                      min={limits.wis.min}
                      max={limits.wis.max}
                      canEdit={MANUAL_STAT_EDIT_ENABLED}
                      onChange={(v) => handleStatChange('wis', v)}
                    />
                    <StatRow
                      label="CHA"
                      value={stats.cha}
                      min={limits.cha.min}
                      max={limits.cha.max}
                      canEdit={MANUAL_STAT_EDIT_ENABLED}
                      onChange={(v) => handleStatChange('cha', v)}
                    />
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
                </div>
              )}

              <div className="mt-6 flex items-center justify-between">
                <button
                  onClick={() =>
                    setActiveStep(creationSteps[Math.max(0, activeStepIndex - 1)].key)
                  }
                  disabled={activeStepIndex === 0}
                  className="rounded-lg border border-white/12 px-4 py-2 text-[0.68rem] uppercase tracking-[0.14em] text-stone-300 transition hover:border-white/25 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    setActiveStep(
                      creationSteps[Math.min(creationSteps.length - 1, activeStepIndex + 1)].key
                    )
                  }
                  disabled={activeStepIndex === creationSteps.length - 1}
                  className="rounded-lg border border-amber-300/40 bg-amber-300/[0.1] px-4 py-2 text-[0.68rem] uppercase tracking-[0.14em] text-amber-100 transition hover:bg-amber-300/[0.16] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </section>
          </div>

          <aside className="lg:col-span-5">
            <div className="lg:sticky lg:top-6">
              <section className="relative overflow-hidden rounded-[34px] border border-white/12 bg-[linear-gradient(145deg,rgba(18,19,26,0.94),rgba(7,7,10,0.99))] p-5 shadow-[0_28px_70px_rgba(0,0,0,0.55)] md:p-6">
                <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-[45%_55%_60%_40%/60%_45%_55%_40%] bg-amber-400/18 blur-3xl" />
                <div className="pointer-events-none absolute -left-20 top-1/3 h-52 w-52 rounded-[58%_42%_41%_59%/52%_58%_42%_48%] bg-sky-400/12 blur-3xl" />
                <div className="pointer-events-none absolute bottom-[-60px] right-8 h-44 w-56 rounded-[46%_54%_40%_60%/54%_37%_63%_46%] bg-rose-500/10 blur-3xl" />

                <div className="relative mb-5 overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_30%_12%,rgba(255,255,255,0.14),rgba(10,10,14,0.94)_62%)]">
                  <div className="absolute inset-x-10 bottom-4 h-10 rounded-full blur-2xl" style={{ backgroundColor: ANCESTRY_VISUALS[selectedAncestry].glow }} />
                  <Image
                    src={getAncestryImagePath(selectedAncestry, selectedGender)}
                    alt={`${ANCESTRIES[selectedAncestry].name} ${selectedGender}`}
                    width={680}
                    height={840}
                    className="relative z-10 h-[330px] w-full object-contain p-4"
                    style={{
                      filter:
                        'drop-shadow(0 26px 36px rgba(0,0,0,0.88)) drop-shadow(0 0 28px rgba(34,30,24,0.48))',
                    }}
                  />
                </div>

                <div className="relative space-y-3 rounded-[28px] border border-white/10 bg-black/35 p-4 backdrop-blur">
                  <p className="text-[0.62rem] uppercase tracking-[0.22em] text-stone-500">Hero Profile</p>
                  <h3 className="font-cinzel text-2xl uppercase tracking-[0.08em] text-stone-100">
                    {name || 'Unnamed'}
                  </h3>
                  <p className="text-[0.75rem] text-stone-300">
                    Level 1 {titleAtLevelOne} · {selectedGender} {selectedAncestry} {selectedClass}
                  </p>
                  <p className="text-[0.72rem] text-stone-400">
                    Alignment: {alignment} · Deity: {deity} · AC: {previewArmorClass} · HP: {previewMaxHp}
                  </p>

                  <div className="grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-black/30 p-2">
                    {Object.entries(stats).map(([key, value]) => (
                      <div key={key} className="rounded-md border border-white/8 bg-black/25 px-2 py-1.5 text-center">
                        <p className="text-[0.58rem] uppercase tracking-[0.16em] text-stone-500">{key}</p>
                        <p className="font-cinzel text-sm text-stone-100">{value}</p>
                      </div>
                    ))}
                  </div>

                  <p className="text-[0.72rem] leading-6 text-stone-300/95">
                    {background || 'No chronicle yet. Give this soul a myth in the Origin tab.'}
                  </p>
                  <p className="text-[0.66rem] uppercase tracking-[0.16em] text-stone-500">
                    Languages:{' '}
                    <span className="normal-case tracking-normal text-stone-300">
                      {previewSbtSnapshot.languages.join(', ')}
                    </span>
                  </p>

                  <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                    <p className="text-[0.63rem] uppercase tracking-[0.16em] text-stone-500">
                      Inventory Slots: {previewSbtSnapshot.gearSlots} total ·{' '}
                      {previewSbtSnapshot.gearSlotsUsed} used · {previewSbtSnapshot.gearSlotsFree} free
                    </p>
                    <div className="mt-2 space-y-1.5">
                      {previewSbtSnapshot.starterInventory.map((item) => (
                        <div key={item.key} className="flex items-center justify-between text-[0.7rem] text-stone-300">
                          <span>
                            {item.name} x{item.quantity}
                          </span>
                          <span className="text-stone-500">{item.totalSlots} slots</span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-[0.62rem] text-stone-500">
                      Carry rules: {previewSbtSnapshot.commonCarryRules.join(' ')}
                    </p>
                  </div>

                  {previewKnownSpells.length > 0 && (
                    <p className="text-[0.66rem] uppercase tracking-[0.16em] text-stone-500">
                      Spells:{' '}
                      <span className="normal-case tracking-normal text-stone-300">
                        {previewKnownSpells.join(', ')}
                      </span>
                    </p>
                  )}
                  {previewTalents.length > 0 && (
                    <p className="text-[0.66rem] uppercase tracking-[0.16em] text-stone-500">
                      Talents:{' '}
                      <span className="normal-case tracking-normal text-stone-300">
                        {previewTalents.join(', ')}
                      </span>
                    </p>
                  )}

                  <p className="text-[0.62rem] uppercase tracking-[0.14em] text-stone-600">
                    SBT Snapshot: {previewSbtSnapshot.snapshotVersion} · {previewSbtSnapshot.ruleset}
                  </p>

                  <div className="rounded-xl border border-amber-300/25 bg-amber-300/[0.08] px-3 py-2 text-[0.68rem] uppercase tracking-[0.14em] text-amber-100/90">
                    Hero SBT mint: {heroMintQuote.totalOne} ONE (incl. gas buffer)
                  </div>

                  <button
                    onClick={handleSave}
                    disabled={isSaving || isWalletExecuting || !canProceedToForge}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300/45 bg-amber-300/[0.12] px-4 py-3 font-cinzel text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-amber-100 transition hover:bg-amber-300/[0.18] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {isSaving || isWalletExecuting ? 'Forging...' : 'Enter The Game'}
                  </button>
                </div>
              </section>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
