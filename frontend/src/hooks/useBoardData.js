import { useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';

const BASE = 'http://localhost:5000';

export default function useBoardData({ boardId, boardTitle, authHeaders, setBoardTitle, navigate }) {
  const BOARD_API = `${BASE}/api/board/${boardId}`;
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!boardId) return;

    fetch(`${BOARD_API}`, { headers: authHeaders() })
      .then((res) => {
        if (res.status === 401) {
          if (navigate) navigate('/');
          return null;
        }
        if (res.status === 403) {
          if (navigate) navigate(`/request-access/${boardId}`);
          return null;
        }
        return res.ok ? res.json() : null;
      })
      .then((data) => {
        if (data?.title) setBoardTitle(data.title);
      })
      .catch(() => {});
  }, [BOARD_API, authHeaders, boardId, setBoardTitle, navigate]);

  const saveThumbnail = () => {
    const boardElement = document.getElementById('board-container');
    if (!boardElement) return;

    html2canvas(boardElement, {
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#f8fafc',
      scale: 0.3,
    })
      .then((canvas) => {
        const thumbnailData = canvas.toDataURL('image/jpeg', 0.5);
        return fetch(`${BOARD_API}`, {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify({ thumbnail: thumbnailData }),
          keepalive: true,
        });
      })
      .catch(() => {});
  };

  const scheduleThumbnailSave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(saveThumbnail, 3000);
  };

  const updateTitle = (title) => {
    fetch(`${BOARD_API}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ title }),
    }).catch(() => {});
  };

  const handleExport = async () => {
    const boardElement = document.getElementById('board-container');
    if (!boardElement) return;
    try {
      const canvas = await html2canvas(boardElement, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${boardTitle || 'whiteboard'}.png`;
      link.href = image;
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const submitShare = async (username, setError) => {
    try {
      const res = await fetch(`${BASE}/api/board/${boardId}/share`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) return true;
        setError(data.error || 'Failed to share board');
        return false;
      }
      return true;
    } catch {
      setError('Cannot connect to server');
      return false;
    }
  };

  return { saveThumbnail, scheduleThumbnailSave, updateTitle, handleExport, submitShare };
}
