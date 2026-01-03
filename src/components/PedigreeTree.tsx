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
    // State references (mutable, doesn't trigger re-renders)
    const transformRef = useRef({ scale: 1, x: 0, y: 0 });
    const gestureRef = useRef({
        startDistance: 0,
        startScale: 1,
        startMid: { x: 0, y: 0 },
        startPos: { x: 0, y: 0 },
        isZooming: false,
        startX: 0,
        startY: 0
    });

    // React State for rendering (only update when gesture ends or for UI controls)
    const [renderTrigger, setRenderTrigger] = useState(0); // Force re-render just for UI updates
    const [isInteracting, setIsInteracting] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // Apply transform directly to DOM for smoothness
    const updateTransform = () => {
        if (contentRef.current) {
            const { scale, x, y } = transformRef.current;
            contentRef.current.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
            // Force re-render sparingly to update scale indicator UI
            requestAnimationFrame(() => {
                // Only update React state occasionally if needed, or don't at all during drag
            });
        }
    };

    // Initialize/Reset
    useEffect(() => {
        // Center initial view if needed
        // For now, start at 0,0, scale 1
    }, []);

    // Gesture Handlers
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                // Two fingers = Zoom
                e.preventDefault();
                gestureRef.current.isZooming = true;
                setIsInteracting(true);

                const t1 = e.touches[0];
                const t2 = e.touches[1];

                // Calculate distance
                const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
                gestureRef.current.startDistance = dist;
                gestureRef.current.startScale = transformRef.current.scale;

                // Calculate midpoint relative to container
                const rect = container.getBoundingClientRect();
                const midX = (t1.clientX + t2.clientX) / 2 - rect.left;
                const midY = (t1.clientY + t2.clientY) / 2 - rect.top;

                gestureRef.current.startMid = { x: midX, y: midY };
                gestureRef.current.startPos = { x: transformRef.current.x, y: transformRef.current.y };

            } else if (e.touches.length === 1) {
                // One finger = Pan
                const t = e.touches[0];
                gestureRef.current.isZooming = false;
                setIsInteracting(true);
                gestureRef.current.startX = t.clientX;
                gestureRef.current.startY = t.clientY;
                gestureRef.current.startPos = { x: transformRef.current.x, y: transformRef.current.y };
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            e.preventDefault();
            e.stopPropagation();

            if (e.touches.length === 2 && gestureRef.current.isZooming) {
                // Handle Zoom
                const t1 = e.touches[0];
                const t2 = e.touches[1];

                const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
                if (gestureRef.current.startDistance === 0) return; // Prevent division by zero

                const scaleFactor = currentDist / gestureRef.current.startDistance;
                let newScale = gestureRef.current.startScale * scaleFactor;

                // Constrain scale
                newScale = Math.max(0.3, Math.min(3, newScale));

                // "Zoom towards finger" math
                // P' = C - (C - P) * (S' / S)
                // C is startMid, P is startPos, S is startScale, S' is newScale
                const mid = gestureRef.current.startMid;
                const p = gestureRef.current.startPos;
                const s = gestureRef.current.startScale;

                const ratio = newScale / s;

                const newX = mid.x - (mid.x - p.x) * ratio;
                const newY = mid.y - (mid.y - p.y) * ratio;

                transformRef.current = { scale: newScale, x: newX, y: newY };
                updateTransform();

            } else if (e.touches.length === 1 && !gestureRef.current.isZooming) {
                // Handle Pan
                const t = e.touches[0];
                const dx = t.clientX - gestureRef.current.startX;
                const dy = t.clientY - gestureRef.current.startY;

                transformRef.current.x = gestureRef.current.startPos.x + dx;
                transformRef.current.y = gestureRef.current.startPos.y + dy;
                updateTransform();
            }
        };

        const handleTouchEnd = (e: TouchEvent) => {
            if (e.touches.length === 0) {
                setIsInteracting(false);
                // Update state for UI to reflect final scale (e.g. 150%)
                setRenderTrigger(prev => prev + 1);
            }
            if (e.touches.length < 2) {
                gestureRef.current.isZooming = false;
                // If one finger remains, switch to pan? Complex logic, skipping for reliability first.
            }
        };

        // Add listeners
        container.addEventListener('touchstart', handleTouchStart, { passive: false });
        container.addEventListener('touchmove', handleTouchMove, { passive: false });
        container.addEventListener('touchend', handleTouchEnd, { passive: false });

        return () => {
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
            container.removeEventListener('touchend', handleTouchEnd);
        };
    }, []); // Empty dependency array = listeners never detached/reattached during interaction!


    // UI Controls (Mouse/Buttons) interact with Refs too
    const zoomIn = () => {
        transformRef.current.scale = Math.min(transformRef.current.scale + 0.3, 3);
        updateTransform();
        setRenderTrigger(prev => prev + 1);
    };

    const zoomOut = () => {
        transformRef.current.scale = Math.max(transformRef.current.scale - 0.3, 0.3);
        updateTransform();
        setRenderTrigger(prev => prev + 1);
    };

    const resetZoom = () => {
        transformRef.current = { scale: 1, x: 0, y: 0 };
        updateTransform();
        setRenderTrigger(prev => prev + 1);
    };

    // Mouse Panning (Desktop)
    const handleMouseDown = (e: React.MouseEvent) => {
        // e.preventDefault(); // Optional, but let's keep default for mouse interactions
        gestureRef.current.isZooming = false;
        gestureRef.current.startX = e.clientX;
        gestureRef.current.startY = e.clientY;
        gestureRef.current.startPos = { x: transformRef.current.x, y: transformRef.current.y };
        setIsInteracting(true);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isInteracting || gestureRef.current.isZooming) return;
        const dx = e.clientX - gestureRef.current.startX;
        const dy = e.clientY - gestureRef.current.startY;
        transformRef.current.x = gestureRef.current.startPos.x + dx;
        transformRef.current.y = gestureRef.current.startPos.y + dy;
        updateTransform();
    };

    const handleMouseUp = () => {
        setIsInteracting(false);
    };


    return (
        <div className="relative w-full h-[60vh] min-h-[500px] bg-gradient-to-br from-muted/5 to-background rounded-3xl overflow-hidden border border-t-0 border-x-0 border-b-2 border-primary/5">
            {/* Zoom Controls - Transparent Glass */}
            <div className="absolute top-4 right-4 z-30 flex flex-col gap-2 group/controls">
                <button
                    onClick={zoomIn}
                    className="p-3 bg-white/40 backdrop-blur-md rounded-xl shadow-sm border border-primary/10 opacity-60 hover:opacity-100 hover:bg-white hover:scale-105 hover:shadow-lg transition-all duration-300"
                    title="Zoom In"
                >
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                </button>
                <button
                    onClick={zoomOut}
                    className="p-3 bg-white/40 backdrop-blur-md rounded-xl shadow-sm border border-primary/10 opacity-60 hover:opacity-100 hover:bg-white hover:scale-105 hover:shadow-lg transition-all duration-300"
                    title="Zoom Out"
                >
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                </button>
                <button
                    onClick={resetZoom}
                    className="p-3 bg-white/40 backdrop-blur-md rounded-xl shadow-sm border border-primary/10 opacity-60 hover:opacity-100 hover:bg-white hover:scale-105 hover:shadow-lg transition-all duration-300"
                    title="Reset View"
                >
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>

            {/* Scale Indicator - Transparent */}
            <div className="absolute top-4 left-4 z-30 px-3 py-1.5 bg-white/40 backdrop-blur-md rounded-lg shadow-sm border border-primary/10 opacity-60 hover:opacity-100 transition-opacity">
                <span className="text-xs font-bold text-primary">{Math.round(transformRef.current.scale * 100)}%</span>
            </div>

            {/* Help Text - Hidden on small screens or transparent */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-white/30 backdrop-blur-md rounded-full shadow-sm border border-primary/10 opacity-40 hover:opacity-100 transition-all pointer-events-none">
                <p className="text-[10px] text-foreground/80 font-medium flex items-center gap-2 whitespace-nowrap">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Pinch to zoom • Drag to pan
                </p>
            </div>

            {/* Tree Container */}
            <div
                ref={containerRef}
                className={cn(
                    "w-full h-full overflow-hidden touch-none select-none",
                    isInteracting ? "cursor-grabbing" : "cursor-grab"
                )}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <div
                    ref={contentRef}
                    className="w-full h-full flex items-start justify-center pt-12 origin-top-left"
                    style={{
                        transform: `translate(0px, 0px) scale(1)`,
                        // Initial style. Updates happen via direct DOM manipulation for performance (no react re-renders)
                        transition: isInteracting ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
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

