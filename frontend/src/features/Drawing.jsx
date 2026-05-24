/* eslint-disable react-refresh/only-export-components */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { SHAPE_TOOLS, distanceToSegment, drawShapeElement, isPointInShapeElement, isShapeTool } from './Shape';

const BASE = 'http://localhost:5000';
const CURSORS = {
  pencil: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='%23ffffff' stroke='%231e1e1e' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z'/%3E%3C/svg%3E") 2 22, crosshair`,
  highlighter: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='%23ffffff' stroke='%231e1e1e' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m9 11-6 6v3h9l3-3'/%3E%3Cpath d='m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4'/%3E%3C/svg%3E") 2 22, crosshair`,
  eraser: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='%23ffffff' stroke='%231e1e1e' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21'/%3E%3Cpath d='M22 21H7'/%3E%3Cpath d='m5 11 9 9'/%3E%3C/svg%3E") 4 20, pointer`,
};

export function useDrawingFeature({
  boardId,
  authHeaders,
  socket,
  camera,
  tool,
  color,
  strokeWidth,
  onBoardChanged,
  onPencilStrokeComplete,
}) {
  const canvasRef = useRef(null);
  const elementsRef = useRef([]);
  const imageCacheRef = useRef(new Map());
  const currentPathRef = useRef([]);
  const linePreviewRef = useRef(null);
  const shapePreviewRef = useRef(null);
  const isPanningRef = useRef(false);
  const lastPanPointRef = useRef({ x: 0, y: 0 });
  const selectedElementIdRef = useRef(null);
  const isScalingRef = useRef(false);
  const isDraggingShapeRef = useRef(false);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const originalPointsRef = useRef(null);

  const [elements, setElements] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [canvasCursor, setCanvasCursor] = useState(null);
  const [previewVersion, setPreviewVersion] = useState(0);

  useEffect(() => {
    if (!boardId) return;

    fetch(`${BASE}/api/board/${boardId}/stroke`, { headers: authHeaders() })
      .then((res) => res.ok ? res.json() : [])
      .then((data) => {
        const next = Array.isArray(data)
          ? data.map((item) => normalizeElement(item, boardId))
          : [];
        setElements(next);
        elementsRef.current = next;
      })
      .catch((err) => console.error('Failed to fetch strokes:', err));
  }, [boardId, authHeaders]);

  useEffect(() => {
    if (!socket.connected || !socket.clientRef.current) return undefined;

    const client = socket.clientRef.current;
    const subscriptions = [
      client.subscribe('/topic/drawing', (message) => {
        const incoming = JSON.parse(message.body);
        if (incoming.boardId && incoming.boardId !== boardId) return;
        setElements((prev) => {
          const next = [...prev];
          const index = next.findIndex((item) => item.id === incoming.id);
          const element = normalizeElement(incoming, boardId);
          if (index === -1) next.push(element);
          else next[index] = element;
          elementsRef.current = next;
          return next;
        });
      }),
      client.subscribe('/topic/delete', (message) => {
        const payload = JSON.parse(message.body);
        if (payload.boardId && payload.boardId !== boardId) return;
        setElements((prev) => {
          const next = prev.filter((item) => item.id !== payload.id);
          elementsRef.current = next;
          return next;
        });
      }),
    ];

    return () => subscriptions.forEach((subscription) => subscription.unsubscribe());
  }, [boardId, socket.connected, socket.clientRef]);

  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

  const publish = (destination, payload) => {
    if (!socket.clientRef.current?.connected) return;
    socket.clientRef.current.publish({
      destination,
      body: JSON.stringify({ ...payload, boardId }),
    });
  };

  const getWorldPos = (clientX, clientY) => ({
    x: (clientX - camera.x) / camera.zoom,
    y: (clientY - camera.y) / camera.zoom,
  });

  const bumpPreview = () => setPreviewVersion((value) => value + 1);

  const findElementAtPoint = (x, y) => {
    const threshold = 15;

    for (let i = elementsRef.current.length - 1; i >= 0; i -= 1) {
      const element = elementsRef.current[i];

      if ((element.type === 'path' || element.type === 'highlight' || element.type === 'line') && element.points.length > 1) {
        for (let j = 0; j < element.points.length - 1; j += 1) {
          const dist = distanceToSegment(
            x,
            y,
            element.points[j].x,
            element.points[j].y,
            element.points[j + 1].x,
            element.points[j + 1].y,
          );
          if (dist < threshold) return element;
        }
      }

      if ((isShapeTool(element.type) || element.type === 'ai-svg') && isPointInShapeElement(x, y, element)) {
        return element;
      }
    }

    return null;
  };

  const saveStroke = (element, method = 'POST') => {
    const payload = {
      id: element.id,
      boardId,
      color: element.color,
      width: element.width,
      points: element.points,
      metadata: {
        ...(element.metadata || {}),
        type: element.type,
        tool: element.metadata?.tool || element.type,
      },
    };

    const path = method === 'POST'
      ? `${BASE}/api/board/${boardId}/stroke`
      : `${BASE}/api/board/${boardId}/stroke/${element.id}`;

    fetch(path, {
      method,
      headers: authHeaders(),
      body: JSON.stringify(payload),
    }).catch((err) => console.error('Failed to persist stroke:', err));

    publish('/app/draw', payload);
    onBoardChanged?.();
  };

  const deleteStroke = (id) => {
    setElements((prev) => {
      const next = prev.filter((item) => item.id !== id);
      elementsRef.current = next;
      return next;
    });

    fetch(`${BASE}/api/board/${boardId}/stroke/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }).catch((err) => console.error('Failed to delete stroke:', err));

    publish('/app/delete', { id });
    onBoardChanged?.();
  };

  const handlePointerDown = (event) => {
    if (tool !== 'select') {
      selectedElementIdRef.current = null;
      setSelectedElementId(null);
      setCanvasCursor(null);
    }

    if (tool === 'hand' || event.button === 1 || event.button === 2) {
      isPanningRef.current = true;
      lastPanPointRef.current = { x: event.clientX, y: event.clientY };
      return;
    }

    const { x, y } = getWorldPos(event.clientX, event.clientY);

    if (tool === 'select') {
      const target = findElementAtPoint(x, y);

      if (target && (isShapeTool(target.type) || target.type === 'ai-svg')) {
        const p1 = target.points[0];
        const p2 = target.points[target.points.length - 1];
        const xMax = Math.max(p1.x, p2.x);
        const yMax = Math.max(p1.y, p2.y);
        const handleSize = 8 / camera.zoom;

        isScalingRef.current = Math.hypot(x - xMax, y - yMax) < handleSize * 2;
        isDraggingShapeRef.current = !isScalingRef.current;
        selectedElementIdRef.current = target.id;
        dragStartPosRef.current = { x, y };
        originalPointsRef.current = JSON.parse(JSON.stringify(target.points));
        setSelectedElementId(target.id);
        bumpPreview();
      } else {
        selectedElementIdRef.current = null;
        setSelectedElementId(null);
        bumpPreview();
      }

      return;
    }

    if (tool === 'eraser') {
      const target = findElementAtPoint(x, y);
      if (target) deleteStroke(target.id);
      return;
    }

    if (tool === 'pencil' || tool === 'highlighter') {
      setIsDrawing(true);
      currentPathRef.current = [{ x, y }];
      bumpPreview();
      return;
    }

    if (tool === 'line') {
      setIsDrawing(true);
      linePreviewRef.current = { startX: x, startY: y, endX: x, endY: y };
      bumpPreview();
      return;
    }

    if (SHAPE_TOOLS.includes(tool)) {
      setIsDrawing(true);
      shapePreviewRef.current = { startX: x, startY: y, endX: x, endY: y };
      bumpPreview();
    }
  };

  const handlePointerMove = (event, setCamera) => {
    if (isPanningRef.current) {
      const dx = event.clientX - lastPanPointRef.current.x;
      const dy = event.clientY - lastPanPointRef.current.y;
      setCamera((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      lastPanPointRef.current = { x: event.clientX, y: event.clientY };
      return;
    }

    const { x, y } = getWorldPos(event.clientX, event.clientY);

    if (tool === 'select') {
      if (isScalingRef.current && selectedElementIdRef.current && originalPointsRef.current) {
        const dx = x - dragStartPosRef.current.x;
        const dy = y - dragStartPosRef.current.y;
        const p1 = originalPointsRef.current[0];
        const p2 = originalPointsRef.current[originalPointsRef.current.length - 1];
        let nextP1 = { ...p1 };
        let nextP2 = { ...p2 };

        if (p1.x >= p2.x) nextP1.x = p1.x + dx;
        else nextP2.x = p2.x + dx;

        if (p1.y >= p2.y) nextP1.y = p1.y + dy;
        else nextP2.y = p2.y + dy;

        setElements((prev) => {
          const next = prev.map((item) => item.id === selectedElementIdRef.current
            ? { ...item, points: [nextP1, nextP2] }
            : item);
          elementsRef.current = next;
          return next;
        });
        bumpPreview();
        return;
      }

      if (isDraggingShapeRef.current && selectedElementIdRef.current && originalPointsRef.current) {
        const dx = x - dragStartPosRef.current.x;
        const dy = y - dragStartPosRef.current.y;
        const movedPoints = originalPointsRef.current.map((point) => ({ x: point.x + dx, y: point.y + dy }));

        setElements((prev) => {
          const next = prev.map((item) => item.id === selectedElementIdRef.current
            ? { ...item, points: movedPoints }
            : item);
          elementsRef.current = next;
          return next;
        });
        bumpPreview();
        return;
      }

      setCanvasCursor(selectedElementIdRef.current ? 'move' : 'default');
      bumpPreview();
      return;
    }

    if (!isDrawing) return;

    if (tool === 'pencil' || tool === 'highlighter') {
      currentPathRef.current.push({ x, y });
      bumpPreview();
      return;
    }

    if (tool === 'line' && linePreviewRef.current) {
      linePreviewRef.current.endX = x;
      linePreviewRef.current.endY = y;
      bumpPreview();
      return;
    }

    if (isShapeTool(tool) && shapePreviewRef.current) {
      shapePreviewRef.current.endX = x;
      shapePreviewRef.current.endY = y;
      bumpPreview();
    }
  };

  const handlePointerUp = () => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      return;
    }

    if (tool === 'select') {
      const activeId = selectedElementIdRef.current;
      const changed = isScalingRef.current || isDraggingShapeRef.current;

      isScalingRef.current = false;
      isDraggingShapeRef.current = false;

      if (changed && activeId) {
        const element = elementsRef.current.find((item) => item.id === activeId);
        if (element) saveStroke(element, 'PUT');
      }
      bumpPreview();
      return;
    }

    if (!isDrawing) return;
    setIsDrawing(false);

    if ((tool === 'pencil' || tool === 'highlighter') && currentPathRef.current.length > 0) {
      const next = {
        id: crypto.randomUUID(),
        boardId,
        type: tool === 'highlighter' ? 'highlight' : 'path',
        points: [...currentPathRef.current],
        color,
        width: tool === 'highlighter' ? 20 : strokeWidth,
        metadata: {},
      };
      setElements((prev) => {
        const all = [...prev, next];
        elementsRef.current = all;
        return all;
      });
      currentPathRef.current = [];
      saveStroke(next, 'POST');
      if (tool === 'pencil') onPencilStrokeComplete?.(next);
      bumpPreview();
      return;
    }

    if (tool === 'line' && linePreviewRef.current) {
      const next = {
        id: crypto.randomUUID(),
        boardId,
        type: 'line',
        points: [
          { x: linePreviewRef.current.startX, y: linePreviewRef.current.startY },
          { x: linePreviewRef.current.endX, y: linePreviewRef.current.endY },
        ],
        color,
        width: strokeWidth,
        metadata: {},
      };
      setElements((prev) => {
        const all = [...prev, next];
        elementsRef.current = all;
        return all;
      });
      linePreviewRef.current = null;
      saveStroke(next, 'POST');
      bumpPreview();
      return;
    }

    if (isShapeTool(tool) && shapePreviewRef.current) {
      const next = {
        id: crypto.randomUUID(),
        boardId,
        type: tool,
        points: [
          { x: shapePreviewRef.current.startX, y: shapePreviewRef.current.startY },
          { x: shapePreviewRef.current.endX, y: shapePreviewRef.current.endY },
        ],
        color,
        width: strokeWidth,
        metadata: {},
      };
      setElements((prev) => {
        const all = [...prev, next];
        elementsRef.current = all;
        return all;
      });
      shapePreviewRef.current = null;
      saveStroke(next, 'POST');
      bumpPreview();
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);

    elements.forEach((element) => {
      ctx.globalAlpha = element.type === 'highlight' ? 0.35 : 1;
      ctx.lineWidth = element.width || 4;
      ctx.strokeStyle = element.color || '#1E1E1E';

      if (element.type === 'path' || element.type === 'highlight') {
        ctx.beginPath();
        element.points.forEach((point, index) => {
          if (index === 0) ctx.moveTo(point.x, point.y);
          else ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
      } else if (element.type === 'ai-svg') {
        drawSvgElement(ctx, element, imageCacheRef.current, bumpPreview);
      } else if (isShapeTool(element.type)) {
        drawShapeElement(ctx, element.type, element.points);
      }

      ctx.globalAlpha = 1;
    });

    if (tool === 'pencil' && currentPathRef.current.length > 0) {
      ctx.beginPath();
      ctx.lineWidth = strokeWidth;
      ctx.strokeStyle = color;
      currentPathRef.current.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    }

    if (tool === 'highlighter' && currentPathRef.current.length > 0) {
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.lineWidth = 20;
      ctx.strokeStyle = color;
      currentPathRef.current.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (tool === 'line' && linePreviewRef.current) {
      ctx.setLineDash([8, 4]);
      ctx.lineWidth = strokeWidth;
      ctx.strokeStyle = color;
      drawShapeElement(ctx, 'line', [
        { x: linePreviewRef.current.startX, y: linePreviewRef.current.startY },
        { x: linePreviewRef.current.endX, y: linePreviewRef.current.endY },
      ]);
      ctx.setLineDash([]);
    }

    if (isShapeTool(tool) && shapePreviewRef.current) {
      ctx.setLineDash([8, 4]);
      ctx.lineWidth = strokeWidth;
      ctx.strokeStyle = color;
      drawShapeElement(ctx, tool, [
        { x: shapePreviewRef.current.startX, y: shapePreviewRef.current.startY },
        { x: shapePreviewRef.current.endX, y: shapePreviewRef.current.endY },
      ]);
      ctx.setLineDash([]);
    }

    if (selectedElementId) {
      const selected = elements.find((item) => item.id === selectedElementId);
      if (selected && selected.points.length >= 2) {
        const [p1, p2] = selected.points;
        const xMin = Math.min(p1.x, p2.x);
        const yMin = Math.min(p1.y, p2.y);
        const xMax = Math.max(p1.x, p2.x);
        const yMax = Math.max(p1.y, p2.y);

        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1.5 / camera.zoom;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(xMin, yMin, xMax - xMin, yMax - yMin);
        ctx.setLineDash([]);
      }
    }

    ctx.restore();
  }, [camera, color, elements, previewVersion, selectedElementId, strokeWidth, tool]);

  const cursor = tool === 'hand'
    ? 'grab'
    : canvasCursor || (tool === 'note'
      ? 'cell'
      : tool === 'select'
        ? 'default'
        : isShapeTool(tool)
          ? 'crosshair'
          : CURSORS[tool] || 'crosshair');

  const removeElement = (id) => {
    setElements((prev) => {
      const next = prev.filter((item) => item.id !== id);
      elementsRef.current = next;
      return next;
    });
    fetch(`${BASE}/api/board/${boardId}/stroke/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }).catch(() => {});
  };

  const replaceElementWithSuggestion = (option, targetIds) => {
    const ids = Array.isArray(targetIds) ? targetIds : [targetIds];
    const matched = ids
      .map((id) => elementsRef.current.find((item) => item.id === id))
      .filter(Boolean);

    if (!matched.length) return;

    const anchor = matched[0];
    const allPoints = matched.flatMap((item) => item.points || []);
    if (!allPoints.length) return;

    const xs = allPoints.map((point) => point.x);
    const ys = allPoints.map((point) => point.y);
    const next = {
      ...anchor,
      type: 'ai-svg',
      color: '#1E1E1E',
      width: 1,
      points: [
        { x: Math.min(...xs), y: Math.min(...ys) },
        { x: Math.max(...xs), y: Math.max(...ys) },
      ],
      metadata: {
        type: 'ai-svg',
        tool: 'ai-svg',
        label: option.label,
        sampleId: option.sampleId,
        svgUrl: resolveSvgUrl(option.svgUrl),
        color: anchor.color,
      },
    };

    setElements((prev) => {
      const idSet = new Set(ids);
      const updated = prev
        .filter((item) => item.id === anchor.id || !idSet.has(item.id))
        .map((item) => item.id === anchor.id ? next : item);
      elementsRef.current = updated;
      return updated;
    });
    ids
      .filter((id) => id !== anchor.id)
      .forEach((id) => {
        fetch(`${BASE}/api/board/${boardId}/stroke/${id}`, {
          method: 'DELETE',
          headers: authHeaders(),
        }).catch(() => {});
        publish('/app/delete', { id });
      });
    selectedElementIdRef.current = anchor.id;
    setSelectedElementId(anchor.id);
    saveStroke(next, 'PUT');
    onBoardChanged?.();
    bumpPreview();
  };

  return {
    canvasRef,
    cursor,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    removeElement,
    replaceElementWithSuggestion,
  };
}

