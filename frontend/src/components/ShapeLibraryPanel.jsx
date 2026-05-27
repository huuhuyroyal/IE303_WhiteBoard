import { useState } from 'react';
import { X, Search } from 'lucide-react';

const SHAPE_CATEGORIES = [
  {
    name: 'Connectors',
    items: [
      { id: 'line', label: 'Line', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/></svg> },
      { id: 'arrow', label: 'Arrow', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg> }
    ]
  },
  {
    name: 'Basic',
    items: [
      { id: 'rectangle', label: 'Rectangle', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg> },
      { id: 'circle', label: 'Circle', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg> },
      { id: 'triangle', label: 'Triangle', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L22 20H2L12 2Z"/></svg> },
      { id: 'diamond', label: 'Diamond', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 22 12 12 22 2 12"/></svg> },
      { id: 'pentagon', label: 'Pentagon', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 22 9 18 21 6 21 2 9"/></svg> },
      { id: 'hexagon', label: 'Hexagon', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 22 7 22 17 12 22 2 17 2 7"/></svg> },
      { id: 'octagon', label: 'Octagon', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="7.7 2 16.3 2 22 7.7 22 16.3 16.3 22 7.7 22 2 16.3 2 7.7"/></svg> },
      { id: 'star', label: 'Star', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
      { id: 'parallelogram', label: 'Parallelogram', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="6 4 22 4 18 20 2 20"/></svg> },
      { id: 'cylinder', label: 'Cylinder', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/></svg> },
      { id: 'cloud', label: 'Cloud', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.5 19c2.5 0 4.5-2 4.5-4.5S20 10 17.5 10c-.3 0-.6 0-.8.1-.5-2.9-3-5.1-6.1-5.1-3.4 0-6.1 2.8-6.1 6.2 0 .4 0 .7.1 1.1-2 .3-3.6 2-3.6 4.2C1 19 3 21 5.5 21h12z"/></svg> },
      { id: 'speech_bubble', label: 'Speech Bubble', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg> }
    ]
  }
];

export default function ShapeLibraryPanel({ onClose, setTool, activeTool }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCategories = SHAPE_CATEGORIES.map(category => ({
    ...category,
    items: category.items.filter(item => 
      item.label.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.items.length > 0);

  return (
    <div className="fixed left-20 top-6 bottom-6 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col z-50 overflow-hidden animate-in slide-in-from-left-4 fade-in duration-200">
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-800">Shapes</h2>
        <button 
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-3 border-b border-slate-100">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search shapes" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 text-slate-700"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
        {filteredCategories.length > 0 ? (
          filteredCategories.map((category) => (
            <div key={category.name} className="mb-4">
              <h3 className="px-2 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {category.name}
              </h3>
              <div className="grid grid-cols-4 gap-1">
                {category.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setTool(item.id)}
                    title={item.label}
                    className={`p-3 rounded-lg flex items-center justify-center transition-all ${
                      activeTool === item.id 
                        ? 'bg-blue-100 text-blue-600 ring-1 ring-blue-500/50' 
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {item.icon}
                  </button>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="p-4 text-center text-sm text-slate-500">
            No shapes found matching "{searchTerm}"
          </div>
        )}
      </div>
    </div>
  );
}
