import dotHeadBlue from '../../assets/svg/dot_head_blue.svg';
import useDotEngine from '../hooks/useDotEngine';
import DotItem from './DotItem';

const ONE_HOUR_MS = 60 * 60 * 1000;

export default function DotBlueEngine({ onHit, targetCenter, collisionRadius, spawnFrequencyRange }) {
    const minSpawnDelayMs = ONE_HOUR_MS / spawnFrequencyRange.max;
    const maxSpawnDelayMs = ONE_HOUR_MS / spawnFrequencyRange.min;
    const dots = useDotEngine(onHit, collisionRadius, {
        speedMultiplier: 0.5,
        accelerationGainPerStep: 1.05,
        minSpawnDelayMs,
        maxSpawnDelayMs,
    });

    return (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
            {dots.map(dot => {
                const startX = targetCenter.x + Math.cos(dot.angle) * dot.distance;
                const startY = targetCenter.y + Math.sin(dot.angle) * dot.distance;

                // Dot이 중심을 향하도록 기존 회전 계산을 그대로 유지합니다.
                const rotation = (dot.angle * 180) / Math.PI + 180;
                const progress = (dot.distance - collisionRadius) / (dot.initialDistance - collisionRadius);
                const currentScale = 0.1 + 0.9 * Math.max(0, progress);

                return (
                    <DotItem
                        key={dot.id}
                        x={startX}
                        y={startY}
                        rotation={rotation}
                        scale={currentScale}
                        tailLength={dot.tailLength}
                        opacity={dot.opacity}
                        headImage={dotHeadBlue}
                        alt="blue dot"
                        headSize={120}
                        tailThickness={12}
                        tailGlow="drop-shadow(0 0 8px rgba(43,196,229,0.4))"
                    />
                );
            })}
        </div>
    );
}