export default function Drawing({ canvasRef, cursor, onPointerDown, onPointerMove, onPointerUp }) {
  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full touch-none"
      style={{ cursor }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerOut={onPointerUp}
      onContextMenu={(event) => event.preventDefault()}
    />
  );
}

function normalizeElement(item, boardId) {
  return {
    id: item.id,
    boardId,
    type: item.metadata?.type || 'path',
    points: item.points,
    color: item.color,
    width: item.width,
    metadata: item.metadata || {},
  };
}

function resolveSvgUrl(svgUrl) {
  if (!svgUrl) return '';
  if (svgUrl.startsWith('http://') || svgUrl.startsWith('https://') || svgUrl.startsWith('data:')) {
    return svgUrl;
  }
  return `${BASE}${svgUrl.startsWith('/') ? '' : '/'}${svgUrl}`;
}

function drawSvgElement(ctx, element, imageCache, onLoad) {
  if (!element?.points || element.points.length < 2) return;

  const [p1, p2] = element.points;
  const x = Math.min(p1.x, p2.x);
  const y = Math.min(p1.y, p2.y);
  const width = Math.max(1, Math.abs(p2.x - p1.x));
  const height = Math.max(1, Math.abs(p2.y - p1.y));
  const svgUrl = resolveSvgUrl(element.metadata?.svgUrl || '');

  if (!svgUrl) return;

  const color = element.metadata?.color || '#000000';
  const cacheKey = `${svgUrl}-${color}`;

  let image = imageCache.get(cacheKey);
  if (!image) {
    image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => onLoad();
    image.onerror = () => onLoad();
    
    imageCache.set(cacheKey, image);

    fetch(svgUrl)
      .then(res => res.text())
      .then(text => {
        let processed = text.replace(/fill:\s*#fff(?:fff)?/gi, 'fill:none');
        processed = processed.replace(/fill=["']#fff(?:fff)?["']/gi, 'fill="none"');
        
        if (element.metadata?.color) {
          processed = processed.replace(/stroke:\s*#[0-9a-fA-F]+/gi, `stroke:${color}`);
          processed = processed.replace(/stroke=["']#[0-9a-fA-F]+["']/gi, `stroke="${color}"`);
        }
        
        const blob = new Blob([processed], { type: 'image/svg+xml' });
        image.src = URL.createObjectURL(blob);
      })
      .catch(err => {
        console.error("Failed to process SVG", err);
        image.src = svgUrl;
      });
  }

  if (image.complete && image.src && image.naturalWidth > 0) {
    ctx.drawImage(image, x, y, width, height);
    return;
  }

  ctx.save();
  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, width, height);
  ctx.setLineDash([]);
  ctx.fillStyle = '#64748b';
  ctx.font = '12px sans-serif';
  ctx.fillText(element.metadata?.label || 'Loading...', x + 8, y + 18);
  ctx.restore();
}
