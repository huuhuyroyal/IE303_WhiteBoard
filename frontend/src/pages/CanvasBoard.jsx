import { useRef, useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import Toolbar from '../components/Toolbar';
import ShareModal from '../components/ShareModal';
import ZoomControls from '../components/ZoomControls';
import BoardTopBar from '../components/BoardTopBar';

import useBoardSocket from '../hooks/useBoardSocket';
import useBoardData from '../hooks/useBoardData';
import useCamera from '../hooks/useCamera';
import Drawing, { useDrawingFeature } from '../features/Drawing';
import Note, { useNoteFeature } from '../features/Note';

export default function CanvasBoard({ boardName }) {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = user?.token || '';
  const [tool, setTool] = useState('pencil');
  const [color, setColor] = useState('#1E1E1E');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [boardTitle, setBoardTitle] = useState(boardName || 'Untitled Board');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  const socket = useBoardSocket();
  const scheduleThumbnailSaveRef = useRef(null);

  const { scheduleThumbnailSave, updateTitle, handleExport, submitShare } = useBoardData({
    boardId,
    boardTitle,
    authHeaders,
    setBoardTitle,
  });

  useEffect(() => {
    scheduleThumbnailSaveRef.current = scheduleThumbnailSave;
  }, [scheduleThumbnailSave]);

  const drawing = useDrawingFeature({
    boardId,
    authHeaders,
    socket,
    camera,
    tool,
    color,
    strokeWidth,
    onBoardChanged: () => scheduleThumbnailSaveRef.current?.(),
  });

  const note = useNoteFeature({
    boardId,
    authHeaders,
    socket,
    onBoardChanged: () => scheduleThumbnailSaveRef.current?.(),
  });

  const { attachWheelListener } = useCamera(drawing.canvasRef, setCamera);
  useEffect(() => attachWheelListener(), [attachWheelListener]);

  const wrappedPointerDown = (event) => {
    if (tool === 'note') {
      const x = (event.clientX - camera.x) / camera.zoom;
      const y = (event.clientY - camera.y) / camera.zoom;
      note.createNote(x, y);
      setTool('select');
      return;
    }
    drawing.handlePointerDown(event, setCamera);
  };

  const wrappedPointerMove = (event) => drawing.handlePointerMove(event, setCamera);

  const handleTitleUpdate = () => {
    setIsEditingTitle(false);
    updateTitle(boardTitle);
  };

  const handleBack = () => navigate('/');

  return (
    <div className="h-screen w-screen bg-slate-50 relative overflow-hidden flex items-center justify-center">
      <Toolbar
        tool={tool}
        setTool={setTool}
        color={color}
        setColor={setColor}
        strokeWidth={strokeWidth}
        setStrokeWidth={setStrokeWidth}
      />

      <BoardTopBar
        boardTitle={boardTitle}
        setBoardTitle={setBoardTitle}
        isEditingTitle={isEditingTitle}
        setIsEditingTitle={setIsEditingTitle}
        handleBack={handleBack}
        handleTitleUpdate={handleTitleUpdate}
      />

      <div className="absolute top-4 right-4 bg-white p-2 flex items-center gap-2 rounded-lg shadow-sm border border-slate-200 z-10">
        <button
          onClick={handleExport}
          className="flex items-center gap-2 hover:bg-slate-100 px-3 py-1.5 rounded-md text-sm font-medium text-slate-600 transition-colors"
        >
          Export
        </button>
        <button
          onClick={() => setShowShareModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors border border-blue-700 shadow-sm"
        >
          Share
        </button>
      </div>

      <div id="board-container" className="absolute inset-0 overflow-hidden bg-slate-50">
        <Note
          notes={note.notes}
          camera={camera}
          updateNote={note.updateNote}
          deleteNote={note.deleteNote}
        />

        <Drawing
          canvasRef={drawing.canvasRef}
          cursor={drawing.cursor}
          onPointerDown={wrappedPointerDown}
          onPointerMove={wrappedPointerMove}
          onPointerUp={drawing.handlePointerUp}
        />
      </div>

      {showShareModal && (
        <ShareModal
          boardId={boardId}
          boardName={boardTitle}
          onCancel={() => setShowShareModal(false)}
          onConfirm={submitShare}
        />
      )}

      <ZoomControls camera={camera} setCamera={setCamera} />
    </div>
  );
}
