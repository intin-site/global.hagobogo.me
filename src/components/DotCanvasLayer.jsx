import React, { useEffect, useRef } from 'react';
import dotHead from '../../assets/svg/dot_head.svg';
import dotHeadBlue from '../../assets/svg/dot_head_blue.svg';
import dotHeadLine from '../../assets/svg/dot_head_line.svg';

const INITIAL_TAIL_LENGTH = 320;
const TAIL_GROWTH_PER_SECOND = 1000;
const COLLISION_FADE_DURATION_MS = 1000;
const ACCELERATION_THRESHOLD_MULTIPLIER = 1.5;
const ACCELERATION_STEP_MS = 200;
const DEFAULT_ACCELERATION_GAIN_PER_STEP = 1.1;
const DEFAULT_MIN_SPAWN_DELAY_MS = 1000;
const DEFAULT_MAX_SPAWN_DELAY_MS = 4000;
const ONE_HOUR_MS = 60 * 60 * 1000;

const EMPTY_MIN_SPAWN_DELAY_MS = 600;
const EMPTY_MAX_SPAWN_DELAY_MS = 1000;
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

function getVariantConfig(variant, spawnFrequencyRange) {
    if (variant === 'blue') {
        return {
            imageSrc: dotHeadBlue,
            headSize: 120,
            tailThickness: 12,
            tailGlowColor: 'rgba(43, 196, 229, 0.4)',
            speedMultiplier: 0.5,
            accelerationGainPerStep: 1.05,
            minSpawnDelayMs: ONE_HOUR_MS / Math.max(1, spawnFrequencyRange?.max ?? 1),
            maxSpawnDelayMs: ONE_HOUR_MS / Math.max(1, spawnFrequencyRange?.min ?? 1),
        };
    }

    if (variant === 'empty') {
        return {
            imageSrc: dotHeadLine,
            headSize: 44,
        };
    }

    return {
        imageSrc: dotHead,
        headSize: 44,
        tailThickness: 4,
        tailGlowColor: 'rgba(255, 255, 255, 0.28)',
        speedMultiplier: 1,
        accelerationGainPerStep: DEFAULT_ACCELERATION_GAIN_PER_STEP,
        minSpawnDelayMs: DEFAULT_MIN_SPAWN_DELAY_MS,
        maxSpawnDelayMs: DEFAULT_MAX_SPAWN_DELAY_MS,
    };
}

function resizeCanvasToViewport(canvas) {
    const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const targetWidth = Math.floor(viewportWidth * devicePixelRatio);
    const targetHeight = Math.floor(viewportHeight * devicePixelRatio);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        canvas.style.width = `${viewportWidth}px`;
        canvas.style.height = `${viewportHeight}px`;
    }

    return {
        devicePixelRatio,
        viewportWidth,
        viewportHeight,
    };
}

function createLineDot(time, minSpawnDelayMs, maxSpawnDelayMs) {
    const windowRadius = Math.max(window.innerWidth, window.innerHeight) / 2;
    const spawnDistance = windowRadius + 300;
    const speed = 100 + Math.random() * 100;
    const angle = Math.random() * Math.PI * 2;

    return {
        dot: {
            id: `${time}-${Math.random()}`,
            distance: spawnDistance,
            initialDistance: spawnDistance,
            speed,
            angle,
            tailLength: INITIAL_TAIL_LENGTH,
            timeInAccelerationZone: 0,
            collidedAt: null,
            opacity: 1,
        },
        nextSpawnDelayMs: minSpawnDelayMs + Math.random() * (maxSpawnDelayMs - minSpawnDelayMs),
    };
}

