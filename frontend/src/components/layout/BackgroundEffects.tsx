import React, { useEffect, useState } from 'react';

interface BackgroundEffectsProps {
    showParticles?: boolean;
}

const BackgroundEffects: React.FC<BackgroundEffectsProps> = ({ showParticles = true }) => {
    const [particles, setParticles] = useState<{ x: number; y: number; id: number }[]>([]);

    useEffect(() => {
        if (!showParticles) return;
        const generateParticles = () => {
            const newParticles = Array.from({ length: 30 }, (_, i) => ({
                x: Math.random() * 100,
                y: Math.random() * 100,
                id: i,
            }));
            setParticles(newParticles);
        };
        generateParticles();
    }, [showParticles]);

    return (
        <>
            {/* Animated background elements */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
                <div className="absolute top-1/2 left-1/3 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            {/* Grid background */}
            <div className="fixed inset-0 pointer-events-none opacity-10">
                <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="white" strokeWidth="0.5" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
            </div>

            {/* Floating particles */}
            {showParticles && (
                <div className="fixed inset-0 pointer-events-none">
                    {particles.map((particle) => (
                        <div
                            key={particle.id}
                            className="absolute w-1 h-1 rounded-full animate-pulse"
                            style={{
                                left: `${particle.x}%`,
                                top: `${particle.y}%`,
                                background: `hsl(${260 + (particle.id % 60)}, 100%, 60%)`,
                                animation: `float ${3 + (particle.id % 4)}s infinite ease-in-out`,
                                animationDelay: `${particle.id * 0.1}s`,
                            }}
                        />
                    ))}
                    <style>{`
                        @keyframes float {
                            0%, 100% { transform: translateY(0px); opacity: 0.3; }
                            50% { transform: translateY(-20px); opacity: 0.8; }
                        }
                    `}</style>
                </div>
            )}

            {/* Bottom gradient line */}
            <div className="fixed bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent z-10"></div>
        </>
    );
};

export default BackgroundEffects;
