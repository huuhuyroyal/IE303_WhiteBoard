export const SHAPE_TOOLS = ['line', 'rectangle', 'circle', 'triangle', 'diamond'];

export function isShapeTool(tool) {
  return SHAPE_TOOLS.includes(tool);
}

export function isPointInShapeElement(x, y, element) {
  if (!element?.points || element.points.length < 2) return false;

  const [p1, p2] = element.points;
  const xMin = Math.min(p1.x, p2.x);
  const yMin = Math.min(p1.y, p2.y);
  const xMax = Math.max(p1.x, p2.x);
  const yMax = Math.max(p1.y, p2.y);

  if (x < xMin || x > xMax || y < yMin || y > yMax) return false;

  if (element.type === 'rectangle' || element.type === 'line' || element.type === 'ai-svg') return true;

  if (element.type === 'circle') {
    const cx = (p1.x + p2.x) / 2;
    const cy = (p1.y + p2.y) / 2;
    const rx = Math.abs(p2.x - p1.x) / 2;
    const ry = Math.abs(p2.y - p1.y) / 2;
    if (rx === 0 || ry === 0) return false;
    return ((x - cx) ** 2) / (rx ** 2) + ((y - cy) ** 2) / (ry ** 2) <= 1;
  }

  return true;
}

export function drawShapeElement(ctx, type, points) {
  if (!points || points.length < 2) return;

  const [p1, p2] = points;
  const x = Math.min(p1.x, p2.x);
  const y = Math.min(p1.y, p2.y);
  const w = Math.abs(p2.x - p1.x);
  const h = Math.abs(p2.y - p1.y);

  ctx.beginPath();

  if (type === 'line') {
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
  } else if (type === 'rectangle') {
    ctx.rect(x, y, w, h);
  } else if (type === 'circle') {
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
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
}

export function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}
