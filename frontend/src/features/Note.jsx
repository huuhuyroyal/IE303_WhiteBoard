/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState } from 'react';
import StickyNotesLayer from '../components/StickyNotesLayer';

const BASE = 'http://localhost:5000';

export function useNoteFeature({ boardId, authHeaders, socket, onBoardChanged }) {
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    if (!boardId) return;

    fetch(`${BASE}/api/board/${boardId}/note`, { headers: authHeaders() })
      .then((res) => res.ok ? res.json() : [])
      .then((data) => setNotes(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Failed to fetch notes:', err));
  }, [boardId, authHeaders]);

  useEffect(() => {
    if (!socket.connected || !socket.clientRef.current) return undefined;

    const client = socket.clientRef.current;
    const subscriptions = [
      client.subscribe('/topic/note/create', (message) => {
        const note = JSON.parse(message.body);
        if (note.boardId && note.boardId !== boardId) return;
        setNotes((prev) => prev.some((item) => item.id === note.id) ? prev : [...prev, note]);
      }),
      client.subscribe('/topic/note/update', (message) => {
        const note = JSON.parse(message.body);
        if (note.boardId && note.boardId !== boardId) return;
        setNotes((prev) => prev.map((item) => item.id === note.id ? note : item));
      }),
      client.subscribe('/topic/note/delete', (message) => {
        const payload = JSON.parse(message.body);
        if (payload.boardId && payload.boardId !== boardId) return;
        setNotes((prev) => prev.filter((item) => item.id !== payload.id));
      }),
    ];

    return () => subscriptions.forEach((subscription) => subscription.unsubscribe());
  }, [boardId, socket.connected, socket.clientRef]);

  const publish = (destination, payload) => {
    if (!socket.clientRef.current?.connected) return;
    socket.clientRef.current.publish({
      destination,
      body: JSON.stringify({ ...payload, boardId }),
    });
  };

  const createNote = (worldX, worldY) => {
    const note = {
      id: crypto.randomUUID(),
      boardId,
      x: worldX - 100,
      y: worldY - 60,
      text: '',
      colorIndex: 0,
      width: 200,
    };

    setNotes((prev) => [...prev, note]);

    fetch(`${BASE}/api/board/${boardId}/note`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(note),
    }).catch((err) => console.error('Failed to create note:', err));

    publish('/app/note/create', note);
    onBoardChanged?.();
  };

  const updateNote = (note) => {
    setNotes((prev) => prev.map((item) => item.id === note.id ? note : item));

    fetch(`${BASE}/api/board/${boardId}/note/${note.id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(note),
    }).catch((err) => console.error('Failed to update note:', err));

    publish('/app/note/update', note);
    onBoardChanged?.();
  };

  const deleteNote = (id) => {
    setNotes((prev) => prev.filter((item) => item.id !== id));

    fetch(`${BASE}/api/board/${boardId}/note/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }).catch((err) => console.error('Failed to delete note:', err));

    publish('/app/note/delete', { id });
    onBoardChanged?.();
  };

  return {
    notes,
    createNote,
    updateNote,
    deleteNote,
  };
}

export default function Note({ notes, camera, updateNote, deleteNote, readOnly }) {
  return (
    <StickyNotesLayer
      notes={notes}
      camera={camera}
      handleNoteUpdate={updateNote}
      handleNoteDelete={deleteNote}
      readOnly={readOnly}
    />
  );
}
