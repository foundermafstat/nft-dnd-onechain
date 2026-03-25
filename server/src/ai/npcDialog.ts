import { generateContent } from './openai';
import { NpcData, addNpcMemory } from '../db/npcQueries';

interface DialogMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface DialogResponse {
    message: string;
    mood?: string;
}

/**
 * Builds the AI system prompt from the NPC's JSONB fields.
 */
function buildSystemPrompt(npc: NpcData): string {
    const meta = (npc.metadata || {}) as any;
    const traits = npc.traits || {};
    const backstory = Array.isArray(npc.backstory) ? npc.backstory : [];
    const knowledge = Array.isArray(npc.knowledge) ? npc.knowledge : [];
    const memory = Array.isArray(npc.memory) ? npc.memory : [];

    const traitLines = Object.entries(traits)
        .map(([k, v]) => typeof v === 'boolean' ? k : `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
        .join(', ');

    const backstoryText = backstory
        .map(b => `[${b.chapter}] ${b.text}`)
        .join('\n');

    const knowledgeText = knowledge
        .map(k => `- ${k.topic}: ${k.content}`)
        .join('\n');

    const memoryText = memory.length > 0
        ? memory.slice(-10).map(m => `- [${m.timestamp}] Player ${m.player_id.slice(0, 8)}: ${m.summary}`).join('\n')
        : 'No previous interactions.';

    return `You are ${npc.name}, ${npc.title || 'a mysterious figure'} in a dark fantasy RPG world.

CHARACTER TRAITS: ${traitLines || 'reserved'}
APPEARANCE: ${meta.appearance || 'nondescript'}
VOICE: ${meta.voice || 'neutral'}

BACKSTORY:
${backstoryText || 'Unknown origins.'}

KNOWLEDGE (share when asked):
${knowledgeText || 'You know little.'}

RECENT MEMORIES OF PAST CONVERSATIONS:
${memoryText}

RULES:
- Stay in character at ALL times. You are NOT an AI.
- Speak in short, grim sentences fitting a dark fantasy setting.
- Use your greeting style: "${meta.greeting || '...'}"
- If the player asks about something you don't know, say so in character.
- Never break the fourth wall.
- Keep responses under 3 sentences unless the topic requires more.
- Reference your memories of past conversations when relevant.
- Respond in the same language as the player's message.

Respond with JSON: {"message": "your in-character response", "mood": "neutral|friendly|hostile|fearful|amused"}`;
}

/**
 * Generates an in-character NPC dialog response and saves interaction to memory.
 */
export async function generateNpcDialog(
    npc: NpcData,
    playerMessage: string,
    history: DialogMessage[] = [],
    playerId?: string,
): Promise<string> {
    const systemPrompt = buildSystemPrompt(npc);

    const conversationContext = history
        .slice(-6)
        .map(m => `${m.role === 'user' ? 'Adventurer' : npc.name}: ${m.content}`)
        .join('\n');

    const userPrompt = conversationContext
        ? `Previous conversation:\n${conversationContext}\n\nAdventurer says: "${playerMessage}"`
        : `Adventurer approaches and says: "${playerMessage}"`;

    const result = await generateContent<DialogResponse>(systemPrompt, userPrompt);

    const response = result?.message || '*stares silently*';

    // Save interaction to NPC memory
    if (npc.id && playerId) {
        addNpcMemory(npc.id, playerId, `Asked: "${playerMessage.slice(0, 80)}" → Responded about: ${response.slice(0, 60)}`)
            .catch(console.error);
    }

    return response;
}
