import React from 'react';
import DotCanvasLayer from './DotCanvasLayer';

export default function DotEmptyEngine({ targetCenter, sphereRadius }) {
    return (
        <DotCanvasLayer
            variant="empty"
            targetCenter={targetCenter}
            sphereRadius={sphereRadius}
            className="absolute inset-0 pointer-events-none z-0 overflow-hidden"
        />
    );
}
