import React from 'react';
import useDotEmptyEngine from '../hooks/useDotEmptyEngine';
import DotEmptyItem from './DotEmptyItem';

export default function DotEmptyEngine({ targetCenter, sphereRadius }) {
    const dots = useDotEmptyEngine(targetCenter, sphereRadius);

    return (
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
            {dots.map((dot) => {
                return (
                    <DotEmptyItem
                        key={dot.id}
                        x={dot.x}
                        y={dot.y}
                        scale={dot.scale}
                        opacity={dot.opacity}
                    />
                );
            })}
        </div>
    );
}
