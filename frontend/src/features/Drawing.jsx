/* eslint-disable react-refresh/only-export-components */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { SHAPE_TOOLS, drawShapeElement, isPointInShapeElement, isShapeTool, getClosestPointOnShapePerimeter, getShapeAnchors, distanceToSegment } from './Shape';

const BASE = 'http://localhost:5000';
const MEDIA_ELEMENT_TYPES = ['ai-svg', 'image', 'pdf-page'];

function isMediaElement(type) {
  return MEDIA_ELEMENT_TYPES.includes(type);
}

function sortElementsForRender(elements) {
  return [...elements].sort((a, b) => {
    const aBg = a.metadata?.isBackground ? 0 : 1;
    const bBg = b.metadata?.isBackground ? 0 : 1;
    if (aBg !== bBg) return aBg - bBg;
    return (a.metadata?.zIndex ?? 0) - (b.metadata?.zIndex ?? 0);
  });
}

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
  onToolChange,
  onElementSelected,
  onInteractionStart,
  onInteractionEnd,
}) {
  const canvasRef = useRef(null);
  const elementsRef = useRef([]);
  const imageCacheRef = useRef(new Map());
  const currentPathRef = useRef([]);
  const linePreviewRef = useRef(null);
  const shapePreviewRef = useRef(null);
  const isPanningRef = useRef(false);
  const isClickDrawingRef = useRef(false);
  const lastPanPointRef = useRef({ x: 0, y: 0 });
  const selectedIdsRef = useRef([]);
  const resizeModeRef = useRef(null);
  const isDraggingShapeRef = useRef(false);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);
  const clickedTargetRef = useRef(null);
  const originalPointsRef = useRef(null);
  const selectionBoxRef = useRef(null);
  const undoStackRef = useRef([]);
  const snappingShapeRef = useRef(null);

  const [elements, setElements] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [canvasCursor, setCanvasCursor] = useState(null);
  const [previewVersion, setPreviewVersion] = useState(0);

  const pushToUndo = (action) => {
    undoStackRef.current.push(action);
    if (undoStackRef.current.length > 50) undoStackRef.current.shift();
  };

  // Allow updating element color dynamically
  useEffect(() => {
    if (selectedIds.length === 1 && color) {
      const activeId = selectedIds[0];
      const element = elementsRef.current.find(e => e.id === activeId);
      if (element && element.color !== color && !isMediaElement(element.type)) {
        const oldElement = JSON.parse(JSON.stringify(element));
        const newElement = { ...element, color };
        setElements(prev => {
          const next = prev.map(e => e.id === activeId ? newElement : e);
          elementsRef.current = next;
          return next;
        });
        saveStroke(newElement, 'PUT');
        pushToUndo({ type: 'MODIFY', oldElement });
        bumpPreview();
      }
    }
  }, [color, selectedIds]);


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

  const findElementAtPoint = (x, y, { skipBackground = false } = {}) => {
    const threshold = 15;

    for (let i = elementsRef.current.length - 1; i >= 0; i -= 1) {
      const element = elementsRef.current[i];
      if (skipBackground && element.metadata?.isBackground) continue;

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

      if ((isShapeTool(element.type) || isMediaElement(element.type)) && isPointInShapeElement(x, y, element)) {
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
        tool: element.type === 'path' ? 'pencil' : element.type === 'highlight' ? 'highlighter' : (element.metadata?.tool || element.type),
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

    publish(method === 'POST' ? '/app/draw' : '/app/draw', payload);
    onBoardChanged?.();
  };

  const deleteStroke = (id, skipHistory = false) => {
    const elementToDelete = elementsRef.current.find((item) => item.id === id);
    if (!elementToDelete) return;
    
    if (!skipHistory) {
      pushToUndo({ type: 'DELETE', element: elementToDelete });
    }

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
    try {
      if (event && event.target && event.target.setPointerCapture) {
        event.target.setPointerCapture(event.pointerId);
      }
    } catch (e) {}

    if (tool !== 'select') {
      selectedIdsRef.current = [];
      setSelectedIds([]);
      setCanvasCursor(null);
    }

    if (tool === 'hand' || event.button === 1 || event.button === 2) {
      isPanningRef.current = true;
      lastPanPointRef.current = { x: event.clientX, y: event.clientY };
      return;
    }

    const { x, y } = getWorldPos(event.clientX, event.clientY);

    if (tool === 'select') {
      if (selectedIdsRef.current.length === 1) {
        const activeId = selectedIdsRef.current[0];
        const target = elementsRef.current.find(e => e.id === activeId);
        const _isPen = target && (target.type === 'path' || target.type === 'highlight');
        if (target && (isShapeTool(target.type) || isMediaElement(target.type) || _isPen)) {
          let p1, p2;
          if (_isPen) {
            const xs = target.points.map(p => p.x);
            const ys = target.points.map(p => p.y);
            p1 = { x: Math.min(...xs), y: Math.min(...ys) };
            p2 = { x: Math.max(...xs), y: Math.max(...ys) };
          } else {
            p1 = target.points[0];
            p2 = target.points[target.points.length - 1];
          }
          const handleSize = 15 / camera.zoom;

          if (!_isPen && (target.type === 'line' || target.type === 'arrow')) {
             if (Math.hypot(x - p1.x, y - p1.y) <= handleSize) resizeModeRef.current = 'start';
             else if (Math.hypot(x - p2.x, y - p2.y) <= handleSize) resizeModeRef.current = 'end';
          } else {
             const xMin = Math.min(p1.x, p2.x);
             const yMin = Math.min(p1.y, p2.y);
             const xMax = Math.max(p1.x, p2.x);
             const yMax = Math.max(p1.y, p2.y);
             
             const edgeThreshold = 10 / camera.zoom;
             
             if (Math.hypot(x - xMin, y - yMin) <= edgeThreshold) resizeModeRef.current = 'tl';
             else if (Math.hypot(x - xMax, y - yMin) <= edgeThreshold) resizeModeRef.current = 'tr';
             else if (Math.hypot(x - xMin, y - yMax) <= edgeThreshold) resizeModeRef.current = 'bl';
             else if (Math.hypot(x - xMax, y - yMax) <= edgeThreshold) resizeModeRef.current = 'br';
             else if (Math.abs(x - xMin) <= edgeThreshold && y >= yMin && y <= yMax) resizeModeRef.current = 'ml';
             else if (Math.abs(x - xMax) <= edgeThreshold && y >= yMin && y <= yMax) resizeModeRef.current = 'mr';
             else if (Math.abs(y - yMin) <= edgeThreshold && x >= xMin && x <= xMax) resizeModeRef.current = 'tc';
             else if (Math.abs(y - yMax) <= edgeThreshold && x >= xMin && x <= xMax) resizeModeRef.current = 'bc';
          }

          if (resizeModeRef.current) {
            isDraggingShapeRef.current = false;
            dragStartPosRef.current = { x, y };
            const connectedLines = elementsRef.current.filter(e => 
              (e.type === 'line' || e.type === 'arrow') && 
              (e.metadata?.startConnectedTo === target.id || e.metadata?.endConnectedTo === target.id)
            );
            const uniqueElements = [target, ...connectedLines];
            
            originalPointsRef.current = uniqueElements.map(e => ({ 
              id: e.id, 
              points: JSON.parse(JSON.stringify(e.points)),
              startConnectedTo: e.metadata?.startConnectedTo,
              endConnectedTo: e.metadata?.endConnectedTo
            }));
            hasMovedRef.current = false;
            return;
          }
        }
      }

      const target = findElementAtPoint(x, y);

      let groupClicked = false;
      if (selectedIdsRef.current.length > 1) {
          const selectedElements = elementsRef.current.filter(e => selectedIdsRef.current.includes(e.id));
          if (selectedElements.length > 0) {
              let xMin = Infinity, yMin = Infinity, xMax = -Infinity, yMax = -Infinity;
              selectedElements.forEach(el => {
                 el.points?.forEach(p => {
                    if (p.x < xMin) xMin = p.x;
                    if (p.y < yMin) yMin = p.y;
                    if (p.x > xMax) xMax = p.x;
                    if (p.y > yMax) yMax = p.y;
                 });
              });
              if (x >= xMin && x <= xMax && y >= yMin && y <= yMax) {
                 groupClicked = true;
              }
          }
      }

      if (groupClicked || (target && (isShapeTool(target.type) || isMediaElement(target.type) || target.type === 'path' || target.type === 'highlight'))) {
        resizeModeRef.current = null;
        isDraggingShapeRef.current = true;
        hasMovedRef.current = false;
        clickedTargetRef.current = target ? target.id : null;
        
        if (target && !groupClicked && !selectedIdsRef.current.includes(target.id)) {
          if (target.metadata?.groupId) {
            const groupIds = elementsRef.current.filter(e => e.metadata?.groupId === target.metadata.groupId).map(e => e.id);
            selectedIdsRef.current = groupIds;
          } else {
            selectedIdsRef.current = [target.id];
          }
        }
        
        dragStartPosRef.current = { x, y };
        
        const selected = elementsRef.current.filter(e => selectedIdsRef.current.includes(e.id));
        const connectedLines = elementsRef.current.filter(e => 
          (e.type === 'line' || e.type === 'arrow') && 
          (selectedIdsRef.current.includes(e.metadata?.startConnectedTo) || selectedIdsRef.current.includes(e.metadata?.endConnectedTo))
        );
        const uniqueElements = Array.from(new Set([...selected, ...connectedLines]));
        
        originalPointsRef.current = uniqueElements.map(e => ({ 
          id: e.id, 
          points: JSON.parse(JSON.stringify(e.points)),
          startConnectedTo: e.metadata?.startConnectedTo,
          endConnectedTo: e.metadata?.endConnectedTo
        }));
          
        setSelectedIds([...selectedIdsRef.current]);
        updateSelectedElementCallback();
        bumpPreview();
      } else {
        selectedIdsRef.current = [];
        setSelectedIds([]);
        updateSelectedElementCallback();
        
        selectionBoxRef.current = { startX: x, startY: y, endX: x, endY: y };
        setCanvasCursor(null);
        hasMovedRef.current = false;
        bumpPreview();
      }

      return;
    }

    if (tool === 'eraser') {
      setIsDrawing(true);
      const target = findElementAtPoint(x, y, { skipBackground: true });
      if (target) deleteStroke(target.id);
      return;
    }

    if (tool === 'pencil' || tool === 'highlighter') {
      setIsDrawing(true);
      currentPathRef.current = [{ x, y }];
      bumpPreview();
      return;
    }

    if (isShapeTool(tool) || tool === 'ai-svg') {
      setIsDrawing(true);
      if (!isClickDrawingRef.current) {
        shapePreviewRef.current = { startX: x, startY: y, endX: x, endY: y };
      }
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
      if (selectionBoxRef.current) {
        const dx = x - selectionBoxRef.current.startX;
        const dy = y - selectionBoxRef.current.startY;
        if (!hasMovedRef.current && Math.hypot(dx, dy) > 2) {
          hasMovedRef.current = true;
          onInteractionStart?.();
        }
        
        if (hasMovedRef.current) {
          selectionBoxRef.current.endX = x;
          selectionBoxRef.current.endY = y;
          bumpPreview();
        }
        return;
      }

      if (resizeModeRef.current && selectedIdsRef.current.length === 1 && originalPointsRef.current) {
        if (!hasMovedRef.current) {
          hasMovedRef.current = true;
          onInteractionStart?.();
        }
        const dx = x - dragStartPosRef.current.x;
        const dy = y - dragStartPosRef.current.y;
        
        const activeId = selectedIdsRef.current[0];
        const original = originalPointsRef.current[0];

        // Pen strokes: scale all points proportionally inside bounding box
        const _penTarget = elementsRef.current.find(e => e.id === activeId);
        if (_penTarget && (_penTarget.type === 'path' || _penTarget.type === 'highlight')) {
          const xs = original.points.map(p => p.x);
          const ys = original.points.map(p => p.y);
          const origXMin = Math.min(...xs), origYMin = Math.min(...ys);
          const origXMax = Math.max(...xs), origYMax = Math.max(...ys);
          const origW = origXMax - origXMin || 1;
          const origH = origYMax - origYMin || 1;
          let nXMin = origXMin, nYMin = origYMin, nXMax = origXMax, nYMax = origYMax;
          const mode = resizeModeRef.current;
          if (mode.includes('l')) nXMin = origXMin + dx;
          if (mode.includes('r')) nXMax = origXMax + dx;
          if (mode.includes('t')) nYMin = origYMin + dy;
          if (mode.includes('b')) nYMax = origYMax + dy;
          const nW = nXMax - nXMin || 1;
          const nH = nYMax - nYMin || 1;
          const scaledPts = original.points.map(p => ({
            x: nXMin + (p.x - origXMin) * (nW / origW),
            y: nYMin + (p.y - origYMin) * (nH / origH),
          }));
          setElements(prev => {
            const next = prev.map(item => item.id === activeId ? { ...item, points: scaledPts } : item);
            elementsRef.current = next;
            return next;
          });
          bumpPreview();
          return;
        }

        const p1 = original.points[0];
        const p2 = original.points[original.points.length - 1];
        let xMin = Math.min(p1.x, p2.x);
        let yMin = Math.min(p1.y, p2.y);
        let xMax = Math.max(p1.x, p2.x);
        let yMax = Math.max(p1.y, p2.y);

        const mode = resizeModeRef.current;
        let nextP1 = { ...p1 };
        let nextP2 = { ...p2 };
        let connectedStart = original.startConnectedTo || null;
        let connectedEnd = original.endConnectedTo || null;

        if (mode === 'start' || mode === 'end') {
          let snapPoint = { x: p1.x + dx, y: p1.y + dy }; // Default to moving start
          if (mode === 'end') {
             snapPoint = { x: p2.x + dx, y: p2.y + dy };
          }
          let snappedToId = null;
          let closestShape = null;
          let closestDistToShape = Infinity;

          for (const el of elementsRef.current) {
            if (el.id !== activeId && isShapeTool(el.type) && el.type !== 'line' && el.type !== 'arrow') {
               const elXMin = Math.min(el.points[0].x, el.points[el.points.length - 1].x);
               const elYMin = Math.min(el.points[0].y, el.points[el.points.length - 1].y);
               const elXMax = Math.max(el.points[0].x, el.points[el.points.length - 1].x);
               const elYMax = Math.max(el.points[0].y, el.points[el.points.length - 1].y);
               
               if (x >= elXMin - 20 && x <= elXMax + 20 && y >= elYMin - 20 && y <= elYMax + 20) {
                  const cx = (elXMin + elXMax) / 2;
                  const cy = (elYMin + elYMax) / 2;
                  const dist = Math.hypot(x - cx, y - cy);
                  if (dist < closestDistToShape) {
                      closestDistToShape = dist;
                      closestShape = { el, elXMin, elYMin, elXMax, elYMax, cx, cy };
                  }
               }
            }
          }

          if (closestShape) {
              const { el, elXMin, elYMin, elXMax, elYMax, cx, cy } = closestShape;
              snappedToId = el.id;
              
              const closestPoint = getClosestPointOnShapePerimeter(x, y, el);
              let px = closestPoint.x;
              let py = closestPoint.y;
              
              const anchors = getShapeAnchors(el);
              let snappedToAnchor = false;
              for (const pt of anchors) {
                 if (Math.hypot(px - pt.x, py - pt.y) < 15) {
                    snapPoint = pt;
                    snappedToAnchor = true;
                    break;
                 }
              }
              if (!snappedToAnchor) {
                 snapPoint = { x: px, y: py };
              }
          }

          if (snappingShapeRef.current !== snappedToId) {
             snappingShapeRef.current = snappedToId;
          }

          if (mode === 'start') {
            nextP1 = snapPoint;
            connectedStart = snappedToId;
            nextP2 = { ...p2 }; // Ensure p2 stays original
          } else {
            nextP2 = snapPoint;
            connectedEnd = snappedToId;
            nextP1 = { ...p1 }; // Ensure p1 stays original
          }
        } else {
          if (mode.includes('l')) xMin += dx;
          if (mode.includes('r')) xMax += dx;
          if (mode.includes('t')) yMin += dy;
          if (mode.includes('b')) yMax += dy;
          nextP1 = { x: xMin, y: yMin };
          nextP2 = { x: xMax, y: yMax };
        }

        setElements((prev) => {
          let origXMin = 0, origYMin = 0, origW = 1, origH = 1;
          const isLineOrArrow = mode === 'start' || mode === 'end';
          if (!isLineOrArrow && originalPointsRef.current) {
             const origShape = originalPointsRef.current.find(o => o.id === activeId);
             if (origShape) {
                const [op1, op2] = origShape.points;
                origXMin = Math.min(op1.x, op2.x);
                origYMin = Math.min(op1.y, op2.y);
                origW = Math.abs(op2.x - op1.x) || 1;
                origH = Math.abs(op2.y - op1.y) || 1;
             }
          }

          const newXMin = Math.min(nextP1.x, nextP2.x);
          const newYMin = Math.min(nextP1.y, nextP2.y);
          const newW = Math.abs(nextP2.x - nextP1.x) || 1;
          const newH = Math.abs(nextP2.y - nextP1.y) || 1;

          const next = prev.map((item) => {
            if (item.id === activeId) {
               return { 
                  ...item, 
                  points: [nextP1, nextP2],
                  metadata: { ...item.metadata, startConnectedTo: connectedStart, endConnectedTo: connectedEnd }
               };
            }
            
            if ((item.type === 'line' || item.type === 'arrow') && !isLineOrArrow && originalPointsRef.current) {
                const originalLine = originalPointsRef.current.find(o => o.id === item.id);
                if (originalLine) {
                   const startConnected = originalLine.startConnectedTo === activeId;
                   const endConnected = originalLine.endConnectedTo === activeId;
                   
                   if (startConnected || endConnected) {
                      const nextPoints = [...originalLine.points];
                      if (startConnected) {
                         const rx = (originalLine.points[0].x - origXMin) / origW;
                         const ry = (originalLine.points[0].y - origYMin) / origH;
                         nextPoints[0] = { x: newXMin + rx * newW, y: newYMin + ry * newH };
                      }
                      if (endConnected) {
                         const lastIdx = nextPoints.length - 1;
                         const rx = (originalLine.points[lastIdx].x - origXMin) / origW;
                         const ry = (originalLine.points[lastIdx].y - origYMin) / origH;
                         nextPoints[lastIdx] = { x: newXMin + rx * newW, y: newYMin + ry * newH };
                      }
                      return { ...item, points: nextPoints };
                   }
                }
            }
            return item;
          });
          elementsRef.current = next;
          return next;
        });
        bumpPreview();
        return;
      }

      if (isDraggingShapeRef.current && originalPointsRef.current) {
        const dx = x - dragStartPosRef.current.x;
        const dy = y - dragStartPosRef.current.y;
        
        if (!hasMovedRef.current && Math.hypot(dx, dy) > 2) {
          hasMovedRef.current = true;
          onInteractionStart?.();
        }

        if (hasMovedRef.current) {
          setElements((prev) => {
            const next = prev.map((item) => {
              const original = originalPointsRef.current.find(o => o.id === item.id);
              if (original) {
                // If it's a selected shape, move entirely
                if (selectedIdsRef.current.includes(item.id)) {
                  return {
                    ...item,
                    points: original.points.map((p) => ({
                      x: p.x + dx,
                      y: p.y + dy,
                    })),
                  };
                }
                
                // If it's a connected line, move only the connected endpoints
                if (item.type === 'line' || item.type === 'arrow') {
                  const startSelected = selectedIdsRef.current.includes(original.startConnectedTo);
                  const endSelected = selectedIdsRef.current.includes(original.endConnectedTo);
                  
                  if (startSelected || endSelected) {
                    const nextPoints = [...original.points];
                    if (startSelected) {
                      nextPoints[0] = { x: nextPoints[0].x + dx, y: nextPoints[0].y + dy };
                    }
                    if (endSelected) {
                      nextPoints[nextPoints.length - 1] = { 
                        x: nextPoints[nextPoints.length - 1].x + dx, 
                        y: nextPoints[nextPoints.length - 1].y + dy 
                      };
                    }
                    return { ...item, points: nextPoints };
                  }
                }
              }
              return item;
            });
            elementsRef.current = next;
            return next;
          });
          bumpPreview();
        }
        return;
      }

      let hoverCursor = 'default';
      if (!isDraggingShapeRef.current && !resizeModeRef.current && selectedIdsRef.current.length === 1) {
        const activeId = selectedIdsRef.current[0];
        const target = elementsRef.current.find(e => e.id === activeId);
        const _isHoverPen = target && (target.type === 'path' || target.type === 'highlight');
        if (target && (isShapeTool(target.type) || isMediaElement(target.type) || _isHoverPen)) {
          let p1, p2;
          if (_isHoverPen) {
            const xs = target.points.map(p => p.x);
            const ys = target.points.map(p => p.y);
            p1 = { x: Math.min(...xs), y: Math.min(...ys) };
            p2 = { x: Math.max(...xs), y: Math.max(...ys) };
          } else {
            p1 = target.points[0];
            p2 = target.points[target.points.length - 1];
          }
          const handleSize = 15 / camera.zoom;

          if (!_isHoverPen && (target.type === 'line' || target.type === 'arrow')) {
             if (Math.hypot(x - p1.x, y - p1.y) <= handleSize) hoverCursor = 'crosshair';
             else if (Math.hypot(x - p2.x, y - p2.y) <= handleSize) hoverCursor = 'crosshair';
          } else {
             const xMin = Math.min(p1.x, p2.x);
             const yMin = Math.min(p1.y, p2.y);
             const xMax = Math.max(p1.x, p2.x);
             const yMax = Math.max(p1.y, p2.y);
             
             const edgeThreshold = 10 / camera.zoom;
             
             let hitKey = null;
             if (Math.hypot(x - xMin, y - yMin) <= edgeThreshold) hitKey = 'tl';
             else if (Math.hypot(x - xMax, y - yMin) <= edgeThreshold) hitKey = 'tr';
             else if (Math.hypot(x - xMin, y - yMax) <= edgeThreshold) hitKey = 'bl';
             else if (Math.hypot(x - xMax, y - yMax) <= edgeThreshold) hitKey = 'br';
             else if (Math.abs(x - xMin) <= edgeThreshold && y >= yMin && y <= yMax) hitKey = 'ml';
             else if (Math.abs(x - xMax) <= edgeThreshold && y >= yMin && y <= yMax) hitKey = 'mr';
             else if (Math.abs(y - yMin) <= edgeThreshold && x >= xMin && x <= xMax) hitKey = 'tc';
             else if (Math.abs(y - yMax) <= edgeThreshold && x >= xMin && x <= xMax) hitKey = 'bc';

             if (hitKey) {
                if (['tl', 'br'].includes(hitKey)) hoverCursor = 'nwse-resize';
                else if (['tr', 'bl'].includes(hitKey)) hoverCursor = 'nesw-resize';
                else if (['tc', 'bc'].includes(hitKey)) hoverCursor = 'ns-resize';
                else if (['ml', 'mr'].includes(hitKey)) hoverCursor = 'ew-resize';
             }
          }
        }
      }
      if (hoverCursor === 'default' && selectedIdsRef.current.length > 0) {
        const isGroupHovered = () => {
          if (selectedIdsRef.current.length === 1) {
            const hTarget = findElementAtPoint(x, y);
            return hTarget && hTarget.id === selectedIdsRef.current[0];
          } else {
            const selectedElements = elementsRef.current.filter(e => selectedIdsRef.current.includes(e.id));
            let xMin = Infinity, yMin = Infinity, xMax = -Infinity, yMax = -Infinity;
            selectedElements.forEach(el => {
               el.points?.forEach(p => {
                  if (p.x < xMin) xMin = p.x;
                  if (p.y < yMin) yMin = p.y;
                  if (p.x > xMax) xMax = p.x;
                  if (p.y > yMax) yMax = p.y;
               });
            });
            return (x >= xMin && x <= xMax && y >= yMin && y <= yMax);
          }
        };
        if (isGroupHovered()) hoverCursor = 'move';
      }
      setCanvasCursor(hoverCursor);
      bumpPreview();
      return;
    }

    if (!isDrawing) return;

    if (tool === 'eraser') {
      const target = findElementAtPoint(x, y, { skipBackground: true });
      if (target) deleteStroke(target.id);
      return;
    }

    if (tool === 'pencil' || tool === 'highlighter') {
      currentPathRef.current.push({ x, y });
      bumpPreview();
      return;
    }

    if (isShapeTool(tool) && shapePreviewRef.current) {
      shapePreviewRef.current.endX = x;
      shapePreviewRef.current.endY = y;
      bumpPreview();
    }
  };

  const updateSelectedElementCallback = () => {
    if (selectedIdsRef.current.length === 0) {
       onElementSelected?.(null);
    } else if (selectedIdsRef.current.length === 1) {
       const el = elementsRef.current.find(e => e.id === selectedIdsRef.current[0]);
       onElementSelected?.(el || null);
    } else {
       const selectedElements = elementsRef.current.filter(e => selectedIdsRef.current.includes(e.id));
       let xMin = Infinity, yMin = Infinity, xMax = -Infinity, yMax = -Infinity;
       selectedElements.forEach(el => {
          el.points?.forEach(p => {
             if (p.x < xMin) xMin = p.x;
             if (p.y < yMin) yMin = p.y;
             if (p.x > xMax) xMax = p.x;
             if (p.y > yMax) yMax = p.y;
          });
       });

       const groupIds = new Set(selectedElements.map(e => e.metadata?.groupId).filter(Boolean));
       const commonGroupId = (groupIds.size === 1 && selectedElements.every(e => e.metadata?.groupId)) 
           ? Array.from(groupIds)[0] 
           : null;

       onElementSelected?.({
          id: 'group',
          type: 'group',
          points: [{ x: xMin, y: yMin }, { x: xMax, y: yMax }],
          selectedIds: selectedIdsRef.current,
          metadata: { groupId: commonGroupId }
       });
    }
  };

  const handlePointerUp = (event) => {
    try {
      if (event && event.target && event.target.releasePointerCapture) {
        event.target.releasePointerCapture(event.pointerId);
      }
    } catch (e) {}

    if (isPanningRef.current) {
      isPanningRef.current = false;
      return;
    }

    if (tool === 'select') {
      if (selectionBoxRef.current) {
        const { startX, startY, endX, endY } = selectionBoxRef.current;
        const width = Math.abs(endX - startX);
        const height = Math.abs(endY - startY);

        if (width < 3 && height < 3) {
           selectedIdsRef.current = [];
           setSelectedIds([]);
           updateSelectedElementCallback();
        } else {
          const xMin = Math.min(startX, endX);
          const yMin = Math.min(startY, endY);
          const xMax = Math.max(startX, endX);
          const yMax = Math.max(startY, endY);
          
          const inside = elementsRef.current.filter(el => {
             if (!el.points || el.points.length === 0) return false;
             const exMin = Math.min(...el.points.map(p => p.x));
             const eyMin = Math.min(...el.points.map(p => p.y));
             const exMax = Math.max(...el.points.map(p => p.x));
             const eyMax = Math.max(...el.points.map(p => p.y));
             return !(exMin > xMax || exMax < xMin || eyMin > yMax || eyMax < yMin);
          });

          if (inside.length > 0) {
             let newIds = new Set(inside.map(e => e.id));
             inside.forEach(e => {
                if (e.metadata?.groupId) {
                   elementsRef.current.forEach(el => {
                      if (el.metadata?.groupId === e.metadata.groupId) {
                         newIds.add(el.id);
                      }
                   });
                }
             });
             const finalIds = Array.from(newIds);
             selectedIdsRef.current = finalIds;
             setSelectedIds(finalIds);
             updateSelectedElementCallback();
          } else {
             selectedIdsRef.current = [];
             setSelectedIds([]);
             updateSelectedElementCallback();
          }
        }
        
        selectionBoxRef.current = null;
        if (hasMovedRef.current) onInteractionEnd?.();
        bumpPreview();
        return;
      }

      const changed = resizeModeRef.current || (isDraggingShapeRef.current && hasMovedRef.current);

      if (isDraggingShapeRef.current && !hasMovedRef.current) {
        if (!clickedTargetRef.current) {
          // Single click on empty space inside the group
          selectedIdsRef.current = [];
          setSelectedIds([]);
          updateSelectedElementCallback();
          setCanvasCursor(null);
          resizeModeRef.current = null;
          isDraggingShapeRef.current = false;
          bumpPreview();
          return;
        } else if (selectedIdsRef.current.length > 1 && selectedIdsRef.current.includes(clickedTargetRef.current)) {
          // Check if this is a permanent group
          const clickedEl = elementsRef.current.find(e => e.id === clickedTargetRef.current);
          const isPermanentGroup = clickedEl?.metadata?.groupId && selectedIdsRef.current.every(id => {
             const el = elementsRef.current.find(e => e.id === id);
             return el?.metadata?.groupId === clickedEl.metadata.groupId;
          });

          if (!isPermanentGroup) {
            // Single click on a specific element inside a loose multi-selection
            selectedIdsRef.current = [clickedTargetRef.current];
            setSelectedIds([clickedTargetRef.current]);
            updateSelectedElementCallback();
            setCanvasCursor(null);
            resizeModeRef.current = null;
            isDraggingShapeRef.current = false;
            if (hasMovedRef.current) onInteractionEnd?.();
            bumpPreview();
            return;
          }
        }
      }

      resizeModeRef.current = null;
      isDraggingShapeRef.current = false;
      snappingShapeRef.current = null;
      setCanvasCursor(null);

      if (changed && originalPointsRef.current) {
        originalPointsRef.current.forEach(original => {
          const element = elementsRef.current.find((item) => item.id === original.id);
          // Simple check to see if points or connection metadata changed
          if (element && (JSON.stringify(element.points) !== JSON.stringify(original.points) || 
                          element.metadata?.startConnectedTo !== original.startConnectedTo ||
                          element.metadata?.endConnectedTo !== original.endConnectedTo)) {
            saveStroke(element, 'PUT');
            pushToUndo({ type: 'MODIFY', oldElement: { ...element, points: original.points, metadata: { ...element.metadata, startConnectedTo: original.startConnectedTo, endConnectedTo: original.endConnectedTo } } });
          }
        });
        updateSelectedElementCallback();
      }
      if (hasMovedRef.current) onInteractionEnd?.();
      bumpPreview();
      return;
    }

    if (!isDrawing) return;

    if ((tool === 'pencil' || tool === 'highlighter') && currentPathRef.current.length > 0) {
      setIsDrawing(false);
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
      pushToUndo({ type: 'ADD', element: next });
      if (tool === 'pencil') onPencilStrokeComplete?.(next);
      bumpPreview();
      return;
    }

    if (isShapeTool(tool) && shapePreviewRef.current) {
      let p1 = { x: shapePreviewRef.current.startX, y: shapePreviewRef.current.startY };
      let p2 = { x: shapePreviewRef.current.endX, y: shapePreviewRef.current.endY };
      
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);

      if (!isClickDrawingRef.current && dist < 5) {
        // Start click-drawing mode
        isClickDrawingRef.current = true;
        return; // keep isDrawing = true
      }

      setIsDrawing(false);
      isClickDrawingRef.current = false;

      // If they just double clicked without moving, make a default size
      if (dist < 5) {
        if (tool === 'line' || tool === 'arrow') {
           p2 = { x: p1.x + 100, y: p1.y };
        } else {
           p1 = { x: p1.x - 50, y: p1.y - 50 };
           p2 = { x: p2.x + 50, y: p2.y + 50 };
        }
      }

      const next = {
        id: crypto.randomUUID(),
        boardId,
        type: tool,
        points: [p1, p2],
        color,
        width: strokeWidth,
        metadata: {},
      };
      
      shapePreviewRef.current = null;
      setElements((prev) => {
        const all = [...prev, next];
        elementsRef.current = all;
        return all;
      });
      shapePreviewRef.current = null;
      saveStroke(next, 'POST');
      pushToUndo({ type: 'ADD', element: next });
      bumpPreview();
      
      onToolChange?.('select');
      setSelectedIds([next.id]);
      selectedIdsRef.current = [next.id];
      onElementSelected?.(next);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
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
    const dpr = window.devicePixelRatio || 1;
    ctx.scale(dpr, dpr);
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);

    sortElementsForRender(elements).forEach((element) => {
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
      } else if (element.type === 'image' || element.type === 'pdf-page') {
        drawImageElement(ctx, element, imageCacheRef.current, bumpPreview);
      } else if (element.type === 'ai-svg') {
        drawSvgElement(ctx, element, imageCacheRef.current, bumpPreview);
      } else if (isShapeTool(element.type)) {
        drawShapeElement(ctx, element);
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



    if (isShapeTool(tool) && shapePreviewRef.current) {
      ctx.lineWidth = strokeWidth;
      drawShapeElement(ctx, {
        type: tool,
        points: [
          { x: shapePreviewRef.current.startX, y: shapePreviewRef.current.startY },
          { x: shapePreviewRef.current.endX, y: shapePreviewRef.current.endY },
        ],
        color,
        metadata: { strokeStyle: 'dashed' }
      });
    }

    if (snappingShapeRef.current) {
      const shape = elementsRef.current.find(e => e.id === snappingShapeRef.current);
      if (shape) {
         const highlightShape = {
            ...shape,
            color: 'transparent',
            width: ((shape.width || 4) + 2) / camera.zoom, // slightly thicker to act as outer stroke
            metadata: { ...shape.metadata, strokeColor: '#3b82f6', strokeStyle: 'solid' }
         };
         drawShapeElement(ctx, highlightShape);

         const anchors = getShapeAnchors(shape);
         
         ctx.lineWidth = 1.5 / camera.zoom;
         ctx.strokeStyle = '#3b82f6';
         ctx.fillStyle = '#ffffff';
         anchors.forEach(pt => {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 4 / camera.zoom, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
         });
      }
    }

    if (selectedIds.length > 0) {
      const selectedElements = elements.filter(e => selectedIds.includes(e.id));
      if (selectedElements.length > 0) {
        let xMin = Infinity, yMin = Infinity, xMax = -Infinity, yMax = -Infinity;
        selectedElements.forEach(el => {
           el.points?.forEach(p => {
              if (p.x < xMin) xMin = p.x;
              if (p.y < yMin) yMin = p.y;
              if (p.x > xMax) xMax = p.x;
              if (p.y > yMax) yMax = p.y;
           });
        });
        const w = xMax - xMin;
        const h = yMax - yMin;

        const isLineOrArrow = selectedElements.length === 1 && (selectedElements[0].type === 'line' || selectedElements[0].type === 'arrow');

        if (!isLineOrArrow) {
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 1.5 / camera.zoom;
          ctx.setLineDash([6, 4]);
          ctx.strokeRect(xMin, yMin, w, h);
          ctx.setLineDash([]);
        }

        if (selectedIds.length === 1) {
          const activeElement = selectedElements[0];
          const handleSize = (isLineOrArrow ? 12 : 8) / camera.zoom;
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 1.5 / camera.zoom;

          let handles = [];
          if (isLineOrArrow) {
            handles = [
              [activeElement.points[0].x, activeElement.points[0].y],
              [activeElement.points[activeElement.points.length - 1].x, activeElement.points[activeElement.points.length - 1].y]
            ];
          } else {
            handles = [
              [xMin, yMin], [xMin + w/2, yMin], [xMax, yMin],
              [xMin, yMin + h/2],               [xMax, yMin + h/2],
              [xMin, yMax], [xMin + w/2, yMax], [xMax, yMax]
            ];
          }
          
          handles.forEach(([hx, hy]) => {
            ctx.beginPath();
            ctx.arc(hx, hy, handleSize / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          });
        }
      }
    }

    if (selectionBoxRef.current) {
      const { startX, startY, endX, endY } = selectionBoxRef.current;
      const sx = Math.min(startX, endX);
      const sy = Math.min(startY, endY);
      const sw = Math.abs(endX - startX);
      const sh = Math.abs(endY - startY);

      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1 / camera.zoom;
      ctx.fillRect(sx, sy, sw, sh);
      ctx.strokeRect(sx, sy, sw, sh);
    }

    ctx.restore();
  }, [camera, color, elements, previewVersion, selectedIds, strokeWidth, tool]);

  const cursor = tool === 'hand'
    ? 'grab'
    : canvasCursor || (tool === 'note'
      ? 'cell'
      : tool === 'select'
        ? 'default'
        : isShapeTool(tool)
          ? 'crosshair'
          : CURSORS[tool] || 'crosshair');

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
    selectedIdsRef.current = [anchor.id];
    setSelectedIds([anchor.id]);
    saveStroke(next, 'PUT');
    onBoardChanged?.();
    bumpPreview();
  };

  const addMediaElements = (items) => {
    if (!items?.length) return;

    const newElements = items.map((item) => ({
      id: crypto.randomUUID(),
      boardId,
      type: item.type || 'image',
      color: '#000000',
      width: 1,
      points: [
        { x: item.x, y: item.y },
        { x: item.x + item.width, y: item.y + item.height },
      ],
      metadata: {
        type: item.type || 'image',
        tool: item.type || 'image',
        imageUrl: item.imageUrl,
        mimeType: item.mimeType,
        originalFilename: item.filename,
        sourceFilename: item.sourceFilename,
        pageIndex: item.pageIndex,
        totalPages: item.totalPages,
        isBackground: true,
        zIndex: 0,
      },
    }));

    setElements((prev) => {
      const next = [...prev, ...newElements];
      elementsRef.current = next;
      return next;
    });

    newElements.forEach((element) => saveStroke(element, 'POST'));
    pushToUndo({ type: 'ADD_MULTIPLE', elements: newElements });
    bumpPreview();
    onBoardChanged?.();
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        const lastAction = undoStackRef.current.pop();
        if (!lastAction) return;

        if (lastAction.type === 'ADD') {
          deleteStroke(lastAction.element.id, true);
        } else if (lastAction.type === 'DELETE') {
          setElements((prev) => {
            const all = [...prev, lastAction.element];
            elementsRef.current = all;
            return all;
          });
          saveStroke(lastAction.element, 'POST');
          bumpPreview();
        } else if (lastAction.type === 'MODIFY') {
          setElements((prev) => {
            const next = prev.map(item => item.id === lastAction.oldElement.id ? lastAction.oldElement : item);
            elementsRef.current = next;
            return next;
          });
          saveStroke(lastAction.oldElement, 'PUT');
          bumpPreview();
        } else if (lastAction.type === 'ADD_MULTIPLE') {
          lastAction.elements.forEach(el => deleteStroke(el.id, true));
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (selectedIdsRef.current.length > 0) {
          duplicateElements(selectedIdsRef.current);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [boardId]);

  const duplicateElements = (ids) => {
    const elementsToDuplicate = elementsRef.current.filter(e => ids.includes(e.id));
    if (elementsToDuplicate.length === 0) return;

    const groupIds = new Set(elementsToDuplicate.map(e => e.metadata?.groupId).filter(Boolean));
    const commonGroupId = (groupIds.size === 1 && elementsToDuplicate.every(e => e.metadata?.groupId)) 
        ? crypto.randomUUID() 
        : null;

    const offset = 50;
    const newElements = elementsToDuplicate.map(element => {
      const clone = JSON.parse(JSON.stringify(element));
      clone.id = crypto.randomUUID();
      clone.points = clone.points.map(p => ({ x: p.x + offset, y: p.y + offset }));
      if (commonGroupId) {
         clone.metadata = { ...(clone.metadata || {}), groupId: commonGroupId };
      } else if (clone.metadata?.groupId) {
         delete clone.metadata.groupId;
      }
      return clone;
    });

    setElements(prev => {
      const all = [...prev, ...newElements];
      elementsRef.current = all;
      return all;
    });

    newElements.forEach(el => saveStroke(el, 'POST'));
    pushToUndo({ type: 'ADD_MULTIPLE', elements: newElements });

    const newIds = newElements.map(e => e.id);
    selectedIdsRef.current = newIds;
    setSelectedIds(newIds);
    updateSelectedElementCallback();
    bumpPreview();
  };

  const updateElement = (id, updates) => {
    const element = elementsRef.current.find(e => e.id === id);
    if (!element) return;
    const oldElement = JSON.parse(JSON.stringify(element));
    const next = { 
      ...element, 
      ...updates,
      metadata: { ...(element.metadata || {}), ...(updates.metadata || {}) }
    };
    
    setElements((prev) => {
      const all = prev.map(e => e.id === id ? next : e);
      elementsRef.current = all;
      return all;
    });
    saveStroke(next, 'PUT');
    pushToUndo({ type: 'MODIFY', oldElement });
    
    if (selectedIdsRef.current.length === 1 && selectedIdsRef.current[0] === id) {
      onElementSelected?.(next);
    }
    bumpPreview();
  };

  return {
    canvasRef,
    cursor,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    removeElement: deleteStroke,
    replaceElementWithSuggestion,
    duplicateElements,
    updateElement,
    addMediaElements,
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

function drawImageElement(ctx, element, imageCache, onLoad) {
  if (!element?.points || element.points.length < 2) return;

  const [p1, p2] = element.points;
  const x = Math.min(p1.x, p2.x);
  const y = Math.min(p1.y, p2.y);
  const width = Math.max(1, Math.abs(p2.x - p1.x));
  const height = Math.max(1, Math.abs(p2.y - p1.y));
  const imageUrl = resolveSvgUrl(element.metadata?.imageUrl || '');

  if (!imageUrl) return;

  let image = imageCache.get(imageUrl);
  if (!image) {
    image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => onLoad();
    image.onerror = () => onLoad();
    image.src = imageUrl;
    imageCache.set(imageUrl, image);
  }

  if (image.complete && image.naturalWidth > 0) {
    ctx.drawImage(image, x, y, width, height);
    return;
  }

  ctx.save();
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(x, y, width, height);
  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, width, height);
  ctx.setLineDash([]);
  ctx.fillStyle = '#64748b';
  ctx.font = '12px sans-serif';
  ctx.fillText('Đang tải...', x + 8, y + 18);
  ctx.restore();
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
