import React, { useState, useRef, useEffect } from 'react';
import { Pet } from '@/data/petData';
import { cn } from '@/lib/utils';

interface PedigreeTreeProps {
    pet: Pet;
    allPets: Pet[];
    onPetClick: (pet: Pet) => void;
    maxDepth?: number;
}

interface TreeNodeProps {
    petId?: string;
    role: 'sire' | 'dam' | 'self';
    allPets: Pet[];
    currentDepth: number;
    maxDepth: number;
    onPetClick: (pet: Pet) => void;
    status?: 'pending' | 'verified' | 'rejected';
}

const TreeNode: React.FC<TreeNodeProps> = ({ petId, role, allPets, currentDepth, maxDepth, onPetClick, status }) => {
    const pet = allPets.find(p => p.id === petId);

    // Base case: Max depth reached
    if (currentDepth > maxDepth) return null;

    const hasParents = currentDepth < maxDepth;
    const sireId = pet?.parentIds?.sire;
    const damId = pet?.parentIds?.dam;

    return (
        <div className="flex flex-col items-center">
            <div className="relative flex flex-col items-center group z-10">
                {/* Verification Badge */}
                {status && status !== 'verified' && (
                    <div className={cn(
                        "absolute -top-3 right-0 z-20 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm",
                        status === 'pending' && "bg-amber-400 text-black",
                        status === 'rejected' && "bg-red-500 text-white"
                    )}>
                        {status}
                    </div>
                )}

                {/* Card */}
                {pet ? (
                    <button
                        onClick={() => onPetClick(pet)}
                        className={cn(
                            "relative overflow-hidden rounded-xl border-2 transition-all duration-300 hover:shadow-2xl hover:scale-105 group-hover:border-primary text-left bg-white",
                            currentDepth === 0 ? "w-72 shadow-xl" : currentDepth === 1 ? "w-48" : "w-36"
                        )}
                    >
                        <div className={cn("relative w-full overflow-hidden bg-muted", currentDepth === 0 ? "h-48" : currentDepth === 1 ? "h-28" : "h-24")}>
                            <img src={pet.image} alt={pet.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                            <div className="absolute bottom-3 left-3 right-3 text-white">
                                <p className={cn("font-bold leading-tight truncate", currentDepth === 0 ? "text-2xl mb-1" : "text-base")}>{pet.name}</p>
                                <p className="text-xs opacity-90 uppercase tracking-wider truncate">{pet.breed}</p>
                            </div>
                        </div>
                        {currentDepth === 0 && (
                            <div className="p-4 bg-white">
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <span className="block text-xs uppercase text-muted-foreground mb-1">Type</span>
                                        <span className="font-semibold capitalize">{pet.type}</span>
                                    </div>
                                    <div>
                                        <span className="block text-xs uppercase text-muted-foreground mb-1">Gender</span>
                                        <span className={cn("font-semibold capitalize", pet.gender === 'male' ? 'text-blue-600' : 'text-pink-600')}>
                                            {pet.gender === 'male' ? '♂ Male' : '♀ Female'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </button>
                ) : (
                    <div className={cn(
                        "flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/30 text-center",
                        currentDepth === 0 ? "w-72 h-48" : currentDepth === 1 ? "w-48 h-28" : "w-36 h-24"
                    )}>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">{role}</span>
                        <span className="text-sm font-medium text-muted-foreground/60">Unknown</span>
                    </div>
                )}

                {/* Role Label for parents */}
                {currentDepth > 0 && (
                    <div className="absolute -top-8 text-xs font-bold uppercase tracking-wider text-primary bg-white px-3 py-1 rounded-full border-2 border-primary/20 shadow-sm">
                        {role === 'sire' ? '♂ Father' : '♀ Mother'}
                    </div>
                )}
            </div>

            {/* Recursion for Parents - INVERTED: Parents are BELOW */}
            {hasParents && (sireId || damId || currentDepth < maxDepth) && (
                <div className="flex flex-col items-center mt-4">
                    {/* Vertical Line from Child DOWN to Parents */}
                    <div className="w-1 h-12 bg-gradient-to-b from-primary/40 to-primary/20 rounded-full" />

                    {/* Parents Container - Below the child */}
                    <div className="flex relative pt-4 gap-8">
                        {/* Crossbar connecting parents */}
                        <div className="absolute top-0 left-1/4 right-1/4 h-1 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 rounded-full" />
                        {/* Vertical connector from crossbar center to join the child line */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-4 bg-primary/30 rounded-full" />

                        {/* Sire Branch (Left) */}
                        <div className="flex flex-col items-center">
                            <TreeNode
                                petId={sireId}
                                role="sire"
                                allPets={allPets}
                                currentDepth={currentDepth + 1}
                                maxDepth={maxDepth}
                                onPetClick={onPetClick}
                                status={pet?.parentIds?.sireStatus || 'verified'}
                            />
                        </div>

                        {/* Dam Branch (Right) */}
                        <div className="flex flex-col items-center">
                            <TreeNode
                                petId={damId}
                                role="dam"
                                allPets={allPets}
                                currentDepth={currentDepth + 1}
                                maxDepth={maxDepth}
                                onPetClick={onPetClick}
                                status={pet?.parentIds?.damStatus || 'verified'}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const PedigreeTree: React.FC<PedigreeTreeProps> = ({ pet, allPets, onPetClick, maxDepth = 3 }) => {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // Pinch Zoom Handler with Center-Point Zooming
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        let initialDistance = 0;
        let initialScale = scale;
        let initialPosition = { ...position };

        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                e.stopPropagation();

                const touch1 = e.touches[0];
                const touch2 = e.touches[1];

                // Calculate initial distance between fingers
                initialDistance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                );
                initialScale = scale;
                initialPosition = { ...position };
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                e.stopPropagation();

                const touch1 = e.touches[0];
                const touch2 = e.touches[1];

                // Calculate current distance
                const currentDistance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                );

                // Calculate new scale (constrained between 0.3 and 3)
                const newScale = Math.max(0.3, Math.min(3, initialScale * (currentDistance / initialDistance)));
                setScale(newScale);

                // Keep content centered - reset position on zoom
                // This ensures the tree stays centered at top of screen
                setPosition({ x: 0, y: 0 });
            }
        };

        const handleTouchEnd = (e: TouchEvent) => {
            if (e.touches.length < 2) {
                // Reset when fingers lifted
                initialDistance = 0;
            }
        };

        // Use { passive: false } to allow preventDefault()
        container.addEventListener('touchstart', handleTouchStart, { passive: false });
        container.addEventListener('touchmove', handleTouchMove, { passive: false });
        container.addEventListener('touchend', handleTouchEnd, { passive: false });

        return () => {
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
            container.removeEventListener('touchend', handleTouchEnd);
        };
    }, [scale, position]);

    // Mouse Pan Handler
    const handleMouseDown = (e: React.MouseEvent) => {
        setIsPanning(true);
        setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isPanning) return;
        setPosition({
            x: e.clientX - startPos.x,
            y: e.clientY - startPos.y
        });
    };

    const handleMouseUp = () => {
        setIsPanning(false);
    };

    // Zoom Controls - Keep content centered
    const zoomIn = () => {
        setScale(prev => Math.min(prev + 0.2, 3));
        setPosition({ x: 0, y: 0 }); // Reset to center
    };

    const zoomOut = () => {
        setScale(prev => Math.max(prev - 0.2, 0.3));
        setPosition({ x: 0, y: 0 }); // Reset to center
    };

    const resetZoom = () => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    };

    return (
        <div className="relative w-full h-full bg-gradient-to-br from-muted/20 to-background rounded-3xl overflow-hidden">
            {/* Zoom Controls */}
            <div className="absolute top-4 right-4 z-30 flex flex-col gap-2">
                <button
                    onClick={zoomIn}
                    className="p-3 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 border border-primary/20"
                    title="Zoom In"
                >
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                </button>
                <button
                    onClick={zoomOut}
                    className="p-3 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 border border-primary/20"
                    title="Zoom Out"
                >
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                </button>
                <button
                    onClick={resetZoom}
                    className="p-3 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 border border-primary/20"
                    title="Reset View"
                >
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>

            {/* Scale Indicator */}
            <div className="absolute top-4 left-4 z-30 px-4 py-2 bg-white rounded-xl shadow-lg border border-primary/20">
                <span className="text-sm font-semibold text-primary">{Math.round(scale * 100)}%</span>
            </div>

            {/* Help Text */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-white/90 backdrop-blur rounded-full shadow-lg border border-primary/20">
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Pinch to zoom • Drag to pan
                </p>
            </div>

            {/* Tree Container */}
            <div
                ref={containerRef}
                className={cn(
                    "w-full h-[600px] overflow-hidden touch-none",
                    isPanning ? "cursor-grabbing" : "cursor-grab"
                )}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <div
                    ref={contentRef}
                    className="w-full h-full flex items-start justify-center pt-12"
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        transformOrigin: 'top center',
                        transition: 'transform 0.1s ease-out',
                    }}
                >
                    <TreeNode
                        petId={pet.id}
                        role="self"
                        allPets={allPets}
                        currentDepth={0}
                        maxDepth={maxDepth}
                        onPetClick={onPetClick}
                    />
                </div>
            </div>
        </div>
    );
};

export default PedigreeTree;
