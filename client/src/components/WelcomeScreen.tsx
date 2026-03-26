'use client';

import {
	Shield,
	Sparkles,
	Map,
	Crown,
	ChevronDown,
	Swords,
	Scroll,
	Bot,
	Orbit,
	Gem,
	LibraryBig,
	ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import FreighterAuthButton from "./OneWalletAuthButton";
import { useEffect, useRef, useState } from "react";
import OneWalletAuthButton from './OneWalletAuthButton';

function useIntersectionObserver(options = {}) {
	const [isIntersecting, setIsIntersecting] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const observer = new IntersectionObserver(([entry]) => {
			if (entry.isIntersecting) {
				setIsIntersecting(true);
				observer.unobserve(entry.target);
			}
		}, { threshold: 0.1, ...options });

		if (ref.current) observer.observe(ref.current);
		return () => observer.disconnect();
	}, [options]);

	return [ref, isIntersecting] as const;
}

function FadeIn({
	children,
	delay = 0,
	direction = 'up',
	distance = 28,
}: {
	children: React.ReactNode;
	delay?: number;
	direction?: 'up' | 'left' | 'right' | 'down';
	distance?: number;
}) {
	const [ref, isVisible] = useIntersectionObserver();

	const axis = direction === 'left' || direction === 'right' ? 'X' : 'Y';
	const signedDistance = direction === 'up' || direction === 'left' ? distance : -distance;
	const hiddenTransform =
		axis === 'X'
			? `translate3d(${signedDistance}px, 0, 0) scale(0.96)`
			: `translate3d(0, ${signedDistance}px, 0) scale(0.96)`;

	return (
		<div
			ref={ref}
			className="transition-[opacity,transform] duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
			style={{
				transitionDelay: `${delay}ms`,
				opacity: isVisible ? 1 : 0,
				transform: isVisible ? 'translate3d(0,0,0) scale(1)' : hiddenTransform,
			}}
		>
			{children}
		</div>
	);
}

function SectionHeading({
	eyebrow,
	title,
	description,
	align = 'center',
}: {
	eyebrow: string;
	title: string;
	description: string;
	align?: 'center' | 'left';
}) {
	const alignment = align === 'left' ? 'text-left items-start' : 'text-center items-center';

	return (
		<div className={`flex flex-col ${alignment}`}>
			<div className="inline-flex items-center gap-2 rounded-full border border-white/7 bg-white/[0.03] px-4 py-1.5 text-[0.62rem] font-inter font-semibold uppercase tracking-[0.28em] text-stone-400">
				<span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.8)]" />
				{eyebrow}
			</div>
			<h2 className="mt-6 max-w-4xl font-cinzel text-3xl font-semibold uppercase tracking-[0.14em] text-stone-100 md:text-5xl">
				{title}
			</h2>
			<p className="mt-5 max-w-3xl text-[0.98rem] leading-8 text-stone-400 md:text-[1.08rem]">
				{description}
			</p>
		</div>
	);
}

function ValuePillar({
	icon: Icon,
	title,
	description,
	index,
}: {
	icon: LucideIcon;
	title: string;
	description: string;
	index: number;
}) {
	return (
		<FadeIn delay={index * 120}>
			<div className="group relative overflow-hidden rounded-[30px] border border-white/7 bg-[linear-gradient(180deg,rgba(18,18,21,0.92),rgba(10,10,12,0.96))] p-6 shadow-[0_24px_48px_rgba(0,0,0,0.24)]">
				<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(214,169,90,0.10),transparent_30%),linear-gradient(180deg,transparent,rgba(255,255,255,0.02))]" />
				<div className="relative">
					<div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-400/14 bg-[linear-gradient(180deg,rgba(80,59,27,0.42),rgba(17,17,19,0.94))] text-amber-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
						<Icon className="h-5 w-5" />
					</div>
					<h3 className="mt-6 font-cinzel text-[1.05rem] font-semibold uppercase tracking-[0.12em] text-stone-100">
						{title}
					</h3>
					<p className="mt-4 text-[0.9rem] leading-7 text-stone-400">
						{description}
					</p>
				</div>
			</div>
		</FadeIn>
	);
}

