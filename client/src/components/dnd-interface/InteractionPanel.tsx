import { useState, useRef, useEffect } from 'react';
import { useGameState, ChatMessage } from '@/store/useGameState';
import { useDroppable } from '@dnd-kit/core';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Backpack, Users, Send, User, Sparkles, Dices, X, Bot } from 'lucide-react';
import DraggableItem from './DraggableItem';
import { DiceType } from '@/components/DiceOverlay';
import { SERVER_URL } from '@/lib/config';
import { endGame, mintInventoryNFT, mintInventoryNFTFromPrepay, startGame } from '@/lib/OneChain';
import { buildTxExplorerUrl } from '@/lib/onechainExplorer';
import { useAuth } from '@/context/AuthContext';
import { useOnechainWalletExecutor } from '@/hooks/useOnechainWalletExecutor';
import {
    acceptAldricQuestAndPrepay,
    acceptMartaQuestAndPrepay,
    declineQuestOffer,
    startDialogWithTheron,
    startDialogWithAldric,
    startDialogWithMarta,
    submitTheronAnswer,
    submitTheronD20,
    submitMartaCombatResult,
    turnInAldricQuest,
    turnInMartaQuest
} from '@/lib/martaQuestApi';
import { quoteAdventurePrepay } from '@/lib/onechainEconomy';

interface InteractionPanelProps {
	triggerRoll: (type: DiceType) => void;
}

const THERON_QUESTIONS = [
    {
        id: 'theron_q1',
        prompt: 'A thief runs into the chapel during curfew. What does a loyal guard do first?',
        options: [
            { id: 'q1_a', label: 'Secure civilians and call for backup.' },
            { id: 'q1_b', label: 'Ignore protocol and chase alone.' },
            { id: 'q1_c', label: 'Take a bribe and look away.' },
        ],
    },
    {
        id: 'theron_q2',
        prompt: 'At the castle gate, undead are spotted at dusk. What is the right command?',
        options: [
            { id: 'q2_a', label: 'Open the gate to lure them in.' },
            { id: 'q2_b', label: 'Hold formation and signal Sergeant Bryn.' },
            { id: 'q2_c', label: 'Drop weapons and run.' },
        ],
    },
] as const;

function getMessageTone(senderType: ChatMessage['senderType']) {
	if (senderType === 'player') {
		return 'border-white/7 bg-[linear-gradient(180deg,rgba(27,27,30,0.96),rgba(18,18,20,0.96))] text-stone-100 rounded-tr-lg';
	}

	if (senderType === 'dm') {
		return 'border-amber-400/14 bg-[linear-gradient(180deg,rgba(64,48,24,0.30),rgba(20,18,15,0.96))] text-[#f2e7c7] rounded-tl-lg shadow-[0_16px_28px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.04)]';
	}

	if (senderType === 'system') {
		return 'border-transparent bg-transparent px-0 py-0 text-[0.73rem] italic text-stone-500 shadow-none';
	}

	return 'border-white/6 bg-[linear-gradient(180deg,rgba(18,21,24,0.96),rgba(12,14,16,0.96))] text-stone-200 rounded-bl-lg';
}

