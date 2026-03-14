import { useState, useRef, useEffect } from 'react';

const INITIAL_TAIL_LENGTH = 320;
const TAIL_GROWTH_PER_SECOND = 1000;
const COLLISION_FADE_DURATION_MS = 1000;
const ACCELERATION_THRESHOLD_MULTIPLIER = 1.5;
const ACCELERATION_STEP_MS = 200;
const ACCELERATION_GAIN_PER_STEP = 1.1;
const MIN_SPAWN_DELAY_MS = 1000;
const MAX_SPAWN_DELAY_MS = 4000;

export default function useDotEngine(onHit, collisionRadius, options = {}) {
    const [dots, setDots] = useState([]);
    const requestRef = useRef();
    const dotsRef = useRef([]);
    const lastTimeRef = useRef();
    const spawnTimerRef = useRef(0);
    const onHitRef = useRef(onHit);
    const speedMultiplier = options.speedMultiplier ?? 1;
    const accelerationGainPerStep = options.accelerationGainPerStep ?? ACCELERATION_GAIN_PER_STEP;
    const minSpawnDelayMs = options.minSpawnDelayMs ?? MIN_SPAWN_DELAY_MS;
    const maxSpawnDelayMs = options.maxSpawnDelayMs ?? MAX_SPAWN_DELAY_MS;

    useEffect(() => {
        onHitRef.current = onHit;
    }, [onHit]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        function updateDots(time) {
            if (lastTimeRef.current != null) {
                const deltaTime = time - lastTimeRef.current;
                const nextDots = [];
                let didHit = false;
                const sphereDiameter = collisionRadius * 4;
                const accelerationThreshold = sphereDiameter * ACCELERATION_THRESHOLD_MULTIPLIER;

                for (const dot of dotsRef.current) {
                    if (dot.collidedAt != null) {
                        const nextOpacity = Math.max(0, 1 - (time - dot.collidedAt) / COLLISION_FADE_DURATION_MS);

                        if (nextOpacity > 0) {
                            nextDots.push({
                                ...dot,
                                opacity: nextOpacity,
                            });
                        }
                        continue;
                    }

                    const timeInAccelerationZone = dot.distance <= accelerationThreshold
                        ? dot.timeInAccelerationZone + deltaTime
                        : 0;
                    const accelerationMultiplier = Math.pow(
                        accelerationGainPerStep,
                        timeInAccelerationZone / ACCELERATION_STEP_MS
                    );
                    const currentSpeed = dot.speed * accelerationMultiplier * speedMultiplier;
                    const moveDist = currentSpeed * (deltaTime / 1000);
                    const newDistance = dot.distance - moveDist;

                    if (newDistance <= collisionRadius) {
                        didHit = true;
                        nextDots.push({
                            ...dot,
                            distance: collisionRadius,
                            collidedAt: time,
                            opacity: 1,
                        });
                    } else {
                        nextDots.push({
                            ...dot,
                            distance: newDistance,
                            tailLength: dot.tailLength + (deltaTime / 1000) * TAIL_GROWTH_PER_SECOND,
                            timeInAccelerationZone,
                            opacity: 1,
                        });
                    }
                }

                if (didHit && onHitRef.current) {
                    onHitRef.current();
                }

                spawnTimerRef.current -= deltaTime;
                if (spawnTimerRef.current <= 0) {
                    const windowRadius = Math.max(window.innerWidth, window.innerHeight) / 2;
                    const spawnDistance = windowRadius + 300;
                    const speed = 100 + Math.random() * 100;
                    const angle = Math.random() * Math.PI * 2;

                    nextDots.push({
                        id: `${time}-${Math.random()}`,
                        distance: spawnDistance,
                        initialDistance: spawnDistance,
                        speed,
                        angle,
                        tailLength: INITIAL_TAIL_LENGTH,
                        timeInAccelerationZone: 0,
                        collidedAt: null,
                        opacity: 1,
                    });

                    spawnTimerRef.current = minSpawnDelayMs + Math.random() * (maxSpawnDelayMs - minSpawnDelayMs);
                }

                dotsRef.current = nextDots;
                setDots(nextDots);
            }

            lastTimeRef.current = time;
            requestRef.current = window.requestAnimationFrame(updateDots);
        }

        spawnTimerRef.current = minSpawnDelayMs + Math.random() * (maxSpawnDelayMs - minSpawnDelayMs);
        requestRef.current = window.requestAnimationFrame(updateDots);

        return () => {
            if (requestRef.current) {
                window.cancelAnimationFrame(requestRef.current);
            }
            lastTimeRef.current = undefined;
        };
    }, [accelerationGainPerStep, collisionRadius, maxSpawnDelayMs, minSpawnDelayMs, speedMultiplier]);

    return dots;
}
