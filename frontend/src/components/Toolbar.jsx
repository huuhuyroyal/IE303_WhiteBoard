import { useState } from 'react';
import {
  Pencil, Square, Circle, Triangle, MousePointer2,
  Eraser, Minus, StickyNote, Diamond,
  Highlighter, Hand, ArrowRight, Star, Hexagon
} from 'lucide-react';
import ColorPicker from './ColorPicker';
import BoardUploadButton from './BoardUploadButton';

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

function SubmenuPanel({ items, activeTool, onSelect, color, setColor, strokeWidth, setStrokeWidth, onMoreShapes }) {
  return (
    <div className="fixed left-16 top-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl border border-slate-200 p-3 z-50 min-w-[220px]">
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

      <ColorPicker
        color={color}
        setColor={setColor}
        strokeWidth={strokeWidth}
        setStrokeWidth={setStrokeWidth}
      />

      {onMoreShapes && (
        <>
          <div className="w-full h-px bg-slate-200 my-2"></div>
          <button
            onClick={onMoreShapes}
            className="w-full flex items-center justify-center gap-2 p-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <span>More shapes...</span>
          </button>
        </>
      )}
    </div>
  );
}

const PEN_ITEMS = [
  { tool: 'pencil', icon: <Pencil size={18} />, label: 'Pencil', title: 'Pencil (P)' },
  { tool: 'highlighter', icon: <Highlighter size={18} />, label: 'Highlighter', title: 'Highlighter (H)' },
];

const SHAPE_ITEMS = [
  { tool: 'line', icon: <Minus size={18} />, label: 'Line', title: 'Line (L)' },
  { tool: 'arrow', icon: <ArrowRight size={18} />, label: 'Arrow', title: 'Arrow (A)' },
  { tool: 'rectangle', icon: <Square size={18} />, label: 'Rectangle', title: 'Rectangle (R)' },
  { tool: 'circle', icon: <Circle size={18} />, label: 'Circle', title: 'Circle (C)' },
  { tool: 'triangle', icon: <Triangle size={18} />, label: 'Triangle', title: 'Triangle (T)' },
  { tool: 'diamond', icon: <Diamond size={18} />, label: 'Diamond', title: 'Diamond (D)' },
  { tool: 'star', icon: <Star size={18} />, label: 'Star', title: 'Star (S)' },
  { tool: 'hexagon', icon: <Hexagon size={18} />, label: 'Hexagon', title: 'Hexagon (X)' },
];

export default function Toolbar({
  tool,
  setTool,
  color,
  setColor,
  strokeWidth,
  setStrokeWidth,
  onOpenShapeLibrary,
  boardId,
  token,
  camera,
  onAddMedia,
  readOnly = false,
}) {
  const [openSubmenu, setOpenSubmenu] = useState(null);

  const toggleSubmenu = (menu) => {
    setOpenSubmenu(prev => prev === menu ? null : menu);
  };

  const currentPenIcon = PEN_ITEMS.find(i => i.tool === tool)?.icon || <Pencil size={20} />;
  const currentShapeIcon = SHAPE_ITEMS.find(i => i.tool === tool)?.icon || <Square size={20} />;

  const isPenTool = PEN_ITEMS.some(i => i.tool === tool);
  const isShapeToolActive = SHAPE_ITEMS.some(i => i.tool === tool);

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
              color={color}
              setColor={setColor}
              strokeWidth={strokeWidth}
              setStrokeWidth={setStrokeWidth}
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

        <div className="relative">
          <ToolButton
            icon={currentShapeIcon}
            active={isShapeToolActive}
            onClick={() => { if (!isShapeToolActive) setTool('rectangle'); toggleSubmenu('shape'); }}
            title="Shape tools"
          />
          {openSubmenu === 'shape' && (
            <SubmenuPanel
              items={SHAPE_ITEMS}
              activeTool={tool}
              onSelect={setTool}
              color={color}
              setColor={setColor}
              strokeWidth={strokeWidth}
              setStrokeWidth={setStrokeWidth}
              onMoreShapes={() => {
                setOpenSubmenu(null);
                onOpenShapeLibrary?.();
              }}
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
        {!readOnly && boardId && onAddMedia && (
          <>
            <div className="w-full h-px bg-slate-200 my-1"></div>
            <BoardUploadButton
              boardId={boardId}
              token={token}
              camera={camera}
              onAddMedia={onAddMedia}
            />
          </>
        )}
      </div>
    </>
  );
}
