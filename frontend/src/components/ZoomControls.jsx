export default function ZoomControls({ camera, setCamera }) {
  return (
    <div className="absolute bottom-4 right-4 bg-white p-1.5 flex items-center gap-1.5 rounded-lg shadow-md border border-slate-200 z-10 select-none">
      <button
        onClick={() => {
          setCamera(prev => {
            const newZoom = Math.min(Math.max(prev.zoom - 0.1, 0.1), 8);
            return { ...prev, zoom: newZoom };
          });
        }}
        className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded text-slate-600 font-bold text-lg"
        title="Zoom Out"
      >
        -
      </button>
      <span 
        className="text-xs font-semibold text-slate-700 min-w-[45px] text-center cursor-pointer hover:bg-slate-100 py-1 rounded"
        onClick={() => setCamera(prev => ({ ...prev, x: 0, y: 0, zoom: 1 }))}
        title="Reset Zoom"
      >
        {Math.round(camera.zoom * 100)}%
      </span>
      <button
        onClick={() => {
          setCamera(prev => {
            const newZoom = Math.min(Math.max(prev.zoom + 0.1, 0.1), 8);
            return { ...prev, zoom: newZoom };
          });
        }}
        className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded text-slate-600 font-bold text-lg"
        title="Zoom In"
      >
        +
      </button>
    </div>
  );
}
