/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, useState } from 'react';

const BASE = 'http://localhost:5000';
const SUGGESTION_DELAY_MS = 900;
const SESSION_GAP_MS = 2500;
const MAX_STROKES_PER_GROUP = 12;

export function useAISuggestion({ boardId, authHeaders }) {
  const [suggestion, setSuggestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const pendingElementsRef = useRef([]);
  const timerRef = useRef(null);
  const lastStrokeAtRef = useRef(0);
  const requestIdRef = useRef(0);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const submitStroke = (element) => {
    if (!element?.points?.length || element.points.length < 3) {
      console.log('[AI] Stroke too short, skipping', element?.points?.length, 'points');
      return;
    }

    const now = Date.now();
    const shouldStartNewGroup = now - lastStrokeAtRef.current > SESSION_GAP_MS;
    const nextGroup = shouldStartNewGroup
      ? [element]
      : [...pendingElementsRef.current, element].slice(-MAX_STROKES_PER_GROUP);

    pendingElementsRef.current = nextGroup;
    lastStrokeAtRef.current = now;
    setSuggestion(null);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      void requestSuggestion(nextGroup);
    }, SUGGESTION_DELAY_MS);
  };

  const requestSuggestion = async (elements) => {
    if (!elements?.length) return;

    const allPoints = elements.flatMap((item) => item.points || []);
    if (!allPoints.length) return;

    const xs = allPoints.map((point) => point.x);
    const ys = allPoints.map((point) => point.y);
    const bbox = {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    };

    const strokes = elements.map((item) => ({ points: item.points }));
    const triggerElementIds = elements.map((item) => item.id);
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    console.log('[AI] Submitting grouped strokes →', strokes.length, 'strokes, bbox:', bbox);
    setLoading(true);

    try {
      const res = await fetch(`${BASE}/api/board/${boardId}/ai-suggest`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ strokes, bbox }),
      });

      console.log('[AI] Response status:', res.status);
      if (!res.ok || requestIdRef.current !== requestId) return;

      const data = await res.json();
      const options = (data.options || []).map((option) => ({
        ...option,
        svgUrl: resolveSvgUrl(option.svgUrl),
      }));
      console.log('[AI] Data received:', { ...data, options });

      if (options.length > 0) {
        setSuggestion({ ...data, options, triggerElementIds });
      } else {
        console.log('[AI] No options returned from server');
      }
    } catch (err) {
      console.error('[AI] Error:', err);
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  };

  const clearSuggestion = (resetPending = false) => {
    setSuggestion(null);
    if (resetPending) {
      requestIdRef.current += 1;
      setLoading(false);
      pendingElementsRef.current = [];
      lastStrokeAtRef.current = 0;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  return { suggestion, loading, submitStroke, clearSuggestion };
}

function resolveSvgUrl(svgUrl) {
  if (!svgUrl) return '';
  if (svgUrl.startsWith('http://') || svgUrl.startsWith('https://') || svgUrl.startsWith('data:')) {
    return svgUrl;
  }
  return `${BASE}${svgUrl.startsWith('/') ? '' : '/'}${svgUrl}`;
}

export default function AISuggestionBar({ suggestion, loading, onSelect, onClose }) {
  if (!loading && (!suggestion || !suggestion.options?.length)) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 bg-white border-b border-slate-200 shadow-sm z-50 flex items-center gap-3 px-4"
      style={{ height: '52px' }}
    >
      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
          <span>Analyzing your drawing...</span>
        </div>
      ) : (
        <>
          <span className="text-sm font-medium text-slate-500 whitespace-nowrap flex-shrink-0">
            Do you mean:
          </span>

          <div className="flex items-center gap-1 overflow-x-auto flex-1 py-1 scrollbar-none">
            {suggestion.options.map((option) => (
              <button
                key={option.sampleId}
                onClick={() => onSelect(option, suggestion.triggerElementIds)}
                title={option.label}
                className="flex-shrink-0 w-10 h-10 rounded-lg hover:bg-slate-100 transition-all p-1 flex items-center justify-center border border-transparent hover:border-slate-300 hover:shadow-sm"
              >
                <img
                  src={option.svgUrl}
                  alt={option.label}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const span = document.createElement('span');
                    span.className = 'text-[10px] font-medium text-slate-500 leading-tight text-center';
                    span.textContent = option.label;
                    e.target.replaceWith(span);
                  }}
                />
              </button>
            ))}
          </div>

          <button
            onClick={onClose}
            title="Dismiss"
            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors text-sm"
          >
            ✕
          </button>
        </>
      )}
    </div>
  );
}
