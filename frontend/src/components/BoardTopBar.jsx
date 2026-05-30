import { ArrowLeft } from 'lucide-react';
import { useRef } from 'react';

export default function BoardTopBar({
  boardTitle,
  setBoardTitle,
  isEditingTitle,
  setIsEditingTitle,
  handleBack,
  handleTitleUpdate,
  className = '',
  readOnly = false,
}) {
  const titleInputRef = useRef(null);

  return (
    <div className={`absolute left-4 bg-white px-3 py-2 rounded-lg shadow-sm border border-slate-200 flex items-center gap-3 z-10 transition-all ${className}`}>
      <button
        onClick={handleBack}
        className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-md hover:bg-slate-100"
        title="Back to Dashboard"
      >
        <ArrowLeft size={16} />
      </button>
      <div className="w-px h-4 bg-slate-200" />
      {isEditingTitle ? (
        <input
          ref={titleInputRef}
          autoFocus
          value={boardTitle}
          onChange={e => setBoardTitle(e.target.value)}
          onBlur={handleTitleUpdate}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === 'Escape') e.target.blur();
          }}
          className="font-bold text-slate-800 text-sm bg-blue-50 border border-blue-300 rounded px-2 py-0.5 outline-none w-48"
        />
      ) : (
        <h1
          className={`font-bold text-slate-800 text-sm ${readOnly ? '' : 'cursor-pointer hover:text-blue-600 transition-colors'}`}
          title={readOnly ? '' : 'Click to rename'}
          onClick={() => { if (!readOnly) setIsEditingTitle(true); }}
        >
          {boardTitle}
        </h1>
      )}
    </div>
  );
}
