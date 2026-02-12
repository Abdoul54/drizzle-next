/* eslint-disable @next/next/no-img-element */
"use client";
import { useEffect, useState, ReactNode } from "react";

interface CustomCursorProps {
    children: ReactNode;
    cursorSrc: string;
    cursorSize?: number;
    enabled?: boolean;
}

export function CustomCursor({
    children,
    cursorSrc,
    cursorSize = 32,
    enabled = true
}: CustomCursorProps) {
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [isHovering, setIsHovering] = useState(false);

    useEffect(() => {
        if (!enabled) return;

        const handleMouseMove = (e: MouseEvent) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [enabled]);

    return (
        <>
            {enabled && isHovering && (
                <div
                    className="fixed pointer-events-none z-[9999]"
                    style={{
                        left: mousePos.x,
                        top: mousePos.y,
                        transform: 'translate(-50%, -50%)'
                    }}
                >
                    <img
                        src={cursorSrc}
                        alt=""
                        width={cursorSize}
                        height={cursorSize}
                        draggable={false}
                    />
                </div>
            )}

            <div
                className={enabled ? "cursor-none" : ""}
                onMouseEnter={() => enabled && setIsHovering(true)}
                onMouseLeave={() => enabled && setIsHovering(false)}
            >
                {children}
            </div>
        </>
    );
}