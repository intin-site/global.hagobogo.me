import DotCanvasLayer from './DotCanvasLayer';

export default function DotBlueEngine({ onHit, targetCenter, collisionRadius, spawnFrequencyRange }) {
    return (
        <DotCanvasLayer
            variant="blue"
            onHit={onHit}
            targetCenter={targetCenter}
            collisionRadius={collisionRadius}
            spawnFrequencyRange={spawnFrequencyRange}
            className="absolute inset-0 pointer-events-none z-10 overflow-hidden"
        />
    );
}