function NarrativeArtifact({
	title,
	subtitle,
	description,
	imageSrc,
	icon: Icon,
	delay = 0,
	alignment = 'left',
}: {
	title: string;
	subtitle: string;
	description: string;
	imageSrc: string;
	icon: LucideIcon;
	delay?: number;
	alignment?: 'left' | 'right';
}) {
	const imageOrder = alignment === 'right' ? 'lg:order-2' : '';
	const textOrder = alignment === 'right' ? 'lg:order-1' : '';

	return (
		<FadeIn delay={delay}>
			<div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
				<div className={`relative flex min-h-[420px] items-center justify-center ${imageOrder}`}>
					<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(214,169,90,0.12),transparent_34%),radial-gradient(circle_at_55%_55%,rgba(103,132,170,0.12),transparent_42%)]" />
					<div className="pointer-events-none absolute h-[82%] w-[82%] rounded-full border border-white/6 opacity-60" />
					<div className="pointer-events-none absolute h-[68%] w-[68%] rounded-full border border-amber-400/12" />
					<div className="pointer-events-none absolute h-[58%] w-[58%] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_70%)] blur-2xl" />
					<img
						src={imageSrc}
						alt={title}
						className="relative z-10 max-h-[420px] w-full object-contain drop-shadow-[0_28px_45px_rgba(0,0,0,0.78)] transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.03]"
					/>
				</div>

				<div className={textOrder}>
					<div className="inline-flex items-center gap-2 rounded-full border border-white/7 bg-white/[0.03] px-4 py-1.5 text-[0.62rem] font-inter font-semibold uppercase tracking-[0.28em] text-stone-400">
						<Icon className="h-3.5 w-3.5 text-amber-300" />
						{subtitle}
					</div>
					<h3 className="mt-6 max-w-xl font-cinzel text-3xl font-semibold uppercase tracking-[0.12em] text-stone-100 md:text-4xl">
						{title}
					</h3>
					<p className="mt-6 max-w-xl text-[0.98rem] leading-8 text-stone-400">
						{description}
					</p>
				</div>
			</div>
		</FadeIn>
	);
}

function EconomyStrip() {
	const items = [
		'AI builds quests, factions, conflicts and rare world events in real time.',
		'Player choices become canonical lore and directly affect future drops.',
		'NFT items can be bought, sold and rented inside the marketplace economy.',
		'Game assets remain usable in-world instead of being detached collectibles.',
	];

	return (
		<div className="rounded-[34px] border border-white/7 bg-[linear-gradient(180deg,rgba(19,19,22,0.94),rgba(10,10,12,0.96))] p-6 shadow-[0_30px_60px_rgba(0,0,0,0.28)] md:p-8">
			<div className="grid gap-5 md:grid-cols-2">
				{items.map((item, index) => (
					<FadeIn key={item} delay={index * 80}>
						<div className="flex items-start gap-3 rounded-[24px] border border-white/6 bg-white/[0.02] p-4">
							<div className="mt-1 h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.7)]" />
							<p className="text-[0.9rem] leading-7 text-stone-300">{item}</p>
						</div>
					</FadeIn>
				))}
			</div>
		</div>
	);
}

interface WelcomeScreenProps {
	onAuth: (playerId: string | null, walletAddress: string | null) => void;
}

