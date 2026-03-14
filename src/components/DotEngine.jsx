import DotCanvasLayer from './DotCanvasLayer';

export default function DotEngine({ targetCenter, collisionRadius }) {
    return (
        <DotCanvasLayer
            variant="default"
            targetCenter={targetCenter}
            collisionRadius={collisionRadius}
            className="absolute inset-0 pointer-events-none z-10 overflow-hidden"
        />
    );
}
