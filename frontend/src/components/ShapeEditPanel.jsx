import { useState } from 'react';
import { 
  Square, Circle, Triangle, Diamond, Minus, ArrowRight, Star, Hexagon,
  ChevronDown, Trash2, Copy, Menu, Ban, SquareDashed, PaintBucket, 
  Minus as SolidLine, Ellipsis as DashedLine, Layers
} from 'lucide-react';

const SHAPES = [
  { type: 'rectangle', icon: <Square size={16} /> },
  { type: 'circle', icon: <Circle size={16} /> },
  { type: 'triangle', icon: <Triangle size={16} /> },
  { type: 'diamond', icon: <Diamond size={16} /> },
  { type: 'line', icon: <Minus size={16} /> },
  { type: 'arrow', icon: <ArrowRight size={16} /> },
  { type: 'star', icon: <Star size={16} /> },
  { type: 'hexagon', icon: <Hexagon size={16} /> },
];

const COLORS = [
  '#1e1e1e', '#64748b', '#ef4444', '#f97316', '#eab308', 
  '#22c55e', '#14b8a6', '#3b82f6', '#6366f1', '#d946ef', 
  '#ffffff', '#9ca3af', '#fca5a5', '#fdba74', '#fde047', 
  '#86efac', '#6ee7b7', '#93c5fd', '#c4b5fd', '#f0abfc'
];

