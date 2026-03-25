'use client';

import { useState, useEffect } from "react";
import WelcomeScreen from "@/components/WelcomeScreen";
import DndInterface from "@/components/DndInterface";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { SERVER_URL } from "@/lib/config";
import { useGameState } from "@/store/useGameState";

export default function Home() {
  const { playerId, walletAddress, setAuth, isLoading } = useAuth();
  const router = useRouter();
  const setPlayerCharacter = useGameState(state => state.setPlayerCharacter);

  // Character Check State
  const [characters, setCharacters] = useState<any[] | null>(null);
  const [isLoadingChars, setIsLoadingChars] = useState(false);

  useEffect(() => {
    if (playerId) {
      setIsLoadingChars(true);

      fetch(`${SERVER_URL}/api/character/player/${playerId}`)
        .then(res => res.json())
        .then(data => {
          setCharacters(data.characters || []);
          if (data.characters && data.characters.length > 0) {
            setPlayerCharacter(data.characters[0]);
          } else {
            setPlayerCharacter(null);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoadingChars(false));
    } else {
      setCharacters(null);
      setPlayerCharacter(null);
    }
  }, [playerId]);

  // Don't flash the welcome screen while checking localStorage or characters
  if (isLoading || isLoadingChars) {
    return (
      <main className="flex flex-col h-screen overflow-hidden bg-[#050505] text-amber-50 font-inter items-center justify-center">
        <div className="w-12 h-12 border-2 border-amber-600 border-t-transparent rounded-full animate-spin drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
      </main>
    );
  }

  return (
    <main className="flex flex-col h-screen overflow-hidden bg-black text-amber-50 font-inter selection:bg-amber-900/50 selection:text-amber-100">

      {/* The main workspace: Canvas area taking all available space minus BottomNav */}
      <div className="flex-1 relative w-full h-full bg-[#050505] shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]">

        {/* Render Canvas and Fixed Overlays ONLY when logged in and has characters */}
        {playerId && characters !== null ? (
          characters.length > 0 ? (
            <DndInterface playerId={playerId} walletAddress={walletAddress || ''} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center relative z-20">
              {/* Subtle ambient glow behind the card */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-900/10 rounded-full blur-[100px] pointer-events-none"></div>

              <div className="bg-[#0a0a0a] border border-amber-900/30 rounded-2xl p-12 shadow-[0_20px_50px_rgba(0,0,0,0.8)] max-w-lg w-full relative overflow-hidden backdrop-blur-xl">
                {/* Top luminous border */}
                <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/80 to-transparent"></div>
                <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-amber-500/5 to-transparent pointer-events-none"></div>

                <h2 className="text-4xl font-cinzel font-bold text-amber-50 mb-6 tracking-widest uppercase drop-shadow-md">No Hero Found</h2>
                <div className="w-16 h-px bg-amber-900/50 mx-auto border-none mb-6"></div>

                <p className="text-stone-400 font-inter font-light text-lg leading-relaxed mb-10">
                  Your wallet is bound to the ether, but you have no heroes traversing the realm. Enter the forge to align your attributes and begin your journey.
                </p>

                <button
                  onClick={() => router.push('/create')}
                  className="w-full relative group perspective-1000"
                >
                  <div className="absolute -inset-[2px] rounded-xl bg-gradient-to-r from-amber-600 via-amber-400 to-amber-700 opacity-40 group-hover:opacity-100 transition duration-700 blur-[8px] group-hover:blur-[12px]"></div>
                  <div className="relative bg-[#050505] border border-amber-900/50 rounded-xl py-5 flex items-center justify-center gap-4 transition-all duration-500 group-hover:bg-[#0a0a0a] shadow-inner transform group-active:scale-[0.98]">
                    <UserPlus className="w-5 h-5 text-amber-500 group-hover:text-amber-400 group-hover:scale-110 transition-all duration-500" />
                    <span className="font-bold font-cinzel tracking-[0.2em] text-amber-50 uppercase drop-shadow-sm">
                      Forge a Hero
                    </span>
                  </div>
                </button>
              </div>
            </div>
          )
        ) : (
          <WelcomeScreen onAuth={setAuth} />
        )}
      </div>


    </main>
  );
}
