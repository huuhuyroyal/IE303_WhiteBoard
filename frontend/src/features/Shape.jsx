export const SHAPE_TOOLS = ['line', 'rectangle', 'circle', 'triangle', 'diamond', 'arrow', 'star', 'hexagon'];

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

function getDarkerColor(hex) {
  if (!hex || !hex.startsWith('#')) return '#000000';
  let r = parseInt(hex.substring(1, 3), 16);
  let g = parseInt(hex.substring(3, 5), 16);
  let b = parseInt(hex.substring(5, 7), 16);
  r = Math.floor(r * 0.85);
  g = Math.floor(g * 0.85);
  b = Math.floor(b * 0.85);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function drawShapeElement(ctx, element) {
  const { type, points, color, metadata } = element;
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
    if (ctx.roundRect) {
      ctx.roundRect(x, y, w, h, Math.min(6, w / 2, h / 2));
    } else {
      ctx.rect(x, y, w, h);
    }
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
  } else if (type === 'arrow') {
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    const headLen = 15;
    ctx.lineTo(p2.x - headLen * Math.cos(angle - Math.PI / 6), p2.y - headLen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(p2.x, p2.y);
    ctx.lineTo(p2.x - headLen * Math.cos(angle + Math.PI / 6), p2.y - headLen * Math.sin(angle + Math.PI / 6));
  } else if (type === 'star') {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const outerRadius = Math.min(w, h) / 2;
    const innerRadius = outerRadius / 2;
    const spikes = 5;
    let rot = Math.PI / 2 * 3;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
  } else if (type === 'hexagon') {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const a = Math.min(w, h) / 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      ctx.lineTo(cx + a * Math.cos(i * Math.PI / 3), cy + a * Math.sin(i * Math.PI / 3));
    }
    ctx.closePath();
  }

  const strokeStyle = metadata?.strokeStyle || 'solid';
  const strokeColor = metadata?.strokeColor || getDarkerColor(color);

  if (strokeStyle === 'dashed') {
    ctx.setLineDash([8, 8]);
  } else {
    ctx.setLineDash([]);
  }

  if (type !== 'line' && type !== 'arrow' && color && color !== 'transparent') {
    ctx.fillStyle = color;
    ctx.fill();
  }
  
  if (strokeStyle !== 'none') {
    ctx.strokeStyle = strokeColor;
    ctx.stroke();
  }
  
  ctx.setLineDash([]);
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
