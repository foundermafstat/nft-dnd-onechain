'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DndInterface from "@/components/DndInterface";
import { useAuth } from "@/context/AuthContext";
import { SERVER_URL } from "@/lib/config";
import { useGameState } from "@/store/useGameState";

export default function GamePage() {
  const { playerId, walletAddress, isLoading } = useAuth();
  const router = useRouter();
  const setPlayerCharacter = useGameState((state) => state.setPlayerCharacter);
  const [isLoadingChars, setIsLoadingChars] = useState(false);
  const [hasCharacter, setHasCharacter] = useState<boolean | null>(null);

  useEffect(() => {
    if (isLoading) return;

    if (!playerId) {
      router.replace('/');
      return;
    }

    setIsLoadingChars(true);

    fetch(`${SERVER_URL}/api/character/player/${playerId}`)
      .then((res) => res.json())
      .then((data) => {
        const characters = data.characters || [];

        if (characters.length > 0) {
          setPlayerCharacter(characters[0]);
          setHasCharacter(true);
          return;
        }

        setPlayerCharacter(null);
        setHasCharacter(false);
        router.replace('/create');
      })
      .catch((error) => {
        console.error(error);
        setPlayerCharacter(null);
        router.replace('/');
      })
      .finally(() => setIsLoadingChars(false));
  }, [isLoading, playerId, router, setPlayerCharacter]);

  if (isLoading || isLoadingChars || !playerId || !hasCharacter) {
    return (
      <main className="flex h-full items-center justify-center overflow-hidden bg-[#050505] text-amber-50">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-amber-600 border-t-transparent drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
      </main>
    );
  }

  return (
    <main className="flex h-full flex-col overflow-hidden bg-black text-amber-50 font-inter selection:bg-amber-900/50 selection:text-amber-100">
      <div className="relative h-full w-full flex-1 bg-[#050505] shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]">
        <DndInterface playerId={playerId} walletAddress={walletAddress || ''} />
      </div>
    </main>
  );
}
