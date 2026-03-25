import { supabase } from '../db/supabase';

export async function upsertPlayerByWallet(walletAddress: string) {
    const { data, error } = await supabase
        .from('players')
        .upsert(
            {
                wallet_address: walletAddress,
                last_login: new Date().toISOString()
            },
            { onConflict: 'wallet_address' }
        )
        .select()
        .single();

    if (error) {
        console.error('Error upserting player:', error);
        throw error;
    }

    return data;
}
