import { SERVER_URL } from './config';
import type { CombatOutcome, MartaQuestFlow } from 'shared';

interface MartaQuestBaseResponse {
    success: boolean;
    error?: string;
    details?: string;
}

export interface StartDialogResponse extends MartaQuestBaseResponse {
    alreadyActive?: boolean;
    questId?: string;
    state?: string;
    flow?: MartaQuestFlow;
    martaLine?: string;
    aldricLine?: string;
}

export interface AcceptAndPrepayResponse extends MartaQuestBaseResponse {
    questId?: string;
    state?: string;
    flow?: MartaQuestFlow;
}

export interface SubmitCombatResponse extends MartaQuestBaseResponse {
    questId?: string;
    state?: string;
    branch?: 'success' | 'fail';
    flow?: MartaQuestFlow;
}

export interface TurnInResponse extends MartaQuestBaseResponse {
    questId?: string;
    combatOutcome?: CombatOutcome;
    gmRoll?: number;
    nftAwarded?: boolean;
    nftObjectId?: string | null;
    rewardDraft?: {
        name: string;
        rarityTier: number;
        metadataCid: string;
        loreCid: string;
    } | null;
    xpDelta?: number;
    loreDelta?: number;
    levelDelta?: number;
    newProgress?: {
        xp: number;
        level: number;
    };
    flow?: MartaQuestFlow;
}

export interface StartCellarCombatResponse extends MartaQuestBaseResponse {
    questId?: string;
    combat?: any;
    flow?: MartaQuestFlow;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${SERVER_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || payload?.details || 'Request failed');
    }
    return payload as T;
}

export function startDialogWithMarta(input: { playerId: string }) {
    return postJson<StartDialogResponse>('/api/quest/marta/start-dialog', input);
}

export function acceptMartaQuestAndPrepay(input: { questId: string; playerId: string; sessionId: number }) {
    return postJson<AcceptAndPrepayResponse>('/api/quest/marta/accept-and-prepay', input);
}

export function submitMartaCombatResult(input: { questId: string; playerId: string; combatOutcome: CombatOutcome }) {
    return postJson<SubmitCombatResponse>('/api/quest/marta/submit-combat-result', input);
}

export function turnInMartaQuest(input: { questId: string; playerId: string; characterId: string }) {
    return postJson<TurnInResponse>('/api/quest/marta/turn-in', input);
}

export function startDialogWithAldric(input: { playerId: string }) {
    return postJson<StartDialogResponse>('/api/quest/aldric/start-dialog', input);
}

export function acceptAldricQuestAndPrepay(input: { questId: string; playerId: string; sessionId: number }) {
    return postJson<AcceptAndPrepayResponse>('/api/quest/aldric/accept-and-prepay', input);
}

export function submitAldricCombatResult(input: { questId: string; playerId: string; combatOutcome: CombatOutcome; combatId?: string }) {
    return postJson<SubmitCombatResponse>('/api/quest/aldric/submit-combat-result', input);
}

export function startAldricCellarCombat(input: { questId: string; playerId: string; characterId: string }) {
    return postJson<StartCellarCombatResponse>('/api/quest/aldric/start-cellar-combat', input);
}

export function turnInAldricQuest(input: { questId: string; playerId: string; characterId: string }) {
    return postJson<TurnInResponse>('/api/quest/aldric/turn-in', input);
}
