import React from 'react';
import dotHeadLine from '../../assets/svg/dot_head_line.svg';

export default function DotEmptyItem({ x, y, scale, opacity }) {
    return (
        <div
            className="absolute top-0 left-0"
            style={{
                transform: `translate(${x}px, ${y}px) scale(${scale})`,
                opacity,
                willChange: 'transform, opacity',
                transformOrigin: '0 0',
            }}
        >
            <div className="absolute top-0 left-0 w-[44px] h-[44px]" style={{ transform: 'translate(-22px, -22px)' }}>
                <img
                    src={dotHeadLine}
                    alt="dot empty"
                    className="w-full h-full object-contain"
                />
            </div>
        </div>
    );
}
