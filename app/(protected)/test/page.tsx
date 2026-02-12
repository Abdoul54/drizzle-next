"use client";
import { useEffect, useState } from "react";

const Page = () => {
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [isHovering, setIsHovering] = useState(false);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div className="flex justify-center items-center flex-1 bg-accent">
            {isHovering && (
                <div
                    className="fixed pointer-events-none z-50"
                    style={{
                        left: mousePos.x,
                        top: mousePos.y,
                        transform: 'translate(-50%, -50%)'
                    }}
                >
                    <img src="/pointer.png" alt="" width={32} height={32} />
                </div>
            )}

            <div
                className="cursor-none"
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                style={{ width: '200px', height: '200px', background: 'red' }}
            >
                Hover here
            </div>
        </div>
    );
};

export default Page;