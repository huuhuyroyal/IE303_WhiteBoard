export const SHAPE_TOOLS = ['line', 'rectangle', 'circle', 'triangle', 'diamond', 'arrow', 'star', 'hexagon', 'pentagon', 'octagon', 'parallelogram', 'cylinder', 'cloud', 'speech_bubble'];



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

  if (x < xMin - 10 || x > xMax + 10 || y < yMin - 10 || y > yMax + 10) return false;

  if (element.type === 'line' || element.type === 'arrow') {
    const distSq = distanceToSegmentSquared(x, y, p1.x, p1.y, p2.x, p2.y);
    return distSq <= 100; // 10px threshold
  }

  if (element.type === 'rectangle' || element.type === 'ai-svg' || element.type === 'image' || element.type === 'pdf-page') return true;
  
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

function distanceToSegmentSquared(px, py, x1, y1, x2, y2) {
  const l2 = (x1 - x2) ** 2 + (y1 - y2) ** 2;
  if (l2 === 0) return (px - x1) ** 2 + (py - y1) ** 2;
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return (px - (x1 + t * (x2 - x1))) ** 2 + (py - (y1 + t * (y2 - y1))) ** 2;
}

function getClosestPointOnPolygon(px, py, vertices) {
  let minDistSq = Infinity;
  let closestX = px;
  let closestY = py;

  for (let i = 0; i < vertices.length; i++) {
    const p1 = vertices[i];
    const p2 = vertices[(i + 1) % vertices.length];
    
    const l2 = (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;
    let t = 0;
    if (l2 !== 0) {
      t = ((px - p1.x) * (p2.x - p1.x) + (py - p1.y) * (p2.y - p1.y)) / l2;
      t = Math.max(0, Math.min(1, t));
    }
    
    const projX = p1.x + t * (p2.x - p1.x);
    const projY = p1.y + t * (p2.y - p1.y);
    const distSq = (px - projX) ** 2 + (py - projY) ** 2;
    
    if (distSq < minDistSq) {
      minDistSq = distSq;
      closestX = projX;
      closestY = projY;
    }
  }
  return { x: closestX, y: closestY };
}

export function getShapeAnchors(element) {
  const [p1, p2] = element.points;
  const xMin = Math.min(p1.x, p2.x);
  const yMin = Math.min(p1.y, p2.y);
  const xMax = Math.max(p1.x, p2.x);
  const yMax = Math.max(p1.y, p2.y);
  const w = xMax - xMin;
  const h = yMax - yMin;
  const cx = xMin + w / 2;
  const cy = yMin + h / 2;

  if (element.type === 'circle') {
    return [
      { x: cx, y: yMin }, { x: cx, y: yMax },
      { x: xMin, y: cy }, { x: xMax, y: cy }
    ];
  } else if (element.type === 'diamond') {
    return [
      { x: cx, y: yMin }, { x: xMax, y: cy },
      { x: cx, y: yMax }, { x: xMin, y: cy }
    ];
  } else if (element.type === 'triangle') {
    return [
      { x: cx, y: yMin }, { x: xMax, y: yMax }, { x: xMin, y: yMax }
    ];
  } else if (element.type === 'parallelogram') {
    const offset = w * 0.25;
    return [
      { x: xMin + offset, y: yMin }, { x: xMax, y: yMin },
      { x: xMax - offset, y: yMax }, { x: xMin, y: yMax }
    ];
  } else if (element.type === 'hexagon') {
    const a = Math.min(w, h) / 2;
    const vertices = [];
    for (let i = 0; i < 6; i++) {
      vertices.push({ x: cx + a * Math.cos(i * Math.PI / 3), y: cy + a * Math.sin(i * Math.PI / 3) });
    }
    return vertices;
  } else if (element.type === 'pentagon') {
    const r = Math.min(w, h) / 2;
    const vertices = [];
    for (let i = 0; i < 5; i++) {
      vertices.push({ x: cx + r * Math.cos(i * 2 * Math.PI / 5 - Math.PI / 2), y: cy + r * Math.sin(i * 2 * Math.PI / 5 - Math.PI / 2) });
    }
    return vertices;
  } else if (element.type === 'octagon') {
    const r = Math.min(w, h) / 2;
    const vertices = [];
    for (let i = 0; i < 8; i++) {
      vertices.push({ x: cx + r * Math.cos(i * 2 * Math.PI / 8 - Math.PI / 8), y: cy + r * Math.sin(i * 2 * Math.PI / 8 - Math.PI / 8) });
    }
    return vertices;
  }

  // Default: Rectangle 8 bounding box points
  return [
    { x: cx, y: yMin }, { x: cx, y: yMax },
    { x: xMin, y: cy }, { x: xMax, y: cy },
    { x: xMin, y: yMin }, { x: xMax, y: yMin },
    { x: xMin, y: yMax }, { x: xMax, y: yMax }
  ];
}

export function getClosestPointOnShapePerimeter(x, y, element) {
  const [p1, p2] = element.points;
  const xMin = Math.min(p1.x, p2.x);
  const yMin = Math.min(p1.y, p2.y);
  const xMax = Math.max(p1.x, p2.x);
  const yMax = Math.max(p1.y, p2.y);
  const w = xMax - xMin;
  const h = yMax - yMin;
  const cx = xMin + w / 2;
  const cy = yMin + h / 2;

  if (element.type === 'circle') {
    const rx = w / 2;
    const ry = h / 2;
    const angle = Math.atan2(y - cy, x - cx);
    return { x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) };
  } else if (element.type === 'diamond') {
    return getClosestPointOnPolygon(x, y, [
      { x: cx, y: yMin }, { x: xMax, y: cy },
      { x: cx, y: yMax }, { x: xMin, y: cy }
    ]);
  } else if (element.type === 'triangle') {
    return getClosestPointOnPolygon(x, y, [
      { x: cx, y: yMin }, { x: xMax, y: yMax }, { x: xMin, y: yMax }
    ]);
  } else if (element.type === 'parallelogram') {
    const offset = w * 0.25;
    return getClosestPointOnPolygon(x, y, [
      { x: xMin + offset, y: yMin }, { x: xMax, y: yMin },
      { x: xMax - offset, y: yMax }, { x: xMin, y: yMax }
    ]);
  } else if (element.type === 'hexagon') {
    const a = Math.min(w, h) / 2;
    const vertices = [];
    for (let i = 0; i < 6; i++) {
      vertices.push({ x: cx + a * Math.cos(i * Math.PI / 3), y: cy + a * Math.sin(i * Math.PI / 3) });
    }
    return getClosestPointOnPolygon(x, y, vertices);
  } else if (element.type === 'pentagon') {
    const r = Math.min(w, h) / 2;
    const vertices = [];
    for (let i = 0; i < 5; i++) {
      vertices.push({ x: cx + r * Math.cos(i * 2 * Math.PI / 5 - Math.PI / 2), y: cy + r * Math.sin(i * 2 * Math.PI / 5 - Math.PI / 2) });
    }
    return getClosestPointOnPolygon(x, y, vertices);
  } else if (element.type === 'octagon') {
    const r = Math.min(w, h) / 2;
    const vertices = [];
    for (let i = 0; i < 8; i++) {
      vertices.push({ x: cx + r * Math.cos(i * 2 * Math.PI / 8 - Math.PI / 8), y: cy + r * Math.sin(i * 2 * Math.PI / 8 - Math.PI / 8) });
    }
    return getClosestPointOnPolygon(x, y, vertices);
  }

  // Default: Rectangle bounding box
  let px = Math.max(xMin, Math.min(xMax, x));
  let py = Math.max(yMin, Math.min(yMax, y));
  const dl = Math.abs(px - xMin);
  const dr = Math.abs(px - xMax);
  const dt = Math.abs(py - yMin);
  const db = Math.abs(py - yMax);
  const minD = Math.min(dl, dr, dt, db);
  if (minD === dl) px = xMin;
  else if (minD === dr) px = xMax;
  else if (minD === dt) py = yMin;
  else py = yMax;
  
  return { x: px, y: py };
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
  } else if (type === 'pentagon') {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const r = Math.min(w, h) / 2;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      ctx.lineTo(cx + r * Math.cos(i * 2 * Math.PI / 5 - Math.PI / 2), cy + r * Math.sin(i * 2 * Math.PI / 5 - Math.PI / 2));
    }
    ctx.closePath();
  } else if (type === 'octagon') {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const r = Math.min(w, h) / 2;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      ctx.lineTo(cx + r * Math.cos(i * 2 * Math.PI / 8 - Math.PI / 8), cy + r * Math.sin(i * 2 * Math.PI / 8 - Math.PI / 8));
    }
    ctx.closePath();
  } else if (type === 'parallelogram') {
    const offset = w * 0.25; 
    ctx.beginPath();
    ctx.moveTo(x + offset, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w - offset, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
  } else if (type === 'cylinder') {
    const ry = Math.min(h * 0.15, 20);
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + ry, w / 2, ry, 0, Math.PI, 0, true);
    ctx.lineTo(x + w, y + h - ry);
    ctx.ellipse(x + w / 2, y + h - ry, w / 2, ry, 0, 0, Math.PI, false);
    ctx.lineTo(x, y + ry);
    ctx.closePath();
  } else if (type === 'cloud') {
    ctx.beginPath();
    ctx.moveTo(x + w * 0.17, y + h * 0.5);
    ctx.bezierCurveTo(x - w * 0.05, y + h * 0.5, x - w * 0.05, y + h * 0.9, x + w * 0.2, y + h * 0.9);
    ctx.bezierCurveTo(x + w * 0.2, y + h * 1.1, x + w * 0.45, y + h * 1.1, x + w * 0.5, y + h * 0.9);
    ctx.bezierCurveTo(x + w * 0.7, y + h * 1.05, x + w * 1.05, y + h * 1.05, x + w * 1.05, y + h * 0.7);
    ctx.bezierCurveTo(x + w * 1.15, y + h * 0.5, x + w * 0.9, y + h * 0.2, x + w * 0.75, y + h * 0.25);
    ctx.bezierCurveTo(x + w * 0.7, y - h * 0.1, x + w * 0.3, y - h * 0.1, x + w * 0.3, y + h * 0.25);
    ctx.bezierCurveTo(x + w * 0.1, y + h * 0.1, x + w * 0.1, y + h * 0.5, x + w * 0.17, y + h * 0.5);
    ctx.closePath();
  } else if (type === 'speech_bubble') {
    const rx = Math.min(20, w / 4);
    const tailHeight = Math.min(20, h / 4);
    const tailWidth = Math.min(20, w / 4);
    const bh = h - tailHeight;
    ctx.beginPath();
    ctx.moveTo(x + rx, y);
    ctx.lineTo(x + w - rx, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rx);
    ctx.lineTo(x + w, y + bh - rx);
    ctx.quadraticCurveTo(x + w, y + bh, x + w - rx, y + bh);
    ctx.lineTo(x + w * 0.5 + tailWidth, y + bh);
    ctx.lineTo(x + w * 0.5 - tailWidth, y + h);
    ctx.lineTo(x + w * 0.5 - tailWidth/2, y + bh);
    ctx.lineTo(x + rx, y + bh);
    ctx.quadraticCurveTo(x, y + bh, x, y + bh - rx);
    ctx.lineTo(x, y + rx);
    ctx.quadraticCurveTo(x, y, x + rx, y);
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
    
    // Draw internal details if needed
    if (type === 'cylinder') {
      const ry = Math.min(h * 0.15, 20);
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + ry, w / 2, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
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
