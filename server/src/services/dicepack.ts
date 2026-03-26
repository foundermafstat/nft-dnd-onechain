import { createHash, randomBytes, randomInt } from 'crypto';
import { onechainContractMeta, onechainEntryTargets } from './onechainContract';

type DicePackRole = 'player' | 'ai';

interface DiceLeafNode {
    index: number;
    entropy: number;
    saltHex: string;
    leafHex: string;
    proofHex: string[];
}

interface DicePackState {
    packId: string;
    role: DicePackRole;
    totalRolls: number;
    usedRolls: number;
    merkleRootHex: string;
    leaves: DiceLeafNode[];
}

interface AdventureDiceSession {
    sessionId: number;
    playerAddress: string;
    createdAtMs: number;
    status: 'active' | 'finalized';
    playerPack: DicePackState;
    aiPack: DicePackState;
}

export interface StartDiceSessionInput {
    playerAddress: string;
    adventureId?: number;
    playerRollsCount?: number;
    aiRollsCount?: number;
}

export interface StartDiceSessionOutput {
    sessionId: number;
    createdAtMs: number;
    playerPack: {
        packId: string;
        totalRolls: number;
        remainingRolls: number;
        merkleRootHex: string;
    };
    aiPack: {
        packId: string;
        totalRolls: number;
        remainingRolls: number;
        merkleRootHex: string;
    };
    onchain: {
        packageId: string;
        registryObjectId: string;
        createDicePacksTarget: string;
        consumeDiceRollTarget: string;
    };
}

export interface ConsumeRollOutput {
    sessionId: number;
    role: DicePackRole;
    packId: string;
    rollIndex: number;
    sides: number;
    roll: number;
    remainingRolls: number;
    relayerTxHash: string;
    target: string;
    packageId: string;
    registryObjectId: string;
}

const DEFAULT_PLAYER_ROLLS = 64;
const DEFAULT_AI_ROLLS = 64;

function toU64LE(value: number): Buffer {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(BigInt(value));
    return buf;
}

function blake2b256(data: Buffer): Buffer {
    return createHash('blake2b512').update(data).digest().subarray(0, 32);
}

function hashPairSorted(a: Buffer, b: Buffer): Buffer {
    return Buffer.compare(a, b) <= 0
        ? blake2b256(Buffer.concat([a, b]))
        : blake2b256(Buffer.concat([b, a]));
}

function buildLeaf(index: number, entropy: number, saltHex: string): Buffer {
    const salt = Buffer.from(saltHex, 'hex');
    const payload = Buffer.concat([toU64LE(index), toU64LE(entropy), salt]);
    return blake2b256(payload);
}

function computeRootAndLevels(leaves: Buffer[]) {
    const levels: Buffer[][] = [leaves];
    while (levels[levels.length - 1].length > 1) {
        const current = levels[levels.length - 1];
        const next: Buffer[] = [];
        for (let i = 0; i < current.length; i += 2) {
            const left = current[i];
            const right = current[i + 1];
            if (!right) {
                next.push(left);
            } else {
                next.push(hashPairSorted(left, right));
            }
        }
        levels.push(next);
    }
    return {
        root: levels[levels.length - 1][0],
        levels,
    };
}

function getProof(levels: Buffer[][], leafIndex: number): Buffer[] {
    const proof: Buffer[] = [];
    let idx = leafIndex;
    for (let level = 0; level < levels.length - 1; level += 1) {
        const nodes = levels[level];
        const siblingIndex = idx ^ 1;
        if (siblingIndex < nodes.length) {
            proof.push(nodes[siblingIndex]);
        }
        idx = Math.floor(idx / 2);
    }
    return proof;
}

function verifyProof(leaf: Buffer, proof: Buffer[], expectedRoot: Buffer): boolean {
    let acc = leaf;
    for (const sibling of proof) {
        acc = hashPairSorted(acc, sibling);
    }
    return acc.equals(expectedRoot);
}

function createPack(sessionId: number, role: DicePackRole, totalRolls: number): DicePackState {
    const safeTotal = Math.max(1, totalRolls);
    const rawLeaves = Array.from({ length: safeTotal }, (_, index) => {
        const entropy = randomInt(0, 2_147_483_647);
        const saltHex = randomBytes(16).toString('hex');
        return {
            index,
            entropy,
            saltHex,
            leaf: buildLeaf(index, entropy, saltHex),
        };
    });

    const { root, levels } = computeRootAndLevels(rawLeaves.map((entry) => entry.leaf));
    const rootHex = root.toString('hex');
    const leaves: DiceLeafNode[] = rawLeaves.map((entry) => ({
        index: entry.index,
        entropy: entry.entropy,
        saltHex: entry.saltHex,
        leafHex: entry.leaf.toString('hex'),
        proofHex: getProof(levels, entry.index).map((buf) => buf.toString('hex')),
    }));

    return {
        packId: `dicepack-${sessionId}-${role}`,
        role,
        totalRolls: safeTotal,
        usedRolls: 0,
        merkleRootHex: rootHex,
        leaves,
    };
}