export default function InteractionPanel({ triggerRoll }: InteractionPanelProps) {
	const {
		chatMessages,
		addMessage,
        removeMessage,
        removeQuestOfferMessagesForNpc,
		currentTurn,
		activeNpc,
		setActiveNpc,
		entities,
		testQuestState,
		setTestQuestState,
		testQuestSessionId,
        setTestQuestSessionId,
        activeQuestId,
        setActiveQuestId,
        questFlow,
        setQuestFlow,
        playerCharacter,
        lastDiceRoll,
        pendingDiceRequest,
        setPendingDiceRequest,
	} = useGameState();
	const { walletAddress, playerId } = useAuth();
	const { executor } = useOnechainWalletExecutor();
	const [inputText, setInputText] = useState('');
	const [isSendingDialog, setIsSendingDialog] = useState(false);
	const [activeMenu, setActiveMenu] = useState<'inventory' | 'party' | 'playerInfo' | 'skills' | 'dice' | null>(null);
	const scrollRef = useRef<HTMLDivElement>(null);
    const processedTheronRollAtRef = useRef<number | null>(null);

	// Chat is a dropzone for using items from inventory
	const { setNodeRef: setChatDropRef, isOver: isChatOver } = useDroppable({
		id: 'chat-dropzone',
		data: { type: 'chat' }
	});

	// Auto-scroll chat to bottom
	const scrollToBottom = () => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	};

	useEffect(() => {
		// Handle immediate DOM mutations and layout changes
		const viewport = scrollRef.current;
		if (!viewport) return;

		const { scrollTop, scrollHeight, clientHeight } = viewport;
		// If user is near bottom, or opened a menu, scroll down. 
		const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;

		if (isNearBottom || activeMenu !== null) {
			// Use requestAnimationFrame to let browser paint and calculate new flex sizes
			requestAnimationFrame(() => {
				scrollToBottom();
				setTimeout(scrollToBottom, 50);
				setTimeout(scrollToBottom, 350); // After duration-300 animation
			});
		}
	}, [chatMessages, activeMenu]);

    const mapServerStateToLocal = (state: string) => {
        if (state === 'OFFERED_BY_MARTA' || state === 'OFFERED_BY_ALDRIC' || state === 'OFFERED_BY_THERON' || state === 'THERON_Q1' || state === 'THERON_Q2') return 'offered_by_marta' as const;
        if (state === 'COMBAT_REQUIRED' || state === 'ADVENTURE_ACTIVE' || state === 'ACCEPTED' || state === 'THERON_ROLL_REQUIRED') return 'combat_required' as const;
        if (state === 'RETURN_TO_MARTA' || state === 'RETURN_TO_ALDRIC' || state === 'RETURN_TO_THERON') return 'return_to_marta' as const;
        if (state === 'COMPLETED_SUCCESS') return 'completed_success' as const;
        if (state === 'COMPLETED_FAIL') return 'completed_fail' as const;
        return 'not_started' as const;
    };

    const isAcceptIntent = (text: string) =>
        /(accept|start|yes|agree|begin|take the quest|quest please|get quest|give me a quest|give quest|ready|let'?s go|lets go|help with the rats|i will help|i help you|беру|принимаю|да|начать|дай квест|возьми квест|готов|помогу|я помогу)/i.test(text);
    const isTurnInIntent = (text: string) =>
        /(turn in|report|return|complete|finish|i'm back|im back|back from battle|сдать|вернулся|готово|завершить|я вернулся|закрыть квест)/i.test(text);
    const isVictoryIntent = (text: string) =>
        /(report victory|victory|won|i won|победа|выиграл|победил)/i.test(text);
    const isDefeatIntent = (text: string) =>
        /(report defeat|defeat|lost|i lost|поражение|проиграл|проигрыш)/i.test(text);
    const isDeclineIntent = (text: string) =>
        /(decline|decline quest|abandon|abandon quest|cancel quest|no|not now|later|отказ|нет|не сейчас|позже|отменить квест|бросить квест)/i.test(text);

    const addQuestPrompt = (npcName: string, content: string, quickReplies: Array<{ label: string; payload: string }>) => {
        const labels = quickReplies.map((reply) => reply.label.trim().toLowerCase());
        if (labels.includes('agree') && labels.includes('decline')) {
            removeQuestOfferMessagesForNpc(npcName);
        }
        addMessage({
            sender: npcName,
            senderType: 'dm',
            content,
            quickReplies,
        });
    };

    const addTheronQuestionPrompt = (
        prompt: string,
        options: Array<{ id: string; label: string }>,
    ) => {
        addQuestPrompt(
            'Guard Theron',
            prompt,
            options.map((option) => ({
                label: option.label,
                payload: `theron:answer:${option.id}`,
            })),
        );
    };

    useEffect(() => {
        if (activeNpc?.name !== 'Old Marta') {
            removeQuestOfferMessagesForNpc('Old Marta');
        }
    }, [activeNpc, removeQuestOfferMessagesForNpc]);

    useEffect(() => {
        const shouldHandleTheronRoll = !!(
            lastDiceRoll &&
            lastDiceRoll.type === 'd20' &&
            questFlow?.questLine === 'theron' &&
            questFlow.state === 'THERON_ROLL_REQUIRED' &&
            activeQuestId &&
            playerId
        );
        if (!shouldHandleTheronRoll || !lastDiceRoll) return;
        if (processedTheronRollAtRef.current === lastDiceRoll.at) return;
        processedTheronRollAtRef.current = lastDiceRoll.at;

        void (async () => {
            try {
                const outcome = await submitTheronD20({
                    questId: activeQuestId!,
                    playerId: playerId!,
                    d20Roll: lastDiceRoll.value,
                });

                if (outcome.flow) {
                    setQuestFlow(outcome.flow);
                    setTestQuestState(mapServerStateToLocal(outcome.flow.state));
                }
                setPendingDiceRequest(null);

                addMessage({
                    sender: 'Guard Theron',
                    senderType: 'dm',
                    content: outcome.theronLine || (outcome.nftAwarded
                        ? 'You passed the watch trial.'
                        : 'Trial failed. Return when you are ready.'),
                });

                if (outcome.nftAwarded && outcome.rewardDraft) {
                    if (!walletAddress || !executor) {
                        addMessage({
                            sender: 'System',
                            senderType: 'system',
                            content: 'Theron reward unlocked, but wallet signer is missing. Reconnect to mint.',
                        });
                        return;
                    }

                    const minted = await mintInventoryNFT({
                        playerAddress: walletAddress,
                        name: outcome.rewardDraft.name,
                        rarityTier: outcome.rewardDraft.rarityTier,
                        metadataCid: outcome.rewardDraft.metadataCid,
                        loreCid: outcome.rewardDraft.loreCid,
                    }, executor);

                    addMessage({
                        sender: 'System',
                        senderType: 'system',
                        content: minted.success
                            ? `Theron reward minted${minted.objectId ? ` (${minted.objectId.slice(0, 14)}...)` : ''}.`
                            : `[MINT ERROR] ${minted.error || 'Failed to mint Theron reward NFT.'}`,
                        txHash: minted.success ? (minted.hash || null) : undefined,
                        txUrl: minted.success ? buildTxExplorerUrl(minted.hash || null) || undefined : undefined,
                    });

                    if (minted.success && playerCharacter?.id) {
                        await fetch(`${SERVER_URL}/api/character/${playerCharacter.id}/inventory/add-custom`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                questId: activeQuestId,
                                name: outcome.rewardDraft.name,
                                rarityTier: outcome.rewardDraft.rarityTier,
                                metadataCid: outcome.rewardDraft.metadataCid,
                                loreCid: outcome.rewardDraft.loreCid,
                                onechainTokenId: minted.objectId || '',
                                txHash: minted.hash || '',
                            }),
                        });
                    }
                }
            } catch (err: any) {
                setPendingDiceRequest(null);
                addMessage({
                    sender: 'System',
                    senderType: 'system',
                    content: err?.message || 'Failed to resolve Theron d20 roll.',
                });
            }
        })();
    }, [
        activeQuestId,
        addMessage,
        executor,
        lastDiceRoll,
        playerId,
        questFlow?.questLine,
        questFlow?.state,
        setPendingDiceRequest,
        setQuestFlow,
        setTestQuestState,
        walletAddress,
        playerCharacter?.id,
    ]);

	const handleSend = async (overrideText?: string) => {
        const resolved = (overrideText ?? inputText).trim();
		if (!resolved || isSendingDialog) return;

		const textToRoute = resolved;
        if (!overrideText) {
            setInputText('');
        }

		if (activeNpc) {
			// NPC Conversation Mode
            if (textToRoute.startsWith('theron:answer:')) {
                addMessage({ sender: 'Player', senderType: 'player', content: 'I choose this answer.' });
            } else if (textToRoute === 'theron:roll:d20') {
                addMessage({ sender: 'Player', senderType: 'player', content: 'Rolling d20 for the watch trial.' });
            } else {
			    addMessage({ sender: 'Player', senderType: 'player', content: textToRoute });
            }

            if (activeNpc.name === 'Old Marta' || activeNpc.name === 'Grim Aldric' || activeNpc.name === 'Guard Theron') {
                try {
                    if (!playerId) {
                        addMessage({ sender: 'System', senderType: 'system', content: 'Player identity is missing.' });
                        return;
                    }
                    const questLine = activeNpc.name === 'Old Marta' ? 'marta' : activeNpc.name === 'Grim Aldric' ? 'aldric' : 'theron';

                    // Allow cancelling an already-active quest from another quest giver
                    // before attempting to start a new dialog flow.
                    if (
                        isDeclineIntent(textToRoute) &&
                        activeQuestId &&
                        questFlow &&
                        questFlow.questLine !== questLine &&
                        questFlow.state !== 'COMPLETED_SUCCESS' &&
                        questFlow.state !== 'COMPLETED_FAIL'
                    ) {
                        await declineQuestOffer({ questId: activeQuestId, playerId });
                        setActiveQuestId(null);
                        setQuestFlow(null);
                        setTestQuestSessionId(null);
                        setTestQuestState('not_started');
                        setPendingDiceRequest(null);
                        addMessage({
                            sender: 'System',
                            senderType: 'system',
                            content: 'Previous oath cancelled. You can request a new quest now.',
                        });
                        return;
                    }

                    // Start/refresh the offer
                    if (testQuestState === 'not_started' || !activeQuestId || !questFlow || questFlow.questLine !== questLine) {
                        const offer = questLine === 'marta'
                            ? await startDialogWithMarta({ playerId })
                            : questLine === 'aldric'
                                ? await startDialogWithAldric({ playerId })
                                : await startDialogWithTheron({ playerId });
                        if (offer.questId) setActiveQuestId(offer.questId);
                        if (offer.flow) {
                            setQuestFlow(offer.flow);
                            setTestQuestState(mapServerStateToLocal(offer.flow.state));
                            if (offer.flow.sessionId) setTestQuestSessionId(offer.flow.sessionId);
                        }
                        const blockedByAnotherQuest = !!offer.flow && offer.flow.questLine !== questLine;
                        if (blockedByAnotherQuest) {
                            addMessage({
                                sender: activeNpc.name,
                                senderType: 'dm',
                                content: offer.theronLine || offer.aldricLine || offer.martaLine || 'Another oath still binds you. End it before taking a new prophecy.',
                            });
                            return;
                        }
                        if (questLine === 'theron') {
                            if (offer.question) {
                                addTheronQuestionPrompt(offer.question.prompt, offer.question.options);
                            } else {
                                addMessage({
                                    sender: 'Guard Theron',
                                    senderType: 'dm',
                                    content: offer.theronLine || 'Answer my two questions, then roll d20.',
                                });
                            }
                        } else if (questLine === 'marta') {
                            addQuestPrompt(
                                'Old Marta',
                                offer.martaLine || 'The bones told me you would come...',
                                [
                                    { label: 'Agree', payload: 'let us begin' },
                                    { label: 'Decline', payload: 'not now' },
                                ],
                            );
                        } else {
                            addQuestPrompt(
                                'Grim Aldric',
                                offer.aldricLine || offer.martaLine || 'Rats are eating all my cellar stock. Can you handle them?',
                                [
                                    { label: 'Agree', payload: 'agree' },
                                    { label: 'Decline', payload: 'not now' },
                                ],
                            );
                        }
                        return;
                    }

                    if (questLine === 'theron') {
                        if (isDeclineIntent(textToRoute)) {
                            if (activeQuestId) {
                                await declineQuestOffer({ questId: activeQuestId, playerId });
                                setActiveQuestId(null);
                                setQuestFlow(null);
                                setTestQuestSessionId(null);
                                setTestQuestState('not_started');
                                setPendingDiceRequest(null);
                            }
                            addMessage({
                                sender: 'Guard Theron',
                                senderType: 'dm',
                                content: 'Trial withdrawn. Return when you want another attempt.',
                            });
                            return;
                        }

                        if (textToRoute === 'theron:roll:d20') {
                            setPendingDiceRequest('d20');
                            setActiveMenu('dice');
                            addMessage({
                                sender: 'System',
                                senderType: 'system',
                                content: 'Open Dice panel and roll d20 to resolve Theron trial.',
                            });
                            return;
                        }

                        if (textToRoute.startsWith('theron:answer:')) {
                            const answerId = textToRoute.replace('theron:answer:', '').trim();
                            if (!activeQuestId) {
                                addMessage({
                                    sender: 'System',
                                    senderType: 'system',
                                    content: 'Theron quest id is missing. Start dialog again.',
                                });
                                return;
                            }
                            const result = await submitTheronAnswer({
                                questId: activeQuestId,
                                playerId,
                                answerId,
                            });
                            if (result.flow) {
                                setQuestFlow(result.flow);
                                setTestQuestState(mapServerStateToLocal(result.flow.state));
                            }
                            if (result.nextQuestion) {
                                addTheronQuestionPrompt(result.nextQuestion.prompt, result.nextQuestion.options);
                            } else {
                                setPendingDiceRequest('d20');
                                setActiveMenu('dice');
                                addQuestPrompt(
                                    'Guard Theron',
                                    result.theronLine || 'Open Dice panel, then roll d20. You need more than 5.',
                                    [{ label: 'Roll d20', payload: 'theron:roll:d20' }],
                                );
                            }
                            return;
                        }

                        if (questFlow.state === 'THERON_ROLL_REQUIRED') {
                            setPendingDiceRequest('d20');
                            setActiveMenu('dice');
                            addQuestPrompt(
                                'Guard Theron',
                                'The watch waits. Open Dice panel and roll d20. Beat 5.',
                                [{ label: 'Roll d20', payload: 'theron:roll:d20' }],
                            );
                            return;
                        }

                        if (questFlow.state === 'OFFERED_BY_THERON' || questFlow.state === 'THERON_Q1' || questFlow.state === 'THERON_Q2') {
                            const qIndexRaw = Number((questFlow.metadata as any)?.theronQuestionIndex || 0);
                            const qIndex = Math.max(0, Math.min(THERON_QUESTIONS.length - 1, qIndexRaw));
                            const question = THERON_QUESTIONS[qIndex];
                            addTheronQuestionPrompt(question.prompt, question.options as Array<{ id: string; label: string }>);
                            return;
                        }

                        addMessage({
                            sender: 'Guard Theron',
                            senderType: 'dm',
                            content: 'Stay sharp. Use the offered replies to continue the trial.',
                        });
                        return;
                    }

                    if (isDeclineIntent(textToRoute)) {
                        const hasInProgressQuest = !!(
                            activeQuestId &&
                            questFlow &&
                            (questFlow.state !== 'COMPLETED_SUCCESS' && questFlow.state !== 'COMPLETED_FAIL')
                        );
                        if (hasInProgressQuest && activeQuestId) {
                            await declineQuestOffer({ questId: activeQuestId, playerId });
                            setActiveQuestId(null);
                            setQuestFlow(null);
                            setTestQuestSessionId(null);
                            setTestQuestState('not_started');
                        }
                        addMessage({
                            sender: activeNpc.name,
                            senderType: 'dm',
                            content: questLine === 'marta'
                                ? 'Then leave the bones alone for now.'
                                : 'Fine. Come back when you are ready to work.',
                        });
                        return;
                    }

                    if (testQuestState === 'combat_required') {
                        if (questLine === 'marta' && activeQuestId && (isVictoryIntent(textToRoute) || isDefeatIntent(textToRoute))) {
                            const outcome = isVictoryIntent(textToRoute) ? 'success' : 'fail';
                            const result = await submitMartaCombatResult({
                                questId: activeQuestId,
                                playerId,
                                combatOutcome: outcome,
                            });
                            if (result.flow) {
                                setQuestFlow(result.flow);
                                setTestQuestState(mapServerStateToLocal(result.flow.state));
                            } else {
                                setTestQuestState('return_to_marta');
                            }
                            addQuestPrompt(
                                'Old Marta',
                                outcome === 'success'
                                    ? 'You survived. Now return for judgement.'
                                    : 'You failed the clash. Return and face the bones anyway.',
                                [{ label: 'Turn In Quest', payload: 'turn in quest now' }],
                            );
                            return;
                        }
                        addQuestPrompt(
                            activeNpc.name,
                            questLine === 'marta'
                                ? 'Win the mandatory clash first, then return to me.'
                                : 'The hatch is open. Go to the cellar and kill that rat.',
                            questLine === 'aldric'
                                ? [{ label: 'Use Cellar Entrance', payload: 'heading to the cellar now' }]
                                : [
                                    { label: 'Report Victory', payload: 'report victory' },
                                    { label: 'Report Defeat', payload: 'report defeat' },
                                ],
                        );
                        return;
                    }

                    if (testQuestState === 'return_to_marta' && !isTurnInIntent(textToRoute)) {
                        addQuestPrompt(
                            activeNpc.name,
                            questLine === 'marta'
                                ? 'Report your result. I will resolve the bones now.'
                                : 'If the rat is dead, collect your reward now.',
                            [{ label: 'Turn In Quest', payload: 'turn in quest now' }],
                        );
                        return;
                    }

                    // Accept + prepay + activate adventure
                    if (testQuestState === 'offered_by_marta' && isAcceptIntent(textToRoute)) {
                        if (!walletAddress || !executor) {
                            addMessage({
                                sender: 'System',
                                senderType: 'system',
                                content: `Connect OneWallet before accepting ${activeNpc.name} quest.`,
                            });
                            return;
                        }

                        const quote = quoteAdventurePrepay({ generationCount: 3, mintableDropsEstimate: 1 });
                        const prepay = await startGame(walletAddress, executor, {
                            generationCount: 3,
                            mintableDropsEstimate: 1,
                            playerRollsCount: 64,
                            aiRollsCount: 64,
                        });
                        if (!prepay.success || !prepay.sessionId || !activeQuestId) {
                            const prepayError = (prepay.error || '').toLowerCase();
                            const isUserCancelled =
                                prepayError.includes('user rejected') ||
                                prepayError.includes('rejected the request') ||
                                prepayError.includes('request rejected') ||
                                prepayError.includes('cancelled') ||
                                prepayError.includes('canceled');
                            addMessage({
                                sender: 'System',
                                senderType: 'system',
                                content: isUserCancelled
                                    ? 'Adventure activation cancelled.'
                                    : `[PREPAY ERROR] ${prepay.error || 'Failed to activate adventure.'}`,
                            });
                            return;
                        }

                        const activated = questLine === 'marta'
                            ? await acceptMartaQuestAndPrepay({
                                questId: activeQuestId,
                                playerId,
                                sessionId: prepay.sessionId,
                            })
                            : await acceptAldricQuestAndPrepay({
                                questId: activeQuestId,
                                playerId,
                                sessionId: prepay.sessionId,
                            });
                        setTestQuestSessionId(prepay.sessionId);
                        if (activated.flow) setQuestFlow(activated.flow);
                        setTestQuestState('combat_required');

                        addMessage({
                            sender: 'System',
                            senderType: 'system',
                            content: `Quest activated. Session ${prepay.sessionId} locked with prepay ${prepay.paidOne ?? quote.totalOne} ONE.`,
                            flavorText: 'Dicepack was initialized for mandatory combat stage.',
                        });
                        addQuestPrompt(
                            activeNpc.name,
                            questLine === 'marta'
                                ? 'Now go. Win the clash and return. Lose, and return anyway.'
                                : 'Hatch is open at the north wall. Use it, kill the rat, then report back.',
                            questLine === 'marta'
                                ? [{ label: 'Understood', payload: 'i will return after the fight' }]
                                : [{ label: 'Use Cellar Entrance', payload: 'heading to the cellar now' }],
                        );
                        return;
                    }

                    if (testQuestState === 'return_to_marta' && isTurnInIntent(textToRoute)) {
                        if (!activeQuestId || !playerCharacter?.id) {
                            addMessage({
                                sender: 'System',
                                senderType: 'system',
                                content: 'Quest or character reference is missing for turn-in.',
                            });
                            return;
                        }
                        if (!walletAddress || !executor) {
                            addMessage({
                                sender: 'System',
                                senderType: 'system',
                                content: 'Reconnect OneWallet to resolve turn-in rewards.',
                            });
                            return;
                        }

                        const turnIn = questLine === 'marta'
                            ? await turnInMartaQuest({
                                questId: activeQuestId,
                                playerId,
                                characterId: playerCharacter.id,
                            })
                            : await turnInAldricQuest({
                                questId: activeQuestId,
                                playerId,
                                characterId: playerCharacter.id,
                            });

                        let mintedObjectId: string | null = null;
                        if (turnIn.nftAwarded && turnIn.rewardDraft && testQuestSessionId) {
                            const minted = await mintInventoryNFTFromPrepay({
                                playerAddress: walletAddress,
                                adventureId: testQuestSessionId,
                                name: turnIn.rewardDraft.name,
                                rarityTier: turnIn.rewardDraft.rarityTier,
                                metadataCid: turnIn.rewardDraft.metadataCid,
                                loreCid: turnIn.rewardDraft.loreCid,
                            }, executor);
                            if (minted.success) {
                                mintedObjectId = minted.objectId || null;
                            } else {
                                addMessage({
                                    sender: 'System',
                                    senderType: 'system',
                                    content: `[MINT ERROR] ${minted.error || 'Reward NFT mint failed.'}`,
                                });
                            }
                        }

                        const closeResult = await endGame(walletAddress, testQuestSessionId, executor);
                        if (!closeResult.success) {
                            addMessage({
                                sender: 'System',
                                senderType: 'system',
                                content: `[SESSION CLOSE ERROR] ${closeResult.error || 'Could not close adventure escrow.'}`,
                            });
                        }

                        if (turnIn.flow) setQuestFlow(turnIn.flow);
                        setTestQuestState(turnIn.combatOutcome === 'success' ? 'completed_success' : 'completed_fail');

                        addMessage({
                            sender: activeNpc.name,
                            senderType: 'dm',
                            content: questLine === 'marta'
                                ? `GM roll: ${turnIn.gmRoll}. ${turnIn.nftAwarded ? 'The bones favor you.' : 'Not this time.'}`
                                : (turnIn.nftAwarded ? 'Good work. Rat is dead, and your trophy rights are confirmed.' : 'You failed the cellar job. No trophy this time.'),
                            flavorText: turnIn.nftAwarded ? 'A relic-worthy omen settles over the tavern.' : 'The dice clatter and go still.',
                        });

                        addMessage({
                            sender: 'System',
                            senderType: 'system',
                            content: `Quest resolved. Outcome: ${turnIn.combatOutcome}. NFT: ${turnIn.nftAwarded ? `minted${mintedObjectId ? ` (${mintedObjectId.slice(0, 14)}...)` : ''}` : 'no reward'}. XP +${turnIn.xpDelta || 0}, Lore +${turnIn.loreDelta || 0}, Level +${turnIn.levelDelta || 0}.`,
                        });
                        return;
                    }
                } catch (err: any) {
                    addMessage({
                        sender: 'System',
                        senderType: 'system',
                        content: err?.message || `${activeNpc.name} flow failed.`,
                    });
                    return;
                }
            }

			setIsSendingDialog(true);
			try {
				// Filter chat log to just the conversation history (approx 10 messages for context)
				const history = chatMessages.slice(-10).map(m => ({
					role: m.senderType === 'player' ? 'user' : 'assistant',
					content: m.content
				}));
				// Append the brand new message
				history.push({ role: 'user', content: textToRoute });

				const res = await fetch(`${SERVER_URL}/api/npc/${activeNpc.id}/dialog`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ message: textToRoute, history })
				});
				const data = await res.json();

				if (data.success && data.response) {
					addMessage({ sender: activeNpc.name, senderType: 'dm', content: data.response });
				} else {
					addMessage({ sender: activeNpc.name, senderType: 'system', content: `*${activeNpc.name} stares silently.*` });
				}
			} catch (err) {
				addMessage({ sender: 'System', senderType: 'system', content: `*${activeNpc.name} turns away.*` });
			} finally {
				setIsSendingDialog(false);
			}
		} else {
			// Normal Chat / DM Command mode
			addMessage({ sender: 'Player', senderType: 'player', content: textToRoute });
		}
	};

	const handleNameClick = (msg: ChatMessage) => {
		if (msg.senderType === 'dm' || msg.senderType === 'enemy') {
			const npcEntity = entities.find(e => e.name === msg.sender);
			if (npcEntity) {
				setActiveNpc({ id: npcEntity.id, name: npcEntity.name });
			} else {
				// If they spoke as a DM/Enemy but aren't currently an active entity on map, just address them by name
				setActiveNpc({ id: msg.sender, name: msg.sender });
			}
		}
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') handleSend();
	};

	return (
		<div className="relative flex h-full w-full min-w-[350px] flex-col overflow-hidden">
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(214,169,90,0.08),transparent_22%),radial-gradient(circle_at_bottom,rgba(114,132,154,0.08),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_18%,transparent_82%,rgba(255,255,255,0.02))]" />

			{/* 1. Chat History (Scrollable, takes up remaining space) */}
			<div
				ref={setChatDropRef}
				className={`relative flex min-h-0 flex-1 flex-col overflow-hidden transition-colors duration-500 ${isChatOver ? 'bg-amber-900/10 ring-1 ring-inset ring-amber-500/40 shadow-[inset_0_0_60px_rgba(245,158,11,0.12)]' : ''}`}
			>
					<div className="flex items-center justify-between gap-3">
						{activeNpc && (
							<div className="rounded-full border border-white/7 bg-white/[0.03] px-3 py-1 text-[0.56rem] font-inter font-semibold uppercase tracking-[0.24em] text-stone-400">
								Linked: {activeNpc.name}
							</div>
						)}
					</div>
				<ScrollArea viewportRef={scrollRef} className="flex-1 min-h-0 bg-[linear-gradient(180deg,rgba(21,21,23,0.88),rgba(13,13,15,0.95))]">
					<div className="space-y-5 px-4 pb-5 pt-5">
						{chatMessages.map(msg => (
							<div key={msg.id} className={`flex flex-col ${msg.senderType === 'player' ? 'items-end' : 'items-start'} mb-2`}>

								<div className={`mb-1.5 flex items-baseline gap-2 ${msg.senderType === 'player' ? 'flex-row-reverse' : ''}`}>
									<button
										onClick={() => handleNameClick(msg)}
										className="cursor-pointer text-[0.54rem] font-inter font-semibold uppercase tracking-[0.24em] text-stone-500 transition-colors hover:text-amber-300"
									>
										{msg.sender}
									</button>

									{msg.flavorText && (
										<span className="max-w-[65%] text-left text-[0.64rem] italic leading-tight tracking-wide text-stone-500/80">
											{msg.flavorText}
										</span>
									)}
								</div>

								<div className={`max-w-[88%] break-words rounded-[1.25rem] border px-4 py-3 text-[0.82rem] leading-[1.6] shadow-[0_10px_22px_rgba(0,0,0,0.16)] ${getMessageTone(msg.senderType)}`}>
									<div>{msg.content}</div>
                                    {msg.txUrl && (
                                        <a
                                            href={msg.txUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="mt-2 inline-block text-[0.72rem] uppercase tracking-[0.16em] text-amber-300 underline underline-offset-4 hover:text-amber-100"
                                        >
                                            View Transaction
                                        </a>
                                    )}
                                    {Array.isArray(msg.quickReplies) && msg.quickReplies.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {msg.quickReplies.map((reply, idx) => (
                                                <button
                                                    key={`${msg.id}-reply-${idx}`}
                                                    onClick={() => {
                                                        removeMessage(msg.id);
                                                        handleSend(reply.payload);
                                                    }}
                                                    disabled={isSendingDialog}
                                                    className="rounded-xl border border-amber-400/35 bg-amber-400/[0.08] px-3 py-1.5 text-[0.62rem] font-inter font-semibold uppercase tracking-[0.14em] text-amber-100 transition hover:border-amber-200/55 hover:bg-amber-400/[0.16] disabled:opacity-50"
                                                >
                                                    {reply.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}

									{/* Render Spawned Item in Chat (Draggable) */}
									{msg.itemId && (
										<div className="mt-3">
											<DraggableItem id={msg.itemId} source="chat" />
										</div>
									)}
								</div>
							</div>
						))}
					</div>
				</ScrollArea>
			</div>

			{/* 2. Dynamic Menus (In-flow flex item to push chat up) */}
			{activeMenu && (
				<div className="relative z-20 h-[35vh] shrink-0 animate-in slide-in-from-bottom-5 duration-300 border-t border-white/6 bg-[linear-gradient(180deg,rgba(13,13,15,0.96),rgba(9,10,11,0.96))] shadow-[0_-20px_40px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
					<div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/45 to-transparent"></div>
					<div className="flex items-center justify-between border-b border-white/6 px-5 py-4">
						<h3 className="font-cinzel text-[0.9rem] font-semibold uppercase tracking-[0.24em] text-stone-100">{activeMenu}</h3>
						<button onClick={() => setActiveMenu(null)} className="text-stone-500 hover:text-amber-500 text-[10px] uppercase font-cinzel font-bold tracking-widest transition-colors flex flex-col items-center">
							<span className="text-lg leading-none">×</span>
						</button>
					</div>

					<ScrollArea className="h-[calc(100%-53px)]">
						{activeMenu === 'inventory' && <InventoryMenu />}
						{activeMenu === 'party' && <PartyMenu />}
						{activeMenu === 'playerInfo' && <PlayerInfoMenu />}
						{activeMenu === 'skills' && <SkillsMenu />}
						{activeMenu === 'dice' && <DiceMenu triggerRoll={triggerRoll} />}
					</ScrollArea>
				</div>
			)}

			{/* 3. Control Panel (Fixed Bottom) */}
			<div className="relative z-30 shrink-0 border-t border-white/6 bg-[linear-gradient(180deg,rgba(14,14,16,0.98),rgba(9,9,11,0.98))] px-4 pb-4 pt-3 shadow-[0_-10px_28px_rgba(0,0,0,0.42)]">
				<div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent"></div>

				{/* Dice & Quick Actions */}
				<div className="mb-4 flex items-center justify-between gap-3">
					{/* Left Actions */}
					<div className="flex">
						<Button
							variant="outline"
							size="sm"
							className={`h-10 rounded-xl border px-4 transition-all duration-300 ${activeMenu === 'dice' ? 'border-amber-400/34 bg-amber-400/[0.09] text-amber-200 shadow-[inset_0_0_18px_rgba(245,158,11,0.1)]' : pendingDiceRequest === 'd20' ? 'border-amber-200 bg-amber-500/[0.14] text-amber-100 shadow-[0_0_18px_rgba(245,158,11,0.28)] animate-pulse' : 'border-transparent bg-transparent text-stone-400 hover:bg-white/[0.04] hover:text-amber-100'}`}
							onClick={() => setActiveMenu(activeMenu === 'dice' ? null : 'dice')}
							title="Roll Dice"
						>
							<Dices className="h-4 w-4 mr-2" />
							<span className="text-[0.68rem] font-inter font-semibold tracking-[0.22em] uppercase">Dice</span>
						</Button>
					</div>

					{/* Right Actions */}
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							className={`h-10 rounded-xl border px-3 transition-all duration-300 ${activeMenu === 'playerInfo' ? 'border-amber-400/34 bg-amber-400/[0.09] text-amber-200 shadow-[inset_0_0_18px_rgba(245,158,11,0.1)]' : 'border-transparent bg-transparent text-stone-400 hover:bg-white/[0.04] hover:text-amber-100'}`}
							onClick={() => setActiveMenu(activeMenu === 'playerInfo' ? null : 'playerInfo')}
							title="Player Info"
						>
							<User className="h-4 w-4" />
						</Button>

						<Button
							variant="outline"
							size="sm"
							className={`h-10 rounded-xl border px-3 transition-all duration-300 ${activeMenu === 'skills' ? 'border-amber-400/34 bg-amber-400/[0.09] text-amber-200 shadow-[inset_0_0_18px_rgba(245,158,11,0.1)]' : 'border-transparent bg-transparent text-stone-400 hover:bg-white/[0.04] hover:text-amber-100'}`}
							onClick={() => setActiveMenu(activeMenu === 'skills' ? null : 'skills')}
							title="Skills & Abilities"
						>
							<Sparkles className="h-4 w-4" />
						</Button>

						<Button
							variant="outline"
							size="sm"
							className={`h-10 rounded-xl border px-3 transition-all duration-300 ${activeMenu === 'party' ? 'border-amber-400/34 bg-amber-400/[0.09] text-amber-200 shadow-[inset_0_0_18px_rgba(245,158,11,0.1)]' : 'border-transparent bg-transparent text-stone-400 hover:bg-white/[0.04] hover:text-amber-100'}`}
							onClick={() => setActiveMenu(activeMenu === 'party' ? null : 'party')}
							title="Party Status"
						>
							<Users className="h-4 w-4" />
						</Button>

						{/* INVENTORY BUTTON DROPZONE */}
						<InventoryButtonDropzone activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
					</div>
				</div>

				{/* Text Input */}
				<div className="">
					<div className="relative flex items-center gap-3">
						<div className={`flex h-13 flex-1 items-center gap-2 rounded-[20px] border px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-all bg-[linear-gradient(180deg,rgba(10,10,11,0.98),rgba(16,16,18,0.96))] ${activeNpc || isSendingDialog ? 'border-amber-500/40 ring-1 ring-amber-500/25' : 'border-white/8 focus-within:border-amber-500/28 focus-within:ring-1 focus-within:ring-amber-500/24'}`}>
						{activeNpc && (
							<div className="group/badge flex shrink-0 items-center gap-2 rounded-2xl border border-amber-400/18 bg-amber-400/[0.08] py-1.5 pl-3 pr-1.5 text-amber-200 shadow-[0_0_18px_rgba(245,158,11,0.08)]">
								<span className="text-[10px] font-cinzel font-bold uppercase tracking-widest flex items-center gap-1.5">
									<span className="text-amber-600">to:</span> {activeNpc.name}
								</span>
								<button
									onClick={() => setActiveNpc(null)}
									className="p-0.5 rounded-sm hover:bg-amber-800/50 text-amber-600 hover:text-amber-200 transition-colors"
									title="End Conversation"
								>
									<X className="w-3 h-3" />
								</button>
							</div>
						)}
						<input
							className="h-full flex-1 border-none bg-transparent text-[0.84rem] text-stone-100 placeholder:text-stone-500 font-inter outline-none"
							placeholder={
								isSendingDialog ? `${activeNpc?.name} is responding...` :
									activeNpc ? `Type message...` :
										currentTurn === 'player' ? "What do you do?" : "Wait for your turn..."
							}
							value={inputText}
							onChange={(e) => setInputText(e.target.value)}
							onKeyDown={handleKeyPress}
							disabled={currentTurn !== 'player' || isSendingDialog}
						/>
						</div>

							<button
								onClick={() => handleSend()}
							disabled={!inputText.trim() || currentTurn !== 'player' || isSendingDialog}
							className="group relative h-13 rounded-[20px] border border-amber-400/30 bg-[linear-gradient(180deg,rgba(110,78,35,0.96),rgba(63,45,22,0.98))] px-6 text-[0.64rem] font-inter font-semibold uppercase tracking-[0.22em] text-amber-50 shadow-[0_14px_28px_rgba(64,41,15,0.34)] transition-all duration-300 hover:border-amber-200/50 hover:shadow-[0_18px_40px_rgba(64,41,15,0.45)] hover:bg-[linear-gradient(180deg,rgba(140,105,50,0.98),rgba(90,65,35,0.98))] hover:brightness-125 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:brightness-100"
						>
							{isSendingDialog ? (
								<span className="flex gap-1 justify-center">
									<span className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-100"></span>
									<span className="delay-100 h-1.5 w-1.5 animate-bounce rounded-full bg-amber-100"></span>
									<span className="delay-200 h-1.5 w-1.5 animate-bounce rounded-full bg-amber-100"></span>
								</span>
							) : (
								<div className="flex items-center gap-2">
									<span>Send</span>
									<Send className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
								</div>
							)}
						</button>
					</div>
				</div>
			</div>
		</div >
	);
}

// Separate component for Inventory Button to make it a dropzone
function InventoryButtonDropzone({ activeMenu, setActiveMenu }: { activeMenu: string | null, setActiveMenu: (m: 'inventory' | 'party' | null) => void; }) {
	const { setNodeRef, isOver } = useDroppable({
		id: 'inventory-btn-dropzone',
		data: { type: 'inventory' }
	});

	// If item is hovered over button, open menu automatically
	useEffect(() => {
		if (isOver && activeMenu !== 'inventory') {
			setActiveMenu('inventory');
		}
	}, [isOver, activeMenu, setActiveMenu]);

	return (
		<Button
			ref={setNodeRef}
			variant="outline"
			size="sm"
			className={`h-10 rounded-xl border px-3 transition-all duration-300
        ${activeMenu === 'inventory' ? 'border-amber-400/34 bg-amber-400/[0.09] text-amber-200 shadow-[inset_0_0_18px_rgba(245,158,11,0.1)]' : 'border-transparent bg-transparent text-stone-400 hover:bg-white/[0.04] hover:text-amber-100'}
        ${isOver ? 'ring-2 ring-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.6)] scale-105 bg-amber-900/30' : ''}
      `}
			onClick={() => setActiveMenu(activeMenu === 'inventory' ? null : 'inventory')}
		>
			<Backpack className={`h-4 w-4 ${isOver ? 'animate-bounce text-amber-400' : ''}`} />
		</Button>
	);
}

// Sub-components for menus
function InventoryMenu() {
	const { inventory } = useGameState();

	const { setNodeRef, isOver } = useDroppable({
		id: 'inventory-menu-dropzone',
		data: { type: 'inventory' }
	});

	return (
		<div
			ref={setNodeRef}
			className={`min-h-full p-6 transition-colors duration-500 ${isOver ? 'bg-amber-900/10 shadow-[inset_0_0_100px_rgba(245,158,11,0.05)]' : ''}`}
		>
			{inventory.length === 0 ? (
				<div className="flex h-40 flex-col items-center justify-center rounded-[24px] border border-dashed border-white/8 bg-white/[0.02] py-8 text-center text-[0.72rem] uppercase tracking-[0.22em] text-stone-500">
					<Backpack className="w-8 h-8 mb-3 opacity-20" />
					Your pack is empty.<br />Drag loot here to collect it.
				</div>
			) : (
				<div className="grid grid-cols-4 gap-4">
					{inventory.map(item => (
						<div key={item.id} className="group relative flex aspect-square flex-col items-center justify-center rounded-[22px] border border-white/7 bg-[linear-gradient(180deg,rgba(18,18,21,0.96),rgba(11,11,13,0.96))] p-3 transition-all hover:border-amber-400/28 hover:shadow-[0_0_15px_rgba(245,158,11,0.08)]">
							<DraggableItem id={item.id} source="inventory">
								<div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/8 bg-[linear-gradient(180deg,rgba(38,31,23,0.88),rgba(17,17,18,0.94))] text-2xl text-amber-300 transition-transform duration-300 group-hover:scale-110">
									{/* Icon placeholder based on type */}
									{item.type === 'weapon' ? '⚔️' : item.type === 'consumable' ? '🧪' : '🛡️'}
								</div>
								<span className="w-full truncate px-1 text-center text-[0.68rem] font-medium leading-tight text-stone-400 transition-colors group-hover:text-amber-100">{item.name}</span>
							</DraggableItem>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

function PartyMenu() {
	const { entities } = useGameState();
	const party = entities.filter(e => e.type !== 'enemy' && e.type !== 'system');

	return (
		<div className="p-6 space-y-4">
			{party.length === 0 ? (
				<div className="rounded-[24px] border border-dashed border-white/8 bg-white/[0.02] px-8 py-10 text-center text-[0.82rem] italic text-stone-500">No party members found.</div>
			) : (
				party.map(member => (
					<div key={member.id} className="group relative overflow-hidden rounded-[24px] border border-white/7 bg-[linear-gradient(180deg,rgba(18,18,21,0.96),rgba(11,11,13,0.96))] p-4 transition-colors hover:border-amber-400/20">
						<div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/20 to-transparent"></div>
						<div className="flex justify-between items-center mb-3">
							<span className="font-cinzel text-[0.88rem] font-semibold uppercase tracking-[0.12em] text-stone-100 transition-colors group-hover:text-amber-100">{member.name}</span>
							<span className={`text-[0.68rem] font-inter font-semibold uppercase tracking-[0.18em] ${member.isDead ? 'text-red-500' : 'text-emerald-400'}`}>
								{member.hp} / {member.maxHp} HP
							</span>
						</div>
						<div className="h-2 w-full overflow-hidden rounded-full border border-white/6 bg-[#121214] shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)]">
							<div
								className={`h-full transition-all duration-700 ease-out relative ${member.isDead ? 'bg-red-900' : member.hp / member.maxHp > 0.3 ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : 'bg-gradient-to-r from-red-600 to-red-400'}`}
								style={{ width: `${Math.max(0, Math.min(100, (member.hp / member.maxHp) * 100))}%` }}
							>
								<div className="absolute top-0 right-0 bottom-0 w-4 bg-gradient-to-r from-transparent to-white/30 mix-blend-overlay"></div>
							</div>
						</div>
					</div>
				))
			)}
		</div>
	);
}

function PlayerInfoMenu() {
	const { playerCharacter } = useGameState();

	return (
		<div className="p-6 space-y-6">
			<div className="relative flex items-start gap-4 overflow-hidden rounded-[24px] border border-white/7 bg-[linear-gradient(180deg,rgba(18,18,21,0.96),rgba(11,11,13,0.96))] p-4">
				<div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] border border-white/8 bg-[linear-gradient(180deg,rgba(39,31,22,0.9),rgba(17,17,18,0.95))] text-3xl">
					<User className="w-8 h-8 text-amber-600/50" />
				</div>
				<div className="flex-1">
					<h4 className="font-cinzel text-[1rem] font-semibold uppercase tracking-[0.16em] text-amber-100">
						{playerCharacter ? playerCharacter.name : 'Unknown Hero'}
					</h4>
					<p className="text-[0.8rem] capitalize text-stone-400">
						{playerCharacter ? `Level ${playerCharacter.level || 1} ${playerCharacter.ancestry || ''} ${playerCharacter.class || ''}` : 'Level 1 Wanderer'}
					</p>
					<div className="mt-3 grid grid-cols-3 gap-2 text-center text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-stone-500">
						<div className="rounded-xl border border-white/7 bg-white/[0.02] p-2"><span className="block text-amber-200">STR</span> {playerCharacter?.str || '--'}</div>
						<div className="rounded-xl border border-white/7 bg-white/[0.02] p-2"><span className="block text-amber-200">DEX</span> {playerCharacter?.dex || '--'}</div>
						<div className="rounded-xl border border-white/7 bg-white/[0.02] p-2"><span className="block text-amber-200">CON</span> {playerCharacter?.con || '--'}</div>
						<div className="rounded-xl border border-white/7 bg-white/[0.02] p-2"><span className="block text-amber-200">INT</span> {playerCharacter?.int || '--'}</div>
						<div className="rounded-xl border border-white/7 bg-white/[0.02] p-2"><span className="block text-amber-200">WIS</span> {playerCharacter?.wis || '--'}</div>
						<div className="rounded-xl border border-white/7 bg-white/[0.02] p-2"><span className="block text-amber-200">CHA</span> {playerCharacter?.cha || '--'}</div>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div className="flex flex-col items-center rounded-[20px] border border-white/7 bg-white/[0.02] p-3">
					<span className="mb-1 block text-[0.62rem] uppercase tracking-[0.24em] text-stone-500">Max HP</span>
					<span className="font-cinzel text-[1.2rem] text-amber-100">{playerCharacter?.max_hp || 10}</span>
				</div>
				<div className="flex flex-col items-center rounded-[20px] border border-white/7 bg-white/[0.02] p-3">
					<span className="mb-1 block text-[0.62rem] uppercase tracking-[0.24em] text-stone-500">Alignment</span>
					<span className="font-cinzel text-[1.2rem] text-amber-100">{playerCharacter?.alignment || 'Neutral'}</span>
				</div>
			</div>

			{playerCharacter?.background && (
				<div className="relative rounded-[24px] border border-white/7 bg-white/[0.02] p-4">
					<span className="absolute -top-2.5 left-4 block bg-[#0e0e10] px-2 text-[0.58rem] uppercase tracking-[0.24em] text-stone-500">Background</span>
					<p className="text-[0.8rem] italic leading-relaxed text-stone-400">"{playerCharacter.background}"</p>
				</div>
			)}
		</div>
	);
}

function SkillsMenu() {
	return (
		<div className="p-6 space-y-4">
			{/* Example Skill List */}
			{[
				{ name: 'Power Attack', type: 'Melee', cost: '1 Action', desc: 'A heavy strike that deals extra damage but reduces accuracy.' },
				{ name: 'Second Wind', type: 'Recovery', cost: '1 Bonus', desc: 'Draw on your stamina to recover some hit points.' },
				{ name: 'Intimidate', type: 'Social', cost: 'Action', desc: 'Attempt to force an enemy to flee through a show of force.' },
			].map((skill, idx) => (
				<div key={idx} className="group rounded-[24px] border border-white/7 bg-[linear-gradient(180deg,rgba(18,18,21,0.96),rgba(11,11,13,0.96))] p-4 transition-colors hover:border-amber-400/20">
					<div className="flex justify-between items-start mb-2">
						<span className="font-cinzel text-[0.88rem] font-semibold uppercase tracking-[0.12em] text-amber-100">{skill.name}</span>
						<div className="flex flex-col items-end gap-1">
							<span className="rounded-full border border-white/7 bg-white/[0.03] px-2 py-0.5 text-[0.58rem] uppercase tracking-[0.22em] text-stone-500">{skill.type}</span>
							<span className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-amber-300/75">{skill.cost}</span>
						</div>
					</div>
					<p className="text-[0.78rem] leading-relaxed text-stone-400">
						{skill.desc}
					</p>
				</div>
			))}
		</div>
	);
}

function DiceMenu({ triggerRoll }: { triggerRoll: (t: DiceType) => void; }) {
    const { pendingDiceRequest } = useGameState();
	return (
		<div className="p-6">
			<h4 className="mb-4 text-center font-cinzel text-[0.74rem] font-semibold uppercase tracking-[0.3em] text-stone-400">Cast the Bones</h4>
			<div className="grid grid-cols-3 gap-4 max-w-[280px] mx-auto">
				{['d4', 'd6', 'd8', 'd10', 'd12', 'd20'].map(d => (
					<button
						key={d}
						onClick={() => triggerRoll(d as DiceType)}
						className={`rounded-[20px] border py-4 text-[0.96rem] font-cinzel font-semibold uppercase tracking-[0.16em] transition-all duration-300 group
                            ${d === 'd20'
								? `${pendingDiceRequest === 'd20'
                                    ? 'border-amber-200 bg-[linear-gradient(180deg,rgba(130,90,30,0.58),rgba(35,27,18,0.96))] text-amber-100 shadow-[0_0_26px_rgba(245,158,11,0.38)] animate-pulse'
                                    : 'border-amber-400/34 bg-[linear-gradient(180deg,rgba(93,61,22,0.42),rgba(19,18,16,0.96))] text-amber-200 hover:border-amber-300 hover:shadow-[0_0_20px_rgba(245,158,11,0.18)]'} hover:-translate-y-1`
								: 'border-white/7 bg-[linear-gradient(180deg,rgba(18,18,21,0.96),rgba(11,11,13,0.96))] text-stone-400 hover:border-white/14 hover:text-amber-100 hover:-translate-y-0.5'}`}
					>
						<span className="group-hover:scale-110 transition-transform block">{d}</span>
					</button>
				))}
			</div>
		</div>
	);
}
