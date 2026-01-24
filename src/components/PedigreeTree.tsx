import React, { useState, useRef, useEffect } from 'react';
import { Pet } from '@/data/petData';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, AlertTriangle, Calendar } from "lucide-react";

interface PedigreeTreeProps {
    pet: any; // Can be Pet or tree with mother/father
    onPetClick?: (pet: Pet) => void;
    maxDepth?: number;
    className?: string;
    isAdmin?: boolean;
    onUpdateDate?: (petId: string, newDate: string) => Promise<void>;
    onReportIssue?: (pet: Pet) => void;
}

interface TreeNodeProps {
    pet?: any;
    role: 'sire' | 'dam' | 'self';
    currentDepth: number;
    maxDepth: number;
    onPetClick?: (pet: Pet) => void;
    status?: 'pending' | 'verified' | 'rejected';
    childBirthDate?: string;
    isAdmin?: boolean;
    onUpdateDate?: (petId: string, newDate: string) => Promise<void>;
    onReportIssue?: (pet: Pet) => void;
}

const EditDatePopover: React.FC<{
    pet: Pet;
    childBirthDate?: string;
    onSave: (date: string) => Promise<void>;
}> = ({ pet, childBirthDate, onSave }) => {
    const [date, setDate] = useState(pet.birthDate?.split('T')[0] || '');
    const [saving, setSaving] = useState(false);
    const [open, setOpen] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(date);
            setOpen(false);
        } finally {
            setSaving(false);
        }
    };

    const isInvalid = childBirthDate && date && new Date(date) >= new Date(childBirthDate);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg animate-pulse"
                    onClick={(e) => e.stopPropagation()}
                >
                    <AlertTriangle className="w-3 h-3" />
                    Check
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3 bg-[#1A1A1A] border border-[#C5A059]/30 text-[#F5F5F0]" onClick={(e) => e.stopPropagation()}>
                <div className="space-y-2">
                    <h4 className="font-bold text-[#C5A059] flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4" />
                        Fix Birth Date
                    </h4>
                    <p className="text-xs text-[#B8B8B8]">
                        Child born: <span className="font-mono text-white">{childBirthDate}</span>
                    </p>
                    <div className="flex gap-2">
                        <Input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className={cn(
                                "h-8 text-xs bg-[#0D0D0D] border-gray-700",
                                isInvalid && "border-red-500 text-red-500"
                            )}
                        />
                        <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={saving}
                            className="h-8 w-8 p-0 bg-[#C5A059] hover:bg-[#D4C4B5] text-black"
                        >
                            <Save className="w-4 h-4" />
                        </Button>
                    </div>
                    {isInvalid && (
                        <p className="text-[10px] text-red-400 font-medium">
                            Must be before child birth date!
                        </p>
                    )}
                    <div className="pt-2 border-t border-white/10 mt-2">
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                window.dispatchEvent(new CustomEvent('OPEN_ADMIN_PET_EDIT', { detail: { petId: pet.id } }));
                            }}
                            className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 w-full justify-center mt-1 cursor-pointer"
                        >
                            Edit In System Control &rarr;
                        </button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
};

