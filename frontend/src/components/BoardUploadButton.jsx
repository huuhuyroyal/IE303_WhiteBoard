import { useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { computeMediaPlacement, processBoardUpload } from '../features/boardUpload';

export default function BoardUploadButton({ boardId, token, camera, onAddMedia, disabled }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');
    setUploading(true);
    try {
      const items = await processBoardUpload(file, boardId, token);
      const placed = computeMediaPlacement(items, camera);
      onAddMedia?.(placed);
    } catch (err) {
      setError(err.message || 'Không thể tải file');
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp,application/pdf"
        onChange={handleChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || uploading}
        title="Thêm ảnh hoặc PDF"
        className="p-3 rounded-lg transition-all flex items-center text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
      >
        {uploading ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}
      </button>
      {error && (
        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap bg-red-50 text-red-600 text-xs px-2 py-1 rounded-md border border-red-100 shadow-sm z-50">
          {error}
        </div>
      )}
    </div>
  );
}
