import { useCallback } from 'react';

export default function useCamera(canvasRef, setCamera) {
  const attachWheelListener = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e) => {
      e.preventDefault();
      if (e.ctrlKey) {
        const zoomSensitivity = 0.002;
        const zoomFactor = Math.exp(-e.deltaY * zoomSensitivity);
        setCamera(prev => {
          const newZoom = Math.min(Math.max(prev.zoom * zoomFactor, 0.1), 8);
          const newX = e.clientX - (e.clientX - prev.x) * (newZoom / prev.zoom);
          const newY = e.clientY - (e.clientY - prev.y) * (newZoom / prev.zoom);
          return { x: newX, y: newY, zoom: newZoom };
        });
      } else {
        let dx = e.deltaX;
        let dy = e.deltaY;

        if (e.shiftKey && e.deltaY !== 0) {
          dx = e.deltaY;
          dy = 0;
        }

        setCamera(prev => ({ x: prev.x - dx, y: prev.y - dy, zoom: prev.zoom }));
      }
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [canvasRef, setCamera]);

  return { attachWheelListener };
}
