import React from 'react';
import dotHead from '../../assets/svg/dot_head.svg';

// DotItem은 전달받은 x, y 와 회전 각도, scale, 꼬리 길이, 머리 SVG 크기에 따라 위치와 크기가 결정됩니다.
export default function DotItem({
    x,
    y,
    rotation,
    scale,
    tailLength,
    opacity,
    headImage = dotHead,
    alt = 'dot',
    headSize = 44,
    tailThickness = 4,
    tailGlow = 'drop-shadow(0 0 4px rgba(255,255,255,0.28))',
}) {
    return (
        <div
            className="absolute top-0 left-0"
            style={{
                transform: `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(${scale})`,
                opacity,
                // 성능 최적화 (하드웨어 가속)
                willChange: 'transform, opacity',
                transformOrigin: '0 0',
            }}
        >
            <div
                className="absolute top-0 left-0"
                style={{
                    width: `${tailLength}px`,
                    height: `${tailThickness}px`,
                    transform: `translate(${-tailLength}px, ${-tailThickness / 2}px)`,
                    background: 'linear-gradient(to left, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0) 65%)',
                    transformOrigin: '100% 50%',
                    filter: tailGlow,
                }}
            />

            <div
                className="absolute top-0 left-0"
                style={{
                    width: `${headSize}px`,
                    height: `${headSize}px`,
                    transform: `translate(${-headSize / 2}px, ${-headSize / 2}px)`,
                }}
            >
                <img
                    src={headImage}
                    alt={alt}
                    className="w-full h-full object-contain"
                />
            </div>
        </div>
    );
}