export default function WelcomeScreen({ onAuth }: WelcomeScreenProps) {
	return (
		<div className="absolute inset-0 z-20 h-full w-full overflow-x-hidden overflow-y-auto bg-[#0a0a0a] text-amber-50 custom-scrollbar scroll-smooth selection:text-amber-100">
			<section className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden pointer-events-auto">
				<div className="absolute inset-0 z-0 h-full w-full bg-black">
					<video
						autoPlay
						loop
						muted
						playsInline
						className="absolute inset-0 h-full w-full scale-[1.02] object-cover opacity-[0.85]"
					>
						<source src="/videos/promo.mp4" type="video/mp4" />
					</video>
					<div className="absolute inset-x-0 bottom-0 z-10 h-[70%] bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent pointer-events-none"></div>
					<div className="absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_center,_transparent_20%,_#050505_60%)] pointer-events-none opacity-30"></div>
				</div>

				<div className="relative z-20 mx-auto mt-20 flex w-full max-w-6xl flex-col items-center px-6 text-center">
					<FadeIn delay={100} direction="up">
						<div className="group relative mb-8 inline-flex cursor-default items-center gap-3 overflow-hidden rounded-full border border-amber-900/30 bg-[#0a0a0a]/60 px-6 py-2 shadow-2xl backdrop-blur-xl">
							<div className="absolute inset-0 h-full w-full -translate-x-full bg-gradient-to-r from-transparent via-amber-500/10 to-transparent group-hover:animate-[shimmer_2s_infinite]"></div>
							<span className="relative flex h-2 w-2">
								<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75"></span>
								<span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400"></span>
							</span>
							<span className="pt-[1px] font-cinzel text-xs uppercase tracking-[0.25em] text-amber-100">The Genesis Build Is Live</span>
						</div>
					</FadeIn>

					<FadeIn delay={300} direction="up">
						<h1 className="relative z-10 mb-6 font-cinzel text-3xl font-bold uppercase leading-[0.9] tracking-widest text-white drop-shadow-2xl md:text-5xl lg:text-[6rem]">
							STEP INTO<br />
							<div className="relative mt-2 inline-block pb-4">
								<span className="relative bg-gradient-to-r from-amber-200 via-amber-400 to-amber-700 bg-clip-text pr-4 text-transparent">
									THE UNKNOWN
								</span>
							</div>
						</h1>
					</FadeIn>

					<FadeIn delay={500} direction="up">
						<p className="mb-10 max-w-4xl text-md font-light leading-relaxed text-stone-300 drop-shadow-md md:text-xl">
							A cinematic blockchain RPG where the <strong className="font-medium text-amber-100">AI writes the lore around your choices</strong>, and the rare items born from that lore become on-chain NFTs you can use, trade and lease inside the living world economy.
						</p>
					</FadeIn>

					<FadeIn delay={650} direction="up">
						<div className="mb-12 grid w-full max-w-5xl gap-4 md:grid-cols-3">
							<div className="rounded-[24px] border border-white/8 bg-black/30 px-5 py-4 text-left backdrop-blur-xl">
								<div className="text-[0.62rem] font-inter font-semibold uppercase tracking-[0.28em] text-stone-500">AI Lore Engine</div>
								<p className="mt-3 text-[0.88rem] leading-7 text-stone-300">
									Quests, characters, power shifts and narrative consequences evolve dynamically while you play.
								</p>
							</div>
							<div className="rounded-[24px] border border-white/8 bg-black/30 px-5 py-4 text-left backdrop-blur-xl">
								<div className="text-[0.62rem] font-inter font-semibold uppercase tracking-[0.28em] text-stone-500">Generated NFTs</div>
								<p className="mt-3 text-[0.88rem] leading-7 text-stone-300">
									Artifacts are minted from in-game events, so item identity is tied to your campaign history.
								</p>
							</div>
							<div className="rounded-[24px] border border-white/8 bg-black/30 px-5 py-4 text-left backdrop-blur-xl">
								<div className="text-[0.62rem] font-inter font-semibold uppercase tracking-[0.28em] text-stone-500">Market Utility</div>
								<p className="mt-3 text-[0.88rem] leading-7 text-stone-300">
									Buy, sell and rent the same assets you actually use inside the game and on the internal marketplace.
								</p>
							</div>
						</div>
					</FadeIn>

					<FadeIn delay={700} direction="up">
						<div className="flex w-full flex-col items-center justify-center gap-8 sm:flex-row">
							<div className="group relative z-50 perspective-1000">
								<OneWalletAuthButton onAuthenticated={onAuth} variant="hero" />
							</div>

							<a href="#world-loop" className="group flex items-center gap-2 pt-2 font-cinzel text-sm font-bold uppercase tracking-[0.2em] text-amber-700/80 transition-colors hover:text-amber-400 sm:pt-0">
								Explore the loop <ChevronDown className="h-4 w-4 transition-transform" />
							</a>
						</div>
					</FadeIn>
				</div>
			</section>

			<section id="world-loop" className="relative z-20 overflow-hidden bg-[#0a0a0a] py-28">
				<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.06),transparent_25%),radial-gradient(circle_at_bottom_right,rgba(103,132,170,0.08),transparent_30%)]" />
				<div className="relative mx-auto max-w-7xl px-6">
					<SectionHeading
						eyebrow="World Loop"
						title="One Game Loop, Three Asset Layers"
						description="NFT-DND is not just an RPG skin on a wallet. The world simulation, player agency and blockchain ownership are one connected system, where AI-generated lore continuously affects both gameplay and asset value."
					/>

					<div className="mt-16 grid gap-6 lg:grid-cols-3">
						<ValuePillar
							index={0}
							icon={Bot}
							title="AI Writes the Chronicle"
							description="The Game Master generates scenes, factions, tensions and consequences on the fly. Your campaign is not a static quest chain but an authored history unfolding in response to your actions."
						/>
						<ValuePillar
							index={1}
							icon={LibraryBig}
							title="Lore Becomes Item Identity"
							description="When legendary discoveries, victories or world events happen, they can crystallize into NFTs. Their origin matters because the lore behind them becomes part of the item’s meaning and desirability."
						/>
						<ValuePillar
							index={2}
							icon={Gem}
							title="Assets Stay Useful"
							description="Weapons, tomes, structures and rare utilities are not passive collectibles. They remain playable objects you can equip, deploy, trade or rent on the internal marketplace."
						/>
					</div>
				</div>
			</section>

			<section className="relative z-20 overflow-hidden bg-[#090909] py-28">
				<div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_18%,transparent_82%,rgba(255,255,255,0.02))]" />
				<div className="relative mx-auto max-w-7xl px-6">
					<div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
						<FadeIn>
							<SectionHeading
								eyebrow="Artifact Genesis"
								title="The Item Is Only Valuable Because the Story Made It Real"
								description="We use the transparent artwork as volumetric hero objects instead of boxing them into flat cards. That makes the page feel closer to a premium game reveal and reinforces the idea that every artifact emerges out of the world rather than sitting in a marketplace spreadsheet."
								align="left"
							/>
						</FadeIn>

						<FadeIn delay={120}>
							<EconomyStrip />
						</FadeIn>
					</div>

					<div className="mt-20 space-y-24">
						<NarrativeArtifact
							delay={80}
							title="Citadels, relics and unique loot are generated from world-state and campaign history"
							subtitle="Lore-Linked Asset Minting"
							description="A fortress, relic or blade is not defined only by stats. It is also defined by the chapter that created it: who found it, under what faction pressure, in which procedurally generated conflict, and how the world reacted after. That is the premium promise here: NFTs inherit meaning from the lore, not just rarity colors."
							imageSrc="/images/dnd1.png"
							icon={Crown}
						/>

						<NarrativeArtifact
							delay={140}
							alignment="right"
							title="AI-generated tomes, spell objects and narrative artifacts can open future pathways"
							subtitle="Persistent World Memory"
							description="The AI remembers what happened, folds that memory back into future sessions and lets items become anchors for future story logic. A tome can unlock dialogue. A blade can reshape faction fear. A stronghold can become a node for new procedural opportunities."
							imageSrc="/images/dnd2.png"
							icon={Scroll}
						/>

						<NarrativeArtifact
							delay={180}
							title="Weapons and rare utilities stay active inside the game economy, not outside of it"
							subtitle="Trade, Sell, Rent"
							description="Inside the marketplace, assets circulate as usable game instruments. Players can collect them, sell them, or rent them to others who need power, access or strategic leverage. The result is a real game-first economy where ownership and utility reinforce each other."
							imageSrc="/images/dnd3.png"
							icon={Swords}
						/>
					</div>
				</div>
			</section>

			<section className="relative z-20 overflow-hidden bg-[#0a0a0a] py-28">
				<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(214,169,90,0.08),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(116,141,178,0.08),transparent_30%)]" />
				<div className="relative mx-auto max-w-7xl px-6">
					<SectionHeading
						eyebrow="Marketplace Logic"
						title="Designed as a Premium Blockchain Game, Not a Token Wrapper"
						description="The page now frames the product correctly: an AI-native RPG where lore generation, progression and NFT liquidity are one coherent experience. This is a world where narrative output becomes collectible game inventory and marketplace activity feeds back into player strategy."
					/>

					<div className="mt-18 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
						{[
							{
								icon: Orbit,
								title: 'Dynamic Campaign State',
								description: 'The AI evolves locations, relationships and outcomes as the world changes around the players.',
							},
							{
								icon: Map,
								title: 'On-Chain Asset Origins',
								description: 'Minted items are tied to meaningful discoveries, victories and world events from the session timeline.',
							},
							{
								icon: Gem,
								title: 'Internal Market Flow',
								description: 'Collect, sell and rent items that remain mechanically relevant inside the game ecosystem.',
							},
							{
								icon: Shield,
								title: 'Player-Driven Value',
								description: 'Scarcity is strengthened by lore significance, not just supply count or cosmetic rarity labels.',
							},
						].map((item, index) => (
							<FadeIn key={item.title} delay={index * 90}>
								<div className="group rounded-[28px] border border-white/7 bg-[linear-gradient(180deg,rgba(18,18,21,0.95),rgba(11,11,13,0.96))] p-6 shadow-[0_24px_48px_rgba(0,0,0,0.24)]">
									<div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03] text-amber-200">
										<item.icon className="h-5 w-5" />
									</div>
									<h3 className="mt-5 font-cinzel text-[1rem] font-semibold uppercase tracking-[0.12em] text-stone-100">
										{item.title}
									</h3>
									<p className="mt-4 text-[0.88rem] leading-7 text-stone-400">
										{item.description}
									</p>
								</div>
							</FadeIn>
						))}
					</div>
				</div>
			</section>

			<footer className="relative z-20 overflow-hidden border-t border-white/6 bg-[#050505] pb-16 pt-28">
				<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(245,158,11,0.06)_0%,_transparent_60%)]"></div>
				<div className="relative mx-auto max-w-7xl px-6">
					<div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
						<FadeIn>
							<div>
								<div className="inline-flex items-center gap-2 rounded-full border border-white/7 bg-white/[0.03] px-4 py-1.5 text-[0.62rem] font-inter font-semibold uppercase tracking-[0.28em] text-stone-400">
									<Sparkles className="h-3.5 w-3.5 text-amber-300" />
									Enter Genesis
								</div>
								<h2 className="mt-6 max-w-3xl font-cinzel text-3xl font-semibold uppercase tracking-[0.14em] text-stone-100 md:text-5xl">
									Connect Your Wallet and Enter a Campaign That Can Mint Its Own History
								</h2>
								<p className="mt-6 max-w-2xl text-[0.98rem] leading-8 text-stone-400">
									Reserve your place in the inaugural lore cycle, discover AI-authored world events, and claim assets whose value comes from what actually happened in your adventure.
								</p>

								<div className="mt-8 flex flex-wrap gap-6 text-[0.72rem] font-inter font-semibold uppercase tracking-[0.24em] text-stone-500">
									<div className="flex items-center gap-2">
										<div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
										OneWallet Testnet
									</div>
									<div className="flex items-center gap-2">
										<div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
										AI-Driven Lore
									</div>
									<div className="flex items-center gap-2">
										<div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
										In-Game NFT Economy
									</div>
								</div>
							</div>
						</FadeIn>

						<FadeIn delay={140}>
							<div className="rounded-[34px] border border-white/7 bg-[linear-gradient(180deg,rgba(18,18,21,0.96),rgba(10,10,12,0.96))] p-7 shadow-[0_30px_60px_rgba(0,0,0,0.28)]">
								<div className="mb-6 flex items-center gap-3">
									<div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-400/16 bg-[linear-gradient(180deg,rgba(83,61,28,0.45),rgba(18,18,20,0.96))] text-amber-200">
										<Shield className="h-5 w-5" />
									</div>
									<div>
										<div className="text-[0.62rem] font-inter font-semibold uppercase tracking-[0.28em] text-stone-500">Access Relay</div>
										<div className="mt-1 font-cinzel text-[1rem] uppercase tracking-[0.12em] text-stone-100">Connect to Begin</div>
									</div>
								</div>

								<div className="mb-8">
									<FreighterAuthButton onAuthenticated={onAuth} variant="footer" />
								</div>

								<div className="space-y-3">
									{[
										'Connect OneWallet on OneChain testnet.',
										'Enter the AI-generated campaign loop.',
										'Discover items that can become tradable, rentable NFTs.',
									].map((item) => (
										<div key={item} className="flex items-start gap-3 rounded-2xl border border-white/6 bg-white/[0.02] px-4 py-3">
											<ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
											<p className="text-[0.84rem] leading-7 text-stone-300">{item}</p>
										</div>
									))}
								</div>
							</div>
						</FadeIn>
					</div>

					<div className="mt-14 flex flex-col items-center justify-between gap-6 border-t border-white/6 pt-8 text-center md:flex-row md:text-left">
						<div className="text-[0.68rem] font-inter font-semibold uppercase tracking-[0.24em] text-stone-600">
							© 2026 NFT-DND OneChain Project
						</div>
						<div className="flex flex-wrap items-center justify-center gap-6 text-[0.68rem] font-inter font-semibold uppercase tracking-[0.24em] text-stone-500">
							<a href="#world-loop" className="transition-colors hover:text-amber-300">World Loop</a>
							<a href="#top" className="transition-colors hover:text-amber-300">Genesis</a>
							<a href="#world-loop" className="transition-colors hover:text-amber-300">Lore Economy</a>
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
}
