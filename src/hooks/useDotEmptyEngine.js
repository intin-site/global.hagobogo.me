import { useState, useRef, useEffect } from 'react';

const MIN_SPAWN_DELAY_MS = 600;
const MAX_SPAWN_DELAY_MS = 1000;
const MIN_BOUNCE_ANGLE_RAD = (45 * Math.PI) / 180;
const MAX_BOUNCE_ANGLE_RAD = (80 * Math.PI) / 180;
const OUT_OF_FRAME_DELETE_DELAY_MS = 1000;
const BOUNCE_ZONE_MIN_RADIUS_RATIO = 0.6;
const BOUNCE_ZONE_MAX_RADIUS_RATIO = 0.75;
const POST_BOUNCE_ACCELERATION_MULTIPLIER = 2;
const POST_BOUNCE_DECELERATION_DURATION_MS = 3000;
const MIN_SCALE_RATIO_NEAR_SPHERE = 0.1;
const DOT_EMPTY_SPEED_MULTIPLIER = 0.7;
const SCALE_EFFECT_RADIUS_RATIO = 2.2;

export default function useDotEmptyEngine(targetCenter, sphereRadius) {
    const [dots, setDots] = useState([]);
    const dotsRef = useRef([]);
    const requestRef = useRef();
    const lastTimeRef = useRef();
    const spawnTimerRef = useRef(0);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        function updateDots(time) {
            if (lastTimeRef.current != null) {
                const deltaTime = time - lastTimeRef.current;
                const viewportRadius = Math.hypot(window.innerWidth, window.innerHeight) / 2;
                const bounceZoneMinRadius = sphereRadius * BOUNCE_ZONE_MIN_RADIUS_RATIO;
                const bounceZoneMaxRadius = sphereRadius * BOUNCE_ZONE_MAX_RADIUS_RATIO;
                const scaleEffectStartRadius = sphereRadius * SCALE_EFFECT_RADIUS_RATIO;
                const nextDots = [];

                for (const dot of dotsRef.current) {
                    const bounceElapsed = dot.bounceStartedAt == null ? null : time - dot.bounceStartedAt;
                    const speedMultiplier = bounceElapsed == null
                        ? 1
                        : Math.max(
                            1,
                            POST_BOUNCE_ACCELERATION_MULTIPLIER
                                - ((POST_BOUNCE_ACCELERATION_MULTIPLIER - 1) * bounceElapsed) / POST_BOUNCE_DECELERATION_DURATION_MS
                        );
                    const nextX = dot.x + dot.vx * speedMultiplier * DOT_EMPTY_SPEED_MULTIPLIER * (deltaTime / 1000);
                    const nextY = dot.y + dot.vy * speedMultiplier * DOT_EMPTY_SPEED_MULTIPLIER * (deltaTime / 1000);
                    const dx = nextX - targetCenter.x;
                    const dy = nextY - targetCenter.y;
                    const nextDistance = Math.hypot(dx, dy);
                    const scaleProgress = Math.max(
                        0,
                        Math.min(
                            1,
                            (scaleEffectStartRadius - nextDistance) / Math.max(1, scaleEffectStartRadius - bounceZoneMinRadius)
                        )
                    );
                    const nextScale = dot.baseScale * (1 - ((1 - MIN_SCALE_RATIO_NEAR_SPHERE) * scaleProgress));

                    if (!dot.outbound && nextDistance >= bounceZoneMinRadius && nextDistance <= bounceZoneMaxRadius) {
                        const bounceOffset = MIN_BOUNCE_ANGLE_RAD + Math.random() * (MAX_BOUNCE_ANGLE_RAD - MIN_BOUNCE_ANGLE_RAD);
                        const bounceDirection = Math.random() > 0.5 ? 1 : -1;
                        const surfaceAngle = Math.atan2(dy, dx);
                        const outboundAngle = surfaceAngle + bounceDirection * bounceOffset;

                        nextDots.push({
                            ...dot,
                            x: targetCenter.x + Math.cos(surfaceAngle) * nextDistance,
                            y: targetCenter.y + Math.sin(surfaceAngle) * nextDistance,
                            vx: Math.cos(outboundAngle) * dot.speed,
                            vy: Math.sin(outboundAngle) * dot.speed,
                            scale: nextScale,
                            outbound: true,
                            bounceStartedAt: time,
                        });
                        continue;
                    }

                    const isOutsideFrame = nextDistance > viewportRadius + 220;

                    if (isOutsideFrame) {
                        if (dot.outOfFrameAt == null) {
                            nextDots.push({
                                ...dot,
                                x: nextX,
                                y: nextY,
                                scale: nextScale,
                                outOfFrameAt: time,
                            });
                        } else if (time - dot.outOfFrameAt < OUT_OF_FRAME_DELETE_DELAY_MS) {
                            nextDots.push({
                                ...dot,
                                x: nextX,
                                y: nextY,
                                scale: nextScale,
                            });
                        }
                    } else {
                        nextDots.push({
                            ...dot,
                            x: nextX,
                            y: nextY,
                            scale: nextScale,
                            outOfFrameAt: null,
                        });
                    }
                }

                spawnTimerRef.current -= deltaTime;
                if (spawnTimerRef.current <= 0) {
                    const scale = 0.25 + Math.random() * 0.15;
                    let opacity = 1;

                    if (scale < 0.3) {
                        opacity = 0.6;
                    } else if (scale <= 0.55) {
                        opacity = 0.8;
                    }

                    const angle = Math.random() * Math.PI * 2;
                    const startDistance = viewportRadius + 180;
                    const x = targetCenter.x + Math.cos(angle) * startDistance;
                    const y = targetCenter.y + Math.sin(angle) * startDistance;
                    const speed = 30 + Math.random() * 30;

                    nextDots.push({
                        id: `${time}-${Math.random()}`,
                        x,
                        y,
                        vx: -Math.cos(angle) * speed,
                        vy: -Math.sin(angle) * speed,
                        speed,
                        baseScale: scale,
                        scale,
                        opacity,
                        outbound: false,
                        outOfFrameAt: null,
                        bounceStartedAt: null,
                    });

                    spawnTimerRef.current = MIN_SPAWN_DELAY_MS + Math.random() * (MAX_SPAWN_DELAY_MS - MIN_SPAWN_DELAY_MS);
                }

                dotsRef.current = nextDots;
                setDots(nextDots);
            }

            lastTimeRef.current = time;
            requestRef.current = window.requestAnimationFrame(updateDots);
        }

        spawnTimerRef.current = MIN_SPAWN_DELAY_MS;
        requestRef.current = window.requestAnimationFrame(updateDots);

        return () => {
            if (requestRef.current) {
                window.cancelAnimationFrame(requestRef.current);
            }
            lastTimeRef.current = undefined;
        };
    }, [sphereRadius, targetCenter]);

    return dots;
}
