import React from 'react';
import imgSphere from '../../assets/svg/imgSphere.svg';

export default function Sphere({ isLineHit }) {
    return (
        <div
            className="relative"
            style={{
                width: 'clamp(320px, 58vw, 840px)',
                height: 'clamp(320px, 58vw, 840px)',
            }}
        >
            <div
                className={`sphere_line absolute top-1/2 left-1/2 rounded-full border pointer-events-none ${isLineHit ? 'animate-[sphereLinePulse_500ms_ease-out]' : ''}`}
                style={{
                    width: '105%',
                    height: '105%',
                    transform: 'translate(-50%, -50%)',
                }}
            />
            <img
                src={imgSphere}
                alt="Opaque Sphere Background"
                className="w-full h-full object-contain opacity-100"
            />
        </div>
    );
}
