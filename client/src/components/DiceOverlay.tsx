'use client';
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Physics, usePlane, useSphere, useBox } from '@react-three/cannon';
import * as THREE from 'three';

/*
 * =============================================================
 * MENTAL MODEL:
 *
 *   Camera at [0, 20, 0] looking straight DOWN.
 *   Gravity [0, -40, 0]. Floor at Y=0 (XZ plane).
 *   Walls at screen edges. Dice fall, bounce, settle.
 *
 *   During rolling, a gentle centering force nudges the dice
 *   toward X=0, Z=0 so it naturally drifts to screen center.
 *
 *   Result shown IMMEDIATELY via cinematic BG3-style 2D overlay.
 *   Dice rolls ON TOP of the golden number.
 * =============================================================
 */

// ─── INVISIBLE BOX ──────────────────────────────────────────────

function TableFloor() {
    usePlane(() => ({
        type: 'Static',
        rotation: [-Math.PI / 2, 0, 0],
        position: [0, 0, 0],
        material: { restitution: 0.15, friction: 0.9 },
    }));
    return null;
}

function Walls() {
    const t = 1, h = 30;
    useBox(() => ({ type: 'Static', position: [-9, h / 2, 0], args: [t, h, 24] }));
    useBox(() => ({ type: 'Static', position: [9, h / 2, 0], args: [t, h, 24] }));
    useBox(() => ({ type: 'Static', position: [0, h / 2, -7], args: [20, h, t] }));
    useBox(() => ({ type: 'Static', position: [0, h / 2, 7], args: [20, h, t] }));
    return null;
}

// ─── DICE ────────────────────────────────────────────────────────

const R = 1.8;

const COLORS: Record<string, string> = {
    d4: '#ec4899', d6: '#eab308', d8: '#3b82f6',
    d10: '#a855f7', d12: '#22c55e', d20: '#ef4444',
};

interface DiceProps {
    type: 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';
    isRolling: boolean;
    serverResult: number | null;
    onSettled: () => void;
}

function Dice({ type, isRolling, serverResult, onSettled }: DiceProps) {
    const [phase, setPhase] = useState<'idle' | 'rolling' | 'settling' | 'done'>('idle');
    const rollId = useRef<number | null>(null);

    const [meshRef, api] = useSphere(() => ({
        mass: 2.5,
        position: [0, -10, 0],
        args: [R * 0.6],
        material: { restitution: 0.2, friction: 0.7 },
        linearDamping: 0.35,
        angularDamping: 0.25,
    }));

    const pos = useRef<[number, number, number]>([0, -10, 0]);
    const quat = useRef<[number, number, number, number]>([0, 0, 0, 1]);
    const vel = useRef<[number, number, number]>([0, 0, 0]);

    useEffect(() => {
        const u1 = api.position.subscribe(v => (pos.current = v as any));
        const u2 = api.quaternion.subscribe(v => (quat.current = v as any));
        const u3 = api.velocity.subscribe(v => (vel.current = v as any));
        return () => { u1(); u2(); u3(); };
    }, [api]);

    useEffect(() => {
        if (!isRolling || rollId.current === serverResult) return;
        rollId.current = serverResult;
        setPhase('rolling');
        api.wakeUp();

        const sx = (Math.random() - 0.5) * 6;
        const sz = (Math.random() - 0.5) * 4;
        api.position.set(sx, 12 + Math.random() * 3, sz);
        pos.current = [sx, 12, sz];

        api.rotation.set(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
        );
        api.velocity.set(
            (Math.random() - 0.5) * 10,
            -8 - Math.random() * 4,
            (Math.random() - 0.5) * 10,
        );
        api.angularVelocity.set(
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 20,
        );

        const t = setTimeout(() => setPhase('settling'), 2400);
        return () => clearTimeout(t);
    }, [isRolling, serverResult, api]);

    useEffect(() => {
        if (!isRolling && phase !== 'idle') {
            api.position.set(0, -10, 0);
            api.velocity.set(0, 0, 0);
            api.angularVelocity.set(0, 0, 0);
            pos.current = [0, -10, 0];
            setPhase('idle');
            rollId.current = null;
        }
    }, [isRolling, phase, api]);

    const settleT = useRef(0);

    useFrame((_, dt) => {
        const mesh = meshRef.current as THREE.Mesh | null;
        if (!mesh) return;

        if (phase === 'rolling') {
            mesh.position.set(...pos.current);
            mesh.quaternion.set(...quat.current);

            // Very gentle centering — just a slight nudge, dice bounces freely off walls
            const [px, , pz] = pos.current;
            const [vx, vy, vz] = vel.current;
            const cx = -px * 0.3;
            const cz = -pz * 0.3;
            api.velocity.set(vx + cx * dt, vy, vz + cz * dt);

        } else if (phase === 'settling') {
            api.velocity.set(0, 0, 0);
            api.angularVelocity.set(0, 0, 0);

            settleT.current = Math.min(settleT.current + dt * 2.0, 1);
            const t = settleT.current;

            const lerpedX = THREE.MathUtils.lerp(pos.current[0], 0, t);
            const lerpedZ = THREE.MathUtils.lerp(pos.current[2], 0, t);
            mesh.position.set(lerpedX, pos.current[1], lerpedZ);

            const cur = new THREE.Quaternion(...quat.current);
            const tgt = new THREE.Quaternion(0, 0, 0, 1);
            cur.slerp(tgt, t);
            mesh.quaternion.copy(cur);

            if (t >= 1 && settleT.current <= 1.01) {
                settleT.current = 99;
                mesh.position.set(0, pos.current[1], 0);
                mesh.quaternion.set(0, 0, 0, 1);
                setPhase('done');
                onSettled();
            }
        } else if (phase === 'done') {
            mesh.position.set(0, pos.current[1], 0);
            mesh.quaternion.set(0, 0, 0, 1);
        }
    });

    useEffect(() => {
        if (phase === 'rolling') settleT.current = 0;
    }, [phase]);

    const geometry = useMemo(() => {
        let geo: THREE.BufferGeometry;
        switch (type) {
            case 'd4': geo = new THREE.TetrahedronGeometry(R); break;
            case 'd6': geo = new THREE.BoxGeometry(R * 1.2, R * 1.2, R * 1.2); break;
            case 'd8': geo = new THREE.OctahedronGeometry(R); break;
            case 'd10': geo = new THREE.DodecahedronGeometry(R); break;
            case 'd12': geo = new THREE.DodecahedronGeometry(R); break;
            case 'd20': geo = new THREE.IcosahedronGeometry(R); break;
            default: geo = new THREE.BoxGeometry(R, R, R);
        }
        const ni = geo.toNonIndexed();
        ni.computeVertexNormals();
        const pa = ni.getAttribute('position');
        const up = new THREE.Vector3(0, 1, 0);

        if (type === 'd4') {
            const v = new THREE.Vector3().fromBufferAttribute(pa, 0).normalize();
            ni.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v, up));
        } else {
            const a = new THREE.Vector3().fromBufferAttribute(pa, 0);
            const b = new THREE.Vector3().fromBufferAttribute(pa, 1);
            const c = new THREE.Vector3().fromBufferAttribute(pa, 2);
            const n = a.clone().add(b).add(c).divideScalar(3).normalize();
            ni.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(n, up));
        }
        return ni;
    }, [type]);

    const color = COLORS[type] ?? '#4a2103ff';

    return (
        <mesh
            ref={meshRef as any}
            castShadow
            receiveShadow
            visible={phase !== 'idle'}
            geometry={geometry}
        >
            <meshStandardMaterial
                color={color}
                metalness={0.55}
                roughness={0.25}
                emissive={color}
                emissiveIntensity={0.12}
            />
            <mesh geometry={geometry} scale={1.003}>
                <meshBasicMaterial color="#ffffff" wireframe opacity={0.35} transparent />
            </mesh>
        </mesh>
    );
}