export default function ShapeEditPanel({ element, onUpdate, onDuplicate, onDelete, onGroup, onUngroup }) {
  const [activeMenu, setActiveMenu] = useState(null); // 'shape', 'fill', 'stroke', 'options'

  if (!element || (!SHAPES.find(s => s.type === element.type) && element.type !== 'ai-svg' && element.type !== 'group')) {
    return null;
  }

  const currentShapeIcon = element.type === 'group' ? <Copy size={16} /> : (SHAPES.find(s => s.type === element.type)?.icon || <Square size={16} />);
  const strokeStyle = element.metadata?.strokeStyle || 'solid';
  const strokeColor = element.metadata?.strokeColor || '#000000';

  const toggleMenu = (menu) => {
    setActiveMenu(prev => prev === menu ? null : menu);
  };

  const updateMetadata = (updates) => {
    onUpdate(element.id, { metadata: { ...(element.metadata || {}), ...updates } });
  };

  return (
    <div className="relative">
      {/* Shape Menu */}
      {activeMenu === 'shape' && (
        <div className="absolute bottom-full mb-3 left-0 bg-[#1e1e1e] border border-slate-700 p-2 rounded-xl shadow-2xl z-50 w-64">
          <div className="grid grid-cols-5 gap-1">
            {SHAPES.map(s => (
              <button
                key={s.type}
                className={`p-2 rounded-lg flex items-center justify-center transition-colors ${
                  element.type === s.type ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'
                }`}
                onClick={() => {
                  onUpdate(element.id, { type: s.type });
                  setActiveMenu(null);
                }}
              >
                {s.icon}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fill Menu */}
      {activeMenu === 'fill' && (
        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-[#1e1e1e] border border-slate-700 p-3 rounded-xl shadow-2xl z-50 w-[340px]">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => onUpdate(element.id, { color: '#f97316' })}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                element.color !== 'transparent' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <PaintBucket size={14} /> Fill
            </button>
            <button
              onClick={() => onUpdate(element.id, { color: 'transparent' })}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                element.color === 'transparent' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <SquareDashed size={14} /> Transparent
            </button>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {COLORS.map(c => (
              <button
                key={c}
                className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                  element.color === c ? 'border-blue-500 shadow-[0_0_0_2px_#3b82f6]' : 'border-transparent'
                }`}
                style={{ backgroundColor: c, border: c === '#ffffff' ? '2px solid #e5e7eb' : undefined }}
                onClick={() => onUpdate(element.id, { color: c })}
              />
            ))}
            <div className="relative w-8 h-8 rounded-full overflow-hidden transition-transform hover:scale-110 shadow-inner"
                 style={{ background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }}>
              <input
                type="color"
                className="absolute inset-[-10px] w-[50px] h-[50px] opacity-0 cursor-pointer"
                value={element.color === 'transparent' ? '#ffffff' : element.color}
                onChange={(e) => onUpdate(element.id, { color: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}

      {/* Stroke Menu */}
      {activeMenu === 'stroke' && (
        <div className="absolute bottom-full mb-3 right-0 bg-[#1e1e1e] border border-slate-700 p-3 rounded-xl shadow-2xl z-50 w-[340px]">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => updateMetadata({ strokeStyle: 'solid' })}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                strokeStyle === 'solid' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <SolidLine size={14} /> Solid
            </button>
            <button
              onClick={() => updateMetadata({ strokeStyle: 'dashed' })}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                strokeStyle === 'dashed' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <DashedLine size={14} /> Dashed
            </button>
            <button
              onClick={() => updateMetadata({ strokeStyle: 'none' })}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                strokeStyle === 'none' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Ban size={14} /> None
            </button>
          </div>
          {strokeStyle !== 'none' && (
            <div className="grid grid-cols-7 gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                    strokeColor === c ? 'border-blue-500 shadow-[0_0_0_2px_#3b82f6]' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c, border: c === '#ffffff' ? '2px solid #e5e7eb' : undefined }}
                  onClick={() => updateMetadata({ strokeColor: c })}
                />
              ))}
              <div className="relative w-8 h-8 rounded-full overflow-hidden transition-transform hover:scale-110 shadow-inner"
                   style={{ background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }}>
                <input
                  type="color"
                  className="absolute inset-[-10px] w-[50px] h-[50px] opacity-0 cursor-pointer"
                  value={strokeColor}
                  onChange={(e) => updateMetadata({ strokeColor: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Options Menu */}
      {activeMenu === 'options' && (
        <div className="absolute bottom-full mb-3 right-0 bg-[#1e1e1e] border border-slate-700 p-1 rounded-xl shadow-2xl z-50 flex flex-col min-w-[120px]">
          <button
            onClick={() => { onDuplicate(element.id); setActiveMenu(null); }}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-colors"
          >
            <Copy size={14} /> Duplicate
          </button>
          <button
            onClick={() => { onDelete(element.id); setActiveMenu(null); }}
            className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-lg transition-colors"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}

      {/* Main Pill Bar */}
      <div className="bg-[#1e1e1e] text-white p-1 rounded-xl flex items-center shadow-lg border border-slate-700 select-none">
        
        {element.type === 'group' ? (
          <>
            {element.metadata?.groupId ? (
              <button 
                onClick={onUngroup}
                className="flex items-center gap-2 px-3 py-2 text-blue-300 bg-blue-900/40 hover:bg-blue-800/60 rounded-lg transition-colors"
                title="Ungroup (Ctrl+Shift+G)"
              >
                <Layers size={16} className="text-blue-400" />
                <span className="text-sm font-medium pr-1">Ungroup</span>
              </button>
            ) : (
              <button 
                onClick={onGroup}
                className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
                title="Group Selection (Ctrl+G)"
              >
                <Layers size={16} className="text-slate-400" />
                <span className="text-sm font-medium pr-1">Group</span>
              </button>
            )}
            <div className="w-px h-6 bg-slate-700 mx-1"></div>
          </>
        ) : (
          <>
            {/* Shape Button */}
            <button
              onClick={() => toggleMenu('shape')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${
                activeMenu === 'shape' ? 'bg-slate-700' : 'hover:bg-slate-800'
              }`}
            >
              <div className="text-slate-300">{currentShapeIcon}</div>
              <ChevronDown size={14} className="text-slate-500" />
            </button>
            <div className="w-px h-6 bg-slate-700 mx-1"></div>
          </>
        )}

        {/* Fill Color Button */}
        <button
          onClick={() => toggleMenu('fill')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${
            activeMenu === 'fill' ? 'bg-slate-700' : 'hover:bg-slate-800'
          }`}
        >
          <div 
            className="w-4 h-4 rounded-full border border-slate-500 relative overflow-hidden" 
            style={{ backgroundColor: element.color === 'transparent' ? '#1e1e1e' : element.color }} 
          >
            {element.color === 'transparent' && (
              <div className="absolute inset-0 bg-transparent flex items-center justify-center">
                <div className="w-full h-px bg-red-500 rotate-45"></div>
              </div>
            )}
          </div>
          <ChevronDown size={14} className="text-slate-500" />
        </button>

        <div className="w-px h-6 bg-slate-700 mx-1"></div>

        {/* Stroke Style Button */}
        <button
          onClick={() => toggleMenu('stroke')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${
            activeMenu === 'stroke' ? 'bg-slate-700' : 'hover:bg-slate-800'
          }`}
        >
          {strokeStyle === 'solid' ? <SolidLine size={16} className="text-slate-300" /> : 
           strokeStyle === 'dashed' ? <DashedLine size={16} className="text-slate-300" /> : 
           <Ban size={16} className="text-slate-300" />}
          <ChevronDown size={14} className="text-slate-500" />
        </button>

        <div className="w-px h-6 bg-slate-700 mx-1"></div>

        {/* Options Button */}
        <button
          onClick={() => toggleMenu('options')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${
            activeMenu === 'options' ? 'bg-slate-700' : 'hover:bg-slate-800'
          }`}
        >
          <Menu size={16} className="text-slate-300" />
          <ChevronDown size={14} className="text-slate-500" />
        </button>
      </div>

      {/* Click outside overlay */}
      {activeMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setActiveMenu(null)} 
        />
      )}
    </div>
  );
}
