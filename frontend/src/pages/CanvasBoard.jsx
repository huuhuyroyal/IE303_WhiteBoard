import { useRef, useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import { Trash2, Copy } from "lucide-react";

import Toolbar from "../components/Toolbar";
import EditPanel from "../components/EditPanel";
import ShareModal from "../components/ShareModal";
import ZoomControls from "../components/ZoomControls";
import BoardTopBar from "../components/BoardTopBar";
import ShapeLibraryPanel from "../components/ShapeLibraryPanel";

import useBoardSocket from "../hooks/useBoardSocket";
import useBoardData from "../hooks/useBoardData";
import useCamera from "../hooks/useCamera";
import Drawing, { useDrawingFeature } from "../features/Drawing";
import Note, { useNoteFeature } from "../features/Note";
import AISuggestionBar, { useAISuggestion } from "../features/AISuggestion";
import BoardTimer from "../features/BoardTimer";
import AiChatPanel from "../components/AiChatPanel";

export default function CanvasBoard({ boardName }) {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = user?.token || "";
  const [tool, setTool] = useState("pencil");
  const [color, setColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [boardTitle, setBoardTitle] = useState(boardName || "Untitled Board");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedElement, setSelectedElement] = useState(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [isShapeLibraryOpen, setIsShapeLibraryOpen] = useState(false);
  const [copiedElementIds, setCopiedElementIds] = useState(null);

  const [otherCursors, setOtherCursors] = useState({});
  const lastPublishRef = useRef(0);

  const authHeaders = useCallback(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token],
  );

  const socket = useBoardSocket();
  const { clientRef, connected } = socket;
  const scheduleThumbnailSaveRef = useRef(null);

  const { scheduleThumbnailSave, updateTitle, handleExport, submitShare, userRole } =
    useBoardData({
      boardId,
      boardTitle,
      authHeaders,
      setBoardTitle,
      navigate,
      user,
    });

  useEffect(() => {
    scheduleThumbnailSaveRef.current = scheduleThumbnailSave;
  }, [scheduleThumbnailSave]);

  const aiSuggestion = useAISuggestion({ boardId, authHeaders });
  const isAISuggestionVisible =
    aiSuggestion.loading || Boolean(aiSuggestion.suggestion?.options?.length);
  const floatingTopClass = isAISuggestionVisible ? "top-16" : "top-4";

  const drawing = useDrawingFeature({
    boardId,
    authHeaders,
    socket,
    camera,
    tool,
    color,
    strokeWidth,
    onBoardChanged: () => scheduleThumbnailSaveRef.current?.(),
    onPencilStrokeComplete: (element) => aiSuggestion.submitStroke(element),
    onToolChange: setTool,
    onElementSelected: (element) => {
      setSelectedElement(element);
      if (element && element.color) setColor(element.color);
    },
    onInteractionStart: () => setIsInteracting(true),
    onInteractionEnd: () => setIsInteracting(false),
  });

  const note = useNoteFeature({
    boardId,
    authHeaders,
    socket,
    onBoardChanged: () => scheduleThumbnailSaveRef.current?.(),
  });

  const { attachWheelListener } = useCamera(drawing.canvasRef, setCamera);
  useEffect(() => attachWheelListener(), [attachWheelListener]);

  const handleGroup = useCallback(() => {
    if (selectedElement && selectedElement.type === 'group' && selectedElement.selectedIds.length > 1) {
      const newGroupId = crypto.randomUUID();
      selectedElement.selectedIds.forEach(uid => {
        const el = drawing.canvasRef.current; // just getting a reference to drawing isn't enough to get element metadata, but updateElement merges
        drawing.updateElement(uid, { metadata: { groupId: newGroupId } });
      });
      setSelectedElement(prev => ({
         ...prev,
         metadata: { ...(prev?.metadata || {}), groupId: newGroupId }
      }));
    }
  }, [selectedElement, drawing]);

  const handleUngroup = useCallback(() => {
    if (selectedElement && selectedElement.type === 'group' && selectedElement.metadata?.groupId) {
      selectedElement.selectedIds.forEach(uid => {
        drawing.updateElement(uid, { metadata: { groupId: null } });
      });
      setSelectedElement(prev => ({
         ...prev,
         metadata: { ...(prev?.metadata || {}), groupId: null }
      }));
    }
  }, [selectedElement, drawing]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.ctrlKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        if (e.shiftKey) {
          handleUngroup();
        } else {
          handleGroup();
        }
      }

      if (e.ctrlKey && e.key.toLowerCase() === 'c') {
        if (selectedElement) {
          e.preventDefault();
          setCopiedElementIds(selectedElement.selectedIds || [selectedElement.id]);
        }
      }

      if (e.ctrlKey && e.key.toLowerCase() === 'v') {
        if (copiedElementIds && copiedElementIds.length > 0) {
          e.preventDefault();
          drawing.duplicateElements(copiedElementIds);
        }
      }

      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (selectedElement) {
          e.preventDefault();
          if (selectedElement.type === 'group' || selectedElement.selectedIds) {
            selectedElement.selectedIds.forEach(uid => drawing.removeElement(uid));
          } else {
            drawing.removeElement(selectedElement.id);
          }
          setSelectedElement(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleGroup, handleUngroup, selectedElement, copiedElementIds, drawing]);

  const wrappedPointerDown = (event) => {
    if (userRole === "VIEWER") {
      // Allow panning with middle/right button
      if (event.button === 1 || event.button === 2) {
        drawing.handlePointerDown(event, setCamera);
      }
      return;
    }
    if (tool === "note") {
      const x = (event.clientX - camera.x) / camera.zoom;
      const y = (event.clientY - camera.y) / camera.zoom;
      note.createNote(x, y);
      setTool("select");
      return;
    }
    drawing.handlePointerDown(event, setCamera);
  };

  const wrappedPointerMove = (event) => {
    drawing.handlePointerMove(event, setCamera);
    
    if (connected && clientRef.current) {
      const now = Date.now();
      if (now - lastPublishRef.current > 50) { // 50ms throttle
        const x = (event.clientX - camera.x) / camera.zoom;
        const y = (event.clientY - camera.y) / camera.zoom;
        clientRef.current.publish({
          destination: `/app/board/${boardId}/cursor`,
          body: JSON.stringify({ username: user?.username, x, y })
        });
        lastPublishRef.current = now;
      }
    }
  };

  const handleTitleUpdate = () => {
    setIsEditingTitle(false);
    updateTitle(boardTitle);
  };

  const handleBack = () => navigate("/");

  // When user picks an AI suggestion: replace the triggering sketch with the chosen SVG.
  const handleAISelect = (option, triggerElementIds) => {
    if (triggerElementIds?.length)
      drawing.replaceElementWithSuggestion(option, triggerElementIds);
    aiSuggestion.clearSuggestion(true);
  };
  useEffect(() => {
  if (connected && clientRef.current) {
    // Lắng nghe sự kiện di chuột từ người khác
    const cursorSub = clientRef.current.subscribe(`/topic/board/${boardId}/cursor`, (message) => {
      const data = JSON.parse(message.body);
      
      // Bỏ qua nếu nhận lại chính con trỏ của mình
      if (data.username === user?.username) return;
      // Cập nhật toạ độ của người dùng đó vào state
      setOtherCursors((prev) => ({
        ...prev,
        [data.username]: { x: data.x, y: data.y }
      }));
    });
    return () => {
      cursorSub.unsubscribe();
    };
  }
}, [connected, boardId, user?.username]);
  

  return (
    <div className="h-screen w-screen bg-slate-50 relative overflow-hidden flex items-center justify-center">
      <AISuggestionBar
        suggestion={aiSuggestion.suggestion}
        loading={aiSuggestion.loading}
        onSelect={handleAISelect}
        onClose={() => aiSuggestion.clearSuggestion(true)}
      />
      {userRole !== "VIEWER" && (
        <Toolbar
          tool={tool}
          setTool={setTool}
          color={color}
          setColor={setColor}
          strokeWidth={strokeWidth}
          setStrokeWidth={setStrokeWidth}
          onOpenShapeLibrary={() => setIsShapeLibraryOpen(true)}
          boardId={boardId}
          token={token}
          camera={camera}
          onAddMedia={drawing.addMediaElements}
        />
      )}
      {isShapeLibraryOpen && (
        <ShapeLibraryPanel
          activeTool={tool}
          setTool={setTool}
          onClose={() => setIsShapeLibraryOpen(false)}
        />
      )}


      <BoardTopBar
        boardTitle={boardTitle}
        setBoardTitle={setBoardTitle}
        isEditingTitle={isEditingTitle}
        setIsEditingTitle={setIsEditingTitle}
        handleBack={handleBack}
        handleTitleUpdate={handleTitleUpdate}
        className={floatingTopClass}
        readOnly={userRole === "VIEWER"}
      />

      <div
        className={`absolute right-4 z-10 flex items-start gap-3 transition-all ${floatingTopClass}`}
      >
        <BoardTimer boardId={boardId} />

        <div className="bg-white p-2 flex items-center gap-2 rounded-lg shadow-sm border border-slate-200">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 hover:bg-slate-100 px-3 py-1.5 rounded-md text-sm font-medium text-slate-600 transition-colors"
          >
            Export
          </button>
          {userRole !== "VIEWER" && (
            <button
              onClick={() => setShowShareModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors border border-blue-700 shadow-sm"
            >
              Share
            </button>
          )}
        </div>
      </div>

      <div
        id="board-container"
        className="absolute inset-0 overflow-hidden bg-slate-50"
        style={{
          backgroundImage: `radial-gradient(#cbd5e1 ${1.5 * camera.zoom}px, transparent ${1.5 * camera.zoom}px)`,
          backgroundSize: `${20 * camera.zoom}px ${20 * camera.zoom}px`,
          backgroundPosition: `${camera.x}px ${camera.y}px`,
        }}
      >
        <Note
          notes={note.notes}
          camera={camera}
          updateNote={note.updateNote}
          deleteNote={note.deleteNote}
          readOnly={userRole === "VIEWER"}
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

      {selectedElement && selectedElement.points && selectedElement.points.length > 0 && tool === 'select' && (
        <div
          className="absolute z-20 pointer-events-none"
          style={{
            left: `${((Math.min(selectedElement.points[0].x, selectedElement.points[selectedElement.points.length - 1].x) + Math.max(selectedElement.points[0].x, selectedElement.points[selectedElement.points.length - 1].x)) / 2) * camera.zoom + camera.x}px`,
            top: `${Math.min(selectedElement.points[0].y, selectedElement.points[selectedElement.points.length - 1].y) * camera.zoom + camera.y - 24}px`,
          }}
        >
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
            <div
              className={`pointer-events-auto transition-all duration-200 ease-out origin-bottom ${
                isInteracting ? 'opacity-0 scale-95 translate-y-2 pointer-events-none' : 'opacity-100 scale-100 translate-y-0'
              }`}
            >
              <EditPanel
                element={selectedElement}
                onUpdate={(id, updates) => {
                  if (id === 'group') {
                    selectedElement.selectedIds.forEach(uid => drawing.updateElement(uid, updates));
                    setSelectedElement(prev => ({
                      ...prev,
                      ...updates,
                      metadata: { ...(prev.metadata || {}), ...(updates.metadata || {}) }
                    }));
                  } else {
                    drawing.updateElement(id, updates);
                  }
                }}
                onDuplicate={() => {
                  drawing.duplicateElements(selectedElement.selectedIds || [selectedElement.id]);
                }}
                onDelete={(id) => {
                  if (id === 'group') {
                    selectedElement.selectedIds.forEach(uid => drawing.removeElement(uid));
                  } else {
                    drawing.removeElement(id);
                  }
                  setSelectedElement(null);
                }}
                onGroup={handleGroup}
                onUngroup={handleUngroup}
              />
            </div>
          </div>
        </div>
      )}

      <ZoomControls camera={camera} setCamera={setCamera} />
      <div 
        className="absolute inset-0 pointer-events-none z-50"
        style={{
          transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
          transformOrigin: '0 0'
        }}
      >
        {Object.entries(otherCursors).map(([username, pos]) => (
          <div 
            key={username}
            className="absolute flex items-center gap-1 transition-all duration-100 ease-linear"
            style={{ left: pos.x, top: pos.y }}
          >
            {/* Icon con trỏ chuột */}
            <svg width="18" height="24" viewBox="0 0 18 24" fill="none">
              <path d="M2.5 2.5L16.5 9.5L9.5 12.5L13.5 21.5L9.5 23.5L5.5 14.5L1.5 17.5V2.5Z" fill="#3B82F6" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
            {/* Nhãn tên người dùng */}
            <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded shadow">
              {username}
            </span>
          </div>
        ))}
      </div>
      
      <AiChatPanel boardId={boardId} authHeaders={authHeaders} />
    </div>
    
  );
}
