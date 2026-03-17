// extension/content/detector.js - Element detection for Lasso Copy

import { state } from "./state.js";
import { getCandidateElements, isVisibleElement } from "./utils/dom.js";

/**
 * Cache all candidate elements for performance
 */
export function cacheCandidates() {
  const candidates = getCandidateElements();
  state.candidates = candidates.filter(isVisibleElement);
  return state.candidates;
}

/**
 * Clear the cached candidates
 */
export function clearCandidates() {
  state.candidates = [];
}

/**
 * Detect elements intersecting with the freeform lasso path
 */
export function detectElements() {
  const points = state.pathPoints;
  
  if (points.length < 3) {
    state.selectedElements = [];
    return [];
  }

  // Get bounding box first for quick rejection
  const bbox = getPathBoundingBox(points);
  
  if (!bbox || bbox.width < 5 || bbox.height < 5) {
    state.selectedElements = [];
    return [];
  }

  const candidates = state.candidates.length > 0 
    ? state.candidates 
    : getCandidateElements();

  const found = [];
  const seen = new Set();

  for (const el of candidates) {
    if (seen.has(el)) continue;
    
    try {
      const rect = el.getBoundingClientRect();
      
      // Quick bounding box check first
      if (!bboxIntersect(bbox, rect)) continue;
      
      // Then do polygon intersection check
      if (polygonRectIntersect(points, rect)) {
        found.push(el);
        seen.add(el);
      }
    } catch (e) {
      // Element might be detached
    }
  }

  state.selectedElements = sortByDOMOrder(found);
  return state.selectedElements;
}

/**
 * Get bounding box of path points
 */
function getPathBoundingBox(points) {
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }

  return {
    left: minX,
    top: minY,
    right: maxX,
    bottom: maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * Quick bounding box intersection check
 */
function bboxIntersect(a, b) {
  return !(
    a.right < b.left ||
    a.left > b.right ||
    a.bottom < b.top ||
    a.top > b.bottom
  );
}

/**
 * Check if a polygon intersects with a rectangle
 * Uses line segment intersection with rectangle edges
 */
function polygonRectIntersect(polygon, rect) {
  const rectPoints = [
    { x: rect.left, y: rect.top },
    { x: rect.right, y: rect.top },
    { x: rect.right, y: rect.bottom },
    { x: rect.left, y: rect.bottom }
  ];

  // Check if any polygon point is inside the rectangle
  for (const p of polygon) {
    if (pointInRect(p, rect)) {
      return true;
    }
  }

  // Check if any rectangle corner is inside the polygon
  for (const p of rectPoints) {
    if (pointInPolygon(p, polygon)) {
      return true;
    }
  }

  // Check if polygon edges intersect rectangle edges
  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];

    for (let j = 0; j < 4; j++) {
      const r1 = rectPoints[j];
      const r2 = rectPoints[(j + 1) % 4];

      if (lineSegmentsIntersect(p1, p2, r1, r2)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if a point is inside a rectangle
 */
function pointInRect(point, rect) {
  return point.x >= rect.left && 
         point.x <= rect.right && 
         point.y >= rect.top && 
         point.y <= rect.bottom;
}

/**
 * Check if a point is inside a polygon using ray casting
 */
function pointInPolygon(point, polygon) {
  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;

    if (((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Check if two line segments intersect
 */
function lineSegmentsIntersect(p1, p2, p3, p4) {
  const denominator = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
  
  if (denominator === 0) return false;

  const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denominator;
  const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denominator;

  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}

/**
 * Sort elements by their position in the DOM
 */
function sortByDOMOrder(elements) {
  return [...elements].sort((a, b) => {
    if (a.contains(b)) return -1;
    if (b.contains(a)) return 1;
    
    const rectA = a.getBoundingClientRect();
    const rectB = b.getBoundingClientRect();
    
    const verticalDiff = Math.abs(rectA.top - rectB.top);
    if (verticalDiff > 10) {
      return rectA.top - rectB.top;
    }
    
    return rectA.left - rectB.left;
  });
}

/**
 * Get unique elements (removes nested duplicates)
 */
export function deduplicateElements(elements) {
  const unique = [];
  const seen = new Set();
  
  for (const el of elements) {
    let hasAncestor = false;
    let parent = el.parentElement;
    
    while (parent) {
      if (seen.has(parent)) {
        hasAncestor = true;
        break;
      }
      parent = parent.parentElement;
    }
    
    if (!hasAncestor) {
      unique.push(el);
      seen.add(el);
    }
  }
  
  return unique;
}
