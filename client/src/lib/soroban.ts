export async function startGame(playerAddress: string): Promise<{ success: boolean; hash?: string; sessionId?: number; error?: string }> {
    try {
        const sessionId = Math.floor(Math.random() * 1000000);
        const hash = `local-${playerAddress.slice(0, 6)}-${sessionId}`;
        return { success: true, hash, sessionId };

    } catch (error: any) {
        console.error('Error starting game:', error);
        return { success: false, error: error.message || 'Failed to start game' };
    }
}

export async function endGame(playerAddress: string, sessionId: number): Promise<{ success: boolean; hash?: string; error?: string }> {
    try {
        const hash = `local-${playerAddress.slice(0, 6)}-end-${sessionId}`;
        return { success: true, hash };

    } catch (error: any) {
        console.error('Error ending game:', error);
        return { success: false, error: error.message || 'Failed to end game' };
    }
}
