import { useState } from 'react';
import {
  Pencil, Square, Circle, Triangle, MousePointer2,
  Eraser, Minus, StickyNote, Diamond,
  Highlighter, Palette, Hand
} from 'lucide-react';

const PRESET_COLORS = [
  '#1E1E1E', '#E03131', '#E8590C', '#FCC419',
  '#40C057', '#15AABF', '#228BE6', '#7950F2',
  '#BE4BDB', '#FFFFFF'
];

function ToolButton({ icon, active, onClick, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-3 rounded-lg transition-all flex items-center ${
        active
          ? 'bg-blue-100 text-blue-600 shadow-inner'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
      }`}
    >
      {icon}
    </button>
  );
}

// Submenu popup with tool items + inline color/size picker
function SubmenuPanel({ items, activeTool, onSelect, onClose, color, setColor, strokeWidth, setStrokeWidth }) {
  return (
    <div className="fixed left-16 top-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl border border-slate-200 p-3 z-50 min-w-[220px]">      {/* Tool options */}
      <div className="flex flex-col gap-1 mb-2">
        {items.map(item => (
          <button
            key={item.tool}
            onClick={() => onSelect(item.tool)}
            title={item.title}
            className={`p-2 rounded-lg transition-all flex items-center gap-2 ${
              activeTool === item.tool
                ? 'bg-blue-100 text-blue-600'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            {item.icon}
            <span className="text-xs font-medium whitespace-nowrap">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="w-full h-px bg-slate-200 my-2"></div>

      {/* Inline Color Picker */}
      <div className="grid grid-cols-5 gap-1.5 mb-2">
        {PRESET_COLORS.map(c => (
          <button
            key={c}
            onClick={() => setColor(c)}
            title={c}
            className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${
              color === c ? 'border-blue-500 scale-110 shadow-md' : 'border-slate-300'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      {/* Custom color + hex */}
      <div className="flex items-center gap-2 mb-2">
        <input
          type="color"
          value={color}
          onChange={e => setColor(e.target.value)}
          className="w-6 h-6 rounded cursor-pointer border-0 p-0"
          title="Custom Color"
        />
        <span className="text-[10px] font-mono text-slate-400 uppercase">{color}</span>
      </div>

      <div className="w-full h-px bg-slate-200 my-2"></div>

      {/* Stroke Width */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-slate-400">Size</span>
        <input
          type="range"
          min="1" max="20"
          value={strokeWidth}
          onChange={e => setStrokeWidth(Number(e.target.value))}
          className="flex-1 h-1 accent-blue-500"
        />
        <span className="text-[10px] font-mono text-slate-500 w-4 text-right">{strokeWidth}</span>
      </div>
    </div>
  );
}

const PEN_ITEMS = [
  { tool: 'pencil', icon: <Pencil size={18} />, label: 'Pencil', title: 'Pencil (P)' },
  { tool: 'highlighter', icon: <Highlighter size={18} />, label: 'Highlighter', title: 'Highlighter (H)' },
];

const SHAPE_ITEMS = [
  { tool: 'line', icon: <Minus size={18} />, label: 'Line', title: 'Line (L)' },
  { tool: 'rectangle', icon: <Square size={18} />, label: 'Rectangle', title: 'Rectangle (R)' },
  { tool: 'circle', icon: <Circle size={18} />, label: 'Circle', title: 'Circle (C)' },
  { tool: 'triangle', icon: <Triangle size={18} />, label: 'Triangle', title: 'Triangle (T)' },
  { tool: 'diamond', icon: <Diamond size={18} />, label: 'Diamond', title: 'Diamond (D)' },
];

export default function Toolbar({ tool, setTool, color, setColor, strokeWidth, setStrokeWidth }) {
  const [openSubmenu, setOpenSubmenu] = useState(null);

  const toggleSubmenu = (menu) => {
    setOpenSubmenu(prev => prev === menu ? null : menu);
  };

  const currentPenIcon = PEN_ITEMS.find(i => i.tool === tool)?.icon || <Pencil size={20} />;
  const currentShapeIcon = SHAPE_ITEMS.find(i => i.tool === tool)?.icon || <Square size={20} />;

  const isPenTool = PEN_ITEMS.some(i => i.tool === tool);
  const isShapeTool = SHAPE_ITEMS.some(i => i.tool === tool);

  return (
    <>
      {openSubmenu && (
        <div className="fixed inset-0 z-30" onClick={() => setOpenSubmenu(null)} />
      )}

      <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-white p-2 rounded-xl shadow-xl flex flex-col gap-2 z-40 border border-slate-200">
        <ToolButton
          icon={<MousePointer2 size={20} />}
          active={tool === 'select'}
          onClick={() => { setTool('select'); setOpenSubmenu(null); }}
          title="Select (V)"
        />
        <ToolButton
          icon={<Hand size={20} />}
          active={tool === 'hand'}
          onClick={() => { setTool('hand'); setOpenSubmenu(null); }}
          title="Pan (H)"
        />
        <div className="w-full h-px bg-slate-200 my-1"></div>

        {/* Pen Group */}
        <div className="relative">
          <ToolButton
            icon={currentPenIcon}
            active={isPenTool}
            onClick={() => { if (!isPenTool) setTool('pencil'); toggleSubmenu('pen'); }}
            title="Pen tools"
          />
          {openSubmenu === 'pen' && (
            <SubmenuPanel
              items={PEN_ITEMS}
              activeTool={tool}
              onSelect={setTool}
              onClose={() => setOpenSubmenu(null)}
              color={color} setColor={setColor}
              strokeWidth={strokeWidth} setStrokeWidth={setStrokeWidth}
            />
          )}
        </div>

        <ToolButton
          icon={<Eraser size={20} />}
          active={tool === 'eraser'}
          onClick={() => { setTool('eraser'); setOpenSubmenu(null); }}
          title="Eraser (E)"
        />
        <div className="w-full h-px bg-slate-200 my-1"></div>

        {/* Shape Group */}
        <div className="relative">
          <ToolButton
            icon={currentShapeIcon}
            active={isShapeTool}
            onClick={() => { if (!isShapeTool) setTool('rectangle'); toggleSubmenu('shape'); }}
            title="Shape tools"
          />
          {openSubmenu === 'shape' && (
            <SubmenuPanel
              items={SHAPE_ITEMS}
              activeTool={tool}
              onSelect={setTool}
              onClose={() => setOpenSubmenu(null)}
              color={color} setColor={setColor}
              strokeWidth={strokeWidth} setStrokeWidth={setStrokeWidth}
            />
          )}
        </div>
        <div className="w-full h-px bg-slate-200 my-1"></div>

        <ToolButton
          icon={<StickyNote size={20} />}
          active={tool === 'note'}
          onClick={() => { setTool('note'); setOpenSubmenu(null); }}
          title="Sticky Note (N)"
        />
      </div>
    </>
  );
}
