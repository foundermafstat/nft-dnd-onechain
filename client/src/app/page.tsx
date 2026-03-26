'use client';

import { useState, useEffect } from "react";
import WelcomeScreen from "@/components/WelcomeScreen";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { SERVER_URL } from "@/lib/config";
import { useGameState } from "@/store/useGameState";

export default function Home() {
  const { playerId, setAuth, isLoading } = useAuth();
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
            router.replace('/game');
          } else {
            setPlayerCharacter(null);
            router.replace('/create');
          }
        })
        .catch(console.error)
        .finally(() => setIsLoadingChars(false));
    } else {
      setCharacters(null);
      setPlayerCharacter(null);
    }
  }, [playerId, router, setPlayerCharacter]);

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
      <div className="flex-1 relative w-full h-full bg-[#050505] shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]">
        <WelcomeScreen onAuth={setAuth} />
      </div>
    </main>
  );
}
