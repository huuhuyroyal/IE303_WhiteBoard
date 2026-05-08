import { Palette } from 'lucide-react';

const PRESET_COLORS = [
  '#1E1E1E', '#E03131', '#E8590C', '#FCC419',
  '#40C057', '#15AABF', '#228BE6', '#7950F2',
  '#BE4BDB', '#FFFFFF'
];

export default function ColorPicker({ color, setColor, strokeWidth, setStrokeWidth }) {
  return (
    <div className="absolute left-20 top-1/2 -translate-y-1/2 bg-white p-3 rounded-xl shadow-xl z-10 border border-slate-200 flex flex-col gap-3">
      {/* Preset Colors */}
      <div className="grid grid-cols-5 gap-1.5">
        {PRESET_COLORS.map(c => (
          <button
            key={c}
            onClick={() => setColor(c)}
            title={c}
            className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${
              color === c ? 'border-blue-500 scale-110 shadow-md' : 'border-slate-300'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="w-full h-px bg-slate-200"></div>

      {/* Custom Color Picker */}
      <div className="flex items-center gap-2">
        <Palette size={16} className="text-slate-400" />
        <input
          type="color"
          value={color}
          onChange={e => setColor(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border-0 p-0"
          title="Custom Color"
        />
        <span className="text-xs font-mono text-slate-500 uppercase">{color}</span>
      </div>
      <div className="w-full h-px bg-slate-200"></div>

      {/* Stroke Width */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">Size</span>
        <input
          type="range"
          min="1" max="20"
          value={strokeWidth}
          onChange={e => setStrokeWidth(Number(e.target.value))}
          className="flex-1 h-1 accent-blue-500"
        />
        <span className="text-xs font-mono text-slate-500 w-5 text-right">{strokeWidth}</span>
      </div>
    </div>
  );
}
