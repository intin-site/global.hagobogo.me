import useDotEngine from '../hooks/useDotEngine';
import DotItem from './DotItem';

export default function DotEngine({ targetCenter, collisionRadius }) {
    const dots = useDotEngine(undefined, collisionRadius);

    return (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
            {dots.map(dot => {
                const startX = targetCenter.x + Math.cos(dot.angle) * dot.distance;
                const startY = targetCenter.y + Math.sin(dot.angle) * dot.distance;

                // Dot이 중심을 향해야 하므로 회전값은 180도 추가
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
                    />
                );
            })}
        </div>
    );
}
