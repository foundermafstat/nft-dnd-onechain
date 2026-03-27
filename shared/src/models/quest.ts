export const MARTA_QUEST_XP_LEVEL_2_THRESHOLD = 10;

export const MARTA_REWARD_SUCCESS = {
    xp: 6,
    lore: 3,
} as const;

export const MARTA_REWARD_FAIL = {
    xp: 2,
    lore: 1,
} as const;

export type QuestLine = 'marta' | 'aldric';

export type QuestState =
    | 'NEW'
    | 'OFFERED_BY_MARTA'
    | 'OFFERED_BY_ALDRIC'
    | 'ACCEPTED'
    | 'ADVENTURE_ACTIVE'
    | 'COMBAT_REQUIRED'
    | 'RETURN_TO_MARTA'
    | 'RETURN_TO_ALDRIC'
    | 'COMPLETED_SUCCESS'
    | 'COMPLETED_FAIL';

export type QuestStep =
    | 'talk_to_marta'
    | 'talk_to_aldric'
    | 'accept_and_prepay'
    | 'complete_adventure'
    | 'combat_mandatory'
    | 'return_to_marta'
    | 'return_to_aldric'
    | 'turn_in';

export type QuestBranch = 'pending' | 'success' | 'fail';

export type QuestCompletionOutcome = 'SUCCESS' | 'FAIL';

export type CombatOutcome = 'success' | 'fail';

export interface RewardResolution {
    gmRoll: number | null;
    nftAwarded: boolean;
    rewardReason: 'gm_roll_passed' | 'gm_roll_failed' | 'combat_failed' | 'guaranteed_success';
}

export interface QuestScenario {
    title: string;
    synopsis: string;
    steps: Array<{
        step: QuestStep;
        title: string;
        description: string;
        mandatory: boolean;
    }>;
}

export interface QuestFlow {
    questLine: QuestLine;
    state: QuestState;
    branch: QuestBranch;
    combatOutcome: CombatOutcome | null;
    scenario: QuestScenario;
    questGiverNpcId: string;
    sessionId: number | null;
    rewardResolution: RewardResolution | null;
    rewardDraft: {
        name: string;
        rarityTier: number;
        metadataCid: string;
        loreCid: string;
    } | null;
    metadata?: Record<string, unknown>;
}

export type MartaQuestFlow = QuestFlow;
export type MartaQuestScenario = QuestScenario;
