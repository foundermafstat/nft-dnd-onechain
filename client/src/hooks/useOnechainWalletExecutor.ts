'use client';

import { useMemo } from 'react';
import {
  useConnectWallet,
  useCurrentAccount,
  useCurrentWallet,
  useSignAndExecuteTransaction,
  useSuiClient,
} from '@onelabs/dapp-kit';
import type { OnechainTxExecutionResult, OnechainWalletExecutor } from '@/lib/OneChain';

const PERMISSION_ERROR_PATTERN = /viewAccount|suggestTransaction/i;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    try {
      return JSON.stringify(error, Object.getOwnPropertyNames(error));
    } catch {
      return String(error);
    }
  }
  return String(error);
}

function isWalletPermissionError(error: unknown): boolean {
  return PERMISSION_ERROR_PATTERN.test(getErrorMessage(error));
}

export function useOnechainWalletExecutor() {
  const currentAccount = useCurrentAccount();
  const { currentWallet } = useCurrentWallet();
  const connectWallet = useConnectWallet();
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

        const executeWithCurrentSession = async () =>
          await signAndExecuteTransaction.mutateAsync({
            transaction: tx as any,
            account: currentAccount,
            chain,
          });

        try {
          return await executeWithCurrentSession();
        } catch (error) {
          // OneWallet may keep a stale connection missing transaction permissions.
          // Force a non-silent reconnect once to request full permissions, then retry.
          if (!isWalletPermissionError(error) || !currentWallet) {
            throw error;
          }

          await connectWallet.mutateAsync({ wallet: currentWallet });
          return await executeWithCurrentSession();
        }
      },
    };
  }, [connectWallet, currentAccount, currentWallet, signAndExecuteTransaction]);

  return {
    executor,
    isExecuting: signAndExecuteTransaction.isPending,
    lastError: signAndExecuteTransaction.error,
  };
}
