import StickyNote from './StickyNote';

export default function StickyNotesLayer({ notes, camera, handleNoteUpdate, handleNoteDelete, readOnly }) {
  return (
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
            readOnly={readOnly}
          />
        </div>
      ))}
    </div>
  );
}