const TreeNode: React.FC<TreeNodeProps> = ({ pet, role, currentDepth, maxDepth, onPetClick, status, childBirthDate, isAdmin, onUpdateDate, onReportIssue }) => {
    if (currentDepth > maxDepth || !pet) return null;

    const hasParents = currentDepth < maxDepth;
    const mother = pet.mother;
    const father = pet.father;

    // Validation Check
    const currentBirthDate = pet.birthDate || pet.birthday;
    let warning = false;
    if (childBirthDate && currentBirthDate) {
        warning = new Date(currentBirthDate) >= new Date(childBirthDate);
    }

    const currentFormattedDate = currentBirthDate ? new Date(currentBirthDate).toISOString().split('T')[0] : undefined;

    return (
        <div className="flex flex-col items-center">
            <div className="relative flex flex-col items-center group z-10">
                {/* Verification Badge */}
                {status && status !== 'verified' && !warning && (
                    <div className={cn(
                        "absolute -top-3 right-0 z-20 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm",
                        status === 'pending' && "bg-amber-400 text-black",
                        status === 'rejected' && "bg-red-500 text-white"
                    )}>
                        {status}
                    </div>
                )}

                {/* Validation Warning Badge */}
                {warning && (
                    <div className="absolute -top-3 right-0 z-30 flex items-center">
                        {isAdmin && onUpdateDate ? (
                            <EditDatePopover
                                pet={{ ...pet, birthDate: currentBirthDate }}
                                childBirthDate={childBirthDate}
                                onSave={(newDate) => onUpdateDate(pet.id, newDate)}
                            />
                        ) : (
                            <button
                                className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onReportIssue?.(pet);
                                }}
                            >
                                <AlertTriangle className="w-3 h-3" />
                                Check
                            </button>
                        )}
                    </div>
                )}

                {/* Card */}
                {pet ? (
                    <button
                        onClick={() => onPetClick?.(pet)}
                        className={cn(
                            "relative overflow-hidden rounded-xl border-2 transition-all duration-300 hover:shadow-2xl hover:scale-105 group-hover:border-primary text-left bg-white",
                            currentDepth === 0 ? "w-72 shadow-xl" : currentDepth === 1 ? "w-48" : "w-36",
                            warning && "border-red-500 ring-2 ring-red-500/20"
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

            {hasParents && (mother || father) && (
                <div className="flex flex-col items-center mt-4">
                    <div className="w-1 h-12 bg-gradient-to-b from-primary/40 to-primary/20 rounded-full" />
                    <div className="flex relative pt-4 gap-8">
                        <div className="absolute top-0 left-1/4 right-1/4 h-1 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 rounded-full" />
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-4 bg-primary/30 rounded-full" />

                        <div className="flex flex-col items-center">
                            <TreeNode
                                pet={father}
                                role="sire"
                                currentDepth={currentDepth + 1}
                                maxDepth={maxDepth}
                                onPetClick={onPetClick}
                                status={'verified'}
                                childBirthDate={currentFormattedDate}
                                isAdmin={isAdmin}
                                onUpdateDate={onUpdateDate}
                                onReportIssue={onReportIssue}
                            />
                        </div>

                        <div className="flex flex-col items-center">
                            <TreeNode
                                pet={mother}
                                role="dam"
                                currentDepth={currentDepth + 1}
                                maxDepth={maxDepth}
                                onPetClick={onPetClick}
                                status={'verified'}
                                childBirthDate={currentFormattedDate}
                                isAdmin={isAdmin}
                                onUpdateDate={onUpdateDate}
                                onReportIssue={onReportIssue}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const PedigreeTree: React.FC<PedigreeTreeProps> = ({ pet, onPetClick, maxDepth = 3, className, isAdmin, onUpdateDate, onReportIssue }) => {
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

    const [renderTrigger, setRenderTrigger] = useState(0);
    const [isInteracting, setIsInteracting] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    const updateTransform = () => {
        if (contentRef.current) {
            const { scale, x, y } = transformRef.current;
            contentRef.current.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
            requestAnimationFrame(() => { });
        }
    };

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                gestureRef.current.isZooming = true;
                setIsInteracting(true);

                const t1 = e.touches[0];
                const t2 = e.touches[1];
                const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
                gestureRef.current.startDistance = dist;
                gestureRef.current.startScale = transformRef.current.scale;

                const rect = container.getBoundingClientRect();
                const midX = (t1.clientX + t2.clientX) / 2 - rect.left;
                const midY = (t1.clientY + t2.clientY) / 2 - rect.top;

                gestureRef.current.startMid = { x: midX, y: midY };
                gestureRef.current.startPos = { x: transformRef.current.x, y: transformRef.current.y };

            } else if (e.touches.length === 1) {
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
                const t1 = e.touches[0];
                const t2 = e.touches[1];
                const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
                if (gestureRef.current.startDistance === 0) return;

                const scaleFactor = currentDist / gestureRef.current.startDistance;
                let newScale = gestureRef.current.startScale * scaleFactor;
                newScale = Math.max(0.3, Math.min(3, newScale));

                const mid = gestureRef.current.startMid;
                const p = gestureRef.current.startPos;
                const s = gestureRef.current.startScale;
                const ratio = newScale / s;

                const newX = mid.x - (mid.x - p.x) * ratio;
                const newY = mid.y - (mid.y - p.y) * ratio;

                transformRef.current = { scale: newScale, x: newX, y: newY };
                updateTransform();

            } else if (e.touches.length === 1 && !gestureRef.current.isZooming) {
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
                setRenderTrigger(prev => prev + 1);
            }
            if (e.touches.length < 2) {
                gestureRef.current.isZooming = false;
            }
        };

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const zoomIntensity = 0.002;
            const delta = -e.deltaY;
            const currentScale = transformRef.current.scale;
            let newScale = currentScale + (delta * zoomIntensity * currentScale);
            newScale = Math.max(0.3, Math.min(3, newScale));

            const rect = container.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const ratio = newScale / currentScale;

            const newX = mouseX - (mouseX - transformRef.current.x) * ratio;
            const newY = mouseY - (mouseY - transformRef.current.y) * ratio;

            transformRef.current = { scale: newScale, x: newX, y: newY };
            updateTransform();

            if (!gestureRef.current.isZooming) {
                requestAnimationFrame(() => setRenderTrigger(prev => prev + 1));
            }
        };

        container.addEventListener('touchstart', handleTouchStart, { passive: false });
        container.addEventListener('touchmove', handleTouchMove, { passive: false });
        container.addEventListener('touchend', handleTouchEnd, { passive: false });
        container.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
            container.removeEventListener('touchend', handleTouchEnd);
            container.removeEventListener('wheel', handleWheel);
        };
    }, []);

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

    const handleMouseDown = (e: React.MouseEvent) => {
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
        <div className={cn(
            "relative w-full bg-gradient-to-br from-muted/5 to-background rounded-3xl overflow-hidden border border-t-0 border-x-0 border-b-2 border-primary/5",
            className
        )}>
            <div className="absolute top-24 right-4 z-30 flex flex-col gap-2 group/controls items-center">
                <button onClick={zoomIn} className="p-3 bg-white/40 backdrop-blur-md rounded-xl shadow-sm border border-primary/10 opacity-60 hover:opacity-100 hover:bg-white hover:scale-105 hover:shadow-lg transition-all duration-300" title="Zoom In">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                </button>
                <div className="px-2 py-1 bg-white/40 backdrop-blur-md rounded-lg shadow-sm border border-primary/10 opacity-80 min-w-[3rem] text-center">
                    <span className="text-[10px] font-bold text-primary">{Math.round(transformRef.current.scale * 100)}%</span>
                </div>
                <button onClick={zoomOut} className="p-3 bg-white/40 backdrop-blur-md rounded-xl shadow-sm border border-primary/10 opacity-60 hover:opacity-100 hover:bg-white hover:scale-105 hover:shadow-lg transition-all duration-300" title="Zoom Out">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                </button>
                <button onClick={resetZoom} className="p-3 bg-white/40 backdrop-blur-md rounded-xl shadow-sm border border-primary/10 opacity-60 hover:opacity-100 hover:bg-white hover:scale-105 hover:shadow-lg transition-all duration-300" title="Reset View">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-white/30 backdrop-blur-md rounded-full shadow-sm border border-primary/10 opacity-40 hover:opacity-100 transition-all pointer-events-none">
                <p className="text-[10px] text-foreground/80 font-medium flex items-center gap-2 whitespace-nowrap">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Pinch to zoom • Drag to pan
                </p>
            </div>

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
                        transition: isInteracting ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                    }}
                >
                    <TreeNode
                        pet={pet}
                        role="self"
                        currentDepth={0}
                        maxDepth={maxDepth}
                        onPetClick={onPetClick}
                        isAdmin={isAdmin}
                        onUpdateDate={onUpdateDate}
                        onReportIssue={onReportIssue}
                    />
                </div>
            </div>
        </div>
    );
};

export default PedigreeTree;