function updateLineDots({
    previousDots,
    time,
    deltaTime,
    collisionRadius,
    speedMultiplier,
    accelerationGainPerStep,
    minSpawnDelayMs,
    maxSpawnDelayMs,
    spawnTimerRef,
    onHit,
}) {
    const nextDots = [];
    let didHit = false;
    const sphereDiameter = collisionRadius * 4;
    const accelerationThreshold = sphereDiameter * ACCELERATION_THRESHOLD_MULTIPLIER;

    for (const dot of previousDots) {
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
        const moveDistance = currentSpeed * (deltaTime / 1000);
        const newDistance = dot.distance - moveDistance;

        if (newDistance <= collisionRadius) {
            didHit = true;
            nextDots.push({
                ...dot,
                distance: collisionRadius,
                collidedAt: time,
                opacity: 1,
            });
            continue;
        }

        nextDots.push({
            ...dot,
            distance: newDistance,
            tailLength: dot.tailLength + (deltaTime / 1000) * TAIL_GROWTH_PER_SECOND,
            timeInAccelerationZone,
            opacity: 1,
        });
    }

    if (didHit && onHit) {
        onHit();
    }

    spawnTimerRef.current -= deltaTime;
    if (spawnTimerRef.current <= 0) {
        const { dot, nextSpawnDelayMs } = createLineDot(time, minSpawnDelayMs, maxSpawnDelayMs);
        nextDots.push(dot);
        spawnTimerRef.current = nextSpawnDelayMs;
    }

    return nextDots;
}

function createEmptyDot(time, targetCenter) {
    const viewportRadius = Math.hypot(window.innerWidth, window.innerHeight) / 2;
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

    return {
        dot: {
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
        },
        nextSpawnDelayMs: EMPTY_MIN_SPAWN_DELAY_MS + Math.random() * (EMPTY_MAX_SPAWN_DELAY_MS - EMPTY_MIN_SPAWN_DELAY_MS),
    };
}

function updateEmptyDots({ previousDots, time, deltaTime, targetCenter, sphereRadius, spawnTimerRef }) {
    const viewportRadius = Math.hypot(window.innerWidth, window.innerHeight) / 2;
    const bounceZoneMinRadius = sphereRadius * BOUNCE_ZONE_MIN_RADIUS_RATIO;
    const bounceZoneMaxRadius = sphereRadius * BOUNCE_ZONE_MAX_RADIUS_RATIO;
    const scaleEffectStartRadius = sphereRadius * SCALE_EFFECT_RADIUS_RATIO;
    const nextDots = [];

    for (const dot of previousDots) {
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
            continue;
        }

        nextDots.push({
            ...dot,
            x: nextX,
            y: nextY,
            scale: nextScale,
            outOfFrameAt: null,
        });
    }

    spawnTimerRef.current -= deltaTime;
    if (spawnTimerRef.current <= 0) {
        const { dot, nextSpawnDelayMs } = createEmptyDot(time, targetCenter);
        nextDots.push(dot);
        spawnTimerRef.current = nextSpawnDelayMs;
    }

    return nextDots;
}

