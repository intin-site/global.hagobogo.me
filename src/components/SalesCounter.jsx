import React from 'react';

export default function SalesCounter({ sales, isPulsing, mode = 'center', copy }) {
    // 숫자에 쉼표 포맷 추가
    const formattedSales = sales.toLocaleString();

    if (mode === 'center') {
        return (
            <div className="relative z-20 flex flex-col items-center justify-center text-center animate-[fadeIn_1s_ease-out_forwards] pointer-events-none text-[#4D545A]">
                <p className={`sphere_count sales-counter-value leading-none tracking-tighter tabular-nums ${isPulsing ? 'is-pulsing' : ''}`}>
                    {formattedSales}
                </p>
                {copy ? (
                    <div className="sales-counter-center-copy-group flex flex-col items-center justify-center text-center">
                        <p className="sales-counter-center-copy-title sales-counter-copy-title-top leading-[1.1]">
                            {copy.titleLineTop}
                        </p>
                        <p className="sales-counter-center-copy-title leading-[1.1]">
                            {copy.titleLineBottom}
                        </p>
                        <p className="sales-counter-center-copy-subtitle leading-[1.2]">
                            {copy.sinceText}
                        </p>
                    </div>
                ) : null}
            </div>
        );
    }

    return (
        <div className="sales-counter-copy-group z-20 flex flex-col items-center justify-center gap-[4px] text-center text-[#ffffff] pointer-events-none animate-[fadeIn_1s_ease-out_forwards]">
            <p className="sales-counter-copy-title sales-counter-copy-title-top text-2xl md:text-[28px] lg:text-[32px] leading-[1.2]">
                {copy.titleLineTop}
            </p>
            <p className="sales-counter-copy-title text-2xl md:text-[28px] lg:text-[32px] leading-[1.2]">
                {copy.titleLineBottom}
            </p>
            <p className="sales-counter-copy-subtitle text-base md:text-lg lg:text-[20px] leading-[1.4] opacity-90">
                {copy.sinceText}
            </p>
        </div>
    );
}
