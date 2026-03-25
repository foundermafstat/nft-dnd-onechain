import { useDraggable } from '@dnd-kit/core';

interface DraggableItemProps {
    id: string;
    source: 'chat' | 'inventory';
    children?: React.ReactNode;
}

export default function DraggableItem({ id, source, children }: DraggableItemProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id,
        data: {
            type: 'item',
            source,
            itemId: id
        }
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 9999, // Ensure it floats above other elements
    } : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={`cursor-grab active:cursor-grabbing transition-opacity ${isDragging ? 'opacity-50' : 'opacity-100'} w-full h-full`}
        >
            {/* If children are passed (e.g. from inventory grid), render them. Otherwise, render default chat loot pill */}
            {children ? children : (
                <div className="inline-flex items-center gap-2 bg-amber-900/40 border border-amber-700/50 text-amber-200 px-3 py-1.5 rounded-full text-xs font-serif font-bold shadow-md hover:bg-amber-800/60 transition-colors pointer-events-auto">
                    Loot: <span className="text-white">Drag to Inventory</span>
                </div>
            )}
        </div>
    );
}
