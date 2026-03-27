import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import path from 'path';
import sharp from 'sharp';

dotenv.config({ path: path.resolve(import.meta.dirname, '../../../.env') });

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
});

type ItemRarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
type ItemCategory = 'Weapon' | 'Armor' | 'Gear' | 'Magic' | 'Scroll' | 'Wand' | 'QuestItem';
type ItemSubcategory =
    | 'Melee'
    | 'Ranged'
    | 'Light'
    | 'Medium'
    | 'Heavy'
    | 'Shield'
    | 'Tool'
    | 'Consumable';

export interface QuestLoreContext {
    questId: string;
    questStatus?: string;
    locationId?: string | null;
    locationName?: string | null;
    partyMembers?: string[];
    recentActions: Array<{
        playerAction?: string | null;
        aiNarrative?: string | null;
        engineTrigger?: string | null;
        playerRoll?: number | null;
    }>;
}

export interface GeneratedQuestNftArtifact {
    name: string;
    description: string;
    lore: string;
    rarity: ItemRarity;
    category: ItemCategory;
    subcategory: ItemSubcategory;
    baseType: string;
    perks: string[];
    stats: Record<string, any>;
    bonuses: Record<string, any>;
    imagePrompt: string;
    imageBytes: Buffer;
    imageMimeType: string;
    imageExt: 'png' | 'jpeg' | 'webp';
}

const UNIFIED_NFT_ITEM_ART_STYLE = [
    'single centered fantasy item icon',
    'dark fantasy relic aesthetic, gritty but readable',
    'transparent background only (alpha), no backdrop or scenery',
    'square icon composition intended for 512x512 output',
    'clean silhouette and readable shape language',
    'subtle rim lighting, restrained palette, high contrast edges',
    'no character, no text, no watermark, no UI',
    'production-ready inventory game asset presentation',
].join(', ');

interface GeneratedArtifactPayload {
    name: string;
    description: string;
    lore: string;
    rarity: ItemRarity;
    category: ItemCategory;
    subcategory: ItemSubcategory;
    baseType: string;
    perks: string[];
    stats: Record<string, any>;
    bonuses: Record<string, any>;
    imagePrompt: string;
}

function clampRarity(input: string): ItemRarity {
    const allowed: ItemRarity[] = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
    return allowed.includes(input as ItemRarity) ? (input as ItemRarity) : 'Rare';
}

function clampCategory(input: string): ItemCategory {
    const allowed: ItemCategory[] = ['Weapon', 'Armor', 'Gear', 'Magic', 'Scroll', 'Wand', 'QuestItem'];
    return allowed.includes(input as ItemCategory) ? (input as ItemCategory) : 'QuestItem';
}

function clampSubcategory(input: string): ItemSubcategory {
    const allowed: ItemSubcategory[] = [
        'Melee',
        'Ranged',
        'Light',
        'Medium',
        'Heavy',
        'Shield',
        'Tool',
        'Consumable',
    ];
    return allowed.includes(input as ItemSubcategory) ? (input as ItemSubcategory) : 'Tool';
}