class DicepackService {
    private sessions = new Map<number, AdventureDiceSession>();

    private nextSessionId = 1;

    public startSession(input: StartDiceSessionInput): StartDiceSessionOutput {
        if (!input.playerAddress?.trim()) {
            throw new Error('playerAddress is required');
        }

        const requestedAdventureId = Number(input.adventureId);
        const hasRequestedAdventureId =
            Number.isInteger(requestedAdventureId) && requestedAdventureId > 0;

        const sessionId = hasRequestedAdventureId ? requestedAdventureId : this.nextSessionId;
        if (this.sessions.has(sessionId)) {
            throw new Error(`Adventure session ${sessionId} already exists`);
        }
        this.nextSessionId = Math.max(this.nextSessionId + 1, sessionId + 1);

        const playerPack = createPack(sessionId, 'player', input.playerRollsCount ?? DEFAULT_PLAYER_ROLLS);
        const aiPack = createPack(sessionId, 'ai', input.aiRollsCount ?? DEFAULT_AI_ROLLS);

        const session: AdventureDiceSession = {
            sessionId,
            playerAddress: input.playerAddress,
            createdAtMs: Date.now(),
            status: 'active',
            playerPack,
            aiPack,
        };

        this.sessions.set(sessionId, session);

        return {
            sessionId,
            createdAtMs: session.createdAtMs,
            playerPack: {
                packId: playerPack.packId,
                totalRolls: playerPack.totalRolls,
                remainingRolls: playerPack.totalRolls,
                merkleRootHex: playerPack.merkleRootHex,
            },
            aiPack: {
                packId: aiPack.packId,
                totalRolls: aiPack.totalRolls,
                remainingRolls: aiPack.totalRolls,
                merkleRootHex: aiPack.merkleRootHex,
            },
            onchain: {
                packageId: onechainContractMeta.packageId,
                registryObjectId: onechainContractMeta.registryObjectId,
                createDicePacksTarget: onechainEntryTargets.createAdventureDicePacks,
                consumeDiceRollTarget: onechainEntryTargets.consumeDicepackRoll,
            },
        };
    }

    public consumeRoll(sessionId: number, role: DicePackRole, sides: number, actorAddress?: string): ConsumeRollOutput {
        if (!Number.isInteger(sessionId)) {
            throw new Error('sessionId must be an integer');
        }
        if (!Number.isInteger(sides) || sides < 2) {
            throw new Error('sides must be an integer >= 2');
        }

        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error('Adventure session not found');
        }
        if (session.status !== 'active') {
            throw new Error('Adventure session is not active');
        }

        if (role === 'player') {
            if (!actorAddress) {
                throw new Error('playerAddress is required to consume player rolls');
            }
            if (actorAddress !== session.playerAddress) {
                throw new Error('playerAddress does not match the active adventure session');
            }
        }

        const pack = role === 'player' ? session.playerPack : session.aiPack;
        if (pack.usedRolls >= pack.totalRolls) {
            throw new Error(`${role} dicepack exhausted`);
        }

        const rollIndex = pack.usedRolls;
        const node = pack.leaves[rollIndex];
        const expectedRoot = Buffer.from(pack.merkleRootHex, 'hex');
        const leaf = Buffer.from(node.leafHex, 'hex');
        const proof = node.proofHex.map((hex) => Buffer.from(hex, 'hex'));
        const valid = verifyProof(leaf, proof, expectedRoot);
        if (!valid) {
            throw new Error('Dicepack proof validation failed');
        }

        const roll = (node.entropy % sides) + 1;
        pack.usedRolls += 1;

        return {
            sessionId,
            role,
            packId: pack.packId,
            rollIndex,
            sides,
            roll,
            remainingRolls: pack.totalRolls - pack.usedRolls,
            relayerTxHash: `relayer-dice-${sessionId}-${role}-${rollIndex}-${Date.now()}`,
            target: onechainEntryTargets.consumeDicepackRoll,
            packageId: onechainContractMeta.packageId,
            registryObjectId: onechainContractMeta.registryObjectId,
        };
    }

    public finalizeSession(sessionId: number) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error('Adventure session not found');
        }
        session.status = 'finalized';
        return {
            sessionId,
            status: session.status,
            playerRollsUsed: session.playerPack.usedRolls,
            aiRollsUsed: session.aiPack.usedRolls,
            playerRollsRemaining: session.playerPack.totalRolls - session.playerPack.usedRolls,
            aiRollsRemaining: session.aiPack.totalRolls - session.aiPack.usedRolls,
        };
    }
}

export const dicepackService = new DicepackService();
