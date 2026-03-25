import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(import.meta.dirname, '../../../.env') });

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
});

/**
 * Base AI interaction point. Prompts Open AI with game context to generate JSON structured responses.
 */
export async function generateContent<T>(systemPrompt: string, userPrompt: string): Promise<T | null> {
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o', // Or gpt-4-turbo depending on preference
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            response_format: { type: 'json_object' }
        });

        const content = response.choices[0].message.content;
        if (!content) return null;

        return JSON.parse(content) as T;
    } catch (error) {
        console.error('Error in OpenAI Generation:', error);
        return null;
    }
}