function parseJsonObject<T>(raw: string | null): T | null {
    if (!raw) return null;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

function summarizeContext(context: QuestLoreContext): string {
    const actions = context.recentActions
        .slice(-6)
        .map((entry, idx) => {
            const parts = [
                entry.playerAction ? `action="${entry.playerAction}"` : '',
                entry.engineTrigger ? `trigger=${entry.engineTrigger}` : '',
                entry.playerRoll !== undefined && entry.playerRoll !== null ? `roll=${entry.playerRoll}` : '',
                entry.aiNarrative ? `narrative="${entry.aiNarrative}"` : '',
            ].filter(Boolean);
            return `${idx + 1}. ${parts.join(' | ')}`;
        })
        .join('\n');

    return [
        `Quest ID: ${context.questId}`,
        `Quest Status: ${context.questStatus || 'InProgress'}`,
        `Location: ${context.locationName || context.locationId || 'Unknown'}`,
        `Party Members: ${(context.partyMembers || []).join(', ') || 'Unknown'}`,
        'Recent events:',
        actions || 'No detailed history.',
    ].join('\n');
}

function defaultImageExtFromMime(mime: string): 'png' | 'jpeg' | 'webp' {
    if (mime.includes('webp')) return 'webp';
    if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpeg';
    return 'png';
}

function rarityMultiplier(rarity: ItemRarity): number {
    switch (rarity) {
        case 'Common': return 1.0;
        case 'Uncommon': return 1.2;
        case 'Rare': return 1.5;
        case 'Epic': return 2.0;
        case 'Legendary': return 3.0;
        default: return 1.0;
    }
}

export async function generateQuestNftArtifact(
    context: QuestLoreContext,
    options?: {
        model?: string;
        imageModel?: string;
        imageSize?: '1024x1024' | '1536x1024' | '1024x1536' | 'auto';
        imageQuality?: 'low' | 'medium' | 'high' | 'auto';
        imageOutputFormat?: 'png' | 'jpeg' | 'webp';
        imageBackground?: 'auto' | 'transparent' | 'opaque';
        styleHint?: string;
        explicitPrompt?: string;
    },
): Promise<GeneratedQuestNftArtifact> {
    const contextSummary = summarizeContext(context);

    const systemPrompt = `You are an item-forging AI for a dark fantasy RPG.
Generate exactly one NFT-worthy item bound to the quest context.
Return strict JSON only:
{
  "name": "string",
  "description": "1-2 sentence concise item description",
  "lore": "2-4 sentence lore that explains how and under what circumstances this item was obtained in the quest",
  "rarity": "Common|Uncommon|Rare|Epic|Legendary",
  "category": "Weapon|Armor|Gear|Magic|Scroll|Wand|QuestItem",
  "subcategory": "Melee|Ranged|Light|Medium|Heavy|Shield|Tool|Consumable",
  "baseType": "short base type label",
  "perks": ["perk 1", "perk 2"],
  "stats": {},
  "bonuses": {},
  "imagePrompt": "detailed prompt for a single centered item render, no text, no watermark, dramatic but readable, game asset style"
}`;

    const userPrompt = [
        contextSummary,
        `Global visual style (mandatory): ${UNIFIED_NFT_ITEM_ART_STYLE}`,
        options?.styleHint ? `Extra style hint: ${options.styleHint}` : '',
        options?.explicitPrompt ? `Additional creator note: ${options.explicitPrompt}` : '',
    ].filter(Boolean).join('\n\n');

    const completion = await openai.chat.completions.create({
        model: options?.model || 'gpt-4o',
        response_format: { type: 'json_object' },
        temperature: 0.8,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ],
    });

    const parsed = parseJsonObject<GeneratedArtifactPayload>(completion.choices[0]?.message?.content ?? null);
    if (!parsed?.name || !parsed?.lore || !parsed?.imagePrompt) {
        throw new Error('AI did not return a valid NFT artifact payload');
    }

    const finalImagePrompt = `${parsed.imagePrompt}. Required visual style: ${UNIFIED_NFT_ITEM_ART_STYLE}.`;

    // NOTE:
    // GPT image models currently support 1024x1024 / 1536x1024 / 1024x1536.
    // We pin 1024x1024 here as the closest stable square format.
    const imageResp: any = await openai.images.generate({
        model: options?.imageModel || 'gpt-image-1.5',
        prompt: finalImagePrompt,
        size: '1024x1024',
        quality: 'low',
        output_format: 'png',
        background: 'transparent',
        moderation: 'auto',
        n: 1,
    } as any);

    const b64 = imageResp?.data?.[0]?.b64_json;
    if (!b64) {
        throw new Error('Image generation returned no base64 payload');
    }

    const imageExt: 'png' | 'jpeg' | 'webp' = 'png';
    const imageMimeType = 'image/png';

    const originalImageBytes = Buffer.from(b64, 'base64');
    const imageBytes = await sharp(originalImageBytes)
        .resize(512, 512, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png({
            // "Low quality" equivalent for PNG via palette quantization.
            palette: true,
            quality: 40,
            compressionLevel: 9,
            effort: 1,
        })
        .toBuffer();
    const safeRarity = clampRarity(parsed.rarity);

    return {
        name: parsed.name.trim(),
        description: parsed.description?.trim() || 'Forged in the heat of the latest quest.',
        lore: parsed.lore.trim(),
        rarity: safeRarity,
        category: clampCategory(parsed.category),
        subcategory: clampSubcategory(parsed.subcategory),
        baseType: parsed.baseType?.trim() || `${safeRarity} Relic`,
        perks: Array.isArray(parsed.perks) ? parsed.perks.slice(0, 4) : [],
        stats: parsed.stats && typeof parsed.stats === 'object' ? parsed.stats : {},
        bonuses: parsed.bonuses && typeof parsed.bonuses === 'object'
            ? parsed.bonuses
            : { damage_bonus: Math.floor(1 * rarityMultiplier(safeRarity)) },
        imagePrompt: parsed.imagePrompt,
        imageBytes,
        imageMimeType,
        imageExt: defaultImageExtFromMime(imageMimeType),
    };
}