// ─── MAIN OVERLAY (BG3-style cinematic) ──────────────────────────

export type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'ZK_LOOT';

interface OverlayProps {
    rolling: boolean;
    diceType: DiceType;
    result: number | null;
    onReset: () => void;
}

export default function DiceOverlay({ rolling, diceType, result, onReset }: OverlayProps) {
    const isActive = rolling || result !== null;
    const [resultPhase, setResultPhase] = useState<'hidden' | 'entering' | 'visible' | 'exiting'>('hidden');

    // Show result IMMEDIATELY when we get it (dice rolls on top)
    useEffect(() => {
        if (result !== null) {
            setResultPhase('entering');
            const enterTimer = setTimeout(() => setResultPhase('visible'), 50);
            return () => clearTimeout(enterTimer);
        } else {
            setResultPhase('hidden');
        }
    }, [result]);

    // When rolling stops, start the exit countdown
    const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!rolling && result !== null && resultPhase === 'visible') {
            // Only start exit if we haven't already
            if (!exitTimerRef.current) {
                exitTimerRef.current = setTimeout(() => setResultPhase('exiting'), 2000);
                resetTimerRef.current = setTimeout(() => {
                    setResultPhase('hidden');
                    onReset();
                }, 2800);
            }
        }
        // Reset refs when a new roll starts
        if (rolling) {
            if (exitTimerRef.current) { clearTimeout(exitTimerRef.current); exitTimerRef.current = null; }
            if (resetTimerRef.current) { clearTimeout(resetTimerRef.current); resetTimerRef.current = null; }
        }
    }, [rolling, result, resultPhase]);

    const showResult = resultPhase !== 'hidden';
    const resultOpacity = (resultPhase === 'visible' || resultPhase === 'entering') ? 1 : 0;
    const resultScale = resultPhase === 'visible' ? 1 : resultPhase === 'entering' ? 0.6 : 0.85;

    return (
        <div className={`fixed inset-0 w-screen h-screen z-[100] pointer-events-none transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0'}`}>

            {/* Cinematic dark vignette */}
            <div
                className="absolute inset-0 transition-opacity duration-700"
                style={{
                    background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.75) 100%)',
                    opacity: isActive ? 1 : 0,
                }}
            />

            {/* ═══ BG3 RESULT — renders BEHIND the dice (z-1) ═══ */}
            {showResult && result !== null && (
                <div
                    className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-[1]"
                    style={{
                        opacity: resultOpacity,
                        transform: `scale(${resultScale})`,
                        transition: 'opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1)',
                    }}
                >
                    {/* Radial glow */}
                    <div
                        className="absolute w-[400px] h-[400px] rounded-full"
                        style={{
                            background: 'radial-gradient(circle, rgba(245,158,11,0.25) 0%, transparent 65%)',
                            animation: 'pulse 2s ease-in-out infinite',
                        }}
                    />

                    {/* Main Container for perfect vertical centering */}
                    <div className="relative flex flex-col items-center justify-center">

                        {/* Top Decoration — Float above so it doesn't offset the number */}
                        <div className="absolute bottom-full mb-2 flex flex-col items-center min-w-max">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="h-[1px] w-16 bg-gradient-to-r from-transparent to-amber-500/60" />
                                <div className="w-2 h-2 rotate-45 border border-amber-500/50" />
                                <div className="h-[1px] w-16 bg-gradient-to-l from-transparent to-amber-500/60" />
                            </div>

                            {/* Dice type label: Neutral gray */}
                            <span className="text-[11px] font-serif uppercase tracking-[0.4em] text-stone-400 font-medium">
                                DICE: {diceType}
                            </span>
                        </div>

                        {/* Main result number (Truly centered) */}
                        <h2
                            className="font-serif leading-none"
                            style={{
                                fontSize: 'clamp(7rem, 22vw, 16rem)',
                                color: '#f59e0b',
                                textShadow: '0 0 40px rgba(245,158,11,0.6), 0 0 80px rgba(245,158,11,0.3), 0 0 160px rgba(245,158,11,0.15), 0 6px 12px rgba(0,0,0,0.9)',
                                WebkitTextStroke: '1px rgba(200,140,0,0.3)',
                            }}
                        >
                            {result}
                        </h2>

                        {/* Bottom Decoration — Float below */}
                        <div className="absolute top-[100%] mt-6 flex flex-col items-center min-w-max">
                            <div className="flex items-center gap-3">
                                <div className="h-[1px] w-16 bg-gradient-to-r from-transparent to-amber-500/60" />
                                <div className="w-2 h-2 rotate-45 border border-amber-500/50" />
                                <div className="h-[1px] w-16 bg-gradient-to-l from-transparent to-amber-500/60" />
                            </div>

                            {/* Nat 20 */}
                            {diceType === 'd20' && result === 20 && (
                                <div className="mt-8 flex flex-col items-center">
                                    <div className="h-[1px] w-40 bg-gradient-to-r from-transparent via-amber-400 to-transparent mb-3" />
                                    <span className="text-2xl font-serif tracking-[0.4em] uppercase" style={{ color: '#fbbf24', textShadow: '0 0 20px rgba(251,191,36,0.8), 0 0 50px rgba(251,191,36,0.4)', animation: 'pulse 1.5s ease-in-out infinite' }}>
                                        ✦ Natural Twenty ✦
                                    </span>
                                    <div className="h-[1px] w-40 bg-gradient-to-r from-transparent via-amber-400 to-transparent mt-3" />
                                </div>
                            )}

                            {/* Nat 1 */}
                            {diceType === 'd20' && result === 1 && (
                                <div className="mt-8 flex flex-col items-center">
                                    <div className="h-[1px] w-40 bg-gradient-to-r from-transparent via-red-600 to-transparent mb-3" />
                                    <span className="text-2xl font-serif tracking-[0.4em] uppercase" style={{ color: '#ef4444', textShadow: '0 0 20px rgba(239,68,68,0.8), 0 0 50px rgba(239,68,68,0.4)', animation: 'pulse 1.5s ease-in-out infinite' }}>
                                        ✦ Critical Failure ✦
                                    </span>
                                    <div className="h-[1px] w-40 bg-gradient-to-r from-transparent via-red-600 to-transparent mt-3" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 3D Canvas — renders ON TOP of the result text (z-2) */}
            <div className="absolute inset-0 w-full h-full pointer-events-none z-[2]">
                <Canvas
                    shadows
                    gl={{ antialias: true, alpha: true }}
                    style={{ pointerEvents: 'none' }}
                    orthographic
                    camera={{ position: [0, 20, 0], zoom: 45, near: 0.1, far: 100 }}
                    onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
                >
                    <ambientLight intensity={0.5} />
                    <directionalLight position={[3, 18, 3]} intensity={2} castShadow shadow-mapSize={[2048, 2048]} />
                    <pointLight position={[-4, 12, -4]} intensity={0.6} color="#a78bfa" />
                    <pointLight position={[4, 12, 4]} intensity={0.4} color="#f59e0b" />

                    <Physics gravity={[0, -40, 0]} iterations={20} allowSleep>
                        <TableFloor />
                        <Walls />
                        <Dice
                            type={diceType as any}
                            isRolling={rolling}
                            serverResult={result}
                            onSettled={() => { }}
                        />
                    </Physics>
                </Canvas>
            </div>
        </div>
    );
}
