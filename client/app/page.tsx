import { NetworkCard } from "../components/network-card";
import { getProjectStatus } from "../lib/api";

export default async function HomePage() {
  const status = await getProjectStatus();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_30%),linear-gradient(135deg,_#07111f_0%,_#0c1829_45%,_#140f1f_100%)] text-slate-50">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-20">
        <div className="max-w-3xl">
          <p className="text-sm uppercase tracking-[0.5em] text-cyan-200/70">
            OneChain Migration
          </p>
          <h1 className="mt-6 text-5xl font-semibold tracking-tight text-white md:text-7xl">
            NFT-DND is now structured as a OneChain-first monorepo.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
            The client is powered by Next.js 16, the backend exposes OneChain
            configuration through Express, the docs live in Nextra, and the
            contracts package is ready for Move-based deployment.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <NetworkCard label="Backend Status" value={status.status} />
          <NetworkCard label="Active Network" value={status.chain.network} />
          <NetworkCard label="RPC Endpoint" value={status.chain.rpcUrl} />
          <NetworkCard
            label="Faucet"
            value={status.chain.faucetUrl ?? "No faucet available for this network"}
          />
        </div>

        <div className="mt-12 grid gap-6 rounded-[2rem] border border-white/10 bg-black/20 p-8 backdrop-blur md:grid-cols-3">
          <div>
            <h2 className="text-xl font-semibold text-white">Client</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              A modern Next.js 16 surface for gameplay, wallet onboarding, and
              AI-assisted world interactions.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Server</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              A lightweight Express API that centralizes chain settings and can
              grow into gameplay, indexing, and AI orchestration services.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Contracts</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              A Move package targeting OneChain, designed for achievements,
              legendary loot, and on-chain world history.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