function drawLineDot(ctx, dot, targetCenter, collisionRadius, image, config) {
    const x = targetCenter.x + Math.cos(dot.angle) * dot.distance;
    const y = targetCenter.y + Math.sin(dot.angle) * dot.distance;
    const rotation = dot.angle + Math.PI;
    const progress = (dot.distance - collisionRadius) / Math.max(1, dot.initialDistance - collisionRadius);
    const scale = 0.1 + 0.9 * Math.max(0, progress);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.scale(scale, scale);
    ctx.globalAlpha = dot.opacity;

    const tailGradient = ctx.createLinearGradient(-dot.tailLength, 0, 0, 0);
    tailGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    tailGradient.addColorStop(0.65, 'rgba(255, 255, 255, 0.75)');
    tailGradient.addColorStop(1, 'rgba(255, 255, 255, 0.96)');
    ctx.fillStyle = tailGradient;
    ctx.shadowBlur = config.tailThickness;
    ctx.shadowColor = config.tailGlowColor;
    ctx.fillRect(-dot.tailLength, -config.tailThickness / 2, dot.tailLength, config.tailThickness);
    ctx.shadowBlur = 0;

    if (image?.complete) {
        ctx.drawImage(
            image,
            -config.headSize / 2,
            -config.headSize / 2,
            config.headSize,
            config.headSize
        );
    } else {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, config.headSize / 4, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

function drawEmptyDot(ctx, dot, image, headSize) {
    ctx.save();
    ctx.translate(dot.x, dot.y);
    ctx.scale(dot.scale, dot.scale);
    ctx.globalAlpha = dot.opacity;

    if (image?.complete) {
        ctx.drawImage(image, -headSize / 2, -headSize / 2, headSize, headSize);
    } else {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, headSize / 4, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.restore();
}

export default function DotCanvasLayer({
    variant,
    targetCenter,
    collisionRadius,
    sphereRadius,
    onHit,
    spawnFrequencyRange,
    className,
}) {
    const canvasRef = useRef(null);
    const requestRef = useRef(null);
    const lastTimeRef = useRef();
    const spawnTimerRef = useRef(0);
    const dotsRef = useRef([]);
    const imageRef = useRef(null);
    const targetCenterRef = useRef(targetCenter);
    const collisionRadiusRef = useRef(collisionRadius);
    const sphereRadiusRef = useRef(sphereRadius);
    const onHitRef = useRef(onHit);
    const spawnFrequencyRangeRef = useRef(spawnFrequencyRange);

    useEffect(() => {
        targetCenterRef.current = targetCenter;
    }, [targetCenter]);

    useEffect(() => {
        collisionRadiusRef.current = collisionRadius;
    }, [collisionRadius]);

    useEffect(() => {
        sphereRadiusRef.current = sphereRadius;
    }, [sphereRadius]);

    useEffect(() => {
        onHitRef.current = onHit;
    }, [onHit]);

    useEffect(() => {
        spawnFrequencyRangeRef.current = spawnFrequencyRange;
    }, [spawnFrequencyRange]);

    useEffect(() => {
        const config = getVariantConfig(variant, spawnFrequencyRange);
        const image = new window.Image();
        image.decoding = 'async';
        image.src = config.imageSrc;
        imageRef.current = image;
    }, [spawnFrequencyRange, variant]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        const canvas = canvasRef.current;
        if (!canvas) {
            return undefined;
        }

        const context = canvas.getContext('2d');
        if (!context) {
            return undefined;
        }

        const drawFrame = (time) => {
            const config = getVariantConfig(variant, spawnFrequencyRangeRef.current);
            const { devicePixelRatio, viewportWidth, viewportHeight } = resizeCanvasToViewport(canvas);
            context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
            context.clearRect(0, 0, viewportWidth, viewportHeight);

            if (lastTimeRef.current != null) {
                const deltaTime = time - lastTimeRef.current;

                if (variant === 'empty') {
                    dotsRef.current = updateEmptyDots({
                        previousDots: dotsRef.current,
                        time,
                        deltaTime,
                        targetCenter: targetCenterRef.current,
                        sphereRadius: sphereRadiusRef.current,
                        spawnTimerRef,
                    });
                } else {
                    dotsRef.current = updateLineDots({
                        previousDots: dotsRef.current,
                        time,
                        deltaTime,
                        collisionRadius: collisionRadiusRef.current,
                        speedMultiplier: config.speedMultiplier,
                        accelerationGainPerStep: config.accelerationGainPerStep,
                        minSpawnDelayMs: config.minSpawnDelayMs,
                        maxSpawnDelayMs: config.maxSpawnDelayMs,
                        spawnTimerRef,
                        onHit: onHitRef.current,
                    });
                }
            }

            for (const dot of dotsRef.current) {
                if (variant === 'empty') {
                    drawEmptyDot(context, dot, imageRef.current, config.headSize);
                } else {
                    drawLineDot(context, dot, targetCenterRef.current, collisionRadiusRef.current, imageRef.current, config);
                }
            }

            lastTimeRef.current = time;
            requestRef.current = window.requestAnimationFrame(drawFrame);
        };

        const resetEngine = () => {
            dotsRef.current = [];
            lastTimeRef.current = undefined;
            if (variant === 'empty') {
                spawnTimerRef.current = EMPTY_MIN_SPAWN_DELAY_MS;
            } else {
                const config = getVariantConfig(variant, spawnFrequencyRangeRef.current);
                spawnTimerRef.current = config.minSpawnDelayMs + Math.random() * (config.maxSpawnDelayMs - config.minSpawnDelayMs);
            }
        };

        resetEngine();
        requestRef.current = window.requestAnimationFrame(drawFrame);

        return () => {
            if (requestRef.current) {
                window.cancelAnimationFrame(requestRef.current);
            }
            dotsRef.current = [];
            lastTimeRef.current = undefined;
        };
    }, [variant]);

    return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
