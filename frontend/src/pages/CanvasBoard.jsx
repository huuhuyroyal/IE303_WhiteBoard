import { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { Download } from 'lucide-react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client/dist/sockjs';
import Toolbar from '../components/Toolbar';
import StickyNote from '../components/StickyNote';

// Custom SVG cursors (data URI)
const CURSORS = {
  pencil: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='%23ffffff' stroke='%231e1e1e' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z'/%3E%3C/svg%3E") 2 22, crosshair`,
  highlighter: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='%23ffffff' stroke='%231e1e1e' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m9 11-6 6v3h9l3-3'/%3E%3Cpath d='m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4'/%3E%3C/svg%3E") 2 22, crosshair`,
  eraser: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='%23ffffff' stroke='%231e1e1e' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21'/%3E%3Cpath d='M22 21H7'/%3E%3Cpath d='m5 11 9 9'/%3E%3C/svg%3E") 4 20, pointer`,
};

export default function CanvasBoard({ boardName }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('pencil');
  const [color, setColor] = useState('#1E1E1E');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [elements, setElements] = useState([]);
  const [notes, setNotes] = useState([]);
  const currentPath = useRef([]);
  const linePreview = useRef(null);
  const shapePreview = useRef(null); // { startX, startY, endX, endY }
  const stompClientRef = useRef(null);

  // Camera state cho bảng vô tận
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const isPanningRef = useRef(false);
  const lastPanPoint = useRef({ x: 0, y: 0 });

  // Convert screen coordinates to world (canvas) coordinates
  const getPos = (clientX, clientY) => {
    return {
      x: (clientX - camera.x) / camera.zoom,
      y: (clientY - camera.y) / camera.zoom
    };
  };

  // Vẽ 1 shape lên canvas dựa vào type và bounding box
  const SHAPE_TOOLS = ['rectangle', 'circle', 'triangle', 'diamond'];

  const drawShape = (ctx, type, x1, y1, x2, y2) => {
    const x = Math.min(x1, x2), y = Math.min(y1, y2);
    const w = Math.abs(x2 - x1), h = Math.abs(y2 - y1);
    ctx.beginPath();
    if (type === 'rectangle') {
      ctx.rect(x, y, w, h);
    } else if (type === 'circle') {
      const cx = x + w / 2, cy = y + h / 2;
      const rx = w / 2, ry = h / 2;
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    } else if (type === 'triangle') {
      ctx.moveTo(x + w / 2, y);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.closePath();
    } else if (type === 'diamond') {
      ctx.moveTo(x + w / 2, y);
      ctx.lineTo(x + w, y + h / 2);
      ctx.lineTo(x + w / 2, y + h);
      ctx.lineTo(x, y + h / 2);
      ctx.closePath();
    }
    ctx.stroke();
  };

  // Fetch drawings from Database
  useEffect(() => {
    fetch('http://localhost:5000/api/drawings')
      .then(res => res.json())
      .then(data => {
        const loadedElements = data.map(item => ({
          id: item.id,
          type: item.metadata?.type || 'path',
          points: item.points,
          color: item.color,
          width: item.width
        }));
        setElements(loadedElements);
      })
      .catch(err => console.error('Error fetching drawings:', err));

    // Fetch notes from Database
    fetch('http://localhost:5000/api/notes')
      .then(res => res.json())
      .then(data => setNotes(data))
      .catch(err => console.error('Error fetching notes:', err));
  }, []);

  // WebSocket Connection
  useEffect(() => {
    const socket = new SockJS('http://localhost:5000/ws');
    const client = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      onConnect: () => {
        // console.log('Connected to WebSocket');
        client.subscribe('/topic/drawing', (message) => {
          const incomingStroke = JSON.parse(message.body);
          
          setElements(prev => {
            if (!prev.some(el => el.id === incomingStroke.id)) {
               const el = {
                 id: incomingStroke.id,
                 type: incomingStroke.metadata?.type || 'path',
                 points: incomingStroke.points,
                 color: incomingStroke.color,
                 width: incomingStroke.width
               };
               return [...prev, el];
            }
            return prev;
          });
        });

        // Lắng nghe sự kiện xóa stroke
        client.subscribe('/topic/delete', (message) => {
          const deletedId = JSON.parse(message.body).id;
          setElements(prev => prev.filter(el => el.id !== deletedId));
        });

        // Lắng nghe sự kiện note từ người dùng khác
        client.subscribe('/topic/note/create', (message) => {
          const note = JSON.parse(message.body);
          setNotes(prev => prev.some(n => n.id === note.id) ? prev : [...prev, note]);
        });
        client.subscribe('/topic/note/update', (message) => {
          const updated = JSON.parse(message.body);
          setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
        });
        client.subscribe('/topic/note/delete', (message) => {
          const deletedId = JSON.parse(message.body).id;
          setNotes(prev => prev.filter(n => n.id !== deletedId));
        });
      },
      onStompError: (frame) => {
        console.error('Broker reported error: ' + frame.headers['message']);
        console.error('Additional details: ' + frame.body);
      },
    });

    client.activate();
    stompClientRef.current = client;

    return () => {
      client.deactivate();
    };
  }, []);

  // Use refs to bypass stale closures in the resize event listener
  const elementsRef = useRef(elements);
  const isDrawingRef = useRef(isDrawing);
  const toolRef = useRef(tool);

  // A standalone function to redraw everything from current refs
  const forceRedraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);

    // Draw all stored elements from REF (always fresh)
    elementsRef.current.forEach(element => {
      ctx.globalAlpha = 1;
      if (element.type === 'path') {
        ctx.beginPath();
        ctx.lineWidth = element.width || 4;
        ctx.strokeStyle = element.color || '#000000';
        element.points.forEach((point, index) => {
          if (index === 0) ctx.moveTo(point.x, point.y);
          else ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
      } else if (element.type === 'highlight') {
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.lineWidth = element.width || 20;
        ctx.strokeStyle = element.color || '#FCC419';
        element.points.forEach((point, index) => {
          if (index === 0) ctx.moveTo(point.x, point.y);
          else ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (element.type === 'line') {
        ctx.beginPath();
        ctx.lineWidth = element.width || 4;
        ctx.strokeStyle = element.color || '#000000';
        ctx.moveTo(element.points[0].x, element.points[0].y);
        ctx.lineTo(element.points[1].x, element.points[1].y);
        ctx.stroke();
      } else if (['rectangle', 'circle', 'triangle', 'diamond'].includes(element.type)) {
        ctx.lineWidth = element.width || 4;
        ctx.strokeStyle = element.color || '#000000';
        drawShape(ctx, element.type, element.points[0].x, element.points[0].y, element.points[1].x, element.points[1].y);
      }
    });

    // Draw current active path (pencil preview)
    if (isDrawingRef.current && toolRef.current === 'pencil' && currentPath.current.length > 0) {
      ctx.beginPath();
      ctx.lineWidth = 4;
      ctx.strokeStyle = color;
      currentPath.current.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    }

    // Draw highlighter preview
    if (isDrawingRef.current && toolRef.current === 'highlighter' && currentPath.current.length > 0) {
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.lineWidth = 20;
      ctx.strokeStyle = color;
      currentPath.current.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Draw line preview (while dragging)
    if (isDrawingRef.current && toolRef.current === 'line' && linePreview.current) {
      const lp = linePreview.current;
      ctx.beginPath();
      ctx.lineWidth = 4;
      ctx.strokeStyle = color;
      ctx.setLineDash([8, 4]);
      ctx.moveTo(lp.startX, lp.startY);
      ctx.lineTo(lp.endX, lp.endY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw shape preview (while dragging)
    if (isDrawingRef.current && SHAPE_TOOLS.includes(toolRef.current) && shapePreview.current) {
      const sp = shapePreview.current;
      ctx.lineWidth = strokeWidth;
      ctx.strokeStyle = color;
      ctx.setLineDash([8, 4]);
      drawShape(ctx, toolRef.current, sp.startX, sp.startY, sp.endX, sp.endY);
      ctx.setLineDash([]);
    }

    ctx.restore();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      forceRedraw(); 
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    return () => window.removeEventListener('resize', resizeCanvas);
  }, []); // Empty dependency! Will use refs for fresh state.

  // React component render loop redraw
  useLayoutEffect(() => {
    // Đảm bảo Refs luôn chứa dữ liệu mới nhất (Synchronous) trước khi vẽ
    elementsRef.current = elements;
    isDrawingRef.current = isDrawing;
    toolRef.current = tool;

    forceRedraw();
  }, [elements, isDrawing, tool, camera]);

  // Tính khoảng cách từ 1 điểm tới 1 đoạn thẳng (dùng cho Eraser)
  const distanceToSegment = (px, py, x1, y1, x2, y2) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
  };

  // Tìm nét vẽ gần nhất với con trỏ chuột (trong bán kính 15px)
  const findStrokeAtPoint = (x, y) => {
    const THRESHOLD = 15;
    for (let i = elementsRef.current.length - 1; i >= 0; i--) {
      const el = elementsRef.current[i];
      if ((el.type === 'path' || el.type === 'line' || el.type === 'highlight') && el.points.length > 1) {
        for (let j = 0; j < el.points.length - 1; j++) {
          const dist = distanceToSegment(x, y, el.points[j].x, el.points[j].y, el.points[j+1].x, el.points[j+1].y);
          if (dist < THRESHOLD) return el;
        }
      }
      // Detect shape clicks (check if near edges of bounding box)
      if (['rectangle', 'circle', 'triangle', 'diamond'].includes(el.type) && el.points.length === 2) {
        const [p1, p2] = el.points;
        const sx = Math.min(p1.x, p2.x), sy = Math.min(p1.y, p2.y);
        const sw = Math.abs(p2.x - p1.x), sh = Math.abs(p2.y - p1.y);
        // Check if point is near the bounding box edges
        const nearLeft = Math.abs(x - sx) < THRESHOLD && y >= sy - THRESHOLD && y <= sy + sh + THRESHOLD;
        const nearRight = Math.abs(x - (sx + sw)) < THRESHOLD && y >= sy - THRESHOLD && y <= sy + sh + THRESHOLD;
        const nearTop = Math.abs(y - sy) < THRESHOLD && x >= sx - THRESHOLD && x <= sx + sw + THRESHOLD;
        const nearBottom = Math.abs(y - (sy + sh)) < THRESHOLD && x >= sx - THRESHOLD && x <= sx + sw + THRESHOLD;
        if (nearLeft || nearRight || nearTop || nearBottom) return el;
      }
    }
    return null;
  };

  const handlePointerDown = (e) => {
    // === PAN TOOL ===
    if (tool === 'hand' || e.button === 1 || e.button === 2) { // Middle or Right click to pan
      isPanningRef.current = true;
      lastPanPoint.current = { x: e.clientX, y: e.clientY };
      return;
    }

    const { x: worldX, y: worldY } = getPos(e.clientX, e.clientY);

    // === ERASER TOOL ===
    if (tool === 'eraser') {
      const target = findStrokeAtPoint(worldX, worldY);
      if (target) {
        setElements(prev => prev.filter(el => el.id !== target.id));
        fetch(`http://localhost:5000/api/drawings/${target.id}`, {
          method: 'DELETE'
        }).catch(err => console.error('Lỗi xóa:', err));
        if (stompClientRef.current && stompClientRef.current.connected) {
          stompClientRef.current.publish({
            destination: '/app/delete',
            body: JSON.stringify({ id: target.id })
          });
        }
      }
      return;
    }

    // === NOTE TOOL ===
    if (tool === 'note') {
      const newNote = {
        id: crypto.randomUUID(),
        x: worldX - 100,
        y: worldY - 60,
        text: '',
        colorIndex: 0,
        width: 200
      };
      setNotes(prev => [...prev, newNote]);

      // Lưu vào Database
      fetch('http://localhost:5000/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNote)
      }).catch(err => console.error('Lỗi lưu note:', err));

      // Phát sóng real-time
      if (stompClientRef.current && stompClientRef.current.connected) {
        stompClientRef.current.publish({
          destination: '/app/note/create',
          body: JSON.stringify(newNote)
        });
      }

      setTool('select');
      return;
    }

    // === LINE TOOL ===
    if (tool === 'line') {
      setIsDrawing(true);
      isDrawingRef.current = true;
      linePreview.current = {
        startX: worldX, startY: worldY,
        endX: worldX, endY: worldY
      };
      return;
    }

    // === SHAPE TOOLS (rectangle, circle, triangle, diamond) ===
    if (SHAPE_TOOLS.includes(tool)) {
      setIsDrawing(true);
      isDrawingRef.current = true;
      shapePreview.current = {
        startX: worldX, startY: worldY,
        endX: worldX, endY: worldY
      };
      return;
    }

    // === PENCIL / HIGHLIGHTER TOOL ===
    if (tool !== 'pencil' && tool !== 'highlighter') return;
    setIsDrawing(true);
    isDrawingRef.current = true;
    currentPath.current = [{ x: worldX, y: worldY }];
    forceRedraw();
  };

  const handlePointerMove = (e) => {
    if (isPanningRef.current) {
      const dx = e.clientX - lastPanPoint.current.x;
      const dy = e.clientY - lastPanPoint.current.y;
      setCamera(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      lastPanPoint.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (!isDrawingRef.current) return;
    
    const { x: worldX, y: worldY } = getPos(e.clientX, e.clientY);

    if (tool === 'line' && linePreview.current) {
      linePreview.current.endX = worldX;
      linePreview.current.endY = worldY;
      forceRedraw();
      return;
    }

    if (SHAPE_TOOLS.includes(tool) && shapePreview.current) {
      shapePreview.current.endX = worldX;
      shapePreview.current.endY = worldY;
      forceRedraw();
      return;
    }

    if (tool === 'pencil' || tool === 'highlighter') {
      currentPath.current.push({ x: worldX, y: worldY });
      forceRedraw(); 
    }
  };

  const handlePointerUp = () => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      return;
    }

    if (!isDrawing) return;
    setIsDrawing(false);

    // === LINE TOOL: Finalize ===
    if (tool === 'line' && linePreview.current) {
      const lp = linePreview.current;
      const strokeId = crypto.randomUUID();
      const linePoints = [
        { x: lp.startX, y: lp.startY },
        { x: lp.endX, y: lp.endY }
      ];

      setElements(prev => [...prev, {
        id: strokeId, type: 'line', points: linePoints, color, width: strokeWidth
      }]);

      const payload = {
        id: strokeId, color, width: strokeWidth,
        points: linePoints,
        metadata: { type: 'line', tool: 'line' }
      };
      fetch('http://localhost:5000/api/drawings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(err => console.error('Lỗi lưu line:', err));

      if (stompClientRef.current && stompClientRef.current.connected) {
        stompClientRef.current.publish({ destination: '/app/draw', body: JSON.stringify(payload) });
      }

      linePreview.current = null;
      return;
    }

    // === SHAPE TOOLS: Finalize ===
    if (SHAPE_TOOLS.includes(tool) && shapePreview.current) {
      const sp = shapePreview.current;
      const strokeId = crypto.randomUUID();
      const shapePoints = [
        { x: sp.startX, y: sp.startY },
        { x: sp.endX, y: sp.endY }
      ];

      setElements(prev => [...prev, {
        id: strokeId, type: tool, points: shapePoints, color, width: strokeWidth
      }]);

      const payload = {
        id: strokeId, color, width: strokeWidth,
        points: shapePoints,
        metadata: { type: tool, tool }
      };
      fetch('http://localhost:5000/api/drawings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(err => console.error('Lỗi lưu shape:', err));

      if (stompClientRef.current && stompClientRef.current.connected) {
        stompClientRef.current.publish({ destination: '/app/draw', body: JSON.stringify(payload) });
      }

      shapePreview.current = null;
      return;
    }
    
    // === PENCIL / HIGHLIGHTER TOOL: Finalize ===
    if ((tool === 'pencil' || tool === 'highlighter') && currentPath.current.length > 0) {
      const pointsToSave = [...currentPath.current];
      const strokeId = crypto.randomUUID();
      const strokeType = tool === 'highlighter' ? 'highlight' : 'path';
      const strokeW = tool === 'highlighter' ? 20 : strokeWidth;

      const newStroke = { 
        id: strokeId, type: strokeType, points: pointsToSave, color, width: strokeW
      };
      setElements(prev => [...prev, newStroke]);

      const backendPayload = {
        id: strokeId, color, width: strokeW,
        points: pointsToSave,
        metadata: { type: strokeType, tool }
      };

      fetch('http://localhost:5000/api/drawings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backendPayload)
      }).catch(err => console.error('Lỗi lưu nét vẽ:', err));

      if (stompClientRef.current && stompClientRef.current.connected) {
        stompClientRef.current.publish({ destination: '/app/draw', body: JSON.stringify(backendPayload) });
      }

      currentPath.current = [];
    }
  };

  // === Note Handlers (DB + WebSocket) ===
  const handleNoteUpdate = (updated) => {
    setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));

    fetch(`http://localhost:5000/api/notes/${updated.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    }).catch(err => console.error('Lỗi cập nhật note:', err));

    if (stompClientRef.current && stompClientRef.current.connected) {
      stompClientRef.current.publish({
        destination: '/app/note/update',
        body: JSON.stringify(updated)
      });
    }
  };

  const handleNoteDelete = (id) => {
    setNotes(prev => prev.filter(n => n.id !== id));

    fetch(`http://localhost:5000/api/notes/${id}`, {
      method: 'DELETE'
    }).catch(err => console.error('Lỗi xóa note:', err));

    if (stompClientRef.current && stompClientRef.current.connected) {
      stompClientRef.current.publish({
        destination: '/app/note/delete',
        body: JSON.stringify({ id })
      });
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    if (e.ctrlKey) {
      // Zooming
      const zoomSensitivity = 0.002;
      const zoomFactor = Math.exp(-e.deltaY * zoomSensitivity);
      setCamera(prev => {
        const newZoom = Math.min(Math.max(prev.zoom * zoomFactor, 0.1), 5); // Max zoom in 5x, out 0.1x
        // Keep mouse point fixed
        const newX = e.clientX - (e.clientX - prev.x) * (newZoom / prev.zoom);
        const newY = e.clientY - (e.clientY - prev.y) * (newZoom / prev.zoom);
        return { x: newX, y: newY, zoom: newZoom };
      });
    } else {
      // Panning (trackpad)
      setCamera(prev => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
        zoom: prev.zoom
      }));
    }
  };

  useEffect(() => {
    // Add non-passive wheel listener for zooming to prevent browser scroll
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel, { passive: false });
      return () => canvas.removeEventListener('wheel', handleWheel);
    }
  }, []);

  return (
    <div className="h-screen w-screen bg-slate-50 relative overflow-hidden flex items-center justify-center">
      {/* Toolbar Component */}
      <Toolbar
        tool={tool} setTool={setTool}
        color={color} setColor={setColor}
        strokeWidth={strokeWidth} setStrokeWidth={setStrokeWidth}
      />

      {/* Top Navbar details */}
      <div className="absolute top-4 left-4 bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200 flex items-center gap-4 z-10">
         <h1 className="font-bold text-slate-800">{boardName || "Untitled Board"}</h1>
      </div>
      
      {/* Export / Users info Top Right */}
      <div className="absolute top-4 right-4 bg-white p-2 flex items-center gap-2 rounded-lg shadow-sm border border-slate-200 z-10">
         <button className="flex items-center gap-2 hover:bg-slate-100 px-3 py-1.5 rounded-md text-sm font-medium text-slate-600 transition-colors">
            <Download size={16} />
            Export
         </button>
         <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors border border-blue-700 shadow-sm">
            Share
         </button>
      </div>

      {/* Sticky Notes Layer */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
          transformOrigin: '0 0'
        }}
      >
        {notes.map(note => (
          <div key={note.id} className="pointer-events-auto">
            <StickyNote
              note={note}
              onUpdate={handleNoteUpdate}
              onDelete={handleNoteDelete}
              cameraZoom={camera.zoom}
            />
          </div>
        ))}
      </div>

      {/* The actual canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full touch-none"
        style={{
          cursor: isPanningRef.current || tool === 'hand' ? 'grab' : CURSORS[tool] || (
            ['line','rectangle','circle','triangle','diamond'].includes(tool) ? 'crosshair'
            : tool === 'note' ? 'cell'
            : 'default'
          )
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerOut={handlePointerUp}
        onContextMenu={(e) => e.preventDefault()} // Ngăn menu chuột phải khi pan
      />
    </div>
  );
}
