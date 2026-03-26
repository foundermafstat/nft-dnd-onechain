'use client';

import { useMemo } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import type { OnechainTxExecutionResult, OnechainWalletExecutor } from '@/lib/OneChain';

export function useOnechainWalletExecutor() {
  const currentAccount = useCurrentAccount();
  const client = useSuiClient();

  const signAndExecuteTransaction = useSignAndExecuteTransaction<OnechainTxExecutionResult>({
    execute: async ({ bytes, signature }) => {
      return (await client.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: {
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
          showBalanceChanges: true,
          showRawEffects: true,
        },
      })) as OnechainTxExecutionResult;
    },
  });

  const executor = useMemo<OnechainWalletExecutor | null>(() => {
    if (!currentAccount?.address) return null;

    return {
      accountAddress: currentAccount.address,
      execute: async (tx: unknown) => {
        const chain = currentAccount.chains?.[0];
        return await signAndExecuteTransaction.mutateAsync({
          transaction: tx as any,
          account: currentAccount,
          chain,
        });
      },
    };
  }, [currentAccount, signAndExecuteTransaction]);

  return {
    executor,
    isExecuting: signAndExecuteTransaction.isPending,
    lastError: signAndExecuteTransaction.error,
  };
}
