import { useState, useRef, useEffect } from 'react';
import { X, GripVertical } from 'lucide-react';

const NOTE_COLORS = [
  { bg: 'bg-yellow-100', border: 'border-yellow-300', header: 'bg-yellow-200' },
  { bg: 'bg-blue-100', border: 'border-blue-300', header: 'bg-blue-200' },
  { bg: 'bg-green-100', border: 'border-green-300', header: 'bg-green-200' },
  { bg: 'bg-pink-100', border: 'border-pink-300', header: 'bg-pink-200' },
  { bg: 'bg-purple-100', border: 'border-purple-300', header: 'bg-purple-200' },
];

export default function StickyNote({ note, onUpdate, onDelete, cameraZoom = 1 }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(note.text === '');
  const dragOffset = useRef({ x: 0, y: 0 });
  const textareaRef = useRef(null);
  const colorTheme = NOTE_COLORS[note.colorIndex || 0];

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const handleDragStart = (e) => {
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX / cameraZoom - note.x,
      y: e.clientY / cameraZoom - note.y
    };
    e.preventDefault();
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e) => {
      onUpdate({
        ...note,
        x: e.clientX / cameraZoom - dragOffset.current.x,
        y: e.clientY / cameraZoom - dragOffset.current.y
      });
    };

    const handleUp = () => setIsDragging(false);

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [isDragging]);

  const cycleColor = () => {
    onUpdate({
      ...note,
      colorIndex: ((note.colorIndex || 0) + 1) % NOTE_COLORS.length
    });
  };

  return (
    <div
      className={`absolute ${colorTheme.bg} ${colorTheme.border} border-2 rounded-lg shadow-lg z-20 select-none`}
      style={{
        left: note.x,
        top: note.y,
        width: note.width || 200,
        minHeight: 120,
      }}
    >
      {/* Header */}
      <div
        className={`${colorTheme.header} rounded-t-md px-2 py-1.5 flex items-center justify-between cursor-grab active:cursor-grabbing`}
        onPointerDown={handleDragStart}
      >
        <div className="flex items-center gap-1">
          <GripVertical size={14} className="text-slate-400" />
          <button
            onClick={cycleColor}
            title="Change color"
            className="w-4 h-4 rounded-full border border-slate-400 hover:scale-125 transition-transform"
            style={{ backgroundColor: ['#fef08a','#93c5fd','#86efac','#f9a8d4','#c4b5fd'][note.colorIndex || 0] }}
          />
        </div>
        <button
          onClick={() => onDelete(note.id)}
          className="text-slate-400 hover:text-red-500 transition-colors p-0.5 rounded hover:bg-white/50"
          title="Delete note"
        >
          <X size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="p-2" onDoubleClick={() => setIsEditing(true)}>
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={note.text}
            onChange={e => onUpdate({ ...note, text: e.target.value })}
            onBlur={() => setIsEditing(false)}
            className="w-full bg-transparent resize-none outline-none text-sm text-slate-700 min-h-[80px]"
            placeholder="Type your note here..."
          />
        ) : (
          <p className="text-sm text-slate-700 whitespace-pre-wrap min-h-[80px] cursor-text">
            {note.text || 'Double-click to edit...'}
          </p>
        )}
      </div>
    </div>
  );
}
